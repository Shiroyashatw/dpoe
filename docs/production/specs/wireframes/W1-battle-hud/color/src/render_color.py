# battle-hud v1.3 上色示意圖產生器（final，2026-11-20 mumi 16:32 核准）。
# 版面：只讀 ../../src/gen_battle_hud.py 的元件清單，座標一律照它，不改尺寸（掉落牌／菁英名牌寬也由它算，定 mumi 16:32）。
# 色票：tokens.py（D2 定案 token）。素材：../assets/（從 dpoe main 與 PixelLab 挑選圖複製，來源見 SOURCE*.txt）。不用生圖。
# 用法：python3 render_color.py [輸出資料夾]  → 預設 ../（color/）battle-hud-v13-color-<state>-<WxH>.png 與 -clean.png
import os,sys,re,glob,math,random,json
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)   # ROOT＝color/
sys.path.insert(0,os.path.join(os.path.dirname(ROOT),'src')); import gen_battle_hud as G
sys.path.insert(0,HERE); from tokens import T,c,RAR
A=os.path.join(ROOT,'assets'); REPO=os.path.join(A,'repo'); PICK=os.path.join(A,'pick')
OUT=sys.argv[1] if len(sys.argv)>1 else ROOT
STAMP=G.VERSION+'・上色'
USED=set(); WIDEN=[]; OVERFLOW=[]; TEXTLOG=[]; BOXLOG=[]; PLACEHOLDERS=[]
# ---------------- 字型：Noto Sans TC（=Noto Sans CJK TC）；等寬用 Noto Sans Mono CJK TC
FR='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; FB='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
_fc={}
def F(sz,w=400,mono=False):
    k=(sz,w,mono)
    if k not in _fc: _fc[k]=ImageFont.truetype(FB if w>=700 else FR,sz,index=8 if mono else 3)
    return _fc[k]
# ---------------- 素材
def sheet(name):
    fs=glob.glob(os.path.join(REPO,'img',name+'.*.png'))+glob.glob(os.path.join(REPO,'img',name+'.png'))
    f=sorted(fs,key=len)[0]; USED.add(os.path.relpath(f,A)); return Image.open(f).convert('RGBA')
ARTJS=open(os.path.join(REPO,'js','art.js')).read()
def art(key):
    m=re.search(r"\b%s: \['([^']+)', (\d+), (\d+), (\d+), (\d+)\]"%re.escape(key),ARTJS)
    s,x,y,w,h=m.group(1),*map(int,m.groups()[1:]); USED.add(f'repo/js/art.js:{key}')
    return sheet(s).crop((x,y,x+w,y+h))
def pick(f):
    USED.add('pick/'+f); return Image.open(os.path.join(PICK,f)).convert('RGBA')
def rfile(p):
    USED.add('repo/'+p); return Image.open(os.path.join(REPO,p)).convert('RGBA')
def up(im,k): return im if k==1 else im.resize((im.width*k,im.height*k),Image.NEAREST)   # 整數倍放大
def down(im,k): return im.reduce(k)  # 整數比縮小（1/k）
def bbox_crop(im): b=im.getbbox(); return im.crop(b) if b else im
HERO=bbox_crop(sheet('hero').crop((320,240,400,320)))
MON={k:bbox_crop(art(k)) for k in ['m_judge','m_paperdoll','m_ghostfire','m_jossfire','m_shanxiao','m_bajiajiang','m_lantern','m_stinkytofu','m_shigandang']}
BOSS=pick('boss_shang-s6921.png')
SK={'ammo':art('sk_apshot'),'reload':art('sk_apshot'),'gren':art('sk_combust'),'wind':art('sk_groundslam'),'flask':pick('sk_gasflask-s7311.png'),'cd':art('sk_fireburst')}
AURA_KEYS=['sk_anger','sk_hatred','sk_wrathaura','sk_grace','sk_determination','sk_discipline','sk_clarity','sk_zealotry','sk_hasteaura']
AURA=[art(k) for k in AURA_KEYS]
CUR={'金':pick('cur_gold-s5401-16x16.png'),'靈魂':pick('cur_soul-s5306.png'),'混沌':pick('cur_chaos-s5330-16x16.png'),'崇高':pick('cur_exalt-s5329-16x16.png')}
FLASK={'hp':pick('flask_hp-s5312-24.png'),'mp':pick('flask_mp-s5316-24.png')}
WY=pick('wangyin_chixiao_16-s5404.png')
AIL={k:pick(f) for k,f in [('rage','ail_rage-s7038.png'),('cons','ail_cons-s9094.png'),('exp','ail_exp-s7032.png'),('bleed','ail_bleed-s7004.png'),
     ('poison','ail_poison-s7007.png'),('ign','ail_ign-s7001.png'),('chill','ail_chill-s7011.png'),('shock','ail_shock-s7017.png'),('wither','ail_wither-s7025.png'),('pin','ail_pin-s9098.png')]}
NEG={'bleed','poison','ign','chill','shock','wither','pin'}
STATUS={'normal':['rage','cons','exp','bleed'],'boss':['rage','cons','exp','wither','shock'],'lowhp':['rage','cons','bleed','poison','ign','chill'],
        'lootflood':['rage','cons','exp','bleed','poison','ign','chill','shock','wither','pin'],'collapsed':['rage','cons','exp','bleed']}
ITEM={'helm':art('gear_helm_0'),'amulet':art('gear_amulet_0'),'ring':art('gear_ring_0'),'sword':art('gear_weapon_0'),'chaos':art('cur_chaos'),'exalt':art('cur_exalt'),'gold':art('mat_gold'),'potion':art('it_potion'),'wy':up(WY,2)}
TABI=[art('gear_amulet_0'),art('gear_helm_0'),art('gear_weapon_0'),art('cur_exalt'),art('cur_soul'),sheet('ic_gear-7').crop((33,0,65,32)),art('cur_chaos')]
FLOOR=pick('tile_d2_battle_floor-s5201.png').convert('RGB'); WTOP=pick('tile_d2_walltop-s5221-32x32-repost.png').convert('RGB'); WFACE=pick('tile_d2_wallface-prog-a.png').convert('RGB')
LANTERN=pick('prop_lantern-s5243-32x32.png'); JOSS=pick('prop_joss-s5247-32x32.png'); ASH=pick('prop_ash-s5244-32x32.png')
BEAM=bbox_crop(rfile('art/fx/sig_beam/dpoe-sig-beam.png').crop((0,0,32,96)))
CHRING=bbox_crop(rfile('art/fx/sig_chase/dpoe-sig-chase.png').crop((0,128,128,256)))
FIRE=bbox_crop(rfile('art/fx/fireball/dpoe-fireball.png').crop((0,0,64,64)))
FROST=bbox_crop(rfile('art/fx/frostbolt/dpoe-frostbolt.png').crop((0,0,64,64)))
VOID=bbox_crop(rfile('art/fx/void/dpoe-void.png').crop((0,0,64,64)))
# ---------------- 小工具
def tint(sp,col,alpha=1.0):
    a=np.asarray(sp,dtype=float); cc=np.array(c(col)[:3],float)
    lum=(a[...,:3]*[0.299,0.587,0.114]).sum(-1,keepdims=True)/255
    a[...,:3]=np.clip(cc*(0.35+0.85*lum),0,255); a[...,3]*=alpha
    return Image.fromarray(a.astype(np.uint8),'RGBA')
def rim(sp,col):
    al=sp.split()[3].point(lambda v:255 if v>60 else 0); big=al.filter(ImageFilter.MaxFilter(3))
    o=Image.new('RGBA',(sp.width+2,sp.height+2),(0,0,0,0)); r=Image.new('RGBA',o.size,c(col))
    m=Image.new('L',o.size,0); m.paste(big,(1,1)); o.paste(r,(0,0),m.filter(ImageFilter.MaxFilter(3))); o.alpha_composite(sp,(1,1)); return o
def alpha_img(im,a):
    x=np.asarray(im).copy(); x[...,3]=(x[...,3].astype(float)*a).astype(np.uint8); return Image.fromarray(x,'RGBA')
def text(d,xy,s,sz,col,w=400,anchor='la',mono=False,stroke=0,shadow=False,log=None):
    f=F(sz,w,mono); fill=c(col) if isinstance(col,str) else col
    if shadow: d.text((xy[0],xy[1]+1),s,font=f,fill=c('scrim'),anchor=anchor)
    if stroke: d.text(xy,s,font=f,fill=fill,anchor=anchor,stroke_width=stroke,stroke_fill=c('dmg-outline'))
    else: d.text(xy,s,font=f,fill=fill,anchor=anchor)
    bb=d.textbbox(xy,s,font=f,anchor=anchor,stroke_width=stroke)
    if log: TEXTLOG.append(dict(id=log[0],box=log[1],ink=bb,txt=s,col=col,sz=sz,w=w))
    return bb
def tw(s,sz,w=400,mono=False): return F(sz,w,mono).getlength(s)
def fit(s,sz,w,maxw,mono=False):
    if tw(s,sz,w,mono)<=maxw: return s
    while s and tw(s+'…',sz,w,mono)>maxw: s=s[:-1]
    return s+'…'
def R(e): return e['x0'],e['y0'],e['x1'],e['y1']
OCC=[]; FIELD=[0,0,0,0]
def hit(b): return any(not(b[2]<=o[0] or b[0]>=o[2] or b[3]<=o[1] or b[1]>=o[3]) for o in OCC)
def place_num(d,x,y,s,sz,col,cands=((0,0),(0,-16),(24,-8),(-30,-8),(0,14),(40,0),(-50,0),(0,-30))):
    for dx,dy in cands:
        b=d.textbbox((x+dx,y+dy),s,font=F(sz,700),stroke_width=2); b=(b[0]-2,b[1]-2,b[2]+2,b[3]+2)
        if not hit(b) and b[0]>=2 and b[2]<=FIELD[2]-2 and b[1]>=FIELD[1]+2 and b[3]<=FIELD[3]-2: text(d,(x+dx,y+dy),s,sz,col,700,stroke=2); OCC.append(b); return True
    return False
def rect(d,x0,y0,x1,y1,fill=None,outline=None,width=1,r=0):
    b=(x0,y0,x1-1,y1-1)   # CSS 框 [x0,x1) → PIL 含端點
    if r: d.rounded_rectangle(b,r,fill=fill,outline=outline,width=width)
    else: d.rectangle(b,fill=fill,outline=outline,width=width)
def placeholder(img,d,x0,y0,x1,y1,what):
    rect(d,x0,y0,x1,y1,fill=c('panel-raised'),outline=c('border'))
    text(d,(x0+2,y0+1),'佔位',9,'tx-dim'); PLACEHOLDERS.append(what)
def prefix(img,d,x,cy,r_,sz):
    """稀有 ◆／傳奇 ◈ 用圖形畫（不用字型），追逐＝王印 16。回傳佔用寬度。"""
    col=c(RAR[r_]); h=sz//2-1; cx=x+h
    if r_=='rare': d.polygon([(cx,cy-h),(cx+h,cy),(cx,cy+h),(cx-h,cy)],fill=col); return 2*h+4
    if r_=='unique':
        d.polygon([(cx,cy-h),(cx+h,cy),(cx,cy+h),(cx-h,cy)],outline=col); k=h-3
        d.polygon([(cx,cy-k),(cx+k,cy),(cx,cy+k),(cx-k,cy)],fill=col); return 2*h+4
    if r_=='chase': img.alpha_composite(WY,(int(x),int(cy-8))); return 19
    return 0
def tri_down(d,cx,cy,w,h,col): d.polygon([(cx-w/2,cy-h/2),(cx+w/2,cy-h/2),(cx,cy+h/2)],fill=col)
def tri_up(d,cx,cy,w,h,col): d.polygon([(cx-w/2,cy+h/2),(cx+w/2,cy+h/2),(cx,cy-h/2)],fill=col)
def panel_1plus(img,x0,y0,x1,y1,sides='tlr',r=0):
    """面板 1+：--panel 底、上緣 --panel-grad-top → 40% 高處 --panel 線性漸層、1px --panel-edge 外框（碰螢幕邊不畫）、上緣內側 1px --panel-hi。"""
    w,h=x1-x0,y1-y0; lay=Image.new('RGBA',(w,h),c('panel')); ld=ImageDraw.Draw(lay)
    a=np.array(c('panel-grad-top')[:3],float); b=np.array(c('panel')[:3],float); g=int(h*0.4)
    for yy in range(g): t=yy/max(1,g-1); ld.line((0,yy,w,yy),fill=tuple(int(round(v)) for v in a*(1-t)+b*t)+(255,))
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),r,fill=255) if r else m.paste(255,(0,0,w,h))
    img.paste(lay,(x0,y0),m); d=ImageDraw.Draw(img,'RGBA'); E=c('panel-edge')
    if r and sides=='tlrb':
        d.rounded_rectangle((x0,y0,x1-1,y1-1),r,outline=E); d.line((x0+r,y0+1,x1-1-r,y0+1),fill=c('panel-hi'))
    else:
        if 't' in sides: d.line((x0,y0,x1-1,y0),fill=E); d.line((x0+1,y0+1,x1-2,y0+1),fill=c('panel-hi'))
        if 'l' in sides: d.line((x0,y0,x0,y1-1),fill=E)
        if 'r' in sides: d.line((x1-1,y0,x1-1,y1-1),fill=E)
        if 'b' in sides: d.line((x0,y1-1,x1-1,y1-1),fill=E)
# ================= 戰場（world 層：只驗規則，位置照元件清單的 W 框）=================
def find(E,pfx,name_has=None,idsfx=None):
    for e in E:
        if idsfx and e['id'].endswith(idsfx): return e
        if name_has and name_has in e['name']: return e
    return None
DROPMAP={'判官烏紗':('unique','helm'),'王印・赤霄':('chase','wy'),'厲鬼護符':('rare','amulet'),'寒鐵之戒':('magic','ring'),'崇高石':('magic','exalt'),
         '混沌石×3':('normal','chaos'),'鏽蝕長劍':('normal','sword'),'冥河斬馬刀':('rare','sword'),'金幣×412':('normal','gold')}
FLOOD=[('混沌石','normal','chaos'),('寒鐵之戒','magic','ring'),('崇高石','magic','exalt'),('鏽蝕長劍','normal','sword'),('金幣×86','normal','gold'),('寒鐵之戒','magic','ring'),('混沌石','normal','chaos')]
DROPICON={'判官烏紗':'helm','王印・赤霄':'wy','厲鬼護符':'amulet','寒鐵之戒':'ring','崇高石':'exalt','混沌石 ×3':'chaos','混沌石':'chaos',
          '鏽蝕長劍':'sword','冥河斬馬刀':'sword','金 ×412':'gold','金 ×86':'gold'}
def drops_of(E):
    """名稱與稀有度照 gen_battle_hud（DROP_RAR）；寬已由產生器算好（記號＋字＋左右 6，最寬 140）。"""
    out=[]
    for e in E:
        if not e['name'].startswith('掉落牌') or e['layer']!='world': continue
        n=e['name'][4:].strip()
        for m in ('（傳奇）','（追逐）',' ◆'): n=n.replace(m,'')
        out.append((e,n,G.DROP_RAR[n],DROPICON[n]))
    return out
def beam(col,h):
    b=tint(BEAM,col,0.85).resize((BEAM.width,h),Image.NEAREST)   # 拉長＝連續，不斷
    a=np.asarray(b)[...,3]>40; W_=b.width+4; ee=np.zeros((h,W_),bool); ee[:,2:-2]=a
    big=ee.copy()
    for dx in (-2,-1,1,2): big|=np.roll(ee,dx,axis=1)
    e=np.zeros((h,W_,4),np.uint8); e[big&~ee]=c('beam-edge'); o=Image.fromarray(e,'RGBA'); o.alpha_composite(b,(2,0)); return o
BEAMH={'rare':64,'unique':96,'chase':176}
def scene(img,E,size,state):
    W,H=img.size; port=size=='390x844'
    reg=[e for e in E if e['kind']=='region'][0]; fx0,fy0,fx1,fy1=R(reg)
    FIELD[:]=[fx0,fy0,fx1,fy1]; OCC.clear(); OCC.extend([R(e) for e in E if e['layer']=='hud' and e['kind'].split(':')[0] not in('region','zone','line')])
    OCC.extend([(e['x0']-4,e['y0']-30,e['x1']+4,e['y1']) for e in E if e['layer']=='world' and e['name'].startswith('掉落牌')])
    for e in E:
        if e['layer']=='world' and e['name'].startswith('菁英名牌'): OCC.append((e['x0']-10,e['y0'],e['x1']+10,e['y1']))
    rng=np.random.default_rng(11 if port else 13); random.seed(5)
    # 地面：D2 地磚 32 → 2 倍 64（整數倍），隨機翻轉
    fl=Image.new('RGB',(fx1-fx0,fy1-fy0))
    for j in range(0,fy1-fy0,64):
        for i in range(0,fx1-fx0,64):
            t=FLOOR
            if rng.random()<.5: t=t.transpose(Image.FLIP_LEFT_RIGHT)
            if rng.random()<.5: t=t.transpose(Image.FLIP_TOP_BOTTOM)
            fl.paste(up(t,2),(i,j))
    img.paste(fl,(fx0,fy0))
    w01=[e for e in E if e['id'].endswith('W01')][0]; wx0,wy0,wx1,wy1=R(w01); wh=wy1-wy0
    for i in range(0,W,32):   # 牆頂 32＋牆面 18（1 倍）
        top=WTOP if wh>=50 else WTOP.crop((0,32-(wh-18),32,32))
        img.paste(top,(i,wy0)); img.paste(WFACE,(i,wy0+top.height))
    d=ImageDraw.Draw(img,'RGBA')
    # 燈籠（場景裝飾）＋光暈 --scene-lamp-glow 16%
    lx=[int(W*0.07),int(W*0.93)]+([int(W*0.36),int(W*0.64)] if not port else [])
    glow=Image.new('RGBA',img.size,(0,0,0,0)); gd=ImageDraw.Draw(glow)
    for x in lx:
        for r_ in range(60,0,-6): gd.ellipse((x-r_*1.4,wy1-6-r_,x+r_*1.4,wy1-6+r_),fill=c('scene-lamp-glow',int(255*0.16*(1-r_/60)**0.7)))
    m=Image.new('L',img.size,0); ImageDraw.Draw(m).rectangle((fx0,fy0,fx1-1,fy1-1),fill=255); g2=Image.new('RGBA',img.size,(0,0,0,0)); g2.paste(glow,(0,0),m); img.alpha_composite(g2)
    for x in lx: img.alpha_composite(LANTERN,(x-16,wy0+4))
    # 地上道具（灰燼、紙錢堆）
    props=[(ASH,40,170),(JOSS,330,250)] if port else [(ASH,150,140),(JOSS,1120,180),(ASH,980,620),(JOSS,240,380)]
    if port and state=='collapsed': props+=[(ASH,300,470),(JOSS,40,600)]
    for sp,x,y in props: img.alpha_composite(sp,(x,y))
    hero=[e for e in E if e['id'].endswith('W02')][0]; hx=(hero['x0']+hero['x1'])//2; hb=hero['y1']
    boss=find(E,None,'王＋判決圈'); elite=find(E,None,'菁英名牌')
    # 敵人位置（腳底中心）
    if port:
        mons=[('m_paperdoll',62,236),('m_ghostfire',326,232),('m_shanxiao',58,336),('m_bajiajiang',334,338),('m_stinkytofu',262,300),('m_jossfire',118,286)]
        if state=='collapsed': mons=[('m_ghostfire',326,232),('m_stinkytofu',262,300),('m_bajiajiang',334,338),('m_shanxiao',58,336),('m_jossfire',170,336),('m_lantern',320,470),('m_shigandang',70,480),('m_paperdoll',196,520)]
    else:
        mons=[('m_paperdoll',470,300),('m_ghostfire',822,300),('m_shanxiao',420,430),('m_bajiajiang',868,440),('m_stinkytofu',740,480),('m_jossfire',540,420),
              ('m_shigandang',300,330),('m_lantern',1010,330),('m_paperdoll',1150,250),('m_ghostfire',150,300),('m_shanxiao',760,200)]
    tel=Image.new('RGBA',img.size,(0,0,0,0)); td=ImageDraw.Draw(tel); lines=[]
    if boss:
        bx0,by0,bx1,by1=R(boss); circ=(bx0,by1-44,bx1-1,by1-1)
        td.ellipse(circ,fill=c('enemy-tel',int(255*0.55))); lines.append(('ell',circ))
    if elite:
        ex=(elite['x0']+elite['x1'])//2; ey=elite['y1']+66
        R1=96 if port else 120; ang=range(58,123,4)
        if port and state=='collapsed': ang=range(-20,30,4); ex-=10
        pts=[(ex,ey)]+[(ex+R1*math.cos(math.radians(a)),ey+R1*math.sin(math.radians(a))) for a in ang]
        td.polygon(pts,fill=c('enemy-tel',int(255*0.55))); lines.append(('poly',pts))
    if state=='lowhp':
        gx,gy=hx+(58 if port else 90),hb-6; circ=(gx-34,gy-17,gx+34,gy+17)
        td.ellipse(circ,fill=c('enemy-tel',int(255*0.55))); lines.append(('ell',circ))
    img.alpha_composite(tel); d=ImageDraw.Draw(img,'RGBA')
    for k,g in lines:   # 預警線 3 px＋外 1 px #000
        if k=='ell':
            d.ellipse((g[0]-1,g[1]-1,g[2]+1,g[3]+1),outline=(0,0,0,255),width=5); d.ellipse(g,outline=c('enemy-tel'),width=3)
        else:
            d.line(g+[g[0]],fill=(0,0,0,255),width=5,joint='curve'); d.line(g+[g[0]],fill=c('enemy-tel'),width=3,joint='curve')
    # 掉落：光柱（稀有 64／傳奇 96／追逐 176，兩側 2 px 80% 黑邊）＋圖示，牌最後畫
    DR=drops_of(E)
    for e,nm,r_,ic in DR:
        X=(e['x0']+e['x1'])//2; Y=e['y0']-2
        if r_ in BEAMH:
            if r_=='chase':
                rg=tint(CHRING,'rar-chase',0.85); rg=rg.crop((0,int(rg.height*0.62),rg.width,rg.height)); rg=down(rg,2); img.alpha_composite(rg,(X-rg.width//2,Y-rg.height//2-4))
            b=beam(RAR[r_],BEAMH[r_]); top=Y-BEAMH[r_]+4
            if top<fy0: b=b.crop((0,fy0-top,b.width,b.height)); top=fy0
            img.alpha_composite(b,(X-b.width//2,top))
        icn=ITEM[ic]; img.alpha_composite(icn,(X-icn.width//2,Y-icn.height+2))
    # 敵人（1 px --enemy-rim 外框、頭上血條）
    for k,x,fy in mons:
        sp=rim(MON[k],'enemy-rim'); X,Y=x-sp.width//2,fy-sp.height
        d.ellipse((x-sp.width*0.38,fy-6,x+sp.width*0.38,fy+3),fill=(0,0,0,80)); img.alpha_composite(sp,(X,Y))
        bw=36; d.rectangle((x-bw//2-1,Y-7,x+bw//2,Y-3),fill=(0,0,0,255)); d.rectangle((x-bw//2,Y-6,x-bw//2+int(bw*(0.3+0.6*random.random())),Y-4),fill=c('hp'))
    if elite:
        ex=(elite['x0']+elite['x1'])//2; ex-=34 if port and state=='collapsed' else 0   # 390 收起：主角上移到 214–262，菁英站名牌下偏左（仍在名牌下）
        sp=rim(MON['m_judge'],'enemy-rim'); fy=elite['y1']+12+sp.height
        img.alpha_composite(sp,(ex-sp.width//2,fy-sp.height)); bw=52; Y=fy-sp.height
        OCC.append((ex-sp.width//2,fy-sp.height-8,ex+sp.width//2,fy))   # 菁英本身，跳數字與彈避開
        d.rectangle((ex-bw//2-1,Y-7,ex+bw//2,Y-3),fill=(0,0,0,255)); d.rectangle((ex-bw//2,Y-6,ex+4,Y-4),fill=c('hp'))
        # 菁英名牌：--plate-world＋--tx-strong＋菁英圖示 16（不用稀有度色）
        x0,y0,x1,y1=R(elite); sz=int(elite['font'].split('/')[0])
        rect(d,x0,y0,x1,y1,fill=c('plate-world'),r=3)
        ix=x0+G.PLATE_PAD; iy=(y0+y1)//2-8
        d.polygon([(ix,iy+4),(ix+3,iy),(ix+5,iy+5),(ix+11,iy+5),(ix+13,iy),(ix+16,iy+4),(ix+14,iy+13),(ix+8,iy+16),(ix+2,iy+13)],fill=c('tx-strong'))
        d.rectangle((ix+4,iy+8,ix+6,iy+10),fill=c('plate-world')); d.rectangle((ix+10,iy+8,ix+12,iy+10),fill=c('plate-world'))
        sz=int(elite['font'].split('/')[0]); lab=G.ELITE_LABEL; s_=fit(lab,sz,700,x1-G.PLATE_PAD-ix-20)
        if s_!=lab: WIDEN.append((elite['id'],'省略',lab))
        text(d,(ix+20,(y0+y1)/2),s_,sz,'tx-strong',700,anchor='lm')
    if boss:
        bx0,by0,bx1,by1=R(boss); sp=rim(up(bbox_crop(BOSS),2),'enemy-rim'); cx=(bx0+bx1)//2
        img.alpha_composite(sp,(cx-sp.width//2,by1-22-sp.height))
    # 主角：腳圈 4 px --hero-ring＋外 2 px #000；頭上 10×8 ▼ --focus
    rx0,rx1=hero['x0'],hero['x1']; ry0,ry1=hb-20,hb-2
    d.ellipse((rx0,ry0-2,rx1-1,ry1+2),outline=(0,0,0,255),width=8); d.ellipse((rx0+2,ry0,rx1-3,ry1),outline=c('hero-ring'),width=4)
    img.alpha_composite(HERO,(hx-HERO.width//2,hb-8-HERO.height)); ty=hb-8-HERO.height-12
    d.polygon([(hx-5,ty),(hx+5,ty),(hx,ty+8)],fill=c('focus'),outline=(0,0,0,255))
    # 彈幕：敵方彈（現有 fireball／frostbolt 貼圖，原色）；我方特效 --fx-own 9%（灰階上限 #c6c6c6）
    shots=[(FIRE,True,hx+70,hb-70),(FROST,True,hx+110,hb-40),(FIRE,False,hx-90,hb-60),(FIRE,False,hx-60,hb-120)] if port else \
          [(FIRE,True,hx+120,hb-80),(FROST,True,hx+200,hb-30),(FIRE,False,hx-150,hb-70),(FIRE,False,hx-90,hb-150),(FROST,False,hx-210,hb+40),(FIRE,True,hx+60,hb-170)]
    for sp,flip,x,y in shots:
        s_=sp.transpose(Image.FLIP_LEFT_RIGHT) if flip else sp
        for dy in (0,20,-20,40,-40,60):
            b=(x-s_.width//2,y+dy-s_.height//2,x+s_.width//2,y+dy+s_.height//2)
            if not hit(b): img.alpha_composite(s_,(b[0],b[1])); break
    base=np.asarray(img).astype(float); FV=np.zeros(base.shape[:2]); FA=np.zeros(base.shape[:2])
    for i,ang in enumerate(range(0,360,45)):
        dist=48+(i%3)*18; px=int(hx+dist*math.cos(math.radians(ang))); py=int(hb-24+dist*0.7*math.sin(math.radians(ang)))
        s=[FIRE,FROST,VOID][i%3]; a=np.asarray(s).astype(float); lum=(a[...,:3]*[0.299,0.587,0.114]).sum(-1)/255
        v=np.minimum(198.0,198.0*(0.35+0.65*lum)); al=a[...,3]/255*0.09
        x0,y0=px-s.width//2,py-s.height//2; xs,ys=max(0,x0),max(0,y0); xe,ye=min(W,x0+s.width),min(H,y0+s.height)
        sv=v[ys-y0:ye-y0,xs-x0:xe-x0]; sa=al[ys-y0:ye-y0,xs-x0:xe-x0]; mm=sa>0
        FV[ys:ye,xs:xe]=np.where(mm,np.maximum(FV[ys:ye,xs:xe],sv),FV[ys:ye,xs:xe]); FA[ys:ye,xs:xe]=np.maximum(FA[ys:ye,xs:xe],sa)
    base[...,:3]=base[...,:3]*(1-FA[...,None])+FV[...,None]*FA[...,None]
    img.paste(Image.fromarray(np.clip(base+0.5,0,255).astype(np.uint8),'RGBA'),(0,0)); d=ImageDraw.Draw(img,'RGBA')
    # 掉落牌：--plate-world＋稀有度框（稀有以上 1 px）＋前綴＋稀有度色字
    for e,nm,r_,ic in DR:
        x0,y0,x1,y1=R(e); sz=int(e['font'].split('/')[0]); fr=c(RAR[r_]) if r_ in('rare','unique','chase') else None
        rect(d,x0,y0,x1,y1,fill=c('plate-world'),outline=fr,r=2)
        P=G.PLATE_PAD; cy=(y0+y1)/2; pw=prefix(img,d,x0+P,cy,r_,sz); s=fit(nm,sz,400,x1-x0-2*P-pw)
        if s!=nm: WIDEN.append((e['id'],'省略',nm))   # 只有超過 140 才會發生
        text(d,(x0+P+pw,cy),s,sz,RAR[r_],anchor='lm')
    # 跳數字：一般 15 --dmg-hit、暴擊 24 --dmg-crit、受傷 0.8 倍 --dmg-hurt；全部 2 px 黑描邊
    vals=['1,284','846','512','903','377','1,120','688','455','731','264','590']
    OCC.append((hx-22,hb-62,hx+22,hb))   # 主角本身
    if elite: ex=(elite['x0']+elite['x1'])//2; place_num(d,max(4,ex-(170 if not port else 150)),elite['y1']+44,'暴擊 4,812',24,'dmg-crit',((0,0),(0,30),(0,-20),(20,60),(0,110),(150,130)))
    if boss: place_num(d,boss['x0']-(0 if port else 40),boss['y0']+(4 if port else 20),'暴擊 6,240',24,'dmg-crit',((0,0),(-100,40),(0,-30),(140,-10),(-110,70)))
    place_num(d,hx-48,hb-76,'−312',12,'dmg-hurt'); place_num(d,hx+24,hb-64,'−87',12,'dmg-hurt')
    for (k,x,fy),v in zip(mons,vals): place_num(d,x+10,fy-MON[k].height-24,v,15,'dmg-hit')
    return d
# ================= HUD（hud 層：座標照元件清單，疊圖 ≤1 px）=================
PICKUP=[('chase','王印・赤霄'),('unique','判官烏紗'),('rare','厲鬼護符'),('magic','寒鐵之戒'),('normal','混沌石 ×3'),('normal','鏽蝕長劍')]
def fsz(e,default=14):
    m=re.search(r'(\d+)/(\d+)',e['font']); return (int(m.group(1)),int(m.group(2))) if m else (default,400)
def skillcell(img,d,e,var,port):
    x0,y0,x1,y1=R(e); s=x1-x0; nsz=14 if s==44 else 16
    rect(d,x0,y0,x1,y1,fill=c('panel-raised'),outline=c('border'))
    ic=SK[var]
    if var=='reload': ic=alpha_img(ic,0.45)
    img.alpha_composite(ic,(x0+(s-32)//2,y0+(s-32)//2))
    def badge(t,wide=False):
        bx0=x0+(s-17 if s==44 else s-19) if not wide else x0+(s-29 if s==44 else s-31); bx1=x0+s-2; by0=y0+2; by1=y0+(18 if s==44 else 21)
        d.rectangle((bx0,by0,bx1-1,by1-1),fill=c('panel-inset'),outline=c('border'))
        text(d,((bx0+bx1)/2,(by0+by1)/2),t,nsz,'tx-strong',700,anchor='mm',log=(e['id']+'#n',(bx0,by0,bx1,by1)))
    pw=34; px0=x0+(s-pw)//2; py=y1-8
    if var in('ammo','reload'):
        for k in range(6):
            b=(px0+k*6,py,px0+k*6+3,py+3)
            if var=='ammo' and k<4: d.rectangle(b,fill=c('tx-strong'))
            else: d.rectangle(b,outline=c('border'),fill=c('panel-inset'))
        if var=='ammo': badge('4')
        else:
            for a0 in range(0,360,30): d.arc((x0-3,y0-3,x1+2,y1+2),a0,a0+18,fill=c('tx-strong'),width=2)   # 裝填環
            text(d,((x0+x1)/2,(y0+y1)/2-2),'裝填',14 if s==44 else 16,'tx-strong',700,anchor='mm',stroke=1,log=(e['id']+'#t',(x0,y0,x1,y1)))
    if var=='gren':
        cx=x0+(s-17)//2; d.rectangle((cx,y1-14,cx+6,y1-8),fill=c('tx-strong')); d.rectangle((cx+10,y1-14,cx+16,y1-8),outline=c('border'),fill=c('panel-inset'))
        d.rectangle((x0+1,y1-3,x0+1+int((s-2)*0.6),y1-2),fill=c('prog-hi')); badge('1')
    if var=='wind':
        # 蓄力 3 段弧：格外 2 px，段間 4 px；到了 2 px --tx-strong，未到 1 px --border
        o=2; bb=(x0-o-1,y0-o-1,x1+o,y1+o)
        for k in range(3):
            a0=-90+k*120+6; a1=a0+108
            if k<2: d.arc(bb,a0,a1,fill=c('tx-strong'),width=2)
            else: d.arc(bb,a0,a1,fill=c('border'),width=1)
        badge('2/3',wide=True)
    if var=='flask': badge('3')
    if var=='cd':
        ov=Image.new('RGBA',img.size,(0,0,0,0)); ImageDraw.Draw(ov).rectangle((x0+1,y0+1,x1-2,y0+int(s*0.55)),fill=(10,7,4,150)); img.alpha_composite(ov)
        d=ImageDraw.Draw(img,'RGBA'); text(d,((x0+x1)/2,(y0+y1)/2),'2.4',16,'tx-strong',700,anchor='mm',stroke=1,log=(e['id']+'#cd',(x0,y0,x1,y1)))
    if '[' in e['name']:   # 鍵帽 12
        k=e['name'].split('[')[1][0]; d.rectangle((x0+2,y0+2,x0+16,y0+16),fill=c('panel-inset'),outline=c('border'))
        text(d,(x0+9,y0+9),k,12,'tx',400,anchor='mm',log=(e['id']+'#key',(x0+2,y0+2,x0+16,y0+16)))
    return ImageDraw.Draw(img,'RGBA')
def aurarow(img,d,e,port):
    x0,y0,x1,y1=R(e); _,sz,n=e['kind'].split(':'); sz=int(sz); n=int(n)
    show=n if n<=7 else 6
    for i in range(show):
        x=x0+i*(sz+2); rect(d,x,y0,x+sz,y0+sz,fill=c('panel-inset'),outline=c('panel-edge'))
        ic=down(AURA[i],4); img.alpha_composite(ic,(x+(sz-8)//2,y0+(sz-8)//2))   # 32→8（整數比 1/4）
    if n>7:
        k=n-6; x=x0+show*(sz+2); fs=14 if sz==12 else 16; t=f'+{k}'; w=int(tw(t,fs,700))+4
        rect(d,x-1,y0-(fs-sz)//2-2,x+w,y0+sz+(fs-sz)//2+2,fill=c('plate-world'),r=2)
        text(d,(x+1,y0+sz/2),t,fs,'tx-strong',700,anchor='lm',log=(e['id']+'#k',(x-1,y0-4,x+w,y0+sz+4)))
def status(img,d,e,idx,state):
    lst=STATUS[state]; x0,y0,x1,y1=R(e)
    if idx>=len(lst): return
    if idx==7 and len(lst)>8:
        rect(d,x0,y0,x1,y1,fill=c('panel-inset'),outline=c('border')); fs=14 if x1-x0==24 else 16
        text(d,((x0+x1)/2,(y0+y1)/2),f'+{len(lst)-7}',fs,'tx-strong',700,anchor='mm',log=(e['id'],R(e))); return
    k=lst[idx]; neg=k in NEG
    cell=Image.new('RGBA',(x1-x0,y1-y0),(0,0,0,0)); cd=ImageDraw.Draw(cell)
    cd.rectangle((0,0,x1-x0-1,y1-y0-1),fill=c('panel-inset'),outline=c('bad-hi') if neg else c('border'))
    cell.alpha_composite(AIL[k],((x1-x0-16)//2,(y1-y0-16)//2))
    img.alpha_composite(cell if neg else alpha_img(cell,0.70),(x0,y0))
def bar(img,d,e,kind,cur,mx,port,lab):
    x0,y0,x1,y1=R(e); rect(d,x0,y0,x1,y1,fill=c('panel-inset'),outline=c('border'))
    w=x1-x0-2; d.rectangle((x0+1,y0+1,x0+1+int(w*cur/mx)-1,y1-2),fill=c(kind))
    fs,fw=fsz(e); fs=min(fs,y1-y0-2)
    text(d,((x0+x1)/2,(y0+y1)/2),f'{lab} {cur} / {mx}',fs,'tx-strong',700,anchor='mm',shadow=True,log=(e['id'],R(e)))
def potion(img,d,e,kind,cdfrac,port):
    x0,y0,x1,y1=R(e); b=(x0,y0,x1-1,y1-1)
    d.ellipse(b,fill=c('panel-raised')); ic=down(FLASK[kind],2); img.alpha_composite(ic,((x0+x1)//2-6,(y0+y1)//2-6))
    d.ellipse((x0-1,y0-1,x1,y1),outline=(0,0,0,255),width=1)   # 外 1 px #000
    d.ellipse(b,outline=c('panel-inset'),width=2)               # 軌道
    if cdfrac>0: d.arc(b,-90,-90+360*cdfrac,fill=c(kind+'-hi'),width=2)
    else: d.ellipse(b,outline=c(kind+'-hi'),width=2)
    if '[' in e['name']:
        k=e['name'].split('[')[1][0]; kb=(x1-6,y1-8,x1+6,y1+4) if x1-x0<=24 else (x1-10,y1-10,x1+4,y1+4)
        d.rectangle(kb,fill=c('panel-inset'),outline=c('border')); text(d,((kb[0]+kb[2]+1)/2,(kb[1]+kb[3]+1)/2),k,10,'tx',400,anchor='mm')
def btn(d,e,label,fs,fw,primary=False,sel=False,r=6):
    x0,y0,x1,y1=R(e)
    if primary:
        rect(d,x0,y0,x1,y1,fill=c('act'),outline=c('act-edge'),width=2,r=6); col='on-act'
    else:
        rect(d,x0,y0,x1,y1,fill=c('btn2'),outline=c('border'),r=r); col='tx-strong'
    if label: text(d,((x0+x1)/2,(y0+y1)/2),label,fs,col,fw,anchor='mm',log=(e['id'],R(e)))
def hud(img,E,size,state):
    port=size=='390x844'; d=ImageDraw.Draw(img,'RGBA'); W,H=img.size
    low=state=='lowhp'; hpcur=301 if low else 820
    order=sorted(E,key=lambda e:{'panel':0,'vig':1}.get(e['kind'].split(':')[0],2))
    prev=None
    for e in order:
        if e['layer']!='hud': continue
        if prev is not None: _foot(img,prev,pre)
        pre=np.asarray(img).copy(); prev=e; d=ImageDraw.Draw(img,'RGBA')
        i=e['id']; n=e['name']; k=e['kind'].split(':')[0]; x0,y0,x1,y1=R(e); fs,fw=fsz(e)
        if n.startswith('頂列'):
            rect(d,x0,y0,x1,y1,fill=c('panel')); d.line((x0,y1-1,x1-1,y1-1),fill=c('border'))
        elif n=='下方面板':
            panel_1plus(img,x0,y0,x1,y1,'t'); d=ImageDraw.Draw(img,'RGBA')
        elif n=='掉落面板':
            panel_1plus(img,x0,y0,x1,y1,'tlrb',r=6); d=ImageDraw.Draw(img,'RGBA')
        elif n=='掉落卡':
            rect(d,x0,y0,x1,y1,fill=c('panel-raised'),outline=c('border'),r=6)
        elif n.startswith('收起列'):
            if port: rect(d,x0,y0,x1,y1,fill=c('panel')); d.line((x0,y0,x1-1,y0),fill=c('border-mid'))
            else: rect(d,x0,y0,x1,y1,fill=c('panel'),outline=c('panel-edge'))
        elif n.startswith('通貨 '):
            cur=n.split(' ')[1]; v={'金':'12,480','靈魂':'3,209','混沌':'86','崇高':'4'}[cur]
            img.alpha_composite(CUR[cur],(x0+2,(y0+y1)//2-8)); text(d,(x0+22,(y0+y1)/2),v,fs,'tx-strong',700,anchor='lm',log=(i,R(e)))
        elif n.startswith('地點'):
            s1='酆都 14 層 '; text(d,(x1-tw('★3',fs,700)-tw(s1,fs),(y0+y1)/2),s1,fs,'tx-dim',anchor='lm',log=(i,R(e)))
            text(d,(x1-tw('★3',fs,700),(y0+y1)/2),'★3',fs,'tx-strong',700,anchor='lm')
        elif n.startswith('資訊列'):
            a='酆都・陰兵借道 '; b='★3'; cc=' 怪物 Lv 52'
            bb=text(d,(x0,(y0+y1)/2),a,fs,'tx',anchor='lm',log=(i,R(e))); xx=x0+tw(a,fs)
            text(d,(xx,(y0+y1)/2),b,fs,'tx-strong',700,anchor='lm'); xx+=tw(b,fs,700); text(d,(xx,(y0+y1)/2),cc,fs,'tx',anchor='lm')
        elif n.startswith('分頁 '):
            t=n.split(' ')[1]; sel=k=='act'; ti=G.TABS7.index(t)
            if port:
                rect(d,x0,y0,x1,y1,fill=c('sel-bg') if sel else c('panel'))
                if sel: d.rectangle((x0,y0,x1-1,y0+1),fill=c('focus'))
                else: d.line((x0,y0,x1-1,y0),fill=c('border'))
                ic=tint(down(TABI[ti],2),'tx-strong' if sel else 'tx-dim'); img.alpha_composite(ic,((x0+x1)//2-8,y0+9))
                text(d,((x0+x1)/2,y0+38),t,14,'tx-strong' if sel else 'tx-dim',700 if sel else 400,anchor='mm',log=(i,R(e)))
            else:
                if sel: rect(d,x0,y0,x1,y1,fill=c('sel-bg'),outline=c('sel-edge'),width=2,r=4)
                else: rect(d,x0,y0,x1,y1,fill=c('btn2'),outline=c('border'),r=4)
                key=G.TABKEY[ti]; lw=tw(t,16,700 if sel else 400); kw=14; gap=3; sx=(x0+x1)/2-(lw+gap+kw)/2
                text(d,(sx,(y0+y1)/2),t,16,'tx-strong' if sel else 'tx',700 if sel else 400,anchor='lm',log=(i,R(e)))
                kx=int(sx+lw+gap); ky=(y0+y1)//2-7; d.rectangle((kx,ky,kx+kw-1,ky+13),fill=c('panel-inset'),outline=c('border'))
                text(d,(kx+kw/2,ky+7),key,12,'tx',anchor='mm')
        elif n.startswith('本次掛機行'):
            parts=[('本次掛機 2 時 14 分・','tx-dim',400),('追逐保底 42%','tx-strong',700),('・目標 62%','tx-dim',400)]
            full=sum(tw(a,fs,w) for a,_,w in parts)
            if full>x1-x0: OVERFLOW.append((size,i,'「・目標 62%」放不下，收掉',int(full),x1-x0)); parts=parts[:2]
            xx=x0
            for s,col,w in parts:
                s2=fit(s,fs,w,x1-xx); text(d,(xx,(y0+y1)/2),s2,fs,col,w,anchor='lm',log=(i,R(e))); xx+=tw(s2,fs,w)
                if s2!=s: break
        elif n=='「本次掛機 2 時 14 分」':
            text(d,(x0,(y0+y1)/2),'本次掛機 2 時 14 分',fs,'tx-dim',anchor='lm',log=(i,R(e)))
        elif n.startswith('「追逐保底 42%'):
            full='追逐保底 42%・目標 長老屋 Lv7 62%'; s=full
            if tw(full,fs,700)>x1-x0-20: s='追逐保底 42%・目標 62%'; OVERFLOW.append((size,i,'目標名「長老屋 Lv7」放不下，先收（照 P43 規則）',int(tw(full,fs,700)+20),x1-x0))
            img.alpha_composite(WY,(x0,(y0+y1)//2-8)); s=fit(s,fs,700,x1-x0-20)
            text(d,(x0+20,(y0+y1)/2),s,fs,'tx-strong',700,anchor='lm',log=(i,R(e)))
        elif n.startswith('拾取 '):
            r_,t=PICKUP[int(n.split(' ')[1])-1]; cy=(y0+y1)/2
            text(d,(x0,cy),'拾取',fs,'tx-dim',anchor='lm',log=(i,R(e))); xx=x0+tw('拾取',fs)+8
            xx+=prefix(img,d,xx,cy,r_,fs); text(d,(xx,cy),fit(t,fs,400,x1-xx),fs,RAR[r_],anchor='lm')
        elif n=='「+38 件已收」':
            text(d,(x0,(y0+y1)/2),'+38 件已收',fs,'tx-dim',anchor='lm',log=(i,R(e)))
        elif n.startswith('「比較'):
            text(d,(x0,(y0+y1)/2),'比較 判官烏紗',fs,'tx-dim',anchor='lm',log=(i,R(e)))
        elif n.startswith('▲ ') or n.startswith('▼ '):
            col='good' if n.startswith('▲') else 'bad'; cy=(y0+y1)/2; g=fs*0.6
            (tri_up if n.startswith('▲') else tri_down)(d,x0+g/2+1,cy,g,g*0.85,c(col))
            text(d,(x0+g+5,cy),n[2:],fs,col,anchor='lm',log=(i,R(e)))
        elif n=='「⚠ 倉庫 96%」':
            text(d,(x0,(y0+y1)/2),'⚠ 倉庫 96%',fs,'warn',anchor='lm',log=(i,R(e)))
        elif n=='整理倉庫' or n=='自動': btn(d,e,n,fs,fw)
        elif n.startswith('去營地'): btn(d,e,'去營地',fs,fw,primary=True)
        elif n.startswith('收起 ▼'):
            btn(d,e,None,0,0,r=4); tri_down(d,(x0+x1)/2,(y0+y1)/2,10,7,c('tx-strong'))
        elif n.startswith('展開 ▲'):
            btn(d,e,None,0,0,r=0 if port else 6); tri_up(d,(x0+x1)/2,(y0+y1)/2,10,7,c('tx-strong'))
        elif k=='cell':
            d=skillcell(img,d,e,e['kind'].split(':')[1],port)
        elif k=='aurarow': aurarow(img,d,e,port)
        elif n.startswith('狀態圖示'): status(img,d,e,int(n.split(' ')[1])-1,state)
        elif n.startswith('生命條「'): bar(img,d,e,'hp',hpcur,968,port,'生命')
        elif n=='魔力條': bar(img,d,e,'mp',212,287,port,'魔力')
        elif n.startswith('藥劑 生命'): potion(img,d,e,'hp',0.62,port)
        elif n.startswith('藥劑 魔力'): potion(img,d,e,'mp',0,port)
        elif n=='小地圖':
            rect(d,x0,y0,x1,y1,fill=c('panel'),outline=c('border')); rect(d,x0+8,y0+8,x1-8,y1-8,fill=c('scene-mid'))
            cx,cy=(x0+x1)//2,(y0+y1)//2
            for dx,dy,col in [(30,-20,'rar-chase'),(-40,10,'rar-unique'),(20,25,'rar-rare'),(-20,-28,'enemy-tel'),(52,8,'enemy-tel'),(-58,-12,'enemy-tel')]: d.rectangle((cx+dx-2,cy+dy-2,cx+dx+1,cy+dy+1),fill=c(col))
            d.rectangle((cx-2,cy-2,cx+1,cy+1),fill=c('focus'))
        elif n.startswith('王血條底板'): rect(d,x0,y0,x1,y1,fill=c('plate-world'),r=3)
        elif n=='王名＋王血條':
            rect(d,x0,y0,x1,y1,fill=c('panel-inset'))
            nm='上尸'; nw=tw(nm,fs,700)+10; text(d,(x0+2,(y0+y1)/2),nm,fs,'tx-strong',700,anchor='lm',log=(i,R(e)))
            bx=int(x0+nw); rect(d,bx,y0+3,x1,y1-3,fill=c('panel-inset'),outline=c('border')); d.rectangle((bx+1,y0+4,bx+1+int((x1-bx-2)*0.68)-1,y1-5),fill=c('hp'))
        elif n.startswith('大招警示'):
            rect(d,x0,y0,x1,y1,fill=c('panel-inset'),outline=c('bad-hi'),width=2)
            text(d,((x0+x1)/2,(y0+y1)/2-2),'大招',fs,'bad-hi',700,anchor='mm',log=(i,R(e)))
            d.rectangle((x0+2,y1-6,x0+2+int((x1-x0-4)*0.55)-1,y1-3),fill=c('bad-hi'))   # 倒數條 4 高，由右往左縮
        elif n.startswith('工具提示'):
            rect(d,x0,y0,x1,y1,fill=c('panel-raised'),outline=c('panel-edge'),r=4)
            text(d,(x0+10,(y0+y1)/2),'彈匣 4／6 發・打完裝填 1.5 秒',fs,'tx',anchor='lm',log=(i,R(e)))
        elif k=='vig':
            ov=Image.new('RGBA',(x1-x0,y1-y0),(0,0,0,0)); od=ImageDraw.Draw(ov); side=n[-1]; L=24
            for t in range(L):
                a=int(255*0.60*(1-t/L)); col=c('vig',a)
                if side=='上': od.line((0,t,x1-x0,t),fill=col)
                if side=='下': od.line((0,y1-y0-1-t,x1-x0,y1-y0-1-t),fill=col)
                if side=='左': od.line((t,0,t,y1-y0),fill=col)
                if side=='右': od.line((x1-x0-1-t,0,x1-x0-1-t,y1-y0),fill=col)
            img.alpha_composite(ov,(x0,y0)); d=ImageDraw.Draw(img,'RGBA')
        elif n=='生命條低血外框': rect(d,x0,y0,x1,y1,outline=c('hp-hi'))
        elif n.startswith('目標細條'):
            rect(d,x0,y0,x1,y1,fill=c('good'))
        elif n=='「掛機 2 時 14 分」':
            full='掛機 2 時 14 分'; need=tw(full,fs,700,True)
            if need>x1-x0: OVERFLOW.append((size,i,f'「{full}」{fs}/700 等寬放不下',int(need),x1-x0))
            text(d,(x0,(y0+y1)/2),fit(full,fs,700,x1-x0,True),fs,'tx',700,anchor='lm',mono=True,log=(i,R(e)))
        elif n.startswith('王印 16＋'):
            need=19+tw('追逐保底 42%',fs,700,True)
            if need>x1-x0: OVERFLOW.append((size,i,f'王印 16＋「追逐保底 42%」{fs}/700 等寬放不下',int(need),x1-x0))
            img.alpha_composite(WY,(x0,(y0+y1)//2-8)); s=fit('追逐保底 42%',fs,700,x1-x0-19,mono=True)
            text(d,(x0+19,(y0+y1)/2),s,fs,'tx-strong',700,anchor='lm',mono=True,log=(i,R(e)))
        elif n.startswith('最近一筆稀有以上'):
            d.rectangle((x0,y0+1,x0+1,y1-2),fill=c('rar-unique')); xx=x0+5; cy=(y0+y1)/2
            xx+=prefix(img,d,xx,cy,'unique',fs)
            if tw('判官烏紗',fs,700)>x1-xx: OVERFLOW.append((size,i,'「判官烏紗」放不下→省略號（規格允許）',int(xx-x0+tw('判官烏紗',fs,700)),x1-x0))
            text(d,(xx,cy),fit('判官烏紗',fs,700,x1-xx),fs,'rar-unique',700,anchor='lm',log=(i,R(e)))
        else:
            if k not in('zone','line','region'): print('UNHANDLED',size,state,i,n)
    if prev is not None: _foot(img,prev,pre)
    return d
FOOT={}
def _foot(img,e,pre):
    post=np.asarray(img); m=(np.abs(post.astype(int)-pre.astype(int)).sum(-1)>0)
    ys,xs=np.nonzero(m); FOOT[e['id']]=None if len(xs)==0 else (int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1)
def stamp(img):
    d=ImageDraw.Draw(img,'RGBA'); W,H=img.size; fs=9; w=tw(STAMP,fs,700)
    X=W-6-w; Y=818 if W<500 else H-12
    rect(d,int(X-4),Y-2,int(X+w+4),Y+11,fill=c('plate-world'),outline=c('border'))
    text(d,(X,Y+4.5),STAMP,fs,'tx-strong',700,anchor='lm')
def safe_areas(img,E):
    d=ImageDraw.Draw(img,'RGBA')
    for e in E:
        if e['kind']=='zone' and e['name'].startswith('安全區'):
            x0,y0,x1,y1=R(e); rect(d,x0,y0,x1,y1,fill=c('scene-void'))
            if '下' in e['name']: d.rounded_rectangle(((x0+x1)//2-67,y1-13,(x0+x1)//2+67,y1-9),2,fill=c('tx-dim'))
            else:
                text(d,(32,24),'16:08',15,'tx',700,anchor='lm')
                for j,hh in enumerate((4,6,8,10)): d.rectangle((318+j*5,28-hh,320+j*5,28),fill=c('tx'))
                rect(d,340,18,364,30,outline=c('tx'),r=3); d.rectangle((342,20,357,28),fill=c('tx'))
def render(size,state):
    W,H=G.SIZES[size]; E=G.elements(size,state) if state!='collapsed' else G.elements_collapsed(size)
    img=Image.new('RGBA',(W,H),c('scene-void')); TEXTLOG.clear(); FOOT.clear()
    scene(img,E,size,state); hud(img,E,size,state)
    if size=='390x844': safe_areas(img,E)
    stamp(img); return img.convert('RGB'),E,list(TEXTLOG)
SNAME={'normal':'一般（光環 7 個）','boss':'王＋大招預兆','lowhp':'低血（生命 301 / 968）','lootflood':'掉落洪水（光環 9 個→6＋「+3」）','collapsed':'收到最小'}
def annotated(im,E,size,st):
    """主圖：左＝上色畫面（實際解析度 1x）＋元件編號標籤；右＝說明欄（完整欄位，自動折行不截字）。"""
    W,H=im.size; LW=930; TOP=44; ff=F(10); mx=LW-24
    rows=[]
    for e in E:
        k=e['kind'].split(':')[0]
        geo=f"y={e['y0']}" if k=='line' else f"{e['x0']},{e['y0']} {e['x1']-e['x0']}×{e['y1']-e['y0']}"
        line=f"{e['id']}｜{e['name']}｜{geo}｜{e['font']}｜{e['token']}｜{e['hit']}"
        wrap=[]; cur=''
        for ch in line:
            if ff.getlength(cur+ch)>mx and cur: wrap.append(cur); cur='    '+ch
            else: cur+=ch
        if cur: wrap.append(cur)
        col=(130,130,130) if k in('zone','line') else (0,90,160) if e['layer']=='world' else (0,0,0)
        rows.append((wrap,col))
    LH=max(H+TOP+8,TOP+40+sum(len(a)*15+3 for a,b in rows)+20)
    out=Image.new('RGB',(W+LW,LH),(255,255,255)); out.paste(im,(0,TOP)); d=ImageDraw.Draw(out,'RGBA')
    d.text((8,6),f'{G.VERSION} 上色示意圖 — {size} {SNAME[st]}',font=F(15,700),fill=(0,0,0))
    d.text((8,26),'左：上色畫面（實際解析度，元件旁小標＝id）；右：完整說明欄。座標照 W1-v13 元件清單；乾淨版見同名 -clean.png。',font=F(11),fill=(70,70,70))
    f=F(8,700); placed=[]
    for e in E:
        k=e['kind'].split(':')[0]
        if k in('zone','line','region'): continue
        if e['layer']=='world' and not any(t in e['name'] for t in('掉落牌','主角','菁英','王＋')): continue
        x,y=e['x0']+1,e['y0']+TOP+1; w_=f.getlength(e['id'])+3
        for dy in (0,9,-9,18):
            b=(x,y+dy,x+w_,y+dy+9)
            if not any(not(b[2]<=q[0] or b[0]>=q[2] or b[3]<=q[1] or b[1]>=q[3]) for q in placed): break
        placed.append(b); d.rectangle(b,fill=(0,0,0,190)); d.text((b[0]+1.5,b[1]),e['id'],font=f,fill=(255,236,120,255) if e['layer']=='hud' else (160,230,255,255))
    lx=W+12; d.text((lx,TOP),f'{size} {st}｜id｜功能名稱｜x,y w×h｜字級/字重｜token｜熱區',font=F(11,700),fill=(0,0,0))
    d.text((lx,TOP+16),'黃標＝HUD（疊圖驗 ≤1 px）；藍標＝場景示意（只驗規則）；灰字＝參考線／安全區；說明太長折行不截字',font=F(9),fill=(90,90,90))
    y=TOP+34
    for wrap,col in rows:
        for line in wrap: d.text((lx,y),line,font=ff,fill=col); y+=15
        y+=3
    return out
def main():
    os.makedirs(OUT,exist_ok=True); meta={}
    for st in G.STATES+['collapsed']:
        for size in G.SIZES:
            im,E,TL=render(size,st); base=f'battle-hud-v13-color-{st}-{size}'
            p=os.path.join(OUT,base+'-clean.png'); im.save(p,optimize=True); print(p)
            p=os.path.join(OUT,base+'.png'); annotated(im,E,size,st).save(p,optimize=True)
            meta[f'{st}-{size}']=dict(text=[dict(t,col=str(t['col'])) for t in TL],foot=dict(FOOT)); print(p)
    json.dump(dict(meta=meta,used=sorted(USED),placeholders=sorted(set(PLACEHOLDERS)),widened=sorted(set(WIDEN)),overflow=sorted(set(OVERFLOW))),open(os.path.join(ROOT,'render_meta.json'),'w'),ensure_ascii=False,indent=1)
if __name__=='__main__': main()
