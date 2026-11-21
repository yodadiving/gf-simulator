/* Graphiques SVG dessinés à la main : profil profondeur/temps et histogramme des paliers,
   avec leurs info-bulles. getSel() renvoie la liste des réglages affichés. */
import { PROFILES, XMAX, YMAX, HMAX, depthAt, fmt, shortName } from './model.js';
import { $ } from './ui.js';

export function initCharts(getSel) {
  /* ---------- profil ---------- */
  const chart = $('chart'), plot = $('plot'), cur = $('cursor'), tip = $('tip');
  let geo = {};

  function draw() {
    const sel = getSel();
    const w = Math.max(280, chart.clientWidth), h = w < 560 ? 340 : 440;
    const m = { t: 30, r: 16, b: 12, l: 48 };
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const X = function (t) { return m.l + t / XMAX * iw; }, Y = function (d) { return m.t + d / YMAX * ih; };
    geo = { w: w, h: h, m: m, iw: iw, ih: ih, X: X, Y: Y };
    let s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Profils de plongée : ' +
      (sel.length ? sel.map(function (i) { return PROFILES[i].n; }).join(', ') : 'aucun réglage sélectionné') + '. Les valeurs sont dans le tableau ci-dessous.">';
    s += '<rect x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '" rx="4" style="fill:var(--water)"/>';
    for (let t = 0; t <= XMAX; t += 10) {
      s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + m.t + '" y2="' + (m.t + ih) + '" style="stroke:var(--grid)" stroke-width="1"/>';
      s += '<text class="t-axis" x="' + X(t) + '" y="' + (m.t - 10) + '" text-anchor="middle" style="fill:var(--muted)">' + t + '</text>';
    }
    s += '<text class="t-axis" x="' + (m.l - 8) + '" y="' + (m.t - 10) + '" text-anchor="end" style="fill:var(--muted)">min</text>';
    [3, 6, 9, 12, 30].forEach(function (d) {
      s += '<line x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + Y(d) + '" y2="' + Y(d) + '" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 4"/>';
    });
    [0, 3, 6, 9, 12, 30].forEach(function (d) {
      s += '<text class="t-axis" x="' + (m.l - 8) + '" y="' + (Y(d) + 4) + '" text-anchor="end" style="fill:var(--muted)">' + d + ' m</text>';
    });
    s += '<line x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" style="stroke:var(--muted)" stroke-width="1.5"/>';
    sel.forEach(function (i) {
      const c = PROFILES[i];
      const d = c.pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('');
      s += '<path d="' + d + '" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="stroke:var(--c' + i + ')"' + (c.dash ? ' stroke-dasharray="' + c.dash + '"' : '') + '/>';
    });
    sel.forEach(function (i) {
      const e = PROFILES[i].pts[PROFILES[i].pts.length - 1];
      s += '<circle cx="' + X(e[0]) + '" cy="' + Y(0) + '" r="4.5" stroke-width="2" style="fill:var(--c' + i + ');stroke:var(--card)"/>';
    });
    s += '</svg>';
    plot.innerHTML = s;
    const old = chart.querySelector('.empty'); if (old) old.remove();
    if (!sel.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = 'Sélectionnez au moins un réglage pour afficher sa courbe.'; chart.appendChild(e);
    }
    cur.setAttribute('width', w); cur.setAttribute('height', h); cur.innerHTML = '';
    tip.hidden = true;
  }

  function showAt(clientX) {
    const sel = getSel();
    if (!sel.length) return;
    const r = chart.getBoundingClientRect(), g = geo;
    let x = clientX - r.left;
    x = Math.max(g.m.l, Math.min(g.m.l + g.iw, x));
    const t = (x - g.m.l) / g.iw * XMAX;
    let cs = '<line x1="' + x + '" x2="' + x + '" y1="' + g.m.t + '" y2="' + (g.m.t + g.ih) + '" style="stroke:var(--ink)" stroke-width="1" opacity=".55"/>';
    let rows = '';
    sel.forEach(function (i) {
      const c = PROFILES[i], q = depthAt(c, t);
      cs += '<circle cx="' + x + '" cy="' + g.Y(q.d) + '" r="4.5" stroke-width="2" style="fill:var(--c' + i + ');stroke:var(--card)"/>';
      const label = q.end ? 'en surface' : fmt(q.d) + ' m' + (q.flat ? ' · palier' : '');
      rows += '<div><span><i style="background:var(--c' + i + ')"></i>' + shortName(c) + '</span><span>' + label + '</span></div>';
    });
    cur.innerHTML = cs;
    tip.innerHTML = '<b>' + fmt(t) + ' min</b>' + rows;
    tip.hidden = false;
    const tw = tip.offsetWidth, left = x > g.w / 2 ? x - tw - 12 : x + 12;
    tip.style.left = Math.max(4, Math.min(g.w - tw - 4, left)) + 'px';
    tip.style.top = (g.m.t + 8) + 'px';
  }
  chart.addEventListener('pointermove', function (e) { showAt(e.clientX); });
  chart.addEventListener('pointerdown', function (e) { showAt(e.clientX); });
  chart.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { tip.hidden = true; cur.innerHTML = ''; } });

  /* ---------- histogramme empilé des paliers ---------- */
  const hist = $('hist'), hplot = $('hplot'), htip = $('htip');
  let hgeo = {};

  function drawHist() {
    const sel = getSel();
    const w = Math.max(280, hist.clientWidth), h = w < 560 ? 320 : 360, n = sel.length;
    const band = n ? (w - 44 - 12) / n : 0, rot = band < 64;
    const m = { t: 24, r: 12, b: rot ? 62 : 40, l: 44 };
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const Y = function (v) { return m.t + ih - v / HMAX * ih; };
    const bw = n ? Math.min(54, iw / n * 0.62) : 0;
    hgeo = { w: w, m: m, iw: iw, n: n };
    let s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Histogramme empilé des durées de paliers par réglage. Les valeurs sont dans le tableau ci-dessous.">';
    for (let v = 0; v <= HMAX; v += 10) {
      s += '<line x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" style="stroke:' + (v ? 'var(--grid)' : 'var(--muted)') + '" stroke-width="1"/>';
      s += '<text class="t-axis" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" style="fill:var(--muted)">' + v + '</text>';
    }
    s += '<text class="t-axis" x="' + (m.l - 8) + '" y="' + (m.t - 10) + '" text-anchor="end" style="fill:var(--muted)">min</text>';
    sel.forEach(function (i, k) {
      const c = PROFILES[i], cx = m.l + iw / n * (k + 0.5), x0 = cx - bw / 2;
      let acc = 0;
      [0, 1, 2, 3].forEach(function (j) {
        const v = c.s[j]; if (!v) return;
        const y1 = Y(acc + v), y0 = Y(acc), hh = y0 - y1;
        s += '<rect x="' + x0 + '" y="' + y1 + '" width="' + bw + '" height="' + hh + '" rx="2" stroke-width="2" style="fill:var(--h' + j + ');stroke:var(--card)"/>';
        if (hh >= 16) s += '<text x="' + cx + '" y="' + (y1 + hh / 2 + 4) + '" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--hl' + j + ')">' + v + '</text>';
        acc += v;
      });
      s += '<text x="' + cx + '" y="' + (Y(acc) - 6) + '" text-anchor="middle" font-size="12.5" font-weight="700" style="fill:var(--ink)">' + acc + '</text>';
      s += '<line x1="' + (cx - bw / 2) + '" x2="' + (cx + bw / 2) + '" y1="' + (m.t + ih + 5) + '" y2="' + (m.t + ih + 5) + '" stroke-width="3" stroke-linecap="round" style="stroke:var(--c' + i + ')"' + (c.dash ? ' stroke-dasharray="5 3"' : '') + '/>';
      const lab = shortName(c);
      if (rot) s += '<text class="t-axis" transform="translate(' + (cx + 4) + ',' + (m.t + ih + 20) + ') rotate(-40)" text-anchor="end" style="fill:var(--ink)">' + lab + '</text>';
      else s += '<text class="t-axis" x="' + cx + '" y="' + (m.t + ih + 24) + '" text-anchor="middle" style="fill:var(--ink)">' + lab + '</text>';
    });
    s += '</svg>';
    hplot.innerHTML = s;
    const old = hist.querySelector('.empty'); if (old) old.remove();
    if (!n) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Sélectionnez au moins un réglage pour afficher ses paliers.'; hist.appendChild(e); }
    htip.hidden = true;
  }

  function hshow(clientX) {
    const sel = getSel();
    if (!hgeo.n) return;
    const r = hist.getBoundingClientRect(), g = hgeo;
    const x = clientX - r.left;
    if (x < g.m.l || x > g.m.l + g.iw) { htip.hidden = true; return; }
    const k = Math.min(g.n - 1, Math.floor((x - g.m.l) / g.iw * g.n)), c = PROFILES[sel[k]];
    const rows = [12, 9, 6, 3].map(function (d, j) { return c.s[j] ? '<div><span><i style="background:var(--h' + j + ')"></i>' + d + ' m</span><span>' + c.s[j] + ' min</span></div>' : ''; }).join('');
    htip.innerHTML = '<b>' + c.n + '</b>' + rows + '<div><span>Total paliers</span><span><b style="display:inline;margin:0">' + c.stopSum + ' min</b></span></div>';
    htip.hidden = false;
    const cx = g.m.l + g.iw / g.n * (k + 0.5), tw = htip.offsetWidth, left = cx > g.w / 2 ? cx - tw - 30 : cx + 30;
    htip.style.left = Math.max(4, Math.min(g.w - tw - 4, left)) + 'px'; htip.style.top = '24px';
  }
  hist.addEventListener('pointermove', function (e) { hshow(e.clientX); });
  hist.addEventListener('pointerdown', function (e) { hshow(e.clientX); });
  hist.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') htip.hidden = true; });

  /* ---------- redessin ---------- */
  function redraw() { draw(); drawHist(); }

  let last = chart.clientWidth;
  function onResize() { if (chart.clientWidth !== last) { last = chart.clientWidth; redraw(); } }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(chart); else window.addEventListener('resize', onResize);

  return { redraw: redraw };
}
