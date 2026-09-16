#!/usr/bin/env node
/* =====================================================================
   RECOLOUR — writes one drawing per colour.

   The app never repaints anything while it runs: an object in blue is a
   file of its own, assets/items/bed-blue.svg, sitting beside the plain
   assets/items/bed.svg. This tool is what writes those files, from the
   PAINT table in js/catalog.js:

       node tools/recolour.js          write every missing file
       node tools/recolour.js --force  write them all again
       node tools/recolour.js --check  say what is missing, write nothing

   How a colour is carried over: the fills named in `tint` are read as
   hue, saturation and lightness, and the first of them is taken as the
   main one. Every fill is then moved by the same amount as the main one
   has to move to become the wanted colour — so a shadow stays as much
   darker than the body as it was, and a highlight as much lighter. The
   drawing keeps its shape and its shading, and only changes colour.
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const HERE = path.join(__dirname, "..");
const ITEMS = path.join(HERE, "assets", "items");

/* ---------- reading the catalogue without a browser ---------- */
function catalogue() {
  const src = fs.readFileSync(path.join(HERE, "js", "catalog.js"), "utf8");
  // The file declares `const CATALOG`, which an eval keeps to itself:
  // it has to be handed out before the block ends.
  (0, eval)(src + "; globalThis.__catalog = CATALOG;");
  return globalThis.__catalog;
}

/* ---------- colours ---------- */
function toRgb(hex) {
  let text = hex.replace("#", "");
  if (text.length === 3) text = text.split("").map(one => one + one).join("");
  return [
    parseInt(text.slice(0, 2), 16),
    parseInt(text.slice(2, 4), 16),
    parseInt(text.slice(4, 6), 16)
  ];
}

function toHsl(hex) {
  const [r, g, b] = toRgb(hex).map(one => one / 255);
  const top = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const l = (top + low) / 2;
  if (top === low) return { h: 0, s: 0, l };
  const span = top - low;
  const s = l > 0.5 ? span / (2 - top - low) : span / (top + low);
  let h;
  if (top === r) h = (g - b) / span + (g < b ? 6 : 0);
  else if (top === g) h = (b - r) / span + 2;
  else h = (r - g) / span + 4;
  return { h: h * 60, s, l };
}

function toHex(hsl) {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = Math.min(1, Math.max(0, hsl.s));
  const l = Math.min(1, Math.max(0, hsl.l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sixth = Math.floor(h / 60) % 6;
  const table = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  return "#" + table[sixth]
    .map(one => Math.round((one + m) * 255).toString(16).padStart(2, "0"))
    .join("");
}

// The main fill has to travel from what it is to what it should be.
// Every other fill of the group makes the same journey.
function shift(from, to) {
  const here = toHsl(from);
  const there = toHsl(to);
  return {
    h: there.h - here.h,
    s: there.s - here.s,
    l: there.l - here.l
  };
}

function moved(hex, by) {
  const here = toHsl(hex);
  return toHex({
    h: here.h + by.h,
    s: Math.min(1, Math.max(0.05, here.s + by.s)),
    l: Math.min(0.97, Math.max(0.04, here.l + by.l))
  });
}

/* ---------- writing the files ---------- */
function repainted(file, colour) {
  return file.replace(/\.svg$/, "-" + colour + ".svg");
}

/* Every fill of the group is swapped in one pass, so a colour that
   lands on another one of the group is not swapped twice. The guard at
   the end keeps a six-figure fill from matching the front of a longer
   one. */
function repaint(src, tint, by) {
  const pattern = new RegExp("(" + tint.join("|") + ")(?![0-9a-fA-F])", "gi");
  return src.replace(pattern, found => moved(found.toLowerCase(), by));
}

function run() {
  const CATALOG = catalogue();
  const force = process.argv.includes("--force");
  const check = process.argv.includes("--check");
  const wrong = [];
  let written = 0;
  let kept = 0;

  Object.keys(CATALOG.PAINT).forEach(id => {
    const item = CATALOG.item(id);
    const paint = CATALOG.PAINT[id];
    if (!item) { wrong.push(id + ": no such object in the catalogue"); return; }

    const files = [item.asset];
    if (item.card) files.push(item.card);

    paint.colours.forEach(colour => {
      if (!CATALOG.COLOURS[colour]) {
        wrong.push(id + ": there is no " + colour + " in the paint pots");
      }
    });

    files.forEach(file => {
      const from = path.join(ITEMS, file);
      if (!fs.existsSync(from)) { wrong.push(id + ": " + file + " is missing"); return; }
      const src = fs.readFileSync(from, "utf8");

      paint.tint.forEach(hex => {
        if (src.toLowerCase().indexOf(hex.toLowerCase()) < 0) {
          wrong.push(id + ": " + file + " has no " + hex + " to paint over");
        }
      });

      paint.colours.slice(1).forEach(colour => {
        const pot = CATALOG.COLOURS[colour];
        if (!pot) return;   // already told above
        const to = path.join(ITEMS, repainted(file, colour));
        if (!force && fs.existsSync(to)) { kept++; return; }
        if (check) { wrong.push("missing: " + path.basename(to)); return; }
        // The first colour is the drawing itself: nothing to write.
        fs.writeFileSync(to, repaint(src, paint.tint, shift(paint.tint[0], pot.hex)));
        written++;
      });
    });
  });

  if (wrong.length) {
    console.error(wrong.join("\n"));
    process.exit(1);
  }
  console.log(written + " written, " + kept + " already there");
}

run();
