/* What test4 has always asked, brought up to date.

   There is no chest any more — an object is paid for where it lands, not
   bought and stored — so the pile of identical objects it used to count
   now lives on the shop card itself: the "x3" badge says how many of
   that object already stand in the scene one is in. Same questions:
   does a pile count right, does taking one out or selling one move the
   count, and does the badge go away with the last of them. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);

// Three hens, two clumps of flowers and a cow, put down outside.
await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(2000);
  const land = PropertyState.scene().land;
  const free = (item, from) => {
    for (let y = from; y < land.rows; y++)
      for (let x = 0; x < land.cols; x++)
        if (PropertyState.canPlace(item, x, y, null, 0)) return { x, y };
    return null;
  };
  ['chicken', 'chicken', 'chicken', 'flowers', 'flowers', 'cow'].forEach(id => {
    const item = CATALOG.item(id);
    const spot = free(item, 0);
    PropertyState.buyAt(id, spot.x, spot.y, 0, 0);
  });
});
await page.waitForTimeout(300);
console.log('put down outside:', JSON.stringify(await page.evaluate(() =>
  PropertyState.scene().placed.map(entry => entry.id))));

// ---- the shop counts each pile on its own card ----
await page.click('[data-panel]');
await page.waitForTimeout(400);
const badge = id => page.evaluate(one => {
  const card = document.querySelector('[data-pick="' + one + '"]');
  if (!card) return 'no card';
  const owned = card.querySelector('.owned');
  return owned ? owned.textContent : 'none';
}, id);
console.log('badges:', JSON.stringify({
  chicken: await badge('chicken'), cow: await badge('cow'), goose: await badge('goose')
}));
await page.click('[data-cat="nature"]');
await page.waitForTimeout(250);
console.log('flowers badge:', await badge('flowers'));

// ---- one more of a pile moves its count ----
await page.click('[data-cat="animals"]');
await page.waitForTimeout(250);
await page.click('[data-pick="chicken"] .card-art');
await page.waitForTimeout(300);
const world = await page.locator('#world').boundingBox();
await page.mouse.click(world.x + world.width / 2, world.y + world.height / 2);
await page.waitForTimeout(400);
await page.evaluate(() => World.cancelPlacing());
await page.click('[data-panel]');
await page.waitForTimeout(400);
console.log('a fourth hen:', await badge('chicken'));

// ---- selling one takes it off the count ----
await page.evaluate(() => {
  const hen = PropertyState.scene().placed.find(entry => entry.id === 'chicken');
  PropertyState.sell(hen.uid);
});
await page.waitForTimeout(300);
console.log('after selling one hen:', await badge('chicken'), '| coins:', await page.evaluate(() => REWARD.coins()));

// ---- the last of a pile takes the badge with it ----
await page.evaluate(() => {
  let hen;
  while ((hen = PropertyState.scene().placed.find(entry => entry.id === 'chicken'))) {
    PropertyState.sell(hen.uid);
  }
});
await page.waitForTimeout(300);
console.log('no hen left:', await badge('chicken'), '| the cow keeps hers:', await badge('cow'));

// ---- the count belongs to the scene one is standing in ----
await page.evaluate(() => { World.clearSelection(); PropertyState.enter('house'); });
await page.waitForTimeout(400);
console.log('indoors, the outdoor piles are not counted:', JSON.stringify(await page.evaluate(() => ({
  cards: Array.from(document.querySelectorAll('.card .owned')).map(one => one.textContent),
  scene: PropertyState.sceneId()
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
