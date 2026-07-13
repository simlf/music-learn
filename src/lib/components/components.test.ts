import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PianoKeyboard from './PianoKeyboard.svelte';
import RecentChipRow from './RecentChipRow.svelte';
import { spellChord } from '$lib/theory/chord';

describe('PianoKeyboard', () => {
	it('highlights the four Cm7 spelled notes with their interval role colors and dual naming', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, { notes });

		// Root: C
		const rootLetter = screen.getAllByText('C')[0];
		expect(rootLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--root');

		// Third: E♭
		const thirdLetter = screen.getAllByText('E♭')[0];
		expect(thirdLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--third');

		// Fifth: G
		const fifthLetter = screen.getAllByText('G')[0];
		expect(fifthLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--fifth');

		// Seventh: B♭
		const seventhLetter = screen.getAllByText('B♭')[0];
		expect(seventhLetter.closest('.piano-keyboard__key')).toHaveClass(
			'piano-keyboard__key--seventh'
		);

		// Dual naming: solfège present alongside letters (degree-based, accidental-agnostic)
		expect(screen.getByText('Do')).toBeInTheDocument();
		expect(screen.getByText('Mi')).toBeInTheDocument();
		expect(screen.getByText('Sol')).toBeInTheDocument();
		expect(screen.getByText('Si')).toBeInTheDocument();

		// Exactly four highlighted keys (root/third/fifth/seventh classes)
		const highlighted = document.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('renders a display-only keyboard with no click or keydown handlers', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).not.toBeNull();
		expect(keyboard?.getAttribute('onclick')).toBeNull();
		expect(keyboard?.getAttribute('onkeydown')).toBeNull();
	});

	it('non-regression: omitting interactive keeps keys free of button semantics', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).toHaveAttribute('role', 'img');
		expect(keyboard).toHaveAttribute('aria-label', 'Piano keyboard, two octaves');

		const keys = container.querySelectorAll('.piano-keyboard__key');
		expect(keys.length).toBeGreaterThan(0);
		keys.forEach((key) => {
			expect(key.getAttribute('role')).not.toBe('button');
			expect(key.getAttribute('aria-pressed')).toBeNull();
			expect(key.getAttribute('tabindex')).toBeNull();
		});

		// Highlighted key still renders its NoteLabel exactly as before.
		const rootLetter = screen.getAllByText('C')[0];
		expect(rootLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--root');
	});

	it('interactive mode: clicking a white key calls onToggle with its letter', async () => {
		const onToggle = vi.fn();
		const { container } = render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set<string>(),
			onToggle
		});

		// Two-octave keyboard repeats C three times; any instance is a valid target.
		const [cKey] = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.click(cKey);

		expect(onToggle).toHaveBeenCalledWith('C');
		expect(container).toBeTruthy();
	});

	it('interactive mode: aria-pressed and aria-label reflect selected state', () => {
		render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set(['C']),
			onToggle: () => {}
		});

		const selectedKeys = screen.getAllByRole('button', { name: 'C key, selected' });
		expect(selectedKeys.length).toBeGreaterThan(0);
		selectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'true'));

		const unselectedKeys = screen.getAllByRole('button', { name: 'D key' });
		expect(unselectedKeys.length).toBeGreaterThan(0);
		unselectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'false'));
	});

	it('interactive mode: Enter and Space keydown both toggle a key', async () => {
		const onToggle = vi.fn();
		render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set<string>(),
			onToggle
		});

		const [cKey] = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.keyDown(cKey, { key: 'Enter' });
		expect(onToggle).toHaveBeenCalledWith('C');

		onToggle.mockClear();
		await fireEvent.keyDown(cKey, { key: ' ' });
		expect(onToggle).toHaveBeenCalledWith('C');
	});
});

describe('RecentChipRow', () => {
	it('shows a ghost chip per recent symbol with a re-lookup aria-label', () => {
		render(RecentChipRow, { recent: ['Cm7', 'Fmaj7'], onselect: () => {} });

		const chips = screen.getAllByTestId('recent-chip');
		expect(chips).toHaveLength(2);
		expect(screen.getByText('Cm7')).toBeInTheDocument();
		expect(screen.getByText('Fmaj7')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Look up Cm7 again' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Look up Fmaj7 again' })).toBeInTheDocument();
	});

	it('renders nothing when recent is empty', () => {
		const { container } = render(RecentChipRow, { recent: [], onselect: () => {} });

		expect(container.querySelector('[data-testid="recent-chip-row"]')).toBeNull();
		expect(container.textContent?.trim()).toBe('');
	});

	it('calls onselect with the clicked chip symbol', async () => {
		const onselect = vi.fn();
		render(RecentChipRow, { recent: ['Cm7', 'Fmaj7'], onselect });

		await fireEvent.click(screen.getByRole('button', { name: 'Look up Fmaj7 again' }));

		expect(onselect).toHaveBeenCalledWith('Fmaj7');
	});
});
