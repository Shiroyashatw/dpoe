# 從 gen_battle_hud.catalog()／catalog_collapsed() 產生 battle-hud*.md 的元件表（模板 *.md.in 的 {{T size layer}}）。
import os,re,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import gen_battle_hud as G
import xpblk as X   # v1.3.5 經驗條／格擋值弧（{{X size layer}}）
ROOT=G.MD_DIR  # md 所在（repo：specs/battle-hud）
HERE=os.path.dirname(os.path.abspath(__file__))
COLS='| id | 名稱 | x | y | w | h | 字 | token | 狀態 | 熱區 | 旗 |'
def row(e,states,st):
    return '| '+' | '.join([e['id'],e['name'],str(e['x0']),str(e['y0']),str(e['x1']-e['x0']),str(e['y1']-e['y0']),e['font'],e['token'],G.states_text(states,st),e['hit'],e['flag'] or '定'])+' |'
def table(size,layer):
    if layer.startswith('collapsed-'):
        cat=G.catalog_collapsed(size); want=layer[len('collapsed-'):]
    else:
        cat=G.catalog(size); want=layer
    rows=[row(e,s,st) for e,s,st in cat if (e['layer']=='world')==(want=='world')]
    return '\n'.join([f'<!-- T {size} {layer} -->',COLS,'|'+'---|'*11]+rows)
def build():
    out=[]
    for name in sorted(os.listdir(HERE)):
        if not name.endswith('.md.in'): continue
        dest=name[:-3]  # battle-hud.md
        t=open(os.path.join(HERE,name),encoding='utf-8').read()
        t=re.sub(r'\{\{T (\S+) (\S+)\}\}',lambda m:table(m.group(1),m.group(2)),t)
        t=re.sub(r'\{\{X (\S+) (\S+)\}\}',lambda m:X.table(m.group(1),m.group(2)),t)
        p=os.path.join(ROOT,dest); open(p,'w',encoding='utf-8').write(t); out.append((p,len(t.encode())))
    return out
if __name__=='__main__':
    for p,n in build(): print(p,n,'B','OK' if n<=25600 else 'OVER 25600')
