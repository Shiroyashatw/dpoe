/* dungeonPOE · NPC 與對話：資料驅動，序章、狩獵之血共用。
   NPCS：when(S) 決定出不出現、talk(S) 回傳要播哪段。TALKS：lines 是 [誰, 文字, 條件(S)?]（誰＝null 是旁白）、
   set 是播完記在 S.story 的旗標、next 是接著播的段落（字串或函式）。文字守世界觀第 4 節，淺顯，不用時辰、不用艱深詞 */
'use strict';
const NPCS = {
  bone: {
    n: '撿骨師',
    sp: 'ghost_priest',
    when: () => true,
    talk: s => (s.story.boneMet ? 'bone_' + ((s.story.boneN = (s.story.boneN || 0) + 1) % 4) : 'bone_first')
  },
  /* 赤鴉：狩獵之血解鎖（S.story.crow）才出現 */
  crow: {
    n: '赤鴉',
    sp: 'ghost_priest',
    when: s => !!s.story.crow,
    talk: () => 'crow_first'
  }
};
const TALKS = {
  bone_first: {
    set: 'boneMet',
    lines: [
      ['bone', '三年了。我在這裡撿了三年的骨頭。'],
      ['bone', '你是第一個自己走上來的人。'],
      ['bone', '這裡是地層的出口。走進去的人沒有回來，我替他們把骨頭收好。'],
      ['bone', '地圖台還能用。要下去就去吧。你回來的時候，火還會燒著。']
    ]
  },
  bone_0: { lines: [['bone', '甕又多了幾個。名字我都記著。']] },
  bone_1: { lines: [['bone', '牆邊那十二尊都暗著。我不知道它們還會不會亮。']] },
  bone_2: { lines: [['bone', '外面的霧，比去年更紅了。']] },
  bone_3: { lines: [['bone', '累了就坐一下。這裡沒有東西會追上來。']] },
  crow_first: {
    lines: [
      ['crow', '別在霧裡待太久。'],
      ['crow', '那霧會讓牠們變得更兇。我的手臂就是這樣。'],
      ['crow', '小心一點。你身上的味道，牠們聞得到。']
    ]
  }
};
const npcList = () =>
  Object.keys(NPCS)
    .filter(id => NPCS[id].when(S))
    .map(id => ({ npc: 1, id, n: NPCS[id].n, sp: NPCS[id].sp, ...HIDE_ART.npc[id] }));
const TALK = { on: false, q: [], i: 0, txt: '', n: 0, tm: 0, id: '', done: null };
const talkOpen = id => talkPlay(NPCS[id].talk(S));
/* 播一段對話（序章、狩獵之血也呼叫這個）；done：整段播完（含快轉）才呼叫 */
function talkPlay(id, done) {
  const T = TALKS[id];
  if (!T) return done && done();
  Object.assign(TALK, { on: true, id, done, i: -1, q: T.lines.filter(l => !l[2] || l[2](S)) });
  G.state = 'talk';
  $('talk').hidden = false;
  setT0($('tkh'), TOUCH.on ? '點一下繼續' : '點一下或按 F 繼續');
  talkLine();
}
function talkLine() {
  clearInterval(TALK.tm);
  if (++TALK.i >= TALK.q.length) return talkEnd();
  const [who, txt] = TALK.q[TALK.i];
  setT0($('tkn'), who ? NPCS[who].n : '');
  TALK.txt = txt;
  TALK.n = matchMedia('(prefers-reduced-motion: reduce)').matches ? txt.length : 0;
  setT0($('tkt'), txt.slice(0, TALK.n));
  if (TALK.n < txt.length)
    TALK.tm = setInterval(() => {
      setT0($('tkt'), txt.slice(0, ++TALK.n));
      if (TALK.n >= txt.length) clearInterval(TALK.tm);
    }, 26);
}
const setT0 = (el, t) => (el.textContent = t);
/* 下一句；字還在跑就先整句顯示 */
function talkNext() {
  if (TALK.n < TALK.txt.length) {
    clearInterval(TALK.tm);
    TALK.n = TALK.txt.length;
    return setT0($('tkt'), TALK.txt);
  }
  talkLine();
}
function talkEnd() {
  clearInterval(TALK.tm);
  const T = TALKS[TALK.id],
    done = TALK.done;
  TALK.on = false;
  G.state = 'play';
  $('talk').hidden = true;
  if (T.set) (S.story[T.set] = 1), save();
  const nx = typeof T.next === 'function' ? T.next(S) : T.next;
  if (nx) return talkPlay(nx, done);
  if (done) done();
}
function talkInit() {
  $('talk').innerHTML =
    `<div class="tkb"><b id="tkn"></b><p id="tkt" aria-live="polite"></p><div class="tkf"><small id="tkh"></small><button class="btn mini" data-tk="skip">快轉</button></div></div>`;
  $('talk').addEventListener('click', e => (e.target.closest('[data-tk=skip]') ? talkEnd() : talkNext()));
}
/* 對話中的按鍵：F、空白、Enter 繼續，Esc 快轉 */
function talkKey(k) {
  if (k === 'escape') talkEnd();
  else if (k === 'f' || k === ' ' || k === 'enter') talkNext();
}
