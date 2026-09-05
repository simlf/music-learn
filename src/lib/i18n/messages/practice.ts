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
		// Opt-in continuation past the day's target: extra practice is always
		// offered, never implied to be owed (B1).
		'practice.cta.keepGoing': 'Keep going',

		// Pre-start due-summary register (27-UI-SPEC "Pre-start due-summary
		// register"). The plural line carries a literal {N} placeholder,
		// substituted client-side (SongMark's {N} convention).
		//
		// These two lines stay the register whenever the round IS the whole due
		// set - "3 CARDS DUE TODAY" is then exactly true. The bounded-session
		// lines below take over only when the round is a deliberate slice of a
		// larger due set, where "due today" would read as a contradiction
		// (B1: the split must be honest in both directions).
		'practice.pre.dueSingular': '1 CARD DUE TODAY',
		'practice.pre.duePlural': '{N} CARDS DUE TODAY',

		// Bounded daily session (B1). "{N} TODAY · {M} WAITING": a finishable
		// number, with the remainder shown rather than hidden.
		'practice.pre.today': '{N} TODAY',
		'practice.pre.waiting': '{N} WAITING',
		// Resuming a day whose target is partly spent already.
		'practice.pre.resume': '{DONE} OF {TARGET} DONE TODAY',
		'practice.pre.toGo': '{N} TO GO',
		'practice.pre.onRequest': '{N} ON REQUEST',
		// Re-entry on a day whose target is already met.
		'practice.pre.doneToday': "TODAY'S PRACTICE IS DONE",

		// Last session's one line (B5), shown at the moment the user decides
		// whether to start. "Yesterday" only when it literally was yesterday.
		'practice.pre.yesterday': 'Yesterday: {N} right, best run {B}.',
		'practice.pre.lastRun': 'Last run: {N} right, best run {B}.',
		// {ITEMS} is a comma-joined list of chord symbols / interval shorthands,
		// interpolated verbatim (never localized).
		'practice.pre.comingBack': 'Coming back today: {ITEMS}.',

		// In-session register: questions left in the bounded round (never a
		// frozen initial-size fraction) - mirrors recall.register.left-today's
		// "N LEFT" convention.
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

		// End card (B2). The card has to be able to say "you are done for
		// today" plainly: before this, "done" was only discoverable by draining
		// the entire due set, tapping "Run it again", and reading the
		// nothing-due empty state. None of these lines nag or measure the user
		// against a target they missed - they state what happened and stop,
		// matching streak.ts's rule that a lapsed run reads exactly like a
		// first-ever visit.
		'practice.end.doneToday': "That's today's practice done.",
		'practice.end.moreReadySingular': '1 more is ready if you want it.',
		'practice.end.moreReadyPlural': '{N} more are ready if you want them.',
		'practice.end.allClear': 'Nothing else is waiting today. The deck is clear.',
		// Shown instead of the done lines when the day's ledger does not back a
		// "done" claim (a round finished on a device whose storage is full or
		// blocked): report the round, claim nothing about the day.
		'practice.end.partial': '{DONE} answered today. {N} still waiting.',

		// Actionable misses (B4). The moment the user is looking straight at the
		// chord they just blew is the highest-intent moment in the app, so each
		// chip is a drill and there is one CTA for the whole set. Mirrors the
		// Progress hub's own "Drill all {N}" affordance rather than inventing a
		// second vocabulary for the same act.
		'practice.end.fixThis': 'Fix this one',
		'practice.end.fixThese': 'Fix these {N}',
		// {SYMBOL} is interpolated verbatim (chord symbols are never localized).
		'practice.end.fixChipAria': 'Drill {SYMBOL} again',

		// Error state ("queue" vocabulary, per 27-UI-SPEC).
		'practice.error.body':
			"Couldn't open the practice queue. Reload the page, mon ami. If it keeps happening, your browser's storage might be full or blocked.",

		// Song play-through (Phase 40, PLAY-01/02/03). Its own register, never
		// the daily "today/waiting" language: a play-through neither draws from
		// nor reports against the daily target (proposal 3's fix). {SONG} is
		// interpolated verbatim (song names are user data, never localized).
		'practice.playthrough.pre': 'PLAYING THROUGH {SONG} · {N} CHORDS',
		'practice.playthrough.startCta': 'Start play-through',
		'practice.playthrough.reviewingLabel': 'Playing through {SONG}',
		'practice.playthrough.end': 'You played through {SONG}.',
		'practice.playthrough.continueCta': 'Continue practicing',
		// PLAY-03: a symbol outside the practice catalog is skipped, visibly,
		// rather than crashing the run.
		'practice.playthrough.skippedSingular': '1 chord skipped (not in your practice catalog yet).',
		'practice.playthrough.skippedPlural': '{N} chords skipped (not in your practice catalog yet).',
		'practice.empty.playthrough.heading': 'Nothing to play through.',
		'practice.empty.playthrough.body':
			"None of {SONG}'s chords are in your practice catalog yet ({N} skipped).",

		// Per-question family cue (27-UI-SPEC "Family Cue Between Questions").
		// Added for all six families now (voicing/progression/inversion), even
		// though those synthetic items only appear once their own host-wiring
		// plans land, so i18n stays additive and each wiring plan lands clean.
		//
		// T13 added playIt/hearIt: the see-play and hear-name modes used to be
		// mislabeled "NAME IT" because they were rendered as the name-it
		// question. Now they ask their own question, so the cue names it. Both
		// stay verbs in the same imperative register as the existing cues.
		// W1 added degree: the scale-degree family. Its 84 facts were seeded into
		// the deck and then silently dropped by the queue composer, so they had
		// no cue because they had no question.
		'practice.cue.nameIt': 'NAME IT',
		'practice.cue.playIt': 'PLAY IT',
		'practice.cue.hearIt': 'BY EAR',
		'practice.cue.buildIt': 'BUILD IT',
		'practice.cue.voicing': 'VOICING',
		'practice.cue.interval': 'INTERVAL',
		'practice.cue.degree': 'DEGREE',
		'practice.cue.progression': 'PROGRESSION',
		'practice.cue.inversion': 'INVERSION'
	},
	fr: {
		'practice.page.title': 'Pratique',

		'practice.cta.start': 'Commencer la pratique',
		'practice.cta.keepGoing': 'Continuer',

		'practice.pre.dueSingular': "1 CARTE À REVOIR AUJOURD'HUI",
		'practice.pre.duePlural': "{N} CARTES À REVOIR AUJOURD'HUI",

		'practice.pre.today': "{N} AUJOURD'HUI",
		'practice.pre.waiting': '{N} EN ATTENTE',
		'practice.pre.resume': "{DONE} SUR {TARGET} FAITES AUJOURD'HUI",
		'practice.pre.toGo': '{N} À FAIRE',
		'practice.pre.onRequest': '{N} SUR DEMANDE',
		'practice.pre.doneToday': 'LA PRATIQUE DU JOUR EST FAITE',

		'practice.pre.yesterday': 'Hier : {N} bonnes, meilleure série {B}.',
		'practice.pre.lastRun': 'Dernière séance : {N} bonnes, meilleure série {B}.',
		'practice.pre.comingBack': "De retour aujourd'hui : {ITEMS}.",

		'practice.register.left': 'RESTANTES',

		'practice.empty.no-deck.heading': 'Rien à pratiquer pour le moment.',
		'practice.empty.no-deck.body':
			"Cherche d'abord quelques accords. Les cartes de pratique apparaissent ici à mesure que tu rencontres de nouveaux accords, intervalles et progressions.",

		'practice.empty.filtered.heading': "Aucun accord de morceau à revoir aujourd'hui.",
		'practice.empty.filtered.body.singular':
			'1 autre carte attend. Désactive le filtre de morceaux sur la page Morceaux pour la voir.',
		'practice.empty.filtered.body.plural':
			'{N} autres cartes attendent. Désactive le filtre de morceaux sur la page Morceaux pour les voir.',

		'practice.end.doneToday': 'La pratique du jour est faite.',
		'practice.end.moreReadySingular': '1 autre est prête si tu la veux.',
		'practice.end.moreReadyPlural': '{N} autres sont prêtes si tu les veux.',
		'practice.end.allClear': "Rien d'autre n'attend aujourd'hui. Le paquet est vide.",
		'practice.end.partial': "{DONE} faites aujourd'hui. {N} encore en attente.",

		'practice.end.fixThis': 'Reprendre celui-là',
		'practice.end.fixThese': 'Reprendre ces {N}',
		'practice.end.fixChipAria': 'Rejouer {SYMBOL}',

		'practice.error.body':
			"Impossible d'ouvrir la file de pratique. Recharge la page, mon ami. Si ça continue, le stockage de ton navigateur est peut-être plein ou bloqué.",

		'practice.playthrough.pre': 'LECTURE DE {SONG} · {N} ACCORDS',
		'practice.playthrough.startCta': 'Commencer la lecture',
		'practice.playthrough.reviewingLabel': 'Lecture de {SONG}',
		'practice.playthrough.end': 'Tu as joué {SONG} en entier.',
		'practice.playthrough.continueCta': 'Continuer la pratique',
		'practice.playthrough.skippedSingular':
			'1 accord ignoré (pas encore dans ton catalogue de pratique).',
		'practice.playthrough.skippedPlural':
			'{N} accords ignorés (pas encore dans ton catalogue de pratique).',
		'practice.empty.playthrough.heading': 'Rien à jouer.',
		'practice.empty.playthrough.body':
			"Aucun accord de {SONG} n'est encore dans ton catalogue de pratique ({N} ignorés).",

		'practice.cue.nameIt': 'NOMMER',
		'practice.cue.playIt': 'JOUER',
		'practice.cue.hearIt': "À L'OREILLE",
		'practice.cue.buildIt': 'CONSTRUIRE',
		'practice.cue.voicing': 'VOICING',
		'practice.cue.interval': 'INTERVALLE',
		'practice.cue.degree': 'DEGRÉ',
		'practice.cue.progression': 'PROGRESSION',
		'practice.cue.inversion': 'INVERSION'
	}
} satisfies LocaleDict;
