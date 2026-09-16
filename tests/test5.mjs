/* What test5 has always asked, brought up to date.

   Nothing is dragged out of the shop any more and there is no chest:
   touching a card hands the object over — which costs nothing — the
   shop closes, and the coins are taken on the tile where it lands. The
   questions are the same ones: does a good spot pay and place, does a
   refused spot pay nothing, does the shop keep handing objects out, and
   can an object one cannot afford be taken at all. The name said out
   loud as the object is handed over is the one new question. */
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

// Aim the middle of a free tile, in screen pixels, and tap it there.
async function tapFreeTile(id) {
  const spot = await page.evaluate(one => {
    const item = CATALOG.item(one);
    const land = PropertyState.scene().land;
    for (let y = 0; y < land.rows; y++)
      for (let x = 0; x < land.cols; x++)
        if (PropertyState.canPlace(item, x, y, null, 0)) {
          return World.screenOf(x, y, item.w, item.h);
        }
    return null;
  }, id);
  if (!spot) return false;
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(400);
  return true;
}

const state = () => page.evaluate(() => ({
  coins: REWARD.coins(),
  placed: PropertyState.scene().placed.map(entry => entry.id + '@' + entry.x + ',' + entry.y),
  inHand: World.held() ? World.held().id : null
}));

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(600); });
await page.waitForTimeout(300);

// Every name the browser is asked to say, kept as it goes by.
await page.evaluate(() => {
  window.__said = [];
  const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = said => { window.__said.push(said.text); try { speak(said); } catch (err) {} };
});

console.log('start:', JSON.stringify(await state()));

// ---- taking an object in hand costs nothing, and says its name ----
await page.click('[data-panel]');
await page.waitForTimeout(400);
await page.click('[data-pick="chicken"] .card-art');
await page.waitForTimeout(400);
console.log('taken in hand:', JSON.stringify(await page.evaluate(() => ({
  coins: REWARD.coins(),
  inHand: World.held() && World.held().id,
  shopClosed: document.getElementById('panel-shop').hidden,
  handShown: !document.getElementById('hand').hidden,
  said: window.__said
}))));

// ---- it is paid for on the tile it lands on ----
const world = await page.locator('#world').boundingBox();
const before = await state();
await page.mouse.click(world.x + world.width / 2, world.y + world.height / 2);
await page.waitForTimeout(400);
const after = await state();
console.log('put down: −' + (before.coins - after.coins), 'coins |', JSON.stringify(after));

// ---- and it stays in hand, so a row is a row of taps ----
await page.mouse.click(world.x + world.width / 2 + 90, world.y + world.height / 2);
await page.waitForTimeout(400);
console.log('a second, without reopening the shop:', JSON.stringify(await state()));

// ---- a spot that refuses takes nothing ----
const beforeBad = await state();
await page.mouse.click(world.x + 6, world.y + 6);          // the far corner, off the plot
await page.waitForTimeout(400);
const afterBad = await state();
console.log('refused spot:', JSON.stringify({
  coinsUnchanged: beforeBad.coins === afterBad.coins,
  nothingAdded: beforeBad.placed.length === afterBad.placed.length,
  stillInHand: afterBad.inHand
}));

// ---- a second object replaces the first in hand ----
await page.evaluate(() => World.cancelPlacing());
await page.click('[data-panel]');
await page.waitForTimeout(400);
await page.click('[data-cat="nature"]');
await page.waitForTimeout(250);
await page.click('[data-pick="flowers"] .card-art');
await page.waitForTimeout(400);
console.log('the shop keeps handing out:', JSON.stringify(await page.evaluate(() => ({
  inHand: World.held() && World.held().id, said: window.__said
}))));
await tapFreeTile('flowers');
console.log('after the flowers:', JSON.stringify(await state()));

// ---- an object one cannot afford is refused, and not said ----
await page.evaluate(() => {
  PropertyState.addCoins(-REWARD.coins() + 10);
  window.__said = [];
});
await page.waitForTimeout(250);
await page.click('[data-panel]');
await page.waitForTimeout(400);
await page.click('[data-cat="animals"]');
await page.waitForTimeout(250);
await page.click('[data-pick="cow"] .card-art');
await page.waitForTimeout(400);
console.log('too dear:', JSON.stringify(await page.evaluate(() => ({
  inHand: World.held() && World.held().id,
  greyed: document.querySelector('[data-pick="cow"]').classList.contains('is-locked'),
  toast: document.getElementById('toast').textContent,
  said: window.__said
}))));

// ---- the last coins: the hand empties on its own ----
await page.evaluate(() => { PropertyState.addCoins(-REWARD.coins() + 70); });
await page.waitForTimeout(250);
await page.click('[data-pick="chicken"] .card-art');
await page.waitForTimeout(400);
await tapFreeTile('chicken');
await page.waitForTimeout(300);
console.log('nothing left for the next one:', JSON.stringify(await page.evaluate(() => ({
  coins: REWARD.coins(),
  inHand: World.held() && World.held().id,
  toast: document.getElementById('toast').textContent
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
