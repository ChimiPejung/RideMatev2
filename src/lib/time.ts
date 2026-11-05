import { BOOK_AHEAD_DAYS, MINUTE_STEP } from '../config';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Next 15-minute mark at or after `from`, with seconds cleared. */
export function roundUpToStep(from = new Date(), step = MINUTE_STEP) {
  const x = new Date(from);
  x.setSeconds(0, 0);
  const extra = (step - (x.getMinutes() % step)) % step;
  x.setMinutes(x.getMinutes() + extra);
  return x;
}

export function latestBookable(now = new Date()) {
  const x = addDays(startOfDay(now), BOOK_AHEAD_DAYS);
  x.setHours(23, 45, 0, 0);
  return x;
}

export function formatTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayShort(d: Date) {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Today", "Tomorrow" or "Sat 7 Nov". */
export function formatDayRelative(d: Date, now = new Date()) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDayShort(d);
}

export function formatDeparture(d: Date, now = new Date()) {
  return `${formatDayRelative(d, now)} · ${formatTime(d)}`;
}

export function formatDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ---------------------------------------------------------------- search windows

export type WindowId = 'now' | 'next2h' | 'today' | 'tomorrow' | 'any';

export const WINDOWS: { id: WindowId; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'next2h', label: 'Next 2 hours' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'any', label: 'Any time' },
];

/** [start, end] of a search window. "Now" means leaving within the next hour. */
export function windowRange(id: WindowId, now = new Date()): [Date, Date] {
  const hour = 60 * 60 * 1000;
  switch (id) {
    case 'now':
      return [now, new Date(now.getTime() + hour)];
    case 'next2h':
      return [now, new Date(now.getTime() + 2 * hour)];
    case 'today': {
      const end = addDays(startOfDay(now), 1);
      return [now, new Date(end.getTime() - 1)];
    }
    case 'tomorrow': {
      const start = addDays(startOfDay(now), 1);
      return [start, new Date(addDays(start, 1).getTime() - 1)];
    }
    case 'any':
    default:
      return [now, latestBookable(now)];
  }
}

export function windowSubtitle(id: WindowId) {
  switch (id) {
    case 'now':
      return 'Leaving in the next hour';
    case 'next2h':
      return 'Leaving in the next 2 hours';
    case 'today':
      return 'Today · all times';
    case 'tomorrow':
      return 'Tomorrow · all times';
    default:
      return 'Any time this week';
  }
}

/** Sensible starting time for the create form when coming from a search window. */
export function suggestedDeparture(id: WindowId, now = new Date()) {
  if (id === 'tomorrow') {
    const d = addDays(startOfDay(now), 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return roundUpToStep(new Date(now.getTime() + 15 * 60 * 1000));
}
