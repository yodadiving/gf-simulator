/* Point d'entrée : état de la sélection, mise à jour de la page, branchement des modules. */
import { PROFILES } from './model.js';
import { $, buildChips, syncChips, renderTable, initTheme, initShare } from './ui.js';
import { initCharts } from './charts.js';
import { initPwa } from './pwa.js';

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

initTheme();
initShare();
initPwa();
update();
