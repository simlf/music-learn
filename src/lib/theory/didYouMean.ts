import { ROOTS, QUALITY_SUFFIXES } from './randomChord';

/**
 * "Did you mean" single-candidate suggestion heuristic (LOOK-01 error
 * experience). Draws its entire candidate space from the same proven 12-root
 * x 8-quality matrix as randomChord.ts, so any candidate it returns is
 * guaranteed to be a symbol spellChord recognizes (per
 * reference-chords.test.ts).
 *
 * Deliberately minimal per 02-CONTEXT.md's scope guard: case/root-capitalization
 * normalization plus single-character edit distance on the quality token. No
 * fuzzy-matching dependency, no multi-candidate ranking. Any ambiguity (zero
 * or multiple qualifying candidates) returns null rather than guessing, so
 * the caller falls back to the existing rotating hints.
 *
 * Contract: only ever called by the page on the UNRECOGNIZED branch (i.e.
 * spellChord already failed to parse the input). Calling it on an
 * already-recognized symbol is out of scope - the function may still return
 * a candidate, but the lookup page never invokes it for recognized input.
 *
 * Total function: never throws, regardless of input shape.
 */
export function didYouMean(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const rootMatch = extractRoot(trimmed);
	if (!rootMatch) {
		return null;
	}

	const { root, rest } = rootMatch;
	const candidateSuffix = closestQualitySuffix(rest);
	if (candidateSuffix === null) {
		return null;
	}

	return `${root}${candidateSuffix}`;
}

/**
 * Extracts a leading root token from the input, matching against the
 * supported ROOTS set. Normalizes glyph accidentals (♯/♭) to ASCII (#/b) and
 * uppercases the letter before comparing, but never invents a root that
 * is not in the supported set. Prefers a 2-character match (letter +
 * accidental) over a 1-character match so "F#" is not mistaken for "F".
 */
function extractRoot(input: string): { root: string; rest: string } | null {
	const asciiInput = input.replace(/♯/g, '#').replace(/♭/g, 'b');
	const letter = asciiInput[0]?.toUpperCase();
	if (!letter || !/[A-G]/.test(letter)) {
		return null;
	}

	const second = asciiInput[1];
	if (second === '#' || second === 'b') {
		const twoChar = `${letter}${second}`;
		if (ROOTS.includes(twoChar)) {
			return { root: twoChar, rest: asciiInput.slice(2) };
		}
	}

	if (ROOTS.includes(letter)) {
		return { root: letter, rest: asciiInput.slice(1) };
	}

	return null;
}

/**
 * Compares the remaining quality token against the 8 supported quality
 * suffixes using Levenshtein distance. Returns the single suffix within
 * distance <= 1, or null if zero or more than one suffix qualifies (an
 * ambiguous tie is never resolved by guessing).
 */
function closestQualitySuffix(qualityToken: string): string | null {
	const normalized = qualityToken.trim().toLowerCase();

	// An exact match always wins outright, even if another suffix also falls
	// within edit-distance 1 (e.g. "m7" exactly matches the m7 suffix, while
	// "7" is also distance 1 away - the exact match is never ambiguous).
	if (QUALITY_SUFFIXES.includes(normalized)) {
		return normalized;
	}

	const withinTolerance = QUALITY_SUFFIXES.filter(
		(suffix) => levenshteinDistance(normalized, suffix) <= 1
	);

	if (withinTolerance.length === 1) {
		return withinTolerance[0];
	}

	if (withinTolerance.length > 1) {
		// Among a tie, prefer a candidate that EXTENDS the typed token (the
		// typed token is a prefix of the candidate, i.e. the user is missing a
		// trailing character) over one that is merely a truncation of it -
		// e.g. typing "m7b" (missing the trailing "5") should resolve to the
		// longer "m7b5", not tie against the shorter "m7".
		const extensionCandidates = withinTolerance.filter((suffix) => suffix.startsWith(normalized));
		if (extensionCandidates.length === 1) {
			return extensionCandidates[0];
		}
		return null;
	}

	return null;
}

/** Minimal iterative Levenshtein edit distance (insert/delete/substitute), no dependency. */
function levenshteinDistance(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

	for (let i = 0; i < rows; i++) {
		distances[i][0] = i;
	}
	for (let j = 0; j < cols; j++) {
		distances[0][j] = j;
	}

	for (let i = 1; i < rows; i++) {
		for (let j = 1; j < cols; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			distances[i][j] = Math.min(
				distances[i - 1][j] + 1,
				distances[i][j - 1] + 1,
				distances[i - 1][j - 1] + cost
			);
		}
	}

	return distances[rows - 1][cols - 1];
}
