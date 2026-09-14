/* =====================================================================
   APP — wires the pieces together: the two tabs, the coin counter, the
   chest, the action bar of the selected object, and the bridge the
   learning app uses to pay for a new rank.

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

  const views = {};
  let coinsEl, chestEl, barEl, toastEl, placingBarEl;
  let shownCoins = null;

  function ready() {
    coinsEl = document.getElementById("coins");
    chestEl = document.getElementById("chest");
    barEl = document.getElementById("action-bar");
    toastEl = document.getElementById("toast");
    placingBarEl = document.getElementById("placing-bar");

    setUpTabs();
    setUpDevPanel();

    World.init({
      onSelect: renderActionBar,
      onPlacingChange: renderPlacingBar,
      onRefused: toast
    });

    Shop.init({
      onBought: (item, placed) => {
        toast(item.fr + " acheté ! " + (placed ? "C'est sur ton terrain." : "C'est dans ton coffre."));
      },
      onRefused: toast
    });

    chestEl.addEventListener("click", event => {
      const sellButton = event.target.closest("[data-sell]");
      if (sellButton) {
        const refund = PropertyState.sell(Number(sellButton.dataset.sell));
        if (refund !== null) toast("Vendu. +" + refund + " pièces.");
        return;
      }
      const chip = event.target.closest("[data-place]");
      if (chip) {
        show("property");
        World.startPlacing(Number(chip.dataset.place));
      }
    });

    barEl.addEventListener("click", onActionBarClick);
    document.getElementById("cancel-placing")
      .addEventListener("click", () => World.cancelPlacing());

    PropertyState.subscribe(refresh);
    refresh();
    show("property");
  }

  /* ---- Tabs ---- */

  function setUpTabs() {
    document.querySelectorAll("[data-view]").forEach(section => {
      views[section.dataset.view] = section;
    });
    document.querySelectorAll("[data-goto]").forEach(button => {
      button.addEventListener("click", () => show(button.dataset.goto));
    });
  }

  function show(name) {
    Object.keys(views).forEach(key => {
      views[key].hidden = key !== name;
    });
    document.querySelectorAll("[data-goto]").forEach(button => {
      button.classList.toggle("is-on", button.dataset.goto === name);
    });
    if (name === "property") {
      // The plot can only be measured once its tab is on screen.
      World.measure();
      World.render();
    }
  }

  /* ---- Redrawing after any change ---- */

  function refresh() {
    const data = PropertyState.get();
    renderCoins(data.coins);
    renderChest(data);
    Shop.render();
    World.render();
    renderActionBar(World.selected());
  }

  function renderCoins(coins) {
    coinsEl.textContent = coins;
    if (shownCoins !== null && coins !== shownCoins) {
      coinsEl.parentElement.classList.remove("is-bumped");
      void coinsEl.parentElement.offsetWidth; // restart the animation
      coinsEl.parentElement.classList.add("is-bumped");
    }
    shownCoins = coins;
  }

  function renderChest(data) {
    if (!data.storage.length) {
      chestEl.hidden = true;
      return;
    }
    chestEl.hidden = false;
    chestEl.innerHTML = '<p class="chest-title">Coffre — clique pour poser</p>' +
      '<div class="chest-row">' + data.storage.map(entry => {
        const item = CATALOG.item(entry.id);
        if (!item) return "";
        return '<div class="chest-chip">' +
          '<button class="chest-place" data-place="' + entry.uid + '" title="Poser ' + item.fr + '">' +
            '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '">' +
          '</button>' +
          '<button class="chest-sell" data-sell="' + entry.uid + '" title="Vendre">↩ ' + item.price + '</button>' +
        '</div>';
      }).join("") + '</div>';
  }

  function renderPlacingBar(uid) {
    placingBarEl.hidden = !uid;
    if (!uid) return;
    const entry = PropertyState.get().storage.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (item) {
      document.getElementById("placing-name").textContent =
        "Où poser « " + item.fr + " » ? Clique sur le terrain.";
    }
  }

  function renderActionBar(uid) {
    if (!uid) { barEl.hidden = true; return; }
    const entry = PropertyState.get().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) { barEl.hidden = true; return; }

    barEl.hidden = false;
    barEl.innerHTML =
      '<div class="bar-id">' +
        '<img src="' + CATALOG.assetUrl(item.id) + '" alt="">' +
        '<div><b>' + item.fr + '</b><span class="en">' + item.en + '</span></div>' +
      '</div>' +
      '<p class="hint">Glisse-le pour le déplacer.</p>' +
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

  /* ---- Parent panel ----
     Stands in for the learning app while the module is being tried out:
     it hands out the reward of a rank, or wipes the property clean. */
  function setUpDevPanel() {
    const panel = document.getElementById("dev-panel");
    document.getElementById("dev-toggle").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });

    document.getElementById("dev-tier").addEventListener("click", () => {
      const data = PropertyState.get();
      const tier = data.tiers.length + 1;
      const result = PropertyState.grantTier(tier, rewardForTier(tier));
      if (result) toast("Palier " + tier + " atteint ! +" + result.amount + " pièces.");
    });

    document.getElementById("dev-coins").addEventListener("click", () => {
      PropertyState.addCoins(100);
      toast("+100 pièces.");
    });

    document.getElementById("dev-reset").addEventListener("click", () => {
      if (!confirm("Tout effacer et recommencer la propriété ?")) return;
      PropertyState.reset();
      World.clearSelection();
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
