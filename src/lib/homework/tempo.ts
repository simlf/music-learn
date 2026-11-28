/** Tempo range for the homework metronome, in quarter-note beats per minute. */
export const HW_TEMPO_MIN = 40;
export const HW_TEMPO_MAX = 160;
export const HW_TEMPO_DEFAULT = 70;
/** Step for the slower / faster buttons. */
export const HW_TEMPO_STEP = 5;
/** One-tap tempo presets shown beside the stepper. */
export const HW_TEMPO_PRESETS: readonly number[] = [50, 60, 80, 100];
/** Count-in lengths offered, in bars. */
export const COUNT_IN_OPTIONS: readonly number[] = [0, 1, 2];
export const COUNT_IN_DEFAULT = 1;

/** Clamps to the allowed range; anything that is not a finite number falls back to the default. */
export function clampHwTempo(bpm: number): number {
	if (!Number.isFinite(bpm)) return HW_TEMPO_DEFAULT;
	return Math.min(HW_TEMPO_MAX, Math.max(HW_TEMPO_MIN, Math.round(bpm)));
}

/** One step slower (-1) or faster (+1), clamped. */
export function nudgeHwTempo(bpm: number, direction: 1 | -1): number {
	return clampHwTempo(clampHwTempo(bpm) + direction * HW_TEMPO_STEP);
}

const STORAGE_KEY = 'music-learn:homework-prefs';

export interface HomeworkPrefs {
	bpm: number;
	countInBars: number;
}

/** Last used tempo and count-in, or defaults. Never throws (storage may be blocked or corrupt). */
export function loadHomeworkPrefs(): HomeworkPrefs {
	const fallback = { bpm: HW_TEMPO_DEFAULT, countInBars: COUNT_IN_DEFAULT };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<HomeworkPrefs> | null;
		const bars = parsed?.countInBars;
		return {
			bpm: clampHwTempo(typeof parsed?.bpm === 'number' ? parsed.bpm : HW_TEMPO_DEFAULT),
			countInBars:
				typeof bars === 'number' && COUNT_IN_OPTIONS.includes(bars) ? bars : COUNT_IN_DEFAULT
		};
	} catch {
		return fallback;
	}
}

export function saveHomeworkPrefs(prefs: HomeworkPrefs): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// Storage disabled or full: the in-memory choice still works this session.
	}
}
