<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import { Note } from 'tonal';
	import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
	import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
	import {
		createChordConstruction,
		createScaleConstruction,
		expectedStep,
		gradeConstructionTap,
		isNotableSpelling
	} from '$lib/practice/construction';
	import type { ConstructionState, ConstructionStep } from '$lib/practice/construction';
	import {
		intervalFromRoot,
		phraseStep,
		toAsciiAccidentals,
		transposeFrom
	} from '$lib/theory/interval';
	import { blackKeysForOctaves } from './keyboardLayout';
	import { getCard, recordGrade, type CardRecord } from '$lib/srs/deck';
	import { newCard, Rating } from '$lib/srs/scheduler';
	import { scaleFormulaFactId } from '$lib/srs/facts';
	import { ensureAudioReady, playArpeggio, playChord, soundEnabled, studyModeEnabled } from '$lib/audio/audio';
	import { currentLocale, t, type MessageKey } from '$lib/i18n/locale.svelte';
	import { toAscendingPitches } from '$lib/audio/voicing';
	import Button from './Button.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';

	/**
	 * Build It (BUILD-01/02/03): drives the picker (kind toggle, root/quality
	 * chord chips or tonic scale chips) and, once a full target is picked, the
	 * full construction step loop (register/step/WHY, keyboard wiring via
	 * gradeConstructionTap, both wrong-tap diagnostic branches, the running
	 * formula strip, and D-07's ~650ms pacing). Self-contained, no props.
	 *
	 * `construction` drives the keyboard/formula-strip fill and always
	 * reflects the latest graded state immediately (so a correct tap's key
	 * fills and the strip grows right away). `promptState` drives the
	 * register/step/WHY copy and only advances once the 650ms feedback pace
	 * elapses - so a correct tap's confirmation is read before the NEXT
	 * step's prompt appears, matching D-07. Wrong taps never diverge the two
	 * (no position/earnedNotes change), so promptState updates immediately
	 * for those.
	 */

	/**
	 * Embedding seam (13-05, Mode C): when `embedFact` is provided, BuildSession
	 * skips its own picker entirely and starts construction immediately for the
	 * given fact; `onComplete` (when provided alongside) replaces the
	 * standalone completion CTAs ("Build Another"/"Recall It Now") with a
	 * single "Next" and suppresses the "SAVED TO RECALL" status line, since the
	 * embedding surface (RecallSession) already IS Recall. Omitting both props
	 * leaves every render byte-identical to this component's pre-embedding
	 * behavior.
	 */
	interface Props {
		embedFact?: { kind: 'chord'; symbol: string } | { kind: 'scale'; tonic: string };
		onComplete?: () => void;
	}

	let { embedFact, onComplete }: Props = $props();

	type SessionState = 'picking' | 'building' | 'complete';
	type Kind = 'chords' | 'scales';

	interface Feedback {
		kind: 'correct' | 'wrong-pitch-class' | 'wrong-octave';
		headline: string;
		semitones?: number;
		direction?: 'high' | 'low';
		/** Set only on a 'correct' outcome whose earned letter satisfies isNotableSpelling (BUILD-03). */
		notable?: boolean;
		commonName?: string;
		actualName?: string;
		intervalWord?: string;
	}

	let sessionState = $state<SessionState>('picking');
	let kind = $state<Kind>('chords');
	let pickedRoot = $state<string | undefined>();
	let pickedQuality = $state<string | undefined>();
	let pickedTonic = $state<string | undefined>();
	let construction = $state<ConstructionState | undefined>();
	let promptState = $state<ConstructionState | undefined>();
	/** Opt-in count-up hint reveal (BUILD-03, D-08): chords only, stays revealed for the rest of the current target's session, reset alongside the other per-target fields below. */
	let countUpRevealed = $state(false);
	/** The ORIGINAL ASCII chord symbol (e.g. "F#m7") that started this chord construction - construction.label is the display-glyph form and is NOT safe to reuse for the factId (BUILD-04, D-09). Unused for scale targets. */
	let startedSymbol: string | undefined = $state();
	/** Whether recordConstructionOutcome's best-effort FSRS write succeeded, driving the completion summary's "SAVED TO RECALL" status line (BUILD-04). */
	let fsrsSaved = $state(false);
	/** Bumped once per reveal (initial completion) and once per "Hear again" tap (HEAR-01/02): drives PianoKeyboard's and ChordGlyph's shared pulse-once retrigger. Starts at 0 (no pulse before any reveal has happened). */
	let revealPulseToken = $state(0);
	/** Study-mode arpeggio roll (HEAR-02): earned { letter, octave } keys still "pending" (dimmed) awaiting their turn to sound, mirroring flashWrongKey's octave-discriminating shape so a scale's duplicate-tonic octave un-dims independently. Empty outside a study-mode roll, so the complete-block PianoKeyboard renders byte-identical to a non-study reveal. */
	let pendingKeys = $state<{ letter: string; octave: number }[]>([]);
	let feedback = $state<Feedback | undefined>();
	let flashKey = $state<{ letter: string; octave: number } | null>(null);
	/** The letter last tapped (kept beyond the 320ms flash window so the wrong-octave restatement, shown for the full 650ms, can still name it). */
	let lastTappedLetter = $state('');
	let confirmationIndex = $state(-1);
	let wrongIndex = $state(-1);
	let containerEl: HTMLDivElement | undefined = $state();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
	/** One timer per earned note (pending -> lit) plus one final block-strike timer, for the study-mode arpeggio roll (HEAR-02). Always cleared before rescheduling and on reset/destroy, mirroring flashTimer/feedbackTimer's own discipline. */
	let rollTimers: ReturnType<typeof setTimeout>[] = [];
	/** Stagger between each arpeggio note's sound/lighting, per the UI-SPEC's Arpeggio Roll Contract. */
	const ARPEGGIO_STAGGER_MS = 260;

	/**
	 * Right-answer confirmation variants (D-08): rotated with a
	 * no-immediate-repeat picker, mirroring drills/+page.svelte's own
	 * CORRECT_VARIANTS/pickVariant convention. `$derived.by` so a live locale
	 * flip re-renders the FR variants (I18N-02, mirrors RecallSession's
	 * CORRECT_VARIANTS/WRONG_VARIANTS pattern from 20-02).
	 */
	const CORRECT_VARIANTS = $derived.by(() => [
		t('build.confirm.0'),
		t('build.confirm.1'),
		t('build.confirm.2'),
		t('build.confirm.3')
	]);
	/** Wrong-answer headline variants, reused verbatim from Drills. */
	const WRONG_VARIANTS = $derived.by(() => [t('build.wrong.0'), t('build.wrong.1'), t('build.wrong.2')]);

	/** Picks a variant, avoiding an immediate repeat (loop-free, mirrors drills/+page.svelte's pickVariant). */
	function pickVariant(variants: string[], lastIndex: number): [string, number] {
		if (variants.length === 1) return [variants[0], 0];
		let index = Math.floor(Math.random() * variants.length);
		if (index === lastIndex) {
			index = (index + 1) % variants.length;
		}
		return [variants[index], index];
	}

	/**
	 * Friendly quality names, in QUALITY_SUFFIXES' exact order (fixed mapping,
	 * see 12-04-PLAN.md). `$derived.by` so a live locale flip re-renders the
	 * FR labels (I18N-02).
	 */
	const QUALITY_LABELS = $derived.by<Record<string, string>>(() => ({
		'': t('build.word.major'),
		m: t('build.quality.minor'),
		dim: t('build.quality.diminished'),
		maj7: t('build.quality.major7'),
		m7: t('build.quality.minor7'),
		'7': t('build.quality.dominant7'),
		m7b5: t('build.quality.halfDiminished'),
		dim7: t('build.quality.diminished7')
	}));

	/** Zips ROOTS (the ASCII value used to build the chord symbol) with MAJOR_SCALE_ROOTS (the glyph chip label) by index - both arrays share the same 12-root order. Pitch/letter names never translate (I18N-02 immunity). */
	const ROOT_CHIPS = ROOTS.map((ascii, i) => ({ ascii, label: MAJOR_SCALE_ROOTS[i] }));
	const QUALITY_CHIPS = $derived.by(() =>
		QUALITY_SUFFIXES.map((suffix) => ({ suffix, label: QUALITY_LABELS[suffix] }))
	);

	/**
	 * Clears feedback/flash/timer state and the count-up hint reveal; called
	 * on every fresh target pick (startChordConstruction/startScaleConstruction)
	 * and on kind switch/"Build Another" (via resetPicker) - the count-up hint
	 * resets to hidden exactly when a brand-new target is picked, never mid-target.
	 */
	function resetSessionUiState() {
		feedback = undefined;
		flashKey = null;
		lastTappedLetter = '';
		confirmationIndex = -1;
		wrongIndex = -1;
		countUpRevealed = false;
		fsrsSaved = false;
		clearTimeout(flashTimer);
		clearTimeout(feedbackTimer);
		flashTimer = undefined;
		feedbackTimer = undefined;
		clearRollTimers();
		pendingKeys = [];
	}

	function resetPicker() {
		pickedRoot = undefined;
		pickedQuality = undefined;
		pickedTonic = undefined;
		construction = undefined;
		promptState = undefined;
		resetSessionUiState();
		sessionState = 'picking';
	}

	function setKind(next: Kind) {
		if (next === kind) return;
		kind = next;
		resetPicker();
	}

	/** The physical key whose role is 'root' (session start's pre-placed note): scrolled into view once per fresh target. */
	function scrollRootIntoView() {
		const el = containerEl?.querySelector('.piano-keyboard__key--root') as HTMLElement | null;
		el?.scrollIntoView?.({ inline: 'start', block: 'nearest' });
	}

	function startChordConstruction() {
		if (pickedRoot === undefined || pickedQuality === undefined) return;
		startedSymbol = `${pickedRoot}${pickedQuality}`;
		construction = createChordConstruction(startedSymbol);
		promptState = construction;
		resetSessionUiState();
		sessionState = 'building';
		void tick().then(scrollRootIntoView);
	}

	function startScaleConstruction() {
		if (pickedTonic === undefined) return;
		construction = createScaleConstruction(pickedTonic);
		promptState = construction;
		resetSessionUiState();
		sessionState = 'building';
		void tick().then(scrollRootIntoView);
	}

	function pickRoot(ascii: string) {
		pickedRoot = ascii;
		if (pickedQuality !== undefined) startChordConstruction();
	}

	function pickQuality(suffix: string) {
		pickedQuality = suffix;
		if (pickedRoot !== undefined) startChordConstruction();
	}

	function pickTonic(root: string) {
		pickedTonic = root;
		startScaleConstruction();
	}

	/** Glyph label for the picked chord root (ChordGlyph wants the display glyph, not ROOTS' ASCII value). */
	const chordRootGlyph = $derived(ROOT_CHIPS.find((chip) => chip.ascii === pickedRoot)?.label ?? '');
	/** The step currently being prompted (paced by promptState, not the live-advancing `construction`). */
	const promptStep = $derived(promptState ? expectedStep(promptState) : undefined);
	/** Last-earned letter, the "up from {lastLetter}" anchor for every step/restatement line. */
	const lastLetter = $derived(construction?.earnedNotes.at(-1)?.letter ?? '');
	/** The step the count-up hint reads from: always the LIVE construction state (never the paced promptState), per the plan's explicit contract. */
	const countUpStep = $derived(construction ? expectedStep(construction) : undefined);
	/** The chord's own glyph symbol, or "{tonic} major"/"{tonic} majeur" for scales - both the WHY-line's/enharmonic-line's "symbol" fill-in. */
	const targetSymbol = $derived(
		kind === 'chords' ? (construction?.label ?? '') : `${pickedTonic ?? ''} ${t('build.word.major')}`
	);
	/** The root/tonic currently in play, for the enharmonic teaching line's intervalFromRoot lookup. */
	const currentRootLabel = $derived(kind === 'chords' ? (pickedRoot ?? '') : (pickedTonic ?? ''));

	/** The 7 natural letter names, for the enharmonic teaching line's chroma-match fallback. */
	const NATURAL_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
	/** The 5 sharp/flat black-key pairs (one octave's worth; pitch class is octave-independent), reused from the same keyboardLayout data PianoKeyboard's own unhighlighted-black-key labeling draws from. */
	const BLACK_KEY_PAIRS = blackKeysForOctaves(1);

	/**
	 * The simpler, "usually called" enharmonic name for a notable spelling's
	 * pitch class (e.g. B♭♭ -> A, E♯ -> F), via the SAME intervalFromRoot/
	 * transposeFrom simplest-enharmonic machinery PianoKeyboard's unhighlighted-
	 * black-key labeling already uses (no new enharmonic-preference heuristic):
	 * a natural-chroma match returns its natural letter directly; an
	 * accidental-chroma match picks whichever of the sharp/flat pair reads
	 * simplest from `root`.
	 */
	function commonNameFor(letter: string, root: string): string {
		const chroma = Note.chroma(toAsciiAccidentals(letter));
		const natural = NATURAL_LETTERS.find((candidate) => Note.chroma(candidate) === chroma);
		if (natural !== undefined) return natural;
		const pair = BLACK_KEY_PAIRS.find(
			({ sharpLetter }) => Note.chroma(toAsciiAccidentals(sharpLetter)) === chroma
		);
		if (!pair) return letter;
		const picked = intervalFromRoot(root, pair);
		if (picked.short === '') return pair.sharpLetter;
		return transposeFrom(root, picked.short) || pair.sharpLetter;
	}

	/**
	 * "minor third", "major second"... the just-earned CONSECUTIVE interval's
	 * own quality + degree word (never the chord-tone role), pre-pluralized
	 * for the enharmonic teaching line ("...a clean stack of {intervalWord}.").
	 * FR reads `IntervalInfo.longFr` directly (the existing French interval
	 * seed - never re-derived) and pluralizes it word-by-word (every FR
	 * degree noun/quality adjective in this app's vocabulary is a regular
	 * `+s` plural: tierce/tierces, mineure/mineures, etc).
	 */
	function intervalWordFor(step: ConstructionStep): string {
		if (currentLocale() === 'fr') {
			return step.interval.longFr
				.split(' ')
				.map((word) => `${word}s`)
				.join(' ');
		}
		const qualityWord = step.interval.long.split(' ')[0];
		return `${qualityWord} ${step.interval.role}s`;
	}

	/**
	 * "stack a minor 3rd" (chords) / "take a whole step" (scales), per
	 * D-03/phraseStep - EN only (untouched interval.ts machinery).
	 */
	function phraseFor(step: ConstructionStep): string {
		return kind === 'chords'
			? phraseStep(step.interval.short)
			: phraseStep(step.interval.short, { asScaleStep: true });
	}

	/**
	 * Locale-aware interval phrase for the step/WHY/restatement lines: EN
	 * delegates to `phraseFor`/interval.ts unchanged; FR reads
	 * `IntervalInfo.longFr` for chords (the existing French interval seed)
	 * and the two Build-owned whole/half-tone strings for scale steps (scale
	 * construction steps are always consecutive seconds, so this is the only
	 * FR vocabulary a scale step ever needs - interval.ts has no seed for
	 * this scale-step-specific "whole/half" phrasing, so it lives in
	 * build.ts rather than being re-derived in interval.ts).
	 */
	function localizedPhraseFor(step: ConstructionStep): string {
		if (currentLocale() === 'fr') {
			if (kind === 'scales') {
				return step.interval.quality === 'M'
					? t('build.interval.wholeStep')
					: t('build.interval.halfStep');
			}
			return step.interval.longFr;
		}
		return phraseFor(step);
	}

	function stepLineFor(step: ConstructionStep): string {
		const phrase = localizedPhraseFor(step);
		const prefix = kind === 'chords' ? t('build.step.chordsPrefix') : t('build.step.scalesPrefix');
		const infix = kind === 'chords' ? t('build.step.chordsInfix') : t('build.step.scalesInfix');
		return `${prefix} ${phrase} ${infix} ${lastLetter}.`;
	}

	/** "You need a {phrase} up from {letter}." restatement after a wrong-pitch-class tap, in the current locale. */
	function restatementLineFor(step: ConstructionStep): string {
		const phrase = localizedPhraseFor(step);
		const prefix =
			kind === 'chords'
				? t('build.restatement.needChordsPrefix')
				: t('build.restatement.needScalesPrefix');
		const infix = kind === 'chords' ? t('build.step.chordsInfix') : t('build.step.scalesInfix');
		return `${prefix} ${phrase} ${infix} ${lastLetter}.`;
	}

	function whyLineFor(step: ConstructionStep): string {
		if (kind === 'chords') {
			return `${t('build.why.chordsPrefix')} ${t(`build.role.${step.role}`)} ${t('build.why.chordsInfix')} ${construction?.label}.`;
		}
		return `${t('build.why.scalesPrefix')} ${step.degree} ${t('build.why.scalesInfix')} ${pickedTonic} ${t('build.word.major')}.`;
	}

	/** Interval-chip label for an earned note at `index`: 'R' for the pre-placed root, else the step it was earned on. */
	function chipLabelFor(index: number): string {
		if (index === 0) return 'R';
		return construction?.steps[index - 1]?.interval.short ?? '';
	}

	/** Completion-summary heading: "Voila. You built {symbol}." (chords) / "Voila. {tonic} major, built from scratch." (scales), in the current locale. */
	function headingFor(): string {
		if (kind === 'chords') {
			return `${t('build.complete.headingChordsPrefix')} ${construction?.label ?? ''}.`;
		}
		return `${t('build.complete.headingScalesPrefix')} ${pickedTonic ?? ''} ${t('build.word.major')}, ${t('build.complete.headingScalesSuffix')}`;
	}

	/**
	 * Completion-summary rule statement, derived straight from the final
	 * `construction.steps` (already fully advanced/done): "{root}, then
	 * {interval1Long}, then ..." for chords (comma-joined with 'then'), or
	 * "{tonic} major: {whole/half list}" for scales (comma-joined, no 'then').
	 * FR reads `IntervalInfo.longFr` directly for chords (the existing
	 * French interval seed, never re-derived).
	 */
	function ruleStatementFor(): string {
		if (!construction) return '';
		if (kind === 'chords') {
			const root = construction.earnedNotes[0]?.letter ?? '';
			const parts = construction.steps.map((step) =>
				currentLocale() === 'fr' ? step.interval.longFr : phraseStep(step.interval.short)
			);
			const then = t('build.rule.then');
			return `${root}, ${then} ${parts.join(`, ${then} `)}.`;
		}
		// Bare "whole"/"half" words (not phraseStep's "whole step"/"half step" -
		// the list format already implies steps, per the UI-SPEC's literal
		// "C major: whole, whole, half, ..." example).
		const parts = construction.steps.map((step) =>
			step.interval.quality === 'M' ? t('build.unit.wholeBare') : t('build.unit.halfBare')
		);
		return `${pickedTonic ?? ''} ${t('build.word.major')}: ${parts.join(', ')}.`;
	}

	/** Maps a completed session's wrongTapCount to an FSRS rating (BUILD-04): 0 -> Easy, 1-2 -> Good, 3+ -> Hard. Again is never returned - there is no give-up/reset path in this design. */
	function ratingForWrongTaps(count: number): Rating {
		if (count === 0) return Rating.Easy;
		if (count <= 2) return Rating.Good;
		return Rating.Hard;
	}

	/**
	 * Fires exactly once when a construction session completes (BUILD-04,
	 * D-09): records a gradeable event into the fact's 'formula-build' mode
	 * card via deck.ts's getCard/recordGrade, rated by the session's own
	 * wrongTapCount. Chords reuse the SAME 'chord-formula:{symbol}' factId
	 * already used by Phase 11's Recall 'formula' mode (the ORIGINAL ASCII
	 * symbol, never construction.label's display-glyph form); scales use the
	 * new scaleFormulaFactId(tonic). Never introduces/touches mode 'formula' -
	 * only ever the (factId, 'formula-build') card. Best-effort: any thrown
	 * error is swallowed silently (mirrors RecallSession's handleReveal
	 * audio-failure precedent), never blocking or altering the already-
	 * rendered completion summary.
	 *
	 * Called synchronously (fire-and-forget) the instant the final tap grades
	 * 'correct' (see handleConstructTap), NOT from inside the 650ms pacing
	 * timer (WR-03) - a client-side navigation away from /build within that
	 * window would otherwise unmount the component before the timer ever
	 * fires and permanently drop the grade. Every value this continuation
	 * needs (wrongTapCount, factId inputs, kind, symbol/tonic) is snapshotted
	 * into local consts BEFORE the first `await` (WR-02): "Build Another"/the
	 * kind toggle both reset `construction`/`pickedTonic`/etc. to undefined
	 * synchronously and are clickable the instant this fires, so re-reading
	 * live component state after an await boundary risks throwing on
	 * undefined and having the bare catch swallow a genuine write.
	 */
	async function recordConstructionOutcome(): Promise<void> {
		if (!construction || !construction.done) return;
		// Snapshot every input the async continuation needs before any `await` -
		// nothing below this line reads live component state again.
		const wrongTapCount = construction.wrongTapCount;
		const snapshotKind = kind;
		const snapshotSymbol = startedSymbol;
		const snapshotTonic = pickedTonic;
		try {
			const now = new Date();
			const factId =
				snapshotKind === 'chords'
					? `chord-formula:${snapshotSymbol}`
					: scaleFormulaFactId(snapshotTonic ?? '');
			const factKind = snapshotKind === 'chords' ? ('chord-formula' as const) : ('scale-formula' as const);
			const existing = await getCard(factId, 'formula-build');
			const card: CardRecord = existing ?? {
				...newCard(now),
				factId,
				factKind,
				mode: 'formula-build',
				lastRating: null,
				masteryDayCount: 0
			};
			await recordGrade(card, ratingForWrongTaps(wrongTapCount), now);
			fsrsSaved = true;
		} catch {
			// Best-effort write; never let it block or alter the completion summary.
		}
	}

	/** Clears every scheduled roll timer (pending->lit + block-strike) and empties the collection - clear-before-reschedule, so a "Hear again" mid-roll restarts cleanly, and safe to call on reset/destroy. */
	function clearRollTimers(): void {
		rollTimers.forEach((timer) => clearTimeout(timer));
		rollTimers = [];
	}

	/**
	 * Study-mode arpeggio roll (D-05/D-06, HEAR-02): seeds every earned
	 * { letter, octave } key as "pending" (dimmed via PianoKeyboard's
	 * --pending modifier), fires the audio stagger via playArpeggio passing
	 * the SAME `startDelayMs` that offsets the visual un-pend timers (so
	 * each note's audio attack and its key's un-dim land on the same tick -
	 * closes WR-01), then schedules one visual timer per note - removing
	 * that note's specific { letter, octave } from pendingKeys as its own
	 * tick lands, so the key cross-fades from pending to fully lit - and a
	 * final block-strike timer that clears any remaining pending state,
	 * strikes the block chord, and bumps the shared pulse on every lit key +
	 * the glyph together. Keying pending by { letter, octave } (mirroring
	 * flashWrongKey) rather than by letter alone means a scale's duplicate
	 * tonic (root re-earned an octave up) un-dims one octave at a time -
	 * the low tonic un-dims on its own tick, the octave-up tonic stays
	 * pending until ITS own tick, never both together (closes WR-03).
	 * `firstNoteDelayMs` is 260ms on the initial reveal (the roll begins as
	 * the stamp-in settles) and 0ms on "Hear again" replay (no entrance to
	 * wait out), per the UI-SPEC's timing tables.
	 */
	function startArpeggioRoll(letters: string[], opts: { firstNoteDelayMs: number }): void {
		clearRollTimers();
		const pitches = toAscendingPitches(letters);
		const keys = letters.map((letter, i) => ({ letter, octave: Note.octave(pitches[i]) ?? 4 }));
		pendingKeys = keys.slice();
		playArpeggio(letters, { staggerMs: ARPEGGIO_STAGGER_MS, startDelayMs: opts.firstNoteDelayMs });
		keys.forEach((key, index) => {
			const timer = setTimeout(
				() => {
					pendingKeys = pendingKeys.filter(
						(k) => !(k.letter === key.letter && k.octave === key.octave)
					);
				},
				opts.firstNoteDelayMs + index * ARPEGGIO_STAGGER_MS
			);
			rollTimers.push(timer);
		});
		const strikeTimer = setTimeout(
			() => {
				pendingKeys = [];
				playChord(letters);
				revealPulseToken += 1;
			},
			opts.firstNoteDelayMs + letters.length * ARPEGGIO_STAGGER_MS
		);
		rollTimers.push(strikeTimer);
	}

	/**
	 * Fires exactly once, at the sessionState -> 'complete' transition
	 * (HEAR-01/02, D-02/D-03/D-05/D-06/D-07/D-11): when study mode AND
	 * sound are both on, rolls the arpeggio (root->3rd->5th->7th, each key
	 * lighting as its note sounds) then strikes the block chord + full
	 * pulse - REPLACING the plain block auto-play, never a second
	 * simultaneous playback (D-05). Otherwise (study off, OR sound off
	 * regardless of study), plays the just-completed chord/scale once via
	 * playChord when sound is on, and ALWAYS bumps revealPulseToken so the
	 * lit keys (and, for chords, the ChordGlyph - both already wired to
	 * retrigger their shared `.pulse-once` cycle off a bumped `pulseToken`,
	 * Plans 16-02/16-03) pulse once in time. Sound off always collapses to
	 * this single visual pulse, never a fake silent roll (D-07). The pulse
	 * bump lives OUTSIDE the soundEnabled() gate so the reveal never
	 * dead-ends with sound off. Called inline from the feedbackTimer
	 * callback below, in the SAME branch that sets sessionState = 'complete'
	 * - mirrors recordConstructionOutcome's fire-once-on-transition
	 * precedent - never from a reactive $effect, which could re-fire on an
	 * unrelated re-render while already in 'complete'.
	 */
	function triggerReveal(): void {
		if (!construction) return;
		const letters = construction.earnedNotes.map((n) => n.letter);
		if (studyModeEnabled() && soundEnabled()) {
			void ensureAudioReady();
			startArpeggioRoll(letters, { firstNoteDelayMs: 260 });
			return;
		}
		if (soundEnabled()) {
			void ensureAudioReady();
			playChord(letters);
		}
		revealPulseToken += 1;
	}

	/**
	 * "Hear again" (D-08/D-09/D-10): replays the completed chord/scale on
	 * demand. Reads studyModeEnabled()/soundEnabled() LIVE at click time
	 * (never a snapshot of the state at reveal time), branching exactly
	 * like triggerReveal - study+sound on rolls the arpeggio again (with no
	 * stamp-in to wait out, so the roll starts immediately), otherwise the
	 * block chord (or silent pulse-only) path, mirroring
	 * RecallSession.handleHearNamePlay's ensureAudioReady()+playChord shape.
	 * ALWAYS bumps revealPulseToken (directly, or via the roll's own
	 * block-strike timer) to re-pulse even with sound off - the control is
	 * never disabled and never a dead-end.
	 */
	function hearAgain(): void {
		if (!construction) return;
		const letters = construction.earnedNotes.map((n) => n.letter);
		if (studyModeEnabled() && soundEnabled()) {
			void ensureAudioReady();
			startArpeggioRoll(letters, { firstNoteDelayMs: 0 });
			return;
		}
		if (soundEnabled()) {
			void ensureAudioReady();
			playChord(letters);
		}
		revealPulseToken += 1;
	}

	function handleConstructTap(letter: string, octave: number) {
		if (!construction || feedback) return;
		lastTappedLetter = letter;
		// Captured BEFORE grading: the step that's about to be earned, so its
		// own letter/interval are still available after `construction` advances.
		const targetStep = expectedStep(construction);
		const result = gradeConstructionTap(construction, letter, octave);

		if (result.outcome === 'correct') {
			construction = result.state;
			const [text, index] = pickVariant(CORRECT_VARIANTS, confirmationIndex);
			confirmationIndex = index;
			const notable = targetStep ? isNotableSpelling(targetStep.letter) : false;
			feedback = {
				kind: 'correct',
				headline: text,
				...(notable && targetStep
					? {
							notable: true,
							commonName: commonNameFor(targetStep.letter, currentRootLabel),
							actualName: targetStep.letter,
							intervalWord: intervalWordFor(targetStep)
						}
					: {})
			};
			// WR-03: fire the FSRS write the instant the session actually
			// completes, independent of the 650ms pacing timer below - a
			// navigation away within that window must not drop the grade.
			if (result.state.done) {
				void recordConstructionOutcome();
			}
		} else if (result.outcome === 'wrong-pitch-class') {
			flashKey = { letter, octave };
			construction = result.state;
			promptState = result.state;
			const [text, index] = pickVariant(WRONG_VARIANTS, wrongIndex);
			wrongIndex = index;
			feedback = {
				kind: 'wrong-pitch-class',
				headline: text,
				semitones: result.semitones,
				direction: result.direction
			};
		} else {
			flashKey = { letter, octave };
			construction = result.state;
			promptState = result.state;
			feedback = {
				kind: 'wrong-octave',
				headline: t('build.feedback.wrongOctave'),
				direction: result.direction
			};
		}

		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => {
			flashKey = null;
		}, 320);

		const advancesPrompt = result.outcome === 'correct';
		// The FSRS write itself already fired synchronously above (WR-03) - this
		// timer only owns the cosmetic transition to the `complete` screen.
		const willComplete = advancesPrompt && result.state.done;
		const nextPromptState = result.state;
		clearTimeout(feedbackTimer);
		feedbackTimer = setTimeout(() => {
			feedback = undefined;
			if (advancesPrompt) promptState = nextPromptState;
			if (willComplete) {
				sessionState = 'complete';
				triggerReveal();
			}
		}, 650);
	}

	onDestroy(() => {
		clearTimeout(flashTimer);
		clearTimeout(feedbackTimer);
		clearRollTimers();
	});

	// Embedding seam (13-05): runs once at component init, after every function
	// above is declared. Skips the picker entirely and starts construction
	// immediately for the given fact - a chord's ASCII symbol is split into
	// pickedRoot/pickedQuality via the same longest-match ROOTS-prefix
	// technique pickDistractors uses, so startChordConstruction()'s own
	// `startedSymbol` reconstructs the exact original symbol.
	// Read once via untrack: this is a deliberate init-time snapshot (embedFact
	// never changes for the lifetime of an embedded instance - RecallSession
	// mounts a fresh keyed instance per queue item), not a reactive dependency.
	untrack(() => {
		if (embedFact) {
			if (embedFact.kind === 'chord') {
				kind = 'chords';
				const root =
					ROOTS.filter((r) => embedFact.symbol.startsWith(r)).sort(
						(a, b) => b.length - a.length
					)[0] ?? '';
				pickedRoot = root;
				pickedQuality = embedFact.symbol.slice(root.length);
				startChordConstruction();
			} else {
				kind = 'scales';
				pickedTonic = embedFact.tonic;
				startScaleConstruction();
			}
		}
	});
</script>

<!--
	The constructable input keyboard: always rendered inline, both standalone
	(`/build`) and embedded (Recall's Mode C). `containerEl`'s `bind:this`
	lives here rather than at the call site so `scrollRootIntoView` still
	resolves the real DOM node.
-->
{#snippet buildKeyboard()}
	{#if construction}
		<div class="scroll-wrap mt-4" bind:this={containerEl}>
			<div style="min-width: {15 * 44}px;">
				<PianoKeyboard
					notes={construction.earnedNotes}
					constructable
					octaves={2}
					onConstructTap={handleConstructTap}
					flashWrongKey={flashKey}
				/>
			</div>
		</div>
	{/if}
{/snippet}

<div class="build-session" data-testid="build-session">
	{#if !embedFact}
		<div class="flex gap-2" data-testid="kind-toggle" role="group" aria-label={t('build.aria.kindGroup')}>
			<Button
				type="button"
				variant={kind === 'chords' ? 'primary' : 'ghost'}
				aria-pressed={kind === 'chords'}
				onclick={() => setKind('chords')}
			>
				{t('build.kind.chords')}
			</Button>
			<Button
				type="button"
				variant={kind === 'scales' ? 'primary' : 'ghost'}
				aria-pressed={kind === 'scales'}
				onclick={() => setKind('scales')}
			>
				{t('build.kind.scales')}
			</Button>
		</div>
	{/if}

	{#if sessionState === 'picking'}
		<div class="mt-8" data-testid="picker">
			{#if kind === 'chords'}
				<p class="text-label font-mono uppercase">{t('build.caption.root')}</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="root-row">
					{#each ROOT_CHIPS as chip (chip.ascii)}
						<Button
							type="button"
							variant={pickedRoot === chip.ascii ? 'primary' : 'ghost'}
							aria-pressed={pickedRoot === chip.ascii}
							onclick={() => pickRoot(chip.ascii)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>

				<p class="text-label mt-4 font-mono uppercase">{t('build.caption.quality')}</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="quality-row">
					{#each QUALITY_CHIPS as chip (chip.suffix)}
						<Button
							type="button"
							variant={pickedQuality === chip.suffix ? 'primary' : 'ghost'}
							aria-pressed={pickedQuality === chip.suffix}
							onclick={() => pickQuality(chip.suffix)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			{:else}
				<p class="text-label font-mono uppercase">{t('build.caption.tonic')}</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="tonic-row">
					{#each MAJOR_SCALE_ROOTS as root (root)}
						<Button
							type="button"
							variant={pickedTonic === root ? 'primary' : 'ghost'}
							aria-pressed={pickedTonic === root}
							onclick={() => pickTonic(root)}
						>
							{root} {t('build.word.major')}
						</Button>
					{/each}
				</div>
			{/if}
		</div>
	{:else if sessionState === 'building' && construction && promptState}
		<div class="mt-8" data-testid="build-active">
			{#if kind === 'chords'}
				<div class="flex items-start gap-4" data-testid="build-target">
					<ChordGlyph root={chordRootGlyph} quality={pickedQuality ?? ''} />
				</div>
			{:else}
				<p class="text-heading font-bold" data-testid="build-target">
					{pickedTonic} {t('build.word.major')}
				</p>
			{/if}

			{#if promptStep}
				<p
					class="text-label mt-4 font-mono uppercase"
					aria-live="polite"
					data-testid="build-register"
				>
					{t('build.step.step')} {promptState.position + 1} {t('build.step.of')} {promptState.steps
						.length}
				</p>
			{/if}

			<!-- WR-04: mirrors RecallSession.svelte/ScaleKeyboardDrill.svelte's
			     established convention of a single aria-live="polite" region over
			     the step/WHY/feedback zone (kept as a sibling of build-register's
			     OWN aria-live paragraph above, never nested, matching that same
			     precedent), so a screen-reader user hears every graded-tap
			     outcome - the core pedagogical content of this mode. -->
			<div aria-live="polite">
				{#if promptStep}
					<p class="text-body mt-2" data-testid="build-step-line">{stepLineFor(promptStep)}</p>
					<p class="text-body mt-2" data-testid="build-why-line">{whyLineFor(promptStep)}</p>

					{#if kind === 'chords' && !feedback}
						{#if !countUpRevealed}
							<div class="mt-2">
								<Button
									type="button"
									variant="ghost"
									data-testid="count-up-toggle"
									onclick={() => (countUpRevealed = true)}
								>
									{t('build.button.showCountUp')}
								</Button>
							</div>
						{:else if countUpStep}
							<p class="text-body mt-2" data-testid="build-count-up-hint">
								{countUpStep.interval.semitones}
								{countUpStep.interval.semitones === 1
									? t('build.unit.halfStep')
									: t('build.unit.halfSteps')}
								{t('build.step.chordsInfix')} {lastLetter}. {t('build.countUp.suffix')}
							</p>
						{/if}
					{/if}
				{/if}

				{#if feedback}
					<div class="mt-4" data-testid="build-feedback">
						<p class="text-body font-bold">{feedback.headline}</p>
						{#if feedback.kind === 'correct' && feedback.notable}
							<p class="text-body mt-2" data-testid="build-enharmonic-line">
								{t('build.enharmonic.a')} {feedback.commonName}, {t('build.enharmonic.b')}
								{targetSymbol} {t('build.enharmonic.c')} {feedback.actualName}
								{kind === 'chords'
									? t('build.enharmonic.dChords')
									: t('build.enharmonic.dScales')} {t('build.enharmonic.e')} {feedback.intervalWord}.
							</p>
						{:else if feedback.kind === 'wrong-pitch-class'}
							<p class="text-body mt-2" data-testid="build-diagnostic">
								{feedback.semitones}
								{feedback.semitones === 1 ? t('build.unit.halfStep') : t('build.unit.halfSteps')}
								{t('build.diagnostic.too')} {t(
									`build.direction.${feedback.direction}` as MessageKey
								)}.
							</p>
							{#if promptStep}
								<p class="text-body mt-2" data-testid="build-restatement">
									{restatementLineFor(promptStep)}
								</p>
							{/if}
						{:else if feedback.kind === 'wrong-octave'}
							<p class="text-body mt-2" data-testid="build-restatement">
								{t('build.restatement.stackingPrefix')} {lastTappedLetter}
								{feedback.direction === 'high'
									? t('build.restatement.down')
									: t('build.restatement.up')}.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			{@render buildKeyboard()}

			<div class="mt-4 flex flex-wrap gap-2" data-testid="formula-strip">
				{#each construction.earnedNotes as note, i (i)}
					<div class="flex flex-col items-center gap-1">
						<IntervalChip role={note.role} label={chipLabelFor(i)} />
						<span class="text-label font-mono">{note.letter}</span>
					</div>
				{/each}
				{#if !construction.done}
					<span
						class="formula-chip--placeholder"
						data-testid="formula-placeholder"
						aria-hidden="true"
					>
						?
					</span>
				{/if}
			</div>
		</div>
	{:else if sessionState === 'complete' && construction}
		<div class="mt-8" data-testid="build-complete">
			{#if kind === 'chords'}
				<div class="flex items-start gap-4" data-testid="build-complete-target">
					<ChordGlyph
						root={chordRootGlyph}
						quality={pickedQuality ?? ''}
						stamped
						pulseToken={revealPulseToken}
					/>
				</div>
			{/if}
			<p class="text-heading font-bold" data-testid="build-complete-heading">{headingFor()}</p>
			<p class="text-body mt-2" data-testid="build-complete-rule">{ruleStatementFor()}</p>

			<div class="mt-4 flex flex-wrap gap-2" data-testid="formula-strip">
				{#each construction.earnedNotes as note, i (i)}
					<div class="flex flex-col items-center gap-1">
						<IntervalChip role={note.role} label={chipLabelFor(i)} />
						<span class="text-label font-mono">{note.letter}</span>
					</div>
				{/each}
			</div>

			<div class="mt-4">
				<PianoKeyboard
					notes={construction.earnedNotes}
					octaves={2}
					pulseToken={revealPulseToken}
					pendingKeys={pendingKeys}
				/>
			</div>

			{#if fsrsSaved && !onComplete}
				<p class="text-label mt-4 font-mono uppercase" data-testid="build-fsrs-status">
					{t('build.status.saved')}
				</p>
			{/if}

			<div class="mt-6 flex flex-wrap gap-2">
				<Button type="button" variant="ghost" onclick={hearAgain}>{t('build.button.hearAgain')}</Button>
				{#if onComplete}
					<Button type="button" variant="primary" onclick={onComplete}>{t('build.button.next')}</Button>
				{:else}
					<Button type="button" variant="primary" onclick={resetPicker}
						>{t('build.button.buildAnother')}</Button
					>
					<Button variant="ghost" href="/recall">{t('build.button.recallNow')}</Button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.scroll-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.formula-chip--placeholder {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1.5px dashed var(--color-faint);
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
	}
</style>
