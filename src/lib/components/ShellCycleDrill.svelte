<script lang="ts">
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import { chromaOf } from '$lib/theory/interval';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { lowestPlayedChroma, matchInversion } from '$lib/drills/matchInversion';
	import { guideToneMotion, toGuideToneBar } from '$lib/lessons/guideTones';
	import {
		SHELL_CYCLE_KEYS,
		SHELL_FORMS,
		lettersForChromas,
		positionForBar,
		rootedShell,
		shellCycleBars,
		voiceRootedShell,
		type ShellForm,
		type ShellPosition
	} from '$lib/practice/shellCycle';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 15's "At the piano" exercise: the ii-V-I (then the minor
	 * iiø-V-i) as rooted shells, in all 12 keys, in the fixed cycle-of-fourths
	 * order of `SHELL_CYCLE_KEYS`. CHECKED: every chord is graded by the
	 * inversion drill's own rule (`matchInversion`), the chroma set of root +
	 * shell plus the root as the lowest note, so the 3rd and 7th may sit in
	 * either order above it.
	 *
	 * Lives on the chapter page, never in /practice: 36 chords per form would
	 * swamp the bounded daily round (AGENTS.md, synthetic families must stay
	 * capped), and it creates no card and writes no answer event.
	 *
	 * A key counts as CLEAN when all three of its chords were right on the
	 * first Check with no Show me. When all 12 keys of a form are clean,
	 * `onClean(form)` fires and the chapter ticks its checklist line. Clean
	 * keys are remembered for this visit only; the tick is what persists.
	 */
	interface Props {
		onClean?: (form: ShellForm) => void;
	}

	let { onClean }: Props = $props();

	/** The two-octave board's lowest octave, where an unpressed letter is assumed to sit. */
	const BASE_OCTAVE = 4;

	const FORM_LABEL: Record<ShellForm, string> = { major: 'ii V I', minor: 'iiø V i' };
	const POSITION_KEY: Record<ShellPosition, MessageKey> = {
		'third-low': 'book.ch15.position.thirdLow',
		'seventh-low': 'book.ch15.position.seventhLow'
	};

	type Feedback =
		| { kind: 'none' }
		| { kind: 'notes'; missing: string[]; extra: string[] }
		| { kind: 'bass' }
		| { kind: 'shown'; position: ShellPosition }
		| { kind: 'right'; symbol: string }
		| { kind: 'key-done'; key: string; next: string };

	let form = $state<ShellForm>('major');
	let keyIndex = $state(0);
	let barIndex = $state(0);
	let finished = $state(false);
	let cleanKeys = $state<Record<ShellForm, string[]>>({ major: [], minor: [] });
	/** Set by any wrong Check or Show me in the current key; a missed key is not clean. */
	let keyMissed = $state(false);
	let showMe = $state(false);
	let feedback = $state<Feedback>({ kind: 'none' });
	let selected = $state<Set<string>>(new Set());
	let pressedOctaveByLetter = $state(new Map<string, number>());
	let wrongLetters = $state<Set<string>>(new Set());

	const keys = $derived(SHELL_CYCLE_KEYS[form]);
	const key = $derived(keys[keyIndex]);
	const bars = $derived(shellCycleBars(form, key));
	const bar = $derived(bars[barIndex]);
	const chord = $derived(spellChord(bar.symbol));
	const target = $derived(rootedShell(chord));
	const rootLetter = $derived(chord.root);
	const rootChroma = $derived(chromaOf(rootLetter) ?? -1);
	const hasFlatFifth = $derived(target.notes.some((note) => note.role === 'fifth'));
	const voiced = $derived(voiceRootedShell(chord, positionForBar(barIndex)));

	/** The guide-tone move into this chord from the previous one, named on the prompt for V and I. */
	const motion = $derived(
		barIndex > 0 ? guideToneMotion(toGuideToneBar(bars[barIndex - 1]), toGuideToneBar(bar)) : null
	);

	const remaining = $derived(keys.filter((candidate) => !cleanKeys[form].includes(candidate)));

	function fill(template: string, values: Record<string, string>): string {
		return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
	}

	function clearPlay(): void {
		selected = new Set();
		pressedOctaveByLetter = new Map();
		wrongLetters = new Set();
	}

	function goTo(nextForm: ShellForm, nextKeyIndex: number): void {
		form = nextForm;
		keyIndex = nextKeyIndex;
		barIndex = 0;
		finished = false;
		keyMissed = false;
		showMe = false;
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
		if (!keyMissed && !cleanKeys[form].includes(key)) {
			const nowClean = [...cleanKeys[form], key];
			cleanKeys = { ...cleanKeys, [form]: nowClean };
			if (nowClean.length === keys.length) onClean?.(form);
		}
		keyMissed = false;
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
		// An unresolvable letter maps to -1, lands in `extra`, and fails closed (InversionDrill's rule).
		const played = new Set([...selected].map((letter) => chromaOf(letter) ?? -1));
		const bass = lowestPlayedChroma(selected, pressedOctaveByLetter, BASE_OCTAVE);
		const result = matchInversion(played, bass, target, rootChroma);

		if (!result.chordCorrect) {
			keyMissed = true;
			const extra = [...selected].filter((letter) => result.extra.includes(chromaOf(letter) ?? -1));
			wrongLetters = new Set(extra);
			feedback = { kind: 'notes', missing: lettersForChromas(target, result.missing), extra };
			return;
		}
		if (!result.bassCorrect) {
			keyMissed = true;
			feedback = { kind: 'bass' };
			return;
		}

		const symbol = chordLabel(chord);
		showMe = false;
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
		feedback = { kind: 'shown', position: voiced.position };
	}

	function hear(): void {
		void ensureAudioReady();
		playChord(voiced.notes.map((note) => note.letter));
	}

	const ghostKeys = $derived(
		showMe ? voiced.notes.map((note) => ({ letter: note.letter, octave: note.octave, marker: note.marker })) : []
	);
	const bassHint = $derived(
		showMe && voiced.notes[0] ? { letter: voiced.notes[0].letter, octave: voiced.notes[0].octave } : null
	);

	const feedbackLines = $derived.by((): string[] => {
		switch (feedback.kind) {
			case 'notes': {
				const lines: string[] = [];
				if (feedback.missing.length > 0) {
					lines.push(fill(t('book.ch15.retry.missing'), { letters: feedback.missing.join(', ') }));
				}
				if (feedback.extra.length > 0) {
					lines.push(fill(t('book.ch15.retry.extra'), { letters: feedback.extra.join(', ') }));
				}
				return lines;
			}
			case 'bass':
				return [fill(t('book.ch15.retry.bass'), { root: rootLetter })];
			case 'shown':
				return [fill(t('book.ch15.shown'), { position: t(POSITION_KEY[feedback.position]) })];
			case 'right':
				return [fill(t('book.ch15.right'), { symbol: feedback.symbol })];
			case 'key-done':
				return [fill(t('book.ch15.keyDone'), { key: feedback.key, next: feedback.next })];
			default:
				return [];
		}
	});

	const isRetry = $derived(feedback.kind === 'notes' || feedback.kind === 'bass');
</script>

<div class="shell-cycle flex flex-col gap-4" data-testid="shell-cycle">
	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">{t('book.ch15.formLabel')}</p>
		<div class="flex flex-wrap gap-2" data-testid="shell-cycle-form-row">
			{#each SHELL_FORMS as candidate (candidate)}
				<Button
					type="button"
					variant={candidate === form ? 'primary' : 'ghost'}
					aria-pressed={candidate === form}
					onclick={() => goTo(candidate, 0)}
				>
					{FORM_LABEL[candidate]}
				</Button>
			{/each}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">{t('book.ch15.keyLabel')}</p>
		<div class="flex flex-wrap gap-2" data-testid="shell-cycle-key-row">
			{#each keys as candidate, index (candidate)}
				{@const clean = cleanKeys[form].includes(candidate)}
				<Button
					type="button"
					variant={index === keyIndex && !finished ? 'primary' : 'ghost'}
					aria-pressed={index === keyIndex && !finished}
					data-clean={clean}
					onclick={() => goTo(form, index)}
				>
					{candidate}{#if clean}<span class="clean-mark" aria-hidden="true">✓</span>{/if}
				</Button>
			{/each}
		</div>
	</div>

	{#if finished}
		<div class="done border-ink bg-paper-bright border-2 px-4 py-4" data-testid="shell-cycle-done">
			{#if remaining.length === 0}
				<p class="text-body font-bold">{t('book.ch15.done.clean')}</p>
			{:else}
				<p class="text-body">{fill(t('book.ch15.done.retry'), { keys: remaining.join(', ') })}</p>
			{/if}
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={() => goTo(form, 0)}>
					{t('book.ch15.button.again')}
				</Button>
			</div>
		</div>
	{:else}
		<div class="bars" data-testid="shell-cycle-bars">
			{#each bars as cell, index (cell.index)}
				<div class="bar" class:bar--current={index === barIndex} class:bar--done={index < barIndex}>
					<span class="bar-symbol">{chordLabel(spellChord(cell.symbol))}</span>
					<span class="bar-roman">{cell.roman}</span>
				</div>
			{/each}
		</div>

		<div class="glyph-row" data-testid="shell-cycle-chord">
			<ChordGlyph root={chord.root} quality={chord.symbol.slice(chord.root.length)} />
		</div>

		<p class="text-body" data-testid="shell-cycle-prompt">
			{hasFlatFifth ? t('book.ch15.prompt.flat5') : t('book.ch15.prompt')}
		</p>
		{#if motion}
			<p class="text-body motion" data-testid="shell-cycle-motion">
				{fill(t('book.ch15.motion'), {
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
			{bassHint}
		/>

		<div class="flex flex-wrap gap-2">
			<Button type="button" variant="primary" onclick={check} data-testid="shell-cycle-check">
				{t('book.ch15.button.check')}
			</Button>
			<Button type="button" variant="ghost" onclick={hear}>{t('book.ch15.button.hear')}</Button>
			<Button type="button" variant="ghost" onclick={reveal} data-testid="shell-cycle-show">
				{t('book.ch15.button.show')}
			</Button>
			<Button type="button" variant="ghost" onclick={clearPlay}>{t('book.ch15.button.clear')}</Button>
		</div>

		{#if feedbackLines.length > 0}
			<div class:retry={isRetry} data-testid="shell-cycle-feedback" data-kind={feedback.kind}>
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
