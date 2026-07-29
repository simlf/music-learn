import { getDueCards, introduceNewCards, type CardRecord } from '$lib/srs/deck';
import { remainingIntroBudget, consumeIntroBudget } from '$lib/srs/introBudget';
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
 * The due-card load pipeline (BACKLOG-1/T13's gate, relocated rather than
 * re-derived): fetches the current due set, and - only when the due backlog
 * (in FACTS this surface can answer, `practiceQueue.backlogFactCount`) is at
 * or under `DUE_BACKLOG_GATE_FACTS` - tops up from the day's remaining new-
 * card introduction budget before re-fetching. A backlog over the gate skips
 * introduction entirely for this call: the deck's job right now is clearing
 * the backlog, not growing it further.
 *
 * The ONE caller of `introduceNewCards` post-consolidation. Kept here (not
 * inlined in the `/practice` component) so the gate/introduce/re-fetch
 * sequence is unit-testable without mounting Svelte.
 */
export async function loadDueWithIntroduction(now: Date = new Date()): Promise<CardRecord[]> {
	const preDue = await getDueCards(now);
	if (backlogFactCount(preDue) > DUE_BACKLOG_GATE_FACTS) {
		return preDue;
	}
	const remaining = remainingIntroBudget(now);
	if (remaining > 0) {
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
