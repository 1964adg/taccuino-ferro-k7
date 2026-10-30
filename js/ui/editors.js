// Editor in pannelli dal basso: esercizio della libreria, voce di un giorno, scelta esercizio.

import { h, icon } from './dom.js';
import { t, get } from '../config.js';
import { clone } from '../util.js';
import * as repo from '../domain/repo.js';
import * as progOps from '../domain/programs.js';
import { MEASURES, measureOf, newExercise, restFor } from '../domain/model.js';
import {
  formatClock, formatNumber, kgToDisplay, displayToKg, mToDisplay, displayToM, weightUnit, distanceUnit,
} from '../format.js';
import { fmtReps } from './setformat.js';
import {
  openSheet, button, stepper, toggle, toast, confirmDialog, numberDialog, safe,
} from './components.js';

// ---- Selettori per i valori di una serie ----

/** Stepper per un campo di una serie ('weight' | 'reps' | 'duration' | 'distance'), in unità di visualizzazione. */
export function setFieldStepper(field, values, m) {
  if (field === 'weight') {
    return stepper({
      label: m.bodyweight ? `${t('addedWeight')} (${weightUnit()})` : `${t('weight')} (${weightUnit()})`,
      value: kgToDisplay(values.weightKg || 0), step: get('units.weightStep'), min: 0, decimals: 2,
    });
  }
  if (field === 'reps') return stepper({ label: t('reps'), value: values.reps || 0, step: get('units.repsStep'), min: 0, decimals: 0 });
  if (field === 'duration') {
    return stepper({ label: t('time'), value: values.durationSec || 0, step: get('units.timeStep'), min: 0, decimals: 0, format: formatClock, editTitle: `${t('time')} (s)` });
  }
  if (field === 'distance') {
    return stepper({ label: `${t('distance')} (${distanceUnit()})`, value: mToDisplay(values.distanceM || 0), step: get('units.distanceStep'), min: 0, decimals: 2 });
  }
  return null;
}

/** Legge i valori (in unità interne) da un insieme di stepper. */
export function readSetSteppers(steppers) {
  const v = {};
  if (steppers.weight) v.weightKg = displayToKg(steppers.weight.value);
  if (steppers.reps) v.reps = steppers.reps.value;
  if (steppers.duration) v.durationSec = steppers.duration.value;
  if (steppers.distance) v.distanceM = displayToM(steppers.distance.value);
  return v;
}

/**
 * Modifica (o crea) una serie.
 * Restituisce { action: 'save', values } | { action: 'delete' } | null.
 */
export function editSetDialog(exercise, values, { title = t('editSet'), allowDelete = true } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const m = measureOf(exercise);
    const st = {};
    const grid = h('div', { class: 'stepper-grid' });
    for (const f of m.fields) {
      st[f] = setFieldStepper(f, values, m);
      grid.append(st[f].el);
    }
    let warm = !!values.warmup;
    const actions = [];
    if (allowDelete) {
      actions.push(button(t('deleteSet'), { variant: 'danger-ghost', iconName: 'x', onClick: () => { result = { action: 'delete' }; s.close(); } }));
    } else {
      actions.push(button(t('cancel'), { onClick: () => s.close() }));
    }
    actions.push(button(t('save'), { variant: 'primary', onClick: () => {
      result = { action: 'save', values: { ...readSetSteppers(st), warmup: warm } };
      s.close();
    } }));
    const s = openSheet({
      title,
      content: h('div', { class: 'stack' }, grid,
        h('div', { class: 'setting-row' }, h('span', null, t('warmup')), toggle(warm, (v) => { warm = v; }, t('warmup')))),
      actions,
      onClose: () => resolve(result),
    });
  });
}

// ---- Giorni della settimana ----

/** Chip dei giorni, nell'ordine scelto (lunedì o domenica per primo). */
export function weekdayChips(selected, onChange) {
  const names = get('dates.weekdayShort');
  const first = get('dates.firstDayOfWeek');
  let value = [...selected];
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': t('weekdaysLabel') });
  [0, 1, 2, 3, 4, 5, 6].map((i) => (i + first) % 7).forEach((d) => {
    const b = h('button', {
      type: 'button', class: 'chip chip-day',
      onClick: () => {
        value = value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort();
        paint();
        onChange(value);
      },
    }, names[d]);
    b.dataset.day = String(d);
    wrap.append(b);
  });
  const paint = () => wrap.querySelectorAll('button').forEach((b) => {
    const on = value.includes(+b.dataset.day);
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  paint();
  return wrap;
}

// ---- Scelta di un esercizio dalla libreria ----

/** Restituisce l'id dell'esercizio scelto (eventualmente appena creato) oppure null. */
export function pickExercise(title = t('addExercise')) {
  return new Promise((resolve) => {
    let result = null;
    const search = h('input', { class: 'input', type: 'search', placeholder: t('search'), 'aria-label': t('search'), autocomplete: 'off' });
    const list = h('div', { class: 'choice-list' });
    const draw = () => {
      const q = repo.normalizeName(search.value);
      list.replaceChildren(
        h('button', {
          type: 'button', class: 'choice',
          onClick: async () => {
            const ex = await editExercise(null, { name: search.value.trim() });
            if (ex) { result = ex.id; s.close(); }
          },
        }, icon('plus'), h('span', { class: 'choice-text' }, h('span', { class: 'choice-label' }, t('newExercise')))),
        ...repo.listExercises()
          .filter((e) => !q || repo.normalizeName(e.name).includes(q) || repo.normalizeName(e.muscleGroup).includes(q))
          .map((e) => h('button', {
            type: 'button', class: 'choice',
            onClick: () => { result = e.id; s.close(); },
          }, h('span', { class: 'choice-text' },
            h('span', { class: 'choice-label' }, e.name),
            h('span', { class: 'choice-hint' }, [e.muscleGroup, t('measure_' + e.measure)].filter(Boolean).join(' · '))))),
      );
    };
    search.addEventListener('input', draw);
    draw();
    const s = openSheet({
      title,
      content: h('div', { class: 'stack' }, search, list),
      actions: [button(t('close'), { onClick: () => s.close() })],
      onClose: () => resolve(result),
      className: 'sheet-tall',
    });
  });
}

// ---- Esercizio della libreria ----

/** Crea (ex = null) o modifica un esercizio. Restituisce l'esercizio salvato o null. */
export function editExercise(ex, preset = {}) {
  return new Promise((resolve) => {
    let result = null;
    const draft = ex ? clone(ex) : newExercise({ name: preset.name || '', measure: 'weight_reps' });

    const name = h('input', { class: 'input', type: 'text', placeholder: t('exerciseName'), 'aria-label': t('exerciseName'), autocomplete: 'off' });
    name.value = draft.name;
    const group = h('input', { class: 'input', type: 'text', placeholder: t('muscleGroup'), 'aria-label': t('muscleGroup'), autocomplete: 'off' });
    group.value = draft.muscleGroup || '';
    const groupChips = h('div', { class: 'chips chips-sm' }, repo.muscleGroups().map((g) =>
      h('button', { type: 'button', class: 'chip chip-sm', onClick: () => { group.value = g; } }, g)));

    const measure = h('select', { class: 'input', 'aria-label': t('measureType') },
      Object.keys(MEASURES).map((k) => h('option', { value: k }, t('measure_' + k))));
    measure.value = draft.measure;

    const restField = restControl(draft.restSec, get('timer.defaultRestSec'), (v) => { draft.restSec = v; });

    const notes = h('textarea', { class: 'input', rows: 2, placeholder: t('notes'), 'aria-label': t('notes') });
    notes.value = draft.notes || '';

    let archived = !!draft.archived;
    const archivedRow = ex ? h('div', { class: 'setting-row' }, h('span', null, t('archivedLabel')),
      toggle(archived, (v) => { archived = v; }, t('archivedLabel'))) : null;

    const actions = [];
    if (ex) {
      actions.push(button(t('delete'), { variant: 'danger-ghost', iconName: 'x', onClick: async () => {
        if (!(await confirmDialog(t('deleteExerciseConfirm', { name: ex.name }), { okLabel: t('delete'), danger: true }))) return;
        const res = await safe(() => progOps.tryDeleteExercise(ex));
        if (!res) return;
        if (!res.ok) {
          toast(res.reason === 'inUse' ? t('exerciseInUse', { n: res.n }) : t('exerciseHasHistory'), { type: 'danger', duration: 5000 });
          return;
        }
        result = { deleted: true };
        s.close();
      } }));
    }
    actions.push(button(t('cancel'), { onClick: () => s.close() }));
    actions.push(button(t('save'), { variant: 'primary', onClick: async () => {
      const n = name.value.trim();
      if (!n) { name.focus(); return; }
      draft.name = n;
      draft.muscleGroup = group.value.trim();
      draft.measure = measure.value;
      draft.notes = notes.value.trim();
      draft.archived = archived;
      const saved = await safe(() => repo.saveExercise(ex ? Object.assign(ex, draft) : draft));
      if (!saved) return;
      result = saved;
      s.close();
    } }));

    const s = openSheet({
      title: ex ? t('editExercise') : t('newExercise'),
      content: h('div', { class: 'stack' },
        field(t('exerciseName'), name),
        field(t('muscleGroup'), h('div', null, group, groupChips)),
        field(t('measureType'), measure),
        field(t('exerciseRest'), restField),
        notes,
        archivedRow,
        ex ? h('p', { class: 'muted small' }, t('libraryHint')) : null,
      ),
      actions,
      onClose: () => resolve(result),
      className: 'sheet-tall',
    });
    if (!ex) setTimeout(() => name.focus(), 80);
  });
}

function field(label, control) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control);
}

/** Recupero: "usa il predefinito" oppure un valore proprio. */
function restControl(value, fallbackSec, onChange) {
  let custom = Number.isFinite(value);
  const st = stepper({
    label: t('rest'), value: custom ? value : fallbackSec, step: get('timer.adjustStepSec'), min: 0, max: 1800,
    decimals: 0, format: formatClock, editTitle: `${t('rest')} (s)`,
    onChange: (v) => { if (custom) onChange(v); },
  });
  st.el.hidden = !custom;
  const row = h('div', { class: 'setting-row' },
    h('span', null, t('useDefaultRest', { v: formatClock(fallbackSec) })),
    toggle(!custom, (useDefault) => {
      custom = !useDefault;
      st.el.hidden = !custom;
      onChange(custom ? st.value : null);
    }, t('useDefaultRest', { v: formatClock(fallbackSec) })));
  return h('div', { class: 'stack' }, row, st.el);
}

// ---- Voce di un giorno (esercizio con i valori previsti) ----

/** Modifica una voce. Restituisce 'saved', 'removed' oppure null. */
export function editItem(program, day, item) {
  return new Promise((resolve) => {
    let result = null;
    const draft = clone(item);
    draft.custom = Array.isArray(draft.custom) ? draft.custom : [];
    const body = h('div', { class: 'stack' });

    const draw = () => {
      const ex = repo.getExercise(draft.exerciseId) || { name: '?', measure: 'weight_reps' };
      const m = measureOf(ex);
      const parts = [];

      // Esercizio
      parts.push(h('div', { class: 'item-ex' },
        h('div', null,
          h('div', { class: 'card-title' }, ex.name),
          h('div', { class: 'card-meta' }, [ex.muscleGroup, t('measure_' + ex.measure)].filter(Boolean).join(' · '))),
        h('div', { class: 'row' },
          button(t('changeExercise'), { className: 'btn-sm', onClick: async () => {
            const id = await pickExercise(t('changeExercise'));
            if (id) { draft.exerciseId = id; draw(); }
          } }),
          button(null, { iconName: 'settings', className: 'btn-icon btn-sm', ariaLabel: t('editExercise'), onClick: async () => {
            await editExercise(repo.getExercise(draft.exerciseId));
            draw();
          } }),
        ),
      ));

      // Valori comuni a tutte le serie
      const grid = h('div', { class: 'stepper-grid two' });
      grid.append(stepper({ label: t('sets'), value: draft.sets, step: 1, min: 1, max: 30, decimals: 0, onChange: (v) => {
        draft.sets = v;
        draft.warmupSets = Math.min(draft.warmupSets || 0, v);
        drawCustom();
      } }).el);
      grid.append(stepper({ label: t('warmupSets'), value: draft.warmupSets || 0, step: 1, min: 0, max: 10, decimals: 0, onChange: (v) => {
        draft.warmupSets = Math.min(v, draft.sets);
        drawCustom();
      } }).el);
      if (m.fields.includes('reps')) {
        let maxSt;
        const minSt = stepper({ label: t('repsMin'), value: draft.repsMin ?? 0, step: get('units.repsStep'), min: 0, max: 200, decimals: 0, onChange: (v) => {
          draft.repsMin = v;
          if ((draft.repsMax ?? 0) < v) { draft.repsMax = v; maxSt.setValue(v); }
          drawCustom();
        } });
        maxSt = stepper({ label: t('repsMax'), value: draft.repsMax ?? draft.repsMin ?? 0, step: get('units.repsStep'), min: 0, max: 200, decimals: 0, onChange: (v) => {
          draft.repsMax = v;
          if ((draft.repsMin ?? 0) > v) { draft.repsMin = v; minSt.setValue(v); }
          drawCustom();
        } });
        grid.append(minSt.el, maxSt.el);
      }
      parts.push(grid);
      if (m.fields.includes('weight')) {
        parts.push(stepper({
          label: `${m.bodyweight ? t('addedWeight') : t('planWeight')} (${weightUnit()})`,
          value: kgToDisplay(draft.weightKg || 0), step: get('units.weightStep'), min: 0, decimals: 2,
          onChange: (v) => { draft.weightKg = v > 0 ? displayToKg(v) : null; drawCustom(); },
        }).el);
      }
      if (m.fields.includes('duration')) {
        parts.push(stepper({
          label: t('time'), value: draft.durationSec ?? get('workout.defaultDurationSec'), step: get('units.timeStep'), min: 0, decimals: 0,
          format: formatClock, editTitle: `${t('time')} (s)`,
          onChange: (v) => { draft.durationSec = v; drawCustom(); },
        }).el);
      }
      if (m.fields.includes('distance')) {
        parts.push(stepper({
          label: `${t('distance')} (${distanceUnit()})`, value: mToDisplay(draft.distanceM ?? get('workout.defaultDistanceM')),
          step: get('units.distanceStep'), min: 0, decimals: 2,
          onChange: (v) => { draft.distanceM = displayToM(v); drawCustom(); },
        }).el);
      }

      // Recupero
      parts.push(field(t('itemRest'), restControl(draft.restSec, restFor({ restSec: null }, ex), (v) => { draft.restSec = v; })));

      // Serie personalizzate
      const customWrap = h('div', { class: 'stack' });
      let customOn = draft.custom.some((c) => c && Object.keys(c).length);
      const customBody = h('div', { class: 'custom-sets' });
      const drawCustom = () => {
        customBody.replaceChildren();
        if (!customOn) return;
        customBody.append(h('p', { class: 'muted small' }, t('customizeHint')));
        for (let i = 0; i < draft.sets; i++) customBody.append(customRow(i, m));
      };
      customWrap.append(
        h('div', { class: 'setting-row' }, h('span', null, t('customizeSets')),
          toggle(customOn, (v) => { customOn = v; if (!v) draft.custom = []; drawCustom(); }, t('customizeSets'))),
        customBody,
      );
      parts.push(customWrap);

      const notes = h('textarea', { class: 'input', rows: 2, placeholder: t('notes'), 'aria-label': t('notes') });
      notes.value = draft.notes || '';
      notes.addEventListener('input', () => { draft.notes = notes.value; });
      parts.push(notes);

      body.replaceChildren(...parts);
      drawCustom();

      // Una riga per serie: i valori in grassetto sono personalizzati
      function customRow(i, meas) {
        const c = draft.custom[i] || {};
        const isWarm = c.warmup ?? i < (draft.warmupSets || 0);
        const setC = (key, v) => {
          draft.custom[i] = { ...(draft.custom[i] || {}) };
          if (v === null) {
            delete draft.custom[i][key];
            if (key === 'repsMin') delete draft.custom[i].repsMax;
          } else draft.custom[i][key] = v;
          drawCustom();
        };
        const cell = (label, key, shown, ask) => {
          const btn = h('button', { type: 'button', class: 'cell' + (c[key] != null ? ' custom' : ''), 'aria-label': `${t('set')} ${i + 1}: ${label}` },
            h('span', { class: 'cell-label' }, label), h('span', { class: 'cell-value' }, shown));
          let pressT = null; let long = false;
          btn.addEventListener('pointerdown', () => { long = false; pressT = setTimeout(() => { long = true; setC(key, null); }, get('workout.holdMs')); });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => btn.addEventListener(e, () => clearTimeout(pressT)));
          btn.addEventListener('click', async () => { if (long) return; const v = await ask(); if (v != null) setC(key, v); });
          return btn;
        };
        const cells = [];
        if (meas.fields.includes('reps')) {
          const rMin = c.repsMin ?? draft.repsMin;
          const rMax = c.repsMax ?? c.repsMin ?? draft.repsMax;
          cells.push(cell(t('reps'), 'repsMin', fmtReps(rMin, rMax), async () => {
            const v = await numberDialog(`${t('set')} ${i + 1} · ${t('reps')}`, rMin, { decimals: 0 });
            if (v != null) { draft.custom[i] = { ...(draft.custom[i] || {}), repsMax: Math.round(v) }; }
            return v == null ? null : Math.round(v);
          }));
        }
        if (meas.fields.includes('weight')) {
          const wKg = c.weightKg ?? draft.weightKg ?? 0;
          cells.push(cell(weightUnit(), 'weightKg', formatNumber(kgToDisplay(wKg)), async () => {
            const v = await numberDialog(`${t('set')} ${i + 1} · ${t('weight')} (${weightUnit()})`, kgToDisplay(wKg));
            return v == null ? null : displayToKg(v);
          }));
        }
        if (meas.fields.includes('duration')) {
          const sec = c.durationSec ?? draft.durationSec ?? 0;
          cells.push(cell(t('time'), 'durationSec', formatClock(sec), async () => {
            const v = await numberDialog(`${t('set')} ${i + 1} · ${t('time')} (s)`, sec, { decimals: 0 });
            return v == null ? null : Math.round(v);
          }));
        }
        if (meas.fields.includes('distance')) {
          const dm = c.distanceM ?? draft.distanceM ?? 0;
          cells.push(cell(distanceUnit(), 'distanceM', formatNumber(mToDisplay(dm)), async () => {
            const v = await numberDialog(`${t('set')} ${i + 1} · ${t('distance')} (${distanceUnit()})`, mToDisplay(dm));
            return v == null ? null : displayToM(v);
          }));
        }
        const warmBtn = h('button', {
          type: 'button', class: 'chip chip-sm' + (isWarm ? ' active' : ''), 'aria-pressed': isWarm ? 'true' : 'false',
          onClick: () => setC('warmup', !isWarm),
        }, t('warmupShort'));
        return h('div', { class: 'custom-row' }, h('span', { class: 'set-n' }, String(i + 1)), ...cells, warmBtn);
      }
    };
    draw();

    const s = openSheet({
      title: t('edit'),
      content: body,
      actions: [
        button(t('removeFromDay'), { variant: 'danger-ghost', iconName: 'x', onClick: () => { result = 'remove'; s.close(); } }),
        button(t('cancel'), { onClick: () => s.close() }),
        button(t('save'), { variant: 'primary', onClick: async () => {
          // Si tengono solo le personalizzazioni delle serie esistenti
          draft.custom = draft.custom.slice(0, draft.sets).map((c) => (c && Object.keys(c).length ? c : null));
          while (draft.custom.length && !draft.custom[draft.custom.length - 1]) draft.custom.pop();
          draft.custom = draft.custom.map((c) => c || {});
          Object.assign(item, draft);
          const ok = await safe(() => repo.saveProgram(program));
          if (ok) { result = 'saved'; s.close(); }
        } }),
      ],
      onClose: () => resolve(result),
      className: 'sheet-tall',
    });
  });
}
