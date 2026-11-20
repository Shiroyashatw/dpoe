# battle-hud v1.3 線框產生器（final，2026-11-20 mumi 16:32 核准上色版定稿進 repo）。
# 16:32 三項：1280 收起列兩行 320×64（x 16–336、y 640–704）；390 T32 寬 108（從 T34 扣 16）；掉落牌／菁英名牌寬度跟名稱（字寬＋左右各 6，最寬 140，超過才「…」，以中心為準，高與 y 不變）。
# 依據：D2 戰場定案 Page 389c5787（/workspace/d2final/render_final.py 座標）＋W1 v2 草稿（gen_w1.py）＋暫定項（遊戲製作人 15:0x 轉 mumi 15:02）。
# 元件清單是唯一真實來源：battle-hud.md 的 §2／§3 表由 build_md.py 從這裡產生，check_consistency.py 反向比對。
# 用法：python3 gen_battle_hud.py            → 產生 ../wireframes/ 全部圖
#       import gen_battle_hud as G; G.catalog('390x844') → 合併 4 狀態的元件表（不畫圖）
from PIL import Image, ImageDraw, ImageFont
import os
HERE=os.path.dirname(os.path.abspath(__file__))
# 版面：repo（specs/wireframes/W1-battle-hud/src，md 在 specs/battle-hud）或舊草稿（W1-v13/src，md 與 wireframes/ 同層）
_REPO=os.path.isdir(os.path.join(HERE,'..','..','..','battle-hud'))
OUT=os.path.dirname(HERE) if _REPO else os.path.join(os.path.dirname(HERE),'wireframes')
MD_DIR=os.path.normpath(os.path.join(HERE,'..','..','..','battle-hud')) if _REPO else os.path.dirname(HERE)
VERSION='battle-hud v1.3（final，2026-11-20 mumi 16:32）'
DATE='2026-11-20'
STATES=['normal','boss','lowhp','lootflood']
COLLAPSED='collapsed'
SCODE={'normal':'N','boss':'B','lowhp':'L','lootflood':'F','collapsed':'C'}
SIZES={'390x844':(390,844),'1280x720':(1280,720)}
FR='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; FB='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
_fc={}
def F(sz,b=False):
    k=(round(sz,2),b)
    if k not in _fc: _fc[k]=ImageFont.truetype(FB if b else FR,int(sz),index=3)
    return _fc[k]

# 元件欄位：id 名稱 x0 y0 x1 y1 kind font token hit st layer flag
#  kind：region panel btn act bar text icon circle map world cell tip vig zone line
#  hit：'=框'＝熱區同框；'—'＝不可點；其他＝明寫熱區
#  st：這個狀態下的內容（可隨狀態變，例如技能格 1 在 F 是裝填中）
#  layer：hud＝固定位置，疊圖 ±2 px 驗；world＝場景示意，只驗規則；zone＝參考線
#  flag：''＝定；'暫定'＝待 mumi；'未驗'＝token 對比或文字寬未驗
def el(id,name,x0,y0,x1,y1,kind,font='—',token='—',hit='—',st='',layer='hud',flag=''):
    return dict(id=id,name=name,x0=x0,y0=y0,x1=x1,y1=y1,kind=kind,font=font,token=token,hit=hit,st=st,layer=layer,flag=flag)

# ---- 掉落牌／菁英名牌寬度（定 mumi 16:32）：內容寬（記號＋字）＋左右各 6，最寬 140，超過才「…」；以中心為準，高與 y 不變 ----
PLATE_PAD=6; PLATE_MAX=140
DROP_RAR={'判官烏紗':'unique','王印・赤霄':'chase','厲鬼護符':'rare','寒鐵之戒':'magic','崇高石':'magic','混沌石 ×3':'normal','鏽蝕長劍':'normal',
          '冥河斬馬刀':'rare','金 ×412':'normal','混沌石':'normal','金 ×86':'normal'}
FLOOD=['混沌石','寒鐵之戒','崇高石','鏽蝕長劍','金 ×86','寒鐵之戒','混沌石']   # 洪水多出的牌（一般／魔法，沒有記號）
ELITE_LABEL='菁英・判官'
def prefix_w(rar,sz):
    """記號寬（含與字的間距）：稀有 ◆／傳奇 ◈ 畫成 sz/2−1 半徑菱形＋4；追逐＝王印 16＋3；一般／魔法 0。"""
    return {'rare':2*(sz//2-1)+4,'unique':2*(sz//2-1)+4,'chase':19}.get(rar,0)
def plate_box(cx,y0,y1,content_w):
    import math
    w=min(PLATE_MAX,int(math.ceil(content_w))+2*PLATE_PAD); x0=int(round(cx-w/2)); return x0,y0,x0+w,y1
def drop_plate(label,cx,y0,y1,sz):
    rar=DROP_RAR[label]; f=F(sz); tw=f.getlength(label)
    x0,y0,x1,y1=plate_box(cx,y0,y1,prefix_w(rar,sz)+tw)
    mark={'rare':' ◆','unique':'（傳奇）','chase':'（追逐）'}.get(rar,'')
    return f'掉落牌 {label}{mark}',x0,y0,x1,y1
def elite_plate(cx,y0,y1,sz):
    return plate_box(cx,y0,y1,20+F(sz,True).getlength(ELITE_LABEL))   # 菁英圖示 16＋間距 4
def drops_el(a,drops,sz,font):
    """drops：(label 或 None＝洪水牌, 原框中心 cx, y0, y1)。"""
    fi=0
    for i,(lab,cx,y0,y1) in enumerate(drops):
        if lab is None: lab=FLOOD[fi%len(FLOOD)]; fi+=1
        n,x0,y0,x1,y1=drop_plate(lab,cx,y0,y1,sz)
        a(el(f'W{10+i}',n,x0,y0,x1,y1,'world',font,'--plate-world＋稀有度框；寬＝記號＋字＋左右 6，最寬 140（定 mumi 16:32）',layer='world'))
def C(x0,x1): return (x0+x1)/2

CELL_ST={'ammo':'彈匣「4」','reload':'裝填中（裝填環＋「裝填」）','gren':'儲存「1」＋下緣進度','wind':'蓄力「2/3」（按住時）','flask':'藥劑技能「3」','cd':'冷卻「2.4」'}
TABS7=['戰利品','角色','鍛造','技能','天賦','營地','更多']
TABKEY=['L','V','K','G','P','H','Z']
def aura_n(state):
    return 9 if state=='lootflood' else 7  # lootflood 示範超過 7：6＋「+3」（名詞表 v0.6.36）
AURA_ST={'normal':'7 個全畫（名詞表 v0.6.36）','boss':'7 個全畫（名詞表 v0.6.36）','lowhp':'7 個全畫（名詞表 v0.6.36）','lootflood':'9 個→6＋「+3」，k＝auraOn.length−6（名詞表 v0.6.36）'}

# 掉落牌：(名稱, 原框中心 cx, y0, y1)；寬由 drop_plate 算（定 mumi 16:32）
# 牌子變寬後同一列會相碰：場景示意的中心微調，間距 ≥2（W12 188→195、W13 114→117、W14 209→214、W11 284→290；洪水 W22 往上疊到 374–394）。
PORT_DROPS=[('判官烏紗',C(18,94),386,406),('王印・赤霄',290,396,416),('厲鬼護符',195,408,428),('寒鐵之戒',117,408,428),('崇高石',214,376,394),('混沌石 ×3',C(110,180),362,380),('鏽蝕長劍',C(18,76),408,428)]
PORT_FLOOD=[(None,C(12,70),250,270),(None,C(250,314),250,270),(None,C(40,110),300,320),(None,C(250,320),330,350),(None,C(150,220),215,235),(None,277,374,394)]
DESK_DROPS=[('冥河斬馬刀',C(200,283),230,252),('判官烏紗',C(352,440),440,462),('王印・赤霄',C(922,1018),415,437),('厲鬼護符',C(842,930),500,522),('鏽蝕長劍',C(498,570),505,527),('寒鐵之戒',C(418,490),538,560),('混沌石 ×3',C(560,640),538,560),('崇高石',C(705,765),520,542),('金 ×412',C(982,1066),538,560)]
DESK_FLOOD=[(None,C(300,370),250,272),(None,C(900,980),250,272),(None,C(760,840),300,322),(None,C(380,450),320,342),(None,C(1060,1140),440,462),(None,C(640,720),470,492)]

def port(state):
    """390×844 直立 v1.1：技能列在生命／魔力條上方；右邊光環欄＋分隔線＋狀態欄（往上長，貼右緣，在中央 60% 外）。"""
    E=[]; a=E.append
    a(el('P01','安全區 上（狀態列，空）',0,0,390,47,'zone',token='env(safe-area-inset-top)，參考 47',layer='zone'))
    a(el('P02','安全區 下（home 條，空）',0,810,390,844,'zone',token='env(safe-area-inset-bottom)，參考 34',layer='zone'))
    a(el('P03','頂列',0,47,390,91,'panel',token='--panel＋下緣 1px --border'))
    for i,(n,x0,x1) in enumerate([('金',4,80),('靈魂',84,148),('混沌',152,204),('崇高',208,256)]):
        a(el(f'P{4+i:02d}',f'通貨 {n}',x0,47,x1,91,'text','14/700','圖示 16＋--tx-strong','=框','點＝通貨明細'))
    a(el('P08','地點＋★「酆都 14 層 ★3」',262,58,382,80,'text','14/400','--tx-dim；★ --tx-strong','262–382×47–91','點＝提示（星級、怪物 Lv）'))
    a(el('P09','戰場',0,91,390,552,'region',token='--scene-*'))
    a(el('P10','中央 60%（參考）',78,183,312,460,'zone',layer='zone'))
    a(el('P11','掉落牌下限線 y=428',0,428,390,428,'line',token='掉落牌 y1 ≤ 428',layer='zone'))
    if state=='boss':
        a(el('P12b','王血條底板（外擴 4）',4,95,386,127,'panel',token='--plate-world 0.92',st='王現身到王死'))
        a(el('P12','王名＋王血條',8,99,382,123,'bar','14/700','--panel-inset 槽、--hp、--tx-strong；底板 P12b',st='王現身到王死',flag='未驗'))
        a(el('P13','大招警示「大招」＋倒數條 4 高',8,129,198,157,'bar','14/700','--panel-inset 底、2px --bad-hi、字 --bad-hi',st='預警期間（big-attack §4）',flag='未驗'))
    if state=='normal':
        a(el('P14','工具提示（長按技能格 400 ms）「彈匣 4／6 發・打完裝填 1.5 秒」',10,392,380,426,'tip','14/400','--panel-raised、1px --panel-edge、--tx',st='長按時；放開收'))
    if state=='lowhp':
        for i,(n,b) in enumerate([('上',(0,91,390,115)),('下',(0,528,390,552)),('左',(0,115,24,528)),('右',(366,115,390,528))]):
            a(el(f'P{15+i}',f'低血紅邊 {n}',*b,'vig',token='--vig 24px，<35% 60%／<20% 70%',st='常亮不閃'))
        a(el('P19','生命條低血外框',8,506,356,528,'bar',token='1px --hp-hi',st='閃 ≤2 次／秒'))
    var=['ammo','gren','wind','flask','cd'] if state!='lootflood' else ['reload','gren','wind','flask','cd']
    for i,v in enumerate(var):
        x=10+i*50; a(el(f'P{20+i}',f'技能格 {i+1}',x,460,x+44,504,'cell:'+v,'數字 14/700','--panel-raised、1px --border、--tx-strong','=框',CELL_ST[v]))
    a(el('P25','光環列（最多 7 格，12×12、間距 2）',10,438,106,450,f'aurarow:12:{aura_n(state)}','+k 14/700','銅框 1px --panel-edge＋圖示；不寫個數、秒數；名詞表 v0.6.36','4–112×414–458（整組）',AURA_ST[state]+'；點＝光環清單「{名}・預留精魂 {sp}」',flag='例外'))
    for i in range(8):
        x=116+i*28; a(el(f'P{29+i}',f'狀態圖示 {i+1}',x,432,x+24,456,'icon','+k 14/700','格 24、圖示 16、1px --border；負面（紅框）100%、其餘 70%','114–340×414–458（整組）','由左往右；第 8 格超過時改「+{k}」' if i==7 else '',flag='例外'))
    a(el('P37','生命條「生命 820 / 968」',10,508,354,526,'bar','14/700','--hp、字 --tx-strong',st='L：「生命 301 / 968」'))
    a(el('P38','魔力條',10,530,354,548,'bar','14/700','--mp、字 --tx-strong'))
    a(el('P39','藥劑 生命（看得到 20）',360,507,380,527,'circle:cd','—','冷卻環 2px --hp-hi＋1px #000','346–390×483–527','只畫環；掛機時自動喝',flag='新排'))
    a(el('P40','藥劑 魔力（看得到 20）',360,529,380,549,'circle','—','冷卻環 2px --mp-hi＋1px #000','346–390×528–572','只畫環；掛機時自動喝',flag='新排'))
    a(el('P41','下方面板',0,552,390,756,'panel',token='--panel＋上緣 1px --panel-edge'))
    a(el('P42','掉落卡',10,558,380,704,'panel',token='--panel-raised、1px --border、圓角 6'))
    a(el('P43','本次掛機行「本次掛機 2 時 14 分・追逐保底 42%・目標 62%」',22,562,298,584,'text','14/400','--tx-dim；保底 --tx-strong','—','放不下先收目標名；右側讓給 P65 ▼',flag='未驗'))
    rows=5 if state!='lootflood' else 4
    for i in range(rows):
        y=584+i*22; a(el(f'P{44+i}',f'拾取 {i+1}',22,y,200,y+22,'text','14/400','「拾取」--tx-dim＋稀有度色＋記號','22–200×584–694（整塊）','新的在上；點＝掉落紀錄'))
    if state=='lootflood': a(el('P49','「+38 件已收」',22,650,200,672,'text','14/400','--tx-dim','22–200×584–694（整塊）','取代第 5 列'))
    a(el('P50','「比較 判官烏紗」',210,584,370,606,'text','14/400','--tx-dim','210–370×592–672（整塊）','點＝物品詳細；熱區上緣 592，外觀仍從 584 起（讓路給 P65 ▼）'))
    for i,(t,tk) in enumerate([('▲ 物理傷害 +18%','--good'),('▲ 生命 +120','--good'),('▼ 攻擊速度 −4%','--bad')]):
        a(el(f'P{51+i}',t,210,606+i*22,370,628+i*22,'text','14/400',tk,'210–370×592–672（整塊）'))
    a(el('P54','「⚠ 倉庫 96%」',210,676,320,698,'text','14/400','--warn','—','只顯示；倉庫從戰利品分頁或整理倉庫進'))
    a(el('P55','整理倉庫',10,708,130,752,'btn','14/400','--btn2＋1px --border','=框'))
    a(el('P56','自動',138,708,206,752,'btn','14/400','--btn2＋1px --border','=框'))
    a(el('P57','去營地（主鈕）',214,708,380,752,'act','16/700','--act＋2px --act-edge、--on-act','=框','全畫面唯一 --act'))
    a(el('P65','收起 ▼',322,562,346,586,'btn','圖示 24','--btn2；aria-label「收起掛機卡」','302–346×548–592','點＝收到最小；亦可往下拖面板上緣。定（mumi 15:50）',flag='定（mumi 15:50）'))
    for i,t in enumerate(TABS7):
        x0=round(i*390/7); x1=round((i+1)*390/7)
        a(el(f'P{58+i}',f'分頁 {t}',x0,756,x1,810,'act' if i==0 else 'btn','14/400＋圖示 16','選中 --sel-bg＋上緣 2px --focus；未選 --tx-dim','=框','選中' if i==0 else ''))
    a(el('W01','牆頂＋燈籠（場景裝飾 biome.js bDeco，隨地圖捲動）',0,91,390,131,'world',token='--scene-lamp-*',layer='world'))
    a(el('W02','主角腳圈＋▼',167,275,223,323,'world',token='--hero-ring 4px＋2px #000；▼ --focus',layer='world'))
    if state!='boss': a(el('W03',f'菁英名牌「{ELITE_LABEL}」',*elite_plate(C(140,232),135,155,14),'world','14/700','--plate-world＋--tx-strong；寬＝圖示＋字＋左右 6（定 mumi 16:32）',layer='world'))
    else: a(el('W04','王＋判決圈（示意）',120,200,270,290,'world',token='--enemy-tel 3px＋1px #000，填 55%',layer='world'))
    drops=PORT_DROPS+(PORT_FLOOD if state=='lootflood' else [])
    drops_el(a,drops,14,'14/400')
    return E

def desk(state):
    """1280×720 桌機 v1.1：下方 HUD 整組置中 340–958：技能列＋光環欄＋分隔線＋狀態列同一行，下面生命／魔力條＋藥劑。"""
    E=[]; a=E.append
    a(el('D01','頂列',0,0,1280,40,'panel',token='--panel＋下緣 1px --border'))
    for i,(n,x0,x1) in enumerate([('金',8,88),('靈魂',96,170),('混沌',178,224),('崇高',232,272)]):
        a(el(f'D{2+i:02d}',f'通貨 {n}',x0,2,x1,38,'text','16/700','圖示 16＋--tx-strong','=框','hover／點＝通貨明細'))
    a(el('D06','資訊列「酆都・陰兵借道 ★3 怪物 Lv 52」',400,8,734,32,'text','16/400','--tx；★ --tx-strong','400–734×2–38','hover＝提示'))
    for i,t in enumerate(TABS7):
        X=746+i*76; a(el(f'D{7+i:02d}',f'分頁 {t} [{TABKEY[i]}]',X,4,X+72,36,'act' if i==0 else 'btn','16/400＋鍵帽 12','--btn2＋1px --border；選中 --sel-bg＋2px --sel-edge',f'{X}–{X+72}×2–38','選中' if i==0 else '',flag='未驗' if i==0 else ''))
    a(el('D14','戰場',0,40,1280,720,'region',token='--scene-*'))
    a(el('D15','中央 60%（參考）',256,176,1024,584,'zone',layer='zone'))
    a(el('D16','掉落牌下限線 y=560',0,560,1280,560,'line',token='掉落牌 y1 ≤ 560',layer='zone'))
    if state=='boss':
        a(el('D17b','王血條底板（外擴 4）',396,44,884,74,'panel',token='--plate-world 0.92',st='王現身到王死'))
        a(el('D17','王名＋王血條',400,48,880,70,'bar','16/700','--panel-inset 槽、--hp、--tx-strong；底板 D17b',st='王現身到王死',flag='未驗'))
        a(el('D18','大招警示「大招」＋倒數條 4 高',520,76,760,108,'bar','16/700','--panel-inset 底、2px --bad-hi、字 --bad-hi',st='預警期間（big-attack §4）',flag='未驗'))
    if state=='normal':
        a(el('D19','工具提示（hover 技能格）「彈匣 4／6 發・打完裝填 1.5 秒」',340,524,668,558,'tip','16/400','--panel-raised、1px --panel-edge、--tx',st='hover 時'))
    if state=='lowhp':
        for i,(n,b) in enumerate([('上',(0,40,1280,64)),('下',(0,696,1280,720)),('左',(0,64,24,696)),('右',(1256,64,1280,696))]):
            a(el(f'D{20+i}',f'低血紅邊 {n}',*b,'vig',token='--vig 24px，<35% 60%／<20% 70%',st='常亮不閃'))
        a(el('D24','生命條低血外框',338,650,792,674,'bar',token='1px --hp-hi',st='閃 ≤2 次／秒'))
    a(el('D25','掉落面板',12,452,322,708,'panel',token='--panel＋1px --panel-edge、圓角 6'))
    a(el('D26','「本次掛機 2 時 14 分」',24,460,282,484,'text','16/400','--tx-dim','—','右側讓給 D64 ▼'))
    a(el('D27','「追逐保底 42%・目標 長老屋 Lv7 62%」',24,484,282,508,'text','16/700','王印 16＋--tx-strong','24–282×460–508','點＝追逐目標；右側讓給 D64 ▼',flag='未驗'))
    rows=6 if state!='lootflood' else 5
    for i in range(rows):
        y=512+i*24; a(el(f'D{28+i}',f'拾取 {i+1}',24,y,176,y+24,'text','16/400','稀有度色＋記號','24–176×512–656（整塊）','新的在上；點＝掉落紀錄'))
    if state=='lootflood': a(el('D34','「+38 件已收」',24,632,176,656,'text','16/400','--tx-dim','24–176×512–656（整塊）','取代第 6 列'))
    a(el('D35','「比較 判官烏紗」',182,512,316,536,'text','16/400','--tx-dim','182–316×512–584（整塊）','點＝物品詳細'))
    a(el('D36','▲ 物理傷害 +18%',182,536,316,560,'text','16/400','--good','182–316×512–584（整塊）'))
    a(el('D37','▼ 攻擊速度 −4%',182,560,316,584,'text','16/400','--bad','182–316×512–584（整塊）'))
    a(el('D38','「⚠ 倉庫 96%」',182,592,316,616,'text','16/400','--warn','182–316×586–622','點＝倉庫'))
    a(el('D39','整理倉庫',24,660,120,700,'btn','16/400','--btn2＋1px --border','=框'))
    a(el('D40','自動',128,660,192,700,'btn','16/400','--btn2＋1px --border','=框'))
    a(el('D41','去營地（主鈕）',200,660,310,700,'act','16/700','--act＋2px --act-edge、--on-act','=框','全畫面唯一 --act'))
    var=['ammo','gren','wind','flask','cd'] if state!='lootflood' else ['reload','gren','wind','flask','cd']
    for i,(v,k) in enumerate(zip(var,['左','右','Q','E','R'])):
        x=340+i*56; a(el(f'D{42+i}',f'技能格 [{k}]',x,596,x+48,644,'cell:'+v,'數字 16/700；鍵帽 12','--panel-raised、1px --border、--tx-strong','=框',CELL_ST[v]))
    a(el('D47','光環列（最多 7 格，14×14、間距 2）',340,571,450,585,f'aurarow:14:{aura_n(state)}','+k 16/700','銅框 1px --panel-edge＋圖示；不寫個數、秒數；名詞表 v0.6.36','334–458×560–596（整組）',AURA_ST[state]+'；hover／點＝光環清單「{名}・預留精魂 {sp}」',flag='例外'))
    for i in range(8):
        x=462+i*32; a(el(f'D{51+i}',f'狀態圖示 {i+1}',x,564,x+28,592,'icon','+k 16/700','格 28、圖示 16、1px --border；負面（紅框）100%、其餘 70%','460–718×560–596（整組）','由左往右；第 8 格超過時改「+{k}」' if i==7 else '',flag='例外'))
    a(el('D59','生命條「生命 820 / 968」',340,652,790,672,'bar','16/700','--hp、字 --tx-strong',st='L：「生命 301 / 968」'))
    a(el('D60','魔力條',340,676,790,696,'bar','16/700','--mp、字 --tx-strong'))
    a(el('D61','藥劑 生命 [1]（看得到 22）',796,651,818,673,'circle:cd','鍵帽 12','冷卻環 2px --hp-hi＋1px #000','789–825×640–676','只畫環；鍵帽徽章貼右下；掛機時自動喝',flag='新排'))
    a(el('D62','藥劑 魔力 [2]（看得到 22）',796,677,818,699,'circle','鍵帽 12','冷卻環 2px --mp-hi＋1px #000','789–825×677–713','只畫環；鍵帽徽章貼右下；掛機時自動喝',flag='新排'))
    a(el('D63','小地圖',1098,598,1268,708,'map',token='--panel、1px --border、--scene-mid'))
    a(el('D64','收起 ▼',290,456,314,480,'btn','圖示 24','--btn2；aria-label「收起掛機卡」','286–322×452–488','點＝收到最小；亦可往下拖面板上緣。定（mumi 15:50）',flag='定（mumi 15:50）'))
    a(el('W01','牆頂＋燈籠（場景裝飾 biome.js bDeco，隨地圖捲動）',0,40,1280,90,'world',token='--scene-lamp-*',layer='world'))
    a(el('W02','主角腳圈＋▼',612,343,668,393,'world',token='--hero-ring 4px＋2px #000；▼ --focus',layer='world'))
    if state!='boss': a(el('W03',f'菁英名牌「{ELITE_LABEL}」',*elite_plate(C(582,670),160,180,16),'world','16/700','--plate-world＋--tx-strong；寬＝圖示＋字＋左右 6（定 mumi 16:32）',layer='world'))
    else: a(el('W04','王＋判決圈（示意）',540,200,740,320,'world',token='--enemy-tel 3px＋1px #000，填 55%',layer='world'))
    drops=DESK_DROPS+(DESK_FLOOD if state=='lootflood' else [])
    drops_el(a,drops,16,'16/400')
    return E

def elements(size,state):
    E=port(state) if size=='390x844' else desk(state)
    pre='P' if size=='390x844' else 'D'
    for e in E:
        if e['id'].startswith('W'): e['id']=pre+e['id']
    return E

def catalog(size):
    """合併 4 狀態：同 id 的框與欄位必須一致（st 可隨狀態變），回傳 [(el, states, st_by_state)]。"""
    order=[]; seen={}
    for s in STATES:
        for e in elements(size,s):
            k=e['id']
            if k not in seen: seen[k]=dict(e=e,states=[],st={}); order.append(k)
            r=seen[k]; base=r['e']
            for f in ('name','x0','y0','x1','y1','font','token','hit','layer','flag'):
                assert base[f]==e[f],(size,k,f,base[f],e[f])
            r['states'].append(s); r['st'][s]=e['st']
    return [(seen[k]['e'],seen[k]['states'],seen[k]['st']) for k in order]

def states_text(states,st):
    codes=''.join(SCODE[s] for s in states)
    head='全' if len(states)==4 else codes
    vals={}
    for s in states: vals.setdefault(st[s],[]).append(SCODE[s])
    if len(vals)==1:
        v=next(iter(vals))
        return head+('：'+v if v else '')
    return head+'：'+'；'.join(f"{''.join(c)} {v}" for v,c in vals.items() if v)

# ---------------- 繪圖 ----------------
GREY={'region':(150,150,150),'panel':(90,90,90),'btn':(60,60,60),'act':(20,20,20),'bar':(70,70,70),'text':(120,120,120),
      'icon':(100,100,100),'circle':(60,60,60),'map':(90,90,90),'world':(130,130,130),'cell':(30,30,30),'tip':(40,40,40),'vig':(110,110,110),'zone':(170,170,170),'line':(0,0,0),'aura':(20,20,20),'div':(0,0,0),'auraglyph':(20,20,20),'aurarow':(20,20,20)}
FILL={'region':246,'panel':228,'btn':212,'act':180,'bar':200,'text':238,'icon':222,'circle':214,'map':222,'world':236,'cell':206,'tip':250,'vig':190,'zone':None,'line':None,'aura':218,'div':None,'auraglyph':None,'aurarow':None}
def kind(c): return c.split(':')[0]
def dashed_rect(d,b,col,w,step,on):
    x0,y0,x1,y1=b
    for xx in range(int(x0),int(x1),step): d.line((xx,y0,min(xx+on,x1),y0),fill=col,width=w); d.line((xx,y1,min(xx+on,x1),y1),fill=col,width=w)
    for yy in range(int(y0),int(y1),step): d.line((x0,yy,x0,min(yy+on,y1)),fill=col,width=w); d.line((x1,yy,x1,min(yy+on,y1)),fill=col,width=w)
def dashed_h(d,x0,x1,y,col,w,step,on):
    for xx in range(int(x0),int(x1),step): d.line((xx,y,min(xx+on,x1),y),fill=col,width=w)

def cell_inner(d,x,y,s,v,S,col,txt=False,key=None):
    """技能格內部；尺寸由 R4 §3.2（52／56）等比縮到 44／48。"""
    P=lambda *q:[c*S for c in q]
    nb=(x+s-17,y+2,x+s-2,y+18) if s==44 else (x+s-19,y+2,x+s-2,y+21)
    if v=='wind': nb=(x+s-29,nb[1],nb[2],nb[3]) if s==44 else (x+s-31,nb[1],nb[2],nb[3])
    def num(t):
        d.rectangle(P(*nb),outline=col,width=max(1,S//2))
        if txt: d.text(((nb[0]+nb[2])/2*S,(nb[1]+nb[3])/2*S),t,font=F((14 if s==44 else 16)*S,True),fill=col,anchor='mm')
    pw=34; px0=x+(s-pw)//2; py=y+s-8
    if v in('ammo','reload'):
        for k in range(6):
            b=P(px0+k*6,py,px0+k*6+3,py+3)
            if v=='ammo' and k<4: d.rectangle(b,fill=col)
            else: d.rectangle(b,outline=col,width=max(1,S//3))
        if v=='ammo': num('4')
        else:
            dashed_rect(d,P(x-3,y-3,x+s+2,y+s+2),col,max(1,S//2),4*S,3*S)
            if txt: d.text(((x+s/2)*S,(y+s/2-2)*S),'裝填',font=F(14*S,True),fill=col,anchor='mm')
            else: d.rectangle(P(x+8,y+14,x+s-8,y+28),outline=col,width=max(1,S//2))
    if v=='gren':
        cx=x+(s-17)//2
        d.rectangle(P(cx,y+s-14,cx+6,y+s-8),fill=col); d.rectangle(P(cx+10,y+s-14,cx+16,y+s-8),outline=col,width=max(1,S//3))
        d.rectangle(P(x+1,y+s-3,x+1+int((s-2)*0.6),y+s-2),fill=col)
        num('1')
    if v=='wind':
        w2=max(2,S); o=2
        d.line(P(x-o,y-o,x+s+o-4,y-o),fill=col,width=w2); d.line(P(x+s+o,y-o,x+s+o,y+s//2),fill=col,width=w2)
        d.line(P(x+s+o,y+s//2+4,x+s+o,y+s+o),fill=col,width=w2); d.line(P(x+s+o,y+s+o,x,y+s+o),fill=col,width=w2)
        d.line(P(x-o,y+s+o,x-o,y+4),fill=col,width=max(1,S//2))
        num('2/3')
    if v=='flask':
        d.rectangle(P(x+s//2-6,y+s//2-6,x+s//2+6,y+s//2+10),outline=col,width=max(1,S//2)); num('3')
    if v=='cd':
        d.rectangle(P(x+1,y+1,x+s-1,y+int(s*0.55)),fill=(200,200,200,255) if txt or col[:3]==(0,0,0) else (255,255,255,40))
        if txt: d.text(((x+s/2)*S,(y+s/2)*S),'2.4',font=F(16*S,True),fill=col,anchor='mm')
        else: d.rectangle(P(x+12,y+15,x+s-12,y+29),outline=col,width=max(1,S//2))
    if key and s==48:
        d.rectangle(P(x+2,y+2,x+16,y+16),outline=col,width=max(1,S//2))
        if txt: d.text(((x+9)*S,(y+9)*S),key,font=F(12*S),fill=col,anchor='mm')

COPPER=(168,146,127,255)
def aurarow(d,x0,y0,sz,n,S,overlay=False,col=(0,0,0,255),hit=None,cap=7):
    """光環列：sz 方格、間距 2、1px 銅框；n>cap 時畫 cap−1 個＋「+{k}」。"""
    if hit:
        m=[int(v) for v in hit.split('（')[0].replace('×','–').split('–')]
        dashed_rect(d,(m[0]*S,m[2]*S,m[1]*S-1,m[3]*S-1),(150,150,150,255),S,4*S,2*S)
    show=n if n<=cap else cap-1
    for i in range(show):
        x=x0+i*(sz+2); b=(x*S,y0*S,(x+sz)*S-1,(y0+sz)*S-1)
        if overlay: d.rectangle(b,outline=col,width=S); continue
        d.rectangle(b,fill=(70,58,48,255),outline=COPPER,width=S)
        c=sz/2; r=sz*0.28; cx,cy=(x+c)*S,(y0+c)*S
        [d.polygon,d.ellipse,d.rectangle][i%3]([(cx,cy-r*S),(cx+r*S,cy),(cx,cy+r*S),(cx-r*S,cy)] if i%3==0 else (cx-r*S,cy-r*S,cx+r*S,cy+r*S),fill=(230,220,205,255))
    if n>cap:
        k=n-(cap-1); x=x0+show*(sz+2)
        d.text((x*S,(y0+sz/2)*S),f'+{k}',font=F((14 if sz==12 else 16)*S,True),fill=col if overlay else (0,0,0,255),anchor='lm')
    return x0+show*(sz+2)-2
STAMP=VERSION

def stamp(d,W,H,S,overlay=False):
    """每張圖右下角版本號。390 放在下安全區；1280 放在畫面底緣。"""
    ft=F(9*S,True); lab=STAMP; tw=d.textlength(lab,font=ft)
    pad=4*S
    if W<500:
        X=(W-6)*S-tw; Y=(818)*S
    else:
        X=(W-6)*S-tw; Y=(H-16)*S
    bg=(255,255,255,230) if not overlay else (0,0,0,160)
    fg=(0,0,0,255) if not overlay else (255,255,255,220)
    d.rectangle((X-pad,Y-2*S,X+tw+pad,Y+12*S),fill=bg,outline=fg,width=max(1,S//2))
    d.text((X,Y),lab,font=ft,fill=fg)


def draw_label(d,e,S,mode):
    """示意圖／標注圖補上可讀文字與 ▼／▲；疊圖只留框線＋id。"""
    if mode=='overlay': return
    x0,y0,x1,y1=e['x0'],e['y0'],e['x1'],e['y1']
    w,h=x1-x0,y1-y0; name=e['name']; k=kind(e['kind'])
    cx,cy=(x0+x1)/2*S,(y0+y1)/2*S
    if name=='收起 ▼' or name.startswith('收起 ▼'):
        d.text((cx,cy),'▼',font=F(max(12,min(16,h-2))*S,True),fill=(0,0,0,255),anchor='mm'); return
    if name.startswith('展開'):
        d.text((cx,cy),'▲',font=F(max(12,min(16,h-2))*S,True),fill=(0,0,0,255),anchor='mm'); return
    lab=None
    if '「' in name and '」' in name:
        lab=name[name.index('「')+1:name.index('」')]
    elif name.startswith('分頁 '):
        lab=name.split(' ',1)[1].split(' [')[0]
    elif name.startswith('通貨 '):
        lab=name.split(' ',1)[1]
    elif name.startswith('整理') or name=='自動' or name.startswith('去營地'):
        lab=name.split('（')[0]
    elif name.startswith('比較') or name.startswith('▲ ') or name.startswith('▼ ') or '倉庫' in name:
        lab=name.strip('「」')
    elif k=='bar' and '生命條' in name:
        lab='生命 301 / 968' if '301' in (e.get('st') or '') else '生命 820 / 968'
    if not lab: return
    fs=11 if w>=80 else (10 if w>=40 else 9)
    f=F(fs*S); maxw=max(4,(w-4)*S); s=lab
    while s and d.textlength(s,font=f)>maxw: s=s[:-1]
    if not s: return
    if h>=22: d.text(((x0+2)*S,(y0+12)*S),s,font=f,fill=(30,30,30,255))
    else: d.text((cx,cy),s,font=f,fill=(30,30,30,255),anchor='mm')

def draw(W,H,E,mode,S,title):
    """mode: plain＝示意圖（剛好 W×H）；annotated＝標注圖（左畫面右清單）；overlay＝透明疊圖（剛好 W×H，框線＋id）。"""
    overlay=mode=='overlay'; plain=mode=='plain'
    LW=0 if mode!='annotated' else (640 if W<500 else 700)
    LH=H if mode!='annotated' else max(H,40+len(E)*13+30)
    im=Image.new('RGBA',((W+LW)*S,LH*S),(0,0,0,0) if overlay else (255,255,255,255))
    d=ImageDraw.Draw(im,'RGBA')
    order=sorted(range(len(E)),key=lambda i:{'zone':9,'line':9,'region':0,'panel':1,'vig':2,'world':2}.get(kind(E[i]['kind']),3))
    for idx in order:
        e=E[idx]; k=kind(e['kind']); x0,y0,x1,y1=e['x0'],e['y0'],e['x1'],e['y1']
        if overlay and (e['layer']=='world' or k=='zone'): continue
        col=(255,255,255,180) if overlay else GREY[k]+(255,)
        if k=='line':
            dashed_h(d,x0*S,x1*S,y0*S,(255,255,255,180) if overlay else (0,0,0,255),S,6*S,3*S)
            if mode=='annotated': d.text((150*S if W<500 else 330*S,(y0-11)*S),f'掉落牌 y1 ≤ {y0}',font=F(9*S),fill=(0,0,0,255))
            if overlay:
                d.text((8*S,(y0-10)*S),e['id'],font=F(8*S,True),fill=(255,255,255,220))
            continue
        b=(x0*S,y0*S,x1*S-1,y1*S-1)
        if mode!='overlay' and FILL[k] is not None: d.rectangle(b,fill=(FILL[k],)*3+(255,))
        dash=e['flag'] in('新排','定（mumi 15:50）','定（mumi 16:06）','定（mumi 16:32）') or k=='zone' or e['layer']=='world'
        if k=='div':
            d.rectangle((x0*S,y0*S,x0*S+S-1,y1*S-1),fill=col); dash=None
        elif k=='aura':
            d.rectangle(b,outline=col,width=2*S); d.rectangle((b[0]+4*S,b[1]+4*S,b[2]-4*S,b[3]-4*S),outline=col,width=S)
        elif k=='auraglyph':
            if mode=='annotated':
                m=[int(v) for v in e['hit'].replace('×','–').split('–')]
                dashed_rect(d,(m[0]*S,m[2]*S,m[1]*S-1,m[3]*S-1),(150,150,150,255),S,4*S,2*S)
            cx,cy,r=(x0+x1)/2*S,(y0+y1)/2*S,(x1-x0)/2*S
            d.polygon([(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)],fill=None if overlay else (120,90,60,255),outline=col)
        elif k=='aurarow':
            _,sz,n=e['kind'].split(':'); aurarow(d,x0,y0,int(sz),int(n),S,overlay,col,e['hit'] if mode=='annotated' else None)
        if k in('div','aura','auraglyph','aurarow'): pass
        elif k=='circle':
            if mode=='annotated' and e['hit']!='—' and '×' in e['hit']:
                m=[int(v) for v in e['hit'].replace('×','–').split('–')]
                dashed_rect(d,(m[0]*S,m[2]*S,m[1]*S-1,m[3]*S-1),(150,150,150,255),S,4*S,2*S)
            d.ellipse(b,outline=col,width=S if overlay else (2*S if e['kind'].endswith(':cd') else S))
            if '[' in e['name']:
                kb=(x1-6,y1-8,x1+6,y1+4) if x1-x0<=24 else (x1-10,y1-10,x1+4,y1+4); d.rectangle([v*S for v in kb],fill=(255,255,255,255) if not overlay else None,outline=col,width=S)
                if not overlay: d.text(((kb[0]+kb[2])/2*S,(kb[1]+kb[3])/2*S),e['name'].split('[')[1][0],font=F(10*S),fill=(0,0,0,255),anchor='mm')
            if e['kind'].endswith(':cd'): d.arc(b,-90,130,fill=col if overlay else (0,0,0,255),width=(2 if x1-x0<=24 else 3)*S)
        elif dash: dashed_rect(d,b,col,S,(5 if e['layer']=='world' else 8)*S,(2 if e['layer']=='world' else 5)*S)
        else: d.rectangle(b,outline=col,width=S)
        if k=='cell':
            key=e['name'].split('[')[1].split(']')[0] if '[' in e['name'] else None
            cell_inner(d,x0,y0,x1-x0,e['kind'].split(':')[1],S,col if overlay else (0,0,0,255),txt=not overlay,key=key)
        if mode!='overlay':
            d.text(((x0+2)*S,(y0+1)*S),e['id'],font=F(8*S,True),fill=(0,0,0,255))
            w=x1-x0
            if mode=='annotated' and w>=90 and y1-y0>=22 and k not in('cell',):
                d.text(((x0+24)*S,(y0+1)*S),e['name'][:max(4,w//11)],font=F(9*S),fill=(30,30,30,255))
                d.text(((x0+2)*S,(y0+11)*S),f'{x0},{y0} {w}×{y1-y0}',font=F(8*S),fill=(60,60,60,255))
        else:
            # 疊圖：框線旁寫 id
            d.text(((x0+1)*S,(y0+1)*S),e['id'],font=F(8*S,True),fill=(255,255,255,230))
        draw_label(d,e,S,mode)
    stamp(d,W,H,S,overlay=overlay)
    if mode=='annotated':
        lx=(W+12)*S
        d.text((lx,6*S),f'{title}｜id 名稱｜x,y w×h｜字級/字重｜token｜熱區｜旗',font=F(10*S,True),fill=(0,0,0,255))
        d.text((lx,20*S),'實線＝定；虛線＋綠字＝定（mumi 15:50）；藍字＝例外（進中央 60%）；短虛線＝場景示意；灰虛線＝熱區',font=F(9*S),fill=(80,80,80,255))
        for i,e in enumerate(E):
            if kind(e['kind'])=='line': geo=f"y={e['y0']}"
            else: geo=f"{e['x0']},{e['y0']} {e['x1']-e['x0']}×{e['y1']-e['y0']}"
            s=f"{e['id']} {e['name']}｜{geo}｜{e['font']}｜{e['token']}｜{e['hit']}｜{e['flag'] or '定'}"
            col=(0,110,50,255) if e['flag'].startswith('定（mumi') else (150,0,0,255) if e['flag']=='新排' else (0,90,160,255) if e['flag']=='例外' else (0,0,0,255)
            d.text((lx,(36+i*13)*S),s[:100],font=F(9*S),fill=col)
    return im

# ---------------- 收起狀態 ----------------
DY=140  # 390：HUD 整組下移 140，戰場下緣 552→712（+160），藥劑熱區下緣剛好貼收起列上緣

def collapsed_port():
    """390×844 收到最小（一行）。依據 M2-33 §5.1 mini、M2-12 §2 收起內容；動畫與滑入 定（mumi 15:50）。"""
    E=[]; a=E.append
    a(el('T01','安全區 上（狀態列，空）',0,0,390,47,'zone',token='env(safe-area-inset-top)，參考 47',layer='zone'))
    a(el('T02','安全區 下（home 條，空）',0,810,390,844,'zone',token='env(safe-area-inset-bottom)，參考 34',layer='zone'))
    a(el('T03','頂列（不變）',0,47,390,91,'panel',token='--panel＋下緣 1px --border'))
    for i,(n,x0,x1) in enumerate([('金',4,80),('靈魂',84,148),('混沌',152,204),('崇高',208,256)]):
        a(el(f'T{4+i:02d}',f'通貨 {n}',x0,47,x1,91,'text','14/700','圖示 16＋--tx-strong','=框','點＝通貨明細'))
    a(el('T08','地點＋★「酆都 14 層 ★3」',262,58,382,80,'text','14/400','--tx-dim；★ --tx-strong','262–382×47–91','點＝提示（星級、怪物 Lv）'))
    a(el('T09','戰場（91–712，高 621；原 461）',0,91,390,712,'region',token='--scene-*'))
    a(el('T10','中央 60%（參考）',78,215,312,588,'zone',layer='zone'))
    a(el('T11','掉落牌下限線 y=568',0,568,390,568,'line',token='掉落牌 y1 ≤ 568',layer='zone'))
    a(el('T12','光環列（最多 7 格，同 normal，下移 140）',10,438+DY,106,450+DY,'aurarow:12:7','+k 14/700','銅框 1px --panel-edge＋圖示；名詞表 v0.6.36',f'4–112×{414+DY}–{458+DY}（整組）','7 個全畫；點＝光環清單',flag='例外'))
    for i in range(8):
        x=116+i*28; a(el(f'T{13+i}',f'狀態圖示 {i+1}',x,432+DY,x+24,456+DY,'icon','+k 14/700','格 24、圖示 16、1px --border；負面 100%、其餘 70%',f'114–340×{414+DY}–{458+DY}（整組）','由左往右；第 8 格超過時改「+{k}」' if i==7 else '',flag='例外'))
    var=['ammo','gren','wind','flask','cd']
    for i,v in enumerate(var):
        x=10+i*50; a(el(f'T{21+i}',f'技能格 {i+1}',x,460+DY,x+44,504+DY,'cell:'+v,'數字 14/700','--panel-raised、1px --border、--tx-strong','=框',CELL_ST[v]))
    a(el('T26','生命條「生命 820 / 968」',10,508+DY,354,526+DY,'bar','14/700','--hp、字 --tx-strong'))
    a(el('T27','魔力條',10,530+DY,354,548+DY,'bar','14/700','--mp、字 --tx-strong'))
    a(el('T28','藥劑 生命（看得到 20）',360,507+DY,380,527+DY,'circle:cd','—','冷卻環 2px --hp-hi＋1px #000',f'346–390×{483+DY}–{527+DY}','只畫環；掛機時自動喝'))
    a(el('T29','藥劑 魔力（看得到 20）',360,529+DY,380,549+DY,'circle','—','冷卻環 2px --mp-hi＋1px #000',f'346–390×{528+DY}–{572+DY}','只畫環；掛機時自動喝'))
    # 收起列：貼在分頁上緣 756，44 高 → 712–756（M2-33 §5.1 貼 #pnav；M2-12 §2 寫 710–754，與現行分頁 756 差 2 px，本圖跟分頁）
    a(el('T30','收起列（一行）',0,712,390,756,'panel',token='--panel＋上緣 1px --border-mid（M2-33 §5.1）',st='點 T32–T34 整列熱區或 T35 ▲＝展開。定（mumi 15:50）'))
    a(el('T31','目標細條 4（D2 G04）62%',0,712,242,716,'bar',token='--good；對底 ≥3:1'))
    a(el('T32','「掛機 2 時 14 分」',12,722,120,746,'text','14/700 等寬','--tx','0–346×712–756（整列＝展開）','≥60 分寫「掛機 1 時 05 分」；寬 108（定 mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('T33','王印 16＋「追逐保底 42%」',126,722,234,746,'text','14/700 等寬','王印 --rar-chase；字 --tx-strong；100% 字 --rar-chase','0–346×712–756（整列＝展開）','條 48×6 先拿掉（寬度不夠，M2-12 §2-2）；隨 T32 右移 16（定 mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('T34','最近一筆稀有以上「判官烏紗」',238,722,342,746,'text','14/700','左 2px 稀有度直條＋形狀＋稀有度色；過長省略號；最寬 104','0–346×712–756（整列＝展開）','換新：從右滑入 200 ms，然後停住。定（mumi 15:50）；寬 120→104（定 mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('T35','展開 ▲',346,712,390,756,'btn','圖示 24','--btn2；aria-label「展開掛機卡」','=框','點＝回到一般狀態（面板 552–756）'))
    for i,t in enumerate(TABS7):
        x0=round(i*390/7); x1=round((i+1)*390/7)
        a(el(f'T{36+i}',f'分頁 {t}',x0,756,x1,810,'act' if i==0 else 'btn','14/400＋圖示 16','選中 --sel-bg＋上緣 2px --focus；未選 --tx-dim','=框','選中' if i==0 else ''))
    a(el('W01','牆頂＋燈籠（場景裝飾 biome.js bDeco，隨地圖捲動）',0,91,390,131,'world',token='--scene-lamp-*',layer='world'))
    a(el('W02','主角腳圈＋▼',167,214,223,262,'world',token='--hero-ring 4px＋2px #000；▼ --focus',layer='world'))
    a(el('W03',f'菁英名牌「{ELITE_LABEL}」',*elite_plate(C(140,232),135,155,14),'world','14/700','--plate-world＋--tx-strong；寬＝圖示＋字＋左右 6（定 mumi 16:32）',layer='world'))
    drops=PORT_DROPS[:6]+[('鏽蝕長劍',C(18,76),518,538),(None,C(250,326),540,560)]
    drops_el(a,drops,14,'14/400')
    return E

def collapsed_desk():
    """1280×720 收到最小。左下錨點 x 16 起照 M2-12 §1.2；v1.3 生命條從 x 340 起，右緣收到 336 以免壓條（mumi 16:06）。
    16 px 四段一行放不下（掛機時間要 120、追逐保底要 115），改兩行 320×64（x 16–336、y 640–704）定（mumi 16:32）：
    第一行 掛機時間＋追逐保底；第二行 最近一筆＋展開鈕 40×36（296–336 × 668–704）。"""
    E=[]; a=E.append
    a(el('C01','頂列',0,0,1280,40,'panel',token='--panel＋下緣 1px --border'))
    for i,(n,x0,x1) in enumerate([('金',8,88),('靈魂',96,170),('混沌',178,224),('崇高',232,272)]):
        a(el(f'C{2+i:02d}',f'通貨 {n}',x0,2,x1,38,'text','16/700','圖示 16＋--tx-strong','=框','hover／點＝通貨明細'))
    a(el('C06','資訊列「酆都・陰兵借道 ★3 怪物 Lv 52」',400,8,734,32,'text','16/400','--tx；★ --tx-strong','400–734×2–38','hover＝提示'))
    for i,t in enumerate(TABS7):
        X=746+i*76; a(el(f'C{7+i:02d}',f'分頁 {t} [{TABKEY[i]}]',X,4,X+72,36,'act' if i==0 else 'btn','16/400＋鍵帽 12','--btn2＋1px --border；選中 --sel-bg＋2px --sel-edge',f'{X}–{X+72}×2–38','選中' if i==0 else '',flag='未驗' if i==0 else ''))
    a(el('C14','戰場（全版；左下掉落面板收成一行後露出更多）',0,40,1280,720,'region',token='--scene-*'))
    a(el('C15','中央 60%（參考）',256,176,1024,584,'zone',layer='zone'))
    a(el('C16','掉落牌下限線 y=560',0,560,1280,560,'line',token='掉落牌 y1 ≤ 560（狀態列未移，下限不變）',layer='zone'))
    var=['ammo','gren','wind','flask','cd']
    for i,(v,k) in enumerate(zip(var,['左','右','Q','E','R'])):
        x=340+i*56; a(el(f'C{42+i:02d}',f'技能格 [{k}]',x,596,x+48,644,'cell:'+v,'數字 16/700；鍵帽 12','--panel-raised、1px --border、--tx-strong','=框',CELL_ST[v]))
    a(el('C47','光環列（最多 7 格，14×14、間距 2）',340,571,450,585,'aurarow:14:7','+k 16/700','銅框 1px --panel-edge＋圖示；名詞表 v0.6.36','334–458×560–596（整組）','7 個全畫；hover／點＝光環清單',flag='例外'))
    for i in range(8):
        x=462+i*32; a(el(f'C{51+i:02d}',f'狀態圖示 {i+1}',x,564,x+28,592,'icon','+k 16/700','格 28、圖示 16、1px --border；負面 100%、其餘 70%','460–718×560–596（整組）','由左往右；第 8 格超過時改「+{k}」' if i==7 else '',flag='例外'))
    a(el('C59','生命條「生命 820 / 968」',340,652,790,672,'bar','16/700','--hp、字 --tx-strong'))
    a(el('C60','魔力條',340,676,790,696,'bar','16/700','--mp、字 --tx-strong'))
    a(el('C61','藥劑 生命 [1]（看得到 22）',796,651,818,673,'circle:cd','鍵帽 12','冷卻環 2px --hp-hi＋1px #000','789–825×640–676','只畫環；鍵帽徽章貼右下；掛機時自動喝'))
    a(el('C62','藥劑 魔力 [2]（看得到 22）',796,677,818,699,'circle','鍵帽 12','冷卻環 2px --mp-hi＋1px #000','789–825×677–713','只畫環；鍵帽徽章貼右下；掛機時自動喝'))
    a(el('C63','小地圖',1098,598,1268,708,'map',token='--panel、1px --border、--scene-mid'))
    # 收起列：x 16 起的左下錨點照 M2-12 §1.2；右緣 336（生命條從 x 340 起）。兩行 320×64（x 16–336、y 640–704）定（mumi 16:32）：
    # 第一行 掛機時間＋追逐保底；第二行 最近一筆＋展開鈕（熱區 ≥36）。16 px 字不截斷。
    a(el('C30','收起列（兩行）',16,640,336,704,'panel',token='--panel＋1px --panel-edge；320×64，x 16–336、y 640–704',st='點 C32–C34 整列熱區或 C35 ▲＝展開。定（mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('C31','目標細條 4（D2 G04）62%',16,640,180,644,'bar',token='--good；對底 ≥3:1',flag='定（mumi 16:32）'))
    a(el('C32','「掛機 2 時 14 分」',24,646,148,670,'text','16/700 等寬','--tx','16–296×640–704（整列＝展開）','第一行；≥60 分寫「掛機 1 時 05 分」；寬 124 不截斷',flag='定（mumi 16:32）'))
    a(el('C33','王印 16＋「追逐保底 42%」',156,646,280,670,'text','16/700 等寬','王印 --rar-chase；字 --tx-strong','16–296×640–704（整列＝展開）','第一行；條 48×6 先拿掉；寬 124 不截斷',flag='定（mumi 16:32）'))
    a(el('C34','最近一筆稀有以上「判官烏紗」',24,676,288,700,'text','16/700','左 2px 稀有度直條＋形狀＋稀有度色；超過 264 才省略號','16–296×640–704（整列＝展開）','第二行；換新：從右滑入 200 ms，然後停住。定（mumi 15:50）；座標 定（mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('C35','展開 ▲',296,668,336,704,'btn','圖示 24','--btn2；aria-label「展開掛機卡」','=框','第二行右端 40×36（296–336 × 668–704），熱區 ≥36。定（mumi 16:32）',flag='定（mumi 16:32）'))
    a(el('W01','牆頂＋燈籠（場景裝飾 biome.js bDeco，隨地圖捲動）',0,40,1280,90,'world',token='--scene-lamp-*',layer='world'))
    a(el('W02','主角腳圈＋▼',612,343,668,393,'world',token='--hero-ring 4px＋2px #000；▼ --focus',layer='world'))
    a(el('W03',f'菁英名牌「{ELITE_LABEL}」',*elite_plate(C(582,670),160,180,16),'world','16/700','--plate-world＋--tx-strong；寬＝圖示＋字＋左右 6（定 mumi 16:32）',layer='world'))
    drops=[DESK_DROPS[0],('判官烏紗',C(40,128),440,462)]+DESK_DROPS[2:]+[(None,C(180,250),500,522)]
    drops_el(a,drops,16,'16/400')
    return E

def elements_collapsed(size):
    E=collapsed_port() if size=='390x844' else collapsed_desk()
    pre='T' if size=='390x844' else 'C'
    for e in E:
        if e['id'].startswith('W'): e['id']=pre+e['id']
    return E

def catalog_collapsed(size):
    """收起狀態單獨成表（id 與一般狀態不同，不併進 catalog）。"""
    return [(e,['collapsed'],{'collapsed':e['st']}) for e in elements_collapsed(size)]

def legend(path):
    S=4; im=Image.new('RGBA',(1600,2120),(255,255,255,255)); d=ImageDraw.Draw(im,'RGBA')
    d.text((20,12),f'{VERSION}（{DATE}）技能格 6 種＋光環列＋藥劑（4 倍）：上排 44（390），中排 48（1280，鍵帽 左右QER）',font=F(22,True),fill=(0,0,0,255))
    d.text((20,44),'格上數字只寫整數、不寫單位（蓄力用半形「2/3」）；冷卻秒數 1 位小數；不寫 ms；單位只在工具提示。禁用「彈夾」。字 14（390）／16（1280）粗體。',font=F(15),fill=(60,60,60,255))
    V=[('cd','冷卻','中間「2.4」16/700＋灰幕由上往下收','—'),
       ('ammo','彈匣（穿甲彈 6 發）','右上「4」；下緣 6 格','彈匣 4／6 發・打完裝填 1.5 秒｜Magazine 4/6 rounds · Reloads in 1.5s when empty'),
       ('reload','裝填中（0 發）','裝填環＋中間「裝填」14/700（EN Reload）','裝填中・1.2 秒｜Reloading · 1.2s'),
       ('gren','儲存（2 顆）','右上「1」；2 點；下緣 2px 下一顆進度','儲存 1／2 顆・下一顆 2.6 秒｜Stored 1/2 · Next in 2.6s'),
       ('wind','蓄力段（3 段）','按住時右上「2/3」，放開清掉；外圈 3 段弧','按住蓄力，最多 3 段；自動模式蓄滿才出手｜Hold to wind up, up to 3 stages; auto mode releases at full'),
       ('flask','藥劑技能','右上「3」＝floor(P.flask÷flaskCost())；{c}＝flaskCost()×FLASK.chg，進位到 0.1、去掉 .0','藥劑技能充能 3 次・每次 7.5 點｜Flask Skill Charges: 3 · 7.5 points per use')]
    for r,(s,y0) in enumerate([(44,90),(48,620)]):
        for i,(v,n,how,tip) in enumerate(V):
            X=20+i*240; x=X//S+4; y=y0//S+4
            d.rectangle((x*S,y*S,(x+s)*S-1,(y+s)*S-1),fill=(206,206,206,255),outline=(30,30,30,255),width=S//2)
            cell_inner(d,x,y,s,v,S,(0,0,0,255),txt=True,key={'cd':'R','ammo':'左','reload':'左','gren':'右','wind':'Q','flask':'E'}[v] if s==48 else None)
            ty=y0+s*S+28
            d.text((X,ty),n,font=F(17,True),fill=(0,0,0,255)); yy=ty+24
            for line in wrap(d,how,F(14),220): d.text((X,yy),line,font=F(14),fill=(40,40,40,255)); yy+=19
            yy+=4
            for j,part in enumerate(tip.split('｜')):
                for line in wrap(d,('提示：' if j==0 and part!='—' else '')+part,F(13),220): d.text((X,yy),line,font=F(13),fill=(120,0,0,255) if j==0 else (90,90,90,255)); yy+=17
    y0=1180; d.line((20,y0-20,1460,y0-20),fill=(160,160,160,255),width=2)
    AS=3
    for r,(sz,hh,lab,fs) in enumerate([(12,44,'光環列 390：圖示 12×12、間距 2、1px 銅框；整組一個熱區（高 44）',14),(14,36,'光環列 1280：圖示 14×14、間距 2、1px 銅框；整組一個熱區（高 36）',16)]):
        Y=y0+r*230; d.text((20,Y),lab,font=F(16,True),fill=(0,0,0,255))
        X=20
        for n in (1,3,7,9):
            w=min(n,7)*(sz+2)-2 if n<=7 else 6*(sz+2)+ (20 if sz==12 else 22)
            hw=w+14
            gx=X//AS; gy=(Y+40)//AS
            dashed_rect(d,(gx*AS,gy*AS,(gx+hw)*AS-1,(gy+hh)*AS-1),(150,150,150,255),AS,4*AS,2*AS)
            aurarow(d,gx+6,gy+(hh-sz)//2,sz,n,AS)
            cap='生效 1 個' if n==1 else f'生效 {n} 個' if n<=7 else f'生效 9 個 → 6 個＋「+3」'
            d.text((X,Y+40+hh*AS+6),cap+f'（寬 {w}）',font=F(14),fill=(0,0,0,255))
            X+=max(hw*AS,190)+30
    tip=['提示（點／hover 整組，列出生效中的光環；名詞表 v0.6.36）：','憤怒・預留精魂 {sp}｜Anger · Reserves {sp} Spirit','精準・預留精魂 {sp}｜Precision · Reserves {sp} Spirit','……（生效中的每個一行）','精魂 {used}／{max}｜Spirit {used}/{max}']
    for i,t in enumerate(tip): d.text((20,y0+470+i*20),t,font=F(14,i==0),fill=(120,0,0,255) if i else (0,0,0,255))
    d.text((20,y0+580),'沒有光環生效＝整組不畫、熱區也不留（狀態圖示照位置不動）。最多 7 格是排版上限，不是遊戲上限；精魂才是上限。超過 7 個：前 6 格＋第 7 格半形「+{k}」，k＝auraOn.length−6（名詞表 v0.6.36）。讀屏「還有 {k} 個光環」／"{k} more auras"。舊寫法（第 3 格、k−2）已作廢。',font=F(13),fill=(60,60,60,255))
    y0=1820; d.line((20,y0-20,1580,y0-20),fill=(160,160,160,255),width=2)
    for j,(vis,hit,lab) in enumerate([(20,44,'藥劑 390：看得到 20、熱區 44'),(22,36,'藥劑 1280：看得到 22＋鍵帽、熱區 36')]):
        X=20+j*420; x=X//S+4; y=y0//S+4; o=(hit-vis)//2
        dashed_rect(d,(x*S,y*S,(x+hit)*S-1,(y+hit)*S-1),(150,150,150,255),S,4*S,2*S)
        b=((x+o)*S,(y+o)*S,(x+o+vis)*S-1,(y+o+vis)*S-1); d.ellipse(b,outline=(0,0,0,255),width=S); d.arc(b,-90,130,fill=(0,0,0,255),width=2*S)
        if j==1:
            kb=(x+o+vis-6,y+o+vis-8,x+o+vis+6,y+o+vis+4); d.rectangle([v*S for v in kb],fill=(255,255,255,255),outline=(0,0,0,255),width=S)
            d.text(((kb[0]+kb[2])/2*S,(kb[1]+kb[3])/2*S),'1',font=F(10*S/1.3),fill=(0,0,0,255),anchor='mm')
        d.text((X,y0+hit*S+24),lab,font=F(15,True),fill=(0,0,0,255))
    d.text((20,y0+250),'藥劑：掛機時自動喝；只畫冷卻環 2px＋1px #000，不寫次數、秒數；鍵 1／2。',font=F(13),fill=(0,0,0,255))
    # 圖例較高，戳記放右下
    d.text((20,2060),STAMP,font=F(16,True),fill=(0,0,0,255))
    im.save(path)

def wrap(d,t,f,w):
    out=[];cur='';toks=[]
    for ch in t:
        if toks and ch.isascii() and ch!=' ' and toks[-1][-1:].isascii() and toks[-1][-1:]!=' ': toks[-1]+=ch
        else: toks.append(ch)
    for tk in toks:
        if d.textlength(cur+tk,font=f)>w and cur: out.append(cur.rstrip()); cur=tk.lstrip()
        else: cur+=tk
    if cur: out.append(cur)
    return out

def main():
    os.makedirs(OUT,exist_ok=True); files=[]
    jobs=[]
    for st in STATES:
        for size,(W,H) in SIZES.items():
            jobs.append((size,st,elements(size,st),W,H))
    for size,(W,H) in SIZES.items():
        jobs.append((size,'collapsed',elements_collapsed(size),W,H))
    for size,st,E,W,H in jobs:
        tag=f'W1_battle-{st}_{size}'
        mapping=(
            ('plain','',''),
            ('annotated','_annotated',''),
            ('overlay','_overlay',''),
            ('plain','','@2x'),
            ('annotated','_annotated','@2x'),
            ('overlay','_overlay','@2x'),
        )
        for mode,ov,sc in mapping:
            S=2 if sc else 1
            p=os.path.join(OUT,tag+ov+sc+'.png')
            draw(W,H,E,mode,S,f'{size} {st}').save(p); files.append(p)
    p=os.path.join(OUT,'W1_skillcells_legend.png'); legend(p); files.append(p)
    print('\n'.join(files))
if __name__=='__main__': main()
