import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

const placed = () => page.evaluate(() => PropertyState.scene().placed.map(p =>
  `${p.id}@${p.x},${p.y}${p.r ? ' r' + p.r : ''}${p.m ? ' mirrored' : ''}`));
const tile = (col, row) => page.evaluate(({ col, row }) => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + (col + 0.5) * size, y: box.top + (row + 0.5) * size };
}, { col, row });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(500);

// In hand: the cow can be flipped before it is put down.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
await page.click('[data-pick="cow"]');
await page.waitForTimeout(250);
console.log('buttons in hand:', JSON.stringify(await page.evaluate(() => ({
  turn: !document.getElementById('turn-held').hidden,
  mirror: !document.getElementById('mirror-held').hidden
}))));
await page.click('#mirror-held');
await page.waitForTimeout(200);
console.log('held after the flip:', JSON.stringify(await page.evaluate(() => World.held())),
            '| the card shows:', await page.evaluate(() => document.getElementById('hand-art').style.transform));

let spot = await tile(38, 26);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(250);
await page.click('#cancel-placing');
console.log('placed:', JSON.stringify(await placed()));
console.log('drawing on the ground:', await page.evaluate(() => {
  const img = document.querySelector('.ob img');
  return { klass: img.className, transform: img.style.transform };
}));

// On the ground: both buttons, and the flip undoes itself.
const ob = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(ob.x, ob.y);
await page.waitForTimeout(250);
console.log('bar of a cow:', JSON.stringify(await page.evaluate(() =>
  Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()))));
await page.click('#action-bar [data-action="mirror"]');
await page.waitForTimeout(200);
console.log('flipped back:', JSON.stringify(await placed()));
await page.click('#action-bar [data-action="mirror"]');
await page.waitForTimeout(200);
console.log('and again:', JSON.stringify(await placed()));

// Turning and flipping together, on a door.
await page.evaluate(() => { PropertyState.enter('house'); REWARD.addCoins(1000); });
await page.waitForTimeout(400);
await page.click('[data-panel="shop"]');
await page.waitForTimeout(250);
await page.click('[data-pick="inner_door"]');
await page.waitForTimeout(250);
await page.click('#turn-held');
await page.click('#mirror-held');
await page.waitForTimeout(200);
// The doorway through the partition of the house, which a turned door
// fills exactly: two tiles tall, one wide.
spot = await tile(9, 3);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(250);
await page.click('#cancel-placing');
console.log('door, turned and flipped:', JSON.stringify(await placed()),
            '|', await page.evaluate(() => document.querySelector('.ob img').style.transform));

// Even something symmetrical can be flipped now.
await page.evaluate(() => PropertyState.buyAt('table', 2, 2, 0));
await page.waitForTimeout(250);
const table = await page.evaluate(() => {
  const node = Array.from(document.querySelectorAll('.ob')).find(n => n.querySelector('img').alt === 'Table');
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(table.x, table.y);
await page.waitForTimeout(250);
console.log('bar of a table:', JSON.stringify(await page.evaluate(() =>
  Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()))));
await page.click('#action-bar [data-action="mirror"]');
await page.waitForTimeout(200);
console.log('table flipped:', JSON.stringify((await placed()).filter(p => p.startsWith('table'))));

// It survives a reload.
const before = await placed();
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(600);
console.log('kept after reload:', JSON.stringify(before) === JSON.stringify(await placed()));
await page.evaluate(() => World.fitCamera());
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + 'v13-house.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
