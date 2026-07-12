# Feature Research

**Domain:** Interactive jazz piano theory learning web app (chord-symbol fluency focus)
**Researched:** 2026-07-12
**Confidence:** MEDIUM

## Landscape Surveyed

- **musictheory.net / Tenuto** — free browser theory drills + calculators (note/interval/scale/chord identification and construction), companion offline iOS app
- **Teoria.com** — browser-based ear training (dictation, interval/chord/progression/scale recognition) plus reference tutorials
- **Piano Marvel** — full paid piano-pedagogy platform; MIDI-graded sight-reading assessment (SASR), thousands of songs/lessons, technique/theory/ear-training modules
- **Tonedear** — free ear-training-only chord/interval identification by audio, session scoring, no MIDI, no visual notation
- **iReal Pro** — jazz lead-sheet practice companion: shared chart library, virtual backing band, loopable/temp-rampable playback, interactive chord diagrams and per-chord scale suggestions; assumes user already reads chord symbols
- **Mapping Tonal Harmony Pro (mDecks)** — advanced jazz harmonic-analysis app (chord-scales, upper structures, reharmonization, 1300+ analyzed standards); aimed at intermediate/advanced jazz students, steep learning curve
- **Anki / AnkiJazz decks** — community-built SM-2 spaced-repetition decks for chord/scale spelling and modal relationships; validates spaced repetition as an established pattern in this exact domain
- **"Jazz Piano Chords" app** — tap-to-name / build-from-name chord lookup on an on-screen 88-key keyboard with jazz voicings; closest existing analog to a chord-lookup companion
- **Web MIDI ecosystem** (webmidi.js, chord-recognition, web-midi-chord-finder — open source) — confirms real-time MIDI note-on/off capture and chord detection (triads, 7ths, inversions, slash chords) is mature and low-risk in Chromium browsers; Safari lacks Web MIDI, so an on-screen fallback is required, not optional

No single existing product combines: chord-symbol drilling + MIDI-graded input + spaced repetition + a chord-lookup companion, specifically for piano. The project's synthesis of these four is itself the differentiator — each piece individually is proven elsewhere.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken for its stated purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Chord identification/construction drills (e.g. "what notes are in Dm7?") | Every theory trainer surveyed (musictheory.net, Tenuto, Teoria, Tonedear) leads with this; it's the baseline unit of theory practice | LOW–MEDIUM | Core music-theory logic (note math, chord quality tables) is well-understood and small; the work is UI/UX and drill flow, not algorithmic novelty |
| Instant right/wrong feedback per answer | Every surveyed drill tool gives immediate feedback — delayed feedback breaks the practice loop and is a known UX anti-pattern in skill-drill apps | LOW | Compare played/clicked notes vs expected note-set immediately on input |
| On-screen clickable keyboard input | Fallback input is standard even in MIDI-capable tools (Piano Marvel, chord finders); Safari has no Web MIDI at all, so this isn't optional | LOW–MEDIUM | Needs octave range covering common voicings; must double as the chord-lookup diagram surface (reuse component) |
| Theory reference / explanation of symbols | musictheory.net and Teoria both pair drills with lesson/reference content; users hit an unfamiliar symbol and need the "why," not just more drilling | LOW–MEDIUM | Can be lightweight static/MDX-style content; doesn't need to be a full course |
| Customizable/scoped practice (pick which chords/scales to drill) | musictheory.net's Exercise Customizer and Tonedear's root-note selection both show users expect to scope practice to what they're working on | LOW | Simple filter UI over the drill's question generator |
| Progress persistence across sessions | Table stakes for a habit-forming personal tool; Piano Marvel and Tenuto both track scores/history — losing state on refresh is a broken product for daily use | MEDIUM | Requires basic persistence layer (local storage minimum; server-backed if multi-device sync matters) |
| Chord lookup / reference tool (enter symbol, see notes + keyboard diagram) | Directly matches the "Jazz Piano Chords" app pattern and iReal Pro's per-chord diagrams; this is the "look it up while playing real music" use case the project explicitly needs | LOW–MEDIUM | Shares chord-quality data model with the drill engine — build once, use in both drill generation and lookup |
| Web MIDI input support (Chromium) | Piano Marvel and the open-source chord-recognition tools confirm this is mature, expected, and technically low-risk | MEDIUM | webmidi.js or raw Web MIDI API; note-on/off + chord-match logic; requires HTTPS context |
| Mobile-responsive layout | Usage pattern explicitly includes "phone elsewhere" per PROJECT.md; every modern web theory tool (Teoria, musictheory.net, Tonedear web) is responsive | LOW–MEDIUM | On-screen keyboard and chord diagrams need a compact mobile variant |

### Differentiators (Competitive Advantage)

Features that set the product apart for this specific user. Not required by the genre, but high-value here.

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| MIDI-graded chord drills ("play Dm7" verified on real piano) | No surveyed pure-theory tool (musictheory.net, Teoria, Tonedear) grades against a real instrument; Piano Marvel does but is a full paid platform, not focused on chord-symbol fluency. This is the single highest-leverage differentiator — it turns passive recognition into embodied recall at the keyboard | MEDIUM | Depends on Web MIDI input (table stakes) + chord-matching tolerance (extra notes, octave-agnostic matching, timing window) |
| Spaced repetition tuned to weak chords/scales | Validated pattern (AnkiJazz decks exist and work) but no surveyed theory-drill web app has this built in natively — Tenuto/Teoria/Tonedear are session-based only, no long-term scheduling. Directly serves the daily-habit goal from PROJECT.md | MEDIUM | SM-2 algorithm (per-item ease factor + interval) is simple to implement from scratch; don't need a full FSRS-grade scheduler for v1 |
| Combined drill + lookup companion in one tool | iReal Pro (lookup-like) and musictheory.net (drill-like) are separate categories of product; unifying "practice mode" and "I'm stuck on this song, look it up" mode in one app removes app-switching friction during real practice sessions | LOW | Mostly a product-integration decision — share the chord data model and keyboard-diagram component between drill and lookup views |
| Dual note naming (letters primary, solfège alongside) | Not offered by any surveyed English-first tool; directly addresses this user's specific gap (French solfège speaker learning letter-based jazz notation) | LOW | Static mapping table (Do=C, Ré=D, etc.); toggle or side-by-side label rendering |
| Explicit disambiguation of confusable chord symbols (Maj7 vs m7, ø7 vs m7b5 vs dim7) | Jazz notation ambiguity is a well-documented, widely-acknowledged pain point (multiple jazz-education sources flag M7/m7 sight-reading confusion and inconsistent half-diminished/diminished notation) — directly validates and sharpens the project's core value proposition | LOW | Content/UX decision: always show canonical symbol variants next to the primary one in lessons and lookup results |
| Left-hand voicing suggestions per chord | iReal Pro suggests scales/fingerings per chord; a piano-specific left-hand voicing suggestion (not just root-position spelling) is closer to how real players use chord symbols and isn't offered by generic theory-drill tools | MEDIUM | Requires a small voicing ruleset (e.g., shell voicings: 3rd+7th) — can start simple and deepen later; explicitly deferred rootless/upper-structure voicings per PROJECT.md Out of Scope |
| Streaks / progress view tuned to habit formation | Piano Marvel has progress charts; combining that with spaced-repetition-driven "what's weak" view is a differentiator for sustaining a personal daily practice habit specifically | LOW–MEDIUM | Simple stats dashboard: streak counter, per-chord/scale mastery indicator |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project's scope and single-user context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Full sheet-music / lead-sheet rendering and playback (like iReal Pro) | Feels natural since the user's trigger is reading real sheet music | Massive scope (notation rendering engine, playback sync) for a single-user learning tool; iReal Pro already solves this and isn't the app's job per PROJECT.md | Keep the app focused on symbol-to-notes translation; let the user keep using their paper sheet music or iReal Pro alongside this tool |
| Ear training / audio chord recognition (like Tonedear) | Common feature in "complete" theory trainers, feels like an obvious addition | Explicitly out of scope per PROJECT.md v1 — different skill (aural) from the stated core value (visual symbol → keyboard fluency); adding it now dilutes focus and adds audio-analysis complexity | Defer to a later milestone once visual/kinesthetic fluency is solid |
| Multi-user accounts, auth, billing | "Standard" SaaS features that come from copying generic app templates | Pure overhead for a single-user personal tool — no product value, only maintenance/security surface | Skip auth entirely, or use a trivial single-shared-secret gate if the deployed URL needs to not be fully public |
| Comprehensive advanced jazz harmony (rootless voicings, upper structures, reharmonization) like Mapping Tonal Harmony Pro | Tempting to "future-proof" by building the advanced case now | Explicitly deferred per PROJECT.md; building this before fundamentals (major scales, basic chord qualities) stick would dilute the v1 goal and add significant content/design cost | Add as a post-v1 milestone once chord-symbol fluency and major scales are validated |
| Full custom SRS engine (FSRS-level, ML-tuned scheduling) | Spaced repetition research literature can pull toward "do it properly" with modern algorithms | Overkill for a single learner's dataset; FSRS needs review-history volume to tune well, which a single personal user won't generate quickly | Implement classic SM-2 (proven via AnkiJazz decks) — simple, transparent, sufficient at this scale |
| Native mobile app | "Real" music apps (Piano Marvel, Tenuto, iReal Pro) ship native apps and it can feel like table stakes | Explicitly out of scope per PROJECT.md; doubles the engineering surface (two codebases or a cross-platform framework) for marginal benefit when the user's stated need is "reachable from any device" | Responsive web app covers laptop-at-piano and phone-elsewhere use cases without a native build |
| Community features (sharing chord charts, forums) like iReal Pro's chart-sharing community | iReal Pro's biggest value driver is its user-shared chart library, so it can seem like the "right" model | Irrelevant for a single-user personal tool — no other users to share with; adds unnecessary backend/moderation surface | None needed; if useful later, just add a personal "notes" field to lookup results, not a shared network |

## Feature Dependencies

```
On-screen clickable keyboard
    └──requires──> Chord data model (quality → note-set logic)
                       └──requires──> Note-naming system (letters + solfège mapping)

Web MIDI input
    └──requires──> Chord data model (quality → note-set logic)
    └──requires──> Chord-matching logic (extra-note tolerance, octave-agnostic match)

MIDI-graded drills
    └──requires──> Web MIDI input
    └──requires──> On-screen keyboard (fallback for non-Chromium browsers / no MIDI device)
    └──requires──> Chord identification/construction drill engine

Chord lookup companion
    └──requires──> Chord data model (quality → note-set logic)
    └──enhanced by──> On-screen keyboard (renders the diagram)
    └──enhanced by──> Left-hand voicing suggestions

Spaced repetition scheduling
    └──requires──> Chord identification/construction drills (needs drill items to schedule)
    └──requires──> Progress persistence (needs to store per-item history/ease factor)
    └──enhances──> Streaks / progress view

Scale drills and lessons
    └──requires──> Note-naming system (letters + solfège mapping)
    └──shares data model with──> Chord drills (both are "note-set" quiz types)

Theory lessons (explaining symbols)
    └──enhances──> Chord identification/construction drills (context for why answers are what they are)
    └──enhances──> Chord lookup companion (explains ambiguous symbol variants, e.g. ø7 vs m7b5)

Dual note naming (letters + solfège)
    └──conflicts with──> None; purely additive display layer over the note-naming system
```

### Dependency Notes

- **MIDI-graded drills require Web MIDI input AND the on-screen keyboard fallback:** Safari has no Web MIDI support, and not every practice session happens at the piano — both input paths must feed the same chord-matching logic so drills work identically regardless of input method.
- **Chord lookup companion and chord drills share the same chord data model:** Building the quality→note-set table once (root, third, fifth, seventh, extensions) and reusing it for both drill generation and lookup avoids duplicated logic and keeps disambiguated symbol variants (Maj7/m7/ø7/dim7) consistent everywhere in the app.
- **Spaced repetition requires progress persistence:** SR scheduling (SM-2 ease factor, interval, due date) is meaningless without a place to store per-item history across sessions — persistence must ship before or alongside SR, not after.
- **Scale drills and chord drills share the same underlying "note-set quiz" pattern:** Both ask "given X, produce/identify a set of notes" — building the drill engine generically (parameterized by note-set generator) lets scales piggyback on the chord drill infrastructure rather than needing a parallel system.
- **Theory lessons enhance rather than gate drills:** Lessons should be linkable from a drill's feedback ("wrong — here's why") rather than a mandatory prerequisite, so the user can start drilling immediately and pull in theory context only when needed (matches the "quick-start drills" usage pattern in PROJECT.md).

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core value: chord-symbol fluency.

- [ ] Chord data model covering basic qualities (maj, min, dom7, maj7, m7, ø7/m7b5, dim7) with disambiguated symbol variants — foundation everything else depends on
- [ ] Chord identification + construction drills with instant feedback — the core practice loop
- [ ] On-screen clickable keyboard input — works everywhere, no hardware dependency
- [ ] Web MIDI input for drills (Chromium) — the key embodied-practice differentiator
- [ ] Chord lookup companion (symbol → notes + keyboard diagram) — the "stuck on a song, look it up now" use case
- [ ] Major scale drills and lessons (starting from known G major, expanding outward) — explicitly scoped per PROJECT.md
- [ ] Basic theory lessons explaining symbol meanings (7, maj7, m7, ø, °, 9) — supports the "why," reduces notation confusion
- [ ] Dual note naming (letters primary, solfège alongside) — bridges the user's existing mental model
- [ ] Progress persistence across sessions (local storage minimum) — required for daily-habit usage
- [ ] Responsive layout usable on laptop and phone — matches stated usage pattern

### Add After Validation (v1.x)

Features to add once the core loop is proven to work for daily practice.

- [ ] Spaced repetition scheduling (SM-2) over drill items — add once there's enough drill-answer history to schedule against; trigger: user has been drilling manually for ~1-2 weeks and wrong-answer patterns are visible
- [ ] Streaks / progress dashboard view — trigger: once persistence + enough session history exists to visualize
- [ ] Left-hand voicing suggestions (shell voicings: 3rd + 7th) per looked-up chord — trigger: once basic lookup (root-position notes) is validated as useful during real song practice

### Future Consideration (v2+)

Features to defer until v1 fundamentals (major scales, basic chord qualities, drill habit) are solid.

- [ ] Minor scales and modes — defer until major scales are fluent, per PROJECT.md
- [ ] Advanced jazz voicings (rootless, upper structures, altered extensions) — defer until basic triads/7ths are fluent
- [ ] Ear training / audio chord recognition — different skill axis (aural vs visual), explicitly out of scope for v1
- [ ] Full lead-sheet rendering/playback — out of scope; not this app's job (iReal Pro already exists for this)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Chord data model + disambiguated symbols | HIGH | LOW | P1 |
| Chord ID/construction drills + instant feedback | HIGH | MEDIUM | P1 |
| On-screen keyboard input | HIGH | LOW-MEDIUM | P1 |
| Web MIDI drill input | HIGH | MEDIUM | P1 |
| Chord lookup companion | HIGH | LOW-MEDIUM | P1 |
| Major scale drills/lessons | HIGH | MEDIUM | P1 |
| Theory lessons (symbol meanings) | MEDIUM | LOW-MEDIUM | P1 |
| Dual note naming (letters + solfège) | MEDIUM | LOW | P1 |
| Progress persistence | HIGH | MEDIUM | P1 |
| Responsive layout | HIGH | LOW-MEDIUM | P1 |
| Spaced repetition (SM-2) | HIGH | MEDIUM | P2 |
| Streaks/progress dashboard | MEDIUM | LOW-MEDIUM | P2 |
| Left-hand voicing suggestions | MEDIUM | MEDIUM | P2 |
| Minor scales/modes | MEDIUM | MEDIUM | P3 |
| Advanced jazz voicings | LOW (for now) | HIGH | P3 |
| Ear training | LOW (for now) | HIGH | P3 |
| Lead-sheet rendering/playback | LOW (not this app's job) | HIGH | P3 (likely never) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | musictheory.net / Tenuto | iReal Pro | Piano Marvel | Mapping Tonal Harmony Pro | Anki/AnkiJazz | Our Approach |
|---------|--------------------------|-----------|---------------|---------------------------|----------------|--------------|
| Chord ID/construction drills | Yes (staff notation, click-to-select) | No | Yes (broad, part of full curriculum) | Analysis-focused, not drill-first | Yes (flashcard-style) | Yes, symbol-first (not staff-first) — matches real jazz lead-sheet reading |
| MIDI-graded input | No | No (MIDI export only, not grading) | Yes (paid, full platform) | No | No | Yes — core differentiator, focused specifically on chord-symbol drills |
| Chord lookup companion | Via calculators (not song-practice oriented) | Yes (per-song chord diagrams) | No | Yes (harmony map) | No | Yes — combined with drills in one tool, letter+solfège labeled |
| Spaced repetition | No (session-based) | No | No | No | Yes (community decks) | Yes — built natively into the drill engine, not a separate flashcard app |
| Scale drills | Yes (staff-based) | No | Yes (technique modules) | Yes (chord-scale relationships) | Yes (community decks) | Yes, major scales first with fingerings, symbol/keyboard-first not staff-first |
| Dual note naming (letters/solfège) | No | No | No | No | No | Yes — unique to this project's user need |
| Theory lessons | Yes (separate lesson pages) | No | Yes (as part of full curriculum) | Yes (advanced only) | No | Yes, scoped to what's needed for chord/scale drills, linked from feedback |
| Progress persistence / streaks | Limited (Tenuto has basic stats) | No (practice tool, not tracked) | Yes (extensive) | Limited | Yes (Anki's native scheduler view) | Yes, lightweight — streaks + per-item mastery, not a full LMS |

## Sources

- [musictheory.net - Exercises](https://www.musictheory.net/exercises)
- [musictheory.net - Tenuto](https://www.musictheory.net/products/tenuto)
- [musictheory.net - Tenuto Feature List](https://www.musictheory.net/products/tenuto/features)
- [teoria - Exercises](https://www.teoria.com/en/exercises/)
- [Piano Marvel - Sight-Reading](https://pianomarvel.com/en/sight-reading)
- [Piano Sight Reading Test (SASR) | Piano Marvel](https://pianomarvel.com/en/feature/sasr)
- [Music Chord Identification Ear Training | Tonedear](https://tonedear.com/ear-training/chord-identification)
- [iReal Pro - Practice Made Perfect](https://www.irealpro.com/)
- [Mapping Tonal Harmony Pro | mDecks](https://mdecks.com/mapharmony.phtml)
- [Jazz Harmonic Analysis using Mapping Tonal Harmony Pro 10 – mDecks Music Blog](https://mdecksmusic.com/2024/03/16/jazz-harmonic-analysis-using-mapping-tonal-harmony-pro-10/)
- [From Novice to Virtuoso: Using Anki for Music Theory](https://www.memo.cards/blog/how-to-use-anki-for-music-theory)
- [AnkiJazz - practice Jazz efficiently with Anki](https://www.ankijazz.com/)
- [Spaced repetition for jazz practice | Malcolm Sailor](https://malcolmsailor.com/2023/11/22/anki-for-jazz-practice.html)
- [Jazz Piano Chords - Google Play](https://play.google.com/store/apps/details?id=uk.chordnamer.jazzpianochords&hl=en&gl=US)
- [GitHub - lassik/web-midi-chord-finder](https://github.com/lassik/web-midi-chord-finder)
- [GitHub - xivilay/chord-recognition](https://github.com/xivilay/chord-recognition)
- [Getting Started With The Web MIDI API — Smashing Magazine](https://www.smashingmagazine.com/2018/03/web-midi-api/)
- [Exploring the Web Audio and Web MIDI APIs with virtual pianos - LogRocket Blog](https://blog.logrocket.com/exploring-web-audio-api-web-midi-api/)
- [The SM-2 Algorithm Explained: Spaced Repetition Basics - Flica](https://flica.app/article/sm-2-algorithm-explained)
- [Every chord symbol found on lead sheets | jazz-library.com](https://jazz-library.com/articles/chord-symbols/)
- [Jazz Chord Basics | musictheory.pugetsound.edu](https://musictheory.pugetsound.edu/mt21c/JazzChordBasics.html)

---
*Feature research for: Interactive jazz piano theory learning web app (chord-symbol fluency focus)*
*Researched: 2026-07-12*
