import { chromaOf, toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult, IntervalRole } from '$lib/theory/types';
import { TEMPO_DEFAULT, BEATS_PER_BAR } from '$lib/audio/loopTiming';
import { spellChord } from '$lib/theory/chord';
import { positionForBar, shellCycleBars, SHELL_CYCLE_KEYS } from './shellCycle';
import type { ProgressionBar } from './progressions';

/**
 * Pure engine for chapter 11, guide tones and voice leading (guided-path unit
 * 11, `.planning/design/improvisation.md` section 4, on the method-book
 * template): the major ii-V-I played as its two guide tones only, the 3rd
 * and the 7th, in all 12 keys around the cycle of fourths.
 *
 * It reuses chapter 15's cycle (`SHELL_CYCLE_KEYS.major`, `shellCycleBars`)
 * and the chord's own spelled 3rd and 7th, so no second key list or
 * progression table exists. Major only: the minor iiø-V-i's V-to-i fall is
 * a whole step (`guideTones.ts`), and this chapter's one idea is the half
 * step.
 *
 * What the exercise grades that chapter 15 does not is the MOTION. A pair is
 * right when its chroma set is exactly the chord's 3rd and 7th, and, from the
 * second chord of a key on, when it is SMOOTH: each of the two voices moved
 * at most a whole step from the pair played before it. Playing the right
 * letters with the hand jumping across the board is the thing the idea says
 * not to do, so it is not right. A whole-pair octave shift is forgiven: the
 * board is two octaves wide and a falling line eventually runs off its
 * bottom, so moving both fingers up an octave together is a register choice,
 * not a broken line.
 *
 * Pitches here are key positions on the board's own scale, `octave * 12 +
 * chroma`, the same score `matchInversion.lowestPlayedChroma` uses (B♯3
 * sits on the C4 key and so reports octave 4). Pure module: no DOM, no
 * Svelte, no audio, no storage.
 */

/** The cycle this chapter walks: chapter 15's major cycle of fourths, never a second list. */
export const GUIDE_TONE_CYCLE_KEYS: readonly string[] = SHELL_CYCLE_KEYS.major;

/** The major ii-V-I of `key`. Total: an unknown key yields []. */
export function guideToneCycleBars(key: string): ProgressionBar[] {
	return shellCycleBars('major', key);
}

/** The grading target: the chord's 3rd and 7th only, as a ChordResult. */
export function guideTonePair(chord: ChordResult): ChordResult {
	return {
		...chord,
		notes: chord.notes.filter((note) => note.role === 'third' || note.role === 'seventh')
	};
}

/** One key of a voiced guide-tone pair: spelled letter, the board octave its key sits in, and its 3/7 marker. */
export interface VoicedGuideTone {
	letter: string;
	octave: number;
	role: IntervalRole;
	marker: string;
	/** The key's position, `octave * 12 + chroma`. */
	pitch: number;
}

/** The two-octave board: C4 to B5, by key position. */
const BOARD_LOW = 4 * 12;
const BOARD_HIGH = 5 * 12 + 11;
/** The most a voice may move from one chord to the next and still be a line: a whole step. */
export const MAX_VOICE_STEP = 2;
/**
 * How far a key's ii V I can carry its lower voice down from the first pair:
 * one half step per change, two changes. A first pair whose lower note sits
 * closer than this to the board's floor starts an octave up, so the line
 * never has to leave the board.
 */
const LINE_FALL = 2;

function toVoiced(letter: string, role: IntervalRole, pitch: number): VoicedGuideTone {
	return { letter, role, marker: role === 'third' ? '3' : '7', pitch, octave: Math.floor(pitch / 12) };
}

/** Shifts a whole pair by octaves until every key is on the board (a pair spans less than an octave). */
function onBoard(voiced: VoicedGuideTone[]): VoicedGuideTone[] {
	let shift = 0;
	const low = Math.min(...voiced.map((note) => note.pitch));
	const high = Math.max(...voiced.map((note) => note.pitch));
	while (low + shift < BOARD_LOW) shift += 12;
	while (high + shift > BOARD_HIGH) shift -= 12;
	return voiced.map((note) => toVoiced(note.letter, note.role, note.pitch + shift));
}

/**
 * The pair voiced on the board. With no `previous` pair (the first chord of
 * a key), it is stacked from C4 in the cycle's alternation (`positionForBar`:
 * the ii with the 3rd low, the V with the 7th low, the I with the 3rd low
 * again), an octave up when its lower note is too near C4 for the line to
 * fall from it (`LINE_FALL`), so the whole ii V I that follows stays on the
 * board without an octave shift. With a `previous` pair, each guide tone goes to the key nearest the
 * previous pair, which is where a held note stays and a falling note lands,
 * so "Show me" always shows the move from what was just played. Either way
 * the pair is kept on the two-octave board. Total: a chord without both guide
 * tones yields [].
 */
export function voiceGuideTones(
	chord: ChordResult,
	barIndex: number,
	previous: readonly number[] | null
): VoicedGuideTone[] {
	const third = chord.notes.find((note) => note.role === 'third');
	const seventh = chord.notes.find((note) => note.role === 'seventh');
	const thirdChroma = third ? chromaOf(third.letter) : undefined;
	const seventhChroma = seventh ? chromaOf(seventh.letter) : undefined;
	if (!third || !seventh || thirdChroma === undefined || seventhChroma === undefined) return [];

	if (!previous || previous.length === 0) {
		const lowFirst = positionForBar(barIndex) === 'third-low';
		const [lowNote, lowChroma, highNote, highChroma] = lowFirst
			? [third, thirdChroma, seventh, seventhChroma]
			: [seventh, seventhChroma, third, thirdChroma];
		const lowPitch = BOARD_LOW + lowChroma + (lowChroma < LINE_FALL ? 12 : 0);
		let highPitch = lowPitch - lowChroma + highChroma;
		while (highPitch <= lowPitch) highPitch += 12;
		return onBoard([
			toVoiced(lowNote.letter, lowNote.role, lowPitch),
			toVoiced(highNote.letter, highNote.role, highPitch)
		]);
	}

	const nearest = (chroma: number): number => {
		let best = BOARD_LOW + chroma;
		let bestDistance = Infinity;
		for (let pitch = BOARD_LOW - 12 + chroma; pitch <= BOARD_HIGH + 12; pitch += 12) {
			const distance = Math.min(...previous.map((voice) => Math.abs(voice - pitch)));
			if (distance < bestDistance) {
				best = pitch;
				bestDistance = distance;
			}
		}
		return best;
	};
	const voiced = [
		toVoiced(third.letter, third.role, nearest(thirdChroma)),
		toVoiced(seventh.letter, seventh.role, nearest(seventhChroma))
	].sort((a, b) => a.pitch - b.pitch);
	return onBoard(voiced);
}

/**
 * Whether `played` continues the line from `previous`: with both pairs
 * sorted low to high, each voice moved at most `MAX_VOICE_STEP` half steps,
 * allowing one whole-pair octave shift either way. Total: pairs of any other
 * size are never smooth.
 */
export function isSmoothMove(previous: readonly number[], played: readonly number[]): boolean {
	if (previous.length !== 2 || played.length !== 2) return false;
	const [p0, p1] = [...previous].sort((a, b) => a - b);
	const [q0, q1] = [...played].sort((a, b) => a - b);
	return [-12, 0, 12].some(
		(shift) => Math.abs(q0 + shift - p0) <= MAX_VOICE_STEP && Math.abs(q1 + shift - p1) <= MAX_VOICE_STEP
	);
}

export interface GuideToneGrade {
	/** The played chroma set is exactly the 3rd and the 7th. */
	notesCorrect: boolean;
	/** Target chromas not played. */
	missing: number[];
	/** Played chromas that are not a guide tone (an unresolvable letter counts as -1). */
	extra: number[];
	/** The notes are right and the pair continues the line from `previous` (always true with no previous pair). */
	smooth: boolean;
}

/**
 * Grades a play: `played` is each pressed key's position. The notes must be
 * the chord's 3rd and 7th and nothing else, each once; then, if a previous
 * pair exists in this key, the move must be smooth (`isSmoothMove`).
 */
export function gradeGuideTones(
	played: readonly number[],
	chord: ChordResult,
	previous: readonly number[] | null
): GuideToneGrade {
	const target = guideTonePair(chord)
		.notes.map((note) => chromaOf(note.letter))
		.filter((chroma): chroma is number => chroma !== undefined);
	const playedChromas = played.map((pitch) => (pitch < 0 ? -1 : pitch % 12));
	const missing = target.filter((chroma) => !playedChromas.includes(chroma));
	const extra = [...new Set(playedChromas.filter((chroma) => !target.includes(chroma)))];
	const notesCorrect = target.length === 2 && missing.length === 0 && extra.length === 0 && played.length === 2;
	const smooth = notesCorrect && (previous === null || isSmoothMove(previous, played));
	return { notesCorrect, missing, extra, smooth };
}

/** One line of the pattern: the voice's spelled letters, bar by bar, with the octave each sounds in. */
export interface GuideToneLine {
	notes: { letter: string; octave: number }[];
}

/**
 * The ii-V-I of `key` as two lines, upper and lower: the Show me voicing
 * chained bar to bar from the ii, so each line only holds or falls. The
 * octave is the SOUNDING octave (C♭5 is written C♭5 even though it sits on
 * the B4 key), which is what Strudel's note names need. Total: an unknown
 * key yields two empty lines.
 */
export function guideToneLines(key: string): { upper: GuideToneLine; lower: GuideToneLine } {
	const upper: GuideToneLine = { notes: [] };
	const lower: GuideToneLine = { notes: [] };
	let previous: number[] | null = null;
	guideToneCycleBars(key).forEach((bar, index) => {
		const voiced = voiceGuideTones(spellChord(bar.symbol), index, previous);
		if (voiced.length !== 2) return;
		previous = voiced.map((note) => note.pitch);
		[lower.notes, upper.notes].forEach((line, voice) => {
			line.push({ letter: voiced[voice].letter, octave: soundingOctave(voiced[voice]) });
		});
	});
	return { upper, lower };
}

/**
 * The octave a voiced key's NOTE is written in. A B♯ on the C4 key is B♯3;
 * a C♭ on the B4 key is C♭5. The board reports the key; Strudel wants the
 * note.
 */
function soundingOctave(note: VoicedGuideTone): number {
	const natural = chromaOf(note.letter.charAt(0));
	const chroma = chromaOf(note.letter);
	if (natural === undefined || chroma === undefined) return note.octave;
	// A flat that wraps below C (C♭) or a sharp that wraps above B (B♯).
	if (chroma - natural > 6) return note.octave + 1;
	if (natural - chroma > 6) return note.octave - 1;
	return note.octave;
}

/** The octave the roots line plays in, under the guide tones. */
const ROOT_OCTAVE = 3;

/**
 * The editable Strudel pattern for `key`'s ii-V-I: one `note(...)` line per
 * voice, upper guide-tone line, lower guide-tone line, then the roots, each
 * on its own line of the stack so a player can delete or mute one and hear
 * what is left. `<...>` alternates once per cycle and one cycle is one bar,
 * so `setcpm(bpm / 4)` lands it at the comping loop's default tempo (see
 * `liveCode.ts`). Only synthesized waveforms (`triangle`, `sine`), never a
 * sample name, so it plays offline. Total: an unknown key returns ''.
 */
export function guideTonePattern(key: string, bpm: number = TEMPO_DEFAULT): string {
	const { upper, lower } = guideToneLines(key);
	const bars = guideToneCycleBars(key);
	if (upper.notes.length === 0 || upper.notes.length !== bars.length) return '';
	const toStrudel = (note: { letter: string; octave: number }) =>
		`${toAsciiAccidentals(note.letter).toLowerCase()}${note.octave}`;
	const roots = bars.map((bar) => toStrudel({ letter: spellChord(bar.symbol).root, octave: ROOT_OCTAVE }));
	const cpm = Math.round((bpm / BEATS_PER_BAR) * 100) / 100;
	return [
		`setcpm(${cpm})`,
		'stack(',
		`  note("<${upper.notes.map(toStrudel).join(' ')}>").s("triangle"),`,
		`  note("<${lower.notes.map(toStrudel).join(' ')}>").s("triangle"),`,
		`  note("<${roots.join(' ')}>").s("sine").gain(0.6)`,
		')'
	].join('\n');
}
