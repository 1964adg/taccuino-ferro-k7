// Home: l'allenamento di oggi, pronto da iniziare con un tocco.

import { h, icon } from '../dom.js';
import { t, get } from '../../config.js';
import * as repo from '../../domain/repo.js';
import * as wk from '../../domain/workout.js';
import { sessionSummary } from '../../domain/stats.js';
import { formatDate, formatDuration, formatVolume } from '../../format.js';
import { button, chooseDialog, safe, toast } from '../components.js';
import * as io from '../../io.js';

// Giorno scelto a mano dall'utente (resta finché non si avvia o si riapre l'app)
let manualDayId = null;

export function render(root, ctx) {
  ctx.setFullscreen(false);
  const active = repo.getActive();
  const program = repo.getActiveProgram();
  const userName = get('app.userName');
  const nowDate = new Date();

  const header = h('header', { class: 'page-header' },
    h('div', { class: 'eyebrow' }, formatDate(nowDate.getTime(), get('dates.longFormat'))),
    h('h1', { class: 'page-title' }, userName ? t('helloName', { name: userName }) : get('app.name')),
  );

  const content = h('div', { class: 'stack' });

  // ---- Allenamento in corso ----
  if (active) {
    const sum = sessionSummary(active);
    content.append(h('section', { class: 'card card-accent' },
      h('div', { class: 'card-eyebrow' }, icon('fire'), t('resumeWorkout')),
      h('div', { class: 'card-title' }, active.dayName || t('tabWorkout')),
      h('div', { class: 'card-meta' }, `${sum.setsDone} ${t('setsDone').toLowerCase()} · ${formatDuration(sum.durationSec)}`),
    ));
  }

  // ---- Giorno proposto ----
  let selected = null;
  if (program && !active) {
    const days = repo.sortedDays(program);
    const suggestion = wk.suggestDay(program, nowDate);
    selected = (manualDayId && days.find((d) => d.id === manualDayId)) || (suggestion && suggestion.day);
    const reason = manualDayId && selected && selected.id === manualDayId && (!suggestion || suggestion.day.id !== manualDayId)
      ? t('chooseOtherDay')
      : (suggestion && suggestion.reason === 'scheduled' ? t('scheduledToday') : t('nextInRotation'));

    if (selected) {
      const exNames = selected.items.map((it) => (repo.getExercise(it.exerciseId) || {}).name).filter(Boolean);
      content.append(h('section', { class: 'card card-hero' },
        h('div', { class: 'card-eyebrow' }, icon('calendar'), reason),
        h('div', { class: 'card-title big' }, selected.name),
        h('div', { class: 'card-meta' }, program.name + ' · ' + t('exercisesCount', { n: exNames.length })),
        h('ul', { class: 'exercise-preview' }, exNames.map((n) => h('li', null, n))),
        !wk.isTrainingWeekday(nowDate) ? h('div', { class: 'hint' }, t('restDayHint')) : null,
      ));

      // Altri giorni: un tocco per sceglierli
      if (days.length > 1) {
        content.append(h('div', { class: 'chips', role: 'group', 'aria-label': t('chooseOtherDay') },
          days.map((d) => h('button', {
            type: 'button',
            class: 'chip' + (d.id === selected.id ? ' active' : ''),
            'aria-pressed': d.id === selected.id ? 'true' : 'false',
            onClick: () => { manualDayId = d.id; ctx.render(); },
          }, d.name)),
        ));
      }
    }
  } else if (!program && !active) {
    content.append(h('section', { class: 'card' }, h('p', { class: 'muted' }, t('noActiveProgram'))));
  }

  // ---- Ultimo allenamento ----
  const last = repo.listSessions()[0];
  if (last) {
    const sum = sessionSummary(last);
    content.append(h('button', { type: 'button', class: 'card card-link', onClick: () => ctx.navigate(`progress/session/${last.id}`) },
      h('div', { class: 'card-eyebrow' }, t('lastSession')),
      h('div', { class: 'card-title' }, last.dayName || '—'),
      h('div', { class: 'stats-row cols-2' },
        stat(formatDate(last.startedAt, get('dates.shortFormat')), t('date')),
        stat(formatDuration(sum.durationSec), t('duration')),
        stat(formatVolume(sum.volume), t('volume')),
        stat(String(sum.setsDone), t('setsDone')),
      ),
    ));
  } else {
    content.append(h('p', { class: 'muted center small' }, t('noSessionsYet')));
  }

  // ---- Tasto principale in basso, raggiungibile col pollice ----
  const cta = h('div', { class: 'cta-bar' });
  if (active) {
    cta.append(button(t('resumeWorkout'), { variant: 'primary', className: 'btn-xl', iconName: 'dumbbell', onClick: () => ctx.navigate('workout') }));
  } else if (selected) {
    cta.append(button(t('startWorkout'), {
      variant: 'primary', className: 'btn-xl', iconName: 'dumbbell',
      onClick: () => safe(async () => {
        await wk.startSession(program, selected);
        manualDayId = null;
        ctx.navigate('workout');
      }),
    }));
  } else if (program) {
    cta.append(button(t('chooseOtherDay'), {
      className: 'btn-xl',
      onClick: async () => {
        const id = await chooseDialog(t('chooseOtherDay'), repo.sortedDays(program).map((d) => ({ value: d.id, label: d.name })));
        if (id) { manualDayId = id; ctx.render(); }
      },
    }));
  }

  root.append(header, content, cta);
  showBackupReminder(content, ctx);
}

/** Avviso discreto se è passato troppo tempo dall'ultimo backup. */
async function showBackupReminder(content, ctx) {
  const due = await io.backupReminderDue(repo.listSessions()).catch(() => null);
  if (!due || !content.isConnected) return;
  // File preparato subito: al tocco la condivisione parte immediatamente (requisito di Safari)
  let prepared = null;
  io.prepareBackup().then((p) => { prepared = p; }).catch(() => {});
  const card = h('section', { class: 'card card-reminder', role: 'note' },
    h('div', { class: 'card-eyebrow' }, icon('archive'), t('reminderTitle')),
    h('p', { class: 'small' }, due.never ? t('reminderNever') : t('reminderDays', { n: due.days }), ' ', t('reminderText')),
    h('div', { class: 'row' },
      button(t('reminderLater'), { className: 'btn-sm grow', onClick: async () => {
        await safe(() => io.snoozeBackupReminder());
        card.remove();
      } }),
      button(t('reminderNow'), { variant: 'primary', className: 'btn-sm grow', onClick: async () => {
        const res = await safe(() => (prepared ? io.exportPreparedBackup(prepared) : io.exportBackup()));
        if (res && res !== 'cancelled') { toast(t('exportDone'), { type: 'success' }); card.remove(); }
      } }),
    ));
  content.prepend(card);
}

function stat(value, label) {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), label ? h('div', { class: 'stat-label' }, label) : null);
}
