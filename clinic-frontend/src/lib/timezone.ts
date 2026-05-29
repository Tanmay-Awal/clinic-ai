export const DEFAULT_DISPLAY_TIMEZONE = 'Asia/Kolkata';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTimestampAsUtc(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date(NaN);

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2}|[+-]\d{4})$/.test(normalized);
  const utcLike = hasTimezone ? normalized : `${normalized}Z`;
  return new Date(utcLike);
}

export function parseDateOnlyAsUtc(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

export function getDatePartsInTimezone(
  value: Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');

  return { year, month, day };
}

export function formatDateInTimezone(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  const date = parseTimestampAsUtc(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date);
}

export function getDateKeyInTimezone(
  value: string | Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  const date = parseTimestampAsUtc(value);
  if (Number.isNaN(date.getTime())) return 'Invalid Date';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

export function getWeekdayShortInTimezone(
  value: string | Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return formatDateInTimezone(value, { weekday: 'short' }, timeZone);
}

export function startOfDayInTimezoneUtc(
  value: string | Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): Date {
  const date = parseTimestampAsUtc(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  // Use UTC midnight of the same calendar date as the reference instant for offset lookup.
  // This avoids interpreting the datetime string as local system time (which would produce
  // wrong offsets when the server/browser timezone differs from the target timezone).
  const utcMidnight = new Date(`${year}-${month}-${day}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const tzParts = formatter.formatToParts(utcMidnight);
  const offsetStr = tzParts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
  const offsetMatch = offsetStr.match(/GMT([+-]?)(\d{1,2})?(?::(\d{2}))?/);

  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(offsetMatch[2] || '0', 10);
    const mins = parseInt(offsetMatch[3] || '0', 10);
    offsetMinutes = sign * (hours * 60 + mins);
  }

  const utcMs =
    new Date(`${year}-${month}-${day}T00:00:00Z`).getTime() - offsetMinutes * 60000;
  return new Date(utcMs);
}

export function endOfDayInTimezoneUtc(
  value: string | Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): Date {
  // Determine the calendar date of `value` in the target timezone, then advance
  // to the next calendar day. Adding a fixed 86400000ms offset is DST-unsafe
  // (spring-forward days are 23h; fall-back days are 25h).
  const date = parseTimestampAsUtc(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';

  // Construct midnight UTC for this calendar date, then increment by exactly 1 day.
  const currentDayUtc = new Date(`${year}-${month}-${day}T00:00:00Z`);
  currentDayUtc.setUTCDate(currentDayUtc.getUTCDate() + 1);
  const startOfNextDay = startOfDayInTimezoneUtc(currentDayUtc, timeZone);
  return new Date(startOfNextDay.getTime() - 1);
}

export function formatDateWithFallbackYear(
  value: string | Date,
  now: Date = new Date(),
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  const date = parseTimestampAsUtc(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const dateYear = Number(
    formatDateInTimezone(date, { year: 'numeric' }, timeZone),
  );
  const currentYear = Number(
    formatDateInTimezone(now, { year: 'numeric' }, timeZone),
  );
  return formatDateInTimezone(
    date,
    {
      month: 'short',
      day: 'numeric',
      year: dateYear !== currentYear ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    },
    timeZone,
  );
}
