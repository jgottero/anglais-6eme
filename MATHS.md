# Les mathématiques (CE2)

L'application a commencé par l'anglais ; le CE2 commence par les
mathématiques. Un enfant en CE2 ouvre la même application, gagne les
mêmes rangs et aménage la même propriété — seuls les exercices changent.

## Ce qu'il y a pour l'instant

**Les doubles.** L'enfant lit « Le double de 7 » et écrit le résultat.
Les nombres sont tous ceux de **1 à 15**, puis **20, 25, 30 et 50** :
dix-neuf en tout, tirés dans un ordre différent à chaque série. Un
enfant qui sait doubler jusqu'à quinze sait presque tout doubler ; les
quatre derniers font le pont vers les dizaines.

Le clavier s'ouvre en chiffres sur un téléphone (`inputmode="numeric"`).
Les espaces et un point égaré sont pardonnés ; « quatorze » écrit en
lettres ne l'est pas — c'est un nombre qui est demandé.

Une réponse fausse montre le calcul (« Le double de 7, c'est **14** —
7 + 7 = 14 ») et demande de **recopier la réponse** avant de passer au
suivant, exactement comme un mot mal orthographié. Ce qu'on corrige de
sa main est ce qui reste.

## La forme d'un exercice

Une question s'écrit dans la même forme qu'un mot d'anglais, parce que
c'est la forme que la sauvegarde, le bilan et la série partagent :

```js
{ key: "doubles:7", fr: "Le double de 7", en: ["14"], n: 7, answer: 14 }
```

* `key` est ce qui est écrit dans la sauvegarde — **ne jamais le
  renommer** : c'est lui qui retient qu'un enfant connaît déjà le double
  de sept ;
* `fr` est ce qui est demandé, `en` les réponses acceptées. Ces deux
  noms viennent des listes d'anglais, arrivées les premières ; pour un
  calcul ils veulent dire la question et sa réponse ;
* `n` et `answer` sont ce dont le calcul a besoin pour lui-même. Le
  reste de l'application ne regarde que les trois premiers.

Tout le reste suit sans rien faire : la révision espacée (un calcul
monte d'un niveau par bonne réponse, cinq niveaux et il est acquis),
l'objectif du jour, les points, les rangs, la propriété.

## Ajouter un exercice

1. Une entrée dans `EXERCISES` (`maths.js`) : un `id`, un titre, un
   sous-titre, et `items` — la liste des questions dans la forme
   ci-dessus.
2. Rien d'autre. Le menu, le bilan et l'objectif du jour le prennent au
   passage, et la liste « tout mélangé » n'apparaît qu'à partir de deux
   exercices.

Si un exercice demande autre chose qu'un nombre écrit, il lui faudra sa
propre façon de poser la question : `maths` dans `index.html` est le
modèle à copier (rendu, correction, recopie), et `modesFor()` est
l'endroit où elle s'annonce.
