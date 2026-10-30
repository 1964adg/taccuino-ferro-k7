// Peso corporeo: andamento, registrazioni modificabili, nuova registrazione.

import { h } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as hist from '../../domain/history.js';
import { uid, now } from '../../util.js';
import { formatDate, formatWeight, formatNumber, kgToDisplay, displayToKg, weightUnit } from '../../format.js';
import { button, stepper, openSheet, toast, safe } from '../components.js';
import { lineChart } from '../charts.js';
import { subnav, periodDays, periodSelect, statTile } from './progress-common.js';

/** "2026-10-30" per <input type="date">, nel fuso orario locale. */
function toDateInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function render(root, ctx) {
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabProgress'))));
  root.append(subnav(ctx, 'body'));
  const refresh = () => ctx.render({ keepScroll: true });

  root.append(button(t('bodyweightAdd'), { variant: 'primary', iconName: 'plus', className: 'btn-block', onClick: async () => {
    if (await editEntry(null)) refresh();
  } }));

  const all = repo.listBodyweight();
  if (!all.length) {
    root.append(h('p', { class: 'muted' }, t('noBodyweight')));
    return;
  }

  root.append(h('div', { class: 'filters' }, periodSelect(refresh)));
  const points = hist.bodyweightSeries({ from: hist.periodFrom(periodDays()) });
  const card = h('section', { class: 'card stack' });
  if (!points.length) card.append(h('p', { class: 'muted' }, t('noPointsInPeriod')));
  else {
    const change = points[points.length - 1].y - points[0].y;
    const sign = change > 0 ? '+' : change < 0 ? '−' : '';
    card.append(h('div', { class: 'stats-row cols-2' },
      statTile(formatWeight(points[points.length - 1].y), t('bodyweight')),
      statTile(`${sign}${formatWeight(Math.abs(change))}`, t('bodyweightChange'))));
    card.append(lineChart(points, {
      formatY: (v, axis) => (axis ? formatNumber(kgToDisplay(v), 1) : formatWeight(v)),
      formatX: (ts) => formatDate(ts, get('dates.chartDateFormat')),
      formatXLong: (ts) => formatDate(ts),
      label: t('bodyweight'),
    }));
  }
  root.append(card);

  root.append(h('div', { class: 'list-heading' }, t('bodyweightEntries')));
  root.append(h('section', { class: 'card list-card' }, h('ul', { class: 'plain-list' },
    all.slice(0, get('history.sessionsShown')).map((b) => h('li', null,
      h('button', { type: 'button', class: 'list-main row-between', onClick: async () => { if (await editEntry(b)) refresh(); } },
        h('span', null, formatDate(b.date)), h('strong', null, formatWeight(b.kg))))))));
}

/** Crea o modifica una registrazione. Restituisce true se qualcosa è cambiato. */
function editEntry(rec) {
  return new Promise((resolve) => {
    let changed = false;
    const last = repo.latestBodyweight();
    const date = h('input', { class: 'input', type: 'date', 'aria-label': t('date') });
    date.value = toDateInput(rec ? rec.date : now());
    const st = stepper({
      label: `${t('bodyweight')} (${weightUnit()})`,
      value: kgToDisplay(rec ? rec.kg : (last ? last.kg : get('workout.defaultBodyweightKg'))),
      step: get('units.bodyweightStep'), min: 0, decimals: 2,
    });
    const actions = [];
    if (rec) {
      actions.push(button(t('delete'), { variant: 'danger-ghost', iconName: 'x', onClick: async () => {
        await safe(() => repo.deleteBodyweight(rec.id));
        toast(t('entryDeleted'));
        changed = true;
        s.close();
      } }));
    }
    actions.push(button(t('cancel'), { onClick: () => s.close() }));
    actions.push(button(t('save'), { variant: 'primary', onClick: async () => {
      // Mezzogiorno del giorno scelto: evita problemi di fuso orario
      const [y, mo, d] = date.value.split('-').map(Number);
      const ts = new Date(y, mo - 1, d, 12).getTime();
      if (!Number.isFinite(ts)) return;
      const target = rec || { id: uid(), createdAt: now() };
      target.date = ts;
      target.kg = displayToKg(st.value);
      const ok = await safe(async () => { await repo.saveBodyweight(target); return true; });
      if (ok) { changed = true; s.close(); }
    } }));
    const s = openSheet({
      title: rec ? t('editEntry') : t('bodyweightAdd'),
      content: h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('date')), date), st.el),
      actions,
      onClose: () => resolve(changed),
    });
  });
}
