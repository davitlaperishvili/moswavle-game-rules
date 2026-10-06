"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_THEME = exports.THEME_NAMES = exports.THEME_PALETTES = void 0;
exports.normalizeThemeName = normalizeThemeName;
exports.contrastRatio = contrastRatio;
/**
 * Dark, the default: a night sky rather than a black screen. Nothing is pure
 * black or pure white (a white letter on black glows and tires the eyes), the
 * surfaces get lighter as they come closer, and the accents are softened so
 * they do not vibrate on the dark.
 */
const dark = {
    background: "#141a2e",
    surface: "#1e2742",
    surfaceSoft: "#29345a",
    border: "#3a4772",
    text: "#f2f5fc",
    textSecondary: "#ccd5ea",
    muted: "#a3b0cf",
    placeholder: "#8f9cbd",
    primary: "#3cc0f8",
    primaryDark: "#1795d4",
    onPrimary: "#06263d",
    primarySoft: "#1c3c5e",
    primaryText: "#5ccbf9",
    success: "#56d48e",
    onSuccess: "#06281a",
    successSoft: "#1d4240",
    successText: "#6ddba0",
    warning: "#fbbf3c",
    onWarning: "#3a2600",
    warningSoft: "#453c2c",
    warningText: "#fccb60",
    danger: "#fb7d8f",
    onDanger: "#3f0914",
    dangerSoft: "#4a2a40",
    dangerText: "#fc97a5",
    violet: "#a996fb",
    onViolet: "#1c1047",
    violetSoft: "#36326a",
    violetText: "#bdaefc",
    shadow: "rgba(4, 8, 20, 0.45)",
    overlay: "rgba(6, 10, 24, 0.68)",
};
/** Light: white cards on a pale blue page, the brand's own sky blue. */
const light = {
    background: "#f2f6fc",
    surface: "#ffffff",
    surfaceSoft: "#e9f1fa",
    border: "#d3e0ef",
    text: "#1b2f4a",
    textSecondary: "#3d526d",
    muted: "#5b6e87",
    placeholder: "#6f8199",
    primary: "#28bbf9",
    primaryDark: "#0f8fd0",
    onPrimary: "#06263d",
    primarySoft: "#dff3fe",
    primaryText: "#0a6ea8",
    success: "#2dc27a",
    onSuccess: "#052616",
    successSoft: "#e0f7ea",
    successText: "#0f7443",
    warning: "#f8b02a",
    onWarning: "#3a2600",
    warningSoft: "#fef2d8",
    warningText: "#9a5507",
    danger: "#d9304c",
    onDanger: "#ffffff",
    dangerSoft: "#fde7ea",
    dangerText: "#c22a3d",
    violet: "#7c4df0",
    onViolet: "#ffffff",
    violetSoft: "#ece6fe",
    violetText: "#6a3de0",
    shadow: "rgba(31, 52, 79, 0.13)",
    overlay: "rgba(15, 23, 42, 0.5)",
};
/**
 * High contrast: black, white and yellow. A card is told from the page by its
 * outline, not by a shade, so `border` is nearly white and shadows are off.
 */
const contrast = {
    background: "#000000",
    surface: "#000000",
    surfaceSoft: "#1a1a1a",
    border: "#c8c8c8",
    text: "#ffffff",
    textSecondary: "#ffffff",
    muted: "#e0e0e0",
    placeholder: "#bdbdbd",
    primary: "#ffe600",
    primaryDark: "#c7b300",
    onPrimary: "#000000",
    primarySoft: "#332e00",
    primaryText: "#ffe600",
    success: "#3dff8b",
    onSuccess: "#000000",
    successSoft: "#00331a",
    successText: "#3dff8b",
    warning: "#ffb020",
    onWarning: "#000000",
    warningSoft: "#332200",
    warningText: "#ffb020",
    danger: "#ff7a7a",
    onDanger: "#000000",
    dangerSoft: "#2e0808",
    dangerText: "#ff7a7a",
    violet: "#cdb4ff",
    onViolet: "#000000",
    violetSoft: "#261a40",
    violetText: "#cdb4ff",
    shadow: "rgba(0, 0, 0, 0)",
    overlay: "rgba(0, 0, 0, 0.86)",
};
/**
 * Calm: for a child whom bright colour and sharp edges tire or upset. Warm
 * sand instead of white, soft charcoal instead of black, and every accent
 * dusty — no red, no loud yellow. It is the opposite of the high-contrast
 * theme on purpose: text stays easy to read (WCAG AA), nothing else stands out.
 */
const calm = {
    background: "#f1ede4",
    surface: "#faf7f0",
    surfaceSoft: "#e9e3d6",
    border: "#d5cdbd",
    text: "#37404a",
    textSecondary: "#48525c",
    muted: "#5a636c",
    placeholder: "#7a8188",
    primary: "#8fb3cf",
    primaryDark: "#6f96b5",
    onPrimary: "#1c2f3f",
    primarySoft: "#dfe8ee",
    primaryText: "#3b6283",
    success: "#9cc0a5",
    onSuccess: "#1d3626",
    successSoft: "#dfe9dd",
    successText: "#3a6647",
    warning: "#dfc083",
    onWarning: "#3d2e0e",
    warningSoft: "#efe5cd",
    warningText: "#73541a",
    danger: "#d79c96",
    onDanger: "#40201c",
    dangerSoft: "#f0dfda",
    dangerText: "#8a433d",
    violet: "#b0a6d0",
    onViolet: "#292343",
    violetSoft: "#e4e0ec",
    violetText: "#594c86",
    shadow: "rgba(84, 72, 52, 0.1)",
    overlay: "rgba(58, 54, 46, 0.45)",
};
exports.THEME_PALETTES = { dark, light, calm, contrast };
/** The order the themes are offered in. */
exports.THEME_NAMES = ["dark", "light", "calm", "contrast"];
exports.DEFAULT_THEME = "dark";
/** Names a device may still remember from the themes there were before these. */
const RETIRED_THEME_NAMES = {
    darkblue: "dark",
    violet: "dark",
    accessibility: "contrast",
};
/** A stored theme name, whatever it is, as one of the three. */
function normalizeThemeName(value) {
    if (typeof value !== "string") {
        return exports.DEFAULT_THEME;
    }
    if (Object.prototype.hasOwnProperty.call(exports.THEME_PALETTES, value)) {
        return value; // just checked against the palettes' own keys
    }
    return Object.prototype.hasOwnProperty.call(RETIRED_THEME_NAMES, value) ? RETIRED_THEME_NAMES[value] : exports.DEFAULT_THEME;
}
/** WCAG relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex) {
    const value = parseInt(hex.slice(1), 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
        const share = channel / 255;
        return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
/** WCAG contrast ratio of two `#rrggbb` colours, from 1 (the same) to 21. */
function contrastRatio(first, second) {
    const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
    const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (lighter + 0.05) / (darker + 0.05);
}
