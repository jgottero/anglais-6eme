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

Le temps du prototype, toucher les pièces en ajoute 100 : de quoi essayer
le magasin sans passer par l'application d'apprentissage. Pour repartir de
zéro, `REWARD.reset()` dans la console du navigateur.

## Ce que fait le module

La propriété occupe tout l'écran ; le reste flotte par-dessus.

* Une maison et un terrain vus de dessus, posés sur une grille fine : un
  objet courant (poule, chaise, chemin) occupe 2 × 2 cases, une porte
  seulement 2 × 1, un poteau de barrière une seule case. Les murs des
  intérieurs font une case, et chaque pièce compte un nombre pair de
  cases dans les deux sens, pour qu'un sol puisse la couvrir
  entièrement.
* **Caméra** : glisser n'importe où sur le terrain la déplace (sauf sur
  l'objet sélectionné, qui suit alors le doigt), deux doigts (ou la
  molette) zooment. On ne peut pas dézoomer au-delà du terrain entier ;
  en revanche la scène se déplace librement **jusqu'à ce qu'un de ses
  bords atteigne le milieu de l'écran**, de quoi amener un coin de pièce
  au centre pour y construire.
* **Overlay permanent**, tout en haut : les pièces à gauche, le
  **magasin** (icône de caddie) juste à côté, et à droite le bouton qui
  ramène en arrière. Toucher les pièces en ajoute 100 — raccourci de
  prototype.
* Le bouton de droite change avec le lieu : dehors c'est le **retour aux
  exercices** (flèche), dans un bâtiment c'est la **sortie** (porte), au
  même endroit et à la même taille.
* Le bas de l'écran est laissé libre pour l'objet pris en main (à gauche)
  et la barre de l'objet sélectionné (au centre). Le magasin restant à
  portée, on peut le rouvrir sans reposer ce qu'on tient : choisir un
  autre objet remplace celui qui est en main.
* **Des lieux, pas un seul** : la propriété dehors, et l'intérieur de
  chaque bâtiment. Toucher un bâtiment propose **Entrer** ; la porte (ou
  le bouton **Sortir**) ramène dehors, et un escalier mène à l'étage.
  Chaque intérieur est un monde indépendant, avec ses pièces séparées par
  des murs : ses objets lui appartiennent, seules les pièces de monnaie
  sont communes.
* **Toute la carte est là dès le premier jour** : les onze parcelles sont
  dessinées, avec leurs décors et leurs bâtiments, et celles qui n'ont pas
  été achetées sont sous un voile sombre — on devine ce qu'il y a, et on
  voit le prix. On en touche une, sa barre dit ce qu'elle coûte (ou ce qui
  manque), et elle s'éclaire. **Elles s'achètent dans l'ordre qu'on
  veut**, dès que la bourse suit.

  Le pays s'organise autour du terrain de départ, qui est au milieu : la
  ville occupe tout l'ouest, le port est en dessous d'elle, là où la ville
  touche la mer ; la mer longe tout le sud, derrière la plage et la
  crique ; la forêt est au nord-ouest, le lac au nord-est.

  | Parcelle | Où | Prix | Ce qu'elle apporte |
  | --- | --- | --- | --- |
  | Ton terrain | centre | — | la maison de départ (3 pièces) |
  | Le pré | nord | 300 | de la place, tout simplement |
  | Le bosquet | nord-ouest | 700 | sol de forêt, grands sapins, une **cabane** |
  | Le verger | est | 1400 | une grande parcelle, des pommiers, un bois |
  | Le lac | nord-est | 2200 | un **lac** bordé de sable et son ponton |
  | Le hameau | sud | 3200 | une place pavée et **deux maisonnettes** |
  | La plage | sud | 4500 | du sable et la mer (où l'on ne bâtit pas) |
  | La ville | ouest | 6000 | un parc, un **immeuble** (3 étages) et une **tour** (3 étages) |
  | La crique | sud-est | 7500 | du sable, la mer et la pointe aux sapins |
  | Le quartier neuf | ouest | 9000 | une **tour** (2 étages) et un **long immeuble** (2 étages) |
  | Le port | sud-ouest | 12000 | le quai, la jetée et le **hangar** du port |

  On ne peut rien poser sur une parcelle qui n'est pas achetée, ni sur la
  mer ; et on n'entre pas dans une cabane qu'on ne possède pas. Les
  bâtiments ont des formes différentes — l'immeuble large, la tour étroite
  et haute, le long immeuble bas, le hangar du port — et chacun a son
  plan : on retrouve le quai en sortant, l'escalier mène à l'étage.
* **Un seul monde** : les parcelles achetées n'ont aucune bordure entre
  elles, et le sol est peint **case par case** (`js/ground.js`), chacune
  tirée au sort parmi les variantes de son biome — herbe, sous-bois,
  sable, pavés, mer. La limite entre deux biomes est lue un peu à côté,
  le long d'une ligne qui serpente : le sable mord sur l'herbe au lieu de
  s'arrêter au cordeau, et le rivage dessine une vraie côte. Les règles
  posent la même question que le dessin, donc ce qui ressemble à de l'eau
  est exactement ce sur quoi on ne peut pas bâtir.
* Une parcelle peut aussi porter des **taches d'un autre sol** : le parc
  de la ville, la place du hameau, la clairière du bosquet, le bois du
  verger, le sable autour du lac. Quand deux taches se recouvrent, la
  première l'emporte : c'est ainsi que le ponton du lac et la jetée du
  port passent par-dessus l'eau au lieu d'être avalés par elle.
* **Magasin** : il s'ouvre en plein écran, les familles restent visibles
  en haut pendant que la liste défile, et il ne propose que ce qui a sa
  place là où l'enfant se trouve — 31 objets dehors (terrain, animaux,
  nature, jardin, bâtiments), 17 dedans (meubles, porte, carrelage, tapis,
  et le chat et le chien qui vont des deux côtés). Chaque fiche annonce
  d'abord le **nom anglais**, en gras, le nom français en gris dessous, et
  le prix — la taille se devine au dessin, elle n'est pas écrite.
* **Prendre en main** : toucher un objet du magasin ne l'achète pas ; le
  magasin se ferme et l'objet part dans le coin de l'écran avec son prix.
  Un appui sur le terrain le pose et débite les pièces, **centré au plus
  près de l'endroit touché** : viser le coin haut-gauche d'une case met
  cette case en bas à droite de l'objet, viser son milieu le pose à cheval
  autour d'elle. La silhouette montre le résultat avant de lâcher. La
  position visée n'est jamais ramenée vers le terrain : appuyer à côté (ou
  trop près du bord pour que l'objet tienne) ne pose rien, sans un mot —
  l'objet reste simplement en main. Une case déjà occupée, elle, le dit.
* **Les pièces se voient** : à chaque achat le prix s'envole en rouge à
  l'endroit où l'objet se pose (−220 🪙), et à chaque vente la somme
  rendue s'envole en vert de là où il se trouvait. Il **reste en main**
  ensuite, pour poser toute une rangée de champs sans rouvrir le magasin ;
  la croix le repose, et il quitte la main tout seul dès qu'il n'y a plus
  assez de pièces pour le suivant.
* Rien n'est débité si la case est prise. Un glisser garde son sens
  habituel même avec un objet en main : il déplace la caméra.
* **Les barrières se rejoignent** : une barrière occupe **une case** et
  se pose comme un poteau. Dès qu'une deuxième est posée à côté — à
  droite, à gauche, au-dessus ou en dessous — les deux ne font plus
  qu'une : les poteaux restent où ils sont et un morceau de barrière est
  dessiné entre eux, deux traverses côte à côte, un tronc de haut en
  bas. On prolonge la ligne dans n'importe quel sens, on tourne les
  angles, et vendre un poteau du milieu recoupe la barrière en deux. Le
  morceau part du milieu d'un poteau au milieu du suivant, si bien que
  ses deux bouts disparaissent sous eux. L'objet en main montre déjà, en
  transparence, les traverses qu'il va rejoindre. C'est une propriété du
  catalogue (`joins`), pas un cas particulier du code : un autre objet
  pourra s'assembler de la même façon.
* **Tourner** : ce qui a une direction (lit, canapé, table, chaise,
  armoire, cheminée, porte, banc, panneau, poulailler, serre…)
  porte un bouton ↻ — dans le coin, pour orienter l'objet avant de le
  poser, et dans sa barre une fois posé. Un quart de tour à la fois ;
  l'emprise tourne avec le dessin, et un objet qui ne rentrerait plus en
  travers reste comme il était.
* **Miroir** : **tout objet** porte un bouton ⇄ qui le retourne de gauche
  à droite — dans le coin avant de le poser, et dans sa barre une fois
  posé. L'emprise ne change pas, donc c'est toujours possible, et les
  deux se combinent : une porte peut être tournée puis retournée. Sur un
  dessin symétrique, cela ne se voit simplement pas.
* **Deux couches** : le *terrain* (chemin, champ) se pose sur le sol, tout
  le reste se pose dessus. Une case ne peut porter qu'un seul terrain et
  qu'un seul objet : un chemin et un champ se disputent la case, une poule
  et un chien aussi, mais la poule se pose sans problème sur le chemin.
  La maison, elle, occupe les deux couches.
* **Écouter** : la barre d'un objet (ou d'un bâtiment) sélectionné porte
  un bouton 🔊 qui prononce son nom anglais avec la voix du navigateur,
  un peu ralentie. C'est le premier fil tiré vers le vocabulaire : le nom
  anglais est déjà partout, il se dit maintenant à voix haute.
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
REWARD.reset();           // tout effacer et recommencer
```

Dans une iframe :

```js
iframe.contentWindow.postMessage({ type: "reward:tier", tier: rank }, "*");
// réponse : { type: "reward:state", coins: 1234 }
```

Le bouton retour prévient la page parente avec
`{ type: "reward:back" }` ; c'est là que l'application d'apprentissage
reprendra la main.

`REWARD.reset()` efface la propriété et rend la mise de départ.

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
  js/ground.js        la peinture du sol, case par case, et la limite des biomes
  js/state.js         pièces, objets posés par lieu, sauvegarde, règles
  js/world.js         dessin du terrain, caméra, gestes, glisser-déposer
  js/shop.js          l'écran magasin
  js/app.js           overlay, objet en main, voix, pont avec l'app
  assets/             les dessins, un fichier SVG par élément
    house.svg grass.svg coin.svg
    floor.svg wall.svg door.svg window.svg window-side.svg  (les intérieurs)
    back.svg exit.svg cart.svg                (les icônes des boutons)
    ground/           (les sols, plusieurs variantes par biome)
    cabin.svg cottage.svg apartment.svg           (les bâtiments à visiter)
    tower-tall.svg block-long.svg warehouse.svg   (la ville et le port)
    stairs-up.svg stairs-down.svg
    items/            un fichier par objet du magasin
```

## Ajouter un objet

1. Déposer un SVG dans `assets/items/`. L'échelle est de **16 px par
   case**, et le dessin doit avoir les proportions de son emprise : un
   objet de 2 × 2 cases (la taille courante) se dessine dans un `viewBox`
   de `0 0 32 32`, une porte de 2 × 1 dans `0 0 32 16`, un banc de
   4 × 2 dans `0 0 64 32`, un poteau de 1 × 1 dans `0 0 16 16`. Un
   terrain remplit son cadre bord à bord.
2. Ajouter une ligne dans `js/catalog.js` (`id`, `fr`, `en`, `price`,
   `w`, `h`, `category`, `asset`, plus `layer: "ground"` pour un terrain,
   `where: "in"` ou `"both"` pour ce qui se vend dans la maison,
   `turns: true` pour ce qui peut être orienté ; le miroir, lui, marche
   sans rien déclarer). L'objet apparaît aussitôt en magasin, du bon côté
   des murs.
3. Pour un objet qui **se raccorde à ses voisins**, ajouter `joins` :
   `group` (avec quoi il s'assemble), `across` (le morceau dessiné entre
   deux voisins côte à côte) et `down` (entre celui du dessus et celui du
   dessous). Chaque morceau est un SVG d'une case, dessiné comme s'il
   allait d'un milieu de case au suivant. `card` permet enfin de montrer
   autre chose en magasin que ce qui est posé au sol — la barrière se
   vend en longueur et se pose en poteau.

Ne jamais renommer un `id` déjà utilisé : c'est lui qui est écrit dans la
sauvegarde.

## Prévu pour plus tard

* **Agrandir la maison de départ** (étages) comme l'immeuble : un escalier
  et une scène de plus dans `js/scenes.js`.
* **De nouvelles parcelles** : ajouter une entrée à `PLOTS` dans
  `js/scenes.js` suffit — position, sol, prix, décors, et les intérieurs
  qu'elle amène. Rien d'autre à toucher, et les propriétés déjà
  sauvegardées la voient apparaître à vendre.
* **Le vocabulaire pour de bon** : faire dire les noms tout seuls au fil
  de la visite, ou les demander sous forme de questions. La brique est
  posée (`say()` dans `js/app.js`, et le nom anglais de chaque objet dans
  le catalogue).
* Faire travailler le vocabulaire à partir des objets posés : le nom
  anglais de chaque objet est déjà dans le catalogue, prêt à être lu à
  voix haute ou demandé sous forme de question.
