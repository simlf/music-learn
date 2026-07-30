<script lang="ts">
	import { untrack } from 'svelte';
	import { Note } from 'tonal';
	import {
		fullStackNotes,
		hasDrillableShell,
		hasFlatFifth,
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
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
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
		/**
		 * `firstTry` (B3) reports whether the reveal was reached with no wrong
		 * Check on this chord. A wrong play retries and never gates, so every
		 * completion is eventually correct and the host cannot read "completed"
		 * as "right" - it needs this to grade the item honestly.
		 */
		onComplete?: (firstTry: boolean) => void;
	}

	let { embedSymbol, onComplete }: Props = $props();

	type VoicingStyle = 'root' | 'shell' | 'rootless';

	/**
	 * Draws a fresh 7th-chord symbol from the shared fact catalog's
	 * seventh-bearing family (25-02), skipping anything whose shell would have
	 * fewer than two notes to play (hasDrillableShell). Every symbol in today's
	 * 12x5 seventh matrix carries both guide tones, so the filter is a no-op
	 * now; it exists so the queued chart-vocabulary expansion (6 / m6 / sus4 /
	 * add9 / 9 / 13 / m(maj7)) cannot start drawing a chord the shell drill
	 * has no question for. Falls back to the unfiltered pool if the filter ever
	 * empties it, so this can never draw undefined.
	 */
	function drawSymbol(): string {
		const pool = seventhChordSymbols();
		const drillable = pool.filter((candidate) => hasDrillableShell(spellChord(candidate)));
		const symbols = drillable.length > 0 ? drillable : pool;
		return symbols[Math.floor(Math.random() * symbols.length)];
	}

	// embedSymbol is read once via untrack (mirrors BuildSession's embedFact
	// read): a deliberate init-time snapshot, not a reactive dependency - when
	// present, drawSymbol() is never called, per REG-01/T-27-02-01.
	let symbol = $state(untrack(() => embedSymbol ?? drawSymbol()));
	const chord = $derived(spellChord(symbol));

	/**
	 * Whether this chord is one of the ♭5 families (m7b5, dim7), which is what
	 * selects the `-flat5` variant of every rationale string below.
	 *
	 * The single generic rationale these variants replaced claimed the shell was
	 * "the 3rd + 7th tritone" and that the "fifth adds no color". Both halves
	 * were false for 3 of the 5 seventh families this drill draws from: the
	 * 3rd-to-7th interval is a tritone only in dom7 and dim7 (a perfect fifth in
	 * maj7, m7 and m7b5), and on a ♭5 chord the fifth IS the chord's identity.
	 * The truthful general rationale is guide tones (the 3rd names major/minor,
	 * the 7th names which seventh), with the ♭5 families as an explicit
	 * exception, matching shellNotes' own note-set split.
	 */
	const flatFifth = $derived(hasFlatFifth(chord));

	/**
	 * Whether this chord has a shell worth drilling at all (music-theory audit
	 * Bug E). A host can embed any symbol via embedSymbol, and the queued
	 * chart-vocabulary expansion will widen the draw pool, so a chord missing a
	 * guide tone (C6's shell is one note, Csus4's is none) has to be handled
	 * rather than rendered as an unanswerable question: with an empty target,
	 * matchChord rejects every play and the learner cannot get out of the retry
	 * loop. Every symbol in today's seventh matrix is drillable, so this is
	 * false for nothing the drill currently draws.
	 */
	const drillableShell = $derived(hasDrillableShell(chord));

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
	 * Step-tab free navigation (UAT V1 fix): the three pedagogy stages are
	 * user-navigable at any time for the current chord, so the player can
	 * freely move Voir<->Retirer<->Exo to learn or practice, instead of the
	 * step tabs only ever reflecting the FSRS-derived `stage`. `null` means
	 * "no override" - the tabs show the real derived `stage`; a non-null
	 * value overrides it until the next chord (`next()` resets this to null)
	 * or another tab click.
	 */
	let activeStage = $state<VoicingStage | null>(null);

	/** The stage whose content is currently rendered: the user's override when set, else the real derived `stage`. */
	const effectiveStage = $derived(activeStage ?? stage);

	/**
	 * Step-tab click handler: sets the active override to whichever tab was
	 * clicked (meet/subtract/drill alike), starting the newly-shown stage's
	 * per-attempt state clean (a stage switch is never mid-question).
	 */
	function selectStep(target: VoicingStage) {
		if (target === effectiveStage) return;
		activeStage = target;
		selected = new Set();
		answered = false;
		wrongRetry = false;
	}

	let voicingStyle = $state<VoicingStyle>('shell');
	let selected = $state<Set<string>>(new Set());
	/** True only once a CORRECT play has been graded (the reveal + Next state). A wrong play never sets this - it never gates (see wrongRetry). */
	let answered = $state(false);
	/** Transient: true right after a wrong Check, cleared on the next key toggle/style pick/Check. */
	let wrongRetry = $state(false);
	/**
	 * Sticky for this chord (B3): set by ANY wrong Check, cleared only when a
	 * fresh chord is drawn. `wrongRetry` is transient by design (it clears on
	 * the next tap), so it cannot answer "was this chord earned on the first
	 * try", which is what the embedding host grades on.
	 */
	let missedOnce = $state(false);
	let pulseToken = $state(0);

	function noteSetFor(style: VoicingStyle): SpelledNote[] {
		if (style === 'root') return fullStackNotes(chord);
		if (style === 'rootless') return rootlessNotes(chord);
		return shellNotes(chord);
	}

	/**
	 * The grading target follows `effectiveStage` (whichever stage the user is
	 * currently viewing/answering), not the FSRS-derived `stage`: the subtract
	 * stage always grades the shell (2 notes), the drill stage's selector
	 * varies the target, and meet is reference-only (never rendered with a
	 * Check control, so this value is inert there).
	 */
	const targetNotes = $derived(
		effectiveStage === 'drill' ? noteSetFor(voicingStyle) : shellNotes(chord)
	);

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

	/**
	 * Nudge toggle (VOICE-01, sketch 022 variant A): the drill-stage nudges
	 * replace the former Fond./Shell/Sans fond. 3-way selector. Style becomes
	 * a by-product of what the player adds/removes rather than a mode they
	 * pick up front - the drill starts on the shell, and each nudge toggles
	 * between shell and its target voicing (tapping an already-active nudge
	 * returns to shell). Deliberately does NOT clear `selected` (UAT V3 fix
	 * preserved) - the player's already-tapped notes must survive a nudge tap,
	 * since the notes typically overlap across voicings and re-tapping from
	 * scratch after every switch was the reported friction. `wrongRetry` still
	 * clears since it was surfaced against the previous voicing's target.
	 */
	function setVoicing(style: VoicingStyle) {
		if (effectiveStage !== 'drill' || answered) return;
		voicingStyle = voicingStyle === style ? 'shell' : style;
		wrongRetry = false;
	}

	/** The i18n key naming the current by-product voicing (shell/full/rootless), for the current-voicing line. */
	const currentVoicingNameKey = $derived(
		voicingStyle === 'root'
			? 'voicings.voicing.full'
			: voicingStyle === 'rootless'
				? 'voicings.voicing.rootless'
				: 'voicings.voicing.shell'
	);

	/**
	 * Check: grades the selected chroma against `targetNotes` (never letter
	 * strings, per matchChord's contract), for whichever stage is currently
	 * `effectiveStage` (the user-navigable stage, UAT V1). A correct play
	 * sets `answered` (the reveal + Next state) and plays the revealed
	 * voicing back as audio (UAT V4) so the learner hears the guide tones,
	 * not just sees them; a wrong play never gates - it just shows a gentle
	 * retry and clears the selection so the learner can play again.
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
		if (!correct && effectiveStage === 'subtract') {
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
			void ensureAudioReady();
			playChord(targetNotes.map((note) => note.letter));
		} else {
			wrongRetry = true;
			missedOnce = true;
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
			onComplete(!missedOnce);
			return;
		}
		symbol = drawSymbol();
		selected = new Set();
		answered = false;
		wrongRetry = false;
		missedOnce = false;
		voicingStyle = 'shell';
		activeStage = null;
	}

	/** Got it (meet stage): marks the compare intro shown for this chord and re-derives the stage (fades to subtract). */
	function gotIt() {
		markVoicingMet(symbol);
		metVersion += 1;
		selected = new Set();
	}

	const glyphQuality = $derived(chord.symbol.slice(chord.root.length));

	/**
	 * Drill-stage instruction (G5 UAT fix): names the currently selected
	 * voicing style, so switching Fond./Shell/Sans fond. visibly changes what
	 * the player is asked to play, instead of the same vague "Play it." for
	 * every style. The subtract stage keeps its own fixed shell-only prompt
	 * (that stage has no style selector).
	 */
	function drillPrompt(style: VoicingStyle): string {
		if (style === 'root') return t('voicings.prompt.playFull');
		if (style === 'rootless') return t('voicings.prompt.playRootless');
		return shellPrompt();
	}

	/** "Play the shell" prompt, naming the ♭5 when the shell actually carries one. */
	function shellPrompt(): string {
		return flatFifth ? t('voicings.prompt.playShell-flat5') : t('voicings.prompt.playShell');
	}
</script>

<div data-testid="shell-voicing-drill">
	<!-- Stage UI is gated on the current chord's deck read (WR-05): rendering
	     before it lands would flash a stage derived from the PREVIOUS chord's
	     cards, and a fast "Got it" tap in that window would mark the wrong
	     chord met. -->
	{#if cardsLoaded}
	<!-- Bug E guard: a chord whose shell has fewer than two notes has no
	     answerable "play the guide tones" question (matchChord against an empty
	     target rejects every play), so say so and offer the next chord instead
	     of rendering an unwinnable drill. Nothing in today's seventh matrix
	     lands here; embedSymbol and the queued vocabulary expansion can. -->
	{#if !drillableShell}
	<div data-testid="shell-unavailable">
		<div class="mt-4 mb-4" data-testid="target-glyph">
			<ChordGlyph root={chord.root} quality={glyphQuality} />
		</div>
		<p class="text-body">{t('voicings.shell.unavailable')}</p>
		<div class="mt-4">
			<Button type="button" variant="primary" onclick={next}>
				{t('voicings.button.next')}
			</Button>
		</div>
	</div>
	{:else}
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
						<span class="vcard__use"
							>{flatFifth
								? t('voicings.compare.useCaption-flat5')
								: t('voicings.compare.useCaption')}</span
						>
					</div>
					<PianoKeyboard notes={shellNotes(chord)} inspectable />
				</div>
			</div>
			<!-- Meet is freely user-navigable (UAT V1): Got it stays available
			     whenever this stage is the one showing, real or revisited - it
			     is idempotent against an already-met chord. -->
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={gotIt}>
					{t('voicings.button.gotIt')}
				</Button>
			</div>
		</div>
	{:else}
		<div data-testid={effectiveStage === 'drill' ? 'stage-drill' : 'stage-subtract'}>
			<!-- Target chord symbol (UAT V2 fix): always visible on both the
			     subtract and drill stages, before AND after answering, so the
			     player always knows which chord they are voicing. -->
			<div class="mt-4 mb-4" data-testid="target-glyph">
				<ChordGlyph root={chord.root} quality={glyphQuality} />
			</div>
			{#if effectiveStage === 'subtract'}
				<div class="teach-panel" data-testid="teach-panel">
					<p>{flatFifth ? t('voicings.subtract.teach-flat5') : t('voicings.subtract.teach')}</p>
				</div>
			{:else}
				<div
					class="voicing-nudges"
					data-testid="voicing-nudges"
					role="group"
					aria-label={t('voicings.aria.nudgeGroup')}
				>
					<button
						type="button"
						class="nudge"
						class:nudge--on={voicingStyle === 'root'}
						aria-pressed={voicingStyle === 'root'}
						onclick={() => setVoicing('root')}
					>
						<span class="op" aria-hidden="true">+</span>
						{t('voicings.nudge.addRoot')}
					</button>
					<button
						type="button"
						class="nudge"
						class:nudge--on={voicingStyle === 'rootless'}
						aria-pressed={voicingStyle === 'rootless'}
						onclick={() => setVoicing('rootless')}
					>
						<span class="op" aria-hidden="true">&minus;</span>
						{t('voicings.nudge.removeBass')}
					</button>
				</div>
				<p class="layers" data-testid="current-voicing">
					{t('voicings.current.label')} {t(currentVoicingNameKey)}
				</p>
			{/if}

			<p class="text-body mt-4">
				{effectiveStage === 'subtract' ? shellPrompt() : drillPrompt(voicingStyle)}
			</p>

			<div class="mt-4">
				<PianoKeyboard
					notes={answered ? targetNotes : []}
					interactive={!answered}
					selected={answered ? undefined : selected}
					onToggle={answered ? undefined : toggleKey}
					ghostKeys={effectiveStage === 'subtract' ? ghostKeys : undefined}
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

	/*
	 * Mobile-first: single column by default so each `.vcard` (and the
	 * `PianoKeyboard` inside it) gets the full card width on phone, matching
	 * this component's own documented "compare card... stacked" intent
	 * (contextual-learning-metacognition.md) instead of squeezing a
	 * half-column PianoKeyboard's measured container width. Two-column layout
	 * is an enhancement at the app's existing 640px-class breakpoint (mirrors
	 * app.css's `@media (max-width: 639.98px)` convention, inverted as the
	 * min-width equivalent).
	 */
	/*
	 * `minmax(0, 1fr)`, never a bare `1fr`: a grid track sized `1fr` still takes
	 * its item's MIN-CONTENT width as a floor, and a `.vcard`'s min-content
	 * width includes the `PianoKeyboard` board's own `min-width` px floor. On a
	 * 390px viewport that measured 680px cards holding 660px (two-octave!)
	 * boards, with the page scrolling sideways to 688px - and it was
	 * self-fulfilling: the board's pre-measurement default span is two octaves,
	 * whose 660px floor inflated the card, so the component's ResizeObserver
	 * then measured 660px and concluded two octaves fit. `minmax(0, ...)` plus
	 * `.vcard { min-width: 0 }` lets the track collapse to the real available
	 * width, which is what PianoKeyboard must measure to size itself honestly.
	 */
	.vcards {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-md);
	}

	@media (min-width: 640px) {
		.vcards {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.vcard {
		border: 2px solid var(--color-ink);
		padding: var(--spacing-sm);
		/* See `.vcards`: without this the card imposes its content's intrinsic width on the grid track. */
		min-width: 0;
	}

	/*
	 * flex-wrap allows the right-aligned `.vcard__use` caption to wrap onto its
	 * own line within the card instead of clipping off the right edge once the
	 * card column narrows (phone default) - `min-width: 0` on both children is
	 * required for a flex child to actually shrink/wrap instead of imposing its
	 * content's intrinsic width as a floor on the row.
	 */
	.vcard__head {
		display: flex;
		flex-wrap: wrap;
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
		min-width: 0;
	}

	.vcard__use {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
		min-width: 0;
	}

	@media (min-width: 640px) {
		.vcard__use {
			text-align: right;
		}
	}

	.teach-panel {
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.voicing-nudges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
	}

	.nudge {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--color-ink);
		border-radius: 0;
		background: var(--color-paper-bright);
		color: var(--color-ink);
		min-height: 44px;
	}

	.nudge--on {
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}

	.op {
		font-size: 1.1em;
	}

	.layers {
		font-family: var(--font-mono);
		color: var(--color-muted);
		margin-top: var(--spacing-sm);
	}

	.retry {
		color: var(--color-vermilion);
	}
</style>
