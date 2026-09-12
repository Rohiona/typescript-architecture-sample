import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
} from "lucide-react";
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
  return: "返却を受け付けました。おつかれさまでした。",
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
          RENTAL DESK<span className="brand-dot">.</span>
        </div>
        <div className="initial-content">
          {loadError ? (
            <>
              <h1>貸出デスクに接続できませんでした</h1>
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
              <p role="status">貸出デスクを準備しています…</p>
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
  const checkoutCount = dashboard.reservations.filter(
    (reservation) => reservation.effectiveStatus === "checked_out",
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
          RENTAL DESK<span className="brand-dot">.</span>
        </a>
        <span className="brand-caption">道具と、次のアイデア。</span>
        <div className="sidebar-section-label">WORKSPACE</div>
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
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-cross">+</span>
            <p>
              つくる人の、
              <br />
              小さな貸出デスク。
            </p>
            <span>EQUIPMENT RENTAL STUDIO</span>
          </div>
          <div className="sidebar-footer">
            <span className="online-dot" />
            デモスペース
            <ArrowUpRight size={14} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>
            ワークスペース
            <ChevronRight size={13} />
            <strong>{pageLabels[visiblePage]}</strong>
          </span>
          <span className="header-mode">{actor.role === "staff" ? "スタッフモード" : "メンバーモード"}</span>
        </header>
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
          <section className="page-intro">
            <div>
              <div className="eyebrow">
                {visiblePage === "equipment"
                  ? "A LITTLE GEAR. A BIG IDEA."
                  : visiblePage === "reservations"
                    ? "YOUR RENTAL PLANS"
                    : "READY, SET, CREATE."}
              </div>
              <h1>
                {visiblePage === "equipment" ? (
                  <>
                    次の「つくる」に、
                    <br className="mobile-break" />
                    ちょうどいい道具を。
                  </>
                ) : (
                  pageLabels[visiblePage]
                )}
              </h1>
              <p>
                {visiblePage === "equipment"
                  ? "撮影も、発表も。必要な機材を、必要な時間だけ。"
                  : visiblePage === "reservations"
                    ? actor.role === "staff"
                      ? "すべての利用者の予約と、その後の状況を確認できます。"
                      : actor.name + "さんの予約を、ここでまとめて確認。"
                    : "機材の受け渡しを、ひとつずつ確実に。貸出・返却を管理します。"}
              </p>
            </div>
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
              <div className="overview-strip">
                <div>
                  <span className="overview-label">選べる機材</span>
                  <strong>
                    {dashboard.equipment.length}
                    <small>種類</small>
                  </strong>
                </div>
                <div>
                  <span className="overview-label">{actor.role === "staff" ? "進行中の予約" : "あなたの予約"}</span>
                  <strong>
                    {openCount}
                    <small>件</small>
                  </strong>
                </div>
                <div>
                  <span className="overview-label">ただいま貸出中</span>
                  <strong>
                    {checkoutCount}
                    <small>件</small>
                  </strong>
                </div>
                <div className="overview-message">
                  <span className="online-dot" />
                  今日も、制作をサポートします。
                </div>
              </div>
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
                  <section className="how-it-works" aria-labelledby="steps-title">
                    <div className="section-heading">
                      <h2 id="steps-title">ご利用のながれ</h2>
                      <ArrowRight size={17} />
                    </div>
                    <ol>
                      <li>
                        <span>01</span>
                        <div>
                          <strong>機材と時間を選ぶ</strong>
                          <p>まずは仮予約。15分以内に確定します。</p>
                        </div>
                      </li>
                      <li>
                        <span>02</span>
                        <div>
                          <strong>開始時刻に受け取る</strong>
                          <p>スタッフが予約を確認して貸し出します。</p>
                        </div>
                      </li>
                      <li>
                        <span>03</span>
                        <div>
                          <strong>使い終わったら返却</strong>
                          <p>次の人の「つくる」につなげましょう。</p>
                        </div>
                      </li>
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
          <span>
            RENTAL DESK<span className="brand-dot">.</span>
            <span className="footer-divider" />
            サンプルアプリ / 架空の機材・利用者です
          </span>
          <span>すべての日時は日本時間（JST）</span>
        </footer>
      </div>
    </div>
  );
}
