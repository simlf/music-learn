import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { _database, getAllCards, introduceNewCards, recordGrade } from '$lib/srs/deck';
import { Rating } from '$lib/srs/scheduler';
import { DAILY_TARGET, recordDailyAnswer, remainingDailyTarget } from './dailySession';
import { loadDueWithIntroduction } from './reviewLoad';
import { composeDailyRound } from './dailyRound';
import { getLevelState, setCurrentTier } from './levelState';
import {
	advanceHybridQueue,
	RETRY_MAX_GAP,
	RETRY_MIN_GAP,
	type HybridQueueItem
} from './practiceQueue';

/**
 * The multi-day practice simulation (ml-practice-variety): replays /practice's
 * own load() pipeline (loadDueWithIntroduction, then composeDailyRound, the
 * exact code the page runs) against a real Dexie deck on fake-indexeddb, with
 * a faked clock moved forward one day at a time and a seeded simulated user
 * who answers correctly at a fixed rate. Carded answers are graded through the
 * real recordGrade and every answer goes through the real advanceHybridQueue
 * with the page's delayed-retry options.
 *
 * It pins the numbers that made the round feel repetitive, so a later change
 * to the planner, the intake gate or the tier gate cannot quietly bring them
 * back. Before this task the same harness measured, for one round a day at
 * 85% correct over 60 days: synthetic (applied) share 2.9%, same-round subject
 * repeats 16% excluding miss retries (25% including them), the round's
 * biggest family 43% of it on average, and the first seventh chord asked on
 * day 59; an established deck (96 facts introduced, tier 4 reached) got 0%
 * applied items and no new material in 45 days. After it: 25%, 0.2%, 34%,
 * day 33, and new material on every day of the established deck's run.
 *
 * The price, measured by the same runs: one round a day no longer keeps up
 * with a deck that always grows. The fresh deck ends 60 days with 113 due
 * cards (20 before) and the established deck grows its backlog instead of
 * shrinking it, because the trickle adds a fact every day and three of the
 * twelve questions now carry no FSRS grade. BACKLOG_TRICKLE_FACTS and
 * APPLIED_SLOT_EVERY are the two dials.
 *
 * The sim does not model seeds, the song filter, play-throughs, or a synthetic
 * item's own grading (it is answered as done); BuildSession's internal steps
 * are graded as one Good/Again, like the host's completeBuild.
 *
 * Longer or different runs for investigation, from the repo root:
 *   SIM_DAYS=150 SIM_ACC=0.85 SIM_ROUNDS=1 SIM_OUT=/tmp/sim.json \
 *     npx vitest run src/lib/practice/dailyRound.sim.test.ts
 * SIM_VETERAN=1 starts from an established deck instead: the first 96 facts of
 * the tier 1-4 curriculum introduced the day before day 0, and tier 4 reached.
 */

const SYNTHETIC_FAMILIES = new Set(['voicing', 'progression', 'inversion', 'chord-scale']);
const SEVENTH_QUALITY = /(maj7|m7b5|m7|dim7|7)$/;
const DAY_MS = 86_400_000;

interface AskedQuestion {
	family: string;
	subject: string;
	correct: boolean;
	/** True when this is a missed item's in-session retry, the one deliberate same-round repeat. */
	retry: boolean;
}

interface SimRound {
	day: number;
	round: number;
	tier: number;
	introducedFacts: number;
	/** Introduced seventh-chord facts. */
	sevenths: number;
	dueFacts: number;
	dueCards: number;
	asked: AskedQuestion[];
}

interface SimScenario {
	days: number;
	accuracy: number;
	roundsPerDay: number;
	veteran?: boolean;
	seed?: number;
}

interface SimSummary {
	questions: number;
	syntheticShare: number;
	repeatShare: number;
	repeatShareWithRetries: number;
	biggestFamilyShare: number;
	familiesPerRound: number;
	firstSeventhDay: number | null;
	daysWithNewFacts: number;
	finalTier: number;
	finalFacts: number;
	finalDueFacts: number;
	rounds: SimRound[];
}

function seededRng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

/** What a question is ABOUT, for the same-round repeat count: the chord, the interval, the degree, or the progression. */
function subjectOf(item: HybridQueueItem): string {
	if (item.family === 'interval') return `interval:${item.short}`;
	if (item.family === 'degree') return `degree:${item.tonic}${item.degree}`;
	if (item.family === 'progression') return `progression:${item.templateId}:${item.key}`;
	return `chord:${item.symbol}`;
}

async function playRound(rng: () => number, accuracy: number, extra: boolean): Promise<AskedQuestion[]> {
	const due = await loadDueWithIntroduction(new Date());
	const target = extra ? DAILY_TARGET : remainingDailyTarget();
	const { round } = await composeDailyRound(due, {
		target,
		seededItems: [],
		songFilterOn: false,
		provenanceIndex: new Map(),
		rng
	});

	let queue = round;
	const asked: AskedQuestion[] = [];
	const missedIds = new Set<string>();
	while (queue.length > 0 && asked.length < target) {
		const item = queue[0];
		const correct = rng() < accuracy;
		asked.push({ family: item.family, subject: subjectOf(item), correct, retry: missedIds.has(item.id) });
		if (!correct) missedIds.add(item.id);
		recordDailyAnswer({ correct, label: correct ? undefined : subjectOf(item) });
		if ('card' in item) {
			const rating = correct ? Rating.Good : Rating.Again;
			const updated = await recordGrade(item.card, rating);
			queue = queue.map((queued) =>
				'card' in queued && queued.factId === item.factId && queued.mode === item.mode
					? { ...queued, card: updated }
					: queued
			);
			queue = advanceHybridQueue(queue, rating, {
				retryMinGap: RETRY_MIN_GAP,
				retryMaxGap: RETRY_MAX_GAP,
				rng
			});
		} else {
			queue = advanceHybridQueue(queue, Rating.Good);
		}
	}
	return asked;
}

async function simulate(scenario: SimScenario): Promise<SimSummary> {
	const rng = seededRng(scenario.seed ?? 7);
	const start = new Date('2026-09-01T18:00:00');
	if (scenario.veteran) {
		vi.setSystemTime(new Date(start.getTime() - DAY_MS));
		await introduceNewCards(96, new Date(), 4);
		setCurrentTier(4);
	}

	const rounds: SimRound[] = [];
	for (let day = 0; day < scenario.days; day++) {
		vi.setSystemTime(new Date(start.getTime() + day * DAY_MS));
		for (let round = 0; round < scenario.roundsPerDay; round++) {
			const asked = await playRound(rng, scenario.accuracy, round > 0);
			const cards = await getAllCards();
			const now = new Date();
			const factIds = new Set(cards.map((card) => card.factId));
			rounds.push({
				day,
				round,
				tier: getLevelState().currentTier,
				introducedFacts: factIds.size,
				sevenths: [...factIds].filter(
					(factId) => factId.startsWith('chord-formula:') && SEVENTH_QUALITY.test(factId)
				).length,
				dueFacts: new Set(cards.filter((card) => card.due <= now).map((card) => card.factId)).size,
				dueCards: cards.filter((card) => card.due <= now).length,
				asked
			});
		}
	}
	return summarize(rounds);
}

function summarize(rounds: SimRound[]): SimSummary {
	let questions = 0;
	let synthetic = 0;
	let repeats = 0;
	let repeatsWithRetries = 0;
	let biggestFamilySum = 0;
	let familiesSum = 0;
	let played = 0;
	let firstSeventhDay: number | null = null;
	for (const round of rounds) {
		if (round.asked.length === 0) continue;
		played += 1;
		const seen = new Set<string>();
		const perFamily = new Map<string, number>();
		for (const question of round.asked) {
			questions += 1;
			if (SYNTHETIC_FAMILIES.has(question.family)) synthetic += 1;
			if (seen.has(question.subject)) {
				repeatsWithRetries += 1;
				if (!question.retry) repeats += 1;
			}
			seen.add(question.subject);
			perFamily.set(question.family, (perFamily.get(question.family) ?? 0) + 1);
			if (
				firstSeventhDay === null &&
				question.subject.startsWith('chord:') &&
				SEVENTH_QUALITY.test(question.subject)
			) {
				firstSeventhDay = round.day;
			}
		}
		biggestFamilySum += Math.max(...perFamily.values()) / round.asked.length;
		familiesSum += perFamily.size;
	}

	const factsByDay = new Map<number, number>();
	for (const round of rounds) factsByDay.set(round.day, round.introducedFacts);
	let daysWithNewFacts = 0;
	for (const [day, facts] of factsByDay) {
		const previous = factsByDay.get(day - 1);
		if (previous !== undefined && facts > previous) daysWithNewFacts += 1;
	}

	const last = rounds[rounds.length - 1];
	return {
		questions,
		syntheticShare: synthetic / questions,
		repeatShare: repeats / questions,
		repeatShareWithRetries: repeatsWithRetries / questions,
		biggestFamilyShare: biggestFamilySum / played,
		familiesPerRound: familiesSum / played,
		firstSeventhDay,
		daysWithNewFacts,
		finalTier: last.tier,
		finalFacts: last.introducedFacts,
		finalDueFacts: last.dueFacts,
		rounds
	};
}

beforeEach(async () => {
	localStorage.clear();
	await _database().cards.clear();
	vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
	vi.useRealTimers();
});

describe('multi-day practice simulation (ml-practice-variety)', () => {
	it('a fresh deck, one round a day at 85%: varied rounds, no same-round repeats, sevenths within five weeks', { timeout: 120_000 }, async () => {
		const summary = await simulate({ days: 40, accuracy: 0.85, roundsPerDay: 1 });

		expect(summary.syntheticShare).toBeGreaterThanOrEqual(0.2);
		expect(summary.repeatShare).toBeLessThan(0.05);
		expect(summary.biggestFamilyShare).toBeLessThanOrEqual(0.4);
		expect(summary.firstSeventhDay).not.toBeNull();
		expect(summary.firstSeventhDay as number).toBeLessThanOrEqual(35);
	});

	it('an established deck keeps getting applied items and new material despite its backlog', { timeout: 120_000 }, async () => {
		const summary = await simulate({ days: 20, accuracy: 0.85, roundsPerDay: 1, veteran: true });

		expect(summary.syntheticShare).toBeGreaterThanOrEqual(0.2);
		expect(summary.repeatShare).toBeLessThan(0.05);
		expect(summary.daysWithNewFacts).toBeGreaterThanOrEqual(15);
	});

	it.runIf(process.env.SIM_DAYS !== undefined)('investigation run (env-configured)', { timeout: 1_200_000 }, async () => {
		const summary = await simulate({
			days: Number(process.env.SIM_DAYS),
			accuracy: Number(process.env.SIM_ACC ?? 0.85),
			roundsPerDay: Number(process.env.SIM_ROUNDS ?? 1),
			veteran: process.env.SIM_VETERAN !== undefined
		});
		const { rounds, ...numbers } = summary;
		console.log(JSON.stringify(numbers, null, 1));
		if (process.env.SIM_OUT) {
			writeFileSync(process.env.SIM_OUT, JSON.stringify(rounds, null, 1));
		}
	});
});
