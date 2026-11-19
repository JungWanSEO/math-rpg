// 전투가 아닌 칸과 결과 화면: 보상, 상점, 휴식, 보물, 패배, 단원 클리어.
// 모두 같은 화면(#screenEvent)을 씁니다. 제목, 설명, 고를 것 목록, 나가기 버튼으로 이루어집니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { next, nextByType, questionText, explainText } from './questions.js';
import { UPGRADES, SHOP, rollUpgrades } from './run.js';
import { showFigure } from './figures.js';
import { $, twoLineButton } from './ui.js';

export function createEvents({ getRun, data, unit, record, onChange }) {
  let draw = null; // 지금 화면을 다시 그리는 함수 (언어를 바꿀 때 씁니다)

  function open(fn) {
    draw = fn;
    redraw();
  }
  function redraw() {
    if (!draw) return;
    draw();
    onChange();
  }

  // ---- 화면 조각 ----
  function base(titleKey, text) {
    $('evTitle').textContent = t(titleKey);
    $('evText').textContent = text;
    $('evQuiz').hidden = true;
    $('evOptions').innerHTML = '';
    $('evLeave').hidden = true;
  }
  function option(title, sub, disabled, onClick) {
    const btn = twoLineButton(title, sub);
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    $('evOptions').appendChild(btn);
  }
  function leave(labelKey, onClick) {
    const btn = $('evLeave');
    btn.hidden = false;
    btn.textContent = t(labelKey);
    btn.onclick = () => {
      draw = null;
      onClick();
    };
  }
  function drawQuiz(state, onPick) {
    $('evQuiz').hidden = false;
    $('evQMeta').textContent = t('ui.level', { n: state.q.level, type: pick(unit.types[state.q.type]) });
    $('evQText').textContent = questionText(state.q.raw);
    showFigure($('evQFigure'), state.q.raw);
    const box = $('evAnswers');
    box.innerHTML = '';
    state.q.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.disabled = state.picked >= 0;
      if (state.picked >= 0) {
        if (i === state.q.correct) btn.classList.add('right');
        else if (i === state.picked) btn.classList.add('wrong');
      }
      btn.addEventListener('click', () => onPick(i));
      box.appendChild(btn);
    });
  }

  // 문제 하나를 풀고 결과를 보여주는 화면.
  // onResult(ok, q) 는 보상을 한 번 적용하고, "결과 문장을 만드는 함수"를 돌려줍니다.
  function quizScreen({ titleKey, intro, question, onResult, done }) {
    const state = { q: question, picked: -1, result: null };
    open(() => {
      base(titleKey, state.picked < 0 ? intro() : state.result());
      drawQuiz(state, (i) => {
        if (state.picked >= 0) return;
        state.picked = i;
        const ok = i === state.q.correct;
        record(state.q.type, ok);
        state.result = onResult(ok, state.q);
        redraw();
      });
      if (state.picked >= 0) leave('ev.continue', done);
    });
  }

  // 가장 자주 틀린 유형의 문제를 고릅니다. 틀린 적이 없으면 쉬운 문제를 냅니다.
  function reviewQuestion() {
    const missed = Object.entries(data.codex)
      .filter(([, entry]) => entry.wrong > 0 && (entry.streak || 0) < CONFIG.codexStreak)
      .sort((a, b) => b[1].wrong - a[1].wrong);
    if (missed.length) {
      const q = nextByType(missed[0][0]);
      if (q) return q;
    }
    return next(1);
  }

  return {
    refresh: redraw,

    // 전투 승리: 골드를 받고 강화 셋 중 하나를 고릅니다.
    reward(gold, done) {
      const picks = rollUpgrades(3);
      open(() => {
        base('ev.rewardTitle', t('ev.rewardText', { gold }));
        picks.forEach((id) => {
          option(t(`up.${id}.name`), t(`up.${id}.desc`), false, () => {
            UPGRADES[id](getRun());
            draw = null;
            done();
          });
        });
      });
    },

    // 상점: 골드로 강화를 삽니다. 여러 개 살 수 있습니다.
    shop(done) {
      open(() => {
        const run = getRun();
        base('ev.shopTitle', t('ev.shopText', { gold: run.gold }));
        SHOP.forEach(({ id, price }) => {
          option(`${t(`up.${id}.name`)} · ${price}G`, t(`up.${id}.desc`), run.gold < price, () => {
            if (run.gold < price) return;
            run.gold -= price;
            UPGRADES[id](run);
            redraw();
          });
        });
        leave('ev.leave', done);
      });
    },

    // 휴식: 쉬어서 체력을 회복하거나, 틀렸던 유형을 복습합니다.
    rest(done) {
      const run = getRun();
      const heal = Math.ceil(run.maxHp * CONFIG.rest.healRatio);
      let slept = false;
      const menu = () => {
        if (slept) {
          base('ev.restTitle', t('ev.restSlept', { n: heal }));
          leave('ev.continue', done);
          return;
        }
        base('ev.restTitle', t('ev.restText'));
        option(t('ev.restSleep'), t('ev.restSleepSub', { n: heal }), false, () => {
          run.hp = Math.min(run.maxHp, run.hp + heal);
          slept = true;
          redraw();
        });
        option(t('ev.restReview'), t('ev.restReviewSub'), false, () => {
          quizScreen({
            titleKey: 'ev.restTitle',
            intro: () => t('ev.reviewText', { n: CONFIG.rest.reviewHeal }),
            question: reviewQuestion(),
            onResult(ok, q) {
              if (ok) {
                run.hints += 1;
                run.hp = Math.min(run.maxHp, run.hp + CONFIG.rest.reviewHeal);
                return () => t('ev.reviewOk', { n: CONFIG.rest.reviewHeal });
              }
              return () => t('ev.reviewFail', { explain: explainText(q.raw) });
            },
            done,
          });
        });
      };
      open(menu);
    },

    // 보물: 문제를 맞히면 상자가 열립니다.
    treasure(done) {
      const run = getRun();
      quizScreen({
        titleKey: 'ev.treasureTitle',
        intro: () => t('ev.treasureText'),
        question: next(2),
        onResult(ok, q) {
          if (ok) {
            run.gold += CONFIG.gold.treasureWin;
            run.hints += 1;
            return () => t('ev.treasureOk', { gold: CONFIG.gold.treasureWin });
          }
          run.gold += CONFIG.gold.treasureLose;
          return () => t('ev.treasureFail', { gold: CONFIG.gold.treasureLose, explain: explainText(q.raw) });
        },
        done,
      });
    },

    // ? 칸: 무슨 일이 생길지 모릅니다. 좋은 일, 나쁜 일, 선택, 기습 중 하나가 나옵니다.
    // ambush 는 기습일 때 전투를 시작하는 함수입니다.
    mystery(done, ambush) {
      const run = getRun();
      const M = CONFIG.mystery;
      const kinds = ['spring', 'fog', 'purse', 'thief', 'note', 'statue', 'ambush'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];

      if (kind === 'ambush') {
        open(() => {
          base('mystery.ambush.title', t('mystery.ambush.text'));
          leave('mystery.ambush.go', ambush);
        });
        return;
      }

      if (kind === 'statue') {
        // 선택: 문제에 도전하면 강화를 얻지만, 틀리면 체력을 잃습니다.
        open(() => {
          base('mystery.statue.title', t('mystery.statue.text', { n: M.statueLoss }));
          option(t('mystery.statue.try'), t('mystery.statue.trySub', { n: M.statueLoss }), false, () => {
            quizScreen({
              titleKey: 'mystery.statue.title',
              intro: () => t('mystery.statue.quiz'),
              question: next(2),
              onResult(ok, q) {
                if (ok) {
                  const id = rollUpgrades(1)[0];
                  UPGRADES[id](run);
                  return () => t('mystery.statue.ok', { name: t(`up.${id}.name`), desc: t(`up.${id}.desc`) });
                }
                run.hp = Math.max(1, run.hp - M.statueLoss);
                return () => t('mystery.statue.fail', { n: M.statueLoss, explain: explainText(q.raw) });
              },
              done,
            });
          });
          leave('mystery.statue.skip', done);
        });
        return;
      }

      // 바로 일어나는 일: 효과를 한 번 적용하고 결과를 보여줍니다.
      let n = 1;
      if (kind === 'spring') {
        const before = run.hp;
        run.hp = Math.min(run.maxHp, run.hp + M.spring);
        n = run.hp - before;
      } else if (kind === 'fog') {
        const before = run.hp;
        run.hp = Math.max(1, run.hp - M.fog);
        n = before - run.hp;
      } else if (kind === 'purse') {
        run.gold += M.purse;
        n = M.purse;
      } else if (kind === 'thief') {
        n = Math.min(run.gold, M.thief);
        run.gold -= n;
      } else {
        run.hints += 1; // note
      }
      open(() => {
        base(`mystery.${kind}.title`, t(`mystery.${kind}.text`, { n }));
        leave('ev.continue', done);
      });
    },

    // 게임 오버: 지도 한 장을 처음부터 다시 시작합니다.
    gameover(info, done) {
      open(() => {
        base('ev.overTitle', t('ev.overText', { n: info.floor, total: info.total }));
        leave('ev.restart', done);
      });
    },

    // 보스를 쓰러뜨려 단원을 클리어했습니다.
    clear(gold, done) {
      open(() => {
        base('ev.clearTitle', t('ev.clearText', { n: data.clears, gold }));
        leave('ev.newRun', done);
      });
    },
  };
}
