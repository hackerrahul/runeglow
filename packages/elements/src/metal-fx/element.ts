import { attributeName, parseOption, type OptionKind } from 'runeglow/kit';
import type { MetalFxReflectionTarget } from 'runeglow/metal-fx';

/* The custom element the three metal tags are made from. It differs from
   the one the canvas components share (`internal/element.ts`) in what a
   ring needs: the element lays out as its ring does, in the line of text
   or the flex row it is in, and passes its line height on to what is
   slotted into it; and three options are not plain values.

   `reflection-targets` is a CSS selector, since HTML cannot hand over
   elements: every element it matches in the element's own document (or
   shadow root) catches the metal's light, and one carrying
   `data-metal-fx-strength="0.4"` catches that share of it. As a property it
   also takes what the other frameworks take, a list of elements or of
   `{ el, strength }`. `inner-shadow` is a bare attribute, or a record as
   JSON. `mask` is a function, so it is a property only. */

/* what a mounted component gives back, whichever one it is */
interface Mounted<Options> {
  update(options: Options): void;
  destroy(): void;
}

/* where there is no DOM (a server rendering the page), the classes below
   still have to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/** The reflection targets as an element's attribute or property gives them. */
export type MetalTargets = string | ReadonlyArray<MetalFxReflectionTarget>;

/** A component's options as its element has them: the targets may be a selector. */
export type ElementOptions<Options> = Omit<Options, 'reflectionTargets'> & { reflectionTargets?: MetalTargets };

/* the value an attribute's text stands for */
function parse(key: string, kind: OptionKind, text: string | null): unknown {
  if (text === null) return undefined;
  if (key === 'reflectionTargets') return text;
  if (key === 'innerShadow' && text === '') return true;
  return parseOption(kind, text);
}

/* the elements a selector names, each with the strength it asks for */
function matched(host: HTMLElement, selector: string): MetalFxReflectionTarget[] {
  const scope = host.getRootNode() as Document | ShadowRoot | Element;
  let found: HTMLElement[];
  try {
    found = [...scope.querySelectorAll<HTMLElement>(selector)];
  } catch {
    return [];
  }
  return found.map((el) => {
    const strength = Number.parseFloat(el.dataset.metalFxStrength ?? '');
    return Number.isFinite(strength) ? { el, strength } : el;
  });
}

/**
 * A custom element round one of the metal components. Every option is both
 * an attribute, in HTML's spelling (`shader-scale="2"`), and a property, in
 * JavaScript's (`el.shaderScale = 2`); whichever was set last wins. The
 * component is drawn in the element's shadow root, where the ring's own
 * stylesheet is put as well.
 */
export function metalElement<Options extends object>(
  kinds: Record<keyof Options & string, OptionKind>,
  mount: (root: ShadowRoot, options: Options) => Mounted<Options>,
) {
  const keys = Object.keys(kinds) as (keyof Options & string)[];
  /* a function cannot be written in an attribute */
  const byAttribute = new Map<string, keyof Options & string>(keys.filter((key) => key !== 'mask').map((key) => [attributeName(key), key]));

  class MetalElement extends Base {
    static observedAttributes = [...byAttribute.keys()];

    /* the options as last set, and the component while the element is in a page */
    private options: Record<string, unknown> = {};
    private mounted: Mounted<Options> | null = null;
    private again = 0;

    connectedCallback() {
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      if (!root.firstChild) {
        const style = document.createElement('style');
        style.textContent = ':host{display:inline-flex}:host([hidden]){display:none}.metal-fx-root{flex:1 1 auto}';
        root.appendChild(style);
      }
      /* a property set before the element was defined sits on the instance,
         in front of the accessor: take it through the accessor instead */
      const own = this as unknown as Record<string, unknown>;
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(this, key)) {
          const value = own[key];
          delete own[key];
          own[key] = value;
        }
      }
      this.mounted = mount(root, this.resolved());
      /* A selector may name elements further down the page than this one,
         which a parser has not reached yet: look again once it has. */
      if (typeof this.options.reflectionTargets === 'string') {
        const look = () => {
          this.again = 0;
          this.refresh();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', look, { once: true });
        this.again = requestAnimationFrame(look);
      }
    }

    disconnectedCallback() {
      if (this.again) cancelAnimationFrame(this.again);
      this.again = 0;
      this.mounted?.destroy();
      this.mounted = null;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const key = byAttribute.get(name);
      if (key) this.setOption(key, parse(key, kinds[key], value));
    }

    /* the options as the core takes them: a selector looked up now */
    private resolved(): Options {
      const targets = this.options.reflectionTargets;
      return { ...this.options, reflectionTargets: typeof targets === 'string' ? matched(this, targets) : targets } as Options;
    }

    getOption(key: string): unknown {
      return this.options[key];
    }

    setOption(key: string, value: unknown) {
      /* a selector set again is looked up again: the page may have changed */
      if (Object.is(this.options[key], value) && !(key === 'reflectionTargets' && typeof value === 'string')) return;
      this.options = { ...this.options, [key]: value };
      this.refresh();
    }

    /** Look the `reflection-targets` selector up again, after the page around the element has changed. */
    refresh() {
      this.mounted?.update(this.resolved());
    }
  }

  for (const key of keys) {
    Object.defineProperty(MetalElement.prototype, key, {
      configurable: true,
      enumerable: true,
      get(this: MetalElement) {
        return this.getOption(key);
      },
      set(this: MetalElement, value: unknown) {
        /* null means "unset" for every option but one: on the text, a null
           inner shadow turns the shadow off, as it does in the frameworks */
        this.setOption(key, value === null && key !== 'innerShadow' ? undefined : value);
      },
    });
  }

  type Extras = {
    /** Look the `reflection-targets` selector up again, after the page around the element has changed. */
    refresh(): void;
  };
  return MetalElement as unknown as {
    new (): HTMLElement & ElementOptions<Options> & Extras;
    prototype: HTMLElement & ElementOptions<Options> & Extras;
    observedAttributes: string[];
  };
}
