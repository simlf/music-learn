# Spike Manifest — Overnight v2 Learning Upgrade

## Idea

Upgrade Music Learn from v1 chord-lookup/drill app to a deeper learning companion: sampled piano sound everywhere (key touch, answer reveal), intervals integrated across the app plus a dedicated interval drill, hybrid level gating (few easy chords first, unlock tiers on proven accuracy with manual override), song-based practice (song builder + presets, starting with the user's Autumn Leaves arrangement), improved theory content, and tasteful mnemonics only where genuinely good.

Executed as an autonomous overnight multi-agent run: parallel research, architect-defined contracts, parallel builders in dedicated worktrees with TDD, architect merge + browser/responsive verification.

## Requirements (locked by user, 2026-07-14)

- Song practice: **song builder + presets**. User creates named songs by typing chord symbols from their sheet (matches their arrangement's key). One-tap preset for common standards including Autumn Leaves changes. Drills weight song chords first.
- Levels: **hybrid gating**. App suggests unlocking the next tier when accuracy proves mastery; user confirms. Manual override in settings. Tiers progress from triads to maj7/m7/dom7 to ø7/°7 to alterations.
- Sound: **sampled real piano** (@tonejs/piano, Salamander samples), lazy-loaded, synth fallback while loading. Key touches make sound (pedagogical, esp. scale selection). Answer reveal ALWAYS plays the chord sound.
- Intervals: **everywhere + drill**. Interval labels/colors surfaced in lookup, drills, scales (tap a key: hear it + see interval from root). Plus dedicated interval recognition drill.
- Mnemonics: only where genuinely good. Better none than cheesy. Quality gate required.
- No em dashes in any app copy (existing project rule).
- TDD: tests written first. Browser verification (looks right, responsive) required before done.
- MIDI (phase 4) explicitly out of scope for this run: needs hardware present.

## Spikes / Tracks

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | research-fanout | research | Parallel research: codebase map, sampled audio, learning science, intervals pedagogy, song presets, improvement exploration | VALIDATED | research |
| 002 | audio-engine | build | Sampled piano + key-touch + answer-reveal sound works in SvelteKit static app, iOS-safe | VALIDATED | audio |
| 003 | levels-and-songs | build | Hybrid level gating + song builder/preset weighting works end to end | VALIDATED | learning |
| 004 | intervals | build | Interval labels everywhere + interval drill + /scales explorer + server migration | VALIDATED | theory |
| 005 | theory-content | build | Improved theory content + quality-gated mnemonics | VALIDATED | content |

## Results (2026-07-14)

All five tracks built TDD in isolated worktrees, merged to main: 694 app tests + 40 server tests green, svelte-check clean, adapter-static build clean, browser-verified at desktop and 375px (two fixes landed from that pass: lookup autofocus preventScroll, masthead wrap).

Key findings:
- @tonejs/piano is dead (pins tone@14); Tone.Sampler + self-hosted Salamander mp3s (30 files, ~2 MB, CC-BY) is the working approach. lookAhead=0 kills the default 100 ms latency.
- Interval colors ride the extended IntervalRole (root|second|third|fourth|fifth|sixth|seventh); 2nd/4th/6th tokens are slate/plum/olive.
- Tier gating: 6 tiers, unlock at 85% over last 30 tier answers + 40 lifetime + per-quality floors + 2 distinct days; assisted answers excluded. Client rolling window lives in a bounded localStorage log until a server unlock endpoint exists.
- Song weighting: 60/25/15 song/tier/review, 35% per-item cap; above-tier song chords scaffold (2 formula-first exposures, hints, graduate after 5 cold correct).
- Mnemonics shipped for maj7/7/m7/m7b5/dim7 only; triads deliberately return null (quality bar).
- Server schema v1 migration (kind 'interval', duration_ms, given) ships in repo; production redeploy is a user UAT item. Client degrades gracefully against the old server.
