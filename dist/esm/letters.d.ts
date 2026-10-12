import { LETTER_SETS, OUTLINE_EM } from "./letterOutlines.js";
export { LETTER_SETS, OUTLINE_EM };
export type LetterBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** A letter's colours: the body runs from `light` at its top to `deep` at its foot, inside `outline`. */
export type LetterTone = {
    light: string;
    deep: string;
    outline: string;
};
/**
 * How a letter is painted, in shares of the side of its alphabet's box: the
 * `ring` of outline around the ink, the `depth` of the thickness under it, and
 * the shine — the part of the ink that its own copy moved by `shineX`,
 * `shineY` does not cover, in white at `shineOpacity`.
 */
export declare const LETTER_ART: {
    readonly ring: 0.05;
    readonly depth: 0.045;
    readonly shineX: 0.02;
    readonly shineY: 0.028;
    readonly shineOpacity: 0.6;
};
export type LetterSetName = keyof typeof LETTER_SETS;
/** What a character's outline says, by name. */
export type GlyphShape = {
    advance: number;
    box: LetterBox;
    path: string;
};
/** The outline of a character — a letter, a digit, a mark — or null when it has none. */
export declare function glyphShape(char: string): GlyphShape | null;
/** The alphabet a letter belongs to — capitals and small letters apart — or null for anything else. */
export declare function letterSetOf(char: string): LetterSetName | null;
export type LetterArt = {
    char: string;
    /** The ink, as an SVG path in the units of `view`. */
    path: string;
    /** The box the ink fills: its gradient runs from the top of this to its foot. */
    ink: LetterBox;
    /** The alphabet's square, the same size for each of its letters, with this one in its middle. */
    box: LetterBox;
    /** What is drawn — the square with the outline around it and the thickness under it. A square too. */
    view: LetterBox;
    /** The width of the line the outline is stroked with: the ring on both sides of the ink's edge. */
    outline: number;
    /** How far down the outline is drawn again, as the letter's thickness. */
    depth: number;
    /** How far the copy that cuts the shine is moved. */
    shine: {
        x: number;
        y: number;
        opacity: number;
    };
};
/**
 * A letter as the players draw it on a card, or null for a character that is
 * not a letter of the three alphabets. It stands on its alphabet's line at its
 * true size and in the middle of the square from left to right.
 */
export declare function letterArt(char: string): LetterArt | null;
/**
 * The size a letter's picture says it has, as a library picture has one: what
 * is drawn where nothing else sizes it — a canvas, a texture. It is a drawing,
 * so it is as sharp at any other size.
 */
export declare const LETTER_PICTURE_PX = 512;
/**
 * The letter as an SVG document — what `letterArt` describes, painted in
 * `tone`. For wherever a picture is wanted as an address (see
 * `letterPictureUri`); a player that draws with its own SVG elements builds
 * the same layers from `letterArt`.
 */
export declare function letterSvg(char: string, tone: LetterTone): string | null;
/** What a letter's address starts with: an SVG document written into the address itself. */
export declare const LETTER_PICTURE_PREFIX = "data:image/svg+xml,";
/**
 * The letter as the address of a picture — the SVG itself, so nothing is
 * fetched — safe to write into an `src`, a CSS `url()` or an attribute of
 * another SVG: it holds no quote, bracket or angle.
 */
export declare function letterPictureUri(char: string, tone: LetterTone): string | null;
/** How far the pen moves on after a character with no outline of ours, in ems: a wide letter's worth. */
export declare const TEXT_UNKNOWN_ADVANCE = 0.82;
/** The room added after every character of a line, in ems: the letters wear an outline. */
export declare const TEXT_TRACKING = 0.03;
/** How far the pen moves on after a character, in ems, the room for its outline included. */
export declare function textCharAdvance(char: string): number;
export type TextLineGlyph = {
    char: string;
    /** Where the character starts, in ems from the start of the line. */
    x: number;
    /** How far the pen moves on after it, in ems. */
    advance: number;
    /** Its ink at `OUTLINE_EM` units to the em, from its own start; null for a space and for a character we have no outline of. */
    path: string | null;
};
/**
 * A line of writing laid out a character at a time, in ems: where each stands
 * and its ink. The line is as wide as its last character's end.
 */
export declare function layoutTextLine(text: string): {
    width: number;
    glyphs: TextLineGlyph[];
};
