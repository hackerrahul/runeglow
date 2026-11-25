/* The voice beam outside any framework: a sound-reactive glow along the
   bottom edge of an element, that rises and blooms with the level of a
   voice.

   The beam wraps the user's content, so unlike a canvas component it has no
   element of its own to make: it lives on a host element, with a stylesheet
   beside it and a few layers inside it after the content.

   `voiceBeamView` says what all of that looks like for a set of options —
   pure, so a server can render it. `attachVoiceBeam` brings a host that an
   adapter rendered that way to life. `mountVoiceBeam` does both on an
   element the page already has, for a page with no framework at all. */

import { Effects } from '../internal/effects';
import type { Style } from '../internal/view';
import { toTriple } from './color';
import { VOICE_SURFACE } from './flags';
import { resolveVoiceDefaults, resolveVoiceStyle, voiceTypePresets } from './presets';
import { generateVoiceBeamCSS, themePresets, voicePalettes, type GenerateVoiceStylesOptions } from './styles';
import type { VoiceBeamColorVariant, VoiceBeamLook, VoiceBeamOptions, VoiceBeamType } from './types';
import { registerVoiceInstance, type VoiceDriverConfig } from './voiceDriver';

/** Band colour defaults per theme, as `r, g, b` triples. */
const BAND_COLORS = {
  dark: { core: '255, 255, 255', above: '255, 70, 80', mid: '90, 255, 150', below: '80, 140, 255' },
  light: { core: '197, 139, 255', above: '255, 122, 182', mid: '126, 196, 255', below: '45, 255, 171' },
} as const;

const BORDER_WIDTH = 1;
const DEFAULT_RADIUS = 16;

/* WebKit (Safari) evaluates SVG filters on HTML content on the CPU every
   paint, which on a phone-sized host drops the frame rate by an order of
   magnitude, so the displacement warp is off there above this host area:
   a chat input (~39k px²) or a pill keeps it, the phone crop (~97k px²)
   and any real screen do not. Its 2D canvas also has no `filter`, so the
   band's blur is done in CSS on two canvases instead (the ridge and its
   wider halo), keeping Chromium's look. The half-resolution soft layers
   are explicit (a per-layer factor on every length, not `zoom`), so they
   run on every engine; Safari 18 rasters them pre-scale as Chromium does. */
const WEBKIT_WARP_MAX_AREA = 60_000;
// Every iOS browser is WebKit whatever its name (CriOS, FxiOS); only
// desktop Blink carries "Chrome/".
const IS_WEBKIT =
  typeof navigator !== 'undefined' &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent);
const CANVAS_FILTER = (() => {
  if (typeof document === 'undefined') return true;
  const ctx = document.createElement('canvas').getContext('2d');
  return !!ctx && typeof (ctx as { filter?: unknown }).filter === 'string';
})();

/* ── what the page tells the beam ─────────────────────────────────────── */

/**
 * What a beam knows besides its options: what the page and the browser
 * have told it since it was attached. The view is made from the options
 * and this together. A server, and a browser before the beam is attached,
 * render from `voiceBeamState(options)`; `attachVoiceBeam` then reports
 * each change through its `onstate` hook.
 */
export interface VoiceBeamState {
  /** `prefers-color-scheme`, for `theme="auto"`. */
  systemTheme: 'dark' | 'light';
  reducedMotion: boolean;
  /** The beam is in: faded in, or fading in. */
  active: boolean;
  /** The beam is on its way out: `active` went false and the fade-out is running. */
  fading: boolean;
  /** The host is on screen or near it. */
  visible: boolean;
  /** The corner radius read off the host's first child, when the options give none. */
  detectedRadius: number | null;
  /** The host's area in px², measured on WebKit only, to keep the warp off large hosts there. */
  hostArea: number;
}

/** The state a beam starts in, before it has asked the browser anything. */
export function voiceBeamState(options: VoiceBeamOptions = {}): VoiceBeamState {
  // The server has no media queries to ask, so both sides start on the same
  // values and the client corrects itself once attached.
  return {
    systemTheme: 'dark',
    reducedMotion: false,
    active: options.active ?? true,
    fading: false,
    visible: true,
    detectedRadius: null,
    hostArea: 0,
  };
}

/* ── what the options come to ─────────────────────────────────────────── */

/* A type, a theme or a palette can arrive as the text of an HTML attribute,
   so one the library does not know falls back to the default. */
const typeOf = (o: VoiceBeamOptions): VoiceBeamType => (o.type && o.type in voiceTypePresets ? o.type : 'default');
const themeOf = (o: VoiceBeamOptions, s: VoiceBeamState): 'dark' | 'light' =>
  o.theme === 'auto' ? s.systemTheme : o.theme === 'light' ? 'light' : 'dark';
const variantOf = (o: VoiceBeamOptions): VoiceBeamColorVariant =>
  o.colorVariant && o.colorVariant in voicePalettes ? o.colorVariant : 'colorful';
// Dots and lines are one surface, painted on a canvas instead of the glow's layers.
// Not released yet: without the switch every look is the glow.
const lookOf = (o: VoiceBeamOptions): VoiceBeamLook => (VOICE_SURFACE ? (o.look ?? 'glow') : 'glow');

/** An id as the stylesheet can carry it in a selector and a custom property's name. */
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

function resolve(o: VoiceBeamOptions, s: VoiceBeamState) {
  const type = typeOf(o);
  const theme = themeOf(o, s);
  const look = lookOf(o);
  const isSurface = VOICE_SURFACE && (look === 'dots' || look === 'lines');

  // The type preset supplies the geometry defaults; an explicit option
  // wins; `scale` then multiplies every pixel dimension as one.
  const d = resolveVoiceDefaults(type, theme);
  const sc = Math.max(0.05, o.scale ?? d.scale);
  const distortionBase = o.distortion ?? d.distortion;
  const g = {
    sc,
    glowSize: o.glowSize ?? d.glowSize,
    strokeOpacityMul: o.strokeOpacity ?? d.strokeOpacity,
    innerOpacityMul: o.innerOpacity ?? d.innerOpacity,
    bloomOpacityMul: o.bloomOpacity ?? d.bloomOpacity,
    idle: o.idle ?? d.idle,
    reach: o.reach ?? d.reach,
    spread: o.spread ?? d.spread,
    flow: (o.flow ?? d.flow) * sc,
    bend: (o.bend ?? d.bend) * sc,
    bandStrength: o.bandStrength ?? d.bandStrength,
    bandWidth: (o.bandWidth ?? d.bandWidth) * sc,
    bandPosition: o.bandPosition ?? d.bandPosition,
    bandCurve: o.bandCurve ?? d.bandCurve,
    bandSpread: o.bandSpread ?? d.bandSpread,
    bandSkew: o.bandSkew ?? d.bandSkew,
    bandOffset: (o.bandOffset ?? d.bandOffset) * sc,
    bandTail: o.bandTail ?? d.bandTail,
    bandTailPosition: o.bandTailPosition ?? d.bandTailPosition,
    bandTailCurve: o.bandTailCurve ?? d.bandTailCurve,
    bandTailOverflow: (o.bandTailOverflow ?? d.bandTailOverflow) * sc,
    bandAberration: o.bandAberration ?? d.bandAberration,
    // The WebKit gate is about the SVG warp's cost; the surface has no warp.
    distortion: !isSurface && IS_WEBKIT && s.hostArea > WEBKIT_WARP_MAX_AREA ? 0 : distortionBase,
    distortionDetail: (o.distortionDetail ?? d.distortionDetail) / sc,
    glowWidth: (o.glowWidth ?? d.glowWidth) * sc,
    glowHeight: (o.glowHeight ?? d.glowHeight) * sc,
    lobeSpacing: (o.lobeSpacing ?? d.lobeSpacing) * sc,
    rangeWidth: (o.rangeWidth ?? d.rangeWidth) * sc,
    rangeHeight: (o.rangeHeight ?? d.rangeHeight) * sc,
    softness: o.softness ?? d.softness,
    coreSize: (o.coreSize ?? d.coreSize) * sc,
    coreLight: Math.max(0, Math.min(3, o.coreLight ?? d.coreLight)),
    coreLightWidth: o.coreLightWidth ?? d.coreLightWidth,
    coreLightHeight: o.coreLightHeight ?? d.coreLightHeight,
    strokeScale: o.strokeScale ?? d.strokeScale,
    innerScale: o.innerScale ?? d.innerScale,
    innerHeight: o.innerHeight ?? d.innerHeight,
    bloomScale: o.bloomScale ?? d.bloomScale,
    bloomHeight: o.bloomHeight ?? d.bloomHeight,
  };

  const preset = themePresets[theme];
  const typeStyle = resolveVoiceStyle(type, theme);
  return {
    type,
    theme,
    look,
    isSurface,
    g,
    preset,
    borderRadius: o.borderRadius ?? s.detectedRadius ?? DEFAULT_RADIUS,
    strength: o.strength ?? typeStyle.strength ?? preset.strength ?? 1,
    hueRange: o.hueRange ?? preset.hueRange ?? 24,
    hueDuration: o.hueDuration ?? preset.hueDuration ?? 12,
    brightness: o.brightness ?? typeStyle.brightness ?? preset.brightness,
    saturation: o.saturation ?? typeStyle.saturation ?? preset.saturation,
  };
}

type Resolved = ReturnType<typeof resolve>;

/* The stylesheet is long and a host renders often — a level given as a
   number changes every frame — so the last few are kept by what they were
   made from. */
const sheets = new Map<string, string>();
const SHEETS_KEPT = 48;
function sheetFor(input: GenerateVoiceStylesOptions): string {
  const key = JSON.stringify(input);
  let css = sheets.get(key);
  if (css === undefined) css = generateVoiceBeamCSS(input);
  else sheets.delete(key);
  sheets.set(key, css);
  if (sheets.size > SHEETS_KEPT) sheets.delete(sheets.keys().next().value as string);
  return css;
}

/* ── the view ─────────────────────────────────────────────────────────── */

/**
 * One of the elements the beam keeps inside its host, after the content:
 * what to make and the attributes to give it. The names are as HTML and SVG
 * write them. `key` is the layer's name among its siblings, steady for as
 * long as it exists.
 */
export interface VoiceBeamLayer {
  key: string;
  tag: string;
  /** In the SVG namespace: the filter and what is inside it. */
  svg?: boolean;
  attributes: Record<string, string>;
  style?: Style;
  children?: VoiceBeamLayer[];
}

/** What a voice beam looks like: its host, its stylesheet and its layers. */
export interface VoiceBeamView {
  /** The instance's id as the stylesheet and the attributes carry it. */
  id: string;
  /**
   * The stylesheet, to be written as the content of a `<style>` element
   * beside the host or inside it. It is safe as raw HTML: a `css` option
   * cannot close the element it sits in.
   */
  css: string;
  /** The attributes of the host; one whose value is `undefined` is absent. */
  attributes: Record<string, string | undefined>;
  /** Inline style of the host: the beam's strength, as a custom property. */
  style: Style;
  /** The elements inside the host, after the user's content, in order. */
  layers: VoiceBeamLayer[];
  /**
   * Which of the beam's parts these options call for — `layers` says the
   * same as elements. For an adapter that writes the layers out in its own
   * template.
   */
  parts: {
    /** One canvas for the dots or the lines, in place of every part below. */
    surface: boolean;
    /** The mirrors of the inner light and the bloom that carry the distortion, and its filter. */
    warp: boolean;
    /** A second canvas for the band's halo, where a canvas cannot blur its own strokes. */
    halo: boolean;
    /** The epicentre wash. */
    core: boolean;
    /** The distortion filter's id and its noise's `baseFrequency`. */
    filterId: string;
    noiseFrequency: string;
  };
}

/**
 * The host, the stylesheet and the layers of a voice beam for these
 * options. `id` names the instance: any text that is the same wherever the
 * same beam is rendered (a framework's own id for the component does) and
 * different for every other beam on the page.
 */
export function voiceBeamView(options: VoiceBeamOptions, id: string, state: VoiceBeamState = voiceBeamState(options)): VoiceBeamView {
  id = cleanId(id);
  const r = resolve(options, state);
  const { g, preset } = r;

  const css = sheetFor({
    id,
    borderRadius: r.borderRadius,
    borderWidth: BORDER_WIDTH,
    strokeOpacity: preset.strokeOpacity * g.strokeOpacityMul,
    innerOpacity: preset.innerOpacity * g.innerOpacityMul,
    bloomOpacity: preset.bloomOpacity * g.bloomOpacityMul,
    innerShadow: preset.innerShadow,
    colorVariant: variantOf(options),
    colors: options.colors,
    brightness: r.brightness,
    saturation: r.saturation,
    theme: r.theme,
    hueBase: preset.hueBase ?? 0,
    glowSize: g.glowSize * g.sc,
    glowWidth: g.glowWidth,
    glowHeight: g.glowHeight,
    strokeScale: g.strokeScale,
    innerScale: g.innerScale,
    innerHeight: g.innerHeight,
    bloomScale: g.bloomScale,
    bloomHeight: g.bloomHeight,
    coreSize: g.coreSize,
    coreLight: g.coreLight,
    coreLightWidth: g.coreLightWidth,
    coreLightHeight: g.coreLightHeight,
    rangeWidth: g.rangeWidth,
    rangeHeight: g.rangeHeight,
    softness: g.softness,
    distortion: g.distortion > 0,
    scale: g.sc,
    look: r.look,
  });
  // The sheet is written as raw HTML, so a consumer's `css` cannot be allowed
  // to close the element it sits in.
  const sheet = (options.css ? `${css}\n${options.css.split('{id}').join(id)}` : css).replace(/<\/(style)/gi, '<\\/$1');

  const shown = state.active && !state.fading;
  const parts = {
    surface: r.isSurface,
    warp: !r.isSurface && g.distortion > 0,
    halo: !r.isSurface && !CANVAS_FILTER,
    core: !r.isSurface && g.coreLight > 0,
    filterId: `vb-distort-${id}`,
    noiseFrequency: `${(0.012 * g.distortionDetail).toFixed(4)} ${(0.05 * g.distortionDetail).toFixed(4)}`,
  };

  const layers: VoiceBeamLayer[] = [];
  if (parts.surface) {
    layers.push({ key: 'surface', tag: 'canvas', attributes: { 'data-voice-beam-surface': '', 'aria-hidden': 'true' } });
  } else {
    layers.push({ key: 'bloom', tag: 'div', attributes: { 'data-voice-beam-bloom': '' } });
    if (parts.warp) {
      // Mirrors of the inner light and bloom, clipped to below the band
      // line and carrying the displacement filter.
      layers.push({ key: 'warp-inner', tag: 'div', attributes: { 'data-voice-beam-warp': 'inner' } });
      layers.push({ key: 'warp-bloom', tag: 'div', attributes: { 'data-voice-beam-warp': 'bloom' } });
    }
    if (parts.halo) layers.push({ key: 'band-halo', tag: 'canvas', attributes: { 'data-voice-beam-band-halo': '', 'aria-hidden': 'true' } });
    layers.push({ key: 'band', tag: 'canvas', attributes: { 'data-voice-beam-band': '', 'aria-hidden': 'true' } });
    // After the band canvases, so the wash sits over the band's halo under
    // the line (it is clipped to below the line, so the ridge itself
    // stays) while the host's own content stays above it.
    if (parts.core) {
      layers.push({ key: 'core', tag: 'div', attributes: { 'data-voice-beam-core': '' }, children: [{ key: 'wash', tag: 'div', attributes: {} }] });
    }
    if (parts.warp) {
      // The distortion filter: drifting fractal noise, its green channel
      // pinned to 0.5 so only x displaces, driven per frame by the driver
      // (scale and offset), which also narrows the region to the strip
      // under the band line once it runs — the full box here is only the
      // first frame. Zero-sized, so it takes no room.
      const fe = (tag: string, attributes: Record<string, string>): VoiceBeamLayer => ({ key: tag, tag, svg: true, attributes });
      layers.push({
        key: 'distort',
        tag: 'svg',
        svg: true,
        attributes: { 'aria-hidden': 'true', width: '0', height: '0' },
        style: { position: 'absolute', 'pointer-events': 'none' },
        children: [
          {
            key: 'filter',
            tag: 'filter',
            svg: true,
            attributes: { id: parts.filterId, x: '-20%', y: '-20%', width: '140%', height: '140%', 'color-interpolation-filters': 'sRGB' },
            children: [
              fe('feTurbulence', { type: 'fractalNoise', baseFrequency: parts.noiseFrequency, numOctaves: '2', seed: '7', result: 'noise' }),
              fe('feOffset', { in: 'noise', dx: '0', dy: '0', result: 'moved' }),
              fe('feColorMatrix', { in: 'moved', type: 'matrix', values: '1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1', result: 'map' }),
              fe('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: '0', xChannelSelector: 'R', yChannelSelector: 'G' }),
            ],
          },
        ],
      });
    }
  }

  return {
    id,
    css: sheet,
    attributes: {
      'data-voice-beam': id,
      'data-voice-type': options.type ?? 'default',
      'data-voice-look': r.look,
      'data-voice-halfres': '',
      'data-active': shown ? '' : undefined,
      'data-fading': state.fading ? '' : undefined,
      'data-paused': shown && (!state.visible || !!options.paused) ? '' : undefined,
      'data-listening': options.stream ? '' : undefined,
    },
    style: { '--voice-strength': String(Math.max(0, Math.min(1, r.strength))) },
    layers,
    parts,
  };
}

/* Runtime config for the shared driver. */
function driverConfig(o: VoiceBeamOptions, s: VoiceBeamState, id: string, r: Resolved): VoiceDriverConfig {
  const { g } = r;
  const custom = o.bandColors;
  const dotShape = o.dotShape, linePattern = o.linePattern;
  return {
    id,
    sensitivity: Math.max(0, o.sensitivity ?? 3.1),
    threshold: Math.max(0, Math.min(0.95, o.threshold ?? 0.015)),
    attack: Math.max(0, o.attack ?? 0.325),
    release: Math.max(0, o.release ?? 0.86),
    idle: Math.max(0, Math.min(1, g.idle)),
    breatheDuration: Math.max(0.2, o.breatheDuration ?? 5.2),
    reach: Math.max(0, g.reach),
    spread: Math.max(0, g.spread),
    bands: o.bands ?? true,
    flow: g.flow,
    lobeSpacing: Math.max(0.1, g.lobeSpacing),
    bend: Math.max(0, g.bend),
    bandStrength: Math.max(0, g.bandStrength),
    bandWidth: Math.max(0, g.bandWidth),
    bandPosition: Math.max(0, g.bandPosition),
    bandCurve: Math.max(0.3, g.bandCurve),
    bandSpread: Math.max(0.05, g.bandSpread),
    bandSkew: Math.max(-0.9, Math.min(0.9, g.bandSkew)),
    bandOffset: g.bandOffset,
    bandTail: Math.max(0, Math.min(1.5, g.bandTail)),
    bandTailPosition: Math.max(0, Math.min(0.98, g.bandTailPosition)),
    bandTailCurve: Math.max(0.5, g.bandTailCurve),
    bandTailOverflow: Math.max(0, g.bandTailOverflow),
    bandAberration: Math.max(0, Math.min(1, g.bandAberration)),
    rangeWidth: g.rangeWidth,
    rangeHeight: g.rangeHeight,
    theme: r.theme,
    bandColors: {
      core: (custom?.core && toTriple(custom.core)) || BAND_COLORS[r.theme].core,
      above: (custom?.above && toTriple(custom.above)) || BAND_COLORS[r.theme].above,
      mid: (custom?.mid && toTriple(custom.mid)) || BAND_COLORS[r.theme].mid,
      below: (custom?.below && toTriple(custom.below)) || BAND_COLORS[r.theme].below,
    },
    distortion: Math.max(0, Math.min(1, g.distortion)),
    coreLight: g.coreLight,
    scale: g.sc,
    radius: r.borderRadius,
    hueRange: Math.max(0, r.hueRange),
    hueDuration: Math.max(0.5, r.hueDuration),
    staticColors: variantOf(o) === 'mono' ? true : (o.staticColors ?? false),
    reducedMotion: s.reducedMotion,
    paused: o.paused ?? false,
    look: r.look,
    dotSize: Math.max(0.1, o.dotSize ?? 1),
    dotGap: Math.max(0.3, o.dotGap ?? 1),
    dotShape: dotShape === 'square' ? 'square' : 'round',
    lineWidth: Math.max(0.05, o.lineWidth ?? 1),
    lineGap: Math.max(0.3, o.lineGap ?? 1),
    linePattern: linePattern === 'columns' || linePattern === 'grid' ? linePattern : 'rows',
    seeThrough: o.seeThrough ?? false,
    texture: Math.max(0, Math.min(1, o.texture ?? 0.6)),
    gravity: Math.max(0.05, o.gravity ?? 1),
    surfaceHeight: Math.max(0.1, o.surfaceHeight ?? 1),
    surfaceCurve: Math.max(-3, Math.min(5, o.surfaceCurve ?? 1)),
    surfaceTail: Math.max(-2, Math.min(3, o.surfaceTail ?? 0)),
    surfaceTailPosition: Math.max(0, Math.min(0.98, o.surfaceTailPosition ?? 0.6)),
    surfaceTailCurve: Math.max(0.5, o.surfaceTailCurve ?? 2.4),
    surfaceFade: Math.max(0, Math.min(1, o.surfaceFade ?? 0.2)),
    layers: {
      glowWidth: g.glowWidth,
      glowHeight: g.glowHeight,
      innerScale: g.innerScale,
      innerHeight: g.innerHeight,
      bloomScale: g.bloomScale,
      bloomHeight: g.bloomHeight,
      strokeScale: g.strokeScale,
      softness: g.softness,
      coreSize: g.coreSize,
      innerOpacity: g.innerOpacityMul,
      bloomOpacity: g.bloomOpacityMul,
      strokeOpacity: g.strokeOpacityMul,
      brightness: r.brightness,
    },
  };
}

/* ── attaching ────────────────────────────────────────────────────────── */

export interface VoiceBeamHooks {
  /**
   * The state the host was rendered from, when that is not the starting
   * one: a host that is attached a second time carries on from here.
   */
  state?: VoiceBeamState;
  /**
   * The state has changed, so the view has: render `voiceBeamView` again
   * with this state, then call `update` with it. Without this hook the beam
   * takes the host to be in step already.
   */
  onstate?: (state: VoiceBeamState) => void;
}

export interface VoiceBeamHandle {
  /** The state as it stands now. */
  readonly state: VoiceBeamState;
  /**
   * Give the beam new options. Each call replaces the last set whole.
   * `rendered` is the state the host's elements were last rendered from,
   * where an adapter renders them; the beam looks for its canvases and its
   * filter only once the host shows the state it is in.
   */
  update(options: VoiceBeamOptions, rendered?: VoiceBeamState): void;
  /** Stop everything and let go of the host. */
  destroy(): void;
}

/* The options that are read when the driver asks for them, every frame:
   a change to one of these is nothing to redo. */
const LIVE = new Set<string>(['level', 'motion', 'onLevel', 'onActivate', 'onDeactivate']);

/* a new set of options that says what the last one said is no work */
function sameOptions(a: VoiceBeamOptions, b: VoiceBeamOptions): boolean {
  if (a === b) return true;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof VoiceBeamOptions>) {
    if (LIVE.has(k) || Object.is(a[k], b[k])) continue;
    // Custom colours are compared by value, so a fresh array literal does
    // not register the driver again.
    if (k === 'colors' && a.colors && b.colors && a.colors.join('|') === b.colors.join('|')) continue;
    if (k === 'bandColors' && a.bandColors && b.bandColors) {
      const x = a.bandColors, y = b.bandColors;
      if (x.core === y.core && x.above === y.above && x.mid === y.mid && x.below === y.below) continue;
    }
    return false;
  }
  return true;
}

/**
 * Bring a voice beam to life on a host element rendered as `voiceBeamView`
 * says, with `id` the one the view was given. The beam follows the audio
 * stream or the level it is given, fades in and out with `active`, and
 * stops its per-frame work while the host is scrolled away.
 */
export function attachVoiceBeam(host: HTMLElement, options: VoiceBeamOptions, id: string, hooks: VoiceBeamHooks = {}): VoiceBeamHandle {
  id = cleanId(id);
  let o = options;
  let alive = true;
  /* the state now, and the state the host's elements show */
  let state = hooks.state ?? voiceBeamState(o);
  let rendered = state;
  const fx = new Effects();

  /* A change made while the effects run is told once they have: the
     adapter's answer is to call `update`, which runs them again. */
  let flushing = false;
  let untold = false;
  const tell = () => {
    if (hooks.onstate) hooks.onstate(state);
    else {
      rendered = state;
      derive();
      touch();
    }
  };
  const flush = () => {
    if (!alive) return;
    flushing = true;
    fx.flush();
    flushing = false;
    if (untold) {
      untold = false;
      tell();
    }
  };
  let queued = false;
  const touch = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      flush();
    });
  };
  const set = (patch: Partial<VoiceBeamState>) => {
    let changed = false;
    for (const k in patch) if (!Object.is(patch[k as keyof VoiceBeamState], state[k as keyof VoiceBeamState])) changed = true;
    if (!changed || !alive) return;
    state = { ...state, ...patch };
    if (flushing) untold = true;
    else tell();
  };

  /* the driver's config, and a key that changes when anything in it does */
  let config!: VoiceDriverConfig;
  let configKey = '';
  const derive = () => {
    config = driverConfig(o, rendered, id, resolve(o, rendered));
    configKey = JSON.stringify(config);
  };
  derive();

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

  fx.add(
    () => [],
    () => {
      if (typeof matchMedia !== 'function') return;
      const mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');
      set({ reducedMotion: mediaQuery.matches });
      const handler = (e: MediaQueryListEvent) => set({ reducedMotion: e.matches });
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    },
  );

  /* The host's area, measured on WebKit only, to keep the warp off large hosts there. */
  fx.add(
    () => [],
    () => {
      if (!IS_WEBKIT) return;
      const measure = () => set({ hostArea: host.clientWidth * host.clientHeight });
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(host);
      return () => ro.disconnect();
    },
  );

  // Auto-detect child border radius when no explicit value is provided
  fx.add(
    () => [o.borderRadius != null],
    () => {
      if (o.borderRadius != null) return;

      const detect = () => {
        const child = host.firstElementChild as HTMLElement | null;
        if (!child) return;
        const computed = getComputedStyle(child);
        const raw = parseFloat(computed.borderTopLeftRadius);
        if (!isNaN(raw) && raw > 0) set({ detectedRadius: raw });
      };

      detect();
      if (typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(detect);
      observer.observe(host, { childList: true, subtree: false });
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

  // Stop the per-frame work while the element is scrolled offscreen.
  fx.add(
    () => [],
    () => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) set({ visible: entry.isIntersecting });
        },
        { rootMargin: '256px' },
      );
      observer.observe(host);
      return () => observer.disconnect();
    },
  );

  /* In the capture phase, so the beam hears the end of its fade before any
     listener the page has put on the host. */
  const onAnimationEnd = (e: AnimationEvent) => {
    const animationName = e.animationName;
    if (animationName.includes('fade-out')) {
      set({ active: false, fading: false });
      o.onDeactivate?.();
    } else if (animationName.includes('fade-in')) {
      o.onActivate?.();
    }
  };
  host.addEventListener('animationend', onAnimationEnd, true);

  // The manual level, the motion and the onLevel callback are read when the
  // driver asks for them, every frame, and not while this effect runs: a
  // changing value never tears the driver down and up.
  fx.add(
    () => [rendered.active || rendered.fading, rendered.visible, configKey, o.stream ?? null],
    () => {
      if (!(rendered.active || rendered.fading) || !rendered.visible) return;

      const getLevel = () => {
        const level = o.level ?? 0;
        return typeof level === 'function' ? level() : level;
      };
      const report = (value: number) => o.onLevel?.(value);
      const getMotion = () => {
        const motion = o.motion ?? null;
        return typeof motion === 'function' ? motion() : motion;
      };

      return registerVoiceInstance(host, config, { stream: o.stream ?? null, getLevel, getMotion }, report);
    },
  );

  flush();

  return {
    get state() {
      return state;
    },
    update(next, shows = state) {
      const fresh = shows !== rendered || !sameOptions(o, next);
      o = next;
      if (!fresh) return;
      rendered = shows;
      derive();
      flush();
    },
    destroy() {
      alive = false;
      host.removeEventListener('animationend', onAnimationEnd, true);
      fx.destroy();
    },
  };
}

/* ── mounting ─────────────────────────────────────────────────────────── */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Make a layer's element, or bring one that exists in line with a new
   description of it. Only what the description changed is written: the
   driver sets attributes of its own on the filter, every frame. */
function syncLayer(doc: Document, el: Element | null, layer: VoiceBeamLayer, last: VoiceBeamLayer | null): Element {
  const node = el ?? (layer.svg ? doc.createElementNS(SVG_NS, layer.tag) : doc.createElement(layer.tag));
  for (const name in layer.attributes) {
    if (!last || last.attributes[name] !== layer.attributes[name]) node.setAttribute(name, layer.attributes[name]);
  }
  if (!last && layer.style) for (const key in layer.style) (node as HTMLElement | SVGElement).style.setProperty(key, layer.style[key]);
  if (!last) for (const child of layer.children ?? []) node.appendChild(syncLayer(doc, null, child, null));
  else (layer.children ?? []).forEach((child, i) => syncLayer(doc, node.children[i] ?? null, child, last.children?.[i] ?? null));
  return node;
}

let mounted = 0;

/** What `mountVoiceBeam` takes on top of the beam's own options. */
export interface VoiceBeamMountOptions extends VoiceBeamOptions {
  /** A class to add to the host element. */
  class?: string;
}

export interface MountedVoiceBeam {
  /** The host: the element the beam was mounted on. */
  element: HTMLElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: VoiceBeamMountOptions): void;
  /** Stop the beam and take everything it added off the host, leaving the element and its content. */
  destroy(): void;
}

/**
 * Put a voice beam on an element the page already has, with no framework.
 * The element keeps its content; the beam adds its attributes to it, and
 * its layers and its stylesheet inside it after the content, keeps them in
 * step with the options, and takes them away again in `destroy`.
 *
 *   const beam = mountVoiceBeam(document.querySelector('#composer'), { level: () => meter.level });
 *   beam.update({ active: false });
 */
export function mountVoiceBeam(host: HTMLElement, options: VoiceBeamMountOptions = {}): MountedVoiceBeam {
  const doc = host.ownerDocument;
  const id = `rg-${++mounted}`;
  const sheet = doc.createElement('style');

  let o = { ...options };
  let state = voiceBeamState(o);
  let view: VoiceBeamView | null = null;
  let className = '';
  const layers = new Map<string, Element>();

  const render = () => {
    const next = voiceBeamView(o, id, state);
    for (const name in next.attributes) {
      const value = next.attributes[name];
      if (view && view.attributes[name] === value) continue;
      if (value === undefined) host.removeAttribute(name);
      else host.setAttribute(name, value);
    }
    for (const key in next.style) if (!view || view.style[key] !== next.style[key]) host.style.setProperty(key, next.style[key]);
    if (className !== (o.class ?? '')) {
      if (className) host.classList.remove(...className.split(/\s+/).filter(Boolean));
      className = o.class ?? '';
      if (className) host.classList.add(...className.split(/\s+/).filter(Boolean));
    }
    if (!view || view.css !== next.css) sheet.textContent = next.css;

    /* the layers: each kept while its key lasts, in the view's order, before the stylesheet */
    const lastByKey = new Map((view?.layers ?? []).map((layer) => [layer.key, layer]));
    const keys = new Set(next.layers.map((layer) => layer.key));
    for (const [key, el] of layers) {
      if (keys.has(key)) continue;
      el.remove();
      layers.delete(key);
    }
    const order = next.layers.map((layer) => layer.key).join(' ');
    const moved = !view || order !== view.layers.map((layer) => layer.key).join(' ') || sheet.parentNode !== host;
    for (const layer of next.layers) {
      const had = layers.get(layer.key) ?? null;
      const el = syncLayer(doc, had, layer, had ? (lastByKey.get(layer.key) ?? null) : null);
      layers.set(layer.key, el);
      if (moved) host.appendChild(el);
    }
    if (moved) host.appendChild(sheet);
    view = next;
  };

  render();
  let handle: VoiceBeamHandle | null = null;
  handle = attachVoiceBeam(host, o, id, {
    state,
    onstate(next) {
      state = next;
      render();
      handle?.update(o, state);
    },
  });
  /* what the beam learned while it was being attached, now that there is a handle to tell */
  handle.update(o, state);

  return {
    element: host,
    update(next) {
      o = { ...o, ...next };
      render();
      handle?.update(o, state);
    },
    destroy() {
      handle?.destroy();
      handle = null;
      for (const el of layers.values()) el.remove();
      layers.clear();
      sheet.remove();
      if (view) for (const name in view.attributes) host.removeAttribute(name);
      host.removeAttribute('data-voice-warp');
      if (className) host.classList.remove(...className.split(/\s+/).filter(Boolean));
      /* the custom properties: the strength, and what the driver wrote for this instance */
      for (const name of [...host.style]) {
        if (name === '--voice-strength' || (name.startsWith('--vb-') && name.endsWith(`-${id}`))) host.style.removeProperty(name);
      }
      if (!host.getAttribute('style')) host.removeAttribute('style');
    },
  };
}
