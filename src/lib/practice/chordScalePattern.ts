import { toAsciiAccidentals } from '$lib/theory/interval';
import { compBarScale } from './compLoop';

/**
 * The Learn hub's chord-tones-vs-scale-tones concept lesson (PR #80 follow-up
 * 2, `.planning/design/improvisation.md`): a tiny editable Strudel pattern
 * replacing prose, so the distinction is heard, not only read, by
 * `ChordScaleConcept.svelte`.
 *
 * Fixed to Cmaj7 over C ionian, the app's own reference case (see
 * `guideTones.ts`'s `GUIDE_TONE_KEY` and `TheoryLessons.svelte`'s
 * `SCALE_LESSON_TONICS` for the same convention): every note in that scale is
 * a natural letter, so this module needs no accidental-spelling logic to stay
 * honest about what it renders.
 *
 * `compBarScale` is the SAME derivation the comping loop's SCALE overlay and
 * the Lookup board's improvisation guide use (never a second table), so this
 * concept lesson can never call a note a chord tone or a scale tone
 * differently than either of them.
 */
export const CHORD_SCALE_CONCEPT_SYMBOL = 'Cmaj7';

/** The octave the melodic line (chord tones, then the rest of the scale) plays at, above the chord's own voicing. */
const MELODY_OCTAVE = 5;

/** Cycles per minute: a 7-step cycle at this tempo lands each note under a second apart. */
const CONCEPT_CPM = 10;

/** The fixed demo's scale, tagged chord tone vs not. Null only if C ionian ever stopped resolving, which never happens. */
function conceptScale() {
	return compBarScale(CHORD_SCALE_CONCEPT_SYMBOL);
}

/** The chord's own notes and the scale's remaining notes, in ascending order, letters only (immune display values). */
export function chordScaleConceptLetters(): { chordTones: string[]; scaleTones: string[] } {
	const scale = conceptScale();
	if (!scale) return { chordTones: [], scaleTones: [] };
	return {
		chordTones: scale.notes.filter((note) => note.kind === 'chord-tone').map((note) => note.letter),
		scaleTones: scale.notes.filter((note) => note.kind !== 'chord-tone').map((note) => note.letter)
	};
}

/**
 * Renders the concept as an editable pattern: the chord held on one voice,
 * then its own chord tones, then the scale's remaining tones on a second
 * voice, chord tones and scale tones each on their own waveform (`triangle`
 * vs `sine`, both softer than `sawtooth`'s harsh buzz - see liveCode.ts) so
 * the ear tells them apart without reading anything. Bending a note in the melodic
 * line (swapping a scale tone for one outside the scale, or for a repeated
 * chord tone) is exactly how the lesson lets the player hear a clash or a
 * fit, per the design brief.
 *
 * Total: returns an empty string if the fixed symbol ever stopped resolving
 * to a scale (never happens for Cmaj7, but this module makes no exception).
 */
export function chordScaleConceptPattern(): string {
	const scale = conceptScale();
	if (!scale) return '';
	const { chordTones, scaleTones } = chordScaleConceptLetters();
	const ordered = [...chordTones, ...scaleTones];
	const pitches = ordered.map((letter) => `${letter.toLowerCase()}${MELODY_OCTAVE}`).join(' ');
	const sounds = [...chordTones.map(() => 'triangle'), ...scaleTones.map(() => 'sine')].join(' ');
	const symbol = toAsciiAccidentals(CHORD_SCALE_CONCEPT_SYMBOL);
	return [
		`setcpm(${CONCEPT_CPM})`,
		'stack(',
		`  chord("<${symbol}>").voicing().s("triangle"),`,
		`  note("${pitches}").s("${sounds}")`,
		')'
	].join('\n');
}
