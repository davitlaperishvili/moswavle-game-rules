"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_TIMINGS_BY_KIND = exports.GAME_KIND_KEYS = exports.GAME_TIMINGS = exports.SHADOW_MATCH_MISS_TOLERANCE = exports.SHADOW_MATCH_DROP_TOLERANCE = exports.DEFAULT_CATCH_CORRECT_ITEMS = exports.CATCH_CORRECT_MAX_FALL_MS = exports.CATCH_CORRECT_MIN_FALL_MS = exports.CATCH_CORRECT_MIN_FREQUENCY_MS = exports.FAILURE_REASON = exports.SVG_ASSEMBLE_CARD = exports.SCENE_SAFE_AREA = exports.fitCountPickBoard = exports.ANSWER_CHOICE_STACK = void 0;
exports.getRuntimeConfig = getRuntimeConfig;
exports.buildPreparedGame = buildPreparedGame;
exports.normalizeAnswerChoiceConfig = normalizeAnswerChoiceConfig;
exports.layoutAnswerChoiceStack = layoutAnswerChoiceStack;
exports.resolveGameKind = resolveGameKind;
exports.normalizeCatchCorrectConfig = normalizeCatchCorrectConfig;
exports.normalizeShadowMatchConfig = normalizeShadowMatchConfig;
exports.normalizeImageOrderConfig = normalizeImageOrderConfig;
exports.normalizeSizeOrderConfig = normalizeSizeOrderConfig;
exports.normalizeCountPickConfig = normalizeCountPickConfig;
exports.fitSceneBoard = fitSceneBoard;
exports.coverSceneBoard = coverSceneBoard;
exports.sceneBoxToStage = sceneBoxToStage;
exports.placeSceneOverlay = placeSceneOverlay;
exports.fitSceneRect = fitSceneRect;
exports.layoutScene = layoutScene;
exports.layoutSvgAssembleScene = layoutSvgAssembleScene;
exports.arrangeSvgAssembleScene = arrangeSvgAssembleScene;
exports.normalizePatternNextConfig = normalizePatternNextConfig;
exports.normalizeSortBinsConfig = normalizeSortBinsConfig;
exports.normalizeJigsawConfig = normalizeJigsawConfig;
exports.normalizeDragDropMatchConfig = normalizeDragDropMatchConfig;
exports.normalizeSelectOptionConfig = normalizeSelectOptionConfig;
exports.normalizeMemoryCardsConfig = normalizeMemoryCardsConfig;
exports.parseSvgViewBox = parseSvgViewBox;
exports.extractSvgImageUris = extractSvgImageUris;
exports.normalizeSvgAssembleConfig = normalizeSvgAssembleConfig;
exports.createClientEventId = createClientEventId;
exports.shuffle = shuffle;
exports.shouldPlayHalfway = shouldPlayHalfway;
exports.isImageReference = isImageReference;
exports.catchCorrectFallDurationMs = catchCorrectFallDurationMs;
exports.isShadowMatchHit = isShadowMatchHit;
exports.isShadowMatchNearMiss = isShadowMatchNearMiss;
exports.getDragDropMatchSceneMetrics = getDragDropMatchSceneMetrics;
exports.getDragDropMatchZoneRect = getDragDropMatchZoneRect;
exports.layoutDragDropMatchZones = layoutDragDropMatchZones;
exports.getSelectOptionSceneMetrics = getSelectOptionSceneMetrics;
exports.getSelectOptionItemRect = getSelectOptionItemRect;
exports.layoutSelectOptionItems = layoutSelectOptionItems;
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
function normalizeAnswerChoiceLayout(value) {
    if (typeof value !== "string") {
        return "stacked";
    }
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if ([
        "split",
        "side_by_side",
        "sidebyside",
        "two_column",
        "two_columns",
        "image_left",
        "left_image",
        "question_left",
    ].includes(normalized)) {
        return "split";
    }
    return "stacked";
}
function normalizeDragDropZoneStyle(value) {
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
function normalizeDragDropPromptType(value) {
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
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function parseMaybeJson(value) {
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    if (trimmed === "" || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
        return value;
    }
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return value;
    }
}
function extractText(value) {
    if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return null;
}
function extractMediaUrl(value) {
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
        const sizes = candidate.sizes;
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
function extractNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function extractBoolean(value) {
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
function extractExampleCount(value) {
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
function normalizeValue(value) {
    return value ? value.trim().toLowerCase() : "";
}
function extractMainImage(config) {
    for (const key of IMAGE_KEYS) {
        const image = extractMediaUrl(config[key]);
        if (image) {
            return image;
        }
    }
    return null;
}
function extractQuestionText(config) {
    for (const key of QUESTION_TEXT_KEYS) {
        const text = extractText(config[key]);
        if (text) {
            return text;
        }
    }
    return null;
}
function extractOptionsSource(config) {
    for (const key of OPTION_COLLECTION_KEYS) {
        if (Array.isArray(config[key])) {
            return config[key];
        }
    }
    return [];
}
function optionHasCorrectness(option) {
    const optionRecord = asRecord(option);
    if (!optionRecord) {
        return false;
    }
    return ["correct", "is_correct", "isCorrect"].some((key) => key in optionRecord);
}
function optionHasImage(option) {
    const optionRecord = asRecord(option);
    if (!optionRecord) {
        return false;
    }
    return OPTION_IMAGE_KEYS.some((key) => Boolean(extractMediaUrl(optionRecord[key])));
}
function normalizeBackground(config) {
    for (const key of ["bg_image", "background_image", "background", "bg"]) {
        const image = extractMediaUrl(config[key]);
        if (image) {
            return image;
        }
    }
    return null;
}
function clampPercentage(value) {
    return Math.min(Math.max(value, 0), 100);
}
function normalizeMemoryFace(value) {
    const directRecord = asRecord(value);
    if (directRecord && (directRecord.type === "image" || directRecord.type === "text")) {
        const resolvedValue = directRecord.type === "image"
            ? extractMediaUrl(directRecord.value)
            : extractText(directRecord.value);
        if (resolvedValue) {
            return {
                type: directRecord.type,
                value: resolvedValue,
            };
        }
    }
    const image = extractMediaUrl(value);
    if (image) {
        return {
            type: "image",
            value: image,
        };
    }
    const text = extractText(value);
    if (text) {
        return {
            type: "text",
            value: text,
        };
    }
    return null;
}
function getRuntimeConfig(config) {
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
function buildPreparedGame(game, config, fallbackOptionLabel, buildOptions = {}) {
    const mainImage = extractMainImage(config);
    const questionText = extractQuestionText(config);
    const correctIndex = extractNumber(config.correct_index);
    const correctAnswer = CORRECT_ANSWER_KEYS.map((key) => extractText(config[key])).find(Boolean) ?? null;
    const options = extractOptionsSource(config)
        .map((option, index) => {
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
        const explicitLabel = OPTION_TEXT_KEYS.map((key) => extractText(optionRecord[key])).find(Boolean) ?? null;
        const label = explicitLabel ??
            (buildOptions.useFallbackLabels === false ? "" : fallbackOptionLabel(index + 1));
        const image = OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(optionRecord[key])).find(Boolean) ?? null;
        const explicitCorrect = extractBoolean(optionRecord.correct) ??
            extractBoolean(optionRecord.is_correct) ??
            extractBoolean(optionRecord.isCorrect) ??
            undefined;
        const value = extractText(optionRecord.value) ??
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
        .filter((option) => Boolean(option))
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
            const isCorrect = normalizeValue(option.value) === normalizeValue(correctAnswer) ||
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
function normalizeAnswerChoiceConfig(game, config) {
    const rawAnswers = Array.isArray(config.answers)
        ? config.answers
        : extractOptionsSource(config);
    const answers = rawAnswers
        .map((answer, index) => {
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
        };
    })
        .filter((answer) => Boolean(answer));
    const correctOptionIds = answers
        .filter((answer) => answer.isCorrect)
        .map((answer) => answer.id);
    return {
        questionImage: extractMediaUrl(config.question_image),
        bg_image: normalizeBackground(config),
        layout: normalizeAnswerChoiceLayout(config.question_layout ?? config.display_layout ?? config.presentation_layout ?? config.layout),
        answers,
        correctOptionIds,
        selectionMode: correctOptionIds.length > 1 ? "multiple" : "single",
        time_limit: extractNumber(config.time_limit) ?? DEFAULT_ANSWER_CHOICE_TIME_LIMIT,
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ??
            extractNumber(config.answer_choice_lives) ??
            extractNumber(config.answer_lives) ??
            extractNumber(config.ac_lives) ??
            3)),
    };
}
/** Proportions of the stacked answer_choice layout, width over height. */
exports.ANSWER_CHOICE_STACK = {
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
function layoutAnswerChoiceStack(areaWidth, areaHeight, answerCount) {
    const width = Math.max(areaWidth, 1);
    const height = Math.max(areaHeight, 1);
    const count = Math.max(answerCount, 1);
    const gap = clampNumber(Math.min(width, height) * 0.03, 8, 20);
    const { cardAspect, questionAspect, minQuestionScale, maxQuestionScale, maxCardHeight } = exports.ANSWER_CHOICE_STACK;
    let best = { columns: 1, rows: count, cardHeight: 0, complete: false };
    for (let columns = 1; columns <= count; columns += 1) {
        const rows = Math.ceil(count / columns);
        const cardHeight = Math.min(
        // The question panel and every row fit the height…
        (height - rows * gap) / (minQuestionScale + rows), 
        // …the cards of a row fit the width…
        (width - (columns - 1) * gap) / columns / cardAspect, 
        // …and so does the question panel.
        width / (questionAspect * minQuestionScale), maxCardHeight);
        const complete = count % columns === 0;
        // Bigger cards win; on a tie, full rows, then fewer columns.
        if (cardHeight > best.cardHeight + 0.5 ||
            (Math.abs(cardHeight - best.cardHeight) <= 0.5 && complete && !best.complete)) {
            best = { columns, rows, cardHeight, complete };
        }
    }
    const cardHeight = Math.max(Math.floor(best.cardHeight), 1);
    const cardWidth = Math.floor(cardHeight * cardAspect);
    const questionHeight = Math.floor(Math.max(Math.min(height - best.rows * (cardHeight + gap), cardHeight * maxQuestionScale, width / questionAspect), 1));
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
function normalizeGameTypeValue(type) {
    return type
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
function resolveGameKind(type, config) {
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
    const hasCatchSignals = ["target", "target_score", "score_target", "frequency", "speed", "lives"].some((key) => extractNumber(config[key]) !== null);
    const hasDragDropSignals = Array.isArray(config.zones) ||
        Array.isArray(config.ddm_zones) ||
        Array.isArray(config.drop_zones) ||
        Array.isArray(config.draggable_items) ||
        Array.isArray(config.ddm_items);
    const hasSelectOptionSignals = Array.isArray(config.so_items) ||
        Array.isArray(config.select_option_items) ||
        Array.isArray(config.scene_options) ||
        Array.isArray(config.select_items);
    const hasOrderSignals = Array.isArray(config.order_items) ||
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
function normalizeCatchCorrectConfig(config) {
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
        const label = extractMediaUrl(record.label) ??
            OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(record[key])).find(Boolean) ??
            OPTION_TEXT_KEYS.map((key) => extractText(record[key])).find(Boolean);
        const correct = extractBoolean(record.correct) ??
            extractBoolean(record.is_correct) ??
            extractBoolean(record.isCorrect) ??
            false;
        if (!label) {
            return null;
        }
        return {
            label,
            correct,
        };
    })
        .filter((item) => Boolean(item));
    return {
        // A game authored without items would spawn nothing and could never be won.
        items: items.length > 0 ? items : exports.DEFAULT_CATCH_CORRECT_ITEMS.map((item) => ({ ...item })),
        target: extractNumber(config.target) ??
            extractNumber(config.target_score) ??
            extractNumber(config.score_target) ??
            10,
        lives: extractNumber(config.lives) ?? 3,
        frequency: Math.max(exports.CATCH_CORRECT_MIN_FREQUENCY_MS, extractNumber(config.frequency) ?? 1200),
        speed: extractNumber(config.speed) ?? 120,
        time_limit: extractNumber(config.time_limit),
        bg_image: normalizeBackground(config),
    };
}
function normalizeShadowMatchConfig(config) {
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
            const label = extractMediaUrl(record.label) ??
                OPTION_IMAGE_KEYS.map((key) => extractMediaUrl(record[key])).find(Boolean) ??
                OPTION_TEXT_KEYS.map((key) => extractText(record[key])).find(Boolean);
            return label
                ? { id: extractText(record.id) ?? `shadow-${index}`, label }
                : null;
        })
            .filter((item) => Boolean(item)),
        bg_image: normalizeBackground(config),
        time_limit: extractNumber(config.time_limit) ??
            extractNumber(config.shadow_match_time_limit) ??
            extractNumber(config.shadow_time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ??
            extractNumber(config.shadow_match_lives) ??
            extractNumber(config.shadow_lives) ??
            3)),
    };
}
function normalizeImageOrderConfig(config) {
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
            .map((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                const directImage = extractMediaUrl(item);
                return directImage
                    ? {
                        id: `images_order-${index + 1}`,
                        image: directImage,
                        label: null,
                    }
                    : null;
            }
            const record = item;
            const image = extractMediaUrl(record.image) ??
                extractMediaUrl(record.item_image) ??
                extractMediaUrl(record.step_image) ??
                extractMediaUrl(record.picture) ??
                null;
            if (!image) {
                return null;
            }
            return {
                id: extractText(record.id) ??
                    extractText(record.key) ??
                    extractText(record.slug) ??
                    `images_order-${index + 1}`,
                image,
                label: extractText(record.label) ??
                    extractText(record.title) ??
                    extractText(record.name) ??
                    null,
            };
        })
            .filter((item) => Boolean(item)),
        time_limit: extractNumber(config.time_limit) ??
            extractNumber(config.order_time_limit) ??
            extractNumber(config.io_time_limit) ??
            60,
        bg_image: normalizeBackground(config),
        show_example: extractExampleCount(config.show_example) ??
            extractExampleCount(config.images_order_show_example) ??
            extractExampleCount(config.io_show_example) ??
            extractExampleCount(config.order_show_example) ??
            0,
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ??
            extractNumber(config.images_order_lives) ??
            extractNumber(config.order_lives) ??
            extractNumber(config.io_lives) ??
            3)),
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
function normalizeSizeOrderConfig(config) {
    const count = Math.max(3, Math.min(5, Math.floor(extractNumber(config.steps) ?? 3)));
    const smallest = 0.4;
    const steps = Array.from({ length: count }, (_, index) => ({
        id: `size-${index + 1}`,
        scale: smallest + ((1 - smallest) * index) / (count - 1),
        rank: index,
    }));
    const direction = extractText(config.direction) === "descending" ? "descending" : "ascending";
    // `steps` is always smallest-first; descending simply reverses which end the
    // finished row starts at, so the players never have to know the difference.
    const ordered = direction === "descending" ? [...steps].reverse() : steps;
    return {
        image: extractMediaUrl(config.image) ??
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
function normalizeCountPickConfig(config) {
    const count = Math.max(1, Math.min(10, Math.floor(extractNumber(config.count) ?? 3)));
    const authored = Array.isArray(config.choices)
        ? config.choices
            .map((choice) => extractNumber(choice))
            .filter((value) => value !== null && value > 0)
        : [];
    // Neighbours first, then outward, until there are enough. Below three the
    // guess is worth too much; above four the row stops fitting a phone.
    const wanted = Math.max(2, Math.min(4, Math.floor(extractNumber(config.choice_count) ?? 3)));
    const values = new Set(authored.length > 0 ? authored : [count]);
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
    const clampPercent = (value) => Math.max(0, Math.min(100, value ?? 0));
    const placements = (Array.isArray(config.placements) ? config.placements : [])
        .map((raw) => {
        const record = asRecord(raw);
        const url = record ? extractMediaUrl(record.image) : null;
        if (!record || !url) {
            return null;
        }
        const x = clampPercent(extractNumber(record.x));
        const y = clampPercent(extractNumber(record.y));
        const width = Math.min(100 - x, clampPercent(extractNumber(record.width)));
        const height = Math.min(100 - y, clampPercent(extractNumber(record.height)));
        return width > 0 && height > 0 ? { image: url, x, y, width, height } : null;
    })
        .filter((placement) => Boolean(placement));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    const board = placements.length > 0 && boardWidth && boardHeight && boardWidth > 0 && boardHeight > 0
        ? { width: boardWidth, height: boardHeight }
        : null;
    const image = extractMediaUrl(config.image) ?? extractMediaUrl(config.question_image) ?? null;
    return {
        image,
        count,
        choices,
        bg_image: extractMediaUrl(config.bg_image),
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        placements,
        board,
        imageUris: [
            ...new Set([extractMediaUrl(config.bg_image), image, ...placements.map((placement) => placement.image)].filter((uri) => Boolean(uri))),
        ],
    };
}
/**
 * The largest box of the board's aspect ratio that fits the space, for a scene
 * built in the Scene Composer: the whole background stays visible, so every
 * picture and zone is exactly where the author put it.
 */
function fitSceneBoard(availableWidth, availableHeight, board) {
    if (availableWidth <= 0 || availableHeight <= 0 || board.width <= 0 || board.height <= 0) {
        return { width: 0, height: 0 };
    }
    const scale = Math.min(availableWidth / board.width, availableHeight / board.height);
    return { width: board.width * scale, height: board.height * scale };
}
/** @deprecated Use fitSceneBoard; kept for 1.8.x callers. */
exports.fitCountPickBoard = fitSceneBoard;
/**
 * The background covering the whole stage, as every game must draw it.
 *
 * Covering crops the picture on the sides that do not fit. Instead of always
 * cropping evenly, the crop is shifted so the authored content (the boxes of
 * the scene's pictures, zones or slots) stays in view — centred in the part of
 * the stage the controls leave free when it fits, and kept inside the picture
 * either way.
 */
function coverSceneBoard(stageWidth, stageHeight, board, content = [], insets = {}) {
    if (stageWidth <= 0 || stageHeight <= 0 || board.width <= 0 || board.height <= 0) {
        return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
    }
    const scale = Math.max(stageWidth / board.width, stageHeight / board.height);
    const width = board.width * scale;
    const height = board.height * scale;
    const place = (stage, size, from, to, before, after) => {
        const excess = size - stage;
        if (excess <= 0)
            return 0;
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
function sceneBoxToStage(box, cover) {
    return {
        left: cover.left + (box.x / 100) * cover.width,
        top: cover.top + (box.y / 100) * cover.height,
        width: (box.width / 100) * cover.width,
        height: (box.height / 100) * cover.height,
    };
}
/**
 * Where to put an overlay (the answer tray, the number buttons) on a scene:
 * the candidate spot that covers the least of the content, preferring the
 * bottom centre. `insets` keep it clear of the stage's own controls along an
 * edge; a spot over one of the `blocked` rects (a button in a corner) is
 * taken only when every spot is.
 */
function placeSceneOverlay(stageWidth, stageHeight, overlayWidth, overlayHeight, avoid, insets = {}, blocked = []) {
    const margin = sceneEdge(stageWidth, stageHeight);
    const minLeft = (insets.left ?? 0) + margin;
    const minTop = (insets.top ?? 0) + margin;
    const maxLeft = Math.max(stageWidth - (insets.right ?? 0) - margin - overlayWidth, minLeft);
    const maxTop = Math.max(stageHeight - (insets.bottom ?? 0) - margin - overlayHeight, minTop);
    const midLeft = Math.min(Math.max((stageWidth - overlayWidth) / 2, minLeft), maxLeft);
    const midTop = Math.min(Math.max((stageHeight - overlayHeight) / 2, minTop), maxTop);
    const candidates = [
        { spot: "bottom", left: midLeft, top: maxTop },
        { spot: "bottom-left", left: minLeft, top: maxTop },
        { spot: "bottom-right", left: maxLeft, top: maxTop },
        { spot: "top", left: midLeft, top: minTop },
        { spot: "top-left", left: minLeft, top: minTop },
        { spot: "top-right", left: maxLeft, top: minTop },
        { spot: "left", left: minLeft, top: midTop },
        { spot: "right", left: maxLeft, top: midTop },
    ];
    const overlap = (left, top) => avoid.reduce((sum, rect) => {
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
    const onControl = (left, top) => blocked.some((rect) => rectsOverlap({ left, top, width: overlayWidth, height: overlayHeight }, rect));
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
exports.SCENE_SAFE_AREA = {
    /** Clear space between everything and the stage edge (or its controls), as a share of the short side. */
    edge: 0.025,
    /** Clear space between the content and the answers, as a share of the short side. */
    gap: 0.04,
    /**
     * A picture that does not fit is shrunk, but not below this share of its
     * size; past it, it is moved instead.
     */
    minScale: 0.55,
};
function sceneEdge(stageWidth, stageHeight) {
    return Math.max(Math.min(stageWidth, stageHeight) * exports.SCENE_SAFE_AREA.edge, 6);
}
function sceneGap(stageWidth, stageHeight) {
    return Math.max(Math.min(stageWidth, stageHeight) * exports.SCENE_SAFE_AREA.gap, 16);
}
function rectsOverlap(a, b) {
    return Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
        && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
}
function growRect(rect, by) {
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
function fitSceneRect(rect, region) {
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
    const limit = (room, reach) => {
        if (reach > epsilon)
            scale = Math.min(scale, room / reach);
    };
    limit(pivotX - region.left, pivotX - lifted.left);
    limit(regionRight - pivotX, right - pivotX);
    limit(pivotY - region.top, pivotY - lifted.top);
    scale = Math.max(scale, exports.SCENE_SAFE_AREA.minScale);
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
function keepSceneRectClear(rect, frame, keepOut) {
    if (!rectsOverlap(rect, keepOut)) {
        return rect;
    }
    const frameRight = frame.left + frame.width;
    const frameBottom = frame.top + frame.height;
    const keepRight = keepOut.left + keepOut.width;
    const keepBottom = keepOut.top + keepOut.height;
    const ways = [
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
        if (way.region.width <= 0 || way.region.height <= 0)
            continue;
        const moved = { ...rect, left: rect.left + way.dx, top: rect.top + way.dy };
        const fitted = fitSceneRect(moved, way.region);
        const shift = Math.hypot(fitted.left + fitted.width / 2 - (rect.left + rect.width / 2), fitted.top + fitted.height / 2 - (rect.top + rect.height / 2));
        const cost = shift + (rect.width - fitted.width) + (rect.height - fitted.height);
        if (cost < bestCost) {
            bestCost = cost;
            best = fitted;
        }
    }
    return best;
}
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
function layoutScene(stageWidth, stageHeight, board, content, overlay = null, insets = {}, controls = []) {
    const cover = coverSceneBoard(stageWidth, stageHeight, board, content, insets);
    const edge = sceneEdge(stageWidth, stageHeight);
    const frame = {
        left: (insets.left ?? 0) + edge,
        top: (insets.top ?? 0) + edge,
        width: Math.max(stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2, 0),
        height: Math.max(stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2, 0),
    };
    const controlKeepOuts = controls.map((rect) => growRect(rect, edge));
    const clearOfControls = (rect) => controlKeepOuts.reduce((current, keepOut) => keepSceneRectClear(current, frame, keepOut), rect);
    const whole = content.map((box) => clearOfControls(fitSceneRect(sceneBoxToStage(box, cover), frame)));
    if (cover.width <= 0 || !overlay || overlay.width <= 0 || overlay.height <= 0) {
        return { cover, frame, content: whole, overlay: null };
    }
    const gap = sceneGap(stageWidth, stageHeight);
    const spot = placeSceneOverlay(stageWidth, stageHeight, overlay.width, overlay.height, whole.map((rect) => growRect(rect, gap)), insets, controlKeepOuts);
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
exports.SVG_ASSEMBLE_CARD = {
    /** Space between two cards. */
    gap: 12,
    /** Inset of the white tile inside a card. */
    imagePad: 12,
    /** Room under the tile for a label, when any answer has one. */
    labelHeight: 22,
    /** Padding of the tray panel around the cards. */
    trayPad: 8,
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
function layoutSvgAssembleScene(stageWidth, stageHeight, viewBox, slots, count, hasLabels, insets = {}, layers = null, controls = []) {
    if (!stageWidth || !stageHeight || !count) {
        return null;
    }
    const vbWidth = viewBox.width || 1;
    const vbHeight = viewBox.height || 1;
    const toBox = (slot) => ({
        x: ((slot.x - viewBox.minX) / vbWidth) * 100,
        y: ((slot.y - viewBox.minY) / vbHeight) * 100,
        width: (slot.width / vbWidth) * 100,
        height: (slot.height / vbHeight) * 100,
    });
    const slotBoxes = slots.map(toBox);
    const layerBoxes = (layers ?? []).map(toBox);
    const { gap, imagePad, trayPad } = exports.SVG_ASSEMBLE_CARD;
    const labelHeight = hasLabels ? exports.SVG_ASSEMBLE_CARD.labelHeight : 0;
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
    const scene = layoutScene(stageWidth, stageHeight, { width: vbWidth, height: vbHeight }, [...slotBoxes, ...layerBoxes], { width: trayWidth, height: trayHeight }, insets, controls);
    const board = scene.cover;
    const slotRects = slots.map((slot, index) => ({
        id: slot.id,
        ...(layers ? scene.content[index] : sceneBoxToStage(slotBoxes[index], board)),
    }));
    const layerRects = (layers ?? []).map((layer, index) => ({ id: layer.id, ...scene.content[slots.length + index] }));
    const spot = scene.overlay ?? { left: 0, top: 0, spot: "bottom" };
    const tray = { left: spot.left, top: spot.top, width: trayWidth, height: trayHeight };
    const cards = [];
    const options = [];
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
function arrangeSvgAssembleScene(svg, viewBox, layout) {
    const { board } = layout;
    if (board.width <= 0 || board.height <= 0) {
        return svg;
    }
    const unitX = (viewBox.width || 1) / board.width;
    const unitY = (viewBox.height || 1) / board.height;
    const format = (value) => String(Math.round(value * 100) / 100);
    return [...layout.slots, ...layout.layers].reduce((markup, rect) => {
        const box = {
            x: viewBox.minX + (rect.left - board.left) * unitX,
            y: viewBox.minY + (rect.top - board.top) * unitY,
            width: rect.width * unitX,
            height: rect.height * unitY,
        };
        const id = rect.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return markup.replace(new RegExp(`<image\\b[^>]*\\sid="${id}"[^>]*>`), (tag) => Object.keys(box).reduce((current, name) => current.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${format(box[name])}$2`), tag));
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
function normalizePatternNextConfig(config) {
    const rawPattern = Array.isArray(config.pattern)
        ? config.pattern
        : Array.isArray(config.items)
            ? config.items
            : [];
    const pattern = rawPattern
        .map((item, index) => {
        const record = item && typeof item === "object" && !Array.isArray(item)
            ? item
            : {};
        const image = extractMediaUrl(record.image) ??
            extractMediaUrl(record.pn_image) ??
            extractMediaUrl(item) ??
            null;
        if (!image) {
            return null;
        }
        return {
            id: extractText(record.id) ?? `pattern-${index + 1}`,
            image,
        };
    })
        .filter((item) => item !== null);
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
    const sequence = [];
    for (let index = 0; index < length; index += 1) {
        const source = pattern[index % pattern.length];
        sequence.push({ id: `${source.id}-${index + 1}`, image: source.image });
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
function normalizeSortBinsConfig(config) {
    const rawBins = Array.isArray(config.bins) ? config.bins : [];
    const bins = rawBins
        .map((bin, index) => {
        const record = bin && typeof bin === "object" && !Array.isArray(bin)
            ? bin
            : {};
        const id = extractText(record.id) ??
            extractText(record.sb_bin_id) ??
            extractText(record.key) ??
            `bin-${index + 1}`;
        const label = extractText(record.label) ?? extractText(record.sb_bin_label);
        const image = extractMediaUrl(record.image) ?? extractMediaUrl(record.sb_bin_image);
        // A bin with neither a name nor a picture is invisible.
        if (!label && !image) {
            return null;
        }
        return { id, label, image };
    })
        .filter((bin) => bin !== null);
    const binIds = new Set(bins.map((bin) => bin.id));
    const rawItems = Array.isArray(config.items) ? config.items : [];
    const items = rawItems
        .map((item, index) => {
        const record = item && typeof item === "object" && !Array.isArray(item)
            ? item
            : {};
        const image = extractMediaUrl(record.image) ?? extractMediaUrl(record.sb_item_image);
        const binId = extractText(record.binId) ??
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
        };
    })
        .filter((item) => item !== null);
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
function normalizeJigsawConfig(config) {
    const clampAxis = (value, fallback) => Math.max(1, Math.min(4, Math.floor(value ?? fallback)));
    let columns = clampAxis(extractNumber(config.columns) ?? extractNumber(config.jig_columns), 2);
    let rows = clampAxis(extractNumber(config.rows) ?? extractNumber(config.jig_rows), 2);
    // 1×1 is a picture, not a puzzle. Grow the shorter axis rather than refuse.
    if (columns * rows < 2) {
        columns = 2;
        rows = 1;
    }
    const pieces = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            pieces.push({ id: `piece-${row + 1}-${column + 1}`, column, row });
        }
    }
    return {
        image: extractMediaUrl(config.image) ??
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
function normalizeDragDropMatchConfig(config) {
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
    const seenZoneKeys = new Set();
    const zones = rawZones
        .map((zone, index) => {
        const record = asRecord(zone);
        if (!record) {
            return null;
        }
        const matchKey = extractText(record.match_key) ??
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
        const x = extractNumber(record.x) ??
            extractNumber(record.ddm_x) ??
            extractNumber(record.zone_x) ??
            extractNumber(record.left);
        const y = extractNumber(record.y) ??
            extractNumber(record.ddm_y) ??
            extractNumber(record.zone_y) ??
            extractNumber(record.top);
        const width = extractNumber(record.width) ??
            extractNumber(record.ddm_width) ??
            extractNumber(record.zone_width) ??
            extractNumber(record.w);
        const height = extractNumber(record.height) ??
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
        const promptType = normalizeDragDropPromptType(record.prompt_type ?? record.ddm_prompt_type ?? record.type);
        const promptText = extractText(record.prompt_text) ??
            extractText(record.ddm_prompt_text) ??
            extractText(record.prompt_value) ??
            extractText(record.label) ??
            extractText(record.title) ??
            extractText(record.number);
        const promptImage = extractMediaUrl(record.prompt_image) ??
            extractMediaUrl(record.ddm_prompt_image) ??
            extractMediaUrl(record.image);
        if (promptType === "image" && !promptImage) {
            return null;
        }
        seenZoneKeys.add(normalizedMatchKey);
        return {
            id: extractText(record.id) ??
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
        .filter((zone) => Boolean(zone));
    const seenItemKeys = new Set();
    const items = rawItems
        .map((item, index) => {
        const record = asRecord(item);
        if (!record) {
            return null;
        }
        const matchKey = extractText(record.match_key) ??
            extractText(record.ddm_match_key) ??
            extractText(record.target_key) ??
            extractText(record.key);
        const image = extractMediaUrl(record.image) ??
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
            id: extractText(record.id) ??
                extractText(record.item_id) ??
                extractText(record.ddm_item_id) ??
                `drag_drop_item_${index + 1}`,
            image,
            label: extractText(record.label) ??
                extractText(record.title) ??
                extractText(record.name) ??
                null,
            matchKey,
        };
    })
        .filter((item) => Boolean(item));
    const validMatchKeys = new Set(zones
        .map((zone) => normalizeValue(zone.matchKey))
        .filter((zoneKey) => items.some((item) => normalizeValue(item.matchKey) === zoneKey)));
    const filteredZones = zones.filter((zone) => validMatchKeys.has(normalizeValue(zone.matchKey)));
    const filteredItems = items.filter((item) => validMatchKeys.has(normalizeValue(item.matchKey)));
    const boardWidth = extractNumber(config.board_width) ??
        extractNumber(config.ddm_board_width) ??
        extractNumber(config.bg_width) ??
        extractNumber(config.background_width) ??
        1600;
    const boardHeight = extractNumber(config.board_height) ??
        extractNumber(config.ddm_board_height) ??
        extractNumber(config.bg_height) ??
        extractNumber(config.background_height) ??
        900;
    return {
        // Shuffled here, like sort_bins: the authored order is nearly always zone by
        // zone, which would hand the answer over, and both players must shuffle alike.
        items: shuffle(filteredItems),
        zones: filteredZones,
        time_limit: extractNumber(config.time_limit) ??
            extractNumber(config.ddm_time_limit) ??
            extractNumber(config.drag_drop_time_limit),
        bg_image: normalizeBackground(config),
        board_width: Math.max(1, Math.round(boardWidth)),
        board_height: Math.max(1, Math.round(boardHeight)),
        zone_style: normalizeDragDropZoneStyle(config.zone_style ?? config.ddm_zone_style ?? config.drop_zone_style),
    };
}
function normalizeSelectOptionConfig(config) {
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
        .map((item, index) => {
        const record = asRecord(item);
        if (!record) {
            return null;
        }
        const image = extractMediaUrl(record.image) ??
            extractMediaUrl(record.so_image) ??
            extractMediaUrl(record.option_image) ??
            extractMediaUrl(record.picture) ??
            extractMediaUrl(record.photo);
        const x = extractNumber(record.x) ??
            extractNumber(record.so_x) ??
            extractNumber(record.option_x) ??
            extractNumber(record.left);
        const y = extractNumber(record.y) ??
            extractNumber(record.so_y) ??
            extractNumber(record.option_y) ??
            extractNumber(record.top);
        const width = extractNumber(record.width) ??
            extractNumber(record.so_width) ??
            extractNumber(record.option_width) ??
            extractNumber(record.w);
        const height = extractNumber(record.height) ??
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
            id: extractText(record.id) ??
                extractText(record.so_item_id) ??
                extractText(record.option_id) ??
                `select_option_item_${index + 1}`,
            image,
            label: extractText(record.label) ??
                extractText(record.title) ??
                extractText(record.name) ??
                null,
            x: clampedX,
            y: clampedY,
            width: finalWidth,
            height: finalHeight,
            isCorrect: extractBoolean(record.is_correct) ??
                extractBoolean(record.so_is_correct) ??
                extractBoolean(record.correct) ??
                false,
        };
    })
        .filter((item) => Boolean(item));
    const boardWidth = extractNumber(config.board_width) ??
        extractNumber(config.so_board_width) ??
        extractNumber(config.bg_width) ??
        extractNumber(config.background_width) ??
        1600;
    const boardHeight = extractNumber(config.board_height) ??
        extractNumber(config.so_board_height) ??
        extractNumber(config.bg_height) ??
        extractNumber(config.background_height) ??
        900;
    return {
        items,
        time_limit: extractNumber(config.time_limit) ??
            extractNumber(config.so_time_limit) ??
            extractNumber(config.select_option_time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ??
            extractNumber(config.so_lives) ??
            extractNumber(config.select_option_lives) ??
            3)),
        bg_image: normalizeBackground(config),
        board_width: Math.max(1, Math.round(boardWidth)),
        board_height: Math.max(1, Math.round(boardHeight)),
        layout: extractText(config.layout) === "scene" ? "scene" : "free",
    };
}
function normalizeMemoryCardsConfig(config) {
    const rawPairs = Array.isArray(config.pairs)
        ? config.pairs
        : Array.isArray(config.items)
            ? config.items
            : [];
    const pairs = rawPairs
        .map((pair, index) => {
        const record = asRecord(pair);
        if (!record) {
            return null;
        }
        const faceA = normalizeMemoryFace(record.a) ??
            normalizeMemoryFace(record.first) ??
            normalizeMemoryFace(record.left) ??
            normalizeMemoryFace(record.card_a);
        const faceB = normalizeMemoryFace(record.b) ??
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
        .filter((pair) => Boolean(pair));
    const maxMoves = extractNumber(config.max_moves) ??
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
const DEFAULT_SVG_VIEW_BOX = { minX: 0, minY: 0, width: 100, height: 100 };
function parseSvgViewBox(svg) {
    if (typeof svg !== "string") {
        return { ...DEFAULT_SVG_VIEW_BOX };
    }
    const match = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*["']/i);
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
function normalizeSlotId(value) {
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
function extractSvgImageUris(svg) {
    if (!svg) {
        return [];
    }
    const uris = [];
    for (const match of svg.matchAll(SVG_REMOTE_HREF)) {
        uris.push(match[2].replace(/&amp;/g, "&"));
    }
    return uris;
}
function normalizeSvgAssembleConfig(game, config) {
    const sceneSvg = extractText(config.question_svg) ??
        extractText(config.scene_svg) ??
        extractText(config.scene) ??
        extractText(config.svg) ??
        null;
    const viewBox = parseSvgViewBox(sceneSvg);
    const buildSlot = (raw, index) => {
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
        .filter((slot) => Boolean(slot));
    if (slots.length === 0) {
        const rawSlot = asRecord(config.slot) ?? asRecord(config.answer_slot) ?? asRecord(config.scene_slot);
        const single = rawSlot
            ? buildSlot(rawSlot, 0)
            : { id: "slot_1", x: 0, y: 0, width: viewBox.width, height: viewBox.height };
        slots = single ? [single] : [];
    }
    const slotIds = new Set(slots.map((slot) => slot.id));
    // Sent only for a composed scene, whose pictures carry these ids in the markup.
    const layers = Array.isArray(config.layers)
        ? config.layers
            .map((raw, index) => {
            const slot = buildSlot(raw, index);
            return slot ? { ...slot, id: extractText(asRecord(raw)?.id) ?? `layer_${index + 1}` } : null;
        })
            .filter((layer) => Boolean(layer))
        : null;
    const rawAnswers = Array.isArray(config.answers)
        ? config.answers
        : extractOptionsSource(config);
    const answers = rawAnswers
        .map((answer, index) => {
        const record = asRecord(answer);
        if (!record) {
            return null;
        }
        const svg = extractText(record.svg) ??
            extractText(record.answer_svg) ??
            extractText(record.piece_svg) ??
            extractText(record.image_svg);
        if (!svg) {
            return null;
        }
        const slotId = normalizeSlotId(record.slot ?? record.slot_id ?? record.target ?? record.target_slot ?? record.answer_slot);
        return {
            id: extractText(record.id) ?? extractText(record.key) ?? `${game.id}-answer-${index}`,
            svg,
            label: extractText(record.label) ??
                extractText(record.title) ??
                extractText(record.name) ??
                null,
            isCorrect: extractBoolean(record.is_correct) ??
                extractBoolean(record.correct) ??
                extractBoolean(record.isCorrect) ??
                false,
            // Only keep a binding the scene can actually satisfy.
            slotId: slotId && slotIds.has(slotId) ? slotId : null,
        };
    })
        .filter((answer) => Boolean(answer));
    const correctAnswers = answers.filter((answer) => answer.isCorrect);
    // Legacy single-correct content carries no per-answer binding: route the one
    // correct piece into the first slot so older lessons keep working.
    if (!correctAnswers.some((answer) => answer.slotId) &&
        correctAnswers.length > 0 &&
        slots.length > 0) {
        correctAnswers[0].slotId = slots[0].id;
    }
    // Drop correct pieces with no reachable slot: they could never be placed, so
    // showing them would unfairly punish a tap. Distractors (not correct) stay.
    const playableAnswers = answers.filter((answer) => !answer.isCorrect || answer.slotId);
    const requiredSlotIds = [
        ...new Set(playableAnswers
            .filter((answer) => answer.isCorrect)
            .map((answer) => answer.slotId)
            .filter((id) => Boolean(id) && slotIds.has(id))),
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
        time_limit: extractNumber(config.time_limit) ?? extractNumber(config.svg_assemble_time_limit) ?? 60,
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? extractNumber(config.svg_assemble_lives) ?? 3)),
    };
}
function createClientEventId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
/**
 * Fisher-Yates. Card order is part of the game, so both platforms must shuffle
 * the same way rather than each reaching for its own helper.
 */
function shuffle(items) {
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
function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
exports.FAILURE_REASON = {
    timeout: "timeout",
    livesOut: "lives_out",
    /** Catch Correct only: the last life went on a wrong catch. */
    wrongCatch: "wrong_catch",
    movesOut: "moves_out",
};
/**
 * The "halfway there" cheer. Fires once, when the child reaches the midpoint
 * of a game with more than two steps, and never on the last step — the win
 * sound covers that. A two-step game gets the ordinary "correct" instead:
 * cheering "halfway" after the first of two is noise.
 */
function shouldPlayHalfway(next, total) {
    return total > 2 && next >= Math.ceil(total / 2) && next < total;
}
/**
 * Whether an authored label is a picture (URL or path) rather than text.
 * Catch Correct items may be either, and both renderers must draw the same
 * thing for the same label.
 */
function isImageReference(value) {
    if (typeof value !== "string") {
        return false;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    return (/^https?:\/\//i.test(trimmed) ||
        trimmed.startsWith("/") ||
        /\.(jpe?g|gif|png|svg|webp)(\?.*)?$/i.test(trimmed));
}
// --- Catch Correct ----------------------------------------------------------
/** Spawn interval floor: below this the screen fills faster than a child can look. */
exports.CATCH_CORRECT_MIN_FREQUENCY_MS = 500;
/** Fall duration bounds: faster is unplayable, slower is boring. */
exports.CATCH_CORRECT_MIN_FALL_MS = 2400;
exports.CATCH_CORRECT_MAX_FALL_MS = 7600;
/** Demo items for a game authored without any, so it is still playable. */
exports.DEFAULT_CATCH_CORRECT_ITEMS = [
    { label: "🍎", correct: true },
    { label: "🍌", correct: true },
    { label: "👟", correct: false },
    { label: "🚗", correct: false },
];
/** How long one item takes to cross the stage, from the authored `speed`. */
function catchCorrectFallDurationMs(speed) {
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 120;
    return Math.round(clampNumber((100000 / safeSpeed) * 5, exports.CATCH_CORRECT_MIN_FALL_MS, exports.CATCH_CORRECT_MAX_FALL_MS));
}
// --- Shadow Match -----------------------------------------------------------
/** A drop counts when its centre is within this fraction of the target's longer side. */
exports.SHADOW_MATCH_DROP_TOLERANCE = 0.42;
/** A miss is blamed on the nearest other target within this fraction — feedback only. */
exports.SHADOW_MATCH_MISS_TOLERANCE = 0.5;
function isShadowMatchHit(distance, targetWidth, targetHeight) {
    return distance <= Math.max(targetWidth, targetHeight) * exports.SHADOW_MATCH_DROP_TOLERANCE;
}
function isShadowMatchNearMiss(distance, targetWidth, targetHeight) {
    return distance <= Math.max(targetWidth, targetHeight) * exports.SHADOW_MATCH_MISS_TOLERANCE;
}
function getDragDropMatchSceneMetrics(viewportWidth, viewportHeight, sourceWidth, sourceHeight) {
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
function getDragDropMatchZoneRect(zone, metrics) {
    const visualWidth = Math.max((zone.width / 100) * metrics.sourceWidth * metrics.coverScale, 1);
    const visualHeight = Math.max((zone.height / 100) * metrics.sourceHeight * metrics.coverScale, 1);
    const visualLeft = metrics.offsetX + (zone.x / 100) * metrics.renderWidth;
    const visualTop = metrics.offsetY + (zone.y / 100) * metrics.renderHeight;
    const finalWidth = Math.max(visualWidth, metrics.minZoneWidth);
    return {
        left: clampNumber(visualLeft - (finalWidth - visualWidth) / 2, metrics.leftSafeInset, Math.max(metrics.viewportWidth - finalWidth, metrics.leftSafeInset)),
        top: clampNumber(visualTop, 0, Math.max(metrics.viewportHeight - visualHeight, 0)),
        width: finalWidth,
        height: visualHeight,
    };
}
/** Zone rectangles in stage pixels, in `config.zones` order. Raw percentages until the stage is measured. */
function layoutDragDropMatchZones(stage, config) {
    const metrics = getDragDropMatchSceneMetrics(stage.width, stage.height, Math.max(config.board_width, 1), Math.max(config.board_height, 1));
    return config.zones.map((zone) => metrics
        ? getDragDropMatchZoneRect(zone, metrics)
        : {
            left: (zone.x / 100) * stage.width,
            top: (zone.y / 100) * stage.height,
            width: (zone.width / 100) * stage.width,
            height: (zone.height / 100) * stage.height,
        });
}
function getSelectOptionSceneMetrics(viewportWidth, viewportHeight, sourceWidth, sourceHeight) {
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
    const leftSafeInset = viewportWidth > viewportHeight ? Math.max(shortestSide * 0.19, safeInset) : safeInset;
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
function getSelectOptionItemRect(item, metrics) {
    const baseVisualWidth = Math.max((item.width / 100) * metrics.sourceWidth * metrics.containScale, 1);
    const baseVisualHeight = Math.max((item.height / 100) * metrics.sourceHeight * metrics.containScale, 1);
    const baseVisualExtent = Math.max(baseVisualWidth, baseVisualHeight);
    const visualScale = clampNumber(metrics.visualScaleBoost * Math.max(1, metrics.minVisualExtent / baseVisualExtent), 1, metrics.maxVisualExtent / baseVisualExtent);
    const visualWidth = baseVisualWidth * visualScale;
    const visualHeight = baseVisualHeight * visualScale;
    const visualLeft = metrics.offsetX + (item.x / 100) * metrics.renderWidth;
    const visualTop = metrics.offsetY + (item.y / 100) * metrics.renderHeight;
    const hitWidth = Math.max(visualWidth, metrics.minTouchWidth);
    const hitHeight = Math.max(visualHeight, metrics.minTouchHeight);
    return {
        left: clampNumber(visualLeft - (hitWidth - visualWidth) / 2, metrics.leftSafeInset, Math.max(metrics.viewportWidth - hitWidth - metrics.safeInset, metrics.leftSafeInset)),
        top: clampNumber(visualTop - (hitHeight - visualHeight) / 2, metrics.safeInset, Math.max(metrics.viewportHeight - hitHeight - metrics.bottomSafeInset, metrics.safeInset)),
        width: hitWidth,
        height: hitHeight,
        visualWidth,
        visualHeight,
    };
}
/** Item touch boxes in stage pixels, in `config.items` order. Empty until the stage is measured. */
function layoutSelectOptionItems(stage, config) {
    const metrics = getSelectOptionSceneMetrics(stage.width, stage.height, Math.max(config.board_width, 1), Math.max(config.board_height, 1));
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
exports.GAME_TIMINGS = {
    answerChoice: { wrongFeedbackSingleMs: 700, wrongFeedbackMultiMs: 850, successSettleMs: 120 },
    catchCorrect: { wrongShakeMs: 100, completionDelayMs: 0 },
    countPick: { wrongFeedbackMs: 600 },
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
};
/**
 * Kind → the camelCase key used in `GAME_TIMINGS`. Adding a kind to
 * `RuntimeGameKind` without adding it here is a compile error, and so is a
 * `GAME_TIMINGS` or `GameMetricsByKind` entry that goes missing — that is the
 * point: a new game cannot ship without its timings and its metrics shape.
 */
exports.GAME_KIND_KEYS = {
    "answer-choice": "answerChoice",
    "catch-correct": "catchCorrect",
    "count-pick": "countPick",
    "drag-drop-match": "dragDropMatch",
    images_order: "imagesOrder",
    jigsaw: "jigsaw",
    "memory-cards": "memoryCards",
    "pattern-next": "patternNext",
    "select-option": "selectOption",
    "shadow-match": "shadowMatch",
    "size-order": "sizeOrder",
    "sort-bins": "sortBins",
    "svg-assemble": "svgAssemble",
};
/** The same timings, addressable by kind. Exhaustive by construction. */
exports.GAME_TIMINGS_BY_KIND = {
    "answer-choice": exports.GAME_TIMINGS.answerChoice,
    "catch-correct": exports.GAME_TIMINGS.catchCorrect,
    "count-pick": exports.GAME_TIMINGS.countPick,
    "drag-drop-match": exports.GAME_TIMINGS.dragDropMatch,
    images_order: exports.GAME_TIMINGS.imagesOrder,
    jigsaw: exports.GAME_TIMINGS.jigsaw,
    "memory-cards": exports.GAME_TIMINGS.memoryCards,
    "pattern-next": exports.GAME_TIMINGS.patternNext,
    "select-option": exports.GAME_TIMINGS.selectOption,
    "shadow-match": exports.GAME_TIMINGS.shadowMatch,
    "size-order": exports.GAME_TIMINGS.sizeOrder,
    "sort-bins": exports.GAME_TIMINGS.sortBins,
    "svg-assemble": exports.GAME_TIMINGS.svgAssemble,
};
