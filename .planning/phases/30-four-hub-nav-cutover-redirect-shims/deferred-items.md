# Deferred Items — Phase 30

## From Plan 30-02 (drill-seed handoff into /practice)

Ran the full `npm test` suite after completing 30-02's two in-scope tasks
(seed wiring + `practiceSeedHandoff.test.ts`). 7 pre-existing test files fail;
confirmed via `git show d841d1d:...` that these failures predate this plan
entirely (introduced by 30-01's nav cutover to 4 hubs, `d841d1d`/`297dc8f`)
and are unrelated to any file this plan touched (`src/routes/practice/+page.svelte`,
`src/routes/practiceSeedHandoff.test.ts`). Out of scope per this plan's own
`files_modified`/verification section (which only requires
`practiceSeedHandoff.test.ts` green + the two existing `practice-hub*.e2e`
suites unaffected — both confirmed passing). CONTEXT.md's "Tests" decisions
already name these exact files for removal/update by other work in this
phase (30-03/30-04) or Phase 31's comprehensive remap:

- `tests/drills.e2e.test.ts` — masthead nav link test asserts a `/drills`
  link exists; CONTEXT.md explicitly marks this file for removal (route-bound
  test, superseded by hub tests).
- `tests/scales.e2e.test.ts` — same pattern, marked for removal.
- `tests/theory.e2e.test.ts` — same pattern, marked for removal.
- `src/routes/progressionsPage.test.ts` — asserts `/progressions` reachable
  via masthead/More sheet; marked for removal.
- `src/routes/voicingsPage.test.ts` — same pattern, marked for removal.
- `src/lib/i18n/coverage.test.ts` — one nav-label-flip test asserts a
  `Drills` masthead link exists; needs updating to the 4-hub nav (not
  listed explicitly in CONTEXT.md's per-file removal list, but same root
  cause).
- `tests/progress.e2e.test.ts` — masthead nav link test asserts a
  `/progress` link exists; Progress stays a hub so this one likely just
  needs its assertion left as-is once the surrounding suite settles, but it
  currently fails alongside the others (not yet investigated in depth — flag
  for whichever plan does the "full `npm test` MUST be green" gate).

Whichever of 30-03/30-04/30-05 (or a follow-up) owns "the full suite is
green at the end of this phase" (per 30-CONTEXT.md's phase-level
requirement) should sweep these 7 files as part of that pass.
