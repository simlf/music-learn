<script module lang="ts">
	import type { IntervalInfo } from '$lib/theory/interval';

	/** What an inspect-mode tap reports: the tapped key, fully named, plus its interval from the current root. */
	export interface InspectPayload {
		/** Spelled letter with display glyphs; black keys use the enharmonic that reads simplest from the root. */
		letter: string;
		/** French solfège for the letter. */
		solfege: string;
		/** Playback octave derived from the key's position (4 for the first octave, 5 for the second). */
		octave: number;
		/** Interval from the current root (the `notes` entry with role 'root'), or null when no root is highlighted. */
		info: IntervalInfo | null;
		/** Whether the tapped key is one of the highlighted `notes`. */
		inChord: boolean;
	}
</script>

<script lang="ts">
	import { Note } from 'tonal';
	import NoteLabel from './NoteLabel.svelte';
	import { ensureAudioReady, playNote } from '$lib/audio/audio';
	import { intervalFromRoot, toAsciiAccidentals, transposeFrom } from '$lib/theory/interval';
	import { letterToSolfege } from '$lib/theory/solfege';
	import type { IntervalRole, SpelledNote } from '$lib/theory/types';
	import { gapsBetween } from '$lib/lookup/chordPresentation';
	import {
		assignNotesToKeys,
		blackKeysForOctaves,
		MIN_ONE_OCTAVE_WHITE_KEY_PX,
		minBoardWidthPx,
		octavesForWidth,
		shouldStackRows,
		splitBoardIntoRows,
		whiteLettersForOctaves,
		type BlackKeyPattern,
		type KeyCandidate
	} from './keyboardLayout';

	/**
	 * Print Shop piano keyboard. Renders a responsive C-to-C span: one octave
	 * (8 white keys) on phone-width viewports, two octaves (15 white keys) once
	 * enough width is available for every v1 chord's root/3rd/5th/7th to fit
	 * without wrapping (D-01). Matches spelled notes to keys by letter name,
	 * not MIDI number (UI-SPEC implementation note), and fills matched keys
	 * with their interval color, showing a NoteLabel (letter + solfege) on
	 * top. A chord that would run past the visible one-octave span wraps its
	 * overflow notes back into the octave as pitch classes, still tagged with
	 * their interval role (D-02, via keyboardLayout's assignNotesToKeys).
	 *
	 * Display-only by default (Phase 1 showcase, Phase 2 lookup): no
	 * click/keydown handlers, no button semantics. Passing `interactive`
	 * (Phase 3 / INPUT-02) opts every key into click + Enter/Space toggling,
	 * gated entirely behind the `interactive` prop so the pre-existing
	 * display-only render stays byte-identical when it is omitted. Selection
	 * is letter-based and octave-agnostic, so it survives an octave-count
	 * change uninterrupted (D-03).
	 *
	 * Interactive keys also get a phone-touch press cue: a pointerdown sets a
	 * transient `--pressed` state (brief scale/shade, additive to interval-
	 * color/wrong fills and the selected hatch, disabled under
	 * prefers-reduced-motion) and fires a feature-detected `navigator.vibrate`
	 * pulse where supported (D-11). The keyboard surface also carries
	 * gesture-hygiene styling (touch-action, -webkit-touch-callout,
	 * user-select) so taps register cleanly without double-tap zoom or the
	 * long-press callout/selection menu (D-12).
	 */
	interface Props {
		/** Spelled notes (from the theory engine) to highlight on the keyboard. */
		notes: SpelledNote[];
		/** Opt into clickable/keyboard-toggleable keys (default false, Phase 3). */
		interactive?: boolean;
		/** Letters currently toggled on by the user; only meaningful when `interactive`. */
		selected?: Set<string>;
		/** Called with a key's letter when the user toggles it (click or Enter/Space). */
		onToggle?: (letter: string) => void;
		/**
		 * Called on pointerdown with the key's letter (sharp spelling for black
		 * keys, e.g. "C♯") and its octave number (base octave 4, matching the
		 * audio engine's voicing), fired beside the existing haptic pulse.
		 * Interactive-only, like every other pointer handler. Audio-free since
		 * the G1 UAT fix - the key's own touch sound is now intrinsic to every
		 * active mode's activation choke point (`playKeyTouch`), not routed
		 * through this hook. Omitting it leaves rendering byte-identical.
		 */
		onPress?: (letter: string, octave: number) => void;
		/**
		 * Explicit octave-count override (mainly a test seam). When omitted, the
		 * component self-measures its available width via ResizeObserver and
		 * derives the octave count from it (2 when a full two-octave span fits,
		 * else 1 - D-01, D-04).
		 */
		octaves?: 1 | 2;
		/**
		 * Letters the user played that are NOT part of `notes` (Sketch 001
		 * Variant A wrong-answer feedback). Defined (even as an empty set) is
		 * the feedback-mode signal: matching keys get a gray wrong-fill + a ✕
		 * mark instead of a NoteLabel, and every interval-colored/wrong key
		 * gets the stamp-in reveal animation. Undefined leaves display/
		 * interactive mode byte-identical to before this prop existed.
		 */
		wrongLetters?: Set<string>;
		/**
		 * Tap-to-inspect mode (Track C): tapping any key plays its note (via
		 * the $lib/audio/audio contract) and fires `onInspect` with the key's
		 * spelling, solfège, octave, and interval from the current root.
		 * Mutually exclusive with `interactive` (interactive wins if both are
		 * ever passed); omitted keeps the display-only render byte-identical,
		 * following the component's gated-prop compatibility contract.
		 */
		inspectable?: boolean;
		/** Called with the tapped key's InspectPayload; only meaningful when `inspectable`. */
		onInspect?: (payload: InspectPayload) => void;
		/**
		 * Interval badges (sketch 003): when true, every highlighted key shows a
		 * small corner badge with its interval from the root (R, m3, P5, m7), so
		 * the interval each note plays is readable directly on the keyboard.
		 * Additive and gated; omitting it leaves the render byte-identical.
		 */
		showIntervalBadges?: boolean;
		/**
		 * Tap-to-construct mode (Phase 12, D-06): every key becomes tappable -
		 * whether or not it is one of the highlighted `notes` - and fires
		 * `onConstructTap` with the tapped key's own letter (sharp spelling for
		 * black keys, matching onPress/onToggle's existing convention) and its
		 * key-position octave. Since the G1 UAT fix, a construct tap ALSO
		 * sounds its own key-touch note (via `playKeyTouch`, the same choke
		 * point interactive mode uses) before `onConstructTap` fires - correct
		 * or wrong, every tap sounds exactly once; the caller still owns
		 * correct/wrong VISUAL feedback (flash/hint), just not the base
		 * key-touch sound. Mutually exclusive with `inspectable` (constructable
		 * wins when both are passed without interactive); `interactive` still
		 * wins over both. Omitted keeps the display-only render byte-identical,
		 * following the component's gated-prop compatibility contract.
		 */
		constructable?: boolean;
		/** Called with the tapped key's letter and octave; only meaningful when `constructable`. */
		onConstructTap?: (letter: string, octave: number) => void;
		/**
		 * Transient, octave-specific wrong-tap indicator (Phase 12): when set,
		 * only the exact key whose own letter+octave match gets the wrong-fill
		 * class - a same-letter duplicate key at a different octave is
		 * unaffected. Distinct from `wrongLetters` (a permanent-per-reveal,
		 * letter-only Set from the drills feedback surface) - the two props and
		 * their rendering paths stay fully separate.
		 */
		flashWrongKey?: { letter: string; octave: number } | null;
		/**
		 * Bump this number to re-trigger a one-shot `.pulse-once` animation
		 * cycle (shared keyframe, app.css) on every currently role-lit key
		 * (Phase 16, HEAR-01) — the reveal's chord-strike pulse, synced to
		 * `playChord`. Retriggers even while the component stays mounted: each
		 * new value restarts the cycle, mirroring `flashWrongKey`'s transient-
		 * signal shape. Omitting it leaves every prior render byte-identical
		 * (no `.pulse-once` class is ever applied).
		 */
		pulseToken?: number;
		/**
		 * { letter, octave } keys whose already-role-lit key should sit dimmed
		 * (`--pending`, opacity 0.28) during the study-mode arpeggio roll
		 * (Phase 16, HEAR-02) — each chord/scale tone stays pending until its
		 * own tick sounds. Octave-specific (mirrors `flashWrongKey`'s own
		 * letter+octave keying), so a same-letter duplicate key at a different
		 * octave (e.g. a scale's octave-up tonic) is unaffected unless its OWN
		 * { letter, octave } is listed — it un-dims one octave at a time, never
		 * both together. Only ever dims a key that already carries an
		 * interval-role fill; a letter with no role in `notes` is unaffected
		 * even if listed here. Omitting it leaves rendering byte-identical.
		 */
		pendingKeys?: { letter: string; octave: number }[];
		/**
		 * { letter, octave, marker } entries for "optional but allowed" notes
		 * (Phase 25, sketch 019 synthesis, SK-019): the sketch-019 shell-voicing
		 * subtraction stage's root/fifth droppable notes. A matching key gets an
		 * ink-hatch-at-low-opacity treatment plus a tiny mono marker ("R"/"5"),
		 * deliberately distinct from `wrongLetters`' gray ✕ (which reads as an
		 * error) — a ghost key means "allowed but not required," not "wrong."
		 * Role-gated like `selectedClass`/`pendingClass` (never applies to a key
		 * that already carries an interval-role fill) and octave-specific like
		 * `flashWrongKey`/`pendingKeys` (a same-letter duplicate key at a
		 * different octave is unaffected). Entries are matched to keys by
		 * CHROMA + octave, never by letter string, so a flat-spelled entry
		 * (e.g. "E♭") lands on the same black key as its sharp spelling
		 * ("D♯"). Omitting it leaves rendering byte-identical (no
		 * `.piano-keyboard__key--ghost` class or `data-ghost` attribute is
		 * ever applied).
		 */
		ghostKeys?: { letter: string; octave: number; marker: string }[];
		/**
		 * The single key that should carry the bass ink-ring + "B" badge
		 * (Phase 35, INV-01): matched by CHROMA + octave, like `ghostKeys`, so
		 * an enharmonic spelling still lands on the right key. UNLIKE
		 * `ghostKeys`/`selectedClass`/`pendingClass`, this is NOT gated on
		 * `!role` — the bass ring must render whether the matching key already
		 * carries an interval-role fill (reveal state), a ghost hatch (hint
		 * state), or neither (rung-1-only hint state), since "which of the 4
		 * already-colored notes is the bass" is exactly the thing being taught.
		 * Omitting it (undefined/null) leaves rendering byte-identical to
		 * today.
		 */
		bassHint?: { letter: string; octave: number } | null;
		/**
		 * Semitone tick rail above the board (design handoff "keyboard-native
		 * interval display", sketch 1d refined as 2b): for each consecutive pair
		 * of highlighted `notes`, a line spanning the two keys' x-centers, a
		 * `M3 · 4`-style label above its midpoint, and one tick per
		 * intervening semitone. Answers "how far apart are these two notes"
		 * where the notes actually are, complementing `showIntervalBadges`'
		 * root-relative corner badges (which answer "what degree is this note").
		 * On a stacked (two-row phone) board, or wherever a gap's geometry
		 * cannot be drawn honestly (a wrapped/backwards gap on a one-octave
		 * board), the rail is suppressed for that gap and a small `+m3`-style
		 * badge renders on the gap's arrival key instead (quick-260804-1uq),
		 * so no gap is ever silently dropped. Additive and gated; omitting it
		 * leaves the render byte-identical.
		 */
		showIntervalTicks?: boolean;
	}

	let {
		notes,
		interactive = false,
		selected,
		onToggle,
		onPress,
		octaves,
		wrongLetters,
		inspectable = false,
		onInspect,
		showIntervalBadges = false,
		constructable = false,
		onConstructTap,
		flashWrongKey,
		pulseToken,
		pendingKeys,
		ghostKeys,
		bassHint,
		showIntervalTicks = false
	}: Props = $props();

	/** Interval-from-root short label for a highlighted note (sketch 003). "R" for the root. */
	function intervalBadgeFor(note: SpelledNote | undefined): string {
		if (!showIntervalBadges || !note || rootLetter === undefined) return '';
		return intervalFromRoot(rootLetter, note.letter).short;
	}

	/**
	 * Arrival-key gap badge text (`showIntervalTicks`, quick-260804-1uq): the
	 * `+m3`/`+M3`/`+P4`-style label for a gap the rail could not draw, keyed
	 * by the SAME `SpelledNote` object `noteAssignment` uses - never by key
	 * index, since a stacked row's `BlackKey` carries only a row-relative
	 * `position` and no absolute black-key index.
	 */
	function gapBadgeFor(note: SpelledNote | undefined): string | undefined {
		return note ? gapBadges.get(note) : undefined;
	}

	/**
	 * Inspect mode is subordinate to interactive: the two never coexist
	 * (contract). Also subordinate to constructable - the two "tap-driven,
	 * non-toggle" modes are never expected to be passed together in practice,
	 * but when they are, constructable wins (precedence choice, D-06).
	 */
	const inspecting = $derived(inspectable && !interactive && !constructable);
	/** Construct mode (Phase 12): subordinate to interactive, wins over inspectable. */
	const constructing = $derived(constructable && !interactive);
	/** Keys carry button semantics and pointer handlers in any active mode. */
	const keysActive = $derived(interactive || inspecting || constructing);

	let containerEl: HTMLDivElement | undefined = $state();
	let measuredWidth: number | undefined = $state(undefined);
	/**
	 * Letter+octave of the key currently pressed (pointer down), for the D-11
	 * press cue. Interactive-only. Keyed by BOTH letter and octave (IN-01,
	 * mirroring `flashWrongKey`'s own letter+octave keying) so a same-letter
	 * duplicate key at a different octave never presses in lockstep - this
	 * matters once `constructable` mode's forced two-octave keyboard makes
	 * octave-repeated pitch classes a routine occurrence, not a rare one.
	 */
	let pressedKey: { letter: string; octave: number } | undefined = $state(undefined);

	// Always self-measure, even when `octaves` is explicitly provided. The two
	// concerns are separate: an explicit `octaves` fixes the SPAN (a construction
	// drill wants both octaves regardless of screen), while the measured width
	// decides only whether that span renders as one row or wraps to two. Gating
	// the observer on `octaves === undefined` (as this did) left `measuredWidth`
	// permanently undefined for every caller that pins its span - which is every
	// `octaves={2}` drill - so two-row stacking could never engage there and the
	// board fell back to scrolling sideways on a phone.
	//
	// Reads the container's width and never writes anything back that affects the
	// observed element's size, so there is no observe -> resize -> observe
	// feedback loop (T-09-01). Guarded for jsdom/older browsers lacking
	// ResizeObserver: falls back to the default of 2 unstacked octaves (matches
	// every pre-existing display/interactive test).
	$effect(() => {
		if (!containerEl) return;

		// Seed the measurement synchronously from the bound element. A
		// ResizeObserver alone is not enough here: the callback is asynchronous,
		// and `stacked` gates the very markup whose width the observer reports, so
		// relying on the callback left `measuredWidth` undefined through the render
		// that actually decides single-vs-two-row - the board shipped unstacked and
		// scrolled sideways on a phone. Reading `clientWidth` up front makes the
		// first render already correct; the observer below only tracks later
		// changes (rotation, resize, container reflow).
		const seed = containerEl.clientWidth;
		if (seed > 0) measuredWidth = seed;

		if (typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				measuredWidth = entry.contentRect.width;
			}
		});
		observer.observe(containerEl);

		return () => observer.disconnect();
	});

	const effectiveOctaves: 1 | 2 = $derived(
		octaves ?? (measuredWidth !== undefined ? octavesForWidth(measuredWidth) : 2)
	);

	function toggleKey(letter: string) {
		onToggle?.(letter);
	}

	function handleKeydown(event: KeyboardEvent, activate: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			activate();
		}
	}

	/** Letter of the highlighted note tagged 'root': the inspect mode reference point. */
	const rootLetter = $derived(notes.find((note) => note.role === 'root')?.letter);

	/** Plays the tapped key and reports its full naming + interval from the root (inspect mode). */
	function emitInspect(letter: string, octave: number, inChord: boolean) {
		playNote(`${toAsciiAccidentals(letter)}${octave}`);
		onInspect?.({
			letter,
			solfege: letterToSolfege(letter),
			octave,
			info: rootLetter !== undefined ? intervalFromRoot(rootLetter, letter) : null,
			inChord
		});
	}

	function inspectWhiteKey(key: WhiteKey) {
		const octave = octaveForWhiteIndex(key.index);
		emitInspect(key.note?.letter ?? key.letter, octave, key.note !== undefined);
	}

	function inspectBlackKey(key: BlackKey) {
		const octave = octaveForBlackAfterWhiteIndex(key.position - 1);
		// A highlighted key keeps its assigned enharmonic spelling; an
		// unhighlighted black key picks whichever spelling reads simplest
		// from the current root (A4 over C reads F♯, m3 over E♭ reads G♭).
		let letter = key.note?.letter;
		if (letter === undefined) {
			letter = key.sharpLetter;
			if (rootLetter !== undefined) {
				const picked = intervalFromRoot(rootLetter, {
					sharpLetter: key.sharpLetter,
					flatLetter: key.flatLetter
				});
				if (picked.short !== '') {
					letter = transposeFrom(rootLetter, picked.short) || key.sharpLetter;
				}
			}
		}
		emitInspect(letter, octave, key.note !== undefined);
	}

	/**
	 * Key-touch sound (G1 UAT fix, Track A): plays the tapped key's own pitch
	 * through the shared audio contract. Called from the activation choke
	 * point below for `interactive` and `constructing` modes only - never for
	 * `inspecting`, since `emitInspect` already plays the note itself and
	 * calling this too would double-play. Centralizing here (rather than each
	 * caller wiring its own audio-only `onPress`/`onConstructTap` handler)
	 * guarantees every key tap sounds exactly once, app-wide.
	 */
	function playKeyTouch(letter: string, octave: number): void {
		void ensureAudioReady();
		playNote(`${toAsciiAccidentals(letter)}${octave}`);
	}

	/**
	 * One activation path per key: toggle in interactive mode, report-only in
	 * construct mode (the caller still owns correct/wrong VISUAL feedback),
	 * inspect in inspect mode. Interactive and construct modes both sound the
	 * tapped key via `playKeyTouch` (G1); inspect mode already sounds it via
	 * `emitInspect`, so it is deliberately excluded here to avoid double-play.
	 */
	function activateWhiteKey(key: WhiteKey) {
		if (interactive) {
			const octave = octaveForWhiteIndex(key.index);
			playKeyTouch(key.letter, octave);
			// Emit the pressed octave from the activation choke point too, not just
			// from handlePointerDown (WR-01): Enter/Space activation routes through
			// here without ever firing pointerdown, so keyboard/AT users would
			// otherwise never record an octave and bass detection would degenerate
			// to "lowest chroma among selected letters."
			onPress?.(key.letter, octave);
			toggleKey(key.letter);
		} else if (constructing) {
			playKeyTouch(key.letter, octaveForWhiteIndex(key.index));
			onConstructTap?.(key.letter, octaveForWhiteIndex(key.index));
		} else inspectWhiteKey(key);
	}

	function activateBlackKey(key: BlackKey) {
		if (interactive) {
			const octave = octaveForBlackAfterWhiteIndex(key.position - 1);
			playKeyTouch(key.sharpLetter, octave);
			// See activateWhiteKey (WR-01): record the octave for keyboard/AT
			// activation, which never fires pointerdown.
			onPress?.(key.sharpLetter, octave);
			toggleKey(key.sharpLetter);
		} else if (constructing) {
			const octave = octaveForBlackAfterWhiteIndex(key.position - 1);
			playKeyTouch(key.sharpLetter, octave);
			onConstructTap?.(key.sharpLetter, octave);
		} else inspectBlackKey(key);
	}

	/**
	 * Feature-detected haptic pulse (D-11): a single short vibration on key
	 * press, only when the Vibration API exists (Android Chrome/Firefox).
	 * No-ops cleanly everywhere else (iOS Safari, desktop) - never throws.
	 */
	function triggerHapticPulse() {
		if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
			navigator.vibrate(10);
		}
	}

	/**
	 * Pointerdown press cue + haptic (D-11) + optional `onPress` hook.
	 * The press cue and haptic fire in either active mode (interactive or
	 * inspect); `onPress` stays interactive-only per its contract. Since the
	 * G1 UAT fix, the key's own touch SOUND no longer lives here - it fires
	 * from the activation choke point (`playKeyTouch`, on click/Enter/Space)
	 * for every active mode except inspect, which already sounds its note via
	 * `emitInspect`. `onPress` is now a plain, audio-free hook callers may use
	 * for anything else keyed to the pointerdown moment specifically. The
	 * octave is derived from key position (base octave 4, one per 7 white
	 * keys) so consumers can turn letter + octave into a concrete pitch.
	 */
	function handlePointerDown(letter: string, octave: number) {
		pressedKey = { letter, octave };
		triggerHapticPulse();
		if (interactive) onPress?.(letter, octave);
	}

	/** Base octave of the keyboard's leftmost C (matches the audio voicing's octave 4). */
	const BASE_OCTAVE = 4;

	/** Octave of a white key by index (a new octave starts every 7 white keys). */
	function octaveForWhiteIndex(index: number): number {
		return BASE_OCTAVE + Math.floor(index / 7);
	}

	/** Octave of a black key by the white-key index it follows. */
	function octaveForBlackAfterWhiteIndex(afterWhiteIndex: number): number {
		return BASE_OCTAVE + Math.floor(afterWhiteIndex / 7);
	}

	/** Clears the transient pressed state on release/cancel/leave (D-11). */
	function clearPressed(letter: string, octave: number) {
		if (pressedKey?.letter === letter && pressedKey?.octave === octave) pressedKey = undefined;
	}

	function keyAriaLabel(letter: string): string {
		return selected?.has(letter) ? `${letter} key, selected` : `${letter} key`;
	}

	function keyboardAriaLabel(octaveCount: 1 | 2): string {
		return octaveCount === 1 ? 'Piano keyboard, one octave' : 'Piano keyboard, two octaves';
	}

	const whiteLetters = $derived(whiteLettersForOctaves(effectiveOctaves));
	const blackKeyPatterns: BlackKeyPattern[] = $derived(blackKeysForOctaves(effectiveOctaves));

	const whiteKeyWidthPct = $derived(100 / whiteLetters.length);
	const blackKeyWidthPct = $derived(whiteKeyWidthPct * 0.6);

	interface WhiteKey {
		index: number;
		letter: string;
		leftPct: number;
		note: SpelledNote | undefined;
	}

	interface BlackKey {
		/** Fractional key position (afterWhiteIndex + 1) used for ascending-order comparison. */
		position: number;
		leftPct: number;
		sharpLetter: string;
		flatLetter: string;
		note: SpelledNote | undefined;
	}

	// $derived (not plain const): the key/note assignment must recompute when
	// `notes` or the effective octave count changes, or every lookup/relayout
	// after the first would keep the previous chord's highlights (the
	// component instance persists across result changes on the lookup page,
	// and across octave-count changes on rotation).
	const noteAssignment: Map<SpelledNote, KeyCandidate> = $derived(
		assignNotesToKeys(notes, whiteLetters, blackKeyPatterns)
	);

	function noteAtWhiteIndex(index: number): SpelledNote | undefined {
		for (const [note, candidate] of noteAssignment) {
			if (candidate.kind === 'white' && candidate.keyIndex === index) return note;
		}
		return undefined;
	}

	function noteAtBlackIndex(blackIndex: number): SpelledNote | undefined {
		for (const [note, candidate] of noteAssignment) {
			if (candidate.kind === 'black' && candidate.keyIndex === blackIndex) return note;
		}
		return undefined;
	}

	const whiteKeys: WhiteKey[] = $derived(
		whiteLetters.map((letter, index) => ({
			index,
			letter,
			leftPct: index * whiteKeyWidthPct,
			note: noteAtWhiteIndex(index)
		}))
	);

	const blackKeys: BlackKey[] = $derived(
		blackKeyPatterns.map(({ afterWhiteIndex, sharpLetter, flatLetter }, blackIndex) => ({
			position: afterWhiteIndex + 1,
			leftPct: (afterWhiteIndex + 1) * whiteKeyWidthPct - blackKeyWidthPct / 2,
			sharpLetter,
			flatLetter,
			note: noteAtBlackIndex(blackIndex)
		}))
	);

	/**
	 * Two-row wrap (replaces horizontal scrolling, LOCKED user decision):
	 * whenever the measured container width falls under the current span's
	 * fingertip floor, the board renders as two stacked mini-keyboards instead
	 * of one row scrolling sideways. `measuredWidth === undefined` (no
	 * ResizeObserver, e.g. jsdom, or the `octaves` prop overriding self-
	 * measurement) always renders unstacked, matching the component's existing
	 * "unmeasurable -> desktop-safe default" convention and keeping every
	 * pre-existing jsdom test byte-identical.
	 */
	const stacked = $derived(
		measuredWidth !== undefined && shouldStackRows(effectiveOctaves, measuredWidth)
	);

	/**
	 * The px floor handed to an UNSTACKED board's `min-width`. A TWO-octave span
	 * keeps the 44px fingertip floor (660px); a ONE-octave span drops to the
	 * lower `MIN_ONE_OCTAVE_WHITE_KEY_PX` floor (320px, the width below which
	 * its black keys would breach WCAG's 24px minimum) - 260730-q3f.
	 *
	 * Why the one-octave span is treated differently: it no longer wraps to two
	 * rows (`shouldStackRows`, since its split leaves a lone C on row 2), so a
	 * 352px floor inside a narrower container is exactly what clipped the
	 * keyboard off the screen - a board wider than its container either scrolls
	 * inside itself (top C hidden) or, where an ancestor grid/flex track takes
	 * its min-content width as a floor, drags the whole card past the viewport.
	 * At 320px and below the floor still wins and the wrapper still scrolls;
	 * every wider phone class now fits all 8 keys at once.
	 */
	const boardFloorPx = $derived(
		effectiveOctaves === 2
			? minBoardWidthPx(2)
			: minBoardWidthPx(1, MIN_ONE_OCTAVE_WHITE_KEY_PX)
	);

	/**
	 * One drawn entry of the tick rail (`showIntervalTicks`): the gap between
	 * two adjacent chord tones, already resolved to board-percentage geometry.
	 * Percentages (not px) because the board's own key `left`/`width` are
	 * percentages, so the rail stays aligned with the keys at every container
	 * width, including the scrolling min-width case.
	 */
	interface TickGap {
		/** Interval shorthand without the connective "+", e.g. "M3". */
		short: string;
		/** Half steps spanned; the rail draws `semitones - 1` intervening ticks. */
		semitones: number;
		/** Third gaps carry the M/m quality color; everything else goes dashed/hollow. */
		isThird: boolean;
		/** 'major' | 'minor' for a third, 'other' for every non-third gap. */
		quality: 'major' | 'minor' | 'other';
		fromPct: number;
		spanPct: number;
		midPct: number;
		ticksPct: number[];
		/** Span under ~60px: the label drops to 9px so neighboring labels do not collide. */
		narrow: boolean;
	}

	/**
	 * A highlighted note's x-center on the board, as a percentage of board
	 * width, or undefined when the note was never assigned a key.
	 *
	 * Reads the SAME `noteAssignment` map the keys themselves render from, so a
	 * flat-spelled or exotic-enharmonic note (assignNotesToKeys' chroma
	 * fallback) and a D-02-wrapped note both resolve to the key they actually
	 * rendered on - a second letter-to-key lookup here would silently disagree
	 * with the board for exactly those cases.
	 *
	 * White and black keys both resolve, per the handoff's black-key-endpoint
	 * requirement (a m3 landing on B♭ must draw to the black key's center). The
	 * black-key form collapses cleanly: its `leftPct` is
	 * `(afterWhiteIndex + 1) * whiteW - blackW / 2`, so its center is exactly
	 * `(afterWhiteIndex + 1) * whiteW`.
	 */
	function centerPctFor(note: SpelledNote): number | undefined {
		const candidate = noteAssignment.get(note);
		if (!candidate) return undefined;
		if (candidate.kind === 'white') {
			return candidate.keyIndex * whiteKeyWidthPct + whiteKeyWidthPct / 2;
		}
		const pattern = blackKeyPatterns[candidate.keyIndex];
		if (!pattern) return undefined;
		return (pattern.afterWhiteIndex + 1) * whiteKeyWidthPct;
	}

	/** Below this span (in CSS px) the label shrinks - see TickGap.narrow. */
	const NARROW_GAP_PX = 60;

	/**
	 * The tick rail's gaps, PLUS the arrival-key badges for the gaps the rail
	 * cannot draw (`showIntervalTicks`, quick-260804-1uq). Gap NAMING comes
	 * from `gapsBetween`, the same derivation `stackedThirdsFor` uses for the
	 * stacked-thirds row, so the keyboard and that row can never disagree
	 * about which gaps are thirds; only the GEOMETRY (and the drawn-vs-
	 * badged choice) is computed here.
	 *
	 * One walk produces both outputs so "never doubled" is structural, not a
	 * duplicated condition: every gap becomes EITHER a drawn rail entry OR a
	 * badge entry, never both, and a gap whose endpoint was never assigned a
	 * key becomes neither (there is no key to badge).
	 *
	 * - Bails to `{ gaps: [], badges: empty }` when `!showIntervalTicks` or
	 *   fewer than two notes. `stacked` is deliberately NOT part of this
	 *   bail - a stacked board is exactly where every gap needs a badge,
	 *   since a single absolutely-positioned line cannot cross a row break
	 *   that does not exist in the DOM.
	 * - On a STACKED board every gap becomes a badge (the rail stays empty
	 *   by construction, so the existing `intervalGaps.length > 0` rail gate
	 *   is unaffected).
	 * - On an UNSTACKED board, a gap draws on the rail when both endpoints
	 *   are placed and the second sits to the RIGHT of the first; otherwise
	 *   (an unplaced endpoint aside) it becomes a badge instead of being
	 *   silently dropped - this is the same backwards-line guard as before,
	 *   with the drop replaced by a badge. A drawn line would run backwards
	 *   and name a distance the board is not actually showing, which is
	 *   exactly the case a one-octave board hits once a note wraps back into
	 *   the span (D-02).
	 *
	 * Badges are keyed by the `SpelledNote` OBJECT (never by key index/kind):
	 * the `board` snippet renders stacked rows from `BlackKey` objects whose
	 * `position` is row-relative and carries no absolute black-key index, so
	 * an index key would silently miss every stacked black key. The note
	 * object is the same identity `noteAssignment` uses. If two undrawn gaps
	 * somehow arrived at the same physical key, the later `Map.set` wins
	 * (deterministic, and unreachable for a chord with distinct pitch
	 * classes).
	 */
	const railLayout: { gaps: TickGap[]; badges: Map<SpelledNote, string> } = $derived.by(() => {
		if (!showIntervalTicks || notes.length < 2) return { gaps: [], badges: new Map() };

		// The rail and the board share a width: the measured container, floored
		// at the board's own min-width (which is what the wrapper scrolls to
		// reach). Only used for the narrow-label px threshold - all positioning
		// is percentage-based.
		const boardWidthPx = Math.max(measuredWidth ?? 0, boardFloorPx);

		const drawn: TickGap[] = [];
		const badges = new Map<SpelledNote, string>();
		gapsBetween(notes).forEach((gap, index) => {
			const from = notes[index];
			const to = notes[index + 1];
			if (!noteAssignment.get(from) || !noteAssignment.get(to)) return;

			if (stacked) {
				badges.set(to, gap.label);
				return;
			}

			const fromPct = centerPctFor(from);
			const toPct = centerPctFor(to);
			if (fromPct === undefined || toPct === undefined || toPct <= fromPct) {
				badges.set(to, gap.label);
				return;
			}

			const spanPct = toPct - fromPct;
			const steps = gap.semitones;
			drawn.push({
				short: gap.short,
				semitones: steps,
				isThird: gap.isThird,
				quality: gap.isThird ? (gap.short.startsWith('M') ? 'major' : 'minor') : 'other',
				fromPct,
				spanPct,
				midPct: fromPct + spanPct / 2,
				ticksPct:
					steps > 1
						? Array.from({ length: steps - 1 }, (_, k) => fromPct + ((k + 1) * spanPct) / steps)
						: [],
				narrow: (spanPct / 100) * boardWidthPx < NARROW_GAP_PX
			});
		});
		return { gaps: drawn, badges };
	});

	const intervalGaps: TickGap[] = $derived(railLayout.gaps);
	const gapBadges: Map<SpelledNote, string> = $derived(railLayout.badges);

	interface KeyboardRowView {
		/** This row's own white keys, indexed locally (0-based within the row). */
		whiteKeys: WhiteKey[];
		/** This row's own black keys, indexed locally (0-based within the row). */
		blackKeys: BlackKey[];
		/** This row's own white-key-count-derived percentage widths. */
		whiteKeyWidthPct: number;
		blackKeyWidthPct: number;
	}

	/**
	 * Builds each stacked row's OWN white/black key view: local `leftPct`
	 * percentages computed from THAT row's white-letter count (7 for row 1, up
	 * to 8 for row 2), so each row independently satisfies the fingertip floor
	 * at the measured container width. Note lookup still goes through the
	 * single, unsplit `noteAssignment` map via each row's absolute index
	 * (`startWhiteIndex` offset for white keys, the row's own already-
	 * re-indexed `blackKeys` pattern plus that offset for black keys) - the
	 * assignment itself is never recomputed per row, only WHERE an
	 * already-assigned key is rendered changes.
	 */
	const rows: KeyboardRowView[] = $derived.by(() => {
		if (!stacked) return [];

		return splitBoardIntoRows(effectiveOctaves).map((row) => {
			const rowWhiteKeyWidthPct = 100 / row.whiteLetters.length;
			const rowBlackKeyWidthPct = rowWhiteKeyWidthPct * 0.6;

			const rowWhiteKeys: WhiteKey[] = row.whiteLetters.map((letter, localIndex) => {
				const absoluteIndex = row.startWhiteIndex + localIndex;
				return {
					index: absoluteIndex,
					letter,
					leftPct: localIndex * rowWhiteKeyWidthPct,
					note: noteAtWhiteIndex(absoluteIndex)
				};
			});

			const rowBlackKeys: BlackKey[] = row.blackKeys.map(
				({ afterWhiteIndex, sharpLetter, flatLetter }, localBlackIndex) => {
					const absoluteAfterWhiteIndex = afterWhiteIndex + row.startWhiteIndex;
					// The row's own black-key list was already re-indexed by
					// `splitBoardIntoRows` (afterWhiteIndex relative to the row),
					// but `noteAtBlackIndex` looks up by the FULL BOARD's black-key
					// array index, which for row 2 continues after row 1's 5
					// entries. Row 1's blackIndex is already absolute (starts at
					// 0); row 2's needs `firstRowWhiteCount`-worth of black keys
					// (always 5, one octave's pattern) added back.
					const absoluteBlackIndex =
						row.startWhiteIndex === 0
							? localBlackIndex
							: blackKeysForOctaves(effectiveOctaves).findIndex(
									(pattern) => pattern.afterWhiteIndex === absoluteAfterWhiteIndex
								);
					return {
						position: afterWhiteIndex + 1,
						leftPct: (afterWhiteIndex + 1) * rowWhiteKeyWidthPct - rowBlackKeyWidthPct / 2,
						sharpLetter,
						flatLetter,
						note: noteAtBlackIndex(absoluteBlackIndex)
					};
				}
			);

			return {
				whiteKeys: rowWhiteKeys,
				blackKeys: rowBlackKeys,
				whiteKeyWidthPct: rowWhiteKeyWidthPct,
				blackKeyWidthPct: rowBlackKeyWidthPct
			};
		});
	});

	/**
	 * Reveal chord-strike pulse (Phase 16, HEAR-01, T-16-03): flips off then
	 * on whenever `pulseToken` changes to a new value, so the shared
	 * `.pulse-once` class (app.css) is genuinely removed-then-re-added -
	 * forcing its keyframe animation to restart - rather than staying
	 * statically applied across bumps. The 0ms timer creates the DOM-commit
	 * boundary needed between the off write and the on write; the 200ms
	 * timer matches `.pulse-once`'s own animation duration and clears the
	 * flag once the cycle finishes. Any prior timer is cleared before
	 * scheduling a new one (mirrors this file's existing clearTimeout
	 * discipline), so a rapid re-bump or unmount can never pile up timers.
	 */
	let pulsing = $state(false);
	let pulseRestartTimer: ReturnType<typeof setTimeout> | undefined;
	let pulseOffTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const token = pulseToken;
		if (token === undefined) return;

		clearTimeout(pulseRestartTimer);
		clearTimeout(pulseOffTimer);
		pulsing = false;

		pulseRestartTimer = setTimeout(() => {
			pulsing = true;
			pulseOffTimer = setTimeout(() => {
				pulsing = false;
			}, 200);
		}, 0);

		return () => {
			clearTimeout(pulseRestartTimer);
			clearTimeout(pulseOffTimer);
		};
	});

	function roleClass(role: IntervalRole | undefined): string {
		return role ? `piano-keyboard__key--${role}` : '';
	}

	/**
	 * Selected/pending hatch treatment applies only in interactive mode, only
	 * when the key has no interval-role highlight (selected and
	 * revealed-correct are mutually exclusive per UI-SPEC), so a merely-
	 * selected key never fights with the four reserved interval-color fills.
	 */
	function selectedClass(letter: string, role: IntervalRole | undefined): string {
		return interactive && !role && selected?.has(letter) ? 'piano-keyboard__key--selected' : '';
	}

	/**
	 * Wrong-answer gray fill (Sketch 001 Variant A): only applies when this
	 * key has no interval-role highlight — revealed-correct notes always keep
	 * their interval color, never gray, so a wrong key and a colored key are
	 * mutually exclusive (mirrors `selectedClass`'s `!role` guard).
	 */
	function wrongClass(letter: string, role: IntervalRole | undefined): string {
		return !role && wrongLetters?.has(letter) ? 'piano-keyboard__key--wrong' : '';
	}

	/**
	 * Reveal stamp beat (shared `stamp-in` keyframe lives in app.css): fires on
	 * every interval-colored key and every wrong-fill key once feedback mode
	 * is on (`wrongLetters` defined, even as an empty set), so the whole
	 * reveal lands together.
	 */
	function stampedClass(letter: string, role: IntervalRole | undefined): string {
		if (wrongLetters === undefined) return '';
		return role || wrongLetters.has(letter) ? 'piano-keyboard__key--stamped' : '';
	}

	/**
	 * Press-down cue (D-11): additive to every other treatment above (interval
	 * color, wrong fill, selected hatch) - a key can be pressed at the same
	 * time as any of those, never replacing them. Active-mode only
	 * (interactive or inspect), since display-mode keys have no pointer
	 * handlers to set `pressedLetter`.
	 */
	function pressedClass(letter: string, octave: number): string {
		return keysActive && pressedKey?.letter === letter && pressedKey?.octave === octave
			? 'piano-keyboard__key--pressed'
			: '';
	}

	/**
	 * Construct-mode wrong-tap flash (Phase 12, D-06): transient and
	 * octave-specific, unlike `wrongClass`'s permanent, letter-only
	 * `wrongLetters` semantic. Reuses the same `.piano-keyboard__key--wrong`
	 * CSS rule verbatim - only this key's own letter+octave match flags it, so
	 * a same-letter duplicate key at a different octave never flashes.
	 */
	function flashWrongClass(letter: string, octave: number): string {
		return flashWrongKey?.letter === letter && flashWrongKey?.octave === octave
			? 'piano-keyboard__key--wrong'
			: '';
	}

	/**
	 * Reveal chord-strike pulse (Phase 16, HEAR-01): applies the shared
	 * `pulse-once` keyframe class (app.css) to every role-lit key while
	 * `pulsing` is active, following `stampedClass`'s role-gated shape.
	 * Never applies to a roleless (wrong/selected) key, per the UI-SPEC
	 * mutual-exclusion note.
	 */
	function pulseClass(letter: string, role: IntervalRole | undefined): string {
		return pulsing && role ? 'pulse-once' : '';
	}

	/**
	 * Study-mode arpeggio "not yet sounded" dim state (Phase 16, HEAR-02):
	 * mirrors `selectedClass`'s `!role` guard shape but INVERTED - applies
	 * only WHEN there IS a role AND `pendingKeys` contains an entry whose
	 * letter AND octave both match this exact physical key (mirroring
	 * `flashWrongClass`'s own letter+octave equality check), since pending
	 * only ever dims an already-role-lit key, never an unlit one, and a
	 * same-letter duplicate key at a different octave stays unaffected
	 * unless its own { letter, octave } is listed. The caller must pass the
	 * ASSIGNED note's own correctly-spelled letter (`key.note?.letter`), not
	 * the physical key's generic label (`key.letter`/`key.sharpLetter`) -
	 * `pendingKeys` is built from `earnedNotes`' own spelling (e.g. "B♭"),
	 * which for a black key never equals its generic `sharpLetter` ("A♯"),
	 * and for an enharmonic-wrapped note (e.g. E♯ landing on the F key,
	 * keyboardLayout's chroma fallback) never equals the white key's own
	 * base letter either.
	 */
	function pendingClass(letter: string, octave: number, role: IntervalRole | undefined): string {
		// Octave-agnostic on a ONE-octave board (260730-q3f): callers build
		// `pendingKeys` from the ascending audio voicing, whose upper notes sit in
		// octave 5, but a one-octave span has no octave-5 key - those notes wrap
		// back into the visible octave (assignNotesToKeys' D-02 branch). Comparing
		// the octave there would silently never match, so the arpeggio roll would
		// show every wrapped note lit from the start instead of dimmed. Two-octave
		// boards keep the strict letter+octave match, which is what makes a scale's
		// duplicate tonic un-dim one octave at a time.
		const matchesOctave = (candidate: number) => effectiveOctaves === 1 || candidate === octave;
		return role && pendingKeys?.some((k) => k.letter === letter && matchesOctave(k.octave))
			? 'piano-keyboard__key--pending'
			: '';
	}

	/**
	 * The ghostKeys entry matching this physical key, compared by CHROMA (0-11)
	 * plus octave — never by letter string. A ghost entry carries the chord's
	 * own spelled letter (e.g. "E♭" from spellChord), while an unassigned black
	 * key only offers its generic `sharpLetter` ("D♯"), so letter-string
	 * equality silently fails for every flat-spelled root/fifth (the project's
	 * "grade/match by chroma, never letter strings" rule exists for exactly
	 * this). Chroma comparison makes enharmonic spellings meet on the same key.
	 */
	function ghostEntryFor(
		letter: string,
		octave: number
	): { letter: string; octave: number; marker: string } | undefined {
		if (!ghostKeys?.length) return undefined;
		const keyChroma = Note.chroma(toAsciiAccidentals(letter));
		if (keyChroma === undefined) return undefined;
		return ghostKeys.find(
			(k) => Note.chroma(toAsciiAccidentals(k.letter)) === keyChroma && k.octave === octave
		);
	}

	/**
	 * Ghost-hatch "optional note" treatment (Phase 25, sketch 019 synthesis,
	 * SK-019): matches by chroma+octave (see ghostEntryFor) but keeps
	 * `pendingClass`'s guard shape INVERTED on the role — applies only when
	 * there is NO role (like `selectedClass`'s `!role` guard), since a ghost
	 * key is "allowed but not required" and never fights with the four
	 * reserved interval-color fills. Octave-specific like
	 * `flashWrongClass`/`pendingClass`, so a same-letter duplicate key at a
	 * different octave is unaffected unless its own { letter, octave } is
	 * listed.
	 */
	function ghostClass(letter: string, octave: number, role: IntervalRole | undefined): string {
		return !role && ghostEntryFor(letter, octave) ? 'piano-keyboard__key--ghost' : '';
	}

	/** The matching (by chroma+octave) ghostKeys entry's tiny mono marker ("R"/"5"), or undefined when this key has none. */
	function ghostMarker(letter: string, octave: number): string | undefined {
		return ghostEntryFor(letter, octave)?.marker;
	}

	/**
	 * Whether this physical key is the one identified by `bassHint`, compared
	 * by CHROMA + octave (same idiom as `ghostEntryFor`) — never by letter
	 * string, so an enharmonic-spelled bassHint letter lands on the same
	 * physical black key as its sharp spelling.
	 */
	function bassHintEntryFor(letter: string, octave: number): boolean {
		if (!bassHint) return false;
		const keyChroma = Note.chroma(toAsciiAccidentals(letter));
		if (keyChroma === undefined) return false;
		return (
			Note.chroma(toAsciiAccidentals(bassHint.letter)) === keyChroma && bassHint.octave === octave
		);
	}

	/**
	 * Bass ink-ring class (Phase 35, INV-01). Deliberate deviation from every
	 * other gated-prop convention in this file (`ghostClass`/`selectedClass`/
	 * `pendingClass`): NOT gated on `!role` — the ring must layer on top of a
	 * role fill, a ghost hatch, or a plain key, since "which of the 4
	 * already-colored notes is the bass" is the pedagogy this prop exists to
	 * teach.
	 */
	function bassHintClass(letter: string, octave: number): string {
		return bassHintEntryFor(letter, octave) ? 'piano-keyboard__key--bass-ring' : '';
	}

	/** The literal "B" badge text when this key matches `bassHint`, else undefined (mirrors `ghostMarker`'s data-attribute idiom). */
	function bassBadge(letter: string, octave: number): string | undefined {
		return bassHintEntryFor(letter, octave) ? 'B' : undefined;
	}
</script>

{#snippet board(
	boardWhiteKeys: WhiteKey[],
	boardBlackKeys: BlackKey[],
	boardWhiteKeyWidthPct: number,
	boardBlackKeyWidthPct: number,
	boardMinWidthPx: number | undefined
)}
	<!--
		The board carries a px min-width floor and the wrapper above scrolls when the
		container cannot supply it: the 44px fingertip floor at two octaves, the lower
		40px (WCAG-derived) floor at one, so a one-octave board fits every phone class
		above 320px instead of overflowing it - see `boardFloorPx`. This is
		the same scroll-wrap + min-width board
		shape ScaleKeyboardDrill already used, which is why the scale drill's own
		keyboard never had the defect. The min-width is on the BOARD, never on the
		keys: a per-key px floor is the 09-02 defect (see the note in the stylesheet),
		because it fights the percentage `left`/`width` layout and overlaps
		neighbors. Percentages resolve against the widened board instead, so key
		geometry stays exactly proportional. When stacked (two rows), each row's own
		min-width is always <= the measured container width (that is what
		triggered stacking in the first place), so no min-width style is applied
		to a stacked row's board - it fills the row's own 100% width instead.
	-->
	<div
		class="piano-keyboard__board"
		style={boardMinWidthPx !== undefined ? `min-width: ${boardMinWidthPx}px;` : undefined}
	>
	{#each boardWhiteKeys as key (key.index)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--white {roleClass(
				key.note?.role
			)} {selectedClass(key.letter, key.note?.role)} {wrongClass(
				key.letter,
				key.note?.role
			)} {stampedClass(key.letter, key.note?.role)} {pressedClass(
				key.letter,
				octaveForWhiteIndex(key.index)
			)} {flashWrongClass(key.letter, octaveForWhiteIndex(key.index))} {pulseClass(
				key.letter,
				key.note?.role
			)} {pendingClass(
				key.note?.letter ?? key.letter,
				octaveForWhiteIndex(key.index),
				key.note?.role
			)} {ghostClass(
				key.note?.letter ?? key.letter,
				octaveForWhiteIndex(key.index),
				key.note?.role
			)} {bassHintClass(key.note?.letter ?? key.letter, octaveForWhiteIndex(key.index))}"
			style="left: {key.leftPct}%; width: {boardWhiteKeyWidthPct}%;"
			role={keysActive ? 'button' : undefined}
			tabindex={keysActive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.letter) ?? false) : undefined}
			aria-label={keysActive ? keyAriaLabel(key.letter) : undefined}
			data-ghost={ghostMarker(key.note?.letter ?? key.letter, octaveForWhiteIndex(key.index))}
			data-bass={bassBadge(key.note?.letter ?? key.letter, octaveForWhiteIndex(key.index))}
			onclick={keysActive ? () => activateWhiteKey(key) : undefined}
			onkeydown={keysActive
				? (event: KeyboardEvent) => handleKeydown(event, () => activateWhiteKey(key))
				: undefined}
			onpointerdown={keysActive
				? () => handlePointerDown(key.letter, octaveForWhiteIndex(key.index))
				: undefined}
			onpointerup={keysActive
				? () => clearPressed(key.letter, octaveForWhiteIndex(key.index))
				: undefined}
			onpointerleave={keysActive
				? () => clearPressed(key.letter, octaveForWhiteIndex(key.index))
				: undefined}
			onpointercancel={keysActive
				? () => clearPressed(key.letter, octaveForWhiteIndex(key.index))
				: undefined}
		>
			{#if key.note}
				{@const gapBadge = gapBadgeFor(key.note)}
				{#if showIntervalBadges}
					<span class="piano-keyboard__ivbadge">{intervalBadgeFor(key.note)}</span>
				{/if}
				{#if gapBadge}
					<span class="piano-keyboard__gapbadge" aria-hidden="true">{gapBadge}</span>
				{/if}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{:else if wrongLetters?.has(key.letter)}
				<span class="piano-keyboard__wrong-mark" aria-hidden="true">✕</span>
				<span class="sr-only">extra note</span>
			{/if}
		</div>
	{/each}
	{#each boardBlackKeys as key, i (i)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -- role is dynamically 'button' whenever tabindex is set (both gated by `interactive`) -->
		<div
			class="piano-keyboard__key piano-keyboard__key--black {roleClass(
				key.note?.role
			)} {selectedClass(key.sharpLetter, key.note?.role)} {wrongClass(
				key.sharpLetter,
				key.note?.role
			)} {stampedClass(key.sharpLetter, key.note?.role)} {pressedClass(
				key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1)
			)} {flashWrongClass(
				key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1)
			)} {pulseClass(key.sharpLetter, key.note?.role)} {pendingClass(
				key.note?.letter ?? key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1),
				key.note?.role
			)} {ghostClass(
				key.note?.letter ?? key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1),
				key.note?.role
			)} {bassHintClass(
				key.note?.letter ?? key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1)
			)}"
			style="left: {key.leftPct}%; width: {boardBlackKeyWidthPct}%;"
			role={keysActive ? 'button' : undefined}
			tabindex={keysActive ? 0 : undefined}
			aria-pressed={interactive ? (selected?.has(key.sharpLetter) ?? false) : undefined}
			aria-label={keysActive ? keyAriaLabel(key.sharpLetter) : undefined}
			data-ghost={ghostMarker(
				key.note?.letter ?? key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1)
			)}
			data-bass={bassBadge(
				key.note?.letter ?? key.sharpLetter,
				octaveForBlackAfterWhiteIndex(key.position - 1)
			)}
			onclick={keysActive ? () => activateBlackKey(key) : undefined}
			onkeydown={keysActive
				? (event: KeyboardEvent) => handleKeydown(event, () => activateBlackKey(key))
				: undefined}
			onpointerdown={keysActive
				? () => handlePointerDown(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))
				: undefined}
			onpointerup={keysActive
				? () => clearPressed(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))
				: undefined}
			onpointerleave={keysActive
				? () => clearPressed(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))
				: undefined}
			onpointercancel={keysActive
				? () => clearPressed(key.sharpLetter, octaveForBlackAfterWhiteIndex(key.position - 1))
				: undefined}
		>
			{#if key.note}
				{@const gapBadge = gapBadgeFor(key.note)}
				{#if showIntervalBadges}
					<span class="piano-keyboard__ivbadge piano-keyboard__ivbadge--black">
						{intervalBadgeFor(key.note)}
					</span>
				{/if}
				{#if gapBadge}
					<span class="piano-keyboard__gapbadge piano-keyboard__gapbadge--black" aria-hidden="true"
						>{gapBadge}</span
					>
				{/if}
				<NoteLabel letter={key.note.letter} solfege={key.note.solfege} highlighted />
			{:else if wrongLetters?.has(key.sharpLetter)}
				<span class="piano-keyboard__wrong-mark" aria-hidden="true">✕</span>
				<span class="sr-only">extra note</span>
			{/if}
		</div>
	{/each}
	</div>
{/snippet}

<div
	class="piano-keyboard"
	role="img"
	aria-label={keyboardAriaLabel(effectiveOctaves)}
	style="touch-action: manipulation;"
	bind:this={containerEl}
>
	{#if stacked}
		<div class="piano-keyboard__rows">
			{#each rows as row, rowIndex (rowIndex)}
				{@render board(
					row.whiteKeys,
					row.blackKeys,
					row.whiteKeyWidthPct,
					row.blackKeyWidthPct,
					undefined
				)}
			{/each}
		</div>
	{:else}
		<!--
			Tick rail (`showIntervalTicks`), a sibling ABOVE the board rather than a
			child of it: it carries the same `min-width` floor, so the two layers
			stay column-aligned at every width - including when the wrapper scrolls
			them together - without the rail's own absolutely-positioned children
			having to live inside the key layer's stacking context. Rendered only on
			the unstacked branch (see `intervalGaps`); `aria-hidden` because every
			interval it draws is already announced by the keys' own labels and the
			stacked-thirds row, and the whole rail is pointer-events: none so it can
			never intercept a key tap in interactive/construct/inspect mode.
		-->
		{#if intervalGaps.length > 0}
			<div class="piano-keyboard__rail" style="min-width: {boardFloorPx}px;" aria-hidden="true">
				{#each intervalGaps as gap, index (index)}
					<span
						class="piano-keyboard__gap-line piano-keyboard__gap--{gap.quality}"
						style="left: {gap.fromPct}%; width: {gap.spanPct}%;"
					></span>
					{#each gap.ticksPct as tickPct, tickIndex (tickIndex)}
						<span
							class="piano-keyboard__gap-tick piano-keyboard__gap--{gap.quality}"
							style="left: {tickPct}%;"
						></span>
					{/each}
					<span
						class="piano-keyboard__gap-label piano-keyboard__gap--{gap.quality}"
						class:piano-keyboard__gap-label--narrow={gap.narrow}
						style="left: {gap.midPct}%;"
					>
						{gap.short} · {gap.semitones}
					</span>
				{/each}
			</div>
		{/if}
		{@render board(whiteKeys, blackKeys, whiteKeyWidthPct, blackKeyWidthPct, boardFloorPx)}
	{/if}
</div>

<style>
	.piano-keyboard {
		width: 100%;
		/*
		 * Scrolls only when the container cannot supply the board's
		 * `minBoardWidthPx` (one octave under 352px, i.e. 375px-class phones and
		 * narrower). At every wider width the board fits exactly and this is
		 * inert. Scrollbar hidden so the keyboard reads as an instrument rather
		 * than a scroll pane, matching ScaleKeyboardDrill's own scroll-wrap.
		 */
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		/* Gesture hygiene (D-12): see the touch-action inline style above and
		   the matching rule on .piano-keyboard__key below - keyboard-only, not
		   page-wide. */
		-webkit-touch-callout: none;
		user-select: none;
	}

	.piano-keyboard::-webkit-scrollbar {
		display: none;
	}

	/*
	 * The absolute key layer. `position: relative` lives here, not on the
	 * scrolling wrapper, so every key's percentage `left`/`width` resolves
	 * against the board's own (possibly wider than the container) width.
	 */
	.piano-keyboard__board {
		position: relative;
		width: 100%;
		height: 160px;
	}

	/*
	 * Two-row wrap wrapper (replaces horizontal scrolling on phone-width
	 * viewports, LOCKED user decision): stacks two independently-correct
	 * `.piano-keyboard__board` mini-keyboards vertically, each filling the full
	 * measured container width (never wider than it, since stacking only
	 * triggers once a single row could not fit that width - see
	 * `shouldStackRows`). Reuses the existing `--spacing-sm` token, matching
	 * ShellVoicingDrill's own spacing-token usage.
	 */
	.piano-keyboard__rows {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	/*
	 * Semitone tick rail (`showIntervalTicks`, design handoff sketch 2b): a thin
	 * strip directly above the board carrying one line + label + tick set per
	 * consecutive pair of chord tones. Height comes from the --spacing-* scale
	 * (xl = 32px), not an arbitrary pixel value: the label occupies the top
	 * ~12px, the line sits at --spacing-lg (24px), and the ticks straddle it.
	 *
	 * `pointer-events: none` on the rail itself (inherited by every child) is
	 * load-bearing, not defensive: the rail overlaps nothing today, but it sits
	 * inside the same scroll wrapper as an interactive/constructable/inspectable
	 * board, and a stray tap target here would swallow a key press.
	 */
	.piano-keyboard__rail {
		position: relative;
		width: 100%;
		height: var(--spacing-xl);
		pointer-events: none;
	}

	.piano-keyboard__gap-line {
		position: absolute;
		top: var(--spacing-lg);
		height: 2px;
	}

	/*
	 * Ticks are SQUARES, not the mockup's circles: `* { border-radius: 0
	 * !important }` (app.css) is this design system's one absolute rule, no
	 * element in src/ has ever exempted itself from it, and the handoff's own
	 * fallback for exactly this collision is to "reconsider circular ticks
	 * against the sharp-corner rule." A sharp tick also reads as a printed
	 * register mark, which is the palette's whole conceit.
	 *
	 * 8px (a --spacing-sm-sized mark) rather than the mockup's 10px, so the
	 * single tick of a one-semitone gap still clears its neighbors' ticks at
	 * phone key widths.
	 */
	.piano-keyboard__gap-tick {
		position: absolute;
		top: calc(var(--spacing-lg) - 3px);
		width: 8px;
		height: 8px;
		box-sizing: border-box;
		transform: translateX(-50%);
	}

	.piano-keyboard__gap-label {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.02em;
		white-space: nowrap;
	}

	/*
	 * Narrow-gap collision handling: two tones one white key apart span less
	 * than ~60px, where an 11px label is wider than its own gap and runs into
	 * the neighboring gap's label.
	 */
	.piano-keyboard__gap-label--narrow {
		font-size: 9px;
	}

	/*
	 * Third gaps - the chord's real stacked-thirds skeleton - are the only ones
	 * that carry a quality color: solid line, filled ticks, colored label.
	 */
	.piano-keyboard__gap-line.piano-keyboard__gap--major,
	.piano-keyboard__gap-tick.piano-keyboard__gap--major {
		background-color: var(--color-gap-major);
	}

	.piano-keyboard__gap-label.piano-keyboard__gap--major {
		color: var(--color-gap-major);
	}

	.piano-keyboard__gap-line.piano-keyboard__gap--minor,
	.piano-keyboard__gap-tick.piano-keyboard__gap--minor {
		background-color: var(--color-gap-minor);
	}

	.piano-keyboard__gap-label.piano-keyboard__gap--minor {
		color: var(--color-gap-minor);
	}

	/*
	 * Non-third gaps (a sus4's P4, a 6th chord's M2, C13's P5 over a missing
	 * 11th) are explicitly NOT thirds and must never borrow the M/m colors -
	 * the same distinction IntervalView's `.interval-view__gap--other` and
	 * CountingChipRow's dashed neutral chip already draw. Dashed line (a
	 * background cannot be dashed, so this is a bottom border on a zero-height
	 * box), hollow ticks, un-filled italic label in muted ink.
	 *
	 * The label still spells out "P4"/"M2" in text, exactly as a third's does:
	 * the color is additive information, never the only carrier of it.
	 */
	.piano-keyboard__gap-line.piano-keyboard__gap--other {
		height: 0;
		border-bottom: 2px dashed var(--color-faint);
	}

	.piano-keyboard__gap-tick.piano-keyboard__gap--other {
		background-color: var(--color-paper-bright);
		border: 2px solid var(--color-faint);
	}

	.piano-keyboard__gap-label.piano-keyboard__gap--other {
		color: var(--color-muted);
		font-style: italic;
	}

	/*
	 * No min-width on the KEYS (09-02 defect fix): a fixed px floor per key
	 * fights the percentage-based `left`/`width` layout above - every key would
	 * clamp to the same 44px regardless of its percentage position, so at one
	 * octave (8 white keys, ~34px pitch on a typical 390px phone with the old
	 * page padding) keys overlapped their neighbors by ~10px and black keys fused
	 * into solid blocks. The >=44px touch pitch instead comes from the BOARD's
	 * `minBoardWidthPx` (which scales the percentages together, so nothing
	 * overlaps) plus the wrapper's scroll for the narrowest phones - not from
	 * clamping key width independently of its position, and no longer from
	 * hoping the container is wide enough, which measurably failed at 375px.
	 */
	.piano-keyboard__key {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: var(--spacing-xs);
		/*
		 * Gesture hygiene (D-12): keyboard-only touch hardening so taps
		 * register cleanly - no double-tap zoom, no iOS long-press
		 * callout/selection menu. Scoped to the keyboard element itself, not
		 * applied page-wide (pull-to-refresh blocking and leave-confirmation
		 * were explicitly NOT selected, D-12).
		 */
		touch-action: manipulation;
		-webkit-touch-callout: none;
		user-select: none;
		transition:
			transform 90ms ease-out,
			filter 90ms ease-out,
			opacity 120ms ease-out;
	}

	.piano-keyboard__key--white {
		height: 100%;
		background-color: var(--color-paper-bright);
		border: 1.5px solid var(--color-ink);
		z-index: 1;
	}

	.piano-keyboard__key--black {
		height: 60%;
		background-color: var(--color-ink);
		z-index: 2;
	}

	.piano-keyboard__key--root {
		background-color: var(--color-root);
	}

	.piano-keyboard__key--third {
		background-color: var(--color-third);
	}

	.piano-keyboard__key--fifth {
		background-color: var(--color-fifth);
	}

	.piano-keyboard__key--seventh {
		background-color: var(--color-seventh);
	}

	.piano-keyboard__key--second {
		background-color: var(--color-second);
	}

	.piano-keyboard__key--fourth {
		background-color: var(--color-fourth);
	}

	.piano-keyboard__key--sixth {
		background-color: var(--color-sixth);
	}

	/*
	 * Wrong-answer feedback fill (Sketch 001 Variant A): the user's extra,
	 * non-chord notes at reveal time. Mutually exclusive with the four
	 * interval-role fills above (wrongClass only applies when there is no
	 * role), so a wrong key never fights with a colored one.
	 */
	.piano-keyboard__key--wrong {
		background-color: var(--color-wrong);
	}

	.piano-keyboard__key--black.piano-keyboard__key--wrong {
		background-color: var(--color-wrong-deep);
	}

	.piano-keyboard__wrong-mark {
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: var(--text-label);
		color: var(--color-ink);
	}

	/*
	 * Interval-from-root badge (sketch 003): a small corner tab near the top of
	 * a highlighted key, so the interval each note plays reads directly off the
	 * keyboard. Absolutely positioned so it never shifts the NoteLabel that
	 * sits at the key's foot.
	 */
	.piano-keyboard__ivbadge {
		position: absolute;
		top: var(--spacing-xs);
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 10px;
		letter-spacing: 0.04em;
		line-height: 1;
		padding: 2px 4px;
		background: var(--color-ink);
		color: var(--color-paper-bright);
	}
	.piano-keyboard__ivbadge--black {
		background: var(--color-paper-bright);
		color: var(--color-ink);
	}

	/*
	 * Arrival-key gap badge (`showIntervalTicks`, quick-260804-1uq): the
	 * fallback carrier for a gap the tick rail could not honestly draw (a
	 * wrapped/backwards gap on a one-octave board, or ANY gap on a stacked
	 * board). Placement is load-bearing and non-obvious: on a WHITE key the
	 * badge sits just below `60%` - where the black keys end - because a
	 * white key's child cannot paint above a sibling black key (the parent's
	 * `z-index: 1` vs the black key's `z-index: 2` creates the stacking
	 * context), so any off-centre badge inside the top 96px could be
	 * swallowed; below that band it also clears the `NoteLabel` at the key's
	 * foot. On a BLACK key there is no such band (the key IS only 60% tall),
	 * so it drops to `--spacing-lg`, one row under that key's own
	 * `--ivbadge` and above its `NoteLabel`. Both are horizontally centred,
	 * deliberately NOT the corner the bass "B" badge already owns
	 * (`top: 2px; left: 2px`) and vertically clear of the root-relative
	 * `--ivbadge` row, so all three can coexist on one key. Unlike
	 * `--ivbadge`, no black-key colour inversion is needed - paper-bright
	 * fill with an ink border reads on both key kinds. No radius (the global
	 * zero-radius rule owns that), no quality colour - the rail's M/m
	 * colouring is a rail affordance; the badge stays neutral ink.
	 */
	.piano-keyboard__gapbadge {
		position: absolute;
		top: calc(60% + var(--spacing-xs));
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 9px;
		line-height: 1;
		letter-spacing: 0.02em;
		padding: 1px 3px;
		background: var(--color-paper-bright);
		border: 1px solid var(--color-ink);
		color: var(--color-ink);
		white-space: nowrap;
		pointer-events: none;
	}
	.piano-keyboard__gapbadge--black {
		top: var(--spacing-lg);
	}

	/*
	 * Reveal stamp beat: keyframe now lives in app.css (shared with the
	 * drills page's .stamp) so both consumers reference one definition; the
	 * prefers-reduced-motion guard also lives there alongside it.
	 */
	.piano-keyboard__key--stamped {
		animation: stamp-in 240ms ease-out;
	}

	/*
	 * Selected/pending key: a diagonal ink hatch texture plus an inset ink
	 * border, deliberately NOT a color fill, so it can never be confused with
	 * the four reserved interval-color fills above (which only ever appear on
	 * revealed/correct notes). Layered over the key's existing base color via
	 * repeating-linear-gradient; no new app.css token, per UI-SPEC.
	 */
	.piano-keyboard__key--selected {
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 0,
			color-mix(in srgb, var(--color-ink) 12%, transparent) 1px,
			transparent 1px,
			transparent 7px
		);
		box-shadow: inset 0 0 0 2px var(--color-ink);
	}

	.piano-keyboard__key--black.piano-keyboard__key--selected {
		background-image: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--color-paper-bright) 20%, transparent) 0,
			color-mix(in srgb, var(--color-paper-bright) 20%, transparent) 1px,
			transparent 1px,
			transparent 7px
		);
		box-shadow: inset 0 0 0 2px var(--color-paper-bright);
	}

	/*
	 * Study-mode "not yet sounded" dim (Phase 16, HEAR-02): the key already
	 * shows its final interval-color fill; this modifier just lowers its
	 * opacity until its own arpeggio-roll tick clears it. The cross-fade
	 * back to full opacity comes from the `opacity` entry already added to
	 * `.piano-keyboard__key`'s shared `transition` list above - no separate
	 * transition rule needed here. The `.pulse-once` keyframe and the
	 * reduced-motion handling for both of these live in app.css (shared with
	 * ChordGlyph), not duplicated here (Plan 16-01).
	 */
	.piano-keyboard__key--pending {
		opacity: 0.28;
	}

	/*
	 * Ghost-hatch "optional note" (Phase 25, sketch 019 synthesis, SK-019):
	 * a diagonal ink hatch at low opacity plus a tiny mono marker ("R"/"5"),
	 * deliberately NOT the gray `--wrong` fill (that treatment reads as an
	 * error) — a ghost key means "allowed but not required." Mutually
	 * exclusive with the four reserved interval-color fills (`ghostClass`'s
	 * `!role` guard, mirroring `.piano-keyboard__key--selected` above). No
	 * `position` override here (UAT bug B fix): the base `.piano-keyboard__key`
	 * rule is already `position: absolute`, which is itself a valid
	 * positioning context for the `::after` marker below - a ghost key
	 * previously set `position: relative` here, which overrode that absolute
	 * layer and dropped the key into normal document flow below the keyboard
	 * row instead of at its assigned `left`/`top` slot.
	 */
	.piano-keyboard__key--ghost {
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			color-mix(in srgb, var(--color-ink) 15%, transparent) 3px,
			color-mix(in srgb, var(--color-ink) 15%, transparent) 5px
		);
	}

	.piano-keyboard__key--ghost::after {
		content: attr(data-ghost);
		position: absolute;
		top: 6px;
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: 8px;
		line-height: 1;
		color: var(--color-faint);
	}

	/* Black-key ghost stays legible over the dark key (mirrors `--selected`'s own black-key override). */
	.piano-keyboard__key--black.piano-keyboard__key--ghost {
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			color-mix(in srgb, var(--color-paper-bright) 25%, transparent) 3px,
			color-mix(in srgb, var(--color-paper-bright) 25%, transparent) 5px
		);
	}

	.piano-keyboard__key--black.piano-keyboard__key--ghost::after {
		color: var(--color-paper-bright);
	}

	/*
	 * Bass emphasis (Phase 35, INV-01): a neutral ink ring + "B" badge marking
	 * which of the chord's already-colored keys is the bass. LOCKED CSS from
	 * counting-hint-grammar.md, mirroring the `data-ghost`/`::after` idiom
	 * above. Deliberately NOT role-gated (see `bassHintClass`) - layers on top
	 * of a role fill, a ghost hatch, or a plain key. Neutral ink only, never a
	 * role color or vermilion.
	 */
	.piano-keyboard__key--bass-ring {
		outline: 3px solid var(--color-ink);
		outline-offset: -3px;
		z-index: 4;
	}

	.piano-keyboard__key--bass-ring::after {
		content: attr(data-bass);
		position: absolute;
		top: 2px;
		left: 2px;
		z-index: 5;
		font-family: var(--font-mono);
		font-size: 8px;
		font-weight: 700;
		background: var(--color-ink);
		color: #fff;
		padding: 1px 3px;
	}

	/*
	 * Press-down cue (D-11): an immediate, brief confirmation that a tap
	 * landed, so a fat-finger tap on glass is instantly confirmable. Additive
	 * to every treatment above - the interval-color/wrong fills, the
	 * selected-hatch, and the stamp-in reveal - never replacing any of them,
	 * since `pressedClass` is concatenated alongside those classes rather than
	 * gated behind an `!role`/`!selected` check. Disabled under
	 * prefers-reduced-motion (D-11); the `transition` above still applies so
	 * the class can be added/removed without a visible flash.
	 */
	.piano-keyboard__key--pressed {
		transform: scale(0.94);
		filter: brightness(0.9);
	}

	@media (prefers-reduced-motion: reduce) {
		.piano-keyboard__key--pressed {
			transform: none;
			filter: none;
		}
	}
</style>
