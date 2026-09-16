import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(800);

console.log('the catalogue:', JSON.stringify(await page.evaluate(() => {
  const byLevel = {};
  CATALOG.ITEMS.forEach(i => { byLevel[i.level] = (byLevel[i.level] || 0) + 1; });
  return { items: CATALOG.ITEMS.length, levels: Object.keys(byLevel).length,
           perLevel: byLevel, categories: CATALOG.CATEGORIES.length, last: CATALOG.LAST_LEVEL };
})));

console.log('at level 0:', JSON.stringify(await page.evaluate(() => ({
  level: PropertyState.level(),
  coins: REWARD.coins(),
  outside: CATALOG.ITEMS.filter(i => CATALOG.fitsScene(i, false) && CATALOG.unlocked(i, 0)).length,
  inside: CATALOG.ITEMS.filter(i => CATALOG.fitsScene(i, true) && CATALOG.unlocked(i, 0)).length
}))));

// The shop shows what is unlocked, plus a taste of the next batch.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(400);
const shopAt = async () => page.evaluate(() => ({
  line: document.getElementById('shop-level').textContent,
  chips: Array.from(document.querySelectorAll('#shop-tabs .chip')).map(c => c.textContent.trim()),
  cards: document.querySelectorAll('#shop-grid .card').length,
  coming: document.querySelectorAll('#shop-grid .card.is-coming').length,
  comingLabels: Array.from(document.querySelectorAll('#shop-grid .card.is-coming .coming')).map(c => c.textContent)
}));
console.log('shop, level 0 :', JSON.stringify(await shopAt()));

// Touching something locked explains itself instead of buying it.
await page.evaluate(() => { const c = document.querySelector('#shop-grid .card.is-coming'); if (c) c.click(); });
await page.waitForTimeout(250);
console.log('touching a locked card ->', JSON.stringify(await page.evaluate(() =>
  document.getElementById('toast').textContent)));
console.log('and nothing in hand   :', await page.evaluate(() => World.held()));

// Levels: the reward grows, and every fifth level opens a shelf.
console.log('rewards:', JSON.stringify(await page.evaluate(() =>
  [1, 5, 10, 25, 50, 75, 100].map(l => l + ':' + REWARD.rewardForTier(l)))));
console.log('total over 100 levels:', await page.evaluate(() => {
  let sum = 0; for (let l = 1; l <= 100; l++) sum += REWARD.rewardForTier(l); return sum;
}));

// Walk up the levels and watch the shop fill.
for (const target of [5, 20, 40, 55, 100]) {
  await page.evaluate(t => { for (let l = REWARD.level() + 1; l <= t; l++) REWARD.grantTier(l); }, target);
  await page.waitForTimeout(250);
  const s = await shopAt();
  console.log('level ' + String(target).padEnd(3),
              '| outside:', await page.evaluate(() => CATALOG.ITEMS.filter(i => CATALOG.fitsScene(i, false) && CATALOG.unlocked(i, REWARD.level())).length),
              '| chips:', s.chips.length, '|', s.line.replace(/\s+/g, ' '));
}

// A level says what it brings.
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.waitForTimeout(700);
await page.evaluate(() => { for (let l = 1; l <= 4; l++) REWARD.grantTier(l); });
await page.waitForTimeout(200);
await page.evaluate(() => REWARD.grantTier(5));
await page.waitForTimeout(250);
console.log('reaching level 5 ->', JSON.stringify(await page.evaluate(() => document.getElementById('toast').textContent)));

// Nothing locked can be bought, whatever the coins.
console.log('buying past the level:', JSON.stringify(await page.evaluate(() => {
  REWARD.addCoins(50000);
  const locked = CATALOG.ITEMS.find(i => i.level === 100 && !i.layer);
  return { item: locked.id, bought: !!PropertyState.buyAt(locked.id, 34, 26, 0) };
})));

console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
