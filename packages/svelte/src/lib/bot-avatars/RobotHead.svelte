<!--
  @component
  RobotHead - a TV-headed robot for an AI agent: a moulded shell with knob
  ears and an antenna, and an LED matrix for a face that shows what the
  agent is doing. Drawn on a 2D canvas.

  The element is a `size` × `size` box with the robot at rest centred in
  it. Its canvas reaches past the box, so hops, the antenna's glow and the
  floor's shadow draw outside it without taking part in layout.

  @example
  ```svelte
  <RobotHead state="thinking" size={160} />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { attachRobotHead, robotHeadView, type RobotHeadHandle, type RobotHeadOptions } from 'runeglow/bot-avatars';
  import { styleText } from 'runeglow/kit';
  import type { RobotHeadProps } from './types';

  // The prop is called `state`, as in every framework; it is renamed on the
  // way in because a local of that name would shadow the `$state` rune.
  let {
    shape,
    state: headState,
    size,
    colorway,
    color,
    trimColor,
    screenColor,
    finish,
    pixels,
    speed,
    paused,
    interactive,
    antenna,
    floorShadow,
    seed,
    pose,
    class: className,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    ...rest
  }: RobotHeadProps = $props();

  /* what the head is told, as the core takes it; the defaults are the core's */
  const options = $derived<RobotHeadOptions>({
    shape, state: headState, size, colorway, color, trimColor, screenColor, finish, pixels,
    speed, paused, interactive, antenna, floorShadow, seed, pose,
  });

  let box = $state<HTMLSpanElement | null>(null);
  /* the head has drawn its first frame: until then the canvas is transparent */
  let shown = $state(false);
  const view = $derived(robotHeadView(options, shown));

  /* the core does the drawing and the motion, on the two elements below */
  let head: RobotHeadHandle | null = null;
  $effect(() => {
    if (!box || !ref) return;
    head = attachRobotHead(box, ref, untrack(() => options), { onshown: () => (shown = true) });
    return () => {
      head?.destroy();
      head = null;
    };
  });
  $effect(() => {
    head?.update(options);
  });
</script>

<span
  bind:this={box}
  class={['rh', className]}
  data-robot-head={view.shape}
  data-state={view.state}
  role="img"
  aria-label={ariaLabel ?? view.label}
  style="{styleText(view.box)}{style ? ` ${style}` : ''}"
  {...rest}
>
  <canvas bind:this={ref} aria-hidden="true" style={styleText(view.canvas)}></canvas>
</span>
