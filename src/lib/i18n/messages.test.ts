import { afterEach, describe, expect, it } from 'vitest';
import { messages } from './messages/index';
import { setLocale, t } from './locale.svelte';

/**
 * en/fr key-parity gate (I18N-02): automatically validates every later
 * plan's domain additions to messages/index.ts, since the merged dictionary
 * is the union of all nine per-domain modules.
 */
afterEach(() => {
	setLocale('en');
});

describe('en/fr message parity (I18N-02)', () => {
	it('has an identical key set in en and fr', () => {
		const enKeys = Object.keys(messages.en).sort();
		const frKeys = Object.keys(messages.fr).sort();
		expect(frKeys).toEqual(enKeys);
	});

	it('never translates the brand', () => {
		expect(messages.en.brand).toBe('MUSIC LEARN');
		expect(messages.fr.brand).toBe(messages.en.brand);
	});

	it('t() returns the correct French nav label after setLocale("fr")', () => {
		setLocale('fr');
		expect(t('nav.drills')).toBe('Exercices');
	});
});
