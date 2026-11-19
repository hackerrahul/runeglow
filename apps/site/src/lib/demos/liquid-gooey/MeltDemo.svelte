<script lang="ts">
	import { Liquid } from 'runeglow/liquid-gooey';
	import './demos.css';
	import { MELT_DEFAULTS, type MeltKnobs } from './shared.ts';

	interface Props {
		knobs?: MeltKnobs;
	}
	let { knobs = MELT_DEFAULTS }: Props = $props();

	const CARD = 84;
	const STAGE_H = 200;
	const IMAGES = ['/images/melt-a.jpg', '/images/melt-b.jpg'];

	let stage = $state<HTMLDivElement | null>(null);
	let pos = $state([
		{ x: 0, y: (STAGE_H - CARD) / 2 },
		{ x: CARD + 24, y: (STAGE_H - CARD) / 2 }
	]);
	let drag: { id: number; index: number; dx: number; dy: number } | null = null;

	/* Lay the pair out symmetrically once the stage has a width: the two
	   start a hair apart, so the goo is already necking. */
	$effect(() => {
		const el = stage;
		if (!el) return;
		let placed = false;
		const place = () => {
			const w = el.getBoundingClientRect().width;
			if (!w) return;
			const gap = Math.min(20, Math.max(4, w - CARD * 2 - 8));
			const left = Math.max(0, (w - (CARD * 2 + gap)) / 2);
			pos = [
				{ x: left, y: (STAGE_H - CARD) / 2 },
				{ x: left + CARD + gap, y: (STAGE_H - CARD) / 2 }
			];
			placed = true;
		};
		place();
		const ro = new ResizeObserver(() => {
			if (!placed) place();
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

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
		/* Clamp against the stage's live size (narrow screens shrink it). */
		const box = stage?.getBoundingClientRect();
		const maxX = Math.max(0, (box?.width ?? CARD * 2) - CARD);
		const maxY = Math.max(0, (box?.height ?? STAGE_H) - CARD);
		pos[drag.index] = {
			x: Math.max(0, Math.min(maxX, e.clientX - drag.dx)),
			y: Math.max(0, Math.min(maxY, e.clientY - drag.dy))
		};
	}
</script>

<Liquid class="gd-mp" bind:ref={stage}>
	{#each IMAGES as src, i (src)}
		<Liquid.Item effect="melt" melt={knobs}>
			<!-- Size is set here, not in CSS: the melt reads the element's real
			     rect, so the constant and the painted card cannot disagree. -->
			<div
				class="gd-mp-card"
				role="img"
				aria-label="Draggable picture {i + 1}"
				style:left="{pos[i].x}px"
				style:top="{pos[i].y}px"
				style:width="{CARD}px"
				style:height="{CARD}px"
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
