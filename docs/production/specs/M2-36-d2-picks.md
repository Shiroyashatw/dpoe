# M2-36 D2 挑圖定稿：接線清單

負責：Game Art Director。版本 2026-11-24 15:39（台北）。依據 `M2-36-pixellab-d2-reruns.md` §3–§4、挑圖 Page ece61ef6，以及 mumi 2026-11-24（經幕僚長）原話：「天賦圖示：沿用 11/19 計畫只補缺的」「基石圖：照暫定用」「缺圖：每條路一張主題圖」；同日續定「主題圖：補 28 條，鏈錘和魔符先不產」「小點格擋：留著已挑的圖」「核准像素產圖師試產格擋與盾、範圍、十字弓術 3 張共 12 次」「挑圖清單交工程師開文件 PR」。

- 基石 23：11/19 暫定選擇改為**定稿**（mumi「照暫定用」）；種子與檔名不變。
- 已挑的大點、小點與其他素材不變；王 15 仍暫定（本次決定未涵蓋）。
- `ts_block`：**留 11/19 已挑的圖**（mumi「小點格擋：留著已挑的圖」），不改成新 `tn_block` 的 16 縮小。
- 本批待產主題圖 **28** 條（32，小點 16 由 32 最近鄰縮小，見 `M2-36-talent-theme-icons.md`）。鏈錘術、魔符術先不產。規格、JSON、日誌、對話不寫 API key 的名或值。

## 0. 怎麼用

- **來源**：檔在 `art/_tmp/<資料夾>/<id>/post/<檔>`，分支與資料夾對照：F＝`art/m2-36-d2-first`（`art/_tmp/m2-36-d2-first/`）、B2＝`art/m2-36-d2-b2`（`…/m2-36-d2-b2/`）、B3＝`art/m2-36-d2-b3`（`…/m2-36-d2-b3/`）、RR＝`art/m2-36-d2-rerun`（`…/m2-36-d2-rerun/`）。一律拿 `post/` 的檔（已 alpha_binary／色階），不要拿原圖。「借」的列：資料夾是括號裡那個 id。
- **接到**：規格只定了接線的鍵（batch2 §1「接線」：`PT_KEYS[].ic`→`tk_*`、`PT_ICONS` 每主題只剩 `tn_*` 一枚、`PT_STAT_IC` 依族改 `ts_*`；王只換 `BOSSES` 的 `sp`，道具的 `ic` 先留舊圖）。遊戲裡的檔案位置與拼大圖方式規格沒定，**建議**照 `tools/art_pick.py` 的做法：`art/<類>/<id>/picked.txt` 寫一行檔名、拼圖與雜湊檔名由程式產生；地磚與王印已有現成資料夾（表內寫明）。
- **新鍵、舊圖不刪**：王用新鍵 `boss_<id>`；被取代的舊圖都留著，退路要用。
- 共 165 張＋牆面 1 張程式畫。來源：B2 89、B3 50、RR 18、F 8。

## 0b. 後處理（要做的只有這幾項）

1. **牆面**：用 RR 的程式畫成品，不用 PixelLab 圖。
2. **牆頂**：用 B2 的 `tile_d2_walltop-s5221-32x32-repost.png`（首跑原圖套新後處理，L\* 37.1）；不要用 F 的同種子舊 post 檔。
3. **小點借大點 3 張**（`ts_phys`←`tn_phys` 6277、`ts_light`←`tn_light` 8257、`ts_chaos`←`tn_chaos` 6290）：拿大點 32 的 post 檔，最近鄰縮成 16（PIL NEAREST），再照小點流程 `alpha_binary` 吸 palette。
4. **王印・疾霆 5407**：閃電加粗 1 px（手修，見挑圖 Page）。
5. **牌匾端**：只畫左端，右端水平翻轉；身橫向平鋪（拉到 220 會出現兩組四角鉚釘，接受）。
6. 其餘照原表 post，不再處理。

## 0c. 退路（這些組沒有新圖，留現有圖、不改程式）

| 組 | 留什麼 |
| --- | --- |
| `tn_block` 格擋與盾、`tn_area` 範圍 | 改走 `M2-36-talent-theme-icons.md` 新主題圖，待產；接入前暫留現有借圖 |
| `ts_area` 範圍 | 同上，16 = 新 `tn_area` 32 最近鄰縮小，待產；接入前暫留現有借圖 |
| `slot_ring` 戒指 | 現有戒指圖示 |
| `ail_blind` 致盲、`ail_curse` 詛咒 | M2-39 舊狀態圖 |
| `plq_corner` 牌匾角花 | 不用角花 |

## 1. 天賦樹基石 23（48，**定稿**：mumi 2026-11-24「基石圖：照暫定用」）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `tk_judge` | 6004 | B2 | `tk_judge-s6004-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_phalanx` | 6005 | B2 | `tk_phalanx-s6005-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_hunter` | 6012 | B2 | `tk_hunter-s6012-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_master` | 6013 | B2 | `tk_master-s6013-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_shadow` | 8018 | B3 | `tk_shadow-s8018.png` | `PT_KEYS[].ic` | — |
| `tk_bloodclaw` | 6024 | B2 | `tk_bloodclaw-s6024-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_storm` | 8028 | B3 | `tk_storm-s8028.png` | `PT_KEYS[].ic` | — |
| `tk_medium` | 6029 | B2 | `tk_medium-s6029-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_bloodmage` | 6034 | B2 | `tk_bloodmage-s6034-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_bonelord` | 8039 | B3 | `tk_bonelord-s8039.png` | `PT_KEYS[].ic` | — |
| `tk_peach` | 6042 | B2 | `tk_peach-s6042-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_banner` | 6045 | B2 | `tk_banner-s6045-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_scythe` | 6049 | B2 | `tk_scythe-s6049-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_circular` | 6053 | B2 | `tk_circular-s6053-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_knightly` | 8058 | B3 | `tk_knightly-s8058.png` | `PT_KEYS[].ic` | — |
| `tk_irongrip` | 8062 | B3 | `tk_irongrip-s8062.png` | `PT_KEYS[].ic` | — |
| `tk_ironwill` | 6066 | B2 | `tk_ironwill-s6066-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_stance` | 8072 | B3 | `tk_stance-s8072.png` | `PT_KEYS[].ic` | — |
| `tk_rolltank` | 6075 | B2 | `tk_rolltank-s6075-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_esmana` | 8079 | B3 | `tk_esmana-s8079.png` | `PT_KEYS[].ic` | — |
| `tk_inevcrit` | 9077 | RR | `tk_inevcrit-s9077.png` | `PT_KEYS[].ic` | — |
| `tk_deflect` | 6087 | B2 | `tk_deflect-s6087-48x48.png` | `PT_KEYS[].ic` | — |
| `tk_crimson` | 9008 | RR | `tk_crimson-s9008.png` | `PT_KEYS[].ic` | — |

## 2. 王 15（64，**暫定**；新鍵 `boss_<id>`，舊鍵不動）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `boss_taisui` | 6604 | B2 | `boss_taisui-s6604-64x64.png` | `BOSSES` 該王 `sp` | — |
| `boss_chiyou` | 6607 | B2 | `boss_chiyou-s6607-64x64.png` | `BOSSES` 該王 `sp` | — |
| `boss_xingtian` | 9003 | RR | `boss_xingtian-s9003.png` | `BOSSES` 該王 `sp` | — |
| `boss_fengbo` | 9072 | RR | `boss_fengbo-s9072.png` | `BOSSES` 該王 `sp` | — |
| `boss_yushi` | 6617 | B2 | `boss_yushi-s6617-64x64.png` | `BOSSES` 該王 `sp` | — |
| `boss_e` | 6622 | B2 | `boss_e-s6622-64x64.png` | `BOSSES` 該王 `sp` | — |
| `boss_yu` | 6626 | B2 | `boss_yu-s6626-64x64.png` | `BOSSES` 該王 `sp` | — |
| `boss_xi` | 6901 | B3 | `boss_xi-s6901.png` | `BOSSES` 該王 `sp` | — |
| `boss_nu` | 6905 | B3 | `boss_nu-s6905.png` | `BOSSES` 該王 `sp` | — |
| `boss_ai` | 8710 | B3 | `boss_ai-s8710.png` | `BOSSES` 該王 `sp` | — |
| `boss_ju` | 8714 | B3 | `boss_ju-s8714.png` | `BOSSES` 該王 `sp` | — |
| `boss_ai2` | 6919 | B3 | `boss_ai2-s6919.png` | `BOSSES` 該王 `sp` | — |
| `boss_shang` | 6921 | B3 | `boss_shang-s6921.png` | `BOSSES` 該王 `sp` | — |
| `boss_zhong` | 6925 | B3 | `boss_zhong-s6925.png` | `BOSSES` 該王 `sp` | — |
| `boss_xia` | 8731 | B3 | `boss_xia-s8731.png` | `BOSSES` 該王 `sp` | — |

## 3. 天賦大點 42／44（32）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `tn_base` | 8201 | B3 | `tn_base-s8201.png` | `PT_ICONS` 該主題 | — |
| `tn_life` | 6205 | B2 | `tn_life-s6205-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_armour` | 8205 | B3 | `tn_armour-s8205.png` | `PT_ICONS` 該主題 | — |
| `tn_melee` | 6215 | B2 | `tn_melee-s6215-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_atkspd` | 6217 | B2 | `tn_atkspd-s6217-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_proj` | 6221 | B2 | `tn_proj-s6221-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_evade` | 6224 | B2 | `tn_evade-s6224-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_crit` | 9018 | RR | `tn_crit-s9018.png` | `PT_ICONS` 該主題 | — |
| `tn_critdmg` | 6230 | B2 | `tn_critdmg-s6230-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_acc` | 6232 | B2 | `tn_acc-s6232-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_trap` | 6235 | B2 | `tn_trap-s6235-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_ail` | 6237 | B2 | `tn_ail-s6237-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_elem` | 8228 | B3 | `tn_elem-s8228.png` | `PT_ICONS` 該主題 | — |
| `tn_elemskill` | 6244 | B2 | `tn_elemskill-s6244-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_spell` | 8231 | B3 | `tn_spell-s8231.png` | `PT_ICONS` 該主題 | — |
| `tn_es` | 6251 | B2 | `tn_es-s6251-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_mpcd` | 6253 | B2 | `tn_mpcd-s6253-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_occult` | 6256 | B2 | `tn_occult-s6256-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_minion` | 6258 | B2 | `tn_minion-s6258-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_aura` | 6263 | B2 | `tn_aura-s6263-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_primal` | 6264 | B2 | `tn_primal-s6264-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_totem` | 6267 | B2 | `tn_totem-s6267-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_attack` | 8249 | B3 | `tn_attack-s8249.png` | `PT_ICONS` 該主題 | — |
| `tn_phys` | 6277 | B2 | `tn_phys-s6277-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_fire` | 6280 | B2 | `tn_fire-s6280-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_cold` | 8256 | B3 | `tn_cold-s8256.png` | `PT_ICONS` 該主題 | — |
| `tn_light` | 8257 | B3 | `tn_light-s8257.png` | `PT_ICONS` 該主題 | — |
| `tn_chaos` | 6290 | B2 | `tn_chaos-s6290-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_bleed` | 6291 | B2 | `tn_bleed-s6291-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_poison` | 6294 | B2 | `tn_poison-s6294-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_leech` | 9084 | RR | `tn_leech-s9084.png` | `PT_ICONS` 該主題 | — |
| `tn_regen` | 9026 | RR | `tn_regen-s9026.png` | `PT_ICONS` 該主題 | — |
| `tn_strike` | 8270 | B3 | `tn_strike-s8270.png` | `PT_ICONS` 該主題 | — |
| `tn_heavy` | 6308 | B2 | `tn_heavy-s6308-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_stun` | 8274 | B3 | `tn_stun-s8274.png` | `PT_ICONS` 該主題 | — |
| `tn_tough` | 9031 | RR | `tn_tough-s9031.png` | `PT_ICONS` 該主題 | — |
| `tn_thorns` | 9033 | RR | `tn_thorns-s9033.png` | `PT_ICONS` 該主題 | — |
| `tn_deflect` | 6320 | B2 | `tn_deflect-s6320-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_duration` | 9038 | RR | `tn_duration-s9038.png` | `PT_ICONS` 該主題 | — |
| `tn_curse` | 6326 | B2 | `tn_curse-s6326-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_rage` | 6328 | B2 | `tn_rage-s6328-32x32.png` | `PT_ICONS` 該主題 | — |
| `tn_parry` | 6331 | B2 | `tn_parry-s6331-32x32.png` | `PT_ICONS` 該主題 | — |

## 4. 天賦小點 23／24（16）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `ts_attack` | 6402 | B2 | `ts_attack-s6402-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_phys（借 tn_phys）` | 6277 | B2 | `tn_phys-s6277-32x32.png` | `PT_STAT_IC` 族 | 最近鄰縮 16＋alpha_binary |
| `ts_fire` | 6409 | B2 | `ts_fire-s6409-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_cold` | 8407 | B3 | `ts_cold-s8407.png` | `PT_STAT_IC` 族 | — |
| `ts_light（借 tn_light）` | 8257 | B3 | `tn_light-s8257.png` | `PT_STAT_IC` 族 | 最近鄰縮 16＋alpha_binary |
| `ts_chaos（借 tn_chaos）` | 6290 | B2 | `tn_chaos-s6290-32x32.png` | `PT_STAT_IC` 族 | 最近鄰縮 16＋alpha_binary |
| `ts_bleed` | 8414 | B3 | `ts_bleed-s8414.png` | `PT_STAT_IC` 族 | — |
| `ts_poison` | 6423 | B2 | `ts_poison-s6423-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_ignite` | 6425 | B2 | `ts_ignite-s6425-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_life` | 6429 | B2 | `ts_life-s6429-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_mana` | 8421 | B3 | `ts_mana-s8421.png` | `PT_STAT_IC` 族 | — |
| `ts_es` | 9053 | RR | `ts_es-s9053.png` | `PT_STAT_IC` 族 | — |
| `ts_armour` | 8426 | B3 | `ts_armour-s8426.png` | `PT_STAT_IC` 族 | — |
| `ts_evade` | 8428 | B3 | `ts_evade-s8428.png` | `PT_STAT_IC` 族 | — |
| `ts_block` | 8429 | B3 | `ts_block-s8429.png` | `PT_STAT_IC` 族 | 留 11/19 已挑的圖（mumi 11/24），不改成新 `tn_block` 的 16 縮小 |
| `ts_crit` | 9057 | RR | `ts_crit-s9057.png` | `PT_STAT_IC` 族 | — |
| `ts_speed` | 6451 | B2 | `ts_speed-s6451-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_proj` | 9063 | RR | `ts_proj-s9063.png` | `PT_STAT_IC` 族 | — |
| `ts_minion` | 8440 | B3 | `ts_minion-s8440.png` | `PT_STAT_IC` 族 | — |
| `ts_flask` | 8442 | B3 | `ts_flask-s8442.png` | `PT_STAT_IC` 族 | — |
| `ts_curse` | 8444 | B3 | `ts_curse-s8444.png` | `PT_STAT_IC` 族 | — |
| `ts_aura` | 6468 | B2 | `ts_aura-s6468-16x16.png` | `PT_STAT_IC` 族 | — |
| `ts_attr` | 6471 | B2 | `ts_attr-s6471-16x16.png` | `PT_STAT_IC` 族 | — |

## 5. 物品部位 10／11（32）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `slot_weapon` | 6701 | B2 | `slot_weapon-s6701-32x32.png` | 部位圖示 | — |
| `slot_focus` | 6706 | B2 | `slot_focus-s6706-32x32.png` | 部位圖示 | — |
| `slot_shield` | 6707 | B2 | `slot_shield-s6707-32x32.png` | 部位圖示 | — |
| `slot_helm` | 6711 | B2 | `slot_helm-s6711-32x32.png` | 部位圖示 | — |
| `slot_chest` | 6714 | B2 | `slot_chest-s6714-32x32.png` | 部位圖示 | — |
| `slot_gloves` | 6717 | B2 | `slot_gloves-s6717-32x32.png` | 部位圖示 | — |
| `slot_boots` | 6721 | B2 | `slot_boots-s6721-32x32.png` | 部位圖示 | — |
| `slot_belt` | 6722 | B2 | `slot_belt-s6722-32x32.png` | 部位圖示 | — |
| `slot_quiver` | 6730 | B2 | `slot_quiver-s6730-32x32.png` | 部位圖示 | — |
| `slot_amulet` | 6732 | B2 | `slot_amulet-s6732-32x32.png` | 部位圖示 | — |

## 6. 通貨 16、藥水 24

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `cur_gold` | 5401 | B2 | `cur_gold-s5401-16x16.png` | 同 id | — |
| `cur_soul` | 5306 | F | `cur_soul-s5306.png` | 同 id | — |
| `cur_trans` | 5322 | B2 | `cur_trans-s5322-16x16.png` | 同 id | — |
| `cur_aug` | 5324 | B2 | `cur_aug-s5324-16x16.png` | 同 id | — |
| `cur_regal` | 5327 | B2 | `cur_regal-s5327-16x16.png` | 同 id | — |
| `cur_exalt` | 5329 | B2 | `cur_exalt-s5329-16x16.png` | 同 id | — |
| `cur_chaos` | 5330 | B2 | `cur_chaos-s5330-16x16.png` | 同 id | — |
| `cur_wish` | 9101 | RR | `cur_wish-s9101.png` | 同 id | — |
| `cur_whet` | 5335 | B2 | `cur_whet-s5335-16x16.png` | 同 id | — |
| `cur_scrap` | 5336 | B2 | `cur_scrap-s5336-16x16.png` | 同 id | — |
| `cur_prism` | 5339 | B2 | `cur_prism-s5339-16x16.png` | 同 id | — |
| `cur_vaal` | 5340 | B2 | `cur_vaal-s5340-16x16.png` | 同 id | — |
| `cur_eng` | 5343 | B2 | `cur_eng-s5343-16x16.png` | 同 id | — |
| `soulpack` | 5351 | B2 | `soulpack-s5351-16x16.png` | 同 id | — |
| `cur_calam` | 5351 | B2 | `cur_calam-s5351-16x16.png` | 同 id | — |
| `cur_pcalam` | 9103 | RR | `cur_pcalam-s9103.png` | 同 id | — |
| `cur_pen` | 5357 | B2 | `cur_pen-s5357-16x16.png` | 同 id | — |
| `cur_frac` | 6803 | B3 | `cur_frac-s6803.png` | 同 id | — |
| `cur_perf` | 6805 | B3 | `cur_perf-s6805.png` | 同 id | — |
| `cur_ink` | 9108 | RR | `cur_ink-s9108.png` | 同 id | — |
| `flask_hp` | 5312 | F | `flask_hp-s5312-24.png` | 同 id | — |
| `flask_mp` | 5316 | F | `flask_mp-s5316-24.png` | 同 id | — |

## 7. 王印 16

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `wangyin_zhenyue_16` | 5403 | F | `wangyin_zhenyue_16-s5403.png` | `art/icons/wangyin/wangyin_zhenyue/` 的 _16 | — |
| `wangyin_chixiao_16` | 5404 | F | `wangyin_chixiao_16-s5404.png` | `art/icons/wangyin/wangyin_chixiao/` 的 _16 | — |
| `wangyin_jiting_16` | 5407 | F | `wangyin_jiting_16-s5407.png` | `art/icons/wangyin/wangyin_jiting/` 的 _16 | 手修：閃電加粗 1 px |
| `wangyin_guixu_16` | 5510 | B2 | `wangyin_guixu_16-s5510-16x16.png` | `art/icons/wangyin/wangyin_guixu/` 的 _16 | — |

## 8. 戰鬥狀態 16（14／16）

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `ail_ign` | 7001 | B3 | `ail_ign-s7001.png` | 狀態 16，24 格置中 | — |
| `ail_bleed` | 7004 | B3 | `ail_bleed-s7004.png` | 狀態 16，24 格置中 | — |
| `ail_poison` | 7007 | B3 | `ail_poison-s7007.png` | 狀態 16，24 格置中 | — |
| `ail_chill` | 7011 | B3 | `ail_chill-s7011.png` | 狀態 16，24 格置中 | — |
| `ail_frozen` | 7013 | B3 | `ail_frozen-s7013.png` | 狀態 16，24 格置中 | — |
| `ail_shock` | 7017 | B3 | `ail_shock-s7017.png` | 狀態 16，24 格置中 | — |
| `ail_elc` | 7021 | B3 | `ail_elc-s7021.png` | 狀態 16，24 格置中 | — |
| `ail_stun` | 7023 | B3 | `ail_stun-s7023.png` | 狀態 16，24 格置中 | — |
| `ail_wither` | 7025 | B3 | `ail_wither-s7025.png` | 狀態 16，24 格置中 | — |
| `ail_exp` | 7032 | B3 | `ail_exp-s7032.png` | 狀態 16，24 格置中 | — |
| `ail_rage` | 7038 | B3 | `ail_rage-s7038.png` | 狀態 16，24 格置中 | — |
| `ail_wet` | 7042 | B3 | `ail_wet-s7042.png` | 狀態 16，24 格置中 | — |
| `ail_cons` | 9094 | RR | `ail_cons-s9094.png` | 狀態 16，24 格置中 | — |
| `ail_pin` | 9098 | RR | `ail_pin-s9098.png` | 狀態 16，24 格置中 | — |

## 9. B3 牌匾

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `plq_body` | 5702 | B3 | `plq_body-s5702.png` | 牌匾身，橫向平鋪 | — |
| `plq_end` | 5706 | B3 | `plq_end-s5706.png` | 牌匾端，右端水平翻轉 | — |

## 10. 營地與戰場道具 32

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `prop_lantern` | 5243 | B2 | `prop_lantern-s5243-32x32.png` | 同 id | — |
| `prop_ash` | 5244 | B2 | `prop_ash-s5244-32x32.png` | 同 id | — |
| `prop_joss` | 5247 | B2 | `prop_joss-s5247-32x32.png` | 同 id | — |
| `prop_stele` | 5249 | B2 | `prop_stele-s5249-32x32.png` | 同 id | — |
| `prop_crate` | 5252 | B2 | `prop_crate-s5252-32x32.png` | 同 id | — |
| `prop_barrel` | 5255 | B2 | `prop_barrel-s5255-32x32.png` | 同 id | — |
| `prop_rack` | 5256 | B2 | `prop_rack-s5256-32x32.png` | 同 id | — |

## 11. 地磚

| id | 種子 | 來源 | 檔（`post/` 下） | 接到 | 後處理 |
| --- | --- | --- | --- | --- | --- |
| `tile_d2_battle_floor` | 5201 | F | `tile_d2_battle_floor-s5201.png` | `art/tiles/temple/floor/` | — |
| `tile_d2_camp_floor` | 5212 | F | `tile_d2_camp_floor-s5212.png` | 營地地板（暫定） | — |
| `tile_d2_walltop` | 5221 | B2 | `tile_d2_walltop-s5221-32x32-repost.png` | `art/tiles/temple/walltop/` | 用新後處理 -repost 檔 |
| `tile_d2_wallface` | 程式畫 | RR | `tile_d2_wallface/tile_d2_wallface-prog.png`、`post/…-a.png`／`-b.png` | `art/tiles/temple/wallface/` | 已是成品（L\* 19.3、四邊接縫比 0），不再處理 |

## 12. 偏弱、之後可手修（不擋接線）

刑天 9003 胸眼看不出；風伯 9072 有翅膀；緋紅猛攻箭頭朝上；`ts_es` 9053 是實心六角；`ts_attr` 6471 五角星；`cur_ink` 9108 偏細；`cur_gold` 5401 偏灰；`tn_base` 8201 五角星；`tn_atkspd` 6217 沒速度線；`tn_chaos` 6290 沒混沌色。

## 13. 待產主題圖（mumi 11/24）

沿用 11/19 計畫，只補缺的。mumi 原話：「主題圖：補 28 條，鏈錘和魔符先不產」。清單、提示詞、試產與點數見 `M2-36-talent-theme-icons.md`。本批產 **28** 條路：

- 11/19 退路 2：格擋與盾、範圍
- 0.2.67 新主題 12：夥伴、戰吼、命令技能、傀儡大師、捷光環、波動、執政官、先祖強化、榴彈、灌注、護符與藥劑、破甲
- 0.2.68 全域防禦（UIUX 清單未列，樹上有點，納入本批）
- 武器術 13（UIUX 列的 7 條，其中「劑」已核對為「劍術」、「十字弓含弩炮」＝十字弓術、弩炮不是獨立路；另納入 UIUX 未列的斧術、爪術、機關術、長杖術、法杖術、權杖術）

不產（鎖住，mumi 11/24「鏈錘和魔符先不產」）：鏈錘術、魔符術。提示詞留在主題圖規格供日後，不計入本批 87 次。

`ts_block`：留 11/19 已挑的圖（mumi 11/24「小點格擋：留著已挑的圖」），不改成新 `tn_block` 的 16 縮小。

試產 12 次已核准（格擋與盾、範圍、十字弓術各 4）。本批總生成 87 次＝試產 12＋其餘 25×3。補跑須另行核准。

接入前 `PT_ICONS`／`PT_STAT_IC` 仍用現有借圖。新圖未產、未接入 `origin/main`。
