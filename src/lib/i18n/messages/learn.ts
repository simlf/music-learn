import type { LocaleDict } from './index';

/**
 * Learn domain dictionary (I18N-02, Phase 28 Plan 03): the `/learn` hub page
 * (theory + scale explore + interval reference sections), the Scale practice
 * affordance on `/practice`, and the extracted TheoryLessons/ScaleExplorer
 * components when rendered outside their original routes.
 *
 * IMMUNITY: (same as theory.ts and scales.ts) chord symbols, interval
 * shorthand, solfège syllables, scale degree numbers - all stay as raw values,
 * never routed through t().
 */
export const learn = {
	en: {
		// /learn page
		'learn.page.title': 'Learn',
		'learn.page.subtitle':
			"Read the theory, explore the major scale, and see how any chord's intervals stack.",

		// Section eyebrow labels
		'learn.section.theory.label': 'Theory',
		'learn.section.explore.label': 'Scale Explore',
		'learn.section.explore.heading': 'Explore the major scale',
		'learn.section.interval.label': 'Interval Reference',
		'learn.section.interval.heading': 'How every seventh chord stacks',
		'learn.section.interval.intro':
			'Five qualities, one repeating pattern of thirds. Compare the gaps below.',

		// Interval reference quality labels (match /theory SEVENTH_SHAPES captions)
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',

		// Footer CTA
		'learn.footer.practiceButton': 'Go to Practice',

		// Scale practice disclosure on /practice
		'learn.scale-practice.toggle': 'Scale practice',
		'learn.scale-practice.close': 'Hide scale practice',
		'learn.scale-practice.heading': 'Practice a major scale',
		'learn.scale-practice.body': 'Pick a tonic, then play its scale ascending and back down.'
	},
	fr: {
		// (Same structure, French translations)
		'learn.page.title': 'Apprendre',
		'learn.page.subtitle':
			"Lis la théorie, explore la gamme majeure et vois comment les intervalles de n'importe quel accord s'empilent.",
		'learn.section.theory.label': 'Théorie',
		'learn.section.explore.label': 'Explorer la gamme',
		'learn.section.explore.heading': 'Explorer la gamme majeure',
		'learn.section.interval.label': 'Référence des intervalles',
		'learn.section.interval.heading': "Comment s'empilent tous les accords de septième",
		'learn.section.interval.intro':
			'Cinq qualités, un motif répétitif de tierces. Compare les écarts ci-dessous.',
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',
		'learn.footer.practiceButton': 'Direction la pratique',
		'learn.scale-practice.toggle': 'Pratique de gamme',
		'learn.scale-practice.close': 'Masquer la pratique de gamme',
		'learn.scale-practice.heading': 'Pratiquer une gamme majeure',
		'learn.scale-practice.body':
			'Choisis une tonique, puis joue sa gamme en montant puis en descendant.'
	}
} satisfies LocaleDict;
