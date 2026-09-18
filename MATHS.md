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

**Les tables de 2, 3, 4 et 5.** Quatre exercices séparés, un par table,
parce qu'on apprend une table à la fois et qu'on veut savoir laquelle est
sue. Chacune se récite d'**une fois à dix fois**, la forme apprise en
classe : l'enfant lit « 4 × 7 » et écrit le produit.

À cinq exercices, le menu propose en plus **« Tout mélangé »** — les
cinquante-neuf calculs tirés ensemble.

Dans les cinq, le clavier s'ouvre en chiffres sur un téléphone
(`inputmode="numeric"`). Les espaces et un point égaré sont pardonnés ;
« quatorze » écrit en lettres ne l'est pas — c'est un nombre qui est
demandé.

Une réponse fausse montre le calcul et demande de **recopier la
réponse** avant de passer au suivant, exactement comme un mot mal
orthographié. Ce qu'on corrige de sa main est ce qui reste.

Le raisonnement montré est **celui de l'exercice**, pas une formule
unique : un double s'ajoute à lui-même, une table de deux ou de trois
s'additionne, et à partir de quatre on s'appuie sur la ligne d'au-dessus,
qui est la façon dont une table se construit — et que l'enfant a déjà
travaillée.

| Exercice | Faux sur 7 |
| --- | --- |
| Les doubles | Le double de 7, c'est **14** — 7 + 7 = 14 |
| La table de 2 | 2 × 7, c'est **14** — 7 + 7 = 14 |
| La table de 3 | 3 × 7, c'est **21** — 7 + 7 + 7 = 21 |
| La table de 4 | 4 × 7, c'est **28** — 3 × 7 = 21, et 21 + 7 = 28 |
| La table de 5 | 5 × 7, c'est **35** — 4 × 7 = 28, et 28 + 7 = 35 |

## La forme d'un exercice

Une question s'écrit dans la même forme qu'un mot d'anglais, parce que
c'est la forme que la sauvegarde, le bilan et la série partagent :

```js
{ key: "doubles:7", fr: "Le double de 7", en: ["14"],
  n: 7, answer: 14, how: "7 + 7 = 14" }
```

* `key` est ce qui est écrit dans la sauvegarde — **ne jamais le
  renommer** : c'est lui qui retient qu'un enfant connaît déjà le double
  de sept ;
* `fr` est ce qui est demandé, `en` les réponses acceptées. Ces deux
  noms viennent des listes d'anglais, arrivées les premières ; pour un
  calcul ils veulent dire la question et sa réponse ;
* `n`, `answer` et `how` sont ce dont le calcul a besoin pour lui-même —
  `how` étant le raisonnement montré quand la réponse est fausse. Il
  s'écrit dans `maths.js` et nulle part ailleurs : l'application se
  contente de l'afficher, elle n'a pas à savoir comment on retrouve un
  produit. Le reste de l'application ne regarde que les trois premiers
  champs.

Tout le reste suit sans rien faire : la révision espacée (un calcul
monte d'un niveau par bonne réponse, cinq niveaux et il est acquis),
l'objectif du jour, les points, les rangs, la propriété.

À la fin d'une série, la page de score donne le compte des bonnes
réponses et, sous **« À retravailler »**, **les calculs manqués dans
cette série-là** — rien d'autre. Un calcul juste n'y figure pas, même
s'il vient d'être vu pour la première fois. Une série sans faute le dit
et n'énumère rien.

## Ajouter un exercice

1. Une entrée dans `EXERCISES` (`maths.js`) : un `id`, un titre, un
   sous-titre, et `items` — la liste des questions dans la forme
   ci-dessus.
2. Rien d'autre. Le menu, le bilan et l'objectif du jour le prennent au
   passage, et la liste « tout mélangé » apparaît d'elle-même à partir de
   deux exercices.
3. Donner un `how` à chaque question si le résultat se retrouve d'une
   façon qui vaut la peine d'être montrée. Sans lui, une réponse fausse
   donne le résultat et s'arrête là.

Si un exercice demande autre chose qu'un nombre écrit, il lui faudra sa
propre façon de poser la question : `maths` dans `index.html` est le
modèle à copier (rendu, correction, recopie), et `modesFor()` est
l'endroit où elle s'annonce.
