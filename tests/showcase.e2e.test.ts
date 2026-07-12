import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ShowcasePage from '../src/routes/showcase/+page.svelte';

describe('showcase e2e happy path', () => {
	it('typing Cm7 and clicking Show chord renders the spelled notes C, E♭, G, B♭', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		expect(screen.getByText('C')).toBeInTheDocument();
		expect(screen.getByText('E♭')).toBeInTheDocument();
		expect(screen.getByText('G')).toBeInTheDocument();
		expect(screen.getByText('B♭')).toBeInTheDocument();
	});
});
