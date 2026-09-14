/* =====================================================================
   WORLD — the scene the child is standing in, full screen, seen from
   above: the property, or the inside of the house.

   The scene is drawn once at a fixed tile size and the whole thing is
   moved under a camera: dragging pans, two fingers pinch to zoom, the
   wheel zooms on a computer. Changing scene redraws everything and
   frames the new one.

   Gestures, in order of priority:
     two pointers                 -> pinch zoom and pan
     press on the selected object -> move that object
     press on anything else       -> pan the camera; a press that does
                                     not travel either picks what is
                                     under it, or puts down whatever the
                                     shop handed over — and pays for it

   Rules (what fits where, what it costs) live in state.js; this file
   only turns the state into elements, and pointer events back into
   state calls.
   ===================================================================== */
const World = (function () {

  const TILE = 64;            // world pixels per tile, before zoom
  const MAX_SCALE = 2.4;
  const DRAG_THRESHOLD = 6;   // screen pixels before a press becomes a drag
  const EDGE_PAD = 28;        // how far the scene may travel off screen

  let viewport = null;
  let world = null;
  let ghost = null;
  let hooks = {};

  const cam = { x: 0, y: 0, scale: 1 };
  const pointers = new Map(); // live pointers, by id
  let gesture = null;         // pan / object / pinch
  let placing = null;         // { id, r } chosen in the shop, in hand
  let selected = null;        // { kind: "object", uid } | { kind: "block", index }
  let drawnScene = null;      // which scene the elements belong to

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
    const land = PropertyState.scene().land;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const ww = land.cols * TILE * cam.scale;
    const wh = land.rows * TILE * cam.scale;
    // Smaller than the screen: centred. Bigger: kept under the screen,
    // so the scene can never be dragged away out of sight.
    cam.x = ww + 2 * EDGE_PAD <= vw ? (vw - ww) / 2
      : Math.max(vw - ww - EDGE_PAD, Math.min(EDGE_PAD, cam.x));
    cam.y = wh + 2 * EDGE_PAD <= vh ? (vh - wh) / 2
      : Math.max(vh - wh - EDGE_PAD, Math.min(EDGE_PAD, cam.y));
  }

  // Scale at which the whole scene just fits the screen. Zooming out any
  // further would only add empty ground around it, so it is the floor.
  function fitScale() {
    const land = PropertyState.scene().land;
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

  /* Opening view: between "the whole scene fits" and "the scene fills
     the screen". Fitting alone leaves the objects tiny on a phone,
     filling alone shows only a corner. */
  function fitCamera() {
    const land = PropertyState.scene().land;
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
    const place = PropertyState.scene();

    // Coming from another scene: nothing that was in hand or picked
    // there means anything here.
    if (drawnScene !== place.id) {
      placing = null;
      selected = null;
      drawnScene = place.id;
      if (hooks.onPlacingChange) hooks.onPlacingChange(null);
      if (hooks.onSelect) hooks.onSelect(null);
      if (hooks.onScene) hooks.onScene(place);
    }

    world.style.width = place.land.cols * TILE + "px";
    world.style.height = place.land.rows * TILE + "px";
    world.style.setProperty("--tile", TILE + "px");
    world.classList.toggle("is-indoor", !!place.indoor);
    world.innerHTML = "";

    place.blocks.forEach((block, index) => {
      const kind = SCENES.kind(block.kind);
      if (!kind) return;
      const node = document.createElement("div");
      node.className = "blk blk-" + block.kind +
        (isSelected("block", index) ? " is-selected" : "");
      node.dataset.block = index;
      node.style.cssText = box(block.x, block.y, block.w, block.h);
      if (kind.sprite) {
        node.innerHTML = '<img src="' + kind.sprite + '" alt="' + kind.fr + '" draggable="false">';
      } else {
        node.style.backgroundImage = 'url("' + kind.tile + '")';
        node.style.backgroundSize = TILE + "px " + TILE + "px";
      }
      world.appendChild(node);
    });

    /* The ground (paths, fields, rugs) is laid down first, then
       everything that stands on it, each layer from the back of the
       scene to the front so that what is lower overlaps what is
       behind it. */
    const rank = entry => CATALOG.layerOf(CATALOG.item(entry.id)) === "ground" ? 0 : 1;
    place.placed.slice().sort((a, b) => rank(a) - rank(b) || a.y - b.y).forEach(entry => {
      const item = CATALOG.item(entry.id);
      if (!item) return;
      const size = CATALOG.footprint(item, entry.r);
      const node = document.createElement("div");
      node.className = "ob" +
        (CATALOG.layerOf(item) === "ground" ? " is-ground" : "") +
        (isSelected("object", entry.uid) ? " is-selected" : "");
      node.dataset.uid = entry.uid;
      node.style.cssText = box(entry.x, entry.y, size.w, size.h);
      node.innerHTML = art(item, entry.r);
      world.appendChild(node);
    });

    world.appendChild(ghost);
    applyCamera();
  }

  function box(x, y, w, h) {
    return "left:" + x * TILE + "px;top:" + y * TILE + "px;" +
           "width:" + w * TILE + "px;height:" + h * TILE + "px;";
  }

  /* The drawing keeps its own width and height and is spun inside the
     tiles it takes: a bench turned sideways is the same bench. */
  function art(item, turn) {
    const quarter = (turn || 0) % 4;
    const style = quarter
      ? ' style="width:' + item.w * TILE + 'px;height:' + item.h * TILE + 'px;' +
        'transform:translate(-50%,-50%) rotate(' + quarter * 90 + 'deg)"'
      : "";
    return '<img class="' + (quarter ? "is-turned" : "") + '" src="' + CATALOG.assetUrl(item.id) +
      '" alt="' + item.fr + '" draggable="false"' + style + '>';
  }

  function showGhost(x, y, item, turn, valid, withArt) {
    const size = CATALOG.footprint(item, turn);
    ghost.hidden = false;
    ghost.style.cssText = box(x, y, size.w, size.h);
    ghost.classList.toggle("is-bad", !valid);
    ghost.innerHTML = withArt ? art(item, turn) : "";
  }

  function hideGhost() {
    ghost.hidden = true;
    ghost.innerHTML = "";
  }

  /* ---- Coordinates ---- */

  // Pointer position in tile units (fractional) in the scene.
  function pointerTile(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - cam.x) / cam.scale / TILE,
      y: (clientY - rect.top - cam.y) / cam.scale / TILE
    };
  }

  /* Where an object held in hand would land. The tile under the finger
     is always one of the tiles it covers — rounding around the middle
     would make a two-tile object flip from one row to the next on a
     boundary the child cannot see. */
  function centredTarget(clientX, clientY, item, turn) {
    const land = PropertyState.scene().land;
    const size = CATALOG.footprint(item, turn);
    const point = pointerTile(clientX, clientY);
    const anchor = (along, tiles, limit) =>
      Math.max(0, Math.min(limit - tiles, Math.floor(along) - Math.floor((tiles - 1) / 2)));
    return {
      x: anchor(point.x, size.w, land.cols),
      y: anchor(point.y, size.h, land.rows)
    };
  }

  /* ---- Gestures ---- */

  function onPointerDown(event) {
    if (event.button !== undefined && event.button > 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) { startPinch(); return; }
    if (pointers.size > 2 || (gesture && gesture.type === "pinch")) return;

    // With something in hand, the press itself shows where it would land.
    if (placing) hoverPlacing(event);

    /* Only the object already picked can be dragged. Everything else
       pans the camera, which is what a finger on the ground means far
       more often than "move this hen". */
    const node = placing ? null : event.target.closest(".ob, .blk");
    const uid = node && node.dataset.uid !== undefined ? Number(node.dataset.uid) : null;
    if (uid === null || !isSelected("object", uid)) {
      gesture = {
        type: "pan",
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        camX: cam.x,
        camY: cam.y,
        moved: false,
        // A press that never travels picks whatever is under it.
        tapNode: node
      };
      return;
    }

    const entry = PropertyState.scene().placed.find(one => one.uid === uid);
    const item = entry && CATALOG.item(entry.id);
    if (!item) return;
    const point = pointerTile(event.clientX, event.clientY);
    gesture = {
      type: "object",
      id: event.pointerId,
      uid, item, node,
      turn: entry.r || 0,
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
      // It stays selected while travelling, so a refused drop leaves it
      // in hand rather than making the child pick it again.
      if (gesture.type === "object") gesture.node.classList.add("is-dragging");
    }

    if (gesture.type === "pan") {
      // A travelling finger is moving the camera, not putting anything down.
      if (placing) hideGhost();
      cam.x = gesture.camX + (event.clientX - gesture.startX);
      cam.y = gesture.camY + (event.clientY - gesture.startY);
      clampCamera();
      applyCamera();
      return;
    }

    if (gesture.type === "object") {
      const land = PropertyState.scene().land;
      const size = CATALOG.footprint(gesture.item, gesture.turn);
      const point = pointerTile(event.clientX, event.clientY);
      const x = Math.round(Math.max(0, Math.min(land.cols - size.w, point.x - gesture.offsetX)));
      const y = Math.round(Math.max(0, Math.min(land.rows - size.h, point.y - gesture.offsetY)));
      gesture.target = { x, y };
      gesture.ok = PropertyState.canPlace(gesture.item, x, y, gesture.uid, gesture.turn);
      showGhost(x, y, gesture.item, gesture.turn, gesture.ok, false);
      // The object follows the finger; the ghost shows where it lands.
      gesture.node.style.transform =
        "translate(" + (event.clientX - gesture.startX) / cam.scale + "px," +
                       (event.clientY - gesture.startY) / cam.scale + "px)";
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
      if (finished.tapNode) pick(finished.tapNode);
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
      } else {
        render();
        refuse();
      }
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

  /* ---- The object held in hand ----
     The shop hands over a catalogue id; it stays in hand so that a row
     of fields can be laid one tap after another, and is paid for each
     time it lands. */

  function startPlacing(id) {
    if (!CATALOG.item(id)) return;
    placing = { id, r: 0 };
    clearSelection();
    if (hooks.onPlacingChange) hooks.onPlacingChange(placing);
  }

  // A quarter turn of what is in hand, before it is put down.
  function turnHeld() {
    const item = heldItem();
    if (!item || !item.turns) return false;
    placing.r = (placing.r + 1) % 4;
    hideGhost();
    if (hooks.onPlacingChange) hooks.onPlacingChange(placing);
    return true;
  }

  // A quarter turn of what is selected, where it stands.
  function turnSelected() {
    if (!selected || selected.kind !== "object") return false;
    if (PropertyState.turn(selected.uid)) return true;
    if (hooks.onRefused) hooks.onRefused("Pas la place de la tourner ici.");
    return false;
  }

  function cancelPlacing() {
    if (!placing) return;
    placing = null;
    hideGhost();
    if (hooks.onPlacingChange) hooks.onPlacingChange(null);
  }

  function heldItem() {
    return placing ? CATALOG.item(placing.id) : null;
  }

  // Follows the pointer on a computer, and the press itself on a screen.
  function hoverPlacing(event) {
    const item = heldItem();
    if (!item) return;
    const target = centredTarget(event.clientX, event.clientY, item, placing.r);
    showGhost(target.x, target.y, item, placing.r,
      PropertyState.canPlace(item, target.x, target.y, null, placing.r), true);
  }

  function tapOnGround(event) {
    if (!placing) { clearSelection(); return; }
    const item = heldItem();
    if (!item) { cancelPlacing(); return; }
    const target = centredTarget(event.clientX, event.clientY, item, placing.r);
    hideGhost();
    if (PropertyState.buyAt(item.id, target.x, target.y, placing.r)) {
      if (hooks.onPlaced) hooks.onPlaced(item);
    } else if (PropertyState.get().coins < item.price) {
      cancelPlacing();
      if (hooks.onRefused) hooks.onRefused("Il te manque des pièces.");
    } else {
      refuse();
    }
  }

  /* ---- Selection ----
     Objects can be moved and sold; what is built in can only be looked
     at, and sometimes walked through. */

  function isSelected(kind, key) {
    return !!selected && selected.kind === kind &&
      (kind === "object" ? selected.uid === key : selected.index === key);
  }

  function pick(node) {
    if (node.dataset.uid !== undefined) {
      select({ kind: "object", uid: Number(node.dataset.uid) });
      return;
    }
    // A wall is scenery: only what leads somewhere is worth picking.
    const index = Number(node.dataset.block);
    const block = PropertyState.scene().blocks[index];
    if (block && block.to) select({ kind: "block", index });
    else clearSelection();
  }

  function select(what) {
    selected = what;
    render();
    if (hooks.onSelect) hooks.onSelect(selected);
  }

  function clearSelection() {
    if (!selected) return;
    selected = null;
    render();
    if (hooks.onSelect) hooks.onSelect(null);
  }

  return {
    init, render, fitCamera,
    startPlacing, cancelPlacing, turnHeld, turnSelected,
    select, clearSelection,
    isPlacing() { return placing; },
    held() { return placing; },
    selected() { return selected; }
  };
})();
