import type { LocaleDict } from './index';

/**
 * Improvisation guide domain dictionary: the Lookup result card's
 * "what can I play over this?" panel (design doc
 * `.planning/design/improvisation.md`, shape 3).
 *
 * Chord symbols, note letters, tension labels (9, 11, ♭13...) and mode
 * tonics render verbatim from the theory engine regardless of locale
 * (symbol immunity); only the surrounding prose is keyed here. Mode names
 * themselves ARE prose (dorian/dorien), so they live in this dictionary.
 *
 * No em dashes anywhere in this file's copy (periods/colons/commas only,
 * per the standing copy rule, locked by noEmDashes.test.ts). No drill
 * grammar either: this panel is reference, so no "correct", no "try again".
 */
export const improvise = {
	en: {
		'improvise.toggle': 'What can I play over this?',
		'improvise.intro': 'Left hand holds the chord. Right hand picks from these notes.',

		'improvise.chordTones.heading': 'Chord tones',
		'improvise.chordTones.why':
			'The skeleton. Always safe: land on them, start from them, come back to them.',

		'improvise.scales.heading': 'Pick a scale color',
		'improvise.aria.scaleGroup': 'Scale choice',

		'improvise.scale.name.ionian': 'major (ionian)',
		'improvise.scale.name.lydian': 'lydian',
		'improvise.scale.name.mixolydian': 'mixolydian',
		'improvise.scale.name.dorian': 'dorian',
		'improvise.scale.name.aeolian': 'natural minor (aeolian)',
		'improvise.scale.name.minor-pentatonic': 'minor pentatonic',
		'improvise.scale.name.locrian': 'locrian',

		'improvise.scale.color.ionian': 'The plain major sound: home base, sunny, no surprises.',
		'improvise.scale.color.lydian':
			'Major with a raised 4: dreamy, floating, and the careful note is gone.',
		'improvise.scale.color.mixolydian': 'Major with a ♭7: the dominant and blues color.',
		'improvise.scale.color.dorian':
			'Minor with a bright 6: the default jazz minor sound, no careful note anywhere.',
		'improvise.scale.color.aeolian':
			'The natural minor scale: darker, the sound of the plain key signature.',
		'improvise.scale.color.minor-pentatonic':
			'Five notes, zero risk: the blues skeleton. When in doubt, stay here.',
		'improvise.scale.color.locrian':
			'Dark and unstable, like the chord itself: it wants to resolve.',

		'improvise.tag.color': 'color',
		'improvise.tag.careful': 'handle with care',

		'improvise.note.why.9': 'One whole step above the root: adds air, works almost everywhere.',
		'improvise.note.why.11': 'The 4th an octave up: it sings on minor chords.',
		'improvise.note.why.sharp11':
			'The lydian color: the 4 raised out of the way of the 3rd, dreamy instead of rubbing.',
		'improvise.note.why.13':
			'The bright 6th: air above the 5th. On a minor chord it is the dorian color.',
		'improvise.note.why.flat13': 'A dark color: it works, but it pulls the sound down.',
		'improvise.note.why.seventh': 'The seventh the symbol left out: instant jazz color.',
		'improvise.note.why.3':
			'The 3rd the sus symbol holds back: fine as a color, it resolves the suspension.',
		'improvise.note.why.color': 'Not in the chord, but in its scale: use it to connect chord tones.',
		'improvise.note.why.careful':
			'A half step above {TONE}: held on a strong beat it rubs. Passing through, it creates motion.',

		'improvise.legend':
			'Nothing here is forbidden. Chord tones are home, colors are seasoning, careful notes want to keep moving.',
		'improvise.keyboard.legend':
			'Colored keys: chord tones. Hatched keys: the scale. Marker in parentheses: handle with care.',
		'improvise.inspect.idle': 'Tap a key to hear it against the chord.',

		'improvise.dim.caution':
			'This chord is symmetric: the right scale depends on where it resolves. Stick to the chord tones and move by half steps.',

		'improvise.concepts.toggle': 'The words: chord scale, tension, avoid note, blue note',
		'improvise.concept.chordScale.title': 'Chord scale',
		'improvise.concept.chordScale.body':
			'A chord does not come alone: it carries a scale. Take the major scale of the key the chord comes from and start it on the chord root. The mode name (dorian, mixolydian...) is just the label of that starting point: one idea, seven names.',
		'improvise.concept.tension.title': 'Tensions (9, 11, 13)',
		'improvise.concept.tension.body':
			'The scale notes between the chord tones, named an octave up: the 2 becomes the 9, the 4 the 11, the 6 the 13. They add color on top while the chord tones keep it grounded. Which ones flatter the chord depends on its quality: the scale choices above already pick the right ones.',
		'improvise.concept.careful.title': 'Avoid notes',
		'improvise.concept.careful.body':
			'Badly named: nothing is forbidden. An avoid note sits one half step above a chord tone, so holding it on a strong beat rubs (F over Cmaj7 is the classic). Played as a passing note, the same rub becomes motion. Careful, not banned.',
		'improvise.concept.blue.title': 'Blue notes',
		'improvise.concept.blue.generic':
			'Some notes outside the scale still sound right because they borrow from the blues: the ♭3, the ♭5 and the ♭7, played passing and with intent.',
		'improvise.concept.blue.specific':
			'That is your {NOTE} over {ROOT}: not in the scale, yet it works. It bends the sound toward {ROOT}7, the dominant and blues color. Blue notes (♭3, ♭5, ♭7) earn their place by moving, not by sitting.'
	},
	fr: {
		'improvise.toggle': 'Quoi jouer par-dessus ?',
		'improvise.intro': "Main gauche : l'accord. Main droite : ces notes.",

		'improvise.chordTones.heading': "Les notes de l'accord",
		'improvise.chordTones.why':
			'Le squelette. Toujours sûres : pose-toi dessus, pars de là, reviens-y.',

		'improvise.scales.heading': 'Choisis une couleur de gamme',
		'improvise.aria.scaleGroup': 'Choix de gamme',

		'improvise.scale.name.ionian': 'majeur (ionien)',
		'improvise.scale.name.lydian': 'lydien',
		'improvise.scale.name.mixolydian': 'mixolydien',
		'improvise.scale.name.dorian': 'dorien',
		'improvise.scale.name.aeolian': 'mineur naturel (éolien)',
		'improvise.scale.name.minor-pentatonic': 'pentatonique mineure',
		'improvise.scale.name.locrian': 'locrien',

		'improvise.scale.color.ionian':
			'Le son majeur simple : la maison, lumineux, sans surprise.',
		'improvise.scale.color.lydian':
			'Majeur avec la 4 augmentée : rêveur, flottant, et la note délicate disparaît.',
		'improvise.scale.color.mixolydian': 'Majeur avec une ♭7 : la couleur dominante et blues.',
		'improvise.scale.color.dorian':
			'Mineur avec une 6 claire : le son mineur du jazz par défaut, aucune note délicate.',
		'improvise.scale.color.aeolian':
			"La gamme mineure naturelle : plus sombre, le son de l'armure telle quelle.",
		'improvise.scale.color.minor-pentatonic':
			'Cinq notes, zéro risque : le squelette du blues. Dans le doute, reste ici.',
		'improvise.scale.color.locrian':
			"Sombre et instable, comme l'accord lui-même : il demande à se résoudre.",

		'improvise.tag.color': 'couleur',
		'improvise.tag.careful': 'à manier avec soin',

		'improvise.note.why.9':
			'Un ton au-dessus de la fondamentale : ça aère, ça marche presque partout.',
		'improvise.note.why.11': "La quarte à l'octave : elle chante sur les accords mineurs.",
		'improvise.note.why.sharp11':
			'La couleur lydienne : la 4 haussée hors du chemin de la tierce, rêveuse au lieu de frotter.',
		'improvise.note.why.13':
			"La sixte claire : de l'air au-dessus de la quinte. Sur un accord mineur, c'est la couleur dorienne.",
		'improvise.note.why.flat13': 'Une couleur sombre : ça marche, mais ça tire le son vers le bas.',
		'improvise.note.why.seventh':
			'La septième que le symbole ne demande pas : couleur jazz immédiate.',
		'improvise.note.why.3':
			'La tierce que le sus retient : très bien en couleur, elle résout la suspension.',
		'improvise.note.why.color':
			"Pas dans l'accord, mais dans sa gamme : sers-t'en pour relier les notes de l'accord.",
		'improvise.note.why.careful':
			'Un demi-ton au-dessus de {TONE} : tenue sur un temps fort, ça frotte. En passant, ça crée du mouvement.',

		'improvise.legend':
			"Rien ici n'est interdit. Les notes de l'accord sont la maison, les couleurs assaisonnent, les notes délicates veulent rester en mouvement.",
		'improvise.keyboard.legend':
			"Touches en couleur : les notes de l'accord. Touches hachurées : la gamme. Marque entre parenthèses : à manier avec soin.",
		'improvise.inspect.idle': "Touche une note pour l'entendre face à l'accord.",

		'improvise.dim.caution':
			"Cet accord est symétrique : la bonne gamme dépend de là où il se résout. Reste sur les notes de l'accord et bouge par demi-tons.",

		'improvise.concepts.toggle': "Les mots : gamme d'accord, tension, note à éviter, blue note",
		'improvise.concept.chordScale.title': "Gamme d'accord",
		'improvise.concept.chordScale.body':
			"Un accord ne vient pas seul : il porte une gamme. Prends la gamme majeure de la tonalité d'où vient l'accord et démarre-la sur sa fondamentale. Le nom du mode (dorien, mixolydien...) n'est que l'étiquette de ce point de départ : une seule idée, sept noms.",
		'improvise.concept.tension.title': 'Tensions (9, 11, 13)',
		'improvise.concept.tension.body':
			"Les notes de la gamme entre les notes de l'accord, nommées une octave plus haut : la 2 devient la 9, la 4 la 11, la 6 la 13. Elles colorent par-dessus pendant que les notes de l'accord tiennent le sol. Lesquelles flattent l'accord dépend de sa couleur : les gammes proposées au-dessus choisissent déjà les bonnes.",
		'improvise.concept.careful.title': 'Notes à éviter',
		'improvise.concept.careful.body':
			"Mal nommées : rien n'est interdit. Une note à éviter se trouve un demi-ton au-dessus d'une note de l'accord, alors tenue sur un temps fort, elle frotte (fa sur Cmaj7 est le classique). Jouée en passant, le même frottement devient du mouvement. Délicate, pas bannie.",
		'improvise.concept.blue.title': 'Blue notes',
		'improvise.concept.blue.generic':
			'Des notes hors de la gamme sonnent juste quand même parce qu\'elles empruntent au blues : la ♭3, la ♭5 et la ♭7, jouées en passant et avec intention.',
		'improvise.concept.blue.specific':
			"C'est ton {NOTE} sur {ROOT} : pas dans la gamme, et pourtant ça marche. Il tire le son vers {ROOT}7, la couleur dominante et blues. Les blue notes (♭3, ♭5, ♭7) gagnent leur place en bougeant, jamais en s'installant."
	}
} satisfies LocaleDict;
