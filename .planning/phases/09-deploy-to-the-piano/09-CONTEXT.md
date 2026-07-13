# Phase 9: Deploy to the Piano - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Interactive discuss — user reframed the phase toward mobile experience; keyboard fit validated with a true-scale visual comparison artifact before locking.

<domain>
## Phase Boundary

**User reframe at discussion time:** Phase 9's Oracle-server HTTPS deployment is DEFERRED — the user will handle deployment himself later, outside this phase's plans. This phase delivers the roadmap's responsive/mobile success criterion in depth: the app becomes genuinely good to use on a phone, which the user expects to be his primary device.

In scope: responsive PianoKeyboard (fixes the 660px overflow on ~390px phones), mobile-polished drills page (portrait and landscape), minimal PWA (manifest + icons for standalone Add to Home Screen), touch input hygiene, compact mobile masthead, quick verification pass on Lookup and Progress.
Explicitly NOT in scope: Oracle server deployment / HTTPS / docker compose bring-up (user handles it himself), offline service worker, scales (Phase 6), any new drill capability.

Note for roadmap hygiene: ROADMAP.md success criterion 1 (reachable over HTTPS on Oracle) and criterion 3's cross-device wording are deferred with the deployment. Criterion 2 (responsive layout, keyboard usable on a phone) is this phase's core.

</domain>

<decisions>
## Implementation Decisions

### Keyboard fit strategy (validated via true-scale artifact comparison)
- **D-01 (responsive octaves):** The keyboard shows as many C-to-C octaves as fit at ≥44px white keys: 1 octave on phone portrait (~52px keys at 390px), 2 octaves on landscape/tablet/desktop. No octave-shift buttons, no horizontal scroll, no shrink-below-44px. Replaces the fixed `min-width: 660px` in `PianoKeyboard.svelte`.
- **D-02 (highlight wrapping):** When a displayed chord's ascending walk would pass the top C of the visible span (e.g. B7 on one octave), highlights wrap back into the visible octave as pitch classes, keeping per-note interval colors. Applies to lookup results and wrong-answer feedback reveals.
- **D-03 (rotation continuity):** Rotating mid-drill relayouts the keyboard at the new octave count and PRESERVES the in-progress selection (selected pitch classes survive; they are octave-agnostic already).
- **D-04 (touch minimum is strict):** 44px white-key minimum is a hard floor (per Phase 2 UI-SPEC). Octave count is derived from what fits at ≥44px; never render interactive keys smaller.

### Landscape orientation
- **D-05 (gentle rotate hint):** Drills page in portrait shows a small dismissable hint (shop voice, status register) that rotating gives the full two-octave keyboard. Shown once ever: dismissed or first rotation sets a localStorage flag, never shown again.
- **D-06 (landscape drill layout):** Side-by-side: chord prompt + Check/Clear (construction) or answer choices (identification) on the left, keyboard filling the remaining width. Everything visible without scrolling in the short landscape viewport.
- **D-07 (minimal PWA):** Web app manifest + icons so Add to Home Screen opens standalone (no browser chrome — reclaims ~15% of landscape height). NO offline service worker this phase.

### Screen priorities on mobile
- **D-08 (drills-first polish):** Drills page gets the full mobile treatment (D-01..D-06). Lookup and Progress inherit the responsive keyboard/table fixes through shared components plus ONE quick verification pass (no overflow, tap targets ≥44px). No redesign of those pages. Showcase stays desktop-only.
- **D-09 (masthead):** Compact single letterpress row on mobile: tighten spacing, may drop the Showcase link from mobile nav. No bottom tab bar, no new nav pattern.

### Touch ergonomics
- **D-10 (button placement, portrait):** Check (primary, generous width) directly below the keyboard in the thumb zone, Clear smaller beside it. In landscape they live in the left panel per D-06.
- **D-11 (press feedback):** Keep the ink-hatch selected state; add an immediate press-down visual cue (brief scale/shade) on key touch so fat-finger taps are instantly confirmable. Optional light haptic via the Vibration API where supported (Android); must respect `prefers-reduced-motion`.
- **D-12 (gesture hygiene):** On the keyboard surface: `touch-action` to kill double-tap zoom, no long-press callout/selection. Chosen scope is keyboard gestures only; pull-to-refresh blocking and leave-confirmation were offered and NOT selected.
- **D-13 (identification choices):** The 4 multiple-choice answers render as a 2x2 grid of large targets on phone (fits the landscape left panel too).

### Claude's Discretion
- **AccuracyTable on phone:** user expressed no preference. Planner picks; the natural cut is dropping the constant KIND column on mobile (v1 is chords-only) so 3 mono columns fit 390px. Stacked cards acceptable if the table still fights the width.
- Exact breakpoint mechanics for octave count (container query vs media query vs measured width) — derive from the ≥44px rule, don't hardcode device widths.
- PWA manifest details (icon art, short name, theme color) within the Print Shop identity.
- Rotate-hint copy (shop voice, no em dashes) and exact placement in the status register.
- Press-cue implementation details (scale vs shade, haptic on/off default).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` — Phase 9 goal + criteria; criterion 2 (responsive keyboard on phone) is the core, criteria 1/3 deployment parts deferred per user.
- `.planning/REQUIREMENTS.md` — PLAT-01, PLAT-02.

### Locked visual/interaction contracts that constrain this phase
- `.planning/phases/01-print-shop-foundation-theory-core/01-UI-SPEC.md` — token/interval-color contract; the responsive keyboard must not alter the color language.
- `.planning/phases/02-chord-lookup-companion/02-UI-SPEC.md` — masthead pattern, 44px touch-target rule (D-04 hard floor), copy register.
- `.planning/phases/03-on-screen-drill-loop/03-CONTEXT.md` — drill decisions D-01..D-13; pitch-class matcher (enables D-02/D-03 here), Check-button flow, selected-key hatch treatment.
- `.planning/phases/08-progress-streaks/08-CONTEXT.md` — drill pacing is sacred (no added friction); masthead streak chip.

### Code integration points
- `src/lib/components/PianoKeyboard.svelte` — the component to make responsive; currently `min-width: 660px`, absolute-positioned keys by percentage, hatch selected state, interval-color fills.
- `src/routes/drills/+page.svelte` — drill layout to restructure for portrait/landscape; Check/Clear and 2x2 choices live here.
- `src/routes/+layout.svelte` — masthead to compact on mobile.
- `src/lib/components/AccuracyTable.svelte` + `PracticeItemRow.svelte` — mobile table treatment (Claude's discretion).
- `src/lib/lookup/recentLookups.ts` — localStorage pattern to imitate for the rotate-hint dismissed flag.
- `src/app.css` — Print Shop tokens; extend additively if new tokens needed.
- `static/` + SvelteKit adapter-static — manifest + icons for the minimal PWA.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PianoKeyboard.svelte` layout math is already percentage-based per key; octave count is the only hardcoded assumption (15 white keys). Parameterizing the span is the core refactor.
- The chord matcher and selection state are pitch-class based (Phase 3 D-01..D-03), so one-octave input and rotation-preserving selection need no matcher changes.
- Hatch selected-state and interval-color treatments carry over unchanged.

### Established Patterns
- Strict 44px touch targets (Phase 2 UI-SPEC) — now the derivation rule for octave count.
- Shop voice copy, no em dashes, rotation pools for hints.
- Additive app.css token extension; exact-pinned deps; pure logic in `src/lib/**` with co-located Vitest tests.

### Integration Points
- Keyboard octave-count logic must serve both display mode (lookup, feedback reveal — with D-02 wrapping) and interactive mode (drills) from the same component.
- PWA manifest is new repo surface: `static/manifest.webmanifest` + icons + `<link>` in `src/app.html`.

</code_context>

<specifics>
## Specific Ideas

- User will use the app mostly on mobile; phone is the primary device to design for, not a fallback.
- The keyboard overflow was the user's chief complaint from real phone testing of the current build.
- User floated horizontal/landscape use himself; the gentle-hint + side-by-side layout is the agreed shape of that idea.
- A true-scale visual comparison (four options in phone frames) was used to confirm responsive octaves before locking.

</specifics>

<deferred>
## Deferred Ideas

- **Oracle server deployment (HTTPS, docker compose bring-up):** user handles it himself later. Not a phase plan item. Roadmap criterion 1 and the cross-device part of criterion 3 move with it.
- **Offline service worker / full PWA:** explicitly declined this phase; minimal manifest only.
- **Audio behavior on iOS (gesture-gated Tone.js, silent switch):** surfaced as a gray area, not discussed. Revisit if mobile audio misbehaves.
- **PWA identity polish (icon art direction):** left to Claude's discretion this phase; revisit if the result disappoints.
- **Mobile UAT device matrix:** surfaced, not discussed; verify-work can define it ad hoc.
- **Bottom tab bar navigation:** offered, rejected in favor of the compact letterpress row.

</deferred>

---

*Phase: 09-deploy-to-the-piano*
*Context gathered: 2026-07-13*
