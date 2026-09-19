/* =====================================================================
   APP — the overlay on top of the scene: coins, the shop, the object
   held in hand, the bar of what is selected, the way in and out of the
   house, and the bridge the learning app uses to pay for a new rank.

   Buying is one flow now: the shop hands an object over, the shop
   closes, and the object is paid for on the tile where the child puts it
   down. It stays in hand afterwards, so a row of fields is a row of
   taps. The name is said in English as the object is handed over: that
   is what the child is here to learn, and it costs them nothing to
   hear it.

   The learning app never touches the state directly. It either calls
   REWARD.grantTier(rank) when the module is on the same page, or posts
   { type: "reward:tier", tier: n } to the iframe holding this module.
   ===================================================================== */
(function () {

  /* ---- What a level is worth ----
     There are a hundred of them, and they are the spine of the whole
     module: every one pays, every fifth opens a new shelf in the shop,
     every tenth pays handsomely. The purse grows with the level because
     what the shop offers grows with it too — a hen at the start, a big
     wheel at the end. */
  function rewardForTier(level) {
    return 100 + 10 * level +
      (level % 5 === 0 ? 250 : 0) +
      (level % 10 === 0 ? 500 : 0);
  }

  /* What a day of practice is worth — a stamp in the book of the
     learning app. Coming back tomorrow is the habit worth paying for,
     so it pays every day and not only when a rank falls; it stays well
     under a rank, though, so the climb is still what carries. */
  function rewardForStamp(level) {
    return 30 + 2 * level;
  }

  let coinsEl, shopCoinsEl, purseEl, shopEl, handEl, barEl, toastEl;
  let visitingEl, shareEl, floorsEl;
  let sceneEl, exitEl, backEl;
  let shopOpen = false;
  let shownCoins = null;

  async function ready() {
    coinsEl = document.getElementById("coins");
    shopCoinsEl = document.getElementById("shop-coins");
    purseEl = document.getElementById("purse");
    shopEl = document.getElementById("panel-shop");
    visitingEl = document.getElementById("visiting");
    floorsEl = document.getElementById("floors");
    shareEl = document.getElementById("share");
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
      onPick: (item, colour) => {
        World.startPlacing(item.id, colour);
        openShop(false);
        // Choosing an object in the shop is the moment its English name
        // matters most: it is said out loud, without asking, the same
        // way the 🔊 of a selected object says it.
        say(item.en);
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
    PropertyState.subscribe(tellParent);
    refresh();
    tellParent();
    sceneEl.textContent = PropertyState.scene().name;
    showWayOut(PropertyState.scene());

    /* An address carrying a world wins over everything below: the child
       came here to look at it, not to be told about their own — and if
       the link is unreadable, that is what needs saying, not the usual
       word of welcome. */
    if (await openSharedWorld()) return;
    if (Share.inAddress(location.href)) return;

    /* What the save could not keep came back as coins; saying so is
       better than letting the child hunt for a missing bench. */
    const paid = PropertyState.mendedCoins();
    if (paid) {
      toast("Quelques objets ne tenaient plus ici : +" + paid + " pièces rendues.");
      return;
    }
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

    /* A press on the purse passes a level — but only when the module is
       opened on its own, to try it out. Inside the learning app the
       levels are earned in the exercises and nowhere else. */
    purseEl.addEventListener("click", () => {
      if (PropertyState.visiting()) {
        toast("Tu regardes le monde de quelqu'un d'autre.");
        return;
      }
      if (window.parent !== window) {
        toast("Les pièces se gagnent dans les exercices d'anglais.");
        return;
      }
      const next = PropertyState.level() + 1;
      if (next > CATALOG.LAST_LEVEL) {
        toast("Niveau " + CATALOG.LAST_LEVEL + " : tu as tout débloqué !");
        return;
      }
      window.REWARD.grantTier(next);
    });

    document.getElementById("back").addEventListener("click", () => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: "reward:back" }, "*");
        return;
      }
      // Opened on its own, there is nowhere to go back to.
      toast("Ici, ce bouton ramène aux exercices d'anglais.");
    });

    shareEl.addEventListener("click", () => shareWorld());

    /* Following a link to this same page only changes the part after
       the "#": the page is never reloaded and nothing would happen. So
       the address is watched as well as read on the way in. */
    window.addEventListener("hashchange", () => {
      if (Share.inAddress(location.href)) openSharedWorld();
    });

    document.getElementById("go-home").addEventListener("click", () => {
      PropertyState.goHome();
      // The address goes back to being a plain one: reloading the page
      // must not drop the child into the visit all over again.
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", location.pathname + location.search);
      }
      World.clearSelection();
      World.fitCamera();
      showVisiting();
      toast("Te voilà revenu chez toi.");
    });

    document.getElementById("cancel-placing")
      .addEventListener("click", () => World.cancelPlacing());

    document.getElementById("turn-held")
      .addEventListener("click", () => World.turnHeld());

    document.getElementById("mirror-held")
      .addEventListener("click", () => World.mirrorHeld());

    document.getElementById("hand-colours").addEventListener("click", event => {
      const dab = event.target.closest("[data-colour]");
      if (dab) World.paintHeld(dab.dataset.colour);
    });

    exitEl.addEventListener("click", () => leaveScene());

    floorsEl.addEventListener("click", event => {
      const button = event.target.closest("[data-floor]");
      if (button) PropertyState.enter(button.dataset.floor);
    });

    barEl.addEventListener("click", onActionBarClick);
  }

  function openShop(open) {
    // There is nothing to buy in a world that is not yours.
    if (open && PropertyState.visiting()) {
      toast("Tu regardes le monde de quelqu'un d'autre.");
      return;
    }
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

  /* What a level brings, in one line: the coins first, and then the news
     that matters — the shop has new shelves. The count is what the child
     can actually see from where they stand. */
  function levelNews(result) {
    const line = "Niveau " + result.tier + " ! +" + result.amount + " pièces";
    const fresh = CATALOG.newAt(result.level);
    if (!fresh.length) return line + ".";
    return line + " — " + fresh.length + " nouveautés au magasin !";
  }

  /* Several levels can land at once when the child comes back after a
     while: one sentence for the lot, counting everything the shop has
     opened in between. */
  function caughtUp(result) {
    const line = "Niveau " + result.level + " ! +" + result.amount + " pièces";
    const fresh = CATALOG.ITEMS.filter(item =>
      item.level > result.was && item.level <= result.level).length;
    return fresh ? line + " — " + fresh + " nouveautés au magasin !" : line + ".";
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

  // Where the corner button leads from here: out of the building, not
  // merely through the first doorway of the room (the stairs come
  // first in a floor of flats, and they are not the way out).
  function wayOut(place) {
    return place.indoor ? PropertyState.wayOut(place.id) : null;
  }

  /* The corner holds one button: inside a building it is the way out,
     everywhere else the way back to the exercises. */
  function showWayOut(place) {
    const inside = !!wayOut(place);
    exitEl.hidden = !inside;
    backEl.hidden = inside;
    showFloors(place);
  }

  /* In a building of several floors, one button per floor beside the
     way out: hunting for the staircase to go up one and down again is
     no fun, and a child knows perfectly well which floor they want. */
  function floorLabel(index) {
    if (!index) return "RDC";
    return index === 1 ? "1er" : index + "e";
  }

  function showFloors(place) {
    const stack = PropertyState.floors(place.id);
    floorsEl.hidden = !stack.length;
    document.body.classList.toggle("has-floors", !!stack.length);
    if (!stack.length) { floorsEl.innerHTML = ""; return; }
    floorsEl.innerHTML = stack.map((floor, index) =>
      '<button class="floor-btn' + (floor.here ? " is-on" : "") + '"' +
      ' data-floor="' + floor.id + '"' +
      ' title="' + floor.name + '" aria-label="' + floor.name + '"' +
      (floor.here ? ' aria-current="true"' : "") + '>' +
      floorLabel(index) + '</button>'
    ).join("");
  }

  function leaveScene() {
    const out = wayOut(PropertyState.scene());
    if (out) PropertyState.enter(out);
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
    art.src = CATALOG.cardUrl(item.id, held.c);
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
    // The colour can still be changed with the object in hand.
    document.getElementById("hand-colours").innerHTML = swatches(item, held.c);
  }

  /* The colours an object comes in, as a row of pots. The same row is
     offered in hand and on the bar of a selected object, so changing
     one's mind before and after putting something down is the same
     gesture. */
  function swatches(item, colour) {
    const colours = CATALOG.paintsOf(item);
    if (!colours) return "";
    const worn = CATALOG.paintOf(item, colour);
    return colours.map(one =>
      '<button class="swatch' + (one === worn ? " is-on" : "") + '"' +
      ' data-action="paint" data-colour="' + one + '"' +
      ' title="' + CATALOG.colourName(one) + '"' +
      ' aria-label="' + CATALOG.colourName(one) + '"' +
      ' style="background:' + CATALOG.swatch(one) + '"></button>'
    ).join("");
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
    // Someone else's world is read: the name and the voice, nothing
    // that would move, paint or sell what is not yours.
    if (PropertyState.visiting()) {
      return nameCard(CATALOG.cardUrl(item.id, entry.c), item.en, item.fr) +
        sayButton(item.en);
    }
    const colours = swatches(item, entry.c);
    return nameCard(CATALOG.cardUrl(item.id, entry.c), item.en, item.fr) +
      '<p class="hint">Glisse pour déplacer</p>' +
      sayButton(item.en) +
      (colours ? '<span class="swatches">' + colours + '</span>' : "") +
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
    if (PropertyState.visiting()) {
      return nameCard("assets/coin.svg", plot.name, "une parcelle qu'il n'a pas achetée");
    }
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
    if (button.dataset.action === "paint") {
      World.paintSelected(button.dataset.colour);
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

  /* ---- Sending a world, and looking at someone else's ----

     The whole property goes into the part of the address after the
     "#", which never leaves the telephone until the child sends it: no
     account, no server, nothing kept anywhere. Sending it is whatever
     the telephone already knows how to do — the sharing sheet where
     there is one, the clipboard otherwise. */

  async function shareWorld() {
    if (PropertyState.visiting()) {
      toast("Tu regardes le monde de quelqu'un d'autre.");
      return;
    }
    let link;
    try {
      const text = await Share.write(PropertyState.get(), PropertyState.level());
      link = Share.address(location.href, text);
    } catch (err) {
      toast("Ton monde n'a pas pu être préparé.");
      return;
    }

    const words = "Regarde ma ville !";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ma ville", text: words, url: link });
        return;
      } catch (err) {
        // Sharing turned down, or not allowed here: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast("Lien copié ! Colle-le dans un message.");
    } catch (err) {
      // No clipboard either: show it, so it can be copied by hand.
      window.prompt("Copie ce lien pour envoyer ton monde :", link);
    }
  }

  /* A world in the address is shown instead of the child's own, and
     only shown: nothing on this page can change it, and nothing of it
     is ever written down. */
  async function openSharedWorld() {
    const text = Share.inAddress(location.href);
    if (!text) return false;
    const world = await Share.read(text);
    if (!world || !PropertyState.visit(world)) {
      toast("Ce lien ne contient pas de monde lisible.");
      return false;
    }
    World.clearSelection();
    World.fitCamera();
    showVisiting();
    toast("Tu visites le monde de quelqu'un d'autre.");
    return true;
  }

  /* The overlay while a visit is on: the banner says whose world it is
     and how to leave, and everything that spends or earns goes away. */
  function showVisiting() {
    const away = PropertyState.visiting();
    visitingEl.hidden = !away;
    document.body.classList.toggle("is-visiting", away);
    if (away) {
      const level = PropertyState.level();
      document.getElementById("visiting-what").textContent =
        level ? "Un monde de niveau " + level : "Le monde d'un ami";
    }
  }

  /* ---- Saying the name out loud ----
     The whole point of the property, in the end: the objects teach the
     words. The voice is whichever English one the browser has. */

  const canSpeak = typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  let englishVoice = null;

  /* Which voice says the word. British English first, since that is
     what the words are taught in, then American, then any English at
     all. A telephone usually has one and not the other: the tag is read
     loosely because Android writes it en_US as readily as en-US. */
  function pickVoice() {
    if (!canSpeak) return null;
    const voices = window.speechSynthesis.getVoices();
    englishVoice = voices.find(voice => /^en[-_]GB/i.test(voice.lang)) ||
      voices.find(voice => /^en[-_]US/i.test(voice.lang)) ||
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
    const voice = englishVoice || pickVoice();
    const said = new SpeechSynthesisUtterance(words);
    /* The language asked for has to be the language of the voice that
       will do the speaking. Asking for British English on a telephone
       that only has the American voice makes Android turn the whole
       thing down without a sound — which is exactly what happened on
       one of the two telephones this is used on. With no English voice
       at all there is nothing better to ask for than British. */
    said.lang = voice ? voice.lang : "en-GB";
    said.rate = 0.85;   // a shade slower than a native speaker
    if (voice) said.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(said);
  }

  /* The learning app, when there is one, keeps a purse of its own to
     show between two rounds; it is told at every change. */
  function tellParent() {
    if (window.parent === window) return;
    window.parent.postMessage({
      type: "reward:state",
      coins: PropertyState.get().coins,
      level: PropertyState.level(),
      stamps: PropertyState.stamps()
    }, "*");
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
      if (result) toast(levelNews(result));
      return result;
    },
    /* The learning app knows the rank the child has reached, not what
       this side has already paid for. One message settles everything
       owed up to that rank, in one go and one sentence. */
    /* The days of practice, told the same way as the rank: a running
       count, and this side settles what it has not paid for. */
    syncStamps(count) {
      const result = PropertyState.grantStamps(count, rewardForStamp);
      if (result.paid === 1) toast("Objectif du jour tenu ! +" + result.amount + " pièces.");
      else if (result.paid > 1) {
        toast(result.paid + " jours de travail récompensés : +" + result.amount + " pièces.");
      }
      return result;
    },
    syncLevel(level) {
      const top = Math.max(0, Math.min(CATALOG.LAST_LEVEL, Number(level) || 0));
      const result = PropertyState.grantUpTo(top, rewardForTier);
      if (result.paid) toast(caughtUp(result));
      return result;
    },
    addCoins(amount) { return PropertyState.addCoins(amount); },
    coins() { return PropertyState.get().coins; },
    level() { return PropertyState.level(); },
    stamps() { return PropertyState.stamps(); },
    // Starting the property over, from the console or from the main app.
    reset() {
      PropertyState.reset();
      World.cancelPlacing();
      World.clearSelection();
      World.fitCamera();
      onScene(PropertyState.scene());
    },
    rewardForTier, rewardForStamp
  };

  // Same bridge for the case where the module is shown inside an iframe.
  // The prototype accepts any origin; a real setup would check it here.
  window.addEventListener("message", event => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    if (message.type === "reward:tier") window.REWARD.grantTier(message.tier);
    else if (message.type === "reward:level") window.REWARD.syncLevel(message.level);
    else if (message.type === "reward:stamps") window.REWARD.syncStamps(message.stamps);
    else if (message.type === "reward:coins") window.REWARD.addCoins(message.amount);
    else return;
    if (event.source) {
      event.source.postMessage({
        type: "reward:state",
        coins: PropertyState.get().coins,
        level: PropertyState.level(),
        stamps: PropertyState.stamps()
      }, "*");
    }
  });

  document.addEventListener("DOMContentLoaded", ready);
})();
