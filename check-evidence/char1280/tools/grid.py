# 用法：python3 -I grid.py in.png out.png  → 在 1280×720 圖上畫規格線（右欄、戰場、裝備格、浮窗）
import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('RGB'); dr=ImageDraw.Draw(im)
R=lambda x,y,w,h,c: dr.rectangle((x,y,x+w-1,y+h-1),outline=c)
R(788,76,476,486,(0,255,255)); R(16,76,760,486,(0,255,0)); R(712,10,556,52,(255,255,0))
for y in (146,216,286,356,426,496): R(796,y,64,64,(255,0,255))
for y in (146,216,286,356,426): R(1192,y,64,64,(255,0,255))
im.save(sys.argv[2])
