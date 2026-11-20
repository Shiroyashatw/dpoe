# 裝備呈現 E1–E6（390×844）。spec M2-item-display v0.3；D2 色票＋面板 1+。
# 從 itemui/render_itemui.py 複製後改畫；不改原本那個檔。
import math, json, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
src=open('/workspace/d2final/panels/render_panels.py').read().split("if __name__=='__main__':")[0]
exec(src)
SEL2=True; V=VER['opt1']
T.update(unique='#fa8915',uniquebg='#2b1f15',warn='#a9ae68',selbg='#463a2d',seledge='#a8927f',
         paper='#e3dcd3',chase='#0cf6ee',chasehi='#8ffbf6',chasebg='#143a38',void='#16130f',
         mem='#ade2f9',frac='#fbf9f6',
         rareframe='#ccb72e')  # --rar-rare-frame；◆／稀有名稱仍用 T['rare'] #fbe53a
LOG=dict(text=[],touch=[],amber=[])
_F=F
def _lum(c):
    c=np.array(c[:3],float)/255; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4); return float(c@[0.2126,0.7152,0.0722])
def contrast(a,b):
    la,lb=sorted((_lum(a),_lum(b)),reverse=True); return (la+0.05)/(lb+0.05)
def tx(d,xy,s,sz,col,bold=True,anchor='la',kind='body',font=None):
    fnt=font or _F(sz,bold); im=d._image; bb=d.textbbox(xy,s,font=fnt,anchor=anchor)
    reg=np.asarray(im.convert('RGB').crop(tuple(int(v) for v in bb))).reshape(-1,3)
    fg=rgb(col) if isinstance(col,str) else col
    if len(reg) and kind not in ('label',):
        bg=np.median(reg,axis=0); LOG.setdefault('cr',[]).append((round(contrast(fg,bg),2),s,kind))
    LOG['text'].append((sz,kind,s)); d.text(xy,s,font=fnt,fill=fg,anchor=anchor); return d.textlength(s,font=fnt)
def touch(name,box): LOG['touch'].append((name,box[2]-box[0],box[3]-box[1]))
def runs(d,x,y,parts,sz=14,anchor='ls'):
    for s,col,b in parts: x+=tx(d,(x,y),s,sz,col,b,anchor=anchor)
    return x
def amber(d,box,l1,l2=None):
    d.rounded_rectangle(box,6,fill=rgb(T['act']),outline=rgb(T['actedge']),width=2); touch('主鈕 '+l1,box); LOG['amber'].append(l1)
    cx=(box[0]+box[2])/2
    if l2: tx(d,(cx,box[1]+18),l1,16,T['onact'],anchor='mm'); tx(d,(cx,box[1]+39),l2,14,T['onact'],False,anchor='mm')
    else: tx(d,(cx,(box[1]+box[3])/2),l1,16,T['onact'],anchor='mm')
def btn2(d,box,label,col=None,edge=None,w=1,fill=None):
    d.rounded_rectangle(box,6,fill=rgb(fill or T['btn2']),outline=rgb(edge or T['border']),width=w); touch('鈕 '+label,box)
    if label!='🔒': tx(d,((box[0]+box[2])/2,(box[1]+box[3])/2),label,16 if w==2 else 14,col or T['txs'],anchor='mm')
def fix_hud(img):
    d=ImageDraw.Draw(img,'RGBA'); d.rectangle((300,4,389,36),fill=(37,33,30)); tx(d,(W-10,20),'酆都',14,T['dim'],False,anchor='rm',kind='hud')
def panel_bg(img,y0,y1,frame4=False,x0=0,x1=W):
    a=np.asarray(img.convert('RGB')).copy(); ph=y1-y0; base=np.tile(hx('#25211e'),(ph,x1-x0,1)); g=int(ph*0.4); t=np.linspace(0,1,g)[:,None,None]
    base[:g]=hx('#2d251f')*(1-t)+hx('#25211e')*t; a[y0:y1,x0:x1]=np.round(base).astype(np.uint8); img.paste(Image.fromarray(a,'RGB'))
    d=ImageDraw.Draw(img,'RGBA'); d.rectangle((x0,y0-3,x1,y0-1),fill=T['scrim']+(153,))
    e=rgb('#a8927f'); d.line((x0,y0,x1-1,y0),fill=e); d.line((x0,y0,x0,y1-1),fill=e); d.line((x1-1,y0,x1-1,y1-1),fill=e)
    if frame4: d.line((x0,y1-1,x1-1,y1-1),fill=e)
    d.line((x0+1,y0+1,x1-2,y0+1),fill=(255,226,180,31)); return d
def actionbar(img,y0):
    d=ImageDraw.Draw(img,'RGBA'); d.rectangle((1,y0,W-2,NAV-1),fill=rgb('#25211e')); d.line((1,y0,W-2,y0),fill=rgb(T['border'])); return d
def diff(d,xr,y,s,kind):
    col={'up':T['good'],'down':T['bad'],'same':T['dim']}[kind]; tx(d,(xr,y),s,14,col,anchor='rs')
def Lstar(a):
    c=a[...,:3]/255.0; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4); Y=c@np.array([0.2126,0.7152,0.0722])
    f=np.where(Y>0.008856,np.cbrt(Y),7.787*Y+16/116); return 116*f-16
def amber_blobs(a):
    m=np.all(np.abs(a[...,:3].astype(int)-[0x7c,0x57,0x29])<=2,axis=-1); seen=np.zeros_like(m); n=0
    for y0,x0 in zip(*np.nonzero(m)):
        if seen[y0,x0]: continue
        st=[(y0,x0)]; seen[y0,x0]=1; c=0
        while st:
            y,x=st.pop(); c+=1
            for yy,xx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                if 0<=yy<m.shape[0] and 0<=xx<m.shape[1] and m[yy,xx] and not seen[yy,xx]: seen[yy,xx]=1; st.append((yy,xx))
        n+=c>400
    return n
MONO='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; MONOR='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; _mf={}
def FM(sz,b=True):
    k=(sz,b)
    if k not in _mf: _mf[k]=ImageFont.truetype(MONO if b else MONOR,sz,index=8)
    return _mf[k]
TOPF=24
def chip(d,x,y,n):
    box=(x,y,x+27,y+17); s='T%d'%n
    if n==0: d.rounded_rectangle(box,3,outline=rgb(T['txs']),width=2); col,b=T['tx'],True
    elif n<=1: d.rounded_rectangle(box,3,outline=rgb(T['tx']),width=1); col,b=T['tx'],True
    elif n<=3: col,b=T['tx'],False
    else: col,b=T['dim'],False
    tx(d,(x+14,y+9),s,13,col,b,anchor='mm',kind='chip',font=FM(13,b))
def assume_tag(d, also_t=False, y=2):
    s='數字為假定・T{n} 為排版測試值' if also_t else '數字為假定'
    w=d.textlength(s,font=_F(12)); d.rounded_rectangle((4,y,4+w+12,y+20),3,fill=rgb(T['plate'],240),outline=rgb(T['warn']))
    tx(d,(10,y+10),s,12,T['dim'],anchor='lm',kind='note')
    d.rounded_rectangle((W-48,y,W-6,y+16),2,fill=rgb(T['plate'],235)); tx(d,(W-27,y+8),'示意',12,T['txs'],anchor='mm',kind='label')
def full_sheet(title=None,close=True):
    img=background(); fix_hud(img); d=panel_bg(img,TOPF,NAV)
    d.rounded_rectangle((W/2-22,TOPF+10,W/2+22,TOPF+13),2,fill=rgb(T['borderhi'])); y=TOPF+24
    if title:
        d.rectangle((1,y,W-2,y+43),fill=rgb('#2d251f')); d.line((1,y+43,W-2,y+43),fill=rgb(T['border']))
        tx(d,(12,y+22),title,22,T['tx'],anchor='lm',font=FS(22),kind='title')
        if close:
            b=(W-12-44,y,W-12,y+44); d.rectangle(b,outline=rgb(T['border'])); touch('×',b)
            d.line((W-40,y+16,W-28,y+28),fill=rgb(T['tx']),width=2); d.line((W-40,y+28,W-28,y+16),fill=rgb(T['tx']),width=2)
        y+=44
    return img,d,y
def chf(d,box):
    x0,y0,x1,y1=box
    d.rectangle((x0-1,y0-1,x1+1,y1+1),outline=rgb(T['void'])); d.rectangle(box,outline=rgb(T['chase']),width=2)
    d.rectangle((x0+2,y0+2,x1-2,y1-2),outline=rgb(T['chasebg'])); d.rectangle((x0+3,y0+3,x1-3,y1-3),outline=rgb(T['chase'],115))
    for cx,cy in ((x0,y0),(x1-5,y0),(x0,y1-5),(x1-5,y1-5)): d.rectangle((cx,cy,cx+5,cy+5),fill=rgb(T['chasehi']))
def grp_head(d,y,s): tx(d,(12,y+12),s,13,T['dim'],True,anchor='lm',kind='grouphead'); return y+24
def empty_row(d,y,n=1,x0=12,x1=W-12,label='空位 %d'):
    b=(x0+4,y+4,x1,y+28)
    for xx in range(int(b[0]),int(b[2]),6): d.line((xx,b[1],min(xx+3,b[2]),b[1]),fill=rgb(T['border'])); d.line((xx,b[3],min(xx+3,b[2]),b[3]),fill=rgb(T['border']))
    for yy in range(int(b[1]),int(b[3]),6): d.line((b[0],yy,b[0],min(yy+3,b[3])),fill=rgb(T['border'])); d.line((b[2],yy,b[2],min(yy+3,b[3])),fill=rgb(T['border']))
    tx(d,(b[0]+12,y+16),label if '%d' not in label else label%n,14,T['dim'],False,anchor='lm'); return y+32
_LK={}
def lock_icon(kind='M', size=12):
    key=(kind,size)
    if key in _LK: return _LK[key]
    S=4; im=Image.new('RGBA',(size*S,size*S),(0,0,0,0)); g=ImageDraw.Draw(im); c=rgb(T['tx'])
    # 鎖頭
    g.arc((3*S,int(0.2*S),9*S,8*S),180,360,fill=c,width=2*S)
    g.line((3*S+S,4*S,3*S+S,5*S),fill=c,width=2*S); g.line((9*S-S,4*S,9*S-S,5*S),fill=c,width=2*S)
    if kind=='M':
        g.rectangle((1*S,5*S,11*S,size*S-1),fill=c)
        # 小小匙孔，實心鎖才有這點暗點
        g.ellipse((5*S,7*S,7*S,9*S),fill=rgb(T['inset']))
        g.rectangle((5*S+S//2,8*S,7*S-S//2,10*S+S//2),fill=rgb(T['inset']))
    else:
        w=max(1,int(1.25*S))
        g.rectangle((1*S,5*S,11*S,size*S-1),outline=c,width=w)
        # 空心體內留大洞，灰階靠「本體有沒有填滿」分，不靠顏色
    _LK[key]=im.resize((size,size),Image.LANCZOS); return _LK[key]
def lock12(img,box,kind='M'):
    x0,y0,x1,y1=box; d=ImageDraw.Draw(img,'RGBA')
    d.rectangle((x1-3-16,y1-3-16,x1-3,y1-3),fill=rgb('#282420',235))
    ic=lock_icon(kind); img.paste(ic,(x1-3-14,y1-3-14),ic)

# ---------- 12 px 圖示（多邊形，不靠字型）
_IC={}
def _ss(draw_fn, w, h, scale=4):
    im=Image.new('RGBA',(w*scale,h*scale),(0,0,0,0)); g=ImageDraw.Draw(im); draw_fn(g,scale,w*scale,h*scale)
    return im.resize((w,h),Image.LANCZOS)
def star4_icon(col=None, size=12):
    c=rgb(col or T['txs']); k=('star',c,size)
    if k in _IC: return _IC[k]
    def draw(g,S,w,h):
        cx,cy=w/2,h/2; ro,ri=5.4*S,1.85*S; pts=[]
        for i in range(8):
            ang=math.radians(-90+i*45); r=ro if i%2==0 else ri
            pts.append((cx+r*math.cos(ang),cy+r*math.sin(ang)))
        g.polygon(pts,fill=c)
    _IC[k]=_ss(draw,size,size); return _IC[k]
def arrow_icon(col=None, size=12):
    c=rgb(col or T['good']); k=('arrow',c,size)
    if k in _IC: return _IC[k]
    def draw(g,S,w,h):
        g.polygon([(w/2,0.6*S),(w-0.6*S,h-0.8*S),(0.6*S,h-0.8*S)],fill=c)
    _IC[k]=_ss(draw,size,size); return _IC[k]
def darrow_icon(col=None, w=12, h=16):
    c=rgb(col or T['good']); k=('darrow',c,w,h)
    if k in _IC: return _IC[k]
    def draw(g,S,W,H):
        def tri(top,bot):
            g.polygon([(W/2,top),(W-0.3*S,bot),(0.3*S,bot)],fill=c)
        # 兩個實心三角，中間留縫，12×16 格內仍讀得出雙箭頭
        tri(0.15*S, 7.3*S)
        tri(8.5*S, 15.7*S)
    _IC[k]=_ss(draw,w,h); return _IC[k]
def sock_icon(col=None, size=12, filled=False):
    c=rgb(col or T['tx']); k=('sock',c,size,filled)
    if k in _IC: return _IC[k]
    def draw(g,S,w,h):
        cx,cy=w/2,h/2
        # 圓環（珠寶孔），刻意不用菱／◇，跟稀有 ◆ 分開
        # 細圓環＋大內孔，剪影是環不是實心塊，避免跟 ◆ 菱形撞形
        g.ellipse((cx-5.5*S,cy-5.5*S,cx+5.5*S,cy+5.5*S),outline=c,width=max(1,int(1.25*S)))
        if filled:
            g.ellipse((cx-2.0*S,cy-2.0*S,cx+2.0*S,cy+2.0*S),fill=c)
    _IC[k]=_ss(draw,size,size); return _IC[k]
def diamond_icon(col=None, size=12):
    c=rgb(col or T['rare']); k=('dia',c,size)
    if k in _IC: return _IC[k]
    def draw(g,S,w,h):
        cx,cy=w/2,h/2; r=5.4*S
        g.polygon([(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)],fill=c)
    _IC[k]=_ss(draw,size,size); return _IC[k]
def sock20(filled=False):
    k=('sock20',filled)
    if k in _IC: return _IC[k]
    im=Image.new('RGBA',(20,20),(0,0,0,0)); g=ImageDraw.Draw(im)
    g.ellipse((1,1,18,18),outline=rgb(T['border']),width=2)
    if filled:
        # 孔內物占位：小石／寶石，亮度不高
        g.ellipse((5,5,15,15),fill=rgb('#6b5e4e'),outline=rgb(T['borderhi']))
        g.ellipse((7,7,11,11),fill=rgb('#8a7b68'))
    _IC[k]=im; return im

def plate_box(d, box):
    d.rectangle(box, fill=rgb('#282420',235))

def stroke_frame(img, box, bg, fr, w=1):
    """稀有度框。w=1.5 時用 2× 超取樣畫 3 px 再縮回，得到 1.5 px 線。"""
    x0,y0,x1,y1=box; bw,bh=x1-x0,y1-y0
    d=ImageDraw.Draw(img,'RGBA')
    if w==1.5:
        tmp=Image.new('RGB',(bw*2,bh*2),rgb(bg)[:3]); td=ImageDraw.Draw(tmp)
        td.rectangle((0,0,bw*2-1,bh*2-1),outline=rgb(fr),width=3)
        td.line((2,2,bw*2-3,2),fill=T['scrim']+(128,))
        img.paste(tmp.resize((bw,bh),Image.LANCZOS),(x0,y0))
        return ImageDraw.Draw(img,'RGBA')
    inset(d,box,bg,fr,w=int(w) if w>=1 else 1)
    if w>=2:
        # inset() 已畫 2 px 外框；內側頂線仍留
        pass
    return d

def ecell(img, box, rar, ic, up=None, star=0, lk=None, sock=None, sel=False, chase=False, isz=32, force_sock=False, register_touch=True, frame_w=None, rare_frame=None):
    """格子訊號最多 2 個，優先 ▲ > ✦n > 孔；鎖不算訊號。force_sock：有孔篩選時孔一定顯示（必要時讓出 ✦）。
    稀有格外框預設 2 px --rar-rare-frame #ccb72e；魔法 1 px --rar-magic；普通不變。
    ◆／稀有名稱仍用 --rar-rare #fbe53a，格上不放 ◆ 角標。"""
    d=ImageDraw.Draw(img,'RGBA')
    bg,fr={'normal':(T['inset'],T['border']),'magic':(T['magicbg'],T['magic']),'rare':(T['rarebg'],T.get('rareframe',T['rare'])),
           'unique':(T['uniquebg'],T['unique'])}[rar]
    if rar=='rare' and rare_frame:
        fr=rare_frame
    if frame_w is None:
        frame_w=2 if rar=='rare' else 1
    if chase:
        d.rectangle(box,fill=rgb(T['chasebg'])); chf(d,box)
    else:
        d=stroke_frame(img,box,bg,fr,w=frame_w)
    x0,y0,x1,y1=box
    im=icon(ic,isz); pst(img,im,(int((x0+x1)/2-isz/2),int((y0+y1)/2-isz/2))); d=ImageDraw.Draw(img,'RGBA')
    # 訊號選擇
    signals=[]
    if up: signals.append('up')
    if star and star>0: signals.append('star')
    if sock and sock>0: signals.append('sock')
    if force_sock and 'sock' in signals:
        kept=['sock']
        if 'up' in signals: kept=['up','sock']
        elif 'star' in signals: kept=['star','sock']
        signals=kept
    else:
        signals=signals[:2]  # ▲ > ✦ > 孔 already in this order
    if 'up' in signals:
        icn=darrow_icon() if up=='up2' else arrow_icon()
        bw,bh=icn.size[0]+6, max(16,icn.size[1]+4)
        bb=(x0+3,y0+3,x0+3+bw,y0+3+bh); plate_box(d,bb)
        img.paste(icn,(x0+3+3, y0+3+(bh-icn.size[1])//2), icn)
    if 'star' in signals:
        icn=star4_icon(); num=str(star); nw=_F(12).getlength(num) if hasattr(_F(12),'getlength') else ImageDraw.Draw(Image.new('RGB',(1,1))).textlength(num,font=_F(12))
        bw,bh=12+2+nw+6,16
        bb=(x1-3-bw,y0+3,x1-3,y0+3+bh); plate_box(d,bb)
        img.paste(icn,(int(bb[0]+3), y0+3+2), icn); d=ImageDraw.Draw(img,'RGBA')
        tx(d,(bb[0]+3+12+2,y0+3+8),num,12,T['tx'],True,anchor='lm',kind='badge')
    if 'sock' in signals:
        icn=sock_icon(); num=str(sock); nw=ImageDraw.Draw(Image.new('RGB',(1,1))).textlength(num,font=_F(12))
        bw,bh=12+2+nw+6,16
        bb=(x0+3,y1-3-bh,x0+3+bw,y1-3); plate_box(d,bb)
        img.paste(icn,(int(bb[0]+3), int(bb[1]+(bh-12)/2)), icn); d=ImageDraw.Draw(img,'RGBA')
        tx(d,(bb[0]+3+12+2,bb[1]+bh/2),num,12,T['tx'],True,anchor='lm',kind='badge')
    if lk: lock12(img,box,kind='A' if lk=='A' else 'M')
    if sel:
        d=ImageDraw.Draw(img,'RGBA'); d.rectangle((x0-4,y0-4,x1+4,y1+4),outline=rgb(T['seledge']),width=2)
        LOG['selbox']=(box,chase,rar)
    if register_touch: touch('格子',box)
    return ImageDraw.Draw(img,'RGBA')

def star_text(img, x, y, tail, sz=14, col=None, bold=False, anchor='lm', kind='body', star_col=None):
    """在字串位置畫 ✦ 圖示＋其後文字（不靠 ✦ 字型）。回傳終了 x。"""
    d=ImageDraw.Draw(img,'RGBA'); fnt=_F(sz,bold)
    icn=star4_icon(star_col,12)
    # 以文字中線對齊圖示
    if anchor in ('lm','ls'):
        py=y if anchor=='lm' else y  # ls/lm 都當垂直中
        img.paste(icn,(int(x), int(py-6)), icn)
        d=ImageDraw.Draw(img,'RGBA')
        w=tx(d,(x+14,y),tail,sz,col or T['tx'],bold,anchor=anchor,kind=kind)
        return x+14+w
    if anchor=='mm':
        tw=d.textlength(tail,font=fnt); total=14+tw
        x0=x-total/2
        img.paste(icn,(int(x0), int(y-6)), icn)
        d=ImageDraw.Draw(img,'RGBA')
        tx(d,(x0+14,y),tail,sz,col or T['tx'],bold,anchor='lm',kind=kind)
        return x+total/2
    if anchor=='rm':
        tw=d.textlength(tail,font=fnt)
        img.paste(icn,(int(x-tw-14), int(y-6)), icn)
        d=ImageDraw.Draw(img,'RGBA')
        tx(d,(x,y),tail,sz,col or T['tx'],bold,anchor='rm',kind=kind)
        return x
    return x

def detail_toggle(img, d, y, on, row_h=56, x1=W-12):
    lab='詳細'; lw=d.textlength(lab,font=_F(14,on)); sw,sh=52,28
    sx=x1-sw; sy=y+(row_h-sh)//2
    lx=sx-8-lw
    tx(d,(lx,y+row_h/2),lab,14,T['txs'] if on else T['dim'],on,anchor='lm')
    if on:
        d.rounded_rectangle((sx,sy,sx+sw,sy+sh),14,fill=rgb(T['selbg']),outline=rgb(T['seledge']),width=2)
        d.ellipse((sx+sw-26,sy+3,sx+sw-4,sy+sh-3),fill=rgb(T['txs']))
    else:
        d.rounded_rectangle((sx,sy,sx+sw,sy+sh),14,fill=rgb(T['inset']),outline=rgb(T['border']))
        d.ellipse((sx+4,sy+3,sx+26,sy+sh-3),fill=rgb(T['tx']))
    hit=(lx-4,y+(row_h-44)//2,x1,y+(row_h-44)//2+44); touch('詳細',hit)
    return lx-8

def fade_to_bar(img, by, bar=64):
    a=np.asarray(img.convert('RGB')).astype(float); pc=hx('#25211e')
    for k in range(24):
        yy=by-24+k; t=(k+1)/24
        if 0<=yy<a.shape[0]: a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    a[by:NAV,1:W-1]=pc; img.paste(Image.fromarray(np.round(a).astype(np.uint8),'RGB'))

def apply_grid_scrim(img, scrim_top, y0):
    a_=np.asarray(img.convert('RGB')).astype(float)
    a_[scrim_top:y0-3]=a_[scrim_top:y0-3]*0.75+np.array(T['scrim'])*0.25
    img.paste(Image.fromarray(np.round(a_).astype(np.uint8),'RGB'))

def action_row(img, swap, unlock=False, y0=None):
    by=NAV-64 if y0 is None else y0; d=actionbar(img,by)
    gw=64; lw=56 if unlock else 44; pw=W-24-16-lw-8-gw
    amber(d,(12,by+4,12+pw,by+60),'裝備',swap)
    if unlock:
        lk=(12+pw+16,by+10,12+pw+16+lw,by+54); btn2(d,lk,'解鎖')
    else:
        lk=(12+pw+16,by+10,12+pw+16+lw,by+54); btn2(d,lk,'🔒'); lock(d,int((lk[0]+lk[2])/2-8),int((lk[1]+lk[3])/2-8),T['txs'])
    btn2(d,(lk[2]+8,by+10,W-12,by+54),'分解'); return d,by

# ---------- 背包 20 件（E1／E2／E4 背景）
# up: None/'up'/'up2'；star n；lk None/'M'/'A'；無孔
def pack_items(chase_at=None):
    # (ic, rar, up, star, lk, chase)
    G=[
        ('gear_weapon_26','rare','up',2,None,False),          # 0 E2/E3 選中：▲ ✦2
        ('gear_helm_0','rare','up2',3,None,False),            # ▲▲ ✦3
        ('gear_chest_2','magic','up',2,None,False),           # ▲ ✦2
        ('gear_offhand_2','rare','up',1,'M',False),           # ▲ ✦1 手動鎖
        ('gear_ring_3','rare',None,3,None,False),             # ✦3
        ('gear_belt_1','magic','up2',1,None,False),           # ▲▲ ✦1
        ('gear_gloves_1','normal','up',0,None,False),         # 只有 ▲（空部位規則示範：不給 ▲▲）
        ('gear_amulet_8','rare',None,2,'A',False),            # ✦2 自動鎖
        ('gear_helm_4','magic',None,0,None,False),            # 無訊號
        ('gear_ring_7','rare','up',0,'M',False),              # ▲ 手動鎖
        ('gear_weapon_26','magic',None,1,None,False),         # ✦1
        ('gear_chest_1','rare','up2',2,None,False),           # ▲▲ ✦2
        ('gear_ring_8','normal',None,0,None,False),
        ('gear_helm_1','magic','up',1,None,False),
        ('gear_boots_1','rare',None,1,'A',False),             # ✦1 自動鎖
        ('gear_offhand_2','magic',None,0,'M',False),          # 只有手動鎖
        ('gear_gloves_1','rare','up',3,None,False),           # ▲ ✦3
        ('gear_belt_1','magic',None,2,None,False),            # ✦2
        ('gear_amulet_8','rare',None,0,None,False),
        ('gear_chest_2','magic','up',0,None,False),
    ]
    if chase_at is not None:
        G[chase_at]=('gear_weapon_26','rare','up2',2,None,True)  # E4：▲▲ ✦2（兩條 T0）
    return G

def loot_screen(items, sel=None):
    img=background(); fix_hud(img); d=sheet_base(img,V); y=header(img,d,V,'戰利品')
    tx(d,(W-12-44-10,y-22),'20／300・12,480 金',14,T['dim'],False,anchor='rm')
    y+=12; g0=y
    for i,it in enumerate(items):
        ic,rar,up,star,lk,chase=it
        r,c=divmod(i,5); bx=19+c*72; by=g0+r*72
        ecell(img,(bx,by,bx+64,by+64),rar,ic,up=up,star=star,lk=lk,sel=(i==sel),chase=chase,isz=32)
    for i in range(len(items),40):
        r,c=divmod(i,5); bx=19+c*72; by=g0+r*72
        if by+64>NAV-4: break
        d=ImageDraw.Draw(img,'RGBA'); inset(d,(bx,by,bx+64,by+64))
    touch('倉庫格',(0,0,64,64)); LOG['g0']=g0; pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    return img

# ---------- 簡單版／詳細版用的件
SHOWCASE=dict(
    rar='rare', ic='gear_weapon_26', chase=False,
    name='猛擊神機弩・疾風',
    meta='稀有 十字弓・物品等級 16',
    ilvl_line='物品等級 16：詞最高 T5',
    verdict='▲ 比現在 +18% 傷害', vcol='good',
    stats=[('DPS','▲ +18%','up'),('攻速','▲ +6%','up'),('暴擊率','▼ −1%','down'),('生命','▼ −2%','down')],
    base=[('傷害','14–26'),('每秒攻擊','1.25'),('暴擊率','5.0%')],
    implicit='穿透 1 個目標',
    # simple mods: (star, text, tag or None, tagcol) — 2 條 ✦＝兩條 T5，跟詳細版同一套
    smods=[
        (True,'增加 74% 物理傷害',None,None),
        (False,'附加 15 至 29 火焰傷害',None,None),
        (False,'附加 5 至 10 物理傷害',None,None),
        (True,'增加 24% 攻擊速度',None,None),
        (False,'+4% 暴擊率',None,None),
        (False,'命中值 +180',None,None),
    ],
    # detailed: (tier, text, star, new, lo, hi, ntiers)；詞最高 T5，其餘 T 為排版測試；共 10 階
    dmods_pre=[
        (5,'增加 74% 物理傷害',True,False,'48','74',10),
        (6,'附加 15 至 29 火焰傷害',False,True,'8','32',10),
        (7,'附加 5 至 10 物理傷害',False,False,'4','18',10),
    ],
    dmods_suf=[
        (5,'增加 24% 攻擊速度',True,False,'12','24',10),
        (6,'+4% 暴擊率',False,True,'2','8',10),
        (8,'命中值 +180',False,False,'80','240',10),
    ],
    swap='換下 ◆ 連弩，放進倉庫',
)
WORST=dict(
    rar='rare', ic='gear_weapon_26', chase=True,
    name='凶暴神機弩・迅捷',
    meta='稀有 十字弓・物品等級 16・已聖化・已腐化',
    ilvl_line='物品等級 16：詞最高 T5',
    verdict='▲ 大幅變強 +31% 傷害', vcol='good',
    stats=[('DPS','▲ +31%','up'),('生命','▼ −10%','down')],
    implicit='穿透 1 個目標',
    smods=[
        (True,'增加 182% 物理傷害','破裂',T['frac']),
        (False,'附加 19 至 37 火焰傷害',None,None),
        (False,'附加 11 至 22 物理傷害',None,None),
        (True,'增加 30% 攻擊速度',None,None),
        (False,'+66% 暴擊傷害加成',None,None),
        (False,'命中值 +240',None,None),
        (False,'擊中流血的敵人時，增加 20% 傷害','王印',T['chase']),
        (False,'技能欄所有技能等級 +1','追憶',T['mem']),
        (False,'+30% 暴擊傷害加成','腐化',T['dim']),
        (False,'▼ 減少 10% 最大生命',None,T['bad']),  # 代價行
        (False,'增加 34% 暴擊率','災魘',T['dim']),
        (False,'▼ -22% 火焰抗性',None,T['bad']),
    ],
    swap='換下 ◆ 連弩，放進倉庫',
)

def draw_name(img,d,x,y,it,sz=18):
    pre_w=0
    if it.get('chase'):
        pst(img,icon('wangyin_chixiao_16',16),(int(x),int(y-8))); x+=20; d=ImageDraw.Draw(img,'RGBA')
    pre='◆ ' if it['rar']=='rare' else ('◈ ' if it['rar']=='unique' else '')
    tx(d,(x,y),pre+it['name'],sz,T[it['rar']],anchor='lm'); return d

def simple_mod_line(img,d,y,star,text,tag=None,tagcol=None,h=28,textcol=None):
    x=12
    if star:
        x=star_text(img,x,y+h/2,'',sz=14)  # icon only, then text
        # star_text with empty tail still advances 14
        d=ImageDraw.Draw(img,'RGBA')
        x=12+14
    col=textcol or (T['bad'] if text.startswith('▼') else T['tx'])
    tw=tx(d,(x,y+h/2),text,14,col,False,anchor='lm')
    if tag:
        tcol=tagcol or T['dim']
        bold=tag in ('破裂','追憶','王印')
        # 王印：圖示＋字標（色盲：印詞對追憶單靠色不夠）
        if tag=='王印':
            pst(img,icon('wangyin_chixiao_16',16),(int(W-12-16-d.textlength('王印',font=_F(13,True))-4), int(y+h/2-8)))
            d=ImageDraw.Draw(img,'RGBA')
        if tag=='破裂':
            tx(d,(W-12-d.textlength('破裂',font=_F(13,True))-16,y+h/2),'★',14,T['frac'],anchor='lm',kind='★14')
        tx(d,(W-12,y+h/2),tag,13,tcol,bold,anchor='rm',kind='tag13')
    return y+h

def simple_panel(img, it, toast=False, sockets=None, scrim_top=None):
    """半高約 420：標題 56＋結論 40＋詞行＋動作列 64。無 T 片、無前後綴分組。"""
    y0=NAV-420
    if scrim_top is None: scrim_top=LOG.get('g0',TOP+24+44+12)-4
    apply_grid_scrim(img, scrim_top, y0)
    if 'selbox' in LOG:
        box,chase,rar=LOG['selbox']; x0,y0s,x1,y1=box
        d=ImageDraw.Draw(img,'RGBA')
        d.rectangle((x0-4,y0s-4,x1+4,y1+4),outline=rgb(T['seledge']),width=2)
        if chase: chf(d,box)
    d=panel_bg(img,y0,NAV)
    d.rounded_rectangle((W/2-22,y0+10,W/2+22,y0+13),2,fill=rgb(T['borderhi']))
    y=y0+24
    # 標題列 56：小圖＋名字＋詳細關
    d.rectangle((1,y,W-2,y+55),fill=rgb('#2d251f'))
    name_right=detail_toggle(img,d,y,on=False,row_h=56)
    ib=(14,y+8,54,y+48)
    if it.get('chase'):
        d.rectangle(ib,fill=rgb(T['chasebg'])); chf(d,ib); pst(img,icon(it['ic'],32),(18,y+12)); d=ImageDraw.Draw(img,'RGBA')
    else:
        ecell(img,ib,it['rar'],it['ic'],isz=28,register_touch=False)
        d=ImageDraw.Draw(img,'RGBA')
    draw_name(img,d,66,y+16,it,sz=16)
    d=ImageDraw.Draw(img,'RGBA')
    # 次行：放得下就一行；已聖化接在物品等級後面，必要時換兩行（不截斷）
    maxw=name_right-66-8; meta=it['meta']; font=_F(14,False)
    if d.textlength(meta,font=font)<=maxw:
        tx(d,(66,y+40),meta,14,T['dim'],False,anchor='lm')
    else:
        # 優先在「・」處折行
        lines=None
        for i,ch in enumerate(meta):
            if ch=='・' and d.textlength(meta[:i+1],font=font)<=maxw:
                rest=meta[i+1:]
                if d.textlength(rest,font=font)<=maxw:
                    lines=(meta[:i+1],rest)
        if not lines:
            # 逐字折
            a=''; b=''
            for ch in meta:
                if not b and d.textlength(a+ch,font=font)<=maxw: a+=ch
                else: b+=ch
            lines=(a,b)
        tx(d,(66,y+32),lines[0],13,T['dim'],False,anchor='lm',kind='meta13')
        tx(d,(66,y+46),lines[1],13,T['dim'],False,anchor='lm',kind='meta13')
    d.line((1,y+56,W-2,y+56),fill=rgb(T['border'])); y+=56
    # 結論 40：只留一行「▲ 比現在…／▲ 大幅變強…」，右邊不重複差值，也不寫「換掉…」
    tx(d,(12,y+20),it['verdict'],18,T[it['vcol']],anchor='lm')
    y+=40
    if it.get('implicit'):
        y=simple_mod_line(img,d,y,False,it['implicit'],tag='固定詞',tagcol=T['dim'])
        d=ImageDraw.Draw(img,'RGBA')
    if sockets:
        # E5 才走這裡；一排孔 20×20 間距 6（最壞 6）
        x=12
        for i,filled in enumerate(sockets):
            im=sock20(filled); img.paste(im,(x,int(y+4)),im); x+=26
        d=ImageDraw.Draw(img,'RGBA')
        tx(d,(x+8,y+14),'孔內物待定' if any(sockets) else '',13,T['dim'],False,anchor='lm',kind='status13')
        y+=28
    cut=NAV-64
    for star,text,tag,tagcol in it['smods']:
        if y+28>cut: break   # 超出動作列的行留給捲動，不畫進鈕上（也不計對比）
        y=simple_mod_line(img,d,y,star,text,tag,tagcol,textcol=(tagcol if text.startswith('▼') else None))
        d=ImageDraw.Draw(img,'RGBA')
    by=NAV-64
    fade_to_bar(img,by)
    d,by=action_row(img,it['swap'])
    pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    LOG['detail']=dict(panel_top=y0,cut=by)
    if toast:
        s_tail=' 是這件裝備能骰到最好的階'
        # 畫在面板上方、蓋在格子上
        d=ImageDraw.Draw(img,'RGBA')
        fnt=_F(14,False); tw=14+d.textlength(s_tail,font=fnt)
        tb=(max(12,(W-tw-32)/2), y0-8-40, min(W-12,(W+tw+32)/2), y0-8)
        d.rectangle((tb[0]+2,tb[1]+3,tb[2]+2,tb[3]+3),fill=T['scrim']+(160,))
        d.rectangle(tb,fill=rgb(T['plate'],250),outline=rgb(T['borderhi']))
        star_text(img,(tb[0]+tb[2])/2,(tb[1]+tb[3])/2,s_tail,sz=14,col=T['tx'],bold=False,anchor='mm',kind='toast')
        LOG['toast']=dict(box=tb)
    return img

def dmod_row(img,d,y,tier,text,star=False,new=False,lo=None,hi=None,n_tiers=6,h=36):
    x=16
    if star:
        icn=star4_icon(); img.paste(icn,(int(x),int(y+(h-12)/2)),icn); x+=16; d=ImageDraw.Draw(img,'RGBA')
    chip(d,x,y+(h-18)//2,tier); x+=32
    if new:
        x+=tx(d,(x,y+h/2),'▲',12,T['good'],anchor='lm',kind='▲12')+4
    tx(d,(x,y+h/2),text,14,T['tx'],False,anchor='lm')
    if lo is not None:
        tx(d,(W-12,y+h/2-7),'[%s–%s]'%(lo,hi),13,T['dim'],False,anchor='rm',kind='range13')
        tx(d,(W-12,y+h/2+8),'這條詞共 %d 階'%n_tiers,13,T['dim'],False,anchor='rm',kind='range13')
    return y+h

def detailed_panel_full(it, sockets=None):
    img,d,y=full_sheet(); top=y
    # 標題列 56
    d.rectangle((1,y,W-2,y+55),fill=rgb('#2d251f'))
    name_right=detail_toggle(img,d,y,on=True,row_h=56)
    ib=(14,y+8,54,y+48)
    if it.get('chase'):
        d.rectangle(ib,fill=rgb(T['chasebg'])); chf(d,ib); pst(img,icon(it['ic'],32),(18,y+12)); d=ImageDraw.Draw(img,'RGBA')
    else:
        ecell(img,ib,it['rar'],it['ic'],isz=28,register_touch=False); d=ImageDraw.Draw(img,'RGBA')
    draw_name(img,d,66,y+20,it,sz=16); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(66,y+42),it['meta'],14,T['dim'],False,anchor='lm')
    d.line((1,y+56,W-2,y+56),fill=rgb(T['border'])); y+=60
    tx(d,(12,y+8),it['ilvl_line'],13,T['dim'],False,anchor='lm',kind='ilvl13'); y+=22
    tx(d,(12,y+10),it['verdict'],18,T[it['vcol']],anchor='lm'); y+=28
    for lab,val,k in it.get('stats',[]):
        tx(d,(12,y+12),lab,14,T['dim'],False,anchor='lm'); diff(d,W-12,y+12,val,k); y+=24
    if it.get('base'):
        y+=4; d.line((12,y,W-12,y),fill=rgb(T['border'],140)); y+=8
        for lab,val in it['base']:
            tx(d,(12,y+12),lab,14,T['dim'],False,anchor='lm'); tx(d,(W-12,y+12),val,14,T['tx'],False,anchor='rm'); y+=24
    y+=4
    if it.get('implicit'):
        tx(d,(16,y+14),'固定詞',13,T['dim'],False,anchor='lm',kind='label13')
        tx(d,(16+d.textlength('固定詞',font=_F(13,False))+8,y+14),it['implicit'],14,T['tx'],False,anchor='lm'); y+=28
    if it.get('dmods_pre'):
        y=grp_head(d,y,'前綴 %d／3'%len(it['dmods_pre']))
        for m in it['dmods_pre']:
            y=dmod_row(img,d,y,*m); d=ImageDraw.Draw(img,'RGBA')
        if len(it['dmods_pre'])<3: y=empty_row(d,y,3-len(it['dmods_pre']))
    if it.get('dmods_suf'):
        y=grp_head(d,y,'後綴 %d／3'%len(it['dmods_suf']))
        for m in it['dmods_suf']:
            y=dmod_row(img,d,y,*m); d=ImageDraw.Draw(img,'RGBA')
        if len(it['dmods_suf'])<3: y=empty_row(d,y,3-len(it['dmods_suf']))
    if sockets:
        filled=sum(1 for s in sockets if s); y=grp_head(d,y,'孔 %d／%d'%(filled,len(sockets)))
        for i,fil in enumerate(sockets):
            if fil:
                im=sock20(True); img.paste(im,(16,int(y+4)),im); d=ImageDraw.Draw(img,'RGBA')
                tx(d,(42,y+14),'孔內物待定',14,T['dim'],False,anchor='lm')
                y+=28
            else:
                y=empty_row(d,y,label='空孔')
                d=ImageDraw.Draw(img,'RGBA')
    y+=4
    lb=(12,y,W-12,y+44); touch('全部屬性 ›',lb); tx(d,(12,y+22),'全部屬性 ›',14,T['tx'],anchor='lm'); y+=44
    # 常駐圖例，釘在動作列上方
    by=NAV-64; ly=by-28
    d.line((12,ly-2,W-12,ly-2),fill=rgb(T['border'],140))
    star_text(img,12,ly+14,' 是這件裝備能骰到最好的階',sz=13,col=T['dim'],bold=False,kind='legend13',anchor='lm')
    fade_to_bar(img,by)
    # 再畫一次圖例（fade 會蓋到 by-24，圖例在 by-28 可能被吃一點；改釘在 fade 下方）
    # fade 從 by-24 開始，ly=by-28 只有 4 px 在 fade 外。改成 legend 在 by-24 之內會被淡。把動作列上留 28 給圖例：fade 上面結束。
    # 重做：上面已 fade 到 by。把圖例畫在 by-28 之後會被 actionbar 清掉。
    # 改為 action bar 內不放圖例；在 fade 之前已畫，然後把 fade 起點改到圖例上方。
    # 這裡補畫在動作列上方一條不被淡的底。
    d=ImageDraw.Draw(img,'RGBA')
    d.rectangle((1,by-28,W-2,by-1),fill=rgb('#25211e'))
    d.line((12,by-28,W-12,by-28),fill=rgb(T['border'],140))
    star_text(img,12,by-14,' 是這件裝備能骰到最好的階',sz=13,col=T['dim'],bold=False,kind='legend13',anchor='lm')
    d,by=action_row(img,it['swap'])
    pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    LOG['detail']=dict(content_end=y,legend=by-28)
    return img

# ---------- 各畫面
def e1():
    img=loot_screen(pack_items(), sel=None)
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=False, y=42)
    return img

def e2():
    img=loot_screen(pack_items(), sel=0)
    simple_panel(img, SHOWCASE, toast=True, scrim_top=LOG['g0']-4)
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=False, y=42)
    return img

def e3():
    img=detailed_panel_full(SHOWCASE)
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=True, y=2)
    return img

def e4():
    items=pack_items(chase_at=0)
    img=loot_screen(items, sel=0)
    simple_panel(img, WORST, toast=False, scrim_top=LOG['g0']-4)
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=True, y=42)
    return img

def e5():
    img,d,y=full_sheet('孔（保留位）')
    # 橫幅
    ban=(12,y+8,W-12,y+8+36)
    d.rounded_rectangle(ban,4,fill=rgb(T['selbg']),outline=rgb(T['seledge']),width=2)
    tx(d,((ban[0]+ban[2])/2,(ban[1]+ban[3])/2),'未做・保留位',16,T['txs'],True,anchor='mm',kind='stamp')
    y=ban[3]+14
    tx(d,(12,y+8),'挑胚格（有孔時，孔一定顯示）',14,T['tx'],anchor='lm'); y+=24
    samples=[
        ('gear_weapon_26','rare',None,0,None,3,True,'孔 3'),
        ('gear_weapon_26','rare',None,0,None,6,True,'孔 6（最壞）'),
        ('gear_weapon_26','rare','up',2,None,6,False,'升級＋星 2'),
        ('gear_weapon_26','magic','up',0,None,3,True,'升級＋孔 3'),
    ]
    for i,(ic,rar,up,star,lk,sock,force,cap) in enumerate(samples):
        bx=19+i*92; box=(bx,y,bx+64,y+64)
        ecell(img,box,rar,ic,up=up,star=star,lk=lk,sock=sock,force_sock=force,isz=32)
        d=ImageDraw.Draw(img,'RGBA')
        tx(d,(bx+32,y+72),cap,12,T['dim'],False,anchor='mt',kind='caption12')
    # 第三格補一行「孔被擠掉」
    tx(d,(19+2*92+32,y+86),'孔被擠掉',12,T['dim'],False,anchor='mt',kind='caption12')
    y+=74+32+8
    d.line((12,y,W-12,y),fill=rgb(T['border'],140)); y+=10
    tx(d,(12,y+8),'簡單版：一排孔圖示（最壞 6，放 2 空 4）',14,T['tx'],anchor='lm'); y+=26
    socks=[True,True,False,False,False,False]
    x=12
    for i,fil in enumerate(socks):
        im=sock20(fil); img.paste(im,(x,y),im); x+=26
    d=ImageDraw.Draw(img,'RGBA')
    tx(d,(x+8,y+10),'孔內物待定',14,T['dim'],False,anchor='lm'); y+=36
    # 小戳
    d.rounded_rectangle((12,y,12+d.textlength('未做・保留位',font=_F(12))+16,y+20),3,fill=rgb(T['plate'],240),outline=rgb(T['warn']))
    tx(d,(20,y+10),'未做・保留位',12,T['txs'],anchor='lm',kind='stamp')
    y+=32
    d.line((12,y,W-12,y),fill=rgb(T['border'],140)); y+=10
    tx(d,(12,y+8),'詳細版孔區（最壞 6）',14,T['tx'],anchor='lm'); y+=26
    y=grp_head(d,y,'孔 2／6')
    for i,fil in enumerate(socks):
        if fil:
            im=sock20(True); img.paste(im,(16,int(y+4)),im); d=ImageDraw.Draw(img,'RGBA')
            tx(d,(42,y+16),'孔內物待定',14,T['dim'],False,anchor='lm'); y+=32
        else:
            y=empty_row(d,y,label='空孔'); d=ImageDraw.Draw(img,'RGBA')
    d.rounded_rectangle((12,y+8,12+d.textlength('未做・保留位',font=_F(12))+16,y+28),3,fill=rgb(T['plate'],240),outline=rgb(T['warn']))
    tx(d,(20,y+18),'未做・保留位',12,T['txs'],anchor='lm',kind='stamp')
    pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=False, y=2)
    return img

def pick_items():
    # 篩選「✦2 以上」開著：可見格都 ≥✦2。無孔。
    # 稀有框 #fbe53a L* 90，全黃會爆亮區；這裡只放 8 件稀有，其餘魔法。
    G=[]
    front=[
        ('rare','up2',3,'A'),
        ('magic','up',2,None),
        ('rare','up',3,'A'),
        ('magic',None,2,None),
        ('magic',None,2,'A'),
        ('magic',None,2,'M'),
        ('magic','up',2,None),
        ('magic',None,3,None),
        ('rare','up',2,None),
        ('magic',None,2,None),
    ]
    G.extend(front)
    rng=random.Random(7)
    rare_left=4  # 再 4 件稀有，加上 front 3 件共 7
    for i in range(25):
        if rare_left and i in (2,8,14,20):
            rar='rare'; rare_left-=1
        else:
            rar='magic'
        up='up2' if i in (5,18) else ('up' if i in (0,10,16) else None)
        st=rng.choice((2,2,2,3,3))
        lk='M' if i==11 else ('A' if i==21 else None)
        G.append((rar,up,st,lk))
    return G[:35]

def pick_screen(items=None, n_unlocked=41, frame_w=None, rare_frame=None, sel=None):
    items=list(items if items is not None else pick_items())
    img,d,y=full_sheet('挑胚'); y+=8
    lw_=d.textlength('我要的詞 3 ›',font=_F(14,False))+16
    dd=(12,y,W-12-lw_-8,y+44); d.rectangle(dd,fill=rgb(T['inset']),outline=rgb(T['border'])); touch('部位下拉',dd)
    w_=tx(d,(24,y+22),'十字弓',14,T['tx'],anchor='lm'); d.polygon([(24+w_+8,y+19),(24+w_+18,y+19),(24+w_+13,y+26)],fill=rgb(T['tx']))
    tx(d,(dd[2]-12,y+22),'200',14,T['dim'],False,anchor='rm')
    lb=(W-12-lw_,y,W-12,y+44); touch('我要的詞 ›',lb); tx(d,(W-12,y+22),'我要的詞 3 ›',14,T['dim'],False,anchor='rm'); y+=52
    # 開關：✦2 以上為開
    x=12
    for i,kind in enumerate(('plain','star','plain')):
        on=(i==1)
        if kind=='star':
            tail='2 以上'; w=14+d.textlength(tail,font=_F(14,on))+24
            b=(x,y,x+w,y+44)
            if on: d.rectangle(b,fill=rgb(T['selbg']),outline=rgb(T['seledge']),width=2)
            else: d.rectangle(b,fill=rgb(T['inset']),outline=rgb(T['border']))
            star_text(img,(b[0]+b[2])/2,y+22,tail,sz=14,col=T['txs'] if on else T['dim'],bold=on,anchor='mm')
            d=ImageDraw.Draw(img,'RGBA'); touch('開關 ✦2 以上',b); x=b[2]+8
        else:
            s='只看有我要的詞' if i==0 else '有空位'
            w=d.textlength(s,font=_F(14,on))+24; b=(x,y,x+w,y+44)
            if on: d.rectangle(b,fill=rgb(T['selbg']),outline=rgb(T['seledge']),width=2)
            else: d.rectangle(b,fill=rgb(T['inset']),outline=rgb(T['border']))
            tx(d,((b[0]+b[2])/2,y+22),s,14,T['txs'] if on else T['dim'],on,anchor='mm'); touch('開關 '+s,b); x=b[2]+8
    y+=52; g0=y
    rare_n=0
    for i,(rar,up,st,lk) in enumerate(items):
        r_,c_=divmod(i,5); bx=19+c_*72; by=g0+r_*72
        if rar=='rare': rare_n+=1
        ecell(img,(bx,by,bx+64,by+64),rar,'gear_weapon_26',up=up,star=st,lk=lk,isz=32,
              frame_w=frame_w, rare_frame=rare_frame, sel=(i==sel))
    by0=NAV-64; d=actionbar(img,by0); amber(d,(12,by0+8,W-12,by0+56),'分解未鎖定的 %d 件'%n_unlocked)
    pnav(img,d,V,0); LOG['g0']=g0; LOG['rare_visible']=rare_n; LOG['cells_visible']=len(items); LOG['frame_w']=frame_w
    if rare_frame: LOG['rare_frame']=rare_frame
    if sel is not None: LOG['sel']=sel
    assume_tag(ImageDraw.Draw(img,'RGBA'), also_t=False, y=2)
    return img

def e6():
    return pick_screen(pick_items(), n_unlocked=41)

def e6b():
    # 同一批訊號，35 格全稀有（預設 2 px --rar-rare-frame）
    items=[('rare',up,st,lk) for rar,up,st,lk in pick_items()]
    return pick_screen(items, n_unlocked=41)

# ---------- 灰階可辨識證明
def _mask_and_luma(im):
    a=np.asarray(im.convert('RGBA'))
    luma=a[...,:3].astype(float)@[0.2126,0.7152,0.0722]
    L=Lstar(a.astype(float))
    mask=a[...,3]>40
    mean_y=float(luma[mask].mean()) if mask.any() else 0.0
    mean_L=float(L[mask].mean()) if mask.any() else 0.0
    return mask, mean_y, mean_L
def _center_mask(mask, S=24):
    ys,xs=np.where(mask)
    out=np.zeros((S,S),bool)
    if len(xs)==0: return out
    cy,cx=(ys.min()+ys.max())/2, (xs.min()+xs.max())/2
    for y,x in zip(ys,xs):
        yy=int(round(y-cy+S/2)); xx=int(round(x-cx+S/2))
        if 0<=yy<S and 0<=xx<S: out[yy,xx]=True
    return out
def _sil_diff(m1,m2):
    a,b=_center_mask(m1),_center_mask(m2)
    inter=np.logical_and(a,b).sum(); union=np.logical_or(a,b).sum(); xor=np.logical_xor(a,b).sum()
    iou=inter/union if union else 0.0
    return dict(iou=round(float(iou),3), xor_px=int(xor), union_px=int(union), inter_px=int(inter),
                sil_diff=round(1-float(iou),3))

def glyphs_gray():
    # 720×520 證明圖：彩色／灰階、64 格角位、與 ◆ 比較
    Wg,Hg=720,680
    img=Image.new('RGB',(Wg,Hg),rgb('#1d1a17')[:3]); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(16,18),'格子角標灰階可辨（64 px 格）',16,T['tx'],anchor='lm',kind='title')
    tx(d,(16,40),'四角星／單箭頭／雙箭頭／實心鎖／空心鎖／圓環孔／稀有菱（對照）',13,T['dim'],False,anchor='lm',kind='note')
    icons=[
        ('四角星', star4_icon(), 'tr'),
        ('單箭頭', arrow_icon(), 'tl'),
        ('雙箭頭', darrow_icon(), 'tl'),
        ('鎖實心', lock_icon('M'), 'br'),
        ('鎖空心', lock_icon('A'), 'br'),
        ('孔圓環', sock_icon(), 'bl'),
        ('稀有菱', diamond_icon(), 'mm'),
    ]
    stats=[]
    # 放大 4 倍列
    x,y=16,58
    for name,im,_ in icons:
        zoom=im.resize((im.size[0]*4,im.size[1]*4),Image.NEAREST)
        d.rectangle((x,y,x+64,y+64),fill=rgb('#282420'))
        img.paste(zoom,(x+(64-zoom.size[0])//2,y+(64-zoom.size[1])//2),zoom)
        d=ImageDraw.Draw(img,'RGBA')
        tx(d,(x+32,y+74),name,12,T['dim'],False,anchor='mt',kind='caption12')
        gray=ImageOps.grayscale(zoom.convert('RGB')).convert('RGB')
        # 用 alpha 貼灰階
        gz=Image.new('RGBA',zoom.size); gz.paste(gray); gz.putalpha(zoom.getchannel('A'))
        d.rectangle((x,y+90,x+64,y+154),fill=rgb('#282420'))
        img.paste(gz,(x+(64-gz.size[0])//2,y+90+(64-gz.size[1])//2),gz)
        d=ImageDraw.Draw(img,'RGBA')
        mask,my,mL=_mask_and_luma(im)
        stats.append((name,im,mask,my,mL))
        x+=96
    # 64 px 格：稀有底，角位
    y=270
    tx(d,(16,y),'放進 64×64 稀有格（上彩下灰）',14,T['tx'],anchor='lm',kind='label')
    y+=20
    def cell_demo(x,y,place,im,gray=False,rar_frame=True):
        box=(x,y,x+64,y+64)
        bg=rgb(T['rarebg'])[:3]
        d=ImageDraw.Draw(img,'RGBA')
        d.rectangle(box,fill=bg,outline=rgb(T['rare']))
        # 中間放一件淡圖示？只放角標比較清楚
        use=im
        if gray:
            g=ImageOps.grayscale(im.convert('RGB')).convert('RGB')
            use=Image.new('RGBA',im.size); use.paste(g); use.putalpha(im.getchannel('A'))
            # 整格轉灰
            crop=img.crop(box); img.paste(ImageOps.grayscale(crop).convert('RGB'),box)
            d=ImageDraw.Draw(img,'RGBA'); d.rectangle(box,outline=(180,180,180))
        if place=='tl': pos=(x+3,y+3)
        elif place=='tr': pos=(x+64-3-im.size[0],y+3)
        elif place=='bl': pos=(x+3,y+64-3-im.size[1])
        elif place=='br': pos=(x+64-3-im.size[0],y+64-3-im.size[1])
        else: pos=(x+(64-im.size[0])//2,y+(64-im.size[1])//2)
        # 底板
        d=ImageDraw.Draw(img,'RGBA')
        d.rectangle((pos[0]-2,pos[1]-2,pos[0]+im.size[0]+2,pos[1]+im.size[1]+2),fill=(40,36,32) if not gray else (36,36,36))
        img.paste(use,pos,use)
        return box
    x=16
    for name,im,place in icons:
        cell_demo(x,y,place,im,gray=False)
        d=ImageDraw.Draw(img,'RGBA'); tx(d,(x+32,y+70),name,12,T['dim'],False,anchor='mt',kind='caption12')
        cell_demo(x,y+86,place,im,gray=True)
        x+=96
    # 數值
    y=270+86+64+40
    # pairwise sil
    lines=[]
    names=[s[0] for s in stats]
    # 重點對：✦ vs ▲, ✦ vs ▲▲, ✦ vs 鎖, ✦ vs 孔, ▲ vs ▲▲, ▲ vs 鎖, ▲▲ vs 鎖, 孔 vs ◆, 鎖實心 vs 空心, 孔 vs ✦
    pairs=[('四角星','單箭頭'),('四角星','雙箭頭'),('四角星','鎖實心'),('四角星','孔圓環'),('單箭頭','雙箭頭'),('單箭頭','鎖實心'),('雙箭頭','鎖實心'),('孔圓環','稀有菱'),('鎖實心','鎖空心'),('孔圓環','單箭頭')]
    smap={n:(mask,my,mL) for n,im,mask,my,mL in [(s[0],s[1],s[2],s[3],s[4]) for s in stats]}
    results=[]
    tx(d,(16,y),'形狀／亮度（遮罩內平均 L*、剪影 1−IoU；越高越好分）',14,T['tx'],anchor='lm',kind='label'); y+=22
    for n,im,mask,my,mL in stats:
        line='%s  平均 L*=%.1f  平均 Y=%.0f'%(n,mL,my)
        results.append(dict(name=n,mean_Lstar=round(mL,1),mean_luma=round(my,1)))
        # will print pairs below
    x=16
    for n,im,mask,my,mL in stats:
        s='%s  L* %.1f'%(n,mL)
        tx(d,(x,y),s,13,T['dim'],False,anchor='lm',kind='caption12'); x+=100
    y+=24
    pair_res=[]
    x=16; row=0
    for a,b in pairs:
        dif=_sil_diff(smap[a][0],smap[b][0])
        ok=dif['sil_diff']>=0.35  # 剪影至少差 35% 才算易分
        s='%s vs %s  1−IoU=%.2f  xor=%d%s'%(a,b,dif['sil_diff'],dif['xor_px'], '' if ok else ' 偏近')
        # 空心對實心：剪影 IoU 天生會高（外框重疊），改比本體填滿率
        if {a,b}=={'鎖實心','鎖空心'}:
            def interior_fill(mask):
                h,w=mask.shape
                # 鎖體內部（扣掉約 2 px 外框）：實心應接近填滿，空心應接近空
                y0,y1=int(h*0.55), int(h*0.92); x0,x1=int(w*0.28), int(w*0.72)
                body=mask[y0:y1,x0:x1]
                return float(body.mean()) if body.size else 0.0
            fr_s=interior_fill(smap['鎖實心'][0]); fr_h=interior_fill(smap['鎖空心'][0])
            ok=fr_s>=0.8 and fr_h<=0.45
            dif['solid_interior_fill']=round(fr_s,3); dif['hollow_interior_fill']=round(fr_h,3)
            s='鎖實心 vs 空心  體內填滿 %.0f%%／%.0f%%'%(fr_s*100,fr_h*100)
        pair_res.append(dict(a=a,b=b,**dif,distinguishable=ok))
        tx(d,(x,y),s,13,T['tx'] if ok else T['bad'],False,anchor='lm',kind='caption12')
        row+=1
        if row%2==0: x=16; y+=20
        else: x=370
    LOG['glyphs']=dict(means=results,pairs=pair_res)
    return img

# ======================================================================
# v0.4（M2-item-display §9–12，mumi 20:33）：E2′／E3′／E7／E7b、特殊詞圖示、滿值記號
# ======================================================================
import sys as _sys
_sys.path.insert(0,'/workspace/d2final/equip')
import icons_v04 as IC4
T.update(corr='#ff6066', cal='#bd7aff')   # --cat-corr／--cat-cal（M2-36 色票）
CAL_HI='#f1e4ff'   # 災魘徽章內部亮階（只用在 16 px 徽章內部，灰階 ΔL* 用）
SPEC_COL={'seal':T['chase'],'mem':T['mem'],'frac':T['frac'],'corr':T['corr'],'cal':T['cal'],'calcorr':T['cal']}
SPEC_MASK={'seal':IC4.SEAL,'mem':IC4.INK,'frac':IC4.STAR,'corr':IC4.CORR,'cal':IC4.CAL,'calcorr':IC4.CALCORR}
SPEC_ORDER=['seal','mem','frac','corr','calcorr','cal']   # v1.0：印 → 追憶 → 腐化（或災魘詞）；frac／cal 只留給舊圖
IC4.STAR4=np.asarray(star4_icon(None,10))[...,3]>40   # 比較用：格子／詞前 ✦ 的同一多邊形，10 px、alpha>40
def spec_icon(kind,col=None):
    if kind=='calcorr' and col is None: return IC4.to_rgba2(IC4.CALCORR, rgb(T['cal'])[:3], rgb(CAL_HI)[:3])   # 外緣＋角刺 --cat-cal、內部亮階
    return IC4.to_rgba(SPEC_MASK[kind], rgb(col or SPEC_COL[kind])[:3])
def maxr_icon(col=None): return IC4.to_rgba(IC4.MAXR, rgb(col or T['txs'])[:3])
PANEL='#25211e'; HDR='#2d251f'
SIMPLE_MAX_H=440          # 半高面板上限（§11b 20:50：420→440）；超過才捲

def divider(d,y):
    """層與層之間：上 8＋1 px --border＋下 8。"""
    d.line((12,y+8,W-12,y+8),fill=rgb(T['border'])); return y+17

def mod_text(img,x,y,text,col,maxr_on,sz=14,kind='body',bold_all=False,maxr_col=None):
    """text 內 {…} 是數值；v0.5 §13-1：滿值只用粗體（數值 700＋--tx-strong），沒有記號、沒有底線。
    bold_all：破裂詞整行 --cat-frac 700（§13-4）。回傳終了 x。"""
    d=ImageDraw.Draw(img,'RGBA')
    if '{' in text:
        a,rest=text.split('{',1); v,b=rest.split('}',1)
    else: a,v,b=text,'',''
    if a: x+=tx(d,(x,y),a,sz,col,bold_all,anchor='lm',kind=kind)
    if v:
        if maxr_on:
            x+=tx(d,(x,y),v,sz,maxr_col or T['txs'],True,anchor='lm',kind=kind)
            LOG.setdefault('maxr_bold',[]).append(text.replace('{','').replace('}',''))
        else:
            x+=tx(d,(x,y),v,sz,col,bold_all,anchor='lm',kind=kind)
    if b: x+=tx(d,(x,y),b,sz,col,bold_all,anchor='lm',kind=kind)
    return x

def glow_top(img,y0,col,alpha=0.12,h=72):
    """§11 頂級裝：面板頂 72 px 稀有度色淡光暈，不透明度 ≤12%，往下線性淡到 0。"""
    a=np.asarray(img.convert('RGB')).astype(float); c=hx(col)
    for k in range(h):
        t=alpha*(1-k/h); a[y0+k,1:W-1]=a[y0+k,1:W-1]*(1-t)+c*t
    img.paste(Image.fromarray(np.round(a).astype(np.uint8),'RGB')); LOG['glow']=dict(alpha_max=alpha,h=h,col=col)

def badge_row(img,x,y,it):
    """§11 勳章列：依 §9 順序畫有的特殊詞圖示 16（間距 6），最後 ✦{n}／{詞數}。"""
    have=[k for k in SPEC_ORDER if k in it['spec_kinds']]
    for k in have:
        ic=spec_icon(k); img.paste(ic,(int(x),int(y-8)),ic); x+=16+6
    x+=4; s=star4_icon(); img.paste(s,(int(x),int(y-6)),s); x+=14
    d=ImageDraw.Draw(img,'RGBA'); tx(d,(x,y),'%d／%d'%(it['star_n'],it['mod_n']),14,T['txs'],True,anchor='lm')
    LOG['badges']=have+['✦%d／%d'%(it['star_n'],it['mod_n'])]

def header_v4(img,y,it,on,y_panel):
    """頭：名字（稀有度色）／副標（部位・物品等級・品質・狀態）／（有特殊詞時）勳章列。"""
    hh=88 if it.get('spec_kinds') else 64
    d=ImageDraw.Draw(img,'RGBA'); d.rectangle((1,y,W-2,y+hh-1),fill=rgb(HDR))
    if it.get('glow'): glow_top(img,y_panel,T[it['rar']])
    d=ImageDraw.Draw(img,'RGBA')
    detail_toggle(img,d,y,on=on,row_h=44)
    ib=(14,y+8,54,y+48); ecell(img,ib,it['rar'],it['ic'],isz=28,register_touch=False)
    d=ImageDraw.Draw(img,'RGBA')
    draw_name(img,d,66,y+20,it,sz=20 if it.get('glow') else 18); d=ImageDraw.Draw(img,'RGBA')
    # 副標：「品質 +{n}%」≥20%（到上限）時 700，其他一般字重；顏色都 --tx-dim（§13-2）
    parts=it['sub'].split('・'); maxw=W-12-66
    def seg_bold(p_):
        import re as _re
        mm=_re.match(r'品質 \+(\d+)%',p_); return bool(mm and int(mm.group(1))>=20)
    def seg_w(p_): return d.textlength(p_,font=_F(14,seg_bold(p_)))
    sep_w=d.textlength('・',font=_F(14,False))
    lines=[[]]; w=0
    for p_ in parts:
        add=seg_w(p_)+(sep_w if lines[-1] else 0)
        if lines[-1] and w+add>maxw: lines.append([]); w=0; add=seg_w(p_)
        lines[-1].append(p_); w+=add
    if len(lines)>1: hh+=18; d.rectangle((1,y+hh-19,W-2,y+hh-1),fill=rgb(HDR))
    for li,ln in enumerate(lines):
        xx=66; yy=y+46+18*li
        for j,p_ in enumerate(ln):
            if j: xx+=tx(d,(xx,yy),'・',14,T['dim'],False,anchor='lm')
            xx+=tx(d,(xx,yy),p_,14,T['dim'],seg_bold(p_),anchor='lm')
            if seg_bold(p_): LOG['quality_bold']=p_
    if it.get('spec_kinds'): badge_row(img,66,y+hh-16,it)
    d=ImageDraw.Draw(img,'RGBA'); d.line((1,y+hh,W-2,y+hh),fill=rgb(T['border']))
    return y+hh+1

def verdict_fits(it):
    dd=ImageDraw.Draw(Image.new('RGB',(1,1)))
    vw=dd.textlength(it['verdict'],font=_F(18)); pw=dd.textlength('DPS '+it.get('dps_total',''),font=_F(14,False)) if it.get('dps_total') else 0
    return 12+vw+16+pw+12<=W, round(12+vw+16+pw+12,1)
def verdict_h(it): return 40 if verdict_fits(it)[0] else 62
def verdict_row(img,y,it,simple=True):
    """結論列：簡單、詳細同一個 y、同一個高度；右側暗字 DPS 總值（§11b）。放不下才把 DPS 換到下一行。"""
    d=ImageDraw.Draw(img,'RGBA'); fits,need=verdict_fits(it)
    tx(d,(12,y+20),it['verdict'],18,T[it['vcol']],anchor='lm')
    if it.get('dps_total'):
        if fits: tx(d,(W-12,y+20),'DPS '+it['dps_total'],14,T['dim'],False,anchor='rm')
        else: tx(d,(12,y+46),'DPS '+it['dps_total'],14,T['dim'],False,anchor='lm')
    LOG['verdict']=dict(row_top=y,text_center_y=y+20,one_line=fits,width_needed=need,width_avail=W)
    return y+verdict_h(it)

# ---------- 特殊詞列（破裂那條是可換的一層：mumi 若改「破裂石只鎖詞」→ FRAC_VARIANT='T1'）
FRAC_VARIANT='A'   # §13-4 破裂石 A 案：只固定一條詞、不改階，留在原組原位
def frac_placeholder(variant=None):
    """詳細版前綴組裡的佔位列（算進 a／3）。跟 frac_mod 同一層，改 T1 時一起換。"""
    v=variant or FRAC_VARIANT
    return dict(icon='frac',text='破裂詞（見上方）',slot='pre')
def frac_mod(variant=None):
    v=variant or FRAC_VARIANT
    if v=='A':    # v0.5：回到前綴組第一位，左欄 ★＋--cat-frac 700；T1 [143–170]，170＝滿值
        return dict(kind='frac',frac=True,text='增加 {170%} 物理傷害',star=True,tier=1,lo='143',hi='170',maxr=True,nvals=28)
    if v=='T0':   # 舊：破裂＝T0、鎖住
        return dict(kind='frac',text='增加 {182%} 物理傷害',star=True,tier=0,lo='155',hi='182',maxr=True,nvals=28,slot='pre')
    # 備案：破裂石只鎖詞，詞保留原本的 T1
    return dict(kind='frac',text='增加 {129%} 物理傷害',star=True,tier=1,lo='110',hi='134',maxr=False,nvals=25,slot='pre')

def simple_rows(it):
    """回傳 [(layer, row)]，照 §9：固定詞 → 特殊詞（固定順序）→ 一般詞（✦ 在前）。"""
    L=[]
    if it.get('implicit'): L.append(('imp',dict(text=it['implicit'])))
    sp=sorted(it.get('special',[]),key=lambda m:SPEC_ORDER.index(m['kind']))
    for m in sp:
        L.append(('spec',m))
        for c in m.get('cost',[]): L.append(('spec_cost',dict(text=c,kind=m['kind'])))
        for sb in m.get('sub',[]):     # 災魘加上的效果：接在原腐化效果下面、縮排 16（§15-4）
            L.append(('spec_sub',dict(sb,kind=m['kind'])))
            for c in sb.get('cost',[]): L.append(('spec_cost_sub',dict(text=c,kind=m['kind'])))
    reg=it['pre']+it['suf']; reg=sorted(reg,key=lambda m:not m.get('star'))
    for m in reg: L.append(('reg',m))
    return L

def draw_simple_row(img,y,layer,m,h=28):
    d=ImageDraw.Draw(img,'RGBA'); cy=y+h/2
    show_max=m.get('maxr') and m.get('nvals',0)>=10      # §10：簡單版只在範圍 ≥10 個值才標
    if layer=='imp':
        tx(d,(12,cy),m['text'],14,T['tx'],False,anchor='lm'); tx(d,(W-12,cy),'固定詞',13,T['dim'],False,anchor='rm',kind='tag13')
    elif layer=='spec':
        ic=spec_icon(m['kind']); img.paste(ic,(12,int(cy-8)),ic); x=34
        if m.get('star'): s=star4_icon(); img.paste(s,(x,int(cy-6)),s); x+=14
        mod_text(img,x,cy,m['text'],SPEC_COL[m['kind']],show_max,maxr_col=SPEC_COL[m['kind']])
    elif layer=='spec_cost':
        tx(d,(34,cy),m['text'],14,T['bad'],False,anchor='lm')
    elif layer=='spec_sub':
        mod_text(img,34+16,cy,m['text'],SPEC_COL[m['kind']],show_max,maxr_col=SPEC_COL[m['kind']])
    elif layer=='spec_cost_sub':
        tx(d,(34+16,cy),m['text'],14,T['bad'],False,anchor='lm')
    elif m.get('fcol'):
        # v0.6 固定欄：有破裂詞的裝備，一般詞每列都留 ★ 欄 16（x12），✦ 欄（x32），詞文（x48）
        if m.get('frac'): ic=spec_icon('frac'); img.paste(ic,(COLS_S['star'],int(cy-8)),ic)
        if m.get('star'): s=star4_icon(); img.paste(s,(COLS_S['dia'],int(cy-6)),s)
        col=T['frac'] if m.get('frac') else T['tx']
        mod_text(img,COLS_S['text'],cy,m['text'],col,show_max,maxr_col=(T['frac'] if m.get('frac') else None))   # 破裂：整行 400，只有滿值數字 700，同 --cat-frac
    else:
        x=12
        if m.get('star'): s=star4_icon(); img.paste(s,(x,int(cy-6)),s); x+=14
        mod_text(img,x,cy,m['text'],T['tx'],show_max)
    return y+h
COLS_S=dict(star=12,dia=32,text=48)          # 簡單版（有破裂詞時）
COLS_D=dict(star=12,dia=32,tier=50,text=76)  # 詳細版（有破裂詞時）

def simple_content(it,width=W):
    rows=simple_rows(it); n=sum(28 for _ in rows)
    layers=[]; prev=None
    for lay,m in rows:
        g='spec' if lay.startswith('spec') else lay
        if prev is not None and g!=prev: layers.append(('div',None))
        layers.append((lay,m)); prev=g
    h=sum(17 if l=='div' else 28 for l,_ in layers)
    return layers,h

def render_simple_strip(it):
    layers,h=simple_content(it); can=Image.new('RGB',(W,h+4),rgb(PANEL)[:3]); y=0
    for lay,m in layers:
        if lay=='div': y=divider(ImageDraw.Draw(can,'RGBA'),y-8)+0  # 分隔線（上 8 已算在 17 裡）
        else: y=draw_simple_row(can,y,lay,m)
    return can,y

def simple_panel_v4(img,it,toast=False,scroll=0):
    """半高；頭＋勳章列＋結論固定不捲，下面捲（§11）。"""
    _s,ch=render_simple_strip(it)
    pinned=24+(88 if it.get('spec_kinds') else 64)+1+verdict_h(it)+17
    need=pinned+ch+8+64; ph=min(SIMPLE_MAX_H,need); y0=NAV-ph
    apply_grid_scrim(img,LOG.get('g0',TOP)-4,y0)
    if 'selbox' in LOG:
        box,chase,rar=LOG['selbox']; x0,y0s,x1,y1=box; dd=ImageDraw.Draw(img,'RGBA'); dd.rectangle((x0-4,y0s-4,x1+4,y1+4),outline=rgb(T['seledge']),width=2)
    d=panel_bg(img,y0,NAV)
    y=y0+24
    y=header_v4(img,y,it,False,y0)
    d=ImageDraw.Draw(img,'RGBA'); d.rounded_rectangle((W/2-22,y0+10,W/2+22,y0+13),2,fill=rgb(T['borderhi']))
    y=verdict_row(img,y,it,True); y=divider(ImageDraw.Draw(img,'RGBA'),y-8)
    by=NAV-64; view=by-y
    strip,sh=render_simple_strip(it)
    scroll=max(0,min(scroll,sh-view+8)) if sh>view else 0
    crop=Image.new('RGB',(W,view),rgb(PANEL)[:3]); crop.paste(strip.crop((0,scroll,W,min(strip.size[1],scroll+view))),(0,0)); img.paste(crop.crop((1,0,W-1,view)),(1,y))
    a=np.asarray(img.convert('RGB')).astype(float); pc=hx(PANEL)
    scrolls=sh>view
    if scrolls and scroll+view<sh:        # 下緣淡出：還有內容
        for k in range(20):
            yy=by-20+k; t=(k+1)/20*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    if scroll>0:                          # 上緣：被捲上去的內容淡進固定區下面
        for k in range(12):
            yy=y+k; t=(1-(k+1)/12)*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    img.paste(Image.fromarray(np.round(a).astype(np.uint8),'RGB'))
    d=ImageDraw.Draw(img,'RGBA')
    if scrolls:                           # 捲軸 3 px，--border-hi（對 --panel ≥3:1）
        th=max(24,int(view*view/sh)); ty=y+int((view-th)*scroll/max(1,sh-view+8))
        d.rounded_rectangle((W-6,ty,W-3,ty+th),1,fill=rgb(T['borderhi'])); LOG['scrollbar']=dict(view=view,content=sh,scroll=scroll)
    d,by=action_row(img,it['swap'])
    pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    LOG['detail']=dict(panel_top=y0,panel_h=ph,pinned_end=y,view=view,content=sh,scroll=scroll,scrolls=scrolls)
    if toast:
        s_tail=' 是這件裝備能骰到最好的階'; d=ImageDraw.Draw(img,'RGBA'); fnt=_F(14,False); tw=14+d.textlength(s_tail,font=fnt)
        tb=(max(12,(W-tw-32)/2), y0-8-40, min(W-12,(W+tw+32)/2), y0-8)
        d.rectangle((tb[0]+2,tb[1]+3,tb[2]+2,tb[3]+3),fill=T['scrim']+(160,)); d.rectangle(tb,fill=rgb(T['plate'],250),outline=rgb(T['borderhi']))
        star_text(img,(tb[0]+tb[2])/2,(tb[1]+tb[3])/2,s_tail,sz=14,col=T['tx'],bold=False,anchor='mm',kind='toast'); LOG['toast']=dict(box=tb)
    return img

# ---------- 詳細版
def range_txt(img,xr,cy,lo,hi,underline):
    d=ImageDraw.Draw(img,'RGBA'); f=_F(13,False)
    s1='[%s–'%lo; s2=hi; s3=']'
    w1,w2,w3=(d.textlength(s,font=f) for s in (s1,s2,s3)); x=xr-(w1+w2+w3)
    tx(d,(x,cy),s1,13,T['dim'],False,anchor='lm',kind='range13')
    tx(d,(x+w1,cy),s2,13,T['dim'],False,anchor='lm',kind='range13')   # v0.5：範圍不加底線、不加粗
    tx(d,(x+w1+w2,cy),s3,13,T['dim'],False,anchor='lm',kind='range13')

def draw_detail_row(img,y,layer,m,h=30):
    d=ImageDraw.Draw(img,'RGBA'); cy=y+h/2; x=16
    if layer=='spec':
        ic=spec_icon(m['kind']); img.paste(ic,(12,int(cy-8)),ic); x=34; col=SPEC_COL[m['kind']]
    elif layer=='spec_cost':
        tx(d,(34,cy),m['text'],14,T['bad'],False,anchor='lm'); return y+h
    elif layer=='spec_cost_sub':
        tx(d,(34+16,cy),m['text'],14,T['bad'],False,anchor='lm'); return y+h
    elif layer=='spec_sub':
        col=SPEC_COL[m['kind']]; xx=34+18+16
        mod_text(img,xx,cy,m['text'],col,bool(m.get('maxr')),maxr_col=col)
        if m.get('lo') is not None: range_txt(img,W-12,cy,m['lo'],m['hi'],False)
        return y+h
    elif layer=='placeholder':
        ph_=m or frac_placeholder(); ic=spec_icon(ph_['icon'],T['dim']); img.paste(ic,(16,int(cy-8)),ic)   # 「★ 破裂詞（見上方）」：★ 是畫的圖示
        tx(d,(38,cy),ph_['text'],14,T['dim'],False,anchor='lm'); return y+h
    elif m.get('fcol'):
        # v0.6 固定欄：★ x12（16）→ ✦ x32 → T x50 → 詞文 x76；沒 ★ 的列 ★ 欄留空
        if m.get('frac'): ic=spec_icon('frac'); img.paste(ic,(COLS_D['star'],int(cy-8)),ic)
        if m.get('star'): s=star4_icon(); img.paste(s,(COLS_D['dia'],int(cy-6)),s)
        if m.get('tier') is not None: tx(d,(COLS_D['tier'],cy),'T%d'%m['tier'],13,T['dim'],False,anchor='lm',kind='tier13')
        col=T['frac'] if m.get('frac') else T['tx']
        mod_text(img,COLS_D['text'],cy,m['text'],col,bool(m.get('maxr')),maxr_col=(T['frac'] if m.get('frac') else None))
        if m.get('lo') is not None: range_txt(img,W-12,cy,m['lo'],m['hi'],False)
        LOG.setdefault('cols_d',COLS_D)
        return y+h
    else: col=T['tx']
    if m.get('star'): s=star4_icon(); img.paste(s,(int(x),int(cy-6)),s)
    x+=18                            # ✦ 欄固定寬，T 字對齊
    if m.get('tier') is not None:   # v0.5 §13-5：T 純文字 13 --tx-dim，沒有框
        tx(d,(x,cy),'T%d'%m['tier'],13,T['dim'],False,anchor='lm',kind='tier13'); x+=26; d=ImageDraw.Draw(img,'RGBA')
    mod_text(img,x,cy,m['text'],col,bool(m.get('maxr')),maxr_col=(col if layer=='spec' else None))    # 詳細版：滿值全部粗體；特殊詞滿值用自己的色
    if m.get('lo') is not None: range_txt(img,W-12,cy,m['lo'],m['hi'],bool(m.get('maxr')))
    return y+h

def detail_strip(it):
    can=Image.new('RGB',(W,1400),rgb(PANEL)[:3]); d=ImageDraw.Draw(can,'RGBA'); y=0
    # 結論層（結論列本身固定在上面，跟簡單版同 y）：只留 DPS、生命差值
    for lab,val,k in it['stats']:
        tx(d,(12,y+12),lab,14,T['dim'],False,anchor='lm'); diff(d,W-12,y+12,val,k); y+=24
    y=divider(d,y-4)
    # 物品等級天花板＋底材（§11b：移到結論下面、固定詞上面）
    tx(d,(12,y+9),it['ilvl_line'],13,T['dim'],False,anchor='lm',kind='ilvl13'); y+=22
    for lab,val,q in it['base']:
        tx(d,(12,y+12),lab,14,T['dim'],False,anchor='lm')
        if q:
            ww=d.textlength('（含品質）',font=_F(13,False))
            tx(d,(W-12,y+12),'（含品質）',13,T['dim'],False,anchor='rm',kind='q13')
            tx(d,(W-12-ww-2,y+12),val,14,T['txs'],True,anchor='rm')
        else: tx(d,(W-12,y+12),val,14,T['tx'],False,anchor='rm')
        y+=24
    y=divider(d,y-4)
    if it.get('implicit'):
        tx(d,(16,y+14),'固定詞',13,T['dim'],False,anchor='lm',kind='label13')
        tx(d,(16+d.textlength('固定詞',font=_F(13,False))+8,y+14),it['implicit'],14,T['tx'],False,anchor='lm'); y+=28
        y=divider(d,y-4)
    sp=sorted(it.get('special',[]),key=lambda m:SPEC_ORDER.index(m['kind']))
    if sp:
        for m in sp:
            y=draw_detail_row(can,y,'spec',m)
            for c in m.get('cost',[]): y=draw_detail_row(can,y,'spec_cost',dict(text=c))
            for sb in m.get('sub',[]):
                y=draw_detail_row(can,y,'spec_sub',dict(sb,kind=m['kind']))
                for c in sb.get('cost',[]): y=draw_detail_row(can,y,'spec_cost_sub',dict(text=c))
        y=divider(ImageDraw.Draw(can,'RGBA'),y-4)
    d=ImageDraw.Draw(can,'RGBA')
    for grp,key in (('前綴','pre'),('後綴','suf')):
        ms=sorted(it[key],key=lambda m:not m.get('star'))
        nfr=sum(1 for m in sp if m['kind']=='frac' and m.get('slot')==key)
        y=grp_head(d,y,'%s %d／3'%(grp,len(ms)+nfr))
        for _ in range(nfr): y=draw_detail_row(can,y,'placeholder',frac_placeholder())
        for m in ms: y=draw_detail_row(can,y,'reg',m)
        d=ImageDraw.Draw(can,'RGBA')
        if len(ms)+nfr<3: y=empty_row(d,y,3-len(ms)-nfr)
    y+=4; lb=(12,y,W-12,y+44); touch('全部屬性 ›',lb); tx(d,(12,y+22),'全部屬性 ›',14,T['tx'],False,anchor='lm'); y+=48
    return can.crop((0,0,W,y)),y

def detail_panel_v4(it,scroll=0):
    img,d,y=full_sheet(); y0=TOPF
    y=header_v4(img,y,it,True,y0)
    by=NAV-64; ly=by-28; view=ly-y
    strip,sh=detail_strip(it)
    scroll=max(0,min(scroll,sh-view)) if sh>view else 0
    crop=Image.new('RGB',(W,view),rgb(PANEL)[:3]); crop.paste(strip.crop((0,scroll,W,min(strip.size[1],scroll+view))),(0,0)); img.paste(crop.crop((1,0,W-1,view)),(1,y))
    a=np.asarray(img.convert('RGB')).astype(float); pc=hx(PANEL); scrolls=sh>view
    if scrolls and scroll+view<sh:
        for k in range(20): yy=ly-20+k; t=(k+1)/20*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    if scroll>0:
        for k in range(12): yy=y+k; t=(1-(k+1)/12)*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    img.paste(Image.fromarray(np.round(a).astype(np.uint8),'RGB')); d=ImageDraw.Draw(img,'RGBA')
    if scrolls:
        th=max(24,int(view*view/sh)); ty=y+int((view-th)*scroll/max(1,sh-view))
        d.rounded_rectangle((W-6,ty,W-3,ty+th),1,fill=rgb(T['borderhi'])); LOG['scrollbar']=dict(view=view,content=sh,scroll=scroll)
    # 常駐圖例：✦＋滿值記號
    d.rectangle((1,ly,W-2,by-1),fill=rgb(PANEL)); d.line((12,ly,W-12,ly),fill=rgb(T['border']))
    star_text(img,12,ly+14,' 是這件裝備能骰到最好的階',sz=13,col=T['dim'],bold=False,kind='legend13',anchor='lm')
    d,by=action_row(img,it['swap']); pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    LOG['detail']=dict(panel_top=y0,pinned_end=y,view=view,content=sh,scroll=scroll,scrolls=scrolls)
    return img

# ---------- 資料
def corner_tag(img,s,y=2):
    d=ImageDraw.Draw(img,'RGBA'); w=d.textlength(s,font=_F(12))
    d.rounded_rectangle((4,y,4+w+12,y+20),3,fill=rgb(T['plate'],240),outline=rgb(T['warn']))
    tx(d,(10,y+10),s,12,T['dim'],anchor='lm',kind='note')
    d.rounded_rectangle((W-48,y,W-6,y+16),2,fill=rgb(T['plate'],235)); tx(d,(W-27,y+8),'示意',12,T['txs'],anchor='mm',kind='label')

SHOW4=dict(rar='rare',ic='gear_weapon_26',name='猛擊神機弩・疾風',
    sub='十字弓・物品等級 16・品質 +20%',
    ilvl_line='物品等級 16：詞最高 T5',
    verdict='▲ 比現在 +18% 傷害',vcol='good',dps_total='61.2',
    stats=[('DPS','▲ +18%','up'),('生命','▼ −1%','down')],
    base=[('物理傷害','17–31',True),('每秒攻擊','1.25',False),('暴擊率','5.0%',False)],
    implicit='穿透 1 個目標',special=[],spec_kinds=[],
    pre=[dict(text='增加 {74%} 物理傷害',star=True,tier=5,lo='48',hi='74',maxr=False,nvals=27),
         dict(text='附加 15 至 {29} 火焰傷害',tier=6,lo='8',hi='32',maxr=False,nvals=25),
         dict(text='附加 5 至 {10} 物理傷害',tier=7,lo='4',hi='18',maxr=False,nvals=15)],
    suf=[dict(text='增加 {24%} 攻擊速度',star=True,tier=5,lo='12',hi='24',maxr=False,nvals=13),
         dict(text='{+4%} 暴擊率',tier=6,lo='2',hi='8',maxr=False,nvals=7),
         dict(text='命中值 {+180}',tier=8,lo='80',hi='240',maxr=False,nvals=161)],
    swap='換下 ◆ 連弩，放進倉庫')

def special_mods_v5():
    """特殊詞層（可換）：v1.0 §15-2 印 → 追憶 → 腐化（最多一條，可能是災魘狀態）。
    災魘詞＝同一條腐化詞升級：kind='calcorr'，原腐化效果在上，災魘加上的效果放 sub（縮排 16）。內容與名詞待數值設計師，這裡是示意。破裂不在這層。"""
    return [dict(kind='seal',text='增加 13% 傷害'),
            dict(kind='mem',text='投射物 +1'),
            dict(kind='calcorr',text='{+30%} 暴擊傷害加成',lo='25',hi='35',maxr=False,nvals=11,cost=['▼ 減少 10% 最大生命'],
                 sub=[dict(text='暴擊時回復 {2%} 最大生命',lo='1',hi='3',maxr=False,nvals=3,cost=['▼ -23% 火焰抗性'])])]
def top4(frac_variant=None):
    fm=frac_mod(frac_variant)
    it=dict(rar='rare',ic='gear_weapon_26',name='凶暴神機弩・迅捷',glow=True,
        sub='十字弓・物品等級 16・品質 +28%・已災魘',   # 名詞表 v0.6.33：災魘詞時只寫「已災魘」
        ilvl_line='物品等級 16：詞最高 T1',
        verdict='▲ 大幅變強・比現在 +31% 傷害',vcol='good',dps_total='148',
        stats=[('DPS','▲ +31%','up'),('生命','▼ −1%','down')],
        base=[('物理傷害','18–33',True),('每秒攻擊','1.30',False),('暴擊率','5.0%',False)],
        implicit='投射物穿透 +1',
        special=special_mods_v5(),
        pre=[fm,dict(text='附加 19 至 {37} 火焰傷害',star=True,tier=1,lo='28',hi='37',maxr=True,nvals=10),
             dict(text='附加 11 至 {22} 物理傷害',tier=2,lo='18',hi='26',maxr=False,nvals=9)],
        suf=[dict(text='增加 {30%} 攻擊速度',star=True,tier=0,lo='26',hi='30',maxr=True,nvals=5),
             dict(text='{+66%} 暴擊傷害加成',star=True,tier=1,lo='55',hi='70',maxr=False,nvals=16),
             dict(text='命中值 {+240}',tier=3,lo='150',hi='280',maxr=False,nvals=131)],
        swap='換下 ◆ 連弩，放進倉庫')
    it['spec_kinds']=[m['kind'] for m in it['special']]
    if any(m.get('frac') for m in it['pre']+it['suf']):
        for m in it['pre']+it['suf']: m['fcol']=True     # 有破裂詞：一般詞全部走固定欄
    it['star_n']=sum(1 for m in it['special']+it['pre']+it['suf'] if m.get('star'))
    it['mod_n']=len(it['pre'])+len(it['suf'])+sum(1 for m in it['special'] if m.get('slot'))
    return it

def pack_v4(top=False):
    G=pack_items(); G[0]=('gear_weapon_26','rare','up2' if top else 'up',(top4()['star_n'] if top else 2),None,False); return G

def e2p():
    img=loot_screen(pack_v4(),sel=0); simple_panel_v4(img,SHOW4,toast=True)
    corner_tag(img,'數字為假定・品質 20% 為測試值',y=42); return img
def e3p():
    img=detail_panel_v4(SHOW4); corner_tag(img,'數字為假定・品質 20% 為測試值・T{n} 為排版測試值',y=2); return img
def e7(scroll=0):
    items=pack_v4(True); img=loot_screen(items,sel=0); grid_ticks(img,items,e7_specmap()); simple_panel_v4(img,top4(),scroll=scroll); corner_tag(img,'示意用假資料',y=42); return img
def e7_scroll(): return e7(scroll=10**4)
def e7b(scroll=0):
    img=detail_panel_v4(top4(),scroll=scroll); corner_tag(img,'示意用假資料',y=2); return img
def e7b_scroll(): return e7b(scroll=10**4)


def simple_top(it):
    _s,ch=render_simple_strip(it); pinned=24+(88 if it.get('spec_kinds') else 64)+1+verdict_h(it)+17
    return NAV-min(SIMPLE_MAX_H,pinned+ch+8+64)

def detail_panel_v5(it,scroll=0,mode='toggled'):
    """mode='toggled'：剛切到詳細，面板頂維持簡單版位置→頭＋結論同一個 y；內容往上捲時面板升成全高。
       mode='full'：全高（764）。頭＋結論固定，其餘捲。"""
    if mode=='toggled':
        y0=simple_top(it); items=pack_v4(bool(it.get('glow'))); img=loot_screen(items,sel=0)
        if it.get('glow'): grid_ticks(img,items,e7_specmap())
        apply_grid_scrim(img,LOG.get('g0',TOP)-4,y0)
        if 'selbox' in LOG:
            box,_c,_r=LOG['selbox']; x0,y0s,x1,y1=box; ImageDraw.Draw(img,'RGBA').rectangle((x0-4,y0s-4,x1+4,y1+4),outline=rgb(T['seledge']),width=2)
        panel_bg(img,y0,NAV); y=y0+24
    else:
        img,d,y=full_sheet(); y0=TOPF
    y=header_v4(img,y,it,True,y0)
    d=ImageDraw.Draw(img,'RGBA'); d.rounded_rectangle((W/2-22,y0+10,W/2+22,y0+13),2,fill=rgb(T['borderhi']))
    y=verdict_row(img,y,it,False); d=ImageDraw.Draw(img,'RGBA'); d.line((12,y,W-12,y),fill=rgb(T['border'],0)); 
    by=NAV-64; ly=by-28; view=ly-y
    strip,sh=detail_strip(it)
    scroll=max(0,min(scroll,sh-view)) if sh>view else 0
    crop=Image.new('RGB',(W,view),rgb(PANEL)[:3]); crop.paste(strip.crop((0,scroll,W,min(strip.size[1],scroll+view))),(0,0)); img.paste(crop.crop((1,0,W-1,view)),(1,y))
    a=np.asarray(img.convert('RGB')).astype(float); pc=hx(PANEL); scrolls=sh>view
    if scrolls and scroll+view<sh:
        for k in range(20): yy=ly-20+k; t=(k+1)/20*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    if scroll>0:
        for k in range(12): yy=y+k; t=(1-(k+1)/12)*0.85; a[yy,2:W-2]=a[yy,2:W-2]*(1-t)+pc*t
    img.paste(Image.fromarray(np.round(a).astype(np.uint8),'RGB')); d=ImageDraw.Draw(img,'RGBA')
    if scrolls:
        th=max(24,int(view*view/sh)); ty=y+int((view-th)*scroll/max(1,sh-view))
        d.rounded_rectangle((W-6,ty,W-3,ty+th),1,fill=rgb(T['borderhi'])); LOG['scrollbar']=dict(view=view,content=sh,scroll=scroll)
    d.rectangle((1,ly,W-2,by-1),fill=rgb(PANEL)); d.line((12,ly,W-12,ly),fill=rgb(T['border']))
    star_text(img,12,ly+14,' 是這件裝備能骰到最好的階',sz=13,col=T['dim'],bold=False,kind='legend13',anchor='lm')
    d,by=action_row(img,it['swap']); pnav(img,ImageDraw.Draw(img,'RGBA'),V,0)
    LOG['detail']=dict(mode=mode,panel_top=y0,pinned_end=y,view=view,content=sh,scroll=scroll,scrolls=scrolls)
    return img
def e3p():
    img=detail_panel_v5(SHOW4,0,'toggled'); corner_tag(img,'數字為假定・品質 20% 為測試值・T{n} 為排版測試值',y=42); return img
def e3p_scroll():
    img=detail_panel_v5(SHOW4,10**4,'full'); corner_tag(img,'數字為假定・品質 20% 為測試值・T{n} 為排版測試值',y=2); return img
def e3p_full():
    img=detail_panel_v5(SHOW4,0,'full'); corner_tag(img,'數字為假定・品質 20% 為測試值・T{n} 為排版測試值',y=2); return img
def e7b():
    img=detail_panel_v5(top4(),0,'toggled'); corner_tag(img,'示意用假資料',y=42); return img
def e7b_scroll():
    img=detail_panel_v5(top4(),10**4,'full'); corner_tag(img,'示意用假資料',y=2); return img
def e7b_full():
    img=detail_panel_v5(top4(),0,'full'); corner_tag(img,'示意用假資料',y=2); return img

# ---------- v0.5 §14：格子看得出特殊詞（E1a 底邊刻度／E1b 雙框＋四角飾）
E1_SPECIAL={1:4, 3:2, 7:1, 13:3}   # 格序→特殊詞條數（1／2／3／4 各一，含 1 件魔法、2 件帶鎖）
TICK_W,TICK_H,TICK_GAP,TICK_MAX=6,3,3,5   # v0.6：6×3、間距 3、最多 5（42 px）
TICK_CX=32        # 置中；碰到右下鎖底板時往左推，保留 ≥2 px 空隙
def _corner_plates(box,it):
    """回傳這格實際畫出的角落底板 bbox（跟 ecell 同算法）。"""
    ic,rar,up,star,lk,chase=it; x0,y0,x1,y1=box; out=[]
    if up:
        icn=darrow_icon() if up=='up2' else arrow_icon(); bw,bh=icn.size[0]+6,max(16,icn.size[1]+4); out.append(('▲',(x0+3,y0+3,x0+3+bw,y0+3+bh)))
    if star:
        nw=ImageDraw.Draw(Image.new('RGB',(1,1))).textlength(str(star),font=_F(12)); bw=12+2+nw+6; out.append(('✦',(x1-3-bw,y0+3,x1-3,y0+3+16)))
    if lk: out.append(('鎖',(x1-3-16,y1-3-16,x1-3,y1-3)))
    return out
def _gap(a,b):
    dx=max(b[0]-a[2],a[0]-b[2],0); dy=max(b[1]-a[3],a[1]-b[3],0)
    return -1 if (dx==0 and dy==0) else max(dx,dy)-1      # 兩個含端點 bbox 之間的空白像素數（0＝相貼）
def ticks(img,box,n,lock_x=None):
    x0,y0,x1,y1=box; n=min(n,TICK_MAX); w=n*TICK_W+(n-1)*TICK_GAP; sx=x0+TICK_CX-w//2; ty=y1-2-3-TICK_H   # 稀有框 2 px 內再留 3 px
    tw=TICK_W
    if n==5 and lock_x is not None:   # v1.0：5 格＋鎖時才縮成 5×3（37 px），其他照 6×3
        tw=5; w=n*tw+(n-1)*TICK_GAP; sx=x0+TICK_CX-w//2
    if lock_x is not None and sx+w-1>lock_x-3: sx=max(x0+4,lock_x-3-(w-1))
    d=ImageDraw.Draw(img,'RGBA')
    for i in range(n):
        xx=sx+i*(tw+TICK_GAP); d.rectangle((xx,ty,xx+tw-1,ty+TICK_H-1),fill=rgb(T['txs']))
    return (sx,ty,sx+w-1,ty+TICK_H-1)
def double_frame(img,box,rar,n,plates=()):
    x0,y0,x1,y1=box; fw=2 if rar=='rare' else 1; fr={'rare':T['rareframe'],'magic':T['magic'],'normal':T['border']}[rar]
    g=fw+1                                                      # 外框內留 1 px，再畫 1 px 內線（同稀有度色）
    lay=Image.new('RGBA',img.size,(0,0,0,0)); ImageDraw.Draw(lay).rectangle((x0+g,y0+g,x1-1-g,y1-1-g),outline=rgb(fr))
    la=np.asarray(lay).copy()
    for _nm,pb in plates:                                       # 內線在角落底板處斷開（底板外再留 1 px），不壓 ▲／✦／鎖
        la[max(0,int(pb[1])-1):int(pb[3])+2,max(0,int(pb[0])-1):int(pb[2])+2,3]=0
    img.paste(Image.fromarray(la,'RGBA'),(0,0),Image.fromarray(la,'RGBA')); d=ImageDraw.Draw(img,'RGBA')
    orn=[]
    if n>=3:                                                    # 四角飾：畫在格子外（格距 8 內 3 px），不進角落訊號位
        for cx,cy,sx_,sy_ in ((x0,y0,-1,-1),(x1-1,y0,1,-1),(x0,y1-1,-1,1),(x1-1,y1-1,1,1)):
            p1=(cx+sx_*3,cy+sy_*3); d.line((p1[0],p1[1],p1[0]-sx_*7,p1[1]),fill=rgb(fr),width=2); d.line((p1[0],p1[1],p1[0],p1[1]-sy_*7),fill=rgb(fr),width=2)
            ax=sorted((p1[0],p1[0]-sx_*7)); ay=sorted((p1[1],p1[1]-sy_*7))
            orn.append((ax[0],p1[1]-1,ax[1],p1[1]+1)); orn.append((p1[0]-1,ay[0],p1[0]+1,ay[1]))   # 兩條臂各自的 bbox（線寬 2）
    return (x0+g,y0+g,x1-1-g,y1-1-g),orn,fr
def e1_special(mode):
    items=pack_items(); img=loot_screen(items,sel=None); g0=LOG['g0']; recs=[]
    for i,n in E1_SPECIAL.items():
        it=items[i]; r,c=divmod(i,5); bx=19+c*72; by=g0+r*72; box=(bx,by,bx+64,by+64)
        bg={'rare':T['rarebg'],'magic':T['magicbg'],'normal':T['inset']}[it[1]]
        plates=_corner_plates(box,it)
        if mode=='a':
            lkb=[pb for nm,pb in plates if nm=='鎖']; tb=ticks(img,box,n,lkb[0][0] if lkb else None); gaps={nm:_gap(tb,pb) for nm,pb in plates}
            # 圖示（32，置中）下緣＝格內 48
            gaps['圖示']=tb[1]-(by+48)   # 圖示 32 置中，最後一列＝格內 47
            recs.append(dict(cell=i,rar=it[1],n=n,tick_box=tb,tick_contrast_vs_cellbg=round(contrast(rgb(T['txs']),rgb(bg)),2),
                             gap_to_corner_plates_px=gaps,collide=any(v<0 for v in gaps.values())))
        else:
            inner,orn,fr=double_frame(img,box,it[1],n)   # 內線不斷開（UIUX 已通過的 v0.5 畫法）
            gaps={nm:min([_gap(o,pb) for o in orn],default=99) for nm,pb in plates}
            recs.append(dict(cell=i,rar=it[1],n=n,inner_line=inner,inner_contrast_vs_cellbg=round(contrast(rgb(fr),rgb(bg)),2),
                             corner_ornaments=len(orn)//2,ornament_gap_to_plates_px=gaps,collide=any(v<0 for v in gaps.values())))
    LOG['e1_special']=recs
    corner_tag(img,'數字為假定・'+('A 底邊刻度' if mode=='a' else 'B 雙框＋四角飾'),y=42)
    return img
def e1a(): return e1_special('a')
def e1b(): return e1_special('b')


def grid_ticks(img,items,specmap):
    """背包格照 §15-1 A 底邊刻度（災魘詞仍算 1 格）；畫在面板與遮罩之前。"""
    g0=LOG['g0']; out=[]
    for i,n in specmap.items():
        it=items[i]; r,c=divmod(i,5); bx=19+c*72; by=g0+r*72; box=(bx,by,bx+64,by+64)
        if by+64>NAV: continue
        plates=_corner_plates(box,it); lkb=[pb for nm,pb in plates if nm=='鎖']
        tb=ticks(img,box,n,lkb[0][0] if lkb else None)
        out.append(dict(cell=i,n=n,tick_box=tb,gaps={nm:_gap(tb,pb) for nm,pb in plates}))
    LOG['grid_ticks']=out
def e7_specmap(): return {**E1_SPECIAL, 0:len(top4()['special'])}   # 這件：印＋追憶＋災魘詞＝3 格
# ---------- 圖示表
def icons_sheet(gray=False):
    import itertools
    Wg,Hg=760,560; img=Image.new('RGB',(Wg,Hg),rgb(PANEL)[:3]); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(16,18),'特殊詞圖示 16 px（v0.5）'+('｜灰階' if gray else ''),16,T['tx'],anchor='lm',kind='title')
    names=[('印詞','seal'),('追憶','mem'),('破裂','frac'),('腐化','corr'),('災魘','cal')]
    x=16
    for n,k in names:
        ic=spec_icon(k); big=IC4.to_rgba(SPEC_MASK[k],rgb(SPEC_COL[k])[:3],8)
        img.paste(big,(x,44),big); img.paste(ic,(x+56,180),ic)
        d=ImageDraw.Draw(img,'RGBA'); tx(d,(x,192),'1×',12,T['dim'],False,anchor='lm',kind='note')
        tx(d,(x,212),n,14,SPEC_COL[k],True,anchor='lm'); tx(d,(x,230),SPEC_COL[k],12,T['dim'],False,anchor='lm',kind='note')
        x+=146
    # v0.5：滿值記號已取消（只用粗體）；範例行
    y=260; tx(d,(16,y),'範例（v0.5：滿值只用粗體、T 純文字、破裂回一般詞）',14,T['tx'],anchor='lm')
    yy=y+28; xx=16
    for k in ['seal','mem','corr','cal']:
        ic=spec_icon(k); img.paste(ic,(xx,yy),ic); xx+=22
    s=star4_icon(); img.paste(s,(xx+4,yy+2),s); d=ImageDraw.Draw(img,'RGBA'); tx(d,(xx+18,yy+8),'4／6',14,T['txs'],True,anchor='lm')
    ic=spec_icon('frac'); img.paste(ic,(16,yy+32),ic); s=star4_icon(); img.paste(s,(38,yy+34),s)
    d=ImageDraw.Draw(img,'RGBA'); tx(d,(52,yy+40),'T1',13,T['dim'],False,anchor='lm',kind='tier13')
    mod_text(img,78,yy+40,'增加 {170%} 物理傷害',T['frac'],True,bold_all=True); range_txt(img,740,yy+40,'143','170',False)
    d=ImageDraw.Draw(img,'RGBA'); tx(d,(52,yy+70),'T1',13,T['dim'],False,anchor='lm',kind='tier13')
    mod_text(img,78,yy+70,'附加 19 至 {37} 火焰傷害',T['tx'],True); range_txt(img,740,yy+70,'28','37',False)
    # IoU 表
    y=410; d=ImageDraw.Draw(img,'RGBA'); tx(d,(16,y),'剪影 1−IoU（≥0.50 過）',14,T['tx'],anchor='lm'); y+=22
    pairs=[]
    for (n1,k1),(n2,k2) in itertools.combinations(names,2):
        v=1-IC4.iou(SPEC_MASK[k1],SPEC_MASK[k2]); pairs.append((n1,n2,round(v,3)))
    for i,(a,b,v) in enumerate(pairs):
        cx=16+(i%4)*186; cy=y+(i//4)*22
        tx(d,(cx,cy),'%s／%s  %.2f'%(a,b,v),13,T['tx'] if v>=0.5 else T['bad'],False,anchor='lm',kind='cap13')
    LOG['icon_pairs']=pairs
    if gray: img=img.convert('L').convert('RGB')
    return img

def gray_meanL(im):
    a=np.asarray(im); m=a[...,3]>0; g=np.asarray(im.convert('RGB').convert('L')).astype(float)[m]/255
    Y=np.where(g<=0.04045,g/12.92,((g+0.055)/1.055)**2.4); return float(np.mean(np.where(Y>0.008856,116*np.cbrt(Y)-16,903.3*Y)))
def icons_sheet_v10(gray=False):
    import itertools
    Wg,Hg=760,600; img=Image.new('RGB',(Wg,Hg),rgb(PANEL)[:3]); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(16,18),'特殊詞圖示 16 px（v1.0 定稿）'+('｜灰階' if gray else ''),16,T['tx'],anchor='lm',kind='title')
    names=[('印詞','seal'),('追憶','mem'),('破裂','frac'),('腐化','corr'),('災魘徽章','calcorr')]
    x=16
    for n,k in names:
        ic=spec_icon(k)
        big=(IC4.to_rgba2(IC4.CALCORR,rgb(T['cal'])[:3],rgb(CAL_HI)[:3],8) if k=='calcorr' else IC4.to_rgba(SPEC_MASK[k],rgb(SPEC_COL[k])[:3],8))
        img.paste(big,(x,44),big); img.paste(ic,(x+56,180),ic)
        d=ImageDraw.Draw(img,'RGBA'); tx(d,(x,192),'1×',12,T['dim'],False,anchor='lm',kind='note')
        tx(d,(x,212),n,14,SPEC_COL[k],True,anchor='lm')
        tx(d,(x,230),SPEC_COL[k]+(' ＋內 '+CAL_HI if k=='calcorr' else ''),12,T['dim'],False,anchor='lm',kind='note')
        x+=146
    # 退役
    sk=IC4.to_rgba(IC4.CAL,rgb(T['dim'])[:3]); img.paste(sk,(16,258),sk); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(40,266),'舊獨立災魘詞骷髏：已作廢（v1.0 §15-2，災魘詞＝腐化詞升級）',13,T['dim'],False,anchor='lm',kind='note13')
    # 並排比較＋區塊示範
    y=300; tx(d,(16,y),'腐化徽章 vs 災魘徽章（並排）',14,T['tx'],anchor='lm')
    a=IC4.to_rgba(IC4.CORR,rgb(T['corr'])[:3],4); b=IC4.to_rgba2(IC4.CALCORR,rgb(T['cal'])[:3],rgb(CAL_HI)[:3],4)
    img.paste(a,(16,y+16),a); img.paste(b,(96,y+16),b)
    for k,xx in (('seal',300),('mem',322),('calcorr',344)):
        ic=spec_icon(k); img.paste(ic,(xx,y+18),ic)
    s_=star4_icon(); img.paste(s_,(370,y+20),s_); d=ImageDraw.Draw(img,'RGBA'); tx(d,(384,y+26),'4／6',14,T['txs'],True,anchor='lm')
    yy=y+52; ic=spec_icon('calcorr'); img.paste(ic,(300,yy),ic)
    mod_text(img,322,yy+8,'{+30%} 暴擊傷害加成',T['cal'],False); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(322,yy+30),'▼ 減少 10% 最大生命',14,T['bad'],False,anchor='lm')
    mod_text(img,338,yy+52,'暴擊時回復 2% 最大生命',T['cal'],False); d=ImageDraw.Draw(img,'RGBA')
    tx(d,(338,yy+74),'▼ -23% 火焰抗性',14,T['bad'],False,anchor='lm')
    # 數字
    cc=spec_icon('calcorr'); co=spec_icon('corr'); dL=gray_meanL(cc)-gray_meanL(co)
    y=470; d=ImageDraw.Draw(img,'RGBA')
    tx(d,(16,y),'灰階平均 L*：腐化徽章 %.1f／災魘徽章 %.1f，ΔL* %.1f（≥15）'%(gray_meanL(co),gray_meanL(cc),dL),14,T['tx'] if dL>=15 else T['bad'],anchor='lm'); y+=24
    tx(d,(16,y),'剪影 1−IoU（≥0.50 過）',14,T['tx'],anchor='lm'); y+=22
    pairs=[]
    for (n1,k1),(n2,k2) in itertools.combinations(names,2):
        v=1-IC4.iou(SPEC_MASK[k1],SPEC_MASK[k2]); pairs.append((n1,n2,round(v,3)))
    for i,(a_,b_,v) in enumerate(pairs):
        cx=16+(i%4)*186; cy=y+(i//4)*22
        tx(d,(cx,cy),'%s／%s  %.2f'%(a_,b_,v),13,T['tx'] if v>=0.5 else T['bad'],False,anchor='lm',kind='cap13')
    LOG['icon_pairs']=pairs; LOG['calcorr_dL']=dict(corr_meanL=round(gray_meanL(co),1),calcorr_meanL=round(gray_meanL(cc),1),dL=round(dL,1),
        contrast_edge_vs_panel=round(contrast(rgb(T['cal']),rgb('#25211e')),2),contrast_inner_vs_panel=round(contrast(rgb(CAL_HI),rgb('#25211e')),2))
    if gray: img=img.convert('L').convert('RGB')
    return img

if __name__=='__main__':
    import os
    os.makedirs('/workspace/d2final/out/equip',exist_ok=True)
    def measure(k, fn, py0=None, extreme=False):
        LOG.clear(); LOG.update(text=[],touch=[],amber=[])
        img=fn(); img=img.convert('RGB'); pth=f'/workspace/d2final/out/equip/{k}_390x844.png'; img.save(pth)
        a=np.asarray(img); L=Lstar(a.astype(float)); body=[t for t in LOG['text'] if t[1]=='body']
        if py0 is None:
            py0=TOP if k in ('E1','E2','E4') else TOPF
        min_body=min((t[0] for t in body), default=14)
        min_touch=min((min(w,h) for _,w,h in LOG['touch']), default=44)
        gate=2.5 if extreme else 2.0
        rec=dict(path=pth,amber_buttons_drawn=list(LOG['amber']),amber_fill_blobs=amber_blobs(a),
                    min_body_px=min_body,
                    small_text=sorted({(t[0],t[1]) for t in LOG['text'] if t[0]<14}),
                    min_touch=min_touch,
                    touch=[(n,round(w),round(h)) for n,w,h in LOG['touch']],
                    Lgt80_pct=round(float((L>80).mean()*100),2),
                    Lgt80_panel_pct=round(float((L[py0:NAV]>80).mean()*100),2),
                    Lgt80_gate=gate,
                    min_contrast=sorted(LOG.get('cr',[]))[:5],
                    extra={x:LOG[x] for x in ('detail','g0','toast','glyphs','rare_visible','cells_visible','frame_w') if x in LOG})
        rec['pass']=rec['Lgt80_panel_pct']<=gate and rec['Lgt80_pct']<=gate and rec['min_body_px']>=14 and rec['min_touch']>=44 and rec['amber_fill_blobs']<=1 and (not rec['min_contrast'] or rec['min_contrast'][0][0]>=4.5)
        return rec

    res={}
    jobs=[('E1',e1,False),('E2',e2,False),('E3',e3,False),('E4',e4,True),('E5',e5,False),('E6',e6,False),('E6b',e6b,True)]
    for k,fn,extreme in jobs:
        res[k]=measure(k,fn,extreme=extreme)
        print(k, json.dumps({x:y for x,y in res[k].items() if x!='touch'},ensure_ascii=False))
    LOG.clear(); LOG.update(text=[],touch=[],amber=[])
    g=glyphs_gray(); gp='/workspace/d2final/out/equip/glyphs_gray.png'; g.convert('RGB').save(gp)
    res['glyphs_gray']=dict(path=gp, **LOG.get('glyphs',{}))
    print('glyphs', json.dumps(res['glyphs_gray'],ensure_ascii=False))
    # ---------- v0.4
    def ui_contrasts():
        P=rgb('#25211e'); H=rgb('#2d251f')
        r={'分隔線 --border／--panel':contrast(rgb(T['border']),P),'捲軸 --border-hi／--panel':contrast(rgb(T['borderhi']),P),
           '滿值記號 --tx-strong／--panel':contrast(rgb(T['txs']),P),'✦ --tx-strong／--panel':contrast(rgb(T['txs']),P)}
        for k,c in SPEC_COL.items():
            r['圖示 %s／--panel'%k]=contrast(rgb(c),P); r['圖示 %s／--hdr（勳章列）'%k]=contrast(rgb(c),H)
        r['破裂佔位圖示 --tx-dim／--panel']=contrast(rgb(T['dim']),P)
        return {k:round(v,2) for k,v in r.items()}
    def measure4(k,fn,extreme=False):
        LOG.clear(); LOG.update(text=[],touch=[],amber=[])
        img=fn().convert('RGB'); pth=f'/workspace/d2final/out/equip/{k}_390x844.png'; img.save(pth)
        gp=pth.replace('.png','_gray.png'); img.convert('L').convert('RGB').save(gp)
        a=np.asarray(img).astype(float); L=Lstar(a); det=LOG.get('detail',{}); py0=det.get('panel_top',TOPF)
        body=[t for t in LOG['text'] if t[1]=='body']; gate=2.5 if extreme else 2.0
        cr=sorted(LOG.get('cr',[]))
        rec=dict(path=pth,gray=gp,amber_buttons_drawn=list(LOG['amber']),amber_fill_blobs=amber_blobs(a.astype(np.uint8)),
                 min_body_px=min((t[0] for t in body),default=14),small_text=sorted({(t[0],t[1]) for t in LOG['text'] if t[0]<14}),
                 min_touch=min((min(w,h) for _,w,h in LOG['touch']),default=44),touch=[(n,round(w),round(h)) for n,w,h in LOG['touch']],
                 Lgt80_pct=round(float((L>80).mean()*100),2),Lgt80_panel_pct=round(float((L[py0:NAV]>80).mean()*100),2),Lgt80_gate=gate,
                 min_contrast=cr[:6],n_text_measured=len(cr),ui_contrast=ui_contrasts(),
                 extra={x:LOG[x] for x in ('detail','verdict','toast','glow','badges','maxr_bold','quality_bold','scrollbar','e1_special','grid_ticks') if x in LOG})
        rec['pass']=(rec['Lgt80_pct']<=gate and rec['min_body_px']>=14 and rec['min_touch']>=44 and rec['amber_fill_blobs']<=1
                     and len(rec['amber_buttons_drawn'])<=1 and (not cr or cr[0][0]>=4.5) and min(rec['ui_contrast'].values())>=3)
        return rec
    for k,fn,ex in [('E2p',e2p,False),('E3p',e3p,False),('E3p_scroll',e3p_scroll,False),('E7',e7,True),('E7_scroll',e7_scroll,True),('E7b',e7b,True),('E7b_scroll',e7b_scroll,True),('E1a',e1a,False)]:   # E1b 已作廢（§15-1），不再出
        res[k]=measure4(k,fn,ex); print(k,json.dumps({x:y for x,y in res[k].items() if x not in ('touch','ui_contrast')},ensure_ascii=False))
    LOG.clear(); LOG.update(text=[],touch=[],amber=[])
    icons_sheet_v10().save('/workspace/d2final/out/equip/icons_v10.png'); icons_sheet_v10(True).save('/workspace/d2final/out/equip/icons_v10_gray.png')
    res['icons_v10']=dict(path='/workspace/d2final/out/equip/icons_v10.png',gray='/workspace/d2final/out/equip/icons_v10_gray.png',pairs_1_minus_IoU=LOG['icon_pairs'],calamity_badge=LOG['calcorr_dL'])
    import tokens_v04 as TK
    res['tokens_v04']=TK.report(T['corr'],T['cal'])
    json.dump(res,open('/workspace/d2final/equip/measure.json','w'),ensure_ascii=False,indent=1)
