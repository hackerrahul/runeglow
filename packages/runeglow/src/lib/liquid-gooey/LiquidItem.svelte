<!--
  @component
  One piece of a liquid group. Wrap an element in it and the group draws
  that element's share of the merged surface.

  @example
  ```svelte
  <Liquid.Item effect="move"><div class="thumb"></div></Liquid.Item>
  ```
-->
<script lang="ts">
  import { getGooeyContext } from './context'
  import GooeyItem from './GooeyItem.svelte'
  import ImageMeltItem from './ImageMeltItem.svelte'
  import { IMAGE_MELT_DEFAULTS } from './imageMelt'
  import { mapBend, mapDissolve, mapMorphSprings, mapMove } from './mapping'
  import type { LiquidItemProps } from './types'

  // The prop is called `effect`, as in the React library; it is renamed on
  // the way in because a local of that name would shadow the `$effect` rune.
  let {
    effect: kind = 'morph',
    morph,
    move,
    bend,
    melt,
    dissolve,
    observe,
    children,
    ...rest
  }: LiquidItemProps = $props()

  const ctx = getGooeyContext()

  /* The melt item is architecturally different: nothing registers with the
     engine — the group's image-melt layer paints the pair. */
  const meltSrc = $derived(melt?.src)
  const meltOpts = $derived.by(() => {
    const { src: _src, ...tuning } = melt ?? {}
    return { ...IMAGE_MELT_DEFAULTS, ...tuning }
  })

  const bendOpts = $derived(mapBend(bend))
  const moveOpts = $derived(mapMove(move))

  const wantsDissolve = $derived(dissolve !== undefined && dissolve !== false)

  // `dissolve` is positioned as orthogonal to `effect`, but the melt is drawn
  // from the element's MEASURED rect while move's liquid deliberately lags on
  // a spring — the melt would sit on the element with the surface trailing
  // behind it. Refuse loudly rather than ship the mismatch.
  $effect(() => {
    if (kind === 'move' && wantsDissolve) {
      console.warn(
        '[runeglow/liquid-gooey] `dissolve` is ignored with effect="move": the melt ' +
          'follows the element while the liquid lags on its spring, so the two ' +
          'would visibly disagree. Use it on a morph item.',
      )
    }
  })

  const shape = $derived(!!morph?.shape)
  const contactBlur = $derived(
    wantsDissolve
      ? typeof dissolve === 'object'
        ? { ...mapDissolve(true), ...dissolve }
        : mapDissolve(dissolve as boolean | number)
      : undefined,
  )
  const evolve = $derived(shape ? { ...mapMorphSprings(morph), ...morph?.advanced?.evolve } : undefined)
</script>

{#if kind === 'melt'}
  <ImageMeltItem src={meltSrc} opts={meltOpts} registry={ctx.imageMelt} {children} />
{:else if kind === 'bend'}
  <GooeyItem {...rest} observe effect="move" move={bendOpts} {children} />
{:else if kind === 'move'}
  <GooeyItem {...rest} observe effect="move" move={moveOpts} {children} />
{:else}
  <GooeyItem
    {...rest}
    observe={observe || shape || !!contactBlur || undefined}
    effect={shape ? 'evolve' : undefined}
    {evolve}
    {contactBlur}
    blobInset={morph?.advanced?.blobInset}
    bridgeGrow={morph?.advanced?.bridgeGrow}
    {children}
  />
{/if}
