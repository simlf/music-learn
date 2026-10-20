<script lang="ts">
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import { chromaOf } from '$lib/theory/interval';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { guideToneMotion, toGuideToneBar } from '$lib/lessons/guideTones';
	import { lettersForChromas } from '$lib/practice/shellCycle';
	import {
		GUIDE_TONE_CYCLE_KEYS,
		gradeGuideTones,
		guideToneCycleBars,
		guideTonePair,
		voiceGuideTones
	} from '$lib/practice/guideToneCycle';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 11's "At the piano" exercise: the major ii-V-I as its two guide
	 * tones only, the 3rd and the 7th, in all 12 keys around chapter 15's
	 * cycle of fourths (`guideToneCycle.ts`). CHECKED: a pair is right when it
	 * is exactly the chord's 3rd and 7th and, from the V on, when it continues
	 * the line from the pair just played (each voice moved at most a whole
	 * step, `isSmoothMove`). The right letters played with a jump are named as
	 * such and retried, because the jump is what the chapter's idea says not
	 * to do.
	 *
	 * Lives on the chapter page, never in /practice, exactly like chapter 15's
	 * ShellCycleDrill: it creates no card and writes no answer event. A key is
	 * CLEAN when its three chords were right on the first Check with no Show
	 * me; when all 12 are clean, `onClean()` fires and the chapter ticks its
	 * checklist line. Clean keys are remembered for this visit only.
	 */
	interface Props {
		onClean?: () => void;
	}

	let { onClean }: Props = $props();

	/** The two-octave board's lowest octave, where an unpressed letter is assumed to sit. */
	const BASE_OCTAVE = 4;

	type Feedback =
		| { kind: 'none' }
		| { kind: 'notes'; missing: string[]; extra: string[] }
		| { kind: 'jump' }
		| { kind: 'shown' }
		| { kind: 'right'; symbol: string }
		| { kind: 'key-done'; key: string; next: string };

	let keyIndex = $state(0);
	let barIndex = $state(0);
	let finished = $state(false);
	let cleanKeys = $state<string[]>([]);
	/** Set by any wrong Check or Show me in the current key; a missed key is not clean. */
	let keyMissed = $state(false);
	let showMe = $state(false);
	let feedback = $state<Feedback>({ kind: 'none' });
	let selected = $state<Set<string>>(new Set());
	let pressedOctaveByLetter = $state(new Map<string, number>());
	let wrongLetters = $state<Set<string>>(new Set());
	/** The pair the player last got right in this key, by key position: the line the next pair must continue. */
	let previous = $state<number[] | null>(null);

	const keys = GUIDE_TONE_CYCLE_KEYS;
	const key = $derived(keys[keyIndex]);
	const bars = $derived(guideToneCycleBars(key));
	const bar = $derived(bars[barIndex]);
	const chord = $derived(spellChord(bar.symbol));
	const target = $derived(guideTonePair(chord));
	const voiced = $derived(voiceGuideTones(chord, barIndex, previous));

	/** The guide-tone move into this chord from the previous one, named on the prompt for V and I. */
	const motion = $derived(
		barIndex > 0 ? guideToneMotion(toGuideToneBar(bars[barIndex - 1]), toGuideToneBar(bar)) : null
	);

	const remaining = $derived(keys.filter((candidate) => !cleanKeys.includes(candidate)));

	function fill(template: string, values: Record<string, string>): string {
		return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
	}

	function clearPlay(): void {
		selected = new Set();
		pressedOctaveByLetter = new Map();
		wrongLetters = new Set();
	}

	function goTo(nextKeyIndex: number): void {
		keyIndex = nextKeyIndex;
		barIndex = 0;
		finished = false;
		keyMissed = false;
		showMe = false;
		previous = null;
		feedback = { kind: 'none' };
		clearPlay();
	}

	function toggleKey(letter: string): void {
		const next = new Set(selected);
		if (next.has(letter)) next.delete(letter);
		else next.add(letter);
		selected = next;
		wrongLetters = new Set();
	}

	function handlePress(letter: string, octave: number): void {
		const next = new Map(pressedOctaveByLetter);
		next.set(letter, octave);
		pressedOctaveByLetter = next;
	}

	function completeKey(): void {
		if (!keyMissed && !cleanKeys.includes(key)) {
			cleanKeys = [...cleanKeys, key];
			if (cleanKeys.length === keys.length) onClean?.();
		}
		keyMissed = false;
		previous = null;
		if (keyIndex === keys.length - 1) {
			finished = true;
			feedback = { kind: 'none' };
			return;
		}
		feedback = { kind: 'key-done', key, next: keys[keyIndex + 1] };
		keyIndex += 1;
		barIndex = 0;
	}

	function check(): void {
		// An unresolvable letter becomes -1, lands in `extra`, and fails closed.
		const played = [...selected].map((letter) => {
			const chroma = chromaOf(letter);
			return chroma === undefined ? -1 : (pressedOctaveByLetter.get(letter) ?? BASE_OCTAVE) * 12 + chroma;
		});
		const result = gradeGuideTones(played, chord, previous);

		if (!result.notesCorrect) {
			keyMissed = true;
			const extra = [...selected].filter((letter) => result.extra.includes(chromaOf(letter) ?? -1));
			wrongLetters = new Set(extra);
			feedback = { kind: 'notes', missing: lettersForChromas(target, result.missing), extra };
			return;
		}
		if (!result.smooth) {
			keyMissed = true;
			feedback = { kind: 'jump' };
			return;
		}

		const symbol = chordLabel(chord);
		showMe = false;
		previous = played;
		clearPlay();
		if (barIndex < bars.length - 1) {
			barIndex += 1;
			feedback = { kind: 'right', symbol };
			return;
		}
		completeKey();
	}

	function reveal(): void {
		keyMissed = true;
		showMe = true;
		feedback = { kind: 'shown' };
	}

	function hear(): void {
		void ensureAudioReady();
		playChord(voiced.map((note) => note.letter));
	}

	const ghostKeys = $derived(
		showMe ? voiced.map((note) => ({ letter: note.letter, octave: note.octave, marker: note.marker })) : []
	);

	const feedbackLines = $derived.by((): string[] => {
		switch (feedback.kind) {
			case 'notes': {
				const lines: string[] = [];
				if (feedback.missing.length > 0) {
					lines.push(fill(t('book.ch11.retry.missing'), { letters: feedback.missing.join(', ') }));
				}
				if (feedback.extra.length > 0) {
					lines.push(fill(t('book.ch11.retry.extra'), { letters: feedback.extra.join(', ') }));
				}
				return lines;
			}
			case 'jump':
				return motion
					? [fill(t('book.ch11.retry.jump'), { held: motion.heldLetter, from: motion.fallingFrom })]
					: [];
			case 'shown':
				return [t(previous === null ? 'book.ch11.shown.first' : 'book.ch11.shown.next')];
			case 'right':
				return [fill(t('book.ch11.right'), { symbol: feedback.symbol })];
			case 'key-done':
				return [fill(t('book.ch11.keyDone'), { key: feedback.key, next: feedback.next })];
			default:
				return [];
		}
	});

	const isRetry = $derived(feedback.kind === 'notes' || feedback.kind === 'jump');
</script>

<div class="guide-cycle flex flex-col gap-4" data-testid="guide-cycle">
	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">{t('book.ch11.keyLabel')}</p>
		<div class="flex flex-wrap gap-2" data-testid="guide-cycle-key-row">
			{#each keys as candidate, index (candidate)}
				{@const clean = cleanKeys.includes(candidate)}
				<Button
					type="button"
					variant={index === keyIndex && !finished ? 'primary' : 'ghost'}
					aria-pressed={index === keyIndex && !finished}
					data-clean={clean}
					onclick={() => goTo(index)}
				>
					{candidate}{#if clean}<span class="clean-mark" aria-hidden="true">✓</span>{/if}
				</Button>
			{/each}
		</div>
	</div>

	{#if finished}
		<div class="done border-ink bg-paper-bright border-2 px-4 py-4" data-testid="guide-cycle-done">
			{#if remaining.length === 0}
				<p class="text-body font-bold">{t('book.ch11.done.clean')}</p>
			{:else}
				<p class="text-body">{fill(t('book.ch11.done.retry'), { keys: remaining.join(', ') })}</p>
			{/if}
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={() => goTo(0)}>
					{t('book.ch11.button.again')}
				</Button>
			</div>
		</div>
	{:else}
		<div class="bars" data-testid="guide-cycle-bars">
			{#each bars as cell, index (cell.index)}
				<div class="bar" class:bar--current={index === barIndex} class:bar--done={index < barIndex}>
					<span class="bar-symbol">{chordLabel(spellChord(cell.symbol))}</span>
					<span class="bar-roman">{cell.roman}</span>
				</div>
			{/each}
		</div>

		<div class="glyph-row" data-testid="guide-cycle-chord">
			<ChordGlyph root={chord.root} quality={chord.symbol.slice(chord.root.length)} />
		</div>

		<p class="text-body" data-testid="guide-cycle-prompt">
			{barIndex === 0 ? t('book.ch11.prompt.first') : t('book.ch11.prompt.next')}
		</p>
		{#if motion}
			<p class="text-body motion" data-testid="guide-cycle-motion">
				{fill(t('book.ch11.motion'), {
					held: motion.heldLetter,
					from: motion.fallingFrom,
					to: motion.fallingTo
				})}
			</p>
		{/if}

		<PianoKeyboard
			notes={[]}
			interactive
			{selected}
			onToggle={toggleKey}
			onPress={handlePress}
			octaves={2}
			{wrongLetters}
			{ghostKeys}
		/>

		<div class="flex flex-wrap gap-2">
			<Button type="button" variant="primary" onclick={check} data-testid="guide-cycle-check">
				{t('book.ch11.button.check')}
			</Button>
			<Button type="button" variant="ghost" onclick={hear}>{t('book.ch11.button.hear')}</Button>
			<Button type="button" variant="ghost" onclick={reveal} data-testid="guide-cycle-show">
				{t('book.ch11.button.show')}
			</Button>
			<Button type="button" variant="ghost" onclick={clearPlay}>{t('book.ch11.button.clear')}</Button>
		</div>

		{#if feedbackLines.length > 0}
			<div class:retry={isRetry} data-testid="guide-cycle-feedback" data-kind={feedback.kind}>
				{#each feedbackLines as line (line)}
					<p class="text-body">{line}</p>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.clean-mark {
		margin-left: var(--spacing-xs);
		font-weight: 700;
	}

	.bars {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border: 2px solid var(--color-ink);
	}

	.bar {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
		border-left: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
	}

	.bar:first-child {
		border-left: none;
	}

	.bar-symbol {
		font-weight: 700;
	}

	.bar-roman {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.bar--current {
		box-shadow: inset 0 -4px 0 var(--color-vermilion);
	}

	.bar--done .bar-symbol {
		color: var(--color-verdigris);
	}

	.glyph-row {
		display: flex;
	}

	.motion {
		color: var(--color-muted);
	}

	.retry {
		color: var(--color-vermilion);
	}
</style>
