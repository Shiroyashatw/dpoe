#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build poe_affix_tiers.csv from poedb/poe2db ModsView JSON on item-class pages."""
from __future__ import annotations

import csv
import html as htmllib
import json
import re
from collections import defaultdict
from pathlib import Path

OUT_DIR = Path("/workspace/poe_affixes_2026-11-18")
CSV_PATH = OUT_DIR / "poe_affix_tiers.csv"

POE1_VERSION = "3.30.0c"
POE2_VERSION = "0.5.5h"

# Sources used to collect ModsView `normal` explicit mods.
SOURCE_DIRS = [
    (Path("/tmp/poe_affixes/poedb/items"), "PoE1", "https://poedb.tw/us"),
    (Path("/tmp/poe_tiers/armour"), "AUTO", "AUTO"),  # mixed poedb/poe2db prefixes
    (Path("/tmp/poe_tiers/poe1class"), "AUTO", "AUTO"),
    (Path("/tmp/poe_affixes/poe2db/items"), "PoE2", "https://poe2db.tw/us"),
]

# Skip non-equipment / pages without the requested explicit gear mods.
SKIP_STEMS = {
    "Abyss_Jewels", "Jewels", "Body_Armours", "Boots", "Gloves", "Helmets", "Shields",
    # generic unsplits lack ModsView; splits are kept. Also skip 404 empties later.
}

# Canonical slot order for merged "slots" cell.
SLOT_ORDER = [
    "Claws", "Daggers", "Rune Daggers", "Wands", "Sceptres",
    "One Hand Swords", "Thrusting One Hand Swords", "One Hand Axes", "One Hand Maces",
    "Spears", "Flails",
    "Bows", "Crossbows", "Quarterstaves", "Staves", "Warstaves",
    "Two Hand Swords", "Two Hand Axes", "Two Hand Maces",
    "Body Armours", "Helmets", "Gloves", "Boots", "Shields", "Bucklers", "Foci",
    "Quivers", "Amulets", "Rings", "Belts", "Charms",
]

WEAPON_SLOTS = {
    "Claws", "Daggers", "Rune Daggers", "Wands", "Sceptres",
    "One Hand Swords", "Thrusting One Hand Swords", "One Hand Axes", "One Hand Maces",
    "Spears", "Flails",
    "Bows", "Crossbows", "Quarterstaves", "Staves", "Warstaves",
    "Two Hand Swords", "Two Hand Axes", "Two Hand Maces",
}

# Exact text matchers after normalize_text(). Each returns a display mod name or None.
# Hybrids / "while" / "per" / "Global" / "with Bows" are excluded by anchoring to full string.

NUM = r"\d+(?:\.\d+)?"
RANGE = rf"(?:{NUM}-{NUM}|{NUM})"
# Optional parens around a number or range; optional leading +
VAL = rf"\+?(?:\({RANGE}\)|{RANGE})"

PURE_PATTERNS = [
    # (mod_name, regex, kind)  kind: flat | pct | adds | weapon_adds
    ("maximum Life", re.compile(rf"^{VAL} to maximum Life$"), "flat"),
    ("maximum Mana", re.compile(rf"^{VAL} to maximum Mana$"), "flat"),
    ("Fire Resistance", re.compile(rf"^{VAL}% to Fire Resistance$"), "pct"),
    ("Cold Resistance", re.compile(rf"^{VAL}% to Cold Resistance$"), "pct"),
    ("Lightning Resistance", re.compile(rf"^{VAL}% to Lightning Resistance$"), "pct"),
    ("Chaos Resistance", re.compile(rf"^{VAL}% to Chaos Resistance$"), "pct"),
    ("Strength", re.compile(rf"^{VAL} to Strength$"), "flat"),
    ("Dexterity", re.compile(rf"^{VAL} to Dexterity$"), "flat"),
    ("Intelligence", re.compile(rf"^{VAL} to Intelligence$"), "flat"),
    ("Adds # to # Physical Damage", re.compile(rf"^Adds .+ Physical Damage$"), "weapon_adds"),
    ("Adds # to # Fire Damage", re.compile(rf"^Adds .+ Fire Damage$"), "weapon_adds"),
    ("% increased Physical Damage", re.compile(rf"^{VAL}% increased Physical Damage$"), "pct"),
    ("Attack Speed", re.compile(rf"^{VAL}% increased Attack Speed$"), "pct"),
    ("Critical Strike Chance", re.compile(rf"^{VAL}% increased Critical Strike Chance$"), "pct"),
    ("Global Critical Strike Chance", re.compile(rf"^{VAL}% increased Global Critical Strike Chance$"), "pct"),
    ("% increased Critical Hit Chance", re.compile(rf"^{VAL}% increased Critical Hit Chance$"), "pct"),
    ("+% to Critical Hit Chance", re.compile(rf"^{VAL}% to Critical Hit Chance$"), "pct"),
    ("Armour", re.compile(rf"^{VAL} to Armour$"), "flat"),
    ("% increased Armour", re.compile(rf"^{VAL}% increased Armour$"), "pct"),
    ("Movement Speed", re.compile(rf"^{VAL}% increased Movement Speed$"), "pct"),
    ("% increased Spell Damage", re.compile(rf"^{VAL}% increased Spell Damage$"), "pct"),
]


def extract_modsview(html: str):
    fn = "new ModsView("
    idx = html.find(fn)
    if idx < 0:
        return None
    start = idx + len(fn)
    depth = 1
    i = start
    in_str = False
    esc = False
    quote = None
    while i < len(html) and depth > 0:
        ch = html[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                in_str = False
        else:
            if ch in "\"'":
                in_str = True
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
        i += 1
    try:
        return json.loads(html[start : i - 1])
    except Exception:
        return None


def clean_html_text(s: str) -> str:
    s = htmllib.unescape(s or "")
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_text(s: str) -> str:
    s = clean_html_text(s)
    s = s.replace("—", "-").replace("–", "-")
    s = re.sub(r"\s*-\s*", "-", s)
    s = s.replace("+(", "+(")  # noop, keep
    # "+(10-19)to" already spaced by clean; ensure space after ) if missing already handled
    return s


def parse_min_max(text: str, kind: str):
    """Return (min, max) strings. For adds, min is low range, max is high range."""
    t = normalize_text(text)
    if kind == "weapon_adds" or t.startswith("Adds "):
        # Adds (5-7) to (11-13) X
        m = re.search(r"Adds \(([^)]+)\) to \(([^)]+)\)", t)
        if m:
            return m.group(1).replace(" ", ""), m.group(2).replace(" ", "")
        m = re.search(r"Adds (\d+(?:\.\d+)?) to \(([^)]+)\)", t)
        if m:
            return m.group(1), m.group(2).replace(" ", "")
        m = re.search(r"Adds \(([^)]+)\) to (\d+(?:\.\d+)?)", t)
        if m:
            return m.group(1).replace(" ", ""), m.group(2)
        m = re.search(r"Adds (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)", t)
        if m:
            return m.group(1), m.group(2)
        return "沒找到", "沒找到"
    # Prefer parenthesized range
    m = re.search(r"\(([^)]+)\)", t)
    if m:
        inner = m.group(1).replace(" ", "")
        if "-" in inner:
            a, b = inner.split("-", 1)
            return a, b
        return inner, inner
    m = re.search(rf"({NUM})", t)
    if m:
        return m.group(1), m.group(1)
    return "沒找到", "沒找到"


def classify(text: str):
    t = normalize_text(text)
    # Match exact requested patterns first (includes Global Critical Strike Chance).
    for name, rx, kind in PURE_PATTERNS:
        if rx.match(t):
            if kind == "weapon_adds":
                if not re.match(rf"^Adds .+ to .+ (Physical|Fire) Damage$", t):
                    return None
                if " to Attacks" in t or " to Spells" in t or " to Weapon" in t:
                    return None
            return name, kind
    return None


def stem_to_slot(stem: str) -> tuple[str, str | None]:
    """Return (slot_base, armour_attr or None)."""
    s = stem
    for prefix in ("poedb.tw_", "poe2db.tw_"):
        if s.startswith(prefix):
            s = s[len(prefix):]
    attr = None
    for suf in ("_str_dex_int", "_str_dex", "_str_int", "_dex_int", "_str", "_dex", "_int"):
        if s.endswith(suf):
            attr = suf[1:].replace("_", "+")
            s = s[: -len(suf)]
            break
    slot = s.replace("_", " ")
    return slot, attr


def pretty_slot(slot: str, attr: str | None) -> str:
    if attr:
        return f"{slot} ({attr})"
    return slot


def game_and_url_from_path(path: Path, declared_game: str, declared_base: str):
    name = path.name
    stem = path.stem
    if name.startswith("poe2db.tw_") or declared_game == "PoE2" and not name.startswith("poedb.tw_"):
        if name.startswith("poe2db.tw_"):
            stem = stem[len("poe2db.tw_"):]
        return "PoE2", f"https://poe2db.tw/us/{stem}"
    if name.startswith("poedb.tw_") or declared_game == "PoE1":
        if name.startswith("poedb.tw_"):
            stem = stem[len("poedb.tw_"):]
        return "PoE1", f"https://poedb.tw/us/{stem}"
    # AUTO fallback
    if "poe2db" in str(path):
        return "PoE2", f"https://poe2db.tw/us/{stem}"
    return "PoE1", f"https://poedb.tw/us/{stem}"


def collect_files():
    files = []
    seen = set()
    for folder, game, base in SOURCE_DIRS:
        if not folder.exists():
            continue
        for p in sorted(folder.glob("*.html")):
            rp = str(p.resolve())
            if rp in seen:
                continue
            if p.stat().st_size < 1000:
                continue
            stem_raw = p.stem
            for prefix in ("poedb.tw_", "poe2db.tw_"):
                if stem_raw.startswith(prefix):
                    stem_raw = stem_raw[len(prefix):]
                    break
            # Skip generic unsplits that typically lack ModsView (still try if file has it
            # except Body_Armours.html etc. without suffix — those don't have MV).
            files.append((p, game, base))
            seen.add(rp)
    return files


def iter_mods():
    """Yield dicts for each matching explicit normal mod on each page."""
    for path, declared_game, declared_base in collect_files():
        html = path.read_text(encoding="utf-8", errors="replace")
        if "new ModsView(" not in html:
            continue
        data = extract_modsview(html)
        if not data:
            continue
        game, url = game_and_url_from_path(path, declared_game, declared_base)
        stem = path.stem
        for prefix in ("poedb.tw_", "poe2db.tw_"):
            if stem.startswith(prefix):
                stem = stem[len(prefix):]
                break
        if stem in SKIP_STEMS:
            continue
        slot, attr = stem_to_slot(path.stem)
        slot_label = pretty_slot(slot, attr)
        for m in data.get("normal") or []:
            gentype = str(m.get("ModGenerationTypeID") or "")
            if gentype not in ("1", "2"):
                continue
            raw = m.get("str") or ""
            text = normalize_text(raw)
            classified = classify(text)
            if not classified:
                continue
            mod_name, kind = classified
            # Movement Speed: boots only (task)
            if mod_name == "Movement Speed" and not slot.startswith("Boots"):
                continue
            # Weapon-only added damage / % phys: restrict to weapon slots
            if mod_name in ("Adds # to # Physical Damage", "Adds # to # Fire Damage", "% increased Physical Damage"):
                if slot not in WEAPON_SLOTS:
                    continue
            family = (m.get("ModFamilyList") or [""])[0]
            mn, mx = parse_min_max(text, kind)
            ilvl = int(m.get("Level") or 0)
            yield {
                "game": game,
                "mod": mod_name,
                "affix_type": "prefix" if gentype == "1" else "suffix",
                "slot": slot,
                "slot_label": slot_label,
                "attr": attr,
                "family": family,
                "tier_group": (game, family, gentype, mod_name),
                "ilvl": ilvl,
                "min": mn,
                "max": mx,
                "name": m.get("Name") or "",
                "source_url": url,
                "version": POE1_VERSION if game == "PoE1" else POE2_VERSION,
                "text": text,
            }


def slot_sort_key(label: str):
    # strip attr
    base = re.sub(r" \([^)]+\)$", "", label)
    try:
        i = SLOT_ORDER.index(base)
    except ValueError:
        i = 999
    return (i, label)


def merge_armour_attrs(labels: list[str]) -> list[str]:
    """If all defence-type splits of a slot are present with same ladder, collapse to bare slot.

    We only collapse when grouping already requires identical ladders; this function is used
    after grouping, so if Body Armours (str) and (dex) are in the same group they matched.
    Collapse a slot when every label for that slot in the group has an attr, OR when a bare
    label already exists. If only some attrs are in the group, keep the attr labels (different
    types may have been split into other groups).
    """
    by_base = defaultdict(list)
    for lb in labels:
        m = re.match(r"^(.*) \(([^)]+)\)$", lb)
        if m:
            by_base[m.group(1)].append(lb)
        else:
            by_base[lb].append(lb)
    out = []
    for base, items in by_base.items():
        attrs = [x for x in items if x != base]
        bares = [x for x in items if x == base]
        if bares:
            out.append(base)
        elif attrs:
            # same ladder on every attr variant that could roll this mod: collapse
            out.append(base)
        else:
            out.extend(items)
    return out


def build_rows():
    recs = list(iter_mods())
    # Group slots that share the same value ladder (ilvl, min, max) for the same
    # game/mod/affix/family. Tier numbers are then assigned locally: T1 = highest
    # ilvl in that slot-group ladder (same formula as poedb/poe2db ModsView on a
    # single item-class page). Official PoE1 Advanced Mod Descriptions instead
    # number across all base types; that difference is documented in the summary.
    by_slot = defaultdict(list)
    for r in recs:
        by_slot[(r["game"], r["mod"], r["affix_type"], r["family"], r["slot_label"], r["source_url"])].append(r)

    buckets = defaultdict(list)  # sig -> list of (slot_label, url, recs)
    for key, items in by_slot.items():
        game, mod, affix, family, slot_label, url = key
        sig_rows = tuple(sorted({(it["ilvl"], it["min"], it["max"]) for it in items}))
        sig = (game, mod, affix, family, sig_rows)
        buckets[sig].append((slot_label, url, items))

    out_rows = []
    for sig, slot_entries in buckets.items():
        game, mod, affix, family, sig_rows = sig
        labels = [s[0] for s in slot_entries]
        labels = merge_armour_attrs(labels)
        labels = sorted(set(labels), key=slot_sort_key)
        slots_cell = ", ".join(labels)
        # representative URL: first in slot order
        url_by_label = {s[0]: s[1] for s in slot_entries}
        # after collapse, may not have exact label; pick any url from entries, prefer first canonical
        labels_sorted_entries = sorted(slot_entries, key=lambda x: slot_sort_key(x[0]))
        url = labels_sorted_entries[0][1]
        version = labels_sorted_entries[0][2][0]["version"]
        # Local T1 = highest ilvl in this shared ladder
        ilvl_order = sorted({il for il, mn, mx in sig_rows}, reverse=True)
        tier_of = {il: i for i, il in enumerate(ilvl_order, start=1)}
        for ilvl, mn, mx in sorted(sig_rows, key=lambda x: tier_of[x[0]]):
            out_rows.append({
                "game": game,
                "mod": mod,
                "affix_type": affix,
                "slots": slots_cell,
                "tier": str(tier_of[ilvl]),
                "ilvl": str(ilvl),
                "min": mn,
                "max": mx,
                "source_url": url,
                "version": version,
            })
    # sort: game, mod, slots, tier
    mod_order = [
        "maximum Life", "maximum Mana",
        "Fire Resistance", "Cold Resistance", "Lightning Resistance", "Chaos Resistance",
        "Strength", "Dexterity", "Intelligence",
        "Adds # to # Physical Damage", "Adds # to # Fire Damage",
        "% increased Physical Damage", "Attack Speed",
        "Critical Strike Chance", "Global Critical Strike Chance", "% increased Critical Hit Chance", "+% to Critical Hit Chance",
        "Armour", "% increased Armour", "Movement Speed", "% increased Spell Damage",
    ]

    def row_key(r):
        try:
            mi = mod_order.index(r["mod"])
        except ValueError:
            mi = 99
        return (0 if r["game"] == "PoE1" else 1, mi, r["mod"], r["slots"], int(r["tier"]))

    out_rows.sort(key=row_key)
    return out_rows, recs


def main():
    rows, recs = build_rows()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["game", "mod", "affix_type", "slots", "tier", "ilvl", "min", "max", "source_url", "version"],
        )
        w.writeheader()
        w.writerows(rows)

    # QA summary
    from collections import Counter
    print(f"rows={len(rows)} recs={len(recs)} path={CSV_PATH}")
    print("per game", Counter(r["game"] for r in rows))
    print("\nper game+mod:")
    c = Counter((r["game"], r["mod"]) for r in rows)
    for k in sorted(c, key=lambda x: (x[0], x[1])):
        # unique slot-groups
        groups = sorted({r["slots"] for r in rows if (r["game"], r["mod"]) == k})
        print(f"  {k[0]:5} {k[1]:35} rows={c[k]:4} groups={len(groups)}")
        for g in groups:
            n = sum(1 for r in rows if r["game"]==k[0] and r["mod"]==k[1] and r["slots"]==g)
            typ = next(r["affix_type"] for r in rows if r["game"]==k[0] and r["mod"]==k[1] and r["slots"]==g)
            print(f"      [{typ}] n={n}  {g}")
    # sanity: missing mods
    expected = {
        "maximum Life", "maximum Mana", "Fire Resistance", "Cold Resistance",
        "Lightning Resistance", "Chaos Resistance", "Strength", "Dexterity", "Intelligence",
        "Adds # to # Physical Damage", "Adds # to # Fire Damage", "% increased Physical Damage",
        "Attack Speed", "Armour", "% increased Armour", "Movement Speed", "% increased Spell Damage",
    }
    for game in ("PoE1", "PoE2"):
        have = {r["mod"] for r in rows if r["game"]==game}
        miss = expected - have
        extra_crit = have - expected
        print(f"\n{game} missing: {miss or 'none'}")
        print(f"{game} extra/other: {extra_crit or 'none'}")
    # check parse failures
    bad = [r for r in rows if r["min"]=="沒找到" or r["max"]=="沒找到"]
    print("parse failures", len(bad))
    # sample added dmg
    print("\nSample added phys rows:")
    for r in rows:
        if r["mod"]=="Adds # to # Physical Damage" and int(r["tier"])<=2:
            print(r)


if __name__ == "__main__":
    main()
