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
   de départ, `answer` le résultat attendu. C'est ce que lit l'exercice ;
   le reste de l'application ne regarde que les trois champs ci-dessus.
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
      answer: n * 2
    };
  }

  const EXERCISES = [
    {
      id: "doubles",
      title: "Les doubles",
      subtitle: "Combien font deux fois ce nombre ?",
      items: DOUBLES.map(double)
    }
  ];

  return {
    EXERCISES,
    all() { return EXERCISES.flatMap(one => one.items); },
    byId(id) { return EXERCISES.find(one => one.id === id) || null; }
  };
})();
