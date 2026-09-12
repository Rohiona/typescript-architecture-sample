const JST_OFFSET = 9 * 60 * 60 * 1000;

export function toDateTimeInput(timestamp: number): string {
  return new Date(timestamp + JST_OFFSET).toISOString().slice(0, 16);
}

export function fromDateTimeInput(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return Number.NaN;
  const timestamp = Date.parse(value + ":00+09:00");
  return Number.isFinite(timestamp) && toDateTimeInput(timestamp) === value ? timestamp : Number.NaN;
}

export function defaultReservationPeriod(now: number) {
  const startAt = (Math.floor(now / 3_600_000) + 1) * 3_600_000;
  return { start: toDateTimeInput(startAt), end: toDateTimeInput(startAt + 2 * 3_600_000) };
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(timestamp);
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

export function formatPeriod(startAt: number, endAt: number): string {
  const startDay = toDateTimeInput(startAt).slice(0, 10);
  const endDay = toDateTimeInput(endAt).slice(0, 10);
  return (
    formatDate(startAt) +
    " " +
    formatTime(startAt) +
    " — " +
    (startDay === endDay ? "" : formatDate(endAt) + " ") +
    formatTime(endAt)
  );
}
