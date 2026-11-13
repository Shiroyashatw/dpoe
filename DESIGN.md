---
name: dungeonPOE
description: 掛機打寶 ARPG。手機直立為主。每個畫面一秒內看得出「這是什麼、哪裡能變強、要按哪裡」；鐵灰底、鑄鐵銀框、鋼藍灰主按鈕，顏色只拿來說話
colors:
  surface-0: "#17181b"
  surface-1: "#26282d"
  surface-2: "#2f3137"
  surface-3: "#3a3d44"
  title-band-top: "#3d4a58"
  title-band-base: "#2f3945"
  frame-dark: "#454952"
  frame: "#5f636e"
  frame-bright: "#c3c7d0"
  title: "#f4f5f7"
  text: "#e9eaed"
  dim: "#aeb2bb"
  locked: "#979ba5"
  action: "#47596a"
  action-hi: "#566c80"
  selected: "#d3d7de"
  selected-ink: "#17181b"
  good: "#7bd36b"
  bad: "#e5484d"
  warn: "#ffb38a"
  rarity-normal: "#e8e2d6"
  rarity-magic: "#8ab4ff"
  rarity-rare: "#ffd166"
  rarity-gem: "#4fd1c5"
  band-normal: "#15110d"
  band-magic: "#121833"
  band-rare: "#2a210d"
  band-gem: "#0e2826"
  affix-blue: "#9aa6ff"
  fire: "#ff8a4c"
  cold: "#8fd6ff"
  lightning: "#ffe066"
  chaos: "#c38bff"
  asc: "#ff9f43"
  asc-bg: "#241510"
  asc-on: "#5a2a12"
  awakening: "#b592ff"
  awakening-bg: "#1b1526"
typography:
  title:
    fontFamily: "Noto Serif TC, PMingLiU, serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.08em"
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
  body:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  strong:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  label:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  frame: "2px"
  item: "1px"
  orb: "50%"
spacing:
  sp: "8px"
  group: "16px"
  panel: "14px"
  panel-touch: "10px"
components:
  button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.strong}"
    rounded: "{rounded.frame}"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.action-hi}"
    textColor: "{colors.title}"
    typography: "{typography.strong}"
    rounded: "{rounded.frame}"
    height: "48px"
  row:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    height: "56px"
  row-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.selected-ink}"
  card:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.frame}"
    padding: "12px"
  chip:
    backgroundColor: "{colors.surface-0}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.frame}"
    height: "32px"
  panel-title:
    backgroundColor: "{colors.title-band-top}"
    textColor: "{colors.title}"
    typography: "{typography.title}"
---

# Design System: dungeonPOE

## 怎麼用這份

**這份先管「玩家看不看得懂」，再管「長什麼樣」。** 0.4.7 以前這份只寫框、顏色、字體，每個面板都照做了，量出來還是一個畫面 11 種字的樣式、23～51 個框、沒有主角（2026-11-13 的清點）。所以順序改成：

1. 先過第 1 節的**一秒測試**與第 7 節的**預算**（用 `tools/ui_look.js` 量，不用感覺）。
2. 再照第 3～6 節的字、顏色、框、元件。
3. **規則跟一秒測試衝突時，一秒測試贏，回頭改這份。** 不要為了守某一條規則把畫面做得看不懂。

元件的 class、測試尺寸、技術限制在 `docs/介面規範.md`；流程在 skill `ui-design`。

## 1. 一秒測試（最高優先）

掛機遊戲裡玩家能做的只有配裝、配技能、點天賦與昇華，面板就是玩法本身。玩家打開任何一個畫面，一秒內要答得出三題：

| 題目 | 靠什麼答 |
| --- | --- |
| **這是什麼**（我在看哪一招、哪一件、哪個昇華） | 一個名字、一個主數字。名字與等級在一個畫面只出現一次 |
| **哪裡能變強** | 「變強的語言」（第 2 節）：綠色 ▲ 與差多少；現在就做得到的事排在最上面 |
| **要按哪裡** | 一顆主要按鈕，固定在面板底部；它上面寫動作與代價 |

怎麼驗：把畫面模糊成灰階（瞇眼圖），最亮、最大的三樣東西要是**主數字、主要按鈕、選中的東西**。最亮的是裝飾、鎖、重複的標籤，就是沒過。

## 2. 版面原則

1. **一個畫面一件事。** 「看整套」「改這一個」「挑一個放進來」是三個畫面，不擠在一起。層級固定：總覽 → 這一個 → 挑選；回上一層的方法每個面板都一樣。
2. **先摘要，細節點了才出現。** 預設只有一個主數字與最多三個次要數字；算式、標籤、完整說明點了才展開，展開的內容要出現在看得到的地方（自動捲進畫面）。
3. **用間距分組，不用框。** 同一組的東西間距 8px，組與組之間 16px。框只給兩種東西：可以按的卡片、放道具的凹槽。說明文字、數字、標題都不加框。
4. **裝飾不能比資訊亮。** 鎖鏈、齒輪、紋路只能用 `frame-dark`；還很遠才用得到的東西（還沒輪到的鎖孔）不畫，只畫「下一個能開的」並寫代價。
5. **同一種點法，同一種結果。** 點一個東西只會是「選它」；要花資源的動作一定是有字的按鈕，不放在可以選的東西旁邊當同一種圖示。
6. **要選的東西放中間，固定的動作放底部。** 人最常、最準點到的是畫面中央（流傳的「拇指熱區圖」原作者已經說它不準），所以清單與要選的東西放中間，主要按鈕固定在底部一列，最上面只放現況（標題、資源數量、關閉）。靠角落的點擊區要比中間的大。
7. **要讀、要比較的畫面不放半版。** 手機直立的半版面板只給看一眼就走的東西（戰利品、角色）；技能、做裝、昇華一打開就是全版。
8. **重複的動作要省力。** 會連按的按鈕（升級）支援按住連續；一次升好幾級的按鈕上寫升幾級與總價；清單記住上次的篩選與捲動位置。拖曳排序要有把手，並且另外給一個不用拖的做法。
9. **變強的語言**（全遊戲同一套，不只靠顏色）：
   - 比的是**對你現在這套的實際結果**，不是等級或階級（Diablo 4 的綠箭頭只比道具強度，玩家抱怨它會騙人）。
   - 清單預設只列對這一個有效果的，其餘收在「全部」（PoE2 的輔助清單預設只列推薦的）。
   - 比現在好：`good` 綠＋▲＋數字（「▲ 每秒 +9」）。比現在差：`bad` 紅＋▼＋數字。一樣：`dim`「＝」。
   - 不加傷害的效果直接寫它給什麼（「範圍 +40%」），不硬湊成傷害。
   - 算不出來的寫原因（「有條件：完美閃避後」），沒有效果的寫為什麼並排到最後。
   - 清單預設照「差多少」從大到小排。
   - 分頁列與清單上的亮點只代表一件事：**現在就做得到，而且會變強**。不拿來通知別的。

## 3. 字

六種樣式，一個畫面最多用六種（`tools/ui_look.js` 把「字級＋粗細＋字體」算一種）：

| 樣式 | 規格 | 用在 |
| --- | --- | --- |
| 標題 `title` | 襯線 900・24px（桌機 19px） | 面板標題、昇華與王的名字 |
| 主數字 `number` | 黑體 700・28px・等寬數字 | 每個畫面唯一的大數字 |
| 小標 `heading` | 黑體 700・18px | 選中那個東西的名字 |
| 內文 `body` | 黑體 500・14px・行高 1.5 | 說明、清單的名字 |
| 強調 `strong` | 黑體 700・14px | 數字、按鈕上的字、差多少 |
| 標籤 `label` | 黑體 500・12px | 次要資訊、單位、原因 |

- 一個畫面的字級最多四種：12、14、18，加一個大的（24 或 28）。
- **面板裡沒有 12px 以下的字。** 這是我們自己訂的（中文最小字級沒有找到業界的一手數字；iOS 的下限是 11pt）：0.4.7 有四成的字縮到 11px，結果是擠。放不下代表資訊太多，刪資訊，不縮字。HUD 壓在戰鬥上的條上數字與鍵位可以到 10px。
- 襯線只給標題與名字（儀式感）；按鈕、清單、數字、說明一律黑體。
- 數字一律 `tabular-nums`，單位不加粗。

## 4. 顏色：一種顏色只說一件事

| 顏色 | 只代表 |
| --- | --- |
| 鐵灰四階 `surface-0`～`3` | 底：0 凹槽、1 面板、2 卡片、3 按下或浮起 |
| `text`／`dim`／`locked` | 字：內文與標題／次要／鎖住。`title` 跟 `text` 只差一點點、看不出來，面板裡當同一個用，層級靠字級與粗細 |
| 鋼藍灰 `action` | 主要按鈕與標題帶。一個畫面一顆主要按鈕 |
| 銀底 `selected` | 現在選中的那一個（整塊銀底、深色字） |
| `good` 綠 | 變強、可以做、生效中 |
| `bad` 紅 | 變弱、危險、已失效、不能用 |
| `warn` 橘粉 | 只給地圖的危險度。面板裡的代價用 `dim` 寫清楚，失效與不能用歸 `bad` |
| 稀有度色與標題帶 | 只給道具稀有度；全遊戲唯一會發光的東西 |
| `affix-blue` | 會改變玩法的名詞（可以點出名詞卡） |
| 元素色 | 傷害類型與抗性，只上那個詞 |
| `asc` 橘 | 只給昇華 |
| `awakening` 紫 | 只給覺醒 |

- 一個畫面的字色最多五種（內文、次要、選中銀底上的深色字＋最多兩種有意義的顏色）。
- 黃色只給稀有度，金色不當介面色，紅色不當主要按鈕（使用者否定過：金色俗、朱紅像錯誤訊息）。
- 帶資訊的字對比至少 4.5:1。

## 5. 形狀、框、深度

- **圓角一律 2px**（格子裡的道具 1px）。正圓只給生命與魔力球、手機技能鍵、搖桿、天賦點、技能的孔。昇華的卡片也是 2px。
- **框只有三種**：`frame-dark` 1px 實線（可以按的卡片、凹槽）、`frame-bright` 2px 實線（鍵盤焦點、按下）、`frame-dark` 1px 虛線（空格）。選中用銀底，不另外換框色。
- **鑄鐵銀框**（`img/ui/frame.png` 九宮格，上左亮、下右暗，沒有角飾與鉚釘）只給桌機浮在戰鬥上的面板、說明框、HUD 托盤。手機直立的面板是滿寬的底板，沒有外框。
- 深度靠底色的階與內凹，不用偏移的硬陰影、毛玻璃、`backdrop-filter`。面板底是不透明的鐵灰。

## 6. 元件：每一種只有一個長相

新畫面先從這裡拿；真的沒有才新增，並寫回這裡與 `docs/介面規範.md` 第 3 節。

| 元件 | 長相與規則 |
| --- | --- |
| **主數字區** | `label` 的名稱在上、`number` 在下，旁邊最多三個 `label` 次要數字。沒有框 |
| **清單列** | 56px 以上：圖示 36px、`body` 名字＋一行 `label` 說明、右邊是 `strong` 的數值或差多少。整列可以按；選中整列銀底。挑技能、挑輔助、挑光環、昇華清單都用它 |
| **卡片** | `surface-2` 底、`frame-dark` 框、2px 角、內距 12px。一張卡一個主題；卡裡不再放卡 |
| **按鈕** | 44px 高、黑體 700。主要按鈕鋼藍灰、48px、寫動作與代價（「升到 Lv 2・14」）；不能按時變暗並把原因寫在按鈕上 |
| **底部動作列** | 手機直立黏在面板底部：一顆主要按鈕（佔一半以上寬）＋最多兩顆一般按鈕。再多的收進「更多」 |
| **篩選晶片** | 32px 高、一行、可以橫向捲，不換行。選中銀底 |
| **凹槽** | `surface-0` 底、內陰影。空的是虛線＋「＋」＋一個詞說明放什麼 |
| **差多少** | ▲／▼／＝ 加數字，`strong`，照第 2 節第 9 條上色 |
| **亮點** | 8px 圓點，`title` 白。只代表「現在做得到而且會變強」 |
| **說明框** | 名字在稀有度標題帶上（襯線、稀有度色），下面一行類型；每段置中、段與段一條細線；詞綴用 `affix-blue`。桌機滑過出現，手機點一下出現並帶動作鈕；永遠不蓋住被點的東西 |
| **掉落標籤**（canvas） | 20px 高，遠時近黑底、走近換成稀有度標題帶；框與字是稀有度色。魔法淡藍光柱、稀有金色光柱 |
| **HUD** | 生命與魔力球、技能托盤、王血條、小地圖用鑄鐵銀框；戰鬥中只露出這些，深度留在面板裡。壓在戰鬥上的字要有底或描邊 |
| **圖示** | 道具、技能、天賦是像素圖（`image-rendering: pixelated`）；介面小圖示是 `ICO` 的 16×16 線條圖。同一排不混兩種，不用 emoji 與符號字 |

### 技能面板與昇華石碑

- **技能面板**三個畫面（0.4.8 做完）：**總覽**（可以變強的事排最上面；下面是出招順序的清單列，可以拖曳換順序，每列寫每秒）→ **這一招**（名字一次；主數字在左、圓環縮小當徽章放右邊：圓心是技能、周圍只畫開了的孔與下一個能開的；下面是說明與每孔一列的輔助；底部動作列）→ **挑選**（清單列，照差多少排，選了一列在原地展開說明、底部出現主要按鈕）。
- **昇華石碑**：手機與桌機同一套「選 4 個大點」的卡片清單，不畫盤面。每張卡寫對你現在這套的影響；選中的卡用 `asc` 橘的框與圖示底，文字仍是 `text`。「成為○○」是底部動作列的主要按鈕。
- 覺醒紫只給覺醒（槽、卡、標記）。

## 7. 預算（驗收用，數字說話）

`node tools/ui_look.js [寬] [高] [網址]` 量每個畫面看得到的範圍，並輸出瞇眼圖。改之前、改之後各跑一次，兩組數字都附在回覆裡。

| 項目 | 上限 | 0.4.7 的技能面板 |
| --- | --- | --- |
| 字的樣式（字級＋粗細＋字體） | 6 種 | 11～12 種 |
| 字色 | 5 種 | 6～10 種 |
| 框的種類 | 4 種 | 7～8 種 |
| 有框的元素 | 總覽與「這一個」12 個；清單每列 1 個＋6 個 | 23／51 個 |
| 12px 以下的字 | 0% | 43～52% |
| 主要按鈕 | 1 顆 | 1 顆 |
| 放大的數字 | 1 個 | 1 個 |
| 同一個資訊出現次數 | 1 次 | 名字與等級 4 次 |

數字量不到的兩項用人測：**五秒測試**（給沒看過的人看五秒，問「這頁最重要的是什麼、要怎麼做」）與**第一下點擊**（給一個任務，看第一下點在哪；第一下點對的人完成率高很多）。

操作與順暢的標準在 skill `ui-design`（最常做的事三下以內、按下到畫面更新 100 毫秒以內）。

## 8. 動態

- 按下就有回饋（縮到 0.96），放開才執行。
- 換畫面 200 毫秒、`cubic-bezier(0.23, 1, 0.32, 1)`：往下一層從被點的東西那一側進來，回上一層原路退回；不擋操作、可以被下一下打斷。
- 系統「減少動態」時只淡入淡出。

## 9. 文字重點

說明文字不是一整團灰字，讀的人要一眼找到數字、名詞、代價：

- **數字**：`title` 白、粗體、等寬；單位不加粗。
- **會改變玩法的名詞**：`affix-blue`，接 `termify` 的名詞卡；同一段只有第一次可以點。
- **傷害類型與抗性**：元素色，只上那個詞。
- 每段最多兩種強調色。說明寫玩家要知道的事，不寫介面怎麼用；區塊沒內容就不出現。

## 10. 場景（不是面板，各有各的規則）

- **藏身處**（0.2.44）：暖色泥地與篝火是主光，血光只留在洞口與神像受光面；烘好的有限色帶＋Bayer 抖色，物件有深色外框，跟像素圖同一種語言。
- **開場**：全黑底、白色襯線字幕、右上跳過；像素場景分層視差。
- **世界地圖**：全螢幕像素大陸是主角；血紅只給血霧與裂縫，黃色只給主線與下一目標；節點面板用鐵灰色階，不是浮在地圖上的玻璃。

## 11. 做與不做

**做**
- 動手前先寫這個畫面的三題答案（第 1 節），做完跑 `tools/ui_look.js` 對預算。
- 要加一樣東西，先問能不能拿掉一樣。
- 鎖住、不能用的東西寫原因；選中的東西整塊亮起來並捲進畫面。

**不做**
- 不用縮字、加框、加顏色來塞更多資訊。
- 不把同一個名字或數字在一個畫面寫兩次。
- 不讓裝飾（鎖鏈、齒輪、漸層、光暈）比資訊亮；光暈只給稀有度與元素特效。
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

## 還沒跟上的地方

這份是 2026-11-13 改寫的。技能面板已照這份重做（0.4.8）、昇華石碑還沒；其他面板（倉庫、角色、做裝、世界地圖的節點面板、設定）還是舊的樣子，`css/style.css` 裡還有 54 處 10～11px 的字、`warn` 橘還用在面板的原因文字上。動到哪個面板就把那個面板改到過預算，不必一次全改。
