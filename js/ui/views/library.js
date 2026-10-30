// Libreria esercizi personale: ricerca, creazione, modifica, archivio.

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as ops from '../../domain/programs.js';
import { button, chooseDialog, toast, safe } from '../components.js';
import { editExercise } from '../editors.js';

// La ricerca resta finché l'app è aperta
let query = '';

export function render(root, ctx) {
  root.append(h('button', { type: 'button', class: 'back-link', onClick: () => ctx.navigate('programs') }, icon('left'), h('span', null, t('tabPrograms'))));
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('library'))));
  root.append(h('p', { class: 'hint' }, t('libraryHint')));

  const search = h('input', { class: 'input', type: 'search', placeholder: t('search'), 'aria-label': t('search'), autocomplete: 'off' });
  search.value = query;
  const listWrap = h('div', { class: 'stack' });
  root.append(
    button(t('newExercise'), { variant: 'primary', iconName: 'plus', className: 'btn-block', onClick: async () => {
      const ex = await editExercise(null, { name: query });
      if (ex) ctx.render({ keepScroll: true });
    } }),
    search,
    listWrap,
  );

  const draw = () => {
    const q = repo.normalizeName(query);
    const match = (e) => !q || repo.normalizeName(e.name).includes(q) || repo.normalizeName(e.muscleGroup).includes(q);
    const all = repo.listExercises({ includeArchived: true }).filter(match);
    const active = all.filter((e) => !e.archived);
    const archived = all.filter((e) => e.archived);
    const parts = [];
    if (!all.length) parts.push(h('p', { class: 'muted' }, t('noExercises')));

    // Raggruppati per gruppo muscolare
    const groups = new Map();
    for (const e of active) {
      const g = e.muscleGroup || t('noGroup');
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    }
    const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, get('app.locale')));
    for (const g of keys) {
      parts.push(h('section', { class: 'card list-card' },
        h('div', { class: 'card-eyebrow' }, g),
        h('ul', { class: 'plain-list' }, groups.get(g).map((e) => exRow(e, ctx)))));
    }
    if (archived.length) {
      parts.push(h('details', { class: 'archived-block' },
        h('summary', null, `${t('archivedExercises')} (${archived.length})`),
        h('ul', { class: 'plain-list card list-card' }, archived.map((e) => exRow(e, ctx)))));
    }
    listWrap.replaceChildren(...parts);
  };
  search.addEventListener('input', () => { query = search.value; draw(); });
  draw();
}

function exRow(e, ctx) {
  const n = repo.exerciseUsageCount(e.id);
  return h('li', null, h('div', { class: 'list-row' },
    h('button', { type: 'button', class: 'list-main', onClick: async () => {
      const res = await editExercise(e);
      if (res) ctx.render({ keepScroll: true });
    } },
    h('span', { class: 'sort-title' }, e.name),
    h('span', { class: 'sort-meta' }, [t('measure_' + e.measure), n ? t('usedInDays', { n }) : t('unused')].join(' · '))),
    h('button', { type: 'button', class: 'arrow-btn', 'aria-label': t('more'), onClick: async () => {
      const choice = await chooseDialog(e.name, [
        { value: 'edit', label: t('edit'), icon: 'edit' },
        { value: 'duplicate', label: t('duplicate'), icon: 'copy' },
        { value: 'archive', label: e.archived ? t('unarchive') : t('archive'), icon: 'archive' },
      ]);
      if (choice === 'edit') {
        if (await editExercise(e)) ctx.render({ keepScroll: true });
      } else if (choice === 'duplicate') {
        const copy = await safe(() => ops.duplicateExercise(e));
        if (copy) { toast(t('saved'), { type: 'success' }); ctx.render({ keepScroll: true }); }
      } else if (choice === 'archive') {
        e.archived = !e.archived;
        await safe(() => repo.saveExercise(e));
        ctx.render({ keepScroll: true });
      }
    } }, icon('more')),
  ));
}
