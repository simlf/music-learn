import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
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
import { inversions } from './messages/inversions';
import { voicings } from './messages/voicings';
import { intervalView } from './messages/interval-view';
import { practice } from './messages/practice';
import { learn } from './messages/learn';
import { improvise } from './messages/improvise';

/**
 * Dead-message-key gate.
 *
 * Every key in the merged catalog SHIPS TO THE USER. The dictionary is a plain
 * object literal spread in `messages/index.ts`, so the bundler cannot
 * tree-shake individual keys: it has no way to prove which of them `t()` will
 * ask for at runtime. That was verified against a real production build, where
 * the retired `nav.more` string was found verbatim in the client chunk with no
 * component referencing it. Dead keys are therefore shipped bytes, not just
 * clutter.
 *
 * Nothing was watching that, and it showed: when this gate was first written,
 * 64 keys across five domains were dead, including ~58% of `drills.ts` (an
 * unlock card, a LevelPicker and a BottomSheet that had all been deleted) and
 * nine labels from the pre-consolidation ten-link nav. This test is the
 * permanent replacement for that audit.
 *
 * ---- What counts as "used" ----
 *
 * A key is used if it appears as a QUOTED STRING LITERAL ('k', "k" or `k`) in
 * PRODUCT source: any `.svelte` or non-test `.ts` file under `src/`, excluding
 * the message dictionaries themselves.
 *
 * Test files deliberately DO NOT count. A key referenced only by a test is
 * dead product copy that a test is keeping artificially alive, which is
 * exactly how `drills.page.title` and `nav.drills` survived the route
 * consolidation. Requiring a product reference is the whole point of the gate.
 *
 * Matching on the quoted form (rather than a bare substring) means a key named
 * in a prose comment does not count as a use.
 *
 * ---- Dynamic keys ----
 *
 * Some call sites build a key from runtime data instead of writing it out:
 *
 *     t(`inversions.name.${drilledIndex}` as MessageKey)
 *
 * No static scan can see those, so their prefixes are allowlisted in
 * DYNAMIC_PREFIXES below. The allowlist is itself gated: every entry must
 * correspond to a real template-literal construction site in product code AND
 * must still cover at least one live key, so it cannot quietly become a
 * dumping ground for keys that are simply dead.
 *
 * ---- When this test fails ----
 *
 * It has found a key no product code asks for. Either delete it from BOTH
 * locales (the usual answer), or, if it is genuinely reached dynamically, add
 * its prefix to DYNAMIC_PREFIXES with a comment naming the construction site.
 * Do not add a key to the allowlist to silence the gate.
 */

/**
 * Prefixes whose keys are assembled at runtime from a template literal. Each
 * entry names the file that constructs it, which the honesty checks below
 * verify still does.
 */
const DYNAMIC_PREFIXES: { prefix: string; site: string; note?: string }[] = [
	{ prefix: 'build.role.', site: 'BuildSession.svelte', note: 'role of the step being built' },
	{ prefix: 'build.direction.', site: 'BuildSession.svelte', note: 'too high / too low nudge' },
	{ prefix: 'inversions.name.', site: 'InversionDrill.svelte', note: 'inversion index 0..3' },
	{ prefix: 'inversions.abbr.', site: 'InversionDrill.svelte', note: 'inversion index 0..3' },
	{ prefix: 'inversions.bassRole.', site: 'InversionDrill.svelte', note: 'scale degree in the bass' },
	{ prefix: 'progress.table.kind.', site: 'PracticeItemRow.svelte', note: 'chord / scale / interval' },
	{ prefix: 'progress.calibration.level.', site: 'ProgressStats.svelte', note: 'confidence level' },
	{
		prefix: 'progress.tier.',
		site: 'ProgressStats.svelte',
		/*
		 * Practice Settings renders `progress.tier.${currentTier}.name`. NOTE:
		 * the sibling `.blurb` half of this family (6 keys) is currently
		 * unreferenced. The visible tier blurbs come from `tiers.ts` as plain
		 * English data, not through t(), so `progress.tier.N.blurb` is dead
		 * copy that this prefix is shielding. It is left in place
		 * deliberately: whoever routes the blurbs through t() (which is the
		 * fix for them being English-only today) will want them. Removing
		 * them is a legitimate follow-up.
		 */
		note: 'tier id 1..6, .name half is live and .blurb half is pending translation wiring'
	},
	{ prefix: 'songs.preset.', site: 'SongManager.svelte', note: 'preset id, .note suffix' },
	{
		prefix: 'improvise.scale.name.',
		site: 'ImproviseGuide.svelte',
		note: 'ChordScaleId (dorian, mixolydian...)'
	},
	{
		prefix: 'improvise.scale.color.',
		site: 'ImproviseGuide.svelte',
		note: 'ChordScaleId, the mood one-liner per scale'
	}
];

/**
 * Keys that ARE dead and are NOT dynamic: they are simply awaiting removal.
 *
 * This is a quarantine, not an allowlist. It exists because these six keys sit
 * in domain files owned by other in-flight branches, so the sweep that found
 * them could not also delete them without a write conflict. They are titles and
 * subtitles for `/recall`, `/theory` and `/scales`, all of which are now 308
 * redirect shims with no page to put a title on, plus a footer button pointing
 * at the retired `/drills` route.
 *
 * Every entry is verified below to still exist in the catalog, so this list
 * cannot go stale: delete one of these keys from its dictionary and this test
 * fails until the entry is removed from here too. The list should only ever
 * shrink. Do not add to it to silence a new failure. That is what the message
 * on the main assertion is for.
 */
const KNOWN_UNUSED_PENDING_REMOVAL = [
	'recall.page.title',
	'recall.page.subtitle',
	'theory.page.title',
	'theory.footer.drillsButton',
	'scales.page.title',
	'scales.page.subtitle'
];

const I18N_DIR = import.meta.dirname;
const SRC_DIR = join(I18N_DIR, '..', '..');
const DICT_DIR = join(I18N_DIR, 'messages');

const DOMAINS: Record<string, Record<string, string>> = {
	chrome: chrome.en,
	recall: recall.en,
	build: build.en,
	drills: drills.en,
	songs: songs.en,
	theory: theory.en,
	scales: scales.en,
	progress: progress.en,
	'progress-hub': progressHub.en,
	home: home.en,
	progressions: progressions.en,
	inversions: inversions.en,
	voicings: voicings.en,
	'interval-view': intervalView.en,
	practice: practice.en,
	learn: learn.en,
	improvise: improvise.en
};

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

const isTestFile = (p: string) => /\.(test|spec)\.[cm]?ts$/.test(p);
const isDictFile = (p: string) => p.startsWith(DICT_DIR + sep) && !isTestFile(p);

/** Every product source file: components and routes, not tests, not the dictionaries. */
function productFiles(): { path: string; text: string }[] {
	return walk(SRC_DIR)
		.filter((p) => (p.endsWith('.svelte') || p.endsWith('.ts')) && !isTestFile(p) && !isDictFile(p))
		.map((p) => ({ path: relative(SRC_DIR, p), text: readFileSync(p, 'utf8') }));
}

const PRODUCT = productFiles();
const PRODUCT_TEXT = PRODUCT.map((f) => f.text).join('\n');

/** A key counts as used only in its quoted form, so comments do not count. */
function isReferenced(key: string, haystack = PRODUCT_TEXT): boolean {
	return haystack.includes(`'${key}'`) || haystack.includes(`"${key}"`) || haystack.includes(`\`${key}\``);
}

const coveredByAllowlist = (key: string) =>
	DYNAMIC_PREFIXES.some(({ prefix }) => key.startsWith(prefix));

describe('the unused-key scan itself works (guards against a vacuous pass)', () => {
	it('reads a plausible number of product source files', () => {
		expect(PRODUCT.length).toBeGreaterThan(50);
		expect(PRODUCT_TEXT.length).toBeGreaterThan(100_000);
	});

	it('excludes tests and the dictionaries from the product scan', () => {
		expect(PRODUCT.some((f) => isTestFile(f.path))).toBe(false);
		expect(PRODUCT.some((f) => f.path.includes(`i18n${sep}messages`))).toBe(false);
		// ...while still covering the surfaces that actually call t().
		expect(PRODUCT.some((f) => f.path.endsWith('+layout.svelte'))).toBe(true);
		expect(PRODUCT.some((f) => f.path.endsWith('PracticeChordDrill.svelte'))).toBe(true);
	});

	it('detects a live key as used and an invented key as unused (both directions)', () => {
		// Positive control: rendered by the masthead nav via `labelKey`.
		expect(isReferenced('nav.practice')).toBe(true);
		// Negative control: nothing can reference a key that does not exist.
		expect(isReferenced('nav.thisKeyDoesNotExist')).toBe(false);
	});

	it('does not count a bare prose mention as a reference', () => {
		const prose = 'the retired nav.drills label was removed in the consolidation';
		expect(isReferenced('nav.drills', prose)).toBe(false);
		expect(isReferenced('nav.drills', `t('nav.drills')`)).toBe(true);
	});
});

describe('no unused message keys', () => {
	it('every catalog key is referenced by product code or covered by the dynamic allowlist', () => {
		const quarantined = new Set(KNOWN_UNUSED_PENDING_REMOVAL);
		const unused: string[] = [];
		for (const [domain, dict] of Object.entries(DOMAINS)) {
			for (const key of Object.keys(dict)) {
				if (coveredByAllowlist(key) || quarantined.has(key)) continue;
				if (!isReferenced(key)) unused.push(`${domain}.ts  ${key}`);
			}
		}

		expect(
			unused,
			`These message keys are in the shipped catalog but no product code asks for them.\n` +
				`The dictionary is not tree-shaken, so each one is dead weight in the client bundle.\n` +
				`Delete them from BOTH en and fr, or (only if reached via a template literal) add\n` +
				`the prefix to DYNAMIC_PREFIXES in this file with the construction site named.\n\n` +
				unused.map((u) => `  ${u}`).join('\n')
		).toEqual([]);
	});

	it('agrees with the merged catalog (no domain silently skipped)', () => {
		const perDomain = Object.values(DOMAINS).reduce((n, d) => n + Object.keys(d).length, 0);
		expect(perDomain).toBe(Object.keys(messages.en).length);
	});
});

describe('the dynamic allowlist stays honest', () => {
	it('every allowlisted prefix has a real template-literal construction site in product code', () => {
		const missing = DYNAMIC_PREFIXES.filter(({ prefix }) => !PRODUCT_TEXT.includes(`\`${prefix}`)).map(
			({ prefix, site }) => `${prefix} (expected in ${site})`
		);
		expect(
			missing,
			`An allowlisted prefix is no longer built anywhere, so the keys it covers are\n` +
				`unreachable. Delete those keys and drop the allowlist entry:\n\n` +
				missing.map((m) => `  ${m}`).join('\n')
		).toEqual([]);
	});

	it('every allowlisted prefix still covers at least one real key', () => {
		const catalogKeys = Object.keys(messages.en);
		const stale = DYNAMIC_PREFIXES.filter(
			({ prefix }) => !catalogKeys.some((k) => k.startsWith(prefix))
		).map(({ prefix }) => prefix);
		expect(stale, `Stale allowlist entries covering no key: ${stale.join(', ')}`).toEqual([]);
	});

	it('every quarantined key still exists, so the list cannot go stale', () => {
		const catalogKeys = new Set(Object.keys(messages.en));
		const gone = KNOWN_UNUSED_PENDING_REMOVAL.filter((k) => !catalogKeys.has(k));
		expect(
			gone,
			`These keys have been deleted from their dictionaries. Remove them from\n` +
				`KNOWN_UNUSED_PENDING_REMOVAL in this file as well:\n\n` +
				gone.map((k) => `  ${k}`).join('\n')
		).toEqual([]);
	});

	it('no quarantined key has quietly come back into use', () => {
		// If a key on the removal list gets wired up again it is no longer
		// pending removal, and leaving it here would mask a future regression.
		const revived = KNOWN_UNUSED_PENDING_REMOVAL.filter((k) => isReferenced(k));
		expect(
			revived,
			`These keys are referenced by product code again. Drop them from ` +
				`KNOWN_UNUSED_PENDING_REMOVAL: ${revived.join(', ')}`
		).toEqual([]);
	});

	it('shields only a bounded slice of the catalog, so it cannot hide broad rot', () => {
		const shielded = Object.keys(messages.en).filter(coveredByAllowlist);
		// Currently 46 of ~600 keys. A large jump here means the allowlist is
		// being used to dodge the gate rather than to describe real dynamism.
		expect(shielded.length).toBeLessThan(80);
	});
});
