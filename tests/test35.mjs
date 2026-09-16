import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT') && !m.text().includes('404')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);

/* Profiles came along: the app opens by asking who is holding the
   telephone, so somebody has to be there before the menu exists. */
await page.evaluate(() => startAs(PROFILES.create('Test', '6eme').id));
await page.waitForTimeout(400);

// What a day of practice is worth, next to a rank.
await page.goto(SITE + '/reward/index.html');
await page.waitForTimeout(600);
console.log('a stamp against a rank:', JSON.stringify(await page.evaluate(() =>
  [1, 10, 50, 100].map(l => 'niv ' + l + ': rang ' + REWARD.rewardForTier(l) + ' / tampon ' + REWARD.rewardForStamp(l)))));

// ---- a save from version 7 keeps everything and counts no stamp yet ----
await page.evaluate(() => {
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 7, coins: 800, tiers: [1, 2, 3], nextUid: 4, owned: ['home', 'meadow'],
    current: 'outside', placed: { outside: [{ uid: 1, id: 'chicken', x: 34, y: 26 }] }
  }));
});
await page.reload();
await page.waitForTimeout(800);
console.log('migrated to version 8:', JSON.stringify(await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('reward-property-v1'));
  return { version: raw.version, stamps: raw.stamps, coins: REWARD.coins(),
           level: REWARD.level(), placed: PropertyState.scene().placed.length };
})));

// ---- the days of practice are paid, once ----
console.log('four days of work:', JSON.stringify(await page.evaluate(() => {
  const before = REWARD.coins();
  const first = REWARD.syncStamps(4);
  const again = REWARD.syncStamps(4);
  return { before, paid: first.paid, amount: first.amount, twice: again.paid, coins: REWARD.coins() };
})));
console.log('one more day:', JSON.stringify(await page.evaluate(() => {
  const step = REWARD.syncStamps(5);
  return { paid: step.paid, amount: step.amount, toast: document.getElementById('toast').textContent };
})));

// ---- through the app: a stamp pays even without a new rank ----
await page.goto(SITE + '/index.html');
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.waitForTimeout(400);

/* Profiles came along: the app opens by asking who is holding the
   telephone, so somebody has to be there before the menu exists. */
await page.evaluate(() => startAs(PROFILES.create('Test', '6eme').id));
await page.waitForTimeout(400);
await page.evaluate(() => {
  // A fortnight of days, all stamped, and a rank already settled.
  progress.points = RANKS.THRESHOLDS[4] + 5;
  for (let i = 1; i <= 14; i++) {
    progress.days['2026-03-' + String(i).padStart(2, '0')] = { n: 12, goal: 12, stamp: i % 4, p: 40 };
  }
  Store.save(progress);
  renderMenu();
});
await page.waitForTimeout(200);
console.log('the menu:', JSON.stringify(await page.evaluate(() => ({
  card: document.querySelector('.card.rank .rank-up') && document.querySelector('.card.rank .rank-up').textContent,
  says: document.querySelectorAll('.card.rank .label')[0].textContent
}))));
await page.click('#open-property');
await page.waitForTimeout(1700);
const frame = page.frames().find(f => f.url().includes('reward/index.html'));
console.log('on opening:', JSON.stringify({
  level: await frame.evaluate(() => REWARD.level()),
  stamps: await frame.evaluate(() => REWARD.stamps()),
  coins: await frame.evaluate(() => REWARD.coins()),
  toast: await frame.evaluate(() => document.getElementById('toast').textContent)
}));
await frame.click('#back');
await page.waitForTimeout(400);
console.log('the app now knows:', JSON.stringify(await page.evaluate(() => progress.reward)));
console.log('and asks for nothing more:', JSON.stringify(await page.evaluate(() =>
  !document.querySelector('.card.rank .rank-up'))));

// One more stamped day, no new rank: the coins are owed again.
await page.evaluate(() => {
  progress.days['2026-03-20'] = { n: 12, goal: 12, stamp: 2, p: 40 };
  Store.save(progress);
  renderMenu();
});
await page.waitForTimeout(200);
console.log('after one more day:', JSON.stringify(await page.evaluate(() => ({
  owed: !!document.querySelector('.card.rank .rank-up'),
  says: document.querySelectorAll('.card.rank .label')[0].textContent
}))));
await page.click('#open-property');
await page.waitForTimeout(900);
console.log('paid:', JSON.stringify({
  stamps: await frame.evaluate(() => REWARD.stamps()),
  coins: await frame.evaluate(() => REWARD.coins()),
  toast: await frame.evaluate(() => document.getElementById('toast').textContent)
}));

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
