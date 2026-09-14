/* =====================================================================
   STATE — the child's property: coins, what has been bought, and where
   each object stands.

   Everything is kept in one localStorage entry. The module owns the
   rules (can I afford this? does this object fit here?); the views only
   read the state and call these functions.

   Listeners registered with subscribe() are called after every change,
   which is how the coin counter, the shop and the property view stay in
   step without knowing about each other.
   ===================================================================== */
const PropertyState = (function () {

  const KEY = "reward-property-v1";
  const START_COINS = 150;

  // The starting plot. Both will grow when buying land is implemented.
  const LAND = { cols: 14, rows: 10 };
  const HOUSE = { x: 5, y: 0, w: 4, h: 3 };

  function blank() {
    return {
      version: 1,
      coins: START_COINS,
      land: { cols: LAND.cols, rows: LAND.rows },
      house: { x: HOUSE.x, y: HOUSE.y, w: HOUSE.w, h: HOUSE.h },
      placed: [],   // { uid, id, x, y } — x,y is the top-left tile
      storage: [],  // { uid, id } — bought but not on the ground yet
      tiers: [],    // ranks already rewarded, so a reward is never paid twice
      nextUid: 1
    };
  }

  let data = load();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw);
      // Unknown or older saves start over rather than crash the prototype.
      if (!saved || saved.version !== 1) return blank();
      const fresh = blank();
      return Object.assign(fresh, saved, {
        land: Object.assign(fresh.land, saved.land),
        house: Object.assign(fresh.house, saved.house)
      });
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

  // What sits on a tile. Objects come before ground, so the topmost thing
  // is the one answered first.
  function placedAt(x, y, layer) {
    const covers = entry => {
      const item = CATALOG.item(entry.id);
      if (!item) return false;
      if (layer && CATALOG.layerOf(item) !== layer) return false;
      return x >= entry.x && x < entry.x + item.w && y >= entry.y && y < entry.y + item.h;
    };
    return data.placed.filter(covers)
      .sort((a, b) => CATALOG.layerOf(CATALOG.item(a.id)) === "ground" ? 1 : -1)[0] || null;
  }

  function overlapsHouse(x, y, w, h) {
    const house = data.house;
    return x < house.x + house.w && x + w > house.x &&
           y < house.y + house.h && y + h > house.y;
  }

  /* Can this item sit with its top-left corner on x,y? Two things only
     get in each other's way when they belong to the same layer: a path
     and a field fight over a tile, a hen and a path do not. The house
     takes both layers. ignoreUid lets something be tested against its
     own current spot while it is being moved. */
  function canPlace(item, x, y, ignoreUid) {
    if (!item) return false;
    if (x < 0 || y < 0 || x + item.w > data.land.cols || y + item.h > data.land.rows) return false;
    if (overlapsHouse(x, y, item.w, item.h)) return false;
    const layer = CATALOG.layerOf(item);
    return !data.placed.some(entry => {
      if (entry.uid === ignoreUid) return false;
      const other = CATALOG.item(entry.id);
      if (!other || CATALOG.layerOf(other) !== layer) return false;
      return x < entry.x + other.w && x + item.w > entry.x &&
             y < entry.y + other.h && y + item.h > entry.y;
    });
  }

  /* ---- Coins ---- */

  function addCoins(amount) {
    data.coins = Math.max(0, data.coins + amount);
    changed();
    return data.coins;
  }

  /* Pays the reward for a rank of the learning app. Ranks already paid
     are ignored, so the main app can call this as often as it likes. */
  function grantTier(tier, amount) {
    if (data.tiers.indexOf(tier) !== -1) return null;
    data.tiers.push(tier);
    data.coins += amount;
    changed();
    return { tier, amount, coins: data.coins };
  }

  /* ---- Buying, placing, selling ---- */

  // A purchase always lands in the chest; the child then drags it out
  // onto the spot they want.
  function buy(id) {
    const item = CATALOG.item(id);
    if (!item || data.coins < item.price) return null;
    data.coins -= item.price;
    const uid = data.nextUid++;
    data.storage.push({ uid, id });
    changed();
    return { uid };
  }

  /* Bought and dropped in one gesture, straight from the shop: the object
     never passes through the chest. Nothing is paid if the spot is taken. */
  function buyAt(id, x, y) {
    const item = CATALOG.item(id);
    if (!item || data.coins < item.price) return null;
    if (!canPlace(item, x, y, null)) return null;
    data.coins -= item.price;
    const uid = data.nextUid++;
    data.placed.push({ uid, id, x, y });
    changed();
    return { uid };
  }

  function place(uid, x, y) {
    const index = data.storage.findIndex(entry => entry.uid === uid);
    if (index === -1) return false;
    const item = CATALOG.item(data.storage[index].id);
    if (!item || !canPlace(item, x, y, uid)) return false;
    data.placed.push({ uid, id: data.storage[index].id, x, y });
    data.storage.splice(index, 1);
    changed();
    return true;
  }

  function move(uid, x, y) {
    const entry = data.placed.find(one => one.uid === uid);
    if (!entry) return false;
    const item = CATALOG.item(entry.id);
    if (!item || !canPlace(item, x, y, uid)) return false;
    entry.x = x;
    entry.y = y;
    changed();
    return true;
  }

  // Back into the chest, keeping the object (and its value).
  function store(uid) {
    const index = data.placed.findIndex(entry => entry.uid === uid);
    if (index === -1) return false;
    data.storage.push({ uid, id: data.placed[index].id });
    data.placed.splice(index, 1);
    changed();
    return true;
  }

  // Sold back at the price it was bought for, wherever it is.
  function sell(uid) {
    const lists = [data.placed, data.storage];
    for (const list of lists) {
      const index = list.findIndex(entry => entry.uid === uid);
      if (index === -1) continue;
      const item = CATALOG.item(list[index].id);
      list.splice(index, 1);
      const refund = item ? item.price : 0;
      data.coins += refund;
      changed();
      return refund;
    }
    return null;
  }

  function reset() {
    data = blank();
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
    canPlace, placedAt,
    addCoins, grantTier,
    buy, buyAt, place, move, store, sell, reset
  };
})();
