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

const state = () => page.evaluate(() => ({
  coins: REWARD.coins(),
  placed: PropertyState.scene().placed.map(p => `${p.id}@${p.x},${p.y}`),
  hand: World.isPlacing()
}));
const tile = (col, row) => page.evaluate(({ col, row }) => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + (col + 0.5) * size, y: box.top + (row + 0.5) * size };
}, { col, row });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(300); });
await page.waitForTimeout(400);
console.log('start:', JSON.stringify(await state()));

// The shop takes the whole screen and its chips stay on top of the list.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
const shop = await page.evaluate(() => {
  const el = document.getElementById('panel-shop');
  const box = el.getBoundingClientRect();
  const chips = document.getElementById('shop-tabs').getBoundingClientRect();
  const grid = document.getElementById('shop-grid');
  return {
    full: Math.round(box.width) === window.innerWidth && Math.round(box.height) === window.innerHeight,
    chipsTop: Math.round(chips.top), scrollable: grid.scrollHeight > grid.clientHeight,
    buyButtons: document.querySelectorAll('.buy, [data-buy]').length,
    dragHandles: document.querySelectorAll('[data-shop], [data-drag]').length
  };
});
console.log('shop:', JSON.stringify(shop));

// Scrolling the list does not move the chips.
await page.evaluate(() => { document.getElementById('shop-grid').scrollTop = 200; });
await page.waitForTimeout(200);
const chipsAfter = await page.evaluate(() => Math.round(document.getElementById('shop-tabs').getBoundingClientRect().top));
console.log('chips stay put while scrolling:', shop.chipsTop === chipsAfter,
            '| scrolled by:', await page.evaluate(() => document.getElementById('shop-grid').scrollTop));
await page.screenshot({ path: SHOTS + 'v7-shop.png' });

// Touching an object takes it in hand and closes the shop.
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(300);
console.log('after picking a hen: shop closed:', await page.locator('#panel-shop').isHidden(),
            '| hand:', await page.locator('#hand-name').textContent(),
            'à', await page.locator('#hand-price').textContent(),
            '| shop button hidden:', await page.locator('#hud-bottom').isHidden());

// A tap on a tile places it and pays.
let spot = await tile(32, 26);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('after one tap:', JSON.stringify(await state()));

// It stays in hand: a second tap places another one.
spot = await tile(34, 26);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('after a second tap:', JSON.stringify(await state()));
await page.screenshot({ path: SHOTS + 'v7-hand.png' });

// A taken tile refuses without charging.
let before = await state();
spot = await tile(34, 26);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
let after = await state();
console.log('taken tile -> nothing paid:', before.coins === after.coins, '| same objects:', before.placed.length === after.placed.length);

// Dragging with something in hand pans the camera instead of placing.
before = await page.evaluate(() => document.getElementById('world').style.transform);
await page.mouse.move(700, 200);
await page.mouse.wheel(0, -500);
await page.waitForTimeout(200);
const camZoom = await page.evaluate(() => document.getElementById('world').style.transform);
const count = (await state()).placed.length;
await page.mouse.move(700, 200);
await page.mouse.down();
await page.mouse.move(560, 320, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
console.log('drag with a full hand -> camera moved:', camZoom !== await page.evaluate(() => document.getElementById('world').style.transform),
            '| nothing placed:', count === (await state()).placed.length);

// The ✕ puts it away.
await page.click('#cancel-placing');
await page.waitForTimeout(250);
console.log('after ✕ -> hand:', await page.evaluate(() => World.isPlacing()),
            '| shop button back:', await page.locator('#hud-bottom').isVisible());

// A placed object: selected by a tap, sold from its bar, no "Ranger".
await page.evaluate(() => World.fitCamera());
await page.waitForTimeout(200);
const obBox = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(obBox.x, obBox.y);
await page.waitForTimeout(250);
const bar = await page.evaluate(() => Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent));
before = await state();
await page.click('#action-bar .sell-btn');
await page.waitForTimeout(250);
after = await state();
console.log('action bar buttons:', JSON.stringify(bar), '| sold for:', after.coins - before.coins,
            '| left:', after.placed.length);

// Running out of coins drops the object from the hand.
await page.evaluate(() => { const d = PropertyState.get(); PropertyState.addCoins(-d.coins + 60); });
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(250);
spot = await tile(40, 28);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('spent the last coins -> hand:', await page.evaluate(() => World.isPlacing()),
            '| coins:', (await state()).coins, '| toast:', await page.locator('#toast').textContent());

// An object beyond the purse cannot be picked.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
await page.click('[data-pick="cow"]');
await page.waitForTimeout(250);
console.log('picking something too dear -> shop still open:', await page.locator('#panel-shop').isVisible(),
            '| hand:', await page.evaluate(() => World.isPlacing()));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
