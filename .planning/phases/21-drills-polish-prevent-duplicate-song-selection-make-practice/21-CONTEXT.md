# Phase 21: Drills Polish - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning
**Source:** Autonomous capture (user request, grounded against live code) — no interactive discuss-phase per the "de manière autonome" instruction.

<domain>
## Phase Boundary

Three targeted polish/bugfix changes across the practice surfaces. No new pages, no
schema changes, no new dependencies. All three are small, well-scoped edits to
existing components verified against the current code.

**In scope:**
1. Prevent adding the same preset song twice on `/songs`.
2. Make the "practice pool / bassin de pratique" filter bar on `/drills` visually
   discrete (recede during play; reveal on hover/focus on desktop), while keeping the
   filter on/off state persisted across sessions.
3. Add an on-demand "hear it again" replay of the full chord in the `/drills`
   answer-reveal state, so the user can re-hear the whole chord (not just the
   individual note taps).

**Out of scope:** MIDI, new audio engine work, spaced-repetition changes, the Recall
surface (unless a shared component forces a touch), any redesign beyond these three.
</domain>

<decisions>
## Implementation Decisions

### Change 1 — Prevent duplicate song selection (BUG)
- **Root cause (verified):** `src/routes/songs/+page.svelte` `addPreset()` (~line 189)
  calls `songFromPreset(preset)` then `saveSong(song)` unconditionally. `songFromPreset`
  (`src/lib/practice/presets.ts:134`) mints a fresh `crypto.randomUUID()` each call, and
  `saveSong` (`src/lib/practice/songs.ts:66`) upserts by `id`. Two clicks on the same
  preset card therefore create two identical songs with different ids.
- **Decision:** Dedupe by `presetId`. A preset that is already present in the user's
  song list (any song whose `presetId === preset.presetId`) must NOT create a second copy.
- **UX for the already-added case:** the preset card reflects an "added" state (visually
  marked and non-duplicating). Clicking an already-added preset scrolls to / highlights
  the existing song row (reuse the existing `scrollIntoView` behavior already in
  `addPreset`) instead of saving a duplicate. Do not hard-remove the card; keep it
  discoverable but clearly "already added."
- **Guard is `presetId`-based, not name-based** — custom songs and preset songs are
  distinct; only presets carry `presetId`. Custom-song duplicates are out of scope.
- New copy (e.g. an "Added" / "Déjà ajouté" label) must be bilingual (EN + FR) in
  `src/lib/i18n/messages/songs.ts` and use no em dashes (project copy rule).

### Change 2 — Make the practice-pool filter bar discrete + persist
- **What it is (verified):** the `SongFilterToggle` component
  (`src/lib/components/SongFilterToggle.svelte`), rendered on `/drills` at
  `src/routes/drills/+page.svelte:904`, shows a mono `poolLabel` ("PRACTICE POOL" /
  "BASSIN DE PRATIQUE", key `drills.filter.poolLabel`) plus the "From my songs" toggle
  and an explanatory note, inside a loud `2px solid` bordered `--color-paper-bright` box
  with `--spacing-lg` padding. This visual weight "breaks immersion."
- **Persistence already exists (verified):** the filter on/off state persists via
  `localStorage['music-learn:drills-song-filter']` (`readDrillsSongFilter` /
  `toggleSongFilter` in `+page.svelte`). Keep this working — it satisfies
  "gardée en mémoire si je l'active." Treat "the filter survives reload" as a
  regression-guard acceptance criterion (fix if the restyle breaks it).
- **Discrete design decision:**
  - Reduce the control's visual weight: lighter/compact styling, drop the heavy
    filled box so it no longer competes with the drill card.
  - **Desktop (hover-capable, gate with `@media (hover: hover)`):** the control recedes
    (reduced opacity) during play and lifts to full opacity on hover AND on
    `focus-within` (keyboard access). Never fully hidden — discoverability + a11y.
  - **Touch / no-hover:** always at normal readable opacity (no hover dependency), just
    the lighter compact styling.
  - `focus-visible` must always fully reveal the control (keyboard users).
  - Respect `prefers-reduced-motion` for the opacity transition.
- **Shared-component caution:** `SongFilterToggle` is also imported by the Recall
  surface (`RecallSession`). Prefer scoping the discrete/recede behavior so Recall is
  not visually broken — e.g. an opt-in prop/variant on the component, or scope the CSS
  to the Drills usage. Do not silently restyle Recall's copy of the bar without checking
  it still reads well; if a shared change is unavoidable, verify Recall too.
- No new persisted "pin/expand" state is introduced — the filter on/off persistence is
  the only remembered option. (Keeps it simple and a11y-safe.)

### Change 3 — Replay the played chord as a full chord
- **What happens now (verified):** in construction mode each on-screen key press sounds
  its individual note (`pressKey` -> `playNote`, `+page.svelte:455`). On answer reveal,
  `recordGrade` (`+page.svelte:465`) plays the full chord exactly once via
  `playChord((question.kind === 'chord' ? target.notes : intervalNotes).map(n => n.letter))`.
- **Decision:** In the answered/reveal state, add an on-demand "hear it again" button
  that replays the FULL chord (same `playChord(target.notes.map(n => n.letter))` call as
  the auto-play), so the user can re-hear the complete chord as many times as they want
  to memorize it.
- **Scope:** chord questions (both construction and identification directions). Interval
  questions are out of scope for this button (user asked specifically about "quand je
  joue un accord"). Place the control in the `answered && feedback` reveal region
  (`+page.svelte:1095`), visible whether the answer was right or wrong.
- Guard on `soundEnabled()` semantics already handled inside `playChord` (silent no-op
  when sound is off) — no extra gating needed, but the button should still render.
- Button copy must be bilingual (EN + FR), no em dashes, mono/label voice consistent
  with existing drill controls (e.g. "Hear it again" / "Réécouter").

## Claude's Discretion
- Exact CSS values for the discrete styling (opacity levels, transition timing),
  provided they meet the recede-on-desktop / readable-on-touch / focus-visible rules.
- Whether change 2 is implemented via a `SongFilterToggle` prop variant or Drills-scoped
  CSS — planner/executor picks the cleaner option that leaves Recall intact.
- Exact placement/label of the replay button and the "already added" preset marker,
  within the anchors above.
- Test shape (extend existing `songFilterToggle.test.ts`, songs page tests, drills
  tests) following current patterns.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Change 1 (duplicate song)
- `src/routes/songs/+page.svelte` — `addPreset` (~189), preset card `#each` (~272)
- `src/lib/practice/presets.ts` — `songFromPreset` (134), `SONG_PRESETS`
- `src/lib/practice/songs.ts` — `saveSong` (66, upsert-by-id), `listSongs`, `Song` type
- `src/lib/i18n/messages/songs.ts` — add any new EN+FR copy here

### Change 2 (discrete practice-pool bar)
- `src/lib/components/SongFilterToggle.svelte` — the bar + its `.song-filter-toggle-bar` CSS
- `src/routes/drills/+page.svelte` — usage at 904; `readDrillsSongFilter` / `toggleSongFilter` / `songFilterOn` persistence
- `src/lib/components/RecallSession.svelte` — other consumer of `SongFilterToggle` (do not break)
- `src/lib/components/songFilterToggle.test.ts` — existing tests to extend

### Change 3 (chord replay)
- `src/routes/drills/+page.svelte` — `recordGrade` (460), reveal block (1095), `pressKey` (455)
- `src/lib/audio/audio.ts` — `playChord` (251), `soundEnabled` (semantics)
- `src/lib/i18n/messages/drills.ts` — add EN+FR button copy

### Project rules
- `.claude/CLAUDE.md` — stack + GSD conventions
- Copy rule: no em dashes in any UI string (periods/colons/commas instead).
- Every new user-facing string needs EN and FR entries (bilingual i18n layer, Phase 20).
</canonical_refs>

<specifics>
## Specific Ideas
- User's words: "je peux choisir 2 fois le même morceau" (dup must be prevented);
  the bassin-de-pratique div "gâche un peu l'immersion" and on desktop should maybe
  reveal on hover, "il faut y réfléchir"; the option should be "gardée en mémoire si je
  l'active"; and after playing a chord, "j'aimerais pouvoir l'entendre ... rejoué ...
  l'accord complet" for memorization.
</specifics>

<deferred>
## Deferred Ideas
- Custom-song (non-preset) duplicate prevention — out of scope; presets only.
- Interval-question chord/pair replay button — out of scope.
- Any Recall-surface redesign of the filter bar beyond not-breaking-it.
</deferred>

---

*Phase: 21-drills-polish*
*Context gathered: 2026-07-19 via autonomous capture*
