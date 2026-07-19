---
phase: quick-260718-iyj
plan: 01
subsystem: ui-keyboard
tags: [svelte, keyboard, dock-removal, inline-rendering]
requires: []
provides:
  - Inline keyboard rendering on every keyboard-bearing page (Lookup, Drills, Scales, Recall, Build)
  - Zero dock infrastructure in src/ (KeyboardDock, dockContext, dockCollapse deleted)
affects:
  - src/routes/+layout.svelte
  - src/routes/+page.svelte
  - src/routes/theory/+page.svelte
  - src/routes/drills/+page.svelte
  - src/lib/components/ScaleKeyboardDrill.svelte
  - src/lib/components/RecallSession.svelte
  - src/lib/components/BuildSession.svelte
tech-stack:
  added: []
  patterns:
    - Keyboards render inline in the page flow, only while the page needs one; never fixed/sticky chrome
key-files:
  created: []
  modified:
    - src/routes/+layout.svelte
    - src/routes/+page.svelte
    - src/routes/theory/+page.svelte
    - src/routes/drills/+page.svelte
    - src/lib/components/ScaleKeyboardDrill.svelte
    - src/lib/components/RecallSession.svelte
    - src/lib/components/BuildSession.svelte
    - src/lib/components/scaleKeyboardDrill.test.ts
    - src/lib/components/recallSession.test.ts
    - src/lib/components/buildSession.test.ts
    - tests/lookup.e2e.test.ts
    - tests/theory.e2e.test.ts
    - tests/drills.e2e.test.ts
    - tests/practice.e2e.test.ts
    - tests/reveal-insight.e2e.test.ts
  deleted:
    - src/lib/components/KeyboardDock.svelte
    - src/lib/components/keyboardDock.test.ts
    - src/lib/keyboard/dockContext.svelte.ts
    - src/lib/keyboard/dockContext.svelte.test.ts
    - src/lib/keyboard/dockCollapse.ts
    - src/lib/keyboard/dockCollapse.test.ts
    - src/routes/lookupDock.test.ts
    - src/routes/theoryDock.test.ts
    - src/routes/drillsDock.test.ts
decisions:
  - Theory page has no keyboard at all after the removal (the docked board was a pure phase-15 addition, not a relocation)
  - Recall Mode B (hear-name) has no keyboard after the removal (its inspectable board was dock-era only)
  - Lookup register idle text reverts to the pre-dock default "Tap a key to inspect it."
metrics:
  duration: 18 min
  tasks: 3
  files: 26
  completed: 2026-07-18
status: complete
---

# Quick Task 260718-iyj: Remove Collapsible Keyboard Dock, Restore Inline Keyboards Summary

Deleted the phase-15 docked bottom keyboard entirely and restored inline, only-when-needed keyboard rendering on all six consumer surfaces, honoring the locked keyboard-inline-not-docked decision.

## What Was Done

### Task 1: Route pages and app shell (commit 260f9af)
- `+layout.svelte`: removed KeyboardDock mount, dock registry creation/provisioning, and the `.dock-clearance` wrapper and CSS; children render directly.
- Lookup (`+page.svelte`): keyboard + InspectRegister restored inline inside the `{#if result?.recognized}` block, just above SongHook, exactly matching the pre-dock markup from commit 953996c.
- Theory: docked keyboard removed with no replacement (pre-phase-15 Theory had no playable keyboard); removed the now-unused inspect state and PianoKeyboard/InspectRegister imports. ChordExample display keyboards untouched.
- Drills: the mode-aware keyboard snippet renamed `dockedKeyboard` to `inlineKeyboard` and rendered unconditionally in all four question branches; removed the dock registration effect, `isShortLandscape` matchMedia gate, and `dockInputRequired`.

### Task 2: Interactive components (commit eb76747)
- ScaleKeyboardDrill: key-strip renders inline in an `mt-2` container inside the not-done branch, immediately after the register line; registry effect and dock-clear removed from onDestroy.
- RecallSession: restored the two pre-dock inline PianoKeyboards (Mode A interactive input board; formula-reveal display board after the formula chips). Mode B (hear-name) intentionally has no keyboard.
- BuildSession: `buildKeyboard` renders unconditionally (standalone and embedded in Recall Mode C); dock registry, `shouldDock`, and dock-clear removed.

### Task 3: Infrastructure deletion and test conversion (commit 9108219)
- Deleted all nine dock files (component, context, collapse module, and their six test suites).
- Converted 8 remaining test files to render components/pages directly with no dock harness; dock-registration coverage replaced with inline-keyboard coverage; Theory e2e needs no keyboard assertions.

## Verification

- `grep -rE '(dock identifiers)' src/ tests/` returns zero matches.
- All nine dock files deleted.
- `npm run check`: 0 errors, 0 warnings (1294 files).
- `npm test`: 73 files, 1020 tests, all passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Concurrent-session git stash swept up Task 2 working-tree edits**
- **Found during:** Task 2 commit
- **Issue:** A concurrent executor session (phase 18-02, same working directory) ran `git stash && npm test`, stashing this task's uncommitted Task 2 edits mid-flight.
- **Fix:** Restored only this task's three component files from the stash via `git checkout stash@{0} -- <files>` (leaving the stash intact for the other session), verified, and committed. The other session later popped its stash cleanly.
- **Files modified:** src/lib/components/{ScaleKeyboardDrill,RecallSession,BuildSession}.svelte
- **Commit:** eb76747

**2. [Rule 3 - Blocking] Preserved concurrent session's `listSongs` mock additions in shared e2e files**
- **Found during:** Task 3
- **Issue:** The concurrent 18-02 session had uncommitted `listSongs` additions to the `$lib/practice/songs` mock in tests/drills.e2e.test.ts, tests/practice.e2e.test.ts, and tests/reveal-insight.e2e.test.ts, required for tests to pass at current HEAD (18-02's committed page changes).
- **Fix:** Kept those hunks in place; they are included in commit 9108219 alongside this task's dock-harness removal.
- **Commit:** 9108219

**Notes:**
- `src/routes/drillsSongFilter.test.ts` (the concurrent session's untracked WIP) initially referenced the deleted dock modules, but that session converged and removed those references itself before this task needed to intervene. The file was never staged or committed by this task.
- The plan's Task 3 file list included `src/lib/components/songFilterToggle.test.ts` context exclusions; the two SongFilterToggle files named in the constraints were never touched or staged.

## Known Stubs

None.

## Threat Flags

None. This change removes client-side UI code only; no new network, storage, auth, or parsing surface. The orphaned `music-learn:*` dock-collapse localStorage flag is accepted per the plan's threat register (T-KBD-01).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 260f9af | Restore inline keyboards in route pages, unwire app-shell dock |
| 2 | eb76747 | Restore inline keyboards in Scales, Recall, and Build components |
| 3 | 9108219 | Delete dock infrastructure and purge dock references from tests |

## Self-Check: PASSED

All claimed files verified on disk, all nine dock files confirmed deleted, all three task commits present in git history.
