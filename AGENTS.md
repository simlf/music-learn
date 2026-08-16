# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.
- Adding an i18n message domain takes FOUR registrations, not one: `src/lib/i18n/messages/index.ts` (en and fr spreads) plus the domain lists in `src/lib/i18n/messages.test.ts` and `src/lib/i18n/unusedKeys.test.ts`; keys built via template literals also need a `DYNAMIC_PREFIXES` entry in the latter. `noEmDashes.test.ts` bans em/en dashes across all user-facing copy.
- Improvisation/chord-scale product decisions (why reference not drill, why no modes curriculum) live in `.planning/design/improvisation.md`; the engine is `src/lib/theory/chordScale.ts`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
