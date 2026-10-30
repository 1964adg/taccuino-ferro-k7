// Funzioni di utilità generiche, senza dipendenze.

export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  // Ripiego per browser vecchi
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export const now = () => Date.now();

export function clone(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Un valore "vuoto" fa scattare il preset. */
export function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

export function getPath(obj, path) {
  if (!path) return obj;
  let cur = obj;
  for (const k of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isPlainObject(cur[keys[i]])) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

export function deletePath(obj, path) {
  const keys = path.split('.');
  const stack = [];
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isPlainObject(cur[keys[i]])) return;
    stack.push([cur, keys[i]]);
    cur = cur[keys[i]];
  }
  delete cur[keys[keys.length - 1]];
  // Rimuove gli oggetti rimasti vuoti
  for (let i = stack.length - 1; i >= 0; i--) {
    const [parent, key] = stack[i];
    if (Object.keys(parent[key]).length === 0) delete parent[key];
    else break;
  }
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Arrotonda al passo evitando errori di virgola mobile (es. 0,1 + 0,2). */
export function roundToStep(value, step) {
  if (!step || step <= 0) return value;
  const decimals = Math.min(6, (String(step).split('.')[1] || '').length + 1);
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

export function roundTo(value, decimals) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sameDay(a, b) {
  return startOfDay(a) === startOfDay(b);
}
