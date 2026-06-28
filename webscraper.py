import json
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://getinvolved.tamu.edu/organizations"
HEADERS = {"User-Agent": "Mozilla/5.0"}
clubs = []

# Step 1: collect basic info from all listing pages
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

# Step 2: visit each club detail page to grab the email from "Get in Touch"
total = len(clubs)
for i, club in enumerate(clubs):
    if not club["url"]:
        continue

    try:
        detail = requests.get(club["url"], headers=HEADERS, timeout=10)
        detail_soup = BeautifulSoup(detail.text, "html.parser")
        mailto = detail_soup.select_one("a[href^='mailto:']")
        if mailto:
            club["email"] = mailto["href"].replace("mailto:", "").strip()
        else:
            club["email"] = "none"
    except Exception as e:
        print(f"  Warning: could not fetch {club['url']}: {e}")

    if (i + 1) % 50 == 0 or (i + 1) == total:
        print(f"  Detail pages: {i + 1}/{total}")
    time.sleep(0.3)

with open("tamu_clubs.json", "w") as f:
    json.dump(clubs, f, indent=2)

