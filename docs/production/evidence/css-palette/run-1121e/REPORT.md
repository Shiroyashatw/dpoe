# CSS 對齊色票（M2-36）：#159 王閃現線最後一項修正（dpoe-css-palette5）

- 分支 `fix/css-palette-1121`，接 `b8412ab`（46d23ae 第四輪＋AUTHORIZATION.md）；base main `812b428`（main 沒前進，不用 merge）。
- 依據：UIUX 對 PR #159 M1 王閃現線的裁定——黑邊改不透明（α1），`lineWidth 5` 先畫 `PAL.ringEdge`；線維持 3 px `--enemy-tel`、α 照舊（0.3＋0.6f）。敵方攻擊預兆要比己方特效醒目，不套用「黑邊 α＝環 α」；己方環的黑邊不動。
- 這一輪改的檔：`js/render.js`（只有王閃現線那一段，L163）、`tools/check.js`（`#159 簽核 M1／M2` 那一項改成斷言黑邊不透明）、本資料夾、`run-1121d/REPORT.md` M1 標題加一行指到這裡。
- 其他 M2–M6 的程式沒動；本資料夾的 `shots/` 是用同一支 `shots.js` 整套重跑（M2–M6 數字和 run-1121d 一樣，順便確認沒被影響）。

## M1 王閃現預警線（`render.js:163`）— **通過**
- 程式：同一條 arc 先 `lineWidth 5`、`PAL.ringEdge` stroke（globalAlpha 1），再 `globalAlpha = 0.3 + 0.6 * f`、`lineWidth 3`、`PAL.enemyTel` stroke；畫完還原 globalAlpha 1、lineWidth 2。
- 攔遊戲 `draw()` 實際筆畫（`shots/branch-facts.json` 的 `blink.*.rec`）：兩種尺寸都是 `#000000 5px α1`＋`#ff3d7f 3px α0.9`（f=1）／`α0.7`（f=2/3）。
- 量法同 run-1121d：同樣的筆畫畫在五種淺磚（合成底，沒燈籠光）讀像素；390×844、1280×720 兩個視窗各量一次（數字相同）。

| 淺磚 | main 線對磚 α0.9 | **線對黑邊 α0.9** | 黑邊對磚 | **線對黑邊 α0.7** | 線對磚 α0.9／α0.7 |
| --- | --- | --- | --- | --- | --- |
| #615b56 | 2.38 | **5.16** ✅ | 3.14 | **3.41** ✅ | 1.64／1.09 |
| ice | 1.60 | **5.16** ✅ | 13.75 | **3.41** ✅ | 2.66／4.04 |
| lava | 3.45 | **5.16** ✅ | 2.09 | **3.41** ✅ | 2.47／1.63 |
| tomb | 2.36 | **5.16** ✅ | 3.17 | **3.41** ✅ | 1.63／1.07 |
| temple | 2.24 | **5.16** ✅ | 3.30 | **3.41** ✅ | 1.56／1.03 |

- 預期線對黑邊 α0.9 ≥5.14、α0.7 ≥3.39：實測 5.16／3.41，五種淺磚兩種 α 都 ≥3。黑邊對磚 2.09–13.75 和裁定附的算值一致（熔岩 2.09 <3，裁定已知，只記錄；黑邊不透明後不隨 α 變）。
- 線像素：α0.9 (230,55,115)、α0.7 (179,43,89)，黑邊 (0,0,0)。
- 圖（左 main｜右分支）：`shots/cmp-tele-390x844-*.jpg`、`shots/cmp-tele-1280x720-*.jpg`（五種淺磚）；遊戲畫面 `shots/cmp-blink-ingame-{390x844,1280x720}-{a0.9,a0.7}.jpg`（2 倍放大）。
- 數字全在 `shots/measure.csv`（182 列；M1 現在分兩個尺寸）。

## 測試數字
| 項目 | 本分支 |
| --- | --- |
| `node tools/check.js` | **895 ✅／0 ❌**（`logs/check_branch.txt`；上一輪 895，項目數不變，M1 那一項改成斷言黑邊不透明） |
| `node tools/d1_saves.js --check` | **6/6**（`logs/d1_branch.txt`） |
| touch_check 390×844 | **160／0** |
| touch_check 375×667 | **160／0** |
| touch_check 1280×720 | **16／0** |
| touch_check 1440×900 | **16／0** |
| `node tools/pro_check.js` | **35／0**（`logs/pro_branch.txt`） |

- 每一項只跑一次就過，沒有偶發失敗、沒有重跑；沒有放寬任何斷言。
- 反向驗證：在黑邊 stroke 前加回 `globalAlpha = 0.3 + 0.6 * f`，`#159 簽核 M1／M2` 變 ❌（1 項，`logs/check_mutation.txt`）；改回後 895／0。

## 重跑
```
python3 -m http.server 8000                                   # 分支
(cd <main 812b428 worktree> && python3 -m http.server 8001)
PW_CHROME=/opt/pw-browsers/chromium node shots.js http://localhost:8000/index.html shots branch
PW_CHROME=/opt/pw-browsers/chromium node shots.js http://localhost:8001/index.html shots main
python3 -I measure.py shots
```
