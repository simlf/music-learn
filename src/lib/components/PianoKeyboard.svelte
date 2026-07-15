<script module lang="ts">
	import type { IntervalInfo } from '$lib/theory/interval';

	/** What an inspect-mode tap reports: the tapped key, fully named, plus its interval from the current root. */
	export interface InspectPayload {
		/** Spelled letter with display glyphs; black keys use the enharmonic that reads simplest from the root. */
		letter: string;
		/** French solfège for the letter. */
		solfege: string;
		/** Playback octave derived from the key's position (4 for the first octave, 5 for the second). */
		octave: number;
		/** Interval from the current root (the `notes` entry with role 'root'), or null when no root is highlighted. */
		info: IntervalInfo | null;
		/** Whether the tapped key is one of the highlighted `notes`. */
		inChord: boolean;
	}
</script>

<script lang="ts">
	import NoteLabel from './NoteLabel.svelte';
	import { playNote } from '$lib/audio/audio';
	import { intervalFromRoot, toAsciiAccidentals, transposeFrom } from '$lib/theory/interval';
	import { letterToSolfege } from '$lib/theory/solfege';
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
	 *
	 * Interactive keys also get a phone-touch press cue: a pointerdown sets a
	 * transient `--pressed` state (brief scale/shade, additive to interval-
	 * color/wrong fills and the selected hatch, disabled under
	 * prefers-reduced-motion) and fires a feature-detected `navigator.vibrate`
	 * pulse where supported (D-11). The keyboard surface also carries
	 * gesture-hygiene styling (touch-action, -webkit-touch-callout,
	 * user-select) so taps register cleanly without double-tap zoom or the
	 * long-press callout/selection menu (D-12).
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
		 * Called on pointerdown with the key's letter (sharp spelling for black
		 * keys, e.g. "C♯") and its octave number (base octave 4, matching the
		 * audio engine's voicing) - the Track A key-touch sound hook, fired
		 * beside the existing haptic pulse. Interactive-only, like every other
		 * pointer handler; omitting it leaves rendering byte-identical.
		 */
		onPress?: (letter: string, octave: number) => void;
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
		/**
		 * Tap-to-inspect mode (Track C): tapping any key plays its note (via
		 * the $lib/audio/audio contract) and fires `onInspect` with the key's
		 * spelling, solfège, octave, and interval from the current root.
		 * Mutually exclusive with `interactive` (interactive wins if both are
		 * ever passed); omitted keeps the display-only render byte-identical,
		 * following the component's gated-prop compatibility contract.
		 */
		inspectable?: boolean;
		/** Called with the tapped key's InspectPayload; only meaningful when `inspectable`. */
		onInspect?: (payload: InspectPayload) => void;
		/**
		 * Interval badges (sketch 003): when true, every highlighted key shows a
		 * small corner badge with its interval from the root (R, m3, P5, m7), so
		 * the interval each note plays is readable directly on the keyboard.
		 * Additive and gated; omitting it leaves the render byte-identical.
		 */
		showIntervalBadges?: boolean;
		/**
		 * Tap-to-construct mode (Phase 12, D-06): every key becomes tappable -
		 * whether or not it is one of the highlighted `notes` - and fires
		 * `onConstructTap` with the tapped key's own letter (sharp spelling for
		 * black keys, matching onPress/onToggle's existing convention) and its
		 * key-position octave. Unlike inspectable's emitInspect, constructable
		 * taps never call playNote - the caller owns correct/wrong audio
		 * feedback. Mutually exclusive with `inspectable` (constructable wins
		 * when both are passed without interactive); `interactive` still wins
		 * over both. Omitted keeps the display-only render byte-identical,
		 * following the component's gated-prop compatibility contract.
		 */
		constructable?: boolean;
		/** Called with the tapped key's letter and octave; only meaningful when `constructable`. */
		onConstructTap?: (letter: string, octave: number) => void;
		/**
		 * Transient, octave-specific wrong-tap indicator (Phase 12): when set,
		 * only the exact key whose own letter+octave match gets the wrong-fill
		 * class - a same-letter duplicate key at a different octave is
		 * unaffected. Distinct from `wrongLetters` (a permanent-per-reveal,
		 * letter-only Set from the drills feedback surface) - the two props and
		 * their rendering paths stay fully separate.
		 */
		flashWrongKey?: { letter: string; octave: number } | null;
	}

	let {
		notes,
		interactive = false,
		selected,
		onToggle,
		onPress,
		octaves,
		wrongLetters,
		inspectable = false,
		onInspect,
		showIntervalBadges = false,
		constructable = false,
		onConstructTap,
		flashWrongKey
	}: Props = $props();

	/** Interval-from-root short label for a highlighted note (sketch 003). "R" for the root. */
	function intervalBadgeFor(note: SpelledNote | undefined): string {
		if (!showIntervalBadges || !note || rootLetter === undefined) return '';
		return intervalFromRoot(rootLetter, note.letter).short;
	}

	/**
	 * Inspect mode is subordinate to interactive: the two never coexist
	 * (contract). Also subordinate to constructable - the two "tap-driven,
	 * non-toggle" modes are never expected to be passed together in practice,
	 * but when they are, constructable wins (precedence choice, D-06).
	 */
	const inspecting = $derived(inspectable && !interactive && !constructable);
	/** Construct mode (Phase 12): subordinate to interactive, wins over inspectable. */
	const constructing = $derived(constructable && !interactive);
	/** Keys carry button semantics and pointer handlers in any active mode. */
	const keysActive = $derived(interactive || inspecting || constructing);

	let containerEl: HTMLDivElement | undefined = $state();
	let measuredWidth: number | undefined = $state(undefined);
	/** Letter of the key currently pressed (pointer down), for the D-11 press cue. Interactive-only. */
	let pressedLetter: string | undefined = $state(undefined);

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

	function handleKeydown(event: KeyboardEvent, activate: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			activate();
		}
	}

	/** Letter of the highlighted note tagged 'root': the inspect mode reference point. */
	const rootLetter = $derived(notes.find((note) => note.role === 'root')?.letter);

	/** Plays the tapped key and reports its full naming + interval from the root (inspect mode). */
	function emitInspect(letter: string, octave: number, inChord: boolean) {
		playNote(`${toAsciiAccidentals(letter)}${octave}`);
		onInspect?.({
			letter,
			solfege: letterToSolfege(letter),
			octave,
			info: rootLetter !== undefined ? intervalFromRoot(rootLetter, letter) : null,
			inChord
		});
	}

	function inspectWhiteKey(key: WhiteKey) {
		const octave = octaveForWhiteIndex(key.index);
		emitInspect(key.note?.letter ?? key.letter, octave, key.note !== undefined);
	}

	function inspectBlackKey(key: BlackKey) {
		const octave = octaveForBlackAfterWhiteIndex(key.position - 1);
		// A highlighted key keeps its assigned enharmonic spelling; an
		// unhighlighted black key picks whichever spelling reads simplest
		// from the current root (A4 over C reads F♯, m3 over E♭ reads G♭).
		let letter = key.note?.letter;
		if (letter === undefined) {
			letter = key.sharpLetter;
			if (rootLetter !== undefined) {
				const picked = intervalFromRoot(rootLetter, {
					sharpLetter: key.sharpLetter,
					flatLetter: key.flatLetter
				});
				if (picked.short !== '') {
					letter = transposeFrom(rootLetter, picked.short) || key.sharpLetter;
				}
			}
		}
		emitInspect(letter, octave, key.note !== undefined);
	}

	/**
	 * One activation path per key: toggle in interactive mode, report-only in
	 * construct mode (no playNote - the caller owns audio feedback), inspect
	 * in inspect mode.
	 */
	function activateWhiteKey(key: WhiteKey) {
		if (interactive) toggleKey(key.letter);
		else if (constructing) onConstructTap?.(key.letter, octaveForWhiteIndex(key.index));
		else inspectWhiteKey(key);
	}

	function activateBlackKey(key: BlackKey) {
		if (interactive) toggleKey(key.sharpLetter);
		else if (constructing)
			onConstructTap?.(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1));
		else inspectBlackKey(key);
	}

	/**
	 * Feature-detected haptic pulse (D-11): a single short vibration on key
	 * press, only when the Vibration API exists (Android Chrome/Firefox).
	 * No-ops cleanly everywhere else (iOS Safari, desktop) - never throws.
	 */
	function triggerHapticPulse() {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			navigator.vibrate(10);
		}
	}

	/**
	 * Pointerdown press cue + haptic (D-11) + key-touch sound hook (Track A).
	 * The press cue and haptic fire in either active mode (interactive or
	 * inspect); `onPress` stays interactive-only per its contract, since
	 * inspect taps already play their note through `emitInspect`. The octave
	 * is derived from key position (base octave 4, one per 7 white keys) so
	 * consumers can turn letter + octave into a concrete pitch.
	 */
	function handlePointerDown(letter: string, octave: number) {
		pressedLetter = letter;
		triggerHapticPulse();
		if (interactive) onPress?.(letter, octave);
	}

	/** Base octave of the keyboard's leftmost C (matches the audio voicing's octave 4). */
	const BASE_OCTAVE = 4;

	/** Octave of a white key by index (a new octave starts every 7 white keys). */
	function octaveForWhiteIndex(index: number): number {
		return BASE_OCTAVE + Math.floor(index / 7);
	}

	/** Octave of a black key by the white-key index it follows. */
	function octaveForBlackAfterWhiteIndex(afterWhiteIndex: number): number {
		return BASE_OCTAVE + Math.floor(afterWhiteIndex / 7);
	}

	/** Clears the transient pressed state on release/cancel/leave (D-11). */
	function clearPressed(letter: string) {
		if (pressedLetter === letter) pressedLetter = undefined;
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

	/**
	 * Press-down cue (D-11): additive to every other treatment above (interval
	 * color, wrong fill, selected hatch) - a key can be pressed at the same
	 * time as any of those, never replacing them. Active-mode only
	 * (interactive or inspect), since display-mode keys have no pointer
	 * handlers to set `pressedLetter`.
	 */
	function pressedClass(letter: string): string {
		return keysActive && pressedLetter === letter ? 'piano-keyboard__key--pressed' : '';
	}

	/**
	 * Construct-mode wrong-tap flash (Phase 12, D-06): transient and
	 * octave-specific, unlike `wrongClass`'s permanent, letter-only
	 * `wrongLetters` semantic. Reuses the same `.piano-keyboard__key--wrong`
	 * CSS rule verbatim - only this key's own letter+octave match flags it, so
	 * a same-letter duplicate key at a different octave never flashes.
	 */
	function flashWrongClass(letter: string, octave: number): string {
		return flashWrongKey?.letter === letter && flashWrongKey?.octave === octave
			? 'piano-keyboard__key--wrong'
			: '';
	}
</script>

<div
	class="piano-keyboard"
	role="img"
	aria-label={keyboardAriaLabel(effectiveOctaves)}
	style="touch-action: manipulation;"
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
			)} {stampedClass(key.letter, key.note?.role)} {pressedClass(key.letter)} {flashWrongClass(
				key.letter,
				octaveForWhiteIndex(key.index)
			)}"
			style="left: {key.leftPct}%; width: {whiteKeyWidthPct}%;"
			role={keysActive ? 'button' : undefined}
			tabindex={keysActive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.letter) ?? false) : undefined}
			aria-label={keysActive ? keyAriaLabel(key.letter) : undefined}
			onclick={keysActive ? () => activateWhiteKey(key) : undefined}
			onkeydown={keysActive
				? (event: KeyboardEvent) => handleKeydown(event, () => activateWhiteKey(key))
				: undefined}
			onpointerdown={keysActive
				? () => handlePointerDown(key.letter, octaveForWhiteIndex(key.index))
				: undefined}
			onpointerup={keysActive ? () => clearPressed(key.letter) : undefined}
			onpointerleave={keysActive ? () => clearPressed(key.letter) : undefined}
			onpointercancel={keysActive ? () => clearPressed(key.letter) : undefined}
		>
			{#if key.note}
				{#if showIntervalBadges}
					<span class="piano-keyboard__ivbadge">{intervalBadgeFor(key.note)}</span>
				{/if}
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
			)} {stampedClass(key.sharpLetter, key.note?.role)} {pressedClass(
				key.sharpLetter
			)} {flashWrongClass(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))}"
			style="left: {key.leftPct}%; width: {blackKeyWidthPct}%;"
			role={keysActive ? 'button' : undefined}
			tabindex={keysActive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.sharpLetter) ?? false) : undefined}
			aria-label={keysActive ? keyAriaLabel(key.sharpLetter) : undefined}
			onclick={keysActive ? () => activateBlackKey(key) : undefined}
			onkeydown={keysActive
				? (event: KeyboardEvent) => handleKeydown(event, () => activateBlackKey(key))
				: undefined}
			onpointerdown={keysActive
				? () => handlePointerDown(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))
				: undefined}
			onpointerup={keysActive ? () => clearPressed(key.sharpLetter) : undefined}
			onpointerleave={keysActive ? () => clearPressed(key.sharpLetter) : undefined}
			onpointercancel={keysActive ? () => clearPressed(key.sharpLetter) : undefined}
		>
			{#if key.note}
				{#if showIntervalBadges}
					<span class="piano-keyboard__ivbadge piano-keyboard__ivbadge--black">
						{intervalBadgeFor(key.note)}
					</span>
				{/if}
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
		/* Gesture hygiene (D-12): see the touch-action inline style above and
		   the matching rule on .piano-keyboard__key below - keyboard-only, not
		   page-wide. */
		-webkit-touch-callout: none;
		user-select: none;
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
		/*
		 * Gesture hygiene (D-12): keyboard-only touch hardening so taps
		 * register cleanly - no double-tap zoom, no iOS long-press
		 * callout/selection menu. Scoped to the keyboard element itself, not
		 * applied page-wide (pull-to-refresh blocking and leave-confirmation
		 * were explicitly NOT selected, D-12).
		 */
		touch-action: manipulation;
		-webkit-touch-callout: none;
		user-select: none;
		transition:
			transform 90ms ease-out,
			filter 90ms ease-out;
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

	.piano-keyboard__key--second {
		background-color: var(--color-second);
	}

	.piano-keyboard__key--fourth {
		background-color: var(--color-fourth);
	}

	.piano-keyboard__key--sixth {
		background-color: var(--color-sixth);
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
	 * Interval-from-root badge (sketch 003): a small corner tab near the top of
	 * a highlighted key, so the interval each note plays reads directly off the
	 * keyboard. Absolutely positioned so it never shifts the NoteLabel that
	 * sits at the key's foot.
	 */
	.piano-keyboard__ivbadge {
		position: absolute;
		top: var(--spacing-xs);
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 10px;
		letter-spacing: 0.04em;
		line-height: 1;
		padding: 2px 4px;
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}
	.piano-keyboard__ivbadge--black {
		background: var(--color-paper-bright);
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

	/*
	 * Press-down cue (D-11): an immediate, brief confirmation that a tap
	 * landed, so a fat-finger tap on glass is instantly confirmable. Additive
	 * to every treatment above - the interval-color/wrong fills, the
	 * selected-hatch, and the stamp-in reveal - never replacing any of them,
	 * since `pressedClass` is concatenated alongside those classes rather than
	 * gated behind an `!role`/`!selected` check. Disabled under
	 * prefers-reduced-motion (D-11); the `transition` above still applies so
	 * the class can be added/removed without a visible flash.
	 */
	.piano-keyboard__key--pressed {
		transform: scale(0.94);
		filter: brightness(0.9);
	}

	@media (prefers-reduced-motion: reduce) {
		.piano-keyboard__key--pressed {
			transform: none;
			filter: none;
		}
	}
</style>
