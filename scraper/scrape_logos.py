#!/usr/bin/env python3
"""Fetch club logo URLs from Wikidata (P154 logo image) and patch stickers.json.

Usage:
    python3 scraper/scrape_logos.py

Reads backend/seeddata/stickers.json, adds club_logo_url for each player sticker,
writes the result back in-place.
"""

import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.parse import unquote

import requests

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
SPARQL_API = "https://query.wikidata.org/sparql"
WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "panini-wc2026-logos/1.0 (hobby; github)"}
OUT_PATH = Path(__file__).resolve().parent.parent / "backend" / "seeddata" / "stickers.json"

session = requests.Session()
session.headers.update(HEADERS)


def commons_thumb(filename: str, width: int = 64) -> str:
    name = filename.replace(" ", "_")
    md5 = hashlib.md5(name.encode()).hexdigest()
    ext = name.rsplit(".", 1)[-1].lower()
    thumb_name = f"{name}.png" if ext in ("svg", "tif", "tiff") else name
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb"
        f"/{md5[0]}/{md5[:2]}/{name}/{width}px-{thumb_name}"
    )


def get_club_logo_via_wikidata(club_name: str) -> str | None:
    """Search Wikidata for a football club and return its P154 logo URL."""
    # Search for the club entity
    try:
        r = session.get(WIKIDATA_API, params={
            "action": "wbsearchentities", "search": club_name,
            "language": "en", "type": "item", "limit": "3", "format": "json",
        }, timeout=15)
        r.raise_for_status()
        results = r.json().get("search", [])
        if not results:
            return None
        # Take first result
        qid = results[0]["id"]

        # Fetch P154 (logo image)
        r2 = session.get(WIKIDATA_API, params={
            "action": "wbgetclaims", "entity": qid,
            "property": "P154", "format": "json",
        }, timeout=15)
        r2.raise_for_status()
        claims = r2.json().get("claims", {}).get("P154", [])
        if not claims:
            return None
        filename = claims[0]["mainsnak"]["datavalue"]["value"]
        return commons_thumb(filename, 64)
    except Exception as e:
        print(f"  wikidata lookup failed for '{club_name}': {e}", file=sys.stderr)
        return None


def get_club_logo_via_wikipedia(club_name: str) -> str | None:
    """Fallback: search Wikipedia for the club and grab its pageimage."""
    try:
        r = session.get(WIKI_API, params={
            "action": "query", "list": "search",
            "srsearch": f"{club_name} football club",
            "srlimit": "1", "srnamespace": "0", "format": "json",
        }, timeout=15)
        r.raise_for_status()
        results = r.json().get("query", {}).get("search", [])
        if not results:
            return None
        title = results[0]["title"]
        r2 = session.get(WIKI_API, params={
            "action": "query", "titles": title,
            "prop": "pageimages", "piprop": "thumbnail",
            "pithumbsize": "64", "format": "json",
        }, timeout=15)
        r2.raise_for_status()
        for page in r2.json().get("query", {}).get("pages", {}).values():
            return (page.get("thumbnail") or {}).get("source")
    except Exception as e:
        print(f"  wikipedia fallback failed for '{club_name}': {e}", file=sys.stderr)
    return None


def main():
    stickers = json.loads(OUT_PATH.read_text())

    # Collect unique club names (skip specials and already-done)
    clubs_to_fetch = {}
    for s in stickers:
        if s.get("is_special") or not s.get("club"):
            continue
        club = s["club"]
        if club not in clubs_to_fetch:
            clubs_to_fetch[club] = s.get("club_logo_url", "")

    already = sum(1 for v in clubs_to_fetch.values() if v)
    print(f"Clubs total: {len(clubs_to_fetch)}, already have logo: {already}")

    logo_cache: dict[str, str] = {k: v for k, v in clubs_to_fetch.items() if v}
    to_fetch = [c for c, v in clubs_to_fetch.items() if not v]
    print(f"Fetching logos for {len(to_fetch)} clubs…")

    for i, club in enumerate(to_fetch, 1):
        print(f"  [{i}/{len(to_fetch)}] {club}", end=" ", flush=True)
        logo = get_club_logo_via_wikidata(club)
        if logo:
            print("✓ wikidata")
        else:
            logo = get_club_logo_via_wikipedia(club)
            print("✓ wikipedia" if logo else "✗ not found")
        if logo:
            logo_cache[club] = logo
        time.sleep(0.3)

    # Patch stickers
    for s in stickers:
        if not s.get("is_special") and s.get("club"):
            s["club_logo_url"] = logo_cache.get(s["club"], "")

    OUT_PATH.write_text(json.dumps(stickers, ensure_ascii=False, indent=1))
    found = sum(1 for s in stickers if s.get("club_logo_url") and not s.get("is_special"))
    total = sum(1 for s in stickers if not s.get("is_special") and s.get("club"))
    print(f"\nDone: {found}/{total} players have club logo ({100*found//max(total,1)}%)")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
