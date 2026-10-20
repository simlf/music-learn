import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { SHELL_CYCLE_KEYS } from './shellCycle';
import {
	GUIDE_TONE_CYCLE_KEYS,
	MAX_VOICE_STEP,
	gradeGuideTones,
	guideToneCycleBars,
	guideToneLines,
	guideTonePair,
	guideTonePattern,
	isSmoothMove,
	voiceGuideTones
} from './guideToneCycle';

/** Board key position, `octave * 12 + chroma`, the engine's own pitch scale. */
const at = (letter: string, octave: number) => octave * 12 + chromaOf(letter)!;

/** The three voiced pairs of a key, each voiced from the one before it, exactly as Show me chains them. */
function chained(key: string) {
	const pairs: ReturnType<typeof voiceGuideTones>[] = [];
	let previous: number[] | null = null;
	guideToneCycleBars(key).forEach((bar, index) => {
		const voiced = voiceGuideTones(spellChord(bar.symbol), index, previous);
		pairs.push(voiced);
		previous = voiced.map((note) => note.pitch);
	});
	return pairs;
}

describe('the cycle', () => {
	it("walks chapter 15's major cycle of fourths, never a second list", () => {
		expect(GUIDE_TONE_CYCLE_KEYS).toBe(SHELL_CYCLE_KEYS.major);
		expect(guideToneCycleBars('C').map((bar) => bar.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']);
	});

	it('targets only the 3rd and the 7th', () => {
		const pair = guideTonePair(spellChord('Dm7'));
		expect(pair.notes.map((note) => [note.letter, note.role])).toEqual([
			['F', 'third'],
			['C', 'seventh']
		]);
	});
});

describe('voiceGuideTones', () => {
	it('stacks the first chord of a key from C4, the ii with the 3rd low', () => {
		const [ii] = chained('C');
		expect(ii.map((note) => [note.letter, note.octave, note.marker])).toEqual([
			['F', 4, '3'],
			['C', 5, '7']
		]);
	});

	it('voices ii V I in C as the lesson draws it: C falls to B, then F falls to E', () => {
		expect(chained('C').map((pair) => pair.map((note) => `${note.letter}${note.octave}`))).toEqual([
			['F4', 'C5'],
			['F4', 'B4'],
			['E4', 'B4']
		]);
	});

	it('in all 12 keys, every pair stays on the board and every move holds one voice and drops the other a half step', () => {
		for (const key of GUIDE_TONE_CYCLE_KEYS) {
			const pairs = chained(key);
			expect(pairs.every((pair) => pair.length === 2), key).toBe(true);
			for (const pair of pairs) {
				for (const note of pair) {
					expect(note.pitch, key).toBeGreaterThanOrEqual(48);
					expect(note.pitch, key).toBeLessThanOrEqual(71);
				}
			}
			for (let i = 1; i < pairs.length; i++) {
				const before = pairs[i - 1].map((note) => note.pitch);
				const after = pairs[i].map((note) => note.pitch);
				expect(isSmoothMove(before, after), key).toBe(true);
				// Mod 12 the motion is always the same: one voice holds, the other falls one half step.
				const moves = [0, 1]
					.map((voice) => (((after[voice] - before[voice]) % 12) + 12) % 12)
					.sort((a, b) => a - b);
				expect(moves, key).toEqual([0, 11]);
			}
		}
	});

	it('Show me continues from the player own previous pair, not from a fixed position', () => {
		// Dm7 played with the 7th low (C4 F4): G7's B lands on the B under it, off the board, so the pair moves up an octave.
		const g7 = voiceGuideTones(spellChord('G7'), 1, [at('C', 4), at('F', 4)]);
		expect(g7.map((note) => `${note.letter}${note.octave}`)).toEqual(['B4', 'F5']);
		expect(isSmoothMove([at('C', 4), at('F', 4)], g7.map((note) => note.pitch))).toBe(true);
	});

	it('is total: a chord without both guide tones voices nothing', () => {
		expect(voiceGuideTones(spellChord('nope'), 0, null)).toEqual([]);
		expect(voiceGuideTones(spellChord('C'), 0, null)).toEqual([]);
	});
});

describe('isSmoothMove', () => {
	it('allows a hold and a step of up to a whole step', () => {
		expect(MAX_VOICE_STEP).toBe(2);
		expect(isSmoothMove([at('F', 4), at('C', 5)], [at('F', 4), at('B', 4)])).toBe(true);
		expect(isSmoothMove([at('F', 4), at('C', 5)], [at('E♭', 4), at('B♭', 4)])).toBe(true);
	});

	it('refuses a jump across the board', () => {
		expect(isSmoothMove([at('F', 4), at('C', 5)], [at('B', 4), at('F', 5)])).toBe(false);
	});

	it('forgives the whole pair moving an octave together', () => {
		expect(isSmoothMove([at('F', 4), at('C', 5)], [at('F', 5), at('B', 5)])).toBe(true);
	});

	it('only compares pairs', () => {
		expect(isSmoothMove([at('F', 4)], [at('F', 4), at('B', 4)])).toBe(false);
	});
});

describe('gradeGuideTones', () => {
	const g7 = spellChord('G7');
	const dm7Played = [at('F', 4), at('C', 5)];

	it('passes the right two notes with no previous pair, in either order', () => {
		expect(gradeGuideTones([at('B', 4), at('F', 5)], g7, null)).toEqual({
			notesCorrect: true,
			missing: [],
			extra: [],
			smooth: true
		});
	});

	it('passes the right two notes that continue the line', () => {
		expect(gradeGuideTones([at('F', 4), at('B', 4)], g7, dm7Played).smooth).toBe(true);
	});

	it('names right notes played with a jump as notes right, not smooth', () => {
		const grade = gradeGuideTones([at('B', 4), at('F', 5)], g7, dm7Played);
		expect(grade.notesCorrect).toBe(true);
		expect(grade.smooth).toBe(false);
	});

	it('reports a missing guide tone and an extra root', () => {
		const grade = gradeGuideTones([at('G', 4), at('B', 4)], g7, null);
		expect(grade.notesCorrect).toBe(false);
		expect(grade.missing).toEqual([5]);
		expect(grade.extra).toEqual([7]);
	});

	it('refuses the two guide tones plus anything else', () => {
		expect(gradeGuideTones([at('G', 4), at('B', 4), at('F', 5)], g7, null).notesCorrect).toBe(false);
	});

	it('fails an unresolvable key closed', () => {
		expect(gradeGuideTones([-1, at('B', 4)], g7, null).extra).toContain(-1);
	});
});

describe('guideToneLines and guideTonePattern', () => {
	it('splits ii V I in C into two lines that only hold or fall', () => {
		const { upper, lower } = guideToneLines('C');
		expect(upper.notes.map((note) => `${note.letter}${note.octave}`)).toEqual(['C5', 'B4', 'B4']);
		expect(lower.notes.map((note) => `${note.letter}${note.octave}`)).toEqual(['F4', 'F4', 'E4']);
	});

	it('renders the C pattern: two guide-tone lines over the roots, synthesized only, at the loop default tempo', () => {
		expect(guideTonePattern('C')).toBe(
			[
				'setcpm(17.5)',
				'stack(',
				'  note("<c5 b4 b4>").s("triangle"),',
				'  note("<f4 f4 e4>").s("triangle"),',
				'  note("<d3 g3 c3>").s("sine").gain(0.6)',
				')'
			].join('\n')
		);
	});

	it('writes C♭ in the octave it is spelled in, not the key it sits on', () => {
		// G♭ major: A♭m7 is C♭ and G♭; C♭ sits on a B key but is written one octave up.
		const { upper, lower } = guideToneLines('G♭');
		const all = [...upper.notes, ...lower.notes];
		const cFlat = all.find((note) => note.letter === 'C♭');
		expect(cFlat).toBeDefined();
		expect(guideTonePattern('G♭')).toContain(`cb${cFlat!.octave}`);
		const bKeyOctave = voiceGuideTones(spellChord('A♭m7'), 0, null).find((note) => note.letter === 'C♭')!.octave;
		expect(cFlat!.octave).toBe(bKeyOctave + 1);
	});

	it('uses ASCII accidentals and only synthesized waveforms in every key', () => {
		for (const key of GUIDE_TONE_CYCLE_KEYS) {
			const pattern = guideTonePattern(key);
			expect(pattern, key).not.toBe('');
			expect(pattern, key).not.toMatch(/[♭♯]/);
			const sounds = [...pattern.matchAll(/\.s\("([^"]+)"\)/g)].map((match) => match[1]);
			expect(new Set(sounds), key).toEqual(new Set(['triangle', 'sine']));
		}
	});

	it('is total: an unknown key renders nothing', () => {
		expect(guideTonePattern('H')).toBe('');
	});
});
