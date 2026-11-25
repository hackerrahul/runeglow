<!--
  @component
  BotAvatar - an animated face for an AI agent, drawn on a canvas.

  @example
  ```svelte
  <BotAvatar type="clover" state="working" />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { attachBotAvatar, botAvatarView, type BotAvatarHandle, type BotAvatarOptions } from 'runeglow/bot-avatars';
  import { styleText } from 'runeglow/kit';
  import type { BotAvatarProps } from './types';

  // The prop is called `state`, as in every framework; it is renamed on the
  // way in because a local of that name would shadow the `$state` rune.
  let {
    type, path, face, state: botState, size, color, ink, brightness, saturation,
    speed, paused, seed, shading, hat, glasses, headphones, bowTie, accessoryColor,
    shadow, highlight, depth, roundness,
    furLength, furDensity, furFuzz, furClumps, furCurl, furGravity,
    light, rim, spread, backLight, lightFront, shine, sheen, backSoftness,
    pose, interactive, turn, theme,
    whirl, whirlSize, whirlWidth, whirlLength, whirlTilt,
    jumpHeight, jumpTime, jumpStretch, jumpSpin, jumpLean, jumpEvery, jumpLand,
    jumpSquash, jumpSquashTime, jumpSquashEase, jumpGroundTime, jumpGroundEase,
    jumpRiseTime, jumpRiseEase, jumpClickSquashTime,
    class: className,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    ...rest
  }: BotAvatarProps = $props();

  /* what the avatar is told, as the core takes it; the defaults are the core's */
  const options = $derived<BotAvatarOptions>({
    type, path, face, state: botState, size, color, ink, brightness, saturation,
    speed, paused, seed, shading, hat, glasses, headphones, bowTie, accessoryColor,
    shadow, highlight, depth, roundness,
    furLength, furDensity, furFuzz, furClumps, furCurl, furGravity,
    light, rim, spread, backLight, lightFront, shine, sheen, backSoftness,
    pose, interactive, turn, theme,
    whirl, whirlSize, whirlWidth, whirlLength, whirlTilt,
    jumpHeight, jumpTime, jumpStretch, jumpSpin, jumpLean, jumpEvery, jumpLand,
    jumpSquash, jumpSquashTime, jumpSquashEase, jumpGroundTime, jumpGroundEase,
    jumpRiseTime, jumpRiseEase, jumpClickSquashTime,
  });

  /* a fabric or plastic avatar is transparent until its material is made */
  let shown = $state(false);
  const view = $derived(botAvatarView(options, shown));

  /* the core does the drawing and the motion, on the canvas below */
  let avatar: BotAvatarHandle | null = null;
  $effect(() => {
    if (!ref) return;
    avatar = attachBotAvatar(ref, untrack(() => options), { onshown: () => (shown = true) });
    return () => {
      avatar?.destroy();
      avatar = null;
    };
  });
  $effect(() => {
    avatar?.update(options);
  });
</script>

<canvas
  bind:this={ref}
  class={['ba', className]}
  data-bot-avatar={view.type}
  data-face={view.face}
  data-state={view.state}
  role="img"
  aria-label={ariaLabel ?? view.label}
  style="{styleText(view.style)}{style ? ` ${style}` : ''}"
  {...rest}
></canvas>
