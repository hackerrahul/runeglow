// Theme resolution: explicit prop → ancestor data-theme/.dark|.light
// class (watched live) → prefers-color-scheme (subscribed live).
// SSR-safe: both watchers are only ever started from an effect; the
// pre-mount fallback is dark.

import type { OrbTheme } from './types';

function ancestorTheme(el: Element | null): boolean | null {
  let node: Element | null = el;
  while (node) {
    const attr = node.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    if (node.classList.contains('dark')) return true;
    if (node.classList.contains('light')) return false;
    /* out of a shadow root and on into the page that hosts it, so an orb
       inside a custom element still hears its page's theme */
    const root = node.parentElement ? null : node.getRootNode();
    node = node.parentElement ?? (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root.host : null);
  }
  return null;
}

function systemDark(): boolean {
  return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the effective dark/light substrate for a mounted element and keep
 * it current. Calls `set` at once and again on every change; returns the
 * function that stops watching.
 */
export function watchResolvedDark(
  theme: OrbTheme,
  host: Element | null,
  set: (dark: boolean) => void
): () => void {
  if (theme === 'dark') {
    set(true);
    return () => {};
  }
  if (theme === 'light') {
    set(false);
    return () => {};
  }

  const resolve = () => set(ancestorTheme(host) ?? systemDark());
  resolve();

  // live OS/browser theme switches
  const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
  mq?.addEventListener('change', resolve);

  // live app-level toggles: watch class/data-theme flips on ancestors
  let mo: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined' && host) {
    mo = new MutationObserver(resolve);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
      subtree: true
    });
  }

  return () => {
    mq?.removeEventListener('change', resolve);
    mo?.disconnect();
  };
}

/** Live `prefers-reduced-motion` — reduced users get a static frame. */
export function watchReducedMotion(set: (reduced: boolean) => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  set(mq.matches);
  const on = (e: MediaQueryListEvent) => set(e.matches);
  mq.addEventListener('change', on);
  return () => mq.removeEventListener('change', on);
}
