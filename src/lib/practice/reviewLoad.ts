import { getDueCards, introduceNewCards, type CardRecord } from '$lib/srs/deck';
import {
	remainingIntroBudget,
	consumeIntroBudget,
	trickleSpentToday,
	consumeTrickle
} from '$lib/srs/introBudget';
import { factById } from '$lib/srs/facts';
import { symbolHasProvenance } from './songProvenance';
import { DUE_BACKLOG_GATE_FACTS, backlogFactCount } from './practiceQueue';

/**
 * Y1 consolidation: the shared review-loading machinery that `/practice` and
 * `RecallSession` used to each keep their own byte-faithful copy of.
 *
 * `/practice`'s own comments used to say it mirrored RecallSession
 * "verbatim" for this load skeleton and "byte-faithful" for the song filter -
 * a kill-list audit traced that duplication (plus the shared daily intro
 * budget and a units bug that survived in one copy because there were two of
 * them, c55b1d8) to a defect: two engines fighting over one deck. This module
 * is the fix for the "two copies in sync by hand" half of that: one place
 * to read, one place to test.
 *
 * `/practice` is now the ONE place that calls `introduceNewCards`
 * (Y1-CONSOLIDATION): it is the PWA `start_url`, carries the due badge, and
 * owns the bounded daily session, so it is the surface that should decide
 * when new material enters the deck. `RecallSession` still reads and grades
 * the same deck (self-grading buttons, confidence dots, and the hint-ladder
 * ear flow are all preserved), it just never introduces - see
 * `getDueCardsOnly` below, which is what it calls instead of
 * `loadDueWithIntroduction`.
 */

/**
 * How many new facts a day still gets while the due backlog is over
 * `DUE_BACKLOG_GATE_FACTS` (ml-practice-variety, C3).
 *
 * The gate used to switch intake OFF while the backlog was over it, and a
 * one-round-a-day user's backlog is over it most days: simulated, a fresh
 * deck met new material on 9 of 60 days and its first seventh chord on day 57,
 * and an established deck (every tier 1-4 chord already introduced) cleared
 * its backlog by about 0.6 facts a day and so never saw anything new at all.
 * The same handful of chords, forever. One fact a day is the smallest
 * guaranteed trickle: there is always something new, and it costs a chord
 * fact's three teach cards (asked one per round) rather than a full
 * ten-fact batch the backlog cannot absorb.
 */
export const BACKLOG_TRICKLE_FACTS = 1;

/**
 * The due-card load pipeline (BACKLOG-1/T13's gate, relocated rather than
 * re-derived): fetches the current due set, tops up from the day's remaining
 * new-card introduction budget, and re-fetches. The due backlog (in FACTS
 * this surface can answer, `practiceQueue.backlogFactCount`) decides how
 * much: at or under `DUE_BACKLOG_GATE_FACTS`, the whole remaining budget; over
 * it, only `BACKLOG_TRICKLE_FACTS`, once a day: a reload or a "Keep going"
 * the same day that is still over the gate cannot trickle again (the backlog
 * is the deck's job right now, not growing it further), but one that finds
 * the backlog back under the gate gets the rest of the day's budget.
 *
 * The ONE caller of `introduceNewCards` post-consolidation. Kept here (not
 * inlined in the `/practice` component) so the gate/introduce/re-fetch
 * sequence is unit-testable without mounting Svelte.
 */
export async function loadDueWithIntroduction(now: Date = new Date()): Promise<CardRecord[]> {
	const preDue = await getDueCards(now);
	const remaining = remainingIntroBudget(now);
	if (remaining <= 0) return preDue;
	if (backlogFactCount(preDue) > DUE_BACKLOG_GATE_FACTS) {
		if (trickleSpentToday(now)) return preDue;
		const trickled = await introduceNewCards(
			Math.min(remaining, BACKLOG_TRICKLE_FACTS),
			now,
			undefined,
			{ deferKinds: ['scale-degree'] }
		);
		if (trickled > 0) consumeTrickle(trickled, now);
	} else {
		const introduced = await introduceNewCards(remaining, now);
		if (introduced > 0) consumeIntroBudget(introduced, now);
	}
	return getDueCards(now);
}

/**
 * SONG-02/PRAC-04's queue restriction, extracted verbatim from the two
 * byte-faithful copies (`/practice`'s and `RecallSession`'s own
 * `applySongFilter`): when the filter is ON and a non-empty provenance index
 * is available, keep only chord-formula cards whose symbol belongs to an
 * active song (dropping non-song chords AND every non-chord fact kind -
 * interval-size, scale-degree). When the filter is ON but the index is empty
 * (no derivable song chords), or the filter is OFF, `due` passes through
 * unchanged so neither caller ever dead-ends on an empty provenance index.
 */
export function applySongFilter(
	due: CardRecord[],
	songFilterOn: boolean,
	provenanceIndex: Map<string, string[]> | undefined
): CardRecord[] {
	if (!songFilterOn || !provenanceIndex || provenanceIndex.size === 0) return due;
	return due.filter((card) => {
		const fact = factById(card.factId);
		return (
			fact !== undefined &&
			fact.factKind === 'chord-formula' &&
			symbolHasProvenance(fact.symbol, provenanceIndex)
		);
	});
}
