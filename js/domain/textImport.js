// Importazione di una scheda da testo semplice.
//
// Formato (una riga per esercizio, righe con # per i giorni):
//   Scheda: Il mio programma
//   # Giorno A [lun, gio]
//   Panca piana 4x8-10 60kg 90s 1 risc
//   Trazioni 3x6 +5kg 2:00
//   Plank 3x45s
//   Corsa 1x2km
//   Crunch 3x20 cl        (cl = corpo libero, solo ripetizioni)
//   Squat 5x5 100kg // nota libera
//
// Tutto ciò che non viene riconosciuto in una riga finisce nel nome dell'esercizio:
// per questo i valori vanno scritti dopo il nome.

import { get, t } from '../config.js';
import * as repo from './repo.js';
import { newProgram, newDay, newItem, newExercise } from './model.js';

const KG_PER_LB = 0.45359237;
const num = (s) => parseFloat(String(s).replace(',', '.'));

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "lun, gio" → [1, 4], usando i nomi dei giorni della configurazione. */
function parseWeekdays(text) {
  const full = get('dates.weekdayNames').map(strip);
  const short = get('dates.weekdayShort').map(strip);
  const out = new Set();
  for (const raw of text.split(/[\s,;/]+/)) {
    const w = strip(raw);
    if (!w) continue;
    let idx = short.indexOf(w);
    if (idx < 0) idx = full.findIndex((f) => f === w || (w.length >= 3 && f.startsWith(w)));
    if (idx >= 0) out.add(idx);
  }
  return [...out].sort();
}

// Ogni regola: espressione, funzione che applica il valore. L'ordine conta.
const RULES = [
  // 3x45s, 3x1:30 → serie a tempo
  { re: /(\d+)\s*[x×*]\s*(\d+):(\d{2})\b/i, apply: (m, o) => { o.sets = +m[1]; o.durationSec = +m[2] * 60 + +m[3]; o.kind = 'time'; } },
  { re: /(\d+)\s*[x×*]\s*(\d+)\s*(?:s|sec|")(?![a-z])/i, apply: (m, o) => { o.sets = +m[1]; o.durationSec = +m[2]; o.kind = 'time'; } },
  // 1x2km, 3x400m → distanza
  { re: /(\d+)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(km|mi|m)\b/i, apply: (m, o) => {
    o.sets = +m[1];
    const v = num(m[2]);
    const u = m[3].toLowerCase();
    o.distanceM = u === 'km' ? v * 1000 : u === 'mi' ? v * 1609.344 : v;
    o.kind = 'distance';
  } },
  // 4x8, 4x8-10 → serie e ripetizioni
  { re: /(\d+)\s*[x×*]\s*(\d+)(?:\s*[-–/]\s*(\d+))?/i, apply: (m, o) => {
    o.sets = +m[1];
    o.repsMin = +m[2];
    o.repsMax = m[3] ? +m[3] : +m[2];
  } },
  // 60kg, +5kg, 135lb
  { re: /(\+)?\s*(\d+(?:[.,]\d+)?)\s*(kg|lb)\b/i, apply: (m, o) => {
    const v = num(m[2]);
    o.weightKg = m[3].toLowerCase() === 'lb' ? v * KG_PER_LB : v;
    if (m[1]) o.plus = true;
  } },
  // 1 risc → serie di riscaldamento
  { re: /(\d+)\s*(?:risc(?:aldamento)?|warm-?up|wu)\b/i, apply: (m, o) => { o.warmupSets = +m[1]; } },
  // recupero: 90s, rec 90, 2:00, 2min, 2'
  { re: /(?:rec(?:upero)?\.?\s*)?(\d+):(\d{2})\b/i, apply: (m, o) => { o.restSec = +m[1] * 60 + +m[2]; } },
  { re: /(?:rec(?:upero)?\.?\s*)?(\d+)\s*(?:min|')(?![a-z])/i, apply: (m, o) => { o.restSec = +m[1] * 60; } },
  { re: /(?:rec(?:upero)?\.?\s*)?(\d+)\s*(?:s|sec|")(?![a-z])/i, apply: (m, o) => { o.restSec = +m[1]; } },
  { re: /\brec(?:upero)?\.?\s*(\d+)\b/i, apply: (m, o) => { o.restSec = +m[1]; } },
  // corpo libero
  { re: /\b(?:cl|corpo\s+libero|bw)\b/i, apply: (m, o) => { o.bodyweightOnly = true; } },
];

function parseExerciseLine(line) {
  let text = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');
  const o = {};
  const noteIdx = text.indexOf('//');
  if (noteIdx >= 0) {
    o.notes = text.slice(noteIdx + 2).trim();
    text = text.slice(0, noteIdx);
  }
  // Il nome finisce dove inizia il primo valore riconosciuto
  let first = text.length;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m && m.index < first) first = m.index;
  }
  const name = text.slice(0, first).replace(/[\s:,;–-]+$/, '').trim();
  let rest = text.slice(first);
  for (const r of RULES) {
    const m = rest.match(r.re);
    if (m) {
      r.apply(m, o);
      rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
    }
  }
  o.unparsed = rest.replace(/[\s,;·]+/g, ' ').trim();
  return { name, ...o };
}

function measureFor(o) {
  if (o.kind === 'time') return 'time';
  if (o.kind === 'distance') return 'distance_time';
  if (o.plus) return 'bodyweight_plus';
  if (o.bodyweightOnly) return 'reps';
  return 'weight_reps';
}

/** Analizza il testo. Non modifica nulla: serve per l'anteprima. */
export function parseProgramText(text) {
  const result = { name: '', days: [], warnings: [] };
  let day = null;
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    const progMatch = line.match(/^(?:scheda|programma)\s*:\s*(.+)$/i);
    if (progMatch) { result.name = progMatch[1].trim(); return; }
    const dayMatch = line.match(/^#+\s*(.*)$/);
    if (dayMatch) {
      let name = dayMatch[1].trim();
      let weekdays = [];
      const wd = name.match(/[[(]([^\])]*)[\])]\s*$/);
      if (wd) {
        weekdays = parseWeekdays(wd[1]);
        name = name.slice(0, wd.index).trim();
      }
      day = { name: name || t('importDefaultDay', { n: result.days.length + 1 }), weekdays, items: [] };
      result.days.push(day);
      return;
    }
    const p = parseExerciseLine(line);
    if (!p.name) {
      result.warnings.push({ line: i + 1, text: line, reason: t('importNoName') });
      return;
    }
    if (!day) {
      day = { name: t('importDefaultDay', { n: 1 }), weekdays: [], items: [] };
      result.days.push(day);
    }
    const existing = repo.findExerciseByName(p.name);
    const item = {
      line: i + 1,
      exerciseName: existing ? existing.name : p.name,
      exerciseId: existing ? existing.id : null,
      measure: existing ? existing.measure : measureFor(p),
      sets: p.sets ?? get('workout.defaultSets'),
      repsMin: p.repsMin ?? get('workout.defaultRepsMin'),
      repsMax: p.repsMax ?? p.repsMin ?? get('workout.defaultRepsMax'),
      weightKg: p.weightKg ?? null,
      durationSec: p.durationSec ?? null,
      distanceM: p.distanceM ?? null,
      restSec: p.restSec ?? null,
      warmupSets: Math.min(p.warmupSets ?? 0, p.sets ?? get('workout.defaultSets')),
      notes: p.notes || '',
    };
    day.items.push(item);
    if (p.unparsed) result.warnings.push({ line: i + 1, text: line, reason: t('importIgnored', { text: p.unparsed }) });
  });
  return result;
}

/** Crea la scheda (e gli esercizi nuovi) dal risultato dell'analisi. */
export async function createProgramFromParsed(parsed, { activate = false } = {}) {
  const program = newProgram({ name: parsed.name || t('importDefaultName'), active: false });
  const created = new Map(); // nome normalizzato → esercizio creato ora
  for (const [i, d] of parsed.days.entries()) {
    const day = newDay({ name: d.name, weekdays: d.weekdays, order: i });
    for (const it of d.items) {
      let exId = it.exerciseId;
      if (!exId) {
        const key = repo.normalizeName(it.exerciseName);
        let ex = created.get(key);
        if (!ex) {
          ex = newExercise({ name: it.exerciseName, measure: it.measure });
          await repo.saveExercise(ex);
          created.set(key, ex);
        }
        exId = ex.id;
      }
      day.items.push(newItem(exId, it));
    }
    program.days.push(day);
  }
  await repo.saveProgram(program);
  if (activate) await repo.setActiveProgram(program.id);
  return { program, newExercises: created.size };
}
