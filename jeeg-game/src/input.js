/* input.js — tastiera, gamepad (Gamepad API / encoder arcade USB), touch.
 * Pulsanti LOGICI: left right up down A B AB T SEL START.
 * A+B: finestra di simultaneità (ritardo 4 frame) per evitare pugno+salto involontari.
 */
'use strict';
(function () {
  const LOGICAL = ['left', 'right', 'up', 'down', 'A', 'B', 'AB', 'T', 'SEL', 'START'];

  /* Mappa di default: compatibile con encoder arcade in modalità tastiera (layout MAME P1)
   * e con tastiera PC. */
  const DEFAULT_KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
    KeyZ: 'A', KeyJ: 'A', ControlLeft: 'A',
    KeyX: 'B', KeyK: 'B', AltLeft: 'B', Space: 'B',
    KeyV: 'AB', KeyU: 'AB',
    KeyT: 'T', KeyL: 'T', ShiftLeft: 'T',
    KeyC: 'SEL', KeyI: 'SEL', KeyQ: 'SEL',
    Enter: 'START', Digit1: 'START', Escape: 'START', KeyP: 'START', Digit5: 'START',
  };
  /* Gamepad "standard": 0=A(sud) 1=B(est) 2=X 3=Y 8=select 9=start 12-15=croce */
  const DEFAULT_PAD = { 0: 'A', 1: 'B', 2: 'T', 3: 'SEL', 4: 'AB', 5: 'AB', 8: 'SEL', 9: 'START', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

  const held = {}; const prevHeld = {};
  const pressed = {};
  const kbHeld = {}; const touchHeld = {}; const padHeld = {};
  let keyMap = Object.assign({}, DEFAULT_KEYS);
  let padMap = Object.assign({}, DEFAULT_PAD);
  let lastDevice = 'keyboard';

  try {
    const saved = JSON.parse(localStorage.getItem(J.BINDINGS_KEY) || 'null');
    if (saved && saved.keys) keyMap = Object.assign({}, DEFAULT_KEYS, saved.keys);
    if (saved && saved.pad) padMap = Object.assign({}, saved.pad);
  } catch (e) { /* storage non disponibile */ }

  /* --- Rimappatura (menu CONFIGURA COMANDI) --- */
  let remapListener = null;
  function captureNext(cb) { remapListener = cb; }

  addEventListener('keydown', (e) => {
    J.audio && J.audio.unlock();
    if (remapListener) { e.preventDefault(); const cb = remapListener; remapListener = null; cb({ kind: 'key', code: e.code }); return; }
    const l = keyMap[e.code];
    if (l) { e.preventDefault(); kbHeld[l] = (kbHeld[l] || 0) | 1; kbHeld['_' + e.code] = l; lastDevice = 'keyboard'; }
  });
  addEventListener('keyup', (e) => {
    const l = keyMap[e.code];
    if (l) {
      e.preventDefault();
      delete kbHeld['_' + e.code];
      // il pulsante logico resta premuto se un altro tasto mappato sullo stesso è ancora giù
      kbHeld[l] = Object.keys(kbHeld).some((k) => k[0] === '_' && kbHeld[k] === l) ? 1 : 0;
    }
  });
  addEventListener('blur', () => { for (const k in kbHeld) delete kbHeld[k]; for (const k in touchHeld) delete touchHeld[k]; });

  /* --- Touch: pulsanti HTML con data-btn --- */
  function bindTouch(root) {
    root.querySelectorAll('[data-btn]').forEach((el) => {
      const names = el.dataset.btn.split(',');
      const down = (e) => { e.preventDefault(); J.audio && J.audio.unlock(); try { el.setPointerCapture(e.pointerId); } catch (_) {} names.forEach((n) => (touchHeld[n] = 1)); el.classList.add('on'); lastDevice = 'touch'; };
      const up = (e) => { e && e.preventDefault(); names.forEach((n) => (touchHeld[n] = 0)); el.classList.remove('on'); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    });
  }

  let padPrevButtons = [];
  function pollPad() {
    for (const k in padHeld) padHeld[k] = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const btns = gp.buttons.map((b) => (typeof b === 'object' ? b.pressed || b.value > 0.5 : b === 1));
      if (remapListener) {
        for (let i = 0; i < btns.length; i++) if (btns[i] && !padPrevButtons[i]) { const cb = remapListener; remapListener = null; cb({ kind: 'pad', index: i }); break; }
      }
      padPrevButtons = btns;
      btns.forEach((p, i) => { if (p && padMap[i]) { padHeld[padMap[i]] = 1; lastDevice = 'pad'; } });
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.45) padHeld.left = 1;
      if (ax > 0.45) padHeld.right = 1;
      if (ay < -0.55) padHeld.up = 1;
      if (ay > 0.55) padHeld.down = 1;
      break; // giocatore 1 = primo controller connesso
    }
  }

  /* --- Risoluzione A / B / A+B --- */
  const COMBO_FRAMES = 4;
  let pendA = 0, pendB = 0;
  const actions = { attack: false, jump: false, beam: false };

  function update() {
    pollPad();
    for (const l of LOGICAL) {
      prevHeld[l] = held[l];
      held[l] = !!(kbHeld[l] || touchHeld[l] || padHeld[l]);
      pressed[l] = held[l] && !prevHeld[l];
    }
    actions.attack = actions.jump = actions.beam = false;
    if (pressed.AB) { actions.beam = true; pendA = pendB = 0; return; }
    const pA = pressed.A, pB = pressed.B;
    if ((pA && (pB || pendB)) || (pB && pendA)) { actions.beam = true; pendA = pendB = 0; return; }
    if (pA) pendA = COMBO_FRAMES;
    if (pB) pendB = COMBO_FRAMES;
    if (pendA && --pendA === 0) actions.attack = true;
    if (pendB && --pendB === 0) actions.jump = true;
  }
  /* Nei menu: azioni immediate senza buffer */
  function menuPressed(l) { return !!pressed[l]; }

  function setBinding(logical, ev) {
    if (ev.kind === 'key') {
      keyMap[ev.code] = logical; // aggiunge il tasto (i tasti di default restano attivi)
    } else {
      for (const k in padMap) if (padMap[k] === logical) delete padMap[k];
      padMap[ev.index] = logical;
    }
    try { localStorage.setItem(J.BINDINGS_KEY, JSON.stringify({ keys: keyMap, pad: padMap })); } catch (e) {}
  }
  function resetBindings() {
    keyMap = Object.assign({}, DEFAULT_KEYS); padMap = Object.assign({}, DEFAULT_PAD);
    try { localStorage.removeItem(J.BINDINGS_KEY); } catch (e) {}
  }
  function clearAll() { pendA = pendB = 0; for (const l of LOGICAL) { pressed[l] = false; } }
  /* Iniezione per test automatici */
  function inject(l, v) { touchHeld[l] = v ? 1 : 0; }

  J.input = { held, pressed, actions, update, menuPressed, bindTouch, captureNext, setBinding, resetBindings, clearAll, inject, LOGICAL,
    get device() { return lastDevice; } };
})();
