# battle-hud v1.3.5 經驗條與格擋弧 元件清單（mumi 11/21 11:54 位置 A、12:07 上色＋M1 雙邊 8 px、M2 不加空軌外框；美術總監 H6 冷鋼 A＋盾 a）。
# 本檔是 X 表唯一真實來源：battle-hud-5.md 的 {{X size layer}} 由 build_md.py 產生，check_consistency.py 反向比對；
# 上色示意圖 ../color/src/render_xpblk.py 也只讀這裡的座標。不改 gen_battle_hud.py 的既有元件。
VERSION='battle-hud v1.3.5（經驗條／格擋弧，mumi 11/21 12:07）'
TERM='名詞表 v0.6.38'
def el(id,name,x0,y0,x1,y1,kind,font,token,hit,st,flag,**geo):
    return dict(id=id,name=name,x0=x0,y0=y0,x1=x1,y1=y1,kind=kind,font=font,token=token,hit=hit,st=st,flag=flag,geo=geo)
XP_TOK_390='上 1 px 沿用 P41 上緣 --panel-edge；條 4 px：空 --prog-lo、填 --prog-hi；下 1 px --border'
XP_TOK_390C='上、下各 1 px #000；條 4 px：空 --prog-lo、填 --prog-hi（收起時沒有面板，壓在場景上）'
XP_TOK_1280='雙邊（M1）：外 1 px #000＋內 1 px --border（上下左右）；條 4 px：空 --prog-lo、填 --prog-hi'
ARC_TOK='上半圓弧 4 px：填 --block、空／被打掉 --block-dim、回滿中 --block-regen 斷續段、碎開閃 --block-hi；外圍 1 px #000（必要）；空軌不加外框（M2）'
ICON_TOK='art/icons/hud/hud_block_16.png（DPR 2＝同目錄 hud_block_16@2x.png），不染色、不加框'
TIP_TOK='--panel-raised、1px --panel-edge、字 --tx（同 P14／D19）'
XP_ST='寬＝經驗÷升級所需，由左往右填；不可點、不寫字、不顯示角色等級；升級時歸零（沿用「升級！Lv {lv}・天賦點 +{n}」）'
ARC_ST='拿盾才畫。填＝目前格擋值÷最大格擋值，從左端順時針；四態：滿／被打掉／碎開回滿中（--block-regen 斷續段，不吸收傷害）／沒拿盾（不畫、熱區不留）'
TIP_ST='長按（390）／hover（1280）格擋值熱區才出；「格擋值 {n} / {max}」，例值「格擋值 412 / 600」；碎開回滿中加「（碎了，回滿前不吸收）」（名詞表 v0.6.38）；跟技能格工具提示共用位置，同時只出一個'
def items(size,collapsed=False):
    if size=='390x844':
        dy=140 if collapsed else 0; p='T' if collapsed else 'P'; n=(43 if collapsed else 66)
        E=[el(f'{p}{n}',f'經驗條（滿寬，{TERM}）',0,552+dy,390,558+dy,'xpbar','—',XP_TOK_390C if collapsed else XP_TOK_390,'—（不可點）',XP_ST+('；收起時跟 HUD 一起下移 140' if collapsed else ''),'定（mumi 11/21 11:54）'),
           el(f'{p}{n+1}',f'格擋弧（{TERM}）',278,478+dy,326,502+dy,'blkarc','—',ARC_TOK,f'260–344×{460+dy}–{504+dy}',ARC_ST,'定（mumi 11/21 12:07）',cx=302,cy=502+dy,r=24,stroke=4),
           el(f'{p}{n+2}','盾牌圖示 16',294,484+dy,310,500+dy,'icon','圖示 16',ICON_TOK,f'同 {p}{n+1}','跟格擋弧一起出現／消失','定（mumi 11/21 12:07 盾 a）')]
        if not collapsed:
            E.append(el('P69',f'格擋值工具提示「格擋值 412 / 600」（例值；{TERM}）',10,392,380,426,'tip','14/400',TIP_TOK,'—',TIP_ST,'定（文案例值）'))
        return E
    p='C' if collapsed else 'D'; n=(64 if collapsed else 65)
    E=[el(f'{p}{n}',f'經驗條（同生命／魔力條寬，{TERM}）',340,700,790,708,'xpbar','—',XP_TOK_1280,'—（不可點）',XP_ST+('；收起時 HUD 不移，同 D65' if collapsed else ''),'定（mumi 11/21 12:07 M1）'),
       el(f'{p}{n+1}',f'格擋弧（{TERM}）',726,616,782,644,'blkarc','—',ARC_TOK,'712–786×600–648',ARC_ST,'定（mumi 11/21 12:07）',cx=754,cy=644,r=28,stroke=4),
       el(f'{p}{n+2}','盾牌圖示 16',746,626,762,642,'icon','圖示 16',ICON_TOK,f'同 {p}{n+1}','跟格擋弧一起出現／消失','定（mumi 11/21 12:07 盾 a）')]
    if not collapsed:
        E.append(el('D68',f'格擋值工具提示「格擋值 412 / 600」（例值；{TERM}）',340,524,668,558,'tip','16/400',TIP_TOK,'—',TIP_ST,'定（文案例值）'))
    return E
COLS='| id | 名稱 | x | y | w | h | 字 | token | 狀態 | 熱區 | 旗 |'
def rows(size,collapsed):
    return [[e['id'],e['name'],str(e['x0']),str(e['y0']),str(e['x1']-e['x0']),str(e['y1']-e['y0']),e['font'],e['token'],e['st'],e['hit'],e['flag']] for e in items(size,collapsed)]
def table(size,layer):
    r=rows(size,layer=='collapsed')
    return '\n'.join([f'<!-- X {size} {layer} -->',COLS,'|'+'---|'*11]+['| '+' | '.join(x)+' |' for x in r])
