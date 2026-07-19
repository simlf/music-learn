# Music Learn — UX improvement tasks (Phase 23 source spec)

Phone-first fixes; each task notes its desktop behavior. Repo refs point at the actual files to touch. Verbatim from `UX Improvements.dc.html`.

---

## 1A — Bottom tab bar navigation (phone only)

**Problem:** Masthead wraps brand + streak + EN|FR + 8 nav links into ~120px of top chrome — worst reach zone one-handed; ~30px tall link targets.

**Tasks**
- [ ] `src/routes/+layout.svelte`: add a bottom tab bar (Lookup, Drills, Recall, Songs, More) shown at `max-width: 640px` (Tailwind `sm:` boundary already used app-wide). 64px targets, mono uppercase labels, active tab = ink fill / paper text (same treatment as LocaleToggle's active segment).
- [ ] "More" opens a sheet: Build, Scales, Theory, Progress + the EN|FR `LocaleToggle` (moves off persistent chrome on phone).
- [ ] Slim phone header to brand + `StreakBadge` only.
- [ ] Pages with `min-h-screen` mains need bottom padding = tab bar height so content never hides under it (`+page.svelte` files).
- [ ] Keep 44px+ targets; keep `data-testid="masthead"` tests passing or update `tests/masthead.e2e.test.ts`.

**Desktop:** unchanged — masthead with all 8 links stays at `sm:` and up. The tab bar concept is only rendered inside 390px frames; at desktop widths the current masthead layout (single row, no wrapping) already works and should not get a bottom bar.

---

## 1B — Drills: question first, chrome folded (phone portrait)

**Problem:** `src/routes/drills/+page.svelte` stacks LevelPicker card + mode row + score + song filter + rotate hint (~620px) before the question; keyboard and Check land below the fold → scroll on every question.

**Tasks**
- [ ] Collapse LevelPicker, mode tabs, and SongFilterToggle into one compact strip ("TIER 1 · MIX ▾") that opens a sheet/accordion. LevelPicker's full blurb shows inside the sheet, not inline.
- [ ] Keep score register in the same strip ("1/10 · 0 ✓").
- [ ] Reorder so prompt (ChordGlyph + SongMark + IntervalScaffold) sits directly under the strip; keyboard + Check/Clear anchored at the bottom of the viewport (thumb zone). The grid-area layout in `drills/+page.svelte` already supports reflow without DOM reorder.
- [ ] Grow keyboard height on phone (160px → ~180px) and Check to ~52px.
- [ ] Rotate hint: keep, but inside the sheet or as a one-time toast — not above the question.

**Desktop:** the existing `@media (orientation: landscape) and (max-height: 600px)` two-pane layout is unaffected; on roomy desktop viewports everything already fits above the fold, so the collapsed strip can expand back to the current full LevelPicker card at `sm:`/`md:` if preferred — decide whether the sheet is phone-only or universal.

---

## 1C — Progress: glanceable + actionable

**Problem:** Streak is a bare numeral; accuracy is a read-not-see table; weak rows are inert (only bulk "Drill these").

**Tasks**
- [ ] `src/routes/progress/+page.svelte`: streak hero gains a 7-day strip — practiced days = vermilion stamped squares, today = dashed-open. Needs per-day practiced data: extend `server/src/streak.ts` / `GET streak` (or derive from the local practice log `src/lib/practice/practiceLog.ts` as a first pass).
- [ ] `PracticeItemRow.svelte`: add inline accuracy bar (1.5px ink border track, fill = vermilion <50%, mustard <70%, verdigris ≥70%) replacing the thin left-border weak accent.
- [ ] Per-row DRILL button on weak chord items → `setDrillSeeds([item])` + `goto('/drills')` (same seam the bulk button uses in `drillThese()`).
- [ ] Rename bulk CTA to "Drill all N".
- [ ] Apply the same bar treatment to `AccuracyTable.svelte` (All Stats).

**Desktop:** tables currently un-hide the KIND column at `sm:`; keep that, bars scale fine at any width — no separate desktop work. On wide screens consider capping card width (~640px) so bars don't stretch absurdly.

---

## Suggested order
1. **1B** — biggest daily-friction win, single file + LevelPicker.
2. **1C** — motivation loop, small components + one server field.
3. **1A** — layout-wide, touches every page's padding + e2e tests.
