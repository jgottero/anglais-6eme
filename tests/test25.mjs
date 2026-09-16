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

console.log('start:', JSON.stringify(await page.evaluate(() => ({
  land: PropertyState.scene().land,
  plots: PropertyState.scene().plots.map(p => p.id + (p.owned ? ' (mine)' : ' ' + p.price)),
  tags: document.querySelectorAll('.plot.is-forsale').length,
  locked: document.querySelectorAll('.blk.is-locked').length,
  canvas: (() => { const c = document.querySelector('canvas.ground'); return c && c.width + 'x' + c.height; })()
})), null, 1));

// The opening view sits on the child's own land.
console.log('opening camera:', JSON.stringify(await page.evaluate(() => {
  const el = document.querySelector('.blk-house').getBoundingClientRect();
  return { houseOnScreen: el.left > 0 && el.right < innerWidth && el.top > 0 && el.bottom < innerHeight,
           houseWidth: Math.round(el.width) };
})));

// Buy the lot, then walk into every building.
await page.evaluate(() => { REWARD.addCoins(60000); PropertyState.get().owned.length; });
await page.evaluate(() => SCENES.PLOTS.forEach(p => PropertyState.buyPlot(p.id)));
await page.waitForTimeout(600);
const walk = await page.evaluate(() => {
  const scenes = {};
  const place = PropertyState.scene();
  const ways = place.blocks.filter(b => b.to).map(b => b.kind + '→' + b.to);
  const visited = [];
  const all = Object.keys(PropertyState.get().placed);
  return { ways, all };
});
console.log('doors outside:', JSON.stringify(walk.ways));
console.log('scenes:', JSON.stringify(walk.all));

for (const id of walk.all) {
  const ok = await page.evaluate(scene => {
    if (scene === 'outside') return true;
    const entered = PropertyState.enter(scene);
    const place = PropertyState.scene();
    const doors = place.blocks.filter(b => b.to).length;
    return entered && place.id === scene && doors > 0;
  }, id);
  if (!ok) errors.push('CANNOT USE SCENE ' + id);
}
await page.evaluate(() => PropertyState.enter('outside'));
await page.waitForTimeout(500);

// What looks like water is what one cannot build on, all along the coast.
console.log('coast:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  let water = 0, land = 0, mismatch = 0;
  for (let y = 52; y < 68; y++) for (let x = 0; x < 80; x++) {
    const wet = Ground.look(place, x, y) === 'water';
    const free = PropertyState.buildable(x, y, 1, 1);
    if (wet) water++; else land++;
    if (wet === free) mismatch++;
  }
  // The lake too.
  let lake = 0;
  for (let y = 0; y < 16; y++) for (let x = 56; x < 80; x++) if (Ground.look(place, x, y) === 'water') lake++;
  return { water, land, mismatch, lake };
})));

// The coastline must weave, not run straight along a plot edge.
console.log('coastline:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  const firstWet = [];
  for (let x = 0; x < 80; x += 4) {
    let y = 52;
    while (y < 68 && Ground.look(place, x, y) !== 'water') y++;
    firstWet.push(y);
  }
  return { firstWet, distinct: new Set(firstWet).size };
})));

await page.evaluate(() => World.fitCamera());
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'shot-world-all.png' });

await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(900);
await page.screenshot({ path: SHOTS + 'shot-world-start.png' });

const phone = await browser.newPage({ viewport: { width: 400, height: 780 }, deviceScaleFactor: 2 });
await phone.goto(SITE + '/reward/index.html');
await phone.waitForTimeout(900);
await phone.screenshot({ path: SHOTS + 'shot-world-phone.png' });

console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
