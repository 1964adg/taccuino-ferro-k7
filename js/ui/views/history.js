// Cronologia: elenco filtrabile degli allenamenti e dettaglio modificabile.

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as hist from '../../domain/history.js';
import { sessionSummary, sessionBodyweight } from '../../domain/stats.js';
import {
  formatDate, formatTime, formatDuration, formatVolume, kgToDisplay, displayToKg, weightUnit,
} from '../../format.js';
import { button, stepper, toggle, confirmDialog, chooseDialog, toast, safe } from '../components.js';
import { editSetDialog, pickExercise } from '../editors.js';
import { fmtSet } from '../setformat.js';
import { exerciseIcon } from '../pictograms.js';
import { debounce, uid } from '../../util.js';
import { filters, periodDays, periodSelect, subnav, statTile } from './progress-common.js';
import { backLink } from './programs.js';

// Quante sessioni mostrare (cresce con "Mostra altri")
let shown = null;

// ---------- Elenco ----------

export function renderList(root, ctx) {
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabProgress'))));
  root.append(subnav(ctx, 'history'));

  const refresh = () => ctx.render({ keepScroll: true });
  const daySel = h('select', { class: 'input input-sm', 'aria-label': t('filterDay') },
    h('option', { value: '' }, t('allDays')),
    hist.dayNamesInHistory().map((n) => h('option', { value: n }, n)));
  daySel.value = filters.dayName || '';
  daySel.addEventListener('change', () => { filters.dayName = daySel.value || null; refresh(); });

  const exSel = h('select', { class: 'input input-sm', 'aria-label': t('filterExercise') },
    h('option', { value: '' }, t('allExercises')),
    hist.exercisesWithHistory()
      .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, get('app.locale')))
      .map((x) => h('option', { value: x.exercise.id }, x.exercise.name)));
  exSel.value = filters.exerciseId || '';
  exSel.addEventListener('change', () => { filters.exerciseId = exSel.value || null; refresh(); });

  root.append(h('div', { class: 'filters' }, periodSelect(refresh), daySel, exSel));

  const all = hist.filterSessions({ from: hist.periodFrom(periodDays()), dayName: filters.dayName, exerciseId: filters.exerciseId });
  const limit = shown || get('history.sessionsShown');
  root.append(h('p', { class: 'muted small' }, t('resultsCount', { n: all.length })));
  if (!all.length) {
    root.append(h('p', { class: 'muted' }, filters.dayName || filters.exerciseId ? t('noResults') : t('noSessionsYet')));
    return;
  }

  // Raggruppate per mese
  let month = null;
  const list = h('div', { class: 'stack' });
  for (const s of all.slice(0, limit)) {
    const m = formatDate(s.startedAt, get('dates.monthLongFormat'));
    if (m !== month) {
      month = m;
      list.append(h('div', { class: 'list-heading' }, m));
    }
    const sum = sessionSummary(s);
    const names = s.entries.filter((e) => e.sets.length).map((e) => (repo.getExercise(e.exerciseId) || {}).name).filter(Boolean);
    list.append(h('button', { type: 'button', class: 'card card-link', onClick: () => ctx.navigate(`progress/session/${s.id}`) },
      h('div', { class: 'card-row' },
        h('div', { class: 'grow' },
          h('div', { class: 'card-eyebrow' }, `${formatDate(s.startedAt)} · ${formatTime(s.startedAt)}`),
          h('div', { class: 'card-title' }, s.dayName || '—', sum.records.length ? h('span', { class: 'badge badge-pr inline' }, icon('trophy'), String(sum.records.length)) : null),
          h('div', { class: 'card-meta' }, `${formatDuration(sum.durationSec)} · ${formatVolume(sum.volume)} · ${sum.setsDone} ${t('setsDone').toLowerCase()}`),
          names.length ? h('div', { class: 'card-meta small' }, names.join(', ')) : null),
        icon('right', 'chev'))));
  }
  root.append(list);
  if (all.length > limit) {
    root.append(button(t('showMore'), { className: 'btn-block', onClick: () => {
      shown = limit + get('history.sessionsShown');
      refresh();
    } }));
  }
}

// ---------- Dettaglio modificabile ----------

/** "2026-10-30T18:05" nel fuso orario locale, per <input type="datetime-local">. */
function toLocalInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function renderSession(root, ctx, id) {
  const s = repo.getSession(id);
  root.append(backLink(t('progressHistory'), () => ctx.navigate('progress/history')));
  if (!s) { root.append(h('p', { class: 'muted' }, t('noResults'))); return; }

  const save = () => safe(() => hist.updateSession(s));
  const refresh = () => ctx.render({ keepScroll: true });
  const sum = sessionSummary(s);

  root.append(h('header', { class: 'page-header' },
    h('div', { class: 'eyebrow' }, `${formatDate(s.startedAt)} · ${formatTime(s.startedAt)}`),
    h('h1', { class: 'page-title' }, s.dayName || '—')));

  root.append(h('div', { class: 'stats-row cols-2' },
    statTile(formatDuration(sum.durationSec), t('duration')),
    statTile(formatVolume(sum.volume), t('volume')),
    statTile(String(sum.setsDone), t('setsDone')),
    statTile(String(sum.records.length), t('recordsBeaten'))));

  // Data, durata, peso corporeo, note
  const when = h('input', { class: 'input', type: 'datetime-local', 'aria-label': t('dateTime') });
  when.value = toLocalInput(s.startedAt);
  when.addEventListener('change', async () => {
    const ts = new Date(when.value).getTime();
    if (!Number.isFinite(ts)) return;
    s.startedAt = ts;
    await save();
    refresh();
  });

  const dur = stepper({
    label: t('durationMin'), value: Math.round((s.durationSec || sum.durationSec) / 60), step: 5, min: 0, max: 600, decimals: 0,
    onChange: debounce(async (v) => { s.durationSec = v * 60; await save(); }, 500),
  });

  const hasBw = !!s.bodyweightKg;
  const bw = stepper({
    label: `${t('bodyweight')} (${weightUnit()})`,
    value: kgToDisplay(s.bodyweightKg || sessionBodyweight(s) || get('workout.defaultBodyweightKg')),
    step: get('units.bodyweightStep'), min: 0, decimals: 2,
    onChange: debounce(async (v) => { s.bodyweightKg = displayToKg(v); await save(); }, 500),
  });
  bw.el.hidden = !hasBw;
  const bwRow = h('div', { class: 'setting-row' }, h('span', null, t('logBodyweight')),
    toggle(hasBw, async (on) => {
      bw.el.hidden = !on;
      s.bodyweightKg = on ? displayToKg(bw.value) : null;
      await save();
    }, t('logBodyweight')));

  const notes = h('textarea', { class: 'input', rows: 3, placeholder: t('notes'), 'aria-label': t('notes') });
  notes.value = s.notes || '';
  notes.addEventListener('change', async () => { s.notes = notes.value.trim(); await save(); });

  root.append(h('section', { class: 'card stack' },
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('dateTime')), when),
    dur.el, bwRow, bw.el, notes));

  // Esercizi e serie
  for (const e of s.entries) {
    const ex = repo.getExercise(e.exerciseId) || { name: '?', measure: 'weight_reps' };
    const rows = e.sets.map((set, i) => h('li', null, h('button', {
      type: 'button', class: 'set-row done' + (set.pr ? ' pr' : ''),
      'aria-label': `${t('editSet')} ${i + 1}`,
      onClick: async () => {
        const res = await editSetDialog(ex, set);
        if (!res) return;
        if (res.action === 'delete') e.sets = e.sets.filter((x) => x.id !== set.id);
        else Object.assign(set, res.values);
        await save();
        refresh();
      },
    },
    h('span', { class: 'set-n' }, set.warmup ? t('warmupShort') : String(i + 1)),
    h('span', { class: 'set-val' }, fmtSet(set, ex)),
    set.pr ? h('span', { class: 'badge badge-pr' }, icon('trophy')) : null)));

    root.append(h('section', { class: 'card stack' },
      h('div', { class: 'card-row' },
        exerciseIcon(ex, 'sm'),
        h('button', { type: 'button', class: 'link-title grow', onClick: () => ctx.navigate(`progress/exercise/${ex.id}`) }, ex.name),
        button(null, { iconName: 'more', className: 'btn-icon btn-sm', ariaLabel: t('more'), onClick: async () => {
          const c = await chooseDialog(ex.name, [{ value: 'remove', label: t('removeFromDay'), icon: 'x' }]);
          if (c !== 'remove') return;
          if (!(await confirmDialog(t('removeExerciseConfirm', { name: ex.name }), { danger: true, okLabel: t('removeFromDay') }))) return;
          s.entries = s.entries.filter((x) => x !== e);
          await save();
          refresh();
        } })),
      rows.length ? h('ol', { class: 'set-list' }, rows) : h('p', { class: 'muted small' }, t('skipped')),
      button(t('addSet'), { iconName: 'plus', className: 'btn-sm', onClick: async () => {
        const last = e.sets[e.sets.length - 1] || {};
        const res = await editSetDialog(ex, { ...last, warmup: false }, { title: t('addSet'), allowDelete: false });
        if (!res || res.action !== 'save') return;
        e.sets.push(hist.newHistorySet(res.values));
        await save();
        refresh();
      } }),
    ));
  }

  root.append(button(t('addExercise'), { iconName: 'plus', className: 'btn-block', onClick: async () => {
    const exId = await pickExercise();
    if (!exId) return;
    s.entries.push({ id: uid(), exerciseId: exId, itemId: null, targets: [], plannedSets: 0, restSec: null, skipped: false, extra: true, sets: [] });
    await save();
    refresh();
  } }));

  root.append(button(t('deleteSession'), { variant: 'danger-ghost', iconName: 'x', className: 'btn-block', onClick: async () => {
    if (!(await confirmDialog(t('deleteSessionConfirm', { date: formatDate(s.startedAt) }), { danger: true, okLabel: t('delete') }))) return;
    await safe(() => hist.removeSession(s.id));
    toast(t('sessionDeleted'));
    ctx.navigate('progress/history');
  } }));
}
