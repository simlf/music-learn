<script lang="ts">
	import { spellChord } from '$lib/theory/chord';
	import { formulaFor, formulaSentence } from '$lib/lookup/chordPresentation';
	import { familyLineFor, mnemonicFor } from '$lib/copy/mnemonics';
	import { t } from '$lib/i18n/locale.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import IntervalScaffold from './IntervalScaffold.svelte';
	import NoteLabel from './NoteLabel.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import SongHook from './SongHook.svelte';
	import Button from './Button.svelte';

	type LayerKind = 'family' | 'formula' | 'keyboard' | 'spelling';

	/**
	 * The escalating, cumulative "Need a hint?" ladder (HINT-01). Owns all
	 * derivation internally (spellChord, formulaFor, formulaSentence,
	 * mnemonicFor/familyLineFor, songHookFor via SongHook) so the host only
	 * passes a symbol + the mode's layer array through, mirroring
	 * RevealInsight's "component owns derivation" convention. Never imports
	 * from $lib/srs and never calls recordGrade/advanceQueue (D-04: hints
	 * never touch grading). shownDepth is NOT reset internally on symbol
	 * change - the host wraps the mount in a {#key} block per card
	 * (Plan 03/04) so a fresh instance is created per card.
	 */
	interface Props {
		/** The fact's chord symbol, e.g. "Cdim", "Cm7". */
		symbol: string;
		/** Either the full 4-item ladder or the 3-item ladder with 'formula' omitted (per host mode). */
		layers: LayerKind[];
		/** Fires exactly once, on the shownDepth 0->1 transition (the host uses it to cancel hear-name auto-advance). */
		onOpen?: () => void;
	}

	let { symbol, layers, onOpen }: Props = $props();

	/** tonal-style ASCII form of a letter, to slice the quality suffix off the symbol (RevealInsight precedent). */
	function toAsciiAccidentals(letter: string): string {
		return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
	}

	const chord = $derived(spellChord(symbol));

	/** Canonical ASCII quality suffix (e.g. "m7b5", "dim", ""), the key both mnemonicFor/familyLineFor and ChordGlyph's `quality` prop expect. */
	const qualitySuffix = $derived.by(() => {
		if (!chord.recognized) return '';
		const asciiRoot = toAsciiAccidentals(chord.root);
		return chord.symbol.startsWith(asciiRoot) ? chord.symbol.slice(asciiRoot.length) : '';
	});

	const familyBody = $derived(mnemonicFor(qualitySuffix) ?? familyLineFor(qualitySuffix));
	const sentence = $derived(formulaSentence(chord));
	const entries = $derived(formulaFor(chord));
	const third = $derived(entries.find((entry) => entry.role === 'third'));

	let shownDepth = $state(0);

	/**
	 * Per-tier titles, routed through the recall i18n domain (Phase 17 copy).
	 * The interval shorthand / chord symbols inside a revealed layer stay
	 * immune; only these framing labels translate.
	 */
	const TIER_TITLE: Record<LayerKind, string> = $derived({
		family: t('recall.hint.tier.family'),
		formula: t('recall.hint.tier.formula'),
		keyboard: t('recall.hint.tier.keyboard'),
		spelling: t('recall.hint.tier.spelling')
	});

	/**
	 * The "next layer to reveal" label. `family` never actually appears as the
	 * "next" layer past depth 0 (layers[0] is always 'family'), so its entry
	 * here is unreachable in practice - kept only so the lookup stays a total
	 * Record over LayerKind rather than requiring an unsafe cast.
	 */
	const SHOW_LABEL: Record<LayerKind, string> = $derived({
		family: t('recall.hint.need-hint'),
		formula: t('recall.hint.show.formula'),
		keyboard: t('recall.hint.show.keyboard'),
		spelling: t('recall.hint.show.spelling')
	});

	/** Depth-0 is always "Need a hint?"; after that, the label names the next layer to reveal. */
	const controlLabel = $derived(
		shownDepth === 0 ? t('recall.hint.need-hint') : SHOW_LABEL[layers[shownDepth] ?? 'family']
	);

	/** Tier label for the i-th shown layer (0-indexed), renumbered sequentially from `layers`. */
	function tierLabel(index: number): string {
		return `${t('recall.hint.tier-prefix')} ${index + 1} · ${TIER_TITLE[layers[index]]}`;
	}

	function reveal() {
		if (shownDepth === 0) onOpen?.();
		shownDepth = Math.min(shownDepth + 1, layers.length);
	}
</script>

{#if chord.recognized}
	<div class="hint-ladder" data-testid="hint-ladder">
		<div class="hints">
			{#each layers.slice(0, shownDepth) as layer, index (layer)}
				<div class="hint stamp" data-testid="hint-layer" data-layer={layer}>
					<p class="text-label text-muted font-mono uppercase">
						{tierLabel(index)}
					</p>
					{#if layer === 'family'}
						{#if familyBody}
							<p class="text-body mt-2">{familyBody}</p>
						{/if}
					{:else if layer === 'formula'}
						<p class="text-body mt-2">{sentence}</p>
						<div class="mt-2">
							<IntervalScaffold {entries} level="full" />
						</div>
					{:else if layer === 'keyboard'}
						<div class="hint-keyboard mt-2">
							<PianoKeyboard notes={chord.notes} octaves={1} inspectable />
						</div>
					{:else if layer === 'spelling'}
						<div class="mt-2">
							<ChordGlyph root={chord.root} quality={qualitySuffix} />
						</div>
						<div class="mt-2 flex flex-wrap gap-4" data-testid="hint-note-boxes">
							{#each chord.notes as note (note.role + note.letter)}
								<div
									class="inline-block border-2 p-2"
									style={`border-color: var(--color-ink); background-color: var(--color-${note.role}); color: var(--color-on-${note.role});`}
								>
									<NoteLabel letter={note.letter} solfege={note.solfege} highlighted />
								</div>
							{/each}
						</div>
						{#if third}
							<div class="mt-2">
								<SongHook short={third.label} />
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		{#if shownDepth < layers.length}
			<div class="hint-cta mt-6" data-testid="hint-cta">
				<Button type="button" variant="ghost" onclick={reveal}>{controlLabel}</Button>
			</div>
		{:else}
			<p class="hint-closing-line text-label mt-6" data-testid="hint-closing-line">
				{t('recall.hint.closing')}
			</p>
		{/if}
	</div>
{/if}

<style>
	/* @keyframes stamp-in lives in app.css (shared with RecallSession's own
	   .stamp, PianoKeyboard, ChordGlyph) - reused verbatim, no new keyframe. */
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/* D-01: stacked, already-revealed hint blocks read as one continuous
	   "receipt" of escalating help. 3px is a documented raw micro-value in
	   this design system (ScaleDegreeStrip, Button's letterpress shadow,
	   ChordGlyph's shadow offset all use raw px outside the *4 spacing
	   scale), not a new token or an oversight. */
	.hints {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hint {
		background: var(--color-paper-bright);
		padding: var(--spacing-md);
	}

	/* Layer 3 stays a compact "mini" keyboard regardless of the surrounding
	   card's width (UI-SPEC "Mobile / Responsive"). */
	.hint-keyboard {
		max-width: 320px;
	}

	.hint-closing-line {
		color: var(--color-muted);
		font-style: italic;
	}

	/* D-02 quiet ghost control: reuses Button variant="ghost" with a scoped
	   override rather than a new Button variant (UI-SPEC §Color, mirrors
	   RecallSession's own :global(.ps-button) override precedent). */
	.hint-cta :global(.ps-button--ghost) {
		border-style: dashed;
		border-color: var(--color-faint);
		color: var(--color-muted);
		width: 100%;
	}
	.hint-cta:hover :global(.ps-button--ghost),
	.hint-cta:focus-within :global(.ps-button--ghost) {
		border-style: solid;
		border-color: var(--color-ink);
		color: var(--color-ink);
	}
</style>
