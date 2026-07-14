import { beforeEach, describe, expect, it } from 'vitest';
import {
	SCAFFOLDS_KEY,
	stageFor,
	recordScaffoldAnswer,
	readScaffolds,
	writeScaffold,
	activeScaffoldQualities,
	type ScaffoldState
} from './scaffold';

beforeEach(() => {
	localStorage.clear();
});

function fresh(symbol = 'F#m7b5'): ScaffoldState {
	return { symbol, exposures: 0, coldCorrectConstructions: 0 };
}

describe('stageFor (R3 scaffolding ladder)', () => {
	it('an unseen symbol starts formula-first', () => {
		expect(stageFor(undefined)).toBe('formula-first');
		expect(stageFor(fresh())).toBe('formula-first');
	});

	it('stays formula-first for the first 2 exposures', () => {
		expect(stageFor({ ...fresh(), exposures: 1 })).toBe('formula-first');
	});

	it('moves to hinted from exposure 3 onward', () => {
		expect(stageFor({ ...fresh(), exposures: 2 })).toBe('hinted');
		expect(stageFor({ ...fresh(), exposures: 10 })).toBe('hinted');
	});

	it('graduates after 5 cold correct constructions', () => {
		expect(stageFor({ ...fresh(), exposures: 9, coldCorrectConstructions: 5 })).toBe('graduated');
		expect(stageFor({ ...fresh(), exposures: 9, coldCorrectConstructions: 4 })).toBe('hinted');
	});
});

describe('recordScaffoldAnswer state transitions', () => {
	it('increments exposures on every recorded answer', () => {
		let state = fresh();
		state = recordScaffoldAnswer(state, { correct: false, assisted: true, kind: 'construction' });
		expect(state.exposures).toBe(1);
		state = recordScaffoldAnswer(state, { correct: true, assisted: true, kind: 'construction' });
		expect(state.exposures).toBe(2);
	});

	it('counts only cold correct CONSTRUCTIONS toward graduation', () => {
		let state = { ...fresh(), exposures: 2 };
		// Assisted correct construction: no credit.
		state = recordScaffoldAnswer(state, { correct: true, assisted: true, kind: 'construction' });
		expect(state.coldCorrectConstructions).toBe(0);
		// Cold correct identification: no credit.
		state = recordScaffoldAnswer(state, { correct: true, assisted: false, kind: 'identification' });
		expect(state.coldCorrectConstructions).toBe(0);
		// Cold WRONG construction: no credit.
		state = recordScaffoldAnswer(state, { correct: false, assisted: false, kind: 'construction' });
		expect(state.coldCorrectConstructions).toBe(0);
		// Cold correct construction: credit.
		state = recordScaffoldAnswer(state, { correct: true, assisted: false, kind: 'construction' });
		expect(state.coldCorrectConstructions).toBe(1);
	});

	it('five cold correct constructions graduate the symbol', () => {
		let state = { ...fresh(), exposures: 2 };
		for (let i = 0; i < 5; i++) {
			state = recordScaffoldAnswer(state, { correct: true, assisted: false, kind: 'construction' });
		}
		expect(stageFor(state)).toBe('graduated');
	});
});

describe('scaffold persistence', () => {
	it('returns {} when nothing stored and on corrupt data', () => {
		expect(readScaffolds()).toEqual({});
		localStorage.setItem(SCAFFOLDS_KEY, 'not json');
		expect(readScaffolds()).toEqual({});
	});

	it('round-trips a written scaffold state keyed by symbol', () => {
		writeScaffold({ symbol: 'F#m7b5', exposures: 3, coldCorrectConstructions: 1 });
		const scaffolds = readScaffolds();
		expect(scaffolds['F#m7b5']).toEqual({
			symbol: 'F#m7b5',
			exposures: 3,
			coldCorrectConstructions: 1
		});
	});
});

describe('activeScaffoldQualities (max 2 unfamiliar qualities guard input)', () => {
	it('lists distinct qualities of started, non-graduated scaffolds', () => {
		writeScaffold({ symbol: 'Fmaj7', exposures: 1, coldCorrectConstructions: 0 });
		writeScaffold({ symbol: 'Cmaj7', exposures: 2, coldCorrectConstructions: 0 });
		writeScaffold({ symbol: 'F#m7b5', exposures: 0, coldCorrectConstructions: 0 }); // not started
		writeScaffold({ symbol: 'G7', exposures: 8, coldCorrectConstructions: 5 }); // graduated
		expect(activeScaffoldQualities(readScaffolds())).toEqual(['maj7']);
	});
});
