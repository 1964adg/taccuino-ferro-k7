// Configurazione effettiva = preset (config-default.js) + valori dell'utente.
// Un valore utente vuoto o di tipo sbagliato viene ignorato: vale il preset.

import { DEFAULTS } from './config-default.js';
import * as db from './db.js';
import { clone, getPath, setPath, deletePath, isEmpty, isPlainObject } from './util.js';

let user = {};
const listeners = new Set();

export async function initConfig() {
  const rec = await db.get(db.STORES.settings, 'user');
  user = (rec && isPlainObject(rec.values)) ? rec.values : {};
  // Prima si legge il tema di sistema, poi si applica (altrimenti "automatico" parte sempre chiaro)
  watchSystemTheme();
  applyTheme();
}

/** Controlla che il valore utente sia compatibile col preset. */
function isValidFor(def, val) {
  if (isEmpty(val)) return false;
  if (def === undefined) return true;
  if (typeof def === 'number') return typeof val === 'number' && Number.isFinite(val);
  if (typeof def === 'boolean') return typeof val === 'boolean';
  if (typeof def === 'string') return typeof val === 'string';
  if (Array.isArray(def)) return Array.isArray(val);
  if (isPlainObject(def)) return isPlainObject(val);
  return true;
}

function merge(def, val) {
  if (isPlainObject(def)) {
    const out = {};
    const src = isPlainObject(val) ? val : {};
    for (const k of new Set([...Object.keys(def), ...Object.keys(src)])) {
      out[k] = merge(def[k], src[k]);
    }
    return out;
  }
  return isValidFor(def, val) ? val : clone(def);
}

/** Valore effettivo di una variabile, es. get('timer.defaultRestSec'). */
export function get(path) {
  return merge(getPath(DEFAULTS, path), getPath(user, path));
}

export function getDefault(path) {
  return clone(getPath(DEFAULTS, path));
}

export function isOverridden(path) {
  return isValidFor(getPath(DEFAULTS, path), getPath(user, path));
}

async function persist() {
  await db.put(db.STORES.settings, { id: 'user', values: user });
  applyTheme();
  listeners.forEach((fn) => fn());
}

export async function set(path, value) {
  setPath(user, path, value);
  await persist();
}

export async function reset(path) {
  deletePath(user, path);
  await persist();
}

export async function resetAll() {
  user = {};
  await persist();
}

/** Valori utente grezzi (per backup). */
export function getUserValues() {
  return clone(user);
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Testo dell'interfaccia, con sostituzione dei segnaposto {nome}. */
export function t(key, vars) {
  let s = get('labels.' + key);
  if (typeof s !== 'string') s = key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}

// ---- Tema e variabili CSS ----

let mql = null;

function watchSystemTheme() {
  if (!window.matchMedia) return;
  mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => { if (get('theme.mode') === 'auto') applyTheme(); };
  if (mql.addEventListener) mql.addEventListener('change', handler);
  else if (mql.addListener) mql.addListener(handler);
}

export function effectiveThemeMode() {
  const mode = get('theme.mode');
  if (mode === 'light' || mode === 'dark') return mode;
  return (mql && mql.matches) ? 'dark' : 'light';
}

export function applyTheme() {
  const theme = get('theme');
  const mode = effectiveThemeMode();
  const pal = theme[mode];
  const root = document.documentElement;
  const vars = {
    '--c-primary': theme.primary,
    '--c-secondary': theme.secondary,
    '--c-success': theme.success,
    '--c-warning': theme.warning,
    '--c-danger': theme.danger,
    '--c-on-accent': theme.onAccent,
    '--c-splash-from': theme.splashFrom,
    '--c-splash-to': theme.splashTo,
    '--c-bg': pal.bg,
    '--c-surface': pal.surface,
    '--c-surface-2': pal.surface2,
    '--c-text': pal.text,
    '--c-muted': pal.muted,
    '--c-border': pal.border,
    '--radius': theme.radius + 'px',
    '--space': theme.spacing + 'px',
    '--font-scale': String(theme.fontScale),
    '--tap-min': theme.tapMin + 'px',
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  const name = get('app.name');
  document.title = name;
  const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appTitle) appTitle.setAttribute('content', name);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', pal.bg);
}
