import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { MAX_NEW_CARDS_PER_DAY } from '$lib/srs/introBudget';

/**
 * The over-backlog trickle against the REAL daily intro budget (localStorage),
 * across several loads on one day: the trickle fires once, a same-day reload
 * still over the gate adds nothing, and a reload that finds the backlog back
 * under the gate gets the rest of the day's normal intake.
 */

const getDueCardsMock = vi.fn();
const introduceNewCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
		introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args)
	};
});

const { loadDueWithIntroduction } = await import('./reviewLoad');

const MORNING = new Date('2026-07-15T09:00:00');
const NOON = new Date('2026-07-15T12:00:00');
const EVENING = new Date('2026-07-15T19:00:00');
const NEXT_DAY = new Date('2026-07-16T09:00:00');

function dueFacts(count: number): CardRecord[] {
	return Array.from({ length: count }, (_, i) => ({
		...newCard(MORNING),
		factId: `interval-size:fake-${i}`,
		factKind: 'interval-size' as const,
		mode: 'formula' as const,
		lastRating: null,
		masteryDayCount: 0
	}));
}

beforeEach(() => {
	localStorage.clear();
	getDueCardsMock.mockReset();
	introduceNewCardsMock.mockReset();
	introduceNewCardsMock.mockImplementation(async (n: number) => n);
});

describe('loadDueWithIntroduction: over-backlog trickle across one day', () => {
	it('trickles once, then restores normal intake when the backlog drops under the gate the same day', async () => {
		getDueCardsMock.mockResolvedValue(dueFacts(21));
		await loadDueWithIntroduction(MORNING);
		expect(introduceNewCardsMock).toHaveBeenCalledTimes(1);
		expect(introduceNewCardsMock.mock.calls[0][0]).toBe(1);

		await loadDueWithIntroduction(NOON);
		expect(introduceNewCardsMock).toHaveBeenCalledTimes(1);

		getDueCardsMock.mockResolvedValue(dueFacts(5));
		await loadDueWithIntroduction(EVENING);
		expect(introduceNewCardsMock).toHaveBeenCalledTimes(2);
		expect(introduceNewCardsMock.mock.calls[1][0]).toBe(MAX_NEW_CARDS_PER_DAY - 1);
	});

	it('the next day trickles again while still over the gate', async () => {
		getDueCardsMock.mockResolvedValue(dueFacts(21));
		await loadDueWithIntroduction(MORNING);
		await loadDueWithIntroduction(NEXT_DAY);
		expect(introduceNewCardsMock).toHaveBeenCalledTimes(2);
		expect(introduceNewCardsMock.mock.calls[1][0]).toBe(1);
	});
});
