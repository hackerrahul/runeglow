# Runeglow

Animated UI effects for AI and product interfaces. Made by [Rahul Gangotri](https://x.com/rahul__gangotri).

**[runeglow.dev](https://runeglow.dev)**

Runeglow is a framework-free core with a thin package for each framework on top of it. Install the
one for yours:

| You use | Install | Import from |
| --- | --- | --- |
| Svelte 5 | `pnpm add @runeglow/svelte` | `@runeglow/svelte/bot-avatars` |
| React (Next.js, TanStack Start, Remix) | `pnpm add @runeglow/react` | `@runeglow/react/bot-avatars` |
| Vue 3 (Nuxt) | `pnpm add @runeglow/vue` | `@runeglow/vue/bot-avatars` |
| Anything else: Angular, Solid, Astro, plain HTML | `pnpm add @runeglow/elements` | `@runeglow/elements/bot-avatars` |
| No framework, from JavaScript | `pnpm add runeglow` | `runeglow/bot-avatars` |

```svelte
<script>
  import { RobotHead } from '@runeglow/svelte/bot-avatars';
</script>

<RobotHead state="thinking" />
```

```js
// React: the same component, the same props
import { RobotHead } from '@runeglow/react/bot-avatars';

// No framework
import { mountRobotHead } from 'runeglow/bot-avatars';
const head = mountRobotHead(document.querySelector('#agent'), { state: 'thinking' });
head.update({ state: 'success' });
```

```html
<!-- Custom elements, after importing '@runeglow/elements/bot-avatars' once -->
<runeglow-robot-head state="thinking" size="160"></runeglow-robot-head>
```

## What is in which package

All nine libraries are in every package, on the same import paths: `@runeglow/react/border-beam`,
`@runeglow/vue/border-beam`, `runeglow/border-beam` and so on.

| Library | Import | What it is |
| --- | --- | --- |
| [Border beam](https://runeglow.dev/border-beam) | `@runeglow/svelte/border-beam` | A glow that travels the edge of a card, button or input |
| [Thinking orbs](https://runeglow.dev/thinking-orbs) | `@runeglow/svelte/thinking-orbs` | Dotted loading indicators for AI interfaces |
| [Bot avatars](https://runeglow.dev/bot-avatars) | `@runeglow/svelte/bot-avatars` | Animated faces for AI agents: plush, plastic, flat, and robots with LED faces |
| [Gooey](https://runeglow.dev/liquid-gooey) | `@runeglow/svelte/liquid-gooey` | Elements that merge and split like liquid |
| [Voice](https://runeglow.dev/voice-glow) | `@runeglow/svelte/voice-glow` | A glow that rises with a voice |
| [Voice ring](https://runeglow.dev/voice-ring) | `@runeglow/svelte/voice-ring` | A ring of light that bends with a voice |
| [Liquid metal](https://runeglow.dev/metal-fx) | `@runeglow/svelte/metal-fx` | A liquid metal ring, metal text and a metal badge |
| [Image generation](https://runeglow.dev/img-fx) | `@runeglow/svelte/img-fx` | A mosaic loader that resolves into an image |
| [Distortion waves](https://runeglow.dev/distortion-waves) | `@runeglow/svelte/distortion-waves` | A wave that carries one view into another |

Each library has its own import path, so an app only bundles the ones it uses. Image generation
also needs `three`.

In a Svelte project you can also copy a single library's source in with the shadcn-svelte CLI. See
the [installation guide](https://runeglow.dev/install).

## This repository

- `packages/runeglow`: the core, published as `runeglow`. Plain TypeScript, no framework: the
  engines, and a `mount…()` function for each component.
- `packages/svelte`, `packages/react`, `packages/vue`, `packages/elements`: the adapters, published
  as `@runeglow/svelte` and so on. Each renders the elements its framework's way and hands them to
  the core.
- `apps/site`: the documentation site and playgrounds.
- `apps/sandbox`: a page for each of React, Vue, custom elements and no framework, for checking the
  adapters by eye.

```bash
pnpm install
pnpm dev          # the site, on the packages' source
pnpm sandbox      # the sandbox, on the packages' source
pnpm check        # type-check everything
pnpm build        # the packages, the registry and the site
```

## Credits

Runeglow is a Svelte 5 port of [Libraries.dev](https://libraries.dev) by Jakub Antalik
([source](https://github.com/Jakubantalik/Libraries.dev), MIT). The effect engines are his code;
the Svelte components around them and this site are new. Liquid metal's shader is from
[Paper Shaders](https://github.com/paper-design/shaders), under the Apache License 2.0. The robot
heads in Bot avatars are a port of [robot-heads](https://github.com/fayazara/robot-heads) by Fayaz
Ahmed (MIT). See `NOTICE`.

## License

MIT. See `LICENSE` and `NOTICE`.
