<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title?: string; children: Snippet } = $props();
</script>

<div class="group">
	{#if title}<p class="title">{title}</p>{/if}
	{@render children()}
</div>

<style>
	.group {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 14px;
		padding-bottom: 16px;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--line);
	}
	.group:last-of-type {
		border-bottom: 0;
		margin-bottom: 0;
		padding-bottom: 0;
	}
	.title {
		font-size: 13px;
		font-weight: 550;
		color: #fff;
	}
</style>
