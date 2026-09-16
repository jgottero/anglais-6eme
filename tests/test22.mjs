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

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(500);

console.log('panel and its button gone:', JSON.stringify(await page.evaluate(() => ({
  gear: !!document.getElementById('dev-toggle'),
  panel: !!document.getElementById('dev-panel'),
  buttonsOnTop: Array.from(document.querySelectorAll('.hud-top-left button, .hud-top-right button'))
    .map(b => b.id || b.dataset.panel)
}))));

// What the panel used to do is still reachable where it belongs.
await page.click('#purse');
await page.click('#purse');
console.log('the purse still pays:', await page.evaluate(() => REWARD.coins()));
console.log('a rank still pays:', JSON.stringify(await page.evaluate(() => REWARD.grantTier(1))));

await page.evaluate(() => { REWARD.addCoins(2000); PropertyState.buyAt('cow', 10, 10, 0); PropertyState.buyPlot(); });
await page.waitForTimeout(300);
console.log('before the reset:', JSON.stringify(await page.evaluate(() => ({
  coins: REWARD.coins(), owned: PropertyState.get().owned.length, things: PropertyState.scene().placed.length
}))));
await page.evaluate(() => REWARD.reset());
await page.waitForTimeout(400);
console.log('after REWARD.reset():', JSON.stringify(await page.evaluate(() => ({
  coins: REWARD.coins(), owned: PropertyState.get().owned.length, things: PropertyState.scene().placed.length,
  scene: PropertyState.sceneId()
}))));

await page.screenshot({ path: SHOTS + 'v18-outside.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
