# Les profils

Un téléphone à la maison se partage : un frère et une sœur s'y relaient,
et chacun a besoin de son niveau, de ses mots et de sa ville. C'est
tout ce que fait un profil.

## Ce qu'on demande

Trois choses, et pas une de plus : **le prénom**, **une image** et **qui
on est** — CE2, 6ème, ou **parent**. Rien qu'un enfant puisse se tromper
à saisir, rien qui mérite d'être caché.

## Le profil parent

Un parent n'a **ni exercices, ni objectif du jour, ni ville** : son
profil sert à regarder le travail des enfants. Son écran d'accueil est
la liste des enfants du téléphone, avec leur niveau et leurs points ; un
appui ouvre le bilan de celui-là.

Le bilan qu'un parent lit **garde le nombre de bonnes réponses et la
date de la dernière révision** pour chaque question — ce sont les
questions qu'un parent se pose, et elles n'ont rien à faire sur l'écran
d'un enfant. Lire le carnet d'un enfant **ne prend pas sa place** : sa
sauvegarde est ouverte en lecture, rien n'y est écrit, et le parent
reste le parent.

`PROFILES.grown(niveau)` est ce qui répond « celui-là est un
grand ». Un niveau inconnu — une sauvegarde d'avant les parents — est
toujours un élève, jamais un grand.

L'image passe avant le nom partout où un profil se montre, et elle est
grande : un enfant qui ne lit pas encore une liste de prénoms retrouve
sa ligne à son dessin. En haut de chaque écran, **l'image et le prénom
sont le bouton** qui repasse le téléphone à quelqu'un d'autre ; le coin
opposé garde la sortie de l'écran en cours — « Changer d'exercice »,
« Retour » — et ne change jamais de sens. Il y en a douze, dans `assets/avatars/`, un
fichier SVG chacun. En ajouter une, c'est un dessin et une ligne dans
`PROFILES.ICONS` — l'`id` est le nom du fichier et ce qui est écrit
dans la sauvegarde, donc il ne se renomme pas, comme un identifiant de
profil ou un niveau.

Un profil créé avant que les images existent n'en a pas : on lui en
calcule une **à partir de son identifiant**, si bien que deux anciens
profils ne reviennent jamais avec le même visage.

L'application s'ouvre sur la question « Qui travaille aujourd'hui ? ».
Le dernier profil utilisé est retenu, mais **on redemande quand même** :
un frère qui prend le téléphone de sa sœur ne doit pas se retrouver à
répondre à sa place.

Une fois quelqu'un entré, **le titre de la page le dit, et lui seul** :
l'image et le prénom, sur lesquels on appuie pour repasser le téléphone.
C'est écrit une fois pour toutes, au-dessus des écrans plutôt que dans
l'un d'eux, donc cela ne se répète nulle part et cela suit l'enfant
partout — y compris au milieu d'une série. Tant que personne n'est
entré, le titre est celui de l'application et il n'y a personne à
quitter.

## Le bouton retour du téléphone

C'est le bouton le plus facile à toucher par mégarde, et il faisait
sortir de l'application. Il est branché sur les écrans : un appui fait
**un pas en arrière**, là où les écrans s'emboîtent.

| Écran | Un appui mène à |
| --- | --- |
| dans la ville : magasin ouvert | referme le magasin |
| dans la ville : dans une pièce | ressort du bâtiment |
| la ville | la referme, retour au menu |
| une série, un bilan, le carnet | le menu |
| le menu | « Qui travaille aujourd'hui ? » |
| un nouveau profil | la liste des profils |
| la liste des profils | quitte l'application, comme avant |

Dedans, c'est le module qui sait ce qu'il reste à quitter : il le dit à
chaque changement (`deep`), l'application lui envoie `reward:go-back` et
ne referme la ville que lorsqu'il n'a plus rien à fermer.

L'historique du navigateur ne grossit jamais : **une seule entrée** est
posée au-dessus de la page, elle est consommée par l'appui et reposée
par l'écran sur lequel on atterrit. La liste des profils est le fond —
là, on n'en repose pas, et le bouton retour fait ce qu'il a toujours
fait. Une page ouverte en `file://` peut refuser cette entrée : le
bouton retrouve alors son comportement d'origine, et rien d'autre ne
change.

## Où vont les affaires de chacun

Chaque profil reçoit un identifiant (`p1`, `p2`…) qui sert à construire
ses clés de rangement :

| | |
| --- | --- |
| `anglais-profiles-v1` | la liste des profils (prénom, image, niveau) et le dernier choisi |
| `anglais-progress-v1:p1` | les mots, les points, les journées |
| `reward-property-v1:p1` | la ville et ses pièces |

L'identifiant **ne change jamais et ne s'affiche jamais** : c'est lui qui
porte les clés, donc renommer un profil (le jour où on l'ajoutera)
laisse la progression où elle est.

Le module de récompense est ouvert avec `reward/index.html?p=p1` : c'est
ainsi qu'il sait quelle ville charger. Ouvert tout seul, sans
profil nommé, il retombe sur la clé simple — ce qui marchait avant
continue de marcher.

Un **lien de partage** construit depuis l'application laisse le `?p=`
derrière lui : c'est le monde qui voyage, pas le téléphone d'où il
vient, et le visiteur doit retomber chez lui en repartant.

## Un téléphone déjà utilisé

Une progression enregistrée avant les profils se trouve sous les clés
simples, sans profil. Elle n'est ni perdue ni recopiée : **le premier
profil créé sur ce téléphone en hérite**, clés comprises. L'écran de
création le dit, pour que personne ne se demande où sont passés cent
niveaux. Les clés simples disparaissent alors, et chaque profil suivant
part de zéro.

## Le niveau décide de la matière

Le niveau **choisit ce qui est révisé** : anglais pour la sixième,
mathématiques pour le CE2 (`maths.js`) — et `subjectOf(niveau)` répond à
la question pour n'importe quel profil, ce dont un parent a besoin pour
lire le carnet d'un enfant qui n'est pas de son année à lui. Une matière
n'est pas enfermée pour autant : une liste de mots qui dit
`grade: "ce2"` (`words.js`) passe du menu du grand à celui du petit,
c'est ainsi que le CE2 a ses nombres en anglais à côté de ses tables.
Tout ce qui entoure un exercice
— les niveaux, les points, l'objectif du jour, la révision espacée, la
ville — ne sait rien de ce qui est révisé et sert les deux sans rien
changer.

Trois fonctions portent la bascule, dans `index.html` :

| | |
| --- | --- |
| `subject()` | `"maths"` pour le CE2, `"english"` sinon |
| `lists()` | les listes de la matière, toutes de la même forme : `id`, `title`, `items`, et `of` — `"sums"` ou `"words"`, ce dont elle est faite |
| `modesFor()` | les façons de réviser ; une matière qui n'en a qu'une n'en propose aucune |

Une liste peut aussi porter ses propres modes (`ask`), et alors chaque
question en tire un au hasard : c'est ce qui fait que les nombres en
anglais du CE2 sont tantôt écoutés, tantôt choisis parmi quatre, sans
rien demander à l'enfant.

`allWords()` passe par `lists()`, donc l'objectif du jour, le bilan et la
révision espacée suivent d'eux-mêmes. Le seul endroit qui demande
vraiment quelle matière c'est, c'est le menu : une liste de mots et une
page de calculs ne proposent pas les mêmes choses.

`PROFILES.GRADES` est la liste des niveaux, et son `id` (`ce2`, `6eme`)
est ce qui est écrit dans la sauvegarde : comme un identifiant de
profil, il ne se renomme pas.

## Ce qui n'y est pas encore

On ne peut ni **renommer**, ni **changer d'image**, ni **supprimer** un
profil : tout se choisit à la création et rien ne se reprend. Un prénom
mal tapé reste donc tel quel. C'est volontairement laissé de côté :
supprimer efface la progression d'un enfant, et cela mérite d'être
conçu avec soin plutôt qu'ajouté en passant.
