/* scenes.js — sequenze narrative giocabili: dialoghi, trasformazione, BUILD UP col Big Shooter, intro boss, vittoria. */
'use strict';
(function () {
  const W = () => J.world;
  const E = () => J.ent;
  const sfx = (n) => J.audio.play(n);
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));

  /* ---------- testo stile anime ---------- */
  function bigText(text, x, y, size, fill, stroke, align) {
    const g = J.g;
    g.font = 'bold ' + size + 'px Impact, "Arial Black", sans-serif'; g.textAlign = align || 'center'; g.lineJoin = 'round';
    g.lineWidth = size / 4.5; g.strokeStyle = stroke || '#1b1020'; g.strokeText(text, x, y);
    g.fillStyle = fill || '#ffe14a'; g.fillText(text, x, y); g.textAlign = 'left';
  }
  function speedLines(cx, cy, t, col, n) {
    const g = J.g; g.save(); g.strokeStyle = col || 'rgba(255,255,255,0.5)';
    for (let i = 0; i < (n || 40); i++) {
      const a = (i / (n || 40)) * Math.PI * 2 + Math.sin(i * 7.3) * 0.1;
      const r0 = 120 + ((i * 53 + t * 900) % 200), r1 = r0 + 300;
      g.lineWidth = 2 + (i % 3) * 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    g.restore();
  }
  /* pannello cut-in diagonale con ritratto */
  function cutIn(k, side, bg, drawPortrait, label, sub) {
    const g = J.g; const VW = J.VIEW_W;
    const slide = ease(k);
    const y0 = 120, h = 220;
    g.save();
    g.translate(side > 0 ? (1 - slide) * VW : -(1 - slide) * VW, 0);
    g.beginPath(); g.moveTo(0, y0 + 30); g.lineTo(VW, y0); g.lineTo(VW, y0 + h); g.lineTo(0, y0 + h + 30); g.closePath();
    g.fillStyle = bg; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1b1020'; g.stroke();
    g.save(); g.clip(); speedLines(side > 0 ? 260 : 700, y0 + h / 2, J.world ? J.world.t : 0, 'rgba(255,255,255,0.35)', 36);
    drawPortrait(side > 0 ? 240 : 720, y0 + h / 2 + 10);
    g.restore();
    g.lineWidth = 4; g.strokeStyle = '#ffe14a'; g.beginPath(); g.moveTo(0, y0 + 36); g.lineTo(VW, y0 + 6); g.stroke();
    g.beginPath(); g.moveTo(0, y0 + h + 24); g.lineTo(VW, y0 + h - 6); g.stroke();
    bigText(label, side > 0 ? 640 : 320, y0 + h / 2 + 4, 44, '#ffe14a');
    if (sub) bigText(sub, side > 0 ? 640 : 320, y0 + h / 2 + 46, 22, '#ffffff');
    g.restore();
  }

  /* ---------- DIALOGO ---------- */
  function dialog(lines, onDone) {
    let i = 0, t = 0;
    return {
      kind: 'dialog', blocksPlay: true,
      update(dt) {
        t += dt;
        if (t > 0.25 && (J.input.menuPressed('A') || J.input.menuPressed('B') || J.input.menuPressed('START'))) { i++; t = 0; sfx('select'); if (i >= lines.length) { this.done = true; J.input.clearAll(); onDone && onDone(); } }
      },
      drawScreen() {
        const L = lines[Math.min(i, lines.length - 1)]; const g = J.g;
        const y = 360;
        g.fillStyle = 'rgba(10,14,40,0.88)'; g.fillRect(30, y, 900, 150); g.lineWidth = 4; g.strokeStyle = '#ffe14a'; g.strokeRect(30, y, 900, 150);
        let tx = 60;
        if (L.portrait) {
          g.save(); g.beginPath(); g.rect(40, y + 10, 140, 130); g.clip(); g.fillStyle = L.bg || '#2f6fd2'; g.fillRect(40, y + 10, 140, 130);
          if (L.portrait === 'hiroshi') J.spr.portraitHiroshi(110, y + 92, 0.8, W().t);
          if (L.portrait === 'miwa') J.spr.portraitMiwa(110, y + 92, 0.85, W().t);
          g.restore(); g.strokeStyle = '#1b1020'; g.lineWidth = 3; g.strokeRect(40, y + 10, 140, 130);
          tx = 200;
        }
        g.font = 'bold 22px Impact, "Arial Black", sans-serif'; g.fillStyle = L.col || '#ffe14a'; g.fillText(L.who || '', tx, y + 38);
        g.font = '20px "Trebuchet MS", Arial, sans-serif'; g.fillStyle = '#ffffff';
        wrap(L.text, tx, y + 70, 930 - tx - 20, 26);
        if (Math.floor(t * 3) % 2 === 0) { g.font = 'bold 15px Arial'; g.fillStyle = '#ffe14a'; g.textAlign = 'right'; g.fillText('A / START ▶', 915, y + 140); g.textAlign = 'left'; }
      },
    };
  }
  function wrap(text, x, y, maxW, lh) {
    const g = J.g; const words = text.split(' '); let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test; }
    if (line) g.fillText(line, x, y);
  }

  /* ---------- TRASFORMAZIONE 1: Hiroshi umano → forma intermedia (cyborg) ---------- */
  function transformCyborg() {
    const w = W(); const p = w.player; let t = 0; let switched = false;
    p.vx = 0; p.state = 'normal'; p.atk = null;
    sfx('transform');
    return {
      kind: 'transform', blocksPlay: true, hidePlayer: true,
      update(dt) {
        t += dt; p.vx = 0;
        if (t > 1.0 && Math.random() < 0.6) E().particle({ kind: 'magnet', x: p.x + E().rnd(-40, 40), y: p.y - E().rnd(10, 90), vx: E().rnd(-200, 200), vy: E().rnd(-200, 200), life: 0.25 });
        if (t > 1.55 && !switched) { switched = true; E().setForm(p, 'cyborg'); p.hp = 100; J.game.shake(6); E().sparks(p.x, p.y - 45, 24, '#fff6b0', 420, 3); sfx('magnet'); }
        if (t > 2.9) { this.done = true; J.game.msg('FORMA CYBORG! Ora premi T per chiamare Miwa: BUILD UP con il Big Shooter!', 5); J.game.saveNow(); }
      },
      drawWorld() {
        const g = J.g; const S = J.spr;
        // aura
        const k = Math.min(1, t / 1.5);
        g.globalAlpha = 0.25 + 0.25 * Math.sin(t * 30); S.circ(p.x, p.y - 45, 40 + k * 40, '#fff6a0', 0); g.globalAlpha = 1;
        g.save(); g.translate(p.x, p.y); g.scale(p.face, 1);
        if (t < 1.55) {
          // Hiroshi unisce i pugni (pose rif. 02); lampeggia con la sagoma del cyborg
          const flick = t > 1.0 && Math.floor(t * (10 + t * 20)) % 2 === 0;
          if (flick) S.drawHumanoid(S.CYBORG, S.pose('fists', t)); else S.drawHumanoid(S.HIRO_G, S.pose('fists', t));
        } else S.drawHumanoid(S.CYBORG, S.pose(t < 2.2 ? 'cheer' : 'idle', t));
        g.restore();
      },
      drawScreen() {
        const g = J.g;
        if (t < 1.0) cutIn(Math.min(1, t / 0.25) - Math.max(0, (t - 0.8) / 0.2), 1, '#c8302a', (x, y) => J.spr.portraitHiroshi(x, y, 1.05, t), 'UNIONE DEI GUANTI!', 'Hiroshi Shiba');
        if (t > 1.45 && t < 1.75) { g.globalAlpha = 1 - Math.abs(t - 1.6) / 0.15; g.fillStyle = '#ffffff'; g.fillRect(0, 0, J.VIEW_W, J.VIEW_H); g.globalAlpha = 1; }
        if (t > 1.6) bigText('FORMA CYBORG', 480, 120, 54, '#ffe14a');
      },
    };
  }

  /* ---------- TRASFORMAZIONE 2: testa di Jeeg + BUILD UP magnetico dal Big Shooter ---------- */
  function buildUp() {
    const w = W(); const p = w.player; let t = 0;
    const gy = w.level.groundY;
    const baseX = p.x; const face = p.face;
    const airY = gy - 210; // altezza dei piedi durante l'assemblaggio in volo
    const LAUNCH = { torso: 2.7, armB: 3.25, armF: 3.6, legB: 4.0, legF: 4.35 };
    const attached = {};
    let shooter = { x: baseX + 2200, y: gy - 640 };
    J.game.setZoom(0.52);
    sfx('transform');
    p.vx = 0; p.atk = null; p.state = 'normal';
    const stages = { headDone: false, landed: false };
    return {
      kind: 'buildup', blocksPlay: true, hidePlayer: true,
      update(dt) {
        t += dt;
        // Big Shooter: entra da destra, si posiziona sopra la testa, poi riparte
        const sx = t < 1.6 ? baseX + 2200 : t < 2.6 ? baseX + 2200 - ease((t - 1.6) / 1.0) * 1700 : t < 4.6 ? baseX + 500 - (t - 2.6) * 40 : baseX + 420 - (t - 4.6) * 1600;
        const sy = t < 4.6 ? gy - 640 + Math.sin(t * 3) * 12 : gy - 640 - (t - 4.6) * 300;
        shooter.x = sx; shooter.y = sy;
        if (t > 1.6 && t < 1.62) sfx('shooter');
        if (t > 0.95 && !stages.headDone) { stages.headDone = true; E().sparks(baseX, airY - 280, 30, '#fff6b0', 600, 5); J.game.shake(8); sfx('magnet'); }
        for (const k in LAUNCH) {
          if (!attached[k] && t > LAUNCH[k] + 0.45) { attached[k] = true; sfx('magnet'); J.game.shake(7); const pos = partWorldPos(k); for (let i = 0; i < 10; i++) E().particle({ kind: 'magnet', x: pos.x, y: pos.y, vx: E().rnd(-300, 300), vy: E().rnd(-300, 300), life: 0.35 }); E().sparks(pos.x, pos.y, 14, '#bfe9ff', 500, 4); }
          if (t > LAUNCH[k] && t < LAUNCH[k] + 0.03) sfx('whoosh');
        }
        if (t > 4.9 && !stages.landed && t > 5.25) { stages.landed = true; E().dust(baseX, gy, 16, 3); J.game.shake(14); sfx('slam'); }
        if (t > 6.3) {
          this.done = true;
          E().setForm(p, 'jeeg'); p.x = baseX; p.y = gy; p.vy = 0; p.hp = 100; p.en = 100; p.face = face;
          J.game.onJeegAssembled();
        }
      },
      drawWorld() {
        const g = J.g; const S = J.spr;
        // Jeeg in volo durante il montaggio, poi atterra
        const fall = t > 4.9 ? ease((t - 4.9) / 0.35) : 0;
        const feetY = airY + (gy - airY) * fall;
        if (t < 0.95) {
          // il cyborg salta e si raccoglie: diventa la testa di Jeeg
          const k = ease(t / 0.9);
          const y = gy - k * (gy - (airY - 300));
          g.save(); g.translate(baseX, y); g.scale(face, 1); g.rotate(k * Math.PI * 2 * face);
          S.drawHumanoid(S.CYBORG, S.pose('jump', t)); g.restore();
          g.globalAlpha = k * 0.6; S.circ(baseX, y - 40, 40 + k * 60, '#fff6a0', 0); g.globalAlpha = 1;
          return;
        }
        // magnetismo: anello pulsante intorno alla testa
        g.globalAlpha = 0.3 + 0.2 * Math.sin(t * 25); S.circ(baseX, feetY - 280, 60 + Math.sin(t * 12) * 8, '#9fd8ff', 0); g.globalAlpha = 1;
        // parti in volo dal Big Shooter
        const off = {};
        for (const k of ['torso', 'armB', 'armF', 'legB', 'legF']) {
          const l = LAUNCH[k];
          if (t < l) { off[k] = { hide: true }; continue; }
          const q = ease(Math.min(1, (t - l) / 0.45));
          const fin = partWorldPos(k, feetY);
          const sx = shooter.x, sy = shooter.y + 30;
          const cx = sx + (fin.x - sx) * q, cy = sy + (fin.y - sy) * q - Math.sin(q * Math.PI) * 120;
          off[k] = { x: ((cx - fin.x) / 3) * face, y: (cy - fin.y) / 3 };
        }
        g.save(); g.translate(baseX, feetY); g.scale(face * 3, 3);
        S.drawHumanoid(S.JEEG, S.pose(t > 5.3 ? 'cheer' : 'idle', t), off);
        g.restore();
        // Big Shooter (rif. 15) pilotato da Miwa
        g.save(); g.translate(shooter.x, shooter.y); g.scale(-2.6, 2.6); S.drawBigShooter(t, true); g.restore();
      },
      drawScreen() {
        const g = J.g;
        if (t > 0.85 && t < 1.1) { g.globalAlpha = 1 - Math.abs(t - 0.95) / 0.15; g.fillStyle = '#ffffff'; g.fillRect(0, 0, J.VIEW_W, J.VIEW_H); g.globalAlpha = 1; }
        if (t > 0.95 && t < 1.7) bigText('TESTA DI JEEG!', 480, 110, 46, '#ffe14a');
        if (t > 1.55 && t < 2.6) cutIn(Math.min(1, (t - 1.55) / 0.2) - Math.max(0, (t - 2.4) / 0.2), -1, '#2f6fd2', (x, y) => J.spr.portraitMiwa(x, y, 1.15, t), 'MIWA, LANCIA I COMPONENTI!', 'Big Shooter — Miwa Uzuki');
        if (t > 2.7 && t < 4.9) bigText('AGGANCIO MAGNETICO', 480, 70, 34, '#9fd8ff');
        if (t > 5.2) { const k = Math.min(1, (t - 5.2) / 0.2); g.save(); g.translate(480, 150); g.scale(0.6 + k * 0.4, 0.6 + k * 0.4); bigText('BUILD UP!', 0, 0, 92, '#ffe14a', '#c8302a'); g.restore(); bigText('JEEG ROBOT D\'ACCIAIO', 480, 200, 30, '#ffffff'); }
      },
    };
    function partWorldPos(k, feetY) {
      feetY = feetY == null ? airY : feetY;
      const local = { torso: [0, -60], armB: [1, -62], armF: [1, -62], legB: [0, -30], legF: [0, -30] }[k];
      return { x: baseX + local[0] * 3 * face, y: feetY + local[1] * 3 };
    }
  }

  /* ---------- INTRO BOSS ---------- */
  function bossIntro(boss) {
    let t = 0;
    J.audio.startMusic('boss'); sfx('bossWarn');
    return {
      kind: 'bossintro', blocksPlay: true,
      update(dt) { t += dt; if (t > 0.6 && t < 0.62) { J.game.shake(14); sfx('slam'); } if (t > 2.6) { this.done = true; boss.active = true; boss.state = 'idle'; boss.at = 0; J.game.msg('Sconfiggi il ' + boss.name + '! Osserva i segnali "!" prima degli attacchi.', 4); } },
      drawScreen() {
        const g = J.g; const k = Math.min(1, t / 0.3);
        g.fillStyle = 'rgba(0,0,0,' + 0.45 * k + ')'; g.fillRect(0, 190, J.VIEW_W, 120);
        bigText('WARNING', 480, 240 - (1 - k) * 40, 40, '#ff4a2a');
        bigText(boss.name, 480, 290, 50, '#ffe14a');
      },
    };
  }

  /* ---------- VITTORIA ---------- */
  function victory(onDone) {
    let t = 0; const p = W().player;
    J.audio.stopMusic(); sfx('win');
    return {
      kind: 'victory', blocksPlay: true, forcePose: 'cheer',
      update(dt) { t += dt; p.vx = 0; p.anim = 'cheer'; if (t > 2.2) { this.done = true; onDone(); } },
      drawScreen() { const k = Math.min(1, t / 0.4); const g = J.g; g.save(); g.translate(480, 200); g.scale(k, k); bigText('VITTORIA!', 0, 0, 90, '#ffe14a', '#c8302a'); g.restore(); },
    };
  }

  J.scenes = { dialog, transformCyborg, buildUp, bossIntro, victory, bigText, speedLines, cutIn, wrap };
})();
