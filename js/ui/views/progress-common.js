// Parti comuni alle schermate di Progressi: schede interne e filtri.

import { h } from '../dom.js';
import { t, get } from '../../config.js';

/** Filtri condivisi fra le schermate (restano finché l'app è aperta). */
export const filters = {
  periodDays: null,  // null = usa il valore predefinito delle impostazioni
  dayName: null,
  exerciseId: null,
};

export const periodDays = () => (filters.periodDays ?? get('history.defaultPeriodDays'));

export function periodLabel(days) {
  return days > 0 ? t('periodDays', { n: days }) : t('periodAll');
}

/** Schede interne: Riepilogo, Cronologia, Esercizi, Peso. */
export function subnav(ctx, current) {
  const tabs = [
    ['summary', t('progressSummary'), 'progress'],
    ['history', t('progressHistory'), 'progress/history'],
    ['exercises', t('progressExercises'), 'progress/exercises'],
    ['body', t('progressBody'), 'progress/body'],
  ];
  return h('div', { class: 'segmented subnav', role: 'tablist' }, tabs.map(([key, label, path]) =>
    h('button', {
      type: 'button', role: 'tab', class: key === current ? 'active' : '',
      'aria-selected': key === current ? 'true' : 'false',
      onClick: () => ctx.navigate(path),
    }, label)));
}

/** Selettore del periodo (select nativo: su iPhone apre la ruota di sistema). */
export function periodSelect(onChange) {
  const sel = h('select', { class: 'input input-sm', 'aria-label': t('periodLabel') },
    get('history.periodOptions').map((d) => h('option', { value: String(d) }, periodLabel(d))));
  sel.value = String(periodDays());
  sel.addEventListener('change', () => { filters.periodDays = Number(sel.value); onChange(); });
  return sel;
}

export function statTile(value, label, extra) {
  return h('div', { class: 'stat' },
    h('div', { class: 'stat-value' }, value),
    h('div', { class: 'stat-label' }, label),
    extra ? h('div', { class: 'stat-extra' }, extra) : null);
}
