# battle-hud v1.3.5 經驗條／格擋弧 上色示意圖。底圖＝render_color.py（v1.3.4，不改），新元件座標只讀 ../../src/xpblk.py。
# 用法：python3 render_xpblk.py [輸出資料夾] [--mock]
#   預設輸出到 color/：battle-hud-v135-xpblk-<名>.png（上色＋id＋說明欄）與 -clean.png（剛好 W×H）
#   --mock：另出 @2x、-clean@2x、.elements.json 與 evidence/（給 UIUX 自檢與對比量測）
# 需要 color/assets/repo/js/art.js（照 color/README.md 複製，不 commit）。
import os,sys,copy,json,math
from PIL import Image,ImageDraw
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
args=[a for a in sys.argv[1:] if not a.startswith('--')]; MOCK='--mock' in sys.argv
OUT=args[0] if args else ROOT
sys.argv=[sys.argv[0]]                     # render_color 會讀 argv[1] 當輸出資料夾，先清掉
sys.path.insert(0,os.path.join(os.path.dirname(ROOT),'src'))
import gen_battle_hud as G, xpblk as X
sys.path.insert(0,HERE); import render_color as R
from tokens import T
C=R.c; F=R.F
# --block 四色從 M2-36 讀（美術總監 H6，mumi 11/21 12:07 A 冷鋼；main #149）；tokens.py 不改
import re as _re
_M236=open(os.path.normpath(os.path.join(ROOT,'..','..','..','M2-36-palette-tokens.md')),encoding='utf-8').read()
BLOCK={k:_re.search(r'^\| --'+_re.escape(k)+r' \| `(#[0-9a-f]{6})`',_M236,_re.M).group(1) for k in ('block','block-dim','block-regen','block-hi')}
assert BLOCK=={'block':'#a9b8c3','block-dim':'#40484e','block-regen':'#758088','block-hi':'#eaf2f8'},BLOCK
T.update(BLOCK)
# 遊戲路徑；來源 main docs/production/art-picks/block-steel/ 同名檔，逐位元複製（mumi 12:32 同 PR 進 art/）
ICON_DIR=os.path.normpath(os.path.join(ROOT,*(['..']*6),'art','icons','hud'))
ICON=Image.open(os.path.join(ICON_DIR,'hud_block_16.png')).convert('RGBA'); ICON2=Image.open(os.path.join(ICON_DIR,'hud_block_16@2x.png')).convert('RGBA')
STAMP='battle-hud v1.3.5（mumi 11/21 12:07）・上色'
FILL={'full':1.0,'partial':412/600,'refilling':0.45}
def draw_new(img,N,st):
    d=ImageDraw.Draw(img,'RGBA')
    for e in N:
        x0,y0,x1,y1=e['x0'],e['y0'],e['x1'],e['y1']; k=e['kind']
        if k=='xpbar':
            if x1-x0==450:   # 1280：外 #000＋內 --border＋4 px 條（M1）
                d.rectangle((x0,y0,x1-1,y1-1),fill=(0,0,0,255)); d.rectangle((x0+1,y0+1,x1-2,y1-2),fill=C('border'))
                xa,xb,ya,yb=x0+2,x1-2,y0+2,y1-2
            else:
                top=C('panel-edge') if y0==552 else (0,0,0,255); bot=C('border') if y0==552 else (0,0,0,255)
                d.line((x0,y0,x1-1,y0),fill=top); d.line((x0,y1-1,x1-1,y1-1),fill=bot); xa,xb,ya,yb=x0,x1,y0+1,y1-1
            d.rectangle((xa,ya,xb-1,yb-1),fill=C('prog-lo')); d.rectangle((xa,ya,xa+int((xb-xa)*0.62)-1,yb-1),fill=C('prog-hi'))
        elif k=='blkarc' and st!='none':
            g=e['geo']; cx,cy,r=g['cx'],g['cy'],g['r']; bb=(cx-r,cy-r,cx+r-1,cy+r-1)
            d.arc((cx-r-1,cy-r-1,cx+r,cy+r),180,360,fill=(0,0,0,255),width=6)       # 外圍＋內緣 1 px #000（必要）
            d.line((cx-r-1,cy,cx-r+4,cy),fill=(0,0,0,255)); d.line((cx+r-5,cy,cx+r,cy),fill=(0,0,0,255))
            d.arc(bb,180,360,fill=C('block-dim'),width=4)
            end=180+180*FILL[st]
            if st=='refilling':
                a=180
                while a<end: d.arc(bb,a,min(a+10,end),fill=C('block-regen'),width=4); a+=16
            else: d.arc(bb,180,end,fill=C('block'),width=4)
        elif k=='icon' and st!='none':
            img.alpha_composite(ICON,(x0,y0)); d=ImageDraw.Draw(img,'RGBA')
        elif k=='tip' and st=='partial':
            R.rect(d,x0,y0,x1,y1,fill=C('panel-raised'),outline=C('panel-edge'))
            R.text(d,(x0+10,(y0+y1)/2),'格擋值 412 / 600',14 if x1-x0==370 else 16,'tx',anchor='lm')
    W,H=img.size; fs=9; w=R.tw(STAMP,fs,700); Xx=W-6-w; Y=818 if W<500 else H-12
    R.rect(d,int(Xx-4),Y-2,int(Xx+w+4),Y+11,fill=C('plate-world'),outline=C('border')); R.text(d,(Xx,Y+4.5),STAMP,fs,'tx-strong',700,anchor='lm')
    return img
def base(size,collapsed,busy):
    st='collapsed' if collapsed else ('lootflood' if busy else 'normal')
    E=copy.deepcopy(G.elements_collapsed(size) if collapsed else G.elements(size,st))
    E=[e for e in E if e['kind']!='tip']        # 截圖不長按技能格；工具提示位置改示範格擋值
    img=Image.new('RGBA',G.SIZES[size],C('scene-void')); R.TEXTLOG.clear(); R.FOOT.clear()
    R.scene(img,E,size,st); field=img.copy(); R.hud(img,E,size,st)
    if size=='390x844': R.safe_areas(img,E)
    return img,E,field,st
def news(size,collapsed,st):
    N=X.items(size,collapsed)
    if st=='none': N=[e for e in N if e['kind']=='xpbar']
    if st!='partial': N=[e for e in N if e['kind']!='tip']
    return N
NAMES={'full':'滿 600／600','partial':'被打掉 412／600（顯示工具提示）','refilling':'碎開回滿中（45%，不吸收傷害）','none':'沒拿盾（不畫、熱區不留）'}
def annotated(img,E,N,title):
    W,H=img.size; LW=850; top=42; rows=[]
    for e in list(N)+list(E):
        if e['kind'].split(':')[0] in('zone','line','region'): continue
        s=f"{e['id']}｜{e['name']}｜{e['x0']},{e['y0']} {e['x1']-e['x0']}×{e['y1']-e['y0']}｜{e['font']}｜{e['token']}｜{e['hit']}"
        ff=F(10); lines=[]; cur=''
        for ch in s:
            if ff.getlength(cur+ch)>LW-28 and cur: lines.append(cur); cur='    '+ch
            else: cur+=ch
        if cur: lines.append(cur)
        rows.append((e in N,lines))
    h=max(H+top+8,top+60+sum(len(x)*14+3 for _,x in rows))
    out=Image.new('RGB',(W+LW,h),'white'); out.paste(img.convert('RGB'),(0,top)); d=ImageDraw.Draw(out)
    d.text((8,4),title,font=F(14,700),fill='black')
    d.text((8,24),f'{STAMP}｜左圖上方 42 px 是標題，座標以 -clean 為準｜粗體＝v1.3.5 新元件',font=F(10),fill='#444444')
    d.text((W+12,top),'id｜功能名稱｜x,y w×h｜字級｜token｜熱區',font=F(12,700),fill='black'); y=top+22
    for new,lines in rows:
        for ln in lines: d.text((W+12,y),ln,font=F(10,700 if new else 400),fill='#000000' if new else '#686868'); y+=14
        y+=3
    placed=[]
    for e in list(N)+list(E):
        if e['kind'].split(':')[0] in('zone','line','region'): continue
        x,yy=e['x0'],e['y0']+top
        if e in N:
            if e['kind']=='xpbar': x=300 if W==390 else 620; yy=e['y1']+top+1 if W==390 and e['y0']==552 else e['y0']+top-11
            if e['kind']=='blkarc': yy=e['y0']+top-11
            if e['kind']=='icon': x=e['x1']+2
        w=F(8,700).getlength(e['id'])+4
        for dy in (0,-10,10,-20,20):
            b=(x,yy+dy,x+w,yy+dy+10)
            if not any(not(b[2]<=q[0] or b[0]>=q[2] or b[3]<=q[1] or b[1]>=q[3]) for q in placed): break
        placed.append(b); d.rectangle(b,fill='#000000'); d.text((b[0]+2,b[1]),e['id'],font=F(8,700),fill='#9ff0ff' if e in N else ('#ffe878' if e['layer']=='hud' else '#a0e6ff'))
    return out
JOBS=[('hud-390-A','390x844',False,True,'partial','390×844 常態最忙（掉落洪水）＋經驗條＋格擋值（被打掉＋工具提示）'),
      ('hud-390-A-collapsed','390x844',True,False,'partial','390×844 收起：經驗條與格擋值跟 HUD 下移 140'),
      ('hud-1280-A','1280x720',False,True,'partial','1280×720 常態最忙＋經驗條（M1 雙邊 8 px）＋格擋值')]
for size,sh in (('390x844','390'),('1280x720','1280')):
    for st in ('full','partial','refilling','none'): JOBS.append((f'block-{sh}-{st}',size,False,False,st,f'{size} 格擋弧：{NAMES[st]}'))
def main():
    os.makedirs(OUT,exist_ok=True); meta=[]
    if MOCK: os.makedirs(os.path.join(OUT,'evidence'),exist_ok=True)
    for name,size,col,busy,st,title in JOBS:
        img,E,field,bst=base(size,col,busy); before=img.copy(); N=news(size,col,st); draw_new(img,N,st)
        pre=os.path.join(OUT,('' if MOCK else 'battle-hud-v135-xpblk-')+name)
        cl=img.convert('RGB'); an=annotated(img,E,N,title)
        if MOCK:
            cl.save(pre+'_clean.png'); an.save(pre+'.png')
            # @2x：底圖像素圖整數倍放大；盾牌用 16@2x 原檔（＝16 最近鄰 ×2，逐像素相同）
            c2=img.resize((img.width*2,img.height*2),Image.Resampling.NEAREST)
            for e in N:
                if e['kind']=='icon': c2.paste(ICON2,(e['x0']*2,e['y0']*2),ICON2)
            c2.convert('RGB').save(pre+'_clean@2x.png'); an.resize((an.width*2,an.height*2),Image.Resampling.NEAREST).save(pre+'@2x.png')
            json.dump(dict(name=name,size=size,base_state=bst,block_state=st,version=STAMP,new=N,base=E,moved_existing=[],tooltip_example='格擋值 412 / 600'),open(pre+'.elements.json','w'),ensure_ascii=False,indent=1)
            before.convert('RGB').save(os.path.join(OUT,'evidence',name+'-before.png')); field.convert('RGB').save(os.path.join(OUT,'evidence',name+'-field.png'))
        else:
            cl.save(pre+'-clean.png',optimize=True); an.save(pre+'.png',optimize=True)
        meta.append(name); print(pre)
    return meta
if __name__=='__main__': main()
