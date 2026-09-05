<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { EditorState } from '@codemirror/state';
	import { EditorView } from '@codemirror/view';
	import { javascript } from '@codemirror/lang-javascript';
	import { syntaxHighlighting } from '@codemirror/language';
	import { strudelEditorTheme, strudelHighlightStyle } from '$lib/practice/strudelHighlight';

	/**
	 * A small CodeMirror 6 editor for Strudel mini-notation patterns
	 * (CompingLoop.svelte's live-code panel), restyled to the app's own
	 * tokens (see strudelHighlight.ts) rather than any default CodeMirror
	 * theme. Bundles only `@codemirror/state` + `@codemirror/view` +
	 * `@codemirror/lang-javascript` + `@codemirror/language` - not
	 * `@strudel/codemirror`, which also highlights but only as part of a much
	 * heavier bundle (autocomplete, vim/emacs keymaps, 40+ themes) this one
	 * textarea replacement does not need.
	 *
	 * `value` is a two-way bound plain string, same contract the textarea it
	 * replaces had (`bind:value`): CompingLoop's own `$state` stays the single
	 * source of truth (seed/reset/edit all still just assign a string), this
	 * component only renders it. An external assignment (Reset) is pushed
	 * into the editor by comparing against its current doc so an edit already
	 * in flight is not clobbered by its own change event.
	 */
	let { value = $bindable(''), dataTestId }: { value?: string; dataTestId?: string } = $props();

	let root: HTMLDivElement;
	let view: EditorView | undefined;

	onMount(() => {
		view = new EditorView({
			state: EditorState.create({
				doc: value,
				extensions: [
					javascript(),
					syntaxHighlighting(strudelHighlightStyle),
					strudelEditorTheme,
					EditorView.lineWrapping,
					EditorView.updateListener.of((update) => {
						if (update.docChanged) value = update.state.doc.toString();
					})
				]
			}),
			parent: root
		});
		if (dataTestId) view.contentDOM.setAttribute('data-testid', dataTestId);
	});

	$effect(() => {
		if (view && value !== view.state.doc.toString()) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
		}
	});

	onDestroy(() => view?.destroy());
</script>

<div bind:this={root} class="w-full"></div>
