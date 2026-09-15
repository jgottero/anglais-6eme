/* =====================================================================
   RANKS — how points earned in the exercises turn into a rank.

   This is all that is left of the old farm.js: the ladder itself. What a
   rank is worth is no longer this file's business — a rank is a level of
   the reward module (reward/), which pays it in coins and opens its shop
   a little wider every five levels.

   index.html only calls RANKS.of(points); the rest is here so the ladder
   can be retuned without touching the app.
   ===================================================================== */
const RANKS = (function () {

  /* A hundred ranks over a school year. The first ones fall within half a
     session so the habit gets rewarded straight away, the last ones take
     three or four sessions so the climb keeps its value. Steps grow
     linearly from FIRST_STEP to LAST_STEP, which totals about 11000
     points: a full year of regular work. */
  const COUNT = 100;
  const FIRST_STEP = 25;
  const LAST_STEP = 200;

  const THRESHOLDS = (function () {
    const list = [0];
    for (let rank = 2; rank <= COUNT; rank++) {
      const step = FIRST_STEP + (LAST_STEP - FIRST_STEP) * (rank - 2) / (COUNT - 2);
      list.push(Math.round(list[list.length - 1] + step));
    }
    return list;
  })();

  // One title per ten ranks.
  const TIERS = [
    "Seedling", "Sprout", "Grower", "Farmhand", "Harvester",
    "Rancher", "Homesteader", "Orchardist", "Master Farmer", "Valley Legend"
  ];

  /* Where a total of points stands: the rank reached, how far into it,
     and what is left before the next one. */
  function of(points) {
    let index = 1;
    while (index < COUNT && points >= THRESHOLDS[index]) index++;
    const floor = THRESHOLDS[index - 1];
    const next = index < COUNT ? THRESHOLDS[index] : null;
    return {
      index,
      name: TIERS[Math.min(TIERS.length - 1, Math.floor((index - 1) / 10))],
      next,
      ratio: next ? (points - floor) / (next - floor) : 1,
      toGo: next ? next - points : 0,
      last: index >= COUNT
    };
  }

  return { COUNT, THRESHOLDS, TIERS, of };
})();
