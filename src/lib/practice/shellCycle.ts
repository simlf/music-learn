import { Note } from 'tonal';
import { chromaOf, toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult, IntervalRole, SpelledNote } from '$lib/theory/types';
import { shellNotes } from './shellVoicing';
import { barsInKey, PROGRESSION_TEMPLATES, type ProgressionBar } from './progressions';

/**
 * Pure engine for chapter 15, "shells in every key" (the method-book plan,
 * `.planning/design/method-book.md`): the same ii-V-I, with the root in the
 * bass and the two guide tones above it, played in all 12 keys in a FIXED
 * order around the cycle of fourths. Every other progression surface draws
 * one random key per question (`randomProgression`); this is the one that
 * walks the whole cycle, which is the exercise jazz piano method books are
 * built around.
 *
 * The left-hand shape is the three-note "rooted shell": root at the bottom,
 * then the 3rd and the 7th in either order. `shellNotes` stays the single
 * definition of which notes carry the chord, so on a ♭5 chord (the minor
 * form's iiø) the ♭5 joins the shell here too: without it Dm7♭5 and Dm7 would
 * be the same three keys, the exact ambiguity that module's doc comment
 * forbids.
 *
 * Pure module: no DOM, no Svelte, no audio, no storage.
 */

/** The two forms the exercise runs: the major ii-V-I and the minor iiø-V-i. */
export type ShellForm = 'major' | 'minor';

export const SHELL_FORMS: readonly ShellForm[] = ['major', 'minor'];

const TEMPLATE_ID: Record<ShellForm, string> = {
	major: 'major-ii-V-I',
	minor: 'minor-ii-V-i'
};

/**
 * The 12 tonics in cycle-of-fourths order, starting on C: each key's I is
 * the next key's V, so the cycle is also the direction a ii-V-I's roots move.
 *
 * Spelled per form so no chord root ever needs a double accidental and as few
 * inner notes as possible do. Major takes the flat side through G♭ (F♯ major
 * would spell C♯7's 3rd and F♯maj7's 3rd and 7th as A♯/E♯). Minor takes G♯
 * and C♯ instead of A♭ and D♭: D♭ minor's iiø is E♭m7♭5, whose ♭5 is B♭♭, and
 * A♭ minor spells three notes as F♭/C♭/G♭ where G♯ minor needs one F𝄪.
 * Pinned in shellCycle.test.ts, which spells all 72 chords.
 *
 * Exported as the app's one cycle-of-fourths key order: anything else that
 * walks the cycle reads it from here rather than defining a second list.
 */
export const SHELL_CYCLE_KEYS: Record<ShellForm, readonly string[]> = {
	major: ['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'B', 'E', 'A', 'D', 'G'],
	minor: ['C', 'F', 'B♭', 'E♭', 'G♯', 'C♯', 'F♯', 'B', 'E', 'A', 'D', 'G']
};

/** The ii-V-I (or iiø-V-i) of `key` in `form`. Total: an unknown template yields []. */
export function shellCycleBars(form: ShellForm, key: string): ProgressionBar[] {
	const template = PROGRESSION_TEMPLATES.find((candidate) => candidate.id === TEMPLATE_ID[form]);
	return template ? barsInKey(template, key) : [];
}

/**
 * The grading target: the chord's root plus its shell (3rd and 7th, plus the
 * ♭5 on a ♭5 chord). Returned as a ChordResult so it feeds `matchInversion`
 * unchanged, with the root as the required bass. Total: an unrecognized chord
 * keeps its (empty) notes and is therefore ungradeable, never trivially right.
 */
export function rootedShell(chord: ChordResult): ChordResult {
	const root = chord.notes.find((note) => note.role === 'root');
	return { ...chord, notes: root ? [root, ...shellNotes(chord)] : [] };
}

/**
 * Which guide tone sits directly above the root. Alternating the two from one
 * chord to the next is what keeps the hand still: in B♭, Cm7 as C E♭ B♭ then
 * F7 as F E♭ A holds the E♭ and moves B♭ down a half step to A.
 */
export type ShellPosition = 'third-low' | 'seventh-low';

/** The alternation the "Show me" voicing uses: ii and I with the 3rd low, V with the 7th low. */
export function positionForBar(barIndex: number): ShellPosition {
	return barIndex % 2 === 0 ? 'third-low' : 'seventh-low';
}

/** One key of a voiced shell: spelled letter, the keyboard octave it sits in, its R/3/5/7 marker. */
export interface VoicedShellNote {
	letter: string;
	/** The octave of the physical key (B♯3 sounds on the C4 key, so it reports 4). */
	octave: number;
	marker: string;
	role: IntervalRole;
	midi: number;
}

const MARKER_BY_ROLE: Partial<Record<IntervalRole, string>> = {
	root: 'R',
	third: '3',
	fifth: '5',
	seventh: '7'
};

/** The octave the bass root is placed in: the on-screen keyboard's lowest octave. */
const SHELL_BASS_OCTAVE = 4;
/** The top key of the two-octave keyboard (C6). */
const BOARD_TOP_MIDI = 84;

/** Upper voices, low to high, for one position: the ♭5 (when present) always sits under the 7th. */
function upperOrder(shell: SpelledNote[], position: ShellPosition): SpelledNote[] {
	const third = shell.filter((note) => note.role === 'third');
	const fifth = shell.filter((note) => note.role === 'fifth');
	const seventh = shell.filter((note) => note.role === 'seventh');
	return position === 'third-low' ? [...third, ...fifth, ...seventh] : [...fifth, ...seventh, ...third];
}

/** Stacks `notes` strictly ascending from the bass octave, by sounding pitch (so C♭ and B♯ land on their real keys). */
function stack(notes: SpelledNote[]): VoicedShellNote[] {
	const voiced: VoicedShellNote[] = [];
	let floor = -1;
	for (const note of notes) {
		const ascii = toAsciiAccidentals(note.letter);
		let octave = SHELL_BASS_OCTAVE;
		let midi = Note.midi(`${ascii}${octave}`);
		if (midi === null) continue;
		while (midi <= floor) {
			octave += 1;
			midi = Note.midi(`${ascii}${octave}`) ?? midi + 12;
		}
		floor = midi;
		voiced.push({
			letter: note.letter,
			octave: Math.floor(midi / 12) - 1,
			marker: MARKER_BY_ROLE[note.role] ?? '',
			role: note.role,
			midi
		});
	}
	return voiced;
}

/**
 * The rooted shell voiced on the keyboard, bass first, in `position`. If that
 * position would run off the top of the two-octave board (a high root with
 * the 7th low), the other position is used instead and reported, so "Show me"
 * never points at a key that is not on screen. Total: an unrecognized chord
 * returns no notes.
 */
export function voiceRootedShell(
	chord: ChordResult,
	position: ShellPosition
): { position: ShellPosition; notes: VoicedShellNote[] } {
	const root = chord.notes.find((note) => note.role === 'root');
	if (!root) return { position, notes: [] };
	const shell = shellNotes(chord);
	const voiced = stack([root, ...upperOrder(shell, position)]);
	const top = voiced[voiced.length - 1];
	if (top && top.midi > BOARD_TOP_MIDI) {
		const other: ShellPosition = position === 'third-low' ? 'seventh-low' : 'third-low';
		return { position: other, notes: stack([root, ...upperOrder(shell, other)]) };
	}
	return { position, notes: voiced };
}

/**
 * The target's letter for each chroma in `chromas`, in the target's own
 * spelling (so "missing" copy names E♭, not D♯). A chroma the target does not
 * contain is skipped.
 */
export function lettersForChromas(target: ChordResult, chromas: number[]): string[] {
	const letters: string[] = [];
	for (const note of target.notes) {
		const chroma = chromaOf(note.letter);
		if (chroma !== undefined && chromas.includes(chroma)) letters.push(note.letter);
	}
	return letters;
}
