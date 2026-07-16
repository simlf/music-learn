# Phase 16: Hear the Chord - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 16-hear-the-chord
**Areas discussed:** Pulse + glyph on reveal, Study-mode toggle scope, Hear-again control, Sound-off fallback

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Pulse + glyph on reveal | Add serif glyph; stamp-in vs one-shot pulse | |
| Study-mode toggle scope | Global persisted vs per-reveal control; timing | |
| Hear-again control | Placement, label, honors study mode | |
| Sound-off fallback | Pulse-only vs add a sound-off hint | |

**User's choice:** No preference — deferred all four areas to Claude's judgment.
**Notes:** User trusted the sketch 009 winner + code scout to drive the calls.

---

## Proposed decisions (accepted as-is)

Claude proposed a full decision set across all four areas; user selected "Accept all."

| Area | Decision | Selected |
|------|----------|----------|
| Pulse + glyph | Add ChordGlyph to complete block; stamp-in stays entrance, separate ~200ms one-shot pulse on keys + glyph synced to strike | ✓ |
| Study-mode | Global localStorage toggle on /progress (sibling to sound); ON replaces auto-play with arpeggio roll + block; new playArpeggio helper ~260ms/note; sound-off = pulse only | ✓ |
| Hear-again | Ghost button before Next/Build Another, label "Hear again", honors study mode, re-pulses even with sound off | ✓ |
| Sound-off fallback | Pure silent visual pulse, no inline hint | ✓ |

**User's choice:** Accept all.
**Notes:** See CONTEXT.md D-01 through D-11 for the full decision text.

---

## Claude's Discretion

- Exact pulse curve/duration/easing (~200ms), arpeggio stagger fine-tuning (~260ms), and one-vs-two keyframes for glyph/key pulse — tuned during implementation.

## Deferred Ideas

- Unifying BUILD and Recall reveals into a shared reveal component — future consolidation phase.
