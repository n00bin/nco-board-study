#!/usr/bin/env python3
"""Refresh data/cutoffs.json with this month's SGT/SSG promotion point cutoff scores.

Source: mosroadmap.com's public cutoff table, which it builds from the HQDA "Promotion Point
Cutoff Scores (COS)" memo (AHRC-PDV-PE). robots.txt allows this path. We fetch two small files
once a day, credit the source in the app, and never overwrite good data with bad.

Exit codes: 0 = no change or updated; 1 = the source looked wrong (the GitHub job fails, which
emails the repo owner, and the app keeps the last good month).
Standard library only, so the GitHub job needs no installs.
"""
import json, re, sys, datetime, pathlib, urllib.request

BASE = "https://mosroadmap.com"
PAGE = BASE + "/army-promotion-cutoff-scores/"
FILES = {"ac": BASE + "/js/cutoff_data.js", "agr": BASE + "/js/AGRcutoff_data.js"}
UA = "NCOBoardStudy-cutoff-updater/1.0 (+https://n00bin.github.io/nco-board-study/; once a day)"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "cutoffs.json"
MONTHS = "January February March April May June July August September October November December".split()


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            raise RuntimeError("HTTP %s for %s" % (r.status, url))
        return r.read().decode("utf-8", "replace")


def parse_table(js, label):
    m = re.search(r"=\s*(\[.*\])\s*;?\s*$", js.strip(), re.S)
    if not m:
        raise ValueError(label + ": no data array found")
    rows = json.loads(m.group(1))
    out = {}
    for r in rows:
        mos = str(r.get("mos", "")).strip().upper()
        if not re.fullmatch(r"[0-9]{2}[A-Z0-9]", mos):
            continue
        pair = []
        for k in ("sgtCutoff", "ssgCutoff"):
            v = r.get(k)
            pair.append(v if isinstance(v, int) and 24 <= v <= 798 else None)   # None = not listed for that rank
        out[mos] = pair
    return out


def main():
    page = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", get(PAGE)))
    cyc = re.search(r"(%s) (20\d\d) promotion cycle" % "|".join(MONTHS), page)
    upd = re.search(r"Last updated (%s) (\d{1,2}), (20\d\d)" % "|".join(MONTHS), page)
    if not cyc:
        sys.exit("Could not find the promotion cycle month on the source page")
    data = {k: parse_table(get(u), k) for k, u in FILES.items()}

    # sanity checks: refuse to publish anything that looks broken
    if len(data["ac"]) < 100:
        sys.exit("Only %d Active Duty MOS rows (expected 100+); not updating" % len(data["ac"]))
    filled = sum(1 for v in data["ac"].values() if v[0] or v[1])
    if filled < 0.8 * len(data["ac"]):
        sys.exit("Too many empty Active Duty rows; not updating")

    doc = {
        "cycle": "%s %s" % (cyc.group(1), cyc.group(2)),
        "updated": ("%s-%02d-%02d" % (upd.group(3), MONTHS.index(upd.group(1)) + 1, int(upd.group(2)))) if upd else None,
        "source": "HQDA Promotion Point Cutoff Scores memo, via mosroadmap.com",
        "sourceUrl": PAGE,
        "note": "Unofficial copy. 798 = closed (no one promoted); 24 = everyone eligible was promoted. Confirm with your S1 or IPPS-A.",
        "ac": dict(sorted(data["ac"].items())),
        "agr": dict(sorted(data["agr"].items())),
    }
    old = None
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except ValueError:
            old = None
    same = old and all(old.get(k) == doc[k] for k in ("cycle", "updated", "ac", "agr"))
    if same:
        print("No change (%s)" % doc["cycle"])
        return
    doc["fetched"] = datetime.date.today().isoformat()
    OUT.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated cutoffs: %s, %d AC + %d AGR MOS" % (doc["cycle"], len(doc["ac"]), len(doc["agr"])))


if __name__ == "__main__":
    main()
