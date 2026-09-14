/* =====================================================================
   SHOP — the buying screen, which takes the whole display.

   The category chips stay at the top, the list of objects scrolls under
   them. Touching an object does not buy it: it puts it in the child's
   hand, closes the shop, and the object is paid for where it is put
   down. Nothing here drags, so the list scrolls the way a list should.

   A card shows both names of the object: the French one the child reads,
   and the English one a later version will teach out loud.
   ===================================================================== */
const Shop = (function () {

  let tabsEl = null;
  let gridEl = null;
  // Opens on the animals: a livelier first page than the two ground tiles.
  const OPENS_ON = "animals";
  let category = CATALOG.CATEGORIES.some(cat => cat.id === OPENS_ON)
    ? OPENS_ON : CATALOG.CATEGORIES[0].id;
  let hooks = {};

  function init(options) {
    hooks = options || {};
    tabsEl = document.getElementById("shop-tabs");
    gridEl = document.getElementById("shop-grid");

    tabsEl.innerHTML = CATALOG.CATEGORIES.map(cat =>
      '<button class="chip" data-cat="' + cat.id + '">' +
        '<span aria-hidden="true">' + cat.icon + '</span> ' + cat.label +
      '</button>'
    ).join("");

    tabsEl.addEventListener("click", event => {
      const button = event.target.closest("[data-cat]");
      if (!button) return;
      category = button.dataset.cat;
      render();
      gridEl.scrollTop = 0;
    });

    gridEl.addEventListener("click", event => {
      const card = event.target.closest("[data-pick]");
      if (!card) return;
      const item = CATALOG.item(card.dataset.pick);
      if (!item) return;
      if (PropertyState.get().coins < item.price) {
        if (hooks.onRefused) hooks.onRefused("Il te manque des pièces pour « " + item.fr + " ».");
        return;
      }
      if (hooks.onPick) hooks.onPick(item);
    });

    render();
  }

  function ownedCount(id) {
    return PropertyState.get().placed.filter(entry => entry.id === id).length;
  }

  function render() {
    if (!gridEl) return;
    const coins = PropertyState.get().coins;

    Array.from(tabsEl.children).forEach(button => {
      button.classList.toggle("is-on", button.dataset.cat === category);
    });

    gridEl.innerHTML = CATALOG.ITEMS
      .filter(item => item.category === category)
      .map(item => {
        const owned = ownedCount(item.id);
        const affordable = coins >= item.price;
        return '<button class="card' + (affordable ? "" : " is-locked") + '" data-pick="' + item.id + '">' +
          '<span class="card-art">' +
            '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '" draggable="false">' +
            (owned ? '<span class="owned" title="Déjà sur ton terrain">×' + owned + '</span>' : '') +
          '</span>' +
          '<span class="fr">' + item.fr + '</span>' +
          '<span class="en">' + item.en + '</span>' +
          '<span class="size">' + item.w + '×' + item.h + ' case' + (item.w * item.h > 1 ? "s" : "") +
            (CATALOG.layerOf(item) === "ground" ? " · terrain" : "") + '</span>' +
          '<span class="price">' +
            '<img class="coin" src="assets/coin.svg" alt="pièces"> ' + item.price +
          '</span>' +
        '</button>';
      }).join("");
  }

  return { init, render };
})();
