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

/**
 * Dark, the default: a night sky rather than a black screen. Nothing is pure
 * black or pure white (a white letter on black glows and tires the eyes), the
 * surfaces get lighter as they come closer, and the accents are softened so
 * they do not vibrate on the dark.
 */
const dark: ThemePalette = {
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
const light: ThemePalette = {
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
const contrast: ThemePalette = {
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

export const THEME_PALETTES: Record<ThemeName, ThemePalette> = { dark, light, contrast };

/** The order the themes are offered in. */
export const THEME_NAMES: readonly ThemeName[] = ["dark", "light", "contrast"];

export const DEFAULT_THEME: ThemeName = "dark";

/** Names a device may still remember from before there were three themes. */
const RETIRED_THEME_NAMES: Record<string, ThemeName> = {
  darkblue: "dark",
  violet: "dark",
  accessibility: "contrast",
};

/** A stored theme name, whatever it is, as one of the three. */
export function normalizeThemeName(value: unknown): ThemeName {
  if (typeof value !== "string") {
    return DEFAULT_THEME;
  }

  if (Object.prototype.hasOwnProperty.call(THEME_PALETTES, value)) {
    return value as ThemeName; // just checked against the palettes' own keys
  }

  return Object.prototype.hasOwnProperty.call(RETIRED_THEME_NAMES, value) ? RETIRED_THEME_NAMES[value] : DEFAULT_THEME;
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const share = channel / 255;
    return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio of two `#rrggbb` colours, from 1 (the same) to 21. */
export function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}
