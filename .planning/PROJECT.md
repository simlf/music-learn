# Music Learn — Jazz Piano Theory Companion

## What This Is

A personal web app that teaches jazz piano theory to a returning classical pianist. Three milestones in, it is a bilingual (EN/FR), installable PWA combining a chord lookup companion, two-way drills on an on-screen keyboard, an FSRS spaced-repetition memory trainer with multi-modal recall (see-play, hear-name, formula-build), guided theory lessons, song-provenance-aware practice, and contextual learning drills (ii-V-I progressions, shell voicings, confidence calibration). Built for a single user: someone who plays Moonlight Sonata and sight-reads, whose theory started at beginner level.

## Core Value

Chord symbol fluency: see a jazz chord symbol like `Cm7` or `F♯ø7` in sheet music and know instantly what notes to play with the left hand — without stopping to think.

## Current State

**v2.3 Beginner On-Ramp & Inversions shipped 2026-07-28** (6 phases: counting-chip grammar, voicing lean flow, progression hint ladder + beginner keyboard, inversion drill family, cold-session queue ordering, no-regression gate). Since then a large quick-task batch landed on main (#47-#66): tiers 5/6 unlocked (14 chord qualities), interval naming unit, guide tones unit, mic input for build-it, slash-chord lookup, scale degrees in the curriculum, SRS engine consolidation. Live at the Oracle-server deployment; 1600+ tests green, svelte-check clean.

**Deferred at close (see STATE.md Deferred Items):** on-device visual UAT batches for phases 27 (hubs), 34 and 35 (partial); redirect-shim cleanup follow-up.

**Previous milestones:** v1.0 (2026-07-13), v2.0 (2026-07-15), v2.1 (2026-07-21), v2.2 (2026-07-25), v2.3 (2026-07-28). History: `.planning/milestones/` and MILESTONES.md.

## Current Milestone: v2.4 Real Piano & Real Songs

**Goal:** Close the loop to real playing: drill the chords of your own songs, in sheet order, answered on the real digital piano over Web MIDI, with FSRS progress synced across devices.

**Target features:**
- Web MIDI play-to-answer (the historic Phase 4 carry-over): answer chord/inversion/voicing drills by playing on the USB digital piano. Progressive enhancement (Chrome-family only); the on-screen keyboard stays a first-class path. Grading already chroma-based, so MIDI note-on feeds the same `matchChord` seam.
- Song play-through: a per-song action that drills the song's `chordSymbols` in sheet order (repeated ii-V-Is kept, no dedupe), riding the existing seed channel and practice session engine.
- FSRS deck sync across devices: the Dexie deck (cards + review state) syncs through the existing Fastify/SQLite backend so phone and laptop stop diverging. Local-first stays: the deck works offline, sync reconciles.

**Deferred from this scope:** tempo fluency (latency-aware grading / metronome drill) stays top of backlog.

## Next Milestone Goals

Candidates for after v2.4:
- Tempo fluency (sketch 018 / I-03): latency-aware grading or metronome drill, `questionClock.ts` groundwork exists
- Minor keys: minor scales + minor ii-V-i progression templates (gives `ø7` its home context)
- Deferred on-device verification batch; redirect-shim cleanup; ESLint + CI lint

**Locked constraints (still binding for all future phases):** grade notes by chroma/MIDI never letter strings; ear-naming is multiple-choice and never gates progress; local-first persistence; no em dashes in copy; keyboards render inline, never in a fixed dock. See `.claude/skills/spike-findings-music-learn/` and `.claude/skills/sketch-findings-music-learn/`.

## Requirements

### Validated

- ✓ Progress persists between sessions: backend answer history, per-item stats, weakest shortlist, daily streak — v1.0 (Phase 8)
- ✓ Interactive drills for chord spelling and recognition with instant elaborative feedback — v1.0 (Phase 3)
- ✓ Drill answers via on-screen clickable keyboard — v1.0 (Phase 3)
- ✓ Practice companion / chord lookup with notes + keyboard diagram, usable mid-song — v1.0 (Phase 2); left-hand voicing depth added by v2.1 /voicings (Phase 25)
- ✓ Dual note naming: letters primary, Do-Ré-Mi alongside — v1.0 (Phase 1)
- ✓ Deployed website accessible from any device (HTTPS on Oracle server, tailnet) — v1.0 (Phase 9); installable PWA — v2.1 (Phase 22)
- ✓ "Print Shop" visual identity with app-wide interval color language — v1.0 (Phase 1)
- ✓ Scale drills: all 12 major scales on a tonic-anchored keyboard, chroma-graded — v2.0 (Phase 10)
- ✓ Smart practice: real FSRS spaced repetition, card = (fact, mode), weakest-stability rotation — v2.0 (Phases 11, 13)
- ✓ Theory lessons explaining the why: Build-it construction (earn each note from its formula) + guided interactive lessons handing off into drills — v2.0 (Phase 12), v2.1 (Phase 19)
- ✓ Learning-science drill design: interleaving, fading scaffolds (staged-by-card-state), elaborative feedback, confidence calibration — v1.0 (Phase 3), v2.0 (Phase 13), v2.1 (Phases 21, 25)
- ✓ French translation: header EN|FR toggle, full i18n layer — v2.1 (Phase 20)

### Active

- [ ] Drill answers via connected MIDI digital piano (Web MIDI) — v2.4 (finally lands the historic Phase 4 carry-over)
- [ ] Drill a song's chords in sheet order via a per-song play-through action — v2.4
- [ ] FSRS deck (cards + review state) syncs across devices through the existing backend — v2.4

### Out of Scope

- Multi-user accounts / social features — personal tool for one user; bearer-token auth is enough
- Full sheet music rendering or lead-sheet playback — the user reads from paper (the /progressions lead-sheet strip renders symbols, not notation)
- Full ear training — hear-name recall mode shipped as multiple-choice-only and never gates; deeper audio recognition stays out
- Modes and upper-structure voicings — shells and rootless shipped in v2.1; upper structures wait until fundamentals stick
- Native mobile app — installable PWA covers it

## Context

- **User profile:** Played piano as a kid, restarted early 2026 after ~10 years. Plays classical (Moonlight Sonata 1st mvt), decent sight reading. Theory grew from beginner via daily app use.
- **The trigger:** Jazz songs from full sheet music with chord symbols; left-hand chords were the blocker.
- **Equipment:** Digital piano with USB/MIDI out — Web MIDI play-to-answer still pending (Phase 4).
- **Language:** User is French — thinks in Do-Ré-Mi; app bridges solfège to letters, and since v2.1 speaks full French.
- **Usage pattern:** Short sessions before/after piano practice; quick-start drills + phone-first UX serve the habit loop.
- **Codebase:** SvelteKit 2 / Svelte 5 static app + small Fastify/SQLite progress API; tonal, ts-fsrs, Dexie, Tailwind 4; 1450 tests (vitest), deployed via docker compose + manual GH Actions workflow.

## Constraints

- **Audience**: Single user (the builder) — no accounts/billing/multi-tenancy complexity
- **Hardware**: Web MIDI support planned (Chrome-family) with the on-screen keyboard as a first-class non-MIDI path (shipped)
- **Deployment**: Reachable from multiple devices — Oracle server, docker compose, HTTPS via tailnet
- **Scope discipline**: chord symbol fluency stays the center; scales and deeper theory support it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chord symbol fluency is the v1 priority | #1 blocker when playing jazz from sheet music | ✓ Good — drove Phases 1-3 ordering, core value held across 3 milestones |
| Both MIDI and on-screen input for drills | Piano isn't always next to the computer | ⚠️ Revisit — on-screen shipped and carries everything; MIDI (Phase 4) still deferred |
| Letters primary, solfège alongside | Jazz symbols are letter-based; familiar bridge | ✓ Good — dual naming app-wide since Phase 1 |
| Spaced repetition deferred to v1.x, then ts-fsrs in v2.0 | Don't build scheduling before real answer history exists | ✓ Good — FSRS engine (card = fact x mode) became the app's backbone |
| Deployed website over local app | Accessible at piano and phone | ✓ Good — plus PWA install in v2.1 |
| Backend on user's Oracle server + SQLite | One shared progress history; user owns the server | ✓ Good — Fastify + better-sqlite3 via docker compose since Phase 8/9 |
| Shared-secret bearer token auth | Single user, internet-facing | ✓ Good — timing-safe compare, threat-verified |
| "Print Shop" artistic direction | User choice after comparing directions | ✓ Good — serif ChordGlyph + stamp-in are locked house references |
| Interval color language | Color encodes chord structure app-wide | ✓ Good — 4 reserved tokens never repurposed |
| Grade by chroma/MIDI, never letter strings | Enharmonics break letter equality | ✓ Good — locked constraint; caught real bugs (WR-01 in Phase 25) |
| Keyboards inline, never fixed-docked | Phase 15 dock built then rejected as intrusive | ✓ Good — house rule since; saved Phase 25 layouts |
| Rich pedagogy only while card is NEW/LEARNING | Scaffold fades with mastery (sketch 005 → 019) | ✓ Good — staged-by-card-state now a reusable pattern |
| Sketch-first design (throwaway HTML before phases) | Cheap divergence, locked winners before implementation | ✓ Good — 20 sketches drove phases 15-25 with zero design rework |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-03 — v2.4 Real Piano & Real Songs milestone started*
