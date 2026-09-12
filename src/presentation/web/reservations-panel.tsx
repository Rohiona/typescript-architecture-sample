import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, PackageCheck, RotateCcw, X } from "lucide-react";
import type { Dashboard, ReservationView } from "../../contracts/dashboard.js";
import type { Customer, RentalAction } from "../../domain/rentals/types.js";
import { EquipmentArt } from "./equipment-art.js";
import { formatPeriod, formatTime } from "./date-time.js";
import { StatusBadge } from "./status-badge.js";

interface ReservationsPanelProps {
  dashboard: Dashboard;
  actor: Customer;
  mode: "reservations" | "desk";
  pending: boolean;
  error: { scope: string; message: string } | null;
  onAction: (reservationId: string, action: RentalAction) => void;
  onBrowse: (equipmentId?: string) => void;
}

function ReservationActions({
  reservation,
  actor,
  now,
  disabled,
  onAction,
  onBrowse,
}: {
  reservation: ReservationView;
  actor: Customer;
  now: number;
  disabled: boolean;
  onAction: (action: RentalAction) => void;
  onBrowse: () => void;
}) {
  const status = reservation.effectiveStatus;
  const own = actor.id === reservation.customerId;
  const mayManage = own || actor.role === "staff";
  return (
    <div className="reservation-action-area">
      {status === "held" && (
        <p className="reservation-guidance amber-text">
          <Clock3 size={14} />
          {formatTime(reservation.holdExpiresAt)} までに確定してください
        </p>
      )}
      {status === "expired" && (
        <p className="reservation-guidance">確定期限を過ぎました。必要な場合は新しく予約してください。</p>
      )}
      {status === "confirmed" && actor.role !== "staff" && (
        <p className="reservation-guidance">
          <Check size={14} />
          予約が確定しました。利用開始時にスタッフが貸し出します。
        </p>
      )}
      {status === "checked_out" && actor.role !== "staff" && (
        <p className="reservation-guidance">利用後はスタッフに機材を返却してください。</p>
      )}
      {status === "confirmed" && actor.role === "staff" && now < reservation.startAt && (
        <p className="reservation-guidance">利用開始時刻になると貸し出せます。画面上部で時刻を進めてください。</p>
      )}
      {status === "confirmed" && actor.role === "staff" && now >= reservation.endAt && (
        <p className="reservation-guidance amber-text">利用終了時刻を過ぎたため、貸し出せません。</p>
      )}
      <div className="reservation-buttons">
        {status === "held" && mayManage && (
          <>
            <button
              type="button"
              className="button primary small"
              disabled={disabled}
              onClick={() => onAction("confirm")}
            >
              <Check size={15} />
              予約を確定
            </button>
            <button type="button" className="button quiet small" disabled={disabled} onClick={() => onAction("cancel")}>
              <X size={14} />
              キャンセル
            </button>
          </>
        )}
        {status === "confirmed" && actor.role === "staff" && (
          <button
            type="button"
            className="button primary small"
            disabled={disabled || now < reservation.startAt || now >= reservation.endAt}
            onClick={() => onAction("check_out")}
          >
            <PackageCheck size={16} />
            貸し出す
          </button>
        )}
        {status === "confirmed" && mayManage && (
          <button type="button" className="button quiet small" disabled={disabled} onClick={() => onAction("cancel")}>
            キャンセル
          </button>
        )}
        {status === "checked_out" && actor.role === "staff" && (
          <button type="button" className="button primary small" disabled={disabled} onClick={() => onAction("return")}>
            <RotateCcw size={15} />
            返却を受け付ける
          </button>
        )}
        {["expired", "cancelled", "returned"].includes(status) && own && actor.role === "member" && (
          <button type="button" className="text-button" disabled={disabled} onClick={onBrowse}>
            もう一度予約する
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReservationsPanel(props: ReservationsPanelProps) {
  const [filter, setFilter] = useState<"all" | "active" | "finished">("all");
  const { dashboard, actor, mode } = props;
  const all = dashboard.reservations.filter(
    (reservation) =>
      (actor.role === "staff" || reservation.customerId === actor.id) &&
      (mode !== "desk" || ["confirmed", "checked_out"].includes(reservation.effectiveStatus)),
  );
  const shown = all.filter((reservation) => {
    const active = ["held", "confirmed", "checked_out"].includes(reservation.effectiveStatus);
    return filter === "all" || (filter === "active" ? active : !active);
  });
  return (
    <section aria-label={mode === "desk" ? "貸出の一覧" : "予約の一覧"}>
      <div className="reservation-list-toolbar">
        <span className="list-count">
          {shown.length}
          <span>件の{mode === "desk" ? "貸出予定・貸出中" : "予約"}</span>
        </span>
        {mode !== "desk" && (
          <div className="filter-tabs" aria-label="予約を絞り込み">
            {(
              [
                ["all", "すべて"],
                ["active", "進行中"],
                ["finished", "完了・終了"],
              ] as const
            ).map(([value, label]) => (
              <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={34} strokeWidth={1.2} />
          <h2>{mode === "desk" ? "貸出待ち・貸出中の機材はありません" : "表示する予約はありません"}</h2>
          <p>
            {mode === "desk"
              ? "利用者が予約を確定すると、ここで貸出・返却を管理できます。"
              : "機材一覧から予約を作成できます。"}
          </p>
          <button type="button" className="button secondary" onClick={() => props.onBrowse()}>
            機材一覧を見る
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="reservation-list">
          {shown.map((reservation) => {
            const equipment = dashboard.equipment.find((item) => item.id === reservation.equipmentId);
            const customer = dashboard.customers.find((item) => item.id === reservation.customerId);
            return (
              <article
                className="reservation-card"
                key={reservation.id}
                aria-label={(equipment?.name ?? "機材") + "の予約"}
              >
                <div className="reservation-summary">
                  {equipment && <EquipmentArt category={equipment.category} small />}
                  <div className="reservation-details">
                    <div className="reservation-card-top">
                      <span className="reservation-id">#{reservation.id.slice(-8).toUpperCase()}</span>
                      <StatusBadge status={reservation.effectiveStatus} />
                    </div>
                    <h2>{equipment?.name ?? "機材"}</h2>
                    <p className="reservation-period">
                      <CalendarDays size={14} />
                      {formatPeriod(reservation.startAt, reservation.endAt)}
                    </p>
                    <p className="reservation-owner">
                      {customer?.name ?? "利用者"}
                      <span />
                      {reservation.quantity}台
                    </p>
                  </div>
                </div>
                <ReservationActions
                  reservation={reservation}
                  actor={actor}
                  now={dashboard.now}
                  disabled={props.pending}
                  onAction={(action) => props.onAction(reservation.id, action)}
                  onBrowse={() => props.onBrowse(reservation.equipmentId)}
                />
                {props.error?.scope === reservation.id && (
                  <p className="inline-error" role="alert">
                    {props.error.message}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
