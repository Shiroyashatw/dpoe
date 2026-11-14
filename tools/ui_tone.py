"""色調量法（docs/介面體驗模擬.md 第五節）：一張截圖裡「最亮 5% 像素的亮度」、「飽和色的面積」、「平均亮度」。
掛機是餘光遊戲，常駐畫面的標準：最亮 5% 的亮度 ≤ 0.60、飽和色（HLS 的 S ≥ 0.5 且 L 在 0.2～0.8）面積 ≤ 5%。
餘光＝把圖縮到每 10 個 CSS 像素一格再量（1920 寬的桌機截圖縮成 192 寬；手機 2 倍截圖要加 --dpr 2，780 寬縮成 39 寬），
縮得不一樣就不能比。只量不改。用法：python3 tools/ui_tone.py [--dpr 2] 圖1.png 圖2.png …（Pillow）。參考值：Melvor Idle 0.49～0.59／示意頁第 2 版 0.87。"""
import sys, colorsys
from PIL import Image

TOP = 0.60
SAT = 0.05
args = sys.argv[1:]
dpr = 1
if args[:1] == ['--dpr']:
    dpr = float(args[1])
    args = args[2:]
bad = 0
for f in args:
    im = Image.open(f).convert('RGB')
    w, h = im.size
    im = im.resize((max(1, round(w / dpr / 10)), max(1, round(h / dpr / 10))), Image.Resampling.BOX)
    px = list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())
    L, sat = [], 0
    for r, g, b in px:
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        L.append(l)
        if s >= 0.5 and 0.2 <= l <= 0.8:
            sat += 1
    L.sort()
    n = len(L)
    top = sum(L[-n // 20 :]) / (n // 20)
    satp = sat / n
    ok = top <= TOP and satp <= SAT
    bad += not ok
    print(f"{'✅' if ok else '❌'} {f}｜最亮 5% {top:.2f}（≤{TOP}）｜飽和色 {satp * 100:.1f}%（≤{SAT * 100:.0f}%）｜平均亮度 {sum(L) / n:.2f}")
sys.exit(1 if bad else 0)
