<script lang="ts">
	import { onMount } from 'svelte';
	import { allFacts, type Fact } from '$lib/srs/facts';
	import {
		getAllCards,
		deriveCellState,
		type CardRecord,
		type CellState,
		type Mode
	} from '$lib/srs/deck';
	import { spellChord } from '$lib/theory/chord';
	import { t } from '$lib/i18n/locale.svelte';
	import Button from './Button.svelte';

	/**
	 * The fact x mode recall map (MEM-04/RECALL-01): every fact from the
	 * 192-entry catalog (11-02), joined against whatever cards actually exist
	 * (11-03), filterable by kind. Renders a genuine N-column CSS grid (N=4,
	 * via MODE_COLUMNS below) in fading-scaffold order: recall the formula ->
	 * build it -> play it -> name it by ear (most-scaffolded to least).
	 * Self-contained: loads its own data on mount, no props (mirrors
	 * RecallSession's pattern).
	 */

	/**
	 * Formula is a real cell for every fact kind (Phase 11 baseline).
	 * Build/Play/Name are chord-formula-only per the UI-SPEC's applicability
	 * map (13-02): interval-size/scale-degree rows render the "not
	 * applicable" texture for these three columns instead.
	 */
	const MODE_COLUMNS = $derived.by(
		(): readonly { mode: Mode; label: string }[] => [
			{ mode: 'formula', label: t('recall.map.col.formula') },
			{ mode: 'formula-build', label: t('recall.map.col.build') },
			{ mode: 'see-play', label: t('recall.map.col.play') },
			{ mode: 'hear-name', label: t('recall.map.col.name') }
		]
	);

	type KindFilter = 'all' | Fact['factKind'];

	const facts: Fact[] = allFacts();
	let cardsByKey = $state(new Map<string, CardRecord>());
	let kindFilter = $state<KindFilter>('all');
	let now = $state(new Date());

	onMount(async () => {
		try {
			const cards = await getAllCards();
			cardsByKey = new Map(cards.map((card) => [`${card.factId}|${card.mode}`, card]));
			now = new Date();
		} catch {
			// A load failure just leaves the map empty: this is a secondary,
			// glanceable surface, not the primary session flow, so it doesn't
			// need its own dedicated error state.
		}
	});

	const visibleFacts = $derived(
		kindFilter === 'all' ? facts : facts.filter((fact) => fact.factKind === kindFilter)
	);

	/** Chord-formula rows render tonal's display-glyph spelling, e.g. "F♯m7". */
	function chordLabel(symbol: string): string {
		const chord = spellChord(symbol);
		return chord.root + chord.symbol.slice(chord.root.length);
	}

	/** Plain-text accessible label for a fact row, mirroring its visual rendering. */
	function factLabel(fact: Fact): string {
		if (fact.factKind === 'chord-formula') return chordLabel(fact.symbol);
		if (fact.factKind === 'interval-size') return fact.short;
		return `${fact.tonic} major degree ${fact.degree}`;
	}

	/**
	 * Applicability map (UI-SPEC "Recall Map Extension"): Formula always
	 * applies; Build/Play/Name apply only to chord-formula rows. Computed
	 * BEFORE calling deriveCellState - deck.ts's CellState vocabulary is never
	 * touched by this check.
	 */
	function columnApplies(fact: Fact, column: (typeof MODE_COLUMNS)[number]): boolean {
		return column.mode === 'formula' || fact.factKind === 'chord-formula';
	}

	const KIND_TABS = $derived.by(
		(): { value: KindFilter; label: string }[] => [
			{ value: 'all', label: t('recall.map.kind.all') },
			{ value: 'chord-formula', label: t('recall.map.kind.chords') },
			{ value: 'interval-size', label: t('recall.map.kind.intervals') },
			{ value: 'scale-degree', label: t('recall.map.kind.scales') }
		]
	);

	const LEGEND = $derived.by(
		(): { state: CellState; label: string }[] => [
			{ state: 'not-yet-seen', label: t('recall.map.legend.not-yet-seen') },
			{ state: 'due', label: t('recall.map.legend.due') },
			{ state: 'weak', label: t('recall.map.legend.weak') },
			{ state: 'mastered', label: t('recall.map.legend.mastered') }
		]
	);
</script>

<div
	class="mt-2 flex flex-wrap gap-2"
	data-testid="recall-map-kind-tabs"
	role="group"
	aria-label={t('recall.map.aria.kind-filter')}
>
	{#each KIND_TABS as tab (tab.value)}
		<Button
			type="button"
			variant={kindFilter === tab.value ? 'primary' : 'ghost'}
			aria-pressed={kindFilter === tab.value}
			onclick={() => (kindFilter = tab.value)}
		>
			{tab.label}
		</Button>
	{/each}
</div>

<div
	class="recall-map__grid mt-4"
	data-testid="recall-map-grid"
	style={`grid-template-columns: minmax(140px, auto) repeat(${MODE_COLUMNS.length}, 1fr);`}
>
	<div class="recall-map__header"></div>
	{#each MODE_COLUMNS as column (column.mode)}
		<div class="recall-map__header text-label font-mono uppercase">{column.label}</div>
	{/each}

	{#each visibleFacts as fact (fact.factId)}
		<div class="recall-map__label" data-testid={`recall-map-row-${fact.factId}`}>
			{#if fact.factKind === 'chord-formula'}
				<span class="font-serif font-bold">{chordLabel(fact.symbol)}</span>
			{:else if fact.factKind === 'interval-size'}
				<span class="font-mono font-bold">{fact.short}</span>
			{:else}
				<span class="font-mono font-bold">{fact.tonic} · {fact.degree}</span>
			{/if}
		</div>
		{#each MODE_COLUMNS as column (column.mode)}
			{#if columnApplies(fact, column)}
				{@const state = deriveCellState(cardsByKey.get(`${fact.factId}|${column.mode}`), now)}
				<div
					class="recall-map__cell recall-map__cell--{state}"
					data-testid={`recall-map-cell-${fact.factId}-${column.mode}`}
					data-cell-state={state}
					role="img"
					aria-label={`${factLabel(fact)}, ${column.label}: ${LEGEND.find((entry) => entry.state === state)?.label}`}
				>
					{#if state === 'weak'}
						<span aria-hidden="true">!</span>
					{:else if state === 'mastered'}
						<span aria-hidden="true">✓</span>
					{/if}
				</div>
			{:else}
				<div
					class="recall-map__cell recall-map__cell--not-applicable"
					data-testid={`recall-map-cell-${fact.factId}-${column.mode}`}
					data-cell-state="not-applicable"
					role="img"
					aria-label={`${factLabel(fact)}, ${column.label}: Not applicable`}
				>
					<span aria-hidden="true">·</span>
				</div>
			{/if}
		{/each}
	{/each}
</div>

<div class="mt-4 flex flex-wrap gap-4" data-testid="recall-map-legend">
	{#each LEGEND as entry (entry.state)}
		<span class="text-label flex items-center gap-2 font-mono">
			<span class="recall-map__swatch recall-map__swatch--{entry.state}" aria-hidden="true"
			></span>
			{entry.label}
		</span>
	{/each}
</div>

<style>
	.recall-map__grid {
		display: grid;
		gap: 2px;
	}

	.recall-map__header {
		padding: var(--spacing-xs);
	}

	.recall-map__label {
		display: flex;
		align-items: center;
		padding: var(--spacing-xs);
	}

	.recall-map__cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		font-weight: 700;
	}

	/* Not yet seen: paper fill, faint border, no mark. */
	.recall-map__cell--not-yet-seen,
	.recall-map__swatch--not-yet-seen {
		background-color: var(--color-paper);
		border: 1.5px solid var(--color-faint);
	}

	/* Due: bright paper fill plus the same diagonal ink-hatch recipe
	   PianoKeyboard's .piano-keyboard__key--selected uses (same angle,
	   opacity, repeat), plus an inset ink border. */
	.recall-map__cell--due,
	.recall-map__swatch--due {
		background-color: var(--color-paper-bright);
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 0,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 1px,
			transparent 1px,
			transparent 7px
		);
		box-shadow: inset 0 0 0 2px var(--color-ink);
	}

	/* Weak: solid wrong-gray fill (same token as the Again grade button). */
	.recall-map__cell--weak,
	.recall-map__swatch--weak {
		background-color: var(--color-wrong);
		color: var(--color-ink);
	}

	/* Mastered: solid ink fill, "fully inked" letterpress metaphor. */
	.recall-map__cell--mastered,
	.recall-map__swatch--mastered {
		background-color: var(--color-ink);
		color: var(--color-paper-bright);
	}

	/* Not applicable: flat paper fill, no border at all - deliberately quieter
	   than "not-yet-seen" (which has a visible --color-faint border), so the
	   two read as distinct: "not-yet-seen" implies "will happen later," "n/a"
	   implies "will never happen for this fact." No legend entry needed - this
	   is self-evident from its own quiet texture plus its aria-label. */
	.recall-map__cell--not-applicable {
		background-color: var(--color-paper);
		color: var(--color-faint);
	}

	.recall-map__swatch {
		display: inline-block;
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
</style>
