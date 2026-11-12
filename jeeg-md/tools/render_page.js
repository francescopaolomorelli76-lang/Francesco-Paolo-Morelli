/* Definizione di tutti i fotogrammi e immagini per la ROM Mega Drive.
 * group = palette di destinazione (vedi tools/convert.py). Ancoraggio (ax, ay) = punto dei piedi. */
(function () {
  const S = J.spr; const cv = document.getElementById('c'); const g = cv.getContext('2d');
  const R = {}; const order = [];
  function add(name, o) { R[name] = o; order.push(name); }
  const TAU = Math.PI * 2;

  /* ---------- sprite umanoidi ---------- */
  function humanoid(def, anim, t, opts, scale, offs) {
    return (g) => { g.scale(scale, scale); S.drawHumanoid(def, S.pose(anim, t, opts || {}), offs); };
  }
  function charSet(prefix, def, scale, group, box, extra) {
    const [w, h, ax, ay] = box;
    const runCad = (extra && extra.cad) || 11;
    const fr = [
      ['idle0', 'idle', 0, extra && extra.heavy ? { heavy: 1 } : undefined], ['idle1', 'idle', Math.PI / 3 / 2, extra && extra.heavy ? { heavy: 1 } : undefined],
      ...[0, 1, 2, 3, 4, 5].map((k) => ['run' + k, 'run', (k / 6) * (TAU / runCad), { cadence: runCad }]),
      ['jump', 'jump', 0], ['fall', 'fall', 0], ['punch', 'punch', 0.1], ['punch2', 'punch', 0.1, { second: true }],
      ['kick', 'kick', 0.1], ['airkick', 'airkick', 0], ['hurt', 'hurt', 0], ['dead', 'dead', 0],
    ].concat((extra && extra.more) || []);
    for (const f of fr) add(prefix + '_' + f[0], { group, w, h, ax, ay, draw: humanoid(def, f[1], f[2], f[3], scale) });
  }
  // Livello 1, zona umana: scala 0.8 (Hiroshi 64 px)
  charSet('hiro', S.HIRO, 0.9, 'pA', [104, 104, 52, 98]);
  charSet('hirog', S.HIRO_G, 0.9, 'pA', [104, 104, 52, 98], { more: [['fists', 'fists', 0], ['cheer', 'cheer', 0]] });
  charSet('cyb', S.CYBORG, 0.9, 'pA', [104, 112, 52, 106], { more: [['cheer', 'cheer', 0]] });
  for (const [pre, def] of [['sold', S.SOLDIER], ['lanc', S.LANCER]]) {
    const fr = [['idle0', 'idle', 0], ...[0, 1, 2, 3].map((k) => ['run' + k, 'run', (k / 4) * (TAU / 8), { cadence: 8 }]),
      ['windup', pre === 'lanc' ? 'throwW' : 'windup', 0.45], ['attack', pre === 'lanc' ? 'throw' : 'slash', 0.1], ['hurt', 'hurt', 0], ['fall', 'fall', 0]];
    for (const f of fr) add(pre + '_' + f[0], { group: 'eA', w: 124, h: 104, ax: 62, ay: 98, draw: humanoid(def, f[1], f[2], f[3], 0.9) });
  }
  // Zona giganti: Jeeg scala 1.2 (120 px)
  const JB = [176, 160, 88, 154];
  charSet('jeeg', S.JEEG, 1.2, 'pB', JB, { heavy: 1, cad: 7.5, more: [['beam', 'beam', 0], ['cheer', 'cheer', 0]] });
  for (const part of ['head', 'torso', 'armB', 'armF', 'legB', 'legF']) {
    const offs = {}; for (const k of ['head', 'torso', 'armB', 'armF', 'legB', 'legF']) if (k !== part) offs[k] = { hide: true };
    add('jpart_' + part, { group: 'pB', w: 176, h: 160, ax: 88, ay: 154, draw: humanoid(S.JEEG, 'idle', 0, {}, 1.2, offs) });
  }
  // Haniwa giganti (1.16)
  for (const [pre, v] of [['giant', 'giant'], ['gshoot', 'shooter']]) {
    const st = (o) => Object.assign({ anim: 'idle', at: 0, armRaise: 0, punch: 0, eyeGlow: 0, mouthGlow: 0 }, o);
    const fr = [['idle0', st({})], ...[0, 1, 2, 3].map((k) => ['walk' + k, st({ anim: 'walk' }), (k / 4) * (TAU / 7)]),
      ['windup', st({ anim: 'windup', at: 0.4, armRaise: 1, eyeGlow: 1, mouthGlow: v === 'shooter' ? 1 : 0 })], ['attack', st({ anim: 'attack', punch: 1, eyeGlow: 1 })]];
    for (const f of fr) add(pre + '_' + f[0], { group: 'eB', w: 128, h: 136, ax: 56, ay: 130, draw: (g) => { g.scale(1.16, 1.16); S.drawHaniwaGiant(f[2] || 0, f[1], v); } });
  }
  // Boss Doroma (1.5)
  const DB = [224, 184, 104, 178];
  const DSC = 1.35; const dor = [['idle0', 'idle', 0, { heavy: 1 }], ['idle1', 'idle', 0.5, { heavy: 1 }], ...[0, 1, 2, 3].map((k) => ['walk' + k, 'run', (k / 4) * (TAU / 6), { cadence: 6 }]),
    ['windup', 'windup', 0.3], ['slam', 'slash', 0.1], ['jump', 'jump', 0], ['hurt', 'hurt', 0], ['charge', 'kick', 0.02]];
  for (const f of dor) add('dor_' + f[0], { group: 'eB', w: DB[0], h: DB[1], ax: DB[2], ay: DB[3], draw: humanoid(S.DOROMA, f[1], f[2], f[3], DSC) });
  // Big Shooter (scala 1.0, rivolto a sinistra)
  for (const k of [0, 1]) add('shooter' + k, { group: 'pB', w: 224, h: 80, ax: 112, ay: 40, draw: (g) => { g.scale(-1, 1); S.drawBigShooter(k ? 0.06 : 0, true); } });

  /* ---------- oggetti ed effetti ---------- */
  function items(grp, sc, suffix) {
    add('gloves' + suffix, { group: grp, w: 48, h: 40, ax: 24, ay: 38, draw: (g) => { g.scale(sc, sc); S.drawGlovesItem(0); } });
    add('health' + suffix, { group: grp, w: 32, h: 32, ax: 16, ay: 30, draw: (g) => { g.scale(sc, sc); g.translate(0, -16); S.circ(0, 0, 11, '#ffffff', 2); S.poly([-3, -8, 3, -8, 3, -3, 8, -3, 8, 3, 3, 3, 3, 8, -3, 8, -3, 3, -8, 3, -8, -3, -3, -3], '#d42f28', 1.2); } });
    add('energy' + suffix, { group: grp, w: 32, h: 32, ax: 16, ay: 30, draw: (g) => { g.scale(sc, sc); g.translate(0, -16); S.circ(0, 0, 11, grp === 'pB' ? '#2b48b8' : '#58c8cf', 2); S.poly([-2, -9, 4, -9, 0, -1, 5, -1, -3, 10, -1, 2, -5, 2], '#f6e04a', 1.2); } });
    for (const k of [0, 1]) add('flag' + k + suffix, { group: grp, w: 48, h: 96, ax: 8, ay: 94, draw: (g) => { g.scale(sc * 0.8, sc * 0.8); S.cap(0, 0, 0, -110, 3, '#d9dce6', '#a9aec0'); S.poly([2, -108, 46, -100 + (k ? 4 : -4), 2, -84], k ? '#2f9a3a' : '#d42f28', 2); } });
  }
  items('pA', 1, '_a'); items('pB', 1, '_b');
  function fx(grp, sc, suffix) {
    for (const k of [0, 1]) add('star' + k + suffix, { group: grp, w: 32, h: 32, ax: 16, ay: 16, draw: (g) => { const s = (k ? 14 : 9) * sc; const pts = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? s * 0.35 : s; const a = (i / 16) * TAU; pts.push(Math.cos(a) * r, Math.sin(a) * r); } S.poly(pts, '#ffffff', 1.5); S.circ(0, 0, s * 0.3, '#ffe14a', 0); } });
    for (const k of [0, 1, 2]) add('boom' + k + suffix, { group: grp, w: 64, h: 64, ax: 32, ay: 32, draw: (g) => { const r = (10 + k * 9) * sc; S.circ(0, 0, r, '#ff8a2a', 2); S.circ(0, 0, r * 0.7, '#ffe14a', 0); S.circ(0, 0, r * 0.38, '#ffffff', 0); } });
  }
  fx('eA', 1, '_a'); fx('eB', 1.3, '_b');
  add('spear', { group: 'eA', w: 48, h: 16, ax: 24, ay: 8, draw: (g) => { S.line(-20, 0, 12, 0, '#6b4a2a', 2.5); S.poly([12, -3.5, 22, 0, 12, 3.5], '#d7dbe4', 1.2); } });
  add('clay', { group: 'eB', w: 32, h: 32, ax: 16, ay: 16, draw: (g) => { S.circ(0, 0, 11, '#c7774a', 2.2); S.circ(-3, -3, 4, '#e3a173', 0); S.line(-6, 2, 5, 5, '#8f5535', 2); } });
  add('orb', { group: 'eB', w: 32, h: 32, ax: 16, ay: 16, draw: (g) => { S.circ(0, 0, 12, '#ff8a2a', 2.2); S.circ(0, 0, 7, '#ffe14a', 0); S.circ(-2, -2, 3, '#ffffff', 0); } });
  for (const k of [0, 1]) add('shock' + k, { group: 'eB', w: 32, h: 48, ax: 16, ay: 46, draw: (g) => { const h = k ? 40 : 32; S.poly([-14, 0, -7, -h * 0.6, 0, -h, 7, -h * 0.6, 14, 0], '#ffe14a', 2); S.poly([-7, 0, 0, -h * 0.55, 7, 0], '#ffffff', 0); } });
  for (const k of [0, 1]) add('ring' + k, { group: 'eB', w: 24, h: 48, ax: 12, ay: 24, draw: (g) => { g.lineWidth = 5; g.strokeStyle = k ? '#ff8a2a' : '#d42f28'; g.beginPath(); g.ellipse(0, 0, 7, 20, 0, 0, TAU); g.stroke(); g.lineWidth = 2; g.strokeStyle = '#ffe14a'; g.stroke(); } });
  add('gcore', { group: 'eB', w: 32, h: 16, ax: 0, ay: 8, draw: (g) => { g.fillStyle = '#ffe14a'; g.fillRect(0, -6, 32, 12); g.fillStyle = '#ffffff'; g.fillRect(0, -3, 32, 6); } });
  add('pbeam', { group: 'eB', w: 32, h: 24, ax: 0, ay: 12, draw: (g) => { g.fillStyle = '#9fd8ff'; g.fillRect(0, -10, 32, 20); g.fillStyle = '#ffffff'; g.fillRect(0, -5, 32, 10); } });
  add('spark', { group: 'eB', w: 16, h: 16, ax: 8, ay: 8, draw: (g) => { S.poly([0, -7, 2, -2, 7, 0, 2, 2, 0, 7, -2, 2, -7, 0, -2, -2], '#9fd8ff', 1); } });
  add('alert', { group: 'eB', w: 16, h: 24, ax: 8, ay: 22, draw: (g) => { S.poly([-5, -20, 5, -20, 2, -6, -2, -6], '#ffe14a', 1.6); S.circ(0, -2, 2.6, '#ffe14a', 1.4); } });
  add('alert_a', { group: 'eA', w: 16, h: 24, ax: 8, ay: 22, draw: (g) => { S.poly([-5, -20, 5, -20, 2, -6, -2, -6], '#ffe14a', 1.6); S.circ(0, -2, 2.6, '#ffe14a', 1.4); } });

  /* ---------- fondali (piani A/B) ---------- */
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function panorama(dusk) {
    return (g) => {
      const W = 256, H = 224;
      const bands = dusk ? ['#3b2a5e', '#6a3a6a', '#a0485a', '#c8604a', '#e88a5a', '#f2b06a'] : ['#2f5fc8', '#3f78d8', '#5a92e2', '#78acea', '#98c6f0', '#c0def4'];
      bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 22, W, 23); });
      g.fillStyle = bands[5]; g.fillRect(0, 132, W, 100);
      const r = rng(dusk ? 11 : 3);
      for (let i = 0; i < 2; i++) { const x = (i * 128 + r() * 60) % W, y = 18 + r() * 50; for (const dx of [-W, 0, W]) J.bg.drawCloud(x + dx, y, 0.45 + r() * 0.2, dusk ? 1 : 0); }
      // montagne periodiche
      const mnt = (x) => 100 - 34 * Math.abs(Math.sin((x / W) * Math.PI * 2)) - 14 * Math.abs(Math.sin((x / W) * Math.PI * 4 + 1));
      g.beginPath(); g.moveTo(0, 170); for (let x = 0; x <= W; x += 4) g.lineTo(x, mnt(x) + 20); g.lineTo(W, 170); g.closePath();
      g.fillStyle = dusk ? '#5a3e6e' : '#7f8fc9'; g.fill(); g.strokeStyle = dusk ? '#2e1f3e' : '#4c5a93'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#eef2ff'; for (let x = 0; x < W; x += 2) { const y = mnt(x) + 20; if (y < 92 && !dusk) g.fillRect(x, y, 2, 6); }
      // colline
      g.beginPath(); g.moveTo(0, 190); for (let x = 0; x <= W; x += 4) g.lineTo(x, 132 + 8 * Math.sin((x / W) * TAU * 2) + 4 * Math.sin((x / W) * TAU * 5)); g.lineTo(W, 190); g.closePath();
      g.fillStyle = dusk ? '#4a4a3a' : '#4f9a5c'; g.fill(); g.strokeStyle = dusk ? '#2a2a20' : '#2b5f3a'; g.stroke();
      // città o rovine (periodiche)
      const r2 = rng(dusk ? 5 : 99); let px = 0;
      while (px < W - 40) {
        const w = 26 + Math.floor(r2() * 30), h = 28 + Math.floor(r2() * 52);
        const col = dusk ? (r2() > 0.5 ? '#6f5f6e' : '#7d6a62') : ['#d8c9a8', '#b9c3cf', '#c9b1a0', '#a8b7c9'][Math.floor(r2() * 4)];
        g.fillStyle = col; g.strokeStyle = dusk ? '#2a1f2c' : '#3a3550'; g.lineWidth = 2;
        if (dusk) { g.beginPath(); g.moveTo(px, 200); g.lineTo(px, 200 - h); g.lineTo(px + w * 0.4, 200 - h + 10); g.lineTo(px + w * 0.7, 200 - h - 6); g.lineTo(px + w, 200 - h + 14); g.lineTo(px + w, 200); g.closePath(); g.fill(); g.stroke(); }
        else { g.fillRect(px, 200 - h, w, h); g.strokeRect(px, 200 - h, w, h); }
        g.fillStyle = dusk ? '#2b2236' : '#5b6b96';
        for (let wy = 200 - h + 6; wy < 194; wy += 10) for (let wx = px + 4; wx < px + w - 5; wx += 8) if (r2() > 0.2) g.fillRect(wx, wy, 4, 5);
        px += w + 4 + Math.floor(r2() * 10);
      }
      if (dusk) for (let i = 0; i < 2; i++) { const sx = 60 + i * 130; for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#4a3b4f' : '#5b4a5d'; g.beginPath(); g.arc(sx + k * 6, 150 - k * 22, 10 + k * 5, 0, TAU); g.fill(); } }
      g.fillStyle = dusk ? '#7a5a40' : '#56565f'; g.fillRect(0, 200, W, 24);
    };
  }
  add('bgB_A', { group: 'bgB_A', w: 512, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => MDBG.panorama(g, 'A') });
  add('bgB_B', { group: 'bgB_B', w: 512, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => MDBG.panorama(g, 'B') });
  add('bgA_A', { group: 'bgA_A', w: 2304, h: 224, ax: 0, ay: 0, bg: true, transparent: true, draw: (g) => MDBG.stageA(g) });
  add('bgA_B', { group: 'bgA_B', w: 1728, h: 224, ax: 0, ay: 0, bg: true, transparent: true, draw: (g) => MDBG.stageB(g) });


  /* ---------- HUD: ritratti 32x32 e icone vite 16x16 (tile grezzi, riga per riga) ---------- */
  function portrait(def, sc, bg, dy) {
    return (g) => {
      g.fillStyle = '#1b1020'; g.fillRect(0, 0, 32, 32); g.fillStyle = bg; g.fillRect(2, 2, 28, 28);
      g.save(); g.beginPath(); g.rect(2, 2, 28, 28); g.clip(); g.translate(14, 30 + dy); g.scale(sc, sc);
      S.cap(-4, 0, -14, 14, 9, def === S.JEEG ? '#f2a428' : def === S.CYBORG ? '#d2342b' : '#f5eecd');
      def.head({}); g.restore();
    };
  }
  add('por_hiro', { group: 'pA', w: 32, h: 32, ax: 0, ay: 0, raw: true, draw: portrait(S.HIRO, 1.25, '#58c8cf', 0) });
  add('por_cyb', { group: 'pA', w: 32, h: 32, ax: 0, ay: 0, raw: true, draw: portrait(S.CYBORG, 1.05, '#f6e04a', 2) });
  add('por_jeeg', { group: 'pB', w: 32, h: 32, ax: 0, ay: 0, raw: true, draw: portrait(S.JEEG, 1.6, '#d9cf3a', 0) });
  add('ico_hiro', { group: 'pA', w: 16, h: 16, ax: 0, ay: 0, raw: true, draw: (g) => { g.translate(7, 16); g.scale(0.62, 0.62); S.HIRO.head({}); } });
  add('ico_jeeg', { group: 'pB', w: 16, h: 16, ax: 0, ay: 0, raw: true, draw: (g) => { g.translate(7, 16); g.scale(0.8, 0.8); S.JEEG.head({}); } });

  /* ---------- schermate (immagini intere 320x224) ---------- */
  function burst(g, cx, cy, c1, c2) { g.fillStyle = c1; g.fillRect(0, 0, 320, 224); g.save(); g.translate(cx, cy); for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); if (i % 2) { g.fillStyle = c2; g.beginPath(); g.moveTo(0, 0); g.lineTo(400, -50); g.lineTo(400, 50); g.closePath(); g.fill(); } } g.restore(); }
  function txt(g, t, x, y, size, fill, stroke) { g.font = 'bold ' + size + 'px "DejaVu Sans", Arial, sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, size / 5); g.strokeStyle = stroke || '#1b1020'; g.strokeText(t, x, y); g.fillStyle = fill; g.fillText(t, x, y); g.textAlign = 'left'; }
  add('scr_title', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 230, 120, '#1c2c6a', '#2f4fa0');
    g.save(); g.translate(236, 222); g.scale(-1.75, 1.75); S.drawHumanoid(S.JEEG, S.pose('idle', 0, { heavy: 1 })); g.restore();
    g.save(); g.translate(96, 70); g.rotate(-0.06); txt(g, 'JEEG', 0, 0, 52, '#ffe14a', '#c8302a'); txt(g, "ROBOT D'ACCIAIO", 0, 24, 17, '#ffffff'); g.restore();
  } });
  add('scr_hiro', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 90, 110, '#a0201c', '#c8302a'); S.portraitHiroshi(92, 116, 0.95, 0.4);
    txt(g, 'UNIONE', 236, 92, 26, '#ffe14a'); txt(g, 'DEI GUANTI!', 236, 122, 26, '#ffe14a'); txt(g, 'Hiroshi Shiba', 236, 148, 13, '#ffffff');
  } });
  add('scr_miwa', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 230, 110, '#1f4fa8', '#2f6fd2'); S.portraitMiwa(230, 112, 1.0, 0);
    txt(g, 'MIWA,', 90, 80, 22, '#ffe14a'); txt(g, 'LANCIA I', 90, 106, 22, '#ffe14a'); txt(g, 'COMPONENTI!', 90, 132, 22, '#ffe14a'); txt(g, 'Big Shooter', 90, 156, 12, '#ffffff');
  } });
  add('scr_build', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 160, 120, '#c86a10', '#f2a428');
    g.save(); g.translate(160, 222); g.scale(1.7, 1.7); S.drawHumanoid(S.JEEG, S.pose('cheer', 0)); g.restore();
    txt(g, 'BUILD UP!', 160, 44, 40, '#ffe14a', '#c8302a');
  } });
  add('scr_boss', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 200, 120, '#3a0e14', '#6a1a1a');
    g.save(); g.translate(206, 222); g.scale(-1.75, 1.75); S.drawHumanoid(S.makeDoroma('#ff4a2a'), S.pose('idle', 0, { heavy: 1 })); g.restore();
    txt(g, 'WARNING', 74, 60, 22, '#ff4a2a'); txt(g, 'HANIWA GENJIN', 74, 100, 16, '#ffe14a'); txt(g, 'DOROMA', 74, 128, 30, '#ffe14a');
  } });
  add('scr_win', { group: 'scr', w: 320, h: 224, ax: 0, ay: 0, bg: true, draw: (g) => {
    burst(g, 110, 120, '#13205a', '#24407a');
    g.save(); g.translate(96, 222); g.scale(1.6, 1.6); S.drawHumanoid(S.JEEG, S.pose('cheer', 0)); g.restore();
    txt(g, 'LIVELLO 1', 228, 70, 24, '#ffe14a', '#c8302a'); txt(g, 'COMPLETATO!', 228, 100, 24, '#ffe14a', '#c8302a');
  } });

  window.RENDER_LIST = () => order.map((n) => { const o = R[n]; return { name: n, group: o.group, w: o.w, h: o.h, ax: o.ax, ay: o.ay, bg: !!o.bg, raw: !!o.raw }; });
  window.RENDER_ONE = (name) => {
    const o = R[name]; cv.width = o.w; cv.height = o.h; S.setCtx(g); J.g = g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, o.w, o.h);
    g.save(); g.translate(o.ax, o.ay); o.draw(g); g.restore();
    return cv.toDataURL('image/png');
  };
})();
