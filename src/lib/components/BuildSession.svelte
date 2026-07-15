<script lang="ts">
	import { onDestroy, tick } from 'svelte';
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
	let feedback = $state<Feedback | undefined>();
	let flashKey = $state<{ letter: string; octave: number } | null>(null);
	/** The letter last tapped (kept beyond the 320ms flash window so the wrong-octave restatement, shown for the full 650ms, can still name it). */
	let lastTappedLetter = $state('');
	let confirmationIndex = $state(-1);
	let wrongIndex = $state(-1);
	let containerEl: HTMLDivElement | undefined = $state();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Right-answer confirmation variants (D-08): rotated with a
	 * no-immediate-repeat picker, mirroring drills/+page.svelte's own
	 * CORRECT_VARIANTS/pickVariant convention.
	 */
	const CORRECT_VARIANTS = ['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'];
	/** Wrong-answer headline variants, reused verbatim from Drills. */
	const WRONG_VARIANTS = ['Not quite.', 'Close, but no cigar.', 'Not this time.'];

	/** Picks a variant, avoiding an immediate repeat (loop-free, mirrors drills/+page.svelte's pickVariant). */
	function pickVariant(variants: string[], lastIndex: number): [string, number] {
		if (variants.length === 1) return [variants[0], 0];
		let index = Math.floor(Math.random() * variants.length);
		if (index === lastIndex) {
			index = (index + 1) % variants.length;
		}
		return [variants[index], index];
	}

	/** Friendly quality names, in QUALITY_SUFFIXES' exact order (fixed mapping, see 12-04-PLAN.md). */
	const QUALITY_LABELS: Record<string, string> = {
		'': 'major',
		m: 'minor',
		dim: 'diminished',
		maj7: 'major 7th',
		m7: 'minor 7th',
		'7': 'dominant 7th',
		m7b5: 'half-diminished',
		dim7: 'diminished 7th'
	};

	/** Zips ROOTS (the ASCII value used to build the chord symbol) with MAJOR_SCALE_ROOTS (the glyph chip label) by index - both arrays share the same 12-root order. */
	const ROOT_CHIPS = ROOTS.map((ascii, i) => ({ ascii, label: MAJOR_SCALE_ROOTS[i] }));
	const QUALITY_CHIPS = QUALITY_SUFFIXES.map((suffix) => ({ suffix, label: QUALITY_LABELS[suffix] }));

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
		clearTimeout(flashTimer);
		clearTimeout(feedbackTimer);
		flashTimer = undefined;
		feedbackTimer = undefined;
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
		construction = createChordConstruction(`${pickedRoot}${pickedQuality}`);
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
	/** The chord's own glyph symbol, or "{tonic} major" for scales - both the WHY-line's/enharmonic-line's "symbol" fill-in. */
	const targetSymbol = $derived(
		kind === 'chords' ? (construction?.label ?? '') : `${pickedTonic ?? ''} major`
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

	/** "minor third", "major second"... the just-earned CONSECUTIVE interval's own quality + degree word (never the chord-tone role), for the enharmonic teaching line's "{intervalWord}s" pluralization. */
	function intervalWordFor(step: ConstructionStep): string {
		const qualityWord = step.interval.long.split(' ')[0];
		return `${qualityWord} ${step.interval.role}`;
	}

	/** "stack a minor 3rd" (chords) / "take a whole step" (scales), per D-03/phraseStep. */
	function phraseFor(step: ConstructionStep): string {
		return kind === 'chords'
			? phraseStep(step.interval.short)
			: phraseStep(step.interval.short, { asScaleStep: true });
	}

	function stepLineFor(step: ConstructionStep): string {
		return kind === 'chords'
			? `Stack a ${phraseFor(step)} up from ${lastLetter}.`
			: `Take a ${phraseFor(step)} up from ${lastLetter}.`;
	}

	function whyLineFor(step: ConstructionStep): string {
		return kind === 'chords'
			? `That's the ${step.role} of ${construction?.label}.`
			: `That's degree ${step.degree} of ${pickedTonic} major.`;
	}

	/** Interval-chip label for an earned note at `index`: 'R' for the pre-placed root, else the step it was earned on. */
	function chipLabelFor(index: number): string {
		if (index === 0) return 'R';
		return construction?.steps[index - 1]?.interval.short ?? '';
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
			feedback = { kind: 'wrong-octave', headline: 'Right note, wrong octave.' };
		}

		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => {
			flashKey = null;
		}, 320);

		const advancesPrompt = result.outcome === 'correct';
		const willComplete = advancesPrompt && result.state.done;
		const nextPromptState = result.state;
		clearTimeout(feedbackTimer);
		feedbackTimer = setTimeout(() => {
			feedback = undefined;
			if (advancesPrompt) promptState = nextPromptState;
			if (willComplete) sessionState = 'complete';
		}, 650);
	}

	onDestroy(() => {
		clearTimeout(flashTimer);
		clearTimeout(feedbackTimer);
	});
</script>

<div class="build-session" data-testid="build-session">
	<div class="flex gap-2" data-testid="kind-toggle" role="group" aria-label="Build kind">
		<Button
			type="button"
			variant={kind === 'chords' ? 'primary' : 'ghost'}
			aria-pressed={kind === 'chords'}
			onclick={() => setKind('chords')}
		>
			Chords
		</Button>
		<Button
			type="button"
			variant={kind === 'scales' ? 'primary' : 'ghost'}
			aria-pressed={kind === 'scales'}
			onclick={() => setKind('scales')}
		>
			Scales
		</Button>
	</div>

	{#if sessionState === 'picking'}
		<div class="mt-8" data-testid="picker">
			{#if kind === 'chords'}
				<p class="text-label font-mono uppercase">Root</p>
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

				<p class="text-label mt-4 font-mono uppercase">Quality</p>
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
				<p class="text-label font-mono uppercase">Tonic</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="tonic-row">
					{#each MAJOR_SCALE_ROOTS as root (root)}
						<Button
							type="button"
							variant={pickedTonic === root ? 'primary' : 'ghost'}
							aria-pressed={pickedTonic === root}
							onclick={() => pickTonic(root)}
						>
							{root} major
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
				<p class="text-heading font-bold" data-testid="build-target">{pickedTonic} major</p>
			{/if}

			{#if promptStep}
				<p
					class="text-label mt-4 font-mono uppercase"
					aria-live="polite"
					data-testid="build-register"
				>
					STEP {promptState.position + 1} OF {promptState.steps.length}
				</p>
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
								Show the count-up hint
							</Button>
						</div>
					{:else if countUpStep}
						<p class="text-body mt-2" data-testid="build-count-up-hint">
							{countUpStep.interval.semitones} half step{countUpStep.interval.semitones === 1
								? ''
								: 's'} up from {lastLetter}. Count it out.
						</p>
					{/if}
				{/if}
			{/if}

			{#if feedback}
				<div class="mt-4" data-testid="build-feedback">
					<p class="text-body font-bold">{feedback.headline}</p>
					{#if feedback.kind === 'correct' && feedback.notable}
						<p class="text-body mt-2" data-testid="build-enharmonic-line">
							This key's usually called {feedback.commonName}, but {targetSymbol} spells it {feedback.actualName}
							so the chord reads as a clean stack of {feedback.intervalWord}s.
						</p>
					{:else if feedback.kind === 'wrong-pitch-class'}
						<p class="text-body mt-2" data-testid="build-diagnostic">
							{feedback.semitones} half step{feedback.semitones === 1 ? '' : 's'} too {feedback.direction}.
						</p>
						{#if promptStep}
							<p class="text-body mt-2" data-testid="build-restatement">
								You need a {phraseFor(promptStep)} up from {lastLetter}.
							</p>
						{/if}
					{:else if feedback.kind === 'wrong-octave'}
						<p class="text-body mt-2" data-testid="build-restatement">
							You're stacking upward: try the next {lastTappedLetter} up.
						</p>
					{/if}
				</div>
			{/if}

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
	{:else if sessionState === 'complete'}
		<p class="text-body mt-8" data-testid="build-complete">Building {construction?.label}... done.</p>
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
