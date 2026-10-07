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
export type RuntimeGameKind = "catch-correct" | "shadow-match" | "memory-cards" | "images_order" | "drag-drop-match" | "select-option" | "answer-choice" | "svg-assemble" | "jigsaw" | "count-pick" | "pattern-next" | "sort-bins" | "size-order" | "connect-pairs" | "math-equation" | "generic";
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
/** The signs an example is written with. `-` is the minus, whatever dash the author typed. */
export type MathEquationSign = "+" | "-" | "=" | "<" | ">";
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
 *   the answers' way is moved clear of them (`fitSceneRect`).
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
    /** The lane between the two groups, where the lines run, as a share of a card: at least, at most. */
    readonly minLane: 0.9;
    readonly maxLane: 3;
    /** Kept clear along the stage's edges, as a share of its shorter side. */
    readonly margin: 0.04;
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
/** The largest number an example holds. */
export declare const MATH_EQUATION_NUMBER_MAX = 99;
/** Whether a sign compares the two sides (`<`, `=`, `>`) rather than adding or taking away. */
export declare function isMathComparison(sign: MathEquationSign): boolean;
/** The glyphs a number is written with: 15 is "1" then "5". */
export declare function mathNumberGlyphs(value: number): MathEquationGlyph[];
/**
 * How many ways the places still open can be filled from the cards not yet
 * used so that the example reads true, counting no further than `limit`.
 * `placed` maps a filled place to the card in it.
 */
export declare function countMathEquationCompletions(config: Pick<MathEquationConfig, "terms" | "cards">, placed?: Readonly<Record<string, string>>, limit?: number): number;
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
