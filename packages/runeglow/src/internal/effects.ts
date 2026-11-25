/* The little that a component needs of a framework's reactivity, so the
   same component can live outside one. An effect is a function and the
   values it depends on; `flush` runs each effect whose values have changed
   since it last ran, cleaning the last run up first. A controller calls
   `flush` when it is given new options and `touch` when something an
   effect reads has changed on its own (an observer fired, a timer ran). */

type Cleanup = void | (() => void);

interface Effect {
  deps: () => readonly unknown[];
  run: () => Cleanup;
  last: readonly unknown[] | null;
  cleanup: (() => void) | null;
}

const same = (a: readonly unknown[], b: readonly unknown[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
};

export class Effects {
  private list: Effect[] = [];
  private queued = false;
  private dead = false;

  /** Register an effect. It first runs at the next `flush`, in the order added. */
  add(deps: () => readonly unknown[], run: () => Cleanup) {
    this.list.push({ deps, run, last: null, cleanup: null });
  }

  /** Run every effect whose dependencies changed, until none has. */
  flush() {
    /* an effect may change what another reads; a few passes settle it, and
       the limit stops two that keep changing each other */
    for (let pass = 0; pass < 12 && !this.dead; pass++) {
      let ran = false;
      for (const e of this.list) {
        const next = e.deps();
        if (e.last && same(e.last, next)) continue;
        if (e.cleanup) e.cleanup();
        e.cleanup = null;
        e.last = next;
        const cleanup = e.run();
        e.cleanup = typeof cleanup === 'function' ? cleanup : null;
        ran = true;
        if (this.dead) break;
      }
      if (!ran) break;
    }
  }

  /** Something changed outside `flush`: run the effects it touches, once, on a microtask. */
  touch() {
    if (this.queued || this.dead) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.dead) this.flush();
    });
  }

  /** Clean every effect up; nothing runs after this. */
  destroy() {
    this.dead = true;
    for (const e of this.list) {
      if (e.cleanup) e.cleanup();
      e.cleanup = null;
    }
  }
}
