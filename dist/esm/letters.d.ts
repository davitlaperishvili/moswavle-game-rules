import { LETTER_SETS, OUTLINE_EM } from "./letterOutlines.js";
export { LETTER_SETS, OUTLINE_EM };
export type LetterBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * A letter's colours: the body runs from `light` at its top to `deep` at its
 * foot. `outline` is its darker colour, for what is drawn beside the letter.
 */
export type LetterTone = {
    light: string;
    deep: string;
    outline: string;
};
/** The colours of every drawn letter's edge and shadow, whatever its own. */
export declare const LETTER_LOOK: {
    readonly edge: "#ffffff";
    readonly shadow: "#1f344f";
    readonly shadowOpacity: 0.2;
};
/**
 * How a letter is painted on a card, in shares of the side of its alphabet's
 * box: the `ring` of white edge around the ink, and its shadow — the ink drawn
 * again `shadowY` lower, spread by `shadowRing` on each side.
 */
export declare const LETTER_ART: {
    readonly ring: 0.016;
    readonly shadowY: 0.035;
    readonly shadowRing: 0.035;
};
/**
 * The same for a line of writing, in ems: the edge's stroke, how far down the
 * shadow is and how wide its stroke (it is spread by half of that each side).
 */
export declare const TEXT_ART_LOOK: {
    readonly edge: 0.03;
    readonly shadowY: 0.045;
    readonly shadowSpread: 0.07;
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
    /** The width of the line the white edge is stroked with: the ring on both sides of the ink's edge. */
    outline: number;
    /** How far down the shadow is drawn. */
    depth: number;
    /** The shadow's stroke: as wide as this, spread on both sides of the ink's edge. */
    shadow: number;
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
