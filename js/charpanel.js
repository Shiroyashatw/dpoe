/* 角色頁桌機 1280×720（S/M2-character-1280.md ＋ M2-character.md v1.1；示意圖 W3-character/color 01、02、03、04a、04b、07）。
   右欄 #pinv（788,76 476×486）加 .c12，裡面照規格座標絕對定位（左上角＝右欄左上角）。直立（PORT）仍走 hud.js 的 invHTML。
   CH：edit 編輯釘選、menu 長按選單開著的數值鍵、hov 比較浮窗的候選 id、alt 按住 Alt／手把 Y、o 候選排序、f 篩選、op 分組展開 */
const CH = {
  edit: 0,
  menu: null,
  hov: null,
  alt: 0,
  o: 'j',
  f: 'all',
  op: { atk: 1, core: 1 }
};
const chOn = () => !PORT() && NAV.view === 'char' && !NAV.pick && CHSW == null;
/* 裝備格（規格「已定決策」）：左柱 x 796、右柱 x 1192；y 146 起每格 70（64＋間距 6） */
const CH_L = ['helm', 'chest', 'gloves', 'belt', 'boots', 'gh'],
  CH_R = ['weapon', 'off', 'amulet', 'ring1', 'ring2', 'ring3'];
/* 預設釘選（mumi 11/21 12:51 案 A）：暴擊率、攻擊速度、護甲、閃避率、格擋率，空一格 */
const PIN_DEF = ['crit', 'aps', 'armor', 'evr', 'block', null];
const pins = () => (S.pin = Array.isArray(S.pin) && S.pin.length === 6 ? S.pin : PIN_DEF.slice());
const ch_pct = v => `${Math.round(v * 10) / 10}%`,
  ch_inc = v => (v ? `增加 ${Math.round(v)}%` : null),
  ch_rng = a => (a && a[1] ? `${Math.round(a[0])}–${Math.round(a[1])}` : null);
/* 數值清單：[鍵, 名稱, 值（null＝不列）]；分組 [鍵, 名稱, 子組 [鍵, 名稱, 項目]] */
const CH_G = [
  [
    'atk',
    '攻擊／法術',
    [
      [
        'core',
        '核心',
        [
          ['dmg', '武器傷害', s => ch_rng(s.dmg)],
          ['aps', '攻擊速度', s => `${s.aps.toFixed(2)}／秒`],
          ['crit', '暴擊率', s => ch_pct(s.crit)],
          ['critm', '暴擊傷害加成', s => `+${Math.round((s.critM - 1) * 100)}%`],
          ['hit', '命中率', s => `${Math.round(100 * hitChance(s.acc, mobEv(S.lv)))}%`],
          ['acc', '命中值', s => fullN(s.acc, 'own')],
          ...['phys', 'fire', 'cold', 'light', 'chaos'].map(k => [
            'add_' + k,
            `附加${ELN[k]}傷害`,
            s =>
              ch_rng(
                k === 'phys'
                  ? s.flat
                  : [
                      (s.add[k] || [0, 0])[0] + (s.wadd[k] || [0, 0])[0],
                      (s.add[k] || [0, 0])[1] + (s.wadd[k] || [0, 0])[1]
                    ]
              )
          ])
        ]
      ],
      [
        'incd',
        '傷害增加',
        [
          ['dmgA', '傷害', s => ch_inc(s.dmgA)],
          ['atkP', '攻擊傷害', s => ch_inc(s.atkP)],
          ['spellP', '法術傷害', s => ch_inc(s.spellP)],
          ['physP', '物理傷害', s => ch_inc(s.physP)],
          ['eleP', '元素傷害', s => ch_inc(s.eleP)],
          ...['fire', 'cold', 'light', 'chaos'].map(k => [k + 'P', `${ELN[k]}傷害`, s => ch_inc(s[k + 'P'])]),
          ['aoe', '範圍效果', s => ch_inc(s.aoe)],
          ['castP', '施放速度', s => ch_inc(s.castP)]
        ]
      ]
    ]
  ],
  [
    'def',
    '防禦',
    [
      [
        '',
        '',
        [
          ['hp', '生命', s => fullN(s.hp, 'own')],
          ['es', '能量護盾', s => fullN(s.es, 'own')],
          ['mp', '魔力', s => fullN(s.mp, 'own')],
          ['armor', '護甲', s => fullN(s.armor, 'own')],
          ['ev', '閃避值', s => (s.ev ? fullN(s.ev, 'own') : null)],
          ['evr', '閃避率', s => `${Math.round(100 * (1 - hitChance(15 + 6 * S.lv, s.ev)))}%`],
          ['block', '格擋率', s => `${s.block}%${s.blockOver ? ` 超限 +${s.blockOver}%` : ''}`],
          [
            'defl',
            '偏斜率',
            s => (s.defl ? `${Math.round(capLuck(deflCh(15 + 6 * S.lv, s.defl), 95, s.lukDefl))}%` : null)
          ],
          ['thorn', '荊棘', s => ch_rng(s.thornAdd)]
        ]
      ]
    ]
  ],
  [
    'spd',
    '速度與冷卻',
    [
      [
        '',
        '',
        [
          ['ms', '移動速度', s => ch_inc(s.ms)],
          ['cdr', '冷卻回復速度', s => ch_inc(s.cdr)]
        ]
      ]
    ]
  ],
  [
    'attr',
    '能力值',
    [
      [
        '',
        '',
        [
          ...ATTR.map(k => [k, ATTN[k], s => fullN(s[k], 'own')]),
          ['spirit', '精魂', s => `${s.spiritUsed}／${s.spirit}`]
        ]
      ]
    ]
  ]
];
const CH_ALL = CH_G.flatMap(g => g[2].flatMap(x => x[2]));
const chStat = k => CH_ALL.find(x => x[0] === k);
const chVal = (k, s = ST) => {
  const e = chStat(k);
  return e ? e[2](s) : null;
};
/* 名詞提示：有 TERMS 的名詞寫 TERMS；抗性寫「火焰抗性 75%・最大火焰抗性 75%。」 */
const chTerm = n => (TERMS[n] ? ` data-tm2="${esc(TERMS[n])}" tabindex="0"` : '');
/* ---------- 比較判定（M2-character §9）：DPS 與有效生命（生命上限＋能量護盾上限），≥ +2% 升、< −1% 降 ---------- */
const JDG = new Map();
function chJudge(it, k) {
  const sig = upSig(S) + k,
    c = JDG.get(it.id);
  if (c && c[0] === sig) return c[1];
  const d = itemDelta(it, k);
  let j = '';
  if (!d.why) {
    if (!S.eq[k]) j = '▲';
    else {
      const [a, b] = d.st,
        el = x => (x.esMana ? x.hp : x.hp + x.es),
        p = [d.dps[1], el(a) ? ((el(b) - el(a)) / el(a)) * 100 : 0],
        up = p.map(v => v >= 2),
        dn = p.map(v => v < -1);
      j =
        up.some(Boolean) && !dn.some(Boolean)
          ? p.some(v => v >= 25)
            ? '▲▲'
            : '▲'
          : dn.some(Boolean) && !up.some(Boolean)
            ? '▼'
            : up.some(Boolean)
              ? '±'
              : '—';
    }
  }
  if (JDG.size > 400) JDG.clear();
  JDG.set(it.id, [sig, j]);
  return j;
}
const JORD = { '▲▲': 0, '▲': 1, '±': 2, '—': 3, '▼': 4, '': 5 };
function chCands(k) {
  const L = slotCands(k).filter(it => CH.f !== 'lock' || !it.lock);
  const J = L.map(it => [it, chJudge(it, k)]).filter(([, j]) => CH.f !== 'up' || j === '▲' || j === '▲▲');
  if (CH.o === 'j') J.sort((a, b) => JORD[a[1]] - JORD[b[1]] || b[0].id - a[0].id);
  else J.sort((a, b) => b[0].id - a[0].id);
  return J;
}
/* ---------- 格子 ---------- */
const chJcls = j => (j === '▲' || j === '▲▲' ? 'c-good' : j === '▼' ? 'c-bad' : 'c-dim');
function chCell(it, attrs, j) {
  const b = bestA(it);
  return `<div class="cq r${it.r} ${it.cor ? 'co' : ''}" ${attrs} aria-label="${esc(itemName(it))}">${icHTML(itemIc(it))}${j ? `<i class="cj ${chJcls(j)}">${j}</i>` : ''}${b && b <= itemT(it) ? '<i class="cs">✦</i>' : ''}${it.frac ? '<i class="cx">★</i>' : it.mem ? '<i class="cx">◆</i>' : ''}${it.lock ? `<i class="ck">${ICO.lock}</i>` : ''}</div>`;
}
function chSlot(k, x, y) {
  const st = `style="left:${x}px;top:${y}px"`;
  if (k === 'gh') {
    const g = S.godOn != null && (S.gods || [])[S.godOn];
    if (S.lv < GH_LV || (!g && lockTxt('line:rift')))
      return `<div class="cq emp lock" ${st} data-c="lk" data-lk="${esc(lockSlotTxt('gh'))}"><span class="nm">神格</span><i class="ck">${ICO.lock}</i></div>`;
    return `<div class="cq ${g ? 'r2' : 'emp'}" ${st}>${g ? icHTML('z_' + g.g) : '<span class="nm">神格</span>'}</div>`;
  }
  if (k === 'ring3' && !eqOpen(S, 'ring3')) return '';
  const e = EQS.find(q => q.k === k),
    it = S.eq[k],
    sel = NAV.slot === k ? 'sel' : '';
  if (!eqOpen(S, k))
    return `<div class="cq emp lock" ${st} data-c="lk" data-lk="${esc(e.n + '：被昇華鎖住，退點才能用')}"><span class="nm">${e.n}</span><i class="ck">${ICO.lock}</i></div>`;
  if (it)
    return chCell(it, `${st} data-c="eq:${k}" tabindex="0" role="button"`).replace('class="cq', `class="cq ${sel}`);
  const L = slotCands(k),
    up = L.some(c => chJudge(c, k) === '▲' || chJudge(c, k) === '▲▲');
  return `<div class="cq emp ${sel}" ${st} data-c="eq:${k}" tabindex="0" role="button" aria-label="${esc(strT('slotAria', { s: e.n, n: L.length }))}"><span class="sil">${icHTML(slotIc(e))}</span><span class="nm">${e.n}</span>${L.length ? `<em class="cn ${up ? 'c-good' : ''}">${L.length}</em>` : ''}</div>`;
}
/* ---------- 角色數值（01、02、03） ---------- */
function chStatsHTML() {
  const P = pins(),
    n = P.filter(Boolean).length,
    card = (k, x, y, fix) => {
      const e = k && chStat(k),
        v = e && e[2](ST);
      if (!e)
        return `<button class="cc emp" style="left:${x}px;top:${y}px" data-c="pinadd"><small>＋ 釘選數值</small><b>空位</b></button>`;
      return `<${fix ? 'div' : 'button'} class="cc" style="left:${x}px;top:${y}px" ${fix ? '' : `data-c="pin:${k}"`}><small${chTerm(e[1])}>${e[1]}</small><b>${v == null ? '—' : v}</b>${CH.edit && !fix ? '<i class="cst">★</i>' : ''}</${fix ? 'div' : 'button'}>`;
    },
    cards = [
      ...['hp', 'es', 'mp'].map((k, i) => card(k, 80 + 106 * i, 146, 1)),
      ...P.map((k, i) => card(k, 80 + 106 * (i % 3), 182 + 36 * Math.floor(i / 3)))
    ].join(''),
    head = CH.edit
      ? `<div class="cdps"><b class="pe">已釘 ${n}／6</b><small>點 ☆ 釘選</small></div><button class="btn pri cdone" data-c="edit">完成</button>`
      : `<div class="cdps"><small>DPS</small><b>${fullN(dps(ST), 'own')}</b></div><button class="btn cedit" data-c="edit">編輯釘選</button>`;
  let list = '';
  for (const [gk, gn, subs] of CH_G) {
    const rows = subs.map(([sk, sn, L]) => [sk, sn, L.map(e => [e, e[2](ST)]).filter(([, v]) => v != null)]),
      cnt = rows.reduce((a, r) => a + r[2].length, 0);
    if (!cnt) continue;
    list += `<button class="cg" data-c="op:${gk}" aria-expanded="${!!CH.op[gk]}">${CH.op[gk] ? '▾' : '▸'} ${gn}<small>${cnt} 項</small></button>`;
    if (!CH.op[gk]) continue;
    for (const [sk, sn, R] of rows) {
      if (!R.length) continue;
      if (sn)
        list += `<button class="cg sub" data-c="op:${sk}" aria-expanded="${!!CH.op[sk]}">${CH.op[sk] ? '▾' : '▸'} ${sn}<small>${R.length} 項</small></button>`;
      if (sn && !CH.op[sk]) continue;
      list += R.map(
        ([e, v]) =>
          `<div class="cr ${CH.menu === e[0] ? 'on' : ''}" data-c="row:${e[0]}"><span${chTerm(e[1])}>${e[1]}</span><b>${v}</b>${CH.edit ? `<button class="cpin" data-c="star:${e[0]}" aria-label="${P.includes(e[0]) ? '取消釘選' : '釘選'}" aria-pressed="${P.includes(e[0])}">${P.includes(e[0]) ? '★' : '☆'}</button>` : ''}</div>`
      ).join('');
    }
  }
  const m = CH.menu && chStat(CH.menu);
  const menu = m
    ? `<div class="cmenu" role="menu"><b>${m[1]}　${m[2](ST)}</b>${TERMS[m[1]] ? `<p>${esc(TERMS[m[1]])}</p>` : ''}${
        P.includes(m[0])
          ? `<button class="btn" data-c="star:${m[0]}">取消釘選</button>`
          : `<button class="btn" data-c="star:${m[0]}" ${n >= 6 ? 'disabled' : ''}>釘到摘要</button>`
      }<small>${n >= 6 && !P.includes(m[0]) ? '已滿，先取消一個' : `目前 ${n}／6，還可再釘 ${6 - n} 個`}</small><button class="btn" data-c="edit">編輯釘選</button></div>`
    : '';
  return `${head}${cards}<div class="c12l">${list}</div>${menu}`;
}
/* ---------- 候選裝備（04a、04b、07） ---------- */
function chCandHTML() {
  const k = NAV.slot,
    e = EQS.find(q => q.k === k),
    cur = S.eq[k],
    all = slotCands(k);
  if (!all.length)
    return `<b class="cet">${e.n}　空著</b><p class="cep">${strT('noCand', { s: e.n })}</p><button class="btn pri cmk" data-a="mkslot:${k}">${STR_T.mkSlot}</button>`;
  const J = chCands(k),
    up = all.filter(it => ['▲', '▲▲'].includes(chJudge(it, k))).length,
    chip = (v, t) =>
      `<button class="chip ${CH.f === v ? 'on' : ''}" data-c="f:${v}" aria-pressed="${CH.f === v}">${t}</button>`;
  return `<b class="cnt">${cur ? `現在：${esc(itemName(cur))}` : `${e.n}　空著`}</b><small class="cns">可以換的 ${all.length} 件，▲ ${up}</small><button class="cx2" data-c="slotx" aria-label="收起">${ICO.x}</button>
  <button class="chip csort" data-c="sort">${CH.o === 'j' ? '判定' : '最新'} ▾</button><div class="cflt">${chip('all', '全部')}${chip('up', '只看 ▲')}${chip('lock', '未鎖')}</div>
  <div class="c12g">${J.map(([it, j]) => chCell(it, `data-c="cand:${it.id}" tabindex="0" role="button"`, j)).join('') || '<p class="cnone">沒有符合篩選的裝備</p>'}</div>${chCmpHTML()}`;
}
/* 比較浮窗（04a 簡易／04b 詳細）：五層——① 身分 ② 基底 ③ 詞綴 ④ 換上 ⑤ 操作；懸停立即出現，不接滑鼠（pointer-events: none） */
function chBase(it) {
  if (!it) return [];
  const B = baseOf(it),
    b = B.b,
    m = qMul(it),
    q = it.q > 0,
    o = (n, v0) => [n, Math.round(v0 * m), q ? Math.round(v0) : null];
  const L = [];
  if (b.dmg && !SPELLW.has(B.wt || 'sword')) {
    L.push([
      '物理傷害',
      `${Math.round(b.dmg[0] * m)}–${Math.round(b.dmg[1] * m)}`,
      q ? `${b.dmg[0]}–${b.dmg[1]}` : null
    ]);
    L.push(['攻擊速度', b.as.toFixed(2), null], ['暴擊率', `${5 + (b.crit || 0)}%`, null]);
  } else {
    const dn = { armor: '護甲', ev: '閃避值', es: '能量護盾' };
    for (const k of DEFK) if (b[k]) L.push(o(dn[k], b[k]));
    if (b.block) L.push(['格擋率', `${b.block}%`, null]);
  }
  L.push(['品質', it.q ? `+${Math.round(it.q * 100)}%` : '—', null]);
  return L;
}
function chAffs(it, det) {
  if (!it) return '';
  const A = it.a || [],
    t = itemT(it);
  return A.map(a => {
    const r = det && !Array.isArray(a.v) && AFF[a.k].r ? tierRange(a.k, a.T) : null;
    return `<li><b>${esc(affText(a))}</b>${det ? `<small>${r ? `(${r[0]}–${r[1]}) ` : ''}T${a.T}${a.T <= t ? ' ✦' : ''}${isFrac(it, a) ? ' 破裂' : ''}</small>` : ''}</li>`;
  }).join('');
}
function chCmpHTML() {
  const k = NAV.slot,
    it = CH.hov != null && S.inv.items.find(x => x.id === CH.hov);
  if (!it || !k) return '';
  const cur = S.eq[k],
    e = EQS.find(q => q.k === k),
    det = CH.alt,
    j = chJudge(it, k),
    nm = x => `<b class="rc${x.r}">${x.r === 2 ? '◆ ' : ''}${esc(itemName(x))}</b>`,
    sub = x => `<small>${e.n}・物品等級 ${x.L}</small>`,
    side = x => {
      if (!x) return '';
      const p = (x.a || []).filter(a => AFF[a.k].p).length,
        s = (x.a || []).length - p,
        c = sideCap(x);
      return `前綴 ${p}／${c}${p + s < 2 * c ? `　空位 ${2 * c - p - s}` : ''}`;
    },
    B0 = chBase(cur),
    B1 = chBase(it),
    bcol = L =>
      L.map(
        ([n, v, o]) =>
          `<div class="kv"><small>${n}</small><b>${v}</b>${det && o != null ? `<small>(${o})</small>` : ''}</div>`
      ).join(''),
    d = itemDelta(it, k),
    dl = d.why
      ? `<span class="c-bad">${esc(d.why)}</span>`
      : [
          ['DPS', d.dps[0]],
          ['生命', d.hp],
          ['能量護盾', d.es]
        ]
          .map(([n, v]) => [n, Math.round(v)])
          .filter(([, v]) => v)
          .map(
            ([n, v]) =>
              `<span class="${v > 0 ? 'c-good' : 'c-bad'}">${n} ${v > 0 ? '+' + fullN(v) : '−' + fullN(-v)} ${v > 0 ? '▲' : '▼'}</span>`
          )
          .join('') || '<span class="c-dim">沒有變化</span>';
  return `<div class="c12p ${det ? 'det' : ''}" role="dialog" aria-label="比較">
  <small class="pcap">懸浮時才出現${det ? '・按住 Alt／Y 中' : ''}</small>
  <section class="l1"><div><small>身分　身上</small>${cur ? nm(cur) + sub(cur) : '<b>空著</b>'}</div><div><small>候選${j ? `（${j}）` : ''}</small>${nm(it)}${sub(it)}</div></section>
  <section class="l2"><small class="lh">基底</small><div>${bcol(B0)}</div><div>${bcol(B1)}</div></section>
  <section class="l3"><small class="lh">詞綴${det && cur ? `　${side(cur)}` : ''}</small>${det ? `<small class="lh r">${side(it)}　✦＝最好階</small>` : ''}<ul>${chAffs(cur, det)}</ul><ul>${chAffs(it, det)}</ul></section>
  <section class="l4"><small class="lh">換上</small><p>${dl}</p></section>
  <section class="l5"><small class="lh">操作</small><p>Ⓐ 裝備　Ｘ 鎖定　Ｒ3 名詞</p><kbd>${det ? '放開' : '按住'} Alt</kbd><kbd>Y</kbd></section></div>`;
}
/* ---------- 整頁 ---------- */
function charHTML() {
  if (NAV.slot && !EQS.some(q => q.k === NAV.slot)) NAV.slot = null;
  const cand = !!NAV.slot,
    a = S.asc && ASC[S.asc],
    xp = Math.round((100 * S.xp) / xpNeed(S.lv)),
    pen = G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0;
  return `<div class="chd"><b>角色</b>${a ? icHTML(a.ic, 'asc') + `<span>${esc(a.n)}</span>` : ''}<span>Lv ${S.lv}</span></div><div class="cxp"><i><i style="width:${xp}%"></i></i><span>${xp}%</span></div>
  <button class="cclose" data-a="close" aria-label="關閉">${ICO.x}<kbd>V／Esc</kbd></button>
  <div class="cres"><small>角色抗性</small>${RESK.map(r => {
    const v = effRes(r);
    return `<span class="${v < 0 ? 'neg' : ''}" tabindex="0" data-tm2="${ELN[r]}抗性 ${v}%・最大${ELN[r]}抗性 ${ST.maxRes[r]}%。${pen ? `（這一階 −${pen}%）` : ''}">${ELN[r]} ${String(v).replace('-', '−')}%</span>`;
  }).join('')}</div>
  ${CH_L.map((k, i) => chSlot(k, 8, 70 + 70 * i)).join('')}${CH_R.map((k, i) => chSlot(k, 404, 70 + 70 * i)).join('')}
  <button class="ctg ${cand ? '' : 'on'}" data-c="tab:stats" aria-pressed="${!cand}">角色數值</button><button class="ctg r ${cand ? 'on' : ''}" data-c="tab:cand" aria-pressed="${cand}">候選裝備</button>
  ${cand ? chCandHTML() : chStatsHTML()}`;
}
/* 比較浮窗只換自己（不重畫整個面板，捲動與焦點都留著） */
function chCmpSync() {
  const p = $('pinv'),
    o = p.querySelector('.c12p'),
    h = chCmpHTML();
  if (o) h ? (o.outerHTML = h) : o.remove();
  else if (h) p.insertAdjacentHTML('beforeend', h);
}
function chHov(id) {
  if (CH.hov === id) return;
  CH.hov = id;
  chCmpSync();
}
/* ---------- 名詞提示：停留 0.4 秒（手把 R3），放在右欄左邊的戰場側 ---------- */
let CTM_T = 0,
  CTM_EL = null;
function chTermShow(el) {
  let t = $('ctm');
  if (!t) document.body.insertAdjacentHTML('beforeend', '<div id="ctm" role="tooltip" hidden></div>'), (t = $('ctm'));
  t.innerHTML = `<small>名詞提示　停留 0.4 秒／手把 Ｒ3</small><p>${esc(el.dataset.tm2)}</p>`;
  const r = (el.closest('.cres') || el).getBoundingClientRect(),
    pr = $('pinv').getBoundingClientRect();
  t.hidden = false;
  t.style.left = pr.left - 12 - t.offsetWidth + 'px';
  t.style.top = Math.max(8, r.top - 12) + 'px';
}
function chTermHide() {
  clearTimeout(CTM_T);
  if ($('ctm')) $('ctm').hidden = true;
}
/* ---------- 輸入 ---------- */
let CH_LP = 0,
  CH_LPF = 0;
function chAct(c, el) {
  const P = pins();
  if (c.startsWith('eq:')) {
    const k = c.slice(3);
    NAV.slot = NAV.slot === k ? null : k;
    CH.hov = null;
    CH.menu = null;
  } else if (c === 'lk') return hudWarn(el.dataset.lk);
  else if (c === 'tab:stats') (NAV.slot = null), (CH.hov = null);
  else if (c === 'tab:cand') {
    if (!NAV.slot) return hudWarn('先點一個裝備格');
  } else if (c === 'slotx') (NAV.slot = null), (CH.hov = null);
  else if (c === 'edit') (CH.edit = CH.edit ? 0 : 1), (CH.menu = null);
  else if (c.startsWith('op:')) CH.op[c.slice(3)] = CH.op[c.slice(3)] ? 0 : 1;
  else if (c.startsWith('star:') || (c.startsWith('pin:') && CH.edit)) {
    const k = c.slice(c.indexOf(':') + 1),
      i = P.indexOf(k);
    if (i >= 0) P[i] = null;
    else {
      const j = P.indexOf(null);
      if (j < 0) return hudWarn('已滿，先取消一個');
      P[j] = k;
    }
    CH.menu = null;
    save();
  } else if (c === 'pinadd') (CH.edit = 1), (CH.menu = null);
  else if (c.startsWith('pin:')) return;
  else if (c === 'sort') CH.o = CH.o === 'j' ? 'new' : 'j';
  else if (c.startsWith('f:')) CH.f = c.slice(2);
  else if (c.startsWith('cand:')) return chEquip(+c.slice(5));
  else if (c.startsWith('row:')) return;
  sfx('click');
  hudPanels();
}
function chEquip(id) {
  const it = S.inv.items.find(x => x.id === id),
    k = NAV.slot;
  if (!it || !k) return;
  const n = S.inv.items.length;
  equipTo(it, k);
  if (S.inv.items.length !== n || S.eq[k] === it) (CH.hov = null), changed();
}
/* X＝鎖定身上裝備（選中的格；沒選就是滑鼠底下的身上格） */
function chLock() {
  const h = document.querySelector('#pinv [data-c^="eq:"]:hover'),
    k = NAV.slot || (h && h.dataset.c.slice(3)),
    it = k && S.eq[k];
  if (it) lockToggle(it);
}
function chInit() {
  const p = $('pinv');
  p.addEventListener('click', e => {
    if (!p.classList.contains('c12')) return;
    /* 長按開了選單：放開時那一下 click 不算 */
    if (CH_LPF) return void (CH_LPF = 0);
    const el = e.target.closest('[data-c]');
    if (!e.target.closest('.cmenu') && CH.menu && !(el && el.dataset.c.startsWith('star:'))) {
      CH.menu = null;
      if (!el) return hudPanels();
    }
    if (el) e.stopPropagation(), chAct(el.dataset.c, el);
  });
  /* 長按數值列（0.5 秒）或右鍵＝選單（02） */
  p.addEventListener('pointerdown', e => {
    CH_LPF = 0;
    const r = p.classList.contains('c12') && !CH.edit && e.target.closest('[data-c^="row:"]');
    clearTimeout(CH_LP);
    if (r) CH_LP = setTimeout(() => ((CH.menu = r.dataset.c.slice(4)), (CH_LPF = 1), chTermHide(), hudPanels()), 500);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) p.addEventListener(ev, () => clearTimeout(CH_LP));
  p.addEventListener('contextmenu', e => {
    const r = p.classList.contains('c12') && !CH.edit && e.target.closest('[data-c^="row:"]');
    if (r) e.preventDefault(), (CH.menu = r.dataset.c.slice(4)), hudPanels();
  });
  const over = el => {
    if (!p.classList.contains('c12')) return;
    const c = el && el.closest('[data-c^="cand:"]');
    chHov(c ? +c.dataset.c.slice(5) : null);
    const t = el && el.closest('[data-tm2]'),
      tx = e => e && e.dataset.tm2;
    /* 比字不比元素：戰鬥中面板重畫，同一個名詞不重算 0.4 秒 */
    if (tx(t) !== tx(CTM_EL)) {
      chTermHide();
      CTM_EL = t;
      if (t)
        CTM_T = setTimeout(() => {
          /* 戰鬥中面板會重畫：找同一個名詞的新元素 */
          const n = t.isConnected ? t : p.querySelector(`[data-tm2="${CSS.escape(t.dataset.tm2)}"]`);
          if (n) chTermShow(n);
        }, 400);
    }
  };
  p.addEventListener('pointerover', e => e.pointerType === 'mouse' && over(e.target));
  p.addEventListener('pointerleave', () => (chHov(null), chTermHide(), (CTM_EL = null)));
  p.addEventListener(
    'focusin',
    e => e.target.closest('[data-c^="cand:"]') && chHov(+e.target.closest('[data-c^="cand:"]').dataset.c.slice(5))
  );
  addEventListener(
    'keydown',
    e => {
      if (!PANEL.inv || !p.classList.contains('c12')) return;
      if (e.key === 'Alt') return e.preventDefault(), CH.alt || ((CH.alt = 1), chCmpSync());
      const t = e.target;
      if (t && t.closest && t.closest('#pinv') && (e.key === 'Enter' || e.key === ' ') && t.dataset.c)
        return e.preventDefault(), e.stopImmediatePropagation(), chAct(t.dataset.c, t);
      if (e.key.toLowerCase() === 'x' && !e.repeat && !(t && t.matches && t.matches('input,textarea'))) chLock();
    },
    true
  );
  addEventListener('keyup', e => e.key === 'Alt' && CH.alt && (e.preventDefault(), (CH.alt = 0), chCmpSync()), true);
  addEventListener('blur', () => CH.alt && ((CH.alt = 0), chCmpSync()));
  addEventListener('gamepadconnected', () => PADW.on || ((PADW.on = 1), requestAnimationFrame(chPad)));
}
/* 手把（標準配置）：Y 按住＝詳細、R3＝焦點上的名詞、Ⓐ＝裝備焦點上的候選、Ⓑ＝關 */
const PADW = {};
function chPad() {
  const g = [...navigator.getGamepads()].find(Boolean);
  /* 手把拔掉就停，接上（gamepadconnected）再開始 */
  if (!g) return void (PADW.on = 0);
  requestAnimationFrame(chPad);
  if (!PANEL.inv || !$('pinv').classList.contains('c12')) return;
  const b = i => !!(g.buttons[i] && g.buttons[i].pressed),
    edge = i => b(i) && !PADW[i];
  if (b(3) !== !!PADW[3]) (CH.alt = b(3) ? 1 : 0), chCmpSync();
  const f = document.activeElement;
  if (edge(11) && f && f.dataset && f.dataset.tm2) chTermShow(f);
  if (edge(0) && f && f.dataset && f.dataset.c) chAct(f.dataset.c, f);
  if (edge(1)) navGo('char');
  for (const i of [0, 1, 3, 11]) PADW[i] = b(i);
}
chInit();
