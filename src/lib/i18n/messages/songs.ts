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
 *
 * `songs.preset.<presetId>.note` (Phase 20 addendum): the preset shelf's
 * card sub-line, one key per `SONG_PRESETS` entry in `presets.ts`, keyed by
 * the preset's stable `presetId` slug. Preset TITLES (`preset.name`, e.g.
 * "Autumn Leaves (G minor)") are proper nouns and stay immune/untranslated;
 * only the `note` description (key simplifications, chart context) is
 * locale-aware. `presets.ts` itself stays an English-only data module (its
 * own `presets.test.ts` asserts the raw `note` string literals directly).
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
		'songs.page.button.keep': 'Keep it',

		// Preset shelf note lines (Phase 20 addendum), keyed by presetId.
		// Mirrors the English literals in presets.ts's SongPreset.note exactly.
		'songs.preset.autumn-leaves-gm.note':
			'Real Book key. Tonic saved as Gm, D7b9 as D7. Edit to match your chart.',
		'songs.preset.autumn-leaves-em.note':
			'Common combo key, a minor third up. Tonic saved as Em, B7b9 as B7.',
		'songs.preset.blue-bossa-cm.note': 'C minor, 16 bars, nothing simplified. A fine first song, mon ami.',
		'songs.preset.take-the-a-train-c.note':
			'C major, AABA. Simplified: C6 saved as C, D7#11 as D7.',
		'songs.preset.summertime-am.note':
			'A minor, 16 bars. Simplified: E7b13 saved as E7, A7b9 as A7.',
		'songs.preset.all-of-me-c.note':
			'C major, ABAC. Simplified: F6 saved as F, Fm6 as Fm, C6 as C.',
		'songs.preset.fly-me-to-the-moon-c.note':
			'In C, orbiting A minor. Extensions like G9 and E7b9 saved as G7 and E7.'
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
		'songs.page.button.keep': 'Garder',

		'songs.preset.autumn-leaves-gm.note':
			'Tonalité du Real Book. Tonique enregistrée en Gm, D7b9 simplifié en D7. Modifie pour correspondre à ta partition.',
		'songs.preset.autumn-leaves-em.note':
			'Tonalité courante en groupe, une tierce mineure plus haut. Tonique enregistrée en Em, B7b9 simplifié en B7.',
		'songs.preset.blue-bossa-cm.note':
			'Do mineur, 16 mesures, rien de simplifié. Un bon premier morceau, mon ami.',
		'songs.preset.take-the-a-train-c.note':
			'Do majeur, forme AABA. Simplifié : C6 enregistré en C, D7#11 en D7.',
		'songs.preset.summertime-am.note':
			'La mineur, 16 mesures. Simplifié : E7b13 enregistré en E7, A7b9 en A7.',
		'songs.preset.all-of-me-c.note':
			'Do majeur, forme ABAC. Simplifié : F6 enregistré en F, Fm6 en Fm, C6 en C.',
		'songs.preset.fly-me-to-the-moon-c.note':
			'En do, en orbite autour de la mineur. Les extensions comme G9 et E7b9 sont enregistrées en G7 et E7.'
	}
};
