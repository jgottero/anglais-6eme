/* =====================================================================
   CATALOGUE — every object the shop can sell, and the level it turns up
   at.

   This file holds data only: no drawing, no game rules. The artwork of
   each item lives in its own file under assets/items/, so a drawing can
   be redone without touching any code.

   The list is ordered by level, because that is the story it tells: the
   child starts with a garden's worth of things, and then **every level
   brings two or three more** — a hundred levels, not one of them empty.

   The world still opens five levels at a time: each batch of five shares
   a theme (the vegetable patch, the town, the seaside) and is served
   cheapest first, so that inside a theme every level brings something
   dearer than the last, and the fifth brings three. Level 100 is the
   last of them.

   Fields:
     id       stable key, stored in the save file — never rename it.
     fr / en  the two names shown on the item card. The English one is
              what a later version will read out loud to teach the word.
     price    what it costs, and what it is sold back for.
     level    the level that puts it in the shop; 0 is there from the
              first day. Everything else is a multiple of five.
     w / h    the drawing, in tiles. The grid is fine: a hen is drawn
              on 2 x 2 of them, a fence post on only 1 x 1. A drawing
              must have the proportions of its box — 16 px of SVG per
              tile — so a 2 x 2 object is drawn in a 32 x 32 viewBox.
     foot     optional: how wide, in tiles, the ground it really takes
              is, when that is less than the drawing. A pine tree is
              drawn on 3 x 4 tiles but only its trunk holds the ground,
              so `foot: 3` gives it the three tiles along the bottom of
              its drawing and lets another tree stand right behind it.
              The strip is one tile deep, centred on the drawing and
              flush with the foot of it, so its width has to be odd or
              even along with the drawing's. Left out, the object takes
              exactly what it is drawn on — which is right for anything
              drawn from above, a bed or a pond.
     category one of CATEGORIES below.
     asset    file name inside assets/items/.
     layer    "ground" for what is laid on the soil; everything else
              stands on top of it.
     where    "in" for indoors only, "both" for either; outdoors by
              default.
     turns    true for what can be given a quarter turn. The mirror
              works on everything and is never declared.
     card     optional: the drawing shown on the shop card and in the
              hand, when the object on the ground is only a piece of
              itself. A fence post sells as a length of fence.
     joins    optional: this object joins up with its own kind. `group`
              says with what (its own kind, not another), and the rest
              says what to draw. Two ways of joining:
                between  `across` is the piece drawn between two
                         neighbours side by side, `down` the one drawn
                         between one above and one below (the fence).
                around   `edge` is the piece drawn along a side with no
                         neighbour, `corner` the outside corner where
                         two such sides meet, `inner` the notch where
                         the shape turns back on itself (the pool).
              The pieces are in assets/items/ too, one tile each, drawn
              for the top edge and the top-left corner: the others are
              the same drawing turned a quarter at a time.

   What colours an object comes in is not a field of its own: it is a
   line in PAINT, further down, keyed by id.
   ===================================================================== */
const CATALOG = (function () {

  const CATEGORIES = [
    { id: "ground",    label: "Terrain",   icon: "🟫" },
    { id: "nature",    label: "Nature",    icon: "🌳" },
    { id: "garden",    label: "Jardin",    icon: "🪑" },
    { id: "animals",   label: "Animaux",   icon: "🐔" },
    { id: "farm",      label: "Ferme",     icon: "🚜" },
    { id: "city",      label: "Ville",     icon: "🏙️" },
    { id: "beach",     label: "Plage",     icon: "🏖️" },
    { id: "play",      label: "Jeux",      icon: "⚽" },
    { id: "furniture", label: "Meubles",   icon: "🛋️" },
    { id: "buildings", label: "Bâtiments", icon: "🏚️" }
  ];

  const ITEMS = [
    /* ---------- level 0: a garden to start with ---------- */
    { id: "path",       fr: "Chemin",            en: "a path",      price: 5,   level: 0, w: 2, h: 2, layer: "ground", category: "ground", asset: "path.svg" },
    { id: "tiles",      fr: "Carrelage",         en: "tiles",       price: 10,  level: 0, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "tiles.svg" },
    { id: "field",      fr: "Champ",             en: "a field",     price: 10,  level: 0, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "field.svg" },
    { id: "rug",        fr: "Tapis",             en: "a rug",       price: 60,  level: 0, w: 4, h: 4, layer: "ground", where: "in", category: "ground", asset: "rug.svg" },
    { id: "tile_small", fr: "Carreau",           en: "a tile",      price: 5,   level: 0, w: 1, h: 1, layer: "ground", where: "in", category: "ground", asset: "tile-small.svg" },

    { id: "flowers",    fr: "Fleurs",            en: "flowers",     price: 15,  level: 0, w: 1, h: 1, category: "nature", asset: "flowers.svg" },
    { id: "wheat",      fr: "Blé",               en: "wheat",       price: 15,  level: 0, w: 1, h: 1, category: "nature", asset: "wheat.svg" },
    { id: "mushroom",   fr: "Champignon",        en: "a mushroom",  price: 20,  level: 0, w: 1, h: 1, category: "nature", asset: "mushroom.svg" },
    { id: "pumpkin",    fr: "Citrouille",        en: "a pumpkin",   price: 20,  level: 0, w: 1, h: 1, category: "nature", asset: "pumpkin.svg" },
    { id: "bush",       fr: "Buisson",           en: "a bush",      price: 25,  level: 0, w: 3, h: 3, foot: 3, category: "nature", asset: "bush.svg" },

    { id: "fence",      fr: "Barrière",          en: "a fence",     price: 5,   level: 0, w: 1, h: 1, category: "garden", asset: "fence.svg", card: "fence-run.svg",
      joins: { group: "fence", across: "fence-rail.svg", down: "fence-beam.svg" } },
    { id: "bucket",     fr: "Seau",              en: "a bucket",    price: 10,  level: 0, w: 1, h: 1, category: "garden", asset: "bucket.svg" },
    { id: "sign",       fr: "Panneau",           en: "a sign",      price: 20,  level: 0, w: 1, h: 1, turns: true, category: "garden", asset: "sign.svg" },
    { id: "barrel",     fr: "Tonneau",           en: "a barrel",    price: 25,  level: 0, w: 1, h: 1, category: "garden", asset: "barrel.svg" },
    { id: "mailbox",    fr: "Boîte aux lettres", en: "a mailbox",   price: 30,  level: 0, w: 1, h: 1, category: "garden", asset: "mailbox.svg" },
    { id: "birdhouse",  fr: "Nichoir",           en: "a birdhouse", price: 35,  level: 0, w: 1, h: 1, category: "garden", asset: "birdhouse.svg" },

    { id: "chicken",    fr: "Poule",             en: "a hen",       price: 30,  level: 0, w: 2, h: 2, foot: 2, category: "animals", asset: "chicken.svg" },
    { id: "duck",       fr: "Canard",            en: "a duck",      price: 35,  level: 0, w: 2, h: 2, foot: 2, wet: true, category: "animals", asset: "duck.svg" },
    { id: "rabbit",     fr: "Lapin",             en: "a rabbit",    price: 40,  level: 0, w: 2, h: 2, foot: 2, category: "animals", asset: "rabbit.svg" },
    { id: "cat",        fr: "Chat",              en: "a cat",       price: 45,  level: 0, w: 2, h: 2, foot: 2, where: "both", category: "animals", asset: "cat.svg" },

    { id: "chair",      fr: "Chaise",            en: "a chair",     price: 30,  level: 0, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "chair.svg" },
    { id: "plant",      fr: "Plante",            en: "a plant",     price: 35,  level: 0, w: 1, h: 1, where: "in", category: "furniture", asset: "plant.svg" },
    { id: "inner_door", fr: "Porte",             en: "a door",      price: 45,  level: 0, w: 2, h: 1, turns: true, where: "in", category: "furniture", asset: "inner-door.svg" },
    { id: "table",      fr: "Table",             en: "a table",     price: 70,  level: 0, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "table.svg" },
    { id: "bookshelf",  fr: "Bibliothèque",      en: "a bookcase",  price: 75,  level: 0, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "bookshelf.svg" },
    { id: "wardrobe",   fr: "Armoire",           en: "a wardrobe",  price: 85,  level: 0, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "wardrobe.svg" },
    { id: "bed",        fr: "Lit",               en: "a bed",       price: 140, level: 0, w: 4, h: 4, turns: true, where: "in", category: "furniture", asset: "bed.svg" },

    /* ---------- levels 1 to 5: the vegetable patch ---------- */
    { id: "soil",         fr: "Terre",       en: "soil",              price: 5,  level: 1, w: 1, h: 1, layer: "ground", turns: true, category: "ground", asset: "soil.svg" },
    { id: "carrot",       fr: "Carottes",    en: "carrots",           price: 10, level: 1, w: 1, h: 1, category: "nature", asset: "carrot.svg" },

    { id: "veg_patch",    fr: "Potager",     en: "a vegetable patch", price: 15, level: 2, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "veg-patch.svg" },
    { id: "cabbage",      fr: "Chou",        en: "a cabbage",         price: 15, level: 2, w: 1, h: 1, category: "nature", asset: "cabbage.svg" },

    { id: "watering_can", fr: "Arrosoir",    en: "a watering can",    price: 15, level: 3, w: 1, h: 1, category: "garden", asset: "watering-can.svg" },
    { id: "strawberry",   fr: "Fraises",     en: "strawberries",      price: 15, level: 3, w: 1, h: 1, category: "nature", asset: "strawberry.svg" },

    { id: "tomato",       fr: "Tomates",     en: "tomatoes",          price: 20, level: 4, w: 1, h: 1, category: "nature", asset: "tomato.svg" },
    { id: "sunflower",    fr: "Tournesol",   en: "a sunflower",       price: 20, level: 4, w: 2, h: 2, foot: 2, category: "nature", asset: "sunflower.svg" },

    { id: "stool",        fr: "Tabouret",    en: "a stool",           price: 25, level: 5, w: 2, h: 2, foot: 2, where: "in", category: "furniture", asset: "stool.svg" },
    { id: "wheelbarrow",  fr: "Brouette",    en: "a wheelbarrow",     price: 30, level: 5, w: 3, h: 2, foot: 3, turns: true, category: "garden", asset: "wheelbarrow.svg" },
    { id: "scarecrow",    fr: "Épouvantail", en: "a scarecrow",       price: 45, level: 5, w: 2, h: 2, foot: 2, category: "garden", asset: "scarecrow.svg" },

    /* ---------- levels 6 to 10: the orchard ---------- */
    { id: "wood_chips",  fr: "Copeaux de bois", en: "wood chips",    price: 10,  level: 6,  w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "wood-chips.svg" },
    { id: "stump",       fr: "Souche",          en: "a tree stump",  price: 20,  level: 6,  w: 1, h: 1, category: "nature", asset: "stump.svg" },

    { id: "fruit_crate", fr: "Cagette",         en: "a fruit crate", price: 20,  level: 7,  w: 1, h: 1, category: "garden", asset: "fruit-crate.svg" },
    { id: "ladder",      fr: "Échelle",         en: "a ladder",      price: 25,  level: 7,  w: 1, h: 2, foot: 1, turns: true, category: "garden", asset: "ladder.svg" },

    { id: "log_pile",    fr: "Tas de bûches",   en: "a log pile",    price: 30,  level: 8,  w: 4, h: 2, foot: 4, turns: true, category: "nature", asset: "log-pile.svg" },
    { id: "hedge",       fr: "Haie",            en: "a hedge",       price: 40,  level: 8,  w: 1, h: 1, category: "nature", asset: "hedge.svg", card: "hedge-run.svg",
      joins: { group: "hedge", edge: "hedge-edge.svg", corner: "hedge-corner.svg", inner: "hedge-inner.svg" } },

    { id: "shelf",       fr: "Étagère",         en: "a shelf",       price: 55,  level: 9,  w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "shelf.svg" },
    { id: "beehive",     fr: "Ruche",           en: "a beehive",     price: 60,  level: 9,  w: 2, h: 2, foot: 2, category: "garden", asset: "beehive.svg" },

    { id: "pine_tree",   fr: "Sapin",           en: "a pine tree",   price: 85,  level: 10, w: 3, h: 4, foot: 3, category: "nature", asset: "pine-tree.svg" },
    { id: "apple_tree",  fr: "Pommier",         en: "an apple tree", price: 95,  level: 10, w: 3, h: 4, foot: 3, category: "nature", asset: "apple-tree.svg" },
    { id: "cherry_tree", fr: "Cerisier",        en: "a cherry tree", price: 100, level: 10, w: 3, h: 4, foot: 3, category: "nature", asset: "cherry-tree.svg" },

    /* ---------- levels 11 to 15: paths and paving ---------- */
    { id: "gravel",      fr: "Gravier",      en: "gravel",          price: 5,   level: 11, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "gravel.svg" },
    { id: "stepping",    fr: "Pas japonais", en: "stepping stones", price: 10,  level: 11, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "stepping.svg" },

    { id: "flagstone",   fr: "Dalle",        en: "a flagstone",     price: 10,  level: 12, w: 1, h: 1, layer: "ground", where: "both", category: "ground", asset: "flagstone.svg" },
    { id: "low_wall",    fr: "Muret",        en: "a low wall",      price: 10,  level: 12, w: 1, h: 1, category: "garden", asset: "wall-post.svg", card: "wall-run.svg",
      joins: { group: "low_wall", across: "wall-rail.svg", down: "wall-beam.svg" } },

    { id: "paving",      fr: "Pavés",        en: "paving stones",   price: 10,  level: 13, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "paving-stones.svg" },
    { id: "brick_path",  fr: "Briques",      en: "a brick path",    price: 10,  level: 13, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "brick-path.svg" },

    { id: "decking",     fr: "Terrasse",     en: "decking",         price: 10,  level: 14, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "decking.svg" },
    { id: "flowerbed",   fr: "Parterre",     en: "a flower bed",    price: 15,  level: 14, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "flowerbed.svg" },

    { id: "wood_floor",  fr: "Parquet",      en: "a wooden floor",  price: 15,  level: 15, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "wood-floor.svg" },
    { id: "planter",     fr: "Jardinière",   en: "a planter",       price: 35,  level: 15, w: 4, h: 2, foot: 4, turns: true, category: "garden", asset: "planter.svg" },
    { id: "garden_arch", fr: "Arche",        en: "a garden arch",   price: 70,  level: 15, w: 3, h: 2, foot: 3, turns: true, category: "garden", asset: "garden-arch.svg" },

    /* ---------- levels 16 to 20: the farmyard ---------- */
    { id: "straw",      fr: "Paille",        en: "straw",          price: 10,  level: 16, w: 2, h: 2, layer: "ground", turns: true, where: "both", category: "ground", asset: "straw.svg" },
    { id: "feed_sack",  fr: "Sac de grain",  en: "a sack of feed", price: 20,  level: 16, w: 1, h: 1, category: "farm", asset: "feed-sack.svg" },

    { id: "trough",     fr: "Abreuvoir",     en: "a trough",       price: 35,  level: 17, w: 4, h: 2, turns: true, category: "farm", asset: "trough.svg" },
    { id: "hay_bale",   fr: "Botte de foin", en: "a hay bale",     price: 40,  level: 17, w: 2, h: 2, foot: 2, category: "farm", asset: "hay-bale.svg" },

    { id: "pet_basket", fr: "Panier",        en: "a pet basket",   price: 45,  level: 18, w: 2, h: 2, foot: 2, where: "both", category: "furniture", asset: "pet-basket.svg" },
    { id: "dog",        fr: "Chien",         en: "a dog",          price: 55,  level: 18, w: 2, h: 2, foot: 2, where: "both", category: "animals", asset: "dog.svg" },

    { id: "goose",      fr: "Oie",           en: "a goose",        price: 65,  level: 19, w: 2, h: 2, foot: 2, category: "animals", asset: "goose.svg" },
    { id: "sheep",      fr: "Mouton",        en: "a sheep",        price: 75,  level: 19, w: 2, h: 2, foot: 2, category: "animals", asset: "sheep.svg" },

    { id: "goat",       fr: "Chèvre",        en: "a goat",         price: 80,  level: 20, w: 2, h: 2, foot: 2, category: "animals", asset: "goat.svg" },
    { id: "pig",        fr: "Cochon",        en: "a pig",          price: 90,  level: 20, w: 4, h: 2, foot: 4, category: "animals", asset: "pig.svg" },
    { id: "coop",       fr: "Poulailler",    en: "a chicken coop", price: 225, level: 20, w: 6, h: 4, foot: 6, turns: true, category: "farm", asset: "coop.svg" },

    /* ---------- levels 21 to 25: the house is fitted out ---------- */
    { id: "carpet",          fr: "Moquette",        en: "a carpet",          price: 15,  level: 21, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "carpet.svg" },
    { id: "table_lamp",      fr: "Lampe",           en: "a lamp",            price: 40,  level: 21, w: 1, h: 1, where: "in", category: "furniture", asset: "table-lamp.svg" },

    { id: "mirror",          fr: "Miroir",          en: "a mirror",          price: 45,  level: 22, w: 1, h: 1, turns: true, where: "in", category: "furniture", asset: "mirror.svg" },
    { id: "painting",        fr: "Tableau",         en: "a painting",        price: 50,  level: 22, w: 1, h: 1, turns: true, where: "in", category: "furniture", asset: "painting.svg" },

    { id: "cupboard",        fr: "Placard",         en: "a cupboard",        price: 75,  level: 23, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "cupboard.svg" },
    { id: "kitchen_counter", fr: "Plan de travail", en: "a kitchen counter", price: 80,  level: 23, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "kitchen-counter.svg" },

    { id: "sink",            fr: "Évier",           en: "a sink",            price: 90,  level: 24, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "sink.svg" },
    { id: "stove",           fr: "Cuisinière",      en: "a cooker",          price: 100, level: 24, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "stove.svg" },

    { id: "fridge",          fr: "Réfrigérateur",   en: "a fridge",          price: 110, level: 25, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "fridge.svg" },
    { id: "sofa",            fr: "Canapé",          en: "a sofa",            price: 110, level: 25, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "sofa.svg" },
    { id: "tv",              fr: "Télévision",      en: "a television",      price: 120, level: 25, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "tv.svg" },

    /* ---------- levels 26 to 30: a garden to sit in ---------- */
    { id: "lawn",         fr: "Gazon tondu",          en: "a lawn",         price: 10,  level: 26, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "lawn.svg" },
    { id: "gnome",        fr: "Nain de jardin",       en: "a garden gnome", price: 30,  level: 26, w: 1, h: 1, category: "garden", asset: "gnome.svg" },

    { id: "lamp",         fr: "Lampadaire",           en: "a street lamp",  price: 40,  level: 27, w: 1, h: 2, foot: 1, category: "garden", asset: "lamp.svg" },
    { id: "bird_bath",    fr: "Vasque à oiseaux",     en: "a bird bath",    price: 55,  level: 27, w: 2, h: 2, foot: 2, category: "garden", asset: "bird-bath.svg" },

    { id: "campfire",     fr: "Feu de camp",          en: "a campfire",     price: 60,  level: 28, w: 2, h: 2, foot: 2, category: "garden", asset: "campfire.svg" },
    { id: "bench",        fr: "Banc",                 en: "a bench",        price: 65,  level: 28, w: 4, h: 2, foot: 4, turns: true, category: "garden", asset: "bench.svg" },

    { id: "topiary",      fr: "Buis taillé",          en: "a topiary",      price: 70,  level: 29, w: 2, h: 3, foot: 2, category: "garden", asset: "topiary.svg" },
    { id: "hammock",      fr: "Hamac",                en: "a hammock",      price: 75,  level: 29, w: 4, h: 2, foot: 4, turns: true, category: "garden", asset: "hammock.svg" },

    { id: "bbq",          fr: "Barbecue",             en: "a barbecue",     price: 85,  level: 30, w: 3, h: 2, foot: 3, turns: true, category: "garden", asset: "bbq.svg" },
    { id: "picnic_table", fr: "Table de pique-nique", en: "a picnic table", price: 105, level: 30, w: 4, h: 4, category: "garden", asset: "picnic-table.svg" },
    { id: "pergola",      fr: "Pergola",              en: "a pergola",      price: 130, level: 30, w: 4, h: 4, foot: 4, category: "garden", asset: "pergola.svg" },

    /* ---------- levels 31 to 35: the working farm ---------- */
    { id: "concrete",   fr: "Béton",         en: "concrete",     price: 10,  level: 31, w: 2, h: 2, layer: "ground", where: "both", category: "ground", asset: "concrete.svg" },
    { id: "corn",       fr: "Maïs",          en: "maize",        price: 20,  level: 31, w: 1, h: 1, category: "nature", asset: "corn.svg" },

    { id: "tyre",       fr: "Vieux pneu",    en: "an old tyre",  price: 25,  level: 32, w: 1, h: 1, category: "farm", asset: "tyre.svg" },
    { id: "milk_churn", fr: "Bidon de lait", en: "a milk churn", price: 35,  level: 32, w: 1, h: 1, category: "farm", asset: "milk-churn.svg" },

    { id: "plough",     fr: "Charrue",       en: "a plough",     price: 90,  level: 33, w: 4, h: 2, foot: 4, turns: true, category: "farm", asset: "plough.svg" },
    { id: "trailer",    fr: "Remorque",      en: "a trailer",    price: 110, level: 33, w: 4, h: 2, foot: 4, turns: true, category: "farm", asset: "trailer.svg" },
    { id: "cow",        fr: "Vache",         en: "a cow",        price: 110, level: 33, w: 4, h: 2, foot: 4, category: "animals", asset: "cow.svg" },

    { id: "well",       fr: "Puits",         en: "a well",       price: 120, level: 34, w: 4, h: 4, foot: 4, category: "garden", asset: "well.svg" },
    { id: "horse",      fr: "Cheval",        en: "a horse",      price: 150, level: 34, w: 6, h: 3, foot: 4, category: "animals", asset: "horse.svg" },
    { id: "silo",       fr: "Silo",          en: "a silo",       price: 190, level: 34, w: 4, h: 4, foot: 4, category: "farm", asset: "silo.svg" },

    { id: "tractor",    fr: "Tracteur",      en: "a tractor",    price: 200, level: 35, w: 5, h: 3, foot: 5, turns: true, category: "farm", asset: "tractor.svg" },
    { id: "barn",       fr: "Grange",        en: "a barn",       price: 260, level: 35, w: 6, h: 4, foot: 6, turns: true, category: "farm", asset: "barn.svg" },
    { id: "windmill",   fr: "Moulin",        en: "a windmill",   price: 300, level: 35, w: 6, h: 9, foot: 6, category: "farm", asset: "windmill.svg" },

    /* ---------- levels 36 to 40: the town ---------- */
    { id: "pavement",      fr: "Trottoir",          en: "a pavement",        price: 10,  level: 36, w: 2, h: 2, layer: "ground", category: "ground", asset: "pavement.svg" },
    { id: "cobbles",       fr: "Pavés ronds",       en: "cobblestones",      price: 10,  level: 36, w: 1, h: 1, layer: "ground", turns: true, category: "ground", asset: "cobbles.svg" },

    { id: "road",          fr: "Route",             en: "a road",            price: 15,  level: 37, w: 1, h: 1, layer: "ground", category: "ground", asset: "road.svg" },
    { id: "road_line",     fr: "Route à bandes",    en: "a road with lines", price: 15,  level: 37, w: 1, h: 1, layer: "ground", category: "ground", asset: "road-line.svg", card: "road-line-card.svg",
      joins: { group: "road_line", across: "road-dash.svg", down: "road-dash-down.svg" } },

    { id: "crossing",      fr: "Passage piéton",    en: "a zebra crossing",  price: 15,  level: 38, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "crossing.svg" },
    { id: "bollard",       fr: "Borne",             en: "a bollard",         price: 20,  level: 38, w: 1, h: 1, category: "city", asset: "bollard.svg" },

    { id: "bin",           fr: "Poubelle",          en: "a litter bin",      price: 30,  level: 39, w: 1, h: 1, category: "city", asset: "bin.svg" },
    { id: "hydrant",       fr: "Bouche d'incendie", en: "a fire hydrant",    price: 35,  level: 39, w: 1, h: 1, category: "city", asset: "hydrant.svg" },

    { id: "street_sign",   fr: "Panneau de rue",    en: "a street sign",     price: 40,  level: 40, w: 2, h: 2, foot: 2, turns: true, category: "city", asset: "street-sign.svg" },
    { id: "traffic_light", fr: "Feu tricolore",     en: "traffic lights",    price: 50,  level: 40, w: 1, h: 2, foot: 1, turns: true, category: "city", asset: "traffic-light.svg" },
    { id: "bus_stop",      fr: "Arrêt de bus",      en: "a bus stop",        price: 90,  level: 40, w: 4, h: 2, foot: 4, turns: true, category: "city", asset: "bus-stop.svg" },

    /* ---------- levels 41 to 45: the playground ---------- */
    { id: "play_mat",       fr: "Sol souple",       en: "a play mat",       price: 15,  level: 41, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "play-mat.svg" },
    { id: "ball",           fr: "Ballon",           en: "a ball",           price: 15,  level: 41, w: 1, h: 1, category: "play", asset: "ball.svg" },

    { id: "hopscotch",      fr: "Marelle",          en: "hopscotch",        price: 20,  level: 42, w: 2, h: 4, layer: "ground", turns: true, category: "ground", asset: "hopscotch.svg" },
    { id: "kite",           fr: "Cerf-volant",      en: "a kite",           price: 30,  level: 42, w: 1, h: 1, category: "play", asset: "kite.svg" },

    { id: "rocking_horse",  fr: "Cheval à bascule", en: "a rocking horse",  price: 60,  level: 43, w: 2, h: 2, foot: 2, turns: true, category: "play", asset: "rocking-horse.svg" },
    { id: "sandpit",        fr: "Bac à sable",      en: "a sandpit",        price: 75,  level: 43, w: 4, h: 4, category: "play", asset: "sandpit.svg" },

    { id: "seesaw",         fr: "Bascule",          en: "a seesaw",         price: 100, level: 44, w: 4, h: 2, foot: 4, turns: true, category: "play", asset: "seesaw.svg" },
    { id: "swing",          fr: "Balançoire",       en: "a swing",          price: 125, level: 44, w: 4, h: 4, foot: 4, turns: true, category: "play", asset: "swing.svg" },

    { id: "slide",          fr: "Toboggan",         en: "a slide",          price: 150, level: 45, w: 4, h: 4, foot: 4, turns: true, category: "play", asset: "slide.svg" },
    { id: "trampoline",     fr: "Trampoline",       en: "a trampoline",     price: 175, level: 45, w: 4, h: 4, category: "play", asset: "trampoline.svg" },
    { id: "climbing_frame", fr: "Cage à poules",    en: "a climbing frame", price: 200, level: 45, w: 5, h: 4, foot: 5, turns: true, category: "play", asset: "climbing-frame.svg" },

    /* ---------- levels 46 to 50: the seaside ---------- */
    { id: "sand",        fr: "Sable",            en: "sand",          price: 10,  level: 46, w: 2, h: 2, layer: "ground", category: "ground", asset: "sand.svg" },
    { id: "pebbles",     fr: "Galets",           en: "pebbles",       price: 10,  level: 46, w: 1, h: 1, layer: "ground", turns: true, category: "ground", asset: "pebbles.svg" },

    { id: "beach_towel", fr: "Serviette",        en: "a beach towel", price: 20,  level: 47, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "beach-towel.svg" },
    { id: "sandcastle",  fr: "Château de sable", en: "a sandcastle",  price: 35,  level: 47, w: 1, h: 1, category: "beach", asset: "sandcastle.svg" },

    { id: "lifebuoy",    fr: "Bouée",            en: "a lifebuoy",    price: 40,  level: 48, w: 1, h: 1, wet: true, category: "beach", asset: "lifebuoy.svg" },
    { id: "deckchair",   fr: "Transat",          en: "a deckchair",   price: 55,  level: 48, w: 2, h: 2, foot: 2, turns: true, category: "beach", asset: "deckchair.svg" },

    { id: "parasol",     fr: "Parasol",          en: "a parasol",     price: 60,  level: 49, w: 4, h: 4, foot: 2, category: "beach", asset: "parasol.svg" },
    { id: "surfboard",   fr: "Planche de surf",  en: "a surfboard",   price: 70,  level: 49, w: 1, h: 2, foot: 1, wet: true, turns: true, category: "beach", asset: "surfboard.svg" },

    { id: "palm_tree",   fr: "Palmier",          en: "a palm tree",   price: 130, level: 50, w: 6, h: 6, foot: 4, category: "beach", asset: "palm-tree.svg" },
    { id: "beach_hut",   fr: "Cabine de plage",  en: "a beach hut",   price: 150, level: 50, w: 4, h: 4, foot: 4, category: "beach", asset: "beach-hut.svg" },
    { id: "rowing_boat", fr: "Barque",           en: "a rowing boat", price: 160, level: 50, w: 6, h: 2, wet: true, turns: true, category: "beach", asset: "rowing-boat.svg" },

    /* ---------- levels 51 to 55: water ---------- */
    { id: "pool",         fr: "Piscine",            en: "a swimming pool", price: 10,  level: 51, w: 1, h: 1, layer: "ground", category: "ground", asset: "pool.svg", card: "pool-card.svg",
      joins: { group: "pool", edge: "pool-edge.svg", corner: "pool-corner.svg", inner: "pool-inner.svg" } },
    { id: "duckboard",    fr: "Caillebotis",        en: "a duckboard",     price: 15,  level: 51, w: 2, h: 2, layer: "ground", turns: true, where: "both", category: "ground", asset: "duckboard.svg" },

    { id: "jetty",        fr: "Ponton",             en: "a jetty",         price: 15,  level: 52, w: 2, h: 2, wet: true, layer: "ground", turns: true, category: "ground", asset: "jetty.svg" },
    { id: "waterlily",    fr: "Nénuphar",           en: "a water lily",    price: 25,  level: 52, w: 1, h: 1, wet: true, category: "nature", asset: "waterlily.svg" },

    { id: "pool_ladder",  fr: "Échelle de piscine", en: "a pool ladder",   price: 45,  level: 53, w: 2, h: 2, foot: 2, turns: true, category: "garden", asset: "pool-ladder.svg" },
    { id: "diving_board", fr: "Plongeoir",          en: "a diving board",  price: 90,  level: 53, w: 4, h: 2, foot: 2, wet: true, turns: true, category: "garden", asset: "diving-board.svg" },

    { id: "swan",         fr: "Cygne",              en: "a swan",          price: 100, level: 54, w: 2, h: 2, foot: 2, wet: true, category: "animals", asset: "swan.svg" },
    { id: "pond",         fr: "Mare",               en: "a pond",          price: 130, level: 54, w: 4, h: 4, category: "nature", asset: "pond.svg" },

    { id: "fountain",     fr: "Fontaine",           en: "a fountain",      price: 200, level: 55, w: 4, h: 4, category: "garden", asset: "fountain.svg" },
    { id: "jacuzzi",      fr: "Jacuzzi",            en: "a hot tub",       price: 225, level: 55, w: 4, h: 4, category: "garden", asset: "jacuzzi.svg" },
    { id: "water_slide",  fr: "Toboggan aquatique", en: "a water slide",   price: 250, level: 55, w: 4, h: 6, foot: 4, wet: true, turns: true, category: "garden", asset: "water-slide.svg" },

    /* ---------- levels 56 to 60: sport ---------- */
    { id: "running_track", fr: "Piste",            en: "a running track",      price: 15,  level: 56, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "running-track.svg" },
    { id: "court_floor",   fr: "Parquet de sport", en: "a sports floor",       price: 15,  level: 56, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "court-floor.svg" },

    { id: "weights",       fr: "Haltères",         en: "weights",              price: 60,  level: 57, w: 1, h: 1, where: "both", category: "play", asset: "weights.svg" },
    { id: "scooter",       fr: "Trottinette",      en: "a scooter",            price: 70,  level: 57, w: 2, h: 2, foot: 2, turns: true, category: "play", asset: "scooter.svg" },

    { id: "archery",       fr: "Cible",            en: "an archery target",    price: 75,  level: 58, w: 1, h: 1, category: "play", asset: "archery.svg" },
    { id: "bicycle",       fr: "Vélo",             en: "a bicycle",            price: 90,  level: 58, w: 4, h: 2, foot: 4, turns: true, category: "play", asset: "bicycle.svg" },

    { id: "tennis_net",    fr: "Filet de tennis",  en: "a tennis net",         price: 100, level: 59, w: 4, h: 2, foot: 4, turns: true, category: "play", asset: "tennis-net.svg" },
    { id: "goal",          fr: "But",              en: "a goal",               price: 110, level: 59, w: 4, h: 2, foot: 4, turns: true, category: "play", asset: "goal.svg" },

    { id: "basketball",    fr: "Panier de basket", en: "a basketball hoop",    price: 120, level: 60, w: 2, h: 2, foot: 2, turns: true, category: "play", asset: "basketball.svg" },
    { id: "table_tennis",  fr: "Ping-pong",        en: "a table tennis table", price: 130, level: 60, w: 4, h: 4, turns: true, where: "both", category: "play", asset: "table-tennis.svg" },
    { id: "skate_ramp",    fr: "Rampe de skate",   en: "a skate ramp",         price: 190, level: 60, w: 6, h: 4, foot: 6, turns: true, category: "play", asset: "skate-ramp.svg" },

    /* ---------- levels 61 to 65: the bathroom and the kitchen ---------- */
    { id: "mosaic",          fr: "Mosaïque",         en: "a mosaic",          price: 10,  level: 61, w: 1, h: 1, layer: "ground", turns: true, where: "in", category: "ground", asset: "mosaic.svg" },
    { id: "bath_mat",        fr: "Tapis de bain",    en: "a bath mat",        price: 30,  level: 61, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "bath-mat.svg" },

    { id: "laundry",         fr: "Panier à linge",   en: "a laundry basket",  price: 35,  level: 62, w: 1, h: 1, where: "in", category: "furniture", asset: "laundry.svg" },
    { id: "towel_rail",      fr: "Porte-serviettes", en: "a towel rail",      price: 45,  level: 62, w: 1, h: 1, turns: true, where: "in", category: "furniture", asset: "towel-rail.svg" },

    { id: "microwave",       fr: "Micro-ondes",      en: "a microwave",       price: 75,  level: 63, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "microwave.svg" },
    { id: "washbasin",       fr: "Lavabo",           en: "a washbasin",       price: 80,  level: 63, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "washbasin.svg" },

    { id: "toilet",          fr: "Toilettes",        en: "a toilet",          price: 90,  level: 64, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "toilet.svg" },
    { id: "dishwasher",      fr: "Lave-vaisselle",   en: "a dishwasher",      price: 115, level: 64, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "dishwasher.svg" },

    { id: "washing_machine", fr: "Machine à laver",  en: "a washing machine", price: 120, level: 65, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "washing-machine.svg" },
    { id: "shower",          fr: "Douche",           en: "a shower",          price: 130, level: 65, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "shower.svg" },
    { id: "bath",            fr: "Baignoire",        en: "a bath",            price: 140, level: 65, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "bath.svg" },

    /* ---------- levels 66 to 70: the grand living room ---------- */
    { id: "marble_floor",  fr: "Marbre",            en: "a marble floor",  price: 20,  level: 66, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "marble-floor.svg" },
    { id: "parquet_weave", fr: "Parquet en damier", en: "a parquet floor", price: 20,  level: 66, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "parquet-weave.svg" },

    { id: "coffee_table",  fr: "Table basse",       en: "a coffee table",  price: 90,  level: 67, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "coffee-table.svg" },
    { id: "armchair",      fr: "Fauteuil",          en: "an armchair",     price: 120, level: 67, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "armchair.svg" },

    { id: "desk",          fr: "Bureau",            en: "a desk",          price: 130, level: 68, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "desk.svg" },
    { id: "computer",      fr: "Ordinateur",        en: "a computer",      price: 140, level: 68, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "computer.svg" },

    { id: "clock",         fr: "Horloge",           en: "a clock",         price: 150, level: 69, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "clock.svg" },
    { id: "fireplace",     fr: "Cheminée",          en: "a fireplace",     price: 160, level: 69, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "fireplace.svg" },

    { id: "bunk_bed",      fr: "Lits superposés",   en: "bunk beds",       price: 170, level: 70, w: 4, h: 4, turns: true, where: "in", category: "furniture", asset: "bunk-bed.svg" },
    { id: "aquarium",      fr: "Aquarium",          en: "an aquarium",     price: 200, level: 70, w: 4, h: 2, foot: 4, turns: true, where: "in", category: "furniture", asset: "aquarium.svg" },
    { id: "piano",         fr: "Piano",             en: "a piano",         price: 300, level: 70, w: 4, h: 4, foot: 4, turns: true, where: "in", category: "furniture", asset: "piano.svg" },

    /* ---------- levels 71 to 75: the wild ---------- */
    { id: "moss",         fr: "Mousse",          en: "moss",         price: 10,  level: 71, w: 1, h: 1, layer: "ground", turns: true, category: "ground", asset: "moss.svg" },
    { id: "stream",       fr: "Ruisseau",        en: "a stream",     price: 20,  level: 71, w: 1, h: 1, layer: "ground", category: "ground", asset: "stream.svg", card: "stream-card.svg",
      joins: { group: "stream", edge: "stream-edge.svg", corner: "stream-corner.svg", inner: "stream-inner.svg" } },

    { id: "wild_flowers", fr: "Fleurs sauvages", en: "wild flowers", price: 20,  level: 72, w: 1, h: 1, category: "nature", asset: "wild-flowers.svg" },
    { id: "fern",         fr: "Fougère",         en: "a fern",       price: 25,  level: 72, w: 1, h: 1, category: "nature", asset: "fern.svg" },

    { id: "rock",         fr: "Rocher",          en: "a rock",       price: 30,  level: 73, w: 1, h: 1, category: "nature", asset: "rock.svg" },
    { id: "fallen_log",   fr: "Tronc couché",    en: "a fallen log", price: 45,  level: 73, w: 4, h: 2, foot: 4, turns: true, category: "nature", asset: "fallen-log.svg" },

    { id: "boulder",      fr: "Gros rocher",     en: "a boulder",    price: 60,  level: 74, w: 4, h: 4, foot: 4, category: "nature", asset: "boulder.svg" },
    { id: "hedgehog",     fr: "Hérisson",        en: "a hedgehog",   price: 75,  level: 74, w: 1, h: 1, category: "animals", asset: "hedgehog.svg" },

    { id: "owl",          fr: "Chouette",        en: "an owl",       price: 100, level: 75, w: 2, h: 2, foot: 2, category: "animals", asset: "owl.svg" },
    { id: "fox",          fr: "Renard",          en: "a fox",        price: 150, level: 75, w: 4, h: 2, foot: 4, category: "animals", asset: "fox.svg" },
    { id: "deer",         fr: "Cerf",            en: "a deer",       price: 175, level: 75, w: 4, h: 4, foot: 4, category: "animals", asset: "deer.svg" },

    /* ---------- levels 76 to 80: the party ---------- */
    { id: "dance_floor",    fr: "Piste de danse",      en: "a dance floor",     price: 20,  level: 76, w: 2, h: 2, layer: "ground", turns: true, where: "both", category: "ground", asset: "dance-floor.svg" },
    { id: "picnic_blanket", fr: "Nappe",               en: "a picnic blanket",  price: 30,  level: 76, w: 4, h: 4, layer: "ground", turns: true, category: "ground", asset: "picnic-blanket.svg" },

    { id: "bunting",        fr: "Guirlande",           en: "bunting",           price: 30,  level: 77, w: 4, h: 2, foot: 4, turns: true, where: "both", category: "garden", asset: "bunting.svg" },
    { id: "balloons",       fr: "Ballons",             en: "balloons",          price: 35,  level: 77, w: 1, h: 1, where: "both", category: "garden", asset: "balloons.svg" },

    { id: "lantern",        fr: "Lanterne",            en: "a lantern",         price: 40,  level: 78, w: 1, h: 1, where: "both", category: "garden", asset: "lantern.svg" },
    { id: "fairy_lights",   fr: "Guirlande lumineuse", en: "fairy lights",      price: 45,  level: 78, w: 4, h: 2, foot: 4, turns: true, where: "both", category: "garden", asset: "fairy-lights.svg" },

    { id: "cake_stand",     fr: "Gâteau",              en: "a cake stand",      price: 75,  level: 79, w: 1, h: 1, where: "both", category: "garden", asset: "cake-stand.svg" },
    { id: "speaker",        fr: "Enceinte",            en: "a speaker",         price: 100, level: 79, w: 2, h: 2, foot: 2, turns: true, where: "both", category: "garden", asset: "speaker.svg" },

    { id: "fireworks",      fr: "Feu d'artifice",      en: "fireworks",         price: 125, level: 80, w: 1, h: 1, category: "garden", asset: "fireworks.svg" },
    { id: "ice_cream_cart", fr: "Marchand de glaces",  en: "an ice cream cart", price: 175, level: 80, w: 4, h: 4, foot: 4, turns: true, category: "city", asset: "ice-cream-cart.svg" },
    { id: "stage",          fr: "Scène",               en: "a stage",           price: 200, level: 80, w: 6, h: 4, foot: 6, turns: true, category: "city", asset: "stage.svg" },

    /* ---------- levels 81 to 85: animals from far away ---------- */
    { id: "bamboo",   fr: "Bambou",       en: "a bamboo floor", price: 15,  level: 81, w: 2, h: 2, layer: "ground", turns: true, where: "both", category: "ground", asset: "bamboo.svg" },
    { id: "snake",    fr: "Serpent",      en: "a snake",        price: 100, level: 81, w: 1, h: 1, category: "animals", asset: "snake.svg" },

    { id: "tortoise", fr: "Tortue",       en: "a tortoise",     price: 125, level: 82, w: 2, h: 2, foot: 2, category: "animals", asset: "tortoise.svg" },
    { id: "parrot",   fr: "Perroquet",    en: "a parrot",       price: 150, level: 82, w: 2, h: 2, foot: 2, where: "both", category: "animals", asset: "parrot.svg" },

    { id: "toucan",   fr: "Toucan",       en: "a toucan",       price: 160, level: 83, w: 2, h: 2, foot: 2, category: "animals", asset: "toucan.svg" },
    { id: "penguin",  fr: "Manchot",      en: "a penguin",      price: 175, level: 83, w: 2, h: 2, foot: 2, category: "animals", asset: "penguin.svg" },

    { id: "monkey",   fr: "Singe",        en: "a monkey",       price: 200, level: 84, w: 2, h: 2, foot: 2, category: "animals", asset: "monkey.svg" },
    { id: "flamingo", fr: "Flamant rose", en: "a flamingo",     price: 200, level: 84, w: 2, h: 4, foot: 2, category: "animals", asset: "flamingo.svg" },

    { id: "peacock",  fr: "Paon",         en: "a peacock",      price: 225, level: 85, w: 4, h: 4, foot: 4, category: "animals", asset: "peacock.svg" },
    { id: "llama",    fr: "Lama",         en: "a llama",        price: 250, level: 85, w: 4, h: 2, foot: 4, category: "animals", asset: "llama.svg" },
    { id: "aviary",   fr: "Volière",      en: "an aviary",      price: 300, level: 85, w: 4, h: 4, foot: 4, category: "buildings", asset: "aviary.svg" },

    /* ---------- levels 86 to 90: winter ---------- */
    { id: "snow",           fr: "Neige",              en: "snow",             price: 10,  level: 86, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "snow.svg" },
    { id: "chalet_floor",   fr: "Plancher de chalet", en: "a cabin floor",    price: 15,  level: 86, w: 2, h: 2, layer: "ground", turns: true, where: "in", category: "ground", asset: "chalet-floor.svg" },

    { id: "ice_rink",       fr: "Patinoire",          en: "an ice rink",      price: 20,  level: 87, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "ice-rink.svg" },
    { id: "skis",           fr: "Skis",               en: "skis",             price: 60,  level: 87, w: 1, h: 1, turns: true, where: "both", category: "play", asset: "skis.svg" },

    { id: "snowman",        fr: "Bonhomme de neige",  en: "a snowman",        price: 75,  level: 88, w: 3, h: 3, foot: 3, category: "nature", asset: "snowman.svg" },
    { id: "sledge",         fr: "Luge",               en: "a sledge",         price: 90,  level: 88, w: 4, h: 2, foot: 4, turns: true, category: "play", asset: "sledge.svg" },

    { id: "snowy_fir",      fr: "Sapin enneigé",      en: "a snowy fir",      price: 125, level: 89, w: 3, h: 4, foot: 3, category: "nature", asset: "snowy-fir.svg" },
    { id: "wood_stove",     fr: "Poêle à bois",       en: "a wood stove",     price: 140, level: 89, w: 2, h: 2, foot: 2, turns: true, where: "in", category: "furniture", asset: "wood-stove.svg" },

    { id: "christmas_tree", fr: "Sapin de Noël",      en: "a Christmas tree", price: 200, level: 90, w: 3, h: 4, foot: 3, where: "both", category: "nature", asset: "christmas-tree.svg" },
    { id: "reindeer",       fr: "Renne",              en: "a reindeer",       price: 225, level: 90, w: 4, h: 4, foot: 4, category: "animals", asset: "reindeer.svg" },
    { id: "igloo",          fr: "Igloo",              en: "an igloo",         price: 250, level: 90, w: 4, h: 4, foot: 4, category: "buildings", asset: "igloo.svg" },

    /* ---------- levels 91 to 95: monuments ---------- */
    { id: "marble_dark",  fr: "Marbre noir",       en: "black marble",   price: 15,  level: 91, w: 1, h: 1, layer: "ground", where: "in", category: "ground", asset: "marble-dark.svg" },
    { id: "flagpole",     fr: "Mât",               en: "a flagpole",     price: 100, level: 91, w: 2, h: 2, foot: 2, category: "buildings", asset: "flagpole.svg" },

    { id: "sundial",      fr: "Cadran solaire",    en: "a sundial",      price: 125, level: 92, w: 2, h: 2, foot: 2, category: "buildings", asset: "sundial.svg" },
    { id: "topiary_arch", fr: "Arche de buis",     en: "a topiary arch", price: 175, level: 92, w: 4, h: 4, foot: 4, turns: true, category: "garden", asset: "topiary-arch.svg" },

    { id: "bridge",       fr: "Pont",              en: "a bridge",       price: 200, level: 93, w: 6, h: 4, wet: true, turns: true, category: "buildings", asset: "bridge.svg" },
    { id: "obelisk",      fr: "Obélisque",         en: "an obelisk",     price: 225, level: 93, w: 2, h: 4, foot: 2, category: "buildings", asset: "obelisk.svg" },

    { id: "statue",       fr: "Statue",            en: "a statue",       price: 250, level: 94, w: 2, h: 4, foot: 2, category: "buildings", asset: "statue.svg" },
    { id: "stone_circle", fr: "Cercle de pierres", en: "a stone circle", price: 275, level: 94, w: 6, h: 4, foot: 6, category: "buildings", asset: "stone-circle.svg" },

    { id: "greenhouse",   fr: "Serre",             en: "a greenhouse",   price: 300, level: 95, w: 6, h: 4, foot: 6, turns: true, category: "buildings", asset: "greenhouse.svg" },
    { id: "gazebo",       fr: "Kiosque",           en: "a gazebo",       price: 350, level: 95, w: 6, h: 6, foot: 6, category: "buildings", asset: "gazebo.svg" },
    { id: "clock_tower",  fr: "Beffroi",           en: "a clock tower",  price: 400, level: 95, w: 4, h: 6, foot: 4, category: "buildings", asset: "clock-tower.svg" },

    /* ---------- levels 96 to 100: the wonders ---------- */
    { id: "red_carpet",      fr: "Tapis rouge",      en: "a red carpet",      price: 45,   level: 96,  w: 2, h: 4, layer: "ground", turns: true, where: "both", category: "ground", asset: "red-carpet.svg" },
    { id: "dragon_statue",   fr: "Dragon de pierre", en: "a stone dragon",    price: 450,  level: 96,  w: 4, h: 4, foot: 4, turns: true, category: "buildings", asset: "dragon-statue.svg" },

    { id: "hot_air_balloon", fr: "Montgolfière",     en: "a hot air balloon", price: 500,  level: 97,  w: 4, h: 6, foot: 2, category: "buildings", asset: "hot-air-balloon.svg" },
    { id: "treehouse",       fr: "Cabane perchée",   en: "a treehouse",       price: 550,  level: 97,  w: 6, h: 6, foot: 4, category: "buildings", asset: "treehouse.svg" },

    { id: "lighthouse",      fr: "Phare",            en: "a lighthouse",      price: 600,  level: 98,  w: 4, h: 8, foot: 4, category: "buildings", asset: "lighthouse.svg" },
    { id: "pirate_ship",     fr: "Bateau pirate",    en: "a pirate ship",     price: 650,  level: 98,  w: 8, h: 4, wet: true, turns: true, category: "beach", asset: "pirate-ship.svg" },

    { id: "castle_tower",    fr: "Tour de château",  en: "a castle tower",    price: 700,  level: 99,  w: 3, h: 6, foot: 3, category: "buildings", asset: "castle-tower.svg" },
    { id: "carousel",        fr: "Manège",           en: "a carousel",        price: 750,  level: 99,  w: 6, h: 6, foot: 6, category: "play", asset: "carousel.svg" },

    { id: "rocket",          fr: "Fusée",            en: "a rocket",          price: 800,  level: 100, w: 4, h: 8, foot: 4, category: "buildings", asset: "rocket.svg" },
    { id: "observatory",     fr: "Observatoire",     en: "an observatory",    price: 900,  level: 100, w: 5, h: 6, foot: 5, category: "buildings", asset: "observatory.svg" },
    { id: "ferris_wheel",    fr: "Grande roue",      en: "a big wheel",       price: 1000, level: 100, w: 8, h: 8, foot: 6, category: "play", asset: "ferris-wheel.svg" },

  ];


  /* ---------------------------------------------------------------
     COLOURS — the paint pots. Every colour an object can be given is
     one of these; the hex is the swatch shown in the shop and on the
     action bar, and it is also the colour the drawing is repainted in.
     --------------------------------------------------------------- */
  const COLOURS = {
    red:    { fr: "Rouge",     hex: "#c8413c" },
    pink:   { fr: "Rose",      hex: "#e3618f" },
    orange: { fr: "Orange",    hex: "#e0802f" },
    yellow: { fr: "Jaune",     hex: "#f2c94c" },
    green:  { fr: "Vert",      hex: "#4d9a3b" },
    teal:   { fr: "Turquoise", hex: "#3aa79b" },
    blue:   { fr: "Bleu",      hex: "#4a7fa8" },
    purple: { fr: "Violet",    hex: "#8a63c4" },
    brown:  { fr: "Marron",    hex: "#a9763f" },
    cream:  { fr: "Crème",     hex: "#e8e2d4" },
    white:  { fr: "Blanc",     hex: "#fdfdfb" },
    grey:   { fr: "Gris",      hex: "#9aa3ab" },
    black:  { fr: "Noir",      hex: "#3a3f44" }
  };

  /* ---------------------------------------------------------------
     PAINT — the objects that come in more than one colour, and which
     colours those are. The first of the list is the colour the object
     is already drawn in: it is the plain drawing, assets/items/bed.svg.
     Each of the others has its own file beside it, assets/items/
     bed-blue.svg, written once and for all by tools/recolour.js.

     `tint` is for that tool alone — it names the fills in the drawing
     that take the colour, the first of them being the main one, the
     rest its highlights and shadows. The app never reads it: it only
     ever asks for a colour by name.
     --------------------------------------------------------------- */
  const PAINT = {
    /* the first day */
    rug:        { colours: ["red", "blue", "green", "purple", "teal"],    tint: ["#b8504f", "#d4706b", "#8f2a26"] },
    tiles:      { colours: ["grey", "blue", "green", "cream", "pink"],    tint: ["#c9d3da", "#e6edf1", "#b6c2ca", "#a9b5bd"] },
    flowers:    { colours: ["pink", "red", "yellow", "blue", "purple"],   tint: ["#e3618f", "#a83a63", "#f0f0f0", "#c4bfae", "#8a63c4", "#5f3f96"] },
    bucket:     { colours: ["grey", "blue", "red", "green", "yellow"],    tint: ["#9aa3ab", "#b7c0c7", "#7d868d", "#6f7880"] },
    mailbox:    { colours: ["blue", "red", "green", "yellow", "black"],   tint: ["#2a5b8c", "#3f7fbf"] },
    chair:      { colours: ["brown", "white", "red", "blue", "green"],    tint: ["#b0813f", "#c8974d", "#8f6134", "#6d4a28", "#5c3d1f"] },
    table:      { colours: ["brown", "white", "grey", "blue", "red"],     tint: ["#b0813f", "#c8974d", "#6d4a28", "#5c3d1f"] },
    plant:      { colours: ["orange", "blue", "green", "white", "grey"],  tint: ["#c8674a", "#d9775a", "#8f4530"] },
    inner_door: { colours: ["brown", "white", "blue", "red", "green"],    tint: ["#a9763f", "#c8974d", "#8f6134", "#6d4a28", "#5c3d1f"] },
    wardrobe:   { colours: ["brown", "white", "blue", "green", "grey"],   tint: ["#a9763f", "#c8974d", "#5c3d1f"] },
    bookshelf:  { colours: ["brown", "white", "grey", "blue", "green"],   tint: ["#8f6134", "#6d4a28"] },
    bed:        { colours: ["red", "blue", "green", "purple", "yellow"],  tint: ["#c8413c", "#8f2a26", "#e06a63", "#b53a36"] },

    /* the years after */
    stool:      { colours: ["brown", "red", "blue", "green", "white"],    tint: ["#cda06a", "#b8874d", "#6d4a28"] },
    shelf:      { colours: ["brown", "white", "grey", "blue", "green"],   tint: ["#cda06a", "#6d4a28"] },
    watering_can: { colours: ["blue", "green", "red", "yellow", "grey"],  tint: ["#4a90b8", "#6fb3d6", "#2f5d80"] },
    wheelbarrow: { colours: ["red", "blue", "green", "yellow", "grey"],   tint: ["#c8413c", "#a83733", "#8f2a26"] },
    planter:    { colours: ["brown", "white", "blue", "grey", "red"],     tint: ["#cda06a", "#b8874d", "#6d4a28"] },
    pet_basket: { colours: ["red", "blue", "green", "purple", "cream"],   tint: ["#c8413c", "#dd6a63", "#8f2a26"] },
    sofa:       { colours: ["blue", "red", "green", "yellow", "purple", "grey"], tint: ["#4a7fa8", "#5f9bc7", "#7fb6dd", "#2f5d80"] },
    cupboard:   { colours: ["cream", "blue", "green", "red", "grey"],     tint: ["#e8e2d4", "#d6cdb8", "#8f7f63"] },
    fridge:     { colours: ["white", "red", "blue", "green", "black"],    tint: ["#dfe4e8", "#eef2f5", "#b6bfc6", "#8d969e"] },
    bench:      { colours: ["brown", "green", "white", "blue", "red"],    tint: ["#b0813f", "#96683a", "#8f6134", "#6d4a28", "#5c3d1f"] },
    hammock:    { colours: ["yellow", "red", "blue", "green", "pink"],    tint: ["#f2c94c", "#e8b84b", "#b98d22"] },
    tractor:    { colours: ["red", "green", "blue", "yellow", "orange"],  tint: ["#c8413c", "#a83733", "#8f2a26"] },
    trailer:    { colours: ["green", "red", "blue", "yellow", "grey"],    tint: ["#4d8a3c", "#5fa34a", "#2f5d27"] },
    barn:       { colours: ["red", "blue", "green", "brown", "grey"],     tint: ["#c8413c", "#a83733", "#8f2a26", "#6d201d"] },
    bin:        { colours: ["green", "blue", "grey", "yellow", "red"],    tint: ["#4d9a5b", "#5fb06d", "#3f7a4a", "#28583a"] },
    ball:       { colours: ["black", "red", "blue", "green", "orange"],   tint: ["#3a3f44"] },
    kite:       { colours: ["red", "blue", "green", "yellow", "purple"],  tint: ["#e8536b", "#b83350", "#f2c94c", "#4a7fa8"] },
    trampoline: { colours: ["blue", "green", "red", "purple", "black"],   tint: ["#3a5f8f", "#4d6b9a", "#26436a", "#2f3f5c"] },
    slide:      { colours: ["yellow", "red", "blue", "green", "purple"],  tint: ["#f2c94c", "#ffe18c", "#c99a37"] },
    rocking_horse: { colours: ["red", "blue", "green", "brown", "purple"], tint: ["#c8413c"] },
    beach_towel: { colours: ["red", "blue", "green", "yellow", "purple"], tint: ["#e8536b", "#b83350"] },
    parasol:    { colours: ["red", "blue", "green", "yellow", "teal"],    tint: ["#e8536b", "#b83350"] },
    deckchair:  { colours: ["blue", "red", "green", "yellow", "orange"],  tint: ["#4a90b8", "#cfe6f2", "#2f5d80"] },
    surfboard:  { colours: ["red", "blue", "green", "purple", "orange"],  tint: ["#e8536b", "#f2c94c"] },
    beach_hut:  { colours: ["red", "blue", "green", "yellow", "purple"],  tint: ["#e8536b"] },
    lifebuoy:   { colours: ["red", "blue", "green", "orange", "yellow"],  tint: ["#c8413c"] },
    rowing_boat: { colours: ["brown", "blue", "red", "green", "white"],   tint: ["#cda06a", "#b8874d", "#8f6134", "#6d4a28"] },
    scooter:    { colours: ["blue", "red", "green", "purple", "black"],   tint: ["#4a90b8"] },
    bicycle:    { colours: ["red", "blue", "green", "yellow", "black"],   tint: ["#c8413c"] },
    bath_mat:   { colours: ["blue", "green", "pink", "cream", "purple"],  tint: ["#6fb3d6", "#8fd0ea", "#b6e3f5", "#3f88ad"] },
    armchair:   { colours: ["purple", "blue", "red", "green", "yellow", "grey"], tint: ["#5d4a7a", "#6f5a8f", "#8571a8", "#9b89bb", "#4a3a63"] },
    coffee_table: { colours: ["brown", "white", "grey", "blue", "red"],   tint: ["#cda06a", "#dcb684", "#6d4a28"] },
    desk:       { colours: ["brown", "white", "grey", "blue", "green"],   tint: ["#cda06a", "#b8874d", "#8f6134", "#6d4a28"] },
    picnic_blanket: { colours: ["red", "blue", "green", "yellow", "purple"], tint: ["#c8413c", "#8f2a26"] },
    sledge:     { colours: ["brown", "red", "blue", "green", "yellow"],   tint: ["#b8874d", "#96683a", "#6d4a28"] },
    skis:       { colours: ["red", "blue", "green", "purple", "orange"],  tint: ["#c8413c", "#8f2a26"] },
    flagpole:   { colours: ["blue", "red", "green", "yellow", "purple"],  tint: ["#4a90b8", "#2f5d80"] },
    hot_air_balloon: { colours: ["red", "blue", "green", "purple", "teal"], tint: ["#c8413c", "#8f2a26"] }
  };

  const FOLDER = "assets/items/";
  const LAST_LEVEL = 100;

  const BY_ID = {};
  ITEMS.forEach(item => { BY_ID[item.id] = item; });

  /* The ground an object holds, before it is turned: the strip along
     the foot of its drawing, or the whole drawing when it says
     nothing. */
  function ground(item) {
    return item.foot ? { w: item.foot, h: 1 } : { w: item.w, h: item.h };
  }

  // "bed.svg" in blue is "bed-blue.svg"; in its own colour it is
  // simply "bed.svg".
  function repainted(file, colour) {
    if (!colour) return file;
    return file.replace(/\.svg$/, "-" + colour + ".svg");
  }

  return {
    CATEGORIES,
    ITEMS,
    COLOURS,
    PAINT,
    LAST_LEVEL,
    item(id) { return BY_ID[id] || null; },
    // Everything is an object unless it says otherwise.
    layerOf(item) { return item && item.layer === "ground" ? "ground" : "object"; },
    /* How much ground it takes once turned: a quarter turn swaps the
       two. This is what every rule of the game asks — what fits where,
       what is in the way — and it is the corner an object is stored by. */
    footprint(item, turn) {
      if (!item) return { w: 2, h: 2 };
      const foot = ground(item);
      return (turn || 0) % 2 ? { w: foot.h, h: foot.w } : { w: foot.w, h: foot.h };
    },
    /* Where the drawing goes, given the ground the object holds: the
       corner it starts at, counted from the corner of the foot, and how
       big it is. A tree's branches reach out to either side of its
       trunk and stand well behind it, so both numbers are negative; and
       when the tree is given a quarter turn the branches go with it. */
    drawing(item, turn) {
      if (!item) return { x: 0, y: 0, w: 2, h: 2 };
      const foot = ground(item);
      const side = (item.w - foot.w) / 2;   // sticks out to either side
      const back = item.h - foot.h;         // and stands behind the foot
      switch ((turn || 0) % 4) {
        case 1:  return { x: 0, y: -side, w: item.h, h: item.w };
        case 2:  return { x: -side, y: 0, w: item.w, h: item.h };
        case 3:  return { x: -back, y: -side, w: item.h, h: item.w };
        default: return { x: -side, y: -back, w: item.w, h: item.h };
      }
    },
    // Is this sold in the scene the child is standing in?
    fitsScene(item, indoor) {
      if (!item) return false;
      if (item.where === "both") return true;
      return item.where === "in" ? !!indoor : !indoor;
    },
    // Has the child gone far enough in the lessons to be offered this?
    levelOf(item) { return (item && item.level) || 0; },
    unlocked(item, level) { return !!item && (item.level || 0) <= (level || 0); },
    // What turns up at a level, and the level the next batch turns up at.
    newAt(level) { return ITEMS.filter(item => (item.level || 0) === level); },
    nextLevel(level) {
      const ahead = ITEMS
        .map(item => item.level || 0)
        .filter(one => one > (level || 0));
      return ahead.length ? Math.min.apply(null, ahead) : null;
    },
    // What an object joins up with, or nothing at all.
    joinsOf(item) { return (item && item.joins) || null; },
    // Does it belong on open water? A jetty and a boat do, a hen does not.
    floats(item) { return !!(item && item.wet); },
    // The colours an object comes in, or nothing: most things come in
    // one colour only. The first of the list is the one it is drawn in.
    paintsOf(item) {
      const paint = item && PAINT[item.id];
      return paint ? paint.colours : null;
    },
    // The colour an object is really wearing. Anything the object does
    // not come in — a colour dropped since, or none at all — falls back
    // to the one it is drawn in.
    paintOf(item, colour) {
      const paint = item && PAINT[item.id];
      if (!paint) return null;
      return paint.colours.indexOf(colour) > 0 ? colour : paint.colours[0];
    },
    // Is this the colour the drawing already has, and so no repaint?
    plain(item, colour) {
      const paint = item && PAINT[item.id];
      return !paint || !colour || colour === paint.colours[0];
    },
    swatch(colour) {
      const pot = COLOURS[colour];
      return pot ? pot.hex : "#9aa3ab";
    },
    colourName(colour) {
      const pot = COLOURS[colour];
      return pot ? pot.fr : "";
    },
    assetUrl(id, colour) {
      const item = BY_ID[id];
      if (!item) return "";
      const paint = PAINT[id];
      const worn = paint && paint.colours.indexOf(colour) > 0 ? colour : null;
      return FOLDER + repainted(item.asset, worn);
    },
    // What to show when the object is named rather than put down.
    cardUrl(id, colour) {
      const item = BY_ID[id];
      if (!item) return "";
      const paint = PAINT[id];
      const worn = paint && paint.colours.indexOf(colour) > 0 ? colour : null;
      return FOLDER + repainted(item.card || item.asset, worn);
    },
    pieceUrl(file) { return FOLDER + file; }
  };
})();
