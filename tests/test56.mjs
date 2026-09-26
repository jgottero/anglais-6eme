/* The ordinal numbers.

   Every rank has two right answers, written in letters and in figures:
   "first" and "1st" are both premier. A question draws one of the two
   at random, in either direction, and the three wrong choices beside it
   come in the same form — a figure among three words would give it
   away. Written or spoken, either form is accepted; the dictation reads
   the word and the correction spells it out in letters. */
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

// A telephone with an English voice, and every utterance written down.
await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);
await page.evaluate(() => {
  window.__said = [];
  window.speechSynthesis.getVoices = () => [{ name: 'UK', lang: 'en-GB' }];
  window.speechSynthesis.speak = one => window.__said.push(one.text);
  window.speechSynthesis.cancel = () => {};
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  pickVoice();
});
await page.fill('#profile-name', 'Noé');
await page.click('[data-grade="6eme"]');
await page.click('[data-make]');
await page.waitForTimeout(700);

const figure = text => /^[0-9]+(st|nd|rd|th)$/.test(text);

// ---- the list is on the sixième's menu, and every word has both forms ----
const menu = await page.evaluate(() => ({
  lists: Array.from(document.querySelectorAll('[data-lesson]')).map(b => b.dataset.lesson),
  words: LESSONS.find(l => l.id === 'ordinals').words.map(w => w.en)
}));
console.log('the sixième menu:', JSON.stringify(menu.lists));
console.log('the ranks:', menu.words.map(en => en.join('/')).join(' '));
if (menu.lists.indexOf('ordinals') === -1) errors.push('the ordinals are not on the menu');
menu.words.forEach(en => {
  if (en.length !== 2 || figure(en[0]) || !figure(en[1])) errors.push('not a word then a figure: ' + en.join('/'));
});

// ---- French to English: both forms drawn, the wrong choices in the same one ----
const forward = await page.evaluate(() => {
  const pool = poolFor('ordinals');
  const out = [];
  for (let i = 0; i < 200; i++) {
    const word = pool[i % pool.length];
    const q = buildForward(word, pool);
    out.push({ answer: q.answer, options: q.options, en: word.en });
  }
  return out;
});
const drawnForward = { figures: 0, letters: 0 };
forward.forEach(q => {
  drawnForward[figure(q.answer) ? 'figures' : 'letters']++;
  if (q.options.length !== 4) errors.push(q.options.length + ' choices for ' + q.answer);
  if (q.options.indexOf(q.answer) === -1) errors.push('the answer is not offered: ' + q.answer);
  if (q.options.some(one => figure(one) !== figure(q.answer))) {
    errors.push('forms mixed: ' + q.options.join(', ') + ' for ' + q.answer);
  }
  if (q.options.filter(one => q.en.indexOf(one) !== -1).length !== 1) {
    errors.push('two right answers among ' + q.options.join(', '));
  }
});
console.log('French to English, answers drawn as:', JSON.stringify(drawnForward),
  '| e.g.', JSON.stringify(forward[0].options), JSON.stringify(forward[1].options));
if (!drawnForward.figures || !drawnForward.letters) errors.push('one of the two forms is never asked');

// ---- English to French: the prompt comes in either form ----
const reverse = await page.evaluate(() => {
  const pool = poolFor('ordinals');
  const seen = { figures: 0, letters: 0 };
  let bad = null;
  for (let i = 0; i < 200; i++) {
    const q = buildReverse(pool[i % pool.length], pool);
    seen[/^[0-9]/.test(q.prompt) ? 'figures' : 'letters']++;
    if (q.options.indexOf(q.answer) === -1 || q.options.length !== 4) bad = q;
  }
  return { seen, bad };
});
console.log('English to French, prompts drawn as:', JSON.stringify(reverse.seen));
if (!reverse.seen.figures || !reverse.seen.letters) errors.push('the prompt always comes in one form');
if (reverse.bad) errors.push('a broken reverse question: ' + JSON.stringify(reverse.bad));

// ---- a real multiple choice on screen ----
await page.click('[data-lesson="ordinals"]');
await page.waitForTimeout(500);
await page.evaluate(() => {
  const word = poolFor('ordinals')[0];
  let q;
  do { q = buildForward(word, poolFor('ordinals')); } while (q.answer !== '1st');
  state.round = [Object.assign(q, { mode: 'mcq' })];
  state.index = 0;
  renderShell();
  showQuestion();
});
await page.waitForTimeout(300);
const shown = await page.evaluate(() => ({
  prompt: document.getElementById('prompt').textContent,
  choices: Array.from(document.querySelectorAll('#options .option .word')).map(b => b.textContent)
}));
console.log('on screen:', JSON.stringify(shown));
await page.screenshot({ path: SHOTS + 'v56-choice.png', fullPage: true });
await page.click('#options .option:has-text("1st")');
await page.waitForTimeout(300);
const verdict = await page.evaluate(() => document.getElementById('verdict').textContent.replace(/\s+/g, ' ').trim());
console.log('picking 1st:', verdict);
if (!/^Bravo/.test(verdict)) errors.push('1st is not right for premier');
if (!/first/.test(verdict)) errors.push('the other form is not mentioned');

// ---- written or spoken, either form is accepted ----
const accepted = await page.evaluate(() => {
  const words = poolFor('ordinals');
  const one = fr => words.find(w => w.fr === fr);
  return {
    spell: ['first', '1st', 'First', '21st', 'twenty-first', 'twenty first', 'fist'].map(typed =>
      typed + ':' + spell.matches(typed === '21st' || /twenty/.test(typed) ? one('vingt et unième') : one('premier'), typed)),
    said: ['the first', '1st', '21st', 'twenty first'].map(heard =>
      heard + ':' + isAccepted(/21|twenty/.test(heard) ? one('vingt et unième') : one('premier'), heard)),
    correction: spell.correctFor(one('huitième'))
  };
});
console.log('typed:', accepted.spell.join(' '));
console.log('said:', accepted.said.join(' '));
console.log('the dictation reads and corrects with:', accepted.correction);
accepted.spell.forEach(one => {
  const ok = one.endsWith(':true');
  if (one.startsWith('fist:') ? ok : !ok) errors.push('typed wrongly judged: ' + one);
});
accepted.said.forEach(one => { if (!one.endsWith(':true')) errors.push('said and refused: ' + one); });
if (accepted.correction !== 'eighth') errors.push('the dictation does not spell the word out');

// ---- the day's revision mixes lists, and the forms still hold ----
const mixed = await page.evaluate(() => {
  const pool = allWords();
  const word = poolFor('ordinals')[5];
  const out = [];
  for (let i = 0; i < 40; i++) out.push(buildForward(word, pool));
  return out.map(q => ({ answer: q.answer, options: q.options }));
});
mixed.forEach(q => {
  if (q.options.some(one => figure(one) !== figure(q.answer))) {
    errors.push('forms mixed in the revision: ' + q.options.join(', '));
  }
});
console.log('in the revision, e.g.:', JSON.stringify(mixed[0].options));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
