---
phase: 38
slug: midi-connection-progressive-enhancement
status: as-built
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-04
reconciled: 2026-08-25
---

# Phase 38 — Validation Strategy

> **Retroactive as-built record, not a pre-execution contract.** This file was
> created 2026-08-04 as an unfilled template (every cell a `{placeholder}`,
> `status: draft`, `nyquist_compliant: false`, `wave_0_complete: false`) and was
> never filled before the phase executed. Phase 38 then shipped in PR #72
> (commit `1aa62a1`) with full automated coverage. The stub's frontmatter had
> become actively false: it asserted that no test framework was detected and
> that Wave 0 was outstanding, for a phase whose four planned waves were all
> complete and whose tests were green.
>
> The validation strategy actually used during execution lives in
> [38-RESEARCH.md](38-RESEARCH.md) under "Validation Architecture". This file
> now records what was really built and run, so a future session reads the
> shipped truth instead of an empty template.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (unit + component, jsdom) and Playwright ^1.62.0 (e2e, real Chromium against the production build) |
| **Config file** | `vite.config.ts` (Vitest, `environment: 'jsdom'`, setup `vitest-setup.ts`) and `playwright.config.ts` (Chromium project) |
| **Quick run command** | `npx vitest run src/lib/midi src/lib/components/midiStatus.test.ts` |
| **Full suite command** | `npm test` (Vitest) and `npm run test:e2e` (Playwright, needs `npm run build` first) |
| **Estimated runtime** | ~1.5s for the MIDI slice (116 tests); full Vitest suite is the milestone gate |

---

## Sampling Rate

As executed across the phase's four waves:

- **After every task commit:** `npx vitest run src/lib/midi` (targeted, sub-second)
- **After every plan wave:** `npm test` (full Vitest suite; REG-02 requires the existing suite stay green)
- **Before `/gsd-verify-work`:** full Vitest suite, `npm run test:e2e`, and `npm run check` (svelte-check) all green
- **Max feedback latency:** under 5 seconds for the targeted slice

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01 | 01 | 1 | MIDI-01, MIDI-04 | T-38-01, T-38-02, T-38-03, T-38-04 | `enableMidi()` always passes `{ sysex: false }` explicitly and returns only the flat `MidiInputInfo` DTO, never a raw port object; the feature-detection guard returns before any package load, so no prompt is reachable on an unsupported environment; `watchPorts()` removes its previous handler pair before every registration so hot-plug handlers cannot accumulate | unit | `npx vitest run src/lib/midi/webmidi.test.ts` | ✅ | ✅ green (35 tests) |
| 38-02 | 02 | 2 | MIDI-01, MIDI-04 | T-38-05, T-38-06, T-38-07 | `initMidi()` is feature-detect-only and unit-asserted never to call `enableMidi()`, so no startup path can trigger a prompt; `connectMidi()`'s three guards (already-enabling early return, `intent` counter, single `watching` subscription) block duplicate prompts and stale state writes; `nextMidiState()`'s unsupported guard returns the identical current-state reference, making MIDI-04 a state-machine guarantee rather than a view-layer convention | unit | `npx vitest run src/lib/midi/midi.test.ts` | ✅ | ✅ green (40 tests) |
| 38-03 | 03 | 3 | MIDI-01, MIDI-04 | T-38-09 | Device name reaches the DOM only through Svelte's default auto-escaping interpolation; no raw-HTML directive exists in the file (grep-asserted at 0) and a component test renders a script-tag-shaped device name and asserts no `script` element materialises; component renders nothing at all on `unsupported` | component | `npx vitest run src/lib/components/midiStatus.test.ts` | ✅ | ✅ green (41 tests) |
| 38-04 | 04 | 4 | MIDI-01, MIDI-04 | T-38-01 (real-browser sysex check) | The connect path never requests system-exclusive access, asserted in a real browser | e2e | `npm run test:e2e -- midi.spec.ts` | ✅ | ✅ green (4 specs) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

T-38-08 (a rogue virtual MIDI port claiming to be the instrument) is **accepted**,
not mitigated, so it carries no test: single-user app, the OS MIDI subsystem is the
trust root, and the reported name is display-only data that never acts as a
correctness or authorization signal. Accepted at ASVS L1. Full threat tables live in
[38-01-PLAN.md](38-01-PLAN.md), [38-02-PLAN.md](38-02-PLAN.md) and
[38-03-PLAN.md](38-03-PLAN.md).

---

## Wave 0 Requirements

All shipped in PR #72; nothing outstanding.

- [x] `src/lib/midi/webmidi.ts` + `src/lib/midi/webmidi.test.ts` — feature detection and the `webmidi` event-wiring boundary
- [x] `src/lib/midi/midi.svelte.ts` + `src/lib/midi/midi.test.ts` — reactive connection-state module
- [x] `src/lib/components/MidiStatus.svelte` + `src/lib/components/midiStatus.test.ts` — masthead chip, self-hides on `unsupported`
- [x] `tests/e2e/midi.spec.ts` — Playwright specs in real Chromium
- [x] `npm install webmidi@3.1.16` — exact pin, present in `package.json`

---

## Manual-Only Verifications

The one genuine gap, and it is a hardware gap rather than a coverage gap.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connect with the instrument attached, showing the real device-name string | MIDI-01 (SC1) | jsdom has no Web MIDI implementation at all, and Playwright's Chromium implements Web MIDI but has no physical instrument attached, so `WebMidi.inputs` is always empty in every automated environment this repo has. No test anywhere can produce a real device name. | [38-UAT.md](38-UAT.md) Check 1 |
| Unplug mid-session, then re-plug at least twice, with no reload | MIDI-01 (SC1, SC2) | Same hardware-only limitation. The reducer's two-way transition is unit-proven against synthetic port events, but real plug/unplug timing over a real USB link cannot be produced by jsdom or by an instrument-less Chromium. | [38-UAT.md](38-UAT.md) Checks 2 and 3 |
| On-screen keyboard untouched, plus the iOS no-chip check | MIDI-04 | The no-Web-MIDI half is automated (38-04 Task 1, `tests/e2e/midi.spec.ts`). The on-device iOS half needs a real iOS browser. | [38-UAT.md](38-UAT.md) Check 4 |
| Multi-port selection: the connected port is the piano's keys port, not a second port on the same instrument | MIDI-01 (CR-01) | CR-01's fix is unit-proven against synthetic two-port scenarios; the "first port wins" policy is documented as a judgment call about real hardware in [38-REVIEW-FIX.md](38-REVIEW-FIX.md). | Confirm during the same hardware session as Check 1 |

**Status:** deferred, not failed. The developer does not own a USB MIDI keyboard yet
and explicitly chose to defer rather than mark these passed. Carried in STATE.md's
Deferred Verification table and in [38-VERIFICATION.md](38-VERIFICATION.md)
(`status: human_needed`, 2 behavior-unverified truths). Run the batch on-device
when the instrument is available.

---

## Validation Sign-Off

- [x] All tasks have automated verify or a recorded manual-only disposition
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency under 5s for the targeted slice
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactive as-built record, reconciled 2026-08-25. This is not a
pre-execution approval; no validation contract was approved for this phase before
it ran. The sign-off above attests to what shipped and is green, not to a gate
that was held at the time.
