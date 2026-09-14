/* =====================================================================
   SCENES — the places the child can be: the property, and the inside of
   the house. Each scene is its own little world, with its own size, its
   own fixed walls and its own objects; they share nothing but the purse.

   A scene is made of:
     id       key in the save file — never rename it.
     name     what the overlay shows when standing in it.
     indoor   picks the floor under everything, and the objects the shop
              offers there.
     land     size in tiles.
     blocks   what is built in and cannot be bought, moved or sold:
              the house from outside, the walls and the door inside.
              A block takes both layers of its tiles, so nothing can be
              put on it. A block with `to` leads to another scene.

   Later on, buying a plot with a building on it means adding one scene
   per floor here, with a block leading from one to the next. Nothing
   else has to change: the state, the world and the shop already work
   scene by scene.
   ===================================================================== */
const SCENES = (function () {

  /* What a block looks like and what it does. `tile` is repeated over
     the whole block, `sprite` is drawn once across it. */
  const BLOCKS = {
    house: { fr: "Ta maison", en: "your house", sprite: "assets/house.svg", action: "Entrer" },
    wall:  { fr: "Un mur",    en: "a wall",     tile: "assets/wall.svg" },
    door:  { fr: "La porte",  en: "the door",   sprite: "assets/door.svg", action: "Sortir" }
  };

  /* The inside of the house, drawn as a map so the plan can be redrawn
     by editing these lines: # a wall, D the door out, . free floor. */
  const HOUSE_PLAN = [
    "##########",
    "#...#....#",
    "#...#....#",
    "#........#",
    "#...##.###",
    "#...#....#",
    "#...#....#",
    "##D#######"
  ];

  // Walls become as few rectangles as possible: one per run of tiles.
  function blocksFromPlan(plan, doors) {
    const blocks = [];
    plan.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const sign = row[x];
        if (sign === "#") {
          let run = 1;
          while (row[x + run] === "#") run++;
          blocks.push({ x, y, w: run, h: 1, kind: "wall" });
          x += run;
        } else {
          if (sign === "D") blocks.push({ x, y, w: 1, h: 1, kind: "door", to: doors.D });
          x++;
        }
      }
    });
    return blocks;
  }

  function outside() {
    return {
      id: "outside",
      name: "Ta propriété",
      indoor: false,
      land: { cols: 14, rows: 10 },
      blocks: [{ x: 5, y: 0, w: 4, h: 3, kind: "house", to: "house" }],
      placed: []
    };
  }

  function house() {
    return {
      id: "house",
      name: "Ta maison",
      indoor: true,
      land: { cols: HOUSE_PLAN[0].length, rows: HOUSE_PLAN.length },
      blocks: blocksFromPlan(HOUSE_PLAN, { D: "outside" }),
      placed: []
    };
  }

  function initial() {
    return { outside: outside(), house: house() };
  }

  return {
    BLOCKS,
    initial,
    kind(name) { return BLOCKS[name] || null; },
    first: "outside"
  };
})();
