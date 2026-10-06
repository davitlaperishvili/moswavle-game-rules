/**
 * The colour themes of both clients.
 *
 * Not a game rule, but it has the same reason to live here: the site and the
 * app must show the same colours, and this package is the one thing they both
 * install. Each client turns a palette into its own kind of style (CSS
 * variables on the site, style objects in the app) and never writes a theme
 * colour of its own.
 *
 * The lesson player is outside of this: a game is drawn on its own scene and
 * looks the same in every theme.
 */
export type ThemeName = "dark" | "light" | "contrast";
/**
 * One theme. Every colour is a plain `#rrggbb` except `shadow` and `overlay`,
 * which carry their own transparency.
 *
 * For each of the five accents there are four colours:
 *   `x`      a filled shape (a button, a badge, a bar);
 *   `onX`    text and icons on that fill;
 *   `xSoft`  a quiet tinted background (a chip, a note);
 *   `xText`  text and icons of that accent on a surface or on `xSoft`.
 * `x` itself is not safe as text: on a light surface a bright fill is too pale
 * to read.
 */
export type ThemePalette = {
    /** The page. */
    background: string;
    /** A card, a sheet, a menu. */
    surface: string;
    /** A block inside a card: a field, a row, the track of a bar. */
    surfaceSoft: string;
    /** Outlines and dividers. */
    border: string;
    /** Titles and anything that must be read first. */
    text: string;
    /** Running text. */
    textSecondary: string;
    /** Captions and hints. */
    muted: string;
    /** A field's placeholder. */
    placeholder: string;
    primary: string;
    /** The pressed state and the lower edge of a chunky button. */
    primaryDark: string;
    onPrimary: string;
    primarySoft: string;
    primaryText: string;
    success: string;
    onSuccess: string;
    successSoft: string;
    successText: string;
    warning: string;
    onWarning: string;
    warningSoft: string;
    warningText: string;
    danger: string;
    onDanger: string;
    dangerSoft: string;
    dangerText: string;
    violet: string;
    onViolet: string;
    violetSoft: string;
    violetText: string;
    /** The colour of a card's shadow. */
    shadow: string;
    /** The dimmed page behind a sheet or a dialog. */
    overlay: string;
};
export declare const THEME_PALETTES: Record<ThemeName, ThemePalette>;
/** The order the themes are offered in. */
export declare const THEME_NAMES: readonly ThemeName[];
export declare const DEFAULT_THEME: ThemeName;
/** A stored theme name, whatever it is, as one of the three. */
export declare function normalizeThemeName(value: unknown): ThemeName;
/** WCAG contrast ratio of two `#rrggbb` colours, from 1 (the same) to 21. */
export declare function contrastRatio(first: string, second: string): number;
