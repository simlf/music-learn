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
| 001 | research-fanout | research | Parallel research: codebase map, sampled audio, learning science, intervals pedagogy, song presets, improvement exploration | PENDING | research |
| 002 | audio-engine | build | Sampled piano + key-touch + answer-reveal sound works in SvelteKit static app, iOS-safe | PENDING | audio |
| 003 | levels-and-songs | build | Hybrid level gating + song builder/preset weighting works end to end | PENDING | learning |
| 004 | intervals | build | Interval labels everywhere + interval drill | PENDING | theory |
| 005 | theory-content | build | Improved theory content + quality-gated mnemonics | PENDING | content |
