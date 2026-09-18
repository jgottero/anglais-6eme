/* =====================================================================
   MATHS — les exercices du CE2.

   L'application a commencé par l'anglais ; le CE2 commence par les
   mathématiques. Tout ce qui entoure un exercice — les rangs, les
   points, l'objectif du jour, la révision espacée, la propriété — ne
   sait rien de ce qui est révisé et sert les deux sans rien changer.

   ---- La forme d'un exercice ----

   Une question s'écrit dans la même forme qu'un mot, parce que c'est la
   forme que la sauvegarde, le carnet et la série partagent :

     key   ce qui est écrit dans la sauvegarde. Ne jamais le renommer :
           c'est lui qui retient qu'un enfant connaît déjà le double de
           sept.
     fr    ce qui est demandé — « Le double de 7 ».
     en    les réponses acceptées, sous forme de texte. Le nom vient des
           listes d'anglais, arrivées les premières ; pour un calcul il
           veut dire la réponse.

   S'y ajoute ce dont le calcul a besoin pour lui-même : `n` le nombre
   de départ, `answer` le résultat attendu, et `how` le raisonnement
   montré quand la réponse est fausse — « 7 + 7 = 14 ». C'est ici qu'il
   s'écrit, et nulle part ailleurs : l'application se contente de
   l'afficher, elle n'a pas à savoir comment on retrouve un produit.
   Le reste de l'application ne regarde que les trois premiers champs.
   ===================================================================== */
const MATHS = (function () {

  /* Les nombres dont on demande le double : tous ceux de 1 à 15, et
     ensuite quelques nombres ronds. Un enfant qui sait doubler jusqu'à
     quinze sait presque tout doubler ; les quatre derniers font le pont
     vers les dizaines. */
  const DOUBLES = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    20, 25, 30, 50
  ];

  function double(n) {
    return {
      key: "doubles:" + n,
      fr: "Le double de " + n,
      en: [String(n * 2)],
      n,
      answer: n * 2,
      how: n + " + " + n + " = " + n * 2
    };
  }

  /* Les tables de multiplication. On les récite d'une fois à dix fois :
     c'est la forme apprise en classe, et c'est elle qui rend une table
     reconnaissable — « deux fois huit, seize ». */
  const TIMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const TABLES = [2, 3, 4, 5];

  /* Comment retrouver le résultat quand on ne l'a pas su. Deux fois et
     trois fois, cela s'additionne et cela se voit. Au-delà, on s'appuie
     sur la ligne d'au-dessus : c'est ainsi qu'une table se construit,
     et l'enfant sait déjà celle d'avant puisqu'il l'a travaillée. */
  function working(table, n) {
    if (table === 2) return n + " + " + n + " = " + 2 * n;
    if (table === 3) return n + " + " + n + " + " + n + " = " + 3 * n;
    return (table - 1) + " × " + n + " = " + (table - 1) * n +
      ", et " + (table - 1) * n + " + " + n + " = " + table * n;
  }

  function times(table, n) {
    return {
      key: "times" + table + ":" + n,
      fr: table + " × " + n,
      en: [String(table * n)],
      n,
      answer: table * n,
      how: working(table, n)
    };
  }

  const EXERCISES = [
    {
      id: "doubles",
      title: "Les doubles",
      subtitle: "Combien font deux fois ce nombre ?",
      items: DOUBLES.map(double)
    }
  ].concat(TABLES.map(table => ({
    id: "times" + table,
    title: "La table de " + table,
    subtitle: "Combien font " + table + " fois ce nombre ?",
    items: TIMES.map(n => times(table, n))
  })));

  return {
    EXERCISES,
    all() { return EXERCISES.flatMap(one => one.items); },
    byId(id) { return EXERCISES.find(one => one.id === id) || null; }
  };
})();
