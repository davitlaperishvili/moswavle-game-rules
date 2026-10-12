/** The size the outlines are drawn at: this many units to the em. */
export declare const OUTLINE_EM = 1000;
/** The alphabets whose letters are drawn, in their own order; the Georgian one has no capitals. */
export declare const LETTER_SETS: {
    readonly ka: "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
    readonly ru: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    readonly ruLower: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    readonly en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    readonly enLower: "abcdefghijklmnopqrstuvwxyz";
};
/**
 * A character's outline: how far the pen moves on after it, the box its ink
 * fills (left, top, right, bottom) and the ink itself as an SVG path. The
 * baseline is y = 0 and y grows downwards, as on a screen.
 */
export type GlyphOutline = readonly [advance: number, left: number, top: number, right: number, bottom: number, path: string];
export declare const GLYPH_OUTLINES: Readonly<Record<string, GlyphOutline>>;
