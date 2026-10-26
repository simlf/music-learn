<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import { ensureAudioReady, playChord, soundEnabled } from '$lib/audio/audio';
	import { EAR_DUEL_ROUNDS, chipQuestion, type ChipQuestion } from '$lib/practice/challenges';
	import { readBest, submitResult } from '$lib/practice/challengeRecords';
	import { localDateString } from '$lib/api/progress';
	import { recordPracticeDay } from '$lib/practice/practiceDays';
	import Button from './Button.svelte';
	import ChallengeChoiceGrid from './ChallengeChoiceGrid.svelte';
	import ChallengeEnd from './ChallengeEnd.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The ear duel (ml-practice-game, practice/challenges.ts): EAR_DUEL_ROUNDS
	 * chords by ear, each named from four same-root choices, with an in-round
	 * streak. Each chord plays as it appears and again on the reveal; "Play
	 * again" repeats it as often as wanted. A right answer moves on by itself,
	 * a miss waits on Next so the answer can be heard and read.
	 *
	 * Needs sound, nothing else: headphones on a train are the intended setup.
	 * Never touches the deck (see challenges.ts).
	 */

	interface Props {
		pool: string[];
		onAgain: () => void;
	}

	let { pool, onAgain }: Props = $props();

	const RIGHT_HOLD_MS = 700;

	const soundOn = soundEnabled();

	let question = $state<ChipQuestion | undefined>(untrack(() => chipQuestion(pool)));
	let round = $state(1);
	let picked = $state<string | undefined>(undefined);
	let right = $state(0);
	let streak = $state(0);
	let bestStreak = $state(0);
	let done = $state(false);
	let newBest = $state(false);
	let best = $state<number | undefined>(undefined);
	let advanceTimer: ReturnType<typeof setTimeout> | undefined;

	function playCurrent(): void {
		if (question === undefined) return;
		void ensureAudioReady();
		playChord(spellChord(question.symbol).notes.map((note) => note.letter));
	}

	/** A choice as the chip shows it, glyph accidentals and all: "B♭m7", not "Bbm7". */
	function displaySymbol(symbol: string): string {
		return chordLabel(spellChord(symbol));
	}

	function finish(): void {
		done = true;
		const outcome = submitResult('ear-duel', right, 'higher');
		newBest = outcome.newBest;
		best = outcome.best;
		recordPracticeDay(localDateString());
	}

	function next(): void {
		if (advanceTimer !== undefined) clearTimeout(advanceTimer);
		advanceTimer = undefined;
		if (round >= EAR_DUEL_ROUNDS) {
			finish();
			return;
		}
		round += 1;
		question = chipQuestion(pool, question?.symbol);
		picked = undefined;
		playCurrent();
	}

	function pick(choice: string): void {
		if (done || picked !== undefined || question === undefined) return;
		picked = choice;
		if (choice === question.symbol) {
			right += 1;
			streak += 1;
			bestStreak = Math.max(bestStreak, streak);
			advanceTimer = setTimeout(next, RIGHT_HOLD_MS);
		} else {
			streak = 0;
			playCurrent();
		}
	}

	onMount(() => {
		best = readBest('ear-duel');
		playCurrent();
	});

	onDestroy(() => {
		if (advanceTimer !== undefined) clearTimeout(advanceTimer);
	});
</script>

<div data-testid="ear-duel-challenge">
	{#if done}
		<ChallengeEnd
			result={`${right} / ${EAR_DUEL_ROUNDS}`}
			line={t('practice.challenge.earDuel.end')
				.replace('{N}', String(right))
				.replace('{M}', String(EAR_DUEL_ROUNDS))}
			{newBest}
			best={best === undefined ? undefined : `${best} / ${EAR_DUEL_ROUNDS}`}
			{onAgain}
		/>
		<p class="text-label mt-2 font-mono uppercase" data-testid="ear-duel-best-run">
			{t('drills.end.bestRunPrefix')} {bestStreak} {t('drills.end.bestRunSuffix')}
		</p>
	{:else if question !== undefined}
		<p class="text-label font-mono uppercase" data-testid="ear-duel-register">
			{t('practice.challenge.earDuel.progress')
				.replace('{N}', String(round))
				.replace('{M}', String(EAR_DUEL_ROUNDS))} ·
			{#key streak}
				<span class:streak-hot={streak > 1} class="streak">
					{t('practice.challenge.inARow').replace('{N}', String(streak))}
				</span>
			{/key}
		</p>
		{#if !soundOn}
			<p class="text-body mt-4" data-testid="ear-duel-sound-off">
				{t('practice.challenge.earDuel.soundOff')}
			</p>
		{/if}

		<p class="text-body mt-4">{t('recall.prompt.hear-name')}</p>
		<div class="mt-4">
			<Button type="button" variant="ghost" onclick={playCurrent}>{t('recall.cta.play-again')}</Button>
		</div>
		<div class="mt-4">
			<ChallengeChoiceGrid
				choices={question.choices}
				answer={question.symbol}
				{picked}
				labelFor={displaySymbol}
				onPick={pick}
			/>
		</div>
		{#if picked !== undefined && picked !== question.symbol}
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={next}>{t('drills.button.next')}</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.streak {
		display: inline-block;
	}

	/* A live streak inverts to ink: vermilion text at 12px is 3.8:1 on paper, under AA. */
	.streak-hot {
		background-color: var(--color-ink);
		color: var(--color-paper);
		padding: 0 var(--spacing-xs);
		animation: stamp-in 240ms ease-out;
	}
</style>
