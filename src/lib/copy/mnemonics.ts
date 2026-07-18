import { currentLocale } from '$lib/i18n/locale.svelte';

/**
 * Structural chord-quality mnemonics (Track D contract, R3-learning.md).
 *
 * Only the KEEP-rated hooks from R3 ship: each line is a structural insight
 * (triad + seventh construction, the half-step vs whole-step octave test, the
 * dom7 tritone engine, the m7b5 one-edit distance, dim7 symmetry, the ø vs °
 * notation key, the relative-major shortcut). Qualities without a genuinely
 * good hook return null. NEVER invent filler: better none than cheesy.
 *
 * Copy rules: no em dashes (D-05), display accidental glyphs (♭/♯) only,
 * short lines that read as one breath on a phone reveal card.
 */

const MNEMONICS: Record<string, string> = {
	// R3 #3: maj7 = major triad + 7 a half step under the octave; the
	// half-vs-whole check separates the most-confused pair (maj7 vs 7).
	maj7: 'Major triad, then a 7th a half step under the octave. A whole step under makes it a plain 7.',
	// R3 #4 + #8: minor triad + b7, plus the relative-major shortcut that
	// leverages this user's classical triad fluency.
	m7: 'Minor triad plus a ♭7. Shortcut: the major triad of the ♭3 over the root. Am7 is a C triad over A.',
	// R3 #2 + #6: major triad + b7 (whole step under the octave), and the
	// tritone between 3 and b7 that explains why V7 pulls home.
	'7': 'Major triad plus a ♭7, a whole step under the octave. The 3 and ♭7 form a tritone: that pull is the engine of the chord.',
	// R3 #7 + #10: one edit away from m7, and the ø vs ° notation key
	// (the "half" refers to the seventh).
	m7b5: 'An m7 with the 5 lowered a half step. The ø keeps a plain ♭7: only the full ° flattens the 7th again.',
	// R3 #9: stacked minor thirds; full symmetry collapses 12 chords into 3.
	dim7: 'Minor 3rds all the way up. Fully symmetric, so the twelve dim7 chords collapse into three sets of notes.'
};

/**
 * French variant record (I18N-02): same five KEEP-rated structural hooks,
 * same chord-symbol/glyph tokens preserved verbatim (Am7, C, ♭7, ♭3, ø, °),
 * French interval vocabulary for the descriptive prose.
 */
const MNEMONICS_FR: Record<string, string> = {
	maj7: "Triade majeure, puis une septième un demi-ton sous l'octave. Un ton entier sous l'octave donne un simple 7.",
	m7: "Triade mineure plus une ♭7. Raccourci : la triade majeure de la ♭3 sur la fondamentale. Am7 est une triade de C sur A.",
	'7': "Triade majeure plus une ♭7, un ton entier sous l'octave. La 3 et la ♭7 forment un triton : cette tension est le moteur de l'accord.",
	m7b5: "Un m7 avec la 5 abaissée d'un demi-ton. Le ø garde une simple ♭7 : seul le ° complet abaisse aussi la 7e.",
	dim7: "Des tierces mineures empilées jusqu'en haut. Entièrement symétrique, les douze accords dim7 se réduisent à trois ensembles de notes."
};

/**
 * Common notation aliases mapped onto the canonical v1 suffixes, mirroring
 * the glyph handling in spellChord's normalizeSymbol (ø -> m7b5) plus the
 * jazz-alias spellings tonal treats as equivalent. Kept tiny on purpose:
 * drill questions always use the canonical QUALITY_SUFFIXES, so this only
 * hardens lesson/lookup callers that may pass a raw suffix.
 */
const ALIASES: Record<string, string> = {
	'ø': 'm7b5',
	'ø7': 'm7b5',
	'°7': 'dim7',
	o7: 'dim7',
	M7: 'maj7',
	ma7: 'maj7',
	'Δ': 'maj7',
	'Δ7': 'maj7',
	'-7': 'm7',
	min7: 'm7'
};

/**
 * Returns the structural mnemonic for a chord-quality suffix (e.g. "m7",
 * "maj7", "ø7"), or null when no KEEP-rated hook exists for it. Total
 * function: unknown input never throws, it simply has no hook.
 */
export function mnemonicFor(qualitySuffix: string): string | null {
	const canonical = ALIASES[qualitySuffix] ?? qualitySuffix;
	const table = currentLocale() === 'fr' ? MNEMONICS_FR : MNEMONICS;
	return table[canonical] ?? null;
}
