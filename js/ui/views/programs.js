// Schede e programmazione: elenco schede, dettaglio scheda (giorni), dettaglio giorno (esercizi).
// Indirizzi: #/programs, #/programs/p/<id>, #/programs/p/<id>/d/<id>, #/programs/library, #/programs/import

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as ops from '../../domain/programs.js';
import { restFor } from '../../domain/model.js';
import { button, chooseDialog, confirmDialog, textDialog, toast, safe } from '../components.js';
import { makeSortable } from '../sortable.js';
import { weekdayChips, pickExercise, editItem } from '../editors.js';
import { fmtItem } from '../setformat.js';
import { exerciseIcon } from '../pictograms.js';
import * as library from './library.js';
import * as importView from './import.js';

export function render(root, ctx) {
  ctx.setFullscreen(false);
  const [a, b, c, d] = ctx.params;
  if (a === 'library') return library.render(root, ctx);
  if (a === 'import') return importView.render(root, ctx);
  if (a === 'p' && b) {
    const program = repo.getProgram(b);
    if (!program) return renderList(root, ctx);
    if (c === 'd' && d) {
      const day = program.days.find((x) => x.id === d);
      if (day) return renderDay(root, ctx, program, day);
    }
    return renderProgram(root, ctx, program);
  }
  return renderList(root, ctx);
}

// Ridisegna restando alla stessa altezza della pagina
const refresh = (ctx) => ctx.render({ keepScroll: true });

export function backLink(label, onClick) {
  return h('button', { type: 'button', class: 'back-link', onClick }, icon('left'), h('span', null, label));
}

/** Riga riordinabile: maniglia, contenuto toccabile, frecce su e giù. */
function sortRow({ main, onOpen, onUp, onDown, isFirst, isLast }) {
  return h('li', { class: 'sort-row', 'data-sort-item': true },
    h('button', { type: 'button', class: 'drag-handle', 'aria-label': t('dragHandle') }, icon('grip')),
    h('button', { type: 'button', class: 'sort-main', onClick: onOpen }, main),
    h('div', { class: 'sort-arrows' },
      h('button', { type: 'button', class: 'arrow-btn', 'aria-label': t('moveUp'), disabled: isFirst || null, onClick: onUp }, icon('up')),
      h('button', { type: 'button', class: 'arrow-btn', 'aria-label': t('moveDown'), disabled: isLast || null, onClick: onDown }, icon('down')),
    ),
  );
}

// ---------- Elenco schede ----------

function renderList(root, ctx) {
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabPrograms'))));

  root.append(h('div', { class: 'action-grid' },
    button(t('newProgram'), { variant: 'primary', iconName: 'plus', onClick: async () => {
      const name = await textDialog(t('programName'));
      if (!name) return;
      const p = await safe(() => ops.createProgram(name));
      if (p) ctx.navigate(`programs/p/${p.id}`);
    } }),
    button(t('importText'), { iconName: 'text', onClick: () => ctx.navigate('programs/import') }),
    button(t('library'), { iconName: 'dumbbell', onClick: () => ctx.navigate('programs/library') }),
  ));

  const programs = repo.listPrograms();
  if (!programs.length) root.append(h('p', { class: 'muted' }, t('noPrograms')));
  for (const p of programs) root.append(programCard(p, ctx));

  const archived = repo.listPrograms({ includeArchived: true }).filter((p) => p.archived);
  if (archived.length) {
    root.append(h('details', { class: 'archived-block' },
      h('summary', null, `${t('archivedSection')} (${archived.length})`),
      h('div', { class: 'stack' }, archived.map((p) => programCard(p, ctx))),
    ));
  }
}

function programCard(p, ctx) {
  const days = repo.sortedDays(p);
  return h('button', { type: 'button', class: 'card card-link' + (p.active ? ' card-active' : ''), onClick: () => ctx.navigate(`programs/p/${p.id}`) },
    h('div', { class: 'card-row' },
      h('div', { class: 'grow' },
        p.active ? h('div', { class: 'card-eyebrow accent' }, icon('star'), t('activeBadge')) : null,
        h('div', { class: 'card-title' }, p.name),
        h('div', { class: 'card-meta' }, days.map((d) => d.name).join(' · ') || t('noDays'))),
      icon('right', 'chev')),
  );
}

// ---------- Dettaglio scheda ----------

function renderProgram(root, ctx, program) {
  root.append(backLink(t('tabPrograms'), () => ctx.navigate('programs')));
  root.append(h('header', { class: 'page-header' },
    program.active ? h('div', { class: 'eyebrow accent' }, t('activeBadge')) : null,
    h('h1', { class: 'page-title' }, program.name),
    program.notes ? h('p', { class: 'muted' }, program.notes) : null,
  ));

  const actions = h('div', { class: 'row wrap' });
  if (!program.active && !program.archived) {
    actions.append(button(t('setActive'), { variant: 'primary', iconName: 'star', onClick: () => safe(async () => {
      await repo.setActiveProgram(program.id);
      refresh(ctx);
    }) }));
  }
  actions.append(button(t('more'), { iconName: 'more', onClick: () => programMenu(ctx, program) }));
  root.append(actions);

  // Giorni
  const days = repo.sortedDays(program);
  if (!days.length) root.append(h('p', { class: 'muted' }, t('noDays')));
  const names = get('dates.weekdayShort');
  const list = h('ul', { class: 'sort-list' }, days.map((d, i) => sortRow({
    main: h('div', { class: 'sort-text' },
      h('span', { class: 'sort-title' }, d.name),
      h('span', { class: 'sort-meta' }, [
        (d.weekdays || []).map((x) => names[x]).join(' '),
        t('exercisesCount', { n: d.items.length }),
      ].filter(Boolean).join(' · '))),
    onOpen: () => ctx.navigate(`programs/p/${program.id}/d/${d.id}`),
    onUp: () => safe(async () => { await ops.reorderDays(program, i, i - 1); refresh(ctx); }),
    onDown: () => safe(async () => { await ops.reorderDays(program, i, i + 1); refresh(ctx); }),
    isFirst: i === 0,
    isLast: i === days.length - 1,
  })));
  makeSortable(list, { onReorder: (from, to) => safe(async () => { await ops.reorderDays(program, from, to); refresh(ctx); }) });
  root.append(list);

  root.append(button(t('addDay'), { iconName: 'plus', className: 'btn-block', onClick: async () => {
    const name = await textDialog(t('dayName'), t('importDefaultDay', { n: days.length + 1 }));
    if (!name) return;
    const d = await safe(() => ops.addDay(program, name));
    if (d) ctx.navigate(`programs/p/${program.id}/d/${d.id}`);
  } }));

  const archivedDays = program.days.filter((d) => d.archived);
  if (archivedDays.length) {
    root.append(h('details', { class: 'archived-block' },
      h('summary', null, `${t('archivedDays')} (${archivedDays.length})`),
      h('ul', { class: 'sort-list' }, archivedDays.map((d) => h('li', { class: 'sort-row' },
        h('button', { type: 'button', class: 'sort-main', onClick: () => ctx.navigate(`programs/p/${program.id}/d/${d.id}`) },
          h('div', { class: 'sort-text' }, h('span', { class: 'sort-title' }, d.name))))))));
  }
}

async function programMenu(ctx, program) {
  const choice = await chooseDialog(program.name, [
    { value: 'rename', label: t('rename'), icon: 'edit' },
    { value: 'notes', label: t('programNotes'), icon: 'text' },
    { value: 'duplicate', label: t('duplicate'), icon: 'copy' },
    { value: 'archive', label: program.archived ? t('unarchive') : t('archive'), icon: 'archive' },
    { value: 'delete', label: t('deleteProgram'), icon: 'x' },
  ]);
  if (choice === 'rename') {
    const name = await textDialog(t('programName'), program.name);
    if (name) { program.name = name; await safe(() => repo.saveProgram(program)); refresh(ctx); }
  } else if (choice === 'notes') {
    const notes = await textDialog(t('programNotes'), program.notes || '', { multiline: true });
    if (notes != null) { program.notes = notes; await safe(() => repo.saveProgram(program)); refresh(ctx); }
  } else if (choice === 'duplicate') {
    const copy = await safe(() => ops.duplicateProgram(program));
    if (copy) ctx.navigate(`programs/p/${copy.id}`);
  } else if (choice === 'archive') {
    await safe(() => ops.setArchivedProgram(program, !program.archived));
    refresh(ctx);
  } else if (choice === 'delete') {
    if (!(await confirmDialog(t('deleteProgramConfirm', { name: program.name }), { okLabel: t('delete'), danger: true }))) return;
    await safe(() => repo.deleteProgram(program.id));
    ctx.navigate('programs');
  }
}

// ---------- Dettaglio giorno ----------

function renderDay(root, ctx, program, day) {
  root.append(backLink(program.name, () => ctx.navigate(`programs/p/${program.id}`)));
  root.append(h('header', { class: 'page-header' },
    day.archived ? h('div', { class: 'eyebrow' }, t('archivedLabel')) : null,
    h('h1', { class: 'page-title' }, day.name),
  ));

  root.append(h('div', { class: 'row wrap' },
    button(t('more'), { iconName: 'more', onClick: () => dayMenu(ctx, program, day) })));

  root.append(h('section', { class: 'card stack' },
    h('div', { class: 'card-eyebrow' }, t('weekdaysLabel')),
    weekdayChips(day.weekdays || [], (v) => safe(async () => { day.weekdays = v; await repo.saveProgram(program); })),
  ));

  if (!day.items.length) root.append(h('p', { class: 'muted' }, t('noItems')));
  const list = h('ul', { class: 'sort-list' }, day.items.map((it, i) => {
    const ex = repo.getExercise(it.exerciseId) || { name: '?', measure: 'weight_reps' };
    return sortRow({
      main: h('div', { class: 'sort-with-icon' }, exerciseIcon(ex, 'sm'), h('div', { class: 'sort-text' },
        h('span', { class: 'sort-title' }, ex.name, ex.archived ? h('span', { class: 'tag' }, t('archivedLabel')) : null),
        h('span', { class: 'sort-meta' }, fmtItem(it, ex, restFor(it, ex))))),
      onOpen: () => openItem(ctx, program, day, it),
      onUp: () => safe(async () => { await ops.reorderItems(program, day, i, i - 1); refresh(ctx); }),
      onDown: () => safe(async () => { await ops.reorderItems(program, day, i, i + 1); refresh(ctx); }),
      isFirst: i === 0,
      isLast: i === day.items.length - 1,
    });
  }));
  makeSortable(list, { onReorder: (from, to) => safe(async () => { await ops.reorderItems(program, day, from, to); refresh(ctx); }) });
  root.append(list);

  root.append(button(t('addExercise'), { variant: 'primary', iconName: 'plus', className: 'btn-block', onClick: async () => {
    const exId = await pickExercise();
    if (!exId) return;
    const it = await safe(() => ops.addItem(program, day, exId));
    if (!it) return;
    refresh(ctx);
    openItem(ctx, program, day, it);
  } }));
}

async function openItem(ctx, program, day, item) {
  const res = await editItem(program, day, item);
  if (res === 'remove') {
    const r = await safe(() => ops.removeItem(program, day, item.id));
    refresh(ctx);
    if (r) {
      toast(t('itemRemoved'), {
        actionLabel: t('restore'),
        onAction: () => safe(async () => { await ops.restoreItem(program, day, r.removed, r.idx); refresh(ctx); }),
      });
    }
  } else if (res === 'saved') {
    refresh(ctx);
  }
}

async function dayMenu(ctx, program, day) {
  const choice = await chooseDialog(day.name, [
    { value: 'rename', label: t('rename'), icon: 'edit' },
    { value: 'duplicate', label: t('duplicate'), icon: 'copy' },
    { value: 'archive', label: day.archived ? t('unarchive') : t('archive'), icon: 'archive' },
    { value: 'delete', label: t('deleteDay'), icon: 'x' },
  ]);
  if (choice === 'rename') {
    const name = await textDialog(t('dayName'), day.name);
    if (name) { day.name = name; await safe(() => repo.saveProgram(program)); refresh(ctx); }
  } else if (choice === 'duplicate') {
    const copy = await safe(() => ops.duplicateDay(program, day));
    if (copy) ctx.navigate(`programs/p/${program.id}/d/${copy.id}`);
  } else if (choice === 'archive') {
    await safe(() => ops.setArchivedDay(program, day, !day.archived));
    refresh(ctx);
  } else if (choice === 'delete') {
    if (!(await confirmDialog(t('deleteDayConfirm', { name: day.name }), { okLabel: t('delete'), danger: true }))) return;
    await safe(() => ops.deleteDay(program, day.id));
    ctx.navigate(`programs/p/${program.id}`);
  }
}
