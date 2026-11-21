/* Modèle : hypothèses de la plongée, réglages et calculs.
   Ce fichier n'accède jamais à la page (pas de document, pas de window) :
   il peut donc être testé seul avec Node. */

/* Hypothèses figées de la plongée (m, min, m/min).
   asc : fond -> 1er palier ; asc2 : entre les paliers et vers la surface. */
export const FIX = { depth: 30, bottom: 30, desc: 20, asc: 10, asc2: 6 };

/* Profondeurs de palier possibles, du plus profond au plus proche de la surface. */
export const STOPS = [12, 9, 6, 3];

/* Les 11 réglages. n : nom, g : groupe (perso = symétrique, usine = asymétrique),
   s : durée du palier en minutes à 12, 9, 6 et 3 m (saisie d'après le tableau source). */
const SETTINGS = [
  { n: 'ZHL16C 100-100', g: 'perso', s: [0, 0, 0, 6] },
  { n: 'ZHL16C 90-90', g: 'perso', s: [0, 0, 1, 10] },
  { n: 'ZHL16C 85-85', g: 'perso', s: [0, 0, 2, 11] },
  { n: 'ZHL16C 80-80', g: 'perso', s: [0, 0, 3, 13] },
  { n: 'ZHL16C 75-75', g: 'perso', s: [0, 0, 4, 15] },
  { n: 'ZHL16C 70-70', g: 'perso', s: [0, 0, 6, 18] },
  { n: 'ZHL16C 60-60', g: 'perso', s: [0, 2, 8, 24] },
  { n: 'ZHL16C 45-95', g: 'usine', s: [0, 0, 2, 6] },
  { n: 'ZHL16C 40-85', g: 'usine', s: [0, 2, 4, 9] },
  { n: 'ZHL16C 35-75', g: 'usine', s: [1, 3, 6, 14] },
  { n: 'ZHL16C 30-70', g: 'usine', s: [2, 4, 7, 17] }
];

/* Calcule le profil d'un réglage : points du tracé, total des paliers, DTR, durée totale. */
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

export const PROFILES = SETTINGS.map(function (s, i) { return computeProfile(s, i); });

/* Bornes des axes, calculées pour rester stables quelle que soit la sélection. */
export const XMAX = Math.ceil(Math.max.apply(null, PROFILES.map(function (c) { return c.total; })) / 10) * 10;
export const YMAX = 32;
export const HMAX = Math.ceil(Math.max.apply(null, PROFILES.map(function (c) { return c.stopSum; })) / 10) * 10;

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
