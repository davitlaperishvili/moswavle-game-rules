import { GLYPH_OUTLINES, LETTER_SETS, OUTLINE_EM } from "./letterOutlines.js";
export { LETTER_SETS, OUTLINE_EM };
/**
 * How a letter is painted, in shares of the side of its alphabet's box: the
 * `ring` of outline around the ink, the `depth` of the thickness under it, and
 * the shine — the part of the ink that its own copy moved by `shineX`,
 * `shineY` does not cover, in white at `shineOpacity`.
 */
export const LETTER_ART = { ring: 0.05, depth: 0.045, shineX: 0.02, shineY: 0.028, shineOpacity: 0.6 };
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
    const depth = side * LETTER_ART.depth;
    const box = {
        x: shape.box.x + shape.box.width / 2 - side / 2,
        y: (line.top + line.bottom) / 2 - side / 2,
        width: side,
        height: side,
    };
    const viewSide = side + ring * 2 + depth;
    return {
        char,
        path: shape.path,
        ink: shape.box,
        box,
        view: { x: box.x - ring - depth / 2, y: box.y - ring, width: viewSide, height: viewSide },
        outline: ring * 2,
        depth,
        shine: { x: side * LETTER_ART.shineX, y: side * LETTER_ART.shineY, opacity: LETTER_ART.shineOpacity },
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
    const edge = `fill="${tone.outline}" stroke="${tone.outline}" stroke-width="${short(art.outline)}" stroke-linejoin="round"`;
    const frame = `x="${short(view.x)}" y="${short(view.y)}" width="${short(view.width)}" height="${short(view.height)}"`;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="${LETTER_PICTURE_PX}" height="${LETTER_PICTURE_PX}" viewBox="${viewBox}">` +
        `<defs>` +
        `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${short(ink.y)}" x2="0" y2="${short(ink.y + ink.height)}">` +
        `<stop offset="0" stop-color="${tone.light}"/><stop offset="1" stop-color="${tone.deep}"/>` +
        `</linearGradient>` +
        `<path id="p" d="${art.path}"/>` +
        `<mask id="m" maskUnits="userSpaceOnUse" ${frame}>` +
        `<use href="#p" fill="#fff"/><use href="#p" fill="#000" transform="translate(${short(art.shine.x)} ${short(art.shine.y)})"/>` +
        `</mask>` +
        `</defs>` +
        `<use href="#p" ${edge} transform="translate(0 ${short(art.depth)})"/>` +
        `<use href="#p" ${edge}/>` +
        `<use href="#p" fill="url(#g)"/>` +
        `<rect ${frame} fill="#fff" opacity="${art.shine.opacity}" mask="url(#m)"/>` +
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
