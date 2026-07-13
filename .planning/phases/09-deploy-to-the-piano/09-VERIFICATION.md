---
phase: 09-deploy-to-the-piano
verified: 2026-07-14T02:00:00Z
status: human_needed
score: 21/23 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Feel the light haptic buzz on key taps on a real Android phone (D-11, 09-04)."
    expected: "A short (~10ms) vibration fires on pointerdown when the Vibration API is supported; no-op on iOS/desktop."
    why_human: "The Vibration API produces a physical sensation that cannot be observed in a browser or jsdom. This requires installing/opening the app on a real Android device, which in turn requires HTTPS (the app is currently HTTP-only in dev/preview). HTTPS deployment (PLAT-02) is explicitly deferred to the user per the phase's own scope note, so this could not be device-tested during execution. Automated coverage (mocked navigator.vibrate call + no-throw-when-absent) exists and passes; the felt-device check is tracked in `.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md`."
  - test: "Add to Home Screen from a real phone browser and confirm standalone launch (D-07, 09-05)."
    expected: "The app installs and opens with no browser chrome (address bar/nav), shows the Print Shop icon, and the maskable icon isn't cropped/stretched."
    why_human: "Real install + standalone launch behavior can only be confirmed on-device and requires HTTPS (browsers generally refuse Add to Home Screen install prompts for HTTP origins). Same HTTPS dependency as above, same tracked todo. Manifest validity, icon existence, and head-link wiring are all automated-test-covered and pass; only the real installed launch is unverified."
---

# Phase 9: Deploy to the Piano — Verification Report

**Phase Goal:** The app is live on the user's Oracle server over HTTPS and works responsively on both the laptop at the piano and the phone elsewhere.

**Scope note honored (ROADMAP.md line 219):** Deployment over HTTPS (criterion 1, and the cross-device part of criterion 3) is deferred — the user handles it himself outside these plans. This verification judges the phase against what its 6 plans actually claim: criterion 2 (responsive layout, on-screen keyboard usable on a phone / PLAT-01) in depth. PLAT-02 is NOT claimed by any plan and is correctly left unchecked in REQUIREMENTS.md. This report does not fail the phase for PLAT-02/criterion-1/the cross-device-HTTPS part of criterion-3.

**Verified:** 2026-07-14
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Phone-width viewport shows one C-to-C octave, keys ≥44px, no horizontal overflow (09-01, D-01/D-04) | ✓ VERIFIED | `keyboardLayout.ts:octavesForWidth` (390→1, 659→1, 660→2, 1200→2), unit-tested (`keyboardLayout.test.ts`); `PianoKeyboard.svelte` has no `min-width: 660px`, keeps 44px key floor via container-width fix; human checkpoint approved live at ~390px |
| 2 | Wide viewport (≥660px) shows two octaves, unchanged from pre-phase behavior (D-01) | ✓ VERIFIED | `whiteLettersForOctaves(2)`/`blackKeysForOctaves(2)` reproduce prior literals exactly (unit test); default-2-octave fallback for unmeasurable width keeps all pre-existing component tests green |
| 3 | One-octave chord highlight wrapping keeps all 4 interval colors, incl. exotic spellings (D-02) | ✓ VERIFIED | `assignNotesToKeys` wrap branch + chroma fallback, unit-tested (Bm7 wrap, F♭/A♭♭/E♯ exotic spellings); component test confirms Dbm reveal |
| 4 | Selection survives an octave-count change (rotation continuity, D-03) | ✓ VERIFIED | Letter-based/octave-agnostic `selected` Set; `components.test.ts` rotation-continuity case (2→1 octave, `aria-pressed` stays true) |
| 5 | Wrong construction answer renders ONE keyboard (interval colors + gray ✕ extras), old two-keyboard/text-diff removed (09-02) | ✓ VERIFIED | `drills/+page.svelte` single `<PianoKeyboard notes={target.notes} wrongLetters={wrongLetters}>` on the construction branch; `played-diff`/`correct-diff` testids absent (grep + e2e test); e2e + component tests pass |
| 6 | Legend explains "The chord" / "Your extra note" (09-02) | ✓ VERIFIED | `data-testid="feedback-legend"` present in `drills/+page.svelte`, asserted in e2e test |
| 7 | Stamp-in reveal animation, disabled under prefers-reduced-motion (09-02) | ✓ VERIFIED | Shared `@keyframes stamp-in` + `@media (prefers-reduced-motion: reduce)` guard in `app.css` |
| 8 | Merged feedback keyboard works at one-octave phone width (09-02) | ✓ VERIFIED | Inherits D-02 wrap; percentage-only key geometry fix (removed conflicting `min-width: 44px` clamp) verified by jsdom geometry test + arithmetic + human checkpoint |
| 9 | Portrait: Check sits directly below the keyboard as the thumb-zone primary, Clear smaller beside it (D-10, 09-03) | ✓ VERIFIED | `.drill-controls__primary { flex: 3 }` / `.drill-controls__secondary { flex: 1 }` directly under `.drill-layout__keyboard`; human checkpoint approved |
| 10 | Landscape: side-by-side two-pane, everything visible with zero scroll (D-06, 09-03) | ✓ VERIFIED | CSS grid-template-areas reflow gated on `(orientation: landscape) and (max-height: 600px)`; headless-Chromium Playwright measurement confirmed `scrollHeight === 390` at 844×390 for both load states after the D-06 chrome-compaction fix; human checkpoint approved |
| 11 | Identification choices render as a 2×2 grid on phone and in the landscape left panel (D-13, 09-03) | ✓ VERIFIED | `data-testid="choice-grid"` uses `grid-cols-2` base; e2e assertion + human checkpoint |
| 12 | Dismissable rotate hint shown once, shop voice, no em dash (D-05, 09-03) | ✓ VERIFIED | `rotateHint.ts` (`isRotateHintDismissed`/`dismissRotateHint`, localStorage-backed, guarded try/catch); hint text "Turn the phone sideways for the full two-octave board." contains no em dash; unit + e2e tests pass; human checkpoint approved (dismiss + reload; rotate) |
| 13 | Immediate press-down visual cue on key touch, additive to selected-hatch (D-11, 09-04) | ✓ VERIFIED | `.piano-keyboard__key--pressed { transform: scale(0.94) }` set on pointerdown, layered alongside interval/selected/wrong classes; unit test + human checkpoint (desktop browser) |
| 14 | Optional light haptic via Vibration API where supported, no-op where unsupported (D-11, 09-04) | ⚠️ Human verification needed | Feature-detected `navigator.vibrate(10)` call; unit-tested (mocked call + no-throw-when-absent). **Real Android device feel NOT verified** — requires HTTPS (out of this phase's scope, tracked in `.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md`) |
| 15 | Press-cue motion disabled under prefers-reduced-motion (D-11, 09-04) | ✓ VERIFIED | `@media (prefers-reduced-motion: reduce)` guard clears the transform/filter; grep + build/check green |
| 16 | Keyboard surface disables double-tap zoom and long-press callout (D-12, 09-04) | ✓ VERIFIED | `touch-action: manipulation`, `-webkit-touch-callout: none`, `user-select: none` on `.piano-keyboard` and `.piano-keyboard__key`; unit test + human checkpoint (computed-style check) |
| 17 | Valid web app manifest (standalone, Print Shop colors, icons) (D-07, 09-05) | ✓ VERIFIED | `static/manifest.webmanifest` valid JSON, `display: standalone`, colors match `app.css` tokens exactly (#f2ecdd/#221e17); `tests/manifest.test.ts` passes (JSON shape + icon-file existence); real PNG icons at 192/512/maskable-512 confirmed on disk |
| 18 | No offline service worker this phase (D-07) | ✓ VERIFIED | `grep -q "serviceWorker\|vite-plugin-pwa"` over app.html/manifest returns nothing; no new npm dependency added |
| 19 | Add to Home Screen opens the app standalone with Print Shop icon/theme (D-07, 09-05) | ⚠️ Human verification needed | Manifest/icons/head-links are all correct and test-covered. **Real on-device install NOT verified** — HTTPS-only browser behavior, blocked by the same out-of-scope HTTPS deploy, tracked in the same todo file |
| 20 | Compact single-row mobile masthead, Showcase dropped on mobile, restored on desktop (D-09, 09-06) | ✓ VERIFIED | `+layout.svelte` nav link classes `hidden sm:inline` on the Showcase anchor only; `tests/masthead.e2e.test.ts` passes; human checkpoint approved |
| 21 | Lookup and Progress fit ~390px with no overflow, 44px+ targets (D-08, 09-06) | ✓ VERIFIED | Inherits 09-01/09-02 keyboard fixes via the shared `PianoKeyboard` component; human checkpoint explicitly walked `/` and `/progress` at ~390px and approved |
| 22 | Progress accuracy table drops KIND column on mobile, DOM-preserving (D-08, 09-06) | ✓ VERIFIED | `hidden sm:table-cell` on both the `<th>` and `.practice-row__kind <td>` (not `{#if}`); `progressComponents.test.ts` still asserts `getByText('CHORD')`/weak-accent plus the new responsive-class assertion |
| 23 | ROADMAP criterion 2: "layout is responsive and the on-screen keyboard is usable on a phone" | ✓ VERIFIED | Directly satisfied by truths 1-4, 8-16, 20-22 above; this is the phase's core deliverable and is thoroughly test- and human-covered |

**Score:** 21/23 truths verified (2 require human verification on a real Android device, both explicitly blocked on the deferred, out-of-scope HTTPS deployment — not code defects)

### Deferred Items

Items not built this phase per the phase's own explicit, documented scope reframe (not a later-milestone-phase deferral — no later phase in this milestone addresses deployment; the user handles it outside GSD workflow).

| # | Item | Addressed | Evidence |
|---|------|-----------|----------|
| 1 | ROADMAP criterion 1: app reachable over HTTPS on the Oracle server | User-handled, outside these plans | `ROADMAP.md:219` scope note; `09-CONTEXT.md` "Phase Boundary" section; REQUIREMENTS.md PLAT-02 remains `[ ]` unchecked |
| 2 | ROADMAP criterion 3 (cross-device part): "the same app works from both laptop... and phone... sharing one progress history" — the HTTPS-reachability half of this criterion | User-handled, outside these plans | Same scope note; the progress-history-sharing half (PROG-01, backend + SQLite) was already delivered in Phase 8 and is unaffected by this phase |
| 3 | Real-device haptic feel and real "Add to Home Screen" standalone install | Tracked for post-HTTPS-deploy re-verification | `.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md` (committed at `3af7eae`) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/keyboardLayout.ts` | Pure octave/wrapping logic (4 exported functions + KeyCandidate) | ✓ VERIFIED | All 4 functions present, unit-tested, no DOM dependency; wired into PianoKeyboard.svelte |
| `src/lib/components/PianoKeyboard.svelte` | Responsive rendering, wrongLetters mode, press-cue/haptic, gesture hygiene | ✓ VERIFIED | Confirmed by direct read: no `min-width: 660px`, `octaves` prop, `wrongLetters` prop, `navigator.vibrate` helper, `touch-action`/`user-select`/`-webkit-touch-callout` styles all present and used in the render tree |
| `src/lib/drills/rotateHint.ts` | localStorage-backed dismiss flag, guarded try/catch | ✓ VERIFIED | Mirrors `recentLookups.ts` shape exactly; unit-tested; imported and used in `drills/+page.svelte` |
| `src/routes/drills/+page.svelte` | Portrait/landscape responsive layout, merged feedback keyboard, rotate hint, 2x2 grid | ✓ VERIFIED | All wired: `drill-layout` grid, `wrongLetters` derivation, `isRotateHintDismissed`/`dismissRotateHint` calls, `choice-grid` with `grid-cols-2` |
| `static/manifest.webmanifest` + `static/icons/*` | Valid manifest + real Print Shop icons | ✓ VERIFIED | Valid JSON, all 4 icon files exist as real PNGs (192×192, 512×512, 512×512) at correct sizes (`file` command confirmed) |
| `src/app.html` | Manifest/theme-color/apple-touch-icon head links | ✓ VERIFIED | All 3 tags present, no service worker |
| `src/routes/+layout.svelte` | Compact mobile masthead, Showcase hidden on mobile | ✓ VERIFIED | `hidden sm:inline` on Showcase link only; StreakBadge + other 3 links unconditional |
| `src/lib/components/AccuracyTable.svelte` + `PracticeItemRow.svelte` | KIND column hidden on mobile via CSS, DOM-preserving | ✓ VERIFIED | `hidden sm:table-cell` on both `<th>` and `<td>`, no `{#if}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PianoKeyboard.svelte` | `keyboardLayout.ts` | import of `assignNotesToKeys`/`octavesForWidth`/`whiteLettersForOctaves`/`blackKeysForOctaves` | ✓ WIRED | Direct import at top of file, called in `$derived` blocks |
| `drills/+page.svelte` | `PianoKeyboard.svelte` (feedback mode) | `wrongLetters={showConstructionReveal ? wrongLetters : undefined}` | ✓ WIRED | `wrongLetters` derived from `isExtraLetter` filter over `playedLetters`, reusing existing matching logic (no new grading code) |
| `drills/+page.svelte` | `rotateHint.ts` | `isRotateHintDismissed()` at init, `dismissRotateHint()` on dismiss/rotation | ✓ WIRED | Both calls present; `matchMedia` listener additionally calls dismiss on first landscape rotation |
| `static/manifest.webmanifest` icons | `static/icons/*.png` | manifest `icons[].src` paths | ✓ WIRED | All 3 referenced files exist on disk (confirmed via `ls`/`file`), `tests/manifest.test.ts` asserts this programmatically |
| `AccuracyTable.svelte`/`PracticeItemRow.svelte` | responsive CSS | `hidden sm:table-cell` on KIND cells | ✓ WIRED | DOM-preserving hide confirmed by direct read; existing `getByText('CHORD')`-style tests still pass (298/298 suite) |

### Behavioral Spot-Checks / Test Evidence

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm test` | 298/298 passed | ✓ PASS |
| Type-check | `npm run check` | 0 errors, 0 warnings, 1111 files | ✓ PASS |
| Production build | `npm run build` | Succeeds, manifest/icons ship in `build/` | ✓ PASS |
| Manifest validity (isolated) | `npm test -- tests/manifest.test.ts` | 3/3 passed | ✓ PASS |
| Rotate-hint + masthead (isolated) | `npm test -- src/lib/drills/rotateHint.test.ts tests/masthead.e2e.test.ts` | 6/6 passed | ✓ PASS |
| Icon files are real, correctly-sized PNGs | `file static/icons/*.png` | 192×192, 512×512, 512×512, all RGBA PNG | ✓ PASS |

Landscape no-scroll (D-06) was additionally verified during execution with headless Chromium/Playwright at 844×390, measuring `document.documentElement.scrollHeight === 390` for both construction and identification load states (per 09-03-SUMMARY.md and the task's stated execution facts) — a real rendering-engine measurement, not jsdom arithmetic.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| PLAT-01 | 09-01, 09-02, 09-03, 09-04, 09-05, 09-06 | User can access the app from laptop and phone (responsive layout, on-screen keyboard usable on mobile) | ✓ SATISFIED | Truths 1-4, 8-13, 15-18, 20-22 above; full suite green, human checkpoints approved across all 6 plans |
| PLAT-02 | (none — deliberately not claimed by any plan) | App is deployed on the user's Oracle server over HTTPS | Deferred, not claimed | `ROADMAP.md:219` scope note; REQUIREMENTS.md correctly shows `[ ]` unchecked; every plan's frontmatter lists only `requirements: [PLAT-01]`, confirming PLAT-02 was never claimed |

No orphaned requirements: REQUIREMENTS.md maps only PLAT-01 and PLAT-02 to Phase 9, and both are accounted for above (one satisfied, one explicitly and consistently deferred across ROADMAP/CONTEXT/PLAN/REQUIREMENTS).

### Anti-Patterns Found

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, no empty stub returns, and no hollow/hardcoded-empty props were found in any of the 9 phase-modified source files (`keyboardLayout.ts`, `PianoKeyboard.svelte`, `rotateHint.ts`, `drills/+page.svelte`, `+layout.svelte`, `AccuracyTable.svelte`, `PracticeItemRow.svelte`, `app.css`, `app.html`, `manifest.webmanifest`).

The phase's own code-review (`09-REVIEW.md`, standard depth, 20 files) found 0 critical issues and 3 warnings, all still present in the current code as of this verification pass (confirmed by direct read, not just trusting the review doc):

| File | Warning | Severity | Impact on this verification |
|------|---------|----------|------------------------------|
| `src/routes/drills/+page.svelte:333-406` | WR-01: conditionally-rendered grid areas (`hint`/`feedback`/`next`) leave phantom row gaps in both portrait and the short-landscape two-pane layout when those elements aren't rendered | ⚠️ Warning | Does NOT invalidate the D-06 "no scroll" truth — the Playwright measurement (`scrollHeight === 390`) already reflects this dead space and still passed with ~55px margin per 09-03-SUMMARY.md. Real but non-blocking quality issue; recommend a follow-up fix. |
| `src/lib/components/PianoKeyboard.svelte:254` | WR-02: container keeps `role="img"` unconditionally, even in interactive mode, which per ARIA spec should prune the `role="button"` descendant keys from the accessibility tree for screen readers | ⚠️ Warning | Not a stated must-have for this phase (no accessibility truth was in scope); pre-dates this phase (interactive mode was added in Phase 3). Real bug, not newly introduced, not blocking PLAT-01 as scoped. |
| `src/lib/components/PianoKeyboard.svelte:117-127`, `drills/+page.svelte:114-217` | WR-03: press cue + haptic keep firing on a correctly-answered (now-locked) keyboard, since `interactive` only turns off on a wrong construction answer (`showConstructionReveal`), not a correct one | ⚠️ Warning | Does not falsify the stated D-11 truth ("touching a key gives an immediate press-down cue... additive to selected state") — the cue does fire as specified during normal play; this is an over-firing edge case after a correct answer, before Next. Real bug worth a follow-up fix, not a phase-goal blocker. |

None of these three warnings are debt markers requiring a follow-up reference (they're pre-existing review findings, already documented in a committed `09-REVIEW.md`, not silent TODOs) and none invalidate a stated must-have truth, so they do not trigger `gaps_found` on their own. They are flagged here for visibility and should be tracked/fixed as a fast follow-up.

### Human Verification Required

### 1. Android haptic feel (D-11)

**Test:** Open the app on a real Android phone (once served over HTTPS) and tap keys on `/drills`.
**Expected:** A light, short vibration accompanies each tap; no crash/no-op on iOS.
**Why human:** Physical vibration sensation cannot be observed in a browser or jsdom; requires a real device and HTTPS (blocked on the deferred, out-of-scope PLAT-02 deploy). Already tracked in `.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md`.

### 2. Real "Add to Home Screen" standalone install (D-07)

**Test:** On a phone browser (once served over HTTPS), use "Add to Home Screen" and launch from the icon.
**Expected:** Opens with no browser chrome, shows the Print Shop icon, correct theme tint, maskable icon not cropped.
**Why human:** Real install/standalone-launch behavior is device- and HTTPS-only; cannot be simulated in this environment. Already tracked in the same todo file as item 1.

Both items are explicitly anticipated by their respective plans' own checkpoint instructions ("if no Android device is available... note as unverifiable") and were knowingly deferred by the user during execution rather than blocking the plan's closure — this is not new information, but per the verification framework's mandate to report accurately rather than assume, they are listed here as open human-verification items rather than silently counted as passed.

### Gaps Summary

No gaps found in the code-backed sense (no missing/stub artifact, no unwired key link, no failed truth). The phase's 6 plans deliver PLAT-01 (responsive/mobile depth) thoroughly: every artifact claimed in every plan's frontmatter exists, is substantive, is wired into the app, and is covered by passing automated tests (298/298 suite, clean `svelte-check`, clean `build`). Six blocking human-verify checkpoints were run during execution and approved live by the user, with two device-dependent facets (Android haptic feel, real standalone PWA install) explicitly and knowingly deferred pending the user's own out-of-scope HTTPS deployment (PLAT-02) — a decision already tracked in a committed todo file, not an oversight.

The only reason this report's status is `human_needed` rather than `passed` is that those two device-dependent items genuinely have not been observed by a human yet (mocked/unit test evidence exists, but not the real felt/visual confirmation the framework requires before calling a truth VERIFIED). This is expected and low-risk given the phase's own explicit scope boundary, not a defect requiring rework.

Three code-review warnings (WR-01 dead grid-gap space, WR-02 ARIA role conflict, WR-03 press-cue/haptic over-firing post-correct-answer) remain open in the current code and are worth a fast follow-up fix, but do not block the phase goal as scoped and are not new findings introduced by this verification (the phase's own `09-REVIEW.md` already surfaced them).

---

_Verified: 2026-07-14_
_Verifier: Claude (gsd-verifier)_
