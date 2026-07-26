---
phase: 26-shared-intervalview-component
reviewed: 2026-07-24T21:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/components/IntervalView.svelte
  - src/lib/lookup/chordPresentation.ts
  - src/lib/i18n/messages/interval-view.ts
  - src/lib/i18n/messages/index.ts
  - src/routes/+page.svelte
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-07-24T21:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the shared `IntervalView` component, its `stackedThirdsFor`/`formulaFor` derivation in `chordPresentation.ts`, the new `interval-view` i18n domain, its merge into `messages/index.ts`, and the Lookup page's integration diff against `de4950b`.

Adversarial pass included: re-deriving `stackedThirdsFor`'s gap math by hand against several chord qualities (m7, maj7, dom7, ø7, °7, extended 9th), re-running the full targeted test suite (`intervalView.test.ts`, `chordPresentation.test.ts`, `messages.test.ts`, `coverage.test.ts`, `lookupWhyPanel.test.ts`, `lookup.e2e.test.ts` — 100/100 passed), re-running `svelte-check` (0 errors/0 warnings), verifying CSS-specificity of the toggle's active-segment ink-color override against `Button.svelte`'s default vermilion fill (confirmed the override wins: 3-selector override vs. 1-class base), tracing the REG-01 diff (`inspectFormulaEntry`/`handleInspect` untouched, only re-wired as `onInspectTone`), and confirming no `{@html}`, no hardcoded secrets, no dangerous patterns, and no em dashes in any user-facing copy.

No BLOCKER-level defects found. The stacked-thirds gap derivation, the formula-view byte-identical reproduction, the tap-to-inspect passthrough in both view modes, the reserved interval-color-token discipline (gap markers never colored, tone chips always colored by `role`), and the letters+solfège dual-naming carry-through are all implemented correctly and match their locked design contract (`26-UI-SPEC.md`). Two lower-severity items are worth surfacing below: one genuine (if spec-sanctioned) i18n asymmetry, and one code-duplication maintainability risk given this component is explicitly built for a second consumer (Phase 28).

## Warnings

### WR-01: Stacked view's root-tone label ("root") never localizes to French

**File:** `src/lib/components/IntervalView.svelte:42-45`
**Issue:** `displayLabel()` hardcodes the literal English string `'root'` for the root tone in stacked view, with no `t()` call and no locale branch:

```ts
function displayLabel(entry: FormulaEntry): string {
	if (view === 'stacked' && entry.role === 'root') return 'root';
	return entry.label;
}
```

Under `setLocale('fr')`, every other piece of chrome around this chip (toggle labels, aria strings, `formulaSentence`'s "À partir de la **fondamentale**...") switches to French — the project already has a French word for this exact concept (`FRENCH_DEGREE_NOUNS[1] = 'fondamentale'` in `src/lib/theory/interval.ts:69`, and `formulaSentence` in `chordPresentation.ts:145` uses it). But the stacked-view chip itself will keep showing the English word "root" in both locales, producing a visible EN/FR asymmetry: a French-locale user sees `["root", "Empilé"/"Formule" toggle, "tierce mineure" tooltips, ...]` all in French except this one chip label. `intervalView.test.ts` and `messages.test.ts`'s key-parity gate do not catch this because it's a raw string, never routed through the `t()`/message-dictionary layer at all.

This is technically spec-sanctioned: `26-UI-SPEC.md`'s "Root-tone label resolution" section explicitly locks this as a literal, non-localized `"root"` string (matching the design doc's literal stacked-view example). It is flagged here anyway because it's a real, user-visible i18n gap against the project's own general "full i18n consistency" convention (see `formulaSentence`'s French-locale test coverage), and the current implementation gives no way to override it later without another edit here — worth a deliberate accept/fix decision rather than an implicit one.

**Fix:** Either accept this explicitly (e.g. add a one-line comment citing the UI-SPEC decision so a future reviewer doesn't re-flag it as an oversight), or add a translated key and use it:

```ts
function displayLabel(entry: FormulaEntry): string {
	if (view === 'stacked' && entry.role === 'root') return t('interval-view.root-label');
	return entry.label;
}
```
with `'interval-view.root-label': 'root'` (EN) / `'racine'` or `'fondamentale'` (FR) added to `interval-view.ts`.

## Info

### IN-01: Four near-identical tone-rendering blocks risk drift on future edits

**File:** `src/lib/components/IntervalView.svelte:76-129`
**Issue:** The tone-chip markup (`IntervalChip` + letter span + solfège span, wrapped in either a `button.formula-tap` or a plain `div`) is duplicated four times: stacked+inspectable, stacked+inert, formula+inspectable, formula+inert. This component's own doc comment states it exists so "Phase 28's Learn hub can embed the same instance with zero changes" — but a future markup change (e.g. adding an octave badge, changing the tap wrapper, adjusting aria) now has four spots to update in lockstep. Missing one during a later edit (e.g. only updating the formula-mode blocks) would silently reintroduce a stacked/formula visual or accessibility mismatch that no current test would catch unless it happens to assert on the specific field that drifted.
**Fix:** Extract the shared tone-column markup into a Svelte 5 `{#snippet}` (e.g. `toneColumn(entry)`), parameterized by whether it's wrapped in a button, and call it from both the stacked and formula `{#each}` blocks:

```svelte
{#snippet toneColumn(entry: FormulaEntry)}
	<IntervalChip role={entry.role} label={displayLabel(entry)} longName={entry.longFr} />
	<span class="text-label font-mono">{entry.letter}</span>
	<span class="text-label font-mono">{entry.solfege}</span>
{/snippet}

{#each stacked.tones as entry, i (entry.role + entry.letter)}
	{#if onInspectTone}
		<button type="button" class="formula-tap interval-view__tone" aria-label={`Inspect ${entry.letter}`} onclick={() => onInspectTone(entry)}>
			{@render toneColumn(entry)}
		</button>
	{:else}
		<div class="interval-view__tone">{@render toneColumn(entry)}</div>
	{/if}
	...
{/each}
```

---

_Reviewed: 2026-07-24T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
