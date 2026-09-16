# Les profils

Un téléphone à la maison se partage : un frère et une sœur s'y relaient,
et chacun a besoin de son rang, de ses mots et de sa propriété. C'est
tout ce que fait un profil.

## Ce qu'on demande

Trois choses, et pas une de plus : **le prénom**, **une image** et **le
niveau**, CE2 ou 6ème. Rien qu'un enfant puisse se tromper à saisir,
rien qui mérite d'être caché.

L'image passe avant le nom partout où un profil se montre, et elle est
grande : un enfant qui ne lit pas encore une liste de prénoms retrouve
sa ligne à son dessin. Il y en a douze, dans `assets/avatars/`, un
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
répondre à sa place. Depuis le menu, « Changer de profil » y revient.

## Où vont les affaires de chacun

Chaque profil reçoit un identifiant (`p1`, `p2`…) qui sert à construire
ses clés de rangement :

| | |
| --- | --- |
| `anglais-profiles-v1` | la liste des profils (prénom, image, niveau) et le dernier choisi |
| `anglais-progress-v1:p1` | les mots, les points, les journées |
| `reward-property-v1:p1` | la propriété et ses pièces |

L'identifiant **ne change jamais et ne s'affiche jamais** : c'est lui qui
porte les clés, donc renommer un profil (le jour où on l'ajoutera)
laisse la progression où elle est.

Le module de récompense est ouvert avec `reward/index.html?p=p1` : c'est
ainsi qu'il sait quelle propriété charger. Ouvert tout seul, sans
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
rangs. Les clés simples disparaissent alors, et chaque profil suivant
part de zéro.

## Le niveau, pour plus tard

Le niveau est enregistré et affiché, mais **aucun exercice ne le regarde
encore** : toutes les listes de `words.js` sont proposées à tout le
monde. Le jour où des listes CE2 arriveront, c'est à deux endroits que
cela se jouera :

* dans `words.js`, une liste déclarerait le niveau auquel elle
  s'adresse (rien n'est prévu pour l'instant : une leçon sans mention
  reste pour tout le monde) ;
* dans `renderMenu` (`index.html`), le filtre des listes proposées
  regarderait `PROFILE.grade`.

`PROFILES.GRADES` est la liste des niveaux, et son `id` (`ce2`, `6eme`)
est ce qui est écrit dans la sauvegarde : comme un identifiant de
profil, il ne se renomme pas.

## Ce qui n'y est pas encore

On ne peut ni **renommer**, ni **changer d'image**, ni **supprimer** un
profil : tout se choisit à la création et rien ne se reprend. Un prénom
mal tapé reste donc tel quel. C'est volontairement laissé de côté :
supprimer efface la progression d'un enfant, et cela mérite d'être
conçu avec soin plutôt qu'ajouté en passant.
