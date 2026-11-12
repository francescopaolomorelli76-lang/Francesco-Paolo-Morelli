// Partita completa automatica del Livello 1 con un bot che usa SOLO gli input logici
// (nessun teletrasporto). Verifica: guanti → trasformazione → cyborg → BUILD UP → Jeeg →
// giganti → checkpoint → raggi → boss 3 fasi → completamento. Screenshot nei momenti chiave.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp/shots';
const GOD = process.argv[3] !== 'nogod';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  console.log('goto');
  await page.goto('file://' + path.resolve(__dirname, '../dist/JEEG_LIVELLO1.html'));
  await page.waitForTimeout(300);
  await page.evaluate((god) => {
    localStorage.clear();
    JEEG.start(false); JEEG.god(god); JEEG.game.timeScale = 2;
    const I = JEEG.input; let f = 0; const log = (window.__log = []);
    const tap = {}; const press = (k) => { tap[k] = k === 'B' ? 14 : 3; };
    window.__bot = setInterval(() => {
      f++;
      const w = JEEG.world; if (!w) return;
      for (const k of ['A', 'B', 'AB', 'T', 'SEL', 'START']) { if (tap[k] > 0) { I.inject(k, tap[k] > 1); tap[k]--; } else I.inject(k, false); }
      if (JEEG.mode !== 'play') { if (JEEG.mode === 'complete' && f % 20 === 0) log.push('COMPLETE'); return; }
      const p = w.player;
      if (w.scene) { I.inject('right', false); if (w.scene.kind === 'dialog' && f % 12 === 0) press('A'); return; }
      if (p.form === 'human' && w.gloves && f % 10 === 0 && p.onGround) { press('T'); return; }
      if (p.form === 'cyborg' && p.x > 2550 && p.onGround && f % 10 === 0) { press('T'); return; }
      const reach = p.form === 'jeeg' ? 260 : 60;
      let near = null, nd = 1e9;
      const targets = w.enemies.filter((e) => e.alive);
      if (w.boss.active && w.boss.alive) targets.push(w.boss);
      for (const e of targets) { const d = Math.abs(e.x - p.x) - e.w / 2; if (d < nd && Math.abs(e.y - p.y) < (p.form === 'jeeg' ? 400 : 120)) { nd = d; near = e; } }
      let move = 1;
      if (near && nd < reach) {
        move = 0; p.face = near.x > p.x ? 1 : -1;
        if (near.x < p.x) { I.inject('left', true); I.inject('right', false); setTimeout(() => I.inject('left', false), 20); }
        if (f % 8 === 0) press('A');
      }
      if (p.form === 'jeeg' && near && nd < 1000) {
        const cost = p.beam === 'gamma' ? 15 : 35;
        if (near.isBoss && f % 90 === 0) press('SEL');
        else if (p.en >= cost && f % 45 === 0 && p.state === 'normal') { press('AB'); }
      }
      if (near && near.isBoss && nd < 120) move = -1;
      if (p.hitWall && p.onGround && f % 6 === 0) press('B');
      p.hitWall = false;
      I.inject('right', move > 0); if (move < 0) I.inject('left', true); else if (move === 0) {} else I.inject('left', false);
    }, 16);
  }, GOD);
  console.log('bot started');
  const shots = {};
  const shot = async (name) => { if (shots[name]) return; shots[name] = 1; await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(120);
    const s = await page.evaluate(() => { const w = JEEG.world; const p = w.player; return { mode: JEEG.mode, x: Math.round(p.x), form: p.form, gloves: w.gloves, cp: w.cp, hp: Math.round(p.hp), en: Math.round(p.en), scene: w.scene && w.scene.kind, sceneT: w.scene && w.scene.t, boss: w.boss && { hp: Math.round(w.boss.hp), phase: w.boss.phase, state: w.boss.state, active: w.boss.active }, beam: p.state === 'beam' ? p.beamActive.kind : null, enemies: w.enemies.filter((e) => e.alive).length, near: w.enemies.some((e) => e.alive && Math.abs(e.x - p.x) < 120 && !e.giant), giantNear: w.enemies.some((e) => e.alive && e.giant && Math.abs(e.x - p.x) < 600), lives: w.lives, score: w.score }; });
    const key = `${s.mode} ${s.form} cp${s.cp} gl${+s.gloves} ${s.scene || ''} boss:${s.boss.active ? s.boss.phase + '/' + s.boss.hp : '-'}`;
    if (key !== last || Math.random() < 0.04) { console.log(Math.round((Date.now() - t0) / 1000) + 's', key, 'x=' + s.x, 'hp=' + s.hp, 'en=' + s.en, 'lives=' + s.lives); last = key; }
    if (s.mode === 'play' && !s.scene && s.form === 'human' && s.near) await shot('03_human_fight');
    if (s.gloves && s.form === 'human' && !s.scene) await shot('04_gloves');
    if (s.scene === 'transform') { await page.waitForTimeout(250); await shot('05_transform_cutin'); await page.waitForTimeout(700); await shot('06_transform_flash'); }
    if (s.form === 'cyborg' && !s.scene) await shot('07_cyborg');
    if (s.scene === 'buildup') { await page.waitForTimeout(500); await shot('08_head'); await page.waitForTimeout(500); await shot('09_miwa_cutin'); await page.waitForTimeout(700); await shot('10_magnetic'); await page.waitForTimeout(600); await shot('11_magnetic2'); await page.waitForTimeout(800); await shot('12_buildup'); }
    if (s.form === 'jeeg' && s.giantNear && !s.scene) await shot('13_jeeg_giant');
    if (s.beam === 'gamma') await shot('14_gamma');
    if (s.beam === 'proton') await shot('15_proton');
    if (s.scene === 'bossintro') { await page.waitForTimeout(300); await shot('16_boss_intro'); }
    if (s.boss.active && s.boss.phase === 1 && !s.scene) await shot('17_boss_p1');
    if (s.boss.active && s.boss.phase === 2 && s.boss.state !== 'roar') await shot('18_boss_p2');
    if (s.boss.active && s.boss.phase === 3 && s.boss.state !== 'roar') await shot('19_boss_p3');
    if (s.scene === 'victory') await shot('20_victory');
    if (s.mode === 'complete') { await page.waitForTimeout(600); await shot('21_complete'); break; }
  }
  console.log('ERRORS', JSON.stringify(errors));
  const save = await page.evaluate(() => localStorage.getItem('jeeg_master_1_2_save'));
  console.log('SAVE', save);
  await browser.close();
})();
