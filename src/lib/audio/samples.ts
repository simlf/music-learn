/**
 * Salamander Grand Piano sample map: 30 mp3 files at minor-third spacing
 * across A0-C8, single velocity layer, self-hosted under
 * static/samples/salamander/ (served at /samples/salamander/ by
 * adapter-static). Tone.Sampler repitches between the provided samples, so
 * this spacing covers all 88 keys.
 *
 * Samples: Salamander Grand Piano v3 by Alexander Holm, CC-BY 3.0. Mp3
 * conversion from the Tone.js project. See LICENSE.txt next to the files.
 */

export const SALAMANDER_BASE_URL = '/samples/salamander/';

/** Note-name -> file-name map in Tone.Sampler `urls` shape ("s" means sharp). */
export const SALAMANDER_URLS: Record<string, string> = {
	A0: 'A0.mp3',
	C1: 'C1.mp3',
	'D#1': 'Ds1.mp3',
	'F#1': 'Fs1.mp3',
	A1: 'A1.mp3',
	C2: 'C2.mp3',
	'D#2': 'Ds2.mp3',
	'F#2': 'Fs2.mp3',
	A2: 'A2.mp3',
	C3: 'C3.mp3',
	'D#3': 'Ds3.mp3',
	'F#3': 'Fs3.mp3',
	A3: 'A3.mp3',
	C4: 'C4.mp3',
	'D#4': 'Ds4.mp3',
	'F#4': 'Fs4.mp3',
	A4: 'A4.mp3',
	C5: 'C5.mp3',
	'D#5': 'Ds5.mp3',
	'F#5': 'Fs5.mp3',
	A5: 'A5.mp3',
	C6: 'C6.mp3',
	'D#6': 'Ds6.mp3',
	'F#6': 'Fs6.mp3',
	A6: 'A6.mp3',
	C7: 'C7.mp3',
	'D#7': 'Ds7.mp3',
	'F#7': 'Fs7.mp3',
	A7: 'A7.mp3',
	C8: 'C8.mp3'
};
