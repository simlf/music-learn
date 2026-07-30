import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * LEARN-01 render/smoke test (Phase 28 Plan 04): proves the /learn hub
 * renders all three parts (Theory lessons, Scale Explore, Interval
 * Reference) on one surface, that Scale Explore is exploreOnly (no mode
 * toggle), that the Interval Reference block renders exactly five
 * IntervalView instances, that the footer CTA links to /practice, that the
 * hub renders in French, and that no em/en dashes leak into the rendered
 * copy. Mirrors theoryInteractiveLesson.test.ts's mock-then-dynamic-import
 * convention.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => true,
	// The comping-loop block reads the study-mode preference and owns the one
	// Transport-scheduled playback path. Its behaviour is covered in
	// compingLoop.test.ts; on this page it only has to mount.
	studyModeEnabled: () => false,
	startCompLoop: async () => null
}));

const { playChord } = await import('$lib/audio/audio');
const { default: LearnPage } = await import('./learn/+page.svelte');

function renderPage() {
	return render(LearnPage);
}

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.mocked(playChord).mockClear();
});

describe('/learn: hub structure and section presence', () => {
	it('renders the Learn hub page title', () => {
		renderPage();
		expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
	});

	it('renders the comping loop as a peer block, ahead of the lesson scroll', () => {
		renderPage();
		const comping = screen.getByTestId('learn-comping');

		expect(comping).toBeInTheDocument();
		expect(within(comping).getByRole('heading', { name: 'Comping loop' })).toBeInTheDocument();
		// A peer of the lesson blocks, not nested inside one, and not a drill.
		expect(within(screen.getByTestId('learn-theory')).queryByTestId('learn-comping')).toBeNull();

		const blocks = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="learn-"]')
		).map((element) => element.dataset.testid);
		expect(blocks.indexOf('learn-comping')).toBeLessThan(blocks.indexOf('learn-theory'));
	});

	it('renders the Theory section with the extracted lesson sections', () => {
		renderPage();
		const theorySection = screen.getByTestId('learn-theory');
		expect(theorySection).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-interactive-lesson')).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-scale')).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-symbol')).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-sevenths')).toBeInTheDocument();
	});

	/**
	 * x3-scale-lesson: the major-scale build lesson (making
	 * createScaleConstruction/BuildSession's scale branch reachable, per the
	 * pedagogy audit) sits right after the thirds lesson that establishes the
	 * "half steps" vocabulary it reuses, and before the symbol lesson.
	 */
	it('renders the major-scale lesson between the thirds lesson and the symbol lesson, with its tonic picker', () => {
		renderPage();
		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="section-"]')
		).map((element) => element.dataset.testid);

		expect(sections.indexOf('section-scale')).toBeGreaterThan(
			sections.indexOf('section-interactive-lesson')
		);
		expect(sections.indexOf('section-scale')).toBeLessThan(sections.indexOf('section-symbol'));

		const scaleSection = screen.getByTestId('section-scale');
		expect(within(scaleSection).getByTestId('scale-tonic-row')).toBeInTheDocument();
		expect(within(scaleSection).queryByTestId('build-session')).not.toBeInTheDocument();
	});

	/**
	 * Unit 4 (interval naming): generalizes the number+quality mechanism
	 * beyond thirds, right after the major-scale lesson it builds on
	 * (guided-path.md unit order: half steps, major scale, scale degrees,
	 * then interval naming) and before the symbol lesson.
	 */
	it('renders the interval-naming lesson between the major-scale lesson and the symbol lesson', () => {
		renderPage();
		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="section-"]')
		).map((element) => element.dataset.testid);

		expect(sections.indexOf('section-interval-naming')).toBeGreaterThan(
			sections.indexOf('section-scale')
		);
		expect(sections.indexOf('section-interval-naming')).toBeLessThan(
			sections.indexOf('section-symbol')
		);

		const intervalNamingSection = screen.getByTestId('section-interval-naming');
		expect(
			within(intervalNamingSection).getByText('The bottom note, again')
		).toBeInTheDocument();
	});

	it('renders the Scale Explore section with the tonic picker and no mode toggle (exploreOnly)', () => {
		renderPage();
		const exploreSection = screen.getByTestId('learn-explore');
		expect(exploreSection).toBeInTheDocument();
		expect(within(exploreSection).getByTestId('tonic-row')).toBeInTheDocument();
		expect(within(exploreSection).getByTestId('scale-title')).toBeInTheDocument();
		expect(within(exploreSection).queryByTestId('mode-toggle')).not.toBeInTheDocument();
	});

	it('renders the Interval Reference block with exactly five IntervalView instances', () => {
		renderPage();
		const intervalSection = screen.getByTestId('learn-interval-reference');
		expect(intervalSection).toBeInTheDocument();
		const views = within(intervalSection).getAllByTestId('interval-view');
		expect(views).toHaveLength(5);
	});

	it('renders the footer "Go to Practice" link to /practice', () => {
		renderPage();
		const link = screen.getByRole('link', { name: /Practice/ });
		expect(link).toHaveAttribute('href', '/practice');
	});

	it('renders all copy in French (I18N-02)', () => {
		setLocale('fr');
		renderPage();
		expect(screen.getByText('Apprendre')).toBeInTheDocument();
	});

	it('renders no em or en dashes in the page copy', () => {
		renderPage();
		expect(document.body.textContent).not.toMatch(/—|–/);
	});
});

/**
 * T5 R2: the diatonic-sevenths block is the ONLY place in the app where
 * roman numerals are ever defined, and ProgressionDrill then demands numeral
 * literacy ("STEP 1: NAME THE ii"). It previously stated a C-only
 * observation with decorative captions ("The vi. The relative minor.") and
 * never said what a numeral is, that the quality order is transposable, or
 * that upper/lower case encodes the third.
 */
describe('/learn: the diatonic sevenths teach the transposable numeral system (T5 R2)', () => {
	function anchorSection() {
		return screen.getByTestId('section-anchor');
	}

	it('states the fixed quality order and that it is identical in every key', () => {
		renderPage();
		const text = anchorSection().textContent ?? '';

		expect(text).toContain('maj7, m7, m7, maj7, 7, m7, m7♭5');
		expect(text).toMatch(/identical in every key/);
		// The transposable framing replaces the old "one hand position" claim.
		expect(text).not.toMatch(/One hand position/);
	});

	it('defines roman numerals, including the capital-versus-small convention', () => {
		renderPage();
		const text = anchorSection().textContent ?? '';

		expect(text).toMatch(/roman numerals/i);
		expect(text).toContain("capital when the chord's third is major, small when it is minor");
		// And it cashes the definition out on a real chart reading.
		expect(text).toContain('"ii in B♭" means the second degree of B♭ major, minor 7th: Cm7');
	});

	it('labels every degree pick with its roman numeral, not the chord symbol alone', () => {
		renderPage();
		const picks = within(screen.getByTestId('anchor-pick-row')).getAllByRole('button');

		expect(picks.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'I Cmaj7',
			'ii Dm7',
			'iii Em7',
			'IV Fmaj7',
			'V G7',
			'vi Am7',
			'viiø7 Bm7b5'
		]);
	});

	it('gives every caption a degree, a quality, and a job instead of a decorative line', async () => {
		renderPage();
		const section = anchorSection();

		expect(section.textContent).toContain('I: first degree, always maj7. Home. This is the tonic.');

		await fireEvent.click(within(section).getByRole('button', { name: /Dm7/ }));
		expect(anchorSection().textContent).toContain(
			'ii: second degree, always m7. Its job is to set up the V.'
		);

		await fireEvent.click(within(anchorSection()).getByRole('button', { name: /G7/ }));
		expect(anchorSection().textContent).toContain(
			'V: fifth degree, always 7. It pulls home. This is the dominant.'
		);
	});

	it('calls vi tonic family, never "the relative minor" (a property of a key, not of Am7)', async () => {
		renderPage();

		await fireEvent.click(within(anchorSection()).getByRole('button', { name: /Am7/ }));
		const text = anchorSection().textContent ?? '';

		expect(text).toContain('vi: sixth degree, m7. Tonic family');
		expect(text).not.toMatch(/relative minor/i);
	});

	it('renders the numeral system in French, with the key named in solfège', () => {
		setLocale('fr');
		renderPage();
		const text = anchorSection().textContent ?? '';

		expect(text).toContain('chiffres romains');
		expect(text).toContain("majuscule quand la tierce de l'accord est majeure");
		expect(text).toContain('« ii en Si♭ » veut dire le deuxième degré de Si♭ majeur');
		expect(text).not.toMatch(/relatif mineur/i);
	});
});

/**
 * T5 R3: ProgressionDrill reveals a bare "FUNCTION: SUBDOMINANT" after every
 * bar, and before this unit existed the word "function" was never defined
 * anywhere in the app, nor were the three function words distinguished. This
 * block also states why ii V I is the shape worth knowing, which the app had
 * never said despite all three progression templates being derivatives of it.
 */
describe('/learn: function is defined before any drill asserts it (T5 R3)', () => {
	function functionSection() {
		return screen.getByTestId('section-function');
	}

	it('renders the function unit between the degree lesson and the dominant lesson', () => {
		renderPage();
		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="section-"]')
		).map((element) => element.dataset.testid);

		expect(sections.indexOf('section-function')).toBeGreaterThan(
			sections.indexOf('section-anchor')
		);
		expect(sections.indexOf('section-function')).toBeLessThan(sections.indexOf('section-dominant'));
	});

	it('names all three functions, maps each to real degrees, and ties them to the drill reveal', () => {
		renderPage();
		const text = functionSection().textContent ?? '';

		expect(text).toContain("Function is a chord's job in the key");
		expect(text).toContain('Tonic is home: I, with iii and vi');
		expect(text).toContain('Subdominant has stepped out the door: ii and IV');
		expect(text).toContain('Dominant is the pull back: V, and viiø7 with it');
		// The exact string ProgressionDrill reveals, so the connection is explicit.
		expect(text).toContain('FUNCTION: SUBDOMINANT');
	});

	it('explains why ii V I is the jazz sentence, and hands the tritone to the dominant lesson', () => {
		renderPage();
		const text = functionSection().textContent ?? '';

		expect(text).toContain('approach, push, arrive');
		expect(text).toContain('roots fall by fifths, D to G to C');
		// The tritone mechanism is NOT re-explained here: the dominant lesson
		// already does it well, so this unit points at it instead.
		expect(text).toContain('a tritone resolving, which the next lesson takes apart');
		expect(text).not.toMatch(/leans up to C/);
	});

	it('shows the sentence as numeral-over-symbol for all three bars', () => {
		renderPage();
		const row = screen.getByTestId('jazz-sentence-row');

		expect(
			Array.from(row.querySelectorAll('.chord-glyph__text')).map((node) => node.textContent)
		).toEqual(['Dm7', 'G7', 'Cmaj7']);
		for (const roman of ['ii', 'V', 'I']) {
			expect(within(row).getByText(roman)).toBeInTheDocument();
		}
	});

	it('plays the three bars in order from one Hear control', async () => {
		vi.useFakeTimers();
		try {
			renderPage();
			await fireEvent.click(screen.getByRole('button', { name: 'Hear ii V I' }));

			expect(playChord).toHaveBeenCalledWith(['D', 'F', 'A', 'C']);
			vi.advanceTimersByTime(800);
			expect(playChord).toHaveBeenCalledWith(['G', 'B', 'D', 'F']);
			vi.advanceTimersByTime(800);
			expect(playChord).toHaveBeenCalledWith(['C', 'E', 'G', 'B']);
		} finally {
			vi.useRealTimers();
		}
	});

	it('renders the whole unit in French, using the app French function words', () => {
		setLocale('fr');
		renderPage();
		const text = functionSection().textContent ?? '';

		expect(text).toContain("La fonction, c'est le rôle d'un accord dans le ton");
		expect(text).toContain('La tonique est à la maison');
		expect(text).toContain('La sous-dominante est sortie');
		expect(text).toContain('La dominante');
		// The FR string ProgressionDrill actually reveals.
		expect(text).toContain('FONCTION : SOUS-DOMINANTE');
		expect(text).toContain("c'est la phrase du jazz");
	});
});

/**
 * Unit 11 (guide tones and voice leading, guided-path): reachable from
 * /learn as a peer of the other units, right after the function/ii-V-I
 * material it depends on. Full content coverage (per-bar captions, audio
 * sequencing, no-card/no-answer-event, French parity) lives in
 * theoryLessons.test.ts; this is the hub-level reachability smoke test.
 */
describe('/learn: guide tones and voice leading is reachable, right after function/ii-V-I (unit 11)', () => {
	it('renders between the function section and the dominant lesson', () => {
		renderPage();
		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="section-"]')
		).map((element) => element.dataset.testid);

		expect(sections.indexOf('section-guide-tones')).toBeGreaterThan(
			sections.indexOf('section-function')
		);
		expect(sections.indexOf('section-guide-tones')).toBeLessThan(
			sections.indexOf('section-dominant')
		);
	});

	it('states the falling-half-step mechanism and points at the shell voicing drill, creating no card', () => {
		renderPage();
		const section = screen.getByTestId('section-guide-tones');
		const text = section.textContent ?? '';

		expect(text).toContain('falls a half step to become the 3rd of the next');
		expect(text).toContain('The shell voicing drill on /practice already grades this');
	});
});
