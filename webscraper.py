import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

BASE = "https://getinvolved.tamu.edu/organizations"
HEADERS = {"User-Agent": "Mozilla/5.0"}
WORKERS = 20
clubs = []

# Step 1: collect basic info from all listing pages (sequential — one server)
for page in range(1, 59):  # 58 pages
    print(f"Scraping page {page}/58...")

    res = requests.get(BASE, params={"page": page}, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    cards = soup.select("div.relative.border.rounded-sm.shadow-sm.text-center")

    for card in cards:
        name_el = card.select_one("h3, h2")
        desc_el = card.select_one("p")
        link_el = card.select_one("a[href]")

        clubs.append(
            {
                "name": name_el.text.strip() if name_el else "",
                "description": desc_el.text.strip() if desc_el else "",
                "url": link_el["href"] if link_el else "",
                "email": "none",
            }
        )

    print(f"  → {len(cards)} clubs found on this page")
    time.sleep(0.4)

# Step 2: fetch detail pages concurrently to grab emails
session = requests.Session()
session.headers.update(HEADERS)

url_to_club = {club["url"]: club for club in clubs if club["url"]}

def fetch_email(url):
    try:
        detail = session.get(url, timeout=10)
        soup = BeautifulSoup(detail.text, "html.parser")
        mailto = soup.select_one("a[href^='mailto:']")
        return url, mailto["href"].replace("mailto:", "").strip() if mailto else "none"
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

