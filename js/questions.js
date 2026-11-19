// 문제 불러오기와 출제.
// 단원 파일은 "문장 틀(templates)"과 "숫자 묶음(items)"으로 되어 있습니다.
// 틀 하나만 3개 언어로 쓰면, 숫자만 다른 문제가 전부 3개 언어로 나옵니다.
import { fill, pick } from './i18n.js';

let pool = [];
const used = new Set();

export async function loadUnit(id) {
  const res = await fetch(`./data/units/${id}.json`);
  if (!res.ok) throw new Error(`data/units/${id}.json ${res.status}`);
  const unit = await res.json();
  pool = expand(unit);
  used.clear();
  return unit;
}

// 틀 × 숫자 묶음을 낱개 문제로 펼칩니다.
export function expand(unit) {
  const list = [];
  for (const tpl of unit.templates) {
    tpl.items.forEach((item, i) => {
      list.push({ id: `${tpl.id}-${i}`, level: tpl.level, type: tpl.type, tpl, item });
    });
  }
  return list;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 단계에 맞는 문제를 하나 뽑습니다. 한 바퀴 다 돌 때까지 같은 문제는 나오지 않습니다.
export function next(level) {
  let candidates = pool.filter((q) => q.level === level && !used.has(q.id));
  if (!candidates.length) {
    pool.filter((q) => q.level === level).forEach((q) => used.delete(q.id));
    candidates = pool.filter((q) => q.level === level);
  }
  if (!candidates.length) candidates = pool;
  const raw = candidates[Math.floor(Math.random() * candidates.length)];
  used.add(raw.id);
  const options = shuffle([raw.item.answer, ...raw.item.wrong]);
  return { raw, level: raw.level, type: raw.type, options, correct: options.indexOf(raw.item.answer) };
}

// 지금 언어로 문제 문장과 해설을 만듭니다. 언어를 바꾸면 다시 부르면 됩니다.
export function questionText(raw) {
  return fill(pick(raw.tpl.text), raw.item);
}

export function explainText(raw) {
  return fill(pick(raw.tpl.explain), raw.item);
}
