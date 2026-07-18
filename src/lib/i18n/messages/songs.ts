import type { LocaleDict } from './index';

/**
 * Songs-domain dictionary (I18N-02, Phase 20 Plan 05): the Phase 18 shared
 * song-provenance components (SongMark, SongFilterToggle, SongHook) and the
 * /songs profile page. These three components are rendered by Drills,
 * Recall, and Lookup too, so translating their internal copy here flips it
 * everywhere at once; caller pages keep supplying their own `poolLabel`/
 * `note`/`noteOn`/`noteOff` prop strings from their own domain files
 * (drills.ts, recall.ts) unchanged.
 *
 * IMMUNITY (never keyed here): the single-song "♪ {songName}" form (song
 * name is user data), any song title, and chord symbols. `songs.mark.count`
 * keeps the literal `{N}` placeholder token, substituted by the component at
 * render time (t() itself has no interpolation - this mirrors the existing
 * prefix/suffix composition pattern used across drills.ts/build.ts).
 */
export const songs: LocaleDict = {
	en: {
		// SongMark (shared, Drills/Recall/Lookup/Songs).
		'songs.mark.count': '{N} SONGS',

		// SongFilterToggle (shared, Drills/Recall). poolLabel/note/noteOn/noteOff
		// stay caller-supplied props (drills.ts/recall.ts own those strings).
		'songs.filter.button': 'From my songs',

		// SongHook (shared, Drills interval scaffold).
		'songs.hook.soundsLike': 'Sounds like…',
		'songs.hook.hideTune': 'Hide tune',

		// /songs page.
		'songs.page.title': 'Songs',
		'songs.page.subtitle':
			'The charts on your piano, chord by chord. Active songs steer the drills toward what you actually play.',
		'songs.page.empty.title': 'No songs yet',
		'songs.page.empty.body':
			'Type one in from your sheet music, or stamp a preset below. Once a song is active, the drills favor its chords: you rehearse the exact symbols waiting on the stand.',

		'songs.page.register.chordSingular': 'CHORD',
		'songs.page.register.chordPlural': 'CHORDS',
		'songs.page.source.custom': 'CUSTOM',
		'songs.page.source.preset': 'PRESET',

		'songs.page.aria.practicePrefix': 'Practice',
		'songs.page.toggle.on': 'ON',
		'songs.page.toggle.inRotation': 'In rotation',
		'songs.page.toggle.resting': 'Resting',

		'songs.page.button.newSong': 'New song',

		'songs.page.presets.heading': 'The preset shelf',
		'songs.page.presets.subtitle':
			"One tap sets a standard in your list, already in rotation. Yours to edit after: charts disagree, your arrangement wins.",
		'songs.page.presets.chordsSuffix': 'CHORDS · TAP TO ADD',

		'songs.page.editSong.title': 'Edit song',
		'songs.page.form.nameLabel': 'Name',
		'songs.page.form.namePlaceholder': 'Autumn Leaves, my arrangement...',
		'songs.page.form.chordsLabel': 'Chords, in playing order',
		'songs.page.aria.removePrefix': 'Remove',
		'songs.page.form.entryPlaceholder': 'Type a symbol, then Enter: Cm7',
		'songs.page.button.add': 'Add',
		'songs.page.form.pasteHint':
			'Paste a whole line from a chart: symbols split on spaces, commas, and barlines.',

		'songs.page.error.unrecognized': 'Not a chord symbol we recognize.',
		'songs.page.error.notRecognizedOne': 'symbol not recognized:',
		'songs.page.error.notRecognizedMany': 'symbols not recognized:',
		'songs.page.suggestion.prefix': 'Did you mean',
		'songs.page.suggestion.suffix': '?',

		'songs.page.button.save': 'Save song',
		'songs.page.button.back': 'Back',
		'songs.page.button.deleteLink': 'Delete this song',
		'songs.page.confirm.deleteText': 'Delete this song? Its practice history stays.',
		'songs.page.button.deleteConfirm': 'Delete it',
		'songs.page.button.keep': 'Keep it'
	},
	fr: {
		'songs.mark.count': '{N} MORCEAUX',

		'songs.filter.button': 'Depuis mes morceaux',

		'songs.hook.soundsLike': 'Ça sonne comme…',
		'songs.hook.hideTune': "Masquer l'air",

		'songs.page.title': 'Morceaux',
		'songs.page.subtitle':
			'Les partitions de ton piano, accord par accord. Les morceaux actifs orientent les exercices vers ce que tu joues vraiment.',
		'songs.page.empty.title': "Aucun morceau pour l'instant",
		'songs.page.empty.body':
			"Tape-en un depuis ta partition, ou tamponne un préréglage ci-dessous. Une fois un morceau actif, les exercices favorisent ses accords : tu rejoues exactement les symboles qui t'attendent sur le pupitre.",

		'songs.page.register.chordSingular': 'ACCORD',
		'songs.page.register.chordPlural': 'ACCORDS',
		'songs.page.source.custom': 'PERSONNALISÉ',
		'songs.page.source.preset': 'PRÉDÉFINI',

		'songs.page.aria.practicePrefix': 'Pratiquer',
		'songs.page.toggle.on': 'ON',
		'songs.page.toggle.inRotation': 'En rotation',
		'songs.page.toggle.resting': 'Au repos',

		'songs.page.button.newSong': 'Nouveau morceau',

		'songs.page.presets.heading': "L'étagère des préréglages",
		'songs.page.presets.subtitle':
			"Un tap ajoute un standard à ta liste, déjà en rotation. À toi de le modifier ensuite : les partitions varient, ton arrangement l'emporte.",
		'songs.page.presets.chordsSuffix': 'ACCORDS · TOUCHER POUR AJOUTER',

		'songs.page.editSong.title': 'Modifier le morceau',
		'songs.page.form.nameLabel': 'Nom',
		'songs.page.form.namePlaceholder': 'Autumn Leaves, mon arrangement...',
		'songs.page.form.chordsLabel': "Accords, dans l'ordre de jeu",
		'songs.page.aria.removePrefix': 'Supprimer',
		'songs.page.form.entryPlaceholder': 'Tape un symbole, puis Entrée : Cm7',
		'songs.page.button.add': 'Ajouter',
		'songs.page.form.pasteHint':
			'Colle une ligne entière depuis une partition : les symboles se séparent sur les espaces, virgules et barres de mesure.',

		'songs.page.error.unrecognized': "Symbole d'accord non reconnu.",
		'songs.page.error.notRecognizedOne': 'symbole non reconnu :',
		'songs.page.error.notRecognizedMany': 'symboles non reconnus :',
		'songs.page.suggestion.prefix': 'Vouliez-vous dire',
		'songs.page.suggestion.suffix': ' ?',

		'songs.page.button.save': 'Enregistrer le morceau',
		'songs.page.button.back': 'Retour',
		'songs.page.button.deleteLink': 'Supprimer ce morceau',
		'songs.page.confirm.deleteText': 'Supprimer ce morceau ? Son historique de pratique est conservé.',
		'songs.page.button.deleteConfirm': 'Supprimer',
		'songs.page.button.keep': 'Garder'
	}
};
