// 숫자를 자동으로 만들어 내는 문제 생성기.
// 단원 파일의 틀에 "gen": "<이름>" 을 적으면 그 이름의 생성기가 숫자 묶음을 만듭니다.
// 생성기는 { answer: 정답, wrong: [오답 3개], ...문장 틀과 그림에 들어갈 값 } 을 돌려줍니다.
//
// 오답은 아무 숫자가 아니라 "흔한 실수를 했을 때 나오는 값"으로 만듭니다.
// 정답과 오답은 실제 값으로 비교해서, 모양만 다르고 값이 같은 보기가 생기지 않게 합니다.

const rand = (n) => Math.floor(Math.random() * n);
const pickOne = (arr) => arr[rand(arr.length)];
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const MINUS = '−';

// n√r/d 꼴의 값. 약분하고 루트 안의 제곱수를 밖으로 꺼냅니다.
// 돌려주는 것: { s: 화면에 보일 글, v: 실제 값, n, r, d }
function surd(n, r = 1, d = 1) {
  for (let f = 2; f * f <= r; f++) {
    while (r % (f * f) === 0) {
      r /= f * f;
      n *= f;
    }
  }
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  const v = (n * Math.sqrt(r)) / d;
  const sign = n < 0 ? MINUS : '';
  const abs = Math.abs(n);
  let s;
  if (r === 1) s = `${sign}${abs}`;
  else s = `${sign}${abs === 1 ? '' : abs}√${r}`;
  if (d !== 1) s += `/${d}`;
  return { s, v, n, r, d };
}
const frac = (n, d) => surd(n, 1, d);
const times = (x, k) => surd(x.n * k, x.r, x.d);
const over = (x, k) => surd(x.n, x.r, x.d * k);

// (p + q√r) 또는 (p − q√r) 꼴의 값
function sum(p, q, r, sign = 1) {
  return {
    s: `(${p} ${sign > 0 ? '+' : MINUS} ${q === 1 ? '' : q}√${r})`,
    v: p + sign * q * Math.sqrt(r),
  };
}

// 정답과 겹치지 않는 오답 3개를 고릅니다. candidates 가 모자라면 pads 에서 채웁니다.
function choose(answer, candidates, pads = []) {
  const out = [];
  const usable = (c) =>
    c && Number.isFinite(c.v) && c.s !== answer.s && Math.abs(c.v - answer.v) > 1e-9 &&
    !out.some((o) => o.s === c.s || Math.abs(o.v - c.v) < 1e-9);
  for (const c of [...candidates, ...pads]) {
    if (out.length < 3 && usable(c)) out.push(c);
  }
  // 그래도 모자랄 때의 마지막 수단
  for (let k = 2; out.length < 3 && k < 40; k++) {
    const c = { s: `${Math.round(answer.v * k * 100) / 100}`.replace('-', MINUS), v: Math.round(answer.v * k * 100) / 100 };
    if (usable(c)) out.push(c);
  }
  return out;
}

// 생성기가 돌려줄 숫자 묶음을 만듭니다. unit 을 주면 값 뒤에 단위를 붙입니다.
function item(fields, answer, candidates, pads, unit = '') {
  const wrong = choose(answer, candidates, pads);
  const show = (x) => (unit ? `${x.s} ${unit}` : x.s);
  return { ...fields, answer: show(answer), wrong: wrong.map(show) };
}

// 세 변이 모두 정수인 직각삼각형 (a, b 는 직각을 낀 두 변, c 는 빗변)
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [9, 40, 41], [12, 35, 37]];
function triple() {
  let [a, b, c] = pickOne(TRIPLES);
  if (Math.random() < 0.5) [a, b] = [b, a];
  return { a, b, c };
}

// 정수로 떨어지는 삼각형 (a, b, c, A): a² = b² + c² − 2bc cos A
const INT_TRIANGLES = [
  [7, 3, 8, 60], [7, 5, 8, 60], [13, 7, 15, 60], [13, 8, 15, 60], [14, 6, 16, 60], [19, 16, 21, 60],
  [7, 3, 5, 120], [13, 7, 8, 120], [19, 5, 16, 120], [14, 6, 10, 120],
  [5, 3, 4, 90], [13, 5, 12, 90], [17, 8, 15, 90], [25, 7, 24, 90],
];

// 사인 법칙: b = a × sin B ÷ sin A 가 깔끔하게 떨어지는 각의 짝 [A, B, n, r, d] (b = a·n√r/d)
const SINE_PAIRS = [
  [30, 45, 1, 2, 1], [45, 30, 1, 2, 2], [30, 60, 1, 3, 1], [60, 30, 1, 3, 3],
  [45, 60, 1, 6, 2], [60, 45, 1, 6, 3], [30, 90, 2, 1, 1], [90, 30, 1, 1, 2],
  [45, 90, 1, 2, 1], [90, 45, 1, 2, 2], [60, 90, 2, 3, 3], [90, 60, 1, 3, 2],
  [30, 120, 1, 3, 1], [45, 120, 1, 6, 2], [30, 135, 1, 2, 1],
  [120, 30, 1, 3, 3], [120, 45, 1, 6, 3], [135, 30, 1, 2, 2],
];

export const GENERATORS = {
  // 직각삼각형의 세 변을 보고 sin, cos, tan 구하기
  ratio() {
    const { a, b, c } = triple();
    const fn = pickOne(['sin', 'cos', 'tan']);
    const value = { sin: frac(a, c), cos: frac(b, c), tan: frac(a, b) };
    const others = ['sin', 'cos', 'tan'].filter((name) => name !== fn).map((name) => value[name]);
    return item({ a, b, c, fn }, value[fn], [...others, frac(c, a), frac(b, a), frac(c, b)]);
  },

  // 빗변과 30°·60° 로 한 변의 길이 구하기 (kind: 'sin30' 또는 'cos60')
  length() {
    const c = 2 * (5 + rand(26));
    const answer = surd(c / 2);
    return item({ c }, answer, [surd(c), surd(c * 2), surd(c / 2 + 3)], [surd(c / 2 - 2), surd(c + 4)], 'm');
  },

  // 수평거리와 올려본 각으로 탑의 높이 구하기
  height() {
    const d = pickOne([6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30]);
    const deg = pickOne([30, 45, 60]);
    const table = {
      30: [surd(d, 3, 3), [surd(d, 3, 1), surd(d, 1, 2), surd(d, 3, 2)]],
      45: [surd(d), [surd(d, 2, 2), surd(d, 3, 1), surd(d, 1, 2)]],
      60: [surd(d, 3, 1), [surd(d, 3, 3), surd(d, 3, 2), surd(d)]],
    };
    const [answer, wrong] = table[deg];
    return item({ d, deg }, answer, wrong, [times(answer, 2), over(answer, 2)], 'm');
  },

  // 두 지점에서 올려본 각으로 탑의 높이 구하기
  twopoint() {
    const g = pickOne([4, 6, 8, 10, 12, 14, 16, 20]);
    const h = g / 2;
    const [a, b] = pickOne([[30, 45], [30, 60], [45, 60]]);
    let answer;
    let wrong;
    if (a === 30 && b === 45) {
      answer = sum(h, h, 3);
      wrong = [surd(g, 3, 3), surd(g), sum(3 * h, h, 3, -1)];
    } else if (a === 30 && b === 60) {
      answer = surd(g, 3, 2);
      wrong = [surd(g, 3, 3), surd(g, 3, 1), surd(g, 3, 4)];
    } else {
      answer = sum(3 * h, h, 3);
      wrong = [surd(g), surd(g, 3, 1), { s: `(${h}√3 ${MINUS} ${h})`, v: h * Math.sqrt(3) - h }];
    }
    return item({ g, a, b }, answer, wrong, [surd(g * 2), surd(g, 1, 2), surd(g, 2, 1)], 'm');
  },

  // 삼각비의 상호 관계: 하나를 알 때 다른 하나 구하기. params.obtuse 이면 둔각.
  relation(params) {
    const { a, b, c } = triple();
    if (params.obtuse) {
      // θ 가 둔각이면 sin 은 양수, cos 과 tan 은 음수
      const ask = pickOne(['cos', 'tan']);
      const answer = ask === 'cos' ? frac(-b, c) : frac(-a, b);
      const positive = ask === 'cos' ? frac(b, c) : frac(a, b);
      return item({ given: 'sin', gv: frac(a, c).s, ask }, answer,
        [positive, ask === 'cos' ? frac(-a, c) : frac(-b, a), ask === 'cos' ? frac(-a, b) : frac(-b, c)],
        [frac(a, c), frac(-c, b)]);
    }
    const value = { sin: frac(a, c), cos: frac(b, c), tan: frac(a, b) };
    const [given, ask] = pickOne([['sin', 'cos'], ['cos', 'sin'], ['sin', 'tan'], ['cos', 'tan']]);
    const pool = [value.sin, value.cos, value.tan, frac(b, a), frac(c, b), frac(c, a)];
    return item({ given, gv: value[given].s, ask }, value[ask], pool);
  },

  // 사인 법칙: 한 변과 두 각으로 다른 변 구하기
  sinerule() {
    const a = pickOne([2, 3, 4, 6, 8, 10, 12]);
    const [A, B, n, r, d] = pickOne(SINE_PAIRS);
    const answer = surd(a * n, r, d);
    const upsideDown = surd(a * d, r, n * r); // 분자와 분모를 거꾸로 쓴 실수
    return item({ a, A, B }, answer, [upsideDown, surd(a), over(answer, 2), times(answer, 2)], [times(answer, 3)]);
  },

  // 사인 법칙: 한 변과 마주 보는 각으로 외접원의 반지름 구하기
  sineR() {
    const a = pickOne([2, 4, 6, 8, 10, 12]);
    const A = pickOne([30, 45, 60, 90, 120, 135, 150]);
    const table = { 30: surd(a), 150: surd(a), 45: surd(a, 2, 2), 135: surd(a, 2, 2), 60: surd(a, 3, 3), 120: surd(a, 3, 3), 90: surd(a, 1, 2) };
    const answer = table[A];
    // 2R 을 R 로 착각한 값, 사인 대신 코사인을 쓴 값 등
    return item({ a, A }, answer, [times(answer, 2), surd(a, 1, 2), surd(a), surd(a, 3, 2), surd(a, 2, 1)], [over(answer, 2)]);
  },

  // 코사인 법칙: 두 변과 끼인각으로 나머지 변 구하기
  cosrule() {
    const b = pickOne(range(2, 9));
    const c = pickOne(range(2, 9));
    const A = pickOne([60, 120]);
    const k = A === 60 ? -1 : 1; // −2bc cos A = ∓bc
    const answer = surd(1, b * b + c * c + k * b * c);
    return item({ b, c, A }, answer,
      [surd(1, b * b + c * c - k * b * c), surd(1, b * b + c * c), surd(b + c)],
      [surd(Math.abs(b - c) || 1), times(answer, 2)]);
  },

  // 코사인 법칙: 세 변으로 각 구하기
  cosangle() {
    // 닮은 삼각형(1~3배)과 b, c 를 바꾼 것까지 내어 같은 문제가 되풀이되지 않게 합니다.
    const k = 1 + rand(3);
    let [a, b, c] = pickOne(INT_TRIANGLES);
    const A = INT_TRIANGLES.find((row) => row[0] === a && row[1] === b && row[2] === c)[3];
    if (Math.random() < 0.5) [b, c] = [c, b];
    [a, b, c] = [a * k, b * k, c * k];
    const deg = (x) => ({ s: `${x}°`, v: x });
    const rest = [30, 45, 60, 90, 120, 135, 150].filter((x) => x !== A);
    // 60° 와 120° 를 헷갈리는 것이 가장 흔한 실수라서 먼저 넣습니다.
    const first = A === 60 ? [120] : A === 120 ? [60] : [];
    const others = rest.filter((x) => !first.includes(x)).sort(() => Math.random() - 0.5);
    return item({ a, b, c }, deg(A), [...first, ...others].map(deg));
  },

  // 두 변과 끼인각으로 삼각형의 넓이 구하기
  area() {
    const b = pickOne(range(2, 12));
    const c = pickOne(range(2, 12));
    const A = pickOne([30, 45, 60, 120, 135, 150]);
    const bc = b * c;
    const root = { 30: 1, 150: 1, 45: 2, 135: 2, 60: 3, 120: 3 }[A];
    const answer = surd(bc, root, 4);
    const cosMix = { 1: surd(bc, 3, 4), 2: surd(bc, 2, 2), 3: surd(bc, 1, 4) }[root]; // sin 대신 cos 을 쓴 값
    return item({ b, c, A }, answer, [surd(bc, 1, 2), cosMix, times(answer, 2)], [surd(bc), over(answer, 2)]);
  },
};

// =====================================================================
// 数と式 · 二次関数 · データの分析 (数学I 의 나머지 단원)
// =====================================================================

const nonzero = (from, to) => pickOne(range(from, to).filter((n) => n !== 0));
const numStr = (n) => String(n).replace('-', MINUS);
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);
const int = (n) => ({ s: numStr(n), v: n });
const dec = (v) => ({ s: numStr(Number.isInteger(v) ? v : Math.round(v * 10) / 10), v });

// c2·x² + c1·x + c0 을 글로 씁니다. 예: polyStr(1, -5, 6) → "x² − 5x + 6"
function polyStr(c2, c1, c0) {
  const parts = [];
  const term = (coef, sym) => {
    if (!coef) return;
    const abs = Math.abs(coef);
    parts.push([coef < 0, `${abs === 1 && sym ? '' : abs}${sym}`]);
  };
  term(c2, 'x²');
  term(c1, 'x');
  term(c0, '');
  if (!parts.length) return '0';
  return parts.map(([neg, body], i) => (i === 0 ? `${neg ? MINUS : ''}${body}` : ` ${neg ? MINUS : '+'} ${body}`)).join('');
}
// 다항식 보기: 값이 같은 식끼리 겹치지 않도록 x = 1.37 에서의 값으로 구별합니다.
const poly = (c2, c1, c0) => ({ s: polyStr(c2, c1, c0), v: c2 * 1.8769 + c1 * 1.37 + c0 });

// (ax + b) 를 글로 씁니다.
function lin(a, b) {
  const head = `${a === 1 ? '' : a === -1 ? MINUS : numStr(a)}x`;
  return b === 0 ? head : `(${head} ${b < 0 ? MINUS : '+'} ${Math.abs(b)})`;
}
// (ax + b)(cx + d) 꼴의 보기
function product(a, b, c, d) {
  const s = a === c && b === d ? `${lin(a, b)}²` : `${lin(a, b)}${lin(c, d)}`;
  return { s, v: poly(a * c, a * d + b * c, b * d).v };
}

// y = a(x − p)² + q 를 글로 씁니다.
function vertexForm(a, p, q) {
  const head = a === 1 ? '' : a === -1 ? MINUS : numStr(a);
  const inner = p === 0 ? 'x²' : `(x ${p > 0 ? MINUS : '+'} ${Math.abs(p)})²`;
  const tail = q === 0 ? '' : ` ${q < 0 ? MINUS : '+'} ${Math.abs(q)}`;
  return `y = ${head}${inner}${tail}`;
}
const point = (p, q) => ({ s: `(${numStr(p)}, ${numStr(q)})`, v: p * 1000.5 + q });
// 두 해 "x = a, b" (작은 수부터)
function roots(a, b) {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return { s: lo === hi ? `x = ${numStr(lo)}` : `x = ${numStr(lo)}, ${numStr(hi)}`, v: lo * 100.5 + hi };
}
// 이차부등식의 해: inside 이면 "a < x < b", 아니면 "x < a, b < x"
function interval(a, b, inside) {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return {
    s: inside ? `${numStr(lo)} < x < ${numStr(hi)}` : `x < ${numStr(lo)}, ${numStr(hi)} < x`,
    v: (inside ? 1 : 2) * 100000 + lo * 100.5 + hi,
  };
}
// 일차부등식의 해 "x < k" 등
const OPS = ['<', '>', '≦', '≧'];
const flipOp = (op) => ({ '<': '>', '>': '<', '≦': '≧', '≧': '≦' })[op];
const half = (op, k) => ({ s: `x ${op} ${numStr(k)}`, v: OPS.indexOf(op) * 1000 + k });

// 평균이 정수가 되는 자료를 만듭니다. devs 는 평균에서 떨어진 정도.
function dataFrom(devs, lowestMean = 6) {
  const mean = lowestMean + Math.max(0, -Math.min(...devs)) + rand(8);
  const values = shuffled(devs.map((d) => mean + d));
  return { mean, values, list: values.join(', ') };
}
// 편차 제곱의 평균(분산)이 정수가 되는 편차 묶음
const VAR_SETS = [[-2, -1, 0, 1, 2], [-4, -2, 0, 2, 4], [-3, -1, 0, 1, 3], [-4, -3, 0, 3, 4], [-1, -1, -1, -1, 4], [-5, 0, 0, 0, 5], [-1, -1, 1, 1], [-2, -2, 2, 2], [-3, -1, 1, 3], [-2, 0, 0, 2], [-4, 0, 0, 4]];
// 분산이 제곱수가 되는 편차 묶음 (표준편차가 정수)
const SD_SETS = [[-2, -2, 2, 2], [-3, -3, 3, 3], [-1, -1, 1, 1], [-1, -1, -1, -1, 4], [-6, -2, 0, 2, 6], [-4, -4, 4, 4], [-3, -1, 0, 1, 3], [-2, -2, -2, -2, 8], [-5, -5, 5, 5]];

Object.assign(GENERATORS, {
  // ---------- 数と式 ----------

  // 전개: (x + a)(x + b). params.hard 이면 (ax + b)(cx + d)
  expand(params) {
    if (params.hard) {
      const a = pickOne([2, 3]);
      const c = pickOne([1, 2, 3]);
      const b = nonzero(-5, 5);
      const d = nonzero(-5, 5);
      return item({ expr: product(a, b, c, d).s }, poly(a * c, a * d + b * c, b * d),
        [poly(a * c, a * d - b * c, b * d), poly(a * c, a * d + b * c, -b * d), poly(a * c, b * d, a * d + b * c)],
        [poly(a + c, a * d + b * c, b * d), poly(a * c, a * d + b * c + 1, b * d)]);
    }
    const a = nonzero(-9, 9);
    const b = nonzero(-9, 9);
    return item({ expr: product(1, a, 1, b).s }, poly(1, a + b, a * b),
      [poly(1, a + b, -a * b), poly(1, a * b, a + b), poly(1, a - b, a * b)],
      [poly(1, -(a + b), a * b), poly(1, a + b, a * b + 1), poly(1, a + b + 1, a * b)]);
  },

  // 인수분해: x² + px + q. params.hard 이면 x² 의 계수가 1 이 아닌 경우
  factor(params) {
    if (params.hard) {
      const a = pickOne([2, 3, 5]);
      const b = pickOne(range(-5, 5).filter((n) => n !== 0 && gcd(a, n) === 1));
      const d = nonzero(-5, 5);
      return item({ expr: polyStr(a, a * d + b, b * d) }, product(a, b, 1, d),
        [product(a, -b, 1, -d), product(a, d, 1, b), product(a, b, 1, -d)],
        [product(a, -b, 1, d), product(1, b, a, d), product(a, b + 1, 1, d)]);
    }
    let a = nonzero(-9, 9);
    let b = nonzero(-9, 9);
    if (a > b) [a, b] = [b, a];
    return item({ expr: polyStr(1, a + b, a * b) }, product(1, a, 1, b),
      [product(1, -b, 1, -a), product(1, -a, 1, b), product(1, a, 1, -b)],
      [product(1, a + 1, 1, b - 1), product(1, a - 1, 1, b + 1), product(1, a, 1, b + 1)]);
  },

  // 제곱근 정리: √n = k√m
  surdSimplify() {
    const k = pickOne([2, 3, 4, 5, 6]);
    const m = pickOne([2, 3, 5, 6, 7]);
    const answer = surd(k, m);
    return item({ n: k * k * m }, answer, [surd(k * k, m), surd(m, k), surd(k + 1, m)], [surd(k - 1, m), times(answer, 2)]);
  },

  // 분모의 유리화: c/√m
  rationalize() {
    const m = pickOne([2, 3, 5, 6, 7]);
    const c = pickOne(range(1, 12));
    const answer = surd(c, m, m);
    return item({ c, m }, answer, [surd(c, m, 1), surd(c, 1, m), surd(c * m, m, 1)], [times(answer, 2), over(answer, 2), surd(c + 1, m, m)]);
  },

  // 일차부등식: ax + b < c. a 가 음수이면 부등호의 방향이 바뀝니다.
  inequality() {
    const a = pickOne([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
    const k = nonzero(-6, 6);
    const b = nonzero(-9, 9);
    const op = pickOne(OPS);
    const answerOp = a > 0 ? op : flipOp(op);
    return item({ lhs: polyStr(0, a, b), op, c: numStr(a * k + b) }, half(answerOp, k),
      [half(flipOp(answerOp), k), half(answerOp, -k), half(flipOp(answerOp), -k)],
      [half(answerOp, k + 1), half(answerOp, k - 1)]);
  },

  // 집합의 원소의 개수: n(A∪B) = n(A) + n(B) − n(A∩B)
  sets() {
    const p = 10 + rand(21);
    const q = 10 + rand(21);
    const r = 2 + rand(Math.min(p, q) - 3);
    return item({ p, q, r }, int(p + q - r), [int(p + q), int(p + q + r), int(p + q - 2 * r)], [int(Math.abs(p - q) + r), int(p + q - r + 1)]);
  },

  // ---------- 二次関数 ----------

  // 꼭짓점: y = a(x − p)² + q
  vertex() {
    const a = pickOne([1, 2, 3, -1, -2]);
    const p = nonzero(-6, 6);
    const q = nonzero(-6, 6);
    return item({ f: vertexForm(a, p, q) }, point(p, q), [point(-p, q), point(p, -q), point(q, p)], [point(-p, -q), point(p + 1, q), point(p, q + 1)]);
  },

  // 완전제곱식으로 고쳐 꼭짓점 구하기: y = ax² + bx + c
  complete() {
    const a = pickOne([1, 1, 2, -1]);
    const p = nonzero(-5, 5);
    const q = nonzero(-5, 5);
    const c0 = a * p * p + q;
    return item({ f: `y = ${polyStr(a, -2 * a * p, c0)}` }, point(p, q),
      [point(-p, q), point(p, c0), point(p, -q)],
      [point(-p, c0), point(2 * p, q), point(p + 1, q)]);
  },

  // 정해진 범위에서의 최솟값·최댓값: y = (x − p)² + q (s ≦ x ≦ t). params.ask 는 'min' 또는 'max'
  maxmin(params) {
    const p = pickOne(range(-3, 3));
    const q = pickOne(range(-5, 5));
    const f = (x) => (x - p) ** 2 + q;
    let s;
    let t;
    if (params.ask === 'min' && Math.random() < 0.7) {
      s = p - (1 + rand(3)); // 꼭짓점이 범위 안
      t = p + (1 + rand(3));
    } else {
      // 양 끝의 함숫값이 달라지도록 범위를 잡습니다. (꼭짓점이 범위 밖일 수도 있습니다)
      s = p - 2 + rand(5);
      t = s + 2 + rand(3);
      if (Math.abs(s - p) === Math.abs(t - p)) t += 1;
    }
    const inside = s <= p && p <= t;
    const low = inside ? q : Math.min(f(s), f(t));
    const high = Math.max(f(s), f(t));
    const answer = int(params.ask === 'min' ? low : high);
    const other = int(params.ask === 'min' ? high : low);
    return item({ f: vertexForm(1, p, q), s: numStr(s), t: numStr(t) }, answer,
      [other, int(q), int(Math.min(f(s), f(t))), int(p)],
      [int(answer.v + 1), int(answer.v - 1), int(f(s) + f(t))]);
  },

  // 이차방정식 풀기 (정수 해)
  quadeq() {
    const a = nonzero(-9, 9);
    const b = pickOne(range(-9, 9).filter((n) => n !== 0 && n !== a));
    return item({ f: `${polyStr(1, -(a + b), a * b)} = 0` }, roots(a, b),
      [roots(-a, -b), roots(a, -b), roots(-a, b)],
      [roots(a, b + 1), roots(a - 1, b), roots(a + 1, b + 1)]);
  },

  // 판별식의 값: D = b² − 4ac
  discriminant() {
    const a = pickOne([1, 2, 3, -1]);
    const b = pickOne(range(-8, 8));
    const c = nonzero(-6, 6);
    const D = b * b - 4 * a * c;
    return item({ f: `${polyStr(a, b, c)} = 0`, a, b, c }, int(D),
      [int(b * b + 4 * a * c), int(b * b - a * c), int(b - 4 * a * c)],
      [int(4 * a * c - b * b), int(D + 4), int(D - 1)]);
  },

  // 이차부등식 (정수 해 두 개)
  quadineq() {
    const a = nonzero(-8, 8);
    const b = pickOne(range(-8, 8).filter((n) => n !== 0 && n !== a));
    const op = pickOne(['<', '>']);
    const inside = op === '<';
    return item({ f: polyStr(1, -(a + b), a * b), op }, interval(a, b, inside),
      [interval(a, b, !inside), interval(-a, -b, inside), interval(-a, -b, !inside)],
      [interval(a, b + 1, inside), interval(a - 1, b, inside), interval(a + 1, b + 2, !inside)]);
  },

  // ---------- データの分析 ----------

  // 평균
  mean() {
    let devs;
    do {
      devs = [nonzero(-5, 5), nonzero(-5, 5), pickOne(range(-5, 5)), pickOne(range(-5, 5))];
      devs.push(-devs.reduce((sum, d) => sum + d, 0));
    } while (Math.abs(devs[4]) > 7);
    const { mean, values, list } = dataFrom(devs);
    const sorted = [...values].sort((x, y) => x - y);
    return item({ list }, int(mean), [int(sorted[2]), int(mean + 1), int(mean - 1)], [int(mean + 2), int(sorted[4] - sorted[0]), int(mean - 2)]);
  },

  // 중앙값 (자료는 크기 순서가 아닙니다)
  median() {
    const count = pickOne([5, 6]);
    const values = [];
    while (values.length < count) {
      const v = 1 + rand(20);
      if (!values.includes(v)) values.push(v);
    }
    const sorted = [...values].sort((x, y) => x - y);
    const answer = dec(count === 5 ? sorted[2] : (sorted[2] + sorted[3]) / 2);
    const naive = dec(count === 5 ? values[2] : (values[2] + values[3]) / 2); // 정렬하지 않고 가운데를 고른 실수
    const mean = dec(Math.round((values.reduce((sum, v) => sum + v, 0) / count) * 10) / 10);
    return item({ list: values.join(', ') }, answer, [naive, mean, dec(sorted[count === 5 ? 1 : 2])],
      [dec(sorted[3]), dec(answer.v + 1), dec(answer.v - 1), dec(answer.v + 2)]);
  },

  // 사분위범위 (자료 7개, 크기 순서)
  iqr() {
    const values = [2 + rand(5)];
    while (values.length < 7) values.push(values[values.length - 1] + 1 + rand(4));
    const [, q1, , med, , q3] = values;
    return item({ list: values.join(', ') }, int(q3 - q1),
      [int(values[6] - values[0]), int(q3 - med), int(med - q1), int(q3)],
      [int(q3 - q1 + 1), int(q3 - q1 - 1), int(q1)]);
  },

  // 분산 (편차 제곱의 평균)
  variance() {
    const devs = pickOne(VAR_SETS);
    const { values, list } = dataFrom(devs);
    const sq = devs.reduce((sum, d) => sum + d * d, 0);
    const n = devs.length;
    const sorted = [...values].sort((x, y) => x - y);
    return item({ list }, int(sq / n),
      [int(sq), dec(Math.round((sq / (n - 1)) * 10) / 10), int(sorted[n - 1] - sorted[0])],
      [int(sq / n + 1), int(sq / n + 2), dec(sq / n / 2)]);
  },

  // 표준편차 (분산의 양의 제곱근)
  sd() {
    const devs = pickOne(SD_SETS);
    const { list } = dataFrom(devs);
    const sq = devs.reduce((sum, d) => sum + d * d, 0);
    const variance = sq / devs.length;
    const answer = int(Math.sqrt(variance));
    return item({ list }, answer, [int(variance), int(sq), int(answer.v + 1)], [int(answer.v + 2), dec(answer.v / 2), int(answer.v * 3)]);
  },
});

// =====================================================================
// 数学I 의 빈 곳 (명제, 공간도형, 상관) 과 数学A (경우의 수·확률, 도형의 성질)
// =====================================================================

const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const nPr = (n, r) => fact(n) / fact(n - r);
const nCr = (n, r) => nPr(n, r) / fact(r);
const degree = (x) => ({ s: `${numStr(x)}°`, v: x });
const NOT = { '>': '≦', '≦': '>', '<': '≧', '≧': '<', '=': '≠', '≠': '=' };
// 보기마다 번호를 값으로 주어, 글이 다르면 다른 보기로 봅니다.
const labelled = (texts) => texts.map((s, i) => ({ s, v: i + 1 }));

Object.assign(GENERATORS, {
  // ---------- 数と式: 命題 ----------

  // 명제 "p ⟹ q" 의 역·이·대우. params.ask 는 'converse' | 'inverse' | 'contra'
  proposition(params) {
    const forms = [
      () => { const a = pickOne(range(2, 9)); const b = a - 1 - rand(3); return [`x > ${a}`, `x > ${numStr(b)}`]; },
      () => { const a = pickOne(range(-5, 3)); const b = a + 1 + rand(3); return [`x < ${numStr(a)}`, `x < ${numStr(b)}`]; },
      () => { const a = pickOne(range(2, 6)); return [`x = ${a}`, `x² = ${a * a}`]; },
      () => { const a = pickOne(range(1, 6)); const b = a + 1 + rand(3); return [`x ≧ ${b}`, `x > ${a}`]; },
      () => { const a = pickOne(range(2, 7)); return [`x = ${a}`, `x > ${a - 1 - rand(2)}`]; },
    ];
    const [P, Q] = pickOne(forms)();
    const neg = (text) => {
      const m = text.match(/^(\S+) (\S+) (.+)$/);
      return `${m[1]} ${NOT[m[2]]} ${m[3]}`;
    };
    const imp = (from, to) => `${from} ⟹ ${to}`;
    const all = {
      converse: imp(Q, P),
      inverse: imp(neg(P), neg(Q)),
      contra: imp(neg(Q), neg(P)),
      mixed: imp(neg(P), Q),
      mixed2: imp(P, neg(Q)),
    };
    const order = [params.ask, ...['contra', 'converse', 'inverse', 'mixed', 'mixed2'].filter((k) => k !== params.ask)];
    const [answer, ...rest] = labelled(order.map((k) => all[k]));
    return item({ stmt: imp(P, Q) }, answer, rest);
  },

  // 필요조건·충분조건: "p 는 q 이기 위한 ○○조건". 보기는 말이라서 "@이름" 으로 적습니다. (lang 파일의 opt)
  // pq 는 "p ⟹ q" 가 참인지, qp 는 "q ⟹ p" 가 참인지입니다.
  condition() {
    const a = pickOne(range(2, 7));
    const b = a + 1 + rand(3);
    const k = pickOne([2, 3, 4, 5]);
    // [p, q, p ⟹ q, q ⟹ p]
    const forms = [
      [`x = ${a}`, `x² = ${a * a}`, true, false],
      [`x > ${b}`, `x > ${a}`, true, false],
      [`|x| = ${a}`, `x² = ${a * a}`, true, true],
      [`x > ${a}`, `x² > ${a * a}`, true, false],
      [`x > ${a}`, `x < ${b}`, false, false],
      [`${k}x = ${k * a}`, `x = ${a}`, true, true],
      [`|x| < ${a}`, `x < ${a}`, true, false],
      [`x < ${MINUS}${a}`, `x² > ${a * a}`, true, false],
      [`x = ${b}`, `x > ${a}`, true, false],
      [`x > ${MINUS}${a}`, `x² > ${a * a}`, false, false],
      [`x + ${a} > 0`, `x > ${MINUS}${a}`, true, true],
      [`x² = ${a * a}`, `x > 0`, false, false],
    ];
    let [p, q, pq, qp] = pickOne(forms);
    if (pq !== qp && Math.random() < 0.5) [p, q, pq, qp] = [q, p, qp, pq];
    const name = pq && qp ? '@necsuf' : pq ? '@suf' : qp ? '@nec' : '@neither';
    const all = ['@necsuf', '@suf', '@nec', '@neither'];
    return { p, q, pq: pq ? '@true' : '@false', qp: qp ? '@true' : '@false', answer: name, wrong: all.filter((n) => n !== name) };
  },

  // ---------- 図形と計量: 空間図形 ----------

  // 직육면체의 대각선: √(a² + b² + c²)
  cuboid() {
    let a;
    let b;
    let c;
    do {
      [a, b, c] = [pickOne(range(1, 8)), pickOne(range(1, 8)), pickOne(range(1, 8))];
    } while (a === b && b === c);
    const sq = a * a + b * b + c * c;
    return item({ a, b, c }, surd(1, sq), [surd(1, a * a + b * b), surd(a + b + c), surd(sq), surd(1, a + b + c)],
      [surd(1, sq + 1), surd(1, b * b + c * c), surd(2, sq)]);
  },

  // 두 지점에서 올려본 각으로 탑의 높이 구하기 (∠AHB = 90°)
  // AH = h/tan α, BH = h/tan β 이고 AB² = AH² + BH² 이므로 h = AB ÷ √(1/tan²α + 1/tan²β)
  spaceheight() {
    const COT2x3 = { 30: 9, 45: 3, 60: 1 }; // (1/tan²) × 3
    const al = pickOne([30, 45, 60]);
    const be = pickOne([30, 45, 60]);
    const p = COT2x3[al] + COT2x3[be];
    const d = pickOne(range(2, 12)) * pickOne([1, 2, 5]);
    const answer = surd(d, 3 * p, p);
    return item({ al, be, d }, answer,
      [surd(d, 1, 2), surd(d, 3, 2), surd(d, 2, 2), surd(d), surd(d, 3, 3)],
      [times(answer, 2), over(answer, 2), surd(d, 6, 2)], 'm');
  },

  // ---------- データの分析: 相関 ----------

  // 공분산: 편차의 곱의 평균
  covariance() {
    const SETS = [[-2, -1, 1, 2], [-3, -1, 1, 3], [-1, -1, 1, 1], [-2, 0, 0, 2], [-2, -1, 0, 1, 2], [-4, -2, 0, 2, 4], [-1, 0, 0, 0, 1], [-3, -1, 0, 1, 3]];
    let dx;
    let dy;
    let sum;
    do {
      dx = pickOne(SETS);
      dy = shuffled(pickOne(SETS.filter((set) => set.length === dx.length)));
      sum = dx.reduce((acc, d, i) => acc + d * dy[i], 0);
    } while (sum % dx.length !== 0 || sum === 0);
    const n = dx.length;
    const mx = 3 + Math.max(...dx.map((d) => -d)) + rand(5);
    const my = 3 + Math.max(...dy.map((d) => -d)) + rand(5);
    const order = shuffled(range(0, n - 1));
    const pairs = order.map((i) => `(${mx + dx[i]}, ${my + dy[i]})`).join(', ');
    const cov = sum / n;
    return item({ pairs, mx, my }, int(cov), [int(sum), int(-cov), dec(Math.round((sum / (n - 1)) * 10) / 10)],
      [int(cov + 1), int(cov - 1), int(cov * 2), int(mx * my)]);
  },

  // 상관계수 r = s_xy ÷ (s_x × s_y)
  correlation() {
    let sx;
    let sy;
    let r;
    let sxy;
    do {
      sx = pickOne(range(2, 8));
      sy = pickOne(range(2, 8));
      r = pickOne([0.5, -0.5, 0.8, -0.8, 0.6, -0.6, 0.25, -0.25, 0.75, -0.75, 0.9, -0.9, 0.4, -0.4, 0.2, -0.2]);
      sxy = Math.round(r * sx * sy * 100) / 100;
    } while (Math.round(sxy * 10) !== sxy * 10);
    const two = (v) => ({ s: numStr(Math.round(v * 100) / 100), v: Math.round(v * 100) / 100 });
    return item({ sx, sy, sxy: numStr(sxy) }, two(r), [two(-r), two(sxy / (sx + sy)), two(sxy / sx), two(sxy / sy)],
      [two(r / 2), two(r > 0 ? r - 0.1 : r + 0.1), two(1 - Math.abs(r))]);
  },

  // ---------- 数学A: 場合の数と確率 ----------

  // 순열 nPr
  perm() {
    const n = pickOne(range(4, 10));
    const r = pickOne([2, 3, 4].filter((k) => k < n));
    return item({ n, r }, int(nPr(n, r)), [int(nCr(n, r)), int(n ** r), int(n * r)], [int(fact(r)), int(nPr(n, r) + n), int(nPr(n, r) / 2)]);
  },

  // 조합 nCr
  comb() {
    const n = pickOne(range(5, 12));
    const r = pickOne([2, 3, 4]);
    return item({ n, r }, int(nCr(n, r)), [int(nPr(n, r)), int(n * r), int(n ** r)], [int(nCr(n, r) + n), int(nCr(n, r + 1)), int(nCr(n, r) * 2)]);
  },

  // 원순열 (n − 1)!
  circular() {
    const n = pickOne(range(4, 7));
    return item({ n }, int(fact(n - 1)), [int(fact(n)), int(fact(n) / 2), int(fact(n - 2))], [int(n * n), int(fact(n - 1) * 2), int(n)]);
  },

  // 같은 것이 있는 순열 (p + q)! ÷ (p! q!)
  samearrange() {
    const p = pickOne(range(2, 5));
    const q = pickOne(range(1, 4));
    const answer = fact(p + q) / (fact(p) * fact(q));
    return item({ p, q }, int(answer), [int(fact(p + q)), int(fact(p) * fact(q)), int(fact(p + q) / fact(p))],
      [int(answer + 1), int(answer * 2), int(p * q), int(answer + p + q)]);
  },

  // 주사위 두 개의 눈의 합
  dicesum() {
    const sumTo = pickOne(range(3, 11));
    const ways = 6 - Math.abs(7 - sumTo);
    return item({ s: sumTo }, frac(ways, 36), [frac(1, 11), frac(ways, 12), frac(ways + 1, 36), frac(sumTo, 36)],
      [frac(ways - 1, 36), frac(1, 6), frac(1, 36), frac(ways, 18)]);
  },

  // 여사건: 동전을 n 번 던져 적어도 한 번 앞면
  complement() {
    const n = pickOne(range(2, 6));
    const all = 2 ** n;
    return item({ n }, frac(all - 1, all), [frac(1, all), frac(n, all), frac(1, 2), frac(n, 2 * n + 1)],
      [frac(all - 2, all), frac(all - n, all), frac(1, n)]);
  },

  // 조건부 확률: 되돌려 놓지 않고 두 번 꺼낼 때, 첫 번째가 빨강일 때 두 번째도 빨강
  conditional() {
    const r = pickOne(range(2, 6));
    const w = pickOne(range(2, 6));
    const all = r + w;
    return item({ r, w }, frac(r - 1, all - 1), [frac(r, all), frac(r * (r - 1), all * (all - 1)), frac(r - 1, all), frac(r, all - 1)],
      [frac(w, all - 1), frac(1, 2), frac(r - 1, all + 1)]);
  },

  // 기댓값: 제비 10개 중 a점이 p개, b점이 q개, 나머지는 0점
  expectation() {
    const a = pickOne([50, 100, 200]);
    const b = pickOne([10, 20, 30, 40].filter((v) => v < a));
    const p = pickOne([1, 2]);
    const q = pickOne([2, 3, 4]);
    const e = (a * p + b * q) / 10;
    return item({ a, b, p, q, rest: 10 - p - q }, int(e), [int(a * p + b * q), int((a + b) / 2), int((a + b) / 10), int((a * p + b * q) / (p + q))],
      [int(e + 5), int(e * 2), int(e + 10), int(e / 2)]);
  },

  // ---------- 数学A: 図形の性質 ----------

  // 각의 이등분선: BD : DC = AB : AC
  // 삼각형이 실제로 만들어지고(BC < AB + AC) BD 가 정수가 되도록 숫자를 고릅니다.
  bisector() {
    let c;
    let b;
    let a;
    let unit;
    do {
      const f = pickOne([2, 3, 4]);
      const c1 = pickOne(range(1, 5));
      const b1 = pickOne(range(1, 5).filter((n) => n !== c1 && gcd(n, c1) === 1));
      unit = pickOne(range(1, f - 1));
      [c, b, a] = [f * c1, f * b1, unit * (c1 + b1)];
      unit *= c1; // BD
    } while (a <= Math.abs(b - c) || a >= b + c);
    const bd = unit;
    return item({ c, b, a }, int(bd), [int(a - bd), frac(a, 2), frac(a * c, b), frac(a * b, c)], [int(bd + 1), int(a), frac(bd, 2)]);
  },

  // 무게중심: 중선을 2 : 1 로 나눕니다
  centroid() {
    const m = 3 * pickOne(range(2, 12));
    return item({ m }, int((2 * m) / 3), [int(m / 3), frac(m, 2), int(2 * m)], [int(m), int(m - 3), int((2 * m) / 3 + 1)]);
  },

  // 내심: ∠BIC = 90° + A/2
  incenter() {
    const A = 2 * pickOne(range(15, 60));
    return item({ A }, degree(90 + A / 2), [degree(180 - A), degree(2 * A), degree(90 - A / 2), degree(90 + A)],
      [degree(A / 2), degree(180 - A / 2), degree(A + 10)]);
  },

  // 외심: ∠BOC = 2A (A 는 예각)
  circumcenter() {
    const A = pickOne(range(25, 85));
    return item({ A }, degree(2 * A), [degree(180 - A), degree(90 + A / 2 === Math.floor(90 + A / 2) ? 90 + A / 2 : 90 + (A + 1) / 2), degree(A), degree(180 - 2 * A)],
      [degree(A + 90), degree(2 * A + 10), degree(360 - 2 * A)]);
  },

  // 원주각과 중심각. params.ask 는 'inscribed' (중심각 → 원주각) 또는 'central'
  inscribed(params) {
    const half = pickOne(range(15, 85));
    const full = 2 * half;
    if (params.ask === 'central') {
      return item({ x: half }, degree(full), [degree(half), degree(180 - half), degree(90 + half)], [degree(full + 10), degree(360 - full), degree(half / 2 === Math.floor(half / 2) ? half / 2 : half + 5)]);
    }
    return item({ x: full }, degree(half), [degree(full), degree(180 - full), degree(2 * full)], [degree(half + 10), degree(90 - half), degree(180 - half)]);
  },

  // 원에 내접하는 사각형: 마주 보는 각의 합은 180°
  cyclic() {
    const A = pickOne(range(50, 130).filter((x) => x !== 90));
    return item({ A }, degree(180 - A), [degree(A), degree(360 - A), degree(90 - A > 0 ? 90 - A : A - 90)], [degree(180 - A + 10), degree(2 * A), degree(180 - A - 10)]);
  },

  // 방멱 정리: PA × PB = PC × PD
  power() {
    let a;
    let b;
    let c;
    do {
      a = pickOne(range(2, 9));
      b = pickOne(range(a + 1, 16));
      c = pickOne(range(2, 12));
    } while ((a * b) % c !== 0 || c === a || c === b || (a * b) / c <= c);
    const d = (a * b) / c;
    return item({ a, b, c }, int(d), [int(a + b - c), frac(b * c, a), frac(a * c, b), int(a * b)], [int(d + 1), int(d - 1), int(b - a + c)]);
  },

  // 방멱 정리 (접선): PT² = PA × PB
  tangent() {
    const t = pickOne(range(4, 12));
    const pairs = range(1, t - 1).filter((a) => (t * t) % a === 0); // 1 은 언제나 들어 있습니다.
    const a = pickOne(pairs);
    const b = (t * t) / a;
    return item({ a, b }, int(t), [int(a * b), frac(a + b, 2), int(b - a)], [int(t + 1), int(t - 1), surd(1, a + b), int(2 * t)]);
  },
});
