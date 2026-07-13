<script lang="ts">
	import NoteLabel from './NoteLabel.svelte';
	import type { IntervalRole, SpelledNote } from '$lib/theory/types';

	/**
	 * Print Shop piano keyboard. Renders a two-octave C-to-C span (15 white
	 * keys) so every v1 chord's root/3rd/5th/7th fit fully above its root
	 * without wrapping. Matches spelled notes to keys by letter name, not MIDI
	 * number (UI-SPEC implementation note), and fills matched keys with their
	 * interval color, showing a NoteLabel (letter + solfege) on top.
	 *
	 * Display-only by default (Phase 1 showcase, Phase 2 lookup): no
	 * click/keydown handlers, no button semantics. Passing `interactive`
	 * (Phase 3 / INPUT-02) opts every key into click + Enter/Space toggling,
	 * gated entirely behind the `interactive` prop so the pre-existing
	 * display-only render stays byte-identical when it is omitted.
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
	}

	let { notes, interactive = false, selected, onToggle }: Props = $props();

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

	/** White key letters across a two-octave C-to-C span (15 keys). */
	const WHITE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];

	/**
	 * Black keys as { afterWhiteIndex, sharpLetter, flatLetter } pairs. A black
	 * key sits between two white keys except after E and B (standard piano
	 * layout), repeated per octave. Each black key position is enharmonically
	 * two letters (e.g. C♯/D♭) - a spelled note matches the key if it equals
	 * either spelling, since v1 chords can spell a black key either way
	 * (e.g. Cm7 spells its third as E♭, which sits on the D♯/E♭ key).
	 */
	const BLACK_KEYS: { afterWhiteIndex: number; sharpLetter: string; flatLetter: string }[] = [
		{ afterWhiteIndex: 0, sharpLetter: 'C♯', flatLetter: 'D♭' },
		{ afterWhiteIndex: 1, sharpLetter: 'D♯', flatLetter: 'E♭' },
		{ afterWhiteIndex: 3, sharpLetter: 'F♯', flatLetter: 'G♭' },
		{ afterWhiteIndex: 4, sharpLetter: 'G♯', flatLetter: 'A♭' },
		{ afterWhiteIndex: 5, sharpLetter: 'A♯', flatLetter: 'B♭' },
		{ afterWhiteIndex: 7, sharpLetter: 'C♯', flatLetter: 'D♭' },
		{ afterWhiteIndex: 8, sharpLetter: 'D♯', flatLetter: 'E♭' },
		{ afterWhiteIndex: 10, sharpLetter: 'F♯', flatLetter: 'G♭' },
		{ afterWhiteIndex: 11, sharpLetter: 'G♯', flatLetter: 'A♭' },
		{ afterWhiteIndex: 12, sharpLetter: 'A♯', flatLetter: 'B♭' }
	];

	const WHITE_KEY_COUNT = WHITE_LETTERS.length;
	const WHITE_KEY_WIDTH_PCT = 100 / WHITE_KEY_COUNT;
	const BLACK_KEY_WIDTH_PCT = WHITE_KEY_WIDTH_PCT * 0.6;

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

	/** A key candidate a note could be assigned to, tagged by which key kind it targets. */
	interface KeyCandidate {
		position: number;
		kind: 'white' | 'black';
		keyIndex: number;
	}

	/**
	 * Assigns each spelled note to exactly one key, walking the keyboard once
	 * from the root's key position upward in ascending pitch order (a single
	 * chord voicing built from its root - never re-highlighting the same
	 * letter's later octave repetition). Each note is matched to the nearest
	 * key at or after the previous note's position, keeping root < third <
	 * fifth < seventh in left-to-right order on the keyboard. White-letter
	 * notes only ever match white keys; accidental notes only ever match
	 * black keys - the two key kinds never share a candidate pool.
	 */
	function assignNotesToKeys(): Map<SpelledNote, KeyCandidate> {
		const assignment = new Map<SpelledNote, KeyCandidate>();
		let cursor = 0;

		for (const note of notes) {
			const candidates: KeyCandidate[] = [];

			WHITE_LETTERS.forEach((letter, index) => {
				if (letter === note.letter && index >= cursor) {
					candidates.push({ position: index, kind: 'white', keyIndex: index });
				}
			});
			BLACK_KEYS.forEach(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => {
				const position = afterWhiteIndex + 1;
				if ((note.letter === sharpLetter || note.letter === flatLetter) && position >= cursor) {
					candidates.push({ position, kind: 'black', keyIndex: blackIndex });
				}
			});

			if (candidates.length === 0) continue;

			const chosen = candidates.reduce((best, candidate) =>
				candidate.position < best.position ? candidate : best
			);
			assignment.set(note, chosen);
			cursor = chosen.position + 1;
		}

		return assignment;
	}

	// $derived (not plain const): the key/note assignment must recompute when
	// the `notes` prop changes, or every lookup after the first would keep the
	// previous chord's highlights (the component instance persists across
	// result changes on the lookup page).
	const noteAssignment = $derived(assignNotesToKeys());

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
		WHITE_LETTERS.map((letter, index) => ({
			index,
			letter,
			leftPct: index * WHITE_KEY_WIDTH_PCT,
			note: noteAtWhiteIndex(index)
		}))
	);

	const blackKeys: BlackKey[] = $derived(
		BLACK_KEYS.map(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => ({
			position: afterWhiteIndex + 1,
			leftPct: (afterWhiteIndex + 1) * WHITE_KEY_WIDTH_PCT - BLACK_KEY_WIDTH_PCT / 2,
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
</script>

<div class="piano-keyboard" role="img" aria-label="Piano keyboard, two octaves">
	{#each whiteKeys as key (key.index)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--white {roleClass(
				key.note?.role
			)} {selectedClass(key.letter, key.note?.role)}"
			style="left: {key.leftPct}%; width: {WHITE_KEY_WIDTH_PCT}%;"
			role={interactive ? 'button' : undefined}
			tabindex={interactive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.letter) ?? false) : undefined}
			aria-label={interactive ? keyAriaLabel(key.letter) : undefined}
			onclick={interactive ? () => toggleKey(key.letter) : undefined}
			onkeydown={interactive ? (event: KeyboardEvent) => handleKeydown(event, key.letter) : undefined}
		>
			{#if key.note}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{/if}
		</div>
	{/each}
	{#each blackKeys as key, i (i)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--black {roleClass(
				key.note?.role
			)} {selectedClass(key.sharpLetter, key.note?.role)}"
			style="left: {key.leftPct}%; width: {BLACK_KEY_WIDTH_PCT}%;"
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
			{/if}
		</div>
	{/each}
</div>

<style>
	.piano-keyboard {
		position: relative;
		width: 100%;
		min-width: 660px;
		height: 160px;
	}

	.piano-keyboard__key {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: var(--spacing-xs);
		min-width: 44px;
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
