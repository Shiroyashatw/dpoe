// 階段 1：六個狀態截圖＋圖例座標量測（獨立於 char_check）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'http://localhost:8200/', OUT = process.argv[3] || 'ev/shots';
const setup = () => {
  proSkip(); S.story.tips = 0; S.lv = 49; S.asc = 'wind';
  for (const e of EQS) { if (e.k === 'ring3' || e.k === 'off') continue;
    const B = BASES.filter(b => b.k === e.t && b.lv <= 20); S.eq[e.k] = mkItem(B[B.length - 1].id, 20, 2); }
  const H = BASES.filter(b => b.k === 'helm');
  for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 8 + i * 4, [2, 1, 0][i % 3]));
  S.eq.chest.cor = 1; S.eq.chest.frac = S.eq.chest.a[0].k; S.eq.boots.cor = 1;
  S.eq.boots.cal = { g: { k: 'g_hp', v: 10 }, b: { k: 'b_resF', v: 20 } };
  S.eq.amulet.mem = rollMem(Object.keys(MEM)[0]); S.eq.weapon.wy = 'wangyin_guixu'; changed();
};
const cellsL = ['helm','chest','gloves','belt','boots'].map((k,i)=>[`格 ${k}`,`#pinv [data-c="eq:${k}"]`,[796,146+70*i,64,64]]);
const cellsR = ['weapon','off','amulet','ring1','ring2'].map((k,i)=>[`格 ${k}`,`#pinv [data-c="eq:${k}"]`,[1192,146+70*i,64,64]]);
const COMMON = [['A10 右欄','#pinv',[788,76,476,486]],['A11 關閉','#pinv .cclose',[1224,78,36,36]],['A12 標題列','#pinv .chd',[796,80,200,32]],['A13 經驗條','#pinv .cxp',[994,93,134,16]],['A14 抗性列','#pinv .cres',[796,122,460,22]],...cellsL,['A20 神格','#pinv .cq:not([data-c^="eq:"])',[796,496,64,64]],...cellsR,['A27 角色數值','#pinv .ctg',[868,148,150,36]],['A28 候選裝備','#pinv .ctg.r',[1022,148,150,36]]];
const cards = [...Array(9)].map((_,i)=>[`A${31+i} 卡`,`#pinv .cc:nth-of-type(${i+1})`,[868+106*(i%3),222+36*Math.floor(i/3),102,32],null,i]);
const STATS = [['A29 DPS','#pinv .cdps',[874,186,126,28]],['A30 編輯釘選','#pinv .cedit',[1056,186,96,36]],['A40 分組','#pinv .cg',[868,338,300,32]],['A41 子組','#pinv .cg.sub',[868,374,300,28]],['A42 數值列1','#pinv .cr',[868,406,300,22]],['A43 清單捲動軌','#pinv .csb.sl',[1178,338,4,200]]];
const POP = d => [['47 浮窗','#pinv .c12p',[796,76,460,d?486:448]],['48 ①','#pinv .c12p .l1',[796,98,460,68],13],['49 ②','#pinv .c12p .l2',[796,191,460,60],13],['50 ③','#pinv .c12p .l3',[796,276,460,d?106:94],13],['51 ④','#pinv .c12p .l4',[796,d?407:395,460,52],13],['52 ⑤','#pinv .c12p .l5',[796,d?484:472,460,44]]];
const candCells = [...Array(12)].map((_,i)=>[`D${34+i} 候選${i+1}`,`#pinv .c12g .cq:nth-child(${i+1})`,[868+70*(i%4),254+70*Math.floor(i/4),64,64]]);
const CAND = [['D29 候選標題','#pinv .cnt',[868,188,200,18]],['D30 可以換的','#pinv .cns',[868,206,200,14]],['D31 收起','#pinv .cx2',[1148,186,28,28]],['D32 排序','#pinv .csort',[868,224,88,24]],['D33 篩選','#pinv .cflt',[962,224,152,24]],...candCells,['D46 候選捲動軌','#pinv .csb.sg',[1150,254,4,204]]];
const BOX = {
 '01-stats':[...COMMON,...STATS,...cards,['A44 名詞提示','#ctm',[516,110,260,56]]],
 '02-stats-menu':[...COMMON,...STATS.slice(0,5),...cards,['B42 長按選單','#pinv .cmenu',[900,360,210,168]]],
 '03-pin-edit':[...COMMON,['C29 已釘','#pinv .cdps',[874,186,170,36]],['C30 完成','#pinv .cdone',[1088,186,68,36]],...cards,...STATS.slice(2,5),['C43 ☆','#pinv .cpin',[1130,406,28,28]]],
 '04a-cands-hover':[COMMON[0],...CAND,...POP(0)],
 '04b-cands-hover-alt':[COMMON[0],...CAND,...POP(1)],
 '07-empty':[...COMMON,['G29 空標題','#pinv .cet',[868,200,300,24]],['G30 還沒有','#pinv .cep',[868,228,300,36]],['G31 去鍛造','#pinv .cmk',[868,280,300,48]]]
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  await p.evaluate(() => document.fonts.ready);
  const R = {};
  const shot = async n => {
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    R[n] = await p.evaluate(L => L.map(([id, q, sp, inner, idx]) => {
      let e = idx != null ? document.querySelectorAll('#pinv .cc')[idx] : document.querySelector(q);
      if (!e) return [id, sp, null];
      const r = e.getBoundingClientRect();
      return [id, sp, [r.x, r.y, r.width, r.height - (inner || 0)]];
    }), BOX[n]);
  };
  await p.keyboard.press('v'); await p.waitForTimeout(500);
  const rs = await p.$eval('#pinv .cres span', e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
  await p.mouse.move(rs[0] + 10, rs[1] + 8); await p.waitForTimeout(700);
  await shot('01-stats');
  await p.mouse.move(300, 300); await p.waitForTimeout(150);
  const rb = await (await p.$('#pinv .cr')).boundingBox();
  await p.mouse.move(rb.x + 40, rb.y + 10); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  await shot('02-stats-menu');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await p.click('#pinv [data-c="edit"]'); await p.mouse.move(300, 300); await p.waitForTimeout(200);
  await shot('03-pin-edit');
  await p.click('#pinv [data-c="edit"]');
  await p.click('#pinv [data-c="eq:helm"]'); await p.waitForTimeout(200);
  // 懸停第一個可裝備候選
  await p.hover('#pinv .c12g .cq:not(.nq)'); await p.waitForTimeout(200);
  await shot('04a-cands-hover');
  await p.keyboard.down('Alt'); await p.waitForTimeout(200);
  await shot('04b-cands-hover-alt');
  await p.keyboard.up('Alt'); await p.mouse.move(300, 300);
  await p.evaluate(() => { S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); delete S.eq.helm; S.eq.helm = null; changed(); hudPanels(); });
  await p.waitForTimeout(300);
  await shot('07-empty');
  R._07 = await p.evaluate(() => ({ html: $('pinv').querySelector('[data-c="eq:helm"]').outerHTML, txt: [...$('pinv').querySelectorAll('.cet,.cep,.cmk')].map(e => e.textContent), pri: $('pinv').querySelectorAll('.btn.pri').length }));
  R._errs = errs;
  fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(R, null, 1));
  let md = '';
  for (const n of Object.keys(BOX)) { md += `\n## ${n}\n| 圖例 | 規格 x,y w×h | 實機 | Δx,Δy,Δw,Δh | |\n|---|---|---|---|---|\n`;
    for (const [id, sp, ac] of R[n]) { if (!ac) { md += `| ${id} | ${sp} | — | — | ❌ |\n`; continue; }
      const d = ac.map((v, i) => +(v - sp[i]).toFixed(2)); md += `| ${id} | ${sp} | ${ac.map(v => +v.toFixed(2))} | ${d} | ${d.every(v => Math.abs(v) <= 1) ? '✅' : '❌'} |\n`; } }
  fs.writeFileSync(path.join(OUT, 'measure-boxes.md'), md);
  console.log(md.split('\n').filter(l => /❌|^## /.test(l)).join('\n')); console.log('errs', errs, JSON.stringify(R._07));
  await b.close();
})();
