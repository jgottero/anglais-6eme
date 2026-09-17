/* Staying in the exercise while the property is listening.

   The property is a frame of its own, kept loaded once it has been
   opened. It is told the rank and the days stamped, and answers with the
   purse. The menu shows that purse, so it is redrawn when it changes —
   and it was redrawn whatever the pupil happened to be doing. Every
   answer earns points, every point is sent to the property, and the
   property answers: so from the moment a pupil had once opened their
   property, each answer threw them back to the list of lessons.

   This suite holds the two ends of it: an exercise is never interrupted
   by the purse, and the menu still shows it the moment it changes. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
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

// Where the pupil is standing, in one word.
const where = () => page.evaluate(() => ({
  showing,
  onTheMenu: !!document.querySelector('[data-lesson]'),
  inTheRound: !!document.getElementById('track'),
  index: state.index
}));

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- the CE2, whose sums are answered in writing ----
await makeProfile('Camille', 'ce2');

/* The property is opened once and left; it stays loaded in its frame,
   which is what put the pupil at the mercy of it. */
await page.click('#open-property');
await page.waitForTimeout(2200);
await page.evaluate(() => closeProperty());
await page.waitForTimeout(500);
console.log('the property has been opened once:', JSON.stringify({
  ...(await where()),
  frameStillLoaded: await page.evaluate(() => !!document.querySelector('#property iframe'))
}));

await page.click('[data-lesson="doubles"]');
await page.waitForTimeout(500);
console.log('at the first sum:', JSON.stringify(await where()));

/* Three sums in a row, answered the way a child answers them: type, and
   press the key that says Valider. */
for (let n = 0; n < 3; n++) {
  const answer = await page.evaluate(() => String(state.round[state.index].word.answer));
  await page.fill('#typed', answer);
  await page.press('#typed', 'Enter');
  await page.waitForTimeout(400);
  const after = await where();
  console.log('  sum ' + (n + 1) + ' answered:', JSON.stringify(after));
  if (!after.inTheRound) break;
  await page.click('#next');
  await page.waitForTimeout(400);
}
await page.screenshot({ path: SHOTS + 'v43-ce2-round.png' });

// ---- and the sixième, whose words are answered by choosing ----
await page.click('#back');
await page.waitForTimeout(300);
await page.click('[data-switch]');
await page.waitForTimeout(300);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');
await page.click('#open-property');
await page.waitForTimeout(2200);
await page.evaluate(() => closeProperty());
await page.waitForTimeout(500);
await page.click('[data-lesson]');
await page.waitForTimeout(500);
console.log('the sixième, at the first word:', JSON.stringify(await where()));
for (let n = 0; n < 3; n++) {
  await page.click('#options .option');
  await page.waitForTimeout(400);
  const after = await where();
  console.log('  word ' + (n + 1) + ' answered:', JSON.stringify(after));
  if (!after.inTheRound) break;
  await page.click('#next');
  await page.waitForTimeout(400);
}

// ---- the menu still hears the purse ----
/* The whole point of the redraw: the coins earned in the property show
   on the menu without the pupil having to do anything. */
await page.click('#back');
await page.waitForTimeout(400);
console.log('the purse on the menu:', JSON.stringify(await page.evaluate(async () => {
  const read = () => {
    const line = document.querySelector('.purse');
    return line ? line.textContent.trim() : null;
  };
  const before = read();
  window.postMessage({ type: 'reward:state', coins: 4321, level: 3, stamps: 1 }, '*');
  await new Promise(done => setTimeout(done, 300));
  return { before, after: read(), redrawn: before !== read() };
})));

/* And a purse arriving in the middle of a round leaves the round alone. */
await page.click('[data-lesson]');
await page.waitForTimeout(500);
console.log('a purse arriving mid-round:', JSON.stringify(await page.evaluate(async () => {
  const was = { showing, index: state.index };
  window.postMessage({ type: 'reward:state', coins: 9999, level: 3, stamps: 1 }, '*');
  await new Promise(done => setTimeout(done, 300));
  return {
    stillInTheRound: showing === 'round' && was.showing === 'round',
    trackKept: !!document.getElementById('track'),
    purseWritten: (progress.reward || {}).coins === 9999
  };
})));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
