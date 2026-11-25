# @runeglow/react

[Runeglow](https://runeglow.dev) for React: animated UI effects for AI and product interfaces.

```bash
pnpm add @runeglow/react
```

```jsx
import { BotAvatar, RobotHead } from '@runeglow/react/bot-avatars';

export function Agent({ status }) {
  return <RobotHead state={status} size={120} />;
}
```

React 18 or newer. The components are client components (`'use client'`) that render their markup
on the server and start animating in the browser, which is what Next.js, TanStack Start and Remix
ask of a component. `className`, `style`,
`aria-label`, `onClick` and other attributes are forwarded to the element, and a `ref` reaches the
canvas.

The options are the same in every framework; each library's page in the
[docs](https://runeglow.dev) lists them.

## What is here

All nine libraries, each on its own import path, so an app only bundles the ones it uses.

| Library | Import | Components and hooks |
| --- | --- | --- |
| Border beam | `@runeglow/react/border-beam` | `BorderBeam` |
| Thinking orbs | `@runeglow/react/thinking-orbs` | `ThinkingOrb` |
| Bot avatars | `@runeglow/react/bot-avatars` | `BotAvatar`, `RobotHead` |
| Gooey | `@runeglow/react/liquid-gooey` | `Liquid`, `LiquidItem` |
| Voice | `@runeglow/react/voice-glow` | `VoiceBeam`, `useMicrophone` |
| Voice ring | `@runeglow/react/voice-ring` | `VoiceRing`, `VoiceOrb` |
| Liquid metal | `@runeglow/react/metal-fx` | `MetalFx`, `MetalText`, `MetalBadge`, `useMetalBend`, `useMetalTextReflection` |
| Image generation | `@runeglow/react/img-fx` | `ImageGeneration` |
| Distortion waves | `@runeglow/react/distortion-waves` | `DistortionWave` |

Image generation also needs `three` installed.

## How it works

The drawing and the motion are in [`runeglow`](https://www.npmjs.com/package/runeglow), the
framework-free core, which this package depends on. This package renders the elements and hands
them to it.

## License

MIT. See `LICENSE`, and the core's `NOTICE` for the code it is built from.
