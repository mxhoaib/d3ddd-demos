#!/usr/bin/env python3
"""Regenerate data.json for the D3DDD demos hub.

Usage (from repo root):  python3 scripts/build_data.py
Inputs: scripts/sites.csv (slug, group, country, area, name, category, trades)
        + each site folder (title, description, page count) + git history (dates).
"""
import csv, html, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://mxhoaib.github.io/d3ddd-demos/"
GROUPS = [
    {"id": "canada-themes", "title": "Canada themes", "short": "CA themes", "kind": "theme", "accent": "purple"},
    {"id": "uae-themes", "title": "UAE themes", "short": "UAE themes", "kind": "theme", "accent": "yellow"},
    {"id": "batch1", "title": "Trade demos: Batch 1", "short": "Batch 1", "kind": "demo", "accent": "teal"},
    {"id": "batch2", "title": "Trade demos: Batch 2", "short": "Batch 2", "kind": "demo", "accent": "pink"},
]


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def meta(path, name):
    m = re.search(r'<meta name="%s" content="([^"]*)"' % name, open(path, encoding="utf-8").read())
    return html.unescape(m.group(1)) if m else ""


def main():
    sites = []
    for r in csv.DictReader(open(os.path.join(ROOT, "scripts", "sites.csv"), encoding="utf-8")):
        slug = r["slug"]
        folder = os.path.join(ROOT, slug)
        index = os.path.join(folder, "index.html")
        raw = open(index, encoding="utf-8").read()
        title = html.unescape(re.search(r"<title>([^<]*)</title>", raw).group(1))
        pages = sorted(
            os.path.relpath(os.path.join(dp, f), folder)
            for dp, _, fs in os.walk(folder) for f in fs if f.endswith(".html")
        )
        dates = git("log", "--format=%aI", "--", slug).splitlines()
        added = git("log", "--diff-filter=A", "--format=%aI", "--", slug + "/index.html").splitlines()
        group = next(g for g in GROUPS if g["id"] == r["group"])
        trades = [t for t in r["trades"].split(";") if t]
        tags = ["Web"] + (["3D"] if group["kind"] == "theme" else []) + trades
        sites.append({
            "slug": slug,
            "url": slug + "/",
            "live": BASE + slug + "/",
            "group": r["group"],
            "kind": group["kind"],
            "name": r["name"],
            "category": r["category"] or trades[0],
            "trade": trades[0],
            "tags": tags,
            "country": r["country"],
            "area": r["area"],
            "pageTitle": title,
            "description": meta(index, "description"),
            "pages": len(pages),
            "commits": len(dates),
            "published": (added[-1] if added else dates[-1]),
            "updated": dates[0],
            "history": dates,
            "thumb": "assets/thumbs/" + slug.replace("/", "-") + ".webp",
            "status": "Live",
        })
    out = {
        "generated_from": "scripts/build_data.py (git log + site folders)",
        "base": BASE,
        "groups": GROUPS,
        "sites": sites,
    }
    with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("wrote data.json with", len(sites), "sites")


if __name__ == "__main__":
    main()
