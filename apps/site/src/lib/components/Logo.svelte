<script lang="ts">
	let { size = 20 }: { size?: number } = $props();
	const uid = $props.id();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-g" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
			<stop stop-color="#ffb86b" />
			<stop offset="0.5" stop-color="#ff6f91" />
			<stop offset="1" stop-color="#9180ff" />
		</linearGradient>
	</defs>
	<path
		d="M7.5 2.5v19M7.5 3.5l9 5-9 5.5 9 7.5"
		stroke="url(#{uid}-g)"
		stroke-width="2.8"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
