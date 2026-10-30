// Impostazioni: generate dallo schema, ogni voce con valore predefinito e ripristino.

import { h, icon } from '../dom.js';
import * as config from '../../config.js';
import { t, get } from '../../config.js';
import * as db from '../../db.js';
import { DEFAULTS } from '../../config-default.js';
import { SETTINGS_SCHEMA } from '../../settings-schema.js';
import { formatNumber, formatDate, formatTime } from '../../format.js';
import { button, stepper, toggle, segmented, confirmDialog, toast, safe, openSheet, helpTip } from '../components.js';
import * as io from '../../io.js';
import * as pwa from '../../pwa.js';
import * as fb from '../../feedback.js';
import * as notify from '../../notify.js';
import * as push from '../../push.js';
import { debounce } from '../../util.js';

// Sezioni aperte (si ricordano finché l'app resta aperta)
const openSections = new Set();

export function render(root, ctx) {
  ctx.setFullscreen(false);
  root.append(h('header', { class: 'page-header' }, h('h1', { class: 'page-title' }, t('tabSettings'))));
  root.append(dataSection(ctx));

  const sections = [...SETTINGS_SCHEMA, labelsSection()];
  for (const sec of sections) {
    const details = h('details', { class: 'card settings-section' },
      h('summary', null, h('span', null, sec.title), icon('right', 'chev')),
      h('div', { class: 'settings-items' }, sec.items.map(renderItem)),
    );
    details.open = openSections.has(sec.id);
    details.addEventListener('toggle', () => {
      if (details.open) openSections.add(sec.id); else openSections.delete(sec.id);
    });
    root.append(details);
  }

  // Stato dell'archiviazione
  const storageNote = h('p', { class: 'muted small' });
  root.append(h('section', { class: 'card stack' },
    storageNote,
    button(t('resetAll'), { iconName: 'reset', onClick: async () => {
      if (!(await confirmDialog(t('resetAllConfirm')))) return;
      await safe(() => config.resetAll());
      toast(t('resetDone'), { type: 'success' });
      ctx.render();
    } }),
    button(t('wipeData'), { variant: 'danger-ghost', iconName: 'x', onClick: async () => {
      if (!(await confirmDialog(t('wipeConfirm1'), { okLabel: t('delete'), danger: true }))) return;
      if (!(await confirmDialog(t('wipeConfirm2'), { okLabel: t('wipeData'), danger: true }))) return;
      await safe(async () => {
        await db.wipeAll();
        toast(t('wipeDone'));
        // Si ricarica: al riavvio viene ricaricata la scheda di esempio
        setTimeout(() => location.reload(), 600);
      });
    } }),
  ));
  db.getMeta('persisted', false).then((p) => { storageNote.textContent = p ? t('storagePersisted') : t('storageNotPersisted'); });

  root.append(notifyCard(ctx));
  root.append(pushCard(ctx));

  // Informazioni sull'app e aggiornamenti
  const versionEl = h('p', { class: 'muted small' }, get('app.name'));
  pwa.appVersion().then((v) => { versionEl.textContent = `${get('app.name')} · ${t('appVersion', { v: v || '—' })}`; });
  root.append(h('section', { class: 'card stack' },
    h('div', { class: 'card-title' }, t('aboutApp')),
    versionEl,
    h('p', { class: 'muted small' }, pwa.offlineReady() ? t('offlineReady') : t('offlineNotReady')),
    button(t('testSound'), { iconName: 'clock', className: 'btn-block', onClick: () => {
      // Il tocco stesso riattiva l'audio, poi si suona la fine del recupero
      fb.unlockAudio();
      setTimeout(() => fb.playSound('end'), 60);
      toast(get('timer.sound') ? t('testSoundHint') : t('testSoundOff'));
    } }),
    button(t('testFlash'), { iconName: 'clock', className: 'btn-block', onClick: () => {
      if (get('timer.flash')) fb.flashScreen();
      else toast(t('testFlashOff'));
    } }),
    button(t('checkUpdates'), { iconName: 'reset', className: 'btn-block', onClick: async () => {
      const r = await pwa.checkForUpdate();
      const v = (await pwa.appVersion()) || '—';
      toast(r === 'latest' ? t('upToDate', { v }) : r === 'updating' ? t('updateChecking') : t('updateUnavailable'), { duration: 6000 });
    } }),
  ));
}

// ---------- Notifiche e vibrazione ----------

function notifyCard(ctx) {
  const app = get('app.name');
  const perm = notify.permission();
  const statusKey = {
    granted: 'notifyStatusGranted', denied: 'notifyStatusDenied',
    default: 'notifyStatusDefault', unsupported: 'notifyStatusUnsupported',
  }[perm];
  const delay = get('notify.testDelaySec');
  const parts = [
    h('div', { class: 'card-title' }, t('notifySection')),
    h('p', { class: 'muted small' }, t('notifyIntro')),
    h('p', { class: 'small' + (perm === 'denied' ? ' text-danger' : '') }, t(statusKey, { app })),
  ];
  // Su iPhone, in Safari (non dalla Home) l'API non esiste proprio
  if (perm === 'unsupported' && !notify.isStandalone()) parts.push(h('p', { class: 'muted small' }, t('notifyNeedsHome')));

  if (perm === 'default') {
    parts.push(button(t('notifyEnable'), { variant: 'primary', iconName: 'check', className: 'btn-block', onClick: async () => {
      // Richiesta subito dentro il tocco (requisito di iOS)
      const r = await notify.requestPermission();
      if (r === 'granted') {
        // Chi attiva il permesso vuole anche la notifica a fine recupero
        await safe(() => config.set('notify.local', true));
        toast(t('notifyEnabled'), { type: 'success' });
      } else toast(t('notifyRefused'));
      ctx.render({ keepScroll: true });
    } }));
  }
  if (perm === 'granted') {
    parts.push(
      button(t('notifyTestNow'), { variant: 'primary', iconName: 'clock', className: 'btn-block', onClick: async () => {
        const ok = await notify.test(0);
        toast(ok ? t('notifyTestSent') : t('notifyTestFailed'), { duration: 6000 });
      } }),
      button(t('notifyTestLater', { n: delay }), { iconName: 'clock', className: 'btn-block', onClick: () => {
        notify.test(delay);
        toast(t('notifyTestLaterHint', { n: delay }), { duration: 6000 });
      } }),
    );
  }
  parts.push(h('details', { class: 'archived-block' },
    h('summary', null, t('notifyPhoneSettings')),
    ...t('notifyPhoneSettingsText', { app }).split('\n').map((line) => h('p', { class: 'small' }, line))));
  return h('section', { class: 'card stack' }, parts);
}

// ---------- Server di notifica (push) ----------

function pushCard(ctx) {
  const card = h('section', { class: 'card stack' },
    h('div', { class: 'card-title with-help' }, t('pushSection'), helpTip('pushServer', t('pushSection'))),
    h('p', { class: 'muted small' }, t('pushIntro')));
  // La guida serve soprattutto finché il server non è pronto: tasto in evidenza in quel caso
  const guideBtn = (primary) => h('a', {
    class: `btn btn-${primary ? 'primary' : 'secondary'} btn-block`, href: push.guideUrl(), target: '_blank', rel: 'noopener',
  }, icon('text'), h('span', null, t('pushGuide')));
  if (!push.configured()) card.append(guideBtn(true));
  else card.append(guideBtn(false));
  if (!push.supported() || notify.permission() === 'unsupported') {
    card.append(h('p', { class: 'small' }, notify.isStandalone() ? t('notifyStatusUnsupported') : t('notifyNeedsHome')));
    return card;
  }
  if (!push.configured()) {
    card.append(h('p', { class: 'small' }, t('pushOff')));
    return card;
  }
  if (notify.permission() !== 'granted') {
    card.append(h('p', { class: 'small' }, t('pushNeedsNotify')));
    return card;
  }

  const serverEl = h('p', { class: 'small' }, t('pushChecking'));
  const linkEl = h('p', { class: 'small' });
  const lastEl = h('p', { class: 'muted small' });
  const buttons = h('div', { class: 'stack' });
  card.append(serverEl, linkEl, lastEl, buttons);

  const last = push.getLastResult();
  if (last) {
    const time = formatTime(last.at);
    lastEl.textContent = last.ok ? t('pushLastOk', { time }) : t('pushLastErr', { time, msg: last.error });
  }

  // Tutto il necessario si prepara subito: al tocco l'iscrizione parte senza attese (iOS)
  let reg = null;
  let key = null;
  (async () => {
    reg = await push.registration();
    key = await push.savedPublicKey();
    try {
      key = await push.fetchPublicKey();
      serverEl.textContent = t('pushServerOk');
      serverEl.classList.remove('text-danger');
    } catch (err) {
      serverEl.textContent = t('pushServerErr', { msg: err.name === 'AbortError' ? t('pushTimeout') : err.message });
      serverEl.classList.add('text-danger');
    }
    // Iscrizione fatta con chiavi diverse (chiavi del server cambiate): va rifatta
    let sub = await push.getSubscription();
    if (sub && key && !push.sameKey(sub, key)) sub = null;
    linkEl.textContent = sub ? t('pushLinked') : t('pushNotLinked');
    const delay = get('push.testDelaySec');
    buttons.replaceChildren(...[
      sub ? null : button(t('pushLink'), { variant: 'primary', iconName: 'check', className: 'btn-block', onClick: async () => {
        if (!reg || !key) { toast(t('pushLinkErr', { msg: serverEl.textContent }), { type: 'danger', duration: 6000 }); return; }
        try {
          await push.subscribe(reg, key);
          toast(t('pushLinkDone'), { type: 'success' });
        } catch (err) {
          toast(t('pushLinkErr', { msg: err.message }), { type: 'danger', duration: 7000 });
        }
        ctx.render({ keepScroll: true });
      } }),
      sub ? button(t('pushTest', { n: delay }), { variant: 'primary', iconName: 'clock', className: 'btn-block', onClick: async () => {
        try {
          await push.test(delay);
          toast(t('pushTestHint', { n: delay }), { duration: 6000 });
        } catch (err) {
          toast(t('pushTestErr', { msg: err.name === 'AbortError' ? t('pushTimeout') : err.message }), { type: 'danger', duration: 7000 });
        }
      } }) : null,
      sub ? button(t('pushUnlink'), { variant: 'danger-ghost', iconName: 'x', className: 'btn-block', onClick: async () => {
        await safe(() => push.unsubscribe());
        toast(t('pushUnlinked'));
        ctx.render({ keepScroll: true });
      } }) : null,
    ].filter(Boolean));
  })();
  return card;
}

// ---------- Backup e dati ----------

function dataSection(ctx) {
  // File preparati subito, così al tocco sono già pronti
  let preparedBackup = null;
  let preparedCsv = null;
  io.prepareBackup().then((p) => { preparedBackup = p; }).catch(() => {});
  io.prepareCsv().then((p) => { preparedCsv = p; }).catch(() => {});

  const lastEl = h('p', { class: 'muted small' });
  io.lastExport().then((ts) => {
    lastEl.textContent = ts ? t('lastExportAt', { date: `${formatDate(ts)} ${formatTime(ts)}` }) : t('neverExported');
  });

  // Selettore di file nascosto, aperto dal tasto "Importa"
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', 'aria-hidden': 'true', tabindex: '-1' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let text;
    try { text = await io.readFile(file); } catch { toast(t('importErrRead'), { type: 'danger', duration: 6000 }); return; }
    const res = io.validateBackup(text);
    if (!res.ok) { toast(res.error, { type: 'danger', duration: 7000 }); return; }
    chooseImportMode(res);
  });

  const autoList = h('div', { class: 'stack' });
  const drawAuto = async () => {
    const list = await io.listAutoBackups();
    if (!list.length) { autoList.replaceChildren(h('p', { class: 'muted small' }, t('noAutoBackups'))); return; }
    autoList.replaceChildren(...list.map((item, i) => {
      const date = `${formatDate(item.at)} ${formatTime(item.at)}`;
      return h('button', { type: 'button', class: 'choice', onClick: async () => {
        if (!(await confirmDialog(t('restoreAutoConfirm', { date }), { danger: true, okLabel: t('restore') }))) return;
        const ok = await safe(async () => { await io.restoreAutoBackup(i); return true; });
        if (ok) { toast(t('restoreDone'), { type: 'success' }); setTimeout(() => location.reload(), 700); }
      } }, icon('reset'), h('span', { class: 'choice-text' },
        h('span', { class: 'choice-label' }, t('autoBackupItem', { date, reason: t('reason_' + item.reason) }))));
    }));
  };
  drawAuto();

  const autoDetails = h('details', { class: 'archived-block' },
    h('summary', null, t('autoBackups')),
    h('p', { class: 'muted small' }, t('autoBackupsHint')),
    autoList);

  return h('section', { class: 'card stack' },
    h('div', { class: 'card-title' }, t('dataSection')),
    lastEl,
    button(t('exportBackup'), { variant: 'primary', iconName: 'archive', className: 'btn-block', onClick: async () => {
      // File già pronto: la condivisione parte subito dopo il tocco (requisito di Safari)
      const res = await safe(() => (preparedBackup ? io.exportPreparedBackup(preparedBackup) : io.exportBackup()));
      if (res === 'cancelled') toast(t('exportCancelled'));
      else if (res) { toast(t('exportDone'), { type: 'success' }); ctx.render({ keepScroll: true }); }
    } }),
    h('p', { class: 'setting-help' }, t('exportBackupHint')),
    button(t('importBackup'), { iconName: 'reset', className: 'btn-block', onClick: () => fileInput.click() }),
    h('p', { class: 'setting-help' }, t('importBackupHint')),
    button(t('exportCsv'), { iconName: 'text', className: 'btn-block', onClick: async () => {
      const res = await safe(async () => io.exportPreparedCsv(preparedCsv || await io.prepareCsv()));
      if (res && res !== 'cancelled') toast(t('csvDone'), { type: 'success' });
    } }),
    h('p', { class: 'setting-help' }, t('exportCsvHint')),
    fileInput,
    autoDetails,
  );
}

/** Dopo la validazione: riepilogo del file e scelta fra unire e sostituire. */
function chooseImportMode(res) {
  const { backup, counts } = res;
  const s = openSheet({
    title: t('importSummaryTitle'),
    content: h('div', { class: 'stack' },
      h('p', null, t('importSummary', counts)),
      backup.exportedAt ? h('p', { class: 'muted small' }, t('importExportedAt', { date: `${formatDate(backup.exportedAt)} ${formatTime(backup.exportedAt)}` })) : null,
      h('div', { class: 'import-option' }, h('strong', null, t('importMerge')), h('p', { class: 'muted small' }, t('importMergeHint'))),
      h('div', { class: 'import-option' }, h('strong', null, t('importReplace')), h('p', { class: 'muted small' }, t('importReplaceHint'))),
    ),
    actions: [
      button(t('importReplace'), { variant: 'danger-ghost', onClick: async () => {
        if (!(await confirmDialog(t('importReplaceConfirm'), { danger: true, okLabel: t('importReplace') }))) return;
        const r = await safe(() => io.importBackup(backup, 'replace'));
        if (r) done(t('importDoneReplace'));
      } }),
      button(t('importMerge'), { variant: 'primary', onClick: async () => {
        const r = await safe(() => io.importBackup(backup, 'merge'));
        if (r) done(t('importDoneMerge', { added: r.added, updated: r.updated }));
      } }),
    ],
  });
  function done(msg) {
    s.close();
    toast(msg, { type: 'success' });
    // Si ricarica l'app per rileggere dati e impostazioni
    setTimeout(() => location.reload(), 900);
  }
}

/** Sezione "Etichette" generata automaticamente da tutti i testi. */
function labelsSection() {
  return {
    id: 'labels',
    title: 'Testi dell\'interfaccia',
    items: Object.keys(DEFAULTS.labels).map((k) => ({ path: 'labels.' + k, type: 'text', label: DEFAULTS.labels[k], compact: true })),
  };
}

function defaultText(item, v) {
  if (item.type === 'toggle') return v ? t('yes') : t('no');
  if (item.type === 'number') return formatNumber(v, item.decimals ?? 2);
  if (item.type === 'weekdays') return v.map((d) => get('dates.weekdayShort')[d]).join(', ');
  if (item.options) return (item.options.find((o) => o.value === v) || {}).label || String(v);
  return String(v);
}

function renderItem(item) {
  const row = h('div', { class: 'setting' + (item.compact ? ' compact' : '') });
  const draw = () => {
    row.replaceChildren(...buildItem(item, draw).filter(Boolean));
  };
  draw();
  return row;
}

function buildItem(item, redraw) {
  const value = get(item.path);
  const def = config.getDefault(item.path);
  const save = (v) => safe(async () => { await config.set(item.path, v); redraw(); });
  const resetBtn = config.isOverridden(item.path)
    ? h('button', { type: 'button', class: 'link-btn', onClick: () => safe(async () => { await config.reset(item.path); redraw(); }) }, icon('reset'), t('resetOne'))
    : null;

  let control;
  switch (item.type) {
    case 'toggle':
      control = toggle(value, (v) => save(v), item.label);
      break;
    case 'segmented':
      control = segmented(item.options, value, (v) => save(v), item.label);
      break;
    case 'select': {
      const sel = h('select', { class: 'input', 'aria-label': item.label },
        item.options.map((o) => h('option', { value: String(o.value) }, o.label)));
      sel.value = String(value);
      sel.addEventListener('change', () => {
        const o = item.options.find((x) => String(x.value) === sel.value);
        save(o ? o.value : sel.value);
      });
      control = sel;
      break;
    }
    case 'number': {
      const debounced = debounce((v) => save(v), 400);
      const st = stepper({
        label: item.label, value, step: item.step, min: item.min, max: item.max, decimals: item.decimals ?? 2,
        // Il salvataggio ridisegna la riga: si attende la fine dei tocchi ripetuti
        onChange: (v) => debounced(v),
      });
      st.el.classList.add('stepper-compact');
      control = h('div', null, st.el,
        item.presets ? h('div', { class: 'chips chips-sm' }, item.presets.map((p) =>
          h('button', { type: 'button', class: 'chip chip-sm' + (p === value ? ' active' : ''), onClick: () => save(p) }, formatNumber(p, item.decimals ?? 2)))) : null);
      break;
    }
    case 'color': {
      const input = h('input', { type: 'color', class: 'color-input', 'aria-label': item.label });
      input.value = value;
      input.addEventListener('change', () => save(input.value));
      control = input;
      break;
    }
    case 'weekdays': {
      const names = get('dates.weekdayShort');
      const first = get('dates.firstDayOfWeek');
      const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (i + first) % 7);
      control = h('div', { class: 'chips', role: 'group', 'aria-label': item.label }, order.map((d) => {
        const on = value.includes(d);
        return h('button', {
          type: 'button', class: 'chip' + (on ? ' active' : ''), 'aria-pressed': on ? 'true' : 'false',
          onClick: () => save(on ? value.filter((x) => x !== d) : [...value, d].sort()),
        }, names[d]);
      }));
      break;
    }
    default: {
      const input = h('input', { type: 'text', class: 'input', 'aria-label': item.label, placeholder: String(def), autocomplete: 'off' });
      input.value = config.isOverridden(item.path) ? value : '';
      input.addEventListener('change', () => (input.value.trim() === '' ? safe(async () => { await config.reset(item.path); redraw(); }) : save(input.value)));
      control = h('div', null, input,
        item.presets ? h('div', { class: 'chips chips-sm' }, item.presets.map((p) =>
          h('button', { type: 'button', class: 'chip chip-sm' + (p === value ? ' active' : ''), onClick: () => save(p) }, p))) : null);
    }
  }

  const isNumber = item.type === 'number';
  return [
    isNumber ? null : h('div', { class: 'setting-label' }, item.label),
    control,
    item.help ? h('div', { class: 'setting-help' }, item.help) : null,
    h('div', { class: 'setting-foot' },
      h('span', { class: 'setting-default' }, `${t('settingsDefault')}: ${defaultText(item, def)}`),
      resetBtn),
  ];
}
