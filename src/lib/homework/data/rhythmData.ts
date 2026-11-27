/**
 * Handpicked, hand-transcribed rhythm exercises from Georges Dandelot,
 * "Etude du rythme", Cahier 1 (Mesures simples), Alphonse Leduc. Only the
 * rhythm is kept as data; the scan is not shipped (the book is still under
 * copyright in most places). All exercises there are written on one pitch, so
 * pitch is not stored at all.
 *
 * `page` is the PRINTED page number (PDF index = printed page + 1).
 *
 * DATA FORMAT (the contract an automatic extractor can fill later):
 *  - `timeSignature`: the signature at the start, e.g. "2/4".
 *  - `measures`: one string per bar. Notes are separated by spaces.
 *      note token = [r]<value>[.][~]
 *        r      optional prefix: a rest
 *        value  w whole, h half, q quarter, e eighth, s sixteenth
 *        .      optional dot (x1.5)
 *        ~      optional suffix: tied to the next note (the next note is not
 *               struck again), also across the barline
 *    A bar may start with "@3/4 " to change the time signature from that bar
 *    on (exercises 21 to 24 mix signatures).
 *  - Every bar must add up to its time signature; a test enforces it.
 */
export interface RhythmExercise {
	book: 'etude-du-rythme-1';
	page: number;
	number: number;
	/** Short English description shown above the notation. */
	hint: string;
	timeSignature: string;
	measures: string[];
}

const rep = (bar: string, n: number): string[] => Array.from({ length: n }, () => bar);

export const RHYTHM_EXERCISES: RhythmExercise[] = [
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 1,
		hint: 'The quarter note, in 2/4.',
		timeSignature: '2/4',
		measures: rep('q q', 10)
	},
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 2,
		hint: 'The quarter note, in 4/4.',
		timeSignature: '4/4',
		measures: rep('q q q q', 7)
	},
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 3,
		hint: 'The quarter note, in 3/4.',
		timeSignature: '3/4',
		measures: rep('q q q', 9)
	},
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 4,
		hint: 'The half note, in 2/4.',
		timeSignature: '2/4',
		measures: rep('h', 10)
	},
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 5,
		hint: 'The half note, in 4/4.',
		timeSignature: '4/4',
		measures: rep('h h', 7)
	},
	{
		book: 'etude-du-rythme-1',
		page: 1,
		number: 6,
		hint: 'Quarters and halves, in 2/4.',
		timeSignature: '2/4',
		measures: ['q q', 'q q', 'h', 'h', 'q q', 'h', 'h', 'q q', 'h', 'q q', 'q q', 'h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 7,
		hint: 'Quarters and halves, in 4/4.',
		timeSignature: '4/4',
		measures: ['q q q q', 'h h', 'q q q q', 'h q q', 'h h', 'q q h', 'h q q', 'q q q q', 'h h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 8,
		hint: 'Quarters and halves, in 3/4.',
		timeSignature: '3/4',
		measures: ['q q q', 'q q q', 'h q', 'h q', 'q h', 'q h', 'q q q', 'q h', 'h q', 'q q q']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 9,
		hint: 'The whole note (la ronde), in 4/4.',
		timeSignature: '4/4',
		measures: ['h h', 'h h', 'w', 'w', 'h h', 'w', 'h h', 'w', 'w', 'h h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 10,
		hint: 'Quarters, halves and wholes, in 4/4.',
		timeSignature: '4/4',
		measures: ['q q q q', 'h h', 'w', 'q q q q', 'w', 'h h', 'w', 'h q q', 'q q h', 'w']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 11,
		hint: 'Quarters, halves and wholes, in 4/4.',
		timeSignature: '4/4',
		measures: ['h h', 'h q q', 'q q h', 'q h q', 'q h q', 'w', 'q q q q', 'q h q', 'h h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 2,
		number: 12,
		hint: 'The dotted half note, in 3/4.',
		timeSignature: '3/4',
		measures: rep('h.', 9)
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 13,
		hint: 'Quarters and dotted halves, in 3/4.',
		timeSignature: '3/4',
		measures: ['q q q', 'q q q', 'h.', 'h.', 'q q q', 'h.', 'h.', 'q q q', 'h.', 'q q q']
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 14,
		hint: 'Quarters, halves and dotted halves, in 3/4.',
		timeSignature: '3/4',
		measures: ['q q q', 'h.', 'h q', 'h.', 'q h', 'q h', 'q q q', 'h q', 'q h', 'h.']
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 15,
		hint: 'Dotted halves, halves, quarters and wholes, in 4/4.',
		timeSignature: '4/4',
		measures: ['q q q q', 'h. q', 'h h', 'q h.', 'w', 'q q h', 'h. q', 'h. q', 'h q q']
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 16,
		hint: 'Dotted halves, halves, quarters and wholes, in 4/4.',
		timeSignature: '4/4',
		measures: ['q h q', 'h. q', 'h h', 'q h.', 'w', 'q q q q', 'q q h', 'h q q', 'w']
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 17,
		hint: 'The tie (la liaison) between halves and quarters, in 2/4.',
		timeSignature: '2/4',
		measures: ['q q', 'h', 'h~', 'h', 'h~', 'q q', 'q q~', 'q q~', 'q q', 'q q', 'h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 3,
		number: 18,
		hint: 'Ties across the barline, in 3/4.',
		timeSignature: '3/4',
		measures: ['q q q', 'h.~', 'h.', 'q q q~', 'q q q', 'h q~', 'q h', 'h.~', 'q q q~', 'q q q']
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 19,
		hint: 'Ties of every length, in 4/4.',
		timeSignature: '4/4',
		measures: ['q q q q~', 'q q h~', 'q h q', 'h h~', 'h. q~', 'q q h', 'w~', 'w']
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 20,
		hint: 'Ties of every length, in 4/4.',
		timeSignature: '4/4',
		measures: ['h~ q q', 'h. q', 'q q~ q q', 'q h q', 'h h~', 'q q q q~', 'q q h~', 'h h']
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 21,
		hint: 'Review with changing time signatures (2/4, 3/4, 4/4).',
		timeSignature: '2/4',
		measures: [
			'q q',
			'h',
			'@3/4 q q q',
			'h.',
			'@4/4 q q q q',
			'@3/4 h.',
			'@2/4 h',
			'@4/4 h h',
			'@3/4 q q q',
			'@2/4 h'
		]
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 22,
		hint: 'Review with changing time signatures (2/4, 3/4, 4/4).',
		timeSignature: '4/4',
		measures: [
			'w',
			'@3/4 h.',
			'@2/4 h',
			'@4/4 q q q q',
			'@3/4 q q q',
			'@2/4 q q',
			'@3/4 h q',
			'@2/4 h',
			'@4/4 w'
		]
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 23,
		hint: 'Review with changing time signatures and ties.',
		timeSignature: '3/4',
		measures: [
			'q q q',
			'h.~',
			'q q q',
			'@4/4 h h~',
			'q h q',
			'@3/4 h q',
			'@2/4 h~',
			'q q',
			'@3/4 h.'
		]
	},
	{
		book: 'etude-du-rythme-1',
		page: 4,
		number: 24,
		hint: 'Review with changing time signatures and ties.',
		timeSignature: '4/4',
		measures: [
			'h. q',
			'@3/4 h q',
			'@2/4 q q~',
			'@3/4 q h~',
			'@4/4 h h',
			'@3/4 h.',
			'@2/4 h~',
			'q q',
			'@4/4 w'
		]
	}
];
