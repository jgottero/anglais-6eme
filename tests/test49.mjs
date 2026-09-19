/* The climb, level by level.

   The shop used to open five levels at a time: four levels with nothing
   to show for them, then ten things at once. A child who has just
   climbed a level and found the shelves unchanged has been told that
   the level did not count.

   Every level from 1 to 100 now brings two or three things. The world
   still opens five levels at a time — each group of five shares a theme
   — but the theme is served cheapest first, so that inside it every
   level brings something dearer than the last, and the fifth brings
   three of them.

   The one thing that must never happen when the shelves are rearranged:
   an object moving *up* a level. That would take back something a child
   could already buy. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- not one of the hundred levels is empty ----
const climb = await page.evaluate(() => {
  const byLevel = {};
  CATALOG.ITEMS.forEach(item => {
    const level = item.level || 0;
    (byLevel[level] = byLevel[level] || []).push(item);
  });
  const counts = [];
  for (let level = 1; level <= CATALOG.LAST_LEVEL; level++) {
    counts.push((byLevel[level] || []).length);
  }
  return {
    start: (byLevel[0] || []).length,
    items: CATALOG.ITEMS.length,
    empty: counts.map((n, at) => n ? 0 : at + 1).filter(Boolean),
    thin: counts.map((n, at) => n < 2 ? at + 1 : 0).filter(Boolean),
    twos: counts.filter(n => n === 2).length,
    threes: counts.filter(n => n === 3).length,
    most: Math.max.apply(null, counts)
  };
});
console.log('the hundred levels:', JSON.stringify(climb));
if (climb.empty.length) errors.push('levels with nothing to show: ' + climb.empty.join(' '));
if (climb.thin.length) errors.push('levels bringing fewer than two: ' + climb.thin.join(' '));

/* And the shop never has to say "nothing until level N + 5": whatever
   level one stands on, the next thing is one level away. */
console.log('how far the next thing ever is:', JSON.stringify(await page.evaluate(() => {
  let worst = 0;
  for (let level = 0; level < CATALOG.LAST_LEVEL; level++) {
    const next = CATALOG.nextLevel(level);
    if (next !== null) worst = Math.max(worst, next - level);
  }
  return { atMost: worst + ' level' + (worst > 1 ? 's' : '') };
})));

// ---- a theme is served cheapest first ----
console.log('inside a theme, the price climbs:', JSON.stringify(await page.evaluate(() => {
  const dearest = level => {
    const here = CATALOG.newAt(level);
    return here.length ? Math.max.apply(null, here.map(one => one.price)) : 0;
  };
  const wrong = [];
  for (let level = 2; level <= CATALOG.LAST_LEVEL; level++) {
    // The first level of a theme opens a new world, and starts again
    // lower: those are the five-step boundaries, and only those.
    if (level % 5 === 1) continue;
    if (dearest(level) < dearest(level - 1)) {
      wrong.push('niv. ' + level + ': ' + dearest(level - 1) + ' -> ' + dearest(level));
    }
  }
  return wrong.length ? wrong : 'every level of a theme brings something dearer than the last';
})));

/* The fifth level of a theme is the one that brings three. */
console.log('the fifth of each theme:', JSON.stringify(await page.evaluate(() => {
  const fifths = [], others = [];
  for (let level = 1; level <= CATALOG.LAST_LEVEL; level++) {
    (level % 5 === 0 ? fifths : others).push(CATALOG.newAt(level).length);
  }
  return {
    fifths: Array.from(new Set(fifths)).sort().join(' '),
    others: Array.from(new Set(others)).sort().join(' ')
  };
})));

// ---- nothing was taken back ----
/* Where every object stood before the levels were spread out. A level
   that rose would put something already bought, or already within
   reach, back behind a lock. */
const WAS = {
  soil: 5, carrot: 5, scarecrow: 5, stump: 10, pine_tree: 10, apple_tree: 10,
  gravel: 15, wood_floor: 15, decking: 15, coop: 20, pig: 20, sofa: 25,
  fridge: 25, bench: 30, pergola: 30, tractor: 35, barn: 35, windmill: 35,
  road: 40, bus_stop: 40, slide: 45, climbing_frame: 45, palm_tree: 50,
  pirate_ship: 100, ferris_wheel: 100, carousel: 100, rocket: 100,
  marble_floor: 70, piano: 70, deer: 75, stage: 80, peacock: 85,
  igloo: 90, obelisk: 95, greenhouse: 95
};
console.log('nothing was taken back:', JSON.stringify(await page.evaluate(was => {
  const risen = Object.keys(was)
    .map(id => ({ id, was: was[id], now: CATALOG.item(id).level }))
    .filter(one => one.now > one.was);
  return risen.length
    ? risen.map(one => one.id + ' ' + one.was + ' -> ' + one.now)
    : Object.keys(was).length + ' objects checked, not one of them moved up';
}, WAS)));
if (await page.evaluate(was => Object.keys(was).some(id => CATALOG.item(id).level > was[id]), WAS)) {
  errors.push('an object moved up a level: something already within reach was taken back');
}

// ---- and the shop shows it ----
await page.evaluate(() => { REWARD.syncLevel(13); REWARD.addCoins(5000); });
await page.waitForTimeout(300);
await page.click('[data-panel="shop"]');
await page.waitForTimeout(500);
console.log('what the shop says at level 13:', JSON.stringify(await page.evaluate(() => ({
  line: document.getElementById('shop-level').textContent,
  newHere: CATALOG.newAt(13).map(one => one.fr),
  andNext: CATALOG.newAt(CATALOG.nextLevel(13)).map(one => one.fr)
}))));
await page.click('[data-cat="ground"]');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'v49-shop.png' });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
