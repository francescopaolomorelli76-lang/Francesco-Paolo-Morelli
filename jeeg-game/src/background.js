/* background.js — scenari dipinti stile fondali anime anni '70 (parallasse a più piani).
 * Livello 1: circuito / periferia → periferia devastata (zona giganti).
 */
'use strict';
(function () {
  const sp = () => J.spr;
  let layers = null;

  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function buildLayers() {
    layers = {};
    /* Montagne lontane */
    {
      const c = makeCanvas(1920, 300), x = c.getContext('2d'); const r = rng(7);
      const pts = []; for (let i = 0; i <= 24; i++) pts.push([i * 80, 120 + r() * 110]);
      pts[24][1] = pts[0][1];
      x.beginPath(); x.moveTo(0, 300); for (const p of pts) x.lineTo(p[0], p[1]); x.lineTo(1920, 300); x.closePath();
      x.fillStyle = '#7f8fc9'; x.fill(); x.strokeStyle = '#4c5a93'; x.lineWidth = 2; x.stroke();
      // ombreggiatura a lato
      for (let i = 0; i < 24; i++) {
        const a = pts[i], b = pts[i + 1];
        if (a[1] < b[1]) { x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(b[0] - 20, 300); x.lineTo(a[0] + 10, 300); x.closePath(); x.fillStyle = 'rgba(70,80,150,0.35)'; x.fill(); }
        if (a[1] < 150) { x.beginPath(); x.moveTo(a[0] - 18, a[1] + 22); x.lineTo(a[0], a[1]); x.lineTo(a[0] + 20, a[1] + 26); x.closePath(); x.fillStyle = '#eef2ff'; x.fill(); }
      }
      layers.mountains = c;
    }
    /* Colline verdi */
    {
      const c = makeCanvas(1920, 220), x = c.getContext('2d'); const r = rng(21);
      x.beginPath(); x.moveTo(0, 220);
      for (let i = 0; i <= 1920; i += 40) x.lineTo(i, 70 + Math.sin(i / 180) * 30 + Math.sin(i / 70) * 10 + r() * 6);
      x.lineTo(1920, 220); x.closePath(); x.fillStyle = '#4f9a5c'; x.fill(); x.strokeStyle = '#2b5f3a'; x.lineWidth = 2; x.stroke();
      for (let i = 0; i < 40; i++) { const tx = r() * 1920, ty = 100 + r() * 60; x.beginPath(); x.ellipse(tx, ty, 18 + r() * 14, 12 + r() * 6, 0, 0, Math.PI * 2); x.fillStyle = r() > 0.5 ? '#3c8049' : '#5aae66'; x.fill(); x.strokeStyle = '#25502f'; x.lineWidth = 1.5; x.stroke(); }
      layers.hills = c;
    }
    /* Periferia: palazzi */
    {
      const c = makeCanvas(1920, 300), x = c.getContext('2d'); const r = rng(99);
      let px = 0;
      while (px < 1920) {
        const w = 70 + r() * 90, h = 90 + r() * 170; const cols = ['#d8c9a8', '#b9c3cf', '#c9b1a0', '#a8b7c9', '#e1d7c0'];
        const col = cols[Math.floor(r() * cols.length)];
        x.fillStyle = col; x.fillRect(px, 300 - h, w, h);
        x.fillStyle = 'rgba(40,40,80,0.18)'; x.fillRect(px + w * 0.7, 300 - h, w * 0.3, h);
        x.strokeStyle = '#3a3550'; x.lineWidth = 2; x.strokeRect(px, 300 - h, w, h);
        x.fillStyle = '#5b6b96';
        for (let wy = 300 - h + 12; wy < 290; wy += 22) for (let wx = px + 10; wx < px + w - 14; wx += 20) if (r() > 0.15) x.fillRect(wx, wy, 10, 12);
        if (r() > 0.6) { x.fillStyle = '#c0392b'; x.fillRect(px + w / 2 - 2, 300 - h - 26, 4, 26); }
        px += w + 6 + r() * 30;
      }
      layers.city = c;
    }
    /* Periferia devastata */
    {
      const c = makeCanvas(1920, 300), x = c.getContext('2d'); const r = rng(5);
      let px = 0;
      while (px < 1920) {
        const w = 80 + r() * 110, h = 60 + r() * 170;
        x.beginPath(); x.moveTo(px, 300); x.lineTo(px, 300 - h);
        const n = 3 + Math.floor(r() * 4);
        for (let k = 1; k <= n; k++) x.lineTo(px + (w * k) / n, 300 - h + (r() * 60 - 10));
        x.lineTo(px + w, 300); x.closePath();
        x.fillStyle = r() > 0.5 ? '#6f5f6e' : '#7d6a62'; x.fill(); x.strokeStyle = '#2a1f2c'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#2b2236';
        for (let wy = 300 - h + 30; wy < 290; wy += 24) for (let wx = px + 10; wx < px + w - 12; wx += 22) if (r() > 0.35) x.fillRect(wx, wy, 9, 12);
        px += w + r() * 40;
      }
      layers.ruins = c;
    }
  }

  function tile(img, offset, y, scale) {
    const w = img.width * scale;
    let x = -((offset % w) + w) % w;
    for (; x < J.VIEW_W; x += w) J.g.drawImage(img, x, y, w, img.height * scale);
  }

  /* fattore di "devastazione" in base alla posizione (0 = circuito, 1 = zona giganti) */
  function ruinMix(camX) { return Math.max(0, Math.min(1, (camX - 2000) / 900)); }

  function drawSky(cam, t) {
    const g = J.g; const m = ruinMix(cam.x);
    const gr = g.createLinearGradient(0, 0, 0, J.VIEW_H);
    if (m < 1) { gr.addColorStop(0, '#2f6fd2'); gr.addColorStop(0.55, '#86c3ef'); gr.addColorStop(1, '#e8f2f0'); }
    g.fillStyle = gr; g.fillRect(0, 0, J.VIEW_W, J.VIEW_H);
    if (m > 0) {
      const g2 = g.createLinearGradient(0, 0, 0, J.VIEW_H);
      g2.addColorStop(0, '#3b2a5e'); g2.addColorStop(0.5, '#c0574a'); g2.addColorStop(1, '#f2b06a');
      g.globalAlpha = m; g.fillStyle = g2; g.fillRect(0, 0, J.VIEW_W, J.VIEW_H); g.globalAlpha = 1;
    }
    // nuvole cel-shaded
    const r = rng(3);
    for (let i = 0; i < 7; i++) {
      const bx = r() * 1800, by = 40 + r() * 130, s = 0.7 + r() * 0.8;
      let x = ((bx - cam.x * 0.05 - t * 6) % 1900 + 1900) % 1900 - 200;
      drawCloud(x, by, s, m);
    }
  }
  function drawCloud(x, y, s, m) {
    const g = J.g;
    const base = m > 0.5 ? '#e7a7a0' : '#ffffff', sh = m > 0.5 ? '#a9617a' : '#b9d4ee';
    const blobs = [[0, 0, 40], [38, -14, 34], [74, 0, 38], [30, 10, 36], [-30, 8, 26], [104, 10, 24]];
    g.save(); g.translate(x, y); g.scale(s, s * 0.8);
    g.fillStyle = '#5a6ea0';
    for (const b of blobs) { g.beginPath(); g.arc(b[0], b[1], b[2] + 2.5, 0, 7); g.fill(); }
    g.fillStyle = base; for (const b of blobs) { g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fill(); }
    g.fillStyle = sh; for (const b of blobs) { g.beginPath(); g.arc(b[0] + 4, b[1] + b[2] * 0.45, b[2] * 0.62, 0, 7); g.fill(); }
    g.restore();
  }

  function drawParallax(cam, t) {
    if (!layers) buildLayers();
    const g = J.g; const z = cam.zoom; const m = ruinMix(cam.x);
    const horizon = 300 + (1 - z) * 60;
    tile(layers.mountains, cam.x * 0.06, horizon - 200, 1);
    tile(layers.hills, cam.x * 0.12, horizon - 60, 1);
    const cityY = horizon - 120 + (1 - z) * 20;
    if (m < 1) { g.globalAlpha = 1 - m; tile(layers.city, cam.x * 0.25, cityY, 0.9 + (z - 0.52) * 0.2); }
    if (m > 0) { g.globalAlpha = m; tile(layers.ruins, cam.x * 0.25, cityY, 1); }
    g.globalAlpha = 1;
    // colonne di fumo nella zona dei giganti
    if (m > 0) {
      for (let i = 0; i < 4; i++) {
        const sx = ((i * 520 - cam.x * 0.3) % 2080 + 2080) % 2080 - 100;
        for (let k = 0; k < 6; k++) {
          const yy = cityY + 40 - k * 45 - ((t * 20) % 45), rr = 22 + k * 9;
          g.globalAlpha = m * (0.55 - k * 0.07);
          g.fillStyle = k % 2 ? '#4a3b4f' : '#5b4a5d';
          g.beginPath(); g.arc(sx + Math.sin(t + k + i) * 10 + k * 8, yy, rr, 0, 7); g.fill();
        }
        g.globalAlpha = m * 0.8; g.fillStyle = '#ff9a3a';
        g.beginPath(); g.ellipse(sx, cityY + 70, 20, 8 + Math.sin(t * 9 + i) * 3, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  /* ---- elementi in coordinate MONDO (già trasformati da camera) ---- */
  function drawWorldBack(cam, level, t) {
    const g = J.g; const S = sp();
    const x0 = cam.x - 40, x1 = cam.x + J.VIEW_W / cam.zoom + 40; const gy = level.groundY;
    // tribune del circuito (solo zona iniziale)
    if (x0 < 2700) {
      for (let bx = Math.floor(x0 / 600) * 600; bx < Math.min(x1, 2700); bx += 600) {
        if (bx < 0) continue;
        S.poly([bx + 40, gy - 30, bx + 70, gy - 150, bx + 330, gy - 150, bx + 360, gy - 30], '#c9ccd6', 2);
        for (let k = 0; k < 6; k++) S.line(bx + 64 - k * 4 + 4, gy - 140 + k * 18, bx + 336 + k * 4 - 4, gy - 140 + k * 18, '#8d93a8', 2);
        // pubblico stilizzato
        for (let k = 0; k < 26; k++) for (let row = 0; row < 3; row++) { const cx = bx + 90 + k * 9.5 + (row % 2) * 4, cy = gy - 128 + row * 18; S.circ(cx, cy, 3.2, ['#e05a4a', '#4a7ae0', '#f2d34a', '#ffffff'][(k + row) % 4], 0); }
        S.poly([bx + 60, gy - 150, bx + 70, gy - 175, bx + 330, gy - 175, bx + 340, gy - 150], '#d7472f', 2);
        g.fillStyle = '#fff'; g.font = 'bold 16px Impact, "Arial Black", sans-serif'; g.fillText('CIRCUITO', bx + 160, gy - 156);
      }
      // recinzione
      for (let fx = Math.floor(x0 / 30) * 30; fx < Math.min(x1, 2700); fx += 30) { if (fx < 0) continue; S.line(fx, gy - 34, fx, gy - 4, '#6c7183', 2); }
      S.line(Math.max(0, x0), gy - 32, Math.min(x1, 2700), gy - 32, '#6c7183', 2.5);
      S.line(Math.max(0, x0), gy - 18, Math.min(x1, 2700), gy - 18, '#6c7183', 1.5);
      // pile di pneumatici
      for (const tx of [300, 1100, 1700, 2560]) if (tx > x0 - 50 && tx < x1) for (let k = 0; k < 3; k++) { S.ell(tx, gy - 6 - k * 10, 18, 6, '#26262c', 0, 1.6); S.ell(tx, gy - 6 - k * 10, 9, 3, '#4a4a52', 0, 0); }
      // moto di Hiroshi parcheggiata (decorazione)
      if (x0 < 260) drawBike(160, gy, t);
    }
    // grande striscione "zona pericolosa" al cancello dei giganti
    const gx = level.giantGateX;
    if (gx > x0 - 300 && gx < x1 + 300) {
      for (let k = -1; k <= 1; k += 2) S.cap(gx + k * 70, gy, gx + k * 70, gy - 260, 6, '#8a8f9e', '#5d6170');
      S.poly([gx - 76, gy - 255, gx + 76, gy - 255, gx + 76, gy - 205, gx - 76, gy - 205], '#f2d23a', 2);
      for (let k = 0; k < 8; k++) S.polyNoOl([gx - 76 + k * 19, gy - 205, gx - 66 + k * 19, gy - 205, gx - 76 + k * 19 + 10, gy - 215, gx - 76 + k * 19, gy - 215], '#1b1020');
      g.fillStyle = '#1b1020'; g.font = 'bold 15px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('PERICOLO', gx, gy - 232); g.textAlign = 'left';
    }
    // zona devastata: crateri e auto rovesciate
    if (x1 > 2700) {
      for (let cx = Math.max(2800, Math.floor(x0 / 700) * 700 + 300); cx < x1; cx += 700) {
        S.ell(cx, gy + 4, 110, 16, '#5a4636', 0, 2); S.ell(cx, gy + 2, 80, 9, '#3b2d24', 0, 0);
      }
    }
  }
  function drawBike(x, gy, t) {
    const S = sp();
    S.circ(x - 28, gy - 14, 13, '#1f1f24', 2); S.circ(x - 28, gy - 14, 6, '#c8ccd6', 1.4);
    S.circ(x + 30, gy - 14, 13, '#1f1f24', 2); S.circ(x + 30, gy - 14, 6, '#c8ccd6', 1.4);
    S.poly([x - 30, gy - 22, x - 10, gy - 40, x + 22, gy - 40, x + 34, gy - 22, x + 8, gy - 18], '#f2f2f2', 2);
    S.poly([x - 6, gy - 40, x + 14, gy - 48, x + 26, gy - 40], '#d7322a', 1.8);
    S.line(x + 22, gy - 40, x + 28, gy - 54, '#3a3a44', 2.5);
  }

  function drawGround(cam, level) {
    const g = J.g; const S = sp(); const gy = level.groundY;
    const x0 = cam.x - 50, x1 = cam.x + J.VIEW_W / cam.zoom + 50;
    // asfalto pista
    const sx0 = Math.max(x0, -200), sx1 = Math.min(x1, 2750);
    if (sx1 > sx0) {
      g.fillStyle = '#56565f'; g.fillRect(sx0, gy, sx1 - sx0, 400);
      g.fillStyle = '#6a6a74'; g.fillRect(sx0, gy + 14, sx1 - sx0, 6);
      // cordolo rosso/bianco
      for (let cx = Math.floor(sx0 / 40) * 40; cx < sx1; cx += 40) { g.fillStyle = (cx / 40) % 2 ? '#e8e8e8' : '#d63a2a'; g.fillRect(cx, gy, 40, 9); }
      g.fillStyle = '#e8e8e8'; for (let cx = Math.floor(sx0 / 120) * 120; cx < sx1; cx += 120) g.fillRect(cx, gy + 48, 60, 5);
    }
    // terreno devastato
    const dx0 = Math.max(x0, 2700);
    if (x1 > dx0) {
      g.fillStyle = '#7a5a40'; g.fillRect(dx0, gy, x1 - dx0, 600);
      g.fillStyle = '#946c4c'; g.fillRect(dx0, gy, x1 - dx0, 14);
      g.strokeStyle = '#4a3424'; g.lineWidth = 3;
      for (let cx = Math.floor(dx0 / 160) * 160; cx < x1; cx += 160) { g.beginPath(); g.moveTo(cx, gy + 14); g.lineTo(cx + 30, gy + 50); g.lineTo(cx + 10, gy + 90); g.stroke(); }
    }
    g.strokeStyle = S.OL; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, gy); g.lineTo(x1, gy); g.stroke();
  }

  function drawPlatform(p) {
    const S = sp(); const g = J.g;
    switch (p.kind) {
      case 'crate':
        S.poly([p.x, p.y, p.x + p.w, p.y, p.x + p.w, p.y + p.h, p.x, p.y + p.h], '#c2843f', 2.4);
        S.polyNoOl([p.x + p.w - 10, p.y + 2, p.x + p.w - 2, p.y + 2, p.x + p.w - 2, p.y + p.h - 2, p.x + p.w - 10, p.y + p.h - 2], '#9a6228');
        S.line(p.x + 4, p.y + 4, p.x + p.w - 4, p.y + p.h - 4, '#7a4a1c', 3); S.line(p.x + p.w - 4, p.y + 4, p.x + 4, p.y + p.h - 4, '#7a4a1c', 3);
        S.line(p.x, p.y + 6, p.x + p.w, p.y + 6, '#7a4a1c', 2);
        break;
      case 'ledge':
        S.poly([p.x, p.y, p.x + p.w, p.y, p.x + p.w, p.y + p.h, p.x, p.y + p.h], '#8e98b0', 2.2);
        for (let k = 0; k < p.w; k += 20) S.polyNoOl([p.x + k, p.y + p.h, p.x + k + 10, p.y + p.h, p.x + k + 16, p.y, p.x + k + 6, p.y], '#f2d23a');
        S.line(p.x + 10, p.y + p.h, p.x + 10, 460, '#5f667a', 3); S.line(p.x + p.w - 10, p.y + p.h, p.x + p.w - 10, 460, '#5f667a', 3);
        break;
      case 'car': {
        // auto da corsa distrutta
        S.poly([p.x, p.y + p.h, p.x + 10, p.y + 16, p.x + 60, p.y, p.x + 150, p.y, p.x + p.w, p.y + 20, p.x + p.w, p.y + p.h], '#2f62c8', 2.4);
        S.polyNoOl([p.x + 12, p.y + 20, p.x + 60, p.y + 4, p.x + 150, p.y + 4, p.x + p.w - 6, p.y + 22, p.x + p.w - 6, p.y + 28, p.x + 12, p.y + 28], '#4a7fe0');
        S.poly([p.x + 70, p.y + 4, p.x + 90, p.y - 14, p.x + 130, p.y - 14, p.x + 140, p.y + 4], '#a9e0f0', 2);
        S.circ(p.x + 40, p.y + p.h, 16, '#1f1f24', 2); S.circ(p.x + p.w - 40, p.y + p.h, 16, '#1f1f24', 2);
        g.fillStyle = '#fff'; g.font = 'bold 14px Impact, sans-serif'; g.fillText('7', p.x + 100, p.y + 30);
        break;
      }
      case 'rubble':
        S.poly([p.x, p.y + p.h, p.x + 8, p.y + 20, p.x + 40, p.y, p.x + p.w - 50, p.y + 6, p.x + p.w, p.y + 30, p.x + p.w, p.y + p.h], '#9b8f8a', 3);
        S.polyNoOl([p.x + p.w - 60, p.y + 10, p.x + p.w - 4, p.y + 32, p.x + p.w - 4, p.y + p.h - 4, p.x + p.w - 70, p.y + p.h - 4], '#7a6e6c');
        for (let k = 0; k < 4; k++) S.line(p.x + 30 + k * 50, p.y + 30, p.x + 50 + k * 50, p.y + p.h - 20, '#5d5352', 3);
        break;
      case 'girder':
        S.poly([p.x, p.y, p.x + p.w, p.y, p.x + p.w, p.y + p.h, p.x, p.y + p.h], '#c4462e', 3);
        for (let k = 0; k < p.w; k += 40) S.line(p.x + k, p.y + p.h, p.x + k + 20, p.y, '#7e2a1a', 3);
        S.cap(p.x + 30, p.y + p.h, p.x + 30, 460, 9, '#9b8f8a', '#6d6362'); S.cap(p.x + p.w - 30, p.y + p.h, p.x + p.w - 30, 460, 9, '#9b8f8a', '#6d6362');
        break;
    }
  }

  J.bg = { drawSky, drawParallax, drawWorldBack, drawGround, drawPlatform, drawCloud };
})();
