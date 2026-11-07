/* dungeonPOE · 裝備：產生（稀有度、詞綴）、名字與說明、格子背包（放得下、自動擺）、角色數值 stats */
'use strict';
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let IID = Date.now() % 1e6;

/* ---------- 產生 ---------- */
/* 稀有度：bonus 越高越容易出藍、黃 */
function rollRarity(bonus) {
  const r = Math.random() * (1 + bonus);
  return r > 0.93 ? 2 : r > 0.64 ? 1 : 0;
}
function rollAff(k, ilvl) {
  const best = bestTier(ilvl),
    /* 一次骰在最高階往下 3 階內 */
    T = Math.min(AFF_T, best + irnd(0, 2)),
    [lo, hi] = tierRange(k, T);
  if (AFF[k].add) {
    /* 附加傷害：a～b，b 大約是 a 的 2 倍 */
    const v = irnd(lo, hi);
    return { k, T, v: [Math.max(1, Math.round(v * 0.5)), v] };
  }
  return { k, T, v: irnd(lo, hi) };
}
/* 隨機挑一種當下能掉的基底 */
function pickBase(ilvl, kind, wt) {
  /* 0.2.9：先挑種類（武器 ×3），再挑基底，免得 100 多個武器基底把防具擠掉 */
  if (!kind) {
    const ks = [...new Set(BASES.filter(b => b.lv <= ilvl).map(b => b.k))],
      kw = ks.map(k => (k === 'weapon' ? 3 : 1));
    let r = Math.random() * kw.reduce((a, b) => a + b, 0);
    kind = ks.find((k, i) => (r -= kw[i]) <= 0) || ks[0];
  }
  const pool = BASES.filter(b => b.lv <= ilvl && (!kind || b.k === kind) && (!wt || b.wt === wt));
  /* 高階的基底機率高一點 */
  const w = pool.map(b => 1 + b.lv / 4);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= w[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}
/* 基底三層（0.2.6，企劃書 5.2）：品質 q（0～0.4，只靠掉落）、插槽數 so（各部位有上限）、潛能 pot（還能鍛造幾次） */
const SOCK_MAX = {
  weapon: 3,
  shield: 2,
  focus: 2,
  quiver: 2,
  helm: 2,
  chest: 4,
  gloves: 2,
  boots: 2,
  belt: 1,
  ring: 1,
  amulet: 1
};
function rollQ(t) {
  /* 地圖階級越高，高區間越常見；35～40% 只在階級 10 以上 */
  const k = 1 + t / 16,
    r = Math.random(),
    p35 = t >= 10 ? 0.001 * (1 + (t - 10) * 0.3) : 0,
    p30 = 0.009 * k,
    p20 = 0.06 * k;
  const band = r < p35 ? [35, 40] : r < p35 + p30 ? [30, 35] : r < p35 + p30 + p20 ? [20, 30] : [0, 20];
  /* 每段上限不含（30～35 不會變成 35），最高那段含 40 */
  return (band[1] === 40 ? Math.round(rnd(35, 40)) : Math.floor(rnd(band[0], band[1]))) / 100;
}
function rollPot() {
  const w = [
      [3, 30],
      [4, 30],
      [5, 25],
      [6, 9],
      [7, 4],
      [8, 1.5],
      [9, 0.4],
      [10, 0.1]
    ],
    tot = w.reduce((a, b) => a + b[1], 0);
  let r = Math.random() * tot;
  for (const [v, p] of w) if ((r -= p) <= 0) return v;
  return 3;
}
function rollSock(k) {
  let n = 0;
  while (n < (SOCK_MAX[k] || 1) && Math.random() < 0.45) n++;
  return n;
}
/* 品質的區間與顏色 */
const qBand = q => (q >= 0.35 ? 3 : q >= 0.3 ? 2 : q >= 0.2 ? 1 : 0);
/* 潛能也分級（顏色跟品質一樣）：6 少見、7～8 很少見、9～10 極稀有 */
const potBand = p => (p >= 9 ? 3 : p >= 7 ? 2 : p >= 6 ? 1 : 0);
const P_N = ['', '少見', '很少見', '極稀有'];
/* 掉落標籤上要不要特別標出來（金字以上） */
function dropTag(it) {
  if (it.gem || it.q == null) return '';
  const t = [];
  if (qBand(it.q) >= 2) t.push(`品質 ${Math.round(it.q * 100)}%`);
  if (potBand(it.pot) >= 2) t.push(`潛能 ${it.pot}`);
  return t.length ? `（${t.join('・')}）` : '';
}
function mkItem(baseId, ilvl, rar) {
  const B = BASEI[baseId],
    K = KINDS[B.k],
    it = { id: ++IID, b: baseId, L: ilvl, r: rar, a: [], q: rollQ(ilvl), so: rollSock(B.k), pot: rollPot() };
  /* 腰帶的護符槽（照 PoE2，看物品等級） */
  if (B.k === 'belt') it.cs = rollCharmSlots(ilvl);
  if (rar === 0) return it;
  /* 魔法 1～2 條（前、後綴各最多 1）；稀有 3～6 條（各最多 3） */
  const n = rar === 1 ? irnd(1, 2) : irnd(3, 6),
    cap = rar === 1 ? 1 : 3,
    pool = (B.aff || K.aff).slice();
  let np = 0,
    ns = 0;
  for (let i = 0; i < 40 && it.a.length < n && pool.length; i++) {
    const j = Math.floor(Math.random() * pool.length),
      k = pool[j],
      pre = AFF[k].p;
    if ((pre && np >= cap) || (!pre && ns >= cap)) continue;
    pool.splice(j, 1);
    it.a.push(rollAff(k, ilvl));
    pre ? np++ : ns++;
  }
  /* 前綴在前 */
  it.a.sort((x, y) => AFF[y.k].p - AFF[x.k].p);
  if (rar === 2) it.nm = pick(NAME_A) + pick(NAME_B);
  return it;
}
function dropItem(ilvl, bonus) {
  return mkItem(pickBase(ilvl).id, ilvl, rollRarity(bonus));
}
/* 技能／輔助寶石：1×1，r=3（寶石色），lv 等級、xp 經驗 */
/* 技能寶石自己有孔（0.2.6，照 PoE2）：一開始 2 孔、最多 5 孔，輔助插在 sup 裡 */
function mkGem(g, lv = 1) {
  const it = { id: ++IID, gem: g, lv, xp: 0, r: 3, a: [], L: lv };
  if (SKILLS[g] || AURAS[g]) (it.so = 2), (it.sup = [null, null]);
  return it;
}
/* 舊存檔裡被刪除的技能寶石：拿掉、退回升級的靈魂、孔裡的輔助放回寶石頁（存檔 23，死亡紅花） */
function gemPurge(o, k) {
  const back = [],
    gone = g => {
      if (!g || g.gem !== k) return false;
      for (let l = 1; l < g.lv; l++) o.mat.soul = (o.mat.soul || 0) + soulCost(l);
      back.push(...(g.sup || []).filter(Boolean));
      return true;
    };
  for (const s of o.skills) if (gone(s.a)) s.a = null;
  o.gems = o.gems.filter(g => !gone(g));
  for (const b of [o.inv, o.stash, o.temp]) if (b) b.items = b.items.filter(g => !gone(g));
  o.gems.push(...back);
}
const gemOf = it => SKILLS[it.gem] || SUPPORTS[it.gem] || AURAS[it.gem];
const isAura = it => !!AURAS[it.gem];
const isSup = it => !!SUPPORTS[it.gem];
const baseOf = it => BASEI[it.b];
const kindOf = it => (it.gem ? 'gem' : it.charm ? 'charm' : baseOf(it).k);
const itemSize = it => (it.gem || it.charm ? [1, 1] : KINDS[baseOf(it).k].sz);
const itemIc = it => (it.gem ? gemOf(it).ic : it.charm ? CHARMS[it.charm].ic : baseOf(it).ic);
const itemName = it =>
  it.charm
    ? CHARMS[it.charm].n
    : it.gem
      ? gemOf(it).n
      : it.nm
        ? it.nm + ' ' + baseOf(it).n
        : (it.r === 1 ? '魔法' : '') + baseOf(it).n;
const affText = a => AFF[a.k].n.replace('{}', Array.isArray(a.v) ? a.v[0] + '～' + a.v[1] : a.v);
/* 基底的數值（品質放大）＋固定詞 */
const impText = (k, v) => {
  if (AFF[k]) return affText({ k, v });
  if (IMPN[k]) return IMPN[k].replace('{}', v);
  const [n, u, sw] = STATN[k];
  return sw ? n : `${n} +${v}${u}`;
};
const qMul = it => 1 + (it.q || 0);
const DEFK = ['armor', 'ev', 'es'];
function baseText(it) {
  const B = baseOf(it),
    b = B.b,
    m = qMul(it),
    o = [];
  if (b.dmg) {
    const wt = B.wt || 'sword',
      two = !!B.two;
    o.push(
      SPELLW.has(wt)
        ? `${WTN[wt]}${two ? '（雙手）' : '（單手）'} · 法系武器`
        : `${two ? '雙手' : '單手'}${WTN[wt]}${DUAL.has(wt) && !two ? '・可雙持' : ''} · 物理傷害 ${Math.round(b.dmg[0] * m)}～${Math.round(b.dmg[1] * m)}`,
      SPELLW.has(wt) ? '' : `每秒攻擊 ${b.as} · 暴擊率 ${5 + (b.crit || 0)}%`
    );
    if (wt === 'spear') o.push('近戰距離 +25%');
    if (wt === 'qstaff') o.push('打中回 1 點魔力');
    if (wt === 'sceptre') o.push('可以放在副手');
  }
  const dn = { armor: '護甲', ev: '閃避', es: '能量護盾' };
  for (const k of DEFK) if (b[k]) o.push(`${dn[k]} ${Math.round(b[k] * m)}`);
  if (b.block) o.push(`格擋 ${b.block}%`);
  if (B.k === 'quiver') o.push('只有拿弓才能用');
  for (const k in b)
    if (!['dmg', 'as', 'block', 'crit', ...DEFK].includes(k) || (k === 'crit' && !b.dmg)) o.push(impText(k, b[k]));
  return o.filter(Boolean);
}
/* 品質、插槽數、潛能（說明框用；舊存檔的裝備沒有就不顯示） */
const Q_N = ['', '稀有', '非常稀有', '超級稀有'];
function baseLayers(it) {
  if (it.gem || it.q == null) return '';
  const qb = qBand(it.q);
  return `品質 <span class="qb${qb}">${Math.round(it.q * 100)}%${qb ? '（' + Q_N[qb] + '）' : ''}</span> · 孔 ${'○'.repeat(it.so || 0) || '無'} · 潛能 <span class="qb${potBand(it.pot)}">${it.pot}${potBand(it.pot) ? '（' + P_N[potBand(it.pot)] + '）' : ''}</span>`;
}
/* 賣價：越高階、詞綴越多越貴 */
const sellPrice = it =>
  it.charm
    ? 3
    : it.gem
      ? 0
      : Math.round(
          (1 + it.a.length * 2 + (it.r === 2 ? 4 : 0)) * (1 + it.L * 0.4) * (1 + Math.max(0, (it.q || 0) - 0.2) * 5)
        );
/* 副手合不合規（0.2.9，docs/開發參考.md 0.1）：雙手武器不能拿副手（弓可以配箭袋）；
   盾配任何單手武器；法器配法杖、權杖；權杖可以放副手（主手不能也是權杖）；爪、匕首、單手劍、單手斧可以雙持同類 */
function offOK(w, off) {
  if (!off) return true;
  const wt = (w && baseOf(w).wt) || 'sword',
    k = baseOf(off).k;
  if (k === 'quiver') return !!w && wt === 'bow';
  if (w && baseOf(w).two) return false;
  if (k === 'focus') return wt === 'wand' || wt === 'sceptre';
  if (k === 'weapon') {
    const ot = baseOf(off).wt;
    return ot === 'sceptre' ? wt !== 'sceptre' : !!w && ot === wt && DUAL.has(wt) && !baseOf(off).two;
  }
  return true;
}
/* 副手不合規時的說明 */
function offWhy(w, off) {
  const wt = (w && baseOf(w).wt) || 'sword',
    k = baseOf(off).k;
  if (k === 'quiver') return '箭袋只有拿弓才能用';
  if (w && baseOf(w).two) return '拿雙手武器時不能拿副手';
  if (k === 'focus') return '法器只能配法杖或權杖';
  if (baseOf(off).wt === 'sceptre') return '不能拿兩把權杖';
  return '只有爪、匕首、單手的劍與斧能雙持（要同一類）';
}

/* ---------- 格子背包：g = { w, h, items: [道具（含 x, y）] } ---------- */
function gridFree(g, x, y, w, h, skip) {
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  for (const o of g.items) {
    if (o === skip) continue;
    const [ow, oh] = itemSize(o);
    if (x < o.x + ow && o.x < x + w && y < o.y + oh && o.y < y + h) return false;
  }
  return true;
}
/* 範圍裡擋到的道具 */
function gridHits(g, x, y, w, h, skip) {
  return g.items.filter(o => {
    if (o === skip) return false;
    const [ow, oh] = itemSize(o);
    return x < o.x + ow && o.x < x + w && y < o.y + oh && o.y < y + h;
  });
}
/* 從左上往下、往右找第一個放得下的位置（PoE 的順序：一欄一欄） */
function gridAuto(g, it) {
  const [w, h] = itemSize(it);
  for (let x = 0; x <= g.w - w; x++)
    for (let y = 0; y <= g.h - h; y++)
      if (gridFree(g, x, y, w, h)) {
        it.x = x;
        it.y = y;
        g.items.push(it);
        return true;
      }
  return false;
}

/* ---------- 角色數值：等級＋穿在身上的裝備 ---------- */
/* 能力總量（0.2.42，企劃書 7.2）：基礎（含轉換、獲得）→ 提高 % 同池相加 → 更多相乘 → 增添能力總量（最後才加、不吃 %） */
const calc = (base, inc, more = 1, tot = 0) => Math.round(base * (1 + inc / 100) * more) + tot;
/* ---------- 能力值與需求（0.2.42，企劃書 7.2） ---------- */
/* 防具看基底的防禦類型；戒指、項鍊、腰帶、護符沒有需求；回傳 { lv, str, dex, int }；單系 1.6×lv、混合各 0.9×lv */
const ATT_OF = { armor: 'str', ev: 'dex', es: 'int' };
function itemReq(it) {
  const r = { lv: 0, str: 0, dex: 0, int: 0 };
  if (!it || it.gem || it.charm) return r;
  const B = baseOf(it);
  if (B.k === 'ring' || B.k === 'amulet' || B.k === 'belt') return r;
  /* 基底 lv 是地圖階級（1～16）：換算成角色等級 1～83（跟 mobLv 同一條線，但階級 1＝1 級，新角色穿得上） */
  r.lv = 1 + Math.round(((B.lv - 1) * 82) / 15);
  const ks =
    B.k === 'weapon'
      ? WATT[B.wt]
      : Object.keys(ATT_OF)
          .filter(k => B.b[k])
          .map(k => ATT_OF[k]);
  for (const k of ks) r[k] = Math.round((ks.length > 1 ? 0.9 : 1.6) * r.lv);
  return r;
}
/* 技能寶石的能力值需求：顏色看限定的武器類別（不限武器：法術＝智慧、攻擊＝力量；盾技能＝力量）；
   單色 1.6×寶石目前的需求等級、多色各 0.9×；每插一顆輔助，每個顏色 +5。光環與輔助沒有需求 */
function gemAttrReq(g) {
  const r = { str: 0, dex: 0, int: 0 };
  if (!g || !g.gem || isSup(g) || isAura(g)) return r;
  const D = SKILLS[g.gem],
    ks = D.wt ? [...new Set(D.wt.flatMap(w => WATT[w]))] : [D.off || !D.tags.includes('spell') ? 'str' : 'int'],
    add = 5 * (g.sup || []).filter(Boolean).length;
  for (const k of ks) r[k] = Math.round((ks.length > 1 ? 0.9 : 1.6) * gemReq(g.lv || 1)) + add;
  return r;
}
/* 缺的能力值（需求 > 現有）：[['力量', 現有, 需求], …]；att 是能力值總量 */
const attrLack = (req, att) => ATTR.filter(k => att[k] < req[k]).map(k => [ATTN[k], att[k], req[k]]);
const lackTxt = l => l.map(([n, a, b]) => `${n} ${a}／${b}`).join('、');
/* 一件裝備給的能力值 */
function itemAttr(it) {
  const r = { str: 0, dex: 0, int: 0 };
  const B = it && baseOf(it);
  /* 固定詞（基底的 b）跟詞綴一樣算：項鍊有 +能力值 的基底 */
  for (const a of [...Object.entries(B ? B.b : {}).map(([k, v]) => ({ k, v })), ...((it && it.a) || [])]) {
    if (a.k === 'attrA') for (const k of ATTR) r[k] += a.v;
    else if (a.k in r) r[a.k] += a.v;
  }
  return r;
}
/* 哪些裝備欄失效（等級或能力值不夠）與能力值總量。
   循環怎麼避免：一件裝備的需求用「總量 − 它自己給的」判斷（自己給的不能幫自己過關）；
   失效的裝備不給能力值，所以從「全部有效」開始、每輪把不夠的拿掉重算，只會越拿越少、一定停止
   （結果是最大的穩定集合：A、B 互相補對方需求時，兩件都留著） */
function eqCheck(s) {
  const bad = new Set(),
    lv = Math.min(100, s.lv),
    pts = { str: ATT_START, dex: ATT_START, int: ATT_START };
  for (const id of s.pt || []) {
    const n = PTREE.I[id];
    if (n && n.s.attr) pts[ATT_PT[(s.ptA || {})[id]] || 'str'] += n.s.attr;
    /* 大點的固定能力值也算進需求（stats 的 put 會再加進 o，這裡只管需求與顯示的總量） */
    if (n) for (const a of ATTR) if (n.s[a]) pts[a] += n.s[a];
  }
  const es = EQS.filter(e => s.eq[e.k] && !(e.k === 'off' && !offOK(s.eq.weapon, s.eq.off)));
  let tot;
  for (let again = true; again; ) {
    tot = { ...pts };
    for (const e of es) if (!bad.has(e.k)) for (const [k, v] of Object.entries(itemAttr(s.eq[e.k]))) tot[k] += v;
    again = false;
    for (const e of es) {
      const it = s.eq[e.k],
        own = itemAttr(it),
        q = itemReq(it);
      if (!bad.has(e.k) && (lv < q.lv || ATTR.some(k => tot[k] - own[k] < q[k]))) bad.add(e.k), (again = true);
    }
  }
  return { bad, tot };
}
/* 這件裝備放進 key 欄位缺什麼（欄位原本的裝備不算）：回傳缺的清單，空陣列＝夠 */
function eqLack(s, it, key) {
  const q = itemReq(it),
    lv = Math.min(100, s.lv);
  return (lv < q.lv ? [['等級', lv, q.lv]] : []).concat(
    attrLack(q, eqCheck({ ...s, eq: { ...s.eq, [key]: null } }).tot)
  );
}
/* 技能寶石放得出來嗎（用 ST 的能力值總量） */
const gemLack = (g, att = ST) => attrLack(gemAttrReq(g), att);
const MAXRK = { maxResF: 'fire', maxResC: 'cold', maxResL: 'light', maxResX: 'chaos' };
function stats(s = S) {
  /* 0.2.7 照 PoE2（企劃書 7.2）：角色等級只給生命、魔力（到 100 級），不給傷害；提高同池相加在 combat.js 的 hitCalc */
  const lv = Math.min(100, s.lv);
  const o = {
    hp: HERO.hp + 12 * (lv - 1),
    mp: HERO.mp + 3 * (lv - 1),
    flat: [0, 0],
    add: { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] },
    wadd: { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] },
    as: 0,
    critInc: 0,
    critX: 0,
    armor: 0,
    block: 0,
    aq: {},
    res: { fire: 0, cold: 0, light: 0, chaos: 0 },
    maxRes: { fire: 0, cold: 0, light: 0, chaos: 0 },
    ms: 0,
    regen: 0,
    loh: 0,
    aoe: 0,
    flask: 0,
    dmgA: 0,
    atkP: 0,
    meleeP: 0,
    projP: 0,
    spellP: 0,
    aoeP: 0,
    minionP: 0,
    elemP: 0,
    occP: 0,
    priP: 0,
    physP: 0,
    eleP: 0,
    fireP: 0,
    coldP: 0,
    lightP: 0,
    chaosP: 0,
    pen: 0,
    ailMag: 0,
    bleedCh: 0,
    poisonCh: 0,
    poiStack: 0,
    impaleCh: 0,
    armBreak: 0,
    rageHit: 0,
    powOnCrit: 0,
    arcaneHit: 0,
    tailwind: 0,
    onsKill: 0,
    unholyKill: 0,
    blood: 0,
    es: 0,
    esP: 0,
    esRec: 0,
    esDelay: 0,
    defP: 0,
    ss: 0,
    spirit: SPIRIT0,
    auraEff: 0,
    /* 0.2.63：魔像同時存在的上限、魔像增益效果、每秒回復最大生命的 %、召喚物復甦時間倍率（獻祭寶石算） */
    golemMax: 1,
    golemEff: 0,
    regenP: 0,
    reviveT: 1,
    /* 0.2.42 能力總量的「增添能力總量」（目前沒有來源）、獲得、效用、增益／減益的效果與幅度 */
    spiritP: 0,
    lifeTot: 0,
    manaTot: 0,
    armorTot: 0,
    evTot: 0,
    esTot: 0,
    spiritTot: 0,
    accTot: 0,
    evAsArmor: 0,
    spiritEff: 0,
    mpEff: 0,
    buffEff: 0,
    buffMag: 0,
    debuffEff: 0,
    debuffMag: 0,
    unitP: 0,
    units: 0,
    ammoN: 0,
    grenN: 0,
    /* 0.2.66：滿溢機率（攻擊投射物、法術投射物；gemCfg 的 surpass） */
    projCh: 0,
    spellProjCh: 0,
    rollCd: 0,
    fireAdd: 0,
    ...Object.fromEntries(Object.keys(WTN).map(k => ['w_' + k, 0])),
    shieldP: 0,
    /* 0.2.45 天賦樹重做新增的能力（STATN 有名字） */
    ...Object.fromEntries(
      'penF penC penL lowEnemyP blindP blindCh formP formArm flamP chillMag shockCh pinP chgDur chgMore expEff armEle esAsThr presArea twoP oneP dualP minAs gloryP energyP grenCd reloadP'
        .split(' ')
        .map(k => [k, 0])
    ),
    more: 0,
    lowHp: 0,
    fullHp: 0,
    esUp: 0,
    afterRoll: 0,
    bossP: 0,
    closeP: 0,
    farP: 0,
    killHeal: 0,
    ev: 0,
    acc: 0,
    accP: 0,
    noMiss: 0,
    noCrit: 0,
    spellLv: 0,
    castP: 0,
    /* 0.2.23 特色大點（combat.js、skills.js 讀） */
    ...Object.fromEntries(
      [
        'proj',
        'pierce',
        'projMore',
        'leech',
        'mpLeech',
        'esLeech',
        'recoupHp',
        'recoupMp',
        /* 0.2.42 第 8 批 */
        'rageLeech',
        'rageMax',
        'rageEff',
        'allyLeech',
        'lifeRec',
        'esMana',
        'adapt',
        'dbl',
        'hsFire',
        'wolfN',
        'cvPF',
        'cvPC',
        'cvPL',
        'cvLC',
        'cvCF',
        'movP',
        'stillP',
        'selfMore',
        'fullCrit',
        'ironRef',
        'wind',
        'ci',
        'vaal',
        'avatar',
        'mom',
        'noSelf',
        'stand',
        /* 0.2.25 昇華（data.js 的 ASC；combat.js、mech.js、skills.js 讀） */
        'gale',
        'windWalk',
        'farShot',
        'nearShot',
        'chain',
        'falcon',
        'bullseye',
        'frenzyMs',
        'mirageH',
        'shArmMore',
        'blockHalf',
        'heavyShield',
        'unmov',
        'addArm',
        'hsArm',
        'armBreakArm',
        'sacrifice',
        'steelCycle',
        'hsP',
        'frzP',
        'elcP',
        'ailThrP',
        /* 0.2.42 定身與控制 */
        'immobP',
        'dazeCh',
        'stunRec',
        'stunThrP',
        /* 0.2.42 第 7 批：技能分類的傷害提高與持續時間（combat.js 的 hitCalc、skills.js 的 durOf） */
        'strikeP',
        'slamP',
        'novaP',
        'sustP',
        'durP',
        /* 0.2.26 地獄火、影舞者 */
        'hellfire',
        'boil',
        'reborn',
        'devour',
        'hfFlam',
        'shaper',
        'igSpread',
        'ember',
        'fireExp',
        'cvLF',
        'physAsFire',
        'perfWin',
        'perfMore',
        'rollBlind',
        'powCritE',
        'powCritX',
        'cwHit',
        'cwMax',
        'reap',
        'hexCoc',
        'hexBurst',
        /* 0.2.42 第 6 批：撲殺、屠戮打擊（%）、幸運、荊棘、偏斜（combat.js） */
        'cull',
        'fullStrike',
        /* 0.2.43 第 9 批：進攻機制的開關（combat.js） */
        'ignFire',
        'ignCold',
        'ignLight',
        'ignChaos',
        'aggHit',
        'aggIgn',
        'bleedAll',
        'poiAll',
        'forkCrit',
        'inevCrit',
        'ovkSplash',
        'kbEs',
        'savageGuard',
        'lukCrit',
        'lukBlock',
        'lukDmg',
        'lukDefl',
        'thornP',
        'defl',
        'evAsDefl',
        /* 0.2.43 第 10 批：異常與減益的開關（combat.js） */
        'parryMag',
        'parryDur',
        'parryR',
        'bvNoCrit',
        'overwhelm',
        'incise',
        'inciseMag',
        'hexPierce',
        'hstunNoEv',
        'suppCh',
        /* 第 13～16 批：開關與數值（combat.js、mech.js、skills.js） */
        ...Object.keys(ATT_KS),
        'projAtkP',
        'fork',
        'projRet',
        'splash',
        'minmax',
        'reveal',
        'weakMore',
        'noRoll',
        'rollTank',
        'minGiant',
        /* 天賦擴充：異常強度分種類、條件傷害、基石與開關 */
        'bleedMag',
        'poiMag',
        'ignMag',
        'surrP',
        'isoP',
        'killP',
        'presP',
        'lowMpP',
        'lowEsP',
        'dynOn',
        'aggAll',
        'noStag',
        'crushOn',
        'crippleOn',
        'weakenOn',
        'compoundOn',
        'unChill',
        'unPoi',
        'unBleed'
      ].map(k => [k, 0])
    ),
    /* 不受影響：{ 減益種類: 1 }（ign、bleed、poison、chill、frozen、shock、curse、over、vine） */
    unaff: {},
    thornAdd: [0, 0]
  };
  /* 失效的裝備（等級或能力值不夠）不算數值、不算武器 */
  const chk = eqCheck(s),
    w = chk.bad.has('weapon') ? null : s.eq.weapon,
    off = chk.bad.has('off') ? null : s.eq.off,
    /* 雙持（0.2.9）：爪、匕首、單手劍、單手斧，副手拿同類武器 */
    dual = !!(
      w &&
      off &&
      baseOf(off).k === 'weapon' &&
      baseOf(off).wt === baseOf(w).wt &&
      DUAL.has(baseOf(w).wt) &&
      !baseOf(w).two &&
      !baseOf(off).two
    ),
    /* 武器的本地詞：物理提高、附加傷害、攻擊速度、暴擊率只改那把武器（品質也是本地） */
    local = it => {
      const B = it ? baseOf(it).b : { dmg: HERO.dmg, as: HERO.as },
        L = {
          dmgP: 0,
          flat: [0, 0],
          as: 0,
          crit: 0,
          add: { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] }
        };
      for (const a of (it && it.a) || []) {
        if (a.k === 'dmgP' || a.k === 'as' || a.k === 'crit') L[a.k] += a.v;
        else if (a.k === 'flat') (L.flat[0] += a.v[0]), (L.flat[1] += a.v[1]);
        else if (L.add[a.k]) (L.add[a.k][0] += a.v[0]), (L.add[a.k][1] += a.v[1]);
      }
      const m = (it ? qMul(it) : 1) + L.dmgP / 100;
      return {
        dmg: [B.dmg[0] * m + L.flat[0], B.dmg[1] * m + L.flat[1]],
        add: L.add,
        crit: 5 + (B.crit || 0) + L.crit,
        aps: B.as * (1 + L.as / 100)
      };
    },
    isLocal = (it, k) => baseOf(it).k === 'weapon' && (['dmgP', 'as', 'crit', 'flat'].includes(k) || !!o.wadd[k]);
  const put = (k, v) => {
    if (k === 'life') o.hp += v;
    else if (k === 'resF') o.res.fire += v;
    else if (k === 'resC') o.res.cold += v;
    else if (k === 'resL') o.res.light += v;
    else if (k === 'resX') o.res.chaos += v;
    else if (k === 'resA') for (const r of ['fire', 'cold', 'light']) o.res[r] += v;
    else if (k === 'maxRes') for (const r of ['fire', 'cold', 'light']) o.maxRes[r] += v;
    else if (MAXRK[k]) o.maxRes[MAXRK[k]] += v;
    else if (k === 'flat') (o.flat[0] += v[0]), (o.flat[1] += v[1]);
    else if (k === 'thorn') (o.thornAdd[0] += v[0]), (o.thornAdd[1] += v[1]);
    else if (o.add[k]) (o.add[k][0] += v[0]), (o.add[k][1] += v[1]);
    else if (k === 'dmgP') o.physP += v;
    else if (k === 'crit') o.critInc += v;
    else if (k in o) o[k] += v;
  };
  for (const e of EQS) {
    const it = s.eq[e.k];
    if (!it || chk.bad.has(e.k) || (e.k === 'off' && !offOK(w, it))) continue;
    const b = baseOf(it).b;
    /* 基底的數值：防禦照品質放大；武器的傷害、攻擊速度、暴擊是本地的（下面另外算） */
    for (const k in b)
      if (!(baseOf(it).k === 'weapon' && (k === 'dmg' || k === 'as' || k === 'crit')))
        put(k, DEFK.includes(k) ? Math.round(b[k] * qMul(it)) : b[k]);
    for (const a of it.a) if (!isLocal(it, a.k)) put(a.k, a.v);
  }
  o.add.phys = o.flat;
  /* 能力值（eqCheck 已算好：起始＋過路點＋有效裝備） */
  Object.assign(o, chk.tot);
  o.eqBad = [...chk.bad];
  /* 天賦樹 */
  const pt = {
    hpP: 0,
    armorP: 0,
    evP: 0,
    mpP: 0,
    mpReg: 0,
    cdr: 0,
    life: 0,
    mana: 0,
    armorF: 0,
    evF: 0,
    esF: 0,
    blockInc: 0
  };
  const nodes = (s.pt || []).map(id => PTREE.I[id]),
    wt0 = (w && baseOf(w).wt) || 'unarmed';
  for (const n of nodes) {
    /* 武器招牌點（0.2.23，only）：拿那種武器才生效 */
    if (!n || (n.s.only && n.s.only !== wt0)) continue;
    for (const k in n.s) {
      if (ATTR.includes(k)) continue;
      if (k in pt) pt[k] += n.s[k];
      else if (k === 'resA') for (const r of ['fire', 'cold', 'light']) o.res[r] += n.s[k];
      else put(k, n.s[k]);
    }
  }
  /* 昇華（0.2.25）：小點的數值跟天賦一樣加；大點是開關或數值（only＝拿那種武器才生效） */
  const AT = s.asc && ascNodes(s.asc);
  for (const id of (AT && s.at) || []) {
    const n = AT.I[id],
      v = n && (n.fx || n.s);
    if (!v || (v.only && v.only !== wt0)) continue;
    for (const k in v) if (k !== 'only') k in pt ? (pt[k] += v[k]) : put(k, v[k]);
  }
  if (o.unChill) o.unaff.chill = 1;
  if (o.unPoi) o.unaff.poison = 1;
  if (o.unBleed) o.unaff.bleed = 1;
  /* 固有加成：1 力量 +2 生命、1 敏捷 +8 命中值、1 智慧 +2 魔力，吃後面的提高；能力值基石拿掉一種、改成每 2 點給 1% 別的提高 */
  const noB = {};
  for (const k in ATT_KS)
    if (o[k]) {
      const [a, to] = ATT_KS[k],
        v = Math.floor(o[a] / 2);
      noB[a] = 1;
      to in pt ? (pt[to] += v) : (o[to] += v);
    }
  if (!noB.str) o.hp += 2 * o.str;
  if (!noB.int) o.mp += 2 * o.int;
  if (!noB.dex) o.acc += 8 * o.dex;
  /* 光環：照光環欄的順序預留精魂，精魂不夠的不生效；保留量 ÷ (1 + 效用) */
  o.spirit = calc(o.spirit, o.spiritP, 1, o.spiritTot);
  o.spiritUsed = 0;
  o.auraOn = [];
  for (const g of s.auras || []) {
    if (!g) continue;
    const A = AURAS[g.gem];
    /* 捷光環要拿非法系武器（照 PoE2），不然不預留、不生效 */
    const wt0 = (w && baseOf(w).wt) || 'unarmed';
    if (A.her && (wt0 === 'unarmed' || SPELLW.has(wt0))) continue;
    /* 夥伴（0.2.60 J3，照 PoE2）：同時只能有 1 隻，光環欄排後面的不生效 */
    if (A.tags.includes('companion') && o.auraOn.some(k => AURAS[k].tags.includes('companion'))) continue;
    /* 同名的光環只算一顆（hud 的 slotFits 也擋）；魔像（0.2.63）同時最多 golemMax 種，超過的不召、不預留精魂 */
    if (s.auras.findIndex(x => x && x.gem === g.gem) !== s.auras.indexOf(g)) continue;
    if (isGolem(g.gem) && o.auraOn.filter(isGolem).length >= o.golemMax) continue;
    /* 光環寶石孔裡的輔助（0.2.57 F3）：sq 品質 0～1 */
    const sup = {};
    for (const x of g.sup || [])
      if (x && supOK(A, x, g))
        sup[SUPPORTS[x.gem].base || x.gem] = { lv: x.lv, sq: (x.q || 0) / GEM_Q_MAX, t2: SUPPORTS[x.gem].tier === 2 };
    const sp = (A.sp * (sup.spiriteff ? 1 - (20 + 5 * sup.spiriteff.sq) / 100 : 1)) / (1 + o.spiritEff / 100);
    if (o.spiritUsed + sp > o.spirit) continue;
    o.spiritUsed += sp;
    o.auraOn.push(g.gem);
    /* 魔像的增益不吃光環效果（auraEff）：吃增益效果與幅度（buffEff、buffMag）與魔像增益效果 golemEff（下面的 gm） */
    const ae = sup.auraeff,
      m =
        (1 + 0.03 * (g.lv - 1)) *
        (1 + (isGolem(g.gem) ? o.buffEff : o.auraEff + o.buffEff) / 100) *
        (1 + o.buffMag / 100) *
        (ae ? 1 + (25 + (ae.lv - 1) + 5 * ae.sq) / 100 : 1);
    /* 光環的品質（0.2.29）：0～1 */
    o.aq[g.gem] = (g.q || 0) / GEM_Q_MAX;
    if (A.her) {
      (o.her = o.her || {})[A.her] = g.lv;
      /* 範圍擴大、集中效應：範圍倍率 herA、傷害更多 herM（skills.js 的 herR／herMul） */
      const ar = sup.area,
        fo = sup.focus;
      (o.herA = o.herA || {})[A.her] = (ar ? (ar.t2 ? 1.55 : 1.4) : 1) * (fo ? 0.7 + 0.1 * fo.sq : 1);
      (o.herM = o.herM || {})[A.her] = fo ? 1.3 : 1;
    }
    /* 群狼：戰狼精魂多 1 隻、光環的狼與魔像傷害更多 30% */
    if (sup.pack) o['packM_' + g.gem] = 1.3;
    /* 召喚物傷害、生命（0.2.66）：skills.js 的 allyMult0、lifeM 讀 */
    if (sup.mindmg) o['minM_' + g.gem] = 1.25 + 0.05 * sup.mindmg.sq;
    if (sup.minlife) o['minL_' + g.gem] = 1.3 + 0.05 * sup.minlife.sq;
    if (g.gem === 'anger') o.angerV = A.fx.fireAdd * m;
    /* 獻祭（0.2.63）：復甦時間 +40%（每級 +1%），品質每 1% 復甦加快 0.25% */
    if (g.gem === 'offer') o.reviveT = (1 + (39 + g.lv) / 100) / (1 + 0.05 * o.aq.offer);
    /* 魔像（0.2.63）：增益吃魔像增益效果與品質（Lv20 +10%，巨石的品質是替你擋下一下，不加增益）；那隻魔像死了、等復活的那段沒有增益（skills.js 的 updSkills 看到死活變了會重算） */
    const down =
        isGolem(g.gem) && typeof G === 'object' && G.allies && G.allies.some(x => x.src === g.gem && x.dead > G.t),
      gm = isGolem(g.gem) ? (1 + o.golemEff / 100) * (g.gem === 'golem' ? 1 : 1 + 0.1 * o.aq[g.gem]) : 1;
    for (const k in down ? {} : A.fx) {
      const v = A.fx[k] * m * gm;
      if (k === 'wolf') o.auraWolf = sup.pack ? 2 : 1;
      else if (k === 'resA') for (const r of ['fire', 'cold', 'light']) o.res[r] += Math.round(v);
      else if (k in pt) pt[k] += v;
      else put(k, v);
    }
  }
  o.spiritUsed = Math.round(o.spiritUsed * 10) / 10;
  o.es = calc(o.es + pt.esF, o.esP + o.defP + bufV('esP'), 1, o.esTot);
  /* 持武器的加成 */
  o.wt = (w && baseOf(w).wt) || 'unarmed';
  /* 天賦「持某武器時傷害」（0.2.17，15 種武器都有） */
  o.dmgA += o['w_' + o.wt] || 0;
  o.hp = calc(o.hp + pt.life, pt.hpP, 1, o.lifeTot);
  /* 盾的護甲（基底照品質＋盾上的護甲詞）：格擋值＝這個數 ×（1 + 盾的護甲更多）（0.2.42；鐵金剛的鐵壁之盾、重盾前進、小點都是「盾的護甲更多」，相加） */
  const shI = off && offOK(w, off) && baseOf(off).k === 'shield' ? off : null,
    shArm = shI
      ? Math.round((baseOf(shI).b.armor || 0) * qMul(shI)) + shI.a.reduce((t, a) => t + (a.k === 'armor' ? a.v : 0), 0)
      : 0;
  /* 護甲、閃避：基礎 → 轉換（鐵壁：基礎閃避全轉成護甲）→ 獲得（基礎閃避的 x% 當作護甲）→ 各自的提高 */
  let armB = o.armor + pt.armorF + (shArm * o.shArmMore) / 100,
    evB = o.ev + pt.evF;
  o.bv = Math.round(shArm * (1 + o.shArmMore / 100));
  if (o.ironRef) (armB += evB), (evB = 0);
  armB += (evB * o.evAsArmor) / 100;
  /* 偏斜值（0.2.42）：獲得基礎閃避的 x% 當作偏斜值（偏斜沒有提高％的池） */
  o.defl += (evB * o.evAsDefl) / 100;
  o.armor = calc(armB, pt.armorP + o.defP + bufV('armorP'), 1, o.armorTot);
  o.ev = calc(evB, pt.evP + o.defP, 1, o.evTot);
  /* 基石：不動如山（閃避歸零）、混沌免疫（生命 1、能量護盾更多 30%） */
  if (o.stand) o.ev = 0;
  if (o.ci) (o.hp = 1), (o.es = Math.round(o.es * 1.3));
  /* 每秒回復最大生命的 x%（巨石魔像）：用最後的最大生命換成每秒回復量 */
  o.regen += (o.hp * o.regenP) / 100;
  /* 命中（0.2.22）：基礎 30 ＋ 每級 6 ＋ 裝備、天賦的命中值，再乘提高（Lv1 打第 1 階的 Lv5 怪約 90%） */
  o.acc = calc(30 + 6 * lv + o.acc, o.accP, 1, o.accTot);
  o.mp = calc(o.mp + pt.mana, pt.mpP, 1, o.manaTot);
  o.mpReg = o.mp * HERO.mpReg * (1 + pt.mpReg / 100);
  o.cdr = pt.cdr;
  /* 武器：雙持時兩把輪流出手，傷害、暴擊取平均，攻擊速度再快 10% */
  const W1 = local(w),
    W2 = dual ? local(off) : null,
    avg = (x, y) => (W2 ? (x + y) / 2 : x);
  o.dmg = [avg(W1.dmg[0], W2 && W2.dmg[0]), avg(W1.dmg[1], W2 && W2.dmg[1])];
  for (const k in o.wadd) o.wadd[k] = [avg(W1.add[k][0], W2 && W2.add[k][0]), avg(W1.add[k][1], W2 && W2.add[k][1])];
  o.wcrit = avg(W1.crit, W2 && W2.crit);
  o.waps = avg(W1.aps, W2 && W2.aps) * (dual ? 1.1 : 1);
  o.dual = dual;
  /* 盾技能（0.2.13）：基礎物理＝這面盾的護甲＋閃避（基底照品質＋盾上的詞）×0.14～0.26，每秒出手 1.2 下 */
  const sh = off && offOK(w, off) && baseOf(off).k === 'shield' ? off : null;
  o.shield = !!sh;
  if (sh) o.dmgA += o.shieldP;
  /* 雙手、單手、雙持時的傷害（0.2.45 天賦，跟「持某武器時傷害」同一個做法） */
  if (w && baseOf(w).two) o.dmgA += o.twoP;
  else if (w) o.dmgA += o.oneP;
  if (dual) o.dmgA += o.dualP;
  if (sh) {
    const b = baseOf(sh).b,
      def =
        ((b.armor || 0) + (b.ev || 0)) * qMul(sh) +
        sh.a.reduce((t, a) => t + (DEFK.includes(a.k) && a.k !== 'es' ? a.v : 0), 0);
    o.sdmg = [def * 0.14, def * 0.26];
  }
  o.aps = o.waps * (1 + o.as / 100);
  o.asM = o.aps / 1.1;
  o.sasM = (1.2 * (1 + o.as / 100)) / 1.1;
  o.spd = HERO.spd * (1 + o.ms / 100);
  o.aoeM = 1 + o.aoe / 100;
  o.crit = Math.min(100, o.wcrit * (1 + o.critInc / 100));
  o.critM = 2 + o.critX / 100;
  /* 超限格擋率（第 13～16 批）：沒有上限時超出 50 的部分（輕盾減半之前） */
  o.blockOver = Math.max(0, Math.round(o.block * (1 + pt.blockInc / 100)) - 50);
  o.block = Math.min(50, Math.round(o.block * (1 + pt.blockInc / 100)));
  if (o.blockHalf && shI) o.block = Math.round(o.block / 2);
  /* 未限抗性：沒套上限的抗性（角色面板括號裡；有效抗性＝min(未限，最大抗性)） */
  o.resRaw = { ...o.res };
  for (const r of RESK) o.maxRes[r] = Math.min(MAXRES_CAP, RES_CAP + o.maxRes[r]);
  /* 地獄火（0.2.26，炎魔契約）：最大魔力換成 2 倍的地獄火 */
  o.hfMax = o.hellfire ? o.mp * 2 : 0;
  return o;
}
/* 平均每秒傷害（給比較用；攻擊、不算提高與目標防禦） */
function dps(o) {
  let d = (o.dmg[0] + o.dmg[1]) / 2;
  for (const k in o.add) d += (o.add[k][0] + o.add[k][1]) / 2;
  for (const k in o.wadd) d += (o.wadd[k][0] + o.wadd[k][1]) / 2;
  return d * (1 + (o.dmgA + o.atkP + o.physP) / 100) * o.aps * (1 + (o.crit / 100) * (o.critM - 1));
}
