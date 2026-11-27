/**
 * Parses the rhythm DSL of `data/rhythmData.ts` into a timeline.
 *
 * Time is in QUARTER-NOTE BEATS from the first beat of the exercise. A beat
 * unit of one quarter note is what the metronome clicks, whatever the time
 * signature's denominator says, which is how the book is taught (Dandelot's
 * "unite de temps: la noire").
 */

export type NoteValue = 'w' | 'h' | 'q' | 'e' | 's';

const VALUE_BEATS: Record<NoteValue, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

export interface RhythmNote {
	/** Position in the flat note list. */
	index: number;
	measure: number;
	/** Beats from the start of the exercise. */
	startBeat: number;
	/** Length in beats. */
	beats: number;
	value: NoteValue;
	dotted: boolean;
	rest: boolean;
	/** This note is tied to the NEXT one: the next one is not struck. */
	tiedToNext: boolean;
	/** This note continues a tie from the previous one, so there is no new attack. */
	tiedFromPrev: boolean;
	/** True when the player has to tap here: a real note that is not a tie continuation. */
	isOnset: boolean;
}

export interface RhythmMeasure {
	index: number;
	timeSignature: string;
	/** Beats in this bar (3 for 3/4, 4 for 4/4). */
	beats: number;
	startBeat: number;
	noteIndexes: number[];
	/** True when this bar's signature differs from the previous bar's (always true for bar 0). */
	showTimeSignature: boolean;
}

export interface MetronomeBeat {
	/** Beat number from the start, 0-based. */
	index: number;
	/** Bar this beat falls in. */
	measure: number;
	/** 0 for the downbeat. */
	beatInMeasure: number;
	accent: boolean;
}

export interface ParsedRhythm {
	measures: RhythmMeasure[];
	notes: RhythmNote[];
	/** Onsets only, in order: what the score is measured against. */
	onsets: RhythmNote[];
	totalBeats: number;
	/** One entry per quarter-note beat of the whole exercise, for the metronome. */
	beats: MetronomeBeat[];
}

const NOTE_TOKEN = /^(r?)([whqes])(\.?)(~?)$/;
const SIGNATURE = /^(\d{1,2})\/(2|4|8)$/;

/** Beats per bar for a signature like "3/4" (6/8 is 3 quarter-beats). Throws on malformed input. */
export function beatsPerMeasure(signature: string): number {
	const m = SIGNATURE.exec(signature);
	if (!m) throw new Error(`Bad time signature: "${signature}"`);
	return (Number(m[1]) * 4) / Number(m[2]);
}

/**
 * Parses an exercise. Throws, with the bar number, when a token is malformed,
 * a bar does not add up to its signature, or a tie points at a rest or at
 * nothing: a data error should fail a test, never reach a player.
 */
export function parseRhythm(timeSignature: string, measureStrings: string[]): ParsedRhythm {
	const notes: RhythmNote[] = [];
	const measures: RhythmMeasure[] = [];
	let signature = timeSignature;
	let cursor = 0;

	measureStrings.forEach((raw, measureIndex) => {
		let text = raw.trim();
		const change = /^@(\S+)\s+/.exec(text);
		if (change) {
			signature = change[1];
			text = text.slice(change[0].length);
		}
		const barBeats = beatsPerMeasure(signature);
		const startBeat = cursor;
		const noteIndexes: number[] = [];
		let used = 0;

		for (const token of text.split(/\s+/).filter(Boolean)) {
			const m = NOTE_TOKEN.exec(token);
			if (!m) throw new Error(`Bar ${measureIndex + 1}: bad note token "${token}"`);
			const value = m[2] as NoteValue;
			const dotted = m[3] === '.';
			const beats = VALUE_BEATS[value] * (dotted ? 1.5 : 1);
			const previous = notes[notes.length - 1];
			const tiedFromPrev = previous?.tiedToNext ?? false;
			const rest = m[1] === 'r';
			if (tiedFromPrev && rest) {
				throw new Error(`Bar ${measureIndex + 1}: a tie cannot run into a rest`);
			}
			if (rest && m[4] === '~') {
				throw new Error(`Bar ${measureIndex + 1}: a rest cannot be tied`);
			}
			const note: RhythmNote = {
				index: notes.length,
				measure: measureIndex,
				startBeat: cursor,
				beats,
				value,
				dotted,
				rest,
				tiedToNext: m[4] === '~',
				tiedFromPrev,
				isOnset: !rest && !tiedFromPrev
			};
			notes.push(note);
			noteIndexes.push(note.index);
			cursor += beats;
			used += beats;
		}

		if (used !== barBeats) {
			throw new Error(
				`Bar ${measureIndex + 1}: adds up to ${used} beats but ${signature} needs ${barBeats}`
			);
		}
		measures.push({
			index: measureIndex,
			timeSignature: signature,
			beats: barBeats,
			startBeat,
			noteIndexes,
			showTimeSignature: measureIndex === 0 || signature !== measures[measureIndex - 1].timeSignature
		});
	});

	const last = notes[notes.length - 1];
	if (last?.tiedToNext) throw new Error('The last note cannot be tied to nothing');

	const beats: MetronomeBeat[] = [];
	for (const measure of measures) {
		for (let b = 0; b < measure.beats; b++) {
			beats.push({
				index: beats.length,
				measure: measure.index,
				beatInMeasure: b,
				accent: b === 0
			});
		}
	}

	return {
		measures,
		notes,
		onsets: notes.filter((n) => n.isOnset),
		totalBeats: cursor,
		beats
	};
}
