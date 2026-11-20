// 시작점이자 진행 담당.
// 처음 화면 → 범위 고르기 → 지도 → (칸을 고름) → 전투 / ? / 상점 / 휴식 / 보물 → 지도 → … → 보스
// 전투에서 쓰러지면 게임 오버이고, 범위를 다시 골라 새 지도로 처음부터 시작합니다.
import { CONFIG } from './config.js';
import { loadLang, applyStatic, t } from './i18n.js';
import { load, store } from './save.js';
import { loadAll, setScope, allTypeKeys, hasType, subjectNames } from './questions.js';
import { newRun } from './run.js';
import { createStage } from './stage.js';
import { createBattle } from './battle.js';
import { createMap } from './map.js';
import { createEvents } from './events.js';
import { createCodex } from './codex.js';
import { createTutorial } from './tutorial.js';
import { createTitle } from './title.js';
import { createScope } from './scope.js';
import { $, show } from './ui.js';
import { play, setSound } from './sound.js';
import { fitBattle, watchFit } from './fit.js';

const FIGHTS = ['battle', 'elite', 'midboss', 'boss'];

async function boot() {
  const data = load();
  if (!CONFIG.langs.includes(data.lang)) data.lang = CONFIG.defaultLang;
  await loadLang(data.lang);
  applyStatic();

  const [, monsters] = await Promise.all([
    loadAll(),
    fetch('./data/monsters.json').then((res) => {
      if (!res.ok) throw new Error(`data/monsters.json ${res.status}`);
      return res.json();
    }),
  ]);

  // 예전 기록 맞추기: 유형 이름에 단원이 붙기 전의 기록을 새 이름으로 옮깁니다.
  for (const key of Object.keys(data.codex)) {
    if (!key.includes('/')) {
      data.codex[`math1-trig/${key}`] = data.codex[key];
      delete data.codex[key];
    }
  }
  // 저장된 지도가 없거나 예전 형식이면 새로 만듭니다. 범위가 없던 지도는 전체 범위로 봅니다.
  if (!data.run || !Array.isArray(data.run.nodes)) data.run = newRun(allTypeKeys());
  if (!Array.isArray(data.run.scope) || !data.run.scope.some(hasType)) data.run.scope = allTypeKeys();
  setScope(data.run.scope);

  // 효과음 켜고 끄기 (처음 화면과 메뉴에 같은 버튼이 있습니다)
  setSound(data.sound !== false);
  function renderSound() {
    document.querySelectorAll('.sound-toggle').forEach((btn) => {
      btn.textContent = t(data.sound !== false ? 'ui.soundOn' : 'ui.soundOff');
      btn.setAttribute('aria-pressed', String(data.sound !== false));
    });
  }
  document.querySelectorAll('.sound-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      data.sound = data.sound === false;
      setSound(data.sound);
      store(data);
      renderSound();
      play('right');
    });
  });
  // 버튼을 누를 때의 짧은 소리 (답 버튼은 정답·오답 소리가 따로 납니다)
  document.addEventListener('click', (event) => {
    const btn = event.target.closest && event.target.closest('button');
    if (btn && !btn.closest('#answers, #evAnswers') && !btn.classList.contains('sound-toggle')) play('tap');
  });

  const getRun = () => data.run;
  const persist = () => store(data);
  let screen = 'screenTitle';

  // 튜토리얼 안내 줄
  function updateCoach() {
    const key = tutorial.coach();
    const el = $('coach');
    el.hidden = !key || screen === 'screenCodex' || screen === 'screenTitle' || screen === 'screenScope';
    if (key) $('coachText').textContent = t(key);
  }
  const tutorial = createTutorial(data, () => {
    persist();
    updateCoach();
  });

  // 유형별 정답 기록 (도감, 범위 고르기, 복습에 씁니다)
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
    $('subjectName').textContent = subjectNames(run.scope).join(' · ');
    $('unitName').textContent = t('ui.scopeCount', { n: run.scope.length, total: allTypeKeys().length });
    $('runStatus').textContent = t('ui.status', {
      hp: Math.max(0, run.hp),
      max: run.maxHp,
      gold: run.gold,
      hints: run.hints,
    });
    updateCoach();
  }

  const stage = createStage($('stage'));
  const battle = createBattle({ stage, getRun, record, tutorial, onChange });
  const events = createEvents({ getRun, data, record, onChange, persist });
  const map = createMap({ getRun, onPick });
  const codex = createCodex({ data, monsters });

  function go(name) {
    screen = name;
    show(name);
    window.scrollTo(0, 0); // 긴 화면에서 넘어와도 맨 위부터 보이게
    const menu = name === 'screenTitle' || name === 'screenScope';
    // 도감은 지도와 이벤트 화면에서만 엽니다. (전투 중에는 숨김)
    $('codexBtn').hidden = name === 'screenBattle' || name === 'screenCodex' || menu;
    $('runStatus').hidden = menu;
    $('topBar').hidden = menu; // 처음 화면과 범위 화면에는 위쪽 바가 없습니다.
    $('unitBox').hidden = menu;
    // 메뉴 버튼: 게임 중인 화면(지도, 전투, 사건)에서 보입니다.
    $('menuBtn').hidden = menu || name === 'screenCodex';
    if (!menu) armBack();
    if (name !== 'screenBattle') document.body.classList.remove('is-answering');
    onChange();
    fitBattle();
  }

  // ---- 메뉴 (일시 정지) ----
  function openMenu() {
    if ($('menuBtn').hidden) return;
    const key = screen === 'screenBattle' ? 'menu.textBattle' : screen === 'screenEvent' ? 'menu.textEvent' : 'menu.textMap';
    $('menuText').textContent = t(key);
    $('menu').dataset.key = key;
    $('menu').hidden = false;
    $('menuResume').focus();
  }
  function closeMenu() {
    $('menu').hidden = true;
  }
  $('menuBtn').addEventListener('click', openMenu);
  $('menuResume').addEventListener('click', closeMenu);
  $('menu').addEventListener('click', (event) => {
    if (event.target === $('menu')) closeMenu(); // 바깥을 누르면 닫힘
  });
  $('menuQuit').addEventListener('click', () => {
    closeMenu();
    if (screen === 'screenBattle') battle.abort();
    goTitle();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('menu').hidden) closeMenu();
    else openMenu();
  });

  // 스마트폰의 "뒤로" 버튼: 게임 중에는 페이지를 떠나지 않고 메뉴를 엽니다.
  let armed = false;
  function armBack() {
    if (armed) return;
    armed = true;
    window.history.pushState({ game: true }, '');
  }
  window.addEventListener('popstate', () => {
    armed = false;
    if (screen === 'screenTitle') return; // 처음 화면에서는 그대로 나갑니다.
    armBack();
    if (screen === 'screenScope') goTitle();
    else if (screen === 'screenCodex') $('codexClose').click();
    else if (!$('menu').hidden) closeMenu();
    else openMenu();
  });

  // 튜토리얼 건너뛰기: 잠겨 있던 버튼이 바로 풀립니다.
  $('coachSkip').addEventListener('click', () => {
    tutorial.skip();
    if (screen === 'screenBattle') battle.refresh();
  });

  // 도감 열고 닫기: 닫으면 보던 화면으로 돌아갑니다.
  let beforeCodex = 'screenMap';
  function openCodex() {
    beforeCodex = screen;
    go('screenCodex');
    codex.render();
  }
  $('codexBtn').addEventListener('click', openCodex);
  $('codexClose').addEventListener('click', () => {
    go(beforeCodex);
    if (beforeCodex === 'screenMap') map.render();
    else if (beforeCodex === 'screenTitle') title.render();
    else events.refresh();
  });

  function goMap() {
    persist();
    go('screenMap');
    map.render();
  }

  // 칸을 끝냈습니다. 지도로 돌아가 다음 칸을 고릅니다.
  function complete(node) {
    const run = getRun();
    run.visited.push(node.id);
    run.at = node.id;
    run.pending = null;
    goMap();
  }

  // 범위 고르기: 고른 유형으로 새 지도를 만들어 출발합니다.
  const scope = createScope({
    data,
    onStart(keys) {
      data.lastScope = keys;
      data.run = newRun(keys);
      setScope(keys);
      goMap();
    },
    onBack: () => goTitle(),
  });
  function goScope() {
    persist();
    go('screenScope');
    scope.open();
  }

  // 처음 화면: 이어서 하기 / 처음부터 시작 / 도감
  const title = createTitle({ getRun, onContinue: goMap, onNew: goScope, onCodex: openCodex });
  function goTitle() {
    persist();
    title.reset();
    go('screenTitle');
    title.render();
  }

  function chooseMonster(kind) {
    const run = getRun();
    // 이번 범위에 들어 있는 단원의 몬스터가 먼저 나옵니다. 하나도 없으면 전체에서 고릅니다.
    const units = new Set(run.scope.map((key) => key.split('/')[0]));
    const fit = (list) => {
      const fitting = list.filter((m) => units.has(m.weak.split('/')[0]));
      return fitting.length ? fitting : list;
    };
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    if (kind === 'boss') return any(fit(monsters.filter((m) => m.boss)));
    if (kind === 'midboss') return any(fit(monsters.filter((m) => m.midboss)));
    const normal = monsters.filter((m) => !m.boss && !m.midboss);
    if (tutorial.active()) return normal[0];
    const base = fit(normal);
    const fresh = base.filter((m) => m.id !== run.lastFoe);
    const pool = fresh.length ? fresh : base;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 적의 약점 유형: 몬스터의 원래 약점이 이번 범위에 있으면 그것, 없으면 범위 안에서 하나 고릅니다.
  function chooseWeak(monster) {
    const run = getRun();
    if (run.scope.includes(monster.weak)) return monster.weak;
    return run.scope[Math.floor(Math.random() * run.scope.length)];
  }

  // kind 를 따로 주면 그 종류로 싸웁니다. (? 칸의 기습은 보통 전투)
  function fight(node, kind = node.type) {
    const run = getRun();
    // 닫았다가 다시 열어도 같은 적이 나오도록 칸에 적어 둡니다.
    if (!node.monster) node.monster = chooseMonster(kind).id;
    const monster = monsters.find((m) => m.id === node.monster) || monsters[0];
    if (!node.weak || !run.scope.includes(node.weak)) node.weak = chooseWeak(monster);
    run.lastFoe = monster.id;
    data.seen[monster.id] = true;
    persist();

    tutorial.emit('fight');
    go('screenBattle');
    battle.start({ monster, kind, weak: node.weak, safe: tutorial.active() }, (result) => {
      if (result === 'lose') {
        // 게임 오버: 지도 한 장의 진행은 사라지고, 도감 기록은 남습니다.
        data.deaths = (data.deaths || 0) + 1;
        data.run = newRun(run.scope);
        persist();
        go('screenEvent');
        events.gameover({ floor: node.floor + 1, total: run.floors }, goScope);
        return;
      }
      const gold = Math.round(CONFIG.gold[kind] * (run.goldMul || 1));
      data.wins += 1;
      run.gold += gold;
      run.hp = Math.min(run.maxHp, run.hp + CONFIG.player.healOnWin);
      tutorial.emit('won');
      go('screenEvent');
      if (kind === 'boss') {
        play('clear');
        data.clears += 1;
        data.run = newRun(run.scope);
        persist();
        events.clear(gold, goScope);
      } else {
        persist();
        events.reward(gold, () => {
          tutorial.emit('rewarded');
          complete(node);
        });
      }
    });
  }

  function onPick(node) {
    const run = getRun();
    run.pending = node.id;
    persist();
    tutorial.emit('picked');
    if (FIGHTS.includes(node.type)) {
      fight(node);
      return;
    }
    go('screenEvent');
    if (node.type === 'event') {
      // ? 칸: 좋은 일, 나쁜 일, 선택, 기습 중 하나
      events.mystery(node, () => complete(node), () => fight(node, 'battle'));
    } else {
      events[node.type](() => complete(node)); // shop, rest, treasure
    }
  }

  // 언어 바꾸기 (처음 화면과 메뉴에 같은 선택 상자가 있습니다)
  const selects = [...document.querySelectorAll('.lang-select')];
  selects.forEach((select) => {
    select.value = data.lang;
    select.addEventListener('change', async () => {
      data.lang = select.value;
      selects.forEach((other) => {
        other.value = data.lang;
      });
      persist();
      await loadLang(data.lang);
      applyStatic();
      if (screen === 'screenTitle') title.render();
      if (screen === 'screenScope') scope.render();
      if (screen === 'screenMap') map.render();
      if (screen === 'screenBattle') battle.refresh();
      if (screen === 'screenEvent') events.refresh();
      if (screen === 'screenCodex') codex.render();
      if (!$('menu').hidden) $('menuText').textContent = t($('menu').dataset.key);
      renderSound();
      onChange();
    });
  });

  renderSound();
  watchFit();
  goTitle();
}

boot().catch((err) => {
  // 파일을 더블클릭해서 열면(file://) 데이터 파일을 읽지 못합니다. README 의 실행 방법을 보세요.
  const status = document.getElementById('runStatus');
  if (status) {
    status.hidden = false;
    status.textContent = `Load error: ${err.message}`;
  }
  console.error(err);
});
