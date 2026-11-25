/** Singleton CSS injection — one <style> tag per page, no matter how many
 *  <ImageGeneration> instances are mounted. */

const STYLE_ID = 'img-fx-styles';

const CSS = /* css */ `
.image-gen-root {
  position: relative;
  display: inline-block;
  isolation: isolate;
  overflow: hidden;
  vertical-align: top;
  line-height: 0;
  flex: 0 0 auto;
}

.image-gen-root > .image-gen-shader,
.image-gen-root > .image-gen-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
  display: block;
}

.image-gen-root > .image-gen-shader {
  z-index: 1;
}

.image-gen-root > .image-gen-overlay {
  z-index: 2;
}

.image-gen-root > .image-gen-child {
  position: relative;
  z-index: 0;
  display: block;
  line-height: normal;
}
`;

let injected = false;

/* A shadow root does not see the page's stylesheet, so a card inside one
   needs the rules there as well: one sheet, made once and adopted by every
   such root, or a <style> in each where a sheet cannot be shared that way. */
let sheet: CSSStyleSheet | null = null;
const adopted = new WeakSet<ShadowRoot>();

function adopt(root: ShadowRoot): void {
  if (adopted.has(root)) return;
  adopted.add(root);
  /* a constructed sheet belongs to the document it was made in */
  if (root.ownerDocument === document && 'adoptedStyleSheets' in root && typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return;
  }
  const styleEl = root.ownerDocument.createElement('style');
  styleEl.textContent = CSS;
  root.appendChild(styleEl);
}

/**
 * Make sure the card's rules are where `root` can see them: the page (the
 * default), or the shadow root a card lives in.
 */
export function ensureStylesInjected(root?: Document | ShadowRoot): void {
  if (typeof document === 'undefined') return;
  if (root && root !== document) {
    if (typeof ShadowRoot === 'function' && root instanceof ShadowRoot) {
      adopt(root);
      return;
    }
    /* another document (a frame's): its own tag, found again by its id */
    const other = root as Document;
    if (other.getElementById(STYLE_ID)) return;
    const el = other.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    other.head.appendChild(el);
    return;
  }
  if (injected) return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
  injected = true;
}
