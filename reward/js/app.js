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

  let coinsEl, shopCoinsEl, purseEl, shopEl, handEl, barEl, toastEl;
  let sceneEl, exitEl, backEl;
  let shopOpen = false;
  let shownCoins = null;

  function ready() {
    coinsEl = document.getElementById("coins");
    shopCoinsEl = document.getElementById("shop-coins");
    purseEl = document.getElementById("purse");
    shopEl = document.getElementById("panel-shop");
    handEl = document.getElementById("hand");
    barEl = document.getElementById("action-bar");
    toastEl = document.getElementById("toast");
    sceneEl = document.getElementById("scene-name");
    exitEl = document.getElementById("exit");
    backEl = document.getElementById("back");

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
    // Voices arrive late in some browsers; take them when they do.
    if (canSpeak && typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    }
    pickVoice();

    PropertyState.subscribe(refresh);
    refresh();
    sceneEl.textContent = PropertyState.scene().name;
    showWayOut(PropertyState.scene());
    const left = PropertyState.plotsForSale().length;
    toast(left
      ? "Glisse pour te déplacer, pince pour zoomer. Les terrains sombres sont à vendre."
      : "Glisse pour te déplacer, pince pour zoomer.");
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

    document.getElementById("turn-held")
      .addEventListener("click", () => World.turnHeld());

    document.getElementById("mirror-held")
      .addEventListener("click", () => World.mirrorHeld());

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
    showWayOut(place);
    openShop(false);
    toast(place.indoor ? "Te voilà chez toi." : "Te voilà dehors.");
  }

  function wayOut(place) {
    return place.indoor ? place.blocks.find(block => block.to) : null;
  }

  /* The corner holds one button: inside a building it is the way out,
     everywhere else the way back to the exercises. */
  function showWayOut(place) {
    const inside = !!wayOut(place);
    exitEl.hidden = !inside;
    backEl.hidden = inside;
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

  /* The object in hand sits in the bottom corner, clear of the buttons:
     the shop stays within reach, to change one's mind about what to buy. */
  function renderHand(held) {
    const item = held ? CATALOG.item(held.id) : null;
    handEl.hidden = !item;
    if (!item) return;
    const art = document.getElementById("hand-art");
    art.src = CATALOG.assetUrl(item.id);
    art.alt = item.fr;
    // The drawing in the corner is posed like the object it stands for.
    const poses = [];
    if (held.r) poses.push("rotate(" + held.r * 90 + "deg)");
    if (held.m) poses.push("scaleX(-1)");
    art.style.transform = poses.join(" ");
    document.getElementById("hand-name").textContent = item.en;
    document.getElementById("hand-sub").textContent = item.fr;
    document.getElementById("hand-price").textContent = item.price;
    document.getElementById("turn-held").hidden = !item.turns;
    document.getElementById("mirror-held").hidden = false;
  }

  function onPlaced(item, spot) {
    flyCoins(-item.price, spot);
    // Out of hand as soon as the next one is out of reach.
    if (PropertyState.get().coins < item.price) {
      World.cancelPlacing();
      toast("Il ne te reste plus assez de pièces pour un autre.");
    }
  }

  /* What an object costs, or brings back, said where it happened: the
     number climbs out of the object and fades. */
  function flyCoins(amount, spot) {
    if (!spot || !amount) return;
    const note = document.createElement("div");
    note.className = "coin-fly" + (amount < 0 ? " is-spent" : " is-earned");
    note.style.left = Math.round(spot.x) + "px";
    note.style.top = Math.round(spot.y) + "px";
    note.innerHTML = (amount < 0 ? "−" : "+") + Math.abs(amount) +
      '<img src="assets/coin.svg" alt="pièces">';
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 1200);
  }

  /* The bar of what is selected: an object one can move and sell, or
     something built in that leads somewhere — the house, the door. */
  function renderActionBar(what) {
    let card = null;
    if (what && what.kind === "object") card = objectBar(what.uid);
    else if (what && what.kind === "block") card = blockBar(what.index);
    else if (what && what.kind === "plot") card = plotBar(what.id);
    barEl.hidden = !card;
    if (card) barEl.innerHTML = card;
  }

  /* The English name leads, in full, with the French one under it. */
  function nameCard(art, english, french) {
    return '<div class="bar-id">' +
      '<img src="' + art + '" alt="">' +
      '<div><b>' + english + '</b><span class="sub">' + french + '</span></div>' +
    '</div>';
  }

  function objectBar(uid) {
    const entry = PropertyState.scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return null;
    return nameCard(CATALOG.assetUrl(item.id), item.en, item.fr) +
      '<p class="hint">Glisse pour déplacer</p>' +
      sayButton(item.en) +
      (item.turns ? '<button class="turn-btn" data-action="turn" title="Tourner">↻ Tourner</button>' : "") +
      '<button class="turn-btn" data-action="mirror" title="Miroir">⇄ Miroir</button>' +
      '<button class="sell-btn" data-action="sell" data-uid="' + uid + '">Vendre +' + item.price + '</button>';
  }

  function blockBar(index) {
    const block = PropertyState.scene().blocks[index];
    const kind = block && SCENES.kind(block.kind);
    if (!kind || !block.to) return null;
    return nameCard(kind.sprite || kind.tile, kind.en, kind.fr) +
      sayButton(kind.en) +
      '<button class="enter-btn" data-action="enter" data-to="' + block.to + '">' +
        (kind.action || "Entrer") +
      '</button>';
  }

  /* A plot still under its veil: its bar says what it costs, and buys it
     when the purse is full enough. Any of them, in any order. */
  function plotBar(id) {
    const plot = SCENES.plot(id);
    if (!plot) return null;
    const missing = plot.price - PropertyState.get().coins;
    return nameCard("assets/coin.svg", plot.name, "une parcelle à acheter") +
      (missing > 0
        ? '<p class="hint">Il te manque ' + missing + ' pièces</p>'
        : '<button class="sell-btn" data-action="plot" data-plot="' + id + '">Acheter (' + plot.price + ')</button>');
  }

  function onActionBarClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "enter") {
      PropertyState.enter(button.dataset.to);
      return;
    }
    if (button.dataset.action === "turn") {
      World.turnSelected();
      return;
    }
    if (button.dataset.action === "mirror") {
      World.mirrorSelected();
      return;
    }
    if (button.dataset.action === "say") {
      say(button.dataset.say);
      return;
    }
    if (button.dataset.action === "plot") {
      const bought = PropertyState.buyPlot(button.dataset.plot);
      if (!bought) return;
      World.clearSelection();
      World.fitCamera();
      toast("Nouvelle parcelle : «\u00A0" + bought.name + "\u00A0» (−" + bought.price + " pièces)");
      return;
    }
    const uid = Number(button.dataset.uid);
    // Where it stood, caught before it is gone.
    const entry = PropertyState.scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    const size = item ? CATALOG.footprint(item, entry.r) : null;
    const spot = size ? World.screenOf(entry.x, entry.y, size.w, size.h) : null;
    const refund = PropertyState.sell(uid);
    World.clearSelection();
    if (refund !== null) flyCoins(refund, spot);
  }

  /* ---- Saying the name out loud ----
     The whole point of the property, in the end: the objects teach the
     words. The voice is whichever English one the browser has. */

  const canSpeak = typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  let englishVoice = null;

  function pickVoice() {
    if (!canSpeak) return null;
    const voices = window.speechSynthesis.getVoices();
    englishVoice = voices.find(voice => /^en[-_]GB/i.test(voice.lang)) ||
      voices.find(voice => /^en/i.test(voice.lang)) || null;
    return englishVoice;
  }

  // Nothing to press where the browser has no voice at all.
  function sayButton(words) {
    if (!canSpeak || !words) return "";
    return '<button class="say-btn" data-action="say" data-say="' + words +
      '" title="Écouter en anglais" aria-label="Écouter le nom anglais">🔊</button>';
  }

  function say(words) {
    if (!canSpeak) return;
    const said = new SpeechSynthesisUtterance(words);
    said.lang = "en-GB";
    said.rate = 0.85;   // a shade slower than a native speaker
    const voice = englishVoice || pickVoice();
    if (voice) said.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(said);
  }

  /* ---- Messages ---- */

  let toastTimer = null;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
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
    // Starting the property over, from the console or from the main app.
    reset() {
      PropertyState.reset();
      World.cancelPlacing();
      World.clearSelection();
      World.fitCamera();
      onScene(PropertyState.scene());
    },
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
