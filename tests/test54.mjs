/* The family account: every save copied to Supabase.

   Three telephones and one family. The first makes the profiles and
   then the account; the second signs in and finds everybody there; the
   two work apart, one of them out of reach of the network, and meet
   again with nothing lost — two lists of words merged, two children
   made at the same time under the same id kept apart. A third that
   had its own Léa hands her over to the account's rather than making
   a second one.

   Supabase itself is played by this file: a few lines of fake Auth and
   of fake PostgREST, answering the same requests with the same shapes,
   behind the page's back. Nothing here reaches the network. */
import { chromium } from 'playwright';
/* Where to find the browser, the pages and somewhere to drop the
   screenshots. The defaults are the ones tests/run.mjs sets up; every
   one of them can be pointed elsewhere from the environment. */
const BROWSER = process.env.CHROMIUM || undefined;   // undefined: the one Playwright brought
const SITE = process.env.SITE || 'http://localhost:8123';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: BROWSER });
const errors = [];

// ---- the fake Supabase ----
const SUPABASE = 'https://sfxnlvcgqgksrbuenmxf.supabase.co';
const users = {};          // email -> { id, password }
const rows = new Map();    // owner + '|' + key -> { key, data, rev, updated_at }
const seen = { calls: 0, refresh: 0, byPhone: {} };
const offline = new Set();
let lifetime = 3600;

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor = user => b64({ alg: 'none' }) + '.' +
  b64({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + lifetime }) + '.x';
const whoIs = header => {
  try {
    return JSON.parse(Buffer.from(String(header).replace(/^Bearer /, '').split('.')[1], 'base64url').toString()).sub;
  } catch (err) { return null; }
};
const session = user => ({
  access_token: tokenFor(user), token_type: 'bearer', expires_in: lifetime,
  refresh_token: 'refresh-' + user.id, user: { id: user.id, email: user.email }
});
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
};
const answer = (route, status, body) => route.fulfill({
  status, headers: { ...CORS, 'Content-Type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body)
});

async function supabase(route, phone) {
  const request = route.request();
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (offline.has(phone)) return route.abort('internetdisconnected');
  seen.calls++;
  seen.byPhone[phone] = (seen.byPhone[phone] || 0) + 1;
  const url = new URL(request.url());
  const body = request.postData() ? JSON.parse(request.postData()) : null;
  const path = url.pathname;

  if (path === '/auth/v1/signup') {
    if (users[body.email]) return answer(route, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    const user = users[body.email] = { id: 'user-' + (Object.keys(users).length + 1), email: body.email, password: body.password };
    return answer(route, 200, session(user));
  }
  if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const user = users[body.email];
    if (!user || user.password !== body.password) {
      return answer(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    return answer(route, 200, session(user));
  }
  if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    seen.refresh++;
    const user = Object.values(users).find(one => 'refresh-' + one.id === body.refresh_token);
    if (!user) return answer(route, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    return answer(route, 200, session(user));
  }
  if (path === '/auth/v1/user' && request.method() === 'PUT') {
    const id = whoIs(request.headers().authorization);
    const user = Object.values(users).find(one => one.id === id);
    if (!user) return answer(route, 401, { msg: 'invalid JWT' });
    user.password = body.password;
    return answer(route, 200, { id: user.id, email: user.email });
  }
  if (path === '/auth/v1/logout') return answer(route, 204);

  if (path === '/rest/v1/saves') {
    const owner = whoIs(request.headers().authorization);
    if (!owner) return answer(route, 401, { message: 'JWT expired' });
    const stamp = () => new Date().toISOString();
    if (request.method() === 'GET') {
      return answer(route, 200, [...rows.entries()]
        .filter(([id]) => id.startsWith(owner + '|'))
        .map(([, row]) => row));
    }
    if (request.method() === 'POST') {
      const id = owner + '|' + body.key;
      if (body.owner !== owner) return answer(route, 403, { code: '42501', message: 'row-level security' });
      if (rows.has(id)) return answer(route, 409, { code: '23505', message: 'duplicate key' });
      rows.set(id, { key: body.key, data: body.data, rev: 1, updated_at: stamp() });
      return answer(route, 201, [{ key: body.key, rev: 1 }]);
    }
    if (request.method() === 'PATCH') {
      const key = url.searchParams.get('key').replace(/^eq\./, '');
      const rev = Number(url.searchParams.get('rev').replace(/^eq\./, ''));
      const row = rows.get(owner + '|' + key);
      if (!row || row.rev !== rev) return answer(route, 200, []);
      row.data = body.data;
      row.rev++;
      row.updated_at = stamp();
      return answer(route, 200, [{ key, rev: row.rev }]);
    }
  }
  return answer(route, 404, { message: 'not faked: ' + request.method() + ' ' + path });
}

async function phone(name) {
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.route(SUPABASE + '/**', route => supabase(route, name));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(name + ' PAGEERROR ' + e.message));
  page.on('console', m => {
    const text = m.text();
    // A request refused on purpose, or made while "offline", is logged by the browser.
    if (m.type() === 'error' && !/CERT|favicon|fonts\.g|Failed to load resource|ERR_/.test(text)) {
      errors.push(name + ' CONSOLE ' + text);
    }
  });
  await page.goto(SITE + '/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);
  return page;
}

async function until(what, test, ms) {
  const end = Date.now() + (ms || 6000);
  while (Date.now() < end) {
    if (await test()) return true;
    await new Promise(done => setTimeout(done, 100));
  }
  errors.push('never happened: ' + what);
  return false;
}

async function makeProfile(page, name, grade) {
  await page.fill('#profile-name', name);
  await page.click('[data-grade="' + grade + '"]');
  await page.click('[data-make]');
  await page.waitForTimeout(400);
}

const server = (owner, key) => (rows.get(owner + '|' + key) || {}).data;
const listOf = owner => (server(owner, 'anglais-profiles-v1') || { profiles: [] })
  .profiles.map(one => one.id + ':' + one.name).join(' ');

// ---- the first telephone, before any account ----
const a = await phone('A');
await makeProfile(a, 'Léa', '6eme');
await a.evaluate(() => {
  progress.points = 40;
  progress.words['greetings:Salut'] = { level: 2, seen: 2, ok: 2, last: Date.now() };
  progress.days['2026-01-01'] = { n: 3, goal: 10, stamp: null, p: 40 };
  Store.save(progress);
});
await a.evaluate(() => renderProfiles({ asking: true }));
await makeProfile(a, 'Tom', 'ce2');
await a.evaluate(() => renderProfiles());
const before = await a.evaluate(() => ({
  bookkeeping: localStorage.getItem('anglais-cloud-v1'),
  line: document.querySelector('[data-cloud-line]').textContent,
  button: document.querySelector('[data-account]').textContent
}));
console.log('never signed in:', JSON.stringify(before), '| requests so far:', seen.calls);
if (seen.calls) errors.push('the network was used before anybody signed in');
if (before.bookkeeping !== null) errors.push('bookkeeping kept on a telephone that never signed in');

// ---- the account is made from it, and everything goes up ----
lifetime = 30;   // tokens about to run out: each request renews first
await a.click('[data-account]');
await a.fill('#cloud-email', 'Famille@Example.fr');
await a.fill('#cloud-password', 'secret123');
await a.screenshot({ path: SHOTS + 'v54-sign-up.png' });
await a.click('[data-sign-up]');
await until('the account says it is ready', () => a.evaluate(() =>
  /prêt/.test((document.querySelector('[data-cloud-message]') || {}).textContent || '')));
const family = users['famille@example.fr'];
if (!family) errors.push('the email was not sent as typed in lower case');
const owner = family ? family.id : '';
console.log('on the server after signing up:', listOf(owner), '| Léa has',
  (server(owner, 'anglais-progress-v1:p1') || {}).points, 'points | renewed', seen.refresh, 'times');
if (listOf(owner) !== 'p1:Léa p2:Tom') errors.push('the profiles did not all go up');
if ((server(owner, 'anglais-progress-v1:p1') || {}).points !== 40) errors.push("Léa's progress did not go up");
if (!seen.refresh) errors.push('a token about to run out was not renewed');
lifetime = 3600;
await a.screenshot({ path: SHOTS + 'v54-signed-in.png' });

// ---- a wrong password is said as such ----
const b = await phone('B');
await b.click('[data-account]');
await b.fill('#cloud-email', 'famille@example.fr');
await b.fill('#cloud-password', 'wrong-one');
await b.click('[data-sign-in]');
await until('the wrong password is refused', () => b.evaluate(() =>
  /incorrect/.test(document.querySelector('[data-cloud-message]').textContent)));

// ---- the second telephone signs in and finds the family ----
await b.fill('#cloud-password', 'secret123');
await b.click('[data-sign-in]');
await until('the family comes down', () => b.evaluate(() => document.querySelectorAll('[data-profile]').length === 2));
await b.click('[data-profile="p1"]');
await b.waitForTimeout(300);
console.log('Léa on the second telephone:', JSON.stringify(await b.evaluate(() =>
  ({ who: PROFILE.name, points: progress.points, words: Object.keys(progress.words) }))));
if (await b.evaluate(() => progress.points) !== 40) errors.push("Léa's points did not come down");

// ---- the two work apart, the first one out of reach ----
offline.add('A');
await a.evaluate(() => startAs('p1'));
await a.waitForTimeout(200);
await a.evaluate(() => {
  progress.words['greetings:Bonjour'] = { level: 1, seen: 1, ok: 1, last: Date.now() };
  progress.days['2026-01-03'] = { n: 5, goal: 10, stamp: null, p: 30 };
  progress.points += 30;
  Store.save(progress);
});
await b.evaluate(() => {
  progress.words['greetings:Au revoir'] = { level: 1, seen: 1, ok: 1, last: Date.now() };
  progress.days['2026-01-02'] = { n: 5, goal: 10, stamp: null, p: 20 };
  progress.points += 20;
  Store.save(progress);
});
await until("B's work goes up", () => (server(owner, 'anglais-progress-v1:p1') || {}).points === 60);
await a.waitForTimeout(2200);
console.log('the first telephone, offline:', JSON.stringify(await a.evaluate(() => CLOUD.status())));

// ...and each makes somebody new, under the same next id.
await a.evaluate(() => renderProfiles({ asking: true }));
await makeProfile(a, 'Zoé', '6eme');
await a.evaluate(() => { progress.points = 7; progress.days['2026-01-04'] = { n: 1, goal: 10, stamp: null, p: 7 }; Store.save(progress); });
await b.evaluate(() => renderProfiles({ asking: true }));
await makeProfile(b, 'Max', 'ce2');
await until('Max goes up', () => listOf(owner) === 'p1:Léa p2:Tom p3:Max');
const zoeBefore = await a.evaluate(() => PROFILE.id);

// ---- the first telephone comes back ----
offline.delete('A');
await a.evaluate(() => CLOUD.sync());
await a.waitForTimeout(300);
const back = await a.evaluate(() => ({
  holding: PROFILE.id + ':' + PROFILE.name,
  points: progress.points,
  list: PROFILES.all().map(one => one.id + ':' + one.name).join(' '),
  zoeUnderOld: localStorage.getItem('anglais-progress-v1:p3') &&
    JSON.parse(localStorage.getItem('anglais-progress-v1:p3')).points,
  status: CLOUD.status()
}));
console.log('the first telephone, back online:', JSON.stringify(back));
console.log('on the server:', listOf(owner), '| Léa:',
  JSON.stringify((({ points, words }) => ({ points, words: Object.keys(words).sort() }))(server(owner, 'anglais-progress-v1:p1'))),
  '| p4 points:', (server(owner, 'anglais-progress-v1:p4') || {}).points);
if (zoeBefore !== 'p3') errors.push('Zoé was not made under the next id, so nothing collided');
if (back.holding !== 'p4:Zoé') errors.push('Zoé, being used, did not follow her new id');
if (back.points !== 7) errors.push("Zoé's progress did not follow her");
if (back.list !== 'p1:Léa p2:Tom p3:Max p4:Zoé') errors.push('the two lists were not brought together');
if (listOf(owner) !== 'p1:Léa p2:Tom p3:Max p4:Zoé') errors.push('the server does not hold everybody');
const lea = server(owner, 'anglais-progress-v1:p1');
if (!lea || Object.keys(lea.words).length !== 3) errors.push("Léa's words were not merged");
if (!lea || lea.points !== 90) errors.push("Léa's points were not rebuilt from both telephones: " + (lea && lea.points));
if ((server(owner, 'anglais-progress-v1:p4') || {}).points !== 7) errors.push("Zoé's progress is not on the server");
if ((server(owner, 'anglais-progress-v1:p3') || {}).points === 7) errors.push("Zoé's progress overwrote Max's");
if (back.status.pending || back.status.trouble) errors.push('something was left unsent');

// The second telephone, coming back to the app, sees Zoé too.
await b.evaluate(() => renderProfiles());
await b.evaluate(() => CLOUD.sync());
await until('Zoé reaches the second telephone', () => b.evaluate(() =>
  document.querySelectorAll('[data-profile]').length === 4));
await b.screenshot({ path: SHOTS + 'v54-four.png' });

// ---- the property is written from its frame, and goes up all the same ----
await b.click('[data-profile="p1"]');
await b.waitForTimeout(300);
await b.evaluate(() => openProperty());
await until('the property goes up', () => !!server(owner, 'reward-property-v1:p1'), 8000);
console.log("Léa's property on the server:", JSON.stringify((({ coins, owned }) => ({ coins, owned }))(server(owner, 'reward-property-v1:p1') || {})));
await b.evaluate(() => closeProperty());

// ---- a third telephone had its own Léa: she is the account's ----
const c = await phone('C');
await makeProfile(c, 'Lea', '6eme');
await c.evaluate(() => {
  progress.words['numbers:Deux'] = { level: 3, seen: 3, ok: 3, last: Date.now() };
  progress.days['2026-01-05'] = { n: 4, goal: 10, stamp: null, p: 12 };
  progress.points = 12;
  Store.save(progress);
});
await c.evaluate(() => renderProfiles());
await c.click('[data-account]');
await c.fill('#cloud-email', 'famille@example.fr');
await c.fill('#cloud-password', 'secret123');
await c.click('[data-sign-in]');
await until('the family comes down on the third telephone', () => c.evaluate(() =>
  document.querySelectorAll('[data-profile]').length === 4));
const merged = server(owner, 'anglais-progress-v1:p1') || { words: {} };
console.log('after the third telephone:', listOf(owner), '| Léa has', merged.points, 'points and',
  Object.keys(merged.words).length, 'words');
if (listOf(owner) !== 'p1:Léa p2:Tom p3:Max p4:Zoé') errors.push('the third Léa was made a second time');
if (!merged.words['numbers:Deux'] || merged.points !== 102) errors.push("the third Léa's work was not merged into Léa's");

// ---- signing out keeps everything on the telephone ----
await c.click('[data-account]');
await c.click('[data-sign-out]');
await c.waitForTimeout(300);
const out = await c.evaluate(() => ({
  status: CLOUD.status().signedIn,
  profiles: PROFILES.all().length,
  message: document.querySelector('[data-cloud-message]').textContent
}));
console.log('signed out:', JSON.stringify(out));
if (out.status || out.profiles !== 4) errors.push('signing out took something away');

// ---- the link from a "forgotten password" email ----
const d = await browser.newContext({ viewport: { width: 420, height: 900 } });
await d.route(SUPABASE + '/**', route => supabase(route, 'D'));
const reset = await d.newPage();
reset.on('pageerror', e => errors.push('D PAGEERROR ' + e.message));
await reset.goto(SITE + '/index.html#access_token=' + tokenFor(family) +
  '&expires_in=3600&refresh_token=refresh-' + owner + '&token_type=bearer&type=recovery');
await reset.waitForTimeout(500);
const asked = await reset.evaluate(() => ({
  hash: location.hash,
  field: !!document.querySelector('#cloud-password'),
  who: CLOUD.status().email
}));
await reset.fill('#cloud-password', 'nouveau456');
await reset.click('[data-new-password]');
await until('the new password is saved', () => reset.evaluate(() =>
  /enregistré/.test(document.querySelector('[data-cloud-message]').textContent)));
console.log('arriving from the email:', JSON.stringify(asked), '| password now', family.password);
if (asked.hash) errors.push('the tokens were left in the address bar');
if (!asked.field) errors.push('the new password was not asked for');
if (family.password !== 'nouveau456') errors.push('the new password did not reach the server');
await reset.screenshot({ path: SHOTS + 'v54-new-password.png' });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
