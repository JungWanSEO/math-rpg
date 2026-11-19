// 전투 무대: 캐릭터를 도형으로 그리고, 숫자를 시간에 따라 바꿔 움직입니다.
// 이미지 파일을 쓰지 않습니다. 새 몬스터는 draw 함수 하나를 추가하면 됩니다.
const W = 360;
const H = 230;

export function createStage(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = {
    idle: !calm,
    kind: 'twins',
    t: 0,
    shake: 0,
    guard: 0,
    parts: [],
    nums: [],
    events: [],
    hero: { x: 88, y: 148, lunge: 0, hit: 0, down: false },
    foe: { x: 264, y: 112, lunge: 0, hit: 0, dead: 0, gone: false, spawn: 0, spec: 0, flag: false },
  };

  const stars = [];
  for (let i = 0; i < 22; i++) stars.push([Math.random() * W, Math.random() * 150, Math.random() * 1.4 + 0.4]);

  // ---- 시간 예약, 조각, 숫자 ----
  function after(sec, fn) {
    S.events.push({ at: S.t + sec, fn });
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283;
      const s = 40 + Math.random() * 150;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
    }
  }
  function num(x, y, text, color) {
    S.nums.push({ x, y, text, color, life: 0.9 });
  }
  function dec(obj, key, dur, dt) {
    if (obj[key] > 0) {
      obj[key] -= dt / dur;
      if (obj[key] <= 0) {
        obj[key] = 0;
        return true;
      }
    }
    return false;
  }

  function update(dt) {
    S.t += dt;
    for (let i = S.events.length - 1; i >= 0; i--) {
      if (S.events[i].at <= S.t) {
        const fn = S.events[i].fn;
        S.events.splice(i, 1);
        fn();
      }
    }
    dec(S.hero, 'lunge', 0.45, dt);
    dec(S.hero, 'hit', 0.4, dt);
    dec(S.foe, 'lunge', 0.45, dt);
    dec(S.foe, 'hit', 0.4, dt);
    dec(S.foe, 'spawn', 0.4, dt);
    if (dec(S.foe, 'spec', 0.8, dt)) S.foe.flag = !S.foe.flag;
    if (dec(S.foe, 'dead', 0.6, dt)) S.foe.gone = true;
    dec(S, 'guard', 0.7, dt);
    S.shake = Math.max(0, S.shake - dt * 24);
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      if (p.life <= 0) S.parts.splice(i, 1);
    }
    for (let i = S.nums.length - 1; i >= 0; i--) {
      const n = S.nums[i];
      n.y -= 34 * dt;
      n.life -= dt;
      if (n.life <= 0) S.nums.splice(i, 1);
    }
  }

  // ---- 도형 그리기 도구 ----
  let flash = false; // 맞았을 때 모든 색을 흰색으로 바꿉니다.
  const C = (color) => (flash ? '#ffffff' : color);

  function circ(x, y, r, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }
  function ell(x, y, rx, ry, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832);
    ctx.fill();
  }
  function poly(pts, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  function rrect(x, y, w, h, r, color) {
    ctx.fillStyle = C(color);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
  function line(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = C(color);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function blinking(phase) {
    return S.idle && (S.t + phase) % 3.4 < 0.13;
  }
  function eye(x, y, r, white, pupil, phase) {
    if (blinking(phase)) {
      line(x - r, y, x + r, y, '#1c2740', 2);
      return;
    }
    if (white) {
      circ(x, y, r, '#ffffff');
      circ(x + 1, y + 1, r * 0.5, pupil);
    } else {
      circ(x, y, r, pupil);
    }
  }
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  // ---- 캐릭터 ----
  function drawHero() {
    line(-36, -34, -36, 44, '#ffd24a', 3);
    circ(-36, -38, 5, '#f2a13b');
    ell(-10, 46, 9, 4, '#1e8f80');
    ell(10, 46, 9, 4, '#1e8f80');
    poly([0, -18, -30, 44, 30, 44], '#2bb8a3');
    poly([0, -4, -8, 14, 8, 14], '#e9fbf7');
    line(20, 16, 34, 20, '#ffd9a8', 5);
    ctx.fillStyle = C('#fff2c2');
    ctx.strokeStyle = C('#f2a13b');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(50, 22, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    line(50, 22, 62, 8, '#e5484d', 1.5);
    circ(0, -26, 16, '#ffd9a8');
    poly([-20, -36, 20, -36, 6, -62], '#f2a13b');
    rrect(-24, -38, 48, 5, 2, '#d9822b');
    eye(-6, -25, 2, false, '#1c2740', 0);
    eye(6, -25, 2, false, '#1c2740', 0);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -18);
    ctx.quadraticCurveTo(0, -14, 5, -18);
    ctx.stroke();
  }

  function drawTwin(x, y, body, horn, cosine, phase) {
    poly([x - 14, y - 20, x - 8, y - 36, x - 2, y - 22], horn);
    poly([x + 14, y - 20, x + 8, y - 36, x + 2, y - 22], horn);
    circ(x, y, 26, body);
    eye(x - 8, y - 8, 5, true, '#1c2740', phase);
    eye(x + 8, y - 8, 5, true, '#1c2740', phase);
    const s = cosine ? -1 : 1;
    ctx.strokeStyle = C('#ffffff');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 11);
    ctx.quadraticCurveTo(x - 8, y + 11 - 14 * s, x, y + 11);
    ctx.quadraticCurveTo(x + 8, y + 11 + 14 * s, x + 16, y + 11);
    ctx.stroke();
  }
  // 사코 쌍둥이: 고유 동작은 서로 자리 바꾸기
  function drawTwins(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const cur = f.flag ? 28 : -28;
    const ax = cur * (1 - 2 * ease(sp));
    const arc = Math.sin(sp * Math.PI);
    const bob = S.idle ? Math.sin(S.t * 3) * 3 : 0;
    drawTwin(-ax, bob + arc * 10, '#5aa9ff', '#3f86d9', true, 1.1);
    drawTwin(ax, -bob - arc * 22, '#ff7d8f', '#e25c70', false, 0);
  }
  // 부호 박쥐: 고유 동작은 날개의 플러스·마이너스 뒤집기
  function drawBat(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const swapped = f.flag !== sp > 0.5;
    const flap = S.idle ? 1 - 0.4 * (0.5 + 0.5 * Math.sin(S.t * 11)) : 1;
    ctx.save();
    ctx.scale(Math.max(0.04, Math.abs(Math.cos(sp * Math.PI))), 1);
    ctx.save();
    ctx.scale(1, flap);
    poly([-16, -4, -62, -24, -54, 6, -44, 2, -40, 18, -26, 10], '#6f55d6');
    poly([16, -4, 62, -24, 54, 6, 44, 2, 40, 18, 26, 10], '#6f55d6');
    const px = swapped ? 42 : -42;
    const mx = -px;
    line(px - 6, -8, px + 6, -8, '#ffffff', 3);
    line(px, -14, px, -2, '#ffffff', 3);
    line(mx - 6, -8, mx + 6, -8, '#ffffff', 3);
    ctx.restore();
    poly([-16, -14, -12, -32, -4, -18], '#9a7bff');
    poly([16, -14, 12, -32, 4, -18], '#9a7bff');
    circ(0, 0, 20, '#9a7bff');
    eye(-7, -4, 5, true, '#e5484d', 0.6);
    eye(7, -4, 5, true, '#e5484d', 0.6);
    ctx.strokeStyle = C('#1c2740');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.quadraticCurveTo(0, 14, 8, 8);
    ctx.stroke();
    poly([-4, 10, -2, 16, 0, 11], '#ffffff');
    poly([4, 10, 2, 16, 0, 11], '#ffffff');
    ctx.restore();
  }
  // 덜약분 골렘: 고유 동작은 6/8 ↔ 3/4 약분
  function drawGolem(f) {
    const sp = f.spec > 0 ? 1 - f.spec : 0;
    const reduced = f.flag !== sp > 0.5;
    const from = f.flag ? 0.72 : 1;
    const to = f.flag ? 1 : 0.72;
    const sc = (from + (to - from) * ease(sp)) * (1 + Math.sin(sp * Math.PI) * 0.16);
    ctx.save();
    ctx.translate(0, 45);
    ctx.scale(sc, sc);
    ctx.translate(0, -45);
    rrect(-46, -20, 14, 30, 4, '#a37a45');
    rrect(32, -20, 14, 30, 4, '#a37a45');
    rrect(-28, -48, 56, 34, 4, '#d9b57c');
    rrect(-36, -12, 72, 7, 2, '#6b4a2b');
    rrect(-28, -3, 56, 38, 4, '#b58a52');
    rrect(-24, 35, 18, 10, 3, '#8a6537');
    rrect(6, 35, 18, 10, 3, '#8a6537');
    eye(-12, -38, 3, false, '#1c2740', 1.7);
    eye(12, -38, 3, false, '#1c2740', 1.7);
    ctx.fillStyle = C('#3b2a17');
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(reduced ? '3' : '6', 0, -23);
    ctx.fillText(reduced ? '4' : '8', 0, 17);
    ctx.restore();
  }
  const FOE_DRAW = { twins: drawTwins, bat: drawBat, golem: drawGolem };

  // 대기·공격·피격을 위치와 크기로 바꾼 값
  function pose(actor, dirX, dirY, amp, phase) {
    const p = { ox: 0, oy: 0, sx: 1, sy: 1, a: 1 };
    if (S.idle) {
      const w = Math.sin(S.t * 2.2 + phase);
      p.oy += w * amp;
      p.sy *= 1 + w * 0.03;
      p.sx *= 1 - w * 0.02;
    }
    if (actor.lunge > 0) {
      const k = Math.sin((1 - actor.lunge) * Math.PI);
      p.ox += k * dirX;
      p.oy += k * dirY;
    }
    if (actor.hit > 0) p.ox += Math.sin(actor.hit * 42) * 7 * actor.hit;
    return p;
  }

  function draw() {
    const h = S.hero;
    const f = S.foe;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);

    ctx.fillStyle = '#14224a';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      ctx.fillStyle = `rgba(167,221,255,${0.35 + 0.25 * Math.sin(S.t * 1.5 + i)})`;
      ctx.fillRect(st[0], st[1], st[2], st[2]);
    }
    ctx.fillStyle = '#1b2d5c';
    ctx.fillRect(20, 110, 26, 90);
    ctx.fillRect(150, 86, 22, 114);
    ctx.fillRect(316, 122, 30, 78);
    poly([20, 110, 33, 92, 46, 110], '#1b2d5c');
    poly([150, 86, 161, 68, 172, 86], '#1b2d5c');
    poly([316, 122, 331, 104, 346, 122], '#1b2d5c');
    ctx.fillStyle = '#0f1a3a';
    ctx.fillRect(-10, 190, W + 20, 60);

    ell(h.x, h.y + 50, 34, 6, '#0b1430');
    if (!f.gone) ell(f.x, 180, 44, 7, '#0b1430');

    if (h.lunge > 0.3 && h.lunge < 0.75) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      line(h.x + 70, h.y - 40, f.x - 30, f.y, '#ffc857', 2);
      ctx.restore();
    }

    const ph = pose(h, 78, -24, 3, 0);
    if (h.down) {
      ph.sy *= 0.55;
      ph.a = 0.6;
    }
    ctx.save();
    ctx.globalAlpha = ph.a;
    ctx.translate(h.x + ph.ox, h.y + ph.oy + 46);
    ctx.scale(ph.sx, ph.sy);
    ctx.translate(0, -46);
    flash = h.hit > 0.6;
    drawHero();
    flash = false;
    ctx.restore();

    if (S.guard > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.guard * 1.5);
      ctx.strokeStyle = '#2fd9b9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x + 20, h.y, 62, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    }

    if (!f.gone) {
      const pf = pose(f, -84, 30, S.kind === 'bat' ? 7 : 4, 1.3);
      if (f.dead > 0) {
        const p = 1 - f.dead;
        pf.sy *= 1 - 0.8 * p;
        pf.sx *= 1 + 0.3 * p;
        pf.a = 1 - p;
      } else if (f.spawn > 0) {
        pf.a = 1 - f.spawn;
        pf.sy *= 0.6 + 0.4 * (1 - f.spawn);
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, pf.a);
      ctx.translate(f.x + pf.ox, f.y + pf.oy + 45);
      ctx.scale(pf.sx, pf.sy);
      ctx.translate(0, -45);
      flash = f.hit > 0.6;
      (FOE_DRAW[S.kind] || drawTwins)(f);
      flash = false;
      ctx.restore();
    }

    for (const p of S.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of S.nums) {
      ctx.globalAlpha = Math.min(1, n.life * 2.5);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  draw();
  requestAnimationFrame(loop);

  // ---- 전투 규칙(battle.js)이 부르는 동작 ----
  return {
    // 새 적 등장
    setFoe(kind) {
      S.kind = kind;
      Object.assign(S.foe, { lunge: 0, hit: 0, dead: 0, gone: false, spawn: 1, spec: 0, flag: false });
    },
    heroUp() {
      S.hero.down = false;
    },
    heroDown() {
      S.hero.down = true;
    },
    // 정답: 주인공이 공격
    heroAttack(text, strong, done) {
      S.hero.lunge = 1;
      after(0.2, () => {
        S.foe.hit = 1;
        S.shake = strong ? 10 : 6;
        burst(S.foe.x, S.foe.y, '#8ff0ff', strong ? 28 : 16);
        num(S.foe.x, S.foe.y - 58, text, '#ffc857');
      });
      after(0.6, done);
    },
    // 오답: 공격이 빗나감
    heroMiss(text, done) {
      S.hero.hit = 0.5;
      num(S.foe.x, S.foe.y - 58, text, '#a9c0e6');
      after(0.6, done);
    },
    // 필살기
    heroUlt(text, done) {
      S.hero.lunge = 1;
      after(0.2, () => {
        S.foe.hit = 1;
        S.shake = 14;
        burst(S.foe.x, S.foe.y, '#ffc857', 36);
        burst(S.foe.x, S.foe.y, '#8ff0ff', 24);
        num(S.foe.x, S.foe.y - 58, text, '#ffc857');
      });
      after(0.75, done);
    },
    // 적의 공격. guarded 이면 방어막이 보입니다.
    foeAttack(text, guarded, done) {
      S.foe.lunge = 1;
      if (guarded) S.guard = 1;
      after(0.2, () => {
        S.hero.hit = guarded ? 0.5 : 1;
        S.shake = guarded ? 3 : 8;
        burst(S.hero.x, S.hero.y - 10, guarded ? '#2fd9b9' : '#ff7d8f', guarded ? 8 : 16);
        num(S.hero.x, S.hero.y - 80, text, '#ff7d8f');
      });
      after(0.65, done);
    },
    // 몬스터 고유 동작 (강한 공격 예고에 씁니다)
    foeSpecial() {
      if (!S.foe.gone && S.foe.dead === 0) S.foe.spec = 1;
    },
    // 적이 쓰러짐
    foeDefeat(done) {
      S.foe.dead = 1;
      after(0.2, () => {
        burst(S.foe.x, S.foe.y, '#ffc857', 34);
        S.shake = 5;
      });
      after(0.9, done);
    },
  };
}
