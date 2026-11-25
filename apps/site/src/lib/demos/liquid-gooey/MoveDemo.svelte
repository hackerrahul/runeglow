<script lang="ts">
	import { Liquid } from '@runeglow/svelte/liquid-gooey';
	import './demos.css';
	import { MOVE_DEFAULTS, groupProps, type GooeyTheme, type GroupTuning, type MoveKnobs } from './shared.ts';

	interface Props {
		group: GroupTuning;
		knobs?: MoveKnobs;
		theme?: GooeyTheme;
	}
	let { group, knobs = MOVE_DEFAULTS, theme = 'dark' }: Props = $props();

	/* The track spans 14 to 226; the 24px thumb travels 0 to 188 to stay
	   flush with its ends. */
	const MAX = 188;
	let x = $state(84);
	let grab: number | null = null;

	function down(e: PointerEvent & { currentTarget: HTMLElement }) {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			/* synthetic events have no active pointer */
		}
		grab = e.clientX - x;
	}
	function move(e: PointerEvent) {
		if (grab == null) return;
		x = Math.min(MAX, Math.max(0, e.clientX - grab));
	}
	function key(e: KeyboardEvent) {
		const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 12 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -12 : 0;
		if (!step) return;
		e.preventDefault();
		x = Math.min(MAX, Math.max(0, x + step));
	}
</script>

<Liquid {...groupProps(group, theme)} class="gd-sl">
	<div class="gd-sl-track" aria-hidden="true"></div>
	<Liquid.Item effect="move" move={knobs}>
		<div
			class="gd-sl-thumb"
			role="slider"
			aria-label="Demo slider"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round((x / MAX) * 100)}
			tabindex="0"
			style:transform="translateX({x}px)"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={() => (grab = null)}
			onpointercancel={() => (grab = null)}
			onkeydown={key}
		></div>
	</Liquid.Item>
</Liquid>
