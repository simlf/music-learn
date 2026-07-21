---
phase: 25
slug: contextual-learning-from-session-6-sketches-progression-dril
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on (high) severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-21
---

# Phase 25 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (extracted from the `<threat_model>` block of the eight 25-0N-PLAN.md files). Verified against CURRENT implementation code (post 25-REVIEW-FIX WR-01..WR-06).
> Config: `asvs_level: 1` (verify each declared mitigation is PRESENT in the cited file) · `block_on: high` (only OPEN threats at severity high or critical block the ship gate).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Pure theory/practice modules | progressions.ts / shellVoicing.ts take internal template ids, vetted key strings, spelled chords, and in-memory CardRecord arrays | No untrusted/network input |
| localStorage ↔ app | confidence-log + voicing-met persisted JSON can be hand-edited/corrupted between sessions; untrusted on read | Confidence records; met-chord symbol set |
| deck (IndexedDB) → stage read | ShellVoicingDrill reads persisted FSRS card state via getAllCards (read-only) | Card maturity (state integer) |
| song data (localStorage) → sheet render | Song titles / chord symbols shown as SongMark provenance originate from user-entered songs | User-entered strings rendered on the lead sheet |
| keyboard taps → matchChord | On-screen / MIDI keyboard input graded by chroma | User play input |
| caller → PianoKeyboard props | ghostKeys / markers supplied by in-app components, not user/network input | In-code 'R'/'5' marker strings |

No new network surface introduced this phase (local-first single-user static SvelteKit app).

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-25-01-01 | Tampering | buildProgression on unknown template/key | low | mitigate | `progressions.ts:157` returns `[]` on unknown template/key; `:165` `if (!spellChord(symbol).recognized) continue` drops any non-recognized bar symbol; `nameChoices` drops double-accidental + unrecognized (`:189`) | closed |
| T-25-01-02 | Denial of Service | shuffle / distractor draw | low | accept | Bounded loops over a fixed 7-chord diatonic set; no unbounded recursion, no user input (see Accepted Risks R-01) | closed |
| T-25-01-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase — tonal/ts-fsrs/dexie already present (Accepted Risks R-SC) | closed |
| T-25-02-01 | Tampering | shellNotes/optionalMarkers on triad or unrecognized chord | low | mitigate | `shellVoicing.ts:38` `byRoles` filters `chord.notes`; `:44` total-function contract — fewer/zero entries rather than throwing; optionalMarkers iterates existing notes only | closed |
| T-25-02-02 | Information Disclosure | voicingStageForChord reading CardRecord | low | accept | Reads only the `state` integer of in-memory records; no persistence, no PII, single-user local app (Accepted Risks R-02) | closed |
| T-25-02-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-03-01 | Tampering (XSS) | data-ghost / ::after marker content | low | mitigate | `PianoKeyboard.svelte:650/707` `data-ghost={ghostMarker(...)}` attribute binding to an in-code 'R'/'5' string; `:949` `content: attr(data-ghost)`; no `{@html}` in the file | closed |
| T-25-03-02 | Denial of Service | ghostClass per-key scan | low | accept | ghostKeys is a tiny fixed array (root+fifth); the per-key `.find()` is bounded (Accepted Risks R-03) | closed |
| T-25-03-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-04-01 | Tampering | listConfidence reading corrupt storage | medium | mitigate | `confidenceLog.ts:66-78` try/catch, JSON.parse guard, `Array.isArray` check, per-entry `isConfidenceEntry` filter (`:48-59`) — non-JSON / non-array / off-shape → `[]` or dropped entry, never throws | closed |
| T-25-04-02 | Denial of Service | unbounded log growth | low | mitigate | `confidenceLog.ts:25` `CONFIDENCE_LOG_CAP = 500`; `:87` `.slice(-CONFIDENCE_LOG_CAP)` ring buffer | closed |
| T-25-04-03 | Denial of Service | setItem throwing on quota/disabled storage | low | mitigate | `confidenceLog.ts:89-94` write wrapped in try/catch that no-ops | closed |
| T-25-04-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-05-01 | Tampering (XSS) | rendering song names / chord symbols on the sheet | high | mitigate | `ProgressionDrill.svelte` renders `progression.key` / `bar.roman` / `choice` as escaped text, symbols via ChordGlyph props and song titles via `<SongMark songs={...} />` prop — no `{@html}` anywhere (repo-wide grep confirms none in the file, SongMark, or ChordGlyph) | closed |
| T-25-05-02 | Tampering | wrong-answer bypass of the earn step | low | mitigate | `ProgressionDrill.svelte:92` earn requires exact name-pick equality AND `:119` chroma match via `matchChord`; neither satisfiable by malformed input | closed |
| T-25-05-03 | Denial of Service | progression/build recompute per render | low | accept | buildProgression/nameChoices bounded over 3-4 bars; recompute cheap (Accepted Risks R-05) | closed |
| T-25-05-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-06-01 | Denial of Service | logConfidence throwing inside handleGrade | medium | mitigate | `RecallSession.svelte:638-653` logConfidence call in a dedicated inner try/catch inside handleGrade's outer try/catch; a log failure never blocks grading (write is also total in 25-04) | closed |
| T-25-06-02 | Tampering | confidence dot bypassing the review flow | low | accept | Dots only set a local `selectedConfidence` enum; cannot alter FSRS scheduling or gate Reveal — enrichment only (Accepted Risks R-06) | closed |
| T-25-06-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-07-01 | Tampering | hasVoicingMet reading corrupt storage | medium | mitigate | `voicingMet.ts:21-33` `readMetSet` try/catch + JSON.parse + `Array.isArray` + per-entry string filter → empty set; `:53-54` hasVoicingMet degrades to false; markVoicingMet setItem try/catch no-op (`:41-50`) | closed |
| T-25-07-02 | Tampering (XSS) | rendering chord symbols / captions | high | mitigate | `ShellVoicingDrill.svelte` renders all copy via `t()` and chord data via ChordGlyph props; symbols from `seventhChordSymbols()`/`spellChord` (in-repo fact/quality tables); no `{@html}` in the file | closed |
| T-25-07-03 | Integrity | accidental deck writes corrupting FSRS state | medium | mitigate | `ShellVoicingDrill.svelte` `grep -c recordGrade == 0`; deck access is `getAllCards` only (`:68`) — read-only, no `.put/.add/.update/.delete/bulkPut` deck writes | closed |
| T-25-07-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |
| T-25-08-01 | Tampering (XSS) | rendering danger-card symbols / meta lines | high | mitigate | `progress/+page.svelte:333` `{dangerCardLabel(card)}` escaped-text interpolation, symbol resolved via `factById` (in-repo catalog, `:75/:86`); meta via `t()` + `String.replace` interpolation (`:335-337`); corrupt log entries already dropped by listConfidence guard; no `{@html}` | closed |
| T-25-08-02 | Tampering | divide-by-zero / NaN bars from sparse data | low | mitigate | `progress/+page.svelte:308` bar height guarded `Number.isFinite(row.accuracy) ? Math.round(row.accuracy*100) : 0`; upstream `calibration()` zero-sample guard (`confidenceLog.ts:123`) | closed |
| T-25-08-03 | Denial of Service | large confidence log aggregation | low | accept | Log is ring-buffer-capped (25-04); calibration/dangerCards are single linear passes (Accepted Risks R-08) | closed |
| T-25-08-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs this phase (Accepted Risks R-SC) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Totals: 26 threats · 26 closed · 0 open. All 3 high-severity threats (T-25-05-01, T-25-07-02, T-25-08-01 — XSS on rendered user/repo strings) verified mitigated by Svelte auto-escaping with zero `{@html}` on dynamic data. `threats_open: 0`.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01 | T-25-01-02 | Distractor shuffle/draw is a bounded loop over a fixed 7-chord diatonic set; no unbounded recursion, no user input. | plan 25-01 (planner) | 2026-07-21 |
| R-02 | T-25-02-02 | voicingStageForChord reads only the in-memory `state` integer; no persistence, no PII, single-user local app. | plan 25-02 (planner) | 2026-07-21 |
| R-03 | T-25-03-02 | ghostKeys is a tiny fixed array (root+fifth); per-key `.find()` is bounded. | plan 25-03 (planner) | 2026-07-21 |
| R-05 | T-25-05-03 | buildProgression/nameChoices recompute is bounded over 3-4 bars; cheap. | plan 25-05 (planner) | 2026-07-21 |
| R-06 | T-25-06-02 | Confidence dots set only a local enum; cannot alter FSRS scheduling or gate Reveal. | plan 25-06 (planner) | 2026-07-21 |
| R-08 | T-25-08-03 | Confidence log is ring-buffer-capped; calibration/dangerCards are single linear passes. | plan 25-08 (planner) | 2026-07-21 |
| R-SC | T-25-01-SC .. T-25-08-SC | No package installs occurred this phase — tonal/ts-fsrs/dexie were already present; no new dependency to audit. | plans 25-01..25-08 (planner) | 2026-07-21 |

*Accepted risks do not resurface in future audit runs. All are low/n-a severity — below the `high` block threshold regardless of disposition.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-21 | 26 | 26 | 0 | gsd-security-auditor (Claude) |

Notes:
- No `## Threat Flags` section appears in any of the eight 25-0N-SUMMARY.md files; no new/unregistered attack surface was flagged by the executors. Zero unregistered flags.
- Pre-existing `{@html}` sinks exist only in `src/routes/+layout.svelte` (static in-repo `TAB_ICONS` / `MORE_ICON` SVG constants, documented under phase-24 threat T-24-02-01) — out of phase-25 scope. Verified the phase-25 nav additions `/progressions` and `/voicings` were added to `navLinks` + `moreHrefs` only, never to `bottomTabHrefs` (the `{@html}`-rendered tab-bar path), so no user-controlled data reaches an `{@html}` sink through this phase's changes.
- 25-REVIEW-FIX WR-06 changed confidence-log correctness semantics (FSRS Hard counts as a pass: `correct: rating !== Rating.Again`); this is a scheduling/analytics semantic decision, not a security control, and does not affect any threat disposition.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-21
