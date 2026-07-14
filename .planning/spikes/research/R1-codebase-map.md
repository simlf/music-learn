# R1: Codebase Map for Parallel Builds A-D

**Researched:** 2026-07-14. Read-only survey of the repo at commit 49b76a7 (post Phase 9).
**Consumers:** four parallel feature builds: A) sampled-piano audio engine, B) hybrid level gating + song builder, C) intervals everywhere + interval drill, D) theory content + mnemonics.

---

## 1. Theory engine (`src/lib/theory/`)

### API surface

| Export | File:line | Signature / notes |
|---|---|---|
| `spellChord(symbol)` | `src/lib/theory/chord.ts:18` | `(string) => ChordResult`. Total function: unrecognized input returns `{recognized:false, notes:[]}` shape (chord.ts:22-31), never throws. Wraps tonal `Chord.get`. |
| `normalizeSymbol` (private) | `src/lib/theory/chord.ts:59` | Converts glyph accidentals ♯/♭ to ASCII #/b and `ø7` to `m7b5` before tonal parsing. |
| `toAccidentalGlyphs` (private) | `src/lib/theory/chord.ts:67` | Converts tonal's ASCII output back to display glyphs. All user-facing note letters are glyph form. |
| `roleForDegree` (private) | `src/lib/theory/chord.ts:76` | Maps tonal interval string (`"1P"`, `"3m"`, `"5d"`, `"7m"`) to `IntervalRole` by leading digit. Degrees other than 1/3/5/7 FALL BACK TO `'root'` (chord.ts:88-91). Extended chords (9/11/13) would mislabel; the v1 quality set avoids them. Track C must not rely on this for anything beyond 4-note chords. |
| `letterToSolfege(letter)` | `src/lib/theory/solfege.ts:24` | Degree-based French solfege: only the base letter matters (C♯ and C♭ both -> "Do"). LETTER_TO_SOLFEGE map at solfege.ts:9-17. |
| `ROOTS` | `src/lib/theory/randomChord.ts:13` | 12 roots in ASCII form: `['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']`. The canonical jazz root set; other modules (didYouMean, pickDistractors) draw from it. |
| `QUALITY_SUFFIXES` | `src/lib/theory/randomChord.ts:20` | 8 v1 qualities: `['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7']`. Track B's tier system will slice/extend this list; it is the single source of the supported quality space. |
| `randomChord()` | `src/lib/theory/randomChord.ts:26` | Uniform draw over the 96-cell ROOTS x QUALITY_SUFFIXES matrix. Track B replaces/wraps this with weighted drawing. |
| `didYouMean(input)` | `src/lib/theory/didYouMean.ts:23` | Single-candidate typo suggestion (Levenshtein <=1 on quality token), or null. Used only on the lookup error branch. |

### Types (`src/lib/theory/types.ts`)

- `IntervalRole = 'root' | 'third' | 'fifth' | 'seventh'` (types.ts:8). This union is LOAD-BEARING across the app: PianoKeyboard CSS class suffixes (`piano-keyboard__key--{role}`, PianoKeyboard.svelte:206-208, 380-394), IntervalChip class suffixes (IntervalChip.svelte:34-52), and app.css tokens `--color-{role}` (app.css:16-19). Extending it (e.g. for 9ths) means touching all three plus the on-fill text tokens (app.css:29-32).
- `SpelledNote { letter, solfege, role }` (types.ts:11-18). `letter` always uses display glyphs (♯/♭), NEVER ASCII #/b (documented contract at types.ts:12).
- `ChordResult { input, symbol, root, quality, recognized, aliases, notes }` (types.ts:21-36). `symbol` echoes tonal's ASCII form (e.g. `"Bbmaj7"`), `root` is glyph form (`"B♭"`); the mismatch is handled explicitly in aliasLine (chordPresentation.ts:56-59). Do not assume they compose.
- Header comment (types.ts:1-5): theory modules are pure data shapes, no DOM/audio/Svelte imports. This purity rule is repeated in chord.ts:15-16 and playChord.ts:9-11 and must be preserved by all tracks.

### How intervals are represented TODAY

There is no standalone interval module. Interval knowledge lives in three places:

1. **Positional role** (`IntervalRole`, types.ts:8): which chord tone a note is, not its quality.
2. **Interval-quality labels**: derived on demand in `formulaFor` (`src/lib/lookup/chordPresentation.ts:30-41`) via tonal's `Interval.distance(root, note)`, reformatted from tonal's `"3m"` to display `"m3"` (regex swap at chordPresentation.ts:37-38). Root labeled `"R"`. `FormulaEntry { role, label, letter, solfege }` at chordPresentation.ts:11-16.
3. **Chroma arithmetic**: `matchChord` compares pitch-class (0-11) sets (`src/lib/drills/matchChord.ts:33-45`); semitone distance is implicit only.

Track C should add a dedicated `src/lib/theory/interval.ts` (or similar) rather than growing chordPresentation, keeping the pure/no-DOM rule. `formulaFor` is the natural seam for surfacing richer interval labels on lookup and drills feedback (both already render it: routes/+page.svelte:192-200, routes/drills/+page.svelte:298-306).

### Solfege dual naming

Every note surface shows letter + solfege via `NoteLabel.svelte` (letter bold sans on top, solfege 10px mono below, NoteLabel.svelte:19-22). Solfege comes from `SpelledNote.solfege`, populated at spell time (chord.ts:38). New note-producing code must populate solfege the same way (`letterToSolfege`).

### Reference test matrix

`src/lib/theory/reference-chords.test.ts` pins the full 12x8 matrix with enharmonically correct spellings including double-flats (`Cdim7 -> C E♭ G♭ B♭♭`). Any change to spelling behavior must keep this green. Root spelling convention: flats-side jazz set, no double-accidental roots (documented reference-chords.test.ts:14-17).

---

## 2. Drill system (`src/lib/drills/`, `src/routes/drills/`)

### Question generation (`src/lib/drills/generateQuestion.ts`)

- `DrillQuestion { kind: 'construction' | 'identification', symbol, choices? }` (generateQuestion.ts:6-13). The `kind` union is where a new drill type (Track C's interval recognition) plugs in, OR a parallel question type module.
- `pickQuestionType()` (generateQuestion.ts:21): 50/50 Math.random draw.
- `pickDistractors(correctSymbol, count=3)` (generateQuestion.ts:54): near-miss-preferring distractors from the ROOTS x QUALITY_SUFFIXES matrix, excluding enharmonic-identical candidates by chroma-set comparison (chromaSetFor at generateQuestion.ts:26-32 reuses `matchChord([], target).missing`).
- `generateQuestion()` (generateQuestion.ts:104): draws symbol via `randomChord()`, then kind, then choices for identification. **Track B hooks here**: weighting by tier/song means replacing the `randomChord()` call with a weighted picker.

### Matching (`src/lib/drills/matchChord.ts`)

- `matchChord(played: Set<number>|number[], target: ChordResult): MatchResult` (matchChord.ts:33). Exact chroma-set equality; returns `{correct, missing[], extra[]}`. Octave/inversion/duplicate agnostic. This is the single grading rule shared by on-screen keyboard and (future Phase 4) MIDI — do not fork it.

### Feedback flow and state management (`src/routes/drills/+page.svelte`)

Svelte 5 runes throughout, no stores, no state library:

- `$state`: `question` (line 48, initialized synchronously with `generateQuestion()`), `selected: Set<string>` (51), `answered` (52), `feedback: MatchResult|null` (53), `confirmationText`/`headlineText` (54-55), `playedLetters` (58), in-session `score {correct, streak}` (61, in-memory only), `hintDismissed` (68).
- `$derived`: `target = spellChord(question.symbol)` (49), `wrongLetters` (169), `showConstructionReveal` (177).
- Grading paths: construction `checkAnswer()` (129-138) converts selected letters to chroma via `Note.chroma` then `matchChord`; identification `selectChoice()` (141-147) compares symbol strings directly.
- `recordGrade(correct)` (95-112): updates score, picks anti-repeat copy variant (`pickVariant` 31-38, mirrors `$lib/copy/hints` pattern), then **fire-and-forget** `recordAnswer({item, kind:'chord', correct})` (111) — never awaited (D-04 rule: UI never waits on network).
- `nextQuestion()` (150-156) resets all per-question state.
- Feedback UI: block at lines 261-309. Correct: one-line caption. Wrong: ink banner + headline, reveal keyboard (identification re-renders keyboard at 275-277; construction transforms the input keyboard in place via `showConstructionReveal` at 211-217), legend (279-297), interval formula chips (298-306).
- Offline queue drain on mount: `flushQueue()` (76-78).
- Layout: named grid areas with portrait/landscape variants (319-473); landscape two-pane under `(orientation: landscape) and (max-height: 600px)` (395).

### How a new drill type plugs in

1. Extend `DrillQuestion.kind` (or add a parallel question module) + a generator function.
2. Add a `{#if question.kind === '...'}` branch in the drills page markup (pattern at drills/+page.svelte:202-259) and a grading function following `selectChoice`/`checkAnswer`.
3. Call `recordAnswer` with the item/kind. **WARNING:** the answer `kind` enum is `'chord' | 'scale'` in FOUR places that must change together for a new kind like `'interval'`: client type (`src/lib/api/progress.ts:16`), server type (`server/src/db.ts:21`), server route schema enum (`server/src/routes/answers.ts:20`), and the SQLite CHECK constraint (`server/src/db.ts:45`). SQLite CHECK constraints cannot be ALTERed — an existing deployed DB needs a table rebuild migration (there is no migration machinery today; `db.exec(SCHEMA)` at db.ts:64 is CREATE IF NOT EXISTS only).
4. Alternatively (lower risk for Track C): record interval answers with `kind:'chord'`-style namespaced item strings, or defer server persistence — decide explicitly at plan time.

**Test trap:** `tests/drills.e2e.test.ts:53-69` (`forceConstructionCm7`) mocks `Math.random` by DRAW ORDER (root index, quality index, question-type index). Any change to how many/which random draws `generateQuestion` makes (Track B's weighting, Track C's new kind) breaks these tests. Budget for updating them.

---

## 3. PianoKeyboard.svelte + keyboardLayout.ts

### Component API (`src/lib/components/PianoKeyboard.svelte`)

Props (lines 41-68): `notes: SpelledNote[]` (highlight targets), `interactive?: boolean` (default false; gates ALL handlers so display mode stays byte-identical), `selected?: Set<string>` (letters, octave-agnostic), `onToggle?: (letter) => void`, `octaves?: 1|2` (test seam; otherwise self-measured via ResizeObserver `$effect` at 82-95), `wrongLetters?: Set<string>` (defined = feedback mode: gray ✕ fills + stamp-in reveal).

Event wiring (per key, both white 273-278 and black 302-309, all gated by `interactive`):
- `onclick` -> `toggleKey(letter)` (101-103) -> `onToggle` callback
- `onkeydown` Enter/Space -> same toggle (105-110)
- `onpointerdown` -> `handlePointerDown(letter)` (124-127): sets `pressedLetter` state and fires `triggerHapticPulse()` (117-121, feature-detected `navigator.vibrate(10)`)
- `onpointerup`/`onpointerleave`/`onpointercancel` -> `clearPressed` (130-132)

**Where the key-touch sound hook goes (Track A):** `handlePointerDown` (PianoKeyboard.svelte:124-127) is the exact analog of the existing haptic pulse — a sound trigger belongs beside `triggerHapticPulse()`. But the component currently imports NOTHING from `$lib/audio` and the codebase rule is that pages own side effects; the least invasive design is a new optional callback prop (e.g. `onPress?: (letter) => void`) fired from `handlePointerDown`, with pages wiring it to the audio engine. Note `handlePointerDown` receives the LETTER only ("C", "F♯") with no octave; the audio layer must assign octave (see `toAscendingPitches` precedent, playChord.ts:34-44). Also note pointerdown fires on ALL interactive keys including during feedback-disabled state? No — handlers are gated by `interactive`, and the drills page flips `interactive` off during construction reveal (drills/+page.svelte:213).

### Highlight/coloring mechanism

- Note-to-key assignment: `$derived` map `assignNotesToKeys(notes, whiteLetters, blackKeyPatterns)` (PianoKeyboard.svelte:169-171).
- Class builders: `roleClass` (206) -> `piano-keyboard__key--{root|third|fifth|seventh}` filled with `var(--color-{role})` (380-394); `selectedClass` (216, ink-hatch, only when NO role — selected and revealed-correct are mutually exclusive per UI-SPEC); `wrongClass` (226, gray fill, only when no role); `stampedClass` (236, stamp-in animation on reveal); `pressedClass` (247, ADDITIVE press cue, scale 0.94 + brightness, reduced-motion disabled at 470-475).
- Interval color tokens (app.css:15-19): `--color-root` #c8502e (vermilion), `--color-third` #3e7d6b (verdigris), `--color-fifth` #a89a7f (tan), `--color-seventh` #f0c948 (mustard). Marked "app-wide, fixed forever" (DESIGN-02). On-fill text pairings at app.css:29-32. Wrong-answer grays `--color-wrong`/`--color-wrong-deep` (app.css:24-25) are explicitly NOT part of the interval language.

### keyboardLayout.ts (`src/lib/components/keyboardLayout.ts`)

Pure, DOM-free: `octavesForWidth(px, min=44)` (51: >=660px -> 2 octaves else 1), `whiteLettersForOctaves` (60), `blackKeysForOctaves` (73), `assignNotesToKeys` (171: ascending walk from root with wrap-around for overflow notes, plus chroma fallback for exotic spellings like F♭/B♯/A♭♭ at 129-145). Black keys carry both enharmonic spellings (`sharpLetter`/`flatLetter`, 37-43); selection identity uses the SHARP letter (PianoKeyboard.svelte:300-309). Track C tap-to-see-interval must remember taps report sharp spellings for black keys.

---

## 4. Lookup page (`src/routes/+page.svelte`, `src/lib/lookup/`)

Presentation pipeline: input -> `showChord(input)` (+page.svelte:43-68) -> `spellChord` -> on success set `result`, add to recents, refocus input; on failure keep previous result visible (non-blocking error), try `didYouMean` then rotating hint. Render chain for a recognized chord (lines 175-202): `ChordGlyph` (root + superscript quality) + "Hear it" `Button` -> `hearIt()` (76-79) calls `playChord(result.notes letters)` — **Track A's lookup-side reveal-sound touchpoint** -> alias line (`aliasLine`, chordPresentation.ts:51) -> `PianoKeyboard notes={result.notes}` (display mode) -> interval formula row (192-200): `formulaFor(result)` mapped to `IntervalChip role/label` + letter + solfege stacked columns.

**Where interval labels surface (Track C):** `formulaFor` (chordPresentation.ts:30) already yields quality-first labels ("m3", "P5"); richer interval naming (long names, semitone counts, mnemonics) extends `FormulaEntry` or wraps it. The same formula row markup is duplicated in drills feedback (drills/+page.svelte:298-306) and showcase (+page.svelte in showcase) — three render sites, one data function.

`src/lib/lookup/recentLookups.ts`: localStorage key `music-learn:recent-lookups` (line 12), max 5, dedupe+cap enforced on read AND write (21-58). The canonical localStorage module pattern: try/catch everywhere, corrupt data resets to empty, writes degrade to no-op ("availability over durability").

---

## 5. Persistence

### Client API layer (`src/lib/api/`)

- `client.ts`: `API_BASE` from `import.meta.env.VITE_API_BASE_URL`, default `http://localhost:8080` (client.ts:18-19). Bearer token in localStorage `music-learn:api-token` (14), `getApiToken`/`setApiToken` (25-45), `apiFetch(path, {method, body})` (57-69) attaches `Authorization: Bearer` only when a token exists.
- `progress.ts`: `AnswerEvent {item, kind:'chord'|'scale', correct}` (14-19); offline queue in localStorage `music-learn:answer-queue` (40), capped 500 (43); `recordAnswer` (95) enqueues + unawaited `flushQueue` (107, drains oldest-first, stops on first failure); `fetchStats(): {items: StatItem[], weakest: StatItem[]}` (129); `fetchStreak(today)` (142); `localDateString` (52, LOCAL calendar date, never toISOString). `StatItem {item, kind, attempts, accuracy, needsPractice}` (26-33).

### Backend (`server/`, separate Fastify + better-sqlite3 service)

- App factory `buildApp` (`server/src/index.ts:24`): CORS (GET/POST only, 43-47), generic error handler (52-61, no internals leaked), open `GET /health` (65), then an encapsulated authenticated context (70-75) where the bearer preHandler guards `/answers`, `/stats`, `/streak`. **New routes go inside this block** — the extension pattern is `registerXRoute(authenticated, store)`.
- **`bodyLimit: 4096`** (index.ts:31) — any new POST payload (song definitions!) must fit 4KB or this cap must be raised deliberately.
- **Strict validation** (index.ts:33-40): `removeAdditional: false`, so `additionalProperties: false` schemas reject unknown fields with 400. New routes must define JSON schemas (pattern: `server/src/routes/answers.ts:14-24` — item <=64 chars, kind enum, clientDate `YYYY-MM-DD` regex).
- Auth: single shared-secret bearer, timing-safe compare (`server/src/auth.ts:16-35`). Config (`server/src/config.ts:19-35`): `API_TOKEN` mandatory (boot refuses without it), `DB_PATH`, `PORT` 8080, `CORS_ORIGIN` default `http://localhost:5173`.
- DB (`server/src/db.ts`): ONE table, `answers` (SCHEMA at 41-52): id, item, kind (CHECK IN ('chord','scale')), correct (CHECK 0/1), created_at (server ISO), client_date. Indexes on (item, kind) and client_date. Store interface `insertAnswer`/`getAllAnswers`/`close` (35-39). Raw events only; aggregates computed on read: `computeStats` (`server/src/stats.ts:31`, needsPractice = attempts>=3 AND accuracy<0.7, weakest capped 5) and `computeStreak` (`server/src/streak.ts:46`, local-date based, one-day grace).
- Deploy: `docker-compose.yml` (repo root) runs ONLY the API (SQLite volume `./data`, healthcheck on `/health`). Per memory + `.planning/phases/09-deploy-to-the-piano/09-CONTEXT.md`: plain docker compose on the user's Oracle server; the SvelteKit app is adapter-static (svelte.config.js:8-14, `strict: true`) with global `prerender = true` (`src/routes/+layout.ts:1`) and its hosting was DEFERRED — deployment is owner-managed, outside plans.

### Where song definitions and level settings should live

Facts to weigh:
- The backend supports NOTHING but answer events today. Songs/settings on the backend = new table(s) + new routes + a DB migration story + a redeploy of the owner-managed docker service. The Fastify patterns make this mechanical but it is real scope, and PUT/DELETE verbs would also need adding to the CORS `methods` list (index.ts:44).
- The established client-side pattern is namespaced localStorage modules with defensive parsing (recentLookups.ts, rotateHint.ts, client.ts token, progress.ts queue). Cross-device sync of recents was explicitly deferred "to Phase 8's backend work" (recentLookups.ts:6-9) and then Phase 8 shipped only answers.
- Level settings (manual tier override) is a small per-device preference: localStorage fits the existing pattern perfectly (`music-learn:level-override` style key).
- Accuracy-driven tier unlocking should derive from server stats (`fetchStats`), because D-02 (progress.ts:127-128, stats route docs) establishes "the client never re-derives accuracy from raw events." But /stats requires a stored token and a reachable server — gating MUST have an offline/tokenless fallback (e.g. everything unlocked, or last-known-stats cached locally), otherwise drills degrade behind auth.
- Song definitions (chord symbols saved from sheet music) have genuine cross-device value (entered on phone at the piano, drilled anywhere) — the strongest candidate for backend persistence. If v1 of Track B ships localStorage-only songs, define the module with the same defensive shape so a later backend swap is contained.

Recommendation for planners: level settings -> localStorage; tier accuracy -> `fetchStats` with a fallback; songs -> decide explicitly (backend = new `songs` table + GET/POST/DELETE routes inside the authenticated context; localStorage = fastest, loses cross-device). Either way, Track B owns all new `server/` files if the backend path is chosen, keeping tracks conflict-free there.

---

## 6. Design system

### Tokens (`src/app.css`)

- Palette (3-13): paper #f2ecdd, paper-bright #faf6ea, ink #221e17, vermilion #c8502e, mustard #f0c948, verdigris #3e7d6b, tan #a89a7f, muted #7d7462, faint #9a907f.
- Interval colors (16-19) and on-fill text colors (29-32): FIXED FOREVER (DESIGN-02), reserved for revealed/correct notes only.
- Wrong-answer grays (24-25): additive, not part of interval language.
- Fonts (35-38): system stacks only, no webfonts. Sans for UI, Georgia serif for chord glyphs, Courier mono for the "status register" voice.
- Spacing (41-47): multiples of 4 (xs 4 ... 3xl 64).
- Typography (50-65): EXACTLY 4 sizes (body 16, label 12, heading 20, display 56) and 2 weights (400, 700). Do not invent sizes.
- Sharp corners are identity: all radii zeroed AND `* { border-radius: 0 !important; }` (77-79).
- Shared `stamp-in` keyframe (94-106) + `prefers-reduced-motion` guard (108-113). Reuse it for any reveal beat; do not add new long-running animations (progress page comment at routes/progress/+page.svelte:148-150: no shimmering skeletons).

### Binding rules from `.claude/skills/sketch-findings-music-learn/SKILL.md`

- Print Shop identity locked by 01-UI-SPEC: letterpress paper/ink palette, zero radius, mono status register, interval color language (root vermilion, third verdigris, fifth tan, seventh mustard) reserved for revealed/correct notes, ink-hatch for selected/pending keys (SKILL.md:9).
- Phone-first per Phase 9; sketches evolve existing surfaces, referenced against src/routes/drills and PianoKeyboard.svelte (SKILL.md:11).
- Winning drill-feedback direction: ONE keyboard transforming in place (interval colors stamp the chord, wrong extras go gray with ✕). "Simplest read wins over richer diff grammars." All treatments must survive the one-octave phone keyboard and reuse the existing stamp-in beat (SKILL.md:19).
- Theme reference at `sources/themes/default.css` mirrors app.css tokens.

### Component inventory (`src/lib/components/`)

| Component | Purpose | Key props / notes |
|---|---|---|
| `Button.svelte` | Print Shop button; renders `<a>` when `href` passed | `variant: 'primary'\|'ghost'`, spreads HTMLButtonAttributes; min 44x44px enforced (Button.svelte:44-45); classes `ps-button ps-button--{variant}` |
| `PianoKeyboard.svelte` | See section 3 | |
| `NoteLabel.svelte` | Dual naming letter + solfege stack | `letter, solfege, highlighted?` |
| `IntervalChip.svelte` | Mono tag filled with interval color | `role: IntervalRole, label: string` — Track C's most reusable atom |
| `ChordGlyph.svelte` | Display-size serif chord symbol with misregistered vermilion shadow | `root, quality` (quality rendered as `<sup>`) |
| `StreakBadge.svelte` | Streak count | `variant: 'compact'\|'hero'`, compact self-hides on loading/zero/error |
| `RecentChipRow.svelte` | Ghost-chip wrap row | `recent: string[], onselect(symbol)` — callback-prop event pattern |
| `PracticeItemRow.svelte` | Stats table row, vermilion weak accent | `item {item, kind, attempts, accuracy}`; KIND column hidden on mobile (`hidden sm:table-cell`) |
| `AccuracyTable.svelte` | Header + PracticeItemRow list | `items[]` |

### Copy voice

Warm, witty print-shop-owner voice; uppercase mono for status-register lines; occasional French winks ("mon ami", "Et voilà") (hints.ts:2-5, drills page:22-25, streak.ts). Rotation pools with per-pool anti-repeat lastIndex (hints.ts:15-33 pattern, mirrored in streak.ts and the drills page pickVariant). Placeholders `{SYMBOL}` / `{N}` substituted by callers. Never scolding (streak.ts:9-11).

---

## 7. Test conventions

- Runner: Vitest 4.1.10, jsdom environment, setup `vitest-setup.ts`, include globs `src/**/*.{test,spec}.{js,ts}` AND `tests/**/*.{test,spec}.{js,ts}` (vite.config.ts:11-15). `resolve.conditions: ['browser']` (vite.config.ts:8-10) — needed for Svelte 5 client-side rendering in tests.
- `vitest-setup.ts`: (1) forces jsdom's REAL localStorage over Node 22's inert built-in stub (lines 4-26 — do not fight this, it is deliberate); (2) `@testing-library/svelte` cleanup after each test (32-34).
- **Pure-logic tests**: colocated `*.test.ts` next to the module (theory/chord.test.ts, drills/generateQuestion.test.ts, components/keyboardLayout.test.ts). Plain describe/it, no DOM. Reference matrix style for exhaustive correctness (reference-chords.test.ts).
- **Component tests**: `src/lib/components/components.test.ts` etc. — `render(Component, props)`, `screen` queries, `fireEvent`, class assertions against BEM-ish class names (`.piano-keyboard__key--root`).
- **Page tests** (`tests/*.e2e.test.ts` — jsdom page renders, not browser E2E): import the page component directly; `vi.mock('$app/stores', ...)` with a `readable` URL stub (drills.e2e.test.ts:12-14); `vi.mock('$lib/api/progress')` so no fetch/localStorage (20-25); `vi.mock('$lib/drills/rotateHint')` (30-35); deterministic questions by mocking `Math.random` with an ordered draw script (53-69) — FRAGILE against draw-order changes, see section 2.
- **Server tests** (`server/test/*.test.ts`, own vitest config): `buildApp` + in-memory store (`createStore(':memory:')`) + `app.inject`, never a real socket.
- Run: `npm test` (root, vitest run); server has its own package.json/vitest.

---

## 8. Conflict matrix (tracks A-D)

### Files each track likely touches

**Track A (sampled piano audio):**
- `src/lib/audio/playChord.ts` (rewrite/extend) + new files under `src/lib/audio/` (sample loading, engine singleton)
- `package.json` (add `@tonejs/piano@0.2.1` — NOT currently installed; only `tone@15.1.22` is)
- `src/lib/components/PianoKeyboard.svelte` (new `onPress`-style prop next to handlePointerDown:124)
- `src/routes/+page.svelte` (hearIt:76), `src/routes/drills/+page.svelte` (key-touch wiring + answer-reveal sound in recordGrade/checkAnswer area), `src/routes/showcase/+page.svelte` (hearIt)
- Note: samples lazy-load over network; `Tone.start()` requires a user gesture (playChord.ts:47-51); the app is static-hosted so sample assets/CDN strategy matters.

**Track B (level gating + song builder):**
- `src/lib/theory/randomChord.ts` and/or new `src/lib/drills/weighting.ts`-style module; `src/lib/drills/generateQuestion.ts` (weighted symbol source)
- New `src/lib/songs/` + `src/lib/levels/` persistence modules (localStorage pattern) and/or `server/src/routes/songs.ts` + `server/src/db.ts` (new table) + `server/src/index.ts:70-75` (route registration) + CORS methods (index.ts:44)
- New routes `src/routes/songs/+page.svelte`, `src/routes/settings/+page.svelte`; `src/routes/+layout.svelte` (navLinks:12-17)
- `src/routes/drills/+page.svelte` (question source + possibly song-scoped session UI)
- `src/lib/api/progress.ts` (fetchStats reuse for tier accuracy; maybe new api module)
- `tests/drills.e2e.test.ts` (Math.random draw script breaks)

**Track C (intervals everywhere + interval drill):**
- New `src/lib/theory/interval.ts`; possibly `src/lib/theory/types.ts` (interval types — avoid touching `IntervalRole` itself)
- `src/lib/lookup/chordPresentation.ts` (formulaFor extension), `src/routes/+page.svelte` (lookup surface)
- `src/lib/components/PianoKeyboard.svelte` (tap-to-see-interval) and/or `IntervalChip.svelte`
- `src/lib/drills/generateQuestion.ts` or a new generator + `src/routes/drills/+page.svelte` (new kind branch) or a new route `src/routes/drills/intervals/+page.svelte`
- `src/lib/api/progress.ts` + `server/src/db.ts:45` + `server/src/routes/answers.ts:20` if a new answer `kind` is recorded (SQLite CHECK migration!)
- `src/routes/+layout.svelte` if a new route
- `tests/drills.e2e.test.ts`

**Track D (theory content + mnemonics):**
- New `src/routes/lessons/+page.svelte` (+ sub-pages); `src/routes/+layout.svelte` (navLinks)
- New content modules (e.g. `src/lib/content/` or `src/lib/copy/` extensions — follow copy/hints.ts pool conventions)
- Possibly `src/lib/lookup/chordPresentation.ts` (mnemonic per chord/interval surfaced in lookup)

### Files touched by 2+ tracks (merge risk, highest first)

| File | Tracks | Risk notes |
|---|---|---|
| `src/routes/drills/+page.svelte` | A, B, C | HIGHEST. A adds sound calls to grading/toggle; B changes question sourcing/session scope; C adds a question-kind branch. Sequence these, or have C build a separate route and A expose a single audio facade the page calls in one place. |
| `src/lib/components/PianoKeyboard.svelte` | A, C | A adds a press-sound hook; C adds tap interval display. Both extend the same pointer/toggle path. Agree on prop names up front (e.g. A: `onPress`; C consumes existing `onToggle`). |
| `src/routes/+layout.svelte` (navLinks:12-17) | B, C, D | Trivial diff but same lines; also a REAL design decision: masthead is a compact single row on phone (Phase 9 D-09: no bottom tab bar; Showcase already hidden on mobile at line 56). 4+ nav items on a phone row needs a deliberate answer, not three uncoordinated appends. |
| `src/lib/drills/generateQuestion.ts` | B, C | B changes symbol drawing; C adds/extends question kinds. Interface-level coordination on `DrillQuestion`. |
| `src/routes/+page.svelte` (lookup) | A (hearIt), C (interval labels), D (mnemonics?) | Different regions of the file; low-medium. |
| `src/lib/api/progress.ts` + `server/src/db.ts` + `server/src/routes/answers.ts` | B (maybe song tagging), C (interval kind) | Any answer-schema change needs the 4-place enum update + DB migration; ONE track should own the server schema change. |
| `src/lib/lookup/chordPresentation.ts` | C, D | formulaFor extension vs mnemonic surfacing. |
| `package.json` | A (certain), B/C (possible) | Lockfile conflicts; trivial to resolve. |
| `tests/drills.e2e.test.ts` | A, B, C | The Math.random draw-script mock and the `$lib/api/progress` mock both break easily. |

---

## 9. Routing / nav

- SvelteKit file-based routing under `src/routes/`: `/` lookup, `/drills`, `/progress`, `/showcase`. A new page = `src/routes/<name>/+page.svelte`, nothing else required.
- **All routes prerender**: `src/routes/+layout.ts:1` (`export const prerender = true`) + adapter-static with `strict: true` (svelte.config.js:8-14). New routes must be prerenderable (no server load functions needing a runtime; data fetching happens client-side in onMount, as progress/+page.svelte does). There are NO SvelteKit server routes — the backend is the separate Fastify service.
- Masthead nav: `navLinks` array at `src/routes/+layout.svelte:12-17`, rendered at 52-63 with active state from `$page.url.pathname` (the ONE store usage in the app; page tests must mock `$app/stores`). Showcase link is `hidden sm:inline` (line 56) — the precedent for demoting links on phone. Masthead also hosts the compact StreakBadge (51).
- New routes for the tracks: `/songs`, `/settings` (B), interval drill either inside `/drills` or `/drills/intervals` (C), `/lessons` (D). Coordinate the mobile nav treatment once (see conflict matrix).

---

## 10. Things a builder could get wrong (conventions checklist)

1. **No em dashes anywhere in app copy** (hints.ts:5 "D-05", memory rule). Use periods/colons/commas. Applies to ALL UI strings, including new lesson content (Track D especially).
2. **Accidental spelling convention**: display glyphs ♯/♭ in every user-facing string and in `SpelledNote.letter`; ASCII #/b only at tonal call boundaries. Every module keeps a tiny local `toAsciiAccidentals` helper (matchChord.ts:15, chordPresentation.ts:19, keyboardLayout.ts:88, playChord.ts:23, drills page:41) — follow the same pattern rather than importing across modules.
3. **ChordResult.symbol is ASCII, ChordResult.root is glyph** — see aliasLine (chordPresentation.ts:52-59) before string-composing them. Drill/lookup pages derive quality via `result.symbol.slice(result.root.length)` which works only because roots without accidentals match; ChordGlyph callers already do this (drills page:205).
4. **localStorage keys namespaced `music-learn:*`** with defensive try/catch read/write, corrupt-data-resets-to-default, no-op on write failure (recentLookups.ts is the template).
5. **Svelte 5 runes idioms** (no legacy stores, no createEventDispatcher): `interface Props` + `let {...}: Props = $props()`; `$state`, `$derived`/`$derived.by`, `$effect` returning cleanup; children as `Snippet` + `{@render children()}` (Button.svelte); component events are CALLBACK PROPS (`onToggle`, `onselect`).
6. **Purity layering**: `src/lib/theory/*` and `keyboardLayout.ts`/`matchChord.ts` never import DOM/audio/Svelte. Audio stays in `src/lib/audio/`. Presentation derivations live in `src/lib/lookup/chordPresentation.ts`-style modules.
7. **Total functions**: engine/persistence code never throws on bad input (spellChord recognized:false path, didYouMean null, storage fallbacks). API fetchers throw only where the page has an error state (fetchStats/fetchStreak).
8. **Fire-and-forget answer recording** (D-04): drill UI never awaits the network.
9. **Server contract is strict**: unknown JSON fields are 400 (removeAdditional:false), bodyLimit 4096 bytes, every route inside the bearer-authed context, JSON schema per route, prepared statements only, nothing echoed back or logged.
10. **44px minimum touch targets** app-wide (Button enforces it; keyboard derives octave count from it — never render interactive keys below 44px, Phase 9 D-04).
11. **Interval colors are reserved** for revealed/correct notes; selected = ink hatch; wrong = grays. Never use `--color-root` etc. for decoration.
12. **Typography discipline**: only the 4 text roles and 2 weights; mono+uppercase for status register lines; display+serif = chord glyph, display+mono = big data numeral (StreakBadge.svelte:12-15).
13. **Motion**: only brief settle animations (stamp-in 240ms); everything behind `prefers-reduced-motion` guards; no infinite/looping animation.
14. **`@tonejs/piano` is not installed** — Track A adds it (pin 0.2.1 per CLAUDE.md compatibility table; requires tone v15 line, already satisfied). `Tone.start()` must run inside a user gesture handler.
15. **tests/drills.e2e.test.ts Math.random draw-order mock** breaks under any generator change — update it alongside.
16. **jsdom lacks ResizeObserver/matchMedia**: PianoKeyboard and the drills page feature-detect both (PianoKeyboard.svelte:84, drills page:85); new browser-API usage must do the same or tests fail.
