# Module « récompense » — Ma propriété

Prototype autonome : l'enfant gagne des pièces en franchissant des paliers
dans l'application d'apprentissage, puis les dépense pour aménager sa
propriété et sa maison, vues de dessus.

Ce dossier ne dépend de rien du reste du dépôt (`index.html`, `farm.js`,
`words.js`) et l'inverse est vrai aussi : le module se lance seul.

## Lancer

Ouvrir `reward/index.html`. Un simple serveur statique convient :

```sh
python3 -m http.server 8000     # puis http://localhost:8000/reward/
```

Le bouton ⚙ ouvre un **panneau parent** qui remplace l'application
d'apprentissage le temps du prototype : accorder le palier suivant, tout
remettre à zéro.

## Ce que fait le module

La propriété occupe tout l'écran ; le reste flotte par-dessus.

* Une maison et un terrain vus de dessus, posés sur une grille fine : un
  objet courant (poule, chaise, chemin) occupe 2 × 2 cases, une barrière
  ou une porte seulement 2 × 1. Les murs des intérieurs font une case, et
  chaque pièce compte un nombre pair de cases dans les deux sens, pour
  qu'un sol puisse la couvrir entièrement.
* **Caméra** : glisser n'importe où sur le terrain la déplace (sauf sur
  l'objet sélectionné, qui suit alors le doigt), deux doigts (ou la
  molette) zooment. On ne peut pas dézoomer au-delà du terrain entier, ni
  le faire sortir de l'écran.
* **Overlay permanent** : les pièces en haut à droite, un bouton retour en
  haut à gauche (il préviendra l'application d'apprentissage), et le
  bouton **Magasin** en bas. Toucher les pièces en ajoute 100 — raccourci
  de prototype.
* **Des lieux, pas un seul** : la propriété dehors, et l'intérieur de
  chaque bâtiment. Toucher un bâtiment propose **Entrer** ; la porte (ou
  le bouton **Sortir**) ramène dehors, et un escalier mène à l'étage.
  Chaque intérieur est un monde indépendant, avec ses pièces séparées par
  des murs : ses objets lui appartiennent, seules les pièces de monnaie
  sont communes.
* **Acheter des parcelles** : à côté de la propriété, la parcelle
  suivante est dessinée en friche avec son prix. On la touche, sa barre
  dit ce qu'elle coûte (ou ce qui manque), et elle rejoint le terrain
  d'un seul tenant. Six parcelles, de plus en plus chères et de plus en
  plus impressionnantes :

  | Parcelle | Prix | Ce qu'elle apporte |
  | --- | --- | --- |
  | Ton terrain | — | la maison de départ (3 pièces) |
  | Le pré | 300 | de la place, tout simplement |
  | Le bosquet | 700 | sol de forêt, grands sapins, une **cabane** |
  | La plage | 1500 | du sable et la mer (où l'on ne bâtit pas) |
  | Le hameau | 3000 | **deux maisonnettes**, chacune son intérieur |
  | L'immeuble | 6000 | une cour pavée et **trois étages** à aménager |

  On ne peut rien poser sur une parcelle qui n'est pas achetée, ni sur la
  mer.
* **Magasin** : il s'ouvre en plein écran, les familles restent visibles
  en haut pendant que la liste défile, et il ne propose que ce qui a sa
  place là où l'enfant se trouve — 31 objets dehors (terrain, animaux,
  nature, jardin, bâtiments), 17 dedans (meubles, porte, carrelage, tapis,
  et le chat et le chien qui vont des deux côtés). Chaque fiche porte son
  nom français, son nom anglais et son prix — la taille se devine au
  dessin, elle n'est pas écrite.
* **Prendre en main** : toucher un objet du magasin ne l'achète pas ; le
  magasin se ferme et l'objet part dans le coin de l'écran avec son prix.
  Un appui sur le terrain le pose et débite les pièces, **centré au plus
  près de l'endroit touché** : viser le coin haut-gauche d'une case met
  cette case en bas à droite de l'objet, viser son milieu le pose à cheval
  autour d'elle. La silhouette montre le résultat avant de lâcher. Il **reste en main**
  ensuite, pour poser toute une rangée de champs sans rouvrir le magasin ;
  la croix le repose, et il quitte la main tout seul dès qu'il n'y a plus
  assez de pièces pour le suivant.
* Rien n'est débité si la case est prise. Un glisser garde son sens
  habituel même avec un objet en main : il déplace la caméra.
* **Tourner** : ce qui a une direction (lit, canapé, table, chaise,
  armoire, cheminée, porte, barrière, banc, panneau, poulailler, serre…)
  porte un bouton ↻ — dans le coin, pour orienter l'objet avant de le
  poser, et dans sa barre une fois posé. Un quart de tour à la fois ;
  l'emprise tourne avec le dessin, et un objet qui ne rentrerait plus en
  travers reste comme il était.
* **Deux couches** : le *terrain* (chemin, champ) se pose sur le sol, tout
  le reste se pose dessus. Une case ne peut porter qu'un seul terrain et
  qu'un seul objet : un chemin et un champ se disputent la case, une poule
  et un chien aussi, mais la poule se pose sans problème sur le chemin.
  La maison, elle, occupe les deux couches.
* Dans les deux lieux : toucher un objet le **sélectionne** ; sa barre propose
  de le **revendre à son prix d'achat**, et une fois sélectionné on le
  glisse pour le déplacer. L'objet reste sélectionné si on le lâche sur
  une place prise.
* Il n'y a pas de réserve : un objet est payé là où il se pose, et revendu
  de là où il est.
* Les murs, les fenêtres, la maison et la porte d'entrée sont *bâtis* :
  on ne peut ni les acheter, ni les déplacer, ni les vendre, et rien ne
  se pose dessus. Chaque intérieur a ses fenêtres percées dans les murs
  extérieurs — deux cases de large dans un mur horizontal, deux de haut
  dans un mur latéral.
  La porte du magasin, elle, est un objet comme un autre : on l'achète,
  on la pose dans une embrasure, on la tourne, on la revend.
* Tout est sauvegardé dans `localStorage`, clé `reward-property-v1`. La
  sauvegarde ne contient que les pièces, les parcelles achetées et les
  objets de chaque lieu : **la carte n'est jamais sauvegardée**, elle est
  reconstruite depuis `js/scenes.js` à chaque ouverture, si bien que le
  plan peut évoluer sans abîmer une propriété existante. Une sauvegarde
  écrite par une version antérieure (`version` différente) est **effacée
  et non convertie** : la grille sous elle n'est plus la même.

## Brancher l'application d'apprentissage

Le module ne connaît ni les points ni les leçons : il reçoit seulement des
paliers. Deux façons de l'appeler, au choix.

Sur la même page (les scripts du module sont chargés) :

```js
REWARD.grantTier(rank);   // paie le palier une seule fois, même rappelé
REWARD.addCoins(50);      // pièces hors palier
REWARD.coins();           // solde actuel
```

Dans une iframe :

```js
iframe.contentWindow.postMessage({ type: "reward:tier", tier: rank }, "*");
// réponse : { type: "reward:state", coins: 1234 }
```

Le bouton retour prévient la page parente avec
`{ type: "reward:back" }` ; c'est là que l'application d'apprentissage
reprendra la main.

Un palier déjà payé est ignoré (`grantTier` renvoie `null`), donc
l'application principale peut rejouer ses paliers sans risque de double
récompense. Le barème est dans `js/app.js` (`rewardForTier`) : 50 pièces
par palier, 200 tous les dix paliers.

## Organisation

```
reward/
  index.html          structure de la page, les deux onglets
  css/style.css       toute la mise en forme
  js/catalog.js       la liste des objets (données seules)
  js/scenes.js        les parcelles et les lieux : plans, murs, portes, escaliers
  js/state.js         pièces, objets posés par lieu, sauvegarde, règles
  js/world.js         dessin du terrain, caméra, gestes, glisser-déposer
  js/shop.js          l'écran magasin
  js/app.js           overlay, objet en main, panneau parent, pont avec l'app
  assets/             les dessins, un fichier SVG par élément
    house.svg grass.svg coin.svg
    floor.svg wall.svg door.svg window.svg window-side.svg  (les intérieurs)
    grass.svg forest.svg sand.svg paving.svg  (les sols des parcelles)
    water.svg cabin.svg cottage.svg apartment.svg stairs-*.svg
    items/            un fichier par objet du magasin
```

## Ajouter un objet

1. Déposer un SVG dans `assets/items/`. L'échelle est de **16 px par
   case**, et le dessin doit avoir les proportions de son emprise : un
   objet de 2 × 2 cases (la taille courante) se dessine dans un `viewBox`
   de `0 0 32 32`, une barrière de 2 × 1 dans `0 0 32 16`, un banc de
   4 × 2 dans `0 0 64 32`. Un terrain remplit son cadre bord à bord.
2. Ajouter une ligne dans `js/catalog.js` (`id`, `fr`, `en`, `price`,
   `w`, `h`, `category`, `asset`, plus `layer: "ground"` pour un terrain,
   `where: "in"` ou `"both"` pour ce qui se vend dans la maison, et
   `turns: true` pour ce qui peut être orienté). L'objet apparaît aussitôt
   en magasin, du bon côté des murs.

Ne jamais renommer un `id` déjà utilisé : c'est lui qui est écrit dans la
sauvegarde.

## Prévu pour plus tard

* **Agrandir la maison de départ** (étages) comme l'immeuble : un escalier
  et une scène de plus dans `js/scenes.js`.
* **De nouvelles parcelles** : ajouter une entrée à `PLOTS` dans
  `js/scenes.js` suffit — position, sol, prix, décors, et les intérieurs
  qu'elle amène. Rien d'autre à toucher, et les propriétés déjà
  sauvegardées la voient apparaître à vendre.
* Faire travailler le vocabulaire à partir des objets posés : le nom
  anglais de chaque objet est déjà dans le catalogue, prêt à être lu à
  voix haute ou demandé sous forme de question.
