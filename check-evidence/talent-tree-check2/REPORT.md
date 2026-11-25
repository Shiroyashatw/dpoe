# dpoe-talent-tree-check2 驗收報告（PR #196 天賦樹，最後一次驗收）

- **驗的 head：`4c9ddebfed4080955a31e0feed79ae92641b6af9`**（開工時 `gh api repos/Shiroyashatw/dpoe/pulls/196 --jq .head.sha` 回傳的仍是這個 sha；PR 狀態 open）
- base：main `039c3a56c5374651474399610c3c7cf0f534dfcf`
- 規格：`uiux/talent-tree-final-v1` @`75bed9a09486abbbb34395e7e59821bcf565fbff` 的 `talent-tree.md` v1.0.1＋W5-talent-tree 19 張線框（head 上的線框與 75bed9a0 逐檔相同），再加上 head 上同一份 `talent-tree.md` 的「實作修訂」與 RULINGS-2 對照表
- 名詞：`git show 5615d09687a02caee8fdd2e6d137d4ce2bcb7c83:docs/名詞表.md`（v0.6.50）。沒有 checkout、merge、rebase 或 cherry-pick 這條分支
- 瀏覽器：預裝的 Playwright Chromium（`chromium.launch()`，沒設 `PW_CHROME`；沒用 `/usr/bin/google-chrome`）。1280×720、DPR 1
- 本機伺服器：`python3 -m http.server 8003`（工作目錄＝4c9ddeb 的乾淨 checkout）。沒有對線上網址跑任何測試
- 只驗不改：沒改程式、沒寫 migrate()、沒改 PR 說明、沒 merge、沒刪分支、沒 force push、沒推到 `feat/talent-tree-v1-1125`。本分支 `check/talent-tree-evidence-1125b` 從 4c9ddeb 開出，只加 `check-evidence/talent-tree-check2/`

## 結論：**不通過**

問題 **4 條**（高 0、中 1、低 3）。程式面的必驗項目全部通過：F-1、F-2、文件 6 項、整棵樹禁用字掃描（0）、三組中文新名、所有回歸測試（期望數字全中，四個已知偶發這次都沒出現）。

不通過只有一個原因：交辦要求「中英文都已改上」，但 head 裡**找不到**英文新名 Mana Empowerment／Mana Vortex／Combo Rhythm（問題 #1）。遊戲本身沒有英文介面，這個要求在 head 上要以什麼形式滿足（資料、名詞表、規格）文件沒寫清楚，所以同時列進「文件不清楚」，請交辦者裁定。若裁定為「遊戲沒有英文層、只要中文改上即可」，其餘 3 條都是低嚴重度的文件／工具問題。

## 證據檔

全部在 `check-evidence/talent-tree-check2/`：

- `cap/*.png`：本次自己的實機截圖（每個線框狀態照線框鏡頭重拍；鏡頭換算見下）。`cap/measure.json`：每張截圖當下的 DOM 方框、縮放、畫面文字、F-1 計算後樣式、F-2 計算後 display、整棵樹掃描、搜尋結果
- `overlays/overlay-*.jpg`：2560×720，左＝線框遊戲區（2× 圖 40,40 起 2560×1440 縮成 1280×720）與實機各 50% 疊圖，紅框＝規格／線框座標，綠框＝實機 DOM；右＝實機原圖。線框右側圖例與紅色徽章不比。`overlays/diffs.json`：逐元件差值。`overlays/f1-f2-crops.png`：F-1／F-2 關鍵鏡頭放大 2 倍的拼圖
- `shots/`：`node tools/tree_check.js http://localhost:8003/ shots` 的原始輸出（含 `fix2-*`、`boxes.json`、`390x844-tree.png`）
- `logs/`：所有測試的真實輸出，`logs/summary.txt` 是彙總

線框鏡頭（設 `TREE.z／x／y`，畫面＝原點＋世界座標×k）：01 k=0.07098 原點 (600,352)；19 k=0.06774 (644.87,364.14)；14 g1→(447,492) k=0.59613；15–18 線框 15 圖例 k=0.68778 ox=184.69 oy=727.63（16、17、18 用同一換算，線框 16 圖例沒另外核對，列在未驗）；06 J1a→(411,342) k=0.602；07 J1c→(409,380) k=0.525。02、03、05、08–13 的樹佈局是示意，用 1.25 放大，只比殼與浮層。

## 各線框狀態對照（1280×720）

殼（頂欄 0,0 1280×52、搜尋 912,8 260×36、回 1184,8 36×36、× 1232,8 36×36、樹視圖 0,52 1280×624、底欄 0,676 1280×44、小地圖 1100,64 168×168、重置 12,628 86×36）在**每一張都是 0 px 差**（`overlays/diffs.json`）。重置天賦在沒點過時不畫（01 預設），屬狀態差異。下表差值＝實機 − 線框／規格。

| 頁 | 結果 | 實機截圖 | 疊圖 | 主要差值 |
| --- | --- | --- | --- | --- |
| 01 總覽 | ✅（差值都已裁定） | `cap/01-overview.png`（0.07098）、`cap/01-overview-default.png`（預設 0.4375） | `overlays/overlay-01-overview.jpg`、`overlay-01-overview-default.jpg` | 18 孔中心與換算座標 0.0 px 差；孔直徑 2.0–2.8 px（精修 #13）。路名框 43×15，自然／遊俠／暗影／死靈之路壓在昇華圈附近（精修 #5）。預設是六門鏡頭 0.4375（F-4 已寫進規格）。底欄逐字等於定稿 |
| 02 放大起點 | ✅ | `cap/02-zoom-start.png` | `overlays/overlay-02-zoom-start.jpg` | 1.25；g1 50 px；放大頁沒有路名（精修 #6） |
| 03 已點／可點／不能點 | ✅ | `cap/03-zoom-states.png` | `overlays/overlay-03-zoom-states.jpg` | 點了 1 個小點：on 7、can 13、off 3,915，三種圈可分 |
| 04 鎖住 | ✅（樹形已裁定） | `cap/04-locked.png` | `overlays/overlay-04-locked.jpg` | 虛線圈＋「還沒開放：「鏈錘術」」；鎖住 7 團（規格 10，issue #189 已裁定）；沒寫「叢集」 |
| 05 十字弓 | ✅（樹形已裁定） | `cap/05-crossbow.png` | `overlays/overlay-05-crossbow.jpg` | 弩炮 c405_4；部分十字弓大點不在遊俠之路（樹形不是 v4，已裁定） |
| 06 珠寶孔（空） | ✅ | `cap/06-jewel-empty.png`（0.602，開了再退回的「還沒點亮」面板）、`06-jewel-empty-z050.png`（0.5）、`06b-jewel-lit-empty.png`（已開未鑲）、`06c-jewel-empty-near.png`（1.25＋懸浮） | `overlays/overlay-06-jewel-empty.jpg`、`overlay-06-jewel-empty-z050.jpg`、`overlay-06b-jewel-lit-empty.jpg`、`overlay-06c-jewel-empty-near.jpg` | J1a (411,342) 0 px 差，孔 16.9 px。孔上「空」、旁標「還沒點亮（開孔要 1 點）」在 0.602／0.5 都顯示（F-2 ✅）。面板 820,248 440×206（線框 440×180，+26＝暫時說明一行，已裁定）。06b 面板副標「空」、孔上「空」 |
| 07 珠寶孔（已鑲） | ✅ | `cap/07-jewel-socketed.png`（0.525）、`07-jewel-socketed-z050.png`、`07c-jewel-socketed-near.png`（1.25＋懸浮）、`07b-jewel-lit-empty-after-out.png`（拔下後） | `overlays/overlay-07-jewel-socketed.jpg` 等同名 | J1c (409,380) 0 px 差，孔 21 px，孔上「已鑲」在 0.525／0.5 顯示（F-2 ✅）。面板 820,248 440×252（線框 230，+22，含暫時說明，精修 D2）。拔下後孔上回「空」，面板 440×338（多了收藏清單＋鑲上） |
| 08 小點懸浮 | ✅ | `cap/08-hover-small.png` | `overlays/overlay-08-hover-small.jpg` | 寬 360（0）；589,298 高 164，跟點走；文案逐字相同 |
| 09 大點懸浮 | ✅ | `cap/09-hover-notable.png` | `overlays/overlay-09-hover-notable.jpg` | 寬 400（0）；680,227 高 147；「大點　·　十字弓術」 |
| 10 大點詳細 | ✅（#9 已列精修） | `cap/10-hover-notable-detail.png` | `overlays/overlay-10-hover-notable-detail.jpg` | 寬 400（規格；線框 440 已作廢 F-2）；頂沿「正在按住 Alt／Ｙ　·　放開回簡易」；「同一條路的十字弓術大點…」（RULINGS-2 #9 精修） |
| 11 點數不夠 | ✅ | `cap/11-not-enough-points.png` | `overlays/overlay-11-not-enough-points.jpg` | 寬 400；頂欄「剩 0 點」與懸浮「要 22 點才走得到，還差 22 點」一致 |
| 12 重置確認 | ✅（差值已列精修） | `cap/12-reset-confirm.png`（按住約 55%）、`cap/12a-reset-confirm-static.png` | `overlays/overlay-12-reset-confirm.jpg`、`overlay-12a-reset-confirm-static.jpg` | 卡 440,216 400×288（y=216 已接受）。靜止：長按 461,427 240×56（對圖例 460,416 242×56：+1,+11,−2,0）、取消 709,427 110×56（−1,+11）；按住中長按 465,428 233×54。遮罩 1280×720。都屬 RULINGS-1 D3／D4／D5 |
| 13 名詞提示 | ✅ | `cap/13-noun-tip.png` | `overlays/overlay-13-noun-tip.jpg` | 名詞提示 320,201 360×118，在懸浮窗（540,327 400×147）左上、不重疊（F-3 已寫規格）；字照 TERMS「投射物」 |
| 14 真實座標 | ✅（#7 已列精修） | `cap/14-real-region.png` | `overlays/overlay-14-real-region.jpg` | g1 (447,492) 0 px 差；可點小點 11.9 px（精修 #7） |
| 15 三選一 | ✅（高度已列精修） | `cap/15-attr-pick.png` | `overlays/overlay-15-attr-pick.jpg` | 卡 524,247 420×367（圖例 780,68 已降為示意；高 +19 精修）；點 s1la0 中心 493.4 → 左緣差 30.6 ≤40 ✓；不出樹視圖、不蓋小地圖 |
| 16 三選一結果 | ✅ | `cap/16-attr-results.png`（0.688）、`cap/16b-attr-results-zoom.png`（1.25）、`cap/16c-t89-0688.png`、`cap/16d-t89-125.png` | `overlays/overlay-16-attr-results.jpg`、`overlay-16b-…`、`overlay-16c-…`、`overlay-16d-…`、`overlays/f1-f2-crops.png` | 力量方形、敏捷菱形、智慧圓形在 0.688 都看得出（只形狀、13.8 px）；1.25 形狀＋S／D／I（25 px）。t89 菱形同。見 F-1 |
| 17 懸浮 | ✅（#10 已列精修） | `cap/17-attr-hover.png`（未選）、`cap/17b-attr-hover-picked.png`（已選） | `overlays/overlay-17-attr-hover.jpg`、`overlay-17b-attr-hover-picked.jpg` | 未選只一句（360×47）；已選「敏捷 +5／+40 命中值（每 1 點敏捷 +8 命中值）／改選…」逐字相同；名稱旁沒形狀（精修 #10） |
| 18 改選與重置 | ✅ | `cap/18a-attr-refunded-hover.png`、`cap/18b-attr-repick-card.png`、`cap/18-attr-repick.png` | `overlays/overlay-18a-…`、`overlay-18b-…`、`overlay-18-attr-repick.jpg` | 再點 s1la2＝退回，懸浮回未選一句；再點出三選一（583,94 420×367）；重置卡 440,216，第二句同 12 |
| 19 珠寶孔全圖 | ✅（孔小見精修 #13） | `cap/19-jewel-map.png` | `overlays/overlay-19-jewel-map.jpg` | 18 孔中心 0.0 px 差；孔 1.9–2.7 px；短 id 不畫（正確） |

## F-1：已選的形狀標記（RULINGS-2）

量測 `getComputedStyle`（`cap/measure.json` 的 `F1`）。token：`--panel-inset`＝`#1d1a17`＝rgb(29,26,23)、`--tx-strong`＝`#fbf9f6`＝rgb(251,249,246)。已點亮節點本體 fill＝rgb(162,148,110)。

| 點 | 選 | 縮放 | 直徑 | 看得到的形狀 | fill | fill-opacity | stroke | stroke-opacity | stroke-width | 字母 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s1la0 | s | 0.688 | 13.8 | as 方形 | rgb(29,26,23) | 1 | rgb(251,249,246) | 1 | 2px | 無 |
| s1la1 | d | 0.688 | 13.8 | ad 菱形 | rgb(29,26,23) | 1 | rgb(251,249,246) | 1 | 2px | 無 |
| s1la2 | i | 0.688 | 13.8 | ai 圓形 | rgb(29,26,23) | 1 | rgb(251,249,246) | 1 | 2px | 無 |
| s1la0／1／2 | s／d／i | 1.25 | 25 | as／ad／ai | 同上 | 1 | 同上 | 1 | 2px | S／D／I |
| t89（掛點） | d | 0.688 | 13.8 | ad 菱形 | rgb(29,26,23) | 1 | rgb(251,249,246) | 1 | 2px | 無 |
| t89（掛點） | d | 1.25 | 25 | ad 菱形 | rgb(29,26,23) | 1 | rgb(251,249,246) | 1 | 2px | D |

結果 ✅：fill＝`var(--panel-inset)`、stroke＝`var(--tx-strong)`、寬 2、不透明；fill 不是 none、不等於已點亮底色；<24px 只畫形狀，≥24px 加字母。目視：`overlays/f1-f2-crops.png`、`overlay-16-attr-results.jpg` 右半，三種形狀不靠字母分得出來。

## F-2：孔上標與旁標（RULINGS-2）

量測 `getComputedStyle(...).display`（`cap/measure.json` 的 `F2`）：

| 狀態 | 縮放 | `#tsvg` class | 孔直徑 | `.jt` | `.jl` |
| --- | --- | --- | --- | --- | --- |
| 06 未開 J1a | 0.602（線框） | far1 | 16.9 | 「空」block | 「還沒點亮（開孔要 1 點）」block |
| 06 未開 | 0.525／0.5／0.44／0.25／0.2 | far1 | 14.7／14／12.3／7／5.6 | block | block |
| 06 未開 | 0.199／0.15 | far1 far | 5.6／4.2 | **none** | **none** |
| 06c 未開 | 1.25 | （無） | 35 | block | block |
| 06b 已開未鑲 | 0.602 | — | 16.9 | 「空」block | none（`.nd.js.on .jl`） |
| 07 已鑲 J1c | 0.602／0.525（線框）／0.5／0.44／0.25／0.2 | far1 | 24.1／21／20／17.6／10／8 | 「已鑲」block | none |
| 07 已鑲 | 0.199／0.15 | far1 far | 8／6 | **none** | none |
| 07c 已鑲 | 1.25 | — | 50 | block | none |
| 07b 拔下後 | 0.525 | — | 21 | 「空」block | none |

結果 ✅：z＜0.7（含線框 06／07 鏡頭與 0.5）都顯示；只在 z＜0.2（`#tsvg.far`）隱藏；`.nd.js.on .jl` 維持隱藏。字在 0.5–0.6 畫成約 6–8 px（SVG 字隨縮放），屬 RULINGS-2 #3 已列精修，不算新問題。

## 文件 6 項（RULINGS-2 F-1～F-6 是否寫進 head 的 `talent-tree.md`）

| 項 | head 上的位置 | 結果 |
| --- | --- | --- |
| F-1「實作修訂」只在 head | 「實作修訂」節末段：本節只在 PR head、官方分支應補上（列出 10 項） | ✅ |
| F-2 大點懸浮寬 400 | 殼表「懸浮窗（大點）」：線框 10 的 440、11 的 360 作廢 | ✅ |
| F-3 名詞提示座標 | 殼表「名詞提示」：實機 460,165、圖例 D48 以後對齊 | ✅ |
| F-4 總覽兩層 | 已定決策「縮放」：①預設六門 ②整棵樹；16px 適用範圍；孔字只在 ② 藏 | ✅ |
| F-5 15 翻邊量右緣 | 殼表「能力值三選一卡」 | ✅ |
| F-6 06 面板怎麼開 | 殼表「珠寶孔面板」 | ✅ |

另：RULINGS-2 表（F-1、F-2 程式項＋文件 F-2～F-6 已併入）也在 head。官方分支仍停在 75bed9a0，依交辦不算問題。文件本身的表格格式錯誤見問題 #3。

## 整棵樹禁用字掃描（真實輸出）

我自己的掃描（`cap/measure.json` 的 `scan`）：`PTREE.N` 3,917 點＋`PTREE.J` 18 孔，每點 `treeTip(id,0)`、`treeTip(id,1)` 轉純文字，加上點名 `n.n`、說明 `n.d`，共 15,740 段；**單純子字串計數，沒有用 regex 放寬**：

```
[["法力",0,[]],["MP",0,[]],["ms",0,[]],["輪末王",0,[]],["輪",0,[]],["祭壇",0,[]],
 ["法力強化",0,[]],["法力漩渦",0,[]],["節奏脈輪",0,[]],
 ["魔力強化",3,["分開。⏎法術⏎⏎魔力強化大點　·　法術增","　·　放開回簡易魔力強化大點　·　法術增","一層寫代價）。⏎魔力強化⏎⏎夥伴小點增加"]],
 ["魔力漩渦",3,["。⏎魔力冷卻⏎⏎魔力漩渦大點　·　魔力冷","　·　放開回簡易魔力漩渦大點　·　魔力冷","一層寫代價）。⏎魔力漩渦⏎⏎再生大點　·"]],
 ["連擊節奏",3,["分開。⏎棍術⏎⏎連擊節奏大點　·　棍術近","　·　放開回簡易連擊節奏大點　·　棍術近","一層寫代價）。⏎連擊節奏⏎⏎武僧大點　·"]]]
nodes 3917  sockets 18  tips 15740
```

整棵樹禁用字＝**0**。「連擊節奏」沒有被「輪」誤判（「輪」0）。各狀態畫面文字（40 張截圖的 `#ptree` innerText＋懸浮／面板／卡片／名詞提示）：法力、MP、ms、輪末王、祭壇、舊名都是 0；「輪」每張 1 次，全部是底欄定稿「拖曳移動　·　**滾輪**縮放」（排除允許）。

`tree_check` 自己的掃描也通過（`logs/tree_check.log` 第 56 行）：`✅ 天賦樹畫面與整棵樹 3935 個點的懸浮不出現禁用字（法力、MP、祭壇、換上、ms、彈夾、輪末王、輪、推薦路線、暫定、金框、叢集）`。

## 三組新名

| 名字 | 中文：資料 | 中文：畫面 | 搜尋 | 舊名 | 英文 |
| --- | --- | --- | --- | --- | --- |
| 魔力強化／Mana Empowerment | `js/data.js:3376` `['魔力強化', …]` | `cap/x-hover-mana-empowerment.png`（懸浮「魔力強化／大點　·　法術」） | 「魔力強化」1／1（`cap/x-search-mana-empowerment.png`） | 「法力強化」0／0、全樹 0 | ❌ head 找不到 |
| 魔力漩渦／Mana Vortex | `js/data.js:3438` | `cap/x-hover-mana-vortex.png` | 1／1 | 「法力漩渦」0／0、全樹 0；「法力」0／0（`cap/x-search-old-mana.png`） | ❌ head 找不到 |
| 連擊節奏／Combo Rhythm | `js/data.js:3892` | `cap/x-hover-combo-rhythm.png` | 1／1 | 「節奏脈輪」0／0、全樹 0 | ❌ head 找不到 |

英文：`git grep "Mana Empowerment\|Mana Vortex\|Combo Rhythm" 4c9ddeb` 沒有任何結果（js、docs、規格、名詞表都沒有）。這三個英文只在 `docs/glossary-talent-v1` 分支**最新**的名詞表（比 5615d09 新，例：第 819 行「魔力強化／魔力漩渦｜Mana Empowerment／Mana Vortex」）。v0.6.50（5615d09）第 135 行只有「→魔力強化／魔力漩渦（文字修正暫緩）」，沒有英文、沒有連擊節奏。遊戲沒有英文介面，所以畫面上任何大點都沒有英文。見問題 #1。

舊名在 head 其他地方：`docs/名詞表.md:134` 只寫新名；`tools/check.js:469` 名單是「連擊節奏」；`docs/天賦修正提案.md:154` 是「連擊節奏」。整個 repo（排除 archive 與證據）沒有「法力強化」「法力漩渦」「節奏脈輪」。

## 問題清單（一次列完）

| # | 嚴重度 | 狀態／位置 | 預期 | 實際 | 證據 |
| --- | --- | --- | --- | --- | --- |
| 1 | 中 | 三個大點的英文名；`js/data.js`、`docs/名詞表.md`、`docs/production/specs/talent-tree.md` | 交辦：「畫面與資料裡，中英文都已是『魔力強化／Mana Empowerment』『魔力漩渦／Mana Vortex』『連擊節奏／Combo Rhythm』」 | 中文三個都已改上（資料、懸浮、搜尋）。英文三個在 head 任何檔都沒有；遊戲沒有英文介面，資料只存中文名；head 的名詞表（main 的 v0.6.41 版，第 134 行）也沒寫英文。英文只在名詞表分支最新版（不在 5615d09）。**是否屬缺漏，取決於英文要寫在 head 哪裡，文件沒定義（見文件不清楚 D-1）** | `git grep` 0 筆；`cap/x-hover-*.png` |
| 2 | 低 | `docs/production/CHANGELOG.md` 最上面一行、根目錄 `CHANGELOG.md` 0.5.6 段 | CLAUDE.md：「決定與調整記在 `docs/production/CHANGELOG.md` 最上面一行」；mumi 2026-11-25 14:40 裁定「連擊節奏」與兩個魔力改名是決定 | 改名 commit 4c9ddeb 沒加 CHANGELOG 行（最上面仍是 fix2 那一行，只寫 F-1／F-2／文件 6 項）；根目錄 CHANGELOG 0.5.6 段也沒提改名 | `git show 4c9ddeb --stat`（沒動 CHANGELOG） |
| 3 | 低 | `talent-tree.md`「懸浮與畫面文案表」兩列 | 每列 4 欄（用語／出現處／畫面文案／名詞表） | 「珠寶孔（已鑲）」列只有 3 欄（名詞表欄掉了）；下一列「暫時說明（珠寶分頁上線前）」有 5 欄（多出「同上；『珠寶分頁』Jewels tab 已收」，是上一列掉的那格）。Markdown 渲染時第一列名詞表欄空白、第二列多一格被吃掉 | head `docs/production/specs/talent-tree.md` 文案表 |
| 4 | 低 | `tools/tree_overlay.py` 對 head 的 `tree_check` 輸出 | `tree_check.js` 註解：「給截圖資料夾時另寫 boxes.json（tools/tree_overlay.py 跟示意圖疊圖）」 | `python3 tools/tree_overlay.py <tree_check 輸出>` 直接中止：`FileNotFoundError: …/W5-talent-tree/fix2-16-attr-0688.png`（fix2 新加的 7 張截圖寫進 boxes.json，但沒有同名線框）。不影響遊戲；本報告改用自己的疊圖腳本 | 本地重現（見上）；`shots/boxes.json` |

計數：4 條（高 0、中 1、低 3）。

## 文件不清楚（照交辦不自行決定）

- **D-1**：「中英文都已改上」在 head 上要以什麼形式成立？遊戲沒有英文介面（`tree.js`／`data.js` 只有中文名），規格的英文表只列 Keystone 等用語、沒有大點名，名詞表 v0.6.50（交辦指定的版本）也沒有這三個英文。若英文只需要存在名詞表分支，問題 #1 不成立；若要求 head 有（資料或名詞表或規格），問題 #1 成立。本報告照交辦字面判 ❌，請交辦者裁定。

## 名詞檢查（畫面實際文字）

- 「連擊」三種用法：大點「連擊」、輔助「連擊」、TERMS「連擊」都沒改名 ✅。「連擊節奏」是另一個大點的名字（mumi 14:40 裁定），沒動到這三種。
- 英文用語 Keystone、Notable、Small Talent、Jewel Socket、Attribute、Path、Reset Talents、Jewels tab：遊戲沒有英文介面，畫面沒有英文，無錯；規格英文表在 head 照舊。對應中文「基石／大點／小點／珠寶孔／能力值／之路／重置天賦／珠寶分頁」都照定稿 ✅。
- 禁用字：法力 0、MP 0、ms 0、輪末王 0、輪 只有底欄定稿「滾輪縮放」（排除）、祭壇 0（見掃描）。
- 對定稿與名詞表 v0.6.50 逐條：天賦樹、剩 n 點、搜尋天賦、回（回到我點到的地方）、六條路名、小點、大點　·　{主題}、基石、還沒有昇華／點這裡選一個、空／已鑲、還沒點亮（開孔要 1 點）、{路名}的珠寶孔（大孔）、這個孔是空的。、掉落句、拔下、鑲上、已鑲上、丟棄句、暫時說明「珠寶分頁還沒上線，暫時不能丟棄」、能力值 +5（…）、力量／敏捷／智慧、命中值、最大生命、最大魔力、重置天賦？、洗點免費，不扣靈魂。、第二句、⚠ 不能復原、按住 0.6 秒…、長按重置、取消、底欄全文：逐字相同 ✅。
- 已裁定、不列：「十字弓術」維持原樣（類型行「大點　·　十字弓術」）；10 詳細層「十字弓術大點」（RULINGS-2 #9 精修）；未選能力值只一句（Q10）；珠寶名「亡靈珠寶　·　斬鐵」（面板）／「亡靈珠寶：斬鐵」（懸浮）／「亡靈珠寶・雙魂」（收藏）寫法不一，屬珠寶命名既有寫法、不在定稿範圍，只記錄。

## 測試數字（在 4c9ddeb 各跑一次，真實輸出在 `logs/`）

每個都只跑一次，沒有重跑；四個已知偶發（375×667「快速一撥＝翻滾」、world「AI 踩怪地面」、skill「升級扣靈魂」、char 第 495 行 abort）這次都沒出現。

| 測試 | 期望 | 實際（✅／❌） | 結束碼 | 輸出 |
| --- | --- | --- | --- | --- |
| `node tools/check.js` | 951/0 | **951/0** | 0 | `logs/check.log` |
| `node tools/skill_check.js http://localhost:8003/` | 155/0 | **155/0**（最後一行「✅ 技能面板全部通過」） | 0 | `logs/skill_check.log` |
| `node tools/char_check.js …` | 98/0 | **98/0**（「✅ 角色頁全部通過」） | 0 | `logs/char_check.log` |
| `node tools/pro_check.js …` | 35/0 | **35/0**（「全部通過」） | 0 | `logs/pro.log` |
| `node tools/hide_check.js …` | 52/0 | **52/0**（「全部通過」） | 0 | `logs/hide.log` |
| `node tools/world_check.js …` | 42/0 | **42/0**（「世界地圖實測全部通過」） | 0 | `logs/world.log` |
| `node tools/tree_check.js … shots` | 62/0 | **62/0**（「✅ 全部通過」） | 0 | `logs/tree_check.log` |
| `touch_check 390 844` | 161/0 | **161/0** | 0 | `logs/touch_390x844.log` |
| `touch_check 375 667` | 161/0 | **161/0** | 0 | `logs/touch_375x667.log` |
| `touch_check 844 390` | 16/0 | **16/0** | 0 | `logs/touch_844x390.log` |
| `touch_check 667 375` | 16/0 | **16/0** | 0 | `logs/touch_667x375.log` |
| `touch_check 1280 720` | 16/0 | **16/0** | 0 | `logs/touch_1280x720.log` |
| `touch_check 1440 900` | 16/0 | **16/0** | 0 | `logs/touch_1440x900.log` |
| `touch_check 1280 800` | 16/0 | **16/0** | 0 | `logs/touch_1280x800.log` |
| `npx prettier@3.3.3 --check js/*.js tools/*.js`（只檢查、不寫入） | 通過 | **All matched files use Prettier code style!** | 0 | `logs/prettier.log` |

`logs/summary.txt` 原文：

```
check exit=0 ok=951 bad=0
skill_check exit=0 ok=155 bad=0
char_check exit=0 ok=98 bad=0
pro exit=0 ok=35 bad=0
hide exit=0 ok=52 bad=0
world exit=0 ok=42 bad=0
touch_390x844 exit=0 ok=161 bad=0
touch_375x667 exit=0 ok=161 bad=0
touch_844x390 exit=0 ok=16 bad=0
touch_667x375 exit=0 ok=16 bad=0
touch_1280x720 exit=0 ok=16 bad=0
touch_1440x900 exit=0 ok=16 bad=0
touch_1280x800 exit=0 ok=16 bad=0
prettier exit=0
```

（`ok`／`bad` 是 log 裡 ✅／❌ 的行數。tree_check 的 62 含最後一行「✅ 全部通過」，與先前 62/0 的算法相同。）

附帶檢查：F-1 把節點圈規則改成 `.nd > circle`。基石雙圈 `circle.r2`、珠寶孔圈都是 `.nd` 的直接子元素，仍吃到樣式；`cap/x-keystone-simple.png`、06／07 截圖沒有跑版。昇華圈（`.nd.asc > circle`）同樣是直接子元素。

## 未驗

- 線框 16、17、18 的圖例換算沒逐張核對，沿用線框 15 圖例的 k=0.68778、ox=184.69、oy=727.63（14 頁以外的 15–18 節點區在規格裡是同一批烘焙真實座標）。
- 實體手把（只有 `tree_check` 的模擬手把）。
- DPR 2、對比與配色（交辦不含）。
- 390×844 只跑自動測試（`tree_check` 390 段、`touch_check` 390×844／375×667），沒做線框疊圖（交辦如此）；`shots/390x844-tree.png` 沒逐一看。
- 844×390、667×375、1440×900、1280×800 只跑 `touch_check`，這次沒拍天賦樹畫面。
- AI 試玩回歸（交辦不跑）。
- 滿 30 顆：只靠 `tree_check` 呼叫 `jwAdd`（通過），沒在實際掉落流程截到吐司。
- 18 點旁「再點＝退回」示意標註：實機沒畫，RULINGS-1／2 都列未驗，不算問題。

## 已排除、不算問題（對照交辦「已裁定」）

| 項目 | 本次看到的 | 依據 |
| --- | --- | --- |
| 樹形不是 v4：3,917 點、5 孔距離 <30、鎖住 7 團 | `PTREE.N` 3,917；鎖住 7 團；十字弓大點位置 | issue #189，交辦已裁定 |
| 珠寶暫時例外（方案 A） | 06／07 面板最後一行、07 已鑲懸浮都有「珠寶分頁還沒上線，暫時不能丟棄」；滿 30 換 500 靈魂（`tree_check` 通過） | mumi 方案 A |
| VER 0.5.6 | `version.json` 0.5.6 | 交辦已裁定 |
| RULINGS-2 #3 孔上字級隨縮放 | 0.5–0.6 時「空／已鑲」與旁標約 6–8 px；旁標 400 粗細 | 精修 |
| RULINGS-2 #4／#5／#6／#7／#13 | 預設 0.4375 六門鏡頭、整棵樹路名小並壓圈、放大頁沒路名、中距小點 11.9–13.8 px、整棵樹孔 2 px | 精修（F-4 已寫進規格） |
| RULINGS-2 #9「十字弓術大點」、#10 17 已選沒形狀／TERMS、#12 搜尋框左移＋計數 | 照舊 | 精修 |
| RULINGS-2 #11 15 翻邊 | 規格已改量右緣 | 接受＋文件 F-5 |
| RULINGS-1 精修：07 面板高（252）、12 鈕框（按住中與靜止 y+11）、15 卡高 367、12／18 遮罩濃度、Q8 基石代價在簡易層（`cap/x-keystone-simple.png`：「你的攻擊必定命中／無法造成暴擊」在簡易層）、Q12 主題圖、06／07 面板多的 ×、金框／TERMS | 照舊 | 精修 |
| RULINGS-1 接受：15 位置跟點走、12／18 卡 y=216、面板 820,248、Q3 標題、Q4「空／已鑲上」、Q7 頂沿、Q9 不夠點在懸浮窗、Q10 一句、Q6 掉落句、Q11 R3、Q14 | 實機都照接受後寫法 | 已接受 |
| 大點懸浮寬 400（線框 10 的 440、11 的 360） | 實機 400 | RULINGS-2 F-2 接受 |
| 「十字弓術」 | 照原樣 | 交辦：不要當問題 |
| 底欄「滾輪縮放」的「輪」 | 每張 1 次 | 定稿原文，排除允許 |
| 官方規格分支仍停在 75bed9a0 | — | 交辦：不算問題 |
| 沒點過時不畫「重置天賦」、懸浮位置跟點走 | 01 預設、08／09 | 狀態差異／規格「點旁」 |
| `tree_check` 把 01 存成 19、02＝03＝14 同一張 | `shots/` md5 相同 | RULINGS-1 未驗項；本報告另拍 `cap/` 各張 |
