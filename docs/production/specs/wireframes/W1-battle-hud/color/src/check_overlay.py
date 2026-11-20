# 自檢：(1) 上色圖疊 W1-v13 overlay PNG（輸出疊圖）；(2) 每個 HUD 元件實際畫出的像素範圍 vs 元件框（≤1 px）；
# (3) overlay PNG 上的框線 vs 元件清單；(4) 文字對比抽檢（實際像素底色 vs 字色 token）。
import os,sys,json
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
WB=os.path.dirname(ROOT)   # W1-battle-hud/
sys.path.insert(0,os.path.join(WB,'src')); import gen_battle_hud as G
sys.path.insert(0,HERE); from tokens import c
OUT=ROOT; CK=os.path.join(ROOT,'check'); os.makedirs(CK,exist_ok=True)
meta=json.load(open(os.path.join(ROOT,'render_meta.json')))['meta']
# 設計上本來就畫出框外的（規格寫明），不算誤差
EXT={'wind':'蓄力弧在格外 2 px（battle-hud-4 §11）','reload':'裝填環在格外 3 px（同上）','potion':'390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）','aurak':'「+k」字底板（--plate-world）'}
def lum(rgb):
    a=np.array(rgb[:3])/255; a=np.where(a<=0.03928,a/12.92,((a+0.055)/1.055)**2.4); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]
def cr(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
rep=[f'# 疊圖自檢（{G.VERSION}，上色版）','','疊圖來源：W1-battle-hud/W1_battle-*_overlay.png（同一產生器 src/gen_battle_hud.py 產出）；元件清單：src/gen_battle_hud.py。門檻：每個 HUD 元件四邊誤差 ≤1 px。','']
tot=dict(n=0,ok=0,ext=0,empty=0,bad=0); worst=0; badlist=[]; ovmis=[]; CR=[]
for st in G.STATES+['collapsed']:
    for size,(W,H) in G.SIZES.items():
        E=G.elements(size,st) if st!='collapsed' else G.elements_collapsed(size)
        col=Image.open(f'{OUT}/battle-hud-v13-color-{st}-{size}-clean.png').convert('RGBA')
        ov=Image.open(os.path.join(WB,f'W1_battle-{st}_{size}_overlay.png')).convert('RGBA')
        assert ov.size==col.size==(W,H),(ov.size,col.size)
        comp=col.copy(); comp.alpha_composite(ov); comp.convert('RGB').save(os.path.join(CK,f'overlay-{st}-{size}.png'))
        oa=np.asarray(ov)[...,3]>0; foot=meta[f'{st}-{size}']['foot']; px=np.asarray(col)
        n=ok=0; lines=[]
        for e in E:
            k=e['kind'].split(':')[0]
            if e['layer']!='hud' or k in('zone','line','region'): continue
            x0,y0,x1,y1=e['x0'],e['y0'],e['x1'],e['y1']
            # (3) overlay PNG 框線：四邊各取中段 80% 的像素，需 ≥70% 不透明
            def frac(xs,ys): return float(oa[np.clip(ys,0,H-1),np.clip(xs,0,W-1)].mean())
            xs=np.arange(int(x0+(x1-x0)*0.1),int(x1-(x1-x0)*0.1)+1); ys=np.arange(int(y0+(y1-y0)*0.1),int(y1-(y1-y0)*0.1)+1)
            fr=[frac(xs,np.full_like(xs,y0)),frac(xs,np.full_like(xs,y1-1)),frac(np.full_like(ys,x0),ys),frac(np.full_like(ys,x1-1),ys)]
            if k not in('aurarow',) and min(fr)<0.7 and (x1-x0)>=8 and (y1-y0)>=8: ovmis.append(f'{size} {st} {e["id"]} overlay 框線覆蓋 {min(fr):.0%}')
            f=foot.get(e['id']); tot['n']+=1
            if f is None: tot['empty']+=1; lines.append(f'{e["id"]} 本狀態未畫（空格）'); continue
            dx0,dy0,dx1,dy1=f[0]-x0,f[1]-y0,f[2]-x1,f[3]-y1
            istext=k=='text'
            if istext:   # 文字：字墨在框內即可（-1 容許）
                err=max(0,-dx0,-dy0,dx1,dy1)
            else: err=max(abs(dx0),abs(dy0),abs(dx1),abs(dy1))
            why=None; v=e['kind'].split(':')[1] if ':' in e['kind'] else ''
            if err>1:
                if v in('wind',) : why=EXT['wind']
                elif v=='reload': why=EXT['reload']
                elif k=='circle': why=EXT['potion']
                elif k=='aurarow': why=EXT['aurak']
            if err<=1: tot['ok']+=1; ok+=1
            elif why: tot['ext']+=1; lines.append(f'{e["id"]} 外擴 {err}px：{why}')
            else: tot['bad']+=1; badlist.append(f'{size} {st} {e["id"]} {e["name"]} 誤差 {err}px 框{(x0,y0,x1,y1)} 實畫{tuple(f)}')
            if not why: worst=max(worst,err if err<=1 else worst)
            n+=1
        rep.append(f'- {size} {st}：HUD 元件 {n} 個，≤1 px {ok} 個；'+('；'.join(lines) if lines else '無例外'))
        # (4) 對比抽檢：每張取文字紀錄，底色＝字框內「非字色」像素中位數
        for t in meta[f'{st}-{size}']['text']:
            if t['col'].startswith('('): continue
            b=t['ink']; x0,y0,x1,y1=[int(v) for v in b]; x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
            if x1-x0<3 or y1-y0<3: continue
            reg=px[y0:y1,x0:x1,:3].reshape(-1,3).astype(int); fg=np.array(c(t['col'])[:3])
            dist=np.abs(reg-fg).sum(1); bgp=reg[dist>120]
            if len(bgp)<5: continue
            bg=tuple(int(v) for v in np.median(bgp,0)); CR.append((cr(fg,bg),size,st,t['id'],t['txt'],t['col'],'#%02x%02x%02x'%bg,t['sz']))
rep+=['',f'**合計**：HUD 元件 {tot["n"]} 次（10 張），≤1 px {tot["ok"]}、規格內外擴 {tot["ext"]}、本狀態未畫 {tot["empty"]}、超過 1 px（不合格）{tot["bad"]}。']
rep+=['','## 超過 1 px']+([f'- {x}' for x in badlist] or ['- 無'])
rep+=['','## overlay PNG 框線 vs 元件清單（確認疊的是同一版；圓形藥劑用方框取樣，覆蓋率低是正常的）']+([f'- {x}' for x in ovmis] or ['- 全部吻合（每邊中段 ≥70% 有框線）'])
CR.sort()
rep+=['','## 文字對比抽檢（WCAG 2.x；底色取字框內實際像素中位數）',f'抽 {len(CR)} 筆。最低 10 筆：']
for r in CR[:10]: rep.append(f'- {r[0]:.2f}：{r[1]} {r[2]} {r[3]}「{r[4]}」{r[7]}px {r[5]} 在 {r[6]}')
low=[r for r in CR if r[0]<4.5]
rep.append(f'- <4.5 共 {len(low)} 筆'+('' if not low else '：'+'；'.join(f'{r[3]}「{r[4]}」{r[0]:.2f}' for r in low[:12])))
open(os.path.join(ROOT,'check_report.md'),'w').write('\n'.join(rep)+'\n'); print('\n'.join(rep))
