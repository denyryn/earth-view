const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getYesterdayIso() {
  return toIsoDate(new Date(Date.now() - DAY_MS));
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export const MODIS_TERRA_START = "2000-02-24";
