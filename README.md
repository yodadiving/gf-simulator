# GF Simulator

Une application simple pour visualiser l'effet des gradient factors ZHL-16C, symétriques et asymétriques, sur un profil de plongée : courbes de remontée, durée des paliers, durée totale de remontée (DTR).

**Utiliser l'application : https://yodadiving.github.io/gf-simulator/**

Elle s'installe comme une application (ordinateur, tablette, téléphone) et fonctionne hors ligne. À chaque lancement, elle vérifie s'il existe une nouvelle version et la télécharge avant de s'ouvrir.

> **Outil pédagogique.** Les profils sont schématiques (une plongée de 30 m pendant 30 min, remontée à 10 m/min jusqu'au premier palier, puis 6 m/min) et ne remplacent ni un ordinateur de plongée ni une planification de plongée.

## Lancer en local

Le site est statique : aucune installation, aucun outil de construction. Il faut seulement un petit serveur, car les navigateurs refusent de charger des modules JavaScript depuis un fichier ouvert par double-clic.

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000/. Sur `localhost`, le service worker et l'installation fonctionnent comme en https.

Si une modification ne s'affiche pas, le service worker sert peut-être une copie : recharger avec `Ctrl+Maj+R`, ou cocher « Update on reload » dans les outils de développement (F12), onglet « Application ».

## Tests

Les calculs (durées de paliers, DTR, durée de plongée, tracé, validation des données) sont testés avec le lanceur de tests intégré à Node, sans rien installer :

```
node --test
```

(ou `npm test`). Les valeurs attendues ont été établies à la main, indépendamment du code.

## Organisation du code

```
index.html               structure de la page
css/style.css            couleurs (thèmes clair et sombre), mise en page
js/
  main.js                point d'entrée : charge les données, assemble tout
  model.js               calculs purs (profil, DTR, formats), sans accès à la page
  charts.js              graphiques SVG et info-bulles
  ui.js                  puces, tableau, thème, fenêtre de partage
  pwa.js                 service worker et bouton « Installer »
  theme-init.js          applique le thème avant l'affichage
data/profils.json        hypothèses de la plongée et les réglages (gradient factors)
manifest.webmanifest     nom, icônes et affichage de l'application installée
sw.js                    service worker : usage hors ligne et mise à jour au lancement
icons/                   icônes de l'application et logo Yoda Diving
qrcode.png               QR code vers l'application (1080 px, pour imprimer)
qrcode-600.png           le même, en version légère affichée dans la page
tests/model.test.mjs     tests du calcul
```

## Modifier les données

Tout est dans `data/profils.json` :

- `plongee` : profondeur, temps au fond, vitesses (descente, remontée jusqu'au premier palier, remontée ensuite).
- `profondeursPaliers` : les profondeurs de palier, de la plus profonde à la plus proche de la surface.
- `reglages` : un par réglage, avec son `nom`, son `groupe` (`perso` pour les gradient factors symétriques, `usine` pour les asymétriques : le nom du groupe est historique), et les durées de `paliers` en minutes, dans l'ordre de `profondeursPaliers`. Le champ facultatif `"prereglageUsine": true` marque les préréglages usine d'ordinateurs de plongée (ils reçoivent un astérisque dans la page, expliqué par une note).

Le fichier est vérifié au chargement : une erreur (durée manquante, groupe inconnu…) affiche un message clair dans la console du navigateur et un avertissement dans la page. Après toute modification, lancer `node --test` : il faut mettre à jour les valeurs attendues du test si les durées changent volontairement.

**Ajouter un réglage** : ajouter une entrée à `reglages`, au bon endroit : les réglages `perso` d'abord (du plus clair au plus foncé), puis les `usine`. Les couleurs sont attribuées par position : `--c0` à `--c7` (8 bleus) pour les symétriques et `--c8` à `--c11` (4 oranges) pour les asymétriques, dans les trois blocs de variables de `css/style.css` (thème clair, sombre automatique, sombre choisi à la main). Ajouter un réglage demande donc d'ajouter ou de décaler une couleur `--cN` dans ces trois blocs. Un test (`node --test`) vérifie que les symétriques précèdent les asymétriques ; la sélection mémorisée dans le navigateur l'est par nom, donc insérer un réglage ne la perturbe pas.

**Limites connues** : les profondeurs de palier (12, 9, 6, 3 m) et la profondeur du fond sont aussi écrites dans `index.html` (en-têtes du tableau, légende de l'histogramme) et dans `js/charts.js` (repères du graphique, axe fixé à 32 m via `YMAX` dans `js/model.js`). Changer le nombre ou la valeur des paliers, ou la profondeur de la plongée, demande donc de modifier aussi ces endroits.

## Publier

Le site est publié par GitHub Pages (branche `main`, dossier racine). Chaque `git push` sur `main` met le site à jour en une à deux minutes ; les appareils qui ont installé l'application récupèrent la nouvelle version à leur lancement suivant.

Si un fichier est ajouté au projet (script, image, données…), l'ajouter aussi à la liste `FILES` de `sw.js`, pour qu'il soit disponible hors ligne.

## Licence

GNU General Public License v3.0 : voir [LICENSE](LICENSE).
