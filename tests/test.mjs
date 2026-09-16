import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;

/* The oldest suite, and still the broadest: a little of everything,
   so that a change which breaks the module outright is caught by the
   first thing that runs. Buying no longer goes through a chest, so the
   shelf-clearing at the top is done through today's flow — the rest
   (dragging, selling, ranks paid once, a reload, a telephone) has not
   changed and is asked exactly as it always was. */
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = [];
/* The web fonts are a nicety loaded from Google; a machine with no
   way out to the internet is not a broken module, so they are not
   counted. Everything else is. */
const noise = text => /fonts\.googleapis|fonts\.gstatic|CERT/.test(text);
page.on('console', m => { if (m.type() === 'error' && !noise(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!noise(r.url())) errors.push('REQFAIL ' + r.url()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);

// A shelf's worth of things, from several families, each paid for on
// the tile it lands on.
await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(4000);
  const land = PropertyState.scene().land;
  ['chicken', 'cow', 'apple_tree', 'pond', 'well', 'lamp', 'coop'].forEach(id => {
    const item = CATALOG.item(id);
    for (let y = 0; y < land.rows; y++)
      for (let x = 0; x < land.cols; x++)
        if (PropertyState.canPlace(item, x, y, null, 0)) {
          PropertyState.buyAt(id, x, y, 0, 0);
          return;
        }
  });
});
await page.waitForTimeout(400);
await page.click('[data-panel]');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'shot-shop.png' });
await page.click('#panel-shop .close-btn');
await page.waitForTimeout(300);
const state = await page.evaluate(() => ({
  placed: PropertyState.scene().placed.map(entry => entry.id + '@' + entry.x + ',' + entry.y),
  coins: REWARD.coins()
}));
console.log('placed:', state.placed.join(' '), '| coins:', state.coins);

/* Drag the first object a few tiles across. An object is only dragged
   once it is selected — a drag on anything else moves the camera — so
   the tap comes first, as it does for the child. */
const before = await page.evaluate(() => ({ ...PropertyState.scene().placed[0] }));
const first = await page.locator('.ob').first();
await first.click();
await page.waitForTimeout(200);
const b = await first.boundingBox();
// Somewhere it would actually fit: the home plot is small and the rest
// of the shelf is already standing on it.
const target = await page.evaluate(() => {
  const entry = PropertyState.scene().placed[0];
  const item = CATALOG.item(entry.id);
  const land = PropertyState.scene().land;
  for (let y = land.rows - 1; y >= 0; y--)
    for (let x = land.cols - 1; x >= 0; x--)
      if (PropertyState.canPlace(item, x, y, entry.uid, entry.r)) {
        return World.screenOf(x, y, item.w, item.h);
      }
  return null;
});
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down();
await page.mouse.move(target.x, target.y, { steps: 12 });
await page.screenshot({ path: SHOTS + 'shot-drag.png' });
await page.mouse.up();
await page.waitForTimeout(250);
const after = await page.evaluate(() => ({ ...PropertyState.scene().placed[0] }));
console.log('dragged:', before.x + ',' + before.y, '->', after.x + ',' + after.y,
            '| it moved:', before.x !== after.x || before.y !== after.y);

// Tap an object: the action bar should show up.
const second = await page.locator('.ob').nth(2);
await second.click();
await page.waitForTimeout(150);
console.log('action bar visible:', await page.locator('#action-bar').isVisible());
await page.screenshot({ path: SHOTS + 'shot-property.png' });

// Sell it back and check the refund.
const coinsBefore = await page.evaluate(() => REWARD.coins());
await page.click('#action-bar .sell-btn');
await page.waitForTimeout(150);
const coinsAfter = await page.evaluate(() => REWARD.coins());
console.log('sell refund:', coinsAfter - coinsBefore);

// A rank reward, paid only once.
console.log('tier 1:', JSON.stringify(await page.evaluate(() => REWARD.grantTier(1))));
console.log('tier 1 again:', JSON.stringify(await page.evaluate(() => REWARD.grantTier(1))));
console.log('tier 10:', JSON.stringify(await page.evaluate(() => REWARD.grantTier(10))));

// Reload: the property must come back as it was.
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(500);
const reloaded = await page.evaluate(() => PropertyState.scene().placed.length);
console.log('placed after reload:', reloaded);

// Phone width.
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'shot-phone.png', fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('horizontal overflow (px):', overflow);

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
