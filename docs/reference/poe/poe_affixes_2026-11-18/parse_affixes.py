#!/usr/bin/env python3
"""Collect special PoE1/PoE2 equipment affixes from poedb.tw / poe2db.tw."""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup, NavigableString, Tag

POE1_DIR = Path("/tmp/poe_affixes/poedb/items")
POE1_PAGES = Path("/tmp/poe_affixes/poedb")
POE2_ITEMS = Path("/tmp/poe_affixes/poe2db/items")
POE2_SPECIAL = Path("/tmp/poe_affixes/poe2db/special")
OUT_DIR = Path("/workspace/poe_affixes_2026-11-18")
OUT_CSV = OUT_DIR / "poe_special_affixes.csv"

FETCH_TIME = datetime.now(ZoneInfo("Asia/Taipei")).strftime("%Y-%m-%d %H:%M Asia/Taipei")

HEADERS = [
    "遊戲(1/2)",
    "來源類型",
    "前綴或後綴",
    "原文",
    "適用裝備部位",
    "效果類別",
    "來源連結",
    "抓取時間",
]

GEN_MAP = {
    "1": "prefix",
    "2": "suffix",
    "3": "implicit",
    "5": "implicit",
    "24": "implicit",
}

SLOT_TAG_MAP = {
    "gloves": "Gloves",
    "helmet": "Helmets",
    "helmets": "Helmets",
    "body_armour": "Body Armours",
    "body_armours": "Body Armours",
    "boots": "Boots",
    "amulet": "Amulets",
    "amulets": "Amulets",
    "ring": "Rings",
    "rings": "Rings",
    "belt": "Belts",
    "belts": "Belts",
    "shield": "Shields",
    "shields": "Shields",
    "quiver": "Quivers",
    "quivers": "Quivers",
    "jewel": "Jewels",
    "jewels": "Jewels",
    "abyss_jewel": "Abyss Jewels",
    "claw": "Claws",
    "claws": "Claws",
    "dagger": "Daggers",
    "daggers": "Daggers",
    "wand": "Wands",
    "wands": "Wands",
    "bow": "Bows",
    "bows": "Bows",
    "staff": "Staves",
    "staves": "Staves",
    "warstaff": "Warstaves",
    "warstaves": "Warstaves",
    "sceptre": "Sceptres",
    "sceptres": "Sceptres",
    "one_hand_sword": "One Hand Swords",
    "thrusting_one_hand_sword": "Thrusting One Hand Swords",
    "one_hand_axe": "One Hand Axes",
    "one_hand_mace": "One Hand Maces",
    "two_hand_sword": "Two Hand Swords",
    "two_hand_axe": "Two Hand Axes",
    "two_hand_mace": "Two Hand Maces",
    "rune_dagger": "Rune Daggers",
    "fishing_rod": "Fishing Rods",
}

# spawn tags that are not slots
NON_SLOT_TAGS = {
    "default", "weapon", "one_hand_weapon", "two_hand_weapon", "sword", "axe",
    "mace", "attack_staff", "attack_dagger", "caster_unique_weapon",
    "abyss_jewel",  # keep as slot actually - already mapped
}

SOURCE_LABELS = {
    "shaper": "Shaper影響",
    "elder": "Elder影響",
    "crusader": "Crusader影響",
    "redeemer": "Redeemer影響",
    "hunter": "Hunter影響",
    "warlord": "Warlord影響",
    "searing": "Eldritch（Searing Exarch）",
    "eater": "Eldritch（Eater of Worlds）",
    "veiled": "Veiled（Betrayal）",
    "master": "Crafting Bench",
    "essence": "Essence",
    "perfect_essence": "Essence（Perfect）",
    "delve": "Delve（Fossil限定）",
    "corrupted": "Corrupted Implicit（Vaal Orb）",
    "synthesis": "Synthesis Implicit",
    "synthesis_corrupted": "Synthesis Implicit（Corrupted）",
    "incursion": "Incursion（Temple）",
    "scourgeup": "Scourge（正面）",
    "scourgedown": "Scourge（負面）",
    "bestiary": "Bestiary",
    "warbands": "Warbands",
    "sentinel": "Sentinel",
    "infamous": "Infamous",
    "enchant": "Enchant",
    "desecrated": "Desecrated",
}

SOURCE_URLS_POE1 = {
    "shaper": "https://poedb.tw/us/The_Shaper",
    "elder": "https://poedb.tw/us/The_Elder",
    "crusader": "https://poedb.tw/us/The_Crusader",
    "redeemer": "https://poedb.tw/us/The_Redeemer",
    "hunter": "https://poedb.tw/us/The_Hunter",
    "warlord": "https://poedb.tw/us/The_Warlord",
    "searing": "https://poedb.tw/us/Eldritch_implicit",
    "eater": "https://poedb.tw/us/Eldritch_implicit",
    "veiled": "https://poedb.tw/us/Veiled_modifier",
    "master": "https://poedb.tw/us/Crafting_Bench",
    "essence": "https://poedb.tw/us/Essence",
    "perfect_essence": "https://poedb.tw/us/Essence",
    "delve": "https://poedb.tw/us/Fossil",
    "corrupted": "https://poedb.tw/us/Vaal_Orb#VaalOrbCorruptedImplicit",
    "synthesis": None,  # filled per class
    "synthesis_corrupted": None,
    "incursion": "https://poedb.tw/us/Incursion",
    "scourgeup": "https://poedb.tw/us/Scourge",
    "scourgedown": "https://poedb.tw/us/Scourge",
    "bestiary": "https://poedb.tw/us/Bestiary",
    "warbands": "https://poedb.tw/us/Warbands",
    "sentinel": "https://poedb.tw/us/Sentinel",
    "infamous": "https://poedb.tw/us/Mercenaries",
    "enchant": "https://poedb.tw/us/Enchant",
}

# Keys to harvest from ModsView (skip normal base pool)
SPECIAL_KEYS = list(SOURCE_LABELS.keys())

NUM_TOKEN = r"(?:\d+(?:\.\d+)?)"
SIGNED_NUM = rf"(?:-?{NUM_TOKEN})"
RANGE_OR_NUM = rf"(?:{SIGNED_NUM}(?:—{SIGNED_NUM})?|\({SIGNED_NUM}—{SIGNED_NUM}\))"


def extract_json_arg(html: str, fn: str = "new ModsView("):
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
            if ch in ('"', "'"):
                in_str = True
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
        i += 1
    raw = html[start : i - 1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def clean_mod_text(src) -> str:
    """Turn a poedb HTML fragment or Tag into readable English mod text."""
    if src is None:
        return ""
    if isinstance(src, Tag):
        soup = BeautifulSoup(str(src), "lxml")
        root = soup
    else:
        s = str(src)
        if "<" not in s:
            text = s
            text = text.replace("—", "—")
            text = re.sub(r"\s+", " ", text).strip()
            return tidy_spaces(text)
        root = BeautifulSoup(s, "lxml")

    for el in root.select(
        ".badge, .fas, .fa-info-circle, .fa-list, i.fas, i.fab, script, .float-end"
    ):
        el.decompose()
    for nd in root.select("span.ndash"):
        nd.replace_with("—")
    for br in root.find_all("br"):
        br.replace_with(" / ")

    text = root.get_text(" ", strip=True)
    return tidy_spaces(text)


def tidy_spaces(text: str) -> str:
    text = text.replace("\xa0", " ")
    # wiki / keyword leftover: [Blind|Blinded] -> Blinded, [Blind] -> Blind
    text = re.sub(r"\[([^\]|]+)\|([^\]]+)\]", r"\2", text)
    text = re.sub(r"\[([^\]|]+)\]", r"\1", text)
    # hidden internal stats e.g. grant focus skill [1]
    text = re.sub(r"(?:^|\s/\s)[A-Za-z][A-Za-z0-9_ ]*\[\d+\]", "", text)
    text = re.sub(r"\s*grant focus skill\s*", " ", text, flags=re.I)
    text = re.sub(r"\(\s*(-?" + NUM_TOKEN + r")\s*—\s*(-?" + NUM_TOKEN + r")\s*\)", r"(\1—\2)", text)
    text = re.sub(r"\)\s+%", ")%", text)
    text = re.sub(r"(\d)\s+%", r"\1%", text)
    text = re.sub(r"\+\s+", "+", text)
    text = re.sub(r"\s+/\s+", " / ", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.:;])", r"\1", text)
    text = re.sub(r"Cannot be([A-Z])", r"Cannot be \1", text)
    text = re.sub(r"\+(\d)to ", r"+\1 to ", text)
    text = re.sub(r"(\d)to ", r"\1 to ", text)
    text = re.sub(r"contains(\d)", r"contains \1", text)
    text = re.sub(r"fire(\d)", r"fire \1", text)
    text = text.replace(" / / ", " / ")
    text = re.sub(r"\s+/\s+", " / ", text)
    return text.strip(" /")


def iter_mod_dicts(obj):
    """Yield dicts that look like a mod entry, flattening grouped maps."""
    if obj is None:
        return
    if isinstance(obj, list):
        for item in obj:
            yield from iter_mod_dicts(item)
    elif isinstance(obj, dict):
        if "str" in obj or "StatsStr" in obj:
            # could still be a group of lists; if values are lists of mods, descend
            if any(isinstance(v, list) and v and isinstance(v[0], dict) and "str" in v[0] for v in obj.values()):
                for v in obj.values():
                    yield from iter_mod_dicts(v)
            else:
                yield obj
        else:
            for v in obj.values():
                yield from iter_mod_dicts(v)


def slots_from_spawn(spawn_no, page_slot: str) -> list[str]:
    """Prefer the page's item class as the slot (ModsView is per class)."""
    if page_slot:
        return [page_slot]
    slots = []
    for tag in spawn_no or []:
        tag = str(tag).strip()
        # strip influence suffixes
        base = re.sub(r"_(shaper|elder|crusader|redeemer|hunter|warlord)$", "", tag)
        if base in ("default",) or base.startswith("no_tier"):
            continue
        if base in SLOT_TAG_MAP:
            name = SLOT_TAG_MAP[base]
            if name not in slots:
                slots.append(name)
    return slots or ["未標示"]


def affix_type_from_gen(gen) -> str:
    return GEN_MAP.get(str(gen), "other")


# ---------- special vs pure-stat ----------
PURE_PATTERNS = [
    rf"^(\+)?{RANGE_OR_NUM}( to maximum (Life|Mana|Energy Shield))$",
    rf"^(\+)?{RANGE_OR_NUM}% increased maximum (Life|Mana|Energy Shield)$",
    rf"^(\+)?{RANGE_OR_NUM}% to ((Fire|Cold|Lightning|Chaos) Resistance|all Elemental Resistances)$",
    rf"^(\+)?{RANGE_OR_NUM}% to Fire, Cold and Lightning Resistances$",
    rf"^Adds {RANGE_OR_NUM} to {RANGE_OR_NUM} (Physical|Fire|Cold|Lightning|Chaos|Elemental) Damage( to (Attacks|Spells|Spells and Attacks))?$",
    rf"^(\+)?{RANGE_OR_NUM} to (Strength|Dexterity|Intelligence|all Attributes)$",
    rf"^(\+)?{RANGE_OR_NUM}% increased (Strength|Dexterity|Intelligence)$",
    rf"^(\+)?{RANGE_OR_NUM} to (Armour|Evasion Rating|maximum Energy Shield|Accuracy Rating)$",
    rf"^(\+)?{RANGE_OR_NUM}% increased (Armour|Evasion Rating|Energy Shield|Armour and Evasion|Armour and Energy Shield|Evasion and Energy Shield|Armour, Evasion and Energy Shield)$",
    rf"^(\+)?{RANGE_OR_NUM}% increased (Physical|Elemental|Spell|Attack|Projectile|Melee|Area|Chaos|Fire|Cold|Lightning|Global Physical|Burning|Minion) Damage( with Attack Skills)?$",
    rf"^(\+)?{RANGE_OR_NUM}% increased (Critical Strike Chance|Global Critical Strike Chance|Spell Critical Strike Chance)$",
    rf"^(\+)?{RANGE_OR_NUM}% to (Global )?Critical Strike Multiplier$",
    rf"^(\+)?{RANGE_OR_NUM}% increased (Attack|Cast|Movement|Attack and Cast) Speed$",
    rf"^(\+)?{RANGE_OR_NUM}% increased Mana Regeneration Rate$",
    rf"^Regenerate {RANGE_OR_NUM} Life per second$",
    rf"^Regenerate {RANGE_OR_NUM} Mana per second$",
    rf"^(\+)?{RANGE_OR_NUM} Life gained (on Kill|for each Enemy hit by (your )?Attacks)$",
    rf"^(\+)?{RANGE_OR_NUM} Mana gained (on Kill|for each Enemy hit by (your )?Attacks)$",
    rf"^(\+)?{RANGE_OR_NUM}% increased Flask (Charges gained|Effect Duration)$",
    rf"^(\+)?{RANGE_OR_NUM} to Level of Socketed (Fire|Cold|Lightning|Chaos|Physical|Minion|Bow|Melee|Spell|Strength|Dexterity|Intelligence) Gems$",
]

# The last one (gem levels) is actually special / build-defining — do NOT treat as pure.
PURE_PATTERNS = PURE_PATTERNS[:-1]

SPECIAL_RE = re.compile(
    r"(?i)("
    r"trigger|socketed|grants (level|skill)|grants skill|"
    r"cannot be|can't be|can not be|cannot roll|can have up to|"
    r"unaffected|immun(?:e|ity)|you are immune|"
    r"your hits|hits can't|hits cannot|"
    r"convert|converted|conversion|"
    r"as extra|gained as extra|gain .+ as extra|"
    r"nearby|"
    r"taken as|"
    r"recoup|"
    r"reflected|"
    r"additional (curse|projectile|arrow|totem|brand|trap|mine|endurance|frenzy|power|chain|socket|suffix|prefix)|"
    r"skills fire|bow attacks fire|attacks fire|"
    r"supported by|"
    r"to level of (socketed|all)|"
    r"quality of socketed|"
    r"prefixes cannot|suffixes cannot|cannot roll (attack|caster)|"
    r"deal no |deal only |"
    r"action speed|"
    r"onslaught|adrenaline|fortif|elusive|phasing|intimidat|unnerve|"
    r"while a (unique|pinnacle)|in your presence|"
    r"if you've|if you have|if you('ve)? (warcried|crit|blocked|been hit|used a flask)|"
    r"when you|when hit|on (kill|hit|crit|critical|block|ignite|shock|freeze|stun)|"
    r"every \d|every second|"
    r"instead|no longer|spend life|reservation|"
    r"cull(?:ing)?|"
    r"penetrat|"
    r"double damage|triple damage|"
    r"keystone|you have |"
    r"curse enemies|you can apply|"
    r"always|"
    r"lucky|unlucky|"
    r"count as|are also|inflicted as|"
    r"ignore[sd]? |"
    r"maximum (fire|cold|lightning|chaos|elemental) resistance|"
    r"to maximum (resistance|fortification)|"
    r"suppress|"
    r"avoid |"
    r"overwhelm|wither|scorch|brittle|sap\b|impale|"
    r"warcr|exert|"
    r"cast (a )?socketed|use a socketed|"
    r"abyssal socket|"
    r"damage is taken from mana|"
    r"prevent .+ reflected|cannot be stunned|"
    r"blind|hinder|maim|taunt|"
    r"charm|"
    r"desecrat|"
    r"augments?|"
    r"bonded|"
    r"spirit|"
    r"energy shield recharge starts|"
    r"skills (gain|have|reserve|cost)|"
    r"totem|banner|offering|herald|brand skill|"
    r"mine|trap |"
    r"projectile.*"
    r")"
)

# refine: many "on kill" recover life might still be useful 續航 specials; keep via regex.

def is_pure_stat(text: str) -> bool:
    t = tidy_spaces(text)
    if " / " in t or "; " in t:
        # multi-line: only pure if EVERY line is pure
        parts = [p.strip() for p in re.split(r"\s/\s", t) if p.strip()]
        return bool(parts) and all(is_pure_stat(p) for p in parts)
    for pat in PURE_PATTERNS:
        if re.match(pat, t, flags=re.I):
            return True
    return False


def is_special(text: str) -> bool:
    if not text or len(text) < 3:
        return False
    # skip obvious map/area/heist/atlas lines
    low = text.lower()
    if any(
        k in low
        for k in (
            "area contains",
            "area is ",
            "atlas passive",
            "found items have",
            "unique monsters drop",
            "imprisoned monster",
            "heist chest",
            "map implicit",
            "pack size",
            "in this area",
        )
    ):
        return False
    if is_pure_stat(text):
        return False
    if SPECIAL_RE.search(text):
        return True
    # leftover non-pure: keep if it looks mechanic-y, else skip generic % increased
    # Keep remaining non-pure as special-ish (e.g. "Recover (3—4)% of Life on Kill")
    if re.search(
        r"(?i)recover|leech|charge|flask|aura|minion|curse|bleed|poison|ignite|shock|freeze|chill|"
        r"block|spell damage|duration|cooldown|radius|area of effect|chain|pierce|fork|return|"
        r"exert|warcry|mark|hex|herald|reservation|attribute|endurance|frenzy|power charge|"
        r"elusive|onslaught|phasing|fortify|adrenaline|berserk|rage|soul|vaal|"
        r"implicit modifier magnitudes|corrupted",
        text,
    ):
        return True
    # still not pure but maybe a unique wording — keep (better not invent by dropping unknown specials)
    # However skip very generic leftover "X% increased Y Damage over Time" etc? Keep lightly.
    if re.match(rf"^({RANGE_OR_NUM}|#)% increased .+$", text, flags=re.I):
        return False
    if re.match(rf"^\+?{RANGE_OR_NUM}% to .+$", text, flags=re.I) and "maximum" not in text.lower():
        return False
    return True


def classify_category(text: str) -> str:
    t = text.lower()
    if re.search(r"cannot (roll|be changed)|prefixes cannot|suffixes cannot|can have up to \d+ crafted", t):
        return "其他"
    if re.search(r"can'?t be evaded|cannot be evaded", t):
        return "傷害"
    if re.search(r"\bavoid\b|cannot be (?!evaded)|unaffected|immun", t) and not re.search(r"as extra|penetrat|trigger", t):
        return "防禦"
    # order matters: pick the most distinctive
    speed_kw = (
        "attack speed", "cast speed", "movement speed", "action speed",
        "cooldown recovery", "onslaught", "attack and cast speed",
    )
    sustain_kw = (
        "leech", "recoup", "recover", "regenerate", "flask", "on kill",
        "life per", "mana per", "energy shield per", "recharge",
        "charges per", "charm", "life gain", "mana gain",
    )
    def_kw = (
        "taken as", "damage taken", "reduced damage", "less damage taken",
        "block", "suppress", "evasion", "armour", "energy shield",
        "unaffected", "immune", "cannot be", "avoid ", "physical damage reduction",
        "maximum resistance", "to maximum fire", "to maximum cold",
        "to maximum lightning", "fortif", "stun", "ailment",
        "reflected", "from mana before life",
    )
    dmg_kw = (
        "damage", "penetrat", "as extra", "convert", "converted",
        "double damage", "triple damage", "additional projectile",
        "additional arrow", "critical", "ailment", "ignite", "shock",
        "freeze", "bleed", "poison", "impale", "wither", "scorch",
        "supported by", "to level of", "spell", "attack", "minion deal",
        "area of effect", "cull",
    )
    # exclusive-ish first
    if any(k in t for k in speed_kw) and not any(k in t for k in ("taken", "as extra", "convert")):
        # if also big damage clause, prefer 傷害 when speed is incidental? keep 速度 if speed is primary
        if any(k in t for k in ("as extra", "penetrat", "convert", "supported by", "trigger")):
            if "speed" in t and not any(k in t for k in ("as extra", "penetrat", "convert", "trigger", "supported")):
                return "速度"
            # mixed speed + damage mechanic
            if any(k in t for k in ("as extra", "penetrat", "convert", "trigger", "supported by")):
                return "傷害"
        return "速度"
    # grants skill / trigger / cannot roll / curses / sockets utility
    other_kw = (
        "trigger", "grants level", "grants skill", "prefixes cannot",
        "suffixes cannot", "cannot roll", "can have up to", "curse",
        "keystone", "abyssal socket", "item rarity", "quantity of items",
        "omen", "desecrat", "while this item is active", "unveil",
        "next exalted", "next chaos", "next divine", "annulment",
        "socket",
    )
    # defense if clearly defensive cannot/unaffected
    if any(k in t for k in ("taken as", "damage taken", "reduced damage taken", "less damage taken",
                            "reflected", "from mana before life", "suppress", "physical damage reduction")):
        return "防禦"
    if any(k in t for k in ("unaffected", "immune", "cannot be stunned", "cannot be chilled",
                            "cannot be frozen", "cannot be ignited", "cannot be shocked",
                            "cannot be blinded", "cannot be poisoned", "avoid elemental",
                            "avoid being", "maximum resistance", "chance to block",
                            "spell suppression", "suppress spell")):
        return "防禦"
    if any(k in t for k in sustain_kw) and not any(k in t for k in ("as extra", "penetrat", "trigger", "supported by")):
        return "續航"
    if any(k in t for k in dmg_kw):
        return "傷害"
    if any(k in t for k in other_kw):
        return "其他"
    if any(k in t for k in def_kw):
        return "防禦"
    if any(k in t for k in speed_kw):
        return "速度"
    if any(k in t for k in sustain_kw):
        return "續航"
    return "其他"


def make_row(game, source, affix, text, slots, url, category=None):
    text = tidy_spaces(text)
    if not text:
        return None
    if isinstance(slots, str):
        slots = re.split(r"[、,]", slots)
    cleaned = []
    for s in slots:
        s = re.sub(r"\s+", " ", str(s)).strip(" 、,")
        if s and s not in cleaned:
            cleaned.append(s)
    slots = cleaned
    slot_s = "、".join(slots) if slots else "未標示"
    return {
        "遊戲(1/2)": str(game),
        "來源類型": source,
        "前綴或後綴": affix,
        "原文": text,
        "適用裝備部位": slot_s,
        "效果類別": category or classify_category(text),
        "來源連結": url,
        "抓取時間": FETCH_TIME,
    }


# ---------- collapse / dedupe ----------
def template_of(text: str) -> str:
    t = re.sub(rf"\({SIGNED_NUM}—{SIGNED_NUM}\)", "#", text)
    t = re.sub(SIGNED_NUM, "#", t)
    return t


def merge_ranges(texts: list[str]) -> str:
    """Merge texts that share a template into one with combined numeric ranges."""
    if not texts:
        return ""
    if len(texts) == 1:
        return texts[0]
    # tokenize numbers in order (including signed ranges like (-30—-24))
    num_re = re.compile(rf"\({SIGNED_NUM}—{SIGNED_NUM}\)|{SIGNED_NUM}")
    parsed = []
    tmpl = None
    for t in texts:
        nums = num_re.findall(t)
        tu = num_re.sub("{}", t)
        if tmpl is None:
            tmpl = tu
        elif tu != tmpl:
            # mismatch — return the longest / first
            return texts[0]
        parsed.append(nums)
    if not parsed[0]:
        return texts[0]
    merged_nums = []
    for i in range(len(parsed[0])):
        vals = []
        for nums in parsed:
            if i >= len(nums):
                continue
            token = nums[i]
            if "—" in token:
                a, b = token.strip("()").split("—")
                vals.append(float(a))
                vals.append(float(b))
            else:
                vals.append(float(token))
        lo, hi = min(vals), max(vals)

        def fmt(x):
            return str(int(x)) if x == int(x) else (str(x).rstrip("0").rstrip(".") if "." in str(x) else str(x))

        if lo == hi:
            # keep original style if all were parenthesized ranges? use plain
            orig = parsed[0][i]
            if orig.startswith("("):
                merged_nums.append(f"({fmt(lo)}—{fmt(hi)})")
            else:
                merged_nums.append(fmt(lo))
        else:
            merged_nums.append(f"({fmt(lo)}—{fmt(hi)})")
    try:
        return tmpl.format(*merged_nums)
    except Exception:
        return texts[0]


def collapse_and_dedupe(rows: list[dict]) -> list[dict]:
    groups = defaultdict(list)
    for r in rows:
        key = (
            r["遊戲(1/2)"],
            r["來源類型"],
            r["前綴或後綴"],
            template_of(r["原文"]),
        )
        groups[key].append(r)
    out = []
    for key, items in groups.items():
        texts = [i["原文"] for i in items]
        merged_text = merge_ranges(texts)
        slots = []
        for i in items:
            for s in i["適用裝備部位"].split("、"):
                if s and s not in slots:
                    slots.append(s)
        base = items[0].copy()
        base["原文"] = tidy_spaces(merged_text)
        base["適用裝備部位"] = "、".join(slots)
        base["效果類別"] = classify_category(merged_text)
        out.append(base)
    # final exact dedupe
    seen = set()
    final = []
    for r in out:
        k = (r["遊戲(1/2)"], r["來源類型"], r["原文"], r["適用裝備部位"])
        if k in seen:
            continue
        seen.add(k)
        final.append(r)
    return final


# ---------- parsers ----------
def harvest_modsview(html: str, page_slot: str, page_url: str, game: str = "1") -> list[dict]:
    data = extract_json_arg(html, "new ModsView(")
    if not data:
        return []
    rows = []
    for key in SPECIAL_KEYS:
        if key not in data:
            continue
        label = SOURCE_LABELS[key]
        url = SOURCE_URLS_POE1.get(key)
        if url is None:
            slug = page_slot.replace(" ", "_")
            url = f"{page_url}#{slug}SynthesisImplicit"
        for mod in iter_mod_dicts(data[key]):
            raw = mod.get("str") or mod.get("StatsStr") or ""
            text = clean_mod_text(raw)
            if not is_special(text):
                continue
            gen = mod.get("ModGenerationTypeID")
            affix = affix_type_from_gen(gen)
            if key in ("corrupted", "synthesis", "synthesis_corrupted", "searing", "eater", "enchant"):
                affix = "implicit" if key != "enchant" else "enchant"
            if key in ("searing", "eater") and not text:
                continue
            slots = slots_from_spawn(mod.get("spawn_no"), page_slot)
            # For eldritch, prefer tags in spawn/weight
            row = make_row(game, label, affix, text, slots, url)
            if row:
                rows.append(row)
    return rows


def parse_influence_page(path: Path, source_label: str, url: str) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    rows = []
    for table in soup.find_all("table", class_="filters"):
        prev = table.find_previous(["h4", "h5", "h3"])
        title = prev.get_text(" ", strip=True) if prev else ""
        heads = [c.get_text(" ", strip=True) for c in (table.find("tr").find_all(["th", "td"]) if table.find("tr") else [])]
        if heads[:3] != ["Item Level", "Mod", "Tag"]:
            continue
        if "Prefix" in title:
            affix = "prefix"
        elif "Suffix" in title:
            affix = "suffix"
        else:
            continue
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) < 3:
                continue
            text = clean_mod_text(tds[1])
            if not is_special(text):
                continue
            # tags may be br-separated
            for br in tds[2].find_all("br"):
                br.replace_with("、")
            slot = tidy_spaces(tds[2].get_text(" ", strip=True)).replace("  ", " ")
            # "Boots Gloves" -> keep readable
            slot = re.sub(r"\s+", "、", slot) if slot and "、" not in slot and len(slot.split()) <= 8 else slot
            # nicer: if spaces between class names, use顿号
            # already space-separated multi classes like "Bows Two Hand Axes"
            if "、" not in slot:
                # insert顿号 before known class names (except first)
                classes = [
                    "Thrusting One Hand Swords", "One Hand Swords", "One Hand Axes",
                    "One Hand Maces", "Two Hand Swords", "Two Hand Axes", "Two Hand Maces",
                    "Rune Daggers", "Body Armours", "Warstaves", "Amulets", "Rings",
                    "Belts", "Gloves", "Boots", "Helmets", "Shields", "Quivers",
                    "Claws", "Daggers", "Wands", "Bows", "Staves", "Sceptres", "Jewels",
                ]
                tmp = slot
                # split by known tokens
                parts = []
                rest = tmp
                while rest:
                    rest = rest.strip()
                    matched = False
                    for c in classes:
                        if rest.startswith(c):
                            parts.append(c)
                            rest = rest[len(c):]
                            matched = True
                            break
                    if not matched:
                        # leftover word
                        m = re.match(r"\S+\s*", rest)
                        if not m:
                            break
                        parts.append(m.group().strip())
                        rest = rest[m.end():]
                slot = "、".join(parts) if parts else slot
            row = make_row("1", source_label, affix, text, slot, url)
            if row:
                rows.append(row)
    return rows


def parse_eldritch_page(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    rows = []
    for table in soup.find_all("table", class_="filters"):
        prev = table.find_previous(["h4", "h5", "h3", "h1"])
        title = prev.get_text(" ", strip=True) if prev else ""
        if "Searing Exarch" in title:
            source = "Eldritch（Searing Exarch）"
        elif "Eater of Worlds" in title:
            source = "Eldritch（Eater of Worlds）"
        else:
            continue
        url = "https://poedb.tw/us/Eldritch_implicit"
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) < 3:
                continue
            impl = tds[1].select_one(".implicitMod")
            text = clean_mod_text(impl if impl else tds[1])
            if not is_special(text):
                continue
            slots = []
            for it in tds[2].find_all("i"):
                tag = it.get_text(strip=True)
                if tag.startswith("no_tier") or tag == "default":
                    continue
                slots.append(SLOT_TAG_MAP.get(tag, tag.replace("_", " ").title()))
            if not slots:
                # fallback parse
                raw = tds[2].get_text(" ", strip=True)
                for tag in re.findall(r"[a-z_]+", raw):
                    if tag.startswith("no_tier") or tag == "default":
                        continue
                    if tag in SLOT_TAG_MAP:
                        slots.append(SLOT_TAG_MAP[tag])
            row = make_row("1", source, "implicit", text, slots or ["未標示"], url)
            if row:
                rows.append(row)
    return rows


def parse_synthesis_section(html: str, slot: str, url: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows = []
    # find panes whose id contains SynthesisImplicit and not only heading
    panes = []
    for el in soup.find_all(id=True):
        iid = el.get("id") or ""
        if "SynthesisImplicit" in iid:
            panes.append((iid, el))
    for iid, pane in panes:
        corrupted = "Corrupted" in iid
        source = "Synthesis Implicit（Corrupted）" if corrupted else "Synthesis Implicit"
        # modal tables with actual values
        for table in pane.select("table"):
            heads = [c.get_text(" ", strip=True) for c in (table.find("tr").find_all(["th", "td"]) if table.find("tr") else [])]
            # rows: Item Level | text | weight
            for tr in table.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < 2:
                    continue
                # text often in 2nd column (index 1)
                cell = tds[1]
                text = clean_mod_text(cell)
                if not text or text.lower().startswith("item level"):
                    continue
                if not is_special(text):
                    continue
                row = make_row("1", source, "implicit", text, slot, url)
                if row:
                    rows.append(row)
    return rows


def parse_veiled_page(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    rows = []
    url = "https://poedb.tw/us/Veiled_modifier"
    # Use "Veiled Mods" (unveiled results) — skip the duplicate "Veiled Modifiers" if identical
    chosen = None
    for table in soup.find_all("table", class_="filters"):
        prev = table.find_previous(["h5", "h4", "h3"])
        title = prev.get_text(" ", strip=True) if prev else ""
        if "Veiled Mods /" in title and "Master" not in title and "Modifiers" not in title:
            chosen = table
            break
    if chosen is None:
        # fallback first big table
        tables = soup.find_all("table", class_="filters")
        chosen = tables[1] if len(tables) > 1 else (tables[0] if tables else None)
    if not chosen:
        return rows
    for tr in chosen.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue
        affix = tds[2].get_text(strip=True).lower()
        if affix not in ("prefix", "suffix"):
            affix = tds[2].get_text(strip=True)
        text = clean_mod_text(tds[3])
        if not is_special(text):
            continue
        slots = slots_from_weight_cell(tds[4])
        row = make_row("1", "Veiled（Betrayal）", affix, text, slots or ["多個部位"], url)
        if row:
            rows.append(row)
    return rows


def slots_from_weight_cell(td) -> list[str]:
    slots = []
    if td is None:
        return slots
    for it in td.find_all("i"):
        tag = it.get_text(strip=True)
        if tag in ("default",) or tag.startswith("no_tier") or tag.endswith("_veiled_prefix") or tag.endswith("_veiled_suffix"):
            # leo_veiled_prefix etc
            continue
        if tag in SLOT_TAG_MAP:
            name = SLOT_TAG_MAP[tag]
            if name not in slots:
                slots.append(name)
    if slots:
        return slots
    # parse concatenated "ClawsDaggersWands..." or "claws 1000"
    raw = td.get_text(" ", strip=True)
    # italic-less: "abyss_jewel0jewel0body_armour0default0" or with spaces
    for tag, name in SLOT_TAG_MAP.items():
        if re.search(rf"(?i)(?:^|[^a-z]){re.escape(tag)}(?:[^a-z]|$)", raw):
            if name not in slots:
                slots.append(name)
    # also readable names
    for name in SLOT_TAG_MAP.values():
        if name in raw and name not in slots:
            slots.append(name)
    return slots


def parse_essence_cards(path: Path, game: str, url: str, source="Essence") -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    pane = soup.select_one("#EssenceItem") or soup.select_one("#Essence")
    if not pane:
        return []
    rows = []
    for col in pane.select(".col"):
        name_el = None
        for a in col.select("a"):
            n = a.get_text(strip=True)
            if n:
                name_el = n
                break
        name = name_el or "Essence"
        # only keep higher / unique essences fully; still filter pure
        for div in col.select(".explicitMod, .implicitMod"):
            raw = div.get_text(" ", strip=True)
            # form: "Slots: effect"
            text = clean_mod_text(div)
            if ":" in text:
                slot_part, effect = text.split(":", 1)
                slot_part = slot_part.strip()
                effect = tidy_spaces(effect)
            else:
                # flavour / instruction
                if text.lower().startswith("upgrades") or text.lower().startswith("properties restricted"):
                    continue
                slot_part, effect = "未標示", text
            if not is_special(effect):
                continue
            # include essence name in text for traceability? Keep effect as 原文, source already Essence.
            # Prefix essence name as comment? Task wants English mod text. Keep effect only.
            # Slot part can be a list
            slots = [s.strip() for s in re.split(r",|、", slot_part) if s.strip()]
            row = make_row(game, source, "prefix", effect, slots or [slot_part], url)
            if row:
                # mark as essence-guaranteed; usually prefix but some are suffix — unknown. Use prefix default? 
                # Horror page had Prefix/Suffix. Leave as prefix unless we know. Better: "prefix/suffix（Essence保證）"
                row["前綴或後綴"] = "prefix/suffix"
                rows.append(row)
    return rows


def parse_named_essence_pages() -> list[dict]:
    rows = []
    for name in ["Essence_of_Horror", "Essence_of_Delirium", "Essence_of_Insanity", "Essence_of_Hysteria"]:
        p = POE1_PAGES / f"{name}.html"
        if not p.exists():
            continue
        html = p.read_text(encoding="utf-8", errors="replace")
        soup = BeautifulSoup(html, "lxml")
        url = f"https://poedb.tw/us/{name}"
        for table in soup.find_all("table", class_="filters"):
            prev = table.find_previous(["h5", "h4"])
            title = prev.get_text(" ", strip=True) if prev else ""
            if "Essence Modifiers" not in title:
                continue
            for tr in table.find_all("tr")[1:]:
                tds = tr.find_all("td")
                if len(tds) < 2:
                    continue
                affix = tds[0].get_text(strip=True).lower()
                text = clean_mod_text(tds[1])
                if not is_special(text):
                    continue
                row = make_row("1", "Essence", affix, text, "依裝備類別（見來源頁）", url)
                if row:
                    rows.append(row)
    return rows


def parse_bench(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poedb.tw/us/Crafting_Bench"
    rows = []
    table = None
    for t in soup.find_all("table", class_="filters"):
        prev = t.find_previous(["h5", "h4", "h1"])
        title = prev.get_text(" ", strip=True) if prev else ""
        if "Crafting Bench /" in title:
            table = t
            break
    if not table:
        return rows
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        text = clean_mod_text(tds[0])
        # skip socket/link/quality crafts that aren't affixes
        if re.match(r"(?i)^(two|three|four|five|six) (sockets|linked)", text):
            continue
        if re.match(r"(?i)^\d+% quality", text):
            continue
        if not is_special(text):
            continue
        slots_raw = tds[2].get_text(" · ", strip=True)
        slots_raw = slots_raw.replace("·", "、")
        row = make_row("1", "Crafting Bench", "crafted", text, slots_raw or "依解鎖部位", url)
        if row:
            rows.append(row)
    return rows


def parse_vaal_poe1(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poedb.tw/us/Vaal_Orb#VaalOrbCorruptedImplicit"
    rows = []
    table = None
    for t in soup.find_all("table", class_="filters"):
        prev = t.find_previous(["h5", "h4"])
        title = prev.get_text(" ", strip=True) if prev else ""
        if "Corrupted Implicit" in title:
            table = t
            break
    if not table:
        return rows
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        text = clean_mod_text(tds[1])
        if not is_special(text):
            continue
        # skip if looks like raw stat id
        if re.search(r"_[a-z]+|%[^\s]|map implicit", text) and re.search(r"\[[\d,]+\]", text):
            continue
        if text.startswith("map implicit") or "pack size" in text.lower():
            continue
        slots = slots_from_weight_cell(tds[2])
        # also "Bows(200)Quivers(200)"
        raw = tds[2].get_text(" ", strip=True)
        if not slots:
            for name in [
                "Life Flasks", "Mana Flasks", "Hybrid Flasks", "Utility Flasks",
                "Thrusting One Hand Swords", "One Hand Swords", "One Hand Axes",
                "One Hand Maces", "Two Hand Swords", "Two Hand Axes", "Two Hand Maces",
                "Rune Daggers", "Body Armours", "Warstaves", "Amulets", "Rings",
                "Belts", "Gloves", "Boots", "Helmets", "Shields", "Quivers",
                "Claws", "Daggers", "Wands", "Bows", "Staves", "Sceptres", "Jewels",
                "Maps", "Flasks",
            ]:
                if name in raw and name not in slots:
                    slots.append(name)
        # if almost all equipment listed, it is often a map implicit wrongly tagged
        if text.lower().startswith("area ") or "atlas" in text.lower() or "vaal vessel" in text.lower():
            continue
        if "Maps" in slots and len(slots) > 8:
            continue
        if "Life Flasks" in slots and len(slots) > 8:
            continue
        row = make_row("1", "Corrupted Implicit（Vaal Orb）", "implicit", text, slots or ["未標示"], url)
        if row:
            rows.append(row)
    return rows


def parse_elevated(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poedb.tw/us/Elevated_modifier"
    rows = []
    for table in soup.find_all("table", class_="filters"):
        heads = [c.get_text(" ", strip=True) for c in (table.find("tr").find_all(["th", "td"]) if table.find("tr") else [])]
        if not heads or "Elevated" not in " ".join(heads):
            continue
        # Name, Lv, Mods, Elevated Mods
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) < 4:
                continue
            name = tds[0].get_text(" ", strip=True)
            elevated_text = clean_mod_text(tds[3])
            if not is_special(elevated_text):
                continue
            # infer affix from name
            affix = "suffix" if name.lower().startswith("of ") else "prefix"
            row = make_row("1", "Elevated影響詞綴", affix, elevated_text, "身體護甲／手套／鞋子／頭部（可被Elevated的影響裝）", url)
            if row:
                rows.append(row)
    return rows


# ---------- PoE2 ----------
def parse_desecrated(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poe2db.tw/us/Desecrated_Modifiers"
    rows = []
    for table in soup.find_all("table", class_="filters"):
        prev = table.find_previous(["h5", "h4", "h1"])
        title = prev.get_text(" ", strip=True) if prev else ""
        if "Waystone" in title:
            continue  # map mods, not equipment
        if "Desecrated" not in title and "Desecrated Mods" not in title:
            # still check headers
            heads = [c.get_text(" ", strip=True) for c in (table.find("tr").find_all(["th", "td"]) if table.find("tr") else [])]
            if heads[:3] != ["Name", "Level", "Pre/Suf"] and "Description" not in heads:
                continue
        jewel = "Jewel" in title
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) < 3:
                continue
            # Name, Level, Pre/Suf, Description  OR Name, Pre/Suf, Description
            if len(tds) >= 4:
                affix = tds[2].get_text(strip=True).lower()
                text = clean_mod_text(tds[3])
            else:
                affix = tds[1].get_text(strip=True).lower()
                text = clean_mod_text(tds[2])
            if affix not in ("prefix", "suffix"):
                # keep whatever
                pass
            if not is_special(text):
                continue
            slots = ["Jewels"] if jewel else infer_poe2_slot_from_text(text)
            row = make_row("2", "Desecrated", affix, text, slots, url)
            if row:
                rows.append(row)
    return rows


def infer_poe2_slot_from_text(text: str) -> list[str]:
    t = text.lower()
    slots = []
    if "with this weapon" in t or "attacks with this" in t:
        slots.append("Weapons")
    if "wand or staff" in t:
        slots.append("Wands、Staves")
    if re.search(r"\bcharms?\b", t):
        slots.append("Belts/Charms")
    if "quiver" in t:
        slots.append("Quivers")
    if "shield" in t or "block" in t:
        slots.append("Shields")
    return slots or ["未標示部位（來源頁未列權重）"]


def parse_poe2_cards(path: Path, pane_ids: list[str], source: str, url: str, affix: str) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    pane = None
    for pid in pane_ids:
        pane = soup.select_one(pid)
        if pane:
            break
    if not pane:
        pane = soup
    rows = []
    for col in pane.select(".col"):
        name = ""
        for a in col.select("a"):
            n = a.get_text(strip=True)
            if n:
                name = n
                break
        # implicit / bonded / explicit effects with optional slot prefixes
        for div in col.select(".implicitMod, .bondedMod, .explicitMod"):
            cls = " ".join(div.get("class") or [])
            text = clean_mod_text(div)
            if not text:
                continue
            if text.lower().startswith("stack size") or text.lower().startswith("requires"):
                continue
            if text.lower().startswith("upgrades a"):
                continue
            # slot: effect
            if ":" in text and not text.lower().startswith("while this item"):
                # could be "Martial Weapon: Adds ..." or "While this item is active... : ..."
                # only split if left part looks like a slot
                left, right = text.split(":", 1)
                left, right = left.strip(), tidy_spaces(right)
                slot_like = bool(
                    re.search(
                        r"(?i)weapon|armour|armor|wand|staff|staves|jewellery|jewelry|"
                        r"helmet|gloves|boots|body|shield|focus|foci|amulet|ring|belt|"
                        r"charm|quiver|martial|sceptre|jewel",
                        left,
                    )
                ) and len(left) < 80
                if slot_like:
                    slots = [left]
                    effect = right
                else:
                    slots = ["未標示"]
                    effect = text
            else:
                slots = ["未標示"]
                effect = text
            src = source
            af = affix
            if "bondedMod" in cls:
                src = "Rune（Bonded）" if "Rune" in source or "Bonded" in source else source + "（Bonded）"
                af = "socketed"
            if source.startswith("Omen"):
                # all omen effects are special crafting rules
                row = make_row("2", "Omen", "crafting", f"{name}: {effect}" if name and name not in effect else effect, "背包觸發（非裝備詞綴）", url)
                if row:
                    rows.append(row)
                continue
            if not is_special(effect) and source not in ("Rune（Socketable）", "Soul Core（Socketable）"):
                continue
            # include all rune/soul core lines (the whole socketable pool), even pure res, as they are the system
            if source in ("Rune（Socketable）", "Soul Core（Socketable）"):
                pass
            elif not is_special(effect):
                continue
            row = make_row("2", src, af, effect, slots, url)
            if row:
                rows.append(row)
    return rows


def parse_poe2_corrupted(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poe2db.tw/us/Vaal_Orb#CorruptedMods"
    rows = []
    table = None
    for t in soup.find_all("table", class_="filters"):
        heads = [c.get_text(" ", strip=True) for c in (t.find("tr").find_all(["th", "td"]) if t.find("tr") else [])]
        if heads[:3] == ["Level", "Domain", "Description"] or "Domain" in heads and "Description" in heads:
            table = t
            break
    if not table:
        return rows
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        domain = tds[1].get_text(strip=True)
        if domain in ("Monster", "SanctumRelic", "Map", "Waystone"):
            continue
        text = clean_mod_text(tds[2])
        if not is_special(text):
            continue
        slot = "Jewels" if domain == "Jewel" else "各類裝備（來源頁僅標 Domain）"
        row = make_row("2", "Corrupted Implicit（Vaal Orb）", "implicit", text, slot, url)
        if row:
            rows.append(row)
    return rows


def parse_omens_complete(path: Path) -> list[dict]:
    """All omens are mechanic/crafting rules — include every one."""
    html = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    url = "https://poe2db.tw/us/Omen"
    pane = soup.select_one("#OmenItem") or soup
    rows = []
    for col in pane.select(".col"):
        name = ""
        for a in col.select("a"):
            n = a.get_text(strip=True)
            if n:
                name = n
                break
        texts = []
        for div in col.select(".explicitMod, .implicitMod"):
            t = clean_mod_text(div)
            if t and not t.lower().startswith("stack size"):
                texts.append(t)
        if not texts:
            # fallback whole card minus name/stack
            raw = clean_mod_text(col)
            raw = re.sub(r"Stack Size:.*?(?=(While|Your|The |$))", "", raw)
            texts = [tidy_spaces(raw)]
        effect = " / ".join(texts)
        if name and not effect.startswith(name):
            # keep omen name + rule
            text = f"{name}: {effect}"
        else:
            text = effect
        row = make_row("2", "Omen", "crafting", text, "背包觸發（非裝備詞綴）", url, "其他")
        if row:
            rows.append(row)
    return rows


def main():
    rows: list[dict] = []

    # PoE1 ModsView item pages
    for p in sorted(POE1_DIR.glob("*.html")):
        html = p.read_text(encoding="utf-8", errors="replace")
        slot = p.stem.replace("_", " ")
        url = f"https://poedb.tw/us/{p.stem}"
        if "new ModsView(" in html:
            got = harvest_modsview(html, slot, url, "1")
            print(f"ModsView {p.stem}: {len(got)}")
            rows.extend(got)
        else:
            syn = parse_synthesis_section(html, slot, f"{url}#{p.stem}SynthesisImplicit")
            print(f"Synthesis-HTML {p.stem}: {len(syn)}")
            rows.extend(syn)

    # Influence dedicated pages (covers armour slots too)
    for fname, label, url in [
        ("The_Shaper.html", "Shaper影響", "https://poedb.tw/us/The_Shaper"),
        ("The_Elder.html", "Elder影響", "https://poedb.tw/us/The_Elder"),
        ("The_Crusader.html", "Crusader影響", "https://poedb.tw/us/The_Crusader"),
        ("The_Redeemer.html", "Redeemer影響", "https://poedb.tw/us/The_Redeemer"),
        ("The_Hunter.html", "Hunter影響", "https://poedb.tw/us/The_Hunter"),
        ("The_Warlord.html", "Warlord影響", "https://poedb.tw/us/The_Warlord"),
    ]:
        got = parse_influence_page(POE1_PAGES / fname, label, url)
        print(f"Influence {fname}: {len(got)}")
        rows.extend(got)

    eld = parse_eldritch_page(POE1_PAGES / "Eldritch_implicit.html")
    print(f"Eldritch: {len(eld)}")
    rows.extend(eld)

    veiled = parse_veiled_page(POE1_PAGES / "Veiled_modifier.html")
    print(f"Veiled: {len(veiled)}")
    rows.extend(veiled)

    ess = parse_essence_cards(POE1_PAGES / "Essence.html", "1", "https://poedb.tw/us/Essence")
    print(f"Essence cards: {len(ess)}")
    rows.extend(ess)
    ess2 = parse_named_essence_pages()
    print(f"Named essences: {len(ess2)}")
    rows.extend(ess2)

    bench = parse_bench(POE1_PAGES / "Crafting_Bench.html")
    print(f"Bench: {len(bench)}")
    rows.extend(bench)

    vaal = parse_vaal_poe1(POE1_PAGES / "Vaal_Orb.html")
    print(f"Vaal PoE1: {len(vaal)}")
    rows.extend(vaal)

    elev = parse_elevated(POE1_PAGES / "Elevated_modifier.html")
    print(f"Elevated: {len(elev)}")
    rows.extend(elev)

    # PoE2
    des = parse_desecrated(POE2_SPECIAL / "Desecrated_Modifiers.html")
    print(f"PoE2 Desecrated: {len(des)}")
    rows.extend(des)

    rns = parse_poe2_cards(
        POE2_SPECIAL / "Rune.html",
        ["#RuneItem", "#Rune"],
        "Rune（Socketable）",
        "https://poe2db.tw/us/Rune",
        "socketed",
    )
    print(f"PoE2 Runes: {len(rns)}")
    rows.extend(rns)

    scs = parse_poe2_cards(
        POE2_SPECIAL / "Soul_Core.html",
        ["#SoulCore", "#SoulCoreRef"],
        "Soul Core（Socketable）",
        "https://poe2db.tw/us/Soul_Core",
        "socketed",
    )
    print(f"PoE2 Soul Cores: {len(scs)}")
    rows.extend(scs)

    essp2 = parse_essence_cards(
        POE2_SPECIAL / "Essence.html", "2", "https://poe2db.tw/us/Essence", "Essence"
    )
    print(f"PoE2 Essence: {len(essp2)}")
    rows.extend(essp2)

    oms = parse_omens_complete(POE2_SPECIAL / "Omen.html")
    print(f"PoE2 Omens: {len(oms)}")
    rows.extend(oms)

    cor2 = parse_poe2_corrupted(POE2_SPECIAL / "Vaal_Orb.html")
    print(f"PoE2 Corrupted: {len(cor2)}")
    rows.extend(cor2)

    print(f"RAW rows before collapse: {len(rows)}")
    # Filter empty
    rows = [r for r in rows if r and r.get("原文")]
    junk_text = re.compile(r"^(bonded:|bonded)$", re.I)
    rows = [r for r in rows if not junk_text.match(r["原文"].strip())]
    # reclean
    for r in rows:
        r["原文"] = tidy_spaces(r["原文"])
        r["效果類別"] = classify_category(r["原文"])
    final = collapse_and_dedupe(rows)
    # stable sort
    final.sort(key=lambda r: (r["遊戲(1/2)"], r["來源類型"], r["效果類別"], r["原文"], r["適用裝備部位"]))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        for r in final:
            w.writerow({h: r.get(h, "") for h in HEADERS})

    # stats
    from collections import Counter
    print(f"FINAL rows: {len(final)}")
    print("By game:", Counter(r["遊戲(1/2)"] for r in final))
    print("By source:")
    for k, v in Counter(r["來源類型"] for r in final).most_common():
        print(f"  {k}: {v}")
    print("By category:", Counter(r["效果類別"] for r in final))
    # write sidecar stats
    stats = {
        "fetch_time": FETCH_TIME,
        "final": len(final),
        "game": dict(Counter(r["遊戲(1/2)"] for r in final)),
        "source": dict(Counter(r["來源類型"] for r in final)),
        "category": dict(Counter(r["效果類別"] for r in final)),
    }
    (OUT_DIR / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", OUT_CSV, "and stats.json")


if __name__ == "__main__":
    main()
