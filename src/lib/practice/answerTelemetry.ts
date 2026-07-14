/**
 * Tolerant answer telemetry (R6 proposal 6, ARCHITECTURE-CONTRACTS server
 * policy): the practice engine records duration_ms per answer and the given
 * (chosen) symbol on identification questions, but the PRODUCTION server is
 * not redeployed tonight and its schema rejects unknown fields with a 400
 * (additionalProperties: false). Worse, a 400 inside the offline queue would
 * jam it forever (flushQueue stops on the first failure and retries the same
 * poisoned head event).
 *
 * So: while server support is UNKNOWN, extended events are probed with ONE
 * direct POST that never touches the queue. A 2xx remembers "supported"
 * (extended fields flow through the normal recordAnswer queue from then on);
 * a 400 remembers "unsupported" (fields stripped, logged once); network or
 * auth errors fall back to the stripped base event and stay undecided. The
 * drill loop never breaks and the queue can never jam.
 *
 * Track C hardens the same tolerance inside progress.ts itself; the
 * architect reconciles at merge. Field names follow the existing wire
 * convention (camelCase clientDate -> client_date column): durationMs,
 * given.
 */

import { apiFetch } from '$lib/api/client';
import { localDateString, recordAnswer, type AnswerEvent } from '$lib/api/progress';

export const TELEMETRY_SUPPORT_KEY = 'music-learn:telemetry-support';

export interface PracticeAnswerEvent extends AnswerEvent {
	/** Milliseconds from question shown to graded (fluency signal). */
	durationMs?: number;
	/** The symbol the user picked on a missed identification question. */
	given?: string;
}

type TelemetrySupport = 'supported' | 'unsupported' | 'unknown';

function readSupport(): TelemetrySupport {
	try {
		const raw = localStorage.getItem(TELEMETRY_SUPPORT_KEY);
		return raw === 'supported' || raw === 'unsupported' ? raw : 'unknown';
	} catch {
		return 'unknown';
	}
}

function writeSupport(support: Exclude<TelemetrySupport, 'unknown'>): void {
	try {
		localStorage.setItem(TELEMETRY_SUPPORT_KEY, support);
	} catch {
		// Storage unavailable: we re-probe next time. Harmless.
	}
}

let warnedOnce = false;

/** The server schema bound for duration_ms (answers route, maximum: 3600000). */
export const MAX_DURATION_MS = 3_600_000;

/**
 * Sanitizes durationMs to the server's accepted range. Out-of-range values
 * (a tab left open overnight, clock skew) are DROPPED, not clamped: they
 * carry no fluency signal, and a 400 here would either poison the probe
 * into a permanent "unsupported" verdict or make flushQueue drop the whole
 * answer.
 */
function sanitizeDuration(durationMs: number | undefined): number | undefined {
	if (durationMs === undefined || !Number.isFinite(durationMs)) return undefined;
	const rounded = Math.round(durationMs);
	if (rounded < 0 || rounded > MAX_DURATION_MS) return undefined;
	return rounded;
}

function baseOf(event: PracticeAnswerEvent): AnswerEvent {
	return { item: event.item, kind: event.kind, correct: event.correct };
}

/** The extended event with only the DEFINED telemetry fields attached. */
function extendedOf(event: PracticeAnswerEvent): AnswerEvent {
	const extended: PracticeAnswerEvent = baseOf(event);
	if (event.durationMs !== undefined) extended.durationMs = event.durationMs;
	if (event.given !== undefined) extended.given = event.given;
	return extended;
}

function hasTelemetry(event: PracticeAnswerEvent): boolean {
	return event.durationMs !== undefined || event.given !== undefined;
}

async function probe(event: PracticeAnswerEvent): Promise<void> {
	try {
		const response = await apiFetch('/answers', {
			method: 'POST',
			body: { ...extendedOf(event), clientDate: localDateString() }
		});
		if (response.ok) {
			writeSupport('supported');
			return; // Recorded once via the probe itself.
		}
		if (response.status === 400) {
			writeSupport('unsupported');
			if (!warnedOnce) {
				warnedOnce = true;
				console.warn(
					'music-learn: deployed server rejects telemetry fields (durationMs/given). Recording base answers only until it is redeployed.'
				);
			}
		}
		// 400 or any other non-ok (401, 500, ...): the answer itself must not
		// be lost. Queue the safe base event.
		recordAnswer(baseOf(event));
	} catch {
		// Offline: queue the base event, stay undecided, re-probe next time.
		recordAnswer(baseOf(event));
	}
}

/**
 * Records a graded practice answer with optional telemetry, degrading
 * gracefully against the old deployed server. Fire-and-forget like
 * recordAnswer itself (D-04): the drill loop never waits on the network.
 */
export function recordPracticeAnswer(rawEvent: PracticeAnswerEvent): void {
	const event: PracticeAnswerEvent = { ...rawEvent, durationMs: sanitizeDuration(rawEvent.durationMs) };
	if (!hasTelemetry(event)) {
		recordAnswer(baseOf(event));
		return;
	}
	const support = readSupport();
	if (support === 'supported') {
		recordAnswer(extendedOf(event));
		return;
	}
	if (support === 'unsupported') {
		recordAnswer(baseOf(event));
		return;
	}
	void probe(event);
}
