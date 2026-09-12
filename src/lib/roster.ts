export const MAX_NARRATORS = 2;

export type NarratorRef = { userId: string };

export function narratorIds(event: { narrators: NarratorRef[] }) {
  return event.narrators.map((n) => n.userId);
}

export function isEventNarrator(userId: string, event: { narrators: NarratorRef[] }) {
  return event.narrators.some((n) => n.userId === userId);
}

export function canManageEventScenario(
  user: { id: string; isAdmin: boolean },
  event: { narrators: NarratorRef[] },
) {
  return user.isAdmin || isEventNarrator(user.id, event);
}

export function splitRoster<T extends { userId: string }>(
  registrations: T[],
  event: { narrators: NarratorRef[] },
) {
  const ids = new Set(narratorIds(event));
  return {
    narrators: registrations.filter((r) => ids.has(r.userId)),
    players: registrations.filter((r) => !ids.has(r.userId)),
  };
}
