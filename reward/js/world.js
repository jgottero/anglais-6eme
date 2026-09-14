/* =====================================================================
   WORLD — the property seen from above.

   Draws the plot, the house and every object on a tile grid, and handles
   the three gestures the child needs: drag an object to move it, tap an
   object to select it, tap the ground to drop the object being placed.

   Rules (what fits where, what an object costs) live in state.js; this
   file only turns the state into elements and pointer events back into
   state calls.
   ===================================================================== */
const World = (function () {

  const MIN_TILE = 26;
  const MAX_TILE = 56;
  const DRAG_THRESHOLD = 5; // px before a press becomes a drag, not a tap

  let yard = null;
  let ghost = null;
  let hooks = {};
  let tile = 44;
  let selectedUid = null;
  let placingUid = null;   // object taken from the chest, waiting for a spot
  let drag = null;

  function init(options) {
    hooks = options || {};
    yard = document.getElementById("yard");

    ghost = document.createElement("div");
    ghost.className = "ghost";
    ghost.hidden = true;

    yard.addEventListener("pointerdown", onPointerDown);
    yard.addEventListener("pointermove", onYardMove);
    yard.addEventListener("pointerleave", () => { if (placingUid) ghost.hidden = true; });
    window.addEventListener("resize", () => { measure(); render(); });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        cancelPlacing();
        clearSelection();
      }
    });

    measure();
    render();
  }

  /* ---- Sizing ----
     The whole plot has to be visible without scrolling sideways, so the
     tile size follows the width available, within sensible bounds. */
  function measure() {
    const land = PropertyState.get().land;
    const available = yard.parentElement.clientWidth - 8;
    const wanted = Math.floor(available / land.cols);
    tile = Math.max(MIN_TILE, Math.min(MAX_TILE, wanted));
  }

  /* ---- Drawing ---- */

  function render() {
    const data = PropertyState.get();
    yard.style.setProperty("--tile", tile + "px");
    yard.style.width = data.land.cols * tile + "px";
    yard.style.height = data.land.rows * tile + "px";
    yard.innerHTML = "";

    const house = document.createElement("div");
    house.className = "house";
    house.style.cssText = box(data.house.x, data.house.y, data.house.w, data.house.h);
    house.innerHTML = '<img src="assets/house.svg" alt="La maison" draggable="false">';
    yard.appendChild(house);

    // Drawn from the back of the plot to the front, so an object standing
    // lower on the ground overlaps the one behind it.
    const order = data.placed.slice().sort((a, b) => a.y - b.y);
    order.forEach(entry => {
      const item = CATALOG.item(entry.id);
      if (!item) return;
      const node = document.createElement("div");
      node.className = "ob" + (entry.uid === selectedUid ? " is-selected" : "");
      node.dataset.uid = entry.uid;
      node.style.cssText = box(entry.x, entry.y, item.w, item.h);
      node.innerHTML = '<img src="' + CATALOG.assetUrl(item.id) + '" alt="' + item.fr + '" draggable="false">';
      yard.appendChild(node);
    });

    yard.appendChild(ghost);
    yard.classList.toggle("is-placing", !!placingUid);
  }

  function box(x, y, w, h) {
    return "left:" + x * tile + "px;top:" + y * tile + "px;" +
           "width:" + w * tile + "px;height:" + h * tile + "px;";
  }

  function showGhost(x, y, w, h, valid) {
    ghost.hidden = false;
    ghost.style.cssText = box(x, y, w, h);
    ghost.classList.toggle("is-bad", !valid);
  }

  /* ---- Pointer helpers ---- */

  // Pointer position in tile units (fractional), relative to the plot.
  function pointerTile(event) {
    const rect = yard.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / tile,
      y: (event.clientY - rect.top) / tile
    };
  }

  function clamp(value, max) {
    return Math.max(0, Math.min(max, value));
  }

  /* ---- Placing an object coming from the chest ---- */

  function startPlacing(uid) {
    placingUid = uid;
    clearSelection();
    render();
    if (hooks.onPlacingChange) hooks.onPlacingChange(uid);
  }

  function cancelPlacing() {
    if (!placingUid) return;
    placingUid = null;
    ghost.hidden = true;
    render();
    if (hooks.onPlacingChange) hooks.onPlacingChange(null);
  }

  function placingTarget(event, item) {
    const data = PropertyState.get();
    const point = pointerTile(event);
    // The object is held by its middle, which is where a finger expects it.
    const x = Math.round(clamp(point.x - item.w / 2, data.land.cols - item.w));
    const y = Math.round(clamp(point.y - item.h / 2, data.land.rows - item.h));
    return { x, y };
  }

  function onYardMove(event) {
    if (drag) return;
    if (!placingUid) return;
    const entry = PropertyState.get().storage.find(one => one.uid === placingUid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return;
    const target = placingTarget(event, item);
    showGhost(target.x, target.y, item.w, item.h,
      PropertyState.canPlace(target.x, target.y, item.w, item.h, null));
  }

  /* ---- Press, drag, drop ---- */

  function onPointerDown(event) {
    if (event.button !== undefined && event.button > 0) return;

    if (placingUid) {
      const entry = PropertyState.get().storage.find(one => one.uid === placingUid);
      const item = entry && CATALOG.item(entry.id);
      if (!item) { cancelPlacing(); return; }
      const target = placingTarget(event, item);
      if (PropertyState.place(placingUid, target.x, target.y)) {
        const placed = placingUid;
        placingUid = null;
        ghost.hidden = true;
        if (hooks.onPlacingChange) hooks.onPlacingChange(null);
        select(placed);
      } else if (hooks.onRefused) {
        hooks.onRefused("Il n'y a pas la place ici.");
      }
      return;
    }

    const node = event.target.closest(".ob");
    if (!node) { clearSelection(); return; }

    const uid = Number(node.dataset.uid);
    const entry = PropertyState.get().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return;

    const point = pointerTile(event);
    drag = {
      uid, item, node,
      // Where inside the object it was grabbed, so it does not jump.
      offsetX: point.x - entry.x,
      offsetY: point.y - entry.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      target: { x: entry.x, y: entry.y }
    };
    node.setPointerCapture(event.pointerId);
    node.addEventListener("pointermove", onDragMove);
    node.addEventListener("pointerup", onDragEnd);
    node.addEventListener("pointercancel", onDragEnd);
  }

  function onDragMove(event) {
    if (!drag) return;
    const far = Math.abs(event.clientX - drag.startClientX) > DRAG_THRESHOLD ||
                Math.abs(event.clientY - drag.startClientY) > DRAG_THRESHOLD;
    if (!far && !drag.moved) return;

    if (!drag.moved) {
      drag.moved = true;
      drag.node.classList.add("is-dragging");
      // Drop the selection without redrawing: a redraw would throw away
      // the very element the pointer is holding.
      if (selectedUid !== null) {
        drag.node.classList.remove("is-selected");
        selectedUid = null;
        if (hooks.onSelect) hooks.onSelect(null);
      }
    }

    const data = PropertyState.get();
    const point = pointerTile(event);
    const x = Math.round(clamp(point.x - drag.offsetX, data.land.cols - drag.item.w));
    const y = Math.round(clamp(point.y - drag.offsetY, data.land.rows - drag.item.h));
    drag.target = { x, y };
    drag.ok = PropertyState.canPlace(x, y, drag.item.w, drag.item.h, drag.uid);
    showGhost(x, y, drag.item.w, drag.item.h, drag.ok);

    // The object itself follows the finger; the ghost shows where it lands.
    drag.node.style.transform =
      "translate(" + (event.clientX - drag.startClientX) + "px," +
                     (event.clientY - drag.startClientY) + "px)";
  }

  function onDragEnd(event) {
    if (!drag) return;
    const finished = drag;
    drag = null;
    finished.node.removeEventListener("pointermove", onDragMove);
    finished.node.removeEventListener("pointerup", onDragEnd);
    finished.node.removeEventListener("pointercancel", onDragEnd);
    finished.node.classList.remove("is-dragging");
    finished.node.style.transform = "";
    ghost.hidden = true;

    if (!finished.moved) {
      select(finished.uid);
      return;
    }
    if (finished.ok) {
      PropertyState.move(finished.uid, finished.target.x, finished.target.y);
      select(finished.uid);
    } else {
      render();
      if (hooks.onRefused) hooks.onRefused("Il n'y a pas la place ici.");
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
    init, render, measure,
    startPlacing, cancelPlacing,
    select, clearSelection,
    isPlacing() { return placingUid; },
    selected() { return selectedUid; }
  };
})();
