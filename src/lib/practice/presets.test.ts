import { describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { SONG_PRESETS, songFromPreset } from './presets';

describe('preset library shape', () => {
	it('ships the 7 presets from R5 in shelf order', () => {
		expect(SONG_PRESETS.map((preset) => preset.presetId)).toEqual([
			'autumn-leaves-gm',
			'autumn-leaves-em',
			'blue-bossa-cm',
			'take-the-a-train-c',
			'summertime-am',
			'all-of-me-c',
			'fly-me-to-the-moon-c'
		]);
	});

	it('every preset has a name, a note, and a non-empty progression', () => {
		for (const preset of SONG_PRESETS) {
			expect(preset.name.length).toBeGreaterThan(0);
			expect(preset.note.length).toBeGreaterThan(0);
			expect(preset.chordSymbols.length).toBeGreaterThan(0);
		}
	});

	it('carries the full ordered progressions (duplicates drive drill weight)', () => {
		const counts = Object.fromEntries(
			SONG_PRESETS.map((preset) => [preset.presetId, preset.chordSymbols.length])
		);
		expect(counts).toEqual({
			'autumn-leaves-gm': 35,
			'autumn-leaves-em': 35,
			'blue-bossa-cm': 16,
			'take-the-a-train-c': 32,
			'summertime-am': 21,
			'all-of-me-c': 33,
			'fly-me-to-the-moon-c': 37
		});
	});

	it('contains no em dashes in any user-facing preset copy', () => {
		for (const preset of SONG_PRESETS) {
			expect(preset.name).not.toContain('—');
			expect(preset.note).not.toContain('—');
		}
	});
});

describe('preset symbol validity against the theory engine', () => {
	it('every symbol in every preset round-trips through spellChord unchanged', () => {
		for (const preset of SONG_PRESETS) {
			for (const symbol of preset.chordSymbols) {
				const spelled = spellChord(symbol);
				expect(spelled.recognized, `${preset.presetId}: ${symbol} not recognized`).toBe(true);
				expect(spelled.symbol, `${preset.presetId}: ${symbol} echoes as ${spelled.symbol}`).toBe(
					symbol
				);
				expect(spelled.notes.length, `${preset.presetId}: ${symbol} spelled no notes`).toBeGreaterThan(0);
			}
		}
	});
});

describe('songFromPreset (copy-on-add)', () => {
	const blueBossa = SONG_PRESETS.find((preset) => preset.presetId === 'blue-bossa-cm')!;

	it('copies the preset into an active, editable Song with provenance', () => {
		const song = songFromPreset(blueBossa);

		expect(song.name).toBe(blueBossa.name);
		expect(song.chordSymbols).toEqual([...blueBossa.chordSymbols]);
		expect(song.source).toBe('preset');
		expect(song.presetId).toBe('blue-bossa-cm');
		expect(song.active).toBe(true);
		expect(song.id.length).toBeGreaterThan(0);
		expect(() => new Date(song.createdAt).toISOString()).not.toThrow();
	});

	it('mints a fresh id and an independent symbol array per copy', () => {
		const first = songFromPreset(blueBossa);
		const second = songFromPreset(blueBossa);

		expect(first.id).not.toBe(second.id);

		first.chordSymbols.push('G7');
		expect(second.chordSymbols).toHaveLength(blueBossa.chordSymbols.length);
		expect(blueBossa.chordSymbols).toHaveLength(16);
	});
});
