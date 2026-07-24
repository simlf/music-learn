<script lang="ts">
	import type { ChordResult } from '$lib/theory/types';
	import { stackedThirdsFor, formulaFor, type FormulaEntry } from '$lib/lookup/chordPresentation';
	import { t } from '$lib/i18n/locale.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import Button from './Button.svelte';

	/**
	 * Shared interval-view component (IVW-01/02/03): renders any resolved
	 * chord as a stacked-thirds row by default (root +m3 ♭3 +M3 5 +m3 ♭7),
	 * with a segmented toggle to the formula row (R, ♭3, 5, ♭7 — byte-identical
	 * to the row it replaces on the Lookup page). Prop-driven and
	 * Lookup-agnostic so Phase 28's Learn hub can embed the same instance
	 * with zero changes.
	 *
	 * Owns only render + local toggle state; all derivation comes from
	 * `stackedThirdsFor`/`formulaFor` in chordPresentation.ts (Plan 01).
	 */
	interface Props {
		chord: ChordResult;
		/**
		 * Optional tap-to-inspect passthrough. When omitted, tone chips render
		 * as inert non-button markup (gated-prop, byte-identical-when-omitted
		 * convention, per IntervalChip.longName precedent).
		 */
		onInspectTone?: (entry: FormulaEntry) => void;
	}

	let { chord, onInspectTone }: Props = $props();

	let view = $state<'stacked' | 'formula'>('stacked');

	let stacked = $derived(stackedThirdsFor(chord));
	let formula = $derived(formulaFor(chord));

	/**
	 * Display label for a tone chip: formula's own label ("R", "m3", "P5",
	 * "m7") except the root tone in stacked mode, which displays as the
	 * localized word for "root" (WR-01 fix: routed through t() so it flips to
	 * "fondamentale" under fr, matching every other piece of chrome around
	 * it — display-only override, never mutates FormulaEntry/
	 * stackedThirdsFor's data). The formula view's root label stays the
	 * literal "R" (byte-identical to today, REG-01) because this branch only
	 * fires when view === 'stacked'.
	 */
	function displayLabel(entry: FormulaEntry): string {
		if (view === 'stacked' && entry.role === 'root') return t('interval-view.tone.root');
		return entry.label;
	}
</script>

<div class="interval-view" data-testid="interval-view" data-view={view}>
	<div
		class="interval-view__toggle"
		role="group"
		aria-label={t('interval-view.aria.group')}
		data-testid="interval-view-toggle"
	>
		<Button
			type="button"
			variant={view === 'stacked' ? 'primary' : 'ghost'}
			aria-pressed={view === 'stacked'}
			aria-label={t('interval-view.aria.stacked')}
			onclick={() => (view = 'stacked')}
		>
			{t('interval-view.toggle.stacked')}
		</Button>
		<Button
			type="button"
			variant={view === 'formula' ? 'primary' : 'ghost'}
			aria-pressed={view === 'formula'}
			aria-label={t('interval-view.aria.formula')}
			onclick={() => (view = 'formula')}
		>
			{t('interval-view.toggle.formula')}
		</Button>
	</div>

	{#if view === 'stacked'}
		<div class="interval-view__row" data-testid="interval-stacked">
			{#each stacked.tones as entry, i (entry.role + entry.letter)}
				{#if onInspectTone}
					<button
						type="button"
						class="formula-tap interval-view__tone"
						aria-label={`Inspect ${entry.letter}`}
						onclick={() => onInspectTone(entry)}
					>
						<IntervalChip role={entry.role} label={displayLabel(entry)} longName={entry.longFr} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</button>
				{:else}
					<div class="interval-view__tone">
						<IntervalChip role={entry.role} label={displayLabel(entry)} longName={entry.longFr} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</div>
				{/if}
				{#if i < stacked.gaps.length}
					<span
						class="interval-view__gap text-label font-mono"
						aria-hidden="true"
						title={stacked.gaps[i].longFr}
					>
						{stacked.gaps[i].label}
					</span>
				{/if}
			{/each}
		</div>
	{:else}
		<div class="interval-view__row" data-testid="interval-formula">
			{#each formula as entry (entry.role + entry.letter)}
				{#if onInspectTone}
					<button
						type="button"
						class="formula-tap interval-view__tone"
						aria-label={`Inspect ${entry.letter}`}
						onclick={() => onInspectTone(entry)}
					>
						<IntervalChip role={entry.role} label={displayLabel(entry)} longName={entry.longFr} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</button>
				{:else}
					<div class="interval-view__tone">
						<IntervalChip role={entry.role} label={displayLabel(entry)} longName={entry.longFr} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.interval-view__toggle {
		display: flex;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.interval-view__toggle :global(.ps-button[aria-pressed='true']) {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	.interval-view__row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
	}

	.interval-view__tone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
	}

	/* Tap targets (formula-tap) reuse the app-wide reset already proven on the
	   Lookup formula row: transparent, no border, 44x44 minimum. */
	.formula-tap {
		background: none;
		border: none;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
		cursor: pointer;
		font: inherit;
		color: inherit;
	}

	/* Gap markers: neutral connective text between tone columns, never a
	   colored chip and never a tap target (DESIGN-02 reservation). */
	.interval-view__gap {
		align-self: center;
		color: var(--color-muted);
		font-weight: 700;
	}
</style>
