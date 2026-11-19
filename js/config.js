// 게임의 숫자를 한곳에 모아 둔 파일입니다.
// 재미를 조정할 때는 이 파일의 값만 바꾸면 됩니다. 모두 임시 값입니다.
export const CONFIG = {
  // 처음 열 단원 (data/units/ 안의 파일 이름)
  unit: 'math1-trig',

  // 지원 언어와 기본 언어 (lang/ 안의 파일 이름)
  langs: ['ja', 'ko', 'en'],
  defaultLang: 'ja',

  player: {
    hp: 30,          // 최대 체력
    hints: 1,        // 지도 한 장을 시작할 때 가진 힌트 수
    healOnWin: 4,    // 전투에서 이기면 회복하는 체력
  },

  damage: {
    basic: 2,        // 기본 공격 (쉬운 문제)
    skill: 5,        // 스킬 (어려운 문제)
    ult: 8,          // 필살기
    counter: 1,      // 방어 문제를 맞혔을 때의 반격
    weakBonus: 1.5,  // 적의 약점 유형을 맞혔을 때 곱하는 값
  },

  ultNeed: 3,        // 필살기에 필요한 연속 정답 수
  guardLevel: 1,     // 방어가 내는 문제 단계
  defendReduce: 0.5, // 방어 문제를 틀렸을 때 받는 피해 비율 (맞히면 0)

  foeAttack: {
    normal: 2,       // 적의 보통 공격
    big: 8,          // 적의 강한 공격 (예고를 보고 방어로 막아야 하는 공격)
    bigEvery: 3,     // 몇 턴마다 강한 공격을 하는지
  },

  elite: { hpMul: 1.3, attackAdd: 1 }, // 강적: 체력 배수, 공격 추가
  midboss: { attackAdd: 0 },           // 중간 보스: 공격 추가 (체력은 monsters.json)
  boss: { attackAdd: 1 },              // 보스: 공격 추가 (체력은 monsters.json)

  map: {
    half: 4,         // 중간 보스 앞뒤로 갈라지는 길이 몇 층씩인지 (전체 층수 = half × 2 + 2)
    width: 4,        // 가로로 놓이는 칸의 최대 수
    paths: 4,        // 길을 몇 가닥 긋는지 (많을수록 칸과 갈림길이 늘어납니다)
  },

  mystery: {
    spring: 6,       // ? 칸 "샘물": 회복하는 체력
    fog: 3,          // ? 칸 "짙은 안개": 잃는 체력 (1 아래로는 내려가지 않음)
    purse: 25,       // ? 칸 "떨어진 지갑": 얻는 골드
    thief: 15,       // ? 칸 "소매치기": 잃는 골드
    statueLoss: 4,   // ? 칸 "수상한 석상": 문제를 틀렸을 때 잃는 체력
  },

  gold: {
    battle: 20,       // 전투 승리 보상
    elite: 35,        // 강적 승리 보상
    midboss: 40,      // 중간 보스 승리 보상
    boss: 50,         // 보스 승리 보상
    treasureWin: 30,  // 보물 문제를 맞혔을 때
    treasureLose: 10, // 보물 문제를 틀렸을 때
  },

  rest: {
    healRatio: 0.3,  // 쉬기: 최대 체력의 몇 배를 회복하는지
    reviewHeal: 3,   // 복습 문제를 맞혔을 때 회복하는 체력
  },

  codexStreak: 3,    // 한 유형을 몇 번 연속으로 맞히면 "정복"인지

  saveKey: 'mathrpg_save_v1',
};
