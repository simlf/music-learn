# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.
- Adding an i18n message domain takes FOUR registrations, not one: `src/lib/i18n/messages/index.ts` (en and fr spreads) plus the domain lists in `src/lib/i18n/messages.test.ts` and `src/lib/i18n/unusedKeys.test.ts`; keys built via template literals also need a `DYNAMIC_PREFIXES` entry in the latter. `noEmDashes.test.ts` bans em/en dashes across all user-facing copy.
- Improvisation/chord-scale product decisions (why reference not drill, why no modes curriculum) live in `.planning/design/improvisation.md`; the engine is `src/lib/theory/chordScale.ts`.
- Prettier is NOT a project dependency and there is no config: running `npx prettier --write` reformats whole files (spaces, double quotes) against the repo's tab + single-quote style. Match the surrounding file by hand instead.
- One control idiom app-wide: a mono uppercase field label over a row of `Button` chips, `variant="primary"` (vermilion) for the selected one. Canonical example `CompingLoop.svelte` (FORME / TON / TEMPO); hand-rolling bordered button rows instead is what made the voicing drill look foreign. Show hierarchy between two control groups with a `border-top: 2px` rule and placement, not with a second button style.
- The four interval colours are fixed, but flagging is still possible: vermilion is the app's standing attention accent (retry lines, active lesson rail, careful notes) and dashed outlines mean "borrowed". `--color-faint` is decorative only and must never carry text or a marker anyone is asked to read (app.css says so; an 8px faint keyboard marker shipped once and was invisible). The improvisation board's visual grammar is specified in `.planning/design/improvisation.md` section 5.5.
- All sound goes through the single engine `src/lib/audio/audio.ts` (lazy Tone import, sampler-first, no-throw, sound toggle). Key-tap sound is already centralised inside `PianoKeyboard.svelte`, so a component that mounts a keyboard must not also play the tapped note. Any playback that outlives its click (comp loop, chord demo) carries a generation token so a second start cancels the first.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
