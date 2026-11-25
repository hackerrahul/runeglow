# Runeglow

Nine animated UI effects for Svelte 5, in one package. Made by [Rahul Gangotri](https://x.com/rahul__gangotri).

**[runeglow.dev](https://runeglow.dev)** · [npm](https://www.npmjs.com/package/runeglow)

```bash
pnpm add runeglow
```

```svelte
<script>
  import { BorderBeam } from 'runeglow/border-beam';
</script>

<BorderBeam>
  <div class="card">Your content here</div>
</BorderBeam>
```

| Library | Import | What it is |
| --- | --- | --- |
| [Border beam](https://runeglow.dev/border-beam) | `runeglow/border-beam` | A glow that travels the edge of a card, button or input |
| [Thinking orbs](https://runeglow.dev/thinking-orbs) | `runeglow/thinking-orbs` | Dotted loading indicators for AI interfaces |
| [Bot avatars](https://runeglow.dev/bot-avatars) | `runeglow/bot-avatars` | Animated faces for AI agents: plush, plastic, flat, and robots with LED faces |
| [Gooey](https://runeglow.dev/liquid-gooey) | `runeglow/liquid-gooey` | Elements that merge and split like liquid |
| [Voice](https://runeglow.dev/voice-glow) | `runeglow/voice-glow` | A glow that rises with a voice |
| [Voice ring](https://runeglow.dev/voice-ring) | `runeglow/voice-ring` | A ring of light that bends with a voice |
| [Liquid metal](https://runeglow.dev/metal-fx) | `runeglow/metal-fx` | A liquid metal ring, metal text and a metal badge |
| [Image generation](https://runeglow.dev/img-fx) | `runeglow/img-fx` | A mosaic loader that resolves into an image |
| [Distortion waves](https://runeglow.dev/distortion-waves) | `runeglow/distortion-waves` | A wave that carries one view into another |

Each library has its own import path, so an app only bundles the ones it uses. Image generation
also needs `three`.

You can also copy a single library's source into your project with the shadcn-svelte CLI. See the
[installation guide](https://runeglow.dev/install).

## This repository

- `packages/runeglow`: the library, published to npm as `runeglow`.
- `apps/site`: the documentation site and playgrounds.

```bash
pnpm install
pnpm dev          # the site, on the library's source
pnpm check        # type-check both
pnpm build        # the library, the registry and the site
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
