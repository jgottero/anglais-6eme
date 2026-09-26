# La sauvegarde en ligne

Tout le travail des enfants est enregistré **sur le téléphone**, comme
avant : l'application marche sans réseau, sans compte, et même si le
serveur est en panne. Le **compte famille** ajoute une copie de ces
sauvegardes sur Supabase, pour qu'elles survivent à un téléphone perdu
et suivent les enfants d'un appareil à l'autre.

## Ce que voit la famille

Sous la liste « Qui travaille aujourd'hui ? », une ligne dit où en est
la copie — « Tout est enregistré sur ce téléphone seulement », « Tout
est sauvegardé en ligne », « 2 changements attendent d'être envoyés »
— et un bouton mène au **compte famille**.

- **Premier téléphone** : un parent crée le compte (email et mot de
  passe). Tout ce qui est déjà sur le téléphone y part.
- **Téléphone suivant** : dès l'écran « Bienvenue ! », « Déjà un
  compte famille ? Se connecter ». Tous les profils reviennent, avec
  leurs niveaux, leurs mots et leur ville.
- **Mot de passe oublié** : un email arrive, son lien ramène sur
  l'application qui demande le nouveau mot de passe.
- **Se déconnecter** ne retire rien du téléphone.

Les enfants ne voient rien de plus que la ligne sous leurs prénoms.

## Ce qui part sur le serveur

Une ligne de la table `saves` par sauvegarde, sous la même clé que dans
le téléphone :

| Clé | Contenu |
| --- | --- |
| `anglais-profiles-v1` | la liste des profils |
| `anglais-progress-v1:<profil>` | les mots, les points, les jours |
| `reward-property-v1:<profil>` | la ville et ses pièces |

Le serveur ne connaît que l'adresse email du parent et les prénoms des
enfants. La sécurité par ligne (RLS) fait que chaque compte ne lit et
n'écrit que ses propres lignes. La clé *publishable* écrite dans
`cloud.js` est faite pour être publique : sans compte connecté, elle
ne donne accès à rien.

## Quand deux téléphones ont travaillé chacun de leur côté

La copie part quelques instants après chaque changement ; elle est
relue à l'ouverture, au retour dans l'application et au retour du
réseau. Un téléphone n'écrit jamais par-dessus une version du serveur
qu'il n'a pas lue. Quand les deux ont avancé :

- **la progression** est fusionnée mot par mot (la révision la plus
  récente de chaque mot gagne) et jour par jour ; les points sont
  recomptés à partir des jours ;
- **la liste des profils** est réunie : personne n'est perdu. Deux
  enfants créés en même temps sur deux téléphones, qui auraient reçu
  le même identifiant, sont séparés ; celui du téléphone qui arrive en
  second en reçoit un nouveau et emporte tout ce qui est à lui ;
- un profil créé sur un téléphone avec **le même prénom et la même
  classe** qu'un profil du compte est considéré comme le même enfant :
  son travail rejoint celui du compte au lieu d'en faire un deuxième ;
- **la ville**, qui ne se fusionne pas, prend la version écrite en
  dernier.

## Installer le serveur (une fois)

1. **SQL Editor → New query** : coller `supabase/schema.sql`, *Run*.
   Le fichier peut être relancé sans risque.
2. **Authentication → URL Configuration** : *Site URL*
   `https://jgottero.github.io/revisions/`, et la même adresse
   suivie de `**` dans *Redirect URLs*. C'est là que ramènent les liens
   des emails de confirmation et de mot de passe oublié.
3. **Authentication → Sign In / Providers → Email** : activé.
   *Confirm email* peut rester activé : après la création du compte,
   il faut ouvrir le lien reçu **sur le téléphone** pour être connecté.

L'adresse du projet et la clé publique sont en tête de `cloud.js`.

## Dans le code

`cloud.js` est tout le lien avec Supabase, sans bibliothèque : quelques
appels à l'API d'Auth et à l'API REST. Les autres fichiers ne font que
lui signaler qu'une clé a changé (`CLOUD.touched`) et lui dire comment
fusionner la leur (`CLOUD.track`). La ville écrit depuis son cadre :
ses écritures arrivent à la page par l'évènement `storage`.

`tests/test54.mjs` joue un faux Supabase et trois téléphones : création
du compte, deuxième téléphone, travail hors ligne, profils créés en même
temps, ville envoyée depuis son cadre, troisième téléphone qui avait sa
propre Léa, déconnexion, lien de mot de passe oublié.
