// 처음 화면: 이어서 하기 / 처음부터 시작 / 도감
import { t } from './i18n.js';
import { allTypeKeys, subjectNames } from './questions.js';
import { nodeOf } from './run.js';
import { $ } from './ui.js';

// 진행 중인 지도가 있는지 (칸을 하나라도 골랐는지)
export const hasProgress = (run) => run.at !== null || run.pending !== null;

export function createTitle({ getRun, onContinue, onNew, onCodex }) {
  let confirming = false; // "처음부터 시작"을 한 번 눌러 확인을 기다리는 중

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
    fresh.querySelector('small').textContent = confirming ? t('title.confirm') : t(going ? 'title.restartSub' : 'title.startSub');
    fresh.classList.toggle('danger', confirming);
    fresh.classList.toggle('primary', !going);
    cont.classList.toggle('primary', going);
  }

  $('titleContinue').addEventListener('click', () => {
    confirming = false;
    onContinue();
  });
  $('titleNew').addEventListener('click', () => {
    // 진행 중인 지도가 있으면 한 번 더 눌러야 지워집니다.
    if (hasProgress(getRun()) && !confirming) {
      confirming = true;
      render();
      return;
    }
    confirming = false;
    onNew();
  });
  $('titleCodex').addEventListener('click', onCodex);

  return {
    render,
    reset() {
      confirming = false;
    },
  };
}
