# @runeglow/vue

[Runeglow](https://runeglow.dev) for Vue: animated UI effects for AI and product interfaces.

```bash
pnpm add @runeglow/vue
```

```vue
<script setup>
import { BotAvatar, RobotHead } from '@runeglow/vue/bot-avatars';

defineProps({ status: String });
</script>

<template>
  <RobotHead :state="status" :size="120" />
</template>
```

Vue 3.3 or newer. The components render their markup on the server and start animating in the
browser, which is what Nuxt asks of a component. `class`, `style`,
`aria-label`, `@click` and other attributes fall through to the element, and a template ref gives
the element and a `poke()` method.

The options are the same in every framework; each library's page in the
[docs](https://runeglow.dev) lists them.

## What is here

All nine libraries, each on its own import path, so an app only bundles the ones it uses.

| Library | Import | Components and composables |
| --- | --- | --- |
| Border beam | `@runeglow/vue/border-beam` | `BorderBeam` |
| Thinking orbs | `@runeglow/vue/thinking-orbs` | `ThinkingOrb` |
| Bot avatars | `@runeglow/vue/bot-avatars` | `BotAvatar`, `RobotHead` |
| Gooey | `@runeglow/vue/liquid-gooey` | `Liquid`, `LiquidItem` |
| Voice | `@runeglow/vue/voice-glow` | `VoiceBeam`, `useMicrophone` |
| Voice ring | `@runeglow/vue/voice-ring` | `VoiceRing`, `VoiceOrb` |
| Liquid metal | `@runeglow/vue/metal-fx` | `MetalFx`, `MetalText`, `MetalBadge`, `useMetalBend`, `useMetalTextReflection` |
| Image generation | `@runeglow/vue/img-fx` | `ImageGeneration` |
| Distortion waves | `@runeglow/vue/distortion-waves` | `DistortionWave` |

Image generation also needs `three` installed.

## How it works

The drawing and the motion are in [`runeglow`](https://www.npmjs.com/package/runeglow), the
framework-free core, which this package depends on. This package renders the elements and hands
them to it.

## License

MIT. See `LICENSE`, and the core's `NOTICE` for the code it is built from.
