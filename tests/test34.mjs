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
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT') && !m.text().includes('404')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(500);
// The browser has no voice here; keep speak() from throwing.
await page.evaluate(() => { window.speechSynthesis && window.speechSynthesis.cancel(); });

const look = () => page.evaluate(() => {
  const word = state.round[state.index].word;
  const prompt = document.getElementById('prompt');
  const body = document.getElementById('body').textContent;
  return {
    mode: state.mode,
    french: word.fr,
    promptShown: prompt.hidden ? null : prompt.textContent,
    frenchOnScreen: document.querySelector('.card').textContent.includes(word.fr),
    body: body.replace(/\s+/g, ' ').trim().slice(0, 80)
  };
});

// ---- the dictation ----
await page.evaluate(() => { state.mode = 'spell'; renderMenu(); });
await page.click('[data-lesson="*"]');
await page.waitForTimeout(400);
console.log('écouter et écrire:', JSON.stringify(await look()));

// Writing the right answer still tells the pupil what it means.
const right = await page.evaluate(() => state.round[state.index].word.en[0]);
await page.fill('#typed', right);
await page.click('#check');
await page.waitForTimeout(300);
console.log('after a right answer:', JSON.stringify(await page.evaluate(() => ({
  verdict: document.getElementById('verdict').textContent.replace(/\s+/g, ' ').trim().slice(0, 70),
  frenchNowShown: document.querySelector('.card').textContent.includes(state.round[state.index].word.fr)
}))));
await page.click('#next');
await page.waitForTimeout(300);
console.log('next word, still nothing given away:', JSON.stringify(await look()));

// A wrong answer shows how it is written, and asks for it again.
await page.fill('#typed', 'zzzz');
await page.click('#check');
await page.waitForTimeout(300);
console.log('after a wrong answer:', JSON.stringify(await page.evaluate(() => ({
  verdict: document.getElementById('verdict').textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
  placeholder: document.getElementById('typed').placeholder
}))));

// ---- the other modes still show what they must ----
await page.evaluate(() => renderMenu());
for (const mode of ['mcq', 'mcqfr', 'say']) {
  await page.evaluate(m => { state.mode = m; renderMenu(); }, mode);
  await page.click('[data-lesson="*"]');
  await page.waitForTimeout(350);
  console.log(mode.padEnd(6), JSON.stringify(await look()));
  await page.evaluate(() => renderMenu());
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
