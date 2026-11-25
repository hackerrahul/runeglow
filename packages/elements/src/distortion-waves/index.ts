/* The distortion wave as an HTML tag. Importing this file registers it:

     <runeglow-distortion-wave>
       <div class="review">…<button>Send</button></div>
       <div slot="revealed" class="receipt">…</div>
     </runeglow-distortion-wave>

   The element is the wave's own element and its children are the layers,
   in the page's own DOM: there is no shadow root and there are no real
   slots. The engine watches the element's subtree to know which view has
   changed and which control was pressed, and tells them apart with
   `contains()`; content handed to a `<slot>` stays outside a shadow tree,
   where it would see neither. So each view is one child element, used as
   its layer as it stands: the first child with no `slot` attribute is the
   view that shows first, the child with `slot="revealed"` is the view the
   wave leaves behind, and the child with `slot="overlay"` stays above the
   wave. The wave lays them over each other, and adds its canvas as one
   more child. Children that come or go later are picked up.

   Every option is an attribute and a property; see `hostElement`. `source`
   as an attribute is a rectangle as JSON, or a selector for an element
   inside the wave; `focus` as a property is `focusPoint`, since every
   element has a `focus()` already. Setting `revealed` runs the wave, and so
   do `play()`, `reverse()`, `reset()` and `prepare()`, which are methods.
   The end of a wave is told by a `finish` event, with the view now showing
   as `event.detail.revealed`. */

import {
  attachDistortionWave,
  distortionWaveOptionKinds,
  type AttachedDistortionWave,
  type DistortionWaveHandle,
  type DistortionWaveLayers,
  type DistortionWaveOptions,
  type PlayOptions,
  type Point,
  type WaveController,
} from 'runeglow/distortion-waves';
import { parseOption } from 'runeglow/kit';
import { hostElement, type HostElementExtras } from '../internal/border-beam.js';
import { define } from '../internal/element.js';

/* the wave on an element, as its children stand now and as they change */
interface WaveOnHost {
  update(options: DistortionWaveOptions): void;
  destroy(): void;
  readonly wave: AttachedDistortionWave | null;
}

type Found = { content: HTMLElement | null; revealed: HTMLElement | null; overlay: HTMLElement | null };

/* tags that are never a view */
const UNSEEN = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'LINK']);

function layersOf(host: HTMLElement): Found {
  const found: Found = { content: null, revealed: null, overlay: null };
  for (const el of host.children) {
    if (!(el instanceof HTMLElement) || UNSEEN.has(el.tagName)) continue;
    /* the wave's own canvas */
    if (el.tagName === 'CANVAS' && el.hasAttribute('data-dw-skip')) continue;
    const slot = el.getAttribute('slot');
    if (slot === 'revealed') found.revealed ??= el;
    else if (slot === 'overlay') found.overlay ??= el;
    else found.content ??= el;
  }
  return found;
}

function waveOn(host: HTMLElement, options: DistortionWaveOptions): WaveOnHost {
  let o = options;
  let wave: AttachedDistortionWave | null = null;
  let layers: Found = { content: null, revealed: null, overlay: null };
  const hooks = {
    onFinish: (revealed: boolean) => host.dispatchEvent(new CustomEvent('finish', { detail: { revealed } })),
  };
  const sync = () => {
    const next = layersOf(host);
    if (wave && next.content === layers.content && next.overlay === layers.overlay) {
      /* only the second view has come or gone, if anything has */
      if (next.revealed !== layers.revealed) wave.setRevealedLayer(next.revealed);
      layers = next;
      return;
    }
    wave?.destroy();
    wave = null;
    layers = next;
    if (next.content) wave = attachDistortionWave(host, next as DistortionWaveLayers, o, hooks);
  };
  sync();
  /* a page may fill the element after it is connected, and change it later */
  const observer = new MutationObserver(sync);
  observer.observe(host, { childList: true });
  return {
    update(next) {
      o = next;
      wave?.update(o);
    },
    destroy() {
      observer.disconnect();
      wave?.destroy();
      wave = null;
    },
    get wave() {
      return wave;
    },
  };
}

const Host = hostElement<DistortionWaveOptions, WaveOnHost>(distortionWaveOptionKinds, waveOn, {
  parse: {
    /* a rectangle as JSON, or a selector for an element inside the wave */
    source: (text, host) => {
      if (text === null) return undefined;
      const rect = parseOption('object', text);
      return rect && typeof rect === 'object' ? (rect as DistortionWaveOptions['source']) : { get current() { return host.querySelector(text); } };
    },
    /* a name or one colour, or the colours themselves as JSON */
    palette: (text) => (text !== null && text.trim().startsWith('{') ? (parseOption('object', text) as DistortionWaveOptions['palette']) : (text ?? undefined)),
  },
  rename: { focus: 'focusPoint' },
}) as unknown as {
  new (): HTMLElement & Omit<DistortionWaveOptions, 'focus'> & { focusPoint?: Point | null } & HostElementExtras<WaveOnHost>;
  observedAttributes: string[];
};

/** `<runeglow-distortion-wave>`: a wave that carries one child into another. */
export class DistortionWaveElement extends Host implements DistortionWaveHandle {
  /** Runs the wave from the start. */
  play(options?: PlayOptions): void {
    this.attached?.wave?.play(options);
  }
  /** Runs it back to the first view. */
  reverse(): void {
    this.attached?.wave?.reverse();
  }
  /** Straight back to the first view, with no wave. */
  reset(): void {
    this.attached?.wave?.reset();
  }
  /** Pictures the element now, so the next wave starts with its lens. */
  prepare(): Promise<void> {
    return this.attached?.wave?.prepare() ?? Promise.resolve();
  }
  /** The engine behind it, for benches. */
  getController(): WaveController | null {
    return this.attached?.wave?.getController() ?? null;
  }
}

define('runeglow-distortion-wave', DistortionWaveElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-distortion-wave': DistortionWaveElement;
  }
}

/* The engine, the model, the renderer and the capture are the core's, the
   same in every framework. */
export * from 'runeglow/distortion-waves';
