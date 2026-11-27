/** A letter's strokes in order, each a flat list of x,y pairs from the pen's start to its lift. */
export type LetterStrokes = readonly (readonly number[])[];
export declare const LETTER_STROKES: Readonly<Record<string, LetterStrokes>>;
