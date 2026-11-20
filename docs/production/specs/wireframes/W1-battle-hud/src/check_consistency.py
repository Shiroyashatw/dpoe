# 比對：產生器元件清單 ⇄ battle-hud*.md 表；規則檢查（字級、熱區、掉落牌下限、出界、禁用字、檔案大小、圖檔尺寸）。
import os,re,sys
HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
import gen_battle_hud as G
ROOT=G.MD_DIR  # md 所在（repo：specs/battle-hud）
from PIL import Image
fail=[]; warn=[]

MD_FILES=sorted(n for n in os.listdir(ROOT) if n.startswith('battle-hud') and n.endswith('.md'))

def parse_md():
    tabs={}
    for name in MD_FILES:
        p=os.path.join(ROOT,name); t=open(p,encoding='utf-8').read()
        n=len(t.encode()); (fail if n>25600 else []).append(f'{name} {n} B > 25600')
        for m in re.finditer(r'<!-- T (\S+) (\S+) -->\n(.*?)(?:\n\n|\Z)',t,re.S):
            rows=[]
            for ln in m.group(3).splitlines()[2:]:
                if not ln.strip().startswith('|'): continue
                c=[x.strip() for x in ln.strip().strip('|').split('|')]
                if c and c[0] and c[0]!='id' and not c[0].startswith('---'):
                    rows.append(c)
            tabs[(m.group(1),m.group(2))]=rows
    return tabs
tabs=parse_md()
total=0

def compare(size,layer,cat):
    global total
    want=layer[len('collapsed-'):] if layer.startswith('collapsed-') else layer
    exp=[[e['id'],e['name'],str(e['x0']),str(e['y0']),str(e['x1']-e['x0']),str(e['y1']-e['y0']),e['font'],e['token'],G.states_text(s,st),e['hit'],e['flag'] or '定']
         for e,s,st in cat if (e['layer']=='world')==(want=='world')]
    got=tabs.get((size,layer))
    if got is None: fail.append(f'md 缺表 {size} {layer}'); return
    ei={r[0]:r for r in exp}; gi={r[0]:r for r in got}
    for k in ei.keys()-gi.keys(): fail.append(f'{size} {layer} {k} 在產生器、不在 md')
    for k in gi.keys()-ei.keys(): fail.append(f'{size} {layer} {k} 在 md、不在產生器')
    for k in ei.keys()&gi.keys():
        if ei[k]!=gi[k]: fail.append(f'{size} {layer} {k} 不同：gen={ei[k]} md={gi[k]}')
    if [r[0] for r in exp]!=[r[0] for r in got]: fail.append(f'{size} {layer} 列順序不同')
    total+=len(exp)

for size in G.SIZES:
    compare(size,'hud',G.catalog(size))
    compare(size,'world',G.catalog(size))
    compare(size,'collapsed-hud',G.catalog_collapsed(size))
    compare(size,'collapsed-world',G.catalog_collapsed(size))

BAN=['彈夾','祭壇','祀壇','祝壇','祥壇','Altar']
def box(h,e):
    if h in('=框',): return (e['x0'],e['y0'],e['x1'],e['y1'])
    m=re.match(r'(\d+)–(\d+)×(\d+)–(\d+)',h)
    return tuple(int(v) for v in (m.group(1),m.group(3),m.group(2),m.group(4))) if m else None

ALLOW_IDS=set()  # 比較欄熱區上緣已改 592，不再與 ▼ 重疊

def hud_kind(e):
    return e['kind'].split(':')[0] in('icon','cell','panel','bar','aurarow')

for size,(W,H) in G.SIZES.items():
    mn_font=14 if size=='390x844' else 16; mn_hit=44 if size=='390x844' else 36
    jobs=(
        ('expanded',G.STATES,G.elements, 428 if size=='390x844' else 560, 'P10' if size=='390x844' else 'D15'),
        ('collapsed',['collapsed'],lambda sz,st: G.elements_collapsed(sz), 568 if size=='390x844' else 560, 'T10' if size=='390x844' else 'C15'),
    )
    for kind,sts,el_fn,clamp,zid in jobs:
        for st in sts:
            E=el_fn(size,st)
            hits={}
            for e in E:
                if not(0<=e['x0']<=e['x1']<=W and 0<=e['y0']<=e['y1']<=H): fail.append(f'{size} {st} {e["id"]} 出界')
                for f in re.findall(r'(\d+)/\d{3}',e['font']):
                    if int(f)<mn_font: warn.append(f'{size} {e["id"]} 字 {f} < {mn_font}')
                if '鍵帽 12' in e['font'] and st in('normal','collapsed'): warn.append(f'{size} {st} {e["id"]} 鍵帽 12（徽章例外）')
                if e['hit'] not in('—',):
                    b=box(e['hit'],e)
                    if b is None: fail.append(f'{size} {e["id"]} 熱區無法解析 {e["hit"]}')
                    else:
                        if (b[2]-b[0])<mn_hit or (b[3]-b[1])<mn_hit: fail.append(f'{size} {st} {e["id"]} 熱區 {b[2]-b[0]}×{b[3]-b[1]} < {mn_hit}')
                        hits.setdefault(b,[]).append(e['id'])
                        if not(b[0]<=e['x0'] and b[1]<=e['y0'] and e['x1']<=b[2] and e['y1']<=b[3]):
                            # P50 外觀 y 584、熱區上緣 592：上 8 px 讓路給 ▼，外觀不變（mumi 16:06 定稿候選）
                            if e['id']=='P50' and e['x0']>=b[0] and e['x1']<=b[2] and e['y1']<=b[3] and b[1]-e['y0']==8:
                                pass
                            else:
                                fail.append(f'{size} {st} {e["id"]} 外觀超出熱區')
                if e['layer']=='world' and '掉落牌' in e['name'] and e['y1']>clamp: fail.append(f'{size} {st} {e["id"]} 掉落牌 y1 {e["y1"]} > {clamp}')
                for w in BAN:
                    if w in e['name']+e['token']+e['st']: fail.append(f'{size} {e["id"]} 禁用字 {w}')
            L=list(hits.items())
            for i in range(len(L)):
                for j in range(i+1,len(L)):
                    a,b=L[i][0],L[j][0]
                    if min(a[2],b[2])-max(a[0],b[0])>0 and min(a[3],b[3])-max(a[1],b[1])>0:
                        ids_a,ids_b=L[i][1],L[j][1]
                        msg=f'{size} {st} 熱區互疊 {ids_a[0]} {a} × {ids_b[0]} {b}'
                        if any(frozenset((x,y)) in ALLOW_IDS for x in ids_a for y in ids_b):
                            warn.append(msg+'（接受：▼ 優先）')
                        else:
                            fail.append(msg)
            z=[e for e in E if e['id']==zid]
            if not z: fail.append(f'{size} {st} 缺中央 60% {zid}'); continue
            z=z[0]
            if st in('normal','collapsed'):
                for e in E:
                    if e['layer']=='hud' and hud_kind(e):
                        ix=min(e['x1'],z['x1'])-max(e['x0'],z['x0']); iy=min(e['y1'],z['y1'])-max(e['y0'],z['y0'])
                        if ix>0 and iy>0 and e['kind'].split(':')[0]!='region':
                            warn.append(f'{size} {st} {e["id"]} {e["name"][:16]} 進中央 60% {ix}×{iy}')

for name in MD_FILES:
    for i,ln in enumerate(open(os.path.join(ROOT,name),encoding='utf-8'),1):
        if any(w in ln for w in BAN) and '沒有' not in ln and '禁用' not in ln: fail.append(f'{name}:{i} 禁用字')

# 圖檔：10 狀態 × 2 尺寸 ×（示意圖／標注圖／疊圖）×（1x／2x）＋圖例
ALL_ST=list(G.STATES)+['collapsed']
for st in ALL_ST:
    for size,(W,H) in G.SIZES.items():
        for suffix,expect in (('', 'plain'),('_annotated','ann'),('_overlay','ov')):
            for sc,k in (('',1),('@2x',2)):
                p=os.path.join(G.OUT,f'W1_battle-{st}_{size}{suffix}{sc}.png')
                if not os.path.exists(p): fail.append(f'缺圖 {os.path.relpath(p,ROOT)}'); continue
                w,h=Image.open(p).size
                if expect in('plain','ov'):
                    if (w,h)!=(W*k,H*k): fail.append(f'{os.path.basename(p)} 尺寸 {w}×{h} ≠ {W*k}×{H*k}')
                else:
                    if h<H*k or w<=W*k: fail.append(f'{os.path.basename(p)} 標注圖尺寸不對 {w}×{h}')
if not os.path.exists(os.path.join(G.OUT,'W1_skillcells_legend.png')): fail.append('缺 W1_skillcells_legend.png')

print(f'比對元件列：{total}（390＋1280，一般／收起，hud＋場景）')
print(f'md 檔：{", ".join(MD_FILES) or "（無）"}')
print('警告（例外，記錄）：' if warn else '警告：無')
for w in sorted(set(warn)): print('  -',w)
if fail:
    print('FAIL'); [print('  x',f) for f in fail]; sys.exit(1)
print('PASS：產生器元件清單 == md 表；熱區、出界、掉落牌下限、禁用字、檔案大小、圖檔尺寸都過')
