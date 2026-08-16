import { chrome } from './chrome';
import { recall } from './recall';
import { build } from './build';
import { drills } from './drills';
import { songs } from './songs';
import { theory } from './theory';
import { scales } from './scales';
import { progress } from './progress';
import { progressHub } from './progress-hub';
import { home } from './home';
import { progressions } from './progressions';
import { inversions } from './inversions';
import { voicings } from './voicings';
import { intervalView } from './interval-view';
import { practice } from './practice';
import { learn } from './learn';
import { improvise } from './improvise';

/**
 * Shared shape for every per-domain (and the merged) locale dictionary:
 * language -> key -> string. Domain modules import this type from here
 * (a type-only import, erased at build time, so it never creates a runtime
 * circular dependency with this file's own value imports of those modules).
 */
export interface LocaleDict {
	en: Record<string, string>;
	fr: Record<string, string>;
}

/**
 * Merged en/fr dictionary combining every per-domain module. Each domain
 * file (chrome + 8 stubs) is owned by exactly one plan in Phase 20, so later
 * plans touch only their own file and this merge point never needs editing
 * again once all nine modules exist.
 */
export const messages = {
	en: {
		...chrome.en,
		...recall.en,
		...build.en,
		...drills.en,
		...songs.en,
		...theory.en,
		...scales.en,
		...progress.en,
		...progressHub.en,
		...home.en,
		...progressions.en,
		...inversions.en,
		...voicings.en,
		...intervalView.en,
		...practice.en,
		...learn.en,
		...improvise.en
	},
	fr: {
		...chrome.fr,
		...recall.fr,
		...build.fr,
		...drills.fr,
		...songs.fr,
		...theory.fr,
		...scales.fr,
		...progress.fr,
		...progressHub.fr,
		...home.fr,
		...progressions.fr,
		...inversions.fr,
		...voicings.fr,
		...intervalView.fr,
		...practice.fr,
		...learn.fr,
		...improvise.fr
	}
} satisfies LocaleDict;
