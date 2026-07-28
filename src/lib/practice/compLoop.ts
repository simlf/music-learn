import { spellChord } from '$lib/theory/chord';
import { shellNotes } from '$lib/practice/shellVoicing';
import { toCompPitches } from '$lib/audio/voicing';
import { buildProgression, PROGRESSION_TEMPLATES } from '$lib/practice/progressions';
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
