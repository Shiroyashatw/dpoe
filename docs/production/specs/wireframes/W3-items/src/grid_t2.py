# 定稿 T2（mumi 13:10）：斜紋 #524165；描邊 --scene-void；圖示列只印／追憶／破裂（破裂 > 追憶 > 印）。示意。
import json, warnings; warnings.filterwarnings('ignore')
exec(open('/workspace/d2final/equip/grid_tint.py').read().replace('print(json.dumps','_=(json.dumps').replace("for v in VARS: print","for v in []: print"))
GOUT='/workspace/d2final/out/equip/grid-t2/'; os.makedirs(GOUT,exist_ok=True)
HATCH=rgb('#524165')[:3]; OUTL=rgb('#16130f')[:3]
KCOL=to8(fromLCh(31,26,HC)); KMODE=['K3']
def field(rar,state,var):
    p=np.array(rgb(PLAIN[rar])[:3],float); F=np.tile(p,(65,65,1))
    if state is None: return F
    F=np.tile(np.array(TINT8[state],float),(65,65,1)); fw=2 if rar=='rare' else 1
    yy,xx=np.mgrid[0:65,0:65]; lo,hi=fw+1,64-fw-1          # 框內留 1 px：花紋只畫在 [lo,hi]
    inner=(xx>=lo)&(xx<=hi)&(yy>=lo)&(yy<=hi)
    if state=='cal': F[((xx+yy)%6==0)&inner]=HATCH
    if state=='corr' and KMODE[0]=='K1':
        dots=(yy%4==0)&(((yy//4)%2==0)&(xx%4==0) | ((yy//4)%2==1)&(xx%4==2)); F[dots&inner]=KCOL
    if state=='corr' and KMODE[0]=='K2':
        a,b=fw+3,64-fw-3                                   # 框內 3 px 處 1 px 虛線，3 亮 2 暗
        ring=((xx==a)|(xx==b))&(yy>=a)&(yy<=b) | ((yy==a)|(yy==b))&(xx>=a)&(xx<=b)
        t=np.where((yy==a)|(yy==b),xx-a,yy-a); F[ring&((t%5)<3)]=KCOL
    return F
SPEC={1:(['seal','frac'],'corr'),3:(['seal','mem'],None),4:(['seal','mem','frac'],None),7:(['frac'],None),10:([],'corr'),
      13:(['frac','seal'],'cal'),16:(['seal','seal','seal'],None),17:([],'corr'),18:([],'cal')}
def full():
    items=pack_items(); items[1]=items[1][:4]+('M',)+items[1][5:]
    REC.clear(); img=loot_screen(items,sel=None); g0=LOG['g0']; recs=[]
    for i,(mods,st) in SPEC.items():
        it=items[i]; r,c=divmod(i,5); bx=19+c*72; by=g0+r*72; box=(bx,by,bx+64,by+64)
        if st: place(img,box,it[1],it,st,'T2h')
        recs.append(mark2(img,box,it,mods,st,'T2h',cell=i))
    corner_tag(img,'示意・C 圖示列＋T2 底色（定稿）',y=42); return img.convert('RGB'),recs,list(REC)
LOG.clear(); LOG.update(text=[],touch=[],amber=[])
img,recs,ic=full(); p=GOUT+'G_T2_390x844.png'; img.save(p); img.convert('L').convert('RGB').save(GOUT+'G_T2_390x844_gray.png')
for k in ('protan','deutan'): sim_img(img,k).save(GOUT+f'G_T2_390x844_{k}.png')
a=np.asarray(img).astype(float); L=Lstar(a)
res=dict(Lgt80_pct=round(float((L>80).mean()*100),2),Lgt80_panel_pct=round(float((L[TOPF:NAV]>80).mean()*100),2),
         overlaps_full=[(r['cell'],r['types'],r['gap_px'],r['overlap_px']) for r in recs],icons_full=ic)
# 特寫
COLS=[(f'{RN[r]}｜{SN[s]}',CI[r],[],s) for r in ('rare','magic','normal') for s in (None,'corr','cal')]
COLS+= [('最壞例｜3 種＋鎖',('gear_helm_0','rare','up2',3,'M',False),['seal','mem','frac'],None),
        ('最壞例｜腐化＋2 種＋鎖',('gear_helm_0','rare','up2',3,'M',False),['seal','frac'],'corr')]
cw=76; sm=Image.new('RGB',(len(COLS)*cw,cw),rgb('#1d1a17')[:3]); cu=[]
for ci,(cn,it,mods,st) in enumerate(COLS):
    bx,by=ci*cw+6,6; box=(bx,by,bx+64,by+64)
    ecell(sm,box,it[1],it[0],up=it[2],star=it[3],lk=it[4],isz=32,register_touch=False)
    if st: place(sm,box,it[1],it,st,'T2h')
    r=mark2(sm,box,it,mods,st,'T2h'); cu.append((cn,r['types'],r['gap_px'],r['overlap_px']))
res['closeup']=cu
S=4; rows=[('彩色',sm),('灰階',sm.convert('L').convert('RGB')),('紅色盲 protan',sim_img(sm,'protan')),('綠色盲 deutan',sim_img(sm,'deutan'))]
LW,TH,RH=260,90,cw*S+20; out=Image.new('RGB',(sm.width*S+LW+16,TH+RH*len(rows)),rgb('#1d1a17')[:3]); d=ImageDraw.Draw(out,'RGBA')
tx(d,(16,26),'C 圖示列＋T2 底色 4× 特寫（示意；斜紋 #524165）',28,T['tx'],anchor='lm',kind='title')
for ci,(cn,*_r) in enumerate(COLS): tx(d,(LW+ci*cw*S+38*S,TH-16),cn,19,T['dim'],False,anchor='mm',kind='note')
for ri,(rn,im) in enumerate(rows):
    out.paste(im.resize((im.width*S,im.height*S),Image.NEAREST),(LW,TH+ri*RH)); d=ImageDraw.Draw(out,'RGBA')
    tx(d,(16,TH+ri*RH+38*S),rn,22,T['tx'],anchor='lm',kind='title')
out.save(GOUT+'G_T2_closeup_4x.png'); sm.save(GOUT+'G_T2_closeup_1x.png')
# 量測
cal=TINT8['cal']; cor=TINT8['corr']
res['stripe_vs_caltint']=cr8(HATCH,cal)
res['frame_vs_tint']={r:{st:cr8(rgb(c)[:3],TINT8[st]) for st in TINT8} for r,c in FRC.items()}
res['frame_vs_stripe']={r:cr8(rgb(c)[:3],HATCH) for r,c in FRC.items()}
res['gray_dL_stripe']=round(float(lab(np.array(HATCH)/255)[0]-lab(np.array(cal)/255)[0]),1)
res['corr_vs_cal_dE']={'normal':de(np.array(cor)/255,np.array(cal)/255),**{k:de(sim_c(np.array(cor)/255,k),sim_c(np.array(cal)/255,k)) for k in CVD}}
res['icon_vs_stripe']={NAME[k]:cr8(rgb(SPEC_COL[k])[:3],HATCH) for k in ('seal','mem','frac')}
res['plate_on_stripe']=dict(plate_vs_stripe=cr8(plate_on(HATCH),HATCH),star=cr8(rgb(T['txs'])[:3],plate_on(HATCH)),up=cr8(rgb(T['good'])[:3],plate_on(HATCH)),lock=cr8(rgb(T['tx'])[:3],plate_on(HATCH)))
# 道具圖對比（災魘：逐像素對實際底色場）
FF=field('rare','cal','T2h')[16:48,16:48]
vals=[]
for ic_ in sorted({it[0] for it in pack_items()}):
    a_=np.asarray(icon(ic_,32).convert('RGBA')); m=a_[...,3]>128
    for r in PLAIN:
        yb=_lum(rgb(PLAIN[r])); Yp=np.array([_lum(p) for p in a_[...,:3][m]]); Yf=np.array([_lum(p) for p in FF[m]])
        cb=np.mean((np.maximum(Yp,yb)+.05)/(np.minimum(Yp,yb)+.05)); ct=np.mean((np.maximum(Yp,Yf)+.05)/(np.minimum(Yp,Yf)+.05))
        vals.append((ic_,r,cb,ct))
cbm=np.mean([v[2] for v in vals]); ctm=np.mean([v[3] for v in vals]); w=min(vals,key=lambda v:v[3]/v[2])
res['art_contrast_cal_T2']=dict(mean_plain=round(float(cbm),2),mean_cal=round(float(ctm),2),pct=round(float((ctm/cbm-1)*100),1),worst=(w[0],w[1],round(float((w[3]/w[2]-1)*100),1)))
res['art_contrast_corr']=M['art_contrast']['corr'] if 'M' in globals() else None
json.dump(res,open(GOUT+'measure.json','w'),ensure_ascii=False,indent=1,default=str)
print(json.dumps({k:v for k,v in res.items() if k!='icons_full'},ensure_ascii=False,default=str))
# ---------- 框旁像素（框內緊貼的一圈）對框
def frame_adj(rar,state):
    it={'rare':CI['rare'],'magic':CI['magic'],'normal':CI['normal']}[rar]
    px,_=cell_px(rar,it,field(rar,state,'T2h')); fw=2 if rar=='rare' else 1; fc=rgb(FRC[rar])[:3]
    ring=np.zeros((65,65),bool); ring[fw,fw:65-fw]=ring[64-fw,fw:65-fw]=ring[fw:65-fw,fw]=ring[fw:65-fw,64-fw]=True
    return round(min(contrast(fc,tuple(p)) for p in {tuple(v) for v in px[ring]}),2)
res['frame_vs_adjacent_inset']={r:{st:frame_adj(r,st) for st in ('corr','cal')} for r in PLAIN}
json.dump(res,open(GOUT+'measure.json','w'),ensure_ascii=False,indent=1,default=str)
print('ADJ',res['frame_vs_adjacent_inset'])
# ---------- K1／K2／K3
KR={}
GK='/workspace/d2final/out/equip/grid-t2/k/'; os.makedirs(GK,exist_ok=True)
KN={'K1':'K1 點陣','K2':'K2 內緣虛線','K3':'K3 只有底色'}
strips=[]
for km in ('K1','K2','K3'):
    KMODE[0]=km
    sm=Image.new('RGB',(len(COLS)*cw,cw),rgb('#1d1a17')[:3])
    for ci,(cn,it,mods,st) in enumerate(COLS[:9]+COLS[10:]):
        bx,by=ci*cw+6,6; box=(bx,by,bx+64,by+64)
        ecell(sm,box,it[1],it[0],up=it[2],star=it[3],lk=it[4],isz=32,register_touch=False)
        if st: place(sm,box,it[1],it,st,'T2h')
        mark2(sm,box,it,mods,st,'T2h')
    sm=sm.crop((0,0,10*cw,cw)); strips.append((km,sm)); sm.save(GK+f'{km}_strip_1x.png')
    # 全頁 L*
    LOG.clear(); LOG.update(text=[],touch=[],amber=[]); im,_r,_i=full(); im.save(GK+f'G_{km}_390x844.png'); L=Lstar(np.asarray(im).astype(float))
    r=dict(Lgt80=round(float((L>80).mean()*100),2),Lgt80_panel=round(float((L[TOPF:NAV]>80).mean()*100),2))
    FF=field('rare','corr','T2h'); pat=np.any(FF!=np.array(TINT8['corr']),axis=-1); r['pattern_px_pct']=round(float(pat.mean()*100),1)
    if km!='K3':
        r['pattern_vs_bg']=cr8(KCOL,TINT8['corr']); r['gray_dL']=round(float(lab(np.array(KCOL)/255)[0]-lab(np.array(TINT8['corr'])/255)[0]),1)
        for k in ('protan','deutan'):
            a_,b_=sim_c(np.array(KCOL)/255,k),sim_c(np.array(TINT8['corr'])/255,k); r[k+'_pattern_cr']=round(contrast(tuple(a_*255),tuple(b_*255)),2)
    r['frame_adj']={rr:frame_adj(rr,'corr') for rr in PLAIN}
    # 道具圖對比（逐像素對底色場）
    vals=[]
    for ic_ in sorted({it[0] for it in pack_items()}):
        a_=np.asarray(icon(ic_,32).convert('RGBA')); m=a_[...,3]>128; Yp=np.array([_lum(p) for p in a_[...,:3][m]])
        for rr in PLAIN:
            Fr=field(rr,'corr','T2h')[16:48,16:48]; Yf=np.array([_lum(p) for p in Fr[m]]); yb=_lum(rgb(PLAIN[rr]))
            vals.append((np.mean((np.maximum(Yp,yb)+.05)/(np.minimum(Yp,yb)+.05)),np.mean((np.maximum(Yp,Yf)+.05)/(np.minimum(Yp,Yf)+.05))))
    r['art_pct']=round(float((np.mean([v[1] for v in vals])/np.mean([v[0] for v in vals])-1)*100),1)
    KR[km]=r
KR['KCOL']='#%02x%02x%02x'%KCOL
KR['vs_plain_rare_dE']={'normal':de(np.array(TINT8['corr'])/255,f01(T['rarebg'])),**{k:de(sim_c(np.array(TINT8['corr'])/255,k),sim_c(f01(T['rarebg']),k)) for k in ('protan','deutan')}}
KR['cal_stripe']=dict(cr=cr8(HATCH,TINT8['cal']),gray_dL=res['gray_dL_stripe'])
json.dump(KR,open(GK+'measure_k.json','w'),ensure_ascii=False,indent=1,default=str); print('K',json.dumps(KR,ensure_ascii=False))
# 4× 表
S=4; LW,TH=300,90; RH=cw*S+12; KC=[c[0] for c in COLS[:9]+COLS[10:]]
out=Image.new('RGB',(10*cw*S+LW+16,TH+(RH*4+40)*3),rgb('#1d1a17')[:3]); d=ImageDraw.Draw(out,'RGBA')
tx(d,(16,26),'腐化補紋理 K1／K2／K3 4× 特寫（示意；斜紋框內留 1 px）',28,T['tx'],anchor='lm',kind='title')
for ci,cn in enumerate(KC): tx(d,(LW+ci*cw*S+38*S,TH-16),cn,19,T['dim'],False,anchor='mm',kind='note')
y=TH
for km,sm in strips:
    d=ImageDraw.Draw(out,'RGBA'); tx(d,(16,y+18),KN[km],26,T['txs'],anchor='lm',kind='title'); y+=40
    for rn,im in (('彩色',sm),('灰階',sm.convert('L').convert('RGB')),('紅色盲',sim_img(sm,'protan')),('綠色盲',sim_img(sm,'deutan'))):
        out.paste(im.resize((im.width*S,im.height*S),Image.NEAREST),(LW,y)); d=ImageDraw.Draw(out,'RGBA'); tx(d,(16,y+38*S),rn,22,T['tx'],anchor='lm',kind='title'); y+=RH
out.save(GK+'G_K_closeup_4x.png'); print(out.size)
KMODE[0]='K3'
