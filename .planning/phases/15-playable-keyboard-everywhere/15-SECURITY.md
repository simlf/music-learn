---
phase: 15
slug: playable-keyboard-everywhere
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-16
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 15 is a pure client-side UI feature (a shared docked on-screen keyboard). It introduces no network calls, no auth, no server surface, no new dependencies, and renders no user-supplied strings as HTML. The threat surface is limited to local browser state and DOM layout. All threats were authored in the plan files at plan time and are mitigated or accepted below. ASVS L1 grep-depth audit; no open threat at or above the `high` block threshold (highest severity is `medium`, mitigated and independently verified).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| localStorage → app | `music-learn:docked-keyboard-collapsed` read at dock mount; may be hand-edited/corrupted/oversized. | Boolean-ish string (collapse state), non-sensitive |
| unmounting page → shared dock | A page tearing down must not blank a keyboard a newer page already handed the dock (single-slot registry). | In-memory dock config (snippet + token) |
| exploration vs answering | The one docked keyboard must not present a second input surface that corrupts the active drill/recall answer (KBD-03). | Local answer/selection state, non-sensitive |
| fixed dock → page content | A viewport-pinned element could obscure content or trap focus. | Layout only |
| key tap → audio engine | Taps route through PianoKeyboard's existing `soundEnabled()`-gated `playNote`. | Web Audio output |
| embedded vs standalone BuildSession | Docking applies only to the Recall-embedded case, never standalone `/build` (Scope Decision 4). | Component prop (`embedFact`) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-15-01 | Tampering | dockCollapse localStorage read | low | mitigate | Strict `getItem() === 'true'` inside try/catch; any malformed/unreadable value returns the expanded default. No `JSON.parse`, so an oversized value cannot blow the stack. Confirmed `dockCollapse.ts:21-23`. | closed |
| T-15-02 | Denial of Service | KeyboardDock fixed positioning | low | mitigate | Handle is a real focusable `<button>`; `--dock-height` custom property drives live content-clearance padding in `+layout.svelte`; `env(safe-area-inset-bottom)` keeps the handle above the iOS home indicator. Confirmed `KeyboardDock.svelte:78-96,125`. | closed |
| T-15-03 | Denial of Service | dockContext registration/clear (all pages) | low | mitigate | Token last-writer-wins: `register` always wins; `clear(token)` only nulls `current` when the token matches the current config, so a late unmount cannot strip a newer page's keyboard. Backed by `$state.raw` identity. Confirmed `dockContext.svelte.ts:44,55,64` and traced in code review. | closed |
| T-15-04 | Tampering | Answer integrity across Drills / Recall Mode A / Mode C (KBD-03) | medium | mitigate | One mode-aware docked keyboard; interactive/inspectable/constructable are mutually exclusive states of the single element, so free exploration can never write into the graded answer set (toggle no-ops once answered). Independently verified by the phase verifier (KBD-03, 3/3 must-haves) and code review. | closed |
| T-15-05 | Spoofing / Consistency | Sound honoring | low | accept | No new sound toggle added (Scope Decision 5); taps reuse PianoKeyboard's existing `soundEnabled()`-gated `playNote`, so no new audio-authorization surface exists. See Accepted Risks Log. | closed |
| T-15-06 | Information Disclosure | Relocated Scales key-strip clipping | low | mitigate | The strip's `.scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch }` relocates intact; the dock surface does not force `overflow: hidden`, so no keys become unreachable. Confirmed `ScaleKeyboardDrill.svelte:358-360`. | closed |
| T-15-07 | Elevation of scope | Standalone `/build` unchanged | low | mitigate | Docking gated on `embedFact` presence; standalone `/build` (`embedFact` undefined) never registers with the dock, keeping Scope Decision 4 intact. Confirmed `BuildSession.svelte:58-62,451`. | closed |
| T-15-SC | Supply chain | npm dependencies | low | n/a | No package installs this phase — `package.json` unchanged across all 7 plans. No new third-party code introduced. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-15-01 | T-15-05 | No new sound-authorization surface was added; docked-keyboard taps reuse the pre-existing `soundEnabled()` gate from PianoKeyboard/audio.ts. Behavior is identical to the shipped per-page keyboards (Scope Decision 5). | Simon | 2026-07-16 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-16 | 8 | 8 | 0 | /gsd-secure-phase (ASVS L1, short-circuit: register authored at plan time, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-16
