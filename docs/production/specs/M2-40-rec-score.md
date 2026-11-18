# 技能面板輔助推薦分數（v1.0）

> 現行規格，只放目前有效的內容；決定與調整記在 [`CHANGELOG.md`](../CHANGELOG.md)。
>
> 依據 main `2205bc5`。此版是要實作的新規則，不是現行程式行為。

## 現況問題

挑選輔助時，`pickRows`（`js/skpanel.js:720-728`）用 `skillNums` → `skMain` 當分數。`skillNums`（`js/skills.js:260-286`）呼叫 `hitCalc(c, null, {avg:1, keep:1, …})`：無目標，不含護甲、抗性、閃避／命中、異常。`hitCalc` 在 `o.avg` 時於 `js/combat.js:906-930` 提早返回，還沒走到減傷（`973-1010`）；`m` 為 null 時減傷也會跳過（`988-990`）。每秒分母只有 `max(actDur, cd)`，所以彈匣、榴彈、蓄力的每秒偏高。四顆附加元素 I 都是 `0.25/(1＋原傷害)`，約 +21%，清單分不出差別。

## 目標：「這張圖的代表普通怪」

用 `mobDef`（`js/combat.js:203-216`）取該圖階級 `G.mapT||1` 的普通怪（非菁英、非王）護甲與閃避。

- 護甲：`(m.D.arm || 0.3) * m.D.hp * tierMul(t).hp * 0.5`，再乘 `1 + MM('marm')/100`。
- 閃避：`mobEv(mobLv(t), m)`＝`6 * 怪物Lv * 1.57`。
- 抗性：火／冰／閃／混沌基礎 0；地圖詞 `mres` 只加在火／冰／閃（與 `mobDef` 一致，不加混沌）。`MOBS[k].el` 且不是 `'phys'` 時，該屬性抗性改為 40，火／冰／閃再加 `mres`。王的 25 元素抗性不用。
- 在地圖中、能取得本圖已抽出的群（`G.waves` 的種類次數）時，按次數加權平均分數。尚未抽群則用抽群池的種類次數（一般是 `PACKS`；心魔幻境有一半改抽 `ARMY.packs`，`js/game.js:535`）。拿不到池時，用一隻無元素普通怪（建議 `MOBS.slime`）。
- 王與練習區稻草人（`m.dummy`）不用於推薦。練習區只用該練習階級的代表普通怪，不用稻草人本身。

## 擊中每秒

擊中每秒＝減傷後期望傷害（護甲、抗性、穿透）× 命中率 ÷ 有效週期。

- 期望傷害先走與面板相同的 `hitCalc` 平均（含暴擊期望、附加、轉換、提高、更多），但必須對代表怪做完減傷，不可沿用 `o.avg` 的提早返回。需要分屬性的 `pre`（異常基礎也用它）。多段 `D.hits` 與 `c.volley` 乘在「每次施放的期望傷害」上，不要再除一次多段來當週期。
- 物理減傷：`min(0.9, arm/(arm + 10*v + 1))`，再扣鎮壓／壓碎（有才算）。元素／混沌：`resOf(m, k, ST.pen + ST[penF/penC/penL] + c.pen)`，傷害 × `(1 − 抗性/100)`。堅韌 `toughOf` 一併除。推薦不假設感電、完全破甲、受招架已掛在怪身上。
- 命中率：法術或必中（`ST.noMiss`／`ST.noEvade`）＝1；攻擊＝`hitChance(ST.acc, ev)`＝`clamp(0.05, 1, 1.25*acc/(acc+0.3*ev))`（`js/combat.js:176-177`）。不計致盲、地圖詞 `pacc`。
- 有效週期：
  - 一般：`max(actDur(c), c.cd)`。
  - 彈匣招（`D.ammo [clip0, reload]`）：`(clip × actDur + reload/(1+ST.reloadP/100)) / clip`。`clip = clipOf(D)`＝`max(1, ceil((ammo[0]+ST.ammoN)/(ST.heavyAmmo?2:1)))`。
  - 榴彈（`D.gren [n, cd]`）：`max(actDur, cd' / (n+ST.grenUse))`，其中 `cd' = cd/(1+ST.grenCd/100)`。沒有 `grenUse` 時分母就是 `n`。
  - 蓄力（`D.charge`）：按自動模式蓄滿 `max` 段。週期＝`actDur + max×step`（程式蓄力速度還乘 `1+0.2×品質`，實作請用 `(max×step)/(1+0.2×q) + actDur`，與 `js/ai.js:181-186`、`js/skills.js:650-663` 一致）。傷害含滿段更多：`c.mult × (1 + more×max/100)`（蓄力重砸 `more=100`、`max=3` → ×4）。

## 異常加分

每秒擊中次數 `H = (段數 × volley × 命中率) / 有效週期`。覆蓋率上限 1。無縛、執政官等已存在於目前 `c`／`ST` 的加成要算進去；濕透、鹹水、藥劑催毒等不假設為開著。

- **點燃**（`js/combat.js:1137-1162`，易燃 `flamAdd` 421-424，`ailBase` 1082-1086）：火焰基礎 `igB = ailBase(pre, 'ign')`（通常是 `pre.fire`；火焰塑造者另加物理／冰／閃）。單次點燃期望 `P = min(1, Δflam/100)`，`Δflam = (igB / thrF) × 20 × ub × fA × (1+(ST.flamP+ST.ailCh)/100)`，`thrF = ailThr(t)×MOB_HP`（推薦 `ailLow=1`）。持續 `T = 4 × (ST.ember?0.75:1) × (1+ST.ignDur/100)`。覆蓋率 `cov = min(1, P×T×H)`。加分＝`igB × 0.2 × 點燃傷害加成 × cov`。點燃傷害加成＝`(1+(ST.ailMag+c.ailMag)/100 + ST.ignMag/100 + ST.shaper/100) × (1+ST.ember/100)`。`P` 只進覆蓋率，不要再乘一次。
- **感電**（`js/combat.js:1179-1194`；受到的傷害提高 20%，`takenInc` 489）：`P = min(1, ((((pre.light+keep.light)/thrL)×100)/4) × ub × lA × (1+(ST.shockCh+ST.ailCh)/100) × (1+(c.shockMore||0)/100) / 100)`。持續 `T = 8 × (1+ST.shockDur/100)`。覆蓋率 `cov = min(1, P×T×H)`。加分＝擊中每秒 × 20% × cov。
- **中毒**：只在 `ST.poisonCh + c.poisonCh > 0` 時加（`js/combat.js:1247-1263`）。`P = min(1, (ST.poisonCh+c.poisonCh)×(1+ST.ailCh/100)/100)`。每層每秒＝`ailBase(pre,'poi')×0.2×(1+(ST.ailMag+c.ailMag)/100+ST.poiMag/100)×(1+(ST.volDot×stkN('vol'))/100)`。持續 `T = 2×(1+ST.poiDur/100)`。層數上限 `n = 1+ST.poiStack+(c.poiStack||0)`。加分＝每層每秒 × `min(n, P×T×H)`。
- **冰凍**：不計分，只標籤（有冰冷傷害且非 `c.noFrz` 時可標「冰凍」）。冰緩也不計分。
- **範圍**：不計分，沿用 `fxDiff`「範圍 +N%」（還有速度、冷卻、魔力消耗、擊退）。

總分＝擊中每秒＋點燃加分＋感電加分＋中毒加分。差＝插上後總分 − 現況總分。

## 顯示與排序

- 顯示：「▲ 每秒 +N（p%）」並加標「對本圖怪物（含抗性）」。單位仍用 `unitOf`（沒有每秒時維持「每下」等）。下跌用「▼」。標籤與數字在 390×844、1280×720 都不可被切掉。
- 「差不多」：與現況的相對差 ≤2%（分母為現況總分）或絕對差 ≤0.5／秒，右邊寫「差不多」，不標 ▲／▼。兩顆輔助互比也用同一門檻。
- 排序仍用分數差；`fx` 微加 0.001 保留（`js/skpanel.js:795` 的 `score`）。技能清單的四組排序（PR #55，`grp`）不變。
- 推薦名單仍用現行 `recOK`（`|差|>0.5` 或有 `fx`）。

## 驗收

- `check.js`：對火焰抗性 40 的代表怪，附加火焰分數 < 附加冰冷；附加閃電因感電高於同直傷的附加混沌；穿甲彈有效週期含裝填（大於 `max(actDur,cd)`）；榴彈每秒 ≤ 舊值（舊值＝只除 `max(actDur,cd)`）。
- 在 390×844 與 1280×720 截圖：四顆附加元素數字不同，標籤「對本圖怪物（含抗性）」不被切。
- 數值常數、存檔版本不變。

## 待製作人定（只列建議）

- 建議：自動模式在無目標 ≥1 秒且彈匣未滿時提前裝填。
- 手動裝填鍵：M2 不做。
