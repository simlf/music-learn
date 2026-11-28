<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import ReadingDrill from '$lib/components/ReadingDrill.svelte';
	import RhythmDrill from '$lib/components/RhythmDrill.svelte';
	import { t } from '$lib/i18n/locale.svelte';
	import {
		HOMEWORK_KINDS,
		exerciseKey,
		exercisesOnPage,
		lookupExercise,
		pagesFor,
		type HomeworkExercise,
		type HomeworkKind
	} from '$lib/homework/catalog';
	import { getRecord, type ExerciseRecord } from '$lib/homework/homeworkLog';

	/**
	 * Homework: type the printed page and exercise number from the teacher's
	 * book and the exercise opens, ready to read or tap. Two books today
	 * (note reading and rhythm); only handpicked, hand-transcribed pages are
	 * in the catalog, and the page says which, so a miss is never a mystery.
	 */

	let kind = $state<HomeworkKind>('reading');
	let pageText = $state('');
	let numberText = $state('');
	let opened = $state<HomeworkExercise | null>(null);
	let error = $state<string | null>(null);
	let record = $state<ExerciseRecord | null>(null);

	const pages = $derived(pagesFor(kind));

	function showError(reason: 'bad-input' | 'no-page' | 'no-exercise', available?: number[]): void {
		error =
			reason === 'bad-input'
				? t('homework.error.badInput')
				: reason === 'no-page'
					? t('homework.error.noPage').replace('{PAGES}', pages.join(', '))
					: t('homework.error.noExercise')
							.replace('{PAGE}', pageText.trim())
							.replace('{EXERCISES}', (available ?? []).join(', '));
	}

	function syncUrl(): void {
		try {
			const params = new URLSearchParams();
			if (opened) {
				params.set('book', opened.kind);
				params.set('page', String(opened.page));
				params.set('ex', String(opened.number));
			}
			replaceState(params.size > 0 ? `?${params}` : '?', {});
		} catch {
			// The router may not be ready (first paint, tests): the URL is a convenience only.
		}
	}

	function open(): void {
		const result = lookupExercise(kind, pageText, numberText);
		if (!result.ok) {
			opened = null;
			record = null;
			showError(result.reason, result.available);
			syncUrl();
			return;
		}
		error = null;
		opened = result.exercise;
		// Letters and the space bar answer the drill, so they must not land in the box that was just typed in.
		if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
		record = getRecord(exerciseKey(kind, result.exercise.page, result.exercise.number));
		syncUrl();
	}

	function pick(page: number, number: number): void {
		pageText = String(page);
		numberText = String(number);
		open();
	}

	function chooseKind(next: HomeworkKind): void {
		if (next === kind) return;
		kind = next;
		opened = null;
		error = null;
		record = null;
		syncUrl();
	}

	function onSubmit(e: SubmitEvent): void {
		e.preventDefault();
		open();
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const book = params.get('book');
		if (book === 'reading' || book === 'rhythm') kind = book;
		const page = params.get('page');
		const ex = params.get('ex');
		if (page && ex) {
			pageText = page;
			numberText = ex;
			open();
		}
	});
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('homework.page.title')}</h1>
	<p class="text-body mt-2 max-w-prose">{t('homework.page.intro')}</p>
	<p class="text-label mt-2 max-w-prose" data-testid="homework-pending">{t('homework.pending')}</p>

	<div class="mt-6 flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{t('homework.kind.label')}
		</p>
		<div class="flex flex-wrap gap-2" data-testid="homework-kinds">
			{#each HOMEWORK_KINDS as k (k)}
				<Button
					type="button"
					variant={kind === k ? 'primary' : 'ghost'}
					aria-pressed={kind === k}
					onclick={() => chooseKind(k)}
					data-testid="kind-{k}"
				>
					{k === 'reading' ? t('homework.kind.reading') : t('homework.kind.rhythm')}
				</Button>
			{/each}
		</div>
		<p class="text-label font-mono" data-testid="homework-book">
			{kind === 'reading' ? t('homework.book.reading') : t('homework.book.rhythm')}
		</p>
	</div>

	<form class="mt-6 flex flex-wrap items-end gap-4" onsubmit={onSubmit} data-testid="homework-form">
		<label class="flex flex-col gap-2">
			<span class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('homework.field.page')}
			</span>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				bind:value={pageText}
				class="border-ink bg-paper-bright text-body w-28 border-2 px-3 py-2 font-mono"
				data-testid="homework-page"
			/>
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('homework.field.exercise')}
			</span>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				bind:value={numberText}
				class="border-ink bg-paper-bright text-body w-28 border-2 px-3 py-2 font-mono"
				data-testid="homework-exercise"
			/>
		</label>
		<Button type="submit" data-testid="homework-open">{t('homework.open')}</Button>
	</form>

	{#if error}
		<p class="text-body mt-3 font-bold" style="color: var(--color-vermilion);" role="alert" data-testid="homework-error">
			{error}
		</p>
	{/if}

	<div class="mt-6 flex flex-col gap-2" data-testid="homework-catalog">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{t('homework.catalog.label')}
		</p>
		{#each pages as page (page)}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-label font-mono">{t('homework.catalog.page').replace('{PAGE}', String(page))}</span>
				{#each exercisesOnPage(kind, page) as n (n)}
					<Button
						type="button"
						variant={opened?.page === page && opened?.number === n ? 'primary' : 'ghost'}
						onclick={() => pick(page, n)}
						data-testid="pick-{page}-{n}"
					>
						{n}
					</Button>
				{/each}
			</div>
		{/each}
	</div>

	{#if opened}
		<section class="mt-8 flex flex-col gap-4" data-testid="homework-exercise-view">
			<h2 class="text-heading font-bold" data-testid="homework-exercise-title">
				{t('homework.exercise.title')
					.replace('{PAGE}', String(opened.page))
					.replace('{N}', String(opened.number))}
			</h2>
			<p class="text-body max-w-prose">{opened.hint}</p>
			{#if record}
				<p class="text-label font-mono" data-testid="homework-last">
					{t('homework.record')
						.replace('{BEST}', String(record.best))
						.replace('{N}', String(record.attempts))}
				</p>
			{/if}
			{#key `${opened.kind}:${opened.page}:${opened.number}`}
				{#if opened.kind === 'reading'}
					<ReadingDrill exercise={opened} />
				{:else}
					<RhythmDrill exercise={opened} />
				{/if}
			{/key}
		</section>
	{/if}
</main>
