---
phase: 38-midi-connection-progressive-enhancement
verified: 2026-08-05T00:10:00Z
status: human_needed
score: 1/3 truths verified (2 present, behavior-unverified — hardware-only)
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "SC1 — plugging in the USB piano shows a live 'connected' state naming the real detected device, and unplugging shows 'disconnected', driven by webmidi's own port events with no polling."
    test: "Plug the physical USB piano in, tap the masthead chip, grant the permission if prompted, read the settled chip text; then unplug without reloading."
    expected: "Chip settles on `MIDI:` followed by the instrument's real USB-descriptor name (or the `MIDI: MIDI DEVICE` fallback if the descriptor is empty); unplugging changes the chip to `MIDI: DISCONNECTED` within a second or two with no reload, no navigation, no tap."
    why_human: "jsdom has no Web MIDI implementation at all, and Playwright's Chromium implements Web MIDI but has no physical instrument attached, so WebMidi.inputs is always empty in every automated environment available to this repo. No test anywhere can produce a real device name or a real unplug transition."
  - truth: "SC2 — hot-plugging the piano mid-session (connect or disconnect, in either order, more than once) updates the connection state live with no page reload."
    test: "With the chip already showing the device name, unplug then re-plug the physical cable at least twice in a row, without reloading."
    expected: "Each unplug settles on `MIDI: DISCONNECTED` and each re-plug returns to `MIDI:` plus the device name, on its own, with no second tap and no reload, repeatably."
    why_human: "Same hardware-only limitation as SC1: the reducer's two-way transition (connected -> disconnected -> connected) is unit-proven against synthetic port events, but real plug/unplug timing and reliability over a real USB link cannot be produced by jsdom or by Playwright's instrument-less Chromium."
human_verification:
  - test: "Hardware-in-the-loop UAT, Checks 1-4 in 38-UAT.md (connect with instrument attached including the exact device-name string, unplug mid-session, re-plug mid-session at least twice, on-screen-keyboard/iOS-no-chip regression check)."
    expected: "All four checks pass as described in 38-UAT.md's how-to-verify block, with Check 1's exact device-name string recorded verbatim."
    why_human: "Already an explicit, recorded deferral (developer typed 'defer' — physical USB piano not available at plan close). Carried forward here, not re-litigated as a new gap."
  - test: "When Check 1 is run, additionally confirm the connected device is the piano's own keys port and not a second port on the same instrument (e.g. a DAW/MIDI-THRU output re-announcing as an input), if the piano exposes more than one input port."
    expected: "connectedDeviceId() / the chip's device name correspond to the port the user is actually playing on, confirming the code review's 'first port wins' policy choice (CR-01, fixed in commit 6aba1e3) picks the right port on real multi-port hardware."
    why_human: "CR-01's fix is unit-proven against synthetic two-port scenarios (in-1/in-2) and the policy is explicitly documented as a judgment call in REVIEW-FIX.md ('this is a state-machine/logic change... the policy choice itself is a judgement call about real hardware'). No automated environment has a physical instrument, so this can only be confirmed during the same hardware session as Check 1."
---

# Phase 38: MIDI Connection & Progressive Enhancement Verification Report

**Phase Goal:** On a Web-MIDI-capable browser, the user can connect the USB digital piano and see its live connection state; on any other browser the app is unchanged with no MIDI chrome.
**Verified:** 2026-08-05T00:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | On a Chrome-family browser, plugging in the USB piano shows a live "connected" state naming the detected device, and unplugging shows "disconnected", driven by `webmidi`'s device events with no polling. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **Mechanism VERIFIED in code+tests:** `src/lib/midi/webmidi.ts` wires `WebMidi.enable()`/`inputs`/`connected`/`disconnected` listeners exclusively (no `setInterval`/`setTimeout`/`requestAnimationFrame`: `grep` returns 0 matches in both `webmidi.ts` and `midi.svelte.ts`); `stateFromEnable()` and `nextMidiState()` in `midi.svelte.ts` map enable results and port events onto the 8-variant `MidiConnectionState` union with `connected`/`disconnected`/`no-device`/`unsupported` all distinct, unit-proven in `midi.test.ts` (116 tests pass across `src/lib/midi` + `midiStatus.test.ts`, spot-checked directly). **Real device name and real connect are hardware-only** — Playwright's Chromium has a Web MIDI implementation but no physical instrument, so `WebMidi.inputs` is always empty there (stated explicitly in `tests/e2e/midi.spec.ts`'s own header comment); jsdom has no Web MIDI implementation at all. This half is deferred to hardware UAT (`38-UAT.md`, `human_needed`, explicitly not silently passed). |
| 2 | Hot-plugging mid-session (connect or disconnect) updates the connection state without a page reload. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **Mechanism VERIFIED:** `connectMidi()` subscribes to `watchPorts()` exactly once per app session (module-scope `watching` guard) and the subscription survives a disconnect, so a re-plug needs no new user tap — unit-proven in `midi.test.ts` by driving the captured handler through `disconnected` then `connected` and asserting the state returns to `connected`. Post-review, the reducer also correctly ignores a second port's events while one device is selected (CR-01 fix, `midi.svelte.ts:91-110`, regression-tested with two distinct synthetic port ids). **Real plug/unplug timing over a real USB link is hardware-only** for the same two reasons as row 1; deferred to the same `38-UAT.md` checks (2 and 3). |
| 3 | On a browser without Web MIDI (Safari/iOS), the app shows no MIDI chrome and every existing on-screen-keyboard flow works exactly as before, feature-detected, with the non-MIDI path never degraded. | ✓ VERIFIED | Fully provable without hardware, and fully proven: `MidiStatus.svelte` wraps its entire body in `{#if state.kind !== 'unsupported'}`, contributing zero DOM elements when unsupported (`midiStatus.test.ts`: `queryByTestId('midi-status')` is `null`, `querySelectorAll('*').length === 0`). `tests/masthead.e2e.test.ts` asserts the same in the real root layout under jsdom (no `navigator.requestMIDIAccess`), **and** a positive control now exists in the sibling file `tests/mastheadMidiDetection.test.ts` (added in the review-fix pass, WR-09) proving the chip *does* render at `idle` when `requestMIDIAccess` is present — so the self-hide assertion is a real discriminator, not a vacuous pass against an untested default. In real Chromium, `tests/e2e/midi.spec.ts`'s second test removes `requestMIDIAccess` from `Navigator.prototype` via an init script, asserts zero `midi-status` elements, and in the same test drives the existing on-screen-keyboard chord-lookup flow (`starter-chord` click → visible `chord-result`) to prove the non-MIDI path is not degraded. `npm run build`'s prerendered `build/` output contains zero occurrences of `midi-status` across all 12 HTML files (independently confirmed). |

**Score:** 1/3 truths verified (2 present + wired + unit/e2e-proven at the mechanism level, with only the hardware-observable half of each deferred as `human_needed`)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `package.json` / `package-lock.json` | `webmidi` 3.1.16 exact-pinned runtime dependency | ✓ VERIFIED | `node -e "console.log(require('./package.json').dependencies.webmidi)"` → `3.1.16`, under `dependencies`, no caret/tilde. |
| `src/lib/midi/webmidi.ts` | Sole boundary onto the `webmidi` package: feature detection, guard-first `enableMidi`, error mapping, non-accumulating `watchPorts`, `activeInput` Phase 39 seam | ✓ VERIFIED | Read in full. `grep -rln "from 'webmidi'" src/` lists only this file (the test file mocks the package rather than statically importing it, an intentional deviation noted and accepted in 38-01-SUMMARY.md). No `navigator`/`window`/package reference at module scope; package reached via memoised `import('webmidi')`. |
| `src/lib/midi/midi.svelte.ts` | 8-variant `MidiConnectionState`, `nextMidiState`/`stateFromEnable` reducers, reactive `midiState`/`setMidiState`, `connectedDeviceId`, feature-detect-only `initMidi`, gesture-gated `connectMidi` | ✓ VERIFIED | Read in full. Reducer correctly guards `unsupported` (returns identical reference), output ports, and (post-CR-01-fix) device identity across multi-port events. `initMidi()` never calls `enableMidi`; only `connectMidi()` does, gated on a user gesture (wired only from `MidiStatus.svelte`'s click handler). |
| `src/lib/components/MidiStatus.svelte` | Self-hiding masthead chip, connect affordance, escaped/clamped device-name display | ✓ VERIFIED | Read in full. `{@html}` count is 0. Device name interpolated via Svelte auto-escaping and a `replace(...,  () => name)` replacer function (WR-03 fix — a plain string replacement would have let `$&`/`` $` ``/`$'` in a USB descriptor rewrite the surrounding copy). 24-char clamp present. Accessible name / live region / focus-preservation fixes from WR-05/WR-06 present and match the REVIEW-FIX narrative. |
| `src/lib/i18n/messages/chrome.ts` | `midi.status.*` (8 keys) + `midi.aria.*` (2 keys) + `midi.status.deniedHelp`, en/fr, no em dash | ✓ VERIFIED | `grep -n -E '[—–]'` on the file returns nothing; `midi.aria.connect`/`midi.aria.retry`/`midi.status.deniedHelp` present in both locale blocks. |
| `src/routes/+layout.svelte` | `<MidiStatus />` mounted in the masthead's left flex row, `initMidi()` called once in `onMount`, importing only `initMidi` from the midi module | ✓ VERIFIED | `grep` confirms exactly one import from `$lib/midi/midi.svelte` (`initMidi` only), exactly one `initMidi();` call inside `onMount`, and exactly one `<MidiStatus />` mount point, none wrapped in a `hidden` container. |
| `tests/e2e/midi.spec.ts` | Three deterministic Chromium tests: terminal-state connect, no-Web-MIDI-chrome + existing lookup flow, navigate-away-is-clean | ✓ VERIFIED | Read in full. Test 2 removes `requestMIDIAccess` from `Navigator.prototype` and exercises the existing chord-lookup flow in the same test. `test.use({ permissions: ['midi'] })` only (sysex removed per WR-08 fix), with a dedicated real-browser sysex-never-requested regression spec added. |
| `.planning/phases/38-midi-connection-progressive-enhancement/38-UAT.md` | Records the four hardware-only checks as an explicit `human_needed`/`pending` deferral | ✓ VERIFIED (as a deferral record, not as passing evidence) | All 4 checks recorded `pending`, reasoning matches the two independent automation gaps (no jsdom Web MIDI, no Chromium instrument), matching Phase 34/35's established `human_needed` pattern in `STATE.md`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `MidiStatus.svelte` | `midi.svelte.ts` | `midiState()` read via `$derived`, `connectMidi()` called only from `handleClick` | ✓ WIRED | Confirmed by source read; no other call site for `connectMidi`. |
| `+layout.svelte` | `midi.svelte.ts` | `initMidi()` called once in `onMount`, after `registerUpdateWatcher()` | ✓ WIRED | Confirmed by grep + source read; the layout imports no other symbol from the module. |
| `midi.svelte.ts` | `webmidi.ts` | `enableMidi()`, `watchPorts()`, `midiUnsupportedReason()`, `prewarmMidi()` | ✓ WIRED | `grep -rln "enableMidi\|watchPorts" src/ | grep -v "src/lib/midi/"` returns nothing — only the midi modules touch the boundary, matching plan 38-02's key-link contract. |
| `webmidi.ts` | `webmidi` npm package | Memoised `import('webmidi')` inside `loadWebMidi()` | ✓ WIRED | Confirmed emitted as its own chunk with no `modulepreload` (per 38-REVIEW.md's independent build inspection, re-confirmed by this verification's `npm run build` + `grep` pass). |
| `connectedDeviceId()` (midi.svelte.ts) + `activeInput()` (webmidi.ts) | Phase 39 (not yet built) | Documented seam, no consumer yet | ✓ WIRED (seam only) | Both functions exist, are exported, and are explicitly documented as the Phase 39 note-stream seam in both files' header comments. Correctly out of scope for Phase 38 itself. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Unit suite for the MIDI subsystem passes | `npx vitest run src/lib/midi src/lib/components/midiStatus.test.ts` | 3 files / 116 tests passed | ✓ PASS |
| No new type/svelte-check errors | `npm run check` | 1482 files, 0 errors, 0 warnings | ✓ PASS |
| No polling anywhere in the MIDI layer | `grep -n -E 'setInterval|setTimeout|requestAnimationFrame' src/lib/midi/webmidi.ts src/lib/midi/midi.svelte.ts \| grep -vE ':[[:space:]]*(\*\|//)'` | 0 matches | ✓ PASS |
| No raw-HTML injection of device name | `grep -c '{@html' src/lib/components/MidiStatus.svelte` | 0 | ✓ PASS |
| No em dash in new copy | `grep -n -E '[—–]' src/lib/i18n/messages/chrome.ts` | 0 matches | ✓ PASS |
| Layout imports only `initMidi`, never the gesture-gated connect | `grep -n "midi.svelte" src/routes/+layout.svelte` | Exactly one import line, `initMidi` only | ✓ PASS |
| `webmidi` exact pin | `node -e "console.log(require('./package.json').dependencies.webmidi)"` | `3.1.16` | ✓ PASS |
| Sole `webmidi` package importer | `grep -rln "from 'webmidi'" src/` | `src/lib/midi/webmidi.ts` only | ✓ PASS |
| No sysex requested, real browser | `grep -n "sysex" tests/e2e/midi.spec.ts` | Dedicated regression spec asserts `options?.sysex` is never `true`, `test.use` grants `'midi'` only | ✓ PASS |
| No debt markers in phase-modified files | `grep -rn -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across `src/lib/midi/`, `MidiStatus.svelte`, `+layout.svelte`, `midi.spec.ts`, `mastheadMidiDetection.test.ts` | No matches | ✓ PASS |

Full-suite claims (`npm test`: 152 files / 2652 tests; `npm run build`: adapter-static strict prerender succeeds; `grep -rl midi-status build --include=*.html`: 0 of 12 files) were independently established by the orchestrator prior to this verification pass and are treated as established fact per this run's known-state brief; this verification additionally re-ran `npm run check` and the MIDI-scoped Vitest subset directly and got matching green results.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this repo and none is declared in the phase's PLAN/SUMMARY files. Step 7c: SKIPPED (no probes declared or discovered).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| MIDI-01 | 38-01, 38-02, 38-04 | Connect the USB piano, see connected/disconnected/unsupported state, via device events, no polling | ? NEEDS HUMAN (intentionally, per known project state) | Code-level mechanism fully built and unit/e2e-proven (see Truths 1-2 above); hardware-observable half explicitly deferred in `38-UAT.md`. `REQUIREMENTS.md` correctly leaves this unchecked with an inline note pointing at `38-UAT.md` — this is accurate self-reporting, not a traceability gap. |
| MIDI-04 | 38-01, 38-02, 38-03, 38-04 | No MIDI chrome on unsupported browsers, on-screen keyboard unchanged | ✓ SATISFIED at the code/automated level; left unchecked in `REQUIREMENTS.md` pending the same hardware sign-off batch (per its own inline note, since it shares the Phase 38 traceability row with MIDI-01) | Fully proven by automated evidence with no hardware dependency (Truth 3 above is ✓ VERIFIED outright). The unchecked box in `REQUIREMENTS.md` is a project-level batching choice (both requirements close together once the hardware UAT completes), not a gap in this requirement's own evidence. |

No orphaned requirements: `REQUIREMENTS.md`'s traceability table maps only MIDI-01 and MIDI-04 to Phase 38, and both appear in the `requirements:` frontmatter of all four plans.

### Anti-Patterns Found

None in the current state of the phase's files. The code-review pass (`38-REVIEW.md`) found 1 critical + 10 warnings + 7 info findings across the same files this verification re-read; `38-REVIEW-FIX.md` records all 11 in-scope (critical + warning) findings fixed across 11 commits, and this verification independently re-read the fixed source (`webmidi.ts`, `midi.svelte.ts`, `MidiStatus.svelte`) and confirmed each fix's substance matches the REVIEW-FIX narrative rather than trusting the narrative alone:

- CR-01 (device-identity-blind reducer) — confirmed fixed in `midi.svelte.ts:91-110`, with the "first port wins" policy stated identically in both `stateFromEnable` and `nextMidiState`'s doc comments.
- WR-01 (unguarded `event.port` dereference) — confirmed fixed via the `forward()` factory in `webmidi.ts:207-212`, which drops any event with no resolvable `port`/`port.id`/recognized `type` instead of throwing.
- WR-02 (stale disposer clobbering a newer registration) — confirmed fixed: the disposer in `webmidi.ts:222-234` only clears a module ref if it still matches the value it registered.
- WR-03 (device name as a `replace` pattern) — confirmed fixed: `MidiStatus.svelte:86` uses a replacer function, not a string.
- WR-04 through WR-10 — spot-checked against source for WR-04 (`prewarmMidi`/memoised `loadWebMidi` present), WR-05 (aria-live region, `aria-busy`/`aria-disabled` present), WR-06 (`midiPermissionState()` pre-check present), WR-07 (comment corrected to state the SW-precache caveat honestly), WR-09 (`tests/mastheadMidiDetection.test.ts` exists as the positive control) — all present as described.

One residual, correctly disclosed rather than hidden: CR-01's "first port wins" policy is a judgment call the fix's own commit message flags as needing hardware confirmation on a real multi-port instrument — carried into this report's human-verification list below rather than treated as a code defect.

### Human Verification Required

The four items below are the phase's own explicit, previously-recorded deferral (developer chose `defer`, not `approved`; not a new finding from this verification pass) plus one narrower addition surfaced by the code-review fix:

1. **Hardware UAT Checks 1-4** (`38-UAT.md`) — connect with the instrument attached (record the exact device-name string), unplug mid-session, re-plug mid-session (repeat once), and confirm the on-screen keyboard plus iOS no-chip path are unaffected.
   **Expected:** All four pass exactly as described in `38-UAT.md`'s `how-to-verify` block.
   **Why human:** jsdom has no Web MIDI implementation; Playwright's Chromium has the implementation but no physical instrument, so `WebMidi.inputs` is always empty in every automated environment this repo can run.

2. **Multi-port port-selection confirmation** — if the physical piano exposes more than one MIDI input port, confirm during the same Check-1 session that the chip's device name/`connectedDeviceId()` correspond to the port the user actually plays, not a secondary port.
   **Expected:** The connected port is the instrument's own keys port.
   **Why human:** CR-01's fix (device-identity-aware reducer, "first port wins") is unit-proven only against synthetic two-port scenarios; the code review itself flagged the policy choice as requiring hardware confirmation, and no automated environment has a physical multi-port instrument to test against.

### Gaps Summary

No blocking gaps. All three ROADMAP success criteria have their code-level mechanism built, wired, and automated-tested; two of the three (device-connect and hot-plug) have a hardware-observable half that cannot be proven in this repo's automated environments (jsdom has no Web MIDI; Playwright's Chromium has no physical instrument) and is correctly, explicitly carried as a `human_needed` deferral in `38-UAT.md` and `STATE.md`'s Deferred Verification table — exactly as Phases 34/35 already established the pattern. `REQUIREMENTS.md` leaving MIDI-01/MIDI-04 unchecked is accurate self-reporting of that same deferral, not a traceability gap. The one code-review-identified critical issue (CR-01) was fixed with regression tests and independently re-verified against source in this pass; its remaining open edge (real multi-port hardware confirmation) is folded into the existing hardware UAT rather than treated as a new gap.

---

_Verified: 2026-08-05T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
