---
phase: 38-midi-connection-progressive-enhancement
fixed_at: 2026-08-04T23:58:00Z
review_path: .planning/phases/38-midi-connection-progressive-enhancement/38-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 38: Code Review Fix Report

**Fixed at:** 2026-08-04T23:58:00Z
**Source review:** `.planning/phases/38-midi-connection-progressive-enhancement/38-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (1 critical, 10 warnings; `fix_scope: critical_warning`, so the 7 Info findings were not attempted)
- Fixed: 11
- Skipped: 0

## Verification

Run after the last commit, in a clean isolated worktree off `claude/gsd-plan-phase-38-2aa6d9`:

| Command | Baseline (pre-fix) | Result |
|---|---|---|
| `npm run check` | 1481 files, 0 errors | **1482 files, 0 ERRORS, 0 WARNINGS, 0 FILES_WITH_PROBLEMS** |
| `npm test` (Vitest) | 151 files / 2608 tests | **152 files passed / 2652 tests passed** |
| `npm run build` | succeeded | **succeeded**, `adapter-static` strict prerender, "Wrote site to build" |
| `npx playwright test` (not required, run anyway) | 69 passed | **75 passed** |

Phase hard constraints re-verified against the new build, not assumed:

- `grep -c midi-status build/index.html` = **0**, and no prerendered HTML file anywhere in `build/` contains `midi-status`. No MIDI markup survives prerender.
- The `webmidi` library is still its own chunk (`build/_app/immutable/chunks/BxoT61B_.js`, 68KB), referenced **only** from `build/_app/immutable/nodes/0.*.js` as `import(\`...\`)`, with **zero** `modulepreload` entries for it in any prerendered HTML. The lazy dynamic import was not converted to a static one.
- No interval or poll loop was introduced; device state is still driven purely by `connected`/`disconnected` port events.
- Device names are still rendered through Svelte text interpolation, never `{@html}`.
- No em dashes in any new user-facing string (the two new copy keys use commas and periods).
- No note-grading logic added. `connectedDeviceId()` / `activeInput()` are untouched as the Phase 39 seam, and CR-01's fix makes `connectedDeviceId()` **more** reliable for Phase 39, not different in shape.

## Fixed Issues

### CR-01: The port-event reducer ignores device identity

**Files modified:** `src/lib/midi/midi.svelte.ts`, `src/lib/midi/midi.test.ts`
**Commit:** `6aba1e3`
**Status:** fixed: requires human verification
**Applied fix:** `nextMidiState` now compares `event.id` against the currently selected `deviceId` on both branches. A `connected` input event while a device is already selected returns `current` unchanged (covers both "a different port must not hijack us" and "our own port re-announcing itself is a no-op with no reactive churn"). A `disconnected` input event only clears the connection when `current.deviceId === event.id`.

The disagreement the review named is reconciled explicitly as **FIRST PORT WINS**, stated in the doc comments of *both* `stateFromEnable` and `nextMidiState` so the two paths cannot silently drift apart again: `stateFromEnable` keeps `inputs[0]`, and the reducer refuses to let a later port displace an already-selected one. That is the policy that matches the existing single-instrument assumption; "last port wins" would have required changing `inputs[0]` instead, which would have made the displayed device nondeterministic on a multi-port piano.

Regression coverage added, all using **two distinct port ids** (the reason the suite was green: every prior case used only `in-1`):
- `connected(in-1)` then `connected(in-2)` keeps `in-1`
- `connected(in-1)` then `disconnected(in-2)` stays connected
- `disconnected(in-1)` from `connected(in-1)` goes to `disconnected`
- our own port re-announced is a same-reference no-op
- an explicit cross-check that `stateFromEnable` and the event path select the same port for the same two-port instrument
- a new device is only adopted once our own port has gone away
- an end-to-end case through `connectMidi()` + the real `watchPorts` handler asserting `connectedDeviceId()` stays pinned to `in-1` across an `in-2` connect and an `in-2` disconnect

**Why flagged for human verification:** this is a state-machine/logic change, and the tests can only prove it against synthetic port ids. The policy choice itself (first port wins) is a judgement call about real hardware, so the hardware UAT in 38-04 with the physical USB piano attached is the thing that confirms the *right* port is the one selected on a multi-port instrument.

### WR-01: `watchPorts` dereferences `event.port` unguarded

**Files modified:** `src/lib/midi/webmidi.ts`, `src/lib/midi/webmidi.test.ts`
**Commit:** `be7ad03`
**Applied fix:** `PortChangeEvent` now types `port` (and its fields) as optional, matching what the library actually guarantees rather than what is convenient, with the reasoning recorded on the interface. The two byte-identical listener bodies were collapsed into a single `forward(type)` factory (which also removes IN-07's duplication, since that duplication is exactly what would let the guard be added to one branch and forgotten on the other). The factory drops any event with no `port`, no `port.id`, or a `type` that is neither `input` nor `output`, rather than throwing from inside a browser-dispatched `statechange` callback where app code cannot catch it.

Five tests added: `port: undefined`, an event with no `port` key at all, a port with no `id`, a port with an unrecognised `type`, and a positive control proving a fully resolved port is still forwarded (so the guard is not over-broad).

### WR-02: A stale `watchPorts` disposer clobbers a newer registration

**Files modified:** `src/lib/midi/webmidi.ts`, `src/lib/midi/webmidi.test.ts`
**Commit:** `2e278e0`
**Applied fix:** the disposer now clears each module-scope reference only if it is still the one it registered (`if (registeredConnected === onConnected) ...`). Test added for the exact sequence from the review: `d1 = watchPorts(a); watchPorts(b); d1();` then `watchPorts(c)` must still remove `b`'s listener. It is a real discriminator, not a tautology: without the fix, `d1()` nulls both refs, `watchPorts(c)` issues no `removeListener` call at all, and the `toContain(bConnected)` assertion fails.

### WR-03: The device name is used as a `String.replace` replacement pattern

**Files modified:** `src/lib/components/MidiStatus.svelte`, `src/lib/components/midiStatus.test.ts`
**Commit:** `cdd13e2`
**Applied fix:** `t(key).replace('{NAME}', () => name)`. A replacer function disables pattern interpretation entirely, so `$&`, `` $` ``, `$'`, `$$`, `$1` and `$<name>` in a USB descriptor can no longer rewrite the chrome copy around themselves. Six cases added covering all of those forms, asserting the literal text renders.

### WR-04: The permission call is separated from the gesture by a lazy chunk fetch

**Files modified:** `src/lib/midi/webmidi.ts`, `src/lib/midi/webmidi.test.ts`, `src/lib/midi/midi.svelte.ts`, `src/lib/midi/midi.test.ts`
**Commit:** `2d1b161`
**Applied fix:** `loadWebMidi()` is now memoised (`modPromise ??= import('webmidi')...`), and a new exported `prewarmMidi()` starts that load without requesting anything. `initMidi()` calls it on its **supported branch only**, so `enableMidi()`'s `await` resolves from the microtask queue and `navigator.requestMIDIAccess()` stays in the same task as the click.

Two things deliberately built in beyond the review's snippet: the memo is dropped on rejection before re-throwing, so one failed fetch (offline, transient error) cannot poison every later connect attempt; and `prewarmMidi()` is itself feature-detect-gated, so Safari and every iOS browser never reach the fetch from here.

Tests added: warm-up requests nothing on either a supported or an unsupported browser, is idempotent across three calls, and a warmed module still enables exactly once with `{ sysex: false }`. On the state-machine side: `initMidi()` warms on a supported browser while still calling `enableMidi` zero times, never warms on an unsupported browser, and never warms on a remount that short-circuits on an already-connected state.

### WR-05: The chip's interactive states expose a status as their accessible name

**Files modified:** `src/lib/components/MidiStatus.svelte`, `src/lib/components/midiStatus.test.ts`, `src/lib/i18n/messages/chrome.ts`
**Commit:** `68384cd`
**Applied fix:** all three sub-defects addressed, one of them only partly (see below).

1. **Accessible name.** New `midi.aria.connect` / `midi.aria.retry` keys in both locales. `idle` takes the full replacement ("Connect MIDI"), since its visible copy is already an action. Every retryable state gets the action **appended** to the visible label ("MIDI: NO DEVICE, retry connecting") rather than replacing it, which satisfies WCAG 2.4.6 / 4.1.2 without breaking 2.5.3 Label in Name (a bare "Retry MIDI connection" label would have violated 2.5.3, so the review's literal snippet was adapted). `enabling` sets no `aria-label`, because naming a retry on a chip that is mid-attempt would be a lie.
2. **Live region.** One persistent `role="status" aria-live="polite"` `sr-only` span, rendered outside the inner branch so it is the *same node* across `enabling -> connected`/`denied`/`error` (a live region inserted at the same moment its text appears is not reliably announced). `role="status"` follows `UpdatePrompt.svelte`'s existing convention. The `connected` chip is `aria-hidden` so the device name is not read twice. `aria-busy` is now set while enabling. MIDI-04 is unaffected: the live region lives inside the `state.kind !== 'unsupported'` guard, and the "renders zero elements when unsupported" assertion still passes.
3. **Focus.** The chip now uses `aria-disabled` + `aria-busy` instead of the native `disabled` attribute, so the UA no longer blurs it the instant a connect starts. `handleClick`'s existing guard (plus `connectMidi`'s own re-entrancy guard) is what suppresses the click, so nothing depends on the browser refusing it. The CSS selector moved from `:disabled` to `[aria-disabled='true']`.

**Not fixed, deliberately:** focus is still lost on a *successful* connect, when the `<button>` is replaced by the `<span>`. The review's own primary snippet does not fix this either (it also renders the button only when `kind !== 'connected'`); only its parenthetical alternative does, by rendering a permanently disabled button for the connected state. That was rejected because the `2px solid var(--color-ink)` border is this design system's signal that an element is tappable, so a bordered-but-inert connected chip would falsely advertise an action that does not exist, and a disabled control with no purpose is its own a11y problem. The half that happens on *every* attempt (focus lost for the whole duration of the connect, then again on any non-success outcome) is fixed, which is what leaves the keyboard user on the retry affordance the next state offers them.

Nine tests added: idle/retryable accessible names (with a 2.5.3 containment assertion), `enabling` keeping the visible status as its name, `aria-busy`/`aria-disabled` presence and absence per state, focus survival across `idle -> enabling`, live-region role/politeness/text, live-region node identity across a state change, no live region when unsupported, and `aria-hidden` on the connected chip. One existing test was rewritten from `toBeDisabled()` to the aria pair.

### WR-06: `denied` is a dead-end affordance

**Files modified:** `src/lib/midi/webmidi.ts`, `src/lib/midi/webmidi.test.ts`, `src/lib/components/MidiStatus.svelte`, `src/lib/components/midiStatus.test.ts`, `src/lib/i18n/messages/chrome.ts`
**Commit:** `c078477`
**Applied fix:** `enableMidi()` now checks `navigator.permissions.query({ name: 'midi' })` **before** anything else and returns `{ ok: false, reason: 'permission-denied' }` on a persistent block, so a blocked user's tap no longer burns a request that Chrome auto-rejects with no prompt. `null` (Firefox rejects the `'midi'` permission name; `navigator.permissions` can be absent) is treated as "go ahead and ask", never as a denial. New `midi.status.deniedHelp` copy in both locales is wired as `aria-describedby` (an `sr-only` span) plus a `title` tooltip, so the recovery path is stated instead of implied.

**Adapted from the review's guidance:** the blocked chip stays a `<button>` rather than becoming inert copy. The Permissions API reports a site-settings change live, so a tap after the user allows MIDI genuinely reconnects; an inert chip would force a page reload for the user to discover that. The substance the review asked for (no pointless re-prompt, guidance to site settings) is delivered.

Note on the interaction with WR-04: this adds an `await` before `mod.enable()`, but `permissions.query()` answers from state the browser already holds with no network involved, so it does not reintroduce the seconds-long gap a cold chunk fetch created. That reasoning is recorded in the code.

Six tests added on the boundary (denied short-circuits with `enable` never called; the query is made by the name `midi`; `granted`, `prompt`, a throwing query, and an absent `navigator.permissions` all proceed normally) and three on the component (describedby + title + still activatable when denied; no guidance in any other state; French copy).

### WR-07: The service worker precaches the webmidi chunk on every device

**Files modified:** `src/lib/midi/webmidi.ts`
**Commit:** `57788f4`
**Applied fix:** the false half of the claim was replaced with what is actually true, per the phase constraint's fallback ("if the runtime behavior cannot be changed safely, correct the comment"). The comment now states precisely what the dynamic import does buy (own chunk, `import()`-only reference, no `modulepreload`, so no browser parses or executes it before a user asks to connect) and explicitly states what it does **not** buy (the SW precaches every hashed chunk at install on every platform including Safari/iOS, so those browsers do download it and simply never run it).

**Why the runtime behaviour was not changed:** excluding the chunk from `installPrecacheList` needs a stable filename marker to filter on. SvelteKit lists `build.rollupOptions.output.chunkFileNames` in its `enforced_config` and client chunks are emitted as hash-only `[hash].js` (`node_modules/@sveltejs/kit/src/exports/vite/index.js:79` and `:1103`), so there is no name to match and no supported way to add one. `manualChunks` alone cannot help, because the name it assigns never reaches the filename. Verified, not assumed. The cost left standing is ~68KB once per deploy on a browser that will not execute it, and it is now honestly documented rather than denied.

### WR-08: The "navigating away" e2e test cannot exercise what it claims, and the suite grants `midi-sysex`

**Files modified:** `tests/e2e/midi.spec.ts`
**Commit:** `80bfb1c`
**Applied fix:**
1. The navigation test now uses `page.getByRole('link', { name: 'Learn' }).click()` (SvelteKit client-side routing, JS realm preserved) instead of `page.goto('/learn')`, so the in-flight `enableMidi()` promise really does resolve into a still-live module while the user is on another route. It also now asserts the observable guarantee the review asked for: the chip is polled and must not be stuck on `enabling`. The overstated comment was replaced with one that explains why a full document navigation proved nothing.
2. `test.use({ permissions: ['midi'] })` only. `'midi-sysex'` is gone, with the reason recorded.
3. New spec `the connect path never requests system-exclusive access (T-38-01, real browser)` stubs `Navigator.prototype.requestMIDIAccess` in an init script to record the real options object and delegate to the original, then asserts `options?.sysex !== true` for every recorded call. It guards its own vacuous-pass mode with `expect(requests.length).toBeGreaterThan(0)`, and that assertion passes, so the stub is genuinely reached and this is now verified against the real browser rather than only against the fake namespace.

Not added: a real-browser `denied` path spec. Making Chromium produce a deterministic persistent block is environment-dependent and would be a flake source; the existing terminal-value poll already accepts `denied`, and WR-06's permission short-circuit is unit-covered.

### WR-09: The MIDI-04 masthead test passes vacuously

**Files modified:** `tests/masthead.e2e.test.ts`, `tests/mastheadMidiDetection.test.ts` (new)
**Commit:** `63d1e8a`
**Applied fix:** the positive control now exists: with `Navigator.prototype.requestMIDIAccess` present, the masthead **must** render the chip, and at `data-midi-state="idle"` specifically (detection alone must never request access). Both files carry a comment pointing at the other, so the pair cannot be read as two independent tests.

**Adapted from the review's guidance:** the control lives in a new sibling file rather than in the same file. The review's suggested `vi.resetModules()` + dynamic re-import was implemented first and **failed**: the re-imported layout binds to a second `svelte` instance, and mounting it with the original instance's `render` throws `Svelte error: effect_orphan` at `+layout.svelte:140`. Re-importing `@testing-library/svelte` through the reset graph fixed that error but leaked its containers past the original `cleanup()`, breaking seven unrelated tests in the file. Vitest already isolates per file, so one file per case is the mechanism that actually delivers the two virgin module graphs `initMidi()`'s once-per-load design requires. Both failed attempts are recorded in the file comments so nobody re-tries them.

### WR-10: The new masthead chip has no contrast or geometry assertion

**Files modified:** `tests/e2e/contrast.spec.ts`, `tests/e2e/tap-targets.spec.ts`
**Commit:** `d9b525a`
**Applied fix:** two contrast tests (the `idle` state, and whatever terminal state a real connect attempt reaches) measuring computed colours through the existing `measureContrast` helper at `PHONE`, mirroring the streak-chip test. Three tap-target tests at `PHONE_NARROW`: the chip clears 44x44 before a connect, still clears 44x44 after one resolves (its `min-height` only covers height; width is content-driven), and the masthead gains no horizontal overflow. All five pass.

The comment records what these cannot cover: `connected` needs a real instrument, so the `<span>` variant's colours are only measured if the environment happens to reach that state. Both variants carry the same `.midi-status` colour rules, so the exposure that remains is a `--color-muted` change, which these assertions would still catch.

## Skipped Issues

None. All 11 in-scope findings were fixed.

The 7 Info findings (IN-01 through IN-07) were out of scope under `fix_scope: critical_warning` and were not attempted, with one incidental exception: **IN-07** (duplicated listener bodies in `watchPorts`) was resolved as part of WR-01's fix, because the review's own fix for WR-01 is the shared `forward(type)` factory and the duplication is precisely what would let the new guard be added to one branch and forgotten on the other.

---

_Fixed: 2026-08-04T23:58:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
