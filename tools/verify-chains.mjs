// Independent check of the chain (linked question) generators.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // 저장소 폴더
globalThis.document = { documentElement: {} };
const { CHAINS } = await import(ROOT + 'js/generators.js');
const clean = (s) => String(s).replace(/−/g, '-');
const N = (s) => Number(clean(s));
const num = (s) => Function(`return (${clean(s).replace(/(\d+)?√(\d+)/g, (m, k, r) => `${k ? k + '*' : ''}Math.sqrt(${r})`)});`)();
const near = (a, b) => Math.abs(a - b) < 1e-9;
const js = (s) => clean(s).replace(/^y = /, '').replace(/\(([^()]*)\)²/g, '(($1)*($1))').replace(/x²/g, '(x*x)').replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(').replace(/^-\(/, '-1*(');
const ev = (s, x) => Function('x', `return (${js(s)});`)(x);
const pt = (s) => clean(s).replace(/[()]/g, '').split(', ').map(Number);
const G = (a, b) => (b ? G(b, a % b) : Math.abs(a));
const XS = [-3.1, -1, 0.3, 2.2, 4.5];
const OK = {
  quad: [
    (d, o) => /\)²|x²/.test(o) && XS.every((x) => near(ev(o, x), ev(d.f, x))) && !/x² [+-] \d+x/.test(clean(o)),
    (d, o) => { const [p, q] = pt(o); const f = (x) => ev(d.f, x); return near(f(p), q) && near(f(p + 1), f(p - 1)); },
    (d, o) => { let best = -Infinity; for (let x = N(d.s); x <= N(d.t) + 1e-9; x += 0.125) best = Math.max(best, ev(d.f, x)); return near(best, N(o)); },
  ],
  tri: [
    (d, o) => near(num(o), Math.sqrt(d.b * d.b + d.c * d.c - 2 * d.b * d.c * Math.cos(d.A * Math.PI / 180))),
    (d, o) => near(num(o), 0.5 * d.b * d.c * Math.sin(d.A * Math.PI / 180)),
    (d, o) => { const a = Math.sqrt(d.b * d.b + d.c * d.c - 2 * d.b * d.c * Math.cos(d.A * Math.PI / 180)); const S = 0.5 * d.b * d.c * Math.sin(d.A * Math.PI / 180); return Math.abs(num(o) - (2 * S) / (a + d.b + d.c)) < 1e-9; },
  ],
  data: [
    (d, o) => { const v = d.list.split(', ').map(Number); return near(N(o), v.reduce((a, b) => a + b, 0) / v.length); },
    (d, o) => { const v = d.list.split(', ').map(Number); const m = v.reduce((a, b) => a + b, 0) / v.length; return near(N(o), v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); },
    (d, o) => { const v = d.list.split(', ').map(Number); const m = v.reduce((a, b) => a + b, 0) / v.length; return near(N(o), Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length)); },
  ],
  prob: (() => { const pairs = (d) => { const balls = [...Array(d.r).fill(1), ...Array(d.w).fill(0)]; const out = []; for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) out.push(balls[i] + balls[j]); return out; }; return [
    (d, o) => N(o) === pairs(d).length,
    (d, o) => near(num(o), pairs(d).filter((x) => x === 2).length / pairs(d).length),
    (d, o) => near(num(o), pairs(d).reduce((a, b) => a + b, 0) / pairs(d).length),
  ]; })(),
  int: [
    (d, o) => N(o) === G(d.a, d.b),
    (d, o) => N(o) === (d.a * d.b) / G(d.a, d.b),
    (d, o) => N(o) === d.a * d.b,
  ],
};
let total = 0, bad = 0; const seen = {}; const used = new Set();
const cat = JSON.parse(fs.readFileSync(ROOT + 'data/catalog.json', 'utf8'));
for (const file of cat.subjects.flatMap((s) => s.units)) {
  const unit = JSON.parse(fs.readFileSync(`${ROOT}data/units/${file}.json`, 'utf8'));
  for (const ch of unit.chains || []) {
    used.add(ch.gen);
    (globalThis.__cov ||= new Set()).add(`${unit.id}/${ch.id}`);
    if (!CHAINS[ch.gen] || !OK[ch.gen]) { console.log('MISSING', ch.id); bad++; continue; }
    if (ch.steps.length !== OK[ch.gen].length) { console.log('step count', ch.id); bad++; }
    for (const s of ch.steps) if (!unit.types[s.type]) { console.log('unknown type', ch.id, s.type); bad++; }
    const distinct = new Set();
    for (let k = 0; k < 4000; k++) {
      const d = CHAINS[ch.gen](); total++; const problems = [];
      if (d.steps.length !== ch.steps.length) problems.push('generator step count');
      const answers = {}; d.steps.forEach((s, i) => { answers[`a${i + 1}`] = s.answer; });
      d.steps.forEach((s, i) => {
        const opts = [s.answer, ...s.wrong].map(String);
        try {
          if (!OK[ch.gen][i](d, String(s.answer))) problems.push(`step ${i + 1} answer is wrong`);
          if (s.wrong.length !== 3) problems.push(`step ${i + 1} needs 3 wrong options`);
          if (new Set(opts).size !== 4) problems.push(`step ${i + 1} duplicate option`);
          s.wrong.forEach((w) => { let also = false; try { also = OK[ch.gen][i](d, String(w)); } catch (e) { also = false; } if (also) problems.push(`step ${i + 1} wrong option is also correct: ${w}`); });
          if (opts.some((o) => /NaN|undefined|Infinity/.test(o))) problems.push('bad option');
          if (ch.gen === 'prob' && i > 0 && opts.some((o) => num(o) <= 0)) problems.push('non-positive probability option');
        } catch (e) { problems.push(`step ${i + 1} error ${e.message}`); }
        for (const lang of ['ja', 'ko', 'en']) for (const part of ['text', 'explain', 'sum', 'note']) { if (!ch.steps[i][part]) continue; const t = ch.steps[i][part][lang].replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : key in answers ? answers[key] : key === 'answer' ? s.answer : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(t)) problems.push(`bad ${part}.${lang}: ${t}`); }
      });
      for (const lang of ['ja', 'ko', 'en']) { const t = ch.intro[lang].replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : m)); if (/\{[A-Za-z]\w*\}|undefined|NaN/.test(t)) problems.push('bad intro ' + t); }
      if (ch.figure) for (const v of Object.values(ch.figure)) { const f = String(v).replace(/\{(\w+)\}/g, (m, key) => (key in d ? d[key] : m)); if (/[{}]|undefined|NaN/.test(f)) problems.push('bad figure label ' + f); }
      if (problems.length) { bad++; seen[ch.id] = (seen[ch.id] || 0) + 1; if (seen[ch.id] <= 3) console.log('PROBLEM', ch.id, JSON.stringify(d).slice(0, 300), [...new Set(problems)].join('; ').slice(0, 240)); }
      distinct.add(JSON.stringify(d));
    }
    console.log(ch.id, 'distinct', distinct.size);
  }
}
for (const g of Object.keys(CHAINS)) if (!used.has(g)) { console.log('chain generator not used', g); bad++; }
fs.writeFileSync(new URL('./.covered-chains.json', import.meta.url), JSON.stringify([...(globalThis.__cov || [])]));
console.log('chains checked', total, 'problems', bad, JSON.stringify(seen));
