/* dungeonPOE · 合成音效（Web Audio，沒有音檔） */
'use strict';
let AC, OUT;
/* 關音效（設定，S.mute）：所有聲音都接總音量 OUT（開場動畫也是），關了就是 0 */
const muted = () => typeof S !== 'undefined' && S && !!S.mute;
function ac() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    OUT = AC.createGain();
    OUT.connect(AC.destination);
  }
  OUT.gain.value = muted() ? 0 : 1;
  return AC;
}
/* 第一次點或按鍵才建立（瀏覽器規定有手勢才能出聲，太早建立會跳警告）；之後每次手勢只在被暫停時恢復（M0-06） */
function audioWake() {
  ac();
  if (AC.state === 'suspended') AC.resume();
}
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, audioWake, { capture: true, passive: true });
let NOISE;
function noise() {
  const a = ac();
  if (NOISE) return NOISE;
  NOISE = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
  const d = NOISE.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return NOISE;
}
/* 一段噪音（揮刀、打中）或一個音（撿東西、升級） */
function nz(dur, f0, f1, vol, type = 'bandpass') {
  const a = ac(),
    t = a.currentTime,
    s = a.createBufferSource(),
    f = a.createBiquadFilter(),
    g = a.createGain();
  s.buffer = noise();
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(OUT);
  s.start(t);
  s.stop(t + dur);
}
function tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
  const a = ac(),
    t = a.currentTime + delay,
    o = a.createOscillator(),
    g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(OUT);
  o.start(t);
  o.stop(t + dur);
}
let lastHit = 0;
/* M2-12 §8：回饋類的聲音同時最多 2 個（戰鬥的打擊聲不算）；FB_END＝正在響的那幾個結束的時間 */
const FB = new Set([
  'lvup',
  'coin',
  'rare',
  'orb',
  'star',
  'mem',
  'chase',
  'chaseBell',
  'boss',
  'die',
  'thud',
  'flip',
  'flipRare'
]);
let FB_END = [];
/* 震動（M2-12 §8，只有 Android 有 navigator.vibrate；iOS 什麼都不做）：設定「手機震動」關了就不震 */
const buzz = ms => {
  if (typeof S !== 'undefined' && S && S.vib !== 0 && navigator.vibrate) navigator.vibrate(ms);
};
function sfx(k) {
  if (muted() || !AC) return; /* 還沒有手勢：略過 */
  try {
    const now = ac().currentTime;
    if (FB.has(k)) {
      FB_END = FB_END.filter(t => t > now);
      if (FB_END.length >= 2) return;
      FB_END.push(now + 0.6);
    }
    if ((k === 'hit' || k === 'crit') && now - lastHit < 0.03) return;
    if (k === 'hit' || k === 'crit') lastHit = now;
    ({
      swing: () => nz(0.12, 2400, 700, 0.12),
      throw: () => nz(0.15, 4000, 1500, 0.08),
      hit: () => (nz(0.08, 900, 200, 0.35, 'lowpass'), tone(160, 60, 0.08, 0.25, 'square')),
      crit: () => (
        nz(0.14, 1600, 200, 0.45, 'lowpass'),
        tone(220, 50, 0.16, 0.3, 'square'),
        tone(1400, 900, 0.12, 0.08, 'triangle')
      ),
      hurt: () => (tone(200, 80, 0.18, 0.25, 'sawtooth'), nz(0.12, 600, 150, 0.25, 'lowpass')),
      roll: () => nz(0.18, 500, 1400, 0.1),
      perfect: () => (tone(1800, 1800, 0.35, 0.12, 'triangle'), tone(2700, 2700, 0.3, 0.06, 'sine', 0.04)),
      drink: () => tone(500, 900, 0.18, 0.12, 'sine'),
      coin: () => (tone(1500, 1500, 0.06, 0.08, 'square'), tone(2000, 2000, 0.1, 0.06, 'square', 0.05)),
      pick: () => tone(700, 1100, 0.1, 0.1, 'triangle'),
      rare: () => [660, 880, 1320].forEach((f, i) => tone(f, f, 0.25, 0.08, 'triangle', i * 0.07)),
      equip: () => nz(0.1, 3000, 1200, 0.1, 'highpass'),
      /* 掉落的四樣（8-3，企劃書 5.4）：★（破裂）＝高亮的五連音加閃光、追憶＝低沉的雙音加共鳴；開獎＝翻牌、翻到好的另有一聲 */
      star: () => (
        [880, 1109, 1319, 1760, 2217].forEach((f, i) => tone(f, f, 0.45, 0.1, 'triangle', i * 0.06)),
        tone(3520, 3520, 0.6, 0.04, 'sine', 0.3)
      ),
      mem: () => (
        tone(220, 220, 0.7, 0.1, 'sine'),
        tone(330, 330, 0.7, 0.09, 'sine', 0.12),
        tone(660, 990, 0.6, 0.05, 'triangle', 0.25)
      ),
      drop0: () => 0,
      /* 追逐物品（M2-19.2h）：低鑼＋五度泛音＋金屬沙沙、上行五聲音階、長鈴，約 1.6 秒；合併進來的第二件與離線摘要只響鈴 */
      chase: () => (
        tone(98, 92, 1.2, 0.22, 'sine'),
        tone(147, 140, 1.0, 0.1, 'sine', 0.02),
        nz(0.5, 6000, 2500, 0.06, 'highpass'),
        [587, 698, 880, 1047, 1397].forEach((f, i) => tone(f, f, 0.32, 0.09, 'triangle', 0.12 + i * 0.06)),
        tone(2794, 2794, 1.1, 0.06, 'sine', 0.48)
      ),
      chaseBell: () => (tone(2794, 2794, 0.9, 0.06, 'sine'), tone(3520, 3520, 0.7, 0.04, 'sine', 0.08)),
      /* 稀有通貨（0.4.1）：明亮的上行三音加一聲長鈴 */
      orb: () => (
        [1047, 1319, 1568].forEach((f, i) => tone(f, f, 0.3, 0.09, 'triangle', i * 0.05)),
        tone(2093, 2093, 0.7, 0.05, 'sine', 0.18)
      ),
      flip: () => (nz(0.05, 2500, 900, 0.08, 'highpass'), tone(520, 620, 0.06, 0.06, 'triangle')),
      flipRare: () => [784, 988, 1175].forEach((f, i) => tone(f, f, 0.2, 0.08, 'triangle', i * 0.05)),
      lvup: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 0.09, 'triangle', i * 0.08)),
      slam: () => (tone(90, 40, 0.3, 0.35, 'sine'), nz(0.25, 400, 80, 0.3, 'lowpass')),
      die: () => tone(300, 60, 0.8, 0.25, 'sawtooth'),
      /* 資源不夠（M2-12 §8）：悶木聲 */
      thud: () => (tone(140, 90, 0.12, 0.2, 'sine'), nz(0.06, 500, 200, 0.12, 'lowpass')),
      cast: () => (tone(300, 900, 0.18, 0.08, 'sine'), nz(0.15, 1200, 3000, 0.05)),
      portal: () => [330, 440, 660].forEach((f, i) => tone(f, f * 1.5, 0.4, 0.07, 'sine', i * 0.06)),
      block: () => (tone(900, 700, 0.08, 0.12, 'square'), nz(0.06, 3000, 1500, 0.1, 'highpass')),
      boss: () => [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.5, 0.1, 'triangle', i * 0.12))
    })[k]();
  } catch (e) {}
}
