// Allenamento in corso: un esercizio alla volta, tutto a portata di pollice.

import { h, clear, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as wk from '../../domain/workout.js';
import * as stats from '../../domain/stats.js';
import { measureOf, newExercise, MEASURES } from '../../domain/model.js';
import { RestTimer } from '../../timer.js';
import { fmtTarget, fmtSet, fmtBest } from '../setformat.js';
import { setFieldStepper, readSetSteppers, editSetDialog } from '../editors.js';
import * as io from '../../io.js';
import { exerciseIcon } from '../pictograms.js';
import * as fb from '../../feedback.js';
import {
  formatClock, formatDate, formatDuration, formatVolume, formatNumber,
  kgToDisplay, displayToKg, mToDisplay, displayToM, weightUnit, distanceUnit,
} from '../../format.js';
import {
  button, stepper, openSheet, confirmDialog, chooseDialog, textDialog, toast, toggle, safe,
} from '../components.js';

export function render(root, ctx) {
  const session = repo.getActive();
  if (!session) {
    ctx.setFullscreen(false);
    root.append(h('div', { class: 'empty' },
      icon('dumbbell', 'icon-xl'),
      h('p', null, t('noWorkoutActive')),
      button(t('goHome'), { variant: 'primary', onClick: () => ctx.navigate('home') }),
    ));
    return;
  }

  ctx.setFullscreen(true);
  fb.keepScreenOn(true);

  // ---- Struttura della pagina ----
  const clockEl = h('span', { class: 'wk-clock' });
  const topbar = h('header', { class: 'wk-top' },
    button(null, { iconName: 'left', variant: 'ghost', ariaLabel: t('exit'), className: 'btn-icon', onClick: () => ctx.navigate('home') }),
    h('div', { class: 'wk-top-center' }, h('div', { class: 'wk-day' }, session.dayName || t('tabWorkout')), clockEl),
    button(t('finish'), { variant: 'ghost', iconName: 'flag', className: 'wk-finish', onClick: () => openFinish() }),
  );
  const dots = h('div', { class: 'wk-dots', role: 'tablist' });
  const pane = h('section', { class: 'wk-pane', 'aria-live': 'polite' });
  const restPanel = h('div', { class: 'rest', hidden: true });
  const controls = h('div', { class: 'wk-controls' });
  root.append(h('div', { class: 'wk' }, topbar, dots, pane, restPanel, controls));

  let steppers = {};
  let curWarmup = false;
  let restHideTimer = null;
  let lastCountdown = null; // ultimo secondo del 3-2-1 già suonato

  // ---- Timer di recupero ----
  const restTime = h('div', { class: 'rest-time' });
  const restLabel = h('div', { class: 'rest-label' });
  const restBar = h('div', { class: 'rest-bar-fill' });
  const restSkip = button(t('skipRest'), { variant: 'primary', iconName: 'skip', className: 'rest-skip', onClick: () => endRest(true) });
  const restSkipText = restSkip.querySelector('span:last-child');
  restPanel.append(
    h('div', { class: 'rest-head' }, icon('clock'), restLabel, restSkip),
    h('div', { class: 'rest-main' },
      button(`−${get('timer.adjustStepSec')}s`, { onClick: () => adjustRest(-get('timer.adjustStepSec')) }),
      restTime,
      button(`+${get('timer.adjustStepSec')}s`, { onClick: () => adjustRest(get('timer.adjustStepSec')) }),
    ),
    h('div', { class: 'rest-bar' }, restBar),
  );

  const timer = new RestTimer({
    onTick: (rem, total) => {
      const sec = Math.ceil(rem);
      restTime.textContent = formatClock(sec);
      restBar.style.transform = `scaleX(${total > 0 ? rem / total : 0})`;
      restPanel.classList.toggle('warn', rem <= get('timer.warnBeforeSec') && rem > 0);
      // Conto alla rovescia sonoro negli ultimi secondi (3-2-1), una volta per secondo
      const from = get('timer.countdownFrom');
      const counting = from > 0 && sec >= 1 && sec <= from;
      restPanel.classList.toggle('countdown', counting);
      if (counting && sec !== lastCountdown) {
        lastCountdown = sec;
        fb.playSound('tick');
        restTime.classList.remove('pulse');
        void restTime.offsetWidth;
        restTime.classList.add('pulse');
      }
      if (sec > from) lastCountdown = null;
    },
    onWarn: () => { fb.playSound('warn'); fb.haptic(1); },
    onEnd: () => {
      fb.playSound('end');
      fb.haptic(3);
      restPanel.classList.remove('warn');
      restPanel.classList.add('over');
      restLabel.textContent = t('restOver');
      restSkipText.textContent = t('close');
      restTime.textContent = formatClock(0);
      safe(() => wk.setRest(session, null));
      clearTimeout(restHideTimer);
      restHideTimer = setTimeout(hideRest, get('timer.endBannerSec') * 1000);
    },
  }, () => get('timer.warnBeforeSec'));

  function showRest() {
    clearTimeout(restHideTimer);
    restPanel.hidden = false;
    restPanel.classList.remove('over');
    restLabel.textContent = t('restRunning');
    restSkipText.textContent = t('skipRest');
    requestAnimationFrame(() => restPanel.classList.add('show'));
  }
  function hideRest() {
    restPanel.classList.remove('show', 'over', 'warn');
    restPanel.hidden = true;
  }
  function startRest(sec) {
    lastCountdown = null;
    const snap = timer.start(sec);
    showRest();
    safe(() => wk.setRest(session, snap));
  }
  function adjustRest(delta) {
    const snap = timer.adjust(delta);
    if (snap) safe(() => wk.setRest(session, snap));
  }
  function endRest() {
    timer.stop(true);
    hideRest();
    safe(() => wk.setRest(session, null));
  }

  // Recupero in corso al momento della riapertura
  if (session.rest && session.rest.endAt > Date.now()) {
    showRest();
    timer.restore(session.rest);
  } else if (session.rest) {
    safe(() => wk.setRest(session, null));
  }

  // ---- Orologio dell'allenamento ----
  const tickClock = () => { clockEl.textContent = formatClock((Date.now() - session.startedAt) / 1000); };
  tickClock();
  const clockInterval = setInterval(tickClock, 1000);

  // ---- Disegno dell'esercizio corrente ----

  function currentEntry() {
    return session.entries[session.currentIndex] || null;
  }

  function renderDots() {
    clear(dots);
    session.entries.forEach((e, i) => {
      const cls = ['wk-dot'];
      if (i === session.currentIndex) cls.push('current');
      if (e.skipped) cls.push('skipped');
      else if (wk.isEntryComplete(e)) cls.push('done');
      else if (e.sets.length) cls.push('partial');
      const ex = repo.getExercise(e.exerciseId);
      dots.append(h('button', {
        type: 'button', class: cls.join(' '), role: 'tab',
        'aria-label': `${i + 1}. ${ex ? ex.name : ''}`,
        'aria-selected': i === session.currentIndex ? 'true' : 'false',
        onClick: () => goTo(i),
      }));
    });
  }

  function renderAll(direction = 0) {
    renderDots();
    renderPane(direction);
    renderControls();
  }

  function renderPane(direction) {
    clear(pane);
    const e = currentEntry();
    if (!e) {
      pane.append(h('div', { class: 'empty' }, h('p', null, t('noSetsDone')),
        button(t('addExercise'), { variant: 'primary', iconName: 'plus', onClick: addExercise })));
      return;
    }
    const ex = repo.getExercise(e.exerciseId) || { name: '?', measure: 'weight_reps' };
    const m = measureOf(ex);
    const target = e.targets[0];

    const head = h('div', { class: 'wk-head' },
      h('div', { class: 'wk-count' }, `${session.currentIndex + 1} ${t('of')} ${session.entries.length}`,
        ex.muscleGroup ? ` · ${ex.muscleGroup}` : '', e.extra ? ` · ${t('offPlan')}` : ''),
      h('div', { class: 'wk-title-row' }, exerciseIcon(ex, 'lg'), h('h1', { class: 'wk-name' }, ex.name)),
      target ? h('div', { class: 'wk-target' }, `${t('target')}: ${e.plannedSets} ${t('sets').toLowerCase()} · ${fmtTarget(target, m)} · ${t('rest')} ${formatClock(e.restSec)}`) : null,
    );

    // Ultima volta e record
    const info = h('div', { class: 'wk-info' });
    if (get('workout.showLastTime')) {
      const last = stats.lastPerformance(e.exerciseId, session.id);
      info.append(h('div', { class: 'wk-last' },
        h('span', { class: 'wk-info-label' }, last ? `${t('lastTime')} · ${formatDate(last.session.startedAt, get('dates.shortFormat'))}` : t('firstTime')),
        last ? h('span', null, last.sets.map((s) => fmtSet(s, ex)).join('  ·  ')) : null,
      ));
    }
    if (get('workout.showRecords')) {
      const b = stats.bests(e.exerciseId, { excludeSessionId: session.id });
      const rec = fmtBest(b, m);
      if (rec) info.append(h('div', { class: 'wk-best' }, icon('trophy'), rec));
    }

    // Elenco serie
    const list = h('ol', { class: 'set-list' });
    const total = Math.max(e.plannedSets, e.sets.length);
    for (let k = 0; k < total; k++) {
      const s = e.sets[k];
      if (s) {
        list.append(h('li', null, h('button', {
          type: 'button', class: 'set-row done' + (s.pr ? ' pr' : ''),
          'aria-label': `${t('editSet')} ${k + 1}`,
          onClick: () => editSet(e, s, ex),
        },
        h('span', { class: 'set-n' }, s.warmup ? t('warmupShort') : String(k + 1)),
        h('span', { class: 'set-val' }, fmtSet(s, ex)),
        s.pr ? h('span', { class: 'badge badge-pr' }, icon('trophy'), t('newRecord')) : null,
        icon('check', 'set-check'))));
      } else {
        const tg = wk.targetFor(e, k);
        const isCurrent = k === e.sets.length && !e.skipped;
        list.append(h('li', null, h('div', { class: 'set-row' + (isCurrent ? ' current' : '') },
          h('span', { class: 'set-n' }, tg.warmup ? t('warmupShort') : String(k + 1)),
          h('span', { class: 'set-val muted' }, fmtTarget(tg, m)),
        )));
      }
    }

    const card = h('div', { class: 'wk-card' + (direction ? ` slide-${direction > 0 ? 'left' : 'right'}` : '') },
      head, info, e.skipped ? h('div', { class: 'badge badge-muted' }, t('skipped')) : null, list);
    pane.append(card);
  }

  function renderControls() {
    clear(controls);
    steppers = {};
    const e = currentEntry();
    const navRow = h('div', { class: 'wk-nav' },
      button(null, { iconName: 'left', className: 'btn-icon btn-lg', ariaLabel: t('prev'), disabled: session.currentIndex <= 0, onClick: () => goTo(session.currentIndex - 1, -1) }),
      button(t('undoLast'), { iconName: 'undo', className: 'btn-lg grow', disabled: !e || !e.sets.length, onClick: undoLast }),
      button(null, { iconName: 'more', className: 'btn-icon btn-lg', ariaLabel: t('more'), onClick: openMore }),
      button(null, { iconName: 'right', className: 'btn-icon btn-lg', ariaLabel: t('next'), disabled: session.currentIndex >= session.entries.length - 1, onClick: () => goTo(session.currentIndex + 1, 1) }),
    );
    if (!e) { controls.append(navRow); return; }

    const ex = repo.getExercise(e.exerciseId) || { measure: 'weight_reps' };
    const m = measureOf(ex);

    if (e.skipped) {
      controls.append(button(t('unskipExercise'), { variant: 'primary', className: 'btn-xl', onClick: () => safe(async () => { await wk.toggleSkip(session, e); renderAll(); }) }), navRow);
      return;
    }

    if (wk.isEntryComplete(e)) {
      const next = wk.nextIncompleteIndex(session);
      controls.append(
        h('div', { class: 'wk-complete' }, icon('check'), next >= 0 ? t('allSetsDone') : t('workoutComplete')),
        h('div', { class: 'row' },
          button(t('addSet'), { iconName: 'plus', className: 'btn-lg grow', onClick: () => safe(async () => { await wk.addExtraSet(session, e); renderAll(); }) }),
          next >= 0
            ? button(t('next'), { variant: 'primary', iconName: 'right', className: 'btn-lg grow', onClick: () => goTo(next, 1) })
            : button(t('finish'), { variant: 'primary', iconName: 'flag', className: 'btn-lg grow', onClick: openFinish }),
        ),
        navRow,
      );
      return;
    }

    // Valori proposti per la serie corrente
    const i = e.sets.length;
    const pre = wk.prefill(session, e, i);
    curWarmup = !!pre.warmup;
    const grid = h('div', { class: 'stepper-grid' });
    for (const f of m.fields) {
      const st = makeStepper(f, pre, m);
      steppers[f] = st;
      grid.append(st.el);
    }

    const warmChip = h('button', {
      type: 'button', class: 'chip chip-sm' + (curWarmup ? ' active' : ''),
      'aria-pressed': curWarmup ? 'true' : 'false',
      onClick: () => { curWarmup = !curWarmup; warmChip.classList.toggle('active', curWarmup); warmChip.setAttribute('aria-pressed', curWarmup ? 'true' : 'false'); },
    }, t('warmup'));

    const setTitle = h('div', { class: 'wk-set-title' },
      h('span', null, `${t('set')} ${i + 1} / ${e.plannedSets}`), warmChip);

    controls.append(setTitle, grid, doneButton(() => completeCurrent(e)), navRow);
  }

  const makeStepper = setFieldStepper;

  function readValues() {
    return { ...readSetSteppers(steppers), warmup: curWarmup };
  }

  // Tasto "Fatto": un tocco, tenuto premuto oppure con conferma (impostazione)
  function doneButton(action) {
    const mode = get('workout.confirmMode');
    const btn = h('button', { type: 'button', class: 'btn btn-success btn-xl btn-done' },
      h('span', { class: 'hold-fill', 'aria-hidden': 'true' }),
      icon('check'), h('span', null, mode === 'hold' ? `${t('done')} · ${t('holdToConfirm')}` : t('done')));
    if (mode === 'hold') {
      let timerId = null;
      const ms = get('workout.holdMs');
      btn.style.setProperty('--hold-ms', ms + 'ms');
      const cancel = () => { clearTimeout(timerId); btn.classList.remove('holding'); };
      btn.addEventListener('pointerdown', () => {
        fb.unlockAudio();
        btn.classList.add('holding');
        timerId = setTimeout(() => { btn.classList.remove('holding'); action(); }, ms);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
      btn.addEventListener('contextmenu', (ev) => ev.preventDefault());
    } else if (mode === 'confirm') {
      btn.addEventListener('click', async () => {
        fb.unlockAudio();
        if (await confirmDialog(t('confirmSetQuestion'), { okLabel: t('done') })) action();
      });
    } else {
      btn.addEventListener('click', () => { fb.unlockAudio(); action(); });
    }
    return btn;
  }

  // Evita doppie registrazioni con due tocchi rapidi
  let busy = false;

  async function completeCurrent(e) {
    if (busy || e !== currentEntry() || wk.isEntryComplete(e)) return;
    busy = true;
    try {
      await registerSet(e);
    } finally {
      busy = false;
    }
  }

  async function registerSet(e) {
    const res = await safe(() => wk.completeSet(session, e, readValues()));
    if (!res) return;
    fb.haptic(1);
    if (res.isRecord) {
      fb.playSound('record');
      toast(`${t('newRecord')}!`, { type: 'success' });
    }
    if (res.restSec > 0) startRest(res.restSec);
    if (res.sessionDone) {
      toast(t('workoutComplete'), { type: 'success' });
      renderAll();
      return;
    }
    if (res.entryDone && get('timer.autoAdvance')) {
      const next = wk.nextIncompleteIndex(session);
      if (next >= 0) { await goTo(next, next > session.currentIndex ? 1 : -1); return; }
    }
    renderAll();
  }

  async function goTo(idx, direction = 0) {
    if (idx < 0 || idx >= session.entries.length) return;
    const dir = direction || (idx > session.currentIndex ? 1 : -1);
    await safe(() => wk.setCurrentIndex(session, idx));
    renderAll(dir);
  }

  async function undoLast() {
    const e = currentEntry();
    if (!e) return;
    const removed = await safe(() => wk.undoLastSet(session, e));
    if (!removed) return;
    renderAll();
    toast(t('setUndone'), {
      actionLabel: t('restore'),
      onAction: () => safe(async () => { await wk.restoreSet(session, e, removed); renderAll(); }),
    });
  }

  async function editSet(e, s, ex) {
    const res = await editSetDialog(ex, s);
    if (!res) return;
    if (res.action === 'delete') await safe(() => wk.deleteSet(session, e, s.id));
    else await safe(() => wk.updateSet(session, e, s.id, res.values));
    renderAll();
  }

  async function openMore() {
    const e = currentEntry();
    const opts = [];
    if (e) {
      opts.push({ value: 'addSet', label: t('addSet'), icon: 'plus' });
      opts.push({ value: 'skip', label: e.skipped ? t('unskipExercise') : t('skipExercise'), icon: 'skip' });
    }
    opts.push({ value: 'addExercise', label: t('addExercise'), icon: 'dumbbell' });
    if (session.entries.length > 1) opts.push({ value: 'goTo', label: t('goToExercise'), icon: 'list' });
    const choice = await chooseDialog(t('more'), opts);
    if (choice === 'addSet') await safe(async () => { await wk.addExtraSet(session, e); renderAll(); });
    else if (choice === 'skip') {
      await safe(() => wk.toggleSkip(session, e));
      if (e.skipped && get('timer.autoAdvance')) {
        const next = wk.nextIncompleteIndex(session);
        if (next >= 0) { await goTo(next); return; }
      }
      renderAll();
    } else if (choice === 'addExercise') await addExercise();
    else if (choice === 'goTo') {
      const idx = await chooseDialog(t('goToExercise'), session.entries.map((en, i) => {
        const ex = repo.getExercise(en.exerciseId);
        const state = en.skipped ? t('skipped') : `${en.sets.length}/${en.plannedSets}`;
        return { value: i, label: ex ? ex.name : '?', hint: state, active: i === session.currentIndex };
      }));
      if (idx != null) await goTo(idx);
    }
  }

  async function addExercise() {
    const lib = repo.listExercises();
    const id = await chooseDialog(t('addExercise'), [
      { value: '__new', label: t('newExercise'), icon: 'plus' },
      ...lib.map((x) => ({ value: x.id, label: x.name, hint: x.muscleGroup })),
    ]);
    if (!id) return;
    let exId = id;
    if (id === '__new') {
      const name = await textDialog(t('exerciseName'));
      if (!name) return;
      const measure = await chooseDialog(t('measureType'), Object.keys(MEASURES).map((k) => ({ value: k, label: t('measure_' + k) })));
      if (!measure) return;
      const ex = newExercise({ name, measure });
      await safe(() => repo.saveExercise(ex));
      exId = ex.id;
    }
    await safe(() => wk.addExerciseToSession(session, exId));
    renderAll(1);
  }

  // ---- Fine allenamento ----
  function openFinish() {
    const sum = stats.sessionSummary(session);
    const recNames = sum.records.map((id) => (repo.getExercise(id) || {}).name).filter(Boolean);
    const notes = h('textarea', { class: 'input', rows: 3, placeholder: t('notes'), 'aria-label': t('notes') });
    notes.value = session.notes || '';

    const lastBw = repo.latestBodyweight();
    let logBw = false;
    const bwStepper = stepper({
      label: `${t('bodyweight')} (${weightUnit()})`,
      value: kgToDisplay(lastBw ? lastBw.kg : get('workout.defaultBodyweightKg')),
      step: get('units.bodyweightStep'), min: 0, decimals: 2,
    });
    bwStepper.el.hidden = true;
    const bwRow = h('div', { class: 'setting-row' }, h('span', null, t('logBodyweight')),
      toggle(false, (v) => { logBw = v; bwStepper.el.hidden = !v; }, t('logBodyweight')));

    const content = h('div', { class: 'stack' },
      h('div', { class: 'stats-row' },
        statBox(formatDuration(sum.durationSec), t('duration')),
        statBox(formatVolume(sum.volume), t('volume')),
        statBox(String(sum.setsDone), t('setsDone')),
      ),
      h('div', { class: 'records' },
        h('div', { class: 'card-eyebrow' }, icon('trophy'), t('recordsBeaten')),
        recNames.length ? h('ul', { class: 'exercise-preview' }, recNames.map((n) => h('li', null, n))) : h('p', { class: 'muted small' }, t('noRecords')),
      ),
      sum.setsDone === 0 ? h('p', { class: 'hint' }, t('noSetsDone')) : null,
      bwRow, bwStepper.el, notes,
    );

    const sheet = openSheet({
      title: t('summaryTitle'),
      content,
      actions: [
        button(t('discardWorkout'), { variant: 'danger-ghost', onClick: async () => {
          if (!(await confirmDialog(t('discardConfirm'), { okLabel: t('discardWorkout'), danger: true }))) return;
          await safe(() => wk.discardSession());
          close();
          toast(t('workoutDiscarded'));
          ctx.navigate('home');
        } }),
        button(t('continueWorkout'), { onClick: () => sheet.close() }),
        button(t('saveWorkout'), { variant: 'primary', disabled: sum.setsDone === 0, onClick: async () => {
          const bw = logBw ? displayToKg(bwStepper.value) : null;
          const ok = await safe(() => wk.finishSession(session, { notes: notes.value.trim(), bodyweightKg: bw }));
          if (!ok) return;
          close();
          toast(t('workoutSaved'), { type: 'success' });
          ctx.navigate('home');
          afterWorkoutBackup();
        } }),
      ],
      className: 'sheet-tall',
    });
    function close() {
      sheet.close();
      timer.stop(true);
      fb.keepScreenOn(false);
    }
  }

  // ---- Scorrimento laterale fra esercizi ----
  if (get('workout.swipe')) {
    let sx = 0; let sy = 0; let tracking = false;
    pane.addEventListener('pointerdown', (ev) => { tracking = true; sx = ev.clientX; sy = ev.clientY; });
    pane.addEventListener('pointerup', (ev) => {
      if (!tracking) return;
      tracking = false;
      const dx = ev.clientX - sx; const dy = ev.clientY - sy;
      if (Math.abs(dx) > get('workout.swipeThresholdPx') && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goTo(session.currentIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    });
    pane.addEventListener('pointercancel', () => { tracking = false; });
  }

  renderAll();

  return () => {
    clearInterval(clockInterval);
    clearTimeout(restHideTimer);
    timer.destroy();
    fb.keepScreenOn(false);
  };
}

/**
 * Dopo il salvataggio di un allenamento: copia interna periodica (senza tocchi)
 * e, se è passato abbastanza tempo, proposta di salvare il backup su iCloud Drive.
 */
async function afterWorkoutBackup() {
  try { await io.periodicSnapshotIfDue(); } catch (err) { console.warn(err); }
  const due = await io.backupPromptAfterWorkoutDue().catch(() => null);
  if (!due) return;
  // Il file si prepara prima del tocco: Safari apre la condivisione solo subito dopo un tocco
  const prepared = await io.prepareBackup().catch(() => null);
  if (!prepared) return;
  // Si aspetta che la Home sia disegnata (il cambio di schermata chiude i pannelli aperti)
  await new Promise((r) => setTimeout(r, 400));
  const s = openSheet({
    title: t('afterWorkoutBackupTitle'),
    content: h('div', { class: 'stack' },
      h('p', null, due.never ? t('afterWorkoutBackupNever') : t('afterWorkoutBackupDays', { n: due.days })),
      h('p', { class: 'muted small' }, t('afterWorkoutBackupText'))),
    actions: [
      button(t('notNow'), { onClick: () => s.close() }),
      button(t('saveBackupNow'), { variant: 'primary', iconName: 'archive', onClick: async () => {
        const res = await safe(() => io.exportPreparedBackup(prepared));
        if (res === 'cancelled') return;
        if (res) { toast(t('exportDone'), { type: 'success' }); s.close(); }
      } }),
    ],
  });
}

function statBox(value, label) {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label));
}
