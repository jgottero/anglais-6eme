import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.waitForTimeout(800);

// --- the price of a plot is never hidden behind a roof ---
const tag = await page.evaluate(() => {
  const plot = document.querySelector('.plot[data-sale="quarter"]');
  const tag = plot.querySelector('.plot-tag');
  const r = tag.getBoundingClientRect();
  const mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const top = document.elementFromPoint(mid.x, mid.y);
  return { text: tag.textContent.trim(), onTop: top && (top.className || top.parentElement.className),
           overABuilding: !!document.elementsFromPoint(mid.x, mid.y).find(el => el.classList && el.classList.contains('blk')) };
});
console.log('the tag of the new quarter:', JSON.stringify(tag));

// Pressing the building of a plot for sale says what the plot costs.
const onBlock = await page.evaluate(() => {
  const blk = Array.from(document.querySelectorAll('.blk-row')).pop();
  const r = blk.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + 10 };
});
await page.mouse.click(onBlock.x, onBlock.y);
await page.waitForTimeout(250);
console.log('pressing its long block ->', JSON.stringify(await page.evaluate(() =>
  document.getElementById('action-bar').textContent.trim().replace(/\s+/g, ' '))));

// --- the way out of a building ---
await page.evaluate(() => { REWARD.addCoins(60000); SCENES.PLOTS.forEach(p => PropertyState.buyPlot(p.id)); });
await page.waitForTimeout(500);

const exitFrom = async (scene) => {
  await page.evaluate(id => PropertyState.enter(id), scene);
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({
    scene: PropertyState.sceneId(),
    exitShown: !document.getElementById('exit').hidden,
    backShown: !document.getElementById('back').hidden
  }));
  await page.click('#exit');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => PropertyState.sceneId());
  return { from: before.scene, exitButton: before.exitShown && !before.backShown, to: after };
};

for (const scene of ['house', 'cabin', 'cottage_west', 'flat_1', 'flat_2', 'flat_3',
                     'tower_a1', 'tower_a2', 'tower_a3', 'tower_b1', 'tower_b2',
                     'loft_1', 'loft_2', 'shed']) {
  const step = await exitFrom(scene);
  console.log('sortir depuis', step.from.padEnd(13), '->', step.to,
              step.to === 'outside' ? '' : '   <<< NOT OUTSIDE');
  if (step.to !== 'outside') errors.push('EXIT FAILED from ' + step.from + ' -> ' + step.to);
  if (!step.exitButton) errors.push('WRONG BUTTON in ' + step.from);
}

// Outside, the corner button is the way back to the exercises.
await page.evaluate(() => PropertyState.enter('outside'));
await page.waitForTimeout(250);
console.log('dehors:', JSON.stringify(await page.evaluate(() => ({
  exitShown: !document.getElementById('exit').hidden,
  backShown: !document.getElementById('back').hidden
}))));

// The way up still works on its own.
await page.evaluate(() => PropertyState.enter('tower_a1'));
await page.waitForTimeout(200);
const up = await page.evaluate(() => {
  const place = PropertyState.scene();
  const i = place.blocks.findIndex(b => SCENES.climbs(b.kind) === 'up');
  World.selectBlock ? World.selectBlock(i) : null;
  return place.blocks[i].to;
});
console.log('the way up from the ground floor leads to:', up);
console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
