/* The border beam outside any framework.

   A beam is drawn by CSS alone, on a wrapper element round the content: a
   generated stylesheet (styles.ts) whose rules, custom properties and
   keyframes are all named by an id, the wrapper's `data-beam="<id>"`, a few
   attributes that say whether it is on, and one empty layer inside it for
   the bloom.

   `borderBeamView` says all of that as plain data, so a server can render
   it. `attachBorderBeam` keeps a wrapper alive: it reads the content's
   corner radius, pauses the beam off screen, runs the fades and drives the
   pulse. Given an element and nothing else it also writes the view to the
   page; a framework adapter renders the view itself and is only told when
   the state behind it moves. `mountBorderBeam` makes the wrapper too. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
import { registerPulseInstance } from './pulseDriver';
import { colorPalettes, generateBeamCSS, getPulseDriverConfig, sizePresets, sizeThemePresets } from './styles';
import { borderBeamOptionKinds, type BorderBeamColorVariant, type BorderBeamOptions, type BorderBeamSize } from './types';

/* ── what the options come to ─────────────────────────────────────────── */

/**
 * What a beam has found out about itself and where it is in its fades. The
 * view is drawn from the options and this; `attachBorderBeam` keeps it.
 */
export interface BorderBeamState {
  /** The system's colour scheme, for `theme: 'auto'`. 'dark' until a browser has been asked. */
  systemTheme: 'dark' | 'light';
  /** The beam is on. It stays so while it fades out. */
  active: boolean;
  /** The beam is fading out. */
  fading: boolean;
  /** The wrapper is on screen or close to it. */
  visible: boolean;
  /** The corner radius read from the content, in px; null while none has been. */
  radius: number | null;
  /** How far the pulse-outside glow is scaled to fit the content, per axis. */
  glowX: number;
  glowY: number;
}

/** The state a beam starts in, on a server and in a browser alike. */
export function borderBeamState(options: BorderBeamOptions = {}): BorderBeamState {
  // The server has no media query to ask, so both sides start on 'dark' and
  // the client corrects itself once mounted. Starting from the real value on
  // the client would leave a server-rendered stylesheet that hydration keeps.
  return { systemTheme: 'dark', active: options.active ?? true, fading: false, visible: true, radius: null, glowX: 1, glowY: 1 };
}

interface Resolved {
  size: BorderBeamSize;
  theme: 'dark' | 'light';
  colorVariant: BorderBeamColorVariant;
  isPulse: boolean;
  borderRadius: number;
  duration: number;
  saturation: number;
  brightness: number;
  hueRange: number;
  glowSize: number;
  staticColors: boolean;
  css: string;
}

function resolve(o: BorderBeamOptions, state: BorderBeamState): Resolved {
  /* a name that is not one of ours (a typo in an attribute) falls back to the default */
  const size: BorderBeamSize = o.size && o.size in sizePresets ? o.size : 'md';
  const colorVariant: BorderBeamColorVariant = o.colorVariant && o.colorVariant in colorPalettes ? o.colorVariant : 'colorful';
  const theme = o.theme === 'auto' ? state.systemTheme : o.theme === 'light' ? 'light' : 'dark';
  const themeConfig = sizeThemePresets[size][theme];
  const isPulse = size === 'pulse-inner' || size === 'pulse-outside';
  const hueRange = o.hueRange ?? 30;
  return {
    size,
    theme,
    colorVariant,
    isPulse,
    borderRadius: o.borderRadius ?? state.radius ?? sizePresets[size].borderRadius,
    duration: o.duration ?? (size === 'line' ? 3.1 : isPulse ? 2.3 : 1.96),
    saturation: o.saturation ?? themeConfig.saturation,
    brightness: o.brightness ?? themeConfig.brightness ?? 1.3,
    hueRange: size === 'line' ? Math.min(hueRange, 13) : hueRange,
    glowSize: o.glowSize ?? 1,
    staticColors: colorVariant === 'mono' ? true : (o.staticColors ?? false),
    css: o.css ?? '',
  };
}

/* everything the stylesheet is made from, but the id */
const sheetKey = (r: Resolved) =>
  [r.size, r.theme, r.colorVariant, r.staticColors, r.borderRadius, r.duration, r.saturation, r.brightness, r.hueRange, r.glowSize, r.css].join('|');

/* A beam's stylesheet is some 20 kB of text, and a view is drawn again each
   time the beam goes on or off screen or fades, which changes none of it:
   the last few made are kept. */
const made = new Map<string, string>();
function sheetText(r: Resolved, id: string): string {
  const key = `${id}|${sheetKey(r)}`;
  let css = made.get(key);
  if (css === undefined) {
    const themeConfig = sizeThemePresets[r.size][r.theme];
    css = generateBeamCSS({
      id,
      borderRadius: r.borderRadius,
      borderWidth: sizePresets[r.size].borderWidth,
      duration: r.duration,
      strokeOpacity: themeConfig.strokeOpacity,
      innerOpacity: themeConfig.innerOpacity,
      bloomOpacity: themeConfig.bloomOpacity,
      innerShadow: themeConfig.innerShadow,
      size: r.size,
      colorVariant: r.colorVariant,
      staticColors: r.staticColors,
      brightness: r.brightness,
      saturation: r.saturation,
      hueRange: r.hueRange,
      theme: r.theme,
      hairlineOpacity: themeConfig.hairlineOpacity,
      glowSize: r.glowSize,
    });
    // The sheet is written as raw HTML by most adapters, so a consumer's
    // `css` cannot be allowed to close the element it sits in.
    css = (r.css ? `${css}\n${r.css.split('{id}').join(id)}` : css).replace(/<\/(style)/gi, '<\\/$1');
    if (made.size >= 48) made.delete(made.keys().next().value as string);
    made.set(key, css);
  }
  return css;
}

/** What a border beam's wrapper looks like. */
export interface BorderBeamView {
  /** The instance id: the value of `data-beam`, and what the rules and keyframes are named by. */
  id: string;
  /** The text of the beam's stylesheet, safe to write inside a `<style>` in HTML. */
  css: string;
  /** The wrapper's attributes. One that is not here must not be on the element. */
  attributes: { 'data-beam': string; 'data-active'?: ''; 'data-fading'?: ''; 'data-paused'?: '' };
  /** The wrapper's inline custom properties. */
  style: Style;
}

/**
 * The wrapper of a border beam for these options: its stylesheet, its
 * attributes and its inline variables. Inside the wrapper go the content
 * and then one empty `<div data-beam-bloom>`.
 *
 * `id` names the instance: letters, digits, `-` and `_`. Two beams may share
 * an id, and so one stylesheet, only if their options are the same. `state`
 * is what `attachBorderBeam` reports; leave it out for the first render.
 */
export function borderBeamView(options: BorderBeamOptions, id: string, state: BorderBeamState = borderBeamState(options)): BorderBeamView {
  const r = resolve(options, state);
  return { id, css: sheetText(r, id), ...wrapperOf(options, r, id, state) };
}

/* the wrapper's own part of the view, which changes far more often than its rules do */
function wrapperOf(options: BorderBeamOptions, r: Resolved, id: string, state: BorderBeamState): Pick<BorderBeamView, 'attributes' | 'style'> {
  const on = state.active && !state.fading;
  const attributes: BorderBeamView['attributes'] = { 'data-beam': id };
  if (on) attributes['data-active'] = '';
  if (state.fading) attributes['data-fading'] = '';
  if (on && !state.visible) attributes['data-paused'] = '';
  const style: Style = { '--beam-strength': String(Math.max(0, Math.min(1, options.strength ?? 1))) };
  if (r.size === 'pulse-outside') {
    style['--pulse-glow-sx'] = String(state.glowX);
    style['--pulse-glow-sy'] = String(state.glowY);
  }
  return { attributes, style };
}

/* ── the stylesheets of beams that the core renders itself ────────────── */

/* A framework adapter renders each beam's `<style>` beside its wrapper, so
   a server-rendered page carries its rules with it. Where the core does the
   rendering there is no server, and the rules go where they can be shared:
   one `<style>` per distinct look, in the `<head>` of the document (or in
   the shadow root the wrapper is in), used by every beam there whose
   options come to the same thing. Twenty cards with the same beam make one
   stylesheet.

   The rules, and the animations with them, are named by the sheet's id, so
   a beam that moves to another sheet starts its animations again and fades
   in from nothing. Changing the options must not do that where it can be
   helped. So a change is settled a moment later, for all of a sheet's
   beams at once: if none of them wants the old rules any more, the sheet
   is rewritten in place and they all keep its id — one beam whose options
   change, or twenty that change together. Only a beam that leaves others
   behind on the old rules moves to another sheet. */

type Root = Document | ShadowRoot;

/* a beam, as its sheet knows it */
interface SheetUser {
  /** The rules it wants now: everything they are made from. */
  key: string;
  /** Those rules, for a sheet's id. */
  css: (id: string) => string;
  /** It has been moved to another sheet. */
  moved: (sheet: Sheet) => void;
}

interface Sheet {
  id: string;
  key: string;
  root: Root;
  styles: HTMLStyleElement[];
  users: Set<SheetUser>;
  settling: boolean;
}

const registries = new WeakMap<Root, Map<string, Sheet>>();
let sheetCount = 0;

function joinSheet(root: Root, user: SheetUser): Sheet {
  let byKey = registries.get(root);
  if (!byKey) registries.set(root, (byKey = new Map()));
  const shared = byKey.get(user.key);
  if (shared) {
    shared.users.add(user);
    return shared;
  }
  const id = `rg${(++sheetCount).toString(36)}`;
  const doc = root.ownerDocument ?? (root as Document);
  const text = user.css(id);
  const style = (parent: Node) => {
    const el = doc.createElement('style');
    el.setAttribute('data-beam-sheet', id);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const head = doc.head ?? doc.documentElement;
  /* Browsers take `@property` registrations from the document only, and the
     beam's animated properties are registered that way: in a shadow root
     the rules go in the root, where they match, and again in the document,
     where they register. */
  const styles = root === doc ? [style(head)] : [style(root), style(head)];
  const sheet: Sheet = { id, key: user.key, root, styles, users: new Set([user]), settling: false };
  byKey.set(user.key, sheet);
  return sheet;
}

function dropSheet(sheet: Sheet) {
  for (const el of sheet.styles) el.remove();
  const byKey = registries.get(sheet.root);
  if (byKey?.get(sheet.key) === sheet) byKey.delete(sheet.key);
}

function leaveSheet(sheet: Sheet, user: SheetUser) {
  sheet.users.delete(user);
  if (!sheet.users.size) dropSheet(sheet);
}

/* one of the sheet's beams wants other rules: see above */
function settleSheet(sheet: Sheet) {
  if (sheet.settling) return;
  sheet.settling = true;
  queueMicrotask(() => {
    sheet.settling = false;
    const users = [...sheet.users];
    const first = users.find((u) => u.key !== sheet.key);
    if (!first) return;
    if (!users.some((u) => u.key === sheet.key)) {
      const byKey = registries.get(sheet.root);
      if (byKey?.get(sheet.key) === sheet) byKey.delete(sheet.key);
      sheet.key = first.key;
      if (byKey && !byKey.has(sheet.key)) byKey.set(sheet.key, sheet);
      const text = first.css(sheet.id);
      for (const el of sheet.styles) el.textContent = text;
    }
    for (const user of users) {
      if (user.key === sheet.key) continue;
      sheet.users.delete(user);
      user.moved(joinSheet(sheet.root, user));
    }
  });
}

/* ── the live beam ────────────────────────────────────────────────────── */

export interface BorderBeamHooks {
  /** The fade in has finished. */
  onActivate?: () => void;
  /** The fade out has finished. */
  onDeactivate?: () => void;
  /**
   * For a framework adapter, which renders the beam itself from
   * `borderBeamView(options, id, state)`: the wrapper's attributes and
   * variables, the bloom layer inside it and the `<style>`. `id` is the one
   * it rendered with; `onstate` is called with the state to render from,
   * once when the beam is attached and then whenever it changes. With this
   * given, `attachBorderBeam` writes none of those to the page.
   */
  rendered?: { id: string; onstate: (state: BorderBeamState) => void };
}

export interface BorderBeamHandle {
  /** Give the beam new options. Each call replaces the last set whole. */
  update(options: BorderBeamOptions): void;
  /** Stop everything and let go of the wrapper. */
  destroy(): void;
}

const BLOOM = 'data-beam-bloom';
/* the content the beam is drawn round: the wrapper's first element that is not the beam's own layer */
function contentOf(wrapper: Element): HTMLElement | null {
  for (let el = wrapper.firstElementChild; el; el = el.nextElementSibling) {
    if (!el.hasAttribute(BLOOM)) return el as HTMLElement;
  }
  return null;
}

/* a new set of options that says what the last one said is no work */
function sameOptions(a: BorderBeamOptions, b: BorderBeamOptions): boolean {
  for (const k in borderBeamOptionKinds) {
    if (!Object.is(a[k as keyof BorderBeamOptions], b[k as keyof BorderBeamOptions])) return false;
  }
  return true;
}

const STATE_ATTRIBUTES = ['data-active', 'data-fading', 'data-paused'] as const;

/**
 * Run a border beam on `element`, the wrapper round the content it is
 * drawn round:
 *
 *   <div id="beam"><div class="card">…</div></div>
 *
 *   const beam = attachBorderBeam(document.querySelector('#beam'), { size: 'md' });
 *   beam.update({ size: 'md', colorVariant: 'ocean' });
 *
 * The wrapper is given `data-beam`, its attributes and variables and its
 * bloom layer, and the beam's rules go in a `<style>` in the document's
 * head, shared by every beam with the same options. `destroy` takes all of
 * it away again. The wrapper is a block of the page's own: make it hug the
 * content (`width: fit-content`) where the content is narrower than its
 * container.
 */
export function attachBorderBeam(element: HTMLElement, options: BorderBeamOptions = {}, hooks: BorderBeamHooks = {}): BorderBeamHandle {
  let o = options;
  let state = borderBeamState(o);
  const fx = new Effects();
  const rendered = hooks.rendered;

  const set = (patch: Partial<BorderBeamState>) => {
    let changed = false;
    for (const k in patch) {
      if (state[k as keyof BorderBeamState] !== patch[k as keyof BorderBeamState]) changed = true;
    }
    if (!changed) return;
    state = { ...state, ...patch };
    fx.touch();
  };

  /* What is inside the wrapper: the content the beam is measured against,
     which may come after the beam does (a custom element is connected
     before its children are parsed), and the bloom layer. Where no adapter
     renders that layer it is made here, once, and put back should the page
     replace the wrapper's content wholesale. */
  let content = contentOf(element);
  fx.add(
    () => [],
    () => {
      let bloom: HTMLElement | null = null;
      /* a layer the page wrote itself is the page's to keep */
      let ours = false;
      const check = () => {
        if (!rendered && bloom?.parentNode !== element) {
          bloom ??= element.querySelector<HTMLElement>(`:scope > [${BLOOM}]`);
          if (!bloom) {
            bloom = element.ownerDocument.createElement('div');
            bloom.setAttribute(BLOOM, '');
            ours = true;
          }
          if (bloom.parentNode !== element) element.appendChild(bloom);
        }
        const next = contentOf(element);
        if (next === content) return;
        content = next;
        fx.touch();
      };
      check();
      const observer = new MutationObserver(check);
      observer.observe(element, { childList: true, subtree: false });
      return () => {
        observer.disconnect();
        if (ours) bloom?.remove();
      };
    },
  );

  fx.add(
    () => [],
    () => {
      if (typeof matchMedia !== 'function') return;
      const mediaQuery = matchMedia('(prefers-color-scheme: dark)');
      set({ systemTheme: mediaQuery.matches ? 'dark' : 'light' });
      const handler = (e: MediaQueryListEvent) => set({ systemTheme: e.matches ? 'dark' : 'light' });
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    },
  );

  // Auto-detect child border radius when no explicit value is provided
  fx.add(
    () => [o.borderRadius != null],
    () => {
      if (o.borderRadius != null) return;

      const detect = () => {
        const child = contentOf(element);
        if (!child) return;
        const computed = getComputedStyle(child);
        const raw = parseFloat(computed.borderTopLeftRadius);
        if (!isNaN(raw) && raw > 0) set({ radius: raw });
      };

      detect();

      // Re-detect if child layout changes (e.g. CSS loaded late)
      const observer = new MutationObserver(detect);
      observer.observe(element, { childList: true, subtree: false });
      return () => observer.disconnect();
    },
  );

  fx.add(
    () => [o.active ?? true, state.active, state.fading],
    () => {
      const active = o.active ?? true;
      if (active && !state.active && !state.fading) set({ active: true });
      else if (!active && state.active && !state.fading) set({ fading: true });
    },
  );

  // Pause the (paint-heavy) animations while the element is scrolled offscreen.
  // This stops per-frame painting entirely for hidden instances without changing
  // their logical active/fading state, so it never fires onActivate/onDeactivate.
  fx.add(
    () => [],
    () => {
      if (typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) set({ visible: entry.isIntersecting });
        },
        // Start animating slightly before the element scrolls into view.
        { rootMargin: '256px' },
      );

      observer.observe(element);
      return () => observer.disconnect();
    },
  );

  // Pulse Outside glow geometry is authored in fixed pixels for a reference
  // element (~350x140). Measure the actual wrapped element and scale the glow
  // per-axis so the halo grows/shrinks to fit any component it's applied to.
  fx.add(
    () => [o.size, content],
    () => {
      if (o.size !== 'pulse-outside') {
        set({ glowX: 1, glowY: 1 });
        return;
      }

      const REF_WIDTH = 350;
      const REF_HEIGHT = 140;
      // Allow the glow to both shrink (small buttons) and grow (large cards),
      // with generous bounds to avoid degenerate geometry at the extremes.
      const MIN_SCALE = 0.35;
      const MAX_SCALE = 4;
      const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

      const child = content;
      if (!child) return;

      const measure = () => {
        const rect = child.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        set({ glowX: +clamp(rect.width / REF_WIDTH).toFixed(3), glowY: +clamp(rect.height / REF_HEIGHT).toFixed(3) });
      };

      measure();
      if (typeof ResizeObserver === 'undefined') return;

      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(child);
      return () => resizeObserver.disconnect();
    },
  );

  /* The picture. An adapter draws it and only needs the state; otherwise it
     is written here: the sheet first, since the wrapper is named by it. */
  let sheet: Sheet | null = null;
  let style: Style | null = null;
  const user: SheetUser = {
    key: '',
    css: () => '',
    moved(next) {
      if (sheet) forget(sheet.id);
      sheet = next;
      element.setAttribute('data-beam', next.id);
      /* the pulse's variables are named by the id too */
      fx.touch();
    },
  };
  /* the pulse driver writes its variables, named by the id, on the wrapper:
     they go when the id does */
  const forget = (id: string) => {
    for (const name of [...element.style]) {
      if (name.startsWith('--') && name.endsWith(`-${id}`)) element.style.removeProperty(name);
    }
  };
  const beamId = () => (rendered ? rendered.id : (sheet?.id ?? ''));
  fx.add(
    () => [o, state],
    () => {
      if (rendered) {
        rendered.onstate(state);
        return;
      }
      const r = resolve(o, state);
      user.key = sheetKey(r);
      user.css = (id) => sheetText(r, id);
      if (!sheet) {
        const root = element.getRootNode();
        sheet = joinSheet(typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root : element.ownerDocument, user);
      } else if (user.key !== sheet.key) settleSheet(sheet);
      const view = wrapperOf(o, r, sheet.id, state);
      element.setAttribute('data-beam', sheet.id);
      for (const name of STATE_ATTRIBUTES) element.toggleAttribute(name, name in view.attributes);
      applyStyle(element, view.style, style);
      style = view.style;
    },
  );

  // Drive the Pulse breathing from the shared, fps-capped rAF loop while the
  // instance is on, onscreen, and the user hasn't requested reduced motion.
  const driverKey = () => {
    const r = resolve(o, state);
    return r.isPulse ? [r.size, r.theme, r.duration, r.hueRange, r.staticColors, beamId()].join('|') : '';
  };
  fx.add(
    () => [driverKey(), state.active || state.fading, state.visible],
    () => {
      const r = resolve(o, state);
      // Runtime config for the JS breathing driver (null for non-pulse sizes).
      const driverConfig = getPulseDriverConfig(r.size, r.theme, r.duration, r.hueRange, r.staticColors, beamId());
      if (!driverConfig) return;
      if (!(state.active || state.fading) || !state.visible) return;

      if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      return registerPulseInstance(element, driverConfig);
    },
  );

  const onAnimationEnd = (e: AnimationEvent) => {
    const animationName = e.animationName;

    if (animationName.includes('fade-out')) {
      set({ active: false, fading: false });
      hooks.onDeactivate?.();
    } else if (animationName.includes('fade-in')) {
      hooks.onActivate?.();
    }
  };
  element.addEventListener('animationend', onAnimationEnd);

  fx.flush();

  return {
    update(next) {
      if (sameOptions(o, next)) return;
      o = next;
      fx.flush();
    },
    destroy() {
      element.removeEventListener('animationend', onAnimationEnd);
      fx.destroy();
      if (rendered) return;
      element.removeAttribute('data-beam');
      for (const name of STATE_ATTRIBUTES) element.removeAttribute(name);
      if (style) for (const key in style) element.style.removeProperty(key);
      if (sheet) {
        forget(sheet.id);
        leaveSheet(sheet, user);
      }
      sheet = null;
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },
  };
}

/** What `mountBorderBeam` takes on top of the beam's own options. */
export interface BorderBeamMountOptions extends BorderBeamOptions {
  /** A class for the wrapper. */
  class?: string;
  /** What the beam is drawn round: moved into the wrapper when it is made. More can be appended to `element` later. */
  content?: Node | null;
  /** The fade in has finished. */
  onActivate?: () => void;
  /** The fade out has finished. */
  onDeactivate?: () => void;
}

export interface MountedBorderBeam {
  /** The wrapper: the content goes inside it. */
  element: HTMLDivElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: BorderBeamMountOptions): void;
  /** Stop the beam and take its wrapper, with what is in it, out of the page. */
  destroy(): void;
}

/**
 * Put a border beam inside `parent`, with no framework: the wrapper is made
 * here, round `content`, kept in step with the options, and removed by
 * `destroy`. To run a beam on a wrapper the page already has, use
 * `attachBorderBeam`.
 *
 *   const beam = mountBorderBeam(document.querySelector('#slot'), { content: card, size: 'md' });
 *   beam.update({ active: false });
 */
export function mountBorderBeam(parent: Element | ShadowRoot, options: BorderBeamMountOptions = {}): MountedBorderBeam {
  const doc = parent.ownerDocument ?? document;
  const element = doc.createElement('div');
  let o = { ...options };
  if (o.class) element.className = o.class;
  if (o.content) element.appendChild(o.content);
  /* in the page before the beam starts: its sheet goes in the root it finds itself in */
  parent.appendChild(element);
  const handle = attachBorderBeam(element, o, {
    onActivate: () => o.onActivate?.(),
    onDeactivate: () => o.onDeactivate?.(),
  });
  return {
    element,
    update(next) {
      o = { ...o, ...next };
      element.className = o.class ?? '';
      handle.update(o);
    },
    destroy() {
      handle.destroy();
      element.remove();
    },
  };
}
