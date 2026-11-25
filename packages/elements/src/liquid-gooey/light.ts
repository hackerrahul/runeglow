import { attributeName, parseOption, type OptionKind, type OptionKinds } from 'runeglow/kit';

/* what a connected element keeps running, whichever component it is */
export interface Live<Options> {
  /** The whole option set, each time one of them changes. */
  update(options: Options): void;
  destroy(): void;
}

/* where there is no DOM (a server rendering the page), the classes below
   still have to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/* An option that takes a record may take other things too (a preset's name,
   `true`, a number): text that is not JSON stands for itself, and an
   attribute with no value for `true`. */
const parse = (kind: OptionKind, text: string | null): unknown => {
  const value = parseOption(kind, text);
  return value === undefined && kind === 'object' && text !== null ? text.trim() === '' || text : value;
};

/**
 * A custom element that works on its own children, in the page's own DOM:
 * no shadow root, because the liquid is drawn behind and between the
 * elements the page put inside. Every option is an attribute, in HTML's
 * spelling, and a property, in JavaScript's; whichever was set last wins.
 * An option named like something every element already has (`blur()`) is an
 * attribute only, so the element keeps what it had.
 */
export function lightElement<Options extends object>(
  kinds: OptionKinds<Options>,
  connect: (element: HTMLElement, options: Options) => Live<Options> | null,
) {
  const keys = Object.keys(kinds) as (keyof Options & string)[];
  const byAttribute = new Map<string, keyof Options & string>(keys.map((key) => [attributeName(key), key]));
  const properties = keys.filter((key) => !(key in Base.prototype));

  class LightElement extends Base {
    static observedAttributes = [...byAttribute.keys()];

    /* the options as last set, and the component while the element is in a page */
    private options: Record<string, unknown> = {};
    private live: Live<Options> | null = null;

    connectedCallback() {
      /* a property set before the element was defined sits on the instance,
         in front of the accessor: take it through the accessor instead */
      const own = this as unknown as Record<string, unknown>;
      for (const key of properties) {
        if (Object.prototype.hasOwnProperty.call(this, key)) {
          const value = own[key];
          delete own[key];
          own[key] = value;
        }
      }
      this.live = connect(this, this.options as Options);
    }

    disconnectedCallback() {
      this.live?.destroy();
      this.live = null;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const key = byAttribute.get(name);
      if (key) this.setOption(key, parse(kinds[key], value));
    }

    getOption(key: string): unknown {
      return this.options[key];
    }

    setOption(key: string, value: unknown) {
      if (Object.is(this.options[key], value)) return;
      this.options = { ...this.options, [key]: value };
      this.live?.update(this.options as Options);
    }
  }

  for (const key of properties) {
    Object.defineProperty(LightElement.prototype, key, {
      configurable: true,
      enumerable: true,
      get(this: LightElement) {
        return this.getOption(key);
      },
      set(this: LightElement, value: unknown) {
        this.setOption(key, value ?? undefined);
      },
    });
  }

  return LightElement as unknown as {
    new (): HTMLElement & Omit<Options, keyof HTMLElement>;
    prototype: HTMLElement & Omit<Options, keyof HTMLElement>;
    observedAttributes: string[];
  };
}

/* The elements have no shadow root to carry their own styles, so the few
   they need are given to whatever they are connected in: the page, or
   somebody else's shadow root. `:where()` weighs nothing, so any rule the
   page writes for the same element wins. */
const sheets = new WeakMap<Document, CSSStyleSheet>();
const styled = new WeakSet<Node>();
export function styleRootOf(element: Element, css: string) {
  const root = element.getRootNode() as Document | ShadowRoot;
  if (styled.has(root) || !('host' in root || 'head' in root)) return;
  styled.add(root);
  const doc = element.ownerDocument;
  const Sheet = doc.defaultView?.CSSStyleSheet;
  if (Sheet && 'adoptedStyleSheets' in root && 'replaceSync' in Sheet.prototype) {
    let sheet = sheets.get(doc);
    if (!sheet) {
      sheet = new Sheet();
      sheet.replaceSync(css);
      sheets.set(doc, sheet);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return;
  }
  const style = doc.createElement('style');
  style.textContent = css;
  ('head' in root ? root.head : root).appendChild(style);
}
