/* =====================================================================
   WORLD — the property, full screen, seen from above.

   The plot is drawn once at a fixed tile size and the whole thing is
   moved under a camera: dragging the ground pans, two fingers pinch to
   zoom, the wheel zooms on a computer.

   Gestures, in order of priority:
     two pointers                 -> pinch zoom and pan
     press on the selected object -> move that object
     press on anything else       -> pan the camera; a press that does
                                     not travel picks the object under it
     an object dragged out of the chest or the shop -> drop it on a free
     tile (a shop object is paid for as it lands)

   Rules (what fits where) live in state.js; this file only turns the
   state into elements, and pointer events back into state calls.
   ===================================================================== */
const World = (function () {

  const TILE = 64;            // world pixels per tile, before zoom
  const MAX_SCALE = 2.4;
  const DRAG_THRESHOLD = 6;   // screen pixels before a press becomes a drag
  const EDGE_PAD = 28;        // how far the plot may travel off screen

  let viewport = null;
  let world = null;
  let ghost = null;
  let hooks = {};

  const cam = { x: 0, y: 0, scale: 1 };
  const pointers = new Map(); // live pointers, by id
  let gesture = null;         // pan / object / pinch / chest
  let placing = null;         // uid taken from the chest, waiting for a tap
  let selectedUid = null;

  function init(options) {
    hooks = options || {};
    viewport = document.getElementById("viewport");
    world = document.getElementById("world");

    ghost = document.createElement("div");
    ghost.className = "ghost";
    ghost.hidden = true;

    viewport.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", () => {
      cam.scale = clampScale(cam.scale);
      clampCamera();
      applyCamera();
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      cancelPlacing();
      clearSelection();
    });

    render();
    fitCamera();
  }

  /* ---- Camera ---- */

  function applyCamera() {
    world.style.transform =
      "translate(" + cam.x + "px," + cam.y + "px) scale(" + cam.scale + ")";
  }

  function clampCamera() {
    const land = PropertyState.get().land;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const ww = land.cols * TILE * cam.scale;
    const wh = land.rows * TILE * cam.scale;
    // Smaller than the screen: centred. Bigger: kept under the screen,
    // so the plot can never be dragged away out of sight.
    cam.x = ww + 2 * EDGE_PAD <= vw ? (vw - ww) / 2
      : Math.max(vw - ww - EDGE_PAD, Math.min(EDGE_PAD, cam.x));
    cam.y = wh + 2 * EDGE_PAD <= vh ? (vh - wh) / 2
      : Math.max(vh - wh - EDGE_PAD, Math.min(EDGE_PAD, cam.y));
  }

  // Scale at which the whole plot just fits the screen. Zooming out any
  // further would only add empty ground around it, so it is the floor.
  function fitScale() {
    const land = PropertyState.get().land;
    return Math.min(
      viewport.clientWidth / (land.cols * TILE + 60),
      viewport.clientHeight / (land.rows * TILE + 60)
    );
  }

  function clampScale(wanted) {
    return Math.max(Math.min(fitScale(), MAX_SCALE), Math.min(MAX_SCALE, wanted));
  }

  // Zooms while keeping the point under the fingers where it is.
  function zoomAt(clientX, clientY, wanted) {
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const worldX = (px - cam.x) / cam.scale;
    const worldY = (py - cam.y) / cam.scale;
    cam.scale = clampScale(wanted);
    cam.x = px - worldX * cam.scale;
    cam.y = py - worldY * cam.scale;
    clampCamera();
    applyCamera();
  }

  /* Opening view: between "the whole plot fits" and "the plot fills the
     screen". Fitting alone leaves the objects tiny on a phone, filling
     alone shows only a corner of the property. */
  function fitCamera() {
    const land = PropertyState.get().land;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cover = Math.max(vw / (land.cols * TILE), vh / (land.rows * TILE));
    cam.scale = Math.min(MAX_SCALE, Math.max(fitScale(), Math.sqrt(fitScale() * cover)));
    cam.x = (vw - land.cols * TILE * cam.scale) / 2;
    cam.y = (vh - land.rows * TILE * cam.scale) / 2;
    clampCamera();
    applyCamera();
  }

  function onWheel(event) {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, cam.scale * (1 - event.deltaY * 0.0015));
  }

  /* ---- Drawing ---- */

  function render() {
    const data = PropertyState.get();
    world.style.width = data.land.cols * TILE + "px";
    world.style.height = data.land.rows * TILE + "px";
    world.style.setProperty("--tile", TILE + "px");
    world.innerHTML = "";

    const house = document.createElement("div");
    house.className = "house";
    house.style.cssText = box(data.house.x, data.house.y, data.house.w, data.house.h);
    house.innerHTML = '<img src="assets/house.svg" alt="La maison" draggable="false">';
    world.appendChild(house);

    /* The ground (paths, fields) is laid down first, then everything that
       stands on it, each layer from the back of the plot to the front so
       that what is lower overlaps what is behind it. */
    const rank = entry => {
      const item = CATALOG.item(entry.id);
      return CATALOG.layerOf(item) === "ground" ? 0 : 1;
    };
    data.placed.slice().sort((a, b) => rank(a) - rank(b) || a.y - b.y).forEach(entry => {
      const item = CATALOG.item(entry.id);
      if (!item) return;
      const node = document.createElement("div");
      node.className = "ob" +
        (CATALOG.layerOf(item) === "ground" ? " is-ground" : "") +
        (entry.uid === selectedUid ? " is-selected" : "");
      node.dataset.uid = entry.uid;
      node.style.cssText = box(entry.x, entry.y, item.w, item.h);
      node.innerHTML = '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '" draggable="false">';
      world.appendChild(node);
    });

    world.appendChild(ghost);
    applyCamera();
  }

  function box(x, y, w, h) {
    return "left:" + x * TILE + "px;top:" + y * TILE + "px;" +
           "width:" + w * TILE + "px;height:" + h * TILE + "px;";
  }

  function showGhost(x, y, item, valid, art) {
    ghost.hidden = false;
    ghost.style.cssText = box(x, y, item.w, item.h);
    ghost.classList.toggle("is-bad", !valid);
    ghost.innerHTML = art ? '<img src="' + CATALOG.assetUrl(item.id) + '" alt="">' : "";
  }

  function hideGhost() {
    ghost.hidden = true;
    ghost.innerHTML = "";
  }

  /* ---- Coordinates ---- */

  // Pointer position in tile units (fractional) on the plot.
  function pointerTile(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - cam.x) / cam.scale / TILE,
      y: (clientY - rect.top - cam.y) / cam.scale / TILE
    };
  }

  // Top-left tile for an item held by its middle, kept inside the plot.
  function centredTarget(clientX, clientY, item) {
    const land = PropertyState.get().land;
    const point = pointerTile(clientX, clientY);
    return {
      x: Math.round(Math.max(0, Math.min(land.cols - item.w, point.x - item.w / 2))),
      y: Math.round(Math.max(0, Math.min(land.rows - item.h, point.y - item.h / 2)))
    };
  }

  /* ---- Gestures ---- */

  function onPointerDown(event) {
    if (event.button !== undefined && event.button > 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) { startPinch(); return; }
    if (pointers.size > 2 || (gesture && gesture.type === "pinch")) return;

    /* Only the object already picked can be dragged. Everything else
       pans the camera, which is what a finger on the ground means far
       more often than "move this hen". */
    const node = placing ? null : event.target.closest(".ob");
    const uid = node ? Number(node.dataset.uid) : null;
    if (uid === null || uid !== selectedUid) {
      gesture = {
        type: "pan",
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        camX: cam.x,
        camY: cam.y,
        moved: false,
        // A press that never travels picks this object instead of panning.
        tapUid: uid
      };
      return;
    }

    const entry = PropertyState.get().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return;
    const point = pointerTile(event.clientX, event.clientY);
    gesture = {
      type: "object",
      id: event.pointerId,
      uid: entry.uid,
      item, node,
      // Where inside the object it was grabbed, so it does not jump.
      offsetX: point.x - entry.x,
      offsetY: point.y - entry.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: { x: entry.x, y: entry.y },
      ok: true
    };
  }

  // An object dragged straight out of a panel. The pointer press happened
  // outside the viewport, so the panel hands the gesture over to us.
  function dragFromChest(uid, event) {
    const entry = PropertyState.get().storage.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return;
    startPanelDrag({ type: "chest", uid, item }, event);
  }

  // Same gesture from the shop, except the object is paid for on landing.
  function dragFromShop(id, event) {
    const item = CATALOG.item(id);
    if (!item) return;
    startPanelDrag({ type: "shop", itemId: id, item }, event);
  }

  function startPanelDrag(base, event) {
    cancelPlacing();
    clearSelection();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture = Object.assign(base, {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: null,
      ok: false
    });
  }

  function fromPanel(one) {
    return one && (one.type === "chest" || one.type === "shop");
  }

  function startPinch() {
    if (gesture && gesture.type === "object") revertObject();
    const [a, b] = Array.from(pointers.values());
    gesture = {
      type: "pinch",
      startDistance: distance(a, b),
      startScale: cam.scale,
      lastMid: middle(a, b)
    };
    hideGhost();
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  function middle(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function onPointerMove(event) {
    const tracked = pointers.get(event.pointerId);
    if (tracked) { tracked.x = event.clientX; tracked.y = event.clientY; }

    if (gesture && gesture.type === "pinch") {
      if (pointers.size < 2) return;
      const [a, b] = Array.from(pointers.values());
      const mid = middle(a, b);
      zoomAt(mid.x, mid.y, gesture.startScale * (distance(a, b) / gesture.startDistance));
      cam.x += mid.x - gesture.lastMid.x;
      cam.y += mid.y - gesture.lastMid.y;
      gesture.lastMid = mid;
      clampCamera();
      applyCamera();
      return;
    }

    if (!gesture || gesture.id !== event.pointerId) {
      if (placing) hoverPlacing(event);
      return;
    }

    if (!gesture.moved) {
      const far = Math.abs(event.clientX - gesture.startX) > DRAG_THRESHOLD ||
                  Math.abs(event.clientY - gesture.startY) > DRAG_THRESHOLD;
      if (!far) return;
      gesture.moved = true;
      if (gesture.type === "object") {
        // It stays selected while travelling, so a refused drop leaves it
        // in hand rather than making the child pick it again.
        gesture.node.classList.add("is-dragging");
      } else if (fromPanel(gesture) && hooks.onPanelDragStart) {
        hooks.onPanelDragStart();
      }
    }

    if (gesture.type === "pan") {
      cam.x = gesture.camX + (event.clientX - gesture.startX);
      cam.y = gesture.camY + (event.clientY - gesture.startY);
      clampCamera();
      applyCamera();
      return;
    }

    if (gesture.type === "object") {
      const land = PropertyState.get().land;
      const point = pointerTile(event.clientX, event.clientY);
      const x = Math.round(Math.max(0, Math.min(land.cols - gesture.item.w, point.x - gesture.offsetX)));
      const y = Math.round(Math.max(0, Math.min(land.rows - gesture.item.h, point.y - gesture.offsetY)));
      gesture.target = { x, y };
      gesture.ok = PropertyState.canPlace(gesture.item, x, y, gesture.uid);
      showGhost(x, y, gesture.item, gesture.ok, false);
      // The object follows the finger; the ghost shows where it lands.
      gesture.node.style.transform =
        "translate(" + (event.clientX - gesture.startX) / cam.scale + "px," +
                       (event.clientY - gesture.startY) / cam.scale + "px)";
      return;
    }

    if (fromPanel(gesture)) {
      const target = centredTarget(event.clientX, event.clientY, gesture.item);
      gesture.target = target;
      gesture.ok = PropertyState.canPlace(gesture.item, target.x, target.y, null);
      showGhost(target.x, target.y, gesture.item, gesture.ok, true);
    }
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);

    if (gesture && gesture.type === "pinch") {
      if (pointers.size < 2) gesture = null;
      return;
    }
    if (!gesture || gesture.id !== event.pointerId) return;

    const finished = gesture;
    gesture = null;

    if (finished.type === "pan") {
      if (finished.moved) return;
      if (finished.tapUid !== null) select(finished.tapUid);
      else tapOnGround(event);
      return;
    }

    if (finished.type === "object") {
      finished.node.classList.remove("is-dragging");
      finished.node.style.transform = "";
      hideGhost();
      if (!finished.moved) return;
      if (finished.ok) {
        PropertyState.move(finished.uid, finished.target.x, finished.target.y);
        select(finished.uid);
      } else {
        render();
        refuse();
      }
      return;
    }

    if (fromPanel(finished)) {
      hideGhost();
      if (!finished.moved) {
        // A simple tap on a chest object: keep it in hand and let the
        // child tap the spot they want. A tap in the shop does nothing:
        // the price button right below is how one buys without dragging.
        if (finished.type === "chest") startPlacing(finished.uid);
        return;
      }
      const landed = finished.ok && (finished.type === "chest"
        ? PropertyState.place(finished.uid, finished.target.x, finished.target.y)
        : PropertyState.buyAt(finished.itemId, finished.target.x, finished.target.y));
      if (!landed) refuse();
      else if (finished.type === "shop" && hooks.onBought) hooks.onBought(finished.item);
      if (hooks.onPanelDragEnd) hooks.onPanelDragEnd();
    }
  }

  function revertObject() {
    if (!gesture || gesture.type !== "object") return;
    gesture.node.classList.remove("is-dragging");
    gesture.node.style.transform = "";
    hideGhost();
  }

  function refuse() {
    if (hooks.onRefused) hooks.onRefused("Il n'y a pas la place ici.");
  }

  /* ---- Placing an object held in hand ---- */

  function startPlacing(uid) {
    placing = uid;
    clearSelection();
    if (hooks.onPlacingChange) hooks.onPlacingChange(uid);
  }

  function cancelPlacing() {
    if (!placing) return;
    placing = null;
    hideGhost();
    if (hooks.onPlacingChange) hooks.onPlacingChange(null);
  }

  function heldItem() {
    const entry = PropertyState.get().storage.find(one => one.uid === placing);
    return entry ? CATALOG.item(entry.id) : null;
  }

  function hoverPlacing(event) {
    const item = heldItem();
    if (!item) return;
    const target = centredTarget(event.clientX, event.clientY, item);
    showGhost(target.x, target.y, item,
      PropertyState.canPlace(item, target.x, target.y, null), true);
  }

  function tapOnGround(event) {
    if (!placing) { clearSelection(); return; }
    const item = heldItem();
    if (!item) { cancelPlacing(); return; }
    const target = centredTarget(event.clientX, event.clientY, item);
    const uid = placing;
    if (PropertyState.place(uid, target.x, target.y)) {
      placing = null;
      hideGhost();
      if (hooks.onPlacingChange) hooks.onPlacingChange(null);
      select(uid);
    } else {
      refuse();
    }
  }

  /* ---- Selection ---- */

  function select(uid) {
    selectedUid = uid;
    render();
    if (hooks.onSelect) hooks.onSelect(uid);
  }

  function clearSelection() {
    if (selectedUid === null) return;
    selectedUid = null;
    render();
    if (hooks.onSelect) hooks.onSelect(null);
  }

  return {
    init, render, fitCamera,
    dragFromChest, dragFromShop, startPlacing, cancelPlacing,
    select, clearSelection,
    isPlacing() { return placing; },
    selected() { return selectedUid; }
  };
})();
