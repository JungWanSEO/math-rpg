// 문제 불러오기와 출제.
//
// 단원 파일(data/units/*.json)은 "문장 틀(templates)"로 되어 있습니다.
//   - items 가 있는 틀: 적어 둔 숫자 묶음 중에서 냅니다.
//   - gen 이 있는 틀: js/generators.js 가 매번 새 숫자를 만들어 냅니다.
// 틀 하나만 3개 언어로 쓰면, 숫자만 다른 문제가 전부 3개 언어로 나옵니다.
//
// 유형의 이름은 "단원/유형" 입니다. (예: math1-trig/sinerule)
// 플레이어가 고른 범위(유형 목록) 안에서만 문제를 냅니다.
import { fill, pick } from './i18n.js';
import { GENERATORS } from './generators.js';

let catalog = null;
const units = [];
const templates = [];        // 모든 틀 { id, level, type, tpl, gen }
const types = new Map();     // "단원/유형" → { key, unit, names }
const usedItems = new Map(); // 틀 id → 이미 낸 숫자 묶음의 번호
const recent = [];           // 자동 생성 문제의 최근 기록 (바로 같은 문제가 나오지 않게)
let scope = null;            // 범위: 유형 이름의 집합. null 이면 전체
let last = null;

async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// 목록(data/catalog.json)에 적힌 모든 단원을 불러옵니다.
export async function loadAll() {
  catalog = await getJson('./data/catalog.json');
  for (const subject of catalog.subjects) {
    for (const id of subject.units) {
      const unit = await getJson(`./data/units/${id}.json`);
      unit.subject = subject;
      units.push(unit);
      for (const [name, names] of Object.entries(unit.types)) {
        const key = `${unit.id}/${name}`;
        types.set(key, { key, unit, names });
      }
      for (const tpl of unit.templates) {
        templates.push({
          id: `${unit.id}/${tpl.id}`,
          level: tpl.level,
          type: `${unit.id}/${tpl.type}`,
          tpl,
          gen: tpl.gen ? GENERATORS[tpl.gen] : null,
        });
      }
    }
  }
  return { catalog, units };
}

// ---- 유형 정보 (범위 선택 화면과 도감이 씁니다) ----
export const typeLabel = (key) => (types.has(key) ? pick(types.get(key).names) : key);
export const allTypeKeys = () => [...types.keys()];
export const hasType = (key) => types.has(key);

// 과목 → 단원 → 묶음 → 유형 의 나무 모양 목록
export function scopeTree() {
  return catalog.subjects.map((subject) => ({
    names: subject.name,
    units: units.filter((u) => u.subject === subject).map((unit) => ({
      names: unit.name,
      groups: (unit.groups || [{ name: unit.name, types: Object.keys(unit.types) }]).map((group) => ({
        names: group.name,
        types: group.types.map((name) => `${unit.id}/${name}`),
      })),
    })),
  }));
}

// 유형 목록에 걸친 과목 이름들 (화면 위쪽에 보여줍니다)
export function subjectNames(keys) {
  const seen = [];
  for (const key of keys) {
    const type = types.get(key);
    if (type && !seen.includes(type.unit.subject)) seen.push(type.unit.subject);
  }
  return seen.map((subject) => pick(subject.name));
}

// ---- 범위 ----
export function setScope(keys) {
  const valid = (keys || []).filter((key) => types.has(key));
  scope = valid.length ? new Set(valid) : null;
  usedItems.clear();
  recent.length = 0;
}
const inScope = (entry) => !scope || scope.has(entry.type);

// ---- 출제 ----
const rand = (n) => Math.floor(Math.random() * n);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 틀에서 숫자 묶음 하나를 고릅니다.
function itemFrom(entry) {
  if (entry.gen) {
    // 자동 생성: 최근에 낸 것과 겹치지 않을 때까지 몇 번 다시 만듭니다.
    let item = entry.gen(entry.tpl.params || {});
    for (let tries = 0; tries < 12; tries++) {
      const sig = `${entry.id}:${JSON.stringify(item)}`;
      if (!recent.includes(sig)) {
        recent.push(sig);
        if (recent.length > 24) recent.shift();
        break;
      }
      item = entry.gen(entry.tpl.params || {});
    }
    return item;
  }
  // 적어 둔 목록: 한 바퀴 다 돌 때까지 같은 것은 내지 않습니다.
  const items = entry.tpl.items;
  let used = usedItems.get(entry.id);
  if (!used || used.size >= items.length) {
    used = new Set();
    usedItems.set(entry.id, used);
  }
  const left = items.map((_, i) => i).filter((i) => !used.has(i));
  const index = left[rand(left.length)];
  used.add(index);
  return items[index];
}

function build(entry) {
  const item = itemFrom(entry);
  const options = shuffle([String(item.answer), ...item.wrong.map(String)]);
  last = {
    raw: { tpl: entry.tpl, item },
    level: entry.level,
    type: entry.type,
    options,
    correct: options.indexOf(String(item.answer)),
  };
  return last;
}

// 유형을 먼저 고르고, 그 유형의 틀 중 하나를 고릅니다. (유형마다 고르게 나오도록)
function pickEntry(candidates) {
  const byType = new Map();
  for (const entry of candidates) {
    if (!byType.has(entry.type)) byType.set(entry.type, []);
    byType.get(entry.type).push(entry);
  }
  const groups = [...byType.values()];
  const group = groups[rand(groups.length)];
  return group[rand(group.length)];
}

// 단계에 맞는 문제를 하나 냅니다.
// 범위 안에 그 단계의 문제가 없으면 가장 가까운 단계의 문제를 냅니다.
export function next(level) {
  const pool = templates.filter(inScope);
  for (const distance of [0, 1, 2]) {
    const candidates = pool.filter((entry) => Math.abs(entry.level - level) === distance);
    if (candidates.length) {
      // 같은 거리라면 더 어려운 쪽보다 원래 단계에 가까운 쉬운 쪽을 먼저 봅니다.
      const lower = candidates.filter((entry) => entry.level <= level);
      return build(pickEntry(lower.length ? lower : candidates));
    }
  }
  return build(pickEntry(templates));
}

// 유형을 정해서 문제를 하나 냅니다. (휴식 칸의 복습에 씁니다) 없으면 null.
export function nextByType(key) {
  const candidates = templates.filter((entry) => entry.type === key);
  return candidates.length ? build(pickEntry(candidates)) : null;
}

// 지금 언어로 문제 문장과 해설을 만듭니다. 언어를 바꾸면 다시 부르면 됩니다.
export function questionText(raw) {
  return fill(pick(raw.tpl.text), raw.item);
}

export function explainText(raw) {
  return fill(pick(raw.tpl.explain), raw.item);
}

// 자동 검사 도구가 방금 낸 문제의 정답을 확인할 때 씁니다. 게임에서는 쓰지 않습니다.
export const debugLast = () => last;
