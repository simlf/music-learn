/**
 * SQLite answer-event store.
 *
 * One row per graded drill answer (D-02): the raw event history is the
 * substrate for future v1.x spaced repetition, so the server never stores
 * aggregates only. Each row keeps both the server ISO timestamp
 * (created_at) and the browser-local calendar date (client_date), plus
 * (schema v1) the optional answer duration and what the user actually
 * answered.
 *
 * Migrations: versioned via PRAGMA user_version and run inside a
 * transaction at open time (createStore), since this service has no
 * standalone migration runner. v0 is the originally deployed schema
 * (kind CHECK without 'interval', no duration_ms/given); SQLite cannot
 * ALTER a CHECK constraint, so the v0 -> v1 step rebuilds the table with
 * the documented copy/drop/rename sequence, preserving ids.
 *
 * Plain function module (no class), mirroring the function-only style of
 * src/lib/lookup/recentLookups.ts on the client. Unlike the client's
 * swallow-and-degrade localStorage layer, DB errors here propagate: a
 * write that fails must not be reported as persisted.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export type AnswerKind = 'chord' | 'scale' | 'interval';

export interface AnswerEvent {
	item: string;
	kind: AnswerKind;
	correct: boolean;
	clientDate: string;
	/** Time to answer in milliseconds; optional (recorded now to feed future spaced repetition). */
	durationMs?: number | null;
	/** What the user actually answered on a miss; optional. */
	given?: string | null;
}

export interface AnswerRow {
	id: number;
	item: string;
	kind: AnswerKind;
	correct: 0 | 1;
	created_at: string;
	client_date: string;
	duration_ms: number | null;
	given: string | null;
}

export interface AnswerStore {
	insertAnswer(event: AnswerEvent): void;
	getAllAnswers(): AnswerRow[];
	close(): void;
}

/** Bump alongside a new migration step; stamped into PRAGMA user_version. */
export const SCHEMA_VERSION = 1;

/** The v1 answers table body, shared by the fresh-create and rebuild paths. */
const ANSWERS_TABLE_BODY = `(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('chord', 'scale', 'interval')),
	correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
	created_at TEXT NOT NULL,
	client_date TEXT NOT NULL,
	duration_ms INTEGER,
	given TEXT
)`;

const ANSWERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_answers_item_kind ON answers (item, kind);
CREATE INDEX IF NOT EXISTS idx_answers_client_date ON answers (client_date);
`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS answers ${ANSWERS_TABLE_BODY};
${ANSWERS_INDEXES}
`;

/** Columns a v1 row carries; the v0 rebuild copies whichever of these already exist. */
const V1_COLUMNS = [
	'id',
	'item',
	'kind',
	'correct',
	'created_at',
	'client_date',
	'duration_ms',
	'given'
];

function tableExists(db: Database.Database, name: string): boolean {
	return (
		db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !==
		undefined
	);
}

/**
 * v0 -> v1: widen the kind CHECK to include 'interval' and add the nullable
 * duration_ms / given columns. A fresh database just gets the v1 schema; an
 * existing file is rebuilt (CHECK constraints cannot be ALTERed) with every
 * row and id preserved. AUTOINCREMENT's sqlite_sequence follows the copied
 * max id automatically.
 */
function migrateToV1(db: Database.Database): void {
	if (!tableExists(db, 'answers')) {
		db.exec(SCHEMA);
		return;
	}

	const existingColumns = (db.pragma('table_info(answers)') as { name: string }[]).map(
		(column) => column.name
	);
	const copied = V1_COLUMNS.filter((column) => existingColumns.includes(column)).join(', ');

	db.exec(`CREATE TABLE answers_migrating ${ANSWERS_TABLE_BODY}`);
	db.exec(`INSERT INTO answers_migrating (${copied}) SELECT ${copied} FROM answers`);
	db.exec('DROP TABLE answers');
	db.exec('ALTER TABLE answers_migrating RENAME TO answers');
	db.exec(ANSWERS_INDEXES);
}

/**
 * Runs any pending migrations inside one transaction and stamps
 * user_version. Idempotent: a database already at SCHEMA_VERSION is left
 * untouched, so opening the store repeatedly (every container start) is
 * safe.
 */
function migrate(db: Database.Database): void {
	const version = db.pragma('user_version', { simple: true }) as number;
	if (version >= SCHEMA_VERSION) return;

	const run = db.transaction(() => {
		if (version < 1) {
			migrateToV1(db);
		}
		db.pragma(`user_version = ${SCHEMA_VERSION}`);
	});
	run();
}

/**
 * Opens (creating if needed) the SQLite database at `path`, migrates it to
 * the current schema version, and returns the answer store. Pass ":memory:"
 * for an isolated in-memory database in tests.
 */
export function createStore(path: string): AnswerStore {
	if (path !== ':memory:') {
		mkdirSync(dirname(path), { recursive: true });
	}

	const db = new Database(path);
	migrate(db);

	// Prepared, parameterized statements only: user-supplied values are always
	// bound as parameters, never interpolated into SQL (T-08-02 mitigation).
	const insertStatement = db.prepare(
		'INSERT INTO answers (item, kind, correct, created_at, client_date, duration_ms, given) VALUES (@item, @kind, @correct, @created_at, @client_date, @duration_ms, @given)'
	);
	const selectAllStatement = db.prepare(
		'SELECT id, item, kind, correct, created_at, client_date, duration_ms, given FROM answers ORDER BY id'
	);

	return {
		insertAnswer(event: AnswerEvent): void {
			insertStatement.run({
				item: event.item,
				kind: event.kind,
				correct: event.correct ? 1 : 0,
				created_at: new Date().toISOString(),
				client_date: event.clientDate,
				duration_ms: event.durationMs ?? null,
				given: event.given ?? null
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
