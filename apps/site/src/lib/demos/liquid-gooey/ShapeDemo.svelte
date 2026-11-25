<script lang="ts">
	import { Liquid } from '@runeglow/svelte/liquid-gooey';
	import './demos.css';
	import { SHAPE_DEFAULTS, groupProps, inkFor, type GooeyTheme, type GroupTuning, type ShapeKnobs } from './shared.ts';

	interface Props {
		group: GroupTuning;
		knobs?: ShapeKnobs;
		theme?: GooeyTheme;
	}
	let { group, knobs = SHAPE_DEFAULTS, theme = 'dark' }: Props = $props();

	let open = $state(false);
</script>

<Liquid {...groupProps(group, theme)} class="gd-sh" style="--gd-ink: {inkFor(group.fill)};">
	<!-- The element snaps between its two sizes; the liquid is what travels. -->
	<Liquid.Item morph={{ shape: true, speed: knobs.speed, bounce: knobs.bounce, contentBlur: knobs.contentBlur }}>
		<button type="button" class={['gd-sh-body', open && 'open']} aria-expanded={open} onclick={() => (open = !open)}>
			<span class="gd-sh-row">
				{open ? 'Deploy preview' : 'Details'}
				<svg class="gd-sh-chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
					<path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</span>
			{#if open}
				<small>Built in 14 seconds from the main branch. Click again to close.</small>
			{/if}
		</button>
	</Liquid.Item>
</Liquid>
