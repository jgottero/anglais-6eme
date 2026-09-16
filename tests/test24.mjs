import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1200, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(900);

// The whole map is there from the first day.
console.log('at the start:', JSON.stringify(await page.evaluate(() => ({
  land: PropertyState.scene().land,
  plots: PropertyState.scene().plots.map(p => p.id + (p.owned ? '' : '/' + p.price)),
  forSale: PropertyState.plotsForSale().map(p => p.id),
  tags: document.querySelectorAll('.plot.is-forsale').length,
  lockedBuildings: document.querySelectorAll('.blk.is-locked').length,
  canvas: (() => { const c = document.querySelector('canvas.ground'); return c && { w: c.width, h: c.height }; })()
}))));

// Any plot can be bought, in any order: the dearest first if one can.
await page.evaluate(() => REWARD.addCoins(20000));
await page.waitForTimeout(200);
const tower = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('.plot.is-forsale')).find(n => n.dataset.sale === 'port');
  const r = el.getBoundingClientRect();
  return { x: Math.min(innerWidth - 60, Math.max(60, r.left + r.width / 2)), y: Math.min(innerHeight - 160, Math.max(80, r.top + r.height / 2)) };
});
await page.mouse.click(tower.x, tower.y);
await page.waitForTimeout(250);
console.log('tapping the harbour:', await page.evaluate(() => document.getElementById('action-bar').textContent.trim()));
await page.click('#action-bar [data-action="plot"]');
await page.waitForTimeout(600);
console.log('bought out of order:', JSON.stringify(await page.evaluate(() => ({
  owned: PropertyState.get().owned, coins: REWARD.coins(),
  rooms: Object.keys(PropertyState.get().placed).length,
  canEnterShed: !!PropertyState.enter('shed')
}))));
await page.evaluate(() => PropertyState.enter('outside'));
await page.waitForTimeout(400);

// The sea one sees is the sea one cannot build on.
console.log('shore:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  let water = 0, sand = 0, mismatch = 0;
  for (let y = 52; y < 68; y++) {
    for (let x = 28; x < 56; x++) {
      const look = Ground.look(place, x, y);
      if (look === 'water') water++; else if (look === 'sand') sand++;
    }
  }
  // Every case that looks like water refuses an object, and only those.
  PropertyState.buyPlot('beach');
  for (let y = 52; y < 68; y++) {
    for (let x = 28; x < 56; x++) {
      const wet = Ground.look(place, x, y) === 'water';
      const free = PropertyState.buildable(x, y, 1, 1);
      if (wet === free) mismatch++;
    }
  }
  return { water, sand, mismatch };
})));

// A building on a plot nobody owns cannot be walked into.
await page.evaluate(() => REWARD.reset());
await page.waitForTimeout(500);
console.log('locked buildings:', JSON.stringify(await page.evaluate(() => {
  const cabin = PropertyState.scene().blocks.find(b => b.kind === 'cabin');
  return { to: cabin.to, owned: cabin.owned, cabinScene: !!PropertyState.get().placed.cabin, enter: PropertyState.enter('cabin') };
})));

await page.mouse.move(600, 430);
await page.mouse.wheel(0, 2000);
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'v20-start.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
