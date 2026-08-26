import { spellChord } from '$lib/theory/chord';
import { shellNotes } from '$lib/practice/shellVoicing';
import { toCompPitches } from '$lib/audio/voicing';
import { buildProgression, PROGRESSION_TEMPLATES } from '$lib/practice/progressions';
import { improvGuideFor, type ChordScaleOption } from '$lib/theory/chordScale';
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
	/** Tone-ready ASCII pitches, root in the bass (see voicing.toCompPitches). */
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
 * Total: an unrecognized symbol, or one with no root, returns null and the
 * caller drops the bar rather than surfacing a malformed voicing.
 */
export function compVoicing(
	symbol: string
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
		pitches: toCompPitches(
			rootNote.letter,
			guides.map((note) => note.letter)
		)
	};
}

/**
 * The loop's bars for `templateId` in `key`, voiced for comping. Reuses
 * `buildProgression` verbatim (same 3 templates, same 12 keys, same
 * spellChord validation), then adds the voicing. Total: an unknown template
 * or key returns [], and any bar whose symbol will not voice is dropped
 * rather than surfaced.
 */
export function buildCompBars(templateId: string, key: string): CompBar[] {
	const bars: CompBar[] = [];
	for (const bar of buildProgression(templateId, key)) {
		const voicing = compVoicing(bar.symbol);
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
