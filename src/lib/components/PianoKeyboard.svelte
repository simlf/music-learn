<script lang="ts">
	import NoteLabel from './NoteLabel.svelte';
	import type { IntervalRole, SpelledNote } from '$lib/theory/types';

	/**
	 * Display-only Print Shop piano keyboard. Renders a two-octave C-to-C span
	 * (15 white keys) so every v1 chord's root/3rd/5th/7th fit fully above its
	 * root without wrapping. No click/keydown handlers - interactivity is
	 * Phase 3. Matches spelled notes to keys by letter name, not MIDI number
	 * (UI-SPEC implementation note), and fills matched keys with their interval
	 * color, showing a NoteLabel (letter + solfege) on top.
	 */
	interface Props {
		/** Spelled notes (from the theory engine) to highlight on the keyboard. */
		notes: SpelledNote[];
	}

	let { notes }: Props = $props();

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

	const noteAssignment = assignNotesToKeys();

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

	const whiteKeys: WhiteKey[] = WHITE_LETTERS.map((letter, index) => ({
		index,
		letter,
		leftPct: index * WHITE_KEY_WIDTH_PCT,
		note: noteAtWhiteIndex(index)
	}));

	const blackKeys: BlackKey[] = BLACK_KEYS.map(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => ({
		position: afterWhiteIndex + 1,
		leftPct: (afterWhiteIndex + 1) * WHITE_KEY_WIDTH_PCT - BLACK_KEY_WIDTH_PCT / 2,
		sharpLetter,
		flatLetter,
		note: noteAtBlackIndex(blackIndex)
	}));

	function roleClass(role: IntervalRole | undefined): string {
		return role ? `piano-keyboard__key--${role}` : '';
	}
</script>

<div class="piano-keyboard" role="img" aria-label="Piano keyboard, two octaves">
	{#each whiteKeys as key (key.index)}
		<div
			class="piano-keyboard__key piano-keyboard__key--white {roleClass(key.note?.role)}"
			style="left: {key.leftPct}%; width: {WHITE_KEY_WIDTH_PCT}%;"
		>
			{#if key.note}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{/if}
		</div>
	{/each}
	{#each blackKeys as key, i (i)}
		<div
			class="piano-keyboard__key piano-keyboard__key--black {roleClass(key.note?.role)}"
			style="left: {key.leftPct}%; width: {BLACK_KEY_WIDTH_PCT}%;"
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
</style>
