# dpoe M4P-03 PWA 圖示、啟動畫面、安裝說明頁規格

> 本檔由製作人從 Page 同步，來源：<https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4a048eaf-301e-4490-9f07-81ced2fe7050>；同步日期：2026-11-17；請勿直接在 repo 修改，改動請經製作人

> 同步說明：本檔是 Game Art Director 規格 Page 的完整轉換，數字、文案與線框照原文（線框放在程式碼區塊）。本頁「已決定」各項是製作人 2026-11-17 10:29 的決定，Art Director 已回寫到 Page；決定內容也記在 [`gdd.md`](gdd.md) 決策紀錄與 [`milestones.md`](milestones.md)，不同時以決策紀錄為準。放進 DOC-06（只改文件的 PR）。

網頁／PWA 線（原 M4-03）。iOS 與 Android 的圖示、啟動畫面尺寸齊全，加上桌機安裝與分頁圖示；安裝說明頁的 390×844 與 1280×720 版面。不含 Steam 素材（膠囊圖、截圖計畫等在 M3-09，等真人試玩通過、Steam 階段恢復後才做）。2026-11-17（台北時間）。

## 任務與範圍

> **M4P-03（P1，Game Art Director）** 完成標準：iOS 與 Android 的圖示、啟動畫面尺寸齊全；390×844 與 1280×720 都驗過。驗收是 M4P-04（測試員只在 mumi 說要測時才做）。離線開啟是 M4P-01 的事，本頁的安裝說明在 M4P-01 完成前不寫「離線也能玩」。

> **哪些是我做、哪些是圖像工具做** 尺寸表、版型、色碼、從母版整數倍放大與裁切成各尺寸，是我這邊的工作（腳本就能做；照 mumi 的規則要在 Claude Code 跑）。需要重畫的只有「小尺寸頭像版」（M4P-03.1c），要用 mumi 的圖像工具或手繪，提示詞表另外交，不是成品。

## 現況（repo 0.5.4）

| 項目 | 現況 | 問題 |
| --- | --- | --- |
| manifest 圖示 | img/app-192.png、app-512.png，沒有 purpose | 沒有 maskable 版，Android 會把圖縮進白底圓圈或裁切 |
| 圖示畫面 | 512 版：近黑底 #070606＋暗紅圓 #3a140c（外框 41～472，直徑約 431，84%）＋主角像素圖（主角精靈 48×48，圖上看起來約 7 倍） | 圓超過 maskable 安全區（直徑 80%＝410）；小尺寸時全身像素圖會糊成一團 |
| iOS 圖示 | apple-touch-icon 只有 180 | iPad（152、167）沒有對應尺寸 |
| 分頁圖示 | &lt;link rel=icon href="data:,">（刻意留空） | 瀏覽器分頁、書籤、桌機安裝後的小圖都是空的 |
| 啟動畫面 | 沒有 apple-touch-startup-image | iOS 加到主畫面後開啟會先白底或黑底空白 |
| 顏色 | manifest background_color／theme_color #070606；index.html theme-color #0a0b0d；CSS --bg #0b0806 | 三個不同的黑，啟動→遊戲會跳一下色 |
| 顯示與方向 | display fullscreen、orientation any、apple-mobile-web-app-status-bar-style black-translucent | 方向 any → iOS 啟動畫面要直立與橫向兩套 |
| 名字 | name／short_name／apple-mobile-web-app-title 都是 dungeonPOE | 10 個字元，主畫面放得下 |

## M4P-03.1 圖示的畫法

| 編號 | 規則 |
| --- | --- |
| M4P-03.1a 母版 | 全身版母版＝現有主角 48×48 精靈的原始像素格。所有尺寸都用最近鄰、整數倍放大後置中到畫布，不用任何平滑縮放；放不到剛好的尺寸就留邊，不拉伸。 |
| M4P-03.1b 底色 | 一般版（any）：底 #0b0806（--bg）＋暗紅圓 #3a140c，圓直徑 80%（現在 84%，縮一點讓 Android 自動加底時不裁切）。可遮罩版（maskable）：整張滿版暗紅 #3a140c，不畫圓；主角放在中央直徑 80% 的安全圓裡。iOS 版：不透明、不自己切圓角（系統會切），底同 maskable。 |
| M4P-03.1c 小尺寸頭像版 | 64 px 以下（分頁 16、32、48）不用全身，改用「頭與肩」頭像版：從 48×48 精靈裁頭部約 20×20 格，再修成 16×16 的原生像素圖（白髮＋珊瑚粉瀏海是辨識點，必須留）。32 用 ×2、48 用 ×3。這張是唯一要重畫的。 |
| M4P-03.1d 倍率表 | 全身版主角高度取「不超過畫布 66%」的最大整數倍：512→×7（336）、192→×2（96）…以此類推；maskable 取「不超過 56%」：512→×5（240）、192→×2（96）。精靈周圍透明部分不算高度，用實際不透明外框算。 |
| M4P-03.1e 一致性 | 所有尺寸的主角色碼跟遊戲內精靈一模一樣（我會用腳本比對調色盤，不允許多出來的顏色）。 |

## M4P-03.2 圖示尺寸清單

| 檔名（建議） | 尺寸 | 平台／用在哪 | 版本 | 寫在哪裡 |
| --- | --- | --- | --- | --- |
| icon-192.png | 192×192 | Android、桌機 Chrome／Edge 安裝 | 一般（any） | manifest icons，purpose any |
| icon-512.png | 512×512 | Android 啟動畫面、安裝對話框、桌機 | 一般（any） | manifest icons，purpose any |
| icon-mask-192.png | 192×192 | Android 主畫面（各家形狀遮罩） | maskable | manifest icons，purpose maskable |
| icon-mask-512.png | 512×512 | 同上、高解析度裝置 | maskable | manifest icons，purpose maskable |
| apple-touch-icon-180.png | 180×180 | iPhone（@3x） | iOS | &lt;link rel=apple-touch-icon sizes=180x180> |
| apple-touch-icon-167.png | 167×167 | iPad Pro | iOS | sizes=167x167 |
| apple-touch-icon-152.png | 152×152 | iPad（@2x） | iOS | sizes=152x152 |
| apple-touch-icon-120.png | 120×120 | 舊 iPhone（@2x） | iOS | sizes=120x120 |
| favicon-16.png | 16×16 | 瀏覽器分頁 | 頭像版原生 | &lt;link rel=icon sizes=16x16> |
| favicon-32.png | 32×32 | 分頁（高解析度）、書籤 | 頭像版 ×2 | &lt;link rel=icon sizes=32x32> |
| favicon-48.png | 48×48 | Windows 桌機捷徑、工作列小圖 | 頭像版 ×3 | &lt;link rel=icon sizes=48x48>；也放進 manifest icons（any） |

不需要的：Windows 磁磚（msapplication）、Safari 釘選分頁 mask-icon、Steam 的任何圖。

## M4P-03.3 啟動畫面

| 平台 | 做法 |
| --- | --- |
| Android（Chrome） | 系統自己用 manifest 的 name、background_color、icon 組出來，不用另外做圖。需要：background_color 改 #0b0806、有 512 一般版圖示。 |
| 桌機（Chrome／Edge 安裝版） | 用 background_color 當開啟前的底色，不用做圖。 |
| iOS／iPadOS | 要自己做 apple-touch-startup-image：每種螢幕尺寸、每個方向各一張，用 media query 對應；iOS 不會縮放，尺寸不對就是空白。manifest 是 orientation any，所以直立與橫向都要。 |

```
啟動畫面版型（直立；橫向同一套，以短邊計算）
+---------------------------+
|        (狀態列安全區)       |
|                           |
|                           |
|          [主角]            |  48×48 精靈 × 整數倍，高約短邊 22%
|                           |
|        dungeonPOE         |  Noto Serif TC 900，字高約短邊 7%
|                           |
|                           |
|     (Home 條安全區)        |
+---------------------------+
底 #0b0806（--bg）；主角中心在高度 44%；字在主角下方，間距約短邊 4%
```

版型規則：主角用整數倍，取「高度不超過短邊 22%」的最大倍數；字「dungeonPOE」為圖片的一部分（不依賴網路字型），色 --milk #d9cdb4（對 #0b0806 很高）；狀態列是 black-translucent，內容不得放在上下 8% 內。橫向同一套，按短邊算。啟動畫面不放任何宣傳字、版本號。

| 直立圖尺寸（px） | CSS 尺寸 @倍率 | 裝置 |
| --- | --- | --- |
| 1320×2868 | 440×956 @3 | iPhone 16 Pro Max、17 Pro Max、18 Pro Max |
| 1260×2736 | 420×912 @3 | iPhone Air |
| 1206×2622 | 402×874 @3 | iPhone 16 Pro、17、17 Pro、18 Pro |
| 1290×2796 | 430×932 @3 | iPhone 14 Pro Max、15 Plus、15 Pro Max、16 Plus |
| 1179×2556 | 393×852 @3 | iPhone 14 Pro、15、15 Pro、16 |
| 1284×2778 | 428×926 @3 | iPhone 12 Pro Max、13 Pro Max、14 Plus |
| 1170×2532 | 390×844 @3 | iPhone 12、12 Pro、13、13 Pro、14、16e、17e（定稿框） |
| 1125×2436 | 375×812 @3 | iPhone X、XS、11 Pro、12 mini、13 mini |
| 1242×2688 | 414×896 @3 | iPhone XS Max、11 Pro Max |
| 828×1792 | 414×896 @2 | iPhone XR、11 |
| 1242×2208 | 414×736 @3 | iPhone 6s～8 Plus |
| 750×1334 | 375×667 @2 | iPhone SE（第 2、3 代）、6s～8（最小支援框） |
| 2048×2732 | 1024×1366 @2 | iPad Pro 12.9、iPad Air 13 |
| 1668×2388 | 834×1194 @2 | iPad Pro 11（M4 之前）、iPad Pro 10.5 |
| 1640×2360 | 820×1180 @2 | iPad Air 10.9／11、iPad 11 |
| 1668×2224 | 834×1112 @2 | iPad Air 10.5 |
| 1620×2160 | 810×1080 @2 | iPad 10.2 |
| 1536×2048 | 768×1024 @2 | iPad 9.7、iPad mini 7.9 |
| 1488×2266 | 744×1133 @2 | iPad mini 8.3 |
| 2064×2752（待核對） | 1032×1376 @2 | iPad Pro 13（M4 起） |
| 1668×2420（待核對） | 834×1210 @2 | iPad Pro 11（M4 起） |

共 21 種尺寸 × 直立／橫向 ＝ 42 張（橫向把寬高對調）。media query 一律寫直立的 device-width、device-height、-webkit-device-pixel-ratio，再加 orientation。來源：iPhone 17／Air 尺寸與裝置對照取自 vite-pwa assets-generator 的尺寸表與 screensize.io（2026-11 查）；標「待核對」的兩個 M4 iPad 是我記得的值，這次沒查到來源，輸出前要對 Apple HIG 再確認。iPhone SE 第 1 代（320 寬）低於支援下限 375，不做。

## M4P-03.4 manifest 與 head 要改的欄位

| 欄位 | 現在 | 改成 |
| --- | --- | --- |
| manifest background_color | #070606 | #0b0806（--bg） |
| manifest theme_color | #070606 | #0b0806 |
| index.html meta theme-color | #0a0b0d | #0b0806 |
| manifest icons | 192、512 兩張，無 purpose | M4P-03.2 的 any 192／512／48＋maskable 192／512 |
| apple-touch-icon | 只有 180 | 180、167、152、120 四個 link，帶 sizes |
| link rel=icon | data:, | favicon 16、32、48 |
| apple-touch-startup-image | 無 | 42 個 link（M4P-03.3） |
| manifest id | 無 | 建議加 "./"，讓之後改 start_url 不會變成另一個 App（開發確認） |
| display／orientation／name | fullscreen／any／dungeonPOE | 不改（已決定 2026-11-17：名稱維持 dungeonPOE、方向 any） |

檔案放 img/pwa/；檔名不加 hash（系統會快取圖示，改圖時靠 M4P-01 的版本更新流程）。

## M4P-03.5 安裝說明頁

| 編號 | 規格 |
| --- | --- |
| M4P-03.5a 入口 | 「更多」選單一列「安裝到主畫面」（桌機寫「安裝到電腦」），設定頁底部一個同名文字鈕。已經在安裝版裡（display-mode standalone 或 fullscreen，或 iOS navigator.standalone）時兩個入口都不顯示。已決定（遊戲製作人 2026-11-17）：不主動跳安裝提示，說明頁只從這兩個入口進。實作：收到 beforeinstallprompt 時 preventDefault 並先存起來，不讓瀏覽器自己跳安裝列；只有玩家在說明頁按「安裝 dungeonPOE」才叫 prompt()。不加紅點、吐司、第一次進入的引導或任何時間點的提醒。M3 真人數據出來後再評估要不要加。 |
| M4P-03.5b 內容依平台 | 自動判斷平台，只顯示那一套步驟；底下「我是用別的瀏覽器：切換 ⌄」可以手動切。 |
| M4P-03.5c iPhone／iPad Safari（iOS 26 起） | ① 點網址列右邊的「⋯」，再點「分享」（分頁排版是「上方」或「下方」時直接點「分享」）② 往下捲，點「加入主畫面」③「以 Web App 開啟」保持開著 ④ 點「加入」。展開說明：找不到「加入主畫面」→ 捲到最下面點「編輯動作」加進來；iOS 18 以前 →「分享」鈕在工具列上；iPad →「分享」→「顯示更多」→「加入主畫面」。步驟依 Apple 支援文件（iOS 26）；中文介面上的實際字樣（尤其開關名稱）實作時用真機截圖核對。 |
| M4P-03.5d Android Chrome | 可以直接安裝時（收到 beforeinstallprompt）：一個主鈕「安裝 dungeonPOE」48 高滿寬，按了叫出系統安裝對話框。不能時：① 點右上角「⋮」② 點「安裝應用程式」或「加到主畫面」③ 確認。選單字樣依 Chrome 版本不同，實作時截圖核對。 |
| M4P-03.5e 桌機 Chrome／Edge | 可以直接安裝時：主鈕「安裝 dungeonPOE」。不能時：「網址列右邊的安裝圖示 → 安裝」一句話。其他瀏覽器：「這個瀏覽器沒有安裝功能，直接在這裡玩也一樣；想裝成 App 請用 Chrome 或 Edge 開」（建議文案）。 |
| M4P-03.5f 好處一行 | 標題下 14 px milk2：「全螢幕、一點就開，存檔照舊」。M4P-01 上線後才加「、離線也能開」。存檔是否跨瀏覽器／安裝版共用要開發確認後才寫（iOS 17.2 起加到主畫面會複製 Safari 的 cookie，但 localStorage 沒有確認）；不確定就加一句「先登入帳號，安裝後再登入就能接著玩」。 |
| M4P-03.5g 390×844 版面 | 半版面板（跟「更多」同一套殼）。步驟一步一列、列高 56：左邊 32×32 的系統圖示示意（⋯、分享、＋、開關；程式畫的線框圖示，不貼系統截圖）、編號圓 24、字 14 milk。展開列 44。內容超過 443 高時單層捲動。375×667：同一套，內容 334 高，步驟列不縮。 |
| M4P-03.5h 1280×720 版面 | 右欄 476、top 76（跟其他面板一致）。桌機只有「安裝」主鈕或一句話，內容短。切換到手機步驟時右欄內捲動。滑鼠：懸停鈕 --act-hi；右鍵不做事。鍵盤：Esc 關閉、Tab 在鈕與展開列之間走、Enter 觸發。只用滑鼠全部做得到。 |
| M4P-03.5i 安裝完成 | 收到 appinstalled：面板改「裝好了，之後從主畫面（桌機：桌面或開始選單）的圖示開」一句＋「關閉」。iOS 沒有這個事件，不顯示完成狀態。 |

```
390×844 安裝說明（半版；iPhone Safari）
+----------- 把手 24 -------------+ 321
| 安裝到主畫面                  X  | 345
| 全螢幕、一點就開，存檔照舊       |  14 milk2
| (1) [⋯圖] 點網址列右邊的 ⋯，再點「分享」 |  每步 56 高
| (2) [＋圖] 往下捲，點「加入主畫面」 |
| (3) [開關] 「以 Web App 開啟」保持開著 |
| (4) [✓] 點「加入」                |
| 找不到「加入主畫面」？ ⌄          |  13 milk2 展開
| 我是用別的瀏覽器：切換 ⌄          |
+----------- #pnav 56 ------------+ 788
```

```
1280×720 安裝說明（右欄 476；Chrome／Edge 可以直接安裝時）
+-----------------------------------+
| 安裝到電腦                    X  |
| 獨立視窗、從桌面或開始選單開    |
| [   安裝 dungeonPOE   ]  48       |  beforeinstallprompt
| 或是：網址列右邊的安裝圖示 → 安裝 |
| 已經裝過？從桌面圖示開就好      |
+-----------------------------------+
```

## 驗收清單

- **1. 檔案齊全**：M4P-03.2 的 11 張圖示與 M4P-03.3 的 42 張啟動圖都在，尺寸逐張對；主角都是整數倍、沒有平滑過的邊。
- **2. maskable**：用 maskable 預覽工具套圓形與最小安全區：主角完整、不被切。
- **3. iOS 真機**：390×844 級 iPhone 加到主畫面：圖示清楚、啟動畫面不是空白、從啟動畫面到遊戲不跳色；橫向開一次。另拿一台 375×667（SE）。
- **4. Android 真機**：Chrome 安裝：主畫面圖示是 maskable 版、啟動底色 #0b0806。
- **5. 桌機 1280×720**：Chrome 與 Edge 安裝：安裝說明右欄版面、安裝後的視窗圖示與工作列小圖（48）清楚、分頁有 favicon。只用滑鼠完成安裝。
- **6. 安裝說明**：三個平台各看到自己那一套；已安裝時入口消失。390×844、375×667、1280×720 各一張截圖。

---

## 已決定

本頁原本列的兩項待決，都已由製作人定案，已回寫到對應條目：

- **1. 已決定（遊戲製作人 2026-11-17）：名稱維持 dungeonPOE、方向 any**：manifest 的 name／short_name／apple-mobile-web-app-title 與 orientation 都不改；iOS 啟動畫面照樣做直立與橫向兩套（M4P-03.3、M4P-03.4）。
- **2. 已決定（遊戲製作人 2026-11-17）：不主動跳安裝提示**：說明頁只在「更多」與設定裡；beforeinstallprompt 先攔下、只在玩家按鈕時叫出（M4P-03.5a）。等 M3 真人數據出來再評估要不要加主動提示；到時要加，也要寫進 M2-26 的事件清單。

## 來源（Page sources）

- <https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/a647bf26-aa82-4684-8c89-311e76640026>
- <https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/91bce2cc-463c-400c-adf4-8ed14ac0ba8c>
- <https://github.com/Shiroyashatw/dpoe>
- <https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/26/ios/26>
- <https://github.com/vite-pwa/assets-generator/blob/main/src/splash.ts>
