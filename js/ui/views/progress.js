// Progressi: riepilogo settimanale/mensile e instradamento verso le altre schermate.
// Indirizzi: #/progress, #/progress/history, #/progress/session/<id>,
//            #/progress/exercises, #/progress/exercise/<id>, #/progress/body

import { h } from '../dom.js';
import { t, get } from '../../config.js';
import * as hist from '../../domain/history.js';
import { formatDate, formatDuration, formatVolume, formatNumber } from '../../format.js';
import { segmented } from '../components.js';
import { barChart } from '../charts.js';
import { subnav, statTile } from './progress-common.js';
import * as historyView from './history.js';
import * as exView from './exercise-progress.js';
import * as bodyView from './body.js';

// Scelte fatte a schermo (restano finché l'app è aperta)
let kind = null;
let metric = null;

export function render(root, ctx) {
  ctx.setFullscreen(false);
  const [a, b] = ctx.params;
  if (a === 'history') return historyView.renderList(root, ctx);
  if (a === 'session' && b) return historyView.renderSession(root, ctx, b);
  if (a === 'exercises') return exView.renderList(root, ctx);
  if (a === 'exercise' && b) return exView.renderDetail(root, ctx, b);
  if (a === 'body') return bodyView.render(root, ctx);
  return renderSummary(root, ctx);
}

function renderSummary(root, ctx) {
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabProgress'))));
  root.append(subnav(ctx, 'summary'));

  const k = kind || get('history.summaryKind');
  const mt = metric || get('history.summaryMetric');
  const periods = hist.lastPeriods(k, get('history.summaryPeriods'));
  const summaries = periods.map((p) => hist.periodSummary(p.start, p.end));
  const cur = summaries[summaries.length - 1];

  root.append(segmented([{ value: 'week', label: t('week') }, { value: 'month', label: t('month') }], k,
    (v) => { kind = v; ctx.render({ keepScroll: true }); }, t('periodLabel')));

  // Periodo corrente
  const pct = cur.consistency == null ? '—' : `${Math.round(cur.consistency * 100)}%`;
  root.append(h('section', { class: 'card' },
    h('div', { class: 'card-eyebrow' }, k === 'week' ? t('thisWeek') : t('thisMonth')),
    h('div', { class: 'stats-row cols-2' },
      statTile(String(cur.workouts), t('workouts')),
      statTile(pct, t('consistency'), cur.planned ? t('consistencyDetail', { done: cur.trainedDays, planned: cur.planned }) : null),
      statTile(formatVolume(cur.volume), t('totalVolume')),
      statTile(formatDuration(cur.durationSec), t('totalTime')),
    ),
  ));

  // Andamento degli ultimi periodi
  const label = (p) => formatDate(p.start, get(k === 'week' ? 'dates.weekLabelFormat' : 'dates.monthLabelFormat'));
  const detail = (s) => (k === 'week'
    ? `${formatDate(s.start, get('dates.shortFormat'))} – ${formatDate(s.end - 1, get('dates.shortFormat'))}`
    : formatDate(s.start, get('dates.monthLongFormat')));
  const bars = summaries.map((s, i) => ({
    label: label(periods[i]),
    value: mt === 'volume' ? s.volume : s.workouts,
    detail: `${detail(s)} · ${s.workouts} ${t('workouts').toLowerCase()}`,
  }));
  root.append(h('section', { class: 'card stack' },
    h('div', { class: 'card-row' },
      h('div', { class: 'card-eyebrow grow' }, t('trendTitle')),
      segmented([{ value: 'workouts', label: t('workouts') }, { value: 'volume', label: t('volume') }], mt,
        (v) => { metric = v; ctx.render({ keepScroll: true }); }, t('trendTitle'))),
    barChart(bars, {
      formatY: (v) => (mt === 'volume' ? formatVolume(v) : formatNumber(v, 0)),
      label: t('trendTitle'),
    }),
  ));

  // Media sul periodo mostrato
  const tot = summaries.reduce((acc, s) => ({ w: acc.w + s.workouts, v: acc.v + s.volume }), { w: 0, v: 0 });
  root.append(h('section', { class: 'card' },
    h('div', { class: 'stats-row cols-2' },
      statTile(formatNumber(tot.w / summaries.length, 1), `${t('workouts')} / ${(k === 'week' ? t('week') : t('month')).toLowerCase()}`),
      statTile(tot.w ? formatVolume(tot.v / tot.w) : '—', `${t('volume')} ${t('perWorkout')}`),
    )));
}
