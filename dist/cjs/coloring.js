"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORING_SAVE_EVERY_MS = exports.COLORING_SAVE_MAX_CHARS = exports.COLORING_PREVIEW_MAX_CHARS = exports.COLORING_PREVIEW_WIDTH = exports.COLORING_SPREAD_MS = exports.COLORING_PIECE = exports.COLORING_STEP = exports.COLORING_SIZES = exports.COLORING_ERASER = exports.COLORING_STAR_CRAYON_TONES = exports.COLORING_CRAYON_COUNT = exports.COLORING_FIRST_STAR_CRAYON = exports.COLORING_STAR_CRAYONS = exports.COLORING_FREE_CRAYON_COUNT = exports.COLORING_GLITTER = exports.COLORING_RAINBOW = exports.COLORING_COLORS = void 0;
exports.coloringStarCrayonKey = coloringStarCrayonKey;
exports.coloringStarCrayonIndex = coloringStarCrayonIndex;
exports.coloringCrayonTile = coloringCrayonTile;
exports.coloringCrayonTone = coloringCrayonTone;
exports.coloringCrayonGrid = coloringCrayonGrid;
exports.compactColoringOps = compactColoringOps;
exports.undoColoringOp = undoColoringOp;
exports.packColoringOps = packColoringOps;
exports.unpackColoringOps = unpackColoringOps;
exports.coloringSavedOps = coloringSavedOps;
exports.layoutColoringScreen = layoutColoringScreen;
/** The box of crayons, four a row: the plain colours first, by the rainbow's order. */
exports.COLORING_COLORS = [
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
];
/** The two magic crayons follow the plain ones: a picture for a colour, drawn the same way. */
exports.COLORING_RAINBOW = exports.COLORING_COLORS.length;
exports.COLORING_GLITTER = exports.COLORING_RAINBOW + 1;
/** The crayons every child has: the plain colours and the two magic ones. */
exports.COLORING_FREE_CRAYON_COUNT = exports.COLORING_GLITTER + 1;
/**
 * The crayons sold for a child's stars (owner, 2026-11-25), after the free ones and painted with a
 * picture as the magic ones are. A key is its tile's name in both clients (`gold.webp`) and what the
 * server sells it by; a crayon's number in a drawing is its place in the box, the first of them 20.
 * A new one goes at the end: a number once drawn with never changes.
 */
exports.COLORING_STAR_CRAYONS = ['gold', 'silver', 'neon-pink', 'neon-green', 'neon-blue', 'hearts', 'stars'];
exports.COLORING_FIRST_STAR_CRAYON = exports.COLORING_FREE_CRAYON_COUNT;
exports.COLORING_CRAYON_COUNT = exports.COLORING_FIRST_STAR_CRAYON + exports.COLORING_STAR_CRAYONS.length;
/** A star crayon's own colour: its toy's, its sparks', and what it paints with while its tile is not there. */
exports.COLORING_STAR_CRAYON_TONES = {
    gold: '#f2c02e',
    silver: '#c9d1d8',
    'neon-pink': '#ff1fc8',
    'neon-green': '#2bff2b',
    'neon-blue': '#00d5ff',
    hearts: '#ff3d7f',
    stars: '#2b3a99',
};
/** The star crayon of that number, or null for a free one (or none). */
function coloringStarCrayonKey(crayon) {
    return exports.COLORING_STAR_CRAYONS[crayon - exports.COLORING_FIRST_STAR_CRAYON] ?? null;
}
/** The number of the star crayon of that key, or -1. */
function coloringStarCrayonIndex(key) {
    const place = exports.COLORING_STAR_CRAYONS.indexOf(key);
    return place < 0 ? -1 : exports.COLORING_FIRST_STAR_CRAYON + place;
}
/** The picture a crayon paints with — 'rainbow', 'glitter' or a star crayon's key — or null for a colour. */
function coloringCrayonTile(crayon) {
    if (crayon === exports.COLORING_RAINBOW)
        return 'rainbow';
    if (crayon === exports.COLORING_GLITTER)
        return 'glitter';
    return coloringStarCrayonKey(crayon);
}
/** A crayon's plain colour: its own, the magic ones' gold, a star crayon's tone. */
function coloringCrayonTone(crayon) {
    const star = coloringStarCrayonKey(crayon);
    if (star)
        return exports.COLORING_STAR_CRAYON_TONES[star];
    return crayon >= 0 && crayon < exports.COLORING_COLORS.length ? exports.COLORING_COLORS[crayon] : '#f5b81f';
}
/**
 * The box's rows for so many crayons: four a row for the free twenty, five a row once star crayons
 * stand in it too, so a crayon stays big enough for a finger.
 */
function coloringCrayonGrid(count) {
    const columns = count > exports.COLORING_FREE_CRAYON_COUNT ? 5 : 4;
    return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
}
/** The colour of a stroke of the eraser: the paper's. */
exports.COLORING_ERASER = -1;
/** A stroke's width, in the page's own units. */
exports.COLORING_SIZES = [6, 12, 22, 36];
/** Points of a stroke nearer than this are one: a slow finger leaves no pile of them. */
exports.COLORING_STEP = 2;
/** A long scribble is cut into pieces of this many points: what is being drawn stays quick. */
exports.COLORING_PIECE = 300;
/** How long the colour of a fill takes to run out from the finger. */
exports.COLORING_SPREAD_MS = 420;
/** The size of the small picture of a drawing, and of its text. */
exports.COLORING_PREVIEW_WIDTH = 240;
exports.COLORING_PREVIEW_MAX_CHARS = 16000;
/** The most text a drawing is kept in; past it the strokes give up every other point. */
exports.COLORING_SAVE_MAX_CHARS = 1200000;
/** How often a drawing being changed is saved, besides when the child leaves it. */
exports.COLORING_SAVE_EVERY_MS = 20000;
/** What was done before the last clean sheet is gone for good: nothing saves it. */
function compactColoringOps(ops) {
    for (let i = ops.length - 1; i >= 0; i--) {
        if (ops[i].t === 'x') {
            return ops.slice(i + 1);
        }
    }
    return ops.slice();
}
/** The list with the last action taken back: a scribble of many pieces goes whole. */
function undoColoringOp(ops) {
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
function packColoringOps(ops) {
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
function unpackColoringOps(ops) {
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
function thinColoringOps(ops) {
    return ops.map((op) => {
        if (op.t !== 's' || op.p.length <= 4) {
            return op;
        }
        const last = op.p.length - 2;
        const p = [];
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
function coloringSavedOps(ops) {
    let kept = compactColoringOps(ops);
    while (JSON.stringify(packColoringOps(kept)).length > exports.COLORING_SAVE_MAX_CHARS) {
        const thinner = thinColoringOps(kept);
        if (JSON.stringify(thinner).length >= JSON.stringify(kept).length) {
            break;
        }
        kept = thinner;
    }
    return packColoringOps(kept);
}
const COLORING_ROOM = { width: 740, height: 360, gap: 8, tools: 54, box: 170, column: 37, rim: 5, maxUnit: 1.8 };
/**
 * How the screen is divided, from the room the page has: the toys grow with it
 * up to a limit and the sheet takes the rest, whole. A game measures its stage,
 * never the screen, and so does this.
 */
function layoutColoringScreen(width, height, page, insets = { top: 0, right: 0, bottom: 0, left: 0 }, 
/** How many crayons the box holds: a fifth column makes it wider. */
crayons = exports.COLORING_FREE_CRAYON_COUNT) {
    const { gap, tools, rim } = COLORING_ROOM;
    const box = COLORING_ROOM.box + (coloringCrayonGrid(crayons).columns - 4) * COLORING_ROOM.column;
    const unit = Math.max(0.1, Math.min(COLORING_ROOM.maxUnit, (width - insets.left - insets.right) / COLORING_ROOM.width, (height - insets.top - insets.bottom) / COLORING_ROOM.height));
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
