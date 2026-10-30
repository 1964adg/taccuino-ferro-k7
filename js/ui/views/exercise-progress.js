// Progressi per esercizio: elenco, grafico nel tempo, record personali, storico.

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as hist from '../../domain/history.js';
import * as stats from '../../domain/stats.js';
import { measureOf } from '../../domain/model.js';
import {
  formatDate, formatWeight, formatVolume, formatNumber, formatClock, formatDistance, kgToDisplay, mToDisplay,
} from '../../format.js';
import { lineChart } from '../charts.js';
import { exerciseIcon } from '../pictograms.js';
import { fmtBest, fmtSet } from '../setformat.js';
import { subnav, periodDays, periodSelect } from './progress-common.js';
import { backLink } from './programs.js';

// Metrica scelta per esercizio (resta finché l'app è aperta)
const chosenMetric = new Map();

// ---------- Elenco ----------

export function renderList(root, ctx) {
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabProgress'))));
  root.append(subnav(ctx, 'exercises'));
  const items = hist.exercisesWithHistory().sort((a, b) => b.lastTs - a.lastTs);
  if (!items.length) {
    root.append(h('p', { class: 'muted' }, t('noHistoryExercises')));
    return;
  }
  root.append(h('div', { class: 'stack' }, items.map(({ exercise: ex, lastTs, count }) => {
    const best = fmtBest(stats.bests(ex.id), measureOf(ex));
    return h('button', { type: 'button', class: 'card card-link', onClick: () => ctx.navigate(`progress/exercise/${ex.id}`) },
      h('div', { class: 'card-row' },
        exerciseIcon(ex, 'md'),
        h('div', { class: 'grow' },
          h('div', { class: 'card-title' }, ex.name),
          h('div', { class: 'card-meta' }, [t('lastDone', { date: formatDate(lastTs, get('dates.shortFormat')) }), t('timesDone', { n: count })].join(' · ')),
          best ? h('div', { class: 'wk-best' }, icon('trophy'), best) : null),
        icon('right', 'chev')));
  })));
}

// ---------- Dettaglio ----------

/** Come mostrare il valore di una metrica. */
function formatterFor(metric) {
  switch (metric) {
    case 'e1rm':
    case 'maxWeight': return (v) => formatWeight(v);
    case 'volume': return (v) => formatVolume(v);
    case 'maxDuration': return (v) => formatClock(v);
    case 'maxDistance': return (v) => formatDistance(v);
    default: return (v) => formatNumber(v, 0);
  }
}

/** Etichette compatte dell'asse verticale, nell'unità scelta. */
function axisFormat(metric, v) {
  switch (metric) {
    case 'e1rm':
    case 'maxWeight': return formatNumber(kgToDisplay(v), 1);
    case 'volume': return formatNumber(kgToDisplay(v), 0);
    case 'maxDuration': return formatClock(v);
    case 'maxDistance': return formatNumber(mToDisplay(v), 1);
    default: return formatNumber(v, 0);
  }
}

export function renderDetail(root, ctx, id) {
  const ex = repo.getExercise(id);
  root.append(backLink(t('progressExercises'), () => ctx.navigate('progress/exercises')));
  if (!ex) { root.append(h('p', { class: 'muted' }, t('noResults'))); return; }
  const refresh = () => ctx.render({ keepScroll: true });

  root.append(h('header', { class: 'page-header' },
    h('div', { class: 'eyebrow' }, [ex.muscleGroup, t('measure_' + ex.measure)].filter(Boolean).join(' · ')),
    h('div', { class: 'wk-title-row' }, exerciseIcon(ex, 'lg'), h('h1', { class: 'page-title' }, ex.name))));

  // Metrica e periodo
  const metrics = hist.metricsFor(ex);
  let metric = chosenMetric.get(id) || get('history.defaultMetric');
  if (!metrics.includes(metric)) metric = metrics[0];
  root.append(h('div', { class: 'chips chips-scroll', role: 'group', 'aria-label': t('trendTitle') }, metrics.map((mt) =>
    h('button', {
      type: 'button', class: 'chip chip-sm' + (mt === metric ? ' active' : ''), 'aria-pressed': mt === metric ? 'true' : 'false',
      onClick: () => { chosenMetric.set(id, mt); refresh(); },
    }, t('metric_' + mt)))));
  root.append(h('div', { class: 'filters' }, periodSelect(refresh)));

  // Grafico (al massimo le ultime N sessioni)
  const points = hist.exerciseSeries(id, metric, { from: hist.periodFrom(periodDays()) }).slice(-get('history.sessionsShown'));
  const fmt = formatterFor(metric);
  const chartCard = h('section', { class: 'card stack' });
  if (!points.length) chartCard.append(h('p', { class: 'muted' }, t('noPointsInPeriod')));
  else {
    chartCard.append(lineChart(points, {
      formatY: (v, axis) => (axis ? axisFormat(metric, v) : fmt(v)),
      formatX: (ts) => formatDate(ts, get('dates.chartDateFormat')),
      formatXLong: (ts) => formatDate(ts),
      label: t('metric_' + metric),
    }));
    if (points.length === 1) chartCard.append(h('p', { class: 'muted small' }, t('onePoint')));
  }
  root.append(chartCard);

  // Record personali
  const rec = hist.exerciseRecords(id);
  const m = measureOf(ex);
  const lines = [];
  const add = (key, value) => { if (rec[key]) lines.push([t('rec_' + key), value, formatDate(rec[key].ts, get('dates.shortFormat'))]); };
  if (m.fields.includes('weight')) {
    add('maxWeight', rec.maxWeight && `${formatWeight(rec.maxWeight.value)} × ${rec.maxWeight.reps ?? 0}`);
    add('e1rm', rec.e1rm && formatWeight(rec.e1rm.value));
  }
  if (m.fields.includes('reps')) {
    add('maxReps', rec.maxReps && formatNumber(rec.maxReps.value, 0));
    add('bestVolume', rec.bestVolume && formatVolume(rec.bestVolume.value));
  }
  if (m.fields.includes('duration')) add('maxDuration', rec.maxDuration && formatClock(rec.maxDuration.value));
  if (m.fields.includes('distance')) add('maxDistance', rec.maxDistance && formatDistance(rec.maxDistance.value));
  if (lines.length) {
    root.append(h('section', { class: 'card' },
      h('div', { class: 'card-eyebrow' }, icon('trophy'), t('records')),
      h('ul', { class: 'plain-list record-list' }, lines.map(([label, value, date]) =>
        h('li', null, h('span', { class: 'grow' }, label), h('strong', null, value), h('span', { class: 'muted small' }, date))))));
  }

  // Storico delle sessioni con questo esercizio
  const sessions = hist.filterSessions({ from: hist.periodFrom(periodDays()), exerciseId: id }).slice(0, get('history.sessionsShown'));
  if (sessions.length) {
    root.append(h('div', { class: 'list-heading' }, t('sessionsOfExercise')));
    root.append(h('div', { class: 'stack' }, sessions.map((s) => {
      const sets = s.entries.filter((e) => e.exerciseId === id).flatMap((e) => e.sets).filter((x) => x.done);
      return h('button', { type: 'button', class: 'card card-link', onClick: () => ctx.navigate(`progress/session/${s.id}`) },
        h('div', { class: 'card-eyebrow' }, `${formatDate(s.startedAt)} · ${s.dayName || ''}`),
        h('div', { class: 'set-chips' }, sets.map((x) => h('span', { class: 'set-chip' + (x.pr ? ' pr' : '') + (x.warmup ? ' warm' : '') }, fmtSet(x, ex)))));
    })));
  }
}
