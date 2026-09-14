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
     w / h    footprint on the grid, in tiles.
     category one of CATEGORIES below.
     asset    file name inside assets/items/.
   ===================================================================== */
const CATALOG = (function () {

  const CATEGORIES = [
    { id: "animals",   label: "Animaux",   icon: "🐔" },
    { id: "nature",    label: "Nature",    icon: "🌳" },
    { id: "garden",    label: "Jardin",    icon: "🪑" },
    { id: "buildings", label: "Bâtiments", icon: "🏚️" }
  ];

  const ITEMS = [
    // ---------- animals ----------
    { id: "chicken", fr: "Poule",  en: "a hen",    price: 60,  w: 1, h: 1, category: "animals", asset: "chicken.svg" },
    { id: "duck",    fr: "Canard", en: "a duck",   price: 70,  w: 1, h: 1, category: "animals", asset: "duck.svg" },
    { id: "rabbit",  fr: "Lapin",  en: "a rabbit", price: 80,  w: 1, h: 1, category: "animals", asset: "rabbit.svg" },
    { id: "cat",     fr: "Chat",   en: "a cat",    price: 90,  w: 1, h: 1, category: "animals", asset: "cat.svg" },
    { id: "dog",     fr: "Chien",  en: "a dog",    price: 110, w: 1, h: 1, category: "animals", asset: "dog.svg" },
    { id: "sheep",   fr: "Mouton", en: "a sheep",  price: 150, w: 1, h: 1, category: "animals", asset: "sheep.svg" },
    { id: "cow",     fr: "Vache",  en: "a cow",    price: 220, w: 2, h: 1, category: "animals", asset: "cow.svg" },
    { id: "horse",   fr: "Cheval", en: "a horse",  price: 300, w: 2, h: 1, category: "animals", asset: "horse.svg" },

    // ---------- nature ----------
    { id: "flowers",    fr: "Fleurs",     en: "flowers",        price: 30,  w: 1, h: 1, category: "nature", asset: "flowers.svg" },
    { id: "wheat",      fr: "Blé",        en: "wheat",          price: 35,  w: 1, h: 1, category: "nature", asset: "wheat.svg" },
    { id: "mushroom",   fr: "Champignon", en: "a mushroom",     price: 40,  w: 1, h: 1, category: "nature", asset: "mushroom.svg" },
    { id: "pumpkin",    fr: "Citrouille", en: "a pumpkin",      price: 45,  w: 1, h: 1, category: "nature", asset: "pumpkin.svg" },
    { id: "bush",       fr: "Buisson",    en: "a bush",         price: 50,  w: 1, h: 1, category: "nature", asset: "bush.svg" },
    { id: "pine_tree",  fr: "Sapin",      en: "a pine tree",    price: 170, w: 2, h: 2, category: "nature", asset: "pine-tree.svg" },
    { id: "apple_tree", fr: "Pommier",    en: "an apple tree",  price: 190, w: 2, h: 2, category: "nature", asset: "apple-tree.svg" },
    { id: "pond",       fr: "Mare",       en: "a pond",         price: 260, w: 2, h: 2, category: "nature", asset: "pond.svg" },

    // ---------- garden ----------
    { id: "path",         fr: "Chemin",             en: "a path",          price: 15,  w: 1, h: 1, category: "garden", asset: "path.svg" },
    { id: "fence",        fr: "Barrière",           en: "a fence",         price: 20,  w: 1, h: 1, category: "garden", asset: "fence.svg" },
    { id: "sign",         fr: "Panneau",            en: "a sign",          price: 40,  w: 1, h: 1, category: "garden", asset: "sign.svg" },
    { id: "barrel",       fr: "Tonneau",            en: "a barrel",        price: 50,  w: 1, h: 1, category: "garden", asset: "barrel.svg" },
    { id: "mailbox",      fr: "Boîte aux lettres",  en: "a mailbox",       price: 60,  w: 1, h: 1, category: "garden", asset: "mailbox.svg" },
    { id: "birdhouse",    fr: "Nichoir",            en: "a birdhouse",     price: 70,  w: 1, h: 1, category: "garden", asset: "birdhouse.svg" },
    { id: "lamp",         fr: "Lampadaire",         en: "a street lamp",   price: 85,  w: 1, h: 1, category: "garden", asset: "lamp.svg" },
    { id: "scarecrow",    fr: "Épouvantail",        en: "a scarecrow",     price: 95,  w: 1, h: 1, category: "garden", asset: "scarecrow.svg" },
    { id: "campfire",     fr: "Feu de camp",        en: "a campfire",      price: 120, w: 1, h: 1, category: "garden", asset: "campfire.svg" },
    { id: "bench",        fr: "Banc",               en: "a bench",         price: 130, w: 2, h: 1, category: "garden", asset: "bench.svg" },
    { id: "picnic_table", fr: "Table de pique-nique", en: "a picnic table", price: 210, w: 2, h: 2, category: "garden", asset: "picnic-table.svg" },
    { id: "well",         fr: "Puits",              en: "a well",          price: 240, w: 2, h: 2, category: "garden", asset: "well.svg" },

    // ---------- buildings ----------
    { id: "coop",       fr: "Poulailler", en: "a chicken coop", price: 450, w: 3, h: 2, category: "buildings", asset: "coop.svg" },
    { id: "greenhouse", fr: "Serre",      en: "a greenhouse",   price: 600, w: 3, h: 2, category: "buildings", asset: "greenhouse.svg" }
  ];

  const BY_ID = {};
  ITEMS.forEach(item => { BY_ID[item.id] = item; });

  return {
    CATEGORIES,
    ITEMS,
    item(id) { return BY_ID[id] || null; },
    assetUrl(id) {
      const item = BY_ID[id];
      return item ? "assets/items/" + item.asset : "";
    }
  };
})();
