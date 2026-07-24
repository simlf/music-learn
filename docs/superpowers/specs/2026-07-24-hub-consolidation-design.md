# Music Learn — Hub Consolidation + Interval Theory Upgrade

**Date:** 2026-07-24
**Status:** Approved design, pending implementation plan

## Problem

The app has grown to 10 flat top-level routes (`songs, progress, theory, scales, recall, voicings, build, showcase, drills, progressions`) plus home. Many overlap in function, so navigation is confusing ("le bordel"). Separately, no surface teaches **which intervals sit between the notes of a chord** — the user (a returning classical pianist) struggles to know, at sight, how to stack a symbol like `Cm7` under the left hand.

## Goals

1. Collapse 10 menus into **4 hubs** with one clear mental model each.
2. Add an **interval view** so any chord shows both its stacked-thirds (adjacent gaps) and its intervals-from-root (formula).
3. No regression in existing drills, SRS, stats, or song-filter behavior.

Non-goals: no data-schema migration, no new music-theory data source, no auth/multi-user, no cross-device sync.

## Architecture — 4 hubs

| Hub | Route | Absorbs | Purpose |
|---|---|---|---|
| **Lookup** | `/` | current Lookup + `showcase` (deleted) | Decode a chord symbol; gains the interval view. |
| **Practice** | `/practice` | `drills` + `build` + `voicings` + `progressions` + `scales`(Practice tab) | One smart SRS session auto-mixing all drill types by due/weakness. |
| **Learn** | `/learn` | `theory` (lessons) + `scales`(Explore tab) | Read + explore theory; home of the interval reference. |
| **Progress** | `/progress` | `progress` + `recall` + `songs` | Stats, streak, weak spots, SRS review map, song management. |

- Nav (`src/routes/+layout.svelte`) drops from 10 flat links to these 4. Phone tab bar = the same 4; the "More" bottom sheet is removed.
- `showcase` route deleted (orphan, not in nav, duplicate of Lookup).
- Old routes (`/drills`, `/scales`, `/voicings`, `/build`, `/progressions`, `/recall`, `/songs`, `/theory`) become **thin redirects** to their absorbing hub for one release (bookmark/deep-link safety), then removed in a follow-up.

## Practice hub — one smart session

- Single **Start practice** action. No mode-picker grid (user chose "just practice what I need").
- The existing `/drills` engine is the superset (tiers, song filter, telemetry, grading) and becomes the **host**. The other four surfaces contribute their **question generators** into the host's interleaved queue rather than being separate pages.
- The SRS scheduler builds one queue drawing from all five generators (name-it, build-it, voicings, intervals, progressions), weighted by FSRS due-date and weakness.
- Song filter (owned by Progress→Songs) still steers the queue.
- **Quality gate:** the smart mix must be able to surface a single type when only that type is due — no artificial variety injection.
- **Structural constraint:** drill generators stay as separate modules feeding a queue. The host page must stay thin — `/drills/+page.svelte` is already ~1380 lines; folding four surfaces in must not create a monster file.

## Learn hub

- Merge the 6 shape-first theory lessons with the Scales "Explore" content (degrees/intervals of the major scale).
- Embed the shared **IntervalView** (below) as a reference block.
- Scales "Practice" tab moves to the Practice hub; only "Explore" stays in Learn.

## Interval theory upgrade — IntervalView component

Shared component used in **both Lookup and Learn**. Renders any chord two ways with a toggle:

- **Stacked-thirds (default):** bottom-up adjacent gaps — e.g. `Cm7 = root ·+m3· ♭3 ·+M3· 5 ·+m3· ♭7`. Mirrors how the left hand physically stacks the chord.
- **Formula:** intervals-from-root — e.g. `Cm7 = R, ♭3, 5, ♭7`. Matches symbol-definition notation.

Design notes:
- Per chord **quality** (maj7 / m7 / dom7 / ø7 / °7 / triads / extensions) the stacked pattern is invariant, so the view doubles as a **reusable-shape teacher** ("m7 = minor-3rd, major-3rd, minor-3rd").
- Computed from the `tonal` intervals already present in the chord model — **pure presentation, no new data**.
- Reuses the corrected solfège (accidentals carry through, e.g. `Mi♭`).

## Data / persistence

No migration. SRS facts, song-filter pref, progress/streak stats keep their current schema. Only the **pages that display** this state move between routes. This is a UI + routing restructure.

## Testing strategy

- Existing per-route test files remap to the hub that absorbs them.
- Merged Practice queue: new interleaving tests, including the single-type-due quality gate.
- IntervalView: unit tests for stacked vs formula across each chord quality, plus accidental carry-through.
- Redirect shims: a test per old route asserting redirect to the correct hub.
- Full suite + `svelte-check` must stay green.

## Risks

- **Monster-file risk** in the Practice host — mitigated by the generators-as-modules constraint above.
- **Lost deep-links** — mitigated by the one-release redirect shims.
- **Merged nav muscle-memory** — acceptable; single-user app, user is driving the change.

## Rollout

Design + phased implementation plan written and committed now. Execution deferred: user reviews the plan, then phases run one at a time later. No code beyond docs in this pass.

## Related work (already landed this session, uncommitted in working tree)

Three bug fixes verified together (full suite green, `svelte-check` clean) — to be committed separately from this design:
- French i18n gap in Drills wrong-answer feedback (`contrast.ts` was English-only).
- First-note "electronic" sound — synth fallback fired before piano samples loaded; playback now awaits the sampler (`audio.ts`).
- Solfège dropped accidentals — `letterToSolfege` now carries `♭`/`♯` (`E♭` → `Mi♭`) across every render path.
