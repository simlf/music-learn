# Phase 27: Practice Hub — Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 8 new/modified files
**Analogs found:** 7 / 8 (one hybrid item has no direct analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/routes/practice/+page.svelte` | route/host | request-response + state | `src/routes/drills/+page.svelte` + `src/lib/components/RecallSession.svelte` | role-match (thin host + FSRS skeleton) |
| `src/lib/practice/practiceQueue.ts` | service | CRUD + queue composition | `src/lib/srs/rotation.ts` + `src/lib/srs/session.ts` + `src/lib/practice/pool.ts` | role-match (queue builder) |
| Refactored render branches (chord-construct, chord-identify, interval-identify, etc.) | component | request-response | `src/routes/drills/+page.svelte` render blocks (L747–L1230) | role-match (extracted from monolith) |
| Song filter reader (existing reuse) | utility | file-I/O | `src/lib/practice/songFilterPref.ts` | exact match |
| Song provenance lookup (existing reuse) | utility | file-I/O | `src/lib/practice/songProvenance.ts` | exact match |
| Synthetic queue item generator (hybrid queue) | service | transform | `src/lib/practice/progressions.ts` + `src/lib/practice/shellVoicing.ts` | partial match (read-only over existing generators) |
| Grading logic (reused) | utility | CRUD | `src/lib/drills/matchChord.ts` + `src/lib/drills/generateIntervalQuestion.ts` | exact match (no duplication) |
| Tests (`src/routes/practice/+page.test.ts`, queue interleaving tests) | test | validation | `tests/practice.e2e.test.ts` + `tests/drills.e2e.test.ts` | role-match (e2e harness pattern) |

---

## Pattern Assignments

### `src/routes/practice/+page.svelte` (route/host, request-response + state)

**Analogs:**
- Primary: `src/routes/drills/+page.svelte` (imports, state machine, session glue)
- Secondary: `src/lib/components/RecallSession.svelte` (FSRS load() skeleton)

#### Imports pattern (`src/routes/drills/+page.svelte` L1–82)

```typescript
import { onMount } from 'svelte';
import { Note } from 'tonal';
import { spellChord } from '$lib/theory/chord';
import { generateQuestion, pickQuestionFamily } from '$lib/drills/generateQuestion';
import { matchChord } from '$lib/drills/matchChord';
import { fetchStats, flushQueue, localDateString, type StatItem } from '$lib/api/progress';
import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
import { toPitch } from '$lib/audio/voicing';
import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';
import { drawFromPool, scaffoldStageForSymbol, type PoolContext } from '$lib/practice/pool';
import { readScaffolds, recordScaffoldAnswer, writeScaffold, type ScaffoldStage } from '$lib/practice/scaffold';
import { createSession, summarize, type Session } from '$lib/practice/session';
import { activeSongChordSymbols } from '$lib/practice/songs';
import { buildProvenanceIndex } from '$lib/practice/songProvenance';
import { readSongFilter } from '$lib/practice/songFilterPref';
import { t } from '$lib/i18n/locale.svelte';
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import IntervalChip from '$lib/components/IntervalChip.svelte';
import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
import Button from '$lib/components/Button.svelte';
```

Add for Phase 27 host (FSRS half, from `src/lib/components/RecallSession.svelte` L1–45):
```typescript
import {
	getDueCards,
	getAllCards,
	recordGrade,
	type CardRecord,
	type Mode
} from '$lib/srs/deck';
import { selectReviewCards, interleaveQueue } from '$lib/srs/rotation';
import { buildQueue, advanceQueue, isSessionComplete, sessionRemaining, formatDayInterval } from '$lib/srs/session';
import { factById } from '$lib/srs/facts';
import { applySongFilter } from '$lib/srs/deck';  // or equivalent from RecallSession's pattern
```

#### State machine pattern (`src/routes/drills/+page.svelte` L121–165, L300–354)

```typescript
// Practice engine state (Track B)
let levelState = $state(getLevelState());
let stats = $state<StatItem[] | null>(null);
let weakest = $state<StatItem[]>([]);
let showEndCard = $state(false);

// Session state (merged FSRS + drills)
let session = $state<Session | HybridSession>(
	createSession(/* or new HybridSessionBuilder */)
);

// Current question state
let question = $state<DrillQuestion>(drawNextQuestion());
let answered = $state(false);
let feedback = $state<MatchResult | null>(null);
let selected = $state<Set<string>>(new Set());
let confirmationText = $state('');
```

#### FSRS load() skeleton (`src/lib/components/RecallSession.svelte` L312–360)

Reuse this wiring pattern for the FSRS half of the hybrid queue:

```typescript
async function load(): Promise<void> {
	pageState = 'loading';
	try {
		const preDue = await getDueCards();
		let dueBase: CardRecord[];
		if (preDue.length > DUE_BACKLOG_GATE) {
			dueBase = preDue;
		} else {
			const remaining = remainingIntroBudget(new Date());
			if (remaining > 0) {
				const introduced = await introduceNewCards(remaining);
				if (introduced > 0) consumeIntroBudget(introduced, new Date());
			}
			dueBase = await getDueCards();
		}
		const due = applySongFilter(dueBase);
		if (due.length === 0) {
			if (dueBase.length > 0) {
				filteredHiddenCount = dueBase.length;
				pageState = 'empty-filtered-none-due';
				return;
			}
			const all = await getAllCards();
			pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
			return;
		}
		const selectedCards = selectReviewCards(due);
		const orderedCards = interleaveQueue(selectedCards, Math.random);
		queue = buildQueue(orderedCards.map((card) => ({ factId: card.factId, mode: card.mode })));
		pageState = 'reviewing';
	} catch {
		pageState = 'error';
	}
}

onMount(() => {
	void load();
});
```

#### Session advance pattern (`src/routes/drills/+page.svelte` L258–282, adapted for Practice host)

```typescript
function drawNextQuestion(): HybridQueueItem {
	// Composition: pull from the hybrid queue (FSRS + synthetic)
	const nextItem = practiceQueue.next();
	if (!nextItem) return null;
	
	// Route to appropriate generator based on item family
	if (nextItem.family === 'chord') {
		// Existing chord generators (name-it, build-it)
		return generateQuestion({ symbol: nextItem.symbol, /* ... */ });
	} else if (nextItem.family === 'interval') {
		// Existing interval generator
		return generateIntervalQuestion({ short: nextItem.symbol });
	} else if (nextItem.family === 'voicing') {
		// Synthetic voicing item
		return { kind: 'voicing', symbol: nextItem.symbol, stage: nextItem.stage };
	} else if (nextItem.family === 'progression') {
		// Synthetic progression item
		return { kind: 'progression', templateId: nextItem.templateId, key: nextItem.key };
	}
}

question = $state<HybridQueueItem>(drawNextQuestion());
```

---

### `src/lib/practice/practiceQueue.ts` (service, queue composition)

**Analogs:**
- Primary: `src/lib/srs/rotation.ts` + `src/lib/srs/session.ts` (queue selection + interleaving)
- Secondary: `src/lib/practice/pool.ts` (weighted draw pattern)

#### Imports pattern and queue composition API

From `src/lib/srs/rotation.ts` (L1–16):
```typescript
import { State } from '$lib/srs/scheduler';
import type { Mode, CardRecord, FactKind } from './deck';

/**
 * RECALL-03's pure rotation policy (D-06/D-07): teach-cluster composition,
 * the stagger gate that decides when a fact's ear-naming card unlocks, and
 * review-time weakest-path selection. No Dexie/Svelte/DOM imports.
 */
```

From `src/lib/srs/session.ts` (L1–23):
```typescript
import { Rating } from '$lib/srs/scheduler';

export interface QueueItem {
	factId: string;
	mode: string;
}

export function buildQueue(dueCards: QueueItem[]): QueueItem[] {
	return [...dueCards];
}

export function advanceQueue(queue: QueueItem[], rating: Rating): QueueItem[] {
	if (queue.length === 0) return queue;
	const [current, ...rest] = queue;
	return rating === Rating.Again ? [...rest, current] : rest;
}
```

#### Hybrid queue item shape and composition pattern

Modeled on `src/lib/srs/session.ts` QueueItem and `src/lib/practice/pool.ts` PoolDraw (L81–86):

```typescript
export type QueueItemFamily = 'name-it' | 'build-it' | 'interval' | 'voicing' | 'progression';

export interface HybridQueueItem {
	id: string;  // Unique identifier for this queue position
	family: QueueItemFamily;
	/** FSRS fact ID for carded families (name-it, build-it, interval); null for synthetic items */
	factId: string | null;
	mode?: string;  // Present for FSRS items
	/** Symbol for chord/interval families */
	symbol?: string;
	/** For synthetic progression items */
	templateId?: string;
	key?: string;
	/** Voicing stage when the symbol is a scaffolded chord */
	voicingStage?: VoicingStage;
}

/**
 * Pure queue builder: composes FSRS due-cards and synthetic items into one
 * interleaved session queue. No Dexie, Svelte, or DOM imports.
 *
 * Algorithm:
 * 1. Select due FSRS cards via selectReviewCards (weakness + cap)
 * 2. Interleave via interleaveQueue (no-3-in-a-row, no-same-fact-twice)
 * 3. Generate synthetic voicing items from available seventh chords
 * 4. Generate synthetic progression items from templates + due keys
 * 5. Weave together with the no-3-in-a-row constraint treating synthetic items as their own "family"
 * 6. Return the flattened queue ready for advance()
 */
export function composePracticeQueue(
	fsrsCards: CardRecord[],
	syntheticItems: HybridQueueItem[],
	rng: () => number = Math.random
): HybridQueueItem[] {
	// Call interleaveQueue on the FSRS half (existing pure function)
	const orderedCards = interleaveQueue(fsrsCards, rng);
	
	// Convert FSRS cards to hybrid items
	const fsrsItems: HybridQueueItem[] = orderedCards.map((card) => ({
		id: `fsrs:${card.factId}:${card.mode}`,
		family: familyForFactKind(card.factKind),
		factId: card.factId,
		mode: card.mode
	}));
	
	// Weave FSRS and synthetic items with the no-3-in-a-row constraint
	// treating synthetic items as a single cohesive "family"
	return interleaveWithSynthetic(fsrsItems, syntheticItems, rng);
}

/** Helper: routes a fact kind to its queue family */
function familyForFactKind(kind: FactKind): QueueItemFamily {
	switch (kind) {
		case 'chord-formula': return 'name-it';  // or 'build-it', determined at queue time
		case 'interval-size': return 'interval';
		case 'scale-degree': return 'interval';
		default: return 'name-it';
	}
}

/** Interleaves FSRS and synthetic items with max-3-in-a-row constraint applied to synthetic as a unit */
function interleaveWithSynthetic(
	fsrsItems: HybridQueueItem[],
	syntheticItems: HybridQueueItem[],
	rng: () => number
): HybridQueueItem[] {
	// Implementation: weave the two lists so no family appears 3x in a row,
	// treating all synthetic items as a single "family" for variety purposes.
	// Details deferred to executor discretion per CONTEXT.md.
}
```

#### Advance queue pattern (from `src/lib/srs/session.ts` L34–41)

```typescript
export function advanceQueue(queue: HybridQueueItem[], rating: Rating | boolean): HybridQueueItem[] {
	if (queue.length === 0) return queue;
	const [current, ...rest] = queue;
	// Only FSRS items have a rating; synthetic items are always consumed (not re-enqueued)
	if (current.factId === null) return rest;  // Synthetic item: no re-enqueue
	return rating === Rating.Again ? [...rest, current] : rest;
}

export function isSessionComplete(queue: HybridQueueItem[]): boolean {
	return queue.length === 0;
}

export function sessionRemaining(queue: HybridQueueItem[]): number {
	return queue.length;
}
```

---

### Refactored render branches (extracted components from drills)

**Analog:** `src/routes/drills/+page.svelte` render blocks (L747–1230)

#### Pattern: chord-construction branch (`src/routes/drills/+page.svelte` L984–1040)

```svelte
{#if question.kind === 'chord' && question.direction === 'construction'}
	<div class="question">
		{#if SOURCE_TAGS[questionSource]}
			<p class="source-tag">{SOURCE_TAGS[questionSource]}</p>
		{/if}
		
		{#if scaffoldStage === 'formula-first'}
			<!-- Formula hint showing the formula as a reminder -->
			<div class="hint-block">
				<p>Build: {formulaFor(question.symbol)}</p>
			</div>
		{/if}
		
		{#if hintTaken}
			<!-- Distractor display after hint -->
			<div class="distractors">
				{#each question.distractors as distractor}
					<button on:click={() => selectDistractor(distractor)}>
						{distractor}
					</button>
				{/each}
			</div>
		{/if}
		
		<PianoKeyboard
			readOnly={answered}
			selected={answered ? target : selected}
			on:select={(e) => handleKeySelect(e.detail)}
		/>
	</div>
{/if}
```

**Extract to:** `src/lib/components/ChordConstructionDrill.svelte`
- Props: `question`, `scaffoldStage`, `hintTaken`, `answered`, `selected`, `target`
- Events: `@select` (key selection)

#### Pattern: chord-identification branch (drills L1161–1174)

Extract to: `src/lib/components/ChordIdentificationDrill.svelte`
- Props: `question`, `feedback`, `answered`, `selected`
- Similar structure with distractor buttons

#### Pattern: interval-identification and interval-construction branches (drills L13–14, L267–269)

Extract to: `src/lib/components/IntervalIdentificationDrill.svelte` and `src/lib/components/IntervalConstructionDrill.svelte`

All render-branch components follow the same pattern:
```typescript
export interface DrillComponentProps {
	question: DrillQuestion | IntervalQuestion;
	answered: boolean;
	feedback: MatchResult | null;
	selected: Set<string>;  // For chord questions
	target: ChordResult;    // For chord questions
	scaffoldStage?: ScaffoldStage | null;
	hintTaken?: boolean;
}

/** Fired when the user selects a key/choice */
export interface SelectEvent {
	detail: { letter: string; octave: number };  // or choice ID
}
```

---

### Synthetic queue item generator (read-only over existing generators)

**Analogs:**
- `src/lib/practice/progressions.ts` (L1–150+)
- `src/lib/practice/shellVoicing.ts` (L1–113)

#### Progressions pattern (`src/lib/practice/progressions.ts` L105–138)

```typescript
export const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
	{
		id: 'major-ii-V-I',
		mode: 'major',
		degrees: [
			{ roman: 'ii', degree: 2, quality: 'm7', functionLabel: 'subdominant' },
			{ roman: 'V', degree: 5, quality: '7', functionLabel: 'dominant' },
			{ roman: 'I', degree: 1, quality: 'maj7', functionLabel: 'tonic' }
		]
	},
	// ... more templates
];

export const PROGRESSION_KEYS: readonly string[] = MAJOR_SCALE_ROOTS;

/**
 * Phase 27 hybrid queue usage: the existing progressions.ts is already pure.
 * The queue composer calls randomProgression() + buildProgression() directly
 * without modification. No new pattern needed — reuse existing generators as-is.
 */
```

#### Voicing pattern (`src/lib/practice/shellVoicing.ts` L80–113)

```typescript
export function voicingStageForChord(cards: CardRecord[]): VoicingStage {
	if (cards.some((card) => card.state === State.Review)) return 'drill';
	if (cards.length === 0 || cards.every((card) => card.state === State.New)) return 'meet';
	return 'subtract';
}

export function seventhChordSymbols(): string[] {
	const symbols: string[] = [];
	for (const fact of allFacts()) {
		if (fact.factKind !== 'chord-formula') continue;
		const chord = spellChord(fact.symbol);
		if (chord.recognized && chord.notes.some((note) => note.role === 'seventh')) {
			symbols.push(fact.symbol);
		}
	}
	return symbols;
}

/**
 * Phase 27 hybrid queue usage: the existing shellVoicing.ts is already pure
 * and read-only over the deck (no mutations). The queue composer fetches
 * cards for a given symbol via deck.ts, passes them to voicingStageForChord,
 * and includes the result in each synthetic HybridQueueItem.
 */
```

---

### Grading logic (exact reuse, no duplication)

**Analogs:**
- `src/lib/drills/matchChord.ts` (L1–42)
- `src/lib/drills/generateIntervalQuestion.ts` (L126–131)

#### Chord grading pattern (`src/lib/drills/matchChord.ts` L29–41)

```typescript
export function matchChord(played: Set<number> | number[], target: ChordResult): MatchResult {
	const playedChroma = new Set(played);
	const targetChroma = new Set(target.notes.map((note) => Note.chroma(toAsciiAccidentals(note.letter))));

	const missing = [...targetChroma].filter((chroma) => !playedChroma.has(chroma));
	const extra = [...playedChroma].filter((chroma) => !targetChroma.has(chroma));

	return {
		correct: missing.length === 0 && extra.length === 0,
		missing,
		extra
	};
}

/**
 * Phase 27 reuse: the /practice host calls matchChord() directly for chord
 * families (name-it, build-it), passing the played note set (from PianoKeyboard)
 * and the target chord. No wrapper needed.
 */
```

#### Interval grading pattern (`src/lib/drills/generateIntervalQuestion.ts` L126–131)

```typescript
export function gradeIntervalTap(root: string, tappedLetter: string, semitones: number): boolean {
	const rootChroma = Note.chroma(toAsciiAccidentals(root));
	const tappedChroma = Note.chroma(toAsciiAccidentals(tappedLetter));
	if (rootChroma === undefined || tappedChroma === undefined) return false;
	return (tappedChroma - rootChroma + 12) % 12 === semitones % 12;
}

/**
 * Phase 27 reuse: the /practice host calls gradeIntervalTap() for interval
 * families, passing the question root, the tapped letter, and the interval's
 * semitone count from question.interval.semitones. No wrapper needed.
 */
```

---

### Song filter and provenance lookup (existing, no duplication)

**Analogs:**
- `src/lib/practice/songFilterPref.ts` (L31–57)
- `src/lib/practice/songProvenance.ts` (L28–80)

#### Song filter read pattern (`src/lib/practice/songFilterPref.ts` L31–48)

```typescript
export function readSongFilter(): boolean {
	try {
		const current = localStorage.getItem(NEW_KEY);
		if (current !== null) return current === 'true';

		const recallValue = localStorage.getItem(LEGACY_RECALL_KEY);
		const drillsValue = localStorage.getItem(LEGACY_DRILLS_KEY);
		if (recallValue === null && drillsValue === null) return false;

		const migrated = recallValue === 'true' || drillsValue === 'true';
		localStorage.setItem(NEW_KEY, String(migrated));
		localStorage.removeItem(LEGACY_RECALL_KEY);
		localStorage.removeItem(LEGACY_DRILLS_KEY);
		return migrated;
	} catch {
		return false;
	}
}

/**
 * Phase 27 usage: the /practice host reads the filter flag once at init:
 * 
 *   let songFilterOn = $state(readSongFilter());
 * 
 * Then passes it to applySongFilter() for FSRS cards and drillableSongSymbols()
 * for synthetic items. No changes to the function itself.
 */
```

#### Song provenance pattern (`src/lib/practice/songProvenance.ts` L28–80)

```typescript
export function buildProvenanceIndex(): Map<string, string[]> {
	const index = new Map<string, string[]>();
	for (const song of listSongs()) {
		if (!song.active) continue;
		for (const symbol of song.chordSymbols) {
			const key = normalizeSymbolForMatch(symbol);
			const names = index.get(key);
			if (names === undefined) {
				index.set(key, [song.name]);
			} else if (!names.includes(song.name)) {
				names.push(song.name);
			}
		}
	}
	return index;
}

export function songsForSymbol(symbol: string, index?: Map<string, string[]>): string[] {
	const provenanceIndex = index ?? buildProvenanceIndex();
	const normalized = normalizeSymbolForMatch(symbol);
	return provenanceIndex.get(normalized) ?? [];
}

/**
 * Phase 27 usage: the /practice host builds the provenance index once at init,
 * then passes it to SongMark components when rendering each question. No changes
 * to the functions themselves — this is the exact same usage pattern drills and
 * recall already follow.
 */
```

---

## Shared Patterns

### Authentication/Authorization
**Not applicable to Phase 27** — single-user app, no auth gates on `/practice`.

### Error Handling
**Source:** `src/lib/components/RecallSession.svelte` (L357–359)

Apply to `/practice` page state machine:

```typescript
pageState = $state<PageState>('loading');

async function load(): Promise<void> {
	pageState = 'loading';
	try {
		// Queue composition, FSRS load, etc.
		pageState = 'reviewing';  // or 'empty-*' states
	} catch {
		pageState = 'error';  // Fallback: "Couldn't open the practice queue..."
	}
}
```

### Validation
**Not applicable** — the practice queue is pure; all validation happens in existing generators (generateQuestion, generateIntervalQuestion, etc.).

### Telemetry and Grading
**Source:** `src/routes/drills/+page.svelte` (L19, L34)

Apply to `/practice` host:

```typescript
import { recordPracticeAnswer } from '$lib/practice/answerTelemetry';

/**
 * Fire-and-forget telemetry on every answer (identical to drills pattern).
 * FSRS grades go through deck.recordGrade() for carded families.
 */
function grade(correct: boolean, duration: number) {
	recordPracticeAnswer({
		item: question.symbol,
		correct,
		duration,
		family: currentFamily
	});
	
	if (currentQueueItem.factId !== null) {
		// FSRS family: commit through deck
		void recordGrade(currentQueueItem.factId, currentQueueItem.mode, rating);
	}
}
```

---

## No Analog Found

**Files with novel patterns not directly present in the existing codebase:**

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/practice/practiceQueue.ts` (hybrid queue composition) | service | queue composition + transform | Hybrid FSRS+synthetic composition is new to this project; the reusable pieces (selectReviewCards, interleaveQueue, seventhChordSymbols, voicingStageForChord, progressions generator) are all existing. The weaving-together logic itself is new. |

---

## Metadata

**Analog search scope:** `/src/routes`, `/src/lib/srs`, `/src/lib/practice`, `/src/lib/drills`, `/src/lib/components`

**Files scanned:** 15 analog candidates; 7 exact/role matches found; 1 hybrid pattern requiring new composition logic

**Pattern extraction date:** 2026-07-25

---

## Summary for Planner

### Thin Host Strategy
- Copy the state-machine shape and import style from **drills** (L1–165) — but keep session/question state minimal.
- Reuse the FSRS load() skeleton from **RecallSession** (L312–360) to fetch and compose due cards.
- Avoid inlining render branches; instead, import extracted component modules or reuse existing whole components (BuildSession embed seam, ShellVoicingDrill, ProgressionDrill).

### Queue Composition
- **practiceQueue.ts** wraps three existing pure functions: `selectReviewCards` + `interleaveQueue` (from rotation.ts/session.ts) for the FSRS half, and `seventhChordSymbols` + `voicingStageForChord` (from shellVoicing.ts) for voicing synthetics.
- The hybrid weaving step (mixing FSRS and synthetic with the no-3-in-a-row constraint) is new logic, but the individual pieces are all proven.
- No changes to progressions.ts or shellVoicing.ts themselves — they are already pure and read-only.

### Grading & Telemetry
- Chord grading: call `matchChord()` directly (no wrapper).
- Interval grading: call `gradeIntervalTap()` directly.
- Telemetry: `recordPracticeAnswer()` + `recordGrade()` (FSRS only) — mirrors drills exactly.

### Song Filter & Provenance
- Call `readSongFilter()` once at init; pass result to `applySongFilter()` and `drillableSongSymbols()`.
- Build `provenanceIndex` once at init; pass to all SongMark renders.
- No changes to existing functions.

### Test Architecture
- Reuse the e2e mock pattern from **tests/practice.e2e.test.ts** and **tests/drills.e2e.test.ts**: mock the pool/session/telemetry modules, run the real queue composition and grading logic.
- New tests: queue interleaving with synthetic items, single-type-due gate, song-filter steering the hybrid queue, FSRS grades committed for carded families.
