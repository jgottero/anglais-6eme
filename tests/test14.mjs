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

// Where a press inside one case lands, in case units from its corner.
async function drop(id, col, row, dx, dy) {
  await page.evaluate(i => World.startPlacing(i), id);
  await page.waitForTimeout(120);
  const point = await page.evaluate(({ col, row, dx, dy }) => {
    const world = document.getElementById('world');
    const box = world.getBoundingClientRect();
    const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
    return { x: box.left + (col + dx) * size, y: box.top + (row + dy) * size };
  }, { col, row, dx, dy });
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(200);
  const last = await page.evaluate(() => {
    const list = PropertyState.scene().placed;
    const entry = list[list.length - 1];
    if (!entry) return { refused: true };
    const item = CATALOG.item(entry.id);
    const size = CATALOG.footprint(item, entry.r);
    return { x: entry.x, y: entry.y, w: size.w, h: size.h, uid: entry.uid };
  });
  if (last.uid !== undefined) await page.evaluate(uid => PropertyState.sell(uid), last.uid);
  await page.evaluate(() => World.cancelPlacing());
  await page.waitForTimeout(120);
  return last;
}

const say = (what, box, col, row) => {
  if (box.refused) { console.log(what, '-> refused (off the buildable ground)'); return; }
  const corner = (box.x === col ? 'left' : box.x + box.w - 1 === col ? 'right' : '?') + '-' +
                 (box.y === row ? 'top' : box.y + box.h - 1 === row ? 'bottom' : '?');
  console.log(what, '-> placed at', box.x + ',' + box.y, box.w + 'x' + box.h,
              '| the touched case is its', corner, 'corner');
};

console.log('--- a 2x2 object (a hen), touching case 38,28 ---');
say('top-left of the case   ', await drop('chicken', 38, 28, 0.15, 0.15), 38, 28);
say('bottom-left of the case', await drop('chicken', 38, 28, 0.15, 0.85), 38, 28);
say('top-right of the case  ', await drop('chicken', 38, 28, 0.85, 0.15), 38, 28);
say('bottom-right of the case', await drop('chicken', 38, 28, 0.85, 0.85), 38, 28);
console.log('middle of the case      ->', JSON.stringify(await drop('chicken', 38, 28, 0.5, 0.5)));

console.log('--- a 4x2 object (a bench) ---');
console.log('touched middle  ->', JSON.stringify(await drop('bench', 38, 28, 0.5, 0.5)));
console.log('touched top-left->', JSON.stringify(await drop('bench', 38, 28, 0.1, 0.1)));

console.log('--- a 4x4 object (an apple tree) ---');
console.log('touched middle  ->', JSON.stringify(await drop('apple_tree', 38, 28, 0.5, 0.5)));
console.log('touched bottom-right ->', JSON.stringify(await drop('apple_tree', 38, 28, 0.9, 0.9)));

console.log('--- a 1x1 object (a fence post) ---');
console.log('touched middle  ->', JSON.stringify(await drop('fence', 38, 28, 0.5, 0.5)));
console.log('touched top     ->', JSON.stringify(await drop('fence', 38, 28, 0.5, 0.1)));

// Past the edge, nothing is pulled back in: it is simply refused.
console.log('--- at the very corner of the land ---');
console.log('touched the top-left corner of the corner case 28,16 ->', JSON.stringify(await drop('chicken', 28, 16, 0.1, 0.1)));
console.log('touched the middle of case 29,17          ->', JSON.stringify(await drop('chicken', 29, 17, 0.5, 0.5)));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
