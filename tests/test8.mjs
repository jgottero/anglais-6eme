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
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100);
  REWARD.addCoins(3000);
  PropertyState.buyAt('chicken', 36, 28);
  PropertyState.buyAt('cow', 44, 30);
});
await page.waitForTimeout(400);

const world = async () => page.evaluate(() => ({
  cam: document.getElementById('world').style.transform,
  placed: PropertyState.scene().placed.map(p => `${p.id}@${p.x},${p.y}`)
}));
const centre = async uid => page.evaluate(uid => {
  const node = document.querySelector(`.ob[data-uid="${uid}"]`);
  const box = node.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}, uid);

// Zoom in towards the hen, which keeps it under the pointer.
const start = await centre(1);
await page.mouse.move(start.x, start.y);
await page.mouse.wheel(0, -600);
await page.waitForTimeout(250);

// 1. Dragging an object that is NOT selected pans the camera instead.
const hen = await centre(1);
let before = await world();
await page.mouse.move(hen.x, hen.y);
await page.mouse.down();
await page.mouse.move(hen.x - 120, hen.y - 80, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
let after = await world();
console.log('unselected hen -> camera panned:', before.cam !== after.cam,
            '| hen stayed put:', before.placed[0] === after.placed[0],
            '| nothing selected:', await page.locator('#action-bar').isHidden());

// 2. A press that does not travel picks the object.
const hen2 = await centre(1);
await page.mouse.click(hen2.x, hen2.y);
await page.waitForTimeout(250);
console.log('tap selects:', await page.locator('#action-bar .bar-id b').textContent(),
            '| hint:', await page.locator('#action-bar .hint').textContent());

// 3. Once selected, the same drag moves the object and leaves the camera alone.
before = await world();
const hen3 = await centre(1);
await page.mouse.move(hen3.x, hen3.y);
await page.mouse.down();
await page.mouse.move(hen3.x + 150, hen3.y + 90, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(250);
after = await world();
console.log('selected hen -> moved:', before.placed[0], '->', after.placed[0],
            '| camera still:', before.cam === after.cam,
            '| still selected:', await page.locator('#action-bar').isVisible());

// 4. A refused drop keeps it selected, ready for another try.
const hen4 = await centre(1);
const cow = await centre(2);
await page.mouse.move(hen4.x, hen4.y);
await page.mouse.down();
await page.mouse.move(cow.x, cow.y, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(250);
console.log('refused drop -> still selected:', await page.locator('#action-bar').isVisible(),
            '| hen still at:', (await world()).placed[0]);

// 5. Tapping the ground drops the selection; panning keeps it.
// A point of bare ground somewhere on screen.
const empty = await page.evaluate(() => {
  for (let y = 120; y < window.innerHeight - 160; y += 20) {
    for (let x = 60; x < window.innerWidth - 60; x += 20) {
      const el = document.elementFromPoint(x, y);
      if (el && (el.classList.contains('ground') || el.id === 'world')) return { x, y };
    }
  }
  return null;
});
const spot = empty ? 'ground' : 'none';
await page.mouse.click(empty.x, empty.y);
await page.waitForTimeout(200);
console.log('tap on the ground clears the selection:', await page.locator('#action-bar').isHidden(),
            '| element at the tap:', spot, '| selected:', await page.evaluate(() => World.selected()));
await page.mouse.click((await centre(2)).x, (await centre(2)).y);
await page.waitForTimeout(200);
before = await world();
await page.mouse.move(150, 200);
await page.mouse.down();
await page.mouse.move(280, 320, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
after = await world();
console.log('panning keeps the selection:', await page.locator('#action-bar').isVisible(),
            '| camera moved:', before.cam !== after.cam);
await page.screenshot({ path: SHOTS + 'v6-selected.png' });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
