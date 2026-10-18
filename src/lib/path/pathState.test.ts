import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATH_KEY, checklistTicks, setChecklistTick } from './pathState';

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe('checklist ticks', () => {
	it('reads none from empty, corrupt, or wrong-shape storage', () => {
		expect(checklistTicks('shells-in-every-key')).toEqual([]);
		localStorage.setItem(PATH_KEY, '{not json');
		expect(checklistTicks('shells-in-every-key')).toEqual([]);
		localStorage.setItem(PATH_KEY, JSON.stringify({ checklist: { 'shells-in-every-key': 'eyes-off' } }));
		expect(checklistTicks('shells-in-every-key')).toEqual([]);
		localStorage.setItem(PATH_KEY, JSON.stringify([1, 2]));
		expect(checklistTicks('shells-in-every-key')).toEqual([]);
	});

	it('ticks and unticks per chapter and persists across reads', () => {
		expect(setChecklistTick('shells-in-every-key', 'eyes-off', true)).toEqual(['eyes-off']);
		setChecklistTick('shells-in-every-key', 'major-cycle', true);
		setChecklistTick('other-chapter', 'x', true);
		expect(checklistTicks('shells-in-every-key')).toEqual(['eyes-off', 'major-cycle']);
		expect(setChecklistTick('shells-in-every-key', 'eyes-off', false)).toEqual(['major-cycle']);
		expect(checklistTicks('other-chapter')).toEqual(['x']);
	});

	it('ticking twice keeps one entry', () => {
		setChecklistTick('c', 'a', true);
		expect(setChecklistTick('c', 'a', true)).toEqual(['a']);
	});

	it("keeps the guided path's other fields in the same record", () => {
		localStorage.setItem(PATH_KEY, JSON.stringify({ read: ['guide-tones'], proofCounts: { 'ii-V-I': 2 } }));
		setChecklistTick('c', 'a', true);
		expect(JSON.parse(localStorage.getItem(PATH_KEY)!)).toEqual({
			read: ['guide-tones'],
			proofCounts: { 'ii-V-I': 2 },
			checklist: { c: ['a'] }
		});
	});

	it('a failed write still returns the intended ticks', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota');
		});
		expect(setChecklistTick('c', 'a', true)).toEqual(['a']);
	});
});
