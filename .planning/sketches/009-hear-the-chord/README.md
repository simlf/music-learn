---
sketch: 009
name: hear-the-chord
question: "On BUILD reveal, how does hearing the chord surface for audio memory?"
winner: "A"
tags: [audio, drills, build, reveal, memory]
---
# Sketch 009: Hear the Chord

## Design Question

In the FORMULA → BUILD drill (`BuildSession.svelte`), the player constructs a chord one interval at a time. When the correct answer is revealed, we want them to HEAR the chord, because audio memory matters hugely for piano: linking the printed symbol and the lit keys to an actual sound is what makes `Cmaj7` recallable at the keyboard later. The question is how hearing the chord should surface at the reveal moment, and how to handle the sound-OFF case without leaving a silent dead end.

All three variants reuse the two things the user already loves: the chord symbol in the serif display glyph (`--font-serif` at `--text-display`) and the stamp-in reveal animation. Sound is faked here (visible key + glyph pulse plus a printed mono register line); the real app has a working `playChord` audio engine and a sound toggle persisted to localStorage.

## How to View

open .planning/sketches/009-hear-the-chord/index.html

Flip the SOUND toggle at the top to demo both the audio-on path and the visual-only fallback, then hit "Reveal answer" in each variant tab.

## Variants

- **A · Auto-play + synced pulse** — the instant the answer stamps in, `playChord(['C','E','G','B'])` fires and the four lit keys plus the serif glyph pulse once in time with the strike. A "↺ Hear again" button replays. Fastest, zero friction, sound is just there.
- **B · Tap-to-hear speaker** — the reveal stamps in silent; a prominent letterpress speaker "HEAR IT" button sits beside the glyph. Tapping it plays and pulses. Respects a quiet room and hands the player control of when audio happens.
- **C · Arpeggio → block** — auto-play, but the notes ROLL root→3rd→5th→7th. Each key lights in its interval color and its register line prints the moment it sounds, then the full block chord strikes and all keys pulse together. Strongest for mapping a heard pitch back to a named note.

## What to Look For

- Does auto-play (A, C) feel helpful or intrusive on repeated drills? Would you reach for "Hear again" often, or is once enough?
- Is B's explicit tap worth the extra friction for the control it gives, or does a silent reveal feel like the app forgot to do something?
- Does C's roll genuinely help wire sound→note, or is the extra ~1.3s per reveal too slow once you already know the chord?
- Sound-OFF fallback: in every variant the reveal still pulses the keys and glyph and prints a muted register line. Confirm none of them dead-ends into silence-plus-nothing.
- The serif glyph + stamp-in are the emotional core: check the pulse reads as "this is the sound of that symbol" and does not fight the stamp-in.
