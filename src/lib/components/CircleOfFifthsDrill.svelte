<script lang="ts">
	import {
		CYCLE_DIRECTIONS,
		DISTANCE_STEPS,
		FIFTHS_CYCLE,
		HOPS_PER_ROUND,
		ROUNDS_PER_LAP,
		cycleRound,
		distanceQuestion,
		isSameStop,
		nextStopChoices,
		stepsFrom,
		type CycleDirection,
		type DistanceQuestion
	} from '$lib/practice/circleOfFifths';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 16's "At the piano" exercise, two questions over the pure
	 * `circleOfFifths.ts` engine.
	 *
	 * NEXT STOP: a start key and a direction (down a fifth by default, the
	 * ii-V-I direction); name the next root from four chips or play it on the
	 * keyboard, graded by pitch class (`isSameStop`), three hops per round. Each
	 * round starts where the last one stopped, so four rounds walk all 12 keys
	 * and land back on the start: one lap. The bar strip is the progression
	 * drill's measure grid (sketch-017's earned / cursor / future states),
	 * mirrored here rather than imported, so a learner who knows that chrome
	 * reads this one for free.
	 *
	 * HOW FAR APART: two keys 2 to 5 fifths apart; pick the count and the
	 * direction of the shorter way round. The path is drawn on the same strip
	 * once it is answered.
	 *
	 * Ungraded bonus, like the chapter 15 exercise: it lives on the chapter
	 * page, never in /practice, creates no card, writes no answer event and
	 * plays no sound of its own (the keyboard sounds its own key taps). A wrong
	 * answer shows a retry line and never gates. `onLapClean(direction)` fires
	 * when a lap had every stop right the first time; `onDistanceStreak()`
	 * fires on DISTANCE_STREAK pairs in a row right the first time. The
	 * chapter turns both into checklist ticks; nothing else is remembered.
	 */
	interface Props {
		onLapClean?: (direction: CycleDirection) => void;
		onDistanceStreak?: () => void;
	}

	let { onLapClean, onDistanceStreak }: Props = $props();

	/** Pairs in a row, right the first time, that tick the distance checklist line. */
	const DISTANCE_STREAK = 5;

	type Mode = 'next' | 'distance';
	const MODES: readonly Mode[] = ['next', 'distance'];

	const MODE_KEY: Record<Mode, MessageKey> = {
		next: 'book.ch16.mode.next',
		distance: 'book.ch16.mode.distance'
	};
	const DIRECTION_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.direction.down',
		up: 'book.ch16.direction.up'
	};
	const WAY_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.distance.down',
		up: 'book.ch16.distance.up'
	};
	const BAR_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.bar.down',
		up: 'book.ch16.bar.up'
	};
	const PROMPT_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.prompt.down',
		up: 'book.ch16.prompt.up'
	};
	const RETRY_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.retry.down',
		up: 'book.ch16.retry.up'
	};
	const ROUND_DONE_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.roundDone.down',
		up: 'book.ch16.roundDone.up'
	};
	const DISTANCE_RIGHT_KEY: Record<CycleDirection, MessageKey> = {
		down: 'book.ch16.distance.right.down',
		up: 'book.ch16.distance.right.up'
	};

	function fill(template: string, values: Record<string, string>): string {
		return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
	}

	let mode = $state<Mode>('next');

	// ---- Next stop -------------------------------------------------------

	let direction = $state<CycleDirection>('down');
	let lapStart = $state('C');
	let round = $state(0);
	/** Index into `stops` of the stop being asked; past HOPS_PER_ROUND means the round is answered. */
	let cursor = $state(1);
	let lapMissed = $state(false);
	let lapDone = $state(false);
	let choices = $state<string[]>([]);
	let nextFeedback = $state<{ kind: 'none' } | { kind: 'retry'; answer: string } | { kind: 'right'; stop: string }>(
		{ kind: 'none' }
	);

	const roundStart = $derived(stepsFrom(lapStart, round * HOPS_PER_ROUND, direction) ?? lapStart);
	const stops = $derived(cycleRound(roundStart, direction));
	const roundDone = $derived(cursor > HOPS_PER_ROUND);
	const from = $derived(stops[cursor - 1]);
	/** The start keys offered, spelled for the direction (F♯ going up, G♭ going down). */
	const startKeys = $derived(FIFTHS_CYCLE.map((key) => stepsFrom(key, 0, direction) ?? key));

	function ask(): void {
		const current = cycleRound(stepsFrom(lapStart, round * HOPS_PER_ROUND, direction) ?? lapStart, direction);
		choices = cursor <= HOPS_PER_ROUND ? nextStopChoices(current[cursor - 1], direction) : [];
	}

	function startLap(nextDirection: CycleDirection, start: string): void {
		direction = nextDirection;
		lapStart = start;
		round = 0;
		cursor = 1;
		lapMissed = false;
		lapDone = false;
		nextFeedback = { kind: 'none' };
		ask();
	}

	function answer(letter: string): void {
		if (roundDone || lapDone) return;
		const expected = stops[cursor];
		if (!isSameStop(letter, expected)) {
			lapMissed = true;
			nextFeedback = { kind: 'retry', answer: letter };
			return;
		}
		nextFeedback = { kind: 'right', stop: expected };
		cursor += 1;
		if (cursor > HOPS_PER_ROUND && round === ROUNDS_PER_LAP - 1) {
			lapDone = true;
			if (!lapMissed) onLapClean?.(direction);
			return;
		}
		ask();
	}

	function nextRound(): void {
		round += 1;
		cursor = 1;
		nextFeedback = { kind: 'none' };
		ask();
	}

	ask();

	// ---- How far apart -----------------------------------------------------

	let question = $state<DistanceQuestion>(distanceQuestion());
	let pickedSteps = $state<number | null>(null);
	let pickedWay = $state<CycleDirection | null>(null);
	let missedPair = $state(false);
	let answered = $state(false);
	let streak = $state(0);
	let distanceFeedback = $state<
		{ kind: 'none' } | { kind: 'pick' } | { kind: 'count' } | { kind: 'way' } | { kind: 'both' } | { kind: 'right' }
	>({ kind: 'none' });
	let streakTicked = $state(false);

	function checkDistance(): void {
		if (answered) return;
		if (pickedSteps === null || pickedWay === null) {
			distanceFeedback = { kind: 'pick' };
			return;
		}
		const countRight = pickedSteps === question.steps;
		const wayRight = pickedWay === question.direction;
		if (countRight && wayRight) {
			answered = true;
			distanceFeedback = { kind: 'right' };
			streak = missedPair ? 0 : streak + 1;
			if (streak >= DISTANCE_STREAK && !streakTicked) {
				streakTicked = true;
				onDistanceStreak?.();
			}
			return;
		}
		missedPair = true;
		streak = 0;
		distanceFeedback = { kind: countRight ? 'way' : wayRight ? 'count' : 'both' };
	}

	function nextPair(): void {
		question = distanceQuestion();
		pickedSteps = null;
		pickedWay = null;
		missedPair = false;
		answered = false;
		distanceFeedback = { kind: 'none' };
	}

	// ---- Shared ------------------------------------------------------------

	const nextLine = $derived.by((): string => {
		if (lapDone) {
			return fill(t(lapMissed ? 'book.ch16.lapDone.retry' : 'book.ch16.lapDone.clean'), { start: lapStart });
		}
		if (roundDone) {
			return fill(t(ROUND_DONE_KEY[direction]), { stops: stops.join(', '), next: stops[stops.length - 1] });
		}
		switch (nextFeedback.kind) {
			case 'retry':
				return fill(t(RETRY_KEY[direction]), { answer: nextFeedback.answer, from });
			case 'right':
				return fill(t('book.ch16.right'), { stop: nextFeedback.stop });
			default:
				return '';
		}
	});

	const distanceLine = $derived.by((): string => {
		switch (distanceFeedback.kind) {
			case 'pick':
				return t('book.ch16.distance.pick');
			case 'count':
				return t('book.ch16.distance.retry.count');
			case 'way':
				return t('book.ch16.distance.retry.way');
			case 'both':
				return fill(t('book.ch16.distance.retry.both'), { from: question.from });
			case 'right': {
				const line = fill(t(DISTANCE_RIGHT_KEY[question.direction]), {
					steps: String(question.steps),
					path: question.path.join(', ')
				});
				return streakTicked && streak === DISTANCE_STREAK ? `${line} ${t('book.ch16.distance.streakDone')}` : line;
			}
			default:
				return '';
		}
	});

	const nextIsRetry = $derived(nextFeedback.kind === 'retry' && !roundDone);
	const distanceIsRetry = $derived(
		distanceFeedback.kind === 'count' || distanceFeedback.kind === 'way' || distanceFeedback.kind === 'both'
	);
</script>

<div class="circle-drill flex flex-col gap-4" data-testid="circle-drill">
	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">{t('book.ch16.modeLabel')}</p>
		<div class="flex flex-wrap gap-2" data-testid="circle-mode-row">
			{#each MODES as candidate (candidate)}
				<Button
					type="button"
					variant={candidate === mode ? 'primary' : 'ghost'}
					aria-pressed={candidate === mode}
					onclick={() => (mode = candidate)}
				>
					{t(MODE_KEY[candidate])}
				</Button>
			{/each}
		</div>
	</div>

	{#if mode === 'next'}
		<div class="controls flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
					{t('book.ch16.directionLabel')}
				</p>
				<div class="flex flex-wrap gap-2" data-testid="circle-direction-row">
					{#each CYCLE_DIRECTIONS as candidate (candidate)}
						<Button
							type="button"
							variant={candidate === direction ? 'primary' : 'ghost'}
							aria-pressed={candidate === direction}
							onclick={() => startLap(candidate, lapStart)}
						>
							{t(DIRECTION_KEY[candidate])}
						</Button>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
					{t('book.ch16.startLabel')}
				</p>
				<div class="flex flex-wrap gap-2" data-testid="circle-start-row">
					{#each startKeys as candidate (candidate)}
						<Button
							type="button"
							variant={isSameStop(candidate, lapStart) ? 'primary' : 'ghost'}
							aria-pressed={isSameStop(candidate, lapStart)}
							onclick={() => startLap(direction, candidate)}
						>
							{candidate}
						</Button>
					{/each}
				</div>
			</div>
		</div>

		<div class="key-banner" data-testid="circle-banner">
			{fill(t('book.ch16.banner'), { round: String(round + 1), rounds: String(ROUNDS_PER_LAP) })}
		</div>

		<div class="measures" data-testid="circle-measures">
			{#each stops as stop, i (i)}
				<div
					class="measure"
					class:measure--cursor={i === cursor && !roundDone}
					class:measure--played={i > 0 && i < cursor}
					class:measure--future={i > cursor}
					data-testid="circle-measure-{i}"
				>
					<div class="msym">{i < cursor ? stop : '?'}</div>
					<div class="roman">{i === 0 ? t('book.ch16.bar.start') : t(BAR_KEY[direction])}</div>
				</div>
			{/each}
		</div>

		{#if !roundDone}
			<p class="text-body" data-testid="circle-prompt">{fill(t(PROMPT_KEY[direction]), { from })}</p>
			<p class="text-label text-muted font-mono uppercase">{t('book.ch16.answerHint')}</p>
			<div class="choices" data-testid="circle-choices">
				{#each choices as choice (choice)}
					<Button type="button" variant="ghost" onclick={() => answer(choice)}>{choice}</Button>
				{/each}
			</div>
			<PianoKeyboard notes={[]} interactive selected={new Set()} onToggle={answer} octaves={2} />
		{/if}

		{#if nextLine}
			<p class="text-body" class:retry={nextIsRetry} data-testid="circle-feedback" data-kind={nextFeedback.kind}>
				{nextLine}
			</p>
		{/if}

		{#if lapDone}
			<div>
				<Button type="button" variant="primary" onclick={() => startLap(direction, lapStart)}>
					{t('book.ch16.button.again')}
				</Button>
			</div>
		{:else if roundDone}
			<div>
				<Button type="button" variant="primary" onclick={nextRound} data-testid="circle-next-round">
					{t('book.ch16.button.nextRound')}
				</Button>
			</div>
		{/if}
	{:else}
		<p class="text-body">{t('book.ch16.distance.intro')}</p>
		<p class="question" data-testid="circle-distance-question">
			{fill(t('book.ch16.distance.question'), { from: question.from, to: question.to })}
		</p>

		<div class="flex flex-col gap-2">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('book.ch16.distance.countLabel')}
			</p>
			<div class="flex flex-wrap gap-2" data-testid="circle-count-row">
				{#each DISTANCE_STEPS as count (count)}
					<Button
						type="button"
						variant={count === pickedSteps ? 'primary' : 'ghost'}
						aria-pressed={count === pickedSteps}
						disabled={answered}
						onclick={() => (pickedSteps = count)}
					>
						{count}
					</Button>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('book.ch16.distance.wayLabel')}
			</p>
			<div class="flex flex-wrap gap-2" data-testid="circle-way-row">
				{#each CYCLE_DIRECTIONS as candidate (candidate)}
					<Button
						type="button"
						variant={candidate === pickedWay ? 'primary' : 'ghost'}
						aria-pressed={candidate === pickedWay}
						disabled={answered}
						onclick={() => (pickedWay = candidate)}
					>
						{t(WAY_KEY[candidate])}
					</Button>
				{/each}
			</div>
		</div>

		{#if answered}
			<div class="measures" data-testid="circle-distance-path">
				{#each question.path as stop, i (i)}
					<div class="measure measure--played">
						<div class="msym">{stop}</div>
						<div class="roman">{i === 0 ? t('book.ch16.bar.start') : t(BAR_KEY[question.direction])}</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if distanceLine}
			<p
				class="text-body"
				class:retry={distanceIsRetry}
				data-testid="circle-distance-feedback"
				data-kind={distanceFeedback.kind}
			>
				{distanceLine}
			</p>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#if answered}
				<Button type="button" variant="primary" onclick={nextPair} data-testid="circle-next-pair">
					{t('book.ch16.button.nextPair')}
				</Button>
			{:else}
				<Button type="button" variant="primary" onclick={checkDistance} data-testid="circle-distance-check">
					{t('book.ch16.button.check')}
				</Button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.controls {
		border-bottom: 2px solid var(--color-ink);
		padding-bottom: var(--spacing-md);
	}

	/* Bar strip: ProgressionDrill.svelte's measure grid (sketch-017), mirrored
	   rather than imported, the house precedent for shared chrome whose owner
	   keeps its styles scoped. One deliberate change: the "?" and the bar
	   labels use --color-muted, not --color-faint, because they carry text the
	   learner reads (app.css: faint is decorative only). */
	.key-banner {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.measures {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-radius: 0;
	}

	.measure {
		border-left: 1px solid var(--color-ink);
		padding: var(--spacing-sm) var(--spacing-xs) var(--spacing-md);
		min-height: 56px;
		position: relative;
	}

	.measure--cursor {
		background: color-mix(in srgb, var(--color-vermilion) 8%, transparent);
	}

	.measure--cursor::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--color-vermilion);
	}

	.measure--played .msym {
		color: var(--color-verdigris);
	}

	.measure--future .msym {
		color: var(--color-muted);
	}

	.msym {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: var(--text-heading);
	}

	.roman {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
		margin-top: var(--spacing-xs);
	}

	.choices {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.question {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: var(--text-heading);
	}

	.retry {
		color: var(--color-vermilion);
	}
</style>
