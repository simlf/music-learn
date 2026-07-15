import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';

/**
 * The shared keyboard dock's registration seam (Scope Decision 1: "same
 * keyboard, relocated"). Every page that owns a playable keyboard registers
 * its single `keyboard` snippet (plus an optional below-keys `register`
 * line) with the dock on mount, and clears it on unmount. The dock
 * (KeyboardDock, Plan 02) renders whichever config is currently registered.
 *
 * No DOM, no audio, no localStorage here - purely the context plumbing.
 */

/** A page's single relocated keyboard, handed off to the shared dock. */
export interface DockKeyboardConfig {
	/** Identity token so `clear` only ever removes the registration it owns. */
	token: symbol;
	/** The page's playable keyboard markup, rendered by the dock. */
	keyboard: Snippet;
	/** Optional below-keys register line (inspectable surfaces only). */
	register?: Snippet;
	/**
	 * True when this docked keyboard is the sole answer-input surface for the
	 * current flow (Drills construction, BuildSession Mode C,
	 * ScaleKeyboardDrill, RecallSession Mode A). The dock never hides an
	 * input-required surface: it ignores the persisted collapsed state and
	 * suppresses the collapse handle, so a user who collapsed the dock on a
	 * passive page can't land on an unanswerable question with no visible
	 * keys (WR-01). Inspect-only surfaces (Lookup, Theory, identification,
	 * hear-name) omit it and keep the normal collapse handle.
	 */
	inputRequired?: boolean;
}

export interface DockRegistry {
	readonly current: DockKeyboardConfig | null;
	register(config: DockKeyboardConfig): void;
	clear(token: symbol): void;
}

/**
 * Creates the dock's registry: a single current config plus register/clear.
 * `register` always wins (last writer wins). `clear(token)` only blanks
 * `current` when `token` matches the currently registered config's token,
 * so a page unmounting after a newer page already registered can never
 * clobber that newer registration (T-15-03).
 */
export function createDockRegistry(): DockRegistry {
	// $state.raw (not $state) keeps assigned configs by reference: $state
	// would deep-proxy the object, breaking the identity equality
	// (`current === cfg`) that clear()'s token comparison and every
	// registering page rely on. Top-level reassignment still triggers
	// reactivity; the config's contents (an opaque Snippet) never need
	// fine-grained tracking anyway.
	let current = $state.raw<DockKeyboardConfig | null>(null);

	return {
		get current() {
			return current;
		},
		register(config: DockKeyboardConfig) {
			current = config;
		},
		clear(token: symbol) {
			if (current?.token === token) current = null;
		}
	};
}

export const DOCK_CONTEXT_KEY = Symbol('gsd:keyboard-dock');

/** Sets the shared dock registry into context (called once, in the layout). */
export function setDockRegistry(registry: DockRegistry): void {
	setContext(DOCK_CONTEXT_KEY, registry);
}

/** Reads the shared dock registry from context (called by every page). */
export function getDockRegistry(): DockRegistry {
	return getContext<DockRegistry>(DOCK_CONTEXT_KEY);
}
