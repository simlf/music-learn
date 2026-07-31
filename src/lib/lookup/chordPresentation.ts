import { Chord } from 'tonal';
import {
	intervalBetween,
	intervalFromShort,
	toAsciiAccidentals,
	toGlyphAccidentals
} from '$lib/theory/interval';
import type { ChordResult, IntervalRole, SpelledNote } from '$lib/theory/types';
import { currentLocale, t } from '$lib/i18n/locale.svelte';

/**
 * A single entry in a chord's interval-formula readout: the root is always
 * labeled "R"; other tones get a quality-first label ("m3", "P5", "m7")
 * derived from the shared interval module. Pure presentation shape - not a
 * theory-engine responsibility (types.ts owns ChordResult's contract).
 */
export interface FormulaEntry {
	role: IntervalRole;
	label: string;
	/** French long name for tooltips/aria ("tierce mineure"; "fondamentale" for the root). */
	longFr: string;
	letter: string;
	solfege: string;
}

/**
 * tonal's own root-relative interval for each of a chord's spelled notes,
 * keyed by the note's ASCII letter.
 *
 * BUG PIN (music-theory audit): formulaFor used to recompute every label with
 * intervalBetween(chord.root, note.letter), and intervalBetween runs
 * Interval.distance over PITCH CLASSES (see its doc comment), which collapses
 * the octave. So every compound extension was labelled as its simple
 * equivalent: C9's D came back "M2" instead of "M9", C13's A "M6" instead of
 * "M13", C7#11's F♯ "A4" instead of "A11", C7b9's D♭ "m2" instead of "m9".
 * Measured against tonal's own `intervals` across its whole chord dictionary,
 * 70 of 106 chord types were mislabelled - on exactly the symbols a fake book
 * is full of, in the one readout whose job is naming the degrees.
 *
 * tonal already ships the compound degree in `Chord.get(...).intervals`, so
 * read it instead of recomputing. Keyed by LETTER rather than by index
 * because spellChord re-sorts a slash chord's notes into root-position role
 * order while tonal keeps them bass-first, so the two arrays do not line up.
 * Verified safe across all 12 catalog roots x tonal's whole chord dictionary
 * (1272 recognized chords): zero chords repeat a letter, and zero spelled
 * notes are missing from the re-parse, so the keying is total and unambiguous.
 *
 * A slash chord re-parses on its BASE symbol (everything before the final
 * "/"): Chord.get("Cmaj7/G").intervals is BASS-relative ("5P 7M 8P 10M"),
 * which would label the root itself "P8" and the third "M10". The base symbol
 * restores root-relative intervals, matching the root-position note order
 * spellChord has already sorted into.
 */
function tonalIntervalByLetter(chord: ChordResult): Map<string, string> {
	const byLetter = new Map<string, string>();
	if (!chord.recognized || chord.symbol === '') return byLetter;
	const slashIndex = chord.bass === undefined ? -1 : chord.symbol.lastIndexOf('/');
	const parsed = Chord.get(slashIndex === -1 ? chord.symbol : chord.symbol.slice(0, slashIndex));
	parsed.notes.forEach((note, index) => {
		const interval = parsed.intervals[index];
		if (interval !== undefined && !byLetter.has(note)) byLetter.set(note, interval);
	});
	return byLetter;
}

/**
 * tonal's native interval name ("9M", "11A", "7dd") rewritten in the app's
 * quality-first shorthand ("M9", "A11", "dd7"), the form intervalFromShort
 * resolves. Returns null for anything that is not a plain degree+quality pair,
 * so the caller can fall back rather than render junk.
 */
function shortFromTonalName(name: string): string | null {
	const match = name.match(/^(\d{1,2})([PMmAd]{1,2})$/);
	return match === null ? null : `${match[2]}${match[1]}`;
}

/**
 * The naming info for one chord tone: tonal's own (compound-aware) interval
 * when it resolves through the shared interval module, else the previous
 * pitch-class computation as a total fallback (an unrecognized chord, or an
 * exotic quality outside the module's shorthand grammar).
 */
function toneInfo(chord: ChordResult, note: SpelledNote, byLetter: Map<string, string>) {
	const tonalName = byLetter.get(toAsciiAccidentals(note.letter));
	const short = tonalName === undefined ? null : shortFromTonalName(tonalName);
	if (short !== null) {
		const info = intervalFromShort(short);
		if (info.short !== '') return info;
	}
	return intervalBetween(chord.root, note.letter);
}

/**
 * Interval-formula readout: root shown as "R", other tones as quality-first
 * labels ("m3", "P5", "m7", "M9", "A11", "M13"). Degrees come from the
 * chord's own tonal intervals (see tonalIntervalByLetter) so a compound
 * extension keeps its compound number; the names themselves still come from
 * the shared $lib/theory/interval module (one naming source for the lookup
 * formula, drill feedback, inspect register, and interval drill), and the
 * note's own role tag from spellChord is kept as the color key (9 tints as a
 * second, 11 as a fourth, 13 as a sixth, unchanged).
 */
export function formulaFor(chord: ChordResult): FormulaEntry[] {
	const byLetter = tonalIntervalByLetter(chord);
	return chord.notes.map((note) => {
		const info = toneInfo(chord, note, byLetter);
		return {
			role: note.role,
			label: info.short,
			longFr: info.longFr,
			letter: note.letter,
			solfege: note.solfege
		};
	});
}

/** One gap between two stacked-thirds tones: the connective interval marker and its French long name for tooltip/aria. */
export interface StackedGap {
	/** Neutral connective marker between adjacent tones, e.g. "+m3". */
	label: string;
	/**
	 * The same interval WITHOUT the connective "+", e.g. "m3" — what a surface
	 * that is not a between-tones row (the keyboard tick rail) shows.
	 */
	short: string;
	/** Half steps spanned by this gap, e.g. 4 for a major third. */
	semitones: number;
	/** French long name for tooltip/aria ("tierce mineure"). */
	longFr: string;
	/**
	 * True when this gap is one of the two stacked-third shapes the row
	 * teaches: a minor third or a major third (SHAPE-01's solid-fill /
	 * outline pair). Everything else - a +P5 over a missing 11th, a sus4's
	 * +P4, a 6th chord's +M2, and the d3/A3 exotica - is NOT a stacked third
	 * and must not be presented as one (see stackedThirdsFor's BUG PIN).
	 */
	isThird: boolean;
}

/** Stacked-thirds derivation: tones keep formulaFor's root-relative role/label; gaps name the distance between adjacent tones. */
export interface StackedThirds {
	tones: FormulaEntry[];
	gaps: StackedGap[];
	/**
	 * True only when EVERY gap is a third, i.e. this chord really is a plain
	 * stack of thirds. False for the many symbols that are not (83 of tonal's
	 * 106 chord types), so a "stacked thirds" surface can say so instead of
	 * silently showing a fifth among the thirds.
	 */
	tertian: boolean;
}

/**
 * Rotates a chord's spelled notes so the note whose role === startRole leads
 * (wraps the tail around to the front). Falls back to the original,
 * unrotated array when no note carries that role (e.g. a triad has no
 * 'seventh'). Pure array rotation - no semitone math, no mutation.
 */
function rotateNotesToRole(notes: ChordResult['notes'], startRole: IntervalRole) {
	const startIndex = notes.findIndex((note) => note.role === startRole);
	if (startIndex <= 0) return notes;
	return [...notes.slice(startIndex), ...notes.slice(0, startIndex)];
}

/**
 * Stacked-thirds sibling of formulaFor: `tones` is formulaFor's output
 * verbatim (root-relative role/label/letter/solfege, no recompute), while
 * `gaps` name the interval between each adjacent pair of chord tones
 * (structural, not root-relative) via the same shared intervalBetween
 * WhyTheseNotes already uses - one naming path, no second interval engine.
 * Total: an unrecognized chord (empty notes) yields empty tones and gaps,
 * never throws.
 *
 * Optional `startRole` (Phase 35, INV-02) rotates the tone/gap row to start
 * at the note carrying that role instead of the canonical root-first order -
 * used by the inversion drill's "stack from the bass" hint rung. Tone
 * role/letter/solfege are preserved per note (only order changes): the
 * rotated notes are run back through formulaFor (root-relative labels stay
 * correct since chord.root is untouched) and gaps are recomputed via the
 * SAME intervalBetween loop over the rotated notes' consecutive pairs, so a
 * genuine non-third gap can appear mid-row and falls into the existing
 * 'other' neutral gap state - no hand-rolled semitone math. Omitting
 * startRole (or passing a role no note carries, e.g. 'seventh' on a triad)
 * executes the exact unrotated code path - byte-identical to before.
 *
 * BUG PIN (music-theory audit, Bug D): a "stacked thirds" readout was
 * displaying non-third gaps as if they were the thirds it teaches -
 *
 *   stackedThirdsFor(spellChord('C13')).gaps    +M3 +m3 +m3 +M3 +P5
 *   stackedThirdsFor(spellChord('C7b13')).gaps  +M3 +d5 +m7
 *   stackedThirdsFor(spellChord('Cadd9')).gaps  +M3 +m3 +P5
 *
 * The audit proposed ordering the tones by ascending compound degree first.
 * Measured, that is a NO-OP and not the cause: tonal already emits its
 * intervals in ascending degree order for 1260 of the 1272 recognized chords
 * (12 catalog roots x its whole dictionary), and the only 12 exceptions are
 * 7b9#9 (1P 3M 5P 7m 9m 9A), where two tones share degree 9 and the
 * ♭9-before-♯9 order is already the sensible one. The gap VALUES are correct
 * too: swept against the true compound distances (hi.semitones -
 * lo.semitones over tonal's own intervals), there are 0 degree-class
 * disagreements and 0 gaps wider than an octave, so C13's D-to-A really is a
 * perfect fifth - the chord simply has no 11th, and no ordering can make it
 * a third.
 *
 * So the defect is presentational, and it is fixed the way the project
 * already decided to handle this (Phase 32 WR-02, CountingChipRow's
 * `.gap-chip.other` dashed-neutral state plus its legend): mark which gaps
 * are actually thirds and let the surfaces render the rest as explicitly not
 * thirds, rather than inventing a second convention or hiding the row.
 * `tertian` lets a surface caption the whole row when the stack is not a
 * plain stack of thirds at all.
 */
export function stackedThirdsFor(chord: ChordResult, startRole?: IntervalRole): StackedThirds {
	const notes = startRole ? rotateNotesToRole(chord.notes, startRole) : chord.notes;
	const tones = formulaFor({ ...chord, notes });
	const gaps = gapsBetween(notes);
	return { tones, gaps, tertian: gaps.every((gap) => gap.isThird) };
}

/**
 * The gap half of `stackedThirdsFor`, over a bare note list: the interval
 * between each consecutive pair, in the order given.
 *
 * Extracted so the keyboard's tick rail (design handoff "keyboard-native
 * interval display", sketch 2b) reads the SAME derivation the stacked-thirds
 * row does, rather than adding a second answer to "which notes are adjacent
 * and what sits between them." PianoKeyboard only ever holds a
 * `SpelledNote[]`, never a whole `ChordResult`, which is why the note-list
 * shape is the extracted one; `stackedThirdsFor` keeps owning the tone half
 * (that genuinely needs the chord, for root-relative labels).
 *
 * Ordering is the caller's: pass the notes already in the order they should be
 * walked (root-position ascending, or a `rotateNotesToRole` rotation). Total —
 * an empty or single-note list yields no gaps, never throws.
 */
export function gapsBetween(notes: SpelledNote[]): StackedGap[] {
	return notes.slice(0, -1).map((note, i) => {
		const info = intervalBetween(note.letter, notes[i + 1].letter);
		return {
			label: '+' + info.short,
			short: info.short,
			semitones: info.semitones,
			longFr: info.longFr,
			isThird: info.short === 'm3' || info.short === 'M3'
		};
	});
}

/**
 * Alias-equivalence line: tonal's ChordResult.aliases are quality suffixes
 * only (e.g. "m7", "min7", "-7"), not full symbols - so each is prefixed
 * with the chord's root here. Includes the resolved symbol itself first,
 * deduplicated, to always read as "Cm7 = C-7 = Cmin7" regardless of which
 * alias the user typed. Returns just the symbol (no trailing " = ") when
 * there are no aliases.
 *
 * BUG PIN (music-theory audit, Bug B): a slash chord used to have its
 * inversion silently dropped from every alias, so the line asserted a
 * falsehood about the chord on screen:
 *
 *   aliasLine(spellChord('C/E'))      "C/E = CM = C^ = C = Cmaj"
 *   aliasLine(spellChord('Cmaj7/G'))  "Cmaj7/G = Cmaj7 = CΔ = Cma7 = ..."
 *
 * C/E does NOT equal C: same pitch set, different bass, and the bass is the
 * whole point of the symbol. The bass was also left in ASCII on the leading
 * form ("A♭m7/Cb") while displaySymbol correctly yields "A♭m7/C♭".
 *
 * DECISION: append the "/bass" segment to every alias rather than suppress
 * the line on a slash chord. A slash chord's aliases are genuinely useful
 * (a chart can print CΔ/G just as readily as Cmaj7/G) and they are needed
 * most on exactly the inversion symbols the learner reads least fluently, so
 * suppressing would throw away real teaching value to fix a wording bug.
 * Appending makes every equation true instead. The bass comes from
 * chord.bass, which spellChord has already glyph-converted, and the leading
 * form is displaySymbol's (one glyph-rebuild path, not a second copy).
 *
 * BUG PIN (chart-vocabulary sweep): four of tonal's quality aliases contain a
 * slash of their own - "6/9", "m/ma7", "m/maj7", "m/M7" - and appending a bass
 * to those produced a two-slash form that reads as a nested inversion and that
 * the app itself rejects on re-entry:
 *
 *   aliasLine(spellChord('C69/E'))      "C69/E = C6add9/E = C6/9/E = ..."
 *   aliasLine(spellChord('CmMaj7/G'))   "CmMaj7/G = Cm/ma7/G = Cm/maj7/G = ..."
 *
 * spellChord('C6/9/E') and spellChord('Cm/ma7/G') are both UNRECOGNIZED, so
 * the line was offering the learner symbols the lookup cannot parse, on the
 * inversion surface where he is least sure what he is reading. Slash-bearing
 * aliases are therefore dropped on a slash chord only; every other alias
 * still gets its bass appended, and a root-position chord's line is
 * unchanged (it still shows C6/9 and Cm/ma7, which do parse).
 *
 * BUG PIN 2 (same sweep, root-position too): an alias whose first character is
 * an ACCIDENTAL gets absorbed into the root's own accidental slot when the two
 * are concatenated, silently renaming the root:
 *
 *   aliasLine(spellChord('C7b9sus'))  "C7b9sus = Cphryg = Cb9sus"
 *
 * "Cb9sus" reads back as C FLAT 9sus, a different chord on a different root,
 * so the line stated a falsehood for all 12 roots of this type (tonal's
 * `b9sus` is the only alias in its whole dictionary that begins with an
 * accidental, so this is exactly 24 recognized symbols: the 7b9sus/phryg
 * spellings). Dropped rather than parenthesised, since the app's canonical
 * form for that chord ("C7b9sus") is already in the line.
 */
export function aliasLine(chord: ChordResult): string {
	const bassSuffix = chord.bass === undefined ? '' : `/${chord.bass}`;
	const aliases = chord.aliases.filter(
		(alias) =>
			// Would be swallowed by the root's accidental slot: "C" + "b9sus".
			!/^[b#]/.test(alias) &&
			// Would read as a nested inversion once a bass is appended:
			// "C" + "6/9" + "/E". Harmless (and useful) with no bass.
			!(chord.bass !== undefined && alias.includes('/'))
	);
	const forms = [displaySymbol(chord), ...aliases.map((alias) => chord.root + alias + bassSuffix)];
	return [...new Set(forms)].join(' = ');
}

/**
 * Full glyph-form display symbol for a resolved chord. tonal echoes
 * `chord.symbol` in ASCII accidental form ("Abmaj7", "Abmaj7/Eb") while
 * `chord.root` is glyph-converted ("A♭"). Rebuild the symbol on the glyph
 * root (root-aware, so quality suffixes like "b5" stay untouched) and, for a
 * slash chord, glyph-convert the bass segment after the final "/" (quality
 * suffixes always precede the slash, so lastIndexOf is safe). Use this for
 * every display surface (the ChordGlyph quality suffix, the slash-explain
 * base symbol); keep `chord.symbol` itself ASCII for drill seeds,
 * recent-lookups, and spellChord round-trips.
 */
export function displaySymbol(chord: ChordResult): string {
	const asciiRoot = toAsciiAccidentals(chord.root);
	const glyphBody = chord.symbol.startsWith(asciiRoot)
		? chord.root + chord.symbol.slice(asciiRoot.length)
		: chord.symbol;
	const slashIndex = glyphBody.lastIndexOf('/');
	if (slashIndex === -1) return glyphBody;
	return `${glyphBody.slice(0, slashIndex)}/${toGlyphAccidentals(glyphBody.slice(slashIndex + 1))}`;
}

/**
 * Layer 2's generated (never hardcoded) plain-English formula sentence:
 * "From the root, stack a minor 3rd, then a diminished 5th." Built from
 * formulaFor's entries beyond the root, each rendered through the shared
 * intervalFromShort(...).long vocabulary (the same diction BuildSession's
 * construction steps use, BUILD-03), joined by one general template so a
 * triad (2 tones) and a seventh chord (3 tones) both fall out of the same
 * join with no per-count branching or per-chord literals. Total: an
 * unrecognized chord (empty notes) yields "", never throws.
 *
 * Locale-aware (Phase 17 copy translated for full i18n consistency): the
 * French variant uses each interval's `longFr` name and the feminine
 * "une ... , puis une ..." template (tierce/quinte/septième are all feminine),
 * mirroring the diction BuildSession's French construction steps use. Interval
 * shorthand / chord symbols stay immune; only the connective prose changes.
 */
/**
 * The bare letter name of a spelled note: "E♭" -> "E", "B♭♭" -> "B".
 * SpelledNote.letter is always one uppercase A..G followed by zero or more
 * accidental glyphs (never ASCII #/b, per SpelledNote's contract), so the
 * first character IS the letter name.
 */
function letterNameOf(spelled: string): string {
	return spelled.charAt(0);
}

/**
 * The lookup panel's "why is the third spelled THAT way?" sentence, generated
 * from the chord's own spelled third rather than from a worked example.
 *
 * The copy this replaced was written for the Am7 / Amaj7 duo (C vs C♯) and
 * then reused for every chord: it asserted a minor third "gives the natural
 * note, not the sharp" and a major third "gives the sharp note", which is
 * false for Cm7 (E♭ is a flat) and for Fmaj7 (A is natural). It held for only
 * 6 of 12 roots minor / 5 of 12 major.
 *
 * The true mechanism, and what this sentence now teaches for EVERY root: the
 * interval NUMBER counts letter names (a third always spans three, so from
 * {root} the answer is some kind of {letter}), and the interval QUALITY counts
 * half steps (which picks the accidental). That is why 3 semitones above C is
 * E♭ and not D♯: D♯ would span only two letter names (C, D) and be a second.
 *
 * Every number and letter in the sentence comes from the chord's own
 * intervalBetween(root, third) / spelled third, so it cannot drift from the
 * formula row or the keyboard above it. Locale-aware via the interval module's
 * own long names (`long` / `longFr`), matching formulaSentence's diction.
 *
 * Total: a chord with no third role (a sus4, an unrecognized chord) returns
 * "", never throws.
 */
export function thirdSpellingSentence(chord: ChordResult): string {
	const third = chord.notes.find((note) => note.role === 'third');
	if (!third) return '';
	const info = intervalBetween(chord.root, third.letter);
	if (info.short === '') return '';
	const qualityName = currentLocale() === 'fr' ? info.longFr : info.long;
	return t('home.why.third-step')
		.replaceAll('{QUALITY}', qualityName)
		.replaceAll('{SEMI}', String(info.semitones))
		.replaceAll('{ROOT}', chord.root)
		.replaceAll('{DEGREE}', letterNameOf(third.letter));
}

/**
 * English indefinite article for an interval name: "an" before a
 * vowel-initial name ("an augmented 4th", "an octave"), "a" otherwise.
 *
 * BUG PIN (music-theory audit, Bug C): the sentence hardcoded "a" in every
 * slot, so formulaSentence(spellChord('C7#11')) read "... then a augmented
 * 11th." and C7#9 "a augmented 9th". Applied to the FIRST slot too, not only
 * the "then" slots, since a chord can stack a vowel-initial interval first
 * (C5's perfect octave, an augmented triad's own spelling variants).
 *
 * The French sibling needs no counterpart: its article is the feminine "une",
 * which never elides in French, and every FRENCH_DEGREE_NOUNS entry
 * (fondamentale, seconde, tierce, quarte, quinte, sixte, septième, octave,
 * neuvième ... treizième) is feminine, so "une octave" and "une onzième
 * augmentée" are already correct. Asserted in both locales in the tests.
 */
function enArticle(intervalName: string): string {
	return /^[aeiou]/i.test(intervalName) ? 'an' : 'a';
}

export function formulaSentence(chord: ChordResult): string {
	const isFr = currentLocale() === 'fr';
	const longs = formulaFor(chord)
		.filter((entry) => entry.role !== 'root')
		.map((entry) => {
			const info = intervalFromShort(entry.label);
			return isFr ? info.longFr : info.long;
		});
	if (longs.length === 0) return '';
	if (isFr) {
		return `À partir de la fondamentale, empile une ${longs.join(', puis une ')}.`;
	}
	const stacked = longs.map(
		(long, index) => `${index === 0 ? '' : 'then '}${enArticle(long)} ${long}`
	);
	return `From the root, stack ${stacked.join(', ')}.`;
}
