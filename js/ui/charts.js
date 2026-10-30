// Grafici SVG disegnati a mano (nessuna libreria): linea nel tempo e barre.
// I colori arrivano dalle variabili CSS del tema; le misure dalla configurazione.

import { h } from './dom.js';
import { get } from '../config.js';

const NS = 'http://www.w3.org/2000/svg';
let gradientSeq = 0;

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  children.flat().forEach((c) => c && el.append(c));
  return el;
}

function text(x, y, value, attrs = {}) {
  const el = svg('text', { x, y, ...attrs });
  el.textContent = value;
  return el;
}

/** Valori "tondi" per le linee della griglia. */
function niceTicks(min, max, count) {
  const span = max - min || 1;
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/** Ridisegna il grafico quando cambia la larghezza del contenitore. */
function responsive(draw) {
  const box = h('div', { class: 'chart-box' });
  let lastW = 0;
  const run = () => {
    const w = Math.round(box.clientWidth);
    if (!w || w === lastW) return;
    lastW = w;
    box.replaceChildren(draw(w));
  };
  if ('ResizeObserver' in window) new ResizeObserver(run).observe(box);
  else window.addEventListener('resize', run);
  requestAnimationFrame(run);
  return box;
}

/**
 * Grafico a linea nel tempo.
 * @param {Array<{x:number,y:number}>} points  dal più vecchio al più recente
 * @param {object} o  formatY(v), formatX(ts), formatXLong(ts), label
 */
export function lineChart(points, o) {
  const readout = h('div', { class: 'chart-readout', 'aria-live': 'polite' });
  const showPoint = (p) => {
    readout.replaceChildren(
      h('span', { class: 'chart-readout-value' }, o.formatY(p.y)),
      h('span', { class: 'chart-readout-date' }, o.formatXLong(p.x)));
  };
  if (points.length) showPoint(points[points.length - 1]);

  const box = responsive((W) => {
    const H = get('charts.height');
    const pad = { l: 46, r: 14, t: 14, b: 26 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    let minY = Math.min(...points.map((p) => p.y));
    let maxY = Math.max(...points.map((p) => p.y));
    if (minY === maxY) { minY -= Math.max(1, Math.abs(minY) * 0.1); maxY += Math.max(1, Math.abs(maxY) * 0.1); }
    const ticks = niceTicks(minY, maxY, get('charts.gridLines'));
    minY = Math.min(minY, ticks[0]);
    maxY = Math.max(maxY, ticks[ticks.length - 1]);
    const minX = points[0].x;
    const maxX = points[points.length - 1].x;
    const sx = (x) => pad.l + (maxX === minX ? iw / 2 : ((x - minX) / (maxX - minX)) * iw);
    const sy = (y) => pad.t + ih - ((y - minY) / (maxY - minY || 1)) * ih;

    const gid = 'grad' + (++gradientSeq);
    const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || '' });
    root.append(svg('defs', {}, svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
      svg('stop', { offset: '0%', 'stop-color': 'var(--c-primary)', 'stop-opacity': 0.28 }),
      svg('stop', { offset: '100%', 'stop-color': 'var(--c-primary)', 'stop-opacity': 0 }))));

    // Griglia ed etichette dell'asse verticale
    for (const v of ticks) {
      const y = sy(v);
      root.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: 'chart-grid' }));
      root.append(text(pad.l - 8, y + 4, o.formatY(v, true), { class: 'chart-axis', 'text-anchor': 'end' }));
    }
    // Etichette dell'asse orizzontale: prima, centrale, ultima
    const idx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    idx.forEach((i, k) => {
      const anchor = k === 0 ? 'start' : k === idx.length - 1 ? 'end' : 'middle';
      root.append(text(sx(points[i].x), H - 6, o.formatX(points[i].x), { class: 'chart-axis', 'text-anchor': idx.length === 1 ? 'middle' : anchor }));
    });

    const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    if (points.length > 1) {
      root.append(svg('path', { d: `${d} L${sx(maxX).toFixed(1)},${pad.t + ih} L${sx(minX).toFixed(1)},${pad.t + ih} Z`, fill: `url(#${gid})` }));
      root.append(svg('path', { d, class: 'chart-line', 'stroke-width': get('charts.strokeWidth') }));
    }
    const r = get('charts.dotRadius');
    points.forEach((p) => root.append(svg('circle', { cx: sx(p.x), cy: sy(p.y), r, class: 'chart-dot' })));

    // Selezione al tocco: punto più vicino
    const cursor = svg('line', { y1: pad.t, y2: pad.t + ih, class: 'chart-cursor', visibility: 'hidden' });
    const mark = svg('circle', { r: r + 3, class: 'chart-mark', visibility: 'hidden' });
    root.append(cursor, mark);
    const pick = (ev) => {
      const rect = root.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      let best = points[0];
      for (const p of points) if (Math.abs(sx(p.x) - x) < Math.abs(sx(best.x) - x)) best = p;
      cursor.setAttribute('x1', sx(best.x)); cursor.setAttribute('x2', sx(best.x));
      mark.setAttribute('cx', sx(best.x)); mark.setAttribute('cy', sy(best.y));
      cursor.setAttribute('visibility', 'visible'); mark.setAttribute('visibility', 'visible');
      showPoint(best);
    };
    root.addEventListener('pointerdown', pick);
    root.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'touch') pick(ev); });
    return root;
  });

  return h('div', { class: 'chart-wrap' }, readout, box);
}

/**
 * Grafico a barre.
 * @param {Array<{label:string, value:number, detail:string}>} bars
 * @param {object} o  formatY(v), label
 */
export function barChart(bars, o) {
  const readout = h('div', { class: 'chart-readout', 'aria-live': 'polite' });
  const show = (b) => readout.replaceChildren(
    h('span', { class: 'chart-readout-value' }, o.formatY(b.value)),
    h('span', { class: 'chart-readout-date' }, b.detail || b.label));
  if (bars.length) show(bars[bars.length - 1]);

  const box = responsive((W) => {
    const H = get('charts.height');
    const pad = { l: 8, r: 8, t: 12, b: 26 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const max = Math.max(1, ...bars.map((b) => b.value));
    const slot = iw / bars.length;
    const bw = Math.max(6, slot * 0.62);
    const radius = Math.min(6, bw / 2);
    const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || '' });
    root.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: pad.t + ih, y2: pad.t + ih, class: 'chart-grid' }));
    const rects = [];
    bars.forEach((b, i) => {
      const bh = Math.max(b.value > 0 ? 3 : 0, (b.value / max) * ih);
      const x = pad.l + slot * i + (slot - bw) / 2;
      const rect = svg('rect', {
        x, y: pad.t + ih - bh, width: bw, height: bh, rx: radius,
        class: 'chart-bar' + (i === bars.length - 1 ? ' current' : ''),
      });
      rect.addEventListener('pointerdown', () => {
        rects.forEach((r) => r.classList.remove('selected'));
        rect.classList.add('selected');
        show(b);
      });
      rects.push(rect);
      root.append(rect);
      // Etichette alterne se lo spazio è poco
      if (bars.length <= 8 || i % 2 === (bars.length - 1) % 2) {
        root.append(text(x + bw / 2, H - 8, b.label, { class: 'chart-axis', 'text-anchor': 'middle' }));
      }
    });
    return root;
  });

  return h('div', { class: 'chart-wrap' }, readout, box);
}
