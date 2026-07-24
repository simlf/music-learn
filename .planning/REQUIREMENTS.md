# Requirements — v2.2 Hub Consolidation + Interval Theory

**Source:** approved design `docs/superpowers/specs/2026-07-24-hub-consolidation-design.md`.
**Nature:** UI + routing restructure of already-built features + one new presentation component. No data-schema migration, no new music-theory data source.

## Milestone v2.2 Requirements

### Navigation Hubs (HUB)

- [ ] **HUB-01**: User sees exactly 4 top-level hubs (Lookup, Practice, Learn, Progress) in the desktop nav and the phone tab bar, replacing the 10 flat links; the phone "More" bottom sheet is removed.
- [ ] **HUB-02**: The orphan `showcase` route is deleted (it duplicated Lookup and was not in nav).
- [ ] **HUB-03**: Each old route (`/drills`, `/scales`, `/voicings`, `/build`, `/progressions`, `/recall`, `/songs`, `/theory`) redirects to the hub that now owns it, so existing bookmarks and deep-links still land somewhere correct for one release.

### Interval View (IVW)

- [x] **IVW-01**: For any chord, the user can see its **stacked-thirds** bottom-up adjacent gaps (e.g. `Cm7 = root +m3 ♭3 +M3 5 +m3 ♭7`), rendered by default, computed from the chord's existing `tonal` intervals with no new data.
- [x] **IVW-02**: The user can toggle the same chord to a **formula** view of intervals-from-root (e.g. `Cm7 = R, ♭3, 5, ♭7`).
- [x] **IVW-03**: The interval view is a single shared component embedded in both the Lookup hub (per looked-up chord) and the Learn hub (as an interval reference block), and its solfège carries accidentals through (e.g. `Mi♭`).

### Practice Hub (PRAC)

- [ ] **PRAC-01**: From the Practice hub the user starts practice with a single "Start practice" action — no mode-picker grid.
- [ ] **PRAC-02**: One practice session interleaves questions from all five drill generators (name-it, build-it, voicings, intervals, progressions) in a single queue hosted by the existing drills engine (tiers, grading, telemetry preserved).
- [ ] **PRAC-03**: The queue is built by the FSRS scheduler drawing from all generators weighted by due-date and weakness (no regression in SRS scheduling behavior).
- [ ] **PRAC-04**: The song filter (owned by Progress → Songs) still steers which questions the Practice queue surfaces.
- [ ] **PRAC-05**: When only one drill type is due, the session surfaces only that type — no artificial variety injection (single-type-due quality gate).

### Learn Hub (LEARN)

- [ ] **LEARN-01**: The Learn hub presents the existing shape-first theory lessons together with the Scales "Explore" content (major-scale degrees/intervals) and the shared interval reference, in one surface.
- [ ] **LEARN-02**: The Scales "Practice" tab is reachable through the Practice hub, while only "Explore" remains in Learn.

### Progress Hub (PROG)

- [ ] **PROG-01**: The Progress hub presents stats, streak, weak spots, the SRS review map, and song management (absorbing the former `progress`, `recall`, and `songs` routes) in one surface.

### No Regression (REG)

- [ ] **REG-01**: Existing drills, SRS scheduling, progress/streak stats, and song-filter behavior work exactly as before the restructure — only the pages that display state move between routes.
- [ ] **REG-02**: Per-route test files are remapped to the absorbing hub; new tests cover the merged Practice queue interleaving (incl. single-type-due gate), the IntervalView (stacked vs formula per chord quality + accidental carry-through), and each redirect shim; full suite + `svelte-check` stay green.

## Out of Scope (this milestone)

- **Data-schema migration** — SRS facts, song-filter pref, progress/streak stats keep their current schema.
- **New music-theory data source** — IntervalView is pure presentation over existing `tonal` chord data.
- **Removing the redirect shims** — shims live for one release; their deletion is a deferred follow-up.
- **Auth / multi-user / cross-device sync** — unchanged from prior milestones; still single-user local-first.

## Future Requirements (deferred)

- Delete the old-route redirect shims once the release has settled (follow-up cleanup).

## Traceability

| REQ-ID | Phase |
|--------|-------|
| HUB-01 | Phase 30 |
| HUB-02 | Phase 30 |
| HUB-03 | Phase 30 |
| IVW-01 | Phase 26 |
| IVW-02 | Phase 26 |
| IVW-03 | Phase 26 |
| PRAC-01 | Phase 27 |
| PRAC-02 | Phase 27 |
| PRAC-03 | Phase 27 |
| PRAC-04 | Phase 27 |
| PRAC-05 | Phase 27 |
| LEARN-01 | Phase 28 |
| LEARN-02 | Phase 28 |
| PROG-01 | Phase 29 |
| REG-01 | Phase 31 |
| REG-02 | Phase 31 |
