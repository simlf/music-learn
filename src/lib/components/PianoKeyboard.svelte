<script lang="ts">
	import NoteLabel from './NoteLabel.svelte';
	import type { IntervalRole, SpelledNote } from '$lib/theory/types';
	import {
		assignNotesToKeys,
		blackKeysForOctaves,
		octavesForWidth,
		whiteLettersForOctaves,
		type BlackKeyPattern,
		type KeyCandidate
	} from './keyboardLayout';

	/**
	 * Print Shop piano keyboard. Renders a responsive C-to-C span: one octave
	 * (8 white keys) on phone-width viewports, two octaves (15 white keys) once
	 * enough width is available for every v1 chord's root/3rd/5th/7th to fit
	 * without wrapping (D-01). Matches spelled notes to keys by letter name,
	 * not MIDI number (UI-SPEC implementation note), and fills matched keys
	 * with their interval color, showing a NoteLabel (letter + solfege) on
	 * top. A chord that would run past the visible one-octave span wraps its
	 * overflow notes back into the octave as pitch classes, still tagged with
	 * their interval role (D-02, via keyboardLayout's assignNotesToKeys).
	 *
	 * Display-only by default (Phase 1 showcase, Phase 2 lookup): no
	 * click/keydown handlers, no button semantics. Passing `interactive`
	 * (Phase 3 / INPUT-02) opts every key into click + Enter/Space toggling,
	 * gated entirely behind the `interactive` prop so the pre-existing
	 * display-only render stays byte-identical when it is omitted. Selection
	 * is letter-based and octave-agnostic, so it survives an octave-count
	 * change uninterrupted (D-03).
	 */
	interface Props {
		/** Spelled notes (from the theory engine) to highlight on the keyboard. */
		notes: SpelledNote[];
		/** Opt into clickable/keyboard-toggleable keys (default false, Phase 3). */
		interactive?: boolean;
		/** Letters currently toggled on by the user; only meaningful when `interactive`. */
		selected?: Set<string>;
		/** Called with a key's letter when the user toggles it (click or Enter/Space). */
		onToggle?: (letter: string) => void;
		/**
		 * Explicit octave-count override (mainly a test seam). When omitted, the
		 * component self-measures its available width via ResizeObserver and
		 * derives the octave count from it (2 when a full two-octave span fits,
		 * else 1 - D-01, D-04).
		 */
		octaves?: 1 | 2;
		/**
		 * Letters the user played that are NOT part of `notes` (Sketch 001
		 * Variant A wrong-answer feedback). Defined (even as an empty set) is
		 * the feedback-mode signal: matching keys get a gray wrong-fill + a ✕
		 * mark instead of a NoteLabel, and every interval-colored/wrong key
		 * gets the stamp-in reveal animation. Undefined leaves display/
		 * interactive mode byte-identical to before this prop existed.
		 */
		wrongLetters?: Set<string>;
	}

	let { notes, interactive = false, selected, onToggle, octaves, wrongLetters }: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let measuredWidth: number | undefined = $state(undefined);

	// Self-measure only when `octaves` isn't explicitly provided. Reads the
	// container's width and derives octave count from it via `$derived` below
	// - never writes anything back that affects the observed element's size,
	// so there is no observe -> resize -> observe feedback loop (T-09-01).
	// Guarded for jsdom/older browsers lacking ResizeObserver: falls back to
	// the default of 2 octaves (matches every pre-existing display/interactive
	// test).
	$effect(() => {
		if (octaves !== undefined) return;
		if (!containerEl || typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				measuredWidth = entry.contentRect.width;
			}
		});
		observer.observe(containerEl);

		return () => observer.disconnect();
	});

	const effectiveOctaves: 1 | 2 = $derived(
		octaves ?? (measuredWidth !== undefined ? octavesForWidth(measuredWidth) : 2)
	);

	function toggleKey(letter: string) {
		onToggle?.(letter);
	}

	function handleKeydown(event: KeyboardEvent, letter: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleKey(letter);
		}
	}

	function keyAriaLabel(letter: string): string {
		return selected?.has(letter) ? `${letter} key, selected` : `${letter} key`;
	}

	function keyboardAriaLabel(octaveCount: 1 | 2): string {
		return octaveCount === 1 ? 'Piano keyboard, one octave' : 'Piano keyboard, two octaves';
	}

	const whiteLetters = $derived(whiteLettersForOctaves(effectiveOctaves));
	const blackKeyPatterns: BlackKeyPattern[] = $derived(blackKeysForOctaves(effectiveOctaves));

	const whiteKeyWidthPct = $derived(100 / whiteLetters.length);
	const blackKeyWidthPct = $derived(whiteKeyWidthPct * 0.6);

	interface WhiteKey {
		index: number;
		letter: string;
		leftPct: number;
		note: SpelledNote | undefined;
	}

	interface BlackKey {
		/** Fractional key position (afterWhiteIndex + 1) used for ascending-order comparison. */
		position: number;
		leftPct: number;
		sharpLetter: string;
		flatLetter: string;
		note: SpelledNote | undefined;
	}

	// $derived (not plain const): the key/note assignment must recompute when
	// `notes` or the effective octave count changes, or every lookup/relayout
	// after the first would keep the previous chord's highlights (the
	// component instance persists across result changes on the lookup page,
	// and across octave-count changes on rotation).
	const noteAssignment: Map<SpelledNote, KeyCandidate> = $derived(
		assignNotesToKeys(notes, whiteLetters, blackKeyPatterns)
	);

	function noteAtWhiteIndex(index: number): SpelledNote | undefined {
		for (const [note, candidate] of noteAssignment) {
			if (candidate.kind === 'white' && candidate.keyIndex === index) return note;
		}
		return undefined;
	}

	function noteAtBlackIndex(blackIndex: number): SpelledNote | undefined {
		for (const [note, candidate] of noteAssignment) {
			if (candidate.kind === 'black' && candidate.keyIndex === blackIndex) return note;
		}
		return undefined;
	}

	const whiteKeys: WhiteKey[] = $derived(
		whiteLetters.map((letter, index) => ({
			index,
			letter,
			leftPct: index * whiteKeyWidthPct,
			note: noteAtWhiteIndex(index)
		}))
	);

	const blackKeys: BlackKey[] = $derived(
		blackKeyPatterns.map(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => ({
			position: afterWhiteIndex + 1,
			leftPct: (afterWhiteIndex + 1) * whiteKeyWidthPct - blackKeyWidthPct / 2,
			sharpLetter,
			flatLetter,
			note: noteAtBlackIndex(blackIndex)
		}))
	);

	function roleClass(role: IntervalRole | undefined): string {
		return role ? `piano-keyboard__key--${role}` : '';
	}

	/**
	 * Selected/pending hatch treatment applies only in interactive mode, only
	 * when the key has no interval-role highlight (selected and
	 * revealed-correct are mutually exclusive per UI-SPEC), so a merely-
	 * selected key never fights with the four reserved interval-color fills.
	 */
	function selectedClass(letter: string, role: IntervalRole | undefined): string {
		return interactive && !role && selected?.has(letter) ? 'piano-keyboard__key--selected' : '';
	}

	/**
	 * Wrong-answer gray fill (Sketch 001 Variant A): only applies when this
	 * key has no interval-role highlight — revealed-correct notes always keep
	 * their interval color, never gray, so a wrong key and a colored key are
	 * mutually exclusive (mirrors `selectedClass`'s `!role` guard).
	 */
	function wrongClass(letter: string, role: IntervalRole | undefined): string {
		return !role && wrongLetters?.has(letter) ? 'piano-keyboard__key--wrong' : '';
	}

	/**
	 * Reveal stamp beat (shared `stamp-in` keyframe lives in app.css): fires on
	 * every interval-colored key and every wrong-fill key once feedback mode
	 * is on (`wrongLetters` defined, even as an empty set), so the whole
	 * reveal lands together.
	 */
	function stampedClass(letter: string, role: IntervalRole | undefined): string {
		if (wrongLetters === undefined) return '';
		return role || wrongLetters.has(letter) ? 'piano-keyboard__key--stamped' : '';
	}
</script>

<div
	class="piano-keyboard"
	role="img"
	aria-label={keyboardAriaLabel(effectiveOctaves)}
	bind:this={containerEl}
>
	{#each whiteKeys as key (key.index)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--white {roleClass(
				key.note?.role
			)} {selectedClass(key.letter, key.note?.role)} {wrongClass(
				key.letter,
				key.note?.role
			)} {stampedClass(key.letter, key.note?.role)}"
			style="left: {key.leftPct}%; width: {whiteKeyWidthPct}%;"
			role={interactive ? 'button' : undefined}
			tabindex={interactive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.letter) ?? false) : undefined}
			aria-label={interactive ? keyAriaLabel(key.letter) : undefined}
			onclick={interactive ? () => toggleKey(key.letter) : undefined}
			onkeydown={interactive ? (event: KeyboardEvent) => handleKeydown(event, key.letter) : undefined}
		>
			{#if key.note}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{:else if wrongLetters?.has(key.letter)}
				<span class="piano-keyboard__wrong-mark" aria-hidden="true">✕</span>
				<span class="sr-only">extra note</span>
			{/if}
		</div>
	{/each}
	{#each blackKeys as key, i (i)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--black {roleClass(
				key.note?.role
			)} {selectedClass(key.sharpLetter, key.note?.role)} {wrongClass(
				key.sharpLetter,
				key.note?.role
			)} {stampedClass(key.sharpLetter, key.note?.role)}"
			style="left: {key.leftPct}%; width: {blackKeyWidthPct}%;"
			role={interactive ? 'button' : undefined}
			tabindex={interactive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.sharpLetter) ?? false) : undefined}
			aria-label={interactive ? keyAriaLabel(key.sharpLetter) : undefined}
			onclick={interactive ? () => toggleKey(key.sharpLetter) : undefined}
			onkeydown={interactive
				? (event: KeyboardEvent) => handleKeydown(event, key.sharpLetter)
				: undefined}
		>
			{#if key.note}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{:else if wrongLetters?.has(key.sharpLetter)}
				<span class="piano-keyboard__wrong-mark" aria-hidden="true">✕</span>
				<span class="sr-only">extra note</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.piano-keyboard {
		position: relative;
		width: 100%;
		height: 160px;
	}

	/*
	 * No min-width here (09-02 defect fix): a fixed px floor fights the
	 * percentage-based `left`/`width` layout above - every key would clamp to
	 * the same 44px regardless of its percentage position, so at one octave
	 * (8 white keys, ~34px pitch on a typical 390px phone with the old page
	 * padding) keys overlapped their neighbors by ~10px and black keys fused
	 * into solid blocks. The real >=44px touch pitch at one octave now comes
	 * from the container being wide enough (page/card padding reduced at
	 * phone widths, see drills/+page.svelte and routes/+page.svelte), not
	 * from clamping key width independently of its position.
	 */
	.piano-keyboard__key {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: var(--spacing-xs);
	}

	.piano-keyboard__key--white {
		height: 100%;
		background-color: var(--color-paper-bright);
		border: 1.5px solid var(--color-ink);
		z-index: 1;
	}

	.piano-keyboard__key--black {
		height: 60%;
		background-color: var(--color-ink);
		z-index: 2;
	}

	.piano-keyboard__key--root {
		background-color: var(--color-root);
	}

	.piano-keyboard__key--third {
		background-color: var(--color-third);
	}

	.piano-keyboard__key--fifth {
		background-color: var(--color-fifth);
	}

	.piano-keyboard__key--seventh {
		background-color: var(--color-seventh);
	}

	/*
	 * Wrong-answer feedback fill (Sketch 001 Variant A): the user's extra,
	 * non-chord notes at reveal time. Mutually exclusive with the four
	 * interval-role fills above (wrongClass only applies when there is no
	 * role), so a wrong key never fights with a colored one.
	 */
	.piano-keyboard__key--wrong {
		background-color: var(--color-wrong);
	}

	.piano-keyboard__key--black.piano-keyboard__key--wrong {
		background-color: var(--color-wrong-deep);
	}

	.piano-keyboard__wrong-mark {
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: var(--text-label);
		color: var(--color-ink);
	}

	/*
	 * Reveal stamp beat: keyframe now lives in app.css (shared with the
	 * drills page's .stamp) so both consumers reference one definition; the
	 * prefers-reduced-motion guard also lives there alongside it.
	 */
	.piano-keyboard__key--stamped {
		animation: stamp-in 240ms ease-out;
	}

	/*
	 * Selected/pending key: a diagonal ink hatch texture plus an inset ink
	 * border, deliberately NOT a color fill, so it can never be confused with
	 * the four reserved interval-color fills above (which only ever appear on
	 * revealed/correct notes). Layered over the key's existing base color via
	 * repeating-linear-gradient; no new app.css token, per UI-SPEC.
	 */
	.piano-keyboard__key--selected {
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 0,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 1px,
			transparent 1px,
			transparent 7px
		);
		box-shadow: inset 0 0 0 2px var(--color-ink);
	}

	.piano-keyboard__key--black.piano-keyboard__key--selected {
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--color-paper-bright) 20%, transparent) 0,
			color-mix(in srgb, var(--color-paper-bright) 20%, transparent) 1px,
			transparent 1px,
			transparent 7px
		);
		box-shadow: inset 0 0 0 2px var(--color-paper-bright);
	}
</style>
