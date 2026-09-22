/* Rooms a ground tile fits, and a lift instead of a staircase.

   Every terrain tile is two squares by two, so a room that measures
   odd leaves a bare strip along one wall whatever the child does. The
   rule held here is therefore the one the plans are drawn to: every
   room of every interior is an even number of tiles both ways, and
   whatever is built inside a room — the lifts of the entrance — stands
   on that same grid of two.

   The rest is the entrance: a lobby just wide enough for the ways up
   and down, side by side, with the door out below them on the ground
   floor. The space they used to take out of the middle of a room is a
   room of its own now, and the buildings have grown to match.

   In a block of flats the way up is a lift; the stairs are left to the
   houses. Which one it is changes nothing but the drawing: both say
   where they lead, and the module reads that rather than the name. */
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
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push('CONSOLE ' + m.text()); });

await page.goto(SITE + '/reward/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);
await page.evaluate(() => {
  REWARD.grantTier(100); REWARD.addCoins(200000);
  let again = true;
  while (again) { again = false; PropertyState.plotsForSale().forEach(p => { if (PropertyState.buyPlot(p.id)) again = true; }); }
});
await page.waitForTimeout(500);

/* The rooms of an interior, found the way a plan is read: the doorways
   are stopped up — a gap of one or two tiles through a wall, floor on
   both of its long sides — and what is left standing alone is a room. */
const rooms = await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const out = {};
  Object.keys(all).forEach(id => {
    const place = all[id];
    if (!place.indoor) return;
    const cols = place.land.cols, rows = place.land.rows;
    const grid = [];
    for (let y = 0; y < rows; y++) grid.push(new Array(cols).fill('.'));
    place.blocks.forEach(b => {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        if (grid[y]) grid[y][x] = b.kind;
      }
    });
    const at = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows) ? grid[y][x] : null;
    const free = (x, y) => at(x, y) === '.';

    const doors = [];
    const look = (across) => {
      const outer = across ? rows : cols;
      const inner = across ? cols : rows;
      for (let a = 0; a < outer; a++) {
        for (let b = 0; b < inner; b++) {
          const here = across ? [b, a] : [a, b];
          if (!free(here[0], here[1])) continue;
          let run = 1;
          const step = i => across ? [b + i, a] : [a, b + i];
          while (free.apply(null, step(run))) run++;
          const before = step(-1), after = step(run);
          if (run <= 2 && at(before[0], before[1]) &&
              at(before[0], before[1]) === at(after[0], after[1])) {
            let through = true;
            for (let i = 0; i < run; i++) {
              const one = step(i);
              const sides = across
                ? [[one[0], one[1] - 1], [one[0], one[1] + 1]]
                : [[one[0] - 1, one[1]], [one[0] + 1, one[1]]];
              if (!free(sides[0][0], sides[0][1]) || !free(sides[1][0], sides[1][1])) through = false;
            }
            if (through) for (let i = 0; i < run; i++) doors.push(step(i));
          }
          b += run - 1;
        }
      }
    };
    look(true);
    look(false);
    doors.forEach(one => { grid[one[1]][one[0]] = 'doorway'; });

    const seen = [];
    for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
    const found = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== '.' || seen[y][x]) continue;
      const cells = [[x, y]];
      seen[y][x] = true;
      for (let i = 0; i < cells.length; i++) {
        const cx = cells[i][0], cy = cells[i][1];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(step => {
          const nx = cx + step[0], ny = cy + step[1];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
          if (grid[ny][nx] !== '.' || seen[ny][nx]) return;
          seen[ny][nx] = true;
          cells.push([nx, ny]);
        });
      }
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
      const w = Math.max.apply(null, xs) - x0 + 1, h = Math.max.apply(null, ys) - y0 + 1;
      const has = {};
      cells.forEach(c => { has[c[0] + ',' + c[1]] = true; });
      // Every square of the room belongs to a whole tile of two by two.
      const tiled = cells.every(c => {
        const ax = x0 + 2 * Math.floor((c[0] - x0) / 2), ay = y0 + 2 * Math.floor((c[1] - y0) / 2);
        return has[ax + ',' + ay] && has[(ax + 1) + ',' + ay] &&
               has[ax + ',' + (ay + 1)] && has[(ax + 1) + ',' + (ay + 1)];
      });
      found.push({ w, h, x: x0, y: y0, tiled, squares: cells.length });
    }
    out[id] = { cols, rows, doors: doors.length, rooms: found };
  });
  return out;
});

Object.keys(rooms).forEach(id => {
  const place = rooms[id];
  const say = place.rooms.map(r => r.w + 'x' + r.h + '@' + r.x + ',' + r.y + (r.tiled ? '' : ' RAGGED'));
  console.log((id + '            ').slice(0, 13), (place.cols + 'x' + place.rows + '      ').slice(0, 7),
    place.doors + ' doorways  ', say.join('  '));
  place.rooms.forEach(r => {
    if (!r.tiled) errors.push(id + ' has a room of ' + r.w + 'x' + r.h + ' that a tile of two cannot fill');
  });
});

// ---- the entrance ----
const lobbies = await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const out = {};
  Object.keys(all).forEach(id => {
    const place = all[id];
    if (!place.indoor) return;
    const ways = place.blocks.filter(b => SCENES.climbs(b.kind));
    if (!ways.length) return;
    const door = place.blocks.find(b => b.kind === 'door');
    out[id] = {
      ways: ways.map(b => b.kind),
      // Side by side: the same row, the same height, and touching.
      sideBySide: ways.length < 2 ||
        (ways[0].y === ways[1].y && ways[0].h === ways[1].h &&
         Math.abs(ways[0].x - ways[1].x) === ways[0].w),
      squares: ways.map(b => b.w + 'x' + b.h).join(' '),
      // The door of the ground floor is under the entrance, not adrift.
      doorBelow: !door || (door.x >= ways[0].x - 2 && door.x <= ways[0].x + 4)
    };
  });
  return out;
});
console.log('the entrances:', JSON.stringify(lobbies, null, 0).replace(/","/g, '", "'));
Object.keys(lobbies).forEach(id => {
  const one = lobbies[id];
  if (!one.sideBySide) errors.push(id + ' has its two ways up and down apart');
  if (!one.doorBelow) errors.push(id + ' has its door away from the entrance');
  if (one.squares.split(' ').some(s => s !== '2x2')) errors.push(id + ' has a way up of ' + one.squares);
});

// ---- a lift in the flats, stairs left to the houses ----
console.log('how one goes up:', JSON.stringify(await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const seen = {};
  Object.keys(all).forEach(id => {
    all[id].blocks.forEach(b => {
      if (SCENES.climbs(b.kind)) seen[id] = (seen[id] || []).concat(SCENES.kind(b.kind).fr);
    });
  });
  return seen;
})));
const stillStairs = await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  return Object.keys(all).filter(id => all[id].blocks
    .some(b => b.kind === 'stairs_up' || b.kind === 'stairs_down'));
});
if (stillStairs.length) errors.push('climbed by stairs still: ' + stillStairs.join(', '));

// ---- room enough, and the way up still leads somewhere ----
console.log('room enough:', JSON.stringify(await page.evaluate(() => {
  const all = SCENES.build(SCENES.PLOTS.map(p => p.id));
  const squares = id => all[id].land.cols * all[id].land.rows;
  return {
    house: squares('house'),
    flats: squares('flat_1'), tower: squares('tower_a1'), long: squares('loft_1'),
    allBiggerThanHome: ['flat_1', 'tower_a1', 'loft_1'].every(id => squares(id) > squares('house') * 1.5)
  };
})));
console.log('and the floors still stack:', JSON.stringify(await page.evaluate(() => ({
  flats: PropertyState.floors('flat_2').map(f => f.id),
  tower: PropertyState.floors('tower_a1').map(f => f.id),
  wayOutOfTheTop: PropertyState.wayOut('tower_a4')
}))));

/* ---- A property furnished before the walls moved ----
   The plans changed, so some of what was put down is standing in a
   wall now. Nothing is lost quietly: what no longer fits comes back as
   the coins it cost, and the module says so on the way in. */
const before = await page.evaluate(() => {
  const key = 'reward-property-v1';
  const saved = JSON.parse(localStorage.getItem(key));
  const bench = CATALOG.item('bench') || CATALOG.all()[0];
  // A row straight across the old ground floor, walls and all.
  saved.placed.flat_1 = [];
  for (let x = 1; x < 24; x += 2) {
    saved.placed.flat_1.push({ uid: 900 + x, id: bench.id, x, y: 3 });
  }
  saved.coins = 1000;
  saved.nextUid = 1000;
  localStorage.setItem(key, JSON.stringify(saved));
  return { put: saved.placed.flat_1.length, each: bench.price, coins: saved.coins };
});
await page.reload();
await page.waitForTimeout(700);
const after = await page.evaluate(() => ({
  kept: PropertyState.get().placed.flat_1.length,
  coins: PropertyState.get().coins,
  handedBack: PropertyState.mendedCoins()
}));
console.log('a property from before the walls moved:', JSON.stringify(before), '->', JSON.stringify(after));
if (after.kept + after.handedBack / before.each !== before.put) {
  errors.push('what was put down neither stands nor came back: ' +
    after.kept + ' kept, ' + after.handedBack + ' coins returned of ' + before.put + ' objects');
}
if (after.coins !== before.coins + after.handedBack) errors.push('the refund never reached the purse');
if (!after.kept) errors.push('everything was swept away, even what still fits');

// What it looks like, entrance and all.
await page.evaluate(() => PropertyState.enter('flat_2'));
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'v51-lift-lobby.png' });
await page.evaluate(() => PropertyState.enter('house'));
await page.waitForTimeout(500);
await page.screenshot({ path: SHOTS + 'v51-house.png' });

console.log(errors.length ? 'BROKEN\n' + errors.join('\n') : 'no errors');
await browser.close();
