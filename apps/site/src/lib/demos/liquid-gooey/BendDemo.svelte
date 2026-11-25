<script lang="ts">
	import { Liquid } from '@runeglow/svelte/liquid-gooey';
	import './demos.css';
	import { BEND_DEFAULTS, groupProps, inkFor, type BendKnobs, type GooeyTheme, type GroupTuning } from './shared.ts';

	interface Props {
		group: GroupTuning;
		knobs?: BendKnobs;
		theme?: GooeyTheme;
	}
	let { group, knobs = BEND_DEFAULTS, theme = 'dark' }: Props = $props();

	const DROP_MS = 400;
	const DROP_EASE = 'cubic-bezier(0.34, 1.40, 0.64, 1)';

	let pos = $state({ x: 0, y: 0 });
	let releasing = $state(false);
	let stage = $state<HTMLDivElement | null>(null);
	let card = $state<HTMLDivElement | null>(null);
	let drag: { id: number; dx: number; dy: number } | null = null;
	let dropTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(dropTimer));

	/* Half the free travel in each axis: the card sits centred and moves by
	   transform, so it may run to the group's edge and no further. */
	function limits() {
		const g = stage?.getBoundingClientRect();
		const c = card?.getBoundingClientRect();
		if (!g || !c || !g.width || !c.width) return { x: 70, y: 60 };
		return { x: Math.max(0, (g.width - c.width) / 2), y: Math.max(0, (g.height - c.height) / 2) };
	}

	function down(e: PointerEvent & { currentTarget: HTMLElement }) {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			/* synthetic events have no active pointer */
		}
		releasing = false;
		drag = { id: e.pointerId, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
	}
	function move(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.id) return;
		const lim = limits();
		pos = {
			x: Math.max(-lim.x, Math.min(lim.x, e.clientX - drag.dx)),
			y: Math.max(-lim.y, Math.min(lim.y, e.clientY - drag.dy))
		};
	}
	function end() {
		if (!drag) return;
		drag = null;
		/* Release: the card flies home on an overshooting curve and lands
		   with a bounce. */
		releasing = true;
		pos = { x: 0, y: 0 };
		clearTimeout(dropTimer);
		dropTimer = setTimeout(() => (releasing = false), DROP_MS);
	}
</script>

<Liquid {...groupProps(group, theme)} class="gd-bd" bind:ref={stage} style="--gd-ink: {inkFor(group.fill)};">
	<Liquid.Item effect="bend" bend={{ vertical: knobs.vertical, horizontal: knobs.horizontal }}>
		<div
			class="gd-bd-card"
			bind:this={card}
			style:transform="translate({pos.x}px, {pos.y}px)"
			style:transition={releasing ? `transform ${DROP_MS}ms ${DROP_EASE}` : 'none'}
			style:--gd-cb={knobs.content}
			role="group"
			aria-label="Draggable card"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={end}
			onpointercancel={end}
		>
			<span class="gd-bd-chip" aria-hidden="true">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.5 12.5A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h3L7.5 4H13a1.5 1.5 0 0 1 1.5 1.5z" />
				</svg>
			</span>
			<span class="gd-bd-title">Drag me around</span>
			<span class="gd-bd-count">45 files</span>
		</div>
	</Liquid.Item>
</Liquid>
