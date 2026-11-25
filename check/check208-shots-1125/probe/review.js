/* 獨立驗收量測：重現 camp_stash_check 的各狀態，量 REPORT 沒比到的元素（框＋computed style） */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const SP = '/tmp/claude-0/-home-user-dpoe/dfbe7ad6-5db6-579f-ac02-8debbbd0cb14/scratchpad';
const URL = 'http://localhost:8003/';
const OUT = {};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1500);
  const E = (f, a) => p.evaluate(f, a);
  /* 量：[名稱, 選擇器, 第幾個] → 框＋字＋色＋背景 */
  const M = (L, key) =>
    E(L => {
      const bg = e => {
        for (let x = e; x; x = x.parentElement) {
          const c = getComputedStyle(x).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        }
        return '';
      };
      return L.map(([n, q, i = 0]) => {
        const e = document.querySelectorAll(q)[i];
        if (!e) return [n, q, null];
        const r = e.getBoundingClientRect(),
          s = getComputedStyle(e);
        let tw = null;
        try {
          const rg = document.createRange();
          rg.selectNodeContents(e);
          const rr = rg.getBoundingClientRect();
          tw = [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)];
        } catch (_) {}
        return [
          n,
          q,
          {
            box: [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10),
            text: (e.innerText || e.textContent || '').trim().slice(0, 120),
            font: s.fontSize + '/' + s.fontWeight,
            color: s.color,
            bg: bg(e),
            ownBg: s.backgroundColor,
            border: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor + ' L:' + s.borderLeftWidth + ' ' + s.borderLeftColor,
            outline: s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor + ' off ' + s.outlineOffset,
            scrollW: e.scrollWidth,
            clientW: e.clientWidth,
            textBox: tw,
            disabled: !!e.disabled,
            ariaDis: e.getAttribute('aria-disabled')
          }
        ];
      });
    }, L).then(r => (OUT[key] = (OUT[key] || []).concat(r)));
  const MID = () => {
    proSkip();
    S.story.tips = 0;
    S.lv = 38;
    S.auto = 0;
    Object.assign(S.camp, { forge: 15, watch: 12, scout: 2, altar: 6, store: 2 });
    const Mt = MAT();
    for (const k in Mt) if (typeof Mt[k] === 'number') Mt[k] = 0;
    for (const bb of ['forge', 'watch']) {
      const n = campNext(bb);
      for (const [, , w, key] of costRows(n)) {
        const have =
          key === 'soul' ? Mt.soul : key === 'gold' ? S.gold : key.startsWith('cur:') ? Mt[key.slice(4)] || 0 : matN(...matOf(key));
        const add = Math.max(0, w - have) + (key === 'soul' ? 3600 : 6);
        if (key === 'soul') Mt.soul += add;
        else if (key === 'gold') S.gold += add;
        else if (key.startsWith('cur:')) Mt[key.slice(4)] = (Mt[key.slice(4)] || 0) + add;
        else matAdd(...matOf(key), add);
      }
    }
    changed();
  };
  await E(MID);
  await E(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(1500);
  await E(() => {
    S.auto = 0;
    G.mobs.length = 0;
  });
  await p.keyboard.press('h');
  await p.waitForTimeout(500);
  /* 02 焦點 */
  await M(
    [
      ['焦點卡 .c12b', '#c12-forge .c12b'],
      ['鍵帽 #c12key', '#c12key'],
      ['鍵帽 span1', '#c12key span', 0],
      ['鍵帽 span3', '#c12key span', 2]
    ],
    '02'
  );
  OUT['02focusEl'] = await E(() => [document.activeElement.className, document.activeElement.matches(':focus-visible')]);
  await p.mouse.move(2, 400);
  await E(() => document.activeElement.blur());
  /* 01 主畫面 */
  const main = [
    ['面板', '#pcamp'],
    ['標題列 .c12h', '.c12h'],
    ['營地', '.c12h > b'],
    ['可升級', '.c12h > span'],
    ['× 關閉', '.c12h > .x'],
    ['目標條', '.c12goal'],
    ['功能 地點', '.c12fn button', 0],
    ['功能 倉庫', '.c12fn button', 1],
    ['功能 昇華石碑', '.c12fn button', 2],
    ['功能 昇華石碑 名', '.c12fn button span', 2],
    ['功能 昇華石碑 icon', '.c12fn button .c12ph', 2],
    ['功能 山海寶盒', '.c12fn button', 3],
    ['功能 試招場', '.c12fn button', 4],
    ['功能 地點 名', '.c12fn button span', 0],
    ['功能 地點 kbd', '.c12fn button kbd', 0]
  ];
  for (const c of ['forge', 'watch', 'scout', 'altar', 'store'])
    main.push(
      [c + ' 卡', '#c12-' + c],
      [c + ' 名', '#c12-' + c + ' .c12b > b'],
      [c + ' Lv', '#c12-' + c + ' .lv'],
      [c + ' 利益行', '#c12-' + c + ' .c12ben'],
      [c + ' 利益 em', '#c12-' + c + ' .c12ben em'],
      [c + ' 底列', '#c12-' + c + ' .c12st'],
      [c + ' 印章', '#c12-' + c + ' .stamp'],
      [c + ' 進度條', '#c12-' + c + ' .cdp'],
      [c + ' 進度 fill', '#c12-' + c + ' .cdp i']
    );
  main.push(['建議', '.c12sg']);
  await M(main, '01');
  await p.screenshot({ path: SP + '/probe/r01.png' });
  /* 02b 懸停 */
  await p.mouse.move(900, 330);
  await p.waitForTimeout(600);
  await M(
    [
      ['懸停 #c12tip', '#c12tip'],
      ['懸停 標題', '#c12tip b'],
      ['懸停 正文', '#c12tip p'],
      ['懸停 small', '#c12tip small']
    ],
    '02b'
  );
  /* 03 鎖 懸停＋點 */
  await p.mouse.move(1054, 188);
  await p.waitForTimeout(600);
  await M(
    [
      ['鎖 懸停 #c12tip', '#c12tip'],
      ['鎖 懸停 small', '#c12tip small'],
      ['昇華石碑 button', '.c12fn button', 2]
    ],
    '03hover'
  );
  await p.screenshot({ path: SP + '/probe/r03hover.png' });
  await p.mouse.click(1054, 188);
  await p.waitForTimeout(150);
  await M(
    [
      ['#warn', '#warn'],
      ['鎖 點後 button', '.c12fn button', 2]
    ],
    '03click'
  );
  await p.screenshot({ path: SP + '/probe/r03click.png' });
  await p.waitForTimeout(1700);
  /* 04 鍛造台詳細 */
  await p.mouse.move(2, 400);
  await p.click('#c12-forge .c12b');
  await p.waitForTimeout(200);
  const det = [
    ['返回', '.c12bk'],
    ['設施名', '.c12h.one > b'],
    ['序', '.c12h.one > span'],
    ['‹', '[data-c12="nav:-1"]'],
    ['›', '[data-c12="nav:1"]'],
    ['頭部', '.c12top'],
    ['頭部 icon', '.c12top .c12ph'],
    ['頭部 Lv', '.c12top b'],
    ['頭部 最高', '.c12top > small'],
    ['頭部 條', '.c12pb'],
    ['頭部 %', '.c12pp'],
    ['小標列1', '.c12sub', 0],
    ['小標1 b', '.c12sub b', 0],
    ['解鎖一覽鈕', '.c12cat'],
    ['升級後全句', '.c12full'],
    ['次要鈕', '.c12sec'],
    ['小標2', '.c12sub', 1],
    ['小標3', '.c12sub', 2],
    ['對照列1', '.c12cmp li', 0],
    ['對照列1 項', '.c12cmp li span', 0],
    ['對照列1 現', '.c12cmp li span', 1],
    ['對照列1 下', '.c12cmp li b', 0],
    ['對照列1 Δ', '.c12cmp li em', 0],
    ['費用列1', '.c12cost li', 0],
    ['費用列1 名', '.c12cost li b', 0],
    ['費用列1 數', '.c12cost li span', 0],
    ['費用列1 條', '.c12cost li .c12bar', 0],
    ['費用列1 方', '.c12cost li .c12sq', 0],
    ['費用列2', '.c12cost li', 1],
    ['費用列3', '.c12cost li', 2],
    ['費用列4', '.c12cost li', 3],
    ['底列', '.c12foot'],
    ['摘要', '.c12sum'],
    ['升級鈕', '.c12up'],
    ['升級鈕 small', '.c12up small'],
    ['短列', '.c12cost li.short'],
    ['短列 條 fill', '.c12cost li.short .c12bar i'],
    ['短列 方', '.c12cost li.short .c12sq'],
    ['短列 ETA', '.c12cost li small']
  ];
  await M(det, '04');
  await p.screenshot({ path: SP + '/probe/r04.png' });
  /* 05 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  await E(() => document.querySelector('.c12up').focus());
  await M(det, '05');
  OUT['05fv'] = await E(() => document.querySelector('.c12up').matches(':focus-visible'));
  /* 06 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  await M(det, '06');
  /* 07 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  await M(det, '07');
  /* 15 */
  await p.click('.c12cat');
  await p.waitForTimeout(150);
  const cat = [
    ['小窗', '.c12cw'],
    ['窗頭', '.c12ch'],
    ['窗標題', '.c12ch b'],
    ['窗關閉', '.c12ch .x'],
    ['列 Lv1', '.c12cw li', 0],
    ['列 Lv1 級', '.c12cw li span', 0],
    ['列 Lv1 文', '.c12cw li b', 0],
    ['列 Lv1 狀態', '.c12cw li small', 0],
    ['列 Lv6 目前', '.c12cw li', 5],
    ['列 Lv7 下一級', '.c12cw li', 6],
    ['列 Lv7 文', '.c12cw li b', 6],
    ['列 Lv8 未解鎖', '.c12cw li', 7],
    ['列 Lv8 文', '.c12cw li b', 7],
    ['列 Lv8 狀態', '.c12cw li small', 7],
    ['列 Lv11', '.c12cw li', 10],
    ['解鎖一覽鈕 按下', '.c12cat']
  ];
  await M(cat, '15');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  /* 08 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  await M(det, '08');
  /* 12 名詞提示 */
  await p.mouse.move(915, 98);
  await p.waitForTimeout(600);
  await M(
    [
      ['名詞 #c12tip', '#c12tip'],
      ['名詞 標題', '#c12tip b'],
      ['名詞 正文', '#c12tip p'],
      ['名詞 small', '#c12tip small']
    ],
    '12'
  );
  /* 09 */
  await p.mouse.move(2, 400);
  await E(() => {
    const n = campNext('watch');
    matAdd('wood', 0, -(matN('wood') - (n.wood - 530)));
    CDR.one = 'watch';
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  await M(det, '09');
  /* 11 toast */
  await p.click('.c12up');
  await p.waitForTimeout(100);
  await M(
    [
      ['toast', '.c12sum'],
      ['升級鈕', '.c12up'],
      ['閃列', '.c12cost li.flash'],
      ['閃列 方', '.c12cost li.flash .c12sq'],
      ['費用 最後一列', '.c12cost li', 2]
    ],
    '11'
  );
  OUT['11warn'] = await E(() => [$('warn').textContent, getComputedStyle($('warn')).opacity]);
  OUT['11flashAfter'] = await E(() => getComputedStyle(document.querySelector('.c12cost li.flash .c12sq'), '::after').content);
  await p.waitForTimeout(2100);
  /* 11b：靈魂缺（有每分靈魂）時 toast 文案 */
  OUT['11soulRate'] = await E(() => (typeof soulRate === 'function' ? soulRate() : 'n/a'));
  /* 10 滿級 */
  await E(() => {
    S.camp.scout = 4;
    CDR.one = 'scout';
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  await M(det, '10');
  /* 13：追逐橫幅 */
  await E(() => {
    S.camp.scout = 2;
    CDR.one = null;
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  try {
    await E(() => chaseBn(CHASE_POOL.trunk[0]));
    await p.waitForTimeout(300);
    await p.screenshot({ path: SP + '/probe/r13bn.png' });
    OUT['13bn'] = await E(() => {
      const e = document.querySelector('#chasebn, .chasebn, [id*=chase]');
      return e ? [e.id, e.className, (r => [r.x, r.y, r.width, r.height])(e.getBoundingClientRect())] : null;
    });
  } catch (e) {
    OUT['13bnErr'] = e.message;
  }
  /* 14 開局 */
  await E(() => {
    Object.assign(S.camp, { forge: 0, watch: 0, scout: 0, altar: 0, store: 0 });
    const Mt = MAT();
    for (const k in Mt) if (typeof Mt[k] === 'number') Mt[k] = 0;
    CDR.one = null;
    changed();
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  const m14 = [['功能 昇華石碑', '.c12fn button', 2], ['功能 昇華石碑 名', '.c12fn button span', 2], ['可升級', '.c12h > span']];
  for (const c of ['forge', 'watch', 'scout', 'altar', 'store'])
    m14.push([c + ' 利益行', '#c12-' + c + ' .c12ben'], [c + ' 利益 em', '#c12-' + c + ' .c12ben em'], [c + ' 印章', '#c12-' + c + ' .stamp']);
  await M(m14, '14');
  /* warn 置中寬度：升級成功訊息 */
  OUT['warnCss'] = await E(() => {
    const w = $('warn');
    w.textContent = '鍛造台 Lv16：打造一次 20 件；開了第 5 格技能，到技能分頁裝上';
    const r = w.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height, getComputedStyle(w).fontSize];
  });
  OUT.errs = errs;
  fs.writeFileSync(SP + '/probe/review.json', JSON.stringify(OUT, null, 1));
  await b.close();
  console.log('done', errs.length);
})();
