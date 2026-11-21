# battle-hud v1.3.6 能量護盾層 元件清單（mumi 11/21 12:13 ES1 B／ES2／ES3／ES4；12:31 淡金 --es；12:32 E1 維持字級；12:37 示意圖 OK）。
# 本檔是 E 表唯一真實來源：battle-hud-6.md 的 {{E size layer}} 由 build_md.py 產生，check_consistency.py 反向比對；
# 上色示意圖 ../color/src/render_es.py 也只讀這裡的座標。生命條 P37／T26／D59／C59 框不動，只改字（見 battle-hud-6.md §22）。
VERSION='battle-hud v1.3.6（能量護盾層，mumi 11/21 12:37）'
LIFEMAX,ESMAX=968,600          # 示例值，不是遊戲數值
EX_RECHARGE=90                 # 充能中示例 90 / 600
def el(id,name,x0,y0,x1,y1,kind,font,token,hit,st,flag,**geo):
    return dict(id=id,name=name,x0=x0,y0=y0,x1=x1,y1=y1,kind=kind,font=font,token=token,hit=hit,st=st,flag=flag,geo=geo,layer='hud')
STRIP_TOK='填 --es、空槽 --panel-inset（M2-36-palette-tokens.md）；在生命條 1 px --border 框內最底 3 px；生命條下緣不變'
HEAD_TOK='--es-hi 2 px（M2-36-palette-tokens.md），常亮不閃'
STRIP_ST='有能量護盾上限才畫；寬＝能量護盾÷最大能量護盾，由左往右填；0 時只剩空槽；沒有能量護盾上限時整條不畫；能量護盾低時不另標（ES4）；點了異能魔力仍畫在生命條（E2）'
HEAD_ST='只在充能中畫，貼在填色最前面；受傷後 4 秒延遲中不畫；不閃（ES3）；x 隨填色移動，表上座標是示例 90 / 600'
def strip_box(size,dy=0):
    return (11,522+dy,353,525+dy) if size=='390x844' else (341,668,789,671)
def head_box(size,dy=0,es=EX_RECHARGE):
    s=strip_box(size,dy); hx=s[0]+round((s[2]-s[0])*es/ESMAX); return (hx-2,s[1],hx,s[3])
def items(size,collapsed=False):
    port=size=='390x844'; dy=140 if (port and collapsed) else 0
    p={('390x844',False):'P',('390x844',True):'T',('1280x720',False):'D',('1280x720',True):'C'}[(size,collapsed)]
    n={'P':70,'T':46,'D':69,'C':67}[p]
    bar={'P':'P37','T':'T26','D':'D59','C':'C59'}[p]
    s=strip_box(size,dy); h=head_box(size,dy)
    return [el(f'{p}{n}',f'能量護盾細條（{bar} 框內底 3 px）',*s,'es','—',STRIP_TOK,'—（不可點）',STRIP_ST+('；收起時跟 HUD 一起下移 140' if dy else ''),'定（mumi 11/21 12:13 ES1 B；12:31 --es）'),
            el(f'{p}{n+1}','能量護盾充能中前緣（例 90 / 600）',*h,'eshead','—',HEAD_TOK,'—',HEAD_ST,'定（mumi 11/21 12:13 ES3；12:31 --es-hi）')]
COLS='| id | 名稱 | x | y | w | h | 字 | token | 狀態 | 熱區 | 旗 |'
def rows(size,collapsed):
    return [[e['id'],e['name'],str(e['x0']),str(e['y0']),str(e['x1']-e['x0']),str(e['y1']-e['y0']),e['font'],e['token'],e['st'],e['hit'],e['flag']] for e in items(size,collapsed)]
def table(size,layer):
    r=rows(size,layer=='collapsed')
    return '\n'.join([f'<!-- E {size} {layer} -->',COLS,'|'+'---|'*11]+['| '+' | '.join(x)+' |' for x in r])
def hp_text(life,es):
    return f'生命 {life:,} / {LIFEMAX:,}'+('' if es is None else f'・能量護盾 {es:,} / {ESMAX:,}')
