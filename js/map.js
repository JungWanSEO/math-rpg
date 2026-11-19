// 갈림길 지도 화면. 보스가 맨 위, 출발이 맨 아래입니다.
// 칸은 버튼으로, 길은 선으로 그립니다. 길이 이어진 칸으로만 갈 수 있습니다.
import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { available, nodeOf } from './run.js';
import { $ } from './ui.js';

const ROW = 62; // 한 층의 높이(px)
const SVG = 'http://www.w3.org/2000/svg';
const LEGEND = ['battle', 'elite', 'event', 'treasure', 'shop', 'rest', 'midboss', 'boss'];

export function createMap({ getRun, onPick }) {
  function render() {
    const run = getRun();
    const height = run.floors * ROW;
    const x = (n) => ((n.col + 0.5) / CONFIG.map.width) * 100; // 가로 위치(%)
    const y = (n) => (run.floors - 1 - n.floor) * ROW + ROW / 2; // 세로 위치(px)
    const open = new Set(available(run));
    const visited = new Set(run.visited);

    const here = run.at === null ? null : nodeOf(run, run.at);
    $('mapProgress').textContent = t('map.progress', { n: here ? here.floor + 1 : 0, total: run.floors });

    const box = $('mapRows');
    box.innerHTML = '';
    box.style.height = `${height}px`;

    // 길
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'map-lines');
    svg.setAttribute('viewBox', `0 0 100 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const n of run.nodes) {
      for (const id of n.next) {
        const to = nodeOf(run, id);
        const line = document.createElementNS(SVG, 'line');
        line.setAttribute('x1', x(n));
        line.setAttribute('y1', y(n));
        line.setAttribute('x2', x(to));
        line.setAttribute('y2', y(to));
        let cls = 'path';
        if (visited.has(n.id) && visited.has(id)) cls += ' walked';
        else if (n.id === run.at && open.has(id)) cls += ' open';
        line.setAttribute('class', cls);
        svg.appendChild(line);
      }
    }
    box.appendChild(svg);

    // 칸
    let focus = null;
    for (const n of run.nodes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `node type-${n.type}`;
      btn.textContent = t(`node.${n.type}`);
      btn.style.left = `${x(n)}%`;
      btn.style.top = `${y(n)}px`;
      if (visited.has(n.id)) btn.classList.add('done');
      if (open.has(n.id)) {
        btn.classList.add('open');
        btn.addEventListener('click', () => onPick(n));
        if (!focus) focus = btn;
      } else {
        btn.disabled = true;
      }
      box.appendChild(btn);
    }

    // 칸 종류 설명
    const legend = $('mapLegend');
    legend.innerHTML = '';
    for (const type of LEGEND) {
      const row = document.createElement('div');
      const mark = document.createElement('span');
      mark.className = `dot type-${type}`;
      const name = document.createElement('b');
      name.textContent = t(`node.${type}`);
      const sub = document.createElement('small');
      sub.textContent = t(`node.${type}Sub`);
      row.append(mark, name, sub);
      legend.appendChild(row);
    }

    if (focus && focus.scrollIntoView) focus.scrollIntoView({ block: 'center' });
  }

  return { render };
}
