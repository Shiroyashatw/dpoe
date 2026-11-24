# 用法：python3 -I overlay.py 實機.png 示意.png 輸出前綴
# 產出：<前綴>-blend.png（50% 疊合）、<前綴>-diff.png（差異熱圖）、<前綴>-side.png（並排）；印出右欄區差異比例
import sys
from PIL import Image, ImageChops, ImageDraw
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
if a.size!=(1280,720): a=a.resize((1280,720),Image.LANCZOS)
p=sys.argv[3]
Image.blend(a,b,0.5).save(p+'-blend.png')
d=ImageChops.difference(a,b).convert('L').point(lambda v:255 if v>48 else v*2)
heat=Image.merge('RGB',(d,Image.new('L',d.size,0),Image.new('L',d.size,0)))
Image.blend(b.convert('RGB'),heat,0.6).save(p+'-diff.png')
s=Image.new('RGB',(2560+8,720),(255,0,255)); s.paste(a,(0,0)); s.paste(b,(1288,0))
dr=ImageDraw.Draw(s); dr.text((8,700),'實機 actual',fill=(255,255,0)); dr.text((1296,700),'示意 wireframe',fill=(255,255,0)); s.save(p+'-side.png')
box=(788,76,1264,562); dd=d.crop(box); h=dd.histogram()
print('右欄差異像素比例(>48)：%.1f%%'%(100*sum(h[49:])/(476*486)))
