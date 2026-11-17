---
name: dungeonPOE
description: 掛機打寶 ARPG。直立 390×844（也要放得進 375×667）與桌機 1280×720（只用滑鼠也能玩）同級。每個畫面一秒內看得出「這是什麼、哪裡能變強、要按哪裡」；美術方向 A 廟宇古地圖＋C 的用色規則：面板是近中性的深色、銅色細框，飽和色只給掉落、特效、跳數字和主按鈕
colors:
  # 只列最常用的角色 token；完整清單在第 4 節，色值只在 docs/production/specs/M2-36-palette-tokens.md 與 css/style.css 的 :root
  panel-inset: "var(--panel-inset)"
  panel: "var(--panel)"
  panel-raised: "var(--panel-raised)"
  border: "var(--border)"
  border-mid: "var(--border-mid)"
  border-ctl: "var(--border-ctl)"
  border-hi: "var(--border-hi)"
  tx: "var(--tx)"
  tx-title: "var(--tx-title)"
  tx-strong: "var(--tx-strong)"
  tx-dim: "var(--tx-dim)"
  tx-off: "var(--tx-off)"
  act: "var(--act)"
  on-act: "var(--on-act)"
  sel: "var(--sel)"
  sel-ink: "var(--sel-ink)"
  good: "var(--good)"
  bad: "var(--bad)"
typography:
  title:
    fontFamily: "Noto Serif TC, PMingLiU, serif"
    fontSize: "22px"
    fontWeight: 900
    lineHeight: 1.2
  number:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.1
  heading:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  button-primary:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  strong:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  sub:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
rounded:
  panel: "0px"
  control: "2px"
  pill: "9999px"
spacing:
  unit: "4px"
  sp: "8px"
  group: "16px"
  pad-portrait: "12px"
  pad-desktop: "16px"
components:
  button:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.tx}"
    typography: "{typography.strong}"
    rounded: "{rounded.control}"
    height: "44px（桌機 36px）"
  button-primary:
    backgroundColor: "{colors.act}"
    textColor: "{colors.on-act}"
    typography: "{typography.button-primary}"
    rounded: "{rounded.control}"
    height: "48px"
  card:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.tx}"
    rounded: "{rounded.control}"
    padding: "12px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  panel-title:
    textColor: "{colors.tx-title}"
    typography: "{typography.title}"
---

# Design System: dungeonPOE

## 怎麼用這份

**這份先管「玩家看不看得懂」，再管「長什麼樣」。** 0.4.7 以前這份只寫框、顏色、字體，每個面板都照做了，量出來還是一個畫面 11 種字的樣式、23～51 個框、沒有主角（2026-11-13 的清點）。所以順序改成：

1. 先過第 1 節的**一秒測試**與第 7 節的**預算**（用 `tools/ui_look.js` 量，不用感覺）。
2. 再照第 3～6 節的字、顏色、框、元件。
3. **規則跟一秒測試衝突時，一秒測試贏，回頭改這份。** 不要為了守某一條規則把畫面做得看不懂。

**這份只寫原則；數值在規格裡，不在這裡重抄。** 數字跟規格不一致時以規格為準，回頭改這份。

| 要查 | 看（都在 `docs/production/specs/`） |
| --- | --- |
| 色值、token 角色、對比與 ΔE 門檻、「舒服」量測 (a)–(g) | `M2-36-palette-tokens.md` |
| 怎麼畫：像素格與縮放、光、輪廓、地磚、面板與框、圖示、特效、跳數字 | `M2-36-drawing-rules.md` |
| PixelLab 素材（地磚、招牌特效、王印圖示）與收圖檢查 | `M2-36-pixellab-prompts.md` |
| 版面與流程：分頁、營地、追逐物品面板、桌機分區、快捷列 | `M2-37-ia-rework.md` |
| 元件尺寸與狀態、每個畫面的兩種尺寸 | `M2-33-index.md` → `M2-33-1-foundations.md`（下稱 F）、`M2-33-2a-items-crafting.md`、`M2-33-2b-panels.md`、`M2-33-3a-scene-assets.md`、`M2-33-3b-feedback.md` |

元件的 class、測試尺寸、技術限制在 `docs/介面規範.md`；流程在 skill `ui-design`。

**只寫角色 token，不寫色碼。** CSS、JS 都不准出現 hex、`rgb()`／`rgba()` 字面值；半透明用三元組 token（`rgb(var(--scrim-rgb) / 0.6)`）；canvas 用 `PAL.xxx`（`js/palette.js` 從 `:root` 讀）。token 收斂（M2-36a）合併前，`:root` 還有舊名（`--s0`～`--s3`、`--milk`、`--fr*`、`--r0`～`--r4` 等）：不要新增舊名的用法，舊名對新名照 M2-36a token 角色清單（https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/8690e401-7ab1-410e-aa55-477941e622cb ）。

## 1. 一秒測試（最高優先）

掛機遊戲裡玩家能做的只有配裝、配技能、點天賦與昇華，面板就是玩法本身。玩家打開任何一個畫面，一秒內要答得出三題：

| 題目 | 靠什麼答 |
| --- | --- |
| **這是什麼**（我在看哪一招、哪一件、哪個昇華） | 一個名字、一個主數字。名字與等級在一個畫面只出現一次 |
| **哪裡能變強** | 「變強的語言」（第 2 節）：`--good` ▲ 與差多少；現在就做得到的事排在最上面 |
| **要按哪裡** | 一顆主要按鈕，固定在面板底部；它上面寫動作與代價 |

怎麼驗：把畫面轉成灰階、模糊（瞇眼圖），最亮、最大的三樣東西要是**主數字、主要按鈕、選中的東西**。最亮的是裝飾、鎖、重複的標籤，就是沒過。灰階下場景、面板、關鍵資訊三層也要分得開（M2-36 量測 (a)）。

## 2. 版面原則

1. **一個畫面一件事。** 「看整套」「改這一個」「挑一個放進來」是三個畫面，不擠在一起。層級固定：總覽 → 這一個 → 挑選；回上一層的方法每個面板都一樣。
2. **先摘要，細節點了才出現。** 預設只有一個主數字與最多三個次要數字；算式、標籤、完整說明點了才展開，展開的內容要出現在看得到的地方（自動捲進畫面）。
3. **用間距分組，不用框。** 同一組的東西間距 8px，組與組之間 16px（間距只用 4、8、12、16、24）。面板裡的框只給兩種東西：可以按的卡片、放道具的凹槽。說明文字、數字、標題都不加框。面板本身的外框照第 5 節。
4. **裝飾不能比資訊亮。** 紋路、分隔線只能用 `--border`；還很遠才用得到的東西（還沒輪到的鎖孔）不畫，只畫「下一個能開的」並寫代價。
5. **同一種點法，同一種結果。** 點一個東西只會是「選它」；要花資源的動作一定是有字的按鈕，不放在可以選的東西旁邊當同一種圖示。
6. **要選的東西放中間，固定的動作放底部。** 人最常、最準點到的是畫面中央（流傳的「拇指熱區圖」原作者已經說它不準），所以清單與要選的東西放中間，主要按鈕固定在底部一列，最上面只放現況（標題、資源數量、關閉）。靠角落的點擊區要比中間的大。
7. **要讀、要比較的畫面不放半版。** 手機直立的半版面板只給看一眼就走的東西（戰利品、角色）；技能、做裝、昇華一打開就是全版。
8. **重複的動作要省力。** 會連按的按鈕（升級）支援按住連續；一次升好幾級的按鈕上寫升幾級與總價；清單記住上次的篩選與捲動位置。拖曳排序要有把手，並且另外給一個不用拖的做法。
9. **變強的語言**（全遊戲同一套，不只靠顏色）：
   - 比的是**對你現在這套的實際結果**，不是等級或階級（Diablo 4 的綠箭頭只比道具強度，玩家抱怨它會騙人）。
   - 清單預設只列對這一個有效果的，其餘收在「全部」（PoE2 的輔助清單預設只列推薦的）。
   - 比現在好：`--good`＋▲＋數字（「▲ 每秒 +9」）。比現在差：`--bad`＋▼＋數字。一樣：`--tx-dim`「＝」或「—」。
   - 不加傷害的效果直接寫它給什麼（「範圍 +40%」），不硬湊成傷害。
   - 算不出來的寫原因（「有條件：完美閃避後」），沒有效果的寫為什麼並排到最後。
   - 清單預設照「差多少」從大到小排。
   - 分頁列與清單上的提示點只代表一件事：**現在就做得到，而且會變強**。不拿來通知別的。

## 3. 字

字階兩種尺寸同值、不縮放（F §2）。一個畫面最多用六種樣式（`tools/ui_look.js` 把「字級＋粗細＋字體」算一種）：

| 樣式 | 規格 | token | 用在 |
| --- | --- | --- | --- |
| 面板標題 `title` | 襯線 900・22 | `--tx-title` | 面板標題、對話框標題、王名 |
| 主數字 `number` | 黑體 700・28・等寬數字 | `--tx-strong`（紙卡上 `--sel-ink`） | 每個畫面唯一的大數字 |
| 小標 `heading` | 黑體 700・18 | `--tx-title` | 卡頭、說明框標題（物品名用襯線＋稀有度色） |
| 主按鈕 | 黑體 700・16 | `--on-act` | `.btn.pri` |
| 正文 `body`／`strong` | 黑體 500／700・14・行高 1.4 | `--tx` | 說明、清單的名字、按鈕上的字、差多少 |
| 次文 `sub` | 黑體 500・13 | `--tx-dim` | 副行、提示、停用原因 |
| 標籤 `label` | 黑體 700・12 | `--tx-dim` 或所在元件 | 分頁字、鍵帽、徽章、膠囊 |

- **資訊下限 14px。** 13 只給副行與提示；12 是標籤，不承擔資訊句。放不下代表資訊太多，刪資訊，不縮字。
- 面板裡沒有 12px 以下的字。例外只有兩個：HP／MP 條內數字 11（F §8）、跳數字螢幕下限照 M2-33-3a §1（依種類，最小 11）。
- 襯線只給標題與名字（儀式感）；按鈕、清單、數字、說明一律黑體。
- 數字一律 `tabular-nums`，單位不加粗。
- 簡中：容器寬用 em、留 30%；用假語系驗 390、375、1280。

## 4. 顏色：一種顏色只說一件事

**方向 A 廟宇古地圖＋C 的規則**：飽和色（C* > 40）只給掉落（稀有度）、特效、跳數字和主按鈕。木頭、泥土的彩度只留在場景；面板是近中性的深色，分層靠明度帶、彩度與冷暖，加上框，不靠調亮底色。量法與門檻在 M2-36 色票檔。

| token | 只代表 |
| --- | --- |
| `--scene-void`、`--scene-<地形>-*` | 場景（canvas）：畫面最底層與四種地形的地面、中間調、亮部、邊緣 |
| `--panel-inset`／`--panel`／`--panel-raised`／`--panel-raised-2` | 凹槽／面板底／凸起（按鈕、卡片）／hover 與選中列；凸起層一定有框 |
| `--sheet-bg`／`--plate-world`／`--chase-bnr` | 直立半版的底／場景上的字底板／追逐橫幅的底 |
| `--border`／`--border-mid`／`--border-ctl`／`--border-hi`／`--border-cap` | 分隔線／面板框（銅）／可按元件的外框／hover 與焦點框／框角點與選中亮框；都不當字色 |
| `--tx`／`--tx-title`／`--tx-strong`／`--tx-dim`／`--tx-off` | 正文／標題（同值，靠字級與字重分）／主數字與強調／次要／停用、鎖住、空格 |
| `--tx-scene` | 壓在場景上的字，一定墊 `--plate-world` |
| `--act`（hover `--act-hi`）＋`--on-act` | 主要按鈕（暗銅綠）、提示點、數字徽章；不當字色。一個畫面一顆主要按鈕 |
| `--sel`／`--paper`＋`--sel-ink` | 選中的分頁、段、模式格；紙卡。只給小面積 |
| `--ready` | 買得起、可以做：左緣 3 px，不是整顆亮 |
| `--good` | 變強、正向數值（黃綠）；只當字與跳數字 |
| `--bad` | 變弱、負向、危險、已失效、不能用 |
| `--warn` | 提醒、危險度中段 |
| `--rar-normal`／`-magic`／`-rare`／`-unique`（各有 `-bg`） | 只給道具稀有度：名稱字色、格框、格底、掉寶光柱 |
| `--rar-chase`（`-hi`、`-bg`） | 只給追逐物（王印、異寶基底）；全遊戲只有它用橙色，`.chf` 是唯一的彩色外框 |
| `--asc`（`-hi`、`-bg`、`-on`） | 只給昇華（青玉綠）：昇華的字、節點與光 |
| `--awk`／`--awk-bg` | 只給覺醒（槽、卡、標記） |
| `--affix` | 會改變玩法的名詞（可以點出名詞卡） |
| `--el-phys`／`-fire`／`-cold`／`-light`／`-chaos` | 傷害類型與抗性，只上那個詞；特效本體色 |
| `--dmg-*` | 跳數字 5 色與描邊，只在 canvas |
| `--hp`／`--mp`、`--prog-lo`／`--prog-hi` | 生命／法力條、進度條，平塗 |

- **三個綠分開**：`--good` 是字，`--asc` 是昇華，`--act` 是按鈕底，不互相借用。
- 每個畫面的介面字色最多五種：`--tx`、`--tx-dim`、`--tx-off`、`--tx-strong`、`--sel-ink`。有顏色的字只有物品名稱（稀有度色）與正負數值（`--good`／`--warn`／`--bad`）。
- 分頁、面板、框、按鈕、底板不准用 `--rar-*`、`--el-*`、`--dmg-*`、`--asc`（M2-37 §2）；特效不准用 `--bad`、`--act`（畫法規則 §6）。
- 金色不當介面色，紅色不當主要按鈕（使用者否定過：金色俗、紅色像錯誤訊息；紅只給傷害與危險）。
- 不只靠顏色：稀有度另有框與角標，追逐另有雙框＋印角；轉灰階後要分得出。
- 帶資訊的字對比 ≥ 4.5:1、正文 4.5–12:1；框 ≥ 3:1。

## 5. 形狀、框、深度

框、按鈕、分隔線、條都由程式用 CSS 畫（不再用 `img/ui/frame.png` 九宮格）；構造照畫法規則 §4 與 F §4，這裡只寫原則：

- **圓角**：面板 0；按鈕、卡片、格子、字底板 ≤ 2px。全圓角只給膠囊、徽章、提示點，以及本來就是圓的（天賦點、技能的孔）。
- **光從左上來**：凸起層內上緣一條亮線、外下緣一條影子；凹槽的影子在內上緣。
- **分層靠框與影子，不靠調亮底色**：凸起層和面板只差一點，看不出來是正常的。按鈕一定有 `--border-ctl` 框，hover／選中一定有 `--border-hi` 框。
- **面板**：`--panel`（直立半版 `--sheet-bg`）、1px `--border-mid` 框、四角 2×2 `--border-cap` 角點；夠寬的面板框內再一條 `--border` 細線（舊地圖的雙線邊）。
- **浮在場景上的框一定加 scrim 陰影**（直立半版、桌機欄面板、頂列、追逐橫幅、掛機卡、說明框、對話框）：框外 3px `--scrim-rgb`；桌機再加柔影，直立不加。面板裡面的卡與格子不加。
- 框一律 1px 實線（框角點除外），不用虛線（空格用實線 `--border`＋凹槽底，M2-37）。
- 不准：漸層底、木紋或紙紋貼圖、外發光、毛玻璃、`backdrop-filter`、`border-image`。

## 6. 元件：每一種只有一個長相

尺寸、狀態、兩種尺寸的位置在 M2-33（F 是共用元件，2a／2b 是面板畫面，3a 是場景與素材、3b 是回饋）。新畫面先從這裡拿；真的沒有才新增，並寫回 M2-33 與 `docs/介面規範.md` 第 3 節。

| 元件 | 長相與規則 |
| --- | --- |
| **主數字區** | `label` 的名稱在上、`number` 在下，旁邊最多三個 `label` 次要數字。沒有框 |
| **清單列** | 凸起卡；圖示 32、`body` 名字＋一行 `sub` 說明、右邊是 `strong` 的數值或差多少。整列可以按；選中整列 `--panel-raised-2`＋`--border-hi`。挑技能、挑輔助、挑光環、昇華清單都用它 |
| **卡片** | `--panel-raised` 底、1px `--border-ctl`、內距 12。一張卡一個主題；卡裡不再放卡 |
| **按鈕** | 次要 44（桌機 36）、黑體 700。主要按鈕 `--act`、48、寫動作與代價（「升到 Lv 2・14」）；停用改 `--tx-off`，旁邊或下方寫原因（不靠 `title`）。破壞性按鈕字 `--bad`，不跟主動作並排等寬 |
| **底部動作列** | 手機直立黏在面板底部：一顆主要按鈕（佔一半以上寬）＋最多兩顆一般按鈕。再多的收進「更多」 |
| **分段與篩選** | 一行、可以橫向捲，不換行；選中 `--sel`／`--sel-ink`（F §6） |
| **凹槽** | `--panel-inset` 底、1px `--border`、內上緣影子。空的寫一個詞說明放什麼 |
| **差多少** | ▲／▼／＝ 加數字，`strong`，照第 2 節第 9 條上色 |
| **提示點** | 8px 圓點，`--act`，外圈 `--panel-inset`。只代表「現在做得到而且會變強」 |
| **說明框** | 名字在稀有度標題帶上（襯線、稀有度字色、該稀有度的 `-bg` 底），下面一行類型；段與段一條 `--border` 細線；詞綴用 `--affix`。桌機滑過出現，手機點一下出現並帶動作鈕；永遠不蓋住被點的東西 |
| **掉落與光柱**（canvas） | 光柱是同一張灰階圖，由程式依 `--rar-*` 上色；形狀與演出照 M2-33-3b §3 |
| **HUD 條** | 生命、魔力、王血條、首領進度：不透明 `--panel-inset` 底、`--border-mid` 框、平塗；壓在場景上的字墊 `--plate-world`。戰鬥中只露出這些，深度留在面板裡 |
| **資源條**（0.5.4） | 圖示＋名字＋庫存＋「+N／分」，下面一條「這一單位的進度」一直在跑；滿了數字跳一下；快到每秒 4 格以上改成流動的常亮條。營地庫存列、掛機卡、產生器卡（只有條）同一個元件；離線卡同一個長相但不跑 |
| **營地的兩種條**（0.5.4） | 里程碑＝卡頭下面 `--prog-hi` 細條＋一行小字；材料湊齊幾成＝還買不起的鈕的底色從左邊填；買得起＝左緣 3px `--ready`。營地總覽其餘外觀照 M2-33-3a §2.2 |
| **圖示** | 道具、技能、王印是 PNG 像素圖（`image-rendering: pixelated`），只用原尺寸或整數倍（16、32、64）；介面導覽圖示是 `ICO` 的 SVG（24 格、線寬 2、方端點、不填色、不用飽和色），一律顯示 24。同一排不混兩種，不用 emoji 與符號字（★、◈、▲、▲大 這組等級標記維持字形，F §1） |

### 技能面板與昇華石碑

- **技能面板**三個畫面（0.4.8 做完）：**總覽**（可以變強的事排最上面；下面是出招順序的清單列，可以拖曳換順序，每列寫每秒）→ **這一招**（名字一次；主數字在左、圓環縮小當徽章放右邊：圓心是技能、周圍只畫開了的孔與下一個能開的；下面是說明與每孔一列的輔助；底部動作列）→ **挑選**（清單列，照差多少排，選了一列在原地展開說明、底部出現主要按鈕）。外觀照 M2-33 2b §1。
- **昇華石碑**：手機與桌機同一套「選 4 個大點」的卡片清單，不畫盤面。每張卡寫對你現在這套的影響；選中的卡用 `--asc` 的框與 `--asc-bg` 圖示底，文字仍是 `--tx`。「成為○○」是底部動作列的主要按鈕。
- 覺醒只用 `--awk`（槽、卡、標記）。

## 7. 預算（驗收用，數字說話）

`node tools/ui_look.js [寬] [高] [網址]` 量每個畫面看得到的範圍，並輸出瞇眼圖。改之前、改之後各跑一次，兩組數字都附在回覆裡。

| 項目 | 上限 |
| --- | --- |
| 字的樣式（字級＋粗細＋字體） | 6 種 |
| 介面字色 | 5 種 |
| 框的種類 | 4 種 |
| 有框的元素 | 總覽與「這一個」12 個；清單每列 1 個＋6 個 |
| 面板裡 12px 以下的字 | 0% |
| 主要按鈕 | 1 顆 |
| 放大的數字 | 1 個 |
| 同一個資訊出現次數 | 1 次 |

**舒服量測**：`tools/comfort.py` 的 (a)–(g)（灰階分層、面板對場景亮度、飽和面積、中明度褐色、文字對比、大片亮面、新舊對照），門檻與做法在 M2-36 色票檔「樣張」一節；直立 390×844、375×667 與桌機 1280×720 都要算。

數字量不到的兩項用人測：**五秒測試**（給沒看過的人看五秒，問「這頁最重要的是什麼、要怎麼做」）與**第一下點擊**（給一個任務，看第一下點在哪；第一下點對的人完成率高很多）。

操作與順暢的標準在 skill `ui-design`（最常做的事三下以內、按下到畫面更新 100 毫秒以內）。

## 8. 動態

- 按下就有回饋，放開才執行：按鈕下移 1px 並拿掉下緣影子；分頁格換底色、不縮放（F §5、§7）。
- hover 底色過渡 120 毫秒（只桌機）。
- 換畫面 200 毫秒、`cubic-bezier(0.23, 1, 0.32, 1)`：往下一層從被點的東西那一側進來，回上一層原路退回；不擋操作、可以被下一下打斷。
- 系統「減少動態」時：位移、縮放、滑入改成直接出現，只留 ≤ 120 毫秒的淡入淡出。

## 9. 文字重點

說明文字不是一整團灰字，讀的人要一眼找到數字、名詞、代價：

- **數字**：`--tx-strong`、粗體、等寬；單位不加粗。
- **會改變玩法的名詞**：`--affix`，接 `termify` 的名詞卡；同一段只有第一次可以點。
- **傷害類型與抗性**：`--el-*`，只上那個詞。
- 每段最多兩種強調色。說明寫玩家要知道的事，不寫介面怎麼用；區塊沒內容就不出現。

## 10. 場景（不是面板，各有各的規則）

- **地形**（`biome.js`：temple、lava、tomb、ice）：每種地形只用自己的四個場景 token；地板一定要暗（面板對場景地面 ≥ 1.4:1），亮色只當點綴，不抖色、不反鋸齒。新地磚是 PixelLab 32px，烘法與比例照畫法規則 §1、§3。燈光由程式的暗層與光暈疊上去，不畫進地磚。
- **營地**：沿用藏身處底圖（M2-11），色帶跟 temple 一樣；底圖裡的舊抖色這輪不動。
- **戰鬥特效與跳數字**：顏色只用元素、稀有度、昇華、追逐與 `--fx-*`；飽和面積有上限；跳數字永遠在最上面（畫法規則 §6、§7）。
- **開場**：全黑底、白色襯線字幕、右上跳過；像素場景分層視差。
- **世界地圖**：全螢幕像素大陸是主角；血紅只給血霧與裂縫，黃色只給主線與下一目標；節點面板照一般面板（`--panel`＋`--border-mid`），不是浮在地圖上的玻璃。
- 戰鬥畫面圖層、營地總覽、素材怎麼接進遊戲：`M2-33-3a-scene-assets.md`；追逐物品、橫幅、光柱、掛機卡、王倒下卡、離線摘要、開場跳過：`M2-33-3b-feedback.md`。

## 11. 做與不做

**做**
- 動手前先寫這個畫面的三題答案（第 1 節），做完跑 `tools/ui_look.js` 對預算。
- 要加一樣東西，先問能不能拿掉一樣。
- 鎖住、不能用的東西寫原因；選中的東西整塊亮起來並捲進畫面。
- 只寫角色 token；要新顏色，先請 Game Art Director 加進 M2-36 色票。

**不做**
- 不用縮字、加框、加顏色來塞更多資訊。
- 不把同一個名字或數字在一個畫面寫兩次。
- 不讓裝飾（紋路、漸層、光暈）比資訊亮；介面不用外發光，稀有度靠框與角標、追逐靠雙框＋印角。
- 不用灰色半透明面板＋細線（使用者否定：後台工具感）、不用金色介面、不用紅色主要按鈕。
- 不為單一面板發明新的卡片、按鈕、圓角或顏色。

## 來源

2026-11-13 查的，只取做法、照我們的遊戲改寫。每一條只讀過一次，要逐字引用前請再對原頁。

- 一秒測試的三題：Celia Hodent 的截圖三問「這是什麼、怎麼用、為什麼重要」（[celiahodent.com](https://celiahodent.com/gamers-brain-ux-onboarding/)）。
- 瞇眼圖、字級與顏色要少、先用留白分組再加框：NN/g〈Visual Hierarchy〉（[nngroup.com](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)）；漸進揭露最多兩層（[nngroup.com](https://www.nngroup.com/articles/progressive-disclosure/)）。
- 半版面板不放長內容：NN/g〈Bottom Sheet〉（[nngroup.com](https://www.nngroup.com/articles/bottom-sheet/)）。
- 點擊區與畫面中央最準：Apple HIG（44pt）、Android（48dp）、Steven Hoober 的實測（[uxmatters.com](https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php)）。
- 亮點只留給關鍵的事：Apple HIG〈Tab bars〉（[developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/tab-bars)）。
- 比實際結果、不比等級：Diablo 4 綠箭頭的玩家回饋（[論壇](https://us.forums.blizzard.com/en/d4/t/greenred-arrows-on-items-ruin-decision-making/14189)，不是開發者說法）；預設只列推薦的輔助：PoE2（[maxroll.gg](https://maxroll.gg/poe2/resources/skills-in-path-of-exile-2)，二手）。
- 說明框一句白話＋可以掃讀的數值：Last Epoch 開發者貼文（[forum.lastepoch.com](https://forum.lastepoch.com/t/overhauling-tooltips-to-better-present-information/16076)）。
- 批量購買的按鈕寫數量與價錢：Kongregate〈The Math of Idle Games〉（[gamedeveloper.com](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)）。
- 拖曳要有把手與替代做法：NN/g〈Drag–and–Drop〉（[nngroup.com](https://www.nngroup.com/articles/drag-drop/)）。
- 五秒測試、第一下點擊：[centercentre.com](https://articles.centercentre.com/five_second_test/)、[measuringu.com](https://measuringu.com/first-click/)。

**沒找到一手來源的**：ARPG 或掛機遊戲團隊自己講「升級訊號、前後數值對比」的演講或檢討、按住連續升級、中文最小字級、點擊次數的上限。這幾條是我們自己的判斷，量出來不對就改。

## 程式還沒跟上的地方

這份寫的是 M2-36／M2-33 定稿的樣子；main 還是 0.5.4 的色值與舊 token 名、`img/ui/frame.png` 九宮格與漸層。換的順序：M2-36a token 收斂 → M2-38 資訊架構（M2-37）→ M2-34 視覺實作（照 M2-33）。在那之前動到哪個面板：不加新的色碼、漸層、九宮格，不新增舊 token 名的用法。
