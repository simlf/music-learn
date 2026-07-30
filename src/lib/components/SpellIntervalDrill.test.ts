import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpellIntervalDrill from './SpellIntervalDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for SpellIntervalDrill (unit 4's proof drill): the
 * letter+accidental answer path, the two SEPARATE grading branches (the
 * flagship enharmonic-letter-trap versus a plain pitch miss), the round
 * (all six SPELLING_DRILL_INTERVALS entries, shuffled), and full en/fr
 * copy. Mirrors PracticeIntervalDrill.test.ts's audio-mock harness.
 *
 * With Math.random pinned to a constant 0, `generateSpellingQuestion`'s root
 * draw always resolves to ROOTS[0] = 'C', and the component's own
 * Fisher-Yates shuffle of the fixed 6-entry pool resolves deterministically
 * to ['m3', 'A4', 'd5', 'd7', 'M6', 'A2'] (worked by hand against the exact
 * algorithm and cross-checked by the first test below), so the FIRST
 * question is always "Spell the minor 3rd above C" (expects E, flat).
 */

const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: vi.fn(),
	ensureAudioReady: () => ensureAudioReadyMock()
}));

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

beforeEach(() => {
	vi.spyOn(Math, 'random').mockReturnValue(0);
});

describe('SpellIntervalDrill: deterministic first question', () => {
	it('opens on "Spell the minor 3rd above C" with no answer picked and Check disabled', () => {
		render(SpellIntervalDrill);

		const prompt = screen.getByTestId('spell-prompt');
		expect(prompt.textContent).toContain('Spell the');
		expect(prompt.textContent).toContain('minor 3rd');
		expect(prompt.textContent).toContain('above');
		expect(prompt.textContent).toContain('C');

		expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
	});

	it('picking a letter enables Check; picking the accidental too does not auto-submit', async () => {
		render(SpellIntervalDrill);

		await fireEvent.click(screen.getByRole('button', { name: 'E' }));
		expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();

		await fireEvent.click(screen.getByRole('button', { name: '♭' }));
		expect(screen.queryByTestId('spell-feedback')).not.toBeInTheDocument();
	});
});

describe('SpellIntervalDrill: grading, the letter check kept separate from the pitch check', () => {
	async function answer(letter: string, accidental: string) {
		render(SpellIntervalDrill);
		await fireEvent.click(screen.getByRole('button', { name: letter }));
		if (accidental !== '') {
			await fireEvent.click(screen.getByRole('button', { name: accidental }));
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	}

	it('E + flat (E♭) is fully correct for "minor 3rd above C"', async () => {
		await answer('E', '♭');

		expect(screen.getByTestId('spell-correct-line')).toBeInTheDocument();
		expect(screen.queryByTestId('spell-incorrect-line')).not.toBeInTheDocument();
		expect(screen.getByTestId('spell-answer-line').textContent).toContain('E♭');
		// The reveal always plays the true root+answer pair, right or wrong.
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭']);
	});

	/**
	 * The flagship enharmonic trap (per the owning brief): the SAME key as the
	 * correct answer (D♯ and E♭ are both chroma 3), but the WRONG letter. This
	 * must grade incorrect and must name the letter mismatch explicitly,
	 * proving the drill does not fall back to a whole-key match.
	 */
	it('D + sharp (D♯), the enharmonic twin of E♭, is marked incorrect and names the letter trap', async () => {
		await answer('D', '♯');

		expect(screen.getByTestId('spell-incorrect-line')).toBeInTheDocument();
		expect(screen.queryByTestId('spell-correct-line')).not.toBeInTheDocument();
		const trap = screen.getByTestId('spell-letter-trap-line');
		expect(trap.textContent).toContain('D');
		expect(trap.textContent).toContain('A2');
		expect(trap.textContent).toContain('E');
		expect(trap.textContent).toContain('m3');
		expect(screen.queryByTestId('spell-pitch-contrast-line')).not.toBeInTheDocument();
		// Still reveals and sounds the TRUE answer, not the user's pick.
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭']);
	});

	it('right letter (E), wrong accidental (natural instead of flat): a plain pitch miss, not the letter-trap branch', async () => {
		await answer('E', '');

		expect(screen.getByTestId('spell-incorrect-line')).toBeInTheDocument();
		expect(screen.queryByTestId('spell-letter-trap-line')).not.toBeInTheDocument();
		const contrast = screen.getByTestId('spell-pitch-contrast-line');
		expect(contrast.textContent).toContain('Half steps');
		expect(contrast.textContent).toContain('M3');
		expect(contrast.textContent).toContain('m3');
	});

	it('both wrong (an unrelated letter and accidental) is a plain pitch miss', async () => {
		await answer('G', '');

		expect(screen.getByTestId('spell-incorrect-line')).toBeInTheDocument();
		expect(screen.queryByTestId('spell-letter-trap-line')).not.toBeInTheDocument();
		expect(screen.getByTestId('spell-pitch-contrast-line')).toBeInTheDocument();
	});
});

describe('SpellIntervalDrill: round progression', () => {
	it('Next advances to a new question and resets the picked letter/accidental', async () => {
		render(SpellIntervalDrill);
		await fireEvent.click(screen.getByRole('button', { name: 'E' }));
		await fireEvent.click(screen.getByRole('button', { name: '♭' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(screen.queryByTestId('spell-feedback')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
		// The second shuffled entry (worked by hand) is 'A4': augmented 4th.
		expect(screen.getByTestId('spell-prompt').textContent).toContain('augmented 4th');
	});

	it('completing all six questions shows the round-complete message, not a seventh question', async () => {
		render(SpellIntervalDrill);
		const answers: Array<[string, string]> = [
			['E', '♭'], // m3
			['F', '♯'], // A4
			['G', '♭'], // d5
			['B', '♭♭'], // d7
			['A', ''], // M6
			['D', '♯'] // A2
		];
		for (const [letter, accidental] of answers) {
			await fireEvent.click(screen.getByRole('button', { name: letter }));
			if (accidental !== '') {
				await fireEvent.click(screen.getByRole('button', { name: accidental }));
			}
			await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(screen.getByTestId('spell-round-complete')).toBeInTheDocument();
		expect(screen.queryByTestId('spell-prompt')).not.toBeInTheDocument();
	});
});

describe('SpellIntervalDrill: French locale', () => {
	it('renders the prompt, labels and feedback in French', async () => {
		setLocale('fr');
		render(SpellIntervalDrill);

		const prompt = screen.getByTestId('spell-prompt');
		expect(prompt.textContent).toContain('Écris la');
		expect(prompt.textContent).toContain('tierce mineure');
		expect(screen.getByText('Lettre')).toBeInTheDocument();
		expect(screen.getByText('Altération')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'D' }));
		await fireEvent.click(screen.getByRole('button', { name: '♯' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Vérifier' }));

		expect(screen.getByTestId('spell-incorrect-line')).toHaveTextContent('Pas tout à fait');
		expect(screen.getByTestId('spell-letter-trap-line').textContent).toContain('épelle');
	});
});
