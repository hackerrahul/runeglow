# runeglow

The framework-free core of [Runeglow](https://runeglow.dev): animated UI effects for AI and product
interfaces, in plain TypeScript with no dependencies.

Use this package on a page with no framework. With one, install its adapter instead; it brings this
package along: `@runeglow/svelte`, `@runeglow/react`, `@runeglow/vue`, or `@runeglow/elements` for
custom elements that work anywhere.

```bash
pnpm add runeglow
```

```js
import { mountBotAvatar, mountRobotHead } from 'runeglow/bot-avatars';

const bot = mountBotAvatar(document.querySelector('#agent'), { type: 'cat', size: 64 });
const head = mountRobotHead(document.querySelector('#agent'), { state: 'thinking' });

// change some options, keeping the rest
head.update({ state: 'success' });

// stop it and take its elements out of the page
head.destroy();
```

`mount…()` makes the elements, keeps them in step with the options, and returns `element`,
`update()` and `destroy()`, plus the component's own methods. The options are the same in every
framework; each library's page in the [docs](https://runeglow.dev) lists them.

## What is here

All nine libraries, each on its own import path.

| Library | Import | Functions |
| --- | --- | --- |
| Border beam | `runeglow/border-beam` | `attachBorderBeam`, `mountBorderBeam` |
| Thinking orbs | `runeglow/thinking-orbs` | `mountThinkingOrb` |
| Bot avatars | `runeglow/bot-avatars` | `mountBotAvatar`, `mountRobotHead` |
| Gooey | `runeglow/liquid-gooey` | `mountLiquid`, `mountLiquidItem` |
| Voice | `runeglow/voice-glow` | `mountVoiceBeam`, `createMicrophone` |
| Voice ring | `runeglow/voice-ring` | `mountVoiceRing`, `mountVoiceOrb` |
| Liquid metal | `runeglow/metal-fx` | `mountMetalFx`, `mountMetalText`, `mountMetalBadge` |
| Image generation | `runeglow/img-fx` | `attachImageGeneration`, `mountImageGeneration` |
| Distortion waves | `runeglow/distortion-waves` | `mountDistortionWave` |

A component that wraps your content (a beam round a card, metal round a button) attaches to an
element your page already has; one that draws itself is mounted into a parent. Image generation
also needs `three` installed.

## For adapter authors

Each component also comes as two smaller pieces, which is what the framework packages use:

- `…View(options, …)`: what the elements look like, as plain data (inline styles, attributes, the
  accessible name). Pure, so it runs on a server.
- `attach…(elements, options, hooks)`: brings elements you rendered yourself to life, and returns
  `update()`, `destroy()` and the component's methods.

`runeglow/kit` has the few helpers the adapters share.

## Coming from runeglow 0.2

Up to 0.2 this package was the Svelte library. That is now `@runeglow/svelte`, with the same
components and props: change `runeglow/…` in your imports to `@runeglow/svelte/…`.

## License

MIT. See `LICENSE` and `NOTICE`. The engines are from [Libraries.dev](https://libraries.dev) by
Jakub Antalik (MIT). Liquid metal includes a shader from
[Paper Shaders](https://github.com/paper-design/shaders) under the Apache License 2.0, and the robot
heads are ported from [robot-heads](https://github.com/fayazara/robot-heads) by Fayaz Ahmed (MIT);
copies of both licences are in `LICENSES/`.
