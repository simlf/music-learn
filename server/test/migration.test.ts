/**
 * Startup-migration tests for the v1 schema change (Track C): widened kind
 * CHECK ('interval') plus nullable duration_ms / given columns.
 *
 * There is no standalone migration runner: createStore() migrates on open,
 * versioned via PRAGMA user_version, so these tests exercise real SQLite
 * files on disk exactly like the production volume (better-sqlite3, no
 * in-memory shortcuts for the upgrade paths).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { createStore, SCHEMA_VERSION, type AnswerStore } from '../src/db.js';

/** The exact schema the production server shipped with (pre-migration v0). */
const V0_SCHEMA = `
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

let dir: string;
let dbPath: string;
let store: AnswerStore | undefined;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'music-learn-migration-'));
	dbPath = join(dir, 'answers.db');
	store = undefined;
});

afterEach(() => {
	store?.close();
	rmSync(dir, { recursive: true, force: true });
});

/** Seeds a production-shaped v0 database file with two rows. */
function seedV0File(): void {
	const db = new Database(dbPath);
	db.exec(V0_SCHEMA);
	const insert = db.prepare(
		'INSERT INTO answers (item, kind, correct, created_at, client_date) VALUES (?, ?, ?, ?, ?)'
	);
	insert.run('Cm7', 'chord', 1, '2026-07-01T10:00:00.000Z', '2026-07-01');
	insert.run('G7', 'chord', 0, '2026-07-02T10:00:00.000Z', '2026-07-02');
	db.close();
}

function userVersion(): number {
	const db = new Database(dbPath, { readonly: true });
	const version = db.pragma('user_version', { simple: true }) as number;
	db.close();
	return version;
}

describe('fresh database', () => {
	it('creates the v1 schema directly and stamps user_version', () => {
		store = createStore(dbPath);

		store.insertAnswer({
			item: 'm3',
			kind: 'interval',
			correct: true,
			clientDate: '2026-07-14',
			durationMs: 4200,
			given: 'M3'
		});

		const rows = store.getAllAnswers();
		expect(rows).toHaveLength(1);
		expect(rows[0].kind).toBe('interval');
		expect(rows[0].duration_ms).toBe(4200);
		expect(rows[0].given).toBe('M3');

		store.close();
		store = undefined;
		expect(userVersion()).toBe(SCHEMA_VERSION);
	});
});

describe('existing production (v0) database', () => {
	it('rejects kind interval before migration (sanity check of the v0 CHECK)', () => {
		seedV0File();
		const db = new Database(dbPath);
		expect(() =>
			db
				.prepare(
					'INSERT INTO answers (item, kind, correct, created_at, client_date) VALUES (?, ?, ?, ?, ?)'
				)
				.run('m3', 'interval', 1, '2026-07-14T10:00:00.000Z', '2026-07-14')
		).toThrow();
		db.close();
	});

	it('migrates on open: rows survive byte-for-byte, interval inserts work, version stamped', () => {
		seedV0File();

		store = createStore(dbPath);

		const before = store.getAllAnswers();
		expect(before).toHaveLength(2);
		expect(before[0]).toMatchObject({
			id: 1,
			item: 'Cm7',
			kind: 'chord',
			correct: 1,
			created_at: '2026-07-01T10:00:00.000Z',
			client_date: '2026-07-01',
			duration_ms: null,
			given: null
		});

		store.insertAnswer({ item: 'm3', kind: 'interval', correct: true, clientDate: '2026-07-14' });

		const after = store.getAllAnswers();
		expect(after).toHaveLength(3);
		// AUTOINCREMENT continues from the preserved ids.
		expect(after[2].id).toBe(3);
		expect(after[2].kind).toBe('interval');
		expect(after[2].duration_ms).toBeNull();

		store.close();
		store = undefined;
		expect(userVersion()).toBe(SCHEMA_VERSION);
	});

	it('is idempotent: opening twice neither duplicates nor loses rows', () => {
		seedV0File();

		store = createStore(dbPath);
		store.close();

		store = createStore(dbPath);
		expect(store.getAllAnswers()).toHaveLength(2);
	});

	it('preserves the old-kind CHECK behavior: chord and scale still insert fine after migration', () => {
		seedV0File();
		store = createStore(dbPath);

		store.insertAnswer({ item: 'C major', kind: 'scale', correct: true, clientDate: '2026-07-14' });

		expect(store.getAllAnswers()).toHaveLength(3);
	});

	it('still rejects unknown kinds after migration (CHECK constraint intact)', () => {
		seedV0File();
		store = createStore(dbPath);

		expect(() =>
			store!.insertAnswer({
				// @ts-expect-error deliberately outside the union
				kind: 'banana',
				item: 'x',
				correct: true,
				clientDate: '2026-07-14'
			})
		).toThrow();
	});
});
