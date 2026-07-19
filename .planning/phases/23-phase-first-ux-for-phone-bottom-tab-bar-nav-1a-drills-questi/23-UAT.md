---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
type: uat
status: pending
created: 2026-07-20
source: 23-VERIFICATION.md
total: 4
passed: 0
failed: 0
---

# Phase 23: Phase-First UX for Phone — Human Verification

All automated and source-level checks passed (15/15 must-haves, 0 functional gaps; 1322 root tests + 44 server tests green, `npm run check` 0 errors, `npm run build` succeeds, CR-01 desktop fix confirmed against the built CSS). The items below are visual/tactile and cannot be observed in this headless environment (the SvelteKit app cannot hydrate in the preview harness; jsdom does not evaluate CSS media queries or perceived layout/animation). They need one pass on a real phone.

## Items

### UAT-1 — Bottom tab bar phone-only + Drills question-first (UX-1A/1B)
- **Test:** On a real phone or narrow viewport (<640px), open `/`, `/drills`, `/progress`. Then widen to desktop (>=640px).
- **Expected:** Bottom tab bar (Lookup / Drills / Recall / Songs / More) shows only <640px and the top header is slimmed to brand + streak; at >=640px the bar is gone and the full desktop masthead is unchanged. On `/drills` at phone width the chrome (level/mode/song-filter) is folded into one compact strip above the prompt, the prompt sits directly under it, and the keyboard (~180px) + Check (~52px) sit in the thumb zone with no scroll per question.
- **Why human:** Preview harness cannot hydrate; media-query layout and no-scroll feel are unobservable from source.
- **Status:** pending

### UAT-2 — Sheets: focus, Escape, slide-in, safe-area (UX-1A/1B)
- **Test:** Open the More sheet and the Drills strip sheet on a device; Tab through their contents; press Escape from inside each; on an installed PWA (notched iPhone) check the slide-in feel and bottom safe-area clearance.
- **Expected:** Focus moves into the sheet, Tab/Shift+Tab traps within it, Escape closes from any focus origin, focus returns to the opener; sheet slides in smoothly; content clears the iOS home indicator and nothing hides under the tab bar.
- **Why human:** Focus-trap/Escape logic has passing jsdom regression tests, but real assistive-tech/keyboard behavior, animation, and safe-area rendering require a device.
- **Status:** pending

### UAT-3 — Accuracy bar + 7-day streak strip colors (UX-1C)
- **Test:** On `/progress`, eyeball the inline accuracy-bar fill colors on the practice rows and the All-Stats table, and the 7-day streak strip squares.
- **Expected:** The three accuracy tiers read clearly (vermilion <50%, mustard <70%, verdigris >=70%) against the paper/ink chrome; the streak states are distinguishable (practiced = vermilion stamped fill; today-unpracticed = dashed-open; past-unpracticed = solid-open).
- **Why human:** Preview harness cannot render CSS color output; only class/style presence was asserted in tests.
- **Status:** pending

### UAT-4 — Active-tab contrast (UX-1A)
- **Test:** On a phone, confirm the active bottom-tab item is legible and reads clearly as active.
- **Expected:** Active tab is distinct via ink-fill / paper-text, never confused with vermilion (the reward/warning color).
- **Why human:** Color-contrast perception requires a real screen; only the CSS class and token values were confirmed in source.
- **Status:** pending
