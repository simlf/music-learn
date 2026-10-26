<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { spellChord } from '$lib/theory/chord';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import {
		SPRINT_POINTS,
		SPRINT_SECONDS,
		chipQuestion,
		comboMultiplier,
		formatClock,
		type ChipQuestion
	} from '$lib/practice/challenges';
	import { readBest, submitResult } from '$lib/practice/challengeRecords';
	import { localDateString } from '$lib/api/progress';
	import { recordPracticeDay } from '$lib/practice/practiceDays';
	import ChordGlyph from './ChordGlyph.svelte';
	import ChallengeChoiceGrid from './ChallengeChoiceGrid.svelte';
	import ChallengeEnd from './ChallengeEnd.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The 60-second sprint (ml-practice-game, practice/challenges.ts): a chord
	 * symbol at a time, tap its notes from four spellings, as many as the
	 * minute allows. A right answer scores SPRINT_POINTS times the combo
	 * multiplier; a miss resets the in-round combo and costs nothing else.
	 *
	 * Never touches the deck: no FSRS grade, no answer telemetry (see
	 * challenges.ts). The only things it writes are its own personal best and
	 * the practice day, and the day only once something was answered.
	 */

	interface Props {
		/** The chords to draw from (challenges.challengePool). */
		pool: string[];
		onAgain: () => void;
	}

	let { pool, onAgain }: Props = $props();

	/** How long a right answer's burst holds before the next symbol. */
	const RIGHT_HOLD_MS = 350;
	/** A miss holds longer, so the right spelling can be read. */
	const WRONG_HOLD_MS = 900;
	const TICK_MS = 200;

	const DURATION_MS = SPRINT_SECONDS * 1000;

	let question = $state<ChipQuestion | undefined>(untrack(() => chipQuestion(pool)));
	let picked = $state<string | undefined>(undefined);
	let points = $state(0);
	let right = $state(0);
	let answered = $state(0);
	let streak = $state(0);
	let done = $state(false);
	let newBest = $state(false);
	let best = $state<number | undefined>(undefined);

	let startedAt = Date.now();
	let now = $state(startedAt);
	let ticker: ReturnType<typeof setInterval> | undefined;
	let advanceTimer: ReturnType<typeof setTimeout> | undefined;

	const remainingMs = $derived(Math.max(0, DURATION_MS - (now - startedAt)));
	/** The multiplier the NEXT right answer earns, which is what the register shows. */
	const nextMultiplier = $derived(comboMultiplier(streak + 1));

	const target = $derived(question === undefined ? undefined : spellChord(question.symbol));

	function spellingOf(symbol: string): string {
		return spellChord(symbol)
			.notes.map((note) => note.letter)
			.join(' ');
	}

	function stop(): void {
		if (ticker !== undefined) clearInterval(ticker);
		if (advanceTimer !== undefined) clearTimeout(advanceTimer);
		ticker = undefined;
		advanceTimer = undefined;
	}

	function finish(): void {
		if (done) return;
		stop();
		done = true;
		const outcome = submitResult('sprint', points, 'higher');
		newBest = outcome.newBest;
		best = outcome.best;
		if (answered > 0) recordPracticeDay(localDateString());
	}

	function tick(): void {
		now = Date.now();
		if (now - startedAt >= DURATION_MS) finish();
	}

	function pick(choice: string): void {
		if (done || picked !== undefined || question === undefined) return;
		picked = choice;
		answered += 1;
		if (choice === question.symbol) {
			streak += 1;
			right += 1;
			points += SPRINT_POINTS * comboMultiplier(streak);
			if (target !== undefined) playChord(target.notes.map((note) => note.letter));
		} else {
			streak = 0;
		}
		const hold = choice === question.symbol ? RIGHT_HOLD_MS : WRONG_HOLD_MS;
		const previous = question.symbol;
		advanceTimer = setTimeout(() => {
			advanceTimer = undefined;
			if (done) return;
			question = chipQuestion(pool, previous);
			picked = undefined;
		}, hold);
	}

	onMount(() => {
		void ensureAudioReady();
		startedAt = Date.now();
		now = startedAt;
		best = readBest('sprint');
		ticker = setInterval(tick, TICK_MS);
	});

	onDestroy(stop);
</script>

<div data-testid="sprint-challenge">
	{#if done}
		<p class="text-label font-mono uppercase">{t('practice.challenge.sprint.timeUp')}</p>
		<ChallengeEnd
			result={t('practice.challenge.points').replace('{N}', String(points))}
			line={t('practice.challenge.sprint.end').replace('{N}', String(right))}
			{newBest}
			best={best === undefined ? undefined : String(best)}
			{onAgain}
		/>
	{:else if question !== undefined && target !== undefined}
		<p class="text-label font-mono uppercase" data-testid="sprint-register">
			{t('practice.challenge.sprint.timeLeft').replace('{T}', formatClock(Math.ceil(remainingMs / 1000) * 1000))} ·
			{t('practice.challenge.points').replace('{N}', String(points))}
		</p>
		<p class="text-label mt-1 font-mono uppercase" data-testid="sprint-combo">
			{#key nextMultiplier}
				<span class:combo-hot={nextMultiplier > 1} class="combo">
					{t('practice.challenge.combo').replace('{X}', String(nextMultiplier))}
				</span>
			{/key}
			{#if streak > 1}
				· {t('practice.challenge.inARow').replace('{N}', String(streak))}
			{/if}
		</p>
		<div class="clock mt-2" aria-hidden="true">
			<div class="clock__fill" style="width: {(remainingMs * 100) / DURATION_MS}%"></div>
		</div>

		<div class="mt-6 flex items-start gap-4" data-testid="sprint-prompt">
			<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
		</div>
		<p class="text-body mt-4">{t('drills.prompt.pickNotes')}</p>
		<div class="mt-4">
			<ChallengeChoiceGrid
				choices={question.choices}
				answer={question.symbol}
				{picked}
				labelFor={spellingOf}
				spelled
				onPick={pick}
			/>
		</div>
	{/if}
</div>

<style>
	.clock {
		height: 6px;
		background-color: var(--color-paper);
		border: 2px solid var(--color-ink);
	}

	.clock__fill {
		height: 100%;
		background-color: var(--color-ink);
		transition: width 200ms linear;
	}

	.combo {
		display: inline-block;
	}

	/* A live combo inverts to ink: vermilion text at 12px is 3.8:1 on paper, under AA. */
	.combo-hot {
		background-color: var(--color-ink);
		color: var(--color-paper);
		padding: 0 var(--spacing-xs);
		animation: stamp-in 240ms ease-out;
	}
</style>
