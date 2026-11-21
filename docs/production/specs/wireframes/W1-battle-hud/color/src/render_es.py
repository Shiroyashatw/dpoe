# battle-hud v1.3.6 能量護盾層 上色示意圖（mumi 11/21 12:37 OK）。底＝render_xpblk.py（v1.3.5：render_color.py＋經驗條／格擋弧），
# 新元件座標只讀 ../../src/eslayer.py；--es／--es-hi 從 M2-36-palette-tokens.md 讀（美術總監）。畫法同 /workspace/mockups/W-hud-es-mock-1213（12:31 淡金定案版）。
# 用法：python3 render_es.py [輸出資料夾]；預設輸出到 color/：battle-hud-v136-es-<名>.png 與 -clean.png。
# 需要 color/assets/repo/js/art.js（照 color/README.md 複製，不 commit）。
import os,sys,copy,re
from PIL import Image,ImageDraw
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
args=[a for a in sys.argv[1:] if not a.startswith('--')]; OUT=args[0] if args else ROOT
sys.argv=[sys.argv[0]]
sys.path.insert(0,HERE); import render_xpblk as XB
R=XB.R; G=XB.G; X=XB.X; C=R.c
sys.path.insert(0,os.path.join(os.path.dirname(ROOT),'src')); import eslayer as ES
_M236=open(os.path.normpath(os.path.join(ROOT,'..','..','..','M2-36-palette-tokens.md')),encoding='utf-8').read()
for k in ('es','es-hi'):
    R.T[k]=re.search(r'^\| --'+re.escape(k)+r' \| `(#[0-9a-f]{6})`',_M236,re.M).group(1)
XB.STAMP='battle-hud v1.3.6（mumi 11/21 12:37）・上色'
ST={'full':(820,600,'能量護盾滿 600 / 600'),'partial':(820,240,'能量護盾被打掉一部分 240 / 600'),
    'recharge':(820,ES.EX_RECHARGE,f'充能中 {ES.EX_RECHARGE} / 600（前緣常亮）'),'zero':(820,0,'能量護盾 0、4 秒延遲中（只剩空槽、沒有前緣）'),
    'none':(820,None,'沒有能量護盾上限（細條不畫，字同 v1.3.5）'),
    'lowcomb':(500,30,'危急紅邊 1 級・合計分支：530 / 1,568＝33.8% < 35%（生命 51.7%）'),
    'lowlife':(300,600,'危急紅邊 1 級・生命分支：生命 300 / 968＝31.0% < 35%（能量護盾滿；流血）')}
LOW=('lowcomb','lowlife')
def hpbox(size): return (10,508,354,526) if size=='390x844' else (340,652,790,672)
def base(size,st):
    state='lowhp' if st in LOW else 'normal'
    E=copy.deepcopy(G.elements(size,state)); E=[e for e in E if e['kind']!='tip']
    img=Image.new('RGBA',G.SIZES[size],C('scene-void')); R.TEXTLOG.clear(); R.FOOT.clear()
    R.scene(img,E,size,state); R.hud(img,E,size,state)
    if size=='390x844': R.safe_areas(img,E)
    return img,E
def es_items(size,st):
    life,es,_=ST[st]
    if es is None: return []
    N=ES.items(size,False)
    if st!='recharge': N=[e for e in N if e['kind']!='eshead']
    return N
def draw_es(img,size,st):
    d=ImageDraw.Draw(img,'RGBA'); life,es,_=ST[st]; hp=hpbox(size); fs=14 if size=='390x844' else 16
    R.rect(d,*hp,fill=C('panel-inset'),outline=C('border'))
    w=hp[2]-hp[0]-2; d.rectangle((hp[0]+1,hp[1]+1,hp[0]+1+int(w*life/ES.LIFEMAX)-1,hp[3]-2),fill=C('hp'))
    if es is not None:
        s=ES.strip_box(size); d.rectangle((s[0],s[1],s[2]-1,s[3]-1),fill=C('panel-inset'))
        fw=round((s[2]-s[0])*es/ES.ESMAX)
        if fw>0: d.rectangle((s[0],s[1],s[0]+fw-1,s[3]-1),fill=C('es'))
        if st=='recharge':
            h=ES.head_box(size,es=es); d.rectangle((h[0],h[1],h[2]-1,h[3]-1),fill=C('es-hi'))
    cy=(hp[1]+hp[3])/2-(2 if es is not None else 0)
    R.text(d,((hp[0]+hp[2])/2,cy),ES.hp_text(life,es),fs,'tx-strong',700,anchor='mm',shadow=True)
JOBS=[(f'es-{s.split("x")[0]}-{st}',s,st) for s in ('390x844','1280x720') for st in ST]
def render(name,size,st):
    img,E=base(size,st)
    XN=[e for e in X.items(size,False) if e['kind']!='tip']
    draw_es(img,size,st); XB.draw_new(img,XN,'full')
    life,es,_=ST[st]
    for e in E:
        if e['id'] in('P37','D59'): e['name']=f'生命條「{ES.hp_text(life,es)}」（v1.3.6 字串）'
    N=XN+es_items(size,st)
    return img,E,N
def main():
    os.makedirs(OUT,exist_ok=True)
    for name,size,st in JOBS:
        img,E,N=render(name,size,st)
        pre=os.path.join(OUT,'battle-hud-v136-'+name)
        img.convert('RGB').save(pre+'-clean.png',optimize=True)
        XB.annotated(img,E,N,f'{size} 能量護盾層｜{ST[st][2]}').save(pre+'.png',optimize=True); print(pre)
if __name__=='__main__': main()
