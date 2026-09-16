/* The buildings of the town: room enough inside, balconies, a facade
   that does not lie about its floors, and a button for each of them. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);
await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(200000);
  let again = true;
  while (again) { again = false; PropertyState.plotsForSale().forEach(p => { if (PropertyState.buyPlot(p.id)) again = true; }); }
});
await page.waitForTimeout(500);

// ---- every plan holds together ----
console.log('the plans:', JSON.stringify(await page.evaluate(() => {
  const wrong = [];
  const rooms = [];
  Object.keys(SCENES.build(SCENES.PLOTS.map(p => p.id))).forEach(id => {
    const place = SCENES.build(SCENES.PLOTS.map(p => p.id))[id];
    if (!place.indoor) return;
    rooms.push(id);
  });
  return { rooms: rooms.length };
})));

console.log('room enough in the town:', JSON.stringify(await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const squares = id => all[id].land.cols * all[id].land.rows;
  return {
    the_starting_house: squares('house'),
    the_block_of_flats: squares('flat_1'),
    a_tower: squares('tower_a1'),
    the_long_block: squares('loft_1'),
    all_bigger_than_home: ['flat_1', 'tower_a1', 'loft_1'].every(id => squares(id) > squares('house'))
  };
})));

// ---- the outside says as many floors as the inside has ----
console.log('the facades tell the truth:', JSON.stringify(await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const told = {};
  all.outside.blocks.forEach(block => {
    const kind = SCENES.kind(block.kind);
    if (!kind || !kind.floors || !block.to) return;
    // Count the floors by walking the stairs, the way the module does.
    const stack = [];
    let at = block.to;
    const seen = {};
    while (at && all[at] && !seen[at]) {
      seen[at] = true;
      stack.push(at);
      const up = all[at].blocks.find(b => b.kind === 'stairs_up' && b.to);
      at = up ? up.to : null;
    }
    told[block.kind] = { drawn: kind.floors, walked: stack.length, agree: kind.floors === stack.length };
  });
  return told;
})));

// ---- a balcony upstairs, none at street level ----
console.log('balconies:', JSON.stringify(await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const balcony = id => (all[id].plots[0].patches || []).reduce((n, a) => n + a.w * a.h, 0);
  const rails = id => all[id].blocks.filter(b => b.kind === 'rail' || b.kind === 'rail_side').length;
  return {
    tower_ground: balcony('tower_a1'), tower_upstairs: balcony('tower_a2'),
    flat_ground: balcony('flat_1'), flat_upstairs: balcony('flat_2'),
    loft_ground: balcony('loft_1'), loft_upstairs: balcony('loft_2'),
    every_balcony_railed: ['tower_a2', 'flat_2', 'loft_2'].every(id => balcony(id) && rails(id))
  };
})));

// ---- one can furnish a balcony, but not build on its railing ----
await page.evaluate(() => { PropertyState.enter('tower_a2'); });
await page.waitForTimeout(500);
console.log('out on the balcony:', JSON.stringify(await page.evaluate(() => {
  const place = PropertyState.scene();
  const patch = place.plots[0].patches[0];
  const chair = CATALOG.item('chair');
  // A square of balcony with nothing built on it.
  let free = null;
  for (let y = patch.y; y < patch.y + patch.h && !free; y++)
    for (let x = patch.x; x < patch.x + patch.w - 1 && !free; x++)
      if (PropertyState.canPlace(chair, x, y, null, 0)) free = { x, y };
  const rail = place.blocks.find(b => b.kind === 'rail');
  return {
    ground_under_it: Ground.look(place, free.x, free.y),
    a_chair_out_there: !!PropertyState.buyAt('chair', free.x, free.y, 0, 0),
    on_the_railing: PropertyState.canPlace(chair, rail.x, rail.y, null, 0)
  };
})));

// ---- a button per floor, and it takes you there ----
await page.waitForTimeout(400);
console.log('the floor buttons:', JSON.stringify(await page.evaluate(() => ({
  labels: Array.from(document.querySelectorAll('.floor-btn')).map(b => b.textContent),
  here: document.querySelector('.floor-btn.is-on').textContent,
  named: document.querySelector('.floor-btn.is-on').title
}))));
await page.screenshot({ path: SHOTS + 'v18-floors.png' });

await page.click('.floor-btn[data-floor="tower_a4"]');
await page.waitForTimeout(600);
console.log('straight to the top:', JSON.stringify(await page.evaluate(() => ({
  scene: PropertyState.sceneId(),
  name: PropertyState.scene().name,
  here: document.querySelector('.floor-btn.is-on').textContent
}))));

// ---- and nowhere to choose in a building of one floor ----
await page.evaluate(() => PropertyState.enter('cabin'));
await page.waitForTimeout(500);
console.log('in the one-room cabin:', JSON.stringify({
  buttons: await page.evaluate(() => document.querySelectorAll('.floor-btn').length),
  hidden: await page.locator('#floors').isHidden()
}));

// ---- an old property loses nothing silently: what no longer fits is paid back ----
const stranded = await page.evaluate(() => {
  /* A square where a wall stands today. An old property may well have
     had a chair there, back when the room was laid out differently. */
  const place = SCENES.build(SCENES.PLOTS.map(p => p.id)).tower_a1;
  const wall = place.blocks.find(b => b.kind !== 'door' && b.y > 0 && b.x > 0);
  const save = JSON.parse(localStorage.getItem('reward-property-v1'));
  save.placed.tower_a1 = [{ uid: 9001, id: 'chair', x: wall.x, y: wall.y }];
  save.coins = 0;
  localStorage.setItem('reward-property-v1', JSON.stringify(save));
  return { at: wall.x + ',' + wall.y, kind: wall.kind, price: CATALOG.item('chair').price };
});
console.log('a chair left standing where a wall now is:', JSON.stringify(stranded));
await page.reload();
await page.waitForTimeout(900);
console.log('an older property, mended:', JSON.stringify(await page.evaluate(() => ({
  refunded: PropertyState.mendedCoins(),
  coins: REWARD.coins(),
  leftStanding: (JSON.parse(localStorage.getItem('reward-property-v1')).placed.tower_a1 || []).length
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
