<script lang="ts">
	import { onMount } from 'svelte';
	import { Note } from 'tonal';
	import { getDockRegistry } from '$lib/keyboard/dockContext.svelte';
	import { spellChord } from '$lib/theory/chord';
	import { intervalFromShort, toAsciiAccidentals } from '$lib/theory/interval';
	import { formulaFor } from '$lib/lookup/chordPresentation';
	import { generateQuestion, pickQuestionFamily } from '$lib/drills/generateQuestion';
	import {
		describeTappedInterval,
		generateIntervalQuestion,
		gradeIntervalTap,
		intervalQuestionNotes
	} from '$lib/drills/generateIntervalQuestion';
	import { matchChord } from '$lib/drills/matchChord';
	import { dismissRotateHint, isRotateHintDismissed } from '$lib/drills/rotateHint';
	import { fetchStats, flushQueue, localDateString, type StatItem } from '$lib/api/progress';
	import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';
	import { consumeDrillSeeds } from '$lib/practice/drillSeeds';
	import {
		checkUnlock,
		getLevelState,
		isSnoozed,
		setCurrentTier,
		snoozeSuggestion,
		type UnlockCheck
	} from '$lib/practice/levelState';
	import {
		appendPracticeAnswer,
		practiceDaysSince,
		readPracticeLog,
		recentMisses
	} from '$lib/practice/practiceLog';
	import { drawFromPool, scaffoldStageForSymbol, type PoolContext } from '$lib/practice/pool';
	import {
		readScaffolds,
		recordScaffoldAnswer,
		writeScaffold,
		type ScaffoldStage
	} from '$lib/practice/scaffold';
	import {
		createSession,
		isComplete,
		mergeWarmupCandidates,
		nextQuestion as advanceSession,
		recordSessionAnswer,
		summarize,
		type QuestionSource,
		type Session,
		type SessionItem
	} from '$lib/practice/session';
	import { activeSongChordSymbols } from '$lib/practice/songs';
	import { splitSymbol, tierById, type TierId } from '$lib/practice/tiers';
	import type { DrillMode, DrillQuestion } from '$lib/drills/generateQuestion';
	import type { MatchResult } from '$lib/drills/matchChord';
	import PianoKeyboard, { type InspectPayload } from '$lib/components/PianoKeyboard.svelte';
	import InspectRegister from '$lib/components/InspectRegister.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import RevealInsight from '$lib/components/RevealInsight.svelte';
	import SongHook from '$lib/components/SongHook.svelte';
	import Button from '$lib/components/Button.svelte';
	import LevelPicker from '$lib/components/LevelPicker.svelte';
	import IntervalScaffold from '$lib/components/IntervalScaffold.svelte';
	import { intervalScaffoldLevel } from '$lib/practice/scaffoldLevel';

	/**
	 * Shared keyboard dock registration (KBD-01/KBD-03): the four former inline
	 * `<PianoKeyboard>` sites (construction input/reveal, identification,
	 * interval identification, interval construction) plus the identification
	 * reveal keyboard collapse into ONE mode-aware `dockedKeyboard` snippet
	 * (below) registered with the shared dock. The registry reference is
	 * captured once at component-init time and reused inside the register/
	 * clear `$effect` further down - calling `getDockRegistry()` again during
	 * teardown throws Svelte's `lifecycle_outside_component` (Plan 03's
	 * established fix), so the effect's own returned cleanup (which fires on
	 * both re-run and unmount) is what clears the registration, never a
	 * separate `onDestroy`.
	 */
	const dockRegistry = getDockRegistry();
	const dockToken = Symbol('drills-dock');

	/**
	 * Right-answer confirmation variants (D-08): the stamp beat is the reward,
	 * this is a one-line caption, not a celebration banner. Rotated with a
	 * no-immediate-repeat picker mirroring $lib/copy/hints's pickHint.
	 */
	const CORRECT_VARIANTS = ['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'];

	/** Wrong-answer headline variants (D-09), same rotation discipline. */
	const WRONG_VARIANTS = ['Not quite.', 'Close, but no cigar.', 'Not this time.'];

	let lastCorrectIndex = -1;
	let lastWrongIndex = -1;

	/**
	 * Picks a variant, avoiding an immediate repeat, mirroring pickHint's
	 * anti-repeat logic. Loop-free (a repeat draw just steps to the next
	 * variant) so a deterministic Math.random in tests can never spin forever.
	 */
	function pickVariant(variants: string[], lastIndex: number): [string, number] {
		if (variants.length === 1) return [variants[0], 0];
		let index = Math.floor(Math.random() * variants.length);
		if (index === lastIndex) {
			index = (index + 1) % variants.length;
		}
		return [variants[index], index];
	}

	// ---- Practice engine state (Track B) -----------------------------------
	// The level gate, weighted pool, and micro-session drive every question
	// draw. All logic lives in $lib/practice/*; this page only holds the
	// reactive glue.

	let levelState = $state(getLevelState());
	let stats = $state<StatItem[] | null>(null);
	let weakest = $state<StatItem[]>([]);
	let showEndCard = $state(false);
	let unlockSuggestion = $state<UnlockCheck | null>(null);
	let unlockDismissed = $state(false);

	/** Scaffolding stage of the CURRENT question (above-tier song chords), null for normal items. */
	let scaffoldStage = $state<ScaffoldStage | null>(null);
	let hintTaken = $state(false);
	let questionSource = $state<QuestionSource>('pool');

	/** Qualities of recent draws, most recent last (interleaving constraint input). */
	let lastQualities: string[] = [];
	/** Timestamp when the current question appeared (duration_ms telemetry). */
	let questionShownAt = Date.now();

	let session = $state<Session>(
		createSession({
			// Drill-these seeds are chord symbols (Progress filters to kind 'chord').
			seeds: consumeDrillSeeds().map((symbol) => ({ symbol, family: 'chord' as const })),
			warmupCandidates: recentMisses(5)
		})
	);

	function poolContext(): PoolContext {
		return {
			songSymbols: activeSongChordSymbols(),
			currentTier: levelState.currentTier,
			unlockedTiers: levelState.unlockedTiers,
			stats,
			weakest,
			recentMisses: recentMisses(8),
			scaffolds: readScaffolds(),
			lastQualities,
			log: readPracticeLog(),
			today: localDateString()
		};
	}

	/** Deck selector (Track C): CHORDS, INTERVALS, or the default even MIX. */
	const MODES: { value: DrillMode; label: string }[] = [
		{ value: 'chords', label: 'Chords' },
		{ value: 'intervals', label: 'Intervals' },
		{ value: 'mix', label: 'Mix' }
	];
	let mode = $state<DrillMode>('mix');

	/**
	 * A fresh (non-session-sourced) question: the deck mode decides the
	 * family FIRST, and only a chord family draws a weighted symbol from the
	 * practice pool. Interval questions never touch chord scaffolding.
	 */
	function freshPoolQuestion(): DrillQuestion {
		if (pickQuestionFamily(mode) === 'interval') {
			scaffoldStage = null;
			return generateIntervalQuestion();
		}
		const symbol = drawFromPool(poolContext()).symbol;
		scaffoldStage = scaffoldStageForSymbol(poolContext(), symbol);
		lastQualities = [...lastQualities.slice(-1), splitSymbol(symbol)?.quality ?? ''];
		return generateQuestion({
			symbol,
			direction: scaffoldStage === 'formula-first' ? 'construction' : undefined
		});
	}

	/**
	 * Draws the next question: the session decides the source (due retry >
	 * Drill-these seed > warm-up > pool) and the pool supplies weighted
	 * symbols; scaffolded chords force a guided construction on their
	 * formula-first exposures. Session-sourced items always keep their
	 * family regardless of the deck mode: chord symbols render as chord
	 * questions, and a missed interval's retry (or an end-card redrill of
	 * one) comes back as an interval question on the same interval.
	 */
	function drawNextQuestion(): DrillQuestion {
		const { plan, session: consumed } = advanceSession(session);
		session = consumed;
		questionSource = plan.source;
		hintTaken = false;
		questionShownAt = Date.now();

		// The plan carries the queued item's EXPLICIT family: 'A4' is both a
		// tritone and a quartal chord symbol, so names are never inferred.
		if (plan.symbol !== null && plan.family === 'interval') {
			scaffoldStage = null;
			return generateIntervalQuestion({ short: plan.symbol });
		}
		if (plan.symbol === null) {
			return freshPoolQuestion();
		}

		const symbol = plan.symbol;
		scaffoldStage = scaffoldStageForSymbol(poolContext(), symbol);
		lastQualities = [...lastQualities.slice(-1), splitSymbol(symbol)?.quality ?? ''];
		return generateQuestion({
			symbol,
			direction: scaffoldStage === 'formula-first' ? 'construction' : undefined
		});
	}

	// Interleaving (D-06): a question is drawn for BOTH directions on load
	// and on every Next - no setup screen. Each question is randomly
	// construction or identification (scaffolding may force construction for
	// formula-first exposures); the MIX deck also interleaves chord and
	// interval questions.
	let question = $state<DrillQuestion>(drawNextQuestion());
	// spellChord('') is the total "no chord" value; interval questions never
	// read `target`, so the fallback keeps every chord-branch read non-null.
	const target = $derived(spellChord(question.kind === 'chord' ? question.symbol : ''));
	/** Both interval-question notes (root + spelled target); construction shows only the root until graded. */
	const intervalNotes = $derived(
		question.kind === 'interval' ? intervalQuestionNotes(question) : []
	);

	const sessionSummary = $derived(summarize(session));

	let selected = $state<Set<string>>(new Set());
	let answered = $state(false);
	let feedback = $state<MatchResult | null>(null);
	let confirmationText = $state('');
	let headlineText = $state('');

	/** Snapshot of what the user played (letters, in click order) at grading time, for the diff row. */
	let playedLetters = $state<string[]>([]);

	/** The symbol the user picked on an identification question, for the confusion contrast (Track D). */
	let givenSymbol = $state<string | undefined>(undefined);

	/** The single graded tap of an interval construction question (letter as the keyboard reports it). */
	let tappedLetter = $state<string | null>(null);
	/** What that tap actually was, named from the question root, for the feedback register line. */
	const tappedReadout = $derived(
		question.kind === 'interval' && tappedLetter !== null
			? describeTappedInterval(question.root, tappedLetter)
			: null
	);

	/**
	 * Reveal-keyboard inspect taps (R4: the study-the-reveal moment becomes
	 * active exploration). Filled only after grading, rendered inside the
	 * feedback block.
	 */
	let drillInspect = $state<InspectPayload | null>(null);

	function handleDrillInspect(payload: InspectPayload) {
		drillInspect = payload;
	}

	/**
	 * Mode switch: fresh pool questions re-deal immediately under the new
	 * deck (the tap should feel instant); session-sourced questions
	 * (warm-up, retry, seeded) and already-answered questions keep their
	 * place, and the mode applies from the next draw.
	 */
	function setMode(next: DrillMode) {
		if (next === mode) return;
		mode = next;
		if (answered || questionSource !== 'pool') return;
		hintTaken = false;
		questionShownAt = Date.now();
		question = freshPoolQuestion();
		selected = new Set();
		feedback = null;
		playedLetters = [];
		givenSymbol = undefined;
		tappedLetter = null;
		drillInspect = null;
	}

	/** In-session running tally (D-10): in-memory only, no localStorage, resets on reload. */
	let score = $state({ correct: 0, streak: 0 });

	/**
	 * Rotate hint (D-05): read synchronously at init (mirrors question's
	 * $state(generateQuestion()) init pattern) so the hint's presence is
	 * correct on the very first render, no post-mount flash.
	 */
	let hintDismissed = $state(isRotateHintDismissed());

	function dismissHint() {
		dismissRotateHint();
		hintDismissed = true;
	}

	// Drain any answers queued from a previous offline session (PROG-01).
	onMount(() => {
		flushQueue();
	});

	/**
	 * Short-landscape carve-out (Scope Decision 7): on a genuinely short
	 * rotated-phone viewport, Drills keeps its existing two-pane layout
	 * (Phase 09-03) instead of feeding the fixed dock chrome, which would
	 * eat vertical space twice over an already height-cleared layout.
	 * Feature-detected (matchMedia isn't implemented by jsdom, so this stays
	 * `false` - dock-by-default - in tests and in any browser lacking it),
	 * mirroring the existing rotate-hint orientation listener above.
	 */
	let isShortLandscape = $state(false);

	onMount(() => {
		if (typeof window.matchMedia !== 'function') return;
		const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
		isShortLandscape = mql.matches;
		const handleShortLandscapeChange = (event: MediaQueryListEvent) => {
			isShortLandscape = event.matches;
		};
		mql.addEventListener('change', handleShortLandscapeChange);
		return () => mql.removeEventListener('change', handleShortLandscapeChange);
	});

	/**
	 * Docked keyboard (KBD-01/KBD-03): registers the single mode-aware
	 * `dockedKeyboard` snippet (defined in the template below) with the
	 * shared dock whenever the viewport is NOT short-landscape, and clears
	 * the registration (effect cleanup, which also fires on unmount)
	 * whenever it flips to short-landscape - the same snippet then renders
	 * inline in `.drill-layout__keyboard` instead (see template). No
	 * `register` snippet - the in-flow feedback block already hosts
	 * `InspectRegister` for `drillInspect`, so the dock never duplicates
	 * that readout.
	 */
	// inputRequired only on construction questions: there the docked keyboard
	// is the sole answer-input surface (Check stays disabled until keys are
	// selected; interval construction grades the first tap), so the dock must
	// never hide it, even if collapse was persisted elsewhere (WR-01).
	// Identification questions answer via in-flow choice buttons, so their
	// ear-support keyboard keeps the normal collapse handle. The flag stays
	// true across the answered reveal of a construction question so the
	// in-place reveal keyboard never vanishes mid-question.
	const dockInputRequired = $derived(question.direction === 'construction');
	$effect(() => {
		if (isShortLandscape) return;
		dockRegistry?.register({
			token: dockToken,
			keyboard: dockedKeyboard,
			inputRequired: dockInputRequired
		});
		return () => dockRegistry?.clear(dockToken);
	});

	// Server-derived stats (D-02): need-weighting, the review bucket, and the
	// unlock check all improve once these land; the drill loop never waits on
	// them and works offline/tokenless without them.
	onMount(() => {
		fetchStats()
			.then((result) => {
				stats = result.items;
				weakest = result.weakest;
				session = mergeWarmupCandidates(
					session,
					result.weakest.filter((item) => item.kind === 'chord').map((item) => item.item)
				);
			})
			.catch(() => {
				// Offline or tokenless: the pool falls back to tier-uniform
				// weighting and the unlock suggestion simply never fires.
			});
	});

	// D-05 "first rotation" clause: entering landscape counts as an implicit
	// dismissal, same as tapping the hint's dismiss control. Feature-detected
	// (matchMedia isn't implemented by jsdom, so this is a silent no-op in
	// tests and in any browser lacking it - progressive enhancement only).
	onMount(() => {
		if (typeof window.matchMedia !== 'function') return;
		const mql = window.matchMedia('(orientation: landscape)');
		const handleOrientationChange = (event: MediaQueryListEvent) => {
			if (event.matches) dismissHint();
		};
		if (mql.matches) dismissHint();
		mql.addEventListener('change', handleOrientationChange);
		return () => mql.removeEventListener('change', handleOrientationChange);
	});

	/**
	 * Key-touch sound (Track A): every on-screen key press sounds its note.
	 * The first press also unlocks the audio context inside the gesture.
	 */
	function pressKey(letter: string, octave: number) {
		void ensureAudioReady();
		playNote(toPitch(letter, octave));
	}

	function recordGrade(correct: boolean, given?: string) {
		// Reveal rule (Track A): EVERY answer reveal plays the correct answer,
		// correct answers included; on a miss this is the correct one, never
		// the user's. Chord questions play the chord; interval questions play
		// the root + target pair. Voicing and engine live in $lib/audio.
		playChord(
			(question.kind === 'chord' ? target.notes : intervalNotes).map((note) => note.letter)
		);

		if (correct) {
			score = { correct: score.correct + 1, streak: score.streak + 1 };
			const [text, index] = pickVariant(CORRECT_VARIANTS, lastCorrectIndex);
			confirmationText = text;
			lastCorrectIndex = index;
		} else {
			score = { correct: score.correct, streak: 0 };
			const [text, index] = pickVariant(WRONG_VARIANTS, lastWrongIndex);
			headlineText = text;
			lastWrongIndex = index;
		}

		const durationMs = Date.now() - questionShownAt;
		// Formula-first exposures and taken hints are assisted: they count for
		// the song's own progress but never toward tier unlock accuracy (R3).
		// Interval questions have no scaffolding, so they are never assisted.
		const assisted = question.kind === 'chord' && (scaffoldStage === 'formula-first' || hintTaken);
		// Interval answers use the shorthand name as their item, so a missed
		// interval's delayed retry and the end-card redrill work per interval.
		const item = question.kind === 'chord' ? question.symbol : question.interval.short;

		session = recordSessionAnswer(session, {
			symbol: item,
			family: question.kind,
			kind: question.direction,
			correct,
			assisted,
			durationMs,
			source: questionSource
		});

		if (question.kind === 'chord') {
			// The practice log feeds tier-unlock windows and chord warm-up
			// candidates: chord-only by design, so interval answers never skew
			// the unlock accuracy math.
			appendPracticeAnswer({ item: question.symbol, correct, assisted, date: localDateString() });

			if (scaffoldStage !== null) {
				const scaffolds = readScaffolds();
				const current = scaffolds[question.symbol] ?? {
					symbol: question.symbol,
					exposures: 0,
					coldCorrectConstructions: 0
				};
				writeScaffold(
					recordScaffoldAnswer(current, { correct, assisted, kind: question.direction })
				);
			}
		}

		// Fire-and-forget persistence (D-04): never awaited, so this cannot
		// delay the synchronous UI updates above. duration_ms and the given
		// answer ride along tolerantly (answerTelemetry strips them if the
		// deployed server rejects unknown fields). Interval answers post kind
		// 'interval' with the shorthand as item.
		recordPracticeAnswer({
			item,
			kind: question.kind,
			correct,
			durationMs,
			given
		});
	}

	function toggleKey(letter: string) {
		if (answered) return;
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	function clearSelection() {
		selected = new Set();
	}

	function checkAnswer() {
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		feedback = result;
		answered = true;
		playedLetters = [...selected];
		recordGrade(result.correct);
	}

	/** Identification grading (D-05): tapping a choice IS the complete answer, no Check step. */
	function selectChoice(choice: string) {
		if (answered || question.kind !== 'chord') return;
		answered = true;
		const correct = choice === question.symbol;
		givenSymbol = choice;
		feedback = { correct, missing: [], extra: [] };
		recordGrade(correct, choice);
	}

	/** Interval identification: tapping a shorthand choice IS the complete answer (same D-05 rule). */
	function selectIntervalChoice(choice: string) {
		if (answered || question.kind !== 'interval') return;
		answered = true;
		const correct = choice === question.interval.short;
		feedback = { correct, missing: [], extra: [] };
		recordGrade(correct, choice);
	}

	/**
	 * Interval construction: the FIRST tap is the whole answer (no Check
	 * step; single-note answers need no chord assembly). Graded by chroma
	 * distance, so enharmonic and octave-duplicate taps are accepted. The
	 * `given` telemetry records what the tap actually was, as an interval.
	 */
	function tapIntervalKey(letter: string) {
		if (answered || question.kind !== 'interval') return;
		tappedLetter = letter;
		answered = true;
		const correct = gradeIntervalTap(question.root, letter, question.interval.semitones);
		feedback = { correct, missing: [], extra: [] };
		recordGrade(correct, describeTappedInterval(question.root, letter).info.short);
	}

	/**
	 * Next (D-07): draws a fresh question and clears all per-question state.
	 * At the round boundary (10 answers) the end card takes over instead,
	 * which is also the ONLY moment the unlock suggestion may appear (R3:
	 * never mid-question).
	 */
	function nextQuestion() {
		if (isComplete(session)) {
			unlockSuggestion = computeUnlockSuggestion();
			showEndCard = true;
			return;
		}
		question = drawNextQuestion();
		selected = new Set();
		answered = false;
		feedback = null;
		playedLetters = [];
		givenSymbol = undefined;
		tappedLetter = null;
		drillInspect = null;
	}

	/**
	 * Round-boundary unlock check (R3 section 2): eligible per the exact
	 * criteria, and not snoozed within the last 3 practice days.
	 */
	function computeUnlockSuggestion(): UnlockCheck | null {
		const check = checkUnlock({
			tier: levelState.currentTier,
			stats,
			log: readPracticeLog()
		});
		if (!check.eligible || check.nextTier === null) return null;
		const snoozedOn = levelState.snooze?.snoozedOn;
		const daysSince = snoozedOn === undefined ? Number.POSITIVE_INFINITY : practiceDaysSince(snoozedOn);
		if (isSnoozed(levelState, check.nextTier, daysSince)) return null;
		return check;
	}

	function unlockNextTier() {
		if (unlockSuggestion?.nextTier == null) return;
		levelState = setCurrentTier(unlockSuggestion.nextTier);
		unlockDismissed = true;
	}

	function snoozeUnlock() {
		if (unlockSuggestion?.nextTier == null) return;
		levelState = snoozeSuggestion(unlockSuggestion.nextTier, localDateString());
		unlockDismissed = true;
	}

	/**
	 * The user changed level via the on-ramp picker (sketch 007): refresh the
	 * page's level state and start a fresh round so the new tier's pool takes
	 * effect immediately.
	 */
	function handleLevelChange(_tier: TierId) {
		levelState = getLevelState();
		startNewRound();
	}

	/** Starts a fresh round; seeds (tap-to-redrill, Drill these) suppress the warm-up. */
	function startNewRound(seeds: SessionItem[] = []) {
		session = createSession({
			seeds,
			warmupCandidates: seeds.length > 0 ? [] : recentMisses(5)
		});
		if (seeds.length === 0 && weakest.length > 0) {
			session = mergeWarmupCandidates(
				session,
				weakest.filter((item) => item.kind === 'chord').map((item) => item.item)
			);
		}
		showEndCard = false;
		unlockSuggestion = null;
		unlockDismissed = false;
		question = drawNextQuestion();
		selected = new Set();
		answered = false;
		feedback = null;
		playedLetters = [];
		givenSymbol = undefined;
		tappedLetter = null;
		drillInspect = null;
	}

	/** Tap-to-redrill from the end card: the tapped miss leads, the others follow. */
	function redrillMiss(item: SessionItem) {
		const others = sessionSummary.missedItems.filter(
			(missed) => missed.symbol !== item.symbol || missed.family !== item.family
		);
		startNewRound([item, ...others]);
	}

	/** Human-readable quality for unlock-card copy ('' is a major triad). */
	function qualityLabel(quality: string): string {
		return quality === '' ? 'maj' : quality;
	}

	const SOURCE_TAGS: Partial<Record<QuestionSource, string>> = {
		warmup: 'BACK FOR ANOTHER GO',
		retry: 'ONE MORE TIME',
		seeded: 'FROM YOUR WEAK LIST'
	};

	/** Hinted scaffolding stage: taking the hint reveals the formula and marks the answer assisted. */
	function takeHint() {
		hintTaken = true;
	}

	/** Whether a played letter's chroma is an extra note (not part of the target chord). */
	function isExtraLetter(letter: string): boolean {
		const chroma = Note.chroma(toAsciiAccidentals(letter));
		return feedback?.extra.includes(chroma) ?? false;
	}

	/**
	 * Wrong extra letters the user played (Sketch 001 Variant A): reuses the
	 * existing isExtraLetter() derivation, no new matching logic. Feeds the
	 * merged feedback keyboard's gray ✕ overlay.
	 */
	const wrongLetters = $derived(new Set(playedLetters.filter(isExtraLetter)));

	/**
	 * True once a wrong chord CONSTRUCTION answer is graded: the input
	 * keyboard transforms in place into the reveal (interval colors +
	 * wrongLetters), replacing the prior separate correct-answer keyboard.
	 * Construction-only per plan scope; identification's reveal keyboard is
	 * unchanged.
	 */
	const showConstructionReveal = $derived(
		question.kind === 'chord' &&
			question.direction === 'construction' &&
			answered &&
			feedback !== null &&
			!feedback.correct
	);

	/** Capitalizes the French long name for prompt copy ("tierce mineure" -> "Tierce mineure"). */
	function capitalizeFr(text: string): string {
		return text.charAt(0).toUpperCase() + text.slice(1);
	}
</script>

<!--
	The ONE mode-aware docked keyboard (KBD-01/KBD-03): closes over the page's
	existing reactive state, so it reproduces exactly the props each of the
	four former inline sites rendered - never two input surfaces for the same
	fact (interactive/inspectable are mutually exclusive per question branch).
-->
{#snippet dockedKeyboard()}
	{#if question.kind === 'chord' && question.direction === 'construction'}
		<PianoKeyboard
			notes={showConstructionReveal ? target.notes : []}
			interactive={!showConstructionReveal}
			selected={showConstructionReveal ? undefined : selected}
			onToggle={showConstructionReveal ? undefined : toggleKey}
			onPress={showConstructionReveal ? undefined : pressKey}
			wrongLetters={showConstructionReveal ? wrongLetters : undefined}
			inspectable={showConstructionReveal}
			onInspect={showConstructionReveal ? handleDrillInspect : undefined}
			showIntervalBadges={showConstructionReveal}
		/>
	{:else if question.kind === 'chord'}
		<!--
			Identification: keys always play on tap (inspectable). Before
			answering, no onInspect/badges are wired (ear support only, no
			give-away); once answered, the SAME docked element becomes the
			reveal - onInspect + showIntervalBadges wire up, matching the prior
			separate feedback-block keyboard exactly (no second element).
		-->
		<PianoKeyboard
			notes={target.notes}
			inspectable
			onInspect={answered ? handleDrillInspect : undefined}
			showIntervalBadges={answered}
		/>
	{:else if question.direction === 'identification'}
		<!--
			Interval identification: keys always play on tap (ear support), but
			the inspect register that names the interval only wires up once
			answered, so tapping to hear the pitches never spoils the answer.
		-->
		<PianoKeyboard
			notes={intervalNotes}
			inspectable
			onInspect={answered ? handleDrillInspect : undefined}
		/>
	{:else}
		<PianoKeyboard
			notes={answered ? intervalNotes : [intervalNotes[0]]}
			interactive={!answered}
			selected={answered ? undefined : new Set()}
			onToggle={answered ? undefined : tapIntervalKey}
			onPress={answered ? undefined : pressKey}
			wrongLetters={answered
				? feedback?.correct
					? new Set()
					: new Set(tappedLetter === null ? [] : [tappedLetter])
				: undefined}
			inspectable={answered}
			onInspect={answered ? handleDrillInspect : undefined}
		/>
	{/if}
{/snippet}

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Drills</h1>

	<!-- Beginner on-ramp (sketch 007): the level lives where you practice. -->
	<div class="mt-6">
		<LevelPicker onChange={handleLevelChange} />
	</div>

	<div class="mt-8 flex flex-wrap items-center justify-between gap-2">
		<div class="flex gap-4" data-testid="drill-mode-row" role="group" aria-label="Drill mode">
			{#each MODES as modeOption (modeOption.value)}
				<button
					type="button"
					class="mode-tab text-label font-mono uppercase"
					class:mode-tab--active={mode === modeOption.value}
					aria-pressed={mode === modeOption.value}
					onclick={() => setMode(modeOption.value)}
				>
					{modeOption.label}
				</button>
			{/each}
		</div>
		<p class="text-label text-right font-mono uppercase" data-testid="score-register">
			{Math.min(session.asked + 1, session.length)} OF {session.length} · {score.correct} RIGHT · {score.streak}
			STREAK
		</p>
	</div>

	{#if showEndCard}
		<div
			class="border-ink bg-paper-bright stamp mt-8 border-2 px-2 py-6 sm:px-6"
			data-testid="session-end-card"
		>
			<p class="text-label font-mono uppercase">ROUND COMPLETE</p>
			<p class="text-display mt-2 font-mono font-bold">
				{sessionSummary.correct} / {sessionSummary.total}
			</p>
			<p class="text-label font-mono uppercase" data-testid="end-card-streak">
				BEST RUN: {sessionSummary.bestStreak} IN A ROW
			</p>

			{#if sessionSummary.missedItems.length > 0}
				<p class="text-body mt-6">Worth another look:</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="end-card-misses">
					{#each sessionSummary.missedItems as missed (`${missed.family}:${missed.symbol}`)}
						<Button
							type="button"
							variant="ghost"
							aria-label={`Redrill ${missed.symbol}`}
							onclick={() => redrillMiss(missed)}
						>
							<span class="font-serif font-bold">{missed.symbol}</span>
						</Button>
					{/each}
				</div>
			{:else}
				<p class="text-body mt-6">Clean sheet. The press ran true, mon ami.</p>
			{/if}

			{#if unlockSuggestion !== null && unlockSuggestion.nextTier !== null && !unlockDismissed}
				<div class="border-ink mt-6 border-2 p-4" data-testid="unlock-card">
					<p class="text-label font-mono uppercase">
						TIER {unlockSuggestion.nextTier} LOOKS READY
					</p>
					<p class="text-body mt-2">
						Your last {unlockSuggestion.rollingCount} answers are {Math.round(
							unlockSuggestion.rollingAccuracy * 100
						)}% correct across {unlockSuggestion.distinctDays} days. Unlock {tierById(
							unlockSuggestion.nextTier
						).name.toLowerCase()}: {tierById(unlockSuggestion.nextTier)
							.qualities.map(qualityLabel)
							.join(', ')}?
					</p>
					<div class="mt-4 flex flex-wrap gap-4">
						<Button type="button" variant="primary" onclick={unlockNextTier}>
							Unlock Tier {unlockSuggestion.nextTier}
						</Button>
						<Button type="button" variant="ghost" onclick={snoozeUnlock}>Not yet</Button>
					</div>
				</div>
			{/if}

			<div class="mt-6">
				<Button type="button" variant="primary" onclick={() => startNewRound()}>
					Run it again
				</Button>
			</div>
		</div>
	{:else}
	<div
		class="drill-layout border-ink bg-paper-bright mt-8 border-2 px-2 py-6 sm:px-6"
		data-testid="drill-card"
	>
		{#if !hintDismissed}
			<p class="drill-layout__hint text-label border-ink flex items-center justify-between gap-4 border-2 px-3 py-2 font-mono uppercase" data-testid="rotate-hint">
				<span>Turn the phone sideways for the full two-octave board.</span>
				<button type="button" class="text-label shrink-0 font-mono underline" onclick={dismissHint}>
					Got it
				</button>
			</p>
		{/if}

		{#if question.kind === 'chord' && question.direction === 'construction'}
			<div class="drill-layout__prompt">
				{#if SOURCE_TAGS[questionSource]}
					<p class="text-label text-muted mb-2 font-mono uppercase" data-testid="question-source-tag">
						{SOURCE_TAGS[questionSource]}
					</p>
				{/if}
				<div class="flex items-start gap-4">
					<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
				</div>
				<p class="text-body mt-4">Click the notes for {question.symbol}.</p>

				{#if scaffoldStage === 'formula-first'}
					<div class="border-ink mt-4 border-2 p-4" data-testid="scaffold-card">
						<p class="text-label font-mono uppercase">NEW CHORD. FORMULA FIRST.</p>
						<div class="mt-3 flex flex-wrap gap-4">
							{#each formulaFor(target) as entry (entry.role + entry.letter)}
								<div class="flex flex-col items-center gap-1">
									<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
									<span class="text-label font-mono">{entry.letter}</span>
									<span class="text-label font-mono">{entry.solfege}</span>
								</div>
							{/each}
						</div>
						<p class="text-muted mt-3">Read it, then play it. This one counts as assisted.</p>
					</div>
				{:else if scaffoldStage === 'hinted' && !answered}
					{#if hintTaken}
						<div class="mt-4 flex flex-wrap gap-4" data-testid="hint-formula">
							{#each formulaFor(target) as entry (entry.role + entry.letter)}
								<div class="flex flex-col items-center gap-1">
									<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
									<span class="text-label font-mono">{entry.letter}</span>
									<span class="text-label font-mono">{entry.solfege}</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="mt-4">
							<Button type="button" variant="ghost" onclick={takeHint}>Show formula</Button>
						</div>
					{/if}
				{/if}

				<!--
					Always-on interval scaffold (sketch 005): on normal tier questions
					(no song-chord scaffold card), show the interval recipe while
					answering, fading by tier. Intervals only, never the answer notes,
					so it never gives the construction away.
				-->
				{#if scaffoldStage === null && !answered}
					<IntervalScaffold
						entries={formulaFor(target)}
						level={intervalScaffoldLevel(levelState.currentTier)}
					/>
				{/if}
			</div>

			<div class="drill-layout__keyboard">
				{#if isShortLandscape}
					{@render dockedKeyboard()}
				{/if}
			</div>

			<div class="drill-layout__controls drill-controls">
				<div class="drill-controls__primary">
					<Button
						type="button"
						variant="primary"
						disabled={selected.size === 0}
						onclick={checkAnswer}
					>
						Check
					</Button>
				</div>
				<div class="drill-controls__secondary">
					<Button type="button" variant="ghost" onclick={clearSelection}>Clear</Button>
				</div>
			</div>
		{:else if question.kind === 'chord'}
			<div class="drill-layout__prompt">
				{#if SOURCE_TAGS[questionSource]}
					<p class="text-label text-muted mb-2 font-mono uppercase" data-testid="question-source-tag">
						{SOURCE_TAGS[questionSource]}
					</p>
				{/if}
				<p class="text-body">Name this chord.</p>
			</div>

			<div class="drill-layout__keyboard">
				{#if isShortLandscape}
					{@render dockedKeyboard()}
				{/if}
			</div>

			<div class="drill-layout__controls">
				<div class="grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="choice-grid">
					{#each question.choices ?? [] as choice (choice)}
						<Button
							type="button"
							variant="ghost"
							disabled={answered}
							aria-label={`Answer: ${choice}`}
							onclick={() => selectChoice(choice)}
						>
							<span class="font-serif text-heading font-bold">{choice}</span>
						</Button>
					{/each}
				</div>
			</div>
		{:else if question.direction === 'identification'}
			<div class="drill-layout__prompt">
				{#if SOURCE_TAGS[questionSource]}
					<p class="text-label text-muted mb-2 font-mono uppercase" data-testid="question-source-tag">
						{SOURCE_TAGS[questionSource]}
					</p>
				{/if}
				<p class="text-body">Name this interval.</p>
			</div>

			<div class="drill-layout__keyboard">
				{#if isShortLandscape}
					{@render dockedKeyboard()}
				{/if}
			</div>

			<div class="drill-layout__controls">
				<div class="grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="interval-choice-grid">
					{#each question.choices ?? [] as choice (choice)}
						<Button
							type="button"
							variant="ghost"
							disabled={answered}
							aria-label={`Answer: ${choice}`}
							onclick={() => selectIntervalChoice(choice)}
						>
							<span class="flex flex-col items-center">
								<span class="font-mono text-heading font-bold">{choice}</span>
								<span class="text-label font-mono">{intervalFromShort(choice).longFr}</span>
							</span>
						</Button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="drill-layout__prompt">
				{#if SOURCE_TAGS[questionSource]}
					<p class="text-label text-muted mb-2 font-mono uppercase" data-testid="question-source-tag">
						{SOURCE_TAGS[questionSource]}
					</p>
				{/if}
				<p class="text-body" data-testid="interval-construction-prompt">
					Tap a <span class="font-mono font-bold">{question.interval.short}</span> above
					<span class="font-mono font-bold">{question.root}</span>.
					<span class="text-muted">{capitalizeFr(question.interval.longFr)}.</span>
				</p>
			</div>

			<div class="drill-layout__keyboard">
				{#if isShortLandscape}
					{@render dockedKeyboard()}
				{/if}
			</div>
		{/if}

		{#if answered && feedback}
			<div class="drill-layout__feedback stamp" data-testid="drill-feedback">
				{#if feedback.correct}
					<p class="text-body font-bold">{confirmationText}</p>
				{:else}
					<div class="bg-ink p-4">
						<p class="text-label text-mustard font-mono uppercase">{headlineText}</p>
					</div>
					{#if question.kind === 'chord'}
						<p class="text-muted mt-4">Here is the shape:</p>
						{#if question.direction === 'identification'}
							<div class="mt-4 flex items-start gap-4">
								<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
							</div>
						{/if}
						{#if question.direction === 'construction'}
							<p class="text-label mt-4 flex gap-4 font-mono" data-testid="feedback-legend">
								<span class="inline-flex items-center gap-2">
									<span
										class="inline-block h-3 w-3"
										style="background-color: var(--color-third);"
										aria-hidden="true"
									></span>
									The chord
								</span>
								<span class="inline-flex items-center gap-2">
									<span
										class="inline-block h-3 w-3"
										style="background-color: var(--color-wrong);"
										aria-hidden="true"
									></span>
									Your extra note
								</span>
							</p>
						{/if}
						<div class="mt-6 flex gap-4" data-testid="interval-formula">
							{#each formulaFor(target) as entry (entry.role + entry.letter)}
								<div class="flex flex-col items-center gap-1">
									<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
									<span class="text-label font-mono">{entry.letter}</span>
									<span class="text-label font-mono">{entry.solfege}</span>
								</div>
							{/each}
						</div>
						<RevealInsight
							correctSymbol={question.symbol}
							givenSymbol={question.direction === 'identification' ? givenSymbol : undefined}
						/>
					{:else}
						<p class="text-muted mt-4">Here is the interval:</p>
						<p class="text-label mt-2 font-mono uppercase" data-testid="interval-answer-line">
							{question.interval.short} · {question.interval.longFr}
						</p>
						{#if question.direction === 'construction' && tappedReadout}
							<p class="text-label mt-2 font-mono uppercase" data-testid="interval-tap-line">
								You tapped {tappedReadout.letter} · {tappedReadout.info.short} · {tappedReadout.info
									.longFr}
							</p>
						{/if}
						<SongHook short={question.interval.short} />
					{/if}
				{/if}
				{#if drillInspect}
					<InspectRegister payload={drillInspect} />
				{/if}
			</div>
		{/if}

		{#if answered}
			<div class="drill-layout__next">
				<Button type="button" variant="primary" onclick={nextQuestion}>Next</Button>
			</div>
		{/if}
	</div>
	{/if}
</main>

<style>
	/* @keyframes stamp-in now lives in app.css (shared with PianoKeyboard's
	   feedback-mode key stamp, Sketch 001 Variant A). */
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/*
	 * Portrait (base): a single column, top to bottom - hint, prompt, the
	 * keyboard, then Check/Clear directly below it in the thumb zone (D-10),
	 * followed by feedback and Next. Named grid areas (rather than margin
	 * utilities between siblings) let the landscape query below reflow the
	 * SAME elements into a two-pane layout without reordering the DOM.
	 */
	.drill-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas:
			'hint'
			'prompt'
			'keyboard'
			'controls'
			'feedback'
			'next';
		gap: var(--spacing-lg);
	}

	.drill-layout__hint {
		grid-area: hint;
	}

	.drill-layout__prompt {
		grid-area: prompt;
		min-width: 0;
	}

	.drill-layout__keyboard {
		grid-area: keyboard;
		min-width: 0;
	}

	.drill-layout__controls {
		grid-area: controls;
	}

	.drill-layout__feedback {
		grid-area: feedback;
		min-width: 0;
	}

	.drill-layout__next {
		grid-area: next;
	}

	/*
	 * D-05: the rotate hint only makes sense in portrait. The moment the
	 * device is landscape, hide it outright (independent of the compact
	 * two-pane query below) - the JS matchMedia listener in the script block
	 * persists the dismissal for future portrait visits, but this rule keeps
	 * it hidden immediately even on a browser lacking matchMedia.
	 */
	@media (orientation: landscape) {
		.drill-layout__hint {
			display: none;
		}
	}

	/*
	 * D-06: a genuinely short landscape viewport (a phone rotated, not a
	 * laptop/desktop window that merely happens to be wider than it is
	 * tall) switches to a side-by-side two-pane layout so everything fits
	 * without scrolling - prompt/controls (or the identification choices)
	 * on the left, the keyboard filling the remaining width on the right.
	 * Gating on max-height (not just orientation) keeps roomy landscape
	 * windows on the single-column layout.
	 */
	@media (orientation: landscape) and (max-height: 600px) {
		.drill-layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
			grid-template-areas:
				'prompt keyboard'
				'controls keyboard'
				'feedback feedback'
				'next next';
			align-items: center;
			gap: var(--spacing-md);
			margin-top: var(--spacing-sm);
		}

		.drill-layout__keyboard {
			align-self: center;
		}

		/*
		 * D-06 no-scroll fix: at a genuinely short landscape height (measured
		 * 844x390) the chrome ABOVE the two-pane card - the page's own
		 * vertical padding, the "Drills" h1 (redundant with the masthead's
		 * active nav state), and the score register's top margin - was
		 * costing 89px more than the viewport had, forcing a scroll to reach
		 * the keyboard's bottom / Check-Clear row. Compacting that chrome
		 * (not the card itself, which already fits) closes the gap. These
		 * element selectors are scoped to this component by Svelte, so they
		 * safely out-specificity the plain Tailwind utility classes
		 * (py-8/mt-2/mt-8/min-h-screen) they override, regardless of
		 * stylesheet order.
		 *
		 * min-height also needs clearing here: <main> carries min-h-screen
		 * (100vh) for the normal single-column page, but at this short
		 * landscape height the masthead sits ABOVE <main> - so a 100vh-tall
		 * <main> plus the masthead's own height always overflows the
		 * viewport by the masthead's height, even once the actual content is
		 * shrunk well below the fold. Letting <main> size to its own
		 * (now-compact) content removes that floor.
		 */
		main {
			min-height: 0;
			padding-top: var(--spacing-xs);
			padding-bottom: var(--spacing-xs);
		}

		h1 {
			display: none;
		}

		[data-testid='score-register'] {
			margin-top: 0;
			margin-bottom: var(--spacing-xs);
		}
	}

	/*
	 * D-10: Check is the generous primary target, Clear a smaller secondary
	 * beside it. Both are wrapped so a flex-basis ratio (not a fixed px
	 * width) controls the split, then stretched to fill their share via the
	 * :global() rule below (Button.svelte's own <button>/<a> has no
	 * caller-facing width prop).
	 */
	.drill-controls {
		display: flex;
		gap: var(--spacing-sm);
	}

	.drill-controls__primary {
		flex: 3;
	}

	.drill-controls__secondary {
		flex: 1;
	}

	.drill-controls__primary :global(.ps-button),
	.drill-controls__secondary :global(.ps-button) {
		width: 100%;
	}
</style>
