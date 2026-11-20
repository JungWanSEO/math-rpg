// 효과음. 소리 파일 없이 브라우저가 직접 짧은 음을 만들어 냅니다. (Web Audio)
// 새 소리를 넣으려면 SOUNDS 에 한 줄을 추가하고, 원하는 곳에서 play('이름') 을 부릅니다.
let ctx = null;
let on = true;

// 음 하나: [주파수(Hz), 시작(초), 길이(초), 파형, 끝 주파수(선택)]
const SOUNDS = {
  tap: [[520, 0, 0.05, 'triangle']],
  right: [[660, 0, 0.09, 'triangle'], [990, 0.08, 0.14, 'triangle']],
  wrong: [[220, 0, 0.16, 'sawtooth', 150], [150, 0.14, 0.2, 'sawtooth', 110]],
  hit: [[300, 0, 0.1, 'square', 90]],
  hurt: [[160, 0, 0.22, 'sawtooth', 60]],
  block: [[880, 0, 0.06, 'square'], [1320, 0.05, 0.1, 'square']],
  warn: [[440, 0, 0.12, 'square'], [440, 0.18, 0.12, 'square']],
  ult: [[440, 0, 0.08, 'square'], [660, 0.07, 0.08, 'square'], [880, 0.14, 0.08, 'square'], [1320, 0.21, 0.25, 'square']],
  win: [[523, 0, 0.12, 'triangle'], [659, 0.11, 0.12, 'triangle'], [784, 0.22, 0.12, 'triangle'], [1047, 0.33, 0.3, 'triangle']],
  lose: [[392, 0, 0.2, 'triangle'], [330, 0.2, 0.2, 'triangle'], [262, 0.4, 0.45, 'triangle']],
  clear: [[523, 0, 0.14, 'triangle'], [659, 0.13, 0.14, 'triangle'], [784, 0.26, 0.14, 'triangle'], [1047, 0.39, 0.14, 'triangle'], [784, 0.52, 0.1, 'triangle'], [1047, 0.62, 0.5, 'triangle']],
};
const VOLUME = 0.12;

export function setSound(value) {
  on = Boolean(value);
}
export function soundOn() {
  return on;
}

export function play(name) {
  const notes = SOUNDS[name];
  if (!on || !notes) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume(); // 브라우저는 화면을 한 번 누른 뒤에야 소리를 허락합니다.
    const now = ctx.currentTime;
    for (const [freq, at, len, wave, endFreq] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + at);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + at + len);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(VOLUME, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + len + 0.02);
    }
  } catch (e) {
    // 소리를 낼 수 없는 환경에서는 조용히 넘어갑니다.
  }
}
