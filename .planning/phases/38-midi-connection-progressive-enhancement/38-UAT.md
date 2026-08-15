---
status: partial
phase: 38-midi-connection-progressive-enhancement
source: [38-04-PLAN.md]
started: 2026-08-04T00:00:00Z
updated: 2026-08-04T00:00:00Z
note: "Deferred hardware-in-the-loop UAT. Task 1's Playwright spec (tests/e2e/midi.spec.ts) proved everything a real browser can prove without an instrument: the connect click always terminates, a browser without Web MIDI shows no MIDI chrome while the existing on-screen-keyboard lookup flow still works, and navigating away mid-connect raises no page error. These 4 checks are hardware-only because jsdom has no Web MIDI implementation at all, and Playwright's Chromium has a Web MIDI implementation but no physical instrument attached, so WebMidi.inputs is always empty there. The developer does not have the physical USB piano available right now and explicitly chose to defer rather than have these checks marked passed. Run this batch on-device when the piano is available."
---

## Current Test

[deferred — physical USB piano not available]

## Tests

### 1. Connect with the instrument already attached (MIDI-01, success criterion 1)
expected: |
  1. Plug the piano in and power it on.
  2. Load the app. The masthead should show a chip reading `CONNECT MIDI`.
  3. Tap it. Expect either an immediate result or a brief `MIDI: CONNECTING` while the browser's permission prompt appears. Grant the permission if prompted.
  4. Expect the chip to settle on `MIDI:` followed by a device name. Record the exact string it shows. A generic name such as `USB MIDI Device` or `USB2.0-MIDI` is EXPECTED behavior for many interfaces, not a bug: the string comes from the instrument's own USB descriptor. Only an empty or unreadable chip is a defect, and the fallback for an empty name is `MIDI: MIDI DEVICE`.
  5. Confirm the chip fits the masthead without pushing the nav links off-screen or wrapping the row awkwardly, at both laptop width and a narrow window.
result: [pending]

### 2. Unplug mid-session (MIDI-01, success criteria 1 and 2)
expected: |
  1. With the chip showing the device name, unplug the USB cable WITHOUT reloading the page.
  2. Expect the chip to change to `MIDI: DISCONNECTED` on its own, within a second or two.
  3. Confirm no reload, navigation, or tap was needed to make that happen.
result: [pending]

### 3. Re-plug mid-session (success criterion 2)
expected: |
  1. Still without reloading, plug the cable back in.
  2. Expect the chip to return to `MIDI:` plus the device name on its own, with no second tap and no reload.
  3. Repeat the unplug and re-plug cycle once more to confirm it is not a one-shot.
result: [pending]

### 4. On-screen keyboard untouched (MIDI-04, success criterion 3)
expected: |
  1. With the piano connected, open a practice drill that uses the on-screen keyboard and answer it by tapping the on-screen keys exactly as before.
  2. Confirm it behaves identically to before this phase: same grading, same feedback, no new prompt, no new blocking step. MIDI is additive chrome; it must gate nothing.
  3. If an iPhone or iPad is available, open the app there and confirm there is NO MIDI chip anywhere in the masthead and the app is otherwise unchanged. This is the only real-device proof of the Safari and iOS path.
result: [pending]

### 5. Multi-port port selection (CR-01, code review)
expected: |
  1. Run this during the same live session as Check 1, not separately.
  2. If the piano exposes more than one MIDI input port (many digital pianos announce a second port for DAW control or MIDI-THRU), confirm the chip's device name corresponds to the port you actually play the keys on, not a secondary port.
  3. Play a few notes and confirm nothing about the chip changes or resets. Phase 39 will read the same port via `connectedDeviceId()` / `activeInput()`, so picking the wrong port here would surface as a silent grading failure there.
  4. If the piano exposes only one input port, record that fact and mark this check not applicable rather than passed.
  Background: the code review found the state reducer was device-identity-blind (CR-01), so any second port could hijack or clear the connected device. Fixed in commit `6aba1e3` with a `first port wins` policy, unit-proven only against synthetic port ids (`in-1` / `in-2`). The policy choice itself is a judgment call about real hardware and this is the only way to confirm it.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

No code defects found or suspected. These 4 checks have no automated substitute for two independent reasons: jsdom has no Web MIDI implementation at all (Vitest runs there), and Playwright's Chromium has a Web MIDI implementation but no physical instrument attached, so `WebMidi.inputs` is always empty there. Automation (`tests/e2e/midi.spec.ts`, committed in `dac416a`) proves the connect-terminates guarantee, the no-Web-MIDI-chrome path, and the navigate-away-is-clean path in real Chromium; it deliberately proves nothing about a real device name, real plug/unplug, or real hot-plug timing.

## Follow-up

- Resume with `/gsd-verify-work 38 (see 38-UAT.md)` once the physical USB piano is available. Run all 5 checks in one sitting since Checks 2, 3, and 5 depend on Check 1's live session.
- Do not infer any of these 5 outcomes from the automated suite, from a code reading, or from Phase 39/40's later hardware sessions. Record the actual device-name string and actual timing observed.
- Check 5 was added by the phase verifier after the code review's CR-01 fix. It is the only open residual of that fix.
