import { attributeName, parseOption, type OptionKinds } from 'runeglow/kit';

/* what a mounted component gives back, whichever one it is */
interface Mounted<Options> {
  update(options: Options): void;
  poke(): void;
  destroy(): void;
}

/* where there is no DOM (a server rendering the page), the classes below
   still have to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/** What every element here has on top of its component's options. */
export interface OptionsElementExtras {
  /** The accessible name, in place of the component's own. */
  label?: string;
  /** What a click does: a hop and a turn. */
  poke(): void;
}

/**
 * A custom element round one of the core's components. Every option is
 * both an attribute, in HTML's spelling (`floor-shadow="false"`), and a
 * property, in JavaScript's (`el.floorShadow = false`); whichever was set
 * last wins. The component is drawn in the element's shadow root, so the
 * page's styles do not reach it, and the element lays out like an image.
 */
export function optionsElement<Options extends object>(
  kinds: OptionKinds<Options>,
  mount: (root: ShadowRoot, options: Options & { label?: string }) => Mounted<Options & { label?: string }>,
) {
  type All = Options & { label?: string };
  const keys = Object.keys(kinds) as (keyof Options & string)[];
  const byAttribute = new Map<string, keyof Options & string>(keys.map((key) => [attributeName(key), key]));

  class OptionsElement extends Base {
    static observedAttributes = [...byAttribute.keys(), 'label'];

    /* the options as last set, and the component while the element is in a page */
    private options: Record<string, unknown> = {};
    private mounted: Mounted<All> | null = null;

    connectedCallback() {
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      if (!root.firstChild) {
        const style = document.createElement('style');
        style.textContent = ':host{display:inline-block;vertical-align:middle;line-height:0}:host([hidden]){display:none}';
        root.appendChild(style);
      }
      /* a property set before the element was defined sits on the instance,
         in front of the accessor: take it through the accessor instead */
      const own = this as unknown as Record<string, unknown>;
      for (const key of [...keys, 'label']) {
        if (Object.prototype.hasOwnProperty.call(this, key)) {
          const value = own[key];
          delete own[key];
          own[key] = value;
        }
      }
      this.mounted = mount(root, this.options as All);
    }

    disconnectedCallback() {
      this.mounted?.destroy();
      this.mounted = null;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if (name === 'label') this.setOption('label', value ?? undefined);
      else {
        const key = byAttribute.get(name);
        if (key) this.setOption(key, parseOption(kinds[key], value));
      }
    }

    getOption(key: string): unknown {
      return this.options[key];
    }

    setOption(key: string, value: unknown) {
      if (Object.is(this.options[key], value)) return;
      this.options = { ...this.options, [key]: value };
      this.mounted?.update(this.options as All);
    }

    poke() {
      this.mounted?.poke();
    }
  }

  for (const key of [...keys, 'label']) {
    Object.defineProperty(OptionsElement.prototype, key, {
      configurable: true,
      enumerable: true,
      get(this: OptionsElement) {
        return this.getOption(key);
      },
      set(this: OptionsElement, value: unknown) {
        this.setOption(key, value ?? undefined);
      },
    });
  }

  return OptionsElement as unknown as {
    new (): HTMLElement & Options & OptionsElementExtras;
    prototype: HTMLElement & Options & OptionsElementExtras;
    observedAttributes: string[];
  };
}

/** Register an element under a tag name, unless something already has it. */
export function define(tag: string, element: CustomElementConstructor) {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, element);
}
