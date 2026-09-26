/* =====================================================================
   CLOUD — the family account, and a copy of every save on a server.

   The telephone stays where the work is done. Everything is still read
   from and written to localStorage, exactly as before, so the app works
   the same with no network, no account, or a server that is down. What
   this file adds is a copy of those saves on Supabase, owned by one
   family account, so that the children's work survives a lost
   telephone and follows them from one device to another.

   What travels is the saves a profile owns, and the list of profiles:

       anglais-profiles-v1            who is on the telephone
       anglais-progress-v1:<id>       the words, the points, the days
       reward-property-v1:<id>        the property and its coins

   Each is one row of the `saves` table (see supabase/schema.sql): the
   key as it is written here, the same JSON, and a revision number the
   server moves on at every write.

   ---- How the copies are kept in step ----

   A write here marks the key as changed and sends it a moment later.
   Every so often — on opening, on coming back to the app, when the
   network returns — the rows are read back. For each key:

     - the server has moved on and nothing changed here: its copy is
       taken;
     - something changed here and the server has not moved on: ours is
       sent;
     - both moved on: the rule registered for that key decides. The
       progress is merged word by word, the list of profiles person by
       person; anything else is last write wins.

   A copy is only ever sent on top of the revision it was based on. If
   another device wrote in between, the server refuses it and the rows
   are read again first, so nothing is overwritten unseen.

   The reward module writes its save from inside a frame. The frame is
   of the same origin, so each of its writes reaches this page as a
   `storage` event, and is sent from here like any other.

   ---- The account ----

   Email and password, through Supabase Auth. The session is kept on the
   telephone and renewed on its own. Signing out keeps everything that
   is on the telephone; signing back in to the same account carries on
   where it left off, and signing in to another one hands the
   telephone's profiles over to it.

   Nothing here touches the network until someone has signed in.
   ===================================================================== */
const CLOUD = (function () {

  /* The project. The publishable key is meant to be in the page: what
     keeps a family's saves to themselves is the row level security on
     the table, not the secrecy of this key. */
  const BASE = "https://sfxnlvcgqgksrbuenmxf.supabase.co";
  const PUBLIC_KEY = "sb_publishable_hCv22tRWrL8N9I739c_ALw_ftMoF4MC";
  const TABLE = "saves";

  // The telephone's own bookkeeping. It is never sent anywhere.
  const META = "anglais-cloud-v1";

  // How long a change waits before it is sent, so a round of answers
  // goes up as one write rather than fifteen.
  const SEND_AFTER = 1500;

  /* ---- The rules ----
     Which keys travel, and how two versions of one are brought
     together. `merge(local, remote, how)` gets both as parsed JSON
     (local may be null) and returns the one to keep; `how.dirty` says
     whether the local one holds changes the server has not seen. */
  const rules = [];

  function ruleFor(key) {
    return rules.find(rule => rule.test(key)) || null;
  }

  function tracked(key) {
    return !!key && !!ruleFor(key);
  }

  /* The default for a save that cannot be merged: the server's copy
     when nothing changed here, otherwise whichever was written last. */
  function newest(local, remote, how) {
    if (!how.dirty || local === null) return remote;
    return how.localAt > how.remoteAt ? local : remote;
  }

  /* ---- The bookkeeping ----
       session   the tokens, the account's id and email
       owner     the account the keys below were last in step with
       keys      per key: rev (the server revision the local copy is
                 based on), sum (a fingerprint of the server's copy),
                 dirty (changed here since) and at (when, here)
       synced    when the rows were last read back, successfully */
  let meta = readMeta();

  function blankMeta() {
    return { session: null, owner: null, keys: {}, synced: 0 };
  }

  function readMeta() {
    try {
      const saved = JSON.parse(localStorage.getItem(META) || "null");
      if (!saved || typeof saved !== "object") return blankMeta();
      return {
        session: saved.session && saved.session.access_token ? saved.session : null,
        owner: saved.owner || null,
        keys: saved.keys && typeof saved.keys === "object" ? saved.keys : {},
        synced: Number(saved.synced) || 0
      };
    } catch (err) {
      return blankMeta();
    }
  }

  function writeMeta() {
    try {
      localStorage.setItem(META, JSON.stringify(meta));
    } catch (err) {
      /* A full storage loses the bookkeeping, not the saves: the next
         sign-in starts over and merges. */
    }
  }

  function entry(key) {
    return meta.keys[key] || null;
  }

  /* Whether a key holds something the server has not seen. A key with
     no bookkeeping at all has never been in step with this account. */
  function isDirty(key, raw) {
    const known = entry(key);
    if (!known) return raw !== null;
    return !!known.dirty;
  }

  /* ---- Fingerprints ----
     The same save can come back from the server with its fields in
     another order. Comparing a canonical form tells a real change from
     a reshuffle, so nothing is sent for nothing. */
  function canonical(value) {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort()
        .filter(key => value[key] !== undefined)
        .map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    }
    return JSON.stringify(value === undefined ? null : value);
  }

  function fingerprint(value) {
    const text = canonical(value);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36) + "." + text.length;
  }

  function parse(raw) {
    if (raw === null || raw === undefined) return null;
    try { return JSON.parse(raw); } catch (err) { return null; }
  }

  /* ---- What the page is told ----
     `change` listeners hear which keys were rewritten from the server,
     and which profiles were given a new id on the way; `status`
     listeners hear whenever what the account screen shows may differ. */
  const listeners = { change: [], status: [] };
  let trouble = "";      // the last thing that went wrong, in French
  let busy = false;

  function tell(kind, what) {
    listeners[kind].forEach(fn => {
      try { fn(what); } catch (err) { console.error(err); }
    });
  }

  function status() {
    const pending = Object.keys(meta.keys).filter(key => meta.keys[key].dirty).length;
    return {
      signedIn: !!meta.session,
      email: meta.session ? meta.session.email : null,
      pending,
      synced: meta.synced,
      busy,
      trouble
    };
  }

  /* ---- Talking to Supabase ---- */

  class CloudError extends Error {
    constructor(message, code, http) {
      super(message);
      this.code = code || "";
      this.http = http || 0;
    }
  }

  // The claims inside an access token: who it is and until when.
  function claims(token) {
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(atob(part).split("").map(ch =>
        "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2)).join(""));
      return JSON.parse(json);
    } catch (err) {
      return {};
    }
  }

  function sessionFrom(tokens) {
    const said = claims(tokens.access_token);
    const user = tokens.user || {};
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Number(tokens.expires_at) ||
        (said.exp ? said.exp : Math.floor(Date.now() / 1000) + (Number(tokens.expires_in) || 3600)),
      user: user.id || said.sub,
      email: user.email || said.email || ""
    };
  }

  /* One request. `auth` sends the session's token, renewed first if it
     is about to run out, and renewed once more if the server says it
     has. Answers come back parsed; failures come back as a CloudError
     whose message can be shown as it is. */
  async function call(path, options) {
    const opts = options || {};
    const headers = Object.assign({ apikey: PUBLIC_KEY }, opts.headers || {});
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.auth) {
      await freshSession();
      headers.Authorization = "Bearer " + meta.session.access_token;
    }
    let res;
    try {
      res = await fetch(BASE + path, {
        method: opts.method || "GET",
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        keepalive: !!opts.keepalive
      });
    } catch (err) {
      throw new CloudError("Pas de réseau pour l'instant : tout reste enregistré sur ce téléphone.", "offline");
    }
    if (res.status === 401 && opts.auth && !opts.renewed) {
      await renew();
      return call(path, Object.assign({}, opts, { renewed: true }));
    }
    const text = await res.text();
    const body = parse(text);
    if (!res.ok) throw failure(res.status, body);
    return { status: res.status, body };
  }

  // What went wrong, said the way a parent would want to read it.
  function failure(http, body) {
    const said = body || {};
    const code = said.error_code || said.code || said.error || "";
    const text = String(said.msg || said.message || said.error_description || "");
    const known = {
      invalid_credentials: "Adresse ou mot de passe incorrect.",
      invalid_grant: "Adresse ou mot de passe incorrect.",
      email_not_confirmed: "L'adresse n'est pas encore confirmée : ouvre le lien reçu par email.",
      user_already_exists: "Un compte existe déjà avec cette adresse : connecte-toi.",
      email_exists: "Un compte existe déjà avec cette adresse : connecte-toi.",
      weak_password: "Mot de passe trop faible : au moins 6 caractères.",
      validation_failed: "L'adresse email n'est pas valide.",
      email_address_invalid: "L'adresse email n'est pas valide.",
      over_email_send_rate_limit: "Trop d'emails envoyés : réessaie dans quelques minutes.",
      over_request_rate_limit: "Trop de tentatives : réessaie dans quelques minutes.",
      same_password: "C'est déjà le mot de passe actuel.",
      signup_disabled: "La création de compte est désactivée sur ce projet.",
      "23505": "Déjà enregistré sur le serveur."
    };
    if (known[code]) return new CloudError(known[code], code, http);
    if (/invalid login/i.test(text)) return new CloudError(known.invalid_credentials, "invalid_credentials", http);
    if (/not confirmed/i.test(text)) return new CloudError(known.email_not_confirmed, "email_not_confirmed", http);
    if (/already registered/i.test(text)) return new CloudError(known.user_already_exists, "user_already_exists", http);
    if (/password/i.test(text) && /characters|weak|short/i.test(text)) {
      return new CloudError(known.weak_password, "weak_password", http);
    }
    if (http >= 500) return new CloudError("Le serveur ne répond pas : réessaie plus tard.", code, http);
    return new CloudError("Le serveur a refusé : " + (text || "erreur " + http) + ".", code, http);
  }

  /* ---- The session ---- */

  function keepSession(tokens) {
    const session = sessionFrom(tokens);
    // Another account than the one these keys were in step with: the
    // bookkeeping is theirs, not this one's. Start over and merge.
    if (meta.owner && meta.owner !== session.user) meta.keys = {};
    meta.owner = session.user;
    meta.session = session;
    trouble = "";
    writeMeta();
    tell("status", status());
    return session;
  }

  let renewing = null;

  function renew() {
    if (!renewing) {
      renewing = (async () => {
        const session = meta.session;
        if (!session) throw new CloudError("Connecte-toi pour sauvegarder en ligne.", "signed_out");
        let res;
        try {
          res = await fetch(BASE + "/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            headers: { apikey: PUBLIC_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: session.refresh_token })
          });
        } catch (err) {
          throw new CloudError("Pas de réseau pour l'instant : tout reste enregistré sur ce téléphone.", "offline");
        }
        const body = parse(await res.text());
        if (res.ok && body && body.access_token) return keepSession(body);
        if (res.status >= 400 && res.status < 500) {
          // The session is over for good. What is on the telephone stays.
          meta.session = null;
          writeMeta();
          throw new CloudError("La connexion a expiré : reconnecte-toi.", "expired", res.status);
        }
        throw failure(res.status, body);
      })().finally(() => { renewing = null; });
    }
    return renewing;
  }

  async function freshSession() {
    if (!meta.session) throw new CloudError("Connecte-toi pour sauvegarder en ligne.", "signed_out");
    if (meta.session.expires_at - 60 < Date.now() / 1000) await renew();
  }

  // Where the links in the emails lead back to: this very page.
  function here() {
    return location.origin + location.pathname;
  }

  function cleanEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  async function signIn(email, password) {
    const { body } = await call("/auth/v1/token?grant_type=password", {
      method: "POST", body: { email: cleanEmail(email), password: String(password || "") }
    });
    keepSession(body);
    await sync();
    return status();
  }

  /* Makes the account. When the project asks for the address to be
     confirmed first, no session comes back: the answer says so, and the
     link in the email brings the parent back here, signed in. */
  async function signUp(email, password) {
    const { body } = await call("/auth/v1/signup?redirect_to=" + encodeURIComponent(here()), {
      method: "POST", body: { email: cleanEmail(email), password: String(password || "") }
    });
    if (body && body.access_token) {
      keepSession(body);
      await sync();
      return { confirm: false };
    }
    return { confirm: true };
  }

  async function recover(email) {
    await call("/auth/v1/recover?redirect_to=" + encodeURIComponent(here()), {
      method: "POST", body: { email: cleanEmail(email) }
    });
  }

  async function setPassword(password) {
    await call("/auth/v1/user", { method: "PUT", auth: true, body: { password: String(password || "") } });
  }

  /* Signs out of the account. Nothing on the telephone is removed, and
     the bookkeeping is kept, so the same account picks up where it left
     off. What was not yet sent is sent first, if it can be. */
  async function signOut() {
    const session = meta.session;
    if (!session) return;
    try { await flush(); } catch (err) { /* It stays on the telephone. */ }
    meta.session = null;
    trouble = "";
    writeMeta();
    tell("status", status());
    fetch(BASE + "/auth/v1/logout?scope=local", {
      method: "POST",
      headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + session.access_token }
    }).catch(() => { /* The token runs out on its own. */ });
  }

  /* The links in the emails come back with the session in the address:
     #access_token=…&refresh_token=…&type=signup, or type=recovery for a
     forgotten password, or #error=… when the link is out of date. Read
     once on opening and wiped from the address bar. */
  function arrival() {
    const hash = location.hash.replace(/^#/, "");
    if (!/(^|&)(access_token|error)=/.test(hash)) return null;
    const said = new URLSearchParams(hash);
    try {
      history.replaceState(history.state, "", location.pathname + location.search);
    } catch (err) {
      /* The address keeps its tail; nothing else depends on it. */
    }
    if (said.get("error")) {
      return {
        type: "error",
        message: said.get("error_code") === "otp_expired"
          ? "Ce lien a expiré ou a déjà servi : demande-en un nouveau."
          : "Le lien n'a pas fonctionné : " + (said.get("error_description") || said.get("error")) + "."
      };
    }
    keepSession({
      access_token: said.get("access_token"),
      refresh_token: said.get("refresh_token"),
      expires_at: said.get("expires_at"),
      expires_in: said.get("expires_in")
    });
    return { type: said.get("type") || "signin" };
  }

  /* ---- Keeping the copies in step ---- */

  let timer = null;

  /* Called after every write of a tracked key on this page, and for the
     writes of the frame through the `storage` event. It only marks and
     schedules: the sending is done a moment later, all at once. */
  function touched(key) {
    // A telephone that has never been signed in keeps no bookkeeping.
    if (!meta.owner || !tracked(key)) return;
    const raw = localStorage.getItem(key);
    const known = entry(key);
    const value = parse(raw);
    // Written back to what the server already has: nothing to send.
    if (known && known.sum && raw !== null && fingerprint(value) === known.sum) {
      if (known.dirty) { known.dirty = false; writeMeta(); tell("status", status()); }
      return;
    }
    meta.keys[key] = Object.assign({}, known || {}, { dirty: true, at: Date.now() });
    writeMeta();
    tell("status", status());
    schedule();
  }

  function schedule() {
    if (!meta.session) return;
    clearTimeout(timer);
    timer = setTimeout(() => { flush().catch(() => { /* Said in the status. */ }); }, SEND_AFTER);
  }

  /* Moves saves from one key to another in one go, carrying their
     bookkeeping: every value is read before any is written, so two
     profiles swapping ids do not overwrite each other on the way. The
     old keys are forgotten, so the server's rows under them come back
     down; the new ones are marked to go up. */
  function moveAll(pairs) {
    const held = pairs.map(([from, to]) => ({ from, to, raw: localStorage.getItem(from), known: entry(from) }));
    held.forEach(one => {
      localStorage.removeItem(one.from);
      delete meta.keys[one.from];
    });
    held.forEach(one => {
      if (one.raw === null) return;
      localStorage.setItem(one.to, one.raw);
      // No revision: whatever the server holds there is merged first.
      meta.keys[one.to] = { dirty: true, at: (one.known && one.known.at) || 0 };
    });
    writeMeta();
  }

  // Profiles first: bringing two lists together may move the other keys.
  function order(a, b) {
    const first = key => (ruleFor(key) && ruleFor(key).first ? 0 : 1);
    return first(a.key) - first(b.key);
  }

  /* Reads every row back and brings each key into step with it, then
     sends whatever is left to send. Returns the keys rewritten here. */
  async function pull() {
    const { body } = await call("/rest/v1/" + TABLE + "?select=key,data,rev,updated_at", { auth: true });
    const rows = (Array.isArray(body) ? body : []).filter(row => tracked(row.key)).sort(order);
    const changed = [];
    const renamed = {};

    rows.forEach(row => {
      const raw = localStorage.getItem(row.key);
      const known = entry(row.key);
      const dirty = isDirty(row.key, raw);
      const remoteSum = fingerprint(row.data);
      // Already in step, or ahead of the server and waiting to be sent.
      if (known && known.rev === row.rev) return;

      const local = parse(raw);
      const rule = ruleFor(row.key);
      const kept = local === null && !dirty ? row.data : rule.merge(local, row.data, {
        dirty,
        localAt: (known && known.at) || 0,
        remoteAt: Date.parse(row.updated_at) || 0,
        renamed,
        moveAll
      });
      const keptSum = fingerprint(kept);
      if (local === null || fingerprint(local) !== keptSum) {
        localStorage.setItem(row.key, JSON.stringify(kept));
        changed.push(row.key);
      }
      meta.keys[row.key] = {
        rev: row.rev,
        sum: remoteSum,
        dirty: keptSum !== remoteSum,
        at: keptSum !== remoteSum ? Date.now() : ((known && known.at) || 0)
      };
    });

    /* What is here and not there: never sent, or given a new id on the
       way. It all goes up. */
    const there = new Set(rows.map(row => row.key));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!tracked(key) || there.has(key)) continue;
      const known = entry(key);
      meta.keys[key] = { dirty: true, at: (known && known.at) || Date.now() };
    }
    // Bookkeeping for keys that are gone from both sides is dropped.
    Object.keys(meta.keys).forEach(key => {
      if (localStorage.getItem(key) === null && !there.has(key)) delete meta.keys[key];
    });

    meta.synced = Date.now();
    writeMeta();
    if (changed.length || Object.keys(renamed).length) tell("change", { keys: changed, renamed });
    return changed;
  }

  /* Sends one key on top of the revision it was based on. Returns false
     when another device got there first: the rows have to be read
     again before this one can go. */
  async function push(key, keepalive) {
    const raw = localStorage.getItem(key);
    const known = entry(key) || {};
    if (raw === null) { delete meta.keys[key]; return true; }
    const data = parse(raw);
    if (data === null) {               // not ours to repair, nor to send
      meta.keys[key] = Object.assign({}, known, { dirty: false });
      return true;
    }
    const sum = fingerprint(data);
    let row = null;
    try {
      if (known.rev) {
        const { body } = await call("/rest/v1/" + TABLE + "?key=eq." + encodeURIComponent(key) +
          "&rev=eq." + known.rev + "&select=key,rev", {
          method: "PATCH", auth: true, keepalive,
          headers: { Prefer: "return=representation" }, body: { data }
        });
        row = Array.isArray(body) ? body[0] : null;
      } else {
        const { body } = await call("/rest/v1/" + TABLE + "?select=key,rev", {
          method: "POST", auth: true, keepalive,
          headers: { Prefer: "return=representation" },
          body: { owner: meta.session.user, key, data }
        });
        row = Array.isArray(body) ? body[0] : body;
      }
    } catch (err) {
      if (err.http === 409) return false;   // the row was made elsewhere meanwhile
      throw err;
    }
    if (!row) return false;                  // the revision moved on meanwhile
    /* It may have been written again while it was on its way: then it
       stays marked, and goes on the next round. */
    const now = parse(localStorage.getItem(key));
    meta.keys[key] = {
      rev: row.rev,
      sum,
      dirty: now !== null && fingerprint(now) !== sum,
      at: known.at || 0
    };
    writeMeta();
    return true;
  }

  // Sends everything marked, without reading back unless it must.
  async function flush(keepalive) {
    if (!meta.session) return;
    clearTimeout(timer);
    const waiting = Object.keys(meta.keys).filter(key => meta.keys[key].dirty);
    if (!waiting.length) return;
    let refused = false;
    try {
      for (const key of waiting) {
        if (!(await push(key, keepalive))) refused = true;
      }
      trouble = "";
    } catch (err) {
      // A page on its way out says nothing: it will not be read.
      if (!keepalive) { trouble = err.message; tell("status", status()); }
      throw err;
    }
    tell("status", status());
    if (refused && !keepalive) await sync();
  }

  let running = null;
  let again = false;

  /* The whole round: read back, bring together, send. Several asked at
     once make one round, and one more after it if anything was asked
     while it ran. */
  function sync() {
    if (!meta.session) return Promise.resolve([]);
    if (running) { again = true; return running; }
    busy = true;
    tell("status", status());
    running = (async () => {
      const changed = [];
      try {
        for (let round = 0; round < 4; round++) {
          again = false;
          (await pull()).forEach(key => { if (!changed.includes(key)) changed.push(key); });
          let refused = false;
          for (const key of Object.keys(meta.keys).filter(one => meta.keys[one].dirty)) {
            if (!(await push(key))) refused = true;
          }
          if (!refused && !again) break;
        }
        trouble = "";
      } catch (err) {
        trouble = err.message;
      } finally {
        busy = false;
        running = null;
        writeMeta();
        tell("status", status());
      }
      return changed;
    })();
    return running;
  }

  /* ---- Starting up ----
     Reads what an email link brought, listens for the frame's writes
     and for the network, and reads the rows back if signed in. Returns
     what the email link was, if there was one. */
  let started = false;

  function start() {
    if (started) return null;
    started = true;
    const came = arrival();

    window.addEventListener("storage", event => {
      if (event.storageArea !== localStorage || !event.key) return;
      if (event.key === META) { meta = readMeta(); tell("status", status()); return; }
      touched(event.key);
    });
    window.addEventListener("online", () => { sync(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sync();
      else flush(true).catch(() => { /* Sent next time. */ });
    });
    window.addEventListener("pagehide", () => { flush(true).catch(() => {}); });

    if (meta.session) sync();
    return came;
  }

  return {
    // Which keys travel, and how two versions of one are brought together.
    track(test, merge, first) { rules.push({ test, merge: merge || newest, first: !!first }); },
    newest,
    touched,
    start,
    sync,
    flush,
    signIn,
    signUp,
    signOut,
    recover,
    setPassword,
    status,
    onChange(fn) { listeners.change.push(fn); },
    onStatus(fn) { listeners.status.push(fn); },
    fingerprint
  };
})();
