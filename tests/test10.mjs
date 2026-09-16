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

const where = () => page.evaluate(() => ({
  scene: PropertyState.sceneId(),
  name: document.getElementById('scene-name').textContent,
  placed: PropertyState.scene().placed.length,
  coins: REWARD.coins()
}));
const tile = (col, row) => page.evaluate(({ col, row }) => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + (col + 0.5) * size, y: box.top + (row + 0.5) * size };
}, { col, row });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(3000); });
await page.waitForTimeout(400);
console.log('start:', JSON.stringify(await where()));

// Tapping the house offers to go in.
const house = await page.evaluate(() => {
  const r = document.querySelector('.blk-house').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(house.x, house.y);
await page.waitForTimeout(250);
console.log('house selected:', await page.locator('#action-bar .bar-id b').textContent(),
            '| button:', await page.locator('#action-bar .enter-btn').textContent());
await page.screenshot({ path: SHOTS + 'v8-house-selected.png' });

await page.click('#action-bar .enter-btn');
await page.waitForTimeout(400);
console.log('inside:', JSON.stringify(await where()),
            '| exit button:', await page.locator('#exit').isVisible(),
            '| walls:', await page.locator('.blk-wall').count(),
            '| indoor floor:', await page.evaluate(() => document.getElementById('world').classList.contains('is-indoor')));

// The shop only sells what belongs indoors.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
const inShop = await page.evaluate(() => ({
  families: Array.from(document.querySelectorAll('#shop-tabs .chip')).map(c => c.textContent.trim()),
  items: Array.from(document.querySelectorAll('#shop-grid .card .fr')).map(n => n.textContent)
}));
console.log('indoor families:', JSON.stringify(inShop.families));
console.log('indoor furniture tab:', JSON.stringify(inShop.items.slice(0, 4)));
await page.screenshot({ path: SHOTS + 'v8-shop-indoor.png' });

// Furnish: a bed in the bedroom, a sofa in the living room.
await page.click('[data-cat="furniture"]');
await page.waitForTimeout(200);
await page.click('[data-pick="bed"]');
await page.waitForTimeout(300);
let spot = await tile(12, 4);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('after placing a bed:', JSON.stringify(await where()));

// A wall refuses.
let before = await where();
// The left-hand wall, well away from the button in the corner.
spot = await tile(0, 8);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('bed on a wall -> nothing paid:', before.coins === (await where()).coins,
            '| still in hand:', !!(await page.evaluate(() => World.held())));
await page.click('#cancel-placing');

// Out through the door block, then in again: the bed is still there.
const door = await page.evaluate(() => {
  const r = document.querySelector('.blk-door').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(door.x, door.y);
await page.waitForTimeout(250);
console.log('door selected:', await page.locator('#action-bar .bar-id b').textContent(),
            '| button:', await page.locator('#action-bar .enter-btn').textContent());
await page.click('#action-bar .enter-btn');
await page.waitForTimeout(400);
console.log('back outside:', JSON.stringify(await where()));

// The two scenes hold their own things.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
const outFamilies = await page.evaluate(() => Array.from(document.querySelectorAll('#shop-tabs .chip')).map(c => c.textContent.trim()));
console.log('outdoor families:', JSON.stringify(outFamilies));
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(250);
spot = await tile(4, 12);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
await page.click('#cancel-placing');
console.log('outside now:', JSON.stringify(await where()));

// Reload: both scenes come back.
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(600);
const saved = await page.evaluate(() => ({
  current: PropertyState.sceneId(),
  outside: (PropertyState.get().placed.outside||[]).map(p => p.id),
  house: (PropertyState.get().placed.house||[]).map(p => p.id)
}));
console.log('after reload:', JSON.stringify(saved));

// The HUD way out works too.
await page.evaluate(() => PropertyState.enter('house'));
await page.waitForTimeout(400);
await page.click('#exit');
await page.waitForTimeout(400);
console.log('HUD exit ->', (await where()).scene, '| exit hidden outside:', await page.locator('#exit').isHidden());
await page.screenshot({ path: SHOTS + 'v8-outside.png' });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
