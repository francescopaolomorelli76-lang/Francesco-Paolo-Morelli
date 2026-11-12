// Verifica checkpoint: morte → respawn all'ultimo checkpoint, guanti conservati, vite scalate, salvataggio.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/JEEG_LIVELLO1.html'));
  await p.evaluate(() => { localStorage.clear(); JEEG.start(false); JEEG.world.scene = null; });
  const st = () => p.evaluate(() => { const w = JEEG.world; return { cp: w.cp, gloves: w.gloves, x: Math.round(w.player.x), lives: w.lives, form: w.player.form, hp: Math.round(w.player.hp) }; });
  await p.evaluate(() => { JEEG.world.player.x = 1250; }); await p.waitForTimeout(300);
  await p.evaluate(() => { const pl = JEEG.world.player; pl.x = 1960; pl.y = 300; }); await p.waitForTimeout(900);
  console.log('dopo cp1 + guanti', await st());
  await p.evaluate(() => { const w = JEEG.world; w.player.hp = 1; w.player.inv = 0; JEEG.input.inject('right', true); });
  await p.waitForFunction(() => JEEG.world.lives === 2, null, { timeout: 15000 });
  await p.evaluate(() => JEEG.input.inject('right', false));
  const s = await st(); console.log('dopo morte', s);
  const save = JSON.parse(await p.evaluate(() => localStorage.getItem('jeeg_master_1_2_save')));
  console.log('save', save);
  const ok = s.cp === 1 && s.gloves && s.lives === 2 && s.x < 1300 && save.gloves && save.cp === 1;
  console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
  await b.close(); process.exit(ok ? 0 : 1);
})();
