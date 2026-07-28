/**
 * Pure timing math for the comping loop (the play-along companion on /learn):
 * the tempo range, tempo to duration, and bar advance.
 *
 * Deliberately dependency-free (no Tone, no theory, no DOM, no storage) so
 * both the audio engine's Transport scheduler and the UI can read the same
 * numbers, and so audio.ts's import graph never reaches into the theory or
 * SRS layers. The loop's VOICING lives in `$lib/practice/compLoop`; only the
 * clock lives here.
 */

/**
 * Tempo range, in BPM, at one chord per 4/4 bar.
 *
 * Default 70: a bar lasts 3.43s, so a chord change arrives slowly enough to
 * find the notes without stopping, while a 3-bar ii-V-I still completes in
 * about 10 seconds, which is short enough to hear as one sentence rather than
 * three unrelated chords.
 *
 * Floor 50 (4.8s per bar): slower than this and the harmony stops making
 * sense. A ii-V-I spread over 15 seconds is three chords, not a cadence.
 *
 * Ceiling 120 (2s per bar): a real medium swing tempo, reachable once the
 * changes are familiar, and about the fastest at which a player who is still
 * learning the theory can choose notes rather than guess them.
 */
export const TEMPO_MIN = 50;
export const TEMPO_MAX = 120;
export const TEMPO_DEFAULT = 70;
/** Step for the slower/faster controls: coarse enough that one tap is audible. */
export const TEMPO_STEP = 5;
/** One chord per bar, four beats to the bar. Not a user-facing option. */
export const BEATS_PER_BAR = 4;

/** Clamps a tempo into [TEMPO_MIN, TEMPO_MAX]. Non-finite input falls back to the default. */
export function clampTempo(bpm: number): number {
	if (!Number.isFinite(bpm)) return TEMPO_DEFAULT;
	return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(bpm)));
}

/**
 * One tempo step in `direction` (+1 faster, -1 slower), clamped. At a range
 * end the value is returned unchanged rather than wrapping, so a repeated tap
 * can never jump from 120 back down to 50 mid-loop.
 */
export function nudgeTempo(bpm: number, direction: 1 | -1): number {
	return clampTempo(clampTempo(bpm) + direction * TEMPO_STEP);
}

/** Seconds per beat at `bpm`. */
export function secondsPerBeat(bpm: number): number {
	return 60 / clampTempo(bpm);
}

/** Seconds one bar lasts at `bpm`. At 70 BPM in 4/4 that is 3.43s. */
export function barDurationSec(bpm: number, beatsPerBar: number = BEATS_PER_BAR): number {
	return secondsPerBeat(bpm) * beatsPerBar;
}

/**
 * The next bar index, wrapping back to 0 at the end of the form. Total: a
 * total of 0 or less, or a current index outside the form, resolves to 0
 * rather than producing NaN or an out-of-range index.
 */
export function nextBarIndex(current: number, total: number): number {
	if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
	const next = Math.floor(current) + 1;
	if (next < 0 || next >= total) return 0;
	return next;
}
