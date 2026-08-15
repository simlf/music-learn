---
phase: 38-midi-connection-progressive-enhancement
reviewed: 2026-08-04T23:35:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/lib/midi/webmidi.ts
  - src/lib/midi/webmidi.test.ts
  - src/lib/midi/midi.svelte.ts
  - src/lib/midi/midi.test.ts
  - src/lib/components/MidiStatus.svelte
  - src/lib/components/midiStatus.test.ts
  - src/lib/i18n/messages/chrome.ts
  - src/routes/+layout.svelte
  - tests/e2e/midi.spec.ts
  - tests/masthead.e2e.test.ts
findings:
  critical: 1
  warning: 10
  info: 7
  total: 18
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-08-04T23:35:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 38 adds Web MIDI as progressive enhancement: a lazy boundary module (`webmidi.ts`), a reactive session state machine (`midi.svelte.ts`), a self-hiding masthead chip (`MidiStatus.svelte`), EN/FR copy, and unit + Playwright coverage.

Verified green during this review (evidence, not assumption):

- `npm run check` — 1481 files, 0 errors.
- `npx vitest run` — 151 files, 2608 tests passed.
- `npx playwright test` — 69 tests passed (full suite, not just `midi.spec.ts`), so the new masthead chip causes no layout/scroll/tap-target regression at 320/375/390/812/1280px.
- The phase's stated hard constraints that **do** hold: no `navigator`/`WebMidi` at module scope; `webmidi` reached only through `import('webmidi')`, confirmed emitted as a dynamic chunk (`build/_app/immutable/chunks/BxoT61B_.js`, referenced only as `import(\`...\`)` from node 0, with zero `modulepreload` entries in `build/index.html`); `enable({ sysex: false })`; feature detection strictly before any permission-prompting call; `grep -c midi-status build/index.html` = 0, so the prerendered HTML carries no MIDI markup; device names are rendered through Svelte text interpolation, never `{@html}`; no em dashes in any new user-facing string; no note-grading scope creep.

What is **not** sound: the state reducer silently assumes exactly one MIDI input port ever exists. `nextMidiState` never compares the event's port id against the currently connected device, and webmidi.js's own documentation states these events "may fire several times if a device possesses multiple inputs and/or outputs (**which is often the case**)". That single omission corrupts the exact seam Phase 39 was told to consume. Beyond it, the port-event handler dereferences a field the library documents as a lookup that can return `undefined`, the device name (untrusted USB descriptor data) is fed to `String.replace` as a *replacement pattern* where `$&`/`` $` ``/`$'` are special, the `watchPorts` disposer can clobber a newer registration and strand a live listener, and three of the phase's tests assert less than their comments claim, including one that is effectively vacuous.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: The port-event reducer ignores device identity, so any second input port hijacks or falsely clears the connected device

**File:** `src/lib/midi/midi.svelte.ts:65-79` (and the enable path it disagrees with, `src/lib/midi/midi.svelte.ts:37-46`)

**Issue:** `nextMidiState` makes its decision from `event.type` and `event.portKind` only. `event.id` is written into the new state but never compared with `current.deviceId`. Three concrete wrong behaviours follow, all reachable with ordinary hardware:

1. **False disconnect.** With the piano connected as `in-1`, a `disconnected` event for *any other* input port (`in-2`) drives `{ kind: 'disconnected' }`. The chip reads `MIDI: DISCONNECTED` while the piano is still plugged in, and `connectedDeviceId()` starts returning `null` — Phase 39's note stream is dead until the user taps again or reloads. The reducer's own doc comment claims it protects "was connected, now is not"; it actually cannot tell *which* device is not.
2. **Silent device hijack.** A `connected` event for any input port unconditionally overwrites `deviceId`/`deviceName` ("a `connected` input event always wins"). Plug in a second controller, or wake from sleep, and `connectedDeviceId()` now points at a port the user is not playing. Phase 39 will attach `noteon` listeners to the wrong `Input` via `activeInput(connectedDeviceId())` and grade nothing.
3. **Enable path and event path disagree.** `stateFromEnable` takes `inputs[0]`; the reducer takes *whichever event arrived last*. Multi-port instruments are the norm (a single USB piano commonly exposes a keys port plus a second "MIDI IN 2"/DAW port), and webmidi.js emits one `connected` per port, so the two paths can select different ports for the same physical instrument — nondeterministic display name and nondeterministic Phase 39 target.

Library evidence (`node_modules/webmidi/dist/esm/webmidi.esm.js:12326-12329, 12346-12347, 12358-12361`): "Please note that it may fire several times if a device possesses multiple inputs and/or outputs (which is often the case)."

No test covers a mismatched id, which is why the suite is green — `midi.test.ts:56-143` only ever uses `in-1`.

**Fix:**

```ts
export function nextMidiState(
	current: MidiConnectionState,
	event: MidiPortEvent
): MidiConnectionState {
	if (current.kind === 'unsupported') return current;
	if (event.portKind !== 'input') return current;

	if (event.type === 'connected') {
		// Do not steal an established device: a second port connecting while a
		// device is already selected is not a device change.
		if (current.kind === 'connected' && current.deviceId !== event.id) return current;
		if (current.kind === 'connected' && current.deviceId === event.id) {
			// Same port re-announced (sleep/wake, port re-open): no-op, so a
			// reactive consumer does not re-render for nothing.
			return current;
		}
		return { kind: 'connected', deviceId: event.id, deviceName: event.name };
	}

	// disconnected: only the port we are actually using can disconnect us.
	if (current.kind !== 'connected') return current;
	if (current.deviceId !== event.id) return current;
	return { kind: 'disconnected' };
}
```

Add reducer tests for: `connected(in-1)` then `connected(in-2)` keeps `in-1`; `connected(in-1)` then `disconnected(in-2)` stays `connected`; `disconnected(in-1)` from `connected(in-1)` goes to `disconnected`. If "last port wins" is genuinely wanted instead, then `stateFromEnable`'s `inputs[0]` must change to match, and the choice must be stated in the comment — the two cannot keep disagreeing.

## Warnings

### WR-01: `watchPorts` dereferences `event.port` unguarded, and the library's own emit path can pass `undefined`

**File:** `src/lib/midi/webmidi.ts:51-53, 124-139`

**Issue:** `PortChangeEvent` declares `port` as non-optional, and both handlers immediately read `event.port.type`, `event.port.id`, `event.port.name`. That type is a claim about the library that the library does not make: in `_onInterfaceStateChange` the library assigns `event.port = this.getInputById(...)` / `getOutputById(...)` before emitting (`webmidi.esm.js:12384-12403`), and `getInputById` returns `undefined` on a lookup miss rather than throwing (`webmidi.esm.js:12043-12066`) — for the disconnect branch it searches `_disconnectedInputs`, which is only populated when the backend has already dropped the port from `MIDIAccess.inputs`. A miss therefore yields `event.port === undefined`, and a `TypeError` thrown here is thrown from inside a browser-dispatched `statechange` callback: app code cannot catch it, the remaining listener work is abandoned, and MIDI state freezes for the session. The library itself carries a comment about exactly this class of unrecoverable crash (`webmidi.esm.js:12318-12321`, issue #546).

Not proven: how often Chrome actually produces the miss. Proven: the app has no guard, and the type asserts an invariant the library does not guarantee.

**Fix:**

```ts
interface PortChangeEvent {
	port?: { id?: string; name?: string; type?: MidiPortKind };
}

const forward = (type: 'connected' | 'disconnected') => (event: PortChangeEvent) => {
	const port = event?.port;
	// A port the library could not resolve tells us nothing; dropping it is
	// always better than throwing inside a browser event dispatch.
	if (!port || (port.type !== 'input' && port.type !== 'output') || !port.id) return;
	handler({ type, portKind: port.type, id: port.id, name: port.name ?? '' });
};

namespace.addListener('connected', (onConnected = forward('connected')));
namespace.addListener('disconnected', (onDisconnected = forward('disconnected')));
```

### WR-02: A stale `watchPorts` disposer clobbers a newer registration and strands a live listener forever

**File:** `src/lib/midi/webmidi.ts:146-151`

**Issue:** The disposer nulls `registeredConnected`/`registeredDisconnected` unconditionally, without checking that the pair it is clearing is still the registered pair. Sequence: `watchPorts(A)` registers A; `watchPorts(B)` removes A and registers B; calling A's (now stale) disposer removes A again (no-op) **and sets both module refs to `null`**, erasing the record of B. A subsequent `watchPorts(C)` then has nothing to remove, so B stays attached alongside C — permanent duplicate hot-plug handlers, i.e. the exact accumulation the module's doc comment promises cannot happen. Currently latent because `connectMidi` discards the disposer (`midi.svelte.ts:176-181`) and `watching` gates re-subscription, but the disposer is exported behaviour and `webmidi.test.ts:232-245` calls it.

**Fix:**

```ts
return () => {
	namespace.removeListener('connected', onConnected);
	namespace.removeListener('disconnected', onDisconnected);
	if (registeredConnected === onConnected) registeredConnected = null;
	if (registeredDisconnected === onDisconnected) registeredDisconnected = null;
};
```

Add a test: `const d1 = watchPorts(a); watchPorts(b); d1();` then `watchPorts(c)` must still remove `b`.

### WR-03: The device-reported name is used as a `String.replace` *replacement pattern*, so `$&`, `` $` ``, `$'`, `$$` corrupt the label

**File:** `src/lib/components/MidiStatus.svelte:74-80`

**Issue:** `t(key).replace('{NAME}', displayName(state.deviceName))` passes untrusted external data (a USB descriptor string, per the phase's own threat framing) as `replace`'s *replacement* argument, where `$`-sequences are substitution patterns. Verified in node against the real `midi.status.connected` string:

```
"A$&B"  -> "MIDI: A{NAME}B"
"X$`Y"  -> "MIDI: XMIDI: Y"
"P$'Q"  -> "MIDI: PQ"
"$$"    -> "MIDI: $"
```

Not an XSS vector (Svelte escapes the interpolation, and `midiStatus.test.ts:206-215` proves it), but it is device-controlled data mutating chrome copy in ways no test covers, and the same bug will be inherited by any future call site that substitutes a device name.

**Fix:** use a replacer function, which disables pattern interpretation.

```ts
return t(key).replace('{NAME}', () => displayName(state.deviceName));
```

Add a case to `midiStatus.test.ts` with `deviceName: 'X$&Y'` asserting the literal text renders.

### WR-04: The permission-prompting call is separated from the user gesture by a lazy ~68KB chunk fetch

**File:** `src/lib/midi/webmidi.ts:90-96` via `src/lib/components/MidiStatus.svelte:90-93`

**Issue:** The gesture handler calls `connectMidi()` → `enableMidi()` → `await loadWebMidi()` → **network fetch of a 67.9KB chunk** → only then `mod.enable({ sysex: false })` → `navigator.requestMIDIAccess()`. On a cold cache over a slow link that is seconds of latency between the click and the permission call, well past Chrome's ~5s transient-activation window. Chrome does not currently require user activation for `requestMIDIAccess`, which is why this passes today — but "gesture-gated" is one of this phase's stated hard constraints, and it is currently satisfied only by the browser not enforcing it. There is also no user-visible acknowledgement during the fetch other than the same `enabling` state that later covers the prompt.

**Fix:** warm the module so the click path hits a cached import, keeping the prompt in the same task as the gesture:

```ts
// webmidi.ts
let modPromise: Promise<WebMidiNamespace> | null = null;
function loadWebMidi(): Promise<WebMidiNamespace> {
	modPromise ??= import('webmidi').then((m) => m.WebMidi as unknown as WebMidiNamespace);
	return modPromise;
}
export function prewarmMidi(): void {
	if (midiUnsupportedReason()) return; // never on Safari/iOS
	void loadWebMidi();
}
```

Call `prewarmMidi()` from `initMidi()`'s supported branch (or from the chip's `onpointerdown`), so `enableMidi()`'s `await` resolves from the microtask queue.

### WR-05: The chip's interactive states expose a status as their accessible name, announce nothing, and destroy focus on success

**File:** `src/lib/components/MidiStatus.svelte:96-119`

**Issue:** Three separate accessibility defects on the app's only MIDI affordance:

1. `no-device`, `disconnected`, `denied`, and `error` all render a `<button>` whose entire accessible name is a *status* — "MIDI: NO DEVICE", "MIDI: ERROR", "MIDI: BLOCKED". Nothing conveys that activating it retries the connection (WCAG 2.4.6 / 4.1.2). Only the `idle` state's "CONNECT MIDI" reads as an action.
2. No live region anywhere. `enabling → connected`/`denied`/`error` changes silently; a screen-reader user who taps gets no confirmation or failure notice. The codebase has an established convention for exactly this (`UpdatePrompt.svelte:17` uses `role="status"`; ten other components use `aria-live="polite"`), and this chip skips it. `aria-busy` is also absent while `enabling`.
3. Focus is destroyed on success. The activated button becomes `disabled` (focus removed by the UA), then the whole element is replaced by a `<span>` on `connected`. A keyboard user lands back on `<body>` and must re-traverse the masthead.

**Fix:** keep the element type stable, name the action, and announce the state.

```svelte
{#if state.kind !== 'unsupported'}
	<span class="midi-status-live" role="status" aria-live="polite">{label()}</span>
	{#if state.kind !== 'connected'}
		<button
			type="button"
			aria-label={t(state.kind === 'idle' ? 'midi.aria.connect' : 'midi.aria.retry')}
			aria-busy={isEnabling}
			disabled={isEnabling}
			onclick={handleClick}>{label()}</button
		>
	{/if}
{/if}
```

(Or render one persistent `<button>` for every state, disabled only while `enabling`, with the visible label unchanged and the status text in a sibling live region.) Add `midi.aria.connect` / `midi.aria.retry` to both locales.

### WR-06: `denied` is a dead-end affordance that re-prompts nothing and offers no recovery path

**File:** `src/lib/midi/midi.svelte.ts:157-174`, `src/lib/components/MidiStatus.svelte:106-118`

**Issue:** Once the user blocks MIDI, the chip renders a clickable "MIDI: BLOCKED" button. Each tap re-runs `enableMidi()`; since `WebMidi.enabled` is false the library re-calls `navigator.requestMIDIAccess()` (`webmidi.esm.js:11870-11874` only short-circuits when already enabled), Chrome auto-rejects a persistently blocked permission with no prompt, and the state lands back on `denied`. The control therefore looks actionable, does nothing observable, and never tells the user the fix lives in site settings. Compare `MicCheckPanel.svelte`, which this phase repeatedly cites as its model for permission handling and which does explain its unavailable states.

**Fix:** distinguish "blocked, ask the OS/browser" from "retryable". Detect the persistent block and render non-interactive copy plus guidance:

```ts
const status = await navigator.permissions?.query({ name: 'midi' as PermissionName }).catch(() => null);
if (status?.state === 'denied') return { ok: false, reason: 'permission-denied' }; // no re-prompt
```

and add a `midi.status.deniedHelp` string ("Allow MIDI in your browser's site settings.") rendered next to or as the title of the blocked chip.

### WR-07: The service worker precaches the webmidi chunk on every device, contradicting the module's own stated benefit

**File:** `src/lib/midi/webmidi.ts:8-14` (the claim) vs `src/lib/pwa/precache.ts:27-33` + `src/service-worker.ts:20-30` (the behaviour)

**Issue:** The header comment asserts the library "stays out of the initial client bundle for the many browsers that will never use it." Half of that is true (no `modulepreload`, dynamic chunk — verified). The other half is false: `installPrecacheList(build, files, prerendered)` includes **every** hashed build chunk, and `cache.addAll(PRECACHE)` runs at SW install on every platform that supports service workers — including Safari/iOS, which can never use Web MIDI. Verified: `grep -o "BxoT61B_" build/service-worker.js` matches, so the 67.9KB chunk is downloaded eagerly by exactly the browsers the comment says are spared. Phase 38's "strict progressive enhancement" framing is what makes this a correctness-of-contract issue rather than a perf note.

**Fix:** either exclude the chunk from install-time precache and let it runtime-cache on first use (mirroring the Salamander-samples precedent already in `precache.ts`), or delete the false half of the claim. A minimal exclusion needs a stable marker, e.g. a named chunk via `build.rollupOptions.output.manualChunks` (`webmidi` → `webmidi-lib`) plus `files.filter(...)`-style filtering on that name in `installPrecacheList`.

### WR-08: The "navigating away during a connect attempt" e2e test cannot exercise what it claims, and the suite grants `midi-sysex`

**File:** `tests/e2e/midi.spec.ts:18, 66-81`

**Issue:** Two problems in one spec.

1. The test's comment says it is "the real-browser counterpart of midi.svelte.ts's stale-promise `intent` guard". `page.goto('/learn')` is a full document navigation: it tears down the JS realm, so the module-scope `state`/`intent` and the pending `enableMidi()` promise are destroyed rather than raced. The `pageerror` listener then only sees the *new* document. The test passes regardless of whether the `intent` guard exists at all — delete lines 167 and 172 of `midi.svelte.ts` and it still passes. It is a smoke test for "clicking the chip then navigating does not explode", which is fine, but the comment overstates it and the guard has no real coverage.
2. `test.use({ permissions: ['midi', 'midi-sysex'] })` grants system-exclusive access to every test in the file. The phase's T-38-01 mitigation ("never request sysex") is therefore only verified against a fake namespace in `webmidi.test.ts:111-117`; if the production code regressed to `enable({ sysex: true })`, the real-browser suite would stay green. Pre-granting both also means the `denied` path is never exercised in a real browser.

**Fix:** use client-side navigation so the module survives, and assert the observable guarantee:

```ts
await page.getByTestId('midi-status').click();
await page.getByRole('link', { name: 'Learn' }).click();          // SvelteKit router, realm preserved
await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();
await expect.poll(() => page.getByTestId('midi-status').getAttribute('data-midi-state'))
	.not.toBe('enabling');                                         // never stuck
expect(pageErrors).toEqual([]);
```

and drop `'midi-sysex'` from `test.use`, adding a spec that stubs `navigator.requestMIDIAccess` in an init script to record its options and asserts `sysex !== true`.

### WR-09: The MIDI-04 masthead test passes vacuously — it has no positive control

**File:** `tests/masthead.e2e.test.ts:64-74`

**Issue:** The test renders the layout in jsdom and asserts no `midi-status` element. But the module's initial state is *already* `{ kind: 'unsupported' }` (`midi.svelte.ts:86`), so the assertion holds even if `initMidi()` were deleted, if `midiUnsupportedReason()` always returned `null`, or if the whole feature-detect branch were inverted. It proves the default, not the detection. The same weakness applies to `midiStatus.test.ts:34-43`.

**Fix:** add the negative case as the discriminator in the same file:

```ts
it('renders the chip once navigator.requestMIDIAccess exists (positive control for MIDI-04)', () => {
	Object.defineProperty(navigator, 'requestMIDIAccess', {
		value: () => Promise.resolve({}),
		configurable: true
	});
	render(RootLayout, { params: {}, data: {}, children: emptyChildren });
	expect(screen.getByTestId('midi-status')).toBeInTheDocument();
	Reflect.deleteProperty(navigator, 'requestMIDIAccess');
});
```

(Requires resetting the module's `initialized`/`state` between the two cases, e.g. via `vi.resetModules()` + dynamic import as `midi.test.ts` already does.)

### WR-10: The new masthead chip is the only chip in the masthead with no contrast or geometry assertion

**File:** `src/lib/components/MidiStatus.svelte:125-134`; gap in `tests/e2e/contrast.spec.ts`

**Issue:** `contrast.spec.ts` exists because a `--color-muted`-on-paper masthead chip shipped below WCAG AA and survived five rounds of manual visual UAT (its own header comment says so). `MidiStatus` introduces a *new* `--color-muted`-on-paper masthead chip, at `text-label` size, plus a `2px solid var(--color-ink)` border and an 18ch `max-width` with ellipsis — and adds no assertion to that suite while the streak chip, the due badge, and the active nav tab all have one. It measures fine today (muted `#716856` on paper clears 4.5:1), so this is a missing regression guard on a surface with a documented prior failure, not a live defect.

**Fix:** add to `contrast.spec.ts`, mirroring the streak-chip test:

```ts
test('the masthead MIDI chip meets WCAG AA', async ({ page }) => {
	await page.goto('/');
	const chip = page.getByTestId('midi-status');
	await expect(chip).toBeVisible();
	const sample = await measureContrast(chip);
	expect(sample.ratio).toBeGreaterThanOrEqual(sample.threshold);
});
```

and a tap-target assertion that the chip clears 44x44 at `PHONE_NARROW` (its `min-height: 44px` covers height only; width is content-driven).

## Info

### IN-01: Unreachable `case 'unsupported'` in `statusKey`

**File:** `src/lib/components/MidiStatus.svelte:60-64`
**Issue:** The template's `{#if state.kind !== 'unsupported'}` guarantees `statusKey` is never called with `'unsupported'`, so that case (and the `default`) is dead. `chrome.ts:22-25` documents that the unsupported state "needs no string here", which contradicts mapping it to `midi.status.error`.
**Fix:** drop the `'unsupported'` case and keep only `default` (or narrow the parameter to `Exclude<MidiConnectionState['kind'], 'unsupported'>` so the compiler enforces the invariant).

### IN-02: Exports and type variants with no non-test consumer

**File:** `src/lib/midi/webmidi.ts:17, 63-65, 74-81, 98-102`
**Issue:** Verified by grep across `src/` and `tests/`: `isMidiSupported()` and `mapEnableError()` are referenced only from `webmidi.test.ts`; `MidiUnsupportedReason`'s `'no-window'` variant is unobservable because `enableMidi` collapses both reasons to `'unsupported'` (line 92); `MidiInputInfo.manufacturer` is collected from the device and never read anywhere. (`activeInput` / `connectedDeviceId` are also test-only but are the contractually required Phase 39 seam — correct as-is.)
**Fix:** make `mapEnableError` module-private and test it through `enableMidi`; either drop `isMidiSupported()` or use it; either surface the `no-window`/`unsupported` distinction or collapse the union to one value; drop `manufacturer` until something displays it (one less device field read, consistent with the phase's fingerprint-minimisation posture).

### IN-03: The `intent` counter is unreachable, and its comment misdescribes what it guards

**File:** `src/lib/midi/midi.svelte.ts:139-142, 167, 172`
**Issue:** `intent` can only differ from `mine` if a second `connectMidi()` starts while a first is in flight, which the `state.kind === 'enabling' || 'connected'` guard on line 165 prevents. The only reachable route is external misuse of the exported `setMidiState`. The comment says it stops a promise resolving "after the user moved on" — navigation does not cancel it (see WR-08) and remounting does not reset it.
**Fix:** keep the guard (cheap insurance for the exported seam) but correct the comment to say what it actually defends: an out-of-band `setMidiState` call moving the state off `enabling` mid-flight.

### IN-04: `slice(0, 24)` cuts UTF-16 code units, so an emoji/CJK device name can render U+FFFD

**File:** `src/lib/components/MidiStatus.svelte:68-72`
**Issue:** Device descriptors are vendor-controlled and not guaranteed ASCII; slicing at a code-unit boundary can split a surrogate pair (rendering as a replacement character) or a combining sequence, and can leave a trailing space before the CSS ellipsis.
**Fix:** `return [...trimmed].slice(0, MAX_NAME_CHARS).join('').trimEnd();`

### IN-05: `mapEnableError`'s substring heuristic is vendor/locale fragile, and one branch is redundant

**File:** `src/lib/midi/webmidi.ts:74-81`
**Issue:** `message.toLowerCase().includes('permission')` only matches English messages, so a localized Chrome/Firefox refusal falls through to `'unknown'` and the user sees "MIDI: ERROR" instead of "MIDI: BLOCKED". Also `err instanceof DOMException ? err.name : err instanceof Error ? err.name : ''` collapses to a single `typeof (err as { name?: unknown })?.name === 'string'` check.
**Fix:** rely on `name` alone (the spec-defined signal, confirmed to reach this code unwrapped: `webmidi.esm.js:11939-11943` rejects with the original `DOMException`), and treat the message heuristic as a last resort behind a comment that says it is best-effort English-only.

### IN-06: Floating promise in the click handler

**File:** `src/lib/components/MidiStatus.svelte:90-93`
**Issue:** `connectMidi()` is async and its result is dropped with no `void` marker and no `.catch()`. It swallows `enableMidi()` failures internally, but `watchPorts` (and the library's `addListener`) are called outside any try/catch, so a throw there becomes an unhandled rejection.
**Fix:** `void connectMidi().catch(() => setMidiState({ kind: 'error' }));` — or wrap the `watchPorts` call in `connectMidi` in a try/catch so the function genuinely cannot reject.

### IN-07: Duplicated listener bodies in `watchPorts`

**File:** `src/lib/midi/webmidi.ts:124-139`
**Issue:** `onConnected` and `onDisconnected` are byte-identical apart from the literal `type`. Duplication is what would let the WR-01 guard get added to one branch and not the other.
**Fix:** one factory (`const forward = (type) => (event) => handler({ ... })`), as shown in WR-01's fix.

---

_Reviewed: 2026-08-04T23:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
