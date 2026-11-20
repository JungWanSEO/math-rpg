// 전투 규칙과 화면 연결.
// 한 턴: 행동 고르기 → 문제 풀기 → 결과 → 적의 턴 → 다시 행동 고르기
// 체력, 힌트, 강화는 "지도 한 장"의 상태(run)에서 가져옵니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { next, questionText, explainText, typeLabel } from './questions.js';
import { showFigure } from './figures.js';
import { $ } from './ui.js';
import { play } from './sound.js';

export function createBattle({ stage, getRun, record, tutorial, onChange }) {
  const B = {
    foe: null,
    weak: null,      // 이번 전투에서 적의 약점 유형
    kind: 'battle',  // 'battle' 전투 | 'elite' 강적 | 'midboss' 중간 보스 | 'boss' 보스
    safe: false,     // 튜토리얼 전투: 피해가 줄고 쓰러지지 않습니다.
    foeHp: 0,
    foeMax: 0,
    combo: 0,        // 연속 정답 수 (필살기 게이지)
    turn: 0,
    intent: 'normal',
    lastAction: null, // 방어는 연속으로 쓸 수 없습니다.
    phase: 'busy',   // 'choose' 행동 고르기 | 'answer' 답 고르기 | 'busy' 연출 중 | 'review' 틀린 문제 확인
    gen: 0,          // 전투를 새로 시작하거나 그만둘 때마다 올라갑니다. 예전 연출의 뒷일을 막는 데 씁니다.
    cur: null,       // 지금 문제
    picked: -1,
    notice: { key: 'msg.choose', vars: null },
    onEnd: null,
  };

  const typeName = typeLabel;

  // 연출이 끝난 뒤 할 일을 감쌉니다. 그 사이 전투를 나갔다면 아무것도 하지 않습니다.
  const live = (fn) => {
    const gen = B.gen;
    return (...args) => {
      if (gen === B.gen) fn(...args);
    };
  };

  // 적이 이번 턴에 주는 피해
  function intentDamage() {
    let dmg = B.intent === 'big' ? CONFIG.foeAttack.big : CONFIG.foeAttack.normal;
    if (B.kind === 'elite') dmg += CONFIG.elite.attackAdd;
    if (B.kind === 'midboss') dmg += CONFIG.midboss.attackAdd;
    if (B.kind === 'boss') dmg += CONFIG.boss.attackAdd;
    if (B.safe) dmg = Math.floor(dmg / 2);
    return dmg;
  }

  function say(key, vars) {
    B.notice = { key, vars: vars || null };
    $('notice').textContent = t(key, B.notice.vars);
  }

  // ---- 화면 갱신 ----
  function renderQuestion() {
    const showing = B.cur && (B.phase === 'answer' || B.picked >= 0);
    $('question').hidden = !showing;
    $('answers').hidden = !showing;
    // 문제를 푸는 동안에는 행동 버튼을 접어 문제와 답이 한 화면에 보이게 합니다.
    $('screenBattle').classList.toggle('answering', Boolean(showing));
    const hint = $('hintBtn');
    hint.hidden = B.phase !== 'answer';
    $('nextBtn').hidden = B.phase !== 'review';
    if (!showing) return;

    const run = getRun();
    hint.textContent = t('ui.hint', { n: run.hints });
    hint.disabled = run.hints <= 0 || B.cur.removed >= 0;

    $('qMeta').textContent = t('ui.level', { n: B.cur.level, type: typeName(B.cur.type) });
    $('qText').textContent = questionText(B.cur.raw);
    showFigure($('qFigure'), B.cur.raw);
    const box = $('answers');
    box.innerHTML = '';
    B.cur.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.disabled = B.phase !== 'answer' || i === B.cur.removed;
      if (i === B.cur.removed) btn.classList.add('gone');
      if (B.picked >= 0) {
        if (i === B.cur.correct) btn.classList.add('right');
        else if (i === B.picked) btn.classList.add('wrong');
      }
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });
  }

  function render() {
    if (!B.foe) return;
    const run = getRun();
    let name = pick(B.foe.name);
    if (B.kind === 'elite') name = t('ui.elite', { name });
    if (B.kind === 'midboss') name = t('ui.midboss', { name });
    if (B.kind === 'boss') name = t('ui.boss', { name });
    $('foeName').textContent = name;
    $('foeWeak').textContent = t('ui.weak', { type: typeName(B.weak) });
    $('foeHpBar').style.width = `${Math.max(0, (B.foeHp / B.foeMax) * 100)}%`;
    $('foeHpText').textContent = `${Math.max(0, B.foeHp)} / ${B.foeMax}`;
    $('foeIntent').textContent = t(B.intent === 'big' ? 'ui.intentBig' : 'ui.intentNormal', { d: intentDamage() });
    $('foeIntent').classList.toggle('big', B.intent === 'big');
    // 강한 공격 턴에는 공격 버튼에도 "맞혀도 피해를 받는다"는 것을 적어 둡니다.
    $('basicSub').textContent = t(B.intent === 'big' ? 'ui.attackBigSub' : 'ui.basicSub');
    $('skillSub').textContent = t(B.intent === 'big' ? 'ui.attackBigSub' : 'ui.skillSub');
    $('hpBar').style.width = `${Math.max(0, (run.hp / run.maxHp) * 100)}%`;
    $('hpText').textContent = `${Math.max(0, run.hp)} / ${run.maxHp}`;
    $('comboText').textContent = t('ui.combo', { n: B.combo });

    const pips = $('ultPips');
    pips.innerHTML = '';
    for (let i = 0; i < CONFIG.ultNeed; i++) {
      const pip = document.createElement('span');
      if (i < B.combo) pip.className = 'on';
      pips.appendChild(pip);
    }

    const choosing = B.phase === 'choose';
    const only = tutorial.only(); // 튜토리얼 중에는 안내한 버튼만 누를 수 있습니다.
    const cooling = B.lastAction === 'defend';
    document.querySelectorAll('#actions button').forEach((btn) => {
      const action = btn.dataset.action;
      btn.disabled = !choosing || (only && only !== action) || (action === 'defend' && cooling);
      btn.classList.toggle('picked', B.phase === 'answer' && B.cur && B.cur.action === action);
    });
    $('defendSub').textContent = t(cooling ? 'ui.defendWait' : 'ui.defendSub');

    const ready = B.combo >= CONFIG.ultNeed;
    const ult = $('ultBtn');
    ult.disabled = !(choosing && ready) || Boolean(only);
    ult.classList.toggle('ready', ready);
    ult.textContent = ready ? t('ui.ultReady') : t('ui.ultCharge', { n: B.combo, need: CONFIG.ultNeed });

    $('notice').textContent = t(B.notice.key, B.notice.vars);
    renderQuestion();
    tutorial.setUltReady(ready && choosing);
    onChange();
  }

  // ---- 턴 진행 ----
  function planIntent() {
    B.turn += 1;
    B.intent = B.turn % CONFIG.foeAttack.bigEvery === 0 ? 'big' : 'normal';
    if (B.intent === 'big') {
      stage.foeSpecial(); // 고유 동작으로 강한 공격을 예고
      play('warn');
    }
  }

  function backToChoose() {
    planIntent();
    B.phase = 'choose';
    B.cur = null;
    B.picked = -1;
    render();
  }

  function choose(action) {
    if (B.phase !== 'choose') return;
    const only = tutorial.only();
    if (only && only !== action) return;

    if (action === 'ult') {
      if (B.combo < CONFIG.ultNeed) return;
      B.combo = 0;
      B.lastAction = 'ult';
      B.phase = 'busy';
      const dmg = CONFIG.damage.ult;
      say('msg.ult', { d: dmg });
      play('ult');
      render();
      stage.heroUlt(`-${dmg}`, live(() => afterHit(dmg)));
      return;
    }

    if (action === 'defend' && B.lastAction === 'defend') return;
    B.lastAction = action;
    let level = CONFIG.guardLevel;
    if (action === 'basic') level = B.foe.basicLevel || 1;
    if (action === 'skill') level = B.foe.skillLevel || 2;
    B.cur = next(level);
    B.cur.action = action;
    B.cur.removed = -1;
    B.picked = -1;
    B.phase = 'answer';
    say(action === 'defend' ? 'msg.solveGuard' : 'msg.solve');
    tutorial.emit(`chose:${action}`);
    render();
  }

  // 힌트: 틀린 보기 하나를 지웁니다.
  function useHint() {
    const run = getRun();
    if (B.phase !== 'answer' || run.hints <= 0 || B.cur.removed >= 0) return;
    const wrong = B.cur.options.map((_, i) => i).filter((i) => i !== B.cur.correct);
    B.cur.removed = wrong[Math.floor(Math.random() * wrong.length)];
    run.hints -= 1;
    render();
  }

  function answer(i) {
    if (B.phase !== 'answer' || i === B.cur.removed) return;
    const run = getRun();
    B.phase = 'busy';
    B.picked = i;
    const ok = i === B.cur.correct;
    record(B.cur.type, ok);
    play(ok ? 'right' : 'wrong');
    tutorial.emit('answered');

    if (B.cur.action === 'defend') {
      if (ok) {
        // 완벽 방어: 피해 0, 반격, 연속 정답 +1
        B.combo = Math.min(CONFIG.ultNeed, B.combo + 1);
        say('msg.guardOk');
        render();
        foeTurn(0, counter);
      } else {
        B.combo = 0;
        say('msg.guardFail', { explain: explainText(B.cur.raw) });
        render();
        foeTurn(CONFIG.defendReduce);
      }
      return;
    }

    if (ok) {
      const weak = B.cur.type === B.weak;
      const base = B.cur.action === 'skill'
        ? CONFIG.damage.skill + run.up.skill
        : CONFIG.damage.basic + run.up.basic;
      const dmg = Math.round(base * (weak ? CONFIG.damage.weakBonus + run.up.weak : 1));
      B.combo = Math.min(CONFIG.ultNeed, B.combo + 1);
      say(weak ? 'msg.correctWeak' : 'msg.correct', { d: dmg });
      render();
      stage.heroAttack(`-${dmg}`, weak, live(() => afterHit(dmg)));
    } else {
      B.combo = 0;
      say('msg.wrong', { explain: explainText(B.cur.raw) });
      render();
      stage.heroMiss(t('msg.miss'), live(() => foeTurn(1)));
    }
  }

  function afterHit(dmg) {
    play('hit');
    B.foeHp -= dmg;
    render();
    if (B.foeHp <= 0) {
      win();
    } else if (B.intent === 'big' || CONFIG.foeAttack.hitOnCorrect) {
      // 강한 공격은 방어로만 막을 수 있습니다. 맞혔는데 왜 맞았는지 알려 줍니다.
      if (B.intent === 'big') say('msg.bigHit', { d: intentDamage() });
      foeTurn(1);
    } else {
      backToChoose(); // 공격 문제를 맞히면 적의 보통 공격은 오지 않습니다.
    }
  }

  // 방어에 성공한 뒤의 반격
  function counter() {
    const dmg = CONFIG.damage.counter + getRun().up.counter;
    stage.heroAttack(`-${dmg}`, false, live(() => {
      B.foeHp -= dmg;
      render();
      if (B.foeHp <= 0) win();
      else backToChoose();
    }));
  }

  // mult: 받는 피해 비율 (1 = 그대로, 0.5 = 방어 실패, 0 = 완벽 방어)
  function foeTurn(mult, then) {
    const dmg = Math.ceil(intentDamage() * mult);
    stage.foeAttack(dmg > 0 ? `-${dmg}` : t('msg.blocked'), mult < 1, live(() => {
      const run = getRun();
      play(dmg > 0 ? 'hurt' : 'block');
      run.hp -= dmg;
      if (B.safe && run.hp < 1) run.hp = 1;
      if (run.hp <= 0) {
        run.hp = 0;
        render();
        stage.heroDown();
        finish('lose');
      } else if (then) {
        then();
      } else if (B.cur && B.picked >= 0 && B.picked !== B.cur.correct) {
        // 틀린 문제는 정답과 해설을 읽을 시간을 줍니다. "다음" 을 눌러야 넘어갑니다.
        B.phase = 'review';
        render();
      } else {
        backToChoose();
      }
    }));
  }

  function win() {
    stage.foeDefeat(live(() => finish('win')));
  }

  function finish(result) {
    play(result === 'win' ? 'win' : 'lose');
    B.phase = 'busy';
    const done = B.onEnd;
    B.onEnd = null;
    if (done) done(result);
  }

  // 전투 시작. monster 는 monsters.json 의 항목입니다.
  function start({ monster, kind, weak, safe }, onEnd) {
    B.gen += 1;
    B.foe = monster;
    B.weak = weak;
    B.kind = kind;
    B.safe = Boolean(safe);
    B.foeMax = Math.round(monster.hp * (kind === 'elite' ? CONFIG.elite.hpMul : 1));
    B.foeHp = B.foeMax;
    B.turn = 0;
    B.combo = 0;
    B.lastAction = null;
    B.onEnd = onEnd;
    stage.heroUp();
    stage.setFoe(monster.id);
    say('msg.choose');
    backToChoose();
  }

  // ---- 버튼 연결 ----
  document.querySelectorAll('#screenBattle [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => choose(btn.dataset.action));
  });
  $('hintBtn').addEventListener('click', useHint);
  $('nextBtn').addEventListener('click', () => {
    if (B.phase === 'review') backToChoose();
  });

  // 전투 도중에 나갑니다. 남아 있던 연출의 뒷일은 모두 버립니다.
  function abort() {
    B.gen += 1;
    B.phase = 'busy';
    B.onEnd = null;
    B.cur = null;
    B.picked = -1;
    render();
  }

  return {
    start,
    abort,
    refresh: render, // 언어를 바꾼 뒤 화면의 글을 다시 씁니다.
  };
}
