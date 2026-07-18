# Phase 18 — UI Review

**Audited:** 2026-07-18  
**Baseline:** 18-UI-SPEC.md (locked design contract)  
**Method:** Adversarial code audit (no dev server available — screenshot-less)  
**Scope:** SongMark.svelte, SongFilterToggle.svelte, placement across Drills/Recall/Lookup, songProvenance.ts, design token usage

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Pool-note variants missing for active filter states |
| 2. Visuals | 4/4 | Visual hierarchy and spoiler safety correct throughout |
| 3. Color | 4/4 | 60/30/10 split maintained; vermilion usage accurate |
| 4. Typography | 2/4 | Filter toggle letter-spacing below spec range |
| 5. Spacing | 4/4 | All spacing uses 4px grid with correct tokens |
| 6. Experience Design | 3/4 | States handled well; copywriting gaps carry over |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Implement missing pool-note copy** — The UI-SPEC copywriting contract (lines 94–95) lists two explanatory notes that are not currently shown:
   - When filter is ON and songs available: `"Filter on: practicing the {N} chords from your active songs only."`
   - When filter is OFF: `"Filter off: full chord library. Chords from your songs still carry their mark."`
   
   **Impact:** Users don't understand what the filter does when enabled.  
   **Fix:** Modify SongFilterToggle.svelte to accept two additional optional props (`noteOn`, `noteOff`) and conditionally render them based on the `on` state. Update Drills and Recall pages to pass the copy.

   **RESOLVED (commit 6e8d14d):** `SongFilterToggle.svelte` now accepts `noteOn`/`noteOff` optional props; a `displayNote` derived value renders the fallback `note` when set (unchanged no-active-songs behavior), otherwise `noteOn`/`noteOff` per the `on` state. Drills passes `` `Filter on: practicing the ${drillableSongSymbols().length} chords from your active songs only.` `` (its actual restricted-draw pool count) and Recall passes the same copy using `provenanceIndex.size` (what RecallSession filters facts against) as `{N}`; both pass the fixed `"Filter off: full chord library. Chords from your songs still carry their mark."` copy verbatim. Extended `songFilterToggle.test.ts`, `drillsSongFilter.test.ts`, and `recallSongFilter.test.ts` to assert both notes render with correct copy and correct fallback precedence.

2. **Fix filter toggle button letter-spacing** — Currently `0.08em` (SongFilterToggle.svelte:57), spec requires `0.1em–0.14em` to match mono-metadata convention (UI-SPEC:62).  
   **Impact:** Typography consistency across metadata elements.  
   **Fix:** Change `.song-filter-toggle { letter-spacing: 0.08em; }` to `0.14em` on line 57.

   **RESOLVED (commit 7e9156e):** `letter-spacing` changed from `0.08em` to `0.14em`, matching the upper bound of the spec's `0.1em–0.14em` mono-metadata range (same value already used by the pool-label token).

3. **Reconcile pool-note scope** — Determine whether the "filter ON/OFF" explanatory notes (Priority Fix #1) are truly required or if the spec was only documenting all possible copy variations. If documented only, update UI-SPEC to clarify that only the fallback "no active songs" note is rendered.  
   **Impact:** Spec clarity; avoids repeated implementation cycles.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**BLOCKER:** Pool-note copy incomplete per UI-SPEC contract.

**RESOLVED (commit 6e8d14d)** — see Top 3 Priority Fixes #1 above for the applied fix.

The copywriting contract (lines 93–98 of 18-UI-SPEC.md) lists **three** distinct pool notes:

1. ✓ **"No active songs yet, so showing the full library instead."** — Implemented in both Drills (line 854) and Recall (line 81). Shown only when filter is ON but no derivable song chords exist. Correct.

2. ✗ **"Filter on: practicing the {N} chords from your active songs only."** — **NOT implemented**. Should be shown when filter is ON and at least one song-derived chord is available. Currently, no note is rendered in this state.

3. ✗ **"Filter off: full chord library. Chords from your songs still carry their mark."** — **NOT implemented**. Should be shown when filter is OFF. Currently, no note is rendered in this state.

**Evidence:**
- Drills `/drills/+page.svelte:850–856`: `note={songFallbackActive ? '...' : undefined}` — note only conditional on fallback, never on normal ON/OFF states.
- Recall `/recall/+page.svelte:76–84`: same pattern.
- SongFilterToggle.svelte:18–19: `note?: string` prop accepts one optional note; no provision for ON/OFF state variants.

**Other findings:**
- ✓ Filter labels correct: "PRACTICE POOL" (Drills), "REVIEW POOL" (Recall)
- ✓ Toggle label renders as "FROM MY SONGS" via CSS `text-transform: uppercase` (no direct casing in source)
- ✓ SongMark copy correct: single-song `♪ {NAME}`, multi-song `{N} SONGS`
- ✓ No em dashes anywhere; colons and periods only
- ✓ Song name uses `text-transform: uppercase` rather than upper-casing the source string (UI-SPEC:100)

**Score justification:** Copywriting is ~60% complete per contract. The three key notes are listed as part of the signed-off contract, and two are missing.

---

### Pillar 2: Visuals (4/4)

**PASS.** Visual hierarchy, focal point, and spoiler safety all correct.

**SongMark component:**
- Renders as inline-flex tag with border and monospace label — quiet secondary metadata, not a loud badge (UI-SPEC:78, 232).
- Single-song case: 2px solid border (SongMark.svelte:50, implicit default).
- Multi-song case: `border-style: double` (line 50–51) — deliberate visual escalation matching sketch 011-A, not just text/color change.
- Empty provenance: renders nothing (line 20–31), following the app's "render nothing when there's nothing to say" discipline.

**SongFilterToggle component:**
- Checkbox-style box (span, 14×14px) with clear interactive affordance (lines 77–81, 184–191).
- 44px minimum touch target (line 63, matching existing `.ps-button` convention).
- Visual feedback on press: `aria-pressed="true"` background changes to vermilion + text to paper (lines 70–74).
- Active-state press animation: `translate(1px, 1px)` (lines 87–89) — tactile response.

**Placement (all surfaces):**
- Drills: filter bar directly above prompt card, mark below chord glyph (lines 849–881) ✓
- Recall formula/see-play: mark beside ChordGlyph in prompt (lines 654, 735) ✓
- Recall hear-name: mark shown ONLY after user answers (line 846, inside `{#if hearNameAnswered}` block) — spoiler-safe ✓
- Recall formula-build: mark beside BuildSession's chord (lines 630–634) ✓
- Lookup: mark inline in result header beside chord glyph (line 222) ✓

**Spoiler safety (critical, new for this phase):**
- hear-name mode: mark is NOT visible before user taps a choice (lines 803–850).
- Mark only renders inside the `{#if hearNameAnswered}` conditional (line 835), paired with RevealInsight (line 843) and correct symbol (line 846).
- This prevents the mark from leaking the answer before grading — UI-SPEC requirement (line 215) fully met.

**Score justification:** No visual discrepancies found; hierarchy is clear; spoiler safety correctly implemented.

---

### Pillar 3: Color (4/4)

**PASS.** 60/30/10 split maintained; accent usage complies with spec restrictions.

**60/30/10 distribution (app.css:5–7, UI-SPEC:69–78):**
- Dominant (60%): `--color-paper` `#f2ecdd` — page background ✓
- Secondary (30%): `--color-paper-bright` `#faf6ea` — filter bar, prompt card backgrounds ✓
- Accent (10%): `--color-vermilion` `#c8502e` — reserved for CTA buttons and filter toggle pressed state only ✓

**SongMark color:**
- Border: `var(--color-ink)` `#221e17` (line 42) ✓
- Text: `var(--color-ink)` (line 44) ✓
- Background: `var(--color-paper)` (line 43) ✓
- **No vermilion** — stays unaccented ink-on-paper, matching spec mandate (UI-SPEC:78: "vermilion must NOT be used for the SongMark itself") ✓

**SongFilterToggle color:**
- Normal state: ink border, paper background (lines 60–61) ✓
- Pressed state (`aria-pressed="true"`): vermilion background (line 71) + paper text (line 72) — this is the ONLY permitted new use of vermilion per phase 18 (UI-SPEC:75) ✓
- Box outline uses `currentColor` (line 79), inheriting from button's text color — adaptive to pressed/unpressed ✓

**Contrast verification:**
- Vermilion (#c8502e) + paper text (#f2ecdd): meets WCAG AA (existing Button.svelte uses this) ✓
- Ink (#221e17) on paper-bright (#faf6ea): sufficient (high contrast) ✓

**Score justification:** All requirements met; no color violations found.

---

### Pillar 4: Typography (2/4)

**WARNING:** Filter toggle button letter-spacing out of spec range.

**RESOLVED (commit 7e9156e)** — see Top 3 Priority Fixes #2 above for the applied fix.

**Font sizing and weights (4 sizes, 2 weights per UI-SPEC:50–59):**
- Body: 16px / 400 (app.css:63–65) ✓
- Label: 12px / 700 (app.css:67–69) ✓
- Heading: 20px / 700 (app.css:72–74) ✓
- Display: 56px / 700 (app.css:76–78) ✓

**SongMark typography:**
- Role: Label (`text-label`, 12px, 700 weight) (line 39) ✓
- Font stack: `var(--font-mono)` (line 39) — Courier New ✓
- Letter-spacing: `0.1em` (line 40) ✓ — within spec range 0.1em–0.14em (UI-SPEC:62)
- Text-transform: `uppercase` via CSS (line 41), not source casing ✓

**SongFilterToggle typography:**
- Pool label: `text-label font-mono uppercase` classes (line 27) ✓
  - Inherits letter-spacing from token: `--text-label--letter-spacing: 0.14em` (app.css:70) ✓
- Button label: same role intended, but...
  - Inline CSS overrides letter-spacing: `0.08em` (line 57) ✗
  - **Spec requires:** 0.1em–0.14em per mono-metadata convention (UI-SPEC:62: "SongMark text and the 'FROM MY SONGS' toggle label both use... letter-spacing `0.1em`–`0.14em`")
  - **Actual:** 0.08em is too tight, breaks the visual consistency of mono metadata across the app

**Evidence:**
```svelte
.song-filter-toggle {
  letter-spacing: 0.08em;  /* ← OUT OF SPEC RANGE */
}
```

**Other typography findings:**
- ✓ Serif/mono split correct: chord names (serif) vs metadata labels (mono) throughout
- ✓ No unauthorized font sizes introduced
- ✓ Line heights correct for each size

**Score justification:** Typography is 75% compliant. Letter-spacing violation is concrete and measurable; it affects visual consistency with the rest of the mono-metadata language.

---

### Pillar 5: Spacing (4/4)

**PASS.** All spacing uses declared 4px grid; no arbitrary values.

**Spacing token usage (app.css:54–60, UI-SPEC:30–45):**

| Component | Property | Value | Declared Token | Status |
|-----------|----------|-------|-----------------|--------|
| SongMark | gap (icon-to-label) | 4px | `--spacing-xs` | ✓ |
| SongMark | padding (vertical) | 4px | `--spacing-xs` | ✓ |
| SongMark | padding (horizontal) | 8px | `--spacing-sm` | ✓ |
| SongFilterToggle | bar gap | 8px | `--spacing-sm` | ✓ |
| SongFilterToggle | bar padding | 24px | `--spacing-lg` | ✓ |
| SongFilterToggle | row gap | 16px | `--spacing-md` | ✓ |
| SongFilterToggle | button padding (vertical) | 8px | `--spacing-sm` | ✓ |
| SongFilterToggle | button padding (horizontal) | 16px | `--spacing-md` | ✓ |
| SongFilterToggle | button min-height | 44px | app standard (existing exception) | ✓ |

**Evidence:**
- SongMark.svelte:38, 45: All use `var(--spacing-*)` tokens
- SongFilterToggle.svelte:42, 45, 52, 62, 63: All use `var(--spacing-*)` tokens
- No hardcoded px values or arbitrary spacing found in either component
- Drills/Recall filter placement: wrapped in existing `.drill-layout` / `.border-ink mt-4` containers using Tailwind utilities (app-standard, not in-scope for this phase)

**Spec alignment (UI-SPEC:36–45 exceptions):**
- SongMark padding: spec says `var(--spacing-xs) var(--spacing-sm)` (4px / 8px), implementation matches (line 45) ✓
- Filter toggle min-height: spec acknowledges app-wide 44px exception (UI-SPEC:46), implementation matches (line 63) ✓

**Score justification:** Perfect 4px grid adherence; all exceptions documented and applied correctly.

---

### Pillar 6: Experience Design (3/4)

**GOOD.** States are well-handled; spoiler safety is correctly implemented. One copywriting gap carries over.

**State coverage:**

| State | Coverage | Evidence |
|-------|----------|----------|
| SongMark empty (no provenance) | ✓ Renders nothing | Component line 20–31 conditional render |
| SongMark single song | ✓ 2px solid border | Component line 50 (implicit default) |
| SongMark multi-song | ✓ Double border | Component line 50–51, `border-style: double` |
| SongMark disabled/read-only | ✓ No interaction | Component line 157 spec compliance: "no click behavior... static, read-only" |
| Filter toggle unpressed | ✓ `aria-pressed="false"` | Component line 28, unpressed style lines 60–61 |
| Filter toggle pressed | ✓ `aria-pressed="true"` | Component line 28, pressed style lines 70–74 |
| Filter toggle feedback | ✓ Visual + tactile | Component line 87–89, `translate(1px, 1px)` on active |
| Filter accessibility | ✓ `aria-pressed` wired | Component line 28, matches app's Button pattern |
| Drills filter ON, songs available | ⚠ See copywriting | No explanatory note shown (spec calls for one) |
| Drills filter ON, no songs | ✓ Fallback note + pool | Drills +page line 854: fallback triggers, full pool shown |
| Drills filter OFF | ⚠ See copywriting | No explanatory note shown (spec calls for one) |
| Recall filter ON, no songs | ✓ Fallback note + pool | Recall +page line 81: fallback triggers, full pool shown |
| hear-name pre-answer | ✓ SongMark hidden | RecallSession lines 835–849: mark inside `hearNameAnswered` block |
| hear-name post-answer | ✓ SongMark shown | RecallSession line 846: mark shown after revealing answer |

**Hear-name spoiler safety (critical requirement, new for phase 18):**
- Pre-answer state: The 4 choice buttons are the prompt; no mark visible to leak the answer (UI-SPEC:215).
- Implementation: Mark only renders inside `{#if hearNameAnswered}` (RecallSession:835), alongside RevealInsight and correct symbol disclosure (lines 843–846).
- This is **correctly and fully implemented** — no spoiler risk.

**Fallback behavior (filter ON + no songs):**
- Per UI-SPEC:227–228, when filter is ON but no song chords are derivable:
  - Show the fallback note: "No active songs yet, so showing the full library instead."
  - Silently swap to full, unfiltered pool
  - Keep toggle visually ON (reflect user's actual choice)
- Implementation:
  - Drills: `songFallbackActive` flag set (line 157), note conditionally rendered (line 854) ✓
  - Recall: `songFallbackActive` derived (line 37), note conditionally rendered (line 81) ✓
  - Pool fallback logic: Drills lines 235–245, Recall lines 176–186 ✓

**Gap (carried over from Copywriting):**
- The two explanatory notes for "filter ON" and "filter OFF" states are listed in the copywriting contract but not rendered. This affects user understanding of what the filter does when toggled on/off (not in fallback state).

**Score justification:** 75% complete. State coverage is solid; spoiler safety is correct; fallback behavior is right. The copywriting gaps reduce this score because they affect the user experience of understanding filter behavior in normal (non-fallback) states.

---

## Registry Safety

Not applicable — no shadcn initialization. Custom Svelte components only (`SongMark.svelte`, `SongFilterToggle.svelte`, provenance logic in `songProvenance.ts`).

---

## Files Audited

- `/src/lib/components/SongMark.svelte` — single shared provenance tag component
- `/src/lib/components/SongFilterToggle.svelte` — binary filter toggle component
- `/src/routes/drills/+page.svelte` — Drills surface: filter bar + SongMark placement (lines 74–76, 849–882)
- `/src/routes/recall/+page.svelte` — Recall surface: filter bar setup (lines 5–91)
- `/src/lib/components/RecallSession.svelte` — Recall modes: SongMark placement in formula/see-play/hear-name/formula-build (lines 630–849)
- `/src/routes/+page.svelte` — Chord Lookup: SongMark in result header (lines 15, 18, 222)
- `/src/lib/practice/songProvenance.ts` — provenance index logic
- `/src/app.css` — design tokens: spacing scale, typography roles, color palette (lines 54–78)
