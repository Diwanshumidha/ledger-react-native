const LOCALE = 'en-IN';

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const timeOfDay = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

/** Calendar date as `YYYY-MM-DD` in the device's own timezone. */
export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toCalendarDate(new Date());
}

function fromCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDateShort(value: string): string {
  return dayMonth.format(fromCalendarDate(value));
}

export function formatDateLong(value: string): string {
  return dayMonthYear.format(fromCalendarDate(value));
}

export function formatTime(isoTimestamp: string): string {
  return timeOfDay.format(new Date(isoTimestamp));
}

/** "Today" / "Yesterday" / "12 Aug 2026", for date group headers. */
export function formatRelativeDay(value: string): string {
  const now = new Date();
  if (value === toCalendarDate(now)) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (value === toCalendarDate(yesterday)) {
    return 'Yesterday';
  }
  return formatDateLong(value);
}

export function shiftCalendarDate(value: string, days: number): string {
  const date = fromCalendarDate(value);
  date.setDate(date.getDate() + days);
  return toCalendarDate(date);
}

export function isFuture(value: string): boolean {
  return value > today();
}
