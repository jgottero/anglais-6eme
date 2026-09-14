/* =====================================================================
   SHOP — the buying tab.

   One card per catalogue entry, filtered by category. A card shows both
   names of the object: the French one the child reads, and the English
   one a later version will teach out loud.
   ===================================================================== */
const Shop = (function () {

  let tabsEl = null;
  let gridEl = null;
  let category = CATALOG.CATEGORIES[0].id;
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
    });

    gridEl.addEventListener("click", event => {
      const button = event.target.closest("[data-buy]");
      if (!button) return;
      const item = CATALOG.item(button.dataset.buy);
      const result = PropertyState.buy(item.id);
      if (!result) {
        if (hooks.onRefused) hooks.onRefused("Il te manque des pièces pour « " + item.fr + " ».");
        return;
      }
      if (hooks.onBought) hooks.onBought(item, result.placed);
    });

    render();
  }

  function ownedCount(id) {
    const data = PropertyState.get();
    return data.placed.filter(entry => entry.id === id).length +
           data.storage.filter(entry => entry.id === id).length;
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
        return '<article class="card' + (affordable ? "" : " is-locked") + '">' +
          '<div class="card-art">' +
            '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '">' +
            (owned ? '<span class="owned" title="Déjà possédé">×' + owned + '</span>' : '') +
          '</div>' +
          '<h3>' + item.fr + '</h3>' +
          '<p class="en">' + item.en + '</p>' +
          '<p class="size">' + item.w + '×' + item.h + ' case' + (item.w * item.h > 1 ? "s" : "") + '</p>' +
          '<button class="buy" data-buy="' + item.id + '"' + (affordable ? "" : " disabled") + '>' +
            '<img class="coin" src="assets/coin.svg" alt="pièces"> ' + item.price +
          '</button>' +
        '</article>';
      }).join("");
  }

  return { init, render };
})();
