// 시작점이자 진행 담당.
// 지도 → (칸을 고름) → 전투 / 상점 / 휴식 / 보물 → 다음 줄 → … → 보스 → 새 지도
import { CONFIG } from './config.js';
import { loadLang, applyStatic, t, pick } from './i18n.js';
import { load, store } from './save.js';
import { loadUnit } from './questions.js';
import { newRun } from './run.js';
import { createStage } from './stage.js';
import { createBattle } from './battle.js';
import { createMap } from './map.js';
import { createEvents } from './events.js';
import { createCodex } from './codex.js';
import { createTutorial } from './tutorial.js';
import { $, show } from './ui.js';

async function boot() {
  const data = load();
  if (!CONFIG.langs.includes(data.lang)) data.lang = CONFIG.defaultLang;
  await loadLang(data.lang);
  applyStatic();

  const [unit, monsters] = await Promise.all([
    loadUnit(CONFIG.unit),
    fetch('./data/monsters.json').then((res) => {
      if (!res.ok) throw new Error(`data/monsters.json ${res.status}`);
      return res.json();
    }),
  ]);

  if (!data.run || data.run.unit !== CONFIG.unit) data.run = newRun(CONFIG.unit);
  const getRun = () => data.run;
  const persist = () => store(data);
  let screen = 'screenMap';

  // 튜토리얼 안내 줄
  function updateCoach() {
    const key = tutorial.coach();
    const el = $('coach');
    el.hidden = !key || screen === 'screenCodex';
    if (key) el.textContent = t(key);
  }
  const tutorial = createTutorial(data, () => {
    persist();
    updateCoach();
  });

  // 유형별 정답 기록 (도감과 복습에 씁니다)
  function record(type, ok) {
    const entry = data.codex[type] || { right: 0, wrong: 0, streak: 0 };
    if (ok) {
      entry.right += 1;
      entry.streak = (entry.streak || 0) + 1;
    } else {
      entry.wrong += 1;
      entry.streak = 0;
    }
    data.codex[type] = entry;
    persist();
  }

  // 위쪽 상태 줄
  function onChange() {
    const run = getRun();
    $('subjectName').textContent = pick(unit.subject);
    $('unitName').textContent = pick(unit.area);
    $('runStatus').textContent = t('ui.status', {
      hp: Math.max(0, run.hp),
      max: run.maxHp,
      gold: run.gold,
      hints: run.hints,
    });
    updateCoach();
  }

  const stage = createStage($('stage'));
  const battle = createBattle({ stage, unit, getRun, record, tutorial, onChange });
  const events = createEvents({ getRun, data, unit, record, onChange });
  const map = createMap({ getRun, onPick });
  const codex = createCodex({ data, unit, monsters });

  function go(name) {
    screen = name;
    show(name);
    // 도감은 지도와 이벤트 화면에서만 엽니다. (전투 중에는 숨김)
    $('codexBtn').hidden = name === 'screenBattle' || name === 'screenCodex';
    onChange();
  }

  // 도감 열고 닫기: 닫으면 보던 화면으로 돌아갑니다.
  let beforeCodex = 'screenMap';
  $('codexBtn').addEventListener('click', () => {
    beforeCodex = screen;
    go('screenCodex');
    codex.render();
  });
  $('codexClose').addEventListener('click', () => {
    go(beforeCodex);
    if (beforeCodex === 'screenMap') map.render();
    else events.refresh();
  });
  function goMap() {
    persist();
    go('screenMap');
    map.render();
  }
  // 칸을 끝내고 다음 줄로
  function advance() {
    getRun().row += 1;
    goMap();
  }

  function chooseMonster(kind) {
    const run = getRun();
    if (kind === 'boss') return monsters.find((m) => m.boss);
    if (tutorial.active()) return monsters[0];
    let pool = monsters.filter((m) => !m.boss && m.id !== run.lastFoe);
    if (!pool.length) pool = monsters.filter((m) => !m.boss);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function fight(node) {
    const run = getRun();
    const kind = node.type;
    // 다시 도전할 때 같은 적이 나오도록 칸에 적어 둡니다.
    if (!node.monster) node.monster = chooseMonster(kind).id;
    const monster = monsters.find((m) => m.id === node.monster) || monsters[0];
    run.lastFoe = monster.id;
    data.seen[monster.id] = true;
    persist();

    tutorial.emit('fight');
    go('screenBattle');
    battle.start({ monster, kind, safe: tutorial.active() }, (result) => {
      if (result === 'lose') {
        go('screenEvent');
        events.defeat(() => {
          run.hp = run.maxHp;
          fight(node);
        });
        return;
      }
      const gold = CONFIG.gold[kind];
      data.wins += 1;
      run.gold += gold;
      run.hp = Math.min(run.maxHp, run.hp + CONFIG.player.healOnWin);
      tutorial.emit('won');
      go('screenEvent');
      if (kind === 'boss') {
        data.clears += 1;
        persist();
        events.clear(gold, () => {
          data.run = newRun(CONFIG.unit);
          goMap();
        });
      } else {
        persist();
        events.reward(gold, () => {
          tutorial.emit('rewarded');
          advance();
        });
      }
    });
  }

  function onPick(node, index) {
    const run = getRun();
    run.picked[run.row] = index;
    tutorial.emit('picked');
    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      fight(node);
      return;
    }
    go('screenEvent');
    events[node.type](advance); // shop, rest, treasure
  }

  // 언어 바꾸기
  const select = $('langSelect');
  select.value = data.lang;
  select.addEventListener('change', async () => {
    data.lang = select.value;
    persist();
    await loadLang(data.lang);
    applyStatic();
    if (screen === 'screenMap') map.render();
    if (screen === 'screenBattle') battle.refresh();
    if (screen === 'screenEvent') events.refresh();
    if (screen === 'screenCodex') codex.render();
    onChange();
  });

  goMap();
}

boot().catch((err) => {
  // 파일을 더블클릭해서 열면(file://) 데이터 파일을 읽지 못합니다. README 의 실행 방법을 보세요.
  const status = document.getElementById('runStatus');
  if (status) status.textContent = `Load error: ${err.message}`;
  console.error(err);
});
