// 게임의 숫자를 한곳에 모아 둔 파일입니다.
// 재미를 조정할 때는 이 파일의 값만 바꾸면 됩니다. 모두 임시 값입니다.
export const CONFIG = {
  // 처음 열 단원 (data/units/ 안의 파일 이름)
  unit: 'math1-trig',

  // 지원 언어와 기본 언어 (lang/ 안의 파일 이름)
  langs: ['ja', 'ko', 'en'],
  defaultLang: 'ja',

  player: {
    hp: 20,          // 최대 체력
    healOnWin: 5,    // 전투에서 이기면 회복하는 체력
  },

  damage: {
    basic: 2,        // 기본 공격 (쉬운 문제)
    skill: 5,        // 스킬 (어려운 문제)
    ult: 8,          // 필살기
    weakBonus: 1.5,  // 적의 약점 유형을 맞혔을 때 곱하는 값
  },

  basicLevel: 1,     // 기본 공격이 내는 문제 단계
  ultNeed: 3,        // 필살기에 필요한 연속 정답 수
  defendReduce: 0.5, // 방어했을 때 받는 피해 비율

  foeAttack: {
    normal: 3,       // 적의 보통 공격
    big: 6,          // 적의 강한 공격
    bigEvery: 3,     // 몇 턴마다 강한 공격을 하는지
  },

  saveKey: 'mathrpg_save_v1',
};
