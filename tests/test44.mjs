/* Two taps to go through a door.

   A house, a door and a staircase are the three things in a scene that
   lead somewhere. Picking one brings up the bar at the foot of the
   screen, which says where it leads, reads its English name out and
   offers the button that goes through. That detour is worth it the
   first time and a nuisance every time after, so two taps in a row on
   the same one go straight through.

   What this suite holds: that the two taps go through, that a single
   tap still only picks, that two slow taps are two single taps, and
   that nothing else in the scene has gained a second meaning. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);
await page.evaluate(() => { REWARD.grantTier(100); REWARD.addCoins(90000); });
await page.waitForTimeout(600);

const scene = () => page.evaluate(() => PropertyState.sceneId());
const barShows = () => page.evaluate(() => !!document.querySelector('[data-action="enter"]'));

// The middle of a block of a given kind, on the screen.
function middleOf(kind) {
  return page.evaluate(wanted => {
    const node = Array.from(document.querySelectorAll('.blk')).find(one => {
      const block = PropertyState.scene().blocks[Number(one.dataset.block)];
      return block && block.kind === wanted;
    });
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, kind);
}

async function twoTaps(spot, apart) {
  await page.touchscreen.tap(spot.x, spot.y);
  await page.waitForTimeout(apart);
  await page.touchscreen.tap(spot.x, spot.y);
  await page.waitForTimeout(450);
}

// ---- the house, from outside ----
console.log('where we start:', await scene());
const house = await middleOf('house');
await twoTaps(house, 100);
console.log('two taps on the house  ->', await scene());
await page.screenshot({ path: SHOTS + 'v44-inside.png' });

// ---- the door, from inside ----
const door = await middleOf('door');
await twoTaps(door, 100);
console.log('two taps on the door   ->', await scene());

// ---- the lift, in a building that has one ----
console.log('two taps on the lift:', JSON.stringify(await (async () => {
  await page.evaluate(() => {
    // The block of flats is the tallest thing to own: four floors of it.
    let again = true;
    while (again) { again = false; PropertyState.plotsForSale().forEach(p => { if (PropertyState.buyPlot(p.id)) again = true; }); }
    PropertyState.enter('tower_a1');
  });
  await page.waitForTimeout(500);
  const from = await scene();
  const up = await middleOf('lift_up');
  if (!up) return { from, lift: 'none found' };
  await twoTaps(up, 100);
  const after = await scene();
  // And back down again.
  const down = await middleOf('lift_down');
  if (down) await twoTaps(down, 100);
  return { from, upstairs: after, backDown: await scene() };
})()));

// ---- a single tap still only picks ----
await page.evaluate(() => PropertyState.enter('outside'));
await page.waitForTimeout(400);
const again = await middleOf('house');
await page.touchscreen.tap(again.x, again.y);
await page.waitForTimeout(400);
console.log('one tap on the house:', JSON.stringify({
  stillOutside: (await scene()) === 'outside', barOffered: await barShows()
}));
await page.screenshot({ path: SHOTS + 'v44-picked.png' });

// ---- two slow taps are two single taps ----
await page.evaluate(() => World.clearSelection());
await twoTaps(again, 900);
console.log('two slow taps:', JSON.stringify({
  stillOutside: (await scene()) === 'outside', barOffered: await barShows()
}));

// ---- two taps far apart on the screen are not a double tap ----
await page.evaluate(() => World.clearSelection());
await page.touchscreen.tap(again.x - 34, again.y);
await page.waitForTimeout(100);
await page.touchscreen.tap(again.x + 34, again.y);
await page.waitForTimeout(450);
console.log('two taps a finger apart:', JSON.stringify({ stillOutside: (await scene()) === 'outside' }));

// ---- and nothing else answers to two taps ----
/* A wall leads nowhere, and neither does a hen: tapping either twice
   must do exactly what tapping it twice did before. */
console.log('two taps on something that leads nowhere:', JSON.stringify(await (async () => {
  const hen = await page.evaluate(() => {
    World.clearSelection();
    // Somewhere in the middle of the map, well clear of the buttons that
    // float over the corners of the screen.
    const land = PropertyState.scene().land;
    for (let y = Math.floor(land.rows / 2); y < land.rows; y++) {
      for (let x = Math.floor(land.cols / 2); x < land.cols; x++) {
        if (PropertyState.buyAt('chicken', x, y, 0, 0)) {
          const entry = PropertyState.scene().placed.find(one => one.id === 'chicken');
          const box = document.querySelector('.ob[data-uid="' + entry.uid + '"]').getBoundingClientRect();
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        }
      }
    }
    return null;
  });
  await page.waitForTimeout(300);
  if (!hen) return 'no hen was put down';
  await twoTaps(hen, 100);
  return {
    stillOutside: (await scene()) === 'outside',
    henPicked: await page.evaluate(() => {
      const picked = World.selected();
      return !!picked && picked.kind === 'object';
    })
  };
})()));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
