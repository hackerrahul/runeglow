import * as vue from 'vue';
import type { InjectionKey } from 'vue';
import type { LiquidGroup } from 'runeglow/liquid-gooey';

/* The group and its pieces share one object from the core (the filtered
   layer the pieces draw in, the measurement engine, the melt registry).
   Vue's part is only how a piece finds it: provide and inject. */
export const LIQUID: InjectionKey<LiquidGroup> = Symbol('runeglow.liquid-gooey');

/* A name for the group's filter that a server and the browser agree on.
   Vue has one to give from 3.5; before that a counter has to do, which is
   only the same on both sides where the page renders in the same order. */
let made = 0;
export function pageId(): string {
  const useId = (vue as { useId?: () => string }).useId;
  return useId ? useId() : `v${++made}`;
}

/**
 * A prop's value as plain data, read all the way down: the effect that
 * calls this then runs again when any part of a reactive record changes,
 * and the core is handed nothing that is a proxy.
 */
export function plain<T>(value: T, depth = 4): T {
  if (depth <= 0 || !value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => plain(v, depth - 1)) as T;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const out: Record<string, unknown> = {};
  for (const key in value) out[key] = plain((value as Record<string, unknown>)[key], depth - 1);
  return out as T;
}
