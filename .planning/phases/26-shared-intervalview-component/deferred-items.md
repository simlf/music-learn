# Deferred Items — Phase 26

## Pre-existing test failure (not caused by Plan 03)

`src/lib/i18n/messages.test.ts > domain dictionary key collisions (I18N-02) > every domain key survives the merge unshadowed`

Expected 496, received 501. Confirmed pre-existing (reproduces identically with Plan 03's changes stashed out) — introduced by Plan 02's `interval-view.ts` domain file (5 new keys) without updating this test's hardcoded expected total. Out of scope for Plan 03 (only touches `IntervalView.svelte`/`intervalView.test.ts`). Flagging for Plan 04 or a follow-up quick task to update the expected count.
