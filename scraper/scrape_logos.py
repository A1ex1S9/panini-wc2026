#!/usr/bin/env python3
"""Fetch club logo URLs and patch stickers.json.

Primary:  Wikipedia pageimages API (batched 50 at a time) — club pages
          almost always have the crest as the main image.
Fallback: Wikidata SPARQL P154 (batched 50 at a time, avoids 414 error).

Usage:
    python3 scraper/scrape_logos.py
"""

import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.parse import unquote

import requests

SPARQL_API = "https://query.wikidata.org/sparql"
WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "panini-wc2026-logos/1.0 (hobby; github)"}
OUT_PATH = Path(__file__).resolve().parent.parent / "backend" / "seeddata" / "stickers.json"

session = requests.Session()
session.headers.update(HEADERS)


def _get(url, params, timeout=30):
    for attempt in range(6):
        try:
            r = session.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 0) or 0)
                wait = max(wait, 2 ** (attempt + 1), 5)
                print(f"  rate limited {wait}s…", flush=True)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            if attempt == 5:
                raise
            time.sleep(2 ** attempt)
    return None


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def commons_thumb(filename, width=64):
    name = filename.replace(" ", "_")
    md5 = hashlib.md5(name.encode()).hexdigest()
    ext = name.rsplit(".", 1)[-1].lower()
    thumb_name = f"{name}.png" if ext in ("svg", "tif", "tiff") else name
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb"
        f"/{md5[0]}/{md5[:2]}/{name}/{width}px-{thumb_name}"
    )


def fetch_logos_wikipedia(clubs: list[str]) -> dict[str, str]:
    """Wikipedia pageimages API — club pages have the crest as main image."""
    out: dict[str, str] = {}
    batches = list(chunked(clubs, 50))
    for i, batch in enumerate(batches, 1):
        print(f"  wiki {i}/{len(batches)} ({len(batch)} clubs)… ", end="", flush=True)
        r = _get(WIKI_API, {
            "action": "query",
            "titles": "|".join(batch),
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": "64",
            "format": "json",
            "formatversion": "2",
            "redirects": "1",
        })
        if r is None:
            print("failed")
            continue
        data = r.json()
        redirect_map: dict[str, str] = {}
        for rd in data.get("query", {}).get("redirects", []):
            redirect_map[rd["to"]] = rd["from"]
        for norm in data.get("query", {}).get("normalized", []):
            redirect_map[norm["to"]] = norm["from"]
        found = 0
        for page in data.get("query", {}).get("pages", []):
            title = page.get("title", "")
            orig = redirect_map.get(title, title)
            thumb = (page.get("thumbnail") or {}).get("source")
            if thumb:
                out[orig] = thumb
                out[title] = thumb
                found += 1
        print(f"{found}/{len(batch)} found")
        time.sleep(0.5)
    return out


def fetch_logos_sparql(clubs: list[str]) -> dict[str, str]:
    """Wikidata SPARQL P154 — batched 50 at a time to stay under URL limit."""
    out: dict[str, str] = {}
    batches = list(chunked(clubs, 50))
    for i, batch in enumerate(batches, 1):
        print(f"  sparql {i}/{len(batches)} ({len(batch)} clubs)… ", end="", flush=True)
        filter_vals = ", ".join(f'"{c.replace(chr(34), "")}"@en' for c in batch)
        query = f"""
        SELECT ?label ?logo WHERE {{
          ?club rdfs:label ?label .
          FILTER(LANG(?label) = "en")
          FILTER(?label IN ({filter_vals}))
          ?club wdt:P154 ?logo .
        }}"""
        try:
            r = _get(SPARQL_API, {"query": query, "format": "json"}, timeout=60)
            if r is None:
                print("failed")
                continue
            found = 0
            for b in r.json().get("results", {}).get("bindings", []):
                label = b.get("label", {}).get("value", "")
                logo_url = b.get("logo", {}).get("value", "")
                if label and logo_url and label not in out:
                    filename = unquote(logo_url.rsplit("/", 1)[-1])
                    out[label] = commons_thumb(filename, 64)
                    found += 1
            print(f"{found}/{len(batch)} found")
        except Exception as e:
            print(f"error: {e}", file=sys.stderr)
        time.sleep(1)
    return out


def main():
    stickers = json.loads(OUT_PATH.read_text())

    clubs_to_fetch: dict[str, str] = {}
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
    print(f"Need to fetch: {len(to_fetch)}")

    # Phase 1: Wikipedia pageimages (fast, reliable, batched)
    print("\nPhase 1: Wikipedia pageimages…")
    wiki_results = fetch_logos_wikipedia(to_fetch)
    logo_cache.update(wiki_results)
    still_missing = [c for c in to_fetch if c not in logo_cache]
    print(f"Wikipedia: {len(wiki_results)} found, {len(still_missing)} still missing")

    # Phase 2: Wikidata SPARQL in small batches
    if still_missing:
        print(f"\nPhase 2: Wikidata SPARQL for {len(still_missing)} clubs…")
        sparql_results = fetch_logos_sparql(still_missing)
        logo_cache.update(sparql_results)
        still_missing = [c for c in still_missing if c not in logo_cache]
        print(f"SPARQL: {len(sparql_results)} found, {len(still_missing)} still missing")

    if still_missing:
        print(f"\nNo logo found for: {', '.join(still_missing[:20])}"
              + (f"… and {len(still_missing)-20} more" if len(still_missing) > 20 else ""))

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
