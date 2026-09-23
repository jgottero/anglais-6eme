# Les exercices du CE2

L'application a commencé par l'anglais ; le CE2 commence par les
mathématiques, et depuis peu apprend aussi ses nombres en anglais. Un
enfant en CE2 ouvre la même application, gagne les mêmes niveaux et
aménage la même ville — seuls les exercices changent.

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

**Les nombres en anglais, de un à quinze.** Le même apprentissage que
son frère en 6ème, en plus simple : deux façons de poser la question, et
**laquelle est tirée au sort à chaque fois**.

* **À l'oreille** — un nombre est prononcé en anglais et l'enfant écrit
  **le chiffre**. Rien n'est écrit à l'écran, un bouton **Réécouter le
  nombre** le redit autant de fois qu'il faut. Écrire *seven* n'est pas
  demandé : à cet âge, l'oreille et la main suffisent.
* **Parmi quatre** — le nombre est écrit **en français** (« douze ») et
  l'enfant choisit la bonne traduction parmi quatre mots anglais, qui
  sont lus à voix haute quand on les touche.

Sur un téléphone **sans voix anglaise**, la question à l'oreille n'est
jamais tirée : elle serait muette. Tout est alors demandé parmi quatre.

À six exercices, le menu propose en plus **« Tout mélangé »** — les
soixante-quatorze questions tirées ensemble. Le mot compte : un CE2 a
maintenant des calculs **et** des mots, alors ce qui les mélange parle
de questions, et chaque liste se compte dans sa propre monnaie — « 10
calculs » pour une table, « 15 mots » pour les nombres en anglais.

Dans les cinq calculs, le clavier s'ouvre en chiffres sur un téléphone
(`inputmode="numeric"`). Les espaces et un point égaré sont pardonnés ;
« quatorze » écrit en lettres ne l'est pas — c'est un nombre qui est
demandé.

Une **bonne réponse** ne demande rien : elle est annoncée, et le calcul
suivant arrive de lui-même après une seconde. Une réponse **fausse**
montre le calcul et demande de **recopier la réponse** avant de passer au
suivant, exactement comme un mot mal orthographié — là, c'est l'enfant
qui décide quand il a fini de lire. Ce qu'on corrige de sa main est ce
qui reste.

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
l'objectif du jour, les points, les niveaux, la ville.

À la fin d'une série, la page de score donne le compte des bonnes
réponses, **les pièces que la série a rapportées** quand elle en a
rapporté, et, sous **« À retravailler »**, **les calculs manqués dans
cette série-là** — rien d'autre.

Le **bilan**, lui, tient en une ligne par calcul : le calcul tel qu'il
est posé (« 4 × 7 », « Le double de 11 ») et les cinq points à côté. Pas
la réponse, pas de compte, pas de date, pas de trait entre les lignes —
de quoi voir d'un coup d'œil ce qui est solide et ce qui ne l'est pas.
Le compte et la date sont gardés dans le bilan que lit **un parent**
(voir `PROFILS.md`). Un calcul juste n'y figure pas, même
s'il vient d'être vu pour la première fois. Une série sans faute le dit
et n'énumère rien.

## Où vivent les nombres en anglais

Ce sont des mots, donc ils sont dans `words.js` avec les autres, et non
dans `maths.js` : une liste y dit `grade: "ce2"` pour passer du menu du
grand à celui du petit. Elle dit aussi `ask: ["count", "mcq"]` — les
modes dans lesquels ses questions sont posées, un tiré au hasard pour
chacune — et `noun`, comment ses items se comptent. Chaque item porte
son `answer`, le chiffre que vaut le nombre :

```js
{ fr: "douze", en: ["twelve"], answer: 12 }
```

Le mode `count` (« écoute et écris le chiffre ») est dans `index.html`,
à côté de `maths` dont il est le jumeau : même clavier, même correction,
même recopie — seule la question change, lue au lieu d'être écrite.

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
