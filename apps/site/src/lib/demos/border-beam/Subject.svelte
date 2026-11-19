<script lang="ts" module>
	export type SubjectKind = 'chat' | 'card' | 'button' | 'search' | 'tasks';
</script>

<script lang="ts">
	interface Props {
		kind: SubjectKind;
		/** Overrides the subject's own corner radius, in pixels. */
		radius?: number | null;
		theme?: 'dark' | 'light';
	}

	let { kind, radius = null, theme = 'dark' }: Props = $props();

	const tasks = [
		'Generate colour palettes',
		'Recommend font pairings',
		'Create layout templates',
		'Build section engine'
	];
</script>

{#if kind === 'chat'}
	<form
		class="m chat"
		data-m-theme={theme}
		style:--m-radius={radius != null ? `${radius}px` : undefined}
		aria-label="Chat input example"
		onsubmit={(e) => e.preventDefault()}
	>
		<input type="text" placeholder="Ask anything…" aria-label="Message" autocomplete="off" spellcheck="false" />
		<div class="row">
			<button type="button" class="ico" aria-label="Add">
				<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
			</button>
			<button type="button" class="chip">
				Agent
				<svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
			<span class="grow"></span>
			<button type="button" class="send" aria-label="Send">
				<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M8 12.5v-9M4 7.5l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
		</div>
	</form>
{:else if kind === 'card'}
	<div class="m card" data-m-theme={theme} style:--m-radius={radius != null ? `${radius}px` : undefined}>
		<div class="card-top">
			<span class="avatar"></span>
			<span>
				<span class="t">Deploy preview</span>
				<span class="s">Ready in 14s</span>
			</span>
			<span class="badge">Live</span>
		</div>
		<span class="bar w1"></span>
		<span class="bar w2"></span>
		<span class="bar w3"></span>
	</div>
{:else if kind === 'button'}
	<button type="button" class="m pill" data-m-theme={theme} style:--m-radius={radius != null ? `${radius}px` : undefined}>
		Subscribe
	</button>
{:else if kind === 'search'}
	<label class="m search" data-m-theme={theme} style:--m-radius={radius != null ? `${radius}px` : undefined}>
		<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.6" /><path d="m13.5 13.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
		<input type="search" placeholder="Search" aria-label="Search" autocomplete="off" />
		<kbd>⌘K</kbd>
	</label>
{:else}
	<div class="m tasks" data-m-theme={theme} style:--m-radius={radius != null ? `${radius}px` : undefined}>
		<p class="working">Working…</p>
		<ul>
			{#each tasks as task (task)}
				<li><span class="ring"></span>{task}</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.m {
		--m-bg: #1c1c1c;
		--m-line: rgba(255, 255, 255, 0.08);
		--m-fg: #ededed;
		--m-muted: #7d7d7d;
		--m-chip: rgba(255, 255, 255, 0.07);
		background: var(--m-bg);
		border: 1px solid var(--m-line);
		color: var(--m-fg);
		font-family: var(--font-sans);
		max-width: 100%;
		transition:
			background 0.25s,
			border-color 0.25s,
			color 0.25s;
	}
	.m[data-m-theme='light'] {
		--m-bg: #ffffff;
		--m-line: rgba(0, 0, 0, 0.1);
		--m-fg: #161616;
		--m-muted: #8a8a8a;
		--m-chip: #f1f1f1;
	}

	.chat {
		display: grid;
		gap: 22px;
		width: min(400px, 78vw);
		padding: 16px 14px 12px 18px;
		border-radius: var(--m-radius, 20px);
	}
	/* Inside a voice glow, whose layers are stacked up to z-index 4, the
	   field and its buttons sit above the light. */
	:global([data-voice-beam]) > .chat > * {
		position: relative;
		z-index: 5;
	}
	.chat input {
		width: 100%;
		border: 0;
		outline: 0;
		background: none;
		font-size: 15px;
		color: var(--m-fg);
	}
	.chat input::placeholder,
	.search input::placeholder {
		color: var(--m-muted);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-left: -6px;
	}
	.grow {
		flex: 1;
	}
	.ico,
	.send {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		color: var(--m-muted);
	}
	.ico:hover {
		background: var(--m-chip);
	}
	.send {
		background: var(--m-chip);
		color: var(--m-fg);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 11px;
		border-radius: 30px;
		font-size: 13px;
		color: var(--m-muted);
	}
	.chip:hover {
		background: var(--m-chip);
	}

	.card {
		display: grid;
		gap: 10px;
		width: min(340px, 78vw);
		padding: 18px;
		border-radius: var(--m-radius, 16px);
	}
	.card-top {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-bottom: 8px;
	}
	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: var(--m-chip);
	}
	.t,
	.s {
		display: block;
		line-height: 1.3;
	}
	.t {
		font-size: 14px;
		font-weight: 500;
	}
	.s {
		font-size: 12.5px;
		color: var(--m-muted);
	}
	.badge {
		margin-left: auto;
		padding: 3px 9px;
		border-radius: 20px;
		background: var(--m-chip);
		font-size: 11.5px;
		color: var(--m-muted);
	}
	.bar {
		height: 9px;
		border-radius: 9px;
		background: var(--m-chip);
	}
	.w1 {
		width: 100%;
	}
	.w2 {
		width: 82%;
	}
	.w3 {
		width: 54%;
	}

	.pill {
		height: 36px;
		padding: 0 18px;
		border-radius: var(--m-radius, 18px);
		font-size: 13.5px;
		font-weight: 500;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		width: min(360px, 78vw);
		height: 48px;
		padding: 0 14px 0 16px;
		border-radius: var(--m-radius, 20px);
		color: var(--m-muted);
		cursor: text;
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		font-size: 14.5px;
		color: var(--m-fg);
	}
	.search input::-webkit-search-cancel-button {
		display: none;
	}
	kbd {
		padding: 2px 7px;
		border-radius: 6px;
		background: var(--m-chip);
		font-size: 11.5px;
		color: var(--m-muted);
	}

	.tasks {
		width: min(300px, 78vw);
		padding: 18px 20px;
		border-radius: var(--m-radius, 18px);
	}
	.working {
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 12px;
	}
	.tasks ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
		font-size: 13.5px;
		color: var(--m-muted);
	}
	.tasks li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.ring {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px dashed currentColor;
		opacity: 0.7;
	}
</style>
