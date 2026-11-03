---
name: pixel-art
description: 新增或替換塞令老師的怪物、首領、老師頭像、道具圖示等像素圖時使用。先產出給 PixelLab 用的英文提示詞與設定讓使用者去生圖，使用者丟回 PNG 後，照這裡的步驟放進 art/、跑 tools/art.py、接到怪物資料並截圖確認。使用者說「我放了新圖」「新圖放好了」「圖換好了」「art 有更新」等（自己把 PNG 放進 art/）時也用這個：找出新增／變更的圖、跑 tools/art.py、接到資料。
---

> **dungeonPOE 版（2026-11-02）**：這份是《塞令老師》帶過來的。dungeonPOE 沒有頭像、塔羅牌，也沒有 `tools/icon_sheets.py`、`tools/pixellab_batch.py`、`tools/art.py`；舊的道具圖示提示詞在 `docs/封存/圖示提示詞.md`（《塞令老師》版）。dungeonPOE 的怪物看 `docs/怪物提示詞.md`、主角看 `docs/主角提示詞.md`、已產的圖示提示詞在 `docs/提示詞封存.md`；新圖要接進 `js/art.js` 前，先確認打包工具。

# 像素圖（PixelLab）提示詞與接入流程

使用者要新增或替換怪物、首領、裝備圖示時，**先給提示詞，不要自己畫**。使用者到 PixelLab 生圖後會把 PNG 丟回來，再照「接入遊戲」的步驟處理。

## 1. 產出提示詞

**道具圖示改用圖表一次產 64 個**（檔名 `it_道具代號`，遊戲會優先用它，沒有才借舊圖示）：在 `docs/封存/圖示提示詞.md`（《塞令老師》版） 補單張的列 → `python3 tools/icon_sheets.py build` → 把 `docs/圖示圖表.md` 裡那張圖表的提示詞給使用者（或有金鑰時 `run`）→ 使用者把圖表 PNG 放進 `art/sheets/`（檔名就是圖表名，例如 `sheet_item_1.png`）→ `python3 tools/icon_sheets.py process` 全部切到 `art/icons/` 並打包。每張要填滿 64 格，不夠的會自動拿「介面圖示」（狀態、通貨、怪物招式、材料）補空格。先產 `sheet_skill_1` 當風格基準，其他張拿它當 Style／Init Image。

**先讀 `docs/怪物提示詞.md`**：共用設定、固定句型、世界觀方向，以及已採用的提示詞。新提示詞要沿用同系列的句型與用字（例如七宗罪的王對照路西法那份），畫風才會一致。裝備、技能圖示看 `docs/封存/圖示提示詞.md`（《塞令老師》版）。量大時可以請使用者在自己電腦跑 `tools/pixellab_batch.py`（PixelLab API，金鑰放環境變數 `PIXELLAB_API_KEY`，產圖到 `art/new/` 再挑）。

先確認要做什麼（怪物名稱、外觀方向、用在哪裡：一般怪、亡靈、魔霧、冥府、首領、裝備）。使用者沒講外觀就依遊戲世界觀補：台灣在地元素（廟宇、民俗、山林動物、都市傳說）＋奇幻 RPG。

輸出給使用者的格式（繁體中文說明＋英文提示詞放在 code block，方便複製）：

1. **PixelLab 設定**（Create image → 模型 Pixen）：

   | 項目 | 一般怪物 | 首領 | 裝備圖示 |
   | --- | --- | --- | --- |
   | Width／尺寸 | 64 | 64 | 32 |
   | Transparent background | 勾選 | 勾選 | 勾選 |
   | Direction | West (facing left) | West (facing left) | None |
   | View | Side (Sidescroller) | Side (Sidescroller) | None |
   | Detail | Medium | Highly detailed | Low／Medium |
   | Outline | Black outline | Black outline | Black outline |

2. **Description**（英文，一隻一段）：

   - 一般怪物／首領，開頭一定要有全身與留白（不然常只生半身）：
     ```
     full body, standing, whole figure from head to feet, legs and feet visible, small character centered with empty space around,
     {外觀描述：種類、顏色、服裝、特徵、姿勢}, {氣氛：menacing / fierce expression / glowing eyes 等}
     ```
   - 四足動物把 `standing ... legs and feet visible` 換成 `full body side view, all four legs visible`。
   - 首領加 `imposing pose, large and powerful, detailed armor/ornaments`。
   - 有翅膀、長武器、尾巴等很寬的造型容易被畫布切邊，開頭再加：
     `the entire character including wings and weapon fits completely inside the canvas with wide empty margins on all sides, nothing cut off at the edges, character occupies about 75 percent of the canvas`；
     翅膀寫 `half-spread close to the body`、長武器寫 `held upright`，結尾補 `facing left`。
   - 裝備圖示（一律畫灰色金屬，材質階級的換色由程式處理）：
     ```
     single {裝備名稱} item icon, made of plain grey iron with brown wood or leather parts, simple readable shape, centered, diagonal from bottom-left to top-right
     ```
     頭盔、胸甲、手套、鞋子把最後一句換成 `front view`。

3. 提醒：不滿意就多按幾次 Generate 挑一張；同一系列先挑一張滿意的當 Init Image（風格參考），整套才會一致。下載 PNG 直接丟回來即可（不用改檔名）。

## 2. 接入遊戲（使用者丟回 PNG 後）

> 使用者說「我放了新圖」這類話（自己把 PNG 放進 `art/`）時，先做這段，再接下面第 1 步：
> - 用 `git status --short art/` 找出新增（`??`）和變更（`M`）的 PNG，列給使用者確認。`art/new/` 是批次產圖的暫存區（不進 git），除非使用者指定，否則不用處理。`art/sheets/` 有新的或變更的圖表時跑 `python3 tools/icon_sheets.py process`。process 最後會自動 archive：有圖的提示詞搬到 `docs/提示詞封存.md`；切過的圖表整張從 `docs/圖示圖表.md` 移除、原圖搬到 `art/sheets/done/`，裡面沒畫出來的格子會重新排進新的圖表；圖表編號固定（使用者手上正在產的圖表不會對不上）。
> - 只是換圖（檔名不變）：檢查（第 1 步）→ 跑 `tools/art.py`（第 3 步）→ 截圖確認（第 6 步）就好，資料不用改。
> - 新檔名：從檔名猜要接到哪隻怪物（野怪與首領在 `js/run.js` 的 `MOBS`、老師頭像在 `js/data.js` 的 `AVATARS`）；猜不到或可能接錯的，先問使用者，不要亂接。
> - 跑完 `tools/art.py` 後，回報每張圖的尺寸、接到哪裡，以及哪些新圖還沒接到資料。

1. 檢查：`python3 -c "from PIL import Image; im=Image.open('檔案').convert('RGBA'); print(im.size, im.getbbox(), len(set(im.getdata())))"`
   - 要是真像素（尺寸就是 Width 設定，例如 64×64），背景透明；如果是放大過的大圖（例如 1024 以上），先量格子大小再用最近鄰縮回原生大小。
   - 必須面向左；面向右的話請使用者重生（程式沒有左右翻轉）。
2. 放到 `art/monsters/英文小寫檔名.png`（例如 `jiangshi.png`）。
3. 跑 `python3 tools/art.py`：裁掉透明邊、拼成 `img/` 的調色盤大圖（無損）、座標寫進 `js/art.js`，圖名是 `a_檔名`。只有新圖所在的那張大圖會換檔名；`img/` 的大圖和 `js/art.js` 都要一起 commit。
   - **跑完先看 `git status img`**：理論上只有新圖那張大圖換檔名。如果幾乎全部大圖都換了（0.1.68 遇過：這台電腦的 PNG 壓縮跟上次不同，內容一樣但 hash 全變），玩家會重新下載所有圖。把**像素完全一樣**的大圖還原成舊檔、`js/art.js` 的網址改回舊的，只留真的有變的那張（比對：`Image.open(...).convert('RGBA').tobytes()` 相等就還原）。
4. 野怪、菁英、首領：把 `js/run.js` 的 `MOBS` 裡那隻的 `spr` 改成 `'a_檔名'`；老師頭像：加進 `js/data.js` 的 `AVATARS`（`['檔名', '某某老師']`）。
5. 大小：PNG 圖畫到 canvas（`js/ui.js` 的 `paintSprites`／`artSprite`）。一般怪 64 畫布、人物約 58 高時，跟原本 16×16 的怪差不多大、稍大一點；首領也用 64（試過 128，造型反而沒特色，不用）。首領單獨一隻時戰鬥中站在右半邊、垂直置中（`epos`）。
   - 檢查四邊有沒有不透明像素貼邊（被切掉）：有的話請使用者用「留白」提示詞重生。
6. 用 Playwright 開戰鬥截圖確認（`startBattle(makeEnemy(...))`），也看受擊白閃、倒下動畫、行動順序的小頭像。
7. 把這隻採用的提示詞（含設定、檔名、系列）補進 `docs/怪物提示詞.md` 的「已採用」。
8. 改完照 CLAUDE.md：prettier、`python3 tools/codemap.py`、版本與 CHANGELOG。

## 注意

- 檔案大小：拼成調色盤大圖後一張圖平均不到 2KB，遊戲用到才載那張大圖；不要放放大過的原圖。
- 原始 PNG 留在 `art/`，之後改圖重跑 `tools/art.py` 就好；`img/` 和 `js/art.js` 是自動產生的，不要手改。
- 主角目前還是 16×16（裝備外觀疊圖在 `js/gear.js`），不要用 PixelLab 的圖替換主角。

## 玩家頭像（4×4 圖表，全身）

提示詞在 `docs/封存/頭像圖表.md`（照 `docs/圖示圖表.md` 的格式：圖表提示詞、格序對照表、單張補產提示詞）。使用者說「頭像圖表放好了」：讀 `art/sheets/sheet_avatar_1.png`（256×256），照對照表的格序切成 16 張 64×64（透明背景，切完去掉空白邊）存成 `art/monsters/av_*.png`，跑 `python3 tools/art.py`，把 `['檔名', '名稱']` 加進 `js/data.js` 的 `AVATARS`，在設定的頭像選單、首頁、準備畫面、戰鬥畫面截圖確認；做完把提示詞搬到 `docs/提示詞封存.md`、原圖搬到 `art/sheets/done/`。

## 塔羅牌卡圖（64×64）

提示詞在 `docs/塔羅牌圖表.md`（`sheet_tarot_1` 4×4、`sheet_tarot_2` 3×2）。使用者說「塔羅牌圖表放好了」：`python3 tools/tarot_cut.py`（照格序切成 `art/icons/tarot_牌.png`、跑 `art.py`、原圖搬到 `art/sheets/done/`），在塔羅牌陣的四選一截圖確認（逆位由程式倒過來）。
