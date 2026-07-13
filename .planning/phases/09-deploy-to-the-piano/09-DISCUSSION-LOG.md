# Phase 9: Deploy to the Piano - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 09-deploy-to-the-piano
**Areas discussed:** Keyboard fit strategy, Landscape orientation, Screen priorities on mobile, Touch ergonomics, Progress table on phone

**Phase reframe (user, at invocation):** Focus the phase on mobile experience quality; Oracle deployment deferred, user handles it himself later. Keyboard overflow on phone was the chief complaint from real testing; user floated landscape use.

---

## Keyboard fit strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One octave + shift | 1 octave + octave up/down buttons | |
| Horizontal scroll | Keep 2 octaves, swipe to pan | |
| Shrink to fit | Scale to viewport, ~26px keys | |
| Responsive octaves | As many octaves as fit at 44px+; 1 portrait, 2 landscape/desktop | ✓ |

Follow-ups: highlights wrap into visible octave (vs shrink display-only keyboards) ✓ wrap; rotation keeps selection and relayouts ✓; 44px strict (vs allow ~38px) ✓ strict.

**Notes:** User asked for a visual comparison before locking. True-scale artifact built (4 options in phone frames, B7 drill): https://claude.ai/code/artifact/c13ea9a6-4d24-4b8d-9e58-26e6c80d82c5 — user confirmed responsive octaves after viewing.

---

## Landscape orientation

| Option | Description | Selected |
|--------|-------------|----------|
| Passive, no nudge | Rotation just gives more keys | |
| Gentle rotate hint in drills | Dismissable one-time hint, shop voice | ✓ |
| Landscape-first drills | Design drills primarily for landscape | |

Follow-ups: landscape layout side-by-side (prompt/buttons left, keyboard right) ✓; minimal PWA (manifest + icons, no service worker) ✓ over browser-only and full-offline PWA; hint shown once then never (localStorage flag, rotation also dismisses) ✓.

---

## Screen priorities on mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Drills | Daily habit surface, full treatment | ✓ |
| Lookup | Phone-first since Phase 2; inherits keyboard | |
| Progress | Table may need mobile layout | |
| Showcase | Dev page, desktop-only fine | |

Follow-ups: Lookup/Progress get inherited fixes + one quick verification pass (no redesign) ✓; masthead stays compact single letterpress row (bottom tab bar rejected) ✓.

---

## Touch ergonomics

| Option | Description | Selected |
|--------|-------------|----------|
| Below keyboard, thumb zone | Check under keyboard, Clear beside | ✓ |
| Above keyboard | Between prompt and keys | |

Follow-ups: hatch + press-down cue (optional haptic, reduced-motion respected) ✓; gesture hygiene = kill browser gestures on keyboard surface only (pull-to-refresh block and leave-confirmation offered, not selected); identification choices as 2x2 grid ✓.

---

## Progress table on phone

| Option | Description | Selected |
|--------|-------------|----------|
| Drop KIND on mobile | 3 columns fit; KIND constant in v1 | |
| Horizontal scroll container | Keep 4 columns, side-scroll | |
| Stacked cards | Card per item | |

**User's choice:** No preference — delegated to Claude's discretion (planner leans drop-KIND).

## Claude's Discretion

- AccuracyTable mobile treatment (lean: drop KIND column)
- Breakpoint mechanics for octave count (derive from 44px rule)
- PWA manifest details (icon, short name, theme color) within Print Shop identity
- Rotate-hint copy and placement
- Press-cue implementation (scale vs shade, haptic default)

## Deferred Ideas

- Oracle deployment (HTTPS, docker compose) — user handles later
- Offline service worker / full PWA
- Audio on iOS (gesture-gated Tone.js, silent switch) — surfaced, not discussed
- Mobile UAT device matrix — surfaced, not discussed
- Bottom tab bar navigation — rejected
