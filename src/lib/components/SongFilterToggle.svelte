<script lang="ts">
	/**
	 * SONG-02's single shared filter-bar control, imported by both Drills and
	 * Recall so the on/off "From my songs" filter is one object (and the
	 * `.song-filter-toggle` CSS is never duplicated across two pages).
	 *
	 * A binary on/off filter, not an N-way mode switch, so this is a plain
	 * `<button aria-pressed>` with a dedicated checkbox-style box rather than
	 * the app's segmented Review/Map-style toggle.
	 */
	interface Props {
		/** Mono label describing what pool/queue this filter restricts, e.g. "PRACTICE POOL". */
		poolLabel: string;
		/** Current pressed state of the filter. */
		on: boolean;
		/** Called when the toggle is clicked; the caller owns flipping/persisting `on`. */
		onToggle: () => void;
		/** Optional note rendered below the bar (e.g. filter-on/off explanation). Omitted renders nothing. */
		note?: string;
	}

	let { poolLabel, on, onToggle, note }: Props = $props();
</script>

<div class="song-filter-toggle-bar">
	<div class="song-filter-toggle-row">
		<p class="text-label font-mono uppercase">{poolLabel}</p>
		<button class="song-filter-toggle" type="button" aria-pressed={on} onclick={onToggle}>
			<span class="song-filter-toggle__box"></span>
			From my songs
		</button>
	</div>
	{#if note}
		<p class="text-label font-mono" data-testid="song-filter-note">{note}</p>
	{/if}
</div>

<style>
	.song-filter-toggle-bar {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		padding: var(--spacing-lg);
	}

	.song-filter-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
	}

	.song-filter-toggle {
		font: 700 var(--text-label) / 1.4 var(--font-mono);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		border: 2px solid var(--color-ink);
		background: var(--color-paper);
		color: var(--color-ink);
		padding: var(--spacing-sm) var(--spacing-md);
		min-height: 44px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.song-filter-toggle[aria-pressed='true'] {
		background: var(--color-vermilion);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	.song-filter-toggle__box {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		display: inline-block;
	}

	.song-filter-toggle[aria-pressed='true'] .song-filter-toggle__box {
		background: var(--color-paper);
	}

	.song-filter-toggle:active {
		transform: translate(1px, 1px);
	}
</style>
