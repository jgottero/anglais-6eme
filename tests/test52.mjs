/* The CE2's English numbers.

   The younger one learns the same numbers as their brother, but only to
   fifteen and only two ways: a number is read out and the answer is the
   figure, or the French word is written and the English one is picked
   out of four. Nothing to spell and nothing to pronounce — the ear and
   the hand are enough at that age.

   Which of the two it is, is drawn afresh for every question, so the
   mode belongs to the question and not to the menu. A telephone with no
   English voice asks them all as multiple choice: a question nobody can
   hear is a question nobody can answer.

   The list sits among the sums without pretending to be one: it is
   counted in mots where a table is counted in calculs, and where the
   two are mixed the app says questions rather than choose. */
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

/* A telephone with an English voice, and every utterance written down
   instead of spoken. */
const pretendVoices = list => page.evaluate(voices => {
  window.__said = [];
  window.speechSynthesis.getVoices = () => voices;
  window.speechSynthesis.speak = one => window.__said.push(one.text);
  window.speechSynthesis.cancel = () => {};
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  pickVoice();
}, list);

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
await pretendVoices([{ name: 'UK', lang: 'en-GB' }]);
await makeProfile('Camille', 'ce2');

// ---- the list is on the CE2's menu, counted in its own words ----
const menu = await page.evaluate(() => ({
  lists: Array.from(document.querySelectorAll('[data-lesson]')).map(b => b.dataset.lesson),
  counted: Array.from(document.querySelectorAll('[data-lesson] .sub')).map(b => b.textContent.trim()),
  heading: document.querySelector('.label').textContent
}));
console.log('the CE2 menu:', JSON.stringify(menu.lists), '|', JSON.stringify(menu.counted.slice(-2)));
if (menu.lists.indexOf('numbers_ce2') === -1) errors.push('the CE2 is not offered the English numbers');
if (!/15 mots/.test(menu.counted.join(' '))) errors.push('the list of words is counted in calculs');
if (!/74 questions/.test(menu.counted.join(' '))) {
  errors.push('sums and words mixed together are still called one or the other');
}
await page.screenshot({ path: SHOTS + 'v52-ce2-menu.png', fullPage: true });

// ---- a round draws its mode question by question ----
await page.click('[data-lesson="numbers_ce2"]');
await page.waitForTimeout(500);
const round = await page.evaluate(() => ({
  modes: state.round.map(q => q.mode),
  words: state.round.map(q => q.word.en[0]),
  figures: state.round.map(q => q.word.answer),
  length: state.round.length
}));
console.log('the modes of a round:', JSON.stringify(round.modes));
const kinds = Array.from(new Set(round.modes)).sort();
if (kinds.some(one => one !== 'count' && one !== 'mcq')) {
  errors.push('a question was asked in ' + kinds.join('/') + ', which is not for a CE2');
}
if (round.figures.some(n => !(n >= 1 && n <= 15))) errors.push('a number outside one to fifteen');
/* Over a hundred questions both modes must turn up; one round of
   fifteen could be all of a kind by chance, so it is counted over
   several. */
const drawn = await page.evaluate(() => {
  const seen = {};
  for (let i = 0; i < 20; i++) {
    startRound('numbers_ce2');
    state.round.forEach(q => { seen[q.mode] = (seen[q.mode] || 0) + 1; });
  }
  return seen;
});
console.log('over twenty rounds:', JSON.stringify(drawn));
if (!drawn.count || !drawn.mcq) errors.push('one of the two modes is never drawn: ' + JSON.stringify(drawn));

// ---- the listening question ----
await page.evaluate(() => {
  startRound('numbers_ce2');
  const first = state.round.find(q => q.mode === 'count');
  state.round = [first];
  state.index = 0;
  window.__said = [];
  renderShell();
  showQuestion();
});
await page.waitForTimeout(400);
const heard = await page.evaluate(() => ({
  asking: state.asking,
  said: window.__said.slice(-1)[0],
  english: state.round[0].word.en[0],
  nothingWritten: document.getElementById('prompt').hidden,
  asksForFigures: document.getElementById('typed').getAttribute('inputmode'),
  canHearItAgain: !!document.getElementById('hear')
}));
console.log('a number read out:', JSON.stringify(heard));
if (heard.said !== heard.english) errors.push('the number was not read out: ' + heard.said);
if (!heard.nothingWritten) errors.push('the listening question writes the answer down as well');
if (heard.asksForFigures !== 'numeric') errors.push('the answer is not asked in figures');
if (!heard.canHearItAgain) errors.push('no way to hear the number again');
await page.screenshot({ path: SHOTS + 'v52-heard.png', fullPage: true });

// A wrong answer shows the figure and asks for it to be copied out.
await page.fill('#typed', '99');
await page.click('#check');
await page.waitForTimeout(300);
console.log('a wrong answer:', await page.evaluate(() => ({
  verdict: document.getElementById('verdict').textContent.replace(/\s+/g, ' ').trim(),
  copy: document.getElementById('typed').placeholder,
  says: document.getElementById('check').textContent
})));
const figure = await page.evaluate(() => String(state.round[0].word.answer));
await page.fill('#typed', figure);
await page.click('#check');
await page.waitForTimeout(300);
console.log('and the figure copied out:', await page.evaluate(() => ({
  locked: document.getElementById('typed').disabled,
  onTheBook: progress.words[state.round[0].word.key]
})));

// ---- the multiple choice ----
await page.evaluate(() => {
  startRound('numbers_ce2');
  const first = state.round.find(q => q.mode === 'mcq') ||
    Object.assign(buildForward(state.round[0].word, poolFor('numbers_ce2')), { mode: 'mcq' });
  state.round = [first];
  state.index = 0;
  renderShell();
  showQuestion();
});
await page.waitForTimeout(400);
const picked = await page.evaluate(() => ({
  asking: state.asking,
  prompt: document.getElementById('prompt').textContent,
  choices: Array.from(document.querySelectorAll('#options .option .word')).map(b => b.textContent),
  answer: state.round[0].answer,
  french: state.round[0].word.fr
}));
console.log('four to choose from:', JSON.stringify(picked));
if (picked.prompt !== picked.french) errors.push('the question is not asked in French');
if (picked.choices.length !== 4) errors.push(picked.choices.length + ' choices instead of four');
if (picked.choices.indexOf(picked.answer) === -1) errors.push('the right answer is not among the choices');
if (picked.choices.some(one => /[0-9]/.test(one))) errors.push('a figure is offered as an English word');
await page.screenshot({ path: SHOTS + 'v52-choice.png', fullPage: true });

// ---- a telephone with no English voice ----
await pretendVoices([{ name: 'Amélie', lang: 'fr-FR' }]);
const silent = await page.evaluate(() => {
  const seen = {};
  for (let i = 0; i < 10; i++) {
    startRound('numbers_ce2');
    state.round.forEach(q => { seen[q.mode] = (seen[q.mode] || 0) + 1; });
  }
  return { modes: seen, voice: englishVoice };
});
console.log('with no English voice:', JSON.stringify(silent));
if (silent.modes.count) errors.push('a number is read out on a telephone that cannot read it');
if (!silent.modes.mcq) errors.push('nothing at all is asked when there is no voice');
await pretendVoices([{ name: 'UK', lang: 'en-GB' }]);

// ---- the report, and the sixième next door ----
await page.evaluate(() => renderMenu());
await page.waitForTimeout(200);
await page.click('#report');
await page.waitForTimeout(500);
console.log('the CE2 report:', JSON.stringify(await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.card'));
  const last = cards[cards.length - 1];
  return {
    title: last.querySelector('b').textContent,
    counted: last.querySelector('.done') ? last.querySelector('.done').textContent : null,
    firstLine: last.querySelector('.report li .en').textContent,
    sums: cards[1].querySelector('.report li .en').textContent
  };
})));
await page.screenshot({ path: SHOTS + 'v52-report.png', fullPage: true });

await page.click('#wayout');
await page.waitForTimeout(300);
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');
const older = await page.evaluate(() => ({
  lists: Array.from(document.querySelectorAll('[data-lesson]')).map(b => b.dataset.lesson),
  numbers: LESSONS.filter(l => /number/.test(l.id)).map(l => l.id + ':' + l.words.length)
}));
console.log('the sixième next door:', JSON.stringify(older));
if (older.lists.indexOf('numbers_ce2') !== -1) errors.push("the sixième is offered the CE2's list");
if (older.lists.indexOf('numbers') === -1) errors.push('the sixième lost their own numbers');

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
