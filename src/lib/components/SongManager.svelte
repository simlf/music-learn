<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		deleteSong,
		findSongByPresetId,
		listSongs,
		saveSong,
		type Song,
		type SongSource
	} from '$lib/practice/songs';
	import { SONG_PRESETS, songFromPreset, type SongPreset } from '$lib/practice/presets';
	import { spellChord } from '$lib/theory/chord';
	import { didYouMean } from '$lib/theory/didYouMean';
	import Button from '$lib/components/Button.svelte';
	import SongFilterToggle from '$lib/components/SongFilterToggle.svelte';
	import { readSongFilter, writeSongFilter } from '$lib/practice/songFilterPref';
	import { drillableSongSymbols } from '$lib/practice/songProvenance';
	import { setSongPlaythrough } from '$lib/practice/songPlaythrough';
	import { setCompSongSeed } from '$lib/practice/compSongSeed';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Phase 29-02: `heading` gates only the list-view page heading + subtitle
	 * (the internal `/songs` title). Default true keeps `/songs` byte-identical;
	 * the Progress hub passes false to avoid a duplicate title under its own
	 * shared hub title.
	 */
	let { heading = true }: { heading?: boolean } = $props();

	/**
	 * The song list. Initialized synchronously like the lookup page's recents:
	 * listSongs is total (missing/foreign localStorage degrades to []), so
	 * this is prerender-safe too.
	 */
	let songs = $state<Song[]>(listSongs());

	/** Edit-form draft. null = list view; id null inside = creating a new song. */
	interface Draft {
		id: string | null;
		name: string;
		chips: string[];
		source: SongSource;
		presetId?: string;
		active: boolean;
		createdAt: string | null;
	}
	let draft = $state<Draft | null>(null);

	/**
	 * Quick task 260720-v9u: the ONE global "From my songs" practice-pool
	 * filter control, set here and read by Drills + Recall. The count is a
	 * `$derived.by` over `songs` (not a one-shot snapshot) so toggling a song
	 * active/inactive live-updates the note's {N} without a page reload.
	 */
	let songFilterOn = $state(readSongFilter());
	const drillableSongCount = $derived.by(() => {
		// Referencing `songs` here keeps this recomputing whenever the song
		// list (including active/inactive flips) changes.
		void songs;
		return drillableSongSymbols().length;
	});
	const songFallbackActive = $derived(songFilterOn && drillableSongCount === 0);

	function toggleSongFilter(): void {
		songFilterOn = !songFilterOn;
		writeSongFilter(songFilterOn);
	}

	/** Chord-entry state, reset whenever the form opens or closes. */
	let entry = $state('');
	let entryError = $state('');
	let suggestion = $state<string | null>(null);
	let confirmingDelete = $state(false);

	const saveDisabled = $derived(
		draft === null || draft.name.trim() === '' || draft.chips.length === 0
	);

	/** DPOL-01: presetIds already copied into the user's list, so the preset shelf can mark them "Added". */
	const addedPresetIds = $derived(
		new Set(songs.filter((song) => song.presetId !== undefined).map((song) => song.presetId))
	);

	/** Mono register line under each song name, status-register voice. */
	function registerLine(song: Song): string {
		const count = song.chordSymbols.length;
		const noun =
			count === 1 ? t('songs.page.register.chordSingular') : t('songs.page.register.chordPlural');
		const sourceLabel =
			song.source === 'preset' ? t('songs.page.source.preset') : t('songs.page.source.custom');
		return `${count} ${noun} · ${sourceLabel}`;
	}

	function resetEntry() {
		entry = '';
		entryError = '';
		suggestion = null;
		confirmingDelete = false;
	}

	function startCreate() {
		resetEntry();
		draft = {
			id: null,
			name: '',
			chips: [],
			source: 'custom',
			active: true,
			createdAt: null
		};
	}

	function startEdit(song: Song) {
		resetEntry();
		draft = {
			id: song.id,
			name: song.name,
			chips: [...song.chordSymbols],
			source: song.source,
			presetId: song.presetId,
			active: song.active,
			createdAt: song.createdAt
		};
	}

	function closeEdit() {
		draft = null;
		resetEntry();
	}

	/**
	 * Validates one typed token through spellChord and stamps it as a chip in
	 * the canonical ASCII form the engine echoes (so "F♯m7♭5" lands as
	 * "F#m7b5", same identity the drills use). Returns false when the token
	 * is unrecognized, leaving it in the input for correction.
	 */
	function commitToken(raw: string): boolean {
		const token = raw.trim();
		if (token === '' || draft === null) return true;

		const spelled = spellChord(token);
		if (spelled.recognized) {
			draft.chips.push(spelled.symbol);
			entry = '';
			entryError = '';
			suggestion = null;
			return true;
		}

		entryError = t('songs.page.error.unrecognized');
		suggestion = didYouMean(token);
		return false;
	}

	function handleEntryKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
			event.preventDefault();
			commitToken(entry);
		}
	}

	/**
	 * Paste-a-line bulk entry: a pasted chart line is split on whitespace,
	 * commas, and barlines, every token validated, the valid ones stamped as
	 * chips and the failures reported in one line. A single-token paste falls
	 * through to the normal input flow.
	 */
	function handlePaste(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text') ?? '';
		const tokens = text.split(/[\s|,]+/).filter((token) => token.length > 0);
		if (tokens.length <= 1 || draft === null) return;

		event.preventDefault();

		const failures: string[] = [];
		for (const token of tokens) {
			const spelled = spellChord(token);
			if (spelled.recognized) {
				draft.chips.push(spelled.symbol);
			} else {
				failures.push(token);
			}
		}

		suggestion = null;
		if (failures.length === 0) {
			entryError = '';
		} else {
			const notRecognized =
				failures.length === 1
					? t('songs.page.error.notRecognizedOne')
					: t('songs.page.error.notRecognizedMany');
			entryError = `${failures.length} ${notRecognized} ${failures.join(', ')}.`;
		}
	}

	function acceptSuggestion() {
		if (draft === null || suggestion === null) return;
		draft.chips.push(suggestion);
		entry = '';
		entryError = '';
		suggestion = null;
	}

	function removeChip(index: number) {
		draft?.chips.splice(index, 1);
	}

	function saveDraft() {
		if (draft === null) return;
		// A symbol still sitting in the input is committed on save; if it does
		// not parse, the error line shows and the save waits for a fix.
		if (entry.trim() !== '' && !commitToken(entry)) return;
		if (draft.name.trim() === '' || draft.chips.length === 0) return;

		const song: Song = {
			id: draft.id ?? crypto.randomUUID(),
			name: draft.name.trim(),
			chordSymbols: [...draft.chips],
			createdAt: draft.createdAt ?? new Date().toISOString(),
			source: draft.source,
			active: draft.active,
			...(draft.presetId !== undefined ? { presetId: draft.presetId } : {})
		};
		saveSong(song);
		songs = listSongs();
		closeEdit();
	}

	function toggleActive(song: Song) {
		saveSong({ ...song, active: !song.active });
		songs = listSongs();
	}

	/**
	 * DPOL-01: dedupe by presetId, not by re-adding. An already-added preset
	 * never calls saveSong again; it just scrolls to / highlights the
	 * existing row. Only an unseen preset is copied in and scrolled to.
	 */
	function addPreset(preset: SongPreset) {
		const existing = findSongByPresetId(songs, preset.presetId);
		if (existing !== undefined) {
			scrollToSongRow(existing.id);
			return;
		}

		const song = songFromPreset(preset);
		saveSong(song);
		songs = listSongs();
		scrollToSongRow(song.id);
	}

	function scrollToSongRow(id: string) {
		queueMicrotask(() => {
			const row = document.getElementById(`song-${id}`);
			if (row && typeof row.scrollIntoView === 'function') {
				row.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
	}

	function confirmDelete() {
		if (draft?.id == null) return;
		deleteSong(draft.id);
		songs = listSongs();
		closeEdit();
	}

	/** PLAY-01: drills `song`'s own chords, in sheet order, on /practice - the per-song play-through action. */
	function playThroughSong(song: Song): void {
		setSongPlaythrough(song.name, song.chordSymbols);
		void goto('/practice');
	}

	/** Proposal 2's "Play over it": feeds `song`'s chords into the comping loop on /learn. */
	function playOverSong(song: Song): void {
		setCompSongSeed(song.name, song.chordSymbols);
		void goto('/learn');
	}
</script>

{#if draft === null}
	{#if heading}
		<h1 class="text-heading mt-2 font-bold">{t('songs.page.title')}</h1>
		<p class="text-muted mt-2">
			{t('songs.page.subtitle')}
		</p>
	{/if}

	<div class="mt-8">
		<SongFilterToggle
			poolLabel={t('songs.filter.poolLabel')}
			on={songFilterOn}
			onToggle={toggleSongFilter}
			note={songFallbackActive ? t('songs.filter.noteFallback') : undefined}
			noteOn={`${t('songs.filter.noteOnPrefix')} ${drillableSongCount} ${t('songs.filter.noteOnSuffix')}`}
			noteOff={t('songs.filter.noteOff')}
		/>
	</div>

	{#if songs.length === 0}
		<div class="mt-8" data-testid="empty-state">
			<p class="text-heading font-bold">{t('songs.page.empty.title')}</p>
			<p class="text-muted mt-2">
				{t('songs.page.empty.body')}
			</p>
		</div>
	{:else}
		<ul class="mt-8 flex list-none flex-col gap-3 p-0">
			{#each songs as song (song.id)}
				<li
					class="song-row border-ink bg-paper-bright flex flex-col border-2"
					id={`song-${song.id}`}
					data-testid="song-row"
				>
					<div class="flex items-stretch">
						<button
							type="button"
							class="song-row__open min-w-0 flex-1 cursor-pointer text-left"
							data-testid="song-open"
							onclick={() => startEdit(song)}
						>
							<span class="block truncate font-bold">{song.name}</span>
							<span class="text-label text-muted mt-1 block font-mono uppercase">
								{registerLine(song)}
							</span>
						</button>
						<button
							type="button"
							role="switch"
							class="song-toggle cursor-pointer"
							aria-checked={song.active}
							aria-label={`${t('songs.page.aria.practicePrefix')} ${song.name}`}
							data-testid="song-toggle"
							onclick={() => toggleActive(song)}
						>
							<span class="song-toggle__box" class:song-toggle__box--on={song.active}>
								{song.active ? t('songs.page.toggle.on') : ''}
							</span>
							<span class="text-label text-muted font-mono uppercase">
								{song.active ? t('songs.page.toggle.inRotation') : t('songs.page.toggle.resting')}
							</span>
						</button>
					</div>
					<div class="song-actions border-ink flex border-t-2">
						<button
							type="button"
							class="song-action cursor-pointer"
							data-testid="song-play-through"
							onclick={() => playThroughSong(song)}
						>
							{t('songs.page.action.playThrough')}
						</button>
						<button
							type="button"
							class="song-action song-action--border cursor-pointer"
							data-testid="song-play-over"
							onclick={() => playOverSong(song)}
						>
							{t('songs.page.action.playOverIt')}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="mt-6">
		<Button type="button" onclick={startCreate}>{t('songs.page.button.newSong')}</Button>
	</div>

	<h2 class="text-heading mt-12 font-bold">{t('songs.page.presets.heading')}</h2>
	<p class="text-muted mt-2">
		{t('songs.page.presets.subtitle')}
	</p>
	<ul class="mt-4 flex list-none flex-col gap-3 p-0">
		{#each SONG_PRESETS as preset (preset.presetId)}
			{@const added = addedPresetIds.has(preset.presetId)}
			<li>
				<button
					type="button"
					class="preset-card border-ink bg-paper-bright w-full cursor-pointer border-2 text-left"
					class:preset-card--added={added}
					data-testid="preset-card"
					data-added={added}
					onclick={() => addPreset(preset)}
				>
					<span class="flex items-center justify-between gap-2">
						<span class="block font-bold">{preset.name}</span>
						{#if added}
							<span
								class="text-label bg-ink text-mustard shrink-0 px-2 py-1 font-mono uppercase"
								data-testid="preset-added-marker"
							>
								{t('songs.page.presets.added')}
							</span>
						{/if}
					</span>
					<span class="text-muted mt-1 block"
						>{t(`songs.preset.${preset.presetId}.note` as MessageKey)}</span
					>
					<span class="text-label text-muted mt-2 block font-mono uppercase">
						{preset.chordSymbols.length} {t('songs.page.presets.chordsSuffix')}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{:else}
	<h1 class="text-heading mt-2 font-bold">
		{draft.id === null ? t('songs.page.button.newSong') : t('songs.page.editSong.title')}
	</h1>

	<label class="mt-8 block">
		<span class="text-label block font-mono uppercase">{t('songs.page.form.nameLabel')}</span>
		<input
			type="text"
			class="border-ink bg-paper-bright mt-2 w-full border-2 p-2"
			placeholder={t('songs.page.form.namePlaceholder')}
			data-testid="name-input"
			bind:value={draft.name}
		/>
	</label>

	<div class="mt-6">
		<span class="text-label block font-mono uppercase">{t('songs.page.form.chordsLabel')}</span>
		{#if draft.chips.length > 0}
			<div class="mt-2 flex flex-wrap gap-2" data-testid="chip-row">
				{#each draft.chips as chip, index (index)}
					<button
						type="button"
						class="chip border-ink cursor-pointer border-2 font-mono"
						aria-label={`${t('songs.page.aria.removePrefix')} ${chip}`}
						onclick={() => removeChip(index)}
					>
						{chip}<span class="text-muted ml-2" aria-hidden="true">✕</span>
					</button>
				{/each}
			</div>
		{/if}
		<div class="mt-2 flex items-center gap-2">
			<input
				type="text"
				class="border-ink bg-paper-bright min-w-0 flex-1 border-2 p-2"
				placeholder={t('songs.page.form.entryPlaceholder')}
				data-testid="chord-entry"
				bind:value={entry}
				onkeydown={handleEntryKeydown}
				onpaste={handlePaste}
			/>
			<Button type="button" variant="ghost" onclick={() => commitToken(entry)}
				>{t('songs.page.button.add')}</Button
			>
		</div>
		<p class="text-label text-muted mt-2 font-mono uppercase">
			{t('songs.page.form.pasteHint')}
		</p>
		{#if entryError}
			<p
				class="bg-ink text-mustard mt-2 p-3 font-mono text-label uppercase"
				data-testid="entry-error"
			>
				{entryError}
				{#if suggestion}
					{t('songs.page.suggestion.prefix')} <button
						type="button"
						class="suggestion-tap cursor-pointer underline"
						data-testid="entry-suggestion"
						onclick={acceptSuggestion}
					>{suggestion}</button>{t('songs.page.suggestion.suffix')}
				{/if}
			</p>
		{/if}
	</div>

	<div class="mt-8 flex gap-2">
		<Button type="button" data-testid="save-song" disabled={saveDisabled} onclick={saveDraft}>
			{t('songs.page.button.save')}
		</Button>
		<Button type="button" variant="ghost" data-testid="cancel-edit" onclick={closeEdit}>
			{t('songs.page.button.back')}
		</Button>
	</div>

	{#if draft.id !== null}
		<div class="border-ink mt-12 border-t-2 pt-4">
			{#if !confirmingDelete}
				<button
					type="button"
					class="delete-link text-muted cursor-pointer font-mono text-label uppercase underline"
					data-testid="delete-song"
					onclick={() => (confirmingDelete = true)}
				>
					{t('songs.page.button.deleteLink')}
				</button>
			{:else}
				<p class="font-bold">{t('songs.page.confirm.deleteText')}</p>
				<div class="mt-4 flex gap-2">
					<Button type="button" data-testid="confirm-delete" onclick={confirmDelete}>
						{t('songs.page.button.deleteConfirm')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						data-testid="keep-song"
						onclick={() => (confirmingDelete = false)}
					>
						{t('songs.page.button.keep')}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	/* Row body and toggle both clear the 44px touch floor via padding. */
	.song-row__open {
		background: transparent;
		border: none;
		padding: var(--spacing-md);
		min-height: 44px;
		font-size: var(--text-body);
	}

	.song-toggle {
		background: transparent;
		border: none;
		border-left: 2px solid var(--color-ink);
		padding: var(--spacing-sm) var(--spacing-md);
		min-width: 44px;
		min-height: 44px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-xs);
	}

	/* Ink-stamp checkbox: empty square when resting, ink-filled ON when live. */
	.song-toggle__box {
		width: 28px;
		height: 28px;
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-paper-bright);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.song-toggle__box--on {
		background: var(--color-ink);
		color: var(--color-mustard);
		animation: stamp-in 240ms ease-out;
	}

	/* Per-song play-through / play-over-it actions: same mono-uppercase,
	   border-separated idiom as song-toggle, one text row instead of a stamp box. */
	.song-action {
		flex: 1;
		background: transparent;
		border: none;
		min-height: 44px;
		padding: var(--spacing-sm) var(--spacing-md);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink);
	}

	.song-action--border {
		border-left: 2px solid var(--color-ink);
	}

	.song-action:hover,
	.song-action:focus-visible {
		color: var(--color-vermilion);
	}

	.preset-card {
		padding: var(--spacing-md);
		min-height: 44px;
		font-size: var(--text-body);
	}

	/* DPOL-01: already-added preset stays discoverable/clickable, just visually receded. */
	.preset-card--added {
		opacity: 0.7;
	}

	.chip {
		background: var(--color-paper-bright);
		padding: var(--spacing-sm) var(--spacing-md);
		min-height: 44px;
		min-width: 44px;
		font-size: var(--text-body);
		animation: stamp-in 240ms ease-out;
	}

	.delete-link {
		background: transparent;
		border: none;
		padding: var(--spacing-sm) 0;
		min-height: 44px;
	}

	/* 44px hit area for the inline did-you-mean tap, visual height unchanged
	   (same treatment as the lookup page's suggestion). */
	.suggestion-tap {
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		text-transform: inherit;
		min-height: 44px;
		min-width: 44px;
		padding: var(--spacing-sm);
		margin: calc(-1 * var(--spacing-sm));
		vertical-align: middle;
	}

	@media (prefers-reduced-motion: reduce) {
		.chip,
		.song-toggle__box--on {
			animation: none;
		}
	}
</style>
