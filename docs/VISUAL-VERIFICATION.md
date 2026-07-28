# Visual verification

Visual checks on this project are automatable. They were treated as impossible
for several phases, which produced a backlog of "on-device visual UAT" items
shipped as `human_needed` or `accepted-unverified`. This document records why
that belief was wrong, and how to run the checks that now replace most of it.

## The preview-pane diagnosis

The recorded reason agents could not verify UI here was that the in-app browser
preview pane "cannot hydrate this app", attributed to a null-origin problem.

**That does not reproduce. The app hydrates in the preview pane correctly.**

Measured against `vite dev` loaded in the preview pane:

| Probe | Result |
| --- | --- |
| `location.origin` | `http://localhost:5174` (a normal origin, not `null`) |
| `window.isSecureContext` | `true` |
| `localStorage` read/write | `ok` |
| `indexedDB.open(...)` | `ok` |
| Service worker registrations | `1` |
| Console errors | none |
| Console warnings | only `[vite] connecting... / connected.` |
| Hydration | completes; `Math.random`-free interactions work |

Interaction was verified end to end, not just inferred from markup: typing
`Cm7` into the Lookup field and pressing **Stamp** produced the full reveal
(`Cm7 = Cmin7 = Cmi7 = C-7`, `R C`, `m3 E♭`, `P5 G`, `m7 B♭`, the keyboard, and
the "Why these notes?" panel). Navigating to `/practice` at a 375x812 viewport
rendered the bottom tab bar with four 94x56 slots and no horizontal overflow.

None of the hypothesised causes hold either:

- `resolve.conditions: ['browser']` in `vite.config.ts` does not break the
  client build.
- `adapter-static` with `strict: true` builds and prerenders every route.
- `src/service-worker.ts` registers without error and does not misroute fetches.
- `crossOriginIsolated` is `false`, which is normal and does not partition
  storage here.
- The Dexie database (`music-learn-recall`) is **not** opened at module load.
  `src/lib/srs/deck.ts` creates it lazily inside `_database()`, which is only
  reached from async functions, so importing the module touches nothing. There
  is no module-load storage failure to fix.
- Vite's HMR websocket connects.

### What most likely happened instead

`preview_start` resolves `.claude/launch.json` and spawns `npm run dev` from the
**session's launch directory, not the agent's worktree**. This repo runs many
sibling worktrees in parallel, so an agent working in worktree A gets a dev
server serving worktree B.

This was observed directly. Starting the preview from a session whose cwd was a
sibling worktree produced a page whose SvelteKit start script imported:

```
import("/@fs~/code/music-learn/.claude/worktrees/adoring-archimedes-5f54a7/.svelte-kit/generated/client/app.js")
```

while the agent believed it was serving `t10-visual-verify`. An agent checking
its own change under those conditions sees none of its edits and reasonably
concludes the preview is broken. Re-rooting the dev server at the correct
worktree made everything work.

**Practical guidance:** the preview pane is usable, but confirm what it is
actually serving before trusting it. `curl -s <url> | grep -o '@fs[^"]*app.js'`
prints the worktree path the client entry is loaded from. If it is not yours,
start the server yourself (`npx vite dev --port <n>`) from your worktree and
navigate to that port.

Regardless: a preview pane needs an agent driving it by hand. The Playwright
suite below is the durable answer, because it runs unattended, in CI, against
the production build.

## Running the checks

```
npm run test:e2e:install    # once per machine: downloads Chromium (~180MB)
npm run test:e2e            # the suite
npm run test:e2e:ui         # same suite, Playwright's interactive UI
```

`test:e2e` runs `npm run build` and serves `build/` on port 4173 by itself, so
there is nothing to start first. Locally an already-running server on 4173 is
reused; in CI it always builds fresh.

Current shape: 38 checks, about 10 seconds, single Chromium project, 2 workers,
no retries. Screenshots land in `screenshots/`, traces and failure shots in
`test-results/`. Both are gitignored.

The suite runs against the **production build**, not `vite dev`, because the app
prerenders every route via `@sveltejs/adapter-static` with `strict: true`. A
broken route shows up as a build failure, and the built CSS is what users get.

## What it covers

| Area | Checks |
| --- | --- |
| Phone layout (375x812) | Each of the four hubs renders its `h1` and masthead; the bottom tab bar is visible with 4 links; the active tab matches the route; no page scrolls horizontally. |
| Desktop layout (1280x800) | Each hub renders; the tab bar is hidden above the 640px `sm:` breakpoint; no horizontal scroll. |
| Tap targets | Tab bar slots and white keys >= 44x44 CSS px; black keys >= 24x24; white-key pitch >= 44px. Measured at portrait phone, landscape phone, and desktop. |
| Contrast | Nav active state, the due-count badge, and the streak chip, computed from rendered colours against the WCAG 1.4.3 threshold for each element's own size and weight. |
| Drill entry | All six practice families (name-it, build-it, interval, voicing, progression, inversion) opened deterministically as the first question of a session, each screenshotted. |
| Screenshots | The four hubs at phone and desktop width, plus one per drill family. |

### The tap-target rule

Not one blanket number, because a piano's black keys are legitimately narrower
than its white keys:

- **44x44** for tab bar items and white keys. The conventional fingertip floor
  (WCAG 2.1 SC 2.5.5, Apple HIG), and the number this codebase already chose:
  `keyboardLayout.octavesForWidth()` drops from two octaves to one specifically
  to keep white keys at or above `minWhiteKeyPx = 44`.
- **24x24** for black keys. WCAG 2.1 SC 2.5.8 is the AA-level target-size
  criterion and sets 24px; it carries an explicit exception for targets whose
  presentation is essential, which a keyboard's geometry is. 24px is the
  strongest floor that stays honest about the instrument.
- **44px white-key pitch.** `PianoKeyboard.svelte`'s stylesheet says outright
  that the real touch guarantee is pitch-based, not width-based, so this
  measures the property the code claims.

### Deterministic drill entry

A previous phase's progression-drill UAT was abandoned as BLOCKED because there
was no reliable way to open a progression bar. `/practice` composes one hybrid
queue from FSRS-due cards plus synthetic items, weaves families with
`Math.random`, and keeps progression and inversion out of the first slot
whenever the session is "cold" (mostly New cards), which a fresh deck always
is. Tapping Start by hand could never guarantee a progression.

`openPracticeFamily(page, family)` in `tests/e2e/helpers.ts` controls the three
real inputs instead: the deck (seeded mature, straight into the app's own
IndexedDB store), the daily intro budget (exhausted, so the page cannot top the
deck up), and `Math.random` (pinned to a constant before any app script runs).
No production code was added or changed for this, and there is no test-only flag
in the bundle.

Three of the six families (voicing, progression, inversion) are reached by
steering a tie-break in the queue composer, so if its ordering rules change
those three fail with an explicit "re-pick the rng constant" message. That is a
deliberate trade: a loud one-line fix beats having no way in at all.

### Why pixel snapshots are off

`toHaveScreenshot()` comparison is deliberately not enabled:

1. Baselines are committed binaries, and the owner asked not to commit
   screenshots.
2. Several surfaces are randomised by design (queue order, random chord
   prompts, FSRS due dates that move with the clock), so baselines would go
   stale daily rather than catch regressions.
3. Font rasterisation differs between a Mac and any CI container, so baselines
   would need per-platform variants to avoid false failures.

Computed assertions (contrast ratios, box geometry, scroll widths) are stable
and meaningful, so the suite asserts those and captures screenshots purely as
artifacts.

## Known gaps recorded as expected failures

Two real defects were found by this suite and left unfixed, because both live in
files outside this change's ownership. Each is an honest assertion at the real
threshold, marked `test.fail()` so the run stays green without pretending the
check passed. Fixing either makes Playwright fail the run for "passed
unexpectedly", which is the signal to delete the marker.

1. **Streak chip contrast.** `--color-muted` (#7d7462) on `--color-paper`
   (#f2ecdd) at 12px/700 is **3.92:1**, below the 4.5:1 AA floor that applies at
   that size. A separate test fails for real if it ever drops below 3.0:1. The
   fix is a shared design token in `src/app.css` or the chip in
   `src/lib/components/StreakBadge.svelte`; `--color-muted` is used app-wide, so
   it is the owner's design call.
2. **One-octave keyboard at 375px.** White keys render **43.80px** wide on a
   **43.32px** pitch, under the 44px floor the code claims. `octavesForWidth`
   only tests the two-octave case (`width >= 15 * 44`) and otherwise returns 1
   without checking that one octave still needs `8 * 44 = 352px`. A 390px-class
   phone clears it; a 375px-class phone does not. The fix belongs in
   `src/lib/components/keyboardLayout.ts` or `PianoKeyboard.svelte`.

## What still needs a human

Automation replaces "is it legible / is it reachable / does it overflow". It
does not replace judgement. These still need eyes:

- Whether an animation *feels* right: the reveal stamp-in beat, the pulse on
  audio sync, the `/drills` practice-pool hover recede-reveal. Playwright can
  confirm a class or keyframe applies, not that the motion reads well.
- Aesthetic calls: ink-on-paper warmth, whether the vermilion reward signal
  lands, whether a layout feels crowded at a given width.
- Real-hardware behaviour: actual touch accuracy with a thumb, iOS Safari
  quirks, PWA install and home-screen launch, MIDI hardware input.
- Whether the pedagogy works, which no browser can measure.

