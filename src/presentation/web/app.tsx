import { useState } from "react";
import { Check, ChevronRight, ClipboardList, LayoutGrid, LoaderCircle, PackageOpen, RefreshCw } from "lucide-react";
import type { DashboardQueryPort } from "../../application/ports/dashboard-query-port.js";
import type { ReservationCommandPort } from "../../application/ports/reservation-command-port.js";
import type { DemoCommandPort } from "../../application/ports/demo-command-port.js";
import type { RentalAction } from "../../domain/rentals/types.js";
import { useDeskDashboard } from "./use-desk-dashboard.js";
import { useDeskActions } from "./use-desk-actions.js";
import { DemoControls } from "./demo-controls.js";
import { EquipmentCatalogue } from "./equipment-catalogue.js";
import { ReservationForm } from "./reservation-form.js";
import { ReservationsPanel } from "./reservations-panel.js";
import { ActivityFeed } from "./activity-feed.js";

interface RentalDeskAppProps {
  dashboardQuery: DashboardQueryPort;
  reservationCommands: ReservationCommandPort;
  demoCommands: DemoCommandPort;
}

type Page = "equipment" | "reservations" | "desk";
const pageLabels: Record<Page, string> = { equipment: "機材一覧", reservations: "予約一覧", desk: "貸出管理" };
const actionMessages: Record<RentalAction, string> = {
  confirm: "予約を確定しました。利用開始時にスタッフが貸し出します。",
  cancel: "予約をキャンセルしました。",
  check_out: "機材を貸し出しました。",
  return: "返却を受け付けました。",
};

export function RentalDeskApp({ dashboardQuery, reservationCommands, demoCommands }: RentalDeskAppProps) {
  const { dashboard, loadError, loading, refresh } = useDeskDashboard(dashboardQuery);
  const actions = useDeskActions(refresh);
  const [page, setPage] = useState<Page>("equipment");
  const [actorId, setActorId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [resetVersion, setResetVersion] = useState(0);
  const busy = loading || actions.pending !== null;
  const actor =
    dashboard?.customers.find((customer) => customer.id === actorId) ??
    dashboard?.customers.find((customer) => customer.role === "member") ??
    dashboard?.customers[0];
  const selectedEquipment =
    dashboard?.equipment.find((equipment) => equipment.id === equipmentId) ?? dashboard?.equipment[0];
  const browse = (id?: string) => {
    if (id) setEquipmentId(id);
    setPage("equipment");
    actions.clearFeedback();
  };

  if (!dashboard || !actor) {
    return (
      <div className="initial-screen">
        <div className="brand">
          <span className="brand-mark">
            <PackageOpen size={23} />
          </span>
          機材レンタル管理
        </div>
        <div className="initial-content">
          {loadError ? (
            <>
              <h1>データを読み込めませんでした</h1>
              <p role="alert">{loadError}</p>
              <button
                className="button primary"
                type="button"
                disabled={loading}
                onClick={() => {
                  void refresh().catch(() => undefined);
                }}
              >
                <RefreshCw size={17} />
                {loading ? "読み込み中…" : "もう一度読み込む"}
              </button>
            </>
          ) : (
            <>
              <LoaderCircle className="spinner" size={28} />
              <p role="status">読み込み中…</p>
            </>
          )}
        </div>
      </div>
    );
  }
  const myReservations = dashboard.reservations.filter(
    (reservation) => actor.role === "staff" || reservation.customerId === actor.id,
  );
  const openCount = myReservations.filter((reservation) =>
    ["held", "confirmed", "checked_out"].includes(reservation.effectiveStatus),
  ).length;
  const visiblePage = page === "desk" && actor.role !== "staff" ? "reservations" : page;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage("equipment");
          }}
        >
          <span className="brand-mark">
            <PackageOpen size={23} strokeWidth={1.7} />
          </span>
          機材レンタル管理
        </a>
        <nav className="main-nav" aria-label="メインメニュー">
          <button
            type="button"
            aria-current={visiblePage === "equipment" ? "page" : undefined}
            onClick={() => setPage("equipment")}
          >
            <LayoutGrid size={18} />
            機材一覧
            <ChevronRight className="nav-chevron" size={15} />
          </button>
          <button
            type="button"
            aria-current={visiblePage === "reservations" ? "page" : undefined}
            onClick={() => setPage("reservations")}
          >
            <ClipboardList size={18} />
            予約一覧<span className="nav-count">{openCount}</span>
          </button>
          {actor.role === "staff" && (
            <button
              type="button"
              aria-current={visiblePage === "desk" ? "page" : undefined}
              onClick={() => setPage("desk")}
            >
              <PackageOpen size={18} />
              貸出管理
              <ChevronRight className="nav-chevron" size={15} />
            </button>
          )}
        </nav>
      </aside>
      <div className="workspace">
        <DemoControls
          now={dashboard.now}
          customers={dashboard.customers}
          actor={actor}
          pending={busy}
          error={actions.error?.scope === "demo" ? actions.error.message : undefined}
          onActorChange={(id) => {
            setActorId(id);
            actions.clearFeedback();
          }}
          onAdvance={(minutes) => {
            void actions.run(
              "demo",
              () => demoCommands.advanceTime(minutes),
              "デモ時刻を" + minutes + "分進めました。予約の状態を更新しました。",
            );
          }}
          onReset={async () => {
            const ok = await actions.run("demo", () => demoCommands.resetDemo(), "デモを初期状態に戻しました。");
            if (ok) {
              setActorId("");
              setEquipmentId("");
              setPage("equipment");
              setResetVersion((value) => value + 1);
            }
            return ok;
          }}
        />
        <main className="main-content">
          <div className="notice-region" aria-live="polite" aria-atomic="true">
            {actions.notice && (
              <div className="success-notice">
                <Check size={17} />
                <span>{actions.notice}</span>
              </div>
            )}
          </div>
          {loadError && (
            <div className="load-error">
              <p role="alert">{loadError}</p>
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() => {
                  void refresh().catch(() => undefined);
                }}
              >
                <RefreshCw size={14} />
                再読み込み
              </button>
            </div>
          )}
          <section className="page-heading">
            <h1>{pageLabels[visiblePage]}</h1>
            <button
              type="button"
              className="refresh-button"
              aria-label="最新の状態に更新"
              disabled={busy}
              onClick={() => {
                void refresh().catch(() => undefined);
              }}
            >
              <RefreshCw size={17} className={loading ? "spinner" : ""} />
              <span>更新</span>
            </button>
          </section>

          {visiblePage === "equipment" ? (
            <>
              <EquipmentCatalogue
                equipment={dashboard.equipment}
                selectedId={selectedEquipment?.id ?? ""}
                onSelect={(id) => {
                  setEquipmentId(id);
                  actions.clearFeedback();
                  window.requestAnimationFrame(() =>
                    document.getElementById("reservation-form")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
              />
              <div className="booking-layout">
                {selectedEquipment && (
                  <ReservationForm
                    key={selectedEquipment.id + ":" + resetVersion}
                    equipment={selectedEquipment}
                    actor={actor}
                    now={dashboard.now}
                    pending={busy}
                    error={actions.error?.scope === "create" ? actions.error.message : undefined}
                    onSubmit={(input) => {
                      void actions
                        .run(
                          "create",
                          () => reservationCommands.createReservation(input),
                          "仮予約しました。15分以内に内容を確認して確定してください。",
                        )
                        .then((ok) => {
                          if (ok) setPage("reservations");
                        });
                    }}
                  />
                )}
                <div className="right-column">
                  <section className="demo-instructions" aria-labelledby="steps-title">
                    <h2 id="steps-title">デモの操作</h2>
                    <ol>
                      <li>利用者を選び、機材・期間・数量を入力して仮予約します。</li>
                      <li>「予約一覧」で15分以内に予約を確定します。</li>
                      <li>スタッフに切り替え、時刻を利用開始後へ進めます。</li>
                      <li>「貸出管理」で貸出・返却を操作します。</li>
                    </ol>
                  </section>
                  <ActivityFeed activities={dashboard.activities} />
                </div>
              </div>
            </>
          ) : (
            <ReservationsPanel
              key={visiblePage + ":" + actor.id}
              dashboard={dashboard}
              actor={actor}
              mode={visiblePage}
              pending={busy}
              error={actions.error}
              onBrowse={browse}
              onAction={(reservationId, action) => {
                void actions.run(
                  reservationId,
                  () => reservationCommands.performAction({ actorId: actor.id, reservationId, action }),
                  actionMessages[action],
                );
              }}
            />
          )}
        </main>
        <footer className="site-footer">
          <span>サンプルアプリ / 架空の機材・利用者です</span>
          <span>すべての日時は日本時間（JST）</span>
        </footer>
      </div>
    </div>
  );
}
