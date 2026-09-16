/* =====================================================================
   STATE — the child's coins and everything they have put down, scene by
   scene.

   The purse is shared; the rest belongs to a scene (see scenes.js): the
   property outside, the inside of the house, a cabin in the wood, a
   floor of the block of flats. Every rule below — does this fit here,
   can this be paid for — applies to the scene the child is standing in.

   The save holds the plots bought and the objects of each scene, never
   the map itself: the map is rebuilt from scenes.js on every load. A
   save written by an older version is carried over step by step (see
   STEPS below), never dropped.

   Everything is kept in one localStorage entry. The module owns the
   rules; the views only read the state and call these functions.

   Listeners registered with subscribe() are called after every change,
   which is how the coin counter, the shop and the property view stay in
   step without knowing about each other.
   ===================================================================== */
const PropertyState = (function () {

  const KEY = "reward-property-v1";
  const VERSION = 9;   // the shape of the save
  const START_COINS = 150;

  function blank() {
    return {
      version: VERSION,
      coins: START_COINS,
      current: SCENES.first,
      owned: [SCENES.FIRST_PLOT],  // plots bought, in the order they were
      placed: {},                  // what stands in each scene, by scene id
      tiers: [],                   // ranks already rewarded, never paid twice
      stamps: 0,                   // days of practice already rewarded
      nextUid: 1
    };
  }

  /* STEPS[n] turns a save of version n into one of version n + 1. Add
     one here the day the shape changes — never a wipe. It is declared
     before the save is read, which is why it sits this far up. */
  const STEPS = {
    /* 8 pays for the days of practice as well as the ranks. A property
       from before simply has none of them counted yet, so the first
       sync pays for the stamps already in the book — the regularity was
       real, it just had nothing to buy at the time. */
    7: saved => Object.assign({}, saved, { stamps: 0, version: 8 }),

    /* 9 lets an object be painted. An entry says nothing about its
       colour unless it has been given one, and no colour means the
       colour it is drawn in — which is what everything already down
       was wearing yesterday. So there is nothing to convert and
       nothing to pay back: the property comes across untouched. */
    8: saved => Object.assign({}, saved, { version: 9 })
  };

  let carried = 0;    // coins handed back while reading an older save

  let data = load();
  let built = null;   // the scenes, rebuilt from the plots owned
  rebuild();

  /* Whatever was read — a save from an older shape, an object that no
     longer fits — the file is written back in today's shape straight
     away, so a refund is never paid twice. */
  let mended = carried + mend();
  save();

  const listeners = [];

  /* The map is never saved: it is rebuilt from the plots bought, and the
     objects of each scene are hung back onto it. */
  function rebuild() {
    built = SCENES.build(data.owned);
    Object.keys(built).forEach(id => {
      if (!Array.isArray(data.placed[id])) data.placed[id] = [];
      built[id].placed = data.placed[id];
    });
    if (!built[data.current]) data.current = SCENES.first;
  }

  /* ---- Reading a save ----
     A property is never thrown away because the module has moved on.
     Every change of shape brings its own step below, which turns the
     version before it into the next one; what a step cannot carry over
     is paid back into the purse, which always means something. A save
     from a version we have no step for is taken the same way: the
     coins, the levels and the land are kept, and everything put down is
     refunded.

     The steps themselves are declared with the rest of the state, above:
     they have to exist before the first save is read. */

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return blank();
      // A file written by a later version: nothing sensible to read.
      if ((Number(saved.version) || 0) > VERSION) return blank();
      return adopt(saved);
    } catch (err) {
      return blank();
    }
  }

  function adopt(saved) {
    let data = saved;
    let version = Number(data.version) || 0;
    while (version < VERSION) {
      const step = STEPS[version];
      if (!step) return refunded(data);
      data = step(data);
      version = Number(data.version) || version + 1;
      data.version = version;
    }
    return settle(data);
  }

  // Whatever the shape, these are the fields the rest of the module reads.
  function settle(saved) {
    const fresh = blank();
    fresh.coins = Math.max(0, Math.round(Number(saved.coins) || 0));
    fresh.tiers = (Array.isArray(saved.tiers) ? saved.tiers : [])
      .filter(one => typeof one === "number" && one > 0);
    fresh.nextUid = Math.max(1, Number(saved.nextUid) || 1);
    fresh.stamps = Math.max(0, Math.round(Number(saved.stamps) || 0));
    const owned = (Array.isArray(saved.owned) ? saved.owned : []).filter(id => SCENES.plot(id));
    fresh.owned = owned.length ? owned : [SCENES.FIRST_PLOT];
    fresh.placed = saved.placed && typeof saved.placed === "object" ? saved.placed : {};
    fresh.current = saved.current || SCENES.first;
    return fresh;
  }

  /* The last resort, and the one the child should never notice much: the
     purse, the levels and the land are kept, and every object that was
     put down comes back as the coins it cost. */
  function refunded(saved) {
    const fresh = settle(saved);
    Object.keys(fresh.placed).forEach(id => {
      (fresh.placed[id] || []).forEach(entry => {
        const item = CATALOG.item(entry && entry.id);
        if (item) { fresh.coins += item.price; carried += item.price; }
      });
    });
    fresh.placed = {};
    return fresh;
  }

  /* Read after the scenes are built: an object whose drawing changed
     size, one standing where the map now has water or a wall, one the
     catalogue has dropped — each is paid back rather than left in a
     place where it no longer belongs. Returns what that cost. */
  function mend() {
    let paid = 0;
    Object.keys(built).forEach(id => {
      const place = built[id];
      const kept = [];
      place.placed.forEach(entry => {
        const item = CATALOG.item(entry && entry.id);
        if (item && fitsIn(place, kept, item, entry)) { kept.push(entry); return; }
        if (item) paid += item.price;
      });
      if (kept.length !== place.placed.length) {
        place.placed.splice(0, place.placed.length, ...kept);
      }
    });
    if (paid) { data.coins += paid; save(); }
    return paid;
  }

  function fitsIn(place, kept, item, entry) {
    const size = CATALOG.footprint(item, entry.r);
    if (!(entry.x >= 0 && entry.y >= 0)) return false;
    if (entry.x + size.w > place.land.cols || entry.y + size.h > place.land.rows) return false;
    if (!buildableIn(place, entry.x, entry.y, size.w, size.h, item)) return false;
    if (place.blocks.some(block => hits(entry, size, block, block))) return false;
    const layer = CATALOG.layerOf(item);
    return !kept.some(other => {
      const what = CATALOG.item(other.id);
      if (!what || CATALOG.layerOf(what) !== layer) return false;
      return hits(entry, size, other, CATALOG.footprint(what, other.r));
    });
  }

  function hits(entry, size, at, theirs) {
    return entry.x < at.x + theirs.w && entry.x + size.w > at.x &&
           entry.y < at.y + theirs.h && entry.y + size.h > at.y;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      /* A full or blocked storage must not break the game. */
    }
  }

  function changed() {
    save();
    listeners.forEach(fn => fn(data));
  }

  /* ---- Reading ---- */

  function get() { return data; }

  // The scene the child is standing in. Everything below works on it.
  function scene() { return built[data.current] || built[SCENES.first]; }

  function sceneId() { return data.current; }

  /* Only ground one owns can be built on: outside, the plots bought;
     inside, the floor of the room. The rest can be looked at, no more.

     Water is ground too, and one does not build on the sea — but a
     jetty, a boat, a swan belong there and nowhere else, so an object
     that floats is let through. Asked without an object (a bare tile,
     the way the view tests a press), the sea stays out of bounds. */
  function buildable(x, y, w, h, item) {
    return buildableIn(scene(), x, y, w, h, item);
  }

  // The same question asked of any scene, which is what mending needs.
  function buildableIn(place, x, y, w, h, item) {
    const plots = place.plots.filter(plot => plot.owned);
    const floats = CATALOG.floats(item);
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        const covered = plots.some(plot =>
          tx >= plot.x && tx < plot.x + plot.w && ty >= plot.y && ty < plot.y + plot.h);
        if (!covered) return false;
        if (!floats && Ground.look(place, tx, ty) === "water") return false;
      }
    }
    return true;
  }

  function blockAt(x, y) {
    return scene().blocks.find(block =>
      x >= block.x && x < block.x + block.w &&
      y >= block.y && y < block.y + block.h) || null;
  }

  function overlapsBlock(x, y, w, h) {
    return scene().blocks.some(block =>
      x < block.x + block.w && x + w > block.x &&
      y < block.y + block.h && y + h > block.y);
  }

  /* Can this item sit with its top-left corner on x,y, turned this way?
     Two things only get in each other's way when they belong to the same
     layer: a path and a field fight over a tile, a hen and a path do
     not. What is built in — the house, a wall — takes both layers.
     ignoreUid lets something be tested against its own current spot
     while it is being moved or turned. */
  function canPlace(item, x, y, ignoreUid, turn) {
    if (!item) return false;
    const size = CATALOG.footprint(item, turn);
    const land = scene().land;
    if (x < 0 || y < 0 || x + size.w > land.cols || y + size.h > land.rows) return false;
    if (!buildable(x, y, size.w, size.h, item)) return false;
    if (overlapsBlock(x, y, size.w, size.h)) return false;
    const layer = CATALOG.layerOf(item);
    return !scene().placed.some(entry => {
      if (entry.uid === ignoreUid) return false;
      const other = CATALOG.item(entry.id);
      if (!other || CATALOG.layerOf(other) !== layer) return false;
      const theirs = CATALOG.footprint(other, entry.r);
      return x < entry.x + theirs.w && x + size.w > entry.x &&
             y < entry.y + theirs.h && y + size.h > entry.y;
    });
  }

  /* ---- Coins ---- */

  function addCoins(amount) {
    data.coins = Math.max(0, data.coins + amount);
    changed();
    return data.coins;
  }

  /* Pays the reward for a rank of the learning app. Ranks already paid
     are ignored, so the main app can call this as often as it likes.
     The answer says which level the child was on and which one they are
     on now, because a level is what opens the shop's next shelf. */
  function grantTier(tier, amount) {
    if (data.tiers.indexOf(tier) !== -1) return null;
    const was = level();
    data.tiers.push(tier);
    data.coins += amount;
    changed();
    return { tier, amount, coins: data.coins, was, level: level() };
  }

  /* The level reached: the highest rank ever rewarded. It is worked out
     from the ranks themselves, so nothing can drift out of step. */
  function level() {
    return data.tiers.length ? Math.max.apply(null, data.tiers) : 0;
  }

  /* The days of practice, paid the same way: the learning app knows how
     many stamps are in the book, this side knows how many it has paid
     for, and the difference is what is owed. A stamp is worth less than
     a rank — it is the habit that is being rewarded, not the climb. */
  function grantStamps(count, amountFor) {
    const top = Math.max(0, Math.round(Number(count) || 0));
    const owed = top - data.stamps;
    if (owed <= 0) return { paid: 0, amount: 0, stamps: data.stamps, coins: data.coins };
    let amount = 0;
    for (let one = 0; one < owed; one++) amount += amountFor(level());
    data.stamps = top;
    data.coins += amount;
    changed();
    return { paid: owed, amount, stamps: data.stamps, coins: data.coins };
  }

  /* Catching up with the learning app, which knows the child's rank but
     not what has already been paid here: every rank up to that one is
     settled, the ones already paid are passed over, and the property is
     redrawn once at the end rather than a hundred times. */
  function grantUpTo(top, amountFor) {
    const was = level();
    let paid = 0;
    let amount = 0;
    for (let one = 1; one <= top; one++) {
      if (data.tiers.indexOf(one) !== -1) continue;
      data.tiers.push(one);
      const due = amountFor(one);
      data.coins += due;
      amount += due;
      paid++;
    }
    if (paid) changed();
    return { paid, amount, was, coins: data.coins, level: level() };
  }


  /* ---- Buying, moving, selling ---- */

  /* An object is bought where it lands: one call takes the coins and
     puts it down, so the payment and the placement cannot come apart.
     Nothing is paid when the purse is short or the spot is taken. */
  function buyAt(id, x, y, turn, mirror, colour) {
    const item = CATALOG.item(id);
    if (!item || data.coins < item.price) return null;
    if (!CATALOG.unlocked(item, level())) return null;   // not yet earned
    if (!canPlace(item, x, y, null, turn)) return null;
    data.coins -= item.price;
    const uid = data.nextUid++;
    const entry = { uid, id, x, y };
    // Only what has been turned, flipped or painted says so, so saves
    // stay readable and an old one still means what it always meant.
    if (turn) entry.r = turn;
    if (mirror) entry.m = 1;
    if (!CATALOG.plain(item, colour)) entry.c = colour;
    scene().placed.push(entry);
    changed();
    return { uid };
  }

  function move(uid, x, y) {
    const entry = scene().placed.find(one => one.uid === uid);
    if (!entry) return false;
    const item = CATALOG.item(entry.id);
    if (!item || !canPlace(item, x, y, uid, entry.r)) return false;
    entry.x = x;
    entry.y = y;
    changed();
    return true;
  }

  /* Flipped left to right, where it stands. The footprint does not
     change, so this can never be refused — every object can be flipped,
     even those whose drawing looks the same either way. */
  function mirror(uid) {
    const entry = scene().placed.find(one => one.uid === uid);
    if (!entry || !CATALOG.item(entry.id)) return false;
    if (entry.m) delete entry.m;
    else entry.m = 1;
    changed();
    return true;
  }

  /* Painted another colour, where it stands. Only the objects the
     catalogue sells in more than one colour can be, and only in one of
     their own colours; going back to the colour the drawing already has
     leaves no mark on the save at all. Nothing is charged: the colour
     is part of choosing the object, not a second object. */
  function paint(uid, colour) {
    const entry = scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item || !CATALOG.paintsOf(item)) return false;
    const worn = CATALOG.paintOf(item, colour);
    if (CATALOG.plain(item, worn)) delete entry.c;
    else entry.c = worn;
    changed();
    return true;
  }

  /* A quarter turn clockwise, on the spot. A bed that would no longer
     fit sideways stays as it was. */
  function turn(uid) {
    const entry = scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item || !item.turns) return false;
    const next = ((entry.r || 0) + 1) % 4;
    if (!canPlace(item, entry.x, entry.y, uid, next)) return false;
    entry.r = next;
    changed();
    return true;
  }

  // Sold back at the price it was bought for.
  function sell(uid) {
    const list = scene().placed;
    const index = list.findIndex(entry => entry.uid === uid);
    if (index === -1) return null;
    const item = CATALOG.item(list[index].id);
    list.splice(index, 1);
    const refund = item ? item.price : 0;
    data.coins += refund;
    changed();
    return refund;
  }

  /* ---- Going from one scene to another ---- */

  /* The way out of a room: its door, and the scene that door opens on.
     A floor above the ground has no door of its own, only stairs, so
     the way out is the door of the floor its stairs lead down to, as
     far down as it takes. Outside, there is nothing to leave. */
  function wayOut(id) {
    const seen = {};
    let place = built[id || data.current];
    while (place && place.indoor && !seen[place.id]) {
      seen[place.id] = true;
      const door = place.blocks.find(block => block.kind === "door" && block.to);
      if (door) return door.to;
      const down = place.blocks.find(block => block.kind === "stairs_down" && block.to);
      if (!down) return null;
      place = built[down.to];
    }
    return null;
  }

  function enter(id) {
    if (!built[id] || id === data.current) return false;
    data.current = id;
    changed();
    return true;
  }

  /* ---- Growing the property ----
     Every plot is on the map from the start and can be bought whenever
     the purse allows. A plot bought brings its ground out from under its
     veil, wakes its scenery, and opens the scenes its buildings lead
     to. */

  function plotsForSale() {
    return SCENES.plotsForSale(data.owned);
  }

  /* Any plot of the map can be bought, in any order, as soon as the
     purse allows: the whole map is on show from the first day. */
  function buyPlot(id) {
    const plot = SCENES.plot(id);
    if (!plot || data.owned.indexOf(id) !== -1) return null;
    if (data.coins < plot.price) return null;
    data.coins -= plot.price;
    data.owned.push(id);
    rebuild();
    changed();
    return plot;
  }

  function reset() {
    data = blank();
    rebuild();
    mended = 0;
    carried = 0;
    changed();
  }

  // What the last load had to pay back, so the child can be told.
  function mendedCoins() { return mended; }

  // Days of practice already paid for.
  function stamps() { return data.stamps; }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const index = listeners.indexOf(fn);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  return {
    get, subscribe,
    scene, sceneId, enter, wayOut,
    plotsForSale, buyPlot,
    canPlace, buildable, blockAt,
    addCoins, grantTier, grantUpTo, grantStamps, level, stamps, mendedCoins,
    buyAt, move, turn, mirror, paint, sell, reset
  };
})();
