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
/** One picture placed by the author, in percent of the board. */
export type CountPickPlacement = {
    image: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
export type CountPickConfig = {
    /** The object to count. One picture, repeated. */
    image: string | null;
    /** How many copies to lay out — or, for a composed scene, how many placements are counted. */
    count: number;
    /** The numbers offered, already shuffled. */
    choices: CountPickChoice[];
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
    board: {
        width: number;
        height: number;
    } | null;
    /** Everything the game draws, for the players to preload. */
    imageUris: string[];
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
    /**
     * Every remote picture the scene and the pieces draw — a scene composed
     * from library pictures references them by URL. Preload these before the
     * clock starts, as the other picture games do.
     */
    imageUris: string[];
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
 * The largest box of the board's aspect ratio that fits the space, for a
 * composed count_pick scene: the whole background stays visible, so every
 * placement is exactly where the author put it.
 */
export declare function fitCountPickBoard(availableWidth: number, availableHeight: number, board: {
    width: number;
    height: number;
}): {
    width: number;
    height: number;
};
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
/** The http(s) pictures an SVG's `<image>` elements load, in document order. */
export declare function extractSvgImageUris(svg: string | null | undefined): string[];
export declare function normalizeSvgAssembleConfig(game: AuthoredGame, config: Record<string, unknown>): SvgAssembleConfig;
export declare function createClientEventId(): string;
/**
 * Fisher-Yates. Card order is part of the game, so both platforms must shuffle
 * the same way rather than each reaching for its own helper.
 */
export declare function shuffle<T>(items: readonly T[]): T[];
/**
 * Why a game ended without a pass. Stored with the attempt; the web player
 * maps each one to a message.
 */
export type GameFailureReason = "timeout" | "lives_out" | "wrong_catch" | "moves_out";
export declare const FAILURE_REASON: {
    readonly timeout: "timeout";
    readonly livesOut: "lives_out";
    /** Catch Correct only: the last life went on a wrong catch. */
    readonly wrongCatch: "wrong_catch";
    readonly movesOut: "moves_out";
};
/**
 * The "halfway there" cheer. Fires once, when the child reaches the midpoint
 * of a game with more than two steps, and never on the last step — the win
 * sound covers that. A two-step game gets the ordinary "correct" instead:
 * cheering "halfway" after the first of two is noise.
 */
export declare function shouldPlayHalfway(next: number, total: number): boolean;
/**
 * Whether an authored label is a picture (URL or path) rather than text.
 * Catch Correct items may be either, and both renderers must draw the same
 * thing for the same label.
 */
export declare function isImageReference(value: unknown): value is string;
/** Spawn interval floor: below this the screen fills faster than a child can look. */
export declare const CATCH_CORRECT_MIN_FREQUENCY_MS = 500;
/** Fall duration bounds: faster is unplayable, slower is boring. */
export declare const CATCH_CORRECT_MIN_FALL_MS = 2400;
export declare const CATCH_CORRECT_MAX_FALL_MS = 7600;
/** Demo items for a game authored without any, so it is still playable. */
export declare const DEFAULT_CATCH_CORRECT_ITEMS: ReadonlyArray<{
    label: string;
    correct: boolean;
}>;
/** How long one item takes to cross the stage, from the authored `speed`. */
export declare function catchCorrectFallDurationMs(speed: number): number;
/** A drop counts when its centre is within this fraction of the target's longer side. */
export declare const SHADOW_MATCH_DROP_TOLERANCE = 0.42;
/** A miss is blamed on the nearest other target within this fraction — feedback only. */
export declare const SHADOW_MATCH_MISS_TOLERANCE = 0.5;
export declare function isShadowMatchHit(distance: number, targetWidth: number, targetHeight: number): boolean;
export declare function isShadowMatchNearMiss(distance: number, targetWidth: number, targetHeight: number): boolean;
export type StageSize = {
    width: number;
    height: number;
};
export type BoardRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
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
export declare function getDragDropMatchSceneMetrics(viewportWidth: number, viewportHeight: number, sourceWidth: number, sourceHeight: number): DragDropMatchSceneMetrics | null;
export declare function getDragDropMatchZoneRect(zone: Pick<DragDropMatchZone, "x" | "y" | "width" | "height">, metrics: DragDropMatchSceneMetrics): BoardRect;
/** Zone rectangles in stage pixels, in `config.zones` order. Raw percentages until the stage is measured. */
export declare function layoutDragDropMatchZones(stage: StageSize, config: Pick<DragDropMatchConfig, "zones" | "board_width" | "board_height">): BoardRect[];
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
export declare function getSelectOptionSceneMetrics(viewportWidth: number, viewportHeight: number, sourceWidth: number, sourceHeight: number): SelectOptionSceneMetrics | null;
/** The touch box (`left/top/width/height`) plus the picture drawn centred inside it. */
export type SelectOptionItemRect = BoardRect & {
    visualWidth: number;
    visualHeight: number;
};
export declare function getSelectOptionItemRect(item: Pick<SelectOptionItem, "x" | "y" | "width" | "height">, metrics: SelectOptionSceneMetrics): SelectOptionItemRect;
/** Item touch boxes in stage pixels, in `config.items` order. Empty until the stage is measured. */
export declare function layoutSelectOptionItems(stage: StageSize, config: Pick<SelectOptionConfig, "items" | "board_width" | "board_height">): Array<{
    id: string;
} & SelectOptionItemRect>;
/**
 * How long each game waits between an action and its consequence, in ms. Not
 * a rule in the scoring sense, but a child who gets 650 ms to see a mistake on
 * one device and 900 ms on another is playing two different games.
 */
export declare const GAME_TIMINGS: {
    readonly answerChoice: {
        readonly wrongFeedbackSingleMs: 700;
        readonly wrongFeedbackMultiMs: 850;
        readonly successSettleMs: 120;
    };
    readonly catchCorrect: {
        readonly wrongShakeMs: 100;
        readonly completionDelayMs: 0;
    };
    readonly countPick: {
        readonly wrongFeedbackMs: 600;
    };
    readonly dragDropMatch: {
        readonly wrongFeedbackMs: 420;
        readonly successSettleMs: 140;
    };
    readonly imagesOrder: {
        readonly wrongFillFeedbackMs: 900;
    };
    readonly jigsaw: {
        readonly wrongFlashMs: 500;
        readonly successSettleMs: 400;
    };
    readonly memoryCards: {
        readonly matchRevealMs: 500;
        readonly mismatchFlipBackMs: 1000;
    };
    readonly patternNext: {
        readonly wrongFeedbackMs: 600;
        readonly successSettleMs: 450;
    };
    readonly selectOption: {
        readonly wrongFeedbackMs: 600;
        readonly successSettleMs: 180;
        readonly livesOutDelayMs: 260;
    };
    readonly shadowMatch: {
        readonly correctLockMs: 220;
        readonly successSettleMs: 220;
        readonly wrongFeedbackMs: 620;
        readonly wrongReturnMs: 220;
        readonly wrongUnlockMs: 560;
        readonly livesOutDelayMs: 640;
    };
    readonly sizeOrder: {
        readonly successSettleMs: 350;
    };
    readonly sortBins: {
        readonly wrongFeedbackMs: 600;
        readonly successSettleMs: 350;
    };
    readonly svgAssemble: {
        readonly wrongFeedbackMs: 560;
        readonly flyMs: 620;
        readonly successSettleMs: 260;
        readonly timeoutSettleMs: 320;
        readonly livesOutDelayMs: 320;
    };
};
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
/** Every kind a renderer must implement. `generic` is the fallback, not a game. */
export type PlayableGameKind = Exclude<RuntimeGameKind, "generic">;
/**
 * Kind → the camelCase key used in `GAME_TIMINGS`. Adding a kind to
 * `RuntimeGameKind` without adding it here is a compile error, and so is a
 * `GAME_TIMINGS` or `GameMetricsByKind` entry that goes missing — that is the
 * point: a new game cannot ship without its timings and its metrics shape.
 */
export declare const GAME_KIND_KEYS: {
    readonly "answer-choice": "answerChoice";
    readonly "catch-correct": "catchCorrect";
    readonly "count-pick": "countPick";
    readonly "drag-drop-match": "dragDropMatch";
    readonly images_order: "imagesOrder";
    readonly jigsaw: "jigsaw";
    readonly "memory-cards": "memoryCards";
    readonly "pattern-next": "patternNext";
    readonly "select-option": "selectOption";
    readonly "shadow-match": "shadowMatch";
    readonly "size-order": "sizeOrder";
    readonly "sort-bins": "sortBins";
    readonly "svg-assemble": "svgAssemble";
};
export type GameTimingKey = (typeof GAME_KIND_KEYS)[PlayableGameKind];
/** The same timings, addressable by kind. Exhaustive by construction. */
export declare const GAME_TIMINGS_BY_KIND: {
    [K in PlayableGameKind]: (typeof GAME_TIMINGS)[(typeof GAME_KIND_KEYS)[K]];
};
/** Kind → what its result carries. Every entry extends `BaseGameMetrics`. */
export type GameMetricsByKind = {
    "answer-choice": AnswerChoiceMetrics;
    "catch-correct": CatchCorrectMetrics;
    "count-pick": CountPickMetrics;
    "drag-drop-match": DragDropMatchMetrics;
    images_order: ImageOrderMetrics;
    jigsaw: JigsawMetrics;
    "memory-cards": MemoryCardsMetrics;
    "pattern-next": PatternNextMetrics;
    "select-option": SelectOptionMetrics;
    "shadow-match": ShadowMatchMetrics;
    "size-order": SizeOrderMetrics;
    "sort-bins": SortBinsMetrics;
    "svg-assemble": SvgAssembleMetrics;
};
type AssertMetricsComplete<T extends Record<PlayableGameKind, BaseGameMetrics>> = T;
export type GameMetricsRegistryCheck = AssertMetricsComplete<GameMetricsByKind>;
/** The result a game hands the player. Same shape on both platforms. */
export type GameOutcome<K extends PlayableGameKind = PlayableGameKind> = {
    status: "passed";
    reason: "success";
    metrics: GameMetricsByKind[K];
} | {
    status: "failed";
    reason: GameFailureReason;
    metrics: GameMetricsByKind[K];
};
export {};
