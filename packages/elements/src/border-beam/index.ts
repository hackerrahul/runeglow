/* The border beam as an HTML tag. Importing this file registers it:

     <runeglow-border-beam size="md" color-variant="ocean">
       <div class="card">…</div>
     </runeglow-border-beam>

   The element is the beam's wrapper, and its children are the content, in
   the page's own DOM: there is no shadow root. The beam's rules animate
   custom properties registered with `@property`, which browsers only take
   from the document's own stylesheets, and they are written against
   `[data-beam]` on the wrapper, which page CSS (and the `css` option)
   should still reach. So the element carries `data-beam` itself, its rules
   go in the document's head, shared by every beam with the same options,
   and one `<div data-beam-bloom>` is kept as its last child.

   Every option is an attribute and a property; see `hostElement`. The end
   of a fade is told by an `activate` or a `deactivate` event. */

import { attachBorderBeam, borderBeamOptionKinds, type BorderBeamHandle, type BorderBeamOptions } from 'runeglow/border-beam';
import { baseRule, hostElement } from '../internal/border-beam.js';
import { define } from '../internal/element.js';

/** `<runeglow-border-beam>`: an animated beam of light round its children. */
export const BorderBeamElement = hostElement<BorderBeamOptions, BorderBeamHandle>(borderBeamOptionKinds, (host, options) => {
  /* a block, as the wrapper is in the frameworks, unless the page says otherwise */
  baseRule(host, ':where(runeglow-border-beam){display:block}:where(runeglow-border-beam[hidden]){display:none}');
  return attachBorderBeam(host, options, {
    onActivate: () => host.dispatchEvent(new CustomEvent('activate')),
    onDeactivate: () => host.dispatchEvent(new CustomEvent('deactivate')),
  });
});
export type BorderBeamElement = InstanceType<typeof BorderBeamElement>;

define('runeglow-border-beam', BorderBeamElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-border-beam': BorderBeamElement;
  }
}

/* The presets, the option types and the beam itself are the core's, the
   same in every framework. */
export * from 'runeglow/border-beam';
