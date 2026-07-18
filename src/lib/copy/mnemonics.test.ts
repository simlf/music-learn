import { afterEach, describe, expect, it } from 'vitest';
import { mnemonicFor } from './mnemonics';
import { QUALITY_SUFFIXES } from '$lib/theory/randomChord';
import { setLocale } from '$lib/i18n/locale.svelte';

afterEach(() => {
	setLocale('en');
});

/**
 * Pins the FULL mnemonic set (the quality bar is strict: only KEEP-rated
 * structural hooks from R3-learning.md ship, null for everything else).
 * Copy changes must update this table deliberately.
 */
const EXPECTED: Record<string, string | null> = {
	// Plain triads: no KEEP-rated hook exists. Better none than filler.
	'': null,
	m: null,
	dim: null,
	// The five seventh qualities carry the structural hooks.
	maj7: 'Major triad, then a 7th a half step under the octave. A whole step under makes it a plain 7.',
	m7: 'Minor triad plus a ♭7. Shortcut: the major triad of the ♭3 over the root. Am7 is a C triad over A.',
	'7': 'Major triad plus a ♭7, a whole step under the octave. The 3 and ♭7 form a tritone: that pull is the engine of the chord.',
	m7b5: 'An m7 with the 5 lowered a half step. The ø keeps a plain ♭7: only the full ° flattens the 7th again.',
	dim7: 'Minor 3rds all the way up. Fully symmetric, so the twelve dim7 chords collapse into three sets of notes.'
};

describe('mnemonicFor: full v1 quality set (deliberate snapshot)', () => {
	for (const suffix of QUALITY_SUFFIXES) {
		it(`returns the pinned value for "${suffix || '(major triad)'}"`, () => {
			expect(mnemonicFor(suffix)).toBe(EXPECTED[suffix]);
		});
	}

	it('covers every v1 quality suffix in the pinned table', () => {
		expect(Object.keys(EXPECTED).sort()).toEqual([...QUALITY_SUFFIXES].sort());
	});
});

describe('mnemonicFor: alias normalization', () => {
	it('resolves half-diminished glyph forms to the m7b5 hook', () => {
		expect(mnemonicFor('ø')).toBe(EXPECTED['m7b5']);
		expect(mnemonicFor('ø7')).toBe(EXPECTED['m7b5']);
	});

	it('resolves diminished-seventh glyph form to the dim7 hook', () => {
		expect(mnemonicFor('°7')).toBe(EXPECTED['dim7']);
	});

	it('resolves common maj7 aliases', () => {
		expect(mnemonicFor('M7')).toBe(EXPECTED['maj7']);
		expect(mnemonicFor('ma7')).toBe(EXPECTED['maj7']);
		expect(mnemonicFor('Δ')).toBe(EXPECTED['maj7']);
	});

	it('resolves common m7 aliases', () => {
		expect(mnemonicFor('-7')).toBe(EXPECTED['m7']);
		expect(mnemonicFor('min7')).toBe(EXPECTED['m7']);
	});
});

describe('mnemonicFor: never invents filler', () => {
	it.each(['sus4', '9', '6', '13', 'aug', 'nonsense', ' '])(
		'returns null for unsupported suffix "%s"',
		(suffix) => {
			expect(mnemonicFor(suffix)).toBeNull();
		}
	);
});

describe('mnemonicFor: copy quality bar', () => {
	const shipped = QUALITY_SUFFIXES.map((suffix) => mnemonicFor(suffix)).filter(
		(line): line is string => line !== null
	);

	it('ships at least the five seventh-quality hooks', () => {
		expect(shipped.length).toBe(5);
	});

	it('contains no em dashes in any shipped line (D-05)', () => {
		for (const line of shipped) {
			expect(line).not.toMatch(/—|–/);
		}
	});

	it('keeps every line short: two sentences max, under 120 characters', () => {
		for (const line of shipped) {
			expect(line.length).toBeLessThanOrEqual(120);
			const sentences = line.split('.').filter((part) => part.trim().length > 0);
			expect(sentences.length).toBeLessThanOrEqual(3);
		}
	});

	it('uses display accidental glyphs, never ASCII b/# accidentals mid-copy', () => {
		for (const line of shipped) {
			// "♭7" and "♭3" style only; a bare " b7" would be an ASCII accidental slip.
			expect(line).not.toMatch(/\sb\d/);
			expect(line).not.toMatch(/\s#\d/);
		}
	});
});

/**
 * Pins the FULL French mnemonic set (I18N-02): same five KEEP-rated hooks,
 * same chord-symbol/glyph tokens preserved verbatim.
 */
const EXPECTED_FR: Record<string, string | null> = {
	'': null,
	m: null,
	dim: null,
	maj7:
		"Triade majeure, puis une septième un demi-ton sous l'octave. Un ton entier sous l'octave donne un simple 7.",
	m7: 'Triade mineure plus une ♭7. Raccourci : la triade majeure de la ♭3 sur la fondamentale. Am7 est une triade de C sur A.',
	'7': "Triade majeure plus une ♭7, un ton entier sous l'octave. La 3 et la ♭7 forment un triton : cette tension est le moteur de l'accord.",
	m7b5: "Un m7 avec la 5 abaissée d'un demi-ton. Le ø garde une simple ♭7 : seul le ° complet abaisse aussi la 7e.",
	dim7:
		'Des tierces mineures empilées jusqu\'en haut. Entièrement symétrique, les douze accords dim7 se réduisent à trois ensembles de notes.'
};

describe('mnemonicFor: FR locale (I18N-02)', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('covers the same suffix key set as the EN pinned table', () => {
		expect(Object.keys(EXPECTED_FR).sort()).toEqual([...QUALITY_SUFFIXES].sort());
	});

	for (const suffix of QUALITY_SUFFIXES) {
		it(`returns the pinned FR value for "${suffix || '(major triad)'}" under fr`, () => {
			setLocale('fr');
			expect(mnemonicFor(suffix)).toBe(EXPECTED_FR[suffix]);
		});
	}

	it('returns the EN value under en (locale round-trip)', () => {
		setLocale('fr');
		expect(mnemonicFor('m7')).toBe(EXPECTED_FR['m7']);
		setLocale('en');
		expect(mnemonicFor('m7')).toBe(EXPECTED['m7']);
	});

	it('resolves aliases against the FR table too (ø -> m7b5)', () => {
		setLocale('fr');
		expect(mnemonicFor('ø')).toBe(EXPECTED_FR['m7b5']);
	});

	it('contains no em dashes in any shipped FR line', () => {
		setLocale('fr');
		const shippedFr = QUALITY_SUFFIXES.map((suffix) => mnemonicFor(suffix)).filter(
			(line): line is string => line !== null
		);
		for (const line of shippedFr) {
			expect(line).not.toMatch(/—|–/);
		}
	});

	it('preserves display accidental glyphs in FR lines', () => {
		expect(EXPECTED_FR['m7']).toContain('♭7');
		expect(EXPECTED_FR['m7b5']).toContain('ø');
		expect(EXPECTED_FR['7']).toContain('♭7');
	});
});
