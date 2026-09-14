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
d'apprentissage le temps du prototype : accorder le palier suivant,
ajouter 100 pièces, tout remettre à zéro.

## Ce que fait le module

* Une maison et un terrain de 14 × 10 cases, vus de dessus.
* Un onglet **Magasin** : 30 objets rangés en quatre familles (animaux,
  nature, jardin, bâtiments). Chaque fiche affiche le nom français et le
  nom anglais.
* Un achat tombe directement sur la première case libre du terrain, ou
  dans le **coffre** si le terrain est plein.
* Sur le terrain : glisser un objet pour le déplacer, cliquer dessus pour
  le ranger dans le coffre ou le **revendre à son prix d'achat**.
* Les emplacements occupés (autres objets, maison) sont refusés : la
  silhouette passe au rouge pendant le déplacement.
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
  js/world.js         dessin du terrain, glisser-déposer, sélection
  js/shop.js          l'onglet magasin
  js/app.js           assemblage, panneau parent, pont avec l'app principale
  assets/             les dessins, un fichier SVG par élément
    house.svg grass.svg coin.svg
    items/            un fichier par objet du magasin
```

## Ajouter un objet

1. Déposer un SVG dans `assets/items/`. L'échelle est de **32 px par
   case** : un objet de 2 × 1 cases se dessine dans un `viewBox` de
   `0 0 64 32`, posé sur le bas du cadre.
2. Ajouter une ligne dans `js/catalog.js` (`id`, `fr`, `en`, `price`,
   `w`, `h`, `category`, `asset`). L'objet apparaît aussitôt en magasin.

Ne jamais renommer un `id` déjà utilisé : c'est lui qui est écrit dans la
sauvegarde.

## Prévu pour plus tard

* Agrandir le terrain et la maison (étages) contre des pièces : la taille
  du terrain et celle de la maison sont déjà des données de la sauvegarde
  (`land`, `house`), il reste à les faire acheter.
* Faire travailler le vocabulaire à partir des objets posés : le nom
  anglais de chaque objet est déjà dans le catalogue, prêt à être lu à
  voix haute ou demandé sous forme de question.
