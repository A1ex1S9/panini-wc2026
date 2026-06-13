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


def _get(url, params, timeout=15):
    """GET with Retry-After-aware exponential backoff."""
    for attempt in range(6):
        try:
            r = session.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 0) or 0)
                wait = max(wait, 2 ** (attempt + 1), 5)
                print(f"  rate limited, waiting {wait}s…", flush=True)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            if attempt == 5:
                raise
            time.sleep(2 ** attempt)
    return None


def commons_thumb(filename: str, width: int = 64) -> str:
    name = filename.replace(" ", "_")
    md5 = hashlib.md5(name.encode()).hexdigest()
    ext = name.rsplit(".", 1)[-1].lower()
    thumb_name = f"{name}.png" if ext in ("svg", "tif", "tiff") else name
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb"
        f"/{md5[0]}/{md5[:2]}/{name}/{width}px-{thumb_name}"
    )


def get_club_logo_via_sparql(clubs: list[str]) -> dict[str, str]:
    """Batch-fetch club logos via Wikidata SPARQL P154. Returns club_name -> url."""
    import hashlib as _hl
    results: dict[str, str] = {}
    # Build search strings filter
    values = " ".join(f'"{c.replace(chr(34), "")}"@en' for c in clubs)
    query = f"""
    SELECT ?label ?logo WHERE {{
      ?club wdt:P31/wdt:P279* wd:Q476028 .
      ?club rdfs:label ?label .
      FILTER(LANG(?label) = "en")
      FILTER(?label IN ({", ".join(f'"{c}"@en' for c in clubs)}))
      ?club wdt:P154 ?logo .
    }}"""
    try:
        r = _get(SPARQL_API, {"query": query, "format": "json"}, timeout=60)
        if r is None:
            return results
        for b in r.json().get("results", {}).get("bindings", []):
            label = b.get("label", {}).get("value", "")
            logo_url = b.get("logo", {}).get("value", "")
            if label and logo_url and label not in results:
                filename = unquote(logo_url.rsplit("/", 1)[-1])
                name = filename.replace(" ", "_")
                md5 = hashlib.md5(name.encode()).hexdigest()
                ext = name.rsplit(".", 1)[-1].lower()
                thumb_name = f"{name}.png" if ext in ("svg", "tif", "tiff") else name
                results[label] = (
                    f"https://upload.wikimedia.org/wikipedia/commons/thumb"
                    f"/{md5[0]}/{md5[:2]}/{name}/64px-{thumb_name}"
                )
    except Exception as e:
        print(f"  sparql club batch failed: {e}", file=sys.stderr)
    return results


def get_club_logo_via_wikidata(club_name: str) -> str | None:
    """Single-club fallback: search Wikidata entity + P154."""
    try:
        r = _get(WIKIDATA_API, {
            "action": "wbsearchentities", "search": club_name,
            "language": "en", "type": "item", "limit": "3", "format": "json",
        })
        if r is None:
            return None
        results = r.json().get("search", [])
        if not results:
            return None
        qid = results[0]["id"]
        r2 = _get(WIKIDATA_API, {
            "action": "wbgetclaims", "entity": qid,
            "property": "P154", "format": "json",
        })
        if r2 is None:
            return None
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
        r = _get(WIKI_API, {
            "action": "query", "list": "search",
            "srsearch": f"{club_name} football club",
            "srlimit": "1", "srnamespace": "0", "format": "json",
        })
        if r is None:
            return None
        results = r.json().get("query", {}).get("search", [])
        if not results:
            return None
        title = results[0]["title"]
        r2 = _get(WIKI_API, {
            "action": "query", "titles": title,
            "prop": "pageimages", "piprop": "thumbnail",
            "pithumbsize": "64", "format": "json",
        })
        if r2 is None:
            return None
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

    # Phase 1: batch SPARQL (one request for all clubs)
    if to_fetch:
        print(f"  Phase 1: SPARQL batch for {len(to_fetch)} clubs…", flush=True)
        sparql_results = get_club_logo_via_sparql(to_fetch)
        for club, url in sparql_results.items():
            logo_cache[club] = url
        still_missing = [c for c in to_fetch if c not in logo_cache]
        print(f"  SPARQL found: {len(sparql_results)}, still missing: {len(still_missing)}")
    else:
        still_missing = []

    # Phase 2: per-club fallback for what SPARQL missed
    for i, club in enumerate(still_missing, 1):
        print(f"  [{i}/{len(still_missing)}] {club}", end=" ", flush=True)
        logo = get_club_logo_via_wikidata(club)
        if logo:
            print("✓ wikidata")
        else:
            logo = get_club_logo_via_wikipedia(club)
            print("✓ wikipedia" if logo else "✗ not found")
        if logo:
            logo_cache[club] = logo
        time.sleep(1.5)

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
