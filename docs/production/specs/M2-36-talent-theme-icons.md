# M2-36 天賦主題圖（補缺）

負責：Game Art Director。版本 2026-11-24 15:39（台北）。規格、JSON、日誌、對話不寫 API key 的名或值。挑圖清單交工程師開文件 PR（#176）；本檔不改 `art/`。產圖由像素產圖師依 §4 已核准的試產執行，其餘次數見 §4。

依據：mumi 2026-11-24（經幕僚長）原話「天賦圖示：沿用 11/19 計畫只補缺的」「基石圖：照暫定用」「缺圖：每條路一張主題圖」；同日續定「主題圖：補 28 條，鏈錘和魔符先不產」「小點格擋：留著已挑的圖」「核准像素產圖師試產格擋與盾、範圍、十字弓術 3 張共 12 次」「挑圖清單交工程師開文件 PR」。畫法沿用 `M2-36-pixellab-d2-batch2.md` §1 與 `M2-36-pixellab-d2.md` §0（本檔自足抄錄，不必整支第二批規格進本次文件 PR）。接線見 `M2-36-d2-picks.md`。資料核對 `origin/main`（`49b9babf`）`js/data.js`（`PT_THEME`／`PT_WP`／`PT_ICONS`／`PT_STAT_IC`／`TERMS`）、`js/ptdata.js` `PT_BAKE`、`js/tree.js`。

「路」＝天賦樹一個主題（`PT_THEME` 一列，含 `PT_WP` 武器術），不是六條起始扇區。已挑的 42 枚大點、23 枚小點、23 枚基石不重產。11/19 對 0.2.67 新主題「借現成的圖，不產新圖」被本次「只補缺的／每條路一張主題圖」取代。

## 0. 尺寸與接入（11/19 計畫）

- 大點主題圖 `tn_*`：32×32 直出。同主題大點與該主題入口共用這一枚（取代 `PT_ICONS` 輪流借圖）。
- 小點 `ts_*`：先產同一張 32，再最近鄰 2× 縮成 16（PIL `NEAREST`，再 `alpha_binary` 吸 palette；同物理／閃電／混沌）。小點仍優先 `PT_STAT_IC[第一條數值]`，否則退回該主題這枚。
- 圖示寬約＝節點直徑×0.8；外圍留 ≥2 單位給程式畫的三狀態外圈。`tree.js` 倍數（小 1.3→1.6、大 1.4→1.68、基石 1.4→1.6）仍是 11/19 UIUX 已准、尚未上線，與本批產圖分開。
- `ts_block`（格擋小點家族，種子 8429）：**留 11/19 已挑的圖**（mumi 11/24 原話「小點格擋：留著已挑的圖」）。本批仍產新 `tn_block` 32，但不把 `ts_block` 換成它的 16 縮小。
- 節點數：大＝bake 型別 2，小＝型別 1＋5。基石／起始／屬性點不計入「使用這枚主題圖」的點數。現借圖＝`PT_THEME`／`PT_WP` 的 `ic`（接入前仍用）。`origin/main` 尚無任何 `tk_`／`tn_`／`ts_` PNG。

## 1. 缺圖清單（本批產 28 條；鏈錘術、魔符術不產）

中文名一律用遊戲資料 `PT_THEME.n`／`PT_WP` 正式名，不自造。`docs/名詞表.md`（main v0.6.41）無這些主題的獨立列，請數值設計師補列或確認是否沿用資料名（見 §5）。

| id | 中文名 | 類 | 大／小 | 現借圖 | 已挑新圖 |
| --- | --- | --- | --- | --- | --- |
| `tn_block` | 格擋與盾 | 退路 | 12／28 | `asc_s_anvil` | 否（11/19 退路；`ts_block` 已挑，見 §0） |
| `tn_area` | 範圍 | 退路 | 12／40 | `sup_sp_aoe` | 否（`tn_area`／`ts_area` 皆退路） |
| `tn_comp` | 夥伴 | 新主題 | 12／31 | `asc_s_paw` | 否 |
| `tn_warcry` | 戰吼 | 新主題 | 10／30 | `sk_warcry` | 否 |
| `tn_command` | 命令技能 | 新主題 | 5／22 | `sk_command` | 否 |
| `tn_puppet` | 傀儡大師 | 新主題 | 3／7 | `sk_possession` | 否 |
| `tn_herald` | 捷光環 | 新主題 | 5／21 | `asc_s_spark` | 否 |
| `tn_vol` | 波動 | 新主題 | 5／10 | `sup_sp_boom` | 否 |
| `tn_archon` | 執政官 | 新主題 | 5／24 | `sk_phoenix` | 否 |
| `tn_ancestral` | 先祖強化 | 新主題 | 2／4 | `sk_ancestral` | 否 |
| `tn_grenade` | 榴彈 | 新主題 | 5／12 | `sk_detonate` | 否 |
| `tn_infusion` | 灌注 | 新主題 | 5／13 | `asc_s_flame` | 否 |
| `tn_charm` | 護符與藥劑 | 新主題 | 6／27 | `asc_s_potion` | 否 |
| `tn_armbreak` | 破甲 | 新主題 | 4／20 | `sup_sp_pen` | 否 |
| `tn_globaldef` | 全域防禦 | 新主題 | 4／22 | `asc_s_shield` | 否（UIUX 未列） |
| `tn_sword` | 劍術 | 武器術 | 7／13 | `gear_weapon_0` | 否 |
| `tn_axe` | 斧術 | 武器術 | 8／27 | `gear_weapon_2` | 否（UIUX 未列） |
| `tn_mace` | 錘術 | 武器術 | 11／30 | `gear_weapon_8` | 否 |
| `tn_flail` | 鏈錘術 | 武器術 | 9／17 | `gear_weapon_22` | **不產（鎖住，mumi 11/24）** |
| `tn_spear` | 長矛術 | 武器術 | 7／26 | `gear_weapon_9` | 否 |
| `tn_bow` | 弓術 | 武器術 | 10／45 | `gear_weapon_3` | 否 |
| `tn_xbow` | 十字弓術 | 武器術 | 10／36 | `gear_weapon_12` | 否（「弩炮」是此主題一個大點名，不是獨立路） |
| `tn_dagger` | 匕首術 | 武器術 | 10／34 | `gear_weapon_13` | 否 |
| `tn_claw` | 爪術 | 武器術 | 7／27 | `gear_weapon_27` | 否（未列） |
| `tn_traptool` | 機關術 | 武器術 | 7／22 | `sup_sp_mine` | 否（未列） |
| `tn_staff` | 長杖術 | 武器術 | 12／40 | `gear_weapon_4` | 否（未列） |
| `tn_wand` | 法杖術 | 武器術 | 8／31 | `gear_weapon_31` | 否（未列） |
| `tn_sceptre` | 權杖術 | 武器術 | 7／29 | `gear_weapon_15` | 否（未列） |
| `tn_talisman` | 魔符術 | 武器術 | 10／24 | `asc_tamer_e` | **不產（鎖住，mumi 11/24）** |
| `tn_qstaff` | 棍術 | 武器術 | 8／17 | `asc_moon_c` | 否 |

對應小點 id：把 `tn_` 換成 `ts_`（16＝該 32 最近鄰縮小）。不要跟已佔 id 撞名：`tn_trap`＝陷阱地雷、`tn_totem`＝砲塔圖騰、`tn_minion`＝召喚。

### 1b. 與 UIUX 清單的差異

UIUX 列 21 項：範圍、格擋與盾、7 條武器路（劑、錘、長矛、弓、棍、匕首、十字弓含弩炮）、12 條新主題。核對結果：

- 「劑」是「劍」的筆誤，正式名是 **劍術**（`PT_WP('sword','劍術',…)`），資料與名詞表都沒有叫「劑」的武器主題。
- 「十字弓含弩炮」＝主題 **十字弓術**；「弩炮」是該主題第 10 個大點名，不必另產一枚。
- UIUX 短名對正式名：錘→錘術、長矛→長矛術、弓→弓術、棍→棍術、匕首→匕首術。
- UIUX 列的 21 條路確實都缺新圖，沒有「列了但不缺」的項。
- UIUX 未列、樹上有大／小點、11/19 也沒挑到主題圖的還有：全域防禦、斧術、鏈錘術、爪術、機關術、長杖術、法杖術、權杖術、魔符術。本批納入其中 7 條（全域防禦、斧術、爪術、機關術、長杖術、法杖術、權杖術）。鏈錘術、魔符術 **不產**（mumi 11/24 原話「主題圖：補 28 條，鏈錘和魔符先不產」）；提示詞保留供日後，不計入本批 87 次。
- 已覆蓋、不要重產：基礎 `tn_base`、命中 `tn_acc` 等 42 枚已挑大點與 23 枚已挑小點。
- 節點數以 `origin/main` 為準。`origin/numbers/num-tree-v4-verify` 缺圖集合相同；十字弓術小點 v4 為 32、main 為 36，若 UIUX 依 v4 起草，點數會略有出入。

## 2. 畫法與提示詞結構（沿用第二批）

pixflux 圖示 body（主檔 §0），`<NOT>`＝text, letters, numerals, face, skull, circle frame, node ring, background disc, gradient glow。透明底；**不畫圓框或底盤**（節點圓、外圈、三狀態由程式畫）。主形佔畫布 80–90%，最細的線 2 px（16 成品 1 px），1 px `#000` 外緣。轉灰階要能分（剪影不同，不靠顏色）。主形要有 `#e8e5e1` 亮面＋`#33302b` 暗面，好在已點／可點／不能點三種底上辨認。

palette：共用 `#000000` `#33302b` `#615b56` `#aeaba7` `#e8e5e1`，再加該列「點綴」1–2 色（顏色一定搭形狀）。點綴代號：火 `#ee9978`、冰 `#ade2f9`、雷 `#f3f9a4`、混 `#e97ccf`、命 `#934341` `#af6c64`、魔 `#3a5b98` `#6b7dad`、綠 `#95e886`、金 `#f2cb9b`、無＝不加。

呼叫 body（`<DESC>` 代入下表；W＝H＝32）：

```
{"description":"game item icon, flat front view, <DESC>, centred, light from the top-left, 1 pixel black outline, rich three-tone shading plus one highlight, muted palette, no perspective, no isometric, no 3D, no face, no text, no background, no dithering, no baked frame, no badge, no cooldown ring, no numerals, no <NOT>","image_size":{"width":32,"height":32},"view":"side","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true}
```

過關另加主檔 §6，並：顯示尺寸上一眼認出主形；與已挑天賦圖示（及本批彼此）剪影 1−IoU ≥0.5（兩兩 IoU <0.7）；不准圓框、字、臉；C*>40 ≤25% 不透明像素。格擋與盾、範圍 11/19 因封閉圓形（圓盾、同心弧）沒過，本批改不閉合造形，禁止再寫 round shield／expanding arcs。

種子：接在 11/19 大點 6201、小點 6401 之後，避免撞檔名。本批 28 枚：試產 3 枚 seed0＝8601／8605／8609（各 n 4）；其餘 25 枚按表中本批產之列、自 8613 起每列 n 3。不產的兩列不佔本批種子。檔名 `<id>-s<seed>.png`。

## 3. 提示詞表（本批 28 張 32；鏈錘術、魔符術提示詞保留、本批不產）

「對」＝剪影比對時至少要過的已挑近鄰（產出後用 32 二值剪影算 IoU；小點用縮小後的 16 再對已挑 `ts_*`）。

| id | 名 | 類 | 規格 | `<DESC>` | 剪影對 |
| --- | --- | --- | --- | --- | --- |
| `tn_block` | 格擋與盾 | 退路 | 32；共用；點綴無 | a tall heater shield, flat top and pointed tip, a short boss, no round rim | `tn_armour` `tn_parry` `tn_deflect` `tn_tough`；勿再畫圓盾 |
| `tn_area` | 範圍 | 退路 | 32（`ts_area`＝16 縮小）；共用；點綴無 | a fan of five short shards bursting from one corner, no rings, no expanding arcs | `tn_elem` `tn_stun` `tn_crit` `tn_duration`；勿再畫同心弧 |
| `tn_comp` | 夥伴 | 新主題 | 32；共用；點綴無 | two standing ally silhouettes side by side, one slightly smaller, no face, not a paw print | `tn_minion` `tn_primal` |
| `tn_warcry` | 戰吼 | 新主題 | 32；共用；點綴命 | an open war horn pointing up-right with three sound chevrons | `tn_rage` `tn_attack` `tn_heavy` |
| `tn_command` | 命令技能 | 新主題 | 32；共用；點綴金 | a short command banner on a pole with one downward chevron | `tn_minion` `tn_occult` `tk_banner` |
| `tn_puppet` | 傀儡大師 | 新主題 | 32；共用；點綴混 | a small marionette torso with two hanging control bars, no face | `tn_minion` `tn_occult` `tn_command` |
| `tn_herald` | 捷光環 | 新主題 | 32；共用；點綴金 | a short flame-and-bolt plume rising from a flat collar, no closed halo | `tn_aura` `tn_elem` `tn_fire` |
| `tn_vol` | 波動 | 新主題 | 32；共用；點綴混 | a jagged wave crest breaking into two stacked force ticks, not a closed spiral | `tn_chaos` `tn_ail` `tn_curse` |
| `tn_archon` | 執政官 | 新主題 | 32；共用；點綴魔 | a short pointed helm crest over a split elemental shard, no face | `tn_elemskill` `tn_spell` `tn_herald` |
| `tn_ancestral` | 先祖強化 | 新主題 | 32；共用；點綴金 | a short geometric totem block (no face) struck by a heavy downward chevron | `tn_totem` `tn_heavy` `tn_melee` `tk_banner` |
| `tn_grenade` | 榴彈 | 新主題 | 32；共用；點綴火 | a faceted grenade with a short handle and a spark fuse, not a perfect circle | `tn_trap` `tn_fire` `tn_phys` |
| `tn_infusion` | 灌注 | 新主題 | 32；共用；點綴火＋冰 | a blade mid-pour from a small vial, one flame drip and one ice drip on the edge | `tn_elem` `tn_fire` `tn_spell` `tn_cold` |
| `tn_charm` | 護符與藥劑 | 新主題 | 32；共用；點綴綠 | a hanging charm pouch beside a small potion flask, no readable marks | `tn_regen` `tn_life` `tn_curse` `tn_poison` |
| `tn_armbreak` | 破甲 | 新主題 | 32；共用；點綴無 | a cracked breastplate corner with a wedge driven into the crack | `tn_armour` `tn_heavy` `tn_phys` `tn_block` |
| `tn_globaldef` | 全域防禦 | 新主題 | 32；共用；點綴無 | three small defence marks in a loose triangle: plate, heater edge, hex pane | `tn_armour` `tn_es` `tn_life` `tn_block` |
| `tn_sword` | 劍術 | 武器術 | 32；共用；點綴無 | a straight longsword pointing up-right, slimmer and longer than a short broad sword | `tn_melee` `tn_parry` `tn_atkspd` |
| `tn_axe` | 斧術 | 武器術 | 32；共用；點綴無 | a single-bit battle axe in profile, blade facing right | `tn_heavy` `tn_phys` `tn_strike` |
| `tn_mace` | 錘術 | 武器術 | 32；共用；點綴無 | a flanged mace head on a short haft, flanges not a hammer poll | `tn_heavy` `tn_phys` `tn_strike` `tn_stun` |
| `tn_flail` | 鏈錘術 | 武器術 | **本批不產（鎖住，mumi 11/24）**；32；共用；點綴無 | a spiked ball on two chain links, short haft at the left | `tn_mace` `tn_heavy` `tn_thorns` |
| `tn_spear` | 長矛術 | 武器術 | 32；共用；點綴無 | a long spear pointing up-right, narrow leaf blade and a short cross-bar | `tn_proj` `tn_melee` `tn_deflect` |
| `tn_bow` | 弓術 | 武器術 | 32；共用；點綴無 | an upright recurve bow with a nocked arrow, the bow is the main shape | `tn_proj` `tn_evade` |
| `tn_xbow` | 十字弓術 | 武器術 | 32；共用；點綴無 | a horizontal crossbow with a short prod and a bolt in the groove | `tn_bow` `tn_proj` `tn_trap` `tn_totem` |
| `tn_dagger` | 匕首術 | 武器術 | 32；共用；點綴無 | a short single-edged dagger pointing up, one blade only | `tn_melee` `tn_leech` `tn_poison` |
| `tn_claw` | 爪術 | 武器術 | 32；共用；點綴無 | three curved claw blades fanned from a knuckle bar | `tn_minion` `tn_leech` `tn_dagger` |
| `tn_traptool` | 機關術 | 武器術 | 32；共用；點綴無 | a mechanical dart launcher with one exposed gear, not an open bear trap | `tn_trap` `tn_totem` |
| `tn_staff` | 長杖術 | 武器術 | 32；共用；點綴無 | a tall quarterstaff with a wrapped mid-grip and no crystal head | `tn_elemskill` `tn_spell` |
| `tn_wand` | 法杖術 | 武器術 | 32；共用；點綴魔 | a short wand with a small crystal tip, held diagonal | `tn_spell` `tn_occult` `tn_staff` |
| `tn_sceptre` | 權杖術 | 武器術 | 32；共用；點綴金 | a short sceptre with a weighted ornate head, not a crystal wand tip | `tn_minion` `tn_aura` `tn_wand` |
| `tn_talisman` | 魔符術 | 武器術 | **本批不產（鎖住，mumi 11/24）**；32；共用；點綴綠 | a carved animal-tooth talisman on a short thong, no readable text | `tn_primal` `tn_curse` `tn_aura` |
| `tn_qstaff` | 棍術 | 武器術 | 32；共用；點綴無 | a short fighting stick, tapered end, clearly shorter than the tall staff | `tn_staff` `tn_melee` `tn_parry` |

## 4. 試產與點數（已核准）

試產 12 次已核准（mumi 11/24 原話「核准像素產圖師試產格擋與盾、範圍、十字弓術 3 張共 12 次」）：`tn_block`、`tn_area`、`tn_xbow` 各 4 種子。確認剪影與「不閉合」後，再跑其餘 25 張 × n 3（75 次）。

本批總生成 **87** 次＝試產 12＋其餘 25×3（每張 1 次，16／24／32／48／64 實測同價）。補跑須另行核准，本檔不預留重跑上限。產出放草稿分支 `art/_tmp/`（目錄名待開跑時定），不過主檔 §6 的不進挑圖。

## 5. 已決定與請數值設計師

mumi 11/24（經幕僚長）已決定，原話：

- 「主題圖：補 28 條，鏈錘和魔符先不產」——本批產 28 條；`tn_flail` 鏈錘術、`tn_talisman` 魔符術標不產，提示詞保留供日後。兩叢集 11/22 已鎖，樹上仍有點（9／17、10／24）。
- 「小點格擋：留著已挑的圖」——`ts_block` 留 11/19 已挑的圖，不改成新 `tn_block` 的 16 縮小。
- 「核准像素產圖師試產格擋與盾、範圍、十字弓術 3 張共 12 次」——見 §4；本批總生成 87 次＝試產 12＋其餘 25×3。
- 「挑圖清單交工程師開文件 PR」。

請數值設計師：

- 下列主題名在 `data.js` 是正式名，但 `docs/名詞表.md` 無獨立列，請補列或書面確認沿用：格擋與盾、範圍、夥伴、戰吼、命令技能、傀儡大師、捷光環、波動、執政官、先祖強化、榴彈、灌注、護符與藥劑、破甲、全域防禦，以及 15 條「…術」。
- 「命令技能」是樹主題名；`TERMS['命令技能']` 釋義寫「號令技能…」。玩家面對用哪一個，請定，圖示 id 仍用 `tn_command`。
- 「捷光環」是樹主題名；TERMS 鍵是「捷光環技能」。
