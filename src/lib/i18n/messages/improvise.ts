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

		'improvise.colors.heading': 'Colors to add',
		'improvise.colors.lede':
			'In the scale, not in the chord. They season the sound on top, and none of them rubs against what the left hand is holding.',
		'improvise.careful.heading': 'Handle with care, and here is why',
		'improvise.careful.lede':
			'Greyed does not mean forbidden. Each of these sits one half step above a note your left hand is holding, so sounded together they make a minor 9th, the harshest interval in tonal music. And because the chord tone is held underneath, the ear hears that clash continuously instead of in passing.',
		'improvise.careful.compareHint':
			'The button plays the chord tone first, then the half step above it, so you hear the difference rather than read it.',

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

		'improvise.note.careful.third':
			'{NOTE} sits one half step above {TONE}, the 3rd, the note that says whether this chord is major or minor. Hold it and you sound a minor 9th against the note carrying the chord identity, which is the sharpest form this clash takes.',
		'improvise.note.careful.root':
			'{NOTE} sits one half step above {TONE}, the root the whole chord stands on. Held, the two grind at the bottom of the harmony, where the ear has nowhere to put the second note.',
		'improvise.note.careful.fifth':
			'{NOTE} sits one half step above {TONE}, the 5th that keeps the chord open. Held, it sounds a minor 9th over that 5th and shuts the chord down. Landed on deliberately and let fall back, it is a real color.',
		'improvise.note.careful.other':
			'{NOTE} sits one half step above {TONE} ({LABEL}), a note this chord is holding. Sounded together they make a minor 9th, so held they rub.',
		'improvise.note.careful.nuance':
			'Not forbidden: on a strong beat, or held, it rubs. Passing between two chord tones it is normal, and it sounds good.',
		'improvise.note.careful.fineOnDominant':
			'Same note, other chord: over {ROOT}7 or in a blues, {NOTE} is expected. The note is not the problem, holding it over this chord is.',
		'improvise.note.careful.fineOnBlues':
			'In a blues this same {NOTE} is everywhere: it is the sus sound over {ROOT}7, and it wants to fall onto the 3rd. Handle with care means do not park on it, not do not play it.',

		'improvise.blue.heading': 'One note outside the scale that works anyway',
		'improvise.blue.tag': 'blue note',
		'improvise.blue.why':
			'{NOTE} is not in the scale above, and it still sounds right over {ROOT}. It is the ♭7, one whole step below the root, so it never sits a half step above a chord tone: nothing to rub against. It bends the chord toward {ROOT}7, the dominant and blues color.',
		'improvise.blue.whyHeld':
			'{NOTE} is not in the scale above, and this chord holds its own {TONE} a half step away, so those two do rub when they sound together. Played passing, or when the left hand leaves {TONE} out, {NOTE} bends the chord toward {ROOT}7, the blues color.',

		'improvise.listen.color': 'Hear it over the chord',
		'improvise.listen.careful': 'Hear the difference',
		'improvise.listen.aria': 'Hear {NOTE} over the chord',
		'improvise.listen.ariaCareful': 'Hear {TONE} then {NOTE} over the chord',

		'improvise.legend':
			'Nothing here is forbidden. Chord tones are home, colors are seasoning, careful notes want to keep moving.',
		'improvise.keyboard.legend':
			'Colored keys: chord tones. Hatched keys: the scale. Marker in parentheses: handle with care.',
		'improvise.inspect.idle': 'Tap any key: you hear the chord held under it, like the left hand does.',

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
			'Badly named: nothing is forbidden. An avoid note sits one half step above a chord tone, so while the left hand holds that chord tone the two sound a minor 9th, the harshest interval in tonal music, and the ear hears it continuously instead of in passing. F over Cmaj7 is the classic: F is a half step above E, and E is what makes the chord major, so the F attacks the chord identity. Played passing between E and G, the same F is normal and good. Careful when held on a strong beat, never banned.',
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

		'improvise.colors.heading': 'Les couleurs à ajouter',
		'improvise.colors.lede':
			"Dans la gamme, pas dans l'accord. Elles parfument par-dessus, et aucune ne frotte contre ce que tient la main gauche.",
		'improvise.careful.heading': 'À manier avec soin, et voici pourquoi',
		'improvise.careful.lede':
			"Grisé ne veut pas dire interdit. Chacune de ces notes est un demi-ton au-dessus d'une note que ta main gauche tient : jouées ensemble, elles forment une neuvième mineure, l'intervalle le plus dur en musique tonale. Et comme la note de l'accord est tenue dessous, l'oreille entend ce frottement en continu au lieu de l'entendre au passage.",
		'improvise.careful.compareHint':
			"Le bouton joue d'abord la note de l'accord, puis le demi-ton au-dessus : tu entends la différence au lieu de la lire.",

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

		'improvise.note.careful.third':
			"{NOTE} est un demi-ton au-dessus de {TONE}, la tierce, la note qui dit si l'accord est majeur ou mineur. Tenue, elle sonne une neuvième mineure contre la note qui porte l'identité de l'accord : c'est la forme la plus dure de ce frottement.",
		'improvise.note.careful.root':
			"{NOTE} est un demi-ton au-dessus de {TONE}, la fondamentale sur laquelle tout l'accord repose. Tenues ensemble, les deux grincent tout en bas de l'harmonie, là où l'oreille ne sait pas où ranger la seconde note.",
		'improvise.note.careful.fifth':
			"{NOTE} est un demi-ton au-dessus de {TONE}, la quinte qui garde l'accord ouvert. Tenue, elle sonne une neuvième mineure au-dessus de cette quinte et referme l'accord. Posée exprès puis redescendue, c'est une vraie couleur.",
		'improvise.note.careful.other':
			"{NOTE} est un demi-ton au-dessus de {TONE} ({LABEL}), une note que cet accord tient. Jouées ensemble, elles forment une neuvième mineure : tenue, ça frotte.",
		'improvise.note.careful.nuance':
			"Pas interdit : sur un temps fort, ou tenue, ça frotte. En passant entre deux notes de l'accord, c'est normal, et ça sonne bien.",
		'improvise.note.careful.fineOnDominant':
			"Même note, autre accord : sur {ROOT}7 ou en blues, {NOTE} est attendu. Le problème n'est pas la note, c'est de la tenir sur cet accord-là.",
		'improvise.note.careful.fineOnBlues':
			"En blues, ce même {NOTE} est partout : c'est le son sus sur {ROOT}7, et il demande à redescendre sur la tierce. À manier avec soin veut dire ne pas s'y installer, pas ne pas le jouer.",

		'improvise.blue.heading': 'Une note hors gamme qui marche quand même',
		'improvise.blue.tag': 'blue note',
		'improvise.blue.why':
			"{NOTE} n'est pas dans la gamme au-dessus, et pourtant ça sonne juste sur {ROOT}. C'est la ♭7, un ton en dessous de la fondamentale : elle n'est donc jamais un demi-ton au-dessus d'une note de l'accord, il n'y a rien contre quoi frotter. Elle tire l'accord vers {ROOT}7, la couleur dominante et blues.",
		'improvise.blue.whyHeld':
			"{NOTE} n'est pas dans la gamme au-dessus, et cet accord tient son propre {TONE} à un demi-ton : ces deux-là frottent si elles sonnent ensemble. En passant, ou quand la main gauche laisse {TONE} de côté, {NOTE} tire l'accord vers {ROOT}7, la couleur blues.",

		'improvise.listen.color': "Écouter sur l'accord",
		'improvise.listen.careful': 'Écouter la différence',
		'improvise.listen.aria': "Écouter {NOTE} sur l'accord",
		'improvise.listen.ariaCareful': "Écouter {TONE} puis {NOTE} sur l'accord",

		'improvise.legend':
			"Rien ici n'est interdit. Les notes de l'accord sont la maison, les couleurs assaisonnent, les notes délicates veulent rester en mouvement.",
		'improvise.keyboard.legend':
			"Touches en couleur : les notes de l'accord. Touches hachurées : la gamme. Marque entre parenthèses : à manier avec soin.",
		'improvise.inspect.idle':
			"Touche une note : tu entends l'accord tenu dessous, comme le ferait la main gauche.",

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
			"Mal nommées : rien n'est interdit. Une note à éviter se trouve un demi-ton au-dessus d'une note de l'accord, donc pendant que la main gauche tient cette note, les deux sonnent une neuvième mineure, l'intervalle le plus dur en musique tonale, et l'oreille l'entend en continu au lieu de l'entendre au passage. Fa sur Cmaj7 est le classique : fa est un demi-ton au-dessus de mi, et c'est mi qui rend l'accord majeur, donc le fa attaque l'identité de l'accord. Jouée en passant entre mi et sol, cette même note est normale et sonne bien. Délicate quand elle est tenue sur un temps fort, jamais bannie.",
		'improvise.concept.blue.title': 'Blue notes',
		'improvise.concept.blue.generic':
			'Des notes hors de la gamme sonnent juste quand même parce qu\'elles empruntent au blues : la ♭3, la ♭5 et la ♭7, jouées en passant et avec intention.',
		'improvise.concept.blue.specific':
			"C'est ton {NOTE} sur {ROOT} : pas dans la gamme, et pourtant ça marche. Il tire le son vers {ROOT}7, la couleur dominante et blues. Les blue notes (♭3, ♭5, ♭7) gagnent leur place en bougeant, jamais en s'installant."
	}
} satisfies LocaleDict;
