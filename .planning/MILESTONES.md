# Milestones

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
