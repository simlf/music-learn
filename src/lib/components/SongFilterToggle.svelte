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
	import { t } from '$lib/i18n/locale.svelte';

	interface Props {
		/** Mono label describing what pool/queue this filter restricts, e.g. "PRACTICE POOL". */
		poolLabel: string;
		/** Current pressed state of the filter. */
		on: boolean;
		/** Called when the toggle is clicked; the caller owns flipping/persisting `on`. */
		onToggle: () => void;
		/** Optional note rendered below the bar (e.g. filter-on/off explanation). Omitted renders nothing. */
		note?: string;
		/** Explanatory note shown when `on` is true and `note` (the fallback) is not set, e.g. "Filter on: practicing the {N} chords from your active songs only." */
		noteOn?: string;
		/** Explanatory note shown when `on` is false and `note` (the fallback) is not set, e.g. "Filter off: full chord library. Chords from your songs still carry their mark." */
		noteOff?: string;
		/**
		 * DPOL-02: opt-in discrete variant (Drills only; Recall never sets this).
		 * Drops the loud filled box for lighter/compact styling and, on
		 * hover-capable desktops, recedes to reduced opacity until hover or
		 * keyboard focus. Defaults to false so Recall's bar is byte-for-byte
		 * unchanged.
		 */
		discrete?: boolean;
	}

	let { poolLabel, on, onToggle, note, noteOn, noteOff, discrete = false }: Props = $props();

	/**
	 * The fallback `note` (no-active-songs edge case) always wins when set;
	 * otherwise fall back to the on/off explanatory copy for the current
	 * state. Undefined renders nothing, same as before this prop existed.
	 */
	const displayNote = $derived(note ?? (on ? noteOn : noteOff));
</script>

<div
	class="song-filter-toggle-bar"
	class:song-filter-toggle-bar--discrete={discrete}
	data-testid="song-filter-toggle-bar"
	data-discrete={discrete}
>
	<div class="song-filter-toggle-row">
		<p class="text-label font-mono uppercase">{poolLabel}</p>
		<button class="song-filter-toggle" type="button" aria-pressed={on} onclick={onToggle}>
			<span class="song-filter-toggle__box"></span>
			{t('songs.filter.button')}
		</button>
	</div>
	{#if displayNote}
		<p class="text-label font-mono" data-testid="song-filter-note">{displayNote}</p>
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

	/*
	 * DPOL-02: Drills-only discrete variant. Lighter/compact box (no heavy
	 * fill/border/padding) so the bar stops competing with the drill card.
	 * Base (non-discrete) rules above are untouched, so Recall's bar renders
	 * exactly as before.
	 */
	.song-filter-toggle-bar--discrete {
		border: none;
		background: transparent;
		padding: var(--spacing-sm) 0;
	}

	/* Touch / no-hover: always fully readable, just the lighter styling above. */
	.song-filter-toggle-bar--discrete {
		opacity: 1;
	}

	/* Desktop (hover-capable): recede during play, reveal on hover/keyboard focus. */
	@media (hover: hover) {
		.song-filter-toggle-bar--discrete {
			opacity: 0.5;
			transition: opacity 160ms ease-out;
		}

		.song-filter-toggle-bar--discrete:hover,
		.song-filter-toggle-bar--discrete:focus-within {
			opacity: 1;
		}
	}

	/* Keyboard users always get a full reveal, hover-capable or not. */
	.song-filter-toggle-bar--discrete:has(.song-filter-toggle:focus-visible) {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.song-filter-toggle-bar--discrete {
			transition: none;
		}
	}
</style>
