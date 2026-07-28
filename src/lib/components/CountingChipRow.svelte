<script lang="ts">
	import type { ChordResult, IntervalRole } from '$lib/theory/types';
	import { stackedThirdsFor, type StackedGap } from '$lib/lookup/chordPresentation';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The reusable counting-chip primitive (SHAPE-01, Phase 32 Plan 01): a row
	 * of role-tinted tone chips (root vermilion, third verdigris, fifth tan,
	 * seventh mustard) separated by fill/outline gap chips, so a beginner
	 * reads a chord's third-pattern as a SHAPE (small-big-small = m7) instead
	 * of decoding grey mono letters. Ships as a standalone component (not an
	 * extension of IntervalView) so Phases 34 (progression hint ladder) and 35
	 * (inversion hint ladder) embed one source of truth.
	 *
	 * COMPONENT DECISION (recorded per plan Task 1): this is a NEW component,
	 * NOT an extension of IntervalView. IntervalView's tone unit is the
	 * interval-ROLE label chip (IntervalChip renders "R"/"m3"/"P5") with
	 * separate letter/solfège text columns and DELIBERATELY neutral muted-text
	 * gap markers (its DESIGN-02 invariant reserves colored chips for role
	 * labels and forbids colored gap chips). The counting-chip grammar inverts
	 * that: the NOTE NAME lives inside the role-tinted chip and gaps become
	 * first-class fill/outline chips. Grafting a third mode onto IntervalView
	 * would fork its render and violate its "gaps are never colored chips"
	 * invariant, so a dedicated primitive is the correct single source of
	 * truth here.
	 *
	 * Derives everything from stackedThirdsFor(chord) - no hand-rolled
	 * interval or semitone math in this component.
	 */
	interface Props {
		/** The resolved chord to render as a counting-chip row. */
		chord: ChordResult;
		/** Whether to render the +m3/+M3 -> semitone-count legend. Defaults to true. */
		showLegend?: boolean;
		/**
		 * Optional accessible name for the row container. Omitted keeps the
		 * container without an aria-label (gated-prop, byte-identical
		 * convention) so the caller owns the contextual accessible name.
		 */
		ariaLabel?: string;
		/**
		 * Rotates the tone/gap row to start at this role instead of the
		 * canonical root-first order (Phase 35, INV-02: the inversion drill's
		 * "stack from the bass" hint rung). Role tints stay fixed - only tone
		 * order changes. Delegates rotation to stackedThirdsFor's startRole (one
		 * source of truth, no local semitone math). Omitted keeps today's
		 * root-first render byte-identical.
		 */
		rotateFromRole?: IntervalRole;
	}

	let { chord, showLegend = true, ariaLabel, rotateFromRole }: Props = $props();

	let stacked = $derived(stackedThirdsFor(chord, rotateFromRole));

	/**
	 * Gap modifier class for one stackedThirdsFor gap ("+m3" -> "m3", "+M3" ->
	 * "M3"). Non-third gaps DO occur in production (WR-02): the name-it drill
	 * pool's tier 5-6 qualities (sus4/6/9/13) genuinely emit gaps like
	 * "+P4"/"+M2"/"+P5" from stackedThirdsFor - this is not a dead or
	 * unreachable branch. Those get the explicit neutral "other" modifier
	 * (.gap-chip.other), a first-class visual state distinct from both the
	 * m3 solid-ink-fill and M3 outline states.
	 *
	 * Reads the gap's own `isThird` flag rather than re-parsing its label, so
	 * this row and IntervalView share ONE definition of "is this gap actually
	 * a stacked third" (music-theory audit Bug D). Output is unchanged.
	 */
	function gapModifier(gap: StackedGap): string {
		return gap.isThird ? gap.label.replace(/^\+/, '') : 'other';
	}
</script>

<div class="chiprow" data-testid="counting-chip-row" aria-label={ariaLabel}>
	{#each stacked.tones as tone, i (tone.role + tone.letter)}
		<span class="tone-chip {tone.role}">{tone.letter}</span>
		{#if i < stacked.gaps.length}
			{@const gap = stacked.gaps[i]}
			{@const modifier = gapModifier(gap)}
			<span class="gap-chip {modifier}" title={gap.longFr}>{gap.label}</span>
		{/if}
	{/each}
</div>

{#if showLegend}
	<div class="chip-legend" data-testid="chip-legend" aria-label={t('drills.chip.legendAria')}>
		<span class="chip-legend__entry">
			<span class="gap-chip m3 chip-legend__swatch">+m3</span>
			+m3 = 3 {t('drills.chip.semitones')}
		</span>
		<span class="chip-legend__entry">
			<span class="gap-chip M3 chip-legend__swatch">+M3</span>
			+M3 = 4 {t('drills.chip.semitones')}
		</span>
		<span class="chip-legend__entry">
			<span class="gap-chip other chip-legend__swatch">+P4</span>
			{t('drills.chip.otherGap')}
		</span>
	</div>
{/if}

<style>
	.chiprow {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--spacing-sm);
	}

	.tone-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-weight: 700;
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 2px solid var(--color-ink);
	}

	.tone-chip.root {
		background: var(--color-root);
		color: var(--color-on-root);
	}

	.tone-chip.second {
		background: var(--color-second);
		color: var(--color-on-second);
	}

	.tone-chip.third {
		background: var(--color-third);
		color: var(--color-on-third);
	}

	.tone-chip.fourth {
		background: var(--color-fourth);
		color: var(--color-on-fourth);
	}

	.tone-chip.fifth {
		background: var(--color-fifth);
		color: var(--color-on-fifth);
	}

	.tone-chip.sixth {
		background: var(--color-sixth);
		color: var(--color-on-sixth);
	}

	.tone-chip.seventh {
		background: var(--color-seventh);
		color: var(--color-on-seventh);
	}

	.gap-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: center;
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
		padding: var(--spacing-xs) var(--spacing-sm);
		color: var(--color-muted);
	}

	/* Minor third: solid ink fill. */
	.gap-chip.m3 {
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}

	/* Major third: outline only, no fill - the fill-vs-outline pairing is the
	   whole point (SHAPE-01). */
	.gap-chip.M3 {
		background: var(--color-paper-bright);
		border: 2px solid var(--color-ink);
		color: var(--color-ink);
	}

	/* Non-third gap (WR-02): a distinct neutral state - neither the m3 solid
	   ink fill nor the M3 ink outline - a muted dashed border reading as
	   "not a stacked third." Real drill-pool chords (sus4/6/9/13) reach this
	   state; it is not a dead fallback. */
	.gap-chip.other {
		background: none;
		border: 2px dashed var(--color-faint);
		color: var(--color-muted);
	}

	.chip-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		margin-top: var(--spacing-sm);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.chip-legend__entry {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.chip-legend__swatch {
		font-size: 0.75em;
		padding: 2px var(--spacing-xs);
	}
</style>
