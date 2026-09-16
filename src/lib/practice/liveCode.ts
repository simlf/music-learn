import { toAsciiAccidentals } from '$lib/theory/interval';
import { BEATS_PER_BAR } from '$lib/audio/loopTiming';
import type { CompBar } from './compLoop';

/**
 * Renders the comping loop's own bars (see compLoop.ts: the ONE progression
 * engine, never a second table) as an editable Strudel mini-notation
 * pattern, for CompingLoop.svelte's "open in live code" escape hatch.
 *
 * The chord SYMBOLS are the one thing this must never re-derive: they come
 * straight from `bars`, ascii-normalized (Strudel's chord parser, like
 * tonal's, wants "Ebm7" not "E♭m7"). How the chords are PLAYED deliberately
 * differs from the loop's own shell voicing: this uses Strudel's own
 * `.voicing()` (its ireal jazz-voicing dictionary) and a plain synthesized
 * waveform, never a sample name, because the point of the escape hatch is
 * showing the same progression in Strudel's own idiom, not reproducing the
 * shell a second time. Only a synthesized waveform ever ships in the seeded
 * pattern (never a sample) so it plays fully offline; see strudel.ts. `triangle`
 * (superdough's own default `s`) is used rather than `sawtooth` because its
 * harmonic content is far softer - `sawtooth`'s full harmonic series reads as
 * a harsh buzz on sustained chords, which is what the piano-like/pleasant
 * requirement here is about.
 *
 * `<...>` is Strudel's alternate-each-cycle notation, and `setcpm` takes
 * cycles per minute: at one chord per 4/4 bar, one cycle IS one bar, so
 * `bpm / BEATS_PER_BAR` lands the pattern on the exact tempo the loop is set
 * to. Total: an empty `bars` returns an empty string rather than a pattern
 * with nothing to alternate.
 */
export function toStrudelPattern(bars: readonly CompBar[], bpm: number): string {
	if (bars.length === 0) return '';
	const symbols = bars.map((bar) => toAsciiAccidentals(bar.symbol)).join(' ');
	const cpm = Math.round((bpm / BEATS_PER_BAR) * 100) / 100;
	return `setcpm(${cpm})\nchord("<${symbols}>").voicing().s("triangle")`;
}
