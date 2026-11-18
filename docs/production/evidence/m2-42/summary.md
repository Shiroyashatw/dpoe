# M2-42 全頁 UI/UX 體檢截圖（m2-42）

遊戲 commit `2845e5a7cc89602d46dcfb9e303f6615db85dd42`（main），執行 2026-11-18 16:20（台北時間）。清單：`specs/M2-42-ux-audit-checklist.md`、`-b.md` @ `67de865`。流程：`specs/visual-review-protocol.md`。

第一輪 154 列 × 2 尺寸 = 308 筆：過 0、沒過 295、卡住 0、n/a 13。

證據共 184 MB（超過流程 §7 建議的 80 MB）：靜態圖要逐像素量測與比對，沒有壓縮或縮圖；影片 19 支、最大 1.2 MB（都 ≤ 3 MB），單檔都遠小於 GitHub 100 MB。

「沒過」幾乎都是 UX 預篩（PF3／PF10–PF16）抓到的現行問題；這是體檢，PF1／PF2 過的 ★ 圖照樣列在「給美術總監看」。狀態都照清單用 `?test=midgame&seed=42&dbg=1`、全域函式與 `DBG.*` 做，AUDIT 補丁只在截圖工具裡注入（`tools/m2_42_page.js`）。

## 每列結果

| ID | 畫面－狀態 | 390×844 | 1280×720 | 重點數字 |
| --- | --- | --- | --- | --- |
| A-I1 | intro－gate | ❌ PF11 PF3(e) [圖](390x844/intro-gate.png) | ❌ PF3(e) [圖](1280x720/intro-gate.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－omen | ❌ PF11 PF3(e) [圖](390x844/intro-omen.png) | ❌ PF3(e) [圖](1280x720/intro-omen.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－peace | ❌ PF11 PF3(c) PF3(e) [圖](390x844/intro-peace.png) | ❌ PF3(c) PF3(e) [圖](1280x720/intro-peace.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－crack | ❌ PF11 PF3(e) [圖](390x844/intro-crack.png) | ❌ PF3(e) [圖](1280x720/intro-crack.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－fall | ❌ PF11 PF3(c) PF3(e) [圖](390x844/intro-fall.png) | ❌ PF3(c) PF3(e) [圖](1280x720/intro-fall.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－march | ❌ PF11 PF3(c) PF3(e) [圖](390x844/intro-march.png) | ❌ PF3(c) PF3(e) [圖](1280x720/intro-march.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－rain | ❌ PF11 PF3(c) PF3(e) [圖](390x844/intro-rain.png) | ❌ PF3(c) PF3(e) [圖](1280x720/intro-rain.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I2 | intro－you | ❌ PF11 PF3(e) [圖](390x844/intro-you.png) | ❌ PF3(e) [圖](1280x720/intro-you.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I3 | intro－skip | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](390x844/intro-skip.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/intro-skip.png) | 390:scroll_layers=0；128:scroll_layers=0,sk_block=0/10816 |
| A-I3 | intro－lid | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](390x844/intro-lid.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/intro-lid.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-I4 | intro－rm | ❌ PF11 PF3(c) PF3(e) [圖](390x844/intro-rm.png) | ❌ PF3(c) PF3(e) [圖](1280x720/intro-rm.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H1 | combat－auto | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-auto.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-auto.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H2 | combat－manual | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/combat-manual.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-manual.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0,sk_block=0/18928 |
| A-H3 | combat－ammo-mid | ❌ PF1 PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-ammo-mid.png) | ❌ PF1 PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-ammo-mid.png) | 390:hidden=ammo,scroll_layers=0,sk_block=2112/22224；128:hidden=ammo,scroll_layers=0,sk_block=0/18928 |
| A-H3 | combat－ammo-last | ❌ PF1 PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-ammo-last.png) | ❌ PF1 PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-ammo-last.png) | 390:hidden=ammo,scroll_layers=0,sk_block=2112/22224；128:hidden=ammo,scroll_layers=0,sk_block=0/18928 |
| A-H3 | combat－ammo-reload | ❌ PF1 PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-ammo-reload.png) | ❌ PF1 PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-ammo-reload.png) | 390:hidden=ammo,scroll_layers=0,sk_block=2112/22224；128:hidden=ammo,scroll_layers=0,sk_block=0/18928 |
| A-H4 | combat－gren-full | ❌ PF1 PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-gren-full.png) | ❌ PF1 PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-gren-full.png) | 390:hidden=gren,scroll_layers=0,sk_block=2112/22224；128:hidden=gren,scroll_layers=0,sk_block=0/18928 |
| A-H4 | combat－gren-cd | ❌ PF1 PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-gren-cd.png) | ❌ PF1 PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-gren-cd.png) | 390:hidden=gren,scroll_layers=0,sk_block=2112/22224；128:hidden=gren,scroll_layers=0,sk_block=0/18928 |
| A-H5 | combat－charge-1 | ❌ PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-charge-1.png) | ❌ PF11 PF15 PF3(b) PF3(e) [圖](1280x720/combat-charge-1.png) | 390:hidden=charge(技能格無段數),scroll_layers=0,sk_block=2112/22224；128:hidden=charge(技能格無段數),scroll_layers=0,sk_block=0/18928 |
| A-H5 | combat－charge-2 | ❌ PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-charge-2.png) | ❌ PF11 PF15 PF3(e) [圖](1280x720/combat-charge-2.png) | 390:hidden=charge(技能格無段數),scroll_layers=0,sk_block=1936/18352；128:hidden=charge(技能格無段數),scroll_layers=0,sk_block=0/18928 |
| A-H5 | combat－charge-3 | ❌ PF10 PF11 PF13 PF15 PF3(e) PF5 [圖](390x844/combat-charge-3.png) | ❌ PF11 PF15 PF3(e) [圖](1280x720/combat-charge-3.png) | 390:hidden=charge(技能格無段數),scroll_layers=0,sk_block=1936/18352；128:hidden=charge(技能格無段數),scroll_layers=0,sk_block=0/18928 |
| A-H6 | combat－flask-cd | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/combat-flask-cd.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-flask-cd.png) | 390:hidden=none,scroll_layers=0,sk_block=1936/18352；128:hidden=none,scroll_layers=0,sk_block=0/18928 |
| A-H6 | combat－flask-skill | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/combat-flask-skill.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-flask-skill.png) | 390:scroll_layers=0,sk_block=2112/22224；128:scroll_layers=0,sk_block=0/18928 |
| A-H7 | combat－cooldown | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/combat-cooldown.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-cooldown.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0,sk_block=0/18928 |
| A-H7 | combat－invalid | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/combat-invalid.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-invalid.png) | 390:scroll_layers=0,sk_block=2112/22224；128:scroll_layers=0,sk_block=0/18928 |
| A-H8 | combat－hp-mid | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-hp-mid.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-hp-mid.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H8 | combat－hp-low | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-hp-low.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-hp-low.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H8 | combat－es | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-es.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-es.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H8 | combat－block | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-block.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-block.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H8 | combat－hellfire | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-hellfire.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-hellfire.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H9 | combat－status-3 | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-status-3.png) | ❌ PF11 PF3(b) PF3(e) PF5 [圖](1280x720/combat-status-3.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H10 | combat－boss | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-boss.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-boss.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H10 | combat－prog | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-prog.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-prog.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H11 | combat－minimap | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-minimap.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-minimap.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H12 | combat－dlog-cur | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-dlog-cur.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dlog-cur.png) | 390:scroll_layers=0,dlog_colors=1；128:scroll_layers=0,dlog_colors=1 |
| A-H12 | combat－dlog-mix | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-dlog-mix.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dlog-mix.png) | 390:scroll_layers=0,dlog_colors=3；128:scroll_layers=0,dlog_colors=3 |
| A-H12 | combat－dlog-chase | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-dlog-chase.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dlog-chase.png) | 390:scroll_layers=0,dlog_colors=1；128:scroll_layers=0,dlog_colors=1 |
| A-H13 | combat－banner-cur | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-banner-cur.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-banner-cur.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H13 | combat－banner-chase | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-banner-chase.png) | ❌ PF11 PF13 PF3(b) PF3(e) [圖](1280x720/combat-banner-chase.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H14 | combat－toast | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-toast.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-toast.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H15 | combat－lvup | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-lvup.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-lvup.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H16 | combat－paused | ❌ PF10 PF11 PF3(e) PF5 [圖](390x844/combat-paused.png) | ❌ PF11 PF13 PF3(e) [圖](1280x720/combat-paused.png) | 390:scroll_layers=1；128:scroll_layers=1,sk_block=18928/18928 |
| A-H17 | combat－area-run | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/combat-area-run.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-area-run.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H18 | mode－auto | n/a 直立沒有 .modesw（donly），自動／手動在設定裡切 | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/mode-auto.png) | 128:scroll_layers=0 |
| A-H18 | mode－manual | n/a 直立沒有 .modesw（donly），自動／手動在設定裡切 | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/mode-manual.png) | 128:scroll_layers=0,sk_block=0/18928 |
| A-H19 | nav－plain | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](390x844/nav-plain.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/nav-plain.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H19 | nav－badge | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/nav-badge.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/nav-badge.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H19 | nav－dot | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/nav-dot.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/nav-dot.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H20 | nav－hover | n/a 直立沒有滑鼠停留 | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/nav-hover.png) | 128:scroll_layers=0 |
| A-H20 | nav－press | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/nav-press.png) | n/a 桌機沒有觸控按住 | 390:scroll_layers=0 |
| A-H21 | tip－hover | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/tip-hover.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/tip-hover.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| A-H21 | tip－edge | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/tip-edge.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/tip-edge.png) | 390:scroll_layers=2；128:scroll_layers=0 |
| A-H22 | roll－rcd | ❌ PF10 PF11 PF13 PF3(e) PF5 [圖](390x844/roll-rcd.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/roll-rcd.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0,sk_block=0/18928 |
| A-H23 | combat－safe-0 | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-safe-0.png) | ❌ PF1 PF11 PF3(b) PF3(e) [圖](1280x720/combat-safe-0.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-H23 | combat－safe-34 | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-safe-34.png) | ❌ PF1 PF11 PF3(b) PF3(e) [圖](1280x720/combat-safe-34.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-D1 | combat－dark-normal | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-dark-normal.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dark-normal.png) | 390:scroll_layers=0,L_near_minus_far=32.7；128:scroll_layers=0,L_near_minus_far=57.2 |
| A-D2 | combat－dark-night | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-dark-night.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dark-night.png) | 390:scroll_layers=0,L_near_minus_far=40.3；128:scroll_layers=0,L_near_minus_far=60.3 |
| A-D3 | combat－dark-fog | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-dark-fog.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dark-fog.png) | 390:scroll_layers=0,L_near_minus_far=35.4；128:scroll_layers=0,L_near_minus_far=64.7 |
| A-D4 | combat－dark-night-unique | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-dark-night-unique.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/combat-dark-night-unique.png) | 390:scroll_layers=0,L_near_minus_far=40.3；128:scroll_layers=0,L_near_minus_far=61.4 |
| A-D4 | combat－dark-fog-chase | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/combat-dark-fog-chase.png) | ❌ PF11 PF13 PF3(b) PF3(e) [圖](1280x720/combat-dark-fog-chase.png) | 390:scroll_layers=0,L_near_minus_far=35.4；128:scroll_layers=0,L_near_minus_far=58.1 |
| A-C1 | idle－expand | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/idle-expand.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/idle-expand.png) | 390:idle_shrink=none,scroll_layers=0；128:idle_shrink=none,scroll_layers=0 |
| A-C2 | idle－resbar | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/idle-resbar.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/idle-resbar.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-C3 | idle－pity | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](390x844/idle-pity.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/idle-pity.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-C3 | idle－stash80 | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/idle-stash80.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/idle-stash80.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-C4 | idle－loot | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/idle-loot.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/idle-loot.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-C5 | idle－desk | n/a 直立的掛機卡是半版（A-C1）；桌機左下卡只有桌機 | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/idle-desk.png) | 128:scroll_layers=0 |
| A-O1 | death－manual | ❌ PF11 PF13 PF3(e) [圖](390x844/death-manual.png) | ❌ PF11 PF13 PF3(e) PF5 [圖](1280x720/death-manual.png) | 390:scroll_layers=0,sk_block=18352/18352；128:scroll_layers=0,sk_block=10816/10816 |
| A-O2 | death－auto-toast | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/death-auto-toast.png) | n/a 桌機沒有半版面板（sheetOn 只在直立），死亡一律出死亡卡 | 390:scroll_layers=1 |
| A-O3 | death－upgrade | ❌ PF11 PF13 PF3(e) [圖](390x844/death-upgrade.png) | ❌ PF11 PF13 PF3(e) PF5 [圖](1280x720/death-upgrade.png) | 390:scroll_layers=0,sk_block=18352/18352；128:scroll_layers=0,sk_block=10816/10816 |
| A-O4 | ask－home | ❌ PF10 PF11 PF3(e) PF5 [圖](390x844/ask-home.png) | ❌ PF11 PF3(e) [圖](1280x720/ask-home.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-O5 | offline－sum | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/offline-sum.png) | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/offline-sum.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-O5 | offline－chase | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/offline-chase.png) | ❌ PF11 PF3(b) PF3(e) PF5 [圖](1280x720/offline-chase.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-O6 | rotate－prompt | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/rotate-prompt.png) | n/a 桌機沒有觸控方向提示（#rot 只在觸控） | 390:scroll_layers=1 |
| A-M1 | more－home | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/more-home.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/more-home.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| A-M2 | set－main | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/set-main.png) | ❌ PF11 PF3(e) [圖](1280x720/set-main.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| A-M3 | set－acct-guest | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/set-acct-guest.png) | ❌ PF11 PF3(e) [圖](1280x720/set-acct-guest.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| A-M4 | node－list | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/node-list.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/node-list.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| A-M4 | node－stars | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/node-stars.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/node-stars.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| A-M5 | hide－resume | ❌ PF11 PF13 PF3(c) PF3(e) PF8 [圖](390x844/hide-resume.png) | ❌ PF11 PF3(e) PF8 [圖](1280x720/hide-resume.png) | 390:scroll_layers=0,sk_block=2112/22224；128:scroll_layers=0 |
| B-S1 | skill－home | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-home.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-home.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S2 | skill－one | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-one.png) | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-one.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S3 | skill－calc | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-calc.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-calc.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S3 | skill－awake | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-awake.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-awake.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S4 | skill－pick-skills | ❌ PF10 PF11 PF3(e) PF5 [圖](390x844/skill-pick-skills.png) | ❌ PF10 PF11 PF3(e) PF5 [圖](1280x720/skill-pick-skills.png) | 390:scroll_layers=1,rec_same=0；128:scroll_layers=1,rec_same=0 |
| B-S5 | skill－pick-aura | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-pick-aura.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-pick-aura.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S6 | skill－pick-sups | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-pick-sups.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-pick-sups.png) | 390:scroll_layers=2,rec_same=1；128:scroll_layers=1,rec_same=1 |
| B-S7 | skill－sup-open | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/skill-sup-open.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-sup-open.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-S8 | skill－filter-el | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-filter-el.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-filter-el.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-S8 | skill－filter-gen | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-filter-gen.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-filter-gen.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-S8 | skill－filter-all | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-filter-all.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-filter-all.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-S9 | skill－reorder | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/skill-reorder.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-reorder.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-S10 | skill－drill | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/skill-drill.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-drill.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-S11 | skill－desk-home | n/a 桌機版技能面板（直立見 B-S1、B-S6） | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-desk-home.png) | 128:scroll_layers=1 |
| B-S11 | skill－desk-sups | n/a 桌機版技能面板（直立見 B-S1、B-S6） | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/skill-desk-sups.png) | 128:scroll_layers=1 |
| B-E1 | char－beige | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/char-beige.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/char-beige.png) | 390:beige_slots=7,scroll_layers=1；128:beige_slots=7,scroll_layers=1 |
| B-E2 | char－stats | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/char-stats.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/char-stats.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-E3 | char－empty | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/char-empty.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/char-empty.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-E4 | char－slotpick | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/char-slotpick.png) | n/a 桌機點裝備格不出 slotPickHTML（NAV.slot 只在直立）；桌機選 | 390:scroll_layers=1 |
| B-E5 | char－compare | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/char-compare.png) | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/char-compare.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-E6 | bag－all | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/bag-all.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/bag-all.png) | 390:beige_slots=19,scroll_layers=1；128:beige_slots=19,scroll_layers=0 |
| B-E6 | bag－filter | ❌ PF10 PF11 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/bag-filter.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/bag-filter.png) | 390:beige_slots=13,scroll_layers=2；128:beige_slots=13,scroll_layers=1 |
| B-E6 | bag－sort | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/bag-sort.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/bag-sort.png) | 390:beige_slots=19,scroll_layers=1；128:beige_slots=19,scroll_layers=0 |
| B-E7 | bag－grow | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/bag-grow.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/bag-grow.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-E8 | item－tip | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/item-tip.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/item-tip.png) | 390:scroll_layers=2；128:scroll_layers=0 |
| B-E9 | item－salvage | ❌ PF10 PF11 PF12 PF14 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/item-salvage.png) | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/item-salvage.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-E10 | charm－belt | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/charm-belt.png) | ❌ PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/charm-belt.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-E10 | charm－slots | ❌ PF10 PF11 PF12 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/charm-slots.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/charm-slots.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-E11 | cur－page | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/cur-page.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/cur-page.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-F1 | forge－make-empty | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-make-empty.png) | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-make-empty.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F1 | forge－make-item | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-make-item.png) | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-make-item.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F2 | forge－forge | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-forge.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-forge.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F2 | forge－temper | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-temper.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-temper.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F2 | forge－holy | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-holy.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-holy.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F2 | forge－corr | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-corr.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-corr.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F2 | forge－calam | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/forge-calam.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-calam.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F3 | forge－corr-confirm | ❌ PF10 PF11 PF3(a) PF3(b) PF3(c) PF3(e) PF5 [圖](390x844/forge-corr-confirm.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/forge-corr-confirm.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-F4 | reveal－craft | ❌ PF10 PF11 PF12 PF14 PF3(b) PF3(e) PF5 [圖](390x844/reveal-craft.png) | ❌ PF11 PF3(e) PF5 PF8 [圖](1280x720/reveal-craft.png) | 390:scroll_layers=2；128:scroll_layers=1 |
| B-F4 | reveal－identify | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/reveal-identify.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/reveal-identify.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-P1 | camp－sheet | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-sheet.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-sheet.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P2 | camp－full | ❌ PF10 PF11 [圖](390x844/camp-full.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-full.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P3 | camp－card | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-card.png) | ❌ PF1 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-card.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P3 | camp－can-up | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-can-up.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-can-up.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P3 | camp－ms | ❌ PF1 PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-ms.png) | ❌ PF1 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-ms.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P4 | camp－mul | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-mul.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-mul.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-P5 | camp－desk | n/a 桌機營地寬欄（.cwide）；直立見 B-P1、B-P2 | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/camp-desk.png) | 128:scroll_layers=1 |
| B-P6 | hide－scene | ❌ PF11 PF13 PF3(c) PF3(e) PF8 [圖](390x844/hide-scene.png) | ❌ PF11 PF3(e) PF8 [圖](1280x720/hide-scene.png) | 390:scroll_layers=0,sk_block=2112/22224；128:scroll_layers=0 |
| B-P7 | hide－props | ❌ PF11 PF13 PF3(c) PF3(e) PF8 [圖](390x844/hide-props.png) | ❌ PF11 PF3(e) PF8 [圖](1280x720/hide-props.png) | 390:scroll_layers=0,sk_block=2112/22224；128:scroll_layers=0 |
| B-P8 | prac－enter | ❌ PF10 PF11 PF13 PF3(a) PF3(e) [圖](390x844/prac-enter.png) | ❌ PF10 PF11 PF3(a) PF3(e) [圖](1280x720/prac-enter.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0 |
| B-P8 | prac－dps | ❌ PF10 PF11 PF13 PF3(a) PF3(e) [圖](390x844/prac-dps.png) | ❌ PF10 PF11 PF3(a) PF3(e) [圖](1280x720/prac-dps.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0,sk_block=0/18928 |
| B-P8 | prac－real | ❌ PF10 PF11 PF13 PF3(a) PF3(e) [圖](390x844/prac-real.png) | ❌ PF10 PF11 PF3(a) PF3(e) [圖](1280x720/prac-real.png) | 390:scroll_layers=0,sk_block=1936/18352；128:scroll_layers=0,sk_block=0/18928 |
| B-P9 | camp－from-idle | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/camp-from-idle.png) | n/a 桌機掛機卡的「去營地」一樣能點，但這列是直立的流程（F-cp 有兩尺寸點擊紀錄） | 390:scroll_layers=1 |
| B-T1 | tree－far | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-far.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-far.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T1 | tree－near | ❌ PF10 PF11 PF3(e) PF5 [圖](390x844/tree-near.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-near.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T2 | tree－can | ❌ PF10 PF11 PF16 PF3(e) PF5 PF8 [圖](390x844/tree-can.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-can.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T2 | tree－lock | ❌ PF10 PF11 PF16 PF3(e) PF5 PF8 [圖](390x844/tree-lock.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-lock.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T2 | tree－taken | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-taken.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-taken.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T2 | tree－refund | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-refund.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-refund.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T3 | tree－search | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-search.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-search.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T4 | tree－jewel | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-jewel.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-jewel.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-T5 | tree－reset | ❌ PF10 PF11 PF16 PF3(e) PF5 [圖](390x844/tree-reset.png) | ❌ PF11 PF16 PF3(e) [圖](1280x720/tree-reset.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-A1 | asc－pick | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/asc-pick.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/asc-pick.png) | 390:scroll_layers=0；128:scroll_layers=1 |
| B-A1 | asc－path | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/asc-path.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/asc-path.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-A1 | asc－taken | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/asc-taken.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/asc-taken.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-Y1 | chase－list | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/chase-list.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/chase-list.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-Y1 | chase－pick | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/chase-pick.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/chase-pick.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-Y1 | chase－swap | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/chase-swap.png) | ❌ PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/chase-swap.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-Y2 | log－pity | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/log-pity.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/log-pity.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-Y3 | box－fd | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/box-fd.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/box-fd.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-Y3 | box－sin | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/box-sin.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/box-sin.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-Y3 | box－xi | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/box-xi.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/box-xi.png) | 390:scroll_layers=1；128:scroll_layers=0 |
| B-Y3 | box－army | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/box-army.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/box-army.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-Y3 | box－god | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/box-god.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) [圖](1280x720/box-god.png) | 390:scroll_layers=0；128:scroll_layers=0 |
| B-Y4 | term－card | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](390x844/term-card.png) | ❌ PF10 PF11 PF3(a) PF3(b) PF3(e) PF5 [圖](1280x720/term-card.png) | 390:scroll_layers=1；128:scroll_layers=1 |
| B-Y5 | focus－tour | n/a 直立沒有鍵盤焦點巡覽 | ❌ PF11 PF3(b) PF3(e) [圖](1280x720/focus-tour.png) | 128:scroll_layers=0 |

## 給美術總監看（★ 列，PF1／PF2 過就列，不管 UX 預篩）

- A-I1 intro－gate：[390x](390x844/intro-gate.png) · [1280](1280x720/intro-gate.png)
- A-H1 combat－auto：[390x](390x844/combat-auto.png) · [1280](1280x720/combat-auto.png)
- A-H2 combat－manual：[390x](390x844/combat-manual.png) · [1280](1280x720/combat-manual.png)
- A-H5 combat－charge-1：[390x](390x844/combat-charge-1.png) · [1280](1280x720/combat-charge-1.png)
- A-H5 combat－charge-2：[390x](390x844/combat-charge-2.png) · [1280](1280x720/combat-charge-2.png)
- A-H5 combat－charge-3：[390x](390x844/combat-charge-3.png) · [1280](1280x720/combat-charge-3.png)
- A-H10 combat－boss：[390x](390x844/combat-boss.png) · [1280](1280x720/combat-boss.png)
- A-H10 combat－prog：[390x](390x844/combat-prog.png) · [1280](1280x720/combat-prog.png)
- A-H12 combat－dlog-cur：[390x](390x844/combat-dlog-cur.png) · [1280](1280x720/combat-dlog-cur.png)
- A-H12 combat－dlog-mix：[390x](390x844/combat-dlog-mix.png) · [1280](1280x720/combat-dlog-mix.png)
- A-H12 combat－dlog-chase：[390x](390x844/combat-dlog-chase.png) · [1280](1280x720/combat-dlog-chase.png)
- A-H19 nav－badge：[390x](390x844/nav-badge.png) · [1280](1280x720/nav-badge.png)
- A-D1 combat－dark-normal：[390x](390x844/combat-dark-normal.png) · [1280](1280x720/combat-dark-normal.png)
- A-D2 combat－dark-night：[390x](390x844/combat-dark-night.png) · [1280](1280x720/combat-dark-night.png)
- A-D3 combat－dark-fog：[390x](390x844/combat-dark-fog.png) · [1280](1280x720/combat-dark-fog.png)
- A-C1 idle－expand：[390x](390x844/idle-expand.png) · [1280](1280x720/idle-expand.png)
- A-C2 idle－resbar：[390x](390x844/idle-resbar.png) · [1280](1280x720/idle-resbar.png)
- A-C4 idle－loot：[390x](390x844/idle-loot.png) · [1280](1280x720/idle-loot.png)
- A-O1 death－manual：[390x](390x844/death-manual.png) · [1280](1280x720/death-manual.png)
- A-O5 offline－sum：[390x](390x844/offline-sum.png) · [1280](1280x720/offline-sum.png)
- A-M1 more－home：[390x](390x844/more-home.png) · [1280](1280x720/more-home.png)
- A-M4 node－list：[390x](390x844/node-list.png) · [1280](1280x720/node-list.png)
- A-M4 node－stars：[390x](390x844/node-stars.png) · [1280](1280x720/node-stars.png)
- B-S1 skill－home：[390x](390x844/skill-home.png) · [1280](1280x720/skill-home.png)
- B-S2 skill－one：[390x](390x844/skill-one.png) · [1280](1280x720/skill-one.png)
- B-S6 skill－pick-sups：[390x](390x844/skill-pick-sups.png) · [1280](1280x720/skill-pick-sups.png)
- B-S7 skill－sup-open：[390x](390x844/skill-sup-open.png) · [1280](1280x720/skill-sup-open.png)
- B-S11 skill－desk-home：[1280](1280x720/skill-desk-home.png)
- B-S11 skill－desk-sups：[1280](1280x720/skill-desk-sups.png)
- B-E1 char－beige：[390x](390x844/char-beige.png) · [1280](1280x720/char-beige.png)
- B-E2 char－stats：[390x](390x844/char-stats.png) · [1280](1280x720/char-stats.png)
- B-E5 char－compare：[390x](390x844/char-compare.png) · [1280](1280x720/char-compare.png)
- B-F2 forge－corr：[390x](390x844/forge-corr.png) · [1280](1280x720/forge-corr.png)
- B-F4 reveal－craft：[390x](390x844/reveal-craft.png) · [1280](1280x720/reveal-craft.png)
- B-F4 reveal－identify：[390x](390x844/reveal-identify.png) · [1280](1280x720/reveal-identify.png)
- B-P1 camp－sheet：[390x](390x844/camp-sheet.png) · [1280](1280x720/camp-sheet.png)
- B-P2 camp－full：[390x](390x844/camp-full.png) · [1280](1280x720/camp-full.png)
- B-P5 camp－desk：[1280](1280x720/camp-desk.png)
- B-P6 hide－scene：[390x](390x844/hide-scene.png) · [1280](1280x720/hide-scene.png)
- B-P8 prac－enter：[390x](390x844/prac-enter.png) · [1280](1280x720/prac-enter.png)
- B-P8 prac－dps：[390x](390x844/prac-dps.png) · [1280](1280x720/prac-dps.png)
- B-P8 prac－real：[390x](390x844/prac-real.png) · [1280](1280x720/prac-real.png)
- B-T1 tree－far：[390x](390x844/tree-far.png) · [1280](1280x720/tree-far.png)
- B-T1 tree－near：[390x](390x844/tree-near.png) · [1280](1280x720/tree-near.png)
- B-T2 tree－can：[390x](390x844/tree-can.png) · [1280](1280x720/tree-can.png)
- B-T2 tree－lock：[390x](390x844/tree-lock.png) · [1280](1280x720/tree-lock.png)
- B-T2 tree－taken：[390x](390x844/tree-taken.png) · [1280](1280x720/tree-taken.png)
- B-T2 tree－refund：[390x](390x844/tree-refund.png) · [1280](1280x720/tree-refund.png)
- B-A1 asc－pick：[390x](390x844/asc-pick.png) · [1280](1280x720/asc-pick.png)
- B-A1 asc－path：[390x](390x844/asc-path.png) · [1280](1280x720/asc-path.png)
- B-A1 asc－taken：[390x](390x844/asc-taken.png) · [1280](1280x720/asc-taken.png)
- B-Y1 chase－list：[390x](390x844/chase-list.png) · [1280](1280x720/chase-list.png)
- B-Y1 chase－pick：[390x](390x844/chase-pick.png) · [1280](1280x720/chase-pick.png)
- B-Y1 chase－swap：[390x](390x844/chase-swap.png) · [1280](1280x720/chase-swap.png)

## 黑暗層決策 A-D1～A-D3（Z-8，給 mumi 決定 3a §6）

現行繪製順序：`drawBeams`、`drawBars`、`drawNums` 在暗層之後（選項 2，永遠全亮）。L* 欄是「字形／條最亮 15% 的平均 L* ／整框平均 L*」。驗證值：天黑 `G.night>G.t`、大霧 `G.fog>G.t` 且 `G.night≤G.t`。

| 列 | 尺寸 | 驗證 G.t／G.night／G.fog | 光柱 | 怪物生命條 | 近距數字 | 遠距數字 | 近−遠 | 腳下地面 | 特寫 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-D1 dark-normal | 390x844 | 2.57／0／0 | 59.7/13.5 | 84.7/27.3 | 53.8/12.5 | 21.1/8.7 | 32.7 | 50.8/15.6 | [beam](390x844/crops/combat-dark-normal-beam-x4.png) [bar](390x844/crops/combat-dark-normal-bar-x4.png) [num-near](390x844/crops/combat-dark-normal-num-near-x4.png) [num-far](390x844/crops/combat-dark-normal-num-far-x4.png) |
| A-D1 dark-normal | 1280x720 | 2.57／0／0 | 83.4/46.9 | 98.0/57.0 | 77.6/28.8 | 20.4/9.4 | 57.2 | 80.9/41.0 | [beam](1280x720/crops/combat-dark-normal-beam-x4.png) [bar](1280x720/crops/combat-dark-normal-bar-x4.png) [num-near](1280x720/crops/combat-dark-normal-num-near-x4.png) [num-far](1280x720/crops/combat-dark-normal-num-far-x4.png) |
| A-D2 dark-night | 390x844 | 2.57／32.5／0 | 59.7/13.4 | 86.9/29.1 | 55.0/12.7 | 14.7/6.8 | 40.3 | 50.9/15.6 | [beam](390x844/crops/combat-dark-night-beam-x4.png) [bar](390x844/crops/combat-dark-night-bar-x4.png) [num-near](390x844/crops/combat-dark-night-num-near-x4.png) [num-far](390x844/crops/combat-dark-night-num-far-x4.png) |
| A-D2 dark-night | 1280x720 | 2.57／32.5／0 | 83.0/47.5 | 94.9/54.5 | 78.6/31.2 | 18.3/5.3 | 60.3 | 79.8/40.4 | [beam](1280x720/crops/combat-dark-night-beam-x4.png) [bar](1280x720/crops/combat-dark-night-bar-x4.png) [num-near](1280x720/crops/combat-dark-night-num-near-x4.png) [num-far](1280x720/crops/combat-dark-night-num-far-x4.png) |
| A-D3 dark-fog | 390x844 | 2.57／0／32.5 | 59.7/13.5 | 86.9/29.1 | 54.7/12.7 | 19.3/8.4 | 35.4 | 51.0/15.6 | [beam](390x844/crops/combat-dark-fog-beam-x4.png) [bar](390x844/crops/combat-dark-fog-bar-x4.png) [num-near](390x844/crops/combat-dark-fog-num-near-x4.png) [num-far](390x844/crops/combat-dark-fog-num-far-x4.png) |
| A-D3 dark-fog | 1280x720 | 2.57／0／32.5 | 83.2/47.5 | 96.2/55.6 | 78.7/31.2 | 14.0/8.5 | 64.7 | 80.3/40.7 | [beam](1280x720/crops/combat-dark-fog-beam-x4.png) [bar](1280x720/crops/combat-dark-fog-bar-x4.png) [num-near](1280x720/crops/combat-dark-fog-num-near-x4.png) [num-far](1280x720/crops/combat-dark-fog-num-far-x4.png) |
| A-D4 dark-night-unique | 390x844 | 2.57／32.5／0 | 62.4/15.9 | 86.9/29.1 | 55.0/12.7 | 14.7/6.8 | 40.3 | 50.9/15.6 | [beam](390x844/crops/combat-dark-night-unique-beam-x4.png) [bar](390x844/crops/combat-dark-night-unique-bar-x4.png) [num-near](390x844/crops/combat-dark-night-unique-num-near-x4.png) [num-far](390x844/crops/combat-dark-night-unique-num-far-x4.png) |
| A-D4 dark-night-unique | 1280x720 | 2.57／32.5／0 | 82.8/51.4 | 94.9/54.5 | 79.7/34.3 | 18.3/5.3 | 61.4 | 79.9/40.8 | [beam](1280x720/crops/combat-dark-night-unique-beam-x4.png) [bar](1280x720/crops/combat-dark-night-unique-bar-x4.png) [num-near](1280x720/crops/combat-dark-night-unique-num-near-x4.png) [num-far](1280x720/crops/combat-dark-night-unique-num-far-x4.png) |
| A-D4 dark-fog-chase | 390x844 | 2.57／0／32.5 | 59.8/22.9 | 86.9/29.1 | 54.7/12.7 | 19.3/8.4 | 35.4 | 60.4/17.0 | [beam](390x844/crops/combat-dark-fog-chase-beam-x4.png) [bar](390x844/crops/combat-dark-fog-chase-bar-x4.png) [num-near](390x844/crops/combat-dark-fog-chase-num-near-x4.png) [num-far](390x844/crops/combat-dark-fog-chase-num-far-x4.png) |
| A-D4 dark-fog-chase | 1280x720 | 2.57／0／32.5 | 70.7/45.1 | 96.2/63.6 | 72.1/24.1 | 14.0/8.5 | 58.1 | 79.7/39.3 | [beam](1280x720/crops/combat-dark-fog-chase-beam-x4.png) [bar](1280x720/crops/combat-dark-fog-chase-bar-x4.png) [num-near](1280x720/crops/combat-dark-fog-chase-num-near-x4.png) [num-far](1280x720/crops/combat-dark-fog-chase-num-far-x4.png) |

## 流程點擊紀錄


### 390x844

| 流程 | 尺寸 | 步驟（動作 → 畫面） | 點擊或按鍵次數 | 層數或備註 |
| --- | --- | --- | --- | --- |
| F-sk | 390x844 | 點「技能」分頁 → 技能總覽（半版／右欄） → 點震地戰吼 → 這一招（孔列） → 第 3 孔：無此控制（祭壇 Lv6 只開 2 孔，第 3 孔不出現）→ 改點第 2 孔 → 點第 2 孔（空孔） → 輔助清單（預設篩選「推薦」） → 點「附加閃電」 → 展開（I／II、說明、底部「放上」） → 點「放上附加閃電」 → 回到這一招，孔裡是附加閃電 → 點有附加閃電的那一孔 → 這一孔的詳細 → 點「卸下」 → 孔空了 | 7 | 技能›招›孔›清單 4 層；結束時孔＝[,,]；影片 8.9 秒加速 1.5× 到 6 秒 · [影片](390x844/flow-sk.mp4) |
| F-fg | 390x844 | 點「鍛造」分頁 → 鍛造 › 打造（預設） → 選部位「戒指」 → 打造設定 → 選「1 件」 → 費用更新 → 點「打造」 → 翻牌（#preveal） → 翻牌出現（1 件） | 4 | 打造 3 層（分頁 › 打造 › 翻牌）；填詞走鍛造台另一條；影片 6.3 秒加速 1.1× 到 6 秒 · [影片](390x844/flow-fg.mp4) |
| F-eq | 390x844 | 點「戰利品」分頁 → 戰利品格子 → 點第一件（稀有戒指） → 對比卡（身上／這件，DPS／生命差） → 點「換上」 → 換上，舊的進倉庫 | 3 | 換上了=true · [影片](390x844/flow-eq.mp4) |
| F-cp | 390x844 | 掛機卡點「去營地」 → 營地（直立半版／桌機右欄） → 手指往上滑 → 半版內捲動（可捲 1626px） → 上拉把手 → 全版 → 點一座設施的卡 → 展開（升級鈕、費用） | 4 | 捲動層 1；影片 7.1 秒加速 1.2× 到 6 秒 · [影片](390x844/flow-cp.mp4) |
| F-tr | 390x844 | 點「天賦」分頁 → 天賦樹（蓋滿） → 點一個亮著可點的點 → 下方卡片（說明＋點亮） → 點「點亮」 → 點亮、剩餘點數更新 | 3 | 剩餘點數 30 → 29 · [影片](390x844/flow-tr.mp4) |
| F-id | 390x844 | 觀察掛機卡 1.5 秒；卡上的鈕：去營地 → 收合／觀戰：無此控制（idle_shrink=none） | 0 | 技能鍵被擋 0/0 px²（直立自動：技能列在掛機卡下面） · [影片](390x844/flow-id.mp4) |
| F-cb | 390x844 | 按住穿甲彈 1.3 秒→ 彈夾 5 發、裝填中=false；技能格數字「」 → 按住蓄力重砸 1.4 秒（蓄滿 3 段）→ 放開出手；技能格段數「」 | 2 | 彈夾剩餘／裝填、蓄力段數在技能格上都沒有數字（hidden=ammo、charge）；蓄力只有腳下條。另：換招後舊招的冷卻留在格子上（P.cds.s1），工具先清 0；影片 6.5 秒加速 1.1× 到 6 秒 · [影片](390x844/flow-cb.mp4) |
| F-dk | 390x844 | 正常：night=0 fog=0 光柱 1、血條 11、數字 5 → 天黑 DBG.night(30)：night=1 fog=0 光柱 2、血條 6、數字 5 → 大霧 DBG.fog(30)：night=0 fog=1 光柱 3、血條 5、數字 5 | 0 | 掛鉤切換，非玩家操作（0 次點擊）；連拍見 A-D2／A-D3；影片 8.9 秒加速 1.5× 到 6 秒 · [影片](390x844/flow-dk.mp4) |

### 1280x720

| 流程 | 尺寸 | 步驟（動作 → 畫面） | 點擊或按鍵次數 | 層數或備註 |
| --- | --- | --- | --- | --- |
| F-sk | 1280x720 | 點「技能」分頁 → 技能總覽（半版／右欄） → 點震地戰吼 → 這一招（孔列） → 第 3 孔：無此控制（祭壇 Lv6 只開 2 孔，第 3 孔不出現）→ 改點第 2 孔 → 點第 2 孔（空孔） → 輔助清單（預設篩選「推薦」） → 點「附加閃電」 → 展開（I／II、說明、底部「放上」） → 點「放上附加閃電」 → 回到這一招，孔裡是附加閃電 → 點有附加閃電的那一孔 → 這一孔的詳細 → 點「卸下」 → 孔空了 | 7 | 技能›招›孔›清單 4 層；結束時孔＝[,,]；影片 6.1 秒加速 1.0× 到 6 秒 · [影片](1280x720/flow-sk.mp4) |
| F-fg | 1280x720 | 點「鍛造」分頁 → 鍛造 › 打造（預設） → 選部位「戒指」 → 打造設定 → 選「1 件」 → 費用更新 → 點「打造」 → 翻牌（#preveal） → 翻牌出現（1 件） | 4 | 打造 3 層（分頁 › 打造 › 翻牌）；填詞走鍛造台另一條；影片 7.4 秒加速 1.2× 到 6 秒 · [影片](1280x720/flow-fg.mp4) |
| F-eq | 1280x720 | 點「戰利品」分頁 → 戰利品格子 → 滑鼠停在第一件（稀有戒指）→ 對比說明框（#tip） → 點一下 → 直接換上 | 2 | 桌機：滑鼠停 300 ms 出對比說明框，點一下＝直接換上（quickMove，沒有確認）；換上了=true · [影片](1280x720/flow-eq.mp4) |
| F-cp | 1280x720 | 掛機卡點「去營地」 → 營地（直立半版／桌機右欄） → 滾輪往下 → 半版內捲動（可捲 1593px） → 全版：桌機沒有把手（右欄固定） → 點一座設施的卡 → 展開（升級鈕、費用） | 3 | 捲動層 1 · [影片](1280x720/flow-cp.mp4) |
| F-tr | 1280x720 | 點「天賦」分頁 → 天賦樹（蓋滿） → 點一個亮著可點的點 → 直接點亮（桌機點一下就點） | 2 | 剩餘點數 30 → 29 · [影片](1280x720/flow-tr.mp4) |
| F-id | 1280x720 | 觀察掛機卡 1.5 秒；卡上的鈕：去營地 → 收合／觀戰：無此控制（idle_shrink=none） | 0 | 技能鍵被擋 0/0 px² · [影片](1280x720/flow-id.mp4) |
| F-cb | 1280x720 | 按住穿甲彈 1.3 秒（0.7 秒時 彈夾 0 發）→ 彈夾 0 發、裝填中=true；技能格數字「」 → 按住蓄力重砸 1.4 秒（蓄滿 3 段）→ 放開出手；技能格段數「」 | 2 | 彈夾剩餘／裝填、蓄力段數在技能格上都沒有數字（hidden=ammo、charge）；蓄力只有腳下條。另：換招後舊招的冷卻留在格子上（P.cds.s1），工具先清 0；影片 6.2 秒加速 1.0× 到 6 秒 · [影片](1280x720/flow-cb.mp4) |
| F-dk | 1280x720 | 正常：night=0 fog=0 光柱 1、血條 10、數字 5 → 天黑 DBG.night(30)：night=1 fog=0 光柱 2、血條 7、數字 5 → 大霧 DBG.fog(30)：night=0 fog=1 光柱 3、血條 8、數字 5 | 0 | 掛鉤切換，非玩家操作（0 次點擊）；連拍見 A-D2／A-D3 · [影片](1280x720/flow-dk.mp4) |

### 375x667

| 流程 | 尺寸 | 步驟（動作 → 畫面） | 點擊或按鍵次數 | 層數或備註 |
| --- | --- | --- | --- | --- |
| F-sk | 375x667 | 點「技能」分頁 → 技能總覽（半版／右欄） → 點震地戰吼 → 這一招（孔列） → 第 3 孔：無此控制（祭壇 Lv6 只開 2 孔，第 3 孔不出現）→ 改點第 2 孔 → 點第 2 孔（空孔） → 輔助清單（預設篩選「推薦」） → 點「附加閃電」 → 展開（I／II、說明、底部「放上」） → 點「放上附加閃電」 → 回到這一招，孔裡是附加閃電 → 點有附加閃電的那一孔 → 這一孔的詳細 → 點「卸下」 → 孔空了 | 7 | 技能›招›孔›清單 4 層；結束時孔＝[,,]；影片 9.4 秒加速 1.6× 到 6 秒 · [影片](375x667/flow-sk.mp4) |
| F-cp | 375x667 | 掛機卡點「去營地」 → 營地（直立半版／桌機右欄） → 手指往上滑 → 半版內捲動（可捲 1735px） → 上拉把手 → 全版 → 點一座設施的卡 → 展開（升級鈕、費用） | 4 | 捲動層 1 · [影片](375x667/flow-cp.mp4) |
| F-cb | 375x667 | 按住穿甲彈 1.3 秒→ 彈夾 5 發、裝填中=false；技能格數字「」 → 按住蓄力重砸 1.4 秒（蓄滿 3 段）→ 放開出手；技能格段數「」 | 2 | 彈夾剩餘／裝填、蓄力段數在技能格上都沒有數字（hidden=ammo、charge）；蓄力只有腳下條。另：換招後舊招的冷卻留在格子上（P.cds.s1），工具先清 0；影片 6.6 秒加速 1.1× 到 6 秒 · [影片](375x667/flow-cb.mp4) |

## 只有數字（Z-1～Z-10）

**Z-1 色碼字面值**（可見元件 style 屬性裡的色碼／rgb()；只記選擇器）：`#ptree span.lg`（B-T1,B-T2,B-T3,B-T4,B-T5）；`#tcard button.btn.pri`（B-T2）；`#tg g.nd.can`（B-T1,B-T2,B-T4,B-T5）；`#tg g.nd.off`（B-T1,B-T2,B-T3,B-T4,B-T5）；`#tg g.nd.on`（B-T1,B-T2,B-T4,B-T5）。另：天賦樹圖例 `.lg` 用 `--c` 自訂屬性帶色值（tree.js），技能、王印等 canvas 色碼不在 DOM，不在此列。

**Z-2 390x844**：#dlog 混稀有度 3 行、字色 3 種、有圖示=0（只放 3 行）；只有通貨時字色 1 種。
**Z-2 1280x720**：#dlog 混稀有度 3 行、字色 3 種、有圖示=0（只放 3 行）；只有通貨時字色 1 種。

**Z-3 390x844**（PF15，技能格上的數字）：ammo-mid:ammo、ammo-last:ammo、ammo-reload:ammo、gren-full:gren、gren-cd:gren、charge-1:charge(技能格無段數)、charge-2:charge(技能格無段數)、charge-3:charge(技能格無段數)
**Z-3 1280x720**（PF15，技能格上的數字）：ammo-mid:ammo、ammo-last:ammo、ammo-reload:ammo、gren-full:gren、gren-cd:gren、charge-1:charge(技能格無段數)、charge-2:charge(技能格無段數)、charge-3:charge(技能格無段數)

**Z-4 390x844**：掛機卡 A-C1 技能鍵被擋 量不到（自動模式不畫技能列）、手動 A-H2 技能鍵被擋 1936/18352；營地半版 B-P1 scroll_layers=1、資源列高 96px；掛機卡資源列 A-C2 截斷=none。
**Z-4 1280x720**：掛機卡 A-C1 技能鍵被擋 量不到（自動模式不畫技能列）、手動 A-H2 技能鍵被擋 0/18928；營地半版 B-P1 scroll_layers=1、資源列高 96px；掛機卡資源列 A-C2 截斷=none。

**Z-5**：見上「流程點擊紀錄」。

**Z-6 390x844**：裝備格米色方塊 beige_slots=7（eq:helm|eq:chest|eq:gloves|eq:boots|eq:belt|eq:off|eq:amulet）；有圖的 img 1 個；不符合需求的格 ring3|off|helm|chest|gloves|boots。
**Z-6 1280x720**：裝備格米色方塊 beige_slots=7（eq:helm|eq:chest|eq:gloves|eq:boots|eq:belt|eq:off|eq:amulet）；有圖的 img 1 個；不符合需求的格 ring3|off|helm|chest|gloves|boots。

**Z-7 390x844**：B-S6 推薦列 33 列、推薦差同一句=1（["＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化"]）、說明被截斷 24 列、篩選列可橫捲=1。
**Z-7 1280x720**：B-S6 推薦列 33 列、推薦差同一句=1（["＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化","＝ 沒有變化"]）、說明被截斷 14 列、篩選列可橫捲=0。

**Z-8**：見上「黑暗層決策」表。

**Z-9 Esc 關閉順序**（照 `js/hud.js` 鍵盤處理讀出，未另錄）：確認卡（`G.ask`）→ 天賦樹 → 面板（`closePanels`）→ 都沒有時打開設定；設定頁快捷鍵表寫「Esc：取消確認、關閉面板；都沒有時打開設定」，一致。死亡卡不吃 Esc。

**Z-10 375×667 第二輪**（標 S 的列）：35 筆：過 0、沒過 35、卡住 0、n/a 0。

| ID | 狀態 | 結果 | 熱區最小 | 字級最小 | 沒過 |
| --- | --- | --- | --- | --- | --- |
| A-I1 | gate | ❌ | 66x44 #intro button.btn.ivskip | 12 | PF3(e) 正文對比不在 4.5–12：3 筆（5.32–16.84）；PF11 正文<14 6 筆 |
| A-I2 | crack | ❌ | 66x44 #intro button.btn.ivskip | 12 | PF3(e) 正文對比不在 4.5–12：1 筆（6.84–12.4）；PF11 正文<14 6 筆 |
| A-I2 | you | ❌ | 66x44 #intro button.btn.ivskip | 12 | PF3(e) 正文對比不在 4.5–12：2 筆（6.84–13.21）；PF11 正文<14 6 筆 |
| A-H1 | auto | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -6.2<8；PF3(b) 面板÷場景 0.53<1.4；PF3(c) 飽和 11.4%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12. |
| A-H2 | manual | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：2 筆（5.98–12.93）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主 4 |
| A-H3 | ammo-last | ❌ | 32x32 #mech button.stc.bad | 10 | PF1 與同列狀態 ammo-mid,ammo-reload 同一張圖（畫面上分不出這幾個狀態）；PF3(e) 正文對比不在 4.5–12：1 筆（5.98–12.45）；PF10 熱區不足 2 個（#mech button.stc.bad |
| A-H3 | ammo-mid | ❌ | 32x32 #mech button.stc.bad | 10 | PF1 與同列狀態 ammo-last,ammo-reload 同一張圖（畫面上分不出這幾個狀態）；PF3(e) 正文對比不在 4.5–12：1 筆（5.98–12.45）；PF10 熱區不足 2 個（#mech button.stc.ba |
| A-H3 | ammo-reload | ❌ | 32x32 #mech button.stc.bad | 10 | PF1 與同列狀態 ammo-last,ammo-mid 同一張圖（畫面上分不出這幾個狀態）；PF3(e) 正文對比不在 4.5–12：1 筆（5.98–12.45）；PF10 熱區不足 2 個（#mech button.stc.bad 3 |
| A-H5 | charge-1 | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：2 筆（5.98–12.76）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主 4 |
| A-H5 | charge-2 | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：2 筆（5.98–12.67）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主 4 |
| A-H5 | charge-3 | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：2 筆（5.98–12.67）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主 4 |
| A-H8 | hp-low | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -3.1<8；PF3(b) 面板÷場景 0.7<1.4；PF3(c) 飽和 11.5%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12.3 |
| A-H12 | dlog-chase | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -3.6<8；PF3(b) 面板÷場景 0.59<1.4；PF3(c) 飽和 11.5%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：2 筆（3.24–12. |
| A-H12 | dlog-cur | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -3.5<8；PF3(b) 面板÷場景 0.59<1.4；PF3(c) 飽和 11.5%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：2 筆（3.24–12. |
| A-H12 | dlog-mix | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 3.5<8；PF3(b) 面板÷場景 1.04<1.4；PF3(c) 飽和 11.6%>10%（scene|top|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83– |
| A-H23 | safe-34 | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -4.2<8；PF3(b) 面板÷場景 0.58<1.4；PF3(c) 飽和 11.1%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12. |
| A-D1 | dark-normal | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 1.1<8；PF3(b) 面板÷場景 0.78<1.4；PF3(c) 飽和 11.2%>10%（bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：2 筆（2.0–12.19）；PF10 |
| A-D2 | dark-night | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 3.0<8；PF3(b) 面板÷場景 0.83<1.4；PF3(c) 飽和 10.8%>10%（bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：3 筆（2.45–12.34）；PF1 |
| A-D3 | dark-fog | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 1.7<8；PF3(b) 面板÷場景 0.8<1.4；PF3(c) 飽和 11.0%>10%（bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：2 筆（2.21–12.16）；PF10 |
| A-C1 | expand | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -6.2<8；PF3(b) 面板÷場景 0.53<1.4；PF3(c) 飽和 11.4%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12. |
| A-C2 | resbar | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -6.2<8；PF3(b) 面板÷場景 0.53<1.4；PF3(c) 飽和 11.4%>10%（scene|bottom|bars|pidle）；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12. |
| A-M4 | list | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -3.8<8；PF3(b) 面板÷場景 0.59<1.4；PF3(e) 正文對比不在 4.5–12：4 筆（1.11–12.45）；PF10 熱區不足 3 個（#mech button.stc.bad 32x32、 |
| A-M4 | stars | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 1.8<8；PF3(b) 面板÷場景 0.82<1.4；PF3(e) 正文對比不在 4.5–12：5 筆（1.03–12.48）；PF10 熱區不足 3 個（#mech button.stc.bad 32x32、# |
| B-S1 | home | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -6.1<8；PF3(b) 面板÷場景 0.56<1.4；PF3(e) 正文對比不在 4.5–12：2 筆（1.19–12.38）；PF10 熱區不足 3 個（#mech button.stc.bad 32x32、 |
| B-S2 | one | ❌ | 28x22 #pskill button.term.kw | 10 | PF3(a) 面板−場景 -6.8<8；PF3(b) 面板÷場景 0.54<1.4；PF3(e) 正文對比不在 4.5–12：5 筆（2.21–12.38）；PF10 熱區不足 4 個（#mech button.stc.bad 32x32、 |
| B-S6 | pick-sups | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -0.6<8；PF3(b) 面板÷場景 0.85<1.4；PF3(e) 正文對比不在 4.5–12：3 筆（4.43–12.15）；PF10 熱區不足 3 個（#mech button.stc.bad 32x32、 |
| B-S7 | sup-open | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 1.7<8；PF3(b) 面板÷場景 0.94<1.4；PF3(c) 飽和 12.6%>10%（scene|bottom|bars|panel）；PF3(e) 正文對比不在 4.5–12：5 筆（2.41–12.1 |
| B-E1 | beige | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -9.1<8；PF3(b) 面板÷場景 0.56<1.4；PF3(e) 正文對比不在 4.5–12：12 筆（1.04–14.61）；PF3(e) 介面字色 9 種>5；PF10 熱區不足 4 個（#mech bu |
| B-P1 | sheet | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(a) 面板−場景 -6.9<8；PF3(b) 面板÷場景 0.58<1.4；PF3(e) 正文對比不在 4.5–12：1 筆（4.83–12.38）；PF10 熱區不足 3 個（#mech button.stc.bad 32x32、 |
| B-P2 | full | ❌ | 44x44 #pcraft button.x[close] | 12 | PF3(e) 正文對比不在 4.5–12：1 筆（2.08–11.97）；PF10 熱區不足 1 個（#phand 375x24）門檻 直立 44×44／主 48；PF11 正文<14 15 筆 |
| B-P8 | dps | ❌ | 36x44 #prac button.btn.mini | 10 | PF3(a) 關鍵−所在層 35.7<40；PF3(e) 正文對比不在 4.5–12：3 筆（5.32–12.76）；PF10 熱區不足 2 個（#prac button.btn.mini 36x44、#prac button.btn.mi |
| B-P8 | enter | ❌ | 36x44 #prac button.btn.mini | 10 | PF3(a) 關鍵−所在層 36.5<40；PF3(e) 正文對比不在 4.5–12：3 筆（5.53–12.68）；PF10 熱區不足 2 個（#prac button.btn.mini 36x44、#prac button.btn.mi |
| B-P8 | real | ❌ | 36x44 #prac button.btn.mini | 10 | PF3(a) 關鍵−所在層 35.8<40；PF3(e) 正文對比不在 4.5–12：3 筆（5.34–12.76）；PF10 熱區不足 2 個（#prac button.btn.mini 36x44、#prac button.btn.mi |
| B-T1 | far | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：11 筆（5.98–14.06）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主  |
| B-T1 | near | ❌ | 32x32 #mech button.stc.bad | 10 | PF3(e) 正文對比不在 4.5–12：2 筆（5.98–13.53）；PF10 熱區不足 2 個（#mech button.stc.bad 32x32、#mech button.stc.bad 32x32）門檻 直立 44×44／主 4 |

**新舊對照 (g)**：左邊 main 與本輪同一個 commit，無舊圖、略（清單 §14）。mumi 的 fb 1.jpg–4.jpg 不在雲端（`/workspace/fb` 不存在），沒拼。

**沒錄的動態**（清單列的「動態」欄，必錄以外）：開場全程、自動切手動、橫幅、升級膠囊、掛機卡王倒下、離線滾數字、分頁 hover／按住、倉庫捲動、營地全版、試招場走進石圈、翻牌。必錄 8 條主流程（兩尺寸）都有。


## 穩定性（★ 列重跑一次逐像素比對）

比了 129 張：相同 126、不穩定 3。不穩定：390x844/combat-charge-2.png、1280x720/node-list.png、390x844/skill-sup-open.png

重跑方式：同一工具、同一網址參數（?freeze=1 虛擬時鐘、?seed=42，AUDIT 前照種子重設亂數）另開一個輸出資料夾，比 PNG 的 MD5。不穩定的 3 張原因這輪沒查。


## 卡住（狀態做不出來或驗狀態不成立）

- 無

## n/a（只有某一種尺寸有的畫面）

- A-C5 390x844 idle－desk：直立的掛機卡是半版（A-C1）；桌機左下卡只有桌機
- A-H18 390x844 mode－auto：直立沒有 .modesw（donly），自動／手動在設定裡切
- A-H18 390x844 mode－manual：直立沒有 .modesw（donly），自動／手動在設定裡切
- A-H20 1280x720 nav－press：桌機沒有觸控按住
- A-H20 390x844 nav－hover：直立沒有滑鼠停留
- A-O2 1280x720 death－auto-toast：桌機沒有半版面板（sheetOn 只在直立），死亡一律出死亡卡
- A-O6 1280x720 rotate－prompt：桌機沒有觸控方向提示（#rot 只在觸控）
- B-E4 1280x720 char－slotpick：桌機點裝備格不出 slotPickHTML（NAV.slot 只在直立）；桌機選裝備走 B-E5 對比
- B-P5 390x844 camp－desk：桌機營地寬欄（.cwide）；直立見 B-P1、B-P2
- B-P9 1280x720 camp－from-idle：桌機掛機卡的「去營地」一樣能點，但這列是直立的流程（F-cp 有兩尺寸點擊紀錄）
- B-S11 390x844 skill－desk-home：桌機版技能面板（直立見 B-S1、B-S6）
- B-S11 390x844 skill－desk-sups：桌機版技能面板（直立見 B-S1、B-S6）
- B-Y5 390x844 focus－tour：直立沒有鍵盤焦點巡覽

## 狀態做法跟清單不同的地方（照實記）

- A-C3 1280x720 stash80：note="倉庫 82% 滿・滿了打造出來的直接分解"
- A-C3 390x844 stash80：note="倉庫 82% 滿・滿了打造出來的直接分解"
- A-H5 1280x720 charge-1：hold=K.q
- A-H5 1280x720 charge-2：hold=K.q
- A-H5 1280x720 charge-3：hold=K.q
- A-H5 375x667 charge-1：hold=K.q
- A-H5 375x667 charge-2：hold=K.q
- A-H5 375x667 charge-3：hold=K.q
- A-H5 390x844 charge-1：hold=K.q
- A-H5 390x844 charge-2：hold=K.q
- A-H5 390x844 charge-3：hold=K.q
- A-I3 1280x720 lid：scene_after_skip=map
- A-I3 1280x720 skip：scene_after_skip=map
- A-I3 390x844 lid：scene_after_skip=map
- A-I3 390x844 skip：scene_after_skip=map
- B-A1 1280x720 path：altar=6→7
- B-A1 1280x720 pick：altar=6→7
- B-A1 1280x720 taken：altar=6→7
- B-A1 390x844 path：altar=6→7
- B-A1 390x844 pick：altar=6→7
- B-A1 390x844 taken：altar=6→7
- B-F2 1280x720 calam：forge_lv=10→20
- B-F2 1280x720 calam：watch_lv=8→22
- B-F2 1280x720 corr：forge_lv=10→15
- B-F2 1280x720 holy：forge_lv=10→12
- B-F2 390x844 calam：forge_lv=10→20
- B-F2 390x844 calam：watch_lv=8→22
- B-F2 390x844 corr：forge_lv=10→15
- B-F2 390x844 holy：forge_lv=10→12
- B-F4 1280x720 identify：note=遊戲現行沒有未鑑定（uid 一律沒有），用 revealOpen 一般模式代替
- B-F4 390x844 identify：note=遊戲現行沒有未鑑定（uid 一律沒有），用 revealOpen 一般模式代替
- B-S10 1280x720 drill：note=midgame 祭壇6只有2孔，本列把祭壇設8
- B-S10 390x844 drill：note=midgame 祭壇6只有2孔，本列把祭壇設8
