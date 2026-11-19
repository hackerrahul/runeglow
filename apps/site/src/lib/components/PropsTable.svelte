<script lang="ts" module>
	export interface PropRow {
		name: string;
		type: string;
		default?: string;
		description: string;
	}
</script>

<script lang="ts">
	let { rows, nameLabel = 'Prop' }: { rows: PropRow[]; nameLabel?: string } = $props();
</script>

<div class="table" role="table">
	<div class="row head" role="row">
		<span role="columnheader">{nameLabel}</span>
		<span role="columnheader">Type</span>
		<span role="columnheader">Default</span>
		<span role="columnheader">Description</span>
	</div>
	{#each rows as row (row.name)}
		<div class="row" role="row">
			<span role="cell" class="name"><code>{row.name}</code></span>
			<span role="cell" class="type"><code>{row.type}</code></span>
			<span role="cell" class="def">{#if row.default}<code>{row.default}</code>{:else}–{/if}</span>
			<span role="cell" class="desc">{row.description}</span>
		</div>
	{/each}
</div>

<style>
	.table {
		font-size: 13px;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.4fr) minmax(80px, 0.6fr) minmax(0, 2fr);
		gap: 16px;
		padding: 11px 0;
		border-top: 1px solid var(--line);
		align-items: baseline;
	}
	.head {
		border-top: 0;
		padding-top: 0;
		color: var(--fg-3);
	}
	code {
		font-size: 12px;
		overflow-wrap: anywhere;
	}
	.name code {
		color: #fff;
	}
	.type code,
	.def code,
	.def {
		color: var(--fg-3);
	}
	.desc {
		color: var(--fg-2);
	}
	@media (max-width: 760px) {
		.head {
			display: none;
		}
		.row {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 4px 14px;
		}
		.row:nth-child(2) {
			border-top: 0;
		}
		.desc {
			grid-column: 1 / -1;
		}
		.def {
			display: none;
		}
	}
</style>
