/**
 * Scaffolding state for above-tier song chords (R3 section 3): song chords
 * bypass the tier gate through a fading ladder tracked per symbol.
 *
 *   exposures 0-1  -> formula-first (worked example, assisted)
 *   exposures 2+   -> hinted (identification MC, or construction with a
 *                     Show formula tap; taking the hint marks assisted)
 *   5 cold correct constructions -> graduated (normal item)
 *
 * Pure transition functions plus the standard defensive localStorage module
 * ("music-learn:scaffolds"). Assisted answers are marked by the session and
 * excluded from unlock stats in levelState (invariant stated in R3).
 */

import { splitSymbol } from './tiers';

export const SCAFFOLDS_KEY = 'music-learn:scaffolds';

/** First 2 exposures are formula-first worked examples (R3 MixConfig). */
export const FORMULA_FIRST_EXPOSURES = 2;

/** Cold correct constructions needed to graduate to a normal item (R3 MixConfig). */
export const SCAFFOLD_GRADUATION = 5;

export interface ScaffoldState {
	symbol: string;
	/** Times a scaffolded question for this symbol was served and graded. */
	exposures: number;
	coldCorrectConstructions: number;
}

export type ScaffoldStage = 'formula-first' | 'hinted' | 'graduated';

/** The ladder stage a symbol's next question enters at. Unseen symbols start formula-first. */
export function stageFor(state: ScaffoldState | undefined): ScaffoldStage {
	if (state === undefined) return 'formula-first';
	if (state.coldCorrectConstructions >= SCAFFOLD_GRADUATION) return 'graduated';
	if (state.exposures < FORMULA_FIRST_EXPOSURES) return 'formula-first';
	return 'hinted';
}

/**
 * Applies one graded answer to a scaffold state. Every answer counts as an
 * exposure; only cold (unassisted) correct CONSTRUCTIONS move the symbol
 * toward graduation, because unlock-grade retrieval is what graduation
 * measures.
 */
export function recordScaffoldAnswer(
	state: ScaffoldState,
	answer: { correct: boolean; assisted: boolean; kind: 'construction' | 'identification' }
): ScaffoldState {
	const coldCorrectConstruction = answer.correct && !answer.assisted && answer.kind === 'construction';
	return {
		...state,
		exposures: state.exposures + 1,
		coldCorrectConstructions: state.coldCorrectConstructions + (coldCorrectConstruction ? 1 : 0)
	};
}

function isScaffoldState(value: unknown): value is ScaffoldState {
	if (typeof value !== 'object' || value === null) return false;
	const state = value as Record<string, unknown>;
	return (
		typeof state.symbol === 'string' &&
		typeof state.exposures === 'number' &&
		typeof state.coldCorrectConstructions === 'number'
	);
}

/** Reads all scaffold states keyed by symbol; corrupt storage resets to {}. */
export function readScaffolds(): Record<string, ScaffoldState> {
	try {
		const raw = localStorage.getItem(SCAFFOLDS_KEY);
		if (raw === null) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const result: Record<string, ScaffoldState> = {};
		for (const [symbol, state] of Object.entries(parsed)) {
			if (isScaffoldState(state)) result[symbol] = state;
		}
		return result;
	} catch {
		return {};
	}
}

/** Upserts one symbol's scaffold state; write failures degrade to a no-op. */
export function writeScaffold(state: ScaffoldState): void {
	const scaffolds = readScaffolds();
	scaffolds[state.symbol] = state;
	try {
		localStorage.setItem(SCAFFOLDS_KEY, JSON.stringify(scaffolds));
	} catch {
		// Storage disabled or full: scaffolding degrades to session-only.
	}
}

/**
 * Distinct qualities currently IN scaffolding: started (>= 1 exposure) and
 * not yet graduated. The pool's overwhelm guard allows at most 2 of these at
 * once (R3: maxScaffoldingQualities).
 */
export function activeScaffoldQualities(scaffolds: Record<string, ScaffoldState>): string[] {
	const qualities = new Set<string>();
	for (const state of Object.values(scaffolds)) {
		if (state.exposures === 0) continue;
		if (stageFor(state) === 'graduated') continue;
		const split = splitSymbol(state.symbol);
		if (split) qualities.add(split.quality);
	}
	return [...qualities];
}
