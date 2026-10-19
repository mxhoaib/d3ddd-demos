#!/usr/bin/env python3
"""Fetch anonymous, aggregate view stats from GoatCounter and write views.json.

Usage (from the repo root, on the box only):
    python3 scripts/fetch_views.py

The API key is read from a private file outside the repo
(default /workspace/company/secure/goatcounter_api.txt, override with the
GC_KEY_FILE environment variable). The key is never printed or written to
views.json. Without a key the script writes an empty "no data yet" views.json.

views.json holds aggregates only: totals, daily views, views per demo, grouped
sources, countries, device sizes, browsers and systems. No IPs, no user agents,
no full referrer URLs, no personal data.
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://d3dddsites.goatcounter.com"
API = SITE + "/api/v0"
KEY_FILE = os.environ.get("GC_KEY_FILE", "/workspace/company/secure/goatcounter_api.txt")
BASE_PATH = "/d3ddd-demos/"
DAYS = 30
OUT = os.path.join(ROOT, "views.json")
SOURCES = ["Google", "Bing", "Email", "Fiverr", "LinkedIn", "Facebook", "Direct", "Other"]


def read_key():
    try:
        with open(KEY_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                m = re.match(r"^(?:api[_-]?key|key|token)\s*[:=]\s*(\S+)$", line, re.I)
                return m.group(1) if m else line
    except FileNotFoundError:
        return None
    return None


class Api:
    def __init__(self, key):
        self.key = key

    def get(self, path, **params):
        q = urllib.parse.urlencode(params, doseq=True)
        req = urllib.request.Request(API + path + ("?" + q if q else ""), headers={
            "Authorization": "Bearer " + self.key, "Content-Type": "application/json",
            "User-Agent": "d3ddd-demos-fetch-views/1.0"})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 4:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                # Never echo request headers; the body is GoatCounter's error text.
                raise RuntimeError("GoatCounter API %s returned HTTP %d" % (path, e.code)) from None
        raise RuntimeError("GoatCounter API %s: rate limited" % path)

    def stats(self, page, rng, limit=100):
        out, offset = [], 0
        while True:
            d = self.get("/stats/" + page, limit=limit, offset=offset, **rng)
            out += d.get("stats") or []
            if not d.get("more") or offset > 1000:
                return out
            offset += limit
            time.sleep(0.3)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:00:00Z")


def group_source(name, scheme=""):
    n = (name or "").strip().lower()
    if not n or n in ("(no data)", "(unknown)", "direct") or "mxhoaib.github.io" in n:
        return "Direct"   # no referrer, or navigation inside the hub itself
    if "mail" in n or "outlook" in n or n in ("email", "e-mail", "newsletter") or "proton.me" in n:
        return "Email"
    if "google" in n:
        return "Google"
    if "bing" in n:
        return "Bing"
    if "fiverr" in n:
        return "Fiverr"
    if "linkedin" in n or "lnkd.in" in n:
        return "LinkedIn"
    if "facebook" in n or n in ("fb", "fb.com", "fb.me", "m.me") or "messenger" in n:
        return "Facebook"
    return "Other"


def group_size(item):
    k = (item.get("id") or item.get("name") or "").lower()
    if "phone" in k:
        return "Mobile"
    if "tablet" in k:
        return "Tablet"
    if "desktop" in k or "monitor" in k or "computer" in k:
        return "Desktop"
    return "Unknown"


def top(pairs, n, other="Other"):
    pairs = sorted(((k, v) for k, v in pairs.items() if v), key=lambda x: (-x[1], x[0]))
    head, rest = pairs[:n], sum(v for _, v in pairs[n:])
    out = [{"name": k, "views": v} for k, v in head]
    if rest:
        for o in out:
            if o["name"] == other:
                o["views"] += rest
                break
        else:
            out.append({"name": other, "views": rest})
    return out


def load_sites():
    with open(os.path.join(ROOT, "data.json"), encoding="utf-8") as f:
        return json.load(f)["sites"]


def match_slug(path, slugs):
    p = path.split("?")[0].split("#")[0]
    if p.startswith(BASE_PATH):
        p = p[len(BASE_PATH):]
    elif p.startswith("/"):
        p = p[1:]
    if p in ("", "index.html"):
        return "__hub__"
    for s in slugs:  # longest first, so uae/trading wins over trading
        if p == s or p.startswith(s + "/"):
            return s
    return None


def empty(status, message, now, start):
    return {
        "status": status, "message": message, "source": "GoatCounter (anonymous, aggregate)",
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "range": {"start": start.strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "days": DAYS},
        "totals": {"views": 0, "visitors": 0, "hub": 0, "unmatched": 0},
        "daily": [{"day": (start + dt.timedelta(days=i)).strftime("%Y-%m-%d"), "views": 0} for i in range(DAYS + 1)],
        "demos": [], "sources": [], "countries": [], "devices": [], "browsers": [], "systems": [],
    }


def write(data, key=None):
    text = json.dumps(data, ensure_ascii=False, indent=1)
    if key and key in text:
        sys.exit("refusing to write views.json: it would contain the API key")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text + "\n")


def main():
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    start = (now - dt.timedelta(days=DAYS)).replace(minute=0, second=0)
    end = (now + dt.timedelta(hours=1)).replace(minute=0, second=0)
    key = read_key()
    if not key:
        write(empty("no_data", "No data yet", now, start))
        print("no API key in %s: wrote empty views.json (No data yet)" % KEY_FILE)
        return 0

    api = Api(key)
    rng = {"start": iso(start), "end": iso(end)}
    try:
        total = api.get("/stats/total", **rng)
        hits, excl = [], []
        while True:
            params = dict(rng, limit=100)
            if excl:
                params["exclude_paths"] = excl
            d = api.get("/stats/hits", **params)
            batch = d.get("hits") or []
            hits += batch
            if not d.get("more") or not batch or len(hits) > 2000:
                break
            excl += [h["path_id"] for h in batch]
            time.sleep(0.3)
        refs = api.stats("toprefs", rng)
        locs = api.stats("locations", rng)
        browsers = api.stats("browsers", rng)
        systems = api.stats("systems", rng)
        sizes = api.stats("sizes", rng)
    except (RuntimeError, urllib.error.URLError, OSError, ValueError) as e:
        msg = str(e)
        if os.path.exists(OUT):
            print("fetch failed (%s); kept the existing views.json" % msg, file=sys.stderr)
        else:
            write(empty("no_data", "No data yet", now, start))
            print("fetch failed (%s); wrote empty views.json" % msg, file=sys.stderr)
        return 1

    # daily views (site total, UTC days)
    daily = {}
    for s in total.get("stats") or []:
        day = (s.get("day") or "")[:10]
        if day:
            daily[day] = daily.get(day, 0) + int(s.get("daily") or 0)
    days = [(start + dt.timedelta(days=i)).strftime("%Y-%m-%d") for i in range(DAYS + 1)]

    # per path -> per demo card
    sites = load_sites()
    slugs = sorted((s["slug"] for s in sites), key=len, reverse=True)
    per, hub, unmatched, views_sum, uniq_sum = {}, 0, 0, 0, 0
    for h in hits:
        if h.get("event"):
            continue
        n = int(h.get("count") or 0)
        views_sum += n
        uniq_sum += int(h.get("count_unique") or 0)
        s = match_slug(h.get("path") or "", slugs)
        if s == "__hub__":
            hub += n
        elif s:
            per[s] = per.get(s, 0) + n
        else:
            unmatched += n
    names = {s["slug"]: s["name"] for s in sites}
    demos = [{"slug": k, "name": names[k], "views": v} for k, v in sorted(per.items(), key=lambda x: (-x[1], x[0]))]

    src = {}
    for r in refs:
        g = group_source(r.get("name"), r.get("ref_scheme"))
        src[g] = src.get(g, 0) + int(r.get("count") or 0)
    visitors = int(total.get("total") or 0) - int(total.get("total_events") or 0)
    views = views_sum or sum(daily.values())
    known = sum(src.values())
    if visitors > known:  # visits GoatCounter recorded with no referrer at all
        src["Direct"] = src.get("Direct", 0) + visitors - known
    sources = [{"name": k, "views": src[k]} for k in SOURCES if src.get(k)]
    sources.sort(key=lambda x: -x["views"])

    countries = [{"code": (c.get("id") or "")[:2].upper(), "name": c.get("name") or "Unknown",
                  "views": int(c.get("count") or 0)} for c in locs if int(c.get("count") or 0)]
    countries.sort(key=lambda x: -x["views"])
    if len(countries) > 12:
        rest = sum(c["views"] for c in countries[12:])
        countries = countries[:12] + [{"code": "", "name": "Other", "views": rest}]

    dev = {}
    for z in sizes:
        g = group_size(z)
        dev[g] = dev.get(g, 0) + int(z.get("count") or 0)

    data = empty("ok", "", now, start)
    data.update({
        "totals": {"views": views, "visitors": uniq_sum or visitors or views, "hub": hub, "unmatched": unmatched},
        "daily": [{"day": d, "views": daily.get(d, 0)} for d in days],
        "demos": demos,
        "sources": sources,
        "countries": countries,
        "devices": [{"name": k, "views": dev[k]} for k in ("Desktop", "Mobile", "Tablet", "Unknown") if dev.get(k)],
        "browsers": top({b.get("name") or "Unknown": int(b.get("count") or 0) for b in browsers}, 7),
        "systems": top({s.get("name") or "Unknown": int(s.get("count") or 0) for s in systems}, 7),
    })
    if not views:
        data["status"], data["message"] = "no_data", "No data yet"
    write(data, key)
    print("wrote views.json: %d views, %d visitors, %d demos with views (%s to %s)" % (
        data["totals"]["views"], data["totals"]["visitors"], len(demos), data["range"]["start"], data["range"]["end"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
