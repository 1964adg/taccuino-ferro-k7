// Ossatura dell'interfaccia: navigazione a schede in basso e instradamento.

import { h, clear, icon } from './dom.js';
import { t, onChange } from '../config.js';
import { closeAllSheets, toast } from './components.js';
import * as home from './views/home.js';
import * as workout from './views/workout.js';
import * as programs from './views/programs.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const ROUTES = {
  home: { view: home, icon: 'home', label: 'tabHome' },
  workout: { view: workout, icon: 'dumbbell', label: 'tabWorkout' },
  programs: { view: programs, icon: 'list', label: 'tabPrograms' },
  progress: { view: progress, icon: 'chart', label: 'tabProgress' },
  settings: { view: settings, icon: 'settings', label: 'tabSettings' },
};

let main;
let tabbar;
let cleanup = null;
let currentRoute = null;

export function mountApp(root) {
  clear(root);
  main = h('main', { class: 'view', id: 'view' });
  tabbar = h('nav', { class: 'tabbar', 'aria-label': t('navMain') });
  root.append(main, tabbar);
  renderTabbar();
  window.addEventListener('hashchange', render);
  // Se cambiano le impostazioni (testi, tema...) si ridisegna la vista corrente
  onChange(() => { renderTabbar(); });
  render();
}

function renderTabbar() {
  clear(tabbar);
  for (const [key, r] of Object.entries(ROUTES)) {
    tabbar.append(h('a', {
      href: '#/' + key,
      class: 'tab' + (key === currentRoute ? ' active' : ''),
      'aria-current': key === currentRoute ? 'page' : null,
    }, icon(r.icon), h('span', { class: 'tab-label' }, t(r.label))));
  }
}

export function routeName() {
  const m = location.hash.match(/^#\/(\w+)/);
  return m && ROUTES[m[1]] ? m[1] : 'home';
}

/** Parti dell'indirizzo dopo la schermata, es. #/programs/p/123 → ['p', '123']. */
function routeParams() {
  return location.hash.replace(/^#\/?/, '').split('/').slice(1).map(decodeURIComponent);
}

/** Va a una schermata, anche interna (es. 'programs/p/123'). */
export function navigate(path) {
  if (location.hash === '#/' + path) render();
  else location.hash = '#/' + path;
}

/** Ridisegna la vista corrente. Con { keepScroll: true } resta alla stessa altezza. */
export function render(opts) {
  const keepScroll = !!(opts && opts.keepScroll === true);
  const scroll = main.scrollTop;
  if (!keepScroll) closeAllSheets();
  if (cleanup) { try { cleanup(); } catch { /* ignora */ } cleanup = null; }
  currentRoute = routeName();
  renderTabbar();
  clear(main);
  const r = ROUTES[currentRoute];
  document.body.dataset.route = currentRoute;
  // Leggera dissolvenza solo quando si cambia schermata, non a ogni aggiornamento
  main.classList.remove('enter');
  if (!keepScroll) { void main.offsetWidth; main.classList.add('enter'); }
  try {
    const res = r.view.render(main, { navigate, render, setFullscreen, params: routeParams() });
    main.scrollTop = keepScroll ? scroll : 0;
    if (typeof res === 'function') cleanup = res;
  } catch (err) {
    console.error(err);
    toast(t('errGeneric', { msg: err.message }), { type: 'danger' });
  }
}

/** La schermata di allenamento nasconde la barra in basso per avere spazio. */
function setFullscreen(on) {
  document.body.classList.toggle('fullscreen', !!on);
}
