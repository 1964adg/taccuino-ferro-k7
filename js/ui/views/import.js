// Importazione di una scheda da testo, con anteprima prima di creare qualcosa.

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import { parseProgramText, createProgramFromParsed } from '../../domain/textImport.js';
import { button, toggle, toast, safe } from '../components.js';
import { fmtItem } from '../setformat.js';
import { debounce } from '../../util.js';

// Il testo resta se si esce e si rientra (finché l'app è aperta)
let draftText = '';

export function render(root, ctx) {
  root.append(h('button', { type: 'button', class: 'back-link', onClick: () => ctx.navigate('programs') }, icon('left'), h('span', null, t('tabPrograms'))));
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('importTitle'))));
  root.append(h('p', { class: 'muted' }, t('importHelp')));
  root.append(h('p', { class: 'hint small' }, t('importLegend')));

  const area = h('textarea', {
    class: 'input mono', rows: 10, 'aria-label': t('importTitle'), placeholder: t('importExample'),
    autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false',
  });
  area.value = draftText;
  const preview = h('div', { class: 'stack' });
  let activate = !repo.getActiveProgram();
  const createBtn = button(t('importCreate'), { variant: 'primary', iconName: 'check', className: 'btn-xl' });

  root.append(
    area,
    button(t('useExample'), { className: 'btn-sm', onClick: () => { area.value = t('importExample'); update(); } }),
    h('div', { class: 'card-eyebrow' }, t('importPreview')),
    preview,
    h('div', { class: 'setting-row' }, h('span', null, t('importActivate')), toggle(activate, (v) => { activate = v; }, t('importActivate'))),
    h('div', { class: 'cta-bar' }, createBtn),
  );

  let parsed = null;
  const update = () => {
    draftText = area.value;
    parsed = parseProgramText(area.value);
    const count = parsed.days.reduce((n, d) => n + d.items.length, 0);
    createBtn.disabled = count === 0;
    const parts = [];
    if (!count) parts.push(h('p', { class: 'muted' }, t('importEmpty')));
    if (parsed.name) parts.push(h('div', { class: 'card-title' }, parsed.name));
    for (const d of parsed.days) {
      parts.push(h('section', { class: 'card' },
        h('div', { class: 'card-title' }, d.name),
        d.weekdays.length ? h('div', { class: 'card-meta' }, d.weekdays.map((x) => get('dates.weekdayShort')[x]).join(' ')) : null,
        h('ul', { class: 'plan-list' }, d.items.map((it) => {
          const ex = { measure: it.measure };
          return h('li', null,
            h('span', { class: 'plan-name' }, it.exerciseName, !it.exerciseId ? h('span', { class: 'tag tag-new' }, t('importNewTag')) : null),
            h('span', { class: 'plan-meta' }, `${t('measure_' + it.measure)} · ${fmtItem(it, ex, it.restSec)}`));
        })),
      ));
    }
    if (parsed.warnings.length) {
      parts.push(h('section', { class: 'card card-warn' },
        h('div', { class: 'card-eyebrow' }, t('importWarnings')),
        h('ul', { class: 'plan-list' }, parsed.warnings.map((w) => h('li', null,
          h('span', { class: 'plan-name' }, `${t('importLine', { n: w.line })}: ${w.text}`),
          h('span', { class: 'plan-meta' }, w.reason))))));
    }
    preview.replaceChildren(...parts);
  };
  area.addEventListener('input', debounce(update, 250));
  update();

  createBtn.addEventListener('click', async () => {
    if (!parsed) return;
    const res = await safe(() => createProgramFromParsed(parsed, { activate }));
    if (!res) return;
    draftText = '';
    toast(t('importDone', { n: res.newExercises }), { type: 'success' });
    ctx.navigate(`programs/p/${res.program.id}`);
  });
}
