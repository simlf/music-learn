# Pitfalls Research

**Domain:** Interactive jazz piano theory learning web app (Web MIDI drills, chord symbol fluency, spaced repetition, single user)
**Researched:** 2026-07-12
**Confidence:** HIGH (Web MIDI API behavior, MIDI numbering, chord notation — verified against MDN/Chromium/community sources); MEDIUM (SRS algorithm choice, habit-design specifics — general research extrapolated to this project's single-user context)

## Critical Pitfalls

### Pitfall 1: Treating chord symbol parsing as a simple lookup table instead of a real grammar

**What goes wrong:**
Jazz chord symbols have no single standard. The same chord quality is written multiple interchangeable ways: minor seventh is `Cm7`, `C-7`, `Cmin7`, `Cmi7`; half-diminished is `Cø`, `Cø7`, `Cm7♭5`, `C-7♭5`; major seventh is `CM7`, `Cmaj7`, `CΔ7`, `CΔ`. If the parser/lookup only recognizes one spelling per quality, the app will fail exactly when the user pastes/types a symbol straight out of real sheet music — which is the actual use case ("decode chord symbols found in real sheet music"). A hardcoded switch/if-chain on symbol strings breaks the first time an unanticipated variant appears (e.g., `C7#9`, `Cm(maj7)`, `C+7`, `Csus4`, slash chords like `C/E` or `Dm7/G`).

**Why it happens:**
Developers building a v1 test the parser against the handful of symbols they thought of, not the actual messy corpus of real-world lead sheets, which mix notation conventions per publisher/engraver.

**How to avoid:**
- Design the chord symbol parser as a tokenizer + normalizer from day one, not a string-match table: separate root (with accidental), quality/extension tokens, altered tensions, and optional bass note (slash chord).
- Build a canonical internal chord representation (e.g., root pitch class + list of intervals from root, or a "chord quality enum" + extensions) and map ALL known spelling variants to it, rather than trying to enumerate every symbol string.
- Seed the parser test suite with symbols pulled from the user's actual sheet music (real book/lead sheet excerpts), not synthetic examples.
- Support slash-chord bass notes (`Dm7/G`) even in v1 lookup, since real sheet music uses them constantly — even if full voicing logic for them comes later.

**Warning signs:**
- Parser implemented as `if (symbol === "Cm7")` chains that grow linearly with every new symbol encountered.
- No test cases with ø, °, Δ, or +/aug symbols.
- No handling for symbols with the root plus alteration in different order (`C#m7` vs `Dbm7`) or `♭`/`b`/`-` used interchangeably for flat vs minor.

**Phase to address:**
Should be addressed in the phase that builds chord symbol lookup/parsing — treat this as core infrastructure, not a "detail to fix later." Do it before building drills on top of it, since drills and lookup share the same parser.

---

### Pitfall 2: Wrong or inconsistent enharmonic spelling (D♯ vs E♭) in generated answers

**What goes wrong:**
MIDI only knows pitch (a note number, e.g. 63), not spelling. If the app naively maps pitch class to a single fixed spelling (e.g., always sharps, or a lookup table indexed by pitch class only), it will show theoretically wrong names — e.g. spelling the third of an E♭ chord as D♯ instead of G, or spelling a chord's notes without regard to key/chord context, producing things like "C E G♯" instead of "C E A♭" for a chord that should use flats. This actively teaches wrong theory to a user whose whole goal is building correct theory fluency — worse than not naming the note at all.
Also risk of getting root spelling wrong: `F♯ø7` vs `G♭ø7` are enharmonically identical in pitch but jazz convention typically favors the spelling that matches how it appears in the tune's key context; an app that always normalizes to sharps (common when using MIDI-pitch-class arrays) will sometimes contradict the exact symbol the user typed.

**Why it happens:**
It's much simpler to build a 12-entry array indexed by pitch class (chromatic, one fixed spelling per pitch) than to implement real spelling logic (each scale degree gets a unique letter name, spelling driven by the chord's root and quality, not by absolute pitch). Developers reach for the simple array because "the piano key is the same key" — true for sound, false for notation semantics.

**How to avoid:**
- Never store/display note names from a flat pitch-class-indexed array. Derive spelling from **chord root + interval formula**: e.g., a dominant 7 chord is always root, major 3rd, perfect 5th, minor 7th — compute the letter name by moving the correct number of scale-degree steps from the root letter, then apply the needed accidental. This guarantees "one letter per scale degree" (no chord spelled with two D's, etc.).
- When the user types a chord symbol (the primary interaction), preserve their root spelling exactly (if they typed `F♯ø7`, don't silently convert to `G♭ø7`) and spell the rest of the chord relative to that root.
- For drills that ask the user to "play" a chord and match MIDI input, do NOT reject/accept based on assumed spelling — MIDI in gives you pitch only. Match by pitch class set (see Pitfall 3), and when giving feedback afterward, display using correctly derived spelling, not whatever the input implies.
- Since this project explicitly limits v1 to major scales and basic chord qualities, spelling logic is very tractable: implement the "one letter name per scale step" rule for major scale spelling and standard chord formulas; don't defer this as "polish."

**Warning signs:**
- Any code with a `const noteNames = ['C','C#','D','D#',...]` array used for ALL display purposes (fine as a MIDI-debugging fallback, wrong as the sole source of truth for lesson/drill display).
- Chords displaying two different accidentals of the same letter (e.g., "C E♭ G B♭ D♭" containing an implied D natural conflict) or skipping a letter name.
- No distinction anywhere in the codebase between "pitch" (MIDI number) and "spelled pitch" (letter + accidental) as separate types.

**Phase to address:**
Foundational — address in the same early phase that defines the music-theory data model (chord construction, scale definitions), before building drills or the chord lookup UI. This is a data-model decision, not a UI detail; fixing it later means touching everything downstream.

---

### Pitfall 3: Chord-matching logic that's either too strict (rejects valid voicings) or too loose (accepts wrong chords)

**What goes wrong:**
Two failure modes, both common:
1. **Too strict:** requiring exact note set/order/octave match against one canonical voicing. A real player will voice `Dm7` in whatever octave and inversion is natural at the keyboard (e.g., left hand only: D-F-A-C, or rootless F-A-C, or with doubled root an octave up). If the drill only accepts one fixed voicing, the user gets marked "wrong" for correct music.
2. **Too loose:** matching on bare pitch-class subset containment, which can silently accept extra/wrong notes, or accept a different chord that happens to share pitch classes (e.g., Cmaj7 pitch classes {C,E,G,B} vs Am pitch classes {A,C,E} — a partial subset check without validating the required tones could wrongly accept incomplete input).

**Why it happens:**
Chord matching looks like a solved, generic "pitch class set" problem from music-tech literature (chromagram/pitch-class-profile matching used in audio chord recognition), but that literature is built for *identifying* an unknown chord from audio, not for *verifying* whether a specific, known target chord was played correctly by a beginner who might play a subset, extra notes, or a plausible near-miss. The verification use case needs different logic than the recognition use case.

**How to avoid:**
- Define matching as: reduce played MIDI notes to a **set of pitch classes** (mod 12, ignore octave and duplicate notes) and compare to the **required pitch-class set** for the target chord. This correctly ignores octave/inversion/doubling — a Dm7 played as D3-F3-A3-C4 or F3-A3-C4-D5 or with the root doubled two octaves apart should all validate as correct.
- Decide explicitly, per drill type, whether the match must be **exact set equality** (all and only the required tones — appropriate for "play a Cmaj7" drills where you want the full 4-tone chord) or **subset/superset tolerant** (appropriate if you ever allow "core tones only" for beginners, e.g., accepting a triad when a 7th chord was asked, or accept extra passing tones from sustain-pedal bleed).
- Handle **sustain pedal and note-release timing**: a naive "check notes currently held down" approach breaks if the user releases a note slightly before others (common at the piano) or if the pedal is down and old notes are still ringing after new ones are pressed (Web MIDI reports pedal CC 64 separately from note-on/off — don't conflate "sounding" with "held"). Decide on a capture window (e.g., collect all notes pressed within a short debounce window, or require a deliberate "check my answer" action) rather than reacting to the very first note-on.
- Explicitly define what happens with **extra unwanted notes** (e.g., user's hand bumps an adjacent key) — likely should reject cleanly with clear feedback ("you played an extra note: X") rather than silently ignoring it.

**Warning signs:**
- Drill validation logic compares an array of MIDI note numbers directly (order- and octave-dependent) instead of normalizing to pitch-class sets.
- No design decision recorded for "what counts as correct" (exact vs. subset) before implementation starts.
- No handling for sustain pedal messages (CC 64) — if pedal input isn't explicitly ignored/handled, held-note detection will be inconsistent.

**Phase to address:**
The phase that implements Web MIDI drill answer-checking. This deserves an explicit design decision (documented) before coding, since the "generic pitch-class matching" pattern from the literature needs adaptation for beginner-verification use, not blind reuse.

---

### Pitfall 4: Assuming Web MIDI "just works" across browsers/devices without a real fallback path

**What goes wrong:**
Safari and iOS have zero Web MIDI support (Apple cites fingerprinting concerns) — so any phone that's an iPhone, or any Safari-only Mac session, cannot use MIDI input at all, no matter what. Starting Chrome 124+, Chrome also gates the *entire* Web MIDI API (not just SysEx) behind an explicit permission prompt, and that permission can be silently denied or blocked by browser settings, leaving `navigator.requestMIDIAccess()` rejecting even on supported browsers. Firefox requires installing a generated "Site Permission Add-on" on first use — an extra friction step easy to get wrong in a solo dev's testing (dev tests once, forgets what a cold-start user experience looks like). Web MIDI also requires a secure context (HTTPS) — a `localhost`-only dev setup won't reveal HTTPS-related failures until deployed.

**Why it happens:**
The developer builds and tests primarily on their own always-permitted, already-set-up Chrome desktop profile, so the "it works" signal is misleading; the actual friction (fresh permission prompt, Safari's total lack of support, phone usage) only surfaces when using a different device/browser — which this project's own requirements explicitly call for ("phone elsewhere").

**How to avoid:**
- Build the on-screen clickable keyboard fallback FIRST (or in true parallel), not as an afterthought once MIDI drills exist — since the project's own usage pattern includes phone-only sessions where MIDI is categorically unavailable (no Web MIDI on iOS Safari at all).
- Explicitly detect and message three states: (1) Web MIDI unsupported in this browser (e.g., Safari/iOS) → hide/disable MIDI option entirely with a clear explanation, not a silent failure; (2) supported but permission not yet granted → clear call-to-action to grant it; (3) permission denied/blocked → actionable recovery instructions (browser-specific), not a dead end.
- Test on: Chrome desktop (primary), and at least one mobile browser session (to confirm the fallback triggers correctly), since the requirement explicitly includes phone access.
- Don't assume MIDI device stays connected/named consistently — handle `onstatechange` for device connect/disconnect (e.g., piano powered off mid-session, USB cable unplugged) rather than only checking device list once at page load.

**Warning signs:**
- No code path tested on Safari/iOS at all during development.
- `requestMIDIAccess()` called with no `.catch()`/error handling, or errors only logged to console with no UI state change.
- On-screen keyboard treated as a "nice to have" built after MIDI drills are done, risking it never getting equal polish despite being the only option on phone/Safari.

**Phase to address:**
Early phase that builds the drill-answering mechanism — design MIDI and on-screen-keyboard input as two implementations of the same "answer input" interface from the start, not MIDI-first-then-retrofit.

---

### Pitfall 5: MIDI note-number-to-name mapping using the wrong octave convention

**What goes wrong:**
The MIDI standard defines note number 60 as "a C" but does NOT define which octave label that C belongs to. Conventions differ: Roland/Yamaha-style calls it C4 (this is also "scientific pitch notation," most common in music software and documentation), some DAWs call it C3, Cakewalk calls it C5. If the app hardcodes an octave-numbering scheme inconsistent with what it displays to the user (e.g., in a "middle C is C4" lesson) while its internal MIDI-to-name conversion uses a different offset, notes will be labeled with the wrong octave number in feedback/diagrams — confusing for a self-taught user trying to map to a physical keyboard.

**Why it happens:**
Copy-pasted MIDI note-number formulas from Stack Overflow/tutorials often hardcode one convention without comment, and get combined with keyboard-diagram code that assumes a different one.

**How to avoid:**
- Pick scientific pitch notation (middle C = C4, MIDI 60) since it's the most common convention in music education/theory materials and matches what the user will encounter in any external theory resource — document this choice once in a single constants/utility module.
- Centralize MIDI-number ↔ note-name conversion in exactly one utility function/module; never inline the arithmetic (`noteNumber % 12`, octave offset) in multiple places where conventions can drift apart.
- Since octave number rarely matters for this app's core use case (chord *quality* fluency cares about pitch class + relative octave for voicing register, not absolute octave labels), consider whether octave labels need to appear in the UI at all outside of scale/keyboard-diagram contexts — reduces surface area for this bug.

**Warning signs:**
- Any hardcoded `Math.floor(midiNote / 12) - 1` (or similar) appearing in more than one file.
- Keyboard diagram octave labels disagreeing with lesson-text references to "middle C."

**Phase to address:**
Address when building the core MIDI utility layer (note parsing, keyboard diagram rendering) — a small, cheap fix if caught early; expensive to hunt down once scattered across drills, lookup, and lesson content.

---

### Pitfall 6: Overengineering the spaced-repetition system before validating the basic drill loop

**What goes wrong:**
SM-2 (Anki's classic algorithm) has a well-documented failure mode called "ease hell": after enough wrong answers, a card's scheduling interval gets stuck growing extremely slowly even after the user has since mastered it, because the ease factor bottoms out and barely recovers. Building a full SM-2-style ease-factor system (or worse, implementing a modern algorithm like FSRS which needs many parameters and ideally population-level tuning data) for a single user with a small, fixed universe of drillable items (a few dozen chord qualities × 12 roots, plus scales) is disproportionate: these algorithms are tuned to trade off against huge item pools and forgetting curves across thousands of flashcards — this project's item space is small and highly structured (a chord's difficulty is largely known in advance: extensions and half-diminished/diminished are harder than major/minor triads).

**Why it happens:**
"Spaced repetition" reads in requirements docs as a single well-known technique (implying "implement SM-2 like Anki does"), but the textbook algorithm was designed for open-ended flashcard decks, not a small, curated, structured skill domain where "weak chords/scales drilled more" is closer to a simple weighted-priority queue than a full forgetting-curve model.

**How to avoid:**
- Start with the simplest thing that satisfies the actual requirement ("tracks wrong answers and drills weak chords/scales more; progress persists between sessions"): a per-item running score (e.g., a simple leitner-box-style bucket system with 3-5 buckets, or an exponential-moving-average "mastery score" per chord/scale) rather than a full SM-2 ease-factor + interval scheduler.
- Only reach for SM-2-style interval scheduling if/when the simple weighted-priority approach proves inadequate in actual daily use — this is explicitly a single-user personal tool, so there's no "population of users" argument for needing a heavily-validated algorithm; the user's own felt experience is the only signal that matters.
- Persist raw performance history (timestamp, item, correct/incorrect, response time) regardless of which scheduling algorithm sits on top — this makes it cheap to swap or refine the algorithm later without losing data, and enables a "progress view" independent of whatever scheduler is chosen.
- Avoid building configuration UI for SRS parameters (ease factors, interval multipliers) — this is a single-user tool; tune constants in code, not user-facing settings, since there's no second user's differing preferences to serve.

**Warning signs:**
- Spending implementation time on ease-factor decay curves, interval multiplier tuning, or "leech" detection logic before the basic drill-and-track loop has been used for even a few real practice sessions.
- Building any admin/settings UI to adjust spaced-repetition parameters.

**Phase to address:**
The phase that implements "smart practice" / weak-item drilling — explicitly scope it to a simple weighted/bucket approach in the plan, with SM-2/FSRS-style refinement flagged as a possible future enhancement, not a v1 requirement.

---

### Pitfall 7: Content treadmill — lesson content growing without bound because "just one more chord type" always feels justified

**What goes wrong:**
Theory lessons are open-ended by nature (there's always another scale, mode, voicing type, or reharmonization concept to explain), and because this is a personal tool being built by/for someone actively learning, new theory gaps will keep surfacing during real practice ("oh I also don't understand augmented chords," "what about drop-2 voicings?"). Without a firm content boundary, the lesson-writing effort competes indefinitely with drill/UI development, and v1 never ships because there's always more theory to explain first.

**Why it happens:**
For a solo builder-is-also-the-learner, the temptation to "just add the lesson I need right now" is strong and each individual addition feels small and justified — classic scope creep via many small, individually-reasonable increments rather than one big ask.

**How to avoid:**
- The project's own Out of Scope section already does this well (minor scales, modes, advanced voicings excluded from v1) — hold that line explicitly during execution, not just in planning. When a new "I need to understand X" moment comes up during real practice, capture it as a backlog/idea, not an in-flight lesson-content addition.
- Treat lesson content as scoped per-chord-quality/per-scale, matching exactly the drillable items already defined (basic qualities: maj7, m7, dom7, ø7/m7♭5, °7, maybe 6/9 — and major scales only) — don't let lesson writing get ahead of or independent from what's actually drillable.
- Prefer short, dense "why" explanations tied directly to symbols the user has actually encountered in real sheet music, over comprehensive textbook-style theory chapters — this naturally bounds scope to what's needed for the stated goal (symbol → keyboard fluency), not general music education.

**Warning signs:**
- Lesson content section growing to cover topics with no corresponding drill (theory explained but nothing to practice it against).
- Time spent writing lesson prose exceeding time spent on drills/interaction, when the core value proposition is drill-based fluency, not reading.

**Phase to address:**
Should be an explicit scope-guard called out at roadmap creation and re-checked at each phase transition (the project's own PROJECT.md evolution process already has a mechanism for this — use it deliberately for content, not just features).

---

### Pitfall 8: Habit/motivation design that assumes gamification mechanics will sustain daily use

**What goes wrong:**
Layering streaks, badges, or points onto a learning app doesn't reliably produce sustained engagement, and can backfire: research on gamification misuse shows that when external reward mechanics dominate, users can become fixated on the game layer (protecting a streak, chasing a badge) rather than the underlying skill, and intrinsic motivation can be crowded out by extrinsic rewards — creating a "chocolate-covered broccoli" effect where the mechanic feels good but doesn't map to actual learning. For a single, self-motivated user (a returning pianist frustrated by a real, felt problem — not needing external validation), heavy gamification is misapplied effort relative to what actually drives use: low-friction quick-start and visible, real progress.

**Why it happens:**
"Streaks and progress view" is listed as a requirement, and it's easy to over-invest in this because gamification patterns are well-known and satisfying to build, even though this project's actual retention risk is friction (how fast can a session start) rather than lack of extrinsic reward.

**How to avoid:**
- Prioritize reducing time-to-first-drill (the project's own context explicitly flags "low-friction, quick-start drills matter" for short before/after-practice sessions) over building elaborate streak/badge systems.
- Keep streak/progress-view simple and honest (e.g., a calendar heatmap of practice days, a per-chord mastery bar) — visible, real signal of improvement — rather than points/levels/achievements layered on top, since there's no social component to make competitive game mechanics meaningful for a single user.
- Design for interruption-friendly sessions: a drill session should be resumable/restartable instantly with no setup ceremony (matching "short sessions before/after real piano practice"), since the actual motivation risk is "the app takes too long to get into" not "the app isn't rewarding enough."

**Warning signs:**
- Feature time spent on visual reward mechanics (confetti, badges, levels) rivaling or exceeding time spent reducing clicks/taps to start a drill.
- Streak system that punishes (resets to zero, guilt-trips) rather than simply informs.

**Phase to address:**
Address when designing the drill session flow / home screen — bake "start a drill in one tap/click" into the UX spec early, and treat streak/progress display as a lightweight, late-addable layer, not core infrastructure.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| Fixed pitch-class-indexed note-name array (always sharps) instead of context-aware spelling | Fast to ship note names for MIDI debugging | Teaches wrong enharmonic spelling in lessons/drills; erodes trust in a theory-education tool | Only for internal debug logging, never for user-facing chord/lesson display |
| Hardcoded chord-symbol string matching (no tokenizer) | Quick to get 5-10 chord types working | Breaks on first unanticipated symbol from real sheet music (the actual use case); costly to refactor once drills depend on it | Acceptable only for a throwaway spike/prototype, not the shipped lookup feature |
| SM-2-style ease-factor scheduler for a single user with a small item pool | Feels "properly done," reuses known algorithm | Ease-hell-style stuck scheduling risk; wasted engineering effort vs. a simple weighted queue that would serve one user just as well | Never for v1; revisit only if a simple bucket/priority approach proves genuinely insufficient after real use |
| No debounce/capture-window on MIDI note matching (react to first note-on) | Simple to implement, feels "real-time" | False negatives for naturally staggered playing (fingers don't land simultaneously); frustrating false "wrong" feedback | Never — even a short (e.g., 150-300ms) note-collection window is cheap and necessary |
| Skipping on-screen keyboard fallback until "later" | MIDI drills demoable sooner | Leaves phone/Safari usage (an explicit requirement) completely broken until fallback lands; risks fallback being lower-quality afterthought | Never, given phone access is an explicit v1 requirement |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Web MIDI (`navigator.requestMIDIAccess`) | Assuming it's available/granted without checking support, secure context, and permission state | Explicitly branch on: browser support (feature-detect `navigator.requestMIDIAccess` exists), secure context (HTTPS required), and permission granted/denied/prompt states; provide distinct UI for each |
| Web MIDI device list | Reading `inputs`/`outputs` once at page load and assuming it stays current | Subscribe to `MIDIAccess.onstatechange` to handle device connect/disconnect/power-off mid-session |
| Web MIDI note-on messages | Treating note-on with velocity 0 as a "note pressed" event | Per MIDI spec convention widely used by devices, note-on with velocity 0 is equivalent to note-off — always check velocity, not just message type, when determining "is this note currently sounding" |
| Sustain pedal (CC 64) | Ignoring pedal messages, or conflating "sounding" with "physically held down" | Track pedal state (CC 64 value ≥ 64 = down) separately from note-on/off; decide explicitly whether drill-answer capture cares about sustained-but-released notes or only physically-held notes |
| Hosting/deployment for a single-user site | Standing up a full backend + database + auth for "just one user" | Given explicit constraints (no accounts/billing, cheap/free hosting), favor a static/JAMstack deploy with lightweight persistence (e.g., browser storage/IndexedDB, or a minimal serverless KV) sized to one user's data, not a scalable multi-tenant backend |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Re-deriving chord spelling/parsing on every keystroke without memoization | Lookup UI feels laggy typing chord symbols | Debounce input parsing, memoize by symbol string | Noticeable even at small scale on low-powered phones if parsing is naively re-run on every render |
| Recomputing full SRS priority ordering across all items on every drill request | Session start feels slow as item count grows | Precompute/cache priority order, update incrementally on each answer | Irrelevant at this project's scale (dozens of items) unless implementation is pathologically inefficient — flagged mainly so effort isn't wasted "optimizing" a non-issue |
| Storing entire practice history in a single unbounded client-side array/localStorage blob | Slow load times, storage quota errors after months of daily use | Use IndexedDB (not localStorage) for history; consider periodic aggregation/summarization of old raw events | After months of daily multi-drill sessions, a naive localStorage JSON blob can hit browser storage limits or slow JSON parse times |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding real authentication/accounts "just in case" for a single-user tool | Wasted effort, larger attack surface, more to maintain | Per explicit project constraints, keep auth trivial or absent (e.g., an obscurity-based unlisted URL, or simple basic-auth in front of the static site) rather than building real user management |
| Exposing the deployed site publicly with no access control at all | Low risk given no sensitive personal data, but drill/progress data is still personal usage data | A lightweight barrier (e.g., basic auth, or a non-guessable URL) is proportionate; skip OAuth/full account systems entirely |
| Requesting Web MIDI SysEx access when not needed | Chrome shows a scarier/more sensitive permission prompt than necessary, increasing user (self) friction and confusion during testing | Only request `sysex: true` in `requestMIDIAccess()` if the app actually needs system-exclusive messages (this project doesn't — it only needs note on/off) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Drill rejects a musically-correct answer because of octave/inversion/voicing mismatch | User loses trust in the tool, stops using MIDI input, gets discouraged despite playing correctly | Match on pitch-class set (ignore octave/inversion/duplicates) as described in Pitfall 3 |
| Solfège shown as a token afterthought (e.g., tiny text) rather than a genuine bridge | The user's actual mental model (Do-Ré-Mi) isn't well served, undermining the stated bridging goal | Give solfège equal visual weight alongside letter names in early lessons/drills, fading emphasis as fluency in letters grows (matches "letters primary, solfège alongside" decision) |
| No clear distinction between "practice/drill mode" and "reference/lookup mode" | User unsure whether the tool is testing them or just answering a question while playing a real song | Keep the practice-companion chord lookup (used live, next to the piano, while playing) visually and interactionally distinct from timed/scored drills — the lookup should never feel like it's grading you |
| Feedback on wrong drill answers only shows "wrong," not why | User can't self-correct or learn from the mistake, undermining the theory-education goal | Show the correct notes (with correct spelling) and, where relevant, which specific note(s) were wrong vs. missing vs. extra |
| Forcing MIDI setup/permission flow before letting user try the on-screen keyboard | Friction-sensitive habit goal undermined right at first use | Let users start drilling immediately via on-screen keyboard; offer MIDI connection as an enhancement discoverable at any time, not a gate |

## "Looks Done But Isn't" Checklist

- [ ] **Chord symbol lookup:** Often missing slash-chord (bass note) parsing and altered-tension symbols (♭9, ♯11, ♭13) — verify against a real page of sheet music, not a curated test list.
- [ ] **Enharmonic spelling:** Often defaults to sharps-only or a flat pitch-class array — verify chord/scale spelling never reuses the same letter twice or skips a letter within one chord/scale.
- [ ] **MIDI input drills:** Often only tested with notes played simultaneously with even timing by the developer's own hand — verify with intentionally staggered/arpeggiated note entry and with sustain pedal held.
- [ ] **Cross-device support:** Often only tested on the developer's primary Chrome desktop profile — verify a fresh Chrome profile (cold permission prompt), Firefox (add-on install flow), and a phone/Safari session (no-MIDI fallback path).
- [ ] **Spaced repetition "weak item" targeting:** Often just recency-based (last wrong answer shown next) rather than truly weighted by historical accuracy — verify by deliberately answering one chord wrong repeatedly and confirming it surfaces more often over multiple sessions, not just the next one.
- [ ] **Progress persistence:** Often stored only in one browser's localStorage — verify progress survives across devices/browsers if the "accessible from any device" requirement implies shared progress, or explicitly document that progress is per-device if not.
- [ ] **Lesson-to-drill coverage:** Often lessons exist for concepts with no matching drill, or drills exist for symbols with no explanatory lesson — verify every drillable chord quality/scale has a corresponding lesson and vice versa.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Naive pitch-class-array enharmonic spelling shipped and discovered later | MEDIUM | Introduce a proper spelling function keyed by chord root + formula; audit all display call sites to route through it; add regression tests for known-tricky chords (e.g., F♯ø7, C♯m7) |
| Chord parser breaks on a real-world symbol variant | LOW | Add the missing token/alias to the normalizer's alias map; add a regression test with the exact failing symbol string |
| SRS scheduling shipped as full SM-2 and found to misbehave ("ease hell" equivalent) | MEDIUM | Since raw performance history should already be persisted (per Pitfall 6 prevention), swap the scheduling algorithm for a simpler weighted-priority approach without losing historical data |
| MIDI drill validation shipped as exact-array-match and found to reject valid voicings | LOW | Refactor comparison to pitch-class set equality; this is a localized function change if octave/order-dependent comparison was isolated to one utility |
| Lesson content scope crept beyond v1 boundary | LOW | Move overflow content to a backlog/"v2 ideas" doc; no code to undo, just a scope conversation |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Chord symbol parsing too rigid (Pitfall 1) | Phase building chord symbol lookup/parser | Test suite includes symbol variants (Cm7/C-7/Cmin7, ø/m7b5, slash chords) pulled from real sheet music |
| Wrong enharmonic spelling (Pitfall 2) | Phase defining the music-theory data model (chord/scale construction) | Unit tests assert one-letter-per-scale-degree spelling for all v1 chord qualities and major scales, including sharp/flat root cases |
| Chord-matching too strict/loose (Pitfall 3) | Phase implementing MIDI drill answer-checking | Manual test: play a target chord in 3+ different voicings/octaves/inversions, all should validate; play with an extra wrong note, should reject with specific feedback |
| Web MIDI cross-browser/device assumptions (Pitfall 4) | Phase building drill input (MIDI + on-screen keyboard) | Manual test pass on Safari/iOS (fallback triggers), fresh Chrome profile (permission prompt flow), Firefox (add-on flow) |
| MIDI octave-numbering inconsistency (Pitfall 5) | Phase building core MIDI utility layer | Single centralized conversion function exists; grep codebase for duplicate octave-arithmetic |
| SRS overengineering (Pitfall 6) | Phase implementing "smart practice" weak-item drilling | Confirm implementation is a simple weighted/bucket scheme, not a full SM-2/FSRS scheduler, unless explicitly revisited later |
| Lesson content treadmill (Pitfall 7) | Ongoing — enforced at each phase transition via PROJECT.md review | Out-of-scope list reviewed and held at each milestone/phase transition; new theory gaps captured as backlog, not mid-phase additions |
| Gamification/habit-design overinvestment (Pitfall 8) | Phase designing drill session flow / home screen | UX spec prioritizes time-to-first-drill; streak/progress display kept simple (no points/badges/levels) |

## Sources

- [Web MIDI Permission Prompt — Chrome for Developers](https://developer.chrome.com/blog/web-midi-permission-prompt)
- [Web MIDI API — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web MIDI API: Browser Support, Features, Limitations — TestMu AI](https://www.testmuai.com/learning-hub/web-midi-api-browser-support/)
- [PSA: Web MIDI Permissions Prompt Change — Chromium blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/nz320H9J6bs)
- [Every chord symbol found on lead sheets — jazz-library.com](https://jazz-library.com/articles/chord-symbols/)
- [Which chord is C-7 — TalkBass.com](https://www.talkbass.com/threads/which-chord-is-c-7.446080/)
- [A Jazz Chord Symbols Chart — tamingthesaxophone.com](https://tamingthesaxophone.com/theory/impro/jazz-chord-symbols)
- [Automatic Chord Recognition from Audio — Alex R. Emmons](https://umm-csci.github.io/senior-seminar/seminars/fall2014/Emmons.pdf)
- [Chord-Recognition (Pitch Class Profile) — GitHub](https://github.com/orchidas/Chord-Recognition)
- [Under the Hood: Building a Real-Time Chord Recognizer — WhatChord](https://whatchord.earthmanmuons.com/articles/under-the-hood)
- [The Anki SM-2 Spaced Repetition Algorithm — RemNote Help Center](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm)
- [Spaced Repetition Algorithms Explained: FSRS vs SM-2 — studyglen.com](https://studyglen.com/guides/best-spaced-repetition-apps)
- [The SM-2 Algorithm Explained Simply — Repetrax Blog](https://www.repetrax.com/blog/sm2-algorithm-explained)
- [Enharmonic Notes & Equivalents — piano.org](https://piano.org/theory/enharmonics/)
- [Enharmonic spellings and music notation — aboutmusictheory.com](https://www.aboutmusictheory.com/enharmonic-spellings.html)
- [Unit 7: Key Signatures — Fundamentals of Theory](https://fundamentalsofmusictheory.jennharding.umasscreate.net/unit-7-key-signatures/)
- [Note On velocity 0 = Note off? — 1010music Forum](https://forum.1010music.com/forum/general-topics/45216-note-on-velocity-0-note-off)
- [Bug: Sustain pedal off is interpreted as Note off — 1010music Forum](https://forum.1010music.com/forum/products/nanobox-product-discussions/nanobox-lemondrop-compact-granular-synthesizer/support-lemondrop/31090-bug-sustain-pedal-off-is-interpreted-as-note-off)
- [MIDI Octave and Note Numbering Standard — midi.org](https://midi.org/community/midi-specifications/midi-octave-and-note-numbering-standard)
- [Middle C = C3 or C4 – a Fix — petervodden.blog](https://petervodden.blog/portfolio/middle-c-c3-or-c4/)
- [StudioCode - MIDI notes numbers and Middle C](https://studiocode.dev/resources/midi-middle-c/)
- [When Gamification Spoils Your Learning — arXiv](https://arxiv.org/pdf/2203.16175)
- [Negative Effects of Gamification in Education Software — arXiv](https://arxiv.org/pdf/2305.08346)
- [Rootless Left Hand Piano Voicings — Earl MacDonald](https://www.earlmacdonald.com/jazz-piano-lessons/rootless-left-hand-piano-voicings/)
- [Learn The 5 Important Shapes for Left-Hand Piano Voicings — learnjazzstandards.com](https://www.learnjazzstandards.com/blog/5-important-shapes-for-rootless-left-hand-piano-voicings/)
- [5 ways I beat scope creep as a solo dev — Medium](https://medium.com/@rimnassih/5-ways-i-beat-scope-creep-with-real-examples-as-a-solo-dev-c5f9bf7331a4)
- [How to avoid scope creep, and other software design lessons learned — freeCodeCamp](https://www.freecodecamp.org/news/scope-creep-and-other-software-design-lessons-learned-the-hard-way-edacf021965b/)

---
*Pitfalls research for: Interactive jazz piano theory learning web app*
*Researched: 2026-07-12*
