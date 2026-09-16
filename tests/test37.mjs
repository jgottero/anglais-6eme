/* Sending a world by link, and looking at someone else's.

   The one that matters most below is not the round trip but what the
   visit leaves behind: a link from somebody else must not cost the
   child a single coin or a single object of their own. */
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

// ---- a world worth sending ----
const sent = await page.evaluate(async () => {
  PropertyState.reset(); REWARD.grantTier(34); REWARD.addCoins(40000);
  let again = true;
  while (again) { again = false; PropertyState.plotsForSale().forEach(p => { if (PropertyState.buyPlot(p.id)) again = true; }); }
  const land = PropertyState.scene().land;
  let put = 0;
  for (let y = 0; y < land.rows && put < 120; y += 3)
    for (let x = 0; x < land.cols && put < 120; x += 3) {
      const id = ['chicken', 'flowers', 'bench', 'apple_tree', 'mailbox'][put % 5];
      const colours = CATALOG.paintsOf(CATALOG.item(id));
      if (PropertyState.buyAt(id, x, y, put % 4, put % 2, colours ? colours[put % colours.length] : undefined)) put++;
    }
  const text = await Share.write(PropertyState.get(), PropertyState.level());
  return {
    objects: put,
    link: Share.address(location.href, text),
    world: PropertyState.scene().placed.map(e => [e.id, e.x, e.y, e.r || 0, e.m || 0, e.c || '-'].join('/')),
    save: localStorage.getItem('reward-property-v1')
  };
});
console.log('a world of', sent.objects, 'objects makes a link of', sent.link.length, 'characters');

// ---- opened cold, it is shown and it is theirs ----
await page.goto(sent.link);
await page.reload();
await page.waitForTimeout(900);
const visit = await page.evaluate(() => ({
  visiting: PropertyState.visiting(),
  banner: document.getElementById('visiting').hidden ? null : document.getElementById('visiting-what').textContent,
  world: PropertyState.scene().placed.map(e => [e.id, e.x, e.y, e.r || 0, e.m || 0, e.c || '-'].join('/')),
  drawn: document.querySelectorAll('.ob').length,
  level: PropertyState.level(),
  purseShown: !!document.getElementById('purse').offsetParent,
  shopShown: !!document.querySelector('[data-panel]').offsetParent
}));
console.log('the visit:', JSON.stringify({
  visiting: visit.visiting, banner: visit.banner, drawn: visit.drawn, level: visit.level,
  purseAndShopPutAway: !visit.purseShown && !visit.shopShown
}));
console.log('every object came through unchanged:',
  JSON.stringify(sent.world) === JSON.stringify(visit.world));
await page.screenshot({ path: SHOTS + 'v17-visit.png' });

// ---- and nothing of it can be touched ----
console.log('a visit refuses every change:', JSON.stringify(await page.evaluate(() => {
  const first = PropertyState.scene().placed[0];
  return {
    buy: PropertyState.buyAt('chicken', 40, 40, 0, 0),
    sell: PropertyState.sell(first.uid),
    move: PropertyState.move(first.uid, 41, 41),
    turn: PropertyState.turn(first.uid),
    mirror: PropertyState.mirror(first.uid),
    paint: PropertyState.paint(first.uid, 'blue'),
    plot: PropertyState.buyPlot(PropertyState.plotsForSale()[0] && PropertyState.plotsForSale()[0].id),
    coins: PropertyState.addCoins(500),
    tier: PropertyState.grantTier(99, 1000)
  };
})));

// ---- the bar of an object offers the name, and only the name ----
await page.evaluate(() => World.select({ kind: 'object', uid: PropertyState.scene().placed[0].uid }));
await page.waitForTimeout(300);
console.log('the bar while visiting:', JSON.stringify(await page.evaluate(() => ({
  name: document.querySelector('#action-bar .bar-id b').textContent,
  speaker: document.querySelectorAll('#action-bar .say-btn').length,
  sell: document.querySelectorAll('#action-bar .sell-btn').length,
  pose: document.querySelectorAll('#action-bar .turn-btn').length,
  pots: document.querySelectorAll('#action-bar .swatch').length
}))));

/* The shop stays shut. The button is taken off the screen, so the
   press has to be sent by hand to reach the guard behind it. */
await page.evaluate(() => {
  World.clearSelection();
  document.querySelector('[data-panel]').click();
});
await page.waitForTimeout(400);
console.log('the shop while visiting:', JSON.stringify({
  buttonOffScreen: await page.evaluate(() => !document.querySelector('[data-panel]').offsetParent),
  opened: await page.evaluate(() => !document.getElementById('panel-shop').hidden),
  toast: await page.locator('#toast').textContent()
}));

// ---- THE ONE THAT MATTERS: the visitor's own property is untouched ----
console.log('the save on disk is the visitor\'s own, untouched:',
  await page.evaluate(sent => localStorage.getItem('reward-property-v1') === sent, sent.save));

// ---- coming home ----
await page.click('#go-home');
await page.waitForTimeout(600);
console.log('back home:', JSON.stringify(await page.evaluate(() => ({
  visiting: PropertyState.visiting(),
  bannerGone: document.getElementById('visiting').hidden,
  hashGone: location.hash === '',
  purseBack: !!document.getElementById('purse').offsetParent,
  coins: REWARD.coins(),
  canBuyAgain: !!PropertyState.buyAt('chicken', 28, 16, 0, 0)
}))));

// ---- a link followed from the page, without a reload ----
await page.evaluate(link => { location.href = link; }, sent.link);
await page.waitForTimeout(800);
console.log('a link followed from the page:', await page.evaluate(() => PropertyState.visiting()));

// ---- a link a messaging app has mangled changes nothing ----
await page.evaluate(() => { PropertyState.goHome(); });
await page.waitForTimeout(300);
const before = await page.evaluate(() => localStorage.getItem('reward-property-v1'));
await page.goto(SITE + '/reward/index.html#w=this-is-not-a-world');
await page.reload();
await page.waitForTimeout(800);
console.log('a mangled link:', JSON.stringify({
  visiting: await page.evaluate(() => PropertyState.visiting()),
  toast: await page.locator('#toast').textContent(),
  saveUntouched: await page.evaluate(was => localStorage.getItem('reward-property-v1') === was, before)
}));

// ---- an object this version has never heard of is simply left out ----
console.log('an unknown object in a link:', JSON.stringify(await page.evaluate(async () => {
  const made = { owned: ['home'], placed: { outside: [
    { uid: 1, id: 'chicken', x: 28, y: 16 },
    { uid: 2, id: 'a_thing_from_the_future', x: 30, y: 16 }
  ] } };
  const text = await Share.write(made, 5);
  const back = await Share.read(text);
  return { kept: back.placed.outside.map(e => e.id) };
})));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
