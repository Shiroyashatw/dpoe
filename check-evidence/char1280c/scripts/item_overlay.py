"""逐項疊圖：示意（定稿示意圖縮到 1280×720）｜實機｜50% 疊合，2× 放大；另取樣像素色值（示意 vs 實機）。"""
import json, os
from PIL import Image
O='ev/overlay'; ST='ev/states-1280x720'; OUT='ev/item-overlay'; os.makedirs(OUT, exist_ok=True)
def full(path, clip=None):
    im=Image.open(path).convert('RGB')
    if clip:
        base=Image.new('RGB',(1280,720),(0,0,0)); base.paste(im,(clip[0],clip[1])); return base
    return im
def triple(name, wfstate, actual, box, z=2):
    wf=Image.open(f'{O}/wf-{wfstate}.png').convert('RGB'); a=actual; bl=Image.blend(wf,a,0.5)
    w,h=box[2]-box[0],box[3]-box[1]
    im=Image.new('RGB',(w*z*3+16,h*z),(255,0,255))
    for i,x in enumerate([wf,a,bl]): im.paste(x.crop(box).resize((w*z,h*z),Image.LANCZOS),(i*(w*z+8),0))
    im.save(f'{OUT}/{name}.png')
RCc=(780,60)
S=lambda n: full(f'{ST}/{n}.png')
triple('item04-05-colors-04a', '04a-single-def', S('04a-single-def'), (788,76,1264,562))
triple('item05-btn2-01-stats', '01-stats', S('01-stats'), (500,76,1264,340))
triple('item05-btn2-03-pin-edit', '03-pin-edit', S('03-pin-edit'), (860,140,1264,562))
triple('item06-04b-single-def', '04b-single-def', S('04b-single-def'), (788,76,1264,562))
triple('item06-04b-long-affix', '04b-cands-hover-alt', full('ev/alt04b/s4-long-alt.png', RCc), (788,76,1264,562))
triple('item07-longpress-row', '02-stats-menu', S('02-stats-menu'), (860,330,1190,545))
triple('item08-keycaps-04a', '04a-single-def', S('04a-single-def'), (788,455,1264,530), 3)
triple('item08-keycaps-04b', '04b-single-def', S('04b-single-def'), (788,465,1264,566), 3)
triple('item09-cantwear-3req-helm-simple', '04a-cands-hover', full('ev/items/item9-cantwear-3req-helm-simple.png', RCc), (788,76,1264,562))
triple('item09-cantwear-3req-weapon-simple', '04a-cands-hover', full('ev/items/item9-cantwear-3req-weapon-simple.png', RCc), (788,76,1264,562))
triple('item09-cantwear-3req-weapon-alt', '04b-cands-hover-alt', full('ev/items/item9-cantwear-3req-weapon-alt.png', RCc), (788,76,1264,562))
triple('item10-focus-after-click', '01-stats', full('ev/items/item10-focus-after-click-pad-down.png', (780,130)), (788,130,1264,562))
triple('item10-focus-cand', '04a-cands-hover', full('ev/items/item10-focus-pad-right-cand.png', RCc), (788,76,1264,562))
triple('item05-cands-no-popup', '04a-cands-hover', S('04-cands-no-popup'), (788,76,1264,562))
triple('item11-cedit', '01-stats', S('01-stats'), (860,140,1190,230), 3)
triple('item02-battle-pad-focus', '04a-cands-hover', full('ev/item2/item2-battle-pad-focus-popup.png'), (788,76,1264,562))
# 像素取樣：區塊內出現最多的顏色（底色）／最接近目標色的像素（字色）
def mode(im, box):
    c=im.crop(box).getcolors(100000); return max(c)[1]
def near(im, box, tgt):
    px=list(im.crop(box).get_flattened_data()); return min(px, key=lambda p: sum((a-b)**2 for a,b in zip(p,tgt)))
W=lambda n: Image.open(f'{O}/wf-{n}.png').convert('RGB')
rows=[]
def samp(label, state, box, kind, tgt, wfstate=None, wfbox=None):
    a=S(state); w=W(wfstate or state); f=(lambda im,b: mode(im,b)) if kind=='bg' else (lambda im,b: near(im,b,tgt))
    rows.append((label, state, box, kind, '#%02x%02x%02x'%tgt, '#%02x%02x%02x'%f(w, wfbox or box), '#%02x%02x%02x'%f(a, box)))
samp('--btn2 未選切換「候選裝備」底','01-stats',(1026,152,1040,180),'bg',(0x52,0x4c,0x47))
samp('--btn2 關閉鈕底','01-stats',(1227,81,1235,90),'bg',(0x52,0x4c,0x47))
samp('--btn2 「編輯釘選」底','01-stats',(1059,189,1066,219),'bg',(0x52,0x4c,0x47))
samp('--tx-strong 「編輯釘選」字','01-stats',(1056,186,1152,222),'fg',(0xfb,0xf9,0xf6))
samp('--btn2 ☆ 底','03-pin-edit',(1132,408,1136,432),'bg',(0x52,0x4c,0x47))
samp('--btn2 收起鈕底','04-cands-no-popup',(1150,188,1154,212),'bg',(0x52,0x4c,0x47),'04a-cands-hover')
samp('--border-cap 選中格外框','04-cands-no-popup',(799,160,804,196),'fg',(0xd9,0xd3,0xcd),'01-stats')
samp('--good ④ ▲ 字','04a-single-def',(808,405,1244,452),'fg',(0x95,0xe8,0x86))
samp('--bad ④ ▼ 字','04a-single-def',(808,405,1244,452),'fg',(0xff,0x9b,0xba))
samp('--good 格內判定角標（▲）','04-cands-no-popup',(868,254,1150,330),'fg',(0x95,0xe8,0x86),'01-stats')
samp('--plate-world 名詞提示底（半透明，疊在戰場上）','01-stats',(520,114,770,160),'bg',(37,33,30))
samp('⑤ 鍵帽框 --border','04a-single-def',(1080,481,1175,507),'fg',(129,123,117),None,(1069,478,1164,508))
json.dump(rows, open(f'{OUT}/pixel-samples.json','w'), ensure_ascii=False, indent=1)
md='| 取樣 | 狀態圖 | 區塊 x0,y0,x1,y1 | 取法 | 規格色 | 示意圖 | 實機 |\n|---|---|---|---|---|---|---|\n'+'\n'.join(f'| {r[0]} | {r[1]} | {r[2]} | {"區塊眾數" if r[3]=="bg" else "最接近規格色的像素"} | {r[4]} | {r[5]} | {r[6]} |' for r in rows)
open(f'{OUT}/pixel-samples.md','w').write(md+'\n'); print(md)
