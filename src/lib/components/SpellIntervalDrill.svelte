<script lang="ts">
	import { untrack } from 'svelte';
	import {
		SPELLING_DRILL_INTERVALS,
		generateSpellingQuestion,
		gradeSpelling,
		type SpellingGrade,
		type SpellingQuestion
	} from '$lib/drills/spellIntervalQuestion';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import type { IntervalInfo } from '$lib/theory/interval';
	import IntervalChip from './IntervalChip.svelte';
	import Button from './Button.svelte';
	import { t, currentLocale } from '$lib/i18n/locale.svelte';

	/**
	 * Unit 4's proof drill (guided-path.md, interval naming): spell the
	 * interval rather than name it or tap it. This is the drill direction the
	 * pedagogy audit named as missing: `PracticeIntervalDrill` can ask the user
	 * to NAME an interval (identification) and to TAP one (construction), but
	 * a tapped key cannot force letter-name reasoning, since a black key
	 * answers two different questions at once (D♯ or E♭?). Spelling forces the
	 * choice explicitly: pick the LETTER, then the ACCIDENTAL.
	 *
	 * Deliberately NOT wired into the FSRS deck (owner decision, default no
	 * carding for this drill): no card, no FactKind, no answer telemetry.
	 * Self-contained on /learn, revealed only after the interval-naming lesson
	 * finishes its steps (TheoryLessons.svelte's "Prove it" block).
	 *
	 * Grading (`gradeSpelling`, spellIntervalQuestion.ts) keeps the pitch check
	 * and the letter check SEPARATE and EXPLICIT: `pitchCorrect` is chroma
	 * arithmetic (never a string comparison), `letterCorrect` is the one place
	 * this drill legitimately compares letters, because the letter is exactly
	 * what is under test. The two feedback branches below read directly off
	 * those two booleans, never off a single collapsed "answer string".
	 *
	 * A round is the full six-entry SPELLING_DRILL_INTERVALS pool, each on a
	 * random root, in shuffled order: small and curated (three enharmonic
	 * pairs, guided-path.md section 6.1's unit-4 sketch), so a full round
	 * always exercises every pair rather than leaving one to chance.
	 */

	const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
	const ACCIDENTALS = ['♭♭', '♭', '', '♯', '♯♯'] as const;

	/** Fisher-Yates shuffle using Math.random(), matching the drill generators' own style. */
	function shuffle<T>(items: T[]): T[] {
		const result = [...items];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	/**
	 * The whole round's questions, generated once at init (mirrors
	 * PracticeIntervalDrill's one-shot init read, via `untrack`): one question
	 * per pool entry, shuffled, each drawing its own random root.
	 */
	const questions: SpellingQuestion[] = untrack(() =>
		shuffle([...SPELLING_DRILL_INTERVALS]).map((short) => generateSpellingQuestion({ short }))
	);

	let index = $state(0);
	let pickedLetter = $state<string | null>(null);
	let pickedAccidental = $state('');
	let answered = $state(false);
	let grade = $state<SpellingGrade | null>(null);

	const question = $derived(questions[index]);
	const done = $derived(index >= questions.length);

	function longName(info: IntervalInfo): string {
		return currentLocale() === 'fr' ? info.longFr : info.long;
	}

	function pickLetter(letter: string): void {
		if (answered) return;
		pickedLetter = letter;
	}

	function pickAccidental(accidental: string): void {
		if (answered) return;
		pickedAccidental = accidental;
	}

	function accidentalLabel(accidental: string): string {
		return accidental === '' ? t('drills.spell.accidentalNatural') : accidental;
	}

	function submit(): void {
		if (answered || pickedLetter === null || done) return;
		grade = gradeSpelling(question, pickedLetter, pickedAccidental);
		answered = true;
		void ensureAudioReady();
		// Always plays the CORRECT reveal (root + canonical spelling), right or
		// wrong, matching the house convention PracticeIntervalDrill's `reveal`
		// already sets: every answer sounds the true answer once.
		playChord([question.root, question.expectedSpelling]);
	}

	function next(): void {
		index += 1;
		answered = false;
		grade = null;
		pickedLetter = null;
		pickedAccidental = '';
	}
</script>

<div data-testid="spell-interval-drill">
	{#if !done}
		<p class="text-body" data-testid="spell-prompt">
			{t('drills.spell.promptPrefix')}
			<span class="font-mono font-bold">{longName(question.interval)}</span>
			{t('drills.spell.promptInfix')}
			<span class="font-mono font-bold">{question.root}</span>.
		</p>

		<div class="mt-4">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('drills.spell.letterLabel')}
			</p>
			<div class="mt-2 flex flex-wrap gap-2" data-testid="spell-letter-row">
				{#each LETTERS as letter (letter)}
					<Button
						type="button"
						variant={pickedLetter === letter ? 'primary' : 'ghost'}
						disabled={answered}
						aria-pressed={pickedLetter === letter}
						onclick={() => pickLetter(letter)}
					>
						{letter}
					</Button>
				{/each}
			</div>

			<p class="text-label mt-4 font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('drills.spell.accidentalLabel')}
			</p>
			<div class="mt-2 flex flex-wrap gap-2" data-testid="spell-accidental-row">
				{#each ACCIDENTALS as accidental (accidental)}
					<Button
						type="button"
						variant={pickedAccidental === accidental ? 'primary' : 'ghost'}
						disabled={answered}
						aria-pressed={pickedAccidental === accidental}
						aria-label={accidentalLabel(accidental)}
						onclick={() => pickAccidental(accidental)}
					>
						{accidental === '' ? '♮' : accidental}
					</Button>
				{/each}
			</div>
		</div>

		{#if !answered}
			<div class="mt-4">
				<Button type="button" variant="primary" disabled={pickedLetter === null} onclick={submit}>
					{t('drills.spell.check')}
				</Button>
			</div>
		{:else if grade}
			<div class="mt-4 stamp" data-testid="spell-feedback">
				<IntervalChip
					role={question.interval.role}
					label={question.interval.short}
					longName={longName(question.interval)}
				/>
				<p class="text-label mt-2 font-mono uppercase" data-testid="spell-answer-line">
					{question.expectedSpelling} · {question.interval.short} · {longName(question.interval)}
				</p>

				{#if grade.correct}
					<p class="text-body mt-2" data-testid="spell-correct-line">
						{t('drills.feedback.correct')}
					</p>
				{:else}
					<p class="text-body mt-2" data-testid="spell-incorrect-line">
						{t('drills.feedback.incorrect')}
					</p>

					{#if grade.pitchCorrect && !grade.letterCorrect}
						<!--
							The flagship enharmonic trap this drill exists to catch: right
							key, wrong letter. `grade.givenInterval` names exactly what the
							picked letter+accidental actually spells, so the line states
							the user's own mistake by name, not just "wrong".
						-->
						<p class="text-body mt-2" data-testid="spell-letter-trap-line">
							{t('drills.spell.letterTrap')
								.replace('{PICKED}', pickedLetter ?? '')
								.replace('{GIVEN_SHORT}', grade.givenInterval.short)
								.replace('{EXPECTED}', question.expectedLetter)
								.replace('{CORRECT_SHORT}', question.interval.short)}
						</p>
					{:else}
						<p class="text-body mt-2" data-testid="spell-pitch-contrast-line">
							{t('drills.spell.halfStepContrast')
								.replace('{A}', grade.givenInterval.short || '?')
								.replace('{N}', String(Math.max(grade.givenInterval.semitones, 0)))
								.replace('{B}', question.interval.short)
								.replace('{M}', String(question.interval.semitones))}
						</p>
					{/if}
				{/if}
			</div>
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={next}>{t('drills.button.next')}</Button>
			</div>
		{/if}
	{:else}
		<p class="text-body" data-testid="spell-round-complete">{t('drills.spell.roundComplete')}</p>
	{/if}
</div>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
