/**
 * Moswavle game rules.
 *
 * How authored game data becomes something playable: which fields are read,
 * what the defaults are, how lives and timers and correctness are decided.
 *
 * Shared by the web player and the mobile app on purpose. Renderers stay
 * platform-specific — Phaser and the DOM on one side, react-native-svg on the
 * other — but both must interpret an authored game identically, or the same
 * game scores differently depending on the device it is played on.
 */

/**
 * The bits of a game these rules actually read.
 *
 * Deliberately minimal and without an index signature: both clients have their
 * own richer `LessonGame`, and a TypeScript interface is not assignable to a
 * type that carries an index signature. Keeping this narrow lets either client
 * pass its own type straight in.
 */
export type AuthoredGame = {
  id: string;
  game_type?: string;
  title?: string;
  data?: Record<string, unknown> | null;
};

export type PreparedOption = {
  id: string;
  label: string;
  image: string | null;
  isCorrect?: boolean;
  value: string;
};

export type PreparedGame = {
  mainImage: string | null;
  questionText: string | null;
  options: PreparedOption[];
  hasCorrectness: boolean;
  correctOptionIds: string[];
  selectionMode: "single" | "multiple";
};

export type SuccessState = {
  pointsAwarded: number | null;
  pointsBase: number;
  isFirstAttemptBonus: boolean;
};

export type RuntimeGameKind =
  | "catch-correct"
  | "shadow-match"
  | "memory-cards"
  | "images_order"
  | "drag-drop-match"
  | "select-option"
  | "answer-choice"
  | "svg-assemble"
  | "jigsaw"
  | "count-pick"
  | "pattern-next"
  | "sort-bins"
  | "size-order"
  | "connect-pairs"
  | "math-equation"
  | "generic";

export type AnswerChoiceOption = {
  id: string;
  image: string;
  label: string | null;
  isCorrect: boolean;
  /** How many times the card shows its picture (`layoutPictureCopies`); 1 when unset. */
  copies?: number;
};

export type AnswerChoiceLayout = "stacked" | "split";

export type AnswerChoiceConfig = {
  questionImage: string | null;
  bg_image: string | null;
  layout: AnswerChoiceLayout;
  answers: AnswerChoiceOption[];
  correctOptionIds: string[];
  selectionMode: "single" | "multiple";
  time_limit: number;
  lives: number;
};

export type MemoryFace = {
  type: "image" | "text";
  value: string;
  /** An image face may show its picture several times: three apples on one card. */
  copies?: number;
};

export type MemoryPair = {
  id: string;
  a: MemoryFace;
  b: MemoryFace;
};

export type CatchCorrectConfig = {
  items: Array<{
    label: string;
    correct: boolean;
    /** A falling picture shown several times, at most CATCH_CORRECT_COPIES_MAX: catch the pairs. */
    copies?: number;
  }>;
  target: number;
  lives: number;
  frequency: number;
  speed: number;
  time_limit: number | null;
  bg_image: string | null;
};

export type ShadowMatchConfig = {
  items: Array<{
    id: string;
    label: string;
  }>;
  bg_image: string | null;
  time_limit: number | null;
  lives: number;
};

export type MemoryCardsConfig = {
  pairs: MemoryPair[];
  time_limit: number | null;
  max_moves: number | null;
  bg_image: string | null;
};

/** One pair to connect: what the left group shows, and its partner in the right group. */
export type ConnectPairsPair = {
  id: string;
  left: MemoryFace;
  right: MemoryFace;
};

export type ConnectPairsConfig = {
  /** At most `CONNECT_PAIRS_MAX`, in authored order. */
  pairs: ConnectPairsPair[];
  /** Pair ids in the order the left group shows them. */
  leftOrder: string[];
  /** Pair ids in the order the right group shows them; no partner sits straight across. */
  rightOrder: string[];
  time_limit: number | null;
  lives: number;
  bg_image: string | null;
  /** Every picture the child must see before the clock starts: the pictured faces and the background. */
  imageUris: string[];
};

export type ImageOrderItem = {
  id: string;
  image: string;
  label: string | null;
  /** How many times the step shows its picture: one apple, two apples, three. */
  copies?: number;
};

export type ImageOrderConfig = {
  items: ImageOrderItem[];
  time_limit: number | null;
  bg_image: string | null;
  show_example: number;
  lives: number;
};

export type SizeOrderStep = {
  id: string;
  /** 0..1 of the largest. Multiply the drawn size by this. */
  scale: number;
  /** Position in the finished row, zero-based. */
  rank: number;
};

export type SizeOrderConfig = {
  image: string | null;
  /** Home order: rank 0 first. Players shuffle it. */
  steps: SizeOrderStep[];
  /** Which way round the finished row goes. */
  direction: "ascending" | "descending";
  bg_image: string | null;
  time_limit: number | null;
};

export type CountPickChoice = {
  id: string;
  value: number;
  isCorrect: boolean;
};

/** One picture placed by the author, in percent of the board. */
export type CountPickPlacement = {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** One of the things to count; the rest are there to be ignored. */
  counted: boolean;
};

/**
 * How the child answers, which follows what a child of that age can do:
 *
 * - `tap`       tap every one, and the game counts aloud. No digit to know:
 *                counting is one thing, one word. The last one counted wins.
 *                Played without lives (`countPickUsesLives`): nothing a child
 *                this young taps can lose the game.
 * - `tap_dots`  the same, then the card with as many dots — a quantity
 *                matched to a quantity, still without a digit.
 * - `digits`    count by eye and tap the digit.
 */
export type CountPickMode = "tap" | "tap_dots" | "digits";

export type CountPickConfig = {
  /** The object to count. One picture, repeated. */
  image: string | null;
  /** How many copies to lay out — or, for a composed scene, how many placements are counted. */
  count: number;
  mode: CountPickMode;
  /** The numbers offered, already shuffled. Dots in `tap_dots`, unused in `tap`. */
  choices: CountPickChoice[];
  /**
   * The recorded number words, "one" at index 0, as far as `count`. `null`
   * where there is no recording: the players then fall back to a plain sound.
   */
  countVoice: Array<string | null>;
  bg_image: string | null;
  time_limit: number | null;
  lives: number;
  /**
   * A scene built in the Scene Composer: every picture where the author put
   * it, counted ones and decoys alike. Empty for the classic game, whose
   * player lays out `count` copies of `image` itself.
   */
  placements: CountPickPlacement[];
  /** The composed scene's background size; its aspect ratio is the board's. */
  board: { width: number; height: number } | null;
  /**
   * The library's digit pictures, by digit — the same ones a math example is
   * written with. A digit without a picture is drawn by the players in the
   * same style.
   */
  glyphs: Partial<Record<MathEquationGlyph, string>>;
  /** Everything the game draws, for the players to preload. */
  imageUris: string[];
  /** The number words there are recordings of, for the players to preload. */
  audioUris: string[];
};

export type PatternItem = {
  id: string;
  image: string;
  /** How many times the picture is shown: a pattern of counts, one-two-one-two. */
  copies?: number;
};

export type PatternNextConfig = {
  /** The repeating unit: A-B, or A-B-C, or A-A-B. */
  pattern: PatternItem[];
  /** The run shown to the child, already expanded from the pattern. */
  sequence: PatternItem[];
  /** The one that comes next. */
  answer: PatternItem | null;
  /** The pattern's own items, shuffled, as the things to choose between. */
  choices: PatternItem[];
  bg_image: string | null;
  time_limit: number | null;
  lives: number;
};

export type SortBin = {
  id: string;
  label: string | null;
  image: string | null;
  /** A bin's picture shown several times: the "three" bin as three apples, for children who read no digits. */
  copies?: number;
};

export type SortBinsItem = {
  id: string;
  image: string;
  label: string | null;
  binId: string;
  /** How many times the thing shows its picture: sorting by how many. */
  copies?: number;
};

export type SortBinsConfig = {
  bins: SortBin[];
  /** Shuffled, because the authored order is usually bin by bin. */
  items: SortBinsItem[];
  bg_image: string | null;
  time_limit: number | null;
  lives: number;
};

export type JigsawPiece = {
  /** Stable across a shuffle, so a player can key React children by it. */
  id: string;
  /** Column and row of the piece's home, zero-based. */
  column: number;
  row: number;
};

export type JigsawConfig = {
  image: string | null;
  columns: number;
  rows: number;
  /** Home order, left to right and top to bottom. Players shuffle it. */
  pieces: JigsawPiece[];
  /** Show the finished picture faintly under the board. */
  showGuide: boolean;
  time_limit: number | null;
  lives: number;
};

export type DragDropMatchPromptType = "text" | "image" | "number";

/**
 * How the drop zones are drawn. `card` and `outline` frame each zone on a
 * cover-scaled board with a floating tray. `scene` is a Scene Composer game:
 * the whole background (never cropped), each zone shown only as its
 * silhouette or number, the placed picture filling it, and the tray below.
 */
export type DragDropMatchZoneStyle = "card" | "outline" | "scene";

export type DragDropMatchItem = {
  id: string;
  image: string;
  label: string | null;
  matchKey: string;
};

export type DragDropMatchZone = {
  id: string;
  matchKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  promptType: DragDropMatchPromptType;
  promptText: string | null;
  promptImage: string | null;
};

export type DragDropMatchConfig = {
  items: DragDropMatchItem[];
  zones: DragDropMatchZone[];
  time_limit: number | null;
  bg_image: string | null;
  board_width: number;
  board_height: number;
  zone_style: DragDropMatchZoneStyle;
};

export type SelectOptionItem = {
  id: string;
  image: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  isCorrect: boolean;
};

export type SelectOptionConfig = {
  items: SelectOptionItem[];
  time_limit: number | null;
  lives: number;
  bg_image: string | null;
  board_width: number;
  board_height: number;
  /**
   * `free`: the background covers the stage and each picture is sized by the
   * player (layoutSelectOptionItems). `scene`: a Scene Composer game — the
   * whole background, never cropped, and every picture exactly the size and
   * place the author gave it.
   */
  layout: "free" | "scene";
};

export type SvgViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type SvgAssembleSlot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SvgAssembleAnswer = {
  id: string;
  svg: string;
  label: string | null;
  isCorrect: boolean;
  slotId: string | null;
};

export type SvgAssembleConfig = {
  questionSvg: string | null;
  viewBox: SvgViewBox;
  slots: SvgAssembleSlot[];
  /**
   * A composed scene's other pictures (`<image id="layer_N">` in the markup),
   * so they can be kept whole too. Null for a hand-made scene, which cannot be
   * rearranged.
   */
  layers: SvgAssembleSlot[] | null;
  requiredSlotIds: string[];
  slot: SvgAssembleSlot;
  answers: SvgAssembleAnswer[];
  bg_image: string | null;
  time_limit: number;
  lives: number;
  /**
   * Every remote picture the scene and the pieces draw — a scene composed
   * from library pictures references them by URL. Preload these before the
   * clock starts, as the other picture games do.
   */
  imageUris: string[];
};

/** The signs an example is written with. `-` is the minus, whatever dash the author typed. */
export type MathEquationSign = "+" | "-" | "=" | "<" | ">";

/** Every character an example is drawn with, each a picture from the library when there is one. */
export type MathEquationGlyph =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | MathEquationSign
  | "?";

/** One place in the example, left to right: a number or a sign, shown or left for the child to fill. */
export type MathEquationTerm =
  | {
      id: string;
      kind: "number";
      value: number;
      /** Drawn as `value` copies of this picture (three cows) instead of digits. */
      image: string | null;
      missing: boolean;
    }
  | { id: string; kind: "sign"; value: MathEquationSign; missing: boolean };

/** An answer card: a number (in digits, or as that many copies of a picture) or a sign. */
export type MathEquationCard =
  | { id: string; kind: "number"; value: number; image: string | null }
  | { id: string; kind: "sign"; value: MathEquationSign };

export type MathEquationConfig = {
  /** The example, left to right; numbers and signs alternate, with exactly one comparison sign. */
  terms: MathEquationTerm[];
  /** The missing terms, left to right: the order the child fills them in. One or two. */
  blankIds: string[];
  /** Number cards first (shuffled), then sign cards in their natural order. */
  cards: MathEquationCard[];
  /** The library picture of each glyph; a glyph without one is drawn as a character. */
  glyphs: Partial<Record<MathEquationGlyph, string>>;
  bg_image: string | null;
  time_limit: number | null;
  lives: number;
  /** Every picture the example and the cards draw, and the background: preload before the clock. */
  imageUris: string[];
};

type BuildPreparedGameOptions = {
  useFallbackLabels?: boolean;
};

const DEFAULT_ANSWER_CHOICE_TIME_LIMIT = 60;
const DEFAULT_SELECT_OPTION_WIDTH = 16;
const DEFAULT_SELECT_OPTION_HEIGHT = 24;

const IMAGE_KEYS = [
  "main_image",
  "question_image",
  "image",
  "hero_image",
  "card_image",
  "illustration",
  "prompt_image",
  "picture",
];

function normalizeAnswerChoiceLayout(value: unknown): AnswerChoiceLayout {
  if (typeof value !== "string") {
    return "stacked";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (
    [
      "split",
      "side_by_side",
      "sidebyside",
      "two_column",
      "two_columns",
      "image_left",
      "left_image",
      "question_left",
    ].includes(normalized)
  ) {
    return "split";
  }

  return "stacked";
}

function normalizeDragDropZoneStyle(value: unknown): DragDropMatchZoneStyle {
  if (typeof value !== "string") {
    return "card";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (["outline", "outlined", "ghost", "dashed", "transparent"].includes(normalized)) {
    return "outline";
  }

  if (normalized === "scene") {
    return "scene";
  }

  return "card";
}

function normalizeDragDropPromptType(value: unknown): DragDropMatchPromptType {
  if (typeof value !== "string") {
    return "text";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "image") {
    return "image";
  }

  if (["number", "count", "numeric"].includes(normalized)) {
    return "number";
  }

  return "text";
}

const QUESTION_TEXT_KEYS = [
  "question_text",
  "prompt_text",
  "question",
  "prompt",
  "instruction",
  "instruction_text",
];

const OPTION_COLLECTION_KEYS = [
  "options",
  "choices",
  "answers",
  "cards",
  "items",
  "variants",
  "missing_options",
  "mo_options",
  "answer_options",
];
const OPTION_TEXT_KEYS = ["label", "title", "name", "text", "answer", "value"];
const OPTION_IMAGE_KEYS = [
  "image",
  "image_url",
  "icon",
  "thumbnail",
  "picture",
  "photo",
  "svg",
  "object_image",
  "animal_image",
];
const CORRECT_ANSWER_KEYS = ["correct_answer", "right_answer", "correct_value", "expected"];
const NESTED_CONFIG_KEYS = ["data", "config", "settings", "payload", "game_data"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === "" || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractText(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function extractMediaUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() !== "" ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractMediaUrl(item);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  const candidate = asRecord(value);
  if (!candidate) {
    return null;
  }

  if (candidate.sizes && typeof candidate.sizes === "object") {
    const sizes = candidate.sizes as Record<string, unknown>;
    for (const key of ["large", "medium_large", "medium", "thumbnail"]) {
      const nested = extractMediaUrl(sizes[key]);
      if (nested) {
        return nested;
      }
    }
  }

  for (const key of ["url", "src", "image", "image_url"]) {
    const nested = extractMediaUrl(candidate[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1 ? true : value === 0 ? false : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function extractExampleCount(value: unknown): number | null {
  const numericValue = extractNumber(value);
  if (numericValue !== null) {
    return Math.max(0, Math.floor(numericValue));
  }

  const booleanValue = extractBoolean(value);
  if (booleanValue !== null) {
    return booleanValue ? 1 : 0;
  }

  return null;
}

function normalizeValue(value: string | null): string {
  return value ? value.trim().toLowerCase() : "";
}

function extractMainImage(config: Record<string, unknown>): string | null {
  for (const key of IMAGE_KEYS) {
    const image = extractMediaUrl(config[key]);
    if (image) {
      return image;
    }
  }

  return null;
}

function extractQuestionText(config: Record<string, unknown>): string | null {
  for (const key of QUESTION_TEXT_KEYS) {
    const text = extractText(config[key]);
    if (text) {
      return text;
    }
  }

  return null;
}

function extractOptionsSource(config: Record<string, unknown>): unknown[] {
  for (const key of OPTION_COLLECTION_KEYS) {
    if (Array.isArray(config[key])) {
      return config[key] as unknown[];
    }
  }

  return [];
}

function optionHasCorrectness(option: unknown): boolean {
  const optionRecord = asRecord(option);
  if (!optionRecord) {
    return false;
  }

  return ["correct", "is_correct", "isCorrect"].some((key) => key in optionRecord);
}

function optionHasImage(option: unknown): boolean {
  const optionRecord = asRecord(option);
  if (!optionRecord) {
    return false;
  }

  return OPTION_IMAGE_KEYS.some((key) => Boolean(extractMediaUrl(optionRecord[key])));
}

function normalizeBackground(config: Record<string, unknown>): string | null {
  for (const key of ["bg_image", "background_image", "background", "bg"]) {
    const image = extractMediaUrl(config[key]);
    if (image) {
      return image;
    }
  }

  return null;
}

function clampPercentage(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function normalizeMemoryFace(value: unknown): MemoryFace | null {
  const directRecord = asRecord(value);

  if (directRecord && (directRecord.type === "image" || directRecord.type === "text")) {
    const resolvedValue =
      directRecord.type === "image"
        ? extractMediaUrl(directRecord.value)
        : extractText(directRecord.value);

    if (resolvedValue) {
      return {
        type: directRecord.type,
        value: resolvedValue,
        // A word is written once; only a picture repeats.
        copies: directRecord.type === "image" ? normalizePictureCopies(directRecord.copies) : 1,
      };
    }
  }

  const image = extractMediaUrl(value);
  if (image) {
    return {
      type: "image",
      value: image,
      copies: 1,
    };
  }

  const text = extractText(value);
  if (text) {
    return {
      type: "text",
      value: text,
      copies: 1,
    };
  }

  return null;
}

/* ---------------------------------------------------------------------------
 * Several copies of one picture on a card
 * ------------------------------------------------------------------------ */

/**
 * The most copies of one picture a card shows. Six is a 3 × 2 grid — still a
 * picture each a child can tell apart and count on a phone; counting further
 * belongs to count_pick, which has a whole scene to spread over.
 */
export const PICTURE_COPIES_MAX = 6;

/**
 * The most copies a falling Catch Correct picture shows. It is counted on the
 * move, at a glance: three is still a shape, four is already a count.
 */
export const CATCH_CORRECT_COPIES_MAX = 3;

/** Share of each copy's cell left empty around it, so neighbours never touch. */
export const PICTURE_COPIES_GAP = 0.12;

/** A copy's box, in fractions of the card it sits in. */
export type PictureCopyBox = { left: number; top: number; width: number; height: number };

/** An authored copy count, whole and within 1…PICTURE_COPIES_MAX; 1 when unset. */
export function normalizePictureCopies(value: unknown): number {
  const count = extractNumber(value);

  if (count === null || !Number.isFinite(count)) {
    return 1;
  }

  return Math.min(PICTURE_COPIES_MAX, Math.max(1, Math.floor(count)));
}

/**
 * Where each copy of a picture sits on a card of the given width / height.
 *
 * All copies are the same size — a count must not look like a size question
 * — and as big as the card allows: rows are tried one by one and the
 * arrangement with the biggest copies wins, ties going to fewer rows. Rows
 * are centred, the fuller ones at the bottom, so three is a little pyramid and
 * five sits as two over three: shapes a child counts at a glance. One copy
 * fills the card, exactly as a card without copies does.
 */
export function layoutPictureCopies(count: number, aspect = 1): PictureCopyBox[] {
  const copies = normalizePictureCopies(count);
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  if (copies === 1) {
    return [{ left: 0, top: 0, width: 1, height: 1 }];
  }

  // Worked in a box `ratio` wide and 1 high.
  let best = { rows: 1, cell: 0 };

  for (let rows = 1; rows <= copies; rows++) {
    const columns = Math.ceil(copies / rows);

    // A whole row left empty is the same arrangement with a gap in it.
    if (columns * rows - copies >= columns) {
      continue;
    }

    const cell = Math.min(ratio / columns, 1 / rows);

    if (cell > best.cell + 1e-9) {
      best = { rows, cell };
    }
  }

  const { rows, cell } = best;
  const base = Math.floor(copies / rows);
  const fuller = copies % rows;
  const inset = (cell * PICTURE_COPIES_GAP) / 2;
  const top = (1 - rows * cell) / 2;
  const boxes: PictureCopyBox[] = [];

  for (let row = 0; row < rows; row++) {
    const inRow = base + (row >= rows - fuller ? 1 : 0);
    const left = (ratio - inRow * cell) / 2;

    for (let column = 0; column < inRow; column++) {
      boxes.push({
        left: (left + column * cell + inset) / ratio,
        top: top + row * cell + inset,
        width: (cell - 2 * inset) / ratio,
        height: cell - 2 * inset,
      });
    }
  }

  return boxes;
}

export function getRuntimeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const parsedConfig = parseMaybeJson(config);
  const rootConfig = asRecord(parsedConfig) ?? config;

  for (const key of NESTED_CONFIG_KEYS) {
    const nested = parseMaybeJson(rootConfig[key]);
    const nestedRecord = asRecord(nested);

    if (nestedRecord) {
      return nestedRecord;
    }
  }

  return rootConfig;
}

export function buildPreparedGame(
  game: AuthoredGame,
  config: Record<string, unknown>,
  fallbackOptionLabel: (index: number) => string,
  buildOptions: BuildPreparedGameOptions = {},
): PreparedGame {
  const mainImage = extractMainImage(config);
  const questionText = extractQuestionText(config);
  const correctIndex = extractNumber(config.correct_index);
  const correctAnswer =
    CORRECT_ANSWER_KEYS.map((key) => extractText(config[key])).find(Boolean) ?? null;

  const options = extractOptionsSource(config)
    .map((option, index): PreparedOption | null => {
      if (typeof option === "string" || typeof option === "number") {
        const label = String(option);
        return {
          id: `${game.id}-${index}`,
          label,
          image: null,
          value: label,
        };
      }

      const optionRecord = asRecord(option);
      if (!optionRecord) {
        return null;
      }

      const explicitLabel =
        OPTION_TEXT_KEYS.map((key) => extractText(optionRecord[key])).find(Boolean) ?? null;
      const label =
        explicitLabel ??
        (buildOptions.useFallbackLabels === false ? "" : fallbackOptionLabel(index + 1));
      const image =
        OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(optionRecord[key])).find(Boolean) ?? null;
      const explicitCorrect =
        extractBoolean(optionRecord.correct) ??
        extractBoolean(optionRecord.is_correct) ??
        extractBoolean(optionRecord.isCorrect) ??
        undefined;
      const value =
        extractText(optionRecord.value) ??
        extractText(optionRecord.key) ??
        extractText(optionRecord.slug) ??
        explicitLabel ??
        `${game.id}-${index}`;

      return {
        id: `${game.id}-${index}`,
        label,
        image,
        isCorrect: explicitCorrect,
        value,
      };
    })
    .filter((option): option is PreparedOption => Boolean(option))
    .map((option, index, preparedOptions) => {
      if (option.isCorrect !== undefined) {
        return option;
      }

      if (correctIndex !== null) {
        return {
          ...option,
          isCorrect: index === correctIndex,
        };
      }

      if (correctAnswer) {
        const isCorrect =
          normalizeValue(option.value) === normalizeValue(correctAnswer) ||
          normalizeValue(option.label) === normalizeValue(correctAnswer);

        return {
          ...option,
          isCorrect,
        };
      }

      const anyCorrectDefined = preparedOptions.some((candidate) => candidate.isCorrect !== undefined);
      return anyCorrectDefined ? { ...option, isCorrect: false } : option;
    });

  const correctOptionIds = options
    .filter((option) => option.isCorrect === true)
    .map((option) => option.id);

  return {
    mainImage,
    questionText,
    options,
    hasCorrectness: options.some((option) => option.isCorrect !== undefined),
    correctOptionIds,
    selectionMode: correctOptionIds.length > 1 ? "multiple" : "single",
  };
}

export function normalizeAnswerChoiceConfig(
  game: AuthoredGame,
  config: Record<string, unknown>,
): AnswerChoiceConfig {
  const rawAnswers = Array.isArray(config.answers)
    ? config.answers
    : extractOptionsSource(config);
  const answers = rawAnswers
    .map((answer, index): AnswerChoiceOption | null => {
      const record = asRecord(answer);
      const image = record
        ? extractMediaUrl(record.image) ??
          extractMediaUrl(record.image_url) ??
          extractMediaUrl(record.picture)
        : extractMediaUrl(answer);

      if (!image) {
        return null;
      }

      return {
        id: record ? extractText(record.id) ?? `${game.id}-answer-${index}` : `${game.id}-answer-${index}`,
        image,
        label: record
          ? extractText(record.label) ?? extractText(record.title) ?? null
          : null,
        isCorrect: record
          ? extractBoolean(record.is_correct) ?? extractBoolean(record.correct) ?? false
          : false,
        copies: record ? normalizePictureCopies(record.copies) : 1,
      };
    })
    .filter((answer): answer is AnswerChoiceOption => Boolean(answer));
  const correctOptionIds = answers
    .filter((answer) => answer.isCorrect)
    .map((answer) => answer.id);

  return {
    questionImage: extractMediaUrl(config.question_image),
    bg_image: normalizeBackground(config),
    layout: normalizeAnswerChoiceLayout(
      config.question_layout ?? config.display_layout ?? config.presentation_layout ?? config.layout,
    ),
    answers,
    correctOptionIds,
    selectionMode: correctOptionIds.length > 1 ? "multiple" : "single",
    time_limit: extractNumber(config.time_limit) ?? DEFAULT_ANSWER_CHOICE_TIME_LIMIT,
    lives: Math.max(
      1,
      Math.floor(
        extractNumber(config.lives) ??
          extractNumber(config.answer_choice_lives) ??
          extractNumber(config.answer_lives) ??
          extractNumber(config.ac_lives) ??
          3,
      ),
    ),
  };
}

/** Proportions of the stacked answer_choice layout, width over height. */
export const ANSWER_CHOICE_STACK = {
  /** An answer card: nearly square, so the picture fills it. */
  cardAspect: 1.15,
  /** The question panel is wider than a card: most question pictures are. */
  questionAspect: 1.35,
  /** The question panel is at least this much taller than a card… */
  minQuestionScale: 1.3,
  /** …and grows into the room left over up to this much. */
  maxQuestionScale: 1.8,
  /** A card never grows past this height, however big the stage. */
  maxCardHeight: 320,
} as const;

export type AnswerChoiceStackLayout = {
  gap: number;
  questionWidth: number;
  questionHeight: number;
  columns: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  /** The answer rows' width; an incomplete last row is centred in it. */
  gridWidth: number;
};

/**
 * The stacked answer_choice layout: the question picture on top, as the
 * biggest thing on the stage, the answers under it as nearly square cards.
 *
 * Every column count is tried and the one giving the biggest cards wins — on
 * a landscape screen that is usually every answer in one row, on a portrait
 * one two columns. The question panel then takes the height left over, within
 * `ANSWER_CHOICE_STACK`. Sizes are for the area the client lays the game out
 * in (its padding already taken off).
 */
export function layoutAnswerChoiceStack(
  areaWidth: number,
  areaHeight: number,
  answerCount: number,
): AnswerChoiceStackLayout {
  const width = Math.max(areaWidth, 1);
  const height = Math.max(areaHeight, 1);
  const count = Math.max(answerCount, 1);
  const gap = clampNumber(Math.min(width, height) * 0.03, 8, 20);
  const { cardAspect, questionAspect, minQuestionScale, maxQuestionScale, maxCardHeight } = ANSWER_CHOICE_STACK;

  let best = { columns: 1, rows: count, cardHeight: 0, complete: false };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const cardHeight = Math.min(
      // The question panel and every row fit the height…
      (height - rows * gap) / (minQuestionScale + rows),
      // …the cards of a row fit the width…
      (width - (columns - 1) * gap) / columns / cardAspect,
      // …and so does the question panel.
      width / (questionAspect * minQuestionScale),
      maxCardHeight,
    );
    const complete = count % columns === 0;
    // Bigger cards win; on a tie, full rows, then fewer columns.
    if (
      cardHeight > best.cardHeight + 0.5 ||
      (Math.abs(cardHeight - best.cardHeight) <= 0.5 && complete && !best.complete)
    ) {
      best = { columns, rows, cardHeight, complete };
    }
  }

  const cardHeight = Math.max(Math.floor(best.cardHeight), 1);
  const cardWidth = Math.floor(cardHeight * cardAspect);
  const questionHeight = Math.floor(
    Math.max(
      Math.min(height - best.rows * (cardHeight + gap), cardHeight * maxQuestionScale, width / questionAspect),
      1,
    ),
  );

  return {
    gap,
    questionWidth: Math.floor(Math.min(questionHeight * questionAspect, width)),
    questionHeight,
    columns: best.columns,
    rows: best.rows,
    cardWidth,
    cardHeight,
    gridWidth: best.columns * cardWidth + (best.columns - 1) * gap,
  };
}

function normalizeGameTypeValue(type: string) {
  return type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveGameKind(
  type: string,
  config: Record<string, unknown>,
): RuntimeGameKind {
  const normalizedType = normalizeGameTypeValue(type);

  if ([
    "svg_assemble",
    "svgassemble",
    "svg_puzzle",
    "svgpuzzle",
    "assemble_svg",
    "svg_missing",
    "svgmissing",
    "svg_slot",
    "fill_svg_slot",
  ].includes(normalizedType)) {
    return "svg-assemble";
  }

  if ([
    "jigsaw",
    "jigsaw_puzzle",
    "jigsawpuzzle",
    "picture_puzzle",
    "puzzle",
  ].includes(normalizedType)) {
    return "jigsaw";
  }

  if ([
    "count_pick",
    "countpick",
    "count_and_pick",
    "counting",
    "how_many",
  ].includes(normalizedType)) {
    return "count-pick";
  }

  if ([
    "pattern_next",
    "patternnext",
    "continue_pattern",
    "sequence_pattern",
    "what_comes_next",
  ].includes(normalizedType)) {
    return "pattern-next";
  }

  if ([
    "sort_bins",
    "sortbins",
    "sorting",
    "sort_into_groups",
    "group_sort",
  ].includes(normalizedType)) {
    return "sort-bins";
  }

  if ([
    "size_order",
    "sizeorder",
    "order_by_size",
    "big_to_small",
    "biggest_smallest",
  ].includes(normalizedType)) {
    return "size-order";
  }

  if ([
    "catch_correct",
    "catchcorrect",
    "catch_the_correct",
    "catch",
    "catch_correct_game",
  ].includes(normalizedType)) {
    return "catch-correct";
  }

  if ([
    "shadow_match",
    "match_shadow",
    "matchshadow",
    "shadowmatch",
    "shadow_match_game",
  ].includes(normalizedType)) {
    return "shadow-match";
  }

  if ([
    "connect_pairs",
    "connectpairs",
    "connect_the_pairs",
    "match_pairs",
    "matchpairs",
    "matching_pairs",
    "make_pairs",
    "pair_match",
    "pairmatch",
    "draw_lines",
  ].includes(normalizedType)) {
    return "connect-pairs";
  }

  if ([
    "math_equation",
    "mathequation",
    "math_example",
    "math_examples",
    "math_problem",
    "equation",
    "number_sentence",
    "compare_numbers",
  ].includes(normalizedType)) {
    return "math-equation";
  }

  if ([
    "memory_cards",
    "memory",
    "memorycards",
    "memory_card",
    "memory_game",
  ].includes(normalizedType)) {
    return "memory-cards";
  }

  if ([
    "images_order",
    "imagesorder",
    "image_order",
    "imageorder",
    "order_images",
    "orderimages",
    "sequence_order",
    "put_in_order",
    "putinorder",
  ].includes(normalizedType)) {
    return "images_order";
  }

  if ([
    "drag_drop_match",
    "dragdropmatch",
    "drag_drop",
    "dragdrop",
    "drop_match",
    "dropmatch",
    "match_to_zone",
    "place_on_scene",
  ].includes(normalizedType)) {
    return "drag-drop-match";
  }

  if ([
    "select_option",
    "selectoption",
    "scene_select_option",
    "select_option_scene",
    "absolute_select_option",
    "absolute_option_select",
  ].includes(normalizedType)) {
    return "select-option";
  }

  if ([
    "answer_choice",
    "answerchoice",
    "multiple_choice",
    "multiplechoice",
    "choose_correct_answer",
    "choosecorrectanswer",
    "correct_answer",
    "select_answer",
    "selectanswer",
  ].includes(normalizedType)) {
    return "answer-choice";
  }

  if (Array.isArray(config.pairs)) {
    return "memory-cards";
  }

  const optionsSource = extractOptionsSource(config);
  const hasOptionImages = optionsSource.some((option) => optionHasImage(option));
  const hasOptionCorrectness = optionsSource.some((option) => optionHasCorrectness(option));
  const hasCatchSignals = ["target", "target_score", "score_target", "frequency", "speed", "lives"].some(
    (key) => extractNumber(config[key]) !== null,
  );
  const hasDragDropSignals =
    Array.isArray(config.zones) ||
    Array.isArray(config.ddm_zones) ||
    Array.isArray(config.drop_zones) ||
    Array.isArray(config.draggable_items) ||
    Array.isArray(config.ddm_items);
  const hasSelectOptionSignals =
    Array.isArray(config.so_items) ||
    Array.isArray(config.select_option_items) ||
    Array.isArray(config.scene_options) ||
    Array.isArray(config.select_items);
  const hasOrderSignals =
    Array.isArray(config.order_items) ||
    Array.isArray(config.sequence_items) ||
    Array.isArray(config.steps) ||
    extractExampleCount(config.show_example) !== null ||
    extractExampleCount(config.images_order_show_example) !== null ||
    extractExampleCount(config.io_show_example) !== null ||
    extractExampleCount(config.order_show_example) !== null;

  if (hasOrderSignals && hasOptionImages) {
    return "images_order";
  }

  if (hasSelectOptionSignals) {
    return "select-option";
  }

  if (hasDragDropSignals) {
    return "drag-drop-match";
  }

  if (hasCatchSignals && hasOptionCorrectness) {
    return "catch-correct";
  }

  if (Array.isArray(config.answers)) {
    return "answer-choice";
  }

  return "generic";
}

export function normalizeCatchCorrectConfig(
  config: Record<string, unknown>,
): CatchCorrectConfig {
  const rawItems = extractOptionsSource(config);
  const items = rawItems
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return {
            label: String(item),
            correct: false,
          };
        }

        const record = asRecord(item);
        if (!record) {
          return null;
        }

        const label =
          extractMediaUrl(record.label) ??
          OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(record[key])).find(Boolean) ??
          OPTION_TEXT_KEYS.map((key) => extractText(record[key])).find(Boolean);
        const correct =
          extractBoolean(record.correct) ??
          extractBoolean(record.is_correct) ??
          extractBoolean(record.isCorrect) ??
          false;

        if (!label) {
          return null;
        }

        return {
          label,
          correct,
          // Only a picture repeats, and a falling one no more than a glance can count.
          copies: isImageReference(label)
            ? Math.min(CATCH_CORRECT_COPIES_MAX, normalizePictureCopies(record.copies ?? record.cc_copies))
            : 1,
        };
      })
      .filter((item): item is { label: string; correct: boolean; copies: number } => Boolean(item));

  return {
    // A game authored without items would spawn nothing and could never be won.
    items: items.length > 0 ? items : DEFAULT_CATCH_CORRECT_ITEMS.map((item) => ({ ...item })),
    target:
      extractNumber(config.target) ??
      extractNumber(config.target_score) ??
      extractNumber(config.score_target) ??
      10,
    lives: extractNumber(config.lives) ?? 3,
    frequency: Math.max(CATCH_CORRECT_MIN_FREQUENCY_MS, extractNumber(config.frequency) ?? 1200),
    speed: extractNumber(config.speed) ?? 120,
    time_limit: extractNumber(config.time_limit),
    bg_image: normalizeBackground(config),
  };
}

export function normalizeShadowMatchConfig(
  config: Record<string, unknown>,
): ShadowMatchConfig {
  const rawItems = extractOptionsSource(config);

  return {
    items: rawItems
      .map((item, index) => {
        if (typeof item === "string" || typeof item === "number") {
          return { id: `shadow-${index}`, label: String(item) };
        }

        const record = asRecord(item);
        if (!record) {
          return null;
        }

        const label =
          extractMediaUrl(record.label) ??
          OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(record[key])).find(Boolean) ??
          OPTION_TEXT_KEYS.map((key) => extractText(record[key])).find(Boolean);

        return label
          ? { id: extractText(record.id) ?? `shadow-${index}`, label }
          : null;
      })
      .filter((item): item is { id: string; label: string } => Boolean(item)),
    bg_image: normalizeBackground(config),
    time_limit:
      extractNumber(config.time_limit) ??
      extractNumber(config.shadow_match_time_limit) ??
      extractNumber(config.shadow_time_limit),
    lives: Math.max(
      1,
      Math.floor(
        extractNumber(config.lives) ??
          extractNumber(config.shadow_match_lives) ??
          extractNumber(config.shadow_lives) ??
          3,
      ),
    ),
  };
}

export function normalizeImageOrderConfig(
  config: Record<string, unknown>,
): ImageOrderConfig {
  const rawItems = Array.isArray(config.items)
    ? config.items
    : Array.isArray(config.order_items)
      ? config.order_items
      : Array.isArray(config.sequence_items)
        ? config.sequence_items
        : Array.isArray(config.steps)
          ? config.steps
          : [];

  return {
    items: rawItems
      .map((item, index): ImageOrderItem | null => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          const directImage = extractMediaUrl(item);
          return directImage
            ? {
              id: `images_order-${index + 1}`,
              image: directImage,
              label: null,
              copies: 1,
            }
            : null;
        }

        const record = item as Record<string, unknown>;
        const image =
          extractMediaUrl(record.image) ??
          extractMediaUrl(record.item_image) ??
          extractMediaUrl(record.step_image) ??
          extractMediaUrl(record.picture) ??
          null;

        if (!image) {
          return null;
        }

        return {
          id:
            extractText(record.id) ??
            extractText(record.key) ??
            extractText(record.slug) ??
            `images_order-${index + 1}`,
          image,
          label:
            extractText(record.label) ??
            extractText(record.title) ??
            extractText(record.name) ??
            null,
          copies: normalizePictureCopies(record.copies),
        };
      })
      .filter((item): item is ImageOrderItem => Boolean(item)),
    time_limit:
      extractNumber(config.time_limit) ??
      extractNumber(config.order_time_limit) ??
      extractNumber(config.io_time_limit) ??
      60,
    bg_image: normalizeBackground(config),
    show_example:
      extractExampleCount(config.show_example) ??
      extractExampleCount(config.images_order_show_example) ??
      extractExampleCount(config.io_show_example) ??
      extractExampleCount(config.order_show_example) ??
      0,
    lives: Math.max(
      1,
      Math.floor(
        extractNumber(config.lives) ??
          extractNumber(config.images_order_lives) ??
          extractNumber(config.order_lives) ??
          extractNumber(config.io_lives) ??
          3,
      ),
    ),
  };
}

/**
 * The same object at several sizes, put in order.
 *
 * One picture and a step count is the whole authored input — the sizes are
 * computed here. Nothing else in the catalog teaches bigger and smaller, and
 * for a two-year-old it may be the only comparison they can already make.
 *
 * The smallest is 40% of the largest, not 10%: a step small enough to be
 * ambiguous next to its neighbour turns a comparison into a guess, and at five
 * steps the gap is already down to 15%.
 */
export function normalizeSizeOrderConfig(
  config: Record<string, unknown>,
): SizeOrderConfig {
  const count = Math.max(3, Math.min(5, Math.floor(extractNumber(config.steps) ?? 3)));

  const smallest = 0.4;
  const steps: SizeOrderStep[] = Array.from({ length: count }, (_, index) => ({
    id: `size-${index + 1}`,
    scale: smallest + ((1 - smallest) * index) / (count - 1),
    rank: index,
  }));

  const direction =
    extractText(config.direction) === "descending" ? "descending" : "ascending";

  // `steps` is always smallest-first; descending simply reverses which end the
  // finished row starts at, so the players never have to know the difference.
  const ordered = direction === "descending" ? [...steps].reverse() : steps;

  return {
    image:
      extractMediaUrl(config.image) ??
      extractMediaUrl(config.question_image) ??
      null,
    steps: ordered.map((step, index) => ({ ...step, rank: index })),
    direction,
    bg_image: extractMediaUrl(config.bg_image),
    time_limit: extractNumber(config.time_limit),
  };
}

/**
 * Count the objects, tap the number.
 *
 * One picture and one number is the whole authored input — the copies are laid
 * out here and the wrong answers are generated. That is the point: a single
 * drawing of an apple covers counting from one to ten, where a library of
 * "three apples", "four apples" pictures never would.
 *
 * The distractors are the neighbouring numbers, which is what makes it a
 * counting game rather than a guessing one: a child who counts four gets it
 * right, a child who eyeballs "a few" does not.
 */
export function normalizeCountPickConfig(
  config: Record<string, unknown>,
): CountPickConfig {
  const count = Math.max(1, Math.min(10, Math.floor(extractNumber(config.count) ?? 3)));
  const image = extractMediaUrl(config.image) ?? extractMediaUrl(config.question_image) ?? null;
  const mode: CountPickMode = config.mode === "tap" || config.mode === "tap_dots" ? config.mode : "digits";

  const authored = Array.isArray(config.choices)
    ? config.choices
        .map((choice) => extractNumber(choice))
        .filter((value): value is number => value !== null && value > 0)
    : [];

  // Neighbours first, then outward, until there are enough. Below three the
  // guess is worth too much; above four the row stops fitting a phone.
  const wanted = Math.max(2, Math.min(4, Math.floor(extractNumber(config.choice_count) ?? 3)));
  const values = new Set<number>(authored.length > 0 ? authored : [count]);
  values.add(count);

  for (let step = 1; values.size < wanted && step <= 10; step += 1) {
    if (count - step >= 1) {
      values.add(count - step);
    }
    if (values.size < wanted) {
      values.add(count + step);
    }
  }

  const choices = shuffle(Array.from(values).slice(0, wanted)).map((value) => ({
    id: `count-${value}`,
    value,
    isCorrect: value === count,
  }));

  const clampPercent = (value: number | null) => Math.max(0, Math.min(100, value ?? 0));
  const placements = (Array.isArray(config.placements) ? config.placements : [])
    .map((raw): CountPickPlacement | null => {
      const record = asRecord(raw);
      const url = record ? extractMediaUrl(record.image) : null;
      if (!record || !url) {
        return null;
      }
      const x = clampPercent(extractNumber(record.x));
      const y = clampPercent(extractNumber(record.y));
      const width = Math.min(100 - x, clampPercent(extractNumber(record.width)));
      const height = Math.min(100 - y, clampPercent(extractNumber(record.height)));
      // A scene that does not say is the old kind: every copy of the counted
      // picture counts.
      const counted = "counted" in record ? Boolean(record.counted) : url === image;
      return width > 0 && height > 0 ? { image: url, x, y, width, height, counted } : null;
    })
    .filter((placement): placement is CountPickPlacement => Boolean(placement));

  const boardWidth = extractNumber(config.board_width);
  const boardHeight = extractNumber(config.board_height);
  const board =
    placements.length > 0 && boardWidth && boardHeight && boardWidth > 0 && boardHeight > 0
      ? { width: boardWidth, height: boardHeight }
      : null;
  const voices = Array.isArray(config.count_voice) ? config.count_voice : [];
  const countVoice = Array.from({ length: count }, (_, index) => extractMediaUrl(voices[index]));

  const glyphSource = asRecord(config.glyphs) ?? {};
  const glyphs: Partial<Record<MathEquationGlyph, string>> = {};
  COUNT_PICK_DIGITS.forEach((digit) => {
    const url = extractMediaUrl(glyphSource[digit]);
    if (url) glyphs[digit] = url;
  });

  // Only the digits this game writes: the numbers offered, or — counted by
  // tapping — the numbers the pictures get.
  const written = mode === "digits"
    ? choices.map((choice) => choice.value)
    : Array.from({ length: count }, (_, index) => index + 1);
  const digits = new Set(written.flatMap((value) => mathNumberGlyphs(value)));

  return {
    image,
    count,
    mode,
    choices,
    countVoice,
    bg_image: extractMediaUrl(config.bg_image),
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
    placements,
    board,
    imageUris: [
      ...new Set(
        [
          extractMediaUrl(config.bg_image),
          image,
          ...placements.map((placement) => placement.image),
          ...COUNT_PICK_DIGITS.filter((digit) => digits.has(digit)).map((digit) => glyphs[digit] ?? null),
        ].filter((uri): uri is string => Boolean(uri)),
      ),
    ],
    glyphs,
    audioUris: [...new Set(countVoice.filter((uri): uri is string => Boolean(uri)))],
  };
}

const COUNT_PICK_DIGITS: readonly MathEquationGlyph[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** What a tap on a picture of a counting scene comes to. */
export type CountPickTapOutcome =
  /** One more counted: `number` is the word to say, `complete` once it was the last. */
  | { kind: "counted"; number: number; complete: boolean }
  /**
   * Counted already (as `number`): not to be tapped again. The players say so
   * — the wrong sound, a shake, a red glow — which makes it a mistake for the
   * result, but it takes no life in any mode.
   */
  | { kind: "repeat"; number: number }
  /** Not one of the things to count: a mistake, like any wrong answer. */
  | { kind: "decoy" };

/**
 * The whole tap rule of the counting modes (`tap`, `tap_dots`): each thing to
 * count is counted once, in whatever order the child points at them.
 */
export function resolveCountPickTap(tap: {
  /** Whether the picture is one of the things to count. */
  counted: boolean;
  /** The number this very picture was counted as, 0 if it has not been. */
  countedAs: number;
  /** How many were counted before this tap. */
  countedSoFar: number;
  total: number;
}): CountPickTapOutcome {
  if (!tap.counted) {
    return { kind: "decoy" };
  }
  if (tap.countedAs > 0) {
    return { kind: "repeat", number: tap.countedAs };
  }
  const number = tap.countedSoFar + 1;
  return { kind: "counted", number, complete: number >= tap.total };
}

/**
 * Whether a counting game is played with lives. Counted by tapping alone
 * (`tap`, the youngest) it is not: a picture that is not to be counted still
 * gets the wrong sound and marks the mistake, but takes nothing and cannot end
 * the game — so the players draw no lives either. Where a card is chosen
 * (`tap_dots`, `digits`) a wrong one costs a life as in any game.
 */
export function countPickUsesLives(mode: CountPickMode): boolean {
  return mode !== "tap";
}

/**
 * Which picture the hand points at, counted by tapping: the first thing to
 * count that has not been counted — one picture, never one to ignore, so the
 * hint shows what to do without giving the count away. `null` once there is
 * nothing left to point at.
 */
export function countPickHintTarget<T extends { id: string; counted: boolean }>(
  pictures: readonly T[],
  countedIds: readonly string[],
): string | null {
  return pictures.find((picture) => picture.counted && !countedIds.includes(picture.id))?.id ?? null;
}

/**
 * Where the dots of a dot card stand, in fractions of the card (a square),
 * with the dot radius. One to six are the faces of a die, which a child knows
 * from board games; past six the dots stand in short rows, since a row longer
 * than four is read as "many" rather than counted.
 */
export function countPickDots(value: number): { dots: Array<{ x: number; y: number }>; radius: number } {
  const count = Math.max(1, Math.min(12, Math.floor(value)));
  const dice: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
    6: [[0.3, 0.24], [0.7, 0.24], [0.3, 0.5], [0.7, 0.5], [0.3, 0.76], [0.7, 0.76]],
  };

  if (dice[count]) {
    return { dots: dice[count].map(([x, y]) => ({ x, y })), radius: 0.1 };
  }

  const rows: Record<number, number[]> = {
    7: [2, 3, 2],
    8: [3, 2, 3],
    9: [3, 3, 3],
    10: [3, 4, 3],
    11: [4, 3, 4],
    12: [4, 4, 4],
  };
  const step = 0.21;
  const dots = rows[count].flatMap((length, row) =>
    Array.from({ length }, (_, column) => ({
      x: 0.5 + (column - (length - 1) / 2) * step,
      y: 0.5 + (row - 1) * 0.25,
    })),
  );

  return { dots, radius: 0.08 };
}

/**
 * The largest box of the board's aspect ratio that fits the space, for a scene
 * built in the Scene Composer: the whole background stays visible, so every
 * picture and zone is exactly where the author put it.
 */
export function fitSceneBoard(
  availableWidth: number,
  availableHeight: number,
  board: { width: number; height: number },
): { width: number; height: number } {
  if (availableWidth <= 0 || availableHeight <= 0 || board.width <= 0 || board.height <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(availableWidth / board.width, availableHeight / board.height);
  return { width: board.width * scale, height: board.height * scale };
}

/** @deprecated Use fitSceneBoard; kept for 1.8.x callers. */
export const fitCountPickBoard = fitSceneBoard;

/** A box in percent of the board (the background's own proportions). */
export type ScenePercentBox = { x: number; y: number; width: number; height: number };

/** Where the background lands on the stage, in stage pixels; left/top are ≤ 0. */
export type SceneCover = { left: number; top: number; width: number; height: number; scale: number };

/** Stage edges taken by the player's own controls, in stage pixels. */
export type SceneInsets = { top?: number; right?: number; bottom?: number; left?: number };

/**
 * The background covering the whole stage, as every game must draw it.
 *
 * Covering crops the picture on the sides that do not fit. Instead of always
 * cropping evenly, the crop is shifted so the authored content (the boxes of
 * the scene's pictures, zones or slots) stays in view — centred in the part of
 * the stage the controls leave free when it fits, and kept inside the picture
 * either way.
 */
export function coverSceneBoard(
  stageWidth: number,
  stageHeight: number,
  board: { width: number; height: number },
  content: ReadonlyArray<ScenePercentBox> = [],
  insets: SceneInsets = {},
): SceneCover {
  if (stageWidth <= 0 || stageHeight <= 0 || board.width <= 0 || board.height <= 0) {
    return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
  }

  const scale = Math.max(stageWidth / board.width, stageHeight / board.height);
  const width = board.width * scale;
  const height = board.height * scale;

  const place = (stage: number, size: number, from: number, to: number, before: number, after: number) => {
    const excess = size - stage;
    if (excess <= 0) return 0;
    // Centre the content in the free part of the stage, or the picture on the
    // stage when there is no content.
    const centre = content.length > 0 ? ((from + to) / 2 / 100) * size : size / 2;
    const middle = content.length > 0 ? (before + stage - after) / 2 : stage / 2;
    return Math.min(0, Math.max(-excess, middle - centre));
  };

  const xs = content.map((box) => [box.x, box.x + box.width]).flat();
  const ys = content.map((box) => [box.y, box.y + box.height]).flat();

  return {
    left: place(stageWidth, width, Math.min(...xs, 100), Math.max(...xs, 0), insets.left ?? 0, insets.right ?? 0),
    top: place(stageHeight, height, Math.min(...ys, 100), Math.max(...ys, 0), insets.top ?? 0, insets.bottom ?? 0),
    width,
    height,
    scale,
  };
}

/** A percent box of the board as stage pixels, through the cover transform. */
export function sceneBoxToStage(box: ScenePercentBox, cover: SceneCover): BoardRect {
  return {
    left: cover.left + (box.x / 100) * cover.width,
    top: cover.top + (box.y / 100) * cover.height,
    width: (box.width / 100) * cover.width,
    height: (box.height / 100) * cover.height,
  };
}

export type SceneOverlaySpot = "bottom" | "bottom-left" | "bottom-right" | "top" | "top-left" | "top-right" | "left" | "right";

/**
 * Where to put an overlay (the answer tray, the number buttons) on a scene:
 * the candidate spot that covers the least of the content, preferring the
 * bottom centre. `insets` keep it clear of the stage's own controls along an
 * edge; a spot over one of the `blocked` rects (a button in a corner) is
 * taken only when every spot is.
 */
export function placeSceneOverlay(
  stageWidth: number,
  stageHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  avoid: ReadonlyArray<BoardRect>,
  insets: SceneInsets = {},
  blocked: ReadonlyArray<BoardRect> = [],
): { left: number; top: number; spot: SceneOverlaySpot } {
  const margin = sceneEdge(stageWidth, stageHeight);
  const minLeft = (insets.left ?? 0) + margin;
  const minTop = (insets.top ?? 0) + margin;
  const maxLeft = Math.max(stageWidth - (insets.right ?? 0) - margin - overlayWidth, minLeft);
  const maxTop = Math.max(stageHeight - (insets.bottom ?? 0) - margin - overlayHeight, minTop);
  const midLeft = Math.min(Math.max((stageWidth - overlayWidth) / 2, minLeft), maxLeft);
  const midTop = Math.min(Math.max((stageHeight - overlayHeight) / 2, minTop), maxTop);

  const candidates: Array<{ spot: SceneOverlaySpot; left: number; top: number }> = [
    { spot: "bottom", left: midLeft, top: maxTop },
    { spot: "bottom-left", left: minLeft, top: maxTop },
    { spot: "bottom-right", left: maxLeft, top: maxTop },
    { spot: "top", left: midLeft, top: minTop },
    { spot: "top-left", left: minLeft, top: minTop },
    { spot: "top-right", left: maxLeft, top: minTop },
    { spot: "left", left: minLeft, top: midTop },
    { spot: "right", left: maxLeft, top: midTop },
  ];

  const overlap = (left: number, top: number) =>
    avoid.reduce((sum, rect) => {
      const w = Math.min(left + overlayWidth, rect.left + rect.width) - Math.max(left, rect.left);
      const h = Math.min(top + overlayHeight, rect.top + rect.height) - Math.max(top, rect.top);
      return sum + (w > 0 && h > 0 ? w * h : 0);
    }, 0);

  // Each step down the preferred order has to save a sliver of cover (an edge
  // margin along the overlay's short side): a picture nudged aside is better
  // than the answers jumping to the top over a pixel or two.
  const preference = Math.min(overlayWidth, overlayHeight) * margin;

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  const onControl = (left: number, top: number) =>
    blocked.some((rect) => rectsOverlap({ left, top, width: overlayWidth, height: overlayHeight }, rect));

  candidates.forEach((candidate, index) => {
    const score = overlap(candidate.left, candidate.top)
      + index * (preference + 0.001)
      + (onControl(candidate.left, candidate.top) ? stageWidth * stageHeight * 10 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  return best;
}

/**
 * The two safe areas of every scene game: the content (pictures, zones, slots)
 * and the answers never touch, and neither leaves the stage.
 */
export const SCENE_SAFE_AREA = {
  /** Clear space between everything and the stage edge (or its controls), as a share of the short side. */
  edge: 0.025,
  /** Clear space between the content and the answers, as a share of the short side. */
  gap: 0.04,
  /**
   * A picture that does not fit is shrunk, but not below this share of its
   * size; past it, it is moved instead.
   */
  minScale: 0.55,
} as const;

function sceneEdge(stageWidth: number, stageHeight: number): number {
  return Math.max(Math.min(stageWidth, stageHeight) * SCENE_SAFE_AREA.edge, 6);
}

function sceneGap(stageWidth: number, stageHeight: number): number {
  return Math.max(Math.min(stageWidth, stageHeight) * SCENE_SAFE_AREA.gap, 16);
}

function rectsOverlap(a: BoardRect, b: BoardRect): boolean {
  return Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
}

function growRect(rect: BoardRect, by: number): BoardRect {
  return { left: rect.left - by, top: rect.top - by, width: rect.width + by * 2, height: rect.height + by * 2 };
}

/**
 * A picture made to fit inside a region. It shrinks towards the side that is
 * still in view, standing where it stood: a character cut at the top keeps
 * its feet where they were, one cut on the left keeps its right side. One cut
 * at the bottom cannot keep its feet anyway, so it moves up whole instead, and
 * shrinks only if it then reaches the top. A picture that would have to shrink
 * past `SCENE_SAFE_AREA.minScale` is moved as well.
 */
export function fitSceneRect(rect: BoardRect, region: BoardRect): BoardRect {
  if (region.width <= 0 || region.height <= 0 || rect.width <= 0 || rect.height <= 0) {
    return rect;
  }

  const epsilon = 1e-6;
  const regionRight = region.left + region.width;
  const regionBottom = region.top + region.height;
  const sunk = rect.top + rect.height - regionBottom;
  const lifted = sunk > epsilon ? { ...rect, top: rect.top - sunk } : rect;
  const right = lifted.left + lifted.width;
  const bottom = lifted.top + lifted.height;
  const outLeft = lifted.left < region.left - epsilon;
  const outRight = right > regionRight + epsilon;
  const outTop = lifted.top < region.top - epsilon;
  if (!outLeft && !outRight && !outTop) {
    return lifted;
  }

  const pivotX = outLeft === outRight ? lifted.left + lifted.width / 2 : outLeft ? right : lifted.left;
  const pivotY = bottom;

  // The largest scale around the pivot that keeps each side inside.
  let scale = 1;
  const limit = (room: number, reach: number) => {
    if (reach > epsilon) scale = Math.min(scale, room / reach);
  };
  limit(pivotX - region.left, pivotX - lifted.left);
  limit(regionRight - pivotX, right - pivotX);
  limit(pivotY - region.top, pivotY - lifted.top);
  scale = Math.max(scale, SCENE_SAFE_AREA.minScale);
  // Whatever happens, it has to fit.
  scale = Math.min(scale, 1, region.width / lifted.width, region.height / lifted.height);

  const width = lifted.width * scale;
  const height = lifted.height * scale;
  const left = pivotX - (pivotX - lifted.left) * scale;
  const top = pivotY - (pivotY - lifted.top) * scale;

  return {
    left: Math.min(Math.max(left, region.left), regionRight - width),
    top: Math.min(Math.max(top, region.top), regionBottom - height),
    width,
    height,
  };
}

/**
 * A picture moved out of the answers' way: above, below, left or right of
 * them, whichever changes it least. It is shifted just clear, then fitted to
 * what room that side has.
 */
function keepSceneRectClear(rect: BoardRect, frame: BoardRect, keepOut: BoardRect): BoardRect {
  if (!rectsOverlap(rect, keepOut)) {
    return rect;
  }

  const frameRight = frame.left + frame.width;
  const frameBottom = frame.top + frame.height;
  const keepRight = keepOut.left + keepOut.width;
  const keepBottom = keepOut.top + keepOut.height;
  const ways: Array<{ region: BoardRect; dx: number; dy: number }> = [
    {
      region: { left: frame.left, top: frame.top, width: frame.width, height: keepOut.top - frame.top },
      dx: 0,
      dy: Math.min(0, keepOut.top - (rect.top + rect.height)),
    },
    {
      region: { left: frame.left, top: keepBottom, width: frame.width, height: frameBottom - keepBottom },
      dx: 0,
      dy: Math.max(0, keepBottom - rect.top),
    },
    {
      region: { left: frame.left, top: frame.top, width: keepOut.left - frame.left, height: frame.height },
      dx: Math.min(0, keepOut.left - (rect.left + rect.width)),
      dy: 0,
    },
    {
      region: { left: keepRight, top: frame.top, width: frameRight - keepRight, height: frame.height },
      dx: Math.max(0, keepRight - rect.left),
      dy: 0,
    },
  ];

  let best = rect;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const way of ways) {
    if (way.region.width <= 0 || way.region.height <= 0) continue;
    const moved = { ...rect, left: rect.left + way.dx, top: rect.top + way.dy };
    const fitted = fitSceneRect(moved, way.region);
    const shift = Math.hypot(
      fitted.left + fitted.width / 2 - (rect.left + rect.width / 2),
      fitted.top + fitted.height / 2 - (rect.top + rect.height / 2),
    );
    const cost = shift + (rect.width - fitted.width) + (rect.height - fitted.height);
    if (cost < bestCost) {
      bestCost = cost;
      best = fitted;
    }
  }

  return best;
}

export type SceneLayout = {
  /** Where the background goes: over the whole stage. */
  cover: SceneCover;
  /** The content's safe area: the stage less its controls and an edge margin. */
  frame: BoardRect;
  /** Every content box in stage pixels, in input order: whole, inside the frame, clear of the answers. */
  content: BoardRect[];
  /** Where the answers go, or null when there are none (or they are not measured yet). */
  overlay: (BoardRect & { spot: SceneOverlaySpot }) | null;
};

/**
 * The layout of every game drawn as a scene, in one place.
 *
 * The background covers the stage, and the content follows it, so a picture
 * stands where the author put it. Covering crops the picture, and the answers
 * float on it, so on top of that two safe areas are kept apart:
 *
 * - the answers go where they would push the fewest pictures away, inside the
 *   stage and clear of its controls;
 * - every content box stays inside the frame and at least a gap away from the
 *   answers. A picture the crop cuts is shrunk until it is whole again; one in
 *   the answers' way is moved clear of them (`fitSceneRect`).
 *
 * `content` is everything that must stay whole — the pictures of the scene as
 * well as its zones and slots. `overlay` is the measured size of the answers.
 * `insets` are edges the player's controls take; `controls` are buttons the
 * player puts on the stage itself (the voice button in its corner): the
 * answers never go over one, and the pictures keep an edge margin from them.
 */
export function layoutScene(
  stageWidth: number,
  stageHeight: number,
  board: { width: number; height: number },
  content: ReadonlyArray<ScenePercentBox>,
  overlay: { width: number; height: number } | null = null,
  insets: SceneInsets = {},
  controls: ReadonlyArray<BoardRect> = [],
): SceneLayout {
  const cover = coverSceneBoard(stageWidth, stageHeight, board, content, insets);
  const edge = sceneEdge(stageWidth, stageHeight);
  const frame: BoardRect = {
    left: (insets.left ?? 0) + edge,
    top: (insets.top ?? 0) + edge,
    width: Math.max(stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2, 0),
    height: Math.max(stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2, 0),
  };
  const controlKeepOuts = controls.map((rect) => growRect(rect, edge));
  const clearOfControls = (rect: BoardRect) =>
    controlKeepOuts.reduce((current, keepOut) => keepSceneRectClear(current, frame, keepOut), rect);
  const whole = content.map((box) => clearOfControls(fitSceneRect(sceneBoxToStage(box, cover), frame)));

  if (cover.width <= 0 || !overlay || overlay.width <= 0 || overlay.height <= 0) {
    return { cover, frame, content: whole, overlay: null };
  }

  const gap = sceneGap(stageWidth, stageHeight);
  const spot = placeSceneOverlay(
    stageWidth,
    stageHeight,
    overlay.width,
    overlay.height,
    whole.map((rect) => growRect(rect, gap)),
    insets,
    controlKeepOuts,
  );
  const placed = { left: spot.left, top: spot.top, width: overlay.width, height: overlay.height, spot: spot.spot };
  const keepOut = growRect(placed, gap);

  return {
    cover,
    frame,
    // Clear of the answers last: they are the bigger thing to keep apart from.
    content: whole.map((rect) => keepSceneRectClear(rect, frame, keepOut)),
    overlay: placed,
  };
}

/** Card geometry for the svg_assemble answer tray, in stage pixels. */
export const SVG_ASSEMBLE_CARD = {
  /** Space between two cards. */
  gap: 12,
  /** Inset of the white tile inside a card. */
  imagePad: 12,
  /** Room under the tile for a label, when any answer has one. */
  labelHeight: 22,
  /** Padding of the tray panel around the cards. */
  trayPad: 8,
} as const;

export type SvgAssembleSceneLayout = {
  /** The scene (its viewBox) drawn over the whole stage. */
  board: BoardRect;
  slots: Array<BoardRect & { id: string }>;
  /** The scene's other pictures, where they are drawn; see `arrangeSvgAssembleScene`. */
  layers: Array<BoardRect & { id: string }>;
  /** The panel behind the cards, floating on the scene. */
  tray: BoardRect;
  traySpot: SceneOverlaySpot;
  /** The card behind each answer, in answer order. */
  cards: BoardRect[];
  /** The tile inside each card; where a flying piece starts. */
  options: BoardRect[];
  imageSize: number;
  labelHeight: number;
};

/**
 * Where everything of an svg_assemble game goes on its stage, through
 * `layoutScene`: the scene covers the whole stage and the answer cards float
 * on it in a tray. The source and the target rects share the stage's
 * coordinates, so a piece flies straight from its card into its slot.
 * `insets` keep everything clear of the stage's controls.
 *
 * A composed scene passes its `layers` (the pictures that are not slots):
 * those and the slots are then kept whole and clear of the tray, and
 * `arrangeSvgAssembleScene` moves them in the markup to match. A hand-made
 * scene (`layers` null) cannot be rearranged, so its slots follow the picture
 * as they are.
 */
export function layoutSvgAssembleScene(
  stageWidth: number,
  stageHeight: number,
  viewBox: SvgViewBox,
  slots: ReadonlyArray<SvgAssembleSlot>,
  count: number,
  hasLabels: boolean,
  insets: SceneInsets = {},
  layers: ReadonlyArray<SvgAssembleSlot> | null = null,
  controls: ReadonlyArray<BoardRect> = [],
): SvgAssembleSceneLayout | null {
  if (!stageWidth || !stageHeight || !count) {
    return null;
  }

  const vbWidth = viewBox.width || 1;
  const vbHeight = viewBox.height || 1;
  const toBox = (slot: SvgAssembleSlot): ScenePercentBox => ({
    x: ((slot.x - viewBox.minX) / vbWidth) * 100,
    y: ((slot.y - viewBox.minY) / vbHeight) * 100,
    width: (slot.width / vbWidth) * 100,
    height: (slot.height / vbHeight) * 100,
  });
  const slotBoxes = slots.map(toBox);
  const layerBoxes = (layers ?? []).map(toBox);

  const { gap, imagePad, trayPad } = SVG_ASSEMBLE_CARD;
  const labelHeight = hasLabels ? SVG_ASSEMBLE_CARD.labelHeight : 0;
  const usableWidth = stageWidth - (insets.left ?? 0) - (insets.right ?? 0);
  const usableHeight = stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0);
  // The cards sit on the scene, so they take a smaller share than a tray of
  // their own would: about a quarter of the height.
  let cardHeight = Math.min(usableHeight * 0.26, 140);
  let cardWidth = cardHeight - labelHeight;
  const widest = (usableWidth * 0.94 - trayPad * 2 - gap * (count - 1)) / count;
  if (cardWidth > widest) {
    cardWidth = widest;
    cardHeight = cardWidth + labelHeight;
  }
  cardWidth = Math.max(56, cardWidth);
  cardHeight = Math.max(cardHeight, cardWidth + labelHeight);
  const imageSize = cardWidth - imagePad * 2;

  const trayWidth = count * cardWidth + (count - 1) * gap + trayPad * 2;
  const trayHeight = cardHeight + trayPad * 2;
  const scene = layoutScene(
    stageWidth,
    stageHeight,
    { width: vbWidth, height: vbHeight },
    [...slotBoxes, ...layerBoxes],
    { width: trayWidth, height: trayHeight },
    insets,
    controls,
  );
  const board = scene.cover;
  const slotRects = slots.map((slot, index) => ({
    id: slot.id,
    ...(layers ? scene.content[index] : sceneBoxToStage(slotBoxes[index], board)),
  }));
  const layerRects = (layers ?? []).map((layer, index) => ({ id: layer.id, ...scene.content[slots.length + index] }));
  const spot = scene.overlay ?? { left: 0, top: 0, spot: "bottom" as SceneOverlaySpot };
  const tray = { left: spot.left, top: spot.top, width: trayWidth, height: trayHeight };

  const cards: BoardRect[] = [];
  const options: BoardRect[] = [];
  for (let index = 0; index < count; index += 1) {
    const left = tray.left + trayPad + index * (cardWidth + gap);
    const top = tray.top + trayPad;
    cards.push({ left, top, width: cardWidth, height: cardHeight });
    options.push({ left: left + imagePad, top: top + imagePad, width: imageSize, height: imageSize });
  }

  return {
    board: { left: board.left, top: board.top, width: board.width, height: board.height },
    slots: slotRects,
    layers: layerRects,
    tray,
    traySpot: spot.spot,
    cards,
    options,
    imageSize,
    labelHeight,
  };
}

/**
 * The scene markup with its pictures where `layoutSvgAssembleScene` put them:
 * every `<image>` whose id is a slot or a layer gets the box of its stage rect,
 * in viewBox units. Nothing else in the markup changes.
 */
export function arrangeSvgAssembleScene(
  svg: string,
  viewBox: SvgViewBox,
  layout: Pick<SvgAssembleSceneLayout, "board" | "slots" | "layers">,
): string {
  const { board } = layout;
  if (board.width <= 0 || board.height <= 0) {
    return svg;
  }

  const unitX = (viewBox.width || 1) / board.width;
  const unitY = (viewBox.height || 1) / board.height;
  const format = (value: number) => String(Math.round(value * 100) / 100);

  return [...layout.slots, ...layout.layers].reduce((markup, rect) => {
    const box: Record<"x" | "y" | "width" | "height", number> = {
      x: viewBox.minX + (rect.left - board.left) * unitX,
      y: viewBox.minY + (rect.top - board.top) * unitY,
      width: rect.width * unitX,
      height: rect.height * unitY,
    };
    const id = rect.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return markup.replace(new RegExp(`<image\\b[^>]*\\sid="${id}"[^>]*>`), (tag) =>
      (Object.keys(box) as Array<keyof typeof box>).reduce(
        (current, name) => current.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${format(box[name])}$2`),
        tag,
      ),
    );
  }, svg);
}

/**
 * What comes next in the row.
 *
 * The author writes the repeating unit — two or three pictures — and the run is
 * expanded from it here. Two drawings therefore make an unlimited number of
 * games, and the answer is always one of the pattern's own pictures, so there
 * is nothing else to draw.
 *
 * The run is cut so that it always stops mid-unit or at its end, never partway
 * into a repeat that has not started: a child who has seen A-B-A-B is being
 * asked something answerable, one who has seen A-B-A is not.
 */
export function normalizePatternNextConfig(
  config: Record<string, unknown>,
): PatternNextConfig {
  const rawPattern = Array.isArray(config.pattern)
    ? config.pattern
    : Array.isArray(config.items)
      ? config.items
      : [];

  const pattern = rawPattern
    .map((item, index): PatternItem | null => {
      const record =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};

      const image =
        extractMediaUrl(record.image) ??
        extractMediaUrl(record.pn_image) ??
        extractMediaUrl(item) ??
        null;

      if (!image) {
        return null;
      }

      return {
        id: extractText(record.id) ?? `pattern-${index + 1}`,
        image,
        copies: normalizePictureCopies(record.copies ?? record.pn_copies),
      };
    })
    .filter((item): item is PatternItem => item !== null);

  if (pattern.length < 2) {
    return {
      pattern,
      sequence: [],
      answer: null,
      choices: [],
      bg_image: extractMediaUrl(config.bg_image),
      time_limit: extractNumber(config.time_limit),
      lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
    };
  }

  // At least two full repeats, or there is no pattern to have noticed.
  const repeats = Math.max(2, Math.min(4, Math.floor(extractNumber(config.repeats) ?? 2)));
  const length = Math.min(pattern.length * repeats, 12);

  const sequence: PatternItem[] = [];
  for (let index = 0; index < length; index += 1) {
    const source = pattern[index % pattern.length];
    sequence.push({ id: `${source.id}-${index + 1}`, image: source.image, copies: source.copies });
  }

  const answer = pattern[length % pattern.length];

  return {
    pattern,
    sequence,
    answer,
    choices: shuffle(pattern),
    bg_image: extractMediaUrl(config.bg_image),
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
  };
}

/**
 * Many things into a few containers.
 *
 * Not drag_drop_match: there every item has its own zone, here a bin takes as
 * many as belong in it. That is what makes it a game about the *rule* — fruit
 * against vegetable, wild against tame — rather than about matching pictures.
 *
 * Items are shuffled because the authored order is nearly always bin by bin,
 * which would hand the answer over for free.
 */
export function normalizeSortBinsConfig(
  config: Record<string, unknown>,
): SortBinsConfig {
  const rawBins = Array.isArray(config.bins) ? config.bins : [];

  const bins = rawBins
    .map((bin, index): SortBin | null => {
      const record =
        bin && typeof bin === "object" && !Array.isArray(bin)
          ? (bin as Record<string, unknown>)
          : {};

      const id =
        extractText(record.id) ??
        extractText(record.sb_bin_id) ??
        extractText(record.key) ??
        `bin-${index + 1}`;

      const label = extractText(record.label) ?? extractText(record.sb_bin_label);
      const image =
        extractMediaUrl(record.image) ?? extractMediaUrl(record.sb_bin_image);

      // A bin with neither a name nor a picture is invisible.
      if (!label && !image) {
        return null;
      }

      return { id, label, image, copies: normalizePictureCopies(record.copies ?? record.sb_bin_copies) };
    })
    .filter((bin): bin is SortBin => bin !== null);

  const binIds = new Set(bins.map((bin) => bin.id));

  const rawItems = Array.isArray(config.items) ? config.items : [];

  const items = rawItems
    .map((item, index): SortBinsItem | null => {
      const record =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};

      const image =
        extractMediaUrl(record.image) ?? extractMediaUrl(record.sb_item_image);
      const binId =
        extractText(record.binId) ??
        extractText(record.sb_bin_id) ??
        extractText(record.bin) ??
        null;

      // An item pointing at a bin that does not exist can never be placed, so
      // it is dropped rather than left to make the game unwinnable.
      if (!image || !binId || !binIds.has(binId)) {
        return null;
      }

      return {
        id: extractText(record.id) ?? `sort-item-${index + 1}`,
        image,
        label: extractText(record.label),
        binId,
        copies: normalizePictureCopies(record.copies ?? record.sb_item_copies),
      };
    })
    .filter((item): item is SortBinsItem => item !== null);

  return {
    bins,
    items: shuffle(items),
    bg_image: extractMediaUrl(config.bg_image),
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
  };
}

/**
 * A picture cut into a grid.
 *
 * The pieces are not authored — the whole point is that any picture in the
 * library becomes a game without anybody preparing anything. So the config
 * carries the grid, and the players slice the image themselves with
 * background-position (web) or a clipped view (native).
 *
 * The board is clamped to something a small child can finish: fewer than two
 * columns is not a puzzle, and more than four of anything is a chore. An
 * authored 5×5 is corrected rather than refused, because a spec that is merely
 * ambitious should still produce a playable game.
 */
export function normalizeJigsawConfig(
  config: Record<string, unknown>,
): JigsawConfig {
  const clampAxis = (value: number | null, fallback: number): number =>
    Math.max(1, Math.min(4, Math.floor(value ?? fallback)));

  let columns = clampAxis(
    extractNumber(config.columns) ?? extractNumber(config.jig_columns),
    2,
  );
  let rows = clampAxis(
    extractNumber(config.rows) ?? extractNumber(config.jig_rows),
    2,
  );

  // 1×1 is a picture, not a puzzle. Grow the shorter axis rather than refuse.
  if (columns * rows < 2) {
    columns = 2;
    rows = 1;
  }

  const pieces: JigsawPiece[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      pieces.push({ id: `piece-${row + 1}-${column + 1}`, column, row });
    }
  }

  return {
    image:
      extractMediaUrl(config.image) ??
      extractMediaUrl(config.question_image) ??
      extractMediaUrl(config.bg_image) ??
      null,
    columns,
    rows,
    pieces,
    // Defaults on: without the picture underneath, a four-year-old is
    // rearranging abstract rectangles.
    showGuide: extractBoolean(config.show_guide) ?? true,
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
  };
}

export function normalizeDragDropMatchConfig(
  config: Record<string, unknown>,
): DragDropMatchConfig {
  const rawZones = Array.isArray(config.zones)
    ? config.zones
    : Array.isArray(config.ddm_zones)
      ? config.ddm_zones
      : Array.isArray(config.drop_zones)
        ? config.drop_zones
        : [];
  const rawItems = Array.isArray(config.ddm_items)
    ? config.ddm_items
    : Array.isArray(config.draggable_items)
      ? config.draggable_items
      : Array.isArray(config.items)
        ? config.items
        : [];

  const seenZoneKeys = new Set<string>();
  const zones = rawZones
    .map((zone, index): DragDropMatchZone | null => {
      const record = asRecord(zone);
      if (!record) {
        return null;
      }

      const matchKey =
        extractText(record.match_key) ??
        extractText(record.ddm_match_key) ??
        extractText(record.target_key) ??
        extractText(record.key);
      if (!matchKey) {
        return null;
      }

      const normalizedMatchKey = normalizeValue(matchKey);
      if (!normalizedMatchKey || seenZoneKeys.has(normalizedMatchKey)) {
        return null;
      }

      const x =
        extractNumber(record.x) ??
        extractNumber(record.ddm_x) ??
        extractNumber(record.zone_x) ??
        extractNumber(record.left);
      const y =
        extractNumber(record.y) ??
        extractNumber(record.ddm_y) ??
        extractNumber(record.zone_y) ??
        extractNumber(record.top);
      const width =
        extractNumber(record.width) ??
        extractNumber(record.ddm_width) ??
        extractNumber(record.zone_width) ??
        extractNumber(record.w);
      const height =
        extractNumber(record.height) ??
        extractNumber(record.ddm_height) ??
        extractNumber(record.zone_height) ??
        extractNumber(record.h);

      if (x === null || y === null || width === null || height === null) {
        return null;
      }

      const clampedX = clampPercentage(x);
      const clampedY = clampPercentage(y);
      const clampedWidth = clampPercentage(width);
      const clampedHeight = clampPercentage(height);
      const finalWidth = Math.min(clampedWidth, 100 - clampedX);
      const finalHeight = Math.min(clampedHeight, 100 - clampedY);

      if (finalWidth <= 0 || finalHeight <= 0) {
        return null;
      }

      const promptType = normalizeDragDropPromptType(
        record.prompt_type ?? record.ddm_prompt_type ?? record.type,
      );
      const promptText =
        extractText(record.prompt_text) ??
        extractText(record.ddm_prompt_text) ??
        extractText(record.prompt_value) ??
        extractText(record.label) ??
        extractText(record.title) ??
        extractText(record.number);
      const promptImage =
        extractMediaUrl(record.prompt_image) ??
        extractMediaUrl(record.ddm_prompt_image) ??
        extractMediaUrl(record.image);

      if (promptType === "image" && !promptImage) {
        return null;
      }

      seenZoneKeys.add(normalizedMatchKey);

      return {
        id:
          extractText(record.id) ??
          extractText(record.zone_id) ??
          extractText(record.ddm_zone_id) ??
          `drag_drop_zone_${index + 1}`,
        matchKey,
        x: clampedX,
        y: clampedY,
        width: finalWidth,
        height: finalHeight,
        promptType,
        promptText: promptType === "image" ? null : promptText ?? `${index + 1}`,
        promptImage,
      };
    })
    .filter((zone): zone is DragDropMatchZone => Boolean(zone));

  const seenItemKeys = new Set<string>();
  const items = rawItems
    .map((item, index): DragDropMatchItem | null => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const matchKey =
        extractText(record.match_key) ??
        extractText(record.ddm_match_key) ??
        extractText(record.target_key) ??
        extractText(record.key);
      const image =
        extractMediaUrl(record.image) ??
        extractMediaUrl(record.ddm_item_image) ??
        extractMediaUrl(record.item_image) ??
        extractMediaUrl(record.picture) ??
        extractMediaUrl(record.photo);

      if (!matchKey || !image) {
        return null;
      }

      const normalizedMatchKey = normalizeValue(matchKey);
      if (!normalizedMatchKey || seenItemKeys.has(normalizedMatchKey)) {
        return null;
      }

      seenItemKeys.add(normalizedMatchKey);

      return {
        id:
          extractText(record.id) ??
          extractText(record.item_id) ??
          extractText(record.ddm_item_id) ??
          `drag_drop_item_${index + 1}`,
        image,
        label:
          extractText(record.label) ??
          extractText(record.title) ??
          extractText(record.name) ??
          null,
        matchKey,
      };
    })
    .filter((item): item is DragDropMatchItem => Boolean(item));

  const validMatchKeys = new Set(
    zones
      .map((zone) => normalizeValue(zone.matchKey))
      .filter((zoneKey) => items.some((item) => normalizeValue(item.matchKey) === zoneKey)),
  );

  const filteredZones = zones.filter((zone) => validMatchKeys.has(normalizeValue(zone.matchKey)));
  const filteredItems = items.filter((item) => validMatchKeys.has(normalizeValue(item.matchKey)));
  const boardWidth =
    extractNumber(config.board_width) ??
    extractNumber(config.ddm_board_width) ??
    extractNumber(config.bg_width) ??
    extractNumber(config.background_width) ??
    1600;
  const boardHeight =
    extractNumber(config.board_height) ??
    extractNumber(config.ddm_board_height) ??
    extractNumber(config.bg_height) ??
    extractNumber(config.background_height) ??
    900;

  return {
    // Shuffled here, like sort_bins: the authored order is nearly always zone by
    // zone, which would hand the answer over, and both players must shuffle alike.
    items: shuffle(filteredItems),
    zones: filteredZones,
    time_limit:
      extractNumber(config.time_limit) ??
      extractNumber(config.ddm_time_limit) ??
      extractNumber(config.drag_drop_time_limit),
    bg_image: normalizeBackground(config),
    board_width: Math.max(1, Math.round(boardWidth)),
    board_height: Math.max(1, Math.round(boardHeight)),
    zone_style: normalizeDragDropZoneStyle(
      config.zone_style ?? config.ddm_zone_style ?? config.drop_zone_style,
    ),
  };
}

export function normalizeSelectOptionConfig(
  config: Record<string, unknown>,
): SelectOptionConfig {
  const rawItems = Array.isArray(config.so_items)
    ? config.so_items
    : Array.isArray(config.select_option_items)
      ? config.select_option_items
      : Array.isArray(config.scene_options)
        ? config.scene_options
        : Array.isArray(config.select_items)
          ? config.select_items
          : Array.isArray(config.items)
            ? config.items
            : [];

  const items = rawItems
    .map((item, index): SelectOptionItem | null => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const image =
        extractMediaUrl(record.image) ??
        extractMediaUrl(record.so_image) ??
        extractMediaUrl(record.option_image) ??
        extractMediaUrl(record.picture) ??
        extractMediaUrl(record.photo);
      const x =
        extractNumber(record.x) ??
        extractNumber(record.so_x) ??
        extractNumber(record.option_x) ??
        extractNumber(record.left);
      const y =
        extractNumber(record.y) ??
        extractNumber(record.so_y) ??
        extractNumber(record.option_y) ??
        extractNumber(record.top);
      const width =
        extractNumber(record.width) ??
        extractNumber(record.so_width) ??
        extractNumber(record.option_width) ??
        extractNumber(record.w);
      const height =
        extractNumber(record.height) ??
        extractNumber(record.so_height) ??
        extractNumber(record.option_height) ??
        extractNumber(record.h);

      if (!image || x === null || y === null) {
        return null;
      }

      const clampedX = clampPercentage(x);
      const clampedY = clampPercentage(y);
      const clampedWidth = clampPercentage(width ?? DEFAULT_SELECT_OPTION_WIDTH);
      const clampedHeight = clampPercentage(height ?? DEFAULT_SELECT_OPTION_HEIGHT);
      const finalWidth = Math.min(clampedWidth, 100 - clampedX);
      const finalHeight = Math.min(clampedHeight, 100 - clampedY);

      if (finalWidth <= 0 || finalHeight <= 0) {
        return null;
      }

      return {
        id:
          extractText(record.id) ??
          extractText(record.so_item_id) ??
          extractText(record.option_id) ??
          `select_option_item_${index + 1}`,
        image,
        label:
          extractText(record.label) ??
          extractText(record.title) ??
          extractText(record.name) ??
          null,
        x: clampedX,
        y: clampedY,
        width: finalWidth,
        height: finalHeight,
        isCorrect:
          extractBoolean(record.is_correct) ??
          extractBoolean(record.so_is_correct) ??
          extractBoolean(record.correct) ??
          false,
      };
    })
    .filter((item): item is SelectOptionItem => Boolean(item));

  const boardWidth =
    extractNumber(config.board_width) ??
    extractNumber(config.so_board_width) ??
    extractNumber(config.bg_width) ??
    extractNumber(config.background_width) ??
    1600;
  const boardHeight =
    extractNumber(config.board_height) ??
    extractNumber(config.so_board_height) ??
    extractNumber(config.bg_height) ??
    extractNumber(config.background_height) ??
    900;

  return {
    items,
    time_limit:
      extractNumber(config.time_limit) ??
      extractNumber(config.so_time_limit) ??
      extractNumber(config.select_option_time_limit),
    lives: Math.max(
      1,
      Math.floor(
        extractNumber(config.lives) ??
          extractNumber(config.so_lives) ??
          extractNumber(config.select_option_lives) ??
          3,
      ),
    ),
    bg_image: normalizeBackground(config),
    board_width: Math.max(1, Math.round(boardWidth)),
    board_height: Math.max(1, Math.round(boardHeight)),
    layout: extractText(config.layout) === "scene" ? "scene" : "free",
  };
}

export function normalizeMemoryCardsConfig(
  config: Record<string, unknown>,
): MemoryCardsConfig {
  const rawPairs = Array.isArray(config.pairs)
    ? config.pairs
    : Array.isArray(config.items)
      ? config.items
      : [];

  const pairs = rawPairs
    .map((pair, index): MemoryPair | null => {
      const record = asRecord(pair);
      if (!record) {
        return null;
      }

      const faceA =
        normalizeMemoryFace(record.a) ??
        normalizeMemoryFace(record.first) ??
        normalizeMemoryFace(record.left) ??
        normalizeMemoryFace(record.card_a);
      const faceB =
        normalizeMemoryFace(record.b) ??
        normalizeMemoryFace(record.second) ??
        normalizeMemoryFace(record.right) ??
        normalizeMemoryFace(record.card_b);

      if (!faceA || !faceB) {
        return null;
      }

      return {
        id: extractText(record.id) ?? `pair_${index + 1}`,
        a: faceA,
        b: faceB,
      };
    })
    .filter((pair): pair is MemoryPair => Boolean(pair));

  const maxMoves =
    extractNumber(config.max_moves) ??
    extractNumber(config.moves_limit) ??
    extractNumber(config.memory_max_moves) ??
    extractNumber(config.memory_cards_max_moves) ??
    extractNumber(config.mc_max_moves);

  return {
    pairs,
    time_limit: extractNumber(config.time_limit),
    max_moves: maxMoves !== null ? Math.max(1, Math.floor(maxMoves)) : null,
    bg_image: normalizeBackground(config),
  };
}

/**
 * Connect the pairs: two groups of pictures (or words), and the child joins
 * each one to its partner.
 *
 * The pairs are read like memory pairs (`left`/`right`, or `a`/`b`), each face
 * a picture or a word, and cut to `CONNECT_PAIRS_MAX`: more does not fit a
 * phone at a size a child can hit. Both groups are shuffled, and the right one
 * so that no partner sits straight across from its pair: a straight line would
 * give the answer away.
 */
export function normalizeConnectPairsConfig(
  config: Record<string, unknown>,
): ConnectPairsConfig {
  const rawPairs = Array.isArray(config.pairs)
    ? config.pairs
    : Array.isArray(config.cp_pairs)
      ? config.cp_pairs
      : [];
  const seen = new Set<string>();

  const pairs = rawPairs
    .map((pair, index): ConnectPairsPair | null => {
      const record = asRecord(pair);
      if (!record) {
        return null;
      }

      const left =
        normalizeMemoryFace(record.left) ??
        normalizeMemoryFace(record.a) ??
        normalizeMemoryFace(record.first);
      const right =
        normalizeMemoryFace(record.right) ??
        normalizeMemoryFace(record.b) ??
        normalizeMemoryFace(record.second);

      if (!left || !right) {
        return null;
      }

      // Taps are told apart by pair id, so two pairs may never share one.
      let id = extractText(record.id) ?? `pair_${index + 1}`;
      while (seen.has(id)) {
        id = `${id}_${index + 1}`;
      }
      seen.add(id);

      return { id, left, right };
    })
    .filter((pair): pair is ConnectPairsPair => Boolean(pair))
    .slice(0, CONNECT_PAIRS_MAX);

  const ids = pairs.map((pair) => pair.id);
  const leftOrder = shuffle(ids);
  const bg = normalizeBackground(config);
  const pictures = pairs.flatMap((pair) =>
    [pair.left, pair.right].filter((face) => face.type === "image").map((face) => face.value),
  );

  return {
    pairs,
    leftOrder,
    rightOrder: shuffleAcross(leftOrder),
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
    bg_image: bg,
    imageUris: Array.from(new Set(bg ? [...pictures, bg] : pictures)),
  };
}

/** A shuffle of `order` where no id keeps its position (for two ids or more). */
function shuffleAcross(order: readonly string[]): string[] {
  if (order.length < 2) {
    return [...order];
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const next = shuffle(order);
    if (next.every((id, index) => id !== order[index])) {
      return next;
    }
  }

  // Practically unreachable; a rotation never keeps a position either.
  return [...order.slice(1), order[0]];
}

const DEFAULT_SVG_VIEW_BOX: SvgViewBox = { minX: 0, minY: 0, width: 100, height: 100 };

export function parseSvgViewBox(svg: unknown): SvgViewBox {
  if (typeof svg !== "string") {
    return { ...DEFAULT_SVG_VIEW_BOX };
  }

  const match = svg.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*["']/i,
  );

  if (match) {
    const [, minX, minY, width, height] = match.map(Number);
    return { minX, minY, width: width || 100, height: height || 100 };
  }

  const widthMatch = svg.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const heightMatch = svg.match(/\bheight\s*=\s*["']([\d.]+)/i);

  return {
    minX: 0,
    minY: 0,
    width: widthMatch ? Number(widthMatch[1]) || 100 : 100,
    height: heightMatch ? Number(heightMatch[1]) || 100 : 100,
  };
}

function normalizeSlotId(value: unknown): string | null {
  const text = extractText(value);
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  // Authors may type just the number; map "1" -> "slot_1" to match the scene ids.
  if (/^\d+$/.test(trimmed)) {
    return `slot_${Number(trimmed)}`;
  }

  return trimmed;
}

const SVG_REMOTE_HREF = /\b(?:xlink:)?href\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi;

/** The http(s) pictures an SVG's `<image>` elements load, in document order. */
export function extractSvgImageUris(svg: string | null | undefined): string[] {
  if (!svg) {
    return [];
  }

  const uris: string[] = [];
  for (const match of svg.matchAll(SVG_REMOTE_HREF)) {
    uris.push(match[2].replace(/&amp;/g, "&"));
  }
  return uris;
}

export function normalizeSvgAssembleConfig(
  game: AuthoredGame,
  config: Record<string, unknown>,
): SvgAssembleConfig {
  const sceneSvg =
    extractText(config.question_svg) ??
    extractText(config.scene_svg) ??
    extractText(config.scene) ??
    extractText(config.svg) ??
    null;
  const viewBox = parseSvgViewBox(sceneSvg);

  const buildSlot = (raw: unknown, index: number): SvgAssembleSlot | null => {
    const record = asRecord(raw);
    if (!record) {
      return null;
    }

    return {
      id: normalizeSlotId(record.id) ?? `slot_${index + 1}`,
      x: extractNumber(record.x) ?? 0,
      y: extractNumber(record.y) ?? 0,
      width: extractNumber(record.width) ?? extractNumber(record.w) ?? viewBox.width,
      height: extractNumber(record.height) ?? extractNumber(record.h) ?? viewBox.height,
    };
  };

  // Preferred: a `slots` array (multi-slot). Fall back to the legacy single `slot`.
  let slots = (Array.isArray(config.slots) ? config.slots : [])
    .map((slot, index) => buildSlot(slot, index))
    .filter((slot): slot is SvgAssembleSlot => Boolean(slot));

  if (slots.length === 0) {
    const rawSlot =
      asRecord(config.slot) ?? asRecord(config.answer_slot) ?? asRecord(config.scene_slot);
    const single = rawSlot
      ? buildSlot(rawSlot, 0)
      : { id: "slot_1", x: 0, y: 0, width: viewBox.width, height: viewBox.height };
    slots = single ? [single] : [];
  }

  const slotIds = new Set(slots.map((slot) => slot.id));

  // Sent only for a composed scene, whose pictures carry these ids in the markup.
  const layers = Array.isArray(config.layers)
    ? config.layers
      .map((raw, index): SvgAssembleSlot | null => {
        const slot = buildSlot(raw, index);
        return slot ? { ...slot, id: extractText(asRecord(raw)?.id) ?? `layer_${index + 1}` } : null;
      })
      .filter((layer): layer is SvgAssembleSlot => Boolean(layer))
    : null;

  const rawAnswers = Array.isArray(config.answers)
    ? config.answers
    : extractOptionsSource(config);
  const answers = rawAnswers
    .map((answer, index): SvgAssembleAnswer | null => {
      const record = asRecord(answer);
      if (!record) {
        return null;
      }

      const svg =
        extractText(record.svg) ??
        extractText(record.answer_svg) ??
        extractText(record.piece_svg) ??
        extractText(record.image_svg);

      if (!svg) {
        return null;
      }

      const slotId = normalizeSlotId(
        record.slot ?? record.slot_id ?? record.target ?? record.target_slot ?? record.answer_slot,
      );

      return {
        id: extractText(record.id) ?? extractText(record.key) ?? `${game.id}-answer-${index}`,
        svg,
        label:
          extractText(record.label) ??
          extractText(record.title) ??
          extractText(record.name) ??
          null,
        isCorrect:
          extractBoolean(record.is_correct) ??
          extractBoolean(record.correct) ??
          extractBoolean(record.isCorrect) ??
          false,
        // Only keep a binding the scene can actually satisfy.
        slotId: slotId && slotIds.has(slotId) ? slotId : null,
      };
    })
    .filter((answer): answer is SvgAssembleAnswer => Boolean(answer));

  const correctAnswers = answers.filter((answer) => answer.isCorrect);
  // Legacy single-correct content carries no per-answer binding: route the one
  // correct piece into the first slot so older lessons keep working.
  if (
    !correctAnswers.some((answer) => answer.slotId) &&
    correctAnswers.length > 0 &&
    slots.length > 0
  ) {
    correctAnswers[0].slotId = slots[0].id;
  }

  // Drop correct pieces with no reachable slot: they could never be placed, so
  // showing them would unfairly punish a tap. Distractors (not correct) stay.
  const playableAnswers = answers.filter((answer) => !answer.isCorrect || answer.slotId);

  const requiredSlotIds = [
    ...new Set(
      playableAnswers
        .filter((answer) => answer.isCorrect)
        .map((answer) => answer.slotId)
        .filter((id): id is string => Boolean(id) && slotIds.has(id as string)),
    ),
  ];

  return {
    questionSvg: sceneSvg,
    viewBox,
    slots,
    layers,
    requiredSlotIds,
    slot: slots[0],
    answers: playableAnswers,
    imageUris: [
      ...new Set([
        ...extractSvgImageUris(sceneSvg),
        ...playableAnswers.flatMap((answer) => extractSvgImageUris(answer.svg)),
      ]),
    ],
    bg_image: normalizeBackground(config),
    time_limit:
      extractNumber(config.time_limit) ?? extractNumber(config.svg_assemble_time_limit) ?? 60,
    lives: Math.max(
      1,
      Math.floor(
        extractNumber(config.lives) ?? extractNumber(config.svg_assemble_lives) ?? 3,
      ),
    ),
  };
}

export function createClientEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fisher-Yates. Card order is part of the game, so both platforms must shuffle
 * the same way rather than each reaching for its own helper.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }

  return next;
}

// ---------------------------------------------------------------------------
// Play rules both renderers must agree on.
//
// Everything below used to live in the two players as local constants and
// helpers, and had drifted: the same drop counted as a hit on one platform and
// a miss on the other, a mistake cost the first-attempt bonus in the app but
// not on the web, a zone sat on the artwork on one screen and beside it on the
// other. Keeping the numbers here is the only way to keep them equal.
// ---------------------------------------------------------------------------

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Why a game ended without a pass. Stored with the attempt; the web player
 * maps each one to a message.
 */
export type GameFailureReason = "timeout" | "lives_out" | "wrong_catch" | "moves_out";

export const FAILURE_REASON = {
  timeout: "timeout",
  livesOut: "lives_out",
  /** Catch Correct only: the last life went on a wrong catch. */
  wrongCatch: "wrong_catch",
  movesOut: "moves_out",
} as const satisfies Record<string, GameFailureReason>;

/**
 * The "halfway there" cheer. Fires once, when the child reaches the midpoint
 * of a game with more than two steps, and never on the last step — the win
 * sound covers that. A two-step game gets the ordinary "correct" instead:
 * cheering "halfway" after the first of two is noise.
 */
export function shouldPlayHalfway(next: number, total: number): boolean {
  return total > 2 && next >= Math.ceil(total / 2) && next < total;
}

/**
 * Whether an authored label is a picture (URL or path) rather than text.
 * Catch Correct items may be either, and both renderers must draw the same
 * thing for the same label.
 */
export function isImageReference(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    /\.(jpe?g|gif|png|svg|webp)(\?.*)?$/i.test(trimmed)
  );
}

// --- Catch Correct ----------------------------------------------------------

/** Spawn interval floor: below this the screen fills faster than a child can look. */
export const CATCH_CORRECT_MIN_FREQUENCY_MS = 500;
/** Fall duration bounds: faster is unplayable, slower is boring. */
export const CATCH_CORRECT_MIN_FALL_MS = 2400;
export const CATCH_CORRECT_MAX_FALL_MS = 7600;

/** Demo items for a game authored without any, so it is still playable. */
export const DEFAULT_CATCH_CORRECT_ITEMS: ReadonlyArray<{ label: string; correct: boolean }> = [
  { label: "🍎", correct: true },
  { label: "🍌", correct: true },
  { label: "👟", correct: false },
  { label: "🚗", correct: false },
];

/** How long one item takes to cross the stage, from the authored `speed`. */
export function catchCorrectFallDurationMs(speed: number): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 120;
  return Math.round(
    clampNumber((100000 / safeSpeed) * 5, CATCH_CORRECT_MIN_FALL_MS, CATCH_CORRECT_MAX_FALL_MS),
  );
}

// --- Shadow Match -----------------------------------------------------------

/** A drop counts when its centre is within this fraction of the target's longer side. */
export const SHADOW_MATCH_DROP_TOLERANCE = 0.42;
/** A miss is blamed on the nearest other target within this fraction — feedback only. */
export const SHADOW_MATCH_MISS_TOLERANCE = 0.5;

export function isShadowMatchHit(distance: number, targetWidth: number, targetHeight: number): boolean {
  return distance <= Math.max(targetWidth, targetHeight) * SHADOW_MATCH_DROP_TOLERANCE;
}

export function isShadowMatchNearMiss(
  distance: number,
  targetWidth: number,
  targetHeight: number,
): boolean {
  return distance <= Math.max(targetWidth, targetHeight) * SHADOW_MATCH_MISS_TOLERANCE;
}

// --- Board geometry ---------------------------------------------------------

export type StageSize = { width: number; height: number };
export type BoardRect = { left: number; top: number; width: number; height: number };

/**
 * How an authored board (`board_width` × `board_height`, zones in percent) is
 * drawn on a stage. The background covers the stage — scaled up until both
 * axes are filled, then centred — and every zone follows the picture. Without
 * this the zones drift off the artwork whenever the stage's aspect differs
 * from the board's.
 */
export type DragDropMatchSceneMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  coverScale: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
  /** Landscape keeps the leftmost 19% of the short side clear for the chrome. */
  leftSafeInset: number;
  /** On narrow stages a zone is widened to a tappable minimum. */
  minZoneWidth: number;
};

export function getDragDropMatchSceneMetrics(
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): DragDropMatchSceneMetrics | null {
  if (viewportWidth <= 0 || viewportHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const coverScale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
  const renderWidth = sourceWidth * coverScale;
  const renderHeight = sourceHeight * coverScale;
  const shortestSide = Math.max(Math.min(viewportWidth, viewportHeight), 1);

  return {
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    coverScale,
    renderWidth,
    renderHeight,
    offsetX: (viewportWidth - renderWidth) / 2,
    offsetY: (viewportHeight - renderHeight) / 2,
    leftSafeInset: viewportWidth > viewportHeight ? Math.max(shortestSide * 0.19, 1) : 0,
    minZoneWidth: viewportWidth < 640 ? shortestSide * 0.14 : 0,
  };
}

export function getDragDropMatchZoneRect(
  zone: Pick<DragDropMatchZone, "x" | "y" | "width" | "height">,
  metrics: DragDropMatchSceneMetrics,
): BoardRect {
  const visualWidth = Math.max((zone.width / 100) * metrics.sourceWidth * metrics.coverScale, 1);
  const visualHeight = Math.max((zone.height / 100) * metrics.sourceHeight * metrics.coverScale, 1);
  const visualLeft = metrics.offsetX + (zone.x / 100) * metrics.renderWidth;
  const visualTop = metrics.offsetY + (zone.y / 100) * metrics.renderHeight;
  const finalWidth = Math.max(visualWidth, metrics.minZoneWidth);

  return {
    left: clampNumber(
      visualLeft - (finalWidth - visualWidth) / 2,
      metrics.leftSafeInset,
      Math.max(metrics.viewportWidth - finalWidth, metrics.leftSafeInset),
    ),
    top: clampNumber(visualTop, 0, Math.max(metrics.viewportHeight - visualHeight, 0)),
    width: finalWidth,
    height: visualHeight,
  };
}

/** Zone rectangles in stage pixels, in `config.zones` order. Raw percentages until the stage is measured. */
export function layoutDragDropMatchZones(
  stage: StageSize,
  config: Pick<DragDropMatchConfig, "zones" | "board_width" | "board_height">,
): BoardRect[] {
  const metrics = getDragDropMatchSceneMetrics(
    stage.width,
    stage.height,
    Math.max(config.board_width, 1),
    Math.max(config.board_height, 1),
  );

  return config.zones.map((zone) =>
    metrics
      ? getDragDropMatchZoneRect(zone, metrics)
      : {
          left: (zone.x / 100) * stage.width,
          top: (zone.y / 100) * stage.height,
          width: (zone.width / 100) * stage.width,
          height: (zone.height / 100) * stage.height,
        },
  );
}

/**
 * Select Option draws the board the same way, but its hotspots are things a
 * child must be able to tap: tiny authored items are grown to a minimum
 * extent and given a minimum touch box, and everything is kept off the
 * stage edges.
 */
export type SelectOptionSceneMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
  containScale: number;
  visualScaleBoost: number;
  minTouchWidth: number;
  minTouchHeight: number;
  safeInset: number;
  leftSafeInset: number;
  bottomSafeInset: number;
  minVisualExtent: number;
  maxVisualExtent: number;
};

export function getSelectOptionSceneMetrics(
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): SelectOptionSceneMetrics | null {
  if (viewportWidth <= 0 || viewportHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const coverScale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
  const containScale = Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
  const renderWidth = sourceWidth * coverScale;
  const renderHeight = sourceHeight * coverScale;
  const shortestSide = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const visualScaleBoost = clampNumber(520 / shortestSide, 1, 1.36);
  const minTouchSize = viewportWidth < 640 ? shortestSide * 0.14 : 0;
  const safeInset = Math.max(shortestSide * 0.035, 1);
  const leftSafeInset =
    viewportWidth > viewportHeight ? Math.max(shortestSide * 0.19, safeInset) : safeInset;
  const bottomSafeInset = Math.max(shortestSide * 0.1, safeInset);
  const minVisualExtent = shortestSide * (viewportWidth < 640 ? 0.18 : 0.08);
  const maxVisualExtent = shortestSide * (viewportWidth < 640 ? 0.28 : 0.2);

  return {
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    renderWidth,
    renderHeight,
    offsetX: (viewportWidth - renderWidth) / 2,
    offsetY: (viewportHeight - renderHeight) / 2,
    containScale,
    visualScaleBoost,
    minTouchWidth: minTouchSize,
    minTouchHeight: minTouchSize,
    safeInset,
    leftSafeInset,
    bottomSafeInset,
    minVisualExtent,
    maxVisualExtent,
  };
}

/** The touch box (`left/top/width/height`) plus the picture drawn centred inside it. */
export type SelectOptionItemRect = BoardRect & { visualWidth: number; visualHeight: number };

export function getSelectOptionItemRect(
  item: Pick<SelectOptionItem, "x" | "y" | "width" | "height">,
  metrics: SelectOptionSceneMetrics,
): SelectOptionItemRect {
  const baseVisualWidth = Math.max((item.width / 100) * metrics.sourceWidth * metrics.containScale, 1);
  const baseVisualHeight = Math.max(
    (item.height / 100) * metrics.sourceHeight * metrics.containScale,
    1,
  );
  const baseVisualExtent = Math.max(baseVisualWidth, baseVisualHeight);
  const visualScale = clampNumber(
    metrics.visualScaleBoost * Math.max(1, metrics.minVisualExtent / baseVisualExtent),
    1,
    metrics.maxVisualExtent / baseVisualExtent,
  );
  const visualWidth = baseVisualWidth * visualScale;
  const visualHeight = baseVisualHeight * visualScale;
  const visualLeft = metrics.offsetX + (item.x / 100) * metrics.renderWidth;
  const visualTop = metrics.offsetY + (item.y / 100) * metrics.renderHeight;
  const hitWidth = Math.max(visualWidth, metrics.minTouchWidth);
  const hitHeight = Math.max(visualHeight, metrics.minTouchHeight);

  return {
    left: clampNumber(
      visualLeft - (hitWidth - visualWidth) / 2,
      metrics.leftSafeInset,
      Math.max(metrics.viewportWidth - hitWidth - metrics.safeInset, metrics.leftSafeInset),
    ),
    top: clampNumber(
      visualTop - (hitHeight - visualHeight) / 2,
      metrics.safeInset,
      Math.max(metrics.viewportHeight - hitHeight - metrics.bottomSafeInset, metrics.safeInset),
    ),
    width: hitWidth,
    height: hitHeight,
    visualWidth,
    visualHeight,
  };
}

/** Item touch boxes in stage pixels, in `config.items` order. Empty until the stage is measured. */
export function layoutSelectOptionItems(
  stage: StageSize,
  config: Pick<SelectOptionConfig, "items" | "board_width" | "board_height">,
): Array<{ id: string } & SelectOptionItemRect> {
  const metrics = getSelectOptionSceneMetrics(
    stage.width,
    stage.height,
    Math.max(config.board_width, 1),
    Math.max(config.board_height, 1),
  );

  if (!metrics) {
    return [];
  }

  return config.items.map((item) => ({ id: item.id, ...getSelectOptionItemRect(item, metrics) }));
}

// --- Feedback timings -------------------------------------------------------

/**
 * How long each game waits between an action and its consequence, in ms. Not
 * a rule in the scoring sense, but a child who gets 650 ms to see a mistake on
 * one device and 900 ms on another is playing two different games.
 */
export const GAME_TIMINGS = {
  answerChoice: { wrongFeedbackSingleMs: 700, wrongFeedbackMultiMs: 850, successSettleMs: 120 },
  catchCorrect: { wrongShakeMs: 100, completionDelayMs: 0 },
  /**
   * A connected pair glows and bounces for `matchFeedbackMs` while its line is
   * drawn over `lineDrawMs`; a wrong pair flashes red for `wrongFeedbackMs`;
   * the last pair gets `successSettleMs` to be seen before the win.
   */
  connectPairs: { matchFeedbackMs: 650, lineDrawMs: 350, wrongFeedbackMs: 600, successSettleMs: 700 },
  /**
   * A counted picture pops for `countedPopMs`. In `tap` mode the last one
   * counted is the win, held back `countedHoldMs` so the last number word is
   * heard to its end and the number is seen.
   *
   * Until the first tap a hand shows what to do: it appears `hintDelayMs`
   * after the game starts, on one thing to count, and taps it once every
   * `hintBeatMs`. Any tap sends it away; it comes back when nothing has been
   * tapped for `hintIdleMs` and something is still to count.
   */
  countPick: {
    wrongFeedbackMs: 600,
    countedPopMs: 320,
    countedHoldMs: 1200,
    hintDelayMs: 1200,
    hintBeatMs: 1100,
    hintIdleMs: 6000,
  },
  dragDropMatch: { wrongFeedbackMs: 420, successSettleMs: 140 },
  imagesOrder: { wrongFillFeedbackMs: 900 },
  jigsaw: { wrongFlashMs: 500, successSettleMs: 400 },
  memoryCards: { matchRevealMs: 500, mismatchFlipBackMs: 1000 },
  patternNext: { wrongFeedbackMs: 600, successSettleMs: 450 },
  selectOption: { wrongFeedbackMs: 600, successSettleMs: 180, livesOutDelayMs: 260 },
  shadowMatch: {
    correctLockMs: 220,
    successSettleMs: 220,
    wrongFeedbackMs: 620,
    wrongReturnMs: 220,
    wrongUnlockMs: 560,
    livesOutDelayMs: 640,
  },
  sizeOrder: { successSettleMs: 350 },
  sortBins: { wrongFeedbackMs: 600, successSettleMs: 350 },
  svgAssemble: {
    wrongFeedbackMs: 560,
    flyMs: 620,
    successSettleMs: 260,
    timeoutSettleMs: 320,
    livesOutDelayMs: 320,
  },
  /**
   * A right card flies into its place over `flyMs`; a wrong one shakes for
   * `wrongFeedbackMs`. The finished example stays `successSettleMs` so the
   * child sees it whole before the win.
   */
  mathEquation: {
    wrongFeedbackMs: 560,
    flyMs: 620,
    successSettleMs: 600,
    livesOutDelayMs: 320,
  },
} as const;

// --- Connect the pairs ------------------------------------------------------

/** More pairs than this do not fit a phone at a size a child can hit. */
export const CONNECT_PAIRS_MAX = 6;

export type ConnectPairsSide = "left" | "right";

/** A card the child tapped: which group, and the pair it belongs to. */
export type ConnectPairsPick = { side: ConnectPairsSide; pairId: string };

export type ConnectPairsTapResult =
  /** A card already connected: nothing happens. */
  | { type: "ignored" }
  /** Nothing was picked, or another card of the same group was: this one is picked now. */
  | { type: "select"; pick: ConnectPairsPick }
  /** The picked card again: the pick is dropped. */
  | { type: "deselect" }
  /** Partners: the pair is connected, the pick is dropped. */
  | { type: "match"; pairId: string }
  /** Not partners: a mistake, the pick is dropped. */
  | { type: "mismatch"; leftPairId: string; rightPairId: string };

/**
 * What a tap on a card does, given the card picked so far and the pairs
 * already connected. The whole play rule of the game, so both players follow
 * it tap for tap: a card of the other group checks the pair, a card of the
 * same group takes over the pick, the picked card again drops it.
 */
export function resolveConnectPairsTap(
  picked: ConnectPairsPick | null,
  connected: Iterable<string>,
  tap: ConnectPairsPick,
): ConnectPairsTapResult {
  if (new Set(connected).has(tap.pairId)) {
    return { type: "ignored" };
  }

  if (!picked) {
    return { type: "select", pick: tap };
  }

  if (picked.side === tap.side) {
    return picked.pairId === tap.pairId ? { type: "deselect" } : { type: "select", pick: tap };
  }

  const leftPairId = picked.side === "left" ? picked.pairId : tap.pairId;
  const rightPairId = picked.side === "left" ? tap.pairId : picked.pairId;

  return leftPairId === rightPairId
    ? { type: "match", pairId: leftPairId }
    : { type: "mismatch", leftPairId, rightPairId };
}

export const CONNECT_PAIRS_LAYOUT = {
  /** A card never grows past this, in px, however large the stage. */
  maxCard: 200,
  /** Space between neighbouring cards of a group, as a share of a card: at least, at most. */
  minGap: 0.14,
  maxGap: 0.5,
  /** The lane between the two groups, where the lines run, as a share of a card: at least, at most. */
  minLane: 0.9,
  maxLane: 3,
  /** Kept clear along the stage's edges, as a share of its shorter side. */
  margin: 0.04,
} as const;

export type ConnectPairsOrientation = "columns" | "rows";

export type ConnectPairsLayout = {
  /** Side by side (a left and a right column), or one above the other (a top and a bottom row). */
  orientation: ConnectPairsOrientation;
  /** Every card is a square of this side. */
  card: number;
  /** Where the left group's cards go, in display order (the top row when in rows). */
  left: BoardRect[];
  /** Where the right group's cards go, in display order (the bottom row when in rows). */
  right: BoardRect[];
};

/**
 * Where the cards of `count` pairs go on a stage. The two groups are either
 * two columns or two rows, whichever lets the cards be larger: on a phone in
 * landscape that is two rows, so six pairs stay big enough to tap. The cards
 * grow up to `maxCard`; the space left widens the lane the lines cross and the
 * gaps between cards, and the whole board is centred inside `insets`.
 */
export function layoutConnectPairs(
  width: number,
  height: number,
  count: number,
  insets: SceneInsets = {},
): ConnectPairsLayout {
  const n = clampNumber(Math.floor(count), 0, CONNECT_PAIRS_MAX);
  const spec = CONNECT_PAIRS_LAYOUT;
  const margin = Math.max(0, Math.min(width, height)) * spec.margin;
  const originX = (insets.left ?? 0) + margin;
  const originY = (insets.top ?? 0) + margin;
  const freeWidth = Math.max(0, width - (insets.left ?? 0) - (insets.right ?? 0) - margin * 2);
  const freeHeight = Math.max(0, height - (insets.top ?? 0) - (insets.bottom ?? 0) - margin * 2);

  if (n === 0) {
    return { orientation: "columns", card: 0, left: [], right: [] };
  }

  // Cards and gaps along a group; two cards and the lane across both.
  const along = n + (n - 1) * spec.minGap;
  const across = 2 + spec.minLane;
  const columnsCard = Math.min(freeHeight / along, freeWidth / across);
  const rowsCard = Math.min(freeWidth / along, freeHeight / across);
  const orientation: ConnectPairsOrientation = rowsCard > columnsCard ? "rows" : "columns";
  const card = Math.max(0, Math.min(spec.maxCard, Math.max(columnsCard, rowsCard)));

  const alongSpace = orientation === "columns" ? freeHeight : freeWidth;
  const acrossSpace = orientation === "columns" ? freeWidth : freeHeight;
  const gap =
    n > 1 ? clampNumber((alongSpace - n * card) / (n - 1), card * spec.minGap, card * spec.maxGap) : 0;
  const lane = clampNumber(acrossSpace - 2 * card, card * spec.minLane, card * spec.maxLane);
  const alongStart = (alongSpace - (n * card + (n - 1) * gap)) / 2;
  const acrossStart = (acrossSpace - (2 * card + lane)) / 2;

  const slot = (group: 0 | 1, index: number): BoardRect => {
    const alongOffset = alongStart + index * (card + gap);
    const acrossOffset = acrossStart + group * (card + lane);
    return orientation === "columns"
      ? { left: originX + acrossOffset, top: originY + alongOffset, width: card, height: card }
      : { left: originX + alongOffset, top: originY + acrossOffset, width: card, height: card };
  };

  return {
    orientation,
    card,
    left: Array.from({ length: n }, (_, index) => slot(0, index)),
    right: Array.from({ length: n }, (_, index) => slot(1, index)),
  };
}

/**
 * The line that joins two connected cards: from the middle of the left card's
 * edge facing the right group to the middle of the right card's facing edge.
 */
export function connectPairsLink(
  orientation: ConnectPairsOrientation,
  left: BoardRect,
  right: BoardRect,
): { from: { x: number; y: number }; to: { x: number; y: number } } {
  return orientation === "columns"
    ? {
        from: { x: left.left + left.width, y: left.top + left.height / 2 },
        to: { x: right.left, y: right.top + right.height / 2 },
      }
    : {
        from: { x: left.left + left.width / 2, y: left.top + left.height },
        to: { x: right.left + right.width / 2, y: right.top },
      };
}

// --- Math equation ----------------------------------------------------------
//
// An example — `1 + ? = 3`, `3 ? 5`, three cows `= ?` — with one or two places
// left for the child. A card is right when, put in the place being filled,
// the example can still be made true with the cards that are left. So `5 > ?`
// takes a 3 or a 4 alike, and `? + ? = 5` takes 1 then 4 or 4 then 1: the
// child is never told off for an answer that is right.

/** The most places an example leaves to fill: more is a puzzle, not a sum. */
export const MATH_EQUATION_BLANKS_MAX = 2;
/** Number cards offered: below two there is no choice, above four the tray outgrows a phone. */
export const MATH_EQUATION_CHOICES_MIN = 2;
export const MATH_EQUATION_CHOICES_MAX = 4;
/** The most copies of a picture one number shows: counting to ten. */
export const MATH_EQUATION_PICTURES_MAX = 10;
/** The largest number an example holds. */
export const MATH_EQUATION_NUMBER_MAX = 99;

const MATH_OPERATIONS: readonly MathEquationSign[] = ["+", "-"];
const MATH_COMPARISONS: readonly MathEquationSign[] = ["<", "=", ">"];
const MATH_SIGN_ORDER: readonly MathEquationSign[] = ["+", "-", "<", "=", ">"];
const MATH_GLYPHS: readonly MathEquationGlyph[] = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "=", "<", ">", "?",
];

/** Whether a sign compares the two sides (`<`, `=`, `>`) rather than adding or taking away. */
export function isMathComparison(sign: MathEquationSign): boolean {
  return sign === "<" || sign === "=" || sign === ">";
}

function normalizeMathSign(value: unknown): MathEquationSign | null {
  const text = extractText(value);
  if (!text) {
    return null;
  }

  const raw = text.trim();
  const symbols: Record<string, MathEquationSign> = { "+": "+", "-": "-", "−": "-", "–": "-", "—": "-", "=": "=", "<": "<", ">": ">" };
  if (symbols[raw]) return symbols[raw];

  const word = raw.toLowerCase().replace(/[\s_-]+/g, "_");
  if (["plus", "add"].includes(word)) return "+";
  if (["minus", "subtract"].includes(word)) return "-";
  if (["equals", "equal", "eq"].includes(word)) return "=";
  if (["less", "less_than", "lt", "smaller"].includes(word)) return "<";
  if (["greater", "greater_than", "gt", "more", "more_than", "bigger"].includes(word)) return ">";
  return null;
}

/** The glyphs a number is written with: 15 is "1" then "5". */
export function mathNumberGlyphs(value: number): MathEquationGlyph[] {
  return String(Math.max(0, Math.floor(value))).split("") as MathEquationGlyph[];
}

/** A number drawn as pictures: only a count a child can see, one to ten. */
function mathPictureFor(image: string | null, value: number): string | null {
  return image && value >= 1 && value <= MATH_EQUATION_PICTURES_MAX ? image : null;
}

type MathValue = { kind: "number"; value: number } | { kind: "sign"; value: MathEquationSign };

/**
 * Whether an example reads true, the way a child reckons it: numbers and signs
 * alternate, there is exactly one comparison, each side is added up left to
 * right, and no running total goes below zero.
 */
function isMathStatementTrue(values: ReadonlyArray<MathValue>): boolean {
  if (values.length < 3 || values.length % 2 === 0) {
    return false;
  }

  let comparison: MathEquationSign | null = null;
  let left = 0;
  let total = 0;
  let operation: MathEquationSign = "+";

  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];

    if (index % 2 === 0) {
      if (item.kind !== "number") return false;
      total = operation === "-" ? total - item.value : total + item.value;
      if (total < 0) return false;
      continue;
    }

    if (item.kind !== "sign") return false;

    if (isMathComparison(item.value)) {
      if (comparison) return false;
      comparison = item.value;
      left = total;
      total = 0;
      operation = "+";
    } else {
      operation = item.value;
    }
  }

  if (!comparison) {
    return false;
  }

  return comparison === "=" ? left === total : comparison === "<" ? left < total : left > total;
}

/** A card fits a place when it is the same kind — and, for a sign, the same family of signs. */
function mathCardFits(term: MathEquationTerm, card: MathEquationCard): boolean {
  if (term.kind === "number") {
    return card.kind === "number";
  }

  return card.kind === "sign" && isMathComparison(card.value) === isMathComparison(term.value);
}

/**
 * How many ways the places still open can be filled from the cards not yet
 * used so that the example reads true, counting no further than `limit`.
 * `placed` maps a filled place to the card in it.
 */
export function countMathEquationCompletions(
  config: Pick<MathEquationConfig, "terms" | "cards">,
  placed: Readonly<Record<string, string>> = {},
  limit = Number.POSITIVE_INFINITY,
): number {
  const cardsById = new Map(config.cards.map((card) => [card.id, card]));
  const open = config.terms.filter((term) => term.missing && !placed[term.id]);
  const assignment: Record<string, MathEquationCard> = {};

  for (const [termId, cardId] of Object.entries(placed)) {
    const card = cardsById.get(cardId);
    if (card) assignment[termId] = card;
  }

  const used = new Set(Object.values(placed));
  let count = 0;

  const visit = (depth: number) => {
    if (count >= limit) return;

    if (depth === open.length) {
      const values = config.terms.map((term): MathValue | null => {
        const card = term.missing ? assignment[term.id] : null;
        if (term.missing && !card) return null;
        const source = card ?? term;
        return source.kind === "number"
          ? { kind: "number", value: source.value }
          : { kind: "sign", value: source.value };
      });

      if (values.every((value): value is MathValue => value !== null) && isMathStatementTrue(values)) {
        count += 1;
      }
      return;
    }

    const term = open[depth];
    for (const card of config.cards) {
      if (used.has(card.id) || !mathCardFits(term, card)) continue;
      used.add(card.id);
      assignment[term.id] = card;
      visit(depth + 1);
      delete assignment[term.id];
      used.delete(card.id);
    }
  };

  visit(0);
  return count;
}

/**
 * The example as the players draw it.
 *
 * `terms` are the places left to right, each a number (`value`, optionally an
 * `image` to show it as that many pictures) or a sign, and `missing` for the
 * one or two the child fills. With none marked, the last number is missing.
 *
 * The cards: every missing number, then the author's `wrong_answers`, then
 * numbers near the answer that cannot complete the example, until there are
 * `choice_count` number cards. A missing sign brings all the signs of its
 * family: `<`, `=`, `>` for a comparison, `+`, `−` for a sum. `answer_image`
 * draws the number cards as that many pictures instead of digits.
 */
export function normalizeMathEquationConfig(config: Record<string, unknown>): MathEquationConfig {
  const rawTerms = Array.isArray(config.terms) ? config.terms : [];
  const terms: MathEquationTerm[] = [];

  rawTerms.forEach((raw, index) => {
    const record = asRecord(raw);
    const rawValue = record ? record.value : raw;
    const type = record ? extractText(record.type)?.toLowerCase() ?? null : null;
    const id = `term_${index + 1}`;
    const missing = record ? extractBoolean(record.missing) ?? false : false;

    const sign = type === "number" ? null : normalizeMathSign(rawValue);
    if (sign) {
      terms.push({ id, kind: "sign", value: sign, missing });
      return;
    }

    const number = type === "sign" ? null : extractNumber(rawValue);
    if (number !== null && number >= 0) {
      const value = Math.min(MATH_EQUATION_NUMBER_MAX, Math.floor(number));
      terms.push({
        id,
        kind: "number",
        value,
        image: mathPictureFor(record ? extractMediaUrl(record.image) : null, value),
        missing,
      });
    }
  });

  // One or two places to fill, the first ones marked; none marked means the answer.
  let missingSeen = 0;
  terms.forEach((term) => {
    if (term.missing) {
      missingSeen += 1;
      term.missing = missingSeen <= MATH_EQUATION_BLANKS_MAX;
    }
  });
  if (missingSeen === 0) {
    const last = [...terms].reverse().find((term) => term.kind === "number");
    if (last) last.missing = true;
  }

  const blanks = terms.filter((term) => term.missing);
  const answerImage = extractMediaUrl(config.answer_image);
  const numberCards: MathEquationCard[] = [];
  const addNumber = (value: number) => {
    if (numberCards.some((card) => card.value === value)) return;
    numberCards.push({ id: `number_${value}`, kind: "number", value, image: mathPictureFor(answerImage, value) });
  };

  const signs = new Set<MathEquationSign>();
  blanks.forEach((term) => {
    if (term.kind === "number") {
      addNumber(term.value);
    } else {
      (isMathComparison(term.value) ? MATH_COMPARISONS : MATH_OPERATIONS).forEach((sign) => signs.add(sign));
    }
  });
  const signCards: MathEquationCard[] = MATH_SIGN_ORDER
    .filter((sign) => signs.has(sign))
    .map((sign) => ({ id: `sign_${sign}`, kind: "sign", value: sign }));

  const numberBlanks = blanks.filter((term) => term.kind === "number");
  if (numberBlanks.length > 0) {
    const rawWrong = typeof config.wrong_answers === "string"
      ? config.wrong_answers.split(/[\s,;]+/)
      : Array.isArray(config.wrong_answers) ? config.wrong_answers : [];
    rawWrong
      .map((value) => extractNumber(value))
      .filter((value): value is number => value !== null && value >= 0 && value <= MATH_EQUATION_NUMBER_MAX)
      .forEach((value) => {
        if (numberCards.length < MATH_EQUATION_CHOICES_MAX) addNumber(Math.floor(value));
      });

    const wanted = Math.max(
      numberCards.length > MATH_EQUATION_CHOICES_MAX ? numberCards.length : 0,
      Math.min(
        MATH_EQUATION_CHOICES_MAX,
        Math.max(MATH_EQUATION_CHOICES_MIN, numberBlanks.length + 1, Math.floor(extractNumber(config.choice_count) ?? 3)),
      ),
    );

    // Numbers near the answer, nearest first, that add no new way to complete
    // the example: a card that is also right would not be a wrong answer.
    const answers = numberBlanks.map((term) => term.value);
    const lowest = answerImage ? 1 : 0;
    const highest = answerImage
      ? MATH_EQUATION_PICTURES_MAX
      : Math.min(MATH_EQUATION_NUMBER_MAX, Math.max(10, ...answers.map((value) => value + 5)));
    const completions = (cards: MathEquationCard[]) =>
      countMathEquationCompletions({ terms, cards: [...cards, ...signCards] }, {}, 4);

    for (let distance = 1; numberCards.length < wanted && distance <= highest; distance += 1) {
      for (const answer of answers) {
        for (const candidate of [answer - distance, answer + distance]) {
          if (numberCards.length >= wanted) break;
          if (candidate < lowest || candidate > highest || numberCards.some((card) => card.value === candidate)) continue;
          const before = completions(numberCards);
          const trial = [...numberCards, { id: `number_${candidate}`, kind: "number" as const, value: candidate, image: null }];
          if (completions(trial) === before) addNumber(candidate);
        }
      }
    }
  }

  const cards = [...shuffle(numberCards), ...signCards];
  const glyphSource = asRecord(config.glyphs) ?? {};
  const glyphs: Partial<Record<MathEquationGlyph, string>> = {};
  MATH_GLYPHS.forEach((glyph) => {
    const url = extractMediaUrl(glyphSource[glyph]);
    if (url) glyphs[glyph] = url;
  });

  // Only the pictures this example actually draws.
  const drawn = new Set<MathEquationGlyph>();
  const note = (item: MathEquationTerm | MathEquationCard) => {
    if (item.kind === "sign") drawn.add(item.value);
    else if (!item.image) mathNumberGlyphs(item.value).forEach((glyph) => drawn.add(glyph));
  };
  terms.forEach(note);
  cards.forEach(note);
  if (blanks.length > 0) drawn.add("?");

  const bg = extractMediaUrl(config.bg_image);
  const imageUris = [
    bg,
    ...terms.map((term) => (term.kind === "number" ? term.image : null)),
    ...cards.map((card) => (card.kind === "number" ? card.image : null)),
    ...MATH_GLYPHS.filter((glyph) => drawn.has(glyph)).map((glyph) => glyphs[glyph] ?? null),
  ].filter((uri): uri is string => Boolean(uri));

  return {
    terms,
    blankIds: blanks.map((term) => term.id),
    cards,
    glyphs,
    bg_image: bg,
    time_limit: extractNumber(config.time_limit),
    lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
    imageUris: [...new Set(imageUris)],
  };
}

export type MathEquationTapResult =
  /** Nothing left to fill, or the card is already in the example. */
  | { type: "ignored" }
  /** The card goes into `termId`; `complete` when that was the last place. */
  | { type: "place"; termId: string; complete: boolean }
  /** The card cannot make the example true in `termId`: a mistake. */
  | { type: "wrong"; termId: string };

/** The place the child fills next: the first missing one still empty, or null when all are filled. */
export function nextMathEquationBlank(
  config: Pick<MathEquationConfig, "blankIds">,
  placed: Readonly<Record<string, string>>,
): string | null {
  return config.blankIds.find((id) => !placed[id]) ?? null;
}

/**
 * What a tap on a card does. The places are filled left to right; the card
 * goes into the next one when, with it there, the cards left can still make
 * the example true. The whole play rule, so both players follow it tap for tap.
 */
export function resolveMathEquationTap(
  config: Pick<MathEquationConfig, "terms" | "blankIds" | "cards">,
  placed: Readonly<Record<string, string>>,
  cardId: string,
): MathEquationTapResult {
  const termId = nextMathEquationBlank(config, placed);
  const card = config.cards.find((item) => item.id === cardId);
  const term = config.terms.find((item) => item.id === termId);

  if (!termId || !term || !card || Object.values(placed).includes(cardId)) {
    return { type: "ignored" };
  }

  const next = { ...placed, [termId]: cardId };
  if (!mathCardFits(term, card) || countMathEquationCompletions(config, next, 1) === 0) {
    return { type: "wrong", termId };
  }

  return { type: "place", termId, complete: nextMathEquationBlank(config, next) === null };
}

/**
 * Proportions of the example and its cards. Widths and heights are shares of
 * the height they are drawn at: a digit of a row 100 px high is 80 px wide.
 */
export const MATH_EQUATION_LAYOUT = {
  /** One digit's cell. The library digits are about 0.65–0.8 as wide as they are high. */
  digit: 0.8,
  /** A sign's cell, and the height its picture is fitted into. */
  sign: 0.78,
  signHeight: 0.62,
  /** The "?" in an empty place. */
  blankMark: 0.62,
  /**
   * A copy of a picture in a number drawn as pictures. Every copy in a game is
   * the same size, so a count never looks like a size question: big, in one
   * row, while no number in the game shows more than `pictureLargeUpTo`;
   * otherwise small, in two rows.
   */
  pictureLarge: 0.9,
  pictureSmall: 0.5,
  pictureLargeUpTo: 3,
  /** Space between two places of the example. */
  gap: 0.16,
  /** The panel's padding around the example. */
  pad: 0.18,
  /** The row never grows past this, in px… */
  maxRow: 170,
  /** …nor its panel past this share of the free height. */
  maxPanelShare: 0.42,
  /** A card's number, next to the example's: a little smaller, so the example reads first. */
  cardShare: 0.8,
  /** A card's number never grows past this, in px, nor past this share of the free height. */
  maxCard: 110,
  maxCardShare: 0.26,
  /** In px: the card's colour around its white tile, the tile around the number, between cards, the tray around them. */
  cardPad: 10,
  tilePad: 6,
  cardGap: 12,
  trayPad: 8,
} as const;

/** Something drawn in one box: a number, a sign, or an empty place. */
export type MathEquationItem =
  | { kind: "number"; value: number; image?: string | null }
  | { kind: "sign"; value: MathEquationSign }
  | { kind: "blank" };

/**
 * The size of one copy for every number a game draws as pictures, as a share
 * of the height it is drawn at: see `MATH_EQUATION_LAYOUT.pictureLarge`.
 */
export function mathEquationPictureCell(config: Pick<MathEquationConfig, "terms" | "cards">): number {
  const counts = [...config.terms, ...config.cards].map((item) => (item.kind === "number" && item.image ? item.value : 0));
  const { pictureLarge, pictureSmall, pictureLargeUpTo } = MATH_EQUATION_LAYOUT;
  return Math.max(0, ...counts) <= pictureLargeUpTo ? pictureLarge : pictureSmall;
}

/** Rows of copies, top first: one row while they are big or few, else two with the fuller one below. */
function mathPictureRows(count: number, cell: number): number[] {
  if (cell >= MATH_EQUATION_LAYOUT.pictureLarge || count <= 2) {
    return [Math.max(1, count)];
  }
  return [Math.floor(count / 2), Math.ceil(count / 2)];
}

/** How wide an item is drawn, as a share of its height; `pictureCell` from `mathEquationPictureCell`. */
export function mathEquationItemUnits(
  item: MathEquationItem,
  pictureCell: number = MATH_EQUATION_LAYOUT.pictureLarge,
): number {
  if (item.kind === "sign" || item.kind === "blank") {
    return MATH_EQUATION_LAYOUT.sign;
  }

  return item.image
    ? Math.max(...mathPictureRows(item.value, pictureCell)) * pictureCell
    : mathNumberGlyphs(item.value).length * MATH_EQUATION_LAYOUT.digit;
}

/** One picture of an item: a digit, a sign, the "?" or one copy of a picture. */
export type MathEquationPiece = {
  key: string;
  /** The glyph to draw; null for a copy of `image`. */
  glyph: MathEquationGlyph | null;
  image: string | null;
  /** In fractions of the box, which is `units` times as wide as it is high. Fit the picture inside. */
  box: PictureCopyBox;
};

/**
 * Where each picture of an item goes in a box `units` times as wide as it is
 * high, centred. Fractions of the box, so the same pieces serve a card, a
 * place in the example and a card flying between the two.
 */
export function mathEquationPieces(
  item: MathEquationItem,
  units: number,
  pictureCell: number = MATH_EQUATION_LAYOUT.pictureLarge,
): MathEquationPiece[] {
  const width = Math.max(units, 1e-6);
  const { digit, sign, signHeight, blankMark } = MATH_EQUATION_LAYOUT;
  const centred = (glyph: MathEquationGlyph, w: number, h: number, key: string): MathEquationPiece => ({
    key,
    glyph,
    image: null,
    box: { left: (width - w) / 2 / width, top: (1 - h) / 2, width: w / width, height: h },
  });

  if (item.kind === "blank") {
    return [centred("?", Math.min(sign, width), blankMark, "blank")];
  }

  if (item.kind === "sign") {
    return [centred(item.value, Math.min(sign, width), signHeight, `sign-${item.value}`)];
  }

  if (item.image) {
    const rows = mathPictureRows(item.value, pictureCell);
    const inset = (pictureCell * PICTURE_COPIES_GAP) / 2;
    const size = pictureCell - inset * 2;
    const top = (1 - rows.length * pictureCell) / 2;
    const image = item.image;
    return rows.flatMap((inRow, row) => {
      const start = (width - inRow * pictureCell) / 2;
      return Array.from({ length: inRow }, (_, column): MathEquationPiece => ({
        key: `copy-${row}-${column}`,
        glyph: null,
        image,
        box: {
          left: (start + column * pictureCell + inset) / width,
          top: top + row * pictureCell + inset,
          width: size / width,
          height: size,
        },
      }));
    });
  }

  const glyphs = mathNumberGlyphs(item.value);
  const start = (width - glyphs.length * digit) / 2;
  return glyphs.map((glyph, index) => ({
    key: `digit-${index}`,
    glyph,
    image: null,
    box: { left: (start + index * digit) / width, top: 0, width: digit / width, height: 1 },
  }));
}

export type MathEquationLayout = {
  /** The panel the example sits on, floating on the background. */
  panel: BoardRect;
  /** Height of the example's row, in px. */
  row: number;
  /** Each place of the example, in `terms` order; an empty place is the slot a card flies into. */
  terms: Array<BoardRect & { id: string; units: number }>;
  /** The panel behind the cards. */
  tray: BoardRect;
  /** In `cards` order: the card, its white tile, and where its number or sign is drawn (where a flying card starts). */
  cards: BoardRect[];
  tiles: BoardRect[];
  contents: BoardRect[];
  /** How wide every card's content box is, as a share of its height. */
  contentUnits: number;
  /** The copy size of every number drawn as pictures: pass it to `mathEquationPieces`. */
  pictureCell: number;
};

/**
 * Where everything of a math example goes on its stage. The background covers
 * the whole stage; the example sits on a panel above, the cards in a tray
 * below — two safe areas a gap apart, both inside the stage less `insets` and
 * an edge margin. The example is sized first and the cards a little smaller,
 * so it is what the child reads first. An empty place is as wide as the
 * widest card of its kind, so its size gives nothing away.
 */
export function layoutMathEquation(
  stageWidth: number,
  stageHeight: number,
  config: Pick<MathEquationConfig, "terms" | "cards">,
  insets: SceneInsets = {},
): MathEquationLayout | null {
  const L = MATH_EQUATION_LAYOUT;
  const originX = insets.left ?? 0;
  const originY = insets.top ?? 0;
  const usableWidth = stageWidth - originX - (insets.right ?? 0);
  const usableHeight = stageHeight - originY - (insets.bottom ?? 0);

  if (usableWidth <= 0 || usableHeight <= 0 || config.terms.length === 0) {
    return null;
  }

  const edge = sceneEdge(stageWidth, stageHeight);
  const gap = sceneGap(stageWidth, stageHeight);
  const areaWidth = Math.max(usableWidth - edge * 2, 1);
  const areaHeight = Math.max(usableHeight - edge * 2, 1);

  const pictureCell = mathEquationPictureCell(config);
  const cardUnits = config.cards.map((card) => mathEquationItemUnits(card, pictureCell));
  const widestOf = (kind: MathEquationCard["kind"]) =>
    Math.max(0, ...config.cards.map((card, index) => (card.kind === kind ? cardUnits[index] : 0)));
  const numberSlot = Math.max(L.digit, widestOf("number"));
  const termUnits = config.terms.map((term) =>
    term.missing ? (term.kind === "number" ? numberSlot : L.sign) : mathEquationItemUnits(term, pictureCell),
  );
  const contentUnits = Math.max(L.sign, ...cardUnits);
  const count = config.cards.length;

  const rowUnits = termUnits.reduce((sum, units) => sum + units, 0) + L.gap * (termUnits.length - 1) + L.pad * 2;
  const panelUnitsHigh = 1 + L.pad * 2;
  const cardFrame = 2 * (L.cardPad + L.tilePad);
  const trayFixedWidth = count > 0 ? 2 * L.trayPad + L.cardGap * (count - 1) + count * cardFrame : 0;
  const trayFixedHeight = count > 0 ? 2 * L.trayPad + cardFrame : 0;

  let row = Math.min(areaWidth / rowUnits, (areaHeight * L.maxPanelShare) / panelUnitsHigh, L.maxRow);
  let content = count > 0
    ? Math.min(
        row * L.cardShare,
        L.maxCard,
        areaHeight * L.maxCardShare,
        Math.max(areaWidth - trayFixedWidth, count) / (count * contentUnits),
      )
    : 0;

  // Both have to fit one above the other with the gap between.
  const spare = areaHeight - (count > 0 ? gap + trayFixedHeight : 0);
  const needed = row * panelUnitsHigh + content;
  if (needed > spare && needed > 0) {
    const scale = Math.max(spare, 1) / needed;
    row *= scale;
    content *= scale;
  }
  row = Math.max(row, 1);

  const panelWidth = row * rowUnits;
  const panelHeight = row * panelUnitsHigh;
  const cardWidth = content * contentUnits + cardFrame;
  const cardHeight = content + cardFrame;
  const trayWidth = count > 0 ? count * cardWidth + L.cardGap * (count - 1) + 2 * L.trayPad : 0;
  const trayHeight = count > 0 ? cardHeight + 2 * L.trayPad : 0;
  const free = Math.max(0, areaHeight - panelHeight - trayHeight - (count > 0 ? gap : 0));

  const panel: BoardRect = {
    left: originX + edge + (areaWidth - panelWidth) / 2,
    top: originY + edge + free * 0.4,
    width: panelWidth,
    height: panelHeight,
  };

  let x = panel.left + L.pad * row;
  const terms = config.terms.map((term, index) => {
    const rect = { id: term.id, units: termUnits[index], left: x, top: panel.top + L.pad * row, width: termUnits[index] * row, height: row };
    x += rect.width + L.gap * row;
    return rect;
  });

  const tray: BoardRect = {
    left: originX + edge + (areaWidth - trayWidth) / 2,
    top: panel.top + panelHeight + (count > 0 ? gap : 0) + free * 0.3,
    width: trayWidth,
    height: trayHeight,
  };

  const cards: BoardRect[] = [];
  const tiles: BoardRect[] = [];
  const contents: BoardRect[] = [];
  for (let index = 0; index < count; index += 1) {
    const card = { left: tray.left + L.trayPad + index * (cardWidth + L.cardGap), top: tray.top + L.trayPad, width: cardWidth, height: cardHeight };
    const tile = { left: card.left + L.cardPad, top: card.top + L.cardPad, width: cardWidth - 2 * L.cardPad, height: cardHeight - 2 * L.cardPad };
    cards.push(card);
    tiles.push(tile);
    contents.push({ left: tile.left + L.tilePad, top: tile.top + L.tilePad, width: tile.width - 2 * L.tilePad, height: tile.height - 2 * L.tilePad });
  }

  return { panel, row, terms, tray, cards, tiles, contents, contentUnits, pictureCell };
}

// --- Attempt metrics --------------------------------------------------------

/**
 * What every game reports with its result, on both platforms.
 *
 * `hadMistake` is the one key the backend reads: a passed game with it set
 * loses the first-attempt bonus and is not "perfect". The rule is the same
 * for every game — it is true once the game has given the child wrong
 * feedback (a life lost, a wrong flash, the `incorrect` sound) before the
 * pass. A memory pair that did not match, a wrong catch, a piece dropped on
 * the wrong cell: all mistakes. `timeLeft` is the countdown at the moment of
 * the result, `null` for untimed games.
 */
export type BaseGameMetrics = {
  hadMistake: boolean;
  timeLeft: number | null;
};

export type AnswerChoiceMetrics = BaseGameMetrics & {
  selectionMode: "single" | "multiple";
  selectedOptionIds: string[];
  correctOptionIds: string[];
  totalOptions: number;
  livesRemaining: number;
};

export type CatchCorrectMetrics = BaseGameMetrics & {
  score: number;
  target: number;
  livesRemaining: number;
};

export type ConnectPairsMetrics = BaseGameMetrics & {
  connectedPairs: number;
  totalPairs: number;
  mismatches: number;
  livesRemaining: number;
};

export type CountPickMetrics = BaseGameMetrics & {
  count: number;
};

export type DragDropMatchMetrics = BaseGameMetrics & {
  placedCount: number;
  totalZones: number;
};

export type ImageOrderMetrics = BaseGameMetrics & {
  placements: Array<string | null>;
  filledSlots: number;
  totalItems: number;
  showExample: number;
  livesRemaining: number;
};

export type MathEquationMetrics = BaseGameMetrics & {
  /** Places the example left to fill, and how many were filled. */
  blanks: number;
  filled: number;
  livesRemaining: number;
};

export type JigsawMetrics = BaseGameMetrics & {
  pieces: number;
  tries: number;
};

export type MemoryCardsMetrics = BaseGameMetrics & {
  moves: number;
  matchedCount: number;
  maxMoves: number | null;
};

export type PatternNextMetrics = BaseGameMetrics & {
  patternLength: number;
  sequenceLength: number;
};

export type SelectOptionMetrics = BaseGameMetrics & {
  selectedOptionId: string | null;
  correctOptionIds: string[];
  livesRemaining: number;
};

export type ShadowMatchMetrics = BaseGameMetrics & {
  score: number;
  totalItems: number;
  livesRemaining: number;
};

export type SizeOrderMetrics = BaseGameMetrics & {
  moves: number;
  steps: number;
};

export type SortBinsMetrics = BaseGameMetrics & {
  sorted: number;
  total: number;
};

export type SvgAssembleMetrics = BaseGameMetrics & {
  selectedOptionId: string | null;
  livesRemaining: number;
};

// --- The registry of playable kinds ----------------------------------------

/** Every kind a renderer must implement. `generic` is the fallback, not a game. */
export type PlayableGameKind = Exclude<RuntimeGameKind, "generic">;

/**
 * Kind → the camelCase key used in `GAME_TIMINGS`. Adding a kind to
 * `RuntimeGameKind` without adding it here is a compile error, and so is a
 * `GAME_TIMINGS` or `GameMetricsByKind` entry that goes missing — that is the
 * point: a new game cannot ship without its timings and its metrics shape.
 */
export const GAME_KIND_KEYS = {
  "answer-choice": "answerChoice",
  "catch-correct": "catchCorrect",
  "connect-pairs": "connectPairs",
  "count-pick": "countPick",
  "drag-drop-match": "dragDropMatch",
  images_order: "imagesOrder",
  jigsaw: "jigsaw",
  "math-equation": "mathEquation",
  "memory-cards": "memoryCards",
  "pattern-next": "patternNext",
  "select-option": "selectOption",
  "shadow-match": "shadowMatch",
  "size-order": "sizeOrder",
  "sort-bins": "sortBins",
  "svg-assemble": "svgAssemble",
} as const satisfies Record<PlayableGameKind, keyof typeof GAME_TIMINGS>;

export type GameTimingKey = (typeof GAME_KIND_KEYS)[PlayableGameKind];

/** The same timings, addressable by kind. Exhaustive by construction. */
export const GAME_TIMINGS_BY_KIND: {
  [K in PlayableGameKind]: (typeof GAME_TIMINGS)[(typeof GAME_KIND_KEYS)[K]];
} = {
  "answer-choice": GAME_TIMINGS.answerChoice,
  "catch-correct": GAME_TIMINGS.catchCorrect,
  "connect-pairs": GAME_TIMINGS.connectPairs,
  "count-pick": GAME_TIMINGS.countPick,
  "drag-drop-match": GAME_TIMINGS.dragDropMatch,
  images_order: GAME_TIMINGS.imagesOrder,
  jigsaw: GAME_TIMINGS.jigsaw,
  "math-equation": GAME_TIMINGS.mathEquation,
  "memory-cards": GAME_TIMINGS.memoryCards,
  "pattern-next": GAME_TIMINGS.patternNext,
  "select-option": GAME_TIMINGS.selectOption,
  "shadow-match": GAME_TIMINGS.shadowMatch,
  "size-order": GAME_TIMINGS.sizeOrder,
  "sort-bins": GAME_TIMINGS.sortBins,
  "svg-assemble": GAME_TIMINGS.svgAssemble,
};

// --- The hint of how a game is played ---------------------------------------

/** How a child answers in a game: by tapping a thing, or by carrying it somewhere. */
export type GameGesture = "tap" | "drag";

/**
 * What the hand of the hint shows in each game. A game that can be played both
 * ways (carry a card to its place, or tap the card and then the place) is
 * shown carried: a tap on the card alone looks as if nothing happened.
 * Exhaustive by construction, like the timings.
 */
export const GAME_GESTURES = {
  "answer-choice": "tap",
  "catch-correct": "tap",
  "connect-pairs": "tap",
  "count-pick": "tap",
  "drag-drop-match": "drag",
  // Played by tapping alone: a picture tapped goes to the first free place.
  images_order: "tap",
  jigsaw: "drag",
  "math-equation": "tap",
  "memory-cards": "tap",
  "pattern-next": "tap",
  "select-option": "tap",
  "shadow-match": "drag",
  "size-order": "drag",
  "sort-bins": "drag",
  "svg-assemble": "tap",
} as const satisfies Record<PlayableGameKind, GameGesture>;

/**
 * The hint itself: a hand that shows the gesture and never the answer. It
 * waits `delayMs` after the game is ready — a child who is already playing
 * never sees it — leaves at the first touch, and comes back when the child
 * has done nothing for `idleMs`. Tapping, it visits the things that can be
 * tapped in turn, a beat on each, with no favourite among them. Carrying, it
 * lifts one thing and takes it only `dragReach` of the way towards the
 * middle of where things go, so it never arrives at a place.
 */
export const GESTURE_HINT = {
  delayMs: 2500,
  idleMs: 8000,
  tapBeatMs: 1100,
  dragBeatMs: 2200,
  dragReach: 0.55,
  tapStops: 4,
} as const;

/**
 * Which of `count` things the tapping hand visits on its `round`-th time
 * round. All of them where they are few; where they are many, `tapStops` of
 * them spread from the first to the last, a different set each round — so in
 * the end every one is visited and none is ever left out for good.
 */
export function gestureHintTapStops(count: number, round = 0): number[] {
  if (count <= 0) {
    return [];
  }

  if (count <= GESTURE_HINT.tapStops) {
    return Array.from({ length: count }, (_unused, index) => index);
  }

  const shift = ((round % count) + count) % count;

  return Array.from(
    { length: GESTURE_HINT.tapStops },
    (_unused, index) => (Math.floor((index * count) / GESTURE_HINT.tapStops) + shift) % count,
  );
}

/**
 * Where the carrying hand lets go: `dragReach` of the way from the thing it
 * lifted towards the middle of where things go.
 */
export function gestureHintDragEnd(
  from: { x: number; y: number },
  towards: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: from.x + (towards.x - from.x) * GESTURE_HINT.dragReach,
    y: from.y + (towards.y - from.y) * GESTURE_HINT.dragReach,
  };
}

/** Kind → what its result carries. Every entry extends `BaseGameMetrics`. */
export type GameMetricsByKind = {
  "answer-choice": AnswerChoiceMetrics;
  "catch-correct": CatchCorrectMetrics;
  "connect-pairs": ConnectPairsMetrics;
  "count-pick": CountPickMetrics;
  "drag-drop-match": DragDropMatchMetrics;
  images_order: ImageOrderMetrics;
  jigsaw: JigsawMetrics;
  "math-equation": MathEquationMetrics;
  "memory-cards": MemoryCardsMetrics;
  "pattern-next": PatternNextMetrics;
  "select-option": SelectOptionMetrics;
  "shadow-match": ShadowMatchMetrics;
  "size-order": SizeOrderMetrics;
  "sort-bins": SortBinsMetrics;
  "svg-assemble": SvgAssembleMetrics;
};

// Compile-time completeness: every playable kind has a metrics shape, and every
// shape carries the base keys. A missing entry shows up here, not in production.
type AssertMetricsComplete<T extends Record<PlayableGameKind, BaseGameMetrics>> = T;
export type GameMetricsRegistryCheck = AssertMetricsComplete<GameMetricsByKind>;

/** The result a game hands the player. Same shape on both platforms. */
export type GameOutcome<K extends PlayableGameKind = PlayableGameKind> =
  | { status: "passed"; reason: "success"; metrics: GameMetricsByKind[K] }
  | { status: "failed"; reason: GameFailureReason; metrics: GameMetricsByKind[K] };

// The colour themes of both clients (see theme.ts for why they are here).
export * from "./theme.js";
