import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(40000);
  PropertyState.plotsForSale().map(p => p.id).forEach(id => PropertyState.buyPlot(id));
  World.fitCamera();
});
await page.waitForTimeout(600);

async function enterVia(selector, label) {
  const box = await page.evaluate(sel => {
    const node = document.querySelector(sel);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return 'offscreen';
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  if (!box || box === 'offscreen') { console.log(label, '->', box); return; }
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(250);
  console.log(label, '-> bar:', await page.evaluate(() => document.getElementById('action-bar').textContent.trim()));
  const button = await page.locator('#action-bar .enter-btn').count();
  if (!button) return;
  await page.click('#action-bar .enter-btn');
  await page.waitForTimeout(400);
  console.log('   entered:', await page.evaluate(() => PropertyState.scene().name));
  await page.screenshot({ path: SHOTS + 'v10-' + label + '.png' });
  await page.evaluate(() => PropertyState.enter('outside'));
  await page.waitForTimeout(300);
  await page.evaluate(() => World.fitCamera());
  await page.waitForTimeout(250);
}

await enterVia('.blk-cabin', 'cabane');
await enterVia('.blk-cottage', 'maisonnette');
await enterVia('.blk-tower', 'immeuble');

await page.evaluate(() => PropertyState.enter('flat_1'));
await page.waitForTimeout(400);
const up = await page.evaluate(() => {
  const r = document.querySelector('.blk-lift_up').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(up.x, up.y);
await page.waitForTimeout(250);
console.log('lift bar:', await page.evaluate(() => document.getElementById('action-bar').textContent.trim()));
await page.click('#action-bar .enter-btn');
await page.waitForTimeout(400);
console.log('after climbing:', await page.evaluate(() => PropertyState.scene().name));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
