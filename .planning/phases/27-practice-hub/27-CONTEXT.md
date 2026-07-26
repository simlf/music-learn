# Phase 27: Practice Hub — One Smart Interleaved Session - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning
**Mode:** Autonomous — grounded in the approved design + a codebase scout of the drills/practice/srs subsystem + one user decision (queue model = HYBRID).

<domain>
## Phase Boundary

Deliver a single Practice hub at `/practice`: one "Start practice" action runs ONE interleaved session that mixes all five drill families (name-it, build-it, voicings, intervals, progressions). No mode-picker grid. The session preserves the existing drills engine's grading (chroma/MIDI, never letter strings), tiers, scaffold ladder, and telemetry. The song filter still steers it. When only one family is due, only that family appears (single-type-due gate).

This phase does NOT delete or redirect the old routes (that is Phase 30) and does NOT migrate persisted schema.

</domain>

<decisions>
## Implementation Decisions

### Queue model = HYBRID (user decision, load-bearing)
The design's "one FSRS queue over all five generators" collides with reality: only chord-formula / interval-size / scale-degree facts are FSRS cards (`src/lib/srs/`). Progressions have NO card identity; voicings only READ card state. Adding card kinds for them = a persisted-schema change, which is an explicit non-goal.

Resolution (chosen): **hybrid queue.**
- The three fact-backed families are scheduled by the real FSRS engine (`src/lib/srs/`): name-it (chord identification), build-it (formula-build / construction), intervals (interval-size). Their due/weakness ordering comes from `rotation.selectReviewCards` + `rotation.interleaveQueue` exactly as `/recall` does today.
- Progressions and voicings interleave as **synthetic, non-persisted queue items** using their existing generation + stage logic (`practice/progressions.ts`, `practice/shellVoicing.ts` incl. `voicingStageForChord` read-only over the deck). They are woven into the same session queue, not FSRS-due-scheduled.
- One combined session, one Start button, one interleaved order. `interleaveQueue`'s no-3-in-a-row rule extends to treat synthetic items as their own "family" so variety holds when multiple families are present.
- **Single-type-due gate (PRAC-05):** the queue only contains what is actually due/available. If only one family has due items, the session surfaces only that family — no artificial variety injection, no padding from other families.

### Host = new thin `/practice` route (NOT a second monolith)
- Create `src/routes/practice/+page.svelte` as the hub host. It owns ONLY reactive session glue (current item, answered/feedback UI state, score) and delegates: (a) item selection to a new pure queue-composition module, (b) per-family rendering to small branch components.
- **Structural constraint (design + roadmap Notes):** the existing `/drills/+page.svelte` is 1459 lines because it inlines four render branches + session glue. Do NOT copy that monolith into `/practice`. The five generators are ALREADY pure modules — import them; do not re-entangle. Extract the reusable render branches (chord-construct, chord-identify, interval-identify, interval-construct, plus build/voicing/progression renderers) into components so the host stays thin.
- Reuse the `/recall` `load()` wiring skeleton (`RecallSession.svelte` load: getDueCards → intro budget → applySongFilter → selectReviewCards → interleaveQueue → buildQueue → grade via recordGrade + advanceQueue) as the reference for the FSRS half.
- `/drills` stays working and untouched this phase (its redirect to `/practice` is Phase 30). Prefer factoring shared render/grading into modules/components over duplicating logic; if full extraction is too large, the host may compose existing components (BuildSession embed seam `embedFact`/`onComplete`, ShellVoicingDrill, ProgressionDrill) rather than re-implement their loops.

### Grading, telemetry, tiers, scaffolds (REG-01 binding)
- Grade by chroma/MIDI via the shared `matchChord` (chord families) and `gradeIntervalTap` (intervals) — never letter-string equality. This is a locked project constraint.
- Preserve telemetry: `recordPracticeAnswer` (fire-and-forget), `appendPracticeAnswer`, `recordSessionAnswer`, scaffold writes. FSRS grade commits go through `srs/deck.recordGrade` for carded families.
- Preserve the tier gate + interval scaffold fading (`scaffoldLevel`, `IntervalScaffold`) and the hint ladder (`HintLadder`) as they behave in drills today.
- ear-naming (hear-name) stays multiple-choice and never gates progress (locked constraint) — if it appears in the mix it follows that rule.

### Song filter (PRAC-04)
- Read the global pref once via `readSongFilter()` (`practice/songFilterPref.ts`). Apply it as a candidate restriction to BOTH halves: FSRS due cards via `applySongFilter`/`symbolHasProvenance`; synthetic items via `drillableSongSymbols()`/provenance. Management UI stays on `/songs` (Progress hub, Phase 29). No toggle rendered on `/practice`.

### Claude's Discretion
- Exact module boundary for the queue composer (e.g. `src/lib/practice/practiceQueue.ts`) and the synthetic-item type shape.
- How finely to extract drills render branches into components vs. reuse existing whole-component seams — optimize for host thinness and no logic duplication; the planner/executor decide the split.
- Session length / end-of-round behavior for the merged session (follow drills' round model or recall's queue-drain model, whichever reads cleaner); keep the "Start practice" entry single-action.

</decisions>

<code_context>
## Existing Code Insights (from subsystem scout — file:line)

### Two schedulers today (the core gap)
- `src/lib/practice/session.ts` + `pool.ts` — drills' NON-FSRS 10-question micro-session (tier/weighted, in-memory). Drives name-it/build-it/intervals on the drills page.
- `src/lib/srs/` — the real FSRS engine, used only by `/recall`. `deck.ts` (Dexie `music-learn-recall`, card key `(factId, mode)`, `getDueCards`, `recordGrade`, `introduceNewCards`), `rotation.ts` (`selectReviewCards` weakness=ascending-stability, `interleaveQueue` no-3-in-a-row), `session.ts` (`buildQueue`/`advanceQueue`, storage-agnostic), `facts.ts` (fact catalog + kinds), `scheduler.ts` (ts-fsrs seam), `introBudget.ts`.

### The five generators (all already pure, DOM-free — import, don't re-entangle)
- name-it / build-it (chord): `src/lib/drills/generateQuestion.ts` (`generateQuestion({direction})`, `pickDistractors`).
- build-it (construction state machine): `src/lib/practice/construction.ts` (`createChordConstruction`, `gradeConstructionTap`).
- intervals: `src/lib/drills/generateIntervalQuestion.ts` (`generateIntervalQuestion`, `gradeIntervalTap`, `intervalQuestionNotes`).
- voicings: `src/lib/practice/shellVoicing.ts` (`seventhChordSymbols`, shell/rootless/full note builders, `voicingStageForChord`).
- progressions: `src/lib/practice/progressions.ts` (`randomProgression`, `buildProgression`, `nameChoices`, `PROGRESSION_TEMPLATES`).

### Reference wiring to generalize
- `RecallSession.svelte` `load()` (~L312-372) is the exact FSRS session skeleton to reuse.
- Grader: `src/lib/drills/matchChord.ts` (`matchChord`, `MatchResult`) — shared by drills, recall, voicings, progressions.

### Shared components a merged Practice reuses
- `PianoKeyboard.svelte` (universal input/reveal), `HintLadder.svelte`, `IntervalScaffold.svelte`, `RevealInsight.svelte`, `ChordGlyph`, `IntervalChip`, `SongMark`, `SongHook`, `InspectRegister`, `Button`, `LevelPicker`.
- Existing whole-drill components with embed seams: `BuildSession.svelte` (`embedFact`/`onComplete`), `ShellVoicingDrill.svelte`, `ProgressionDrill.svelte`.

### Integration points
- `src/routes/practice/+page.svelte` (NEW host).
- Song filter: `practice/songFilterPref.ts` (`readSongFilter`), `practice/songProvenance.ts`.
- Nav wiring to `/practice` is Phase 30, not here — but the route must exist and work standalone now.

</code_context>

<specifics>
## Specific Ideas

- "Start practice" = a single primary action on `/practice`; no grid of drill-type buttons.
- The merged session must be demonstrably able to surface a single family when only that family is due (PRAC-05) — this needs an explicit test.
- New tests (REG-02, formally Phase 31 but write them here): queue interleaving across families, the single-type-due gate, song-filter steering the merged queue, and that carded families still commit FSRS grades.
- The IntervalView from Phase 26 is NOT part of this phase (it belongs to Lookup/Learn), but the interval FAMILY drill is.

</specifics>

<deferred>
## Deferred Ideas

- Giving progressions & voicings real FSRS card identity (full unification) — deliberately deferred; hybrid chosen to avoid a persisted-schema change this milestone.
- Redirecting `/drills`, `/voicings`, `/build`, `/progressions`, `/scales`(practice) to `/practice` — Phase 30.
- Relocating scales "Practice" tab into the Practice hub — Phase 28 finalizes the scales split; if trivial to include the scale-keyboard drill in the mix here, note it, else defer to 28.
- Removing the old per-route drill pages — a later cleanup milestone (shims live one release).

</deferred>
