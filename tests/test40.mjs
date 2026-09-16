/* The CE2 side: maths rather than English.

   Everything around an exercise — the ranks, the points, the daily
   goal, the spaced repetition, the property — was built for words. The
   point of this suite is that it serves sums without knowing it, and
   that the sixième sees no difference at all. */
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

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- the numbers asked for are the ones asked for ----
console.log('the doubles:', JSON.stringify(await page.evaluate(() => {
  const items = MATHS.byId('doubles').items;
  const wanted = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,20,25,30,50];
  return {
    howMany: items.length,
    theNumbers: items.map(one => one.n).join(' '),
    exactlyThose: JSON.stringify(items.map(one => one.n)) === JSON.stringify(wanted),
    everyAnswerIsTwice: items.every(one => one.answer === one.n * 2),
    aSample: items.find(one => one.n === 7)
  };
})));

// ---- a CE2 profile is given maths, and no choice of mode ----
await makeProfile('Camille', 'ce2');
console.log('the CE2 menu:', JSON.stringify(await page.evaluate(() => ({
  subject: subject(),
  mode: state.mode,
  modesOffered: document.querySelectorAll('[data-mode]').length,
  lists: Array.from(document.querySelectorAll('[data-lesson]')).map(b => b.dataset.lesson),
  thePrompt: Array.from(document.querySelectorAll('.label'))
    .map(one => one.textContent).find(text => text.indexOf('Choisis') === 0)
}))));
await page.screenshot({ path: SHOTS + 'v20-ce2-menu.png' });

// ---- and the numbers come up in a different order each time ----
const order = () => page.evaluate(() => state.round.map(q => q.word.n).join(' '));
await page.click('[data-lesson="doubles"]');
await page.waitForTimeout(500);
const first = await order();
await page.click('#back');
await page.waitForTimeout(300);
await page.click('[data-lesson="doubles"]');
await page.waitForTimeout(500);
const second = await order();
console.log('drawn afresh each time:', JSON.stringify({
  first, second, notTheSameOrder: first !== second
}));

// ---- a right answer ----
console.log('a right answer:', JSON.stringify(await page.evaluate(async () => {
  const word = state.round[0].word;
  const before = progress.points;
  document.getElementById('typed').value = String(word.answer);
  document.getElementById('sumForm').dispatchEvent(new Event('submit', { cancelable: true }));
  await new Promise(done => setTimeout(done, 200));
  return {
    asked: word.fr,
    verdict: document.getElementById('verdict').textContent,
    pointsGained: progress.points - before,
    levelledUp: progress.words[word.key].level === 1,
    nextOffered: !document.getElementById('next').hidden
  };
})));

// ---- a wrong one shows the working and asks for the answer in writing ----
await page.click('#next');
await page.waitForTimeout(400);
console.log('a wrong answer:', JSON.stringify(await page.evaluate(async () => {
  const word = state.round[1].word;
  document.getElementById('typed').value = '999';
  document.getElementById('sumForm').dispatchEvent(new Event('submit', { cancelable: true }));
  await new Promise(done => setTimeout(done, 200));
  return {
    verdict: document.getElementById('verdict').textContent,
    asksForACopy: document.getElementById('typed').placeholder,
    notLetThroughYet: document.getElementById('next').hidden
  };
})));
await page.screenshot({ path: SHOTS + 'v20-ce2-wrong.png' });

// Writing it out is what unlocks the next one.
console.log('writing it out:', JSON.stringify(await page.evaluate(async () => {
  const word = state.round[1].word;
  document.getElementById('typed').value = String(word.answer);
  document.getElementById('sumForm').dispatchEvent(new Event('submit', { cancelable: true }));
  await new Promise(done => setTimeout(done, 200));
  return { nextOffered: !document.getElementById('next').hidden };
})));

// ---- spaces and a stray sign are forgiven, a wrong number is not ----
console.log('what counts as the answer:', JSON.stringify(await page.evaluate(() => {
  const word = { answer: 14 };
  return { plain: maths.matches(word, '14'), spaced: maths.matches(word, ' 14 '),
           dotted: maths.matches(word, '14.'), empty: maths.matches(word, ''),
           wrong: maths.matches(word, '41'), lettered: maths.matches(word, 'quatorze') };
})));

// ---- the day's goal counts sums, and the property is paid the same ----
await page.evaluate(() => { renderMenu(); });
await page.waitForTimeout(400);
console.log('the day, in the CE2 words:', JSON.stringify(await page.evaluate(() => ({
  counter: document.querySelector('.goal .count').textContent,
  button: document.getElementById('daily').textContent,
  rank: document.querySelector('.rank-name') && document.querySelector('.rank-name').textContent,
  points: progress.points,
  theProperty: !!document.getElementById('open-property')
}))));

// ---- and the sixième is left exactly as it was ----
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');
console.log('the sixième, untouched:', JSON.stringify(await page.evaluate(() => ({
  subject: subject(),
  mode: state.mode,
  modesOffered: Array.from(document.querySelectorAll('[data-mode]')).map(b => b.dataset.mode),
  lists: Array.from(document.querySelectorAll('[data-lesson]')).map(b => b.dataset.lesson).length,
  stillEnglish: allWords().every(one => Array.isArray(one.en) && one.fr)
}))));

// ---- switching back puts the CE2 in maths again, mode and all ----
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
console.log('back to the CE2:', JSON.stringify(await page.evaluate(() => ({
  subject: subject(),
  mode: state.mode,
  hasKeptHerWork: Object.keys(progress.words).filter(k => k.indexOf('doubles:') === 0).length
}))));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
