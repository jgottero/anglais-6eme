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
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(40000); World.fitCamera(); });
await page.waitForTimeout(500);

// Every kind of object: pick it, look at its bar, flip it.
const sample = ['bench', 'chair', 'table', 'bed', 'lamp', 'scarecrow', 'well', 'cow', 'path', 'pine_tree'];
for (const id of sample) {
  const indoor = ['chair', 'table', 'bed'].includes(id);
  await page.evaluate(({ id, indoor }) => {
    PropertyState.enter(indoor ? 'house' : 'outside');
    const bought = PropertyState.buyAt(id, indoor ? 4 : 32, indoor ? 4 : 26, 0);
    World.select({ kind: 'object', uid: bought.uid });
  }, { id, indoor });
  await page.waitForTimeout(150);
  const bar = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()));
  await page.click('#action-bar [data-action="mirror"]');
  await page.waitForTimeout(120);
  const flipped = await page.evaluate(() => {
    const entry = PropertyState.scene().placed.find(e => e.uid === World.selected().uid);
    const img = document.querySelector('.ob.is-selected img');
    return { m: entry.m || 0, transform: img ? img.style.transform : '' };
  });
  console.log(id.padEnd(12), '| bar:', JSON.stringify(bar), '| flipped:', flipped.m, '|', flipped.transform);
  await page.evaluate(() => { const s = World.selected(); PropertyState.sell(s.uid); World.clearSelection(); });
}

// In hand as well, whatever the object.
await page.evaluate(() => { PropertyState.enter('outside'); World.startPlacing('bench'); });
await page.waitForTimeout(200);
console.log('bench in hand -> mirror button:', await page.locator('#mirror-held').isVisible());
await page.click('#mirror-held');
await page.waitForTimeout(150);
console.log('held:', JSON.stringify(await page.evaluate(() => World.held())));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
