<!-- GSD:project-start source:PROJECT.md -->

## Project

**Music Learn — Jazz Piano Theory Companion**

A personal web app that teaches jazz piano theory to a returning classical pianist. It combines interactive drills (answerable on a connected MIDI piano or an on-screen keyboard), readable theory lessons, and a practice companion for decoding chord symbols found in real sheet music. Built for a single user: someone who can play Beethoven's Moonlight Sonata (1st movement) and sight-read, but whose music theory is beginner-level.

**Core Value:** Chord symbol fluency: see a jazz chord symbol like `Cm7` or `F♯ø7` in sheet music and know instantly what notes to play with the left hand — without stopping to think.

### Constraints

- **Audience**: Single user (the builder) — no need for accounts, billing, or multi-tenancy complexity
- **Hardware**: Must support Web MIDI (Chrome-family browsers) for piano input, with a full non-MIDI fallback
- **Deployment**: Deployed website reachable from multiple devices — hosting should be simple and cheap/free
- **Scope discipline**: v1 centered on chord symbol fluency; scales and deeper theory support it but don't dilute it

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SvelteKit | 2.69.x (Svelte 5.56.x) | App framework, routing, static build | This is a small, mostly-client single-user app with no real backend needs. SvelteKit's compiler-based reactivity ships far less JS than Next.js/React for the same UI (roughly 15–40KB vs 70–130KB baseline), which matters for a quick-start habit-forming drill app opened on a phone between piano sessions. `adapter-static` produces a fully static build deployable anywhere for free. Svelte 5 runes give clean reactive state for drill/session logic without a separate state library. |
| TypeScript | ^6.0 (NOT 7.0 yet) | Type safety across theory engine, MIDI handling, persistence schemas | TypeScript 7.0 hit GA on 2026-07-08 (native Go compiler, ~10x faster builds) but ships without a stable programmatic API and Svelte's tooling (svelte-check, language server) only has experimental/preview support via tsgo as of this research. Pin to the TS 6.x line to avoid editor/type-check breakage; revisit 7.x once SvelteKit/svelte-check officially support it (tracked for TS 7.1 ecosystem catch-up). |
| Vite | 8.x (bundled via SvelteKit) | Dev server, build tool | Comes for free with SvelteKit; no separate decision needed. |
| tonal | 6.4.3 | Music theory computation: chord spelling/parsing, scale notes, intervals, enharmonics | Purpose-built for exactly this problem. `Chord.get("Cm7")` / `Chord.get("F#ø7")` returns tonic, intervals, notes, and aliases; its chord-type dictionary already includes jazz aliases (`Δ`, `ma7`, `m7b5`, `ø`, `°`, `sus4`, altered dominants, etc.), which is the core parsing need for "decode a chord symbol from sheet music." `Scale.get("C major").notes` handles scale drills. Pure functions, no DOM/audio coupling, tree-shakeable (use scoped imports like `import { Chord, Scale, Note } from "tonal"` or the `@tonaljs/*` subpackages to keep bundle small). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WebMidi.js (`webmidi`) | 3.1.16 | Wraps the raw Web MIDI API with a friendlier event model (`noteon`/`noteoff`, per-input listeners, channel handling) | Use instead of raw `navigator.requestMIDIAccess()` boilerplate. Needed for the "answer a drill by playing on the connected piano" feature — simplifies note-on/note-off tracking and multi-note (chord) detection into a held-notes set. Raw Web MIDI API is simple enough that hand-rolling is *viable*, but WebMidi.js removes edge-case handling (device hot-plug, sustain-pedal messages, note velocity) for minimal cost (~small lib, tree-shakeable). |
| Tone.js (`tone`) | 15.1.22 | Web Audio playback of notes/chords for feedback/reference sound | Only needed if the "optional audio playback" requirement is built. `Tone.Synth` is enough for simple note/chord playback (`triggerAttackRelease`); no need for realistic piano samples for a theory-drill feedback sound. |
| `@tonejs/piano` | 0.2.1 | Realistic multi-sampled piano sound (Salamander Grand Piano samples) built on Tone.js | Only if the on-screen keyboard should sound like a real piano rather than a synth blip (e.g., for scale-lesson playback or "hear what this chord sounds like"). Adds sample-loading complexity and network payload (samples are lazy-loaded, not bundled) — skip for v1 unless audio realism is explicitly valued; a plain `Tone.Synth` fallback is enough for correctness-feedback beeps. |
| Dexie.js (`dexie`) | 4.4.4 | IndexedDB wrapper for local persistence (drill history, spaced-repetition state, streaks) | Single-user, no backend: persistence lives in the browser. IndexedDB (via Dexie) is the right layer because `localStorage`'s ~5-10MB cap and synchronous string-only API don't fit growing review-log data; Dexie adds schema versioning, indexed queries (e.g., "cards due today"), and a promise-based API with minimal boilerplate. Use `dexie-react-hooks`-equivalent (`dexie`'s own `liveQuery`, framework-agnostic) to reactively bind Svelte components to query results. |
| ts-fsrs | 5.4.1 | Spaced-repetition scheduling (FSRS algorithm) | Directly satisfies the "smart practice" requirement — tracks per-card (per-chord/per-scale) review state and computes next-due date from a pass/fail (or graded) rating. FSRS is the modern replacement for legacy SM-2 (used by old Anki); it's the current state-of-the-art open scheduler, actively maintained by the same team that ports it into Anki itself. Requires Node >=20 (matches any 2026 toolchain). |
| Zod | 4.4.3 | Runtime schema validation for persisted data and drill definitions | Validates chord/scale drill data and Dexie-stored records at the boundary (e.g., migrating schema versions, guarding against malformed IndexedDB records after a code change). Optional but cheap insurance for a long-lived local database that will outlive several app versions. |
| svg-piano | latest (check npm at build time) | Static/lightweight SVG piano keyboard rendering primitives | Lower-level alternative to `react-piano` if going the "roll your own" route — dependency-free, gives raw SVG key-shape data to render and style yourself. Only relevant if not using React; since this stack is Svelte-based, plan to **build a custom on-screen keyboard component** using piano key-layout math (an octave = 12 keys, white/black key positions) rather than pulling in a React-only component — see "What NOT to Use" below. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | 4.1.x | Unit tests for the theory engine (chord parsing, scale generation, FSRS scheduling logic) | Ships integrated with Vite/SvelteKit; test the pure `tonal`/`ts-fsrs` wrapper logic in isolation from UI. |
| Tailwind CSS | 4.3.x | Utility CSS for drill UI, keyboard styling, lesson pages | Optional but speeds up building a clean, responsive (phone + laptop) UI without a component library; Tailwind v4's CSS-first config works cleanly with SvelteKit. |
| ESLint + Prettier | current | Code quality/formatting | Standard; use `eslint-plugin-svelte` for Svelte-aware linting. |

## Installation

# Scaffold

# Core

# Optional audio playback

# npm install @tonejs/piano   # only if realistic piano samples are wanted

# Styling (optional)

# Pin TypeScript to 6.x explicitly (avoid npm resolving to 7.0 latest)

# Dev/test

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| SvelteKit | Next.js (React) | If you already know React well and want the larger ecosystem/component-library selection (e.g., off-the-shelf `react-piano`), or plan to eventually add contributors familiar with React. Next.js is a fine choice too — the app's needs are light enough that framework choice is more about developer familiarity than technical necessity. |
| SvelteKit | Astro | If the app were mostly static content (lessons) with light interactivity. Rejected here because drills/MIDI input/spaced-repetition state are the core of the app — heavily interactive, not content-first — so Astro's island-based model adds friction rather than removing it. |
| Custom SVG/CSS piano component | `react-piano` (npm) | If building in React instead of Svelte. `react-piano` is a solid, actively-used interactive keyboard component (click/touch/keyboard-key events, customizable styling) but is React-specific and not usable in a Svelte app. |
| WebMidi.js | Raw `navigator.requestMIDIAccess()` | If you want zero dependencies and are comfortable hand-rolling note-on/off state tracking and device selection UI. Reasonable for a very small MVP, but WebMidi.js's event model saves real time once you need held-note (chord) tracking and multi-device handling. |
| Tone.js `Synth` | `@tonejs/piano` (sampled piano) | Use sampled piano only when audio realism matters (e.g., an ear-training feature later); for v1 correctness-feedback sounds, a synth is simpler and has zero sample-loading latency. |
| Dexie.js | Raw `indexedDB` API | Never for this project — raw IndexedDB's callback-based API is high-boilerplate for no benefit at this scale. |
| Dexie.js | `localForage` | If you want a simpler key-value API and don't need indexed queries (e.g., "all cards due before date X"). Since spaced repetition needs to query by due-date and by mastery-weakness, Dexie's real querying capability is worth the slightly larger API surface. |
| ts-fsrs | Hand-rolled SM-2 | Never recommended — SM-2 is the legacy algorithm old Anki used; FSRS is strictly more data-efficient and is now the default even in modern Anki. No reason to reimplement worse math. |
| Cloudflare Pages | Vercel / Netlify | Netlify or Vercel are fine if you want their specific DX conveniences (preview deploys, edge functions) — but this app needs neither serverless functions nor a backend, so their extra surface area (and lower default bandwidth ceilings) isn't needed. Vercel is a reasonable pick if you're also comfortable there and may add small serverless routes later. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `react-piano` / any React-only piano component in a Svelte app | Hard framework mismatch — would require pulling in a full React runtime just for one widget, defeating the point of choosing a lighter framework. | Build a small custom `PianoKeyboard.svelte` component: layout math is simple (white keys evenly spaced, black keys offset per the standard C-D-E-F-G-A-B pattern), styled with CSS/Tailwind, wired to both click/touch events and MIDI note-on/off state. |
| TypeScript 7.0 (`latest` on npm) today | Ships without a stable programmatic API; SvelteKit/svelte-check/editor tooling only has experimental tsgo-based support as of July 2026. Installing "latest" blindly risks broken type-checking in the editor and CI. | Pin `typescript@^6.0` explicitly in `package.json` until SvelteKit's TS 7 support is no longer experimental. |
| SM-2 (legacy Anki-style spaced repetition, hand-rolled) | Strictly worse scheduling accuracy than FSRS for the same review data; reinventing well-solved math. | `ts-fsrs` |
| Building chord-parsing logic from scratch (regex on chord symbols) | Jazz chord symbol notation has many equivalent spellings (`Δ`, `maj7`, `M7`, `ma7`; `ø`, `m7b5`, `min7b5`) — a hand-rolled parser will miss aliases and enharmonic edge cases (e.g., `F♯ø7` vs `Gbø7`) that `tonal`'s chord-type dictionary already resolves. | `tonal`'s `Chord.get()` / chord-type alias dictionary |
| Relying on Safari/iOS for the MIDI input path | Safari and all iOS browsers (including Chrome/Edge on iOS, which use WebKit) do not support the Web MIDI API and Apple has stated they won't add it, citing fingerprinting concerns. Only ~78% global browser support, concentrated in Chromium + Firefox 108+. | Design MIDI as a progressive enhancement: feature-detect `navigator.requestMIDIAccess`, and make the on-screen keyboard input path fully functional (not a degraded fallback) so the app works completely on Safari/iOS/phone. This matches the project's own stated requirement for a full non-MIDI fallback. |
| `localStorage` for drill history / spaced-repetition state | 5-10MB cap, synchronous API (blocks main thread on large reads/writes), strings only (requires manual JSON serialization), no query capability — review logs will grow over months of daily use. | `dexie` over IndexedDB |

## Stack Patterns by Variant

- Start with `Tone.Synth` (zero sample-loading, instant) for correctness-feedback sounds ("here's the chord you just played" or "here's what it should sound like").
- Upgrade to `@tonejs/piano` only if/when realistic piano timbre becomes valuable (e.g., an ear-training phase mentioned as "later" in PROJECT.md's Out of Scope).
- WebMidi.js already exposes `WebMidi.inputs` reactively and fires `connected`/`disconnected` events — use these rather than polling `navigator.requestMIDIAccess()` repeatedly.
- This is a real gap with a pure client-side IndexedDB approach: progress made on the phone won't appear on the laptop. If cross-device sync becomes a requirement, the lightest addition is a small serverless KV/DB (e.g., Cloudflare D1/KV, or a single-table Supabase/Turso instance) synced on load/save — but this is explicitly a "later" concern; v1 can ship fully local-first per the single-user, low-complexity constraint, and the user can accept per-device progress initially since sessions are described as short and either "before/after piano practice" (implying same device most days) or "phone elsewhere" (implying separate, acceptable-to-diverge streaks).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `@sveltejs/kit@2.69.x` | `svelte@5.56.x`, `typescript@^6.0` | Verified current npm `latest` tags as of 2026-07-12; do not upgrade `typescript` to `^7.0` until SvelteKit's official support lands. |
| `tone@15.1.22` | `@tonejs/piano@0.2.1` | `@tonejs/piano` is built against Tone.js's `Sampler`; keep on Tone.js v15+ line. |
| `ts-fsrs@5.4.1` | Node >=20 | Confirmed requirement in official docs; matches any current SvelteKit/Vite toolchain. |
| `dexie@4.4.4` | Any modern browser with IndexedDB (all Web-MIDI-capable browsers plus Safari/iOS) | No conflict with the MIDI/browser-support gap — persistence works everywhere even where MIDI doesn't. |

## Sources

- [tonal — npm](https://www.npmjs.com/package/tonal) — version verified via npm registry (6.4.3, MIT), HIGH confidence
- [tonaljs/tonal — GitHub](https://github.com/tonaljs/tonal) — API shape (`Chord.get`, `Scale.get`, chord-type alias dictionary), MEDIUM-HIGH confidence (search-digest of official docs, not raw doc fetch)
- [Web MIDI API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) — API existence/shape, HIGH confidence (MDN is authoritative)
- [Web MIDI in 2026: Which Browsers Actually Work](https://www.supersimplepiano.com/blog/web-midi-browser-compatibility-2026) — browser support matrix (Chromium/Firefox 108+ yes, Safari/iOS no), MEDIUM confidence (third-party blog, cross-checked against caniuse.com pattern and MDN's documented Safari non-support)
- [webmidi — npm](https://www.npmjs.com/package/webmidi) — version verified via npm registry (3.1.16, Apache-2.0), HIGH confidence
- [Tone.js official site](https://tonejs.github.io/) and [tone — npm](https://www.npmjs.com/package/tone) — version verified (15.1.22, MIT), HIGH confidence
- [@tonejs/piano — npm](https://www.npmjs.com/package/@tonejs/piano) — version verified (0.2.1, MIT), HIGH confidence
- [ts-fsrs — GitHub](https://github.com/open-spaced-repetition/ts-fsrs) and [ts-fsrs — npm](https://www.npmjs.com/package/ts-fsrs) — version verified (5.4.1, MIT), Node >=20 requirement, HIGH confidence
- [Dexie.js official site](https://dexie.org/) — API/positioning vs localStorage/localForage/idb, HIGH confidence (official docs)
- [dexie — npm](https://www.npmjs.com/package/dexie) — version verified (4.4.4, Apache-2.0), HIGH confidence
- [Announcing TypeScript 7.0 RC / GA — TypeScript devblog](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/) — GA date (2026-07-08), native Go compiler, no stable programmatic API yet, HIGH confidence (official Microsoft blog)
- [TypeScript 7 Now Stable: Not for Vue or Svelte Yet — Tech Times](https://www.techtimes.com/articles/320049/20260710/typescript-7-now-stable-10-faster-builds-not-vue-svelte-yet.htm) — Svelte/Vue tooling gap, MEDIUM confidence (secondary tech press, but corroborated by npm dist-tag evidence: SvelteKit PR discussion only mentions up to TS 6.0 support)
- [feat: TypeScript 6.0 by teemingc — sveltejs/kit PR #15595](https://github.com/sveltejs/kit/pull/15595) — confirms SvelteKit's peerDependency ceiling as of latest tracked support, MEDIUM confidence
- npm registry direct queries (`registry.npmjs.org/<pkg>/latest` and dist-tags) — all version numbers in this document cross-checked directly against the npm registry on 2026-07-12, HIGH confidence
- [SvelteKit vs Next.js in 2026 — Teta Learn](https://teta.so/learn/sveltekit-vs-nextjs) and related aggregated 2026 comparison posts — bundle-size figures and positioning, MEDIUM confidence (third-party blogs, consistent across multiple independent sources so cross-checked, but not a single authoritative benchmark)
- [Cloudflare Pages vs Netlify vs Vercel 2026 — DanubeData](https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026) and related — free-tier comparison, MEDIUM confidence (third-party, cross-checked across multiple sources agreeing on Cloudflare's unlimited-bandwidth free tier)
- [react-piano — npm](https://www.npmjs.com/package/react-piano) and [SVG Piano — Loophole Letters](https://loophole-letters.vercel.app/svg-piano) — React-ecosystem piano component landscape (informing the "build custom in Svelte" recommendation), MEDIUM confidence

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

- **Sketch findings for music-learn** (design decisions, CSS patterns, visual direction) → `Skill("sketch-findings-music-learn")`
- **Spike findings for music-learn** (implementation patterns, constraints, gotchas) → `Skill("spike-findings-music-learn")`
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
