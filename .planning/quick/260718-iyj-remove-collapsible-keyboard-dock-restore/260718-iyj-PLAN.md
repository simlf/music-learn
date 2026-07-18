---
phase: quick-260718-iyj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/+layout.svelte
  - src/routes/+page.svelte
  - src/routes/theory/+page.svelte
  - src/routes/drills/+page.svelte
  - src/lib/components/ScaleKeyboardDrill.svelte
  - src/lib/components/RecallSession.svelte
  - src/lib/components/BuildSession.svelte
  - src/lib/components/KeyboardDock.svelte
  - src/lib/components/keyboardDock.test.ts
  - src/lib/keyboard/dockContext.svelte.ts
  - src/lib/keyboard/dockContext.svelte.test.ts
  - src/lib/keyboard/dockCollapse.ts
  - src/lib/keyboard/dockCollapse.test.ts
  - src/routes/lookupDock.test.ts
  - src/routes/theoryDock.test.ts
  - src/routes/drillsDock.test.ts
  - src/lib/components/scaleKeyboardDrill.test.ts
  - src/lib/components/recallSession.test.ts
  - src/lib/components/buildSession.test.ts
  - tests/lookup.e2e.test.ts
  - tests/theory.e2e.test.ts
  - tests/drills.e2e.test.ts
  - tests/practice.e2e.test.ts
  - tests/reveal-insight.e2e.test.ts
autonomous: true
requirements: [MEM-keyboard-inline-not-docked]
must_haves:
  truths:
    - Every keyboard-bearing page renders its keyboard inline in the page flow, never in a fixed/sticky/docked bar.
    - No fixed-position keyboard chrome appears at the bottom of any viewport on any route.
    - Keyboards only appear when the page actually needs one (Lookup only after a chord is looked up; Scales/Drills/Recall only while a question is active; Theory shows none).
    - npm test passes; npm run check passes.
  artifacts:
    - src/routes/+layout.svelte (no KeyboardDock, no dock registry)
    - src/routes/+page.svelte (inline keyboard restored in result block)
    - src/routes/drills/+page.svelte (inline keyboard, no dock)
    - src/lib/components/ScaleKeyboardDrill.svelte (inline key-strip)
    - src/lib/components/RecallSession.svelte (inline Mode A + formula-reveal keyboards)
    - src/lib/components/BuildSession.svelte (always-inline keyboard)
  key_links:
    - Layout no longer provides a dock registry, so no consumer may call getDockRegistry().
    - Deleting the dock modules must leave zero dangling imports/references in src or tests.
---

<objective>
Remove the phase-15 collapsible/docked bottom keyboard entirely and restore the pre-phase-15 behavior: every keyboard-bearing page renders its keyboard inline where the answer/inspect surface is, only when needed, never fixed/sticky at the viewport bottom.

Purpose: Honor the user's locked decision (memory: keyboard-inline-not-docked) that the docked keyboard was rejected. The dock was introduced across phase-15 plans 01-07 (commits 41fdeaa, c7ac097, 953996c, f2577dc, 5505561, 3231746, f57954e, 7c15f4c) and wired into 7 consumers plus the app shell.

Output: All dock infrastructure deleted, all six consumer surfaces rendering inline, all dock-referencing tests removed or converted to inline assertions, with npm test and npm run check green.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./.claude/CLAUDE.md

# The exact pre-dock inline markup for each consumer lives in the phase-15 conversion commits.
# Read these diffs to recover the exact original inline blocks that were removed:
#   git show 953996c -- src/routes/+page.svelte          (Lookup: original inline keyboard + register)
#   git show f2577dc -- src/routes/theory/+page.svelte   (Theory: keyboard was a NEW addition, not a relocation)
#   git show 5505561 -- src/lib/components/ScaleKeyboardDrill.svelte  (Scales: original inline key-strip position)
#   git show f57954e -- src/lib/components/RecallSession.svelte       (Recall: two removed inline PianoKeyboards)
#   git show 3231746 -- src/routes/drills/+page.svelte   (Drills: original inline sites)
#   git show 7c15f4c -- src/lib/components/BuildSession.svelte        (Build: dock-when-embedded seam)

@src/routes/+layout.svelte
@src/routes/+page.svelte
@src/lib/components/RecallSession.svelte
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restore inline keyboards in the route pages and unwire the app-shell dock</name>
  <files>src/routes/+layout.svelte, src/routes/+page.svelte, src/routes/theory/+page.svelte, src/routes/drills/+page.svelte</files>
  <action>
Unwire the dock from the app shell and restore inline keyboard rendering in the three route pages. Leave NO comments or identifiers referencing the removed dock in any edited file.

In `src/routes/+layout.svelte`: remove the `KeyboardDock` import, remove the `createDockRegistry`/`setDockRegistry` import and the two lines that create and provide the registry, and remove the `<KeyboardDock />` element. Replace the `.dock-clearance` wrapper div with a direct `{@render children()}` (no wrapper), and delete the `.dock-clearance` CSS rule. The masthead nav and streak logic stay untouched.

In `src/routes/+page.svelte` (Lookup): remove the `getDockRegistry` import, the `dockToken`/`dockRegistry` consts, the `onMount`/`onDestroy` blocks that register/clear the dock, and the `dockedKeyboard`/`dockedRegister` snippet definitions. Restore the keyboard inline inside the `{#if result}` block exactly where it lived pre-dock (see `git show 953996c` for the exact removed block): a `mt-6`-spaced `PianoKeyboard` bound to `result.notes`, `inspectable`, `onInspect={handleInspect}`, `showIntervalBadges`, immediately followed by `InspectRegister` bound to `inspectPayload`, placed just above the existing `SongHook`. Remove the `onMount`/`onDestroy` svelte import only if nothing else in the file uses them.

In `src/routes/theory/+page.svelte` (Theory): remove the docked keyboard entirely. Pre-phase-15 Theory had NO playable keyboard — it was a pure phase-15 addition (see `git show f2577dc`), so restoring previous behavior means Theory shows no keyboard at all. Remove the `getDockRegistry` import, `dockToken`/`dockRegistry`, `onMount`/`onDestroy` dock blocks, the `dockedKeyboard`/`dockedRegister` snippets, the `inspectPayload` state and `handleInspect` handler, and the now-unused `PianoKeyboard` and `InspectRegister` imports. Every existing ChordExample display keyboard, mnemonic aside, and lesson control stays unchanged.

In `src/routes/drills/+page.svelte` (Drills): the mode-aware keyboard snippet already renders inline in four question branches, gated behind a short-landscape check. Make it always inline. Remove the dock registration `$effect`, the `isShortLandscape` state and its matchMedia setup, the `dockInputRequired` derived value, the `getDockRegistry` import, and the `dockRegistry`/`dockToken` consts. At each of the four `{#if isShortLandscape} {@render dockedKeyboard()} {/if}` sites, drop the conditional wrapper so the keyboard renders unconditionally. Rename the kept snippet from `dockedKeyboard` to `inlineKeyboard` (definition plus all four render sites) so no "dock" naming lingers. Remove the `onMount`/`onDestroy` svelte import only if nothing else uses them.
  </action>
  <verify>
    <automated>test -z "$(grep -rnE 'getDockRegistry|createDockRegistry|setDockRegistry|DOCK_CONTEXT|DockRegistry|KeyboardDock|dock-clearance|isShortLandscape' src/routes/+layout.svelte src/routes/+page.svelte src/routes/theory/+page.svelte src/routes/drills/+page.svelte)" && npm run check</automated>
  </verify>
  <done>Layout no longer imports/mounts KeyboardDock or provides a dock registry; Lookup renders its keyboard + register inline inside the result block; Theory renders no keyboard; Drills renders its answer keyboard inline unconditionally in all four question branches. No dock identifiers remain in these four files. npm run check passes.</done>
</task>

<task type="auto">
  <name>Task 2: Restore inline keyboards in the Scales, Recall, and Build components</name>
  <files>src/lib/components/ScaleKeyboardDrill.svelte, src/lib/components/RecallSession.svelte, src/lib/components/BuildSession.svelte</files>
  <action>
Convert the three interactive components from dock registration back to inline rendering. Leave NO comments or identifiers referencing the removed dock.

In `src/lib/components/ScaleKeyboardDrill.svelte`: remove the `getDockRegistry` import, the `dockToken`/`dockRegistry` consts, and the register/clear `$effect`. In `onDestroy`, keep the `clearTimeout(wrongTimer)` call but remove the `dockRegistry.clear(dockToken)` call. Keep the `keyStrip` snippet definition and render it inline via `{@render keyStrip()}` inside the existing `{:else}` (drill not done) block, immediately after the register `<p>`, wrapped in a `mt-2`-spaced container so the strip only shows while a drill is active (see `git show 5505561` for the exact original inline position where the `scroll-wrap mt-2` div sat).

In `src/lib/components/RecallSession.svelte`: remove the `getDockRegistry` import, the `dockRegistry`/`dockToken` consts, the dock registration `$effect`, and the entire mode-aware `dockedKeyboard` snippet block. Restore the two original inline PianoKeyboards that the dock removed (see `git show f57954e` for their exact removed markup):
1. Mode A (`see-play`, chord-formula): inside that branch, after the `recall-prompt` block and before `{#if !modeAAnswered}`, re-add the `modeAWrong` `{@const}` and a `mt-4`-spaced interactive `PianoKeyboard` (notes = `modeAWrong ? target.notes : []`, `interactive`, `selected={selected}`, `onToggle={toggleModeAKey}`, `onPress={pressModeAKey}`, `wrongLetters={modeAWrong ? extraLettersPlayed : undefined}`).
2. Formula-mode reveal (chord-formula): inside the reveal `stamp` block, after the formula-chips `{#each formulaFor(chord) ...}{/each}`, re-add a `mt-4`-spaced display `PianoKeyboard` bound to `chord.notes`.
Do NOT add any keyboard to Mode B (`hear-name`): that inspectable board was a dock-era addition and had no pre-dock inline equivalent, so restoring previous behavior means hear-name has no keyboard. Remove the `onMount`/`onDestroy` svelte import only if nothing else in the file still uses them.

In `src/lib/components/BuildSession.svelte`: remove the `getDockRegistry` import, the `dockRegistry`/`buildDockToken`/`shouldDock` values, the dock register/clear `$effect`, and the dock-clear line in `onDestroy`. Remove the `untrack` import only if it is no longer used anywhere else in the file. Keep the `buildKeyboard` snippet and change its render site from `{#if !shouldDock} {@render buildKeyboard()} {/if}` to an unconditional `{@render buildKeyboard()}`, so the constructable keyboard always renders inline — including when BuildSession is embedded in Recall's Mode C, where it now appears inline within the Recall page flow. The `embedFact`/`onComplete` embedding seam and every other Build behavior stay unchanged.
  </action>
  <verify>
    <automated>test -z "$(grep -rnE 'getDockRegistry|createDockRegistry|DOCK_CONTEXT|DockRegistry|dockRegistry|dockToken|buildDockToken|shouldDock|dockedKeyboard' src/lib/components/ScaleKeyboardDrill.svelte src/lib/components/RecallSession.svelte src/lib/components/BuildSession.svelte)" && npm run check</automated>
  </verify>
  <done>Scales renders its key-strip inline while a drill is active; Recall renders the Mode A input keyboard and the formula-reveal keyboard inline (and no hear-name keyboard); Build renders its keyboard inline in both standalone and embedded contexts. No dock identifiers remain in these three files. npm run check passes.</done>
</task>

<task type="auto">
  <name>Task 3: Delete dock infrastructure and purge dock references from all tests</name>
  <files>src/lib/components/KeyboardDock.svelte, src/lib/components/keyboardDock.test.ts, src/lib/keyboard/dockContext.svelte.ts, src/lib/keyboard/dockContext.svelte.test.ts, src/lib/keyboard/dockCollapse.ts, src/lib/keyboard/dockCollapse.test.ts, src/routes/lookupDock.test.ts, src/routes/theoryDock.test.ts, src/routes/drillsDock.test.ts, src/lib/components/scaleKeyboardDrill.test.ts, src/lib/components/recallSession.test.ts, src/lib/components/buildSession.test.ts, tests/lookup.e2e.test.ts, tests/theory.e2e.test.ts, tests/drills.e2e.test.ts, tests/practice.e2e.test.ts, tests/reveal-insight.e2e.test.ts</files>
  <action>
Delete the dock modules and the dock-only test files, then convert the remaining tests that used the dock harness back to inline assertions.

Delete these files entirely (they only exist to support the dock): `src/lib/components/KeyboardDock.svelte`, `src/lib/components/keyboardDock.test.ts`, `src/lib/keyboard/dockContext.svelte.ts`, `src/lib/keyboard/dockContext.svelte.test.ts`, `src/lib/keyboard/dockCollapse.ts`, `src/lib/keyboard/dockCollapse.test.ts`, `src/routes/lookupDock.test.ts`, `src/routes/theoryDock.test.ts`, `src/routes/drillsDock.test.ts`.

Then fix the component and e2e tests that render `KeyboardDock` alongside the page and supply a `createDockRegistry()` via the render `context` option. In each, drop the `KeyboardDock` import, the `createDockRegistry`/`DOCK_CONTEXT_KEY`/`DockRegistry` imports, the extra `render(KeyboardDock, { context })` call, and the `context` map — render the component/page directly. The keyboard keys and register lines now live in the component's own DOM, so existing `getByRole`/`getByLabelText`/`getByText` queries for keys, register text, and tap targets resolve against the single rendered component. Apply this to: `src/lib/components/scaleKeyboardDrill.test.ts`, `src/lib/components/recallSession.test.ts`, `src/lib/components/buildSession.test.ts`, `tests/lookup.e2e.test.ts`, `tests/theory.e2e.test.ts`, `tests/drills.e2e.test.ts`, `tests/practice.e2e.test.ts`, `tests/reveal-insight.e2e.test.ts`. For `tests/theory.e2e.test.ts`: since Theory no longer has any keyboard, delete any assertions that expect a Theory keyboard/register rather than re-pointing them inline. Adjust or drop any assertion that specifically asserted docked/collapsed chrome behavior (collapse handle, fixed positioning) — that behavior is gone by design.
  </action>
  <verify>
    <automated>test -z "$(grep -rnE 'getDockRegistry|createDockRegistry|setDockRegistry|DOCK_CONTEXT|DockRegistry|KeyboardDock|dockContext|dockCollapse|keyboard-dock|--dock-height|dock-clearance|dockedKeyboard' src/ tests/)" && npm run check && npm test</automated>
  </verify>
  <done>All nine dock files are deleted; no dock identifiers remain anywhere in src/ or tests/; every converted test renders its component/page inline; npm run check and npm test both pass green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No new trust boundary is introduced or changed. This change is a client-side UI refactor that removes code (a fixed-position keyboard chrome and its context plumbing) and relocates existing rendering inline. No new input parsing, network, storage, or auth surface.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-KBD-01 | Tampering | Removed persistence key (dockCollapse localStorage flag) | low | accept | The `music-learn:*` collapsed-state flag is orphaned after deletion; it is a boolean UI preference with no security relevance. No migration/cleanup needed. |
| T-KBD-02 | Denial of Service | Regression from dead imports after module deletion | low | mitigate | Task 3's `grep` gate plus `npm run check` and `npm test` fail the plan if any dangling dock reference or broken render remains. |

No package installs in this plan; the package-legitimacy gate does not apply.
</threat_model>

<verification>
- `grep -rnE 'getDockRegistry|createDockRegistry|setDockRegistry|DOCK_CONTEXT|DockRegistry|KeyboardDock|dockContext|dockCollapse|keyboard-dock|--dock-height|dock-clearance|dockedKeyboard' src/ tests/` returns no matches.
- The nine dock files listed in Task 3 no longer exist.
- `npm run check` passes (no type or Svelte-compile errors).
- `npm test` passes (vitest run, full suite green).
- Manual sanity (optional): no fixed bar appears at the bottom of any route; Lookup shows a keyboard only after a lookup; Scales/Drills/Recall show a keyboard inline only while a question is active; Theory shows none.
</verification>

<success_criteria>
- Every keyboard-bearing page renders its keyboard inline in the page flow; nothing is fixed/sticky/docked at the viewport bottom.
- Keyboards appear only when the page needs one (Theory shows none, matching pre-phase-15 behavior).
- All dock infrastructure and dock-only tests are deleted with zero dangling references.
- `npm test` and `npm run check` are green.
</success_criteria>

<output>
Create `.planning/quick/260718-iyj-remove-collapsible-keyboard-dock-restore/260718-iyj-SUMMARY.md` when done.
</output>