import type { TierId } from './tiers';

/**
 * Always-on interval scaffold fade (sketch 005). The scaffold shows the
 * target chord's interval RECIPE (R, m3, P5, m7) during a construction drill,
 * so a beginner always sees what intervals the chord is built from. It never
 * shows the answer notes, so it does not trivialize the note-placement task
 * and answers are never marked assisted.
 *
 * The help fades as the user climbs the tier ladder:
 * - full: interval short names plus their long French names (most support).
 * - compact: interval short names only.
 * - off: no scaffold, the fully unassisted drill.
 */
export type IntervalScaffoldLevel = 'full' | 'compact' | 'off';

export function intervalScaffoldLevel(tier: TierId): IntervalScaffoldLevel {
	if (tier <= 1) return 'full';
	if (tier <= 3) return 'compact';
	return 'off';
}
