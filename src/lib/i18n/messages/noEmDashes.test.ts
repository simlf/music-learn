import { describe, expect, it } from 'vitest';
import { messages } from './index';
import { home } from './home';
import { voicings } from './voicings';
import { intervalView } from './interval-view';

/**
 * Standing copy rule gate: NO em dashes (—) or en dashes (–) in user-facing
 * copy. Periods, colons and commas only.
 *
 * The rule was being enforced by hand, per-file, in prose comments ("No em
 * dashes anywhere in this file's copy") and in per-function assertions
 * scattered through chordPresentation.test.ts. That left the actual
 * dictionaries unguarded, and four keys survived across two locales:
 *
 *   home.why.duo-minor-label       'minor — low third'    / 'mineur — tierce basse'
 *   home.why.duo-major-label       'major — high third'   / 'majeur — tierce haute'
 *   home.disambig.chip-minor-suffix '— minor'             / '— mineur'
 *   home.disambig.chip-major-suffix '— major'             / '— majeur'
 *
 * This is the catalog-wide lock so the next one cannot ship silently. It runs
 * over the merged dictionary (every domain, both locales), which is the whole
 * surface of translatable copy in the app.
 */
const DASHES = /[—–]/;

/** Every [key, value] pair in the merged catalog, tagged with its locale. */
function allEntries(): { locale: string; key: string; value: string }[] {
	return Object.entries(messages).flatMap(([locale, dict]) =>
		Object.entries(dict).map(([key, value]) => ({ locale, key, value: String(value) }))
	);
}

describe('copy rule: no em dashes in user-facing strings', () => {
	it('holds across the whole merged catalog, in every locale', () => {
		const offenders = allEntries()
			.filter((entry) => DASHES.test(entry.value))
			.map((entry) => `${entry.locale}:${entry.key} = ${entry.value}`);
		expect(
			offenders,
			`em/en dashes are not allowed in user-facing copy (use a period, colon or comma):\n${offenders.join('\n')}`
		).toEqual([]);
	});

	it('checks a non-trivial number of strings, so the sweep cannot pass vacuously', () => {
		expect(allEntries().length).toBeGreaterThan(400);
	});

	it('the four repaired keys read with a colon in both locales', () => {
		expect(home.en['home.why.duo-minor-label']).toBe('minor: low third');
		expect(home.en['home.why.duo-major-label']).toBe('major: high third');
		expect(home.en['home.disambig.chip-minor-suffix']).toBe(': minor');
		expect(home.en['home.disambig.chip-major-suffix']).toBe(': major');
		// French keeps the spaced-colon convention used elsewhere in this domain.
		expect(home.fr['home.why.duo-minor-label']).toBe('mineur : tierce basse');
		expect(home.fr['home.why.duo-major-label']).toBe('majeur : tierce haute');
		expect(home.fr['home.disambig.chip-minor-suffix']).toBe(': mineur');
		expect(home.fr['home.disambig.chip-major-suffix']).toBe(': majeur');
	});

	it('the two domains this worktree owns outright are clean, key by key', () => {
		for (const domain of [home, voicings, intervalView]) {
			for (const [locale, dict] of Object.entries(domain)) {
				for (const [key, value] of Object.entries(dict)) {
					expect(DASHES.test(String(value)), `${locale}:${key}`).toBe(false);
				}
			}
		}
	});
});
