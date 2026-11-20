# 美術挑定檔（參考用，不是規格、不是執行時資產）

依據：docs-audit-1120/handoff2/docs-pr-2.md §C（mumi 11/20 15:46 放行）；清單照 Game Art Director 的 `/workspace/m240-r5/to-repo.md`。
開發暫停中，這裡的圖只當參考。遊戲不會讀這個資料夾，也沒有取代 `art/` 底下既有的 _16 或 picked.txt。之後要進 `art/`，另開 PR，由 AD 確認。

## m2-36-d2-first（PR #120 挑定 8 列）

來源：分支 `art/m2-36-d2-first`（8ea3eee）的 `art/_tmp/m2-36-d2-first/<id>/post/<檔>`，挑定依 `M2-36-d2-picks.md`（PR #126）來源 F。

| id | repo 內檔案 | 來源 | 之後要進 art/ 的建議路徑 | 備註 |
|---|---|---|---|---|
| `cur_soul` | `m2-36-d2-first/cur_soul/cur_soul-s5306.png` | `art/_tmp/m2-36-d2-first/cur_soul/post/cur_soul-s5306.png` | `art/currency/cur_soul/` |  |
| `flask_hp` | `m2-36-d2-first/flask_hp/flask_hp-s5312-24.png` | `art/_tmp/m2-36-d2-first/flask_hp/post/flask_hp-s5312-24.png` | `art/flasks/flask_hp/` |  |
| `flask_mp` | `m2-36-d2-first/flask_mp/flask_mp-s5316-24.png` | `art/_tmp/m2-36-d2-first/flask_mp/post/flask_mp-s5316-24.png` | `art/flasks/flask_mp/` |  |
| `wangyin_zhenyue_16` | `m2-36-d2-first/wangyin_zhenyue_16/wangyin_zhenyue_16-s5403.png` | `art/_tmp/m2-36-d2-first/wangyin_zhenyue_16/post/wangyin_zhenyue_16-s5403.png` | `art/icons/wangyin/wangyin_zhenyue/`（取代既有 _16） | 這次沒有取代既有 _16；只是 #120 挑圖的參考，跟王印 v0.2 規格無關 |
| `wangyin_chixiao_16` | `m2-36-d2-first/wangyin_chixiao_16/wangyin_chixiao_16-s5404.png` | `art/_tmp/m2-36-d2-first/wangyin_chixiao_16/post/wangyin_chixiao_16-s5404.png` | `art/icons/wangyin/wangyin_chixiao/`（取代既有 _16） | 這次沒有取代既有 _16；只是 #120 挑圖的參考，跟王印 v0.2 規格無關 |
| `wangyin_jiting_16` | `m2-36-d2-first/wangyin_jiting_16/wangyin_jiting_16-s5407.png` | `art/_tmp/m2-36-d2-first/wangyin_jiting_16/post/wangyin_jiting_16-s5407.png` | `art/icons/wangyin/wangyin_jiting/`（取代既有 _16） | 待 AD 手修後再進 art/（§0b：閃電加粗 1 px）；這裡放的是 post 原檔；只是 #120 挑圖的參考，跟王印 v0.2 規格無關 |
| `tile_d2_battle_floor` | `m2-36-d2-first/tile_d2_battle_floor/tile_d2_battle_floor-s5201.png` | `art/_tmp/m2-36-d2-first/tile_d2_battle_floor/post/tile_d2_battle_floor-s5201.png` | `art/tiles/temple/floor/` |  |
| `tile_d2_camp_floor` | `m2-36-d2-first/tile_d2_camp_floor/tile_d2_camp_floor-s5212.png` | `art/_tmp/m2-36-d2-first/tile_d2_camp_floor/post/tile_d2_camp_floor-s5212.png` | `art/tiles/camp/floor/` | 營地場景已廢，路徑待確認 |

## m2-40-skills（九枚手修技能圖示）

來源：本機 `/workspace/m240-r5/r5f/`（AD R5 手修）；挑定依 `specs/M2-40-skill-icon-picks.md`。之後要進 art/ 的建議路徑：`art/icons/skills/`，該資料夾 `picked.txt` 每枚列一行檔名。

| repo 內檔案 | 來源 | 之後要進 art/ 的建議路徑 |
|---|---|---|
| `m2-40-skills/sk_clarity-s6201h.png` | `/workspace/m240-r5/r5f/sk_clarity-s6201h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_deadeye-s7224h.png` | `/workspace/m240-r5/r5f/sk_deadeye-s7224h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_despair-s7206h.png` | `/workspace/m240-r5/r5f/sk_despair-s7206h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_doom-s7218h.png` | `/workspace/m240-r5/r5f/sk_doom-s7218h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_fireburst-s7210h.png` | `/workspace/m240-r5/r5f/sk_fireburst-s7210h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_holyshield-r5fh.png` | `/workspace/m240-r5/r5f/sk_holyshield-r5fh.png` | `art/icons/skills/` |
| `m2-40-skills/sk_rage-s7219h.png` | `/workspace/m240-r5/r5f/sk_rage-s7219h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_refract-s7213h.png` | `/workspace/m240-r5/r5f/sk_refract-s7213h.png` | `art/icons/skills/` |
| `m2-40-skills/sk_windflask-s7215h.png` | `/workspace/m240-r5/r5f/sk_windflask-s7215h.png` | `art/icons/skills/` |

審查用拼圖（`r5f/big.png` 等）不放。
