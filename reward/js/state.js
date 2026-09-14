/* =====================================================================
   STATE — the child's coins and everything they have put down, scene by
   scene.

   The purse is shared; the rest belongs to a scene (see scenes.js): the
   property outside, the inside of the house, and later a floor of a
   building on a bought plot. Every rule below — does this fit here, can
   this be paid for — applies to the scene the child is standing in.

   Everything is kept in one localStorage entry. The module owns the
   rules; the views only read the state and call these functions.

   Listeners registered with subscribe() are called after every change,
   which is how the coin counter, the shop and the property view stay in
   step without knowing about each other.
   ===================================================================== */
const PropertyState = (function () {

  const KEY = "reward-property-v1";
  const START_COINS = 150;

  function blank() {
    return {
      version: 3,
      coins: START_COINS,
      current: SCENES.first,
      scenes: SCENES.initial(),
      tiers: [],   // ranks already rewarded, so a reward is never paid twice
      nextUid: 1
    };
  }

  let migrated = false; // an old save was rewritten as it was read
  let data = load();
  const listeners = [];
  // Written back at once, so the conversion never happens twice.
  if (migrated) save();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw);
      if (!saved || !saved.version || saved.version > 3) return blank();
      const fresh = blank();

      if (saved.version === 3) {
        migrated = false;
        const loaded = Object.assign(fresh, saved);
        // Scenes added by a newer plan are kept, saved ones win.
        loaded.scenes = Object.assign(SCENES.initial(), saved.scenes);
        if (!loaded.scenes[loaded.current]) loaded.current = SCENES.first;
        return loaded;
      }

      /* Versions 1 and 2 knew a single place. Its objects become the
         property outside, and whatever waited in the version 1 chest is
         paid back rather than lost. */
      migrated = true;
      fresh.coins = saved.coins || 0;
      fresh.tiers = saved.tiers || [];
      fresh.nextUid = saved.nextUid || 1;
      if (Array.isArray(saved.placed)) fresh.scenes.outside.placed = saved.placed;
      if (saved.land) Object.assign(fresh.scenes.outside.land, saved.land);
      if (Array.isArray(saved.storage)) {
        fresh.coins += saved.storage.reduce((sum, entry) => {
          const item = CATALOG.item(entry.id);
          return sum + (item ? item.price : 0);
        }, 0);
      }
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
  function scene() { return data.scenes[data.current]; }

  function sceneId() { return data.current; }

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

  /* Can this item sit with its top-left corner on x,y? Two things only
     get in each other's way when they belong to the same layer: a path
     and a field fight over a tile, a hen and a path do not. What is
     built in — the house, a wall — takes both layers. ignoreUid lets
     something be tested against its own current spot while it is being
     moved. */
  function canPlace(item, x, y, ignoreUid) {
    if (!item) return false;
    const land = scene().land;
    if (x < 0 || y < 0 || x + item.w > land.cols || y + item.h > land.rows) return false;
    if (overlapsBlock(x, y, item.w, item.h)) return false;
    const layer = CATALOG.layerOf(item);
    return !scene().placed.some(entry => {
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

  /* ---- Buying, moving, selling ---- */

  /* An object is bought where it lands: one call takes the coins and
     puts it down, so the payment and the placement cannot come apart.
     Nothing is paid when the purse is short or the spot is taken. */
  function buyAt(id, x, y) {
    const item = CATALOG.item(id);
    if (!item || data.coins < item.price) return null;
    if (!canPlace(item, x, y, null)) return null;
    data.coins -= item.price;
    const uid = data.nextUid++;
    scene().placed.push({ uid, id, x, y });
    changed();
    return { uid };
  }

  function move(uid, x, y) {
    const entry = scene().placed.find(one => one.uid === uid);
    if (!entry) return false;
    const item = CATALOG.item(entry.id);
    if (!item || !canPlace(item, x, y, uid)) return false;
    entry.x = x;
    entry.y = y;
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

  function enter(id) {
    if (!data.scenes[id] || id === data.current) return false;
    data.current = id;
    changed();
    return true;
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
    scene, sceneId, enter,
    canPlace, blockAt,
    addCoins, grantTier,
    buyAt, move, sell, reset
  };
})();
