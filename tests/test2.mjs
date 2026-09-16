/* What test2 has always asked, brought up to date.

   It was built on the chest: put an object away, take it out again,
   cancel a placement, be refused. There is no chest any more — an
   object is paid for where it lands and sold from where it stands — but
   everything else it asked still matters, and matters more now that
   nothing is held in reserve: what happens when the child changes their
   mind, and what happens when the tile says no. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(800); });
await page.waitForTimeout(300);

const purse = () => page.evaluate(() => REWARD.coins());
const held = () => page.evaluate(() => World.held() && World.held().id);

async function take(id) {
  await page.evaluate(one => World.startPlacing(one), id);
  await page.waitForTimeout(250);
}

// Where a tile sits on the screen, and whether the object would fit.
const screenOf = (id, x, y) => page.evaluate(([one, tx, ty]) => {
  const item = CATALOG.item(one);
  return Object.assign(World.screenOf(tx, ty, item.w, item.h),
    { allowed: PropertyState.canPlace(item, tx, ty, null, 0) });
}, [id, x, y]);

const freeTile = id => page.evaluate(one => {
  const item = CATALOG.item(one);
  const land = PropertyState.scene().land;
  for (let y = 0; y < land.rows; y++)
    for (let x = 0; x < land.cols; x++)
      if (PropertyState.canPlace(item, x, y, null, 0)) return { x, y };
  return null;
}, id);

// ---- the cross puts down what is in hand, and charges nothing ----
await take('chicken');
const beforeCancel = await purse();
await page.click('#cancel-placing');
await page.waitForTimeout(250);
console.log('the cross:', JSON.stringify({
  inHand: await held(), coinsUnchanged: beforeCancel === await purse(),
  handHidden: await page.locator('#hand').isHidden()
}));

// ---- and so does the escape key ----
await take('chicken');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
console.log('escape:', JSON.stringify({
  inHand: await held(), coinsUnchanged: beforeCancel === await purse()
}));

// ---- a wall of the house refuses, and takes nothing ----
await take('chicken');
const wall = await page.evaluate(() => {
  const block = PropertyState.scene().blocks[0];
  return Object.assign(World.screenOf(block.x, block.y, block.w, block.h), { kind: block.kind });
});
const beforeWall = await purse();
await page.mouse.click(wall.x, wall.y);
await page.waitForTimeout(350);
console.log('on a ' + wall.kind + ':', JSON.stringify({
  coinsUnchanged: beforeWall === await purse(),
  nothingPlaced: await page.evaluate(() => PropertyState.scene().placed.length),
  stillInHand: await held()
}));

// ---- the ghost says no before the finger comes down ----
await page.mouse.move(wall.x, wall.y);
await page.waitForTimeout(200);
const onWall = await page.evaluate(() => {
  const ghost = document.querySelector('.ghost');
  return { shown: !ghost.hidden, bad: ghost.classList.contains('is-bad') };
});
const good = await freeTile('chicken');
const goodSpot = await screenOf('chicken', good.x, good.y);
await page.mouse.move(goodSpot.x, goodSpot.y);
await page.waitForTimeout(200);
const onGrass = await page.evaluate(() => {
  const ghost = document.querySelector('.ghost');
  return { shown: !ghost.hidden, bad: ghost.classList.contains('is-bad') };
});
console.log('the ghost:', JSON.stringify({ over_a_wall: onWall, over_free_ground: onGrass }));

// ---- and the same tile taken twice is refused the second time ----
await page.mouse.click(goodSpot.x, goodSpot.y);
await page.waitForTimeout(350);
const afterFirst = await purse();
await page.mouse.click(goodSpot.x, goodSpot.y);
await page.waitForTimeout(350);
console.log('the same tile twice:', JSON.stringify({
  placed: await page.evaluate(() => PropertyState.scene().placed.length),
  coinsUnchanged: afterFirst === await purse(),
  toast: await page.locator('#toast').textContent()
}));
await page.screenshot({ path: SHOTS + 'v2-refused.png' });

// ---- the sea refuses everything that does not float ----
console.log('the beach bought:', await page.evaluate(() => {
  World.cancelPlacing();
  REWARD.addCoins(20000);        // the sea is not cheap
  return !!PropertyState.buyPlot('beach');
}));
await page.waitForTimeout(400);
console.log('dry land and open water:', JSON.stringify(await page.evaluate(() => {
  /* Water one owns, and enough of it for a 2 x 2 jetty. Unowned sea
     refuses everything whatever it is, which would prove nothing. */
  const place = PropertyState.scene();
  const wet = (x, y) => Ground.look(place, x, y) === 'water';
  let sea = null;
  place.plots.filter(plot => plot.owned).forEach(plot => {
    for (let y = plot.y; y < plot.y + plot.h - 1 && !sea; y++)
      for (let x = plot.x; x < plot.x + plot.w - 1 && !sea; x++)
        if (wet(x, y) && wet(x + 1, y) && wet(x, y + 1) && wet(x + 1, y + 1)) sea = { x, y };
  });
  if (!sea) return 'no open water on the land owned';
  return {
    at: sea.x + ',' + sea.y,
    a_hen_on_the_sea: PropertyState.canPlace(CATALOG.item('chicken'), sea.x, sea.y, null, 0),
    a_jetty_on_the_sea: PropertyState.canPlace(CATALOG.item('jetty'), sea.x, sea.y, null, 0)
  };
})));

// ---- an object one cannot afford is never handed over ----
await page.evaluate(() => { PropertyState.addCoins(-REWARD.coins()); });
await page.waitForTimeout(200);
await page.click('[data-panel]');
await page.waitForTimeout(400);
await page.click('[data-cat="animals"]');
await page.waitForTimeout(250);
await page.click('[data-pick="cow"]');
await page.waitForTimeout(350);
console.log('broke:', JSON.stringify({
  inHand: await held(),
  greyed: await page.evaluate(() => document.querySelectorAll('.card.is-locked').length),
  cards: await page.evaluate(() => document.querySelectorAll('.card').length),
  toast: await page.locator('#toast').textContent()
}));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
