/* The report, and the grown-up who reads it.

   A child's report is meant to be run an eye down: one line per
   question — the English word, or the sum as it is asked — and the five
   dots beside it. No answer, no tally, no date, no rule between the
   lines, and no level: the level is on the main page, and saying it
   twice helps nobody.

   A parent is a profile like any other, except that they have no
   exercises, no daily goal and no town. What they have is the
   children's books, and there the tally and the date are kept — those
   are the questions a parent actually asks.

   And the way out of a screen no longer changes its mind about what it
   is. It says where it goes and stays in the corner; handing the
   telephone to somebody else is done by pressing the name. */
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
// Handing the telephone over is done by pressing the name, from anywhere.
const handOver = async () => {
  await page.click('[data-switch]');
  await page.waitForTimeout(400);
};
const corner = () => page.evaluate(() => {
  const out = document.getElementById('wayout');
  return out.hidden ? null : out.textContent;
});

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- what a grown-up may be ----
console.log('who a profile can be:', JSON.stringify(await page.evaluate(() => ({
  offered: PROFILES.GRADES.map(one => one.id),
  grown: PROFILES.GRADES.filter(one => PROFILES.grown(one.id)).map(one => one.id),
  // An unknown year is a pupil, never a grown-up: a save from before
  // parents existed must not turn its child into one.
  unknown: PROFILES.gradeOf('zzz').id,
  unknownIsGrown: PROFILES.grown('zzz')
}))));
if (await page.evaluate(() => PROFILES.grown('zzz'))) {
  errors.push('an unknown school year is taken for a grown-up');
}

// ---- a child's own report ----
await makeProfile('Camille', 'ce2');
await page.evaluate(() => {
  progress.points = 300;
  MATHS.byId('times3').items.slice(0, 6).forEach((one, n) => {
    progress.words[one.key] = { level: n, seen: n + 2, ok: n + 1, last: Date.now() - n * 86400000 };
  });
  Store.save(progress);
  renderMenu();
});
await page.waitForTimeout(300);
await page.click('#report');
await page.waitForTimeout(500);
const plain = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.report li'));
  const first = rows[0];
  return {
    rows: rows.length,
    lines: rows.slice(0, 3).map(one => one.textContent.replace(/\s+/g, ' ').trim()),
    asks: first.querySelector('.en').textContent,
    // What the row must not carry any more.
    answerShown: !!first.querySelector('.fr'),
    tallyShown: !!first.querySelector('.meta'),
    ruled: getComputedStyle(first).borderBottomWidth !== '0px',
    // The level belongs to the main page.
    levelOnThePage: /sur 100/.test(document.body.textContent),
    dots: !!first.querySelector('.dots')
  };
});
console.log('a child reading their own report:', JSON.stringify(plain));
if (plain.answerShown) errors.push('the report gives the answer away');
if (plain.tallyShown) errors.push('the report still counts the right answers');
if (plain.ruled) errors.push('the report still rules a line between the questions');
if (plain.levelOnThePage) errors.push('the report says the level over again');
if (!plain.dots) errors.push('the report lost the dots, which are the whole point');
if (!/^\d+ × \d+$|^Le double de/.test(plain.asks)) {
  errors.push('a sum is written "' + plain.asks + '"');
}
await page.screenshot({ path: SHOTS + 'v48-child-report.png', fullPage: true });

/* The sixième's report asks with the English word, which is the thing
   being learnt. */
await handOver();
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');
await page.click('#report');
await page.waitForTimeout(500);
console.log('the sixième report:', JSON.stringify(await page.evaluate(() => {
  const first = document.querySelector('.report li');
  return {
    asks: first.querySelector('.en').textContent,
    isEnglish: LESSONS[0].words.some(w => w.en.indexOf(first.querySelector('.en').textContent) !== -1),
    nothingElse: first.textContent.replace(/\s+/g, ' ').trim()
  };
})));

// ---- the grown-up ----
await handOver();
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Papa', 'parent');
const grown = await page.evaluate(() => ({
  children: Array.from(document.querySelectorAll('[data-book]')).map(b => b.dataset.book),
  named: Array.from(document.querySelectorAll('[data-book] .who-name')).map(b => b.textContent.replace(/\s+/g, ' ')),
  noGoal: !document.getElementById('daily'),
  noTown: !document.getElementById('open-property'),
  noLessons: !document.querySelector('[data-lesson]'),
  noStamps: !document.getElementById('stamps')
}));
console.log('the grown-up menu:', JSON.stringify(grown));
if (grown.children.length !== 2) errors.push('the parent sees ' + grown.children.length + ' children of two');
['noGoal', 'noTown', 'noLessons', 'noStamps'].forEach(what => {
  if (!grown[what]) errors.push('the parent is offered what is not theirs: ' + what);
});
await page.screenshot({ path: SHOTS + 'v48-parent.png', fullPage: true });

await page.click('[data-book]');
await page.waitForTimeout(500);
const reading = await page.evaluate(() => {
  const first = document.querySelector('.report li');
  return {
    corner: document.getElementById('wayout').textContent,
    tally: (first.querySelector('.meta') || {}).textContent || null,
    asks: first.querySelector('.en').textContent,
    // Reading a child's book leaves the child's own save alone.
    stillTheParent: PROFILE.grade,
    hisOwnBookUntouched: Object.keys(progress.words).length
  };
});
console.log('a parent reading a book:', JSON.stringify(reading));
if (!reading.tally) errors.push('the parent report lost the tally and the date');
if (reading.stillTheParent !== 'parent') errors.push('reading a book took the parent over');
if (reading.hisOwnBookUntouched !== 0) errors.push("the child's work landed in the parent's own book");
await page.screenshot({ path: SHOTS + 'v48-parent-report.png', fullPage: true });

/* The child's own save is exactly as it was. */
await page.click('#wayout');
await page.waitForTimeout(300);
await handOver();
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
console.log('and the child, untouched:', JSON.stringify(await page.evaluate(() => ({
  who: PROFILE.name, points: progress.points, words: Object.keys(progress.words).length
}))));

// ---- the corner says where it goes, and never changes its mind ----
const corners = {};
corners.menu = await corner();
await page.click('[data-lesson="times3"]');
await page.waitForTimeout(500);
corners.round = await corner();
await page.click('#wayout');
await page.waitForTimeout(400);
await page.click('#report');
await page.waitForTimeout(400);
corners.report = await corner();
await page.click('#wayout');
await page.waitForTimeout(400);
await page.click('#stamps');
await page.waitForTimeout(400);
corners.stamps = await corner();
await page.click('#wayout');
await page.waitForTimeout(400);
corners.backHome = await corner();
console.log('the corner, screen by screen:', JSON.stringify(corners));
if (corners.menu !== null) errors.push('the menu offers a way out of itself: ' + corners.menu);
if (corners.round !== "Changer d'exercice") errors.push('a round says "' + corners.round + '"');
if (corners.report !== 'Retour' || corners.stamps !== 'Retour') {
  errors.push('the report and the stamp book say "' + corners.report + '" and "' + corners.stamps + '"');
}
if (corners.backHome !== null) errors.push('the corner is still there on the menu');
/* And nowhere does it offer to change profile: that is the name's job. */
console.log('changing profile is the name:', JSON.stringify(await page.evaluate(() => ({
  onTheTitle: !!document.querySelector('#heading [data-switch]'),
  inTheCorner: document.getElementById('wayout').hasAttribute('data-switch'),
  saidOnce: document.querySelectorAll('[data-switch]').length
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
