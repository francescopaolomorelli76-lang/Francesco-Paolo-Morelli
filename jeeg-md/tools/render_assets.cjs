// Rasterizza la grafica di Jeeg (stesso disegno della versione HTML5, src/sprites.js)
// in PNG a risoluzione Mega Drive: sprite fotogramma per fotogramma, fondali, schermate.
// Uso: node tools/render_assets.cjs  ->  res/png/*.png + res/png/manifest.json
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const GAME = path.resolve(ROOT, '../jeeg-game/src');
const OUT = path.join(ROOT, 'res/png');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.setContent('<canvas id=c></canvas>');
  for (const f of ['config.js', 'sprites.js', 'background.js']) await p.addScriptTag({ content: fs.readFileSync(path.join(GAME, f), 'utf8') });
  await p.addScriptTag({ path: path.join(__dirname, 'bg_md.js') });
  await p.addScriptTag({ path: path.join(__dirname, 'render_page.js') });
  const list = await p.evaluate(() => window.RENDER_LIST());
  const manifest = {};
  for (const item of list) {
    const url = await p.evaluate((name) => window.RENDER_ONE(name), item.name);
    fs.writeFileSync(path.join(OUT, item.name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    manifest[item.name] = item;
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('rendered', list.length);
  await b.close();
})();
