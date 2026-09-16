import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(800);
await page.evaluate(() => REWARD.addCoins(2000));

// One fence on its own: a post, and no rail anywhere.
console.log('the fence itself:', JSON.stringify(await page.evaluate(() => {
  const item = CATALOG.item('fence');
  return { w: item.w, h: item.h, price: item.price, joins: item.joins, card: CATALOG.cardUrl('fence'), art: CATALOG.assetUrl('fence') };
})));

const rails = () => page.evaluate(() => Array.from(document.querySelectorAll('.join-cell img.join')).map(img => {
  const cell = img.closest('.join-cell');
  return { file: img.getAttribute('src').split('/').pop(),
           tile: Math.round(parseInt(cell.style.left) / 32) + ',' + Math.round(parseInt(cell.style.top) / 32),
           off: img.style.left + '/' + img.style.top };
}));

await page.evaluate(() => PropertyState.buyAt('fence', 34, 26, 0));
await page.waitForTimeout(200);
console.log('one post alone :', JSON.stringify(await rails()));

// A second one to its right: they become one fence.
await page.evaluate(() => PropertyState.buyAt('fence', 35, 26, 0));
await page.waitForTimeout(200);
console.log('two side by side:', JSON.stringify(await rails()));

// Extending the run left and right.
await page.evaluate(() => { PropertyState.buyAt('fence', 36, 26, 0); PropertyState.buyAt('fence', 33, 26, 0); });
await page.waitForTimeout(200);
console.log('a run of four  :', JSON.stringify(await rails()));

// Going down from the left end: the two posts get their trunk.
await page.evaluate(() => { PropertyState.buyAt('fence', 33, 27, 0); PropertyState.buyAt('fence', 33, 28, 0); });
await page.waitForTimeout(200);
console.log('and down       :', JSON.stringify(await rails()));

// A fence is one tile: another object may stand right next to it.
console.log('one tile each  :', JSON.stringify(await page.evaluate(() => ({
  placed: PropertyState.scene().placed.filter(p => p.id === 'fence').map(p => p.x + ',' + p.y),
  canPutAHenBeside: PropertyState.canPlace(CATALOG.item('chicken'), 37, 26, null, 0),
  cannotStackTwo: !PropertyState.canPlace(CATALOG.item('fence'), 34, 26, null, 0)
}))));

// Selling the middle one breaks the run in two.
await page.evaluate(() => {
  const mid = PropertyState.scene().placed.find(p => p.id === 'fence' && p.x === 35 && p.y === 26);
  PropertyState.sell(mid.uid);
});
await page.waitForTimeout(200);
console.log('middle sold    :', JSON.stringify(await rails()));

// Put it back, then look at the whole thing.
await page.evaluate(() => { PropertyState.buyAt('fence', 35, 26, 0); World.clearSelection(); });
await page.waitForTimeout(200);

// In hand, the ghost shows the rails on every side it would join.
await page.evaluate(() => World.startPlacing('fence'));
const aim = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 37.5 * size, y: box.top + 26.5 * size };
});
await page.mouse.move(aim.x, aim.y);
await page.waitForTimeout(250);
console.log('ghost in hand  :', JSON.stringify(await page.evaluate(() => ({
  pieces: Array.from(document.querySelectorAll('.ghost img')).map(i => i.getAttribute('src').split('/').pop() + '@' + i.style.left + ',' + i.style.top)
}))));
await page.click('#cancel-placing');
await page.waitForTimeout(200);

// Close up on the fence.
await page.evaluate(() => {
  const world = document.getElementById('world');
  world.style.transform = 'translate(' + (550 - 35 * 32 * 2.2) + 'px,' + (400 - 27 * 32 * 2.2) + 'px) scale(2.2)';
});
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + 'shot-fence.png' });

console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
