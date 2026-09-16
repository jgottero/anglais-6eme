import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT') && !m.text().includes('404')) errors.push('CONSOLE ' + m.text()); });

// ---- 1. the purse shortcut belongs to the standalone page ----
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);
await page.click('#purse');
await page.waitForTimeout(300);
console.log('alone, the purse pays a level:', JSON.stringify(await page.evaluate(() => ({
  level: REWARD.level(), coins: REWARD.coins(),
  toast: document.getElementById('toast').textContent
}))));

// ---- 2. inside the app, it does not ----
await page.goto(SITE + '/index.html');
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.waitForTimeout(500);
await page.evaluate(() => { progress.points = RANKS.THRESHOLDS[9] + 5; Store.save(progress); renderMenu(); });
await page.click('#open-property');
await page.waitForTimeout(1600);
const frame = page.frames().find(f => f.url().includes('reward/index.html'));
const before = await frame.evaluate(() => ({ level: REWARD.level(), coins: REWARD.coins() }));
await frame.click('#purse');
await frame.click('#purse');
await page.waitForTimeout(400);
const after = await frame.evaluate(() => ({ level: REWARD.level(), coins: REWARD.coins() }));
console.log('in the app, two presses on the purse:', JSON.stringify({ before, after,
  toast: await frame.evaluate(() => document.getElementById('toast').textContent) }));
console.log('the level did not move:', before.level === after.level && before.coins === after.coins);

// ---- 3. a save from an older version is carried over, not wiped ----
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => {
  // A property as version 6 would have written it: coins, levels, land, objects.
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 6, coins: 500, tiers: [1, 2, 3, 4, 5], nextUid: 9,
    owned: ['home', 'meadow'], current: 'outside',
    placed: { outside: [
      { uid: 1, id: 'chicken', x: 34, y: 26 },
      { uid: 2, id: 'bench', x: 40, y: 28, r: 0 },
      { uid: 3, id: 'well', x: 44, y: 30 }
    ] }
  }));
});
await page.reload();
await page.waitForTimeout(900);
console.log('an older save:', JSON.stringify(await page.evaluate(() => ({
  version: JSON.parse(localStorage.getItem('reward-property-v1')).version,
  level: REWARD.level(),
  coins: REWARD.coins(),
  owned: PropertyState.get().owned,
  placed: PropertyState.scene().placed.length,
  toast: document.getElementById('toast').textContent
}))));

// ---- 4. an object that no longer fits is paid back, the rest stays ----
await page.evaluate(() => {
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 7, coins: 100, tiers: [50], nextUid: 9,
    owned: ['home'], current: 'outside',
    placed: { outside: [
      { uid: 1, id: 'chicken', x: 34, y: 26 },
      { uid: 2, id: 'chicken', x: 34, y: 26 },      // two hens on one square
      { uid: 3, id: 'cow', x: 2, y: 2 },            // land nobody owns
      { uid: 4, id: 'duck', x: 36, y: 62 },         // out at sea
      { uid: 5, id: 'gone_forever', x: 40, y: 30 }, // no longer in the catalogue
      { uid: 6, id: 'bench', x: 40, y: 28, r: 0 }
    ] }
  }));
});
await page.reload();
await page.waitForTimeout(900);
console.log('a property to mend:', JSON.stringify(await page.evaluate(() => ({
  kept: PropertyState.scene().placed.map(p => p.id + '@' + p.x + ',' + p.y),
  coins: REWARD.coins(),
  toast: document.getElementById('toast').textContent
}))));

// ---- 4b. reloading again does not pay a second time ----
const paidOnce = await page.evaluate(() => REWARD.coins());
await page.reload();
await page.waitForTimeout(800);
console.log('reloading again:', JSON.stringify({
  coins: await page.evaluate(() => REWARD.coins()),
  same: paidOnce === await page.evaluate(() => REWARD.coins()),
  toast: await page.evaluate(() => document.getElementById('toast').textContent)
}));

// ---- 5. what floats keeps its place at sea ----
await page.evaluate(() => {
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 7, coins: 0, tiers: [60], nextUid: 5, owned: ['home', 'beach'], current: 'outside',
    placed: { outside: [{ uid: 1, id: 'duck', x: 36, y: 62 }, { uid: 2, id: 'chicken', x: 36, y: 63 }] }
  }));
});
await page.reload();
await page.waitForTimeout(900);
console.log('at sea:', JSON.stringify(await page.evaluate(() => ({
  kept: PropertyState.scene().placed.map(p => p.id),
  coins: REWARD.coins()
}))));

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
