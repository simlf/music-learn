/**
 * Sketch 006 (interval song hooks, winner A: inline tap-to-reveal): a fixed,
 * vetted ascending-interval-to-famous-tune table for ear-training. Keyed by
 * the app's interval `short` codes (see interval.ts's IntervalInfo.short).
 *
 * This table is locked by the sketch's design decision and must not be
 * extended with other associations; unknown shorts (including unison "R"
 * and non-drill intervals like "d5") intentionally return null so callers
 * can render nothing rather than guess.
 */
const SONG_HOOKS: Record<string, string> = {
	m2: 'the Jaws theme',
	M2: 'Happy Birthday, first two notes',
	m3: 'Greensleeves, opening',
	M3: 'When the Saints Go Marching In',
	P4: 'Here Comes the Bride',
	A4: 'The Simpsons theme, first two notes',
	P5: 'Twinkle Twinkle Little Star, first two notes',
	m6: 'the theme from Love Story',
	M6: 'My Bonnie Lies Over the Ocean',
	m7: 'Somewhere, from West Side Story',
	M7: 'Take On Me, the chorus leap',
	P8: 'Somewhere Over the Rainbow'
};

/** The vetted famous-tune hook for an interval short, or null if none exists. */
export function songHookFor(short: string): string | null {
	return SONG_HOOKS[short] ?? null;
}
