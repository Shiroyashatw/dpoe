/* 圖鑑（wiki）產生器：在本機開遊戲頁，從遊戲資料直接抽技能、輔助、光環、昇華（大點＋小點）、名詞與每一級的數值、圖示，
   套 tools/wiki_tpl.html 寫成一個獨立的 HTML（可以發布成 Artifact）。
   用法：先在 dpoe/ 底下 python3 -m http.server 8000，再 node tools/wiki.js [輸出檔，預設 tools/wiki.html] [網址] */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'wiki.html'),
  URL = process.argv[3] || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=wiki');
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    try {
      proSkip();
    } catch (e) {}
  });
  // load all sheets
  await p.evaluate(() => Object.keys(ART_SHEET).forEach(s => artSheet(s)));
  await p.waitForTimeout(4000);
  const data = await p.evaluate(() => {
    const icons = {};
    const ic = k => {
      if (!k) return null;
      if (!(k in icons)) icons[k] = artIconURL(k) || null;
      return k;
    };
    const tagN = t => TAGN[t] || t;
    const ascOf = {};
    for (const [ak, A] of Object.entries(ASC))
      if (A.N)
        for (const v of Object.values(A.N))
          if (v[3] && typeof v[2] === 'string') for (const f in v[3]) ascOf[f] = A.n + '・' + v[2];
    const sk = Object.entries(SKILLS).map(([k, D]) => {
      const spell = isSpell(D),
        wt = D.wt ? [].concat(D.wt).map(w => WTN[w] || w) : [];
      const lv = [];
      for (let L = 1; L <= GEM_MAX; L++) {
        let c = null;
        try {
          c = gemCfg(mkGem(k, L), -1);
        } catch (e) {}
        lv.push({
          L,
          req: GEM_REQ[L - 1],
          soul: L < GEM_MAX ? soulCost(L) : null,
          dmg: spell ? +(spellDmg(L, 1) * (D.m || 0)).toFixed(1) : null,
          mult: !spell && D.m ? +(gemMult(D, L) * 100).toFixed(0) : null,
          mp: c && c.mp != null ? c.mp : D.mp ? Math.round(D.mp * gemMpMul(L)) : 0,
          t: c ? +actDur(c).toFixed(2) : null
        });
      }
      const aw = AWK[k]
        ? ['A', 'B']
            .filter(x => AWK[k][x])
            .map(x => ({
              x,
              n: AWK[k][x].n,
              d: (() => {
                try {
                  return awText(k, x);
                } catch (e) {
                  return AWK[k][x].d || '';
                }
              })()
            }))
        : [];
      return {
        k,
        n: D.n,
        ic: ic(D.ic),
        d: D.d,
        spell,
        el: D.el ? ELN[D.el] || D.el : '',
        tags: (D.tags || []).map(tagN),
        wt: wt.length ? wt : D.asc ? [] : ['不限武器'],
        asc: D.asc ? ascOf[D.asc] || D.asc : '',
        off: D.off ? [].concat(D.off).join('、') : '',
        cd: D.cd || 0,
        dur: D.dur || 0,
        r: D.r || 0,
        m: D.m || 0,
        m20: D.m20 || null,
        lv,
        aw
      };
    });
    const grp = {};
    for (const k in SUPPORTS) if (SUP_CAT[k]) (grp[SUP_CAT[k]] = grp[SUP_CAT[k]] || []).push(SUPPORTS[k].n);
    const sup = Object.entries(SUPPORTS).map(([k, D]) => ({
      k,
      n: D.n,
      ic: ic(D.ic),
      d: D.d,
      need: (D.need || []).map(tagN),
      same: SUP_CAT[k] ? grp[SUP_CAT[k]].filter(n => n !== D.n) : [],
      lv: Array.from({ length: GEM_MAX }, (_, i) => ({
        L: i + 1,
        req: GEM_REQ[i],
        soul: i + 1 < GEM_MAX ? soulCost(i + 1) : null,
        more: i
      }))
    }));
    const aura = Object.entries(AURAS).map(([k, D]) => ({
      k,
      n: D.n,
      ic: ic(D.ic),
      d: D.d,
      sp: D.sp,
      tags: (D.tags || []).map(tagN),
      lv: Array.from({ length: GEM_MAX }, (_, i) => ({
        L: i + 1,
        req: GEM_REQ[i],
        soul: i + 1 < GEM_MAX ? soulCost(i + 1) : null,
        eff: +(1 + 0.03 * i).toFixed(2)
      }))
    }));
    const asc = Object.entries(ASC)
      .filter(([, A]) => A.N)
      .map(([k, A]) => ({
        k,
        n: A.n,
        ic: ic(A.ic),
        d: A.d,
        nodes: Object.entries(A.N)
          .filter(([nk]) => nk !== 'st')
          .map(([nk, v]) =>
            typeof v[2] === 'string'
              ? { t: 'big', n: v[2], d: v[4] || '', ic: ic(v[5]), g: v[6] || '' }
              : { t: 'small', d: statLines(v[2] || {}).join('、'), ic: ic(v[5]) }
          ),
        skills: Object.entries(SKILLS)
          .filter(([, D]) => D.asc && ascOf[D.asc] && ascOf[D.asc].startsWith(A.n + '・'))
          .map(([sk]) => sk)
      }));
    const terms = Object.entries(TERMS).map(([n, d]) => ({ n, d: typeof d === 'string' ? d : (d && d.d) || '' }));
    return { ver: VER, sk, sup, aura, asc, terms, icons };
  });
  const miss = Object.entries(data.icons)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const tpl = fs.readFileSync(path.join(__dirname, 'wiki_tpl.html'), 'utf8');
  fs.writeFileSync(OUT, tpl.replace('__DATA__', JSON.stringify(data).replace(/<\//g, '<\\/')));
  console.log(
    '寫好',
    OUT,
    data.ver,
    data.sk.length,
    data.sup.length,
    data.aura.length,
    data.asc.length,
    'terms',
    data.terms.length,
    'icons',
    Object.keys(data.icons).length,
    'miss',
    miss.length,
    miss.slice(0, 8),
    'size',
    JSON.stringify(data).length,
    errs.slice(0, 3)
  );
  await b.close();
  if (miss.length || errs.length) process.exit(1);
})();
