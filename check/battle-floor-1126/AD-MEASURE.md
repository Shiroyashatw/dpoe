# floor-check s5201

## 1. Size, colors, tokens
- size: 32×32 RGB
- unique colors: 2
  - #46413c ×929 (90.7%)  L*=27.9 C*=4.0 h=74  token=['scene-X-ground']
  - #33302b ×95 (9.3%)  L*=20.0 C*=3.7 h=86  token=['scene-X-mid']
- all pixels in --scene-X-ground / -mid / -light: True
- --scene-X-light #615b56 present: False
- grout vs ground: ΔE=5.80  WCAG=1.30  ΔL*=7.9
- if light were used, 淺磚÷地面 WCAG=1.51 (cap ≤2.5)

## 2. Seams (opposite-edge mean |Δ|, 0 = wrap-perfect)
- left-right mean=0.000  max-channel-sum=0
- top-bottom mean=0.000  max-channel-sum=0

## 3. Game-scale tiling
- 1280×720 DPR1: M2-33-addendum §3.3 ZOOM=1.333 (aligned), 1.5×ZOOM=2 device px/texel, tile=64 CSS px. Current main.js still hardcodes ZOOM=1.35 → 64.8 px (not used here).
- Battle region (battle-hud v1.3 gen C14/D14): y=40..720 → 1280×680. Tiles: 20 × 10.625.
- 390×844: main.js ZOOM=clamp(390/480)=0.8125, 1.5×ZOOM=1.21875, tile=39 CSS px.
- Battle region (T09, HUD shift): y=91..712 → 390×621. Tiles: 10 × 15.92.
- Game rule M2-33-3a §3.2: no rotate, no flip (light from top-left). Mockup randomly flipped tiles.

## 4. Hazard contrast (M2-36 tokens, CIEDE2000, Machado 2009 severity 1.0)
Thresholds (M2-36-palette-tokens.md 量測門檻): 預警填色對地面 ΔE≥15; 危急紅邊對傳奇或地面 ΔE≥15（色盲≥10）; 框／腳圈／敵人外框對底 WCAG≥3; 地形發光對敵方色 ΔE≥15（色盲≥8）.
Art-director standing check vs hazard: ΔE≥15, CVD≥8.
  (預警 55% composite on ground = #ac3f61)
- 預警填色 55% --enemy-tel (#ac3f61) on #46413c: ΔE=27.92  CVD prot=11.87 deut=16.16 trit=26.41 (worst Prot 11.87)  WCAG=1.75  L* 43.0 vs 27.9 (ΔL*=15.2)  → PASS
- 預警線 --enemy-tel 不透明 on #46413c: ΔE=40.24  CVD prot=20.55 deut=35.32 trit=35.94 (worst Prot 20.55)  WCAG=2.99  L* 58.2 vs 27.9 (ΔL*=30.3)  → FAIL WCAG 2.99<3
  (預警 55% composite on mid = #a33759)
- 預警填色 55% --enemy-tel (#a33759) on #33302b: ΔE=30.24  CVD prot=13.99 deut=18.57 trit=28.39 (worst Prot 13.99)  WCAG=2.03  L* 40.0 vs 20.0 (ΔL*=20.0)  → PASS
- 預警線 --enemy-tel 不透明 on #33302b: ΔE=44.74  CVD prot=25.54 deut=40.20 trit=39.95 (worst Prot 25.54)  WCAG=3.90  L* 58.2 vs 20.0 (ΔL*=38.1)  → PASS
  (火地敵 36% composite on ground = #894054; 我方 14% = #5e4d44)
- 火地（敵）36% --enemy-tel (#894054) on #46413c: ΔE=23.61  CVD prot=8.28 deut=9.57 trit=21.75 (worst Prot 8.28)  WCAG=1.41  L* 37.2 vs 27.9 (ΔL*=9.3)  → PASS
- 火地（我）14% --el-fire (#5e4d44) on #46413c: ΔE=7.80  CVD prot=5.30 deut=6.59 trit=8.90 (worst Prot 5.30)  WCAG=1.26  L* 34.2 vs 27.9 (ΔL*=6.3)  → FAIL ΔE 7.8<15; FAIL CVD Prot 5.3<8
  (火地敵 36% composite on mid = #7c3549; 我方 14% = #4d3f36)
- 火地（敵）36% --enemy-tel (#7c3549) on #33302b: ΔE=25.36  CVD prot=9.68 deut=11.14 trit=22.96 (worst Prot 9.68)  WCAG=1.54  L* 32.5 vs 20.0 (ΔL*=12.5)  → PASS
- 火地（我）14% --el-fire (#4d3f36) on #33302b: ΔE=8.29  CVD prot=6.07 deut=6.80 trit=9.06 (worst Prot 6.07)  WCAG=1.30  L* 27.8 vs 20.0 (ΔL*=7.8)  → FAIL ΔE 8.3<15; FAIL CVD Prot 6.1<8
- 危急紅邊 60% --vig (#862a24) on #46413c: ΔE=22.70  CVD prot=9.56 deut=15.36 trit=23.11 (worst Prot 9.56)  WCAG=1.14  L* 31.5 vs 27.9 (ΔL*=3.6)  → FAIL CVD Prot 9.6<10
- 危急紅邊 60% --vig (#7e231d) on #33302b: ΔE=24.39  CVD prot=10.08 deut=16.97 trit=24.26 (worst Prot 10.08)  WCAG=1.34  L* 28.7 vs 20.0 (ΔL*=8.7)  → PASS
- 危急紅邊 70% --vig (#902620) on #46413c: ΔE=23.82  CVD prot=11.37 deut=17.39 trit=24.37 (worst Prot 11.37)  WCAG=1.19  L* 32.7 vs 27.9 (ΔL*=4.9)  → PASS
- 危急紅邊 70% --vig (#8a211b) on #33302b: ΔE=25.71  CVD prot=12.05 deut=19.50 trit=25.72 (worst Prot 12.05)  WCAG=1.45  L* 30.8 vs 20.0 (ΔL*=10.8)  → PASS
- 敵人外框 --enemy-rim on #46413c: ΔE=54.37  CVD prot=50.31 deut=52.48 trit=53.59 (worst Prot 50.31)  WCAG=6.29  L* 82.1 vs 27.9 (ΔL*=54.2)  → PASS
- 主角腳圈 --hero-ring on #46413c: ΔE=58.86  CVD prot=59.12 deut=58.75 trit=58.85 (worst Deut 58.75)  WCAG=9.38  L* 97.1 vs 27.9 (ΔL*=69.2)  → PASS
- 敵人外框 --enemy-rim on #33302b: ΔE=64.76  CVD prot=59.69 deut=63.04 trit=63.61 (worst Prot 59.69)  WCAG=8.19  L* 82.1 vs 20.0 (ΔL*=62.1)  → PASS
- 主角腳圈 --hero-ring on #33302b: ΔE=69.21  CVD prot=69.41 deut=68.93 trit=69.21 (worst Deut 68.93)  WCAG=12.22  L* 97.1 vs 20.0 (ΔL*=77.1)  → PASS
- 敵人外框 --enemy-rim on #615b56: ΔE=41.35  CVD prot=36.41 deut=38.65 trit=40.57 (worst Prot 36.41)  WCAG=4.17  L* 82.1 vs 39.1 (ΔL*=43.0)  → PASS
- 主角腳圈 --hero-ring on #615b56: ΔE=45.96  CVD prot=46.22 deut=45.65 trit=45.96 (worst Deut 45.65)  WCAG=6.22  L* 97.1 vs 39.1 (ΔL*=58.0)  → PASS
- el-fire 不透明 on #46413c: ΔE=47.78  CVD prot=40.89 deut=48.24 trit=47.82 (worst Prot 40.89)  WCAG=4.55  L* 71.1 vs 27.9 (ΔL*=43.2)  → PASS
- el-cold 不透明 on #46413c: ΔE=57.36  CVD prot=57.19 deut=56.02 trit=60.61 (worst Deut 56.02)  WCAG=7.22  L* 87.1 vs 27.9 (ΔL*=59.2)  → PASS
- el-light 不透明 on #46413c: ΔE=61.82  CVD prot=61.35 deut=60.65 trit=58.21 (worst Trit 58.21)  WCAG=9.08  L* 95.8 vs 27.9 (ΔL*=67.9)  → PASS
- el-chaos 不透明 on #46413c: ΔE=47.35  CVD prot=40.74 deut=44.75 trit=44.27 (worst Prot 40.74)  WCAG=3.96  L* 66.7 vs 27.9 (ΔL*=38.8)  → PASS
- scene-fire-flame 不透明 on #46413c: ΔE=35.73  CVD prot=25.22 deut=36.28 trit=36.02 (worst Prot 25.22)  WCAG=2.68  L* 54.9 vs 27.9 (ΔL*=27.0)  → FAIL WCAG 2.68<3
- scene-fire-outer 不透明 on #46413c: ΔE=29.87  CVD prot=18.79 deut=28.13 trit=30.36 (worst Prot 18.79)  WCAG=1.94  L* 45.9 vs 27.9 (ΔL*=18.0)  → FAIL WCAG 1.94<3
- scene-lava-glow 不透明 on #46413c: ΔE=28.55  CVD prot=26.52 deut=29.35 trit=28.32 (worst Prot 26.52)  WCAG=2.60  L* 54.1 vs 27.9 (ΔL*=26.3)  → FAIL WCAG 2.60<3
- portal 不透明 on #46413c: ΔE=55.33  CVD prot=55.18 deut=54.65 trit=50.74 (worst Trit 50.74)  WCAG=5.86  L* 79.6 vs 27.9 (ΔL*=51.7)  → PASS

## 5. Monster / boss contrast vs floor
- sprites measured: 77 (art.js m_* + boss_shang + hero). missing sheets: []
- method: opaque α≥128; body = those pixels with L*>10 (drop ink outlines). ΔE vs closer of ground/mid. Median colour also vs ground.
name                   nBdy  med     L  ΔEmed  CVDw  WCAG  meanΔEbody  %body<15  %body<8  worstBody
m_blackbear            1032  #242526  14.6    5.6    9.8  1.52     11.5     80.8%    63.0%  #443f3b ΔE0.9
m_sambar               1053  #32261d  16.3    6.3    8.8  1.46     13.0     69.1%    47.0%  #32261d ΔE6.3
boss_shang             1099  #1f2a26  15.9    8.6    8.0  1.47     14.3     85.8%     0.0%  #1f2a26 ΔE8.6
m_blackcat             1069  #1d1d22  11.0    9.1   12.8  1.66     14.7     67.8%     1.9%  #25262e ΔE9.1
m_cityrunner            890  #1c171d   8.6   11.1   13.2  1.75     15.1     55.2%    26.9%  #38383c ΔE6.5
m_hawkeagle             934  #221914   9.7    8.1   12.3  1.71     15.4     78.1%    10.1%  #37322b ΔE1.7
m_civet                 798  #2a241e  14.7    4.2    9.3  1.52     17.9     55.1%    43.2%  #2e2721 ΔE3.7
m_hundredpace          1477  #382b24  18.8    6.2    6.9  1.35     18.0     60.5%     5.5%  #361e1d ΔE13.1
m_goldtoad             1793  #363a1a  23.3   12.8    6.1  1.17     18.1     50.8%    19.6%  #514733 ΔE7.4
m_cobra                1591  #493734  24.9    7.9    2.4  1.11     19.1     45.9%    19.7%  #5a4d42 ΔE6.4
m_boar                  923  #2a1213   8.8   15.3   12.6  1.74     20.1     53.0%     5.4%  #593d2e ΔE11.1
m_shigandang            968  #2f1e28  13.7   13.9   11.6  1.56     20.1     44.8%    10.8%  #262231 ΔE13.4
m_macaque              1020  #4c2e31  22.7   14.0    3.5  1.19     20.2     47.7%     0.0%  #453131 ΔE10.1
m_muntjac              1019  #4d2c22  21.9   14.0    7.7  1.23     20.5     11.4%    11.0%  #313131 ΔE3.4
m_shanxiao             1382  #3a2530  17.6   14.5    9.2  1.40     21.1      9.3%     0.4%  #593c43 ΔE13.7
m_beetle                727  #2e0905   7.1   19.2   14.3  1.80     21.5     22.6%     0.0%  #614131 ΔE12.5
m_judge                 758  #23040e   4.3   18.6   15.4  1.90     21.5     26.5%     0.0%  #403740 ΔE9.7
m_leopardcat           1372  #4e3a2d  26.3    8.2    5.9  1.06     21.7     40.8%     0.1%  #4e3a2d ΔE8.2
m_straydog             1236  #442028  17.5   17.7    6.7  1.40     21.9      4.7%     0.4%  #442027 ΔE17.6
m_bat                  1679  #321a2e  13.3   18.7   13.8  1.57     22.4      0.0%     0.0%  #281a2e ΔE17.5
m_seaturtle            1498  #2e332a  20.5    6.0    5.5  1.28     22.6     49.8%    21.0%  #272b2a ΔE5.1
m_swallowtail           872  #150d19   4.7   14.8   15.4  1.89     23.1      0.0%     0.0%  #25263c ΔE15.8
m_windlion             1501  #4f2325  20.0   18.2    6.9  1.30     23.2     33.0%    15.1%  #635a53 ΔE9.1
m_yaksha                916  #2a1627  10.6   17.7   14.2  1.68     23.5      4.5%     0.1%  #2f1b27 ΔE15.6
m_thundergolem         1296  #3c2123  16.4   14.3    7.6  1.45     23.5     36.7%     0.6%  #282228 ΔE9.1
m_golem                1577  #303438  21.5    6.6    7.2  1.24     23.6     43.0%    10.1%  #393d43 ΔE7.8
m_mimic                1437  #371b16  13.6   14.5   10.7  1.56     23.9     16.2%     0.0%  #373745 ΔE11.5
m_sika                  555  #2e100a   8.8   16.7   13.5  1.74     24.0      3.1%     1.8%  #381a10 ΔE15.1
m_lavagolem            1245  #481618  15.6   20.2   10.3  1.48     24.1     29.2%    11.5%  #302c36 ΔE10.0
m_seagull              1238  #463b44  26.3    9.7    3.2  1.06     24.2     46.0%     6.5%  #3d3a3a ΔE3.9
m_fireant              1488  #50181b  17.6   20.9    9.8  1.40     24.3      2.3%     0.1%  #331210 ΔE17.3
m_slime_trash          1414  #3e1f27  16.3   16.6    7.5  1.46     24.3     25.9%     1.3%  #694e4a ΔE12.3
m_slime_fire           1281  #512a1a  21.9   15.9   10.2  1.23     24.9     26.8%     0.0%  #575a67 ΔE13.3
m_mosina_red           1167  #411e24  16.4   17.3    7.6  1.45     25.0      8.2%     0.0%  #5f331c ΔE16.5
m_nightheron           1060  #393230  21.4    3.8    4.7  1.24     25.0      8.9%     0.4%  #424459 ΔE13.9
m_hermit               1117  #4a2223  18.9   17.5    7.3  1.35     25.1      1.5%     0.0%  #4a2223 ΔE17.5
m_ratking              1295  #5e3950  29.1   18.9    8.7  1.05     25.8      5.3%     0.0%  #373950 ΔE15.1
m_fiddler              1129  #58200e  20.6   19.8   13.1  1.28     25.8     19.6%     8.7%  #2b2427 ΔE7.5
m_seadragon            1469  #1b2542  15.2   18.4   19.0  1.50     26.0      8.6%     0.0%  #171f37 ΔE17.3
m_flyfish              1277  #243448  21.2   14.5   14.6  1.25     26.1     11.9%     0.0%  #505263 ΔE13.3
m_mushking              731  #210f28   7.4   20.8   14.8  1.79     26.2     10.4%     0.0%  #2c1833 ΔE20.4
m_treefrog             1708  #524124  28.6   10.8    8.9  1.03     26.3     29.0%     0.0%  #48412b ΔE8.1
m_pangolin             1151  #593225  25.4   15.0    7.7  1.09     26.3     20.9%     0.2%  #25231d ΔE4.4
m_bajiajiang           1052  #341c21  13.7   14.5    9.4  1.56     26.8      9.1%     2.2%  #211d35 ΔE17.8
m_slime_green          1550  #3c422c  26.8   11.3    6.3  1.04     26.8     29.8%     3.7%  #3c402c ΔE10.0
m_lantern              1115  #640e1a  20.4   23.1    9.7  1.29     27.1      9.1%     0.0%  #69041c ΔE23.8
m_lucky_cat            1140  #5b3b23  28.0   13.3   10.5  1.01     27.3     26.8%     2.1%  #675451 ΔE10.7
m_monkeyking           1562  #552508  21.1   18.7   14.6  1.26     27.5      0.0%     0.0%  #552201 ΔE19.5
m_greenviper           1648  #2d492d  28.1   18.0    5.8  1.01     27.6     15.0%     3.6%  #1f2a3c ΔE13.8
m_skylantern           1145  #632923  24.8   19.4    7.7  1.11     27.6     13.4%     0.0%  #291c2b ΔE15.3
m_scarecrow            1113  #51231c  20.2   18.1    9.4  1.30     27.7     16.7%     2.2%  #511527 ΔE22.4
m_thunderfrog          1025  #562723  22.1   17.9    7.4  1.22     27.9      8.2%     0.6%  #562717 ΔE17.8
m_bluemagpie           1048  #2f302c  19.6    2.6    5.6  1.32     28.1     24.0%     9.6%  #262525 ΔE4.8
m_lavatoad             1201  #54111c  17.3   22.5    9.8  1.41     28.2      5.9%     0.0%  #4b0e1a ΔE22.3
m_spoonbill            1166  #694849  34.2   14.3    4.1  1.26     28.3     26.7%    17.7%  #262628 ΔE5.7
m_jossfire             1168  #583719  26.4   14.5   12.7  1.05     29.0     17.0%     5.9%  #2b2229 ΔE10.3
m_boba                 1383  #6c3021  27.9   19.3   10.1  1.00     29.5      5.6%     3.3%  #7c3720 ΔE20.6
m_coconutcrab          1051  #622b3c  25.7   20.6    0.3  1.08     30.1      0.5%     0.5%  #822b1d ΔE22.2
m_huye                 1238  #812213  29.1   22.9   13.6  1.04     30.1     13.2%     0.0%  #2c2021 ΔE8.9
m_betel                1155  #3c4425  27.4   14.1    7.9  1.02     30.8      7.5%     0.0%  #724623 ΔE17.4
m_thunderbat           1425  #502129  19.9   19.4    5.8  1.31     30.8      1.8%     0.0%  #6a4215 ΔE17.5
m_mushroom             1407  #631f24  22.9   21.4    7.0  1.19     31.5      0.4%     0.0%  #500b1a ΔE23.0
m_snowwolf             1387  #3c3e4c  26.5   11.1    9.7  1.05     32.1     32.2%     0.1%  #353e4c ΔE11.7
m_jadegolem            1294  #3d596c  36.4   17.2   15.7  1.37     32.2     13.7%     1.2%  #6dd1e7 ΔE54.9
m_eel                  1351  #702918  27.0   20.8   12.0  1.03     32.5      6.6%     0.0%  #984514 ΔE24.3
m_stinkytofu           1488  #844625  36.8   20.6   14.8  1.39     32.7      7.9%     0.0%  #3d4525 ΔE14.4
m_ravebat              1168  #131f5d  15.0   26.6   21.9  1.51     32.8     14.1%     0.0%  #40465d ΔE14.7
m_jelly                1098  #381238  13.0   24.0   16.5  1.59     33.6      4.8%     0.0%  #866663 ΔE19.6
m_cloudleopard         1210  #6d6c5c  45.3   16.0   14.8  1.90     34.2     21.7%     3.8%  #2b262d ΔE9.0
m_paperdoll             912  #2a1f2d  13.6   14.2   10.5  1.56     34.4      2.5%     0.0%  #293a81 ΔE26.4
m_slime_neon           1365  #541958  21.1   26.4   17.2  1.26     34.4      0.0%     0.0%  #630951 ΔE26.8
m_ghostfire            1089  #3f4f4c  32.2   11.5    4.7  1.17     34.8     18.7%     0.0%  #2c3241 ΔE12.0
m_frostwolf            1493  #3d5c7b  38.0   19.9   19.7  1.45     36.0      0.9%     0.0%  #33526f ΔE18.4
m_egret                1173  #424e5c  32.7   12.5   12.2  1.19     36.9      1.0%     0.0%  #344e6a ΔE17.6
m_slime_ice            1696  #2b7f8e  49.1   28.7   23.9  2.18     38.7      0.1%     0.0%  #0d263d ΔE16.6
m_sambarking           1024  #415670  35.9   17.4   17.4  1.34     38.7      3.0%     1.4%  #203049 ΔE16.3
hero                    516  #3a253a  18.0   17.7   10.1  1.38     40.5     15.7%     0.8%  #3a3943 ΔE9.4

- sprites with median ΔE<15 or mean body ΔE<15 or >25% body pixels ΔE<15 vs floor: 41 / 77
  m_blackbear, m_sambar, boss_shang, m_blackcat, m_cityrunner, m_hawkeagle, m_civet, m_hundredpace, m_goldtoad, m_cobra, m_boar, m_shigandang, m_macaque, m_muntjac, m_shanxiao, m_judge, m_leopardcat, m_seaturtle, m_swallowtail, m_windlion, m_thundergolem, m_golem, m_mimic, m_lavagolem, m_seagull, m_slime_trash, m_slime_fire, m_nightheron, m_flyfish, m_treefrog, m_bajiajiang, m_slime_green, m_lucky_cat, m_bluemagpie, m_spoonbill, m_jossfire, m_betel, m_snowwolf, m_paperdoll, m_ghostfire, m_egret

wrote images: tile-4x4.png, tile-4x4-up8.png, tile-up16.png, battle-1280x680-nflip.png, battle-1280x680-flips.png, battle-390x621-nflip.png, battle-390x621-flips.png, battle-1280-with-mobs.png, battle-390-with-mobs.png
