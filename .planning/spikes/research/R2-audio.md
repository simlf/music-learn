# R2: Sampled Piano Audio — Research Findings

**Date:** 2026-07-14
**Status:** COMPLETE
**Question:** How to give the app a realistic sampled piano sound (key touch, drill answer reveal, chord playback) given tone@15.1.22 is already installed?

---

## TL;DR / RECOMMENDED APPROACH

**Do NOT use @tonejs/piano.** It is verified incompatible with tone@15 (hard ERESOLVE peer conflict, unmaintained since 2020, and its webmidi 2.x peer would also conflict with the webmidi 3.x planned for the MIDI phase).

**Use `Tone.Sampler` (already in tone@15) with the Salamander Grand Piano mp3 set self-hosted in `/static/samples/salamander/`.** 30 files, **1.9 MB total**, minor-third spacing across A0–C8, single velocity layer, CC-BY 3.0. Lazy-load on first user gesture; the existing `PolySynth` plays as fallback until samples finish loading, then the sampled piano swaps in transparently. Wrap everything in a small `src/lib/audio/audio.ts` module with a mockable engine seam for Vitest/jsdom.

> Note: the spike MANIFEST locked "sampled real piano (@tonejs/piano, Salamander samples)". The *sound requirement* (Salamander sampled piano) is fully preserved; only the delivery library changes, with the evidence below. Flag this deviation to the architect.

---

## 1. @tonejs/piano@0.2.1 compatibility — VERIFIED BROKEN

Experiment run in `/private/tmp/claude-506/.../scratchpad/piano-compat` (throwaway dir, npm 2026-07-14):

```
npm install tone@15.1.22 @tonejs/piano@0.2.1
npm error code ERESOLVE
npm error peer tone@"^14.6.1" from @tonejs/piano@0.2.1
```

Facts from the npm registry (`registry.npmjs.org/@tonejs/piano/latest`):

- `peerDependencies: { "tone": "^14.6.1", "webmidi": "^2.5.1" }`. Both conflict with this project: tone is pinned at 15.1.22, and the roadmap's MIDI phase plans webmidi 3.1.x.
- Last published **May 2020** (built with TypeScript 3.8, tslib 1.x, webpack 4). Repo `tambien/Piano` is effectively unmaintained.
- Even force-installed with `--legacy-peer-deps`, its build uses extensionless ESM imports (`./piano/Piano` without `.js`), a pre-modern-ESM build artifact. A Node import smoke test fails outright (`Cannot find module .../build/piano/Piano`). Vite would paper over that particular issue, but runtime behavior against the tone 15 API surface is unverified by anyone and the package will never be updated.
- Its main feature over `Tone.Sampler` is multi-velocity-layer realism (up to 16 layers), which multiplies the sample payload into tens of MB. Not worth it for a theory-learning app.

**Verdict: disqualified.** No patching/forking; the alternative below is less code, zero new dependencies, and the same underlying samples.

## 2. Alternatives evaluated

| Option | Works with tone@15? | Payload | Notes |
|---|---|---|---|
| **`Tone.Sampler` + self-hosted Salamander mp3s** (RECOMMENDED) | Yes, built in. Verified `Sampler` API in installed `node_modules/tone/build/esm/instrument/Sampler.d.ts`: `urls`, `baseUrl`, `attack`, `release`, `curve`, `onload`, `onerror`; `triggerAttack(notes, time?, velocity?)`, `triggerRelease`, `releaseAll`, `.loaded` | 1.9 MB (30 files) | Sampler auto-repitches between provided samples, so minor-third spacing covers all 88 keys. Single velocity layer; `velocity` arg scales gain (fine pedagogically). Zero new npm dependencies. |
| `smplr@1.0.0` (`SplendidGrandPiano`) | N/A (Tone-independent, zero deps, MIT) | Larger (4 velocity layers), loads from `smpldsnds.github.io` CDN by default; `baseUrl`/`storage` overridable for self-hosting | Good library, but it owns its own `AudioContext`. The app already standardizes on Tone (existing synth fallback, one autoplay-unlock path, one output chain for future effects). Two audio stacks = two unlock flows and no shared graph. Keep as fallback plan only. |
| `tonejs-instruments` sample pack | Sample set works with any Sampler | varies | Community pack, also old; its piano is lower quality than Salamander. No reason to prefer it. |
| Patched fork of @tonejs/piano | Unknown | tens of MB | Maintenance burden for marginal realism gain. Rejected. |

## 3. Samples: exact files, payload, hosting, license

Source: the Tone.js-maintained mp3 conversion of Salamander, currently served at `https://tonejs.github.io/audio/salamander/`. Download once into the repo (script below), never hotlink (the app must work self-hosted on the Oracle box, offline from any CDN).

**Exact file list (30 files, `s` means sharp, i.e. `Ds1.mp3` = D#1):**

```
A0  C1 Ds1 Fs1 A1  C2 Ds2 Fs2 A2  C3 Ds3 Fs3 A3  C4 Ds4 Fs4 A4
C5 Ds5 Fs5 A5  C6 Ds6 Fs6 A6  C7 Ds7 Fs7 A7  C8        (.mp3 each)
```

Measured sizes (HTTP HEAD, 2026-07-14): individual files 19–121 KB; **full 30-file set = 2,012,677 bytes ≈ 1.9 MB**. A trimmed C2–C6 subset (17 files) is 1.2 MB; the 0.7 MB saved is not worth losing full-range coverage (future scale lessons, 88-key MIDI echo), so **ship all 30**.

**Hosting:** `static/samples/salamander/*.mp3` → served at `/samples/salamander/` by adapter-static, straight through the existing docker compose deploy. Standard HTTP caching applies; if a service worker is added later for the PWA (manifest exists, no SW yet), add the folder to the precache list.

**Download script (run once, commit the files):**

```bash
mkdir -p static/samples/salamander && cd static/samples/salamander
for f in A0 C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 \
         C5 Ds5 Fs5 A5 C6 Ds6 Fs6 A6 C7 Ds7 Fs7 A7 C8; do
  curl -sO "https://tonejs.github.io/audio/salamander/${f}.mp3"
done
```

**License:** Salamander Grand Piano v3 by Alexander Holm, **Creative Commons Attribution 3.0 Unported (CC-BY 3.0)** (confirmed via sfzinstruments/SalamanderGrandPiano and archive.org listing). Obligations: attribution. Do both of:
- `static/samples/salamander/LICENSE.txt` with: "Salamander Grand Piano v3 by Alexander Holm, CC-BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Mp3 conversion from the Tone.js project."
- A credit line in the app's about/settings surface.

## 4. iOS/Safari: AudioContext unlock + pre-load behavior

- All WebKit (and Chromium) browsers require a user gesture before an `AudioContext` can produce sound. `Tone.start()` resumes the shared context and must be called inside a gesture handler. The existing `playChord.ts` already does `await Tone.start()` per call; keep that pattern, centralized in `ensureAudioReady()`.
- **Recommended graceful-degradation policy: synth fallback, not silence.** The `PolySynth` path already exists and needs no samples. On the very first sound-producing gesture: call `Tone.start()`, kick off `Sampler` creation + sample fetch (non-blocking), and play the requested note/chord on the synth immediately. Every subsequent call checks `sampler?.loaded === true` and transparently uses the sampled piano. On a good connection the swap happens within a couple of seconds; the user never waits and never taps a dead key. Optionally warm the sample fetch on app idle (e.g. `requestIdleCallback` after hydration) so the first *gesture* often already finds samples cached; creating/loading the Sampler does NOT require an unlocked context, only *playback* does, so prefetch before any gesture is safe.
- A tiny loading indicator is optional polish, not required, because the synth fills the gap.

## 5. Latency, velocity, release, drag-spam hygiene

- **lookAhead trap (important):** tone@15's context default is `lookAhead: 0.1` (verified in installed `node_modules/tone/build/esm/core/context/Context.js`, line ~80). That is a built-in 100 ms scheduling delay on every `triggerAttack` called without an explicit time, which feels mushy for key touches. Fix at engine init: `Tone.getContext().lookAhead = 0;` (the app never uses Transport-scheduled music, so there is no downside). With lookAhead 0 plus `latencyHint: "interactive"` (the default), touch-to-sound is limited only by hardware output latency.
- **Key touch semantics:** on `pointerdown` call `noteOn(note, velocity)` (`sampler.triggerAttack`), on `pointerup`/`pointercancel`/`pointerleave` call `noteOff(note)` (`sampler.triggerRelease`). This gives natural piano-like sustain while held. Configure `release: 0.8` on the Sampler (the sample's tail fades ~0.8 s after release; Tone's own docs example uses `release: 1`).
- **Velocity:** on-screen keys have no true velocity; use a fixed musical default `velocity: 0.75` for key touches and `0.85` for answer-reveal chords. `triggerAttack` velocity is `NormalRange` 0–1 and scales gain only (single velocity layer set).
- **Drag/spam guards** (keyboard component level, not audio module level):
  1. Trigger a note only on *key change* while dragging (track `lastPointerKey`; entering the same key twice in a row does nothing).
  2. Per-note retrigger guard of ~50 ms (ignore a re-attack of the same note within the window).
  3. On `pointerup`/`pointercancel` anywhere, release the held note; call `releaseAll()` on component destroy.
  4. Soft voice cap: `Tone.Sampler` has no `maxPolyphony` (that is `PolySynth`); keep a count of active attacks and, above ~16, `triggerRelease` the oldest before attacking. In practice the drag guards make hitting the cap nearly impossible.
- **Answer reveal / chord playback:** keep the existing block-chord `triggerAttackRelease(pitches, "2n")` shape, reusing the ascending-octave voicing logic already in `playChord.ts` (`toAscendingPitches`). That logic is pure; extract it to `src/lib/audio/voicing.ts` so it stays directly unit-testable with zero mocking.

## 6. Proposed module contract: `src/lib/audio/audio.ts`

Design goals: one entry point for all app sound; tone is **dynamically imported** (code-split, keeps it out of the initial bundle and out of jsdom's way); sampled piano swaps in transparently; the whole surface is mockable in Vitest.

```ts
// src/lib/audio/types.ts (no tone import: safe everywhere, incl. tests)
export type InstrumentKind = 'sampled' | 'synth';
export type AudioState = 'idle' | 'synth-only' | 'loading-samples' | 'sampled';

export interface NoteOptions {
  velocity?: number;       // 0..1, default 0.75
  duration?: string;       // Tone time, e.g. '8n'; omit = attack/release mode
}

export interface AudioEngine {
  ensureReady(): Promise<void>;              // Tone.start() + begin sample load (idempotent)
  playNote(note: string, opts?: NoteOptions): void;   // one-shot (tap)
  noteOn(note: string, velocity?: number): void;      // held key
  noteOff(note: string): void;
  playChord(notes: string[], opts?: NoteOptions): void; // spelled letters, e.g. ['C','E♭','G','B♭']
  releaseAll(): void;
  setInstrument(kind: InstrumentKind): void;  // user preference override
  readonly state: AudioState;
}
```

```ts
// src/lib/audio/audio.ts (sketch)
import type { AudioEngine, NoteOptions } from './types';
import { toAscendingPitches } from './voicing'; // pure, extracted from playChord.ts

const SALAMANDER_URLS = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3', C8: 'C8.mp3'
};

let tone: typeof import('tone') | null = null;
let synth: import('tone').PolySynth | null = null;
let sampler: import('tone').Sampler | null = null;
let state: AudioEngine['state'] = 'idle';
let preferred: 'sampled' | 'synth' = 'sampled';

async function loadTone() {
  if (!tone) {
    tone = await import('tone');               // code-split: tone never in initial bundle
    tone.getContext().lookAhead = 0;            // kill the 100ms scheduling delay
    synth = new tone.PolySynth(tone.Synth).toDestination();
  }
  return tone;
}

async function ensureReady(): Promise<void> {
  const t = await loadTone();
  await t.start();                              // no-op after first unlock
  if (!sampler && preferred === 'sampled') {
    state = 'loading-samples';
    sampler = new t.Sampler({
      urls: SALAMANDER_URLS,
      baseUrl: '/samples/salamander/',
      release: 0.8,
      onload: () => { state = 'sampled'; },
      onerror: () => { state = 'synth-only'; sampler = null; } // e.g. offline: stay on synth
    }).toDestination();
  }
}

function voice() {                              // transparent swap
  return preferred === 'sampled' && sampler?.loaded ? sampler! : synth!;
}

function playChord(notes: string[], opts: NoteOptions = {}): void {
  void ensureReady().then(() => {
    voice().triggerAttackRelease(toAscendingPitches(notes), opts.duration ?? '2n',
      undefined, opts.velocity ?? 0.85);
  });
}
// noteOn/noteOff/playNote analogous; module default-exports a singleton
// `audio: AudioEngine`, plus `_resetForTests()` clearing module state.
```

**Testability (Vitest + jsdom, no real AudioContext):**
- Components never import tone; they import `$lib/audio/audio` only. Component tests do `vi.mock('$lib/audio/audio', () => ({ audio: fakeEngine }))` and assert calls (e.g. answer reveal ALWAYS invokes `playChord`).
- Because tone is behind `await import('tone')` inside functions, merely importing `audio.ts` in jsdom constructs nothing; the module is import-safe.
- Pure logic (voicing math, url map completeness, glyph→ASCII conversion) lives in `voicing.ts` and is tested directly, as today.
- Migration: existing `playChord.ts` becomes a thin re-export of `audio.playChord` (2 call sites: `src/routes/+page.svelte`, `src/routes/showcase/+page.svelte`), or the call sites move to the new module and `playChord.ts` is deleted.

## 7. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | @tonejs/piano silently pulled in by a builder following the MANIFEST wording; breaks `npm install` | This document; MANIFEST deviation flagged. Nothing new to install: tone@15's Sampler is already present. |
| 2 | 1.9 MB sample download on slow mobile network delays realistic sound | Synth fallback is instant and musical; samples swap in when ready. Idle prefetch after hydration hides most of it. HTTP caching (and future SW precache) makes it one-time. |
| 3 | iOS/Safari autoplay lock: first tap produces nothing | Every public play call goes through `ensureReady()` which awaits `Tone.start()` inside the gesture's call stack. Already the proven pattern in current `playChord.ts`. |
| 4 | 100 ms mushy latency on key touch (tone default lookAhead 0.1 s) | `Tone.getContext().lookAhead = 0` at engine init. Verified default in installed tone@15 source. |
| 5 | Audio spam when dragging across keys / multi-touch chaos | Trigger only on key change, 50 ms same-note retrigger guard, release on pointerup/cancel, soft 16-voice cap with oldest-release, `releaseAll()` on destroy. |
| 6 | jsdom tests crash on AudioContext | tone only ever loaded via dynamic import inside functions; components mock the `AudioEngine` interface; pure voicing logic isolated. |
| 7 | CC-BY attribution obligation forgotten | LICENSE.txt committed next to samples + visible credit in app about/settings. |
| 8 | Sample fetch fails (offline PWA, server misconfig) | `onerror` drops to permanent `synth-only` state for the session; app remains fully functional. |
| 9 | Enharmonic glyphs (`B♭`, `F♯`) reaching Tone | Keep the existing `♯/♭ → #/b` normalization (now in `voicing.ts`); tonal + Tone both accept ASCII accidentals; Sampler repitches anything not in the url map. |

## Sources

- Local experiment: `npm install tone@15.1.22 @tonejs/piano@0.2.1` → ERESOLVE (2026-07-14, scratchpad `piano-compat/`); `--legacy-peer-deps` install + Node import smoke test → module-resolution failure in its 2020-era build.
- npm registry `@tonejs/piano@0.2.1` metadata: peers `tone ^14.6.1`, `webmidi ^2.5.1`; published May 2020. https://www.npmjs.com/package/@tonejs/piano
- Installed tone@15.1.22 source: `node_modules/tone/build/esm/instrument/Sampler.d.ts` (API), `core/context/Context.js` (`lookAhead: 0.1` default).
- Sample sizes: HTTP HEAD against `https://tonejs.github.io/audio/salamander/*.mp3`, 30 files totaling 2,012,677 bytes (2026-07-14).
- Salamander license: https://github.com/sfzinstruments/SalamanderGrandPiano and https://archive.org/details/SalamanderGrandPianoV3 (Alexander Holm, CC-BY 3.0).
- smplr: https://github.com/danigb/smplr (v1.0.0, MIT, zero deps, own AudioContext, `baseUrl`/`storage` overridable, SplendidGrandPiano 4 velocity layers).
