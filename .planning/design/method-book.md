# Design: the method book

**Status:** partially built. The chapter template and chapter 15 ship; chapters 16 to 26 are follow-ups (section 5).
**Date:** 2026-10-18 (decisions taken 2026-10-17)
**Companion docs:** `.planning/design/guided-path.md` (the 14-unit spine) and `.planning/design/improvisation.md` (trainer vs instrument). Where they touch, the guided path wins.
**Copy rule:** no em or en dashes in user-facing strings.

---

## 1. The idea

The owner asked for exercises to play at the piano and for extracts from real jazz tunes, "like a book for learning music". The app already teaches the first third of a jazz piano method book (theory, two-note shells, guide tones, ii-V-I). What it lacked is what makes a method book one: **the same move practised in all 12 keys, applied to real tunes, with a practice plan per topic.**

So `/learn` grows chapters instead of a second structure. The guided path's units 1 to 14 keep their ids and become **Part I, Reading the chart**. New chapters are numbered from 15:

- **Part II, The left hand** (15 to 20): one voicing or harmonic move per chapter, always in all 12 keys.
- **Part III, Both hands, and time** (21, 22).
- **Part IV, Lines** (23 to 26): right-hand material. Not approved yet (section 4).

## 2. The chapter template

Every chapter page has four blocks, in this order (`src/lib/components/Chapter.svelte`, data in `src/lib/path/chapters.ts`, route `/learn/[chapter]`):

1. **Concept.** One idea in one sentence (the chapter's `ideaKey`, also its row line on `/learn`), a short paragraph, one interactive picture.
2. **At the piano.** One exercise embedded on the page, marked **CHECKED** (the app grades every step) or **GUIDED** (the app plays and shows it, the player judges). Exercises live on the chapter page and never become a `/practice` family: a 36-chord key cycle would swamp the bounded daily round (AGENTS.md, synthetic families must stay capped). Only a repertoire "Drill these chords" reaches `/practice`, through the existing drill-seed channel.
3. **In the repertoire.** One or two real tunes where the move lives: title, composer, year, a bar strip of changes with roman numerals, one line of analysis, and two actions on existing channels: "Play over it" (`compSongSeed.ts`, the comping loop) and "Drill these chords" (`drillSeeds.ts`).
4. **Practice checklist.** Three to five lines. "The app ticks this" lines are ticked by the exercise (read-only to the player); "You tick this" lines are self-check boxes.

Concept and exercise are per-chapter components mapped from the chapter id in the route; repertoire and checklist are data, rendered alike for every chapter.

## 3. Decisions (owner, 2026-10-17, on the recommended defaults)

1. **Scope:** build Parts II and III. Part IV is decided after chapter 15 has been used.
2. **Melody display:** a hand-drawn SVG staff for 4-to-8-bar excerpts, no notation library. Needed from chapter 21.
3. **Checklist ticks:** persist per device in the guided path's own record (`music-learn:path`, `src/lib/path/pathState.ts`, field `checklist`), and are never aggregated: no count, no fraction, no badge, read by no other surface. This is how they honour the instrument rule (`improvisation.md` 6.2.3) while still being a practice plan that remembers itself.
4. **Time:** chapter 22's comping rhythms live only in the live-code Strudel panel; the comping loop stays byte-identical. No timing grading (the app records no note timestamps).
5. **Numbering:** units keep their ids; new chapters are numbered from 15.

## 4. The copyright rule (every chapter)

1. **Chord changes, titles and bar analysis: always allowed**, for any tune of any date. Changes are facts (same stance as `presets.ts`).
2. **Melodies: only US public-domain compositions published 1929 or earlier**, 4 to 8 bars, notated from the original published edition, never from a later arrangement, fake book or recording.
3. **No lyrics**, even for public-domain tunes.
4. **Tunes from 1930 on: title, changes and analysis only.** `TuneExcerpt.rights` is `'changes-only'` and the type carries no melody field; adding one is chapter 21's job and must stay gated to pre-1930 tunes.
5. **Licks and lines: original**, never transcribed from a recording. A generic technique (an enclosure, a So What shape, a Charleston rhythm) is fine.
6. **Sound: synthesized or the app's own samples only.**

This is the US rule. Under EU life-plus-70 several of those melodies are still protected (W. C. Handy died 1958, Spencer Williams 1965, Maceo Pinkard 1962); re-check per composer before the app is ever published openly to EU users. Changes and original lines are unaffected.

## 5. Chapter 15, shells in every key (shipped)

- **Idea:** root at the bottom, then the 3rd and the 7th in either order; pick the order that keeps the hand still.
- **Concept:** the ii V I of Autumn Leaves in B♭ as three rooted shells, alternating the two positions (`ShellsConcept.svelte`).
- **At the piano (CHECKED):** `ShellCycleDrill.svelte` over `src/lib/practice/shellCycle.ts`. ii-V-I, then iiø-V-i, in all 12 keys in the fixed cycle-of-fourths order of `SHELL_CYCLE_KEYS` (the app's one cycle-of-fourths key list; the queued circle-of-fifths drill should read it rather than define a second). Each chord is graded by the inversion drill's rule (`matchInversion`): the chroma set of root + `shellNotes` (so the ♭5 joins on m7♭5) and the root as the lowest note. A key is clean when its three chords pass on the first Check with no Show me; 12 clean keys tick the form's checklist line.
- **Repertoire:** Autumn Leaves (1945, changes only, bars read from the preset): a ii V I in B♭ then a iiø V i in G minor. All the Things You Are (1939, changes only), bars 1 to 5: five roots rising by fourths.

## 6. Follow-ups, not built

- **Part I conversion:** units 1 to 14 onto the template, with repertoire boxes for units 8, 9, 10, 11, 13, 14 (existing presets, changes only). Best done with guided-path Phases 1 and 2, which also turn `/learn` into the ordered path; the chapter row on `/learn` then becomes one of its rows.
- **Unit 11's "At the piano":** the ii V guide-tone cycle in all 12 keys, merged with the queued guide-tone Strudel lesson.
- **16, the 12-bar blues** and **17, secondary dominants and turnarounds:** templates as data in `PROGRESSION_TEMPLATES`, plus the first public-domain tunes as changes (St. Louis Blues 1914, Sweet Georgia Brown 1925, Basin Street Blues 1928, Ain't Misbehavin' and Honeysuckle Rose 1929). Check each against its original edition first.
- **18, rootless A and B voicings:** a real `rootlessAB(chord, form)` with the 9th (today's `rootlessNotes` is chord minus root), graded as set plus bottom note.
- **19, tritone substitution** (templates need a chromatic root offset) and **20, sus chords and fourths.**
- **21, melody on top, shell underneath:** the SVG staff (decision 2) and the first melody excerpts.
- **22, comping rhythms:** Strudel panel only (decision 4).
- **23 to 26, lines:** only after the Part IV decision.
