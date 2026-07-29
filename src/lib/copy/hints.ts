import { currentLocale } from '$lib/i18n/locale.svelte';

/**
 * Rotating error-hint copy for unrecognized chord symbols (D-08). Warm, witty
 * print-shop-owner voice (D-01/D-02/D-03): the shop admits it's stumped with
 * charm, never a rebuke. Uppercase mono register for the status bar, occasional
 * French winks (D-04), no em dashes anywhere (D-05).
 */
export const errorHints: string[] = [
	"HMM. THAT ONE'S NOT IN THE CATALOG. TRY Cm7 OR F♯ø7.",
	"THE SHOP IS STUMPED. GIVE US Cm7, C-7, OR B♭maj7 INSTEAD.",
	"NOT IN STOCK, MON AMI. TRY Cm7, G7, OR F♯ø7.",
	'THAT SYMBOL DID NOT PRINT. HOW ABOUT Fmaj7 OR Cm7?',
	"WE DO NOT CARRY THAT ONE YET. TRY Cm7, C-7, OR G7."
];

/**
 * French variant pool (I18N-02), same print-shop-clerk voice, same rotation
 * length, and the same embedded chord-symbol examples kept verbatim (chord
 * symbols never route through translation).
 */
export const errorHintsFr: string[] = [
	"HMM. CELUI-LÀ N'EST PAS AU CATALOGUE. ESSAYEZ Cm7 OU F♯ø7.",
	"LA BOUTIQUE SÈCHE. DONNEZ-NOUS Cm7, C-7 OU B♭maj7 À LA PLACE.",
	'PAS EN STOCK, MON AMI. ESSAYEZ Cm7, G7 OU F♯ø7.',
	"CE SYMBOLE N'A PAS IMPRIMÉ. ET Fmaj7 OU Cm7 ?",
	'ON NE FAIT PAS ENCORE CELUI-LÀ. ESSAYEZ Cm7, C-7 OU G7.'
];

let lastIndex = -1;

/**
 * Picks a hint variant from the current-locale pool, avoiding an immediate
 * repeat of the previous pick so consecutive errors do not feel like a
 * broken record (D-08). The anti-repeat index is shared across locales
 * (rotation state, not per-language state) - a locale switch mid-run just
 * means the next pick avoids the last index in whichever pool is now active.
 *
 * The anti-repeat step is ONE deterministic hop, not an unbounded redraw loop.
 * This used to re-roll `Math.random()` in a `while` until it differed from the
 * last pick, which is a rejection loop whose termination depends entirely on a
 * randomness source this module does not own: if `Math.random` ever returns a
 * constant, the loop never exits. That is not theoretical - it is the normal
 * shape of a deterministic test (`vi.spyOn(Math, 'random').mockReturnValue(x)`),
 * and it is exactly how the twin loop in copy/streak.ts hung, where a spun spy
 * also recorded every call so the hang surfaced as heap exhaustion in unrelated
 * test files rather than as an honest timeout. A single modular step keeps the
 * guarantee the loop existed for (with more than one line, the pick is never the
 * previous one) and always terminates.
 */
export function pickHint(): string {
	const pool = currentLocale() === 'fr' ? errorHintsFr : errorHints;

	if (pool.length === 1) {
		lastIndex = 0;
		return pool[0];
	}

	let index = Math.floor(Math.random() * pool.length);
	if (index === lastIndex) {
		index = (index + 1) % pool.length;
	}
	lastIndex = index;
	return pool[index];
}

/**
 * Rotating "did you mean" suggestion copy for LOOK-01's single-candidate
 * error recovery. Same warm, witty print-shop-clerk voice as errorHints
 * (uppercase mono, no em dashes), each variant embedding a {SYMBOL}
 * placeholder the caller substitutes with the didYouMean candidate before
 * rendering. Never plural, never multiple candidates.
 */
export const suggestionHints: string[] = [
	'NOT IN THE CATALOG. DID YOU MEAN {SYMBOL}?',
	'WE DO NOT STOCK THAT SPELLING. DID YOU MEAN {SYMBOL}?',
	'CLOSE, BUT NOT QUITE. DID YOU MEAN {SYMBOL}?'
];

/**
 * French variant pool (I18N-02): same voice, same {SYMBOL} placeholder token
 * preserved verbatim for the caller's substitution step.
 */
export const suggestionHintsFr: string[] = [
	"PAS AU CATALOGUE. VOUS VOULIEZ DIRE {SYMBOL} ?",
	"CETTE ORTHOGRAPHE N'EST PAS EN STOCK. VOUS VOULIEZ DIRE {SYMBOL} ?",
	'PRESQUE, MAIS PAS TOUT À FAIT. VOUS VOULIEZ DIRE {SYMBOL} ?'
];

let lastSuggestionIndex = -1;

/**
 * Picks a suggestion variant from the current-locale pool, avoiding an
 * immediate repeat, mirroring pickHint's anti-repeat logic exactly (the same
 * single deterministic modular hop, for the same reason - see pickHint) but
 * tracked by its own independent lastSuggestionIndex so the two rotations
 * never cross-contaminate.
 */
export function pickSuggestionHint(): string {
	const pool = currentLocale() === 'fr' ? suggestionHintsFr : suggestionHints;

	if (pool.length === 1) {
		lastSuggestionIndex = 0;
		return pool[0];
	}

	let index = Math.floor(Math.random() * pool.length);
	if (index === lastSuggestionIndex) {
		index = (index + 1) % pool.length;
	}
	lastSuggestionIndex = index;
	return pool[index];
}
