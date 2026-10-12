const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getJakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getJakartaDateRange(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const dateUtc = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 1000 ||
    dateUtc.getUTCFullYear() !== year ||
    dateUtc.getUTCMonth() !== month - 1 ||
    dateUtc.getUTCDate() !== day
  ) {
    return null;
  }

  const start = Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS;
  const end = Date.UTC(year, month - 1, day + 1) - JAKARTA_OFFSET_MS;

  return {
    gte: new Date(start),
    lt: new Date(end),
  };
}
