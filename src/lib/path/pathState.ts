/**
 * The guided path's one localStorage record (`.planning/design/guided-path.md`
 * section 4.3), started here by the method-book chapters
 * (`.planning/design/method-book.md`): it holds each chapter's practice
 * checklist ticks, per device.
 *
 * The ticks are a practice plan, not a score. They are read back only by the
 * chapter that owns them: never counted, summed, shown as a fraction, or read
 * by any other surface (the instrument rule, `improvisation.md` 6.2.3). Losing
 * the record loses ticks and nothing else; no review history lives here.
 *
 * Writes preserve any other top-level field already in the record, so the
 * guided path's later `read` / `proofCounts` marks can share the key without a
 * migration. Defensive read and no-op write failures, the house idiom
 * (`src/lib/srs/introBudget.ts`).
 */

export const PATH_KEY = 'music-learn:path';

/** Checklist ticks per chapter id: the ids of the lines ticked on this device. */
export type ChecklistTicks = Record<string, string[]>;

function readRecord(): Record<string, unknown> {
	try {
		const raw = localStorage.getItem(PATH_KEY);
		if (raw === null) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		return parsed as Record<string, unknown>;
	} catch {
		return {};
	}
}

function readTicks(record: Record<string, unknown>): ChecklistTicks {
	const value = record.checklist;
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	const ticks: ChecklistTicks = {};
	for (const [chapterId, ids] of Object.entries(value)) {
		if (!Array.isArray(ids)) continue;
		ticks[chapterId] = ids.filter((id): id is string => typeof id === 'string');
	}
	return ticks;
}

/** The checklist line ids ticked for `chapterId` on this device. Corrupt or absent storage reads as none. */
export function checklistTicks(chapterId: string): string[] {
	return readTicks(readRecord())[chapterId] ?? [];
}

/**
 * Ticks or unticks one checklist line and returns the chapter's new tick list.
 * A failed write still returns the intended list, so the page keeps working
 * for this visit without persistence.
 */
export function setChecklistTick(chapterId: string, itemId: string, ticked: boolean): string[] {
	const record = readRecord();
	const ticks = readTicks(record);
	const current = new Set(ticks[chapterId] ?? []);
	if (ticked) current.add(itemId);
	else current.delete(itemId);
	const next = [...current];
	ticks[chapterId] = next;
	try {
		localStorage.setItem(PATH_KEY, JSON.stringify({ ...record, checklist: ticks }));
	} catch {
		// Quota exceeded or storage disabled: availability over durability.
	}
	return next;
}
