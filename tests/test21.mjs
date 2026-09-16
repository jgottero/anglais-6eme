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
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

const layout = () => page.evaluate(() => {
  const box = sel => {
    const el = document.querySelector(sel);
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    purse: box('#purse'), shop: box('[data-panel="shop"]'),
    back: box('#back'), exit: box('#exit'), 
    hand: box('#hand'), bar: box('#action-bar'), screen: { w: innerWidth, h: innerHeight }
  };
});

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(600);
const top = await layout();
console.log('outside:', JSON.stringify(top));
console.log('purse then shop, both on the left:', top.purse.x < top.shop.x && top.shop.x < 300,
            '| the way out is on the right:', top.back.x + top.back.w > 900,
            '| all of them along the top:', [top.purse, top.shop, top.back].every(b => b.y < 70));
await page.screenshot({ path: SHOTS + 'v17-outside.png' });

// With something in hand, the shop stays within reach and swaps it.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(300);
const holding = await layout();
console.log('holding a hen -> shop still there:', !!holding.shop,
            '| the card is at the bottom:', holding.hand.y > 600,
            '| clear of the shop button:', holding.hand.y > holding.shop.y + holding.shop.h);
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
console.log('shop reopens while holding:', await page.locator('#panel-shop').isVisible());
await page.click('[data-cat="nature"]');
await page.waitForTimeout(200);
await page.click('[data-pick="apple_tree"]');
await page.waitForTimeout(300);
console.log('and swaps what is in hand:', JSON.stringify(await page.evaluate(() => World.held())));
await page.screenshot({ path: SHOTS + 'v17-hand.png' });
await page.click('#cancel-placing');

// The bar of a selected object now sits low, alone at the bottom.
await page.evaluate(() => {
  const bought = PropertyState.buyAt('cow', 32, 28, 0);
  World.select({ kind: 'object', uid: bought.uid });
});
await page.waitForTimeout(300);
const chosen = await layout();
console.log('bar of the object:', JSON.stringify(chosen.bar), '| its bottom edge is', chosen.screen.h - (chosen.bar.y + chosen.bar.h), 'px off the screen edge');
await page.screenshot({ path: SHOTS + 'v17-bar.png' });

// Inside, the corner on the right becomes the door.
await page.evaluate(() => { World.clearSelection(); PropertyState.enter('house'); });
await page.waitForTimeout(500);
const inside = await layout();
console.log('inside :', JSON.stringify({ back: inside.back, exit: inside.exit, shop: inside.shop, purse: inside.purse }));
await page.screenshot({ path: SHOTS + 'v17-inside.png' });

// On a phone, nothing overlaps.
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(400);
await page.evaluate(() => World.startPlacing('chair'));
await page.waitForTimeout(300);
const phone = await layout();
const overlap = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
console.log('phone:', JSON.stringify(phone));
console.log('purse/shop overlap:', overlap(phone.purse, phone.shop),
            '| shop/back overlap:', overlap(phone.shop, phone.back),
            '| hand/shop overlap:', overlap(phone.hand, phone.shop));
await page.screenshot({ path: SHOTS + 'v17-phone.png' });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
