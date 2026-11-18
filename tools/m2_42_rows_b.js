/* M2-42 體檢清單下半（specs/M2-42-ux-audit-checklist-b.md）：面板與主流程的每一列。格式同 m2_42_rows.js */
'use strict';
/* 技能面板：照按鈕走（data-sk 是遊戲自己的按鈕） */
const SKB = s => {
  const b = document.querySelector(`#pskill [data-sk="${s}"]`);
  /* 篩選鈕：已經亮著的再點會切掉，只在沒亮時點 */
  if (b && !(s.startsWith('f:') && b.classList.contains('on'))) b.click();
  return !!b;
};
/* 選一件倉庫物品：直立用觸控點（點一下＝展開對比卡），桌機用遊戲的 lootsel（點一下物品做的事） */
async function selItem(p, port, idx, setup) {
  await p.evaluate(setup || (() => (U.idle(), navGo('bag'))));
  await p.evaluate(() => (DBG.step(66), M42.finishAnims()));
  await p.waitForTimeout(300);
  if (port) {
    const c = await p.evaluate(i => {
      const r = [...document.querySelectorAll('#pinv .it')].filter(M42.vis)[i].getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    }, idx);
    await p.touchscreen.tap(c[0], c[1]);
  } else
    await p.evaluate(
      i => act('lootsel:' + [...document.querySelectorAll('#pinv .it')].filter(M42.vis)[i].dataset.id),
      idx
    );
  await p.waitForTimeout(350);
  await p.evaluate(() => (DBG.step(33), M42.finishAnims()));
}
/* 天賦樹 B-T2：照狀態選一點、移過去（頁面裡跑） */
const TREE_PICK = st => {
  U.idle();
  navGo('tree');
  DBG.step(66);
  const N = PTREE.N;
  let id;
  if (st === 'can') id = N.find(n => treeCan(n.id) && !(S.pt || []).includes(n.id)).id;
  else if (st === 'lock') id = (N.find(n => n.lock) || N.find(n => !treeCan(n.id) && !(S.pt || []).includes(n.id))).id;
  else {
    /* 先點一個能點的（遊戲的 treeToggle），那一點就是已點／可退回 */
    const c = N.find(n => treeCan(n.id) && !(S.pt || []).includes(n.id)).id;
    treeToggle(c);
    if (st === 'taken') {
      /* 已點但不能退（後面有接）：再點它後面一個 */
      const nx = N.find(n => treeCan(n.id) && !(S.pt || []).includes(n.id) && (n.l || n.links || []).includes && true);
      if (nx) treeToggle(nx.id);
      id = c;
    } else id = (S.pt || []).slice(-1)[0];
  }
  treeSelect(id);
  const n = PTREE.I[id];
  if (n) treeFly(n.x, n.y, 1);
  DBG.step(600);
  const v = {
    id,
    can: treeCan(id),
    taken: (S.pt || []).includes(id),
    refund: treeCanRefund(id),
    lock: !!(PTREE.I[id] || {}).lock
  };
  return { id, v };
};
const ROWS = [
  /* ---------- §7 技能 ---------- */
  {
    id: 'B-S1',
    scr: 'skill',
    st: ['home'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      navGo('skill');
      DBG.step(66);
      const soul = document.querySelector('#pskill .soul');
      return {
        ok: PANEL.skill && SKUI.view === 'home',
        v: { view: SKUI.view },
        checks: {
          soul_cut: soul && soul.scrollWidth > soul.clientWidth + 1 ? 1 : 0,
          handle: +M42.vis($('phand')),
          sheet_full: NAV.full,
          todo: skTodo().length
        }
      };
    }
  },
  {
    id: 'B-S2',
    scr: 'skill',
    st: ['one'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      /* 三孔：第 1 孔插一顆輔助、第 2 孔空、第 3 孔沒開（campN('holes')） */
      S.skills[1].so[0] = 'fireadd';
      U.re();
      navGo('skill');
      SKB('go:one:1');
      DBG.step(66);
      const holes = [...document.querySelectorAll('#pskill [data-sk^="hole:"]')].map(b => U.txt(b).slice(0, 10));
      return {
        ok: SKUI.view === 'one' && SKUI.i === 1,
        v: { view: SKUI.view, i: SKUI.i, holesOpen: campN('holes') },
        checks: {
          holes_shown: holes.length,
          holes: JSON.stringify(holes),
          hole3: campN('holes') < 3 ? 'locked(無孔列，只有底部開孔)' : 'open'
        }
      };
    }
  },
  {
    id: 'B-S3',
    scr: 'skill',
    st: ['calc', 'awake'],
    go: st => {
      U.idle();
      navGo('skill');
      SKB('go:one:1');
      SKB('calc');
      if (st === 'awake') SKB('aw');
      DBG.step(66);
      return { ok: SKUI.view === 'one' && (st === 'calc' ? SKUI.calc : SKUI.aw), v: { calc: SKUI.calc, aw: SKUI.aw } };
    }
  },
  {
    id: 'B-S4',
    scr: 'skill',
    st: ['pick-skills'],
    go: () => {
      U.idle();
      navGo('skill');
      SKB('go:skills:1');
      SKB('f:推薦');
      DBG.step(66);
      const rows = [...document.querySelectorAll('#pskill [data-sk^="pick:"]')].map(b =>
        U.txt(b.querySelector('.sk-up, .up, small')).slice(0, 20)
      );
      return {
        ok: SKUI.view === 'skills',
        v: { view: SKUI.view, f: SKUI.f && JSON.stringify(SKUI.f) },
        checks: { rows: rows.length, rec_same: rows.length > 1 && new Set(rows).size === 1 ? 1 : 0 }
      };
    }
  },
  {
    id: 'B-S5',
    scr: 'skill',
    st: ['pick-aura'],
    go: () => {
      U.idle();
      navGo('skill');
      SKB('go:auras');
      DBG.step(66);
      return { ok: SKUI.view === 'auras', v: { view: SKUI.view } };
    }
  },
  {
    id: 'B-S6',
    scr: 'skill',
    st: ['pick-sups'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      navGo('skill');
      SKB('go:one:1');
      /* 清單寫 SKUI.view='sups'、i=1、hole=2（第 3 孔）；第 3 孔現行沒開，孔列沒有按鈕，照清單直接設 SKUI 再重畫 */
      SKUI.i = 1;
      SKUI.hole = 2;
      skOpen('sups');
      hudPanels();
      SKB('f:推薦');
      DBG.step(66);
      const rows = [...document.querySelectorAll('#pskill [data-sk^="pick:"]')].map(b => ({
        k: b.dataset.sk.slice(5),
        t: U.txt(b)
      }));
      const want = ['fireadd', 'coldadd', 'lightadd', 'chaosadd'];
      const got = want.filter(k => rows.some(r => r.k === k));
      /* 每列右邊的推薦差（.sk-t 之後的那一塊，例「＝ 沒有變化」「▲ 每秒 +14（21%）」） */
      const up = [...document.querySelectorAll('#pskill [data-sk^="pick:"]')].map(b => {
        const t = b.querySelector('.sk-t');
        return U.txt(b).replace(U.txt(t), '').trim();
      });
      const descCut = [
        ...document.querySelectorAll('#pskill [data-sk^="pick:"] small, #pskill [data-sk^="pick:"] .sk-t')
      ].filter(e => e.scrollWidth > e.clientWidth + 1 || /…$/.test(U.txt(e))).length;
      const chips = document.querySelector('#pskill .sk-chips');
      return {
        ok: SKUI.view === 'sups' && SKUI.i === 1 && SKUI.hole === 2 && got.length === 4,
        v: { view: SKUI.view, i: SKUI.i, hole: SKUI.hole, f: JSON.stringify(SKUI.f), four: got.join(',') },
        checks: {
          rows: rows.length,
          rec_same: up.filter(Boolean).length > 1 && new Set(up.filter(Boolean)).size === 1 ? 1 : 0,
          rec: JSON.stringify(up.slice(0, 8)),
          rec_kinds: new Set(up).size,
          desc_trunc: descCut,
          chips_scroll: chips ? +(chips.scrollWidth > chips.clientWidth + 1) : '',
          depth: '總覽›招›孔›清單=4'
        }
      };
    }
  },
  {
    id: 'B-S7',
    scr: 'skill',
    st: ['sup-open'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      navGo('skill');
      SKB('go:one:1');
      SKUI.i = 1;
      SKUI.hole = 2;
      skOpen('sups');
      hudPanels();
      SKB('f:推薦');
      SKB('pick:lightadd');
      DBG.step(66);
      const open = document.querySelector('#pskill [data-sk="pick:lightadd"].on');
      const box = open && open.nextElementSibling;
      const tiers = [...document.querySelectorAll('#pskill [data-sk^="tier:"]')].map(
        b => U.txt(b) + (b.querySelector('svg') ? '🔒' : '')
      );
      const bar = document.querySelector('#pskill [data-sk^="put:"], #pskill [data-sk="drill"]');
      const bg = box ? getComputedStyle(box).backgroundColor : '';
      return {
        ok: SKUI.pick === 'lightadd' && !!open,
        v: { pick: SKUI.pick, hole: SKUI.hole },
        checks: {
          tiers: tiers.join('|'),
          bar: bar ? bar.dataset.sk + ':' + U.txt(bar).slice(0, 16) : 'none',
          bar_hit: bar ? M42.R(bar).slice(2).join('x') : '',
          open_bg: bg
        }
      };
    }
  },
  {
    id: 'B-S8',
    scr: 'skill',
    st: ['filter-el', 'filter-gen', 'filter-all'],
    go: st => {
      U.idle();
      navGo('skill');
      SKB('go:one:1');
      SKUI.i = 1;
      SKUI.hole = 2;
      skOpen('sups');
      hudPanels();
      const t = { 'filter-el': '元素', 'filter-gen': '通用', 'filter-all': '全部' }[st];
      const has = SKB('f:' + t);
      DBG.step(66);
      const n = document.querySelectorAll('#pskill [data-sk^="pick:"]').length;
      return {
        ok: has && SKUI.view === 'sups',
        v: {
          f: JSON.stringify(SKUI.f),
          rows: n,
          chips: [...document.querySelectorAll('#pskill [data-sk^="f:"]')].map(b => b.dataset.sk.slice(2)).join('|')
        }
      };
    }
  },
  {
    id: 'B-S9',
    scr: 'skill',
    st: ['reorder'],
    go: () => {
      U.idle();
      navGo('skill');
      const ok = SKB('mv:1');
      DBG.step(66);
      return { ok: ok && SKUI.mv != null, v: { mv: SKUI.mv } };
    }
  },
  {
    id: 'B-S10',
    scr: 'skill',
    st: ['drill'],
    go: () => {
      U.idle();
      /* midgame 祭壇 6 → campN('holes')＝2，每招最多 2 孔，沒有可開的孔；祭壇 8 才 3 孔（craft.js campN）。
         祭壇設成 8，斬擊（2 孔）第 3 孔就是「打開第 3 孔」 */
      S.camp.altar = Math.max(S.camp.altar, 8);
      U.re();
      navGo('skill');
      SKB('go:one:0');
      DBG.step(33);
      const h = document.querySelector('#pskill [data-sk="hole:2"]');
      if (h) h.click();
      DBG.step(66);
      const d = document.querySelector('#pskill [data-sk="drill"]');
      return {
        ok: !!d && M42.vis(d),
        v: { drill: d ? U.txt(d) : null, disabled: d ? d.disabled : null, holeBtn: !!h, altar: S.camp.altar },
        checks: { note: 'midgame 祭壇6只有2孔，本列把祭壇設8' }
      };
    }
  },
  {
    id: 'B-S11',
    scr: 'skill',
    st: ['desk-home', 'desk-sups'],
    star: 1,
    na: { P: '桌機版技能面板（直立見 B-S1、B-S6）' },
    go: st => {
      U.idle();
      navGo('skill');
      if (st === 'desk-sups') {
        SKB('go:one:1');
        SKUI.i = 1;
        SKUI.hole = 2;
        skOpen('sups');
        hudPanels();
        SKB('f:推薦');
      }
      DBG.step(66);
      const r = M42.R($('pskill'));
      return {
        ok: PANEL.skill && SKUI.view === (st === 'desk-home' ? 'home' : 'sups'),
        v: { view: SKUI.view },
        checks: { panel: r.join(','), overflow: +(r[0] + r[2] > innerWidth) }
      };
    }
  },
  /* ---------- §8 裝備、戰利品、通貨 ---------- */
  {
    id: 'B-E1',
    scr: 'char',
    st: ['beige'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      navGo('char');
      DBG.step(66);
      /* 裝備格：img 有圖（naturalWidth>0）或 span.ic（沒圖＝單色方塊） */
      const slots = [...document.querySelectorAll('#pinv [data-eq], #pinv .eqs .it, #pinv .slot')].filter(M42.vis);
      /* 米色方塊（3.jpg）：物品格裡沒有 <img>、只有空的 span.ic（高 0），格子底色整塊露出來 */
      const cells = [...document.querySelectorAll('#pinv .it')].filter(M42.vis);
      const beigeEl = cells.filter(e => e.querySelector('span.ic') && !e.querySelector('img.ic'));
      const beige = beigeEl.map(e => (e.closest('[data-eq]') ? 'eq:' + e.closest('[data-eq]').dataset.eq : 'inv'));
      const noreq = beigeEl.filter(e => e.closest('.noreq')).length;
      const imgs = [...document.querySelectorAll('#pinv img.ic')].filter(M42.vis);
      return {
        ok: NAV.view === 'char' && PANEL.inv,
        v: { view: NAV.view, eq: Object.keys(S.eq).filter(k => S.eq[k]).length },
        checks: {
          beige_slots: beige.length,
          beige_sel: [...new Set(beige)].slice(0, 12).join('|'),
          beige_noreq: noreq,
          cells: cells.length,
          img_ok: imgs.filter(i => i.naturalWidth > 0).length,
          slots: slots.length,
          eq_bad: (ST.eqBad || []).join('|')
        }
      };
    }
  },
  {
    id: 'B-E2',
    scr: 'char',
    st: ['stats'],
    star: 1,
    go: () => {
      U.idle();
      navGo('char');
      DBG.step(66);
      const st = document.querySelector('#pinv .cst, #pinv .stats, #pinv .chs');
      if (st) st.scrollIntoView({ block: 'center' });
      DBG.step(33);
      return {
        ok: NAV.view === 'char' && PANEL.inv,
        v: { view: NAV.view },
        checks: {
          stats_box: st ? M42.sel(st) : 'none',
          res: JSON.stringify(U.txt(U.byText('#pinv *', '抗')).slice(0, 40))
        }
      };
    }
  },
  {
    id: 'B-E3',
    scr: 'char',
    st: ['empty'],
    go: () => {
      U.idle();
      for (const k of Object.keys(S.eq)) if (k !== 'weapon') S.eq[k] = null;
      U.re();
      navGo('char');
      DBG.step(66);
      const emp = [...document.querySelectorAll('#pinv .emp, #pinv .it.emp, #pinv [data-eq].e')].filter(M42.vis);
      return {
        ok: NAV.view === 'char' && Object.keys(S.eq).filter(k => S.eq[k]).length === 1,
        v: { eq: 1 },
        checks: { empty_cells: emp.length, empty_txt: JSON.stringify(emp.slice(0, 3).map(U.txt)) }
      };
    }
  },
  {
    id: 'B-E4',
    scr: 'char',
    st: ['slotpick'],
    na: { D: '桌機點裝備格不出 slotPickHTML（NAV.slot 只在直立）；桌機選裝備走 B-E5 對比' },
    go: () => {
      U.idle();
      navGo('char');
      DBG.step(33);
      const b = document.querySelector('#pinv [data-eq="helm"]');
      if (b) b.click();
      DBG.step(66);
      return {
        ok: !!b && NAV.slot != null,
        v: { slot: NAV.slot, btn: b ? b.dataset.eq : null },
        checks: { all_btn: +!!document.querySelector('#pinv [data-a="slotall"]') }
      };
    }
  },
  {
    id: 'B-E5',
    scr: 'char',
    st: ['compare'],
    star: 1,
    node: async (p, st, port) => {
      /* 戰利品第一格放一件可以換上的戒指 → 對比卡（身上／這件） */
      await selItem(p, port, 0, () => {
        U.idle();
        S.inv.items.unshift(mkItem(U.base('ring'), 30, 2));
        U.re();
        navGo('bag');
      });
      const r = await p.evaluate(() => {
        const a = document.querySelector('#pinv .acts');
        return { acts: !!a && M42.vis(a), main: U.txt(document.querySelector('#pinv [data-a=selmove]')).slice(0, 30) };
      });
      return { ok: r.acts, v: r };
    }
  },
  {
    id: 'B-E6',
    scr: 'bag',
    st: ['all', 'filter', 'sort'],
    go: st => {
      U.idle();
      navGo('bag');
      if (st === 'filter') U.click('#pinv [data-a="bagf:armor"]');
      if (st === 'sort') U.click('#pinv [data-a="bagoc"]');
      DBG.step(66);
      return {
        ok:
          PANEL.inv &&
          NAV.view === 'bag' &&
          (st === 'all'
            ? BAG.f === 'all'
            : st === 'filter'
              ? BAG.f === 'armor'
              : BAG.o !== 'new' || !!document.querySelector('#pinv .bagos, #pinv [data-a^="bago:"]')),
        v: { f: BAG.f, o: BAG.o },
        checks: {
          beige_slots: [...document.querySelectorAll('#pinv .it')].filter(
            e => M42.vis(e) && e.querySelector('span.ic') && !e.querySelector('img.ic')
          ).length,
          cells: [...document.querySelectorAll('#pinv .it')].filter(M42.vis).length
        }
      };
    }
  },
  {
    id: 'B-E7',
    scr: 'bag',
    st: ['grow'],
    go: () => {
      U.idle();
      while (S.inv.items.length < 200)
        invPut(S.inv, mkItem(U.base(['ring', 'helm', 'boots'][S.inv.items.length % 3]), 30, S.inv.items.length % 3));
      U.re();
      navGo('bag');
      DBG.step(66);
      const sc = [...document.querySelectorAll('#pinv, #pinv *')].find(
        e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1
      );
      if (sc) sc.scrollTop = sc.scrollHeight - sc.clientHeight - 40;
      DBG.step(66);
      return {
        ok: !!sc && S.inv.items.length >= 200,
        v: { items: S.inv.items.length, shown: document.querySelectorAll('#pinv .it').length },
        checks: {
          schint: +!!document.querySelector('#pinv .schint'),
          more_btn: JSON.stringify(U.txt(U.byText('#pinv button', '顯示')))
        }
      };
    }
  },
  {
    id: 'B-E8',
    scr: 'item',
    st: ['tip'],
    node: async (p, st, port) => {
      if (port) await selItem(p, port, 2);
      else {
        await p.evaluate(() => (U.idle(), navGo('bag'), DBG.step(66), M42.finishAnims()));
        await p.waitForTimeout(300);
        const c = await p.evaluate(() => {
          const r = [...document.querySelectorAll('#pinv .it')].filter(M42.vis)[2].getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2];
        });
        await p.mouse.move(c[0], c[1]);
        await p.waitForTimeout(450);
        await p.evaluate(() => (DBG.step(0), M42.finishAnims()));
      }
      const r = await p.evaluate(() => ({
        tip: M42.vis($('tip')),
        acts: !!document.querySelector('#pinv .acts'),
        R: M42.vis($('tip')) ? M42.R($('tip')) : null
      }));
      return {
        ok: port ? r.acts : r.tip,
        v: r,
        checks: { kind: port ? 'inline(.acts)' : '#tip', tip_w: r.R ? r.R[2] : '' }
      };
    }
  },
  {
    id: 'B-E9',
    scr: 'item',
    st: ['salvage'],
    node: async (p, st, port) => {
      /* 稀有物品分解才要再按一次（普通的直接分解）：第一格放一件稀有戒指 */
      await selItem(p, port, 0, () => {
        U.idle();
        S.inv.items.unshift(mkItem(U.base('ring'), 40, 2));
        U.re();
        navGo('bag');
      });
      const r = await p.evaluate(() => {
        const b = document.querySelector('#pinv [data-a="selsell"]');
        if (b) b.click();
        DBG.step(33);
        M42.finishAnims();
        const c = [...document.querySelectorAll('#pinv button, #pinv [data-a]')].find(e =>
          /再按一次|確定分解/.test(U.txt(e))
        );
        return {
          btn: !!b,
          confirm: c ? U.txt(c) : null,
          main_w: (document.querySelector('#pinv [data-a=selmove]') || { offsetWidth: 0 }).offsetWidth,
          sal_w: c ? c.offsetWidth : 0
        };
      });
      return { ok: !!r.confirm, v: r, checks: { main_w: r.main_w, sal_w: r.sal_w } };
    }
  },
  {
    id: 'B-E10',
    scr: 'charm',
    st: ['belt', 'slots'],
    go: st => {
      U.idle();
      if (st === 'belt') S.eq.belt = null;
      else {
        S.eq.belt = mkItem(U.base('belt'), 40, 2);
        if (!S.eq.belt.cs) S.eq.belt.cs = 2;
      }
      U.re();
      navGo('char');
      DBG.step(66);
      const ch = [...document.querySelectorAll('#pinv *')].find(
        e => M42.vis(e) && /護符/.test(e.textContent) && e.children.length < 4
      );
      if (ch) ch.scrollIntoView({ block: 'center' });
      DBG.step(33);
      return {
        ok: !!ch && (st === 'belt' ? !S.eq.belt : !!S.eq.belt),
        v: { belt: !!S.eq.belt, cs: S.eq.belt ? S.eq.belt.cs : 0 },
        checks: { charm_txt: JSON.stringify(ch ? U.txt(ch).slice(0, 30) : '') }
      };
    }
  },
  {
    id: 'B-E11',
    scr: 'cur',
    st: ['page'],
    go: () => {
      U.idle();
      navGo('forge');
      act('ctab:cur');
      DBG.step(66);
      return { ok: PANEL.stash, v: { stash: PANEL.stash } };
    }
  },
  /* ---------- §9 鍛造 ---------- */
  {
    id: 'B-F1',
    scr: 'forge',
    st: ['make-empty', 'make-item'],
    star: 1,
    go: st => {
      U.idle();
      act('ctab:make');
      if (st === 'make-item') {
        const it = S.inv.items.find(x => x.r === 2) || S.inv.items[0];
        craftPick('inv', it, null);
      }
      DBG.step(66);
      return {
        ok: PANEL.craft && CRAFT.tab === 'make' && (st === 'make-empty' ? !CRAFT.sel : !!CRAFT.sel),
        v: { tab: CRAFT.tab, sel: !!CRAFT.sel }
      };
    }
  },
  {
    id: 'B-F2',
    scr: 'forge',
    st: ['forge', 'temper', 'holy', 'corr', 'calam'],
    star: ['corr'],
    go: st => {
      U.idle();
      /* midgame 鍛造台 Lv10 只開到淬鍊；聖化／腐化／災魘照 campCan('tab:…') 把鍛造台升到剛好開放（記進 checks） */
      const f0 = S.camp.forge;
      const tk = 'tab:' + (st === 'forge' ? 'fill' : st);
      while (!campCan(tk) && S.camp.forge < CAMP.forge.length) S.camp.forge++;
      /* 災魘在瞭望台（watch 第 22 級起：酆都 鬼門關） */
      const w0 = S.camp.watch;
      while (!campCan(tk) && S.camp.watch < CAMP.watch.length) S.camp.watch++;
      if (st === 'calam') MAT().calam = Math.max(MAT().calam || 0, 3);
      U.re();
      const it = S.inv.items.find(x => x.r === 2 && !x.frac) || S.inv.items[0];
      act('ctab:forge');
      craftPick('inv', it, null);
      CRAFT.tab = st;
      hudPanels();
      DBG.step(66);
      const tabs = [
        ...document.querySelectorAll('#pcraft .ftabs button, #pcraft [data-a^="ftab:"], #pcraft [data-a^="ctab:"]')
      ]
        .map(b => U.txt(b))
        .join('|');
      return {
        ok: PANEL.craft && CRAFT.tab === st && !!CRAFT.sel,
        v: { tab: CRAFT.tab, sel: !!CRAFT.sel, forge: S.camp.forge },
        checks: {
          tabs,
          forge_lv: f0 === S.camp.forge ? f0 : f0 + '→' + S.camp.forge,
          watch_lv: w0 === S.camp.watch ? w0 : w0 + '→' + S.camp.watch
        }
      };
    }
  },
  {
    id: 'B-F3',
    scr: 'forge',
    st: ['corr-confirm'],
    go: () => {
      U.idle();
      while (!campCan('tab:corr') && S.camp.forge < CAMP.forge.length) S.camp.forge++;
      /* 腐化石要有才按得下去 */
      MAT().corr = Math.max(MAT().corr || 0, 3);
      U.re();
      const it = S.inv.items.find(x => x.r === 2 && !x.frac) || S.inv.items[0];
      act('ctab:forge');
      craftPick('inv', it, null);
      CRAFT.tab = 'corr';
      hudPanels();
      DBG.step(33);
      const b = [...document.querySelectorAll('#pcraft .fact button, #pcraft [data-fg]')].find(
        e => M42.vis(e) && !e.disabled && /腐化|瓦爾|使用/.test(U.txt(e)) && !/^tab:/.test(e.dataset.fg || '')
      );
      if (b) b.click();
      DBG.step(33);
      const c = [...document.querySelectorAll('#pcraft button')].find(e => /再按一次/.test(U.txt(e)));
      return {
        ok: !!c,
        v: {
          btn: b ? U.txt(b).slice(0, 12) : null,
          confirm: c ? U.txt(c) : null,
          forge: S.camp.forge,
          acts: [...document.querySelectorAll('#pcraft .fact button')]
            .map(e => U.txt(e).slice(0, 10) + (e.disabled ? '(d)' : ''))
            .join('|')
        }
      };
    }
  },
  {
    id: 'B-F4',
    scr: 'reveal',
    st: ['craft', 'identify'],
    star: 1,
    go: st => {
      U.idle();
      if (st === 'craft') {
        DBG.flip([U.base('ring'), U.base('helm'), U.base('amulet')]);
        DBG.step(1500);
        return { ok: M42.vis($('preveal')) && REV.craft, v: { n: REV.list.length, craft: REV.craft } };
      }
      /* 鑑定：離線摘要已在 A-O5；鑑定翻牌用 revealOpen 的一般模式（未鑑定物品的翻牌） */
      const L = [mkItem(U.base('ring'), 40, 2), mkItem(U.base('boots'), 40, 1)];
      for (const it of L) invPut(S.inv, it);
      revealOpen(L, { title: '鑑定' });
      DBG.step(1500);
      return {
        ok: M42.vis($('preveal')) && !REV.craft,
        v: { n: REV.list.length, craft: REV.craft },
        checks: { note: '遊戲現行沒有未鑑定（uid 一律沒有），用 revealOpen 一般模式代替' }
      };
    }
  },
  /* ---------- §10 營地、藏身處、試招場 ---------- */
  {
    id: 'B-P1',
    scr: 'camp',
    st: ['sheet'],
    star: 1,
    s: 1,
    go: (st, port) => {
      U.idle();
      navGo('craft');
      DBG.step(66);
      const top = document.querySelector('#pcraft .cmtop');
      const sc = [...document.querySelectorAll('#pcraft, #pcraft *')].filter(
        e => M42.vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1
      );
      const more = U.byText('#pcraft *', '往下捲');
      return {
        ok: PANEL.craft && CRAFT.tab === 'camp' && (!port || !NAV.full),
        v: { tab: CRAFT.tab, full: NAV.full },
        crops: top ? { cmtop: M42.R(top) } : {},
        checks: {
          cmtop_h: top ? M42.R(top)[3] : 'none',
          scroll_layers: sc.length,
          pidle: +M42.vis($('pidle')),
          camp_idle: M42.vis($('pidle')) ? 'shown' : 'hidden',
          more_hint: JSON.stringify(more ? U.txt(more).slice(0, 30) : ''),
          shortcut5: 'none'
        }
      };
    }
  },
  {
    id: 'B-P2',
    scr: 'camp',
    st: ['full'],
    star: 1,
    s: 1,
    go: (st, port) => {
      U.idle();
      navGo('craft');
      /* 把手上拉＝NAV.full=1（touch.js handInit 放開後做的事）；桌機沒有把手，營地本來就是右欄 */
      if (port) (NAV.full = 1), hudPanels();
      DBG.step(66);
      const top = document.querySelector('#pcraft .cmtop');
      const sc = [...document.querySelectorAll('#pcraft, #pcraft *')].filter(
        e => M42.vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1
      );
      return {
        ok: PANEL.craft && (port ? NAV.full === 1 && document.body.classList.contains('sheetfull') : true),
        v: { full: NAV.full, sheetfull: document.body.classList.contains('sheetfull') },
        checks: {
          cmtop_h: top ? M42.R(top)[3] : 'none',
          cmtop_pct: top ? Math.round((M42.R(top)[3] / innerHeight) * 100) : '',
          scroll_layers: sc.length,
          pnav: +M42.vis($('pnav')),
          desk: port ? '' : '桌機沒有半版／全版之分'
        }
      };
    }
  },
  {
    id: 'B-P3',
    scr: 'camp',
    st: ['card', 'can-up', 'ms'],
    go: st => {
      U.idle();
      for (const k in S.mat.mats) S.mat.mats[k] = st === 'can-up' ? 1e6 : S.mat.mats[k];
      U.re();
      navGo('craft');
      DBG.step(66);
      /* 展開一座設施：點第一張卡（遊戲自己的按鈕） */
      const cards = [
        ...document.querySelectorAll('#pcraft [data-a^="cmc:"], #pcraft [data-a^="camp"], #pcraft .cmc, #pcraft .cc')
      ].filter(M42.vis);
      let target = cards[0];
      if (st === 'ms')
        target =
          [...document.querySelectorAll('#pcraft *')].find(
            e => M42.vis(e) && /里程碑/.test(e.textContent) && e.children.length < 6
          ) || cards[0];
      if (st === 'can-up')
        target =
          [...document.querySelectorAll('#pcraft button')].find(
            b => M42.vis(b) && !b.disabled && /升/.test(U.txt(b))
          ) || cards[0];
      if (target) target.scrollIntoView({ block: 'center' });
      if (target && st === 'card' && target.tagName === 'BUTTON') target.click();
      DBG.step(66);
      return {
        ok: PANEL.craft && !!target,
        v: { target: target ? M42.sel(target) : null, txt: target ? U.txt(target).slice(0, 20) : '' }
      };
    }
  },
  {
    id: 'B-P4',
    scr: 'camp',
    st: ['mul'],
    go: () => {
      U.idle();
      navGo('craft');
      DBG.step(66);
      const seg = [...document.querySelectorAll('#pcraft button')].find(
        b => M42.vis(b) && /×10|x10|最大/.test(U.txt(b))
      );
      if (seg) seg.scrollIntoView({ block: 'center' }), seg.click();
      DBG.step(66);
      return { ok: !!seg, v: { seg: seg ? U.txt(seg) : null } };
    }
  },
  {
    id: 'B-P5',
    scr: 'camp',
    st: ['desk'],
    star: 1,
    na: { P: '桌機營地寬欄（.cwide）；直立見 B-P1、B-P2' },
    go: () => {
      U.idle();
      navGo('craft');
      DBG.step(66);
      return {
        ok: PANEL.craft && CRAFT.tab === 'camp',
        v: { inv: PANEL.inv },
        checks: { cwide: +!!document.querySelector('#pcraft.cwide, .cwide') }
      };
    }
  },
  {
    id: 'B-P6',
    scr: 'hide',
    st: ['scene'],
    star: 1,
    go: () => {
      U.idle();
      enterHideout();
      DBG.step(300);
      return { ok: G.scene === 'hide' && !anyPanel(), v: { scene: G.scene } };
    }
  },
  {
    id: 'B-P7',
    scr: 'hide',
    st: ['props'],
    go: () => {
      U.idle();
      enterHideout();
      DBG.step(100);
      /* 走近市集（之後開放）的擺設：把主角放到旁邊 */
      const pr = (typeof HIDE_ART === 'object' && (HIDE_ART.props || HIDE_ART.items)) || null;
      const m = typeof HIDE !== 'undefined' && HIDE.find ? HIDE.find(o => o.k === 'market') : null;
      if (m) (P.x = m.x + 40), (P.y = m.y + 40);
      DBG.step(300);
      return {
        ok: G.scene === 'hide',
        v: { near: m ? 'market' : 'none' },
        checks: { props: 'canvas 名牌；拼總覽改由 B-P6 全景代替' }
      };
    }
  },
  {
    id: 'B-P8',
    scr: 'prac',
    st: ['enter', 'dps', 'real'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      enterHideout();
      DBG.step(100);
      const z = HIDE_ART.zone;
      P.x = z.x;
      P.y = z.y;
      DBG.step(300);
      if (st !== 'enter') {
        act('auto:0');
        /* 打稻草人：用第一格普攻幾下 */
        for (let i = 0; i < 40; i++) {
          M.L = 1;
          /* 出手會往前位移：每格拉回石圈中央（只為了讓主角留在試招場） */
          P.x = z.x;
          P.y = z.y;
          DBG.step(66);
        }
        M.L = 0;
        DBG.step(200);
      }
      if (st === 'real') {
        const b = [...document.querySelectorAll('#prac button, #prd button, #prac [data-a], #prd [data-a]')].find(e =>
          /實戰/.test(U.txt(e))
        );
        if (b) b.click();
        DBG.step(100);
      }
      return {
        ok: PRAC.in && (st === 'enter' || M42.vis($('prd')) || M42.vis($('prac'))) && (st !== 'real' || PRAC.real),
        v: { in: PRAC.in, real: PRAC.real, prd: M42.vis($('prd')), prac: M42.vis($('prac')) }
      };
    }
  },
  {
    id: 'B-P9',
    scr: 'camp',
    st: ['from-idle'],
    na: { D: '桌機掛機卡的「去營地」一樣能點，但這列是直立的流程（F-cp 有兩尺寸點擊紀錄）' },
    go: () => {
      U.idle();
      DBG.step(33);
      const b = document.querySelector('#pidle [data-a="gocamp"]');
      if (b) b.click();
      DBG.step(66);
      return {
        ok: !!b && PANEL.craft && CRAFT.tab === 'camp',
        v: { craft: PANEL.craft, tab: CRAFT.tab },
        checks: { clicks: 1, pidle: +M42.vis($('pidle')) }
      };
    }
  },
  /* ---------- §11 天賦、昇華 ---------- */
  {
    id: 'B-T1',
    scr: 'tree',
    st: ['far', 'near'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      navGo('tree');
      DBG.step(66);
      if (st === 'far') treeFly(TREE.x, TREE.y, 0.25);
      else treeFly(TREE.x, TREE.y, 1.1);
      DBG.step(800);
      return { ok: TREE.open, v: { z: +TREE.z.toFixed(2) }, checks: { tmini: +M42.vis($('tmini')) } };
    }
  },
  {
    id: 'B-T2',
    scr: 'tree',
    st: ['can', 'taken', 'lock', 'refund'],
    star: 1,
    /* 直立點一下出 #tcard；桌機沒有卡片（treeCard 只在觸控），滑鼠停在那一點出 #tip */
    node: async (p, st, port) => {
      const r = await p.evaluate(`(${TREE_PICK.toString()})(${JSON.stringify(st)})`);
      if (!port && r.id) {
        const c = await p.evaluate(id => {
          const e = document.querySelector(`#tg [data-n="${id}"]`);
          if (!e) return null;
          const b = e.getBoundingClientRect();
          return [b.x + b.width / 2, b.y + b.height / 2];
        }, r.id);
        if (c) await p.mouse.move(c[0], c[1]);
        await p.waitForTimeout(450);
        await p.evaluate(() => (DBG.step(0), M42.finishAnims()));
      }
      const card = await p.evaluate(
        port =>
          (port ? M42.vis($('tcard')) : M42.vis($('tip'))) ? U.txt(port ? $('tcard') : $('tip')).slice(0, 40) : null,
        port
      );
      const ok =
        !!card &&
        (st === 'can'
          ? r.v.can && !r.v.taken
          : st === 'taken'
            ? r.v.taken
            : st === 'refund'
              ? r.v.taken && r.v.refund
              : !r.v.can && !r.v.taken);
      return {
        ok,
        v: r.v,
        checks: {
          card: JSON.stringify(card),
          kind: port ? '#tcard' : '#tip(hover)',
          taken_refundable: st === 'taken' ? +r.v.refund : ''
        }
      };
    }
  },
  {
    id: 'B-T3',
    scr: 'tree',
    st: ['search'],
    node: async (p, st, port) => {
      await p.evaluate(() => {
        U.idle();
        navGo('tree');
        DBG.step(66);
      });
      const name = await p.evaluate(() => PTREE.N.find(n => n.s && n.n && n.n.length >= 2 && !n.lock).n);
      await p.fill('#tfind', name);
      await p.waitForTimeout(200);
      await p.evaluate(() => DBG.step(500));
      const r = await p.evaluate(() => ({
        found: M42.vis($('tfound')),
        txt: U.txt($('tfound')),
        focus: document.activeElement && document.activeElement.id
      }));
      return { ok: r.found, v: { q: name, ...r } };
    }
  },
  {
    id: 'B-T4',
    scr: 'tree',
    st: ['jewel'],
    go: () => {
      U.idle();
      navGo('tree');
      DBG.step(66);
      const has = typeof treeSockOpen === 'function';
      let ok = false;
      if (has) {
        try {
          treeSockOpen(0);
          DBG.step(300);
          ok = !!document.querySelector('#ptree .tsock, #ptree .jw, #tcard:not([hidden])');
        } catch (e) {}
      }
      return { ok: TREE.open && ok, v: { sock: ok }, checks: { jewel: ok ? 'panel' : 'locked/none' } };
    }
  },
  {
    id: 'B-T5',
    scr: 'tree',
    st: ['reset'],
    go: () => {
      U.idle();
      navGo('tree');
      DBG.step(66);
      const c = PTREE.N.find(n => treeCan(n.id) && !(S.pt || []).includes(n.id)).id;
      treeToggle(c);
      DBG.step(66);
      const b = $('treset');
      if (b) b.click();
      DBG.step(66);
      const t = U.txt($('treset'));
      return { ok: /再按一次/.test(t), v: { treset: t } };
    }
  },
  {
    id: 'B-A1',
    scr: 'asc',
    st: ['pick', 'path', 'taken'],
    star: 1,
    go: (st, port) => {
      U.idle();
      /* 昇華要祭壇 Lv7（midgame 是 6）：升到 7，記進 checks */
      const a0 = S.camp.altar;
      while (lockTxt('asc') && S.camp.altar < CAMP.altar.length) S.camp.altar++;
      U.re();
      openPanel('asc');
      DBG.step(66);
      if (!PANEL.asc) return { ok: false, v: { asc: PANEL.asc, lock: lockTxt('asc') } };
      const ks = Object.keys(ASC);
      if (st === 'path') (ASCUI.v = ks[1]), (ASCUI.pick = 0), hudPanels();
      if (st === 'taken') {
        S.asc = ks[0];
        S.at = S.at && S.at.length ? S.at : ['a_st'];
        U.re();
        openPanel('asc');
      }
      DBG.step(66);
      return {
        ok: PANEL.asc && (st === 'taken' ? !!S.asc : !S.asc),
        v: { v: ASCUI.v, pick: ASCUI.pick, asc: S.asc || null },
        checks: { altar: a0 + '→' + S.camp.altar }
      };
    }
  },
  /* ---------- §12 追逐、掉落紀錄、山海寶盒、名詞、焦點 ---------- */
  {
    id: 'B-Y1',
    scr: 'chase',
    st: ['list', 'pick', 'swap'],
    star: 1,
    go: st => {
      U.idle();
      const k = CHASE_POOL.trunk[0];
      S.chase.got[k] = (S.chase.got[k] || 0) + 1;
      S.frags[k] = (S.frags[k] || 0) + 2;
      if (S.chase.seen) S.chase.seen.on = 1;
      if (st === 'swap') {
        S.eq.ring1.r = 2;
        S.eq.ring1.wy = CHASE_POOL.trunk[1];
      }
      U.re();
      openPanel('chase');
      DBG.step(33);
      if (st !== 'list') {
        CHSEL = k;
        CHUI.v = 'pick';
        hudPanels();
      }
      if (st === 'swap') {
        CHUI.slot = 'ring1';
        CHUI.v = 'swap';
        hudPanels();
      }
      DBG.step(66);
      return { ok: PANEL.chase && (st === 'list' ? !CHUI.v : CHUI.v === st), v: { v: CHUI.v, slot: CHUI.slot } };
    }
  },
  {
    id: 'B-Y2',
    scr: 'log',
    st: ['pity'],
    go: () => {
      U.idle();
      const c = Object.keys(CUR);
      for (let i = 0; i < 12; i++) dropLog(CUR[c[i % c.length]].n, /3$/.test(c[i % c.length]) ? 'perf' : 'cur');
      dropLog('★ 項鍊', 'frac');
      const k = CHASE_POOL.trunk[0];
      dropLog(chaseBanner(k), 'chase', k);
      openPanel('log');
      DBG.step(66);
      return { ok: M42.vis($('plog')), v: { n: (S.log || []).length } };
    }
  },
  {
    id: 'B-Y3',
    scr: 'box',
    st: ['fd', 'sin', 'xi', 'army', 'god'],
    go: st => {
      U.idle();
      openPanel('box');
      if (!PANEL.box) return { ok: false, v: { box: false, lock: lockTxt('box') } };
      BOXUI.tab = st;
      hudPanels();
      DBG.step(66);
      return { ok: PANEL.box && BOXUI.tab === st, v: { tab: BOXUI.tab } };
    }
  },
  {
    id: 'B-Y4',
    scr: 'term',
    st: ['card'],
    node: async (p, st, port) => {
      await p.evaluate(() => {
        U.idle();
        navGo('skill');
        document.querySelector('#pskill [data-sk="go:one:1"]').click();
        DBG.step(66);
        M42.finishAnims();
        const t = document.querySelector('#pskill [data-term]');
        if (t) t.scrollIntoView({ block: 'center' });
      });
      await p.waitForTimeout(300);
      /* 名詞在說明段落裡（半版要捲到）：取畫面上看得到的那一個的矩形再點 */
      const c = await p.evaluate(() => {
        const t = [...document.querySelectorAll('#pskill [data-term]')].find(M42.vis);
        if (!t) return null;
        t.scrollIntoView({ block: 'center' });
        const b = t.getClientRects()[0] || t.getBoundingClientRect();
        return b.width ? [b.x + b.width / 2, b.y + b.height / 2] : null;
      });
      if (!c) return { ok: false, v: { term: 0 } };
      await p.waitForTimeout(200);
      if (port) await p.touchscreen.tap(c[0], c[1]);
      else await p.mouse.click(c[0], c[1]);
      await p.waitForTimeout(400);
      const r = await p.evaluate(
        () => (
          M42.finishAnims(),
          { ttip: M42.vis($('ttip')), R: M42.vis($('ttip')) ? M42.R($('ttip')) : null, W: innerWidth }
        )
      );
      return { ok: r.ttip, v: r, checks: { inside: r.R ? +(r.R[0] >= 0 && r.R[0] + r.R[2] <= r.W) : '' } };
    }
  },
  {
    id: 'B-Y5',
    scr: 'focus',
    st: ['tour'],
    na: { P: '直立沒有鍵盤焦點巡覽' },
    node: async (p, st, port) => {
      await p.evaluate(() => U.idle());
      const stops = [];
      for (let i = 0; i < 12; i++) {
        await p.keyboard.press('Tab');
        await p.waitForTimeout(60);
        stops.push(
          await p.evaluate(() =>
            document.activeElement && document.activeElement !== document.body
              ? M42.sel(document.activeElement) + ' ' + getComputedStyle(document.activeElement).outlineWidth
              : 'body'
          )
        );
      }
      return { ok: stops.some(s => s !== 'body'), v: { stops: stops.length }, checks: { stops: stops.join(' | ') } };
    }
  }
];
module.exports = { ROWS, SKB };
