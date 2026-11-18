# M2-39 佇列 40 挑圖（PR #96 draft，HEAD ad30268，只挑不合併）

看圖：35 張 32、32 張 16 全部 4 倍彩＋灰階＋1 倍（`picks_4x.png`、`v32_*.png`、`v16_*.png`）。代號：**K** 照用、**F** 照用但建議手修、**H** 不手修不能用、**R** 退。

## 1. 逐枚（32／16）

| id | 32 | 16 | 理由／手修（像素層級，不生成） |
| --- | --- | --- | --- |
| scorch | K | K | 灰階跟 ad 都是「圓盤＋中央水滴」；可選：盤面加 2 條 `--scene-void` 裂線 |
| brittle | 不過 | — | 見 §2 |
| sap | H | H | 完整 Z 字閃電＝規格禁止，跟優先 shock 撞形。手修：下 1/3 擦掉，尾段改 `--tx-dim`，下方加 2 顆斷開的 1 px 火花 |
| broken | F | F | 64% 是 `--scene-void`，暗底上看不見；中縫沒開。手修：正中開 1 px（16）／2 px（32）透明縫，右半改 `--border` |
| parried | K | K | |
| intim | H | H | 100% `--scene-void` 的黑箭頭，暗底消失。手修：內部填 `--bad`，右側 1 px `--hp` 陰影，描邊保留；16 頂端紅十字刪掉（像補血） |
| counter | R | 不過 | 畫成盾＋星，規格寫 not a shield；跟 sac／shatter 撞形 |
| seal | F | K | 32 bbox 0–32 沒留 1 px 透明邊。手修：外框往內縮 1 px |
| revive | K | K | 灰階像火，但底環能分 |
| mark | K | K | |
| fury | F | K | 32 無 `--scene-void` 描邊（0%）、只佔 13×19。手修：補 1 px 外描邊 |
| ad／ad_cold／ad_light | K | F | 16 中央元素點只剩 1–2 px，三色分不出。手修：中央改 3×4 實心元素 token 點、外環統一 `--border-mid` |
| tail | R | 不過 | 綠色彗星＝fury 同一個剪影，又是 flame 樣（規格 not a flame） |
| crush | K | K | 細節偏糊；可選：方塊改一塊平塗 `--border-mid` |
| shatter | F | F | 看不到「打穿的洞」。手修：盾中偏右挖 4×4（16 是 2×2）透明洞＋`--scene-void` 洞緣 |
| riven | 不過 | — | 見 §2 |
| unbr | H | H | 跟 broken 幾乎同形（直立半黑盾），灰階分不開。手修：整張轉 90°（盾平放＝放低），重上光讓光仍從左上 |
| daze | R | R | 畫成靶心／時鐘，跟 easy、calm、seal 撞形；規格是兩個歪菱形螺旋 |
| crip | H | H | 84% 黑，16 看起來像字母 K。手修：靴身改 `--border-mid`、斜線 2 px `--bad` 貫穿 |
| stain | F | F | 32 幾乎無描邊（2%）、外圍散點；16 中間兩顆暗點像眼睛。手修：補描邊、刪散點與「眼睛」 |
| inc | R | R | 方框裡一排尖牙，讀成嘴／陷阱，又跟 seal／mark 同是方塊 |
| cb | 不過 | — | 見 §2 |
| anemia | 不過 | — | 見 §2 |
| petr | F | K | 32 無描邊（1%），跟 chg_p、oiled 都是直立橢圓。手修：補描邊、加 1 條橫裂、底部切平 |
| calm | H | H | 95% 黑，1 倍是黑點；虛線環不是 closed circle。手修：盤面填 `--mp`，外環改連續 2 px `--el-cold`，中央 1 條橫 `--tx-strong`（歸零） |
| weak | 不過 | — | 見 §2 |
| taunt | 不過 | — | 見 §2 |
| easy | K | K | |
| over | K | K | |
| vine | 不過 | — | 見 §2 |
| oiled | F | K | 灰階跟優先 wet／bleed 同是水滴。手修：左上加 2 px `--tx-strong` 油光、下方加斷開的 1 滴 |
| chg_e | F | K | 少了盾點。手修：中央 5×6 `--border-cap` 小盾 |
| chg_f | K | K | |
| chg_p | F | K | 是蛋形水晶不是「帶環的球」，又只有 16×18。手修：頂端削圓、外加 1 px `--scene-void` 環、中央 4 角星 `--tx-strong` |
| sac | H | H | 盾徽＋閃電，規格是衝刺 V 形＋速度線；盾太多。手修：去掉盾底，只留白色 V 形，左側加 2–3 條 `--good` 速度線 |
| cu_enfeeble | K | K | 暫用，見 §3 詛咒家族 |
| cu_eleweak | R | R | 寶石切面，讀成掉落寶石 |
| cu_tchains | K | R | 16 只剩小四角星，跟優先 stun 撞 |
| cu_vuln | R | R | 寶石切面 |
| cu_despair | R | 不過 | 只畫了半個菱形加幾條線 |

## 2. 不過的 10 個：做法與次數

**次數：** 上限 100，已花 77，剩 **23**（工程留言寫「剩 16」，實際是「23 裡 16 留給優先 32」）。優先 16 獨立 32 要 **16**，所以能挪的是 **7**。原計畫 4 次備用已用完；這 7 次沒超過 100，但屬於計畫外重跑，要製作人點頭（不用再批上限）。

| id | 做法 | 次數 |
| --- | --- | --- |
| riven（32） | 重生成 32；16 用最近鄰縮小＋手修（同赤霄做法） | 1 |
| vine（32） | 重生成 32；16 縮小＋手修 | 1 |
| cb（32） | 重生成 32；16 縮小＋手修 | 1 |
| counter（32＋16） | 重生成 32；16 縮小＋手修 | 1 |
| brittle（32） | 手繪：拿優先 frozen 16 的冰塊，斜切成尖片、2 條 `--tx-strong` 裂線；32 先用 16 的 2 倍 | 0 |
| anemia（32） | 手繪：oiled 的水滴外形，內部挖空成透明，1 px `--hp` 外環＋1 px `--tx-dim` 內環（空心＝跟 oiled 分開） | 0 |
| weak（32） | 手繪：一條橫棒右端往下折垂，`--tx-dim` 棒身、`--bad` 末端；不畫箭頭（避免跟 intim 撞） | 0 |
| taunt（32） | 手繪：一個彎鉤箭頭指向中央 1 顆 `--bad` 點，`--warn` 鉤身；生成三次都畫成角色，不再花次數 | 0 |
| tail（16，32 也退） | 手繪：三條往右的短風勾，`--tx-strong` 身、`--good` 勾尖 | 0 |
| cu_despair（16，32 也退） | 照 §3 詛咒家族手繪 | 0 |
| 備用 | riven 前兩次都畫成角色，最可能要重跑 | ≤ 3 |
| **合計** | | **4＋≤3＝≤7** |

改寫的提示詞（32 pixflux，套 §2.1 共用 body，seed 接 3941 起）：

- riven：`two curved metal armor plates split apart to the left and right with a bright gap between them, loose empty pieces only, no statue, no robot, no person, no head`
- vine：`one thick green vine stem curling into a single spiral hook with two small leaves, one continuous line 2 pixels wide, no scattered dots, not a poison diamond, not a shield`
- cb：`a thick dark red blood droplet melting into one curling purple tendril at the bottom, a single solid shape, not a thin ring, not a clean droplet, not a poison diamond`
- counter：`a single short sword whose blade curves back into a hook toward the hilt, riposte, small green accent on the hilt, not a shield, not a badge, not crossed swords`

我自己的退件（daze、inc 兩尺寸；cu_eleweak、cu_vuln）也不花次數：daze 手繪兩個歪菱形螺旋（`--warn`）；inc 手繪三條平行斜砍痕（`--tx-strong` 加 `--bad` 邊），不要方框。

## 3. 整組的問題

1. **暗底看不見：** `--scene-void` 佔比 intim 100%、calm 95%、crip 84%、cu_despair 79%、cu_eleweak 74%、broken 64%、daze 62%、unbr 55%。怪物頭上沒有框，這些會消失。上面手修都是把主體換成角色 token。
2. **描邊不一致：** fury 0%、petr 1%、stain 2%、shatter 3% 沒有 1 px `--scene-void` 外框；seal 32 沒留透明邊。
3. **剪影撞形：** 盾（broken／unbr／shatter／counter／sac）、圓盤（ad／scorch／calm／daze／easy／chg_e）、直立橢圓（petr／chg_p／oiled，加上優先 wet／bleed）、方塊（seal／mark／inc）、彗星（fury／tail）。照上表處理後，盾剩 broken、shatter（縫跟洞能分），方塊剩 seal、mark。
4. **詛咒五種不像同一家：** 鑰匙孔菱形、五角寶石、多面菱形、寬寶石、半個三角。建議等 mumi 挑定優先 curse 16，拿它的菱形把中央十字換成小符號，手繪五枚（0 次）：衰弱＝垂下的橫棒、元素要害＝火／冰／雷三色各 1 px、時空鎖鏈＝兩節鏈、脆弱＝斜裂的板、絕望＝往下彎的小鉤。32 先用 2 倍，等優先 curse 32 生成後再照同法加符號。在那之前 cu_enfeeble、cu_tchains（32）暫用。
5. **尺寸偏小：** fury 32 只有 13×19、chg_p 32 只有 16×18，16 版只有 7×9／8×9。不重生成的話先接受，標給 UIUX設計師。
6. **跟優先 16 撞：** sap 跟 shock（要手修）；fury、revive 的灰階像火，跟 ign 靠角度和底環區分，接受。
7. **ad 三色灰階完全一樣：** 是同一個狀態換元素，接受；靠顏色和說明分。

## 4. 數字

- 32：照用 22（K 13、F 9）＋手修後可用 6（H）＝28；退 7（counter、tail、daze、inc、cu_eleweak、cu_vuln、cu_despair）。
- 16：照用 21（K 15、F 6）＋手修後可用 6（H）＝27；退 5（daze、inc、cu_eleweak、cu_tchains、cu_vuln）。
- 檔名清單：`picked.txt`（第一欄 K／F／H）。
