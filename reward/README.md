# Module « récompense » — Ma ville

Prototype autonome : l'enfant gagne des pièces en franchissant des
**niveaux** dans l'application d'apprentissage, puis les dépense pour
aménager sa ville et sa maison, vues de dessus. Il y a cent niveaux, et
chacun apporte deux ou trois nouveautés au magasin.

> **Ville dehors, propriété dedans.** L'enfant lit « ma ville » partout
> dans l'interface — c'est le mot qui lui parle. Le code, lui, dit
> *property* (`PropertyState`, `propertyCard`), et ce document garde
> « la propriété » quand il parle de la chose plutôt que de ce qui est
> écrit à l'écran. La clé de sauvegarde `reward-property-v1` **ne se
> renomme pas** : c'est sous ce nom que sont rangées les villes déjà
> bâties.

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

* Une maison et un terrain vus de dessus, posés sur une grille fine. Les
  tailles vont de **1 × 1 à 8 × 8** : un ballon, une poubelle, une fleur
  ou un poteau tiennent sur une case ; une poule, une chaise, un chemin
  en occupent 2 × 2 ; un cheval ou un tracteur 6 × 3 ; le moulin 6 × 9 et
  la grande roue 8 × 8. C'est cette différence d'échelle qui fait qu'une
  propriété ressemble à quelque chose. Les murs des intérieurs font une
  case, et **chaque pièce compte un nombre pair de cases dans les deux
  sens** — ce qui est bâti dedans, les ascenseurs de l'entrée, tient sur
  cette même grille de deux — pour qu'un sol de 2 × 2 puisse la couvrir
  entièrement, sans bande nue le long d'un mur.
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
  le bouton **Sortir**) ramène dehors, et l'ascenseur mène à l'étage.
  Le bouton **Sortir** cherche vraiment la porte : depuis un étage, qui
  n'a pas la sienne, il redescend jusqu'à l'étage qui en a une et
  ressort par là, d'un seul appui.
  **Deux appuis d'affilée** sur une maison, une porte ou un ascenseur
  passent directement, sans le détour par la barre du bas. Le premier
  appui sélectionne toujours : la barre dit où cela mène et prononce le
  nom anglais, le second est la réponse. Les deux doivent se suivre de
  près (moins d'une demi-seconde) et au même endroit (à un doigt près),
  sans quoi ce sont deux appuis simples. Ce qui ne mène nulle part — un
  mur, une poule — ne gagne aucun second sens.
* **Un bouton par étage** : dans un bâtiment qui en a plusieurs, une
  rangée **RDC · 1er · 2e · 3e** s'affiche sous le bouton Sortir, celui
  où l'on se trouve marqué. Un appui y va directement — chercher
  l'ascenseur pour monter d'un étage puis redescendre n'a rien
  d'amusant, et un enfant sait très bien à quel étage il veut aller. La
  rangée se construit **en suivant les montées** du plan : rien n'est
  écrit deux fois, et un bâtiment d'un seul niveau n'affiche rien.
* **Un immeuble a une entrée.** Les ascenseurs sont bâtis : là où ils
  se trouvent, on ne pose rien. Plutôt que de les laisser manger le
  milieu d'une pièce, chaque étage commence par une **entrée** — le plus
  petit local qui les tienne, les deux **côte à côte**, la montée puis la
  descente, toujours au même coin quel que soit l'étage. Au
  rez-de-chaussée, la porte est juste en dessous. L'espace que l'entrée
  laisse le long de la façade n'est pas perdu pour autant : c'est le
  **hall**, une pièce comme une autre, où l'on meuble.
* **Le centre-ville se mérite, et se voit** : les bâtiments du centre et du
  quartier neuf sont des récompenses tardives, donc les plus vastes du
  jeu — l'immeuble fait 690 cases, le long immeuble 646, chaque tour
  600, quand la maison de départ en fait 357. Ils ont grandi le jour où
  l'entrée est apparue : une cage d'ascenseur prend de la place, autant
  la rendre ailleurs. Les étages du dessus ont
  un **balcon** sur la rue : une avancée pavée de deux cases de
  profondeur, bordée d'un garde-corps, où l'on pose ce qu'on veut comme
  à l'intérieur.
* **Une façade ne ment pas sur ses étages** : l'immeuble en a trois
  dedans et trois rangées de fenêtres dehors, les tours quatre, le long
  immeuble trois. Le compte est écrit dans `BLOCKS` (`floors`), à côté
  du dessin, et une suite de tests tient les plans à cette promesse :
  changer le nombre d'étages oblige à changer le dessin.
* **Chaque bâtiment est meublé jusqu'aux murs.** Les plans sont les
  mêmes, la matière change : la cabane est en rondins, sol compris ; la
  maisonnette du couchant a des tomettes, un crépi blanc à poutre et des
  volets bleus ; celle du levant, des dalles de pierre et du lambris ;
  l'immeuble, un sol clair, des panneaux de béton et des **baies
  vitrées** ; la tour du parc, un sol sombre poli et du verre du sol au
  plafond ; la tour neuve, de la moquette et du béton brut ; le long
  immeuble, de la brique et une verrière d'atelier ; le hangar du port,
  des planches et de la tôle ondulée. C'est une ligne par bâtiment dans
  `STYLES` (`js/scenes.js`) : le sol sur lequel la pièce est posée, et
  ce que valent les signes de son plan.

  Les signes d'un plan : `#` mur, `O` fenêtre dans un mur horizontal,
  `I` fenêtre dans un mur latéral, `D` porte, `U` ce qui monte,
  `W` ce qui descend, `.` sol — et pour un balcon, `B` son
  dallage, `R` le garde-corps qui court, `L` celui qui descend. La
  porte et le garde-corps sont les mêmes partout ; le reste appartient
  au style du bâtiment — y compris **ce qui monte** : une maison a son
  escalier, un immeuble son **ascenseur** (`up` et `down` dans
  `STYLES`). Le module, lui, ne lit pas le nom du bloc mais son champ
  `climb` (`"up"` ou `"down"`), si bien qu'échanger l'escalier contre
  une cabine ne change qu'un dessin. Monter de la
  cabane à la tour doit se voir sous les pieds.
  Chaque intérieur est un monde indépendant, avec ses pièces séparées par
  des murs : ses objets lui appartiennent, seules les pièces de monnaie
  sont communes.
* **Toute la carte est là dès le premier jour** : les onze parcelles sont
  dessinées, avec leurs décors et leurs bâtiments, et celles qui n'ont pas
  été achetées sont sous un voile sombre — on devine ce qu'il y a, et on
  voit le prix. On en touche une **n'importe où, y compris sur ses
  bâtiments** — c'est le terrain entier qui est en vente — et sa barre
  dit ce qu'elle coûte (ou ce qui manque) avant qu'elle s'éclaire. **Elles s'achètent dans l'ordre qu'on
  veut**, dès que la bourse suit.

  Le pays s'organise autour du terrain de départ, qui est au milieu : la
  ville occupe tout l'ouest, le port est en dessous d'elle, là où la ville
  touche la mer ; la mer longe tout le sud, derrière la plage et la
  crique ; la forêt est au nord-ouest, le lac au nord-est.

  | Parcelle | Où | Prix | Ce qu'elle apporte |
  | --- | --- | --- | --- |
  | Ton terrain | centre | — | la maison de départ (4 pièces) |
  | Le pré | nord | 296–300 | de la place, tout simplement |
  | Le bosquet | nord-ouest | 696–700 | sol de forêt, grands sapins, une **cabane** |
  | Le verger | est | 1396–1400 | une grande parcelle, des pommiers, un bois |
  | Le lac | nord-est | 2196–2200 | un **lac** bordé de sable et son ponton |
  | Le hameau | sud | 3196–3200 | une place pavée et **deux maisonnettes** |
  | La plage | sud | 4496–4500 | du sable et la mer (où l'on ne bâtit pas) |
  | Le centre-ville | ouest | 5996–6000 | un parc, un **immeuble** (3 étages) et une **tour** (4 étages) |
  | La crique | sud-est | 7496–7500 | du sable, la mer et la pointe aux sapins |
  | Le quartier neuf | ouest | 8996–9000 | une **tour** (4 étages) et un **long immeuble** (3 étages) |
  | Le port | sud-ouest | 11996–12000 | le quai, la jetée et le **hangar** du port |

  On ne peut rien poser sur une parcelle qui n'est pas achetée, ni sur la
  mer ; et on n'entre pas dans une cabane qu'on ne possède pas. Les
  bâtiments ont des formes différentes — l'immeuble large, la tour étroite
  et haute, le long immeuble bas, le hangar du port — et chacun a son
  plan : on retrouve le quai en sortant, l'ascenseur mène à l'étage.
* **Dehors la limite serpente, dedans elle est droite** : la ligne qui
  sépare deux sols est lue un peu à côté, ce qui donne au sable et à
  l'eau des bords vivants. Cette dérive s'arrête à la porte : à
  l'intérieur tout est bâti, un balcon s'arrête net à son mur, et une
  limite qui ondulerait ressemblerait à une erreur.
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
* **Cent niveaux, et pas un de vide** : l'application d'apprentissage
  fait monter l'enfant de niveau ; chaque niveau paie, et **chaque niveau
  apporte deux ou trois nouveautés** en magasin — jamais moins de deux,
  du niveau 1 au niveau 100. Le catalogue compte **249 objets et
  terrains** en tout : 27 dès le premier jour (de quoi faire un jardin et
  meubler une chambre), puis 222 répartis un à un sur les cent niveaux.
  Il y a 49 terrains là-dedans, dont 19 posables à l'intérieur.

  **Le monde, lui, s'ouvre toujours de cinq en cinq** : chaque groupe de
  cinq niveaux partage un thème — le potager, la ville, la plage — et il
  est servi **du moins cher au plus cher**, si bien qu'à l'intérieur d'un
  thème chaque niveau apporte plus gros que le précédent, et que le
  cinquième en apporte trois. Un nouveau thème recommence forcément plus
  bas : c'est le prix d'un monde qui s'ouvre, et le magasin y gagne une
  famille de plus.

  | Niveaux | Ce qui arrive | Niveaux | Ce qui arrive |
  | --- | --- | --- | --- |
  | 0 | le jardin de départ | 51–55 | l'eau : **piscine**, fontaine, jacuzzi |
  | 1–5 | le potager | 56–60 | le sport |
  | 6–10 | le verger | 61–65 | la salle de bain et la cuisine |
  | 11–15 | les allées et les sols | 66–70 | le grand salon (piano, aquarium) |
  | 16–20 | la basse-cour | 71–75 | la nature sauvage (cerf, renard) |
  | 21–25 | la maison s'équipe | 76–80 | la fête |
  | 26–30 | le jardin d'agrément | 81–85 | les animaux d'ailleurs |
  | 31–35 | la ferme (tracteur, grange) | 86–90 | l'hiver |
  | 36–40 | **la ville** (route, feu tricolore) | 91–95 | les monuments |
  | 41–45 | les jeux | 96–100 | les merveilles : phare, manège, grande roue |
  | 46–50 | **la plage** | | |

  Les familles ont grandi avec : Terrain, Nature, Jardin, Animaux,
  **Ferme**, **Ville**, **Plage**, **Jeux**, Meubles, Bâtiments.
* **Voir ce qui vient** : le magasin affiche d'abord ce qui est débloqué,
  puis, en grisé au bout de chaque famille, la fournée suivante avec son
  niveau (« niv. 25 »). Une ligne sous le titre rappelle où l'on en est :
  « Niveau 12 / 100 · 2 nouveautés au niveau 13 » — et comme aucun niveau
  n'est vide, la prochaine nouveauté n'est jamais à plus d'un niveau. Toucher un objet
  encore verrouillé dit à quel niveau il arrive, et ne le vend pas.
* **Magasin** : il s'ouvre en plein écran, les familles restent visibles
  en haut pendant que la liste défile, et il ne propose que ce qui a sa
  place là où l'enfant se trouve — le potager et la vache dehors, la
  baignoire et le piano dedans, le chat et le chien des deux côtés.
  Chaque fiche annonce d'abord le **nom anglais**, en gras, le nom
  français en gris dessous, et le prix — la taille se devine au dessin,
  elle n'est pas écrite.
  Chaque dessin est posé **sur le sol auquel il appartient** : une pelouse
  dehors, un parquet dedans. Un chemin ou une terrasse se lit alors comme
  ce qu'il est, quelque chose qu'on pose par terre, et non comme un carré
  de couleur. Un terrain porte en plus une ombre portée, faute de quoi un
  parquet sur du parquet disparaîtrait.
* **Choisir la couleur** : cinquante objets se vendent en
  plusieurs couleurs — la couette du **lit**, le tissu du **canapé** et
  du **fauteuil**, le **tapis**, le carrelage, la **chaise** et la
  **table** repeintes, le **tracteur**, la **remorque** et la
  **grange**, le **parasol**, le **transat**, la **cabine de plage**, la
  **serviette**, le **vélo**, la **trottinette**, le **ballon**, le
  **cerf-volant**, le **toboggan**, le **trampoline**, la **boîte aux
  lettres**, la **poubelle**, les **fleurs**, la **montgolfière**…
  Chaque fiche du magasin porte, sous le nom, une rangée de pastilles :
  toucher l'une d'elles **repeint la fiche sur place** — cela n'achète
  rien, et la liste ne bouge pas. La couleur choisie est celle que
  l'objet emporte, et elle reste choisie pour la visite : une rangée de
  chaises bleues se pose d'un appui chacune.

  La même rangée suit l'objet **en main** (on peut encore changer d'avis
  avant de le poser) et **dans la barre d'un objet posé** : repeindre ce
  qui est déjà chez soi est gratuit et immédiat, comme tourner ou
  retourner. Revenir à la couleur d'origine ne laisse aucune trace dans
  la sauvegarde.

  Ce ne sont pas des filtres : chaque couleur est **son propre fichier
  SVG** (`bed.svg`, `bed-blue.svg`, `bed-green.svg`…), écrit une fois
  pour toutes par `tools/recolour.js` à partir de la table `PAINT` de
  `js/catalog.js`. Le dessin garde ses ombres et ses reflets — le tissu
  bleu a les mêmes plis que le rouge —, et rien n'est recalculé pendant
  le jeu.
* **Le dessin et le sol qu'il occupe sont deux choses.** Un sapin est
  dessiné sur 3 × 4 cases, mais seul son tronc tient le sol : son
  **emprise** est la bande d'une case de haut, au pied du dessin. Les
  branches débordent, et un autre arbre peut pousser juste derrière —
  c'est ainsi qu'on plante une forêt dense, qu'on range un banc sous une
  pergola ou qu'on pousse une armoire contre le mur. Cent trente-quatre
  objets ont ainsi une emprise plus petite que leur dessin
  (`foot` dans `js/catalog.js`) ; tout ce qui est vu de dessus — le lit,
  la table, la mare, le trampoline — occupe son dessin entier, comme
  avant. La bande est centrée sur le dessin et tourne avec lui : un banc
  tourné d'un quart de tour tient une colonne au lieu d'une rangée.
  La silhouette blanche, à la pose, montre **l'emprise** — c'est elle qui
  doit être libre —, et le dessin par-dessus, là où il tombera.
  Comme les dessins se chevauchent désormais, c'est **la case touchée qui
  décide** : ce qui est posé dessus répond en premier (le plus en avant
  s'il y en a plusieurs), et seulement si rien n'y est posé, le dessin qui
  déborde par-dessus. Une fleur rangée derrière une grange se retrouve
  donc toujours.
* **Prendre en main** : toucher un objet du magasin ne l'achète pas ; le
  magasin se ferme, son **nom anglais est prononcé**, et l'objet part
  dans le coin de l'écran avec son prix.
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
* **Six objets se raccordent à leurs voisins**, de deux manières.

  *Tout autour* — ce qui a un bord : la **piscine** et sa margelle de
  dalles, la **haie** et ses côtés taillés, le **ruisseau** et ses
  berges. Chacun occupe une case ; le bord n'est dessiné que sur les
  côtés où la forme s'arrête, avec l'angle qu'il faut à chaque coin et
  le raccord qui tourne quand la forme revient sur elle-même. On dessine
  donc un bassin, une haie ou un cours d'eau de la forme qu'on veut,
  même en L, toujours bordé comme il faut ; au milieu, il n'y a que de
  l'eau ou du feuillage.

  *Entre deux voisins* — ce qui fait une ligne : la **barrière** (ci-
  dessous), le **muret** de pierre et la **route à bandes**, dont la
  ligne blanche court d'une case à la suivante et tourne avec la route.
  Une case isolée reste un poteau, un bout de mur, un morceau de
  bitume.
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
  **Les terrains tournent aussi** : trente-sept sur quarante-neuf — les
  sillons du **champ**, les rangs du **potager**, les lames de la
  **terrasse**, du **parquet** et du **caillebotis**, les assises des
  **briques** et des **pavés**, le **carrelage**, la **mosaïque**, le
  **gazon tondu**, les veines du **marbre**, la glissade de la
  **patinoire**, la diagonale du **pas japonais**, le damier de la
  **piste de danse**…
  La règle n'est pas une opinion : un terrain tourne **quand un quart de
  tour change au moins un cinquième de son dessin**, mesuré pixel par
  pixel (`tests/test42.mjs` affiche le tableau, terrain par terrain, et
  refuse un terrain qui s'en écarte). Les douze qui ne tournent pas — le
  chemin (2 %), le trottoir (0 %), le tapis (0 %), le carreau (0 %), la
  dalle (3 %), le béton (6 %), la route (1 %), la route à bandes (0 %),
  le ruisseau (11 %), la piscine (12 %), le sable (13 %), le marbre noir
  (14 %) — n'auraient rien gagné à un bouton. La route, la route à bandes
  et le ruisseau en avaient un : il ne faisait rien, il a été retiré.
* **Miroir** : **tout objet** porte un bouton ⇄ qui le retourne de gauche
  à droite — dans le coin avant de le poser, et dans sa barre une fois
  posé. L'emprise ne change pas, donc c'est toujours possible, et les
  deux se combinent : une porte peut être tournée puis retournée. Sur un
  dessin symétrique, cela ne se voit simplement pas.
* **On bâtit sur l'eau quand cela a un sens** : la mer et le lac
  refusent tout — sauf ce qui flotte. Un **ponton**, une **barque**, un
  **bateau pirate**, un **pont**, une **bouée**, une planche de surf, un
  cygne, un canard, un nénuphar se posent sur l'eau comme sur la terre ;
  une poule, un banc ou un tracteur, non. C'est un mot du catalogue
  (`wet`) : sans lui, l'eau reste interdite, et un appui sur la mer ne
  fait toujours rien.
* **De quoi faire des motifs** : les terrains ne font pas tous 2 × 2
  cases. Huit d'entre eux tiennent sur **une seule case** — le carreau, la
  mosaïque, la dalle, le pavé rond, le galet, la terre, la mousse, le
  marbre noir — ce qui permet de les alterner avec les grands : un damier
  de **carrelage** 2 × 2 et de **carreaux** 1 × 1, une bordure de mosaïque,
  un **parquet en damier** posé entre deux bandes de parquet ordinaire.
  Plusieurs sont dessinés pour aller avec un terrain qui existait déjà —
  le carreau et la mosaïque avec le carrelage, le marbre noir avec le
  marbre, le parquet en damier avec le parquet, la dalle avec les pavés,
  le galet avec le sable, le caillebotis avec le ponton.
* **Deux couches** : le *terrain* (chemin, champ, piscine) se pose sur le sol, tout
  le reste se pose dessus. Une case ne peut porter qu'un seul terrain et
  qu'un seul objet : un chemin et un champ se disputent la case, une poule
  et un chien aussi, mais la poule se pose sans problème sur le chemin.
  La maison, elle, occupe les deux couches.
  Le **pas japonais** est le seul terrain sans fond : ses pierres sont
  dessinées sur du vide, si bien qu'il se pose sur l'herbe, le sable ou la
  neige et laisse voir le décor autour d'elles.
* **Écouter** : la barre d'un objet (ou d'un bâtiment) sélectionné porte
  un bouton 🔊 qui prononce son nom anglais avec la voix du navigateur,
  un peu ralentie. C'est le premier fil tiré vers le vocabulaire : le nom
  anglais est déjà partout, il se dit maintenant à voix haute.

  **Le magasin le dit tout seul** : au moment où l'on choisit un objet et
  qu'il part en main, son nom anglais est prononcé sans qu'on ait rien à
  toucher — c'est l'instant où il compte le plus, et il ne coûte rien à
  entendre. Un objet refusé (trop cher, pas encore débloqué) ne dit rien :
  seul ce qu'on emporte se prononce.

  **Quelle voix** : l'application n'en porte aucune, elle demande celle du
  téléphone. L'anglais britannique d'abord, puis l'américain, puis
  n'importe quel anglais — un téléphone a l'un et pas l'autre selon ce qui
  a été installé, et l'étiquette est lue au large parce qu'Android écrit
  `en_US` aussi volontiers que `en-US`. **La langue demandée est toujours
  celle de la voix trouvée** : réclamer `en-GB` sur un téléphone qui n'a
  que la voix américaine fait refuser la phrase entière à Android, sans un
  son et sans un mot. Sans aucune voix anglaise, il n'y a rien à faire
  dire au téléphone.
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
* **Une sauvegarde n'est jamais jetée.** Quand la forme du fichier
  change, `VERSION` monte d'un cran et une étape est ajoutée dans `STEPS`
  (`js/state.js`) : elle transforme la version précédente en la suivante.
  Faute d'étape, la sauvegarde est reprise quand même — les pièces, les
  niveaux et les parcelles sont gardés, et **tout ce qui était posé est
  remboursé** au prix d'achat. Au chargement, un dernier passage remet en
  ordre ce qui ne tient plus (un objet qui a changé de taille, un objet
  sur une case devenue eau ou mur, un objet disparu du catalogue) : lui
  aussi est remboursé, l'enfant est prévenu (« +350 pièces rendues »), et
  le fichier est réécrit aussitôt pour qu'un remboursement ne soit jamais
  payé deux fois.
  La dernière étape en date (`9`) est celle des emprises : un objet était
  rangé par le coin de son **dessin**, il est désormais rangé par le coin
  de son **emprise** — la bande de sol au pied du dessin. L'étape déplace
  chaque objet du premier coin vers le second, en tenant compte du quart
  de tour qu'il a reçu ; quinze dessins ont perdu leurs côtés vides au
  passage, et `WAS` (`js/state.js`) se souvient de leur ancienne largeur.
  L'emprise tient toujours dans le carré que le dessin occupait, donc
  **rien n'est déplacé ni remboursé** : un objet qui avait sa place la
  garde. Un dessin rogné peut se retrouver une demi-case sur le côté,
  faute de pouvoir centrer un tronc de trois cases sur un dessin qui en
  faisait quatre ; rien d'autre ne bouge.
* **Une propriété par enfant** : l'application d'apprentissage ouvre le
  module avec `reward/index.html?p=<profil>`, et la sauvegarde prend ce
  nom-là (`reward-property-v1:p1`). Ouvert tout seul, sans profil nommé,
  le module retombe sur la clé simple : rien de ce qui marchait avant ne
  s'arrête. Voir `PROFILS.md` à la racine.
* Tout est sauvegardé dans `localStorage`, clé `reward-property-v1`. La
  sauvegarde ne contient que les pièces, les parcelles achetées et les
  objets de chaque lieu : **la carte n'est jamais sauvegardée**, elle est
  reconstruite depuis `js/scenes.js` à chaque ouverture, si bien que le
  plan peut évoluer sans abîmer une propriété existante. Une sauvegarde
  écrite par une version antérieure est **convertie**, jamais effacée
  (voir ci-dessus) ; seule une sauvegarde écrite par une version plus
  récente est ignorée, faute de savoir la lire.

## L'application d'apprentissage

Elle est branchée : `index.html`, à la racine du dépôt, ouvre ce module
en plein écran dans une iframe quand l'enfant touche **« Ouvrir ma
ville »**. Elle lui envoie deux chiffres — le **rang** atteint dans
les exercices et le **nombre de tampons** du carnet, un par journée où
l'objectif a été tenu — et le module règle tout ce qui n'a pas encore
été payé, puis répond avec la bourse, que le menu affiche entre deux
séries. La flèche en haut à droite de la ville renvoie aux exercices.

Le rang paie la progression, le tampon paie **la régularité** : revenir
demain rapporte, même sans changer de rang.

`reward/index.html` s'ouvre toujours seul, sans l'application : c'est là
qu'on essaie le module (la bourse fait alors passer un niveau).

Le module ne connaît ni les points ni les leçons : il reçoit seulement des
niveaux. Deux façons de l'appeler, au choix.

Sur la même page (les scripts du module sont chargés) :

```js
REWARD.grantTier(level);  // paie le niveau une seule fois, même rappelé
REWARD.syncLevel(level);  // paie tout ce qui est dû jusqu'à ce niveau
REWARD.syncStamps(count); // paie les journées de travail pas encore payées
REWARD.addCoins(50);      // pièces hors niveau
REWARD.coins();           // solde actuel
REWARD.level();           // niveau atteint (0 à 100)
REWARD.reset();           // tout effacer et recommencer
```

Dans une iframe :

```js
iframe.contentWindow.postMessage({ type: "reward:level", level: rank }, "*");
// règle tous les niveaux dus jusqu'à celui-là, en une fois
iframe.contentWindow.postMessage({ type: "reward:stamps", stamps: 34 }, "*");
// règle toutes les journées de travail pas encore payées
iframe.contentWindow.postMessage({ type: "reward:tier", tier: rank }, "*");
// paie un niveau précis
iframe.contentWindow.postMessage({ type: "reward:go-back" }, "*");
// un pas en arrière : le magasin d'abord, puis la pièce où l'on est
// réponse : { type: "reward:state", coins: 1234, level: 8, stamps: 34,
//             paid: 110, deep: true }
```

`paid` est ce que le module vient de verser depuis la dernière fois
qu'il a parlé — l'application en fait le total des pièces gagnées dans
une série, sans connaître un seul prix. `deep` dit s'il reste quelque
chose à quitter ici : un magasin ouvert, ou une pièce dans laquelle on
est entré. Tout message reçu est répondu avec l'état complet : un champ
oublié serait lu comme un champ éteint.

`reward:level` est celui qu'utilise l'application : elle ignore ce qui a
déjà été payé, le module s'en souvient, et renvoyer le même rang ne coûte
rien. Le module envoie aussi `reward:state` de lui-même à chaque fois que
la bourse change, donc la page parente n'a rien à demander.

Le bouton retour prévient la page parente avec
`{ type: "reward:back" }` ; c'est là que l'application d'apprentissage
reprendra la main.

Le bouton retour **du téléphone**, lui, ne ferme pas la ville d'un coup :
l'application envoie `reward:go-back`, le module referme le magasin, puis
sort de la pièce où l'enfant se tenait, et répond `deep: false` quand il
n'a plus rien à quitter — c'est alors seulement que l'application ferme
la ville. Un appui, un pas.

`REWARD.reset()` efface la propriété et rend la mise de départ.

Un niveau déjà payé est ignoré (`grantTier` renvoie `null`), donc
l'application principale peut rejouer ses niveaux sans risque de double
récompense. Le niveau atteint est simplement le plus haut jamais payé, et
c'est lui qui décide de ce que le magasin propose.

Le barème est dans `js/app.js` (`rewardForTier`) : **100 + 10 × niveau**,
plus 250 tous les cinq niveaux et 500 tous les dix. Cela fait 110 pièces
au niveau 1, 1850 au niveau 100, et **70 500 pièces** sur la partie
entière — de quoi acheter les onze parcelles (46 800) et beaucoup de
choses à poser dessus, sans pouvoir tout prendre : il faut choisir.

Un tampon vaut moins (`rewardForStamp`) : **30 + 2 × niveau**, soit 32
pièces au début et 230 à la fin. Une année de travail régulier (autour
de 140 journées) ajoute ainsi quelques milliers de pièces sans voler la
vedette aux rangs — c'est un revenu d'habitude, pas une seconde échelle.
Un compteur unique suffit à ne jamais payer deux fois : le module retient
combien de journées il a réglées, l'application dit combien il y en a.

Quand on ouvre `reward/index.html` tout seul, **un appui sur la bourse
fait passer un niveau** (et donc gagner ses pièces et ses nouveautés) :
c'est ce qui permet d'essayer le module sans faire d'exercices. Ouvert
depuis l'application, le même appui ne fait rien d'autre que rappeler
que les pièces se gagnent dans les exercices — un raccourci d'essai n'a
pas à devenir une machine à pièces.

* **Envoyer son monde** : le bouton de partage (en haut à gauche)
  écrit toute la propriété **dans l'adresse de la page**, après le
  `#` — la partie qu'aucun serveur ne voit jamais. Rien n'est envoyé
  nulle part, rien n'est stocké, il n'y a pas de compte : le lien se
  colle dans un SMS, un message ou un mail, et il marche aussi
  longtemps que la page qu'il désigne. Le téléphone propose son menu
  de partage habituel quand il en a un, sinon le lien est copié.

  Ce qui voyage : les parcelles achetées et chaque objet posé, avec sa
  case, son quart de tour, son miroir et sa couleur. Ce qui ne voyage
  pas : la bourse, les rangs, les tampons. On montre un monde, on ne le
  donne pas — le niveau suit seulement pour que le visiteur sache où en
  est son propriétaire.

  **Le lien porte son propre dictionnaire** : les noms qu'il utilise
  (parcelles, lieux, objets) sont écrits une fois en tête, et le corps
  y renvoie par position — quatre octets par objet, le même objet nommé
  une seule fois quel que soit le nombre de fois qu'il est posé. Un
  lien garde donc son sens même si le catalogue est réorganisé ensuite,
  et n'exige que ce que la sauvegarde exige déjà : **ne jamais renommer
  un `id`**. Le tout est compressé (`CompressionStream`, présent dans le
  navigateur) puis écrit en base64 sûr pour une adresse.

  | objets posés | longueur du lien |
  | --- | --- |
  | 56–60 | ~470 caractères |
  | 296–300 | ~1 300 caractères |
  | 796–800 | ~3 400 caractères |
  | ~1 700 (carte saturée) | ~5 500 caractères |

  Les navigateurs et les messageries n'ont aucun mal avec ces
  longueurs. Le SMS est le point serré : 160 caractères par segment,
  donc un lien de 1 300 caractères en occupe une poignée — ça passe,
  mais une propriété gigantesque fera un SMS encombrant.
* **Visiter, sans rien pouvoir abîmer** : ouvrir un lien reçu montre le
  monde de l'autre **en lecture seule**. On s'y promène, on entre dans
  les maisons, on touche un objet pour entendre son nom anglais — et
  c'est tout. Le magasin, la bourse et le bouton de partage
  disparaissent, la barre d'un objet ne propose plus ni vendre, ni
  tourner, ni repeindre, et une bannière rappelle chez qui l'on est
  avec un bouton **Revenir chez moi**.

  **La propriété du visiteur n'est jamais touchée** : pendant une
  visite, l'écriture dans `localStorage` est purement et simplement
  refusée (`save()` sort immédiatement), et chaque fonction qui
  change quelque chose — acheter, vendre, déplacer, tourner, retourner,
  repeindre, acheter une parcelle, ajouter des pièces, payer un rang —
  refuse aussi. C'est un seul verrou, à l'endroit qui détient les
  règles, plutôt qu'une précaution répétée dans les vues.

  Un lien illisible (abîmé par une messagerie, écrit par une version
  plus récente) le dit et ne fait rien d'autre. Un objet que cette
  version ne connaît pas est simplement omis.

## Vérifier que rien n'est cassé

Les suites Playwright du dépôt ouvrent vraiment le module dans un
navigateur et regardent ce qu'il fait :

```sh
npm install && npx playwright install chromium   # une seule fois
npm test                                          # les trente-six
npm test -- 36                                    # une seule
```

Voir `tests/README.md`. Une nouveauté du module mérite sa suite, à
copier sur la dernière.

## Organisation

```
reward/
  index.html          structure de la page, les deux onglets
  css/style.css       toute la mise en forme
  js/catalog.js       la liste des objets (données seules)
  js/share.js         un monde écrit dans un lien, et relu
  js/scenes.js        les parcelles et les lieux : plans, murs, portes, ascenseurs
  js/ground.js        la peinture du sol, case par case, et la limite des biomes
  js/state.js         pièces, objets posés par lieu, sauvegarde, règles
  js/world.js         dessin du terrain, caméra, gestes, glisser-déposer
  js/shop.js          l'écran magasin
  js/app.js           overlay, objet en main, voix, pont avec l'app
  tools/recolour.js   écrit un dessin par couleur (hors du jeu, une fois)
  assets/             les dessins, un fichier SVG par élément
    house.svg grass.svg coin.svg
    floor.svg wall.svg door.svg window.svg window-side.svg  (les intérieurs)
    back.svg exit.svg cart.svg                (les icônes des boutons)
    ground/           (les sols, plusieurs variantes par biome)
    cabin.svg cottage.svg apartment.svg           (les bâtiments à visiter)
    tower-tall.svg block-long.svg warehouse.svg   (la ville et le port)
    stairs-up.svg stairs-down.svg lift-up.svg lift-down.svg
    items/            un fichier par objet du magasin,
                      plus un par couleur (bed-blue.svg…)
```

## Ajouter un objet

1. Déposer un SVG dans `assets/items/`. L'échelle est de **16 px par
   case**, et le dessin doit avoir les proportions de son cadre : un
   objet de 2 × 2 cases (la taille courante) se dessine dans un `viewBox`
   de `0 0 32 32`, une porte de 2 × 1 dans `0 0 32 16`, un banc de
   4 × 2 dans `0 0 64 32`, un poteau de 1 × 1 dans `0 0 16 16`. Un
   terrain remplit son cadre bord à bord.
2. Ajouter une ligne dans `js/catalog.js` (`id`, `fr`, `en`, `price`,
   `level`, `w`, `h`, `category`, `asset`, plus `layer: "ground"` pour un
   terrain, `where: "in"` ou `"both"` pour ce qui se vend dans la maison,
   `turns: true` pour ce qui peut être orienté ; le miroir, lui, marche
   sans rien déclarer). Le `level` est le niveau qui le met en rayon : 0
   pour le premier jour, un multiple de cinq ensuite. L'objet apparaît
   aussitôt en magasin, au bon niveau et du bon côté des murs.
3. Ajouter `foot: <largeur>` si l'objet est **dessiné debout** et ne tient
   le sol que par son pied : `foot: 3` sur un sapin dessiné sur 3 × 4
   cases lui donne les trois cases du bas, et laisse passer ce qui se
   range derrière. La bande fait toujours une case de haut, elle est
   centrée sur le dessin — sa largeur doit donc être paire ou impaire
   comme lui — et elle ne peut pas être plus large que lui. Sans ce mot,
   l'objet occupe tout son dessin, ce qui est juste pour tout ce qui est
   vu de dessus (un lit, une mare) et pour ce qui se raccorde à ses
   voisins.
4. Ajouter `wet: true` à ce qui doit pouvoir se poser **sur l'eau** (un
   ponton, un bateau, un oiseau d'eau). Sans ce mot, la mer et le lac le
   refusent.
5. Pour un objet qui **se raccorde à ses voisins**, ajouter `joins` avec
   `group` (avec quoi il s'assemble) et, au choix, l'une des deux
   manières :
   * *entre deux voisins* — `across` (le morceau dessiné entre deux
     voisins côte à côte) et `down` (entre celui du dessus et celui du
     dessous), dessinés comme s'ils allaient d'un milieu de case au
     suivant : la barrière ;
   * *tout autour* — `edge` (le bord dessiné sur un côté sans voisin),
     `corner` (l'angle extérieur où deux de ces côtés se rencontrent) et
     `inner` (le raccord quand la forme revient sur elle-même) : la
     piscine.

   Chaque morceau est un SVG d'une case, dessiné pour le côté du haut ou
   pour le coin haut-gauche ; les autres sont le même dessin tourné d'un
   quart de tour. `card` permet enfin de montrer autre chose en magasin
   que ce qui est posé au sol — la barrière se vend en longueur et se
   pose en poteau, la piscine se montre en bassin.

## Donner des couleurs à un objet

1. Ajouter une ligne à `PAINT`, dans `js/catalog.js` :

   ```js
   bed: { colours: ["red", "blue", "green", "purple", "yellow"],
          tint:    ["#c8413c", "#8f2a26", "#e06a63", "#b53a36"] },
   ```

   `colours` est la liste des couleurs proposées, prises dans `COLOURS`
   juste au-dessus ; **la première est celle dans laquelle l'objet est
   déjà dessiné** et ne coûte aucun fichier. `tint` nomme les aplats du
   dessin qui prennent la couleur — le premier est l'aplat principal,
   les autres ses ombres et ses reflets.

2. Lancer l'outil :

   ```sh
   node tools/recolour.js           # écrit ce qui manque
   node tools/recolour.js --check   # dit ce qui manque, sans rien écrire
   node tools/recolour.js --force   # tout réécrire (après un redessin)
   ```

   Il écrit `assets/items/bed-blue.svg` et consorts, et se plaint si un
   objet n'existe pas, si un aplat annoncé n'est pas dans le dessin, ou
   si une couleur n'est pas dans les pots. Chaque aplat fait le même
   chemin que l'aplat principal (teinte, saturation, clarté), donc les
   ombres restent des ombres.

3. Il n'y a rien d'autre à faire : le magasin, l'objet en main et la
   barre de sélection affichent la rangée de pastilles d'eux-mêmes.

Ne jamais renommer un `id` déjà utilisé : c'est lui qui est écrit dans la
sauvegarde. Il en va de même pour un nom de couleur (`blue`) : c'est
aussi ce qui est écrit dans la sauvegarde, et le nom du fichier.

## Prévu pour plus tard

* **Agrandir la maison de départ** (étages) comme l'immeuble : une
  entrée avec son escalier et une scène de plus dans `js/scenes.js` —
  les blocs `stairs_up` et `stairs_down` attendent là, c'est par eux
  qu'une maison monte.
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
