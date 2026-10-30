// Componenti riutilizzabili: pannelli dal basso, conferme, avvisi, selettori numerici.

import { h, icon } from './dom.js';
import { t, get } from '../config.js';
import { roundToStep, roundTo, clamp } from '../util.js';
import { formatNumber } from '../format.js';

// ---- Pannello dal basso (bottom sheet) ----

let sheetStack = [];

export function openSheet({ title, content, actions = [], onClose, className = '' }) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const body = h('div', { class: 'sheet-body' }, content);
  const footer = actions.length ? h('div', { class: 'sheet-actions' }, actions) : null;
  const sheet = h('div', { class: 'sheet ' + className, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    title ? h('h2', { class: 'sheet-title' }, title) : null,
    body,
    footer,
  );
  const root = h('div', { class: 'sheet-root' }, backdrop, sheet);
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add('open'));

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    root.classList.remove('open');
    sheetStack = sheetStack.filter((s) => s !== api);
    setTimeout(() => root.remove(), 250);
    if (onClose) onClose(result);
  };
  backdrop.addEventListener('click', () => close(null));
  const api = { close, root, body };
  sheetStack.push(api);
  return api;
}

export function closeAllSheets() {
  [...sheetStack].forEach((s) => s.close(null));
}

export function button(label, { variant = 'secondary', iconName, onClick, className = '', ariaLabel, disabled } = {}) {
  return h('button', {
    type: 'button',
    class: `btn btn-${variant} ${className}`,
    onClick,
    'aria-label': ariaLabel || null,
    disabled: disabled || null,
  }, iconName ? icon(iconName) : null, label ? h('span', null, label) : null);
}

/** Conferma sì/no. Restituisce una Promise<boolean>. */
export function confirmDialog(message, { okLabel = t('confirm'), cancelLabel = t('cancel'), danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const s = openSheet({
      content: h('p', { class: 'sheet-message' }, message),
      actions: [
        button(cancelLabel, { onClick: () => s.close() }),
        button(okLabel, { variant: danger ? 'danger' : 'primary', onClick: () => { result = true; s.close(); } }),
      ],
      onClose: () => resolve(result),
    });
  });
}

/** Scelta da elenco. Restituisce il valore scelto o null. */
export function chooseDialog(title, options) {
  return new Promise((resolve) => {
    let result = null;
    const list = h('div', { class: 'choice-list' }, options.map((o) =>
      h('button', {
        type: 'button',
        class: 'choice' + (o.active ? ' active' : ''),
        onClick: () => { result = o.value; s.close(); },
      },
      o.icon ? icon(o.icon) : null,
      h('span', { class: 'choice-text' }, h('span', { class: 'choice-label' }, o.label), o.hint ? h('span', { class: 'choice-hint' }, o.hint) : null)),
    ));
    const s = openSheet({ title, content: list, actions: [button(t('close'), { onClick: () => s.close() })], onClose: () => resolve(result) });
  });
}

/** Inserimento di un numero con tastiera numerica. */
export function numberDialog(title, value, { decimals = 2 } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const input = h('input', {
      class: 'input input-big',
      type: 'text',
      inputmode: decimals > 0 ? 'decimal' : 'numeric',
      // Senza separatore delle migliaia, così si rilegge senza ambiguità
      value: value == null ? '' : String(roundTo(value, decimals)).replace('.', ','),
      'aria-label': title,
      autocomplete: 'off',
    });
    const commit = () => {
      // Accetta sia "62,5" sia "62.5"
      const v = parseFloat(String(input.value).trim().replace(',', '.'));
      if (Number.isFinite(v)) result = v;
      s.close();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    const s = openSheet({
      title,
      content: input,
      actions: [button(t('cancel'), { onClick: () => s.close() }), button(t('save'), { variant: 'primary', onClick: commit })],
      onClose: () => resolve(result),
    });
    setTimeout(() => { input.focus(); input.select(); }, 60);
  });
}

/** Inserimento di un testo. */
export function textDialog(title, value = '', { multiline = false, placeholder = '' } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const input = multiline
      ? h('textarea', { class: 'input', rows: 4, placeholder, 'aria-label': title })
      : h('input', { class: 'input', type: 'text', placeholder, 'aria-label': title, autocomplete: 'off' });
    input.value = value;
    const commit = () => { result = input.value.trim(); s.close(); };
    if (!multiline) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    const s = openSheet({
      title,
      content: input,
      actions: [button(t('cancel'), { onClick: () => s.close() }), button(t('save'), { variant: 'primary', onClick: commit })],
      onClose: () => resolve(result),
    });
    setTimeout(() => input.focus(), 60);
  });
}

// ---- Avvisi brevi (toast) ----

export function toast(message, { type = 'info', actionLabel, onAction, duration = 3200 } = {}) {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const el = h('div', { class: `toast toast-${type}` }, h('span', null, message));
  if (actionLabel) {
    el.append(h('button', { type: 'button', class: 'toast-action', onClick: () => { onAction && onAction(); remove(); } }, actionLabel));
  }
  host.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const remove = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  // duration 0 = resta finché non si tocca l'azione o l'avviso stesso
  if (duration > 0) setTimeout(remove, duration);
  else el.addEventListener('click', (ev) => { if (ev.target === el || ev.target.tagName === 'SPAN') remove(); });
}

/** Mostra un errore di dati in modo comprensibile. */
export function reportError(err) {
  console.error(err);
  let msg;
  if (err && err.code === 'quota') msg = t('errStorageFull');
  else if (err && err.code === 'unavailable') msg = t('errNoIndexedDB');
  else msg = t('errStorage', { msg: (err && err.message) || String(err) });
  toast(msg, { type: 'danger', duration: 6000 });
}

/** Esegue un'azione asincrona mostrando l'eventuale errore. */
export async function safe(fn) {
  try { return await fn(); } catch (err) { reportError(err); return undefined; }
}

// ---- Selettore numerico grande con + e − ----

/**
 * @param {object} o
 *   label, value, step, min, max, decimals, unit, format(v), onChange(v), editTitle
 */
export function stepper(o) {
  let value = o.value;
  const min = o.min ?? 0;
  const max = o.max ?? 99999;
  const fmt = o.format || ((v) => formatNumber(v, o.decimals ?? 2));
  const valueEl = h('span', { class: 'stepper-value' });
  const unitEl = o.unit ? h('span', { class: 'stepper-unit' }, o.unit) : null;
  const display = h('button', {
    type: 'button',
    class: 'stepper-display',
    'aria-label': `${o.label}: ${t('editByHand')}`,
    onClick: async () => {
      const v = await numberDialog(o.editTitle || o.label, value, { decimals: o.decimals ?? 2 });
      if (v != null) set(v);
    },
  }, valueEl, unitEl);

  const set = (v) => {
    value = clamp(roundToStep(v, o.fineStep || 0.0001), min, max);
    render();
    if (o.onChange) o.onChange(value);
  };
  const render = () => {
    valueEl.textContent = fmt(value);
    minus.disabled = value <= min;
  };

  const mk = (dir, name) => {
    const b = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': `${dir > 0 ? t('increase') : t('decrease')} ${o.label}` }, icon(name));
    autoRepeat(b, () => set(roundToStep(value + dir * o.step, o.step)));
    return b;
  };
  const minus = mk(-1, 'minus');
  const plus = mk(1, 'plus');

  const el = h('div', { class: 'stepper' },
    h('div', { class: 'stepper-label' }, o.label),
    h('div', { class: 'stepper-row' }, minus, display, plus),
  );
  render();
  return {
    el,
    get value() { return value; },
    setValue(v) { value = v; render(); },
  };
}

/** Tasto che ripete l'azione se tenuto premuto. */
function autoRepeat(btn, action) {
  let timer = null;
  let repeating = false;
  const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    repeating = false;
    stop();
    timer = setTimeout(() => {
      repeating = true;
      action();
      timer = setInterval(action, get('workout.repeatIntervalMs'));
    }, get('workout.repeatDelayMs'));
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('click', () => {
    if (repeating) { repeating = false; return; }
    action();
  });
}

/** Interruttore sì/no accessibile. */
export function toggle(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', class: 'toggle-input', 'aria-label': label });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'toggle' }, input, h('span', { class: 'toggle-track' }, h('span', { class: 'toggle-thumb' })));
}

/** Gruppo di opzioni a pulsanti. */
export function segmented(options, value, onChange, label) {
  const wrap = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });
  const render = (v) => {
    wrap.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.value === String(v);
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  };
  options.forEach((o) => {
    wrap.append(h('button', {
      type: 'button', role: 'radio', dataset: { value: String(o.value) },
      onClick: () => { render(o.value); onChange(o.value); },
    }, o.label));
  });
  render(value);
  return wrap;
}
