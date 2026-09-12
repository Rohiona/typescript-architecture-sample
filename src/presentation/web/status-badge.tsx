import type { ReservationStatus } from "../../domain/rentals/types.js";

const labels: Record<ReservationStatus, string> = {
  held: "仮予約",
  confirmed: "予約確定",
  checked_out: "貸出中",
  returned: "返却済み",
  cancelled: "キャンセル",
  expired: "期限切れ",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={"status-badge status-" + status}>
      <span />
      {labels[status]}
    </span>
  );
}
