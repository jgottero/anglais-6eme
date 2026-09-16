/* What test6 has always asked, brought up to date: the same thing done
   with a finger rather than a mouse.

   It used to drag an object out of the shop, which is not how one buys
   any more — the shop hands the object over on a tap and it is paid for
   where it lands. So the drag is gone, but the question is not: does
   all of it work on a telephone, with touch events and no pointer to
   hover with. The pots of paint are new to the list, being the smallest
   thing on the screen a finger has to hit. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(600); });
await page.waitForTimeout(300);

// A finger, not a mouse: every tap below is a touch.
const tap = async (x, y) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(350); };
const tapOn = async selector => {
  const box = await page.locator(selector).boundingBox();
  await tap(box.x + box.width / 2, box.y + box.height / 2);
};
// The middle of a tile the object would fit on, in screen pixels: a
// small screen leaves little of the property showing, and guessing a
// spot would only test where the camera happens to sit.
const spotFor = id => page.evaluate(one => {
  const item = CATALOG.item(one);
  const land = PropertyState.scene().land;
  for (let y = 0; y < land.rows; y++)
    for (let x = 0; x < land.cols; x++)
      if (PropertyState.canPlace(item, x, y, null, 0)) return World.screenOf(x, y, item.w, item.h);
  return null;
}, id);

await tapOn('[data-panel]');
console.log('the shop opened by touch:', await page.evaluate(() =>
  !document.getElementById('panel-shop').hidden));

await tapOn('[data-cat="garden"]');

// ---- a pot of paint is big enough for a finger ----
console.log('the pots, measured:', JSON.stringify(await page.evaluate(() => {
  const pots = Array.from(document.querySelectorAll('[data-pick="mailbox"] .swatch'));
  const box = pots[0].getBoundingClientRect();
  return { how_many: pots.length, across: Math.round(box.width), tall: Math.round(box.height) };
})));

await tapOn('[data-pick="mailbox"] .swatch[data-colour="red"]');
console.log('painted with a finger:', await page.evaluate(() =>
  document.querySelector('[data-pick="mailbox"] .card-art img').getAttribute('src')));

// ---- taken in hand by touch, and paid for where the finger lands ----
await tapOn('[data-pick="mailbox"] .card-art');
console.log('in hand:', JSON.stringify(await page.evaluate(() => ({
  held: World.held() && World.held().id,
  colour: World.held() && World.held().c,
  shopClosed: document.getElementById('panel-shop').hidden
}))));

const before = await page.evaluate(() => REWARD.coins());
const spot = await spotFor('mailbox');
await tap(spot.x, spot.y);
console.log('put down by touch:', JSON.stringify(await page.evaluate(paid => ({
  spent: paid - REWARD.coins(),
  placed: PropertyState.scene().placed.map(entry => entry.id + '/' + (entry.c || 'plain'))
}), before)));
await page.screenshot({ path: SHOTS + 'v4-phone-shop.png' });

// ---- and repainted from the bar, still with a finger ----
await page.evaluate(() => World.cancelPlacing());
await tap(spot.x, spot.y);
console.log('the bar of what was touched:', JSON.stringify(await page.evaluate(() => ({
  shown: !document.getElementById('action-bar').hidden,
  pots: document.querySelectorAll('#action-bar .swatch').length
}))));
await tapOn('#action-bar .swatch[data-colour="green"]');
console.log('repainted by touch:', await page.evaluate(() =>
  PropertyState.scene().placed[0].c));

// ---- nothing sticks out sideways on a telephone ----
console.log('horizontal overflow (px):', await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
