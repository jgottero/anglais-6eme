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
   The name can be edited, the id cannot.

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

  /* The school years on offer. `id` is written into the save and never
     changes; `fr` is what a child reads. The lessons do not look at
     this yet — it is here so that the day a CE2 list arrives, there is
     already something to ask. */
  const GRADES = [
    { id: "ce2", fr: "CE2", sub: "Cours élémentaire 2" },
    { id: "6eme", fr: "6ème", sub: "Sixième" }
  ];

  function blank() {
    return { version: VERSION, profiles: [], last: null };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.profiles)) return blank();
      const kept = blank();
      kept.profiles = saved.profiles
        .filter(one => one && one.id && one.name)
        .map(one => ({
          id: String(one.id),
          name: String(one.name),
          grade: gradeOf(one.grade).id,
          made: Number(one.made) || 0
        }));
      kept.last = saved.last || null;
      return kept;
    } catch (err) {
      return blank();
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;   // a full or blocked storage must not break the app
    }
  }

  function gradeOf(id) {
    return GRADES.find(one => one.id === id) || GRADES[GRADES.length - 1];
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
      } catch (err) {
        /* Nothing to do: the profile simply starts empty. */
      }
    });
  }

  return {
    GRADES,
    gradeOf,
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
    create(name, grade) {
      const clean = String(name || "").trim().slice(0, 20);
      if (!clean) return null;
      const data = read();
      const first = !data.profiles.length;
      const profile = {
        id: freshId(data.profiles.map(one => one.id)),
        name: clean,
        grade: gradeOf(grade).id,
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
