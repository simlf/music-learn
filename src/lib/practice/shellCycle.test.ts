import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { matchInversion } from '$lib/drills/matchInversion';
import {
	SHELL_CYCLE_KEYS,
	SHELL_FORMS,
	gradeRootedShell,
	lettersForChromas,
	positionForBar,
	rootedShell,
	shellCycleBars,
	voiceRootedShell,
	type ShellPosition
} from './shellCycle';

const letters = (symbol: string) => rootedShell(spellChord(symbol)).notes.map((note) => note.letter);
const POSITIONS: ShellPosition[] = ['third-low', 'seventh-low'];

function allChords() {
	return SHELL_FORMS.flatMap((form) =>
		SHELL_CYCLE_KEYS[form].flatMap((key) =>
			shellCycleBars(form, key).map((bar, index) => ({ form, key, bar, index }))
		)
	);
}

describe('SHELL_CYCLE_KEYS', () => {
	it.each(SHELL_FORMS)('%s walks all 12 pitch classes, each key a fourth above the last', (form) => {
		const chromas = SHELL_CYCLE_KEYS[form].map((key) => chromaOf(key));
		expect(new Set(chromas).size).toBe(12);
		expect(SHELL_CYCLE_KEYS[form][0]).toBe('C');
		for (let i = 1; i < chromas.length; i++) {
			expect(((chromas[i]! - chromas[i - 1]! + 12) % 12)).toBe(5);
		}
	});

	it('major never spells a double accidental, minor at most once (G♯ minor V7 third)', () => {
		const doubles = (form: 'major' | 'minor') =>
			SHELL_CYCLE_KEYS[form]
				.flatMap((key) => shellCycleBars(form, key))
				.flatMap((bar) => spellChord(bar.symbol).notes)
				.filter((note) => /♭♭|♯♯|𝄪|𝄫/.test(note.letter));
		expect(doubles('major')).toEqual([]);
		expect(doubles('minor').length).toBeLessThanOrEqual(1);
	});
});

describe('shellCycleBars', () => {
	it('builds three recognized chords in every key of both forms, roots single-accidental', () => {
		for (const form of SHELL_FORMS) {
			for (const key of SHELL_CYCLE_KEYS[form]) {
				const bars = shellCycleBars(form, key);
				expect(bars.map((bar) => bar.roman)).toEqual(form === 'major' ? ['ii', 'V', 'I'] : ['iiø', 'V', 'i']);
				for (const bar of bars) {
					const chord = spellChord(bar.symbol);
					expect(chord.recognized).toBe(true);
					expect(chord.root.length).toBeLessThanOrEqual(2);
				}
			}
		}
	});

	it('spells the enharmonic tonics the vetted key list does not carry', () => {
		expect(shellCycleBars('major', 'G♭').map((bar) => bar.symbol)).toEqual(['A♭m7', 'D♭7', 'G♭maj7']);
		expect(shellCycleBars('minor', 'C♯').map((bar) => bar.symbol)).toEqual(['D♯m7b5', 'G♯7', 'C♯m7']);
	});
});

describe('rootedShell', () => {
	it('is the root plus the 3rd and the 7th', () => {
		expect(letters('Dm7')).toEqual(['D', 'F', 'C']);
		expect(letters('G7')).toEqual(['G', 'B', 'F']);
		expect(letters('Cmaj7')).toEqual(['C', 'E', 'B']);
	});

	it('is three notes on a ♭5 chord too: the ♭5 is not part of the target', () => {
		expect(letters('Dm7b5')).toEqual(['D', 'F', 'C']);
	});

	it('is ungradeable for an unrecognized symbol', () => {
		const target = rootedShell(spellChord('Xq9'));
		expect(matchInversion([], undefined, target, 0).correct).toBe(false);
	});
});

describe('gradeRootedShell', () => {
	const chromas = (...names: string[]) => names.map((name) => chromaOf(name)!);
	const D = chromaOf('D')!;

	it('accepts the three-note iiø shell, root lowest', () => {
		const result = gradeRootedShell(chromas('D', 'F', 'C'), D, spellChord('Dm7b5'));
		expect(result.correct).toBe(true);
	});

	it('also accepts the iiø shell with the ♭5 added', () => {
		const result = gradeRootedShell(chromas('D', 'F', 'A♭', 'C'), D, spellChord('Dm7b5'));
		expect(result).toMatchObject({ correct: true, missing: [], extra: [] });
	});

	it('still rejects a ♭5 in the bass', () => {
		const result = gradeRootedShell(chromas('A♭', 'D', 'F', 'C'), chromaOf('A♭'), spellChord('Dm7b5'));
		expect(result).toMatchObject({ chordCorrect: true, bassCorrect: false });
	});

	it('does not accept a perfect 5th as optional, on any chord', () => {
		expect(gradeRootedShell(chromas('D', 'F', 'A', 'C'), D, spellChord('Dm7b5')).extra).toEqual(chromas('A'));
		expect(gradeRootedShell(chromas('D', 'F', 'A', 'C'), D, spellChord('Dm7')).extra).toEqual(chromas('A'));
	});

	it('still requires the 3rd and the 7th', () => {
		const result = gradeRootedShell(chromas('D', 'A♭', 'C'), D, spellChord('Dm7b5'));
		expect(result.correct).toBe(false);
		expect(result.missing).toEqual(chromas('F'));
	});
});

describe('voiceRootedShell', () => {
	it('voices every one of the 72 chords on the two-octave board, root lowest, strictly ascending', () => {
		for (const { bar } of allChords()) {
			const chord = spellChord(bar.symbol);
			for (const position of POSITIONS) {
				const { notes } = voiceRootedShell(chord, position);
				expect(notes.length).toBe(rootedShell(chord).notes.length);
				expect(notes[0].role).toBe('root');
				expect(notes[0].midi).toBeGreaterThanOrEqual(59);
				expect(notes[notes.length - 1].midi).toBeLessThanOrEqual(84);
				for (let i = 1; i < notes.length; i++) expect(notes[i].midi).toBeGreaterThan(notes[i - 1].midi);
			}
		}
	});

	it('Show me always shows an answer the grader accepts', () => {
		for (const { bar, index } of allChords()) {
			const chord = spellChord(bar.symbol);
			const { notes } = voiceRootedShell(chord, positionForBar(index));
			const played = notes.map((note) => chromaOf(note.letter)!);
			const result = gradeRootedShell(played, played[0], chord);
			expect(result.correct, bar.symbol).toBe(true);
		}
	});

	it('puts the 3rd or the 7th directly above the root, as asked', () => {
		const above = (position: ShellPosition) =>
			voiceRootedShell(spellChord('Dm7'), position).notes.map((note) => note.marker);
		expect(above('third-low')).toEqual(['R', '3', '7']);
		expect(above('seventh-low')).toEqual(['R', '7', '3']);
		expect(voiceRootedShell(spellChord('Dm7b5'), 'seventh-low').notes.map((note) => note.marker)).toEqual([
			'R',
			'7',
			'3'
		]);
	});

	it('falls back to the other position rather than run off the top of the board', () => {
		const voiced = voiceRootedShell(spellChord('B7'), 'seventh-low');
		expect(voiced.position).toBe('third-low');
		expect(voiced.notes.map((note) => note.letter)).toEqual(['B', 'D♯', 'A']);
	});

	it('places C♭ on the B key of the lower octave, not an octave up', () => {
		const voiced = voiceRootedShell(spellChord('A♭m7'), 'third-low');
		// C♭5 sounds B4, so it sits on the B key of the board's octave 4.
		expect(voiced.notes.map((note) => [note.letter, note.midi, note.octave])).toEqual([
			['A♭', 68, 4],
			['C♭', 71, 4],
			['G♭', 78, 5]
		]);
		expect(voiceRootedShell(spellChord('G♭maj7'), 'third-low').notes[0].octave).toBe(4);
	});

	it('draws the concept example: the ii V I of Autumn Leaves in B♭, alternating positions', () => {
		const stacks = shellCycleBars('major', 'B♭').map((bar, index) =>
			voiceRootedShell(spellChord(bar.symbol), positionForBar(index)).notes.map((note) => note.letter)
		);
		expect(stacks).toEqual([
			['C', 'E♭', 'B♭'],
			['F', 'E♭', 'A'],
			['B♭', 'D', 'A']
		]);
	});
});

describe('lettersForChromas', () => {
	it("names chromas in the target's own spelling, skipping ones it lacks", () => {
		const target = rootedShell(spellChord('Cm7'));
		expect(lettersForChromas(target, [3, 10, 4])).toEqual(['E♭', 'B♭']);
	});
});
