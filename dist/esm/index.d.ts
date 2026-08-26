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
export type RuntimeGameKind = "catch-correct" | "shadow-match" | "memory-cards" | "images_order" | "drag-drop-match" | "select-option" | "answer-choice" | "svg-assemble" | "jigsaw" | "count-pick" | "pattern-next" | "sort-bins" | "size-order" | "generic";
export type AnswerChoiceOption = {
    id: string;
    image: string;
    label: string | null;
    isCorrect: boolean;
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
export type ImageOrderItem = {
    id: string;
    image: string;
    label: string | null;
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
export type CountPickConfig = {
    /** The object to count. One picture, repeated. */
    image: string | null;
    /** How many copies to lay out. */
    count: number;
    /** The numbers offered, already shuffled. */
    choices: CountPickChoice[];
    bg_image: string | null;
    time_limit: number | null;
    lives: number;
};
export type PatternItem = {
    id: string;
    image: string;
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
};
export type SortBinsItem = {
    id: string;
    image: string;
    label: string | null;
    binId: string;
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
export type DragDropMatchZoneStyle = "card" | "outline";
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
    requiredSlotIds: string[];
    slot: SvgAssembleSlot;
    answers: SvgAssembleAnswer[];
    bg_image: string | null;
    time_limit: number;
    lives: number;
};
type BuildPreparedGameOptions = {
    useFallbackLabels?: boolean;
};
export declare function getRuntimeConfig(config: Record<string, unknown>): Record<string, unknown>;
export declare function buildPreparedGame(game: AuthoredGame, config: Record<string, unknown>, fallbackOptionLabel: (index: number) => string, buildOptions?: BuildPreparedGameOptions): PreparedGame;
export declare function normalizeAnswerChoiceConfig(game: AuthoredGame, config: Record<string, unknown>): AnswerChoiceConfig;
export declare function resolveGameKind(type: string, config: Record<string, unknown>): RuntimeGameKind;
export declare function normalizeCatchCorrectConfig(config: Record<string, unknown>): CatchCorrectConfig;
export declare function normalizeShadowMatchConfig(config: Record<string, unknown>): ShadowMatchConfig;
export declare function normalizeImageOrderConfig(config: Record<string, unknown>): ImageOrderConfig;
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
export declare function normalizeSizeOrderConfig(config: Record<string, unknown>): SizeOrderConfig;
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
export declare function normalizeCountPickConfig(config: Record<string, unknown>): CountPickConfig;
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
export declare function normalizePatternNextConfig(config: Record<string, unknown>): PatternNextConfig;
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
export declare function normalizeSortBinsConfig(config: Record<string, unknown>): SortBinsConfig;
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
export declare function normalizeJigsawConfig(config: Record<string, unknown>): JigsawConfig;
export declare function normalizeDragDropMatchConfig(config: Record<string, unknown>): DragDropMatchConfig;
export declare function normalizeSelectOptionConfig(config: Record<string, unknown>): SelectOptionConfig;
export declare function normalizeMemoryCardsConfig(config: Record<string, unknown>): MemoryCardsConfig;
export declare function parseSvgViewBox(svg: unknown): SvgViewBox;
export declare function normalizeSvgAssembleConfig(game: AuthoredGame, config: Record<string, unknown>): SvgAssembleConfig;
export declare function createClientEventId(): string;
/**
 * Fisher-Yates. Card order is part of the game, so both platforms must shuffle
 * the same way rather than each reaching for its own helper.
 */
export declare function shuffle<T>(items: readonly T[]): T[];
export {};
