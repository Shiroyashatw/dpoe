---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

## Scope
dungeonPOE 全部介面：戰鬥 HUD、所有面板、說明框、canvas 上的 UI（掉落標籤、跳數字、小地圖、互動提示、王血條）。Mode: Operate。桌機 1440×900／1280×720、手機橫向 844×390／667×375。

## Audience and job
玩過 PoE 的刷寶玩家：戰鬥中一眼讀血、魔、冷卻、王；面板裡比裝、擺寶石、點天賦、做裝。

## Direction contract
THESIS: 用 ARPG 的標準做法（使用者選的 canon），做到 PoE2／Last Epoch 的精緻度；拒絕現在「灰色半透明面板＋細線」的後台工具感。
OWN-WORLD: 近黑暖石底（#0d0b09→#17130f 細微直向漸層）、古銅金雙層框（外暗銅 #5a4628、內亮金 #b8955a 一像素）、角落小菱形；標題 Noto Serif TC 金色（#e3c58a）置中、兩側細飾線；內文 Noto Sans TC 米白；D2 稀有度色不變；說明框照 PoE：標題列底色依稀有度、名字置中、分隔線、詞綴置中藍字。
STORY: 玩家一眼知道這是正統 ARPG；掉落、稀有、升級有份量。
FIRST VIEWPORT: 戰鬥畫面不動。底部中間：古銅框的生命球（左）與魔力球（右），中間一條框起來的技能托盤＋上方經驗條；上方中間王血條（金框、名字襯線）；右上小地圖加古銅框；地上掉落標籤是 PoE 式黑底、稀有度色框與字；面板從右（背包）、左（倉庫／寶石／鍛造）滑入，標題列金色襯線。
FORM: canon（ARPG 標準做法，PoE2／Last Epoch 為品質標準）；seed:2a93be43fe692b51
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature move
說明框與掉落標籤的 PoE 式稀有度標題列（金／藍／白／青），從地上標籤到說明框一致。

## Constraints
只用 CSS＋現有像素圖，不加新圖；不用 backdrop-filter；HUD 文字用 setT 更新；不擋戰鬥畫面。
