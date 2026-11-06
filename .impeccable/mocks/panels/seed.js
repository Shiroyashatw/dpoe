/* mock 用的存檔：Lv72、打到 13 階、5 招技能等級參差、能力值夠、靈魂夠。只存在 ?p=mock 這個存檔槽 */
function mockSeed(o = {}) {
  S.lv = 72;
  S.maxT = o.maxT || 13;
  S.frag = 60;
  S.hint0 = 1;
  S.gold = 80000;
  const M = MAT();
  M.soul = o.soul ?? 24000;
  M.dust = 900;
  M.fine = 40;
  M.rare = 12;
  S.eq.weapon = mkItem('w_sword1_3', 16, 0);
  S.eq.ring2 = mkItem('r_iron', 16, 0);
  S.eq.ring2.a = [{ k: 'attrA', v: o.attr ?? 70, T: 1 }];
  const gem = (k, lv, so, sups = []) => {
    const g = mkGem(k);
    g.lv = lv;
    if (so) {
      g.so = so;
      g.sup = Array.from({ length: so }, (_, i) => {
        const s = sups[i];
        if (!s) return null;
        const x = mkGem(s[0]);
        x.lv = s[1];
        x.q = s[2] || 0;
        return x;
      });
    }
    return g;
  };
  S.skills[0].a = gem('slash', 12, 4, [['fury', 8], ['crit', 8, 6], ['area', 5], null]);
  S.skills[1].a = gem('whirl', 9, 3, [['haste', 4], ['leech', 6], null]);
  S.skills[2].a = gem('iai', 14, 5, [['heavy', 9], ['bleed', 3], ['ailmag', 6], ['crit', 4], null]);
  S.skills[3].a = gem('frostbolt', 6, 2, [['multi', 2]]);
  S.skills[4].a = o.empty ? null : gem('mirage', 3, 2, []);
  S.auras[0] = gem('anger', 7);
  S.auras[1] = gem('iron', 4);
  S.auras[2] = null;
  S.inv.items.length = 0;
  S.cards = null;
  S.asc = o.asc || null;
  S.at = ['a_st'];
  if (o.asc && o.at) S.at.push(...o.at.map(x => 'a_' + x));
  gridAuto(S.inv, mkGem('pierce'));
  gridAuto(S.inv, mkGem('rend'));
  gridAuto(S.inv, mkGem('cdr'));
  gridAuto(S.inv, mkGem('haste', 6));
  SKUI.sel = '0:a';
  SKUI.calc = 0;
  ASCUI.v = o.asc || null;
  ASCUI.n = null;
  changed();
  save();
}
/* 工具列：只有 mock 有，不是設計的一部分 */
(() => {
  const q = new URLSearchParams(location.search);
  if (!localStorage.getItem('mock-seeded' + SLOT) || q.has('fresh')) {
    mockSeed();
    localStorage.setItem('mock-seeded' + SLOT, 1);
  }
  if (q.has('shot')) return;
  const d = document.createElement('div');
  d.id = 'mockbar';
  d.innerHTML = `<b>MOCK</b><button data-m="skill">寶石</button><button data-m="dev">地圖台</button><button data-m="asc">昇華</button><button data-m="hunt">預留</button><button data-m="reset">重來</button>`;
  document.body.appendChild(d);
  d.addEventListener('click', e => {
    const k = e.target.dataset.m;
    if (!k) return;
    closePanels();
    if (k === 'skill') openPanel('skill');
    if (k === 'dev') openPanel('device');
    if (k === 'asc') openPanel('asc');
    if (k === 'hunt') (MOCKHUNT.on = !MOCKHUNT.on), openPanel('device');
    if (k === 'reset') mockSeed();
  });
})();
