#!/usr/bin/env node
/* =====================================================================
   RUN — serves the repository and walks every suite beside this file.

       npm test              all of them, in order
       npm test -- 12 31     only those two
       npm test -- 30-36     a stretch of them
       npm test -- 12 --show what suite 12 found, passing or not

   Each suite is a plain script: it opens pages, prints what it found,
   and says "no errors" at the end (or "BROKEN" with what broke). There
   is no assertion library on purpose — a printed line is something one
   can read a year later and still understand. A suite counts as failed
   when it exits badly, prints BROKEN, or leaves a page error behind.

   Suites are numbered in the order they were written, one or two per
   feature as it landed, so the low numbers are the oldest ground and
   the high ones the newest.
   ===================================================================== */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SHOTS = join(HERE, "shots");
const PORT = Number(process.env.PORT || 8123);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

/* A static server, no more: the module is a set of files opened with
   plain <script> tags, and that is all it ever needs. */
function serve() {
  const server = createServer(async (req, res) => {
    const asked = decodeURIComponent(req.url.split("?")[0]);
    // Nothing above the repository is ever served.
    const path = join(ROOT, asked.replace(/\.\./g, ""));
    try {
      const body = await readFile(path.endsWith("/") ? join(path, "index.html") : path);
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
    }
  });
  return new Promise(ready => server.listen(PORT, () => ready(server)));
}

// "12", "30-36", or nothing at all for every one of them.
function wanted(args) {
  args = args.filter(one => one !== "--show");
  if (!args.length) return null;
  const numbers = new Set();
  args.forEach(one => {
    const stretch = one.match(/^(\d+)-(\d+)$/);
    if (stretch) {
      for (let n = Number(stretch[1]); n <= Number(stretch[2]); n++) numbers.add(n);
    } else if (/^\d+$/.test(one)) {
      numbers.add(Number(one));
    }
  });
  return numbers;
}

function numberOf(file) {
  const found = file.match(/^test(\d*)\.mjs$/);
  return found ? Number(found[1] || 1) : null;
}

function run(file, env) {
  return new Promise(done => {
    const child = spawn(process.execPath, [join(HERE, file)], {
      cwd: HERE, env: { ...process.env, ...env }
    });
    let out = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { out += chunk; });
    child.on("close", code => done({ code, out }));
  });
}

const show = process.argv.includes("--show");
const picked = wanted(process.argv.slice(2));
const files = (await readdir(HERE))
  .filter(name => numberOf(name) !== null)
  .filter(name => !picked || picked.has(numberOf(name)))
  .sort((a, b) => numberOf(a) - numberOf(b));

if (!files.length) {
  console.error("no suite matches " + process.argv.slice(2).join(" "));
  process.exit(1);
}

await mkdir(SHOTS, { recursive: true });
const server = await serve();
const env = { SITE: "http://localhost:" + PORT, SHOTS: SHOTS + "/" };

const broken = [];
for (const file of files) {
  const { code, out } = await run(file, env);
  const failed = code !== 0 || /BROKEN|PAGEERROR/.test(out);
  console.log((failed ? "FAIL  " : "ok    ") + file);
  if (failed) broken.push(file);
  if (failed || show) {
    console.log(out.trimEnd().split("\n").map(line => "      " + line).join("\n"));
  }
}

server.close();
console.log("\n" + (files.length - broken.length) + " of " + files.length + " suites passed" +
  (broken.length ? ": " + broken.join(" ") + " failed" : ""));
process.exit(broken.length ? 1 : 0);
