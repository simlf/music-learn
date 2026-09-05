import { describe, expect, it } from 'vitest';
import { tags } from '@lezer/highlight';
import { strudelHighlightSpecs } from './strudelHighlight';

/**
 * Checks the one thing worth asserting about the highlight mapping in
 * isolation: every rule resolves to an app CSS custom property, never a
 * hardcoded hex - the whole point of restyling away from a default theme.
 * `HighlightStyle.style()` itself only returns an opaque generated class
 * name, not these colours, which is why the plain spec array is tested
 * directly rather than through CodeMirror's own API (see StrudelEditor's
 * own test for the rendered result).
 */
describe('strudelHighlightSpecs', () => {
	it('gives the string tag (the mini-notation itself) the vermilion accent', () => {
		const rule = strudelHighlightSpecs.find(
			(r) => r.tag === tags.string || (Array.isArray(r.tag) && r.tag.includes(tags.string))
		);
		expect(rule?.color).toBe('var(--color-vermilion)');
	});

	it('never hardcodes a colour', () => {
		for (const rule of strudelHighlightSpecs) {
			expect(rule.color).toMatch(/^var\(--color-[a-z-]+\)$/);
		}
	});
});
