import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SESSION_CONFIG,
	createSession,
	mergeWarmupCandidates,
	nextQuestion,
	recordSessionAnswer,
	isComplete,
	summarize,
	type Session,
	type SessionAnswer
} from './session';

function answer(overrides: Partial<SessionAnswer> = {}): SessionAnswer {
	return {
		symbol: 'Cm7',
		family: 'chord',
		kind: 'construction',
		correct: true,
		assisted: false,
		durationMs: 2500,
		source: 'pool',
		...overrides
	};
}

/** Chord-family seed items (the Drill-these flow ships chord symbols). */
function chordSeeds(symbols: string[]) {
	return symbols.map((symbol) => ({ symbol, family: 'chord' as const }));
}

/** rng stub returning a fixed value (gap control for retry scheduling). */
const rngZero = () => 0; // min gap (2)
const rngMax = () => 0.999; // max gap (4)

function playThrough(session: Session, answers: Partial<SessionAnswer>[], rng = rngZero): Session {
	let current = session;
	for (const partial of answers) {
		current = recordSessionAnswer(current, answer(partial), rng);
	}
	return current;
}

describe('createSession', () => {
	it('defaults to a 10-question session', () => {
		const session = createSession({});
		expect(session.length).toBe(10);
		expect(session.asked).toBe(0);
		expect(isComplete(session)).toBe(false);
	});

	it('seeds the warm-up queue from candidates, deduped and capped at 5', () => {
		const session = createSession({
			warmupCandidates: ['Cm7', 'G7', 'Cm7', 'F7', 'Dm7', 'Am7', 'Em7']
		});
		expect(session.warmupQueue).toEqual(['Cm7', 'G7', 'F7', 'Dm7', 'Am7']);
	});

	it('Drill-these seeds take over: seedQueue set, warm-up skipped', () => {
		const session = createSession({
			seeds: chordSeeds(['Bm7b5', 'F#m7b5']),
			warmupCandidates: ['Cm7', 'G7']
		});
		expect(session.seedQueue).toEqual(chordSeeds(['Bm7b5', 'F#m7b5']));
		expect(session.warmupQueue).toEqual([]);
	});
});

describe('nextQuestion priorities', () => {
	it('serves warm-up symbols first, in order, consuming the queue', () => {
		const session = createSession({ warmupCandidates: ['Cm7', 'G7'] });
		const first = nextQuestion(session);
		expect(first.plan).toEqual({ symbol: 'Cm7', family: 'chord', source: 'warmup' });
		const second = nextQuestion(first.session);
		expect(second.plan).toEqual({ symbol: 'G7', family: 'chord', source: 'warmup' });
		const third = nextQuestion(second.session);
		expect(third.plan).toEqual({ symbol: null, family: null, source: 'pool' });
	});

	it('serves seeds before falling back to the pool, carrying their family', () => {
		const session = createSession({ seeds: [{ symbol: 'm3', family: 'interval' }] });
		const first = nextQuestion(session);
		expect(first.plan).toEqual({ symbol: 'm3', family: 'interval', source: 'seeded' });
		expect(nextQuestion(first.session).plan.source).toBe('pool');
	});

	it('warm-up only covers the first 5 questions: leftovers are dropped after that', () => {
		let session = createSession({ warmupCandidates: ['C', 'Dm', 'Em', 'F', 'G', 'Am'] });
		// Answer 5 questions (the warm-up window).
		session = playThrough(session, Array(5).fill({ correct: true }));
		expect(session.asked).toBe(5);
		const { plan } = nextQuestion(session);
		expect(plan.source).toBe('pool');
	});

	it('a due retry preempts the pool draw', () => {
		let session = createSession({});
		// Miss on question 0 with min gap (2): due at question index 2.
		session = recordSessionAnswer(session, answer({ symbol: 'F#m7b5', correct: false }), rngZero);
		// Question index 1: not due yet.
		const early = nextQuestion(session);
		expect(early.plan.source).toBe('pool');
		session = recordSessionAnswer(early.session, answer({ correct: true }), rngZero);
		// Question index 2: due now.
		const due = nextQuestion(session);
		expect(due.plan).toEqual({ symbol: 'F#m7b5', family: 'chord', source: 'retry' });
		// The retry is consumed.
		expect(nextQuestion(due.session).plan.source).toBe('pool');
	});
});

describe('delayed retry scheduling (2 to 4 questions later)', () => {
	it('schedules at asked + 2 with rng 0 and asked + 4 with rng near 1', () => {
		let session = createSession({});
		session = recordSessionAnswer(session, answer({ symbol: 'A7', correct: false }), rngMax);
		expect(session.retryQueue).toEqual([{ symbol: 'A7', family: 'chord', dueIndex: 4 }]);

		let other = createSession({});
		other = recordSessionAnswer(other, answer({ symbol: 'B7', correct: false }), rngZero);
		expect(other.retryQueue).toEqual([{ symbol: 'B7', family: 'chord', dueIndex: 2 }]);
	});

	it('a missed INTERVAL retries as an interval: the A4 name collision never misroutes', () => {
		// 'A4' is both a tritone and a chord symbol tonal recognizes; the
		// queue carries the family explicitly instead of inferring by name.
		let session = createSession({});
		session = recordSessionAnswer(
			session,
			answer({ symbol: 'A4', family: 'interval', correct: false }),
			rngZero
		);
		expect(session.retryQueue).toEqual([{ symbol: 'A4', family: 'interval', dueIndex: 2 }]);
		session = recordSessionAnswer(session, answer({ correct: true }), rngZero);
		const due = nextQuestion(session);
		expect(due.plan).toEqual({ symbol: 'A4', family: 'interval', source: 'retry' });
	});

	it('the same name can queue once per family (chord A4 and interval A4 are distinct)', () => {
		let session = createSession({});
		session = recordSessionAnswer(
			session,
			answer({ symbol: 'A4', family: 'interval', correct: false }),
			rngZero
		);
		session = recordSessionAnswer(
			session,
			answer({ symbol: 'A4', family: 'chord', correct: false }),
			rngZero
		);
		expect(session.retryQueue).toHaveLength(2);
	});

	it('never schedules the same symbol twice', () => {
		let session = createSession({});
		session = recordSessionAnswer(session, answer({ symbol: 'A7', correct: false }), rngZero);
		session = recordSessionAnswer(session, answer({ symbol: 'A7', correct: false }), rngZero);
		expect(session.retryQueue).toHaveLength(1);
	});

	it('clamps a late miss to the last question when a gap of 2 no longer fits', () => {
		let session = createSession({});
		// 8 correct answers: next miss lands at question index 8 (the 9th).
		session = playThrough(session, Array(8).fill({ correct: true }));
		session = recordSessionAnswer(session, answer({ symbol: 'A7', correct: false }), rngZero);
		// asked = 9; 9 + 2 = 11 > 9 (last index): clamped to 9.
		expect(session.retryQueue).toEqual([{ symbol: 'A7', family: 'chord', dueIndex: 9 }]);
		const { plan } = nextQuestion(session);
		expect(plan).toEqual({ symbol: 'A7', family: 'chord', source: 'retry' });
	});

	it('drops the retry entirely when the session is already on its final question', () => {
		let session = createSession({});
		session = playThrough(session, Array(9).fill({ correct: true }));
		session = recordSessionAnswer(session, answer({ symbol: 'A7', correct: false }), rngZero);
		expect(session.retryQueue).toEqual([]);
		expect(isComplete(session)).toBe(true);
	});
});

describe('score and completion', () => {
	it('tracks correct count, streak, and best streak', () => {
		let session = createSession({});
		session = playThrough(session, [
			{ correct: true },
			{ correct: true },
			{ correct: true },
			{ correct: false, symbol: 'A7' },
			{ correct: true },
			{ correct: true }
		]);
		expect(session.correct).toBe(5);
		expect(session.streak).toBe(2);
		expect(session.bestStreak).toBe(3);
	});

	it('is complete after exactly length answers', () => {
		let session = createSession({});
		session = playThrough(session, Array(10).fill({ correct: true }));
		expect(session.asked).toBe(10);
		expect(isComplete(session)).toBe(true);
	});
});

describe('summarize (end card data)', () => {
	it('reports score, best streak, and deduped missed symbols in first-miss order', () => {
		let session = createSession({});
		session = playThrough(session, [
			{ correct: false, symbol: 'A7' },
			{ correct: true, symbol: 'C' },
			{ correct: false, symbol: 'Dm7' },
			{ correct: false, symbol: 'A7' },
			{ correct: true, symbol: 'G7' }
		]);
		const summary = summarize(session);
		expect(summary.total).toBe(5);
		expect(summary.correct).toBe(2);
		expect(summary.missedSymbols).toEqual(['A7', 'Dm7']);
		expect(summary.missedItems).toEqual(chordSeeds(['A7', 'Dm7']));
	});

	it('missedItems keeps each family distinct for redrill routing', () => {
		let session = createSession({});
		session = playThrough(session, [
			{ correct: false, symbol: 'm3', family: 'interval' },
			{ correct: false, symbol: 'Cm7', family: 'chord' }
		]);
		expect(summarize(session).missedItems).toEqual([
			{ symbol: 'm3', family: 'interval' },
			{ symbol: 'Cm7', family: 'chord' }
		]);
	});

	it('a symbol missed then answered correctly on retry still shows as missed (honest ledger)', () => {
		let session = createSession({});
		session = playThrough(session, [
			{ correct: false, symbol: 'A7' },
			{ correct: true, symbol: 'A7', source: 'retry' }
		]);
		expect(summarize(session).missedSymbols).toEqual(['A7']);
	});
});

describe('mergeWarmupCandidates (async weakest arrival)', () => {
	it('tops the warm-up queue up to 5 with new symbols, skipping duplicates', () => {
		const session = createSession({ warmupCandidates: ['Cm7', 'G7'] });
		const merged = mergeWarmupCandidates(session, ['G7', 'F7', 'Dm7', 'Am7', 'Em7']);
		expect(merged.warmupQueue).toEqual(['Cm7', 'G7', 'F7', 'Dm7', 'Am7']);
	});

	it('does nothing once the warm-up window has passed', () => {
		let session = createSession({});
		session = playThrough(session, Array(5).fill({ correct: true }));
		const merged = mergeWarmupCandidates(session, ['F7']);
		expect(merged.warmupQueue).toEqual([]);
	});

	it('does nothing for a seeded (Drill these) session', () => {
		const session = createSession({ seeds: chordSeeds(['Bm7b5']) });
		const merged = mergeWarmupCandidates(session, ['F7']);
		expect(merged.warmupQueue).toEqual([]);
	});
});

describe('DEFAULT_SESSION_CONFIG', () => {
	it('pins the R3/R6 numbers: 10 questions, 5 warm-up max, retry gap 2 to 4', () => {
		expect(DEFAULT_SESSION_CONFIG).toEqual({
			length: 10,
			warmupMax: 5,
			retryMinGap: 2,
			retryMaxGap: 4
		});
	});
});
