import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
// Listen in on the voice.
await page.evaluate(() => {
  window.__said = [];
  const real = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = u => { window.__said.push({ text: u.text, lang: u.lang, rate: u.rate }); try { real(u); } catch (e) {} };
});
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(500);

// The shop leads with English.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
console.log('shop card:', JSON.stringify(await page.evaluate(() => {
  const card = document.querySelector('#shop-grid .card');
  const name = card.querySelector('.name'), sub = card.querySelector('.sub');
  const style = el => { const s = getComputedStyle(el); return { weight: s.fontWeight, style: s.fontStyle, colour: s.color }; };
  return { first: name.textContent, second: sub.textContent, name: style(name), sub: style(sub) };
})));

// The card in hand says both, English first.
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(300);
console.log('card in hand:', JSON.stringify(await page.evaluate(() => ({
  name: document.getElementById('hand-name').textContent,
  sub: document.getElementById('hand-sub').textContent
}))));
const spot = await page.evaluate(() => {
  const world = document.getElementById('world');
  const box = world.getBoundingClientRect();
  const size = 32 * Number(world.style.transform.match(/scale\(([\d.]+)\)/)[1]);
  return { x: box.left + 38.5 * size, y: box.top + 26.5 * size };
});
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(250);
await page.click('#cancel-placing');
await page.screenshot({ path: SHOTS + 'v14-hand.png' });

// The bar of the object: English in bold, French under it, and a 🔊.
const ob = await page.evaluate(() => {
  const r = document.querySelector('.ob').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(ob.x, ob.y);
await page.waitForTimeout(250);
console.log('bar:', JSON.stringify(await page.evaluate(() => {
  const bar = document.getElementById('action-bar');
  return {
    bold: bar.querySelector('.bar-id b').textContent,
    sub: bar.querySelector('.bar-id .sub').textContent,
    subStyle: getComputedStyle(bar.querySelector('.bar-id .sub')).fontStyle,
    buttons: Array.from(bar.querySelectorAll('button')).map(b => b.textContent.trim())
  };
})));
await page.screenshot({ path: SHOTS + 'v14-bar.png' });

await page.click('#action-bar [data-action="say"]');
await page.waitForTimeout(300);
console.log('spoken:', JSON.stringify(await page.evaluate(() => window.__said)));

// A building says its name too.
await page.evaluate(() => World.clearSelection());
const house = await page.evaluate(() => {
  const r = document.querySelector('.blk-house').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(house.x, house.y);
await page.waitForTimeout(250);
console.log('house bar:', JSON.stringify(await page.evaluate(() => {
  const bar = document.getElementById('action-bar');
  return { bold: bar.querySelector('b').textContent, sub: bar.querySelector('.sub').textContent,
           buttons: Array.from(bar.querySelectorAll('button')).map(b => b.textContent.trim()) };
})));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
