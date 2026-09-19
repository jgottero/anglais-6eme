/* The telephone's own back button.

   Pressing back used to walk out of the app altogether, which on a
   telephone is the easiest button to hit by accident. It is wired to
   the screens instead, and goes where the screens nest: out of the
   town, out of an exercise or a report to the menu, out of the menu to
   the list of profiles. The profiles are the bottom: there, back does
   what it always did and leaves.

   Inside the town the module is asked first — the shop closes, then
   the room one is standing in is walked out of — and only a town with
   nothing left to come back from is closed.

   What this suite holds: that each screen goes where it should, that
   the history never grows however long one wanders, and that the
   bottom is really the bottom. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => {
  const text = m.text();
  if (m.type() === 'error' && !/CERT|favicon|fonts\.g|404/.test(text)) errors.push('CONSOLE ' + text);
});

const back = async () => { await page.goBack(); await page.waitForTimeout(450); };
const where = () => page.evaluate(() => ({
  screen: showing,
  town: !document.getElementById('property').hidden,
  // Ours is the only entry that carries a mark: how deep the trap is.
  trapped: !!(history.state && history.state.app),
  entries: history.length
}));
const makeProfile = async (name, grade) => {
  await page.fill('#profile-name', name);
  await page.click('[data-grade="' + grade + '"]');
  await page.click('[data-make]');
  await page.waitForTimeout(700);
};

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- the very first screen, with nobody on the telephone yet ----
const first = await where();
console.log('the welcome screen:', JSON.stringify(first));
if (first.trapped) errors.push('the first screen of all holds the back button');

await makeProfile('Camille', 'ce2');
const started = await where();
console.log('once a profile is made:', JSON.stringify(started));
if (!started.trapped) errors.push('the menu lets the back button walk out of the app');

// A second profile, so that the chooser is a screen of its own.
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');

// ---- screen by screen ----
const walk = [];
const step = async (name, go) => {
  await go();
  await page.waitForTimeout(400);
  const from = await where();
  await back();
  const to = await where();
  walk.push(name + ': ' + from.screen + ' -> ' + to.screen + ' (' + to.entries + ' entries)');
  return to;
};

const outOfRound = await step('an exercise', () => page.click('[data-lesson]'));
if (outOfRound.screen !== 'menu') errors.push('back out of an exercise lands on ' + outOfRound.screen);
const outOfReport = await step('the report', () => page.click('#report'));
if (outOfReport.screen !== 'menu') errors.push('back out of the report lands on ' + outOfReport.screen);
const outOfStamps = await step('the stamp book', () => page.click('#stamps'));
if (outOfStamps.screen !== 'menu') errors.push('back out of the stamp book lands on ' + outOfStamps.screen);
const outOfMenu = await step('the menu', async () => {});
if (outOfMenu.screen !== 'profiles') errors.push('back out of the menu lands on ' + outOfMenu.screen);
console.log('where each screen goes:\n  ' + walk.join('\n  '));

// ---- the bottom is the bottom ----
console.log('at the list of profiles:', JSON.stringify(outOfMenu));
if (outOfMenu.trapped) errors.push('the list of profiles still holds the back button');

// ---- the new-profile screen sits on the chooser ----
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
const making = await where();
await back();
const backToChooser = await where();
console.log('making a profile:', JSON.stringify(making), '-> back ->', JSON.stringify(backToChooser));
if (making.screen !== 'newProfile') errors.push('the new-profile screen calls itself ' + making.screen);
if (backToChooser.screen !== 'profiles') errors.push('back out of a new profile lands on ' + backToChooser.screen);
if (!await page.$('[data-profile]')) errors.push('back out of a new profile lost the chooser');

// ---- the history never grows ----
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
const before = (await where()).entries;
for (let round = 0; round < 4; round += 1) {
  await page.click('[data-lesson]');
  await page.waitForTimeout(400);
  await page.click('#wayout');
  await page.waitForTimeout(300);
  await page.click('#report');
  await page.waitForTimeout(300);
  await back();
}
const after = await where();
console.log('after wandering about:', before, '->', after.entries, 'entries, on the', after.screen);
if (after.entries > before) errors.push('the history grew from ' + before + ' to ' + after.entries);

/* Reloading the page leaves our entry standing: it is taken up again
   rather than covered with a second one. */
await page.reload();
await page.waitForTimeout(700);
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
const reloaded = await where();
await back();
const afterReload = await where();
console.log('after a reload:', JSON.stringify(reloaded), '-> back ->', JSON.stringify(afterReload));
if (reloaded.entries > after.entries) {
  errors.push('a reload stacked an entry: ' + after.entries + ' -> ' + reloaded.entries);
}
if (afterReload.screen !== 'profiles') errors.push('after a reload, back lands on ' + afterReload.screen);
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);

// ---- the town, and the rooms inside it ----
await page.click('#open-property');
await page.waitForTimeout(1500);
const town = await where();
console.log('the town, open:', JSON.stringify(town));
if (!town.town) errors.push('the town did not open');
await back();
const shut = await where();
console.log('back out of the town:', JSON.stringify(shut));
if (shut.town) errors.push('back left the town open');
if (shut.screen !== 'menu') errors.push('back out of the town lands on ' + shut.screen);
if (!shut.trapped) errors.push('back out of the town let go of the back button');

/* Inside: the shop first, then the room, then the town. Each press
   does exactly one of the three. */
await page.click('#open-property');
await page.waitForTimeout(1500);
const town_ = page.frames().find(f => /reward/.test(f.url()));
await town_.evaluate(() => {
  REWARD.grantTier(100);
  let again = true;
  while (again) { again = false; PropertyState.plotsForSale().forEach(p => { if (PropertyState.buyPlot(p.id)) again = true; }); }
  PropertyState.enter('house');
});
await page.waitForTimeout(600);
await town_.click('[data-panel="shop"]');
await page.waitForTimeout(600);
const inside = () => town_.evaluate(() => ({
  room: PropertyState.sceneId(),
  shop: !document.getElementById('panel-shop').hidden
}));
const deep = [];
deep.push('standing in: ' + JSON.stringify(await inside()));
await back();
deep.push('one press:   ' + JSON.stringify(await inside()));
const afterShop = await inside();
if (afterShop.shop) errors.push('the first press did not close the shop');
if (afterShop.room !== 'house') errors.push('the first press walked out of the room as well');
await back();
deep.push('two presses: ' + JSON.stringify(await inside()) + ' ' + JSON.stringify(await where()));
const afterRoom = await inside();
if (afterRoom.room === 'house') errors.push('the second press did not leave the room');
if (!(await where()).town) errors.push('the second press closed the town as well');
await back();
const afterTown = await where();
deep.push('three:       ' + JSON.stringify(afterTown));
console.log('walking out of the town:\n  ' + deep.join('\n  '));
if (afterTown.town) errors.push('the third press left the town open');
if (afterTown.screen !== 'menu') errors.push('the third press landed on ' + afterTown.screen);
await page.screenshot({ path: SHOTS + 'v50-back-home.png', fullPage: true });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
