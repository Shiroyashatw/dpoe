# M2-39 佇列 40 挑圖（PR #96 draft，HEAD 7df2a49，只挑不合併）

看圖：第 2 輪 17 枚新圖／手修圖，32 與 16 都看了 4 倍與 1 倍、彩色與灰階，並跟整組（`r2/all32.png`、`r2/all16.png`）並排比對。代號：**K** 照用、**F** 先照用但要手修、**H** 不手修不能用、**R** 退。花費 83／100，剩 17；16 次留給優先 32，備用 1。下面的修改全是手修，不花次數。

## 1. 第 2 輪（17 枚）

| id | 32 | 16 | 判定與手修 |
| --- | --- | --- | --- |
| riven s3941 | F | K | 32：整體是圓的，又有內肋，1 倍看起來像核桃，跟 ad、scorch 同屬圓盤。修：中縫改 4 px 透明，兩片甲各壓成 2 階平塗，拿掉內肋。16 兩片括號形可用 |
| vine s3942 | F | K | 32：`--scene-void` 描邊 0%。修：補 1 px 外描邊 |
| cb s3943 | F | K | 32：描邊 0%，捲鬚 1 px 又斷，灰階就剩一顆水滴。修：補描邊，捲鬚改 2 px 連續 `--el-chaos` |
| anemia | K | K | 空心水滴，跟 oiled、cb 分得開 |
| brittle | F | F | 平的白頂加下尖，1 倍讀成甜筒。修：白頂改成 2–3 個鋸齒尖，加 1 條斜的 `--scene-void` 裂線；32 上緣 y0=0，下移 1 px 留邊 |
| calm | K | K | 可用。外觀像「減號／禁止」按鈕，請 UIUX設計師確認不會跟收起鈕混 |
| counter（32 用手加回鉤版） | F | F | 32：回鉤太短，1 倍就是一把直劍；上緣 y0=0。修：回鉤延長 3 px，沿刃右側往柄彎，用 `--tx-strong` 加描邊，整張下移 1 px。16：讀成往右上的箭（綠色像箭羽）。修：柄端加 3 px 寬的護手 |
| crip | K | K | 靴子加 `--bad` 斜線，清楚 |
| daze | F | F | 兩個方框互扣，像鏈環或「2」，跟之後詛咒的鏈結符號會撞；32 bbox 貼邊。修：外框左下邊、內框右上邊各斷 2 px，讓兩圈接成一條螺旋；32 內縮 1 px 留邊 |
| inc | K | K | 三道斜砍，很好 |
| intim | K | K | `--bad` 下箭頭，清楚 |
| sac ★標記 | F | K | 判定：可用。有速度線，讀成「往前衝」，不像「下一頁」的 >。修：32 x0=0 貼邊，右移 1 px |
| sap ★標記 | F | F | 判定：16 的 1×2 火花在 1 倍是雜點。修：16 只留一顆 2×2 `--el-light` 火花加描邊，放在尖端下方 1 px，其餘單點刪掉；32 的兩顆單點火花各改成 2×2 |
| tail | F | F | 三條橫棒，1 倍就是「≡」選單鈕。修：每條右端往上捲 2 px（風捲）、左端收成 1 px，三條起點各錯開 3 px；32 留 1 px 邊 |
| taunt | F | F | 跟 daze 都是 `--warn` 的方塊感造型，1 倍兩顆黃塊分不開。修：鉤身改 `--bad`、中心點改 `--warn` |
| unbr ★標記 | R | R | 判定：轉 90° 這版不採用。它讀成吊牌／鉛筆，又跟 sac、tail 一樣朝右。改法：用原來直立盾，每 4 列右移 1 px（16 每 3 列），做出約 15° 前傾；整張貼底，上方留空，讀成「放低」；右半填 `--border`，不要 `--scene-void`，免得又像 broken |
| weak | F | F | 硬直角讀成角括號「¬」。修：直角改成 2 階斜折往下垂，末端收細，`--bad` 尖端保留 |

調色盤：17 枚都只用 token（`--dmg-gain`、`--ready` 跟 `--good`、`--border-cap` 同值，可以接受）。

## 2. 第 1 輪的手修還沒做（照第 1 輪清單）

32 有 broken、seal、fury、shatter、stain、petr、oiled、chg_e、chg_p，16 有 ad、ad_cold、ad_light、broken、shatter、stain。這輪的圖跟第 1 輪一樣沒動，例如 broken 仍然 64% 是 `--scene-void`，stain 16 那兩顆「眼睛」也還在。做法見 `r1_picks.md` §1。

## 3. 詛咒

cu_eleweak、cu_vuln、cu_despair（32），以及 cu_eleweak、cu_tchains、cu_vuln、cu_despair（16），都等 mumi 挑完菱形後一起手繪。cu_enfeeble 32／16、cu_tchains 32 先暫用。

## 4. 整組

- 這輪解掉了：暗底看不見（intim、calm、crip）、sap 跟 shock 撞、盾太多（剩 broken、shatter）、方塊三枚（inc 已改成斜砍）、fury／tail 同形。
- 新出現的撞形：tail 像選單鈕、calm 像減號鈕（屬 UI 控制項，UIUX設計師要知道）；daze 跟 taunt 同色同重量（上面已修）；朝右的造型有 sac、tail（unbr 改了就只剩這兩枚）。
- 留邊：daze、tail、sac、counter、brittle 的 32 貼邊，違反 1 px 透明邊。

## 5. 數字

| | K | F（暫用、要修） | H | R／等詛咒 | 合計 |
| --- | --- | --- | --- | --- | --- |
| 32 | 18 | 20 | 0 | 1＋3 | 42 |
| 16 | 24 | 13 | 0 | 1＋4 | 42 |

- 32 能用 38（不修就能用的 18），16 能用 37（不修就能用的 24）。
- 42 是 40 id 加 ad_cold、ad_light；16 的 cu_despair 從沒有圖。
- 檔名清單：`picked.txt`（第一欄 K／F；R 不列）。

## 附錄：第 1 輪逐枚指示（§2 未做的手修照這裡）

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

