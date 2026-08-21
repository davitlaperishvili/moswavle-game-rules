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
 * A game as the API serves it. Structural on purpose: both clients have their
 * own richer type and can pass it straight in.
 */
export type AuthoredGame = {
    game_type: string;
    title?: string;
    data?: Record<string, unknown> | null;
    [key: string]: unknown;
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
export type RuntimeGameKind = "catch-correct" | "shadow-match" | "memory-cards" | "images_order" | "drag-drop-match" | "select-option" | "answer-choice" | "svg-assemble" | "generic";
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
