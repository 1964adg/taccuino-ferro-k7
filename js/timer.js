// Timer di recupero basato sull'ora di fine, non sul conteggio dei tick:
// resta corretto anche se lo schermo si spegne o l'app va in background.

const TICK_MS = 250;

export class RestTimer {
  /**
   * @param {object} cb  onTick(remainingSec, totalSec), onWarn(), onEnd(lateSec), onStop()
   * @param {() => number} warnBeforeSec  letto ogni volta, così segue le impostazioni
   */
  constructor(cb, warnBeforeSec) {
    this.cb = cb;
    this.warnBeforeSec = warnBeforeSec;
    this.state = null; // { startedAt, endAt, warned }
    this.interval = null;
    this.onVisible = () => { if (document.visibilityState === 'visible') this.tick(); };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  get running() { return !!this.state; }

  start(sec) {
    const t = Date.now();
    this.state = { startedAt: t, endAt: t + sec * 1000, warned: false };
    this.loop();
    this.tick();
    return this.snapshot();
  }

  /** Riprende uno stato salvato (es. dopo la riapertura dell'app). */
  restore(saved) {
    if (!saved || !saved.endAt) return;
    this.state = { startedAt: saved.startedAt, endAt: saved.endAt, warned: Date.now() > saved.endAt - this.warnBeforeSec() * 1000 };
    this.loop();
    this.tick();
  }

  adjust(deltaSec) {
    if (!this.state) return null;
    this.state.endAt = Math.max(Date.now(), this.state.endAt + deltaSec * 1000);
    if (this.remaining() > this.warnBeforeSec()) this.state.warned = false;
    this.tick();
    return this.snapshot();
  }

  stop(silent = false) {
    clearInterval(this.interval);
    this.interval = null;
    const had = !!this.state;
    this.state = null;
    if (had && !silent && this.cb.onStop) this.cb.onStop();
  }

  remaining() {
    return this.state ? Math.max(0, (this.state.endAt - Date.now()) / 1000) : 0;
  }

  total() {
    return this.state ? (this.state.endAt - this.state.startedAt) / 1000 : 0;
  }

  snapshot() {
    return this.state ? { startedAt: this.state.startedAt, endAt: this.state.endAt } : null;
  }

  loop() {
    clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  tick() {
    if (!this.state) return;
    const rem = this.remaining();
    const warnAt = this.warnBeforeSec();
    if (!this.state.warned && warnAt > 0 && rem <= warnAt && rem > 0) {
      this.state.warned = true;
      if (this.cb.onWarn) this.cb.onWarn();
    }
    if (this.cb.onTick) this.cb.onTick(rem, this.total());
    if (rem <= 0) {
      // Ritardo con cui ci si accorge della fine (es. app tornata dal background)
      const late = Math.max(0, (Date.now() - this.state.endAt) / 1000);
      clearInterval(this.interval);
      this.interval = null;
      this.state = null;
      if (this.cb.onEnd) this.cb.onEnd(late);
    }
  }

  destroy() {
    this.stop(true);
    document.removeEventListener('visibilitychange', this.onVisible);
  }
}
