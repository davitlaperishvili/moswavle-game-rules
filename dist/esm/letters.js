import { GLYPH_OUTLINES, LETTER_SETS, OUTLINE_EM } from "./letterOutlines.js";
export { LETTER_SETS, OUTLINE_EM };
/** The colours of every drawn letter's edge and shadow, whatever its own. */
export const LETTER_LOOK = { edge: "#ffffff", shadow: "#1f344f", shadowOpacity: 0.2 };
/**
 * How a letter is painted on a card, in shares of the side of its alphabet's
 * box: the `ring` of white edge around the ink, and its shadow — the ink drawn
 * again `shadowY` lower, spread by `shadowRing` on each side.
 */
export const LETTER_ART = { ring: 0.016, shadowY: 0.035, shadowRing: 0.035 };
/**
 * The same for a line of writing, in ems: the edge's stroke, how far down the
 * shadow is and how wide its stroke (it is spread by half of that each side).
 */
export const TEXT_ART_LOOK = { edge: 0.03, shadowY: 0.045, shadowSpread: 0.07 };
/** The outline of a character — a letter, a digit, a mark — or null when it has none. */
export function glyphShape(char) {
    const outline = Object.prototype.hasOwnProperty.call(GLYPH_OUTLINES, char)
        ? GLYPH_OUTLINES[char]
        : undefined;
    if (!outline) {
        return null;
    }
    const [advance, left, top, right, bottom, path] = outline;
    return { advance, box: { x: left, y: top, width: right - left, height: bottom - top }, path };
}
/** The alphabet a letter belongs to — capitals and small letters apart — or null for anything else. */
export function letterSetOf(char) {
    if (char === "") {
        return null;
    }
    for (const name of Object.keys(LETTER_SETS)) {
        if (LETTER_SETS[name].includes(char)) {
            return name;
        }
    }
    return null;
}
const setLines = new Map();
/**
 * The line an alphabet is written on: from the top of its tallest letter to
 * the foot of its deepest, and the side of the square every letter of it is
 * shown in. One for the whole alphabet, so a letter keeps its true size
 * beside the others — "ა" is as small next to "ქ" as it is in a book.
 */
function setLine(name) {
    const known = setLines.get(name);
    if (known) {
        return known;
    }
    let top = 0;
    let bottom = 0;
    let widest = 0;
    for (const char of LETTER_SETS[name]) {
        const shape = glyphShape(char);
        if (shape) {
            top = Math.min(top, shape.box.y);
            bottom = Math.max(bottom, shape.box.y + shape.box.height);
            widest = Math.max(widest, shape.box.width);
        }
    }
    const line = { top, bottom, side: Math.max(widest, bottom - top) };
    setLines.set(name, line);
    return line;
}
/**
 * A letter as the players draw it on a card, or null for a character that is
 * not a letter of the three alphabets. It stands on its alphabet's line at its
 * true size and in the middle of the square from left to right.
 */
export function letterArt(char) {
    const name = letterSetOf(char);
    const shape = glyphShape(char);
    if (!name || !shape) {
        return null;
    }
    const line = setLine(name);
    const side = line.side;
    const ring = side * LETTER_ART.ring;
    const depth = side * LETTER_ART.shadowY;
    const shadowRing = side * LETTER_ART.shadowRing;
    // Room round the square for whichever reaches further, the edge or the shadow.
    const reach = Math.max(ring, shadowRing);
    const box = {
        x: shape.box.x + shape.box.width / 2 - side / 2,
        y: (line.top + line.bottom) / 2 - side / 2,
        width: side,
        height: side,
    };
    const viewSide = side + reach * 2 + depth;
    return {
        char,
        path: shape.path,
        ink: shape.box,
        box,
        view: { x: box.x - reach - depth / 2, y: box.y - reach, width: viewSide, height: viewSide },
        outline: ring * 2,
        depth,
        shadow: shadowRing * 2,
    };
}
const short = (value) => String(Math.round(value * 10) / 10);
/**
 * The size a letter's picture says it has, as a library picture has one: what
 * is drawn where nothing else sizes it — a canvas, a texture. It is a drawing,
 * so it is as sharp at any other size.
 */
export const LETTER_PICTURE_PX = 512;
/**
 * The letter as an SVG document — what `letterArt` describes, painted in
 * `tone`. For wherever a picture is wanted as an address (see
 * `letterPictureUri`); a player that draws with its own SVG elements builds
 * the same layers from `letterArt`.
 */
export function letterSvg(char, tone) {
    const art = letterArt(char);
    if (!art) {
        return null;
    }
    const { view, ink } = art;
    const viewBox = [view.x, view.y, view.width, view.height].map(short).join(" ");
    const edge = `fill="${LETTER_LOOK.edge}" stroke="${LETTER_LOOK.edge}" stroke-width="${short(art.outline)}" stroke-linejoin="round"`;
    const shadow = `fill="${LETTER_LOOK.shadow}" stroke="${LETTER_LOOK.shadow}" stroke-width="${short(art.shadow)}" stroke-linejoin="round" opacity="${LETTER_LOOK.shadowOpacity}"`;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="${LETTER_PICTURE_PX}" height="${LETTER_PICTURE_PX}" viewBox="${viewBox}">` +
        `<defs>` +
        `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${short(ink.y)}" x2="0" y2="${short(ink.y + ink.height)}">` +
        `<stop offset="0" stop-color="${tone.light}"/><stop offset="1" stop-color="${tone.deep}"/>` +
        `</linearGradient>` +
        `<path id="p" d="${art.path}"/>` +
        `</defs>` +
        `<use href="#p" ${shadow} transform="translate(0 ${short(art.depth)})"/>` +
        `<use href="#p" ${edge}/>` +
        `<use href="#p" fill="url(#g)"/>` +
        `</svg>`);
}
/** What a letter's address starts with: an SVG document written into the address itself. */
export const LETTER_PICTURE_PREFIX = "data:image/svg+xml,";
/**
 * The letter as the address of a picture — the SVG itself, so nothing is
 * fetched — safe to write into an `src`, a CSS `url()` or an attribute of
 * another SVG: it holds no quote, bracket or angle.
 */
export function letterPictureUri(char, tone) {
    const svg = letterSvg(char, tone);
    return svg === null
        ? null
        : LETTER_PICTURE_PREFIX + encodeURIComponent(svg).replace(/[!'()*]/g, (mark) => "%" + mark.charCodeAt(0).toString(16).toUpperCase());
}
// --- A line of writing -------------------------------------------------------
/** How far the pen moves on after a character with no outline of ours, in ems: a wide letter's worth. */
export const TEXT_UNKNOWN_ADVANCE = 0.82;
/** The room added after every character of a line, in ems: the letters wear an outline. */
export const TEXT_TRACKING = 0.03;
/** How far the pen moves on after a character, in ems, the room for its outline included. */
export function textCharAdvance(char) {
    const shape = glyphShape(char);
    return (shape ? shape.advance / OUTLINE_EM : TEXT_UNKNOWN_ADVANCE) + TEXT_TRACKING;
}
/**
 * A line of writing laid out a character at a time, in ems: where each stands
 * and its ink. The line is as wide as its last character's end.
 */
export function layoutTextLine(text) {
    const glyphs = [];
    let x = 0;
    for (const char of text) {
        const shape = glyphShape(char);
        const advance = textCharAdvance(char);
        glyphs.push({ char, x, advance, path: shape && shape.path !== "" ? shape.path : null });
        x += advance;
    }
    return { width: x, glyphs };
}
