/* =====================================================================
   STATE — the child's coins and everything they have put down, scene by
   scene.

   The purse is shared; the rest belongs to a scene (see scenes.js): the
   property outside, the inside of the house, a cabin in the wood, a
   floor of the block of flats. Every rule below — does this fit here,
   can this be paid for — applies to the scene the child is standing in.

   The save holds the plots bought and the objects of each scene, never
   the map itself: the map is rebuilt from scenes.js on every load. A
   save written by an older version is dropped rather than converted.

   Everything is kept in one localStorage entry. The module owns the
   rules; the views only read the state and call these functions.

   Listeners registered with subscribe() are called after every change,
   which is how the coin counter, the shop and the property view stay in
   step without knowing about each other.
   ===================================================================== */
const PropertyState = (function () {

  const KEY = "reward-property-v1";
  const VERSION = 7;   // the shape of the save; an older one is dropped
  const START_COINS = 150;

  function blank() {
    return {
      version: VERSION,
      coins: START_COINS,
      current: SCENES.first,
      owned: [SCENES.FIRST_PLOT],  // plots bought, in the order they were
      placed: {},                  // what stands in each scene, by scene id
      tiers: [],                   // ranks already rewarded, never paid twice
      nextUid: 1
    };
  }

  let data = load();
  let built = null;   // the scenes, rebuilt from the plots owned
  rebuild();
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

  /* Saves of an older shape are not converted: the grid under them is
     not the one we draw any more. A property from before starts again. */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== VERSION) return blank();
      const fresh = blank();
      fresh.coins = saved.coins || 0;
      fresh.tiers = saved.tiers || [];
      fresh.nextUid = saved.nextUid || 1;
      fresh.owned = Array.isArray(saved.owned) && saved.owned.length
        ? saved.owned : [SCENES.FIRST_PLOT];
      fresh.placed = saved.placed && typeof saved.placed === "object" ? saved.placed : {};
      fresh.current = saved.current || SCENES.first;
      return fresh;
    } catch (err) {
      return blank();
    }
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
    const place = scene();
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
  function buyAt(id, x, y, turn, mirror) {
    const item = CATALOG.item(id);
    if (!item || data.coins < item.price) return null;
    if (!CATALOG.unlocked(item, level())) return null;   // not yet earned
    if (!canPlace(item, x, y, null, turn)) return null;
    data.coins -= item.price;
    const uid = data.nextUid++;
    const entry = { uid, id, x, y };
    // Only what has been turned or flipped says so, so saves stay readable.
    if (turn) entry.r = turn;
    if (mirror) entry.m = 1;
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
    changed();
  }

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
    addCoins, grantTier, grantUpTo, level,
    buyAt, move, turn, mirror, sell, reset
  };
})();
