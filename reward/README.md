# Module « récompense » — Ma propriété

Prototype autonome : l'enfant gagne des pièces en franchissant des paliers
dans l'application d'apprentissage, puis les dépense pour aménager sa
propriété vue de dessus.

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

* Une maison et un terrain de 14 × 10 cases, vus de dessus.
* **Caméra** : glisser le terrain le déplace, deux doigts (ou la molette)
  zooment. On ne peut pas dézoomer au-delà du terrain entier, ni le faire
  sortir de l'écran.
* **Overlay permanent** : les pièces en haut à droite, un bouton retour en
  haut à gauche (il préviendra l'application d'apprentissage), et en bas
  les boutons **Magasin** et **Coffre** avec le nombre d'objets en attente.
  Toucher les pièces en ajoute 100 — raccourci de prototype.
* **Magasin** : 31 objets en cinq familles (terrain, animaux, nature,
  jardin, bâtiments). Chaque fiche affiche le nom français et le nom
  anglais.
* **Deux couches** : le *terrain* (chemin, champ) se pose sur le sol, tout
  le reste se pose dessus. Une case ne peut porter qu'un seul terrain et
  qu'un seul objet : un chemin et un champ se disputent la case, une poule
  et un chien aussi, mais la poule se pose sans problème sur le chemin.
  La maison, elle, occupe les deux couches.
* Deux façons d'acheter : le bouton prix met l'objet **dans le coffre**,
  ou bien on glisse le dessin de l'objet directement sur le terrain —
  l'achat est alors réglé à l'endroit où il se pose. Rien n'est débité si
  la place est prise, et un objet trop cher ne peut pas être glissé.
* **Coffre** : un panneau qui recouvre le bas de la propriété. Les objets
  identiques y sont empilés sur une seule fiche, avec le nombre en
  pastille (trois poules = une poule et un ×3) ; chaque geste ne prend
  qu'un objet de la pile. On glisse un objet du coffre jusqu'à l'endroit
  voulu — le panneau s'efface pendant le geste. Un simple appui garde
  l'objet en main : on touche ensuite le terrain pour le poser.
* Sur le terrain : glisser un objet pour le déplacer, le toucher pour le
  ranger dans le coffre ou le **revendre à son prix d'achat**.
* Les emplacements occupés (autres objets, maison) sont refusés : la
  silhouette passe au rouge pendant le geste.
* Tout est sauvegardé dans `localStorage`, clé `reward-property-v1`.

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
  js/state.js         pièces, objets posés, coffre, sauvegarde, règles
  js/world.js         dessin du terrain, caméra, gestes, glisser-déposer
  js/shop.js          le panneau magasin
  js/app.js           overlay, coffre, panneau parent, pont avec l'app
  assets/             les dessins, un fichier SVG par élément
    house.svg grass.svg coin.svg
    items/            un fichier par objet du magasin
```

## Ajouter un objet

1. Déposer un SVG dans `assets/items/`. L'échelle est de **32 px par
   case** : un objet de 2 × 1 cases se dessine dans un `viewBox` de
   `0 0 64 32`, posé sur le bas du cadre. Un terrain, lui, remplit son
   cadre bord à bord.
2. Ajouter une ligne dans `js/catalog.js` (`id`, `fr`, `en`, `price`,
   `w`, `h`, `category`, `asset`, plus `layer: "ground"` pour un
   terrain). L'objet apparaît aussitôt en magasin.

Ne jamais renommer un `id` déjà utilisé : c'est lui qui est écrit dans la
sauvegarde.

## Prévu pour plus tard

* Agrandir le terrain et la maison (étages) contre des pièces : la taille
  du terrain et celle de la maison sont déjà des données de la sauvegarde
  (`land`, `house`), il reste à les faire acheter.
* Faire travailler le vocabulaire à partir des objets posés : le nom
  anglais de chaque objet est déjà dans le catalogue, prêt à être lu à
  voix haute ou demandé sous forme de question.
