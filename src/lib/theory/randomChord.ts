/**
 * Random supported-chord picker (D-10). Draws from the exact 12-root x 8
 * v1-quality space proven correct by the reference chord matrix
 * (reference-chords.test.ts), so "surprise me" always renders a chord
 * spellChord recognizes - doubling as a manual engine-correctness spot-check.
 */

/**
 * The 12 roots used in the v1 reference chord matrix (ASCII form, spellChord
 * normalizes). Exported so didYouMean.ts can draw its candidate space from
 * this same proven set rather than redefining it.
 */
export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * The original 8 v1 chord-quality symbol suffixes (matches the reference
 * chord matrix). FROZEN: `facts.ts`'s catalog builds its original 96
 * chord-formula facts from exactly this list, in exactly this order, so
 * every existing FSRS card's factId and the catalog's own display-order pins
 * (facts.test.ts) stay byte-identical no matter how many more qualities
 * `QUALITY_SUFFIXES` grows to hold.
 */
export const V1_QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];

/**
 * The tier 5/6 quality suffixes unlocked once mastery-gated progression past
 * tier 4 became possible (n1-tier-unlock): every one of these was verified,
 * by executing the real engine across all 12 ROOTS, to spell correctly
 * (including the ugly double-accidental spellings), to survive the shell
 * voicing drill's `hasDrillableShell` guard or its "no shell, here's Next"
 * fallback, and - the binding constraint - to fit the construction ("build
 * it") drill's fixed 2-octave C4-C6 keyboard for every root.
 *
 * 9, maj9, m9 and 13 were drafted for tier 6 but held back: their extra
 * 9th/13th tone pushes the construction drill's ascending stack past the
 * board's top (C6) for at least one root - all of B9/Bmaj9/Bm9, and 8 of
 * 13's 12 roots - and unlike shellVoicing's `hasDrillableShell`,
 * construction.ts has no "can't fit on this board" guard or fallback screen,
 * so that chord would be a silently unplayable drill target. 7b9 and 7#5
 * stay within range on every root (verified) and keep the rest of tier 6's
 * "altered dominant color" theme.
 */
export const TIER_5_6_QUALITY_SUFFIXES = ['6', 'm6', 'sus4', '7sus4', '7b9', '7#5'];

/**
 * The full quality-suffix space randomChord/didYouMean/pickDistractors draw
 * from: V1's original 8 plus the tier 5/6 qualities unlocked above. Exported
 * so didYouMean.ts can draw its candidate space from this same proven set
 * rather than redefining it.
 */
export const QUALITY_SUFFIXES = [...V1_QUALITY_SUFFIXES, ...TIER_5_6_QUALITY_SUFFIXES];

/**
 * Returns a random chord symbol drawn from the supported root x quality
 * space, e.g. "F#m7" or "Bbdim7".
 */
export function randomChord(): string {
	const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const quality = QUALITY_SUFFIXES[Math.floor(Math.random() * QUALITY_SUFFIXES.length)];
	return `${root}${quality}`;
}
