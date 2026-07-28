import { describe, expect, it } from 'vitest';
import { theory } from './theory';

/**
 * Copy gate for the theory dictionary (T5). This dictionary IS the app's
 * curriculum: roughly a third of all the theory prose the single user will
 * ever read lives here, so its house rules are worth asserting rather than
 * remembering. Content-level pedagogy assertions live next to the surface
 * that renders them (src/routes/learn.test.ts); this file guards the rules
 * that apply to every string in the domain regardless of which block it
 * belongs to.
 */

const EN_KEYS = Object.keys(theory.en);
const ALL_LINES = [...Object.values(theory.en), ...Object.values(theory.fr)];

describe('theory dictionary house rules (T5)', () => {
	it('has identical en and fr key sets', () => {
		expect(Object.keys(theory.fr).sort()).toEqual(EN_KEYS.sort());
	});

	it('contains no em or en dashes in any line, in either language', () => {
		for (const line of ALL_LINES) {
			expect(line).not.toMatch(/—|–/);
		}
	});

	/**
	 * `theory.page.subtitle` promised "Six short lessons" long after /theory
	 * became a 308 redirect to /learn, which renders a different number of
	 * blocks under its own subtitle. It was both dead and wrong. A lesson
	 * COUNT in copy rots every time a block is added or merged, so the key is
	 * gone and no replacement may state one.
	 */
	it('no longer ships the dead /theory page subtitle', () => {
		expect(EN_KEYS).not.toContain('theory.page.subtitle');
		expect(Object.keys(theory.fr)).not.toContain('theory.page.subtitle');
	});

	it('never promises a fixed number of lessons', () => {
		for (const line of ALL_LINES) {
			expect(line).not.toMatch(
				/\b(five|six|seven|eight|cinq|six|sept|huit)\s+(short\s+|courtes\s+)?(lessons|leçons)\b/i
			);
		}
	});

	/**
	 * The unit of interval size is "half steps" everywhere this branch owns
	 * copy. "Semitones" survives in drills.ts (CountingChipRow's legend) and
	 * home.ts (the inspect register), both owned elsewhere; this assertion
	 * keeps the theory prose from drifting back.
	 */
	it('measures interval size in half steps, never in semitones or piano keys', () => {
		for (const line of ALL_LINES) {
			expect(line).not.toMatch(/\bsemitones?\b/i);
			expect(line).not.toMatch(/\bkeys (up|above)\b/i);
			expect(line).not.toMatch(/\btouches? plus haut\b/i);
		}
	});

	/**
	 * The passages the pedagogy audit rated as the app's best work. They are
	 * load-bearing (the tritone mechanism, the ø-versus-° notation key, and
	 * the "chord symbol is two instructions" framing), and a future copy pass
	 * should not quietly dissolve them into vibes.
	 */
	it('keeps the tritone mechanism spelled out in the dominant lesson', () => {
		expect(theory.en['theory.dominant.body']).toContain('tritone');
		expect(theory.en['theory.dominant.body']).toContain('B leans up to C, F leans down to E');
		expect(theory.fr['theory.dominant.body']).toContain('triton');
		expect(theory.fr['theory.dominant.body']).toContain('B monte vers C, F descend vers E');
	});

	it('keeps the ø versus ° notation key on the seventh, not the fifth', () => {
		expect(theory.en['theory.diminished.body']).toContain('♭♭7');
		expect(theory.en['theory.diminished.body']).toContain('The half in the name is about the 7th');
		expect(theory.fr['theory.diminished.body']).toContain('♭♭7');
	});

	it('keeps the two-instructions framing of a chord symbol', () => {
		expect(theory.en['theory.symbol.body']).toContain('two instructions');
		expect(theory.fr['theory.symbol.body']).toContain('deux instructions');
	});

	/**
	 * A sibling branch is correcting a false claim in voicings.ts that called
	 * the 3rd-to-7th gap a tritone in general. It is a tritone only in
	 * dominant and fully diminished chords, so this domain must not repeat the
	 * error: every tritone mention here belongs to a dominant.
	 */
	it('only ever attributes the tritone to a dominant chord', () => {
		for (const [key, line] of Object.entries(theory.en)) {
			if (!line.includes('tritone')) continue;
			expect(key).toMatch(/dominant|function/);
		}
		for (const [key, line] of Object.entries(theory.fr)) {
			if (!line.includes('triton')) continue;
			expect(key).toMatch(/dominant|function/);
		}
	});
});
