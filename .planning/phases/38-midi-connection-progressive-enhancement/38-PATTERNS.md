# Phase 38: MIDI Connection & Progressive Enhancement - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 6 (5 new, 1 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/midi/webmidi.ts` | service (browser-API boundary) | event-driven | `src/lib/audio/micInput.ts` | exact |
| `src/lib/midi/webmidi.test.ts` | test | event-driven | `src/lib/pwa/swUpdate.test.ts` (pure-logic split) | role-match |
| `src/lib/midi/midi.svelte.ts` | store (reactive module state) | event-driven | `src/lib/pwa/swUpdate.svelte.ts` | exact |
| `src/lib/midi/midi.test.ts` | test | event-driven | `src/lib/pwa/swUpdate.test.ts` | exact |
| `src/lib/components/MidiStatus.svelte` | component (self-hiding indicator) | request-response (reads reactive state) | `src/lib/components/StreakBadge.svelte` (self-hide) + `src/lib/components/MicCheckPanel.svelte` (gesture-gated connect) | role-match (composite) |
| `tests/e2e/midi.spec.ts` | test (e2e) | event-driven | `tests/e2e/mic-check-granted.spec.ts` | exact |
| `src/routes/+layout.svelte` (modified: add `<MidiStatus />` to masthead) | component (integration point) | request-response | same file, `StreakBadge`/`LocaleToggle` mount site (lines 191-197) | exact |

## Pattern Assignments

### `src/lib/midi/webmidi.ts` (service, event-driven)

**Analog:** `src/lib/audio/micInput.ts`

**Module contract / header comment** (lines 1-19 of micInput.ts) — copy the "importing constructs nothing" framing verbatim, adapted:
```typescript
/**
 * Thin webmidi.js plumbing for MIDI device connection. Every state-machine
 * decision lives in midi.svelte.ts (pure-ish, event-driven); this module's
 * only job is wiring WebMidi.enable()/inputs/events.
 *
 * Merely importing this module touches no browser API: every
 * navigator/window/WebMidi reference lives inside a function body, never at
 * module scope. Prerender/jsdom safe.
 */
```

**Feature detection pattern** (micInput.ts lines 56-71) — mirror exactly, MIDI has no secure-context/AudioContext checks but same `typeof window === 'undefined'` guard shape:
```typescript
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
Recommended MIDI equivalent (from RESEARCH.md, already vetted against this exact precedent):
```typescript
export function midiUnsupportedReason(): 'no-window' | 'unsupported' | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'no-window';
	if (typeof navigator.requestMIDIAccess !== 'function') return 'unsupported';
	return null;
}
```

**Error-mapping pattern** (micInput.ts lines 73-78) — same shape for mapping a rejected `enable()` promise to a reason enum:
```typescript
function mapGetUserMediaError(err: unknown): MicUnavailableReason {
	const name = err instanceof DOMException ? err.name : '';
	if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied';
	if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'no-device';
	return 'unknown';
}
```

**Async start + result-union pattern** (micInput.ts lines 44, 88-104) — `startMicSession` returns `MicSession | MicUnavailable`; mirror with `connectMidi(): Promise<MidiConnectResult>` returning a discriminated union (`{ ok: true, ... } | { ok: false, reason }`), guarding `micUnavailableReason()`/`midiUnsupportedReason()` first before ever touching the browser API:
```typescript
export async function startMicSession(onFrame: (frame: DetectFrame) => void): Promise<MicStartResult> {
	const reason = micUnavailableReason();
	if (reason) return { ok: false, reason };
	// ... await getUserMedia, wrap errors via mapGetUserMediaError
}
```

**Teardown discipline** (micInput.ts lines 113-129) — never throw from teardown, wrap every disconnect/stop in try/catch; MIDI equivalent should mirror this for detaching `WebMidi.removeListener`/`disable()` calls, though per RESEARCH.md's anti-pattern warning, the module should attach `WebMidi.addListener` ONCE for the app session rather than per-component (unlike mic's per-session start/stop symmetry).

---

### `src/lib/midi/midi.svelte.ts` (store, event-driven)

**Analog:** `src/lib/pwa/swUpdate.svelte.ts`

**Full module shape to copy** (swUpdate.svelte.ts lines 1-46):
```typescript
import { browser } from '$app/environment';

// Pure reducer/predicate function(s) exported for unit testing without
// touching $state at all — mirrors computeUpdateReady.
export function computeUpdateReady({ hasWaiting, hasController }: {...}): boolean {
	return hasWaiting && hasController;
}

let ready = $state(false);

export function updateAvailable(): boolean {
	return ready;
}

export function setUpdateAvailable(value: boolean): void {
	ready = value;
}
```

Apply directly to MIDI (already spec'd in RESEARCH.md Pattern 2):
```typescript
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

**Browser-only wiring function pattern** (swUpdate.svelte.ts lines 58-82) — `registerUpdateWatcher()` guards with `if (!browser || !('serviceWorker' in navigator)) return;` then attaches listeners exactly once; mirror this exact guard shape for a `initMidiWatcher()`/`connect()` function, called once from root layout's `onMount`.

**Reload/side-effect guard pattern** (swUpdate.svelte.ts lines 48-50, 77-81) — a module-scope boolean guard (`reloaded`) prevents a listener from firing its side effect more than once per page load; the MIDI module needs the analogous `intent`-counter guard (see MicCheckPanel below) to prevent a slow `enable()` promise from resolving after the user navigated away.

---

### `src/lib/midi/webmidi.test.ts` + `src/lib/midi/midi.test.ts` (test, event-driven)

**Analog:** `src/lib/pwa/swUpdate.test.ts`

**Full test file structure to copy** (swUpdate.test.ts, all 46 lines): pure-logic tests only (feature detection, reducer/state-mapping functions), using `flushSync` from `'svelte'` to synchronously observe `$state` module updates:
```typescript
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { computeUpdateReady, setUpdateAvailable, updateAvailable } from './swUpdate.svelte';

describe('computeUpdateReady', () => {
	it('is true only when a waiting worker AND an active controller both exist', () => {
		expect(computeUpdateReady({ hasWaiting: true, hasController: true })).toBe(true);
	});
});

describe('updateAvailable / setUpdateAvailable', () => {
	it('round-trips true then false through the reactive module state', () => {
		flushSync(() => setUpdateAvailable(true));
		expect(updateAvailable()).toBe(true);
	});
});
```
Note the file's own comment: "The browser-only wiring (registerUpdateWatcher/applyUpdate) talks to navigator.serviceWorker and is exercised by human/manual verification ... not jsdom." Apply the identical split to MIDI: `webmidi.test.ts` covers `midiUnsupportedReason()` (jsdom has no `navigator.requestMIDIAccess`, so it deterministically returns `'unsupported'`) and any pure error-mapping function; `midi.test.ts` covers the state-transition reducer and `midiState()`/`setMidiState()` round-trips via `flushSync`. Real `WebMidi.enable()`/event wiring is NOT unit-testable in jsdom — defer to Playwright + manual UAT (per RESEARCH.md Pitfall 5).

---

### `src/lib/components/MidiStatus.svelte` (component, self-hiding indicator)

**Analogs:** `src/lib/components/StreakBadge.svelte` (self-hide mechanism) + `src/lib/components/MicCheckPanel.svelte` (gesture-gated connect + intent-counter)

**Self-hide pattern** (StreakBadge.svelte lines 48-56):
```svelte
{#if variant === 'compact'}
	{#if !loading && count >= 1}
		<span class="streak-badge streak-badge--compact text-label font-mono uppercase" data-testid="streak-badge">
			{t('progress.streakBadge.compactCount').replace('{N}', String(count))}
		</span>
	{/if}
{:else}
	...
{/if}
```
Apply to `MidiStatus.svelte`: wrap the entire component body in `{#if midiState().kind !== 'unsupported'}` so it renders nothing at all on unsupported browsers (MIDI-04) — the exact same "absent chip reads better than a discouraging message" rationale documented in StreakBadge's own comment block (lines 9-11, 21-23).

**Gesture-gated connect + intent-counter pattern** (MicCheckPanel.svelte lines 59-69, 90-116):
```typescript
type Phase = 'idle' | 'requesting' | 'listening' | 'unavailable';

let phase = $state<Phase>(isMicAvailable() ? 'idle' : 'unavailable');
let session: MicSession | null = null;
/** Bumped on every start/stop (including destroy), so a start resolving after a stop never attaches. */
let intent = 0;

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
Apply identically for the "Connect" button that calls into `webmidi.ts`'s `connectMidi()` — never auto-call on mount (RESEARCH.md Pattern 3 / Anti-Patterns), gate strictly behind a user click, and use the same `intent` counter to guard against `WebMidi.enable()` resolving after the component unmounts.

**Status text / label styling convention** (MicCheckPanel.svelte lines 178-180):
```svelte
<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
	{t('home.mic.label')}
</p>
```
Reuse this exact "mono status-register" convention (`font-mono uppercase`, `letter-spacing: 0.08em`) for the connected-device-name text, per RESEARCH.md's Open Question 1 note that this is the Print Shop identity's established status-label treatment. Render `input.name`/`manufacturer` only via default `{expression}` interpolation — never `{@html}` (Security Domain / Pitfall 3).

**Unavailable-copy-key switch pattern** (MicCheckPanel.svelte lines 122-136) — mirror this `switch` shape for mapping `MidiConnectionState['kind']` to an i18n message key.

**onDestroy teardown call** (MicCheckPanel.svelte line 174): `onDestroy(stop);` — note RESEARCH.md's anti-pattern warning that `WebMidi.addListener` for connect/disconnect events should live in the module (attached once for the app session), NOT re-attached per component mount; `MidiStatus.svelte`'s `onDestroy` only needs to guard its own local `intent`/pending-promise state, not remove the module-level hot-plug listeners.

---

### `src/routes/+layout.svelte` (modified — masthead integration point)

**Analog:** same file, existing `StreakBadge`/`LocaleToggle` mount site (lines 191-197)

```svelte
<div class="flex flex-wrap items-center gap-2">
	<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">{t('brand')}</span>
	<StreakBadge variant="compact" count={streakCount} />
	<div class="hidden sm:block">
		<LocaleToggle />
	</div>
</div>
```
Add `<MidiStatus />` alongside `StreakBadge` in this same flex row (per RESEARCH.md Open Question 1's recommendation) — it already self-hides on `unsupported`, so no `hidden sm:block` wrapper is needed unless UAT reveals crowding on narrow phone viewports.

---

### `tests/e2e/midi.spec.ts` (test, e2e)

**Analog:** `tests/e2e/mic-check-granted.spec.ts`

**Permission-grant + fake-device test setup pattern** (mic-check-granted.spec.ts lines 17-22):
```typescript
test.use({
	permissions: ['microphone'],
	launchOptions: {
		args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
	}
});
```
MIDI equivalent (per RESEARCH.md Code Examples, official Playwright docs):
```typescript
test.use({ permissions: ['midi', 'midi-sysex'] });
// or, per-test: await context.grantPermissions(['midi', 'midi-sysex']);
```
Since Playwright/Chromium has no real MIDI hardware, `WebMidi.inputs` will always be `[]` — this test can only deterministically exercise the "supported, no device" state, not real hot-plug (that is HARDWARE-IN-THE-LOOP, manual-only, per RESEARCH.md Validation Architecture).

**Lifecycle test shape to copy** (mic-check-granted.spec.ts lines 31-54): a "connect then observe status" test and a "navigate away mid-connection tears down cleanly" test, using `data-testid` locators and asserting element visibility toggles — apply the identical two-test shape to `midi.spec.ts` (connect button visible → click → status updates to "supported, no device"; navigate away → destination page renders fine, no dangling listeners/errors).

## Shared Patterns

### Browser-only module contract ("importing constructs nothing")
**Source:** `src/lib/audio/micInput.ts` (lines 1-19, 56-71), `src/lib/pwa/swUpdate.svelte.ts` (lines 58-59)
**Apply to:** `webmidi.ts`, `midi.svelte.ts`
Every `navigator`/`window`/`WebMidi` reference must live inside a function body, guarded by `typeof window === 'undefined'` or SvelteKit's `browser` import — never at module top level. This is mandatory for `adapter-static`'s `strict: true` prerender not to crash the build.

### Explicit user-gesture gate before any permission-prompting call
**Source:** `src/lib/components/MicCheckPanel.svelte` (lines 90-110)
**Apply to:** `MidiStatus.svelte`
Never call `WebMidi.enable()` from `onMount`/module init. Gate behind an explicit "Connect" button click, using an `intent` counter to discard a promise that resolves after the user has navigated away or re-clicked.

### Self-hiding chrome pattern
**Source:** `src/lib/components/StreakBadge.svelte` (lines 9-11, 21-23, 48-56)
**Apply to:** `MidiStatus.svelte`
Render nothing (not a skeleton, not a disabled state) when the feature is irrelevant to the current environment — zero streak for StreakBadge, `unsupported` for MidiStatus. Satisfies MIDI-04 by construction rather than by a separate conditional render path elsewhere in the app.

### Mono status-register label styling
**Source:** `src/lib/components/MicCheckPanel.svelte` (line 178)
**Apply to:** `MidiStatus.svelte`
`font-mono uppercase` with `letter-spacing: 0.08em` for any small status/label text, matching the Print Shop identity's established convention (also used by `StreakBadge`'s compact variant, `text-label font-mono uppercase`).

### Pure-logic vs. browser-wiring test split
**Source:** `src/lib/pwa/swUpdate.test.ts` (all 46 lines, header comment lines 10-15)
**Apply to:** `webmidi.test.ts`, `midi.test.ts`
Unit-test only pure functions (feature detection, error mapping, state-transition reducers) with Vitest/jsdom; never attempt to unit-test real event wiring against a nonexistent browser API. Real event-wiring gets Playwright coverage (deterministic "supported, no device" via `grantPermissions`); real hardware behavior (hot-plug, device naming) is manual-only, flagged `human_needed` per this project's Phase 34/35 precedent.

## No Analog Found

None — every file in this phase has a strong existing analog (webmidi's device-connection lifecycle problem is architecturally identical to the mic-permission and service-worker-update problems already solved three times in this codebase).

## Metadata

**Analog search scope:** `src/lib/audio/`, `src/lib/pwa/`, `src/lib/srs/`, `src/lib/components/`, `src/routes/+layout.svelte`, `tests/e2e/`
**Files scanned:** `micInput.ts`, `MicCheckPanel.svelte`, `swUpdate.svelte.ts`, `swUpdate.test.ts`, `StreakBadge.svelte`, `streakBadge.test.ts` (existence-checked), `dueBadge.svelte.ts` (existence-checked, not needed beyond confirming the `.svelte.ts` idiom count), `+layout.svelte`, `mic-check-granted.spec.ts`
**Pattern extraction date:** 2026-08-04
