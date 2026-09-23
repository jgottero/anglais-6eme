# Les tests

Cinquante-trois suites Playwright qui ouvrent vraiment les pages dans un
Chromium et regardent ce qui s'y passe : le magasin, la caméra, les
sauvegardes, le pont avec l'application d'apprentissage.

## Lancer

```sh
npm install          # Playwright, une seule fois
npx playwright install chromium
npm test             # les cinquante-trois, dans l'ordre
npm test -- 53       # une seule
npm test -- 30-53    # une tranche
```

`tests/run.mjs` sert le dépôt sur le port 8123 le temps du passage, puis
s'arrête. Rien d'autre à démarrer.

Trois variables d'environnement, si besoin :

| | |
| --- | --- |
| `PORT` | le port du serveur le temps du passage (8123 par défaut) |
| `CHROMIUM` | un autre navigateur que celui de Playwright |
| `SITE` | des pages servies ailleurs, plutôt que par le lanceur |

## Comment elles sont écrites

Il n'y a pas de bibliothèque d'assertions, volontairement. Chaque suite
ouvre des pages, **imprime ce qu'elle a trouvé**, et finit par
`no errors` — ou par `BROKEN` suivi de ce qui a cassé. Une ligne
imprimée se relit un an plus tard et se comprend encore ; un
`expect(x).toBe(y)` rouge, beaucoup moins. Le lanceur compte une suite
comme échouée si elle sort en erreur, si elle imprime `BROKEN`, ou si
une page a levé une exception.

Elles sont **numérotées dans l'ordre où elles ont été écrites**, une ou
deux par fonctionnalité au fur et à mesure : les petits numéros sont le
terrain le plus ancien, les grands le plus récent. Le numéro n'est donc
pas un rang d'importance, c'est une date.

Les captures d'écran atterrissent dans `tests/shots/`, qui n'est pas
suivi par git.

## En ajouter une

Copier la dernière, changer ce qu'elle regarde. Les trois constantes en
tête (`BROWSER`, `SITE`, `SHOTS`) sont ce qui permet à la suite de
tourner aussi bien ici que sur une autre machine : les garder.

## Le site publié

`.github/workflows/pages.yml` publie le dépôt tel quel sur GitHub Pages
à chaque poussée sur `main` — c'est ce qui donne une adresse aux mondes
partagés. Il n'y a rien à construire : l'application est faite de
fichiers que le navigateur ouvre directement.

Pour que cela démarre, il faut activer Pages **une fois** dans les
réglages du dépôt : *Settings → Pages → Source : GitHub Actions*. Le
site apparaît alors à `https://jgottero.github.io/anglais-6eme/`, et
c'est cette adresse-là que les liens de partage porteront.
