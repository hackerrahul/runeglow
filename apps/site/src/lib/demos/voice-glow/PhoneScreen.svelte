<script lang="ts">
	interface Props {
		tone?: 'dark' | 'light';
		/** What has been heard so far. While empty, the prompt shows. */
		words?: string[];
		/** Shown while nothing has been heard. */
		prompt?: string;
	}
	let { tone = 'dark', words = [], prompt = 'How can I help you?' }: Props = $props();

	const heard = $derived(words.length > 0);
	const promptWords = $derived(prompt.split(' '));
</script>

<!-- The lower part of a voice screen. It is rounded all the way round, and
     whoever places it hangs it off the top of its stage, so the top corners
     are out of sight: the beam reads one radius and fits every corner. -->
<div class="phone" data-tone={tone} role="img" aria-label="Phone voice screen example">
	<div class="text" aria-live="off">
		{#if heard}
			<p class="said">
				{#each words as word, i (i)}
					<span class="word">{word}</span>{' '}
				{/each}
			</p>
		{:else}
			{#key prompt}
				<p class="ask">
					{#each promptWords as word, i (i)}
						<span class="word" style:animation-delay="{i * 70}ms">{word}</span>{' '}
					{/each}
				</p>
			{/key}
		{/if}
	</div>
	<div class="row">
		<span class="chip">
			Agent (auto)
			<svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
				<path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
		<span class="round">
			<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
				<rect x="5.75" y="1.75" width="4.5" height="7.5" rx="2.25" />
				<path d="M3.5 7.75a4.5 4.5 0 0 0 9 0M8 12.25v2" />
			</svg>
		</span>
		<span class="round">
			<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
				<path d="M4 4l8 8M12 4l-8 8" />
			</svg>
		</span>
	</div>
</div>

<style>
	.phone {
		display: grid;
		grid-template-rows: 1fr auto;
		width: 272px;
		/* never wider than the stage it sits in, so the beam's wrapper still hugs it */
		max-width: 100%;
		height: 420px;
		padding: 0 21px 56px;
		border-radius: 45px;
		background: #101010;
		border: 1px solid rgba(255, 255, 255, 0.07);
		color: rgba(255, 255, 255, 0.86);
		transition:
			background 0.2s,
			color 0.2s;
	}
	.phone[data-tone='light'] {
		background: #fbfbfc;
		border-color: rgba(0, 0, 0, 0.08);
		color: #1f1f1f;
	}
	/* The glow's layers are stacked up to z-index 4 inside the beam. The
	   screen's own text and controls sit above them, or on a light screen
	   the glow's white wash paints straight over them. */
	.text,
	.row {
		position: relative;
		z-index: 5;
	}
	.text {
		display: grid;
		align-items: end;
		padding-bottom: 44px;
	}
	.phone[data-tone='light'] .ask {
		color: #6a6a6a;
	}
	p {
		font-size: 15px;
		line-height: 1.35;
		text-align: center;
		text-wrap: balance;
	}
	.ask {
		font-size: 17px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	/* Each word arrives out of a soft blur, the way live transcription lands. */
	.word {
		display: inline-block;
		animation: arrive 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			filter: blur(4px);
			transform: translateY(3px);
		}
	}
	.row {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.chip,
	.round {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 30px;
		border-radius: 30px;
		background: rgba(255, 255, 255, 0.08);
		box-shadow:
			0 0 0 0.5px rgba(0, 0, 0, 0.12),
			inset 0 0 0 0.5px rgba(255, 255, 255, 0.1);
		font-size: 12px;
		font-weight: 500;
		color: #caccd2;
		white-space: nowrap;
	}
	/* Light: a near-white button at 30%, so the glow reads through it, held
	   together by a hairline ring; near-black text and icons. */
	.phone[data-tone='light'] .chip,
	.phone[data-tone='light'] .round {
		background: rgba(252, 252, 252, 0.3);
		box-shadow:
			0 0 0 0.5px rgba(0, 0, 0, 0.14),
			0 2px 6px -1px rgba(0, 0, 0, 0.05);
		color: #0d0d0d;
	}
	.chip {
		padding: 0 12px 0 13px;
		margin-right: auto;
	}
	.round {
		width: 30px;
	}
	@media (prefers-reduced-motion: reduce) {
		.word {
			animation: none;
		}
	}
</style>
