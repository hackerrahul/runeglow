<script lang="ts">
	import { Liquid } from 'runeglow/liquid-gooey';
	import './demos.css';
	import { DISSOLVE_DEFAULTS, groupProps, type DissolveKnobs, type GooeyTheme, type GroupTuning } from './shared.ts';

	interface Props {
		group: GroupTuning;
		knobs?: DissolveKnobs;
		theme?: GooeyTheme;
	}
	let { group, knobs = DISSOLVE_DEFAULTS, theme = 'dark' }: Props = $props();

	const IMAGES = ['/images/melt-a.jpg', '/images/melt-b.jpg'];
	/* Stage is 320 by 210; cards are 96px squares anchored at its centre. */
	const CLAMP_X = 160 - 48 - 6;
	const CLAMP_Y = 105 - 48 - 6;

	let pos = $state([
		{ x: -62, y: 0 },
		{ x: 62, y: 0 }
	]);
	let drag: { id: number; index: number; dx: number; dy: number } | null = null;

	function down(index: number, e: PointerEvent & { currentTarget: HTMLElement }) {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			/* synthetic events have no active pointer */
		}
		drag = { id: e.pointerId, index, dx: e.clientX - pos[index].x, dy: e.clientY - pos[index].y };
	}
	function move(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		pos[drag.index] = {
			x: Math.max(-CLAMP_X, Math.min(CLAMP_X, e.clientX - drag.dx)),
			y: Math.max(-CLAMP_Y, Math.min(CLAMP_Y, e.clientY - drag.dy))
		};
	}

	const dissolve = $derived({
		warp: knobs.warp * knobs.strength,
		/* Low on purpose: at the seam of two large pictures a heavy blur reads
		   as fog over the neck, not as liquid. */
		blur: 5 * knobs.strength,
		mix: knobs.mix * knobs.strength,
		gravity: knobs.gravity * knobs.strength,
		taper: 0.95,
		warpFreq: 1,
		flowSpeed: 26,
		detail: 2,
		zone: knobs.zone,
		range: knobs.range,
		releaseMs: 110,
		fadeMs: 320
	});
</script>

<Liquid {...groupProps(group, theme)} class="gd-dc">
	{#each IMAGES as src, i (src)}
		<!-- Both cards dissolve: each melts its own picture toward the other,
		     so the seam mixes two liquids. -->
		<Liquid.Item {dissolve} morph={{ advanced: { blobInset: knobs.blobInset, bridgeGrow: knobs.bridgeGrow } }}>
			<div
				class="gd-dc-card"
				role="img"
				aria-label="Draggable picture {i + 1}"
				style:transform="translate({pos[i].x}px, {pos[i].y}px)"
				onpointerdown={(e) => down(i, e)}
				onpointermove={move}
				onpointerup={() => (drag = null)}
				onpointercancel={() => (drag = null)}
			>
				<img {src} alt="" draggable="false" />
			</div>
		</Liquid.Item>
	{/each}
</Liquid>
