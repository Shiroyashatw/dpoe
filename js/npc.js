/* dungeonPOE · NPC 與對話：資料驅動，序章、狩獵之血共用。
   NPCS：when(S) 決定出不出現、talk(S) 回傳要播哪段。TALKS：lines 是 [誰, 文字, 條件(S)?]（誰＝null 是旁白）、
   set 是播完記在 S.story 的旗標、next 是接著播的段落（字串或函式）。文字守世界觀第 4 節，淺顯，不用時辰、不用艱深詞 */
'use strict';
const NPCS = {
  bone: {
    n: '撿骨師',
    sp: 'ghost_priest',
    when: () => true,
    /* 有未鑑定的裝備（已經認識之後）：不閒聊，直接開獎；其他時候照舊說一句 */
    talk: s =>
      s.story.boneMet && unidN(s)
        ? ''
        : s.story.boneMet
          ? 'bone_' + ((s.story.boneN = (s.story.boneN || 0) + 1) % 4)
          : 'bone_first',
    done() {
      if (unidN(S)) revealOpen();
    }
  },
  /* 赤鴉：狩獵之血解鎖（S.story.crow）才出現 */
  crow: {
    n: '赤鴉',
    sp: 'ghost_priest',
    when: s => !!s.story.crow,
    talk: () => 'crow_first'
  },
  /* 破曉軍團：只在世界地圖的對話裡出現，不在藏身處 */
  dawn: { n: '破曉軍團哨兵', sp: 'ghost_priest', when: () => false, talk: () => '' },
  /* 天星商會（世界觀第 6 節）：第一次先打招呼，之後直接開店；sp 是暫代圖，提示詞在 docs/怪物提示詞.md */
  trader: {
    n: '天星商會掌櫃',
    sp: 'ghost_priest',
    when: () => true,
    talk: s => (s.story.shopMet ? '' : 'trader_first'),
    done() {
      S.story.shopN = (S.story.shopN || 0) + 1;
      openPanel('shop');
    }
  }
};
/* 掌櫃每次開店換一句：神秘管道只留伏筆，不解釋 */
const TRADER_SAY = [
  '路斷了？商會的貨，從來不走路。',
  '貨從哪裡來？客人，這不是該問的事。',
  '三年前的帳還沒結清，生意不能停。',
  '今天的貨，昨天晚上才到。別問怎麼到的。'
];
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
  trader_first: {
    set: 'shopMet',
    lines: [
      ['trader', '天星商會，歡迎光臨。'],
      ['trader', '城沒了，路也斷了，商會的貨還是準時到。'],
      ['trader', '別問是怎麼送來的。有金幣就好。']
    ]
  },
  /* 第一次走到設施：撿骨師提一句，不是教學（prologue.js 的 proHint） */
  hint_asc: {
    set: 'h_asc',
    lines: [['bone', '那是昇華石碑。選一條路，你身上的血會跟著變。想換路也可以，只是要重走一次。']]
  },
  hint_forge: {
    set: 'h_forge',
    lines: [
      ['bone', '鍛造台還能用。怪物留下的石頭拿來給裝備加詞，數值不滿意就淬鍊。地圖裡撿的裝備先拿給我看，我替你鑑定。']
    ]
  },
  hint_tree: {
    set: 'h_tree',
    lines: [['bone', '變強的路記在你的血裡。升級拿到的點數，一格連著一格往外點。']]
  },
  /* 世界地圖的劇情區：第一次走到這一步時播（wmap.js 的 wmStory）；教一件事，順便把世界交代清楚 */
  st_0: {
    set: 'st_0',
    lines: [
      ['bone', '這張圖是地圖台留下來的。走得到的地方都在上面。'],
      ['bone', '發亮的就是你下一步能去的地方。'],
      ['bone', '地層出口還有東西在爬。先把門口清乾淨。']
    ]
  },
  st_1: {
    set: 'st_1',
    lines: [
      ['bone', '河乾了，渡口還在。'],
      ['bone', '每張地圖都有一張卡。星越多，裡面越兇，掉的東西也越好。'],
      ['bone', '這一張是固定的。走遠了，你要自己挑。']
    ]
  },
  st_2: {
    set: 'st_2',
    lines: [
      ['dawn', '你是從地層走出來的？三年了，沒有人走得出來。'],
      ['dawn', '我們是破曉軍團。還站得起來的人，都在這裡。'],
      ['dawn', '撿到的裝備別放著。穿上去，再到技能面板升級、插輔助，技能才會變強。']
    ]
  },
  st_3: {
    set: 'st_3',
    lines: [
      ['bone', '礦道裡的東西比外面兇。'],
      ['bone', '卡上寫的每一條都是真的。怪物多幾成生命、多幾成傷害，進去之前先看清楚。'],
      ['bone', '風險挑得越大，帶回來的越多。打不動就退回來，地圖卡換一批再去。']
    ]
  },
  st_4: {
    set: 'st_4',
    lines: [
      [null, '斷牆上刻著一隻烏鴉，爪子指著天上的裂縫。'],
      ['bone', '鴉衛的記號。他們人不多，但到處都有他們的眼睛。'],
      ['bone', '天上那道裂縫，他們查了三年。地圖上標著黃色的，就是你下一步該去的地方。']
    ]
  },
  st_5: {
    set: 'st_5',
    lines: [
      ['trader', '路斷了，商隊還在走。客人，要買還是要賣？'],
      ['trader', '用不到的裝備帶回藏身處賣掉。金幣拿來，跟我買一件碰碰運氣。'],
      ['trader', '天星商會的貨，從來不會遲到。']
    ]
  },
  st_6: {
    set: 'st_6',
    lines: [
      ['bone', '這裡原本有人住。'],
      ['bone', '你身上流的血不一樣。回藏身處，到昇華石碑選一條路，那血會跟著變。'],
      ['bone', '走吧。火還沒滅。']
    ]
  },
  st_7: {
    set: 'st_7',
    lines: [
      ['crow', '別動。前面那片霧，不是霧。'],
      ['crow', '那是血。霧會跟著你身上的味道聚過來，裡面的怪物也會變得更兇。'],
      ['crow', '我是赤鴉。霧聚滿了，裂口才進得去。到時候要不要下去，你自己決定。']
    ]
  },
  st_8: {
    set: 'st_8',
    lines: [
      ['bone', '再過去就是裂谷。那邊的路，我沒走過。'],
      ['bone', '打倒守在那裡的東西。之後要往哪裡走，你自己看。']
    ]
  },
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
const talkOpen = id => talkPlay(NPCS[id].talk(S), NPCS[id].done);
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
