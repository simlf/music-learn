import { tags } from '@lezer/highlight';
import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

/**
 * Syntax colouring and editor chrome for CompingLoop.svelte's live-code
 * panel (StrudelEditor.svelte), restyled from the app's own tokens (app.css)
 * rather than any CodeMirror default theme - a pasted-in default theme would
 * look foreign next to the rest of the app (see AGENTS.md).
 *
 * A Strudel pattern like `chord("<Cmaj7 Dm7>").voicing().s("sawtooth")` is
 * literal JavaScript: the mini-notation itself only ever lives inside string
 * literals. So "highlighting the mini-notation" is, concretely, giving those
 * strings the app's one standing attention accent (vermilion) - the pattern
 * IS the thing being edited - while everything else (the `.chord()` /
 * `.voicing()` calls that shape it) stays a quieter, secondary tone. This is
 * deliberately a two-tone scheme, not a rainbow IDE theme: matches the "one
 * control idiom app-wide" restraint the rest of the comping loop follows.
 */
/**
 * Plain data, kept separate from `HighlightStyle.define()` (whose return
 * value only exposes an opaque generated class name, not these colours) so
 * the mapping itself - every tag resolving to an app CSS custom property,
 * never a hardcoded hex - is directly testable.
 */
export const strudelHighlightSpecs = [
	{ tag: tags.string, color: 'var(--color-vermilion)' },
	{ tag: [tags.function(tags.variableName), tags.propertyName], color: 'var(--color-muted)' },
	{ tag: tags.number, color: 'var(--color-ink)' },
	{ tag: tags.comment, color: 'var(--color-muted)', fontStyle: 'italic' },
	{ tag: [tags.paren, tags.bracket, tags.punctuation, tags.operator], color: 'var(--color-muted)' }
];

export const strudelHighlightStyle = HighlightStyle.define(strudelHighlightSpecs);

/**
 * Editor chrome only (background, border, font, padding, caret, selection):
 * the same textarea look this replaces (`border-ink bg-paper-bright font-mono
 * w-full border-2 p-2`), since CodeMirror's DOM does not take Tailwind
 * utility classes the way a plain textarea did.
 */
export const strudelEditorTheme = EditorView.theme({
	'&': {
		color: 'var(--color-ink)',
		backgroundColor: 'var(--color-paper-bright)',
		border: '2px solid var(--color-ink)',
		fontFamily: 'var(--font-mono)'
	},
	'.cm-content': {
		padding: '8px',
		caretColor: 'var(--color-ink)',
		minHeight: '4.5rem'
	},
	'.cm-scroller': {
		fontFamily: 'var(--font-mono)'
	},
	'&.cm-focused': {
		outline: 'none'
	},
	'.cm-selectionBackground, ::selection': {
		backgroundColor: 'var(--color-faint) !important'
	},
	'.cm-gutters': {
		display: 'none'
	}
});
