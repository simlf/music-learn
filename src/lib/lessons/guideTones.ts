import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { shellNotes } from '$lib/practice/shellVoicing';
import { buildProgression, type ProgressionBar } from '$lib/practice/progressions';
import type { ChordResult, SpelledNote } from '$lib/theory/types';

/**
 * Pure content + math for guided-path unit 11: guide tones and voice
 * leading. Renders on `/learn` inside `TheoryLessons.svelte`.
 *
 * THE ONE IDEA: the 7th of one chord in a ii-V-I falls one half step to
 * become the 3rd of the next. The other voice holds: the 3rd of one chord
 * is the SAME letter as the 7th of the next. That is why a two-note left
 * hand reads as a moving line rather than as two disconnected intervals,
 * and it is the reason `shellVoicing.shellNotes` keeps exactly the 3rd and
 * the 7th (see that module's own doc comment).
 *
 * Nothing here is hardcoded prose about "C" or "B": every letter is derived
 * by running the app's own tonal-backed engines (`buildProgression`,
 * `shellNotes`, `chromaOf`), the same standing instruction the rest of this
 * lesson's copy follows (verify a musical claim by computation, not by
 * typing it out by hand). Precision matters here because the app got the
 * neighbouring claim wrong once already (commit 6a13ade, PR #31): the
 * moving note is the 7th of chord A BECOMING the 3rd of chord B, never "the
 * same note is a 7th and then a 3rd" - `guideToneMotion` below returns two
 * distinct SpelledNote-derived letters for exactly that reason.
 *
 * The FIXED demo below (`GUIDE_TONE_BARS`) is scoped to the major ii-V-I only
 * (Dm7 -> G7 -> Cmaj7), the design doc's own worked example and the clearest
 * first case for a 90-second lesson. `guideToneMotion` and
 * `guideToneBarsForProgression` themselves are NOT scoped that way: they take
 * any `ProgressionBar`s across all 12 keys and all 3 `progressions.ts`
 * templates (the common-tone bridge step in `ProgressionDrill.svelte` is the
 * other caller). The minor ii-V-i template's 7th-to-3rd motion is a WHOLE
 * step, not a half step (G7's 7th, F, resolves to Cm7's 3rd, E♭, because
 * natural minor's 3rd-to-4th scale-degree gap is a whole step where major's
 * is a half step) - `fallingSemitones` is computed per call for exactly this
 * reason, never assumed to be 1. The unit-11 lesson copy keeps its major-only
 * claim true by never rendering the minor case; a caller that does render
 * `fallingSemitones` (the bridge step) must show the number, not assert it.
 *
 * Pure module: no DOM, no Svelte, no audio. `$lib/audio/audio`'s existing
 * `playChord` is the caller's job, not this module's.
 */

/** The fixed demo key and template: C major ii-V-I, the design doc's own worked example. */
export const GUIDE_TONE_KEY = 'C';
export const GUIDE_TONE_TEMPLATE_ID = 'major-ii-V-I';

/** One bar of the lesson: its roman numeral, symbol, and shell (guide tones only). */
export interface GuideToneBar {
	roman: string;
	symbol: string;
	root: string;
	quality: string;
	/** The 3rd + 7th, in that order (never a ♭5 in this progression's three qualities). */
	shell: SpelledNote[];
}

/**
 * Converts one `buildProgression` bar into a `GuideToneBar` (attaches its
 * spelled root and shell). The single conversion step every caller needing
 * guide-tone motion for an arbitrary key/template goes through - never a
 * second hand-rolled shell computation. Total: an unrecognized symbol yields
 * `root: ''` (spellChord's own default) and whatever shell shellNotes finds
 * (possibly empty), same as every other total function in this module.
 */
export function toGuideToneBar(bar: ProgressionBar): GuideToneBar {
	const chord = spellChord(bar.symbol);
	return {
		roman: bar.roman,
		symbol: bar.symbol,
		root: chord.root,
		quality: bar.quality,
		shell: shellNotes(chord)
	};
}

/** Converts a whole built progression (any key, any of the 3 templates) into its GuideToneBar list. */
export function guideToneBarsForProgression(bars: ProgressionBar[]): GuideToneBar[] {
	return bars.map(toGuideToneBar);
}

/**
 * The three bars of the fixed C-major ii-V-I lesson demo, built from the SAME
 * engine every other progression surface uses (`progressions.ts`), never a
 * second hand-rolled table. Total: if the template or key were ever wrong
 * this collapses to [], same as `buildProgression` itself - kept as a plain
 * constant since the key and template are both fixed.
 */
export const GUIDE_TONE_BARS: GuideToneBar[] = guideToneBarsForProgression(
	buildProgression(GUIDE_TONE_TEMPLATE_ID, GUIDE_TONE_KEY)
);

/** The voice-leading motion from one bar's shell into the next bar's shell. */
export interface GuideToneMotion {
	/** The letter held from the outgoing 3rd into the incoming 7th (same pitch class). */
	heldLetter: string;
	/** The outgoing chord's 7th: the voice that moves. */
	fallingFrom: string;
	/** The incoming chord's 3rd: where the falling voice lands. */
	fallingTo: string;
	/** Semitones measured DOWNWARD from fallingFrom to fallingTo (always 1 for this progression, but computed, never assumed). */
	fallingSemitones: number;
}

function noteForRole(bar: GuideToneBar, role: 'third' | 'seventh'): SpelledNote | undefined {
	return bar.shell.find((note) => note.role === role);
}

/**
 * The motion from `fromBar` into `toBar`: which note holds, which note falls,
 * and by how many half steps (measured downward via chroma, never assumed to
 * be 1). Total: returns null if either bar is missing a 3rd or a 7th in its
 * shell (never happens for this progression's three qualities, but this
 * module makes no exception for that - see shellVoicing's own total-function
 * convention) or if a letter fails to resolve to a pitch class.
 */
export function guideToneMotion(fromBar: GuideToneBar, toBar: GuideToneBar): GuideToneMotion | null {
	const fromThird = noteForRole(fromBar, 'third');
	const fromSeventh = noteForRole(fromBar, 'seventh');
	const toThird = noteForRole(toBar, 'third');
	const toSeventh = noteForRole(toBar, 'seventh');
	if (!fromThird || !fromSeventh || !toThird || !toSeventh) return null;

	const fromChroma = chromaOf(fromSeventh.letter);
	const toChroma = chromaOf(toThird.letter);
	if (fromChroma === undefined || toChroma === undefined) return null;

	return {
		heldLetter: fromThird.letter,
		fallingFrom: fromSeventh.letter,
		fallingTo: toThird.letter,
		fallingSemitones: (fromChroma - toChroma + 12) % 12
	};
}

/**
 * The common-tone bridge step's harder "play" answer target (`ProgressionDrill.svelte`,
 * Phase 41): the held note plus the falling note, matchChord-ready. Wraps them
 * in a minimal ChordResult shell (matchChord only reads `.notes`) rather than
 * asking the drill to hand-build one. Total: reuses the motion's own two
 * letters, so it inherits guideToneMotion's null-safety at the call site.
 */
export function bridgePlayTarget(motion: GuideToneMotion): ChordResult {
	return {
		input: '',
		symbol: '',
		root: '',
		quality: '',
		recognized: true,
		aliases: [],
		notes: [
			{ letter: motion.heldLetter, solfege: '', role: 'third' },
			{ letter: motion.fallingFrom, solfege: '', role: 'seventh' }
		]
	};
}

/**
 * The two transitions of the fixed three-bar progression: ii->V and V->I.
 * Index 0 is the motion INTO `GUIDE_TONE_BARS[1]`, index 1 the motion INTO
 * `GUIDE_TONE_BARS[2]`. `GUIDE_TONE_BARS[0]` (the ii chord) has no incoming
 * motion, which is why this array has one fewer entry than the bar list.
 */
export const GUIDE_TONE_MOTIONS: (GuideToneMotion | null)[] = GUIDE_TONE_BARS.slice(1).map(
	(bar, i) => guideToneMotion(GUIDE_TONE_BARS[i], bar)
);

/**
 * All pitches to sound for one bar's shell, low-to-high, for `playChord`
 * (octave-free ASCII/glyph letters; the audio contract picks the octave).
 * Third first, then seventh, matching `shellNotes`' own ascending role order.
 */
export function shellPitches(bar: GuideToneBar): string[] {
	return bar.shell.map((note) => note.letter);
}
