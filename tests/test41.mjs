/* The drawing and the ground it stands on, told apart.

   An object used to take exactly the tiles it was drawn on, so a pine
   tree drawn four tiles wide held four tiles of ground and no two trees
   could stand close together. A tree now holds only the strip under its
   trunk, and its branches hang over whatever is behind it.

   What this suite watches: that the strip is where it says it is
   whichever way the object is turned, that the drawing has not moved on
   the screen, that a wood really can be planted thick, and that a
   property saved by yesterday's version comes across without losing a
   single thing. */
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
await page.waitForTimeout(600);

// ---- the catalogue itself ----
/* A strip of ground is centred on the drawing, so it can only be laid
   on whole tiles if it is odd or even along with it. Nothing laid flat
   on the ground has one, and neither has anything that joins up with
   its own kind — a fence is its own footprint. */
console.log('the feet in the catalogue:', JSON.stringify(await page.evaluate(() => {
  const wrong = [];
  let many = 0;
  CATALOG.ITEMS.forEach(item => {
    if (item.foot === undefined) return;
    many++;
    if ((item.w - item.foot) % 2) wrong.push(item.id + ': cannot be centred');
    if (item.foot < 1 || item.foot > item.w) wrong.push(item.id + ': ' + item.foot + ' of ' + item.w);
    if (item.foot === item.w && item.h === 1) wrong.push(item.id + ': says nothing');
    if (CATALOG.layerOf(item) === 'ground') wrong.push(item.id + ': lies on the ground');
    if (item.joins) wrong.push(item.id + ': joins up');
  });
  return { many, wrong };
})));

// ---- where the drawing goes, turn by turn ----
/* The trunk holds three tiles along the bottom of a drawing three wide
   and four tall. Given a quarter turn the whole thing goes round: the
   bottom becomes the left-hand side, then the top, then the right. */
console.log('a pine tree, turned:', JSON.stringify(await page.evaluate(() => {
  const tree = CATALOG.item('pine_tree');
  return [0, 1, 2, 3].map(turn => {
    const foot = CATALOG.footprint(tree, turn);
    const drawn = CATALOG.drawing(tree, turn);
    return { turn,
      foot: foot.w + 'x' + foot.h,
      drawn: drawn.w + 'x' + drawn.h + ' at ' + drawn.x + ',' + drawn.y };
  });
})));

/* Whichever way it is turned, the strip has to sit inside the drawing
   and be flush with the side the object stands on. Asked of every
   object in the catalogue, with every quarter. */
console.log('the strip inside the drawing:', JSON.stringify(await page.evaluate(() => {
  const wrong = [];
  CATALOG.ITEMS.forEach(item => {
    [0, 1, 2, 3].forEach(turn => {
      const foot = CATALOG.footprint(item, turn);
      const drawn = CATALOG.drawing(item, turn);
      if (drawn.x > 0 || drawn.y > 0) wrong.push(item.id + '/' + turn + ': drawn past its foot');
      if (drawn.x + drawn.w < foot.w || drawn.y + drawn.h < foot.h) {
        wrong.push(item.id + '/' + turn + ': foot sticks out of the drawing');
      }
    });
  });
  return wrong.length ? wrong.slice(0, 8) : 'every one of them holds';
})));

// ---- a wood, planted thick ----
/* Three tiles of trunk, so trees three tiles apart stand shoulder to
   shoulder, and a row of them two tiles below the last — which the four
   tiles the drawing takes could never have allowed. The first plot on
   its own is room enough, once the house is stepped around. */
console.log('a wood:', JSON.stringify(await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(40); REWARD.addCoins(40000);
  let planted = 0;
  const wanted = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      wanted.push([29 + col * 3, 26 + row * 2]);
    }
  }
  wanted.forEach(([x, y]) => { if (PropertyState.buyAt('pine_tree', x, y, 0, 0)) planted++; });
  // Four tiles of ground, as it used to be, and the same wood is refused.
  const wouldHaveClashed = wanted.filter(([x, y], at) =>
    wanted.some(([ox, oy], other) => other < at && x < ox + 4 && x + 4 > ox && y < oy + 4 && y + 4 > oy)).length;
  return { planted, of: wanted.length, wouldHaveClashed };
})));

/* And they are drawn where they stand: the trunk on its own row, the
   branches three rows above it, one tree's drawing overlapping the
   next one's. */
console.log('drawn where they stand:', JSON.stringify(await page.evaluate(() => {
  const entry = PropertyState.scene().placed.find(one => one.id === 'pine_tree');
  const node = document.querySelector('.ob[data-uid="' + entry.uid + '"]');
  const style = node.style;
  return {
    stands: entry.x + ',' + entry.y,
    drawnAt: parseInt(style.left, 10) / 32 + ',' + parseInt(style.top, 10) / 32,
    drawnSize: parseInt(style.width, 10) / 32 + 'x' + parseInt(style.height, 10) / 32
  };
})));

// ---- the ghost marks the ground, not the drawing ----
console.log('what the ghost marks:', JSON.stringify(await page.evaluate(() => {
  const ghost = document.querySelector('.ghost');
  const before = ghost.hidden;
  // The shop hands the tree over; a press on the ground shows where it lands.
  World.startPlacing('pine_tree');
  const viewport = document.getElementById('viewport');
  const spot = viewport.getBoundingClientRect();
  viewport.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, pointerId: 1,
    clientX: spot.left + spot.width / 2, clientY: spot.top + spot.height / 2
  }));
  const art = ghost.querySelector('.ghost-art');
  const read = {
    hiddenBefore: before,
    ghost: parseInt(ghost.style.width, 10) / 32 + 'x' + parseInt(ghost.style.height, 10) / 32,
    art: art ? parseInt(art.style.width, 10) / 32 + 'x' + parseInt(art.style.height, 10) / 32 : null,
    artAbove: art ? parseInt(art.style.top, 10) / 32 : null,
    andItIsATree: !!(art && art.querySelector('img'))
  };
  // Put the tree down again without buying anything.
  window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
  World.cancelPlacing();
  return read;
})));

// ---- a property from yesterday ----
/* A save written by version 9 held every object by the corner of its
   drawing. Read today, each one stands on the strip at the foot of that
   same drawing: nothing is lost, nothing is paid back, and what the
   child sees does not move. */
const before = await page.evaluate(() => {
  const old = {
    version: 9, coins: 500, current: 'outside', owned: ['home'],
    tiers: [40], stamps: 0, nextUid: 9,
    placed: { outside: [
      { uid: 1, id: 'pine_tree', x: 29, y: 16 },
      { uid: 2, id: 'pine_tree', x: 29, y: 21, r: 1 },
      { uid: 3, id: 'bed', x: 29, y: 26 },
      { uid: 4, id: 'chicken', x: 34, y: 16 },
      { uid: 5, id: 'bench', x: 34, y: 26, r: 2 },
      { uid: 6, id: 'lamp', x: 48, y: 16 },
      { uid: 7, id: 'tractor', x: 48, y: 20, r: 3 },
      { uid: 8, id: 'flowers', x: 52, y: 30 }
    ] }
  };
  localStorage.setItem('reward-property-v1', JSON.stringify(old));
  return old.placed.outside.length;
});
await page.reload();
await page.waitForTimeout(700);
console.log('a version 9 property, read today:', JSON.stringify(await page.evaluate(had => {
  const here = PropertyState.scene().placed;
  return {
    had,
    kept: here.length,
    paidBack: PropertyState.mendedCoins(),
    coins: PropertyState.get().coins,
    version: JSON.parse(localStorage.getItem('reward-property-v1')).version,
    stand: here.map(one => one.id + '@' + one.x + ',' + one.y + (one.r ? '/' + one.r : ''))
  };
}, before)));

/* The drawings have not moved: each one is still centred where version
   9 had it, give or take the half tile a three-wide trunk cannot help
   on a four-wide drawing. WAS below is the square version 9 gave each
   of them, already turned. */
console.log('and the drawings have not moved:', JSON.stringify(await page.evaluate(() => {
  const was = { 1: [29, 16, 4, 4], 2: [29, 21, 4, 4], 3: [29, 26, 4, 4], 4: [34, 16, 2, 2],
                5: [34, 26, 4, 2], 6: [48, 16, 2, 2], 7: [48, 20, 3, 6], 8: [52, 30, 1, 1] };
  const adrift = [];
  Object.keys(was).forEach(uid => {
    const node = document.querySelector('.ob[data-uid="' + uid + '"]');
    if (!node) { adrift.push(uid + ': gone'); return; }
    const box = [parseInt(node.style.left, 10) / 32, parseInt(node.style.top, 10) / 32,
                 parseInt(node.style.width, 10) / 32, parseInt(node.style.height, 10) / 32];
    const off = Math.max(
      Math.abs((box[0] + box[2] / 2) - (was[uid][0] + was[uid][2] / 2)),
      Math.abs((box[1] + box[3] / 2) - (was[uid][1] + was[uid][3] / 2)));
    if (off > 0.5) adrift.push(uid + ': its middle is ' + off + ' tiles away');
  });
  return adrift.length ? adrift : 'all eight still centred within half a tile';
})));

/* ---- a flower behind a barn ---- */
/* Drawings overlap now, and the one in front would swallow every press
   if the square pressed did not decide. A press on the flower's own
   square picks the flower, though the barn is drawn over it; a press on
   the barn's roof, where nothing stands, picks the barn. */
console.log('a flower behind a barn:', JSON.stringify(await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(60); REWARD.addCoins(60000);
  const barn = PropertyState.buyAt('barn', 30, 26, 0, 0);
  const flower = PropertyState.buyAt('flowers', 32, 24, 0, 0);
  if (!barn || !flower) return 'could not put them down';
  const here = PropertyState.scene().placed;
  const press = (x, y) => {
    const spot = World.screenOf(x, y, 1, 1);
    const target = document.elementFromPoint(spot.x, spot.y);
    target.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles: true, pointerId: 2, clientX: spot.x, clientY: spot.y }));
    window.dispatchEvent(new PointerEvent('pointerup',
      { bubbles: true, pointerId: 2, clientX: spot.x, clientY: spot.y }));
    const picked = World.selected();
    const what = picked && picked.kind === 'object'
      ? here.find(one => one.uid === picked.uid) : null;
    return what ? what.id : (picked ? picked.kind : 'nothing');
  };
  return {
    onTheFlowersSquare: press(32, 24),
    onTheBarnsRoof: press(32, 23),
    onTheBarnsFoot: press(32, 26)
  };
})));

await page.screenshot({ path: SHOTS + 'v41-feet.png' });
console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
