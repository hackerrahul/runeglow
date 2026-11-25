/* One melting item: its element stays interactive but invisible — the melt
   SVG is the painter. Auto-detects the image source from the first <img>
   descendant when `src` isn't given. */

import { Effects } from '../internal/effects'
import type { LiquidGroup } from './group'
import type { ImageMeltOptions } from './imageMelt'
import type { ItemDriver } from './mirrored'

export interface ImageMeltItemOptions {
  src?: string
  opts: Required<ImageMeltOptions>
}

/**
 * Drive a piece with effect="melt". Nothing registers with the engine: the
 * group's image-melt layer paints the pair. `content` gives the element
 * that melts: the wrapper's child, or the element itself where there is no
 * wrapper.
 */
export function imageMeltItem(
  group: LiquidGroup,
  content: () => HTMLElement | null,
  options: ImageMeltItemOptions,
): ItemDriver<ImageMeltItemOptions> {
  let o = options
  const fx = new Effects()
  /* by content: a tuning object made afresh that says the same is no reason to register again */
  const key = () => JSON.stringify(o.opts)

  fx.add(
    () => [content(), o.src, key()],
    () => {
      const target = content()
      if (!target) return
      const img = o.src ?? target.querySelector('img')?.src ?? (target as HTMLImageElement).src
      if (!img) {
        console.warn(
          '[runeglow/liquid-gooey] effect="melt" needs an image: pass melt={{ src }} or put an <img> inside the item.',
        )
        return
      }
      // The DOM element stays for layout + interaction; the SVG paints it.
      const prevOpacity = target.style.opacity
      target.style.opacity = '0'
      const unregister = group.imageMelt.register({ el: target, src: img, opts: o.opts })
      return () => {
        target.style.opacity = prevOpacity
        unregister()
      }
    },
  )

  fx.flush()

  return {
    update(next) {
      o = next
      fx.flush()
    },
    flush: () => fx.flush(),
    /* the opacity above is one property, written on the content, which no framework rewrites */
    restyle() {},
    destroy: () => fx.destroy(),
  }
}
