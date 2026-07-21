<script lang="ts">
	import { Note } from 'tonal';
	import {
		fullStackNotes,
		optionalMarkers,
		rootlessNotes,
		seventhChordSymbols,
		shellNotes,
		voicingStageForChord,
		type VoicingStage
	} from '$lib/practice/shellVoicing';
	import { hasVoicingMet, markVoicingMet } from '$lib/practice/voicingMet';
	import { getAllCards, type CardRecord } from '$lib/srs/deck';
	import { matchChord } from '$lib/drills/matchChord';
	import { spellChord } from '$lib/theory/chord';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { toAscendingPitches } from '$lib/audio/voicing';
	import type { SpelledNote } from '$lib/theory/types';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Sketch-019 synthesis (LOCKED, SK-019): "shell voicings, staged by card
	 * state." Extends the 005 fading-scaffold rule from label hints to
	 * voicing pedagogy - one flow, three stages keyed to a chord's FSRS card
	 * maturity via 25-02's voicingStageForChord: meet (compare intro, once
	 * per chord via voicingMet), subtract (drain root+fifth to the 25-03
	 * ghost-hatch treatment), drill (cold Root/Shell/Rootless selector).
	 *
	 * Reads the deck (getAllCards) only, to derive maturity - this drill
	 * never grades the deck or mutates FSRS scheduling state in any way. The
	 * shell (or selected style's) answer is graded by chroma (matchChord)
	 * against 25-02's note-subset exports.
	 */

	type VoicingStyle = 'root' | 'shell' | 'rootless';

	/** Draws a fresh 7th-chord symbol from the shared fact catalog's seventh-bearing family (25-02). */
	function drawSymbol(): string {
		const symbols = seventhChordSymbols();
		return symbols[Math.floor(Math.random() * symbols.length)];
	}

	let symbol = $state(drawSymbol());
	const chord = $derived(spellChord(symbol));

	let cards = $state<CardRecord[]>([]);

	async function loadCards(forSymbol: string) {
		const all = await getAllCards();
		cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
	}

	$effect(() => {
		void loadCards(symbol);
	});

	/** Bumped by gotIt() to force `stage` to re-derive after a localStorage-only change (symbol itself doesn't change). */
	let metVersion = $state(0);

	/**
	 * The active pedagogy stage: voicingStageForChord's maturity mapping,
	 * EXCEPT a 'meet' chord whose compare intro has already been shown
	 * (hasVoicingMet) advances straight to 'subtract' - the compare card
	 * shows once per chord, then it is scaffolding to fade.
	 */
	const stage = $derived.by((): VoicingStage => {
		void metVersion;
		const derived = voicingStageForChord(cards);
		if (derived === 'meet' && hasVoicingMet(symbol)) return 'subtract';
		return derived;
	});

	let voicingStyle = $state<VoicingStyle>('shell');
	let selected = $state<Set<string>>(new Set());
	/** True only once a CORRECT play has been graded (the reveal + Next state). A wrong play never sets this - it never gates (see wrongRetry). */
	let answered = $state(false);
	/** Transient: true right after a wrong Check, cleared on the next key toggle/style pick/Check. */
	let wrongRetry = $state(false);
	let pulseToken = $state(0);

	function noteSetFor(style: VoicingStyle): SpelledNote[] {
		if (style === 'root') return fullStackNotes(chord);
		if (style === 'rootless') return rootlessNotes(chord);
		return shellNotes(chord);
	}

	/** The subtract stage always grades the shell (2 notes); only the drill stage's selector varies the target. */
	const targetNotes = $derived(stage === 'drill' ? noteSetFor(voicingStyle) : shellNotes(chord));

	/** letter -> octave for the full 4-note stack's ascending root-position voicing (mirrors $lib/audio/voicing.ts's own ascending assignment), so ghostKeys can key the root/fifth markers correctly. */
	function pitchOctaveByLetter(notes: SpelledNote[]): Map<string, number> {
		const pitches = toAscendingPitches(notes.map((note) => note.letter));
		const map = new Map<string, number>();
		notes.forEach((note, i) => {
			map.set(note.letter, Note.octave(pitches[i]) ?? 4);
		});
		return map;
	}

	/** The subtract stage's ghost-hatched root+fifth markers (25-03's PianoKeyboard ghostKeys prop). */
	const ghostKeys = $derived.by(() => {
		const stack = fullStackNotes(chord);
		const octaveByLetter = pitchOctaveByLetter(stack);
		return optionalMarkers(chord).map((marker) => ({
			letter: marker.letter,
			octave: octaveByLetter.get(marker.letter) ?? 4,
			marker: marker.marker
		}));
	});

	function toggleKey(letter: string) {
		if (answered) return;
		wrongRetry = false;
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	function selectStyle(style: VoicingStyle) {
		if (stage !== 'drill' || answered) return;
		voicingStyle = style;
		selected = new Set();
		wrongRetry = false;
	}

	/**
	 * Check: grades the selected chroma against `targetNotes` (never letter
	 * strings, per matchChord's contract). A correct play sets `answered`
	 * (the reveal + Next state); a wrong play never gates - it just shows a
	 * gentle retry and clears the selection so the learner can play again.
	 */
	function check() {
		const target = { ...chord, notes: targetNotes };
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		if (result.correct) {
			answered = true;
			wrongRetry = false;
			pulseToken += 1;
		} else {
			wrongRetry = true;
			selected = new Set();
		}
	}

	/** Next: draws a fresh chord and fully resets the per-question state. */
	function next() {
		symbol = drawSymbol();
		selected = new Set();
		answered = false;
		wrongRetry = false;
		voicingStyle = 'shell';
	}

	/** Got it (meet stage): marks the compare intro shown for this chord and re-derives the stage (fades to subtract). */
	function gotIt() {
		markVoicingMet(symbol);
		metVersion += 1;
		selected = new Set();
	}

	const glyphQuality = $derived(chord.symbol.slice(chord.root.length));

	const VOICING_STYLES: VoicingStyle[] = ['root', 'shell', 'rootless'];

	function styleLabel(style: VoicingStyle): string {
		if (style === 'root') return t('voicings.selector.root');
		if (style === 'rootless') return t('voicings.selector.rootless');
		return t('voicings.selector.shell');
	}
</script>

<div data-testid="shell-voicing-drill">
	<div class="step-indicator" data-testid="step-indicator" role="group" aria-label={t('voicings.aria.stepGroup')}>
		<span
			class="step"
			class:step--active={stage === 'meet'}
			data-testid="step-meet"
		>
			{t('voicings.step.meet')}
		</span>
		<span
			class="step"
			class:step--active={stage === 'subtract'}
			data-testid="step-subtract"
		>
			{t('voicings.step.subtract')}
		</span>
		<span
			class="step"
			class:step--active={stage === 'drill'}
			data-testid="step-drill"
		>
			{t('voicings.step.drill')}
		</span>
	</div>

	{#if stage === 'meet'}
		<div data-testid="stage-meet">
			<div class="vcards">
				<div class="vcard" data-testid="compare-know">
					<div class="vcard__head">
						<h4 class="vcard__label">{t('voicings.compare.knowLabel')}</h4>
						<span class="vcard__use">{t('voicings.compare.knowCaption')}</span>
					</div>
					<PianoKeyboard notes={fullStackNotes(chord)} />
				</div>
				<div class="vcard" data-testid="compare-use">
					<div class="vcard__head">
						<h4 class="vcard__label">{t('voicings.compare.useLabel')}</h4>
						<span class="vcard__use">{t('voicings.compare.useCaption')}</span>
					</div>
					<PianoKeyboard notes={shellNotes(chord)} />
				</div>
			</div>
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={gotIt}>
					{t('voicings.button.gotIt')}
				</Button>
			</div>
		</div>
	{:else}
		<div data-testid={stage === 'drill' ? 'stage-drill' : 'stage-subtract'}>
			{#if stage === 'subtract'}
				<div class="teach-panel" data-testid="teach-panel">
					<p>{t('voicings.subtract.teach')}</p>
				</div>
			{:else}
				<div
					class="voicing-row"
					data-testid="voicing-selector"
					role="group"
					aria-label={t('voicings.aria.selectorGroup')}
				>
					{#each VOICING_STYLES as style (style)}
						<button
							type="button"
							class="vchip"
							class:vchip--on={voicingStyle === style}
							aria-pressed={voicingStyle === style}
							onclick={() => selectStyle(style)}
						>
							{styleLabel(style)}
						</button>
					{/each}
				</div>
			{/if}

			<p class="text-body mt-4">
				{stage === 'subtract' ? t('voicings.prompt.playShell') : t('voicings.prompt.playStyle')}
			</p>

			<div class="mt-4">
				<PianoKeyboard
					notes={answered ? targetNotes : []}
					interactive={!answered}
					selected={answered ? undefined : selected}
					onToggle={answered ? undefined : toggleKey}
					ghostKeys={stage === 'subtract' ? ghostKeys : undefined}
					pulseToken={answered ? pulseToken : undefined}
				/>
			</div>

			{#if !answered}
				<div class="mt-4">
					<Button type="button" variant="primary" disabled={selected.size === 0} onclick={check}>
						{t('voicings.button.check')}
					</Button>
				</div>
				{#if wrongRetry}
					<p class="retry mt-4" data-testid="retry">{t('voicings.retry.wrong')}</p>
				{/if}
			{:else}
				<div class="mt-4 flex items-center gap-4" data-testid="reveal">
					<ChordGlyph root={chord.root} quality={glyphQuality} stamped pulseToken={pulseToken} />
					<p class="text-body">{t('voicings.correct.confirm')}</p>
				</div>
				<div class="mt-4">
					<Button type="button" variant="primary" onclick={next}>
						{t('voicings.button.next')}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.step-indicator {
		display: flex;
		border: 1px solid var(--color-ink);
		margin-bottom: var(--spacing-md);
	}

	.step {
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		text-align: center;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-right: 1px solid var(--color-ink);
	}

	.step:last-child {
		border-right: none;
	}

	.step--active {
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}

	.vcards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}

	.vcard {
		border: 2px solid var(--color-ink);
		padding: var(--spacing-sm);
	}

	.vcard__head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
	}

	.vcard__label {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.vcard__use {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
		text-align: right;
	}

	.teach-panel {
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.voicing-row {
		display: flex;
		border: 1px solid var(--color-ink);
	}

	.vchip {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: var(--spacing-sm) 2px;
		border-right: 1px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-ink);
		min-height: 44px;
	}

	.vchip:last-child {
		border-right: none;
	}

	.vchip--on {
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}

	.retry {
		color: var(--color-vermilion);
	}
</style>
