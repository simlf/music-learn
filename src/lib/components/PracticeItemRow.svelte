<script lang="ts">
	/**
	 * One row in "Weakest Spots" and the full stats table (PROG-02): renders
	 * a kind tag, the symbol (text-heading, sans, bold - not ChordGlyph,
	 * which is display-sized and too heavy to repeat 5-20 times in a list),
	 * attempts, and accuracy%. Every row also renders an inline accuracy bar
	 * (UX-1C) whose fill color IS the weak/strong signal (vermilion <50% /
	 * mustard <70% / verdigris >=70%), replacing the former weak-only
	 * left-border accent. `practice-row--weak` (attempts >= 3 AND accuracy <
	 * 70%) now only gates the optional per-row DRILL button below, not any
	 * border styling.
	 *
	 * Rows stay otherwise inert - the row itself has no onclick/href. The
	 * DRILL button is the one interactive affordance, rendered only when the
	 * parent supplies `onDrill` AND the item is weak AND a chord (Weakest
	 * Spots on /progress); `AccuracyTable`'s All-Stats view never passes
	 * `onDrill`, so it renders the bar with no button, keeping this
	 * component import-pure (no navigation/storage imports here - the
	 * parent owns seeding + navigation).
	 */
	import { t } from '$lib/i18n/locale.svelte';
	import Button from './Button.svelte';

	interface PracticeItem {
		item: string;
		kind: 'chord' | 'scale' | 'interval';
		attempts: number;
		accuracy: number;
	}

	interface Props {
		item: PracticeItem;
		/** Optional: seeds this one symbol into a drill session. Omitted by AccuracyTable's All-Stats view. */
		onDrill?: (symbol: string) => void;
	}

	let { item, onDrill }: Props = $props();

	const isWeak = $derived(item.attempts >= 3 && item.accuracy < 0.7);
	const accuracyPercent = $derived(Math.round(item.accuracy * 100));
	/** CHORD/SCALE/INTERVAL category word, translated (the symbol itself never is). */
	const kindLabel = $derived(t(`progress.table.kind.${item.kind}`));
	/** Accuracy-bar fill color threshold (UX-1C, locked): <50% vermilion, <70% mustard, >=70% verdigris. */
	const fillColor = $derived(
		item.accuracy < 0.5
			? 'var(--color-vermilion)'
			: item.accuracy < 0.7
				? 'var(--color-mustard)'
				: 'var(--color-verdigris)'
	);
	const showDrillButton = $derived(onDrill !== undefined && isWeak && item.kind === 'chord');
</script>

<tr class="practice-row" class:practice-row--weak={isWeak} data-testid="practice-item-row">
	<td class="practice-row__symbol text-heading font-bold">{item.item}</td>
	<td class="practice-row__kind text-label font-mono hidden sm:table-cell">{kindLabel}</td>
	<td class="practice-row__attempts text-body">{item.attempts}</td>
	<td
		class="practice-row__accuracy text-body"
		class:practice-row__accuracy--weak={isWeak}
	>
		{accuracyPercent}%
		<div class="practice-row__accuracy-bar" data-testid="accuracy-bar" aria-hidden="true">
			<div
				class="practice-row__accuracy-fill"
				style="width: {accuracyPercent}%; background-color: {fillColor};"
			></div>
		</div>
	</td>
	{#if showDrillButton}
		<td class="practice-row__action">
			<Button
				type="button"
				variant="ghost"
				aria-label={t('progress.weakest.drillOneAria').replace('{ITEM}', item.item)}
				onclick={() => onDrill?.(item.item)}
			>
				{t('progress.weakest.drillOne')}
			</Button>
		</td>
	{/if}
</tr>

<style>
	.practice-row {
		min-height: 44px;
	}

	.practice-row td {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.practice-row__accuracy--weak {
		font-weight: 700;
	}

	.practice-row__accuracy-bar {
		margin-top: var(--spacing-xs);
		height: 8px;
		max-width: 120px;
		border: 1.5px solid var(--color-ink);
		background: var(--color-paper);
	}

	.practice-row__accuracy-fill {
		height: 100%;
	}
</style>
