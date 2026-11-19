// 게임 속 튜토리얼. 첫 전투에서 한 번에 하나씩만 알려 줍니다.
// 단계는 저장 기록의 data.tut 에 들어 있고, 'done' 이면 끝난 것입니다.
//
// 단계 순서
//   start    지도에서 첫 칸 고르기
//   basic    기본 공격 누르기      → basicQ   답 고르기
//   skill    스킬 누르기           → skillQ   답 고르기
//   defend   방어 누르기 (3턴째의 강한 공격) → defendQ 답 고르기
//   free     자유롭게 싸우기 (필살기가 차면 따로 안내)
//   reward   강화 고르기
//   map      다음 칸 고르기 → done

// 지금 단계에서 이 일이 일어나면 다음 단계로 넘어갑니다.
const NEXT = {
  start: { fight: 'basic' },
  basic: { 'chose:basic': 'basicQ' },
  basicQ: { answered: 'skill' },
  skill: { 'chose:skill': 'skillQ' },
  skillQ: { answered: 'defend' },
  defend: { 'chose:defend': 'defendQ' },
  defendQ: { answered: 'free' },
  free: { won: 'reward' },
  reward: { rewarded: 'map' },
  map: { picked: 'done' },
};

// 이 단계에서는 이 버튼만 누를 수 있습니다.
const ONLY = { basic: 'basic', skill: 'skill', defend: 'defend' };

// 단계별 안내 문구 (lang 파일의 tut.<이름>)
const COACH = {
  start: 'tut.start',
  basic: 'tut.basic',
  basicQ: 'tut.answer',
  skill: 'tut.skill',
  skillQ: 'tut.answer',
  defend: 'tut.defend',
  defendQ: 'tut.guard',
  free: 'tut.free',
  reward: 'tut.reward',
  map: 'tut.map',
};

export function createTutorial(data, onStep) {
  let ultReady = false;

  // 전투 도중에 닫았다가 다시 열면 지도에서 시작하므로, 전투 단계는 처음으로 되돌립니다.
  if (data.tut !== 'done' && data.tut !== 'map' && data.tut !== 'start') data.tut = 'start';

  return {
    // 튜토리얼 전투가 진행 중인지 (피해가 줄고 쓰러지지 않습니다)
    active: () => data.tut !== 'done' && data.tut !== 'map',
    only: () => ONLY[data.tut] || null,
    coach() {
      if (data.tut === 'done') return null;
      if (data.tut === 'free' && ultReady) return 'tut.ult';
      return COACH[data.tut] || null;
    },
    setUltReady(ready) {
      ultReady = ready;
    },
    emit(event) {
      if (data.tut === 'done') return;
      let to = (NEXT[data.tut] || {})[event];
      // 예상보다 일찍 이겨도 보상 안내로 넘어갑니다.
      if (!to && event === 'won' && data.tut !== 'map') to = 'reward';
      if (!to) return;
      data.tut = to;
      onStep();
    },
  };
}
