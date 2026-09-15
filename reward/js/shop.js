/* =====================================================================
   SHOP — the buying screen, which takes the whole display.

   It only offers what belongs where the child is standing: paths and
   cows outside, furniture and rugs inside, pets in both. The category
   chips stay at the top, the list of objects scrolls under them.

   Touching an object does not buy it: it puts it in the child's hand,
   closes the shop, and the object is paid for where it is put down.
   Nothing here drags, so the list scrolls the way a list should.

   A card leads with the English name — that is what the child is here
   to learn — and keeps the French one underneath to say which object it
   is.

   What is on the shelves depends on the level reached in the lessons:
   everything earned so far, and then, greyed out at the end of each
   family, the batch the next levels will bring. Seeing what is coming
   is half the reason to go back to the exercises.
   ===================================================================== */
const Shop = (function () {

  // The family each scene opens on: the liveliest page of the two.
  const OPENS_ON = { outdoor: "animals", indoor: "furniture" };

  let tabsEl = null;
  let gridEl = null;
  let levelEl = null;
  let category = OPENS_ON.outdoor;
  let shownScene = null;
  let hooks = {};

  function init(options) {
    hooks = options || {};
    tabsEl = document.getElementById("shop-tabs");
    gridEl = document.getElementById("shop-grid");
    levelEl = document.getElementById("shop-level");

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
      if (!CATALOG.unlocked(item, PropertyState.level())) {
        if (hooks.onRefused) {
          hooks.onRefused("« " + item.fr + " » arrive au niveau " + item.level + ".");
        }
        return;
      }
      if (PropertyState.get().coins < item.price) {
        if (hooks.onRefused) hooks.onRefused("Il te manque des pièces pour « " + item.fr + " ».");
        return;
      }
      if (hooks.onPick) hooks.onPick(item);
    });

    render();
  }

  function ownedCount(id) {
    return PropertyState.scene().placed.filter(entry => entry.id === id).length;
  }

  /* The batch shown greyed out at the end of a family: the one the next
     level to bring anything there will bring, and no more than that. */
  function comingIn(family, level) {
    const later = family.filter(item => !CATALOG.unlocked(item, level));
    if (!later.length) return [];
    const next = Math.min.apply(null, later.map(item => item.level));
    return later.filter(item => item.level === next);
  }

  function card(item, coins, level) {
    const coming = !CATALOG.unlocked(item, level);
    const owned = coming ? 0 : ownedCount(item.id);
    const affordable = coins >= item.price;
    return '<button class="card' +
      (coming ? " is-coming" : affordable ? "" : " is-locked") +
      '" data-pick="' + item.id + '">' +
      '<span class="card-art">' +
        '<img src="' + CATALOG.cardUrl(item.id) + '" alt="' + item.fr + '" draggable="false">' +
        (owned ? '<span class="owned" title="Déjà posé ici">×' + owned + '</span>' : '') +
        (coming ? '<span class="coming">niv. ' + item.level + '</span>' : '') +
      '</span>' +
      '<span class="name">' + item.en + '</span>' +
      '<span class="sub">' + item.fr + '</span>' +
      '<span class="size">' + (CATALOG.layerOf(item) === "ground" ? "terrain" : "") + '</span>' +
      '<span class="price">' +
        '<img class="coin" src="assets/coin.svg" alt="pièces"> ' + item.price +
      '</span>' +
    '</button>';
  }

  /* The line under the title: how far along the hundred levels the child
     is, and what the next one brings. */
  function renderLevel(level) {
    if (!levelEl) return;
    const next = CATALOG.nextLevel(level);
    levelEl.innerHTML = '<b>Niveau ' + level + '</b> / ' + CATALOG.LAST_LEVEL +
      (next === null
        ? " — tout est débloqué !"
        : " · " + CATALOG.newAt(next).length + " nouveautés au niveau " + next);
  }

  function render() {
    if (!gridEl) return;
    const coins = PropertyState.get().coins;
    const level = PropertyState.level();
    const place = PropertyState.scene();
    const indoor = place.indoor;
    const here = CATALOG.ITEMS.filter(item => CATALOG.fitsScene(item, indoor));
    const onSale = here.filter(item => CATALOG.unlocked(item, level));
    const opensOn = indoor ? OPENS_ON.indoor : OPENS_ON.outdoor;

    // A new scene opens on its own family rather than keeping the last one.
    if (shownScene !== place.id) {
      shownScene = place.id;
      category = opensOn;
    }

    // Only the families that have something to sell here and now.
    const families = CATALOG.CATEGORIES.filter(cat =>
      onSale.some(item => item.category === cat.id));
    if (!families.length) return;
    if (!families.some(cat => cat.id === category)) {
      category = families.some(cat => cat.id === opensOn) ? opensOn : families[0].id;
    }

    tabsEl.innerHTML = families.map(cat =>
      '<button class="chip' + (cat.id === category ? " is-on" : "") + '" data-cat="' + cat.id + '">' +
        '<span aria-hidden="true">' + cat.icon + '</span> ' + cat.label +
      '</button>'
    ).join("");

    renderLevel(level);

    const family = here.filter(item => item.category === category);
    gridEl.innerHTML = family
      .filter(item => CATALOG.unlocked(item, level))
      .concat(comingIn(family, level))
      .map(item => card(item, coins, level))
      .join("");
  }

  return { init, render };
})();
