/**
 * Random supported-chord picker (D-10). Draws from the exact 12-root x 8
 * v1-quality space proven correct by the reference chord matrix
 * (reference-chords.test.ts), so "surprise me" always renders a chord
 * spellChord recognizes - doubling as a manual engine-correctness spot-check.
 */

/** The 12 roots used in the v1 reference chord matrix (ASCII form, spellChord normalizes). */
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** The 8 v1 chord-quality symbol suffixes (matches the reference chord matrix). */
const QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];

/**
 * Returns a random chord symbol drawn from the supported root x quality
 * space, e.g. "F#m7" or "Bbdim7".
 */
export function randomChord(): string {
	const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const quality = QUALITY_SUFFIXES[Math.floor(Math.random() * QUALITY_SUFFIXES.length)];
	return `${root}${quality}`;
}
