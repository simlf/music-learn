<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		THIRDS_LESSON,
		THIRDS_LESSON_DRILL_SEEDS,
		gradeLessonTap,
		semitonesFromC
	} from '$lib/lessons/thirdsLesson';
	import { setLessonSeeds } from '$lib/practice/drillSeeds';
	import { letterToSolfege } from '$lib/theory/solfege';
	import type { SpelledNote } from '$lib/theory/types';
	import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import Button from './Button.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';

	/**
	 * The guided do-then-check thirds lesson (LEARN-01/02/03): a vertical
	 * stack of step cards (locked/active/done), an inline one-octave
	 * constructable keyboard on the active step only, chroma-graded taps via
	 * `gradeLessonTap` (never letter-string comparison), gentle count-hint
	 * retries on a wrong tap, per-step audio, and an inverted handoff card
	 * seeding the drills page once all four steps are done. Architecturally
	 * BuildSession minus the chord picker and its 650ms pacing timer: a
	 * correct tap advances `activeIndex` immediately, no props, no persisted
	 * state (resets on reload, per the deferred cross-session persistence
	 * decision).
	 */

	const steps = THIRDS_LESSON;

	let activeIndex = $state(0);
	let earnedNotes = $state<SpelledNote[]>([]);
	let wrongFlash = $state<{ letter: string; octave: number } | null>(null);
	let feedbackLine = $state<string | null>(null);
	let hearPulseToken = $state(0);
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	type StepState = 'locked' | 'active' | 'done';

	function stateFor(index: number): StepState {
		if (index < activeIndex) return 'done';
		if (index === activeIndex) return 'active';
		return 'locked';
	}

	interface BodySegment {
		text: string;
		emphasized: boolean;
	}

	/**
	 * Splits a step's body copy on the app's `**phrase**` inline-emphasis
	 * convention (see thirdsLesson.ts's doc comment) into plain/emphasized
	 * segments, rendered below with the emphasized run colored verdigris
	 * (the third-role interval color, per the UI-SPEC's locked "one accent"
	 * rule for this lesson).
	 */
	function parseBody(body: string): BodySegment[] {
		const segments: BodySegment[] = [];
		const pattern = /\*\*(.+?)\*\*/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(body)) !== null) {
			if (match.index > lastIndex) {
				segments.push({ text: body.slice(lastIndex, match.index), emphasized: false });
			}
			segments.push({ text: match[1], emphasized: true });
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < body.length) {
			segments.push({ text: body.slice(lastIndex), emphasized: false });
		}
		return segments;
	}

	/**
	 * The wrong-tap retry copy, with the `{N}` token filled from
	 * `semitonesFromC`. `tappedLetter` always originates from
	 * `PianoKeyboard.onConstructTap`, which only ever supplies a real key
	 * letter, so `semitonesFromC` always resolves here - no unparseable-tap
	 * fallback branch to maintain.
	 */
	function wrongHintFor(hint: string, tappedLetter: string): string {
		const n = semitonesFromC(tappedLetter);
		return hint.replace('{N}', String(n));
	}

	/**
	 * The third-role letter to sound for the active step's "Hear it" control.
	 * A step whose OWN role is 'third' (steps 2 and 4) previews its own
	 * target letter, whether or not it has been tapped yet - the only way
	 * "Hear it" can ever sound anything for those steps, since a correct tap
	 * advances `activeIndex` immediately (no BuildSession-style pacing
	 * window where the step is simultaneously active and its note already
	 * earned). Every other step (the root-only step 1, and the hear-then-
	 * continue step 3) falls back to whatever third is already in
	 * `earnedNotes` (none yet for step 1, the major third for step 3).
	 */
	function currentThirdLetter(): string | null {
		const step = steps[activeIndex];
		if (step?.role === 'third' && step.letter !== null) return step.letter;
		return earnedNotes.find((note) => note.role === 'third')?.letter ?? null;
	}

	/** "Hear it": plays the root alone (step 1) or the root+third pair, then bumps the pulse - outside any soundEnabled() check, so the lit key(s) still pulse with sound off (LEARN-02). */
	function hearCurrent(): void {
		void ensureAudioReady();
		const thirdLetter = currentThirdLetter();
		if (thirdLetter !== null) {
			playChord(['C', thirdLetter]);
		} else {
			playNote(toPitch('C', 4));
		}
		hearPulseToken += 1;
	}

	/** Step 3 (hear-then-continue, targetChroma null) advances on demand. */
	function continueStep(): void {
		activeIndex += 1;
	}

	function handleTap(letter: string, octave: number): void {
		const step = steps[activeIndex];
		if (!step || step.targetChroma === null) return;

		if (gradeLessonTap(step, letter)) {
			feedbackLine = step.correctLine;
			if (step.role !== null && step.letter !== null) {
				const earned: SpelledNote = {
					letter: step.letter,
					solfege: letterToSolfege(step.letter),
					role: step.role
				};
				// The minor-third step REPLACES (not appends) the prior third
				// entry: only one note ever claims the 'third' role at once, per
				// the UI-SPEC's contrast-not-a-chord rule.
				earnedNotes =
					step.role === 'third'
						? [...earnedNotes.filter((note) => note.role !== 'third'), earned]
						: [...earnedNotes, earned];
			}
			wrongFlash = null;
			clearTimeout(flashTimer);
			void ensureAudioReady();
			playNote(toPitch(letter, octave));
			// Advancement and the earnedNotes fill above happen unconditionally -
			// never gated on soundEnabled() (LEARN-02's locked "sound-off still
			// advances" clause).
			activeIndex += 1;
		} else {
			wrongFlash = { letter, octave };
			feedbackLine = step.wrongHint !== null ? wrongHintFor(step.wrongHint, letter) : null;
			// Wrong taps never call playNote/playChord - the caller (this
			// component) owns feedback, mirroring BuildSession's contract.
			clearTimeout(flashTimer);
			flashTimer = setTimeout(() => {
				wrongFlash = null;
			}, 450);
		}
	}

	/**
	 * Writes the handoff seeds as soon as the handoff card becomes reachable
	 * (activeIndex reaches the end), rather than deferring the write to the
	 * CTA's `onclick`. A middle-click/Ctrl/Cmd-click open-in-new-tab fires
	 * anchor navigation via the native `href` without ever dispatching a
	 * `click` event, so a write gated on `onclick` would silently skip on
	 * those paths (WR-02). The write is cheap and idempotent (same constant
	 * array every time), so writing it here - and re-running harmlessly on
	 * every `activeIndex` change after that point - is safe.
	 */
	$effect(() => {
		if (activeIndex >= steps.length) {
			setLessonSeeds(THIRDS_LESSON_DRILL_SEEDS);
		}
	});

	onDestroy(() => {
		clearTimeout(flashTimer);
	});
</script>

{#snippet bodyCopy(body: string)}
	<p class="text-body">
		{#each parseBody(body) as segment, segmentIndex (segmentIndex)}
			{#if segment.emphasized}<strong style="color: var(--color-verdigris);">{segment.text}</strong
				>{:else}{segment.text}{/if}
		{/each}
	</p>
{/snippet}

<div class="flex flex-col gap-8" data-testid="interactive-lesson">
	<div>
		<h2 class="text-heading font-serif font-bold">Play it, don't just read it</h2>
		<p class="text-body mt-2">
			Four small steps. Tap what each one asks, hear what you built, and it sticks.
		</p>
	</div>

	<div class="flex flex-col" style="gap: var(--spacing-lg);">
		{#each steps as step, i (i)}
			{@const state = stateFor(i)}
			<div
				class="border-2 border-ink bg-paper-bright px-4 py-6 {state === 'locked'
					? 'opacity-40'
					: ''}"
				style={state === 'active'
					? 'border-left: 8px solid var(--color-vermilion);'
					: state === 'done'
						? 'border-left: 8px solid var(--color-verdigris);'
						: ''}
				data-testid="lesson-step-{i}"
			>
				<div class="flex items-center gap-2">
					<span
						class="step-num flex items-center justify-center border-2 font-mono text-label font-bold"
						style={state === 'done'
							? 'background-color: var(--color-verdigris); color: #fff; border-color: var(--color-verdigris);'
							: 'border-color: var(--color-ink); color: var(--color-ink);'}
					>
						{i + 1}
					</span>
					<h3 class="text-body font-serif font-bold">{step.title}</h3>
				</div>

				{@render bodyCopy(step.body)}

				{#if state === 'active'}
					<div class="mt-4" style="min-width: {8 * 44}px; max-width: 100%;">
						<PianoKeyboard
							octaves={1}
							notes={earnedNotes}
							constructable={step.targetChroma !== null}
							onConstructTap={handleTap}
							flashWrongKey={wrongFlash}
							pulseToken={hearPulseToken}
						/>
					</div>

					{#if feedbackLine}
						<p
							class="text-label mt-2 font-mono uppercase"
							style={wrongFlash ? 'color: var(--color-vermilion);' : ''}
							data-testid="lesson-feedback"
						>
							{feedbackLine}
						</p>
					{/if}

					<div class="mt-4 flex flex-wrap gap-2">
						{#if step.hearable}
							<Button type="button" variant="ghost" onclick={hearCurrent}>Hear it</Button>
						{/if}
						{#if step.targetChroma === null}
							<Button type="button" variant="primary" onclick={continueStep}>Continue</Button>
						{/if}
					</div>
				{:else if state === 'done'}
					{#if step.correctLine}
						<p class="text-label mt-2 font-mono uppercase" data-testid="lesson-feedback">
							{step.correctLine}
						</p>
					{/if}
					<span
						class="done-chip text-label mt-2 inline-block font-mono uppercase"
						style="color: var(--color-verdigris);"
					>
						Done
					</span>
				{/if}
			</div>
		{/each}
	</div>

	{#if activeIndex >= steps.length}
		<div class="bg-ink text-paper-bright px-4 py-6" data-testid="lesson-handoff">
			<p class="text-label font-mono uppercase" style="color: var(--color-mustard);">
				You just learned this
			</p>
			<h3 class="text-heading mt-2 font-serif font-bold">Now make it stick</h3>
			<p class="text-body mt-2" style="color: var(--color-paper); opacity: 0.85;">
				The beginner course on /drills will show you chords like these and ask for the notes. The
				third you just found is the middle note of every triad: major third, happy triad; minor
				third, sad triad.
			</p>
			<p class="text-heading mt-4 font-serif">C · Cm</p>
			<div class="handoff-cta mt-4">
				<Button href="/drills">Try this in a drill →</Button>
			</div>
		</div>
	{/if}
</div>

<style>
	.step-num {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	.handoff-cta :global(.ps-button--primary) {
		background-color: var(--color-mustard);
		color: var(--color-ink);
	}
</style>
