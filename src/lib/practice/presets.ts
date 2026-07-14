/**
 * The preset shelf: 7 beginner jazz standards verified against published
 * lead sheets in R5 (.planning/spikes/research/R5-songs.md). Each preset
 * carries the FULL ordered progression, one symbol per chord change, so
 * duplicates keep their drill weight and the order can feed a future
 * play-through mode.
 *
 * Every symbol stays inside the engine's proven 12-root x 8-quality matrix.
 * Chart decorations were simplified per R5 (Gm6 saved as Gm, D7b9 as D7,
 * C6 as C, G7/F as G7, and so on); each preset's note names its own
 * simplifications so the card copy invites editing rather than implying
 * authority. Chord progressions are uncopyrightable facts; no melodies or
 * lyrics appear anywhere in this module.
 *
 * Presets are code constants, NEVER persisted directly: adding one copies
 * it into a user-owned Song via songFromPreset, so the copy stays editable
 * and preset upgrades never require a data migration.
 */

import type { Song } from './songs';

export interface SongPreset {
	/** Stable slug, e.g. 'autumn-leaves-gm'. Stored on the copied Song as provenance. */
	presetId: string;
	/** Card title, e.g. "Autumn Leaves (G minor)". */
	name: string;
	/** Full ordered progression, validated ASCII symbols (the form spellChord echoes). */
	chordSymbols: readonly string[];
	/** Card sub-line: key context plus the simplifications applied. */
	note: string;
}

/* Autumn Leaves, 32-bar AABC. Two symbols in a bar = two changes in that bar. */
const AUTUMN_LEAVES_GM_A = ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm', 'Gm'];
const AUTUMN_LEAVES_EM_A = ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7b5', 'B7', 'Em', 'Em'];

export const SONG_PRESETS: readonly SongPreset[] = [
	{
		presetId: 'autumn-leaves-gm',
		name: 'Autumn Leaves (G minor)',
		chordSymbols: [
			...AUTUMN_LEAVES_GM_A,
			...AUTUMN_LEAVES_GM_A,
			// B
			'Am7b5', 'D7', 'Gm', 'Gm', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7',
			// C, with the famous descending passing bars
			'Am7b5', 'D7', 'Gm7', 'C7', 'Fm7', 'Bb7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm', 'Gm'
		],
		note: 'Real Book key. Tonic saved as Gm, D7b9 as D7. Edit to match your chart.'
	},
	{
		presetId: 'autumn-leaves-em',
		name: 'Autumn Leaves (E minor)',
		chordSymbols: [
			...AUTUMN_LEAVES_EM_A,
			...AUTUMN_LEAVES_EM_A,
			// B
			'F#m7b5', 'B7', 'Em', 'Em', 'Am7', 'D7', 'Gmaj7', 'Cmaj7',
			// C
			'F#m7b5', 'B7', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'F#m7b5', 'B7', 'Em', 'Em'
		],
		note: 'Common combo key, a minor third up. Tonic saved as Em, B7b9 as B7.'
	},
	{
		presetId: 'blue-bossa-cm',
		name: 'Blue Bossa',
		chordSymbols: [
			'Cm7', 'Cm7', 'Fm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Cm7',
			'Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7', 'Dm7b5', 'G7', 'Cm7', 'Cm7'
		],
		note: 'C minor, 16 bars, nothing simplified. A fine first song, mon ami.'
	},
	{
		presetId: 'take-the-a-train-c',
		name: 'Take the A Train',
		chordSymbols: [
			// A
			'C', 'C', 'D7', 'D7', 'Dm7', 'G7', 'C', 'C',
			// A
			'C', 'C', 'D7', 'D7', 'Dm7', 'G7', 'C', 'C',
			// B
			'Fmaj7', 'Fmaj7', 'Fmaj7', 'Fmaj7', 'D7', 'D7', 'Dm7', 'G7',
			// A
			'C', 'C', 'D7', 'D7', 'Dm7', 'G7', 'C', 'C'
		],
		note: 'C major, AABA. Simplified: C6 saved as C, D7#11 as D7.'
	},
	{
		presetId: 'summertime-am',
		name: 'Summertime',
		chordSymbols: [
			'Am7', 'Bm7b5', 'E7', 'Am7', 'A7', 'Dm7', 'F7', 'Bm7b5', 'E7', 'Am7',
			'Am7', 'Bm7b5', 'E7', 'Am7', 'D7', 'G7', 'Cmaj7', 'Am7', 'Am7', 'Bm7b5', 'E7'
		],
		note: 'A minor, 16 bars. Simplified: E7b13 saved as E7, A7b9 as A7.'
	},
	{
		presetId: 'all-of-me-c',
		name: 'All of Me',
		chordSymbols: [
			// Bars 1-16
			'C', 'C', 'E7', 'E7', 'A7', 'A7', 'Dm7', 'Dm7',
			'E7', 'E7', 'Am7', 'Am7', 'D7', 'D7', 'Dm7', 'G7',
			// Bars 17-24 repeat bars 1-8
			'C', 'C', 'E7', 'E7', 'A7', 'A7', 'Dm7', 'Dm7',
			// Bars 25-32
			'F', 'Fm', 'C', 'Em7', 'A7', 'Dm7', 'G7', 'C', 'C'
		],
		note: 'C major, ABAC. Simplified: F6 saved as F, Fm6 as Fm, C6 as C.'
	},
	{
		presetId: 'fly-me-to-the-moon-c',
		name: 'Fly Me to the Moon',
		chordSymbols: [
			// Bars 1-8
			'Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7', 'A7',
			// Bars 9-16
			'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Fdim7', 'Cmaj7', 'Bm7', 'E7',
			// Bars 17-24 repeat bars 1-8
			'Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7', 'A7',
			// Bars 25-32
			'Dm7', 'G7', 'Em7b5', 'A7', 'Dm7', 'G7', 'C', 'Bm7', 'E7'
		],
		note: 'In C, orbiting A minor. Extensions like G9 and E7b9 saved as G7 and E7.'
	}
];

/**
 * Copies a preset into a fresh, user-owned Song: new id, created now,
 * active immediately (tapping a preset means "I want to practice this"),
 * with the presetId kept as provenance, not protection. The copy is fully
 * editable; the shelf constant above is never mutated.
 */
export function songFromPreset(preset: SongPreset): Song {
	return {
		id: crypto.randomUUID(),
		name: preset.name,
		chordSymbols: [...preset.chordSymbols],
		createdAt: new Date().toISOString(),
		source: 'preset',
		active: true,
		presetId: preset.presetId
	};
}
