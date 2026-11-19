// 문제에 붙는 그림. 문제의 숫자를 읽어 자동으로 그립니다.
// 단원 파일의 틀에 "figure" 를 적으면 그 문제들에 그림이 붙습니다.
//
//   "figure": { "kind": "triangle", "angle": "θ", "opp": "{a}", "adj": "{b}", "hyp": "{c}" }
//
// kind 는 세 가지입니다. 빈 글("")을 적은 자리에는 아무것도 표시하지 않습니다.
//   triangle  직각삼각형   angle 각 · opp 맞은편 변 · adj 이웃 변 · hyp 빗변
//   tower     탑 하나      angle 올려본 각 · dist 수평거리 · height 높이
//   twopoint  탑과 두 지점 far 먼 지점의 각 · near 가까운 지점의 각 · gap 두 지점 사이 · height 높이
// 그림은 길이의 비율이 정확하지 않은 약도입니다.
import { fill } from './i18n.js';

const INK = '#eef6ff';
const LINE = '#8fb4ff';
const DIM = '#5c78b5';
const ASK = '#ffc857'; // 구해야 하는 값("?")의 색

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function label(x, y, text, anchor = 'middle') {
  if (!text) return '';
  const ask = String(text).includes('?');
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${ask ? 18 : 14}" font-weight="${ask ? 800 : 600}" fill="${ask ? ASK : INK}">${esc(text)}</text>`;
}

const frame = (inner) =>
  `<svg viewBox="0 0 300 152" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const DRAW = {
  // θ 는 왼쪽 아래, 직각은 오른쪽 아래
  triangle(L) {
    return frame(
      `<path d="M40 125 L240 125 L240 25 Z" stroke="${LINE}" stroke-width="2.5"/>` +
      `<path d="M228 125 L228 113 L240 113" stroke="${LINE}" stroke-width="1.5"/>` +
      `<path d="M68 125 A28 28 0 0 0 65 112.5" stroke="${ASK}" stroke-width="2"/>` +
      label(76, 119, L.angle, 'start') +
      label(140, 144, L.adj) +
      label(250, 80, L.opp, 'start') +
      label(128, 62, L.hyp, 'end')
    );
  },
  tower(L) {
    return frame(
      `<path d="M16 128 L284 128" stroke="${DIM}" stroke-width="2"/>` +
      `<rect x="226" y="28" width="20" height="100" fill="#2a3a66" stroke="${LINE}" stroke-width="2"/>` +
      `<path d="M40 128 L236 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<circle cx="40" cy="128" r="4" fill="${INK}"/>` +
      `<path d="M72 128 A32 32 0 0 0 68.5 113.5" stroke="${ASK}" stroke-width="2"/>` +
      label(80, 122, L.angle, 'start') +
      label(134, 147, L.dist) +
      label(254, 84, L.height, 'start')
    );
  },
  twopoint(L) {
    return frame(
      `<path d="M10 128 L290 128" stroke="${DIM}" stroke-width="2"/>` +
      `<rect x="236" y="28" width="20" height="100" fill="#2a3a66" stroke="${LINE}" stroke-width="2"/>` +
      `<path d="M30 128 L246 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<path d="M130 128 L246 28" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<circle cx="30" cy="128" r="4" fill="${INK}"/>` +
      `<circle cx="130" cy="128" r="4" fill="${INK}"/>` +
      `<path d="M60 128 A30 30 0 0 0 57.2 115.4" stroke="${ASK}" stroke-width="2"/>` +
      `<path d="M154 128 A24 24 0 0 0 148.2 112.3" stroke="${ASK}" stroke-width="2"/>` +
      label(66, 123, L.far, 'start') +
      label(160, 121, L.near, 'start') +
      `<path d="M30 136 L30 142 M130 136 L130 142 M30 139 L130 139" stroke="${DIM}" stroke-width="1.5"/>` +
      label(80, 151, L.gap) +
      label(264, 84, L.height, 'start')
    );
  },
};

// 문제의 그림을 만듭니다. 그림이 없는 문제면 null.
// alt 는 화면을 읽어 주는 도구를 위한 설명입니다. (그림에 적힌 값들)
export function figureFor(raw) {
  const spec = raw.tpl.figure;
  if (!spec || !DRAW[spec.kind]) return null;
  const labels = {};
  for (const [key, value] of Object.entries(spec)) {
    if (key !== 'kind') labels[key] = fill(String(value), raw.item);
  }
  return {
    svg: DRAW[spec.kind](labels),
    alt: Object.values(labels).filter(Boolean).join(', '),
  };
}

// 그림 자리에 그림을 넣거나, 그림이 없는 문제면 숨깁니다.
export function showFigure(el, raw) {
  const fig = raw ? figureFor(raw) : null;
  el.hidden = !fig;
  if (!fig) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = fig.svg;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', fig.alt);
}
