# 剩餘小畫面 v1.0・第 2 份：彈窗、橫幅、練習區、開場與標題（1280×720 定稿）

共用殼、D2 token 對照、禁止配對、定案與範圍見第 1 份 [`small-screens-spec.md`](small-screens-spec.md)（§0–§2）。交接 [`small-screens-handoff.md`](small-screens-handoff.md)；驗收 [`REVIEW-CHECKLIST.md`](../../evidence/small-screens/REVIEW-CHECKLIST.md)。

**非核心畫面跳過上色示意圖。實作必套 D2 正式色票，不可照線框做成白底灰框。** 座標為 1280×720 舞台 CSS px。

## O01 離線結算（離開 ≥ 10 分）

回到遊戲時離開 ≥ 10 分才出（60 秒～10 分只在掛機條寫一行；< 60 秒不出）。全畫面暗幕 `--d2-scrim`；Esc 不關（要選一顆）。

| 元件 | x,y w×h | 內容 | token |
|---|---|---|---|
| 卡 | 430,176 420×320 | — | `--panel`＋2px `--panel-edge` |
| 題 | 454,196 | 「離開 {h} 時 {m} 分」 | 18/700 `--tx-strong` |
| 計數 | 454,230 372×20 | 「王 {n} 隻・靈魂 +{s}」；1.2 秒跑上去；數字寫完整（316,800，不寫 316K） | 14/400 `--tx` |
| 掉落列 | 454,268 372×86，行距 30 | 最多 3 列；圖示格 20×20＋名（x 484）（取代程式的 `★`（完美石）／`◆`）；追逐物品那列放最後，用「印」框標 | 12/400 `--tx`；框標 `--panel-inset`＋`--tx-dim` |
| 接下來 | 454,368 372×16 | `campGoal` 有才寫 | 12/400 `--tx-dim` |
| 去營地升級 | 454,424 176×48 | 「去營地升級」＋第二行鍵位「H」 | `--btn2`；兩行都 `--tx`；熱區 176×48 |
| 收下・繼續刷（主鈕） | 650,424 176×48 | 第二行「Enter」；預設焦點；Enter／Space | `--act`＋`--on-act` |

## D01 倒下・手動模式卡

底下面板、天賦樹、掛機卡先收起。暗幕 `--d2-scrim`。

| 元件 | x,y w×h | 內容 | token |
|---|---|---|---|
| 卡 | 430,150 420×380 | `#over` | `--panel`＋2px `--panel-edge` |
| 題 | 454,170 372 置中 | 「你倒下了」 | 18/700 `--tx-strong`（**不用紅**，style.css 既有） |
| 死因＋地圖詞 | 454,206 372×64 | 「死因：{怪}・{元素} {n} 傷害」`--tx`；「地圖詞：…」`--tx-dim`；「不扣經驗，裝備都還在。」`--tx` | 12/400–14/400 |
| 現在可以升（主鈕） | 454,300 372×56 | 營地下一件事買得起才出（M1-17）：「現在可以升：{設施} Lv {n}」＋第二行成本 | `--act`＋`--on-act`（兩行） |
| 再試一次 | 454,372 372×56 | 第二行「連續倒下 3 次，退回{地點}」（第 3 次時）；沒在地點刷時改「回營地」 | `--btn2`；兩行都 `--tx` |
| 腳註 | 454,450 372 置中 | 「自動模式不出這張卡」 | 只在線框，實機不畫 |

## D02 倒下・自動模式字板

不出卡、不暫停、不擋點擊；面板開著也一樣。戰場中下方字板 440,540 400×44（字 452,550 376 置中）（底 `--d2-plate-world` rgb(37 33 30 / 0.92)＋1px `--border`，14/700 `--tx-strong`）：一般「倒下・2 秒後回到戰場」；連續第 3 次「倒下・2 秒後退回{地點}」。約 2 秒後原地附近重來。不出「已暫停」。

## C01 回營地確認

地圖裡按 T 或更多 › 回營地。暗幕 `--d2-scrim`。

| 元件 | x,y w×h | 內容 | token |
|---|---|---|---|
| 卡 | 470,220 340×220 | `#over`（G.ask＝camp） | `--panel`＋2px `--panel-edge` |
| 題 | 494,242 292 置中 | 「回營地？」 | 18/700 `--tx-strong` |
| 說明 | 494,282 292×44（兩行，行距 22） | 「地上的東西照樣收進倉庫。」＋（自動時）「自動刷圖會暫停。」 | 13/400 `--tx` |
| 回營地（主鈕） | 494,364 136×52 | 第二行「T」；再按 T 也算 | `--act`＋`--on-act` |
| 繼續刷圖 | 650,364 136×52 | 第二行「Esc」 | `--btn2`；兩行都 `--tx` |

## B01 追逐物品橫幅

掉追逐物品時頂列下方全寬橫幅 16,76 1248×60：進場 0.22 秒、停 2.8 秒、退場 0.32 秒；顯示中再掉一件合併成 ×n。**滑鼠停在橫幅上暫停倒數**（最多多 8 秒），移開續算。不暫停戰鬥。整條可點＝開倉庫 › 特殊物品那一件；出現 0.4 秒內點了不算（防誤觸）。

| 元件 | x,y w×h | token |
|---|---|---|
| 橫幅 | 16,76 1248×60 | 照現況 `#chase` 樣式：底 `--panel-inset`、內框 2px `--rar-chase` `#0cf6ee`（非文字） |
| 圖示 | 32,86 40×40 | — |
| 小標「追逐物品」84,84＋「新」框標 148,84 24×16 | 11/400 `--tx-dim`（7.57:1）；框標 `--sel-bg`＋`--tx-strong` |
| 名／合併 | 84,102 400×22 | 16/700 `--tx-strong`；兩件「A、B」；三件以上「A 等 n 件」 |
| 收集進度 | 964,98 200×16 | 12/400 `--tx-dim`「王印 2／4」；單件才寫 |
| 鍵帽 L | 1204,94 40×22 | `--panel-inset`＋11/400 `--tx-dim`；桌機才顯示 |
| 名詞提示 | 84,144 320×100 | 懸停名稱出；同時暫停倒數 |

## B02 稀有掉落橫幅＋升級膠囊

稀有掉落（破裂石、追憶之墨、通貨、完美石、靈魂包）畫面上方中央 2.6 秒；升級膠囊中央偏上 2 秒；各自計時、可同時出現。追逐物品橫幅顯示時，稀有橫幅讓位。

| 元件 | x,y w×h | token | 備註 |
|---|---|---|---|
| 稀有掉落橫幅 | 440,150 400×44 | `--panel`＋2px `--panel-edge`；名 16/700 `--tx-strong`；類別框標 `--panel-inset`＋`--tx-dim` | top 22vh；不可點；類別用文字框標，**不用 `★`** |
| 升級膠囊 | 470,236 340×36 | `--panel`＋1px `--border-hi`；14/700 `--tx-strong` | 「升級！Lv {n}・天賦點 +{k}」；連升只改等級、天賦點寫總數 |
| 靈魂包橫幅（可點） | 440,320 400×44 | 同稀有橫幅 | 點了開掉落紀錄；熱區 400×44 |

## P01 練習區小面板

只在營地石圈（試招場）裡。面板 32,92 300×268（`--panel-raised`＋1px `--border`），不蓋稻草人。

| 元件 | x,y w×h | 備註 |
|---|---|---|
| 題「練習區」 | 44,102 | 14/700 `--tx-strong` |
| 模式說明 | 128,104 192×16 | 11/400 `--tx-dim`：「無限魔力・無冷卻」；實戰模式時「真實魔力與冷卻」 |
| 怪物等級 −／＋ | 44,132 36×32；中「怪物 Lv 38」；220,132 36×32 | `--btn2`＋`--tx`；熱區 44×44 |
| 實戰模式（切換） | 44,174 276×32 | `--btn2`＋`--tx`；開時 `--sel-bg`＋`--sel-edge` |
| DPS 卡 | 44,226 276×66 | 10 秒平均／總傷害／最高一擊；名 `--tx-dim`、值 12/700 `--tx-strong`；數字寫完整（捨去）；打了稻草人才出 |
| 直接／持續比例條 | 條 44,298 276×8；字 44,314 | 條填 `--act`、底 `--panel-inset`；「直接 72%・持續 28%」11/400 `--tx-dim` |
| 重置 | 248,318 72×30 | `--btn2`＋`--tx`；熱區 72×44 |

## T01 開場旁白（可跳過）

第一次進遊戲：沒有頂列、分頁、HUD。插畫區 160,120 960×400（`intro.js` 6 段鏡頭）；旁白 240,560 800×24 置中 18/700 `--tx-strong`，一行一行淡入，`aria-live`；底 `--panel-inset`（旁白不壓在插畫上）。右上「跳過」1160,24 96×36（`--btn2`＋`--tx`；Esc 也可）。

## T02 開場標題（v1.1 視覺定稿 2026-11-27）

旁白結束或按跳過後出現。線框 `T02-title.png` 保留作版面紀錄；**視覺定稿以 `T02-title-preview-1280x720.png`（整畫面）與 `T02-title-btn-states.png`（主鈕四態）為準**，兩張都在 `evidence/small-screens/`。

mumi 2026-11-27 拍板（幕僚長轉達）4 項：
1. **背景暗幕**：改中央局部暗暈，兩側火把保持原亮度（取代 v1.0 的全畫面 0.62 遮罩）。
2. **T02 專屬主鈕例外**：核准石碑銅框＋硃砂印樣式，含 `--t02-*` 五個 token 與 3 段深石漸層（D2「主鈕用 `--act`」「不准漸層底」兩條只在 T02 主鈕放寬，別的畫面不適用）。
3. **主鈕文案**：「開始」改「**踏入燼窟**」。
4. **維持極簡**：不加「跳過開場」文字鈕、不加 Enter 鍵帽提示、不放版本號。

| 層（下 → 上） | x,y w×h | 規格 |
|---|---|---|
| 1 背景 A 幽冥地宮石門 | 0,0 1280×720 | `t02_title_bg_A_1280x720.png`（320×180 原生，4× 最近鄰）；`object-fit: cover`、置中、`image-rendering: pixelated`。圖未到前用 `--panel-inset` 純色 |
| 2 局部暗暈 | 0,0 1280×720 | `radial-gradient(380px 260px at 640px 350px, rgb(0 0 0 / .50) 0, rgb(0 0 0 / .38) 55%, rgb(0 0 0 / 0) 100%)`；x<230、x>1050 不壓（火把像素與原圖相同） |
| 3 標題 Logo L3 幽冥墨韻硃印 | 200,146 880×268 | `t02_title_logo_L3_2x.png`（440×134 原生，2× 最近鄰、α 只有 0／255）；`image-rendering: pixelated`；包在 `<h1>`，`alt="山海燼窟 SHANHAI CRYPTS"` |
| 4 分隔線 | 480,432 320×9 | 1 px 銅線四階硬色階淡出（`#8a6c4e` 30%／60%／100%，中央留 6% 空隙）＋中央 5×5 硃菱 `#b01a14`（旋 45°）；`aria-hidden` |
| 5 主鈕「踏入燼窟」 | 504,463 272×56 | 熱區同；Enter；預設焦點。樣式見下 |

垂直排列：Logo 底 414 → 18 → 分隔線 432–441 → 22 → 主鈕 463–519；整組在背景石門暗拱內、地面（y≈550）之上。

### 主鈕「踏入燼窟」

- 字：`700 22px/1 'Noto Serif TC'`、字距 **0.24em**，字距尾巴用 `margin-right: -0.24em` 補回（實測字墨中心 x 639.5、鈕中心 640）；陰影 `0 1px 0 rgb(0 0 0 / .9)`。
- 菱印：左右各 8×8 旋 45°，與字距 18 px（flex `gap`），菱印到鈕邊 55 px。
- 框：外框 1 px；內縮 3 px 細內框 1 px；四角 7×7 L 刻角 1 px、外移 4 px；圓角 0。
- 浮框陰影照 D2：`0 0 0 3px rgb(0 0 0 / .6)`＋桌機柔影 `0 8px 24px rgb(0 0 0 / .5)`。

| 狀態 | 底 | 外框／內框／角 | 菱印 | 字 | 其他 | 對比（字對底） |
|---|---|---|---|---|---|---|
| 一般 | `#2d251f`→`#25211e` 40%→`#1d1a17` | `#8a6c4e`／`rgb(168 146 127 / .32)`／`#a8927f` | `#8a2a1a`＋1 px `#b01a14` | `--tx` `#e8e5e1` | 頂緣 `inset 0 1px 0 rgb(232 229 225 / .10)`、底緣 `inset 0 -2px 0 rgb(0 0 0 / .55)` | 12.7:1（最暗段 13.8）；外框對石門 4.1:1 |
| 懸停／焦點 | 同一般 | `#b98a5e`／`rgb(185 138 94 / .55)`／`#e3dcd3` | `#b01a14`＋1 px `#c43d24` | `--tx-strong` `#fbf9f6` | 內暈 `inset 0 -14px 16px -10px rgb(176 26 20 / .38)`（不外發光）；`:focus-visible` 加 `outline: 1px solid #e3dcd3; outline-offset: 6px`；120 ms ease-out | 14.3:1；外框 6.5:1 |
| 按下 | `#16130f`→`#1d1a17` 60%→`#25211e` | 外框 `#b98a5e` | 同懸停 | `--tx` | `translateY(1px)`、`inset 0 2px 0 rgb(0 0 0 / .6)`、柔影縮 `0 4px 12px`；60 ms | 13.8:1 |
| 停用（存檔載入中） | `--panel-inset` 平塗 | `1px dashed #5a544e`／`rgb(129 123 117 / .18)`／`#5a544e` | `#3f3b36`＋1 px `#4a443e` | `--tx-off` `#9d9995` | 只留 3 px scrim 圈、`cursor: default` | 6.1:1 |

`prefers-reduced-motion`：保留顏色變化，`transition-duration` 可改 0。

### Token

D2 既有：`--panel-grad-top` `#2d251f`、`--panel` `#25211e`、`--panel-inset` `#1d1a17`、`--scene-void` `#16130f`、`--panel-edge` `#a8927f`、`--tx`、`--tx-strong`、`--tx-off`、`--vig` `#b01a14`。

T02 專屬（色值取自 L3 Logo 像素，只准用在 T02）：

| token | 值 | 用途 |
|---|---|---|
| `--t02-bronze` | `#8a6c4e` | 一般外框、分隔線 |
| `--t02-bronze-hi` | `#b98a5e` | 懸停／按下外框 |
| `--t02-seal` | `#8a2a1a` | 菱印底 |
| `--t02-seal-hi` | `#c43d24` | 懸停菱印框 |
| `--t02-bone` | `#e3dcd3` | 懸停角飾、焦點環 |

停用灰 `#5a544e`、`#3f3b36`、`#4a443e` 取自 L3／場景色階，只在停用態。

### CSS 參考（可直接搬；結構 `<button class="tgo" id="ivgo">` 內放 4 個 `<i class="cn tl|tr|bl|br">`＋`<span class="seal">`＋`<span class="lb">踏入燼窟</span>`＋`<span class="seal">`）

```css
/* T02-title 主鈕「踏入燼窟」「幽冥石碑・硃印」— 純 CSS，工程可直接搬 */
:root{
  /* 既有 D2 token */
  --panel-grad-top:#2d251f; --panel:#25211e; --panel-inset:#1d1a17; --scene-void:#16130f;
  --panel-edge:#a8927f; --border:#817b75; --tx:#e8e5e1; --tx-strong:#fbf9f6; --tx-off:#9d9995;
  --vig:#b01a14; --scrim-rgb:0,0,0;
  /* L3 Logo 內既有像素色（新增 title 專用 token，只用在 T02） */
  --t02-bronze:#8a6c4e;      /* L3 銅（預設外框） */
  --t02-bronze-hi:#b98a5e;   /* L3 亮銅（懸停外框／角飾） */
  --t02-seal:#8a2a1a;        /* L3 印底硃砂 */
  --t02-seal-edge:#b01a14;   /* L3 印框＝--vig */
  --t02-seal-hi:#c43d24;     /* L3 印面亮硃 */
  --t02-bone:#e3dcd3;        /* L3 骨灰白主筆 */
  --serif-t:'Noto Serif TC','Noto Serif CJK TC',serif;
}
.tgo{ /* 主鈕 272×56 */
  position:relative; width:272px; height:56px; padding:0; margin:0;
  display:inline-flex; align-items:center; justify-content:center; gap:18px;
  font:700 22px/1 var(--serif-t); letter-spacing:0; color:var(--tx);
  text-shadow:0 1px 0 rgb(var(--scrim-rgb) / 0.9);
  background:linear-gradient(180deg,var(--panel-grad-top) 0,var(--panel) 40%,var(--panel-inset) 100%);
  border:1px solid var(--t02-bronze); border-radius:0;
  box-shadow:
    inset 0 1px 0 rgba(232,229,225,0.10),          /* 頂緣骨白微光 */
    inset 0 -2px 0 rgb(var(--scrim-rgb) / 0.55),   /* 底緣石影 */
    0 0 0 3px rgb(var(--scrim-rgb) / 0.6),         /* D2 浮框 scrim 圈（必做） */
    0 8px 24px rgb(var(--scrim-rgb) / 0.5);        /* 桌機柔影 */
  cursor:pointer; outline:none;
  transition:border-color 120ms ease-out, box-shadow 120ms ease-out, color 120ms ease-out, transform 60ms ease-out;
}
.tgo::before{ /* 內縮 3px 細內框 */
  content:""; position:absolute; inset:3px; border:1px solid rgba(168,146,127,0.32); pointer-events:none;
  transition:border-color 120ms ease-out;
}
/* 四角 L 刻角：每邊 7px、線寬 1px，貼在外框外側 2px */
.tgo .cn{position:absolute; width:7px; height:7px; border:0 solid var(--panel-edge); pointer-events:none; transition:border-color 120ms ease-out;}
.tgo .cn.tl{left:-4px; top:-4px; border-left-width:1px; border-top-width:1px;}
.tgo .cn.tr{right:-4px; top:-4px; border-right-width:1px; border-top-width:1px;}
.tgo .cn.bl{left:-4px; bottom:-4px; border-left-width:1px; border-bottom-width:1px;}
.tgo .cn.br{right:-4px; bottom:-4px; border-right-width:1px; border-bottom-width:1px;}
/* 硃砂菱印 8×8（旋 45° 後對角 ≈11px） */
.tgo .seal{width:8px; height:8px; flex:none; transform:rotate(45deg); background:var(--t02-seal); box-shadow:0 0 0 1px var(--t02-seal-edge); transition:background-color 120ms ease-out, box-shadow 120ms ease-out;}
.tgo .lb{display:block; letter-spacing:0.24em; margin-right:-0.24em;} /* 抵掉字距尾巴，左右等距 */

/* Hover / 手把焦點 */
.tgo:hover:not(:disabled), .tgo:focus-visible, .tgo.is-hover{
  color:var(--tx-strong); border-color:var(--t02-bronze-hi);
  box-shadow:
    inset 0 1px 0 rgba(232,229,225,0.18),
    inset 0 -14px 16px -10px rgba(176,26,20,0.38),  /* 門內餘燼：內暈，不外發光 */
    inset 0 -2px 0 rgb(var(--scrim-rgb) / 0.55),
    0 0 0 3px rgb(var(--scrim-rgb) / 0.6),
    0 8px 24px rgb(var(--scrim-rgb) / 0.5);
}
.tgo:hover:not(:disabled)::before, .tgo:focus-visible::before, .tgo.is-hover::before{border-color:rgba(185,138,94,0.55);}
.tgo:hover:not(:disabled) .cn, .tgo:focus-visible .cn, .tgo.is-hover .cn{border-color:var(--t02-bone);}
.tgo:hover:not(:disabled) .seal, .tgo:focus-visible .seal, .tgo.is-hover .seal{background:var(--t02-seal-edge); box-shadow:0 0 0 1px var(--t02-seal-hi);}
/* 焦點環：外 1px 骨白，距框 6px（在角飾外，手把／鍵盤一定看得到） */
.tgo:focus-visible, .tgo.is-focus{outline:1px solid var(--t02-bone); outline-offset:6px;}

/* Active 按下 */
.tgo:active:not(:disabled), .tgo.is-active{
  transform:translateY(1px); transition-duration:60ms;
  color:var(--tx); border-color:var(--t02-bronze-hi);
  background:linear-gradient(180deg,var(--scene-void) 0,var(--panel-inset) 60%,var(--panel) 100%);
  box-shadow:
    inset 0 2px 0 rgb(var(--scrim-rgb) / 0.6),      /* 凹下去：影子在上 */
    inset 0 -12px 14px -10px rgba(176,26,20,0.30),
    0 0 0 3px rgb(var(--scrim-rgb) / 0.6),
    0 4px 12px rgb(var(--scrim-rgb) / 0.5);
}
.tgo:active:not(:disabled) .seal, .tgo.is-active .seal{background:var(--t02-seal-edge); box-shadow:0 0 0 1px var(--t02-seal-hi);}

/* Disabled（存檔載入中等） */
.tgo:disabled{
  cursor:default; color:var(--tx-off); text-shadow:none;
  background:var(--panel-inset); border:1px dashed #5a544e;
  box-shadow:0 0 0 3px rgb(var(--scrim-rgb) / 0.6);
}
.tgo:disabled::before{border-color:rgba(129,123,117,0.18);}
.tgo:disabled .cn{border-color:#5a544e;}
.tgo:disabled .seal{background:#3f3b36; box-shadow:0 0 0 1px #4a443e;}

/* L3 與按鈕之間的分隔：320×1 階梯淡出（硬色階、非柔和漸層）＋中央硃砂菱點 */
.tdiv{position:relative; width:320px; height:9px;}
.tdiv::before{content:""; position:absolute; left:0; right:0; top:4px; height:1px;
  background:linear-gradient(90deg,
    transparent 0 12.5%, rgba(138,108,78,0.30) 12.5% 25%, rgba(138,108,78,0.60) 25% 37.5%, var(--t02-bronze) 37.5% 47%,
    transparent 47% 53%,
    var(--t02-bronze) 53% 62.5%, rgba(138,108,78,0.60) 62.5% 75%, rgba(138,108,78,0.30) 75% 87.5%, transparent 87.5% 100%);}
.tdiv::after{content:""; position:absolute; left:50%; top:4.5px; width:5px; height:5px; margin:-2.5px 0 0 -2.5px; transform:rotate(45deg); background:var(--t02-seal-edge);}
```

v1.0 的全畫面 0.62 遮罩與安全區 360,232 560×208 由本節取代（歷史見 CHANGELOG 2026-11-27 11:41）。
