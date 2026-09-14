/* =====================================================================
   FARM PROGRESSION — ranks, rewards and the farm drawing.

   This file has nothing to do with learning English. It knows how points
   turn into ranks, what can be won at each rank, and how to draw the farm.
   index.html only calls FARM.rankOf, FARM.offerFor, FARM.sceneSvg and
   FARM.itemSvg, so this whole file can be reworked on its own.

   To add an item, append it to ITEMS. Its art is a small pixel grid: one
   character per pixel, "." being transparent, every other letter a colour
   from PALETTE. Grids do not all have to be the same size.
   ===================================================================== */
const FARM = (function () {

  /* ---- Ranks ----
     A hundred ranks over a school year. The first ones fall within half a
     session so the habit gets rewarded straight away, the last ones take
     three or four sessions so the climb keeps its value. Steps grow
     linearly from FIRST_STEP to LAST_STEP, which totals about 11000
     points: a full year of regular work. */
  const RANK_COUNT = 100;
  const FIRST_STEP = 25;
  const LAST_STEP = 200;

  const THRESHOLDS = (function () {
    const list = [0];
    for (let rank = 2; rank <= RANK_COUNT; rank++) {
      const step = FIRST_STEP + (LAST_STEP - FIRST_STEP) * (rank - 2) / (RANK_COUNT - 2);
      list.push(Math.round(list[list.length - 1] + step));
    }
    return list;
  })();

  // One title per ten ranks.
  const TIERS = [
    "Seedling", "Sprout", "Grower", "Farmhand", "Harvester",
    "Rancher", "Homesteader", "Orchardist", "Master Farmer", "Valley Legend"
  ];

  function rankOf(points) {
    let index = 1;
    while (index < RANK_COUNT && points >= THRESHOLDS[index]) index++;
    const floor = THRESHOLDS[index - 1];
    const next = index < RANK_COUNT ? THRESHOLDS[index] : null;
    return {
      index,
      name: TIERS[Math.min(TIERS.length - 1, Math.floor((index - 1) / 10))],
      next,
      ratio: next ? (points - floor) / (next - floor) : 1,
      toGo: next ? next - points : 0,
      last: index >= RANK_COUNT
    };
  }

  /* ---- Rarity ----
     Rarer items only start showing up as the farm grows, and the common
     ones slowly fade out. Every tenth rank guarantees the best rarity
     currently reachable, so a long climb always ends on something good. */
  const RARITIES = {
    common:    { label: "Commun",    from: 1,  colour: "#7C8AA0" },
    uncommon:  { label: "Peu commun", from: 8,  colour: "#3F8F3A" },
    rare:      { label: "Rare",      from: 22, colour: "#2F7FC1" },
    epic:      { label: "Épique",    from: 45, colour: "#8E6FC4" },
    legendary: { label: "Légendaire", from: 75, colour: "#C9A227" }
  };

  /* How often each rarity comes up, by rank. Values between two rows are
     interpolated, and a rarity stays out until its `from` rank whatever the
     curve says. Editing these numbers is the way to make the farm fill up
     faster or keep the good items scarcer. */
  const RARITY_CURVE = [
    { rank: 1,   common: 100, uncommon: 0,  rare: 0,  epic: 0,  legendary: 0 },
    { rank: 10,  common: 72,  uncommon: 28, rare: 0,  epic: 0,  legendary: 0 },
    { rank: 25,  common: 45,  uncommon: 35, rare: 20, epic: 0,  legendary: 0 },
    { rank: 45,  common: 26,  uncommon: 32, rare: 28, epic: 14, legendary: 0 },
    { rank: 75,  common: 12,  uncommon: 24, rare: 30, epic: 24, legendary: 10 },
    { rank: 100, common: 5,   uncommon: 15, rare: 27, epic: 32, legendary: 21 }
  ];

  function rarityWeight(rarity, rank) {
    if (rank < RARITIES[rarity].from) return 0;
    let low = RARITY_CURVE[0];
    let high = RARITY_CURVE[RARITY_CURVE.length - 1];
    for (let i = 0; i < RARITY_CURVE.length - 1; i++) {
      if (rank >= RARITY_CURVE[i].rank && rank <= RARITY_CURVE[i + 1].rank) {
        low = RARITY_CURVE[i];
        high = RARITY_CURVE[i + 1];
        break;
      }
    }
    const span = high.rank - low.rank;
    const ratio = span ? (rank - low.rank) / span : 0;
    return low[rarity] + (high[rarity] - low[rarity]) * ratio;
  }

  const PALETTE = {
    n: "#2E2A26", k: "#5C3A20", b: "#8A5A34", t: "#D9B26A",
    y: "#F2C94C", o: "#E08A2E", r: "#C0392B", p: "#E88FB4",
    u: "#8E6FC4", g: "#6FBF4A", G: "#3F8F3A", w: "#F6F3EC",
    s: "#A7B0BA", d: "#6C757D", c: "#5BA9D8", a: "#C9A227"
  };

  /* ---- Item catalogue ----
     zone decides which band of the farm the item stands in.
     unique: true means it can only be won once. */
  const ITEMS = [
    // ---------- common ----------
    { id: "wheat", fr: "Blé", en: "wheat", rarity: "common", zone: "crop", art: [
      "........", "..t..t..", ".ttt.ttt", "..t..t..", ".ttt.ttt", "..t..t..", "..k..k..", "..k..k.."
    ]},
    { id: "carrot", fr: "Carottes", en: "carrots", rarity: "common", zone: "crop", art: [
      "........", "..G..G..", ".GGGGGG.", "..GGGG..", "...oo...", "...oo...", "....o...", "........"
    ]},
    { id: "potato", fr: "Pommes de terre", en: "potatoes", rarity: "common", zone: "crop", art: [
      "........", "..gGg...", ".gGGGg..", "..gGg...", "..bb.bb.", ".bbb.bbb", "..bb.bb.", "........"
    ]},
    { id: "turnip", fr: "Navets", en: "turnips", rarity: "common", zone: "crop", art: [
      "........", "..G.G...", ".GGGGG..", "..www...", ".wwwww..", ".wuuuw..", "..uuu...", "........"
    ]},
    { id: "cabbage", fr: "Choux", en: "cabbages", rarity: "common", zone: "crop", art: [
      "........", "..GGG...", ".GgggG..", "GggwggG.", "GggggG..", ".GGGG...", "..kk....", "........"
    ]},
    { id: "flowers", fr: "Fleurs", en: "flowers", rarity: "common", zone: "crop", art: [
      "........", ".p...y..", "ppp.yyy.", ".p.g.y..", ".gg.g...", "..g.g...", "..gGg...", "........"
    ]},
    { id: "fence", fr: "Clôture", en: "a fence", rarity: "common", zone: "deco", art: [
      "............", "b..b..b..b..", "bbbbbbbbbbbb", "b..b..b..b..", "bbbbbbbbbbbb", "b..b..b..b.."
    ]},
    { id: "path", fr: "Sentier", en: "a path", rarity: "common", zone: "deco", art: [
      "..........", ".ss.dd.ss.", "sssddsssd.", ".ss.dd.ss.", "..........", ".........."
    ]},
    { id: "hay", fr: "Botte de foin", en: "a hay bale", rarity: "common", zone: "deco", art: [
      "........", ".tttttt.", "tkttttkt", "tttttttt", "tkttttkt", ".tttttt."
    ]},
    { id: "bush", fr: "Buisson", en: "a bush", rarity: "common", zone: "tree", art: [
      "............", "............", "....GGG.....", "..GGgggGG...", ".GgggggggG..", "GggggggggG..",
      ".GgggggggG..", "..GGgggGG...", "....kkk.....", "....kkk.....", "............", "............"
    ]},
    { id: "scarecrow", fr: "Épouvantail", en: "a scarecrow", rarity: "common", zone: "deco", art: [
      "..tttt..", ".twwwwt.", ".wnwwnw.", ".wwnnww.", "rrrrrrrr", ".rbbbbr.", "..bbbb..", "...bb..."
    ]},

    // ---------- uncommon ----------
    { id: "apple_tree", fr: "Pommier", en: "an apple tree", rarity: "uncommon", zone: "tree", art: [
      "...GGGG.....", "..GgggGG....", ".GgrgggggG..", "GgggggrgggG.", "GgrggggggGG.", ".GgggrgggG..",
      "..GGgggGG...", "....kbk.....", "....kbk.....", "....kbk.....", "...kkbkk....", "............"
    ]},
    { id: "pine_tree", fr: "Sapin", en: "a pine tree", rarity: "uncommon", zone: "tree", art: [
      ".....GG.....", "....GGGG....", "...GGggGG...", "....GGGG....", "...GGggGG...", "..GGggggGG..",
      "...GGGGGG...", "..GGggggGG..", ".GGGGGGGGGG.", "....kbk.....", "....kbk.....", "...kkbkk...."
    ]},
    { id: "chicken", fr: "Poule", en: "a hen", rarity: "uncommon", zone: "animal", art: [
      "........", "..rr....", ".wwww...", "wwwwwwo.", "wwwwww..", ".wwwww..", "..y..y..", "..y..y.."
    ]},
    { id: "beehive", fr: "Ruche", en: "a beehive", rarity: "uncommon", zone: "deco", art: [
      "..yyyy..", ".yayyay.", "yyyyyyyy", ".yaynay.", "yyyyyyyy", "..kkkk.."
    ]},
    { id: "sunflower", fr: "Tournesols", en: "sunflowers", rarity: "uncommon", zone: "crop", art: [
      "..y..y..", ".yay.yay", "..y..y..", "..g..g..", ".Gg..gG.", "..g..g..", "..g..g..", "..k..k.."
    ]},
    { id: "lantern", fr: "Lanterne", en: "a lantern", rarity: "uncommon", zone: "deco", art: [
      "..dd..", ".dyyd.", ".yyyy.", ".dyyd.", "..dd..", "..dd..", "..dd..", "..dd..", ".dddd.", "dddddd"
    ]},
    { id: "bench", fr: "Banc", en: "a bench", rarity: "uncommon", zone: "deco", art: [
      "..........", "b........b", "bbbbbbbbbb", "b........b", "bbbbbbbbbb", ".b......b."
    ]},
    { id: "well", fr: "Puits", en: "a well", rarity: "uncommon", zone: "build", art: [
      "..kkkkkk..", ".kkkkkkkk.", "....bb....", "....bb....", "..ssssss..", ".scccccs..",
      "..cccccc..", "..ssssss..", "...ssss...", "..........", "..........", ".........."
    ]},
    { id: "pumpkin", fr: "Citrouilles", en: "pumpkins", rarity: "uncommon", zone: "crop", art: [
      "........", "....G...", "...GG...", ".oooooo.", "ooaooaoo", "oooooooo", ".oooooo.", "........"
    ]},

    // ---------- rare ----------
    { id: "cow", fr: "Vache", en: "a cow", rarity: "rare", zone: "animal", art: [
      "..........", "..wwwwww..", ".wwnnwwww.", "wwwwwwnnww", "wwnnwwwwwp", ".wwwwwwww.", "..k..k.k..", "..k..k.k.."
    ]},
    { id: "sheep", fr: "Mouton", en: "a sheep", rarity: "rare", zone: "animal", art: [
      "..........", "..wwwwww..", ".wwwwwwww.", "wwwwwwwwnn", "wwwwwwwwnn", ".wwwwwwww.", "..k..k.k..", "..k..k.k.."
    ]},
    { id: "coop", fr: "Poulailler", en: "a coop", rarity: "rare", zone: "build", art: [
      "....rrrr....", "...rrrrrr...", "..rrrrrrrr..", ".rrrrrrrrrr.", "bbbbbbbbbbbb", "bbwwbbbbwwbb",
      "bbwwbbbbwwbb", "bbbbbkkbbbbb", "bbbbbkkbbbbb", "bbbbbkkbbbbb", "............", "............"
    ]},
    { id: "pond", fr: "Mare", en: "a pond", rarity: "rare", zone: "deco", art: [
      "...GGGG...", ".GGccccGG.", "GccccccccG", "GccwcccccG", ".GccccccG.", "..GGGGGG.."
    ]},
    { id: "silo", fr: "Silo", en: "a silo", rarity: "rare", zone: "build", art: [
      "..ssss..", ".ssssss.", "sdddddds", "sdddddds", "sdwwwwds", "sdddddds",
      "sdddddds", "sdwwwwds", "sdddddds", "sdddddds", "ssssssss", "ssssssss"
    ]},
    { id: "mushrooms", fr: "Tronc à champignons", en: "a mushroom log", rarity: "rare", zone: "deco", art: [
      "..........", "..r..r....", ".rwr.rwr..", "..w...w...", "kkkkkkkkkk", "kbkbkbkbkb"
    ]},

    // ---------- epic ----------
    { id: "barn", fr: "Grange", en: "a barn", rarity: "epic", zone: "build", unique: true, art: [
      "...rrrrrrrr...", "..rrrrrrrrrr..", ".rrrrrrrrrrrr.", "rrrrrrrrrrrrrr", "rrbbrrrrrrbbrr",
      "rrbbrrrrrrbbrr", "rrrrrrwwrrrrrr", "rrrrrrwwrrrrrr", "rrbbbbwwbbbbrr", "rrbbbbwwbbbbrr",
      "rrbbbbwwbbbbrr", "kkkkkkkkkkkkkk"
    ]},
    { id: "greenhouse", fr: "Serre", en: "a greenhouse", rarity: "epic", zone: "build", unique: true, art: [
      "....dddddd....", "...dccccccd...", "..dcccccccc...", ".dcccccccccd..",
      "dccwccccwcccd.", "dccccccccccd..", "dcccwccwcccd..", "dccccccccccd..",
      "dccwccccwcccd.", "dccccccccccd..", "kkkkkkkkkkkkk.", "kkkkkkkkkkkkk."
    ]},
    { id: "windmill", fr: "Moulin", en: "a windmill", rarity: "epic", zone: "build", unique: true, art: [
      "..w..nn..w..", "..ww.nn.ww..", "...wwnnww...", "nnnnnnnnnnnn", "...wwnnww...", "..ww.nn.ww..",
      "..w..nn..w..", "....ssss....", "....ssss....", "...ssddss...", "...ssssss...", "..ssssssss.."
    ]},
    { id: "horse", fr: "Cheval", en: "a horse", rarity: "epic", zone: "animal", art: [
      "........bb", "..bbbbbbbn", ".bbbbbbbbb", "bbbbbbbbb.", "bbbbbbbb..", ".bbbbbbb..", ".k.k.k.k..", ".k.k.k.k.."
    ]},

    // ---------- legendary ----------
    { id: "golden_scarecrow", fr: "Épouvantail doré", en: "a golden scarecrow", rarity: "legendary", zone: "deco", unique: true, art: [
      "..aaaa..", ".ayyyya.", ".ynyyny.", ".yynnyy.", "aaaaaaaa", ".ayyyya.", "..aaaa..", "...aa..."
    ]},
    { id: "ancient_tree", fr: "Arbre ancien", en: "an ancient tree", rarity: "legendary", zone: "tree", unique: true, art: [
      "...GGGGGG...", "..GggggggG..", ".GggagggggG.", "GgggggggaggG", "GgaggggggggG", "GggggagggggG",
      ".GgggggggG..", "..GGgggGG...", "....kbk.....", "...kkbkk....", "...kbbbk....", "..kkbbbkk..."
    ]},
    { id: "rainbow_flower", fr: "Fleur arc-en-ciel", en: "a rainbow flower", rarity: "legendary", zone: "crop", unique: true, art: [
      "...r....", "..rpu...", ".rpuyc..", "..puy...", "...g....", "..GgG...", "...g....", "...k...."
    ]},
    { id: "statue", fr: "Statue", en: "a statue", rarity: "legendary", zone: "build", unique: true, art: [
      "....ss....", "...ssss...", "...sdds...", "...ssss...", "..ssssss..", ".s.ssss.s.",
      "...ssss...", "...s..s...", "..ssssss..", ".dddddddd.", "dddddddddd", ".........."
    ]}
  ];

  const BY_ID = {};
  ITEMS.forEach(item => { BY_ID[item.id] = item; });

  /* ---- The offer ----
     Three items to pick from. Duplicates of the same item are allowed for
     everything except the unique ones, so the catalogue never runs dry and
     a farm ends up with rows of crops rather than one of each. */
  function available(rank, owned) {
    return ITEMS.filter(item => {
      if (rank < RARITIES[item.rarity].from) return false;
      if (item.unique && owned.indexOf(item.id) !== -1) return false;
      return true;
    });
  }

  // A rarity is drawn first, then an item within it. Drawing items directly
  // would let whichever rarity holds the most items swamp the others.
  function pickOne(pool, rank, random) {
    const rarities = Object.keys(RARITIES)
      .filter(rarity => pool.some(item => item.rarity === rarity));
    const weights = rarities.map(rarity => rarityWeight(rarity, rank));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let chosen = rarities[0];
    if (total > 0) {
      let target = random() * total;
      for (let i = 0; i < rarities.length; i++) {
        target -= weights[i];
        if (target <= 0) { chosen = rarities[i]; break; }
      }
    }
    const inRarity = pool.filter(item => item.rarity === chosen);
    return inRarity[Math.floor(random() * inRarity.length)];
  }

  function offerFor(rank, owned, random) {
    const rng = random || Math.random;
    const pool = available(rank, owned || []);
    const chosen = [];

    // Every tenth rank guarantees the best rarity reachable at that point.
    if (rank % 10 === 0) {
      const order = ["legendary", "epic", "rare", "uncommon", "common"];
      const best = order.find(rarity =>
        rank >= RARITIES[rarity].from && pool.some(item => item.rarity === rarity));
      if (best) {
        const top = pool.filter(item => item.rarity === best);
        chosen.push(top[Math.floor(rng() * top.length)]);
      }
    }

    while (chosen.length < 3 && chosen.length < pool.length) {
      const rest = pool.filter(item => chosen.indexOf(item) === -1);
      chosen.push(pickOne(rest, rank, rng));
    }
    return chosen.map(item => item.id);
  }

  /* ---- Drawing ----
     Pixel grids become SVG rects, runs of identical colour merged into one
     rect so the markup stays small. */
  function rects(art, offsetX, offsetY, scale) {
    let out = "";
    for (let y = 0; y < art.length; y++) {
      const row = art[y];
      let x = 0;
      while (x < row.length) {
        const colour = PALETTE[row[x]];
        if (!colour) { x++; continue; }
        let run = 1;
        while (x + run < row.length && row[x + run] === row[x]) run++;
        out += '<rect x="' + ((offsetX + x) * scale) + '" y="' + ((offsetY + y) * scale) +
          '" width="' + (run * scale) + '" height="' + scale + '" fill="' + colour + '"/>';
        x += run;
      }
    }
    return out;
  }

  function artSize(art) {
    return { w: Math.max.apply(null, art.map(row => row.length)), h: art.length };
  }

  function itemSvg(id, pixels) {
    const item = BY_ID[id];
    if (!item) return "";
    const size = artSize(item.art);
    const side = Math.max(size.w, size.h);
    const scale = 1;
    return '<svg viewBox="0 0 ' + side + ' ' + side + '" width="' + pixels + '" height="' + pixels +
      '" shape-rendering="crispEdges" role="img" aria-label="' + item.fr + '">' +
      rects(item.art, (side - size.w) / 2, side - size.h, scale) +
      '</svg>';
  }

  /* ---- Laying out the farm ----
     Items are sorted by band so that buildings stand at the back and crops
     at the front, then filled into a grid, reading order. The scene grows a
     row taller every eleven items instead of piling them on top of one
     another: the plot itself gets bigger, which is the point. */
  const ZONE_ORDER = ["build", "tree", "animal", "deco", "crop"];
  const SCENE = { w: 160, cols: 11, cell: 14, row: 16, sky: 26, scale: 4 };

  function layout(owned) {
    const items = (owned || [])
      .map((id, order) => ({ item: BY_ID[id], order }))
      .filter(entry => entry.item)
      .sort((a, b) => {
        const zone = ZONE_ORDER.indexOf(a.item.zone) - ZONE_ORDER.indexOf(b.item.zone);
        return zone !== 0 ? zone : a.order - b.order;
      });

    const rows = Math.max(3, Math.ceil(items.length / SCENE.cols));
    const placed = items.map((entry, index) => {
      const col = index % SCENE.cols;
      const row = Math.floor(index / SCENE.cols);
      const size = artSize(entry.item.art);
      const baseline = SCENE.sky + (row + 1) * SCENE.row;
      return {
        item: entry.item,
        row,
        // Centred in its cell and standing on the row's baseline.
        x: 1 + col * SCENE.cell + Math.round((SCENE.cell - size.w) / 2),
        y: baseline - size.h
      };
    });
    return { placed, rows, height: SCENE.sky + rows * SCENE.row + 6 };
  }

  function sceneSvg(owned) {
    const plan = layout(owned);
    const scale = SCENE.scale;
    const width = SCENE.w * scale;
    const height = plan.height * scale;
    let body = '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#BFE3F5"/>' +
      '<rect x="0" y="' + SCENE.sky * scale + '" width="' + width +
        '" height="' + (plan.height - SCENE.sky) * scale + '" fill="#7FC24E"/>' +
      '<circle cx="' + 143 * scale + '" cy="' + 11 * scale + '" r="' + 7 * scale + '" fill="#F2C94C"/>';

    // A ploughed strip runs under any row that holds crops.
    const cropRows = new Set(plan.placed.filter(p => p.item.zone === "crop").map(p => p.row));
    cropRows.forEach(row => {
      const top = SCENE.sky + (row + 1) * SCENE.row - 4;
      body += '<rect x="0" y="' + top * scale + '" width="' + width +
        '" height="' + 6 * scale + '" fill="#8A5A34"/>';
    });

    plan.placed.forEach(spot => { body += rects(spot.item.art, spot.x, spot.y, scale); });

    return '<svg class="farm-scene" viewBox="0 0 ' + width + ' ' + height +
      '" shape-rendering="crispEdges" role="img" aria-label="La ferme">' + body + '</svg>';
  }

  return {
    RANK_COUNT, THRESHOLDS, TIERS, ITEMS, RARITIES,
    rankOf, offerFor, itemSvg, sceneSvg,
    item(id) { return BY_ID[id]; }
  };
})();
