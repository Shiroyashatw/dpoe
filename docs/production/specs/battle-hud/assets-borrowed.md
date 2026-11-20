# battle-hud v1.3.1 借用素材清單（final，2026-11-20 mumi 16:32；v1.3 勘誤 mumi 17:18）

> 上色示意圖（[`../wireframes/W1-battle-hud/color/`](../wireframes/W1-battle-hud/color/)）沒有用生圖，也沒有「佔位」框；下面這些元件是**借現有素材或用程式畫**暫代。正式素材由美術總監排；規格欄是 UIUX 對正式素材的需求。
> 共同規則：像素圖只做**整數倍**縮放（1x／2x，`@2x` 給 DPR 2）；外框、底色、染色都由程式用 token 畫，素材本身不畫外框；色票只用 D2 定案（`palette-D2-final-ui.md` v1.6、`palette-D2-panel-1plus.md` v1.1、`M2-36-palette-tokens.md`）。

| # | 元件（id） | 現在借用什麼 | 需要的正式素材規格 | 急不急 |
|---|---|---|---|---|
| 1 | **光環小方塊**：390 P25／T12 格 12×12；1280 D47／C47 格 14×14（間距 2、1 px 銅框 `--panel-edge`、底 `--panel-inset`） | 光環技能圖 32×32（清單照 main `js/data.js` tags 含 `aura` 的技能，不照 art.js；2026-11-20 17:06 更正）縮 1/4 成 8×8，放在格子正中；8 px 時大多只剩色塊，分不出是哪個光環 | 每個光環 2 個原生尺寸：**10×10**（390，填滿 12 格框內）與 **12×12**（1280，填滿 14 格框內），各附 `@2x`（20／24）。1x 直接用、不縮放。透明底、不畫框；剪影要在 10 px 下可辨認（一個主形＋光環元素色）。顏色只用 token：火系 `--el-fire`、冰 `--el-cold`、電 `--el-light`、物理／無 `--tx-strong`，暗部 `--scene-void`。第一批 6 個（data.js tags `aura`＋`buff`）：`sk_anger` 火、`sk_precise` 物理、`sk_hasteaura` 物理、`sk_determination` 物理、`sk_purityaura` 物理（不分三色）、`sk_clarity` 冰；第二批：其餘 tags 含 `aura` 的 12 個（`sk_command`、`sk_guardtotem`、`sk_scorch`、`sk_iceshield`、`sk_tesla`、`sk_blight`、`sk_decay`、`sk_souldrain`、`sk_summongod`、`sk_inferno`、`sk_iceshatter`、`sk_staticfield`），同規格、不擋 v1.3。`sk_hatred`、`sk_wrathaura`、`sk_grace`、`sk_discipline`、`sk_zealotry` 遊戲裡沒有，不做。 | 高（光環列是 v1.3 主要新元件） |
| 2 | **分頁圖示**：390 P58–P64／T36–T42，圖示 16×16 在 56×54 分頁裡（1280 分頁只有字＋鍵帽，不用圖示） | 7 張現有道具／通貨圖 32×32 縮 1/2 後染色：戰利品＝`gear_amulet_0`、角色＝`gear_helm_0`、鍛造＝`gear_weapon_0`、技能＝`cur_exalt`、天賦＝`cur_soul`、營地＝`ic_gear-7` 一格、更多＝`cur_chaos`（意思不對，只當形狀） | 7 張**單色遮罩 16×16**（＋`@2x` 32×32），透明底，1 px 線條為主、不畫陰影；程式染色：選中 `--tx-strong`、未選 `--tx-dim`。內容：戰利品（箱）、角色（人像）、鍛造（鐵鎚＋砧）、技能（技能石）、天賦（星盤）、營地（屋頂）、更多（三點）。 | 高 |
| 3 | **藥劑技能格圖示**：技能格 4（390 P23／T24、1280 D45／C45，格 44／48） | `sk_gasflask` s7311（`art/m2-40-icons` 分支）。審查結果**不過**、待手修；目前沒有其他藥劑技能圖 | 手修後的 `sk_gasflask` **32×32**（1x 原生，放在 44／48 格正中；不縮放），照 `M2-40-skill-icon-picks.md` 的技能圖規則（透明底、不畫框、主色走元素 token、暗部 `--scene-void`）。修好後替換同 key，不改格子。 | 中（擋上色定稿外觀，不擋版面） |
| 4 | **王 sprite**：boss 狀態 W04 王＋判決圈（390 PW04、1280 DW04） | `boss_shang` s6921（`art/m2-36-d2-b3` 分支，**暫挑**），64×64 畫 2 倍（128） | 待 mumi／美術總監從 B3 批定案「上尸」的正式圖：**64×64** 原生、畫面 2 倍；面向左或右一張即可（程式翻轉）；腳底要留在下緣（判決圈從腳底量），外框 1 px `--enemy-rim` 由程式加。定案後換同 key。 | 中 |
| 5 | **菁英標記**：菁英名牌 W03 左側圖示 16（`--tx-strong`） | 程式畫的 16×16 角盔剪影（照 D2 mock 的畫法），不是素材 | **不一定要正式素材**：形狀簡單、單色，程式畫在 1x／2x 都清楚，建議保留程式版。若美術要統一風格，給一張 **16×16 單色遮罩**（＋`@2x` 32），程式染 `--tx-strong`。 | 低 |
| 6 | **藥劑球**：390 P39／P40（看得到 20）、1280 D61／D62（看得到 22）；只畫冷卻環 2 px `--hp-hi`／`--mp-hi`＋1 px #000 | PixelLab 挑選 `flask_hp` s5312、`flask_mp` s5316（24×24）縮 1/2 成 12×12，放在 `--panel-raised` 圓底正中 | **建議要**：縮 1/2 會掉細節。各 2 張原生：**12×12**（390 圓 20）與 **14×14**（1280 圓 22），＋`@2x`；生命瓶主色 `--hp`、魔力瓶 `--mp`、亮點 `--hp-hi`／`--mp-hi`；透明底、不畫圓框（圓框與冷卻環由程式畫）。若決定不放圖、只留純色圓＋環，也可以，請在規格註明。 | 中 |

## 其他用到的現有素材（不用換）
- 狀態圖示 16×16：PixelLab `ail_*`（M2-36-d2-b3／rerun，含 `ail_cons`、`ail_pin`）。王印 16：`wangyin_chixiao_16` s5404。通貨 16：`cur_gold` s5401、`cur_soul` s5306、`cur_chaos` s5330、`cur_exalt` s5329。
- 技能格 1／2／3／5：art.js `sk_apshot`、`sk_combust`、`sk_groundslam`、`sk_fireburst`（32×32）。
- 戰場：D2 地磚 `tile_d2_battle_floor`（2 倍）、牆頂／牆面、`prop_lantern`／`prop_joss`／`prop_ash`；怪物 art.js `m_*`；主角 `img/hero.png`；彈 `art/fx/fireball`、`frostbolt`、`void`；光柱 `sig_beam`、`sig_chase`。
- 程式畫（系統或規格本來就由程式畫）：390 狀態列與 home 條、小地圖、低血紅邊、預警圈、光柱外緣、按鈕與面板。
- 每張素材的來源 branch:path 見 `../wireframes/W1-battle-hud/color/assets/pick/SOURCES.txt` 與 `assets/repo/SOURCE.txt`。
