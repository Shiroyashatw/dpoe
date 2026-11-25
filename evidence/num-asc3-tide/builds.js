/* num-asc3-tide 的配裝與等級點（jobs.js、report.js 共用）。
   天賦權重、裝備權重照 tools/dmg_check.js 的「風行神射」「鐵金剛」「潮汐」三套（同一套權重抽裝、走天賦）。
   主技能 1 招＋4 孔（長老屋 Lv10＝4 孔，交辦）；汐引是潮汐的昇華技能（點了汐引才放進第 2 格，AI 先放第 2 格再放第 1 格）。 */
'use strict';
const SPELL = {
  tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, coldP: 2, lightP: 2, ailMag: 2, life: 0.3 },
  gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
  wt: 'staff'
};
const PULL = { k: 'tidepull', so: [], asc: 'tidepull' };
const BUILDS = {
  /* 風行神射的代表：弓＋閃電箭（物理轉閃電的投射物攻擊） */
  bow: {
    n: '弓（閃電箭）',
    tree: { projP: 2, atkP: 2, w_bow: 2, critInc: 1, as: 3, ms: 1, evP: 0.5, life: 0.3 },
    gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, life: 0.5, ev: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'bow',
    skills: [{ k: 'split', so: ['multi', 'fury', 'crit', 'haste'] }, PULL]
  },
  /* 鐵金剛的代表：錘＋盾＋震地 */
  mace: {
    n: '錘盾（震地）',
    tree: { meleeP: 2, atkP: 1, w_mace: 2, shieldP: 1, armorP: 3, armorF: 0.5, blockInc: 1, life: 0.5, hpP: 5 },
    gear: { dmgP: 1, flat: 3, as: 1, life: 0.8, armor: 1, block: 1, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'mace',
    off: 'shield',
    skills: [{ k: 'quake', so: ['heavy', 'fury', 'haste', 'area'] }, PULL]
  },
  /* 潮汐的代表：長杖＋電弧（閃電法術）；另一套冰霜彈（冰冷投射物法術）給潮落線 */
  arc: { n: '法（電弧）', ...SPELL, skills: [{ k: 'arc', so: ['fury', 'haste', 'crit', 'elepen'] }, PULL] },
  frost: { n: '法（冰霜彈）', ...SPELL, skills: [{ k: 'frostbolt', so: ['fury', 'haste', 'crit', 'elepen'] }, PULL] }
};
/* 等級點（levels.js）：(a) 長老屋 Lv10 剛開：角色 Lv60、第 22 個地點（怪物 Lv83、G.mapT 16）、昇華 8 點；(b) 滿昇華後成長：角色 Lv90、同地點 */
const POINTS = {
  a: { L: 60, t: 16, node: 21, pts: 8 },
  b: { L: 90, t: 16, node: 21, pts: 8 }
};
const ASCN = { wind: '風行神射', iron: '鐵金剛', tide: '潮汐', none: '無昇華' };
module.exports = { BUILDS, POINTS, ASCN };
