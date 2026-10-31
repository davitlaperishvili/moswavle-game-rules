/**
 * The coloring pages (owner, 2026-10-30): a collection of line drawings a child
 * colours in, with no points and no rating. A page is its closed areas and a
 * transparent picture of its lines; a drawing is the list of what the child did,
 * so it is small enough to keep as text and is drawn the same on the site's
 * canvas and the app's Skia. What both must agree on is here: the crayons, the
 * shape of a drawing and how the screen is divided.
 *
 * The plugin reads a drawing back before it stores one
 * (`includes/api/classes/ColoringHandler.php`): change the two together.
 */
/** The box of crayons, four a row: the plain colours first, by the rainbow's order. */
export declare const COLORING_COLORS: readonly ["#e53935", "#fb8c00", "#fdd835", "#aed63f", "#2e9e4f", "#00acc1", "#39b6f5", "#1e6fe5", "#3f3db5", "#8e24aa", "#ec407a", "#f8bbd0", "#ffd2a6", "#8d6e63", "#5d4037", "#90a4ae", "#212121", "#ffffff"];
/** The two magic crayons follow the plain ones: a picture for a colour, drawn the same way. */
export declare const COLORING_RAINBOW: 18;
export declare const COLORING_GLITTER: number;
export declare const COLORING_CRAYON_COUNT: number;
/** The colour of a stroke of the eraser: the paper's. */
export declare const COLORING_ERASER = -1;
/** A stroke's width, in the page's own units. */
export declare const COLORING_SIZES: readonly [6, 12, 22, 36];
/** Points of a stroke nearer than this are one: a slow finger leaves no pile of them. */
export declare const COLORING_STEP = 2;
/** A long scribble is cut into pieces of this many points: what is being drawn stays quick. */
export declare const COLORING_PIECE = 300;
/** How long the colour of a fill takes to run out from the finger. */
export declare const COLORING_SPREAD_MS = 420;
/** The size of the small picture of a drawing, and of its text. */
export declare const COLORING_PREVIEW_WIDTH = 240;
export declare const COLORING_PREVIEW_MAX_CHARS = 16000;
/** The most text a drawing is kept in; past it the strokes give up every other point. */
export declare const COLORING_SAVE_MAX_CHARS = 1200000;
/** How often a drawing being changed is saved, besides when the child leaves it. */
export declare const COLORING_SAVE_EVERY_MS = 20000;
/** An area filled with a crayon. */
export interface ColoringFill {
    t: 'f';
    /** The area, by its place in the page's list. */
    a: number;
    c: number;
}
/**
 * A stroke. `p` is x, y, x, y… in the page's units, or, saved, x and y of the
 * first point and then each one's step from the last. `a` keeps it inside that
 * area; `j` says this piece goes on from the one before.
 */
export interface ColoringStroke {
    t: 's';
    c: number;
    w: number;
    p: number[];
    a?: number;
    j?: 1;
}
/** A clean sheet. It is an action like the others, so "back" brings the drawing back. */
export interface ColoringClear {
    t: 'x';
}
export type ColoringOp = ColoringFill | ColoringStroke | ColoringClear;
/** What was done before the last clean sheet is gone for good: nothing saves it. */
export declare function compactColoringOps(ops: readonly ColoringOp[]): ColoringOp[];
/** The list with the last action taken back: a scribble of many pieces goes whole. */
export declare function undoColoringOp(ops: readonly ColoringOp[]): ColoringOp[];
/** Each point as its step from the one before: the numbers are small, so the text is. */
export declare function packColoringOps(ops: readonly ColoringOp[]): ColoringOp[];
/** What packColoringOps made, as points on the page again. */
export declare function unpackColoringOps(ops: readonly ColoringOp[]): ColoringOp[];
/**
 * The drawing as the server keeps it. Hours of scribbling would go past what is
 * kept: thinned, a stroke still looks the same, and nothing a child did is lost.
 */
export declare function coloringSavedOps(ops: readonly ColoringOp[]): ColoringOp[];
export interface ColoringInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface ColoringRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ColoringLayout {
    /** What a unit of the drawn toys measures here: 1 on a phone 740 by 360. */
    unit: number;
    /** The column of toys at the left. */
    tools: ColoringRect;
    /** The box of crayons at the right. */
    box: ColoringRect;
    /** What is left between them, where the sheet stands. */
    stage: ColoringRect;
    /** The paper itself, its rim of white around it. */
    paper: ColoringRect;
}
/**
 * How the screen is divided, from the room the page has: the toys grow with it
 * up to a limit and the sheet takes the rest, whole. A game measures its stage,
 * never the screen, and so does this.
 */
export declare function layoutColoringScreen(width: number, height: number, page: {
    w: number;
    h: number;
}, insets?: ColoringInsets): ColoringLayout;
