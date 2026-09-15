/* =====================================================================
   CATALOGUE — every object the shop can sell, and the level it turns up
   at.

   This file holds data only: no drawing, no game rules. The artwork of
   each item lives in its own file under assets/items/, so a drawing can
   be redone without touching any code.

   The list is ordered by level, because that is the story it tells: the
   child starts with a garden's worth of things and, every five levels,
   ten more arrive — bigger, dearer, and from a new corner of the world.
   Level 100 is the last of them.

   Fields:
     id       stable key, stored in the save file — never rename it.
     fr / en  the two names shown on the item card. The English one is
              what a later version will read out loud to teach the word.
     price    what it costs, and what it is sold back for.
     level    the level that puts it in the shop; 0 is there from the
              first day. Everything else is a multiple of five.
     w / h    footprint on the grid, in tiles. The grid is fine: a hen
              takes 2 x 2 of them, a fence post only 1 x 1. A drawing
              must have the proportions of its footprint — 16 px of SVG
              per tile — so a 2 x 2 object is drawn in a 32 x 32 viewBox.
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
    { id: "path",  fr: "Chemin", en: "a path",  price: 15, level: 0, w: 2, h: 2, layer: "ground", category: "ground", asset: "path.svg" },
    { id: "tiles", fr: "Carrelage", en: "tiles", price: 20, level: 0, w: 2, h: 2, layer: "ground", where: "in", category: "ground", asset: "tiles.svg" },
    { id: "field", fr: "Champ",  en: "a field", price: 25, level: 0, w: 2, h: 2, layer: "ground", category: "ground", asset: "field.svg" },
    { id: "rug",   fr: "Tapis",  en: "a rug",   price: 120, level: 0, w: 4, h: 4, layer: "ground", where: "in", category: "ground", asset: "rug.svg" },

    { id: "flowers",  fr: "Fleurs",     en: "flowers",    price: 30, level: 0, w: 2, h: 2, category: "nature", asset: "flowers.svg" },
    { id: "wheat",    fr: "Blé",        en: "wheat",      price: 35, level: 0, w: 2, h: 2, category: "nature", asset: "wheat.svg" },
    { id: "mushroom", fr: "Champignon", en: "a mushroom", price: 40, level: 0, w: 2, h: 2, category: "nature", asset: "mushroom.svg" },
    { id: "pumpkin",  fr: "Citrouille", en: "a pumpkin",  price: 45, level: 0, w: 2, h: 2, category: "nature", asset: "pumpkin.svg" },
    { id: "bush",     fr: "Buisson",    en: "a bush",     price: 50, level: 0, w: 2, h: 2, category: "nature", asset: "bush.svg" },

    { id: "fence",     fr: "Barrière",          en: "a fence",     price: 10, level: 0, w: 1, h: 1, category: "garden", asset: "fence.svg", card: "fence-run.svg",
      joins: { group: "fence", across: "fence-rail.svg", down: "fence-beam.svg" } },
    { id: "bucket",    fr: "Seau",              en: "a bucket",    price: 25, level: 0, w: 2, h: 2, category: "garden", asset: "bucket.svg" },
    { id: "sign",      fr: "Panneau",           en: "a sign",      price: 40, level: 0, w: 2, h: 2, turns: true, category: "garden", asset: "sign.svg" },
    { id: "barrel",    fr: "Tonneau",           en: "a barrel",    price: 50, level: 0, w: 2, h: 2, category: "garden", asset: "barrel.svg" },
    { id: "mailbox",   fr: "Boîte aux lettres", en: "a mailbox",   price: 60, level: 0, w: 2, h: 2, category: "garden", asset: "mailbox.svg" },
    { id: "birdhouse", fr: "Nichoir",           en: "a birdhouse", price: 70, level: 0, w: 2, h: 2, category: "garden", asset: "birdhouse.svg" },

    { id: "chicken", fr: "Poule",  en: "a hen",    price: 60, level: 0, w: 2, h: 2, category: "animals", asset: "chicken.svg" },
    { id: "duck",    fr: "Canard", en: "a duck",   price: 70, level: 0, w: 2, h: 2, category: "animals", asset: "duck.svg" },
    { id: "rabbit",  fr: "Lapin",  en: "a rabbit", price: 80, level: 0, w: 2, h: 2, category: "animals", asset: "rabbit.svg" },
    { id: "cat",     fr: "Chat",   en: "a cat",    price: 90, level: 0, w: 2, h: 2, where: "both", category: "animals", asset: "cat.svg" },

    { id: "chair",      fr: "Chaise",       en: "a chair",     price: 60,  level: 0, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "chair.svg" },
    { id: "plant",      fr: "Plante",       en: "a plant",     price: 70,  level: 0, w: 2, h: 2, where: "in", category: "furniture", asset: "plant.svg" },
    { id: "inner_door", fr: "Porte",        en: "a door",      price: 90,  level: 0, w: 2, h: 1, turns: true, where: "in", category: "furniture", asset: "inner-door.svg" },
    { id: "table",      fr: "Table",        en: "a table",     price: 140, level: 0, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "table.svg" },
    { id: "bookshelf",  fr: "Bibliothèque", en: "a bookcase",  price: 150, level: 0, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "bookshelf.svg" },
    { id: "wardrobe",   fr: "Armoire",      en: "a wardrobe",  price: 170, level: 0, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "wardrobe.svg" },
    { id: "bed",        fr: "Lit",          en: "a bed",       price: 280, level: 0, w: 4, h: 4, turns: true, where: "in", category: "furniture", asset: "bed.svg" },

    /* ---------- level 5: the vegetable patch ---------- */
    { id: "veg_patch",    fr: "Potager",      en: "a vegetable patch", price: 30, level: 5, w: 2, h: 2, layer: "ground", category: "ground", asset: "veg-patch.svg" },
    { id: "carrot",       fr: "Carottes",     en: "carrots",      price: 25, level: 5, w: 2, h: 2, category: "nature", asset: "carrot.svg" },
    { id: "cabbage",      fr: "Chou",         en: "a cabbage",    price: 30, level: 5, w: 2, h: 2, category: "nature", asset: "cabbage.svg" },
    { id: "strawberry",   fr: "Fraises",      en: "strawberries", price: 35, level: 5, w: 2, h: 2, category: "nature", asset: "strawberry.svg" },
    { id: "tomato",       fr: "Tomates",      en: "tomatoes",     price: 40, level: 5, w: 2, h: 2, category: "nature", asset: "tomato.svg" },
    { id: "sunflower",    fr: "Tournesol",    en: "a sunflower",  price: 45, level: 5, w: 2, h: 2, category: "nature", asset: "sunflower.svg" },
    { id: "watering_can", fr: "Arrosoir",     en: "a watering can", price: 30, level: 5, w: 2, h: 2, category: "garden", asset: "watering-can.svg" },
    { id: "wheelbarrow",  fr: "Brouette",     en: "a wheelbarrow", price: 60, level: 5, w: 4, h: 2, turns: true, category: "garden", asset: "wheelbarrow.svg" },
    { id: "scarecrow",    fr: "Épouvantail",  en: "a scarecrow",  price: 95, level: 5, w: 2, h: 2, category: "garden", asset: "scarecrow.svg" },
    { id: "stool",        fr: "Tabouret",     en: "a stool",      price: 50, level: 5, w: 2, h: 2, where: "in", category: "furniture", asset: "stool.svg" },

    /* ---------- level 10: the orchard ---------- */
    { id: "stump",       fr: "Souche",     en: "a tree stump",  price: 40,  level: 10, w: 2, h: 2, category: "nature", asset: "stump.svg" },
    { id: "log_pile",    fr: "Tas de bûches", en: "a log pile", price: 60,  level: 10, w: 4, h: 2, turns: true, category: "nature", asset: "log-pile.svg" },
    { id: "hedge",       fr: "Haie",       en: "a hedge",       price: 80,  level: 10, w: 2, h: 2, category: "nature", asset: "hedge.svg" },
    { id: "pine_tree",   fr: "Sapin",      en: "a pine tree",   price: 170, level: 10, w: 4, h: 4, category: "nature", asset: "pine-tree.svg" },
    { id: "apple_tree",  fr: "Pommier",    en: "an apple tree", price: 190, level: 10, w: 4, h: 4, category: "nature", asset: "apple-tree.svg" },
    { id: "cherry_tree", fr: "Cerisier",   en: "a cherry tree", price: 200, level: 10, w: 4, h: 4, category: "nature", asset: "cherry-tree.svg" },
    { id: "fruit_crate", fr: "Cagette",    en: "a fruit crate", price: 45,  level: 10, w: 2, h: 2, category: "garden", asset: "fruit-crate.svg" },
    { id: "ladder",      fr: "Échelle",    en: "a ladder",      price: 55,  level: 10, w: 2, h: 4, turns: true, category: "garden", asset: "ladder.svg" },
    { id: "beehive",     fr: "Ruche",      en: "a beehive",     price: 120, level: 10, w: 2, h: 2, category: "garden", asset: "beehive.svg" },
    { id: "shelf",       fr: "Étagère",    en: "a shelf",       price: 110, level: 10, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "shelf.svg" },

    /* ---------- level 15: paths and paving ---------- */
    { id: "gravel",     fr: "Gravier",       en: "gravel",          price: 18, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "gravel.svg" },
    { id: "stepping",   fr: "Pas japonais",  en: "stepping stones", price: 20, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "stepping.svg" },
    { id: "paving",     fr: "Pavés",         en: "paving stones",   price: 22, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "paving-stones.svg" },
    { id: "brick_path", fr: "Briques",       en: "a brick path",    price: 24, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "brick-path.svg" },
    { id: "decking",    fr: "Terrasse",      en: "decking",         price: 28, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "decking.svg" },
    { id: "flowerbed",  fr: "Parterre",      en: "a flower bed",    price: 30, level: 15, w: 2, h: 2, layer: "ground", category: "ground", asset: "flowerbed.svg" },
    { id: "wood_floor", fr: "Parquet",       en: "a wooden floor",  price: 30, level: 15, w: 2, h: 2, layer: "ground", where: "in", category: "ground", asset: "wood-floor.svg" },
    { id: "low_wall",   fr: "Muret",         en: "a low wall",      price: 20, level: 15, w: 1, h: 1, category: "garden", asset: "wall-post.svg", card: "wall-run.svg",
      joins: { group: "low_wall", across: "wall-rail.svg", down: "wall-beam.svg" } },
    { id: "planter",    fr: "Jardinière",    en: "a planter",       price: 70,  level: 15, w: 4, h: 2, turns: true, category: "garden", asset: "planter.svg" },
    { id: "garden_arch", fr: "Arche",        en: "a garden arch",   price: 140, level: 15, w: 4, h: 2, turns: true, category: "garden", asset: "garden-arch.svg" },

    /* ---------- level 20: the farmyard ---------- */
    { id: "feed_sack", fr: "Sac de grain", en: "a sack of feed", price: 40,  level: 20, w: 2, h: 2, category: "farm", asset: "feed-sack.svg" },
    { id: "trough",    fr: "Abreuvoir",    en: "a trough",       price: 70,  level: 20, w: 4, h: 2, turns: true, category: "farm", asset: "trough.svg" },
    { id: "hay_bale",  fr: "Botte de foin", en: "a hay bale",    price: 80,  level: 20, w: 2, h: 2, category: "farm", asset: "hay-bale.svg" },
    { id: "coop",      fr: "Poulailler",   en: "a chicken coop", price: 450, level: 20, w: 6, h: 4, turns: true, category: "farm", asset: "coop.svg" },
    { id: "dog",       fr: "Chien",        en: "a dog",          price: 110, level: 20, w: 2, h: 2, where: "both", category: "animals", asset: "dog.svg" },
    { id: "goose",     fr: "Oie",          en: "a goose",        price: 130, level: 20, w: 2, h: 2, category: "animals", asset: "goose.svg" },
    { id: "sheep",     fr: "Mouton",       en: "a sheep",        price: 150, level: 20, w: 2, h: 2, category: "animals", asset: "sheep.svg" },
    { id: "goat",      fr: "Chèvre",       en: "a goat",         price: 160, level: 20, w: 2, h: 2, category: "animals", asset: "goat.svg" },
    { id: "pig",       fr: "Cochon",       en: "a pig",          price: 180, level: 20, w: 4, h: 2, category: "animals", asset: "pig.svg" },
    { id: "pet_basket", fr: "Panier",      en: "a pet basket",   price: 90,  level: 20, w: 2, h: 2, where: "both", category: "furniture", asset: "pet-basket.svg" },

    /* ---------- level 25: the house is fitted out ---------- */
    { id: "table_lamp",      fr: "Lampe",        en: "a lamp",          price: 80,  level: 25, w: 2, h: 2, where: "in", category: "furniture", asset: "table-lamp.svg" },
    { id: "mirror",          fr: "Miroir",       en: "a mirror",        price: 90,  level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "mirror.svg" },
    { id: "painting",        fr: "Tableau",      en: "a painting",      price: 100, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "painting.svg" },
    { id: "cupboard",        fr: "Placard",      en: "a cupboard",      price: 150, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "cupboard.svg" },
    { id: "kitchen_counter", fr: "Plan de travail", en: "a kitchen counter", price: 160, level: 25, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "kitchen-counter.svg" },
    { id: "sink",            fr: "Évier",        en: "a sink",          price: 180, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "sink.svg" },
    { id: "stove",           fr: "Cuisinière",   en: "a cooker",        price: 200, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "stove.svg" },
    { id: "fridge",          fr: "Réfrigérateur", en: "a fridge",       price: 220, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "fridge.svg" },
    { id: "sofa",            fr: "Canapé",       en: "a sofa",          price: 220, level: 25, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "sofa.svg" },
    { id: "tv",              fr: "Télévision",   en: "a television",    price: 240, level: 25, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "tv.svg" },

    /* ---------- level 30: a garden to sit in ---------- */
    { id: "gnome",        fr: "Nain de jardin", en: "a garden gnome", price: 60,  level: 30, w: 2, h: 2, category: "garden", asset: "gnome.svg" },
    { id: "lamp",         fr: "Lampadaire",     en: "a street lamp",  price: 85,  level: 30, w: 2, h: 2, category: "garden", asset: "lamp.svg" },
    { id: "bird_bath",    fr: "Vasque à oiseaux", en: "a bird bath",  price: 110, level: 30, w: 2, h: 2, category: "garden", asset: "bird-bath.svg" },
    { id: "campfire",     fr: "Feu de camp",    en: "a campfire",     price: 120, level: 30, w: 2, h: 2, category: "garden", asset: "campfire.svg" },
    { id: "bench",        fr: "Banc",           en: "a bench",        price: 130, level: 30, w: 4, h: 2, turns: true, category: "garden", asset: "bench.svg" },
    { id: "topiary",      fr: "Buis taillé",    en: "a topiary",      price: 140, level: 30, w: 2, h: 2, category: "garden", asset: "topiary.svg" },
    { id: "hammock",      fr: "Hamac",          en: "a hammock",      price: 150, level: 30, w: 4, h: 2, turns: true, category: "garden", asset: "hammock.svg" },
    { id: "bbq",          fr: "Barbecue",       en: "a barbecue",     price: 170, level: 30, w: 4, h: 2, turns: true, category: "garden", asset: "bbq.svg" },
    { id: "picnic_table", fr: "Table de pique-nique", en: "a picnic table", price: 210, level: 30, w: 4, h: 4, category: "garden", asset: "picnic-table.svg" },
    { id: "pergola",      fr: "Pergola",        en: "a pergola",      price: 260, level: 30, w: 4, h: 4, category: "garden", asset: "pergola.svg" },

    /* ---------- level 35: the working farm ---------- */
    { id: "corn",       fr: "Maïs",        en: "maize",        price: 40,  level: 35, w: 2, h: 2, category: "nature", asset: "corn.svg" },
    { id: "tyre",       fr: "Vieux pneu",  en: "an old tyre",  price: 50,  level: 35, w: 2, h: 2, category: "farm", asset: "tyre.svg" },
    { id: "milk_churn", fr: "Bidon de lait", en: "a milk churn", price: 70, level: 35, w: 2, h: 2, category: "farm", asset: "milk-churn.svg" },
    { id: "plough",     fr: "Charrue",     en: "a plough",     price: 180, level: 35, w: 4, h: 2, turns: true, category: "farm", asset: "plough.svg" },
    { id: "trailer",    fr: "Remorque",    en: "a trailer",    price: 220, level: 35, w: 4, h: 2, turns: true, category: "farm", asset: "trailer.svg" },
    { id: "well",       fr: "Puits",       en: "a well",       price: 240, level: 35, w: 4, h: 4, category: "garden", asset: "well.svg" },
    { id: "cow",        fr: "Vache",       en: "a cow",        price: 220, level: 35, w: 4, h: 2, category: "animals", asset: "cow.svg" },
    { id: "horse",      fr: "Cheval",      en: "a horse",      price: 300, level: 35, w: 4, h: 2, category: "animals", asset: "horse.svg" },
    { id: "tractor",    fr: "Tracteur",    en: "a tractor",    price: 400, level: 35, w: 4, h: 2, turns: true, category: "farm", asset: "tractor.svg" },
    { id: "silo",       fr: "Silo",        en: "a silo",       price: 380, level: 35, w: 4, h: 4, category: "farm", asset: "silo.svg" },
    { id: "barn",       fr: "Grange",      en: "a barn",       price: 520, level: 35, w: 6, h: 4, turns: true, category: "farm", asset: "barn.svg" },
    { id: "windmill",   fr: "Moulin",      en: "a windmill",   price: 600, level: 35, w: 4, h: 6, category: "farm", asset: "windmill.svg" },

    /* ---------- level 40: the town ---------- */
    { id: "pavement",    fr: "Trottoir",       en: "a pavement",      price: 25,  level: 40, w: 2, h: 2, layer: "ground", category: "ground", asset: "pavement.svg" },
    { id: "road",        fr: "Route",          en: "a road",          price: 30,  level: 40, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "road.svg" },
    { id: "road_line",   fr: "Route à bandes", en: "a road with lines", price: 30, level: 40, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "road-line.svg" },
    { id: "crossing",    fr: "Passage piéton", en: "a zebra crossing", price: 35, level: 40, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "crossing.svg" },
    { id: "bollard",     fr: "Borne",          en: "a bollard",       price: 40,  level: 40, w: 2, h: 2, category: "city", asset: "bollard.svg" },
    { id: "bin",         fr: "Poubelle",       en: "a litter bin",    price: 60,  level: 40, w: 2, h: 2, category: "city", asset: "bin.svg" },
    { id: "hydrant",     fr: "Bouche d'incendie", en: "a fire hydrant", price: 70, level: 40, w: 2, h: 2, category: "city", asset: "hydrant.svg" },
    { id: "street_sign", fr: "Panneau de rue", en: "a street sign",   price: 80,  level: 40, w: 2, h: 2, turns: true, category: "city", asset: "street-sign.svg" },
    { id: "traffic_light", fr: "Feu tricolore", en: "traffic lights", price: 100, level: 40, w: 2, h: 2, turns: true, category: "city", asset: "traffic-light.svg" },
    { id: "bus_stop",    fr: "Arrêt de bus",   en: "a bus stop",      price: 180, level: 40, w: 4, h: 2, turns: true, category: "city", asset: "bus-stop.svg" },

    /* ---------- level 45: the playground ---------- */
    { id: "hopscotch",      fr: "Marelle",     en: "hopscotch",        price: 40,  level: 45, w: 2, h: 4, layer: "ground", turns: true, category: "ground", asset: "hopscotch.svg" },
    { id: "ball",           fr: "Ballon",      en: "a ball",           price: 30,  level: 45, w: 2, h: 2, category: "play", asset: "ball.svg" },
    { id: "kite",           fr: "Cerf-volant", en: "a kite",           price: 60,  level: 45, w: 2, h: 2, category: "play", asset: "kite.svg" },
    { id: "rocking_horse",  fr: "Cheval à bascule", en: "a rocking horse", price: 120, level: 45, w: 2, h: 2, turns: true, category: "play", asset: "rocking-horse.svg" },
    { id: "sandpit",        fr: "Bac à sable", en: "a sandpit",        price: 150, level: 45, w: 4, h: 4, category: "play", asset: "sandpit.svg" },
    { id: "seesaw",         fr: "Bascule",     en: "a seesaw",         price: 200, level: 45, w: 4, h: 2, turns: true, category: "play", asset: "seesaw.svg" },
    { id: "swing",          fr: "Balançoire",  en: "a swing",          price: 250, level: 45, w: 4, h: 4, turns: true, category: "play", asset: "swing.svg" },
    { id: "slide",          fr: "Toboggan",    en: "a slide",          price: 300, level: 45, w: 4, h: 4, turns: true, category: "play", asset: "slide.svg" },
    { id: "trampoline",     fr: "Trampoline",  en: "a trampoline",     price: 350, level: 45, w: 4, h: 4, category: "play", asset: "trampoline.svg" },
    { id: "climbing_frame", fr: "Cage à poules", en: "a climbing frame", price: 400, level: 45, w: 6, h: 4, turns: true, category: "play", asset: "climbing-frame.svg" },

    /* ---------- level 50: the seaside ---------- */
    { id: "sand",        fr: "Sable",          en: "sand",          price: 20,  level: 50, w: 2, h: 2, layer: "ground", category: "ground", asset: "sand.svg" },
    { id: "beach_towel", fr: "Serviette",      en: "a beach towel", price: 40,  level: 50, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "beach-towel.svg" },
    { id: "sandcastle",  fr: "Château de sable", en: "a sandcastle", price: 70, level: 50, w: 2, h: 2, category: "beach", asset: "sandcastle.svg" },
    { id: "lifebuoy",    fr: "Bouée",          en: "a lifebuoy",    price: 80,  level: 50, w: 2, h: 2, category: "beach", asset: "lifebuoy.svg" },
    { id: "deckchair",   fr: "Transat",        en: "a deckchair",   price: 110, level: 50, w: 2, h: 2, turns: true, category: "beach", asset: "deckchair.svg" },
    { id: "parasol",     fr: "Parasol",        en: "a parasol",     price: 120, level: 50, w: 4, h: 4, category: "beach", asset: "parasol.svg" },
    { id: "surfboard",   fr: "Planche de surf", en: "a surfboard",  price: 140, level: 50, w: 2, h: 4, turns: true, category: "beach", asset: "surfboard.svg" },
    { id: "palm_tree",   fr: "Palmier",        en: "a palm tree",   price: 260, level: 50, w: 4, h: 4, category: "beach", asset: "palm-tree.svg" },
    { id: "beach_hut",   fr: "Cabine de plage", en: "a beach hut",  price: 300, level: 50, w: 4, h: 4, category: "beach", asset: "beach-hut.svg" },
    { id: "rowing_boat", fr: "Barque",         en: "a rowing boat", price: 320, level: 50, w: 6, h: 2, turns: true, category: "beach", asset: "rowing-boat.svg" },

    /* ---------- level 55: water ---------- */
    { id: "pool",  fr: "Piscine", en: "a swimming pool", price: 25, level: 55, w: 1, h: 1, layer: "ground", category: "ground", asset: "pool.svg", card: "pool-card.svg",
      joins: { group: "pool", edge: "pool-edge.svg", corner: "pool-corner.svg", inner: "pool-inner.svg" } },
    { id: "jetty",        fr: "Ponton",     en: "a jetty",        price: 35,  level: 55, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "jetty.svg" },
    { id: "waterlily",    fr: "Nénuphar",   en: "a water lily",   price: 50,  level: 55, w: 2, h: 2, category: "nature", asset: "waterlily.svg" },
    { id: "pool_ladder",  fr: "Échelle de piscine", en: "a pool ladder", price: 90, level: 55, w: 2, h: 2, turns: true, category: "garden", asset: "pool-ladder.svg" },
    { id: "diving_board", fr: "Plongeoir",  en: "a diving board", price: 180, level: 55, w: 4, h: 2, turns: true, category: "garden", asset: "diving-board.svg" },
    { id: "swan",         fr: "Cygne",      en: "a swan",         price: 200, level: 55, w: 2, h: 2, category: "animals", asset: "swan.svg" },
    { id: "pond",         fr: "Mare",       en: "a pond",         price: 260, level: 55, w: 4, h: 4, category: "nature", asset: "pond.svg" },
    { id: "fountain",     fr: "Fontaine",   en: "a fountain",     price: 400, level: 55, w: 4, h: 4, category: "garden", asset: "fountain.svg" },
    { id: "jacuzzi",      fr: "Jacuzzi",    en: "a hot tub",      price: 450, level: 55, w: 4, h: 4, category: "garden", asset: "jacuzzi.svg" },
    { id: "water_slide",  fr: "Toboggan aquatique", en: "a water slide", price: 500, level: 55, w: 4, h: 6, turns: true, category: "garden", asset: "water-slide.svg" },

    /* ---------- level 60: sport ---------- */
    { id: "running_track", fr: "Piste",       en: "a running track", price: 30,  level: 60, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "running-track.svg" },
    { id: "weights",       fr: "Haltères",    en: "weights",         price: 120, level: 60, w: 2, h: 2, where: "both", category: "play", asset: "weights.svg" },
    { id: "scooter",       fr: "Trottinette", en: "a scooter",       price: 140, level: 60, w: 2, h: 2, turns: true, category: "play", asset: "scooter.svg" },
    { id: "archery",       fr: "Cible",       en: "an archery target", price: 150, level: 60, w: 2, h: 2, category: "play", asset: "archery.svg" },
    { id: "bicycle",       fr: "Vélo",        en: "a bicycle",       price: 180, level: 60, w: 4, h: 2, turns: true, category: "play", asset: "bicycle.svg" },
    { id: "tennis_net",    fr: "Filet de tennis", en: "a tennis net", price: 200, level: 60, w: 4, h: 2, turns: true, category: "play", asset: "tennis-net.svg" },
    { id: "goal",          fr: "But",         en: "a goal",          price: 220, level: 60, w: 4, h: 2, turns: true, category: "play", asset: "goal.svg" },
    { id: "basketball",    fr: "Panier de basket", en: "a basketball hoop", price: 240, level: 60, w: 2, h: 2, turns: true, category: "play", asset: "basketball.svg" },
    { id: "table_tennis",  fr: "Ping-pong",   en: "a table tennis table", price: 260, level: 60, w: 4, h: 4, turns: true, where: "both", category: "play", asset: "table-tennis.svg" },
    { id: "skate_ramp",    fr: "Rampe de skate", en: "a skate ramp", price: 380, level: 60, w: 6, h: 4, turns: true, category: "play", asset: "skate-ramp.svg" },

    /* ---------- level 65: the bathroom and the kitchen ---------- */
    { id: "bath_mat",        fr: "Tapis de bain", en: "a bath mat",      price: 60,  level: 65, w: 2, h: 2, layer: "ground", where: "in", category: "ground", asset: "bath-mat.svg" },
    { id: "laundry",         fr: "Panier à linge", en: "a laundry basket", price: 70, level: 65, w: 2, h: 2, where: "in", category: "furniture", asset: "laundry.svg" },
    { id: "towel_rail",      fr: "Porte-serviettes", en: "a towel rail", price: 90, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "towel-rail.svg" },
    { id: "microwave",       fr: "Micro-ondes",  en: "a microwave",     price: 150, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "microwave.svg" },
    { id: "washbasin",       fr: "Lavabo",       en: "a washbasin",     price: 160, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "washbasin.svg" },
    { id: "toilet",          fr: "Toilettes",    en: "a toilet",        price: 180, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "toilet.svg" },
    { id: "dishwasher",      fr: "Lave-vaisselle", en: "a dishwasher",  price: 230, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "dishwasher.svg" },
    { id: "washing_machine", fr: "Machine à laver", en: "a washing machine", price: 240, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "washing-machine.svg" },
    { id: "shower",          fr: "Douche",       en: "a shower",        price: 260, level: 65, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "shower.svg" },
    { id: "bath",            fr: "Baignoire",    en: "a bath",          price: 280, level: 65, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "bath.svg" },

    /* ---------- level 70: the grand living room ---------- */
    { id: "marble_floor", fr: "Marbre",        en: "a marble floor",  price: 40,  level: 70, w: 2, h: 2, layer: "ground", where: "in", category: "ground", asset: "marble-floor.svg" },
    { id: "coffee_table", fr: "Table basse",   en: "a coffee table",  price: 180, level: 70, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "coffee-table.svg" },
    { id: "armchair",     fr: "Fauteuil",      en: "an armchair",     price: 240, level: 70, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "armchair.svg" },
    { id: "desk",         fr: "Bureau",        en: "a desk",          price: 260, level: 70, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "desk.svg" },
    { id: "computer",     fr: "Ordinateur",    en: "a computer",      price: 280, level: 70, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "computer.svg" },
    { id: "clock",        fr: "Horloge",       en: "a clock",         price: 300, level: 70, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "clock.svg" },
    { id: "fireplace",    fr: "Cheminée",      en: "a fireplace",     price: 320, level: 70, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "fireplace.svg" },
    { id: "bunk_bed",     fr: "Lits superposés", en: "bunk beds",     price: 340, level: 70, w: 4, h: 4, turns: true, where: "in", category: "furniture", asset: "bunk-bed.svg" },
    { id: "aquarium",     fr: "Aquarium",      en: "an aquarium",     price: 400, level: 70, w: 4, h: 2, turns: true, where: "in", category: "furniture", asset: "aquarium.svg" },
    { id: "piano",        fr: "Piano",         en: "a piano",         price: 600, level: 70, w: 4, h: 4, turns: true, where: "in", category: "furniture", asset: "piano.svg" },

    /* ---------- level 75: the wild ---------- */
    { id: "stream",       fr: "Ruisseau",   en: "a stream",       price: 40,  level: 75, w: 2, h: 2, layer: "ground", turns: true, category: "ground", asset: "stream.svg" },
    { id: "wild_flowers", fr: "Fleurs sauvages", en: "wild flowers", price: 45, level: 75, w: 2, h: 2, category: "nature", asset: "wild-flowers.svg" },
    { id: "fern",         fr: "Fougère",    en: "a fern",         price: 50,  level: 75, w: 2, h: 2, category: "nature", asset: "fern.svg" },
    { id: "rock",         fr: "Rocher",     en: "a rock",         price: 60,  level: 75, w: 2, h: 2, category: "nature", asset: "rock.svg" },
    { id: "fallen_log",   fr: "Tronc couché", en: "a fallen log", price: 90,  level: 75, w: 4, h: 2, turns: true, category: "nature", asset: "fallen-log.svg" },
    { id: "boulder",      fr: "Gros rocher", en: "a boulder",     price: 120, level: 75, w: 4, h: 4, category: "nature", asset: "boulder.svg" },
    { id: "hedgehog",     fr: "Hérisson",   en: "a hedgehog",     price: 150, level: 75, w: 2, h: 2, category: "animals", asset: "hedgehog.svg" },
    { id: "owl",          fr: "Chouette",   en: "an owl",         price: 200, level: 75, w: 2, h: 2, category: "animals", asset: "owl.svg" },
    { id: "fox",          fr: "Renard",     en: "a fox",          price: 300, level: 75, w: 4, h: 2, category: "animals", asset: "fox.svg" },
    { id: "deer",         fr: "Cerf",       en: "a deer",         price: 350, level: 75, w: 4, h: 4, category: "animals", asset: "deer.svg" },

    /* ---------- level 80: the party ---------- */
    { id: "picnic_blanket", fr: "Nappe",     en: "a picnic blanket", price: 60,  level: 80, w: 4, h: 4, layer: "ground", category: "ground", asset: "picnic-blanket.svg" },
    { id: "bunting",        fr: "Guirlande", en: "bunting",          price: 60,  level: 80, w: 4, h: 2, turns: true, where: "both", category: "garden", asset: "bunting.svg" },
    { id: "balloons",       fr: "Ballons",   en: "balloons",         price: 70,  level: 80, w: 2, h: 2, where: "both", category: "garden", asset: "balloons.svg" },
    { id: "lantern",        fr: "Lanterne",  en: "a lantern",        price: 80,  level: 80, w: 2, h: 2, where: "both", category: "garden", asset: "lantern.svg" },
    { id: "fairy_lights",   fr: "Guirlande lumineuse", en: "fairy lights", price: 90, level: 80, w: 4, h: 2, turns: true, where: "both", category: "garden", asset: "fairy-lights.svg" },
    { id: "cake_stand",     fr: "Gâteau",    en: "a cake stand",     price: 150, level: 80, w: 2, h: 2, where: "both", category: "garden", asset: "cake-stand.svg" },
    { id: "speaker",        fr: "Enceinte",  en: "a speaker",        price: 200, level: 80, w: 2, h: 2, turns: true, where: "both", category: "garden", asset: "speaker.svg" },
    { id: "fireworks",      fr: "Feu d'artifice", en: "fireworks",   price: 250, level: 80, w: 2, h: 2, category: "garden", asset: "fireworks.svg" },
    { id: "ice_cream_cart", fr: "Marchand de glaces", en: "an ice cream cart", price: 350, level: 80, w: 4, h: 4, turns: true, category: "city", asset: "ice-cream-cart.svg" },
    { id: "stage",          fr: "Scène",     en: "a stage",          price: 400, level: 80, w: 6, h: 4, turns: true, category: "city", asset: "stage.svg" },

    /* ---------- level 85: animals from far away ---------- */
    { id: "snake",    fr: "Serpent",  en: "a snake",    price: 200, level: 85, w: 2, h: 2, category: "animals", asset: "snake.svg" },
    { id: "tortoise", fr: "Tortue",   en: "a tortoise", price: 250, level: 85, w: 2, h: 2, category: "animals", asset: "tortoise.svg" },
    { id: "parrot",   fr: "Perroquet", en: "a parrot",  price: 300, level: 85, w: 2, h: 2, where: "both", category: "animals", asset: "parrot.svg" },
    { id: "toucan",   fr: "Toucan",   en: "a toucan",   price: 320, level: 85, w: 2, h: 2, category: "animals", asset: "toucan.svg" },
    { id: "penguin",  fr: "Manchot",  en: "a penguin",  price: 350, level: 85, w: 2, h: 2, category: "animals", asset: "penguin.svg" },
    { id: "monkey",   fr: "Singe",    en: "a monkey",   price: 400, level: 85, w: 2, h: 2, category: "animals", asset: "monkey.svg" },
    { id: "flamingo", fr: "Flamant rose", en: "a flamingo", price: 400, level: 85, w: 2, h: 4, category: "animals", asset: "flamingo.svg" },
    { id: "peacock",  fr: "Paon",     en: "a peacock",  price: 450, level: 85, w: 4, h: 4, category: "animals", asset: "peacock.svg" },
    { id: "llama",    fr: "Lama",     en: "a llama",    price: 500, level: 85, w: 4, h: 2, category: "animals", asset: "llama.svg" },
    { id: "aviary",   fr: "Volière",  en: "an aviary",  price: 600, level: 85, w: 4, h: 4, category: "buildings", asset: "aviary.svg" },

    /* ---------- level 90: winter ---------- */
    { id: "snow",           fr: "Neige",        en: "snow",             price: 25,  level: 90, w: 2, h: 2, layer: "ground", category: "ground", asset: "snow.svg" },
    { id: "ice_rink",       fr: "Patinoire",    en: "an ice rink",      price: 40,  level: 90, w: 2, h: 2, layer: "ground", category: "ground", asset: "ice-rink.svg" },
    { id: "skis",           fr: "Skis",         en: "skis",             price: 120, level: 90, w: 2, h: 2, turns: true, where: "both", category: "play", asset: "skis.svg" },
    { id: "snowman",        fr: "Bonhomme de neige", en: "a snowman",   price: 150, level: 90, w: 2, h: 2, category: "nature", asset: "snowman.svg" },
    { id: "sledge",         fr: "Luge",         en: "a sledge",         price: 180, level: 90, w: 4, h: 2, turns: true, category: "play", asset: "sledge.svg" },
    { id: "snowy_fir",      fr: "Sapin enneigé", en: "a snowy fir",     price: 250, level: 90, w: 4, h: 4, category: "nature", asset: "snowy-fir.svg" },
    { id: "wood_stove",     fr: "Poêle à bois", en: "a wood stove",     price: 280, level: 90, w: 2, h: 2, turns: true, where: "in", category: "furniture", asset: "wood-stove.svg" },
    { id: "christmas_tree", fr: "Sapin de Noël", en: "a Christmas tree", price: 400, level: 90, w: 4, h: 4, where: "both", category: "nature", asset: "christmas-tree.svg" },
    { id: "reindeer",       fr: "Renne",        en: "a reindeer",       price: 450, level: 90, w: 4, h: 4, category: "animals", asset: "reindeer.svg" },
    { id: "igloo",          fr: "Igloo",        en: "an igloo",         price: 500, level: 90, w: 4, h: 4, category: "buildings", asset: "igloo.svg" },

    /* ---------- level 95: monuments ---------- */
    { id: "flagpole",     fr: "Mât",          en: "a flagpole",     price: 200, level: 95, w: 2, h: 2, category: "buildings", asset: "flagpole.svg" },
    { id: "sundial",      fr: "Cadran solaire", en: "a sundial",    price: 250, level: 95, w: 2, h: 2, category: "buildings", asset: "sundial.svg" },
    { id: "topiary_arch", fr: "Arche de buis", en: "a topiary arch", price: 350, level: 95, w: 4, h: 4, turns: true, category: "garden", asset: "topiary-arch.svg" },
    { id: "bridge",       fr: "Pont",         en: "a bridge",       price: 400, level: 95, w: 6, h: 4, turns: true, category: "buildings", asset: "bridge.svg" },
    { id: "obelisk",      fr: "Obélisque",    en: "an obelisk",     price: 450, level: 95, w: 2, h: 4, category: "buildings", asset: "obelisk.svg" },
    { id: "statue",       fr: "Statue",       en: "a statue",       price: 500, level: 95, w: 2, h: 4, category: "buildings", asset: "statue.svg" },
    { id: "stone_circle", fr: "Cercle de pierres", en: "a stone circle", price: 550, level: 95, w: 6, h: 4, category: "buildings", asset: "stone-circle.svg" },
    { id: "greenhouse",   fr: "Serre",        en: "a greenhouse",   price: 600, level: 95, w: 6, h: 4, turns: true, category: "buildings", asset: "greenhouse.svg" },
    { id: "gazebo",       fr: "Kiosque",      en: "a gazebo",       price: 700, level: 95, w: 6, h: 6, category: "buildings", asset: "gazebo.svg" },
    { id: "clock_tower",  fr: "Beffroi",      en: "a clock tower",  price: 800, level: 95, w: 4, h: 6, category: "buildings", asset: "clock-tower.svg" },

    /* ---------- level 100: the wonders ---------- */
    { id: "dragon_statue", fr: "Dragon de pierre", en: "a stone dragon", price: 900,  level: 100, w: 4, h: 4, turns: true, category: "buildings", asset: "dragon-statue.svg" },
    { id: "hot_air_balloon", fr: "Montgolfière", en: "a hot air balloon", price: 1000, level: 100, w: 4, h: 6, category: "buildings", asset: "hot-air-balloon.svg" },
    { id: "treehouse",     fr: "Cabane perchée", en: "a treehouse",  price: 1100, level: 100, w: 6, h: 6, category: "buildings", asset: "treehouse.svg" },
    { id: "lighthouse",    fr: "Phare",        en: "a lighthouse",   price: 1200, level: 100, w: 4, h: 8, category: "buildings", asset: "lighthouse.svg" },
    { id: "pirate_ship",   fr: "Bateau pirate", en: "a pirate ship", price: 1300, level: 100, w: 8, h: 4, turns: true, category: "beach", asset: "pirate-ship.svg" },
    { id: "castle_tower",  fr: "Tour de château", en: "a castle tower", price: 1400, level: 100, w: 4, h: 6, category: "buildings", asset: "castle-tower.svg" },
    { id: "carousel",      fr: "Manège",       en: "a carousel",     price: 1500, level: 100, w: 6, h: 6, category: "play", asset: "carousel.svg" },
    { id: "rocket",        fr: "Fusée",        en: "a rocket",       price: 1600, level: 100, w: 4, h: 8, category: "buildings", asset: "rocket.svg" },
    { id: "observatory",   fr: "Observatoire", en: "an observatory", price: 1800, level: 100, w: 6, h: 6, category: "buildings", asset: "observatory.svg" },
    { id: "ferris_wheel",  fr: "Grande roue",  en: "a big wheel",    price: 2000, level: 100, w: 8, h: 8, category: "play", asset: "ferris-wheel.svg" }
  ];

  const FOLDER = "assets/items/";
  const LAST_LEVEL = 100;

  const BY_ID = {};
  ITEMS.forEach(item => { BY_ID[item.id] = item; });

  return {
    CATEGORIES,
    ITEMS,
    LAST_LEVEL,
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
    assetUrl(id) {
      const item = BY_ID[id];
      return item ? FOLDER + item.asset : "";
    },
    // What to show when the object is named rather than put down.
    cardUrl(id) {
      const item = BY_ID[id];
      return item ? FOLDER + (item.card || item.asset) : "";
    },
    pieceUrl(file) { return FOLDER + file; }
  };
})();
