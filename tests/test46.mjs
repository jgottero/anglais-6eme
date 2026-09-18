/* The page at the end of a round.

   Two things were wrong with it, and they had the same shape: it was
   asking the wrong thing.

   The score was counted by each mode for itself, and two of the four
   never counted at all — a faultless round of sums, or of dictation,
   ended on "0 / 10" with "reprends les calculs tranquillement" under it.
   The round now keeps the outcome of each of its questions in one
   place, and the score is read from there.

   "À retravailler" listed every question whose word had not reached
   level three, which on a first round is all of them: a child who
   answered everything right was shown the whole series as work to do
   again. It now lists what was actually missed, and nothing else.

   The dictation mode is driven here; the speaking mode is not, because
   it wants a microphone. It settles through the same two lines. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
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

/* One round, answered right everywhere but on the questions named, and
   the page it ends on. `wrong` is a list of positions in the round. */
const around = (mode, lesson, wrong) => page.evaluate(async ask => {
  renderMenu();
  state.mode = ask.mode;
  renderMenu();
  document.querySelector('[data-lesson="' + ask.lesson + '"]').click();
  await new Promise(done => setTimeout(done, 80));

  const asked = [];
  const many = state.round.length;
  for (let n = 0; n < many; n++) {
    const question = state.round[state.index];
    const miss = ask.wrong.indexOf(n) !== -1;
    asked.push({ fr: question.word.fr, en: question.word.en[0], miss });
    if (ask.mode === 'maths' || ask.mode === 'spell') {
      const form = document.getElementById(ask.mode === 'maths' ? 'sumForm' : 'spellForm');
      const typed = document.getElementById('typed');
      const right = ask.mode === 'maths' ? String(question.word.answer) : question.word.en[0];
      typed.value = miss ? 'zzz999' : right;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(done => setTimeout(done, 40));
      // A mistake asks for the answer in writing before letting one on.
      if (miss) {
        typed.value = right;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise(done => setTimeout(done, 40));
      }
    } else {
      const buttons = Array.from(document.querySelectorAll('#options .option'));
      const right = buttons.find(b => b.querySelector('.word').textContent === question.answer);
      (miss ? buttons.find(b => b !== right) : right).click();
      await new Promise(done => setTimeout(done, 40));
    }
    document.getElementById('next').click();
    await new Promise(done => setTimeout(done, 40));
  }

  const listed = Array.from(document.querySelectorAll('.summary li')).map(one => ({
    lead: one.firstChild.textContent.trim(),
    after: (one.querySelector('.fr') || { textContent: '' }).textContent.replace(/^—\s*/, '').trim()
  }));
  const labels = Array.from(document.querySelectorAll('.card .label')).map(one => one.textContent);
  return {
    many,
    score: document.querySelector('.score-line').textContent,
    said: document.querySelector('.score-line').nextElementSibling.textContent,
    roundPoints: state.roundPoints,
    heading: labels.find(text => /retravailler/.test(text)) || null,
    listed,
    missed: asked.filter(one => one.miss),
    right: asked.filter(one => !one.miss)
  };
}, { mode, lesson, wrong });

// What the page must say, given what was answered.
function judge(what, round) {
  const wrong = [];
  const want = (round.many - round.missed.length) + ' / ' + round.many;
  if (round.score !== want) wrong.push(what + ': the score reads ' + round.score + ' rather than ' + want);
  if (!/\+\d+ points/.test(round.said) || / \+0 points/.test(round.said)) {
    wrong.push(what + ': the points read "' + round.said + '"');
  }
  /* A line names a question whichever way round it is written, so both
     orders are tried — and whole, never as a piece of a longer one:
     "3 × 1" sits inside "3 × 10". */
  const listed = round.listed.map(one => one.lead + ' / ' + one.after);
  const names = one => [one.fr + ' / ' + one.en, one.en + ' / ' + one.fr];
  if (round.listed.length !== round.missed.length) {
    wrong.push(what + ': ' + round.listed.length + ' listed to work on again for ' +
      round.missed.length + ' missed — ' + JSON.stringify(listed));
  }
  round.right.forEach(one => {
    if (names(one).some(line => listed.indexOf(line) !== -1)) {
      wrong.push(what + ': "' + one.fr + '" was answered rightly and is listed to work on again');
    }
  });
  round.missed.forEach(one => {
    if (!names(one).some(line => listed.indexOf(line) !== -1)) {
      wrong.push(what + ': "' + one.fr + '" was missed and is not listed to work on again');
    }
  });
  return wrong;
}

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- the CE2, whose sums are written ----
await makeProfile('Camille', 'ce2');
for (const lesson of ['times3', 'doubles']) {
  const round = await around('maths', lesson, [1, 4]);
  console.log('maths / ' + lesson.padEnd(7) + ':', JSON.stringify({
    score: round.score, said: round.said, listed: round.listed,
    missed: round.missed.map(one => one.fr)
  }));
  errors.push(...judge('maths / ' + lesson, round));
}
await page.screenshot({ path: SHOTS + 'v46-maths.png', fullPage: true });

/* A faultless round says so, rather than handing back the series. */
const clean = await around('maths', 'times2', []);
console.log('a faultless round     :', JSON.stringify({
  score: clean.score, listed: clean.listed.length, heading: clean.heading
}));
if (clean.listed.length) errors.push('a faultless round still lists ' + clean.listed.length + ' to work on again');
if (!clean.heading || !/Rien à retravailler/.test(clean.heading)) {
  errors.push('a faultless round does not say there is nothing to work on again: ' + clean.heading);
}
/* And a sum leads with its question: an answer on its own says nothing
   about what has to be remembered. */
const sum = await around('maths', 'times4', [0]);
if (!/^\d+ × \d+$/.test(sum.listed[0].lead)) {
  errors.push('a sum is listed as "' + sum.listed[0].lead + ' — ' + sum.listed[0].after + '"');
}
console.log('a sum leads with its question:', JSON.stringify(sum.listed[0]));

// ---- and the sixième, in its three written modes ----
// A round ends on its score; the profiles are reached from the menu.
await page.evaluate(() => renderMenu());
await page.waitForTimeout(300);
await page.click('[data-switch]');
await page.waitForTimeout(300);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');
for (const mode of ['mcq', 'mcqfr', 'spell']) {
  const round = await around(mode, 'greetings', [1, 3]);
  console.log((mode + '           ').slice(0, 15) + ':', JSON.stringify({
    score: round.score, said: round.said, listed: round.listed,
    missed: round.missed.map(one => one.fr)
  }));
  errors.push(...judge(mode, round));
}
/* An English word leads with the English, which is what is learnt. */
const word = await around('mcq', 'greetings', [0]);
if (word.listed[0] && word.listed[0].lead === word.listed[0].after) {
  errors.push('a word is listed twice over: ' + JSON.stringify(word.listed[0]));
}
console.log('a word leads with the English:', JSON.stringify(word.listed[0]));
await page.screenshot({ path: SHOTS + 'v46-words.png', fullPage: true });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
