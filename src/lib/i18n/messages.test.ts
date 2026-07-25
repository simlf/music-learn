import { afterEach, describe, expect, it } from 'vitest';
import { messages } from './messages/index';
import { chrome } from './messages/chrome';
import { recall } from './messages/recall';
import { build } from './messages/build';
import { drills } from './messages/drills';
import { songs } from './messages/songs';
import { theory } from './messages/theory';
import { scales } from './messages/scales';
import { progress } from './messages/progress';
import { progressHub } from './messages/progress-hub';
import { home } from './messages/home';
import { progressions } from './messages/progressions';
import { voicings } from './messages/voicings';
import { intervalView } from './messages/interval-view';
import { practice } from './messages/practice';
import { learn } from './messages/learn';
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

/**
 * Collision guard (I18N-02 addendum): the merged `messages.en`/`messages.fr`
 * objects are built via a 9-way object spread in `messages/index.ts`. A
 * spread silently lets a later domain's key shadow an earlier domain's value
 * with no error, so this asserts every domain's key set is pairwise disjoint
 * - a future domain addition that accidentally reuses an existing key (e.g.
 * two domains both defining `page.title`) fails this test immediately
 * instead of silently losing a key at merge time.
 */
describe('domain dictionary key collisions (I18N-02)', () => {
	const domains: Array<[string, Record<string, string>]> = [
		['chrome', chrome.en],
		['recall', recall.en],
		['build', build.en],
		['drills', drills.en],
		['songs', songs.en],
		['theory', theory.en],
		['scales', scales.en],
		['progress', progress.en],
		['progress-hub', progressHub.en],
		['home', home.en],
		['progressions', progressions.en],
		['voicings', voicings.en],
		['interval-view', intervalView.en],
		['practice', practice.en],
		['learn', learn.en]
	];

	it('has no key defined by more than one domain dictionary', () => {
		const owners = new Map<string, string>();
		const collisions: string[] = [];

		for (const [domainName, dict] of domains) {
			for (const key of Object.keys(dict)) {
				const owner = owners.get(key);
				if (owner) {
					collisions.push(`"${key}" defined by both "${owner}" and "${domainName}"`);
				} else {
					owners.set(key, domainName);
				}
			}
		}

		expect(collisions).toEqual([]);
	});

	it('every domain key survives the merge unshadowed (merged catalog size equals the sum of domain sizes)', () => {
		const totalDomainKeys = domains.reduce((sum, [, dict]) => sum + Object.keys(dict).length, 0);
		expect(Object.keys(messages.en).length).toBe(totalDomainKeys);
	});
});
