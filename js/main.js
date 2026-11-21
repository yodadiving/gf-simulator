/* Point d'entrée : charge les données, puis gère l'état de la sélection,
   la mise à jour de la page et le branchement des modules. */
import { PROFILES, initModel } from './model.js';
import { $, buildChips, syncChips, renderTable, initTheme, initShare } from './ui.js';
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

  /* réglages affichés : [100-100, 45-95] par défaut, sinon la dernière sélection mémorisée */
  let sel = [0, 7];
  try {
    const sv = JSON.parse(localStorage.getItem('gf-sel'));
    if (Array.isArray(sv) && sv.every(function (i) { return PROFILES[i]; })) sel = sv;
  } catch (e) { }
  function save() { try { localStorage.setItem('gf-sel', JSON.stringify(sel)); } catch (e) { } }

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
initPwa();
start().catch(showError);
