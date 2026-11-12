/* boss.js — HANIWA CORAZZATO (boss livello 1), 3 fasi con segnali leggibili (telegraph). */
'use strict';
(function () {
  const W = () => J.world;
  const E = () => J.ent;
  const sfx = (n) => J.audio.play(n);

  function make(cfg) {
    return {
      isBoss: true, name: cfg.name, x: cfg.x, y: W().level.groundY, vx: 0, vy: 0, w: 170, h: 430, hp: cfg.hp, maxHp: cfg.hp,
      face: -1, state: 'intro', at: 0, st: 0, alive: true, active: false, phase: 1, inv: 0, flash: 0, grav: 2800,
      armRaise: 0, punch: 0, eyeGlow: 0, mouthGlow: 0, animT: 0, anim: 'idle', giant: true, onGround: true,
      def: { score: 5000, scale: 4.3 }, lastMove: '', deadT: 0,
    };
  }

  function phaseOf(b) { const r = b.hp / b.maxHp; return r > 0.66 ? 1 : r > 0.33 ? 2 : 3; }

  function damage(b, dmg, dir, heavy, fx, fy, beam) {
    if (!b.alive || b.state === 'intro' || b.state === 'roar') { if (b.alive) { E().sparks(fx, fy, 6, '#9fd8ff', 300, 3); } return; }
    if (b.inv > 0 && !beam) return;
    const mult = b.state === 'stun' ? 1.6 : 1;
    b.hp -= dmg * mult; b.flash = 0.1; b.inv = beam ? 0 : 0.08;
    E().hitStar(fx, fy, 40); E().sparks(fx, fy, 10, '#fff6b0', 520, 5); sfx('enemyHit');
    if (mult > 1) E().floatText(fx, fy - 40, 'CRITICO!', '#ff6a3a', 30);
    if (b.hp <= 0) { b.hp = 0; die(b); return; }
    const ph = phaseOf(b);
    if (ph > b.phase) {
      b.phase = ph; b.state = 'roar'; b.at = 0; b.vx = 0; b.armRaise = 1; b.eyeGlow = 1;
      sfx('bossWarn'); J.game.shake(14);
      J.game.msg(ph === 2 ? 'FASE 2 — il boss usa il cannone della bocca!' : 'FASE 3 — furia del Haniwa corazzato: carica e onde d\'urto!', 3);
      E().particle({ kind: 'ring', x: b.x, y: b.y - b.h * 0.5, life: 0.7, size: 420, col: '#ffcf5a' });
      // respinge il giocatore
      const p = W().player; p.vx = (p.x < b.x ? -1 : 1) * 600; p.vy = -500; p.onGround = false;
    }
  }

  function die(b) {
    const w = W();
    b.alive = false; b.state = 'dying'; b.deadT = 0; b.vx = 0;
    w.score += b.def.score; sfx('explode'); J.game.shake(20);
    J.game.onBossDefeated();
  }

  function choose(b, p) {
    const dist = Math.abs(p.x - b.x);
    const opts = [];
    if (dist < 330) opts.push('slam', 'slam');
    if (b.phase >= 2) opts.push('shoot');
    if (b.phase >= 3) opts.push('charge', 'jump');
    if (b.phase === 1 && dist >= 330) opts.push('walk', 'walk', 'hop');
    if (b.phase >= 2 && dist >= 330) opts.push('walk');
    let pick = opts[Math.floor(Math.random() * opts.length)];
    if (pick === b.lastMove && opts.length > 1 && pick !== 'slam') pick = opts[(opts.indexOf(pick) + 1) % opts.length];
    b.lastMove = pick;
    b.at = 0;
    switch (pick) {
      case 'slam': b.state = 'slamWind'; sfx('telegraph'); break;
      case 'shoot': b.state = 'shootWind'; sfx('telegraph'); break;
      case 'charge': b.state = 'chargeWind'; sfx('bossWarn'); break;
      case 'jump': b.state = 'jumpWind'; sfx('telegraph'); break;
      case 'hop': b.state = 'hop'; b.vy = -900; b.vx = -b.face * 350; b.onGround = false; break;
      default: b.state = 'walk'; b.st = 0.9 + Math.random() * 0.6;
    }
  }

  function update(b, dt) {
    const w = W(); const p = w.player; const lv = w.level;
    b.animT += dt; b.at += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
    if (b.state === 'dying') {
      b.deadT += dt;
      if (Math.random() < 0.25) { E().explosion(b.x + E().rnd(-90, 90), b.y - E().rnd(40, 400), 2.2); sfx('explode'); }
      return;
    }
    if (!b.active) return;
    const speedK = b.phase === 3 ? 1.35 : 1;
    const dx = p.x - b.x;
    const turn = () => { b.face = dx > 0 ? 1 : -1; };
    switch (b.state) {
      case 'intro': b.vx = 0; if (b.at > 2.2) { b.state = 'idle'; b.at = 0; } break;
      case 'roar': b.vx = 0; b.armRaise = 1; if (b.at > 1.1) { b.state = 'idle'; b.at = 0; b.armRaise = 0; b.eyeGlow = 0; } break;
      case 'idle': {
        turn(); b.vx = 0; b.anim = 'idle';
        const wait = b.phase === 1 ? 0.75 : b.phase === 2 ? 0.55 : 0.35;
        if (b.at > wait && p.state !== 'dead') choose(b, p);
        break;
      }
      case 'walk':
        turn(); b.anim = 'walk'; b.vx = b.face * 160 * speedK;
        if (Math.abs(dx) < 280 || b.at > b.st) { b.state = 'idle'; b.at = b.phase === 1 ? 0.3 : 0.5; }
        break;
      case 'hop': b.anim = 'idle'; if (b.onGround && b.at > 0.2) { b.vx = 0; b.state = 'idle'; b.at = 0; E().dust(b.x, b.y, 10, 3); sfx('slam'); J.game.shake(6); } break;
      case 'slamWind': {
        b.vx = 0; b.anim = 'windup';
        const wt = b.phase === 3 ? 0.5 : 0.75;
        b.armRaise = Math.min(1, b.at / wt); b.eyeGlow = 1;
        if (b.at >= wt) { b.state = 'slam'; b.at = 0; b.hitDone = false; }
        break;
      }
      case 'slam': {
        b.anim = 'attack'; b.armRaise = Math.max(0, 1 - b.at / 0.1); b.punch = Math.min(1, b.at / 0.08);
        if (b.at > 0.06 && !b.hitDone) {
          b.hitDone = true; sfx('slam'); J.game.shake(12);
          const reach = 300;
          const hb = { x0: b.face > 0 ? b.x : b.x - reach, x1: b.face > 0 ? b.x + reach : b.x, y0: b.y - 330, y1: b.y };
          E().dust(b.x + b.face * 240, b.y, 12, 3);
          if (E().overlap(hb, E().box(p))) E().hurtPlayer(p, 22, b.x);
          if (b.phase >= 2) spawnShock(b, b.face, b.x + b.face * 260);
        }
        if (b.at > 0.75) { b.state = 'idle'; b.at = 0; b.punch = 0; b.eyeGlow = 0; }
        break;
      }
      case 'shootWind': {
        turn(); b.vx = 0; b.anim = 'windup';
        const wt = 0.85; b.mouthGlow = Math.min(1, b.at / wt);
        if (b.at >= wt) { b.state = 'shoot'; b.at = 0; b.shots = b.phase === 3 ? 5 : 3; b.shotT = 0; }
        break;
      }
      case 'shoot':
        b.anim = 'attack'; b.shotT -= dt;
        if (b.shotT <= 0 && b.shots > 0) {
          b.shots--; b.shotT = 0.22;
          const spread = (b.phase === 3 ? 5 : 3) - b.shots;
          const tx = p.x + (spread - 2) * 160;
          const T = 1.0; const vx = (tx - b.x) / T;
          W().projectiles.push({ kind: 'bossOrb', x: b.x + b.face * 60, y: b.y - b.h * 0.86, vx, vy: -1050, grav: 2100, r: 30, dmg: 15, life: 4 });
          sfx('shooter');
        }
        if (b.shots <= 0 && b.shotT <= 0) { b.state = 'idle'; b.at = 0; b.mouthGlow = 0; }
        break;
      case 'chargeWind':
        turn(); b.vx = -b.face * 30; b.anim = 'windup'; b.eyeGlow = 1;
        if (Math.random() < 0.5) E().particle({ kind: 'dust', x: b.x - b.face * 60, y: b.y - 20, vx: -b.face * 200, vy: -80, life: 0.5, size: 14, col: '#eeeeee' });
        if (b.at > 0.85) { b.state = 'charge'; b.at = 0; b.hitDone = false; sfx('whoosh'); }
        break;
      case 'charge':
        b.anim = 'walk'; b.vx = b.face * 980;
        if (Math.random() < 0.6) E().dust(b.x - b.face * 60, b.y, 2, 3);
        if (!b.hitDone && E().overlap(E().box(b), E().box(p))) { b.hitDone = true; E().hurtPlayer(p, 25, b.x); }
        if (b.x <= lv.arena.x0 + b.w / 2 + 5 || b.x >= lv.arena.x1 - b.w / 2 - 5 || b.at > 2.2) {
          b.state = 'stun'; b.at = 0; b.vx = 0; sfx('slam'); J.game.shake(16); E().sparks(b.x + b.face * 80, b.y - 200, 20, '#ffd34a', 600, 5);
          J.game.msg('Il boss è stordito: colpiscilo ora! (danni x1.6)', 2);
        }
        break;
      case 'stun': b.vx = 0; b.anim = 'idle'; b.eyeGlow = 0; if (b.at > 1.4) { b.state = 'idle'; b.at = 0; } break;
      case 'jumpWind': turn(); b.vx = 0; b.anim = 'windup'; b.armRaise = Math.min(1, b.at / 0.6); if (b.at > 0.6) { b.state = 'jump'; b.at = 0; b.vy = -1500; b.vx = (dx) * 0.9; b.onGround = false; } break;
      case 'jump':
        b.anim = 'idle'; b.armRaise = 1;
        if (b.onGround && b.at > 0.15) {
          b.state = 'idle'; b.at = -0.3; b.vx = 0; b.armRaise = 0; sfx('slam'); J.game.shake(18);
          E().dust(b.x, b.y, 20, 3.5); spawnShock(b, -1, b.x - 120); spawnShock(b, 1, b.x + 120);
          if (E().overlap({ x0: b.x - 160, x1: b.x + 160, y0: b.y - 120, y1: b.y }, E().box(p))) E().hurtPlayer(p, 20, b.x);
        }
        break;
    }
    E().moveAndCollide(b, dt, { minX: lv.arena.x0, maxX: lv.arena.x1 });
    if (p.state !== 'dead' && b.state !== 'intro' && b.state !== 'charge' && E().overlap(E().box(b), E().box(p))) E().hurtPlayer(p, 12, b.x);
  }

  function spawnShock(b, dir, x) {
    W().projectiles.push({ kind: 'shock', x, y: W().level.groundY, vx: dir * 620, vy: 0, grav: 0, w: 70, h: 120, r: 30, dmg: 18, life: 1.8 });
  }

  function draw(b, t) {
    const g = J.g;
    if (b.state === 'dying' && b.deadT > 2.4) return;
    g.save(); g.translate(b.x, b.y);
    if (b.state === 'dying') { g.translate(Math.sin(t * 60) * 6, b.deadT * 30); g.globalAlpha = Math.max(0, 1 - b.deadT / 2.4); }
    if (b.state === 'stun') g.rotate(Math.sin(t * 20) * 0.03);
    g.fillStyle = 'rgba(20,10,30,0.3)'; g.beginPath(); g.ellipse(0, 0, 130, 18, 0, 0, 7); g.fill();
    if (b.flash > 0 && 'filter' in g) g.filter = 'brightness(2.4)';
    g.scale(b.face * b.def.scale, b.def.scale);
    const phaseCol = b.phase === 1 ? '#e2412c' : b.phase === 2 ? '#ff8a1c' : '#ff2adf';
    J.spr.drawHaniwaGiant(b.animT, { anim: b.anim, at: b.at, armRaise: b.armRaise, punch: b.punch, eyeGlow: b.eyeGlow, mouthGlow: b.mouthGlow }, 'boss', phaseCol);
    if ('filter' in g) g.filter = 'none';
    g.restore();
    // telegraph
    if (['slamWind', 'shootWind', 'chargeWind', 'jumpWind'].includes(b.state)) {
      const S = J.spr; g.save(); g.translate(b.x, b.y - b.h - 60); g.scale(3, 3);
      if (Math.floor(t * 10) % 2 === 0) { S.poly([-8, -22, 8, -22, 3.5, 0, -3.5, 0], b.state === 'chargeWind' ? '#ff4a2a' : '#ffdf3a', 2); S.circ(0, 8, 4, b.state === 'chargeWind' ? '#ff4a2a' : '#ffdf3a', 2); }
      g.restore();
      if (b.state === 'slamWind') { g.globalAlpha = 0.18 + 0.12 * Math.sin(t * 30); g.fillStyle = '#ff3a2a'; g.fillRect(b.face > 0 ? b.x : b.x - 300, b.y - 330, 300, 330); g.globalAlpha = 1; }
      if (b.state === 'chargeWind') { g.globalAlpha = 0.15; g.fillStyle = '#ff3a2a'; g.fillRect(b.face > 0 ? b.x : W().level.arena.x0, b.y - 300, b.face > 0 ? W().level.arena.x1 - b.x : b.x - W().level.arena.x0, 300); g.globalAlpha = 1; }
    }
    if (b.state === 'stun') { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; J.spr.circ(b.x + Math.cos(a) * 70, b.y - b.h - 20 + Math.sin(a) * 18, 9, '#ffe14a', 2); } }
  }

  J.boss = { make, update, draw, damage };
})();
