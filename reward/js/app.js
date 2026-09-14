/* =====================================================================
   APP — the overlay on top of the scene: coins, the shop, the object
   held in hand, the bar of what is selected, the way in and out of the
   house, and the bridge the learning app uses to pay for a new rank.

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
  let sceneEl, exitEl;
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
    sceneEl = document.getElementById("scene-name");
    exitEl = document.getElementById("exit");

    World.init({
      onSelect: renderActionBar,
      onPlacingChange: renderHand,
      onPlaced: onPlaced,
      onScene: onScene,
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
    sceneEl.textContent = PropertyState.scene().name;
    exitEl.hidden = !wayOut(PropertyState.scene());
    toast("Glisse pour te déplacer, pince pour zoomer.");
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

    exitEl.addEventListener("click", () => leaveScene());

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

  /* ---- Going from one scene to another ----
     The house from outside, the door from inside: both are blocks of the
     scene that name where they lead. */

  function onScene(place) {
    World.fitCamera();
    sceneEl.textContent = place.name;
    // Only a scene one can walk out of shows the way out in the overlay.
    exitEl.hidden = !wayOut(place);
    openShop(false);
    toast(place.indoor ? "Te voilà chez toi." : "Te voilà dehors.");
  }

  function wayOut(place) {
    return place.indoor ? place.blocks.find(block => block.to) : null;
  }

  function leaveScene() {
    const out = wayOut(PropertyState.scene());
    if (out) PropertyState.enter(out.to);
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

  /* The bar of what is selected: an object one can move and sell, or
     something built in that leads somewhere — the house, the door. */
  function renderActionBar(what) {
    const card = what && (what.kind === "object" ? objectBar(what.uid) : blockBar(what.index));
    barEl.hidden = !card;
    if (card) barEl.innerHTML = card;
  }

  function nameCard(art, fr, en) {
    return '<div class="bar-id">' +
      '<img src="' + art + '" alt="">' +
      '<div><b>' + fr + '</b><span class="en">' + en + '</span></div>' +
    '</div>';
  }

  function objectBar(uid) {
    const entry = PropertyState.scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return null;
    return nameCard(CATALOG.assetUrl(item.id), item.fr, item.en) +
      '<p class="hint">Glisse pour déplacer</p>' +
      '<button class="sell-btn" data-action="sell" data-uid="' + uid + '">Vendre +' + item.price + '</button>';
  }

  function blockBar(index) {
    const block = PropertyState.scene().blocks[index];
    const kind = block && SCENES.kind(block.kind);
    if (!kind || !block.to) return null;
    return nameCard(kind.sprite || kind.tile, kind.fr, kind.en) +
      '<button class="enter-btn" data-action="enter" data-to="' + block.to + '">' +
        (kind.action || "Entrer") +
      '</button>';
  }

  function onActionBarClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "enter") {
      PropertyState.enter(button.dataset.to);
      return;
    }
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
      onScene(PropertyState.scene());
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
