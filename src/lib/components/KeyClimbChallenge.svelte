<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Note } from 'tonal';
	import { spellChord } from '$lib/theory/chord';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { matchChord } from '$lib/drills/matchChord';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { formatClock, keyClimbStops } from '$lib/practice/challenges';
	import { readBest, recordKey, submitResult } from '$lib/practice/challengeRecords';
	import { localDateString } from '$lib/api/progress';
	import { recordPracticeDay } from '$lib/practice/practiceDays';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import ChallengeEnd from './ChallengeEnd.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The key climb (ml-practice-game, practice/challenges.ts): today's chord
	 * quality in all twelve keys, falling fifths from C, each one played on the
	 * on-screen keyboard and checked, against the clock. A wrong check marks the
	 * stray keys gray and lets the user fix them in place: the only cost of a
	 * miss is the seconds it takes, never a penalty or a restart.
	 *
	 * Grading is matchChord's chroma-set equality (octave, inversion and
	 * enharmonic agnostic), the same rule see-play uses, so the on-screen
	 * keyboard is the whole input: no piano or MIDI device is needed. Personal
	 * bests are kept per quality. Never touches the deck (see challenges.ts).
	 */

	interface Props {
		/** Today's quality suffix ("m7", "" for major triads...). */
		quality: string;
		onAgain: () => void;
	}

	let { quality, onAgain }: Props = $props();

	const RIGHT_HOLD_MS = 450;
	const TICK_MS = 250;

	const stops = untrack(() => keyClimbStops(quality));
	const bestKey = untrack(() => recordKey('key-climb', quality));

	let index = $state(0);
	let selected = $state<Set<string>>(new Set());
	let wrongLetters = $state<Set<string> | undefined>(undefined);
	let status = $state<'playing' | 'retry' | 'right'>('playing');
	let done = $state(false);
	let newBest = $state(false);
	let best = $state<number | undefined>(undefined);
	let finalMs = $state(0);

	let startedAt = Date.now();
	let now = $state(startedAt);
	let ticker: ReturnType<typeof setInterval> | undefined;
	let advanceTimer: ReturnType<typeof setTimeout> | undefined;

	const target = $derived(spellChord(stops[index]));
	const elapsedMs = $derived(now - startedAt);

	function toggleKey(letter: string): void {
		if (status === 'right') return;
		const next = new Set(selected);
		if (next.has(letter)) next.delete(letter);
		else next.add(letter);
		selected = next;
		if (status === 'retry') {
			status = 'playing';
			wrongLetters = undefined;
		}
	}

	function stopTimers(): void {
		if (ticker !== undefined) clearInterval(ticker);
		if (advanceTimer !== undefined) clearTimeout(advanceTimer);
		ticker = undefined;
		advanceTimer = undefined;
	}

	function finish(): void {
		stopTimers();
		finalMs = Date.now() - startedAt;
		done = true;
		const outcome = submitResult(bestKey, finalMs, 'lower');
		newBest = outcome.newBest;
		best = outcome.best;
		recordPracticeDay(localDateString());
	}

	function check(): void {
		if (status === 'right' || selected.size === 0) return;
		const played = new Set([...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter))));
		const result = matchChord(played, target);
		if (!result.correct) {
			const extra = new Set(result.extra);
			wrongLetters = new Set(
				[...selected].filter((letter) => extra.has(Note.chroma(toAsciiAccidentals(letter))))
			);
			status = 'retry';
			return;
		}
		status = 'right';
		playChord(target.notes.map((note) => note.letter));
		advanceTimer = setTimeout(() => {
			advanceTimer = undefined;
			if (index >= stops.length - 1) {
				finish();
				return;
			}
			index += 1;
			selected = new Set();
			wrongLetters = undefined;
			status = 'playing';
		}, RIGHT_HOLD_MS);
	}

	onMount(() => {
		void ensureAudioReady();
		best = readBest(bestKey);
		startedAt = Date.now();
		now = startedAt;
		ticker = setInterval(() => {
			now = Date.now();
		}, TICK_MS);
	});

	onDestroy(stopTimers);
</script>

<div data-testid="key-climb-challenge">
	{#if done}
		<ChallengeEnd
			result={formatClock(finalMs)}
			line={t('practice.challenge.keyClimb.end').replace('{TIME}', formatClock(finalMs))}
			{newBest}
			best={best === undefined ? undefined : formatClock(best)}
			{onAgain}
		/>
	{:else}
		<p class="text-label font-mono uppercase" data-testid="key-climb-register">
			{t('practice.challenge.keyClimb.progress')
				.replace('{N}', String(index + 1))
				.replace('{M}', String(stops.length))} · {formatClock(elapsedMs)}
		</p>
		<ol class="rungs mt-2" aria-hidden="true">
			{#each stops as stop, stopIndex (stop)}
				<li
					class="rung"
					class:rung--done={stopIndex < index || (stopIndex === index && status === 'right')}
					class:rung--here={stopIndex === index && status !== 'right'}
				></li>
			{/each}
		</ol>

		<div class="mt-6 flex items-start gap-4" data-testid="key-climb-prompt">
			{#key index}
				<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} stamped />
			{/key}
		</div>
		<p class="text-body mt-4">{t('recall.prompt.see-play')}</p>

		<div class="mt-4">
			<PianoKeyboard
				notes={status === 'right' ? target.notes : []}
				interactive={status !== 'right'}
				selected={status === 'right' ? undefined : selected}
				onToggle={status === 'right' ? undefined : toggleKey}
				{wrongLetters}
			/>
		</div>

		{#if status === 'retry'}
			<p class="text-body mt-4" data-testid="key-climb-retry">
				{t('practice.challenge.keyClimb.retry')}
			</p>
		{/if}
		{#if status === 'right'}
			<p class="text-body stamp mt-4 font-bold" data-testid="key-climb-right">
				<span aria-hidden="true">✓</span>
				{t('drills.feedback.correct')}
			</p>
		{:else}
			<div class="mt-4">
				<Button type="button" variant="primary" disabled={selected.size === 0} onclick={check}>
					{t('recall.cta.check')}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.rungs {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 4px;
		list-style: none;
		margin: 0;
		padding: 0;
		max-width: 320px;
	}

	.rung {
		height: 10px;
		border: 2px solid var(--color-muted);
	}

	.rung--done {
		background-color: var(--color-ink);
		border-color: var(--color-ink);
	}

	.rung--here {
		border-color: var(--color-vermilion);
	}

	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
