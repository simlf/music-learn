/**
 * Per-item accuracy aggregation over raw answer events (D-02, PROG-02).
 *
 * Pure and framework-free, mirroring the client theory modules: takes the
 * raw AnswerRow[] substrate (never aggregates-only storage) and derives
 * per-(item, kind) attempts/accuracy plus a "weakest" shortlist. No
 * recency weighting in v1 - the raw events remain available for later
 * spaced-repetition work (v1.x) to reweight however it needs.
 */

import type { AnswerKind, AnswerRow } from './db.js';

export interface StatItem {
	item: string;
	kind: AnswerKind;
	attempts: number;
	accuracy: number;
	needsPractice: boolean;
}

/** An item needs extra practice only once it has enough data to be meaningful (UI-SPEC threshold). */
const ACCURACY_THRESHOLD = 0.7;

const MAX_WEAKEST = 5;

/**
 * Groups raw rows by (item, kind) into per-item accuracy stats, and derives
 * the worst-accuracy-first "weakest" shortlist (capped at 5, excluding items
 * below the minimum-attempts floor).
 */
export function computeStats(rows: AnswerRow[]): { items: StatItem[]; weakest: StatItem[] } {
	const groups = new Map<string, { item: string; kind: AnswerKind; correct: number; attempts: number }>();

	for (const row of rows) {
		const key = `${row.item}|${row.kind}`;
		const group = groups.get(key) ?? { item: row.item, kind: row.kind, correct: 0, attempts: 0 };
		group.attempts += 1;
		group.correct += row.correct ? 1 : 0;
		groups.set(key, group);
	}

	const items: StatItem[] = [...groups.values()]
		.map((group) => {
			const accuracy = group.correct / group.attempts;
			return {
				item: group.item,
				kind: group.kind,
				attempts: group.attempts,
				accuracy,
				needsPractice: group.attempts >= 3 && accuracy < ACCURACY_THRESHOLD
			};
		})
		.sort((a, b) => a.item.localeCompare(b.item) || a.kind.localeCompare(b.kind));

	const weakest: StatItem[] = items
		.filter((item) => item.needsPractice)
		.sort((a, b) => {
			if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
			if (a.attempts !== b.attempts) return b.attempts - a.attempts;
			return a.item.localeCompare(b.item);
		})
		.slice(0, MAX_WEAKEST);

	return { items, weakest };
}
