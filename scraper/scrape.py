#!/usr/bin/env python3
"""Scrape real FIFA World Cup 2026 squads from Wikipedia into stickers.json.

Sources:
  - en.wikipedia.org "2026 FIFA World Cup squads" (squad tables per team)
  - Wikipedia pageimages API (player portrait thumbnails, batched)
  - Wikidata SPARQL (height / weight, batched)

Output: backend/seeddata/stickers.json (embedded by the Go seed binary).
"""

import hashlib
import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlencode

import requests
from bs4 import BeautifulSoup

WIKI_API = "https://en.wikipedia.org/w/api.php"
SPARQL_API = "https://query.wikidata.org/sparql"
SQUADS_PAGE = "2026_FIFA_World_Cup_squads"
HEADERS = {"User-Agent": "panini-wc2026-album/1.0 (hobby project; contact: github)"}

OUT_PATH = Path(__file__).resolve().parent.parent / "backend" / "seeddata" / "stickers.json"

POSITION_MAP = {"GK": "GK", "DF": "DEF", "MF": "MID", "FW": "FWD"}

# Primary kit / federation colour per team (hex), used as the sticker background.
TEAM_COLORS = {
    "Czech Republic": "#D7141A", "Mexico": "#006847", "South Africa": "#007749",
    "South Korea": "#CD2E3A", "Bosnia and Herzegovina": "#002F6C", "Canada": "#C8102E",
    "Qatar": "#8A1538", "Switzerland": "#2BA4A0", "Brazil": "#FFC20E", "Haiti": "#00209F",
    "Morocco": "#C1272D", "Scotland": "#0065BF", "Australia": "#FFB81C",
    "Paraguay": "#D52B1E", "Turkey": "#E30A17", "United States": "#1A3C6E",
    "Curaçao": "#002B7F", "Ecuador": "#FFD100", "Germany": "#1A1A1A",
    "Ivory Coast": "#FF8200", "Japan": "#1D2088", "Netherlands": "#F36C21",
    "Sweden": "#FFCD00", "Tunisia": "#E70013", "Belgium": "#3D195B", "Egypt": "#CE1126",
    "Iran": "#239F40", "New Zealand": "#1A1A1A", "Cape Verde": "#003893",
    "Saudi Arabia": "#165D31", "Spain": "#AA151B", "Uruguay": "#55B5E5",
    "France": "#21304D", "Iraq": "#007A3D", "Norway": "#BA0C2F", "Senegal": "#00853F",
    "Algeria": "#006233", "Argentina": "#75AADB", "Austria": "#ED2939",
    "Jordan": "#007A3D", "Colombia": "#FCD116", "DR Congo": "#007FFF",
    "Portugal": "#A4161A", "Uzbekistan": "#0099B5", "Croatia": "#ED1C24",
    "England": "#1E2A5C", "Ghana": "#CE1126", "Panama": "#DA121A",
}

# ISO 3166-1 alpha-2 codes for flag emoji / flagcdn images on the frontend.
TEAM_CODES = {
    "Czech Republic": "cz", "Mexico": "mx", "South Africa": "za", "South Korea": "kr",
    "Bosnia and Herzegovina": "ba", "Canada": "ca", "Qatar": "qa", "Switzerland": "ch",
    "Brazil": "br", "Haiti": "ht", "Morocco": "ma", "Scotland": "gb-sct",
    "Australia": "au", "Paraguay": "py", "Turkey": "tr", "United States": "us",
    "Curaçao": "cw", "Ecuador": "ec", "Germany": "de", "Ivory Coast": "ci",
    "Japan": "jp", "Netherlands": "nl", "Sweden": "se", "Tunisia": "tn",
    "Belgium": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
    "Cape Verde": "cv", "Saudi Arabia": "sa", "Spain": "es", "Uruguay": "uy",
    "France": "fr", "Iraq": "iq", "Norway": "no", "Senegal": "sn",
    "Algeria": "dz", "Argentina": "ar", "Austria": "at", "Jordan": "jo",
    "Colombia": "co", "DR Congo": "cd", "Portugal": "pt", "Uzbekistan": "uz",
    "Croatia": "hr", "England": "gb-eng", "Ghana": "gh", "Panama": "pa",
}

LEGENDS = {
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland",
    "Vinícius Júnior", "Jude Bellingham", "Harry Kane", "Luka Modrić",
    "Kevin De Bruyne", "Mohamed Salah", "Son Heung-min", "Lamine Yamal",
    "Jamal Musiala", "Antoine Griezmann", "Neymar", "Pedri", "Achraf Hakimi",
}

HOST_CITIES = [
    "Atlanta", "Boston", "Dallas", "Guadalajara", "Houston", "Kansas City",
    "Los Angeles", "Mexico City", "Miami", "Monterrey", "New York New Jersey",
    "Philadelphia", "San Francisco Bay Area", "Seattle", "Toronto", "Vancouver",
]

session = requests.Session()
session.headers.update(HEADERS)


CACHE_DIR = Path(__file__).resolve().parent / ".cache"


def api(params):
    params = {"format": "json", "formatversion": "2", **params}
    key = hashlib.sha256(urlencode(sorted(params.items())).encode()).hexdigest()
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    for attempt in range(7):
        try:
            r = session.get(WIKI_API, params=params, timeout=30)
            if r.status_code == 429:
                wait = max(int(r.headers.get("Retry-After", 0) or 0), 2 ** attempt)
                print(f"  rate limited, waiting {wait}s…", file=sys.stderr)
                time.sleep(wait)
                continue
            r.raise_for_status()
            data = r.json()
            CACHE_DIR.mkdir(exist_ok=True)
            cache_file.write_text(json.dumps(data))
            return data
        except requests.RequestException as e:
            if attempt == 6:
                raise
            print(f"  retry after error: {e}", file=sys.stderr)
            time.sleep(2 ** attempt)
    raise RuntimeError("rate limit retries exhausted")


def fold(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def split_name(display, sort_value):
    """Split a display name into (first, last) using the table sort key
    ("Last, First"), which knows the real surname even for non-western
    ordering. Falls back to last-token-is-surname."""
    display = display.strip()
    if sort_value and "," in sort_value:
        sort_last = fold(sort_value.split(",")[0].strip())
        tokens = display.split()
        # find the shortest token suffix whose folded form matches the sort key
        for i in range(len(tokens)):
            if fold(" ".join(tokens[i:])).replace("-", " ") == sort_last.replace("-", " "):
                return " ".join(tokens[:i]), " ".join(tokens[i:])
        # try prefix (east-asian ordering: "Son Heung-min" sorts as "Son, ...")
        for i in range(len(tokens), 0, -1):
            if fold(" ".join(tokens[:i])).replace("-", " ") == sort_last.replace("-", " "):
                return " ".join(tokens[i:]), " ".join(tokens[:i])
    tokens = display.split()
    if len(tokens) == 1:
        return "", tokens[0]
    return " ".join(tokens[:-1]), tokens[-1]


def get_sections():
    data = api({"action": "parse", "page": SQUADS_PAGE, "prop": "sections"})
    groups = []  # (group_name, [(team_name, section_index), ...])
    current = None
    for s in data["parse"]["sections"]:
        line = s["line"].strip()
        if s["toclevel"] == 1:
            if re.fullmatch(r"Group [A-L]", line):
                current = (line, [])
                groups.append(current)
            else:
                current = None
        elif s["toclevel"] == 2 and current is not None:
            current[1].append((line, s["index"]))
    return groups


def parse_team(section_index):
    data = api({"action": "parse", "page": SQUADS_PAGE,
                "section": section_index, "prop": "text"})
    soup = BeautifulSoup(data["parse"]["text"], "lxml")
    players = []
    for row in soup.find_all("tr", class_="nat-fs-player"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 7:
            continue
        num_cell, pos_cell, name_cell, dob_cell, caps_cell, _goals, club_cell = cells[:7]

        pos_link = pos_cell.find("a")
        pos = POSITION_MAP.get(pos_link.get_text(strip=True) if pos_link else "", "MID")

        name_link = name_cell.find("a")
        display = (name_link or name_cell).get_text(" ", strip=True)
        wiki_title = None
        if name_link and name_link.get("href", "").startswith("/wiki/"):
            wiki_title = unquote(name_link["href"][len("/wiki/"):]).replace("_", " ")
        first, last = split_name(display, name_cell.get("data-sort-value", ""))

        bday = dob_cell.find("span", class_="bday")
        dob = bday.get_text(strip=True) if bday else None

        try:
            caps = int(caps_cell.get_text(strip=True))
        except ValueError:
            caps = 0

        club_links = club_cell.find_all("a")
        club = club_links[-1].get_text(strip=True) if club_links else club_cell.get_text(" ", strip=True)

        players.append({
            "name": display, "first": first, "last": last, "wiki_title": wiki_title,
            "position": pos, "dob": dob, "caps": caps, "club": club,
        })
    return players


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def _commons_thumb(filename: str, width: int = 600) -> str:
    """Build a Wikimedia Commons thumbnail URL from a bare filename."""
    import hashlib as _hl
    name = filename.replace(" ", "_")
    md5 = _hl.md5(name.encode()).hexdigest()
    ext = name.rsplit(".", 1)[-1].lower()
    # SVG/TIFF thumbnails are served as PNG
    thumb_name = f"{name}.png" if ext in ("svg", "tif", "tiff") else name
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb"
        f"/{md5[0]}/{md5[:2]}/{name}/{width}px-{thumb_name}"
    )


def fetch_photos_and_qids(titles):
    """Batched pageimages + wikidata QID lookup. Returns title -> (photo, qid)."""
    out = {}
    for batch in chunked(sorted(titles), 50):
        data = api({
            "action": "query", "titles": "|".join(batch), "redirects": "1",
            "prop": "pageimages|pageprops", "piprop": "thumbnail",
            "pithumbsize": "600", "ppprop": "wikibase_item",
        })
        redirect_map = {}
        for rd in data.get("query", {}).get("redirects", []):
            redirect_map[rd["to"]] = rd["from"]
        for norm in data.get("query", {}).get("normalized", []):
            redirect_map[norm["to"]] = norm["from"]
        for page in data.get("query", {}).get("pages", []):
            title = page.get("title", "")
            orig = redirect_map.get(title, title)
            photo = (page.get("thumbnail") or {}).get("source")
            qid = (page.get("pageprops") or {}).get("wikibase_item")
            out[orig] = (photo, qid)
            out[title] = (photo, qid)
        time.sleep(0.2)
    return out


def fetch_body_stats(qids):
    """Wikidata SPARQL: height, mass, and P18 portrait image per QID."""
    out = {}  # qid -> (height_cm, weight_kg, photo_url)
    for batch in chunked(sorted(qids), 200):
        values = " ".join(f"wd:{q}" for q in batch)
        query = f"""
        SELECT ?item ?height ?mass ?image WHERE {{
          VALUES ?item {{ {values} }}
          OPTIONAL {{ ?item wdt:P2048 ?height. }}
          OPTIONAL {{ ?item wdt:P2067 ?mass. }}
          OPTIONAL {{ ?item wdt:P18 ?image. }}
        }}"""
        try:
            r = session.get(SPARQL_API, params={"query": query, "format": "json"}, timeout=60)
            r.raise_for_status()
            for b in r.json()["results"]["bindings"]:
                qid = b["item"]["value"].rsplit("/", 1)[-1]
                h = b.get("height", {}).get("value")
                m = b.get("mass", {}).get("value")
                img_url = b.get("image", {}).get("value", "")
                height_cm = weight_kg = None
                photo = None
                if h:
                    hv = float(h)
                    height_cm = round(hv * 100) if hv < 3 else round(hv)
                if m:
                    weight_kg = round(float(m))
                if img_url:
                    # img_url is like http://commons.wikimedia.org/wiki/Special:FilePath/Name.jpg
                    filename = unquote(img_url.rsplit("/", 1)[-1])
                    photo = _commons_thumb(filename, 600)
                prev = out.get(qid, (None, None, None))
                out[qid] = (
                    height_cm or prev[0],
                    weight_kg or prev[1],
                    photo or prev[2],
                )
        except Exception as e:
            print(f"  sparql batch failed (skipping): {e}", file=sys.stderr)
        time.sleep(0.5)
    return out


def search_wiki_photo(name: str) -> str | None:
    """Fallback: search Wikipedia for a player by name and grab their pageimage."""
    data = api({
        "action": "query", "list": "search", "srsearch": name,
        "srlimit": "1", "srnamespace": "0",
    })
    results = (data.get("query") or {}).get("search", [])
    if not results:
        return None
    title = results[0]["title"]
    data2 = api({
        "action": "query", "titles": title,
        "prop": "pageimages", "piprop": "thumbnail", "pithumbsize": "600",
    })
    for page in (data2.get("query") or {}).get("pages", []):
        return (page.get("thumbnail") or {}).get("source")
    return None


def rarity_for(player):
    if player["name"] in LEGENDS:
        return "legend"
    if player["caps"] >= 50:
        return "rare"
    return "common"


def main():
    print("fetching section list…")
    groups = get_sections()
    n_teams = sum(len(g[1]) for g in groups)
    print(f"found {len(groups)} groups, {n_teams} teams")

    teams = []  # (group, team, players)
    for group_name, team_list in groups:
        for team_name, idx in team_list:
            print(f"  scraping {team_name} ({group_name})…")
            players = parse_team(idx)
            if not players:
                print(f"    WARNING: no players parsed for {team_name}", file=sys.stderr)
            teams.append((group_name, team_name, players))
            time.sleep(0.3)

    all_titles = {p["wiki_title"] for _, _, ps in teams for p in ps if p["wiki_title"]}
    print(f"fetching photos + QIDs for {len(all_titles)} players…")
    meta = fetch_photos_and_qids(all_titles)

    qids = {q for (_, q) in meta.values() if q}
    print(f"fetching height/weight/portraits for {len(qids)} wikidata items…")
    stats = fetch_body_stats(qids)  # qid -> (height_cm, weight_kg, p18_photo)

    stickers = []
    num = 1

    stickers.append({
        "sticker_number": num, "player_name": "", "player_lastname": "FIFA World Cup Trophy",
        "team": "Special", "team_color": "#C9A227", "group_name": "", "rarity": "legend",
        "is_special": True, "position": "", "club": "", "photo_url": "",
        "dob": None, "height_cm": None, "weight_kg": None, "team_code": "",
    })
    num += 1

    for city in HOST_CITIES:
        stickers.append({
            "sticker_number": num, "player_name": "Host City", "player_lastname": city,
            "team": "Host Cities", "team_color": "#1A3C6E", "group_name": "", "rarity": "common",
            "is_special": True, "position": "", "club": "", "photo_url": "",
            "dob": None, "height_cm": None, "weight_kg": None, "team_code": "",
        })
        num += 1

    for group_name, team_name, players in teams:
        color = TEAM_COLORS.get(team_name, "#1A3C6E")
        code = TEAM_CODES.get(team_name, "")
        stickers.append({
            "sticker_number": num, "player_name": "WE ARE", "player_lastname": team_name.upper(),
            "team": team_name, "team_color": color, "group_name": group_name,
            "rarity": "common", "is_special": True, "position": "", "club": "",
            "photo_url": "", "dob": None, "height_cm": None, "weight_kg": None,
            "team_code": code,
        })
        num += 1
        for p in players:
            wiki_photo, qid = meta.get(p["wiki_title"], (None, None)) if p["wiki_title"] else (None, None)
            h, w, p18_photo = stats.get(qid, (None, None, None)) if qid else (None, None, None)
            # Prefer P18 Wikidata portrait; fall back to Wikipedia pageimage
            photo = p18_photo or wiki_photo
            # Last resort: search Wikipedia by full name if no photo found
            if not photo and p["wiki_title"]:
                full_name = f"{p['first']} {p['last']}"
                photo = search_wiki_photo(full_name)
                if photo:
                    print(f"    found via search: {full_name}")
            stickers.append({
                "sticker_number": num,
                "player_name": p["first"], "player_lastname": p["last"],
                "position": p["position"], "team": team_name, "team_color": color,
                "group_name": group_name, "dob": p["dob"],
                "height_cm": h, "weight_kg": w, "club": p["club"],
                "photo_url": photo or "", "rarity": rarity_for(p),
                "is_special": False, "team_code": code,
            })
            num += 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(stickers, ensure_ascii=False, indent=1))
    n_photos = sum(1 for s in stickers if s["photo_url"] and not s["is_special"])
    n_players = sum(1 for s in stickers if not s["is_special"])
    n_legend = sum(1 for s in stickers if s["rarity"] == "legend" and not s["is_special"])
    n_rare = sum(1 for s in stickers if s["rarity"] == "rare")
    print(f"wrote {len(stickers)} stickers to {OUT_PATH}")
    print(f"  photos: {n_photos}/{n_players} ({100*n_photos//max(n_players,1)}%), legends: {n_legend}, rares: {n_rare}")


if __name__ == "__main__":
    main()
