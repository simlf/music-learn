import { Note } from 'tonal';

/**
 * Pure voicing math for the audio engine: how spelled-note letters (display
 * glyphs, e.g. "B♭") become concrete Tone-ready pitches (ASCII, e.g. "Bb4").
 * Extracted from the original playChord.ts so it stays directly unit-testable
 * with zero audio mocking. No DOM, no Tone, no Svelte imports.
 */

/** Converts a display-glyph letter (e.g. "B♭", "F♯") into an ASCII pitch class. */
export function toAsciiPitchClass(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/** Octave the block-chord/root-position voicing starts from. */
const ROOT_POSITION_OCTAVE = 4;
/** Octave the comping voicing puts its bass root in (a tenth or so below the guide tones). */
const COMP_BASS_OCTAVE = 3;
/** Octave the comping voicing starts its upper (guide-tone) notes from. */
const COMP_UPPER_OCTAVE = 4;

/**
 * Shared ascending-assignment walk: from `startOctave`, each pitch class takes
 * the lowest octave whose SOUNDING midi (letter-based, matching Tone's
 * convention where Cb4 sounds B3 and B#4 sounds C5) rises above `floorMidi`
 * and then above each previously assigned note. Comparing chromas instead
 * would voice C♭/B♯ spellings an octave off: A♭m (A♭ C♭ E♭) must play
 * midi 68-71-75, not 68-59-75.
 */
function ascendFrom(notes: string[], startOctave: number, floorMidi: number): string[] {
	let octave = startOctave;
	let prevMidi = floorMidi;
	return notes.map((letter) => {
		const pitchClass = toAsciiPitchClass(letter);
		let midi = Note.midi(`${pitchClass}${octave}`) ?? 0;
		while (midi <= prevMidi) {
			octave += 1;
			midi = Note.midi(`${pitchClass}${octave}`) ?? midi + 12;
		}
		prevMidi = midi;
		return `${pitchClass}${octave}`;
	});
}

/**
 * Assigns ascending octaves to the given pitch classes so the chord sounds
 * in root position, matching the keyboard's ascending root-position voicing.
 */
export function toAscendingPitches(notes: string[]): string[] {
	return ascendFrom(notes, ROOT_POSITION_OCTAVE, -1);
}

/**
 * The comping voicing: the root alone down in octave 3, then `upper` (the
 * chord's guide tones) ascending from octave 4, each strictly above the bass.
 * This is the left-hand shell a jazz pianist actually comps with: the root
 * anchors the change so the harmony is followable, the guide tones say which
 * chord it is, and everything from roughly C5 up is left empty for the player
 * to improvise in.
 *
 * The bass is assigned through the same `ascendFrom` walk (rather than a bare
 * string concat) so a B♯ root still sounds where its letter says it does, and
 * the upper notes are floored at the bass's own sounding midi so the voicing
 * is strictly ascending even for a root that sounds high inside its octave.
 *
 * Total: a root tonal cannot turn into a pitch (empty string, garbage) is
 * dropped rather than emitted as a bogus pitch string, leaving a plain
 * root-position voicing of `upper`.
 */
export function toCompPitches(root: string, upper: string[]): string[] {
	const [bass] = ascendFrom([root], COMP_BASS_OCTAVE, -1);
	const bassMidi = bass === undefined ? null : Note.midi(bass);
	if (bass === undefined || bassMidi === null) return toAscendingPitches(upper);
	return [bass, ...ascendFrom(upper, COMP_UPPER_OCTAVE, bassMidi)];
}

/**
 * The highest a voice-led guide tone may climb before it drops an octave:
 * the top of the comp's register, above which belongs to the player. No
 * unled comp voicing reaches it (the highest, a 7th stacked over a 3rd from
 * B4, tops out at F♯5), so it only ever catches a line that has drifted up.
 */
const COMP_UPPER_CEILING = Note.midi('G5') as number;

/**
 * The lowest a voice-led guide tone may sink before it lifts an octave: the
 * bottom of the comp's register, the mirror of `COMP_UPPER_CEILING`. It is
 * the lowest guide tone any template bar reaches (Gm7's B♭3 in the minor
 * ii V i in G), so it only ever catches a song line that has drifted down
 * towards the bass, such as a chain of dominants falling by fifths.
 */
const COMP_LOWER_FLOOR = Note.midi('Bb3') as number;

/**
 * The comping voicing of a chord that FOLLOWS another one: the same bass
 * root in octave 3, but each guide tone goes to the octave nearest the
 * previous bar's guide tones (`previousUpper`, the upper pitches that bar
 * actually played) instead of being restacked from octave 4. That is voice
 * leading: a common tone stays on the very key it was on, and a 7th that
 * resolves lands a half or whole step below, not an octave and a step away.
 * Dm7 (D3 F4 C5) to G7 gives G3 F4 B4, and on to Cmaj7 gives C3 E4 B4.
 *
 * A guide tone that would land at or under the bass, or below
 * `COMP_LOWER_FLOOR`, goes up an octave, and one that drifts above
 * `COMP_UPPER_CEILING` comes down an octave (while it stays above the bass
 * and the floor), so a long song cannot walk the comp down into the root or
 * up into the player's register. Such a voice jumps, which is the honest
 * result: the loop's guide-tone reading measures the real pitches and names
 * no motion for it. The result is sorted low to high, like `toCompPitches`,
 * so a rolled chord still rises from the bass.
 *
 * Total: with no usable `previousUpper` (the first bar), or a root tonal
 * cannot pitch, this is exactly `toCompPitches`.
 */
export function toVoiceLedCompPitches(
	root: string,
	upper: string[],
	previousUpper: readonly string[]
): string[] {
	const previous = previousUpper
		.map((pitch) => Note.midi(pitch))
		.filter((midi): midi is number => midi !== null);
	const [bass] = ascendFrom([root], COMP_BASS_OCTAVE, -1);
	const bassMidi = bass === undefined ? null : Note.midi(bass);
	if (previous.length === 0 || bass === undefined || bassMidi === null) {
		return toCompPitches(root, upper);
	}
	const led = upper.map((letter) => {
		const pitchClass = toAsciiPitchClass(letter);
		let best: { octave: number; midi: number; distance: number } | null = null;
		for (let octave = COMP_BASS_OCTAVE - 1; octave <= COMP_UPPER_OCTAVE + 2; octave++) {
			const midi = Note.midi(`${pitchClass}${octave}`);
			if (midi === null) continue;
			const distance = Math.min(...previous.map((voice) => Math.abs(voice - midi)));
			if (best === null || distance < best.distance) best = { octave, midi, distance };
		}
		if (best === null) return null;
		let { octave, midi } = best;
		while (midi <= bassMidi || midi < COMP_LOWER_FLOOR) {
			octave += 1;
			midi += 12;
		}
		while (
			midi > COMP_UPPER_CEILING &&
			midi - 12 > bassMidi &&
			midi - 12 >= COMP_LOWER_FLOOR
		) {
			octave -= 1;
			midi -= 12;
		}
		return { pitch: `${pitchClass}${octave}`, midi };
	});
	if (led.some((note) => note === null)) return toCompPitches(root, upper);
	const voiced = (led as { pitch: string; midi: number }[]).sort((a, b) => a.midi - b.midi);
	return [bass, ...voiced.map((note) => note.pitch)];
}

/** Octave a melody note starts its search from when it sounds over a voiced chord. */
const MELODY_OCTAVE = 4;

/**
 * The pitch a single improvised note takes when it sounds OVER an already
 * voiced chord: the lowest octave of `letter` whose sounding midi rises above
 * every pitch in `below`, so it reads as a right-hand melody on top of the
 * left-hand voicing rather than as one more note buried inside it.
 *
 * Register is what makes an avoid note audible as an avoid note: F over a
 * comped Cmaj7 has to sit above the held E for the ear to hear the minor 9th
 * the theory names, so this always ascends past the voicing and never lands
 * inside it. An empty `below` gives the plain MELODY_OCTAVE placement.
 */
export function toMelodyPitch(letter: string, below: string[]): string {
	let floorMidi = -1;
	for (const pitch of below) {
		const midi = Note.midi(pitch);
		if (midi !== null && midi > floorMidi) floorMidi = midi;
	}
	const [pitch] = ascendFrom([letter], MELODY_OCTAVE, floorMidi);
	return pitch ?? `${toAsciiPitchClass(letter)}${MELODY_OCTAVE}`;
}

/**
 * Joins a key letter (display glyphs allowed) with an octave number into a
 * Tone-ready ASCII pitch, e.g. ("F♯", 5) -> "F#5". The on-screen keyboard
 * reports letter + octave; this is the single seam where they become a pitch.
 */
export function toPitch(letter: string, octave: number): string {
	return `${toAsciiPitchClass(letter)}${octave}`;
}
