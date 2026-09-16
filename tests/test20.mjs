import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => { if (!r.url().includes('fonts.googleapis')) errors.push('MISSING ' + r.url()); });
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

const corner = () => page.evaluate(() => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const back = document.getElementById('back'), exit = document.getElementById('exit');
  const shop = document.querySelector('[data-panel="shop"]');
  return {
    back: { shown: !back.hidden, icon: back.querySelector('img').getAttribute('src'), box: box(back) },
    exit: { shown: !exit.hidden, icon: exit.querySelector('img').getAttribute('src'), box: box(exit) },
    shop: { text: shop.textContent.trim(), icon: shop.querySelector('img').getAttribute('src'), box: box(shop) }
  };
});

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => REWARD.grantTier(100));   // the tests are about placing, not levels
await page.evaluate(() => { REWARD.addCoins(4000); World.fitCamera(); });
await page.waitForTimeout(600);
const outside = await corner();
console.log('outside:', JSON.stringify(outside));
await page.screenshot({ path: SHOTS + 'v16-outside.png' });

await page.evaluate(() => PropertyState.enter('house'));
await page.waitForTimeout(500);
const inside = await corner();
console.log('inside :', JSON.stringify(inside));
// The one slot, whichever button is in it.
console.log('same size and place:', JSON.stringify(inside.exit.box) === JSON.stringify(outside.back.box));
await page.screenshot({ path: SHOTS + 'v16-inside.png' });

// The corner button really walks out.
await page.click('#exit');
await page.waitForTimeout(500);
console.log('after pressing it:', await page.evaluate(() => PropertyState.sceneId()),
            '| corner now:', JSON.stringify((await corner()).back.shown ? 'back' : 'exit'));

// The shop button opens the shop, and steps aside for the object in hand.
await page.click('[data-panel="shop"]');
await page.waitForTimeout(300);
console.log('shop opens:', await page.locator('#panel-shop').isVisible());
await page.click('[data-pick="chicken"]');
await page.waitForTimeout(300);
console.log('with something in hand -> shop still pressable:', await page.locator('[data-panel=\"shop\"]').isVisible(),
            '| the hand card is at', JSON.stringify(await page.evaluate(() => {
              const r = document.getElementById('hand').getBoundingClientRect();
              return { x: Math.round(r.left), bottom: Math.round(innerHeight - r.bottom) };
            })));
await page.screenshot({ path: SHOTS + 'v16-hand.png' });
await page.click('#cancel-placing');
await page.waitForTimeout(250);
console.log('shop button still there:', await page.locator('[data-panel="shop"]').isVisible());

// On a phone too.
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(400);
await page.evaluate(() => PropertyState.enter('house'));
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'v16-phone.png' });
console.log('phone, inside:', JSON.stringify(await corner()));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
