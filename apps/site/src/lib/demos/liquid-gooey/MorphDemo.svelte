<script lang="ts">
	import { Liquid } from '@runeglow/svelte/liquid-gooey';
	import './demos.css';
	import { EASES, MORPH_DEFAULTS, groupProps, inkFor, type GooeyTheme, type GroupTuning, type MorphKnobs } from './shared.ts';

	interface Props {
		group: GroupTuning;
		knobs?: MorphKnobs;
		theme?: GooeyTheme;
	}
	let { group, knobs = MORPH_DEFAULTS, theme = 'dark' }: Props = $props();

	const SATELLITES = [
		{ label: 'New file', x: -54, y: -34, d: 'M9 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6zM9 1.5V6h4.5' },
		{ label: 'Add image', x: 0, y: -64, d: 'M3.5 1.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM5.5 4.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM14.5 10.5 11 7l-7.5 7.5' },
		{ label: 'New folder', x: 54, y: -34, d: 'M14.5 12.5A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h3L7.5 4H13a1.5 1.5 0 0 1 1.5 1.5z' }
	];

	let open = $state(false);
	let anticipating = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(timer));

	function toggle() {
		/* Closing plays the anticipation nudge: the liquid dips toward the
		   returning satellites and settles back. */
		if (open && knobs.anticipDist > 0) {
			clearTimeout(timer);
			anticipating = false;
			requestAnimationFrame(() => (anticipating = true));
			timer = setTimeout(() => (anticipating = false), knobs.anticipDur);
		}
		open = !open;
	}

	const phase = $derived(
		open
			? { dur: knobs.openDur, ease: EASES[knobs.openEase], stagger: knobs.openStagger }
			: { dur: knobs.closeDur, ease: EASES.Snappy, stagger: knobs.closeStagger }
	);
</script>

<Liquid
	{...groupProps(group, theme)}
	class={['gd-pm', open && 'gd-pm-open', anticipating && 'gd-pm-anticipating']}
	style="--gd-anticip: {knobs.anticipDist}px; --gd-anticip-dur: {knobs.anticipDur}ms; --gd-icon-dur: {knobs.iconDur}ms; --gd-ink: {inkFor(group.fill)};"
>
	{#each SATELLITES as s, i (s.label)}
		<Liquid.Item
			class="gd-pm-slot"
			x={open ? s.x * knobs.spread : 0}
			y={open ? s.y * knobs.spread : 0}
			transition={{ duration: phase.dur, ease: phase.ease }}
			delay={i * phase.stagger}
		>
			<button type="button" class="gd-pm-btn gd-pm-sat" aria-label={s.label} tabindex={open ? 0 : -1} onclick={toggle}>
				<span class="gd-pm-icon" style:transition-delay={open ? `${knobs.iconDelay + i * phase.stagger}ms` : '0ms'}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d={s.d} />
					</svg>
				</span>
			</button>
		</Liquid.Item>
	{/each}
	<Liquid.Item class="gd-pm-slot">
		<button type="button" class="gd-pm-btn gd-pm-main" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onclick={toggle}>
			<span class="gd-pm-plus">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
					<path d="M10 4V16M4 10H16" />
				</svg>
			</span>
		</button>
	</Liquid.Item>
</Liquid>
