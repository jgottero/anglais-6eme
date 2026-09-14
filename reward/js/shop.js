/* =====================================================================
   SHOP — the buying screen, which takes the whole display.

   It only offers what belongs where the child is standing: paths and
   cows outside, furniture and rugs inside, pets in both. The category
   chips stay at the top, the list of objects scrolls under them.

   Touching an object does not buy it: it puts it in the child's hand,
   closes the shop, and the object is paid for where it is put down.
   Nothing here drags, so the list scrolls the way a list should.

   A card shows both names of the object: the French one the child reads,
   and the English one a later version will teach out loud.
   ===================================================================== */
const Shop = (function () {

  // The family each scene opens on: the liveliest page of the two.
  const OPENS_ON = { outdoor: "animals", indoor: "furniture" };

  let tabsEl = null;
  let gridEl = null;
  let category = OPENS_ON.outdoor;
  let shownScene = null;
  let hooks = {};

  function init(options) {
    hooks = options || {};
    tabsEl = document.getElementById("shop-tabs");
    gridEl = document.getElementById("shop-grid");

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
    return PropertyState.scene().placed.filter(entry => entry.id === id).length;
  }

  function render() {
    if (!gridEl) return;
    const coins = PropertyState.get().coins;
    const place = PropertyState.scene();
    const indoor = place.indoor;
    const onSale = CATALOG.ITEMS.filter(item => CATALOG.fitsScene(item, indoor));
    const opensOn = indoor ? OPENS_ON.indoor : OPENS_ON.outdoor;

    // A new scene opens on its own family rather than keeping the last one.
    if (shownScene !== place.id) {
      shownScene = place.id;
      category = opensOn;
    }

    // Only the families that have something to sell in this scene.
    const families = CATALOG.CATEGORIES.filter(cat =>
      onSale.some(item => item.category === cat.id));
    if (!families.some(cat => cat.id === category)) {
      category = families.some(cat => cat.id === opensOn) ? opensOn : families[0].id;
    }

    tabsEl.innerHTML = families.map(cat =>
      '<button class="chip' + (cat.id === category ? " is-on" : "") + '" data-cat="' + cat.id + '">' +
        '<span aria-hidden="true">' + cat.icon + '</span> ' + cat.label +
      '</button>'
    ).join("");

    gridEl.innerHTML = onSale
      .filter(item => item.category === category)
      .map(item => {
        const owned = ownedCount(item.id);
        const affordable = coins >= item.price;
        return '<button class="card' + (affordable ? "" : " is-locked") + '" data-pick="' + item.id + '">' +
          '<span class="card-art">' +
            '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '" draggable="false">' +
            (owned ? '<span class="owned" title="Déjà posé ici">×' + owned + '</span>' : '') +
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
