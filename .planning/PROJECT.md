# Music Learn — Jazz Piano Theory Companion

## What This Is

A personal web app that teaches jazz piano theory to a returning classical pianist. It combines interactive drills (answerable on a connected MIDI piano or an on-screen keyboard), readable theory lessons, and a practice companion for decoding chord symbols found in real sheet music. Built for a single user: someone who can play Beethoven's Moonlight Sonata (1st movement) and sight-read, but whose music theory is beginner-level.

## Core Value

Chord symbol fluency: see a jazz chord symbol like `Cm7` or `F♯ø7` in sheet music and know instantly what notes to play with the left hand — without stopping to think.

## Requirements

### Validated

- ✓ Progress persists between sessions: raw answer history on the backend, per-item stats, weakest shortlist, daily streak (progress view + masthead chip) — Phase 8 (spaced-repetition scheduler itself remains deferred to v1.x per Key Decisions)

### Active

- [ ] Interactive drills for chord spelling and recognition (e.g., "play Dm7", "what notes are in Cmaj7?") with instant feedback
- [ ] Drill answers via connected MIDI digital piano (Web MIDI) — site listens and verifies what's played
- [ ] Drill answers via on-screen clickable keyboard (fallback when away from the piano)
- [ ] Theory lessons explaining the "why": intervals, chord construction, what symbols like 7, maj7, m7, ø, °, 9 mean
- [ ] Scale drills and lessons — all major scales (with fingerings), beyond the one (G major) currently known
- [ ] Practice companion / chord lookup: enter a chord symbol, see notes, keyboard diagram, and left-hand voicing suggestions — usable next to the piano while playing real songs
- [ ] Smart practice: spaced repetition that tracks wrong answers and drills weak chords/scales more (v1.x — persistence foundation shipped in Phase 8)
- [ ] Dual note naming: letters (C, D, E) primary to match jazz notation, Do-Ré-Mi solfège shown alongside as a bridge
- [ ] Deployed as a website accessible from any device (laptop at the piano, phone elsewhere)
- [ ] "Print Shop" visual identity with a memory-supporting interval color language (root/3rd/5th/7th consistently colored app-wide)
- [ ] Learning-science drill design: interleaved practice by default, fading label scaffolds, elaborative wrong-answer feedback

### Out of Scope

- Multi-user accounts / social features — personal tool for one user; keep auth trivial or absent
- Full sheet music rendering or lead-sheet playback — the user reads from paper; the site supports understanding, not score display
- Ear training / audio recognition — valuable later, but v1 is about visual symbol → keyboard fluency
- Minor scales, modes, and advanced jazz voicings (rootless, shells, upper structures) as v1 requirements — start with major scales and basic chord qualities; add depth once fundamentals stick
- Native mobile app — responsive web is enough

## Context

- **User profile:** Played piano as a kid, restarted in early 2026 after ~10 years without lessons. Plays classical pieces (Moonlight Sonata 1st mvt), decent sight reading, very low music theory / solfège knowledge. Only fluent scale is G major.
- **The trigger:** Started playing jazz songs from full sheet music that includes chord symbols. Struggles with left-hand chords because the notation and the theory behind it are unclear.
- **Equipment:** Digital piano with USB/MIDI out — can connect to a browser via Web MIDI for play-to-answer drills.
- **Language:** User is French — thinks in Do-Ré-Mi solfège; the site bridges solfège to the letter names jazz notation uses.
- **Usage pattern:** Short sessions before/after real piano practice; the daily-habit goal means low-friction, quick-start drills matter.

## Constraints

- **Audience**: Single user (the builder) — no need for accounts, billing, or multi-tenancy complexity
- **Hardware**: Must support Web MIDI (Chrome-family browsers) for piano input, with a full non-MIDI fallback
- **Deployment**: Deployed website reachable from multiple devices — hosting should be simple and cheap/free
- **Scope discipline**: v1 centered on chord symbol fluency; scales and deeper theory support it but don't dilute it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chord symbol fluency is the v1 priority | It's the #1 blocker when playing jazz from sheet music | — Pending |
| Both MIDI and on-screen input for drills | Piano isn't always next to the computer; habit needs zero friction | — Pending |
| Letters primary, solfège alongside | Jazz symbols are letter-based; immersion with a familiar bridge | — Pending |
| Spaced repetition for drills | Weak spots (unfamiliar chords/scales) need more reps; supports daily-habit goal | — Pending |
| Deployed website over local app | Accessible at the piano and on the phone; supports habit formation | — Pending |
| Backend on user's Oracle server + SQLite | One shared progress history across laptop and phone; user already owns the server | ✓ Phase 8: Fastify + better-sqlite3 API shipped via plain docker compose; UAT-verified locally, Oracle deploy is Phase 9 |
| Shared-secret bearer token auth for the personal API | Single user, internet-facing once deployed; timing-safe compare, fail-fast boot without API_TOKEN | ✓ Phase 8: implemented and threat-verified (08-SECURITY.md, 14/14 closed) |
| "Print Shop" artistic direction | User choice after comparing 4 directions + 3 hybrids: letterpress vibe — paper ground, ink borders, vermilion/mustard, sharp corners, misregistered print shadows (mockups in `.planning/design/`) | — Pending |
| Interval color language (root=vermilion, 7th=mustard, ...) | Color encodes chord structure consistently app-wide — dual coding makes chord-quality differences visual, not just intellectual | — Pending |
| Spaced repetition deferred to v1.x | Research: don't build scheduling before 1–2 weeks of real answer history exists; persistence ships in v1 | — Pending |

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
*Last updated: 2026-07-13 after Phase 8*
