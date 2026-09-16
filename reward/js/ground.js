/* =====================================================================
   GROUND — paints the floor of a scene, one case at a time.

   Each case gets its own drawing, picked from a handful of variants for
   its ground, so a meadow is never the same square repeated. And the
   ground a case borrows is read a little way off, along a wandering
   line: that is what makes the sand creep into the grass instead of
   stopping dead at the edge of a plot.

   Everything here is decided from the case's own coordinates, so the
   world looks the same on every visit, and nothing has to be saved. The
   rules ask the same question through look(), which is why the sea one
   sees is exactly the sea one cannot build on.

   The whole floor is painted once onto a canvas and left alone until
   the map itself changes — a plot bought, another scene entered.
   ===================================================================== */
const Ground = (function () {

  const TILE = 32;                 // must match the world's tile size
  const FOLDER = "assets/ground/";

  /* Outside, the grounds of the map; inside, one floor per building —
     the cabin has its logs, the flats their poured floor, the harbour
     shed its planks. A room names the one it is laid on. */
  const VARIANTS = {
    grass:  ["grass-1.svg", "grass-2.svg", "grass-3.svg", "grass-4.svg"],
    forest: ["forest-1.svg", "forest-2.svg", "forest-3.svg"],
    sand:   ["sand-1.svg", "sand-2.svg", "sand-3.svg"],
    paving: ["paving-1.svg", "paving-2.svg"],
    water:  ["water-1.svg", "water-2.svg"],
    floor:      ["floor-1.svg", "floor-2.svg"],
    logs:       ["logs-1.svg", "logs-2.svg"],
    terracotta: ["terracotta-1.svg", "terracotta-2.svg"],
    stone:      ["stone-1.svg", "stone-2.svg"],
    lino:       ["lino-1.svg", "lino-2.svg"],
    polished:   ["polished-1.svg", "polished-2.svg"],
    carpet:     ["carpet-1.svg", "carpet-2.svg"],
    concrete:   ["concrete-1.svg", "concrete-2.svg"],
    planks:     ["planks-1.svg", "planks-2.svg"],
    // Out on a balcony: paving slabs, weathered by the open air.
    balcony:    ["balcony-1.svg", "balcony-2.svg"]
  };

  const WANDER = 2.6;    // how far a ground may stray over its border, in cases
  const GRAIN = 0.16;    // how quickly the wandering line turns
  const VEIL = "rgba(8, 24, 14, 0.56)";  // over a plot not bought yet

  const images = {};
  let loaded = false;
  const waiting = [];

  /* ---- The drawings ---- */

  function load(then) {
    if (loaded) { then(); return; }
    waiting.push(then);
    if (waiting.length > 1) return;   // someone else is already loading

    const names = Object.keys(VARIANTS).reduce((all, key) => all.concat(VARIANTS[key]), []);
    let left = names.length;
    const done = () => {
      if (--left > 0) return;
      loaded = true;
      waiting.splice(0).forEach(fn => fn());
    };
    names.forEach(name => {
      const image = new Image();
      image.onload = done;
      image.onerror = done;   // a missing drawing must not hang the world
      image.src = FOLDER + name;
      images[name] = image;
    });
  }

  /* ---- Chance, but always the same chance ---- */

  function hash(x, y, salt) {
    let n = (x * 374761393 + y * 668265263 + (salt || 0) * 1274126177) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  // Value noise: the same everywhere, smooth enough to draw a coastline.
  function noise(x, y, salt) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const top = hash(x0, y0, salt) * (1 - tx) + hash(x0 + 1, y0, salt) * tx;
    const bottom = hash(x0, y0 + 1, salt) * (1 - tx) + hash(x0 + 1, y0 + 1, salt) * tx;
    return top * (1 - ty) + bottom * ty;
  }

  /* ---- Painting ---- */

  function covers(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
  }

  function plotAt(plots, x, y) {
    for (let i = 0; i < plots.length; i++) {
      if (covers(plots[i], x, y)) return plots[i];
    }
    return null;
  }

  /* What a case looks like: its plot's ground, unless a patch of another
     ground lies over it — a paved yard, a clearing in the wood. */
  function groundAt(plots, x, y) {
    const plot = plotAt(plots, x, y);
    if (!plot) return null;
    const patch = (plot.patches || []).find(one => covers(one, x, y));
    return patch ? patch.ground : plot.ground;
  }

  /* The ground a case shows, coastline and all: the same answer the
     painting gives, so what looks like sea cannot be built on and what
     looks like sand can. */
  function look(place, x, y) {
    const plots = place.plots || [];
    if (!plotAt(plots, x, y)) return null;
    /* The wandering line belongs outdoors, where sand should mouth into
       grass and a shore should look like a shore. Indoors everything is
       built: a balcony stops at its wall, in a straight line, and a
       drifting edge would only look like a mistake. */
    if (place.indoor) return groundAt(plots, x, y);
    const drift = (salt) => (noise(x * GRAIN, y * GRAIN, salt) - 0.5) * 2 * WANDER;
    return groundAt(plots, Math.round(x + drift(1)), Math.round(y + drift(2))) ||
      groundAt(plots, x, y);
  }

  function paint(canvas, place) {
    const land = place.land;
    const plots = place.plots || [];
    canvas.width = land.cols * TILE;
    canvas.height = land.rows * TILE;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < land.rows; y++) {
      for (let x = 0; x < land.cols; x++) {
        const here = plotAt(plots, x, y);
        if (!here) continue;   // beyond the map: the wild stays wild

        /* The look is borrowed from a point that drifts to and fro, so
           the line between two grounds weaves instead of following the
           edge of the plot. Off the map, the plot's own ground stands. */
        const kinds = VARIANTS[look(place, x, y)] || VARIANTS.grass;
        const image = images[kinds[Math.floor(hash(x, y, 3) * kinds.length)]];
        const px = x * TILE;
        const py = y * TILE;
        if (image && image.width) {
          if (hash(x, y, 4) < 0.5) {
            ctx.drawImage(image, px, py, TILE, TILE);
          } else {
            // Turned over: the same drawing, one more face.
            ctx.save();
            ctx.translate(px + TILE, py);
            ctx.scale(-1, 1);
            ctx.drawImage(image, 0, 0, TILE, TILE);
            ctx.restore();
          }
        }

        /* The veil follows the plot itself, not the wandering line: what
           is for sale has to read as a piece of land with an edge. */
        if (!here.owned) {
          ctx.fillStyle = VEIL;
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  return { load, paint, look, TILE };
})();
