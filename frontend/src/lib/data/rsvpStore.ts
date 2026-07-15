// Mock aggregate RSVP counter, keyed by `${clubSlug}:${eventId}` (see eventKey() in ./clubs).
// A real backend would return this as a count from an RSVPs table; here a
// student "saving" an event stands in for RSVPing to it, so the counter is
// nudged from StudentDataContext whenever a save is toggled.

const STORAGE_KEY = "cc_event_rsvps";

function readAll(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(counts: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
}

export function getRsvpCount(key: string): number {
  return readAll()[key] ?? 0;
}

export function adjustRsvp(key: string, delta: number): void {
  const counts = readAll();
  counts[key] = Math.max(0, (counts[key] ?? 0) + delta);
  writeAll(counts);
}
