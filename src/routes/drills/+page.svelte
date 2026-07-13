<script lang="ts">
	import { Note } from 'tonal';
	import { spellChord } from '$lib/theory/chord';
	import { formulaFor } from '$lib/lookup/chordPresentation';
	import { generateQuestion } from '$lib/drills/generateQuestion';
	import { matchChord } from '$lib/drills/matchChord';
	import type { DrillQuestion } from '$lib/drills/generateQuestion';
	import type { MatchResult } from '$lib/drills/matchChord';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import Button from '$lib/components/Button.svelte';

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

	/** Picks a variant, avoiding an immediate repeat, mirroring pickHint's anti-repeat logic. */
	function pickVariant(variants: string[], lastIndex: number): [string, number] {
		if (variants.length === 1) return [variants[0], 0];
		let index = Math.floor(Math.random() * variants.length);
		while (index === lastIndex) {
			index = Math.floor(Math.random() * variants.length);
		}
		return [variants[index], index];
	}

	/** tonal's Note.chroma only understands ASCII accidentals (#/b), not display glyphs (♯/♭). */
	function toAsciiAccidentals(letter: string): string {
		return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
	}

	// Interleaving (D-06): generateQuestion() is drawn directly for BOTH kinds
	// on load and on every Next - no mode toggle, no loop-until-construction.
	// Each question is randomly construction or identification.
	let question = $state<DrillQuestion>(generateQuestion());
	const target = $derived(spellChord(question.symbol));

	let selected = $state<Set<string>>(new Set());
	let answered = $state(false);
	let feedback = $state<MatchResult | null>(null);
	let confirmationText = $state('');
	let headlineText = $state('');

	/** Snapshot of what the user played (letters, in click order) at grading time, for the diff row. */
	let playedLetters = $state<string[]>([]);

	/** In-session running tally (D-10): in-memory only, no localStorage, resets on reload. */
	let score = $state({ correct: 0, streak: 0 });

	function recordGrade(correct: boolean) {
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
		if (answered) return;
		answered = true;
		const correct = choice === question.symbol;
		feedback = { correct, missing: [], extra: [] };
		recordGrade(correct);
	}

	/** Next (D-07): draws a fresh interleaved question and clears all per-question state. */
	function nextQuestion() {
		question = generateQuestion();
		selected = new Set();
		answered = false;
		feedback = null;
		playedLetters = [];
	}

	/** Whether a played letter's chroma is an extra note (not part of the target chord). */
	function isExtraLetter(letter: string): boolean {
		const chroma = Note.chroma(toAsciiAccidentals(letter));
		return feedback?.extra.includes(chroma) ?? false;
	}
</script>

<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading mt-2 font-bold">Drills</h1>

	<p class="text-label mt-8 text-right font-mono uppercase" data-testid="score-register">
		{score.correct} RIGHT · {score.streak} STREAK
	</p>

	<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="drill-card">
		{#if question.kind === 'construction'}
			<div class="flex items-start gap-4">
				<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
			</div>
			<p class="text-body mt-4">Click the notes for {question.symbol}.</p>

			<div class="mt-6">
				<PianoKeyboard notes={[]} interactive {selected} onToggle={toggleKey} />
			</div>

			<div class="mt-6 flex gap-2">
				<Button
					type="button"
					variant="primary"
					disabled={selected.size === 0}
					onclick={checkAnswer}
				>
					Check
				</Button>
				<Button type="button" variant="ghost" onclick={clearSelection}>Clear</Button>
			</div>
		{:else}
			<p class="text-body">Name this chord.</p>

			<div class="mt-6">
				<PianoKeyboard notes={target.notes} />
			</div>

			<div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="choice-grid">
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
		{/if}

		{#if answered && feedback}
			<div class="stamp mt-6" data-testid="drill-feedback">
				{#if feedback.correct}
					<p class="text-body font-bold">{confirmationText}</p>
				{:else}
					<div class="bg-ink p-4">
						<p class="text-label text-mustard font-mono uppercase">{headlineText}</p>
					</div>
					<p class="text-muted mt-4">Here is the shape:</p>
					{#if question.kind === 'identification'}
						<div class="mt-4 flex items-start gap-4">
							<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
						</div>
					{/if}
					<div class="mt-4">
						<PianoKeyboard notes={target.notes} />
					</div>
					<div class="mt-6 flex gap-4" data-testid="interval-formula">
						{#each formulaFor(target) as entry (entry.role + entry.letter)}
							<div class="flex flex-col items-center gap-1">
								<IntervalChip role={entry.role} label={entry.label} />
								<span class="text-label font-mono">{entry.letter}</span>
								<span class="text-label font-mono">{entry.solfege}</span>
							</div>
						{/each}
					</div>
					{#if question.kind === 'construction'}
						<div class="mt-6 flex flex-col gap-2">
							<p class="text-label font-mono" data-testid="played-diff">
								<span class="text-muted">You played:</span>
								{#each playedLetters as letter, i (letter + i)}
									{#if isExtraLetter(letter)}
										<span class="border-ink inline-block border-2 px-1">{letter}</span>
									{:else}
										<span>{letter}</span>
									{/if}
									{i < playedLetters.length - 1 ? ', ' : ''}
								{/each}
							</p>
							<p class="text-label font-mono" data-testid="correct-diff">
								<span class="text-muted">Correct:</span>
								{target.notes.map((note) => note.letter).join(', ')}
							</p>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		{#if answered}
			<div class="mt-6">
				<Button type="button" variant="primary" onclick={nextQuestion}>Next</Button>
			</div>
		{/if}
	</div>
</main>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	@keyframes stamp-in {
		0% {
			transform: scale(0.96);
			opacity: 0;
		}
		60% {
			transform: scale(1.02);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
</style>
