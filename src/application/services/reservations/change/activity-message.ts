import type { RentalAction } from "../../../../domain/rentals/types.js";

const actionLabels: Record<RentalAction, string> = {
  confirm: "の予約を確定しました",
  cancel: "の予約を取り消しました",
  check_out: "を貸し出しました",
  return: "を返却しました",
};
export function createReservationActivityMessage(
  actorName: string,
  equipmentName: string,
  action: RentalAction,
): string {
  return actorName + "さんが" + equipmentName + actionLabels[action] + "。";
}
