import { spellChord } from '$lib/theory/chord';
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
 * Derives the shell (3rd + 7th guide tones), the rootless voicing, and the
 * full 4-note stack from a spelled chord; marks the droppable notes
 * (root + fifth) for the 019 subtraction stage; and maps a set of a chord's
 * FSRS cards to the three staged pedagogy modes (meet / subtract / drill).
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
 * The guide-tone shell: 3rd + 7th only, in ascending role order
 * (third-then-seventh). Total: a triad or any chord missing one of these
 * roles simply returns fewer entries rather than throwing (T-25-02-01).
 */
export function shellNotes(chord: ChordResult): SpelledNote[] {
	return notesWithRoles(chord, ['third', 'seventh']);
}

/**
 * The rootless voicing: every role except 'root'. Total for the same
 * reason as shellNotes — filters over whatever roles exist.
 */
export function rootlessNotes(chord: ChordResult): SpelledNote[] {
	return notesWithRoles(chord, ['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']);
}

/** The full 4-note stack: root/third/fifth/seventh, in that order. */
export function fullStackNotes(chord: ChordResult): SpelledNote[] {
	return notesWithRoles(chord, ['root', 'third', 'fifth', 'seventh']);
}

/**
 * The two notes the 019 subtraction stage drains to ghost-hatch: root
 * marked 'R', fifth marked '5', in that order. Total: a chord missing
 * either role (e.g. a rootless-only input, which never happens from
 * spellChord but kept defensive) simply omits that marker.
 */
export function optionalMarkers(chord: ChordResult): OptionalMarker[] {
	const markers: OptionalMarker[] = [];
	for (const note of chord.notes) {
		if (note.role === 'root') markers.push({ letter: note.letter, marker: 'R' });
	}
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
