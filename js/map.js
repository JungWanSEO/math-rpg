// 갈림길 지도 화면. 보스가 맨 위, 출발이 맨 아래입니다.
import { t } from './i18n.js';
import { $, twoLineButton } from './ui.js';

export function createMap({ getRun, onPick }) {
  function render() {
    const run = getRun();
    $('mapProgress').textContent = t('map.progress', { n: run.row + 1, total: run.rows.length });
    const box = $('mapRows');
    box.innerHTML = '';

    for (let r = run.rows.length - 1; r >= 0; r--) {
      const row = document.createElement('div');
      row.className = 'map-row';
      if (r === run.row) row.classList.add('now');

      const step = document.createElement('span');
      step.className = 'step';
      step.textContent = String(r + 1);
      row.appendChild(step);

      run.rows[r].forEach((node, i) => {
        const btn = twoLineButton(t(`node.${node.type}`), t(`node.${node.type}Sub`));
        btn.className = `node type-${node.type}`;
        if (r < run.row) {
          btn.disabled = true;
          if (run.picked[r] === i) btn.classList.add('done');
        } else if (r > run.row) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => onPick(node, i));
        }
        row.appendChild(btn);
      });
      box.appendChild(row);
    }

    const now = box.querySelector('.map-row.now');
    if (now && now.scrollIntoView) now.scrollIntoView({ block: 'center' });
  }

  return { render };
}
