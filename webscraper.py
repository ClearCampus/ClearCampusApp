import json
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

BASE = "https://getinvolved.tamu.edu/organizations"
HEADERS = {"User-Agent": "Mozilla/5.0"}
WORKERS = 20
TOTAL_PAGES = 58

session = requests.Session()
session.headers.update(HEADERS)

# Step 1: fetch all listing pages in parallel
def fetch_page(page, retries=3):
    for attempt in range(retries):
        try:
            res = session.get(BASE, params={"page": page}, timeout=15)
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
                })
            return page, results
        except Exception as e:
            print(f"  Warning: page {page} attempt {attempt + 1} failed: {e}")
    print(f"  Error: page {page} failed after {retries} attempts, skipping.")
    return page, []

print(f"Scraping {TOTAL_PAGES} listing pages ({WORKERS} workers)...")
page_results = {}
with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(fetch_page, p): p for p in range(1, TOTAL_PAGES + 1)}
    for future in as_completed(futures):
        page, results = future.result()
        page_results[page] = results

# Reassemble in order
clubs = []
for page in range(1, TOTAL_PAGES + 1):
    clubs.extend(page_results[page])
print(f"  → {len(clubs)} clubs found across all pages")

# Step 2: fetch detail pages concurrently to grab emails
session = requests.Session()
session.headers.update(HEADERS)

url_to_club = {club["url"]: club for club in clubs if club["url"]}

def fetch_email(url):
    try:
        detail = session.get(url, timeout=5)
        soup = BeautifulSoup(detail.text, "html.parser")
        mailto = soup.select_one("a[href^='mailto:']")
        return url, str(mailto["href"]).replace("mailto:", "").strip() if mailto else "none"
    except Exception as e:
        print(f"  Warning: could not fetch {url}: {e}")
        return url, "none"

total = len(url_to_club)
done = 0
print(f"Fetching emails from {total} detail pages ({WORKERS} workers)...")

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(fetch_email, url): url for url in url_to_club}
    for future in as_completed(futures):
        url, email = future.result()
        url_to_club[url]["email"] = email
        done += 1
        if done % 100 == 0 or done == total:
            print(f"  {done}/{total} detail pages done")

with open("tamu_clubs.json", "w") as f:
    json.dump(clubs, f, indent=2)

