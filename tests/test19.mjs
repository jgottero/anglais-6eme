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

const notes = () => page.evaluate(() => Array.from(document.querySelectorAll('.coin-fly')).map(n => ({
  text: n.textContent.trim(), spent: n.classList.contains('is-spent'),
  x: Math.round(parseFloat(n.style.left)), y: Math.round(parseFloat(n.style.top))
})));
const toast = () => page.evaluate(() => document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent);

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(3000);   // let the opening message go

// Buying: the price flies from where the object landed.
await page.evaluate(() => World.startPlacing('cow'));
await page.waitForTimeout(200);
const aim = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 38.5 * size, y: box.top + 26.5 * size };
});
await page.mouse.click(aim.x, aim.y);
await page.waitForTimeout(150);
const spent = await notes();
const obBox = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
console.log('after buying   :', JSON.stringify(spent), '| the cow sits at', JSON.stringify(obBox), '| toast:', JSON.stringify(await toast()));
await page.screenshot({ path: SHOTS + 'v15-spent.png' });
await page.click('#cancel-placing');

// The note goes away on its own.
await page.waitForTimeout(1400);
console.log('a moment later :', JSON.stringify(await notes()));

// Selling: the refund flies from where it stood.
await page.mouse.click(obBox.x, obBox.y);
await page.waitForTimeout(250);
await page.click('#action-bar .sell-btn');
await page.waitForTimeout(150);
console.log('after selling  :', JSON.stringify(await notes()), '| toast:', JSON.stringify(await toast()));
await page.screenshot({ path: SHOTS + 'v15-earned.png' });
await page.waitForTimeout(1400);

// Pressing off the ground says nothing at all.
await page.evaluate(() => World.startPlacing('chicken'));
await page.mouse.wheel(0, 1500);
await page.waitForTimeout(300);
const wild = await page.evaluate(() => {
  for (let y = 60; y < innerHeight - 160; y += 20)
    for (let x = 20; x < innerWidth - 20; x += 20) {
      const el = document.elementFromPoint(x, y);
      if (el && el.id === 'viewport') return { x, y };
    }
  return null;
});
await page.mouse.click(wild.x, wild.y);
await page.waitForTimeout(250);
console.log('press off the ground -> toast:', JSON.stringify(await toast()),
            '| notes:', JSON.stringify(await notes()),
            '| still in hand:', JSON.stringify(await page.evaluate(() => World.held())));

// A case that is taken still says so.
await page.evaluate(() => { PropertyState.buyAt('chicken', 48, 28, 0); });
await page.waitForTimeout(200);
const taken = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(taken.x, taken.y);
await page.waitForTimeout(250);
console.log('press on a taken case -> toast:', JSON.stringify(await toast()));

// Spending the last coins still warns.
await page.evaluate(() => { const d = PropertyState.get(); PropertyState.addCoins(-d.coins + 60); });
await page.waitForTimeout(150);
const free = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 4.5 * size, y: box.top + 14.5 * size };
});
await page.mouse.click(free.x, free.y);
await page.waitForTimeout(250);
console.log('last coins spent -> toast:', JSON.stringify(await toast()), '| notes:', JSON.stringify(await notes()));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
