# Music Learn — Jazz Piano Theory Companion

## What This Is

A personal web app that teaches jazz piano theory to a returning classical pianist. Three milestones in, it is a bilingual (EN/FR), installable PWA combining a chord lookup companion, two-way drills on an on-screen keyboard, an FSRS spaced-repetition memory trainer with multi-modal recall (see-play, hear-name, formula-build), guided theory lessons, song-provenance-aware practice, and contextual learning drills (ii-V-I progressions, shell voicings, confidence calibration). Built for a single user: someone who plays Moonlight Sonata and sight-reads, whose theory started at beginner level.

## Core Value

Chord symbol fluency: see a jazz chord symbol like `Cm7` or `F♯ø7` in sheet music and know instantly what notes to play with the left hand — without stopping to think.

## Current State

**v2.1 Playability & Comprehension shipped 2026-07-21** (12 phases: keyboard everywhere, audio reveals, hint ladder, song provenance, interactive theory, full French, drills polish, PWA, phone-first UX, mobile fixes, contextual learning). Live at the Oracle-server deployment; 1450 tests green, svelte-check clean.

**Deferred at close (see STATE.md Deferred Items):** on-device UAT for phases 09/23, PWA install/haptics verify, From-my-songs filter placement todo, phase 21/25 visual eyeballs.

**Previous milestones:** v1.0 Chord Fluency Core (shipped 2026-07-13), v2.0 Learning Upgrade (shipped 2026-07-15). History: `.planning/milestones/` and MILESTONES.md.

## Current Milestone: v2.2 Hub Consolidation + Interval Theory

**Goal:** Collapse 10 flat routes into 4 clear hubs and add a shared interval view so any chord shows both its stacked-thirds and its formula, with no regression in drills, SRS, stats, or song filtering.

**Target features:**
- 4-hub navigation (Lookup / Practice / Learn / Progress) replacing 10 flat links, on desktop nav and phone tab bar; showcase route deleted; old routes become thin redirect shims for one release.
- Shared IntervalView component (stacked-thirds default + formula toggle), embedded in both Lookup and Learn, computed from existing tonal chord data.
- Practice hub: one smart SRS session hosting all five drill generators (name-it, build-it, voicings, intervals, progressions) in a single interleaved queue, no mode-picker, song filter still steers, single-type-due quality gate.
- Learn hub: theory lessons merged with Scales Explore content + interval reference.
- Progress hub: progress + recall + songs merged into one surface.

**Source:** approved design at `docs/superpowers/specs/2026-07-24-hub-consolidation-design.md`. UI + routing restructure only — no data-schema migration, no new theory data source.

## Next Milestone Goals

Candidates for after v2.2:
- Phase 4 carry-over: MIDI play-to-answer (needs hardware-in-the-loop)
- `.planning/v2.1-IMPROVEMENT-BACKLOG.md` items (e.g. sketch 018 tempo-fluency metronome drill I-03)
- Deferred on-device verification batch

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

- [ ] Drill answers via connected MIDI digital piano (Web MIDI) — Phase 4, deferred until hardware-in-the-loop testing is possible

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
*Last updated: 2026-07-24 — v2.2 Hub Consolidation + Interval Theory milestone started*
