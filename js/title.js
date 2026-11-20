// 처음 화면: 이어서 하기 / 처음부터 시작 / 도감
import { t } from './i18n.js';
import { allTypeKeys, subjectNames } from './questions.js';
import { nodeOf } from './run.js';
import { $ } from './ui.js';

// 진행 중인 지도가 있는지 (칸을 하나라도 골랐는지)
export const hasProgress = (run) => run.at !== null || run.pending !== null;

export function createTitle({ getRun, onContinue, onNew, onCodex }) {

  function render() {
    const run = getRun();
    const going = hasProgress(run);
    const all = allTypeKeys();
    $('titleUnit').textContent = t('title.sub', { subjects: subjectNames(all).join(' · '), n: all.length });

    const cont = $('titleContinue');
    cont.hidden = !going;
    if (going) {
      const here = run.at === null ? null : nodeOf(run, run.at);
      cont.querySelector('b').textContent = t('title.continue');
      cont.querySelector('small').textContent = t('title.continueSub', {
        n: here ? here.floor + 1 : 0,
        total: run.floors,
        hp: run.hp,
        max: run.maxHp,
        types: run.scope.length,
      });
    }

    const fresh = $('titleNew');
    fresh.querySelector('b').textContent = t(going ? 'title.restart' : 'title.start');
    fresh.querySelector('small').textContent = t(going ? 'title.restartSub' : 'title.startSub');
    if (!$('confirm').hidden) $('confirmText').textContent = confirmText();
    fresh.classList.toggle('primary', !going);
    cont.classList.toggle('primary', going);
  }

  // 확인 창에 보여 줄 글: 무엇이 사라지는지 적습니다.
  function confirmText() {
    const run = getRun();
    const here = run.at === null ? null : nodeOf(run, run.at);
    return t('title.confirm', { n: here ? here.floor + 1 : 0, total: run.floors, hp: run.hp, max: run.maxHp, gold: run.gold });
  }
  function closeConfirm() {
    $('confirm').hidden = true;
  }

  $('titleContinue').addEventListener('click', onContinue);
  $('titleNew').addEventListener('click', () => {
    // 진행 중인 지도가 있으면 확인 창을 먼저 띄웁니다.
    if (hasProgress(getRun())) {
      $('confirmText').textContent = confirmText();
      $('confirm').hidden = false;
      $('confirmCancel').focus();
      return;
    }
    onNew();
  });
  $('confirmCancel').addEventListener('click', closeConfirm);
  $('confirmOk').addEventListener('click', () => {
    closeConfirm();
    onNew();
  });
  $('confirm').addEventListener('click', (event) => {
    if (event.target === $('confirm')) closeConfirm(); // 바깥을 누르면 취소
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeConfirm();
  });
  $('titleCodex').addEventListener('click', onCodex);

  return {
    render,
    reset: closeConfirm,
  };
}
