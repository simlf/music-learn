# Handoff: finish the lookup-upgrades PR

**Branch:** `improve/lookup-upgrades` (already checked out, forked off `main`).
**Status:** 2 feature commits done, tests/check/build green, GSD verifier passed 4/4 — BUT a 3-lens adversarial review found confirmed defects that are **NOT yet fixed**. Branch is **not pushed**, **no PR yet**.

Sibling PR #21 (recall pedagogy) is already merged — ignore it.

## What is already committed on the branch

- `0d67771` feat: "Drill it" handoff button on lookup result card (setDrillSeeds([symbol]) + goto('/drills'), i18n `home.action.drill-it` EN+FR, hidden for slash chords).
- `aa22944` feat: slash-chord inversion support — `ChordResult.bass?: string`, `spellChord` populates bass + re-sorts notes into root-position role order, `home.slash.explain` line EN+FR, non-chord-tone bass rejected.
- `6770ef4` docs: pre-dispatch plan.

Uncommitted (untracked): `260722-2jy-SUMMARY.md`, `260722-2jy-VERIFICATION.md` in this dir — commit them in the docs commit at the end.

## Defects to fix (all confirmed by adversarial review, deduped)

### A — MAJOR — "Hear it" plays root position, contradicting the explain line
`src/routes/+page.svelte` `hearIt()` (~line 172-176). Since `aa22944` re-sorts a slash chord's `notes` into root-first order, `playChord(result.notes)` now voices C/E as C4-E4-G4 (root position) while the card says "play C with E at the bottom." Regression: before the commit it played the true inversion.
**Fix:** rotate letters so the bass leads when `result.bass` is set (both are glyph form, so `indexOf` matches):
```js
const letters = result.notes.map(n => n.letter);
if (result.bass) {
  const i = letters.indexOf(result.bass);
  if (i > 0) letters.push(...letters.splice(0, i));
}
playChord(letters);
```
Keyboard highlight / formula display keep canonical root-position order (that's fine). Add a test asserting the bass note is voiced lowest for C/E.

### B — MAJOR — alias line asserts a false equivalence for every slash chord
`src/routes/+page.svelte:336`. The `{#if result.aliases.length > 0}` block renders `C/E = CM = C^ = C = Cmaj` and `Am7/G = Am7 = Amin7 = ...` — tonal's aliases are bass-less, so `aliasLine` drops the `/bass` and teaches that the inversion equals its root-position symbol, directly contradicting the explain line two rows below. Renders for **every** recognized slash lookup.
**Fix (simplest, safest for a learning card):** gate the alias line on `!result.bass`, matching the Drill-it gate: `{#if result.aliases.length > 0 && !result.bass}`.
**Fix (alternative, keeps info):** make `aliasLine` in `src/lib/lookup/chordPresentation.ts` bass-aware — append `/${bass}` to each rebuilt form and glyph-convert the bass in `glyphSymbol`. If you take this route, add a `chordPresentation.test.ts` case asserting no bare-root form appears without the `/bass`.

### C — MINOR — ASCII vs glyph accidentals mixed in slash displays
`src/routes/+page.svelte`. `slashExplainLine` (~191) uses `chord.symbol.split('/')[0]` which is tonal's ASCII form (`Abmaj7`), while `{BASS}` is glyph (`E♭`) → "play Abmaj7 with E♭ at the bottom". Same ASCII leak in the ChordGlyph quality prop (~326): `result.symbol.slice(result.root.length)` yields `maj7/Eb` next to a glyph root.
**Fix:** add a `displaySymbol(chord)` helper in `chordPresentation.ts` that rebuilds the glyph form root-aware (like `aliasLine` already does: `chord.root + symbol.slice(asciiRoot.length)`) **and** glyph-converts the bass segment after the final `/` (safe — quality suffixes like `b5` always precede the slash). Use it in: (1) slashExplainLine `{CHORD}`, (2) ChordGlyph quality slice, (3) aliasLine base form. **Keep `result.symbol` itself ASCII** — drill seeds, recent-lookups, and spellChord round-trips depend on it.

### D — MINOR — guard rejects genuine chord-tone basses on extended chords (comment is wrong)
`src/lib/theory/chord.ts:48`. The guard `chord.bass !== '' && chord.root === ''` rejects `C9/D`, `Cmaj9/D`, `Cadd9/D`, `C13/A`, `Cdim7/A` — genuine chord tones tonal can't model as a rootDegree inversion. The **rejection is correct** (tonal emits a negative interval + duplicate note that would corrupt the role model), but the `DECISION` comment falsely claims it only rejects non-chord-tone basses "like C/D".
**Fix:** correct the comment to state the real limitation (tonal only models inversions over base chord factors expressible as `rootDegree`; extensions and enharmonic respellings are rejected as unrecognized). Optionally add a test documenting these are rejected. No behavior change needed.

## Definition of done

1. Apply A, B, C, D as **atomic commits** (code + tests), commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
2. `npx vitest run` fully green, `npx svelte-check --threshold error` = 0 errors, `npm run build` green. (Browser preview cannot hydrate this app — tests + check + build ARE the verification.)
3. Commit the docs artifacts (`SUMMARY.md`, `VERIFICATION.md`, this `HANDOFF.md`) in a `docs(quick-260722-2jy):` commit.
4. `git push -u origin improve/lookup-upgrades`, open a PR to `main` with `gh pr create`. **Leave it open** (do not merge) unless told otherwise.

## After this PR — remaining v2.2 backlog (optional, not part of this task)

Ranked ideas 4-12 in `.planning/v2.2-IMPROVEMENT-BACKLOG.md`, each its own branch+PR: Tier-5 chord unlock (6/m6/sus4/7sus4), song play-through drill, masthead due-count chip + post-round streak refresh, Progressions/Voicings drill audio, apiFetch timeout, interleave/telemetry follow-ups.
