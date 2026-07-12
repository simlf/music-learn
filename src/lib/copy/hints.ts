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

let lastIndex = -1;

/**
 * Picks a hint variant, avoiding an immediate repeat of the previous pick so
 * consecutive errors do not feel like a broken record (D-08).
 */
export function pickHint(): string {
	if (errorHints.length === 1) {
		lastIndex = 0;
		return errorHints[0];
	}

	let index = Math.floor(Math.random() * errorHints.length);
	while (index === lastIndex) {
		index = Math.floor(Math.random() * errorHints.length);
	}
	lastIndex = index;
	return errorHints[index];
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

let lastSuggestionIndex = -1;

/**
 * Picks a suggestion variant, avoiding an immediate repeat, mirroring
 * pickHint's anti-repeat logic exactly but tracked by its own independent
 * lastSuggestionIndex so the two rotations never cross-contaminate.
 */
export function pickSuggestionHint(): string {
	if (suggestionHints.length === 1) {
		lastSuggestionIndex = 0;
		return suggestionHints[0];
	}

	let index = Math.floor(Math.random() * suggestionHints.length);
	while (index === lastSuggestionIndex) {
		index = Math.floor(Math.random() * suggestionHints.length);
	}
	lastSuggestionIndex = index;
	return suggestionHints[index];
}
