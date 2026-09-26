/* The grown-up's hand on a child's level and purse.

   From the parent's menu, behind a word written in the source, a
   screen where a child is picked and given a level up or a hundred
   coins. The word is asked once, and again when the telephone changes
   hands. A level is the points of the next one; the coins go into the
   town's own save, even a town never visited — and the town, once
   opened, pays for the level as if it had been earned. */
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

const makeProfile = async (name, grade) => {
  await page.fill('#profile-name', name);
  await page.click('[data-grade="' + grade + '"]');
  await page.click('[data-make]');
  await page.waitForTimeout(700);
};
const handOver = async () => {
  await page.click('[data-switch]');
  await page.waitForTimeout(400);
};
const tweakScreen = () => page.evaluate(() => ({
  asksTheWord: !!document.getElementById('tweak-word'),
  children: Array.from(document.querySelectorAll('[data-tweak-who]')).map(b => b.dataset.tweakWho),
  chosen: (document.querySelector('[data-tweak-who][aria-pressed="true"]') || {}).dataset?.tweakWho || null,
  card: (document.querySelector('.card.rank') || {}).textContent?.replace(/\s+/g, ' ').trim() || null,
  notice: (document.querySelector('.notice') || {}).textContent || null,
  corner: document.getElementById('wayout').hidden ? null : document.getElementById('wayout').textContent
}));

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

await makeProfile('Léa', '6eme');
await handOver();
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', 'ce2');
await handOver();
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Papa', 'parent');

// ---- the word ----
const offered = await page.evaluate(() => !!document.getElementById('tweak'));
console.log('the parent is offered the screen:', offered);
if (!offered) errors.push('the parent menu has no way to the screen');
await page.click('#tweak');
await page.waitForTimeout(300);
const locked = await tweakScreen();
console.log('before the word:', JSON.stringify(locked));
if (!locked.asksTheWord || locked.children.length) errors.push('the screen opens without the word');
if (locked.corner !== 'Retour') errors.push('the corner says "' + locked.corner + '"');

await page.fill('#tweak-word', 'lapin');
await page.click('[data-tweak-enter]');
await page.waitForTimeout(300);
const wrong = await tweakScreen();
console.log('a wrong word:', JSON.stringify(wrong));
if (!wrong.asksTheWord || wrong.children.length || !wrong.notice) errors.push('a wrong word lets one in');

await page.fill('#tweak-word', 'girafe');
await page.press('#tweak-word', 'Enter');
await page.waitForTimeout(300);
const open = await tweakScreen();
console.log('the right word:', JSON.stringify(open));
if (open.asksTheWord) errors.push('the right word is refused');
if (open.children.join() !== 'p1,p2') errors.push('the children offered are ' + open.children.join());
if (open.chosen !== 'p1') errors.push('nobody is picked to start with');
if (!/Niveau 1 sur 100/.test(open.card) || !/150 pièces/.test(open.card)) {
  errors.push('the first child reads "' + open.card + '"');
}

// ---- a level up, and a hundred coins ----
await page.click('[data-level-up]');
await page.waitForTimeout(300);
await page.click('[data-level-up]');
await page.waitForTimeout(300);
await page.click('[data-coins]');
await page.waitForTimeout(300);
const given = await page.evaluate(() => ({
  screen: document.querySelector('.card.rank').textContent.replace(/\s+/g, ' ').trim(),
  points: JSON.parse(localStorage.getItem('anglais-progress-v1:p1')).points,
  bookPurse: JSON.parse(localStorage.getItem('anglais-progress-v1:p1')).reward.coins,
  town: JSON.parse(localStorage.getItem('reward-property-v1:p1')),
  third: RANKS.THRESHOLDS[2],
  // The one holding the telephone is still the parent, and untouched.
  still: PROFILE.grade,
  parentPoints: progress.points,
  otherChild: localStorage.getItem('reward-property-v1:p2')
}));
console.log('after two levels and a hundred coins:', JSON.stringify(given));
if (given.points !== given.third) errors.push('two levels up gave ' + given.points + ' points');
if (!/Niveau 3 sur 100/.test(given.screen)) errors.push('the screen reads "' + given.screen + '"');
if (!given.town || given.town.coins !== 250) errors.push('the town holds ' + JSON.stringify(given.town));
if (given.bookPurse !== 250) errors.push("the book's copy of the purse says " + given.bookPurse);
if (given.still !== 'parent' || given.parentPoints) errors.push('the parent was taken over');
if (given.otherChild !== null) errors.push('the other child was given something too');
await page.screenshot({ path: SHOTS + 'v55-tweak.png', fullPage: true });

// Picking the other child, and back to the parent's menu: the word holds.
await page.click('[data-tweak-who="p2"]');
await page.waitForTimeout(300);
const other = await tweakScreen();
console.log('the other child:', JSON.stringify(other));
if (other.chosen !== 'p2' || !/Noé — Niveau 1/.test(other.card)) errors.push('picking the other child fails');
await page.click('#wayout');
await page.waitForTimeout(300);
await page.click('#tweak');
await page.waitForTimeout(300);
if ((await tweakScreen()).asksTheWord) errors.push('the word is asked again within one visit');

// ---- the child, and the town ----
await handOver();
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
const menu = await page.evaluate(() => document.querySelector('.card.rank').textContent.replace(/\s+/g, ' '));
console.log("the child's menu:", menu.trim());
if (!/Niveau 3 sur 100/.test(menu) || !/250 pièces/.test(menu)) errors.push('the child menu reads "' + menu + '"');
await page.click('#open-property');
await page.waitForTimeout(2500);
const town = await page.evaluate(() => {
  const reward = propertyFrame.contentWindow.REWARD;
  return {
    coins: reward.coins(),
    level: reward.level(),
    owed: reward.rewardForTier(1) + reward.rewardForTier(2) + reward.rewardForTier(3)
  };
});
console.log('the town:', JSON.stringify(town));
if (town.level !== 3) errors.push('the town is at level ' + town.level);
if (town.coins !== 250 + town.owed) errors.push('the town holds ' + town.coins + ', not 250 + ' + town.owed);

// ---- the word again, once the telephone has changed hands ----
await page.evaluate(() => closeProperty());
await page.waitForTimeout(300);
await handOver();
await page.click('[data-profile="p3"]');
await page.waitForTimeout(700);
await page.click('#tweak');
await page.waitForTimeout(300);
if (!(await tweakScreen()).asksTheWord) errors.push('the word is not asked again after a hand-over');

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
