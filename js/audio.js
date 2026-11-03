/* dungeonPOE · 合成音效（Web Audio，沒有音檔） */
'use strict';
let AC;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
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
  s.connect(f).connect(g).connect(a.destination);
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
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}
let lastHit = 0;
function sfx(k) {
  try {
    const now = ac().currentTime;
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
      lvup: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 0.09, 'triangle', i * 0.08)),
      slam: () => (tone(90, 40, 0.3, 0.35, 'sine'), nz(0.25, 400, 80, 0.3, 'lowpass')),
      die: () => tone(300, 60, 0.8, 0.25, 'sawtooth'),
      cast: () => (tone(300, 900, 0.18, 0.08, 'sine'), nz(0.15, 1200, 3000, 0.05)),
      portal: () => [330, 440, 660].forEach((f, i) => tone(f, f * 1.5, 0.4, 0.07, 'sine', i * 0.06)),
      block: () => (tone(900, 700, 0.08, 0.12, 'square'), nz(0.06, 3000, 1500, 0.1, 'highpass')),
      boss: () => [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.5, 0.1, 'triangle', i * 0.12))
    })[k]();
  } catch (e) {}
}
