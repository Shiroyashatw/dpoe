"""M2-17 追逐掉落「定稿」蒙地卡羅（只量不改，不碰遊戲程式）。沿用 ../sim.py 的模型（prdC、追逐保底、offSettle、A8），擴充：
- 追逐方案 C 的菁英上限 EC（每輪只有前 EC 隻菁英參與追逐判定與加點）、菁英 ×2 地圖詞。
- 有感保底（獎勵輪流）：feel＝連續幾隻輪末王沒有任何有感掉落；第 feel ≥ K 的王本身沒有有感掉落就給輪流的一件（珠寶 → 破裂石 → 追憶之墨，跳過沒開的），
  K = max(3, floor(TG ÷ 平均一輪秒數))；輪流位置每人存著、不因自然掉落重設；保底給的不動 PRD 計數。
- 開放情境：all（鍛造台 ≥19：破裂、完美、墨、珠寶）、f17（17–18：破裂、墨、珠寶）、f13（13–16：只有破裂）。

用法：python3 evidence/m2-17/final/sim_final.py <段> [--players N] [--hours H] [--procs P]
段：base｜speed｜sens｜offline｜a8base｜a8sens｜econ｜selftest。選定的 EC、TG 寫在 choice.json（speed、a8sens 跑完寫，後面的段讀）。

模型（照 js/craft.js、js/game.js）：
- 一輪 = 小怪 40 + 菁英（1★ 1–2、3★ 3–4、5★ 5–6 均勻；×2 地圖詞＝抽到的數 ×2）+ 1 隻輪末王；一輪秒數 = 3600/R × U(0.8, 1.2)。
- 菁英時間在輪內均勻、依序判定；王在輪末。不模擬死亡、離線、暫停。
- 追逐（方案 C）：平機率，王 1.4%、菁英 0.14%；王 +5（先加點，≥500 必掉，否則擲骰），菁英沒中 +1，任何一件歸零。
  方案 A＝prdRoll(2%／0.2%)（王、菁英各一個計數器，掉落時都歸零）、B＝平機率 2%／0.2%，只在 base 段對照。
- 有感掉落（NEW_P）：破裂石 0／0.5%／2%、完美石 0／0.25%／1%、追憶之墨 0／0／3%、珠寶 0.05%／0.5%／2%（小怪／菁英／王），
  照 prdRoll（每種 × 每種怪一個計數器），材料倍率 mat = 1。小怪的珠寶一輪最多算 1 顆（第二顆機率 < 1e-5）。
- 空窗：從 0 起到第一件、件與件之間；每人最長空窗含最後一件到 100 小時的尾巴；全體分位數用 1 秒寬的直方圖。
"""

import csv
import json
import math
import os
import sys
import time
from multiprocessing import Pool

import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
SEED = 20261118
STAR_EL = {1: (1, 2), 3: (3, 4), 5: (5, 6)}
N_SMALL = 40
PITY = 500
W_BOSS, W_ELITE = 5, 1
NEW_P = {"frac": (0, 0.005, 0.02), "perf": (0, 0.0025, 0.01), "ink": (0, 0, 0.03), "jw": (0.0005, 0.005, 0.02)}
OPEN = {"all": ["frac", "perf", "ink", "jw"], "f17": ["frac", "ink", "jw"], "f13": ["frac"]}
ROT = ["jw", "frac", "ink"]  # 完美石不進輪流
SCHEMES = {
    "A": dict(prd=True, pb=0.02, pe=0.002),
    "B": dict(prd=False, pb=0.02, pe=0.002),
    "C": dict(prd=False, pb=0.014, pe=0.0014),
}
GRID = [(R, s) for R in (12, 25, 40, 60) for s in (1, 3, 5)]
HB = 100 * 3600 + 2  # 直方圖格數（1 秒一格）

# ---------- craft.js 的 prdC（照抄演算法） ----------
_PRDC = {}


def prdC(p):
    key = round(p * 1e9)
    if key in _PRDC:
        return _PRDC[key]

    def rate(c):
        alive, e, n = 1.0, 0.0, 1
        while n < 1e5 and alive > 0:
            q = min(1.0, c * n)
            e += n * alive * q
            alive *= 1 - q
            n += 1
        return 1 / e

    lo, hi = 0.0, p
    for _ in range(40):
        mid = (lo + hi) / 2
        if rate(mid) < p:
            lo = mid
        else:
            hi = mid
    _PRDC[key] = (lo + hi) / 2
    return _PRDC[key]


def K_of(TG, R):
    return max(3, int(TG // (3600.0 / R)))


# ---------- 一塊玩家的模擬 ----------
def run_chunk(args):
    cfg, N, seed = args
    rng = np.random.default_rng(seed)
    T = cfg["hours"] * 3600.0
    R, star = cfg["R"], cfg["star"]
    lo, hi = STAR_EL[star]
    emul = cfg.get("emul", 1)
    Emax = hi * emul
    EC = cfg.get("EC") or 10**9
    S = SCHEMES[cfg.get("scheme", "C")] if cfg.get("chase", True) else None
    opn = cfg.get("open", [])
    K = cfg.get("K")
    rot = [k for k in ROT if k in opn]
    feelOn = cfg.get("feel", False)
    Cs = {(k, kind): prdC(NEW_P[k][kind]) for k in opn for kind in range(3) if NEW_P[k][kind]}
    ctr = {kk: np.zeros(N, np.int64) for kk in Cs}
    if S and S["prd"]:
        Cb, Ce = prdC(S["pb"]), prdC(S["pe"])
    cb = np.zeros(N, np.int64)
    ce = np.zeros(N, np.int64)
    t = np.zeros(N)
    pts = np.zeros(N, np.int64)
    maxpts = 0
    viol = 0
    # 追逐統計
    last = np.zeros(N)
    longest = np.zeros(N)
    cnt = np.zeros(N, np.int64)
    first10 = np.full((N, 10), np.nan)
    seen = np.zeros(N, np.int64)
    coup = np.full(N, np.nan)
    gaps = []
    forced_n = 0
    elite_n = 0
    pts_acc = [0.0, 0.0]
    # 有感統計
    flast = np.zeros(N)
    flong = np.zeros(N)
    fgaps = []
    fevents = 0
    nat = {k: 0 for k in NEW_P}
    nat["chase"] = 0
    give = {k: 0 for k in ROT}
    kfire = 0
    bsince = np.zeros(N, np.int64)
    rpos = np.zeros(N, np.int64)
    ar = np.arange(1, N_SMALL + 1)

    def chase_drop(idx, tt, forced, elite):
        nonlocal forced_n, elite_n
        ok = tt < T
        idx, tt, forced = idx[ok], tt[ok], forced[ok]
        if not len(idx):
            return
        g = tt - last[idx]
        gaps.append(g.astype(np.float32))
        np.maximum.at(longest, idx, g)
        k = cnt[idx]
        m = k < 10
        first10[idx[m], k[m]] = tt[m]
        cnt[idx] += 1
        typ = rng.integers(0, 4, len(idx))
        seen[idx] |= 1 << typ
        nc = (seen[idx] == 15) & np.isnan(coup[idx])
        coup[idx[nc]] = tt[nc]
        forced_n += int(forced.sum())
        if elite:
            elite_n += len(idx)
        last[idx] = tt

    while True:
        act = t < T
        if not act.any():
            break
        ai = np.nonzero(act)[0]
        n = len(ai)
        d = 3600.0 / R * rng.uniform(0.8, 1.2, n)
        E = rng.integers(lo, hi + 1, n) * emul
        et = np.sort(rng.uniform(0, 1, (n, Emax)), axis=1) * d[:, None]
        if S:
            pts_acc[0] += float((np.minimum(E, EC) * W_ELITE + W_BOSS).sum())
            pts_acc[1] += float(d.sum())
        ev = np.full((n, Emax + 2), np.nan)  # 本輪有感事件（相對時間）：小怪珠寶、每隻菁英、王
        t0 = t[ai]
        # 小怪的珠寶
        if ("jw", 0) in Cs:
            c0 = ctr[("jw", 0)][ai]
            qm = np.minimum(1, Cs[("jw", 0)] * (c0[:, None] + ar[None, :]))
            hm = rng.random((n, N_SMALL)) < qm
            anyh = hm.any(1)
            k = np.argmax(hm, 1)
            ctr[("jw", 0)][ai] = np.where(anyh, N_SMALL - 1 - k, c0 + N_SMALL)
            tm = (k + rng.random(n)) / N_SMALL * d
            ev[anyh, 0] = tm[anyh]
            nat["jw"] += int((anyh & (t0 + tm < T)).sum())
        # 菁英（依時間順序）
        for j in range(Emax):
            m = E > j
            if not m.any():
                continue
            idx = ai[m]
            tj = t0[m] + et[m, j]
            inT = tj < T
            got = np.zeros(len(idx), np.int64)
            for kk, c in Cs.items():
                if kk[1] != 1:
                    continue
                nn = ctr[kk][idx] + 1
                h = rng.random(len(idx)) < np.minimum(1, c * nn)
                ctr[kk][idx] = np.where(h, 0, nn)
                got += h
                nat[kk[0]] += int((h & inT).sum())
            if S and j < EC:
                u = rng.random(len(idx))
                if S["prd"]:
                    nn = ce[idx] + 1
                    h = u < np.minimum(1, Ce * nn)
                    ce[idx] = np.where(h, 0, nn)
                else:
                    h = u < S["pe"]
                pts[idx[~h]] += W_ELITE
                if h.any():
                    hh = idx[h]
                    maxpts = max(maxpts, int(pts[hh].max()))
                    pts[hh] = 0
                    cb[hh] = 0
                    ce[hh] = 0
                    chase_drop(hh, tj[h], np.zeros(len(hh), bool), True)
                got += h
                nat["chase"] += int((h & inT).sum())
            col = np.full(n, np.nan)
            mm = np.nonzero(m)[0][got > 0]
            col[mm] = et[mm, j]
            ev[:, 1 + j] = col
        # 王
        tb = t0 + d
        inT = tb < T
        got = np.zeros(n, np.int64)
        for kk, c in Cs.items():
            if kk[1] != 2:
                continue
            nn = ctr[kk][ai] + 1
            h = rng.random(n) < np.minimum(1, c * nn)
            ctr[kk][ai] = np.where(h, 0, nn)
            got += h
            nat[kk[0]] += int((h & inT).sum())
        if S:
            pts[ai] += W_BOSS
            forced = pts[ai] >= PITY
            u = rng.random(n)
            if S["prd"]:
                nn = cb[ai] + 1
                h = u < np.minimum(1, Cb * nn)
                cb[ai] = np.where(h, 0, nn)
            else:
                h = u < S["pb"]
            h = h | forced
            viol += int((forced & ~h).sum())
            if h.any():
                hh = ai[h]
                maxpts = max(maxpts, int(pts[hh].max()))
                pts[hh] = 0
                cb[hh] = 0
                ce[hh] = 0
                chase_drop(hh, tb[h], forced[h], False)
            got += h
            nat["chase"] += int((h & inT).sum())
        if feelOn:
            before = ~np.isnan(ev[:, : Emax + 1]).all(1)
            bs = np.where(before, 0, bsince[ai]) + 1
            if K is not None and rot:
                fK = (got == 0) & (bs >= K)
                if fK.any():
                    fi = ai[fK]
                    which = rpos[fi] % len(rot)
                    rpos[fi] += 1
                    ok = inT[fK]
                    for wi, nm in enumerate(rot):
                        give[nm] += int(((which == wi) & ok).sum())
                    kfire += int(ok.sum())
                    got = got + fK
            bsince[ai] = np.where(got > 0, 0, bs)
            ev[got > 0, Emax + 1] = d[got > 0]
            evs = np.sort(ev, 1) + t0[:, None]
            for c in range(Emax + 2):
                x = evs[:, c]
                m = ~np.isnan(x) & (x < T)
                if not m.any():
                    continue
                idx = ai[m]
                g = x[m] - flast[idx]
                fgaps.append(g.astype(np.float32))
                np.maximum.at(flong, idx, g)
                flast[idx] = x[m]
                fevents += int(m.sum())
        t[ai] = tb
    longest = np.maximum(longest, T - last)
    flong = np.maximum(flong, T - flast)

    def hist(gs):
        if not gs:
            return np.zeros(HB, np.int64), 0.0, 0.0, 0
        g = np.concatenate(gs).astype(np.float64)
        return np.bincount(np.minimum(g.astype(np.int64), HB - 1), minlength=HB), float(g.sum()), float(g.max()), len(g)

    # 最後還沒歸零的點數也算進「兩件間最大點數」
    maxpts = max(maxpts, int(pts.max()))
    return dict(
        gh=hist(gaps), fh=hist(fgaps), longest=longest, flong=flong, cnt=cnt, first10=first10, coup=coup,
        forced=forced_n, elite=elite_n, pts_acc=pts_acc, maxpts=maxpts, viol=viol,
        fevents=fevents, nat=nat, give=give, kfire=kfire,
    )


def hq(h, p):
    c = np.cumsum(h)
    return (int(np.searchsorted(c, p / 100 * c[-1])) + 0.5) if c[-1] else float("nan")


def q(a, p):
    a = a[~np.isnan(a)]
    return float(np.percentile(a, p)) if len(a) else float("nan")


POOL = None
PROCS = 4


def run(cfg, players, sid):
    """把 players 分成 PROCS 塊平行跑，種子 = [SEED, sid, 塊]。"""
    ch = PROCS
    sizes = [players // ch + (1 if i < players % ch else 0) for i in range(ch)]
    parts = POOL.map(run_chunk, [(cfg, s, [SEED, sid, i]) for i, s in enumerate(sizes)])
    out = {}
    for k in ("longest", "flong", "cnt", "coup"):
        out[k] = np.concatenate([p[k] for p in parts])
    out["first10"] = np.concatenate([p["first10"] for p in parts])
    for k in ("gh", "fh"):
        out[k] = (
            sum(p[k][0] for p in parts), sum(p[k][1] for p in parts), max(p[k][2] for p in parts), sum(p[k][3] for p in parts)
        )
    for k in ("forced", "elite", "viol", "fevents", "kfire"):
        out[k] = sum(p[k] for p in parts)
    out["maxpts"] = max(p["maxpts"] for p in parts)
    out["pts_acc"] = [sum(p["pts_acc"][i] for p in parts) for i in range(2)]
    out["nat"] = {k: sum(p["nat"][k] for p in parts) for k in parts[0]["nat"]}
    out["give"] = {k: sum(p["give"][k] for p in parts) for k in parts[0]["give"]}
    return out


def chase_row(o, cfg, players):
    H = cfg["hours"]
    h, gsum, gmax, gn = o["gh"]
    total = int(o["cnt"].sum())
    L = o["longest"] / 3600
    f10 = o["first10"] / 3600
    t4, t10, coup = f10[:, 3], f10[:, 9], o["coup"] / 3600
    ptsh = o["pts_acc"][0] / o["pts_acc"][1] * 3600 if o["pts_acc"][1] else float("nan")
    return dict(
        items_per_h=total / players / H,
        gap_mean_h=gsum / gn / 3600,
        gap_med_h=hq(h, 50) / 3600,
        gap_p90_h=hq(h, 90) / 3600,
        gap_p99_h=hq(h, 99) / 3600,
        gap_max_h=gmax / 3600,
        gap_lt30m=h[:1800].sum() / gn,
        gap_lt1h=h[:3600].sum() / gn,
        gap_gt2h=h[7200:].sum() / gn,
        pity_rate=o["forced"] / total,
        elite_share=o["elite"] / total,
        pts_per_h=ptsh,
        pity_nominal_h=PITY / ptsh,
        longest_med_h=q(L, 50),
        longest_p99_h=q(L, 99),
        longest_max_h=float(L.max()),
        max_pts_between=o["maxpts"],
        boss_ge500_no_drop=o["viol"],
        n100_p1=q(o["cnt"].astype(float), 1),
        n100_med=q(o["cnt"].astype(float), 50),
        n100_p99=q(o["cnt"].astype(float), 99),
        seal4_dedup_mean_h=float(np.nanmean(t4)),
        seal4_dedup_p90_h=q(t4, 90),
        seal4_dedup_p99_h=q(t4, 99),
        seal4_dedup_unfinished=float(np.isnan(t4).mean()),
        seal4_nodedup_mean_h=float(np.nanmean(coup)),
        seal4_nodedup_p90_h=q(coup, 90),
        seal4_nodedup_p99_h=q(coup, 99),
        seal4_nodedup_unfinished=float(np.isnan(coup).mean()),
        item10_mean_h=float(np.nanmean(t10)),
        item10_p90_h=q(t10, 90),
        item10_p99_h=q(t10, 99),
        item10_unfinished=float(np.isnan(t10).mean()),
    )


def a8_row(o, cfg, players):
    H = cfg["hours"]
    h, gsum, gmax, gn = o["fh"]
    L = o["flong"] / 60
    items = sum(o["nat"].values()) + o["kfire"]
    p95 = hq(h, 95) / 60
    return dict(
        feel_items_per_h=items / players / H,
        feel_events_per_h=o["fevents"] / players / H,
        gap_mean_min=gsum / gn / 60,
        gap_p90_min=hq(h, 90) / 60,
        gap_p95_min=p95,
        gap_p99_min=hq(h, 99) / 60,
        gap_max_min=gmax / 60,
        gap_gt30_frac=h[1800:].sum() / gn,
        longest_med_min=q(L, 50),
        longest_p99_min=q(L, 99),
        longest_max_min=float(L.max()),
        p95_le30=bool(p95 <= 30),
        players_longest_le45=float((L <= 45).mean()),
        guard_per_h=o["kfire"] / players / H,
    )


# ---------- 離線（照 game.js 的 offSettle） ----------
def offline_chunk(args):
    R, star, EC, H_list, N, seed = args
    rng = np.random.default_rng(seed)
    S = SCHEMES["C"]
    lo, hi = STAR_EL[star]
    res = []
    for H in H_list:
        d10 = 3600.0 / R * rng.uniform(0.8, 1.2, (N, 10))
        e10 = rng.integers(lo, hi + 1, (N, 10))
        avg = np.maximum(5, d10.mean(1))
        nR = np.floor(H * 3600 / avg).astype(np.int64)
        nE = np.floor(e10.mean(1) + 0.5).astype(np.int64)  # JS Math.round
        nEc = np.minimum(nE, EC or 10**9)  # roundLoot 也照 EC 只判前幾隻
        pts = np.zeros(N, np.int64)
        cnt = np.zeros(N, np.int64)
        for r in range(int(nR.max())):
            a = nR > r
            for j in range(int(nEc.max())):
                idx = np.nonzero(a & (nEc > j))[0]
                hit = rng.random(len(idx)) < S["pe"]
                pts[idx[~hit]] += W_ELITE
                hh = idx[hit]
                cnt[hh] += 1
                pts[hh] = 0
            idx = np.nonzero(a)[0]
            pts[idx] += W_BOSS
            hit = (rng.random(len(idx)) < S["pb"]) | (pts[idx] >= PITY)
            hh = idx[hit]
            cnt[hh] += 1
            pts[hh] = 0
        res.append((nR, nE, cnt))
    return res


def write(name, rows):
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow({k: (f"{v:.6g}" if isinstance(v, float) else v) for k, v in r.items()})


def load_choice():
    p = os.path.join(OUT, "choice.json")
    return json.load(open(p)) if os.path.exists(p) else {}


def save_choice(**kw):
    c = load_choice()
    c.update(kw)
    json.dump(c, open(os.path.join(OUT, "choice.json"), "w"), ensure_ascii=False, indent=1)


def stars(s):
    return f"{s}★"


def main():
    global POOL, PROCS
    what = sys.argv[1]
    arg = lambda k, d, f: f(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
    P = arg("--players", 100_000, int)
    H = arg("--hours", 100.0, float)
    PROCS = arg("--procs", os.cpu_count() or 4, int)
    POOL = Pool(PROCS)
    t_start = time.time()
    ch = load_choice()
    EC = ch.get("EC")
    TG = ch.get("TG")
    log_p = os.path.join(OUT, "runlog.json")
    log = json.load(open(log_p)) if os.path.exists(log_p) else {}

    def prog(*a):
        print(*a, round(time.time() - t_start), "s", flush=True)

    base_cfg = dict(hours=H)
    if what == "selftest":
        # 自我檢查：小規模下保底不漏、點數上限、平機率的件數接近期望
        o = run(dict(base_cfg, R=60, star=5, scheme="C"), 2000, 9)
        assert o["viol"] == 0 and o["maxpts"] <= PITY - 1 + 6 + W_BOSS, o["maxpts"]  # 菁英不觸發必掉：499 + 6 隻菁英 + 王
        o = run(dict(base_cfg, R=25, star=1, open=OPEN["all"], feel=True, K=10), 2000, 10)
        L = o["flong"] / 60
        assert L.max() <= 10 * 144 * 1.2 / 60 + 1e-6, L.max()  # K 隻王 × 最長一輪
        print("selftest ok")
        return
    if what == "base":
        rows = []
        cases = [("A", None), ("B", None), ("C", None)] + ([("C", EC)] if EC else [])
        for i, (s, ec) in enumerate(cases):
            cfg = dict(base_cfg, R=25, star=1, scheme=s, EC=ec)
            o = run(cfg, P, 100 + i)
            rows.append(dict(scheme=s + (f"+EC{ec}" if ec else ""), rounds_h=25, star=stars(1), EC=ec or "不限", **chase_row(o, cfg, P)))
            prog("base", s, ec)
        write("chase_base.csv", rows)
    if what == "speed":
        rows = []
        cells = [(60, 5, 1), (40, 5, 1), (60, 3, 1), (25, 1, 1), (25, 3, 1), (90, 5, 1), (60, 5, 2)]
        sid = 200
        for ec in (None, 4, 3, 2):
            for R, s, em in cells:
                cfg = dict(base_cfg, R=R, star=s, scheme="C", EC=ec, emul=em)
                o = run(cfg, P, sid)
                sid += 1
                r = chase_row(o, cfg, P)
                rows.append(dict(EC=ec or "不限", rounds_h=R, star=stars(s), elite_x=em, stress="是" if (R == 90 or em == 2) else "", **r))
                prog("speed", ec, R, s, em)
        write("speed_floor.csv", rows)
        # 選 EC：(60,5★) 平均間隔 ≥0.5 時的候選裡取上限最寬的。上限只會拿掉判定，越寬對低星（1★ 最多 2 隻、3★ 最多 4 隻菁英）影響越小
        ok = [r for r in rows if r["rounds_h"] == 60 and r["star"] == "5★" and r["elite_x"] == 1 and r["gap_mean_h"] >= 0.5]
        order = ["不限", 4, 3, 2]
        best = min(ok, key=lambda r: order.index(r["EC"]))
        save_choice(EC=None if best["EC"] == "不限" else best["EC"])
        print("選定 EC", best["EC"])
    if what == "sens":
        rows = []
        for i, (R, s) in enumerate(GRID):
            cfg = dict(base_cfg, R=R, star=s, scheme="C", EC=EC)
            o = run(cfg, P, 300 + i)
            r = chase_row(o, cfg, P)
            keep = ["items_per_h", "gap_mean_h", "gap_med_h", "gap_p90_h", "gap_p99_h", "gap_max_h", "pity_rate", "pts_per_h", "pity_nominal_h", "elite_share", "longest_p99_h", "max_pts_between", "boss_ge500_no_drop"]
            rows.append(dict(EC=EC or "不限", rounds_h=R, star=stars(s), **{k: r[k] for k in keep}))
            prog("sens", R, s)
        write("chase_sens.csv", rows)
    if what == "offline":
        Hs = (1, 4, 8, 12)
        sizes = [P // PROCS + (1 if i < P % PROCS else 0) for i in range(PROCS)]
        parts = POOL.map(offline_chunk, [(25, 1, EC, Hs, n, [SEED, 400, i]) for i, n in enumerate(sizes)])
        rows = []
        for hi_, Hh in enumerate(Hs):
            nR = np.concatenate([p[hi_][0] for p in parts])
            nE = np.concatenate([p[hi_][1] for p in parts])
            c = np.concatenate([p[hi_][2] for p in parts]).astype(float)
            rows.append(dict(scheme="C", EC=EC or "不限", rounds_h=25, star="1★", offline_h=Hh, rounds_mean=nR.mean(), elites_per_round=nE.mean(), items_mean=c.mean(), items_p1=q(c, 1), items_med=q(c, 50), items_p99=q(c, 99), p_zero=(c == 0).mean()))
        write("chase_offline.csv", rows)
        prog("offline")
    if what == "a8base":
        A = OPEN["all"]
        cases = [
            ("無保底・無追逐", "all", False, None),
            ("無保底＋追逐", "all", True, None),
            ("保底 TG=1500＋追逐", "all", True, 1500),
            ("保底 TG=1800＋追逐", "all", True, 1800),
            ("保底 TG=2100＋追逐", "all", True, 2100),
        ]
        tg = TG or 1800
        cases += [(f"鍛造台 17–18 保底 TG={tg}＋追逐", "f17", True, tg), (f"鍛造台 13–16 保底 TG={tg}＋追逐", "f13", True, tg)]
        rows = []
        for i, (nm, op, chs, tgx) in enumerate(cases):
            K = K_of(tgx, 25) if tgx else None
            cfg = dict(base_cfg, R=25, star=1, scheme="C", EC=EC, chase=chs, open=OPEN[op], feel=True, K=K)
            o = run(cfg, P, 500 + i)
            rows.append(dict(case=nm, open=op, chase="C" if chs else "", EC=(EC or "不限") if chs else "", TG=tgx or "", K=K or "", rounds_h=25, star="1★", **a8_row(o, cfg, P)))
            prog("a8base", nm)
        write("a8_base.csv", rows)
    if what in ("a8sens", "econ"):
        res = {}
        opens = ["all"] if what == "a8sens" else ["all", "f17", "f13"]
        tgs = (1500, 1800, 2100) if what == "a8sens" else (TG,)
        sid = 600 if what == "a8sens" else 700
        rows, erows = [], []
        for op in opens:
            for tg in tgs:
                for R, s in GRID:
                    K = K_of(tg, R)
                    cfg = dict(base_cfg, R=R, star=s, scheme="C", EC=EC, chase=True, open=OPEN[op], feel=True, K=K)
                    o = run(cfg, P, sid)
                    sid += 1
                    if what == "a8sens":
                        rows.append(dict(TG=tg, K=K, rounds_h=R, star=stars(s), open=op, EC=EC or "不限", **a8_row(o, cfg, P)))
                    else:
                        e = dict(open=op, TG=tg, K=K, rounds_h=R, star=stars(s), guard_per_h=o["kfire"] / P / H)
                        for k in ROT:
                            natk = o["nat"][k] / P / H
                            g = o["give"][k] / P / H
                            e[f"{k}_nat_h"] = natk
                            e[f"{k}_guard_h"] = g
                            e[f"{k}_inc_pct"] = (100 * g / natk) if natk else (float("nan") if not g else float("inf"))
                        erows.append(e)
                    prog(what, op, tg, R, s)
        if what == "a8sens":
            write("a8_sens.csv", rows)
            good = []
            for tg in tgs:
                rs = [r for r in rows if r["TG"] == tg]
                if all(r["p95_le30"] and r["players_longest_le45"] == 1.0 for r in rs):
                    good.append((sum(r["guard_per_h"] for r in rs), tg))
            fails = {tg: [f"{r['rounds_h']}/{r['star']}" for r in rows if r["TG"] == tg and not (r["p95_le30"] and r["players_longest_le45"] == 1.0)] for tg in tgs}
            save_choice(TG=min(good)[1] if good else None, a8_fails=fails)
            print("選定 TG", min(good)[1] if good else None, fails)
        else:
            write("guard_econ.csv", erows)
    log.setdefault("sec", {})[what] = round(time.time() - t_start, 1)
    log.update(seed=SEED, players=P, hours=H, procs=PROCS, numpy=np.__version__)
    json.dump(log, open(log_p, "w"), ensure_ascii=False, indent=1)
    POOL.close()


if __name__ == "__main__":
    main()
