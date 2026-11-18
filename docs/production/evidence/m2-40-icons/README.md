# M2-40 R5 技能圖示重畫 evidence

狀態：**停在 A1 開跑前，0 次生成。**

- 雲端環境變數 `PIXELLAB_API_KEY` 不存在。照任務規則（金鑰只從這個變數讀，沒有就停，不找替代方法）停下，沒有呼叫 PixelLab，也沒查餘額。
- `docs/production/specs/M2-40-skill-icon-prompts.md` §2 要沿用的 `tools/pixellab_batch.py` 不在 main（base `bc8ac75`）。本分支不准改 `tools/`，下次開跑前要先把這支工具合進 main。
- 23 枚全部未開始；預算已用 0／40。

尚缺交付（等能生成後補）：4 倍彩色＋灰階對照圖、32／16 黑色剪影、52／56 模擬按鈕示意、IoU csv。
