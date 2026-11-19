// 전투 규칙과 화면 연결.
// 한 턴: 행동 고르기 → (공격이면) 문제 풀기 → 결과 → 적의 턴 → 다시 행동 고르기
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { next, questionText, explainText } from './questions.js';
import { store } from './save.js';

const $ = (id) => document.getElementById(id);

export function createBattle({ stage, data, unit, monsters }) {
  const B = {
    index: 0,        // 지금 몇 번째 몬스터인지
    foe: null,
    foeHp: 0,
    hp: CONFIG.player.hp,
    combo: 0,        // 연속 정답 수 (필살기 게이지)
    turn: 0,
    intent: 'normal',
    lastAction: null, // 방어는 연속으로 쓸 수 없습니다.
    phase: 'busy',   // 'choose' 행동 고르기 | 'answer' 답 고르기 | 'busy' 연출 중
    cur: null,       // 지금 문제
    picked: -1,
    notice: { key: 'msg.choose', vars: null },
  };

  const intentDamage = () => (B.intent === 'big' ? CONFIG.foeAttack.big : CONFIG.foeAttack.normal);
  const typeName = (type) => pick(unit.types[type]);

  function say(key, vars) {
    B.notice = { key, vars: vars || null };
    $('notice').textContent = t(key, B.notice.vars);
  }

  // ---- 화면 갱신 ----
  function renderQuestion() {
    const showing = B.phase === 'answer' || (B.cur && B.picked >= 0);
    $('question').hidden = !showing;
    $('answers').hidden = !showing;
    if (!showing) return;
    $('qMeta').textContent = t('ui.level', { n: B.cur.level, type: typeName(B.cur.type) });
    $('qText').textContent = questionText(B.cur.raw);
    const box = $('answers');
    box.innerHTML = '';
    B.cur.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.disabled = B.phase !== 'answer';
      if (B.picked >= 0) {
        if (i === B.cur.correct) btn.classList.add('right');
        else if (i === B.picked) btn.classList.add('wrong');
      }
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });
  }

  function render() {
    $('subjectName').textContent = pick(unit.subject);
    $('unitName').textContent = pick(unit.area);
    $('foeName').textContent = pick(B.foe.name);
    $('foeWeak').textContent = t('ui.weak', { type: typeName(B.foe.weak) });
    $('foeHpBar').style.width = `${Math.max(0, (B.foeHp / B.foe.hp) * 100)}%`;
    $('foeHpText').textContent = `${Math.max(0, B.foeHp)} / ${B.foe.hp}`;
    $('foeIntent').textContent = t(B.intent === 'big' ? 'ui.intentBig' : 'ui.intentNormal', { d: intentDamage() });
    $('hpBar').style.width = `${Math.max(0, (B.hp / CONFIG.player.hp) * 100)}%`;
    $('hpText').textContent = `${Math.max(0, B.hp)} / ${CONFIG.player.hp}`;
    $('comboText').textContent = t('ui.combo', { n: B.combo });

    const pips = $('ultPips');
    pips.innerHTML = '';
    for (let i = 0; i < CONFIG.ultNeed; i++) {
      const pip = document.createElement('span');
      if (i < B.combo) pip.className = 'on';
      pips.appendChild(pip);
    }

    const choosing = B.phase === 'choose';
    document.querySelectorAll('#actions button').forEach((btn) => {
      const cooling = btn.dataset.action === 'defend' && B.lastAction === 'defend';
      btn.disabled = !choosing || cooling;
      btn.classList.toggle('picked', B.phase === 'answer' && B.cur && B.cur.action === btn.dataset.action);
    });
    $('defendSub').textContent = t(B.lastAction === 'defend' ? 'ui.defendWait' : 'ui.defendSub');
    const ready = B.combo >= CONFIG.ultNeed;
    const ult = $('ultBtn');
    ult.disabled = !(choosing && ready);
    ult.classList.toggle('ready', ready);
    ult.textContent = ready ? t('ui.ultReady') : t('ui.ultCharge', { n: B.combo, need: CONFIG.ultNeed });

    $('notice').textContent = t(B.notice.key, B.notice.vars);
    renderQuestion();
  }

  // ---- 턴 진행 ----
  function planIntent() {
    B.turn += 1;
    B.intent = B.turn % CONFIG.foeAttack.bigEvery === 0 ? 'big' : 'normal';
    if (B.intent === 'big') stage.foeSpecial();
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
    if (action === 'ult') {
      if (B.combo < CONFIG.ultNeed) return;
      B.combo = 0;
      B.lastAction = 'ult';
      B.phase = 'busy';
      const dmg = CONFIG.damage.ult;
      say('msg.ult', { d: dmg });
      render();
      stage.heroUlt(`-${dmg}`, () => afterHit(dmg));
      return;
    }
    if (action === 'defend' && B.lastAction === 'defend') return;
    B.lastAction = action;
    const level = action === 'skill' ? B.foe.skillLevel : action === 'defend' ? CONFIG.guardLevel : CONFIG.basicLevel;
    B.cur = next(level);
    B.cur.action = action;
    B.picked = -1;
    B.phase = 'answer';
    say(action === 'defend' ? 'msg.solveGuard' : 'msg.solve');
    render();
  }

  function record(type, ok) {
    const entry = data.codex[type] || { right: 0, wrong: 0 };
    if (ok) entry.right += 1;
    else entry.wrong += 1;
    data.codex[type] = entry;
    store(data);
  }

  function answer(i) {
    if (B.phase !== 'answer') return;
    B.phase = 'busy';
    B.picked = i;
    const ok = i === B.cur.correct;
    record(B.cur.type, ok);
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
      const weak = B.cur.type === B.foe.weak;
      const base = B.cur.action === 'skill' ? CONFIG.damage.skill : CONFIG.damage.basic;
      const dmg = Math.round(base * (weak ? CONFIG.damage.weakBonus : 1));
      B.combo = Math.min(CONFIG.ultNeed, B.combo + 1);
      say(weak ? 'msg.correctWeak' : 'msg.correct', { d: dmg });
      render();
      stage.heroAttack(`-${dmg}`, weak, () => afterHit(dmg));
    } else {
      B.combo = 0;
      say('msg.wrong', { explain: explainText(B.cur.raw) });
      render();
      stage.heroMiss(t('msg.miss'), () => foeTurn(1));
    }
  }

  function afterHit(dmg) {
    B.foeHp -= dmg;
    render();
    if (B.foeHp <= 0) win();
    else foeTurn(1);
  }

  // 방어에 성공한 뒤의 반격
  function counter() {
    const dmg = CONFIG.damage.counter;
    stage.heroAttack(`-${dmg}`, false, () => {
      B.foeHp -= dmg;
      render();
      if (B.foeHp <= 0) win();
      else backToChoose();
    });
  }

  // mult: 받는 피해 비율 (1 = 그대로, 0.5 = 방어 실패, 0 = 완벽 방어)
  function foeTurn(mult, then) {
    const dmg = Math.ceil(intentDamage() * mult);
    stage.foeAttack(dmg > 0 ? `-${dmg}` : t('msg.blocked'), mult < 1, () => {
      B.hp -= dmg;
      if (B.hp <= 0) {
        render();
        lose();
      } else if (then) {
        then();
      } else {
        backToChoose();
      }
    });
  }

  // ---- 승패 ----
  function overlay(titleKey, textKey, btnKey, onClick) {
    $('ovTitle').textContent = t(titleKey);
    $('ovText').textContent = t(textKey);
    const btn = $('ovBtn');
    btn.textContent = t(btnKey);
    btn.onclick = () => {
      $('overlay').hidden = true;
      onClick();
    };
    $('overlay').hidden = false;
    B.overlay = { titleKey, textKey, btnKey };
  }

  function win() {
    data.wins += 1;
    store(data);
    stage.foeDefeat(() => {
      overlay('result.winTitle', 'result.winText', 'result.next', () => {
        B.hp = Math.min(CONFIG.player.hp, B.hp + CONFIG.player.healOnWin);
        start(B.index + 1);
      });
    });
  }

  function lose() {
    stage.heroDown();
    overlay('result.loseTitle', 'result.loseText', 'result.retry', () => {
      B.hp = CONFIG.player.hp;
      B.combo = 0;
      start(B.index);
    });
  }

  function start(index) {
    B.index = index;
    B.foe = monsters[index % monsters.length];
    B.foeHp = B.foe.hp;
    B.turn = 0;
    B.lastAction = null;
    B.overlay = null;
    stage.heroUp();
    stage.setFoe(B.foe.id);
    say('msg.choose');
    backToChoose();
  }

  // ---- 버튼 연결 ----
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => choose(btn.dataset.action));
  });

  return {
    start,
    // 언어를 바꾼 뒤 화면의 글을 다시 씁니다.
    refresh() {
      render();
      if (B.overlay && !$('overlay').hidden) {
        $('ovTitle').textContent = t(B.overlay.titleKey);
        $('ovText').textContent = t(B.overlay.textKey);
        $('ovBtn').textContent = t(B.overlay.btnKey);
      }
    },
  };
}
