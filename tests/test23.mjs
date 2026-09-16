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
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => REWARD.addCoins(200));   // enough for a hen, not for a horse
await page.waitForTimeout(400);
await page.click('[data-panel="shop"]');
await page.waitForTimeout(350);

console.log('price style:', JSON.stringify(await page.evaluate(() => {
  const read = card => {
    if (!card) return null;
    const s = getComputedStyle(card.querySelector('.price'));
    return { background: s.backgroundColor, border: s.borderTopWidth, colour: s.color, radius: s.borderTopLeftRadius };
  };
  const cards = Array.from(document.querySelectorAll('.card'));
  return {
    affordable: read(cards.find(c => !c.classList.contains('is-locked'))),
    tooDear: read(cards.find(c => c.classList.contains('is-locked')))
  };
})));

await page.screenshot({ path: SHOTS + 'v19-shop.png' });
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(300);
console.log('a card still takes the object in hand:', JSON.stringify(await page.evaluate(() => World.held())));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
