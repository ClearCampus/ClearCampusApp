// Mock page-view counter, keyed by club slug. A real backend would compute
// this from analytics events; here it just increments on every visit to a
// club's page within this browser.

const STORAGE_KEY = "cc_club_page_views";

function readAll(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(views: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function recordPageView(slug: string): void {
  const views = readAll();
  views[slug] = (views[slug] ?? 0) + 1;
  writeAll(views);
}

export function getPageViews(slug: string): number {
  return readAll()[slug] ?? 0;
}
