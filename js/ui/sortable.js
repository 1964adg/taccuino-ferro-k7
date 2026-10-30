// Riordino col trascinamento, fatto a mano con i pointer event
// (il drag and drop nativo dell'HTML non funziona col tocco su iOS).
// Si trascina tenendo la maniglia; le frecce su e giù restano l'alternativa.

/**
 * @param {HTMLElement} list  contenitore degli elementi
 * @param {object} o  itemSelector, handleSelector, onReorder(from, to)
 */
export function makeSortable(list, { handleSelector = '.drag-handle', onReorder }) {
  let drag = null;

  list.addEventListener('pointerdown', (ev) => {
    const handle = ev.target.closest(handleSelector);
    if (!handle || !list.contains(handle)) return;
    // Gli elementi riordinabili hanno l'attributo data-sort-item
    const item = handle.closest('[data-sort-item]');
    const items = [...list.querySelectorAll(':scope > [data-sort-item]')];
    const from = items.indexOf(item);
    if (from < 0) return;
    ev.preventDefault();
    handle.setPointerCapture(ev.pointerId);
    const rects = items.map((el) => el.getBoundingClientRect());
    drag = { handle, item, items, rects, from, to: from, startY: ev.clientY, pointerId: ev.pointerId };
    item.classList.add('dragging');
    list.classList.add('sorting');
  });

  list.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const dy = ev.clientY - drag.startY;
    drag.item.style.transform = `translateY(${dy}px)`;
    // Nuova posizione: confronto col centro degli altri elementi
    const center = drag.rects[drag.from].top + drag.rects[drag.from].height / 2 + dy;
    let to = drag.from;
    drag.rects.forEach((r, i) => {
      const mid = r.top + r.height / 2;
      if (i < drag.from && center < mid) to = Math.min(to, i);
      if (i > drag.from && center > mid) to = Math.max(to, i);
    });
    drag.to = to;
    const h = drag.rects[drag.from].height + gap(drag.rects);
    drag.items.forEach((el, i) => {
      if (el === drag.item) return;
      let shift = 0;
      if (drag.from < to && i > drag.from && i <= to) shift = -h;
      if (drag.from > to && i < drag.from && i >= to) shift = h;
      el.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  });

  const end = (ev) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const { from, to, items, item } = drag;
    items.forEach((el) => { el.style.transform = ''; });
    item.classList.remove('dragging');
    list.classList.remove('sorting');
    drag = null;
    if (from !== to) onReorder(from, to);
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
}

function gap(rects) {
  if (rects.length < 2) return 0;
  return Math.max(0, rects[1].top - rects[0].bottom);
}
