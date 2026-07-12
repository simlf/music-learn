---
phase: 01-print-shop-foundation-theory-core
verified: 2026-07-12T23:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 1: Print Shop Foundation & Theory Core Verification Report

**Phase Goal:** The app has its "Print Shop" visual identity and interval color language in
place, and a pure, unit-tested music-theory engine correctly spells every v1 chord across all
12 roots with dual letter/solfège naming.
**Verified:** 2026-07-12T23:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

**Note on Mode:** `01-SKELETON.md`/ROADMAP.md marks this phase `mode: mvp`, but the ROADMAP
Goal text is written declaratively (not the `As a ... I want to ... so that ...` user-story
format required for MVP-mode narrowing). `gsd_run query user-story.validate` would fail this
goal. Standard goal-backward verification was used instead — it is a strict superset of what
MVP User Flow Coverage would check here, since the 5 explicit Success Criteria already cover
every observable behavior end to end. This is a process note, not a phase gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | For any supported symbol (maj/min/dim triads, maj7, m7, dom7, ø7/m7♭5, °7/dim7) across all 12 roots, the app returns correct notes (SC1, THEORY-01) | ✓ VERIFIED | `src/lib/theory/reference-chords.test.ts` encodes a 96-cell matrix (12 roots × 8 qualities). Independently re-derived every cell directly from `tonal`'s `Chord.get()` output via a standalone node script — matches the reference matrix exactly (spot-checked C/Db/F♯/G/B roots × all 8 qualities). `npx vitest run src/lib/theory` → 121/121 passing. |
| 2 | Same chord in different jazz spellings (Cm7/C-7/Cmin7; Cø7/Cm7♭5; C°7/Cdim7) resolves to identical notes (SC2, THEORY-02) | ✓ VERIFIED | `chord.test.ts` asserts `spellChord('Cm7').notes === spellChord('C-7').notes === spellChord('Cmin7').notes`, and `Cø7 === Cm7♭5`, `C°7 === Cdim7`. Also proven visually: e2e test asserts the alias line renders `Cm7` and `C-7` together when `C-7` is typed. All passing. |
| 3 | Notes spelled one letter per scale degree from root + interval formula; F♯m7 shows C♯ not D♭ (SC3, THEORY-03) | ✓ VERIFIED | `chord.ts` reads `tonal`'s spelled `notes` directly (never re-derives pitch classes), converting ASCII accidentals to display glyphs only. Explicit test: `F♯m7` letters contain `C♯` and exclude `D♭` (both unit test and reference-matrix anchor case). Diminished-chord double-flat spellings (e.g. `Cdim7 → C E♭ G♭ B♭♭`) verified as tonal's actual raw parser output, not fabricated data. |
| 4 | Every note displayed with letter name primary and Do-Ré-Mi solfège alongside (SC4, THEORY-04) | ✓ VERIFIED | `SpelledNote.solfege` populated via `letterToSolfege()` for every note; unit tests assert every note in `Cm7`/`F♯m7` has a nonempty letter and a solfège in {Do,Ré,Mi,Fa,Sol,La,Si}. UI: `NoteLabel.svelte` renders both; `PianoKeyboard` and the interval-formula readout both show letter+solfège. e2e test asserts `C` and `Do` both render beneath the R chip for Cm7. |
| 5 | Interface renders in Print Shop direction (paper ground, ink borders, vermilion/mustard, sharp corners) with root/3rd/5th/7th in fixed interval colors (SC5, DESIGN-01/02) | ✓ VERIFIED | `src/app.css` declares the full palette + `--color-root/-third/-fifth/-seventh` semantic aliases + global `border-radius: 0 !important`. `ChordGlyph.svelte` has the `aria-hidden` misregistered vermilion shadow; `Button.svelte` has primary/ghost + offset-shadow press states; `PianoKeyboard.svelte` maps `role` → the four fixed color classes consistently; `IntervalChip.svelte` uses the same four tokens. Component test (`components.test.ts`) and e2e test both assert the four role-color classes appear on the keyboard for a rendered chord. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/theory/chord.ts` | `spellChord(symbol)` → typed `ChordResult` | ✓ VERIFIED | Exports `spellChord`, pure (no svelte/$app/DOM/audio imports — grep confirms), wraps `tonal.Chord.get`, normalizes accidentals + `ø`/`ø7`, tags interval role from tonal's degree number, attaches solfège. |
| `src/lib/theory/solfege.ts` | `letterToSolfege(letter)` mapping | ✓ VERIFIED | Degree-based mapping for all 7 letters, accidental-agnostic. |
| `src/lib/theory/types.ts` | `ChordResult`, `SpelledNote`, `IntervalRole` | ✓ VERIFIED | All three types present with the exact fields specified in the plan. |
| `src/lib/theory/reference-chords.test.ts` | 96-cell matrix test | ✓ VERIFIED | 96 cells (12 roots × 8 qualities) plus an F♯m7 anchor case; independently cross-checked against tonal's raw output. |
| `src/app.css` | `@theme` with 4 interval-color aliases + base palette + `border-radius:0` | ✓ VERIFIED | All tokens present: root/third/fifth/seventh, on-fill pairs, spacing scale, 4 typography roles, global sharp-corner rule. |
| `src/lib/components/PianoKeyboard.svelte` | display-only keyboard, spelled notes + role highlight | ✓ VERIFIED | Two-octave (15 white key) span, no click/keydown handlers, position-ordered note-to-key assignment (bug-fixed during Plan 03 per its own SUMMARY), role-colored highlight classes, `NoteLabel` dual naming on each highlighted key. |
| `src/lib/components/NoteLabel.svelte`, `ChordGlyph.svelte`, `Button.svelte`, `IntervalChip.svelte` | Print Shop primitives | ✓ VERIFIED | All four exist, `svelte-check` reports 0 errors, structural checks (aria-hidden shadow, primary/ghost variants, role→token mapping) all confirmed by direct file read. |
| `src/routes/showcase/+page.svelte` | Full showcase wiring | ✓ VERIFIED | Input → `spellChord` → `ChordGlyph` stamp + `PianoKeyboard` + `IntervalChip` formula + alias line + empty state + error bar + surprise-me + hear-it, all present and wired (not hardcoded stubs). |
| `src/lib/audio/playChord.ts`, `src/lib/theory/randomChord.ts`, `src/lib/copy/hints.ts` | D-10/D-11/D-08 support modules | ✓ VERIFIED | All three exist, exported, and wired into the showcase page; `playChord` gated behind user gesture (`Tone.start()` inside the async handler called from a click); `randomChord` draws only from the proven 12×8 space; `pickHint` avoids immediate repeats. |
| `01-SKELETON.md` | Architectural contract | ✓ VERIFIED | Exists, records SvelteKit+Svelte5/adapter-static, "NONE in Phase 1" for data layer with explicit deferral note to Phases 8-9, Out of Scope lists persistence and MIDI. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| showcase input | `spellChord` | form submit → `showChord()` | ✓ WIRED | `handleSubmit` calls `showChord(symbol)` which calls `spellChord(input)`. |
| `spellChord` result | `ChordGlyph` + `PianoKeyboard` + `IntervalChip` + alias line | conditional render on `result?.recognized` | ✓ WIRED | All four consume `result` directly; e2e test exercises the full path for Dm7, C-7, Cm7. |
| interval role prop | semantic color token | `roleClass()` in `PianoKeyboard`, CSS class in `IntervalChip` | ✓ WIRED | Table-driven role→class mapping, consistent across both components; unit + e2e tests assert the four role classes appear. |
| `svelte.config.js` adapter-static | static build output | `npm run build` | ✓ WIRED | Re-ran `npm run build`: produces `build/index.html` and `build/showcase.html`, both containing rendered content ("Chord showcase" confirmed present in `build/showcase.html`). |
| unrecognized input | rotating hint bar, previous result preserved | `showChord()` only sets `hint` on `!recognized`, never clears `result` | ✓ WIRED | Code inspection confirms `result` is only reassigned in the `recognized` branch; e2e test explicitly asserts the previous `chord-result` stays present after a subsequent bad input. |
| hear-it | `playChord` | `hearIt()` → `playChord(result.notes.map(...))` | ✓ WIRED | Button click handler calls `hearIt()`, which calls `playChord` with current chord's letters; gated behind user gesture per D-11 (`Tone.start()` awaited inside the handler). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full theory suite (matrix, aliases, enharmonics, solfège) | `npx vitest run src/lib/theory` | 121/121 passed | ✓ PASS |
| Full showcase e2e suite (10 behaviors: glyph, keyboard, formula, alias, stamp, empty state, error, surprise-me, hear-it) | `npx vitest run tests/showcase.e2e.test.ts` | 10/10 passed | ✓ PASS |
| Component suite (keyboard highlight + dual naming, display-only) | `npx vitest run src/lib/components/components.test.ts` | 2/2 passed | ✓ PASS |
| Full project test suite (regression check) | `npx vitest run` | 133/133 passed | ✓ PASS |
| Type-check | `npx svelte-check --tsconfig ./tsconfig.json` | 1075 files, 0 errors, 0 warnings | ✓ PASS |
| Static build | `npm run build` | `build/index.html` + `build/showcase.html` produced, "Chord showcase" text confirmed present | ✓ PASS |
| Independent cross-check of reference matrix against raw `tonal.Chord.get()` output | standalone node script querying `tonal` directly for 40 spot-check cells | Output matched `reference-chords.test.ts` matrix exactly, including double-flat diminished spellings | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| THEORY-01 | 01-01, 01-02, 01-04 | Correct notes for any supported chord symbol across all 12 roots | ✓ SATISFIED | 96-cell reference matrix, all passing; independently cross-checked. |
| THEORY-02 | 01-02, 01-04 | Jazz notation aliases resolve to the same chord | ✓ SATISFIED | Alias-equivalence unit tests + visual alias line in showcase e2e test. |
| THEORY-03 | 01-02, 01-04 | Enharmonically correct one-letter-per-degree spelling | ✓ SATISFIED | F♯m7→C♯ anchor test; tonal's spelled notes read directly, never re-derived. |
| THEORY-04 | 01-02, 01-04 | Dual letter + French solfège naming | ✓ SATISFIED | `letterToSolfege` unit-tested for all 7 letters; every `SpelledNote` carries both fields; UI renders both. |
| DESIGN-01 | 01-01, 01-03, 01-04 | Print Shop visual identity | ✓ SATISFIED | Full palette/typography/spacing tokens, sharp corners, offset-shadow buttons, misregistered chord-glyph shadow — all present in code, not placeholders. |
| DESIGN-02 | 01-03, 01-04 | Fixed interval color language | ✓ SATISFIED | 4 semantic tokens declared once in `app.css`, consumed identically by `PianoKeyboard` and `IntervalChip` via table-driven role→class mapping. |

No orphaned requirements — all 6 IDs declared for this phase in REQUIREMENTS.md are claimed by at least one plan and independently verified in the codebase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app.css`, `src/lib/theory/types.ts` | various | Em dash (—) found only inside `/* code comments */` and JSDoc, never in user-facing strings | ℹ️ Info | Not a violation of D-05 (which scopes to user-facing app copy). Verified: no em dash in `hints.ts`, showcase page markup/copy, or any component's rendered text. |
| — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found anywhere in `src/` or `tests/` | — | Clean — no debt markers to gate on. |
| — | — | No forbidden dependencies (`react*`, `@tonejs/piano`, `webmidi`, `dexie`, `ts-fsrs`, `zod`) in `package.json`; `typescript` resolves to `^6.0.3`; `tone` pinned exactly `15.1.22` | — | Matches CLAUDE.md stack contract exactly. |

No blockers found.

### Human Verification Required

None required to pass this phase. One non-blocking recommendation carried forward from Plan 04's own SUMMARY (documented there as `human_judgment: true`): a human should click "Hear it" once in a real browser tab to confirm audio actually plays without console errors, since jsdom cannot exercise real Web Audio output. This does not gate Phase 1 completion — `playChord`'s wiring, gesture-gating, and pitch conversion are all code-verified; only the subjective "does it sound right" / "no console errors in a real browser" check is left as a nice-to-have manual spot-check, consistent with D-11's low-stakes nature (a plain synth beep, not user-facing correctness data).

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria are independently verified against the actual codebase (not SUMMARY.md claims): the theory engine's reference chord matrix was cross-checked against tonal's raw parser output directly (not just trusted from the test file), all wiring (input → engine → components) was traced through real code reads, the full test suite (133/133) and type-check (0 errors) were re-run live, and the static build was regenerated and its output content-checked. All 6 requirement IDs (THEORY-01..04, DESIGN-01, DESIGN-02) are satisfied with concrete evidence. No stubs, no orphaned components, no forbidden dependencies, no debt markers.

---

_Verified: 2026-07-12T23:20:00Z_
_Verifier: Claude (gsd-verifier)_
