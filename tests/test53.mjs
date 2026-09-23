/* Half price, and the difference handed back.

   The town filled too slowly: a child who worked all term could still
   look at a bare field, because everything in the shop cost about twice
   what a term was worth. Every price is halved — to a round five, never
   below five — and the whole catalogue now costs a little over half of
   what the hundred levels pay.

   Nothing is taken from a property already built. What was bought at
   the old price was paid for twice over by today's, so the difference
   comes back to the purse, once, the first time the module is opened
   after the change; the module says so on the way in. Saving up first
   must not cost more than waiting. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);

// ---- every price is a round five, and nothing is free ----
const prices = await page.evaluate(() => {
  const all = CATALOG.ITEMS;
  return {
    many: all.length,
    cheapest: Math.min.apply(null, all.map(one => one.price)),
    dearest: Math.max.apply(null, all.map(one => one.price)),
    whole: all.reduce((sum, one) => sum + one.price, 0),
    ragged: all.filter(one => one.price % 5 || one.price < 5).map(one => one.id + ':' + one.price)
  };
});
console.log('what the shop asks:', JSON.stringify(prices));
if (prices.ragged.length) errors.push('prices that are not a round five: ' + prices.ragged.join(' '));
if (prices.cheapest < 5) errors.push('something costs less than five coins');

/* What a hundred levels pay, against what there is to buy. The two
   must stay close: much dearer and the town is a shop window, much
   cheaper and there is nothing left to choose between. A shortfall of a
   few per cent is the right amount — the stamps of a year's practice,
   which the levels do not count, are what close it. */
const purse = await page.evaluate(() => {
  let coins = 0;
  for (let level = 1; level <= 100; level++) coins += REWARD.rewardForTier(level);
  const land = SCENES.PLOTS.reduce((sum, one) => sum + one.price, 0);
  const shop = CATALOG.ITEMS.reduce((sum, one) => sum + one.price, 0);
  return { coins, land, shop, over: coins - land - shop };
});
const all = purse.land + purse.shop;
console.log('a hundred levels, and what they buy:', JSON.stringify(purse),
  '| the whole town is', Math.round(all / purse.coins * 100) + '% of what they pay');
if (all > purse.coins * 1.15) {
  errors.push('the town costs ' + Math.round(all / purse.coins * 100) + '% of a year of levels');
}
if (all < purse.coins * 0.8) errors.push('everything can be bought with coins to spare');

// ---- a property built at the old prices ----
const before = await page.evaluate(() => {
  const key = 'reward-property-v1';
  REWARD.grantTier(100);
  REWARD.addCoins(5000);
  const bought = [];
  ['bench', 'chicken', 'table', 'path'].forEach((id, i) => {
    const one = PropertyState.buyAt(id, 30 + i * 3, 26, 0);
    if (one) bought.push(id);
  });
  const saved = JSON.parse(localStorage.getItem(key));
  // Put it back the way a save from before the change looked.
  saved.version = 10;
  const coins = saved.coins;
  localStorage.setItem(key, JSON.stringify(saved));
  return {
    bought,
    coins,
    worth: bought.reduce((sum, id) => sum + CATALOG.item(id).price, 0)
  };
});
await page.reload();
await page.waitForTimeout(700);
const after = await page.evaluate(() => ({
  coins: PropertyState.get().coins,
  handedBack: PropertyState.paidBackCoins(),
  standing: PropertyState.scene().placed.length,
  version: JSON.parse(localStorage.getItem('reward-property-v1')).version,
  toast: (document.getElementById('toast') || {}).textContent || ''
}));
console.log('a property from before the fall:', JSON.stringify(before), '->', JSON.stringify(after));
if (after.handedBack !== before.worth) {
  errors.push('handed back ' + after.handedBack + ' where the difference is ' + before.worth);
}
if (after.coins !== before.coins + before.worth) errors.push('the difference never reached the purse');
if (after.standing !== before.bought.length) errors.push('something was swept away with the prices');
if (after.version !== 11) errors.push('the save was not written back in the new shape');
if (!/moins cher/.test(after.toast)) errors.push('nothing was said about it: "' + after.toast + '"');
await page.screenshot({ path: SHOTS + 'v53-cheaper.png' });

// ---- and never twice ----
await page.reload();
await page.waitForTimeout(700);
const again = await page.evaluate(() => ({
  coins: PropertyState.get().coins,
  handedBack: PropertyState.paidBackCoins()
}));
console.log('opened again:', JSON.stringify(again));
if (again.handedBack) errors.push('the difference was handed back a second time');
if (again.coins !== after.coins) errors.push('the purse grew on its own');

// ---- and a child starting today is not given it ----
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);
console.log('a fresh start:', JSON.stringify(await page.evaluate(() => ({
  coins: PropertyState.get().coins,
  handedBack: PropertyState.paidBackCoins(),
  // What that buys at the new prices, cheapest first.
  buys: CATALOG.ITEMS.filter(one => !one.level).sort((a, b) => a.price - b.price)
    .slice(0, 4).map(one => one.fr + ' ' + one.price)
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
