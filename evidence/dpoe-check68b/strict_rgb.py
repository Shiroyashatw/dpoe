import sys, os, glob, itertools
from PIL import Image, ImageChops
D=sys.argv[1]
base=sorted(glob.glob(os.path.join(D,'base*/'))); head=sorted(glob.glob(os.path.join(D,'head*/')))
tot=ok=0; bad=[]
for size in ('portrait','desktop','3a'):
  for n in sorted(os.path.basename(p) for p in glob.glob(os.path.join(base[0],size,'*.png'))):
    tot+=1; best=None
    for a,b in itertools.product(base,head):
      pa,pb=os.path.join(a,size,n),os.path.join(b,size,n)
      if not(os.path.exists(pa) and os.path.exists(pb)): continue
      A=Image.open(pa).convert('RGB'); B=Image.open(pb).convert('RGB')
      if A.size!=B.size: continue
      d=ImageChops.difference(A,B)
      if d.getbbox() is None: best=(a,b); break
    if best: ok+=1; print('✅ %s/%s 逐像素（RGB）相同：%s × %s'%(size,n,os.path.basename(best[0][:-1]),os.path.basename(best[1][:-1])))
    else: bad.append(size+'/'+n); print('❌ %s/%s 沒有 RGB 完全相同的一對'%(size,n))
print('\n嚴格 RGB 比對：相同 %d／%d，不同 %d %s'%(ok,tot,len(bad),bad))
