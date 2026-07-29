import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { createGradeGuard } from './reviewGuard.svelte';

/**
 * Y1 consolidation: the shared in-flight grade guard both `/practice`'s
 * completeCarded and `RecallSession`'s handleGrade now use instead of each
 * keeping its own `grading` boolean + try/finally.
 */
describe('createGradeGuard', () => {
	it('runs fn and reports active only while fn is in flight', async () => {
		const guard = createGradeGuard();
		let resolveFn: (() => void) | undefined;
		const fn = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveFn = () => resolve('done');
				})
		);

		expect(guard.active).toBe(false);
		const promise = guard.run(fn);
		flushSync();
		expect(guard.active).toBe(true);

		resolveFn?.();
		const result = await promise;
		expect(result).toBe('done');
		expect(guard.active).toBe(false);
	});

	it('a second run while the first is in flight is a no-op that never calls fn', async () => {
		const guard = createGradeGuard();
		let resolveFirst: (() => void) | undefined;
		const first = vi.fn(
			() =>
				new Promise<number>((resolve) => {
					resolveFirst = () => resolve(1);
				})
		);
		const second = vi.fn(async () => 2);

		const firstPromise = guard.run(first);
		const secondResult = await guard.run(second);

		expect(secondResult).toBeUndefined();
		expect(second).not.toHaveBeenCalled();

		resolveFirst?.();
		expect(await firstPromise).toBe(1);
	});

	it('resets active even when fn throws', async () => {
		const guard = createGradeGuard();
		await expect(
			guard.run(async () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		expect(guard.active).toBe(false);
		// A guard that stayed stuck active after a throw would silently drop
		// every future grade attempt.
		const after = await guard.run(async () => 'recovered');
		expect(after).toBe('recovered');
	});
});
