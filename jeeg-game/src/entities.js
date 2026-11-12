/* entities.js — giocatore, nemici, boss, proiettili, particelle, collisioni. */
'use strict';
(function () {
  const W = () => J.world;
  const F = J.FORMS;
  const sfx = (n) => J.audio.play(n);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------------- collisioni ---------------- */
  function box(e) { return { x0: e.x - e.w / 2, y0: e.y - e.h, x1: e.x + e.w / 2, y1: e.y }; }
  function overlap(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }

  function moveAndCollide(e, dt, opts) {
    opts = opts || {};
    const w = W(); const lv = w.level; const gy = lv.groundY;
    const prevY = e.y;
    // asse X
    e.x += e.vx * dt;
    for (const p of lv.platforms) {
      if (p.oneWay) continue;
      const b = box(e);
      if (b.x1 > p.x && b.x0 < p.x + p.w && b.y1 > p.y + 1 && b.y0 < p.y + p.h) {
        // gradino automatico per i giganti
        if (opts.step && e.y - p.y <= opts.step && e.onGround) { e.y = p.y; continue; }
        if (e.vx > 0 || (e.x < p.x + p.w / 2)) e.x = p.x - e.w / 2; else e.x = p.x + p.w + e.w / 2;
        e.hitWall = true;
      }
    }
    if (opts.minX != null) e.x = Math.max(opts.minX + e.w / 2, e.x);
    if (opts.maxX != null) e.x = Math.min(opts.maxX - e.w / 2, e.x);
    // asse Y
    e.vy += (e.grav || 1800) * dt;
    if (e.vy > 2400) e.vy = 2400;
    e.y += e.vy * dt;
    const wasGround = e.onGround; e.onGround = false;
    if (e.y >= gy) { e.y = gy; e.vy = 0; e.onGround = true; }
    for (const p of lv.platforms) {
      const b = box(e);
      if (b.x1 <= p.x + 2 || b.x0 >= p.x + p.w - 2) continue;
      if (p.oneWay) {
        if (e.vy >= 0 && prevY <= p.y + 0.5 && e.y >= p.y && !(e.dropT > 0)) { e.y = p.y; e.vy = 0; e.onGround = true; }
      } else if (b.y1 > p.y && b.y0 < p.y + p.h) {
        if (e.vy >= 0 && prevY <= p.y + 8) { e.y = p.y; e.vy = 0; e.onGround = true; }
        else if (e.vy < 0) { e.y = p.y + p.h + e.h; e.vy = 0; }
      }
    }
    if (!wasGround && e.onGround && e.landFx) e.landFx();
  }

  /* ---------------- particelle ---------------- */
  function particle(o) { W().particles.push(Object.assign({ vx: 0, vy: 0, life: 0.5, t: 0, g: 0, size: 4, col: '#fff' }, o)); }
  function sparks(x, y, n, col, speed, size) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * (speed || 300); particle({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.2, 0.45), col: col || '#fff6b0', size: size || 3 }); }
  }
  function hitStar(x, y, s) { particle({ kind: 'star', x, y, life: 0.18, size: s || 18, col: '#ffffff' }); }
  function dust(x, y, n, s) { for (let i = 0; i < n; i++) particle({ kind: 'dust', x: x + rnd(-10, 10) * s, y, vx: rnd(-80, 80) * s, vy: rnd(-60, -10) * s, life: rnd(0.35, 0.7), size: rnd(5, 9) * s, col: '#d8c8a8' }); }
  function shards(x, y, n, s, col) { for (let i = 0; i < n; i++) particle({ kind: 'shard', x, y, vx: rnd(-260, 260) * s, vy: rnd(-520, -120) * s, g: 1600 * s, life: rnd(0.6, 1.1), size: rnd(4, 9) * s, col: col || '#c7774a', rot: rnd(0, 6), vr: rnd(-10, 10) }); }
  function explosion(x, y, s) { particle({ kind: 'explo', x, y, life: 0.6, size: 60 * s }); sparks(x, y, 14, '#ffd34a', 500 * s, 4 * s); }
  function floatText(x, y, text, col, size) { particle({ kind: 'text', x, y, vy: -60, life: 0.9, text, col: col || '#fff', size: size || 18 }); }

  /* ---------------- GIOCATORE ---------------- */
  function makePlayer(x, form) {
    const f = F[form];
    return {
      x, y: W().level.groundY, vx: 0, vy: 0, w: f.w, h: f.h, grav: f.grav, face: 1, form,
      onGround: true, hp: f.hp, en: 100, beam: 'gamma', state: 'normal', anim: 'idle', animT: 0,
      atk: null, comboQueued: false, inv: 0, hurtT: 0, coyote: 0, beamT: 0, beamTick: 0, deadT: 0, dropT: 0,
      landFx() { if (this.form === 'jeeg') { dust(this.x, this.y, 10, 2.5); J.game.shake(6); sfx('slam'); } else { dust(this.x, this.y, 4, 1); sfx('land'); } },
    };
  }
  function setForm(p, form) {
    const f = F[form]; p.form = form; p.w = f.w; p.h = f.h; p.grav = f.grav;
  }

  function attackBox(p) {
    const f = F[p.form];
    const a = p.atk; const kick = a.kind === 'kick' || a.kind === 'airkick';
    const reach = f.reach * (kick ? 1.35 : 1);
    const x0 = p.face > 0 ? p.x + p.w * 0.2 : p.x - p.w * 0.2 - reach - p.w * 0.3;
    const y0 = p.y - p.h * (kick ? 0.6 : 0.82), y1 = p.y - p.h * (kick ? 0.1 : 0.45);
    return { x0, x1: x0 + reach + p.w * 0.3, y0, y1 };
  }

  function updatePlayer(p, dt) {
    const w = W(); const inp = J.input; const f = F[p.form]; const act = inp.actions;
    p.animT += dt; p.inv = Math.max(0, p.inv - dt); p.dropT = Math.max(0, p.dropT - dt);
    if (p.state === 'dead') { p.deadT += dt; p.vx = 0; moveAndCollide(p, dt); return; }
    const control = !w.scene;
    let move = 0;
    if (control) move = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);

    // cambio raggio (selettore contestuale)
    if (control && inp.pressed.SEL) {
      p.beam = p.beam === 'gamma' ? 'proton' : 'gamma'; sfx('select');
      J.game.msg(p.beam === 'gamma' ? 'RAGGIO GAMMA selezionato (' + J.GAME_CONFIG.special_cost.gamma + ' EN)' : 'RAGGIO PROTONICO selezionato (' + J.GAME_CONFIG.special_cost.proton + ' EN)');
    }
    // trasformazione manuale (pulsante dedicato, non A+B)
    if (control && inp.pressed.T) J.game.tryTransform();

    if (p.state === 'hurt') {
      p.hurtT -= dt; if (p.hurtT <= 0) p.state = 'normal';
      p.vx *= 0.9;
    } else if (p.state === 'beam') {
      p.vx = 0; p.beamT -= dt; updateBeam(p, dt);
      if (p.beamT <= 0) { p.state = 'normal'; p.beamActive = null; }
    } else if (p.state === 'attack') {
      const a = p.atk; a.t += dt;
      if (control && act.attack && a.t > a.dur * 0.35 && a.kind !== 'kick' && a.kind !== 'airkick') p.comboQueued = true;
      const active = a.t >= a.on && a.t <= a.off;
      if (active) meleeHits(p);
      if (p.onGround) p.vx = move * f.speed * 0.25 + (a.kind === 'kick' ? p.face * 40 : 0); else p.vx = move * f.speed * 0.8;
      if (a.t >= a.dur) {
        if (p.comboQueued && p.onGround) { startAttack(p, a.step + 1); }
        else { p.state = 'normal'; p.atk = null; }
      }
      if (p.atk && p.atk.kind === 'airkick' && p.onGround) { p.state = 'normal'; p.atk = null; }
    } else {
      p.vx = move * f.speed;
      if (move) p.face = move;
      if (p.onGround) p.coyote = 0.09; else p.coyote -= dt;
      if (control) {
        if (act.beam) tryBeam(p);
        else if (act.attack) startAttack(p, 0);
        else if (act.jump) {
          if (inp.held.down && p.onGround && onOneWay(p)) { p.dropT = 0.25; p.onGround = false; p.y += 2; }
          else if (p.coyote > 0) { p.jumpT = 0; p.vy = -f.jump; p.onGround = false; p.coyote = 0; sfx('jump'); if (p.form === 'jeeg') dust(p.x, p.y, 6, 2.5); }
        }
      }
      // salto variabile
      p.jumpT = (p.jumpT || 0) + dt;
      if (!inp.held.B && p.jumpT > 0.09 && p.vy < -f.jump * 0.45 && !p.onGround) p.vy = -f.jump * 0.45;
    }

    // limiti: cancello dei giganti per le forme non-Jeeg, arena del boss
    const lv = w.level;
    let maxX = lv.worldW, minX = 0;
    if (p.form !== 'jeeg') maxX = lv.giantGateX;
    if (w.arenaLocked) { minX = lv.arena.x0; maxX = lv.arena.x1; }
    moveAndCollide(p, dt, { minX, maxX, step: p.form === 'jeeg' ? 140 : 0 });
    if (p.form !== 'jeeg' && p.x >= lv.giantGateX - p.w / 2 - 2 && !w.gateWarned) { w.gateWarned = true; J.game.msg('Gli Haniwa giganti sono troppo forti per un uomo! ' + (w.gloves ? 'TRASFORMATI IN JEEG!' : 'Trova i guanti!'), 4); }
    if (p.form !== 'jeeg' && p.x < lv.giantGateX - 200) w.gateWarned = false;

    // animazione
    if (p.state === 'attack') p.anim = p.atk.kind;
    else if (p.state === 'hurt') p.anim = 'hurt';
    else if (p.state === 'beam') p.anim = 'beam';
    else if (!p.onGround) p.anim = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 5) p.anim = 'run';
    else p.anim = 'idle';
  }
  function onOneWay(p) { return W().level.platforms.some((q) => q.oneWay && Math.abs(p.y - q.y) < 1 && p.x > q.x && p.x < q.x + q.w); }

  function startAttack(p, step) {
    p.comboQueued = false;
    const air = !p.onGround;
    const kind = air ? 'airkick' : step === 0 ? 'punch' : step === 1 ? 'punch2' : 'kick';
    const durs = { punch: 0.24, punch2: 0.24, kick: 0.36, airkick: 0.42 };
    const speedK = p.form === 'jeeg' ? 1.15 : 1;
    p.atk = { kind, step: air ? 0 : step % 3, t: 0, dur: durs[kind] * speedK, on: 0.05 * speedK, off: (kind === 'kick' ? 0.2 : kind === 'airkick' ? 0.34 : 0.14) * speedK, hit: new Set() };
    p.state = 'attack'; p.animT = 0;
    sfx('whoosh');
  }

  function meleeHits(p) {
    const w = W(); const a = p.atk; const hb = attackBox(p); const f = F[p.form];
    const dmg = a.kind === 'kick' || a.kind === 'airkick' ? f.dmg[2] : f.dmg[a.step] || f.dmg[0];
    const heavy = a.kind === 'kick' || a.kind === 'airkick';
    const targets = w.enemies.concat(w.boss && w.boss.active ? [w.boss] : []);
    for (const e of targets) {
      if (!e.alive || a.hit.has(e)) continue;
      if (e.giant && p.form !== 'jeeg') continue; // l'umano non raggiunge i giganti (cancello)
      if (overlap(hb, box(e))) {
        a.hit.add(e);
        damageEnemy(e, dmg, p.face, heavy, (hb.x0 + hb.x1) / 2 + p.face * 10, (hb.y0 + hb.y1) / 2);
        sfx(heavy ? 'kick' : 'punch');
        J.game.hitstop(heavy ? 0.06 : 0.035);
      }
    }
  }

  function tryBeam(p) {
    const cost = J.GAME_CONFIG.special_cost[p.beam];
    if (p.form !== 'jeeg') { sfx('denied'); J.game.msg(p.form === 'human' ? 'A+B: i raggi sono disponibili solo con JEEG completo' : 'A+B: prima completa il BUILD UP con il Big Shooter (T)'); return; }
    if (p.en < cost) { sfx('denied'); J.game.msg('Energia insufficiente per il raggio ' + (p.beam === 'gamma' ? 'GAMMA' : 'PROTONICO') + ' (' + cost + ' EN)'); return; }
    p.en -= cost; p.state = 'beam'; p.animT = 0;
    p.beamT = p.beam === 'gamma' ? 0.75 : 0.95; p.beamTick = 0;
    p.beamActive = { kind: p.beam, t: 0, hit: new Map() };
    sfx(p.beam === 'gamma' ? 'gamma' : 'proton');
    J.game.msg(p.beam === 'gamma' ? 'RAGGIO GAMMA!' : 'RAGGIO PROTONICO!', 1.2);
    J.game.shake(p.beam === 'gamma' ? 5 : 9);
  }
  function beamGeom(p) {
    const b = p.beamActive; const gamma = b.kind === 'gamma';
    const ox = p.x + p.face * p.w * 0.45;
    const oy = gamma ? p.y - p.h * 0.66 : p.y - p.h * 0.93;
    const len = gamma ? 1150 : 1500, half = gamma ? 42 : 70;
    return { ox, oy, len, half, x0: p.face > 0 ? ox : ox - len, x1: p.face > 0 ? ox + len : ox, y0: oy - half, y1: oy + half + (gamma ? 0 : 140) };
  }
  function updateBeam(p, dt) {
    const w = W(); const b = p.beamActive; b.t += dt;
    if (b.t < 0.12) return; // carica
    p.beamTick -= dt; if (p.beamTick > 0) return;
    p.beamTick = 0.1;
    const G = beamGeom(p); const dmg = b.kind === 'gamma' ? 1.3 : 2.7;
    const targets = w.enemies.concat(w.boss && w.boss.active ? [w.boss] : []);
    for (const e of targets) {
      if (!e.alive) continue;
      if (overlap(G, box(e))) { damageEnemy(e, dmg, p.face, true, e.x - p.face * e.w * 0.3, G.oy, true); }
    }
    for (const pr of w.projectiles) if (pr.x > G.x0 && pr.x < G.x1 && pr.y > G.y0 - 20 && pr.y < G.y1) { pr.dead = true; sparks(pr.x, pr.y, 6, '#ffd34a', 200, 3); }
  }

  function hurtPlayer(p, dmg, fromX) {
    const w = W();
    if (p.inv > 0 || p.state === 'dead' || w.scene) return false;
    if (J.game.godMode) dmg = 0;
    p.hp = Math.max(0, p.hp - dmg);
    p.inv = 1.0; sfx('hurt'); J.game.shake(p.form === 'jeeg' ? 8 : 4);
    const dir = p.x < fromX ? -1 : 1;
    if (p.state !== 'beam') { p.state = 'hurt'; p.hurtT = 0.32; p.vx = dir * (p.form === 'jeeg' ? 380 : 260); p.vy = p.form === 'jeeg' ? -500 : -300; p.onGround = false; p.atk = null; }
    hitStar(p.x, p.y - p.h * 0.6, p.form === 'jeeg' ? 40 : 16);
    if (p.hp <= 0) { p.state = 'dead'; p.deadT = 0; p.anim = 'dead'; sfx('die'); J.game.onPlayerDeath(); }
    return true;
  }

  /* ---------------- NEMICI ---------------- */
  const ENEMY_DEF = {
    soldier: { w: 24, h: 80, hp: 3, speed: 75, chase: 125, score: 100, giant: false },
    lancer: { w: 24, h: 80, hp: 2, speed: 65, chase: 95, score: 150, giant: false },
    giant: { w: 100, h: 290, hp: 10, speed: 120, chase: 170, score: 500, giant: true, scale: 2.9 },
    giantShooter: { w: 100, h: 280, hp: 8, speed: 100, chase: 120, score: 600, giant: true, scale: 2.8 },
  };
  function makeEnemy(d) {
    const def = ENEMY_DEF[d.type];
    const e = {
      type: d.type, x: d.x, y: d.y || W().level.groundY, vx: 0, vy: 0, w: def.w, h: def.h, hp: def.hp, maxHp: def.hp,
      face: -1, state: 'patrol', st: rnd(0.5, 1.5), at: 0, anim: 'idle', animT: rnd(0, 3), alive: true, inv: 0, giant: def.giant,
      home: d.x, def, grav: def.giant ? 2600 : 1800, flash: 0, src: d, armRaise: 0, punch: 0, eyeGlow: 0, mouthGlow: 0,
    };
    if (d.ambushDrop) { e.y = W().level.groundY - 420; e.state = 'drop'; }
    if (d.y) e.plat = W().level.platforms.find((q) => Math.abs(q.y - d.y) < 2 && d.x > q.x && d.x < q.x + q.w);
    return e;
  }

  function damageEnemy(e, dmg, dir, heavy, fx, fy, beam) {
    const w = W();
    if (e.isBoss) return J.boss.damage(e, dmg, dir, heavy, fx, fy, beam);
    if (e.inv > 0 && !beam) return;
    e.hp -= dmg; e.flash = 0.12; e.inv = beam ? 0 : 0.05;
    hitStar(fx, fy, e.giant ? 34 : 16);
    sparks(fx, fy, e.giant ? 10 : 6, '#fff6b0', e.giant ? 500 : 260, e.giant ? 5 : 3);
    sfx('enemyHit');
    if (e.hp <= 0) { killEnemy(e, dir); return; }
    const canStagger = !e.giant || heavy || e.state !== 'attack';
    if (canStagger) {
      e.state = 'hurt'; e.st = e.giant ? 0.22 : 0.3; e.at = 0;
      e.vx = dir * (e.giant ? (heavy ? 260 : 120) : (heavy ? 340 : 170));
      if (heavy && !e.giant) { e.vy = -280; e.onGround = false; }
    }
  }
  function killEnemy(e, dir) {
    const w = W();
    e.alive = false; e.deadT = 0; e.vx = dir * (e.giant ? 120 : 260); e.vy = e.giant ? -200 : -380;
    w.score += e.def.score; w.kills++;
    floatText(e.x, e.y - e.h - 10, '+' + e.def.score, '#ffe14a', e.giant ? 34 : 16);
    if (e.giant) { explosion(e.x, e.y - e.h * 0.5, 2.6); shards(e.x, e.y - e.h * 0.5, 22, 2.6); sfx('explode'); J.game.shake(12); }
    else { shards(e.x, e.y - e.h * 0.5, 8, 1, '#dcd3ea'); sfx('enemyDie'); }
  }

  function updateEnemy(e, dt) {
    const w = W(); const p = w.player;
    e.animT += dt; e.flash = Math.max(0, e.flash - dt); e.inv = Math.max(0, e.inv - dt);
    if (!e.alive) { e.deadT += dt; e.x += e.vx * dt; e.vy += 1800 * dt; e.y += e.vy * dt; return; }
    const dx = p.x - e.x, adx = Math.abs(dx);
    const viewRange = e.giant ? 1300 : 520;
    if (adx > 1900) { e.vx = 0; moveAndCollide(e, dt); return; } // inattivo fuori schermo
    // nemici piccoli contro Jeeg: vengono schiacciati
    if (!e.giant && p.form === 'jeeg' && p.state !== 'dead' && overlap(box(e), box(p))) { killEnemy(e, p.x < e.x ? 1 : -1); return; }
    const def = e.def;
    e.st -= dt; e.at += dt;
    switch (e.state) {
      case 'drop': e.vx = 0; if (e.onGround) { e.state = 'chase'; dust(e.x, e.y, 5, 1); } break;
      case 'hurt': e.vx *= 0.88; if (e.st <= 0) { e.state = 'chase'; e.st = 0.4; } break;
      case 'patrol':
        e.anim = 'walk';
        if (e.st <= 0) { e.face = -e.face; e.st = rnd(1.2, 2.2); }
        if (Math.abs(e.x - e.home) > 90) e.face = e.x > e.home ? -1 : 1;
        e.vx = e.face * def.speed;
        if (adx < viewRange && Math.abs(p.y - e.y) < (e.giant ? 500 : 160) && p.state !== 'dead' && (e.giant ? p.form === 'jeeg' : true)) { e.state = 'chase'; e.st = 0.3; }
        break;
      case 'chase': {
        e.face = dx > 0 ? 1 : -1;
        const ranged = e.type === 'lancer' || e.type === 'giantShooter';
        const ideal = e.type === 'lancer' ? 230 : e.type === 'giantShooter' ? 700 : e.giant ? 150 : 40;
        if (ranged) {
          if (adx < ideal - 60) e.vx = -e.face * def.chase; else if (adx > ideal + 80) e.vx = e.face * def.chase; else e.vx = 0;
          if (e.st <= 0 && adx < ideal + 300) { e.state = 'windup'; e.at = 0; e.vx = 0; sfx('telegraph'); }
        } else {
          e.vx = adx > ideal ? e.face * def.chase : 0;
          if (adx <= ideal + (e.giant ? 40 : 12) && e.st <= 0 && Math.abs(p.y - e.y) < e.h) { e.state = 'windup'; e.at = 0; e.vx = 0; sfx('telegraph'); }
        }
        e.anim = Math.abs(e.vx) > 1 ? 'walk' : 'idle';
        if (adx > viewRange * 1.6) e.state = 'patrol';
        break;
      }
      case 'windup': {
        e.vx = 0; e.anim = 'windup';
        const wt = e.type === 'lancer' ? 0.45 : e.giant ? 0.6 : 0.4;
        e.armRaise = Math.min(1, e.at / wt);
        if (e.type === 'giantShooter') e.mouthGlow = e.at / wt;
        e.eyeGlow = 1;
        if (e.at >= wt) { e.state = 'attack'; e.at = 0; e.hitDone = false; if (e.type === 'lancer') throwSpear(e); if (e.type === 'giantShooter') shootClay(e); }
        break;
      }
      case 'attack': {
        e.anim = 'attack'; e.vx = 0; e.armRaise = Math.max(0, 1 - e.at / 0.12); e.punch = Math.min(1, e.at / 0.08); e.mouthGlow = 0;
        if (!e.hitDone && (e.type === 'soldier' || e.type === 'giant') && e.at > 0.04 && e.at < 0.2) {
          const reach = e.giant ? 200 : 46;
          const hb = { x0: e.face > 0 ? e.x : e.x - reach, x1: e.face > 0 ? e.x + reach : e.x, y0: e.y - e.h * 0.85, y1: e.y - e.h * 0.2 };
          if (overlap(hb, box(p))) { e.hitDone = true; hurtPlayer(p, e.giant ? 20 : 12, e.x); }
          if (e.giant && e.at > 0.1 && !e.slamFx) { e.slamFx = true; J.game.shake(5); sfx('slam'); }
        }
        if (e.at > (e.giant ? 0.7 : 0.45)) { e.state = 'chase'; e.st = e.giant ? rnd(0.8, 1.4) : rnd(0.6, 1.1); e.punch = 0; e.eyeGlow = 0; e.slamFx = false; }
        break;
      }
    }
    moveAndCollide(e, dt, e.plat ? { minX: e.plat.x + 4, maxX: e.plat.x + e.plat.w - 4 } : { step: e.giant ? 140 : 0 });
    // contatto
    if (p.state !== 'dead' && overlap(box(e), box(p)) && e.state !== 'hurt' && e.state !== 'drop') hurtPlayer(p, e.giant ? 10 : 6, e.x);
  }

  function throwSpear(e) {
    W().projectiles.push({ kind: 'spear', x: e.x + e.face * 20, y: e.y - 56, vx: e.face * 380, vy: -60, grav: 120, r: 8, dmg: 10, life: 3, face: e.face });
    sfx('whoosh');
  }
  function shootClay(e) {
    const p = W().player; const dx = p.x - e.x;
    const t = 0.9; const vx = clamp(dx / t, -900, 900);
    W().projectiles.push({ kind: 'clay', x: e.x + e.face * 30, y: e.y - e.h * 0.82, vx, vy: -700, grav: 1500, r: 26, dmg: 14, life: 4 });
    sfx('shooter');
  }

  function updateProjectiles(dt) {
    const w = W(); const p = w.player; const pb = box(p);
    for (const pr of w.projectiles) {
      pr.life -= dt; if (pr.life <= 0) pr.dead = true;
      pr.vy += (pr.grav || 0) * dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.kind === 'shock') { pr.y = w.level.groundY; pr.x += 0; }
      if (pr.kind !== 'shock' && pr.y >= w.level.groundY) {
        pr.dead = true;
        if (pr.kind === 'clay' || pr.kind === 'bossOrb') { shards(pr.x, pr.y, 8, 2, '#c7774a'); dust(pr.x, pr.y, 6, 2); sfx('slam'); }
        else sparks(pr.x, pr.y, 4, '#ccc', 120, 2);
      }
      const hb = pr.kind === 'shock' ? { x0: pr.x - pr.w / 2, x1: pr.x + pr.w / 2, y0: pr.y - pr.h, y1: pr.y } : { x0: pr.x - pr.r, x1: pr.x + pr.r, y0: pr.y - pr.r, y1: pr.y + pr.r };
      if (!pr.dead && overlap(hb, pb)) { if (hurtPlayer(p, pr.dmg, pr.x - pr.vx)) { if (pr.kind !== 'shock') pr.dead = true; } }
      // i pugni del giocatore respingono le lance
      if (!pr.dead && p.state === 'attack' && pr.kind === 'spear' && overlap(hb, attackBox(p))) { pr.dead = true; sparks(pr.x, pr.y, 6, '#fff', 200, 2); sfx('punch'); }
    }
    w.projectiles = w.projectiles.filter((q) => !q.dead);
  }

  function updateParticles(dt) {
    const w = W();
    for (const q of w.particles) { q.t += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.vr) q.rot += q.vr * dt; if (q.kind === 'spark' || q.kind === 'dust') { q.vx *= 0.92; q.vy *= 0.92; } }
    w.particles = w.particles.filter((q) => q.t < q.life);
  }

  /* ---------------- disegno ---------------- */
  function drawPlayer(p, t) {
    const g = J.g; const S = J.spr;
    if (p.inv > 0 && p.state !== 'hurt' && Math.floor(p.inv * 14) % 2 === 0) g.globalAlpha = 0.45;
    let anim = p.anim; let at = p.animT;
    if (anim === 'punch2') { anim = 'punch'; }
    const opts = { second: p.anim === 'punch2', cadence: p.form === 'jeeg' ? 7.5 : 11.5 };
    if (anim === 'run' || anim === 'idle') at = J.world.t;
    if (p.state === 'attack') at = p.atk.t;
    if (p.state === 'dead') { anim = 'dead'; }
    if (J.world.scene && J.world.scene.forcePose) { anim = J.world.scene.forcePose; at = J.world.t; }
    const pose = S.pose(anim, at, opts);
    g.save(); g.translate(p.x, p.y);
    // ombra
    g.fillStyle = 'rgba(20,10,30,0.25)'; g.beginPath(); g.ellipse(0, 0, p.w * 0.7, p.w * 0.12, 0, 0, 7); g.fill();
    if (p.state === 'dead') { g.rotate(-p.face * Math.min(1, p.deadT * 3) * 0.2); }
    g.scale(p.face, 1);
    if (p.form === 'jeeg') { g.scale(3, 3); S.drawHumanoid(S.JEEG, pose); }
    else if (p.form === 'cyborg') S.drawHumanoid(S.CYBORG, pose);
    else S.drawHumanoid(J.world.gloves ? S.HIRO_G : S.HIRO, pose);
    g.restore(); g.globalAlpha = 1;
  }

  function drawBeam(p, t) {
    if (p.state !== 'beam' || !p.beamActive) return;
    const g = J.g; const b = p.beamActive; const G = beamGeom(p);
    const k = Math.min(1, b.t / 0.12); const fade = Math.min(1, p.beamT / 0.15);
    g.save(); g.globalAlpha = fade;
    if (b.kind === 'gamma') {
      // RAGGIO GAMMA (rif. 16): fascio con anelli arancio-rossi a spirale
      const len = G.len * k; const dir = p.face;
      const grd = g.createLinearGradient(0, G.oy - 30, 0, G.oy + 30);
      grd.addColorStop(0, 'rgba(255,120,40,0)'); grd.addColorStop(0.5, 'rgba(255,240,180,0.95)'); grd.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grd; g.fillRect(dir > 0 ? G.ox : G.ox - len, G.oy - 26, len, 52);
      g.fillStyle = '#ffffff'; g.fillRect(dir > 0 ? G.ox : G.ox - len, G.oy - 7, len, 14);
      for (let i = 0; i < 16; i++) {
        const d = ((i * 72 + b.t * 900) % len);
        const rx = 14 + (d / len) * 10, ry = 30 + (d / len) * 26;
        g.lineWidth = 9; g.strokeStyle = i % 2 ? '#ff5a1f' : '#ff9a2a';
        g.beginPath(); g.ellipse(G.ox + dir * d, G.oy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 3; g.strokeStyle = '#ffe4a0'; g.stroke();
      }
      J.spr.circ(G.ox, G.oy, 26 + Math.sin(t * 60) * 5, '#fff3c0', 0);
    } else {
      // RAGGIO PROTONICO (rif. 17): fasci bianchi multipli dalla testa
      const dir = p.face; const len = G.len * k;
      for (let i = -2; i <= 2; i++) {
        const ang = i * 0.06 + 0.08;
        const ex = G.ox + dir * Math.cos(ang) * len, ey = G.oy + Math.sin(ang) * len;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(160,220,255,0.55)'; g.lineWidth = 26; g.beginPath(); g.moveTo(G.ox, G.oy); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.stroke();
      }
      J.spr.circ(G.ox, G.oy, 30 + Math.sin(t * 70) * 6, '#e8f6ff', 0);
    }
    g.restore();
  }

  function drawEnemy(e, t) {
    const g = J.g; const S = J.spr;
    if (!e.alive && e.deadT > (e.giant ? 0.5 : 0.7)) return;
    g.save(); g.translate(e.x, e.y);
    if (!e.alive) { g.globalAlpha = Math.max(0, 1 - e.deadT / (e.giant ? 0.5 : 0.7)); g.rotate(e.vx > 0 ? e.deadT * 3 : -e.deadT * 3); }
    g.fillStyle = 'rgba(20,10,30,0.25)'; g.beginPath(); g.ellipse(0, 0, e.w * 0.7, e.w * 0.12, 0, 0, 7); g.fill();
    if (e.flash > 0 && 'filter' in g) g.filter = 'brightness(2.4)';
    g.scale(e.face, 1);
    if (e.giant) {
      g.scale(e.def.scale, e.def.scale);
      S.drawHaniwaGiant(e.animT, { anim: e.anim, at: e.at, armRaise: e.armRaise, punch: e.punch, eyeGlow: e.eyeGlow, mouthGlow: e.mouthGlow }, e.type === 'giantShooter' ? 'shooter' : 'giant');
    } else {
      let anim = 'idle', at = e.animT;
      if (!e.alive) anim = 'hurt';
      else if (e.state === 'hurt') anim = 'hurt';
      else if (e.state === 'windup') { anim = e.type === 'lancer' ? 'throwW' : 'windup'; at = e.at; }
      else if (e.state === 'attack') { anim = e.type === 'lancer' ? 'throw' : 'slash'; at = e.at; }
      else if (e.state === 'drop') anim = 'fall';
      else if (Math.abs(e.vx) > 1) anim = 'run';
      const pose = S.pose(anim, at, { cadence: 8 });
      S.drawHumanoid(e.type === 'lancer' ? S.LANCER : S.SOLDIER, pose);
    }
    if ('filter' in g) g.filter = 'none';
    g.restore();
    // segnale di attacco (telegraph)
    if (e.alive && e.state === 'windup') {
      const s = e.giant ? 2.4 : 1;
      g.save(); g.translate(e.x, e.y - e.h - 16 * s); g.scale(s, s);
      S.poly([-7, -20, 7, -20, 3, 0, -3, 0], '#ffdf3a', 2); S.circ(0, 7, 3.5, '#ffdf3a', 2);
      g.restore();
    }
  }

  function drawProjectile(pr, t) {
    const S = J.spr; const g = J.g;
    if (pr.kind === 'spear') {
      g.save(); g.translate(pr.x, pr.y); g.rotate(Math.atan2(pr.vy, pr.vx));
      S.line(-26, 0, 18, 0, '#6b4a2a', 3); S.poly([18, -4, 30, 0, 18, 4], '#c9ced8', 1.4); g.restore();
    } else if (pr.kind === 'clay' || pr.kind === 'bossOrb') {
      g.save(); g.translate(pr.x, pr.y); g.rotate(t * 8);
      g.globalAlpha = 0.45; S.circ(0, 0, pr.r * 1.5, pr.kind === 'bossOrb' ? '#ff6a3a' : '#ffb03a', 0); g.globalAlpha = 1;
      S.circ(0, 0, pr.r, '#c7774a', 3); S.circ(-pr.r * 0.3, -pr.r * 0.3, pr.r * 0.35, '#e3a173', 0);
      S.line(-pr.r * 0.6, pr.r * 0.2, pr.r * 0.5, pr.r * 0.5, '#7a3f22', 2.5);
      g.restore();
    } else if (pr.kind === 'shock') {
      g.save(); g.translate(pr.x, pr.y);
      const h = pr.h * (0.8 + 0.2 * Math.sin(t * 40));
      S.poly([-pr.w / 2, 0, -pr.w / 4, -h * 0.6, 0, -h, pr.w / 4, -h * 0.6, pr.w / 2, 0], '#ffcf5a', 3);
      S.poly([-pr.w / 4, 0, 0, -h * 0.6, pr.w / 4, 0], '#fff6c0', 0);
      g.restore();
    }
  }

  function drawParticle(q) {
    const g = J.g; const k = 1 - q.t / q.life;
    switch (q.kind) {
      case 'spark': g.strokeStyle = q.col; g.lineWidth = q.size * k + 0.5; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); g.stroke(); break;
      case 'dust': g.globalAlpha = k * 0.7; g.fillStyle = q.col; g.beginPath(); g.arc(q.x, q.y, q.size * (1.6 - k), 0, 7); g.fill(); g.globalAlpha = 1; break;
      case 'shard': g.save(); g.translate(q.x, q.y); g.rotate(q.rot); J.spr.poly([-q.size, -q.size * 0.5, q.size, -q.size * 0.3, 0, q.size * 0.7], q.col, 1.4); g.restore(); break;
      case 'star': {
        const s = q.size * (0.6 + (1 - k) * 0.8); g.save(); g.translate(q.x, q.y); g.rotate(q.x);
        const pts = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? s * 0.35 : s; const a = (i / 16) * Math.PI * 2; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
        g.globalAlpha = k; J.spr.poly(pts, '#ffffff', 2); J.spr.circ(0, 0, s * 0.3, '#ffe86a', 0); g.globalAlpha = 1; g.restore(); break;
      }
      case 'explo': {
        const r = q.size * (0.4 + (1 - k) * 0.9);
        g.globalAlpha = k; J.spr.circ(q.x, q.y, r, '#ff7a2a', 3); J.spr.circ(q.x, q.y, r * 0.7, '#ffd34a', 0); J.spr.circ(q.x, q.y, r * 0.4, '#fff6d0', 0); g.globalAlpha = 1; break;
      }
      case 'magnet': g.strokeStyle = k > 0.5 ? '#bfe9ff' : '#5ab0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(q.x, q.y); for (let i = 1; i < 5; i++) g.lineTo(q.x + q.vx * 0.02 * i + (Math.random() - 0.5) * 16, q.y + q.vy * 0.02 * i + (Math.random() - 0.5) * 16); g.stroke(); break;
      case 'ring': g.globalAlpha = k; g.strokeStyle = q.col; g.lineWidth = 6 * k + 1; g.beginPath(); g.arc(q.x, q.y, q.size * (1.2 - k), 0, 7); g.stroke(); g.globalAlpha = 1; break;
      case 'text': {
        g.globalAlpha = Math.min(1, k * 2); g.font = 'bold ' + q.size + 'px Impact, "Arial Black", sans-serif'; g.textAlign = 'center';
        g.lineWidth = Math.max(3, q.size / 6); g.strokeStyle = '#1b1020'; g.strokeText(q.text, q.x, q.y); g.fillStyle = q.col; g.fillText(q.text, q.x, q.y);
        g.textAlign = 'left'; g.globalAlpha = 1; break;
      }
    }
  }

  J.ent = {
    box, overlap, moveAndCollide, makePlayer, setForm, updatePlayer, hurtPlayer, makeEnemy, updateEnemy, damageEnemy,
    updateProjectiles, updateParticles, drawPlayer, drawBeam, drawEnemy, drawProjectile, drawParticle,
    particle, sparks, dust, shards, explosion, floatText, hitStar, rnd, clamp, beamGeom,
  };
})();
