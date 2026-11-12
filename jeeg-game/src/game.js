/* game.js — mondo, camera, checkpoint/salvataggi, HUD, menu arcade, ciclo principale a passo fisso. */
'use strict';
(function () {
  const E = () => J.ent;
  const sfx = (n) => J.audio.play(n);
  const VW = J.VIEW_W, VH = J.VIEW_H;

  const game = {
    mode: 'title', menuIndex: 0, godMode: false, modeT: 0, levelsIndex: 0, pauseIndex: 0,
    remap: null, stats: null,
  };
  J.game = game;

  /* ===================== SALVATAGGI ===================== */
  function loadSave() { try { return JSON.parse(localStorage.getItem(J.SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function writeSave(s) { try { localStorage.setItem(J.SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
  function hiscore() { try { return +localStorage.getItem(J.HISCORE_KEY) || 0; } catch (e) { return 0; } }
  function setHiscore(v) { try { if (v > hiscore()) localStorage.setItem(J.HISCORE_KEY, String(v)); } catch (e) {} }
  game.saveNow = function () {
    const w = J.world; if (!w) return;
    const prev = loadSave() || {};
    writeSave({
      version: 1, level: 1, cp: w.cp, cp2x: w.cp2x, gloves: w.gloves, score: w.cpScore, lives: w.lives,
      en: w.cpEnergy, unlocked: Math.max(prev.unlocked || 1, w.unlocked || 1), time: Date.now(),
    });
  };

  /* ===================== MONDO ===================== */
  function newWorld() {
    const lv = JSON.parse(JSON.stringify(J.LEVEL1));
    return {
      level: lv, t: 0, player: null, enemies: [], projectiles: [], particles: [], pickups: [], boss: null,
      cam: { x: 0, y: 0, zoom: 1, tz: 1, shake: 0 }, cp: 0, cp2x: lv.checkpoints[2].x, gloves: false, glovesSeen: false,
      score: 0, cpScore: 0, cpEnergy: 100, lives: 3, kills: 0, scene: null, arenaLocked: false, bossStarted: false,
      msg: '', msgT: 0, hitstop: 0, deathT: -1, timeStart: 0, ambushDone: false, unlocked: 1, gateWarned: false, completeT: 0,
    };
  }

  function spawnFromCheckpoint(w, idx) {
    const lv = w.level; const cp = lv.checkpoints[idx];
    const cpx = idx === 2 ? w.cp2x : cp.x;
    let form = cp.form;
    w.player = E().makePlayer(cpx, form);
    E().setForm(w.player, form);
    w.player.en = Math.max(w.cpEnergy, 50);
    w.player.inv = 1.5;
    w.cam.zoom = w.cam.tz = J.FORMS[form].zoom;
    // nemici oltre il checkpoint (quelli già superati non ricompaiono)
    w.enemies = [];
    for (const d of lv.enemies) {
      if (d.x <= cpx + 160) continue;
      if (d.ambush && !w.gloves) continue;
      w.enemies.push(E().makeEnemy(d));
    }
    w.ambushDone = w.gloves;
    w.pickups = lv.pickups.filter((q) => q.x > cpx).map((q) => Object.assign({ taken: false }, q));
    if (!w.gloves) w.pickups.push({ type: 'gloves', x: lv.gloves.x, y: groundAt(lv, lv.gloves.x), taken: false });
    w.projectiles = []; w.particles = [];
    w.boss = J.boss.make(lv.boss); w.bossStarted = false; w.arenaLocked = false;
    w.scene = null; w.deathT = -1;
    snapCamera(w);
    J.audio.startMusic('stage');
  }
  function groundAt(lv, x) {
    let y = lv.groundY;
    for (const p of lv.platforms) if (x > p.x && x < p.x + p.w && p.y < y) y = p.y;
    return y;
  }

  function startLevel(fromSave) {
    const w = newWorld(); J.world = w;
    const s = fromSave ? loadSave() : null;
    if (s) {
      w.cp = s.cp || 0; w.cp2x = s.cp2x || w.cp2x; w.gloves = !!s.gloves; w.score = w.cpScore = s.score || 0;
      w.lives = Math.max(1, s.lives || 3); w.cpEnergy = s.en || 100; w.unlocked = s.unlocked || 1;
    } else {
      const prev = loadSave(); w.unlocked = (prev && prev.unlocked) || 1;
    }
    spawnFromCheckpoint(w, w.cp);
    game.mode = 'play'; game.modeT = 0;
    game.stats = { start: performance.now() };
    if (!s) {
      game.saveNow();
      w.scene = J.scenes.dialog([
        { who: 'LIVELLO 1 — IL RISVEGLIO DEI MOSTRI', text: 'Circuito di periferia. Durante le prove di velocità, strani guerrieri dall\'antico regno Yamatai invadono la pista...', col: '#9fd8ff' },
        { who: 'HIROSHI SHIBA', text: 'Chi sono questi soldati Haniwa?! Devo fermarli... e trovare i guanti che mi ha lasciato mio padre!', portrait: 'hiroshi', bg: '#c8302a' },
        { who: 'COMANDI', text: '← → muoviti · A attacco (combo pugno-pugno-calcio) · B salto (↓+B scende dalle passerelle) · A+B raggi (solo Jeeg) · T trasformazione · SEL cambia raggio · START pausa.', col: '#9fffc0' },
      ]);
    } else {
      game.msg('Partita ripresa dal checkpoint: ' + w.level.checkpoints[w.cp].label, 3);
    }
  }
  game.startLevel = startLevel;

  /* ===================== EVENTI DI GIOCO ===================== */
  game.msg = function (t, dur) { if (!J.world) return; J.world.msg = t; J.world.msgT = dur || 2.6; };
  game.shake = function (v) { if (J.world) J.world.cam.shake = Math.max(J.world.cam.shake, v); };
  game.hitstop = function (v) { if (J.world) J.world.hitstop = Math.max(J.world.hitstop, v); };
  game.setZoom = function (z) { if (J.world) J.world.cam.tz = z; };

  game.tryTransform = function () {
    const w = J.world; const p = w.player;
    if (w.scene || p.state === 'dead') return;
    if (p.form === 'human') {
      if (!w.gloves) { sfx('denied'); game.msg('Prima devi raccogliere i GUANTI MAGNETICI!'); return; }
      if (!p.onGround) { game.msg('Atterra per trasformarti'); return; }
      w.scene = J.scenes.transformCyborg();
    } else if (p.form === 'cyborg') {
      if (!p.onGround) { game.msg('Atterra per il BUILD UP'); return; }
      w.scene = J.scenes.buildUp();
    } else { sfx('denied'); game.msg('Sei già JEEG completo'); }
  };
  game.onJeegAssembled = function () {
    const w = J.world;
    w.cp2x = Math.max(w.player.x, 200); w.cp = Math.max(w.cp, 2);
    w.cpScore = w.score; w.cpEnergy = 100;
    game.saveNow();
    sfx('checkpoint');
    game.msg('JEEG COMPLETO! Checkpoint salvato. Avanza nella zona dei giganti →  (A+B raggio, SEL cambia tipo)', 5);
  };
  game.onPlayerDeath = function () { J.world.deathT = 0; J.audio.stopMusic(); };
  game.onBossDefeated = function () {
    const w = J.world; w.bossDefeatedT = 0;
    game.msg('HANIWA CORAZZATO DISTRUTTO!', 3);
  };

  function activateCheckpoint(w, idx) {
    if (idx <= w.cp) return;
    w.cp = idx; w.cpScore = w.score; w.cpEnergy = w.player.en;
    w.player.hp = Math.min(100, w.player.hp + 35);
    game.saveNow(); sfx('checkpoint');
    const cp = w.level.checkpoints[idx];
    E().floatText(cp.x, w.level.groundY - (w.player.form === 'jeeg' ? 360 : 150), 'CHECKPOINT!', '#9fffc0', w.player.form === 'jeeg' ? 48 : 24);
    game.msg('Checkpoint attivato: ' + cp.label + ' (salvato)', 3);
  }

  /* ===================== CAMERA ===================== */
  function snapCamera(w) { updateCamera(w, 1, true); }
  function updateCamera(w, dt, snap) {
    const c = w.cam; const p = w.player; const lv = w.level;
    c.zoom += (c.tz - c.zoom) * (snap ? 1 : Math.min(1, dt * 2.2));
    const vw = VW / c.zoom;
    let tx = p.x - vw * 0.4 + p.face * vw * 0.05;
    let maxX = lv.worldW - vw;
    if (p.form !== 'jeeg' && !(w.scene && w.scene.kind === 'buildup')) maxX = Math.min(maxX, lv.giantGateX + 160 - vw);
    if (w.arenaLocked) tx = lv.arena.x0 + ((lv.arena.x1 - lv.arena.x0) - vw) / 2;
    tx = Math.max(0, Math.min(maxX, tx));
    c.x = snap ? tx : c.x + (tx - c.x) * Math.min(1, dt * 5);
    const targetY = lv.groundY - 470 / c.zoom;
    c.y = targetY;
    c.shake = Math.max(0, c.shake - dt * 30);
  }

  /* ===================== AGGIORNAMENTO PARTITA ===================== */
  function updatePlay(dt) {
    const w = J.world; const p = w.player; const lv = w.level;
    if (J.input.pressed.START && !w.scene && w.deathT < 0 && !w.bossDefeatedT) { game.mode = 'pause'; game.pauseIndex = 0; sfx('select'); return; }
    w.t += dt;
    w.msgT -= dt;
    if (w.hitstop > 0) { w.hitstop -= dt; E().updateParticles(dt); return; }

    if (w.scene) { w.scene.update(dt); if (w.scene.done) w.scene = null; }
    E().updatePlayer(p, dt);
    if (!w.scene || !w.scene.blocksPlay) {
      for (const e of w.enemies) E().updateEnemy(e, dt);
      w.enemies = w.enemies.filter((e) => e.alive || e.deadT < 1.2);
      J.boss.update(w.boss, dt);
      E().updateProjectiles(dt);
    }
    E().updateParticles(dt);

    // raccolta oggetti
    const pb = E().box(p);
    for (const q of w.pickups) {
      if (q.taken) continue;
      const big = q.x > lv.giantGateX ? 2.4 : 1;
      const qb = { x0: q.x - 18 * big, x1: q.x + 18 * big, y0: q.y - 40 * big, y1: q.y };
      if (!E().overlap(pb, qb) || p.state === 'dead') continue;
      q.taken = true;
      if (q.type === 'gloves') {
        w.gloves = true; sfx('gloves'); w.score += 1000;
        E().floatText(q.x, q.y - 50, 'GUANTI MAGNETICI!', '#ffe14a', 26);
        E().sparks(q.x, q.y - 20, 20, '#ffe14a', 300, 3);
        game.saveNow(); // i guanti restano acquisiti anche dopo una sconfitta
        game.msg('GUANTI RACCOLTI! Premi T (o il pulsante TRASF.) quando vuoi trasformarti.', 5);
        if (!w.ambushDone) { w.ambushDone = true; for (const d of lv.enemies) if (d.ambush && d.x > p.x - 100) w.enemies.push(E().makeEnemy(Object.assign({}, d, { ambushDrop: true }))); }
      } else if (q.type === 'health') { p.hp = Math.min(100, p.hp + 35); sfx('pickup'); w.score += 50; E().floatText(q.x, q.y - 40 * big, '+VITA', '#7dff8a', 18 * big); }
      else if (q.type === 'energy') { p.en = Math.min(100, p.en + 40); sfx('pickup'); w.score += 50; E().floatText(q.x, q.y - 40 * big, '+ENERGIA', '#7fdcff', 18 * big); }
    }
    // rigenerazione lenta dell'energia dei raggi (solo Jeeg)
    if (p.form === 'jeeg' && p.state !== 'beam') p.en = Math.min(100, p.en + dt * 1.5);

    // checkpoint
    for (const cp of lv.checkpoints) {
      if (cp.auto || cp.id <= w.cp) continue;
      if (p.x >= cp.x && p.state !== 'dead' && (cp.form !== 'jeeg' || p.form === 'jeeg')) activateCheckpoint(w, cp.id);
    }

    // ingresso nell'arena del boss
    if (!w.bossStarted && p.form === 'jeeg' && p.x > lv.arena.x0 + 250) {
      w.bossStarted = true; w.arenaLocked = true;
      for (const e of w.enemies) if (e.x < lv.arena.x0) e.alive = false, e.deadT = 9;
      w.scene = J.scenes.bossIntro(w.boss);
    }

    // morte → respawn
    if (w.deathT >= 0) {
      w.deathT += dt;
      if (w.deathT > 1.8) {
        w.lives--;
        if (w.lives <= 0) { game.mode = 'gameover'; game.modeT = 0; setHiscore(w.score); w.lives = 0; game.saveNow(); return; }
        w.score = w.cpScore;
        game.saveNow();
        spawnFromCheckpoint(w, w.cp);
        game.msg('Respawn al checkpoint: ' + lv.checkpoints[w.cp].label + ' — vite: ' + w.lives, 3);
      }
    }
    // vittoria
    if (w.bossDefeatedT != null && w.bossDefeatedT !== false) {
      w.bossDefeatedT += dt;
      if (w.bossDefeatedT > 2.6 && !w.victoryStarted) {
        w.victoryStarted = true;
        w.scene = J.scenes.victory(() => {
          w.scene = J.scenes.dialog([
            { who: 'MIWA UZUKI', text: 'Ce l\'hai fatta, Hiroshi! Il mostro Haniwa è stato distrutto!', portrait: 'miwa', bg: '#2f6fd2' },
            { who: 'HIROSHI SHIBA', text: 'È solo l\'inizio. La Regina Himika e il regno Yamatai non si fermeranno... Torniamo alla base!', portrait: 'hiroshi', bg: '#c8302a' },
          ], () => completeLevel());
        });
      }
    }
    updateCamera(w, dt);
  }

  function completeLevel() {
    const w = J.world;
    w.unlocked = Math.max(w.unlocked, 2);
    const timeS = Math.round((performance.now() - game.stats.start) / 1000);
    const bonus = w.lives * 1000 + Math.max(0, 600 - timeS) * 10;
    w.score += bonus; setHiscore(w.score);
    game.stats.time = timeS; game.stats.bonus = bonus;
    // salva: livello 2 sbloccato, la partita del livello 1 riparte da capo
    writeSave({ version: 1, level: 2, cp: 0, gloves: false, score: w.score, lives: 3, en: 100, unlocked: w.unlocked, time: Date.now(), level1Done: true });
    game.mode = 'complete'; game.modeT = 0;
    J.audio.startMusic('title');
  }

  /* ===================== DISEGNO PARTITA ===================== */
  function drawPlay() {
    const g = J.g; const w = J.world; const c = w.cam; const t = w.t;
    J.bg.drawSky(c, t);
    J.bg.drawParallax(c, t);
    g.save();
    const sx = (Math.random() - 0.5) * c.shake, sy = (Math.random() - 0.5) * c.shake;
    g.translate(sx, sy); g.scale(c.zoom, c.zoom); g.translate(-c.x, -c.y);
    J.bg.drawWorldBack(c, w.level, t);
    J.bg.drawGround(c, w.level);
    for (const pl of w.level.platforms) J.bg.drawPlatform(pl);
    drawCheckpoints(w, t);
    for (const q of w.pickups) if (!q.taken) drawPickup(q, t, q.x > w.level.giantGateX ? 2.4 : 1);
    J.boss.draw(w.boss, t);
    for (const e of w.enemies) E().drawEnemy(e, t);
    if (!(w.scene && w.scene.hidePlayer)) E().drawPlayer(w.player, t);
    E().drawBeam(w.player, t);
    for (const pr of w.projectiles) E().drawProjectile(pr, t);
    if (w.scene && w.scene.drawWorld) w.scene.drawWorld();
    for (const q of w.particles) E().drawParticle(q);
    g.restore();
    drawHUD(w, t);
    if (w.scene && w.scene.drawScreen) w.scene.drawScreen();
    if (w.deathT >= 0) { g.fillStyle = 'rgba(0,0,0,' + Math.min(0.7, w.deathT * 0.5) + ')'; g.fillRect(0, 0, VW, VH); if (w.deathT > 0.6) J.scenes.bigText(w.lives > 1 ? 'SCONFITTO!' : 'ULTIMA VITA PERSA', 480, 270, 54, '#ff6a4a'); }
  }

  function drawCheckpoints(w, t) {
    const S = J.spr; const g = J.g; const gy = w.level.groundY;
    for (const cp of w.level.checkpoints) {
      if (cp.id === 0 || cp.auto) continue;
      const big = cp.x > w.level.giantGateX ? 2.4 : 1;
      const on = w.cp >= cp.id;
      g.save(); g.translate(cp.x, gy); g.scale(big, big);
      S.cap(0, 0, 0, -110, 3, '#c8ccd6', '#8d93a8');
      const wave = Math.sin(t * 6) * 4;
      S.poly([2, -108, 46, -100 + wave, 2, -84], on ? '#3fd07a' : '#d0463a', 2);
      g.fillStyle = '#fff'; g.font = 'bold 11px Arial'; g.fillText('CP', 10, -96 + wave / 2);
      if (on) { g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5); S.circ(0, -60, 34, '#9fffc0', 0); g.globalAlpha = 1; }
      g.restore();
    }
  }
  function drawPickup(q, t, big) {
    const g = J.g; const S = J.spr;
    g.save(); g.translate(q.x, q.y); g.scale(big, big);
    if (q.type === 'gloves') S.drawGlovesItem(t);
    else {
      const b = Math.sin(t * 4 + q.x) * 3; g.translate(0, -18 + b);
      g.globalAlpha = 0.3; S.circ(0, 0, 18, q.type === 'health' ? '#ff8a8a' : '#8ad8ff', 0); g.globalAlpha = 1;
      if (q.type === 'health') { S.circ(0, 0, 11, '#ffffff', 2); S.poly([-3, -8, 3, -8, 3, -3, 8, -3, 8, 3, 3, 3, 3, 8, -3, 8, -3, 3, -8, 3, -8, -3, -3, -3], '#e0302a', 1.2); }
      else { S.circ(0, 0, 11, '#2a7ae0', 2); S.poly([-2, -9, 4, -9, 0, -1, 5, -1, -3, 10, -1, 2, -5, 2], '#ffe14a', 1.2); }
    }
    g.restore();
  }

  /* ===================== HUD ===================== */
  function bar(x, y, w, h, v, col, back) {
    const g = J.g;
    g.fillStyle = back || '#2a1a2a'; g.fillRect(x, y, w, h);
    g.fillStyle = col; g.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h * 0.35);
    g.lineWidth = 2; g.strokeStyle = '#1b1020'; g.strokeRect(x, y, w, h);
  }
  function panel(x, y, w, h) {
    const g = J.g; g.fillStyle = 'rgba(12,16,44,0.82)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 10) : g.rect(x, y, w, h); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#e8b13a'; g.stroke();
  }
  function drawHUD(w, t) {
    const g = J.g; const p = w.player; const S = J.spr;
    panel(10, 10, 330, 92);
    // ritratto della forma attuale
    g.save(); g.beginPath(); g.arc(52, 56, 36, 0, 7); g.fillStyle = p.form === 'jeeg' ? '#f2a428' : p.form === 'cyborg' ? '#c8302a' : '#2f6fd2'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#1b1020'; g.stroke(); g.clip();
    g.translate(50, 70);
    if (p.form === 'jeeg') { g.scale(3.4, 3.4); S.JEEG.head(); }
    else if (p.form === 'cyborg') { g.scale(2.1, 2.1); S.CYBORG.head(); }
    else { g.scale(2.2, 2.2); S.HIRO.head(); }
    g.restore();
    g.font = 'bold 15px Impact, "Arial Black", sans-serif'; g.fillStyle = '#ffe14a'; g.fillText(J.FORMS[p.form].label, 98, 30);
    g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('VITA', 98, 49); g.fillText('ENERGIA', 98, 71);
    bar(160, 39, 168, 13, p.hp / 100, p.hp > 35 ? '#4ee06a' : '#ff4a3a');
    bar(160, 61, 168, 13, p.en / 100, p.form === 'jeeg' ? '#4ac8ff' : '#5a6a8a');
    g.font = 'bold 12px Arial'; g.fillStyle = w.gloves ? '#ffe14a' : '#8a8aa0';
    g.fillText('GUANTI ' + (w.gloves ? '✔' : '—'), 98, 93);
    g.fillStyle = '#9fffc0'; g.fillText('CP ' + w.cp + '/3', 180, 93);
    g.fillStyle = '#ff9a9a'; g.fillText('VITE ×' + w.lives, 236, 93);
    g.fillStyle = '#fff'; g.font = 'bold 13px Arial'; g.fillText(String(w.score).padStart(7, '0'), 282, 30);

    // selettore raggio (contestuale)
    panel(VW - 250, 10, 240, 66);
    g.font = 'bold 12px Arial'; g.fillStyle = '#fff'; g.fillText('A+B RAGGIO   ·   SEL cambia', VW - 238, 28);
    const jeeg = p.form === 'jeeg';
    for (const [i, k, lab] of [[0, 'gamma', 'GAMMA'], [1, 'proton', 'PROTONICO']]) {
      const x = VW - 240 + i * 112, y = 36; const sel = p.beam === k;
      g.fillStyle = sel ? (k === 'gamma' ? '#ff8a2a' : '#e8f6ff') : '#2a2a44'; g.globalAlpha = jeeg ? 1 : 0.4;
      g.fillRect(x, y, 106, 30); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffe14a' : '#5a5a7a'; g.strokeRect(x, y, 106, 30);
      g.fillStyle = sel ? '#1b1020' : '#c0c0d8'; g.font = 'bold 13px Impact, "Arial Black", sans-serif'; g.fillText(lab, x + 8, y + 20);
      g.font = 'bold 11px Arial'; g.fillText(J.GAME_CONFIG.special_cost[k] + 'EN', x + 74, y + 20);
      g.globalAlpha = 1;
    }
    // titolo livello
    g.font = 'bold 13px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#1b1020'; g.lineWidth = 3;
    g.strokeText('LIVELLO 1 · ' + w.level.title, VW / 2, 24); g.fillText('LIVELLO 1 · ' + w.level.title, VW / 2, 24); g.textAlign = 'left';

    // icona trasformazione (compare solo dopo la raccolta dei guanti)
    if (w.gloves && p.form !== 'jeeg' && !w.scene) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      const x = VW - 150, y = VH - 118;
      g.save(); g.translate(x + 60, y + 40); g.scale(1 + pulse * 0.05, 1 + pulse * 0.05);
      g.fillStyle = p.form === 'human' ? '#c8302a' : '#2f6fd2'; g.beginPath(); g.arc(0, 0, 38, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffe14a'; g.stroke();
      g.globalAlpha = pulse * 0.5; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.strokeStyle = '#fff'; g.stroke(); g.globalAlpha = 1;
      if (p.form === 'human') { g.save(); g.scale(0.55, 0.55); g.translate(0, -58); for (const sx of [-1, 1]) { S.poly([sx * 2, 40, sx * 2, 70, sx * 34, 72, sx * 42, 56, sx * 38, 40], '#f6e04a', 3); S.ell(sx * 24, 56, 7, 9, '#1b5a2a', 0, 2); } g.restore(); }
      else { g.save(); g.translate(0, 10); g.scale(1.4, 1.4); S.JEEG.head(); g.restore(); }
      g.restore();
      J.scenes.bigText('T', x + 30, y + 30, 26, '#fff');
      g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.fillStyle = '#ffe14a';
      g.fillText(p.form === 'human' ? 'TRASFORMAZIONE' : 'BUILD UP', x + 60, y + 98); g.textAlign = 'left';
    }

    // barra boss
    const b = w.boss;
    if (b && b.active && b.state !== 'dying') {
      panel(160, VH - 66, 640, 52);
      g.font = 'bold 16px Impact, "Arial Black", sans-serif'; g.fillStyle = '#ffe14a'; g.fillText(b.name, 174, VH - 44);
      g.fillStyle = '#fff'; g.font = 'bold 13px Arial'; g.textAlign = 'right'; g.fillText('FASE ' + b.phase + '/3', 786, VH - 44); g.textAlign = 'left';
      bar(174, VH - 36, 612, 14, b.hp / b.maxHp, b.phase === 1 ? '#e2412c' : b.phase === 2 ? '#ff8a1c' : '#ff2adf');
      g.fillStyle = '#1b1020'; g.fillRect(174 + 612 * 0.66, VH - 36, 2, 14); g.fillRect(174 + 612 * 0.33, VH - 36, 2, 14);
    }

    // messaggi contestuali
    if (w.msgT > 0 && w.msg) {
      g.globalAlpha = Math.min(1, w.msgT * 2);
      g.font = 'bold 17px "Trebuchet MS", Arial, sans-serif';
      const tw = Math.min(VW - 40, g.measureText(w.msg).width + 30);
      const y = b && b.active ? VH - 100 : VH - 44;
      g.fillStyle = 'rgba(12,16,44,0.85)'; g.fillRect(VW / 2 - tw / 2, y - 22, tw, 32);
      g.fillStyle = '#ffe14a'; g.textAlign = 'center'; g.fillText(w.msg, VW / 2, y, VW - 60); g.textAlign = 'left';
      g.globalAlpha = 1;
    }
  }

  /* ===================== MENU / SCHERMATE ===================== */
  function titleItems() {
    const s = loadSave();
    const items = [{ id: 'new', label: 'NUOVA PARTITA' }];
    if (s && !s.level1Done && (s.cp > 0 || s.gloves)) items.push({ id: 'continue', label: 'CONTINUA (checkpoint ' + s.cp + ')' });
    items.push({ id: 'levels', label: 'SELEZIONE LIVELLI' });
    items.push({ id: 'remap', label: 'CONFIGURA COMANDI' });
    items.push({ id: 'music', label: 'MUSICA: ' + (J.audio.musicOn ? 'ON' : 'OFF') });
    return items;
  }
  function menuNav(n, idx) {
    const inp = J.input;
    if (inp.menuPressed('up')) { sfx('select'); return (idx + n - 1) % n; }
    if (inp.menuPressed('down')) { sfx('select'); return (idx + 1) % n; }
    return idx;
  }
  const confirm = () => J.input.menuPressed('A') || J.input.menuPressed('START');

  function updateTitle(dt) {
    const items = titleItems();
    game.menuIndex = menuNav(items.length, Math.min(game.menuIndex, items.length - 1));
    if (game.modeT > 0.3 && confirm()) {
      const it = items[game.menuIndex]; sfx('checkpoint');
      if (it.id === 'new') startLevel(false);
      else if (it.id === 'continue') startLevel(true);
      else if (it.id === 'levels') { game.mode = 'levels'; game.modeT = 0; game.levelsIndex = 0; }
      else if (it.id === 'remap') { game.mode = 'remap'; game.modeT = 0; game.remap = { step: -1, done: false }; }
      else if (it.id === 'music') J.audio.toggleMusic();
    }
  }
  function drawTitle(t) {
    const g = J.g; const S = J.spr;
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#13205a'); gr.addColorStop(1, '#2f6fd2');
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    // raggiera anime
    g.save(); g.translate(700, 300);
    for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.fillStyle = i % 2 ? 'rgba(255,170,40,0.18)' : 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, -110); g.lineTo(900, 110); g.closePath(); g.fill(); }
    g.restore();
    // Jeeg
    g.save(); g.translate(720, 520 + Math.sin(t * 2) * 4); g.scale(-4.6, 4.6); S.drawHumanoid(S.JEEG, S.pose('idle', t)); g.restore();
    // Big Shooter in volo
    g.save(); g.translate(((t * 140) % 1500) - 300, 110 + Math.sin(t * 2) * 10); g.scale(-1.2, 1.2); S.drawBigShooter(t, true); g.restore();
    // logo
    g.save(); g.translate(250, 150); g.rotate(-0.06);
    J.scenes.bigText('JEEG', 0, 0, 130, '#ffe14a', '#c8302a');
    J.scenes.bigText('ROBOT D\'ACCIAIO', 0, 56, 44, '#ffffff', '#1b1020');
    g.restore();
    g.font = 'bold 14px Arial'; g.fillStyle = '#9fd8ff'; g.textAlign = 'center'; g.fillText('MASTER 1.2 · LIVELLO 1 GIOCABILE · build HTML5', 250, 235); g.textAlign = 'left';
    // menu
    const items = titleItems();
    items.forEach((it, i) => {
      const y = 290 + i * 40; const sel = i === game.menuIndex;
      if (sel) { g.fillStyle = 'rgba(255,225,74,0.18)'; g.fillRect(60, y - 26, 380, 36); J.scenes.bigText('▶', 80, y, 24, '#ffe14a'); }
      g.font = 'bold 24px Impact, "Arial Black", sans-serif'; g.fillStyle = sel ? '#ffe14a' : '#ffffff'; g.fillText(it.label, 104, y);
    });
    g.font = 'bold 13px Arial'; g.fillStyle = '#fff';
    g.fillText('HI-SCORE ' + String(hiscore()).padStart(7, '0'), 64, 510);
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ffe14a'; g.fillText('↑↓ scegli · A / START conferma', 260, 510); }
    g.font = '11px Arial'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('Fan game non ufficiale · uso privato · personaggi © dei rispettivi titolari', 64, 530);
  }

  function updateLevels() {
    const inp = J.input; const n = J.CAMPAIGN.length;
    if (inp.menuPressed('up')) { game.levelsIndex = (game.levelsIndex + n - 1) % n; sfx('select'); }
    if (inp.menuPressed('down')) { game.levelsIndex = (game.levelsIndex + 1) % n; sfx('select'); }
    if (inp.menuPressed('left') || inp.menuPressed('right')) { game.levelsIndex = (game.levelsIndex + 10) % n; sfx('select'); }
    if (game.modeT > 0.3 && confirm()) {
      const L = J.CAMPAIGN[game.levelsIndex];
      if (L.playable) startLevel(false); else sfx('denied');
    }
    if (inp.menuPressed('B') || inp.menuPressed('SEL')) { game.mode = 'title'; game.modeT = 0; }
  }
  function drawLevels(t) {
    const g = J.g; const s = loadSave(); const unlocked = (s && s.unlocked) || 1;
    g.fillStyle = '#101838'; g.fillRect(0, 0, VW, VH);
    J.scenes.bigText('CAMPAGNA — 20 LIVELLI', 480, 50, 36, '#ffe14a');
    for (let col = 0; col < 2; col++) {
      const x = 40 + col * 450;
      g.font = 'bold 16px Impact, "Arial Black", sans-serif'; g.fillStyle = col ? '#c28aff' : '#ff9a5a';
      g.fillText(col ? 'IMPERO DEL DRAGO (11–20)' : 'REGNO YAMATAI (1–10)', x, 88);
      for (let i = 0; i < 10; i++) {
        const L = J.CAMPAIGN[col * 10 + i]; const y = 112 + i * 38; const sel = game.levelsIndex === col * 10 + i;
        g.fillStyle = sel ? 'rgba(255,225,74,0.22)' : 'rgba(255,255,255,0.05)'; g.fillRect(x, y - 4, 430, 34);
        if (sel) { g.lineWidth = 2; g.strokeStyle = '#ffe14a'; g.strokeRect(x, y - 4, 430, 34); }
        g.font = 'bold 15px Arial'; g.fillStyle = L.playable ? '#ffffff' : '#8a8aa8';
        g.fillText(String(L.n).padStart(2, '0') + '  ' + L.title, x + 10, y + 13);
        g.font = '11px Arial'; g.fillStyle = '#9fa6c8'; g.fillText(L.env + ' · boss: ' + L.boss, x + 36, y + 27);
        g.font = 'bold 11px Arial'; g.textAlign = 'right';
        g.fillStyle = L.playable ? '#7dff8a' : L.n <= unlocked ? '#ffe14a' : '#ff7a7a';
        g.fillText(L.playable ? 'GIOCABILE' : L.n <= unlocked ? 'SBLOCCATO · IN SVILUPPO' : 'BLOCCATO · IN SVILUPPO', x + 422, y + 13);
        g.textAlign = 'left';
      }
    }
    g.font = 'bold 13px Arial'; g.fillStyle = '#ffe14a'; g.fillText('↑↓ scegli · ←→ cambia capitolo · A gioca · B indietro', 40, 525);
  }

  const REMAP_STEPS = [['A', 'ATTACCO (A)'], ['B', 'SALTO (B)'], ['AB', 'RAGGIO (pulsante A+B dedicato)'], ['T', 'TRASFORMAZIONE (T)'], ['SEL', 'SELEZIONE RAGGIO'], ['START', 'START / PAUSA']];
  function updateRemap() {
    const r = game.remap; const inp = J.input;
    if (r.step === -1) {
      if (game.modeT > 0.3 && inp.menuPressed('A')) { r.step = 0; ask(); }
      else if (game.modeT > 0.3 && inp.menuPressed('SEL')) { J.input.resetBindings(); r.msg = 'Comandi predefiniti ripristinati'; sfx('checkpoint'); }
      else if (game.modeT > 0.3 && (inp.menuPressed('B') || inp.menuPressed('START'))) { game.mode = 'title'; game.modeT = 0; }
    } else if (r.done && game.modeT > 1.2) { game.mode = 'title'; game.modeT = 0; }
    function ask() {
      J.input.captureNext((ev) => {
        J.input.setBinding(REMAP_STEPS[r.step][0], ev); sfx('select');
        r.last = (ev.kind === 'key' ? 'Tasto ' + ev.code : 'Pulsante gamepad ' + ev.index);
        r.step++;
        if (r.step >= REMAP_STEPS.length) { r.done = true; game.modeT = 0; sfx('checkpoint'); J.input.clearAll(); }
        else ask();
      });
    }
  }
  function drawRemap(t) {
    const g = J.g; const r = game.remap;
    g.fillStyle = '#101838'; g.fillRect(0, 0, VW, VH);
    J.scenes.bigText('CONFIGURA COMANDI', 480, 60, 40, '#ffe14a');
    g.font = '17px "Trebuchet MS", Arial'; g.fillStyle = '#fff'; g.textAlign = 'center';
    if (r.step === -1) {
      g.fillText('Per console arcade, encoder USB, gamepad o tastiera.', 480, 130);
      g.fillText('A = avvia configurazione · SEL = ripristina predefiniti · B/START = indietro', 480, 160);
      g.font = '15px Arial'; g.fillStyle = '#9fd8ff';
      const lines = ['Predefiniti tastiera: frecce/WASD, Z o CTRL = A, X o ALT o SPAZIO = B, V = A+B,', 'T o SHIFT = trasformazione, C = selettore raggio, INVIO/1/5 = START, F = schermo intero.',
        'Gamepad standard: 0 = A, 1 = B, 2 = T, 3 = SEL, 4/5 = A+B, 9 = START, croce/levetta = movimento.'];
      lines.forEach((l, i) => g.fillText(l, 480, 220 + i * 26));
      if (r.msg) { g.fillStyle = '#7dff8a'; g.fillText(r.msg, 480, 330); }
    } else if (!r.done) {
      g.fillText('Premi il tasto o pulsante per:', 480, 180);
      J.scenes.bigText(REMAP_STEPS[r.step][1], 480, 250, 40, Math.floor(t * 3) % 2 ? '#ffffff' : '#ffe14a');
      g.fillStyle = '#9fd8ff'; g.fillText('Passo ' + (r.step + 1) + ' di ' + REMAP_STEPS.length + (r.last ? ' · ultimo: ' + r.last : ''), 480, 320);
    } else { J.scenes.bigText('COMANDI SALVATI!', 480, 260, 44, '#7dff8a'); }
    g.textAlign = 'left';
  }

  function updatePause() {
    const items = ['RIPRENDI', 'RIPARTI DAL CHECKPOINT', 'MUSICA ON/OFF', 'MENU PRINCIPALE'];
    game.pauseIndex = menuNav(items.length, game.pauseIndex);
    if (J.input.menuPressed('START')) { game.mode = 'play'; J.input.clearAll(); return; }
    if (J.input.menuPressed('A')) {
      sfx('select');
      if (game.pauseIndex === 0) { game.mode = 'play'; J.input.clearAll(); }
      else if (game.pauseIndex === 1) { const w = J.world; w.score = w.cpScore; spawnFromCheckpoint(w, w.cp); game.mode = 'play'; J.input.clearAll(); }
      else if (game.pauseIndex === 2) J.audio.toggleMusic();
      else { game.mode = 'title'; game.modeT = 0; J.audio.startMusic('title'); }
    }
  }
  function drawPause(t) {
    drawPlay();
    const g = J.g; g.fillStyle = 'rgba(0,0,20,0.6)'; g.fillRect(0, 0, VW, VH);
    J.scenes.bigText('PAUSA', 480, 150, 64, '#ffe14a');
    ['RIPRENDI', 'RIPARTI DAL CHECKPOINT', 'MUSICA ON/OFF', 'MENU PRINCIPALE'].forEach((l, i) => {
      g.font = 'bold 24px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillStyle = i === game.pauseIndex ? '#ffe14a' : '#fff';
      g.fillText((i === game.pauseIndex ? '▶ ' : '') + l, 480, 230 + i * 44);
    });
    g.textAlign = 'left';
  }

  function updateGameOver() {
    if (game.modeT > 1 && J.input.menuPressed('START')) { const w = J.world; w.lives = 3; w.score = w.cpScore = 0; game.saveNow(); spawnFromCheckpoint(w, w.cp); game.mode = 'play'; J.input.clearAll(); }
    if (game.modeT > 1 && J.input.menuPressed('B')) { game.mode = 'title'; game.modeT = 0; J.audio.startMusic('title'); }
    if (game.modeT > 15) { game.mode = 'title'; game.modeT = 0; J.audio.startMusic('title'); }
  }
  function drawGameOver(t) {
    const g = J.g; g.fillStyle = '#0a0612'; g.fillRect(0, 0, VW, VH);
    J.scenes.bigText('GAME OVER', 480, 220, 90, '#ff4a3a');
    g.font = 'bold 20px Arial'; g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText('START: continua dal checkpoint (' + J.world.level.checkpoints[J.world.cp].label + ')', 480, 300);
    g.fillText('B: menu principale · ritorno automatico tra ' + Math.max(0, Math.ceil(15 - game.modeT)) + 's', 480, 334);
    g.textAlign = 'left';
  }
  function updateComplete() { if (game.modeT > 1.5 && confirm()) { game.mode = 'levels'; game.modeT = 0; game.levelsIndex = 1; } }
  function drawComplete(t) {
    const g = J.g; const w = J.world;
    g.fillStyle = '#13205a'; g.fillRect(0, 0, VW, VH);
    J.scenes.speedLines(480, 270, t, 'rgba(255,200,80,0.25)', 50);
    g.save(); g.translate(250, 500); g.scale(3.6, 3.6); J.spr.drawHumanoid(J.spr.JEEG, J.spr.pose('cheer', t)); g.restore();
    J.scenes.bigText('LIVELLO 1 COMPLETATO!', 600, 110, 48, '#ffe14a', '#c8302a');
    g.font = 'bold 22px Arial'; g.fillStyle = '#fff';
    const rows = [['Nemici sconfitti', w.kills], ['Tempo', game.stats.time + ' s'], ['Bonus vite + tempo', game.stats.bonus], ['PUNTEGGIO', w.score], ['Hi-score', hiscore()]];
    rows.forEach((r, i) => { g.fillText(r[0], 470, 190 + i * 40); g.textAlign = 'right'; g.fillText(String(r[1]), 880, 190 + i * 40); g.textAlign = 'left'; });
    g.fillStyle = '#7dff8a'; g.fillText('Livello 2 "Il rapimento di Mayumi" sbloccato (in sviluppo)', 420, 420);
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ffe14a'; g.fillText('Premi A / START', 560, 470); }
  }

  /* ===================== CICLO PRINCIPALE ===================== */
  function step(dt) {
    J.input.update();
    game.modeT += dt;
    switch (game.mode) {
      case 'title': updateTitle(dt); break;
      case 'levels': updateLevels(); break;
      case 'remap': updateRemap(); break;
      case 'play': updatePlay(dt); break;
      case 'pause': updatePause(); break;
      case 'gameover': updateGameOver(); break;
      case 'complete': updateComplete(); break;
    }
  }
  function render(t) {
    const g = J.g;
    g.setTransform(J.scale, 0, 0, J.scale, 0, 0);
    switch (game.mode) {
      case 'title': drawTitle(t); break;
      case 'levels': drawLevels(t); break;
      case 'remap': drawRemap(t); break;
      case 'play': drawPlay(); break;
      case 'pause': drawPause(t); break;
      case 'gameover': drawGameOver(t); break;
      case 'complete': drawComplete(t); break;
    }
  }

  let last = 0, acc = 0, clock = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    acc += dt * (game.timeScale || 1);
    let n = 0;
    while (acc >= J.DT && n < 8) { step(J.DT); acc -= J.DT; clock += J.DT; n++; }
    if (n >= 8) acc = 0;
    render(clock);
    requestAnimationFrame(frame);
  }

  function resize() {
    const cv = J.canvas; const wrap = cv.parentElement;
    const aw = wrap.clientWidth, ah = wrap.clientHeight;
    const s = Math.min(aw / VW, ah / VH);
    const cssW = Math.floor(VW * s), cssH = Math.floor(VH * s);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    J.scale = cv.width / VW;
  }

  game.boot = function (canvas) {
    J.canvas = canvas; J.g = canvas.getContext('2d'); J.spr.setCtx(J.g);
    resize(); addEventListener('resize', resize);
    addEventListener('keydown', (e) => { if (e.code === 'KeyF') toggleFullscreen(); if (e.code === 'KeyM') J.audio.toggleMusic(); });
    J.audio.startMusic('title');
    requestAnimationFrame(frame);
  };
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
  game.toggleFullscreen = toggleFullscreen;

  /* API di debug / test automatici */
  window.JEEG = {
    get world() { return J.world; }, get mode() { return game.mode; }, game,
    start: (fromSave) => startLevel(fromSave), god: (v) => (game.godMode = v !== false),
    teleport: (x) => { J.world.player.x = x; }, input: J.input,
  };
})();
