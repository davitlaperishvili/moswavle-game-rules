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
export const COLORING_COLORS = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#aed63f',
  '#2e9e4f',
  '#00acc1',
  '#39b6f5',
  '#1e6fe5',
  '#3f3db5',
  '#8e24aa',
  '#ec407a',
  '#f8bbd0',
  '#ffd2a6',
  '#8d6e63',
  '#5d4037',
  '#90a4ae',
  '#212121',
  '#ffffff',
] as const;

/** The two magic crayons follow the plain ones: a picture for a colour, drawn the same way. */
export const COLORING_RAINBOW = COLORING_COLORS.length;
export const COLORING_GLITTER = COLORING_RAINBOW + 1;
export const COLORING_CRAYON_COUNT = COLORING_GLITTER + 1;

/** The colour of a stroke of the eraser: the paper's. */
export const COLORING_ERASER = -1;

/** A stroke's width, in the page's own units. */
export const COLORING_SIZES = [6, 12, 22, 36] as const;

/** Points of a stroke nearer than this are one: a slow finger leaves no pile of them. */
export const COLORING_STEP = 2;

/** A long scribble is cut into pieces of this many points: what is being drawn stays quick. */
export const COLORING_PIECE = 300;

/** How long the colour of a fill takes to run out from the finger. */
export const COLORING_SPREAD_MS = 420;

/** The size of the small picture of a drawing, and of its text. */
export const COLORING_PREVIEW_WIDTH = 240;
export const COLORING_PREVIEW_MAX_CHARS = 16_000;

/** The most text a drawing is kept in; past it the strokes give up every other point. */
export const COLORING_SAVE_MAX_CHARS = 1_200_000;

/** How often a drawing being changed is saved, besides when the child leaves it. */
export const COLORING_SAVE_EVERY_MS = 20_000;

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
export function compactColoringOps(ops: readonly ColoringOp[]): ColoringOp[] {
  for (let i = ops.length - 1; i >= 0; i--) {
    if (ops[i].t === 'x') {
      return ops.slice(i + 1);
    }
  }

  return ops.slice();
}

/** The list with the last action taken back: a scribble of many pieces goes whole. */
export function undoColoringOp(ops: readonly ColoringOp[]): ColoringOp[] {
  let end = ops.length;

  while (end > 0) {
    const op = ops[end - 1];
    end--;
    if (!(op.t === 's' && op.j)) {
      break;
    }
  }

  return ops.slice(0, end);
}

/** Each point as its step from the one before: the numbers are small, so the text is. */
export function packColoringOps(ops: readonly ColoringOp[]): ColoringOp[] {
  return ops.map((op) => {
    if (op.t !== 's') {
      return op;
    }

    const p = op.p.slice();
    for (let i = p.length - 1; i >= 2; i--) {
      p[i] -= p[i - 2];
    }

    return { ...op, p };
  });
}

/** What packColoringOps made, as points on the page again. */
export function unpackColoringOps(ops: readonly ColoringOp[]): ColoringOp[] {
  return ops.map((op) => {
    if (op.t !== 's') {
      return op;
    }

    const p = op.p.slice();
    for (let i = 2; i < p.length; i++) {
      p[i] += p[i - 2];
    }

    return { ...op, p };
  });
}

/** Every stroke with every other point dropped, its first and last kept. */
function thinColoringOps(ops: readonly ColoringOp[]): ColoringOp[] {
  return ops.map((op) => {
    if (op.t !== 's' || op.p.length <= 4) {
      return op;
    }

    const last = op.p.length - 2;
    const p: number[] = [];
    for (let i = 0; i < last; i += 4) {
      p.push(op.p[i], op.p[i + 1]);
    }
    p.push(op.p[last], op.p[last + 1]);

    return { ...op, p };
  });
}

/**
 * The drawing as the server keeps it. Hours of scribbling would go past what is
 * kept: thinned, a stroke still looks the same, and nothing a child did is lost.
 */
export function coloringSavedOps(ops: readonly ColoringOp[]): ColoringOp[] {
  let kept = compactColoringOps(ops);

  while (JSON.stringify(packColoringOps(kept)).length > COLORING_SAVE_MAX_CHARS) {
    const thinner = thinColoringOps(kept);
    if (JSON.stringify(thinner).length >= JSON.stringify(kept).length) {
      break;
    }
    kept = thinner;
  }

  return packColoringOps(kept);
}

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

const COLORING_ROOM = { width: 740, height: 360, gap: 8, tools: 54, box: 170, rim: 5, maxUnit: 1.8 };

/**
 * How the screen is divided, from the room the page has: the toys grow with it
 * up to a limit and the sheet takes the rest, whole. A game measures its stage,
 * never the screen, and so does this.
 */
export function layoutColoringScreen(
  width: number,
  height: number,
  page: { w: number; h: number },
  insets: ColoringInsets = { top: 0, right: 0, bottom: 0, left: 0 },
): ColoringLayout {
  const { gap, tools, box, rim } = COLORING_ROOM;
  const unit = Math.max(
    0.1,
    Math.min(
      COLORING_ROOM.maxUnit,
      (width - insets.left - insets.right) / COLORING_ROOM.width,
      (height - insets.top - insets.bottom) / COLORING_ROOM.height,
    ),
  );

  const left = Math.max(insets.left, gap * unit);
  const right = Math.max(insets.right, gap * unit);
  const top = Math.max(insets.top, gap * unit);
  const bottom = Math.max(insets.bottom, gap * unit);
  const across = Math.max(0, height - top - bottom);

  const toolRect = { x: left, y: top, width: tools * unit, height: across };
  const boxRect = { x: width - right - box * unit, y: top, width: box * unit, height: across };

  const stageX = toolRect.x + toolRect.width + gap * unit;
  const stage = { x: stageX, y: top, width: Math.max(0, boxRect.x - gap * unit - stageX), height: across };

  const room = rim * unit * 2;
  const scale = Math.max(0, Math.min((stage.width - room) / page.w, (stage.height - room) / page.h));
  const paperWidth = Math.floor(page.w * scale);
  const paperHeight = Math.floor(page.h * scale);

  return {
    unit,
    tools: toolRect,
    box: boxRect,
    stage,
    paper: {
      x: stage.x + (stage.width - paperWidth) / 2,
      y: stage.y + (stage.height - paperHeight) / 2,
      width: paperWidth,
      height: paperHeight,
    },
  };
}
