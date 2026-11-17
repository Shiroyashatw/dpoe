"""M2-17 追逐掉落規格的蒙地卡羅模擬（只量不改，不碰遊戲程式）。

用法：python3 evidence/m2-17/sim.py [base|sens|offline|a8|all] [--players N] [--hours H]
輸出：同資料夾的 chase_base.csv、chase_sens.csv、chase_offline.csv、a8.csv（與 runlog_<段>.json 紀錄執行時間、種子）。

模型（照 js/craft.js、js/game.js）：
- 一輪 = 小怪（預設 40）+ 菁英（STAR_DROP.el 的均勻整數）+ 1 隻輪末王；一輪秒數 = 3600/R × U(0.8, 1.2)。
- 菁英的擊殺時間在輪內均勻（排序後依序處理），王在輪末；小怪只在 A8 的珠寶用到。
- prdRoll：第 n 次的機率 = min(1, C·n)，C 照 craft.js 的 prdC 二分法（40 次）解。
- 追逐保底用整數：王 +5、菁英 +1（只在沒中時加）、上限 500；王先加點，≥500 必掉，否則擲骰。
- 任何一件追逐物品掉落 → 點數歸零（PRD 模式另把王、菁英兩個計數器歸零）。
- 不模擬死亡（死亡只會拉長空窗）。
"""

import csv
import json
import math
import os
import sys
import time

import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
SEED = 20261117
STAR_EL = {1: (1, 2), 2: (2, 3), 3: (3, 4), 4: (4, 5), 5: (5, 6)}
N_SMALL = 40
PITY = 500
W_BOSS, W_ELITE = 5, 1


# ---------- craft.js 的 prdC / prdMax（照抄演算法） ----------
_PRDC = {}


def prdC(p):
    key = round(p * 1e6)
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


def prdMax(p):
    return math.ceil(1 / prdC(p))


SCHEMES = {
    "A": dict(prd=True, pb=0.02, pe=0.002, d="草案字面：王 prdRoll(2%)、菁英 prdRoll(0.2%)、保底 500"),
    "B": dict(prd=False, pb=0.02, pe=0.002, d="平機率：王 2%、菁英 0.2%、保底 500"),
    "C": dict(prd=False, pb=0.014, pe=0.0014, d="平機率：王 1.4%、菁英 0.14%、保底 500"),
}


def q(a, p):
    return float(np.percentile(a, p)) if len(a) else float("nan")


# ---------- 追逐物品：線上 ----------
def sim_chase(sch, R, star, players, hours, rng):
    S = SCHEMES[sch]
    T = hours * 3600.0
    N = players
    lo, hi = STAR_EL[star]
    Cb = prdC(S["pb"]) if S["prd"] else None
    Ce = prdC(S["pe"]) if S["prd"] else None
    t = np.zeros(N)
    pts = np.zeros(N, np.int64)
    cb = np.zeros(N, np.int64)
    ce = np.zeros(N, np.int64)
    last = np.zeros(N)
    wsum = np.zeros(N, np.int64)  # 上次掉落後的等值擊殺（含掉落那一下）
    bsum = np.zeros(N, np.int64)  # 上次掉落後的王數（含掉落那隻）
    cnt = np.zeros(N, np.int64)
    forced_n = 0
    maxw = np.zeros(N, np.int64)
    maxb = np.zeros(N, np.int64)
    longest = np.zeros(N)
    first10 = np.full((N, 10), np.nan)
    seen = np.zeros(N, np.int64)  # 無重複保護：4 種王印的位元
    coup = np.full(N, np.nan)
    gaps = []
    pts_rate_acc = [0.0, 0.0]  # 點數、秒數（名目保底小時）
    full = 15

    def drop(idx, tt, forced):
        nonlocal forced_n
        g = tt - last[idx]
        gaps.append(g)
        np.maximum.at(longest, idx, g)
        np.maximum.at(maxw, idx, wsum[idx])
        np.maximum.at(maxb, idx, bsum[idx])
        k = cnt[idx]
        m = k < 10
        first10[idx[m], k[m]] = tt[m]
        cnt[idx] += 1
        typ = rng.integers(0, 4, len(idx))
        seen[idx] |= 1 << typ
        nc = (seen[idx] == full) & np.isnan(coup[idx])
        coup[idx[nc]] = tt[nc]
        forced_n += int(forced.sum()) if forced is not None else 0
        last[idx] = tt
        pts[idx] = 0
        cb[idx] = 0
        ce[idx] = 0
        wsum[idx] = 0
        bsum[idx] = 0

    while True:
        act = t < T
        if not act.any():
            break
        ai = np.nonzero(act)[0]
        n = len(ai)
        d = 3600.0 / R * rng.uniform(0.8, 1.2, n)
        E = rng.integers(lo, hi + 1, n)
        et = np.sort(rng.uniform(0, 1, (n, hi)), axis=1) * d[:, None]
        pts_rate_acc[0] += float((E * W_ELITE + W_BOSS).sum())
        pts_rate_acc[1] += float(d.sum())
        for j in range(hi):
            m = (E > j) & (t[ai] + et[:, j] < T)
            idx = ai[m]
            if not len(idx):
                continue
            wsum[idx] += W_ELITE
            u = rng.random(len(idx))
            if S["prd"]:
                nn = ce[idx] + 1
                hit = u < np.minimum(1, Ce * nn)
                ce[idx] = np.where(hit, 0, nn)
            else:
                hit = u < S["pe"]
            pts[idx[~hit]] += W_ELITE
            if hit.any():
                h = idx[hit]
                drop(h, t[h] + et[m][hit, j], np.zeros(len(h), bool))
        tb = t[ai] + d
        m = tb < T
        idx = ai[m]
        wsum[idx] += W_BOSS
        bsum[idx] += 1
        pts[idx] += W_BOSS
        forced = pts[idx] >= PITY
        u = rng.random(len(idx))
        if S["prd"]:
            nn = cb[idx] + 1
            hit = u < np.minimum(1, Cb * nn)
            cb[idx] = np.where(hit, 0, nn)
        else:
            hit = u < S["pb"]
        hit = hit | forced
        if hit.any():
            h = idx[hit]
            drop(h, tb[m][hit], forced[hit])
        t[ai] = tb
    # 100 小時結束時還沒結束的那段
    tail = T - last
    longest = np.maximum(longest, tail)
    maxw = np.maximum(maxw, wsum)
    maxb = np.maximum(maxb, bsum)
    gaps = np.concatenate(gaps) / 3600.0
    ptsh = pts_rate_acc[0] / pts_rate_acc[1] * 3600
    total = int(cnt.sum())
    f10 = first10 / 3600.0
    t4 = f10[:, 3]
    t10 = f10[:, 9]
    coup = coup / 3600.0
    row = dict(
        scheme=sch,
        rounds_h=R,
        star=star,
        players=N,
        hours=hours,
        items_per_h=total / N / hours,
        gap_mean_h=gaps.mean(),
        gap_med_h=q(gaps, 50),
        gap_p90_h=q(gaps, 90),
        gap_p99_h=q(gaps, 99),
        gap_max_h=gaps.max(),
        gap_lt30m=(gaps < 0.5).mean(),
        gap_lt1h=(gaps < 1).mean(),
        gap_gt2h=(gaps > 2).mean(),
        pity_rate=forced_n / total,
        pts_per_h=ptsh,
        pity_nominal_h=PITY / ptsh,
        longest_med_h=q(longest / 3600, 50),
        longest_p99_h=q(longest / 3600, 99),
        longest_max_h=longest.max() / 3600,
        max_kill_eq=int(maxw.max()),
        a9_kill_eq_le500=bool(maxw.max() <= PITY),
        max_boss_since_drop=int(maxb.max()),
        a9_boss_le100=bool(maxb.max() <= PITY // W_BOSS),
        n100_p1=q(cnt, 1),
        n100_med=q(cnt, 50),
        n100_p99=q(cnt, 99),
        seal4_dedup_mean_h=np.nanmean(t4),
        seal4_dedup_p90_h=q(t4[~np.isnan(t4)], 90),
        seal4_dedup_p99_h=q(t4[~np.isnan(t4)], 99),
        seal4_dedup_unfinished=float(np.isnan(t4).mean()),
        seal4_nodedup_mean_h=np.nanmean(coup),
        seal4_nodedup_p90_h=q(coup[~np.isnan(coup)], 90),
        seal4_nodedup_p99_h=q(coup[~np.isnan(coup)], 99),
        seal4_nodedup_unfinished=float(np.isnan(coup).mean()),
        item10_mean_h=np.nanmean(t10),
        item10_p90_h=q(t10[~np.isnan(t10)], 90),
        item10_p99_h=q(t10[~np.isnan(t10)], 99),
        item10_unfinished=float(np.isnan(t10).mean()),
    )
    return row


# ---------- 追逐物品：離線（照 game.js 的 offSettle） ----------
def sim_offline(sch, R, star, players, H_list, rng):
    """offSettle：n = floor(min(離開, 倉房上限) / 最近 10 輪平均秒數)；每輪 roundLoot(nS, nE)，nE = Math.round(最近 10 輪菁英平均)，
    roundLoot 先殺小怪、再殺 nE 隻菁英、最後王（沒有時間，只有順序）。從點數 0 起算。"""
    S = SCHEMES[sch]
    lo, hi = STAR_EL[star]
    N = players
    rows = []
    for H in H_list:
        d10 = 3600.0 / R * rng.uniform(0.8, 1.2, (N, 10))
        e10 = rng.integers(lo, hi + 1, (N, 10))
        avg = np.maximum(5, d10.mean(1))
        nRounds = np.floor(H * 3600 / avg).astype(np.int64)
        nE = np.floor(e10.mean(1) + 0.5).astype(np.int64)  # JS Math.round
        pts = np.zeros(N, np.int64)
        cb = np.zeros(N, np.int64)
        ce = np.zeros(N, np.int64)
        cnt = np.zeros(N, np.int64)
        Cb = prdC(S["pb"]) if S["prd"] else None
        Ce = prdC(S["pe"]) if S["prd"] else None
        for r in range(int(nRounds.max())):
            act = nRounds > r
            for j in range(int(nE.max())):
                idx = np.nonzero(act & (nE > j))[0]
                u = rng.random(len(idx))
                if S["prd"]:
                    nn = ce[idx] + 1
                    hit = u < np.minimum(1, Ce * nn)
                    ce[idx] = np.where(hit, 0, nn)
                else:
                    hit = u < S["pe"]
                pts[idx[~hit]] += W_ELITE
                h = idx[hit]
                cnt[h] += 1
                pts[h] = cb[h] = ce[h] = 0
            idx = np.nonzero(act)[0]
            pts[idx] += W_BOSS
            forced = pts[idx] >= PITY
            u = rng.random(len(idx))
            if S["prd"]:
                nn = cb[idx] + 1
                hit = u < np.minimum(1, Cb * nn)
                cb[idx] = np.where(hit, 0, nn)
            else:
                hit = u < S["pb"]
            h = idx[hit | forced]
            cnt[h] += 1
            pts[h] = cb[h] = ce[h] = 0
        rows.append(
            dict(
                scheme=sch,
                rounds_h=R,
                star=star,
                hours=H,
                rounds_mean=nRounds.mean(),
                elites_per_round=nE.mean(),
                items_mean=cnt.mean(),
                items_p1=q(cnt, 1),
                items_med=q(cnt, 50),
                items_p99=q(cnt, 99),
                p_zero=(cnt == 0).mean(),
                pts_end_mean=pts.mean(),
            )
        )
    return rows


# ---------- A8：有感掉落合計空窗 ----------
NEW_P = {"frac": (0, 0.005, 0.02), "perf": (0, 0.0025, 0.01), "ink": (0, 0, 0.03), "jw": (0.0005, 0.005, 0.02)}


def sim_a8(name, R, star, players, hours, rng, open_, chase, K=None, kfix=None):
    """open_：開了哪些（frac／perf／ink／jw）；chase：加方案 C；K：有感保底（連續 K 隻輪末王都沒有有感掉落，第 K 隻必掉）。
    小怪的珠寶：一輪 40 隻依序擲 prdRoll，每輪最多算 1 顆（第二顆機率可忽略），時間在輪內均勻。"""
    T = hours * 3600.0
    N = players
    lo, hi = STAR_EL[star]
    keys = [k for k in open_]
    # 計數器：每種 × 每種怪
    C = {(k, kind): prdC(NEW_P[k][kind]) for k in keys for kind in range(3) if NEW_P[k][kind]}
    ctr = {kk: np.zeros(N, np.int64) for kk in C}
    S = SCHEMES["C"]
    pts = np.zeros(N, np.int64)
    t = np.zeros(N)
    last = np.zeros(N)
    longest = np.zeros(N)
    bsince = np.zeros(N, np.int64)
    items = 0
    events = 0
    forcedK = 0
    gaps = []
    ar = np.arange(1, N_SMALL + 1)
    hasJ0 = ("jw", 0) in C
    while True:
        act = t < T
        if not act.any():
            break
        ai = np.nonzero(act)[0]
        n = len(ai)
        d = 3600.0 / R * rng.uniform(0.8, 1.2, n)
        E = rng.integers(lo, hi + 1, n)
        et = np.sort(rng.uniform(0, 1, (n, hi)), axis=1) * d[:, None]
        ev = np.full((n, hi + 2), np.nan)  # 本輪有感事件的時間（相對）：小怪珠寶、每隻菁英、王
        # 小怪的珠寶
        if hasJ0:
            c0 = ctr[("jw", 0)][ai]
            qm = np.minimum(1, C[("jw", 0)] * (c0[:, None] + ar[None, :]))
            hm = rng.random((n, N_SMALL)) < qm
            anyh = hm.any(1)
            k = np.argmax(hm, 1)  # 第一顆的位置（0 起）
            ctr[("jw", 0)][ai] = np.where(anyh, N_SMALL - 1 - k, c0 + N_SMALL)
            tm = (k + rng.random(n)) / N_SMALL * d
            ev[anyh, 0] = tm[anyh]
            items += int(anyh[t[ai] + tm < T].sum())
        # 菁英
        for j in range(hi):
            m = E > j
            idx = ai[m]
            got = np.zeros(len(idx), np.int64)
            for kk, c in C.items():
                if kk[1] != 1:
                    continue
                nn = ctr[kk][idx] + 1
                h = rng.random(len(idx)) < np.minimum(1, c * nn)
                ctr[kk][idx] = np.where(h, 0, nn)
                got += h
            if chase:
                h = rng.random(len(idx)) < S["pe"]
                pts[idx[~h]] += W_ELITE
                pts[idx[h]] = 0
                got += h
            col = np.full(n, np.nan)
            col[np.nonzero(m)[0][got > 0]] = et[m, j][got > 0]
            ev[:, 1 + j] = col
            inT = t[idx] + et[m, j] < T
            items += int(got[inT].sum())
        # 王
        got = np.zeros(n, np.int64)
        for kk, c in C.items():
            if kk[1] != 2:
                continue
            nn = ctr[kk][ai] + 1
            h = rng.random(n) < np.minimum(1, c * nn)
            ctr[kk][ai] = np.where(h, 0, nn)
            got += h
        if chase:
            pts[ai] += W_BOSS
            h = (pts[ai] >= PITY) | (rng.random(n) < S["pb"])
            pts[ai[h]] = 0
            got += h
        before = ~np.isnan(ev[:, : hi + 1]).all(1)  # 本輪王之前已有有感掉落
        bs = np.where(before, 0, bsince[ai]) + 1
        fK = np.zeros(n, bool)
        if K is not None:
            fK = (got == 0) & (bs >= K)
            got += fK
        bsince[ai] = np.where(got > 0, 0, bs)
        ev[got > 0, hi + 1] = d[got > 0]
        inT = t[ai] + d < T
        items += int(got[inT].sum())
        forcedK += int(fK[inT].sum())
        # 空窗
        evs = np.sort(ev, 1) + t[ai][:, None]
        for c in range(hi + 2):
            x = evs[:, c]
            m = ~np.isnan(x) & (x < T)
            idx = ai[m]
            g = x[m] - last[idx]
            gaps.append(g)
            np.maximum.at(longest, idx, g)
            last[idx] = x[m]
            events += int(m.sum())
        t[ai] += d
    longest = np.maximum(longest, T - last)
    gaps = np.concatenate(gaps) / 60.0
    L = longest / 60.0
    return dict(
        case=name,
        rounds_h=R,
        star=star,
        K=K if K is not None else "",
        open="+".join(open_) + ("+chaseC" if chase else ""),
        players=N,
        hours=hours,
        items_per_h=items / N / hours,
        events_per_h=events / N / hours,
        gap_mean_min=gaps.mean(),
        gap_p90_min=q(gaps, 90),
        gap_p99_min=q(gaps, 99),
        gap_gt30_frac=(gaps > 30).mean(),
        longest_med_min=q(L, 50),
        longest_p99_min=q(L, 99),
        longest_max_min=L.max(),
        players_longest_le30=(L <= 30).mean(),
        kpity_per_h=forcedK / N / hours,
    )


def write(name, rows):
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow({k: (f"{v:.6g}" if isinstance(v, float) else v) for k, v in r.items()})


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    P = int(sys.argv[sys.argv.index("--players") + 1]) if "--players" in sys.argv else 100_000
    H = float(sys.argv[sys.argv.index("--hours") + 1]) if "--hours" in sys.argv else 100.0
    log_p = os.path.join(OUT, f"runlog_{what}.json")
    log = json.load(open(log_p)) if os.path.exists(log_p) else {}
    log["seed"] = SEED
    log["prd"] = {
        str(p): {"C": prdC(p), "prdMax": prdMax(p)} for p in (0.02, 0.002, 0.014, 0.0014, 0.005, 0.0025, 0.01, 0.03, 0.0005)
    }

    # 每個情境的種子 = [SEED, 序號]，固定可重現
    def rg(i):
        return np.random.default_rng([SEED, i])

    if what in ("base", "all"):
        t0 = time.time()
        rows = [sim_chase(s, 25, 1, P, H, rg(i)) for i, s in enumerate("ABC")]
        write("chase_base.csv", rows)
        log.setdefault("sec", {})["base"] = round(time.time() - t0, 1)
        print("base", log["sec"]["base"], flush=True)
    if what in ("sens", "all"):
        t0 = time.time()
        rows = []
        i = 100
        for R in (12, 25, 40, 60):
            for st in (1, 3, 5):
                rows.append(sim_chase("C", R, st, P, H, rg(i)))
                i += 1
                print("sens", R, st, round(time.time() - t0), flush=True)
        write("chase_sens.csv", rows)
        log.setdefault("sec", {})["sens"] = round(time.time() - t0, 1)
    if what in ("offline", "all"):
        t0 = time.time()
        rows = sim_offline("C", 25, 1, P, (1, 4, 8, 12), rg(200))
        write("chase_offline.csv", rows)
        log.setdefault("sec", {})["offline"] = round(time.time() - t0, 1)
        print("offline", log["sec"]["offline"], flush=True)
    if what in ("a8", "all"):
        t0 = time.time()
        ALL = ["frac", "perf", "ink", "jw"]
        cases = [
            ("a 全開・無追逐", 25, 1, ALL, False, None),
            ("b 全開＋追逐", 25, 1, ALL, True, None),
            ("c 全開＋追逐＋K=10", 25, 1, ALL, True, 10),
            ("d 破裂墨珠寶＋追逐＋K=10", 25, 1, ["frac", "ink", "jw"], True, 10),
            ("e 只破裂＋追逐＋K=10", 25, 1, ["frac"], True, 10),
            ("f 自適應 K=5（12 輪/時）", 12, 1, ALL, True, max(3, 1500 // 300)),
            ("f 自適應 K=25（60 輪/時）", 60, 1, ALL, True, max(3, 1500 // 60)),
            ("f 對照 K=10（12 輪/時）", 12, 1, ALL, True, 10),
            ("f 對照 K=10（60 輪/時）", 60, 1, ALL, True, 10),
            ("f 對照 K=10（25 輪/時 3★）", 25, 3, ALL, True, 10),
            ("f 對照 K=10（25 輪/時 5★）", 25, 5, ALL, True, 10),
            ("參考 b 無 K（12 輪/時）", 12, 1, ALL, True, None),
            ("參考 b 無 K（60 輪/時）", 60, 1, ALL, True, None),
        ]
        rows = []
        for i, (nm, R, st, op, ch, K) in enumerate(cases):
            rows.append(sim_a8(nm, R, st, P, H, rg(300 + i), op, ch, K))
            print("a8", nm, round(time.time() - t0), flush=True)
        write("a8.csv", rows)
        log.setdefault("sec", {})["a8"] = round(time.time() - t0, 1)
    log["players"] = P
    log["hours"] = H
    log["numpy"] = np.__version__
    json.dump(log, open(log_p, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
