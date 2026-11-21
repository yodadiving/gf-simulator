/* Modèle : hypothèses de la plongée, réglages et calculs.
   Ce fichier n'accède jamais à la page (pas de document, pas de window, pas de fetch) :
   il peut donc être testé seul avec Node. Les données viennent de data/profils.json,
   chargé par main.js puis transmis à initModel(). */

/* Remplis par initModel(). Les autres modules les importent : grâce aux « live bindings »
   des modules ES, ils voient les valeurs dès que initModel() a été appelé. */

/* Hypothèses de la plongée (m, min, m/min).
   asc : fond -> 1er palier ; asc2 : entre les paliers et vers la surface. */
export let FIX;

/* Profondeurs de palier possibles, du plus profond au plus proche de la surface. */
export let STOPS;

/* Un profil par réglage (voir computeProfile). */
export let PROFILES;

/* Bornes des axes, calculées pour rester stables quelle que soit la sélection. */
export let XMAX, YMAX, HMAX;

function checkData(data) {
  const fail = function (msg) { throw new Error('data/profils.json : ' + msg); };
  const p = data && data.plongee;
  if (!p) fail('« plongee » manquant');
  ['profondeur', 'tempsAuFond', 'vitesseDescente', 'vitesseRemonteeJusquAuPremierPalier', 'vitesseRemonteeEntrePaliersEtVersSurface'].forEach(function (k) {
    if (!(p[k] > 0)) fail('« plongee.' + k + ' » doit être un nombre positif');
  });
  if (!Array.isArray(data.profondeursPaliers) || !data.profondeursPaliers.length) fail('« profondeursPaliers » manquant');
  if (!Array.isArray(data.reglages) || !data.reglages.length) fail('« reglages » manquant');
  data.reglages.forEach(function (r, i) {
    const nom = r && r.nom ? r.nom : '#' + (i + 1);
    if (!r || !r.nom) fail('le réglage #' + (i + 1) + ' n\'a pas de « nom »');
    if (r.groupe !== 'perso' && r.groupe !== 'usine') fail(nom + ' : « groupe » doit valoir "perso" ou "usine"');
    if (!Array.isArray(r.paliers) || r.paliers.length !== data.profondeursPaliers.length ||
        !r.paliers.every(function (v) { return typeof v === 'number' && v >= 0; })) {
      fail(nom + ' : « paliers » doit contenir ' + data.profondeursPaliers.length + ' durées (nombres >= 0)');
    }
  });
}

/* Calcule le profil d'un réglage : points du tracé, total des paliers, DTR, durée totale.
   setting : { n: nom, g: groupe, s: durées des paliers } */
export function computeProfile(setting, i, fix = FIX, stops = STOPS) {
  const c = { ...setting, i, dash: setting.g === 'usine' ? '7 4' : '' };
  let t = fix.depth / fix.desc;
  let d = fix.depth;
  const p = [[0, 0], [t, d]];
  t = fix.bottom;
  p.push([t, d]);
  stops.forEach(function (sd, k) {
    if (c.s[k] > 0) {
      t += (d - sd) / (d === fix.depth ? fix.asc : fix.asc2);
      d = sd;
      p.push([t, d]);
      t += c.s[k];
      p.push([t, d]);
    }
  });
  t += d / (d === fix.depth ? fix.asc : fix.asc2);
  p.push([t, 0]);
  c.pts = p;
  c.total = t;
  c.stopSum = c.s.reduce(function (a, b) { return a + b; }, 0);
  /* DTR : fond -> 1er palier à asc, paliers, puis trajets entre paliers et vers la surface à asc2 */
  const k1 = c.s.findIndex(function (v) { return v > 0; });
  const d1 = k1 >= 0 ? stops[k1] : 0;
  c.dtr = (fix.depth - d1) / fix.asc + c.stopSum + d1 / fix.asc2;
  return c;
}

/* À appeler une fois, avec le contenu de data/profils.json. */
export function initModel(data) {
  checkData(data);
  const p = data.plongee;
  FIX = {
    depth: p.profondeur,
    bottom: p.tempsAuFond,
    desc: p.vitesseDescente,
    asc: p.vitesseRemonteeJusquAuPremierPalier,
    asc2: p.vitesseRemonteeEntrePaliersEtVersSurface
  };
  STOPS = data.profondeursPaliers.slice();
  PROFILES = data.reglages.map(function (r, i) {
    return computeProfile({ n: r.nom, g: r.groupe, s: r.paliers }, i, FIX, STOPS);
  });
  XMAX = Math.ceil(Math.max.apply(null, PROFILES.map(function (c) { return c.total; })) / 10) * 10;
  YMAX = 32;
  HMAX = Math.ceil(Math.max.apply(null, PROFILES.map(function (c) { return c.stopSum; })) / 10) * 10;
}

/* Profondeur d'un profil à l'instant t (pour l'info-bulle). */
export function depthAt(c, t) {
  const p = c.pts;
  if (t >= p[p.length - 1][0]) return { d: 0, end: true };
  for (let k = 1; k < p.length; k++) {
    if (t <= p[k][0]) {
      const a = p[k - 1], b = p[k], f = (t - a[0]) / (b[0] - a[0] || 1);
      return {
        d: a[1] + (b[1] - a[1]) * f,
        flat: a[1] === b[1] && a[1] < FIX.depth && a[1] > 0,
        bottom: a[1] === b[1] && a[1] === FIX.depth
      };
    }
  }
  return { d: 0 };
}

/* Formats d'affichage. */
export const fmt = function (n) { return (Math.round(n * 10) / 10).toLocaleString('fr-FR'); };
export const fmtMS = function (n) {
  const s = Math.round(n * 60), m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
};
export const shortName = function (c) { return c.n.replace('ZHL16C ', ''); };
