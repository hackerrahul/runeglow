# @runeglow/elements

[Runeglow](https://runeglow.dev) for everything else: animated UI effects for AI and product interfaces.

```bash
pnpm add @runeglow/elements
```

```html
<script type="module">
  import '@runeglow/elements/bot-avatars';
</script>

<runeglow-bot-avatar type="cat" state="working"></runeglow-bot-avatar>
<runeglow-robot-head state="thinking" size="160" floor-shadow="false"></runeglow-robot-head>
```

Custom elements: HTML tags that work in Angular, Solid, Astro, a server-rendered page, or plain
HTML. Importing the file registers them. Every option is an attribute, in HTML's spelling
(`floor-shadow`), and a property, in JavaScript's (`el.floorShadow = false`). `label` sets the
accessible name and `el.poke()` does what a click does. Each element draws in its own shadow root
and lays out like an image.

The options are the same in every framework; each library's page in the
[docs](https://runeglow.dev) lists them.

## What is here

All nine libraries, each on its own import path, so an app only bundles the ones it uses.

| Library | Import | Tags |
| --- | --- | --- |
| Border beam | `@runeglow/elements/border-beam` | `<runeglow-border-beam>` |
| Thinking orbs | `@runeglow/elements/thinking-orbs` | `<runeglow-thinking-orb>` |
| Bot avatars | `@runeglow/elements/bot-avatars` | `<runeglow-bot-avatar>`, `<runeglow-robot-head>` |
| Gooey | `@runeglow/elements/liquid-gooey` | `<runeglow-liquid>`, `<runeglow-liquid-item>` |
| Voice | `@runeglow/elements/voice-glow` | `<runeglow-voice-beam>` |
| Voice ring | `@runeglow/elements/voice-ring` | `<runeglow-voice-ring>`, `<runeglow-voice-orb>` |
| Liquid metal | `@runeglow/elements/metal-fx` | `<runeglow-metal-fx>`, `<runeglow-metal-text>`, `<runeglow-metal-badge>` |
| Image generation | `@runeglow/elements/img-fx` | `<runeglow-image-generation>` |
| Distortion waves | `@runeglow/elements/distortion-waves` | `<runeglow-distortion-wave>` |

Image generation also needs `three` installed.

## How it works

The drawing and the motion are in [`runeglow`](https://www.npmjs.com/package/runeglow), the
framework-free core, which this package depends on. This package renders the elements and hands
them to it.

## License

MIT. See `LICENSE`, and the core's `NOTICE` for the code it is built from.
