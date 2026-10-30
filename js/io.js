// Esportazione e importazione: backup JSON, cronologia CSV, copie automatiche.

import * as db from './db.js';
import { get, t } from './config.js';
import { now, isPlainObject } from './util.js';
import { measureOf } from './domain/model.js';
import { kgToDisplay, mToDisplay, weightUnit, distanceUnit, formatDate } from './format.js';

const FORMAT = 'gaia-gym-backup';
const S = db.STORES;

// Chiavi di meta che non finiscono nei backup (sono proprie di questo telefono)
const LOCAL_META = ['autoBackups', 'persisted', 'lastExport', 'backupSnoozedUntil', 'lastPeriodicBackup'];

// Archivi con record identificati da "id" e data di modifica "updatedAt"
const RECORD_STORES = [S.exercises, S.programs, S.sessions, S.bodyweight];

// ---- Nomi dei file ----

function stamp(ts = now()) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export const backupFileName = () => `${get('backup.filePrefix')}-${stamp()}.json`;
export const csvFileName = () => `${get('backup.csvPrefix')}-${stamp()}.csv`;

// ---- Condivisione o download ----

/**
 * Su iPhone apre il foglio di condivisione (da lì: "Salva su File" → iCloud Drive).
 * Dove non c'è, scarica il file. Restituisce 'shared' | 'downloaded' | 'cancelled'.
 */
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.share) {
    let can = false;
    try { can = navigator.canShare({ files: [file] }); } catch { can = false; }
    if (can) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
        // Altri errori: si prova col download
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}

// ---- Backup JSON ----

/** Fotografia completa dei dati, pronta per essere salvata in un file. */
export async function buildBackup() {
  const data = await db.dumpAll();
  data.meta = data.meta.filter((m) => !LOCAL_META.includes(m.key));
  return {
    format: FORMAT,
    schemaVersion: db.SCHEMA_VERSION,
    exportedAt: now(),
    appName: get('app.name'),
    data,
  };
}

/**
 * Prepara il file in anticipo. Safari apre la condivisione solo subito dopo
 * un tocco: se si leggessero i dati dopo il tocco, il permesso scadrebbe.
 */
export async function prepareBackup() {
  const backup = await buildBackup();
  return { blob: new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' }), filename: backupFileName() };
}

/** Da chiamare direttamente nel gestore del tocco, con un file già preparato. */
export async function exportPreparedBackup(prepared) {
  const res = await shareOrDownload(prepared.blob, prepared.filename);
  if (res !== 'cancelled') await db.setMeta('lastExport', now());
  return res;
}

export async function exportBackup() {
  return exportPreparedBackup(await prepareBackup());
}

export const lastExport = () => db.getMeta('lastExport', null);

// ---- Validazione ----

/** Legge un file scelto dall'utente. */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('lettura non riuscita'));
    r.readAsText(file);
  });
}

/**
 * Controlla che il testo sia un backup valido.
 * Restituisce { ok: true, backup, counts } oppure { ok: false, error }.
 */
export function validateBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: t('importErrNotJson') };
  }
  if (!isPlainObject(obj) || obj.format !== FORMAT || !isPlainObject(obj.data)) {
    return { ok: false, error: t('importErrFormat') };
  }
  const v = Number(obj.schemaVersion);
  if (!Number.isInteger(v) || v < 1) return { ok: false, error: t('importErrFormat') };
  if (v > db.SCHEMA_VERSION) return { ok: false, error: t('importErrNewer') };

  for (const name of Object.values(S)) {
    const list = obj.data[name];
    if (list === undefined) { obj.data[name] = []; continue; }
    if (!Array.isArray(list)) return { ok: false, error: t('importErrStore', { name }) };
    const key = name === S.meta ? 'key' : 'id';
    for (const rec of list) {
      if (!isPlainObject(rec) || typeof rec[key] !== 'string' || !rec[key]) {
        return { ok: false, error: t('importErrRecord', { name }) };
      }
    }
  }
  // Controlli di coerenza minimi sui record principali
  for (const s of obj.data[S.sessions]) {
    if (!Number.isFinite(s.startedAt) || !Array.isArray(s.entries)) return { ok: false, error: t('importErrRecord', { name: S.sessions }) };
  }
  for (const p of obj.data[S.programs]) {
    if (!Array.isArray(p.days)) return { ok: false, error: t('importErrRecord', { name: S.programs }) };
  }

  obj.data = db.migrateData(obj.data, v);
  obj.data.meta = obj.data.meta.filter((m) => !LOCAL_META.includes(m.key) && m.key !== 'schemaVersion');
  return {
    ok: true,
    backup: obj,
    counts: {
      programs: obj.data[S.programs].length,
      exercises: obj.data[S.exercises].length,
      sessions: obj.data[S.sessions].length,
      bodyweight: obj.data[S.bodyweight].length,
    },
  };
}

// ---- Copie automatiche (prima di ogni importazione) ----

export async function listAutoBackups() {
  return db.getMeta('autoBackups', []);
}

/**
 * Salva una copia interna. Le copie periodiche e quelle fatte prima di
 * un'importazione hanno limiti separati, così le une non cancellano le altre.
 */
async function saveAutoBackup(reason) {
  const list = await listAutoBackups();
  const snapshot = await buildBackup();
  list.unshift({ at: now(), reason, backup: snapshot });
  const keepPeriodic = Math.max(1, get('backup.periodicKept'));
  const keepOther = Math.max(1, get('backup.autoBackupsKept'));
  let p = 0;
  let o = 0;
  const kept = list.filter((item) => (item.reason === 'periodic' ? ++p <= keepPeriodic : ++o <= keepOther));
  await db.setMeta('autoBackups', kept);
}

/**
 * Copia interna periodica, senza tocchi: se l'ultima ha più di N giorni ne salva una nuova.
 * Restituisce true se l'ha fatta.
 */
export async function periodicSnapshotIfDue() {
  const days = get('backup.periodicDays');
  if (!(days > 0)) return false;
  const sessions = await db.getAll(S.sessions);
  if (!sessions.length) return false;
  const last = await db.getMeta('lastPeriodicBackup', 0);
  if (now() - last < days * 86400000) return false;
  await saveAutoBackup('periodic');
  await db.setMeta('lastPeriodicBackup', now());
  return true;
}

/** Va proposto il backup su iCloud alla fine dell'allenamento? Restituisce i giorni trascorsi o null. */
export async function backupPromptAfterWorkoutDue() {
  const days = get('backup.promptAfterWorkoutDays');
  if (!(days > 0)) return null;
  const last = await lastExport();
  if (!last) return { days: null, never: true };
  const passed = Math.floor((now() - last) / 86400000);
  return passed >= days ? { days: passed, never: false } : null;
}

/** Ripristina una copia automatica (sostituisce tutto, dopo aver salvato lo stato attuale). */
export async function restoreAutoBackup(index) {
  const list = await listAutoBackups();
  const item = list[index];
  if (!item) throw new Error(t('importErrFormat'));
  const res = validateBackup(JSON.stringify(item.backup));
  if (!res.ok) throw new Error(res.error);
  await saveAutoBackup('restore');
  await writeReplace(res.backup.data);
}

// ---- Importazione ----

async function writeReplace(data) {
  data.meta = (data.meta || []).filter((m) => m.key !== 'schemaVersion');
  data.meta.push({ key: 'schemaVersion', value: db.SCHEMA_VERSION });
  data.meta.push({ key: 'seeded', value: true });
  await db.replaceAll(data, { keepMeta: LOCAL_META });
}

/** Unione per id: in caso di conflitto vince il record modificato più di recente. */
function mergeStore(current, incoming) {
  const map = new Map(current.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  for (const rec of incoming) {
    const cur = map.get(rec.id);
    if (!cur) { map.set(rec.id, rec); added++; }
    else if ((rec.updatedAt || 0) > (cur.updatedAt || 0)) { map.set(rec.id, rec); updated++; }
  }
  return { list: [...map.values()], added, updated };
}

/**
 * Importa un backup già validato.
 * mode 'replace': sostituisce tutto (impostazioni comprese).
 * mode 'merge': unisce i dati; le impostazioni di questo telefono restano.
 */
export async function importBackup(backup, mode) {
  await saveAutoBackup(mode);
  const incoming = backup.data;
  if (mode === 'replace') {
    await writeReplace(incoming);
    return { mode };
  }
  const current = await db.dumpAll();
  const out = { ...current };
  const stats = { added: 0, updated: 0 };
  for (const name of RECORD_STORES) {
    const r = mergeStore(current[name], incoming[name] || []);
    out[name] = r.list;
    stats.added += r.added;
    stats.updated += r.updated;
  }
  // Allenamento in corso: si tiene quello di questo telefono, se c'è
  if (!current[S.active].length && incoming[S.active].length) out[S.active] = incoming[S.active];
  // Una sola scheda attiva: se ce n'è già una qui, quelle importate diventano non attive
  const activeHere = current[S.programs].find((p) => p.active && !p.archived);
  if (activeHere) out[S.programs].forEach((p) => { if (p.id !== activeHere.id) p.active = false; });
  await db.replaceAll(out);
  return { mode, ...stats };
}

// ---- Cronologia in CSV ----

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvNumber(n, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return '';
  const s = String(Math.round(n * 10 ** decimals) / 10 ** decimals);
  return s.replace('.', get('backup.csvDecimal'));
}

/** Una riga per serie, con intestazioni in italiano. Prepara il file (vedi prepareBackup). */
export async function prepareCsv() {
  const [sessions, exercises] = await Promise.all([db.getAll(S.sessions), db.getAll(S.exercises)]);
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const sep = get('backup.csvSeparator');
  const header = [
    t('date'), t('csvTime'), t('filterDay'), t('filterExercise'), t('muscleGroup'), t('set'), t('warmup'),
    `${t('weight')} (${weightUnit()})`, t('reps'), `${t('time')} (s)`, `${t('distance')} (${distanceUnit()})`,
    t('newRecord'), `${t('duration')} (min)`, t('notes'),
  ];
  const rows = [header];
  sessions.sort((a, b) => a.startedAt - b.startedAt);
  for (const s of sessions) {
    for (const e of s.entries) {
      const ex = exMap.get(e.exerciseId) || { name: '?', measure: 'weight_reps' };
      const m = measureOf(ex);
      e.sets.filter((x) => x.done).forEach((x, i) => {
        rows.push([
          formatDate(s.startedAt, 'yyyy-mm-dd'), formatDate(s.startedAt, 'HH:MM'), s.dayName || '', ex.name, ex.muscleGroup || '',
          i + 1, x.warmup ? t('yes') : '',
          m.fields.includes('weight') ? csvNumber(kgToDisplay(x.weightKg || 0)) : '',
          x.reps ?? '', x.durationSec ?? '',
          x.distanceM != null ? csvNumber(mToDisplay(x.distanceM)) : '',
          x.pr ? t('yes') : '', csvNumber((s.durationSec || 0) / 60, 0), s.notes || '',
        ]);
      });
    }
  }
  // Il BOM iniziale fa leggere correttamente gli accenti a Excel
  const text = '﻿' + rows.map((r) => r.map(csvCell).join(sep)).join('\r\n');
  return { blob: new Blob([text], { type: 'text/csv' }), filename: csvFileName() };
}

export function exportPreparedCsv(prepared) {
  return shareOrDownload(prepared.blob, prepared.filename);
}

// ---- Promemoria di backup ----

/** Giorni dall'ultimo backup, oppure null se il promemoria non va mostrato ora. */
export async function backupReminderDue(sessions) {
  if (!sessions.length) return null;
  const snooze = await db.getMeta('backupSnoozedUntil', 0);
  if (now() < snooze) return null;
  const last = await lastExport();
  // Mai esportato: si conta dal primo allenamento registrato
  const ref = last || Math.min(...sessions.map((s) => s.startedAt));
  const days = Math.floor((now() - ref) / 86400000);
  return days >= get('backup.reminderDays') ? { days, never: !last } : null;
}

export function snoozeBackupReminder() {
  return db.setMeta('backupSnoozedUntil', now() + get('backup.snoozeHours') * 3600000);
}
