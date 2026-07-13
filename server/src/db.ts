/**
 * SQLite answer-event store.
 *
 * One row per graded drill answer (D-02): the raw event history is the
 * substrate for future v1.x spaced repetition, so the server never stores
 * aggregates only. Each row keeps both the server ISO timestamp
 * (created_at) and the browser-local calendar date (client_date).
 *
 * Plain function module (no class), mirroring the function-only style of
 * src/lib/lookup/recentLookups.ts on the client. Unlike the client's
 * swallow-and-degrade localStorage layer, DB errors here propagate: a
 * write that fails must not be reported as persisted.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export interface AnswerEvent {
	item: string;
	kind: 'chord' | 'scale';
	correct: boolean;
	clientDate: string;
}

export interface AnswerRow {
	id: number;
	item: string;
	kind: 'chord' | 'scale';
	correct: 0 | 1;
	created_at: string;
	client_date: string;
}

export interface AnswerStore {
	insertAnswer(event: AnswerEvent): void;
	getAllAnswers(): AnswerRow[];
	close(): void;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS answers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('chord', 'scale')),
	correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
	created_at TEXT NOT NULL,
	client_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_item_kind ON answers (item, kind);
CREATE INDEX IF NOT EXISTS idx_answers_client_date ON answers (client_date);
`;

/**
 * Opens (creating if needed) the SQLite database at `path` and returns the
 * answer store. Pass ":memory:" for an isolated in-memory database in tests.
 */
export function createStore(path: string): AnswerStore {
	if (path !== ':memory:') {
		mkdirSync(dirname(path), { recursive: true });
	}

	const db = new Database(path);
	db.exec(SCHEMA);

	// Prepared, parameterized statements only: user-supplied values are always
	// bound as parameters, never interpolated into SQL (T-08-02 mitigation).
	const insertStatement = db.prepare(
		'INSERT INTO answers (item, kind, correct, created_at, client_date) VALUES (@item, @kind, @correct, @created_at, @client_date)'
	);
	const selectAllStatement = db.prepare(
		'SELECT id, item, kind, correct, created_at, client_date FROM answers ORDER BY id'
	);

	return {
		insertAnswer(event: AnswerEvent): void {
			insertStatement.run({
				item: event.item,
				kind: event.kind,
				correct: event.correct ? 1 : 0,
				created_at: new Date().toISOString(),
				client_date: event.clientDate
			});
		},
		getAllAnswers(): AnswerRow[] {
			return selectAllStatement.all() as AnswerRow[];
		},
		close(): void {
			db.close();
		}
	};
}
