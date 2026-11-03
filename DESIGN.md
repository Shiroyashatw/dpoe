---
name: dungeonPOE
description: 瀏覽器裡的 PoE 式刷寶 ARPG：近黑石材底、古銅雙框、襯線金標題、D2 稀有度色
colors:
  void: "#070605"
  stone-top: "#17130f"
  stone-base: "#0e0b09"
  well: "#0a0807"
  title-band-top: "#241b12"
  title-band-base: "#130f0b"
  bronze-dark: "#5a4628"
  bronze: "#b8955a"
  bronze-bright: "#d7b77c"
  title-gold: "#e6c88e"
  parchment: "#e8e2d6"
  button-ink: "#e9dfcd"
  ash: "#a1968a"
  locked-ink: "#6a6259"
  oxblood-top: "#6b2414"
  oxblood-base: "#3a110a"
  rarity-normal: "#e8e2d6"
  rarity-magic: "#8ab4ff"
  rarity-rare: "#ffd166"
  rarity-gem: "#4fd1c5"
  band-normal: "#15110d"
  band-magic: "#121833"
  band-rare: "#2a210d"
  band-gem: "#0e2826"
  affix-blue: "#9aa6ff"
  good: "#7bd36b"
  bad: "#e5484d"
  warn: "#ffb38a"
  fire: "#ff8a4c"
  cold: "#8fd6ff"
  lightning: "#ffe066"
  chaos: "#c38bff"
typography:
  title:
    fontFamily: "Noto Serif TC, Songti TC, PMingLiU, serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  headline:
    fontFamily: "Noto Serif TC, Songti TC, PMingLiU, serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.04em"
  section:
    fontFamily: "Noto Serif TC, Songti TC, PMingLiU, serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.04em"
  body:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  micro:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "11px"
    fontWeight: 700
rounded:
  frame: "2px"
  item: "1px"
  orb: "50%"
spacing:
  sp: "8px"
  panel: "14px"
  panel-touch: "10px"
components:
  button:
    backgroundColor: "{colors.stone-base}"
    textColor: "{colors.button-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.frame}"
    padding: "10px 18px"
    height: "44px"
  button-hover:
    textColor: "{colors.title-gold}"
  button-primary:
    backgroundColor: "{colors.oxblood-top}"
    textColor: "{colors.title-gold}"
    rounded: "{rounded.frame}"
    padding: "10px 18px"
    height: "44px"
  button-mini:
    backgroundColor: "{colors.stone-base}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.frame}"
    padding: "4px 8px"
    height: "32px"
  panel:
    backgroundColor: "{colors.stone-base}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.frame}"
    padding: "{spacing.panel}"
  panel-title:
    backgroundColor: "{colors.title-band-top}"
    textColor: "{colors.title-gold}"
    typography: "{typography.title}"
    padding: "12px 56px 10px"
  tooltip-header-rare:
    backgroundColor: "{colors.band-rare}"
    textColor: "{colors.rarity-rare}"
    typography: "{typography.headline}"
    padding: "8px 14px 2px"
  tooltip-header-magic:
    backgroundColor: "{colors.band-magic}"
    textColor: "{colors.rarity-magic}"
    typography: "{typography.headline}"
    padding: "8px 14px 2px"
  chip:
    backgroundColor: "{colors.void}"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.frame}"
    padding: "0 6px"
    height: "32px"
  skill-slot:
    backgroundColor: "{colors.void}"
    rounded: "{rounded.frame}"
    size: "52px"
  orb:
    backgroundColor: "{colors.void}"
    rounded: "{rounded.orb}"
    size: "96px"
  drop-label-rare:
    backgroundColor: "{colors.band-rare}"
    textColor: "{colors.rarity-rare}"
    height: "20px"
---

# Design System: dungeonPOE

## Overview

**Creative North Star: "古銅鑲邊的刷寶台"**

dungeonPOE 的介面是一件鑲在近黑石材上的古銅器：每個面板、說明框、技能托盤、生命魔力球、小地圖，甚至 canvas 上的互動提示，都用同一套外暗內亮的古銅雙框圍起來，標題用金色襯線字壓在一條深色標題帶上。它走 ARPG 的標準做法（使用者確認的 canon），品質標準是 Path of Exile 2 與 Last Epoch；像 PoE 沒關係，要的是玩家一眼就認出「這是正統 ARPG」。

資訊密度高但分層清楚：戰鬥中只露出球、托盤、王血條、小地圖與掉落標籤，深度留在面板裡。稀有度是整套系統唯一會「發光」的東西：地上的光柱、掉落標籤的框與底、說明框的標題列、格子背包裡道具的底色，從地上到說明框都是同一組 D2 稀有度色，掉落因此有份量。

拒絕的方向（使用者確認）：「灰色半透明面板＋細線」的後台工具感。面板是不透明的石材，不是玻璃。

元件規格、測試尺寸與技術限制在 `docs/介面規範.md`（專案的元件規則書）；這份只記視覺系統，兩份要一致。

**Key Characteristics:**
- 近黑暖石底（由上 `stone-top` 到下 `stone-base` 的直向漸層），不透明。
- 古銅雙框：外圈暗銅 3px 環、內圈亮銅 1px 線、內縮 5px 的淡銅細線，四角 7px 小菱形。
- 金色 Noto Serif TC 標題；內文 Noto Sans TC 米白。
- 圓角幾乎為零（2px），只有球與手機技能鍵是正圓。
- 稀有度色從地上標籤一路貫穿到說明框標題列。

## Colors

暖黑石材與古銅金構成底盤，稀有度色與元素色是唯一的高彩度。

### Primary
- **古銅（Bronze）**：面板、說明框、技能托盤、王血條、球、小地圖、canvas 提示框的主框線；分隔標題帶與內容的那條線。
- **暗銅（Bronze Dark）**：雙框的外圈、普通按鈕與格子、技能格的框；也是空格內線條圖示的底色系（圖示用更暗的 `#7d6a4c`）。
- **亮銅（Bronze Bright）**：hover、選中（`.on`）、鍵盤焦點的框色；四角菱形的填色；按下技能格時的閃框。
- **標題金（Title Gold）**：所有襯線標題、按鍵提示字（技能格左上的鍵名）、天賦樹已點的連線用亮銅。

### Secondary
- **牛血紅（Oxblood）**：只用在主要按鈕 `.btn.pri`（由 `oxblood-top` 到 `oxblood-base` 的漸層、亮銅框、襯線字）。一個畫面最多一顆。

### Tertiary
- **稀有度色**：普通米白、魔法藍、稀有黃、寶石青（`--r0`～`--r3`）。每個稀有度配一個深色標題帶（`band-*`），說明框標題列與走近時的掉落標籤底色共用這組。
- **詞綴藍（Affix Blue）**：說明框裡的詞綴文字，比魔法藍偏紫一點，跟名字的稀有度色分開。
- **元素色**：火、冰、電、混沌，只用在抗性、傷害類型、元素特效（和 `js/data.js` 的 `ELC` 一致）。
- **狀態色**：good 綠（比較時的▲、擺得下）、bad 紅（死亡標題、擺不下、壞連結）、warn 橘（地圖危險詞、地圖台的警示）。

### Neutral
- **深淵（Void）**：頁面底、格子背包底、球與技能格的內凹底。
- **石材（Stone）**：面板、說明框、死亡卡、HUD 中央托盤的底（`--stone` 漸層）。
- **井底（Well）**：關閉鈕、天賦樹說明列、捲軸軌道。
- **標題帶**：面板第一列與天賦樹工具列的底（`title-band-top` 到 `title-band-base`）。
- **米白（Parchment）**：內文；**按鈕墨（Button Ink）**：按鈕字；**灰燼（Ash）**：次要說明；**鎖住墨（Locked Ink）**：鎖住的項目、空技能格的＋號。
- 內部分隔線：`rgba(196,160,104,0.2)`（`--line`）；說明框段落線：`rgba(140,109,63,0.25)`。

### Named Rules
**The Only-Rarity-Glows Rule.** 有光暈、光柱、彩色底色的只能是稀有度（以及元素特效）。介面框一律古銅，不拿稀有度色當裝飾。

**The One-Path Rarity Rule.** 同一件道具在地上標籤、格子背包、裝備欄、說明框標題列用同一組稀有度色與同一組標題帶底色；canvas 的 `RCOL`／`RBG` 必須等於 CSS 的 `--r*` 與 `#tip` 標題帶。

## Typography

**Display Font:** Noto Serif TC 700（備用 Songti TC、PMingLiU）
**Body Font:** Noto Sans TC 400／500／700（備用 PingFang TC、Microsoft JhengHei）

**Character:** 襯線金字負責「儀式感」：標題、主要按鈕、王名、區域名、互動提示、警告字；其餘全部是無襯線米白，保持戰鬥中好讀。

### Hierarchy
- **Title**（襯線 700，19px，行高 1.2，字距 0.08em，金）：面板標題、天賦樹工具列標題。桌機置中、兩側 36px 漸層細線。
- **Headline**（襯線 700，18px，行高 1.3，字距 0.04em）：說明框的道具名（稀有度色）、王名（`#f0d49c`，字距 0.14em）、警告字。
- **Section**（襯線 700，14px，字距 0.04em，金，下有細線）：面板內的小節標題 `.ph2`。
- **Body**（無襯線 500，14px，行高 1.5）：內文、按鈕（700）、地圖卡。
- **Label**（無襯線 500，12px）：說明、數值列、材料晶片、首領進度（襯線 12px，字距 0.1em）。
- **Micro**（無襯線 700，11px）：技能格的鍵名、詞綴層級（T1～T12）、裝備欄空格名。手機 HUD 最小 10px（球上的數字）。

### Named Rules
**The Serif-Is-Ceremony Rule.** 襯線只給標題、主要動作、王與地點的名字、canvas 的互動提示；清單內容、數值、說明不用襯線。

## Layout

全螢幕 canvas 戰鬥畫面上疊 DOM HUD 與面板，面板不加遮罩、遊戲照跑。

- **桌機 HUD**：底部中央「生命球（96px）＋框起來的托盤（經驗條在上、技能格 52px 一排）＋魔力球」；上方中央王血條（`min(520px, 60vw)`）與首領進度；右上小地圖（190px 寬、古銅框）；左下操作提示。
- **桌機面板**：背包從右、倉庫／技能寶石／鍛造從左，寬 462px、距邊 16px、上下 16px 內捲動；地圖台、生成寶石置中，寬 `min(560px／680px, 100vw − 24px)`。
- **手機橫向（`body.touch`）**：球縮成 56px 移到左上、托盤去框；技能鍵改成右下的圓形弧陣（普攻 80px、技能 58px、翻滾與藥水 48～56px）；左下浮動搖桿；右上選單；小地圖縮小移到選單下方。面板距邊 6px、內距 10px；寬度 ≥ 800px 左右並排各半，窄於 800px 一次一個（標題列的切換鈕）。
- **節奏**：基準 8px（`--sp`），面板內距 14px（手機 10px），面板標題帶以負邊距貼齊面板外緣並在捲動時黏在頂端。
- 驗收尺寸：1440×900、1280×720、844×390、667×375（`docs/介面規範.md` 第 1 節）。

**和方向合約的差異（照實作記錄）：** 合約要求標題置中、兩側飾線。桌機照做；手機橫向刻意維持左對齊、一行（標題＋說明＋切換＋關閉），因為 375px 高沒有垂直空間放兩行標題帶。天賦樹工具列同樣只在桌機置中。

## Elevation & Depth

深度靠「框環＋內凹」而不是浮起：面板與說明框用零偏移的多層 box-shadow 畫出黑／暗銅／黑三圈框環，再加一層大範圍暗影把面板從遊戲畫面分開；槽位（裝備欄、格子背包、技能格、球）用內陰影做成凹進石材的井。

### Shadow Vocabulary
- **古銅框環**（`--frame`：`0 0 0 1px #000, 0 0 0 3px var(--fr-o), 0 0 0 4px #000`）：面板、說明框、HUD 托盤、死亡卡的外框。與 1px 亮銅 border 和內縮 5px 的淡銅 outline 一起構成雙框。
- **面板落影**（`0 18px 48px rgba(0,0,0,0.75)`）：面板；說明框用 `0 12px 32px rgba(0,0,0,0.8)`；托盤用 `0 8px 24px rgba(0,0,0,0.7)`。
- **凹槽**（`inset 0 0 8～12px #000`）：技能格、裝備欄、格子背包。
- **球框**（亮銅 2px、黑 2px、暗銅 1px 三環＋`inset 0 0 22px #000`）＋左上高光、外緣暗角、液面上緣一條白線。

### Named Rules
**The Ring-Not-Lift Rule.** 陰影是零偏移的框環或內凹；不使用偏移的硬陰影，也不用 backdrop-filter 或毛玻璃。

## Shapes

直角世界：面板、說明框、按鈕、晶片、卡片、格子、技能格都是 2px 圓角（格子裡的道具 1px）。只有生命／魔力球、手機技能鍵、搖桿、天賦點是正圓。四角的 7px 亮銅小菱形（`--dia`）是框的簽名：面板上兩顆畫在標題帶、下兩顆畫在面板本體；說明框與死亡卡四角都有。小地圖上的稀有裝用黑邊金菱形，和角飾同一個形狀語彙。鎖住的項目用虛線框＋暗字，不只靠半透明。

## Components

### Buttons
- **Shape:** 近乎直角（2px），最小高 44px（`.btn.mini` 32px）。
- **Default:** 由上到下的深色凹面漸層（`#221a13`→`#120e0b`）、暗銅框、頂緣一條 6% 的暖色亮線。
- **Hover / Focus:** 框變古銅、字變標題金；`:focus-visible` 為 1px 亮銅 outline、外推 2px；`:active` 縮到 0.97。
- **Primary:** 牛血紅漸層、古銅框（hover 亮銅）、襯線字、字距 0.08em；一個畫面最多一顆，地圖台裡黏在底部。

### Chips / Tabs
- **Style:** 32px 高、2px 角、半透明黑底、細線框；分頁 `.ftabs`、天賦樹頁籤同款。
- **State:** `.on` 為亮銅框＋標題金字＋10% 亮銅底。寶石相關的分段（`.gkind`、`.gtab`）選中用寶石青框，因為那是稀有度語意。

### Cards / Containers
- **Panel:** 石材底、雙框、2px 角、14px 內距；第一列是黏住的標題帶（深色漸層、底邊古銅線、兩顆上角菱形）。桌機標題置中＋兩側細線、說明在第二行、關閉鈕固定右上；手機一行左對齊。
- **List cards**（`.gcard`、`.mcard`、`.tinfo`、`.fsel`）：40% 黑底、細線框、2px 角；地圖卡的字色與選中框用星級色 `--sc`。

### Tooltip（Signature）
照 PoE：名字置中在稀有度標題帶（普通 `band-normal`、魔法 `band-magic`、稀有 `band-rare`、寶石 `band-gem`），名字用稀有度色襯線 18px，下面一行灰燼色的類型，再一條暗銅線；之後每段（底材、隱性詞、詞綴、比較、賣價）置中、段與段之間淡銅細線；詞綴是詞綴藍，層級標籤灰紫 11px。最小寬 240px、最大 300px（手機 `min(320px, 100vw − 16px)`），超高時內捲動。沒有標題的純文字說明退回左對齊。

### Drop Label（Signature，canvas）
PoE 式掉落標籤：20px 高、遠時近黑底、走近時換成該稀有度的標題帶底色；框與字都是稀有度色，稀有或走近時框 2px。魔法掉落有 6px 淡藍光柱，稀有有 14px 金色光柱＋中心亮芯、會呼吸；小地圖上標金菱形。

### HUD
- **球：** 96px（手機 56px），三環古銅框、玻璃高光；能量護盾是疊在生命上的白層，精魄是魔力球左側的弧。
- **托盤：** 石材底雙框，內含 5px 經驗條（暗金到亮金）與 52px 技能格；技能格內凹、暗銅框、hover 古銅、左上標題金鍵名、冷卻是由下往上的 70% 黑遮罩。
- **王血條：** 襯線金名、14px 血條、古銅框環、深紅漸層。
- **Canvas 提示：** 互動提示、小地圖用 `bronzeRect`（外 3px 暗銅、內 1px 古銅），提示字襯線 15px 標題金。

### Icons
介面小圖示是同一套 16×16 線條 SVG（`ICO`：關閉、加號、鎖、翻滾；1.5px、`currentColor`、圓頭），取代 emoji 與符號字。道具、寶石、天賦、怪物一律是 PixelLab 像素圖，`image-rendering: pixelated`。

## Do's and Don'ts

### Do:
- **Do** 每個新面板、浮層、canvas 框都用古銅雙框（CSS 的 `--frame`＋`--fr` border＋內縮 outline；canvas 用 `bronzeRect`），角落放 `--dia` 菱形。
- **Do** 圓角一律 2px（道具 1px），只有球、圓形觸控鍵與天賦點例外。
- **Do** 標題、主要按鈕、王名、地點名用 Noto Serif TC 700 標題金；其餘用 Noto Sans TC。
- **Do** 新的稀有度或道具種類同時補三處：CSS 的 `--r*`／`.it.r*`／`#tip` 標題帶、canvas 的 `RCOL`／`RBG`、光柱。
- **Do** 選中、hover、焦點統一走亮銅框（寶石類分段例外用寶石青）。
- **Do** 鎖住的東西用虛線框＋鎖住墨，並寫出原因。
- **Do** 新的介面小圖示畫成 16×16、1.5px 線條的 SVG 加進 `ICO`。

### Don't:
- **Don't** 用灰色半透明面板＋細線（使用者拒絕的後台工具感）；面板底要不透明的石材。
- **Don't** 用 backdrop-filter、毛玻璃或偏移的硬陰影。
- **Don't** 把稀有度色或元素色拿來當框或裝飾。
- **Don't** 在介面上用 emoji 或符號字當圖示。
- **Don't** 在一個畫面放第二顆牛血紅主要按鈕。
