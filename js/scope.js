// 범위 고르기 화면. 새 탑을 시작하기 전에, 이번 판에 나올 문제 유형을 고릅니다.
// 유형마다 내 기록(정답률, 정복 여부)이 보여서 부족한 곳을 골라 연습할 수 있습니다.
import { CONFIG } from './config.js';
import { t, pick } from './i18n.js';
import { scopeTree, allTypeKeys, typeLabel, hasType } from './questions.js';
import { $ } from './ui.js';

// 유형의 상태: new 아직 안 풂 | open 미정복 | progress 진행 중 | done 정복
export function statusOf(entry) {
  if (!entry || (!entry.right && !entry.wrong)) return 'new';
  if ((entry.streak || 0) >= CONFIG.codexStreak) return 'done';
  if (entry.wrong > 0) return 'open';
  return 'progress';
}

// 범위가 넓을수록 골드를 더 받습니다.
export function goldBonus(count) {
  const { bonusPerType, bonusMax } = CONFIG.scope;
  return Math.min(bonusMax, bonusPerType * Math.max(0, count - 1));
}

export function createScope({ data, onStart, onBack }) {
  let chosen = new Set();

  function setChosen(keys) {
    chosen = new Set(keys.filter(hasType));
    if (!chosen.size) chosen = new Set(allTypeKeys());
  }

  function render() {
    const box = $('scopeList');
    box.innerHTML = '';
    for (const subject of scopeTree()) {
      for (const unit of subject.units) {
        // 단원 제목 옆의 버튼으로 그 단원의 유형을 한꺼번에 고르거나 뺍니다.
        const unitKeys = unit.groups.flatMap((group) => group.types);
        const picked = unitKeys.filter((key) => chosen.has(key)).length;
        const head = document.createElement('h3');
        const title = document.createElement('span');
        title.textContent = `${pick(subject.names)} · ${pick(unit.names)} (${picked}/${unitKeys.length})`;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'scope-unit';
        toggle.textContent = t(picked === unitKeys.length ? 'scope.unitNone' : 'scope.unitAll');
        toggle.addEventListener('click', () => {
          const all = picked === unitKeys.length;
          unitKeys.forEach((key) => (all ? chosen.delete(key) : chosen.add(key)));
          render();
        });
        head.append(title, toggle);
        box.appendChild(head);
        for (const group of unit.groups) {
          const sub = document.createElement('h4');
          sub.textContent = pick(group.names);
          box.appendChild(sub);
          for (const key of group.types) {
            const entry = data.codex[key];
            const status = statusOf(entry);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'scope-item';
            btn.setAttribute('aria-pressed', String(chosen.has(key)));
            const mark = document.createElement('span');
            mark.className = 'check';
            const name = document.createElement('b');
            name.textContent = typeLabel(key);
            const info = document.createElement('small');
            const total = entry ? entry.right + entry.wrong : 0;
            info.textContent = total
              ? t('scope.record', { rate: Math.round((entry.right / total) * 100), status: t(`codex.status.${status}`) })
              : t(`codex.status.${status}`);
            btn.append(mark, name, info);
            btn.addEventListener('click', () => {
              if (chosen.has(key)) chosen.delete(key);
              else chosen.add(key);
              render();
            });
            box.appendChild(btn);
          }
        }
      }
    }
    const count = chosen.size;
    $('scopeSummary').textContent = count
      ? t('scope.summary', { n: count, bonus: Math.round(goldBonus(count) * 100) })
      : t('scope.empty');
    $('scopeStart').disabled = count === 0;
    $('scopeSame').disabled = !(data.lastScope && data.lastScope.some(hasType));
  }

  $('scopeAll').addEventListener('click', () => {
    chosen = new Set(allTypeKeys());
    render();
  });
  // 정복하지 못한 유형만. 모두 정복했다면 전체를 고릅니다.
  $('scopeWeak').addEventListener('click', () => {
    setChosen(allTypeKeys().filter((key) => statusOf(data.codex[key]) !== 'done'));
    render();
  });
  $('scopeSame').addEventListener('click', () => {
    setChosen(data.lastScope || []);
    render();
  });
  $('scopeStart').addEventListener('click', () => {
    if (chosen.size) onStart(allTypeKeys().filter((key) => chosen.has(key)));
  });
  $('scopeBack').addEventListener('click', onBack);

  return {
    // 화면을 열 때: 지난번 범위가 있으면 그것을, 없으면 전체를 골라 둡니다.
    open() {
      setChosen(data.lastScope || allTypeKeys());
      render();
    },
    render,
  };
}
