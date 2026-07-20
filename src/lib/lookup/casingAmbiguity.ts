import { spellChord } from '$lib/theory/chord';

/** The two candidate readings offered when a chord symbol's m/maj casing is ambiguous. */
export interface CasingAmbiguity {
	/** Normalized minor-reading symbol, e.g. "Am7". */
	minorSymbol: string;
	/** Normalized major-reading symbol, e.g. "Amaj7". */
	majorSymbol: string;
}

/**
 * Detects the narrow casing trap sketch 016-B targets (issue #14 point 4): a
 * bare `m`/`M` quality marker where the input's OWN casing (of the root
 * and/or the quality marker) is the only thing distinguishing a minor
 * reading from a major reading. tonal itself lowercases the root internally
 * ("am7" and "AM7" both resolve to tonic "A"), so from the engine's point of
 * view root case is irrelevant - but from the USER's point of view, typing a
 * lowercase root ("am7") or an uppercase quality marker ("AM7") is exactly
 * the mistake issue #14 reports, since the app's own canonical convention is
 * proper-case-root + lowercase-m for minor ("Am7", "Cm7"). Only that EXACT
 * canonical spelling is unambiguous; any other casing of a bare m/M marker
 * (lowercase root, uppercase marker, or both) is flagged.
 *
 * Returns `{ minorSymbol, majorSymbol }` for the genuinely ambiguous case, or
 * `null` for every unambiguous case: the canonical minor spelling itself,
 * spelled-out `maj`/`min`, non-third qualities (dim, ø, sus, dominant 7
 * alone, altered), or empty/unparseable input.
 *
 * Deliberately narrow per didYouMean.ts's sibling contract: total (never
 * throws), deterministic, null-on-no-match. Both candidates are always
 * guarded through spellChord so a returned pair is guaranteed to be two
 * recognized, genuinely different chords - the detector never nags with an
 * unrecognized "major" reading.
 */
export function detectCasingAmbiguity(input: string): CasingAmbiguity | null {
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const rootMatch = extractRoot(trimmed);
	if (!rootMatch) {
		return null;
	}

	const { root, rest, rawRootChars } = rootMatch;

	// The ambiguous case is EXACTLY a bare "m"/"M" or "m7"/"M7" quality marker
	// (case-insensitive match on the letter itself): the marker is the only
	// token distinguishing a minor reading from a major reading. Anything
	// else (spelled-out "maj7", "min7", "dim", "m7b5", a bare "7", "sus4",
	// ...) is unambiguous and must not nag.
	const restLower = rest.toLowerCase();
	if (restLower !== 'm' && restLower !== 'm7') {
		return null;
	}

	// The app's own canonical, unambiguous minor spelling is a proper-case
	// root followed by a lowercase "m"/"m7" - the EXACT as-typed string must
	// match the normalized proper-case root for this to count as "already
	// correct" (e.g. "Am7", "Cm7"). Any deviation (lowercase root "am7",
	// uppercase marker "AM7", or both) is the casing trap and gets flagged.
	const isCanonicalMinorSpelling = rawRootChars === root && rest === restLower;
	if (isCanonicalMinorSpelling) {
		return null;
	}

	const hasSeventh = restLower.endsWith('7');
	const minorSymbol = `${root}m${hasSeventh ? '7' : ''}`;
	const majorSymbol = `${root}maj${hasSeventh ? '7' : ''}`;

	// Guard both candidates through spellChord: only offer the pair when both
	// are genuinely recognized and differ in their third, per the detector's
	// total/never-nag-falsely contract.
	const minorChord = spellChord(minorSymbol);
	const majorChord = spellChord(majorSymbol);
	if (!minorChord.recognized || !majorChord.recognized) {
		return null;
	}
	const minorThird = minorChord.notes.find((note) => note.role === 'third');
	const majorThird = majorChord.notes.find((note) => note.role === 'third');
	if (!minorThird || !majorThird || minorThird.letter === majorThird.letter) {
		return null;
	}

	return { minorSymbol, majorSymbol };
}

/**
 * Extracts a leading root token (letter + optional accidental) from the
 * input, normalizing to proper case (uppercase letter; ASCII or glyph
 * accidental normalized to the glyph form for the returned `root`). Also
 * returns the root exactly as typed (`rawRootChars`, case preserved) so the
 * caller can detect whether the user already typed the canonical proper-case
 * root - tonal itself lowercases the root internally when parsing ("am7" and
 * "AM7" resolve identically on tonic), but the user-facing casing trap cares
 * about what was actually typed, not what tonal normalizes it to.
 */
function extractRoot(
	input: string
): { root: string; rest: string; rawRootChars: string } | null {
	const letter = input[0]?.toUpperCase();
	if (!letter || !/[A-G]/.test(letter)) {
		return null;
	}

	const second = input[1];
	const isAccidental = second === '#' || second === 'b' || second === '♯' || second === '♭';
	const accidentalGlyph =
		second === '#' || second === '♯' ? '♯' : second === 'b' || second === '♭' ? '♭' : '';

	if (isAccidental) {
		return {
			root: `${letter}${accidentalGlyph}`,
			rest: input.slice(2),
			rawRootChars: input.slice(0, 2)
		};
	}

	return { root: letter, rest: input.slice(1), rawRootChars: input.slice(0, 1) };
}
