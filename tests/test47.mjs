/* Three things about the exercises themselves.

   The day's revision used to ask every word the same way, whichever
   mode happened to be chosen in the menu. It turns the word over now:
   asked one way, then the other, then written from the sound alone.
   Speaking is left out of the turn — it wants a microphone and a
   recogniser that does not always hear, and a daily session has to be
   finishable. So is the dictation on a telephone with no English voice,
   for the same reason: there would be nothing to hear.

   A right answer used to ask the pupil to press "next" before anything
   happened. It is said, it is read, and the next question comes on its
   own. A wrong one still waits, because there is something to look at.

   And the score page says what the round was worth in coins. The figure
   comes from the town, which is the only side that knows its own
   prices; the town is woken out of sight the moment something is owed,
   so that it is counted when it is won rather than at the next visit. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 420, height: 950 } });
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

/* There is no speech in a headless browser, so the telephone is given
   the voice — or not — and the app asked what it would do with it. */
const withVoices = voices => page.evaluate(list => {
  window.speechSynthesis.getVoices = () => list;
  window.speechSynthesis.speak = () => {};
  window.speechSynthesis.cancel = () => {};
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  englishVoice = null;
  pickVoice();
}, voices);

const FRENCH = { name: 'Amélie', lang: 'fr-FR' };
const BRITISH = { name: 'English United Kingdom', lang: 'en-GB' };

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- the day turns the word over ----
await makeProfile('Noé', '6eme');
await withVoices([FRENCH, BRITISH]);
await page.click('#daily');
await page.waitForTimeout(600);
const turning = await page.evaluate(() => state.round.map(one => one.mode));
console.log('the day, with an English voice:', JSON.stringify({
  modes: turning.slice(0, 7).join(' ') + '…',
  distinct: Array.from(new Set(turning)).sort().join(' '),
  inTurn: turning.every((mode, at) => mode === ['mcq', 'mcqfr', 'spell'][at % 3]),
  askingNow: await page.evaluate(() => state.asking)
}));
if (!turning.every((mode, at) => mode === ['mcq', 'mcqfr', 'spell'][at % 3])) {
  errors.push('the day does not turn between the three modes: ' + turning.join(' '));
}
if (turning.indexOf('say') !== -1) errors.push('the day asks for the microphone');

/* With no English voice there is nothing to write from, so the
   dictation drops out and the two others share the round. */
await page.evaluate(() => renderMenu());
await withVoices([FRENCH]);
await page.click('#daily');
await page.waitForTimeout(600);
const mute = await page.evaluate(() => state.round.map(one => one.mode));
console.log('the day, with no English voice:', JSON.stringify({
  distinct: Array.from(new Set(mute)).sort().join(' '),
  inTurn: mute.every((mode, at) => mode === ['mcq', 'mcqfr'][at % 2])
}));
if (mute.indexOf('spell') !== -1) errors.push('a telephone with no English voice is asked to take dictation');

/* Choosing a mode in the menu still means that mode, all the way. */
await page.evaluate(() => renderMenu());
await withVoices([FRENCH, BRITISH]);
const chosen = await page.evaluate(async () => {
  state.mode = 'spell';
  renderMenu();
  document.querySelector('[data-lesson]').click();
  await new Promise(done => setTimeout(done, 80));
  return { modes: Array.from(new Set(state.round.map(one => one.mode))), asking: state.asking };
});
console.log('a mode chosen on purpose:', JSON.stringify(chosen));
if (chosen.modes.length !== 1 || chosen.modes[0] !== 'spell') {
  errors.push('choosing the dictation gave ' + chosen.modes.join(' '));
}

// ---- a right answer moves on by itself, a wrong one waits ----
console.log('answering:', JSON.stringify(await page.evaluate(async () => {
  renderMenu();
  state.mode = 'mcq';
  renderMenu();
  document.querySelector('[data-lesson]').click();
  await new Promise(done => setTimeout(done, 80));

  const pick = right => {
    const question = state.round[state.index];
    const buttons = Array.from(document.querySelectorAll('#options .option'));
    const good = buttons.find(b => b.querySelector('.word').textContent === question.answer);
    (right ? good : buttons.find(b => b !== good)).click();
  };

  const was = state.index;
  pick(true);
  const straight = { asked: !document.getElementById('next').hidden, at: state.index };
  await new Promise(done => setTimeout(done, 2400));
  const after = { at: state.index, fresh: !state.locked };

  pick(false);
  const wrong = { asked: !document.getElementById('next').hidden, at: state.index };
  await new Promise(done => setTimeout(done, 2400));
  const still = { at: state.index, asked: !document.getElementById('next').hidden };
  return {
    right: { pressNextOffered: straight.asked, wentOnItsOwn: after.at === was + 1, readyAgain: after.fresh },
    wrong: { pressNextOffered: wrong.asked, waited: still.at === wrong.at && still.asked }
  };
})));
const answering = await page.evaluate(() => ({ index: state.index }));
console.log('  and it is at question', answering.index + 1);

/* Leaving in the second between a right answer and the next question
   must not drag the pupil back into it. */
console.log('leaving on a right answer:', JSON.stringify(await page.evaluate(async () => {
  renderMenu();
  document.querySelector('[data-lesson]').click();
  await new Promise(done => setTimeout(done, 80));
  const question = state.round[state.index];
  Array.from(document.querySelectorAll('#options .option'))
    .find(b => b.querySelector('.word').textContent === question.answer).click();
  document.getElementById('wayout').click();
  await new Promise(done => setTimeout(done, 2400));
  return { showing, onTheMenu: !!document.querySelector('[data-lesson]') };
})));

// ---- the coins a round is worth ----
/* The CE2, whose sums are quick to answer right, and whose first round
   crosses a level or two. */
await page.evaluate(() => renderMenu());
await page.click('[data-switch]');
await page.waitForTimeout(300);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Camille', 'ce2');
console.log('before a single answer, no town:', JSON.stringify(await page.evaluate(() =>
  !!document.querySelector('#property iframe'))));
await page.click('[data-lesson="times2"]');
await page.waitForTimeout(600);
await page.evaluate(async () => {
  for (let n = 0; n < state.round.length; n++) {
    document.getElementById('typed').value = String(state.round[state.index].word.answer);
    document.getElementById('sumForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise(done => setTimeout(done, 1500));
  }
});
await page.waitForTimeout(800);
/* Nothing was opened: the town was woken behind the page, settled what
   it owed, and said so. */
const woken = await page.evaluate(() => ({
  frameThere: !!document.querySelector('#property iframe'),
  panelShut: document.getElementById('property').hidden
}));
console.log('the town, woken out of sight:', JSON.stringify(woken));
if (!woken.frameThere) errors.push('the town was never woken, so nothing could be counted');
if (!woken.panelShut) errors.push('the town opened over the exercises');

const worth = await page.evaluate(() => ({
  showing,
  score: document.querySelector('.score-line').textContent,
  said: (document.querySelector('.rank-up') || {}).textContent || null,
  roundCoins: state.roundCoins,
  purse: progress.reward.coins
}));
console.log('what the round was worth:', JSON.stringify(worth));
if (!(worth.roundCoins > 0)) errors.push('a round that crossed a level was worth nothing');
if (!worth.said || worth.said.indexOf('+' + worth.roundCoins + ' pièces') === -1) {
  errors.push('the score page says "' + worth.said + '" for ' + worth.roundCoins + ' coins');
}
await page.screenshot({ path: SHOTS + 'v47-score.png', fullPage: true });

/* A round that earns nothing says nothing about coins. */
console.log('a round worth nothing:', JSON.stringify(await page.evaluate(async () => {
  renderMenu();
  document.querySelector('[data-lesson="times2"]').click();
  await new Promise(done => setTimeout(done, 80));
  // Every one wrong, then copied out: no level, and no coins.
  for (let n = 0; n < state.round.length; n++) {
    const right = String(state.round[state.index].word.answer);
    const form = document.getElementById('sumForm');
    document.getElementById('typed').value = '999';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise(done => setTimeout(done, 60));
    document.getElementById('typed').value = right;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise(done => setTimeout(done, 1500));
  }
  await new Promise(done => setTimeout(done, 400));
  return { showing, roundCoins: state.roundCoins,
           said: (document.querySelector('.rank-up') || {}).textContent || 'nothing about coins' };
})));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
