import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Strudel engine wrapper, tested entirely against a mocked '@strudel/web'
 * module: no real AudioContext, no real Strudel scheduler, ever (jsdom has
 * neither, and the real package is a network-dependent chunk). strudel.ts
 * only ever loads it via a lazy dynamic import, which Vitest intercepts with
 * the factory below, matching audio.test.ts's own pattern for 'tone'.
 */

const mockStrudel = vi.hoisted(() => ({
	initStrudel: vi.fn(async () => {}),
	evaluate: vi.fn(async () => 'fake-pattern'),
	hush: vi.fn(),
	getTime: vi.fn(() => 0)
}));

vi.mock('@strudel/web', () => mockStrudel);

import {
	_resetForTests,
	onStrudelError,
	runStrudelPattern,
	stopStrudelPattern
} from './strudel';

function dispatchLog(message: string, type = 'error'): void {
	document.dispatchEvent(new CustomEvent('strudel.log', { detail: { message, type } }));
}

beforeEach(() => {
	_resetForTests();
	mockStrudel.initStrudel.mockClear();
	mockStrudel.evaluate.mockClear();
	mockStrudel.hush.mockClear();
	mockStrudel.getTime.mockClear();
});

afterEach(() => {
	_resetForTests();
});

describe('runStrudelPattern', () => {
	it('initializes the engine once and evaluates the given code', async () => {
		const result = await runStrudelPattern('note("c e g")');

		expect(result.ok).toBe(true);
		expect(result.pattern).toBe('fake-pattern');
		expect(result.now).toBe(mockStrudel.getTime);
		expect(mockStrudel.initStrudel).toHaveBeenCalledTimes(1);
		expect(mockStrudel.evaluate).toHaveBeenCalledWith('note("c e g")');
	});

	it('does not re-initialize the engine on a second run', async () => {
		await runStrudelPattern('a');
		await runStrudelPattern('b');

		expect(mockStrudel.initStrudel).toHaveBeenCalledTimes(1);
		expect(mockStrudel.evaluate).toHaveBeenNthCalledWith(2, 'b');
	});

	it('reports an unavailable engine rather than throwing when init fails', async () => {
		mockStrudel.initStrudel.mockRejectedValueOnce(new Error('chunk fetch failed'));

		const result = await runStrudelPattern('note("c")');

		expect(result).toEqual({ ok: false, unavailable: true });
	});

	it('never throws even when evaluate itself rejects', async () => {
		mockStrudel.evaluate.mockRejectedValueOnce(new Error('boom'));

		await expect(runStrudelPattern('note("c")')).resolves.toEqual({
			ok: false,
			unavailable: true
		});
	});

	it('retries after a failed load instead of staying stuck unavailable', async () => {
		mockStrudel.initStrudel.mockRejectedValueOnce(new Error('offline'));
		await runStrudelPattern('a');

		const result = await runStrudelPattern('b');

		expect(result.ok).toBe(true);
		expect(mockStrudel.initStrudel).toHaveBeenCalledTimes(2);
	});
});

describe('stopStrudelPattern', () => {
	it('is a safe no-op before the engine has ever loaded', () => {
		expect(() => stopStrudelPattern()).not.toThrow();
		expect(mockStrudel.hush).not.toHaveBeenCalled();
	});

	it('hushes the engine once it has loaded', async () => {
		await runStrudelPattern('note("c")');

		stopStrudelPattern();
		await Promise.resolve();
		await Promise.resolve();

		expect(mockStrudel.hush).toHaveBeenCalledTimes(1);
	});
});

describe('onStrudelError', () => {
	it('reports only "error"-typed strudel.log events', () => {
		const messages: string[] = [];
		const unsubscribe = onStrudelError((message) => messages.push(message));

		dispatchLog('[eval] code updated', 'info');
		dispatchLog('[eval] error: unexpected token', 'error');

		expect(messages).toEqual(['[eval] error: unexpected token']);
		unsubscribe();
	});

	it('stops reporting once unsubscribed', () => {
		const messages: string[] = [];
		const unsubscribe = onStrudelError((message) => messages.push(message));
		unsubscribe();

		dispatchLog('[eval] error: nope', 'error');

		expect(messages).toEqual([]);
	});

	it('is pure DOM: it works before the engine has ever loaded', () => {
		const messages: string[] = [];
		const unsubscribe = onStrudelError((message) => messages.push(message));

		dispatchLog('[scheduler] error: bad sound', 'error');

		expect(messages).toEqual(['[scheduler] error: bad sound']);
		unsubscribe();
	});
});
