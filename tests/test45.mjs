/* Which voice says the word, and in which language it is asked for.

   The words are taught in British English, so that is the voice asked
   for first. But a telephone has whichever voices its owner happened to
   install, and one of the two this is used on had the American voice
   and not the British one — a common enough state for a machine set up
   in French.

   The choice of voice already came down to American in that case. What
   did not was the language asked for: the property asked for en-GB
   whatever voice it had found, and Android turns down an utterance
   whose language it cannot serve, without a sound and without a word.

   There is no speech in a headless browser, so the voices are made up
   and the utterance is caught on its way out: what is being watched
   here is the choosing, which is where the fault was. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => {
  const text = m.text();
  if (m.type() === 'error' && !/CERT|favicon|fonts\.g|404/.test(text)) errors.push('CONSOLE ' + text);
});
page.on('response', r => {
  // The runner's own server serves no favicon; nothing else may go missing.
  if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push('MISSING ' + r.status() + ' ' + r.url());
});

/* A telephone with a given set of voices installed, and a notebook the
   utterances are written into instead of being spoken. */
const pretendVoices = list => page.evaluate(voices => {
  window.__said = [];
  window.speechSynthesis.getVoices = () => voices;
  window.speechSynthesis.speak = one => window.__said.push({
    words: one.text, lang: one.lang, voice: one.voice ? one.voice.name : null
  });
  window.speechSynthesis.cancel = () => {};
  // The real utterance refuses a made-up voice, so it is stood in for.
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  // A voice found earlier must not be kept: the telephone has changed.
  if (typeof pickVoice === 'function') pickVoice();
  else window.dispatchEvent(new Event('voiceschanged'));
}, list);

const FRENCH = { name: 'Amélie', lang: 'fr-FR' };
const AMERICAN = { name: 'English United States', lang: 'en-US' };
const AMERICAN_UNDERSCORE = { name: 'English (US)', lang: 'en_US' };
const BRITISH = { name: 'English United Kingdom', lang: 'en-GB' };
const AUSTRALIAN = { name: 'English Australia', lang: 'en-AU' };

// ---- the property, where the fault was ----
await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

/* The 🔊 of a picked object. An object is put down, picked, and the
   button in its bar pressed. */
const sayInTheProperty = async voices => {
  await pretendVoices(voices);
  await page.evaluate(() => {
    window.speechSynthesis.dispatchEvent
      ? window.speechSynthesis.dispatchEvent(new Event('voiceschanged'))
      : 0;
    const land = PropertyState.scene().land;
    if (!PropertyState.scene().placed.length) {
      for (let y = Math.floor(land.rows / 2); y < land.rows; y++) {
        for (let x = Math.floor(land.cols / 2); x < land.cols; x++) {
          if (PropertyState.buyAt('chicken', x, y, 0, 0)) { y = land.rows; break; }
        }
      }
    }
    World.select({ kind: 'object', uid: PropertyState.scene().placed[0].uid });
  });
  await page.waitForTimeout(200);
  await page.click('[data-action="say"]');
  await page.waitForTimeout(200);
  return page.evaluate(() => window.__said[window.__said.length - 1] || null);
};

await page.evaluate(() => { REWARD.addCoins(5000); });
await page.waitForTimeout(300);

/* The five telephones worth trying, and what each must be asked for.
   The rule they all share: the language asked for is the language of
   the voice that will say it. That is what was broken — the property
   asked for en-GB whatever voice it had found. */
const PHONES = [
  ['British and American ', [FRENCH, AMERICAN, BRITISH], 'en-GB', 'English United Kingdom'],
  ['American only        ', [FRENCH, AMERICAN], 'en-US', 'English United States'],
  ['en_US, as Android    ', [FRENCH, AMERICAN_UNDERSCORE], 'en_US', 'English (US)'],
  ['Australian only      ', [FRENCH, AUSTRALIAN], 'en-AU', 'English Australia'],
  ['no English at all    ', [FRENCH], 'en-GB', null]
];

for (const [what, voices, lang, voice] of PHONES) {
  const said = await sayInTheProperty(voices);
  const right = said && said.lang === lang && said.voice === voice;
  console.log('the property, ' + what + ':', JSON.stringify(said), right ? '' : '  <-- WRONG');
  if (!right) errors.push('the property on a telephone with ' + what.trim() +
    ' asked for ' + JSON.stringify(said) + ' rather than ' + lang + ' / ' + voice);
}

// ---- and the lessons, which ask the same question ----
await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

const sayInTheLessons = async voices => {
  await pretendVoices(voices);
  await page.evaluate(() => speak('a hen'));
  await page.waitForTimeout(150);
  return page.evaluate(() => window.__said[window.__said.length - 1] || null);
};
for (const [what, voices, lang, voice] of PHONES) {
  const said = await sayInTheLessons(voices);
  const right = said && said.lang === lang && said.voice === voice;
  console.log('the lessons,  ' + what + ':', JSON.stringify(said), right ? '' : '  <-- WRONG');
  if (!right) errors.push('the lessons on a telephone with ' + what.trim() +
    ' asked for ' + JSON.stringify(said) + ' rather than ' + lang + ' / ' + voice);
}

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
