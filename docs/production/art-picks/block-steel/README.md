# H6 格擋 定稿：A 冷鋼＋盾牌 a（參考用，不是執行時資產）

mumi 2026-11-21 12:07（經幕僚長）挑定。草稿和比較在 `../block-steel-draft/`。token 已寫進 `specs/M2-36-palette-tokens.md`（按鈕與狀態表）。
**開發暫停中，進 art/ 另開 PR**；建議路徑 `art/icons/hud/hud_block_16.png`＋`@2x`（進 art/ 時由 AD 確認）。

- `hud_block_16.png`／`@2x`＋各自的 `.json`（尺寸、錨點、token、描邊在 16 內、DPR 2＝16@2x、來源文件 sha256、檢查結果）、`picked.txt`
- `palette/block-tokens.json`、`swatches.png`
- `overview/final-review-2x.png`：390／1280 × panel／scene-void／淺磚，四態弧＋盾牌，下附紅弱／綠弱／藍弱／灰階；各模擬的全幅 2× 另存 `final-review-2x-*.png`；`hud_block_16-on-5bg-4x.png`
- 重跑：`python3 src/finalize.py`（在 /workspace/affix-icons/blk 下）
