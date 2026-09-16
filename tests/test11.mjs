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

const placed = () => page.evaluate(() => PropertyState.scene().placed.map(p => `${p.id}@${p.x},${p.y} r${p.r || 0}`));
const tile = (col, row) => page.evaluate(({ col, row }) => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + (col + 0.5) * size, y: box.top + (row + 0.5) * size };
}, { col, row });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(4000); PropertyState.enter('house'); });
await page.waitForTimeout(450);

// Rules, checked against the state: a turned bed takes the other way round.
console.log('rules:', JSON.stringify(await page.evaluate(() => {
  const bed = CATALOG.item('bed'), sofa = CATALOG.item('sofa'), plant = CATALOG.item('plant');
  return {
    bedTurns: !!bed.turns, plantTurns: !!plant.turns,
    sofaFlat: CATALOG.footprint(sofa, 0), sofaTurned: CATALOG.footprint(sofa, 1),
    // A 2x1 sofa fits across the top of the bedroom, but not down it.
    sofaAcross: PropertyState.canPlace(sofa, 10, 2, null, 0),
    sofaDown: PropertyState.canPlace(sofa, 16, 2, null, 1),
    sofaDownOutOfRoom: PropertyState.canPlace(sofa, 16, 6, null, 1)
  };
})));

// Take a sofa in hand, turn it before putting it down.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
await page.click('[data-pick="sofa"]');
await page.waitForTimeout(300);
console.log('turn button in hand:', await page.locator('#turn-held').isVisible(),
            '| held:', JSON.stringify(await page.evaluate(() => World.held())));
await page.click('#turn-held');
await page.waitForTimeout(200);
console.log('after one turn:', JSON.stringify(await page.evaluate(() => World.held())),
            '| drawing rotated:', await page.evaluate(() => document.getElementById('hand-art').style.transform));

let spot = await tile(16, 2);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
console.log('placed turned:', JSON.stringify(await placed()));
await page.click('#cancel-placing');

// Its footprint really is 1x2 on the grid.
console.log('footprint on screen:', await page.evaluate(() => {
  const node = document.querySelector('.ob');
  const scale = Number(document.getElementById('world').style.transform.match(/scale\(([\d.]+)\)/)[1]);
  const r = node.getBoundingClientRect();
  return { cols: Math.round(r.width / (32 * scale)), rows: Math.round(r.height / (32 * scale)),
           imgTurned: !!node.querySelector('img.is-turned') };
}));

// Turning it once more from its bar.
const ob = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(ob.x, ob.y);
await page.waitForTimeout(250);
const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()));
await page.click('#action-bar .turn-btn');
await page.waitForTimeout(250);
console.log('bar buttons:', JSON.stringify(buttons), '| after turning from the bar:', JSON.stringify(await placed()));

// A turn that would not fit is refused and changes nothing.
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(4000); PropertyState.enter('house'); });
await page.waitForTimeout(400);
await page.evaluate(() => { PropertyState.buyAt('bed', 10, 2, 0); });   // 2x2, square: always fits
await page.evaluate(() => { PropertyState.buyAt('table', 10, 6, 0); }); // 2x1 in a 4-wide room
const before = await placed();
const cramped = await page.evaluate(() => {
  // A table squeezed between the wall and the bed cannot swing round.
  PropertyState.buyAt('sofa', 14, 6, 0);
  return PropertyState.turn(PropertyState.scene().placed.find(e => e.id === 'sofa').uid);
});
console.log('turn refused when it does not fit:', cramped === false || cramped === true ? cramped : 'n/a',
            '| before:', JSON.stringify(before.slice(0, 2)));

// A plant has no turn button at all.
await page.evaluate(() => PropertyState.buyAt('plant', 2, 2, 0));
await page.waitForTimeout(300);
const plantNode = await page.evaluate(() => {
  const node = Array.from(document.querySelectorAll('.ob')).find(n => n.querySelector('img').alt === 'Plante');
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(plantNode.x, plantNode.y);
await page.waitForTimeout(250);
console.log('plant bar:', JSON.stringify(await page.evaluate(() =>
  Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()))));

// The door one can buy, and the one that is built in.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
await page.click('[data-pick="inner_door"]');
await page.waitForTimeout(250);
spot = await tile(4, 9);    // the doorway in the wall between the rooms
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
await page.click('#turn-held');       // upright now, for the doorway in the side wall
await page.waitForTimeout(200);
spot = await tile(9, 4);
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(300);
await page.click('#cancel-placing');
console.log('bought doors:', JSON.stringify((await placed()).filter(p => p.startsWith('inner_door'))));
const outerDoor = await page.evaluate(() => {
  const r = document.querySelector('.blk-door').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(outerDoor.x, outerDoor.y);
await page.waitForTimeout(250);
console.log('outer door bar:', JSON.stringify(await page.evaluate(() =>
  Array.from(document.querySelectorAll('#action-bar button')).map(b => b.textContent.trim()))));
await page.screenshot({ path: SHOTS + 'v9-inside.png' });

// A turn survives a reload.
const beforeReload = await placed();
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(600);
console.log('turns kept after reload:', JSON.stringify(beforeReload) === JSON.stringify(await placed()));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
