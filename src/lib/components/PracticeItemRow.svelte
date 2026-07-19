<script lang="ts">
	/**
	 * One row in "Weakest Spots" and the full stats table (PROG-02): renders
	 * a kind tag, the symbol (text-heading, sans, bold - not ChordGlyph,
	 * which is display-sized and too heavy to repeat 5-20 times in a list),
	 * attempts, and accuracy%. Carries a vermilion accent (left border +
	 * bold accuracy text) once the item crosses the "needs practice"
	 * threshold (attempts >= 3 AND accuracy < 70%).
	 *
	 * Rows are inert this phase - Phase 5's session-scoping (DRILL-04) isn't
	 * built yet, so this is a plain non-interactive table row (no onclick,
	 * no href), min-height 44px for visual consistency with the rest of the
	 * app's touch-target rule even though nothing here is tappable yet.
	 */
	import { t } from '$lib/i18n/locale.svelte';

	interface PracticeItem {
		item: string;
		kind: 'chord' | 'scale' | 'interval';
		attempts: number;
		accuracy: number;
	}

	interface Props {
		item: PracticeItem;
	}

	let { item }: Props = $props();

	const isWeak = $derived(item.attempts >= 3 && item.accuracy < 0.7);
	const accuracyPercent = $derived(Math.round(item.accuracy * 100));
	/** CHORD/SCALE/INTERVAL category word, translated (the symbol itself never is). */
	const kindLabel = $derived(t(`progress.table.kind.${item.kind}`));
</script>

<tr class="practice-row" class:practice-row--weak={isWeak} data-testid="practice-item-row">
	<td class="practice-row__symbol text-heading font-bold">{item.item}</td>
	<td class="practice-row__kind text-label font-mono hidden sm:table-cell">{kindLabel}</td>
	<td class="practice-row__attempts text-body">{item.attempts}</td>
	<td
		class="practice-row__accuracy text-body"
		class:practice-row__accuracy--weak={isWeak}>{accuracyPercent}%</td
	>
</tr>

<style>
	.practice-row {
		min-height: 44px;
	}

	.practice-row td {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.practice-row--weak .practice-row__symbol {
		border-left: 4px solid var(--color-vermilion);
	}

	.practice-row__accuracy--weak {
		font-weight: 700;
	}
</style>
