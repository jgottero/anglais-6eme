/* =====================================================================
   SHARE — a whole property written into a link.

   The child shows their world to someone by sending them an address.
   Everything the other end needs travels in the part after the "#",
   which no server ever sees: nothing is uploaded, nothing is stored
   anywhere, and the link works for as long as the page it points at
   does.

   What travels: the plots bought and every object standing on them,
   with its tile, its quarter turn, its flip and its colour. What does
   not: the purse, the ranks, the days of practice. A world is shown,
   not handed over — the level comes along only so the visitor can be
   told how far its owner has got.

   ---- The shape of it ----

   The link carries its own dictionary. The names it uses — the plots,
   the scenes, the objects — are spelled out once at the head, and the
   body points at them by position. So a link keeps its meaning however
   the catalogue is rearranged afterwards, and asks only what the save
   file already asks: that an id, once used, is never renamed.

     byte 0        the shape of what follows, in case it changes
     byte 1        1 if the rest is gzipped, 0 if it is plain
     then, once unpacked:
       byte 0      the level its owner had reached
       bytes 1-2   how long the dictionary is
       the dictionary, as text: plots | scenes | objects, comma between
       then, for each scene that holds anything:
         byte      which scene, by its place in the dictionary
         bytes     how many objects, over two bytes
         then four bytes an object:
           which object, by its place in the dictionary
           its column, its row
           and one byte holding the turn, the flip and the colour

   Four bytes an object, and the same object named once however many
   times it stands: a property of three hundred things comes to about
   1300 characters of link, which every telephone and every messaging
   app carries without complaint.
   ===================================================================== */
const Share = (function () {

  const SHAPE = 1;        // the shape of the message, should it ever change
  const MARK = "#w=";     // what an address carrying a world looks like

  /* ---- Reading and writing the bytes ---- */

  // The turn, the flip and the colour, all in one byte.
  function poseOf(entry, item) {
    const colours = CATALOG.paintsOf(item);
    const worn = colours && entry.c ? colours.indexOf(entry.c) : 0;
    return (((entry.r || 0) & 3) << 6) |
           ((entry.m ? 1 : 0) << 5) |
           (Math.max(0, worn) & 31);
  }

  function poseBack(byte, item) {
    const colours = CATALOG.paintsOf(item);
    const worn = colours ? colours[byte & 31] : null;
    const back = {};
    const turn = (byte >> 6) & 3;
    if (turn) back.r = turn;
    if ((byte >> 5) & 1) back.m = 1;
    // The first colour is the one it is drawn in, and says nothing.
    if (worn && (byte & 31) > 0) back.c = worn;
    return back;
  }

  /* Everything worth sending, out of a save. Scenes with nothing in
     them are left out: an empty room costs nothing to rebuild. */
  function bodyOf(saved, level) {
    const scenes = Object.keys(saved.placed)
      .filter(id => Array.isArray(saved.placed[id]) && saved.placed[id].length);

    const items = [];
    scenes.forEach(id => saved.placed[id].forEach(entry => {
      if (CATALOG.item(entry.id) && items.indexOf(entry.id) === -1) items.push(entry.id);
    }));

    const words = [saved.owned.join(","), scenes.join(","), items.join(",")].join("|");
    const dictionary = new TextEncoder().encode(words);

    const out = [];
    out.push(level & 255);
    out.push((dictionary.length >> 8) & 255, dictionary.length & 255);
    dictionary.forEach(one => out.push(one));

    scenes.forEach((id, index) => {
      const list = saved.placed[id].filter(entry => CATALOG.item(entry.id));
      out.push(index & 255);
      out.push((list.length >> 8) & 255, list.length & 255);
      list.forEach(entry => {
        const item = CATALOG.item(entry.id);
        out.push(items.indexOf(entry.id) & 255,
                 entry.x & 255,
                 entry.y & 255,
                 poseOf(entry, item));
      });
    });
    return new Uint8Array(out);
  }

  function worldOf(bytes) {
    let at = 0;
    const level = bytes[at++];
    const long = (bytes[at++] << 8) | bytes[at++];
    const words = new TextDecoder().decode(bytes.subarray(at, at + long));
    at += long;

    const parts = words.split("|");
    const owned = parts[0] ? parts[0].split(",") : [];
    const scenes = parts[1] ? parts[1].split(",") : [];
    const items = parts[2] ? parts[2].split(",") : [];

    const placed = {};
    let uid = 1;
    while (at + 3 <= bytes.length) {
      const scene = scenes[bytes[at++]];
      const many = (bytes[at++] << 8) | bytes[at++];
      const list = [];
      for (let one = 0; one < many && at + 4 <= bytes.length; one++) {
        const id = items[bytes[at++]];
        const x = bytes[at++];
        const y = bytes[at++];
        const pose = bytes[at++];
        const item = CATALOG.item(id);
        // An object this version has never heard of is simply left out.
        if (item) list.push(Object.assign({ uid: uid++, id, x, y }, poseBack(pose, item)));
      }
      if (scene) placed[scene] = list;
    }
    return { level, owned, placed };
  }

  /* ---- Squeezing, where the browser knows how ---- */

  async function squeeze(bytes) {
    if (typeof CompressionStream === "undefined") return { packed: bytes, gzipped: false };
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      const packed = new Uint8Array(await new Response(stream).arrayBuffer());
      // Below a certain size the wrapping costs more than it saves.
      return packed.length < bytes.length ? { packed, gzipped: true } : { packed: bytes, gzipped: false };
    } catch (err) {
      return { packed: bytes, gzipped: false };
    }
  }

  async function loosen(bytes, gzipped) {
    if (!gzipped) return bytes;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* ---- Bytes to text and back ----
     base64, in the spelling that is safe in an address: no + and no /,
     and no = at the end to be stripped by a messaging app. */

  function toText(bytes) {
    let raw = "";
    // In slices, so a large world does not overrun the call stack.
    for (let at = 0; at < bytes.length; at += 8192) {
      raw += String.fromCharCode.apply(null, bytes.subarray(at, at + 8192));
    }
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromText(text) {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(padded + "===".slice((padded.length + 3) % 4));
    const bytes = new Uint8Array(raw.length);
    for (let at = 0; at < raw.length; at++) bytes[at] = raw.charCodeAt(at);
    return bytes;
  }

  return {
    MARK,

    /* The whole property, as the text that goes after the "#". */
    async write(saved, level) {
      const body = bodyOf(saved, Math.max(0, Math.min(255, level || 0)));
      const { packed, gzipped } = await squeeze(body);
      const all = new Uint8Array(packed.length + 2);
      all[0] = SHAPE;
      all[1] = gzipped ? 1 : 0;
      all.set(packed, 2);
      return toText(all);
    },

    /* And back again, or nothing at all if the text is not a world.
       Anything unreadable comes back as null rather than an error: a
       link mangled by a messaging app must not break the page. */
    async read(text) {
      try {
        const all = fromText(String(text || "").trim());
        if (all.length < 3 || all[0] !== SHAPE) return null;
        const body = await loosen(all.subarray(2), all[1] === 1);
        const world = worldOf(body);
        return world.owned.length ? world : null;
      } catch (err) {
        return null;
      }
    },

    // The world carried by an address, if it carries one.
    inAddress(href) {
      const at = String(href || "").indexOf(MARK);
      return at === -1 ? null : String(href).slice(at + MARK.length);
    },

    // The address to send, built from the one the page was opened at.
    address(here, text) {
      const clean = String(here || "").split("#")[0];
      return clean + MARK + text;
    }
  };
})();
