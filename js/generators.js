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
  [5, 3, 4, 90], [13, 5, 12, 90],
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
    const [a, b, c, A] = pickOne(INT_TRIANGLES);
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
