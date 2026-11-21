/* Point d'entrée : charge les données, puis gère l'état de la sélection,
   la mise à jour de la page et le branchement des modules. */
import { PROFILES, initModel } from './model.js';
import { $, buildChips, syncChips, renderTable, initTheme, initShare, initInfo } from './ui.js';
import { initCharts } from './charts.js';
import { initPwa } from './pwa.js';

/* Message affiché à la place de l'appli si les données ne peuvent pas être chargées. */
function showError(e) {
  console.error(e);
  const p = document.createElement('p');
  p.className = 'hint-install';
  p.setAttribute('role', 'alert');
  p.textContent = 'Impossible de charger les données de l’application. Vérifiez votre connexion puis rechargez la page.';
  document.querySelector('.wrap').prepend(p);
}

async function start() {
  const res = await fetch('data/profils.json');
  if (!res.ok) throw new Error('data/profils.json : erreur HTTP ' + res.status);
  initModel(await res.json());

  /* Réglages affichés : 100-100 et 45-95 par défaut, sinon la dernière sélection mémorisée.
     La sélection est mémorisée par NOM (et non par position), pour que l'ajout ou
     l'insertion d'un réglage dans data/profils.json ne décale pas la sélection de chacun. */
  const DEFAUT = ['ZHL16C 100-100', 'ZHL16C 45-95'];
  const idx = function (nom) { return PROFILES.findIndex(function (c) { return c.n === nom; }); };
  const enIndices = function (noms) { return noms.map(idx).filter(function (i) { return i >= 0; }).sort(function (a, b) { return a - b; }); };
  let sel = enIndices(DEFAUT);
  try {
    const sv = JSON.parse(localStorage.getItem('gf-sel-noms'));
    if (Array.isArray(sv)) {
      const l = enIndices(sv);
      if (l.length || !sv.length) sel = l; /* sélection vide mémorisée : on la respecte ; noms tous inconnus : valeurs par défaut */
    }
    localStorage.removeItem('gf-sel'); /* ancien format (positions) */
  } catch (e) { }
  function save() { try { localStorage.setItem('gf-sel-noms', JSON.stringify(sel.map(function (i) { return PROFILES[i].n; }))); } catch (e) { } }

  const charts = initCharts(function () { return sel; });

  function update() {
    syncChips(sel);
    charts.redraw();
    renderTable(sel);
    save();
  }

  buildChips(function (i) {
    const k = sel.indexOf(i);
    if (k >= 0) sel.splice(k, 1); else sel.push(i);
    sel.sort(function (a, b) { return a - b; });
    update();
  });
  $('all').addEventListener('click', function () { sel = PROFILES.map(function (c) { return c.i; }); update(); });
  $('none').addEventListener('click', function () { sel = []; update(); });

  update();
}

/* Le thème, le partage et l'installation n'ont pas besoin des données : on les démarre même si le chargement échoue. */
initTheme();
initShare();
initInfo();
initPwa();
start().catch(showError);
