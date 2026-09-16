import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); });
await page.waitForTimeout(400);

// Nothing can be built on the plot that is not ours yet.
console.log('ground rules:', JSON.stringify(await page.evaluate(() => ({
  onMine: PropertyState.canPlace(CATALOG.item('chicken'), 4, 10, null, 0),
  onTheNextPlot: PropertyState.canPlace(CATALOG.item('chicken'), 32, 10, null, 0),
  buyingThere: PropertyState.buyAt('chicken', 32, 10, 0)
}))));

// Zoom right out so the whole property, sale plot included, is on screen.
await page.mouse.move(500, 400);
await page.mouse.wheel(0, 1200);
await page.waitForTimeout(250);

// The locked plot is tapped, and its bar says what is missing.
const tag = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('.plot.is-forsale')).find(n => n.dataset.sale === 'meadow');
  const r = el.getBoundingClientRect();
  return { x: Math.min(innerWidth - 60, Math.max(60, r.left + r.width / 2)),
           y: Math.min(innerHeight - 160, Math.max(80, r.top + r.height / 2)) };
});
await page.mouse.click(tag.x, tag.y);
await page.waitForTimeout(250);
console.log('locked plot bar (broke):', await page.evaluate(() => document.getElementById('action-bar').textContent.trim()));

await page.evaluate(() => REWARD.addCoins(400));
await page.waitForTimeout(250);
console.log('locked plot bar (rich):', await page.evaluate(() => document.getElementById('action-bar').textContent.trim()));
await page.screenshot({ path: SHOTS + 'v10-plot-bar.png' });

await page.click('#action-bar .sell-btn');
await page.waitForTimeout(400);
console.log('after buying:', JSON.stringify(await page.evaluate(() => ({
  owned: PropertyState.get().owned, coins: REWARD.coins(),
  land: PropertyState.scene().land, plots: PropertyState.scene().plots.map(p => p.id),
  next: PropertyState.plotsForSale().map(p => p.id).join(','),
  canBuildThere: PropertyState.canPlace(CATALOG.item('chicken'), 32, 10, null, 0)
}))));

// Buy the rest and check every scene the plots bring in.
console.log('buying the lot:', JSON.stringify(await page.evaluate(() => {
  const bought = [];
  REWARD.addCoins(40000);
  PropertyState.plotsForSale().map(p => p.id).forEach(id => {
    if (PropertyState.buyPlot(id)) bought.push(id);
  });
  return { bought, scenes: Object.keys(PropertyState.get().placed).length, forSale: PropertyState.plotsForSale().length };
})));
await page.waitForTimeout(400);
console.log('full property:', JSON.stringify(await page.evaluate(() => ({
  land: PropertyState.scene().land,
  plots: PropertyState.scene().plots.map(p => p.id + ':' + p.ground),
  blocks: PropertyState.scene().blocks.map(b => b.kind).join(',')
}))));
await page.screenshot({ path: SHOTS + 'v10-full.png' });

// Walk in: cabin, cottage, and all three floors of the block of flats.
const walk = async (to, from) => {
  const ok = await page.evaluate(id => PropertyState.enter(id), to);
  await page.waitForTimeout(350);
  const name = await page.evaluate(() => PropertyState.scene().name);
  const ways = await page.evaluate(() => PropertyState.scene().blocks.filter(b => b.to).map(b => b.kind + '->' + b.to));
  console.log('  ', to, ok ? 'ok' : 'FAILED', '|', name, '|', JSON.stringify(ways));
};
console.log('rooms:');
for (const id of ['cabin', 'cottage_west', 'cottage_east', 'flat_1', 'flat_2', 'flat_3']) await walk(id);

// Furnish a floor and check it is its own world.
await page.evaluate(() => { PropertyState.enter('flat_2'); REWARD.addCoins(2000); PropertyState.buyAt('bed', 2, 2, 0); });
await page.waitForTimeout(350);
await page.screenshot({ path: SHOTS + 'v10-flat.png' });
console.log('flat_2 holds:', JSON.stringify(await page.evaluate(() => PropertyState.scene().placed.map(p => p.id))),
            '| flat_3 holds:', JSON.stringify(await page.evaluate(() => PropertyState.get().placed.flat_3 || [])));

// The sea cannot be built on.
await page.evaluate(() => PropertyState.enter('outside'));
await page.waitForTimeout(350);
console.log('the sea refuses objects:', await page.evaluate(() => {
  const place = PropertyState.scene();
  for (let y = 28; y < 40; y++) {
    for (let x = 28; x < 48; x++) {
      if (Ground.look(place, x, y) === 'water') return PropertyState.canPlace(CATALOG.item('chicken'), x, y, null, 0) === false;
    }
  }
  return 'no sea found';
}));

// A reload keeps the plots and everything in them.
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(600);
console.log('after reload:', JSON.stringify(await page.evaluate(() => ({
  owned: PropertyState.get().owned.length, land: PropertyState.scene().land,
  flat2: (PropertyState.get().placed.flat_2 || []).map(p => p.id)
}))));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
