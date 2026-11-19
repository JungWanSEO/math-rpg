// 도감 화면. 만난 몬스터와, 유형별 정답 기록(오답 노트)을 보여줍니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { $ } from './ui.js';

export function createCodex({ data, unit, monsters }) {
  // 유형의 상태: new 아직 안 풂 | open 미정복 | progress 진행 중 | done 정복
  function statusOf(entry) {
    if (!entry || (!entry.right && !entry.wrong)) return 'new';
    if ((entry.streak || 0) >= CONFIG.codexStreak) return 'done';
    if (entry.wrong > 0) return 'open';
    return 'progress';
  }

  function card(title, lines, badge) {
    const el = document.createElement('div');
    el.className = 'codex-card';
    const head = document.createElement('div');
    head.className = 'codex-head';
    const b = document.createElement('b');
    b.textContent = title;
    head.appendChild(b);
    if (badge) {
      const tag = document.createElement('span');
      tag.className = `badge badge-${badge}`;
      tag.textContent = t(`codex.status.${badge}`);
      head.appendChild(tag);
    }
    el.appendChild(head);
    for (const text of lines) {
      const small = document.createElement('small');
      small.textContent = text;
      el.appendChild(small);
    }
    return el;
  }

  function render() {
    $('codexSummary').textContent = t('codex.summary', { wins: data.wins, clears: data.clears });

    const mBox = $('codexMonsters');
    mBox.innerHTML = '';
    for (const m of monsters) {
      if (data.seen[m.id]) {
        mBox.appendChild(card(pick(m.name), [
          t('codex.mistake', { text: pick(m.mistake) }),
          t('ui.weak', { type: pick(unit.types[m.weak]) }),
        ]));
      } else {
        mBox.appendChild(card(t('codex.unseen'), [t('codex.unseenSub')]));
      }
    }

    const tBox = $('codexTypes');
    tBox.innerHTML = '';
    for (const [type, names] of Object.entries(unit.types)) {
      const entry = data.codex[type];
      const status = statusOf(entry);
      const lines = [];
      if (status !== 'new') {
        const total = entry.right + entry.wrong;
        lines.push(t('codex.record', {
          right: entry.right,
          wrong: entry.wrong,
          rate: Math.round((entry.right / total) * 100),
        }));
      }
      if (status === 'open' || status === 'progress') {
        lines.push(t('codex.toDone', { n: CONFIG.codexStreak - (entry.streak || 0) }));
      }
      tBox.appendChild(card(pick(names), lines, status));
    }
  }

  return { render };
}
