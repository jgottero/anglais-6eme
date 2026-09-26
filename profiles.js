/* =====================================================================
   PROFILES — who is practising.

   A telephone at home is shared: a brother and a sister take turns on
   the same one, and each needs their own rank, their own words and
   their own property. A profile is the answer, and it is deliberately
   small — a first name and a school year, nothing a child could get
   wrong and nothing worth hiding.

   Everything a profile owns is kept under a key of its own, made of the
   ordinary key and the profile's id:

       anglais-progress-v1:p3     the words, the points, the days
       reward-property-v1:p3      the property and its coins

   The id is never shown and never changes — it is what the keys are
   built from, so renaming a profile leaves its progress where it is.
   The name can be edited, the id cannot. The one exception is two
   telephones of the same family account giving the same id to two
   different children before they met: see reconcile() below.

   A profile also carries a drawing, chosen from the dozen under
   assets/avatars/. It is what a child who cannot yet read a list of
   names picks their own line by, and what tells two Camilles apart.

   ---- Coming from before profiles existed ----

   A telephone that has been used already holds a save under the plain
   keys, with no profile at all. That save is not lost and not copied:
   the first profile made on this telephone takes it over, keys and
   all. The screen says so, so nobody has to wonder where a hundred
   ranks went. From then on the plain keys are gone and every profile
   stands on its own.
   ===================================================================== */
const PROFILES = (function () {

  const KEY = "anglais-profiles-v1";
  const VERSION = 1;

  // The keys a profile owns, and the plain ones it may inherit.
  const OWNED = [
    { plain: "anglais-progress-v1" },
    { plain: "reward-property-v1" }
  ];

  /* Who a profile is. `id` is written into the save and never changes;
     `fr` is what is read on screen. Two school years, and a grown-up:
     a parent has no exercises of their own and no town — their profile
     exists to look over the children's work, so it is marked `grown`
     and the app asks that rather than listing the years it is not. */
  const GRADES = [
    { id: "ce2", fr: "CE2", sub: "Cours élémentaire 2" },
    { id: "6eme", fr: "6ème", sub: "Sixième" },
    { id: "parent", fr: "Parent", sub: "Pour suivre le travail des enfants", grown: true }
  ];

  /* The drawings a profile can wear. `id` is written into the save and
     is the file name under assets/avatars/, so it never changes; `fr`
     is what a screen reader says. Adding one is a drawing and a line. */
  const ICONS = [
    { id: "cat",     fr: "Un chat" },
    { id: "dog",     fr: "Un chien" },
    { id: "fox",     fr: "Un renard" },
    { id: "rabbit",  fr: "Un lapin" },
    { id: "owl",     fr: "Une chouette" },
    { id: "frog",    fr: "Une grenouille" },
    { id: "fish",    fr: "Un poisson" },
    { id: "penguin", fr: "Un manchot" },
    { id: "dragon",  fr: "Un dragon" },
    { id: "rocket",  fr: "Une fusée" },
    { id: "ball",    fr: "Un ballon" },
    { id: "flower",  fr: "Une fleur" }
  ];

  const AVATARS = "assets/avatars/";

  function blank() {
    return { version: VERSION, profiles: [], last: null };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? tidy(JSON.parse(raw)) : blank();
    } catch (err) {
      return blank();
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      cloud(KEY);
      return true;
    } catch (err) {
      return false;   // a full or blocked storage must not break the app
    }
  }

  // Tells the family account a save has changed, when there is one.
  function cloud(key) {
    if (typeof CLOUD !== "undefined") CLOUD.touched(key);
  }

  function gradeOf(id) {
    // Unknown: a pupil, never a grown-up — the sixième is the old default.
    return GRADES.find(one => one.id === id) ||
      GRADES.find(one => one.id === "6eme");
  }

  /* The drawing a profile wears. Asked for one it does not have, and
     given something to fall back on, the answer is worked out from
     that rather than always being the same first one. */
  function iconOf(id, fallbackFrom) {
    const found = ICONS.find(one => one.id === id);
    if (found) return found;
    let sum = 0;
    String(fallbackFrom || "").split("").forEach(letter => { sum += letter.charCodeAt(0); });
    return ICONS[sum % ICONS.length];
  }

  /* An id that no profile has had before. It goes into the storage
     keys, so it is kept short, plain and forever. */
  function freshId(taken) {
    let n = 1;
    while (taken.indexOf("p" + n) !== -1) n++;
    return "p" + n;
  }

  // Is there a save here from before profiles existed?
  function legacy() {
    try {
      return OWNED.some(one => localStorage.getItem(one.plain) !== null);
    } catch (err) {
      return false;
    }
  }

  /* Hands the plain keys over to a profile, rather than copying them:
     the progress stays exactly one save, and nothing is left behind to
     be adopted twice. */
  function inherit(id) {
    OWNED.forEach(one => {
      try {
        const had = localStorage.getItem(one.plain);
        if (had === null) return;
        localStorage.setItem(one.plain + ":" + id, had);
        localStorage.removeItem(one.plain);
        cloud(one.plain + ":" + id);
      } catch (err) {
        /* Nothing to do: the profile simply starts empty. */
      }
    });
  }

  /* ---- Two lists of the same family ----
     The list of profiles is kept on the family account as well, and
     two telephones can each add to it before they next meet. Bringing
     the two together never loses anybody:

       - the same id, made at the same moment (or, for a profile from
         before that was noted, with the same name): the same person;
       - a profile made on this telephone with the name and school year
         of one on the account that nobody here stands for yet: the
         same child, who had been practising on two telephones — their
         work is merged under the account's id;
       - anybody else is somebody new, and keeps their id unless the
         account already gives it to someone else, in which case they
         get a fresh one and take everything they own with them.

     Who was chosen last on this telephone stays this telephone's. */
  function sameName(a, b) {
    const plain = text => String(text || "").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return plain(a) === plain(b);
  }

  function samePerson(a, b) {
    if (a.id !== b.id) return false;
    return a.made && b.made ? a.made === b.made : sameName(a.name, b.name);
  }

  function reconcile(local, remote, how) {
    const mine = tidy(local);
    const theirs = tidy(remote);
    const kept = theirs.profiles.slice();
    const claimed = new Set();
    const target = {};

    mine.profiles.forEach(one => {
      const same = kept.find(other => samePerson(one, other));
      if (same) { target[one.id] = same.id; claimed.add(same.id); }
    });
    mine.profiles.forEach(one => {
      if (target[one.id]) return;
      const twin = kept.find(other => !claimed.has(other.id) &&
        sameName(one.name, other.name) && one.grade === other.grade);
      if (twin) { target[one.id] = twin.id; claimed.add(twin.id); }
    });
    mine.profiles.forEach(one => {
      if (target[one.id]) return;
      const taken = kept.map(other => other.id)
        .concat(mine.profiles.map(here => here.id));
      const id = kept.some(other => other.id === one.id) ? freshId(taken) : one.id;
      target[one.id] = id;
      kept.push(Object.assign({}, one, { id }));
    });

    const moving = Object.keys(target).filter(id => target[id] !== id);
    if (moving.length) {
      how.moveAll([].concat(...moving.map(id => OWNED.map(one =>
        [one.plain + ":" + id, one.plain + ":" + target[id]]))));
      moving.forEach(id => { how.renamed[id] = target[id]; });
    }

    const last = mine.last ? target[mine.last] || null : theirs.last;
    return { version: VERSION, profiles: kept, last };
  }

  // Any save of the list, read the way read() reads it.
  function tidy(saved) {
    const kept = blank();
    if (!saved || !Array.isArray(saved.profiles)) return kept;
    kept.profiles = saved.profiles
      .filter(one => one && one.id && one.name)
      .map(one => ({
        id: String(one.id),
        name: String(one.name),
        grade: gradeOf(one.grade).id,
        /* A profile made before there were drawings gets one worked
           out from its id, so two of them never come back wearing the
           same face. */
        icon: iconOf(one.icon, String(one.id)).id,
        made: Number(one.made) || 0
      }));
    kept.last = saved.last || null;
    return kept;
  }

  /* The list goes to the family account first of all, since bringing
     two lists together may move the saves of the profiles in it. What
     each profile owns is registered by the page that knows its shape. */
  if (typeof CLOUD !== "undefined") CLOUD.track(key => key === KEY, reconcile, true);

  return {
    GRADES,
    ICONS,
    gradeOf,
    // A grown-up looks at the children's work; a child does the work.
    grown(grade) { return !!gradeOf(grade).grown; },
    iconOf,
    iconUrl(id) { return AVATARS + iconOf(id).id + ".svg"; },
    legacy,

    all() { return read().profiles; },

    // The profile chosen last, if it is still there.
    last() {
      const data = read();
      return data.profiles.find(one => one.id === data.last) || null;
    },

    one(id) {
      return read().profiles.find(profile => profile.id === id) || null;
    },

    /* Makes a profile and returns it. The very first one on a telephone
       that has been used before takes over what was already saved. */
    create(name, grade, icon) {
      const clean = String(name || "").trim().slice(0, 20);
      if (!clean) return null;
      const data = read();
      const first = !data.profiles.length;
      const id = freshId(data.profiles.map(one => one.id));
      const profile = {
        id,
        name: clean,
        grade: gradeOf(grade).id,
        icon: iconOf(icon, id).id,
        made: Date.now()
      };
      if (first && legacy()) inherit(profile.id);
      data.profiles.push(profile);
      data.last = profile.id;
      write(data);
      return profile;
    },

    // Remembers who is practising, so the next visit opens on them.
    choose(id) {
      const data = read();
      if (!data.profiles.some(one => one.id === id)) return null;
      data.last = id;
      write(data);
      return data.profiles.find(one => one.id === id);
    },

    /* Where this profile's things live. Without a profile — the module
       opened on its own, a page from before — the plain key stands, so
       nothing that already worked stops working. */
    keyFor(plain, id) {
      return id ? plain + ":" + id : plain;
    }
  };
})();
