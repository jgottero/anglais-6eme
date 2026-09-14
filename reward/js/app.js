/* =====================================================================
   APP — the overlay on top of the property: coins, shop, chest, back,
   and the bridge the learning app uses to pay for a new rank.

   The learning app never touches the state directly. It either calls
   REWARD.grantTier(rank) when the module is on the same page, or posts
   { type: "reward:tier", tier: n } to the iframe holding this module.
   ===================================================================== */
(function () {

  /* ---- What a rank is worth ----
     Enough for a small animal at every rank, and a real prize every ten
     ranks so a long run of work ends on something big. */
  function rewardForTier(tier) {
    return 50 + (tier % 10 === 0 ? 150 : 0);
  }

  const COINS_PER_TAP = 100; // prototype only: tapping the purse pays

  let coinsEl, purseEl, badgeEl, chestGridEl, barEl, placingBarEl, toastEl;
  let panels = {};
  let openPanelName = null;
  let shownCoins = null;

  function ready() {
    coinsEl = document.getElementById("coins");
    purseEl = document.getElementById("purse");
    badgeEl = document.getElementById("chest-badge");
    chestGridEl = document.getElementById("chest-grid");
    barEl = document.getElementById("action-bar");
    placingBarEl = document.getElementById("placing-bar");
    toastEl = document.getElementById("toast");
    panels = {
      shop: document.getElementById("panel-shop"),
      chest: document.getElementById("panel-chest")
    };

    World.init({
      onSelect: renderActionBar,
      onPlacingChange: onPlacingChange,
      onRefused: toast,
      onChestDragStart: () => document.body.classList.add("is-chest-drag"),
      onChestDragEnd: onChestDragEnd
    });

    Shop.init({
      onBought: item => toast(item.fr + " acheté ! C'est dans ton coffre."),
      onRefused: toast
    });

    setUpHud();
    setUpChest();
    setUpDevPanel();

    PropertyState.subscribe(refresh);
    refresh();
    toast("Glisse le terrain pour te déplacer, pince pour zoomer.");
  }

  /* ---- Overlay buttons ---- */

  function setUpHud() {
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.addEventListener("click", () => {
        openPanel(openPanelName === button.dataset.panel ? null : button.dataset.panel);
      });
    });
    document.querySelectorAll("[data-close]").forEach(button => {
      button.addEventListener("click", () => openPanel(null));
    });

    // Prototype shortcut, standing in for the learning app.
    purseEl.addEventListener("click", () => {
      PropertyState.addCoins(COINS_PER_TAP);
      toast("+" + COINS_PER_TAP + " pièces");
    });

    document.getElementById("back").addEventListener("click", () => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: "reward:back" }, "*");
      }
      toast("Bientôt : retour aux exercices d'anglais.");
    });

    document.getElementById("cancel-placing")
      .addEventListener("click", () => World.cancelPlacing());

    barEl.addEventListener("click", onActionBarClick);
  }

  function openPanel(name) {
    openPanelName = name;
    Object.keys(panels).forEach(key => { panels[key].hidden = key !== name; });
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.classList.toggle("is-on", button.dataset.panel === name);
    });
    if (name) {
      World.cancelPlacing();
      World.clearSelection();
    }
    if (name === "shop") Shop.render();
  }

  /* ---- Chest ----
     Its objects are dragged straight onto the property: the press is
     caught here and handed over to the world, which follows the pointer
     from there on. */

  function setUpChest() {
    chestGridEl.addEventListener("pointerdown", event => {
      const handle = event.target.closest("[data-drag]");
      if (!handle) return;
      event.preventDefault();
      World.dragFromChest(Number(handle.dataset.drag), event);
    });

    chestGridEl.addEventListener("click", event => {
      const sellButton = event.target.closest("[data-sell]");
      if (!sellButton) return;
      const refund = PropertyState.sell(Number(sellButton.dataset.sell));
      if (refund !== null) toast("Vendu. +" + refund + " pièces.");
    });
  }

  function onChestDragEnd() {
    document.body.classList.remove("is-chest-drag");
    if (!PropertyState.get().storage.length) openPanel(null);
  }

  function renderChest(data) {
    badgeEl.hidden = !data.storage.length;
    badgeEl.textContent = data.storage.length;

    if (!data.storage.length) {
      chestGridEl.innerHTML = '<p class="empty">Ton coffre est vide. Va faire un tour au magasin !</p>';
      return;
    }
    chestGridEl.innerHTML = data.storage.map(entry => {
      const item = CATALOG.item(entry.id);
      if (!item) return "";
      return '<article class="card">' +
        '<div class="card-art" data-drag="' + entry.uid + '" title="Glisse-moi sur le terrain">' +
          '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '" draggable="false">' +
        '</div>' +
        '<h3>' + item.fr + '</h3>' +
        '<p class="en">' + item.en + '</p>' +
        '<button class="mini-btn" data-sell="' + entry.uid + '">Vendre +' + item.price + '</button>' +
      '</article>';
    }).join("");
  }

  /* ---- Redrawing after any change ---- */

  function refresh() {
    const data = PropertyState.get();
    renderCoins(data.coins);
    renderChest(data);
    if (openPanelName === "shop") Shop.render();
    World.render();
    renderActionBar(World.selected());
  }

  function renderCoins(coins) {
    coinsEl.textContent = coins;
    if (shownCoins !== null && coins !== shownCoins) {
      purseEl.classList.remove("is-bumped");
      void purseEl.offsetWidth; // restart the animation
      purseEl.classList.add("is-bumped");
    }
    shownCoins = coins;
  }

  function onPlacingChange(uid) {
    placingBarEl.hidden = !uid;
    if (!uid) return;
    openPanel(null);
    const entry = PropertyState.get().storage.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (item) {
      document.getElementById("placing-name").textContent =
        "Où poser «\u00A0" + item.fr + "\u00A0»\u00A0? Touche le terrain.";
    }
  }

  function renderActionBar(uid) {
    if (!uid) { barEl.hidden = true; return; }
    openPanel(null);
    const entry = PropertyState.get().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) { barEl.hidden = true; return; }

    barEl.hidden = false;
    barEl.innerHTML =
      '<div class="bar-id">' +
        '<img src="' + CATALOG.assetUrl(item.id) + '" alt="">' +
        '<div><b>' + item.fr + '</b><span class="en">' + item.en + '</span></div>' +
      '</div>' +
      '<div class="bar-actions">' +
        '<button class="ghost-btn" data-action="store" data-uid="' + uid + '">Ranger</button>' +
        '<button class="sell-btn" data-action="sell" data-uid="' + uid + '">Vendre +' + item.price + '</button>' +
      '</div>';
  }

  function onActionBarClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const uid = Number(button.dataset.uid);
    if (button.dataset.action === "store") {
      PropertyState.store(uid);
      World.clearSelection();
      toast("Rangé dans le coffre.");
    } else if (button.dataset.action === "sell") {
      const refund = PropertyState.sell(uid);
      World.clearSelection();
      if (refund !== null) toast("Vendu. +" + refund + " pièces.");
    }
  }

  /* ---- Messages ---- */

  let toastTimer = null;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  /* ---- Parent panel ---- */

  function setUpDevPanel() {
    const panel = document.getElementById("dev-panel");
    document.getElementById("dev-toggle").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });

    document.getElementById("dev-tier").addEventListener("click", () => {
      const tier = PropertyState.get().tiers.length + 1;
      const result = PropertyState.grantTier(tier, rewardForTier(tier));
      if (result) toast("Palier " + tier + " atteint ! +" + result.amount + " pièces.");
    });

    document.getElementById("dev-reset").addEventListener("click", () => {
      if (!confirm("Tout effacer et recommencer la propriété ?")) return;
      PropertyState.reset();
      World.clearSelection();
      World.fitCamera();
      toast("Propriété remise à zéro.");
    });
  }

  /* ---- Bridge for the learning app ---- */

  window.REWARD = {
    grantTier(tier) {
      const result = PropertyState.grantTier(tier, rewardForTier(tier));
      if (result) toast("Palier " + tier + " atteint ! +" + result.amount + " pièces.");
      return result;
    },
    addCoins(amount) { return PropertyState.addCoins(amount); },
    coins() { return PropertyState.get().coins; },
    rewardForTier
  };

  // Same bridge for the case where the module is shown inside an iframe.
  // The prototype accepts any origin; a real setup would check it here.
  window.addEventListener("message", event => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    if (message.type === "reward:tier") window.REWARD.grantTier(message.tier);
    else if (message.type === "reward:coins") window.REWARD.addCoins(message.amount);
    else return;
    if (event.source) {
      event.source.postMessage({ type: "reward:state", coins: PropertyState.get().coins }, "*");
    }
  });

  document.addEventListener("DOMContentLoaded", ready);
})();
