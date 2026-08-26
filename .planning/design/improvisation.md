# Design: improvisation

**Status:** design, partially built. The comping loop (shape one) is shipped. Shape three shipped as the chord-scale lookup reference (engine `src/lib/theory/chordScale.ts`, panel `src/lib/components/ImproviseGuide.svelte` on the Lookup result card), honoring the constraints in section 5, then iterated twice: quick-260816-w4h gave every handle-with-care note the chord tone it collides with plus playback, and the Phase 38 rebuild (section 5.5) turned the panel from a page of prose into an instrument. Shape two (guide-tone lines) remains a proposal.
**Scope:** how a practice companion that cannot be graded coexists with a spaced-repetition trainer, and which two units of improvisation content are worth building next.
**Companion doc:** `.planning/design/guided-path.md` (the 14-unit curriculum spine). This document is deliberately subordinate to it: where the two touch, the path wins and this doc says how it fits in.
**Date:** 2026-07-29
**Copy rule for everything specified here:** no em dashes in user-facing strings. Periods, colons, commas.

---

## 1. Recommendation

Build **guide-tone lines** next, and build them as guided-path's unit 11, not as a new surface. Keep the comping loop exactly as small as it shipped, with **one** extension: the ability to loop a single bar so one change can be drilled. **Defer modes**, and when they come, ship them as a **chord-scale lookup answer** rather than a seven-modes curriculum.

The argument is scope discipline, stated as a test any candidate must pass: *does this shorten the gap between seeing a chord symbol and knowing what the left hand plays?* Guide tones pass, hard. They are the reason a two-note left hand sounds like music instead of like two notes, and the app already asserts the shell voicing without ever explaining the voice leading that justifies it. A single-bar loop passes: it is chord-symbol recall under a clock, which is the actual skill. Walking bass and drums fail: they make the loop more pleasant and teach nothing. Modes fail *as taught theory* and pass *as a lookup answer*: "what can I play over F♯m7♭5" is a chord-symbol question, while "name the seven modes of the major scale" is trivia, and the app has no business teaching the second in order to answer the first.

The structural decision underneath all three: the app now has two kinds of surface, and they should stay physically separated by route. `/practice` is a **trainer**: bounded, graded, FSRS-scheduled, and it ends. `/learn` holds **instruments**: unbounded, ungraded, and they end when you stop. The comping loop is the first instrument. That separation is not a compromise forced by the fact that improvisation cannot be graded. It is the correct shape, and section 6 argues it.

---

## 2. Ground truth: what is built, as of this branch

### 2.1 The comping loop, shipped

| Piece | File | What it owns |
|---|---|---|
| The clock | `src/lib/audio/loopTiming.ts` | Tempo range, tempo to duration, bar advance and wrap. Zero imports, so audio.ts never reaches the theory layer. |
| The voicing and the form | `src/lib/practice/compLoop.ts` | `buildCompBars(templateId, key)`, `compVoicing(symbol)`, `romanShape`, `templateMode`. |
| The comp voicing math | `src/lib/audio/voicing.ts` | `toCompPitches(root, upper)`: root in octave 3, guide tones from octave 4, strictly ascending. |
| The scheduler | `src/lib/audio/audio.ts` | `startCompLoop` / `stopCompLoop` / `compLoopRunning`, on Tone's Transport. |
| The surface | `src/lib/components/CompingLoop.svelte`, mounted at `src/routes/learn/+page.svelte` (`data-testid="learn-comping"`) | Three controls (FORME / TON / TEMPO), two readouts, plus two default-off toggles: HOLD (3.3) and SCALE, the chord-scale overlay of 5.2. |
| The copy | `src/lib/i18n/messages/learn.ts`, `learn.comping.*` | en + fr. |

It reuses the one progression engine (`src/lib/practice/progressions.ts`): 3 templates at `:108-137`, 12 keys at `:140`, which are `MAJOR_SCALE_ROOTS`. It invents no second progression table, and a test asserts symbol-for-symbol agreement with `buildProgression` across all 36 template/key pairs.

Two choices are worth restating because the rest of this document leans on them.

**Tempo: default 70 BPM, range 50 to 120 in steps of 5, one chord per 4/4 bar.** At 70 a bar lasts 3.43s, which is long enough to find the notes without stopping and short enough that a 3-bar ii-V-I completes in about 10 seconds, so it is heard as one cadence rather than three unrelated chords. 50 (4.8s per bar) is the floor at which the harmony still coheres. 120 (2s per bar) is a real medium swing tempo and about the fastest at which someone still learning the theory chooses notes instead of guessing them. The range is deliberately narrow: a 30-to-300 slider would be a knob, not a decision.

**Voicing: the root in the bass, then the guide tones, and nothing else.** The guide tones come from `shellVoicing.shellNotes` (`src/lib/practice/shellVoicing.ts:78-82`), which is the app's single definition of "the notes that carry the chord", including its ♭5 exception. The loop adds the root *below* them rather than dropping it, for one reason: without a root the player cannot hear which chord went by, and the root is the cheapest possible anchor. That makes it a real left-hand shell (root, 3rd, 7th) rather than a voicing exercise, and it leaves everything from roughly C5 up empty. Nothing in the comp ever reaches above C6, which a test asserts across all 120 bars of all 36 forms.

The comp is quieter than a struck chord (velocity 0.62 against `CHORD_VELOCITY` 0.85) because it is an accompaniment, and each bar is held for 92% of the bar so there is a seam before the next change.

### 2.2 The guide-tone situation, and the mistake one commit ago

Commit `6a13ade` (PR #31) fixed two false claims in shipped copy. The one that matters here: `voicings.subtract.teach` said "keep the 3rd + 7th tritone". Verified against tonal across all 12 roots, the 3rd-to-7th interval is a tritone **only** in dominant 7 and dim7. In maj7, m7 and m7♭5 it is a **perfect fifth**. The sentence was false for three of the five qualities the drill teaches, including the two commonest. The same commit changed `shellNotes()` so a ♭5 chord keeps its ♭5 in the shell, because with 3rd + 7th alone the shell of Cm7♭5 (E♭ + B♭) is chroma-identical to the shell of Cm7 on every root, which means the drill was training a voicing that cannot tell two symbols apart inside an app whose stated core value is telling symbols apart.

The replacement copy (`src/lib/i18n/messages/voicings.ts:58-61`, and the fr pair at `:99-102`) is now true: the 3rd says major or minor, the 7th says which seventh, so those two carry the chord. But it is still a **rule**, not a **reason**. It explains why those two notes are sufficient. It does not explain why they sound like *music*, which is the question a returning classical pianist will actually ask when told to play two notes with his left hand. That answer is voice leading, and it is missing from the app entirely. This is the gap unit 11 exists to close, and the previous copy filled it with a claim that was false.

### 2.3 Modes: genuinely absent, verified

*Superseded: the chord-scale lookup reference (`src/lib/theory/chordScale.ts`) now names modes as labels on answers, per section 5.2. The audit below records the state that motivated the design.*

`grep -rin "dorian|mixolydian|lydian|aeolian|phrygian|locrian" src/ tests/` returns **nothing**. The theory layer knows one scale: `majorScaleNotes(root)` (`src/lib/theory/scale.ts:51`), built from `Scale.get("<root> major")`. `ScaleExplorer.svelte` explores that one scale. The persisted fact kinds are `chord-formula`, `interval-size`, `scale-degree`, `scale-formula` (`src/lib/srs/deck.ts:81`), and the last two never reach `/practice` at all, because `familyForCard` returns null for them (`src/lib/practice/practiceQueue.ts:141-150`).

Two assets exist that a chord-scale feature would reuse rather than build: `IntervalRole` already covers all seven degree classes (`src/lib/theory/types.ts:13-20`), and `src/app.css` already defines a fill colour and an on-fill text colour for every one of them, which `PianoKeyboard.svelte` already renders. A seven-note scale can therefore be shown degree-coloured on the existing keyboard with zero new CSS and zero new tokens.

---

## 3. Shape one: the comping loop

### 3.1 What it is

A play-along. The app comps a chord progression on repeat and the player improvises over it. Pick a form (ii V I, I vi ii V, iiø V i), pick a key (12), set a tempo, start, stop. The current bar's chord symbol is shown large, the whole form is shown as a numeral strip with the current bar marked, and the keyboard lights exactly the notes the loop is playing on this bar.

Timing is Tone's `Transport` via `scheduleRepeat` at one measure, and the on-screen bar change is dispatched through Tone's `Draw` so the symbol changes when the chord lands rather than when it was scheduled. A `setTimeout` loop was never an option: it accumulates audible drift within a few bars, and a play-along that drifts is worse than no play-along.

### 3.2 What it deliberately does not do

- **No grading, no scoring, no right answer.** Section 6.
- **No FSRS.** It creates no card, consumes no daily introduction budget, records no answer event, and cannot mark any curriculum unit proven. It is not in `HybridQueueItem`, not a practice family, and not reachable from `/practice`.
- **No progress of any kind.** No session count, no minutes played, no "you have looped 40 bars". A test asserts that a whole start-and-stop cycle writes nothing to localStorage.
- **No MIDI listening.** It does not know or care what the player plays. This is not laziness: hearing the player's notes would immediately raise the question of whether they were the "right" ones, which is the question this feature exists not to ask.
- **No metronome, no count-in, no swing, no bass, no drums, no turnaround fills.** Three controls, and the discipline was to stop there.

### 3.3 What would extend it, in order of value

1. **Loop a single bar (recommended, small).** A "hold this bar" control that repeats the current chord instead of advancing. This is the one extension that is *on mission*: it turns the instrument into voluntary chord-symbol practice, at a tempo the player picks, on the one change he keeps fumbling. Mechanically it is a one-bar `bars` array passed to the same `startCompLoop`, plus a toggle in `CompingLoop.svelte`. No engine work. Keep it ungraded like everything else.
2. **More forms (small, low value).** The engine takes a template; adding a 12-bar blues or a rhythm-changes A section is data in `PROGRESSION_TEMPLATES`. Worth doing only when the player is bored of ii V I, which is a good problem and not today's.
3. **Walking bass (medium, do not build).** Musically it would be a real improvement and pedagogically it is worth nothing: it teaches the player nothing about chord symbols, and it doubles the voicing surface (bass line generation, register collisions with the shell, tempo-dependent note choice). If it is ever built, build it because playing along got boring, and say so.
4. **Drums (do not build).** A drum machine is production value. It would also mean either samples (network payload, a second instrument path) or synthesised percussion (bad), against zero pedagogical return.

### 3.4 What must never happen to it

It must not become a drill. The moment it counts something, the feature inverts: the player stops improvising and starts trying to score. Concretely, three things are prohibited: a session counter, a "notes in key" percentage, and any use of the loop as a unit's proof in the guided path. Unit 11's proof stays the voicing drill (guided-path section 6, unit 11), and the loop is the place the idea is *heard*, never the place it is *scored*.

---

## 4. Shape two: guide-tone lines (build this)

This is guided-path **unit 11**, and this section is the detailed design of that row in its unit table. It does not move it, rename it, or renumber it.

### 4.1 The idea, stated exactly

Over `Dm7 → G7 → Cmaj7`:

- The **7th of Dm7 is C**. It falls a half step to **B, which is the 3rd of G7**.
- The **7th of G7 is F**. It falls a half step to **E, which is the 3rd of Cmaj7**.
- Meanwhile the other voice steps: the 3rd of Dm7 (F) becomes the 7th of G7 (F), the same note held; the 3rd of G7 (B) becomes the 7th of Cmaj7 (B), the same note held.

So the two-note left hand moves as **two voices**, one of which resolves by a half step at every change while the other stays put. That is the whole insight, and it is why two notes sound like music: the ear hears a line resolving, not a pair of intervals being spelled. It also explains, for free, why the 7th is worth keeping in a symbol that has one, which is a question the sevenths lesson raises and never answers.

Precision that matters, because the app got the neighbouring claim wrong once already (2.2): the moving note is the **7th becoming the next chord's 3rd**, never "the same note is a 7th and then a 3rd". C is the 7th of Dm7; the note it moves *to*, B, is the 3rd of G7. Any copy that says "C is the 7th of Dm7 and then the 3rd of G7" is false and must not ship. The half step is a **descent** in a falling-fifths sequence, which is the only sequence this unit teaches.

Second precision, inherited from `6a13ade`: the **tritone claim belongs to the dominant lesson, not here**. In this unit the 3rd and 7th of Dm7 are F and C, a perfect fifth apart, and the 3rd and 7th of G7 are B and F, a tritone apart. The difference between those two shapes is *itself* teachable content (that is what makes the V7 pull), but it must be stated per quality, never as a property of shells in general.

### 4.2 The interaction

A `LessonStep[]` on the existing `InteractiveLesson` shell, once guided-path Phase 2 has parameterised its hardcoded steps and C root. Four steps, one key (C), one progression (ii V I):

1. **Two notes, one chord.** Show `Dm7`, keyboard lit on F and C only, labelled 3rd and 7th. One line: these two say which chord this is.
2. **Watch one note move.** Show `G7` next to it, lit on B and F. The moving voice (C to B) is drawn as a marked descent; the held voice (F to F) is marked as unchanged. The half step is *counted*, not asserted, in the app's existing counting-chip grammar.
3. **Again, same rule.** `Cmaj7`, lit on E and B. F falls to E, B is held.
4. **Now hear it.** Play the three shells in sequence, then hand off to the comping loop pre-set to ii V I in C.

Rendering assets that already exist and should be reused rather than rebuilt: `PianoKeyboard.svelte` already accepts `pendingKeys` (dim a lit key until its own moment), `ghostKeys` (hatch a note that is allowed but not required), and `bassHint` (ring one key). A moving-voice marker is the same shape of prop as `bassHint`: chroma plus octave, an ink ring, not a new colour. `ChordGlyph` carries the symbol. Nothing here needs a new CSS custom property, and nothing needs a new colour, which matters because the four interval colours are fixed app-wide forever.

### 4.3 How it uses the comping loop

The loop is the unit's **ear**, not its grader. Two connections, both small:

1. **The lesson hands off to the loop** with the form and key it just taught, so step 4 lands on a running ii V I in C with the guide tones lit. Mechanically this is a prop on `CompingLoop.svelte` (`initialTemplateId`, `initialKey`) plus a scroll target, or the same lesson-seed localStorage idiom the path already uses. No new channel is needed if guided-path's `PathSeed` union lands first.
2. **The loop gains an optional guide-tone reading of what it is already playing.** It already lights root, 3rd and 7th on the keyboard per bar. The addition is showing *which note moved from the last bar and by how much*, using the same marker as the lesson. That is one derived value (`compVoicing(previousSymbol)` versus `compVoicing(currentSymbol)`, matched by role) and it stays honest because the loop's own voicing is the source.

The connection that must not be built: using loop bars as unit-11 proof. See 3.4.

### 4.4 Cost and dependencies

Depends on guided-path Phase 2 (`InteractiveLesson` takes `steps`) and reads better after Phase 6 (function and ii V I are defined). Adds no `FactKind`, no `Mode`, no Dexie version, and no new practice family. The one copy change it owns is making `voicings.subtract.teach` point at the reason rather than only the rule, in en and fr, which guided-path already assigns to unit 11.

---

## 5. Shape three: chord-scale mapping and modes (defer, then reframe)

*Built: shipped as specified in 5.2, as `ImproviseGuide.svelte` on the Lookup result card, backed by `src/lib/theory/chordScale.ts`. Reference only: no FactKind, no Dexie version, no drill. Iterated in quick-260816-w4h after owner feedback that a greyed note did not say why: the engine now reports which chord tone a careful note rubs and what that tone does in the chord, and `playNotesOverChord` (the one audio engine) holds the chord under a chosen note so the rub is heard rather than read. Rebuilt again in Phase 38 (section 5.5), which is the current specification of the panel's surface; 5.2's product shape and 5.3's constraints are unchanged and still binding. The second surface 5.2 asked for - the optional overlay in the comping loop (also 4.3.2's second connection, read for scales rather than guide tones) - is now built too: a default-off SCALE toggle in `CompingLoop.svelte` hatches the current bar's whole scale on the loop's own keyboard, one line naming it, no audio of its own. It derives through `compBarScale` in `src/lib/practice/compLoop.ts`, which is `improvGuideFor` on the bar's symbol, so both surfaces read the one engine and can never name the same scale differently. Ungraded, no counter, no persistence, per section 6. The Lookup board's optional tap-a-key verdict was considered for the loop and deliberately declined: a bar goes by in a handful of beats, so per-chord prose would be stale before it could be read, and reading is not what the player's hands are doing while comping. The overlay stays display-only.*

### 5.1 What the audit found, and what it implies

Modes are absent (2.3). That is a real hole in a jazz app, and it is also the single easiest place in this project to build the wrong thing. The wrong thing is a seven-unit modes curriculum: ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian, each with a lesson, each with facts, each drilled. That would roughly double the app's persisted catalog (7 modes x 12 tonics = 84 new scale facts before any drill exists to reach them, on top of 84 `scale-degree` facts that already cannot reach `/practice`), and it would fail the discipline test in section 1: naming a mode does not shorten the distance between a chord symbol and the left hand.

### 5.2 The shape that is worth building

**One question, answered per symbol: "what can I play over this?"** Not seven modes. One mapping, surfaced where chord symbols already live.

- `Cmaj7` -> C major (ionian). `Dm7` -> D dorian. `G7` -> G mixolydian. `Bm7♭5` -> B locrian. `Bdim7` -> a symmetric scale, and the honest answer for a beginner is the chord tones plus caution.
- The mode name is a **label on the answer**, not the lesson. The lesson is: the scale that fits a symbol is the major scale of the key the chord came from, started on the chord's own root. Learn one fact, get all seven.
- Surface: a **reference** block, attached to Lookup (`/`) rather than the path, plus an optional overlay in the comping loop showing the current bar's scale degree-coloured on the keyboard. Lookup is where a symbol is already being decoded, and "what do I play over it" is the next question in the same breath.

That framing is deliberately the same argument guided-path makes for unit 14 (section 11.1.1 of that doc): for the harder vocabulary, the honest real-world answer is a strategy, not memorised spellings. Here the strategy is "the parent major scale, started on the chord's root", and it costs one idea instead of seven.

### 5.3 What it depends on

1. **A minor-mode scale generator.** `scale.ts` currently knows `major` only. Chord-scale needs at least the parent-major-plus-offset walk, which tonal already does (`Scale.get("D dorian")`), so this is a small addition to `scale.ts` plus its `DEGREE_ROLES` mapping. Note the degree roles would need care: in D dorian the 7th is C, which is the *scale's* 7th degree, and the existing `DEGREE_ROLES` array assumes ascending degrees from the tonic, which still holds. No new role values.
2. **Guided-path unit 3 (scale degrees) and unit 8 (which chords live in a key), shipped first.** The whole mapping is "the chord's parent key, started on the chord's root". If the player does not yet own degrees and diatonic qualities, the mapping is a lookup table to memorise rather than a consequence to understand. Building this before unit 8 would be building the thing this document argues against.
3. **A decision on where reference material lives**, which guided-path already flagged as open (its section 11.1.2). If the Reference block moves off `/learn` and onto `/`, chord-scale belongs with it. If it stays, chord-scale is a Reference row on `/learn`. Either is fine; what is not fine is a fifth hub.
4. **No new FactKind, no new Mode, no Dexie version, if it ships as reference.** The moment it ships as a drilled unit, it costs a catalog expansion, and that expansion should be argued on its own rather than smuggled in with a reference.

### 5.4 If it is ever drilled

The only drillable version I would defend: **given a chord symbol, tap the one note that is NOT in the scale that fits it.** That is a chord-symbol question with a single unambiguous answer, it is gradable, and it reuses the existing keyboard-tap construction interaction. Naming modes is not gradable in any way that matters, because the name is not the skill.


### 5.5 The Phase 38 rebuild: an instrument, not a page

The first two versions answered the question correctly and delivered the answer as prose. The owner's verdict, in his words: *"c'est interessant, ce qui est note, mais pas forcement tres visuel, notamment avec les cases grisees"*, *"il y a beaucoup de textes alors que c'est quelque chose de musical"*, and, decisively, *"tu parles de parentheses, mais je ne les vois pas"*.

He was right on all three, and the third was literally true. The keyboard marked a careful note by wrapping its tension label in parentheses, rendered at **8px in `--color-faint`** (`PianoKeyboard.svelte`). `app.css` documents that token as decorative-only and below the text floor. So the sole visual difference between "add this colour" and "this one fights the chord" was two glyphs in a colour the design system forbids for text, while a legend string pointed straight at them. A text that points at an invisible thing is worse than no text.

**What the panel is now.** One question, one board, one caption.

1. **The scale choice** stays, rebuilt in the app's own labelled-chip-group idiom (a mono field label over `Button` chips, vermilion when picked) rather than a bare row: the same control grammar as the comping loop's FORME / TON / TEMPO.
2. **One primary action: "play the scale over the chord".** The chord is struck once and HELD (`playNotesOverChord`'s `sustainChord`) while the scale walks over the top, each note lighting on the board as it sounds (`onStep`). Ten seconds, no reading, and the sound matches what the copy has always claimed the left hand is doing.
3. **Tap any key and hear the verdict.** The keyboard is the input: tapping sounds that note over the held chord and fills ONE caption slot with what it is. Any key, not only the offered ones: `verdictForLetter` extends the engine's single clash rule past the scale, so a player who tries a note the panel never mentioned still gets a specific answer instead of silence.
4. **The prose is a caption, revealed on demand.** Every sentence PR #75 wrote survives; what changed is that the player sees the one that applies to the note he just heard, with the nuance ("not forbidden, fine in passing") behind a fold. The panel went from about 1385px of printed explanation to about 610px of instrument.

**The board's visual language**, which is where the whole complaint lived. Three treatments, no fifth colour:

| Meaning | Treatment |
|---|---|
| Chord tone | The interval-role fill and badge, unchanged |
| Colour tone | Ghost hatch plus its tension marker |
| Handle with care | Ghost hatch plus a **vermilion bar along the key's playing edge** and a vermilion marker |
| Outside the scale (the blue note) | Ghost hatch plus a **dashed outline** |

Vermilion is the app's standing attention accent (the retry line, the active lesson rail), not a new colour, and the dashed outline is the drafting convention for "borrowed, drawn anyway". The shared ghost marker also moved from 8px `--color-faint` to 10px bold `--color-muted`, which clears the contrast floor and improves the voicing drill's own R/5 markers for free.

**And the clash is drawn, not just asserted.** Selecting a careful note rings it in ink and rings the chord tone it rubs in vermilion (`focusKeys`), so "F sits one half step above E" is two neighbouring keys lit at once. The board dropped to **one octave** for this: with a root-position chord the second octave carried no chord tones, so hatching it repeated every marker with nothing to relate them to and would have put a vermilion clash ring on a blank white key.

**Accessibility.** Audio-first is not audio-only: the caption is the visible equivalent of everything the ear is taught, every key is a real button reachable by keyboard, and the walk deliberately suppresses the caption's prose and its live region while running (seven explanations flickering past unread, and seven queued announcements, help nobody) while every note it sounds stays individually tappable.

**What did not change.** The theory engine's derivations are untouched: the single half-step-above-a-chord-tone rule, the colliding-degree naming, the `fineOn` dominant/blues context, the blue note and its either-side qualification including the C6 case. `verdictForLetter` is additive and reuses the same rule rather than inventing a second one. No new audio path, no new dependency, no new colour token, and the panel is still reference only.

### 5.6 The voicing drill's two menus

Separate complaint, same session: *"ce n'est pas encore tres clair car il y a deux genres de menus. Ca casse un peu l'UX ... ca ne correspond pas vraiment a la direction artistique du reste du projet."*

`ShellVoicingDrill.svelte` had a hand-rolled 1px segmented stage bar (Voir / Retirer / Exo, ink-filled when active) and, two rows below it, a second row of hand-rolled 1px boxes for the voicing nudges. Two menus of equal visual weight, in a style used nowhere else: the rest of the app draws controls with 2px ink borders, an offset ink shadow, and vermilion for the selected one.

Both are now `Button` chips in the app's labelled-chip-group idiom, and the hierarchy the pair was missing is structural rather than stylistic:

- **Above a 2px rule**, alone, labelled `ÉTAPE`: the stage chips, which choose WHICH exercise.
- **Below the rule**, inside the exercise: the voicing readout with its two adjustments on the same line, so they read as two verbs acting on a stated voicing rather than as a second menu. Same shape as the comping loop's tempo row.

A side effect worth keeping: the French step labels no longer have to fit a fixed-width segment, so `3 EXO` became `3 Exercice`.

---

## 6. The honest part: improvisation cannot be graded

### 6.1 The claim

There is no correct answer to "what should I play over Dm7", so there is nothing to mark right or wrong, so there is no rating to feed FSRS, so there is no `masteryDayCount`, so there is no `deriveCellState`, so there is no mastery signal. This is not a limitation of the implementation. Any grader would be a lie: a "notes in key" percentage would score `C♯` over `Dm7` as wrong when it is a perfectly good passing tone, and a "did you play the guide tones" check would score a great melodic idea as a failure. A dishonest grader is worse than none, because this app's whole credibility rests on its theory claims being true, and it has already had to fix two false ones (`6a13ade`).

### 6.2 What that means for the app's structure

**Two kinds of surface, separated by route, with different contracts.**

| | Trainer | Instrument |
|---|---|---|
| Lives at | `/practice` (and the drills it composes) | `/learn` |
| Bounded by | FSRS due dates, the daily round | nothing. You stop when you stop. |
| Produces | a grade, a card update, a mastery signal | sound |
| Ends | yes, and saying "round complete" is the point | no, and that is the point |
| Can prove a unit | yes | never |

The consequences are concrete and worth writing down before someone tries to unify them:

1. **The companion never enters the practice queue.** Not as a family, not as a synthetic item, not as a seeded prefix. `HybridQueueItem` stays four shapes.
2. **A unit is never proven by an instrument.** Guided-path proves synthetic units with a completed-round counter (`proofCounts`, its section 4.3). A loop has no rounds, so it cannot be counted honestly, and a "minutes played" counter would be a participation trophy. Unit 11 is proven by the voicing drill.
3. **The instrument gets no streak, no counter, no badge.** This is the same discipline that makes `StreakBadge` self-hide at zero and makes `zeroStreak` copy read identically for a first visit and a lapsed 40-day run (`src/lib/copy/streak.ts:11-16`). Counting improvisation minutes would import exactly the guilt mechanics the app spent a phase removing. The honest reward for playing along is that it sounded good.
4. **Its copy must not borrow drill grammar.** No "correct", no "try again", no "not quite". The shipped intro says so out loud: nothing is graded, nothing is scored, there is no right answer.

### 6.3 So does a companion belong in a spaced-repetition trainer at all?

Yes, and the reason is the specific user, not a general principle.

He can already play. He reads Beethoven, he sight-reads, his hands are not the problem. Every other surface in this app tests him, and the thing he actually lacks is not retrieval speed on `Cm7`; it is ever having *used* the theory for its purpose. An app that only tests him is an app that only ever tells him what he does not know. The trainer builds the vocabulary and the companion is the only place the vocabulary is spent. Without it the app is a flashcard deck about jazz. With it, the deck has a reason.

There is also a retention argument that does not require a metric to be true: the loop is the cheapest possible reason to open the app on a day when nothing is due. It does not need to be measured to work, and measuring it would break it.

The boundary I would defend if pressed: **at most a small number of instruments, and they never mediate progress.** One loop today. Perhaps, later, one guide-tone reader attached to it. Not a jam-track library, not a backing-track generator, not a repertoire player. The instant the companion becomes the larger half of the app, the app has changed into something else, and it should be an explicit decision if it does.

---

## 7. Consistency with the guided path

| Guided-path element | This document's position |
|---|---|
| Unit 11, guide tones and voice leading | Section 4 is its detailed design. Same number, same title, same idea, same proof drill (the voicing drill), same copy fix (`voicings.subtract.teach` in en and fr). |
| Soft gating, one recommended unit | Untouched. The comping loop is not a unit and is not gated at all. |
| Completion derived from FSRS, no Dexie version | Untouched. Nothing here writes a card or a version. Shape 3 stays reference-only precisely so this holds. |
| `/learn` becomes the ordered path plus a Reference section | The comping loop is a **third** kind of block on `/learn`: not a unit, not reference, an instrument. When the path lands, it should sit above the ordered list or beside it, still first-screen, and it must not be given an index number. |
| The one-line "new in Learn" cue on `/practice` | The loop must never advertise itself there. That cue is for units. An instrument that nags is a drill. |
| Unit 14, chart vocabulary, lookup-plus-strategy recommended | Shape 3 uses the identical argument (a strategy beats memorised spellings for the long tail) and is sequenced after unit 8, so it does not compete with unit 14 for the same decision. |
| 14 units, no fifteenth | Shape 3 does **not** add unit 15. If the owner later wants modes taught rather than referenced, that is a new decision and should be argued then. |

The one place this document takes a position guided-path did not: the loop leads `/learn` today, above the lesson scroll, because it is the one block on that page you open with the intent to *use* it at the piano, and burying it under seven lesson sections means scrolling past all of them on a phone every time. When the path rewrites the page, that placement should be re-argued rather than inherited by accident.

---

## 8. Risks and open questions

### 8.1 Needs the owner's decision

1. **Should the loop hear the piano?** Web MIDI is available on the desktop path and the app already wraps it. A loop that listens could show what you played against the changes *after the fact*, with no score. I did not build it and I lean against it: the moment the app draws your notes, "how did I do" becomes the question, and the only honest answer is a shrug. But it is the most interesting unbuilt idea here, and it is his call.
2. **Single-bar loop now or later?** Recommended in 3.3 and genuinely small. It is the one extension that makes the instrument teach.
3. **Where does chord-scale live: Lookup or Learn Reference?** Tied to guided-path's own open question 11.1.2. Answer both at once.

### 8.2 Decided here, no input needed

- No grading, no scoring, no FSRS, no card, no counter, ever, for anything in this document's shape one.
- Guide tones are guided-path unit 11 and are not a separate feature.
- Modes are not a curriculum. If they ship, they ship as labels on a chord-scale answer.
- The loop's tempo range and comp voicing are settled (2.1) and should not be turned into settings.
- Walking bass and drums are out of scope until playing along has become boring, which would be a good sign.

### 8.3 Real risks

- **Feature creep into a backing-track app.** Every extension in 3.3 is individually reasonable and collectively a different product. The check in section 1 is the defence: if it does not shorten symbol to left hand, it does not ship.
- **The guide-tone marker fighting the interval colours.** The four interval colours are fixed app-wide forever, and a moving-voice indicator must be neutral ink (a ring, a hatch), following `bassHint`'s precedent. A fifth colour would break a rule that has held since Phase 1.
- **Restating the corrected shell rationale wrongly.** Unit 11 sits directly on top of the sentence that was false one commit ago. Anyone writing that copy should read `6a13ade` first, and every claim about the 3rd-to-7th interval must be per quality, never general. The relevant test locks already exist in `src/lib/practice/shellVoicing.test.ts` and `src/lib/components/shellVoicingDrill.test.ts`; extend them rather than writing fresh ones.
- **A modes catalog expansion arriving by accident.** 7 modes x 12 tonics is 84 facts and roughly 8 days of introduction budget at `MAX_NEW_CARDS_PER_DAY = 10`, on top of a `scale-degree` set that still cannot reach `/practice` (`practiceQueue.ts:141-150`). Fix that routing gap before adding any scale facts, or the new ones will be introduced and then be unreachable too.
- **The loop being asked to prove something.** The most likely future mistake, because guided-path's `proofCounts` mechanism makes counting rounds cheap. There are no rounds. Say no.

### 8.4 Claims here that are inferred rather than verified

- That a single-bar loop is "a one-bar `bars` array plus a toggle". Read from the shipped `startCompLoop` signature, not built.
- That tonal's `Scale.get("D dorian")` returns a 7-note ascending set that maps cleanly onto the existing `DEGREE_ROLES`. Consistent with how `majorScaleNotes` uses tonal, but not exercised.
- The estimate "roughly 8 days of introduction budget" for a modes catalog. Arithmetic from 84 facts at 10 per day, not observed.
- That the owner would use a listening loop. Genuinely unknown, which is why 8.1.1 is a question and not a recommendation.
