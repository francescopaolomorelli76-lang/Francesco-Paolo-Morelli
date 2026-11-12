/* sprites.js — grafica vettoriale cel-shaded (linea scura, due toni, colori saturi stile anime 1975).
 * Tutti i personaggi sono disegnati da codice (nessun ritaglio delle foto originali),
 * con palette e silhouette ricavate dai riferimenti in 03_RIFERIMENTI_ORIGINALI.
 */
'use strict';
(function () {
  const OL = '#1b1020';
  let g = null;
  const S = Math.sin, C = Math.cos;

  function setCtx(ctx) { g = ctx; }

  /* ---------- primitive ---------- */
  function cap(x1, y1, x2, y2, r, col, shade) {
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = OL; g.lineWidth = 2 * r + 2.6; g.stroke();
    g.strokeStyle = col; g.lineWidth = 2 * r; g.stroke();
    if (shade) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L * r * 0.42, ny = dx / L * r * 0.42;
      g.beginPath(); g.moveTo(x1 - nx, y1 - ny); g.lineTo(x2 - nx, y2 - ny);
      g.strokeStyle = shade; g.lineWidth = r * 0.85; g.stroke();
    }
  }
  function path(pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function poly(pts, col, lw) { path(pts); g.fillStyle = col; g.fill(); if (lw !== 0) { g.lineJoin = 'round'; g.strokeStyle = OL; g.lineWidth = lw || 2.2; g.stroke(); } }
  function polyNoOl(pts, col) { path(pts); g.fillStyle = col; g.fill(); }
  function circ(x, y, r, col, lw) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); if (lw !== 0) { g.strokeStyle = OL; g.lineWidth = lw || 2.2; g.stroke(); } }
  function ell(x, y, rx, ry, col, rot, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fillStyle = col; g.fill(); if (lw !== 0) { g.strokeStyle = OL; g.lineWidth = lw || 2.2; g.stroke(); } }
  function line(x1, y1, x2, y2, col, w) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col || OL; g.lineWidth = w || 1.6; g.lineCap = 'round'; g.stroke(); }
  function curve(pts, col, w) { g.beginPath(); g.moveTo(pts[0], pts[1]); g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); g.strokeStyle = col || OL; g.lineWidth = w || 1.6; g.lineCap = 'round'; g.stroke(); }
  function darken(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * k), gg = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
    return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
  }

  /* ---------- scheletro umanoide parametrico ---------- */
  function drawHumanoid(d, p, off) {
    off = off || {};
    const hipY = d.hipY + (p.bob || 0);
    const lean = p.lean || 0;
    const legs = p.legs.map((L) => {
      const hx = d.hipX || 0;
      const kx = hx + S(L.t) * d.thigh, ky = hipY + C(L.t) * d.thigh;
      const fx = kx + S(L.s) * d.shin, fy = ky + C(L.s) * d.shin;
      return { hx, hy: hipY, kx, ky, fx, fy, a: L.s };
    });
    const shx = S(lean) * -d.shoulderY + C(lean) * d.shoulderX;
    const shy = hipY + C(lean) * d.shoulderY + S(lean) * d.shoulderX;
    const arms = p.arms.map((A, i) => {
      const sx = shx + (i === 0 ? -d.shoulderSpread : d.shoulderSpread) * 0.0;
      const u = A.u + lean, f = A.f + lean;
      const ex = sx + S(u) * d.upper, ey = shy + C(u) * d.upper;
      const hx = ex + S(f) * d.fore, hy = ey + C(f) * d.fore;
      return { sx, sy: shy, ex, ey, hx, hy, u, f };
    });
    const parts = {
      armB: () => drawArm(d, arms[0], false, p),
      legB: () => drawLeg(d, legs[0], false, p),
      legF: () => drawLeg(d, legs[1], true, p),
      torso: () => { g.save(); g.translate(0, hipY); g.rotate(lean); d.torso(p); g.restore(); },
      head: () => {
        const nx = S(lean) * -d.neckY, ny = hipY + C(lean) * d.neckY;
        g.save(); g.translate(nx, ny); g.rotate(lean * 0.6 + (p.headTilt || 0)); const hs = d.headScale || 1; g.scale(hs, hs); d.head(p); g.restore();
      },
      armF: () => drawArm(d, arms[1], true, p),
    };
    const order = d.torsoOverLegs ? ['armB', 'legB', 'legF', 'torso', 'head', 'armF'] : ['armB', 'legB', 'torso', 'legF', 'head', 'armF'];
    for (const k of order) {
      const o = off[k];
      if (o && o.hide) continue;
      if (o) { g.save(); g.translate(o.x || 0, o.y || 0); if (o.rot) g.rotate(o.rot); }
      parts[k]();
      if (o) g.restore();
    }
    return { arms, legs };
  }
  function drawLeg(d, L, front, p) {
    const col = front ? d.leg : darken(d.leg, 0.78), sh = front ? d.legShade : darken(d.legShade, 0.78);
    cap(L.hx, L.hy, L.kx, L.ky, d.legR, col, sh);
    cap(L.kx, L.ky, L.fx, L.fy, d.legR * 0.92, d.shin2 ? (front ? d.shin2 : darken(d.shin2, 0.78)) : col, sh);
    if (d.legDetail) d.legDetail(L, front);
    d.foot(L.fx, L.fy, L.a, front);
  }
  function drawArm(d, A, front, p) {
    const col = front ? d.arm : darken(d.arm, 0.78), sh = front ? d.armShade : darken(d.armShade, 0.78);
    cap(A.sx, A.sy, A.ex, A.ey, d.armR, col, sh);
    cap(A.ex, A.ey, A.hx, A.hy, d.armR * 0.95, d.fore2 ? (front ? d.fore2 : darken(d.fore2, 0.78)) : col, sh);
    if (d.armDetail) d.armDetail(A, front);
    if (d.weapon && front) d.weapon(A, p);
    d.hand(A.hx, A.hy, front, A, p);
  }

  /* ---------- POSE ---------- */
  function pose(anim, t, opt) {
    opt = opt || {};
    const p = { lean: 0, bob: 0, legs: [{ t: 0, s: 0 }, { t: 0, s: 0 }], arms: [{ u: 0.15, f: 0.6 }, { u: -0.1, f: 0.5 }], headTilt: 0 };
    switch (anim) {
      case 'idle': {
        const b = S(t * 3) * 0.8;
        p.bob = b; p.legs = [{ t: -0.12, s: -0.08 }, { t: 0.18, s: 0.1 }];
        p.arms = [{ u: 0.25, f: 1.3 }, { u: 0.35, f: 1.6 }];
        break;
      }
      case 'run': {
        const ph = t * (opt.cadence || 11);
        p.lean = 0.16; p.bob = -Math.abs(S(ph)) * 2.5;
        for (let i = 0; i < 2; i++) {
          const q = ph + i * Math.PI;
          const th = 0.75 * S(q);
          const bend = 0.25 + 1.1 * Math.max(0, -C(q));
          p.legs[i] = { t: th, s: th - bend };
        }
        p.arms[0] = { u: 0.7 * S(ph), f: 0.7 * S(ph) + 1.5 };
        p.arms[1] = { u: -0.7 * S(ph), f: -0.7 * S(ph) + 1.5 };
        break;
      }
      case 'jump': p.legs = [{ t: -0.35, s: -1.4 }, { t: 1.0, s: -0.1 }]; p.arms = [{ u: -0.9, f: -0.2 }, { u: 2.4, f: 2.9 }]; p.lean = 0.05; break;
      case 'fall': p.legs = [{ t: -0.2, s: -0.6 }, { t: 0.5, s: 0.1 }]; p.arms = [{ u: -1.6, f: -1.2 }, { u: 1.9, f: 2.4 }]; break;
      case 'punch': {
        const k = Math.min(1, t / 0.06); const r = opt.second ? 1 : 0;
        p.lean = 0.18; p.legs = [{ t: -0.45, s: -0.35 }, { t: 0.5, s: 0.15 }];
        if (!r) { p.arms = [{ u: 0.5, f: 2.2 }, { u: 0.4 + 1.17 * k, f: 0.9 + 0.67 * k }]; }
        else { p.arms = [{ u: 0.4 + 1.2 * k, f: 0.9 + 0.67 * k }, { u: 0.5, f: 2.2 }]; p.lean = 0.24; }
        break;
      }
      case 'kick': {
        const k = Math.min(1, t / 0.07);
        p.lean = -0.25 * k; p.legs = [{ t: -0.15, s: -0.1 }, { t: 0.4 + 1.25 * k, s: 0.4 + 1.25 * k }];
        p.arms = [{ u: -0.6, f: 0.4 }, { u: 0.9, f: 2.3 }]; p.bob = -2 * k;
        break;
      }
      case 'airkick': p.lean = -0.3; p.legs = [{ t: -0.2, s: -1.3 }, { t: 1.4, s: 1.5 }]; p.arms = [{ u: -1.0, f: -0.3 }, { u: 1.0, f: 2.4 }]; break;
      case 'hurt': p.lean = -0.35; p.legs = [{ t: 0.3, s: 0.1 }, { t: -0.2, s: -0.3 }]; p.arms = [{ u: 2.2, f: 2.8 }, { u: -2.0, f: -2.5 }]; p.headTilt = -0.3; break;
      case 'fists': /* guanti uniti davanti al petto (rif. 02) */
        p.legs = [{ t: -0.3, s: -0.2 }, { t: 0.3, s: 0.2 }]; p.arms = [{ u: 0.95, f: 2.55 }, { u: 0.95, f: 2.55 }]; p.lean = 0.05; break;
      case 'cheer': p.legs = [{ t: -0.25, s: -0.2 }, { t: 0.25, s: 0.2 }]; p.arms = [{ u: 2.8, f: 3.0 }, { u: 2.6, f: 2.9 }]; break;
      case 'beam': p.lean = -0.1; p.legs = [{ t: -0.5, s: -0.4 }, { t: 0.45, s: 0.3 }]; p.arms = [{ u: 0.4, f: 1.4 }, { u: 0.6, f: 1.5 }]; break;
      case 'windup': { const k = Math.min(1, t / 0.3); p.lean = -0.2 * k; p.legs = [{ t: -0.4, s: -0.3 }, { t: 0.4, s: 0.2 }]; p.arms = [{ u: 0.3, f: 1.2 }, { u: -2.6 * k, f: -2.9 * k }]; break; }
      case 'slash': { const k = Math.min(1, t / 0.08); p.lean = 0.25; p.legs = [{ t: -0.5, s: -0.35 }, { t: 0.55, s: 0.2 }]; p.arms = [{ u: 0.3, f: 1.2 }, { u: -2.6 + 4.2 * k, f: -2.9 + 4.6 * k }]; break; }
      case 'throwW': { const k = Math.min(1, t / 0.3); p.lean = -0.15 * k; p.legs = [{ t: -0.4, s: -0.3 }, { t: 0.4, s: 0.2 }]; p.arms = [{ u: 0.9, f: 1.4 }, { u: -2.2 * k, f: -1.4 * k }]; break; }
      case 'throw': p.lean = 0.25; p.legs = [{ t: -0.5, s: -0.35 }, { t: 0.55, s: 0.2 }]; p.arms = [{ u: 0.5, f: 1.0 }, { u: 1.7, f: 1.6 }]; break;
      case 'dead': p.lean = -1.45; p.bob = 30; p.legs = [{ t: 1.4, s: 1.6 }, { t: 1.6, s: 1.8 }]; p.arms = [{ u: -2.5, f: -2.4 }, { u: -2.9, f: -2.7 }]; break;
      default: break;
    }
    return p;
  }

  /* ---------- HIROSHI UMANO (rif. 01, 02: completo chiaro con profili rossi, cintura nera "S") ---------- */
  const SUIT = '#f5eecd', SUIT_SH = '#d8cb98', RED = '#d42f28', SKIN = '#f3c69a', SKIN_SH = '#d99a6c', HAIR = '#3a1d14';
  const GLOVE = '#f6e04a', GLOVE_SH = '#cdb52a';
  function hiroshiHead() {
    // capelli dietro
    poly([-9, -4, -12, -14, -9, -22, -2, -26, 6, -25, 10, -20, 8, -12, 2, -8, -4, -2], HAIR, 1.8);
    // volto
    poly([-3, -2, -3, -14, 2, -19, 8, -17, 10, -12, 9, -6, 7, -3, 3, -1], SKIN, 1.8);
    polyNoOl([-3, -2, -3, -10, 1, -8, 2, -2], SKIN_SH);
    // ciuffo e punte
    poly([-6, -17, -1, -27, 4, -22, 9, -27, 11, -19, 6, -19, 3, -17, -1, -15], HAIR, 1.8);
    poly([-10, -15, -16, -19, -12, -10], HAIR, 1.6);
    // occhio + sopracciglio
    line(5, -14, 9, -15.5, OL, 1.6);
    circ(7.2, -12.6, 1.1, '#1b1020', 0);
    line(8.5, -7, 6, -6.4, '#8a4a30', 1.1);
    // orecchio
    ell(-1.5, -11, 1.6, 2.4, SKIN, 0, 1.2);
  }
  function hiroshiTorso(gloves) {
    return function () {
      poly([-7, 0, -9, -22, -5, -27, 6, -27, 10, -22, 8, 0], SUIT);
      polyNoOl([-7, 0, -9, -22, -5, -27, -3, -27, -4, -6, 0, 0], SUIT_SH);
      line(8.7, -21, 7.2, 0, RED, 2);
      line(-4, -27, 6, -27, RED, 2);
      // colletto alto rosso-bordato
      poly([-3, -26, -2, -33, 2, -29, 6, -33, 7, -26], SUIT, 1.6);
      line(-2, -33, -3, -26, RED, 1.4); line(6, -33, 7, -26, RED, 1.4);
      // cintura nera con "S" gialla
      poly([-8, -1, -8, -5, 9, -5, 9, -1], '#1d1a1e', 1.6);
      poly([4, -4.5, 6.5, -4.5, 4.8, -3, 6.8, -3, 3.8, -1.3, 5.2, -2.6, 3.4, -2.6], '#f2d33a', 0);
    };
  }
  function makeHiroshi(gloves) {
    return {
      hipY: -37, thigh: 18.5, shin: 18.5, upper: 13, fore: 12.5, shoulderY: -23, shoulderX: 1, neckY: -26, shoulderSpread: 0, headScale: 0.78,
      legR: 4.6, armR: 3.8, leg: SUIT, legShade: SUIT_SH, arm: SUIT, armShade: SUIT_SH,
      legDetail: (L, f) => { if (f) line(L.hx + 3, L.hy, L.kx + 3, L.ky, RED, 1.2); },
      armDetail: (A, f) => { line(A.sx, A.sy, A.ex, A.ey, f ? RED : darken(RED, 0.75), 1.3); },
      torso: hiroshiTorso(gloves),
      head: hiroshiHead,
      hand: (x, y, f) => {
        if (gloves) { circ(x, y, 5, f ? GLOVE : GLOVE_SH, 1.8); if (f) circ(x, y, 2, '#2f9a3a', 0.9); }
        else circ(x, y, 3.6, f ? SKIN : SKIN_SH, 1.6);
      },
      foot: (x, y, a, f) => {
        g.save(); g.translate(x, y); poly([-4, -3, 8, -3, 9, 1.5, -4, 1.5], f ? '#f5eecd' : '#cbbf8e', 1.6); line(-4, 1.5, 9, 1.5, RED, 1.6); g.restore();
      },
    };
  }

  /* ---------- HIROSHI FORMA INTERMEDIA / CYBORG (rif. 19 e 07) ---------- */
  const CY_RED = '#d2342b', CY_RED_SH = '#9e1f1c', CY_YEL = '#f3d23c', CY_YEL_SH = '#c9a224', CY_BLK = '#1f1c25', CY_GREY = '#8e90a9', CY_GREY_SH = '#686a85';
  function cyborgHead() {
    // elmo giallo con corna (alette) e gemma rossa
    poly([-8, -3, -9, -16, -4, -22, 5, -22, 10, -16, 10, -6, 6, -2], CY_YEL);
    poly([-6, -18, -15, -31, -12, -20], CY_YEL, 1.8);
    poly([7, -18, 14, -31, 11, -19], CY_YEL, 1.8);
    polyNoOl([-8, -3, -9, -16, -4, -22, -2, -22, -4, -10, -3, -2], CY_YEL_SH);
    // volto rosso
    poly([0, -4, 0, -15, 9, -15, 10, -7, 7, -3], CY_RED, 1.6);
    // visiera/occhi
    poly([2, -12.5, 10, -12.5, 9.5, -9.8, 2.5, -10], '#58c8cf', 1.2);
    line(3, -6, 8, -6, '#f2e9e0', 1.3);
    circ(2, -23.5, 2.6, '#e02a2a', 1.4); circ(1.3, -24.2, 0.8, '#ffd2c8', 0);
  }
  function cyborgTorso() {
    poly([-9, 0, -11, -23, -6, -29, 7, -29, 12, -23, 9, 0], CY_RED);
    polyNoOl([-9, 0, -11, -23, -6, -29, -3, -29, -5, -6, -2, 0], CY_RED_SH);
    // pettorale nero con "pipistrello" rosso
    poly([-9, -14, -10, -27, 10, -27, 11, -14, 4, -11, 0, -15], CY_BLK, 1.6);
    poly([-4, -19, 0, -22, 2, -20, 4, -22, 7, -19, 4, -17, 1.5, -19, -1, -17], CY_RED, 0);
    // cintura gialla a punte
    poly([-10, 0, -10, -6, 11, -6, 11, 0, 6, 3, 1, -1, -4, 3], CY_YEL, 1.6);
    // spallaccio giallo
    ell(4, -26, 8, 5.5, CY_YEL, -0.2, 1.8);
    line(-1, -24.5, 9, -27.5, CY_YEL_SH, 1.2);
  }
  const CYBORG = {
    hipY: -40, thigh: 20, shin: 20, upper: 14, fore: 13.5, shoulderY: -26, shoulderX: 2, neckY: -30, shoulderSpread: 0, headScale: 0.85,
    legR: 5.6, armR: 4.6, leg: CY_GREY, legShade: CY_GREY_SH, arm: CY_RED, armShade: CY_RED_SH,
    legDetail: (L, f) => { for (let k = 0.3; k < 1; k += 0.3) { const x = L.hx + (L.kx - L.hx) * k, y = L.hy + (L.ky - L.hy) * k; line(x - 4, y, x + 4, y, darken(CY_GREY, 0.6), 1); } },
    armDetail: (A, f) => {
      const mx = A.ex + (A.hx - A.ex) * 0.55, my = A.ey + (A.hy - A.ey) * 0.55;
      cap(A.ex + (A.hx - A.ex) * 0.3, A.ey + (A.hy - A.ey) * 0.3, mx, my, 5.2, f ? CY_YEL : CY_YEL_SH);
    },
    torso: cyborgTorso, head: cyborgHead,
    hand: (x, y, f) => circ(x, y, 4.6, f ? CY_RED : CY_RED_SH, 1.8),
    foot: (x, y, a, f) => { g.save(); g.translate(x, y); poly([-5, -4, 9, -4, 10, 2, -5, 2], f ? CY_GREY : CY_GREY_SH, 1.8); g.restore(); },
  };

  /* ---------- JEEG ROBOT (rif. 01, 16, 17) — base 100 unità, scalato x3 ---------- */
  const JG_BLK = '#1e2328', JG_BLK_SH = '#0e1114', JG_STRIPE = '#d9cf3a', JG_ORG = '#f2a428', JG_ORG_SH = '#c97b17', JG_WAIST = '#dcd5ec', JG_WAIST_SH = '#a99fc4', JG_LEG = '#1f2d26', JG_LEG_SH = '#111a15';
  function jeegHead() {
    // elmo argento con alette, cresta rossa, volto scuro con occhi gialli e denti
    poly([-6, 0, -7, -9, -3, -14, 5, -14, 8, -9, 8, -2, 4, 1], '#d9dce6', 1.6);
    poly([-5, -10, -12, -20, -9, -11], '#eef0f6', 1.4);
    poly([5, -10, 11, -20, 9, -10], '#eef0f6', 1.4);
    polyNoOl([-6, 0, -7, -9, -3, -14, -1, -14, -3, -5, -2, 1], '#a9aec0');
    poly([0, -15, 2, -15, 2.5, -9, -0.5, -9], '#d92a2a', 1);
    poly([1, -1, 1, -8, 8, -8, 8.5, -3, 6, 0], '#353a52', 1.2);
    poly([3, -7, 7.5, -7, 7.4, -5.4, 3, -5.6], '#ffe14a', 0.8);
    for (let i = 0; i < 4; i++) poly([2 + i * 1.5, -3, 3.3 + i * 1.5, -3, 3.3 + i * 1.5, -1.2, 2 + i * 1.5, -1.2], '#f4f4f4', 0.4);
  }
  function jeegTorso() {
    // vita bianco-lavanda con emblema rosso circolare
    poly([-10, 2, -11, -10, 13, -10, 12, 2, 6, 4, -4, 4], JG_WAIST, 1.8);
    polyNoOl([-10, 2, -11, -10, -5, -10, -5, 3], JG_WAIST_SH);
    circ(2, -6, 5.5, '#d92b2b', 1.6); circ(2, -6, 3.2, '#20141a', 1); circ(2, -6, 1.6, '#e8423a', 0);
    // petto arancio con fasce scure
    poly([-13, -10, -17, -26, -14, -36, 15, -36, 19, -26, 15, -10], JG_ORG, 2);
    polyNoOl([-13, -10, -17, -26, -14, -36, -8, -36, -9, -12], JG_ORG_SH);
    for (const sx of [-7, 0, 7]) curve([sx, -35, sx + 2, -24, sx + 0.5, -12], '#3a2a14', 1.6);
    for (const [dx, dy] of [[-4, -30], [4, -30], [11, -28], [-11, -28]]) circ(dx, dy, 1.4, '#d23a2a', 0.6);
    // collo
    poly([-3, -36, -2, -39, 4, -39, 5, -36], '#9da2b6', 1.2);
  }
  const JEEG = {
    hipY: -44, thigh: 21, shin: 22, upper: 14, fore: 15, shoulderY: -33, shoulderX: 1, neckY: -38, shoulderSpread: 0,
    legR: 7, armR: 5.2, leg: JG_LEG, legShade: JG_LEG_SH, arm: JG_BLK, armShade: JG_BLK_SH, torsoOverLegs: true,
    legDetail: (L, f) => {
      const c = f ? JG_STRIPE : darken(JG_STRIPE, 0.7);
      curve([L.hx + 2, L.hy + 2, L.kx + 4, (L.hy + L.ky) / 2, L.kx + 1.5, L.ky], c, 1.3);
      curve([L.kx + 2, L.ky + 1, L.fx + 4, (L.ky + L.fy) / 2, L.fx + 1, L.fy - 3], c, 1.3);
      circ(L.kx, L.ky, 4.5, f ? '#2e3b33' : '#1a221d', 1.4);
    },
    armDetail: (A, f) => {
      const c = f ? JG_STRIPE : darken(JG_STRIPE, 0.7);
      for (const k of [0.35, 0.6, 0.85]) { const x = A.ex + (A.hx - A.ex) * k, y = A.ey + (A.hy - A.ey) * k; ell(x, y, 2.6, 1.3, c, Math.atan2(A.hy - A.ey, A.hx - A.ex), 0.6); }
      circ(A.sx, A.sy, 8.5, f ? JG_BLK : JG_BLK_SH, 2);
      curve([A.sx - 6, A.sy - 2, A.sx, A.sy - 9, A.sx + 6, A.sy - 2], c, 1.4);
      curve([A.sx - 6, A.sy + 2, A.sx, A.sy - 4, A.sx + 6, A.sy + 2], c, 1.2);
    },
    torso: jeegTorso, head: jeegHead,
    hand: (x, y, f) => { circ(x, y, 6.6, f ? JG_BLK : JG_BLK_SH, 2); line(x - 3, y - 2, x + 3, y - 2, '#4a525e', 1); },
    foot: (x, y, a, f) => { g.save(); g.translate(x, y); poly([-7, -6, 11, -6, 13, 2, -7, 2], f ? JG_BLK : JG_BLK_SH, 2); line(-4, -3, 9, -3, JG_STRIPE, 1.2); g.restore(); },
  };

  /* ---------- SOLDATI HANIWA (rif. 06): tunica chiara, cintura viola, guanti verdi, maschera pallida ---------- */
  function makeSoldier(variant) {
    const tunic = variant === 'lancer' ? '#e2bf72' : '#f0e7c9';
    const tunicSh = variant === 'lancer' ? '#b8913f' : '#cfc29a';
    const belt = variant === 'lancer' ? '#8a2c2c' : '#6b3c8c';
    const GLV = '#2e6b57', GLV_SH = '#1f4a3c';
    return {
      hipY: -36, thigh: 18, shin: 18, upper: 13, fore: 12.5, shoulderY: -24, shoulderX: 0, neckY: -27, shoulderSpread: 0, headScale: 0.82,
      legR: 4.4, armR: 4.2, leg: '#e7dcc0', legShade: '#c4b691', arm: tunic, armShade: tunicSh, fore2: GLV, torsoOverLegs: true,
      torso: () => {
        poly([-8, 9, -9, -20, -5, -27, 6, -27, 10, -20, 10, 9, 1, 11], tunic);
        polyNoOl([-8, 9, -9, -20, -5, -27, -2, -27, -3, 10], tunicSh);
        poly([-9, 1, -9, -4, 10, -4, 10, 1], belt, 1.5);
        poly([-3, -26, 7, -26, 6, -23, -2, -23], '#d9b43a', 1.1);
      },
      head: () => {
        // grande capigliatura nera a sbuffi laterali
        ell(-6, -12, 8, 10, '#131216', 0, 1.6);
        ell(5, -16, 7, 6, '#131216', 0, 1.6);
        // maschera pallida lilla
        poly([-1, -2, -2, -15, 3, -19, 9, -16, 10, -8, 8, -3, 3, 0], '#dcd3ea', 1.6);
        poly([2, -14, 9, -14.5, 8.5, -12, 2.5, -12], '#1a1020', 0);
        poly([2.5, -7, 9, -7.5, 8, -4, 4, -4], '#d13447', 1);
        line(4, -6, 8, -6.3, '#ffffff', 0.8);
        line(-2, -17, 9, -18.5, '#d9b43a', 1.4);
        circ(3.5, -18.5, 1.4, '#3fb07a', 0.6);
      },
      hand: (x, y, f) => circ(x, y, 3.9, f ? GLV : GLV_SH, 1.6),
      foot: (x, y, a, f) => { g.save(); g.translate(x, y); poly([-4, -3, 8, -3, 8, 1.5, -4, 1.5], f ? '#5a3a24' : '#3d2818', 1.4); g.restore(); },
      weapon: variant === 'lancer'
        ? (A, p) => { const a = A.f; const dx = S(a), dy = C(a); line(A.hx - dx * 22, A.hy - dy * 22, A.hx + dx * 26, A.hy + dy * 26, '#6b4a2a', 2.4); poly([A.hx + dx * 26 - dy * 3, A.hy + dy * 26 + dx * 3, A.hx + dx * 36, A.hy + dy * 36, A.hx + dx * 26 + dy * 3, A.hy + dy * 26 - dx * 3], '#c9ced8', 1.2); }
        : (A, p) => { const a = A.f; const dx = S(a), dy = C(a); poly([A.hx - dy * 2.2, A.hy + dx * 2.2, A.hx + dx * 30 - dy * 1.6, A.hy + dy * 30 + dx * 1.6, A.hx + dx * 34, A.hy + dy * 34, A.hx + dx * 30 + dy * 1.6, A.hy + dy * 30 - dx * 1.6, A.hx + dy * 2.2, A.hy - dx * 2.2], '#d7dbe4', 1.3); line(A.hx - dy * 5, A.hy + dx * 5, A.hx + dy * 5, A.hy - dx * 5, '#b8892a', 2.2); },
    };
  }
  const SOLDIER = makeSoldier('sword'), LANCER = makeSoldier('lancer');
  const HIRO = makeHiroshi(false), HIRO_G = makeHiroshi(true);

  /* ---------- MOSTRO HANIWA GIGANTE (forma di statuetta haniwa in terracotta) — base 100 ---------- */
  function drawHaniwaGiant(t, st, variant, phaseCol) {
    const TC = variant === 'boss' ? '#b8693e' : variant === 'shooter' ? '#c98a55' : '#c7774a';
    const TC_SH = darken(TC, 0.72), TC_LT = '#e3a173';
    const walk = st.anim === 'walk' ? S(t * 7) : 0;
    const crouch = st.anim === 'windup' ? Math.min(1, st.at / 0.4) : 0;
    const by = -crouch * -4;
    // gambe tozze
    cap(-9, -22 + by, -11 + walk * 5, -2, 7, TC_SH, darken(TC_SH, 0.8));
    cap(9, -22 + by, 11 - walk * 5, -2, 7, TC, TC_SH);
    poly([-20 + walk * 5, -4, -3 + walk * 5, -4, -2 + walk * 5, 1, -21 + walk * 5, 1], TC_SH, 1.8);
    poly([3 - walk * 5, -4, 21 - walk * 5, -4, 22 - walk * 5, 1, 2 - walk * 5, 1], TC, 1.8);
    // braccio posteriore
    const armRaise = st.armRaise || 0;
    cap(-12, -62 + by, -24, -44 + by - armRaise * 10, 6.5, TC_SH);
    // corpo cilindrico
    poly([-18, -20 + by, -20, -64 + by, -14, -74 + by, 14, -74 + by, 20, -64 + by, 18, -20 + by, 10, -16 + by, -10, -16 + by], TC, 2.2);
    polyNoOl([-18, -20 + by, -20, -64 + by, -14, -74 + by, -8, -74 + by, -10, -18 + by], TC_SH);
    polyNoOl([10, -70 + by, 14, -70 + by, 15, -24 + by, 11, -24 + by], TC_LT);
    // fasce decorative
    for (const yy of [-30, -48]) { curve([-18, yy + by, 0, yy + 4 + by, 18, yy + by], darken(TC, 0.55), 1.8); }
    if (variant === 'boss') {
      // corazza bronzea e spuntoni
      poly([-21, -50 + by, -22, -66 + by, 22, -66 + by, 21, -50 + by, 0, -44 + by], '#7f6a34', 2);
      poly([-15, -64 + by, -12, -56 + by, -9, -64 + by], '#d8c26a', 1.2);
      poly([9, -64 + by, 12, -56 + by, 15, -64 + by], '#d8c26a', 1.2);
      poly([-24, -66 + by, -32, -78 + by, -18, -70 + by], '#7f6a34', 1.8);
      poly([24, -66 + by, 32, -78 + by, 18, -70 + by], '#7f6a34', 1.8);
      circ(0, -54 + by, 4.5, phaseCol || '#e2412c', 1.6);
    } else {
      circ(0, -40 + by, 3, darken(TC, 0.55), 1.2);
    }
    // testa a cupola con fori (occhi e bocca)
    const hy = -74 + by;
    poly([-13, hy, -14, hy - 14, -8, hy - 24, 8, hy - 24, 14, hy - 14, 13, hy], TC, 2.2);
    polyNoOl([-13, hy, -14, hy - 14, -8, hy - 24, -4, hy - 24, -7, hy], TC_SH);
    const eyeGlow = st.eyeGlow || 0;
    ell(-2, hy - 14, 3.2, 2.2, eyeGlow ? '#ff4a2a' : '#2a130c', 0.15, 1.2);
    ell(8, hy - 14, 3.2, 2.2, eyeGlow ? '#ff4a2a' : '#2a130c', -0.15, 1.2);
    const mouth = st.mouthGlow || 0;
    ell(3, hy - 6, 3.6, 2.6 + mouth * 1.5, mouth ? '#ffcf4a' : '#2a130c', 0, 1.2);
    if (mouth) { g.globalAlpha = 0.5 * mouth; circ(3, hy - 6, 7 + mouth * 4, '#ffb03a', 0); g.globalAlpha = 1; }
    if (variant === 'boss') {
      // elmo cornuto
      poly([-15, hy - 18, -24, hy - 38, -12, hy - 24], '#7f6a34', 1.8);
      poly([15, hy - 18, 24, hy - 38, 12, hy - 24], '#7f6a34', 1.8);
      poly([-10, hy - 22, 0, hy - 30, 10, hy - 22], '#d8c26a', 1.6);
    } else if (variant === 'shooter') {
      poly([-6, hy - 23, 0, hy - 31, 6, hy - 23], TC_SH, 1.6);
    }
    // braccio anteriore (alzato in caricamento)
    const ax = 12, ay = -62 + by;
    const ex = ax + 10 + armRaise * 4, ey = ay + 16 - armRaise * 30;
    const hx = ex + 6 + (st.punch || 0) * 18, hy2 = ey + 12 - armRaise * 22;
    cap(ax, ay, ex, ey, 6.5, TC, TC_SH);
    cap(ex, ey, hx, hy2, 6, TC, TC_SH);
    circ(hx, hy2, 7.5, TC_LT, 2);
  }

  /* ---------- BIG SHOOTER (rif. 15): doppia prua arancione, corpo blu, motori bianchi ---------- */
  function drawBigShooter(t, withMiwa) {
    const fl = S(t * 30) > 0 ? 1 : 0.7;
    // fiamme motori
    g.globalAlpha = 0.9;
    poly([-70, -6, -100 - fl * 18, -2, -70, 4], '#ffd34a', 0); poly([-70, -4, -88 - fl * 10, -1, -70, 2], '#fff6c0', 0);
    poly([-62, 14, -92 - fl * 18, 18, -62, 24], '#ffd34a', 0);
    g.globalAlpha = 1;
    // scafo posteriore (lontano)
    poly([-72, 2, -60, -8, 60, -8, 92, 4, 60, 10, -66, 10], '#d9661e', 2);
    poly([-50, -8, -40, -20, -20, -8], '#d63a2a', 1.6);
    // corpo centrale blu
    poly([-42, 8, -46, -6, -26, -16, 22, -16, 40, -4, 36, 10], '#2b48b8', 2);
    polyNoOl([-42, 8, -46, -6, -26, -16, -18, -16, -24, 8], '#1f3488');
    // cupola cockpit
    ell(-4, -16, 16, 8, '#88d4ea', 0, 1.8);
    if (withMiwa) {
      // Miwa: capelli castani a caschetto, fascia gialla, visiera verde (rif. 20/21)
      ell(-4, -17, 5, 5.2, '#7a4524', 0, 1);
      ell(-2.5, -16.5, 3.4, 3.8, '#f3cfae', 0, 0.8);
      line(-8, -20, 0, -20.5, '#f5d23a', 1.4);
      poly([-4.5, -18, 1, -18, 1, -15.5, -4.5, -15.5], 'rgba(60,200,140,0.75)', 0.6);
    }
    g.globalAlpha = 0.35; ell(-8, -19, 9, 3, '#ffffff', 0, 0); g.globalAlpha = 1;
    // motori bianchi con prese d'aria
    cap(-46, 2, 6, 2, 6, '#f3f1ea', '#c9c6bb');
    circ(10, 2, 7, '#e8e5da', 1.8); circ(10, 2, 4, '#3c3f4a', 1.2);
    cap(-40, 16, 14, 16, 6.5, '#f3f1ea', '#c9c6bb');
    // scafo anteriore (vicino) arancione con prua appuntita
    poly([-80, 14, -66, 8, 70, 8, 112, 20, 70, 30, -74, 30], '#f07a22', 2.2);
    polyNoOl([-80, 14, -66, 8, 70, 8, 112, 20, 100, 18, 60, 14, -70, 14], '#f9a24a');
    line(-70, 24, 80, 24, '#c24f15', 1.6);
    circ(18, 16, 7.5, '#e8e5da', 1.8); circ(18, 16, 4.3, '#3c3f4a', 1.2);
    // pinne rosse
    poly([-74, 10, -84, -12, -60, 8], '#d63a2a', 1.8);
    poly([-30, 30, -40, 40, -16, 30], '#d63a2a', 1.6);
  }

  /* ---------- RITRATTI per le scene (cut-in) ---------- */
  function portraitMiwa(x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    // tuta gialla, colletto arancio
    poly([-60, 80, -50, 40, -20, 26, 22, 26, 52, 40, 62, 80], '#f6e36a', 3);
    polyNoOl([-60, 80, -50, 40, -20, 26, -10, 30, -24, 80], '#d9c24a');
    poly([-22, 26, -12, 16, 14, 16, 24, 26, 2, 34], '#f08a2a', 2.5);
    poly([-10, 18, 12, 18, 10, 30, -8, 30], '#bfe3e0', 2);
    // capelli castani a caschetto (dietro)
    poly([-44, 10, -50, -30, -36, -60, 0, -70, 34, -62, 48, -34, 46, 6, 54, 16, 36, 12, 30, -10, -30, -10, -36, 14, -54, 20], '#7a4524', 3);
    // volto
    poly([-26, -30, -26, -4, -16, 12, 0, 18, 16, 12, 26, -4, 26, -30], '#f6d4b4', 3);
    polyNoOl([-26, -30, -26, -4, -16, 12, -10, 14, -18, -6, -18, -30], '#e6b894');
    // occhi
    for (const ex of [-12, 12]) { ell(ex, -16, 7, 5, '#ffffff', 0, 1.8); circ(ex + (ex > 0 ? 1 : -1), -15.5, 3.4, '#2e6b3a', 1); circ(ex, -16.5, 1.2, '#ffffff', 0); line(ex - 8, -25, ex + 8, -26 - (ex > 0 ? -1 : 1), '#5a2d14', 2.2); }
    line(-2, 2, 2, 2, '#a05a3a', 1.6);
    curve([-6, 8, 0, 10, 6, 8], '#b0402e', 2);
    // ciuffo davanti
    poly([-30, -32, -20, -64, 10, -66, 30, -50, 30, -30, 18, -42, 4, -34, -10, -44], '#7a4524', 3);
    // fascia gialla e visiera verde
    poly([-38, -40, -24, -56, 22, -58, 40, -42, 36, -38, 20, -50, -22, -48, -34, -36], '#f5d23a', 2.4);
    g.globalAlpha = 0.55;
    poly([-30, -36, 30, -38, 32, -4, 0, 6, -32, -4], '#2fbf86', 2);
    g.globalAlpha = 0.35; poly([-24, -32, 0, -34, -10, -10, -26, -8], '#ffffff', 0);
    g.globalAlpha = 1;
    g.restore();
  }
  function portraitHiroshi(x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    // completo chiaro con colletto rosso
    poly([-70, 90, -64, 34, -24, 20, 24, 20, 64, 34, 70, 90], SUIT, 3);
    polyNoOl([-70, 90, -64, 34, -24, 20, -14, 24, -30, 90], SUIT_SH);
    poly([-26, 20, -20, -2, -6, 18], SUIT, 2.4); poly([26, 20, 20, -2, 6, 18], SUIT, 2.4);
    line(-20, -2, -26, 20, RED, 3); line(20, -2, 26, 20, RED, 3);
    // collo e volto
    poly([-10, 0, -10, 20, 10, 20, 10, 0], SKIN_SH, 2);
    poly([-24, -40, -24, -10, -14, 6, 0, 12, 14, 6, 24, -10, 24, -40], SKIN, 3);
    polyNoOl([-24, -40, -24, -10, -14, 6, -6, 9, -14, -14, -16, -40], SKIN_SH);
    // occhi decisi
    for (const ex of [-11, 11]) { poly([ex - 7, -24, ex + 7, -24, ex + 6, -19, ex - 6, -19], '#ffffff', 1.6); circ(ex, -21.5, 2.4, '#2a1a10', 0); line(ex - 9, ex < 0 ? -33 : -29, ex + 9, ex < 0 ? -29 : -33, OL, 3); }
    line(0, -14, -2, -4, '#b0703f', 1.6);
    line(-7, 2, 7, 2, OL, 2);
    // capelli scuri spettinati
    poly([-30, -20, -36, -50, -22, -74, 6, -80, 30, -70, 38, -44, 32, -18, 26, -34, 18, -44, 6, -38, -6, -46, -16, -38, -24, -42], HAIR, 3);
    poly([-28, -60, -46, -72, -32, -50], HAIR, 2); poly([20, -70, 36, -86, 32, -62], HAIR, 2);
    // guanti uniti (rif. 02): gialli con emblema verde e lampo
    const pulse = 0.5 + 0.5 * S(t * 20);
    for (const sx of [-1, 1]) {
      poly([sx * 4, 40, sx * 4, 74, sx * 40, 78, sx * 52, 58, sx * 46, 40], GLOVE, 3);
      for (let k = 0; k < 4; k++) circ(sx * 8, 46 + k * 8, 3.6, '#7f8b96', 1.4);
      ell(sx * 30, 58, 9, 11, '#1b5a2a', 0, 2); ell(sx * 30, 58, 6.5, 8.5, '#2b2b2b', 0, 1);
      poly([sx * 28, 52, sx * 33, 56, sx * 28, 60, sx * 33, 64], '#f6d33a', 0);
    }
    g.globalAlpha = pulse * 0.6; circ(0, 58, 18, '#fff7b0', 0); g.globalAlpha = 1;
    g.restore();
  }

  /* ---------- oggetti ---------- */
  function drawGlovesItem(t) {
    const b = S(t * 4) * 3;
    g.save(); g.translate(0, b);
    g.globalAlpha = 0.35 + 0.25 * S(t * 6); circ(0, -10, 24, '#fff2a0', 0); g.globalAlpha = 1;
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 9, -10); g.rotate(sx * 0.25);
      poly([-8, -9, 8, -9, 9, 7, -9, 7], GLOVE, 2);
      for (let k = 0; k < 4; k++) circ(-6 + k * 4, -9, 1.8, '#7f8b96', 1);
      ell(0, 0, 4, 4.5, '#1b5a2a', 0, 1.2); poly([-1, -2, 1.2, 0, -1, 1, 1.2, 3], '#f6d33a', 0);
      g.restore();
    }
    g.restore();
  }

  J.spr = {
    setCtx, cap, poly, polyNoOl, circ, ell, line, curve, darken, OL,
    pose, drawHumanoid, HIRO, HIRO_G, CYBORG, JEEG, SOLDIER, LANCER,
    drawHaniwaGiant, drawBigShooter, portraitMiwa, portraitHiroshi, drawGlovesItem,
  };
})();
