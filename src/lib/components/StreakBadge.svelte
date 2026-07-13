<script lang="ts">
	/**
	 * Renders the daily practice streak count (PROG-03). Two variants:
	 * `compact` (masthead chip) and `hero` (Progress page headline). Same
	 * component, different prop, so copy/logic don't fork (per the UI-SPEC).
	 *
	 * `compact` self-hides (renders nothing) while loading, at zero, or on
	 * fetch error (callers pass count 0 on error) - an absent chip reads
	 * better than a discouraging "0 DAY STREAK" or a loading skeleton in
	 * persistent chrome that must never flash or shift.
	 *
	 * `hero` always renders the numeral at display size in font-mono (the
	 * UI-SPEC's "display + mono = big data numeral" rule, distinct from
	 * ChordGlyph's display + serif "chord glyph" rule). It's vermilion only
	 * when the streak is active (count >= 1); a zero streak renders in ink,
	 * so vermilion stays a reward signal, not decoration.
	 */
	interface Props {
		/** Current streak count. */
		count: number;
		/** `compact` for the masthead chip, `hero` for the Progress page headline numeral. */
		variant: 'compact' | 'hero';
		/** While true, the compact variant renders nothing regardless of count. */
		loading?: boolean;
	}

	let { count, variant, loading = false }: Props = $props();
</script>

{#if variant === 'compact'}
	{#if !loading && count >= 1}
		<span
			class="streak-badge streak-badge--compact text-label font-mono uppercase"
			data-testid="streak-badge"
		>
			{count} DAY STREAK
		</span>
	{/if}
{:else}
	<span
		class="streak-badge streak-badge--hero font-mono"
		class:streak-badge--active={count >= 1}
		data-testid="streak-badge"
	>
		{count}
	</span>
{/if}

<style>
	.streak-badge--compact {
		color: var(--color-muted);
	}

	.streak-badge--hero {
		display: inline-block;
		font-size: var(--text-display);
		font-weight: var(--text-display--font-weight);
		line-height: var(--text-display--line-height);
		color: var(--color-ink);
	}

	.streak-badge--hero.streak-badge--active {
		color: var(--color-vermilion);
	}
</style>
