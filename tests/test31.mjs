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
page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('MISSING ' + r.url()); });
// The check below asks for farm.js on purpose, so its 404 is not a fault.
page.on('console', m => {
  const text = m.text();
  if (m.type() === 'error' && !text.includes('CERT') && !text.includes('404')) errors.push('CONSOLE ' + text);
});

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);

/* Profiles came along: the app opens by asking who is holding the
   telephone, so somebody has to be there before the menu exists. */
await page.evaluate(() => startAs(PROFILES.create('Test', '6eme').id));
await page.waitForTimeout(400);

console.log('the menu:', JSON.stringify(await page.evaluate(() => ({
  level: document.querySelector('.card.rank .label').textContent,
  property: !!document.getElementById('open-property'),
  farmLink: !!document.getElementById('farm'),
  purse: document.querySelector('.purse') && document.querySelector('.purse').textContent.trim()
}))));

// Earn a few ranks the way the pupil would, then look at the menu again.
await page.evaluate(() => { progress.points = RANKS.THRESHOLDS[11] + 5; Store.save(progress); renderMenu(); });
await page.waitForTimeout(300);
console.log('at rank 12:', JSON.stringify(await page.evaluate(() => ({
  rank: rankOf(progress.points).index,
  card: document.querySelector('.card.rank .rank-up') && document.querySelector('.card.rank .rank-up').textContent,
  said: document.querySelectorAll('.card')[1].textContent.replace(/\s+/g, ' ').slice(0, 90)
}))));

// Open the property: the module loads, is paid for every rank, and answers.
await page.click('#open-property');
await page.waitForTimeout(1800);
const frame = page.frames().find(f => f.url().includes('reward/index.html'));
console.log('the property opened:', JSON.stringify({
  frame: !!frame,
  covered: await page.evaluate(() => !document.getElementById('property').hidden),
  level: frame && await frame.evaluate(() => REWARD.level()),
  coins: frame && await frame.evaluate(() => REWARD.coins()),
  toast: frame && await frame.evaluate(() => document.getElementById('toast').textContent)
}));

// The app hears about the purse.
console.log('the app knows:', JSON.stringify(await page.evaluate(() => progress.reward)));

// The back button of the module closes it and lands back on the menu.
await frame.click('#back');
await page.waitForTimeout(500);
console.log('after the back button:', JSON.stringify(await page.evaluate(() => ({
  hidden: document.getElementById('property').hidden,
  menu: !!document.getElementById('open-property'),
  purse: document.querySelector('.purse') && document.querySelector('.purse').textContent.trim()
}))));

// A new rank pays the next time the property is opened, not twice.
await page.evaluate(() => { progress.points = RANKS.THRESHOLDS[14] + 5; Store.save(progress); renderMenu(); });
await page.waitForTimeout(200);
await page.click('#open-property');
await page.waitForTimeout(900);
console.log('rank 15:', JSON.stringify({
  level: await frame.evaluate(() => REWARD.level()),
  coins: await frame.evaluate(() => REWARD.coins()),
  toast: await frame.evaluate(() => document.getElementById('toast').textContent)
}));
const before = await frame.evaluate(() => REWARD.coins());
await page.evaluate(() => syncProperty());
await page.waitForTimeout(400);
console.log('sending the same rank again changes nothing:',
  before === await frame.evaluate(() => REWARD.coins()));

// The old farm is gone for good.
console.log('farm.js:', await page.evaluate(async () =>
  (await fetch('farm.js')).status), '| FARM defined:', await page.evaluate(() => typeof FARM));

console.log(errors.length ? errors.join('\n') : 'no errors, nothing missing');
await browser.close();
