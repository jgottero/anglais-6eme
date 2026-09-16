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
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(3000); });
await page.waitForTimeout(300);

// Rules, checked straight against the state.
const rules = await page.evaluate(() => {
  const at = (id, x, y) => { const b = PropertyState.buyAt(id, x, y); return !!b; };
  const can = (id, x, y) => PropertyState.canPlace(CATALOG.item(id), x, y, null);
  const out = {};
  out.pathPlaced = at('path', 8, 12);
  out.fieldOnPath = can('field', 8, 12);        // ground vs ground: no
  out.henOnPath = can('chicken', 8, 12);        // object on ground: yes
  out.henPlaced = at('chicken', 8, 12);
  out.dogOnHen = can('dog', 8, 12);             // object vs object: no
  out.fieldStillBlocked = can('field', 8, 12);
  out.fieldElsewhere = at('field', 10, 12);
  out.henOnField = at('duck', 10, 12);           // another object on the new field
  out.pathUnderHouse = can('path', 12, 2);      // the house takes both layers
  out.treeOverPath = (() => {                  // a 2x2 object across ground tiles
    return can('apple_tree', 6, 10);
  })();
  return out;
});
console.log(JSON.stringify(rules, null, 0));

// Draw order: ground first in the DOM, objects after.
const dom = await page.evaluate(() => Array.from(document.querySelectorAll('#world .ob')).map(n =>
  (n.className.includes('is-ground') ? 'ground:' : 'object:') + n.querySelector('img').alt));
console.log('draw order:', dom.join(' | '));

// A click on a tile holding both picks the object, not the ground.
await page.evaluate(() => { PropertyState.buyAt('path', 14, 14); PropertyState.buyAt('sheep', 14, 14); });
await page.waitForTimeout(250);
const rect = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const tile = 64 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 7.5 * tile, y: box.top + 7.5 * tile };
});
await page.mouse.click(rect.x, rect.y);
await page.waitForTimeout(250);
console.log('clicking a sheep standing on a path selects:',
  await page.locator('#action-bar .bar-id b').textContent());

// Moving the sheep away leaves the path behind.
await page.mouse.move(rect.x, rect.y);
await page.mouse.down();
await page.mouse.move(rect.x + 120, rect.y - 60, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
console.log('after moving it:', JSON.stringify(await page.evaluate(() =>
  PropertyState.scene().placed.map(p => `${p.id}@${p.x},${p.y}`))));

// The shop has its own Terrain family.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
await page.click('[data-cat="ground"]');
await page.waitForTimeout(250);
console.log('Terrain tab:', await page.evaluate(() => Array.from(document.querySelectorAll('#shop-grid .card')).map(c =>
  c.querySelector('.name').textContent + ' — ' + c.querySelector('.size').textContent)));
await page.screenshot({ path: SHOTS + 'v5-shop-ground.png' });

// Lay a small field and stand animals on it, for the picture.
await page.evaluate(() => {
  for (let x = 2; x <= 5; x++) for (let y = 7; y <= 8; y++) PropertyState.buyAt('field', x, y);
  for (let x = 6; x <= 9; x++) PropertyState.buyAt('path', x, 5);
  PropertyState.buyAt('wheat', 6, 14);
  PropertyState.buyAt('pumpkin', 8, 16);
  PropertyState.buyAt('chicken', 14, 10);
  PropertyState.buyAt('duck', 16, 10);
  PropertyState.buyAt('scarecrow', 4, 14);
});
await page.click('[data-close]');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'v5-property.png' });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
