<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from './Button.svelte';
	import MetronomeControls from './MetronomeControls.svelte';
	import RhythmNotation from './RhythmNotation.svelte';
	import { ensureAudioReady, playClick } from '$lib/audio/audio';
	import { t } from '$lib/i18n/locale.svelte';
	import type { RhythmExercise } from '$lib/homework/data/rhythmData';
	import { exerciseKey } from '$lib/homework/catalog';
	import { recordAttempt, type ExerciseRecord } from '$lib/homework/homeworkLog';
	import { createMetronome, type Metronome } from '$lib/homework/metronome';
	import { parseRhythm } from '$lib/homework/rhythmParse';
	import {
		beatMsFor,
		expectedOnsetTimes,
		goodWindowMs,
		scoreRhythm,
		type RhythmScore
	} from '$lib/homework/rhythmScore';
	import {
		HW_TEMPO_MIN,
		clampHwTempo,
		loadHomeworkPrefs,
		saveHomeworkPrefs
	} from '$lib/homework/tempo';

	/**
	 * The rhythm drill: the written rhythm, a metronome with count-in, a tap
	 * pad, and a score from how close each tap landed to the written onset.
	 *
	 * Two ways to use the click:
	 *  - "Play along": count-in, then the exercise runs once; every tap is
	 *    recorded and scored at the end.
	 *  - "Click only": an endless metronome at the chosen tempo, tempo
	 *    adjustable live, nothing scored. For warming up and finding the pulse.
	 *
	 * Tap time is `now()` at the pointerdown, on the same clock the metronome
	 * grid uses, so the score is independent of timer jitter and of audio
	 * latency. Everything timing-related is injectable for tests.
	 */
	interface Deps {
		now: () => number;
		setTimer: (fn: () => void, ms: number) => unknown;
		clearTimer: (handle: unknown) => void;
		click: (accent: boolean) => void;
	}
	interface Props {
		exercise: RhythmExercise;
		deps?: Partial<Deps>;
	}

	let { exercise, deps = {} }: Props = $props();

	// Read lazily so a changed prop is honoured and nothing is captured at init.
	const clock: Deps = {
		now: () => (deps.now ?? (() => performance.now()))(),
		setTimer: (fn, ms) => (deps.setTimer ?? ((f, m) => setTimeout(f, m)))(fn, ms),
		clearTimer: (h) =>
			(deps.clearTimer ?? ((x) => clearTimeout(x as ReturnType<typeof setTimeout>)))(h),
		click: (accent) => (deps.click ?? playClick)(accent)
	};

	type Phase = 'idle' | 'run' | 'practice' | 'scored';

	const parsed = $derived(parseRhythm(exercise.timeSignature, exercise.measures));
	const firstBarBeats = $derived(parsed.measures[0]?.beats ?? 4);

	const initial = loadHomeworkPrefs();
	let bpm = $state(initial.bpm);
	let countInBars = $state(initial.countInBars);
	let phase = $state<Phase>('idle');
	/** Beat within the played part, for the playhead; null during count-in and rest. */
	let playBeat = $state<number | null>(null);
	/** Count-in beats still to come (0 when not counting in). */
	let countInLeft = $state(0);
	/** Beat within the bar of the last click, for the beat dots. */
	let beatInBar = $state<number | null>(null);
	let score = $state<RhythmScore | null>(null);
	let record = $state<ExerciseRecord | null>(null);
	let tapCount = $state(0);
	let flash = $state(false);

	let taps: number[] = [];
	let playStart: number | null = null;
	let flashTimer: unknown = null;

	let countInBeatsTotal = 0;

	const metronome: Metronome = createMetronome({
		now: clock.now,
		setTimer: clock.setTimer,
		clearTimer: clock.clearTimer,
		click: clock.click,
		onBeat: (e) => {
			beatInBar = e.countIn
				? e.index % (firstBarBeats || 4)
				: (parsed.beats[e.playIndex]?.beatInMeasure ?? e.index % 4);
			if (e.countIn) {
				countInLeft = Math.max(0, countInBeatsTotal - e.index);
				playBeat = null;
			} else {
				countInLeft = 0;
				playBeat = phase === 'run' ? e.playIndex : null;
			}
		},
		onEnd: () => {
			if (phase === 'run') finishRun();
		}
	});

	$effect(() => {
		saveHomeworkPrefs({ bpm, countInBars });
	});

	function stopAll(): void {
		metronome.stop();
		playBeat = null;
		countInLeft = 0;
		beatInBar = null;
	}

	function startRun(): void {
		stopAll();
		void ensureAudioReady();
		taps = [];
		tapCount = 0;
		score = null;
		record = null;
		countInBeatsTotal = countInBars * firstBarBeats;
		phase = 'run';
		metronome.start({
			bpm,
			beats: parsed.beats,
			countInBeats: countInBeatsTotal,
			countInBarBeats: firstBarBeats,
			tailMs: goodWindowMs(beatMsFor(bpm)) + 50
		});
		playStart = metronome.playStartMs();
	}

	function startPractice(): void {
		stopAll();
		void ensureAudioReady();
		score = null;
		record = null;
		phase = 'practice';
		metronome.start({ bpm, beatsPerBar: firstBarBeats });
	}

	function stop(): void {
		stopAll();
		phase = 'idle';
	}

	function finishRun(): void {
		const expected = expectedOnsetTimes(
			parsed.onsets.map((n) => n.startBeat),
			bpm
		);
		score = scoreRhythm(expected, taps, bpm);
		record = recordAttempt(exerciseKey('rhythm', exercise.page, exercise.number), score.score);
		playBeat = null;
		beatInBar = null;
		phase = 'scored';
	}

	function setBpm(next: number): void {
		const v = clampHwTempo(next);
		bpm = v;
		if (phase === 'practice') metronome.setBpm(v);
	}

	function tap(): void {
		const at = clock.now();
		tapCount += 1;
		if (phase === 'run' && playStart !== null) {
			const rel = at - playStart;
			// Anything earlier than a good window before the first onset is count-in noise.
			if (rel >= -goodWindowMs(beatMsFor(bpm))) taps.push(rel);
		}
		flash = true;
		if (flashTimer !== null) clock.clearTimer(flashTimer);
		flashTimer = clock.setTimer(() => (flash = false), 90);
	}

	function onPointerDown(e: PointerEvent): void {
		e.preventDefault();
		tap();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.code !== 'Space' && e.key !== ' ') return;
		if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
		const target = e.target as HTMLElement | null;
		if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
		e.preventDefault();
		tap();
	}

	function slowerTempo(): number {
		return Math.max(HW_TEMPO_MIN, bpm - 10);
	}

	onDestroy(() => {
		metronome.stop();
		if (flashTimer !== null) clock.clearTimer(flashTimer);
	});

	const counting = $derived(phase === 'run' && countInLeft > 0);
	const running = $derived(phase === 'run' || phase === 'practice');
</script>

<svelte:window onkeydown={onKeydown} />

<section class="flex flex-col gap-6" data-testid="rhythm-drill" data-phase={phase}>
	<RhythmNotation {parsed} results={score?.results} playhead={phase === 'run' ? playBeat : null} />

	<MetronomeControls
		{bpm}
		{countInBars}
		lockTempo={phase === 'run'}
		lockCountIn={running}
		onBpm={setBpm}
		onCountIn={(bars) => (countInBars = bars)}
	/>

	<div class="flex flex-wrap items-center gap-3" data-testid="rhythm-actions">
		{#if phase === 'run'}
			<Button type="button" variant="ghost" onclick={stop} data-testid="rhythm-stop">
				{t('homework.rhythm.stop')}
			</Button>
		{:else if phase === 'practice'}
			<Button type="button" variant="ghost" onclick={stop} data-testid="rhythm-stop">
				{t('homework.rhythm.stopClick')}
			</Button>
		{:else}
			<Button type="button" onclick={startRun} data-testid="rhythm-start">
				{phase === 'scored' ? t('homework.rhythm.again') : t('homework.rhythm.start')}
			</Button>
			<Button type="button" variant="ghost" onclick={startPractice} data-testid="rhythm-click-only">
				{t('homework.rhythm.clickOnly')}
			</Button>
		{/if}

		{#if running}
			<div class="flex items-center gap-2" data-testid="beat-dots" aria-hidden="true">
				{#each Array.from({ length: firstBarBeats }, (_, i) => i) as i (i)}
					<span
						class="inline-block size-4 rounded-full border-2"
						style="border-color: var(--color-ink); background: {beatInBar === i
							? i === 0
								? 'var(--color-vermilion)'
								: 'var(--color-ink)'
							: 'transparent'};"
						data-testid="beat-dot-{i}"
						data-active={beatInBar === i}
					></span>
				{/each}
			</div>
		{/if}
		{#if counting}
			<span class="text-heading font-mono font-bold" data-testid="rhythm-countin" aria-live="polite">
				{countInLeft}
			</span>
		{/if}
	</div>

	<button
		type="button"
		class="border-ink text-heading w-full rounded-none border-4 px-4 py-12 font-mono font-bold uppercase select-none"
		style="touch-action: manipulation; -webkit-user-select: none; background: {flash
			? 'var(--color-vermilion)'
			: 'var(--color-paper-bright)'}; color: {flash ? 'var(--color-on-root)' : 'var(--color-ink)'};"
		onpointerdown={onPointerDown}
		data-testid="rhythm-tap"
		aria-label={t('homework.rhythm.tapAria')}
	>
		{t('homework.rhythm.tap')}
		<span class="text-label block font-normal normal-case" style="letter-spacing: 0;">
			{t('homework.rhythm.tapHint')}
		</span>
	</button>

	{#if phase === 'scored' && score}
		<div
			class="border-ink flex flex-col gap-3 border-4 p-4"
			data-testid="rhythm-result"
			data-passed={score.passed}
			aria-live="polite"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('homework.result.label')}
			</p>
			<p class="text-heading font-bold" data-testid="rhythm-score">
				{score.score}%
				<span class="text-body font-normal">
					{score.passed ? t('homework.result.passed') : t('homework.result.notYet')}
				</span>
			</p>
			<ul class="text-body flex flex-col gap-1" data-testid="rhythm-breakdown">
				<li data-testid="rhythm-perfect">
					{t('homework.rhythm.perfect').replace('{N}', String(score.perfect))}
				</li>
				<li data-testid="rhythm-good">
					{t('homework.rhythm.good').replace('{N}', String(score.good))}
				</li>
				<li data-testid="rhythm-missed">
					{t('homework.rhythm.missed').replace('{N}', String(score.missed))}
				</li>
				<li data-testid="rhythm-extra">
					{t('homework.rhythm.extra').replace('{N}', String(score.extra))}
				</li>
			</ul>
			{#if score.tendency && score.meanOffsetMs !== null}
				<p class="text-body" data-testid="rhythm-tendency" data-tendency={score.tendency}>
					{score.tendency === 'rushing'
						? t('homework.rhythm.rushing').replace('{MS}', String(Math.abs(score.meanOffsetMs)))
						: score.tendency === 'dragging'
							? t('homework.rhythm.dragging').replace('{MS}', String(Math.abs(score.meanOffsetMs)))
							: t('homework.rhythm.steady')}
				</p>
			{/if}
			<p class="text-label font-mono" data-testid="rhythm-window">
				{t('homework.rhythm.window').replace('{MS}', String(Math.round(score.goodWindowMs)))}
			</p>
			{#if record}
				<p class="text-label font-mono" data-testid="rhythm-record">
					{t('homework.record')
						.replace('{BEST}', String(record.best))
						.replace('{N}', String(record.attempts))}
				</p>
			{/if}
			{#if !score.passed && bpm > HW_TEMPO_MIN}
				<div>
					<Button
						type="button"
						variant="ghost"
						onclick={() => setBpm(slowerTempo())}
						data-testid="rhythm-slower"
					>
						{t('homework.rhythm.trySlower').replace('{BPM}', String(slowerTempo()))}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</section>
