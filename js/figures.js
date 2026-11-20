// 문제에 붙는 그림. 문제의 숫자를 읽어 자동으로 그립니다.
// 단원 파일의 틀에 "figure" 를 적으면 그 문제들에 그림이 붙습니다.
//
//   "figure": { "kind": "triangle", "angle": "θ", "opp": "{a}", "adj": "{b}", "hyp": "{c}" }
//
// kind 는 세 가지입니다. 빈 글("")을 적은 자리에는 아무것도 표시하지 않습니다.
//   triangle  직각삼각형   angle 각 · opp 맞은편 변 · adj 이웃 변 · hyp 빗변
//   tower     탑 하나      angle 올려본 각 · dist 수평거리 · height 높이
//   twopoint  탑과 두 지점 far 먼 지점의 각 · near 가까운 지점의 각 · gap 두 지점 사이 · height 높이
//   anytri    삼각형 ABC   angleA·angleB·angleC 각 · sideA·sideB·sideC 변 (a 는 A 와 마주 보는 변)
//             변은 "b = 7" 처럼 이름이 자동으로 붙습니다. 값만 적으세요.
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
  if (!ask) return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="14" font-weight="600" fill="${INK}">${esc(text)}</text>`;
  // 구해야 하는 값은 노란 테두리의 이름표로 눈에 띄게 합니다. 예: "a = ?"
  const width = String(text).length * 9 + 16;
  const left = anchor === 'start' ? x - 8 : anchor === 'end' ? x - width + 8 : x - width / 2;
  return `<rect x="${left}" y="${y - 17}" width="${width}" height="24" rx="8" fill="#3a2f10" stroke="${ASK}" stroke-width="1.5"/>` +
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="17" font-weight="800" fill="${ASK}">${esc(text)}</text>`;
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
  // 변 a 는 BC, b 는 CA, c 는 AB.
  // 적힌 각이 둔각이면 그 꼭짓점이 실제로 벌어져 보이도록 모양을 바꿉니다.
  // 각을 묻는 문제("?")에서는 모양으로 답이 드러나지 않게 기본 모양을 씁니다.
  anytri(L) {
    let P = { A: [45, 122], B: [262, 122], C: [182, 32] };
    if (parseFloat(L.angleA) > 90) P = { A: [120, 122], B: [268, 122], C: [48, 38] };
    else if (parseFloat(L.angleB) > 90) P = { A: [32, 122], B: [180, 122], C: [252, 38] };
    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    // from 에서 to 방향으로 dist 만큼 옮긴 점 (dist 가 음수이면 반대 방향)
    const move = (from, to, dist) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const len = Math.hypot(dx, dy) || 1;
      return [Math.round(from[0] + (dx / len) * dist), Math.round(from[1] + (dy / len) * dist) + 5];
    };
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const corner = (p, text) => {
      const [x, y] = move(p, G, -13);
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="700" fill="${DIM}">${text}</text>`;
    };
    // 변에는 이름을 붙여 적습니다. ("7" → "b = 7", "?" → "a = ?") 묻는 각도 "A = ?" 로 적습니다.
    const named = (name, text) => (text ? `${name} = ${text}` : '');
    // 묻는 각은 꼭짓점에서 조금 더 안쪽에 적어 변과 겹치지 않게 합니다.
    const angle = (p, name, text) => label(...move(p, G, text === '?' ? 80 : 30), text === '?' ? named(name, text) : text);
    // 변의 이름표는 삼각형 바깥쪽에 둡니다. 바깥이 왼쪽이면 글의 끝을, 오른쪽이면 글의 처음을 변에 맞춥니다.
    const side = (p, q, name, text) => {
      if (!text) return '';
      const [mx, my] = mid(p, q);
      const len = Math.hypot(mx - G[0], my - G[1]) || 1;
      const ux = (mx - G[0]) / len;
      const uy = (my - G[1]) / len;
      const anchor = ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle';
      const gap = text === '?' ? 16 : 10;
      const y = my + uy * gap + (uy > 0.3 ? 14 : uy < -0.3 ? -2 : 5);
      return label(Math.round(mx + ux * gap), Math.round(y), named(name, text), anchor);
    };
    return frame(
      `<path d="M${P.A[0]} ${P.A[1]} L${P.B[0]} ${P.B[1]} L${P.C[0]} ${P.C[1]} Z" stroke="${LINE}" stroke-width="2.5"/>` +
      corner(P.A, 'A') + corner(P.B, 'B') + corner(P.C, 'C') +
      angle(P.A, 'A', L.angleA) + angle(P.B, 'B', L.angleB) + angle(P.C, 'C', L.angleC) +
      side(P.B, P.C, 'a', L.sideA) + side(P.C, P.A, 'b', L.sideB) + side(P.A, P.B, 'c', L.sideC)
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
