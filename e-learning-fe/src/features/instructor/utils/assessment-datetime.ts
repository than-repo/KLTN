export function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) return "";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

export function toIsoOrNull(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export function toIsoOrUndefined(value?: string | null) {
  return toIsoOrNull(value) ?? undefined;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

export function setTime(date: Date, hours: number, minutes = 0) {
  const result = new Date(date);

  result.setHours(hours, minutes, 0, 0);

  return result;
}

export function getNextMondayAtEight() {
  const now = new Date();
  const result = new Date(now);
  const day = result.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;

  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(8, 0, 0, 0);

  return result;
}
