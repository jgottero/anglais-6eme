/* Turning a terrain, and showing it on the ground it belongs to.

   A terrain is a tile laid on the soil, and most of them are drawn with
   a grain: the furrows of a field, the planks of a decking, the courses
   of a brick path. Those now take a quarter turn like anything else.
   Those whose drawing is the same either way do not, on purpose — a
   button that changes nothing is worse than no button.

   This suite settles which is which by looking at the drawings rather
   than by taking anyone's word for it, checks that the stepping stones
   were freed of their patch of lawn, and that the shop shelves take the
   ground of the place they are opened in. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);

/* How much of a tile changes when it is given a quarter turn, drawn and
   read back pixel by pixel. A tile that is not square changes shape, so
   the question does not arise. */
const grain = await page.evaluate(async () => {
  const draw = async (item, turn) => {
    const img = new Image();
    img.src = 'assets/items/' + item.asset;
    await new Promise(done => { img.onload = done; img.onerror = done; });
    const W = item.w * 16, H = item.h * 16;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (turn) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -W / 2, -H / 2, W, H);
    } else {
      ctx.drawImage(img, 0, 0, W, H);
    }
    return ctx.getImageData(0, 0, W, H).data;
  };
  const out = [];
  for (const item of CATALOG.ITEMS.filter(one => CATALOG.layerOf(one) === 'ground')) {
    if (item.w !== item.h) { out.push({ id: item.id, turns: !!item.turns, changed: 100 }); continue; }
    const flat = await draw(item, 0), turned = await draw(item, 1);
    let differ = 0;
    for (let at = 0; at < flat.length; at += 4) {
      const far = Math.abs(flat[at] - turned[at]) + Math.abs(flat[at + 1] - turned[at + 1]) +
                  Math.abs(flat[at + 2] - turned[at + 2]) + Math.abs(flat[at + 3] - turned[at + 3]);
      if (far > 24) differ++;
    }
    out.push({ id: item.id, turns: !!item.turns, changed: Math.round((400 * differ) / flat.length) });
  }
  return out;
});
console.log('what a quarter turn changes, terrain by terrain:');
grain.forEach(one => console.log('   ' + (one.turns ? '↻ ' : '  ') + one.id.padEnd(16) + one.changed + '%'));

/* The rule the catalogue follows, and the reason the button is offered
   on some terrains and not on others: a terrain turns when a quarter
   turn changes at least a fifth of its drawing. The measurements fall
   well either side of that line — nothing lands between 13% and 24% —
   so the line is not a close call anywhere. */
console.log('and the rule it follows:', JSON.stringify((() => {
  const wrong = grain.filter(one => one.turns ? one.changed < 20 : one.changed >= 20)
    .map(one => one.id + ': ' + one.changed + '% but ' + (one.turns ? 'turns' : 'does not turn'));
  const near = grain.filter(one => one.changed > 13 && one.changed < 24).map(one => one.id);
  return wrong.length ? wrong
    : 'every terrain that turns is one a turn changes' + (near.length ? ', but ' + near.join(', ') + ' now sit near the line' : '');
})()));

// ---- the stepping stones stand on nothing ----
/* Their patch of lawn is gone, so they can be laid on sand or snow and
   still look like stones lying on it. */
console.log('the stepping stones:', JSON.stringify(await page.evaluate(async () => {
  const img = new Image();
  img.src = 'assets/items/' + CATALOG.item('stepping').asset;
  await new Promise(done => { img.onload = done; img.onerror = done; });
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 32, 32);
  const data = ctx.getImageData(0, 0, 32, 32).data;
  const alphaAt = (x, y) => data[(y * 32 + x) * 4 + 3];
  let clear = 0, drawn = 0;
  for (let at = 3; at < data.length; at += 4) { if (data[at] < 8) clear++; else if (data[at] > 200) drawn++; }
  return {
    corners: [alphaAt(0, 0), alphaAt(31, 0), alphaAt(0, 31), alphaAt(31, 31)],
    seeThrough: Math.round((100 * clear) / (32 * 32)) + '%',
    stones: Math.round((100 * drawn) / (32 * 32)) + '%'
  };
})));

// ---- a terrain really turns, out on the property ----
console.log('laid out on the property:', JSON.stringify(await page.evaluate(() => {
  PropertyState.reset(); REWARD.grantTier(100); REWARD.addCoins(90000);
  const laid = [];
  ['field', 'decking', 'brick_path', 'veg_patch', 'stepping', 'paving', 'ice_rink', 'picnic_blanket']
    .forEach((id, row) => {
      const step = CATALOG.item(id).w;
      for (let turn = 0; turn < 2; turn++) {
        for (let n = 0; n < 2; n++) {
          if (PropertyState.buyAt(id, 29 + turn * 18 + n * step, 17 + row * 2, turn, 0)) laid.push(id);
        }
      }
    });
  const turned = PropertyState.scene().placed.filter(one => one.r === 1);
  // A turned tile is given its own size, and has to keep the hair of
  // overlap that hides the seam between two of them.
  const wide = turned.map(one => {
    const node = document.querySelector('.ob[data-uid="' + one.uid + '"] img');
    return node ? parseFloat(node.style.width) : null;
  });
  return { laid: laid.length, turned: turned.length, bleeds: wide.every(w => w && w % 32 === 1) };
})));
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'v42-turned.png' });

// ---- the shop takes the ground of the place ----
const shelves = async () => page.evaluate(() => {
  const grid = document.getElementById('shop-grid');
  const art = grid.querySelector('.card-art');
  const paper = art ? getComputedStyle(art).backgroundImage : '';
  return {
    indoor: grid.classList.contains('is-indoor'),
    ground: (paper.match(/ground\/([a-z0-9-]+)\.svg/) || [])[1] || 'none'
  };
});
await page.click('[data-panel="shop"]');
await page.waitForTimeout(500);
console.log('the shelves outside:', JSON.stringify(await shelves()));
await page.screenshot({ path: SHOTS + 'v42-shop-out.png' });
await page.keyboard.press('Escape');
await page.evaluate(() => PropertyState.enter('house'));
await page.waitForTimeout(300);
await page.click('[data-panel="shop"]');
await page.waitForTimeout(500);
console.log('the shelves inside:', JSON.stringify(await shelves()));
await page.click('[data-cat="ground"]');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + 'v42-shop-in.png' });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
