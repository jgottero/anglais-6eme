/* Profiles: a telephone shared between children.

   The one that matters most below is not the screen but the partition:
   what a brother does must leave his sister's rank, her words and her
   property exactly as she left them. */
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
/* The web fonts and the favicon a browser asks for by itself are not
   the app's doing; a 404 on either is not a broken page. */
page.on('console', m => {
  const text = m.text();
  if (m.type() === 'error' && !/CERT|favicon|fonts\.g|404/.test(text)) errors.push('CONSOLE ' + text);
});

const makeProfile = async (name, grade) => {
  await page.fill('#profile-name', name);
  await page.click('[data-grade="' + grade + '"]');
  await page.click('[data-make]');
  await page.waitForTimeout(600);
};

await page.goto(SITE + '/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(700);

// ---- with nobody on it, the app asks who is there ----
console.log('a telephone straight out of the box:', JSON.stringify({
  asksForAName: await page.locator('#profile-name').isVisible(),
  yearsOffered: await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-grade]')).map(b => b.dataset.grade)),
  noMenuYet: await page.evaluate(() => !document.querySelector('[data-lesson]'))
}));

// ---- and will not take an empty name ----
await page.click('[data-make]');
await page.waitForTimeout(300);
console.log('a nameless profile:', JSON.stringify({
  made: await page.evaluate(() => PROFILES.all().length),
  said: await page.evaluate(() => {
    const note = document.querySelector('.notice');
    return note ? note.textContent : null;
  })
}));

// ---- two children, two profiles ----
await makeProfile('Camille', 'ce2');
console.log('the first one in:', JSON.stringify({
  heading: await page.locator('#heading').textContent(),
  onTheMenu: await page.evaluate(() => !!document.querySelector('[data-lesson]')),
  grade: await page.evaluate(() => PROFILE.grade)
}));
await page.screenshot({ path: SHOTS + 'v19-menu.png' });

// Camille does some work and buys a hen.
await page.evaluate(() => {
  progress.points = 900;
  progress.words['greetings:Salut'] = { level: 3, seen: 4, ok: 3, last: Date.now() };
  Store.save(progress);
  localStorage.setItem('reward-property-v1:' + PROFILE.id, JSON.stringify({
    version: 9, coins: 4242, tiers: [1, 2, 3], stamps: 5, nextUid: 2,
    owned: ['home'], current: 'outside',
    placed: { outside: [{ uid: 1, id: 'chicken', x: 30, y: 20 }] }
  }));
});
await page.waitForTimeout(300);

await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', '6eme');

console.log('the second one starts from nothing:', JSON.stringify(await page.evaluate(() => ({
  heading: document.getElementById('heading').textContent,
  points: progress.points,
  words: Object.keys(progress.words).length,
  grade: PROFILE.grade
}))));

// ---- each keeps their own things, under their own keys ----
await page.evaluate(() => { progress.points = 30; Store.save(progress); });
console.log('the keys in storage:', JSON.stringify(await page.evaluate(() => {
  const mine = PROFILES.all().map(p => p.id);
  return Object.keys(localStorage).sort().map(key =>
    mine.reduce((text, id) => text.replace(':' + id, ':<' + PROFILES.one(id).name + '>'), key));
})));
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-profile="p1"]');
await page.waitForTimeout(700);
console.log('back to the first one, untouched:', JSON.stringify(await page.evaluate(() => ({
  heading: document.getElementById('heading').textContent,
  points: progress.points,
  words: Object.keys(progress.words).length,
  herPurse: JSON.parse(localStorage.getItem('reward-property-v1:' + PROFILE.id)).coins
}))));

// ---- the property the module opens is the one of whoever is playing ----
console.log('the module is told whose property it is:', JSON.stringify(await page.evaluate(() => {
  openProperty();
  const frame = document.querySelector('#property iframe');
  const src = frame.getAttribute('src');
  closeProperty();
  return { src, forThisProfile: src.indexOf('p=' + PROFILE.id) !== -1 };
})));

/* A world sent from inside the app carries no profile. The module is
   asked in its own page: its globals are declared with const, so they
   live in that script's scope and not on the window a parent frame
   could reach into. */
const wasHere = await page.evaluate(() => localStorage.getItem('reward-property-v1:p1'));
const module = await browser.newPage();
await module.goto(SITE + '/reward/index.html?p=p1');
await module.waitForTimeout(700);
console.log('a shared link keeps the profile out:', JSON.stringify(await module.evaluate(async () => {
  const text = await Share.write(PropertyState.get(), 3);
  const link = Share.address(location.href, text);
  return {
    openedAt: location.search,
    link: link.split('#')[0],
    carriesTheProfile: link.indexOf('p=') !== -1
  };
})));
console.log('and it saves under that profile:', JSON.stringify(await module.evaluate(() => ({
  key: Object.keys(localStorage).find(one => one.indexOf('reward-property') === 0)
}))));
await module.close();
void wasHere;

// ---- coming from before profiles existed, nothing is lost ----
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('anglais-progress-v1', JSON.stringify({
    version: 3, points: 3300, words: { 'greetings:Salut': { level: 4, seen: 9, ok: 8, last: 1 } },
    days: {}, today: { date: '1999-01-01', keys: [] }, reward: { coins: 10, level: 20, stamps: 7 }
  }));
  localStorage.setItem('reward-property-v1', JSON.stringify({
    version: 9, coins: 7777, tiers: [1, 2], stamps: 2, nextUid: 1, owned: ['home'],
    current: 'outside', placed: { outside: [] }
  }));
});
await page.reload();
await page.waitForTimeout(700);
console.log('an older telephone says so:', JSON.stringify({
  promise: await page.evaluate(() => {
    const said = Array.from(document.querySelectorAll('.label'))
      .map(one => one.textContent).find(text => text.indexOf('déjà enregistrée') !== -1);
    return said || null;
  })
}));
await makeProfile('Camille', '6eme');
console.log('the first profile takes it over:', JSON.stringify(await page.evaluate(() => ({
  points: progress.points,
  words: Object.keys(progress.words).length,
  purse: JSON.parse(localStorage.getItem('reward-property-v1:' + PROFILE.id)).coins,
  plainKeysGone: localStorage.getItem('anglais-progress-v1') === null &&
                 localStorage.getItem('reward-property-v1') === null
}))));

// ---- and a second profile inherits nothing ----
await page.click('[data-switch]');
await page.waitForTimeout(400);
await page.click('[data-new-profile]');
await page.waitForTimeout(300);
await makeProfile('Noé', 'ce2');
console.log('the second one inherits nothing:', JSON.stringify(await page.evaluate(() => ({
  points: progress.points,
  hasAProperty: localStorage.getItem('reward-property-v1:' + PROFILE.id) !== null
}))));

// ---- who practised last is remembered, but still asked ----
await page.reload();
await page.waitForTimeout(700);
console.log('opening it again:', JSON.stringify({
  asksAgain: await page.evaluate(() => !!document.querySelector('[data-profile]')),
  remembersTheLast: await page.evaluate(() => PROFILES.last().name),
  straightIntoTheMenu: await page.evaluate(() => !!document.querySelector('[data-lesson]'))
}));

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
