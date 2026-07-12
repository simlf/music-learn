import { Chord } from 'tonal';

/**
 * Spells a jazz chord symbol into its ordered note names using proper
 * accidental glyphs (♯ ♭), not ASCII (#/b).
 *
 * This is the thinnest walking-skeleton slice: it wraps tonal's Chord.get()
 * directly. Full enharmonic correctness (e.g. F♯ø7 -> C♯ not D♭) and dual
 * letter/solfège naming are Plan 02's job.
 *
 * Pure function: no DOM, no audio, no Svelte imports, so later phases can
 * reuse it freely.
 */
export function spellChord(symbol: string): string[] {
	const chord = Chord.get(symbol);
	return chord.notes.map(toAccidentalGlyphs);
}

function toAccidentalGlyphs(note: string): string {
	return note.replace(/#/g, '♯').replace(/b/g, '♭');
}
