# Milestones

## v2.2 Hub Consolidation + Interval Theory (Shipped: 2026-07-25)

**Phases:** 26-31 (6 phases, 26 plans) | **Archive:** milestones/v2.2-ROADMAP.md, milestones/v2.2-REQUIREMENTS.md, milestones/v2.2-MILESTONE-AUDIT.md

**Key accomplishments:**

- Collapsed 10 flat routes into 4 clear hubs (Lookup / Practice / Learn / Progress) on both the desktop masthead and the phone tab bar; removed the More bottom sheet; deleted the orphan showcase route; turned the 8 old routes into prerender-safe 308 redirect shims for bookmark/deep-link safety (Phase 30).
- Shared IntervalView component: any chord shown as stacked-thirds (default) with a toggle to its intervals-from-root formula, computed from existing tonal data with solfege accidental carry-through; embedded once and reused by both Lookup and the Learn hub (Phase 26).
- Practice hub: one Start-practice action runs a single FSRS-scheduled interleaved session mixing all five drill families via a hybrid queue (FSRS-carded name-it/build-it/interval woven with synthetic voicing/progression items), no mode-picker, song filter steers it, single-type-due gate holds; two critical FSRS-integrity bugs caught and fixed in review (Phase 27).
- Learn hub merges the six shape-first theory lessons with Scales Explore and a five-quality interval reference; the scale-keyboard drill relocated to the Practice hub. Progress hub unifies stats/streak/weak-spots, the recall Review + Map, and song management (the sole song-filter writer) into one 3-tab surface; DRY component extractions keep the old routes working (Phases 28-29).
- Drill-seed handoff preserved across the cutover (Progress danger-cards and Lookup Drill-it now seed the /practice queue); the manual tier/level picker retired in favor of FSRS scheduling.
- Quality held throughout: every phase verified, cross-phase integration audited clean (single song-filter writer with two readers, intact seed chain, one shared IntervalView, no redirect bounces), milestone gate green (npm run build + 1466 tests + svelte-check 0 errors). Net -606 lines across 84 files.

**Deferred (non-blocking):** on-device visual UAT for the Practice/Learn/Progress hubs (null-origin preview harness cannot exercise; tracked in 27/28/29-UAT.md); follow-up cleanup of redirect-shim route dirs, unused nav.* i18n keys, and BottomSheet.svelte.
---

## v2.1 Playability & Comprehension (Shipped: 2026-07-21)

**Phases:** 14-25 (12 phases, 45 plans) | **Closeout:** override_closeout | **Archive:** milestones/v2.1-ROADMAP.md, milestones/v2.1-REQUIREMENTS.md, milestones/v2.1-MILESTONE-AUDIT.md

**Key accomplishments:**

- Playable inline keyboard on every keyboard-bearing page (docked bar built, then deliberately removed; inline won) plus audio memory: auto-play + synced pulse on reveals, study-mode arpeggio roll (Phases 15-16).
- Self-explaining drills: escalating in-place hint ladder for unknown chords, song-provenance marks + From-my-songs filter, guided theory lessons handing off into seeded drills (Phases 17-19).
- Full French i18n layer with header EN|FR toggle, 11 message domains, EN/FR parity enforced by tests (Phase 20).
- Installable PWA (offline app-shell service worker, update prompt) + phone-first UX overhaul: bottom tab bar, question-first drills reflow, glanceable progress, review action dock, icon+micro-label tab bar, lookup why-these-notes panel with Am7/AM7 disambiguation (Phases 22-24).
- Contextual learning trio from session-6 sketches: /progressions earn-the-symbol lead-sheet drill, /voicings shell-voicing drill staged by FSRS card maturity, optional confidence dots feeding a /progress calibration payoff view with danger-cards CTA (Phase 25, security audit 26/26 threats closed).
- Quality bar held across the milestone: 1450/1450 tests green, svelte-check 0 errors; mastery criterion + drills polish shipped along the way (Phases 14, 21).

**Known verification overrides:** 6 deferred on-device items (see STATE.md Deferred Items — phases 09/23 UAT, 2 todos).

---

## v2.0 Learning Upgrade (Shipped: 2026-07-15, recorded retroactively)

**Phases:** 10-13 (4 phases). Scale keyboard drill graded by pitch class, ts-fsrs memorization engine (card = fact x mode, Dexie-backed), Build-it construction mode earning each note from its interval formula, multi-modal recall rotating formula/see-play/hear-name/formula-build. Full phase details: milestones/v2.1-ROADMAP.md.

## v1.0 Chord Fluency Core (Shipped: 2026-07-13, recorded retroactively)

**Phases:** 1-3, 8-9 (5 phases; Phase 4 deferred for hardware, 5-7 superseded by v2.0). tonal-backed theory engine + Print Shop identity, chord lookup companion, two-way drill loop with elaborative feedback, cross-device progress + streaks on the Oracle-server backend, HTTPS deploy. Full phase details: milestones/v2.1-ROADMAP.md.
