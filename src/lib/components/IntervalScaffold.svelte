<script lang="ts">
	import type { FormulaEntry } from '$lib/lookup/chordPresentation';
	import type { IntervalScaffoldLevel } from '$lib/practice/scaffoldLevel';
	import { intervalFromShort } from '$lib/theory/interval';
	import { t, currentLocale } from '$lib/i18n/locale.svelte';
	import IntervalChip from './IntervalChip.svelte';

	/**
	 * Always-on interval scaffold (sketch 005, winner A: formula strip). Shows
	 * the target chord's interval recipe above the keyboard while answering a
	 * construction drill, so a beginner always sees what intervals the chord is
	 * built from. Deliberately shows intervals only, never the answer note
	 * letters, so it does not give the construction away and its answers are
	 * not assisted. Renders nothing at level 'off'.
	 */
	interface Props {
		/** The target chord's formula entries (from formulaFor). */
		entries: FormulaEntry[];
		/** How much scaffold to show, from the user's tier (intervalScaffoldLevel). */
		level: IntervalScaffoldLevel;
	}

	let { entries, level }: Props = $props();

	/**
	 * The entry's long interval name in the READER's language, mirroring
	 * InspectRegister's own locale switch. This scaffold previously rendered
	 * `longFr` unconditionally, so an English session read "m3 / tierce
	 * mineure" while the app's own prose said "minor 3rd". `FormulaEntry`
	 * carries only `longFr`, so the English name is re-derived from the
	 * entry's own shorthand label: an exact round trip, since `formulaFor`
	 * sets `label` to `IntervalInfo.short` and `intervalFromShort` is that
	 * field's inverse (including 'R' for the unison, which yields "root").
	 */
	function longName(entry: FormulaEntry): string {
		return currentLocale() === 'fr' ? entry.longFr : intervalFromShort(entry.label).long;
	}
</script>

{#if level !== 'off'}
	<div class="border-ink mt-4 border-2 px-3 py-3" data-testid="interval-scaffold">
		<p class="text-label text-muted font-mono uppercase" style="letter-spacing: 0.12em;">
			{t('drills.scaffold.caption')}
		</p>
		<div class="mt-2 flex flex-wrap gap-3" data-scaffold-level={level}>
			{#each entries as entry (entry.role + entry.label)}
				<div class="flex flex-col items-center gap-1">
					<IntervalChip role={entry.role} label={entry.label} longName={longName(entry)} />
					{#if level === 'full'}
						<span class="text-label text-muted font-mono">{longName(entry)}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
