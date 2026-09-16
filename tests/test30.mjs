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
await page.evaluate(() => { REWARD.grantTier(100); REWARD.addCoins(90000); SCENES.PLOTS.forEach(p => PropertyState.buyPlot(p.id)); });
await page.waitForTimeout(500);

// --- sizes ---
console.log('sizes:', JSON.stringify(await page.evaluate(() => {
  const count = {};
  CATALOG.ITEMS.forEach(i => { const k = i.w + 'x' + i.h; count[k] = (count[k] || 0) + 1; });
  return count;
})));
console.log('small props:', JSON.stringify(await page.evaluate(() =>
  ['bin', 'ball', 'flowers', 'mushroom', 'mailbox', 'skis', 'road'].map(id => {
    const i = CATALOG.item(id); return id + ' ' + i.w + 'x' + i.h;
  }))));
console.log('bigger things:', JSON.stringify(await page.evaluate(() =>
  ['horse', 'tractor', 'palm_tree', 'windmill', 'bush'].map(id => {
    const i = CATALOG.item(id); return id + ' ' + i.w + 'x' + i.h;
  }))));

// --- joining: the hedge, the stream, the road line ---
const pieces = () => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('.join-cell').forEach(cell => {
    const tile = Math.round(parseInt(cell.style.left) / 32) + ',' + Math.round(parseInt(cell.style.top) / 32);
    out[tile] = Array.from(cell.querySelectorAll('img')).map(img => {
      const f = img.getAttribute('src').split('/').pop().replace('.svg', '');
      const t = (img.style.transform.match(/rotate\((\d+)deg\)/) || [, '0'])[1];
      return f + (t === '0' ? '' : '/' + t);
    }).join(' ');
  });
  return out;
});

await page.evaluate(() => {
  [[34, 26], [35, 26], [36, 26], [36, 27]].forEach(([x, y]) => PropertyState.buyAt('hedge', x, y, 0));
});
await page.waitForTimeout(250);
console.log('an L of hedge   :', JSON.stringify(await pieces()));

await page.evaluate(() => { PropertyState.scene().placed.slice().forEach(p => PropertyState.sell(p.uid)); });
await page.waitForTimeout(200);
await page.evaluate(() => {
  [[34, 30], [35, 30], [36, 30], [37, 30], [37, 31]].forEach(([x, y]) => PropertyState.buyAt('road_line', x, y, 0));
});
await page.waitForTimeout(250);
console.log('a road that turns:', JSON.stringify(await pieces()));

await page.evaluate(() => { PropertyState.scene().placed.slice().forEach(p => PropertyState.sell(p.uid)); });
await page.waitForTimeout(200);
await page.evaluate(() => {
  [[40, 26], [40, 27], [40, 28], [41, 28], [42, 28]].forEach(([x, y]) => PropertyState.buyAt('stream', x, y, 0));
});
await page.waitForTimeout(250);
const brook = await pieces();
console.log('a brook         :', JSON.stringify(brook));
console.log('banks on the top tile:', JSON.stringify(brook['40,26']));

// --- building on water ---
console.log('on the sea:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  // A wet tile of the sea, in front of the beach.
  let spot = null;
  for (let y = 60; y < 68 && !spot; y++) for (let x = 30; x < 50; x++) {
    if (Ground.look(place, x, y) === 'water' && Ground.look(place, x + 6, y) === 'water' &&
        Ground.look(place, x, y + 1) === 'water') { spot = { x, y }; break; }
  }
  const at = (id) => !!PropertyState.canPlace(CATALOG.item(id), spot.x, spot.y, null, 0);
  return {
    spot,
    boat: at('rowing_boat'), jetty: at('jetty'), swan: at('swan'), duck: at('duck'),
    hen: at('chicken'), bench: at('bench'), path: at('path'), tractor: at('tractor')
  };
})));

console.log('and the boat really lands there:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  let spot = null;
  for (let y = 60; y < 68 && !spot; y++) for (let x = 30; x < 50; x++) {
    if (Ground.look(place, x, y) === 'water' && Ground.look(place, x + 6, y) === 'water' &&
        Ground.look(place, x, y + 1) === 'water') { spot = { x, y }; break; }
  }
  const got = PropertyState.buyAt('rowing_boat', spot.x, spot.y, 0);
  return { placed: !!got, where: got && (got.x + ',' + got.y) };
})));

// A bare tile of sea is still out of bounds for a press.
console.log('a press on the sea:', await page.evaluate(() => {
  const place = PropertyState.scene();
  for (let y = 62; y < 66; y++) for (let x = 34; x < 44; x++) {
    if (Ground.look(place, x, y) === 'water') return PropertyState.buildable(x, y, 1, 1);
  }
  return 'no water found';
}));

console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
