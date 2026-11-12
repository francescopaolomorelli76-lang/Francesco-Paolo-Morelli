/* Fondali Mega Drive in stile arcade anni '90 (pixel esatti, retinature a scacchiera).
 * Piano B: panorama 512x224 (cielo al tramonto, Fuji, scogliera con fortezza Yamatai).
 * Piano A: ponte d'acciaio del circuito con guard-rail, torre con parabola, piattaforme. */
(function () {
  const TAU = Math.PI * 2;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function dither(g, x, y, w, h, c, phase) { g.fillStyle = c; for (let j = 0; j < h; j++) for (let i = (j + (phase || 0)) & 1; i < w; i += 2) g.fillRect(x + i, y + j, 1, 1); }
  function poly(g, pts, c) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fillStyle = c; g.fill(); }
  const OL = '#1b1020';

  /* ---------- cielo al tramonto a bande con retinatura ---------- */
  const SKY = {
    A: { bands: ['#22164e', '#3c2268', '#6a3486', '#a84488', '#e0647a', '#f6a070'], clouds: ['#ffc8a0', '#e8808a', '#7a3a7a'] },
    B: { bands: ['#240c30', '#4a1444', '#82224a', '#c04040', '#ea7a3a', '#f6a64a'], clouds: ['#ffc070', '#e86a4a', '#5a1e3a'] },
  };
  function sky(g, W, red) {
    const P = SKY[red ? 'B' : 'A']; const bands = P.bands; const bh = 25;
    bands.forEach((c, i) => { R(g, 0, i * bh, W, bh, c); if (i) dither(g, 0, i * bh - 3, W, 6, bands[i - 1], i); });
    R(g, 0, bands.length * bh, W, 224, bands[bands.length - 1]);
    // nuvole a strisce (luce sopra, ombra sotto)
    const r = rng(red ? 17 : 4);
    for (let k = 0; k < 8; k++) {
      const cy = 44 + Math.floor(r() * 80), cx = Math.floor(r() * W), len = 50 + Math.floor(r() * 90);
      for (let j = 0; j < 7; j++) {
        const w = len - Math.abs(j - 3) * 14, x0 = cx - w / 2;
        const c = j < 2 ? P.clouds[0] : j < 5 ? P.clouds[1] : P.clouds[2];
        for (const dx of [-W, 0, W]) R(g, x0 + dx + (j & 1) * 3, cy + j, w, 1, c);
      }
    }
  }
  /* ---------- Fuji innevato ---------- */
  function fuji(g, cx, base, h, w) {
    poly(g, [cx - w, base, cx - 14, base - h, cx + 14, base - h, cx + w, base], '#4a3a86');
    poly(g, [cx, base - h, cx + 14, base - h, cx + w, base, cx + w * 0.35, base], '#38306e');
    poly(g, [cx - 14, base - h, cx + 14, base - h, cx + 32, base - h + 26, cx + 20, base - h + 20, cx + 10, base - h + 30, cx, base - h + 22, cx - 12, base - h + 32, cx - 22, base - h + 22, cx - 34, base - h + 28], '#e8e4f4');
    poly(g, [cx + 4, base - h, cx + 14, base - h, cx + 32, base - h + 26, cx + 20, base - h + 20, cx + 10, base - h + 30], '#a8a0d0');
  }
  /* ---------- foresta di pini lontana ---------- */
  function forest(g, W, y, c1, c2, seed) {
    const r = rng(seed); R(g, 0, y + 8, W, 60, c1);
    for (let x = 0; x < W; x += 6) { const h = 8 + Math.floor(r() * 10); poly(g, [x - 4, y + 10, x + 3, y + 10 - h, x + 10, y + 10], r() > 0.5 ? c1 : c2); }
  }
  /* ---------- scogliera con fortezza Yamatai e volto di pietra ---------- */
  function fortress(g, cx, base) {
    // scogliera
    poly(g, [cx - 150, base, cx - 120, base - 50, cx - 90, base - 60, cx - 40, base - 68, cx + 60, base - 70, cx + 130, base - 60, cx + 170, base - 40, cx + 190, base], '#6a4466');
    poly(g, [cx + 60, base - 70, cx + 130, base - 60, cx + 170, base - 40, cx + 190, base, cx + 90, base], '#4e3050');
    for (let i = 0; i < 9; i++) { const x = cx - 120 + i * 34; R(g, x, base - 50 + (i % 3) * 6, 2, 30 + (i % 2) * 10, '#4e3050'); R(g, x + 2, base - 50 + (i % 3) * 6, 1, 22, '#8a6488'); }
    // vegetazione sul bordo
    for (let x = cx - 130; x < cx + 180; x += 7) R(g, x, base - 68 + Math.abs(Math.sin(x * 0.07)) * 10 + (x > cx + 60 ? 4 : 0), 6, 4, '#2e5a3a');
    const top = base - 70;
    // mura e torri
    const stone = '#8a7468', stoneL = '#b09a88', stoneD = '#5e4a46';
    R(g, cx - 90, top - 26, 180, 28, stone); R(g, cx - 90, top - 26, 180, 3, stoneL); R(g, cx + 60, top - 26, 30, 28, stoneD);
    for (let x = cx - 90; x < cx + 90; x += 10) R(g, x, top - 31, 6, 5, stone);
    for (const tx of [cx - 110, cx - 70, cx + 70, cx + 104]) {
      R(g, tx - 7, top - 52, 14, 54, stone); R(g, tx + 3, top - 52, 4, 54, stoneD); R(g, tx - 7, top - 52, 14, 2, stoneL);
      poly(g, [tx - 10, top - 52, tx, top - 64, tx + 10, top - 52], '#7a5a4a'); R(g, tx - 2, top - 44, 4, 6, '#f8c060');
    }
    // grande volto di pietra (haniwa) sopra il portale
    const fy = top - 76;
    R(g, cx - 24, fy, 48, 50, stone); R(g, cx + 12, fy, 12, 50, stoneD); R(g, cx - 24, fy, 48, 3, stoneL);
    R(g, cx - 30, fy - 6, 60, 8, stoneD);
    R(g, cx - 16, fy + 14, 10, 4, OL); R(g, cx + 6, fy + 14, 10, 4, OL);   // occhi
    R(g, cx - 14, fy + 11, 8, 2, stoneL); R(g, cx + 8, fy + 11, 8, 2, stoneL);
    R(g, cx - 3, fy + 18, 5, 12, stoneD); R(g, cx - 10, fy + 36, 20, 4, OL); // naso, bocca
    // portale illuminato e scalinata
    R(g, cx - 18, top - 28, 36, 30, OL); R(g, cx - 14, top - 24, 28, 26, '#e07a2a'); R(g, cx - 10, top - 20, 20, 22, '#f8c060');
    for (let s = 0; s < 6; s++) R(g, cx - 26 - s * 4, top + 2 + s * 4, 52 + s * 8, 4, s & 1 ? stoneD : stone);
    // stendardi rossi con simbolo
    for (const bx of [cx - 56, cx + 40]) { R(g, bx, top - 30, 16, 34, '#c8202a'); poly(g, [bx, top + 4, bx + 8, top - 2, bx + 16, top + 4], '#c8202a'); R(g, bx + 6, top - 22, 4, 16, OL); R(g, bx + 3, top - 16, 10, 3, OL); R(g, bx + 12, top - 30, 4, 34, '#8a1420'); }
    // fiaccole
    for (const fx of [cx - 36, cx + 32]) { R(g, fx, top - 4, 3, 8, OL); R(g, fx - 1, top - 9, 5, 5, '#f8c060'); R(g, fx, top - 11, 3, 3, '#ffe8a0'); }
  }

  function panorama(g, variant) {
    const W = 512; const red = variant === 'B';
    sky(g, W, red);
    fuji(g, red ? 120 : 150, 168, 70, 86);
    if (red) for (let i = 0; i < 4; i++) { const sx = 40 + i * 130; for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#3a2436' : '#4a2e44'; g.beginPath(); g.arc(sx + k * 5, 150 - k * 18, 9 + k * 4, 0, TAU); g.fill(); } }
    forest(g, W, 160, red ? '#2a2030' : '#1e3a3a', red ? '#3a2a38' : '#2a4c46', red ? 9 : 2);
    fortress(g, red ? 380 : 380, 196);
    if (red) for (let i = 0; i < 6; i++) { const x = 20 + i * 85; R(g, x, 186, 18, 6, '#f8a03a'); R(g, x + 4, 182, 10, 4, '#ffe08a'); }
    R(g, 0, 196, W, 28, red ? '#2a1a28' : '#24203a');
  }

  /* ---------- piano A: ponte del circuito ---------- */
  function deck(g, W, broken) {
    const top = 200;
    // guard-rail con montanti
    if (!broken) {
      for (let x = 0; x < W; x += 32) { R(g, x + 2, 166, 6, 34, '#5a5a86'); R(g, x + 2, 166, 2, 34, '#a8a8d0'); R(g, x + 7, 166, 1, 34, OL); }
      for (const ry of [170, 182]) { R(g, 0, ry, W, 5, '#8a8ab8'); R(g, 0, ry, W, 1, '#d0d0f0'); R(g, 0, ry + 4, W, 1, '#3e3e64'); }
    } else {
      for (let x = 0; x < W; x += 64) { R(g, x + 2, 176 + (x % 128 ? 6 : 0), 6, 24, '#5a5a86'); R(g, x + 2, 176, 2, 24, '#a8a8d0'); }
      for (let x = 0; x < W; x += 128) { R(g, x, 182, 70, 4, '#8a8ab8'); R(g, x + 70, 184, 10, 3, '#5a5a86'); }
    }
    // impalcato chiodato
    R(g, 0, top, W, 8, broken ? '#7a6a7a' : '#9a9ac8'); R(g, 0, top, W, 1, broken ? '#a89aa8' : '#d8d8f4'); R(g, 0, top + 7, W, 1, OL);
    for (let x = 0; x < W; x += 32) { R(g, x, top + 1, 1, 7, '#5a5a86'); R(g, x + 4, top + 3, 2, 2, '#e8e8ff'); R(g, x + 26, top + 3, 2, 2, '#e8e8ff'); }
    // travi reticolari
    R(g, 0, top + 8, W, 16, '#2c2c4a');
    for (let x = 0; x < W; x += 16) {
      g.strokeStyle = '#5a5a86'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, top + 9); g.lineTo(x + 16, top + 23); g.moveTo(x + 16, top + 9); g.lineTo(x, top + 23); g.stroke();
      R(g, x, top + 9, 2, 14, '#6e6ea0'); R(g, x + 7, top + 15, 2, 2, '#a8a8d0');
    }
    if (broken) for (let x = 40; x < W; x += 150) { poly(g, [x, top, x + 18, top, x + 12, top + 8, x + 4, top + 8], OL); poly(g, [x + 6, top + 1, x + 14, top + 1, x + 10, top + 5], '#f8a03a'); }
  }
  function tower(g, x) { // torre di controllo con parabola (trasmissioni del circuito)
    const top = 60, OLc = OL;
    R(g, x, top, 4, 140, '#4e4e78'); R(g, x + 76, top, 4, 140, '#4e4e78');
    for (let y = top; y < 200; y += 20) { g.strokeStyle = '#4e4e78'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 78, y + 20); g.moveTo(x + 78, y); g.lineTo(x + 2, y + 20); g.stroke(); }
    R(g, x + 6, 110, 100, 56, '#7a7aa6'); R(g, x + 6, 110, 100, 3, '#b8b8dc'); R(g, x + 86, 110, 20, 56, '#56567e'); R(g, x + 6, 165, 100, 2, OLc);
    for (let k = 0; k < 4; k++) { R(g, x + 12 + k * 18, 122, 12, 9, '#f8d070'); R(g, x + 12 + k * 18, 122, 12, 2, '#fff0b0'); R(g, x + 12 + k * 18, 140, 12, 9, '#f8d070'); }
    R(g, x + 4, 104, 106, 6, '#5a5a86'); R(g, x + 4, 104, 106, 1, '#b8b8dc');
    // parabola
    g.save(); g.translate(x + 60, 76); g.rotate(-0.5);
    g.fillStyle = '#c8c8e8'; g.beginPath(); g.ellipse(0, 0, 26, 12, 0, 0, TAU); g.fill();
    g.fillStyle = '#8a8ab8'; g.beginPath(); g.ellipse(4, 2, 20, 8, 0, 0, TAU); g.fill();
    g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 26, 12, 0, 0, TAU); g.stroke();
    g.restore(); R(g, x + 58, 84, 4, 20, '#5a5a86');
    g.strokeStyle = '#c8c8e8'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 60, 76); g.lineTo(x + 76, 58); g.stroke(); R(g, x + 75, 56, 3, 3, '#e83a2a');
  }
  function gantry(g, x) { // portale di partenza con bandiera a scacchi
    R(g, x, 40, 6, 130, '#5a5a86'); R(g, x + 150, 40, 6, 130, '#5a5a86'); R(g, x, 40, 2, 130, '#a8a8d0');
    R(g, x, 40, 156, 22, '#c8202a'); R(g, x, 40, 156, 2, '#f06a5a'); R(g, x, 61, 156, 1, OL);
    for (let i = 0; i < 19; i++) for (let j = 0; j < 2; j++) R(g, x + 3 + i * 8, 44 + j * 7, 8, 7, (i + j) & 1 ? OL : '#f0f0f0');
  }
  function tires(g, x) { for (let k = 0; k < 3; k++) { const y = 194 - k * 8; R(g, x - 14, y - 6, 28, 8, '#26263a'); R(g, x - 12, y - 6, 24, 2, '#4a4a66'); R(g, x - 6, y - 4, 12, 3, '#14141e'); } }
  function crate(g, x, y, w, h) {
    R(g, x, y, w, h, OL); R(g, x + 1, y + 1, w - 2, h - 2, '#a8582c');
    for (let yy = y + 2; yy < y + h - 2; yy += 8) { R(g, x + 2, yy, w - 4, 6, '#c8743c'); R(g, x + 2, yy, w - 4, 1, '#e89a5a'); }
    R(g, x + 1, y + 1, w - 2, 3, '#7a3a1a'); R(g, x + 1, y + h - 4, w - 2, 3, '#7a3a1a'); R(g, x + 1, y + 1, 3, h - 2, '#7a3a1a'); R(g, x + w - 4, y + 1, 3, h - 2, '#7a3a1a');
    g.strokeStyle = '#7a3a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + h - 4); g.stroke();
  }
  function ledge(g, x, y, w) {
    R(g, x, y, w, 10, OL); R(g, x + 1, y + 1, w - 2, 8, '#8a8ab8'); R(g, x + 1, y + 1, w - 2, 1, '#d0d0f0');
    for (let k = 0; k < w - 8; k += 12) poly(g, [x + 2 + k, y + 9, x + 8 + k, y + 9, x + 12 + k, y + 3, x + 6 + k, y + 3], '#f8c83a');
    for (const lx of [x + 6, x + w - 10]) { R(g, lx, y + 10, 4, 200 - y - 10, '#5a5a86'); R(g, lx, y + 10, 1, 200 - y - 10, '#a8a8d0'); }
  }
  function racecar(g, x, y, w, h) {
    poly(g, [x, y + h, x + 8, y + 14, x + 50, y, x + 120, y, x + w, y + 16, x + w, y + h], OL);
    poly(g, [x + 2, y + h - 1, x + 9, y + 15, x + 50, y + 2, x + 120, y + 2, x + w - 2, y + 17, x + w - 2, y + h - 1], '#2a50c8');
    R(g, x + 10, y + 16, w - 14, 3, '#5a86f0'); R(g, x + 10, y + 24, w - 14, 4, '#f0f0f0');
    poly(g, [x + 56, y + 2, x + 72, y - 12, x + 104, y - 12, x + 112, y + 2], '#88d4ea'); R(g, x + 74, y - 10, 20, 2, '#e8f8ff');
    for (const wx of [x + 32, x + w - 32]) { g.fillStyle = OL; g.beginPath(); g.arc(wx, y + h, 13, 0, TAU); g.fill(); g.fillStyle = '#9a9ab8'; g.beginPath(); g.arc(wx, y + h, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.font = 'bold 12px DejaVu Sans'; g.fillText('7', x + 84, y + 22);
  }
  function rubble(g, x, y, w, h) {
    poly(g, [x, y + h, x + 6, y + 16, x + 30, y, x + w - 40, y + 4, x + w, y + 24, x + w, y + h], OL);
    poly(g, [x + 2, y + h - 1, x + 8, y + 17, x + 31, y + 2, x + w - 41, y + 6, x + w - 2, y + 25, x + w - 2, y + h - 1], '#8a7e8e');
    poly(g, [x + w - 50, y + 8, x + w - 3, y + 26, x + w - 3, y + h - 2, x + w - 56, y + h - 2], '#62566a');
    for (let k = 0; k < 4; k++) R(g, x + 16 + k * 22, y + 14 + (k % 2) * 8, 2, h - 26, '#4a4054');
    for (let k = 0; k < 3; k++) R(g, x + 40 + k * 18, y + 20, 8, 3, '#a8a0b0');
  }
  function girder(g, x, y, w) {
    R(g, x, y, w, 12, OL); R(g, x + 1, y + 1, w - 2, 10, '#c4462e'); R(g, x + 1, y + 1, w - 2, 2, '#f07a5a');
    for (let k = 0; k < w; k += 16) { g.strokeStyle = '#7e2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + k, y + 11); g.lineTo(x + k + 8, y + 2); g.stroke(); }
    for (const lx of [x + 10, x + w - 18]) { R(g, lx, y + 12, 8, 200 - y - 12, '#7e7090'); R(g, lx, y + 12, 2, 200 - y - 12, '#b0a4c0'); }
  }
  function sign(g, x) { // cartello PERICOLO al cancello dei giganti
    R(g, x - 56, 70, 6, 130, '#5a5a86'); R(g, x + 50, 70, 6, 130, '#5a5a86');
    R(g, x - 60, 70, 120, 34, OL); R(g, x - 58, 72, 116, 30, '#f8c83a');
    for (let k = 0; k < 12; k++) poly(g, [x - 58 + k * 10, 102, x - 52 + k * 10, 102, x - 46 + k * 10, 96, x - 52 + k * 10, 96], OL);
    g.fillStyle = OL; g.font = 'bold 13px DejaVu Sans'; g.textAlign = 'center'; g.fillText('PERICOLO', x, 91); g.textAlign = 'left';
  }

  function stageA(g) {
    deck(g, 2304, false);
    tower(g, 8); gantry(g, 250); tires(g, 470); tires(g, 1020); tires(g, 1700);
    crate(g, 336, 148, 96, 52); ledge(g, 512, 120, 120); crate(g, 720, 156, 72, 44); ledge(g, 1136, 128, 144);
    ledge(g, 1328, 72, 112); racecar(g, 1488, 160, 168, 40); crate(g, 1792, 152, 88, 48); ledge(g, 1936, 108, 128);
    sign(g, 2176);
  }
  function stageB(g) {
    deck(g, 1728, true);
    rubble(g, 372, 148, 104, 52); girder(g, 772, 116, 120); rubble(g, 1012, 152, 88, 48);
    tires(g, 200); tires(g, 1240);
  }
  window.MDBG = { panorama, stageA, stageB, SKY };
})();
