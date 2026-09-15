/* =====================================================================
   CATALOGUE — every object the shop can sell.

   This file holds data only: no drawing, no game rules. The artwork of
   each item lives in its own file under assets/items/, so a drawing can
   be redone without touching any code.

   To add an item:
     1. drop a square-ish SVG in assets/items/ (32 px per tile of width,
        32 px per tile of height, e.g. a 2x1 item is a 64x32 viewBox),
     2. append an entry below.

   Fields:
     id       stable key, stored in the save file — never rename it.
     fr / en  the two names shown on the item card. The English one is
              what a later version will read out loud to teach the word.
     price    what it costs, and what it is sold back for.
     w / h    footprint on the grid, in tiles. The grid is fine: a hen
              takes 2 x 2 of them, a fence only 2 x 1. A drawing must
              have the proportions of its footprint — 16 px of SVG per
              tile — so a 2 x 2 object is drawn in a 32 x 32 viewBox.
     category one of CATEGORIES below.
     asset    file name inside assets/items/.
   ===================================================================== */
const CATALOG = (function () {

  const CATEGORIES = [
    { id: "ground",    label: "Terrain",   icon: "🟫" },
    { id: "furniture", label: "Meubles",   icon: "🛋️" },
    { id: "animals",   label: "Animaux",   icon: "🐔" },
    { id: "nature",    label: "Nature",    icon: "🌳" },
    { id: "garden",    label: "Jardin",    icon: "🪑" },
    { id: "buildings", label: "Bâtiments", icon: "🏚️" }
  ];

  const ITEMS = [
    // ---------- ground: laid on the soil, other things stand on it ----------
    { id: "path",  fr: "Chemin", en: "a path",  price: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "path.svg" },
    { id: "field", fr: "Champ",  en: "a field", price: 25, w: 2, h: 2, layer: "ground", category: "ground", asset: "field.svg" },
    { id: "tiles", fr: "Carrelage", en: "tiles", price: 20, w: 2, h: 2, layer: "ground", category: "ground", where: "in", asset: "tiles.svg" },
    { id: "rug",   fr: "Tapis",     en: "a rug", price: 120, w: 4, h: 4, layer: "ground", category: "ground", where: "in", asset: "rug.svg" },

    // ---------- animals ----------
    { id: "chicken", fr: "Poule",  en: "a hen",    price: 60,  w: 2, h: 2, category: "animals", asset: "chicken.svg" },
    { id: "duck",    fr: "Canard", en: "a duck",   price: 70,  w: 2, h: 2, category: "animals", asset: "duck.svg" },
    { id: "rabbit",  fr: "Lapin",  en: "a rabbit", price: 80,  w: 2, h: 2, category: "animals", asset: "rabbit.svg" },
    { id: "cat",     fr: "Chat",   en: "a cat",    price: 90,  w: 2, h: 2, category: "animals", where: "both", asset: "cat.svg" },
    { id: "dog",     fr: "Chien",  en: "a dog",    price: 110, w: 2, h: 2, category: "animals", where: "both", asset: "dog.svg" },
    { id: "sheep",   fr: "Mouton", en: "a sheep",  price: 150, w: 2, h: 2, category: "animals", asset: "sheep.svg" },
    { id: "cow",     fr: "Vache",  en: "a cow",    price: 220, w: 4, h: 2, category: "animals", asset: "cow.svg" },
    { id: "horse",   fr: "Cheval", en: "a horse",  price: 300, w: 4, h: 2, category: "animals", asset: "horse.svg" },

    // ---------- nature ----------
    { id: "flowers",    fr: "Fleurs",     en: "flowers",        price: 30,  w: 2, h: 2, category: "nature", asset: "flowers.svg" },
    { id: "wheat",      fr: "Blé",        en: "wheat",          price: 35,  w: 2, h: 2, category: "nature", asset: "wheat.svg" },
    { id: "mushroom",   fr: "Champignon", en: "a mushroom",     price: 40,  w: 2, h: 2, category: "nature", asset: "mushroom.svg" },
    { id: "pumpkin",    fr: "Citrouille", en: "a pumpkin",      price: 45,  w: 2, h: 2, category: "nature", asset: "pumpkin.svg" },
    { id: "bush",       fr: "Buisson",    en: "a bush",         price: 50,  w: 2, h: 2, category: "nature", asset: "bush.svg" },
    { id: "pine_tree",  fr: "Sapin",      en: "a pine tree",    price: 170, w: 4, h: 4, category: "nature", asset: "pine-tree.svg" },
    { id: "apple_tree", fr: "Pommier",    en: "an apple tree",  price: 190, w: 4, h: 4, category: "nature", asset: "apple-tree.svg" },
    { id: "pond",       fr: "Mare",       en: "a pond",         price: 260, w: 4, h: 4, category: "nature", asset: "pond.svg" },

    // ---------- garden ----------
    { id: "fence",        fr: "Barrière",           en: "a fence",         price: 20,  w: 2, h: 1, turns: true, category: "garden", asset: "fence.svg" },
    { id: "sign",         fr: "Panneau",            en: "a sign",          price: 40,  w: 2, h: 2, turns: true, category: "garden", asset: "sign.svg" },
    { id: "barrel",       fr: "Tonneau",            en: "a barrel",        price: 50,  w: 2, h: 2, category: "garden", asset: "barrel.svg" },
    { id: "mailbox",      fr: "Boîte aux lettres",  en: "a mailbox",       price: 60,  w: 2, h: 2, category: "garden", asset: "mailbox.svg" },
    { id: "birdhouse",    fr: "Nichoir",            en: "a birdhouse",     price: 70,  w: 2, h: 2, category: "garden", asset: "birdhouse.svg" },
    { id: "lamp",         fr: "Lampadaire",         en: "a street lamp",   price: 85,  w: 2, h: 2, category: "garden", asset: "lamp.svg" },
    { id: "scarecrow",    fr: "Épouvantail",        en: "a scarecrow",     price: 95,  w: 2, h: 2, category: "garden", asset: "scarecrow.svg" },
    { id: "campfire",     fr: "Feu de camp",        en: "a campfire",      price: 120, w: 2, h: 2, category: "garden", asset: "campfire.svg" },
    { id: "bench",        fr: "Banc",               en: "a bench",         price: 130, w: 4, h: 2, turns: true, category: "garden", asset: "bench.svg" },
    { id: "picnic_table", fr: "Table de pique-nique", en: "a picnic table", price: 210, w: 4, h: 4, category: "garden", asset: "picnic-table.svg" },
    { id: "well",         fr: "Puits",              en: "a well",          price: 240, w: 4, h: 4, category: "garden", asset: "well.svg" },

    // ---------- furniture: inside the house ----------
    { id: "chair",     fr: "Chaise",         en: "a chair",      price: 60,  w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "chair.svg" },
    { id: "plant",     fr: "Plante",         en: "a plant",      price: 70,  w: 2, h: 2, category: "furniture", where: "in", asset: "plant.svg" },
    { id: "table",     fr: "Table",          en: "a table",      price: 140, w: 4, h: 2, turns: true, category: "furniture", where: "in", asset: "table.svg" },
    { id: "bookshelf", fr: "Bibliothèque",   en: "a bookcase",   price: 150, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "bookshelf.svg" },
    { id: "wardrobe",  fr: "Armoire",        en: "a wardrobe",   price: 170, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "wardrobe.svg" },
    { id: "sink",      fr: "Évier",          en: "a sink",       price: 180, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "sink.svg" },
    { id: "stove",     fr: "Cuisinière",     en: "a cooker",     price: 200, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "stove.svg" },
    { id: "fridge",    fr: "Réfrigérateur",  en: "a fridge",     price: 220, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "fridge.svg" },
    { id: "sofa",      fr: "Canapé",         en: "a sofa",       price: 220, w: 4, h: 2, turns: true, category: "furniture", where: "in", asset: "sofa.svg" },
    { id: "tv",        fr: "Télévision",     en: "a television", price: 240, w: 2, h: 2, turns: true, category: "furniture", where: "in", asset: "tv.svg" },
    { id: "bed",       fr: "Lit",            en: "a bed",        price: 280, w: 4, h: 4, turns: true, category: "furniture", where: "in", asset: "bed.svg" },
    { id: "fireplace", fr: "Cheminée",       en: "a fireplace",  price: 320, w: 4, h: 2, turns: true, category: "furniture", where: "in", asset: "fireplace.svg" },
    { id: "inner_door", fr: "Porte",          en: "a door",       price: 90,  w: 2, h: 1, turns: true, category: "furniture", where: "in", asset: "inner-door.svg" },

    // ---------- buildings ----------
    { id: "coop",       fr: "Poulailler", en: "a chicken coop", price: 450, w: 6, h: 4, turns: true, category: "buildings", asset: "coop.svg" },
    { id: "greenhouse", fr: "Serre",      en: "a greenhouse",   price: 600, w: 6, h: 4, turns: true, category: "buildings", asset: "greenhouse.svg" }
  ];

  const BY_ID = {};
  ITEMS.forEach(item => { BY_ID[item.id] = item; });

  return {
    CATEGORIES,
    ITEMS,
    item(id) { return BY_ID[id] || null; },
    // Everything is an object unless it says otherwise.
    layerOf(item) { return item && item.layer === "ground" ? "ground" : "object"; },
    // How many tiles it takes once turned: a quarter turn swaps them.
    footprint(item, turn) {
      if (!item) return { w: 2, h: 2 };
      return (turn || 0) % 2 ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
    },
    // Is this sold in the scene the child is standing in?
    fitsScene(item, indoor) {
      if (!item) return false;
      if (item.where === "both") return true;
      return item.where === "in" ? !!indoor : !indoor;
    },
    assetUrl(id) {
      const item = BY_ID[id];
      return item ? "assets/items/" + item.asset : "";
    }
  };
})();
