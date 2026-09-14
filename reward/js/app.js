/* =====================================================================
   APP — the overlay on top of the property: coins, the shop, the object
   held in hand, the bar of the selected object, and the bridge the
   learning app uses to pay for a new rank.

   Buying is one flow now: the shop hands an object over, the shop
   closes, and the object is paid for on the tile where the child puts it
   down. It stays in hand afterwards, so a row of fields is a row of
   taps.

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

  let coinsEl, shopCoinsEl, purseEl, shopEl, handEl, bottomEl, barEl, toastEl;
  let shopOpen = false;
  let shownCoins = null;

  function ready() {
    coinsEl = document.getElementById("coins");
    shopCoinsEl = document.getElementById("shop-coins");
    purseEl = document.getElementById("purse");
    shopEl = document.getElementById("panel-shop");
    handEl = document.getElementById("hand");
    bottomEl = document.getElementById("hud-bottom");
    barEl = document.getElementById("action-bar");
    toastEl = document.getElementById("toast");

    World.init({
      onSelect: renderActionBar,
      onPlacingChange: renderHand,
      onPlaced: onPlaced,
      onRefused: toast
    });

    Shop.init({
      onPick: item => {
        World.startPlacing(item.id);
        openShop(false);
      },
      onRefused: toast
    });

    setUpHud();
    setUpDevPanel();

    PropertyState.subscribe(refresh);
    refresh();
    toast("Glisse le terrain pour te déplacer, pince pour zoomer.");
  }

  /* ---- Overlay buttons ---- */

  function setUpHud() {
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.addEventListener("click", () => openShop(!shopOpen));
    });
    document.querySelectorAll("[data-close]").forEach(button => {
      button.addEventListener("click", () => openShop(false));
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

  function openShop(open) {
    shopOpen = open;
    shopEl.hidden = !open;
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.classList.toggle("is-on", open);
    });
    if (open) {
      World.cancelPlacing();
      World.clearSelection();
      Shop.render();
    }
  }

  /* ---- Redrawing after any change ---- */

  function refresh() {
    const data = PropertyState.get();
    renderCoins(data.coins);
    if (shopOpen) Shop.render();
    World.render();
    renderActionBar(World.selected());
    renderHand(World.isPlacing());
  }

  function renderCoins(coins) {
    coinsEl.textContent = coins;
    shopCoinsEl.textContent = coins;
    if (shownCoins !== null && coins !== shownCoins) {
      purseEl.classList.remove("is-bumped");
      void purseEl.offsetWidth; // restart the animation
      purseEl.classList.add("is-bumped");
    }
    shownCoins = coins;
  }

  /* The object in hand sits in the corner. The shop button steps aside
     while it is there: the child is placing, not shopping. */
  function renderHand(id) {
    const item = id ? CATALOG.item(id) : null;
    handEl.hidden = !item;
    bottomEl.hidden = !!item;
    if (!item) return;
    document.getElementById("hand-art").src = CATALOG.assetUrl(item.id);
    document.getElementById("hand-art").alt = item.fr;
    document.getElementById("hand-name").textContent = item.fr;
    document.getElementById("hand-price").textContent = item.price;
  }

  function onPlaced(item) {
    // Out of hand as soon as the next one is out of reach.
    const short = PropertyState.get().coins < item.price;
    if (short) World.cancelPlacing();
    toast("Posé : « " + item.fr + " » (−" + item.price + " pièces)" +
      (short ? " — il ne t'en reste plus assez" : ""));
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
      '<p class="hint">Glisse pour déplacer</p>' +
      '<button class="sell-btn" data-action="sell" data-uid="' + uid + '">Vendre +' + item.price + '</button>';
  }

  function onActionBarClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const refund = PropertyState.sell(Number(button.dataset.uid));
    World.clearSelection();
    if (refund !== null) toast("Vendu. +" + refund + " pièces.");
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
      World.cancelPlacing();
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
