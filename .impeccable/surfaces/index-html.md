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
THESIS: 鑄鐵銀框配朱紅：有重量的 ARPG 介面，但不靠金色；拒絕古銅金與深灰細線兩個已被否定的版本。
OWN-WORLD: 鐵灰不透明面板、鑄鐵銀框九宮格、朱紅標題帶與主按鈕、白色粗襯線標題、選中整塊銀底；黃色只代表稀有度。
STORY: 玩家一眼認得這款遊戲，稀有裝備有份量，操作跟 PoE 一樣。
FIRST VIEWPORT: 戰鬥畫面不動。底部銀環生命魔力球與銀框技能托盤；右側背包是 PoE 式人形裝備欄＋格子背包。
FORM: 使用者融合黑漆螺鈿（只取朱紅標題帶）與鑄鐵銀框，並指定灰底、不要貝殼碎片；seed:46f2258b0821bd86
FINISH: 四個尺寸截圖驗收、手機操作測試、DESIGN.md 已更新

## Signature move
說明框與掉落標籤的 PoE 式稀有度標題列（金／藍／白／青），從地上標籤到說明框一致。

## Constraints
只用 CSS＋現有像素圖，不加新圖；不用 backdrop-filter；HUD 文字用 setT 更新；不擋戰鬥畫面。
