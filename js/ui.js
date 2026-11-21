/* Interface : puces de sélection, tableau, thème clair/sombre, fenêtre de partage. */
import { PROFILES, fmtMS, shortName } from './model.js';

export const $ = function (id) { return document.getElementById(id); };

/* Petit trait de la couleur du réglage (plein pour les perso, pointillé pour les préréglages usine). */
function swatch(c) {
  return '<svg viewBox="0 0 22 8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke-width="3" stroke-linecap="round" style="stroke:var(--c' + c.i + ')"' + (c.dash ? ' stroke-dasharray="5 3"' : '') + '/></svg>';
}

/* ---------- puces ---------- */
/* onToggle(i) est appelé quand on clique sur la puce du réglage i. */
export function buildChips(onToggle) {
  ['perso', 'usine'].forEach(function (g) {
    const box = $('g-' + g); box.innerHTML = '';
    PROFILES.filter(function (c) { return c.g === g; }).forEach(function (c) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.id = 'chip' + c.i;
      b.style.setProperty('--cc', 'var(--c' + c.i + ')');
      b.innerHTML = swatch(c) + '<span>' + shortName(c) + (c.star ? '*' : '') + '</span>';
      b.addEventListener('click', function () { onToggle(c.i); });
      box.appendChild(b);
    });
  });
}

export function syncChips(sel) {
  PROFILES.forEach(function (c) { $('chip' + c.i).setAttribute('aria-pressed', sel.indexOf(c.i) >= 0 ? 'true' : 'false'); });
}

/* ---------- tableau ---------- */
export function renderTable(sel) {
  if (!sel.length) { $('rows').innerHTML = '<tr><td colspan="8" class="zero">Aucun réglage sélectionné.</td></tr>'; return; }
  $('rows').innerHTML = sel.map(function (i) {
    const c = PROFILES[i];
    const cells = c.s.map(function (v) { return v ? '<td>' + v + '</td>' : '<td class="zero">–</td>'; }).join('');
    return '<tr><td class="nm">' + swatch(c) + '<span>' + shortName(c) + '</span></td>' + cells +
      '<td class="tot">' + c.stopSum + '</td><td class="tot">' + fmtMS(c.dtr) + '</td><td class="tot">' + fmtMS(c.total) + '</td></tr>';
  }).join('');
}

/* ---------- thème ---------- */
/* L'attribut data-theme est posé très tôt par theme-init.js (pour éviter un éclair de la mauvaise couleur). */
export function initTheme() {
  const root = document.documentElement, mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function effTheme() { const a = root.getAttribute('data-theme'); return a === 'dark' || a === 'light' ? a : (mq && mq.matches ? 'dark' : 'light'); }
  function syncTheme() { const t = effTheme(); $('th-light').setAttribute('aria-pressed', t === 'light'); $('th-dark').setAttribute('aria-pressed', t === 'dark'); }
  function setTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('gf-theme', t); } catch (e) { } syncTheme(); }
  $('th-light').addEventListener('click', function () { setTheme('light'); });
  $('th-dark').addEventListener('click', function () { setTheme('dark'); });
  if (mq && mq.addEventListener) mq.addEventListener('change', syncTheme);
  syncTheme();
}

/* ---------- partage : fenêtre avec QR code, copier l'image / le lien ---------- */
export function initShare() {
  const dlg = $('share-dlg'), shBtn = $('share-open');
  const qrBtn = $('qr-copy'), lkBtn = $('link-copy'), msg = $('share-msg');
  let mt;
  function say(t) { msg.textContent = t; clearTimeout(mt); mt = setTimeout(function () { msg.textContent = ''; }, 2500); }

  /* icône de partage selon la plateforme : carré + flèche chez Apple, trois points ailleurs */
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) {
    shBtn.querySelector('.ic-android').setAttribute('hidden', ''); shBtn.querySelector('.ic-apple').removeAttribute('hidden');
  }
  if (dlg && dlg.showModal) {
    shBtn.hidden = false;
    shBtn.addEventListener('click', function () { dlg.showModal(); });
    $('share-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { msg.textContent = ''; });
  }
  const clip = navigator.clipboard;
  if (clip && window.ClipboardItem && clip.write) {
    qrBtn.hidden = false;
    qrBtn.addEventListener('click', function () {
      const img = $('qr'), c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
      const blob = new Promise(function (res) { c.toBlob(res, 'image/png'); });
      clip.write([new ClipboardItem({ 'image/png': blob })]).then(function () { say('Image copiée'); }, function () { say('Copie impossible : utilisez Télécharger'); });
    });
  }
  if (clip && clip.writeText) {
    lkBtn.hidden = false;
    lkBtn.addEventListener('click', function () {
      clip.writeText(location.origin + location.pathname).then(function () { say('Lien copié'); }, function () { say('Copie impossible'); });
    });
  }
}

/* ---------- bulles d'aide « i » (petits écrans) : affichent ou masquent l'explication d'un bloc.
   Sur grand écran, les « i » sont cachés par le CSS et les textes sont toujours visibles. ---------- */
export function initInfo() {
  document.querySelectorAll('.info').forEach(function (b) {
    const box = $(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      const open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}
