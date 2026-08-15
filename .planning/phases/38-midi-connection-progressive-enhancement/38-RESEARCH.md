# Phase 38: MIDI Connection & Progressive Enhancement - Research

**Researched:** 2026-08-04
**Domain:** Web MIDI device connection lifecycle, browser feature detection, Svelte 5 reactive module state
**Confidence:** HIGH (webmidi API surface + Chrome permission model, verified against official docs/registry) / MEDIUM (indicator placement, first-call gesture requirement - no prior sketch exists for this surface)

## Summary

Phase 38 is a pure client-side, no-backend feature: wrap `navigator.requestMIDIAccess()` via the `webmidi` npm package (already pinned at 3.1.16 in this repo's CLAUDE.md) behind a browser-only reactive state module, following the exact idiom this codebase already uses three times (`locale.svelte.ts`, `swUpdate.svelte.ts`, `dueBadge.svelte.ts`): a plain function-based module with `$state` at module scope, all `navigator`/`window` access inside function bodies (never at module top level), guarded by SvelteKit's `browser` import so `adapter-static`'s prerender never touches it.

`webmidi` 3.1.16 is confirmed live on the npm registry (published 2026-03-31, ships its own TypeScript `.d.ts`, `OK` verdict from the package-legitimacy check, no postinstall script). Its `WebMidi.enable()` returns a promise and fires three port-lifecycle events that map directly onto the phase's three-state requirement (device detected / disconnected / unsupported): `connected`, `disconnected`, and the catch-all `portschanged` (added in webmidi 3.0.2). Device identity comes from `input.name` / `input.manufacturer` on each `WebMidi.Input` in `WebMidi.inputs`.

The one real risk this phase must design around is Chrome's 2024+ permission-prompt change (Chrome 124+): `requestMIDIAccess()` now gates behind a user-permission prompt for *all* MIDI access, not just sysex. This codebase already has the exact answer pattern for "browser API needing a user-triggered permission prompt with idle/requesting/granted/denied states" in `MicCheckPanel.svelte` + `micInput.ts` - Phase 38 should mirror that shape almost verbatim (explicit user-gesture "Connect" button, not auto-`enable()` on mount), because auto-calling `enable()` on every page load would either surface an unwanted prompt on a first-ever visit or (per Chromium's general permission-persistence behavior) silently succeed once already granted - the codebase's own precedent avoids ever auto-triggering a permission prompt without a click.

**Primary recommendation:** Build `$lib/midi/midi.svelte.ts` (state module, mirrors `swUpdate.svelte.ts`) + `$lib/midi/webmidi.ts` (the `webmidi`-import boundary, mirrors `micInput.ts`'s "importing constructs nothing" contract) + a small `MidiStatus.svelte` component in the masthead area (mirrors `StreakBadge`'s self-hiding-when-irrelevant convention: renders nothing at all on `unsupported`, satisfying MIDI-04's "no MIDI chrome" requirement by construction). Design the module's public shape now (`onNoteOn`/`onNoteOff` passthrough, or exposing the raw `Input` once connected) so Phase 39 can attach chord-grading listeners without touching this module's internals.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Web MIDI device enumeration & connect/disconnect events | Browser / Client | — | `navigator.requestMIDIAccess` / `webmidi` is a browser-only API; no server round-trip, no SSR value (adapter-static has no server at runtime anyway) |
| Feature detection (Web MIDI supported y/n) | Browser / Client | — | Must run in the browser after hydration; a prerendered page has no `navigator` |
| Connection state display (masthead indicator) | Browser / Client | — | Svelte component reading the reactive state module; no data layer involved |
| Progressive-enhancement gating (hide MIDI chrome entirely) | Browser / Client | — | Decided once at module init from `micUnavailableReason()`-style detection, consumed by the component's own self-hiding branch |
| Persisted "connect on next visit" preference (if any) | Browser / Client | Database/Storage (localStorage) | Optional discretion item; if built, follows the `music-learn:*` localStorage-key convention already used by `locale.svelte.ts` |

No API/Backend or CDN tier involvement in this phase - this is the first v2.4 phase and it is entirely client-side, matching the roadmap's framing ("largely independent surfaces plus a green gate," with SYNC being "the only feature this milestone that touches the backend").

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `webmidi` | 3.1.16 (exact pin, no caret - matches this repo's exact-pin convention for `dexie`/`tone`/`ts-fsrs`/`zod`) | Wraps `navigator.requestMIDIAccess()` with a friendly event model | `[VERIFIED: npm registry]` Confirmed live on npm (published 2026-03-31), ships its own `.d.ts` types (`./dist/esm/webmidi.esm.d.ts`), Apache-2.0, weekly downloads ~19k, source repo `github.com/djipco/webmidi`, no postinstall script. Package-legitimacy check verdict: **OK**. This exact version and rationale is already pinned in this repo's own `.claude/CLAUDE.md` stack doc, so no alternative library shopping is warranted - CONTEXT.md-equivalent lock already exists at the project level. |

No supporting libraries are needed for this phase - no audio, no persistence, no new UI kit. `tone`/`dexie`/`ts-fsrs` are untouched by Phase 38.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `webmidi` | Raw `navigator.requestMIDIAccess()` | Viable (this project's own CLAUDE.md flags it as "simple enough that hand-rolling is viable") but loses `webmidi`'s already-normalized `connected`/`disconnected`/`portschanged` events, `input.name`/`manufacturer` convenience, and (for Phase 39) held-note tracking helpers - re-deriving all of that is pure waste given `webmidi` is already the locked project decision. |

**Installation:**
```bash
npm install webmidi@3.1.16
```

**Version verification:** `npm view webmidi version` → `3.1.16`, `npm view webmidi time.modified` → `2026-03-31T13:41:05.984Z` (matches CLAUDE.md's pin exactly; not stale). `dist-tags`: `latest` is `3.1.16`, `next` is a `3.0.0-alpha.26` prerelease tag (irrelevant, older than the stable line - do not install `next`).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| `webmidi` | npm | latest release 2026-03-31 (package itself is long-established, `djipco/webmidi` predates 2015) | ~19,189/week | `github.com/djipco/webmidi` | **OK** | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

No `postinstall` script (`npm view webmidi scripts.postinstall` → empty). This is a well-known, long-lived, single-dependency package (zero runtime deps of its own); the version pin exactly matches what this project's own CLAUDE.md already vetted. No `checkpoint:human-verify` gate is warranted for this install.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Chrome-family)                                         │
│                                                                   │
│  USB piano plug/unplug                                           │
│        │                                                          │
│        ▼                                                          │
│  navigator.requestMIDIAccess()  ◄── wrapped by ──  webmidi.ts    │
│        │                              (WebMidi.enable/.inputs)   │
│        ▼                                                          │
│  WebMidi 'connected' / 'disconnected' / 'portschanged' events    │
│        │                                                          │
│        ▼                                                          │
│  midi.svelte.ts  (reactive module: $state<MidiState>)             │
│   - unsupported | idle | enabling | connected(name) |             │
│     no-device | denied | error                                    │
│        │                                                          │
│        ▼                                                          │
│  MidiStatus.svelte  (masthead indicator)                          │
│   - renders NOTHING when state === 'unsupported' (MIDI-04)        │
│   - renders name + dot when state === 'connected'                 │
│                                                                     │
│  (Phase 39 will attach noteon/noteoff listeners to the same        │
│   WebMidi.Input this module already tracks - no new connection    │
│   layer needed)                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Browser (Safari / iOS / any non-Web-MIDI browser)                │
│                                                                   │
│  navigator.requestMIDIAccess === undefined                        │
│        │                                                          │
│        ▼                                                          │
│  midi.svelte.ts detects 'unsupported' at module init               │
│        │                                                          │
│        ▼                                                          │
│  MidiStatus.svelte renders nothing; app byte-identical to today   │
└─────────────────────────────────────────────────────────────────┘
```

There is no server/API tier in this diagram - this is a fully client-side feature (per the Architectural Responsibility Map above).

### Recommended Project Structure

```
src/lib/
├── midi/
│   ├── webmidi.ts          # webmidi import boundary: enable/disable, event wiring,
│   │                        #   feature detection. Mirrors micInput.ts's contract:
│   │                        #   "importing this module touches no browser API."
│   ├── webmidi.test.ts     # pure-logic tests (state-transition reducer, feature detect)
│   ├── midi.svelte.ts      # reactive state module ($state), mirrors swUpdate.svelte.ts /
│   │                        #   dueBadge.svelte.ts. Public API: midiState(), connect(),
│   │                        #   disconnect(), and (for Phase 39) currentInput()/onNote().
│   └── midi.test.ts        # reactive-module tests (flushSync + $state getters, per
│                             #   swUpdate.test.ts's pattern)
└── components/
    └── MidiStatus.svelte    # masthead indicator; self-hides on 'unsupported'
```

This mirrors the existing `audio/` (pure `chromaDetector.ts` + browser-boundary `micInput.ts`) and `pwa/` (`swUpdate.svelte.ts`) directory shapes exactly - a new top-level `$lib/midi/` sibling to `$lib/audio/` and `$lib/pwa/`, not folded into either.

### Pattern 1: Browser-only module contract ("importing constructs nothing")

**What:** A module that wraps a browser-only API (mic, service worker, MIDI) must never touch `navigator`/`window` at module scope - every reference lives inside a function body, so merely importing the module is prerender/jsdom-safe.

**When to use:** Any new file that talks to a Web API not available during SSR/prerender (`adapter-static` prerenders every route at build time under Node, where `navigator` does not exist).

**Example (this codebase's own precedent, `micInput.ts`):**
```typescript
// Source: src/lib/audio/micInput.ts (lines 55-71, this codebase)
export function isMicAvailable(): boolean {
	return micUnavailableReason() === null;
}

export function micUnavailableReason(): MicUnavailableReason | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
	if (!window.isSecureContext) return 'insecure-context';
	if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
	// ...
	return null;
}
```

The MIDI equivalent should feature-detect with the identical shape:
```typescript
// Recommended shape for $lib/midi/webmidi.ts, mirroring micInput.ts exactly
export function midiUnsupportedReason(): 'no-window' | 'unsupported' | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'no-window';
	if (typeof navigator.requestMIDIAccess !== 'function') return 'unsupported';
	return null;
}
```

### Pattern 2: Svelte 5 reactive module state (`.svelte.ts`)

**What:** A plain `.ts` file's top-level `$state` is NOT reactive across module consumers in Svelte 5 unless the file has the `.svelte.ts` extension (compiler requirement). This codebase already has three instances of this exact pattern.

**When to use:** Any global, cross-component reactive flag/value that isn't owned by one component's local state (locale, SW-update-ready, due-count, and now MIDI connection state).

**Example (this codebase's own precedent, `swUpdate.svelte.ts`):**
```typescript
// Source: src/lib/pwa/swUpdate.svelte.ts (lines 36-46, this codebase)
let ready = $state(false);

export function updateAvailable(): boolean {
	return ready;
}

export function setUpdateAvailable(value: boolean): void {
	ready = value;
}
```

Recommended MIDI module shape, following this exactly:
```typescript
// Recommended shape for $lib/midi/midi.svelte.ts
export type MidiConnectionState =
	| { kind: 'unsupported' }
	| { kind: 'idle' }
	| { kind: 'enabling' }
	| { kind: 'connected'; deviceName: string }
	| { kind: 'no-device' }
	| { kind: 'denied' }
	| { kind: 'error' };

let state = $state<MidiConnectionState>({ kind: 'unsupported' });

export function midiState(): MidiConnectionState {
	return state;
}
```

### Pattern 3: Permission-gated browser feature behind an explicit user gesture

**What:** Never auto-trigger a browser permission prompt (mic, MIDI, notifications) from `onMount`/module init. Gate the actual `enable()`/`getUserMedia()` call behind a button click.

**When to use:** Any Web API whose first call can surface a native permission dialog.

**Example (this codebase's own precedent, `MicCheckPanel.svelte`):**
```typescript
// Source: src/lib/components/MicCheckPanel.svelte (lines 90-110, this codebase)
async function start(): Promise<void> {
	if (phase === 'listening' || phase === 'requesting') return;
	const mine = ++intent;
	phase = 'requesting';
	const result = await startMicSession(onFrame);
	if (mine !== intent) {
		if (result.ok) result.stop();
		return;
	}
	if (!result.ok) {
		unavailableReason = result.reason;
		phase = 'unavailable';
		return;
	}
	session = result;
	phase = 'listening';
}
```

The `intent` counter guards against a slow permission-prompt resolving after the user has already navigated away or clicked Stop - the MIDI module needs the identical guard, since `WebMidi.enable()` is also an awaited promise that can resolve well after a route change.

### Anti-Patterns to Avoid

- **Auto-calling `WebMidi.enable()` in `onMount` of the root layout:** Surfaces a permission prompt on every first-ever visit with zero context, and (per Chrome's 124+ MIDI permission gate) that prompt now covers ALL MIDI access, not just sysex - this is the same class of problem the mic panel already deliberately avoids. Gate behind an explicit "Connect" tap.
- **Module-scope `navigator.requestMIDIAccess` calls or `webmidi` singleton mutation at import time:** Breaks `adapter-static`'s prerender (`strict: true` in `svelte.config.js` means a prerender crash fails the build, not just degrades).
- **Re-registering `WebMidi.addListener('connected', ...)` on every component mount without cleanup:** `webmidi`'s `disable()` "destroys all registered listeners," but if the app itself never calls `disable()`, a component that mounts/unmounts repeatedly (e.g., navigating between hubs) and re-attaches a `connected` listener each time will accumulate duplicate handlers. Attach once in the state module (which lives for the app session), not per-component.
- **Treating `WebMidi.inputs.length === 0` right after `enable()` the same as a genuine "disconnected" event:** The first is "supported, no device ever seen" (mirrors mic's `no-device`); the second is "was connected, now isn't" - MIDI-01 explicitly wants both phrased distinctly ("device detected, device disconnected, or browser unsupported").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| MIDI device hot-plug detection | Manual `setInterval` polling of `navigator.requestMIDIAccess().then(a => a.inputs)` | `webmidi`'s `connected`/`disconnected`/`portschanged` events | MIDI-01 explicitly requires "no polling"; `webmidi` already wraps the native `MIDIAccess.onstatechange` handler into three distinct, well-named events |
| Device identity display | Regex-parsing raw `MIDIInput.id` | `input.name` / `input.manufacturer` on `WebMidi.Input` | `webmidi` already surfaces the human-readable fields the native API exposes on the port object; no parsing needed |
| Held-note / chord tracking (Phase 39 concern, but the module boundary matters now) | A second note-tracking layer bolted onto this phase's connection module | `webmidi`'s per-`Input` `noteon`/`noteoff` listeners, attached in Phase 39 to the same `Input` this phase already tracks | Keeps "plumbing" (Phase 38) and "grading" (Phase 39) as the roadmap's own stated split; Phase 38 should expose the connected `Input` (or a note-event passthrough) without pre-building grading logic |

**Key insight:** The entire hot-plug/permission/naming problem is already solved by the pinned `webmidi` version; the only genuinely new code this phase writes is the state-machine mapping (webmidi events → this app's `MidiConnectionState`) and the self-hiding indicator component - both are small and match three existing precedents in this exact codebase.

## Common Pitfalls

### Pitfall 1: Calling into `webmidi` during SSR/prerender

**What goes wrong:** `adapter-static` with `strict: true` prerenders every route at build time under Node. Any top-level `import { WebMidi } from 'webmidi'` combined with a module-scope call into it (even just reading `WebMidi.supported`) can throw if the library's own top-level code touches `navigator`.
**Why it happens:** `webmidi`'s `WebMidi` object is a singleton; importing the package itself is safe (ESM import graph only), but calling any of its methods at module scope is not.
**How to avoid:** Only ever call into `WebMidi.enable()`/`.inputs`/etc. from inside functions, and only from functions gated by SvelteKit's `browser` check (mirrors `swUpdate.svelte.ts`'s `if (!browser || ...) return;` guard) or invoked from `onMount`.
**Warning signs:** `npm run build` failing during the prerender step with a `navigator is not defined` or `ReferenceError` originating from a `midi` module.

### Pitfall 2: Treating the Chrome 124+ permission prompt as sysex-only

**What goes wrong:** Older docs/training knowledge (including this project's own `.claude/CLAUDE.md`) describe MIDI permission prompts as only gating `sysex: true`. As of Chrome 124 (rolling out gradually), **all** MIDI access - including plain note-level input with `sysex: false` - is gated behind a permission prompt.
**Why it happens:** The Web MIDI permission model changed in 2024-2025; training data and even this project's stack doc may reflect the pre-change assumption.
**How to avoid:** Design the `enabling` state to always assume a prompt may appear on first use in this session, regardless of `sysex`. Never omit an `enabling`/`requesting` UI state on the theory that "sysex is off so there's no prompt."
**Warning signs:** A "Connect" button that appears to hang with no visible feedback while the native browser permission dialog is open off-screen (e.g., behind a devtools-docked window) - reads as a bug if there's no `enabling` UI state to explain the wait.

### Pitfall 3: `input.name` rendered as raw device-supplied string with no escaping discipline

**What goes wrong:** MIDI device name strings come from the connected hardware's own USB descriptor - untrusted input from the app's perspective (a hub, adapter, or spoofed virtual MIDI port could report any string).
**Why it happens:** It's tempting to treat hardware-reported strings as "safe" because they don't come from a network request.
**How to avoid:** Always render `input.name`/`manufacturer` through Svelte's default auto-escaping `{expression}` interpolation, exactly like every other dynamic string in this app - never via `{@html}`. This codebase already documents this exact invariant for its one existing `{@html}` use site (`+layout.svelte`'s `TAB_ICONS`, explicitly commented as "every string here is an in-repo constant... If this file is ever edited to source icon markup from anywhere else, that invariant must be re-verified").
**Warning signs:** Any `{@html deviceName}` or string-concatenation-into-DOM pattern for the connection indicator.

### Pitfall 4: Generic/duplicate device names on hot-plug reconnect

**What goes wrong:** Many USB-MIDI interfaces (including generic USB-MIDI cable adapters some digital pianos use) report a generic name like `"USB MIDI Device"` or `"USB2.0-MIDI"` rather than the piano's actual model name, and the `id` webmidi assigns can change across a real unplug/replug (not just a `portschanged` state flip) depending on OS/driver.
**Why it happens:** The name/id come entirely from the device's own USB descriptor and the OS's MIDI subsystem, not from `webmidi` or this app.
**How to avoid:** Design the connection indicator's copy to work acceptably with a generic name (e.g., "Connected: USB MIDI Device") rather than assuming a friendly model name will always be available; don't build logic that depends on the name being stable across replug for correctness (only for display).
**Warning signs:** On-device UAT (required by the roadmap's HARDWARE-IN-THE-LOOP note) showing a less-friendly name than expected - this is expected hardware behavior, not a bug, unless the user's specific piano is known to report a friendly name.

### Pitfall 5: No real device in CI/automated tests

**What goes wrong:** Vitest (jsdom) has no MIDI implementation at all, and even Playwright's real Chromium has no *physical* device attached - `WebMidi.inputs` will always be `[]` in every automated environment.
**Why it happens:** Hardware-in-the-loop is fundamentally not automatable; this is explicitly called out in the roadmap notes for this phase.
**How to avoid:** Split coverage exactly as `swUpdate.test.ts` already models the codebase's own precedent: pure state-transition logic (reducer functions, feature detection) gets full Vitest unit coverage; the actual event-wiring/hardware behavior is verified via Playwright (which CAN exercise the "supported, no device" and permission-prompt paths using `context.grantPermissions(['midi'])`, `['midi-sysex']`) plus mandatory on-device manual UAT with the physical USB piano for real plug/unplug.
**Warning signs:** A plan that tries to "mock a physical MIDI device" for behavior only the real hardware can prove (actual model name string, actual hot-plug timing).

## Code Examples

Verified patterns from official sources and this codebase:

### Enabling WebMidi and reading connected inputs
```typescript
// Source: https://webmidijs.org/docs/getting-started/basics/ (WEBMIDI.js official docs)
import { WebMidi } from 'webmidi';

WebMidi.enable({ sysex: false })
	.then(() => {
		WebMidi.inputs.forEach((input) => {
			console.log(input.manufacturer, input.name);
		});
	})
	.catch((err) => console.error(err));
```

### Listening for hot-plug events
```typescript
// Source: https://webmidijs.org/api/classes/WebMidi (WEBMIDI.js official API reference)
// 'connected' fires when an Input/Output becomes available (device plugged in).
// 'disconnected' fires when one becomes unavailable (device unplugged).
// 'portschanged' is the catch-all for either (added in webmidi v3.0.2).
WebMidi.addListener('connected', (e) => {
	console.log('Connected:', e.port.name, e.port.type); // e.port is the Input or Output
});

WebMidi.addListener('disconnected', (e) => {
	console.log('Disconnected:', e.port.name, e.port.type);
});
```

### Granting MIDI permission in a Playwright test (no real device, deterministic)
```typescript
// Source: Playwright official docs, BrowserContext.grantPermissions
// (https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions)
// This lets an e2e test call WebMidi.enable() in real Chromium without a native
// prompt hanging the test - WebMidi.inputs will be [] (no hardware), which is
// exactly the "supported, no device" state this phase must render correctly.
const context = await browser.newContext();
await context.grantPermissions(['midi', 'midi-sysex']);
```

### Feature-detection guard mirroring `micInput.ts`'s existing contract
```typescript
// Recommended: $lib/midi/webmidi.ts, following src/lib/audio/micInput.ts's exact shape
// (this codebase, lines 55-71) - "importing this module touches no browser API."
export function midiUnsupportedReason(): 'no-window' | 'unsupported' | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'no-window';
	if (typeof navigator.requestMIDIAccess !== 'function') return 'unsupported';
	return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---------------|-------------------|----------------|--------|
| Web MIDI permission prompt only for `sysex: true` requests; plain note I/O was ungated in Chrome | Permission prompt now gates ALL MIDI access (`sysex: true` or `false`) | Chrome 124, gradual rollout starting 2024, now the shipped default | `[CITED: developer.chrome.com/blog/web-midi-permission-prompt]` This phase's `enabling`/permission-requesting UI state is now mandatory even though the app only ever needs `sysex: false` - the old assumption ("sysex off = no prompt") no longer holds |

**Deprecated/outdated:**
- The assumption (present in this project's own `.claude/CLAUDE.md`, written before this permission change was as widely rolled out) that only sysex usage triggers a prompt - treat that line in CLAUDE.md as historically accurate for describing *why* `sysex` exists as an option, but not as guidance that plain `sysex:false` access is prompt-free today.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `requestMIDIAccess()`/`WebMidi.enable()` requires a user gesture (transient activation) on first call in a session, similar to `getUserMedia`, and Chrome's general permission-persistence behavior means a previously-granted origin does not need a fresh gesture on reload | Pattern 3 / Common Pitfalls | If wrong (e.g., no gesture requirement at all, or the browser re-prompts on every reload regardless of gesture), the "explicit Connect button" design is still safe (a strictly more conservative UX than needed) but could be simplified later (e.g., safe to auto-`enable()` silently once already granted). Low risk either way - worth a `checkpoint:human-verify` on-device rather than blocking the design. |
| A2 | The connected device will report a name via `input.name`/`manufacturer` that is at least somewhat legible (even if generic, e.g., "USB MIDI Device") rather than an empty string | Pitfall 4 | If the specific USB piano reports an empty/undefined name, the indicator copy needs a "MIDI device connected" fallback string rather than assuming a name is always present - low risk, cheap fallback to add |
| A3 | No prior sketch exists for this specific connection-indicator UI (the sketch-findings skill's session index does not list a MIDI-connection sketch among sketches 001-024) | Open Questions / Summary | If a sketch does exist elsewhere and was missed, the planner may re-derive a placement/visual treatment that conflicts with an already-locked design decision; worth a quick grep of `.claude/skills/sketch-findings-music-learn/sources/` titles before finalizing the indicator's visual design |

## Open Questions

1. **Where does the connection indicator live?**
   - What we know: The masthead already hosts `StreakBadge` (self-hiding at zero) and `LocaleToggle` (desktop-only, hidden on phone via `hidden sm:block`), and the phone bottom-tab-bar has no room for a text indicator (56px icon+label slots, no spare slot). The Print Shop identity's mono status-register convention (`font-mono uppercase`, `letter-spacing: 0.08em`) is used throughout for status/label text.
   - What's unclear: Whether the indicator belongs in the masthead (always-visible, competes for space with StreakBadge/LocaleToggle on a narrow phone viewport) or scoped to only the Practice hub (where MIDI answering will actually matter starting Phase 39) or its own settings-style row.
   - Recommendation: Given MIDI-01 says "see its live connection state" with no specific location constraint, and the masthead's existing `hidden sm:block` pattern already handles narrow-viewport crowding for `LocaleToggle`, place a compact `MidiStatus` component in the masthead next to `StreakBadge`, self-hiding entirely on `unsupported` (satisfying MIDI-04 by the same mechanism `StreakBadge` uses for "streak = 0"). Confirm this placement in `/gsd-discuss-phase` or a UI-SPEC pass rather than deciding it unilaterally here - no sketch exists for this surface yet.

2. **Should `enable()` be attempted automatically once per session if permission was already granted in a prior session?**
   - What we know: Chrome generally persists origin permission grants across reloads (A1 above); the mic panel in this codebase, by contrast, ALWAYS requires an explicit click even on a returning session.
   - What's unclear: Whether silently auto-enabling on mount (skipping the button) when already-granted is worth building, versus keeping the mic panel's uniform "always requires a click" simplicity.
   - Recommendation: Default to requiring an explicit "Connect" tap every session (mirrors the mic panel precedent exactly, zero new UX pattern to design/test); revisit only if on-device UAT reveals the extra tap is annoying for a piano that's plugged in every session.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|-----------|
| `webmidi` npm package | MIDI-01, MIDI-04 | ✗ (not yet installed - `npm ls webmidi` returns nothing in this repo today) | 3.1.16 confirmed on registry | Install as part of this phase's first task; no fallback needed, it's the phase's own deliverable |
| Web MIDI API (Chrome-family browsers) | MIDI-01 | ✓ (Chromium via Playwright confirms `navigator.requestMIDIAccess` exists) | Chrome 124+ permission model assumed current | Feature-detected; Safari/iOS fall back to "no MIDI chrome" (MIDI-04) by design, not as a degraded path |
| Physical USB digital piano | On-device UAT (hot-plug, real device naming) | Unknown from this research session - depends on whether the piano is physically present when this phase executes | — | None - roadmap explicitly flags this phase HARDWARE-IN-THE-LOOP; code-level verification can complete without it, but UAT sign-off cannot |
| Playwright + Chromium (already installed, `@playwright/test` ^1.62.0) | Deterministic "supported, no device" + permission-grant testing | ✓ | 1.62.0 | — |

**Missing dependencies with no fallback:**
- Physical USB piano for on-device hot-plug UAT - cannot be substituted by any automated test; the plan must include an explicit human-verify checkpoint for MIDI-01's plug/unplug success criteria.

**Missing dependencies with fallback:**
- `webmidi` npm package itself is "missing" only in the sense that it hasn't been installed yet - this phase installs it as its own first task, not a blocker.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (unit/component, jsdom) + Playwright 1.62.0 (`tests/e2e/`, real Chromium against the production build) |
| Config file | `vite.config.ts` (Vitest, `environment: 'jsdom'`, setup `vitest-setup.ts`) / `playwright.config.ts` (Chromium project, blocks service worker, `grantPermissions` available on `BrowserContext`) |
| Quick run command | `npx vitest run src/lib/midi` |
| Full suite command | `npm test` (Vitest) and `npm run test:e2e` (Playwright, requires `npm run build` first) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|---------------|
| MIDI-01 | Feature detection returns `unsupported` when `navigator.requestMIDIAccess` is absent | unit | `npx vitest run src/lib/midi/webmidi.test.ts` | ❌ Wave 0 |
| MIDI-01 | State-transition reducer maps `connected`/`disconnected`/`portschanged` webmidi events to the app's `MidiConnectionState`, using a device name | unit | `npx vitest run src/lib/midi/midi.test.ts` | ❌ Wave 0 |
| MIDI-01 | On real Chromium with MIDI permission granted (no device), state resolves to "supported, no device" without polling/timers | e2e (Playwright) | `npm run test:e2e -- midi.spec.ts` | ❌ Wave 0 |
| MIDI-01 (hot-plug) | Device connect/disconnect while a session is open updates state with no reload | manual-only (HARDWARE-IN-THE-LOOP) | — (no automated substitute; real USB device required) | N/A |
| MIDI-04 | `MidiStatus` component renders nothing when state is `unsupported` | component (Vitest + `@testing-library/svelte`) | `npx vitest run src/lib/components/MidiStatus.test.ts` | ❌ Wave 0 |
| MIDI-04 | Every existing on-screen-keyboard/drill flow test still passes unmodified (REG) | full suite regression | `npm test` | ✓ (existing suite; no new file, just re-run) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/midi` (quick, targeted)
- **Per wave merge:** `npm test` (full Vitest suite - REG-02 requires the existing suite stay green)
- **Phase gate:** Full Vitest suite + `npm run test:e2e` + `npm run check` (svelte-check) green before `/gsd-verify-work`, plus the mandatory human-verify hardware checkpoint for plug/unplug and hot-plug (cannot be closed by automation - flag as `human_needed` in verification, matching this project's existing precedent for Phases 34/35's deferred on-device UAT items in STATE.md)

### Wave 0 Gaps
- [ ] `src/lib/midi/webmidi.ts` + `src/lib/midi/webmidi.test.ts` - feature detection + `webmidi` event-wiring boundary
- [ ] `src/lib/midi/midi.svelte.ts` + `src/lib/midi/midi.test.ts` - reactive state module (mirrors `swUpdate.svelte.ts`/`swUpdate.test.ts` split of pure logic vs. browser wiring)
- [ ] `src/lib/components/MidiStatus.svelte` + a component test - masthead indicator, self-hides on `unsupported`
- [ ] `tests/e2e/midi.spec.ts` - Playwright spec using `context.grantPermissions(['midi'])` to exercise "supported, no device" deterministically in CI
- [ ] `npm install webmidi@3.1.16` - dependency not yet present in `package.json`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | No | No auth surface in this phase - purely client-side hardware I/O |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Yes | Treat `input.name`/`manufacturer` (hardware-reported, effectively untrusted) as data, not markup: render only via Svelte's default auto-escaping `{expression}` interpolation, never `{@html}` - matches this codebase's own documented invariant for its one existing `{@html}` site in `+layout.svelte` |
| V6 Cryptography | No | N/A - no secrets, no crypto surface in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| A malicious/rogue virtual MIDI port reporting a crafted name string (e.g., containing `<script>` or template-injection-looking text) rendered unescaped | Tampering / Elevation of Privilege (stored/reflected XSS via a non-network input channel) | Svelte's default `{expression}` interpolation auto-escapes; never build a `{@html}` path for device-reported strings. Low actual risk for a single-user app on a private device, but cheap and mechanical to get right by simply not introducing `{@html}` here. |
| Calling `WebMidi.enable({ sysex: true })` when the app never needs sysex | Elevation of Privilege (requesting broader capability than needed) | Always call `WebMidi.enable({ sysex: false })` explicitly (or omit the option, which defaults to `false` per the Web MIDI spec) - this app has no sysex use case (MIDI-02/MIDI-03 are note-level only) |

## Sources

### Primary (HIGH confidence)
- `webmidijs.org/docs/getting-started/basics/` - `WebMidi.enable()` signature, `sysex` option, `WebMidi.inputs`, `input.name`/`manufacturer`, `noteon`/`noteoff` listener pattern
- `webmidijs.org/api/classes/WebMidi` - `connected`/`disconnected`/`portschanged`/`enabled`/`disabled`/`midiaccessgranted` event list, `disable()` signature
- npm registry direct queries (`npm view webmidi version/time.modified/dist-tags/repository.url/types/exports/scripts.postinstall`) - all version/metadata claims cross-checked 2026-08-04
- `gsd-tools query package-legitimacy check --ecosystem npm webmidi` - verdict **OK**, weekly downloads ~19,189, no postinstall script
- `developer.chrome.com/blog/web-midi-permission-prompt` - Chrome 124+ permission model change (all MIDI access now gated, not just sysex)
- `playwright.dev/docs/api/class-browsercontext` (via search digest) - `grantPermissions(['midi', 'midi-sysex'])` capability confirmed
- This codebase directly: `src/lib/audio/micInput.ts`, `src/lib/components/MicCheckPanel.svelte`, `src/lib/pwa/swUpdate.svelte.ts`, `src/lib/pwa/swUpdate.test.ts`, `src/lib/srs/dueBadge.svelte.ts`, `src/lib/i18n/locale.svelte.ts`, `src/routes/+layout.svelte`, `src/app.css`, `vite.config.ts`, `vitest-setup.ts`, `playwright.config.ts`

### Secondary (MEDIUM confidence)
- MDN Web MIDI API page (via search digest, not raw-fetched) - secure-context requirement (`window.isSecureContext`), `requestMIDIAccess()` throwing `SecurityError` on plain `http://`
- General user-gesture/transient-activation discussion (via search digest across Chromium bug threads and mediacapture-extensions issue #11) - permission persistence across reload is a general Chromium pattern, not confirmed MIDI-specific in an authoritative source this session (see Assumption A1)

### Tertiary (LOW confidence)
- None retained as authoritative claims in this document - anything only found via a single unverified blog was either cross-checked against the npm registry/official docs above or moved into the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `webmidi` version/metadata directly verified against the npm registry and matches the project's own already-locked CLAUDE.md pin
- Architecture: HIGH - every pattern cited is an existing, working precedent already in this exact codebase (`micInput.ts`, `swUpdate.svelte.ts`, `dueBadge.svelte.ts`, `+layout.svelte`)
- Pitfalls: HIGH for the SSR/prerender and permission-model pitfalls (directly sourced); MEDIUM for the generic-device-name pitfall (a documented general MIDI-hardware behavior, not verified against this user's specific piano)
- Indicator placement (Open Question 1): MEDIUM - no prior sketch covers this surface; recommendation is reasoned from existing masthead conventions, not a locked design decision

**Research date:** 2026-08-04
**Valid until:** 30 days for the architecture/pattern findings (stable, codebase-internal); re-verify the Chrome permission-prompt behavior (State of the Art table) if this phase's execution slips past a Chrome version bump, since that policy was still "gradually rolling out" as of the source consulted.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|--------------|----------------------|
| MIDI-01 | The user can connect the USB digital piano and see its connection state in the app: device detected, device disconnected, or browser unsupported (Safari/iOS). Uses `webmidi`'s device events, no polling. | `webmidi`'s `connected`/`disconnected`/`portschanged` events (Architecture Patterns, Code Examples) map directly to the three required states; `MidiConnectionState` shape proposed in Pattern 2; feature detection shape mirrors `micInput.ts` (Pattern 1); hot-plug specifics and generic-device-naming caveats in Pitfalls 4-5; hardware-in-the-loop testing boundary defined in Validation Architecture |
| MIDI-04 | On browsers without Web MIDI, the app works unchanged with the on-screen keyboard and shows no MIDI chrome. Progressive enhancement: feature-detect, never degrade the non-MIDI path. | Self-hiding component pattern (mirrors `StreakBadge`'s zero-streak self-hide) in Summary/Architecture Patterns; `midiUnsupportedReason()` feature-detection function in Pattern 1/Code Examples; Security Domain confirms no `{@html}`/escaping regression risk from the new surface; REG test-map row confirms existing suite must stay green |
</phase_requirements>
