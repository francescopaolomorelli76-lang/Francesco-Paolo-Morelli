// Smoke test: carica la build, controlla errori JS, cattura screenshot.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp/shots';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../dist/JEEG_LIVELLO1.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/01_title.png' });
  await page.evaluate(() => JEEG.start(false));
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/02_dialog.png' });
  console.log(JSON.stringify(errors));
  await browser.close();
})();
