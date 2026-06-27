import json
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://getinvolved.tamu.edu/organizations"
clubs = []

for page in range(1, 59):  # 58 pages
    print(f"Scraping page {page}/58...")

    res = requests.get(
        BASE,
        params={"page": page},
        headers={
            "User-Agent": "Mozilla/5.0"  # polite headers
        },
    )
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
            }
        )

    print(f"  → {len(cards)} clubs found on this page")
    time.sleep(0.4)  # don't hammer their server

with open("tamu_clubs.json", "w") as f:
    json.dump(clubs, f, indent=2)

