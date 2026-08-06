import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

BASE = "https://getinvolved.tamu.edu/organizations"
HEADERS = {"User-Agent": "Mozilla/5.0"}
WORKERS = 20
PAGE_LIMIT = 200          # max items/page the site supports; fewer requests = fewer chances to get rate-limited
BATCH_SIZE = WORKERS      # how many pages to probe per round while discovering the true page count
MAX_PAGES_SAFETY_CAP = 100  # sanity bound so a scraper/markup bug can't spin forever
OUTPUT_FILE = "tamu_clubs.json"
MAX_DROP_RATIO = 0.10     # abort if the new scrape has >10% fewer clubs than last run

session = requests.Session()
session.headers.update(HEADERS)


def fetch_page(page, retries=3, backoff=2):
    """Fetch one listing page. Returns (page, results, ok) — ok=False means every retry failed,
    which must NOT be conflated with a legitimately empty (end-of-results) page downstream."""
    for attempt in range(retries):
        try:
            res = session.get(BASE, params={"page": page, "limit": PAGE_LIMIT}, timeout=15)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            cards = soup.select("div.relative.border.rounded-sm.shadow-sm.text-center")
            results = []
            for card in cards:
                name_el = card.select_one("h3, h2")
                desc_el = card.select_one("p")
                link_el = card.select_one("a[href]")
                results.append({
                    "name": name_el.text.strip() if name_el else "",
                    "description": desc_el.text.strip() if desc_el else "",
                    "url": str(link_el["href"]) if link_el else "",
                    "email": "none",
                    "phone": "none",
                })
            return page, results, True
        except Exception as e:
            print(f"  Warning: page {page} attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(backoff * (attempt + 1))
    print(f"  Error: page {page} failed after {retries} attempts.")
    return page, [], False


# Step 1: discover and fetch all listing pages, growing the search until a confirmed-empty page is found.
print(f"Scraping listing pages (limit={PAGE_LIMIT}/page, {WORKERS} workers)...")
page_results = {}
failed_pages = []
next_page = 1
found_end = False

while not found_end and next_page <= MAX_PAGES_SAFETY_CAP:
    batch_pages = list(range(next_page, next_page + BATCH_SIZE))
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(fetch_page, p): p for p in batch_pages}
        for future in as_completed(futures):
            page, results, ok = future.result()
            page_results[page] = results
            if not ok:
                failed_pages.append(page)

    for p in batch_pages:
        if p not in failed_pages and len(page_results.get(p, [])) == 0:
            found_end = True
            break

    next_page += BATCH_SIZE

if failed_pages:
    print(f"ERROR: {len(failed_pages)} page(s) failed after retries: {sorted(failed_pages)}")
    print("Aborting scrape — refusing to produce a partial club list that could trigger false deletion flags.")
    sys.exit(1)

if not found_end:
    print(f"ERROR: hit MAX_PAGES_SAFETY_CAP ({MAX_PAGES_SAFETY_CAP}) without finding the end of results.")
    print("The listing markup or pagination may have changed — aborting instead of guessing.")
    sys.exit(1)

last_page_with_data = max((p for p, r in page_results.items() if r), default=0)
clubs = []
for page in range(1, last_page_with_data + 1):
    clubs.extend(page_results.get(page, []))
print(f"  -> {len(clubs)} clubs found across {last_page_with_data} pages")

# Sanity check against the previous run's output — a big unexplained drop means something broke
# upstream (markup change, partial block, etc.), not that hundreds of clubs vanished overnight.
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE, encoding="utf-8") as f:
        prev_clubs = json.load(f)
    prev_count = len(prev_clubs)
    if prev_count > 0 and len(clubs) < prev_count * (1 - MAX_DROP_RATIO):
        print(f"ERROR: scraped {len(clubs)} clubs, down from {prev_count} last run "
              f"(>{int(MAX_DROP_RATIO * 100)}% drop).")
        print("Aborting — this looks like a broken/partial scrape, not real mass removals.")
        sys.exit(1)

# Step 2: fetch detail pages concurrently to grab emails
session = requests.Session()
session.headers.update(HEADERS)

url_to_club = {club["url"]: club for club in clubs if club["url"]}

def fetch_contact(url):
    try:
        detail = session.get(url, timeout=5)
        soup = BeautifulSoup(detail.text, "html.parser")
        mailto = soup.select_one("a[href^='mailto:']")
        tel = soup.select_one("a[href^='tel:']")
        email = str(mailto["href"]).replace("mailto:", "").strip() if mailto else "none"
        phone = str(tel["href"]).replace("tel:", "").strip() if tel else "none"
        return url, email, phone
    except Exception as e:
        print(f"  Warning: could not fetch {url}: {e}")
        return url, "none", "none"

total = len(url_to_club)
done = 0
print(f"Fetching contact info from {total} detail pages ({WORKERS} workers)...")

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(fetch_contact, url): url for url in url_to_club}
    for future in as_completed(futures):
        url, email, phone = future.result()
        url_to_club[url]["email"] = email
        url_to_club[url]["phone"] = phone
        done += 1
        if done % 100 == 0 or done == total:
            print(f"  {done}/{total} detail pages done")

with open(OUTPUT_FILE, "w") as f:
    json.dump(clubs, f, indent=2)
