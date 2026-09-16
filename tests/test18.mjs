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
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

const placed = () => page.evaluate(() => PropertyState.scene().placed.map(p => `${p.id}@${p.x},${p.y}`));
const coins = () => page.evaluate(() => REWARD.coins());
const cam = () => page.evaluate(() => {
  const world = document.getElementById('world');
  const t = world.style.transform.match(/translate\((-?[\d.]+)px, *(-?[\d.]+)px\) scale\(([\d.]+)\)/);
  const land = PropertyState.scene().land;
  return { x: +t[1], y: +t[2], scale: +t[3], w: land.cols * 32 * +t[3], h: land.rows * 32 * +t[3] };
});

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(500);

// ---- 1. a press off the buildable ground places nothing ----------------
async function pressAt(clientX, clientY) {
  const before = { coins: await coins(), things: (await placed()).length };
  await page.mouse.click(clientX, clientY);
  await page.waitForTimeout(250);
  return {
    paid: before.coins - (await coins()),
    added: (await placed()).length - before.things,
    toast: await page.evaluate(() => document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent)
  };
}

// Zoom right out so the wild ground around the property is on screen.
await page.mouse.move(500, 400);
await page.mouse.wheel(0, 1500);
await page.waitForTimeout(250);
await page.evaluate(() => World.fitCamera());
await page.waitForTimeout(250);
await page.evaluate(() => World.startPlacing('chicken'));
await page.waitForTimeout(200);
const box = await page.evaluate(() => {
  const r = document.querySelector('canvas.ground').getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
});
// Points on screen: the wild beyond the map, a plot not bought, my own ground.
const spots = await page.evaluate(() => {
  const world = document.getElementById('world');
  const r = world.getBoundingClientRect();
  const scale = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  const home = PropertyState.scene().plots.find(p => p.owned);
  const meadow = Array.from(document.querySelectorAll('.plot.is-forsale')).find(n => n.dataset.sale === 'meadow');
  const m = meadow.getBoundingClientRect();
  const keep = p => ({ x: Math.min(innerWidth - 20, Math.max(20, p.x)), y: Math.min(innerHeight - 140, Math.max(80, p.y)) });
  return {
    beyondLeft: { x: r.left - 30, y: innerHeight / 2 },
    beyondTop: { x: innerWidth / 2, y: r.top - 30 },
    onSale: keep({ x: m.left + m.width / 2, y: m.top + m.height / 2 }),
    mine: { x: r.left + (home.x + 6) * scale, y: r.top + (home.y + 8) * scale }
  };
});
console.log('beyond the map, to the left       :', JSON.stringify(await pressAt(spots.beyondLeft.x, spots.beyondLeft.y)));
console.log('beyond the map, above             :', JSON.stringify(await pressAt(spots.beyondTop.x, spots.beyondTop.y)));
console.log('on a plot not bought yet          :', JSON.stringify(await pressAt(spots.onSale.x, spots.onSale.y)));
console.log('on the house                      :', JSON.stringify(await pressAt(...(await page.evaluate(() => {
  const r = document.querySelector('.blk-house').getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
})))));
console.log('on my own ground                  :', JSON.stringify(await pressAt(spots.mine.x, spots.mine.y)));
console.log('still in hand:', JSON.stringify(await page.evaluate(() => World.held())));
await page.click('#cancel-placing');

// Dragging an object off the ground leaves it where it was.
await page.evaluate(() => { const e = PropertyState.scene().placed[0]; World.select({ kind: 'object', uid: e.uid }); });
await page.waitForTimeout(200);
const before = (await placed())[0];
await page.mouse.move(500, 400);
await page.mouse.wheel(0, 1500);
await page.waitForTimeout(250);
// Where the object sits once the view has changed.
const ob = await page.evaluate(() => {
  const r = document.querySelector('.ob.is-selected').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
// A point on screen beyond the edge of the map: the wild ground.
const wild = await page.evaluate(() => {
  const r = document.getElementById('world').getBoundingClientRect();
  const tries = [
    { x: r.left - 12, y: innerHeight / 2 },
    { x: r.right + 12, y: innerHeight / 2 },
    { x: innerWidth / 2, y: r.top - 12 },
    { x: innerWidth / 2, y: r.bottom + 12 }
  ];
  return tries.find(p => p.x > 4 && p.x < innerWidth - 4 && p.y > 70 && p.y < innerHeight - 140) || null;
});
console.log('wild ground found at:', JSON.stringify(wild));
// Let any earlier message fade, so what follows says something.
await page.waitForTimeout(2800);
await page.mouse.move(ob.x, ob.y);
await page.mouse.down();
await page.mouse.move(wild.x, wild.y, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
console.log('dragged off the ground:', before, '->', (await placed())[0],
            '| said:', await page.evaluate(() => document.getElementById('toast').hidden ? '(nothing)' : document.getElementById('toast').textContent));

// ---- 2. the camera may bring a corner to the middle --------------------
await page.evaluate(() => { World.clearSelection(); World.fitCamera(); });
await page.waitForTimeout(250);
const middleX = 500, middleY = 400;
async function panFar(dx, dy) {
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(middleX, middleY);
    await page.mouse.down();
    await page.mouse.move(middleX + dx, middleY + dy, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(80);
  }
  return cam();
}
let far = await panFar(400, 300);
console.log('pushed right/down -> scene left edge at', Math.round(far.x), 'px (half the screen is', middleX + ')',
            '| top edge at', Math.round(far.y), '(half is', middleY + ')');
far = await panFar(-400, -300);
console.log('pushed left/up    -> scene right edge at', Math.round(far.x + far.w), 'px | bottom edge at', Math.round(far.y + far.h));

// Zoomed right out, the scene can still be moved around.
await page.evaluate(() => World.fitCamera());
await page.mouse.move(middleX, middleY);
await page.mouse.wheel(0, 1500);
await page.waitForTimeout(250);
const small = await cam();
const moved = await panFar(400, 0);
console.log('zoomed out, scene', Math.round(small.w), 'px wide on a', 1000, 'px screen -> can be pushed to', Math.round(moved.x));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
