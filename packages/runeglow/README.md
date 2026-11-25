# runeglow

High-craft UI effects for Svelte 5, in one package. A port of
[Libraries.dev](https://libraries.dev) by Jakub Antalik.

```bash
pnpm add runeglow
```

Each library has its own import path, so an app only bundles the one it uses. One of them,
`runeglow/img-fx`, also needs `three`: `pnpm add runeglow three`.

```svelte
<script>
  import { BorderBeam } from 'runeglow/border-beam';
</script>

<BorderBeam>
  <div class="card">Your content here</div>
</BorderBeam>
```

## Or copy one library in

If you would rather own the code than depend on the package, each library is also a
[shadcn-svelte](https://shadcn-svelte.com) registry item. This copies one library's source into
`src/lib/runeglow/` in your project:

```bash
npx shadcn-svelte@latest add https://runeglow.dev/r/border-beam.json
```

The names are the import paths below (`thinking-orbs`, `voice-ring`, …). A library that leans on
another brings it along: Voice ring also copies Voice and Thinking orbs. Copied files don't update
themselves; run the command again to pull a newer version.

| Import | Status |
| --- | --- |
| `runeglow/border-beam` | Ready |
| `runeglow/thinking-orbs` | Ready |
| `runeglow/bot-avatars` | Ready |
| `runeglow/liquid-gooey` | Ready |
| `runeglow/voice-glow` | Ready |
| `runeglow/voice-ring` | Ready |
| `runeglow/metal-fx` | Ready |
| `runeglow/img-fx` | Ready |
| `runeglow/distortion-waves` | Ready |

## Differences from the React libraries

The props keep their names. What changes is what Svelte spells differently:

- `className` is `class`, and `style` is a string.
- `children` is a snippet: put the content between the tags.
- A forwarded ref is the bindable `ref` prop: `bind:ref={el}`.
- DOM events are lowercase attributes (`onanimationend`).
- A React hook becomes a function you call while a component is set up, returning an object whose
  values are reactive: `const mic = useMicrophone()`, then `mic.stream`, `mic.state`.
- A prop that took a React ref takes the element itself: `directionBounds={el}` with `el` from
  `bind:this`.
- The voice libraries share one audio context and one `useMicrophone`, since they ship in one
  package: a stream opened for a voice glow can drive a voice ring.
- Liquid metal: `reflectionTargets` takes elements (`[chip]` or `[{ el: chip, strength: 0.6 }]`).
  `useMetalBend` and `useMetalTextReflection` take a function returning the element. `MetalText`
  and `MetalBadge` take their label as a `text` prop.
- Distortion waves: the two views and the overlay are snippets (`children`, `revealedContent`,
  `overlay`), and the ref handle becomes functions on the component: `wave.play()`,
  `wave.reverse()`, `wave.reset()`, `wave.prepare()`, `wave.getController()`.
- Image generation: the React ref handle becomes functions on the component. Bind it with
  `bind:this={card}` and call `card.triggerReveal()`, `card.triggerHide()`,
  `card.triggerRegenerate()` and `card.isImageActive()`. The wrapper element is `bind:ref`.
- Liquid metal: the `liquidMetal` shader is vendored at the version the React package pins, so there
  is no runtime dependency on `@paper-design/shaders`. It is Apache-2.0; see `NOTICE`.

## Additions

A few things here are not in the React libraries:

- Bot avatars: three extra types (`dot`, `planet`, `spark`) and `face="none"` for a bare body.
- Bot avatars: `RobotHead`, a 3D robot head with an LED face in six shapes and eleven states, beside
  `BotAvatar`. It is a port of [robot-heads](https://github.com/fayazara/robot-heads) by Fayaz Ahmed
  (MIT), with two more shapes (`capsule`, `octagon`), two more states (`waiting`, `success`), three
  finishes (`gloss`, `matte`, `metal`), round LEDs, ten colourways and a `pose` prop.
- Bot avatars: each avatar appears as soon as its own fur or plastic material is built, and one that
  is far off screen does not build its material until it is scrolled near. The React library holds
  every avatar back until the whole page is ready.
- Gooey: `Liquid.Item` is also exported on its own as `LiquidItem`.
- Distortion waves: the wave takes its picture of the views again when something outside them
  restyles them: a theme class or data attribute on an ancestor, or the system colour scheme. In
  the React library the next wave after a theme switch bends a picture in the old colours.
- Liquid metal: the metal comes back after every instance on a page has been removed and one is
  mounted again (leaving a route and returning). In the React library a late "context lost" event
  from the old renderer disables the new one.
- Liquid metal: `innerShadow`, `scale` and `glowMode` apply as soon as they change, and `MetalText`
  and `MetalBadge` accept `paused`. `attachMetalBend` and `attachMetalTextReflection` are the two
  hooks as plain functions.

## License

MIT. See `LICENSE` and `NOTICE`. Liquid metal includes a shader from Paper Shaders under the
Apache License 2.0, and the robot heads are ported from robot-heads under the MIT License; copies
of both licences are in `LICENSES/`.
