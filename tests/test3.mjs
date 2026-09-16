import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
/* The camera: what a drag does, what the wheel does, what two fingers
   do, and how an object already standing is moved. The chest it used to
   fill before panning around is gone — objects are put down straight
   onto the property now — so the filling is done through today's flow
   and the camera questions are asked exactly as they always were. */
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
// Web fonts fetched from Google: a machine with no way out to the
// internet is not a broken module.
page.on('console', m => {
  const text = m.text();
  if (m.type() === 'error' && !/fonts\.googleapis|fonts\.gstatic|CERT/.test(text)) {
    errors.push('CONSOLE ' + text);
  }
});

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); });
await page.waitForTimeout(400);

const cam0 = await page.evaluate(() => document.getElementById('world').style.transform);
console.log('camera at start:', cam0);

// The purse pays, for the prototype.
await page.click('#purse');
await page.click('#purse');
console.log('coins after two taps:', await page.evaluate(() => REWARD.coins()));

// Two objects put down, to have something to look at and to move.
console.log('put down:', JSON.stringify(await page.evaluate(() => {
  REWARD.addCoins(2000);
  const land = PropertyState.scene().land;
  const put = id => {
    const item = CATALOG.item(id);
    for (let y = 0; y < land.rows; y++)
      for (let x = 0; x < land.cols; x++)
        if (PropertyState.canPlace(item, x, y, null, 0)) return !!PropertyState.buyAt(id, x, y, 0, 0);
    return false;
  };
  const ok = ['chicken', 'apple_tree'].map(put);
  return { bought: ok, onTheGround: PropertyState.scene().placed.length };
})));
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + 'v2-drag-chest.png' });

/* The scene is not pinned when it fits: it slides freely, and stops
   only when one of its edges reaches the middle of the screen — which
   is what lets a far corner be brought to the centre to build on. So a
   drag moves it, and shoving it hard leaves an edge no further in than
   halfway. */
const restBefore = await page.evaluate(() => document.getElementById('world').style.transform);
await page.mouse.move(700, 650);
await page.mouse.down();
await page.mouse.move(600, 560, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(150);
console.log('a drag moves the scene:',
  restBefore !== await page.evaluate(() => document.getElementById('world').style.transform));

// Shoved as far as it will go, in each direction in turn.
for (const [fromX, fromY, toX, toY] of [[700, 650, 100, 100], [100, 100, 800, 700]]) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}
console.log('an edge never goes past the middle:', JSON.stringify(await page.evaluate(() => {
  const view = document.getElementById('viewport').getBoundingClientRect();
  const scene = document.getElementById('world').getBoundingClientRect();
  const midX = view.left + view.width / 2;
  const midY = view.top + view.height / 2;
  return {
    left_edge_left_of_middle: Math.round(scene.left) <= Math.round(midX) + 1,
    right_edge_right_of_middle: Math.round(scene.right) >= Math.round(midX) - 1,
    top_edge_above_middle: Math.round(scene.top) <= Math.round(midY) + 1,
    bottom_edge_below_middle: Math.round(scene.bottom) >= Math.round(midY) - 1
  };
})));

// Zoom in first, then pan.
await page.mouse.move(450, 400);
await page.mouse.wheel(0, -600);
await page.waitForTimeout(150);
const before = await page.evaluate(() => document.getElementById('world').style.transform);
await page.mouse.move(700, 180);
await page.mouse.down();
await page.mouse.move(600, 120, { steps: 8 });
await page.mouse.up();
const after = await page.evaluate(() => document.getElementById('world').style.transform);
console.log('camera moved by the drag:', before !== after, '|', after);

// Wheel zoom.
await page.mouse.move(450, 400);
await page.mouse.wheel(0, -400);
await page.waitForTimeout(150);
const zoomed = await page.evaluate(() => document.getElementById('world').style.transform);
console.log('camera after the wheel:', zoomed);

// Pinch, sent as raw pointer events (Playwright has no pinch gesture).
const pinch = await page.evaluate(() => {
  const vp = document.getElementById('viewport');
  const scale = () => Number(document.getElementById('world').style.transform.match(/scale\(([\d.]+)\)/)[1]);
  const send = (type, id, x, y, target) => target.dispatchEvent(new PointerEvent(type, {
    pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: id === 1, button: 0, pointerType: 'touch'
  }));
  const start = scale();
  send('pointerdown', 1, 400, 400, vp);
  send('pointerdown', 2, 500, 400, vp);
  send('pointermove', 1, 300, 400, window);
  send('pointermove', 2, 600, 400, window);
  const spread = scale();
  send('pointermove', 1, 390, 400, window);
  send('pointermove', 2, 410, 400, window);
  const pinched = scale();
  send('pointerup', 1, 390, 400, window);
  send('pointerup', 2, 410, 400, window);
  return { start, spread, pinched };
});
console.log('pinch: start', pinch.start.toFixed(2), '-> spread', pinch.spread.toFixed(2), '-> pinched', pinch.pinched.toFixed(2));

// Moving an object already on the ground.
const obBefore = await page.evaluate(() => ({ ...PropertyState.scene().placed[0] }));
// Selected first: a drag on anything unselected moves the camera.
await page.locator('.ob').first().click();
await page.waitForTimeout(200);
const ob = await page.locator('.ob').first().boundingBox();
await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2);
await page.mouse.down();
await page.mouse.move(ob.x + 150, ob.y + 120, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(200);
const obAfter = await page.evaluate(() => ({ ...PropertyState.scene().placed[0] }));
console.log('object moved:', `${obBefore.x},${obBefore.y}`, '->', `${obAfter.x},${obAfter.y}`,
            '| action bar:', await page.locator('#action-bar').isVisible());
await page.screenshot({ path: SHOTS + 'v2-property.png' });

// A tap on a shop card keeps the object in hand, and the ground pays.
await page.click('[data-panel]');
await page.waitForTimeout(350);
await page.click('[data-pick="chicken"] .card-art');
await page.waitForTimeout(350);
console.log('in hand after a tap:', JSON.stringify({
  held: await page.evaluate(() => World.held() && World.held().id),
  shopClosed: await page.locator('#panel-shop').isHidden()
}));
const spot = await page.evaluate(() => {
  const item = CATALOG.item('chicken');
  const land = PropertyState.scene().land;
  for (let y = 0; y < land.rows; y++)
    for (let x = 0; x < land.cols; x++)
      if (PropertyState.canPlace(item, x, y, null, 0)) return World.screenOf(x, y, item.w, item.h);
  return null;
});
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(350);
console.log('placed by tapping the ground:',
  await page.evaluate(() => PropertyState.scene().placed.length));

await page.evaluate(() => World.cancelPlacing());
await page.click('[data-panel]');
await page.waitForTimeout(350);
await page.screenshot({ path: SHOTS + 'v2-shop.png' });
await page.click('#panel-shop .close-btn');
await page.waitForTimeout(250);

// Phone size.
await page.setViewportSize({ width: 390, height: 760 });
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'v2-phone.png' });
console.log('horizontal overflow (px):', await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
