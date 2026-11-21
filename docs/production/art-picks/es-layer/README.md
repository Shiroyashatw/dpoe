# H11 能量護盾 --es 定稿：A 淡金（參考用，不是執行時資產）

mumi 2026-11-21 12:31（經幕僚長）挑定：--es `#dfbf91`、--es-hi `#fcefde`。另外：准暖色例外；生命條下緣框不改；色值以 `specs/M2-36-palette-tokens.md` 為準，不以 css/style.css。token 已寫進 M2-36。

UIUX 需求單（art-request-es-token.md）的硬條件，用 UIUX `check_es.py` 的 crh() 量（一般／紅色盲／綠色盲／藍黃色盲）。色票值和 main css 值兩組都過：
- --es 對 --hp：3.85／4.31／3.61／3.83（css 4.91 起）
- --es 對 --panel-inset：9.46 以上
- --es 對 --panel：8.74 以上
- --es-hi 對 --es：1.55／1.60／1.52／1.54
- --es-hi 對 --hp：5.46 以上
- --es 的相對亮度 Y＝0.550，在 0.418–0.650 內

軟條件是跟 --block、--prog-hi 盡量拉開。只靠亮度只拉到 1.16、1.23，跟這兩個要靠位置（只在生命條底 3 px）和色相分。數字在 `palette/es-tokens.json`。

- `palette/es-tokens.json`、`swatches.png`
- `overview/final-review-2x.png`：390／1280 × 三種底，五種狀態（滿、被打掉、充能中＋前緣、0、低血），旁邊有魔力條、經驗條、格擋弧。另有 `-protan/-deutan/-tritan/-gray`。
- `overview/final-zoom-4x*.png`：細條放大 4 倍。
- `picked.txt`、`src/`：重跑 `python3 src/finalize_es.py`，要在 /workspace/affix-icons/es 下跑。

藥劑環、經驗條的位置是示意。
