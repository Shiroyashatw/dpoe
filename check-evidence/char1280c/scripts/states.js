// 六個狀態截圖＋圖例座標量測（同 check2 v1.js 的量法）；04a／04b 另拍單防禦樣本。用法：node states.js <url> <out> [w h]
const { open, fixture, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3], W = +process.argv[4] || 1280, H = +process.argv[5] || 720;
fs.mkdirSync(OUT, { recursive: true });
const cellsL = ['helm','chest','gloves','belt','boots'].map((k,i)=>[`格 ${k}`,`#pinv [data-c="eq:${k}"]`,[796,146+70*i,64,64]]);
const cellsR = ['weapon','off','amulet','ring1','ring2'].map((k,i)=>[`格 ${k}`,`#pinv [data-c="eq:${k}"]`,[1192,146+70*i,64,64]]);
const COMMON = [['A10 右欄','#pinv',[788,76,476,486]],['A11 關閉','#pinv .cclose',[1224,78,36,36]],['A12 標題列','#pinv .chd',[796,80,200,32]],['A13 經驗條','#pinv .cxp',[994,93,134,16]],['A14 抗性列','#pinv .cres',[796,122,460,22]],...cellsL,['A20 神格','#pinv .cq:not([data-c^="eq:"])',[796,496,64,64]],...cellsR,['A27 角色數值','#pinv .ctg',[868,148,150,36]],['A28 候選裝備','#pinv .ctg.r',[1022,148,150,36]]];
const cards = [...Array(9)].map((_,i)=>[`A${31+i} 卡`,`#pinv .cc:nth-of-type(${i+1})`,[868+106*(i%3),222+36*Math.floor(i/3),102,32],null,i]);
const STATS = [['A29 DPS','#pinv .cdps',[874,186,126,28]],['A30 編輯釘選','#pinv .cedit',[1056,186,96,36]],['A40 分組','#pinv .cg',[868,338,300,32]],['A41 子組','#pinv .cg.sub',[868,374,300,28]],['A42 數值列1','#pinv .cr',[868,406,300,22]],['A43 清單捲動軌','#pinv .csb.sl',[1178,338,4,200]]];
const POP = d => [['47 浮窗','#pinv .c12p',[796,76,460,d?486:448]],['48 ①','#pinv .c12p .l1',[796,98,460,68],13],['49 ②','#pinv .c12p .l2',[796,191,460,60],13],['50 ③','#pinv .c12p .l3',[796,276,460,d?106:94],13],['51 ④','#pinv .c12p .l4',[796,d?407:395,460,52],13],['52 ⑤','#pinv .c12p .l5',[796,d?484:472,460,44]],['52 鍵帽 Alt（圖面）','#pinv .c12p .l5 kbd',[1069,d?492:480,95,28]],['52 鍵帽 Y（圖面）','#pinv .c12p .l5 kbd + kbd',[1171,d?492:480,49,28]]];
const candCells = [...Array(12)].map((_,i)=>[`D${34+i} 候選${i+1}`,`#pinv .c12g .cq:nth-child(${i+1})`,[868+70*(i%4),254+70*Math.floor(i/4),64,64]]);
const CAND = [['D29 候選標題','#pinv .cnt',[868,188,200,18]],['D30 可以換的','#pinv .cns',[868,206,200,14]],['D31 收起','#pinv .cx2',[1148,186,28,28]],['D32 排序','#pinv .csort',[868,224,88,24]],['D33 篩選','#pinv .cflt',[962,224,152,24]],...candCells,['D46 候選捲動軌','#pinv .csb.sg',[1150,254,4,204]]];
const BOX = {
 '01-stats':[...COMMON,...STATS,...cards,['A44 名詞提示','#ctm',[516,110,260,56]]],
 '02-stats-menu':[...COMMON,...STATS.slice(0,4),...cards,['B41 長按中的列','#pinv .cr.on',[868,440,300,28]],['B42 長按選單','#pinv .cmenu',[900,360,210,168]]],
 '03-pin-edit':[...COMMON,['C29 已釘','#pinv .cdps',[874,186,170,36]],['C30 完成','#pinv .cdone',[1088,186,68,36]],...cards,...STATS.slice(2,4),['C42 數值列1','#pinv .cr',[868,406,300,28]],['C43 ☆','#pinv .cpin',[1130,406,28,28]]],
 '04a-cands-hover':[COMMON[0],...CAND,...POP(0)],
 '04b-cands-hover-alt':[COMMON[0],...CAND,...POP(1)],
 '04a-single-def':[COMMON[0],...CAND.slice(0,5),...POP(0)],
 '04b-single-def':[COMMON[0],...CAND.slice(0,5),...POP(1)],
 '07-empty':[...COMMON,['G29 空標題','#pinv .cet',[868,200,300,24]],['G30 還沒有','#pinv .cep',[868,228,300,36]],['G31 去鍛造','#pinv .cmk',[868,280,300,48]]]
};
(async () => {
  const p = await open(URL, { w: W, h: H });
  const R = {}, w = ms => p.waitForTimeout(ms);
  const shot = async n => {
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    R[n] = await p.evaluate(L => L.map(([id, q, sp, inner, idx]) => {
      let e = idx != null ? document.querySelectorAll('#pinv .cc')[idx] : document.querySelector(q);
      if (!e) return [id, sp, null];
      const r = e.getBoundingClientRect();
      return [id, sp, [r.x, r.y, r.width, r.height - (inner || 0)]];
    }), BOX[n]);
    // 跑版檢查：超出右欄／視窗、被 overflow 截掉的字
    R['_clip_' + n] = await p.evaluate(() => {
      const P = $('pinv'), pr = P.getBoundingClientRect(), out = [], cut = [];
      for (const e of P.querySelectorAll('*')) {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        if (!r.width || !r.height || s.visibility === 'hidden') continue;
        if ((r.left < pr.left - .5 || r.right > pr.right + .5 || r.top < pr.top - .5 || r.bottom > pr.bottom + .5) && !e.closest('[data-sb],.c12g,.csl,.cls') ) out.push([e.tagName + '.' + (e.className.baseVal ?? e.className), +r.left.toFixed(1), +r.top.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)]);
        if (s.overflow !== 'visible' && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1) cut.push([e.tagName + '.' + e.className, e.textContent.slice(0, 30), e.scrollWidth, e.clientWidth]);
      }
      return { pinv: [pr.x, pr.y, pr.width, pr.height], vw: [innerWidth, innerHeight], outside: out.slice(0, 30), nOutside: out.length, textCut: cut.slice(0, 30), nCut: cut.length };
    });
  };
  await p.keyboard.press('v'); await w(500);
  const rs = await p.$eval('#pinv .cres span', e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
  await p.mouse.move(rs[0] + 10, rs[1] + 8); await w(700);
  await shot('01-stats');
  await p.mouse.move(300, 300); await w(150);
  // 圖例 B41 的列在 y 440：長按第 2 列（實機 428）
  const rb = await (await p.$$('#pinv .cr'))[1].boundingBox();
  await p.mouse.move(rb.x + 40, rb.y + 10); await p.mouse.down(); await w(700); await p.mouse.up(); await w(200);
  await shot('02-stats-menu');
  await p.keyboard.press('Escape'); await w(150);
  await p.click('#pinv [data-c="edit"]'); await p.mouse.move(300, 300); await w(200);
  await shot('03-pin-edit');
  await p.click('#pinv [data-c="edit"]');
  await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  await p.hover('#pinv .c12g .cq:not(.nq)'); await w(200);
  await shot('04a-cands-hover');
  await p.keyboard.down('Alt'); await w(200);
  await shot('04b-cands-hover-alt');
  await p.keyboard.up('Alt'); await p.mouse.move(300, 300); await w(100);
  // 單防禦樣本
  const saved = await p.evaluate(() => JSON.stringify([S.inv.items, S.eq.helm]));
  const fx = await p.evaluate(fixture); await w(200);
  await p.hover(`#pinv [data-c="cand:${fx.A}"]`); await w(200);
  await shot('04a-single-def');
  await p.keyboard.down('Alt'); await w(200);
  await shot('04b-single-def');
  await p.keyboard.up('Alt'); await p.mouse.move(300, 300);
  await p.evaluate(() => { S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); S.eq.helm = null; changed(); hudPanels(); });
  await w(300);
  await shot('07-empty');
  R._errs = p._errs; R._size = [W, H];
  fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(R, null, 1));
  let md = `# 圖例座標量測 ${W}×${H}\n`;
  for (const n of Object.keys(BOX)) { md += `\n## ${n}\n| 圖例 | 規格 x,y w×h | 實機 | Δx,Δy,Δw,Δh | |\n|---|---|---|---|---|\n`;
    for (const [id, sp, ac] of R[n]) { if (!ac) { md += `| ${id} | ${sp} | — | — | ❌ |\n`; continue; }
      const d = ac.map((v, i) => +(v - sp[i]).toFixed(2)); md += `| ${id} | ${sp} | ${ac.map(v => +v.toFixed(2))} | ${d} | ${d.every(v => Math.abs(v) <= 1) ? '✅' : '❌'} |\n`; } }
  fs.writeFileSync(path.join(OUT, 'measure-boxes.md'), md);
  console.log(md.split('\n').filter(l => /❌|^## /.test(l)).join('\n')); console.log('errs', p._errs);
  for (const k of Object.keys(R).filter(k => k.startsWith('_clip_'))) console.log(k, 'outside', R[k].nOutside, 'cut', R[k].nCut, JSON.stringify(R[k].pinv));
  await p._b.close();
})();
