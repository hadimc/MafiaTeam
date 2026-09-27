/** Minutes that `Date#getTimezoneOffset()` returns: local + this many minutes = UTC. */

const WALL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/;

function isInstant(raw: string) {
  return /Z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw);
}

/** Parse an event form date. datetime-local values are wall-clock in the admin's timezone. */
export function parseEventDateInput(raw: string, timeZoneOffsetMinutes?: number) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isInstant(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = trimmed.match(WALL);
  if (!match || timeZoneOffsetMinutes == null || !Number.isFinite(timeZoneOffsetMinutes)) return null;

  const utcMs = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
  );
  return new Date(utcMs + timeZoneOffsetMinutes * 60 * 1000);
}
