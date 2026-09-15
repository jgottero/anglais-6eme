/* =====================================================================
   SCENES — the places the child can be, and the plots the property is
   made of.

   Nothing here is saved: the save file only knows which plots have been
   bought and what has been put down in each scene (see state.js). The
   map itself is rebuilt from these lines every time the page opens, so
   the plan can grow without touching anyone's property.

   A scene is made of:
     id       key used in the save file — never rename it.
     name     what the overlay shows when standing in it.
     indoor   picks the floor under everything, and the objects the shop
              offers there.
     land     size in tiles of everything the camera may show.
     patches  optional pieces of another ground inside a plot — a paved
              yard, a clearing — given from the corner of the plot.
     plots    the pieces of ground the scene is made of. Outside, every
              plot of the map is there from the start, each saying
              whether it has been bought; inside, the single floor of
              the room. What has not been bought is drawn under a veil,
              can be looked at, and can be bought at any time.
     blocks   what is built in and cannot be bought, moved or sold: the
              house, the walls, the sea, the stairs. A block takes both
              layers of its tiles, so nothing can be put on it, and a
              block with `to` leads to another scene.
   ===================================================================== */
const SCENES = (function () {

  /* What a block looks like and what it does. `tile` is repeated over
     the whole block, `sprite` is drawn once across it. */
  const BLOCKS = {
    house:       { fr: "Ta maison",   en: "your house",  sprite: "assets/house.svg",        action: "Entrer" },
    wall:        { fr: "Un mur",      en: "a wall",      tile: "assets/wall.svg" },
    window:      { fr: "Une fenêtre", en: "a window",    sprite: "assets/window.svg" },
    window_side: { fr: "Une fenêtre", en: "a window",    sprite: "assets/window-side.svg" },
    door:        { fr: "La porte",    en: "the door",    sprite: "assets/door.svg",         action: "Sortir" },
    cabin:       { fr: "La cabane",   en: "the cabin",   sprite: "assets/cabin.svg",        action: "Entrer" },
    cottage:     { fr: "La maisonnette", en: "the cottage", sprite: "assets/cottage.svg",   action: "Entrer" },
    tower:       { fr: "L'immeuble",  en: "the block of flats", sprite: "assets/apartment.svg", action: "Entrer" },
    tree:        { fr: "Un grand sapin", en: "a tall pine", sprite: "assets/items/pine-tree.svg" },
    stairs_up:   { fr: "L'escalier",  en: "the stairs",  sprite: "assets/stairs-up.svg",    action: "Monter" },
    stairs_down: { fr: "L'escalier",  en: "the stairs",  sprite: "assets/stairs-down.svg",  action: "Descendre" }
  };

  /* ---- Indoor plans ----
     # a wall, O a window, I a window in a side wall, D the door out,
     U stairs up, W stairs down, . free floor.
     Walls are one tile thick and every room is an even number of tiles
     across, so a floor can be covered edge to edge with ground tiles,
     which take two tiles each. */

  const HOUSE_PLAN = [
    "###OO########OO######",
    "#........#..........#",
    "#........#..........#",
    "I........#..........I",
    "I...................I",
    "#...................#",
    "#........#..........#",
    "#........#..........#",
    "#........#..........#",
    "####..########..#####",
    "#........#..........#",
    "#........#..........#",
    "I........#..........I",
    "I........#..........I",
    "#........#..........#",
    "#........#..........#",
    "####DD######OO#######"
  ];

  const CABIN_PLAN = [
    "####OO##OO##",
    "#..........#",
    "#..........#",
    "#..........#",
    "I..........I",
    "I..........I",
    "#..........#",
    "#..........#",
    "#..........#",
    "#####DD#####"
  ];

  const COTTAGE_PLAN = [
    "###OO########OO####",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "I.................I",
    "I.................I",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "#........#........#",
    "####DD######OO#####"
  ];

  // Each floor of the block of flats, with its own way up and down.
  const FLOOR_PLANS = {
    ground: [
      "###OO#########OO#####",
      "#..........#........#",
      "#..........#........#",
      "#..........#....UU..#",
      "#..........#....UU..#",
      "I..........#........I",
      "I...................I",
      "I...................I",
      "I..........#........I",
      "#..........#........#",
      "#..........#........#",
      "#..........#........#",
      "#..........#........#",
      "####DD########OO#####"
    ],
    middle: [
      "###OO#########OO#####",
      "#..........#........#",
      "#..........#........#",
      "#..........#....UU..#",
      "#..........#....UU..#",
      "I..........#........I",
      "I...................I",
      "I...................I",
      "I..........#........I",
      "#..........#....WW..#",
      "#..........#....WW..#",
      "#..........#........#",
      "#..........#........#",
      "####OO########OO#####"
    ],
    top: [
      "###OO#########OO#####",
      "#..........#........#",
      "#..........#........#",
      "#..........#........#",
      "#..........#........#",
      "I..........#........I",
      "I...................I",
      "I...................I",
      "I..........#........I",
      "#..........#....WW..#",
      "#..........#....WW..#",
      "#..........#........#",
      "#..........#........#",
      "####OO########OO#####"
    ]
  };

  /* A plan becomes as few rectangles as possible: runs of the same sign
     on a row, then rows stacked when they line up. A doorway two tiles
     wide is one door, a square of stairs is one staircase. */
  function blocksFromPlan(plan, ways) {
    const signs = { "#": "wall", O: "window", I: "window_side", D: "door", U: "stairs_up", W: "stairs_down" };
    const blocks = [];
    plan.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const kind = signs[row[x]];
        if (!kind) { x++; continue; }
        let run = 1;
        while (row[x + run] === row[x]) run++;
        const above = blocks.find(block =>
          block.kind === kind && block.x === x && block.w === run && block.y + block.h === y);
        if (above) above.h += 1;
        else blocks.push({ x, y, w: run, h: 1, kind, to: ways[row[x]] });
        x += run;
      }
    });
    return blocks;
  }

  function room(id, name, plan, ways) {
    return {
      id, name,
      indoor: true,
      land: { cols: plan[0].length, rows: plan.length },
      plots: [{ id: id + "-floor", x: 0, y: 0, w: plan[0].length, h: plan.length, ground: "floor", owned: true }],
      blocks: blocksFromPlan(plan, ways)
    };
  }

  /* ---- The plots ----
     They are bought in this order, each one bigger news than the last:
     room to spread out, then a wood with a cabin, the seaside, a hamlet
     of two little houses, and finally a block of flats whose three
     floors are three worlds of their own. Each sits next to the ones
     before it, so the property stays in one piece.

     Coordinates inside `blocks` are given from the corner of the plot;
     build() places them on the property. */
  const PLOTS = [
    {
      id: "home",
      name: "Ton terrain",
      x: 0, y: 0, w: 28, h: 20,
      ground: "grass",
      price: 0,
      blocks: [{ x: 10, y: 0, w: 8, h: 6, kind: "house", to: "house" }],
      rooms: [() => room("house", "Ta maison", HOUSE_PLAN, { D: "outside" })]
    },
    {
      id: "meadow",
      name: "Le pré",
      x: 28, y: 0, w: 20, h: 20,
      ground: "grass",
      price: 300,
      blocks: []
    },
    {
      id: "grove",
      name: "Le bosquet",
      x: 0, y: 20, w: 28, h: 16,
      ground: "forest",
      patches: [{ x: 16, y: 8, w: 10, h: 6, ground: "grass" }],   // a clearing
      price: 700,
      blocks: [
        { x: 2, y: 2, w: 4, h: 4, kind: "cabin", to: "cabin" },
        { x: 10, y: 0, w: 4, h: 4, kind: "tree" },
        { x: 18, y: 2, w: 4, h: 4, kind: "tree" },
        { x: 24, y: 8, w: 4, h: 4, kind: "tree" },
        { x: 12, y: 10, w: 4, h: 4, kind: "tree" }
      ],
      rooms: [() => room("cabin", "La cabane", CABIN_PLAN, { D: "outside" })]
    },
    {
      id: "beach",
      name: "La plage",
      x: 28, y: 20, w: 20, h: 16,
      ground: "sand",
      // The sea is painted with the ground, so its edge wanders like any
      // other: see js/ground.js. Nothing is built on it.
      patches: [{ x: 0, y: 12, w: 20, h: 6, ground: "water" }],
      price: 1500,
      blocks: []
    },
    {
      id: "hamlet",
      name: "Le hameau",
      x: 0, y: 36, w: 48, h: 16,
      ground: "grass",
      patches: [{ x: 16, y: 4, w: 12, h: 8, ground: "paving" }],  // the village square
      price: 3000,
      blocks: [
        { x: 4, y: 4, w: 6, h: 4, kind: "cottage", to: "cottage_west" },
        { x: 30, y: 4, w: 6, h: 4, kind: "cottage", to: "cottage_east" }
      ],
      rooms: [
        () => room("cottage_west", "La maisonnette du couchant", COTTAGE_PLAN, { D: "outside" }),
        () => room("cottage_east", "La maisonnette du levant", COTTAGE_PLAN, { D: "outside" })
      ]
    },
    {
      id: "tower",
      name: "L'immeuble",
      x: 48, y: 0, w: 16, h: 52,
      ground: "grass",
      patches: [{ x: 0, y: 2, w: 16, h: 14, ground: "paving" }],  // the yard
      price: 6000,
      blocks: [{ x: 2, y: 4, w: 10, h: 8, kind: "tower", to: "flat_1" }],
      rooms: [
        () => room("flat_1", "Immeuble — 1er étage", FLOOR_PLANS.ground, { D: "outside", U: "flat_2" }),
        () => room("flat_2", "Immeuble — 2e étage", FLOOR_PLANS.middle, { U: "flat_3", W: "flat_1" }),
        () => room("flat_3", "Immeuble — 3e étage", FLOOR_PLANS.top, { W: "flat_2" })
      ]
    }
  ];

  const FIRST_PLOT = PLOTS[0].id;

  function plot(id) {
    return PLOTS.find(one => one.id === id) || null;
  }

  // Everything still to be bought, in the order it is offered.
  function plotsForSale(owned) {
    return PLOTS.filter(one => (owned || []).indexOf(one.id) === -1);
  }

  /* Builds every scene. The whole map is there from the first day: what
     has been bought, and what has not, drawn under a veil with its price
     on it. Only a plot one owns brings its rooms along — there is no
     walking into a cabin in the wood before buying the wood. */
  function build(owned) {
    const mine = owned || [];
    const blocks = [];
    const scenes = {};

    PLOTS.forEach(one => {
      const bought = mine.indexOf(one.id) !== -1;
      (one.blocks || []).forEach(block => {
        blocks.push(Object.assign({}, block, {
          x: block.x + one.x,
          y: block.y + one.y,
          owned: bought,
          to: bought ? block.to : null
        }));
      });
      if (!bought) return;
      (one.rooms || []).forEach(make => {
        const built = make();
        scenes[built.id] = built;
      });
    });

    scenes.outside = {
      id: "outside",
      name: "Ta propriété",
      indoor: false,
      land: {
        cols: Math.max.apply(null, PLOTS.map(one => one.x + one.w)),
        rows: Math.max.apply(null, PLOTS.map(one => one.y + one.h))
      },
      plots: PLOTS.map(one => ({
        id: one.id, name: one.name, price: one.price,
        x: one.x, y: one.y, w: one.w, h: one.h,
        ground: one.ground,
        patches: (one.patches || []).map(patch => ({
          x: patch.x + one.x, y: patch.y + one.y, w: patch.w, h: patch.h, ground: patch.ground
        })),
        owned: mine.indexOf(one.id) !== -1
      })),
      blocks
    };
    return scenes;
  }

  return {
    BLOCKS, PLOTS, FIRST_PLOT,
    build, plot, plotsForSale,
    kind(name) { return BLOCKS[name] || null; },
    first: "outside"
  };
})();
