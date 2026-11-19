"""新舊對照 (g)：左舊、右新並排，上方各寫一行標籤。用法：python3 -I sbs.py 左.png 右.png 輸出.png 左標 右標"""
import sys
from PIL import Image, ImageDraw, ImageFont
a, b = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
la, lb = sys.argv[4], sys.argv[5]
pad, top = 8, 28
W = a.width + b.width + pad * 3
H = max(a.height, b.height) + top + pad
im = Image.new('RGB', (W, H), (24, 24, 24))
im.paste(a, (pad, top)); im.paste(b, (pad * 2 + a.width, top))
d = ImageDraw.Draw(im)
try:
    f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 18)
except Exception:
    f = ImageFont.load_default()
d.text((pad, 4), la, fill=(230, 230, 230), font=f)
d.text((pad * 2 + a.width, 4), lb, fill=(230, 230, 230), font=f)
im.save(sys.argv[3], optimize=True)
