import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(800);
await page.evaluate(() => REWARD.addCoins(4000));

console.log('the pool itself:', JSON.stringify(await page.evaluate(() => {
  const item = CATALOG.item('pool');
  return { w: item.w, h: item.h, price: item.price, layer: CATALOG.layerOf(item), joins: item.joins,
           soldOutside: CATALOG.fitsScene(item, false), soldInside: CATALOG.fitsScene(item, true) };
})));

// What each tile of the pool draws, read back as edge/corner/inner + turn.
const around = () => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('.join-cell').forEach(cell => {
    const tile = Math.round(parseInt(cell.style.left) / 32) + ',' + Math.round(parseInt(cell.style.top) / 32);
    out[tile] = Array.from(cell.querySelectorAll('img')).map(img => {
      const file = img.getAttribute('src').split('/').pop().replace('pool-', '').replace('.svg', '');
      const turn = (img.style.transform.match(/rotate\((\d+)deg\)/) || [, '0'])[1];
      return file + (turn === '0' ? '' : '/' + turn);
    }).join(' ');
  });
  return out;
});

await page.evaluate(() => PropertyState.buyAt('pool', 36, 26, 0));
await page.waitForTimeout(200);
console.log('one tile alone :', JSON.stringify(await around()));

// A 3 x 2 pool: the middle is open water, the rim is slabbed.
await page.evaluate(() => {
  [[37, 26], [38, 26], [36, 27], [37, 27], [38, 27]].forEach(([x, y]) => PropertyState.buyAt('pool', x, y, 0));
});
await page.waitForTimeout(250);
const rect = await around();
console.log('a 3 x 2 pool   :', JSON.stringify(rect, null, 0));

// An L: the inside of the angle must carry the surround round.
await page.evaluate(() => {
  [[36, 28], [37, 28]].forEach(([x, y]) => PropertyState.buyAt('pool', x, y, 0));
});
await page.waitForTimeout(250);
const ell = await around();
console.log('an L-shaped one:', JSON.stringify(ell));
console.log('inside the angle at 38,27 ->', JSON.stringify(ell['38,27']));

// Nothing is drawn for a tile the pool surrounds on all four sides.
console.log('open water     :', JSON.stringify(await page.evaluate(() => {
  [[39, 26], [39, 27], [37, 25], [38, 25], [36, 25], [39, 25]].forEach(([x, y]) => PropertyState.buyAt('pool', x, y, 0));
  return null;
})));
await page.waitForTimeout(250);
const big = await around();
console.log('middle tiles   :', JSON.stringify({ '37,26': big['37,26'] || '(nothing)', '38,26': big['38,26'] || '(nothing)' }));

// One can stand something on the water, as on any ground.
console.log('on the water   :', JSON.stringify(await page.evaluate(() => ({
  aDuckFits: PropertyState.canPlace(CATALOG.item('duck'), 37, 26, null, 0),
  noTwoPoolsOnOneTile: !PropertyState.canPlace(CATALOG.item('pool'), 37, 26, null, 0)
}))));

// In hand, the ghost already shows its slabs.
await page.evaluate(() => World.startPlacing('pool'));
const aim = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 40.5 * size, y: box.top + 26.5 * size };
});
await page.mouse.move(aim.x, aim.y);
await page.waitForTimeout(250);
console.log('ghost in hand  :', JSON.stringify(await page.evaluate(() =>
  Array.from(document.querySelectorAll('.ghost img')).map(i =>
    i.getAttribute('src').split('/').pop() + (i.style.transform ? '/' + i.style.transform : '')))));
await page.click('#cancel-placing');
await page.waitForTimeout(200);

await page.evaluate(() => {
  const world = document.getElementById('world');
  world.style.transform = 'translate(' + (500 - 38 * 32 * 2) + 'px,' + (380 - 27 * 32 * 2) + 'px) scale(2)';
});
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + 'shot-pool.png' });
console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
