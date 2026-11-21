/* Tests du calcul (js/model.js). Aucune installation : `node --test` ou `npm test`.
   Les valeurs attendues ci-dessous ont été établies à la main, indépendamment du code :
   DTR = (30 - profondeur du 1er palier) / 10 + total des paliers + (profondeur du 1er palier) / 6
   Durée de plongée = 30 min au fond + DTR. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as m from '../js/model.js';

const DATA = JSON.parse(readFileSync(new URL('../data/profils.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(DATA);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, (msg || '') + ' : ' + a + ' ≠ ' + b);

m.initModel(DATA);
const byName = (nom) => m.PROFILES.find((c) => c.n === 'ZHL16C ' + nom);

/* réglage : [total des paliers (min), DTR (m:ss), durée de plongée (m:ss)] */
const ATTENDU = {
  '100-100': [6, '9:12', '39:12'],
  '90-90': [11, '14:24', '44:24'],
  '85-85': [13, '16:24', '46:24'],
  '80-80': [16, '19:24', '49:24'],
  '75-75': [19, '22:24', '52:24'],
  '70-70': [24, '27:24', '57:24'],
  '60-60': [34, '37:36', '67:36'],
  '45-95': [8, '11:24', '41:24'],
  '40-85': [15, '18:36', '48:36'],
  '35-75': [24, '27:48', '57:48'],
  '30-70': [30, '33:48', '63:48']
};

test('les 11 réglages attendus sont présents, dans cet ordre', () => {
  assert.deepEqual(m.PROFILES.map((c) => c.n.replace('ZHL16C ', '')), Object.keys(ATTENDU));
});

for (const [nom, [paliers, dtr, total]] of Object.entries(ATTENDU)) {
  test(`${nom} : paliers ${paliers} min, DTR ${dtr}, plongée ${total}`, () => {
    const c = byName(nom);
    assert.equal(c.stopSum, paliers);
    assert.equal(m.fmtMS(c.dtr), dtr);
    assert.equal(m.fmtMS(c.total), total);
  });
}

test('durée de plongée = temps au fond + DTR, pour tous les réglages', () => {
  for (const c of m.PROFILES) near(c.total, m.FIX.bottom + c.dtr, c.n);
});

test('hypothèses : 30 m, 30 min, 20 m/min, 10 puis 6 m/min', () => {
  assert.deepEqual(m.FIX, { depth: 30, bottom: 30, desc: 20, asc: 10, asc2: 6 });
  assert.deepEqual(m.STOPS, [12, 9, 6, 3]);
});

test('bornes des axes stables : temps 0-70 min, paliers 0-40 min', () => {
  assert.equal(m.XMAX, 70);
  assert.equal(m.HMAX, 40);
});

test('100-100 : fond à 30 m, un seul palier à 3 m, les paliers de 0 min sont ignorés', () => {
  const c = byName('100-100');
  const attendu = [[0, 0], [1.5, 30], [30, 30], [32.7, 3], [38.7, 3], [39.2, 0]];
  assert.equal(c.pts.length, attendu.length);
  c.pts.forEach((p, k) => { near(p[0], attendu[k][0], 'temps du point ' + k); near(p[1], attendu[k][1], 'profondeur du point ' + k); });
});

test('45-95 : 10 m/min jusqu\'au palier de 6 m, puis 6 m/min jusqu\'à la surface', () => {
  const c = byName('45-95');
  const attendu = [[0, 0], [1.5, 30], [30, 30], [32.4, 6], [34.4, 6], [34.9, 3], [40.9, 3], [41.4, 0]];
  assert.equal(c.pts.length, attendu.length);
  c.pts.forEach((p, k) => { near(p[0], attendu[k][0], 'temps du point ' + k); near(p[1], attendu[k][1], 'profondeur du point ' + k); });
});

test('sans aucun palier : toute la remontée à 10 m/min', () => {
  const c = m.computeProfile({ n: 'sans palier', g: 'perso', s: [0, 0, 0, 0] }, 0, m.FIX, m.STOPS);
  assert.equal(c.stopSum, 0);
  near(c.dtr, 3, 'DTR');
  near(c.total, 33, 'durée de plongée');
});

test('depthAt : fond, palier, surface', () => {
  const c = byName('100-100');
  near(m.depthAt(c, 15).d, 30, 'au fond');
  const pal = m.depthAt(c, 35);
  near(pal.d, 3, 'au palier');
  assert.equal(pal.flat, true);
  assert.deepEqual(m.depthAt(c, 100), { d: 0, end: true });
});

test('fmtMS : arrondi à la seconde, minutes et secondes', () => {
  assert.equal(m.fmtMS(9.2), '9:12');
  assert.equal(m.fmtMS(0.5), '0:30');
  assert.equal(m.fmtMS(10.55), '10:33');
  assert.equal(m.fmtMS(1.9999), '2:00');
});

test('fmt : une décimale, virgule française', () => {
  assert.equal(m.fmt(39.2).replace(/\s/g, ''), '39,2');
});

test('les données du fichier sont valides', () => {
  assert.doesNotThrow(() => m.initModel(clone()));
  const noms = DATA.reglages.map((r) => r.nom);
  assert.equal(new Set(noms).size, noms.length, 'noms de réglage uniques');
});

test('données invalides refusées avec un message clair', () => {
  const casses = [
    ['plongee manquant', (d) => { delete d.plongee; }, /plongee/],
    ['vitesse nulle', (d) => { d.plongee.vitesseDescente = 0; }, /vitesseDescente/],
    ['pas de réglages', (d) => { d.reglages = []; }, /reglages/],
    ['nombre de paliers incorrect', (d) => { d.reglages[2].paliers = [1, 2]; }, /ZHL16C 85-85.*4 durées/],
    ['durée négative', (d) => { d.reglages[0].paliers[3] = -1; }, /ZHL16C 100-100/],
    ['durée non numérique', (d) => { d.reglages[0].paliers[3] = '6'; }, /ZHL16C 100-100/],
    ['groupe inconnu', (d) => { d.reglages[1].groupe = 'autre'; }, /groupe/],
    ['nom manquant', (d) => { delete d.reglages[3].nom; }, /nom/]
  ];
  for (const [libelle, abime, motif] of casses) {
    const d = clone();
    abime(d);
    assert.throws(() => m.initModel(d), motif, libelle);
  }
  m.initModel(DATA); /* remet le modèle en état pour les tests suivants */
});
