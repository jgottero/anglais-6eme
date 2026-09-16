import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT') && !m.text().includes('404')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);

// Play a real round of the daily words and end it.
await page.click('#daily');
await page.waitForTimeout(400);
for (let i = 0; i < 40; i++) {
  const done = await page.evaluate(() => !!document.querySelector('.score-line'));
  if (done) break;
  const clicked = await page.evaluate(() => {
    const options = document.getElementById('options');
    if (options && options.children.length) { options.children[0].click(); return 'answer'; }
    const next = document.getElementById('next') || document.querySelector('.actions .primary');
    if (next) { next.click(); return 'next'; }
    const skip = document.querySelector('[id="reveal"], #check, #dontknow');
    if (skip) { skip.click(); return 'skip'; }
    return null;
  });
  if (!clicked) break;
  await page.waitForTimeout(150);
}
console.log('a round played, the summary says:', JSON.stringify(await page.evaluate(() => {
  const el = document.querySelector('.score-line');
  return el ? el.textContent + ' | ' + (document.querySelector('.rank-up') || {}).textContent : 'no summary';
})));

// Force a rank up on the summary and check the button it offers.
await page.evaluate(() => {
  state.rankBefore = 1;
  progress.points = RANKS.THRESHOLDS[7] + 5;
  showScore();
});
await page.waitForTimeout(300);
console.log('with a rank gained:', JSON.stringify(await page.evaluate(() => ({
  rankUp: document.querySelector('.rank-up').textContent,
  said: document.querySelectorAll('.card p')[2].textContent,
  buttons: Array.from(document.querySelectorAll('.actions button')).map(b => b.id + ':' + b.textContent.trim())
}))));
await page.click('#see-property');
await page.waitForTimeout(1600);
const frame = page.frames().find(f => f.url().includes('reward/index.html'));
console.log('from the summary:', JSON.stringify({
  open: await page.evaluate(() => !document.getElementById('property').hidden),
  level: await frame.evaluate(() => REWARD.level()),
  shopAt: await frame.evaluate(() => CATALOG.ITEMS.filter(i => CATALOG.unlocked(i, REWARD.level())).length)
}));
await page.screenshot({ path: SHOTS + 'shot-app-property.png' });
await frame.click('#back');
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'shot-app-menu.png' });
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
