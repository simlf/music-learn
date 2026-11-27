import { describe, expect, it } from 'vitest';
import { beatsPerMeasure, parseRhythm } from './rhythmParse';

describe('beatsPerMeasure', () => {
	it.each([
		['2/4', 2],
		['3/4', 3],
		['4/4', 4],
		['6/8', 3],
		['2/2', 4]
	])('%s is %d quarter-note beats', (sig, beats) => expect(beatsPerMeasure(sig)).toBe(beats));

	it.each(['4', '4/3', 'x/4', '', '3/16'])('rejects %j', (sig) =>
		expect(() => beatsPerMeasure(sig)).toThrow()
	);
});

describe('parseRhythm', () => {
	it('places onsets on the beat grid', () => {
		const p = parseRhythm('4/4', ['q h q', 'w']);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0, 1, 3, 4]);
		expect(p.totalBeats).toBe(8);
		expect(p.measures.map((m) => m.startBeat)).toEqual([0, 4]);
	});

	it('handles dots: a dotted half is three beats', () => {
		const p = parseRhythm('3/4', ['h.', 'q q q']);
		expect(p.notes[0].beats).toBe(3);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0, 3, 4, 5]);
	});

	it('handles eighths and sixteenths', () => {
		const p = parseRhythm('2/4', ['e e e e', 's s s s q']);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0, 0.5, 1, 1.5, 2, 2.25, 2.5, 2.75, 3]);
	});

	it('does not count a tied-on note as an onset, across the barline too', () => {
		const p = parseRhythm('2/4', ['q q~', 'q q']);
		expect(p.notes.map((n) => n.isOnset)).toEqual([true, true, false, true]);
		expect(p.notes[2].tiedFromPrev).toBe(true);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0, 1, 3]);
	});

	it('chains ties through a middle note', () => {
		const p = parseRhythm('2/4', ['h~', 'q~ q']);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0]);
	});

	it('does not count rests as onsets but still advances time', () => {
		const p = parseRhythm('4/4', ['q rq h']);
		expect(p.notes[1].rest).toBe(true);
		expect(p.onsets.map((n) => n.startBeat)).toEqual([0, 2]);
	});

	it('changes time signature mid-exercise with @', () => {
		const p = parseRhythm('2/4', ['q q', '@3/4 q q q', 'h.']);
		expect(p.measures.map((m) => m.timeSignature)).toEqual(['2/4', '3/4', '3/4']);
		expect(p.measures.map((m) => m.showTimeSignature)).toEqual([true, true, false]);
		expect(p.measures.map((m) => m.startBeat)).toEqual([0, 2, 5]);
		expect(p.totalBeats).toBe(8);
	});

	it('builds the metronome beat list with an accent on each downbeat', () => {
		const p = parseRhythm('2/4', ['q q', '@3/4 q q q']);
		expect(p.beats.map((b) => b.accent)).toEqual([true, false, true, false, false]);
		expect(p.beats.map((b) => b.measure)).toEqual([0, 0, 1, 1, 1]);
		expect(p.beats.map((b) => b.beatInMeasure)).toEqual([0, 1, 0, 1, 2]);
	});

	it('names the bar when it does not add up', () => {
		expect(() => parseRhythm('4/4', ['q q q q', 'q q q'])).toThrow(/Bar 2/);
		expect(() => parseRhythm('2/4', ['q q q'])).toThrow(/adds up to 3 beats but 2\/4 needs 2/);
	});

	it('rejects malformed tokens', () => {
		expect(() => parseRhythm('4/4', ['q q q x'])).toThrow(/bad note token/);
		expect(() => parseRhythm('4/4', ['q q q q.'])).toThrow();
	});

	it('rejects a tie into a rest, a tied rest and a dangling final tie', () => {
		expect(() => parseRhythm('2/4', ['q~ rq'])).toThrow(/tie cannot run into a rest/);
		expect(() => parseRhythm('2/4', ['q rq~'])).toThrow(/rest cannot be tied/);
		expect(() => parseRhythm('2/4', ['q q~'])).toThrow(/last note/);
	});
});
