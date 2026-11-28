# Homework exercise data

The `/homework` page opens exercises from the teacher's two books by printed
page number and exercise number. The exercises are **transcribed as data**, not
shipped as scans: both books are still under copyright, so no PDF or page image
is in the repo. Only pitches and note values are stored, which is enough to
re-engrave the exercise and to score the player.

- Note reading: Georges Dandelot, *Manuel pratique pour l'etude des cles de
  Sol, Fa et Ut* (Eschig, 1928). Data: `src/lib/homework/data/readingData.ts`.
- Rhythm: Georges Dandelot, *Etude du rythme*, cahier 1 (Leduc). Data:
  `src/lib/homework/data/rhythmData.ts`.

`page` is always the **printed** page number (the scan's PDF index is offset:
+2 for the Manuel pratique, +1 for the rhythm book).

## Formats

Both files document their own format in the header comment; in short:

- Reading: `staves` is one string per printed staff line, notes separated by
  spaces. A note is letter, optional `#`/`b`, octave digit (C4 = middle C),
  duration `w`/`h`/`q`, e.g. `G4h A4q`.
- Rhythm: `timeSignature` plus `measures`, one string per bar. A note is
  `[r]<w|h|q|e|s>[.][~]` (`r` rest, `.` dotted, `~` tied to the next note). A
  bar may start with `@3/4 ` to change the time signature.

A test (`data/data.test.ts`) fails if any bar does not add up to its time
signature, any note token is malformed or any exercise falls off the staff.

## Adding exercises by hand

1. Add an object to the array (copy a neighbour).
2. Run `npm test`: the data tests tell you which bar or note is malformed.
3. Open the exercise on `/homework` and compare it with the book.

Status: all exercise data is hand-transcribed from the books and still pending
verification against them. The app says so on the `/homework` page.

Transcription is by eye, so check each new exercise against the printed page
before trusting its score.

## Filling the data automatically later

The formats are plain strings on purpose: an extractor (optical music
recognition over the PDF) only has to emit these same strings, and everything
downstream (engraving, scoring, the page/exercise lookup) works unchanged.
`data.test.ts` is the validator for its output.
