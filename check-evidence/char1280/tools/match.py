import json,sys
L=json.load(open(sys.argv[1])); D=json.load(open(sys.argv[2]))['screens']
def iou(a,b):
    x1=max(a['x'],b['x']);y1=max(a['y'],b['y']);x2=min(a['x']+a['w'],b['x']+b['w']);y2=min(a['y']+a['h'],b['y']+b['h'])
    i=max(0,x2-x1)*max(0,y2-y1); u=a['w']*a['h']+b['w']*b['h']-i
    return i/u if u else 0
out=[]
for scr,items in L.items():
    els=D.get(scr,[])
    out.append(f'\n### {scr}\n\n| 編號 | 元素 | 規格 x,y w×h | 實測 x,y w×h | Δx Δy Δw Δh | IoU | 規格字 | 實測字（fs/fw） | 實測 class／文字 |\n|---|---|---|---|---|---|---|---|---|')
    for it in items:
        if it['x']+it['w']<=788 and it['id'][1:] not in ('44',): continue  # 只看右欄（+ 名詞提示）
        best=max(els,key=lambda e:iou(it,e),default=None)
        v=iou(it,best) if best else 0
        if not best or v<0.3:
            out.append(f"| {it['id']} | {it['n'][:22]} | {it['x']},{it['y']} {it['w']}×{it['h']} | **找不到（IoU<0.3）** | | {v:.2f} | {it['font'][:20]} | | |"); continue
        d=[best['x']-it['x'],best['y']-it['y'],best['w']-it['w'],best['h']-it['h']]
        flag='' if max(map(abs,d))<=1 else ' ⚠'
        out.append(f"| {it['id']} | {it['n'][:22]} | {it['x']},{it['y']} {it['w']}×{it['h']} | {best['x']},{best['y']} {best['w']}×{best['h']} | {' '.join('%+d'%x for x in d)}{flag} | {v:.2f} | {it['font'][:24]} | {best['fs']}/{best['fw']} | {best['tag']}.{str(best['cls'])[:18]} {best['txt'][:18]} |")
open(sys.argv[3],'w').write('\n'.join(out))
