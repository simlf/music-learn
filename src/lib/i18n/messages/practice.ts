import type { LocaleDict } from './index';

/**
 * Practice hub domain dictionary (Phase 27 Plan 04): the `/practice` host's
 * own copy - page title, the single "Start practice" CTA, the pre-start
 * due-count register, the three empty tiers, the error state, and the
 * always-populated per-question family cue. Every state this host reuses
 * verbatim from `recall.*`/`drills.*` (loading, "nothing due" heading/body,
 * the in-session score register, the session-end-card) is read directly
 * from those existing domains instead of being re-keyed here (no duplicate
 * keys for identical copy).
 *
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity"): chord symbols and the serif ChordGlyph stay identical in both
 * locales and are never routed through t().
 */
export const practice = {
	en: {
		'practice.page.title': 'Practice',

		// Primary CTA (locked language, 27-UI-SPEC "Primary CTA" - do not
		// re-case to "Start Practice" or "Practice Now").
		'practice.cta.start': 'Start practice',

		// Pre-start due-summary register (27-UI-SPEC "Pre-start due-summary
		// register"). The plural line carries a literal {N} placeholder,
		// substituted client-side (SongMark's {N} convention).
		'practice.pre.dueSingular': '1 CARD DUE TODAY',
		'practice.pre.duePlural': '{N} CARDS DUE TODAY',

		// In-session register (B1 fix, 30-CONTEXT UAT): driven off the LIVE
		// queue (hybridSessionRemaining), not a frozen initial-size fraction -
		// mirrors recall.register.left-today's "N LEFT" convention.
		'practice.register.left': 'LEFT',

		// Empty: no deck yet.
		'practice.empty.no-deck.heading': 'Nothing to practice yet.',
		'practice.empty.no-deck.body':
			'Look up a few chords first. Practice cards appear here as you meet new chords, intervals, and progressions.',

		// Empty: song-filter hides all due (no toggle on this page - the copy
		// points to the Songs page, per 27-UI-SPEC).
		'practice.empty.filtered.heading': 'No song chords due today.',
		'practice.empty.filtered.body.singular':
			'1 other card is waiting. Turn off the song filter on the Songs page to see it.',
		'practice.empty.filtered.body.plural':
			'{N} other cards are waiting. Turn off the song filter on the Songs page to see them.',

		// Error state ("queue" vocabulary, per 27-UI-SPEC).
		'practice.error.body':
			"Couldn't open the practice queue. Reload the page, mon ami. If it keeps happening, your browser's storage might be full or blocked.",

		// Per-question family cue (27-UI-SPEC "Family Cue Between Questions").
		// Added for all five families now, even though voicing/progression
		// items only appear once Plan 05 lands, so i18n stays in this plan only.
		'practice.cue.nameIt': 'NAME IT',
		'practice.cue.buildIt': 'BUILD IT',
		'practice.cue.voicing': 'VOICING',
		'practice.cue.interval': 'INTERVAL',
		'practice.cue.progression': 'PROGRESSION'
	},
	fr: {
		'practice.page.title': 'Pratique',

		'practice.cta.start': 'Commencer la pratique',

		'practice.pre.dueSingular': "1 CARTE À REVOIR AUJOURD'HUI",
		'practice.pre.duePlural': "{N} CARTES À REVOIR AUJOURD'HUI",

		'practice.register.left': 'RESTANTES',

		'practice.empty.no-deck.heading': 'Rien à pratiquer pour le moment.',
		'practice.empty.no-deck.body':
			"Cherche d'abord quelques accords. Les cartes de pratique apparaissent ici à mesure que tu rencontres de nouveaux accords, intervalles et progressions.",

		'practice.empty.filtered.heading': "Aucun accord de morceau à revoir aujourd'hui.",
		'practice.empty.filtered.body.singular':
			'1 autre carte attend. Désactive le filtre de morceaux sur la page Morceaux pour la voir.',
		'practice.empty.filtered.body.plural':
			'{N} autres cartes attendent. Désactive le filtre de morceaux sur la page Morceaux pour les voir.',

		'practice.error.body':
			"Impossible d'ouvrir la file de pratique. Recharge la page, mon ami. Si ça continue, le stockage de ton navigateur est peut-être plein ou bloqué.",

		'practice.cue.nameIt': 'NOMMER',
		'practice.cue.buildIt': 'CONSTRUIRE',
		'practice.cue.voicing': 'VOICING',
		'practice.cue.interval': 'INTERVALLE',
		'practice.cue.progression': 'PROGRESSION'
	}
} satisfies LocaleDict;
