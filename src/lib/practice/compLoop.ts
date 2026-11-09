import { Note } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import { shellNotes } from '$lib/practice/shellVoicing';
import { toVoiceLedCompPitches } from '$lib/audio/voicing';
import { buildProgression, PROGRESSION_TEMPLATES } from '$lib/practice/progressions';
import { improvGuideFor, type ChordScaleOption } from '$lib/theory/chordScale';
import { chromaOf, toAsciiAccidentals } from '$lib/theory/interval';
import type { SpelledNote } from '$lib/theory/types';

/**
 * Pure engine for the comping loop: the play-along companion on /learn where
 * the app comps a progression on repeat and the player improvises over it.
 *
 * This module owns the loop's VOICING and its FORM, never its clock and never
 * its audio: which chords a form produces in a key, and which notes each bar
 * comps. The clock (tempo range, tempo to duration, bar advance) lives in
 * `$lib/audio/loopTiming`, and Tone's Transport does the actual scheduling
 * (audio.ts's startCompLoop), because a setTimeout loop drifts audibly within
 * a few bars.
 *
 * Nothing here grades, scores, or schedules a review. Improvisation cannot be
 * graded, so the loop deliberately produces no answer event, no card, and no
 * mastery signal (see .planning/design/improvisation.md).
 *
 * Progressions come from the ONE existing source, `progressions.ts`
 * (3 templates x 12 keys); this module never invents a second progression
 * table. Pure: no DOM, no Svelte, no Tone, no storage.
 */

/** One bar of the loop: what it shows on screen, and what it actually strikes. */
export interface CompBar {
	index: number;
	/** Roman numeral of the degree, an immune display value (never translated). */
	roman: string;
	/** Full chord symbol, e.g. "Dm7". */
	symbol: string;
	/** Root letter with accidental glyph, for ChordGlyph. */
	root: string;
	/** Quality suffix, e.g. "m7", for ChordGlyph's superscript. */
	quality: string;
	/** Root + guide tones, interval-tagged, for the keyboard display. */
	notes: SpelledNote[];
	/**
	 * Tone-ready ASCII pitches, low to high, root in the bass: voice-led from
	 * the bar before (see voicing.toVoiceLedCompPitches), so these are the
	 * registers the loop really plays.
	 */
	pitches: string[];
}

/**
 * The comp voicing of one chord symbol: the root plus its guide tones.
 *
 * Guide tones come from `shellVoicing.shellNotes`, the app's single definition
 * of "the notes that carry the chord" (3rd + 7th, and the ♭5 too on a ♭5
 * chord, since there the fifth IS the symbol's identity). The root is added
 * BELOW them, in the bass, which is what makes this a comp rather than a
 * voicing exercise: without a root the player cannot hear which chord went
 * by, and the root is the cheapest possible anchor. Everything above the
 * guide tones is deliberately left empty.
 *
 * `previousUpper` is the guide-tone pitches the bar before actually played
 * (its `pitches` without the bass). With it, each guide tone is voice-led to
 * the octave nearest them, so a common tone holds on its key and a 7th
 * resolves by step; without it (a form's first bar), they stack up from
 * octave 4.
 *
 * Total: an unrecognized symbol, or one with no root, returns null and the
 * caller drops the bar rather than surfacing a malformed voicing.
 */
export function compVoicing(
	symbol: string,
	previousUpper: readonly string[] = []
): { root: string; notes: SpelledNote[]; pitches: string[] } | null {
	const chord = spellChord(symbol);
	if (!chord.recognized) return null;
	const rootNote = chord.notes.find((note) => note.role === 'root');
	if (!rootNote) return null;
	const guides = shellNotes(chord);
	if (guides.length === 0) return null;
	return {
		root: rootNote.letter,
		notes: [rootNote, ...guides],
		pitches: toVoiceLedCompPitches(
			rootNote.letter,
			guides.map((note) => note.letter),
			previousUpper
		)
	};
}

/**
 * The loop's bars for `templateId` in `key`, voiced for comping. Reuses
 * `buildProgression` verbatim (same 3 templates, same 12 keys, same
 * spellChord validation), then adds the voicing, each bar voice-led from
 * the one before it. Total: an unknown template
 * or key returns [], and any bar whose symbol will not voice is dropped
 * rather than surfaced.
 */
export function buildCompBars(templateId: string, key: string): CompBar[] {
	const bars: CompBar[] = [];
	for (const bar of buildProgression(templateId, key)) {
		const voicing = compVoicing(bar.symbol, bars.at(-1)?.pitches.slice(1));
		if (!voicing) continue;
		bars.push({
			index: bars.length,
			roman: bar.roman,
			symbol: bar.symbol,
			root: voicing.root,
			quality: bar.quality,
			notes: voicing.notes,
			pitches: voicing.pitches
		});
	}
	return bars;
}

/**
 * The loop's bars for an arbitrary ordered chord-symbol list - the
 * song-driven sibling of buildCompBars (proposal 2's "Play over it"): feed a
 * song's own `chordSymbols` through this instead of a template+key, and the
 * loop comps the tune's actual changes rather than a fixed ii-V-I/I-vi-ii-V/
 * minor-ii-V-i shape. Voices each symbol exactly the same way
 * (`compVoicing`, voice-led from the bar before) but carries no roman numeral or
 * diatonic function - a song's chords are not steps of a fixed template, so
 * `roman` is always ''.
 *
 * Total like buildCompBars: an unrecognized symbol, or one `compVoicing`
 * cannot voice, is dropped rather than surfaced, so one exotic chart chord
 * thins the loop instead of crashing it.
 */
export function barsFromSymbols(symbols: readonly string[]): CompBar[] {
	const bars: CompBar[] = [];
	for (const symbol of symbols) {
		const chord = spellChord(symbol);
		if (!chord.recognized) continue;
		const voicing = compVoicing(symbol, bars.at(-1)?.pitches.slice(1));
		if (!voicing) continue;
		const asciiRoot = toAsciiAccidentals(chord.root);
		const bodySymbol =
			chord.bass !== undefined ? chord.symbol.slice(0, chord.symbol.lastIndexOf('/')) : chord.symbol;
		const quality = bodySymbol.startsWith(asciiRoot) ? bodySymbol.slice(asciiRoot.length) : '';
		bars.push({
			index: bars.length,
			roman: '',
			symbol: chord.symbol,
			root: voicing.root,
			quality,
			notes: voicing.notes,
			pitches: voicing.pitches
		});
	}
	return bars;
}

/**
 * The roman-numeral shape of a template, e.g. "ii V I", used as the form
 * picker's own label. Roman numerals are immune display values: the shape is
 * assembled from the template's own degrees, never translated.
 */
export function romanShape(templateId: string): string {
	const template = PROGRESSION_TEMPLATES.find((entry) => entry.id === templateId);
	if (!template) return '';
	return template.degrees.map((degree) => degree.roman).join(' ');
}

/** The mode of a template, for the key banner's MAJOR/MINOR word. Defaults to major for an unknown id. */
export function templateMode(templateId: string): 'major' | 'minor' {
	return PROGRESSION_TEMPLATES.find((entry) => entry.id === templateId)?.mode ?? 'major';
}

/**
 * The scale to play over ONE bar of the loop (design doc
 * `.planning/design/improvisation.md` 4.3.2 and 5.2: the loop gains an
 * optional chord-scale reading of what it is already playing).
 *
 * No second engine: this is `improvGuideFor` on the bar's own symbol, exactly
 * the answer the Lookup improvisation board gives for that chord, so the two
 * surfaces can never disagree. The FIRST offered scale is the one taken,
 * which is the guide's own family default (mixolydian over a dominant, dorian
 * over a minor seventh); the loop deliberately does not offer the alternates,
 * because a picker that changes meaning every bar is not something a player
 * can use while both hands are busy.
 *
 * Total: null for any symbol the guide has no honest answer for, which
 * includes the diminished family (the guide returns no scale there on
 * purpose) and anything unrecognized. Every one of the loop's own 120 bars
 * returns a scale; the null path exists so a future caller passing arbitrary
 * symbols degrades to "no overlay" rather than to a wrong one.
 */
export function compBarScale(symbol: string): ChordScaleOption | null {
	const guide = improvGuideFor(spellChord(symbol));
	if (!guide) return null;
	return guide.scales[0] ?? null;
}

/** One guide-tone voice across a bar change: the note it left, the note it lands on, and how far it fell (0 = held). */
export interface CompGuideVoice {
	from: string;
	to: string;
	semitonesDown: number;
}

/**
 * The guide-tone reading of a bar change (improvisation.md 4.3.2), read off
 * the loop's OWN voicing: the outgoing 3rd going to the incoming 7th, then
 * the outgoing 7th going to the incoming 3rd, each held or falling, and by
 * how much (a minor V to i drops its 7th a whole step, so the step is
 * counted, never assumed). Measured on the PITCHES the loop strikes, not on
 * pitch classes: "F holds" means the same F key sounds again, and "falls a
 * half step" means the next key down, so the caption is what the learner
 * hears. Null for any change that does not move that way (I to vi, the form
 * wrapping round, a voice that jumped an octave, a bar without both guide
 * tones), so the loop never names a motion its own notes do not make.
 */
export function compBarGuideMotion(previous: CompBar, current: CompBar): CompGuideVoice[] | null {
	/** A guide tone of `bar` by role, with the midi its pitch sounds at (matched by chroma; the bass is skipped). */
	const voice = (bar: CompBar, wanted: 'third' | 'seventh') => {
		const note = bar.notes.find((entry) => entry.role === wanted);
		const chroma = note && chromaOf(note.letter);
		if (!note || chroma === undefined) return null;
		const pitch = bar.pitches.slice(1).find((entry) => Note.chroma(entry) === chroma);
		const midi = pitch === undefined ? null : Note.midi(pitch);
		return midi === null ? null : { letter: note.letter, midi };
	};
	const pairs = [
		[voice(previous, 'third'), voice(current, 'seventh')],
		[voice(previous, 'seventh'), voice(current, 'third')]
	];
	const voices: CompGuideVoice[] = [];
	for (const [from, to] of pairs) {
		if (!from || !to) return null;
		const semitonesDown = from.midi - to.midi;
		if (semitonesDown < 0 || semitonesDown > 2) return null;
		voices.push({ from: from.letter, to: to.letter, semitonesDown });
	}
	return voices;
}

/** One ghost-hatched key of the loop's scale overlay, shaped for PianoKeyboard's `ghostKeys`. */
export interface CompScaleGhost {
	/** Letter with accidental glyph, matched to a key by chroma. */
	letter: string;
	octave: number;
	/** The label the key carries: a tension ("9", "11", "13"...) or, for a chord tone, its interval shorthand ("R", "P5"). */
	marker: string;
	/** `'careful'` earns the vermilion bar; every other scale note is plain. */
	tone: 'plain' | 'careful';
}

/**
 * The WHOLE scale as ghost keys, one entry per requested octave.
 *
 * Every scale note is emitted, chord tones included, and nothing here
 * consults what the loop is striking: `PianoKeyboard` already suppresses the
 * hatch and the marker on any key it is role-filling (`ghostClass`/`ghostTone`
 * are gated on `!role`, and the marker CSS hangs off the ghost class), so a
 * comped key draws its interval fill alone and every other key carrying that
 * pitch class - the octave twin the comp did not reach - hatches as the scale
 * note it is. Filtering by pitch class here would take the hatch away in
 * BOTH octaves and leave an in-scale key reading as outside the scale.
 *
 * `'careful'` carries through to the vermilion bar the Lookup board taught,
 * so the visual grammar is the one already learned (design doc 5.5). The blue
 * note is deliberately absent: it belongs to a panel that can explain it, and
 * a bar lasts four beats.
 */
export function compScaleGhosts(
	scale: ChordScaleOption,
	octaves: readonly number[]
): CompScaleGhost[] {
	return scale.notes.flatMap((note) =>
		octaves.map((octave) => ({
			letter: note.letter,
			octave,
			marker: note.label,
			tone: (note.kind === 'careful' ? 'careful' : 'plain') as 'plain' | 'careful'
		}))
	);
}
