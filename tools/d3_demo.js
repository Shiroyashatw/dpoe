const { chromium } = require('playwright');
/* D3 展示頁（demo/d3/）的截圖、錄影與預篩。只開展示頁，不碰遊戲。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d3_demo.js [shots|videos|all|V<n>]（預設 all）
   產出 docs/production/evidence/dpoe-d3-demo/（D3_OUT 可改）：shots/<尺寸>/<列>.png、toggles/<尺寸>/<畫面>_<fs|en|rm>.png、
   extra/<尺寸>/<列>.png（390×664、1280×800）、videos/<V>_<尺寸>_<一般|rm>.mp4（60 fps 逐幀）、frames/<V>_<尺寸>_<模式>/（關鍵幀）、
   results.json、results.md、prefilter.md。
   預篩照 D3-checklist.md 第 11 節（PF1–PF16、PF-K、PF-W、PF-L、PF-R、PF-F）＋各列量測；不放寬清單門檻；有 ❌ 結束碼 1 */
const fs = require('fs'),
  path = require('path'),
  crypto = require('crypto'),
  { execFileSync } = require('child_process');
const MODE = process.argv[2] || 'all',
  URL = process.env.D3_URL || 'http://localhost:8000/demo/d3/',
  OUT = process.env.D3_OUT || path.join(__dirname, '..', 'docs/production/evidence/dpoe-d3-demo'),
  TMP = process.env.D3_TMP || path.join(require('os').tmpdir(), 'd3frames');
const SIZES = ['390x844', '1280x720'];
const { abbr } = require('../demo/d3/num.js');

/* ---------- 各列量測：[說明, 選擇器, 直立期望, 桌機期望]；期望 {x,y,w,h}（±2）或 {minW,minH} ---------- */
const E = (d, sel, p, k) => ({ d, sel, p, k });
const GEO = {
  L01: [
    E('面板 330–710／右欄 844–1264×76–612', '[data-panel=loc]', { y: 330, h: 380 }, { x: 844, y: 76, w: 420, h: 536 }),
    E('× 44×44', '[data-panel=loc] [data-k=px]', { w: 44, h: 44 }, { minW: 36, minH: 36 })
  ],
  L02: [
    E('正在刷卡 378–454 374×76／y 124–200', '[data-m=L02]', { y: 378, w: 374, h: 76 }, { y: 124, h: 76 }),
    E('地圖詞鈕 102×44', '[data-k=mods]', { w: 102, h: 44 }, { minH: 32 })
  ],
  L03: [E('再試鈕 ≥ 44 高', '[data-k=retry]', { minH: 44 }, { minH: 32 })],
  L04: [
    E('下一個卡 458–514／y 204–252', '[data-m=L04]', { y: 458, h: 56 }, { y: 204, h: 48 }),
    E('材料條 110×4', '[data-m=L04] .mbar', { w: 110, h: 4 }, { w: 110, h: 4 })
  ],
  L05: [E('星 46×44／48×44', '[data-k=star-1]', { w: 46, h: 44 }, { w: 48, h: 44 })],
  L06: [
    E('列 52／40', '[data-m=L06] .lrow', { minH: 52 }, { minH: 40 }),
    E('「去」44×44', '[data-k^=go-]', { w: 44, h: 44 }, { minW: 32, minH: 32 })
  ],
  L08: [E('鎖住列', '[data-m=L08]', { minH: 44 }, { minH: 32 })],
  M01: [
    E('卡 179×60／202×64', '.mcard', { w: 179, h: 60 }, { w: 202, h: 64 }),
    E('回營地 366×44', '[data-k=tocamp]', { w: 366, h: 44 }, { minH: 32 })
  ],
  M02: [E('提示點 8×8', '.mcard .dot', { w: 8, h: 8 }, { w: 8, h: 8 })],
  M04: [
    E('確認卡 400 寬（桌機）', '[data-m=M04]', { w: 374 }, { w: 400 }),
    E('主鈕最下 48', '[data-k=camp-yes]', { h: 48 }, { h: 48 })
  ],
  T01: [
    E('段落鈕 71×44／72×36', '[data-m=T01] button', { w: 71, h: 44 }, { w: 72, h: 36 }),
    E('全版 47–710', '[data-panel=set]', { y: 47, h: 663 }, { x: 844 })
  ],
  T02: [E('分段高 48／44', '[data-k=alert-rare]', { h: 48 }, { h: 44 })],
  T03: [E('分段 48／44', '[data-k=fs-100]', { h: 48 }, { h: 44 })],
  T04: [E('分段 48／44', '[data-k=rms-sys]', { h: 48 }, { h: 44 })],
  T05: [E('滑桿 44／36 高', '[data-k=sfx]', { h: 44 }, { h: 36 })],
  T06: [E('按鍵列 32（桌機）', '.krow', null, { h: 32 })],
  T07: [
    E('登出鈕', '[data-k=logout]', { minH: 44 }, { minH: 32 }),
    E('取消 110 寬在右', '[data-k=logout-no]', { w: 110 }, { w: 110 })
  ],
  G01: [
    E('保底列 378–406／y 124–180', '[data-m=G01]', { y: 378, h: 28 }, { y: 124, h: 56 }),
    E('條 190×8', '[data-m=G01] .pbar', { w: 190, h: 8 }, { w: 190, h: 8 })
  ],
  G03: [
    E('篩選 76×44', '[data-k=lf-all]', { w: 76, h: 44 }, { w: 76, h: 36 }),
    E('列 44／36', '.grow2', { minH: 44 }, { minH: 36 }),
    E('列內圖示 16', '.grow2 svg', { w: 16, h: 16 }, { w: 16, h: 16 })
  ],
  B01: [
    E('分段 90×44', '[data-k=gt-鐵]', { w: 90, h: 44 }, { minH: 36 }),
    E('列 60／44', '[data-m=B01]', { minH: 60 }, { minH: 44 }),
    E('換 1 60×44／56×32', '[data-k=g1-1]', { w: 60, h: 44 }, { w: 56, h: 32 }),
    E('全部 86×44／80×32', '[data-k=ga-1]', { w: 86, h: 44 }, { w: 80, h: 32 })
  ],
  B04: [E('指到商會', '[data-k=to-guild]', { minH: 44 }, { minH: 32 })],
  B05: [
    E('分段 74×44', '[data-k=bt-酆都]', { w: 74, h: 44 }, { minH: 36 }),
    E('格 70×62／76×60', '.cell', { w: 70, h: 62 }, { w: 76, h: 60 })
  ],
  B06: [
    E('殿卡 82／84', '.hall', { minH: 82 }, { minH: 84 }),
    E('鈕 102×44', '.hall .btn', { w: 102, h: 44 }, { w: 102, minH: 32 })
  ],
  B07: [
    E('列 52＋勾選 44', '.frow', { minH: 52 }, { minH: 52 }),
    E('勾選熱區 44×44', '.frow label', { w: 44, h: 44 }, { w: 44, h: 44 })
  ],
  B08: [
    E('確認 358×260／400', '[data-m=B08]', { w: 358, h: 260 }, { w: 400, h: 260 }),
    E('長按進殿 208×56', '[data-k=hall-yes]', { w: 208, h: 56 }, { w: 208, h: 56 }),
    E('取消 110×56', '[data-k=hall-no]', { w: 110, h: 56 }, { w: 110, h: 56 })
  ],
  P01: [
    E('確認 320–566／400 寬', '[data-m=P01]', { y: 320, h: 246 }, { w: 400 }),
    E('上取消 44', '[data-m=P01] [data-k=dlg-no]', { h: 44 }, { minH: 32 }),
    E('下去試招場 48', '[data-k=prac-yes]', { h: 48 }, { h: 48 })
  ],
  P02: [
    E('DPS 卡 87–259／16–316×76–312', '[data-m=P02]', { y: 87, h: 172 }, { x: 16, y: 76, w: 300, h: 236 }),
    E('重置 72×40', '[data-k=pr-reset]', { w: 72, h: 40 }, { w: 72, h: 40 }),
    E('離開 78×40', '[data-k=pr-leave]', { w: 78, h: 40 }, { w: 78, h: 40 })
  ],
  P03: [
    E('DPS 卡 87–259', '[data-m=P03c]', { y: 87, h: 172 }, { x: 16, y: 76, w: 300, h: 236 }),
    E('比例條 138×8', '.rbar', { w: 138, h: 8 }, { w: 138, h: 8 })
  ],
  P05: [E('Lv −／＋ 44×44／32×32', '[data-k=lv-dn]', { w: 44, h: 44 }, { w: 32, h: 32 })],
  P06: [E('掛機條 710–754／x 16–396', '[data-m=P06]', { y: 710, h: 44 }, { x: 16, w: 380 })],
  O02: [
    E(
      '字幕 40–350×180–230／390–890×140–196',
      '[data-m=O02]',
      { x: 40, y: 180, w: 310, h: 50 },
      { x: 390, y: 140, w: 500, h: 56 }
    )
  ],
  O03: [E('聲音鈕 132×44／1100–1264×664–704', '[data-m=O03]', { w: 132, h: 44 }, { x: 1100, y: 664, w: 164, h: 40 })],
  O04: [
    E(
      '目標卡 8–382×560–700／16–396×560–656',
      '[data-m=O04]',
      { x: 8, y: 560, w: 374, h: 140 },
      { x: 16, y: 560, w: 380, h: 96 }
    ),
    E('條 280×8', '.gbar', { w: 280, h: 8 }, { w: 280, h: 8 })
  ],
  O05: [
    E(
      '解鎖卡 8–382×87–159／16–396×76–156',
      '[data-m=O05]:not(.hide)',
      { x: 8, y: 87, w: 374, h: 72 },
      { x: 16, y: 76, w: 380, h: 80 }
    )
  ],
  O08: [E('收下 48', '[data-k=off-ok]', { h: 48 }, { h: 48 })],
  X01: [E('貨幣列熱區 ≥ 44', '[data-m=X01]', { minH: 40 }, { minH: 44 })],
  X04: [
    E('天賦樹滿版', '[data-m=X04]', { x: 0, y: 0, w: 390, h: 844 }, { x: 0, y: 0, w: 1280, h: 720 }),
    E('返回鈕', '[data-k=tree-back]', { minW: 44, minH: 44 }, { minW: 32, minH: 32 })
  ],
  X05: [
    E('‹ 44×44', '[data-k=camp-list]', { w: 44, h: 44 }, { w: 44, h: 44 }),
    E('× 關整個營地', '[data-k=camp-x]', { w: 44, h: 44 }, { minW: 36 })
  ]
};
/* 每列的額外條件（頁面裡跑，回 [說明, 過不過, 值]） */
const COND = {
  L03: `const e=q('[data-m=L02] .warnt');return [['第二行 --warn',!!e&&getComputedStyle(e).color===tc('--warn'),e&&e.textContent],['右鈕「再試」',/再試/.test(txt('[data-k=retry]')),txt('[data-k=retry]')]]`,
  L05: `return [['只畫開了的星',qa('[data-k^=star-]').length===demo.S&&qa('[data-k^=star-]').length<=5||qa('[data-k^=star-]').length===F().maxStar,qa('[data-k^=star-]').length],['寫「王倒下後換成」',/王倒下後換成/.test(document.getElementById('ui').textContent),'']]`,
  L06: `const on=q('.lrow.on');return [['正在刷 --sel',!!on&&getComputedStyle(on).backgroundColor===tc('--sel'),''],['正在刷字樣',!!on&&/正在刷/.test(on.textContent),''],['最好／差不多',/最好/.test(txt('[data-m=L06]'))&&/差不多/.test(txt('[data-m=L06]')),''],['「印」小標',qa('.tg.seal').length>0,qa('.tg.seal').length]]`,
  L07: `const d=qa('.mrow.d3');return [['危險度 3 --bad＋記號',d.length>0&&d.every(e=>getComputedStyle(e).color===tc('--bad')&&e.querySelector('svg')&&/3/.test(e.textContent)),d.length]]`,
  L08: `const e=q('[data-m=L08]');return [['--panel-inset',getComputedStyle(e).backgroundColor===tc('--panel-inset'),''],['條件 13',parseFloat(getComputedStyle(e.querySelector('.cond')).fontSize)===13,getComputedStyle(e.querySelector('.cond')).fontSize],['鎖 16',e.querySelector('svg').getBoundingClientRect().width===16,'']]`,
  M03: `const c=qa('.mcard');return [['卡數 < 8',c.length<8,c.length],['不留空格洞',c.every((e,i)=>i===0||Math.abs(e.offsetTop-c[i-1].offsetTop)<=72),'']]`,
  M04: `const b=qa('[data-m=M04] .btn');return [['主鈕最下',b[b.length-1].dataset.k==='camp-yes',''],['「戰鬥暫停、回來補算」',/戰鬥暫停、回來補算/.test(txt('[data-m=M04]')),'']]`,
  T02: `return [['預設稀有以上',q('[data-k=alert-rare]').getAttribute('aria-pressed')==='true',''],['選中 --sel／--sel-ink',getComputedStyle(q('[data-k=alert-rare]')).backgroundColor===tc('--sel'),'']]`,
  T06: `return demo.geo().port?[['直立寫手勢',qa('[data-m=T06] .grow').length>=5,qa('[data-m=T06] .grow').length]]:(()=>{const r=qa('.krow');const ok=r.length===demo.KEYS.length&&r.every((e,i)=>e.querySelector('kbd').textContent===demo.KEYS[i][0]&&e.textContent.includes(demo.KEYS[i][1]));return [['按鍵表＝程式 KEYS（100%）',ok,r.length+'／'+demo.KEYS.length],['鍵帽字 ≥ 12',r.every(e=>parseFloat(getComputedStyle(e.querySelector('kbd')).fontSize)>=12),'']]})()`,
  T07: `const b=q('[data-k=logout]');return [['危險鈕 --bad 框＋圖示',getComputedStyle(b).borderTopColor===tc('--bad')&&!!b.querySelector('svg'),''],['訪客警告句',/訪客存檔只在這台裝置，登出後可能找不回來/.test(txt('[data-m=T07]')),'']]`,
  G01: `return [['條 --rar-chase',getComputedStyle(q('.pbar i')).backgroundColor===tc('--rar-chase'),''],['其他保底收起',/其他保底 3 項/.test(txt('[data-m=G01b]')),'']]`,
  G02: `return [['不累積保底一行',/怪物 Lv 45 以上的地點才會累積/.test(txt('[data-m=G02]')),'']]`,
  G03: `const c=q('.grow2.chase');return [['追逐列左緣 3 px',!!c&&getComputedStyle(c).borderLeftWidth==='3px'&&getComputedStyle(c).borderLeftColor===tc('--rar-chase'),''],['◆ 稀有',/◆/.test(txt('[data-m=G03]')),''],['◈ 傳奇',/◈/.test(txt('[data-m=G03]')),''],['★ 破裂裝備',/★ 破裂裝備/.test(txt('[data-m=G03]')),''],['「記憶」文字標',qa('.memt').length>0,'']]`,
  G04: `const e=q('.grow2.pick');return [['選中 2 px --border-cap',!!e&&getComputedStyle(e).outlineWidth==='2px'&&getComputedStyle(e).outlineColor===tc('--border-cap'),'']]`,
  G05: `const c=q('[data-m=G05]');return [['比較排最上',c.firstElementChild.classList.contains('cmp'),''],['▲▼ 記號',/▲/.test(c.textContent)&&/▼/.test(c.textContent),''],['數字完整',!/\\d[KMBT]\\b/.test(c.textContent),'']]`,
  G06: `return [['空狀態一行 --tx-dim',getComputedStyle(q('[data-m=G06]')).color===tc('--tx-dim'),''],['標待定',/待定/.test(txt('[data-m=G06]')),'']]`,
  B01: `const r=q('[data-m=B01]');return [['完整數字「有 23・可換 4 次」',/有 23・可換 4 次/.test(r.textContent),r.textContent.trim().slice(0,40)],['鈕間距 ≥ 8',q('[data-k=ga-1]').getBoundingClientRect().left-q('[data-k=g1-1]').getBoundingClientRect().right>=8,'']]`,
  B02: `const r=q('[data-m=B02]');return [['副行「有 3」右「不夠」',/有 3/.test(r.textContent)&&/不夠/.test(r.textContent),''],['不畫鈕',!r.querySelector('button'),'']]`,
  B03: `const r=q('[data-m=B03]');return [['--panel-inset＋鎖',getComputedStyle(r).backgroundColor===tc('--panel-inset')&&!!r.querySelector('svg'),''],['說明',/瞭望台開到更深的地點才能換玄鐵/.test(r.textContent),'']]`,
  B05: `const z=q('.cell.zero');return [['0 張 --panel-inset＋--tx-off',!z||getComputedStyle(z).backgroundColor===tc('--panel-inset'),z?'有':'本系沒有 0 張'],['「n／5」',qa('.cell').every(e=>/\\d／5/.test(e.textContent)),'']]`,
  B06: `return [['夠了外框 2 px --border-hi',qa('.hall.ok').every(e=>getComputedStyle(e).borderTopWidth==='2px'&&getComputedStyle(e).borderTopColor===tc('--border-hi')),qa('.hall.ok').length],['不夠＝「還差 n 張」停用',qa('.hall .offb').every(e=>e.disabled&&/還差/.test(e.textContent)),qa('.hall .offb').length],['難度「—」',/難度 —/.test(txt('[data-m=B06]')),'']]`,
  B08: `return [['開卡焦點在取消',document.activeElement&&document.activeElement.dataset.k==='hall-no',document.activeElement&&document.activeElement.dataset.k],['--bad 不退回（未驗）',getComputedStyle(q('[data-m=B08] .badt')).color===tc('--bad'),'']]`,
  B09: `return [['沒拿過的系不畫',!q('[data-tab="兵家"]'),'']]`,
  P01: `return [['--warn 暫停句',getComputedStyle(q('[data-m=P01] .warn')).color===tc('--warn'),''],['不長按',!q('[data-m=P01] [data-hold]'),'']]`,
  P02: `const a=q('[data-k=pr-reset]').getBoundingClientRect(),b=q('[data-k=pr-leave]').getBoundingClientRect();return [['重置／離開隔 20',Math.round(b.left-a.right)===20,Math.round(b.left-a.right)],['「打稻草人就開始算」13',parseFloat(getComputedStyle(q('[data-m=P02] .lab')).fontSize)===13,'']]`,
  P03: `const b=q('.dps .big'),c=getComputedStyle(b);return [['主數字 24／700 等寬',c.fontSize==='24px'&&c.fontWeight==='700'&&/Mono|mono/.test(c.fontFamily),c.fontSize],['從第一下起 15／700',getComputedStyle(q('.dps .mid')).fontSize==='15px',''],['完整數字',!/\\d[KMBT]\\b/.test(txt('[data-m=P03]')),'']]`,
  P04: `return [['換之前「—」、▲▼ 位置',/換之前 —/.test(txt('[data-m=P04]'))&&/▲▼/.test(txt('[data-m=P04]')),''],['字 14',getComputedStyle(q('[data-m=P04]')).fontSize==='14px','']]`,
  P05: `return [['到頂 --tx-off',getComputedStyle(q('[data-k=lv-up]')).color===tc('--tx-off'),'']]`,
  P06: `return [['「試招中・戰鬥暫停，回戰場補算」',/試招中・戰鬥暫停，回戰場補算/.test(txt('[data-m=P06]')),txt('[data-m=P06]')]]`,
  P07: `return [['「試招期間 +N」',/試招期間/.test(txt('[data-m=P07]')),txt('[data-m=P07]')]]`,
  O01: `return [['0 點擊開刷（已打到）',demo.S.hits>0,demo.S.hits]]`,
  O02: `const c=getComputedStyle(q('[data-m=O02]'));return [['16／700 --tx-strong（桌機 18）',(c.fontSize==='16px'||c.fontSize==='18px')&&c.fontWeight==='700'&&c.color===tc('--tx-strong'),c.fontSize]]`,
  O04: `return [['「鍛造台 Lv1・靈魂 120／400」',/鍛造台 Lv1・靈魂 120／400/.test(txt('[data-m=O04]')),'']]`,
  O05: `const e=q('[data-m=O05]:not(.hide) span'),lh=parseFloat(getComputedStyle(e).lineHeight);return [['≤ 2 行',e.getBoundingClientRect().height<=lh*2+1,Math.round(e.getBoundingClientRect().height/lh)+' 行'],['14／700',getComputedStyle(e).fontSize==='14px','']]`,
  O06: `return [['營地分頁提示點',!!q('[data-k=tab-camp] .dot'),''],['一行',/營地可以升級了/.test(txt('[data-m=O06]')),'']]`,
  O07: `return [['「離開 4 分・靈魂 +1,167」',/離開 4 分・靈魂 \\+1,167/.test(txt('[data-m=O07]')),txt('[data-m=O07]')]]`,
  O08: `return [['完整數字＋千分位',/\\+29,192/.test(txt('[data-m=O08]'))&&!/\\d[KMBT]\\b/.test(txt('[data-m=O08]')),''],['同一下一個目標',/瞭望台 Lv16/.test(txt('[data-m=O08]')),''],['主鈕最下',q('[data-m=O08]').lastElementChild.dataset.k==='off-ok','']]`,
  X01: `const b=q('[data-m=X01]');return [['只放金幣、靈魂',b.querySelectorAll('.ci').length===2,''],['清單完整數字',qa('[data-m=X01b] [data-num=full]').length===8&&!/\\d[KMBT]\\b/.test(txt('[data-m=X01b]')),''],['12,345,678,901 完整',/12,345,678,901/.test(txt('[data-m=X01b]')),'']]`,
  X02: `return qa('.flask .ring').map((r,i)=>{const c=tc(i?'--mp-hi':'--hp-hi'),p=tc('--panel');return ['藥劑 '+(i+1)+' 充能環對 --panel ≥ 3:1',cr(c,p)>=3,cr(c,p).toFixed(2)]})`,
  X03: `return [['縮寫可看完整（title／data-full）',qa('.nb').every(e=>e.title&&e.dataset.full),qa('.nb').length]]`,
  X04: `return [['戰場露出 0 px',(()=>{const r=q('[data-m=X04]').getBoundingClientRect(),u=document.getElementById('ui').getBoundingClientRect();return Math.abs(r.width-u.width)<1&&Math.abs(r.height-u.height)<1})(),'']]`,
  X05: `return [['‹ 回清單，× 關整個營地',!!q('[data-k=camp-list]')&&!!q('[data-k=camp-x]'),'']]`,
  X07: `return [['畫面標「待素材」',/待素材/.test(txt('.tags')),txt('.tags')]]`
};

/* ---------- 頁面裡的量測：通用預篩（PF1–PF14、PF-K、PF-W、PF-R） ---------- */
function measure(rowId, geo, cond) {
  const ui = document.getElementById('ui'),
    U = ui.getBoundingClientRect(),
    s = U.width / ui.offsetWidth;
  const port = demo.geo().port;
  const q = x => ui.querySelector(x),
    qa = x => [...ui.querySelectorAll(x)],
    txt = x => (q(x) ? q(x).textContent : '');
  const rect = e => {
    const r = e.getBoundingClientRect();
    return { x: (r.x - U.x) / s, y: (r.y - U.y) / s, w: r.width / s, h: r.height / s };
  };
  const cs = getComputedStyle(document.documentElement);
  const probe = document.createElement('i');
  document.body.appendChild(probe);
  const tc = t => ((probe.style.color = cs.getPropertyValue(t).trim()), getComputedStyle(probe).color);
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = c => {
    const [r, g, b] = rgb(c)
      .map(v => v / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const cr = (a, b) => {
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const F = () => demo.S && FIX.saves[demo.P.save];
  const vis = e => {
    if (!e.getClientRects().length) return false;
    for (let a = e; a && a !== ui; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
    }
    const sc = e.parentElement && e.parentElement.closest('.bd');
    if (sc) {
      const a = e.getBoundingClientRect(),
        b = sc.getBoundingClientRect();
      if (a.bottom <= b.top + 1 || a.top >= b.bottom - 1) return false;
    }
    return true;
  };
  const name = e => e.dataset.m || e.dataset.k || e.className.toString().split(' ')[0] || e.tagName;
  const R = [],
    INFO = [],
    ok = (c, m) => R.push([c ? 1 : 0, m]);
  const W = ui.offsetWidth,
    H = ui.offsetHeight;
  /* PF2 狀態條件 */
  ok(demo.ok() === 1, 'PF2 狀態條件成立');
  /* 出框 */
  for (const e of qa('[data-m], [data-k], [data-hud]')) {
    if (!vis(e) || e.closest('.bd')) continue;
    const r = rect(e);
    if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5)
      ok(0, `出框 ${name(e)} ${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}×${r.h.toFixed(0)}`);
  }
  /* PF12 截斷：省略號只准砍名字（.ell），其餘裁字＝不過 */
  let cut = 0;
  for (const e of qa('[data-role], .btn, .seg button')) {
    if (!vis(e) || !e.textContent.trim()) continue;
    const c = getComputedStyle(e);
    const over = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2;
    if (!over) continue;
    if (e.closest('.ell') || c.textOverflow === 'ellipsis')
      INFO.push(`省略號 ${name(e)}「${e.textContent.trim().slice(0, 20)}」`);
    else if (c.overflow !== 'visible' || c.whiteSpace === 'nowrap')
      cut++, ok(0, `PF12 裁字 ${name(e)}「${e.textContent.trim().slice(0, 24)}」`);
  }
  /* 省略號砍到數字（Lv、數量要完整） */
  for (const e of qa('.ell'))
    if (
      vis(e) &&
      e.scrollWidth > e.clientWidth + 1 &&
      /\d[\d,.]*\s*$/.test(e.textContent) &&
      !/[★◆◈]/.test(e.textContent.slice(-1))
    )
      INFO.push(`省略號尾端是數字 ${name(e)}「${e.textContent.slice(-12)}」`);
  /* PF13 重疊：HUD 兩兩交集；面板蓋到 HUD */
  const hud = qa('[data-hud]')
    .filter(vis)
    .map(e => [e, rect(e)]);
  let ovl = 0;
  for (let i = 0; i < hud.length; i++)
    for (let j = i + 1; j < hud.length; j++) {
      const [a, A] = hud[i],
        [b, B] = hud[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x),
        iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ix > 0.5 && iy > 0.5) ovl++, ok(0, `PF13 重疊 ${name(a)}×${name(b)} ${ix.toFixed(0)}×${iy.toFixed(0)}`);
    }
  for (const p of qa('[data-panel]').filter(vis)) {
    const P = rect(p);
    for (const [a, A] of hud) {
      const ix = Math.min(A.x + A.w, P.x + P.w) - Math.max(A.x, P.x),
        iy = Math.min(A.y + A.h, P.y + P.h) - Math.max(A.y, P.y);
      if (ix > 0.5 && iy > 0.5 && !p.contains(a))
        ovl++, ok(0, `PF13 面板蓋到 ${name(a)} ${ix.toFixed(0)}×${iy.toFixed(0)}`);
    }
  }
  /* PF11 字級：標籤 ≥ 12（直立）；正文 ≥ 14；地點條件與 DPS 小標 13 是清單指定 */
  let small = 0;
  for (const e of qa('[data-role]')) {
    if (!vis(e) || !e.textContent.trim()) continue;
    const r = e.dataset.role,
      f = parseFloat(getComputedStyle(e).fontSize);
    const lim = r === 'label' || r === 'num' ? 12 : 14;
    const spec13 = e.classList.contains('cond') || e.classList.contains('lab');
    if (f + 0.01 < (spec13 ? 13 : lim)) small++, ok(0, `PF11 字級 ${name(e)} ${f}px < ${spec13 ? 13 : lim}`);
  }
  /* PF10 熱區：elementFromPoint 4 px 格點；直立 ≥ 44、桌機 ≥ 32 */
  const minHit = port ? 44 : 32,
    seen = new Set();
  let hits = 0;
  for (const e of qa('[data-hit]')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect(),
      sc = e.parentElement && e.parentElement.closest('.bd');
    if (sc) {
      const b = sc.getBoundingClientRect();
      if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) continue;
    }
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9;
    for (let y = r.y - 8; y <= r.bottom + 8; y += 2 * s)
      for (let x = r.x - 8; x <= r.right + 8; x += 4 * s) {
        const h = document.elementFromPoint(x, y);
        if (h && (h === e || e.contains(h)))
          (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
      }
    if (x1 < x0) continue;
    hits++;
    const w = (x1 - x0) / s + 4,
      h = (y1 - y0) / s + 2,
      key = e.dataset.hit + ':' + Math.round(w) + '×' + Math.round(h);
    if ((w < minHit - 0.5 || h < minHit - 0.5) && !seen.has(key))
      seen.add(key), ok(0, `PF10 熱區 ${name(e)} ${Math.round(w)}×${Math.round(h)} < ${minHit}`);
  }
  /* PF14 捲動層 ≤ 2 */
  const scl = qa('*').filter(
    e => vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1
  );
  const depth = Math.max(0, ...scl.map(e => scl.filter(x => x.contains(e)).length));
  ok(depth <= 2, `PF14 捲動層 ${depth}（≤ 2）`);
  /* 對比：字色對最近的不透明底（≥ 4.5）；記錄介面字色種類 */
  const bgOf = e => {
    for (let a = e; a; a = a.parentElement) {
      const c = getComputedStyle(a).backgroundColor,
        v = rgb(c);
      if (v.length === 3 || (v.length === 4 && v[3] >= 0.8)) return c;
    }
    return tc('--scene-void');
  };
  const low = new Set(),
    inks = new Set();
  for (const e of qa('[data-role]')) {
    if (!vis(e) || !e.textContent.trim()) continue;
    const c = getComputedStyle(e).color,
      b = bgOf(e),
      v = cr(c, b);
    if (!e.closest('.r-normal,.r-rare,.r-leg,.r-chase,.up,.dn,.warnt,.warn,.badt,.d3,.cg,.cs,.stars-t,.ph'))
      inks.add(c);
    if (v < 4.5 && !low.has(c + b)) low.add(c + b), ok(0, `對比 ${name(e)} ${v.toFixed(2)} < 4.5`);
  }
  INFO.push(`介面字色 ${inks.size} 種`);
  /* PF5 圖示整數倍 */
  for (const e of qa('svg[data-ico]')) {
    if (!vis(e)) continue;
    const w = e.getBoundingClientRect().width / s;
    if (Math.abs(w - 16) > 0.01 && Math.abs(w - 32) > 0.01) ok(0, `PF5 圖示 ${w}px 不是 16／32`);
  }
  /* PF-K 數字縮寫位置：完整位置不准有 K／M；縮寫位置的數字照 abbr、≤ 5 字元 */
  const KM = /\d(?:\.\d+)?[KMBT](?![a-z])|\d\.\d\de\d+/;
  let kf = 0,
    ka = 0;
  for (const e of qa('[data-num=full]'))
    if (vis(e))
      (kf++, KM.test(e.textContent) && ok(0, `PF-K 完整位置出現縮寫「${e.textContent}」`)),
        /\d{5,}/.test(e.textContent) && ok(0, `PF-K 完整位置沒千分位「${e.textContent}」`);
  for (const e of qa('[data-num=abbr]')) {
    if (!vis(e)) continue;
    ka++;
    for (const m of e.textContent.match(/[\d.,]+[KMBT]?(e\d+)?/g) || [])
      if (m.replace(/[^\d.,KMBTe]/g, '').length > 7 || (m.length > 5 && !/e/.test(m) && /\d{2},\d{3}/.test(m)))
        ok(0, `PF-K 縮寫位置太長／沒縮「${m}」`);
    if (
      e.classList.contains('nb') &&
      e.textContent !==
        demo.abbr(+e.dataset.full.replace(/,/g, ''), /cost/.test(e.dataset.mode || '') ? 'cost' : 'own') &&
      e.textContent !== demo.abbr(+e.dataset.full.replace(/,/g, ''), 'cost')
    )
      ok(0, `PF-K 縮寫不對 ${e.textContent}／${e.dataset.full}`);
    if (e.classList.contains('nb') && !e.title) ok(0, `PF-K 縮寫沒有完整數字 ${e.textContent}`);
  }
  /* 確認卡、說明卡、統計、設定、商會換法列、離線結算：所有字裡不准有縮寫 */
  for (const sel of [
    '[data-m=M04]',
    '[data-m=B08]',
    '[data-m=P01]',
    '[data-m=G05]',
    '[data-m=P03]',
    '[data-m=O08]',
    '[data-m=X01b]',
    '[data-panel=set]',
    '[data-m=B01]',
    '[data-m=B02]'
  ])
    for (const e of qa(sel)) if (vis(e) && KM.test(e.textContent)) ok(0, `PF-K 完整位置 ${sel} 出現縮寫`);
  /* PF-W 禁用字 */
  const all = qa('*')
    .filter(e => vis(e) && e.children.length === 0)
    .map(e => e.textContent)
    .join('\n');
  for (const w of ['再刷一輪', '必出', '稀有掉落', '令牌', '精英', '輪'])
    if (all.includes(w)) ok(0, `PF-W 禁用字「${w}」`);
  const logT = qa('[data-panel=log], .feed')
    .map(e => e.textContent)
    .join('');
  if (logT.includes('魔法')) ok(0, 'PF-W 掉落區「魔法」');
  /* 各列量測 */
  const G = [];
  for (const g of geo || []) {
    const ex = port ? g.p : g.k;
    if (!ex) continue;
    const els = qa(g.sel).filter(vis);
    if (!els.length) {
      ok(0, `量測 ${g.d}：找不到 ${g.sel}`);
      G.push({ d: g.d, ok: 0, v: '找不到' });
      continue;
    }
    const r = rect(els[0]);
    let good = 1;
    const v = `${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}×${r.h.toFixed(0)}`;
    for (const k of ['x', 'y', 'w', 'h']) if (ex[k] != null && Math.abs(r[k] - ex[k]) > 2) good = 0;
    if (ex.minW && r.w < ex.minW - 0.5) good = 0;
    if (ex.minH && r.h < ex.minH - 0.5) good = 0;
    G.push({ d: g.d, ok: good, v, n: els.length });
    ok(good, `量測 ${g.d}：${v}`);
  }
  for (const c of cond
    ? new Function('q', 'qa', 'txt', 'tc', 'cr', 'F', 'demo', cond)(q, qa, txt, tc, cr, F, demo)
    : []) {
    ok(c[1], `條件 ${c[0]}${c[2] !== '' && c[2] != null ? '：' + c[2] : ''}`);
    G.push({ d: c[0], ok: c[1] ? 1 : 0, v: String(c[2]) });
  }
  probe.remove();
  return { R, INFO, G, stat: { cut, ovl, small, hits, kf, ka, inks: inks.size } };
}

/* ---------- 對焦框（PF-F）：Tab／方向鍵，量 outline 四邊是否被裁 ---------- */
function focusCheck() {
  const ui = document.getElementById('ui');
  const e = document.activeElement;
  if (!e || !ui.contains(e)) return { ok: 0, v: '沒有焦點' };
  const c = getComputedStyle(e),
    w = parseFloat(c.outlineWidth),
    off = parseFloat(c.outlineOffset);
  const r = e.getBoundingClientRect(),
    o = off + w;
  const R = { l: r.left - o, t: r.top - o, r: r.right + o, b: r.bottom + o };
  for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflow !== 'visible' || s.overflowY !== 'visible') {
      const b = a.getBoundingClientRect();
      if (R.l < b.left - 0.5 || R.t < b.top - 0.5 || R.r > b.right + 0.5 || R.b > b.bottom + 0.5)
        return { ok: 0, v: `${e.dataset.k} 外框被 ${a.id || a.className} 裁掉`, k: e.dataset.k };
    }
  }
  return {
    ok: w >= 2 && c.outlineStyle !== 'none' ? 1 : 0,
    v: `${e.dataset.k} outline ${w}px offset ${off}px`,
    k: e.dataset.k
  };
}

/* ---------- PF1 檔案檢查（python：寬高、不透明、L* 標準差、雜湊） ---------- */
function fileCheck(files, dpr) {
  const out = execFileSync(
    'python3',
    [
      '-c',
      `import json,sys,hashlib
from PIL import Image
import numpy as np
r=[]
for f,w,h in json.loads(sys.argv[1]):
  a=Image.open(f); m=a.mode; x=np.asarray(a.convert('RGBA')).astype(float)
  op=bool((x[...,3]==255).all()); g=x[...,:3]/255
  g=np.where(g<=0.04045,g/12.92,((g+0.055)/1.055)**2.4); Y=g@[0.2126,0.7152,0.0722]
  L=np.where(Y>0.008856,116*np.cbrt(Y)-16,903.3*Y)
  r.append([f,a.width==w and a.height==h,op,float(L.std()),hashlib.md5(open(f,'rb').read()).hexdigest()])
print(json.dumps(r))`,
      JSON.stringify(files)
    ],
    { maxBuffer: 1 << 26 }
  );
  return JSON.parse(out.toString());
}

/* ---------- PF-L：場景四角 32×32 地面 vs --panel；PF3 舒服 (b)(c)(d)(f) ---------- */
function comfort(files) {
  const out = execFileSync(
    'python3',
    [
      '-c',
      `import json,sys
from PIL import Image
import numpy as np
def lab(a):
  g=a/255; g=np.where(g<=0.04045,g/12.92,((g+0.055)/1.055)**2.4)
  X=g@[0.4124,0.3576,0.1805]/0.95047; Y=g@[0.2126,0.7152,0.0722]; Z=g@[0.0193,0.1192,0.9505]/1.08883
  f=lambda t: np.where(t>0.008856,np.cbrt(t),7.787*t+16/116)
  L=116*f(Y)-16; A=500*(f(X)-f(Y)); B=200*(f(Y)-f(Z)); return L,A,B,Y
r=[]
for f in json.loads(sys.argv[1]):
  a=np.asarray(Image.open(f).convert('RGB')).astype(float); L,A,B,Y=lab(a)
  C=np.hypot(A,B); H=(np.degrees(np.arctan2(B,A))+360)%360
  r.append([f,float((C>40).mean()),float(((L>25)&(L<55)&(H>30)&(H<90)&(C>8)).mean()),float((L>80).mean())])
print(json.dumps(r))`,
      JSON.stringify(files)
    ],
    { maxBuffer: 1 << 26 }
  );
  return JSON.parse(out.toString());
}
function cornerLum(file, panelRect, s) {
  const out = execFileSync('python3', [
    '-c',
    `import json,sys
from PIL import Image
import numpy as np
f,p,s=json.loads(sys.argv[1])
a=np.asarray(Image.open(f).convert('RGB')).astype(float)/255
a=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4); Y=a@[0.2126,0.7152,0.0722]
h,w=Y.shape; c=32*s
cs=[Y[:c,:c].mean(),Y[:c,w-c:].mean(),Y[h-c:,:c].mean(),Y[h-c:,w-c:].mean()]
x,y,pw,ph=[int(v*s) for v in p]; pv=Y[y+60*s:y+ph-8*s, x+8*s:x+pw-8*s]
print(json.dumps([cs,float(np.median(pv))]))`,
    JSON.stringify([file, panelRect, s])
  ]);
  return JSON.parse(out.toString());
}

/* ---------- 錄影：逐幀推虛擬時鐘、截圖、ffmpeg ---------- */
const VDUR = { V1: 3300, V2: 3100, V3: 4500, V4: 3100, V5: 2500, V6: 2700, V7: 5300, V8: 60600, V9: 11600, V10: 5300 };
async function record(b, V, size, rm) {
  const [w, h] = size.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${URL}?bare=1&cap=1&size=${size}${rm ? '&rm=1' : ''}`);
  await p.evaluate(V => demo.startScn(V), V);
  const dir = path.join(TMP, `${V}_${size}_${rm ? 'rm' : 'n'}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.ceil(VDUR[V] / (1000 / 60)),
    PR = [];
  for (let i = 0; i < n; i++) {
    PR.push(await p.evaluate(() => JSON.parse(JSON.stringify(demo.step(1)))));
    await p.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 70 });
  }
  const L = await p.evaluate(() => demo.LOG.slice());
  await p.close();
  const vd = path.join(OUT, 'videos');
  fs.mkdirSync(vd, { recursive: true });
  const mp4 = path.join(vd, `${V}_${size}_${rm ? 'rm' : '一般'}.mp4`);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '60',
    '-i',
    path.join(dir, '%05d.jpg'),
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v',
    'libx264',
    '-crf',
    '30',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    mp4
  ]);
  return { PR, L, errs, dir, mp4: path.relative(OUT, mp4) };
}
const FR = 1000 / 60,
  near = (a, b, tol = FR + 0.5) => a != null && Math.abs(a - b) <= tol;
const first = (P, f, from = -1e9) => {
  const x = P.find(p => p.t >= from && f(p));
  return x ? x.t : null;
};
/* 時間量測（±1 幀） */
function timing(V, P, L, rm) {
  const R = [],
    ok = (c, m) => R.push([c ? 1 : 0, m]),
    ev = (e, i = 0) => (L.filter(x => x.ev === e)[i] || {}).t,
    f0 = x => (x == null ? '—' : x.toFixed(0));
  if (V === 'V1') {
    const s = ev('star');
    const r1 = first(P, p => p.roll >= 1, s);
    if (rm)
      ok(
        P.every(p => p.roll == null),
        '減少動態：星級條數不滾字'
      );
    else ok(near(r1 - s, 200), `星級條數滾字 ${f0(r1 - s)} ms（200）`);
    const sh = ev('shake'),
      moved = P.filter(p => p.t > sh && p.t <= sh + 120 && Math.abs(p.shake || 0) > 0.1),
      still = first(P, p => (p.shake || 0) === 0, sh + 1);
    if (rm) ok(moved.length === 0, '減少動態：鎖住不抖（只亮框 120）');
    else ok(moved.length > 0 && near(still - sh, 120), `鎖住抖 2 px：${f0(still - sh)} ms（120）`);
    const go = ev('go'),
      cl = ev('closed'),
      sw = ev('loc-switched');
    ok(near(cl - go, 160), `「去」：面板關 ${f0(cl - go)} ms（V2 定案 160；V1 原寫 200）`);
    if (rm)
      ok(
        sw != null && sw - go <= FR + 0.5 && P.filter(p => p.t > go).every(p => p.fade === 0),
        '減少動態：換地點直接切'
      );
    else {
      const fe = first(P, p => p.fade === 0, sw + 1);
      ok(near(sw - go, 150) && near(fe - go, 300), `戰場淡出 ${f0(sw - go)}＋淡入 ${f0(fe - sw)} ms（300）`);
    }
  }
  if (V === 'V2') {
    for (let i = 0; i < 3; i++) {
      const c = ev('close', i),
        d = ev('closed', i);
      const p = P.filter(x => x.t > c && x.t < d);
      if (rm)
        ok(
          d - c <= 150 + FR + 0.5 && p.every(x => !x.panel || x.panel.k === 1),
          `減少動態：抽屜 ${i + 1} 淡出 ${f0(d - c)} ms（≤ 150，不滑）`
        );
      else
        ok(
          near(d - c, 160) && p.some(x => x.panel && x.panel.k < 1 && x.panel.k > 0),
          `抽屜 ${i + 1} 滑出 ${f0(d - c)} ms（160）`
        );
      const cam = first(P, x => Math.abs(x.cam) < 0.5, c);
      ok(near(cam - c, rm ? 0 : 160, rm ? FR + 0.5 : FR + 0.5), `鏡頭回 ${f0(cam - c)} ms（${rm ? '直接' : '160'}）`);
    }
  }
  if (V === 'V3') {
    const a = ev('fs'),
      b = ev('fs-apply');
    if (rm) ok(a == null && b != null, '減少動態：字級直接換，不交叉淡換');
    else ok(near(b - a, 200), `字級交叉淡換 ${f0(b - a)} ms（200）`);
    const rmOn = ev('rm');
    ok(rmOn != null, '減少動態切換那一下不播（seg 直接換色）');
    const hs = L.filter(x => x.ev === 'hold-start').map(x => x.t),
      hr = ev('hold-release'),
      hd = ev('hold-done');
    const back = first(P, p => p.hold === 0 || p.hold == null, hr + 1);
    ok(back != null && back - hr <= 150 + FR + 0.5, `早放開退回 ${f0(back - hr)} ms（≤ 150）`);
    ok(near(hd - hs[1], 600), `長按登出 ${f0(hd - hs[1])} ms（600）`);
  }
  if (V === 'V4') {
    const o = ev('log-pick');
    const k1 = first(P, p => p.panel && (rm ? p.panel.op >= 1 : p.panel.k >= 1), o);
    if (rm)
      ok(
        k1 != null && k1 - o <= 150 + FR + 0.5 && P.filter(p => p.t > o && p.panel).every(p => p.panel.k === 1),
        `減少動態：只淡入 ${f0(k1 - o)} ms`
      );
    else ok(near(k1 - o, 240), `面板滑入 ${f0(k1 - o)} ms（240）`);
    const pe = first(P, p => p.pick === 0, o + 1);
    ok(near(pe - o, 2000), `框亮 ${f0(pe - o)} ms（2,000，不閃）`);
  }
  if (V === 'V5') {
    const tr = L.filter(x => x.ev === 'trade').map(x => x.t);
    for (const [i, d] of [
      [0, 200],
      [1, 300]
    ]) {
      const e = first(P, p => p.roll5 && p.roll5.x >= 1, tr[i]);
      if (rm) ok(!P.some(p => p.roll5 && p.roll5.x < 1), `減少動態：第 ${i + 1} 次數字直接換（沒有滾動中的幀）`);
      else ok(near(e - tr[i], d), `數字滾 ${f0(e - tr[i])} ms（${d}）`);
    }
    ok(
      L.some(x => x.ev === 'toast' && /^百煉鋼 \+\d+$/.test(x.txt)),
      `吐司「${L.filter(x => x.ev === 'toast')
        .map(x => x.txt)
        .join('」「')}」（清單例「熟鐵 +4」同格式）`
    );
  }
  if (V === 'V6') {
    const hs = L.filter(x => x.ev === 'hold-start').map(x => x.t),
      hr = ev('hold-release'),
      hd = ev('hold-done'),
      hin = ev('hall-in');
    const back = first(P, p => p.hold === 0 || p.hold == null, hr + 1);
    ok(back - hr <= 150 + FR + 0.5, `早放開＝取消，退回 ${f0(back - hr)} ms`);
    ok(near(hd - hs[1], 600), `長按 ${f0(hd - hs[1])} ms（600）`);
    const fl = rm ? hd : first(P, p => p.fly >= 1, hd);
    if (!rm) ok(near(fl - hd, 300), `碎片飛 ${f0(fl - hd)} ms（300）`);
    const fe = first(P, p => p.fade === 0 && p.t > hin, hin);
    if (rm)
      ok(
        hin != null && hin - hd <= FR + 0.5 && P.every(p => p.fly == null && !p.fade),
        `減少動態：碎片不飛、不淡出淡入（${f0(hin - hd)} ms 進殿）`
      );
    else
      ok(
        near(hin - fl, 120, FR * 1.5) && near(fe - hin, 160, FR * 1.5),
        `淡出 ${f0(hin - fl)}＋淡入 ${f0(fe - hin)} ms（120／160）`
      );
  }
  if (V === 'V7') {
    const g = ev('prac-go'),
      i = ev('prac-in'),
      lv = ev('prac-leave'),
      o = ev('prac-out');
    if (rm) ok(near(i - g, 0) && near(o - lv, 0), '減少動態：淡入淡出直接換');
    else {
      const fi = first(P, p => p.fade === 0, i + 1);
      ok(near(i - g, 120) && near(fi - i, 160), `進場 --scene-void 淡出 ${f0(i - g)}＋淡入 ${f0(fi - i)}（120／160）`);
    }
    const g1 = first(P, p => p.gain === 1, o),
      g2 = first(P, p => p.gain < 1, g1),
      g3 = first(P, p => p.gain === 0, g2);
    ok(
      near(g2 - g1, 3000, FR * 1.5) && near(g3 - g2, 300, FR * 1.5),
      `「試招期間 +N」停 ${f0(g2 - g1)}＋淡出 ${f0(g3 - g2)}（3,000／300）`
    );
  }
  if (V === 'V8') {
    const fh = L.find(x => x.ev === 'first-hit');
    ok(fh && fh.at <= 5000, `頁面讀起到第一下打擊 ${fh ? fh.at.toFixed(0) : '—'} ms（≤ 5,000，0 點擊）`);
    const t0 = P[0].t - FR,
      I = P.map(p => Object.assign({ t: p.t - t0 }, p.intro));
    const s1 = first(I, p => p.sub > 0),
      s2 = first(I, p => p.sub >= 1),
      s3 = first(I, p => p.sub < 1, s2),
      s4 = first(I, p => p.sub === 0, s3);
    ok(
      near(s2 - s1, 300, FR * 1.5) && near(s3 - s2, 1900, FR * 1.5) && near(s4 - s3, 300, FR * 1.5),
      `字幕 ${f0(s2 - s1)}／${f0(s3 - s2)}／${f0(s4 - s3)} ms（300／1,900／300）`
    );
    for (let k = 0; k < 3; k++) {
      const a = first(I, p => p.unl[k] > 0),
        b = first(I, p => p.unl[k] >= 1),
        c = first(I, p => p.unl[k] < 1, b),
        d = first(I, p => p.unl[k] === 0, c);
      if (rm) ok(b - a <= FR + 0.5 && near(c - b, 6000, FR * 2), `減少動態：解鎖卡 ${k + 1} 直接出現，停 ${f0(c - b)}`);
      else
        ok(
          near(b - a, 240, FR * 1.5) && near(c - b, 6000, FR * 1.5) && near(d - c, 300, FR * 1.5),
          `解鎖卡 ${k + 1}：${f0(b - a)}／${f0(c - b)}／${f0(d - c)} ms（240／6,000／300）`
        );
      if (k) {
        const pd = first(
          I,
          p => p.unl[k - 1] === 0,
          first(I, p => p.unl[k - 1] >= 1)
        );
        ok(near(a - pd, 1200, FR * 2), `排隊間隔 ${f0(a - pd)} ms（1,200，不蓋掉）`);
      }
    }
    const snd = first(I, p => p.snd === 44 || (p.snd > 0 && p.snd <= 44));
    ok(near(snd, 6000, FR * 2), `聲音鈕 ${f0(snd)} ms 收成 44×44（6 秒）`);
  }
  if (V === 'V9') {
    const r = L.filter(x => x.ev === 'reopen');
    const short = P.filter(p => p.t >= r[0].t && p.t < r[1].t);
    ok(
      short.every(p => p.away == null && p.off == null),
      '< 60 秒：無提示'
    );
    const a1 = first(P, p => p.away < 1, r[1].t),
      a0 = first(P, p => p.away === 0, a1);
    ok(
      near(a1 - r[1].t, 6000, FR * 1.5) && near(a0 - a1, 300, FR * 2),
      `4 分那一行 ${f0(a1 - r[1].t)}＋${f0(a0 - a1)} ms（6,000）`
    );
    const o1 = first(P, p => p.off >= 1, r[2].t);
    ok(
      rm ? o1 - r[2].t <= FR + 0.5 : near(o1 - r[2].t, 1200, FR * 1.5),
      `離線結算數字 ${f0(o1 - r[2].t)} ms（${rm ? '直接' : '1,200'}）`
    );
    const sk = ev('off-skip'),
      o2 = first(P, p => p.off >= 1, sk);
    ok(o2 != null && o2 - sk <= FR + 0.5, `點一下跳完 ${f0(o2 - sk)} ms`);
  }
  if (V === 'V10') {
    const o = ev('tree-open'),
      c = ev('tree-close'),
      d = ev('tree-closed');
    const a1 = first(P, p => p.tree >= 1, o);
    ok(rm ? a1 - o <= FR + 0.5 : near(a1 - o, 200), `天賦樹開 ${f0(a1 - o)} ms（${rm ? '直接' : 200}）`);
    ok(rm ? d - c <= FR + 0.5 : near(d - c, 160), `關 ${f0(d - c)} ms（${rm ? '直接' : 160}）`);
    const bt = P.filter(p => p.t > o && p.t <= c).map(p => p.bt);
    ok(
      bt.length && Math.max(...bt) - Math.min(...bt) < 0.01,
      `戰鬥停在開的那一幀（bt ${bt.length ? bt[0].toFixed(0) : '—'} 不動）`
    );
    const g = first(P, p => p.gain === 1, d);
    ok(g != null, `回來補算一行出現（${f0(g - d)} ms）`);
  }
  return R;
}
/* 關鍵幀：每支影片挑事件時間點存 png */
function keyFrames(V, P, L) {
  const pick = [];
  const at = (lab, t) => {
    const i = P.findIndex(p => p.t >= t);
    if (i >= 0) pick.push([lab, i]);
  };
  for (const e of L)
    if (/act|hold-|fade|tree-|reopen|first-hit|toast|log-pick|trade|hall-in|prac-|closed|loc-switched/.test(e.ev))
      at(e.ev + (e.k ? '-' + e.k : ''), e.t + FR);
  if (V === 'V8')
    for (const t of [600, 900, 2800, 3200, 4200, 6000, 8240, 14000, 18000, 32000, 45000]) at('t' + t, P[0].t - FR + t);
  return pick.slice(0, 40);
}

/* ---------- 截圖清單 ---------- */
const TOG = { 地點: 'L01', 更多: 'M01', 設定: 'T02', 掉落紀錄: 'G03', '商會＋寶盒': 'B01', 試招場: 'P03', 開場: 'O05' };
const EXTRA_SIZES = {
  '390x664': ['L01', 'M01', 'T02', 'G03', 'B06', 'P03', 'O04', 'O08'],
  '1280x800': ['L01', 'M01', 'T06', 'G03', 'B06', 'P03', 'O04', 'X04']
};

async function shots(b) {
  const res = { rows: {}, toggles: {}, extra: {}, focus: {}, files: [], errs: [] };
  for (const size of SIZES) {
    const [w, h] = size.split('x').map(Number);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => res.errs.push(`${size} ${e.message}`));
    await p.goto(`${URL}?bare=1&cap=1&size=${size}`);
    const dir = path.join(OUT, 'shots', size);
    fs.mkdirSync(dir, { recursive: true });
    const rows = await p.evaluate(() => demo.ROWS.map(r => [r.id, r.sec, r.name, r.save]));
    for (const [id, sec, nmv, sv] of rows) {
      await p.evaluate(id => (demo.setRow(id), demo.step(20)), id);
      if (id === 'X03') await p.evaluate(() => demo.step(1));
      const file = path.join(dir, id + '.png');
      await p.evaluate(() => demo.step(1));
      const m = await p.evaluate(
        ([id, g, c, fn]) => new Function('return ' + fn)()(id, g, c),
        [id, GEO[id] || [], COND[id] || '', measure.toString()]
      );
      await p.screenshot({ path: file });
      res.rows[id] = res.rows[id] || { id, sec, name: nmv, save: sv };
      res.rows[id][size] = Object.assign({ file: path.relative(OUT, file) }, m);
      res.files.push([file, w, h]);
      console.log(
        `${m.R.some(r => !r[0]) ? '❌' : '✅'} ${size} ${id} ${m.R.filter(r => !r[0])
          .map(r => r[1])
          .join('；')}`
      );
    }
    /* X03 縮寫看完整：滑鼠停 300 ms／點一下 */
    await p.evaluate(() => (demo.setRow('X01'), demo.step(20)));
    const nb = await p.$('.nb');
    if (nb) {
      await nb.hover();
      await p.evaluate(() => demo.step(20));
      const tip = await p.evaluate(() => demo.probe().tip || '');
      await p.screenshot({ path: path.join(dir, 'X03_hover.png') });
      res.rows.X03[size].R.push([/,/.test(tip) ? 1 : 0, `滑鼠停 300 ms 看完整「${tip}」`]);
      await p.mouse.move(0, 0);
      await p.evaluate(() => demo.step(2));
      await nb.click();
      await p.evaluate(() => demo.step(2));
      const tip2 = await p.evaluate(() => demo.probe().tip || '');
      res.rows.X03[size].R.push([/,/.test(tip2) ? 1 : 0, `點一下看完整「${tip2}」`]);
    }
    /* PF-L：場景四角 vs 面板（戰場＝L01、營地＝X05） */
    for (const [lab, row] of [
      ['戰場', 'L01'],
      ['營地', 'X05']
    ]) {
      await p.evaluate(row => (demo.setRow(row), demo.step(20)), row);
      const pr = await p.evaluate(() => {
        const e = document.querySelector('[data-panel]');
        return [e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight];
      });
      await p.evaluate(() => (document.getElementById('ui').style.visibility = 'hidden'));
      const sf = path.join(dir, `PFL_${lab}_場景.png`);
      await p.screenshot({ path: sf });
      await p.evaluate(() => (document.getElementById('ui').style.visibility = ''));
      const pf = path.join(dir, row + '.png');
      const [cs] = cornerLum(sf, pr, 1);
      const [, pv] = cornerLum(pf, pr, 1);
      const worst = Math.max(...cs);
      const ratio = (pv + 0.05) / (worst + 0.05);
      res.pfl = res.pfl || [];
      res.pfl.push({
        size,
        lab,
        ratio,
        corners: cs.map(v => +v.toFixed(5)),
        panel: +pv.toFixed(5),
        file: path.relative(OUT, sf)
      });
      console.log(`${ratio >= 1.4 ? '✅' : '❌'} PF-L ${size} ${lab} ${ratio.toFixed(2)}`);
    }
    /* PF-F 焦點：Tab 換分頁、方向鍵走面板內，量四邊 */
    const fdir = path.join(OUT, 'focus', size);
    fs.mkdirSync(fdir, { recursive: true });
    res.focus[size] = [];
    for (const [lab, row, keys] of [
      ['設定・Tab 換分頁', 'T02', ['Tab']],
      ['設定・Shift+Tab', 'T02', ['Shift+Tab']],
      ['地點・↓ 走清單', 'L01', ['ArrowDown', 'ArrowDown', 'ArrowDown']],
      ['掉落紀錄・Tab＋↓', 'G03', ['Tab', 'ArrowDown', 'ArrowDown']],
      ['商會・Tab＋↓', 'B01', ['Tab', 'Tab', 'Tab', 'Tab', 'ArrowDown']],
      ['寶盒・↓', 'B06', ['ArrowDown', 'ArrowDown']],
      ['更多・↓', 'M01', ['ArrowDown', 'ArrowDown']],
      ['進殿確認・開卡焦點', 'B08', []]
    ]) {
      await p.evaluate(row => (demo.setRow(row), demo.step(20)), row);
      if (row !== 'B08') await p.focus('[data-panel] [data-k=px]').catch(() => 0);
      const k0 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.k);
      for (const k of keys) await p.keyboard.press(k), await p.evaluate(() => demo.step(1));
      if (row === 'B08') await p.evaluate(() => (document.activeElement.classList.add('fv'), (demo.S.kbd = 1)));
      await p.evaluate(() => demo.step(2));
      const fc = await p.evaluate(new Function('return ' + focusCheck.toString())());
      const moved = keys.length === 0 || fc.k !== k0;
      const f = path.join(fdir, lab.replace(/[・＋+ ]/g, '_') + '.png');
      await p.screenshot({ path: f });
      res.focus[size].push({
        lab,
        ok: fc.ok && moved ? 1 : 0,
        v: fc.v + (moved ? '' : '（焦點沒動）'),
        file: path.relative(OUT, f)
      });
      console.log(`${fc.ok && moved ? '✅' : '❌'} PF-F ${size} ${lab} ${fc.v}`);
    }
    /* 三個切換 */
    const tdir = path.join(OUT, 'toggles', size);
    fs.mkdirSync(tdir, { recursive: true });
    for (const [scr, row] of Object.entries(TOG))
      for (const t of ['fs', 'en', 'rm']) {
        await p.evaluate(([row, t]) => (demo.setRow(row, { [t]: true }), demo.step(20)), [row, t]);
        const m = await p.evaluate(([id, fn]) => new Function('return ' + fn)()(id, [], ''), [row, measure.toString()]);
        const f = path.join(tdir, `${scr}_${t}.png`);
        await p.screenshot({ path: f });
        res.toggles[`${size} ${scr} ${t}`] = {
          file: path.relative(OUT, f),
          R: m.R.filter(r => !/^PF-K|^量測|^條件/.test(r[1])),
          INFO: m.INFO
        };
        res.files.push([f, w, h]);
        const bad = m.R.filter(r => !r[0] && /裁字|重疊|蓋到|字級|出框|PF2/.test(r[1]));
        console.log(`${bad.length ? '❌' : '✅'} 切換 ${size} ${scr} ${t} ${bad.map(r => r[1]).join('；')}`);
      }
    await p.close();
  }
  /* 另驗尺寸 */
  for (const [size, rows] of Object.entries(EXTRA_SIZES)) {
    const [w, h] = size.split('x').map(Number);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => res.errs.push(`${size} ${e.message}`));
    await p.goto(`${URL}?bare=1&cap=1&size=${size}`);
    const dir = path.join(OUT, 'extra', size);
    fs.mkdirSync(dir, { recursive: true });
    for (const id of rows) {
      await p.evaluate(id => (demo.setRow(id), demo.step(20)), id);
      const m = await p.evaluate(([id, fn]) => new Function('return ' + fn)()(id, [], ''), [id, measure.toString()]);
      const f = path.join(dir, id + '.png');
      await p.screenshot({ path: f });
      const bad = m.R.filter(r => !r[0] && /裁字|重疊|蓋到|出框|PF2|熱區|PF14/.test(r[1]));
      res.extra[`${size} ${id}`] = { file: path.relative(OUT, f), bad: bad.map(r => r[1]) };
      res.files.push([f, w, h]);
      console.log(`${bad.length ? '❌' : '✅'} 另驗 ${size} ${id} ${bad.map(r => r[1]).join('；')}`);
    }
    await p.close();
  }
  /* PF1 檔案 */
  res.pf1 = fileCheck(res.files, 1).map(([f, wh, op, sd, md5]) => ({ f: path.relative(OUT, f), wh, op, sd, md5 }));
  /* PF3 舒服 (c)(d)(f)（閒置截圖） */
  res.pf3 = comfort(res.files.filter(([f]) => /shots/.test(f)).map(([f]) => f)).map(([f, c, d, l]) => ({
    f: path.relative(OUT, f),
    c,
    d,
    l
  }));
  return res;
}

/* ---------- PF16：D3 選擇器色碼字面值 0（tokens.css 是唯一放色值的檔） ---------- */
function pf16() {
  const dir = path.join(__dirname, '..', 'demo', 'd3'),
    R = [];
  const LIT =
    /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d|(?<![.\w-])(?:black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|silver|gold|navy|teal|maroon|olive|lime|aqua|fuchsia|transparent)\b(?=\s*[;,)'"])/g;
  for (const f of fs.readdirSync(dir).filter(f => /\.(css|js|html)$/.test(f) && f !== 'tokens.css')) {
    const src = fs
      .readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    for (const m of src.match(LIT) || []) R.push(`${f}：${m}`);
  }
  /* 每個 var(--x) 都要在 tokens.css 或 demo.css :root 有定義（token 解析） */
  const tok =
    fs.readFileSync(path.join(dir, 'tokens.css'), 'utf8') +
    fs.readFileSync(path.join(dir, 'demo.css'), 'utf8').split('\n* {')[0];
  const def = new Set((tok.match(/--[\w-]+(?=\s*:)/g) || []).map(s => s));
  const used = new Set();
  for (const f of ['demo.css', 'demo.js'])
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').match(/var\((--[\w-]+)/g) || []) used.add(m.slice(4));
  const undef = [...used].filter(u => !def.has(u));
  /* tokens.css 的值要跟 M2-36 規格表一致 */
  const spec = fs.readFileSync(path.join(__dirname, '..', 'docs/production/specs/M2-36-palette-tokens.md'), 'utf8');
  const mism = [];
  for (const [, k, v] of tok.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/g)) {
    if (/hp-hi|mp-hi/.test(k)) continue;
    const row = spec.split('\n').find(
      l =>
        l.startsWith('| --') &&
        l
          .split('|')[1]
          .split('／')
          .some(c => c.trim().replace(/-rgb$/, '') === k)
    );
    if (!row) continue;
    const vals = row.split('|')[2].match(/#[0-9a-f]{6}/gi) || [],
      cells = row
        .split('|')[1]
        .split('／')
        .map(c => c.trim());
    const want = vals[Math.min(cells.indexOf(k), vals.length - 1)];
    if (want && want.toLowerCase() !== v) mism.push(`${k} ${v}≠${want}`);
  }
  return { lit: R, undef, mism, used: used.size };
}

/* ---------- 報告 ---------- */
function report(res, vids) {
  const L = [],
    PF = [];
  let bad = 0;
  const mark = c => (c ? '✅' : '❌');
  L.push('# D3 展示頁驗收結果（results.md）', '');
  L.push(
    `產生：tools/d3_demo.js，本機 http://localhost:8000/demo/d3/；${new Date().toISOString().slice(0, 16)}。截圖 1 倍（給腳本量的），尺寸 390×844 與 1280×720，另驗 390×664、1280×800（×1.25）。`,
    ''
  );
  L.push(
    '**全部佔位**：假資料在 `demo/d3/fixtures.js`（等 F01–F26）；主視覺底圖「待素材」；圖示「暫用」（程式畫的 16 px SVG，1 倍）；掉落紀錄空狀態句「待定」；殿／碎片／地圖詞／心魔劫減益／解鎖句部分名稱「佔位」；按鍵表「待對照」e5f18530。',
    ''
  );
  L.push(
    '| # | 區 | 畫面 × 狀態 | 存檔 | 390×844 | 1280×720 | 量測（直立｜桌機） | 錄影 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  );
  const VID = {
    L04: 'V1',
    L05: 'V1',
    L08: 'V1',
    L01: 'V2',
    M01: 'V2',
    G03: 'V2',
    T03: 'V3',
    T04: 'V3',
    T07: 'V3',
    G04: 'V4',
    B01: 'V5',
    B08: 'V6',
    P01: 'V7',
    P07: 'V7',
    O01: 'V8',
    O02: 'V8',
    O03: 'V8',
    O04: 'V8',
    O05: 'V8',
    O07: 'V9',
    O08: 'V9',
    X04: 'V10'
  };
  for (const r of Object.values(res.rows)) {
    const a = r['390x844'],
      b = r['1280x720'];
    const fa = a.R.filter(x => !x[0]),
      fb = b.R.filter(x => !x[0]);
    bad += fa.length + fb.length;
    const g = (m, i) => (m.G || []).map(x => `${x.ok ? '' : '❌'}${x.d}：${x.v}`).join('；') || '—';
    L.push(
      `| ${r.id} | ${r.sec} | ${r.name} | ${r.save} | ${mark(!fa.length)} [圖](${a.file})${fa.length ? '<br>' + fa.map(x => x[1]).join('<br>') : ''} | ${mark(!fb.length)} [圖](${b.file})${fb.length ? '<br>' + fb.map(x => x[1]).join('<br>') : ''} | ${g(a)}｜${g(b)} | ${VID[r.id] || '—'} |`
    );
  }
  L.push(
    '',
    '## 錄影（60 fps 逐幀，兩尺寸 × 一般／減少動態）',
    '',
    '| V | 尺寸 | 模式 | 結果 | 檔案 |',
    '| --- | --- | --- | --- | --- |'
  );
  for (const v of vids) {
    const f = v.R.filter(x => !x[0]);
    bad += f.length + v.errs.length;
    L.push(
      `| ${v.V} | ${v.size} | ${v.rm ? '減少動態' : '一般'} | ${v.R.map(x => (x[0] ? '✅ ' : '❌ ') + x[1]).join('<br>')}${v.errs.length ? '<br>❌ pageerror ' + v.errs.join('；') : ''} | [mp4](${v.mp4})・[關鍵幀](${v.frames}) |`
    );
  }
  L.push(
    '',
    '## 三個切換（文字 130%、英文 +40%、減少動態）',
    '',
    '| 尺寸 畫面 切換 | 結果 | 檔案 |',
    '| --- | --- | --- |'
  );
  for (const [k, t] of Object.entries(res.toggles)) {
    const f = t.R.filter(x => !x[0]);
    bad += f.length;
    L.push(`| ${k} | ${mark(!f.length)} ${f.map(x => x[1]).join('；')} | [圖](${t.file}) |`);
  }
  L.push('', '## 另驗尺寸', '', '| 尺寸 列 | 結果 | 檔案 |', '| --- | --- | --- |');
  for (const [k, t] of Object.entries(res.extra))
    (bad += t.bad.length), L.push(`| ${k} | ${mark(!t.bad.length)} ${t.bad.join('；')} | [圖](${t.file}) |`);
  fs.writeFileSync(path.join(OUT, 'results.md'), L.join('\n') + '\n');

  /* prefilter.md */
  const p16 = pf16();
  const pf1bad = res.pf1.filter(x => !x.wh || !x.op || x.sd < 2);
  const md5 = {};
  for (const x of res.pf1) (md5[x.md5] = md5[x.md5] || []).push(x.f);
  const dup = Object.values(md5).filter(v => v.length > 1);
  const rowsAll = Object.values(res.rows).flatMap(r => SIZES.map(s => r[s]));
  const sum = re => rowsAll.flatMap(m => m.R.filter(x => !x[0] && re.test(x[1])));
  const pfK = sum(/^PF-K/),
    pfW = sum(/^PF-W/),
    p10 = sum(/^PF10/),
    p11 = sum(/^PF11/),
    p12 = sum(/^PF12/),
    p13 = sum(/^PF13/),
    p14 = sum(/^PF14/),
    p5 = sum(/^PF5/),
    pc = sum(/^對比/),
    p2 = sum(/^PF2/),
    po = sum(/^出框/);
  const pfl = res.pfl || [],
    pflBad = pfl.filter(x => x.ratio < 1.4);
  const ring = rowsAll
    .filter(m => m.G && m.G.some(g => /充能環/.test(g.d)))
    .flatMap(m => m.G.filter(g => /充能環/.test(g.d)));
  const ringBad = ring.filter(g => !g.ok);
  const foc = Object.values(res.focus).flat(),
    focBad = foc.filter(x => !x.ok);
  const p3 = res.pf3,
    p3c = p3.filter(x => x.c > 0.1),
    p3d = p3.filter(x => x.d > 0.5),
    p3f = p3.filter(x => x.l > 0.25);
  const unit = [
    [9999, '9,999', '9,999'],
    [10000, '10.0K', '10.0K'],
    [10001, '10.0K', '10.1K'],
    [10099, '10.0K', '10.1K'],
    [12345, '12.3K', '12.4K'],
    [99999, '99.9K', '100K'],
    [100000, '100K', '100K'],
    [123456, '123K', '124K'],
    [999999, '999K', '1.00M'],
    [1e6, '1.00M', '1.00M'],
    [1000001, '1.00M', '1.01M'],
    [1234567, '1.23M', '1.24M'],
    [9999999, '9.99M', '10.0M'],
    [1234567890, '1.23B', '1.24B'],
    [1234567890123, '1.23T', '1.24T'],
    [999999999999999, '999T', '1.00e15'],
    [1234567890123456, '1.23e15', '1.24e15']
  ];
  const ub = unit.filter(([n, a, c]) => abbr(n, 'own') !== a || abbr(n, 'cost') !== c);
  const items = [
    [
      'PF1',
      '檔案：寬高＝視窗×DPR、不透明、L* 標準差 ≥ 2、雜湊不同、無 pageerror',
      !pf1bad.length && !dup.length && !res.errs.length,
      `${res.pf1.length} 張；不合 ${pf1bad.length}；雜湊重複 ${dup.length} 組${dup.length ? '（' + dup.map(d => d.join(' = ')).join('；') + '）' : ''}；pageerror ${res.errs.length}`
    ],
    ['PF2', '狀態條件成立（每列 ok()）', !p2.length, `${rowsAll.length - p2.length}／${rowsAll.length}`],
    [
      'PF3',
      '舒服 (c) 飽和 ≤ 10%、(d) 中明度褐 ≤ 50%、(f) 大片亮面 ≤ 25%（閒置截圖）',
      !p3c.length && !p3d.length && !p3f.length,
      `(c) 最高 ${(Math.max(...p3.map(x => x.c)) * 100).toFixed(1)}%；(d) 最高 ${(Math.max(...p3.map(x => x.d)) * 100).toFixed(1)}%；(f) 最高 ${(Math.max(...p3.map(x => x.l)) * 100).toFixed(1)}%；(a)(b) 見 PF-L；(e) 見對比`
    ],
    [
      'PF4',
      '新素材',
      true,
      'ℹ️ 主視覺兩張底圖待素材（畫面標「待素材」，清單寫「不算不過」）；沒有新美術素材、沒跑 PixelLab'
    ],
    ['PF5', '圖示整數倍、token、焦點框', !p5.length, `圖示全為 16 px（1 倍）；不合 ${p5.length}`],
    [
      'PF10',
      `熱區（直立 ≥ 44、桌機 ≥ 32）`,
      !p10.length,
      `不合 ${p10.length}${p10.length ? '：' + [...new Set(p10.map(x => x[1]))].slice(0, 8).join('；') : ''}`
    ],
    [
      'PF11',
      '字級（標籤 ≥ 12、正文 ≥ 14；清單指定 13 的兩處）',
      !p11.length,
      `不合 ${p11.length}${p11.length ? '：' + [...new Set(p11.map(x => x[1]))].slice(0, 8).join('；') : ''}`
    ],
    [
      'PF12',
      '截斷（省略號只砍名字）',
      !p12.length,
      `不合 ${p12.length}${p12.length ? '：' + [...new Set(p12.map(x => x[1]))].slice(0, 8).join('；') : ''}`
    ],
    [
      'PF13',
      '重疊（HUD 兩兩、面板蓋 HUD）',
      !p13.length && !po.length,
      `重疊 ${p13.length}、出框 ${po.length}${p13.length + po.length ? '：' + [...new Set([...p13, ...po].map(x => x[1]))].slice(0, 8).join('；') : ''}`
    ],
    ['PF14', '捲動層 ≤ 2', !p14.length, `不合 ${p14.length}`],
    [
      'PF16',
      'D3 選擇器色碼字面值 0；token 都有定義；tokens.css＝M2-36',
      !p16.lit.length && !p16.undef.length && !p16.mism.length,
      `字面值 ${p16.lit.length}${p16.lit.length ? '（' + p16.lit.slice(0, 6).join('、') + '）' : ''}；未定義 token ${p16.undef.length}${p16.undef.length ? '（' + p16.undef.join('、') + '）' : ''}；與 M2-36 不符 ${p16.mism.length}${p16.mism.length ? '（' + p16.mism.join('、') + '）' : ''}；用到 ${p16.used} 個 token`
    ],
    [
      'PF-K',
      '數字縮寫：abbr 測試表 17 列；完整位置 0 個 K／M；縮寫 ≤ 5 字元、可看完整',
      !ub.length && !pfK.length,
      `測試表 ${unit.length - ub.length}／${unit.length}；畫面不合 ${pfK.length}${pfK.length ? '：' + [...new Set(pfK.map(x => x[1]))].slice(0, 6).join('；') : ''}`
    ],
    ['PF-W', '禁用字：輪、再刷一輪、必出、稀有掉落、令牌、精英、魔法（掉落區）', !pfW.length, `${pfW.length} 筆`],
    [
      'PF-L',
      '面板 vs 場景地面亮度比（戰場、營地 4 角 32×32）≥ 1.4',
      !pflBad.length && pfl.length > 0,
      pfl.map(x => `${x.size} ${x.lab} ${x.ratio.toFixed(2)}`).join('；')
    ],
    [
      'PF-R',
      '藥劑充能環 vs --panel ≥ 3:1',
      !ringBad.length && ring.length > 0,
      [...new Set(ring.map(g => `${g.d} ${g.v}`))].join('；')
    ],
    [
      'PF-F',
      '焦點框四邊完整；Tab 換分頁、方向鍵走面板內',
      !focBad.length,
      `${foc.length - focBad.length}／${foc.length}${focBad.length ? '：' + focBad.map(x => x.lab + ' ' + x.v).join('；') : ''}`
    ],
    [
      '對比',
      '介面字對實際背後 ≥ 4.5',
      !pc.length,
      `不合 ${pc.length}${pc.length ? '：' + [...new Set(pc.map(x => x[1]))].slice(0, 6).join('；') : ''}`
    ]
  ];
  for (const it of items) if (!it[2]) bad++;
  const P2 = [
    '# D3 預篩（prefilter.md）',
    '',
    `tools/d3_demo.js 產生；${new Date().toISOString().slice(0, 16)}。預篩只抓明顯的失敗，門檻照 D3-checklist.md 第 11 節，不放寬。`,
    '',
    '| 代號 | 檢查 | 結果 | 量測 |',
    '| --- | --- | --- | --- |'
  ];
  for (const [k, d, c, v] of items) P2.push(`| ${k} | ${d} | ${mark(c)} | ${v} |`);
  P2.push('', '## PF-F 焦點（每張焦點圖）', '', '| 尺寸 | 動作 | 結果 | 檔案 |', '| --- | --- | --- | --- |');
  for (const [s, a] of Object.entries(res.focus))
    for (const x of a) P2.push(`| ${s} | ${x.lab} | ${mark(x.ok)} ${x.v} | [圖](${x.file}) |`);
  P2.push(
    '',
    '## PF-L 量測',
    '',
    '| 尺寸 | 場景 | 四角 Y | 面板 Y | 比 | 場景圖 |',
    '| --- | --- | --- | --- | --- | --- |'
  );
  for (const x of pfl)
    P2.push(
      `| ${x.size} | ${x.lab} | ${x.corners.join('／')} | ${x.panel} | ${x.ratio.toFixed(2)} | [圖](${x.file}) |`
    );
  const nRow = Object.keys(res.rows).length * SIZES.length,
    nOk = rowsAll.filter(m => !m.R.some(x => !x[0])).length;
  P2.push(
    '',
    `合計：列截圖 ${nOk}／${nRow} 全過；錄影 ${vids.filter(v => !v.R.some(x => !x[0]) && !v.errs.length).length}／${vids.length}；預篩 ${items.filter(i => i[2]).length}／${items.length}；❌ 總數 ${bad}。`
  );
  fs.writeFileSync(path.join(OUT, 'prefilter.md'), P2.join('\n') + '\n');
  return bad;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const RJ = path.join(OUT, 'results.json');
  let res = fs.existsSync(RJ) ? JSON.parse(fs.readFileSync(RJ, 'utf8')) : {};
  if (MODE === 'all' || MODE === 'shots') res.shots = await shots(b);
  const VS =
    MODE === 'all' || MODE === 'videos' ? Object.keys(VDUR) : /^V\d+(,V\d+)*$/.test(MODE) ? MODE.split(',') : [];
  res.vids = (res.vids || []).filter(v => !VS.includes(v.V));
  for (const V of VS)
    for (const size of SIZES)
      for (const rm of [0, 1]) {
        const r = await record(b, V, size, rm);
        const R = timing(V, r.PR, r.L, rm);
        const K = keyFrames(V, r.PR, r.L);
        const fd = path.join(OUT, 'frames', `${V}_${size}_${rm ? 'rm' : '一般'}`);
        fs.rmSync(fd, { recursive: true, force: true });
        fs.mkdirSync(fd, { recursive: true });
        for (const [lab, i] of K) {
          const t = Math.round(r.PR[i].t - r.PR[0].t + 1000 / 60);
          fs.copyFileSync(
            path.join(r.dir, String(i).padStart(5, '0') + '.jpg'),
            path.join(fd, `f${i + 1}_t${t}ms_${lab.replace(/[^\w一-龥-]/g, '')}.jpg`)
          );
        }
        fs.rmSync(r.dir, { recursive: true, force: true });
        res.vids.push({ V, size, rm, R, errs: r.errs, mp4: r.mp4, frames: path.relative(OUT, fd), n: r.PR.length });
        console.log(
          `${R.some(x => !x[0]) || r.errs.length ? '❌' : '✅'} ${V} ${size} ${rm ? 'rm' : '一般'} ${R.map(x => (x[0] ? '' : '❌') + x[1]).join('；')}`
        );
      }
  await b.close();
  fs.writeFileSync(
    RJ,
    JSON.stringify(res, (k, v) => (k === 'INFO' ? undefined : v), 1)
  );
  if (!res.shots) return console.log('沒有截圖結果，先跑 shots');
  const bad = report(res.shots, res.vids);
  console.log(bad ? `❌ ${bad} 項` : '✅ 全過');
  process.exitCode = bad ? 1 : 0;
})();
