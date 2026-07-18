---
phase: 20-french-translation
reviewed: 2026-07-18T20:20:38Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/i18n/locale.svelte.ts
  - src/lib/i18n/messages/index.ts
  - src/lib/i18n/messages/chrome.ts
  - src/lib/components/LocaleToggle.svelte
  - src/routes/+layout.svelte
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
fixed_at: 2026-07-18
fix_status: 3_resolved_1_accepted (WR-01, WR-03, WR-04, IN-01 resolved; WR-02 accepted as a trade-off, no code change)
---

# Phase 20: Code Review Report — i18n Foundation

**Reviewed:** 2026-07-18T20:20:38Z
**Depth:** standard (targeted architectural review per reviewer brief)
**Files Reviewed:** 5
**Status:** issues_found (no CRITICAL/HIGH; 4 MEDIUM, 1 LOW) — fixed 2026-07-18: WR-01, WR-03, WR-04, IN-01 resolved; WR-02 accepted as-is

## Summary

Reviewed the i18n architectural core: the reactive `$state`-backed locale store, the domain-dict merge/`t()` accessor, one representative dictionary (`chrome.ts`), the `LocaleToggle` component, and the root layout's wiring. The core mechanism is sound: `current` is a genuine module-level Svelte 5 rune (`locale.svelte.ts`), every call site reads it directly inside template expressions (never destructured into a stale snapshot), `setLocale`/`initLocale` are both `browser`-guarded and wrapped in `try/catch`, persisted values are validated against a strict `'en' | 'fr'` literal check before being applied (no arbitrary-string injection into `current`), and no reviewed file uses `{@html}` with translated content — all `t()` output goes through Svelte's auto-escaping text/attribute interpolation, so there is no XSS surface in this foundation.

No CRITICAL or HIGH-severity defects were found. Four MEDIUM-severity gaps affect correctness/robustness at the margins (a real but largely-unavoidable FOUC given static prerendering, a stale `<html lang>` attribute after toggling, an untyped `t()` key argument with no usage-vs-catalog safety net, and an ARIA "Label in Name" mismatch on the toggle buttons), plus one LOW-severity architectural fragility (silent key-collision risk in the 9-way dictionary merge). None of these are data-loss or security risks; all are concrete and independently verifiable in the reviewed files.

## Warnings

### WR-01: `<html lang>` never updates when the locale is toggled — RESOLVED

**Fixed:** `setLocale` now sets `document.documentElement.lang = value` (browser-guarded, same path as the localStorage persistence), and `initLocale` sets it too when a persisted locale is applied at hydration. `src/app.html` keeps `lang="en"` as the deterministic prerender default; only the runtime sync was added. See `src/lib/i18n/locale.svelte.ts`.

**File:** `src/app.html:2` (cross-referenced against `src/lib/i18n/locale.svelte.ts` and `src/routes/+layout.svelte`, neither of which touches `document.documentElement.lang`)
**Issue:** `app.html` hardcodes `<html lang="en">`. This is correct for the deterministic SSR/prerender default (matches `current`'s default of `'en'`, per `locale.svelte.ts:19`), but nothing in the reviewed i18n core ever updates it after `setLocale('fr')` runs. After a user toggles to French, all visible text switches correctly (reactive `t()`), but the document's `lang` attribute stays `"en"` indefinitely. This is a real, verifiable defect: screen readers will keep using English pronunciation/voice rules for French text, and any tooling that keys off `lang` (spellcheck, browser translate prompts, `:lang()` CSS selectors) will misbehave.
**Fix:** Add a reactive effect that syncs the attribute whenever the locale changes, e.g. in `src/routes/+layout.svelte`:
```svelte
<script lang="ts">
	import { browser } from '$app/environment';
	// ...
	$effect(() => {
		if (browser) document.documentElement.lang = currentLocale();
	});
</script>
```
(Import `currentLocale` alongside the existing `initLocale, t` import on line 9.)

### WR-02: Flash of English before the persisted French locale applies (FOUC) — ACCEPTED

**Decision:** Accepted as-is. The FOUC is an inherent trade-off of `adapter-static` prerendering plus client-side-only locale persistence; moving `initLocale()` earlier than `onMount` would reintroduce the exact hydration mismatch its own doc comment is designed to avoid, trading a worse defect for a cosmetic one. No code change made for this finding.

**File:** `src/lib/i18n/locale.svelte.ts:52-60` (`initLocale`), called from `src/routes/+layout.svelte:36` inside `onMount`
**Issue:** Because `current` defaults to `'en'` (line 19) and `initLocale()` only runs inside the root layout's `onMount` — which fires *after* the initial client render/hydration pass completes — a returning French-preferring user will see a brief flash of English chrome/nav text on every full page load before the store corrects itself to `'fr'`. This is a real, user-visible defect, though it is largely a deliberate and defensible trade-off for `adapter-static`: correcting the locale earlier (e.g. synchronously at module scope, before hydration) would make the client's first render diverge from the server-rendered English HTML and risk a Svelte hydration mismatch — the exact problem `initLocale`'s doc comment (lines 46-51) is designed to avoid. Given the project is genuinely static (no per-request server, so no cookie-based SSR personalization is possible), full elimination isn't achievable without added complexity.
**Fix:** If the flash is judged worth reducing, the standard mitigation for static+client-persisted locale is a small blocking inline `<script>` in `app.html` that reads `localStorage` and toggles a `data-locale-ready` attribute/class the CSS can key off of (hiding text nodes until corrected), rather than moving `initLocale()` itself earlier (which would reintroduce the mismatch this design already correctly avoids). At minimum, confirm with the user that this trade-off is accepted as-is; it is not obviously a bug, but it is a real behavior worth flagging per the review brief.

### WR-03: `t()`'s key parameter is an untyped `string`, so misspelled keys silently leak into production UI — RESOLVED

**Fixed:** Added `export type MessageKey = keyof typeof messages.en` in `src/lib/i18n/locale.svelte.ts` and typed `t(key: MessageKey)`. Every domain dict (`chrome.ts`, `build.ts`, `drills.ts`, `home.ts`, `progress.ts`, `recall.ts`, `scales.ts`, `songs.ts`, `theory.ts`) and the merged `messages/index.ts` export switched from `: LocaleDict` to `satisfies LocaleDict`, which validates against the interface without widening literal keys to `Record<string, string>`.

Call sites that build a key from runtime data via a template literal mostly type-checked without changes, because the underlying value is itself already a narrow literal union (`build.role.${step.role}`, `progress.tier.${current.id}.name`, `progress.table.kind.${item.kind}`). A few needed a targeted fix, documented at each site:
- `src/lib/components/BuildSession.svelte:840-842` — `feedback.direction` is an optional field not narrowed by the discriminated `kind` check, so the template literal admits a `"...undefined"` variant; cast `as MessageKey`.
- `src/routes/songs/+page.svelte:281` — `preset.presetId` is a plain `string` in `presets.ts`; cast `as MessageKey`.
- `src/routes/theory/+page.svelte` — `SEVENTH_SHAPES`/`ANCHOR_CHORDS` data arrays' `captionKey` field is now explicitly typed as `MessageKey` at declaration (catches a bad key at the data definition instead of the render call site).
- `src/routes/+layout.svelte` — `navLinks`' `labelKey` field is now explicitly typed as `MessageKey[]`.
- `src/lib/i18n/coverage.test.ts` — the whole-catalog `Object.keys(messages.en)` loop and the representative-key `sample` array are typed via `MessageKey[]`.

`npm run check` (0 errors) and `npm test` (1189 tests passed) both verified clean after the change. No runtime behavior changed for valid keys.

**File:** `src/lib/i18n/locale.svelte.ts:69`
**Issue:** `export function t(key: string): string` accepts any string, not a union of the dictionary's actual keys. Combined with the fallback chain on line 71 (`messages[lang][key] ?? messages.en[key] ?? key`), a typo'd call site (e.g. `t('nav.drils')`) does not fail to compile, does not throw at runtime, and is not caught by `coverage.test.ts` / `messages.test.ts` — both of those tests only assert properties of the *merged catalog itself* (key parity between `en`/`fr`, no key resolving to its own name); neither scans call sites in the 8+ surface files for `t('some.key')` usages that don't exist in the catalog. The only safety net is an incidental one: a page that happens to have an exact-text assertion in a test file. Any surface/string added without such an assertion could ship a raw key string (e.g. literally rendering `nav.drils` to the user) with zero test failure.
**Fix:** Constrain the key parameter to the actual key space so typos become compile errors:
```ts
export type MessageKey = keyof typeof messages.en;

export function t(key: MessageKey): string {
	const lang = current;
	return messages[lang][key] ?? messages.en[key] ?? key;
}
```
This requires `messages.en`'s object literal to be built from `as const`-typed domain dicts (or the `LocaleDict` interface tightened per-domain) so `keyof typeof messages.en` resolves to a real literal-key union rather than widening to `string`. If that refactor is too invasive for this phase, a lower-cost interim mitigation is a build-time or test-time grep asserting every `t\(['"]([^'"]+)['"]\)` call site string exists in `Object.keys(messages.en)`.

### WR-04: `LocaleToggle`'s accessible name doesn't contain its visible label (WCAG 2.5.3 Label-in-Name mismatch) — RESOLVED

**Fixed:** `chrome.ts`'s `locale.aria.en`/`locale.aria.fr` entries now include the visible token: `'EN, English'` / `'FR, Français'` (en) and `'EN, anglais'` / `'FR, français'` (fr), so the accessible name contains "EN"/"FR" in both locales. Segmented `aria-pressed` semantics in `LocaleToggle.svelte` are unchanged.

**File:** `src/lib/components/LocaleToggle.svelte:19-36`
**Issue:** Each button's visible text is `EN` / `FR` (lines 26, 34), but each also sets an `aria-label` (`t('locale.aria.en')` → "Language: English", `t('locale.aria.fr')` → "Language: Français", lines 23, 32). Per ARIA accessible-name computation, `aria-label` takes precedence over text content entirely, so the button's accessible name contains neither "EN" nor "FR" anywhere. This fails WCAG 2.5.3 (Label in Name): a voice-control or switch-access user saying "click EN" has no matching accessible name to target.
**Fix:** Include the visible label inside the accessible name, e.g. change the `fr`/`en` dictionary entries in `chrome.ts` to include the visible glyph (`'locale.aria.en': 'EN — English'`) or, simpler, drop the `aria-label` overrides and instead rely on the visible "EN"/"FR" text plus the group's `aria-label="Language"` (line 18) for context, letting each button's accessible name be exactly its visible text.

## Info

### IN-01: Silent duplicate-key risk in the 9-way dictionary merge — RESOLVED

**Fixed:** Added a collision-guard test in `src/lib/i18n/messages.test.ts` (`describe('domain dictionary key collisions (I18N-02)')`) that imports all nine domain dicts directly and asserts their `en` key sets are pairwise disjoint, plus a merged-size-equals-sum-of-domains sanity check. A future domain addition that reuses an existing key now fails this test immediately instead of silently dropping a key at merge time.

**File:** `src/lib/i18n/messages/index.ts:28-51`
**Issue:** The merged `messages.en`/`messages.fr` objects are built via `{ ...chrome.en, ...recall.en, ...build.en, ... }`. If any two of the nine domain files ever define the same key (verified: currently zero collisions across all 9 files), the later spread silently wins with no warning, no test failure, and no error — a real key from one domain could be silently shadowed by an unrelated domain's value. The only protection today is convention (each domain prefixes its keys, e.g. `build.*`, `drills.*`) rather than an enforced invariant.
**Fix:** Add a cheap guard, either as a runtime assertion in `index.ts` or a unit test, e.g.:
```ts
function assertNoCollisions(...dicts: Record<string, string>[]): void {
	const seen = new Set<string>();
	for (const dict of dicts) {
		for (const key of Object.keys(dict)) {
			if (seen.has(key)) throw new Error(`Duplicate i18n key across domains: ${key}`);
			seen.add(key);
		}
	}
}
```
run once at module load (or in a test) against the nine `.en` dicts (fr key set is already asserted identical elsewhere).

---

_Reviewed: 2026-07-18T20:20:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
