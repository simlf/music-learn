<script lang="ts">
	import { untrack } from 'svelte';
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

	/**
	 * Embedding seam (27-02): when `embedSymbol` is provided, the drill's
	 * active chord is that symbol instead of a fresh drawSymbol() draw - the
	 * stage is still derived internally from that symbol's own deck read
	 * (voicingStageForChord unchanged, REG-01). `onComplete` (when provided
	 * alongside) replaces the standalone "Next" fresh-draw behavior: the same
	 * moment the standalone flow would draw a new chord, the embedded
	 * component instead calls onComplete() and leaves its own state
	 * (including the reveal) untouched, mirroring BuildSession's
	 * embedFact/onComplete precedent. Omitting both props leaves every
	 * render byte-identical to this component's pre-embedding behavior.
	 */
	interface Props {
		embedSymbol?: string;
		onComplete?: () => void;
	}

	let { embedSymbol, onComplete }: Props = $props();

	type VoicingStyle = 'root' | 'shell' | 'rootless';

	/** Draws a fresh 7th-chord symbol from the shared fact catalog's seventh-bearing family (25-02). */
	function drawSymbol(): string {
		const symbols = seventhChordSymbols();
		return symbols[Math.floor(Math.random() * symbols.length)];
	}

	// embedSymbol is read once via untrack (mirrors BuildSession's embedFact
	// read): a deliberate init-time snapshot, not a reactive dependency - when
	// present, drawSymbol() is never called, per REG-01/T-27-02-01.
	let symbol = $state(untrack(() => embedSymbol ?? drawSymbol()));
	const chord = $derived(spellChord(symbol));

	let cards = $state<CardRecord[]>([]);
	/**
	 * False while the current symbol's deck read is in flight. The stage UI is
	 * suppressed until the read lands, so a stale `cards` value (the previous
	 * chord's records, or the initial []) never renders the wrong pedagogy
	 * stage — and a fast "Got it" tap during that window can never write a
	 * spurious voicingMet mark for the new chord.
	 */
	let cardsLoaded = $state(false);

	/**
	 * Loads the deck records for `forSymbol`, guarded against staleness: by
	 * the time getAllCards resolves, a newer draw may have superseded this
	 * request (rapid Next taps), so a response for a symbol that is no longer
	 * `symbol` is dropped — otherwise the current chord's stage would be
	 * computed from another chord's maturity. (`symbol` is read after the
	 * await, so the effect below never tracks it twice.)
	 */
	async function loadCards(forSymbol: string) {
		cardsLoaded = false;
		const all = await getAllCards();
		if (forSymbol !== symbol) return; // stale response: a newer draw superseded it
		cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
		cardsLoaded = true;
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

	/**
	 * Step-tab review override (UAT bug C+D): a due card's derived `stage`
	 * often skips straight to 'subtract'/'drill', so there is no way back to
	 * the '1 Voir' compare intro for reference. Clicking a step tab that
	 * ISN'T the real `stage` sets this to that stage so its content renders
	 * instead; clicking the real stage's own tab (or the same override tab
	 * again) resets it to null. Only 'meet' has genuinely distinct read-only
	 * reference content (the compare cards, no grading state) - the drill/
	 * subtract tabs simply return to the real `stage` when clicked (RULE:
	 * never let a reviewed stage's controls grade against the wrong target),
	 * so `viewedStage` is only ever 'meet' or null in practice.
	 */
	let viewedStage = $state<VoicingStage | null>(null);

	/** The stage whose content is currently rendered: the review override when set, else the real derived `stage`. */
	const effectiveStage = $derived(viewedStage ?? stage);

	/**
	 * Step-tab click handler. Clicking the tab for the currently active real
	 * stage (or re-clicking an already-viewed 'meet' tab) always returns to
	 * the real stage; clicking 'meet' while it ISN'T the real stage shows the
	 * read-only compare reference (see `viewedStage`/`effectiveStage`).
	 */
	function selectStep(target: VoicingStage) {
		if (target === 'meet' && target !== stage) {
			viewedStage = viewedStage === 'meet' ? null : 'meet';
			return;
		}
		viewedStage = null;
	}

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

	/**
	 * PianoKeyboard's base (first-octave) octave. Ghost markers are pinned
	 * here rather than to the audio voicing's ascending octaves: any stack
	 * note that ascends past B lands in octave 5 (e.g. G7's fifth D5), which
	 * does not exist on a one-octave phone keyboard (C4..C5) — the marker
	 * would silently vanish on exactly the device class this app targets.
	 * Grading is chroma-based (octave-agnostic), so the audio octave buys
	 * nothing for the visual hint; octave 4 always exists on every span.
	 */
	const KEYBOARD_BASE_OCTAVE = 4;

	/** The subtract stage's ghost-hatched root+fifth markers (25-03's PianoKeyboard ghostKeys prop), pinned to the keyboard's base octave (see KEYBOARD_BASE_OCTAVE). */
	const ghostKeys = $derived.by(() =>
		optionalMarkers(chord).map((marker) => ({
			letter: marker.letter,
			octave: KEYBOARD_BASE_OCTAVE,
			marker: marker.marker
		}))
	);

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
	 *
	 * Subtract stage only: the ghost-hatched root/fifth are "allowed but not
	 * required" (PianoKeyboard's ghostKeys contract, SK-019), so playing the
	 * shell PLUS a ghost-marked note still grades correct - the shell notes
	 * stay required (missing any of them is still wrong), and any extra that
	 * is NOT a ghost-marked optional note is still wrong. The drill stage
	 * keeps matchChord's exact-set rule: the selected style IS the answer.
	 */
	function check() {
		const target = { ...chord, notes: targetNotes };
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		let correct = result.correct;
		if (!correct && stage === 'subtract') {
			const optionalChroma = new Set(
				optionalMarkers(chord).map((marker) => Note.chroma(toAsciiAccidentals(marker.letter)))
			);
			correct =
				result.missing.length === 0 && result.extra.every((chroma) => optionalChroma.has(chroma));
		}
		if (correct) {
			answered = true;
			wrongRetry = false;
			pulseToken += 1;
		} else {
			wrongRetry = true;
			selected = new Set();
		}
	}

	/**
	 * Next: draws a fresh chord and fully resets the per-question state. When
	 * embedded (onComplete provided), the round is over: call onComplete()
	 * instead and leave the current reveal/state untouched (27-02) - the host
	 * owns advancing to the next queue item, not a fresh drawSymbol() draw.
	 */
	function next() {
		if (onComplete) {
			onComplete();
			return;
		}
		symbol = drawSymbol();
		selected = new Set();
		answered = false;
		wrongRetry = false;
		voicingStyle = 'shell';
		viewedStage = null;
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
	<!-- Stage UI is gated on the current chord's deck read (WR-05): rendering
	     before it lands would flash a stage derived from the PREVIOUS chord's
	     cards, and a fast "Got it" tap in that window would mark the wrong
	     chord met. -->
	{#if cardsLoaded}
	<div class="step-indicator" data-testid="step-indicator" role="group" aria-label={t('voicings.aria.stepGroup')}>
		<button
			type="button"
			class="step"
			class:step--active={effectiveStage === 'meet'}
			aria-pressed={effectiveStage === 'meet'}
			data-testid="step-meet"
			onclick={() => selectStep('meet')}
		>
			{t('voicings.step.meet')}
		</button>
		<button
			type="button"
			class="step"
			class:step--active={effectiveStage === 'subtract'}
			aria-pressed={effectiveStage === 'subtract'}
			data-testid="step-subtract"
			onclick={() => selectStep('subtract')}
		>
			{t('voicings.step.subtract')}
		</button>
		<button
			type="button"
			class="step"
			class:step--active={effectiveStage === 'drill'}
			aria-pressed={effectiveStage === 'drill'}
			data-testid="step-drill"
			onclick={() => selectStep('drill')}
		>
			{t('voicings.step.drill')}
		</button>
	</div>

	{#if effectiveStage === 'meet'}
		<div data-testid="stage-meet">
			<div class="meet-glyph mb-4" data-testid="meet-glyph">
				<ChordGlyph root={chord.root} quality={glyphQuality} />
			</div>
			<div class="vcards">
				<div class="vcard" data-testid="compare-know">
					<div class="vcard__head">
						<h4 class="vcard__label">{t('voicings.compare.knowLabel')}</h4>
						<span class="vcard__use">{t('voicings.compare.knowCaption')}</span>
					</div>
					<PianoKeyboard notes={fullStackNotes(chord)} inspectable />
				</div>
				<div class="vcard" data-testid="compare-use">
					<div class="vcard__head">
						<h4 class="vcard__label">{t('voicings.compare.useLabel')}</h4>
						<span class="vcard__use">{t('voicings.compare.useCaption')}</span>
					</div>
					<PianoKeyboard notes={shellNotes(chord)} inspectable />
				</div>
			</div>
			{#if viewedStage === null}
				<!-- Got it only advances the REAL meet stage: when this compare
				     content is showing as a reviewed reference (viewedStage set
				     while the real stage has already moved on), the action that
				     mutates the meet-shown mark is hidden - reference only. -->
				<div class="mt-4">
					<Button type="button" variant="primary" onclick={gotIt}>
						{t('voicings.button.gotIt')}
					</Button>
				</div>
			{/if}
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
		border: none;
		border-right: 1px solid var(--color-ink);
		border-radius: 0;
		background: var(--color-paper-bright);
		color: var(--color-ink);
		min-height: 44px;
		cursor: pointer;
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
