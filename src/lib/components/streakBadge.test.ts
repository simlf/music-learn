import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StreakBadge from './StreakBadge.svelte';

describe('StreakBadge hero variant', () => {
	it('renders the numeral and the active (vermilion) class when count >= 1', () => {
		render(StreakBadge, { count: 5, variant: 'hero' });

		const badge = screen.getByTestId('streak-badge');
		expect(badge).toHaveTextContent('5');
		expect(badge.classList.contains('streak-badge--active')).toBe(true);
	});

	it('renders 0 in the ink (non-active) class when count is 0', () => {
		render(StreakBadge, { count: 0, variant: 'hero' });

		const badge = screen.getByTestId('streak-badge');
		expect(badge).toHaveTextContent('0');
		expect(badge.classList.contains('streak-badge--active')).toBe(false);
	});
});

describe('StreakBadge compact variant', () => {
	it('renders text containing "5 DAY STREAK" when count is 5', () => {
		render(StreakBadge, { count: 5, variant: 'compact' });

		expect(screen.getByTestId('streak-badge')).toHaveTextContent('5 DAY STREAK');
	});

	it('renders nothing when count is 0', () => {
		render(StreakBadge, { count: 0, variant: 'compact' });

		expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
	});

	it('renders nothing when loading is true, regardless of count', () => {
		render(StreakBadge, { count: 5, variant: 'compact', loading: true });

		expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
	});
});
