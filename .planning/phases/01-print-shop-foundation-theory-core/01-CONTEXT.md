# Phase 1: Print Shop Foundation & Theory Core - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Two foundations, testable in isolation:

1. **Theory engine** — a pure, unit-tested module that correctly spells every v1 chord (major/minor/dim triads, maj7, m7, dom7, ø7, °7) across all 12 roots, resolves jazz notation aliases (Cm7 = C-7 = Cmin7; Cø7 = Cm7♭5) to the same chord, derives enharmonically correct spellings from root + interval formula (F♯m7 shows C♯, not D♭), and provides dual letter/solfège naming (French solfège: Do, Ré, Mi, Fa, Sol, La, Si).
2. **Print Shop visual identity** — app-wide design tokens and core components per `01-UI-SPEC.md`, rendered on a `/showcase` route where any supported chord displays on a colored keyboard diagram with interval colors.

No drills, no lookup UX polish, no persistence, no MIDI. Those are Phases 2+.

</domain>

<decisions>
## Implementation Decisions

### Tone & personality (overall product direction, applies app-wide from Phase 1 onward)
- **D-01:** The app should feel **fun and inviting, not conservatory-strict**. The goal is enjoying playing and coming back, not rigorous teaching. This is a standing product principle for every phase.
- **D-02:** Personality = **warm & witty copy + subtle tactile charm**. Voice of a charming old print shop owner: friendly, lightly humorous, encouraging, never scolding. No stickers-and-confetti playground, no mascot.
- **D-03:** Keep the uppercase mono status-bar register (part of the letterpress identity) but **warm the wording** — reads like a fun old telegram, never a rebuke.
- **D-04:** Copy is English with **occasional French winks** where natural ("Et voilà", "Bravo"). Solfège labels are the structural French; UI stays in the English/letter-name world to support immersion in jazz notation.
- **D-05:** **No em dashes in any user-facing app copy.** Rewrite with periods, colons, or commas. The example strings in `01-UI-SPEC.md` (input placeholder, error bar, status lines) must be rewritten to comply during planning/execution. Chord notation like `C-7` uses a hyphen and is unaffected.

### Motion
- **D-06:** Phase 1 ships **tasteful print effects** as the animation baseline: chord glyph "stamps" onto the paper (quick scale + shadow settle), keyboard keys ink-fill with a slight stagger, buttons press into paper. All ≤300ms, never blocking, repeatable hundreds of times.
- **D-07:** The **stamp animation IS the success beat** — no extra congratulation text or badge when a chord renders.

### Error & empty-state personality
- **D-08:** Unrecognized symbol → **playful shrug + help**: the shop admits it's stumped with charm (spirit of "HMM. THAT ONE'S NOT IN THE CATALOG. TRY Cm7 OR F♯ø7"), with a small rotating set of hint variants so repeated errors don't feel like a broken record. Non-blocking: the previous result stays visible (as specced).
- **D-09:** Empty state → **invitation with a starter**: warm nudge plus 2–3 clickable example chords (e.g., Cm7 · Fmaj7 · G7) for a zero-friction first success.

### Showcase page features
- **D-10:** Add a **"surprise me" random-chord button** (ghost variant) that pulls a random supported chord and stamps it. Doubles as a manual engine-correctness spot-check.
- **D-11:** Add **simple synth audio playback**: a "hear it" action plays the displayed chord with a plain Tone.js synth. No sampled piano, no loading delay in Phase 1.
- **D-12:** Keep the alias confirmation line (Cm7 = C-7 = Cmin7) and the interval-formula readout (R + m3 + P5 + m7 chips with dual-named notes) as specced in `01-UI-SPEC.md` — quiet micro-learning, no extra "shape hint" sentences (that teaching belongs to Phase 7 lessons).

### Claude's Discretion
- **Keyboard diagram span:** user delegated. Pick the span that guarantees every v1 chord renders fully from its root without cramping mobile width (spec says one-octave-plus C→C; some chords like B♭maj7 spill past one octave — resolve in research/planning).
- Technical shape of the theory engine (tonal wrapping, data model, test strategy) is researcher/planner territory.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI design contract
- `.planning/phases/01-print-shop-foundation-theory-core/01-UI-SPEC.md` — Locked visual contract: tokens, interval color language, typography, spacing, core components, copywriting register. **Note:** its example copy strings contain em dashes and pre-date the tone decisions above; rewrite copy per D-05 and D-02–D-04 while keeping the visual/structural contract intact.

### Design mockups (chosen direction)
- `.planning/design/design-hybrid.html` — variant B "Print Shop" is the chosen direction
- `.planning/design/design-keys.html` — keyboard key-color tests behind the interval color language

### Project-level
- `.planning/REQUIREMENTS.md` — THEORY-01..04, DESIGN-01, DESIGN-02 map to this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 verifiable statements)

</canonical_refs>

<code_context>
## Existing Code Insights

Greenfield: no `src/` exists yet — this phase scaffolds the project (SvelteKit 2.69.x / Svelte 5, TypeScript ^6 pinned, Tailwind 4, tonal, Vitest per `.claude/CLAUDE.md` stack doc).

### Reusable Assets
- `.planning/design/*.html` mockups contain working CSS for the Print Shop look (borders, shadows, key colors) that can be translated into tokens/components.

### Established Patterns
- None yet — this phase establishes them. Conventions created here (token names, component contracts in 01-UI-SPEC.md) become the baseline for Phases 2–9.

### Integration Points
- Theory engine must be a pure module (no DOM/audio coupling) so Phases 2–6 can consume it for lookup, drills, and scales.
- The keyboard component takes spelled note names from the engine (not MIDI numbers) for labels, per UI-SPEC implementation notes.

</code_context>

<specifics>
## Specific Ideas

- Error bar spirit: "the shop admits it's stumped" — charming, with rotating hint variants.
- Empty state spirit: "fresh paper" invitation with clickable starter chords.
- Success feel: the stamp itself is the reward; restraint over celebration.
- French winks: "Et voilà", "Bravo" — sparing, where they land naturally.

</specifics>

<deferred>
## Deferred Ideas

- **Fuzzy "did you mean Cm7?" suggestions** on unparseable input — considered for error handling, deferred (extra engine work; could join Phase 2 lookup polish).
- **Realistic sampled piano sound** (@tonejs/piano) — deferred until audio realism matters (possible ear-training later; out of v1 scope).
- **Shape-first explanation sentences on showcase** ("m7 = minor triad + minor 3rd on top") — belongs to Phase 7 lessons.

</deferred>

---

*Phase: 1-print-shop-foundation-theory-core*
*Context gathered: 2026-07-12*
