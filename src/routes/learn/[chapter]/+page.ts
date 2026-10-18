import { error } from '@sveltejs/kit';
import { CHAPTERS, chapterById } from '$lib/path/chapters';
import type { EntryGenerator, PageLoad } from './$types';

/** Every chapter page is prerendered: the static build lists them here. */
export const entries: EntryGenerator = () => CHAPTERS.map((chapter) => ({ chapter: chapter.id }));

export const load: PageLoad = ({ params }) => {
	const chapter = chapterById(params.chapter);
	if (!chapter) error(404, 'Chapter not found');
	return { chapterId: chapter.id };
};
