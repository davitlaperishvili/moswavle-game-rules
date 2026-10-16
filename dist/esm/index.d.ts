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
export type RuntimeGameKind = "catch-correct" | "shadow-match" | "memory-cards" | "images_order" | "drag-drop-match" | "select-option" | "answer-choice" | "svg-assemble" | "jigsaw" | "count-pick" | "pattern-next" | "sort-bins" | "size-order" | "connect-pairs" | "math-equation" | "text-choice" | "math-input" | "word-build" | "label-diagram" | "reading-text" | "generic";
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
    board: {
        width: number;
        height: number;
    } | null;
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
/**
 * The signs an example is written with. `-` is the minus, whatever dash the
 * author typed; `×` and `÷` are times and divided by, whatever stood for them
 * (`*`, `x`, `·`, `/`, `:`). How each is drawn is the players' own.
 */
export type MathEquationSign = "+" | "-" | "×" | "÷" | "=" | "<" | ">";
/** Every character an example is drawn with, each a picture from the library when there is one. */
export type MathEquationGlyph = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | MathEquationSign | "?";
/** One place in the example, left to right: a number or a sign, shown or left for the child to fill. */
export type MathEquationTerm = {
    id: string;
    kind: "number";
    value: number;
    /** Drawn as `value` copies of this picture (three cows) instead of digits. */
    image: string | null;
    missing: boolean;
} | {
    id: string;
    kind: "sign";
    value: MathEquationSign;
    missing: boolean;
};
/** An answer card: a number (in digits, or as that many copies of a picture) or a sign. */
export type MathEquationCard = {
    id: string;
    kind: "number";
    value: number;
    image: string | null;
} | {
    id: string;
    kind: "sign";
    value: MathEquationSign;
};
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
/**
 * The most copies of one picture a card shows. Six is a 3 × 2 grid — still a
 * picture each a child can tell apart and count on a phone; counting further
 * belongs to count_pick, which has a whole scene to spread over.
 */
export declare const PICTURE_COPIES_MAX = 6;
/**
 * The most copies a falling Catch Correct picture shows. It is counted on the
 * move, at a glance: three is still a shape, four is already a count.
 */
export declare const CATCH_CORRECT_COPIES_MAX = 3;
/** Share of each copy's cell left empty around it, so neighbours never touch. */
export declare const PICTURE_COPIES_GAP = 0.12;
/** A copy's box, in fractions of the card it sits in. */
export type PictureCopyBox = {
    left: number;
    top: number;
    width: number;
    height: number;
};
/** An authored copy count, whole and within 1…PICTURE_COPIES_MAX; 1 when unset. */
export declare function normalizePictureCopies(value: unknown): number;
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
export declare function layoutPictureCopies(count: number, aspect?: number): PictureCopyBox[];
export declare function getRuntimeConfig(config: Record<string, unknown>): Record<string, unknown>;
export declare function buildPreparedGame(game: AuthoredGame, config: Record<string, unknown>, fallbackOptionLabel: (index: number) => string, buildOptions?: BuildPreparedGameOptions): PreparedGame;
export declare function normalizeAnswerChoiceConfig(game: AuthoredGame, config: Record<string, unknown>): AnswerChoiceConfig;
/** Proportions of the stacked answer_choice layout, width over height. */
export declare const ANSWER_CHOICE_STACK: {
    /** An answer card: nearly square, so the picture fills it. */
    readonly cardAspect: 1.15;
    /** The question panel is wider than a card: most question pictures are. */
    readonly questionAspect: 1.35;
    /** The question panel is at least this much taller than a card… */
    readonly minQuestionScale: 1.3;
    /** …and grows into the room left over up to this much. */
    readonly maxQuestionScale: 1.8;
    /** A card never grows past this height, however big the stage. */
    readonly maxCardHeight: 320;
};
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
export declare function layoutAnswerChoiceStack(areaWidth: number, areaHeight: number, answerCount: number): AnswerChoiceStackLayout;
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
/** What a tap on a picture of a counting scene comes to. */
export type CountPickTapOutcome = 
/** One more counted: `number` is the word to say, `complete` once it was the last. */
{
    kind: "counted";
    number: number;
    complete: boolean;
}
/**
 * Counted already (as `number`): not to be tapped again. The players say so
 * — the wrong sound, a shake, a red glow — which makes it a mistake for the
 * result, but it takes no life in any mode.
 */
 | {
    kind: "repeat";
    number: number;
}
/** Not one of the things to count: a mistake, like any wrong answer. */
 | {
    kind: "decoy";
};
/**
 * The whole tap rule of the counting modes (`tap`, `tap_dots`): each thing to
 * count is counted once, in whatever order the child points at them.
 */
export declare function resolveCountPickTap(tap: {
    /** Whether the picture is one of the things to count. */
    counted: boolean;
    /** The number this very picture was counted as, 0 if it has not been. */
    countedAs: number;
    /** How many were counted before this tap. */
    countedSoFar: number;
    total: number;
}): CountPickTapOutcome;
/**
 * Whether a counting game is played with lives. Counted by tapping alone
 * (`tap`, the youngest) it is not: a picture that is not to be counted still
 * gets the wrong sound and marks the mistake, but takes nothing and cannot end
 * the game — so the players draw no lives either. Where a card is chosen
 * (`tap_dots`, `digits`) a wrong one costs a life as in any game.
 */
export declare function countPickUsesLives(mode: CountPickMode): boolean;
/**
 * Which picture the hand points at, counted by tapping: the first thing to
 * count that has not been counted — one picture, never one to ignore, so the
 * hint shows what to do without giving the count away. `null` once there is
 * nothing left to point at.
 */
export declare function countPickHintTarget<T extends {
    id: string;
    counted: boolean;
}>(pictures: readonly T[], countedIds: readonly string[]): string | null;
/**
 * Where the dots of a dot card stand, in fractions of the card (a square),
 * with the dot radius. One to six are the faces of a die, which a child knows
 * from board games; past six the dots stand in short rows, since a row longer
 * than four is read as "many" rather than counted.
 */
export declare function countPickDots(value: number): {
    dots: Array<{
        x: number;
        y: number;
    }>;
    radius: number;
};
/**
 * The largest box of the board's aspect ratio that fits the space, for a scene
 * built in the Scene Composer: the whole background stays visible, so every
 * picture and zone is exactly where the author put it.
 */
export declare function fitSceneBoard(availableWidth: number, availableHeight: number, board: {
    width: number;
    height: number;
}): {
    width: number;
    height: number;
};
/** @deprecated Use fitSceneBoard; kept for 1.8.x callers. */
export declare const fitCountPickBoard: typeof fitSceneBoard;
/** A box in percent of the board (the background's own proportions). */
export type ScenePercentBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Where the background lands on the stage, in stage pixels; left/top are ≤ 0. */
export type SceneCover = {
    left: number;
    top: number;
    width: number;
    height: number;
    scale: number;
};
/** Stage edges taken by the player's own controls, in stage pixels. */
export type SceneInsets = {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
};
/**
 * The background covering the whole stage, as every game must draw it.
 *
 * Covering crops the picture on the sides that do not fit. Instead of always
 * cropping evenly, the crop is shifted so the authored content (the boxes of
 * the scene's pictures, zones or slots) stays in view — centred in the part of
 * the stage the controls leave free when it fits, and kept inside the picture
 * either way.
 */
export declare function coverSceneBoard(stageWidth: number, stageHeight: number, board: {
    width: number;
    height: number;
}, content?: ReadonlyArray<ScenePercentBox>, insets?: SceneInsets): SceneCover;
/** A percent box of the board as stage pixels, through the cover transform. */
export declare function sceneBoxToStage(box: ScenePercentBox, cover: SceneCover): BoardRect;
export type SceneOverlaySpot = "bottom" | "bottom-left" | "bottom-right" | "top" | "top-left" | "top-right" | "left" | "right";
/**
 * Where to put an overlay (the answer tray, the number buttons) on a scene:
 * the candidate spot that covers the least of the content, preferring the
 * bottom centre. `insets` keep it clear of the stage's own controls along an
 * edge; a spot over one of the `blocked` rects (a button in a corner) is
 * taken only when every spot is.
 */
export declare function placeSceneOverlay(stageWidth: number, stageHeight: number, overlayWidth: number, overlayHeight: number, avoid: ReadonlyArray<BoardRect>, insets?: SceneInsets, blocked?: ReadonlyArray<BoardRect>): {
    left: number;
    top: number;
    spot: SceneOverlaySpot;
};
/**
 * The two safe areas of every scene game: the content (pictures, zones, slots)
 * and the answers never touch, and neither leaves the stage.
 */
export declare const SCENE_SAFE_AREA: {
    /** Clear space between everything and the stage edge (or its controls), as a share of the short side. */
    readonly edge: 0.025;
    /** Clear space between the content and the answers, as a share of the short side. */
    readonly gap: 0.04;
    /**
     * A picture that does not fit is shrunk, but not below this share of its
     * size; past it, it is moved instead.
     */
    readonly minScale: 0.55;
};
/**
 * A picture made to fit inside a region. It shrinks towards the side that is
 * still in view, standing where it stood: a character cut at the top keeps
 * its feet where they were, one cut on the left keeps its right side. One cut
 * at the bottom cannot keep its feet anyway, so it moves up whole instead, and
 * shrinks only if it then reaches the top. A picture that would have to shrink
 * past `SCENE_SAFE_AREA.minScale` is moved as well.
 */
export declare function fitSceneRect(rect: BoardRect, region: BoardRect): BoardRect;
export type SceneLayout = {
    /** Where the background goes: over the whole stage. */
    cover: SceneCover;
    /** The content's safe area: the stage less its controls and an edge margin. */
    frame: BoardRect;
    /** Every content box in stage pixels, in input order: whole, inside the frame, clear of the answers. */
    content: BoardRect[];
    /** Where the answers go, or null when there are none (or they are not measured yet). */
    overlay: (BoardRect & {
        spot: SceneOverlaySpot;
    }) | null;
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
 *   the answers' way is moved clear of them (`fitSceneRect`);
 * - two content boxes that stood apart still do: one that all this has put
 *   over another is given the nearest free place (`keepSceneRectsApart`).
 *
 * `content` is everything that must stay whole — the pictures of the scene as
 * well as its zones and slots. `overlay` is the measured size of the answers.
 * `insets` are edges the player's controls take; `controls` are buttons the
 * player puts on the stage itself (the voice button in its corner): the
 * answers never go over one, and the pictures keep an edge margin from them.
 */
export declare function layoutScene(stageWidth: number, stageHeight: number, board: {
    width: number;
    height: number;
}, content: ReadonlyArray<ScenePercentBox>, overlay?: {
    width: number;
    height: number;
} | null, insets?: SceneInsets, controls?: ReadonlyArray<BoardRect>): SceneLayout;
/** Card geometry for the svg_assemble answer tray, in stage pixels. */
export declare const SVG_ASSEMBLE_CARD: {
    /** Space between two cards. */
    readonly gap: 12;
    /** Inset of the white tile inside a card. */
    readonly imagePad: 12;
    /** Room under the tile for a label, when any answer has one. */
    readonly labelHeight: 22;
    /** Padding of the tray panel around the cards. */
    readonly trayPad: 8;
};
export type SvgAssembleSceneLayout = {
    /** The scene (its viewBox) drawn over the whole stage. */
    board: BoardRect;
    slots: Array<BoardRect & {
        id: string;
    }>;
    /** The scene's other pictures, where they are drawn; see `arrangeSvgAssembleScene`. */
    layers: Array<BoardRect & {
        id: string;
    }>;
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
export declare function layoutSvgAssembleScene(stageWidth: number, stageHeight: number, viewBox: SvgViewBox, slots: ReadonlyArray<SvgAssembleSlot>, count: number, hasLabels: boolean, insets?: SceneInsets, layers?: ReadonlyArray<SvgAssembleSlot> | null, controls?: ReadonlyArray<BoardRect>): SvgAssembleSceneLayout | null;
/**
 * The scene markup with its pictures where `layoutSvgAssembleScene` put them:
 * every `<image>` whose id is a slot or a layer gets the box of its stage rect,
 * in viewBox units. Nothing else in the markup changes.
 */
export declare function arrangeSvgAssembleScene(svg: string, viewBox: SvgViewBox, layout: Pick<SvgAssembleSceneLayout, "board" | "slots" | "layers">): string;
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
export declare function normalizeConnectPairsConfig(config: Record<string, unknown>): ConnectPairsConfig;
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
export type SquaresFit = {
    side: number;
    columns: number;
    rows: number;
};
/**
 * The biggest squares `count` things can be in a box, `gap` apart: the grid
 * is chosen for them, the fewer rows when two grids give the same.
 */
export declare function fitSquares(width: number, height: number, count: number, gap?: number): SquaresFit;
/** No tile of the tray is longer than this on a side: a big screen makes no giants. */
export declare const SORT_BINS_TILE_MAX = 190;
/** A thing already sorted is drawn this much of a tray tile, when its group has the room. */
export declare const SORT_BINS_SORTED_SHARE = 0.86;
export type SortBinsTrayLayout = {
    /** The side of one tile. */
    tile: number;
    /** How many stand in a line. */
    columns: number;
    /** Between two tiles, both ways. */
    gap: number;
    /** Where the tiles' block begins from the tray's left, and how wide it is. */
    left: number;
    width: number;
};
/**
 * The things still to sort, in their tray (`width` x `height`, the room
 * inside its padding).
 *
 * The tiles are as big as the tray lets `count` of them be — the count the
 * game starts with, so a tile keeps its size as the tray empties — instead of
 * one small size on every screen. `reserveLeft` is the strip at the tray's
 * left that the speaker's corner takes: the tiles stand in the middle of the
 * whole tray, and move right only as far as that strip makes them.
 */
export declare function layoutSortBinsTray(width: number, height: number, count: number, reserveLeft?: number): SortBinsTrayLayout;
/**
 * The side of a thing lying in its group (`width` x `height`, the room for
 * the group's things). It stays close to a tray tile — shrinking it made the
 * finished half of the game look like a discard pile — but `most`, the most
 * things one group ends with, must all fit.
 */
export declare function sortBinsSortedSide(width: number, height: number, most: number, tile: number, gap?: number): number;
export type MemoryCardsLayout = {
    columns: number;
    rows: number;
    /** One card's box. */
    cardWidth: number;
    cardHeight: number;
    /** Between two cards, both ways. */
    gap: number;
    /** The whole grid's box on the stage. A last row that is not full stands in its middle. */
    left: number;
    top: number;
    width: number;
    height: number;
};
/** No card is longer than this on a side: a big screen makes no giants. */
export declare const MEMORY_CARD_MAX_SIDE = 230;
/**
 * Where the cards of a memory game go on a stage (`width` x `height`, the
 * whole game window).
 *
 * The cards share the stage less `insets` (the chrome's band, the phone's
 * edges) and stand in its middle. The grid is the one whose pictures come out
 * biggest, and a card fills its cell — wider than tall on a phone on its side,
 * where two rows leave room to spare beside them — instead of keeping one
 * shape and leaving the stage empty around a small board.
 *
 * `controls` are what the player keeps in the bottom-left corner (the
 * instruction voice's speaker). A board that fits beside or above it stays in
 * the middle of the whole stage; only one that would lie under it moves, to
 * whichever side of it leaves the cards bigger.
 */
export declare function layoutMemoryCards(width: number, height: number, count: number, insets?: SceneInsets, controls?: ReadonlyArray<BoardRect>): MemoryCardsLayout;
/**
 * The backs of the cards, toy colours a card has by where it lies — never by
 * what it hides, so a back tells nothing. `from` and `to` are the back's
 * gradient, `ink` the mark drawn on it, `soft` the rim of the card's face.
 */
export declare const MEMORY_CARD_COLORS: readonly [{
    readonly from: "#5cc8ff";
    readonly to: "#2f8fff";
    readonly ink: "#1d6fe0";
    readonly soft: "#cfe9ff";
}, {
    readonly from: "#ff9cba";
    readonly to: "#f2548b";
    readonly ink: "#d63a72";
    readonly soft: "#ffdbe7";
}, {
    readonly from: "#ffd766";
    readonly to: "#ff9f2e";
    readonly ink: "#d97400";
    readonly soft: "#ffeec2";
}, {
    readonly from: "#86e59a";
    readonly to: "#2fbf71";
    readonly ink: "#1f9d5a";
    readonly soft: "#d3f5dc";
}, {
    readonly from: "#bca4ff";
    readonly to: "#7c5cff";
    readonly ink: "#6442e6";
    readonly soft: "#e4dbff";
}];
export type MemoryCardColor = (typeof MEMORY_CARD_COLORS)[number];
/** The colour of the card at `index` of a grid of `columns`: no two neighbours alike. */
export declare function memoryCardColor(index: number, columns: number): MemoryCardColor;
export type PatternNextLayout = {
    /** The side of one picture of the row, and of the box that waits for the answer. */
    item: number;
    /** How many of them stand in one line: a long row is broken in two. */
    perLine: number;
    /** The gap between two of them, and between the two lines. */
    itemGap: number;
    /** The side of one answer card. */
    choice: number;
    /** The gap between two answer cards. */
    choiceGap: number;
    /** The gap between the row and the answer cards. */
    rowGap: number;
};
/**
 * How big the row and the answer cards of a "what comes next" game are in the
 * room the game has (`width` x `height`, the stage less its edges).
 *
 * The two are one group, to be centred in that room: the row, a small gap, the
 * cards. They grow with the room instead of keeping a fixed size, so a phone
 * on its side is filled rather than left with a row under the chrome, cards at
 * the bottom and sand between them. `rowCount` is the row's pictures and the
 * box that waits for the answer. A pattern of counts (`counting`) is drawn
 * bigger: several copies share one picture's box.
 */
export declare function layoutPatternNext(width: number, height: number, rowCount: number, choiceCount: number, counting?: boolean): PatternNextLayout;
/** A drop counts when its centre is within this fraction of the target's longer side. */
export declare const SHADOW_MATCH_DROP_TOLERANCE = 0.42;
/** A picture is on another one's shadow when its centre is within this fraction of that shadow. */
export declare const SHADOW_MATCH_MISS_TOLERANCE = 0.5;
export declare function isShadowMatchHit(distance: number, targetWidth: number, targetHeight: number): boolean;
export declare function isShadowMatchNearMiss(distance: number, targetWidth: number, targetHeight: number): boolean;
/**
 * What letting go of a picture was. On its own shadow it is placed. On another
 * picture's shadow it is a mistake: a life, and `hadMistake`. Anywhere else it
 * was let slip on the way — a small hand does that — so it goes back to where
 * it waited and nothing is counted, no life and no sound.
 */
export type ShadowMatchDrop = "hit" | "wrong" | "stray";
export declare function judgeShadowMatchDrop(onOwnShadow: boolean, onAnotherShadow: boolean): ShadowMatchDrop;
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
    /**
     * A connected pair glows and bounces for `matchFeedbackMs` while its line is
     * drawn over `lineDrawMs`; a wrong pair flashes red for `wrongFeedbackMs`;
     * the last pair gets `successSettleMs` to be seen before the win.
     */
    readonly connectPairs: {
        readonly matchFeedbackMs: 650;
        readonly lineDrawMs: 350;
        readonly wrongFeedbackMs: 600;
        readonly successSettleMs: 700;
    };
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
    readonly countPick: {
        readonly wrongFeedbackMs: 600;
        readonly countedPopMs: 320;
        readonly countedHoldMs: 1200;
        readonly hintDelayMs: 1200;
        readonly hintBeatMs: 1100;
        readonly hintIdleMs: 6000;
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
    /**
     * A right card flies into its place over `flyMs`; a wrong one shakes for
     * `wrongFeedbackMs`. The finished example stays `successSettleMs` so the
     * child sees it whole before the win.
     */
    /**
     * A wrong answer shakes for `wrongFeedbackMs` and stays crossed out. The
     * right one stays lit `successSettleMs` before the win.
     */
    readonly textChoice: {
        readonly wrongFeedbackMs: 560;
        readonly successSettleMs: 600;
        readonly livesOutDelayMs: 320;
    };
    /**
     * A wrong number shakes in its place for `wrongFeedbackMs` and is then
     * wiped. The right one stays `successSettleMs` so the child sees the
     * example whole before the win.
     */
    readonly mathInput: {
        readonly wrongFeedbackMs: 620;
        readonly successSettleMs: 700;
        readonly livesOutDelayMs: 320;
    };
    /**
     * A right letter flies to its place over `flyMs`; a wrong one shakes for
     * `wrongFeedbackMs`. The word stays `successSettleMs` once built, so the
     * child reads it whole before the win.
     */
    readonly wordBuild: {
        readonly wrongFeedbackMs: 520;
        readonly flyMs: 420;
        readonly successSettleMs: 900;
        readonly livesOutDelayMs: 320;
    };
    /**
     * A wrong card shakes for `wrongFeedbackMs`. Once every part is named the
     * scene stays `successSettleMs`, so the child sees it whole with its legend.
     */
    readonly labelDiagram: {
        readonly wrongFeedbackMs: 520;
        readonly successSettleMs: 1000;
        readonly livesOutDelayMs: 320;
    };
    /**
     * A wrong answer shakes for `wrongFeedbackMs`. A right one stays lit for
     * `nextQuestionMs` before the next question comes; after the last, the
     * game waits `successSettleMs`.
     */
    readonly readingText: {
        readonly wrongFeedbackMs: 560;
        readonly nextQuestionMs: 700;
        readonly successSettleMs: 700;
        readonly livesOutDelayMs: 320;
    };
    readonly mathEquation: {
        readonly wrongFeedbackMs: 560;
        readonly flyMs: 620;
        readonly successSettleMs: 600;
        readonly livesOutDelayMs: 320;
    };
};
/** More pairs than this do not fit a phone at a size a child can hit. */
export declare const CONNECT_PAIRS_MAX = 6;
export type ConnectPairsSide = "left" | "right";
/** A card the child tapped: which group, and the pair it belongs to. */
export type ConnectPairsPick = {
    side: ConnectPairsSide;
    pairId: string;
};
export type ConnectPairsTapResult = 
/** A card already connected: nothing happens. */
{
    type: "ignored";
}
/** Nothing was picked, or another card of the same group was: this one is picked now. */
 | {
    type: "select";
    pick: ConnectPairsPick;
}
/** The picked card again: the pick is dropped. */
 | {
    type: "deselect";
}
/** Partners: the pair is connected, the pick is dropped. */
 | {
    type: "match";
    pairId: string;
}
/** Not partners: a mistake, the pick is dropped. */
 | {
    type: "mismatch";
    leftPairId: string;
    rightPairId: string;
};
/**
 * What a tap on a card does, given the card picked so far and the pairs
 * already connected. The whole play rule of the game, so both players follow
 * it tap for tap: a card of the other group checks the pair, a card of the
 * same group takes over the pick, the picked card again drops it.
 */
export declare function resolveConnectPairsTap(picked: ConnectPairsPick | null, connected: Iterable<string>, tap: ConnectPairsPick): ConnectPairsTapResult;
export declare const CONNECT_PAIRS_LAYOUT: {
    /** A card never grows past this, in px, however large the stage. */
    readonly maxCard: 200;
    /** Space between neighbouring cards of a group, as a share of a card: at least, at most. */
    readonly minGap: 0.14;
    readonly maxGap: 0.5;
    /**
     * The lane between the two groups, where the lines run, as a share of a card: at least, at most.
     * On a phone on its side the lane is what the cards' size is paid from: at 0.9 of a card
     * three pairs stood small with room to spare, at 0.6 a line is still plain to see.
     */
    readonly minLane: 0.6;
    readonly maxLane: 3;
    /** Kept clear along the stage's edges, as a share of its shorter side. */
    readonly margin: 0.03;
};
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
export declare function layoutConnectPairs(width: number, height: number, count: number, insets?: SceneInsets): ConnectPairsLayout;
/**
 * The line that joins two connected cards: from the middle of the left card's
 * edge facing the right group to the middle of the right card's facing edge.
 */
export declare function connectPairsLink(orientation: ConnectPairsOrientation, left: BoardRect, right: BoardRect): {
    from: {
        x: number;
        y: number;
    };
    to: {
        x: number;
        y: number;
    };
};
/** The most places an example leaves to fill: more is a puzzle, not a sum. */
export declare const MATH_EQUATION_BLANKS_MAX = 2;
/** Number cards offered: below two there is no choice, above four the tray outgrows a phone. */
export declare const MATH_EQUATION_CHOICES_MIN = 2;
export declare const MATH_EQUATION_CHOICES_MAX = 4;
/** The most copies of a picture one number shows: counting to ten. */
export declare const MATH_EQUATION_PICTURES_MAX = 10;
/** The largest number an example holds: four digits is what its row and its cards have room for. */
export declare const MATH_EQUATION_NUMBER_MAX = 9999;
/** Whether a sign compares the two sides (`<`, `=`, `>`) rather than working a number out. */
export declare function isMathComparison(sign: MathEquationSign): boolean;
/** Whether a sign multiplies or divides: done before the adding and taking away around it. */
export declare function isMathProduct(sign: MathEquationSign): boolean;
/** The glyphs a number is written with: 15 is "1" then "5". */
export declare function mathNumberGlyphs(value: number): MathEquationGlyph[];
/**
 * How many ways the places still open can be filled from the cards not yet
 * used so that the example reads true, counting no further than `limit`.
 * `placed` maps a filled place to the card in it.
 */
export declare function countMathEquationCompletions(config: Pick<MathEquationConfig, "terms" | "cards">, placed?: Readonly<Record<string, string>>, limit?: number): number;
export declare function normalizeMathEquationConfig(config: Record<string, unknown>): MathEquationConfig;
export type MathEquationTapResult = 
/** Nothing left to fill, or the card is already in the example. */
{
    type: "ignored";
}
/** The card goes into `termId`; `complete` when that was the last place. */
 | {
    type: "place";
    termId: string;
    complete: boolean;
}
/** The card cannot make the example true in `termId`: a mistake. */
 | {
    type: "wrong";
    termId: string;
};
/** The place the child fills next: the first missing one still empty, or null when all are filled. */
export declare function nextMathEquationBlank(config: Pick<MathEquationConfig, "blankIds">, placed: Readonly<Record<string, string>>): string | null;
/**
 * What a tap on a card does. The places are filled left to right; the card
 * goes into the next one when, with it there, the cards left can still make
 * the example true. The whole play rule, so both players follow it tap for tap.
 */
export declare function resolveMathEquationTap(config: Pick<MathEquationConfig, "terms" | "blankIds" | "cards">, placed: Readonly<Record<string, string>>, cardId: string): MathEquationTapResult;
/**
 * Proportions of the example and its cards. Widths and heights are shares of
 * the height they are drawn at: a digit of a row 100 px high is 80 px wide.
 */
export declare const MATH_EQUATION_LAYOUT: {
    /** One digit's cell. The library digits are about 0.65–0.8 as wide as they are high. */
    readonly digit: 0.8;
    /** A sign's cell, and the height its picture is fitted into. */
    readonly sign: 0.78;
    readonly signHeight: 0.62;
    /** The "?" in an empty place. */
    readonly blankMark: 0.62;
    /**
     * A copy of a picture in a number drawn as pictures. Every copy in a game is
     * the same size, so a count never looks like a size question: big, in one
     * row, while no number in the game shows more than `pictureLargeUpTo`;
     * otherwise small, in two rows.
     */
    readonly pictureLarge: 0.9;
    readonly pictureSmall: 0.5;
    readonly pictureLargeUpTo: 3;
    /** Space between two places of the example. */
    readonly gap: 0.16;
    /** The panel's padding around the example. */
    readonly pad: 0.18;
    /** The row never grows past this, in px… */
    readonly maxRow: 170;
    /** …nor its panel past this share of the free height. */
    readonly maxPanelShare: 0.42;
    /** A card's number, next to the example's: a little smaller, so the example reads first. */
    readonly cardShare: 0.8;
    /** A card's number never grows past this, in px, nor past this share of the free height. */
    readonly maxCard: 110;
    readonly maxCardShare: 0.26;
    /** In px: the card's colour around its white tile, the tile around the number, between cards, the tray around them. */
    readonly cardPad: 10;
    readonly tilePad: 6;
    readonly cardGap: 12;
    readonly trayPad: 8;
};
/** Something drawn in one box: a number, a sign, or an empty place. */
export type MathEquationItem = {
    kind: "number";
    value: number;
    image?: string | null;
} | {
    kind: "sign";
    value: MathEquationSign;
} | {
    kind: "blank";
};
/**
 * The size of one copy for every number a game draws as pictures, as a share
 * of the height it is drawn at: see `MATH_EQUATION_LAYOUT.pictureLarge`.
 */
export declare function mathEquationPictureCell(config: Pick<MathEquationConfig, "terms" | "cards">): number;
/** How wide an item is drawn, as a share of its height; `pictureCell` from `mathEquationPictureCell`. */
export declare function mathEquationItemUnits(item: MathEquationItem, pictureCell?: number): number;
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
export declare function mathEquationPieces(item: MathEquationItem, units: number, pictureCell?: number): MathEquationPiece[];
export type MathEquationLayout = {
    /** The panel the example sits on, floating on the background. */
    panel: BoardRect;
    /** Height of the example's row, in px. */
    row: number;
    /** Each place of the example, in `terms` order; an empty place is the slot a card flies into. */
    terms: Array<BoardRect & {
        id: string;
        units: number;
    }>;
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
export declare function layoutMathEquation(stageWidth: number, stageHeight: number, config: Pick<MathEquationConfig, "terms" | "cards">, insets?: SceneInsets): MathEquationLayout | null;
/** How many tones the players' palette of letters has. */
export declare const LETTER_TONE_COUNT = 10;
/** The alphabets of the three languages, in their own order. */
export declare const LETTER_ALPHABETS: {
    readonly ka: "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
    readonly ru: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    readonly en: "abcdefghijklmnopqrstuvwxyz";
};
/**
 * The tone of a character, 0 to `LETTER_TONE_COUNT - 1`: a letter by its place in its
 * alphabet, stepped so that neighbours in the alphabet are far apart in the
 * palette; a digit its own number, as in a math example. Null for anything
 * else — a space, a comma, a sign — which the players draw in the signs' grey.
 * A capital has its small letter's tone.
 */
export declare function letterToneIndex(char: string): number | null;
/**
 * How a line of writing is drawn, in shares of its letters' size (the em):
 * the box it is drawn in is `lineHeight` high with the baseline `baseline`
 * from its top, which leaves room for a tall letter, a tail and the outline;
 * `pad` is the room for the outline at each end.
 */
export declare const TEXT_ART: {
    readonly lineHeight: 1.42;
    readonly baseline: 1.02;
    readonly pad: 0.1;
};
/**
 * How wide a line of writing is, in ems: the letters are our own outlines
 * (letters.ts), so this is what the players draw and not an estimate.
 */
export declare function textLineAdvance(text: string): number;
/** How wide the box of a line is for its height: see `TEXT_ART`. */
export declare function textLineUnits(text: string): number;
/**
 * A text broken into at most `maxLines` lines at its spaces, as evenly as
 * it goes: of every way to break it the one whose longest line is shortest.
 * A text of fewer words has fewer lines; a word is never split.
 */
export declare function breakTextLines(text: string, maxLines: number): string[];
export declare const TEXT_CHOICE_ANSWERS_MIN = 2;
/** More than four answers in words do not fit a phone at a size a child reads. */
export declare const TEXT_CHOICE_ANSWERS_MAX = 4;
export type TextChoiceOption = {
    id: string;
    /** In the language the game is played in: the server has chosen it. */
    text: string;
    isCorrect: boolean;
};
export type TextChoiceConfig = {
    /** The question as the child reads it, in the game's language. Empty when it is only said. */
    question: string;
    /** A picture the question is about; null for a question of words alone. */
    questionImage: string | null;
    bg_image: string | null;
    /** Shuffled once here: the right answer is not always the first card. */
    answers: TextChoiceOption[];
    correctOptionIds: string[];
    time_limit: number | null;
    lives: number;
    /** The background and the question's picture: preload before the clock. */
    imageUris: string[];
};
/**
 * The game as the players draw it. `question` and each answer's `text` arrive
 * already in the language of the game. An answer with no text is dropped, and
 * no more than `TEXT_CHOICE_ANSWERS_MAX` are kept — the right ones first, so a
 * game never loses its answer to the limit.
 */
export declare function normalizeTextChoiceConfig(game: AuthoredGame, config: Record<string, unknown>): TextChoiceConfig;
export type TextChoiceTapResult = 
/** An answer already found or already crossed out, or one the game does not have. */
{
    type: "ignored";
}
/** A right answer; `complete` when it was the last one to find. */
 | {
    type: "right";
    complete: boolean;
}
/** A wrong answer: it is crossed out, and a life is lost. */
 | {
    type: "wrong";
};
/**
 * What a tap on an answer does: the whole play rule, so both players follow
 * it tap for tap. `found` are the right answers tapped so far, `crossed` the
 * wrong ones.
 */
export declare function resolveTextChoiceTap(config: Pick<TextChoiceConfig, "answers" | "correctOptionIds">, found: readonly string[], crossed: readonly string[], optionId: string): TextChoiceTapResult;
/** Proportions of the question and its answers. Paddings are shares of the line they surround. */
export declare const TEXT_CHOICE_LAYOUT: {
    /** The most of the free height the question may take… */
    readonly questionShare: 0.4;
    /** …and the most lines it is broken into. */
    readonly questionLines: 3;
    /** A line of the question never grows past this, in px. */
    readonly maxQuestionLine: 76;
    /** The question's picture: a square of this share of the free height, at most this share of the width. */
    readonly pictureShare: 0.34;
    readonly pictureWidthShare: 0.24;
    /** An answer is broken into at most this many lines. */
    readonly answerLines: 3;
    /** A line of an answer never grows past this, in px. */
    readonly maxAnswerLine: 88;
    /** Around the question, and around an answer on its card. */
    readonly panelPadX: 0.36;
    readonly panelPadY: 0.2;
    readonly cardPadX: 0.42;
    readonly cardPadY: 0.26;
    /** In px: between cards. */
    readonly cardGap: 12;
};
/** A line of writing where it is drawn: a box `textLineUnits` wide for its height. */
export type TextLineBox = BoardRect & {
    text: string;
};
export type TextChoiceLayout = {
    /** The panel the question sits on; null when the game has neither a written question nor a picture. */
    panel: BoardRect | null;
    picture: BoardRect | null;
    question: TextLineBox[];
    /** In `answers` order: the card and the lines of its answer. Every answer is written at one size. */
    cards: Array<BoardRect & {
        id: string;
        lines: TextLineBox[];
    }>;
};
/**
 * Where everything of a text question goes on its stage. The background
 * covers the whole stage; the question sits on a panel above — its picture at
 * its left when it has one — and the answers on cards below: two safe areas a
 * gap apart, both inside the stage less `insets` and an edge margin.
 *
 * The answers are set in whichever of one row, two columns or one column, and
 * in however many lines each, writes them biggest; all of them at one size,
 * so the right one is not the one that looks different. A long question is
 * broken into lines the same way. `limits` replaces any of
 * `TEXT_CHOICE_LAYOUT` — a question beside a text is written nearer its size.
 */
export declare function layoutTextChoice(stageWidth: number, stageHeight: number, config: Pick<TextChoiceConfig, "question" | "questionImage" | "answers">, insets?: SceneInsets, limits?: Partial<Record<keyof typeof TEXT_CHOICE_LAYOUT, number>>): TextChoiceLayout | null;
/** The keys of the pad, in the order they are laid out: the digits, wiping the last one, and the tick. */
export type MathInputKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "erase" | "enter";
/** Two rows of six read left to right: 1–5 and wipe, 6–0 and the tick. In three columns or four the same order runs on. */
export declare const MATH_INPUT_KEYS: readonly MathInputKey[];
/** The place always has room for two digits at least, so a one-digit answer is not told by its width. */
export declare const MATH_INPUT_DIGITS_MIN = 2;
export type MathInputConfig = {
    /** The example, left to right; exactly one number is missing. */
    terms: MathEquationTerm[];
    /** The missing number's place. */
    blankId: string;
    /** How many digits can be typed: as many as the longest number of the example has, the answer included. */
    maxDigits: number;
    bg_image: string | null;
    time_limit: number | null;
    lives: number;
    /** The background and every picture a number is drawn with: preload before the clock. */
    imageUris: string[];
};
/**
 * The example as the players draw it. `terms` are read as a math example's
 * (`normalizeMathEquationConfig`); the place to fill is the first number
 * marked `missing`, or the last number when none is — a sign is never typed,
 * so a sign marked missing simply stands in the example.
 */
export declare function normalizeMathInputConfig(config: Record<string, unknown>): MathInputConfig;
/**
 * What is typed after a key: a digit is added while there is room — a lone
 * zero is typed over, so no number starts with one — and wiping takes the last
 * digit away. The tick changes nothing here: see `resolveMathInputEntry`.
 */
export declare function pressMathInputKey(entry: string, key: MathInputKey, maxDigits: number): string;
export type MathInputEntryResult = 
/** Nothing is typed yet: the tick does nothing. */
{
    type: "ignored";
}
/** The number typed makes the example true. */
 | {
    type: "right";
    value: number;
}
/** It does not: a mistake. */
 | {
    type: "wrong";
    value: number;
};
/** What the tick does with what is typed: the whole play rule, so both players follow it tap for tap. */
export declare function resolveMathInputEntry(config: Pick<MathInputConfig, "terms" | "blankId">, entry: string): MathInputEntryResult;
/** Proportions of the pad; the example above it is a math example's (`MATH_EQUATION_LAYOUT`). */
export declare const MATH_INPUT_LAYOUT: {
    /** The most of the free height the example's panel takes. */
    readonly maxPanelShare: 0.4;
    /** A key is never taller than this, in px, nor wider than this many times its height. */
    readonly maxKey: 96;
    readonly keyAspect: 1.5;
    /** Under this a key is hard for a small finger to hit: the example gives up height first. */
    readonly minKey: 46;
    /** In px: between keys. */
    readonly keyGap: 10;
    /** The ways the twelve keys can stand: columns by rows, the widest first. */
    readonly grids: readonly [readonly [6, 2], readonly [4, 3], readonly [3, 4]];
};
export type MathInputLayout = {
    /** The panel the example sits on, floating on the background. */
    panel: BoardRect;
    /** Height of the example's row, in px. */
    row: number;
    /** Each place of the example, in `terms` order; the missing one is the place the typed number stands in. */
    terms: Array<BoardRect & {
        id: string;
        units: number;
    }>;
    /** The pad, and its keys in `MATH_INPUT_KEYS` order. */
    pad: BoardRect;
    keys: Array<BoardRect & {
        key: MathInputKey;
    }>;
    /** The copy size of every number drawn as pictures: pass it to `mathEquationPieces`. */
    pictureCell: number;
};
/**
 * Where everything of a typed example goes on its stage. The background covers
 * the whole stage; the example sits on a panel above and the pad of keys
 * below — two safe areas a gap apart, both inside the stage less `insets` and
 * an edge margin. The keys stand in two rows of six, three of four or four of
 * three, whichever makes them biggest, and where they would come out too small
 * to hit the example is drawn smaller to make room.
 */
export declare function layoutMathInput(stageWidth: number, stageHeight: number, config: Pick<MathInputConfig, "terms" | "maxDigits">, insets?: SceneInsets): MathInputLayout | null;
/** A word of one letter is nothing to build, and more than eight do not fit a phone at a size a child reads. */
export declare const WORD_BUILD_LETTERS_MIN = 2;
export declare const WORD_BUILD_LETTERS_MAX = 8;
/** The most letters that do not belong: more and the tray is a search, not a spelling. */
export declare const WORD_BUILD_EXTRA_MAX = 4;
/**
 * How wide a letter's box is for its height so that the widest letter of the
 * three alphabets fits it ("ლ"): drawn in a box of this shape, every letter of
 * a word is written at one size, whichever tile it stands on.
 */
export declare const WORD_BUILD_LETTER_UNITS: number;
/**
 * The box a letter is drawn in on a tile whose face is `width` × `height`:
 * a line's box (`TEXT_ART`), sized so that every letter of the three
 * alphabets is written at one size — the biggest at which the widest ("ლ")
 * and the tallest keep inside the face, outline and all. A line's box has air
 * round its letters, so the box itself may be larger than the face: it is
 * centred on it and only air hangs over.
 */
export declare function wordBuildLetterBox(width: number, height: number): {
    width: number;
    height: number;
};
export type WordBuildTile = {
    id: string;
    letter: string;
};
export type WordBuildConfig = {
    /** The word, a letter a place, in small letters, in the language the game is played in. */
    letters: string[];
    /** What it is built from: its own letters and the ones that do not belong, mixed once here. */
    tiles: WordBuildTile[];
    /** A picture of what the word names; null when the word is only said. */
    questionImage: string | null;
    bg_image: string | null;
    time_limit: number | null;
    lives: number;
    /** The background and the picture: preload before the clock. */
    imageUris: string[];
};
/**
 * The game as the players draw it. `word` arrives already in the language of
 * the game. `extra_letters` is how many letters that do not belong lie among
 * the tiles (a number: they are drawn from the word's own alphabet, none of
 * them a letter of the word) or the letters themselves (a text). The tiles
 * are mixed so that they do not already spell the word.
 */
export declare function normalizeWordBuildConfig(config: Record<string, unknown>): WordBuildConfig;
export type WordBuildTapResult = 
/** The word is built already, the tile is in it, or the game does not have it. */
{
    type: "ignored";
}
/** The letter that comes next: it goes to `slot`; `complete` when that was the last. */
 | {
    type: "place";
    slot: number;
    complete: boolean;
}
/** Not the letter that comes next: a mistake. */
 | {
    type: "wrong";
    slot: number;
};
/**
 * What a tap on a tile does: the whole play rule, so both players follow it
 * tap for tap. The word is built left to right; `placed` are the tiles in it
 * so far, in order. Any tile of the right letter is right — "მამა" has two of
 * each, and either goes first.
 */
export declare function resolveWordBuildTap(config: Pick<WordBuildConfig, "letters" | "tiles">, placed: readonly string[], tileId: string): WordBuildTapResult;
/** Proportions of the word and its tiles. Shares are of the height of a letter's place. */
export declare const WORD_BUILD_LAYOUT: {
    /** A letter's place and a tile: this wide for its height. */
    readonly aspect: 0.86;
    /** A place never grows past this, in px, nor a tile past its own. */
    readonly maxSlot: 116;
    readonly maxTile: 100;
    /** Under this a tile is hard for a small finger to hit: the word gives up height first. */
    readonly minTile: 46;
    /** Between two places, and around the word on its panel. */
    readonly slotGap: 0.1;
    readonly pad: 0.18;
    /** The picture: a square this many places high, with this much room before the word. */
    readonly picture: 1.45;
    readonly pictureGap: 0.3;
    /** The most of the free height the word's panel takes. */
    readonly maxPanelShare: 0.46;
    /** In px: between tiles. */
    readonly tileGap: 10;
};
export type WordBuildLayout = {
    /** The panel the word sits on, floating on the background. */
    panel: BoardRect;
    picture: BoardRect | null;
    /** A place for every letter of the word, left to right. */
    slots: BoardRect[];
    /** Around the tiles, and each tile in `tiles` order: where a letter lies until it is taken. */
    tray: BoardRect;
    tiles: BoardRect[];
};
/**
 * Where everything of a word to build goes on its stage. The background
 * covers the whole stage; the word's places sit on a panel above — its picture
 * at their left when it has one — and the tiles below, in one row or two,
 * whichever stands them biggest: two safe areas a gap apart, both inside the
 * stage less `insets` and an edge margin.
 */
export declare function layoutWordBuild(stageWidth: number, stageHeight: number, config: Pick<WordBuildConfig, "letters" | "tiles" | "questionImage">, insets?: SceneInsets): WordBuildLayout | null;
export declare const LABEL_DIAGRAM_PARTS_MIN = 2;
/** More pins than this and their names do not fit a phone at a size a child reads. */
export declare const LABEL_DIAGRAM_PARTS_MAX = 6;
/** The most cards: the names of the parts and the ones that name nothing on the picture. */
export declare const LABEL_DIAGRAM_LABELS_MAX = 6;
/** One thing placed by the author, in percent of the picture. */
export type LabelDiagramPart = {
    id: string;
    /** A picture standing on the sheet; null for a point of the sheet's own picture. */
    image: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    /** The word that names it, in the game's language; null for a picture that is only there. */
    label: string | null;
    /** The number on its pin, 1 up in the order the parts are asked; 0 for a picture with no name. */
    number: number;
};
export type LabelDiagramLabel = {
    id: string;
    text: string;
};
export type LabelDiagramConfig = {
    /** Everything on the sheet, in the order it is drawn. */
    parts: LabelDiagramPart[];
    /** The named parts' ids in the order they are asked: across the picture or down it, whichever way it runs. */
    order: string[];
    /** The cards: a name for every part asked and the names that belong to nothing, mixed once here. */
    labels: LabelDiagramLabel[];
    /** The picture's size; its aspect ratio is the sheet's. Null when there is no picture to draw. */
    board: {
        width: number;
        height: number;
    } | null;
    /** The picture itself: the map, the diagram, the scene. */
    bg_image: string | null;
    time_limit: number | null;
    lives: number;
    /** The picture and everything standing on it: preload before the clock. */
    imageUris: string[];
};
/**
 * The game as the players draw it. `placements` are what stands on the
 * picture, in percent of it, each with the `label` that names it — already in
 * the language of the game — or none; one without an `image` is a point of
 * the picture itself and is kept only for its name. `extra_labels` are names
 * of nothing on the picture. A name is asked for at most
 * `LABEL_DIAGRAM_PARTS_MAX` parts: the leftmost ones, the rest left unnamed.
 */
export declare function normalizeLabelDiagramConfig(config: Record<string, unknown>): LabelDiagramConfig;
export type LabelDiagramTapResult = 
/** Every part is named already, the card is used, or the game does not have it. */
{
    type: "ignored";
}
/** The name of the part asked: the card is its; `complete` when that was the last part. */
 | {
    type: "right";
    partId: string;
    complete: boolean;
}
/** Not its name: a mistake. */
 | {
    type: "wrong";
    partId: string;
};
/**
 * What a tap on a card does: the whole play rule, so both players follow it
 * tap for tap. `used` are the cards given to parts so far, in the order the
 * parts are asked — so the part asked now is `order[used.length]`. Any card of
 * the right word is right: a picture with two cows has two cards "cow", and
 * either names either.
 */
export declare function resolveLabelDiagramTap(config: Pick<LabelDiagramConfig, "parts" | "order" | "labels">, used: readonly string[], labelId: string): LabelDiagramTapResult;
/** Proportions of the cards and the pins. Shares are of the height of a line of a card's writing. */
export declare const LABEL_DIAGRAM_LAYOUT: {
    /** A line of a name never grows past this, in px; under `minLine` a child no longer reads it. */
    readonly maxLine: 40;
    readonly minLine: 18;
    /** A name is broken into at most this many lines. */
    readonly lines: 2;
    /** Around a card's writing. */
    readonly cardPadX: 0.4;
    readonly cardPadY: 0.24;
    /** The round place for the pin's number at the left of a card, and the room after it. */
    readonly badge: 1.1;
    readonly badgeGap: 0.3;
    /** In px: between cards. */
    readonly cardGap: 8;
    /** In px: the white rim the players draw round the sheet; the layout leaves it room. */
    readonly sheetRim: 6;
    /** The most of the free width a column of cards takes, and of the free height a row of them. */
    readonly columnShare: 0.4;
    readonly rowShare: 0.36;
    /** A pin on a picture: this share of its shorter side across. On a point: as big as the point. Both between these sizes in px. */
    readonly pinShare: 0.34;
    readonly minPin: 28;
    readonly maxPin: 46;
};
export type LabelDiagramLayout = {
    /** The picture, whole and never cropped: the players draw it with a rim of `sheetRim` round it. */
    sheet: BoardRect;
    /** Everything on the sheet in stage pixels, in `parts` order, exactly where the author put it. */
    parts: BoardRect[];
    /** A pin on the middle of every named part, in the order the parts are asked. */
    pins: Array<BoardRect & {
        partId: string;
        number: number;
    }>;
    /** The cards stand in a column at the right of the sheet or in a row under it. */
    arrangement: "row" | "column";
    /** Around the cards. */
    tray: BoardRect;
    /** A card for every name, in `labels` order: its box, the place of its number and its writing line by line. */
    cards: Array<BoardRect & {
        id: string;
        badge: BoardRect;
        lines: TextLineBox[];
    }>;
};
/**
 * Where everything of a picture to name goes on its stage: the sheet and the
 * cards, two areas a gap apart, both inside the stage less `insets` and an
 * edge margin. The cards are tried four ways — a column at the right of the
 * sheet or a row under it, their names on one line or broken in two — each as
 * big as it goes, and the way is taken that keeps both the sheet and the
 * writing big, the writing first. Nothing on the sheet is ever moved.
 */
export declare function layoutLabelDiagram(stageWidth: number, stageHeight: number, config: Pick<LabelDiagramConfig, "parts" | "order" | "labels" | "board">, insets?: SceneInsets): LabelDiagramLayout | null;
export declare const READING_TEXT_QUESTIONS_MAX = 3;
export declare const READING_TEXT_ANSWERS_MIN = 2;
/** Beside a text, a fourth answer would not fit a phone at a size a child reads. */
export declare const READING_TEXT_ANSWERS_MAX = 3;
export type ReadingTextQuestion = {
    id: string;
    /** The question as the child reads it. */
    question: string;
    /** Shuffled once here: the right answer is not always the first card. */
    answers: TextChoiceOption[];
    correctId: string;
};
export type ReadingTextConfig = {
    /** The text the child reads, in the game's language. */
    text: string;
    /** In the order they are asked. */
    questions: ReadingTextQuestion[];
    bg_image: string | null;
    time_limit: number | null;
    lives: number;
    /** The background: preload before the clock. */
    imageUris: string[];
};
/**
 * The game as the players draw it. A question with no text, no right answer
 * or fewer than two answers is dropped; of several marked right only the first
 * is kept right, and the others go — a question here has one answer. No more
 * than `READING_TEXT_QUESTIONS_MAX` questions and `READING_TEXT_ANSWERS_MAX`
 * answers to each are kept, the right one always among them.
 */
export declare function normalizeReadingTextConfig(game: AuthoredGame, config: Record<string, unknown>): ReadingTextConfig;
export type ReadingTextTapResult = 
/** An answer already crossed out, one of another question, or a game already answered. */
{
    type: "ignored";
}
/** The right answer; `complete` when it was the last question. */
 | {
    type: "right";
    complete: boolean;
}
/** A wrong answer: it is crossed out, and a life is lost. */
 | {
    type: "wrong";
};
/**
 * What a tap on an answer does: the whole play rule, so both players follow
 * it tap for tap. `step` is the question asked now (its index), `crossed` the
 * wrong answers of it tapped so far.
 */
export declare function resolveReadingTextTap(config: Pick<ReadingTextConfig, "questions">, step: number, crossed: readonly string[], answerId: string): ReadingTextTapResult;
/** Proportions of the text and of its questions. Paddings are shares of the line they surround. */
export declare const READING_TEXT_LAYOUT: {
    /** The most lines the text is broken into. */
    readonly passageLines: 16;
    /** A line of the text never grows past this, in px. */
    readonly maxPassageLine: 46;
    /** Around the text on its sheet. */
    readonly passagePadX: 0.7;
    readonly passagePadY: 0.5;
    /** The text's share of the width when the questions stand beside it, tried in turn. */
    readonly sideShares: readonly [0.46, 0.52, 0.58, 0.64];
    /** Its share of the height when they stand under it. */
    readonly stackShares: readonly [0.42, 0.5, 0.58];
    /** The question and its answers: a text game of its own, its lines kept near the text's. */
    readonly question: {
        readonly maxQuestionLine: 50;
        readonly maxAnswerLine: 56;
        readonly answerLines: 2;
        readonly questionShare: 0.42;
    };
};
export type ReadingTextLayout = {
    /** The sheet the text is written on, and its lines. */
    sheet: BoardRect;
    lines: TextLineBox[];
    /** Whether the questions stand beside the text or under it. */
    arrangement: "side" | "stack";
    /**
     * In `questions` order: where the question and its answers stand while it is
     * asked. The text keeps its place through them all.
     */
    steps: TextChoiceLayout[];
};
/**
 * Where everything of a reading game goes on its stage. The background covers
 * the whole stage; the text is written on a sheet at the left — or at the top,
 * where the stage is tall — and the question asked now with its answers stands
 * beside it: two safe areas a gap apart, inside the stage less `insets` and an
 * edge margin.
 *
 * How much room the text takes is chosen so that the smallest of the three
 * writings — the text, a question, an answer — is as big as it can be, over
 * every question of the game: the text never moves when the next one is asked.
 */
export declare function layoutReadingText(stageWidth: number, stageHeight: number, config: Pick<ReadingTextConfig, "text" | "questions">, insets?: SceneInsets): ReadingTextLayout | null;
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
export type WordBuildMetrics = BaseGameMetrics & {
    /** Letters the word has, and how many of them stand in it. */
    letters: number;
    placed: number;
    livesRemaining: number;
};
export type ReadingTextMetrics = BaseGameMetrics & {
    /** Questions the game asks, and how many of them were answered. */
    questions: number;
    answered: number;
    livesRemaining: number;
};
export type LabelDiagramMetrics = BaseGameMetrics & {
    /** Parts the scene asks to name, and how many of them have their name. */
    parts: number;
    named: number;
    livesRemaining: number;
};
export type MathInputMetrics = BaseGameMetrics & {
    /** How many times the tick was pressed with a number typed. */
    attempts: number;
    livesRemaining: number;
};
export type TextChoiceMetrics = BaseGameMetrics & {
    /** Right answers the game has, and how many of them were found. */
    correct: number;
    found: number;
    totalOptions: number;
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
    readonly "connect-pairs": "connectPairs";
    readonly "count-pick": "countPick";
    readonly "drag-drop-match": "dragDropMatch";
    readonly images_order: "imagesOrder";
    readonly jigsaw: "jigsaw";
    readonly "math-equation": "mathEquation";
    readonly "text-choice": "textChoice";
    readonly "math-input": "mathInput";
    readonly "word-build": "wordBuild";
    readonly "label-diagram": "labelDiagram";
    readonly "reading-text": "readingText";
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
/** How a child answers in a game: by tapping a thing, or by carrying it somewhere. */
export type GameGesture = "tap" | "drag";
/**
 * What the hand of the hint shows in each game. A game that can be played both
 * ways (carry a card to its place, or tap the card and then the place) is
 * shown carried: a tap on the card alone looks as if nothing happened.
 * Exhaustive by construction, like the timings.
 */
export declare const GAME_GESTURES: {
    readonly "answer-choice": "tap";
    readonly "catch-correct": "tap";
    readonly "connect-pairs": "tap";
    readonly "count-pick": "tap";
    readonly "drag-drop-match": "drag";
    readonly images_order: "tap";
    readonly jigsaw: "drag";
    readonly "math-equation": "tap";
    readonly "text-choice": "tap";
    readonly "math-input": "tap";
    readonly "word-build": "tap";
    readonly "label-diagram": "tap";
    readonly "reading-text": "tap";
    readonly "memory-cards": "tap";
    readonly "pattern-next": "tap";
    readonly "select-option": "tap";
    readonly "shadow-match": "drag";
    readonly "size-order": "drag";
    readonly "sort-bins": "drag";
    readonly "svg-assemble": "tap";
};
/**
 * The hint itself: a hand that shows the gesture and never the answer. It
 * waits `delayMs` after the game is ready — a child who is already playing
 * never sees it — leaves at the first touch, and comes back when the child
 * has done nothing for `idleMs`. Tapping, it visits the things that can be
 * tapped in turn, a beat on each, with no favourite among them. Carrying, it
 * lifts one thing and takes it only `dragReach` of the way towards the
 * middle of where things go, so it never arrives at a place.
 */
export declare const GESTURE_HINT: {
    readonly delayMs: 2500;
    readonly idleMs: 8000;
    readonly tapBeatMs: 1100;
    readonly dragBeatMs: 2200;
    readonly dragReach: 0.55;
    readonly tapStops: 4;
};
/**
 * Which of `count` things the tapping hand visits on its `round`-th time
 * round. All of them where they are few; where they are many, `tapStops` of
 * them spread from the first to the last, a different set each round — so in
 * the end every one is visited and none is ever left out for good.
 */
export declare function gestureHintTapStops(count: number, round?: number): number[];
/**
 * Where the carrying hand lets go: `dragReach` of the way from the thing it
 * lifted towards the middle of where things go.
 */
export declare function gestureHintDragEnd(from: {
    x: number;
    y: number;
}, towards: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
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
    "text-choice": TextChoiceMetrics;
    "math-input": MathInputMetrics;
    "word-build": WordBuildMetrics;
    "label-diagram": LabelDiagramMetrics;
    "reading-text": ReadingTextMetrics;
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
export * from "./theme.js";
export * from "./letters.js";
