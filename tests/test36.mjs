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
await page.evaluate(() => { PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(5000); });
await page.waitForTimeout(300);

// ---- every drawing a colour promises is really there ----
console.log('every repaint on disk:', JSON.stringify(await page.evaluate(async () => {
  const want = [];
  Object.keys(CATALOG.PAINT).forEach(id => {
    const item = CATALOG.item(id);
    CATALOG.PAINT[id].colours.forEach(c => {
      want.push(CATALOG.assetUrl(id, c));
      if (item.card) want.push(CATALOG.cardUrl(id, c));
    });
  });
  const missing = [];
  for (const url of want) {
    const res = await fetch(url);
    if (!res.ok) missing.push(url);
  }
  return { asked: want.length, missing };
})));

// ---- the shop shows the colours, and a colour repaints the card ----
await page.click('[data-panel]');
await page.waitForTimeout(300);
await page.click('[data-cat="garden"]');
await page.waitForTimeout(200);
console.log('the mailbox on the shelf:', JSON.stringify(await page.evaluate(() => {
  const card = document.querySelector('[data-pick="mailbox"]');
  return {
    pots: card.querySelectorAll('.swatch').length,
    on: card.querySelector('.swatch.is-on').dataset.colour,
    art: card.querySelector('.card-art img').getAttribute('src')
  };
})));
console.log('a plain object has none:', await page.evaluate(() =>
  document.querySelector('[data-pick="birdhouse"]').querySelectorAll('.swatch').length));

await page.click('[data-pick="mailbox"] .swatch[data-colour="green"]');
await page.waitForTimeout(200);
console.log('painted on the shelf:', JSON.stringify(await page.evaluate(() => {
  const card = document.querySelector('[data-pick="mailbox"]');
  return {
    art: card.querySelector('.card-art img').getAttribute('src'),
    on: card.querySelector('.swatch.is-on').dataset.colour,
    stillShopping: !document.getElementById('panel-shop').hidden
  };
})));

// ---- and leaves the shop in that colour ----
await page.click('[data-pick="mailbox"] .card-art');
await page.waitForTimeout(300);
console.log('in hand:', JSON.stringify(await page.evaluate(() => ({
  held: World.held().c,
  art: document.getElementById('hand-art').getAttribute('src'),
  pots: document.querySelectorAll('#hand-colours .swatch').length,
  on: document.querySelector('#hand-colours .swatch.is-on').dataset.colour
}))));

// ---- a change of mind, still in hand ----
await page.click('#hand-colours .swatch[data-colour="yellow"]');
await page.waitForTimeout(200);
console.log('repainted in hand:', JSON.stringify(await page.evaluate(() => ({
  held: World.held().c,
  art: document.getElementById('hand-art').getAttribute('src')
}))));

// ---- put down, it keeps its colour ----
const box = await page.locator('#world').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(400);
console.log('put down:', JSON.stringify(await page.evaluate(() => {
  const entry = PropertyState.scene().placed[0];
  const node = document.querySelector('.ob[data-uid="' + entry.uid + '"] img');
  const saved = JSON.parse(localStorage.getItem('reward-property-v1'));
  return { id: entry.id, colour: entry.c, drawn: node.getAttribute('src'),
           inTheSave: saved.placed[PropertyState.sceneId()][0].c };
})));

// ---- selected, it can be painted again ----
await page.evaluate(() => World.select({ kind: 'object', uid: PropertyState.scene().placed[0].uid }));
await page.waitForTimeout(300);
console.log('the bar of the object:', JSON.stringify(await page.evaluate(() => ({
  pots: document.querySelectorAll('#action-bar .swatch').length,
  on: document.querySelector('#action-bar .swatch.is-on').dataset.colour
}))));
await page.click('#action-bar .swatch[data-colour="red"]');
await page.waitForTimeout(300);
console.log('painted where it stands:', JSON.stringify(await page.evaluate(() => {
  const entry = PropertyState.scene().placed[0];
  return { colour: entry.c, drawn: document.querySelector('.ob[data-uid="' + entry.uid + '"] img').getAttribute('src'),
           barOn: document.querySelector('#action-bar .swatch.is-on').dataset.colour };
})));

// ---- back to the colour it is drawn in leaves no mark at all ----
await page.click('#action-bar .swatch[data-colour="blue"]');
await page.waitForTimeout(300);
console.log('back to its own colour:', JSON.stringify(await page.evaluate(() => {
  const entry = PropertyState.scene().placed[0];
  return { hasColour: 'c' in entry,
           drawn: document.querySelector('.ob[data-uid="' + entry.uid + '"] img').getAttribute('src') };
})));

// ---- a turned object keeps its colour too ----
console.log('turned and painted:', JSON.stringify(await page.evaluate(() => {
  const bench = CATALOG.item('bench');
  const land = PropertyState.scene().land;
  let free = null;
  for (let y = 0; y < land.rows && !free; y++) {
    for (let x = 0; x < land.cols && !free; x++) {
      if (PropertyState.canPlace(bench, x, y, null, 1)) free = { x, y };
    }
  }
  const put = PropertyState.buyAt('bench', free.x, free.y, 0, 0, 'red');
  World.select({ kind: 'object', uid: put.uid });
  World.turnSelected();
  const entry = PropertyState.scene().placed.find(one => one.uid === put.uid);
  const img = document.querySelector('.ob[data-uid="' + put.uid + '"] img');
  return { colour: entry.c, quarter: entry.r, drawn: img.getAttribute('src'),
           posed: img.className, bar: document.querySelector('#action-bar .swatch.is-on').dataset.colour };
})));

// ---- a save from version 8 comes across with nothing refunded ----
await page.evaluate(() => {
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 8, coins: 800, tiers: [1, 2, 3], stamps: 4, nextUid: 4, owned: ['home'],
    current: 'outside', placed: { outside: [{ uid: 1, id: 'bed', x: 28, y: 18 }, { uid: 2, id: 'mailbox', x: 34, y: 26 }] }
  }));
});
await page.reload();
await page.waitForTimeout(800);
console.log('carried over to version 9:', JSON.stringify(await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('reward-property-v1'));
  return { version: saved.version, coins: REWARD.coins(), stamps: REWARD.stamps(),
           refunded: PropertyState.mendedCoins(),
           placed: PropertyState.scene().placed.map(e => e.id + '/' + (e.c || 'plain')) };
})));

// ---- a colour an object does not come in falls back to its own ----
await page.evaluate(() => {
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 9, coins: 800, tiers: [1], stamps: 0, nextUid: 3, owned: ['home'],
    current: 'outside', placed: { outside: [{ uid: 1, id: 'mailbox', x: 34, y: 26, c: 'chartreuse' }] }
  }));
});
await page.reload();
await page.waitForTimeout(800);
console.log('a colour that is not one:', JSON.stringify(await page.evaluate(() => ({
  drawn: document.querySelector('.ob[data-uid="1"] img').getAttribute('src'),
  kept: PropertyState.scene().placed.length
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
