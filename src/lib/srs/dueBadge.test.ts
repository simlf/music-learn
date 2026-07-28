import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * B7: the Practice tab's due-count badge. Two properties matter beyond the
 * count itself:
 *  - it reads through the EXISTING scheduler gateway (getDueCards), never a
 *    second due-date query;
 *  - it scans at most once per app session, because the root layout mounts on
 *    every route and getDueCards reads the whole card table.
 */

const getDueCardsMock = vi.fn();
vi.mock('$lib/srs/deck', () => ({
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args)
}));

const setAppBadgeCountMock = vi.fn();
vi.mock('$lib/pwa/appBadge', () => ({
	setAppBadgeCount: (...args: unknown[]) => setAppBadgeCountMock(...args),
	appBadgeSupported: () => false
}));

const { _resetDueCount, dueCount, formatDueBadge, primeDueCount, refreshDueCount } = await import(
	'./dueBadge.svelte'
);

function card(factId: string) {
	return { factId };
}

beforeEach(() => {
	getDueCardsMock.mockReset();
	getDueCardsMock.mockResolvedValue([]);
	setAppBadgeCountMock.mockReset();
	flushSync(() => _resetDueCount());
});

afterEach(() => {
	flushSync(() => _resetDueCount());
});

describe('formatDueBadge', () => {
	it('renders small counts verbatim', () => {
		expect(formatDueBadge(1)).toBe('1');
		expect(formatDueBadge(42)).toBe('42');
		expect(formatDueBadge(99)).toBe('99');
	});

	it('caps at 99+ so a long absence cannot widen a 9px tab slot', () => {
		expect(formatDueBadge(100)).toBe('99+');
		expect(formatDueBadge(1000)).toBe('99+');
	});
});

describe('primeDueCount', () => {
	it('starts at 0 before any scan', () => {
		expect(dueCount()).toBe(0);
	});

	it('publishes the number of due cards from the deck gateway', async () => {
		getDueCardsMock.mockResolvedValue([card('a'), card('b'), card('c')]);

		await primeDueCount();

		expect(getDueCardsMock).toHaveBeenCalledTimes(1);
		expect(dueCount()).toBe(3);
	});

	it('scans at most once per session, so navigation never pays for a rescan', async () => {
		getDueCardsMock.mockResolvedValue([card('a')]);

		await primeDueCount();
		await primeDueCount();
		await primeDueCount();

		expect(getDueCardsMock).toHaveBeenCalledTimes(1);
		expect(dueCount()).toBe(1);
	});

	it('stays at 0 when the deck read rejects (no IndexedDB available)', async () => {
		getDueCardsMock.mockRejectedValue(new Error('indexedDB API missing'));

		await primeDueCount();

		expect(dueCount()).toBe(0);
	});

	it('stays at 0 when the deck read resolves to something unexpected', async () => {
		getDueCardsMock.mockResolvedValue(undefined);

		await primeDueCount();

		expect(dueCount()).toBe(0);
	});
});

describe('refreshDueCount', () => {
	it('rescans even after a prime, picking up newly due cards', async () => {
		getDueCardsMock.mockResolvedValue([]);
		await primeDueCount();
		expect(dueCount()).toBe(0);

		getDueCardsMock.mockResolvedValue([card('a'), card('b')]);
		await refreshDueCount();

		expect(getDueCardsMock).toHaveBeenCalledTimes(2);
		expect(dueCount()).toBe(2);
	});

	it('drops back to 0 after the deck is cleared', async () => {
		getDueCardsMock.mockResolvedValue([card('a')]);
		await primeDueCount();

		getDueCardsMock.mockResolvedValue([]);
		await refreshDueCount();

		expect(dueCount()).toBe(0);
	});
});

describe('installed-app icon badge mirroring', () => {
	it('mirrors a positive count onto the app icon', async () => {
		getDueCardsMock.mockResolvedValue([card('a'), card('b')]);

		await primeDueCount();

		expect(setAppBadgeCountMock).toHaveBeenLastCalledWith(2);
	});

	it('asks for a cleared badge when nothing is due', async () => {
		await primeDueCount();

		expect(setAppBadgeCountMock).toHaveBeenLastCalledWith(0);
	});
});
