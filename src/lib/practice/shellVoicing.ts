import { spellChord } from '$lib/theory/chord';
import { intervalBetween } from '$lib/theory/interval';
import type { ChordResult, IntervalRole, SpelledNote } from '$lib/theory/types';
import { State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { allFacts } from '$lib/srs/facts';

/**
 * Pure voicing engine for the sketch-019 "shell voicings, staged by card
 * state" drill (SK-019, LOCKED "very good for beginners" — see
 * .claude/skills/sketch-findings-music-learn/references/
 * contextual-learning-metacognition.md). Extends the 005 fading-scaffold
 * rule from label hints to voicing pedagogy: one flow, three stages keyed
 * to a chord's FSRS card maturity.
 *
 * Derives the shell (the 3rd + 7th guide tones, plus the ♭5 on a ♭5 chord,
 * see shellNotes), the rootless voicing, and the full 4-note stack from a
 * spelled chord; marks the droppable notes for the 019 subtraction stage; and
 * maps a set of a chord's FSRS cards to the three staged pedagogy modes
 * (meet / subtract / drill).
 *
 * Pure module: no DOM/Svelte/Dexie/localStorage. The maturity input is a
 * plain CardRecord[] (never a live Dexie read) — callers own fetching cards
 * via deck.ts and pass the resulting records in.
 */

/** The three sketch-019 pedagogy stages, keyed to a chord's card maturity. */
export type VoicingStage = 'meet' | 'subtract' | 'drill';

/** A droppable-note marker for the 019 subtraction stage's ghost-hatch treatment. */
export interface OptionalMarker {
	/** The note's letter (with accidental glyph), matching SpelledNote.letter. */
	letter: string;
	/** 'R' for the root, '5' for the fifth — the two notes the subtraction stage drains. */
	marker: 'R' | '5';
}

/** Filters chord.notes to only the roles in `roles`, preserving chord.notes' own order. */
function notesWithRoles(chord: ChordResult, roles: IntervalRole[]): SpelledNote[] {
	return chord.notes.filter((note) => roles.includes(note.role));
}

/**
 * True when the chord's fifth is DIMINISHED (the ♭5 families: m7b5 and dim7).
 * Derived from the interval the chord actually spells, never from matching the
 * "b5"/"dim" substring in a symbol, so an alias spelling (Cø7, C°7) resolves
 * identically. Total: a chord with no fifth role (or an unrecognized chord)
 * is simply not a ♭5 chord.
 *
 * Deliberately scoped to 'd' rather than "any non-perfect fifth": ♭5 is the
 * only altered fifth in the v1 quality space, and the copy this gates names
 * the ♭5 concretely to the learner.
 */
export function hasFlatFifth(chord: ChordResult): boolean {
	const fifth = chord.notes.find((note) => note.role === 'fifth');
	if (!fifth) return false;
	return intervalBetween(chord.root, fifth.letter).quality === 'd';
}

/**
 * The left-hand shell: the notes that carry the chord's identity, in
 * ascending role order.
 *
 * Normally the two guide tones, 3rd + 7th: the 3rd says major or minor, the
 * 7th says which seventh, and the root is already printed in the symbol while
 * a perfect 5th is filler.
 *
 * ON A ♭5 CHORD (m7b5, dim7) THE FIFTH JOINS THEM. The ♭5 is what that symbol
 * IS, not filler: with 3rd + 7th alone the shell of Cm7b5 (E♭ + B♭) is
 * chroma-identical to the shell of Cm7, so the drill would have been training
 * a voicing that cannot tell the two chords apart, on an app whose whole point
 * is chord-symbol fluency. Verified with tonal across all 12 roots
 * (shellVoicing.test.ts).
 *
 * Total: a triad or any chord missing one of these roles simply returns fewer
 * entries rather than throwing (T-25-02-01).
 */
export function shellNotes(chord: ChordResult): SpelledNote[] {
	return hasFlatFifth(chord)
		? notesWithRoles(chord, ['third', 'fifth', 'seventh'])
		: notesWithRoles(chord, ['third', 'seventh']);
}

/**
 * The rootless voicing: every role except 'root'. Total for the same
 * reason as shellNotes — filters over whatever roles exist.
 */
export function rootlessNotes(chord: ChordResult): SpelledNote[] {
	return notesWithRoles(chord, ['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']);
}

/**
 * The chord's FULL stack: every note it spells, in the root-position order
 * spellChord already put them in.
 *
 * BUG PIN (music-theory audit, Bug E): this filtered to root/third/fifth/
 * seventh, so any tone outside those four roles silently vanished from the
 * chord's own "full stack" - the one voicing card captioned "WHAT YOU KNOW":
 *
 *   fullStackNotes(spellChord('C6'))   before  [C, E, G]        (A gone)
 *   fullStackNotes(spellChord('C69'))  before  [C, E, G]        (A, D gone)
 *   fullStackNotes(spellChord('C13'))  before  [C, E, G, B♭]    (D, A gone)
 *
 * Unreachable while seventhChordSymbols() gates the drill to the 12x5 seventh
 * matrix (every one of which is exactly root/third/fifth/seventh, so this
 * change is a no-op for them), but it BLOCKS the queued chart-vocabulary
 * expansion to 6 / m6 / sus4 / add9 / 9 / 13 / m(maj7) - real charts are full
 * of those, and the drill would have taught an incomplete stack for each.
 *
 * Returns a copy, matching notesWithRoles' non-aliasing contract, so a caller
 * can never mutate the chord's own note array through this.
 */
export function fullStackNotes(chord: ChordResult): SpelledNote[] {
	return [...chord.notes];
}

/**
 * Whether this chord can be drilled as a shell voicing at all: the shell has
 * to carry at least TWO notes for "play the guide tones" to be a real
 * question. shellNotes is the 3rd + 7th (plus the ♭5 on a ♭5 chord), so a
 * chord missing either guide tone falls short:
 *
 *   shellNotes(spellChord('C6'))     [E]   - a third alone is not a pair
 *   shellNotes(spellChord('Csus4'))  []    - no third and no seventh
 *
 * With an empty target the drill's Check could never be satisfied (matchChord
 * against an empty note set rejects every play), so the learner would be
 * stuck in a retry loop; with a single note the question teaches nothing. The
 * seventh-matrix pool cannot produce either case today, so this is a guard
 * for the queued vocabulary expansion and for host-supplied embed symbols,
 * not a live bug.
 *
 * Total: an unrecognized chord has no shell and is not drillable.
 */
export function hasDrillableShell(chord: ChordResult): boolean {
	return shellNotes(chord).length >= 2;
}

/**
 * The notes the 019 subtraction stage drains to ghost-hatch: root marked 'R',
 * fifth marked '5', in that order.
 *
 * A ♭5 chord ghosts the ROOT ONLY: its fifth is part of the shell (see
 * shellNotes), so hatching it would tell the learner the ♭5 is droppable when
 * it is the one note that identifies the symbol. Keeping this in step with
 * shellNotes also keeps the subtract stage's "ghost notes are allowed but not
 * required" grading honest: nothing required is ever also optional.
 *
 * Total: a chord missing either role (e.g. a rootless-only input, which never
 * happens from spellChord but kept defensive) simply omits that marker.
 */
export function optionalMarkers(chord: ChordResult): OptionalMarker[] {
	const markers: OptionalMarker[] = [];
	for (const note of chord.notes) {
		if (note.role === 'root') markers.push({ letter: note.letter, marker: 'R' });
	}
	if (hasFlatFifth(chord)) return markers;
	for (const note of chord.notes) {
		if (note.role === 'fifth') markers.push({ letter: note.letter, marker: '5' });
	}
	return markers;
}

/**
 * Maps a chord's set of FSRS cards to the sketch-019 pedagogy stage:
 * - 'drill' (REVIEW, cold drill) if any card has reached State.Review —
 *   drill wins over subtract/meet even amid a mix of maturities, since the
 *   most-advanced card in the set determines how much help is still owed.
 * - 'meet' (NEW, compare card) if the set is empty or every card is still
 *   State.New — nothing has graduated past introduction yet.
 * - 'subtract' (LEARNING, subtraction drain) otherwise — at least one card
 *   has advanced past New but none has reached Review.
 */
export function voicingStageForChord(cards: CardRecord[]): VoicingStage {
	if (cards.some((card) => card.state === State.Review)) return 'drill';
	if (cards.length === 0 || cards.every((card) => card.state === State.New)) return 'meet';
	return 'subtract';
}

/**
 * The chord-formula symbols (drawn from the shared fact catalog, D-06
 * lineage) that spellChord resolves with a seventh-role note: the
 * maj7/m7/dom7/m7b5/dim7 family. Plain triads are excluded since they have
 * no seventh to shell down to.
 */
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
