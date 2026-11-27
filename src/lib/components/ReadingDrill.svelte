<script lang="ts">
		import { untrack } from 'svelte';
	import Button from './Button.svelte';
	import ReadingStaff from './ReadingStaff.svelte';
	import { playNote } from '$lib/audio/audio';
	import { t } from '$lib/i18n/locale.svelte';
	import { exerciseKey } from '$lib/homework/catalog';
	import type { ReadingExercise } from '$lib/homework/data/readingData';
	import { recordAttempt, type ExerciseRecord } from '$lib/homework/homeworkLog';
	import { LETTERS, noteName, parseStaffLine } from '$lib/homework/notation';
	import {
		createReadingSession,
			type ReadingAnswer,
		type ReadingResult,
		type ReadingSession,
		type ReadingVerdict
	} from '$lib/homework/readingSession';
	import { connectMidi, midiState } from '$lib/midi/midi.svelte';
	import { listenNotes } from '$lib/midi/noteStream';
	import { letterToSolfege } from '$lib/theory/solfege';

	/**
	 * The note-reading drill: the engraved exercise, one note at a time, and
	 * two ways to answer that share one grader.
	 *  - Play it on a connected MIDI piano. The exact key counts, octave
	 *    included.
	 *  - Name it: the seven note buttons, or the A to G keys. A name has no
	 *    octave, so the letter alone counts.
	 *
	 * A wrong answer is shown and counted and the drill moves on: the book asks
	 * for steady-speed reading, not for stopping to retry each note.
	 */
	interface Props {
		exercise: ReadingExercise;
		now?: () => number;
	}

	let { exercise, now = () => performance.now() }: Props = $props();

	const lines = $derived(exercise.staves.map(parseStaffLine));

	let session: ReadingSession = untrack(() => createReadingSession(exercise, now));
	let current = $state(0);
	let results = $state<ReadingResult[]>([]);
	let last = $state<ReadingResult | null>(null);
	let record = $state<ExerciseRecord | null>(null);
	let run = $state(0);

	const total = $derived(session.steps.length);
	const done = $derived(current >= total);
	const verdicts = $derived(
		Object.fromEntries(results.map((r) => [r.stepIndex, r.verdict])) as Record<number, ReadingVerdict>
	);
	const summary = $derived(done ? session.summary() : null);

	function restart(): void {
		session = createReadingSession(exercise, now);
		current = 0;
		results = [];
		last = null;
		record = null;
		run += 1;
	}

	function submit(answer: ReadingAnswer): void {
		if (session.isDone()) return;
		const expected = session.steps[session.current()].note;
		const result = session.answer(answer);
		if (!result) return;
		results = [...results, result];
		last = result;
		current = session.current();
		// A name tap has no piano of its own, so sound the right note: the ear learns the page.
		if (answer.kind === 'name') playNote(noteName(expected));
		if (session.isDone()) {
			record = recordAttempt(
				exerciseKey('reading', exercise.page, exercise.number),
				session.summary().accuracy
			);
		}
	}

	// Listen to the piano whenever one is connected; re-attach if it changes.
	$effect(() => {
		if (midiState().kind !== 'connected') return;
		return listenNotes((e) => submit({ kind: 'midi', midi: e.midi }));
	});

	function onKeydown(e: KeyboardEvent): void {
		if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
		const target = e.target as HTMLElement | null;
		if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
		const letter = e.key.length === 1 ? e.key.toUpperCase() : '';
		if (letter >= 'A' && letter <= 'G') {
			e.preventDefault();
			submit({ kind: 'name', letter });
		}
	}

	const midi = $derived(midiState());

	function seconds(ms: number | null): string {
		return ms === null ? '' : (ms / 1000).toFixed(1);
	}

	function feedback(r: ReadingResult): string {
		if (r.verdict === 'correct') return t('homework.reading.correct').replace('{NOTE}', r.note.letter);
		if (r.verdict === 'wrong-octave') {
			return t('homework.reading.wrongOctave')
				.replace('{GIVEN}', r.given)
				.replace('{NOTE}', noteName(r.note));
		}
		return t('homework.reading.wrong')
			.replace('{GIVEN}', r.given)
			.replace('{NOTE}', r.note.letter);
	}
</script>

<svelte:window onkeydown={onKeydown} />

<section class="flex flex-col gap-6" data-testid="reading-drill" data-done={done}>
	{#key run}
		<ReadingStaff clef={exercise.clef} {lines} {current} {verdicts} />
	{/key}

	<p class="text-label font-mono uppercase" data-testid="reading-progress" style="letter-spacing: 0.08em;">
		{t('homework.reading.progress').replace('{N}', String(Math.min(current + 1, total))).replace('{TOTAL}', String(total))}
	</p>

	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{t('homework.reading.answerLabel')}
		</p>
		<div class="flex flex-wrap gap-2" data-testid="reading-answers">
			{#each LETTERS as letter (letter)}
				<Button
					type="button"
					variant="ghost"
					disabled={done}
					onclick={() => submit({ kind: 'name', letter })}
					data-testid="answer-{letter}"
					aria-label={`${letter} ${letterToSolfege(letter)}`}
				>
					<span class="text-heading font-bold">{letter}</span>
					<span class="text-label block font-mono">{letterToSolfege(letter)}</span>
				</Button>
			{/each}
		</div>
	</div>

	<p class="text-label font-mono" data-testid="reading-midi" data-midi-state={midi.kind}>
		{#if midi.kind === 'connected'}
			{t('homework.reading.midiConnected').replace('{DEVICE}', midi.deviceName)}
		{:else if midi.kind === 'unsupported'}
			{t('homework.reading.midiUnsupported')}
		{:else}
			{t('homework.reading.midiHint')}
			{#if midi.kind === 'idle' || midi.kind === 'no-device' || midi.kind === 'disconnected' || midi.kind === 'error'}
				<Button type="button" variant="ghost" onclick={() => void connectMidi()} data-testid="reading-connect-midi">
					{t('homework.reading.midiConnect')}
				</Button>
			{/if}
		{/if}
	</p>

	<p class="text-body min-h-6" data-testid="reading-feedback" aria-live="polite" data-verdict={last?.verdict ?? ''}>
		{#if last}{feedback(last)}{/if}
	</p>

	{#if done && summary}
		<div class="border-ink flex flex-col gap-3 border-4 p-4" data-testid="reading-summary" aria-live="polite">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('homework.result.label')}
			</p>
			<p class="text-heading font-bold" data-testid="reading-accuracy">
				{summary.accuracy}%
				<span class="text-body font-normal">
					{t('homework.reading.correctOf')
						.replace('{CORRECT}', String(summary.correct))
						.replace('{TOTAL}', String(summary.total))}
				</span>
			</p>
			{#if summary.meanResponseMs !== null}
				<p class="text-body" data-testid="reading-speed">
					{t('homework.reading.speed').replace('{S}', seconds(summary.meanResponseMs))}
				</p>
			{/if}
			{#if record}
				<p class="text-label font-mono" data-testid="reading-record">
					{t('homework.record')
						.replace('{BEST}', String(record.best))
						.replace('{N}', String(record.attempts))}
				</p>
			{/if}
			{#if summary.mistakes.length > 0}
				<div>
					<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
						{t('homework.reading.mistakes')}
					</p>
					<ul class="text-body mt-1 flex flex-col gap-1" data-testid="reading-mistakes">
						{#each summary.mistakes as m (m.stepIndex)}
							<li>
								{t('homework.reading.mistakeRow')
									.replace('{N}', String(m.stepIndex + 1))
									.replace('{NOTE}', noteName(m.note))
									.replace('{GIVEN}', m.given)}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			<div>
				<Button type="button" onclick={restart} data-testid="reading-again">
					{t('homework.reading.again')}
				</Button>
			</div>
		</div>
	{/if}
</section>
