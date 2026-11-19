// "지도 한 장"의 상태. 체력, 골드, 힌트, 강화는 지도 한 장 동안 유지됩니다.
import { CONFIG } from './config.js';

// 칸 종류와 나올 확률의 무게 (첫 칸, 휴식 칸, 보스 칸은 따로 정합니다)
const WEIGHTS = { battle: 4, elite: 2, treasure: 2, shop: 1.5, rest: 1.5 };

function weightedPick(types) {
  const total = types.reduce((sum, type) => sum + WEIGHTS[type], 0);
  let r = Math.random() * total;
  for (const type of types) {
    r -= WEIGHTS[type];
    if (r < 0) return type;
  }
  return types[types.length - 1];
}

// 줄마다 고를 수 있는 칸 2~3개를 만듭니다.
// 모든 줄에는 싸우는 칸이 하나 이상 있어서, 전투만으로도 끝까지 갈 수 있습니다.
export function makeMap() {
  const count = CONFIG.map.rows;
  const rows = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      rows.push([{ type: 'battle' }]);
    } else if (i === count - 1) {
      rows.push([{ type: 'boss' }]);
    } else if (i === count - 2) {
      rows.push([{ type: 'rest' }, { type: 'shop' }]); // 보스 직전에는 준비할 기회
    } else {
      const fight = i >= 2 && Math.random() < 0.35 ? 'elite' : 'battle';
      const types = [fight];
      const size = 2 + (Math.random() < 0.4 ? 1 : 0);
      let pool = Object.keys(WEIGHTS).filter((type) => type !== fight && (type !== 'elite' || i >= 2));
      if (i === Math.floor(count / 2) && !types.includes('rest')) {
        types.push('rest'); // 중간쯤에 쉬는 칸을 보장
        pool = pool.filter((type) => type !== 'rest');
      }
      while (types.length < size && pool.length) {
        const type = weightedPick(pool);
        types.push(type);
        pool = pool.filter((other) => other !== type);
      }
      rows.push(types.map((type) => ({ type })));
    }
  }
  return rows;
}

export function newRun(unitId) {
  return {
    unit: unitId,
    rows: makeMap(),
    row: 0,          // 지금 고를 줄
    picked: [],      // 줄마다 고른 칸의 번호
    hp: CONFIG.player.hp,
    maxHp: CONFIG.player.hp,
    gold: 0,
    hints: CONFIG.player.hints,
    up: { basic: 0, skill: 0, counter: 0, weak: 0 }, // 강화로 더해진 값
    lastFoe: null,
  };
}

// 강화 목록. 이름과 설명은 lang 파일의 up.<id> 에 있습니다.
export const UPGRADES = {
  maxhp: (run) => { run.maxHp += 4; run.hp += 4; },
  heal: (run) => { run.hp = Math.min(run.maxHp, run.hp + 8); },
  hint: (run) => { run.hints += 1; },
  basic: (run) => { run.up.basic += 1; },
  skill: (run) => { run.up.skill += 1; },
  counter: (run) => { run.up.counter += 1; },
  weak: (run) => { run.up.weak += 0.5; },
};

// 전투 보상으로 보여줄 강화를 겹치지 않게 뽑습니다.
export function rollUpgrades(count = 3) {
  const ids = Object.keys(UPGRADES);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}

// 상점에서 파는 것과 가격
export const SHOP = [
  { id: 'heal', price: 30 },
  { id: 'hint', price: 25 },
  { id: 'basic', price: 50 },
  { id: 'maxhp', price: 60 },
  { id: 'skill', price: 70 },
];
