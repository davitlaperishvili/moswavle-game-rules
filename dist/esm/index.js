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
import { OUTLINE_EM, glyphShape, textCharAdvance } from "./letters.js";
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
/** An authored copy count, whole and within 1…PICTURE_COPIES_MAX; 1 when unset. */
export function normalizePictureCopies(value) {
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
export function layoutPictureCopies(count, aspect = 1) {
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
    const boxes = [];
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
export function getRuntimeConfig(config) {
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
export function buildPreparedGame(game, config, fallbackOptionLabel, buildOptions = {}) {
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
export function normalizeAnswerChoiceConfig(game, config) {
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
            copies: record ? normalizePictureCopies(record.copies) : 1,
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
export function layoutAnswerChoiceStack(areaWidth, areaHeight, answerCount) {
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
export function resolveGameKind(type, config) {
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
        "text_choice",
        "textchoice",
        "text_question",
        "text_quiz",
        "quiz",
        "read_and_choose",
    ].includes(normalizedType)) {
        return "text-choice";
    }
    if ([
        "math_input",
        "mathinput",
        "math_keypad",
        "number_input",
        "number_entry",
        "type_answer",
        "type_the_answer",
    ].includes(normalizedType)) {
        return "math-input";
    }
    if ([
        "word_build",
        "wordbuild",
        "build_word",
        "make_word",
        "spell_word",
        "word_spell",
        "letters_to_word",
    ].includes(normalizedType)) {
        return "word-build";
    }
    if ([
        "label_diagram",
        "labeldiagram",
        "diagram_labels",
        "label_picture",
        "label_map",
        "name_parts",
    ].includes(normalizedType)) {
        return "label-diagram";
    }
    if ([
        "reading_text",
        "readingtext",
        "reading",
        "read_text",
        "reading_comprehension",
        "text_reading",
        "story_questions",
    ].includes(normalizedType)) {
        return "reading-text";
    }
    if ([
        "word_problem",
        "wordproblem",
        "story_problem",
        "text_problem",
        "math_word_problem",
        "problem_in_words",
    ].includes(normalizedType)) {
        return "word-problem";
    }
    if ([
        "money_pay",
        "moneypay",
        "money",
        "pay_money",
        "shop_pay",
        "give_change",
    ].includes(normalizedType)) {
        return "money-pay";
    }
    if ([
        "clock_set",
        "clockset",
        "clock",
        "set_clock",
        "read_clock",
        "what_time",
        "telling_time",
    ].includes(normalizedType)) {
        return "clock-set";
    }
    if ([
        "fraction_pick",
        "fractionpick",
        "fraction",
        "fractions",
        "shade_fraction",
        "pick_fraction",
    ].includes(normalizedType)) {
        return "fraction-pick";
    }
    if ([
        "sentence_build",
        "sentencebuild",
        "build_sentence",
        "make_sentence",
        "word_order",
        "sentence_order",
    ].includes(normalizedType)) {
        return "sentence-build";
    }
    if ([
        "word_sort",
        "wordsort",
        "sort_words",
        "words_sort",
        "word_bins",
        "word_groups",
    ].includes(normalizedType)) {
        return "word-sort";
    }
    if ([
        "number_line",
        "numberline",
        "number_ray",
        "place_on_line",
        "line_jump",
        "number_jump",
    ].includes(normalizedType)) {
        return "number-line";
    }
    if ([
        "true_false",
        "truefalse",
        "true_or_false",
        "yes_no",
        "right_or_wrong",
        "fact_check",
    ].includes(normalizedType)) {
        return "true-false";
    }
    if ([
        "grid_route",
        "gridroute",
        "grid_path",
        "route",
        "map_route",
        "follow_route",
    ].includes(normalizedType)) {
        return "grid-route";
    }
    if ([
        "chart_read",
        "chartread",
        "bar_chart",
        "pictograph",
        "read_chart",
        "chart",
    ].includes(normalizedType)) {
        return "chart-read";
    }
    if ([
        "find_in_scene",
        "findinscene",
        "find_all",
        "hidden_objects",
        "seek_and_find",
    ].includes(normalizedType)) {
        return "find-in-scene";
    }
    if ([
        "map_place",
        "mapplace",
        "place_on_map",
        "map_drop",
        "put_on_map",
    ].includes(normalizedType)) {
        return "map-place";
    }
    if ([
        "story_scene",
        "storyscene",
        "story",
        "tell_story",
    ].includes(normalizedType)) {
        return "story-scene";
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
export function normalizeCatchCorrectConfig(config) {
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
            // Only a picture repeats, and a falling one no more than a glance can count.
            copies: isImageReference(label)
                ? Math.min(CATCH_CORRECT_COPIES_MAX, normalizePictureCopies(record.copies ?? record.cc_copies))
                : 1,
        };
    })
        .filter((item) => Boolean(item));
    return {
        // A game authored without items would spawn nothing and could never be won.
        items: items.length > 0 ? items : DEFAULT_CATCH_CORRECT_ITEMS.map((item) => ({ ...item })),
        target: extractNumber(config.target) ??
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
export function normalizeShadowMatchConfig(config) {
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
export function normalizeImageOrderConfig(config) {
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
                        copies: 1,
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
                copies: normalizePictureCopies(record.copies),
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
export function normalizeSizeOrderConfig(config) {
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
export function normalizeCountPickConfig(config) {
    const count = Math.max(1, Math.min(10, Math.floor(extractNumber(config.count) ?? 3)));
    const image = extractMediaUrl(config.image) ?? extractMediaUrl(config.question_image) ?? null;
    const mode = config.mode === "tap" || config.mode === "tap_dots" ? config.mode : "digits";
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
        // A scene that does not say is the old kind: every copy of the counted
        // picture counts.
        const counted = "counted" in record ? Boolean(record.counted) : url === image;
        return width > 0 && height > 0 ? { image: url, x, y, width, height, counted } : null;
    })
        .filter((placement) => Boolean(placement));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    const board = placements.length > 0 && boardWidth && boardHeight && boardWidth > 0 && boardHeight > 0
        ? { width: boardWidth, height: boardHeight }
        : null;
    const voices = Array.isArray(config.count_voice) ? config.count_voice : [];
    const countVoice = Array.from({ length: count }, (_, index) => extractMediaUrl(voices[index]));
    const glyphSource = asRecord(config.glyphs) ?? {};
    const glyphs = {};
    COUNT_PICK_DIGITS.forEach((digit) => {
        const url = extractMediaUrl(glyphSource[digit]);
        if (url)
            glyphs[digit] = url;
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
            ...new Set([
                extractMediaUrl(config.bg_image),
                image,
                ...placements.map((placement) => placement.image),
                ...COUNT_PICK_DIGITS.filter((digit) => digits.has(digit)).map((digit) => glyphs[digit] ?? null),
            ].filter((uri) => Boolean(uri))),
        ],
        glyphs,
        audioUris: [...new Set(countVoice.filter((uri) => Boolean(uri)))],
    };
}
const COUNT_PICK_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
/**
 * The whole tap rule of the counting modes (`tap`, `tap_dots`): each thing to
 * count is counted once, in whatever order the child points at them.
 */
export function resolveCountPickTap(tap) {
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
export function countPickUsesLives(mode) {
    return mode !== "tap";
}
/**
 * Which picture the hand points at, counted by tapping: the first thing to
 * count that has not been counted — one picture, never one to ignore, so the
 * hint shows what to do without giving the count away. `null` once there is
 * nothing left to point at.
 */
export function countPickHintTarget(pictures, countedIds) {
    return pictures.find((picture) => picture.counted && !countedIds.includes(picture.id))?.id ?? null;
}
/**
 * Where the dots of a dot card stand, in fractions of the card (a square),
 * with the dot radius. One to six are the faces of a die, which a child knows
 * from board games; past six the dots stand in short rows, since a row longer
 * than four is read as "many" rather than counted.
 */
export function countPickDots(value) {
    const count = Math.max(1, Math.min(12, Math.floor(value)));
    const dice = {
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
    const rows = {
        7: [2, 3, 2],
        8: [3, 2, 3],
        9: [3, 3, 3],
        10: [3, 4, 3],
        11: [4, 3, 4],
        12: [4, 4, 4],
    };
    const step = 0.21;
    const dots = rows[count].flatMap((length, row) => Array.from({ length }, (_, column) => ({
        x: 0.5 + (column - (length - 1) / 2) * step,
        y: 0.5 + (row - 1) * 0.25,
    })));
    return { dots, radius: 0.08 };
}
/**
 * The largest box of the board's aspect ratio that fits the space, for a scene
 * built in the Scene Composer: the whole background stays visible, so every
 * picture and zone is exactly where the author put it.
 */
export function fitSceneBoard(availableWidth, availableHeight, board) {
    if (availableWidth <= 0 || availableHeight <= 0 || board.width <= 0 || board.height <= 0) {
        return { width: 0, height: 0 };
    }
    const scale = Math.min(availableWidth / board.width, availableHeight / board.height);
    return { width: board.width * scale, height: board.height * scale };
}
/** @deprecated Use fitSceneBoard; kept for 1.8.x callers. */
export const fitCountPickBoard = fitSceneBoard;
/**
 * The background covering the whole stage, as every game must draw it.
 *
 * Covering crops the picture on the sides that do not fit. Instead of always
 * cropping evenly, the crop is shifted so the authored content (the boxes of
 * the scene's pictures, zones or slots) stays in view — centred in the part of
 * the stage the controls leave free when it fits, and kept inside the picture
 * either way.
 */
export function coverSceneBoard(stageWidth, stageHeight, board, content = [], insets = {}) {
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
export function sceneBoxToStage(box, cover) {
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
export function placeSceneOverlay(stageWidth, stageHeight, overlayWidth, overlayHeight, avoid, insets = {}, blocked = []) {
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
};
function sceneEdge(stageWidth, stageHeight) {
    return Math.max(Math.min(stageWidth, stageHeight) * SCENE_SAFE_AREA.edge, 6);
}
function sceneGap(stageWidth, stageHeight) {
    return Math.max(Math.min(stageWidth, stageHeight) * SCENE_SAFE_AREA.gap, 16);
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
export function fitSceneRect(rect, region) {
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
/** How far apart two boxes are: the wider of the gaps across and down; negative while one lies over the other. */
function sceneRectsApart(a, b) {
    return Math.max(Math.max(a.left, b.left) - Math.min(a.left + a.width, b.left + b.width), Math.max(a.top, b.top) - Math.min(a.top + a.height, b.top + b.height));
}
/** The sizes a picture with no free place is tried at, one after another. */
const SCENE_SQUEEZE_STEPS = [1, 0.9, 0.8, 0.7, 0.6, SCENE_SAFE_AREA.minScale];
/**
 * Pictures that stood apart keep apart.
 *
 * Fitting the pictures into a small stage moves them: one the crop cut is
 * lifted into the frame, one under the answers is moved from under them — and
 * each of those is decided for one picture alone, so on a phone lying on its
 * side two of them came to stand over one another. Here every picture that now
 * lies over another it was clear of (or further over one than its author put
 * it), or was left over the answers or a button, is given the free place
 * nearest to where it stands: inside the frame,
 * clear of the answers and the player's buttons, and of every other picture.
 * With no such place at its size it is made smaller, standing on the same
 * spot, until there is one. A scene too full for that — eight or nine
 * pictures on a phone — has all its pictures made a little smaller together,
 * and is tried again. Where nothing helps (answers as big as the stage), the
 * go that left the fewest pictures in the way is kept, the biggest of those.
 *
 * A layout with nothing over anything comes back as it was.
 */
function keepSceneRectsApart(rects, authored, frame, keepOuts, room) {
    let best = rects.slice();
    let fewest = Number.POSITIVE_INFINITY;
    for (const step of SCENE_SQUEEZE_STEPS) {
        // Each on its own feet, so the scene keeps its shape.
        const smaller = step === 1 ? rects : rects.map((rect) => ({
            left: rect.left + (rect.width * (1 - step)) / 2,
            top: rect.top + rect.height * (1 - step),
            width: rect.width * step,
            height: rect.height * step,
        }));
        const attempt = placeSceneRectsApart(smaller, authored, frame, keepOuts, room);
        if (attempt.unplaced < fewest) {
            fewest = attempt.unplaced;
            best = attempt.placed;
        }
        if (attempt.unplaced === 0)
            break;
    }
    return best;
}
/** One go at `keepSceneRectsApart`; `unplaced` is how many pictures found no free place. */
function placeSceneRectsApart(rects, authored, frame, keepOuts, room) {
    const epsilon = 1e-6;
    const count = rects.length;
    // No nearer than they were put, and a little air between two that had it.
    const needed = (i, j) => Math.min(sceneRectsApart(authored[i], authored[j]), room);
    // In the way of another picture — or of the answers or a button: moved from
    // under the answers, a picture could come to lie in the speaker's corner.
    const crowded = rects.map((rect, i) => rects.some((other, j) => j !== i && sceneRectsApart(rect, other) < needed(i, j) - epsilon)
        || keepOuts.some((keepOut) => sceneRectsApart(rect, keepOut) < -epsilon));
    if (!crowded.some(Boolean) || frame.width <= 0 || frame.height <= 0) {
        return { placed: rects.slice(), unplaced: 0 };
    }
    const moved = (i) => Math.hypot(rects[i].left + rects[i].width / 2 - (authored[i].left + authored[i].width / 2), rects[i].top + rects[i].height / 2 - (authored[i].top + authored[i].height / 2)) + Math.abs(authored[i].width - rects[i].width) + Math.abs(authored[i].height - rects[i].height);
    // The pictures nothing is wrong with stay; of the others, the one moved
    // least so far keeps its place and the rest find theirs around it.
    const order = rects
        .map((_, index) => index)
        .sort((a, b) => Number(crowded[a]) - Number(crowded[b]) || moved(a) - moved(b) || a - b);
    const placed = rects.slice();
    const done = [];
    let unplaced = 0;
    const frameRight = frame.left + frame.width;
    const frameBottom = frame.top + frame.height;
    for (const index of order) {
        if (crowded[index]) {
            const rect = rects[index];
            // What it may not lie over: each as a box to stay out of.
            const obstacles = [
                ...keepOuts,
                ...done.map((other) => growRect(placed[other], needed(index, other))),
            ].filter((obstacle) => obstacle.width > epsilon && obstacle.height > epsilon);
            let found = false;
            for (const step of SCENE_SQUEEZE_STEPS) {
                const width = rect.width * step;
                const height = rect.height * step;
                // Smaller on the spot: its feet stay where they were.
                const want = { left: rect.left + (rect.width - width) / 2, top: rect.top + rect.height - height };
                const maxLeft = frameRight - width;
                const maxTop = frameBottom - height;
                if (maxLeft < frame.left - epsilon || maxTop < frame.top - epsilon)
                    continue;
                // The nearest free place has each of its sides where the picture
                // stands, at the frame, or against something it keeps out of.
                const lefts = [want.left, frame.left, maxLeft];
                const tops = [want.top, frame.top, maxTop];
                for (const obstacle of obstacles) {
                    lefts.push(obstacle.left - width, obstacle.left + obstacle.width);
                    tops.push(obstacle.top - height, obstacle.top + obstacle.height);
                }
                let best = null;
                let bestShift = Number.POSITIVE_INFINITY;
                for (const left of lefts) {
                    if (left < frame.left - epsilon || left > maxLeft + epsilon)
                        continue;
                    for (const top of tops) {
                        if (top < frame.top - epsilon || top > maxTop + epsilon)
                            continue;
                        const shift = Math.hypot(left - want.left, top - want.top);
                        if (shift >= bestShift)
                            continue;
                        const candidate = { left, top, width, height };
                        if (obstacles.some((obstacle) => sceneRectsApart(candidate, obstacle) < -epsilon))
                            continue;
                        best = candidate;
                        bestShift = shift;
                    }
                }
                if (best) {
                    placed[index] = best;
                    found = true;
                    break;
                }
            }
            if (!found)
                unplaced += 1;
        }
        done.push(index);
    }
    return { placed, unplaced };
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
export function layoutScene(stageWidth, stageHeight, board, content, overlay = null, insets = {}, controls = []) {
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
    const authored = content.map((box) => sceneBoxToStage(box, cover));
    const whole = authored.map((rect) => clearOfControls(fitSceneRect(rect, frame)));
    if (cover.width <= 0 || !overlay || overlay.width <= 0 || overlay.height <= 0) {
        return { cover, frame, content: keepSceneRectsApart(whole, authored, frame, controlKeepOuts, edge), overlay: null };
    }
    const gap = sceneGap(stageWidth, stageHeight);
    const spot = placeSceneOverlay(stageWidth, stageHeight, overlay.width, overlay.height, whole.map((rect) => growRect(rect, gap)), insets, controlKeepOuts);
    const placed = { left: spot.left, top: spot.top, width: overlay.width, height: overlay.height, spot: spot.spot };
    const keepOut = growRect(placed, gap);
    return {
        cover,
        frame,
        // Clear of the answers last: they are the bigger thing to keep apart from.
        // And then of one another, which none of the moves above looks at.
        content: keepSceneRectsApart(whole.map((rect) => keepSceneRectClear(rect, frame, keepOut)), authored, frame, [...controlKeepOuts, keepOut], edge),
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
export function layoutSvgAssembleScene(stageWidth, stageHeight, viewBox, slots, count, hasLabels, insets = {}, layers = null, controls = []) {
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
export function arrangeSvgAssembleScene(svg, viewBox, layout) {
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
export function normalizePatternNextConfig(config) {
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
            copies: normalizePictureCopies(record.copies ?? record.pn_copies),
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
export function normalizeSortBinsConfig(config) {
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
        return { id, label, image, copies: normalizePictureCopies(record.copies ?? record.sb_bin_copies) };
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
            copies: normalizePictureCopies(record.copies ?? record.sb_item_copies),
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
export function normalizeJigsawConfig(config) {
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
export function normalizeDragDropMatchConfig(config) {
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
export function normalizeSelectOptionConfig(config) {
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
export function normalizeMemoryCardsConfig(config) {
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
export function normalizeConnectPairsConfig(config) {
    const rawPairs = Array.isArray(config.pairs)
        ? config.pairs
        : Array.isArray(config.cp_pairs)
            ? config.cp_pairs
            : [];
    const seen = new Set();
    const pairs = rawPairs
        .map((pair, index) => {
        const record = asRecord(pair);
        if (!record) {
            return null;
        }
        const left = normalizeMemoryFace(record.left) ??
            normalizeMemoryFace(record.a) ??
            normalizeMemoryFace(record.first);
        const right = normalizeMemoryFace(record.right) ??
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
        .filter((pair) => Boolean(pair))
        .slice(0, CONNECT_PAIRS_MAX);
    const ids = pairs.map((pair) => pair.id);
    const leftOrder = shuffle(ids);
    const bg = normalizeBackground(config);
    const pictures = pairs.flatMap((pair) => [pair.left, pair.right].filter((face) => face.type === "image").map((face) => face.value));
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
function shuffleAcross(order) {
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
const DEFAULT_SVG_VIEW_BOX = { minX: 0, minY: 0, width: 100, height: 100 };
export function parseSvgViewBox(svg) {
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
export function extractSvgImageUris(svg) {
    if (!svg) {
        return [];
    }
    const uris = [];
    for (const match of svg.matchAll(SVG_REMOTE_HREF)) {
        uris.push(match[2].replace(/&amp;/g, "&"));
    }
    return uris;
}
export function normalizeSvgAssembleConfig(game, config) {
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
export function shuffle(items) {
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
export const FAILURE_REASON = {
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
export function shouldPlayHalfway(next, total) {
    return total > 2 && next >= Math.ceil(total / 2) && next < total;
}
/**
 * Whether an authored label is a picture (URL or path) rather than text.
 * Catch Correct items may be either, and both renderers must draw the same
 * thing for the same label.
 */
export function isImageReference(value) {
    if (typeof value !== "string") {
        return false;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    return (/^https?:\/\//i.test(trimmed) ||
        // A letter drawn in code comes as the picture itself (letterPictureUri).
        /^data:image\//i.test(trimmed) ||
        trimmed.startsWith("/") ||
        /\.(jpe?g|gif|png|svg|webp)(\?.*)?$/i.test(trimmed));
}
// --- Catch Correct ----------------------------------------------------------
/** Spawn interval floor: below this the screen fills faster than a child can look. */
export const CATCH_CORRECT_MIN_FREQUENCY_MS = 500;
/** Fall duration bounds: faster is unplayable, slower is boring. */
export const CATCH_CORRECT_MIN_FALL_MS = 2400;
export const CATCH_CORRECT_MAX_FALL_MS = 7600;
/** Demo items for a game authored without any, so it is still playable. */
export const DEFAULT_CATCH_CORRECT_ITEMS = [
    { label: "🍎", correct: true },
    { label: "🍌", correct: true },
    { label: "👟", correct: false },
    { label: "🚗", correct: false },
];
/** How long one item takes to cross the stage, from the authored `speed`. */
export function catchCorrectFallDurationMs(speed) {
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 120;
    return Math.round(clampNumber((100000 / safeSpeed) * 5, CATCH_CORRECT_MIN_FALL_MS, CATCH_CORRECT_MAX_FALL_MS));
}
/**
 * The biggest squares `count` things can be in a box, `gap` apart: the grid
 * is chosen for them, the fewer rows when two grids give the same.
 */
export function fitSquares(width, height, count, gap = 0) {
    const total = Math.max(1, Math.floor(count));
    let best = { side: 0, columns: total, rows: 1 };
    if (width <= 0 || height <= 0) {
        return best;
    }
    for (let columns = 1; columns <= total; columns += 1) {
        const rows = Math.ceil(total / columns);
        const side = Math.floor(Math.min((width - gap * (columns - 1)) / columns, (height - gap * (rows - 1)) / rows));
        if (side > best.side || (side === best.side && side > 0 && rows < best.rows)) {
            best = { side: Math.max(0, side), columns, rows };
        }
    }
    return best;
}
/** No tile of the tray is longer than this on a side: a big screen makes no giants. */
export const SORT_BINS_TILE_MAX = 190;
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
export function layoutSortBinsTray(width, height, count, reserveLeft = 0) {
    if (width <= 0 || height <= 0) {
        return { tile: 0, columns: Math.max(1, Math.floor(count)), gap: 0, left: 0, width: 0 };
    }
    const reserve = clampNumber(reserveLeft, 0, width);
    const gap = Math.round(clampNumber(Math.min(width, height) * 0.07, 6, 14));
    const fit = fitSquares(width - reserve, height, count, gap);
    const tile = Math.min(fit.side, SORT_BINS_TILE_MAX);
    const block = fit.columns * tile + (fit.columns - 1) * gap;
    return {
        tile,
        columns: fit.columns,
        gap,
        left: Math.round(Math.max(reserve, (width - block) / 2)),
        width: block,
    };
}
/**
 * The side of a thing lying in its group (`width` x `height`, the room for
 * the group's things). It fills that room: `most`, the most things one group
 * ends with, are as big as they can all be in it, so the first thing sorted
 * already has its place's size and none shrinks as the group fills. Kept to
 * the tray's tile it was too small on a phone on its side: a group had the
 * room for things twice that size and showed them as icons. Before the room
 * is measured, a thing is as big as a tile (`tile`).
 */
export function sortBinsSortedSide(width, height, most, tile, gap = 4) {
    if (width <= 0 || height <= 0) {
        return Math.max(0, Math.floor(tile));
    }
    return Math.max(0, Math.min(SORT_BINS_TILE_MAX, fitSquares(width, height, most, gap).side));
}
// --- Image Order ------------------------------------------------------------
/** No tile of the order game is longer than this on a side: a big screen makes no giants. */
export const IMAGE_ORDER_TILE_MAX = 220;
/**
 * The order game's board in the room it has (`width` x `height`): the
 * numbered slots in one panel, the pictures to place under them in another.
 *
 * Every slot and every picture is one square, as big as the room lets them be
 * — the line count chosen for that, the fewer lines when two give the same —
 * so four steps stand in one line of slots and one of pictures on a phone on
 * its side, not three and one. `bankCount` is the pictures the game starts
 * with: their panel keeps its size as it empties. The panels hug the tiles
 * and stand in the middle of the whole room, and move right only as far as
 * `reserveLeft`, the strip the speaker's corner takes, makes them.
 */
export function layoutImageOrder(width, height, count, bankCount, reserveLeft = 0) {
    const total = Math.max(1, Math.floor(count));
    const bank = Math.max(0, Math.min(total, Math.floor(bankCount)));
    const empty = {
        tile: 0,
        columns: total,
        slotRows: 1,
        bankRows: bank > 0 ? 1 : 0,
        gap: 0,
        padding: 0,
        sectionGap: 0,
        panelWidth: 0,
        slotPanelHeight: 0,
        bankPanelHeight: 0,
        left: 0,
        top: 0,
    };
    if (width <= 0 || height <= 0) {
        return empty;
    }
    const reserve = clampNumber(reserveLeft, 0, width);
    const gap = Math.round(clampNumber(Math.min(width, height) * 0.03, 6, 14));
    const padding = gap;
    const sectionGap = bank > 0 ? gap : 0;
    const panels = bank > 0 ? 2 : 1;
    let best = { tile: 0, columns: total, slotRows: 1, bankRows: bank > 0 ? 1 : 0 };
    for (let columns = 1; columns <= total; columns += 1) {
        const slotRows = Math.ceil(total / columns);
        const bankRows = bank > 0 ? Math.ceil(bank / columns) : 0;
        const across = (width - reserve - padding * 2 - gap * (columns - 1)) / columns;
        const down = (height - panels * padding * 2 - sectionGap - gap * (slotRows - 1) - gap * Math.max(0, bankRows - 1)) /
            (slotRows + bankRows);
        const tile = Math.max(0, Math.floor(Math.min(across, down, IMAGE_ORDER_TILE_MAX)));
        const rows = slotRows + bankRows;
        if (tile > best.tile || (tile === best.tile && tile > 0 && rows < best.slotRows + best.bankRows)) {
            best = { tile, columns, slotRows, bankRows };
        }
    }
    if (best.tile <= 0) {
        return { ...empty, gap, padding, sectionGap };
    }
    const panelWidth = best.columns * best.tile + gap * (best.columns - 1) + padding * 2;
    const slotPanelHeight = best.slotRows * best.tile + gap * (best.slotRows - 1) + padding * 2;
    const bankPanelHeight = best.bankRows > 0 ? best.bankRows * best.tile + gap * (best.bankRows - 1) + padding * 2 : 0;
    return {
        ...best,
        gap,
        padding,
        sectionGap,
        panelWidth,
        slotPanelHeight,
        bankPanelHeight,
        left: Math.round(Math.max(reserve, (width - panelWidth) / 2)),
        top: Math.round(Math.max(0, (height - slotPanelHeight - sectionGap - bankPanelHeight) / 2)),
    };
}
/** No card is longer than this on a side: a big screen makes no giants. */
export const MEMORY_CARD_MAX_SIDE = 230;
/** A card fills its cell, but is never more than this much longer one way than the other. */
const MEMORY_CARD_STRETCH = 1.3;
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
export function layoutMemoryCards(width, height, count, insets = {}, controls = []) {
    const total = Math.max(1, Math.floor(count));
    if (width <= 0 || height <= 0) {
        return { columns: total, rows: 1, cardWidth: 0, cardHeight: 0, gap: 0, left: 0, top: 0, width: 0, height: 0 };
    }
    const edge = clampNumber(Math.min(width, height) * 0.025, 6, 20);
    const frame = {
        left: (insets.left ?? 0) + edge,
        top: (insets.top ?? 0) + edge,
        right: width - (insets.right ?? 0) - edge,
        bottom: height - (insets.bottom ?? 0) - edge,
    };
    const gap = Math.round(clampNumber(Math.min(frame.right - frame.left, frame.bottom - frame.top) * 0.03, 6, 18));
    const fit = (area) => {
        const areaWidth = area.right - area.left;
        const areaHeight = area.bottom - area.top;
        let best = null;
        for (let columns = 1; columns <= total; columns += 1) {
            const rows = Math.ceil(total / columns);
            const cellWidth = (areaWidth - gap * (columns - 1)) / columns;
            const cellHeight = (areaHeight - gap * (rows - 1)) / rows;
            if (cellWidth < 1 || cellHeight < 1) {
                continue;
            }
            const w = Math.floor(Math.min(cellWidth, cellHeight * MEMORY_CARD_STRETCH, MEMORY_CARD_MAX_SIDE));
            const h = Math.floor(Math.min(cellHeight, w * MEMORY_CARD_STRETCH, MEMORY_CARD_MAX_SIDE));
            const side = Math.min(w, h);
            const bestSide = best ? Math.min(best.w, best.h) : 0;
            // The picture on a card is as big as the card's shorter side: that first,
            // then the bigger card, then the fewer rows.
            if (!best ||
                side > bestSide ||
                (side === bestSide && w * h > best.w * best.h) ||
                (side === bestSide && w * h === best.w * best.h && rows < best.rows)) {
                best = { columns, rows, w, h };
            }
        }
        if (!best) {
            return null;
        }
        const gridWidth = best.columns * best.w + (best.columns - 1) * gap;
        const gridHeight = best.rows * best.h + (best.rows - 1) * gap;
        return {
            columns: best.columns,
            rows: best.rows,
            cardWidth: best.w,
            cardHeight: best.h,
            gap,
            left: Math.round(area.left + (areaWidth - gridWidth) / 2),
            top: Math.round(area.top + (areaHeight - gridHeight) / 2),
            width: gridWidth,
            height: gridHeight,
            side: Math.min(best.w, best.h),
        };
    };
    const under = (grid) => controls.some((control) => grid.left < control.left + control.width + gap &&
        grid.left + grid.width > control.left - gap &&
        grid.top < control.top + control.height + gap &&
        grid.top + grid.height > control.top - gap);
    const strip = ({ side: _side, ...layout }) => layout;
    const whole = fit(frame);
    if (!whole) {
        return { columns: total, rows: 1, cardWidth: 0, cardHeight: 0, gap, left: 0, top: 0, width: 0, height: 0 };
    }
    if (!under(whole)) {
        return strip(whole);
    }
    // Beside the corner's controls, or above them.
    const reachRight = Math.max(...controls.map((control) => control.left + control.width));
    const reachTop = Math.min(...controls.map((control) => control.top));
    const beside = fit({ ...frame, left: Math.max(frame.left, reachRight + gap) });
    const above = fit({ ...frame, bottom: Math.min(frame.bottom, reachTop - gap) });
    const moved = [beside, above]
        .filter((candidate) => candidate !== null)
        .sort((a, b) => b.side - a.side || b.cardWidth * b.cardHeight - a.cardWidth * a.cardHeight)[0];
    return strip(moved ?? whole);
}
/**
 * The backs of the cards, toy colours a card has by where it lies — never by
 * what it hides, so a back tells nothing. `from` and `to` are the back's
 * gradient, `ink` the mark drawn on it, `soft` the rim of the card's face.
 */
export const MEMORY_CARD_COLORS = [
    { from: "#5cc8ff", to: "#2f8fff", ink: "#1d6fe0", soft: "#cfe9ff" },
    { from: "#ff9cba", to: "#f2548b", ink: "#d63a72", soft: "#ffdbe7" },
    { from: "#ffd766", to: "#ff9f2e", ink: "#d97400", soft: "#ffeec2" },
    { from: "#86e59a", to: "#2fbf71", ink: "#1f9d5a", soft: "#d3f5dc" },
    { from: "#bca4ff", to: "#7c5cff", ink: "#6442e6", soft: "#e4dbff" },
];
/** The colour of the card at `index` of a grid of `columns`: no two neighbours alike. */
export function memoryCardColor(index, columns) {
    const perRow = Math.max(1, Math.floor(columns));
    const position = Math.max(0, Math.floor(index));
    const column = position % perRow;
    const row = Math.floor(position / perRow);
    return MEMORY_CARD_COLORS[(column + row * 2) % MEMORY_CARD_COLORS.length];
}
/** A row keeps to one line unless two lines make its pictures this much bigger. */
const PATTERN_NEXT_ONE_LINE_SHARE = 0.8;
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
export function layoutPatternNext(width, height, rowCount, choiceCount, counting = false) {
    const count = Math.max(1, Math.floor(rowCount));
    const cards = Math.max(1, Math.floor(choiceCount));
    if (width <= 0 || height <= 0) {
        return { item: 0, perLine: count, itemGap: 0, choice: 0, choiceGap: 0, rowGap: 0 };
    }
    const rowGap = clampNumber(height * 0.09, 10, 44);
    const itemGap = clampNumber(width * 0.014, 6, 18);
    const choiceGap = clampNumber(width * 0.022, 10, 28);
    const widestChoice = Math.max(0, (width - (cards - 1) * choiceGap) / cards);
    const tallestChoice = Math.min(height * (counting ? 0.46 : 0.42), counting ? 260 : 220, widestChoice);
    const room = height - rowGap - tallestChoice;
    const tallestItem = Math.min(height * (counting ? 0.44 : 0.38), counting ? 230 : 190);
    const fit = (lines) => {
        const perLine = Math.ceil(count / lines);
        return {
            perLine,
            item: Math.max(0, Math.min(tallestItem, (width - (perLine - 1) * itemGap) / perLine, (room - (lines - 1) * itemGap) / lines)),
        };
    };
    const oneLine = fit(1);
    const twoLines = count > 3 ? fit(2) : oneLine;
    const row = oneLine.item >= twoLines.item * PATTERN_NEXT_ONE_LINE_SHARE ? oneLine : twoLines;
    return {
        item: Math.floor(row.item),
        perLine: row.perLine,
        itemGap: Math.round(itemGap),
        // A card is the bigger of the two, but not out of scale with the row.
        choice: Math.floor(Math.min(tallestChoice, row.item * 1.35)),
        choiceGap: Math.round(choiceGap),
        rowGap: Math.round(rowGap),
    };
}
// --- Shadow Match -----------------------------------------------------------
/** A drop counts when its centre is within this fraction of the target's longer side. */
export const SHADOW_MATCH_DROP_TOLERANCE = 0.42;
/** A picture is on another one's shadow when its centre is within this fraction of that shadow. */
export const SHADOW_MATCH_MISS_TOLERANCE = 0.5;
export function isShadowMatchHit(distance, targetWidth, targetHeight) {
    return distance <= Math.max(targetWidth, targetHeight) * SHADOW_MATCH_DROP_TOLERANCE;
}
export function isShadowMatchNearMiss(distance, targetWidth, targetHeight) {
    return distance <= Math.max(targetWidth, targetHeight) * SHADOW_MATCH_MISS_TOLERANCE;
}
export function judgeShadowMatchDrop(onOwnShadow, onAnotherShadow) {
    if (onOwnShadow) {
        return "hit";
    }
    return onAnotherShadow ? "wrong" : "stray";
}
export function getDragDropMatchSceneMetrics(viewportWidth, viewportHeight, sourceWidth, sourceHeight) {
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
export function getDragDropMatchZoneRect(zone, metrics) {
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
export function layoutDragDropMatchZones(stage, config) {
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
export function getSelectOptionSceneMetrics(viewportWidth, viewportHeight, sourceWidth, sourceHeight) {
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
export function getSelectOptionItemRect(item, metrics) {
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
export function layoutSelectOptionItems(stage, config) {
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
    /**
     * A wrong answer shakes for `wrongFeedbackMs` and stays crossed out. The
     * right one stays lit `successSettleMs` before the win.
     */
    textChoice: { wrongFeedbackMs: 560, successSettleMs: 600, livesOutDelayMs: 320 },
    /**
     * A wrong number shakes in its place for `wrongFeedbackMs` and is then
     * wiped. The right one stays `successSettleMs` so the child sees the
     * example whole before the win.
     */
    mathInput: { wrongFeedbackMs: 620, successSettleMs: 700, livesOutDelayMs: 320 },
    /**
     * A right letter flies to its place over `flyMs`; a wrong one shakes for
     * `wrongFeedbackMs`. The word stays `successSettleMs` once built, so the
     * child reads it whole before the win.
     */
    wordBuild: { wrongFeedbackMs: 520, flyMs: 420, successSettleMs: 900, livesOutDelayMs: 320 },
    /**
     * A wrong card shakes for `wrongFeedbackMs`. Once every part is named the
     * scene stays `successSettleMs`, so the child sees it whole with its legend.
     */
    labelDiagram: { wrongFeedbackMs: 520, successSettleMs: 1000, livesOutDelayMs: 320 },
    /**
     * A wrong answer shakes for `wrongFeedbackMs`. A right one stays lit for
     * `nextQuestionMs` before the next question comes; after the last, the
     * game waits `successSettleMs`.
     */
    readingText: { wrongFeedbackMs: 560, nextQuestionMs: 700, successSettleMs: 700, livesOutDelayMs: 320 },
    wordProblem: { wrongFeedbackMs: 620, successSettleMs: 700, livesOutDelayMs: 320 },
    /**
     * A piece flies between the purse and the counter over `flyMs`; one that
     * would take the counter past the sum shakes for `wrongFeedbackMs` and stays.
     * The counter is seen whole `successSettleMs` before the win.
     */
    moneyPay: { wrongFeedbackMs: 560, flyMs: 360, successSettleMs: 800, livesOutDelayMs: 320 },
    /**
     * A hand turns to its number over `turnMs`. A wrong time shakes the clock (or
     * the card) for `wrongFeedbackMs`; the right one is seen `successSettleMs`.
     */
    clockSet: { wrongFeedbackMs: 560, turnMs: 320, successSettleMs: 800, livesOutDelayMs: 320 },
    /**
     * A part tapped fills over `fillMs`. A wrong answer shakes for
     * `wrongFeedbackMs`; the right one is seen `successSettleMs`.
     */
    fractionPick: { wrongFeedbackMs: 560, fillMs: 180, successSettleMs: 800, livesOutDelayMs: 320 },
    /**
     * As word_build: a right word flies to its place over `flyMs`; a wrong one
     * shakes for `wrongFeedbackMs`. The sentence stays `successSettleMs` once
     * built, so the child reads it whole before the win.
     */
    sentenceBuild: { wrongFeedbackMs: 520, flyMs: 420, successSettleMs: 1100, livesOutDelayMs: 320 },
    /**
     * A right word flies into its basket over `flyMs` and the next comes;
     * a wrong tap shakes the card for `wrongFeedbackMs`. After the last word
     * the baskets are seen `successSettleMs`.
     */
    wordSort: { wrongFeedbackMs: 520, flyMs: 380, successSettleMs: 900, livesOutDelayMs: 320 },
    /**
     * The marker slides to the tick tapped over `moveMs`; a wrong tick shakes for
     * `wrongFeedbackMs`. The right one is seen `successSettleMs`.
     */
    numberLine: { wrongFeedbackMs: 560, moveMs: 300, successSettleMs: 800, livesOutDelayMs: 320 },
    /**
     * A right answer lights for `nextMs` before the next statement; a wrong one
     * shakes and the right button glows for `wrongFeedbackMs` first. After the
     * last the game waits `successSettleMs`.
     */
    trueFalse: { wrongFeedbackMs: 1100, nextMs: 450, successSettleMs: 600, livesOutDelayMs: 320 },
    /**
     * The hero steps a square over `stepMs`; a move into a rock or off the grid
     * shakes it for `wrongFeedbackMs`. On the treasure, or on the right square
     * in follow mode, the game waits `successSettleMs`.
     */
    gridRoute: { wrongFeedbackMs: 520, stepMs: 220, successSettleMs: 800, livesOutDelayMs: 320 },
    /**
     * A wrong bar or number shakes for `wrongFeedbackMs` and the question stays;
     * a right one shows for `nextQuestionMs` before the next, and the last for
     * `successSettleMs`.
     */
    chartRead: { wrongFeedbackMs: 560, nextQuestionMs: 700, successSettleMs: 700, livesOutDelayMs: 320 },
    /** A miss rings the tap red for `wrongFeedbackMs`; once the last is found the game waits `successSettleMs`. */
    findInScene: { wrongFeedbackMs: 600, successSettleMs: 900, livesOutDelayMs: 320 },
    /**
     * A card put on its pin flies there over `flyMs`; one on another pin shakes
     * it for `wrongFeedbackMs` and goes back. The last one put waits `successSettleMs`.
     */
    mapPlace: { wrongFeedbackMs: 520, flyMs: 280, successSettleMs: 900, livesOutDelayMs: 320 },
    /**
     * A step done shows for `stepMs` before the next piece; a thing carried goes
     * to its place over `carryMs`. Nothing is wrong in a story, and it has no lives.
     */
    storyScene: { stepMs: 700, carryMs: 320, successSettleMs: 1000, livesOutDelayMs: 320 },
    mathEquation: {
        wrongFeedbackMs: 560,
        flyMs: 620,
        successSettleMs: 600,
        livesOutDelayMs: 320,
    },
};
// --- Connect the pairs ------------------------------------------------------
/** More pairs than this do not fit a phone at a size a child can hit. */
export const CONNECT_PAIRS_MAX = 6;
/**
 * What a tap on a card does, given the card picked so far and the pairs
 * already connected. The whole play rule of the game, so both players follow
 * it tap for tap: a card of the other group checks the pair, a card of the
 * same group takes over the pick, the picked card again drops it.
 */
export function resolveConnectPairsTap(picked, connected, tap) {
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
    /**
     * The lane between the two groups, where the lines run, as a share of a card: at least, at most.
     * On a phone on its side the lane is what the cards' size is paid from: at 0.9 of a card
     * three pairs stood small with room to spare, at 0.6 a line is still plain to see.
     */
    minLane: 0.6,
    maxLane: 3,
    /** Kept clear along the stage's edges, as a share of its shorter side. */
    margin: 0.03,
};
/**
 * Where the cards of `count` pairs go on a stage. The two groups are either
 * two columns or two rows, whichever lets the cards be larger: on a phone in
 * landscape that is two rows, so six pairs stay big enough to tap. The cards
 * grow up to `maxCard`; the space left widens the lane the lines cross and the
 * gaps between cards, and the whole board is centred inside `insets`.
 */
export function layoutConnectPairs(width, height, count, insets = {}) {
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
    const orientation = rowsCard > columnsCard ? "rows" : "columns";
    const card = Math.max(0, Math.min(spec.maxCard, Math.max(columnsCard, rowsCard)));
    const alongSpace = orientation === "columns" ? freeHeight : freeWidth;
    const acrossSpace = orientation === "columns" ? freeWidth : freeHeight;
    const gap = n > 1 ? clampNumber((alongSpace - n * card) / (n - 1), card * spec.minGap, card * spec.maxGap) : 0;
    const lane = clampNumber(acrossSpace - 2 * card, card * spec.minLane, card * spec.maxLane);
    const alongStart = (alongSpace - (n * card + (n - 1) * gap)) / 2;
    const acrossStart = (acrossSpace - (2 * card + lane)) / 2;
    const slot = (group, index) => {
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
export function connectPairsLink(orientation, left, right) {
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
// An example — `1 + ? = 3`, `3 ? 5`, `6 × 7 = ?`, three cows `= ?` — with one or
// two places left for the child. A card is right when, put in the place being
// filled, the example can still be made true with the cards that are left. So
// `5 > ?` takes a 3 or a 4 alike, and `? + ? = 5` takes 1 then 4 or 4 then 1:
// the child is never told off for an answer that is right.
/** The most places an example leaves to fill: more is a puzzle, not a sum. */
export const MATH_EQUATION_BLANKS_MAX = 2;
/** Number cards offered: below two there is no choice, above four the tray outgrows a phone. */
export const MATH_EQUATION_CHOICES_MIN = 2;
export const MATH_EQUATION_CHOICES_MAX = 4;
/** The most copies of a picture one number shows: counting to ten. */
export const MATH_EQUATION_PICTURES_MAX = 10;
/** The largest number an example holds: four digits is what its row and its cards have room for. */
export const MATH_EQUATION_NUMBER_MAX = 9999;
/** The signs a missing `+` or `−` is chosen among… */
const MATH_SUMS = ["+", "-"];
/** …and the ones offered once the example multiplies or divides anywhere. */
const MATH_OPERATIONS = ["+", "-", "×", "÷"];
const MATH_COMPARISONS = ["<", "=", ">"];
const MATH_SIGN_ORDER = ["+", "-", "×", "÷", "<", "=", ">"];
const MATH_GLYPHS = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "×", "÷", "=", "<", ">", "?",
];
/** Whether a sign compares the two sides (`<`, `=`, `>`) rather than working a number out. */
export function isMathComparison(sign) {
    return sign === "<" || sign === "=" || sign === ">";
}
/** Whether a sign multiplies or divides: done before the adding and taking away around it. */
export function isMathProduct(sign) {
    return sign === "×" || sign === "÷";
}
function normalizeMathSign(value) {
    const text = extractText(value);
    if (!text) {
        return null;
    }
    const raw = text.trim();
    const symbols = {
        "+": "+", "-": "-", "−": "-", "–": "-", "—": "-", "=": "=", "<": "<", ">": ">",
        // Times: the cross, the star of a keyboard, the letter x (Latin or Cyrillic) and the dot of a textbook.
        "×": "×", "*": "×", "x": "×", "X": "×", "х": "×", "Х": "×", "·": "×", "⋅": "×", "∙": "×",
        // Divided by: the obelus, the slash and the colon.
        "÷": "÷", "/": "÷", ":": "÷", "∶": "÷",
    };
    if (symbols[raw])
        return symbols[raw];
    const word = raw.toLowerCase().replace(/[\s_-]+/g, "_");
    if (["plus", "add"].includes(word))
        return "+";
    if (["minus", "subtract"].includes(word))
        return "-";
    if (["times", "multiply", "multiplied_by", "mul"].includes(word))
        return "×";
    if (["divide", "divided_by", "div"].includes(word))
        return "÷";
    if (["equals", "equal", "eq"].includes(word))
        return "=";
    if (["less", "less_than", "lt", "smaller"].includes(word))
        return "<";
    if (["greater", "greater_than", "gt", "more", "more_than", "bigger"].includes(word))
        return ">";
    return null;
}
/** The glyphs a number is written with: 15 is "1" then "5". */
export function mathNumberGlyphs(value) {
    return String(Math.max(0, Math.floor(value))).split("");
}
/** A number drawn as pictures: only a count a child can see, one to ten. */
function mathPictureFor(image, value) {
    return image && value >= 1 && value <= MATH_EQUATION_PICTURES_MAX ? image : null;
}
/**
 * Whether an example reads true, the way a child reckons it: numbers and signs
 * alternate and there is exactly one comparison. On each side the multiplying
 * and dividing is done first, left to right, then the adding and taking away,
 * left to right. A division that leaves a remainder, or by zero, is no
 * example, and neither is one whose running total goes below zero.
 */
function isMathStatementTrue(values) {
    if (values.length < 3 || values.length % 2 === 0) {
        return false;
    }
    let comparison = null;
    let left = 0;
    // The side being read: what is added up so far, and the product still open.
    let total = 0;
    let product = 0;
    let sum = "+";
    let operation = "+";
    // The open product joins the total; false when that takes it below zero.
    const close = () => {
        total = sum === "-" ? total - product : total + product;
        return total >= 0;
    };
    for (let index = 0; index < values.length; index += 1) {
        const item = values[index];
        if (index % 2 === 0) {
            if (item.kind !== "number")
                return false;
            if (operation === "×") {
                product *= item.value;
            }
            else if (operation === "÷") {
                if (item.value === 0 || product % item.value !== 0)
                    return false;
                product /= item.value;
            }
            else {
                product = item.value;
            }
            continue;
        }
        if (item.kind !== "sign")
            return false;
        if (isMathProduct(item.value)) {
            operation = item.value;
            continue;
        }
        if (!close())
            return false;
        if (isMathComparison(item.value)) {
            if (comparison)
                return false;
            comparison = item.value;
            left = total;
            total = 0;
            sum = "+";
        }
        else {
            sum = item.value;
        }
        operation = "+";
    }
    if (!comparison || !close()) {
        return false;
    }
    return comparison === "=" ? left === total : comparison === "<" ? left < total : left > total;
}
/**
 * Wrong answers worth offering before the numbers next to the right one, the
 * likeliest first. For a product asked for (`7 × 8 = ?`) its neighbours in the
 * times table; for an answer past twenty the number a ten away, past two
 * hundred the one a hundred away. None for the small sums a child counts out.
 */
function mathSlips(terms, answers) {
    const slips = [];
    terms.forEach((term, index) => {
        const sign = terms[index + 1];
        const other = terms[index + 2];
        if (term.kind !== "number" || term.missing || !other || other.kind !== "number" || other.missing
            || !sign || sign.kind !== "sign" || sign.value !== "×" || !answers.includes(term.value * other.value)) {
            return;
        }
        slips.push(term.value * (other.value - 1), term.value * (other.value + 1), (term.value - 1) * other.value, (term.value + 1) * other.value);
    });
    answers.forEach((answer) => {
        if (answer > 20)
            slips.push(answer - 10, answer + 10);
        if (answer >= 200)
            slips.push(answer - 100, answer + 100);
    });
    return slips.filter((value, index) => value >= 0 && !answers.includes(value) && slips.indexOf(value) === index);
}
/** A card fits a place when it is the same kind — and, for a sign, the same family of signs. */
function mathCardFits(term, card) {
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
export function countMathEquationCompletions(config, placed = {}, limit = Number.POSITIVE_INFINITY) {
    const cardsById = new Map(config.cards.map((card) => [card.id, card]));
    const open = config.terms.filter((term) => term.missing && !placed[term.id]);
    const assignment = {};
    for (const [termId, cardId] of Object.entries(placed)) {
        const card = cardsById.get(cardId);
        if (card)
            assignment[termId] = card;
    }
    const used = new Set(Object.values(placed));
    let count = 0;
    const visit = (depth) => {
        if (count >= limit)
            return;
        if (depth === open.length) {
            const values = config.terms.map((term) => {
                const card = term.missing ? assignment[term.id] : null;
                if (term.missing && !card)
                    return null;
                const source = card ?? term;
                return source.kind === "number"
                    ? { kind: "number", value: source.value }
                    : { kind: "sign", value: source.value };
            });
            if (values.every((value) => value !== null) && isMathStatementTrue(values)) {
                count += 1;
            }
            return;
        }
        const term = open[depth];
        for (const card of config.cards) {
            if (used.has(card.id) || !mathCardFits(term, card))
                continue;
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
 * family: `<`, `=`, `>` for a comparison; `+`, `−` for a sum, and `×`, `÷` with
 * them once the example multiplies or divides anywhere — a child who has not
 * met those signs is never shown them. `answer_image` draws the number cards
 * as that many pictures instead of digits.
 */
/** The authored `terms` as places of an example, `missing` as marked; what is neither a number nor a sign is dropped. */
function readMathTerms(source) {
    const rawTerms = Array.isArray(source) ? source : [];
    const terms = [];
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
    return terms;
}
export function normalizeMathEquationConfig(config) {
    const terms = readMathTerms(config.terms);
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
        if (last)
            last.missing = true;
    }
    const blanks = terms.filter((term) => term.missing);
    const answerImage = extractMediaUrl(config.answer_image);
    const numberCards = [];
    const addNumber = (value) => {
        if (numberCards.some((card) => card.value === value))
            return;
        numberCards.push({ id: `number_${value}`, kind: "number", value, image: mathPictureFor(answerImage, value) });
    };
    const multiplies = terms.some((term) => term.kind === "sign" && isMathProduct(term.value));
    const signs = new Set();
    blanks.forEach((term) => {
        if (term.kind === "number") {
            addNumber(term.value);
        }
        else {
            (isMathComparison(term.value) ? MATH_COMPARISONS : multiplies ? MATH_OPERATIONS : MATH_SUMS)
                .forEach((sign) => signs.add(sign));
        }
    });
    const signCards = MATH_SIGN_ORDER
        .filter((sign) => signs.has(sign))
        .map((sign) => ({ id: `sign_${sign}`, kind: "sign", value: sign }));
    const numberBlanks = blanks.filter((term) => term.kind === "number");
    if (numberBlanks.length > 0) {
        const rawWrong = typeof config.wrong_answers === "string"
            ? config.wrong_answers.split(/[\s,;]+/)
            : Array.isArray(config.wrong_answers) ? config.wrong_answers : [];
        rawWrong
            .map((value) => extractNumber(value))
            .filter((value) => value !== null && value >= 0 && value <= MATH_EQUATION_NUMBER_MAX)
            .forEach((value) => {
            if (numberCards.length < MATH_EQUATION_CHOICES_MAX)
                addNumber(Math.floor(value));
        });
        const wanted = Math.max(numberCards.length > MATH_EQUATION_CHOICES_MAX ? numberCards.length : 0, Math.min(MATH_EQUATION_CHOICES_MAX, Math.max(MATH_EQUATION_CHOICES_MIN, numberBlanks.length + 1, Math.floor(extractNumber(config.choice_count) ?? 3))));
        // Numbers near the answer, nearest first, that add no new way to complete
        // the example: a card that is also right would not be a wrong answer.
        const answers = numberBlanks.map((term) => term.value);
        const lowest = answerImage ? 1 : 0;
        const highest = answerImage
            ? MATH_EQUATION_PICTURES_MAX
            : Math.min(MATH_EQUATION_NUMBER_MAX, Math.max(10, ...answers.map((value) => value + 5)));
        const completions = (cards) => countMathEquationCompletions({ terms, cards: [...cards, ...signCards] }, {}, 4);
        const offer = (candidate, ceiling) => {
            if (numberCards.length >= wanted)
                return;
            if (candidate < lowest || candidate > ceiling || numberCards.some((card) => card.value === candidate))
                return;
            const before = completions(numberCards);
            const trial = [...numberCards, { id: `number_${candidate}`, kind: "number", value: candidate, image: null }];
            if (completions(trial) === before)
                addNumber(candidate);
        };
        // The slips a child really makes come first: the next line of the times
        // table (7 × 8 answered 48 or 63, not 55), and a ten or a hundred too many
        // or too few in a number that has them (473 answered 463 or 573).
        if (!answerImage) {
            mathSlips(terms, answers).forEach((candidate) => offer(candidate, MATH_EQUATION_NUMBER_MAX));
        }
        for (let distance = 1; numberCards.length < wanted && distance <= highest; distance += 1) {
            for (const answer of answers) {
                for (const candidate of [answer - distance, answer + distance]) {
                    offer(candidate, highest);
                }
            }
        }
    }
    const cards = [...shuffle(numberCards), ...signCards];
    const glyphSource = asRecord(config.glyphs) ?? {};
    const glyphs = {};
    MATH_GLYPHS.forEach((glyph) => {
        const url = extractMediaUrl(glyphSource[glyph]);
        if (url)
            glyphs[glyph] = url;
    });
    // Only the pictures this example actually draws.
    const drawn = new Set();
    const note = (item) => {
        if (item.kind === "sign")
            drawn.add(item.value);
        else if (!item.image)
            mathNumberGlyphs(item.value).forEach((glyph) => drawn.add(glyph));
    };
    terms.forEach(note);
    cards.forEach(note);
    if (blanks.length > 0)
        drawn.add("?");
    const bg = extractMediaUrl(config.bg_image);
    const imageUris = [
        bg,
        ...terms.map((term) => (term.kind === "number" ? term.image : null)),
        ...cards.map((card) => (card.kind === "number" ? card.image : null)),
        ...MATH_GLYPHS.filter((glyph) => drawn.has(glyph)).map((glyph) => glyphs[glyph] ?? null),
    ].filter((uri) => Boolean(uri));
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
/** The place the child fills next: the first missing one still empty, or null when all are filled. */
export function nextMathEquationBlank(config, placed) {
    return config.blankIds.find((id) => !placed[id]) ?? null;
}
/**
 * What a tap on a card does. The places are filled left to right; the card
 * goes into the next one when, with it there, the cards left can still make
 * the example true. The whole play rule, so both players follow it tap for tap.
 */
export function resolveMathEquationTap(config, placed, cardId) {
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
};
/**
 * The size of one copy for every number a game draws as pictures, as a share
 * of the height it is drawn at: see `MATH_EQUATION_LAYOUT.pictureLarge`.
 */
export function mathEquationPictureCell(config) {
    const counts = [...config.terms, ...config.cards].map((item) => (item.kind === "number" && item.image ? item.value : 0));
    const { pictureLarge, pictureSmall, pictureLargeUpTo } = MATH_EQUATION_LAYOUT;
    return Math.max(0, ...counts) <= pictureLargeUpTo ? pictureLarge : pictureSmall;
}
/** Rows of copies, top first: one row while they are big or few, else two with the fuller one below. */
function mathPictureRows(count, cell) {
    if (cell >= MATH_EQUATION_LAYOUT.pictureLarge || count <= 2) {
        return [Math.max(1, count)];
    }
    return [Math.floor(count / 2), Math.ceil(count / 2)];
}
/** How wide an item is drawn, as a share of its height; `pictureCell` from `mathEquationPictureCell`. */
export function mathEquationItemUnits(item, pictureCell = MATH_EQUATION_LAYOUT.pictureLarge) {
    if (item.kind === "sign" || item.kind === "blank") {
        return MATH_EQUATION_LAYOUT.sign;
    }
    return item.image
        ? Math.max(...mathPictureRows(item.value, pictureCell)) * pictureCell
        : mathNumberGlyphs(item.value).length * MATH_EQUATION_LAYOUT.digit;
}
/**
 * Where each picture of an item goes in a box `units` times as wide as it is
 * high, centred. Fractions of the box, so the same pieces serve a card, a
 * place in the example and a card flying between the two.
 */
export function mathEquationPieces(item, units, pictureCell = MATH_EQUATION_LAYOUT.pictureLarge) {
    const width = Math.max(units, 1e-6);
    const { digit, sign, signHeight, blankMark } = MATH_EQUATION_LAYOUT;
    const centred = (glyph, w, h, key) => ({
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
            return Array.from({ length: inRow }, (_, column) => ({
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
/**
 * Where everything of a math example goes on its stage. The background covers
 * the whole stage; the example sits on a panel above, the cards in a tray
 * below — two safe areas a gap apart, both inside the stage less `insets` and
 * an edge margin. The example is sized first and the cards a little smaller,
 * so it is what the child reads first. An empty place is as wide as the
 * widest card of its kind, so its size gives nothing away.
 */
export function layoutMathEquation(stageWidth, stageHeight, config, insets = {}) {
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
    const widestOf = (kind) => Math.max(0, ...config.cards.map((card, index) => (card.kind === kind ? cardUnits[index] : 0)));
    const numberSlot = Math.max(L.digit, widestOf("number"));
    const termUnits = config.terms.map((term) => term.missing ? (term.kind === "number" ? numberSlot : L.sign) : mathEquationItemUnits(term, pictureCell));
    const contentUnits = Math.max(L.sign, ...cardUnits);
    const count = config.cards.length;
    const rowUnits = termUnits.reduce((sum, units) => sum + units, 0) + L.gap * (termUnits.length - 1) + L.pad * 2;
    const panelUnitsHigh = 1 + L.pad * 2;
    const cardFrame = 2 * (L.cardPad + L.tilePad);
    const trayFixedWidth = count > 0 ? 2 * L.trayPad + L.cardGap * (count - 1) + count * cardFrame : 0;
    const trayFixedHeight = count > 0 ? 2 * L.trayPad + cardFrame : 0;
    let row = Math.min(areaWidth / rowUnits, (areaHeight * L.maxPanelShare) / panelUnitsHigh, L.maxRow);
    let content = count > 0
        ? Math.min(row * L.cardShare, L.maxCard, areaHeight * L.maxCardShare, Math.max(areaWidth - trayFixedWidth, count) / (count * contentUnits))
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
    const panel = {
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
    const tray = {
        left: originX + edge + (areaWidth - trayWidth) / 2,
        top: panel.top + panelHeight + (count > 0 ? gap : 0) + free * 0.3,
        width: trayWidth,
        height: trayHeight,
    };
    const cards = [];
    const tiles = [];
    const contents = [];
    for (let index = 0; index < count; index += 1) {
        const card = { left: tray.left + L.trayPad + index * (cardWidth + L.cardGap), top: tray.top + L.trayPad, width: cardWidth, height: cardHeight };
        const tile = { left: card.left + L.cardPad, top: card.top + L.cardPad, width: cardWidth - 2 * L.cardPad, height: cardHeight - 2 * L.cardPad };
        cards.push(card);
        tiles.push(tile);
        contents.push({ left: tile.left + L.tilePad, top: tile.top + L.tilePad, width: tile.width - 2 * L.tilePad, height: tile.height - 2 * L.tilePad });
    }
    return { panel, row, terms, tray, cards, tiles, contents, contentUnits, pictureCell };
}
// --- Written words ----------------------------------------------------------
//
// Words a child reads are not set in plain type: every letter has a colour of
// its own, as every digit has, so "ა" is the same "ა" wherever it is written.
// The colours are the players' (ten tones, the digits' own); which letter gets
// which is decided here, so a word looks the same on the site and in the app.
/** How many tones the players' palette of letters has. */
export const LETTER_TONE_COUNT = 10;
/** The alphabets of the three languages, in their own order. */
export const LETTER_ALPHABETS = {
    ka: "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ",
    ru: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    en: "abcdefghijklmnopqrstuvwxyz",
};
/**
 * The tone of a character, 0 to `LETTER_TONE_COUNT - 1`: a letter by its place in its
 * alphabet, stepped so that neighbours in the alphabet are far apart in the
 * palette; a digit its own number, as in a math example. Null for anything
 * else — a space, a comma, a sign — which the players draw in the signs' grey.
 * A capital has its small letter's tone.
 */
export function letterToneIndex(char) {
    const letter = char.toLowerCase();
    for (const alphabet of Object.values(LETTER_ALPHABETS)) {
        const index = alphabet.indexOf(letter);
        if (letter !== "" && index >= 0) {
            return (index * 7) % LETTER_TONE_COUNT;
        }
    }
    return /^[0-9]$/.test(letter) ? Number(letter) : null;
}
/**
 * How a line of writing is drawn, in shares of its letters' size (the em):
 * the box it is drawn in is `lineHeight` high with the baseline `baseline`
 * from its top, which leaves room for a tall letter, a tail and the outline;
 * `pad` is the room for the outline at each end.
 */
export const TEXT_ART = { lineHeight: 1.42, baseline: 1.02, pad: 0.1 };
/**
 * How wide a line of writing is, in ems: the letters are our own outlines
 * (letters.ts), so this is what the players draw and not an estimate.
 */
export function textLineAdvance(text) {
    return [...text].reduce((sum, char) => sum + textCharAdvance(char), 0);
}
/** How wide the box of a line is for its height: see `TEXT_ART`. */
export function textLineUnits(text) {
    return (textLineAdvance(text) + TEXT_ART.pad * 2) / TEXT_ART.lineHeight;
}
/**
 * A text broken into at most `maxLines` lines at its spaces, as evenly as
 * it goes: of every way to break it the one whose longest line is shortest.
 * A text of fewer words has fewer lines; a word is never split.
 */
export function breakTextLines(text, maxLines) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines = Math.max(1, Math.min(Math.floor(maxLines), words.length));
    if (words.length === 0) {
        return [];
    }
    const space = textLineAdvance(" ");
    const sums = [0];
    words.forEach((word) => sums.push(sums[sums.length - 1] + textLineAdvance(word)));
    // The width of words[from..to) set as one line.
    const span = (from, to) => sums[to] - sums[from] + space * (to - from - 1);
    // best[k][i]: the longest line when words[i..] are set in k lines, and where the first of them ends.
    const best = [];
    for (let k = 1; k <= lines; k += 1) {
        best[k] = [];
        for (let i = words.length - k; i >= 0; i -= 1) {
            if (k === 1) {
                best[k][i] = { longest: span(i, words.length), end: words.length };
                continue;
            }
            let choice = { longest: Number.POSITIVE_INFINITY, end: i + 1 };
            for (let end = i + 1; end <= words.length - (k - 1); end += 1) {
                const longest = Math.max(span(i, end), best[k - 1][end].longest);
                if (longest < choice.longest - 1e-9)
                    choice = { longest, end };
            }
            best[k][i] = choice;
        }
    }
    const result = [];
    let start = 0;
    for (let k = lines; k >= 1; k -= 1) {
        const { end } = best[k][start];
        result.push(words.slice(start, end).join(" "));
        start = end;
    }
    return result;
}
// --- Text choice ------------------------------------------------------------
//
// A question the child reads — the voice says the same — and two to four
// answers in words. It is the game of a child who reads: what is asked is
// what the child knows, and nothing on the screen gives it away. One answer
// is right, or several ("tap every bird"): the game is passed once every
// right one is found. A wrong one is crossed out and costs a life.
export const TEXT_CHOICE_ANSWERS_MIN = 2;
/** More than four answers in words do not fit a phone at a size a child reads. */
export const TEXT_CHOICE_ANSWERS_MAX = 4;
/**
 * The game as the players draw it. `question` and each answer's `text` arrive
 * already in the language of the game. An answer with no text is dropped, and
 * no more than `TEXT_CHOICE_ANSWERS_MAX` are kept — the right ones first, so a
 * game never loses its answer to the limit.
 */
export function normalizeTextChoiceConfig(game, config) {
    const rawAnswers = Array.isArray(config.answers) ? config.answers : [];
    const all = rawAnswers
        .map((answer, index) => {
        const record = asRecord(answer);
        const text = (record ? extractText(record.text) ?? extractText(record.label) : extractText(answer))?.trim();
        if (!text) {
            return null;
        }
        return {
            id: record ? extractText(record.id) ?? `${game.id}-answer-${index}` : `${game.id}-answer-${index}`,
            text,
            isCorrect: record ? extractBoolean(record.is_correct) ?? extractBoolean(record.correct) ?? false : false,
        };
    })
        .filter((answer) => Boolean(answer));
    const kept = [...all.filter((answer) => answer.isCorrect), ...all.filter((answer) => !answer.isCorrect)]
        .slice(0, TEXT_CHOICE_ANSWERS_MAX);
    const answers = shuffle(kept);
    const questionImage = extractMediaUrl(config.question_image);
    const bg = normalizeBackground(config);
    return {
        question: extractText(config.question)?.trim() ?? "",
        questionImage,
        bg_image: bg,
        answers,
        correctOptionIds: answers.filter((answer) => answer.isCorrect).map((answer) => answer.id),
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [bg, questionImage].filter((uri) => Boolean(uri)),
    };
}
/**
 * What a tap on an answer does: the whole play rule, so both players follow
 * it tap for tap. `found` are the right answers tapped so far, `crossed` the
 * wrong ones.
 */
export function resolveTextChoiceTap(config, found, crossed, optionId) {
    const option = config.answers.find((answer) => answer.id === optionId);
    if (!option || found.includes(optionId) || crossed.includes(optionId)) {
        return { type: "ignored" };
    }
    if (!option.isCorrect) {
        return { type: "wrong" };
    }
    const left = config.correctOptionIds.filter((id) => id !== optionId && !found.includes(id));
    return { type: "right", complete: left.length === 0 };
}
/** Proportions of the question and its answers. Paddings are shares of the line they surround. */
export const TEXT_CHOICE_LAYOUT = {
    /** The most of the free height the question may take… */
    questionShare: 0.4,
    /** …and the most lines it is broken into. */
    questionLines: 3,
    /** A line of the question never grows past this, in px. */
    maxQuestionLine: 76,
    /** The question's picture: a square of this share of the free height, at most this share of the width. */
    pictureShare: 0.34,
    pictureWidthShare: 0.24,
    /** An answer is broken into at most this many lines. */
    answerLines: 3,
    /** A line of an answer never grows past this, in px. */
    maxAnswerLine: 88,
    /** Around the question, and around an answer on its card. */
    panelPadX: 0.36,
    panelPadY: 0.2,
    cardPadX: 0.42,
    cardPadY: 0.26,
    /** In px: between cards. */
    cardGap: 12,
};
/** The lines of a text set at `size` px a line, centred in `area` one under the other. */
function placeTextLines(lines, size, area) {
    const top = area.top + (area.height - lines.length * size) / 2;
    return lines.map((text, index) => {
        const width = Math.min(textLineUnits(text) * size, area.width);
        return { text, left: area.left + (area.width - width) / 2, top: top + index * size, width, height: size };
    });
}
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
export function layoutTextChoice(stageWidth, stageHeight, config, insets = {}, limits = {}) {
    const L = { ...TEXT_CHOICE_LAYOUT, ...limits };
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.answers.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const areaWidth = Math.max(usableWidth - edge * 2, 1);
    const areaHeight = Math.max(usableHeight - edge * 2, 1);
    const hasQuestion = config.question !== "";
    const hasPicture = Boolean(config.questionImage);
    const hasPanel = hasQuestion || hasPicture;
    // The question: its picture is a square, the text beside it as big as its lines allow.
    const pictureSide = hasPicture ? Math.min(areaHeight * L.pictureShare, areaWidth * L.pictureWidthShare) : 0;
    const questionBudget = areaHeight * L.questionShare;
    let questionLines = [];
    let questionSize = 0;
    let panelWidth = 0;
    let panelHeight = 0;
    if (hasPanel) {
        const pictureRoom = hasPicture ? pictureSide + gap * 0.5 : 0;
        if (hasQuestion) {
            for (let count = 1; count <= L.questionLines; count += 1) {
                const lines = breakTextLines(config.question, count);
                const units = Math.max(...lines.map((line) => textLineUnits(line)));
                const size = Math.min((areaWidth - pictureRoom) / (units + L.panelPadX * 2), Math.max(questionBudget, pictureSide) / (lines.length + L.panelPadY * 2), L.maxQuestionLine);
                if (size > questionSize + 1e-9) {
                    questionSize = size;
                    questionLines = lines;
                }
            }
        }
        const textWidth = hasQuestion
            ? Math.max(...questionLines.map((line) => textLineUnits(line))) * questionSize + L.panelPadX * 2 * questionSize
            : 0;
        const textHeight = hasQuestion ? (questionLines.length + L.panelPadY * 2) * questionSize : 0;
        panelWidth = Math.min(areaWidth, pictureRoom + textWidth + (hasQuestion ? 0 : gap * 0.5));
        panelHeight = Math.max(textHeight, hasPicture ? pictureSide + gap * 0.5 : 0);
    }
    // The answers: one size for all of them, the arrangement that makes it biggest.
    const count = config.answers.length;
    const answersHeight = Math.max(areaHeight - panelHeight - (hasPanel ? gap : 0), 1);
    const columnChoices = [...new Set([count, Math.min(count, 2), 1])];
    let best = null;
    for (const columns of columnChoices) {
        const rows = Math.ceil(count / columns);
        const cellWidth = (areaWidth - L.cardGap * (columns - 1)) / columns;
        const cellHeight = (answersHeight - L.cardGap * (rows - 1)) / rows;
        for (let lineCount = 1; lineCount <= L.answerLines; lineCount += 1) {
            const lines = config.answers.map((answer) => breakTextLines(answer.text, lineCount));
            const units = Math.max(...lines.flat().map((line) => textLineUnits(line)));
            const high = Math.max(...lines.map((own) => own.length));
            const size = Math.min(cellWidth / (units + L.cardPadX * 2), cellHeight / (high + L.cardPadY * 2), L.maxAnswerLine);
            // Bigger wins; of two as big, fewer rows of cards, then fewer lines.
            if (!best || size > best.size + 0.5
                || (Math.abs(size - best.size) <= 0.5 && (rows < best.rows || (rows === best.rows && high < best.high)))) {
                best = { size, columns, rows, lines, units, high };
            }
        }
    }
    if (!best) {
        return null;
    }
    const size = Math.max(best.size, 1);
    const cardWidth = Math.min((best.units + L.cardPadX * 2) * size, (areaWidth - L.cardGap * (best.columns - 1)) / best.columns);
    const cardHeight = (best.high + L.cardPadY * 2) * size;
    const gridHeight = best.rows * cardHeight + L.cardGap * (best.rows - 1);
    const free = Math.max(0, areaHeight - panelHeight - gridHeight - (hasPanel ? gap : 0));
    const panel = hasPanel
        ? { left: originX + edge + (areaWidth - panelWidth) / 2, top: originY + edge + free * 0.4, width: panelWidth, height: panelHeight }
        : null;
    const picture = panel && hasPicture
        ? { left: panel.left + gap * 0.25, top: panel.top + (panel.height - pictureSide) / 2, width: pictureSide, height: pictureSide }
        : null;
    const question = panel && hasQuestion
        ? placeTextLines(questionLines, questionSize, {
            left: panel.left + (hasPicture ? pictureSide + gap * 0.5 : 0) + L.panelPadX * questionSize,
            top: panel.top,
            width: panel.width - (hasPicture ? pictureSide + gap * 0.5 : 0) - L.panelPadX * 2 * questionSize,
            height: panel.height,
        })
        : [];
    const gridTop = (panel ? panel.top + panel.height + gap : originY + edge) + free * (panel ? 0.3 : 0.5);
    const cards = config.answers.map((answer, index) => {
        const row = Math.floor(index / best.columns);
        // The last row may hold fewer cards: it is centred like the others.
        const inRow = Math.min(best.columns, count - row * best.columns);
        const rowWidth = inRow * cardWidth + L.cardGap * (inRow - 1);
        const card = {
            left: originX + edge + (areaWidth - rowWidth) / 2 + (index - row * best.columns) * (cardWidth + L.cardGap),
            top: gridTop + row * (cardHeight + L.cardGap),
            width: cardWidth,
            height: cardHeight,
        };
        return {
            ...card,
            id: answer.id,
            lines: placeTextLines(best.lines[index], size, {
                left: card.left + L.cardPadX * size,
                top: card.top,
                width: card.width - L.cardPadX * 2 * size,
                height: card.height,
            }),
        };
    });
    return { panel, picture, question, cards };
}
/** Two rows of six read left to right: 1–5 and wipe, 6–0 and the tick. In three columns or four the same order runs on. */
export const MATH_INPUT_KEYS = [
    "1", "2", "3", "4", "5", "erase",
    "6", "7", "8", "9", "0", "enter",
];
/** The place always has room for two digits at least, so a one-digit answer is not told by its width. */
export const MATH_INPUT_DIGITS_MIN = 2;
/**
 * The example as the players draw it. `terms` are read as a math example's
 * (`normalizeMathEquationConfig`); the place to fill is the first number
 * marked `missing`, or the last number when none is — a sign is never typed,
 * so a sign marked missing simply stands in the example.
 */
export function normalizeMathInputConfig(config) {
    const terms = readMathTerms(config.terms);
    const numbers = terms.filter((term) => term.kind === "number");
    const blank = numbers.find((term) => term.missing) ?? numbers[numbers.length - 1] ?? null;
    terms.forEach((term) => {
        term.missing = term === blank;
    });
    // The answer is typed in digits, whatever the other numbers are drawn with.
    if (blank && blank.kind === "number")
        blank.image = null;
    const longest = Math.max(0, ...numbers.map((term) => mathNumberGlyphs(term.value).length));
    const bg = extractMediaUrl(config.bg_image);
    const imageUris = [bg, ...terms.map((term) => (term.kind === "number" ? term.image : null))]
        .filter((uri) => Boolean(uri));
    return {
        terms,
        blankId: blank?.id ?? "",
        maxDigits: Math.max(MATH_INPUT_DIGITS_MIN, Math.min(mathNumberGlyphs(MATH_EQUATION_NUMBER_MAX).length, longest)),
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set(imageUris)],
    };
}
/**
 * What is typed after a key: a digit is added while there is room — a lone
 * zero is typed over, so no number starts with one — and wiping takes the last
 * digit away. The tick changes nothing here: see `resolveMathInputEntry`.
 */
export function pressMathInputKey(entry, key, maxDigits) {
    if (key === "enter") {
        return entry;
    }
    if (key === "erase") {
        return entry.slice(0, -1);
    }
    if (entry === "0") {
        return key;
    }
    return entry.length < maxDigits ? entry + key : entry;
}
/** What the tick does with what is typed: the whole play rule, so both players follow it tap for tap. */
export function resolveMathInputEntry(config, entry) {
    if (!/^[0-9]+$/.test(entry)) {
        return { type: "ignored" };
    }
    const value = Number(entry);
    const values = config.terms.map((term) => term.kind === "sign"
        ? { kind: "sign", value: term.value }
        : { kind: "number", value: term.id === config.blankId ? value : term.value });
    return isMathStatementTrue(values) ? { type: "right", value } : { type: "wrong", value };
}
/** Proportions of the pad; the example above it is a math example's (`MATH_EQUATION_LAYOUT`). */
export const MATH_INPUT_LAYOUT = {
    /** The most of the free height the example's panel takes. */
    maxPanelShare: 0.4,
    /** A key is never taller than this, in px, nor wider than this many times its height. */
    maxKey: 96,
    keyAspect: 1.5,
    /** Under this a key is hard for a small finger to hit: the example gives up height first. */
    minKey: 46,
    /** In px: between keys. */
    keyGap: 10,
    /** The ways the twelve keys can stand: columns by rows, the widest first. */
    grids: [[6, 2], [4, 3], [3, 4]],
};
/**
 * Where everything of a typed example goes on its stage. The background covers
 * the whole stage; the example sits on a panel above and the pad of keys
 * below — two safe areas a gap apart, both inside the stage less `insets` and
 * an edge margin. The keys stand in two rows of six, three of four or four of
 * three, whichever makes them biggest, and where they would come out too small
 * to hit the example is drawn smaller to make room.
 */
export function layoutMathInput(stageWidth, stageHeight, config, insets = {}) {
    const E = MATH_EQUATION_LAYOUT;
    const L = MATH_INPUT_LAYOUT;
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
    const pictureCell = mathEquationPictureCell({ terms: config.terms, cards: [] });
    const termUnits = config.terms.map((term) => term.missing ? config.maxDigits * E.digit : mathEquationItemUnits(term, pictureCell));
    const rowUnits = termUnits.reduce((sum, units) => sum + units, 0) + E.gap * (termUnits.length - 1) + E.pad * 2;
    const panelUnitsHigh = 1 + E.pad * 2;
    // The keys of a grid, given the height the example leaves them.
    const keysFor = (columns, rows, height) => {
        const keyHeight = Math.min((height - L.keyGap * (rows - 1)) / rows, L.maxKey);
        const keyWidth = Math.min((areaWidth - L.keyGap * (columns - 1)) / columns, keyHeight * L.keyAspect);
        return { columns, rows, keyWidth, keyHeight: Math.min(keyHeight, keyWidth) > 0 ? keyHeight : 0 };
    };
    const bestGrid = (height) => L.grids
        .map(([columns, rows]) => keysFor(columns, rows, height))
        // The tallest keys win; of two as tall, the wider.
        .reduce((best, grid) => grid.keyHeight > best.keyHeight + 0.5 || (Math.abs(grid.keyHeight - best.keyHeight) <= 0.5 && grid.keyWidth > best.keyWidth)
        ? grid
        : best);
    let row = Math.min(areaWidth / rowUnits, (areaHeight * L.maxPanelShare) / panelUnitsHigh, E.maxRow);
    let grid = bestGrid(areaHeight - row * panelUnitsHigh - gap);
    // Keys too small to hit: the example gives up height until they are not, or it has given up half.
    if (grid.keyHeight < L.minKey) {
        const tallest = L.grids.reduce((most, [, rows]) => Math.min(most, rows), Number.POSITIVE_INFINITY);
        const wanted = tallest * L.minKey + L.keyGap * (tallest - 1);
        row = Math.max(row * 0.5, Math.min(row, (areaHeight - gap - wanted) / panelUnitsHigh));
        grid = bestGrid(areaHeight - row * panelUnitsHigh - gap);
    }
    row = Math.max(row, 1);
    const keyWidth = Math.max(grid.keyWidth, 1);
    const keyHeight = Math.max(grid.keyHeight, 1);
    const panelWidth = row * rowUnits;
    const panelHeight = row * panelUnitsHigh;
    const padWidth = grid.columns * keyWidth + L.keyGap * (grid.columns - 1);
    const padHeight = grid.rows * keyHeight + L.keyGap * (grid.rows - 1);
    const free = Math.max(0, areaHeight - panelHeight - padHeight - gap);
    const panel = {
        left: originX + edge + (areaWidth - panelWidth) / 2,
        top: originY + edge + free * 0.4,
        width: panelWidth,
        height: panelHeight,
    };
    let x = panel.left + E.pad * row;
    const terms = config.terms.map((term, index) => {
        const rect = { id: term.id, units: termUnits[index], left: x, top: panel.top + E.pad * row, width: termUnits[index] * row, height: row };
        x += rect.width + E.gap * row;
        return rect;
    });
    const pad = {
        left: originX + edge + (areaWidth - padWidth) / 2,
        top: panel.top + panelHeight + gap + free * 0.3,
        width: padWidth,
        height: padHeight,
    };
    const keys = MATH_INPUT_KEYS.map((key, index) => ({
        key,
        left: pad.left + (index % grid.columns) * (keyWidth + L.keyGap),
        top: pad.top + Math.floor(index / grid.columns) * (keyHeight + L.keyGap),
        width: keyWidth,
        height: keyHeight,
    }));
    return { panel, row, terms, pad, keys, pictureCell };
}
// --- Word build -------------------------------------------------------------
//
// A word put together from its letters: a picture of a cow, five empty places
// and the letters of "ძროხა" lying mixed below, with a few that do not belong.
// The child taps the letter that comes next; a right one flies to its place, a
// wrong one shakes and costs a life. It is the game of a child who reads and
// is learning to spell — in Georgian, Russian or English, whichever the word
// is in.
/** A word of one letter is nothing to build, and more than eight do not fit a phone at a size a child reads. */
export const WORD_BUILD_LETTERS_MIN = 2;
export const WORD_BUILD_LETTERS_MAX = 8;
/** The most letters that do not belong: more and the tray is a search, not a spelling. */
export const WORD_BUILD_EXTRA_MAX = 4;
/**
 * How wide a letter's box is for its height so that the widest letter of the
 * three alphabets fits it ("ლ"): drawn in a box of this shape, every letter of
 * a word is written at one size, whichever tile it stands on.
 */
export const WORD_BUILD_LETTER_UNITS = Math.max(...Object.values(LETTER_ALPHABETS).flatMap((set) => [...set].map((char) => textLineUnits(char))));
/** The ink of the three alphabets, in ems: the widest letter, and from the top of the tallest to the foot of the deepest. */
const WORD_BUILD_INK = Object.values(LETTER_ALPHABETS)
    .flatMap((set) => [...set])
    .reduce((ink, char) => {
    const shape = glyphShape(char);
    return shape
        ? {
            width: Math.max(ink.width, shape.box.width / OUTLINE_EM),
            top: Math.min(ink.top, shape.box.y / OUTLINE_EM),
            bottom: Math.max(ink.bottom, (shape.box.y + shape.box.height) / OUTLINE_EM),
        }
        : ink;
}, { width: 0, top: 0, bottom: 0 });
/** What the players' brush adds round a letter, in ems: its outline and the thickness under it. */
const WORD_BUILD_BRUSH = 0.14;
/**
 * The box a letter is drawn in on a tile whose face is `width` × `height`:
 * a line's box (`TEXT_ART`), sized so that every letter of the three
 * alphabets is written at one size — the biggest at which the widest ("ლ")
 * and the tallest keep inside the face, outline and all. A line's box has air
 * round its letters, so the box itself may be larger than the face: it is
 * centred on it and only air hangs over.
 */
export function wordBuildLetterBox(width, height) {
    const em = Math.max(0, Math.min(width / (WORD_BUILD_INK.width + WORD_BUILD_BRUSH), height / (WORD_BUILD_INK.bottom - WORD_BUILD_INK.top + WORD_BUILD_BRUSH)));
    const lineHeight = em * TEXT_ART.lineHeight;
    return { width: lineHeight * WORD_BUILD_LETTER_UNITS, height: lineHeight };
}
/** The letters of a word: only letters of the three alphabets count, a capital as its small letter. */
function readWordLetters(source) {
    const known = Object.values(LETTER_ALPHABETS).join("");
    return [...(extractText(source) ?? "").toLowerCase()].filter((char) => known.includes(char));
}
/**
 * The game as the players draw it. `word` arrives already in the language of
 * the game. `extra_letters` is how many letters that do not belong lie among
 * the tiles (a number: they are drawn from the word's own alphabet, none of
 * them a letter of the word) or the letters themselves (a text). The tiles
 * are mixed so that they do not already spell the word.
 */
export function normalizeWordBuildConfig(config) {
    const letters = readWordLetters(config.word).slice(0, WORD_BUILD_LETTERS_MAX);
    const alphabet = Object.values(LETTER_ALPHABETS).find((set) => letters.length > 0 && set.includes(letters[0])) ?? "";
    const wanted = extractNumber(config.extra_letters);
    const extra = wanted !== null
        ? shuffle([...alphabet].filter((char) => !letters.includes(char))).slice(0, Math.max(0, Math.floor(wanted)))
        : readWordLetters(config.extra_letters).filter((char) => !letters.includes(char));
    const all = letters.length > 0 ? [...letters, ...[...new Set(extra)].slice(0, WORD_BUILD_EXTRA_MAX)] : [];
    let order = shuffle(all.map((letter, index) => ({ id: `tile_${index + 1}`, letter })));
    // Mixed is mixed: a tray that reads as the word already gives it away.
    for (let attempt = 0; attempt < 6 && all.length > 1 && order.slice(0, letters.length).every((tile, index) => tile.letter === letters[index]); attempt += 1) {
        order = shuffle(order);
    }
    const questionImage = extractMediaUrl(config.question_image);
    const bg = normalizeBackground(config);
    return {
        letters,
        tiles: order,
        questionImage,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [bg, questionImage].filter((uri) => Boolean(uri)),
    };
}
/**
 * What a tap on a tile does: the whole play rule, so both players follow it
 * tap for tap. The word is built left to right; `placed` are the tiles in it
 * so far, in order. Any tile of the right letter is right — "მამა" has two of
 * each, and either goes first.
 */
export function resolveWordBuildTap(config, placed, tileId) {
    const slot = placed.length;
    const tile = config.tiles.find((item) => item.id === tileId);
    if (!tile || slot >= config.letters.length || placed.includes(tileId)) {
        return { type: "ignored" };
    }
    if (tile.letter !== config.letters[slot]) {
        return { type: "wrong", slot };
    }
    return { type: "place", slot, complete: slot + 1 === config.letters.length };
}
/** Proportions of the word and its tiles. Shares are of the height of a letter's place. */
export const WORD_BUILD_LAYOUT = {
    /** A letter's place and a tile: this wide for its height. */
    aspect: 0.86,
    /** A place never grows past this, in px, nor a tile past its own. */
    maxSlot: 116,
    maxTile: 100,
    /** Under this a tile is hard for a small finger to hit: the word gives up height first. */
    minTile: 46,
    /** Between two places, and around the word on its panel. */
    slotGap: 0.1,
    pad: 0.18,
    /** The picture: a square this many places high, with this much room before the word. */
    picture: 1.45,
    pictureGap: 0.3,
    /** The most of the free height the word's panel takes. */
    maxPanelShare: 0.46,
    /** In px: between tiles. */
    tileGap: 10,
};
/**
 * Where everything of a word to build goes on its stage. The background
 * covers the whole stage; the word's places sit on a panel above — its picture
 * at their left when it has one — and the tiles below, in one row or two,
 * whichever stands them biggest: two safe areas a gap apart, both inside the
 * stage less `insets` and an edge margin.
 */
export function layoutWordBuild(stageWidth, stageHeight, config, insets = {}) {
    const L = WORD_BUILD_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    const count = config.letters.length;
    const tileCount = config.tiles.length;
    if (usableWidth <= 0 || usableHeight <= 0 || count === 0 || tileCount === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const areaWidth = Math.max(usableWidth - edge * 2, 1);
    const areaHeight = Math.max(usableHeight - edge * 2, 1);
    const hasPicture = Boolean(config.questionImage);
    // The panel in places: as wide and as high as its picture and its word ask.
    const unitsWide = (hasPicture ? L.picture + L.pictureGap : 0) + count * L.aspect + (count - 1) * L.slotGap + L.pad * 2;
    const unitsHigh = (hasPicture ? L.picture : 1) + L.pad * 2;
    // The tiles, given the height the word leaves them: one row, or two when there are many.
    const tilesFor = (height) => [1, 2]
        .filter((rows) => rows === 1 || tileCount > 4)
        .map((rows) => {
        const columns = Math.ceil(tileCount / rows);
        const size = Math.min(L.maxTile, (height - L.tileGap * (rows - 1)) / rows, (areaWidth - L.tileGap * (columns - 1)) / columns / L.aspect);
        return { rows, columns, size };
    })
        // The bigger tiles win; of two as big, the single row.
        .reduce((best, grid) => (grid.size > best.size + 0.5 ? grid : best));
    let slot = Math.min(L.maxSlot, areaWidth / unitsWide, (areaHeight * L.maxPanelShare) / unitsHigh);
    let grid = tilesFor(areaHeight - slot * unitsHigh - gap);
    // Tiles too small to hit: the word gives up height until they are not, or it has given up half.
    if (grid.size < L.minTile) {
        const wanted = 2 * L.minTile + L.tileGap;
        slot = Math.max(slot * 0.5, Math.min(slot, (areaHeight - gap - wanted) / unitsHigh));
        grid = tilesFor(areaHeight - slot * unitsHigh - gap);
    }
    slot = Math.max(slot, 1);
    const tile = Math.max(grid.size, 1);
    const tileWidth = tile * L.aspect;
    const panelWidth = slot * unitsWide;
    const panelHeight = slot * unitsHigh;
    const trayHeight = grid.rows * tile + L.tileGap * (grid.rows - 1);
    const free = Math.max(0, areaHeight - panelHeight - trayHeight - gap);
    const panel = {
        left: originX + edge + (areaWidth - panelWidth) / 2,
        top: originY + edge + free * 0.4,
        width: panelWidth,
        height: panelHeight,
    };
    const picture = hasPicture
        ? { left: panel.left + L.pad * slot, top: panel.top + L.pad * slot, width: L.picture * slot, height: L.picture * slot }
        : null;
    const wordLeft = panel.left + L.pad * slot + (hasPicture ? (L.picture + L.pictureGap) * slot : 0);
    const slots = config.letters.map((_, index) => ({
        left: wordLeft + index * (L.aspect + L.slotGap) * slot,
        top: panel.top + (panelHeight - slot) / 2,
        width: L.aspect * slot,
        height: slot,
    }));
    const trayTop = panel.top + panelHeight + gap + free * 0.3;
    const tiles = config.tiles.map((_, index) => {
        const row = Math.floor(index / grid.columns);
        // The last row may hold fewer tiles: it is centred like the others.
        const inRow = Math.min(grid.columns, tileCount - row * grid.columns);
        const rowWidth = inRow * tileWidth + L.tileGap * (inRow - 1);
        return {
            left: originX + edge + (areaWidth - rowWidth) / 2 + (index - row * grid.columns) * (tileWidth + L.tileGap),
            top: trayTop + row * (tile + L.tileGap),
            width: tileWidth,
            height: tile,
        };
    });
    const trayLeft = Math.min(...tiles.map((rect) => rect.left));
    const trayRight = Math.max(...tiles.map((rect) => rect.left + rect.width));
    return {
        panel,
        picture,
        slots,
        tray: { left: trayLeft, top: trayTop, width: trayRight - trayLeft, height: trayHeight },
        tiles,
    };
}
// --- Label diagram ----------------------------------------------------------
//
// A picture whose parts are named: a map, the parts of a plant, the animals
// of a farm. It lies whole on the stage like a sheet on a desk, with numbered
// pins on what is to be named — a point of the picture itself, or a picture
// the author stood on it — and the words that name them wait on cards beside
// it. The parts are asked one after another, left to right: the pin of the
// one asked pulses, and the child taps its name. A right card takes the pin's
// number and stays, so a legend grows as the game goes; a wrong one costs a
// life. It is the game of a child who reads, and its words arrive in the
// language it is played in.
//
// Unlike every scene game the picture is never cropped and nothing on it is
// moved: a pin on a map stands on its town or it stands for nothing.
export const LABEL_DIAGRAM_PARTS_MIN = 2;
/** More pins than this and their names do not fit a phone at a size a child reads. */
export const LABEL_DIAGRAM_PARTS_MAX = 6;
/** The most cards: the names of the parts and the ones that name nothing on the picture. */
export const LABEL_DIAGRAM_LABELS_MAX = 6;
/**
 * The game as the players draw it. `placements` are what stands on the
 * picture, in percent of it, each with the `label` that names it — already in
 * the language of the game — or none; one without an `image` is a point of
 * the picture itself and is kept only for its name. `extra_labels` are names
 * of nothing on the picture. A name is asked for at most
 * `LABEL_DIAGRAM_PARTS_MAX` parts: the leftmost ones, the rest left unnamed.
 */
export function normalizeLabelDiagramConfig(config) {
    const clampPercent = (value) => Math.max(0, Math.min(100, value ?? 0));
    const tidy = (value) => (extractText(value) ?? "").trim().replace(/\s+/g, " ");
    const placed = (Array.isArray(config.placements) ? config.placements : [])
        .map((raw) => {
        const record = asRecord(raw);
        if (!record) {
            return null;
        }
        const image = extractMediaUrl(record.image);
        const label = tidy(record.label) || null;
        const x = clampPercent(extractNumber(record.x));
        const y = clampPercent(extractNumber(record.y));
        const width = Math.min(100 - x, clampPercent(extractNumber(record.width)));
        const height = Math.min(100 - y, clampPercent(extractNumber(record.height)));
        // A point with no name is nothing at all: there is no picture to show for it.
        return width > 0 && height > 0 && (image || label) ? { image, x, y, width, height, label } : null;
    })
        .filter((part) => Boolean(part));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    // Asked the way the picture runs: left to right across a map, top to bottom
    // down a plant — along whichever way the named parts are spread further.
    const middles = placed.map((part) => ({
        x: ((part.x + part.width / 2) / 100) * (boardWidth && boardWidth > 0 ? boardWidth : 100),
        y: ((part.y + part.height / 2) / 100) * (boardHeight && boardHeight > 0 ? boardHeight : 100),
    }));
    const namedIndexes = placed.map((part, index) => index).filter((index) => placed[index].label !== null);
    const spread = (axis) => namedIndexes.length > 0
        ? Math.max(...namedIndexes.map((index) => middles[index][axis])) - Math.min(...namedIndexes.map((index) => middles[index][axis]))
        : 0;
    const [first, second] = spread("y") > spread("x") ? ["y", "x"] : ["x", "y"];
    const named = namedIndexes
        .map((index) => ({ part: placed[index], index }))
        .sort((a, b) => middles[a.index][first] - middles[b.index][first] ||
        middles[a.index][second] - middles[b.index][second] ||
        a.index - b.index)
        .slice(0, LABEL_DIAGRAM_PARTS_MAX);
    const numberOf = new Map(named.map(({ index }, turn) => [index, turn + 1]));
    const parts = placed
        .map((part, index) => ({
        id: `part_${index + 1}`,
        ...part,
        label: numberOf.has(index) ? part.label : null,
        number: numberOf.get(index) ?? 0,
    }))
        // A point past the last one asked has neither a name nor a picture left.
        .filter((part) => part.image !== null || part.label !== null);
    const own = named.map(({ part }) => part.label);
    const extra = (Array.isArray(config.extra_labels) ? config.extra_labels : [])
        .map(tidy)
        .filter((text, index, all) => text !== "" && !own.includes(text) && all.indexOf(text) === index)
        .slice(0, Math.max(0, LABEL_DIAGRAM_LABELS_MAX - own.length));
    const bg = extractMediaUrl(config.bg_image);
    return {
        parts,
        order: named.map(({ index }) => `part_${index + 1}`),
        labels: shuffle([...own, ...extra].map((text, index) => ({ id: `label_${index + 1}`, text }))),
        board: parts.length > 0 && boardWidth && boardHeight && boardWidth > 0 && boardHeight > 0
            ? { width: boardWidth, height: boardHeight }
            : null,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set([bg, ...parts.map((part) => part.image)].filter((uri) => Boolean(uri)))],
    };
}
/**
 * What a tap on a card does: the whole play rule, so both players follow it
 * tap for tap. `used` are the cards given to parts so far, in the order the
 * parts are asked — so the part asked now is `order[used.length]`. Any card of
 * the right word is right: a picture with two cows has two cards "cow", and
 * either names either.
 */
export function resolveLabelDiagramTap(config, used, labelId) {
    const partId = config.order[used.length];
    const part = config.parts.find((item) => item.id === partId);
    const label = config.labels.find((item) => item.id === labelId);
    if (!part || !label || used.includes(labelId)) {
        return { type: "ignored" };
    }
    if (label.text !== part.label) {
        return { type: "wrong", partId: part.id };
    }
    return { type: "right", partId: part.id, complete: used.length + 1 === config.order.length };
}
/** Proportions of the cards and the pins. Shares are of the height of a line of a card's writing. */
export const LABEL_DIAGRAM_LAYOUT = {
    /** A line of a name never grows past this, in px; under `minLine` a child no longer reads it. */
    maxLine: 40,
    minLine: 18,
    /** A name is broken into at most this many lines. */
    lines: 2,
    /** Around a card's writing. */
    cardPadX: 0.4,
    cardPadY: 0.24,
    /** The round place for the pin's number at the left of a card, and the room after it. */
    badge: 1.1,
    badgeGap: 0.3,
    /** In px: between cards. */
    cardGap: 8,
    /** In px: the white rim the players draw round the sheet; the layout leaves it room. */
    sheetRim: 6,
    /** The most of the free width a column of cards takes, and of the free height a row of them. */
    columnShare: 0.4,
    rowShare: 0.36,
    /** A pin on a picture: this share of its shorter side across. On a point: as big as the point. Both between these sizes in px. */
    pinShare: 0.34,
    minPin: 28,
    maxPin: 46,
};
/**
 * Where everything of a picture to name goes on its stage: the sheet and the
 * cards, two areas a gap apart, both inside the stage less `insets` and an
 * edge margin. The cards are tried four ways — a column at the right of the
 * sheet or a row under it, their names on one line or broken in two — each as
 * big as it goes, and the way is taken that keeps both the sheet and the
 * writing big, the writing first. Nothing on the sheet is ever moved.
 */
export function layoutLabelDiagram(stageWidth, stageHeight, config, insets = {}) {
    const L = LABEL_DIAGRAM_LAYOUT;
    const board = config.board;
    const count = config.labels.length;
    if (!board || count === 0 || config.parts.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const areaLeft = (insets.left ?? 0) + edge;
    const areaTop = (insets.top ?? 0) + edge;
    const areaWidth = stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2;
    const areaHeight = stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2;
    if (areaWidth <= 0 || areaHeight <= 0) {
        return null;
    }
    const chrome = L.cardPadX * 2 + L.badge + L.badgeGap;
    const breaks = config.labels.some((label) => label.text.includes(" ")) ? [1, L.lines] : [1];
    const gaps = L.cardGap * (count - 1);
    let best = null;
    for (const arrangement of ["column", "row"]) {
        for (const maxLines of breaks) {
            const texts = config.labels.map((label) => breakTextLines(label.text, maxLines));
            const rows = Math.max(...texts.map((lines) => lines.length), 1);
            // A card's width and height, in lines' heights.
            const unitsWide = texts.map((lines) => chrome + Math.max(...lines.map((text) => textLineUnits(text)), 0));
            const unitsHigh = rows + L.cardPadY * 2;
            const widest = Math.max(...unitsWide);
            const line = Math.min(L.maxLine, arrangement === "column"
                ? Math.min((areaWidth * L.columnShare) / widest, (areaHeight - gaps) / (count * unitsHigh))
                : Math.min((areaWidth - gaps) / unitsWide.reduce((sum, units) => sum + units, 0), (areaHeight * L.rowShare) / unitsHigh));
            if (!(line > 1)) {
                continue;
            }
            const cardHeight = unitsHigh * line;
            // In a column every card is as wide as the widest, like the lines of a legend.
            const widths = unitsWide.map((units) => (arrangement === "column" ? widest : units) * line);
            const tray = arrangement === "column"
                ? { width: widths[0], height: count * cardHeight + gaps }
                : { width: widths.reduce((sum, width) => sum + width, 0) + gaps, height: cardHeight };
            const roomWidth = areaWidth - L.sheetRim * 2 - (arrangement === "column" ? tray.width + gap : 0);
            const roomHeight = areaHeight - L.sheetRim * 2 - (arrangement === "row" ? tray.height + gap : 0);
            if (roomWidth <= 0 || roomHeight <= 0) {
                continue;
            }
            const scale = Math.min(roomWidth / board.width, roomHeight / board.height);
            const sheet = { width: board.width * scale, height: board.height * scale };
            // A big sheet and big writing both count, the writing twice: a name a child
            // cannot read is no name. Writing under `minLine` is the last choice.
            const score = sheet.width * sheet.height * (line / L.maxLine) ** 2 * (line < L.minLine ? 0.25 : 1);
            if (!best || score > best.score * (1 + 1e-9)) {
                best = { score, arrangement, line, texts, widths, cardHeight, tray, sheet };
            }
        }
    }
    if (!best) {
        return null;
    }
    const { arrangement, line, texts, widths, cardHeight } = best;
    const framed = { width: best.sheet.width + L.sheetRim * 2, height: best.sheet.height + L.sheetRim * 2 };
    // The sheet and the cards, centred together in what the stage leaves free.
    const groupWidth = arrangement === "column" ? framed.width + gap + best.tray.width : Math.max(framed.width, best.tray.width);
    const groupHeight = arrangement === "row" ? framed.height + gap + best.tray.height : Math.max(framed.height, best.tray.height);
    const groupLeft = areaLeft + (areaWidth - groupWidth) / 2;
    const groupTop = areaTop + (areaHeight - groupHeight) / 2;
    const sheet = {
        left: (arrangement === "column" ? groupLeft : groupLeft + (groupWidth - framed.width) / 2) + L.sheetRim,
        top: (arrangement === "row" ? groupTop : groupTop + (groupHeight - framed.height) / 2) + L.sheetRim,
        width: best.sheet.width,
        height: best.sheet.height,
    };
    const tray = {
        left: arrangement === "column" ? groupLeft + framed.width + gap : groupLeft + (groupWidth - best.tray.width) / 2,
        top: arrangement === "row" ? groupTop + framed.height + gap : groupTop + (groupHeight - best.tray.height) / 2,
        width: best.tray.width,
        height: best.tray.height,
    };
    const badge = L.badge * line;
    let cursor = 0;
    const cards = config.labels.map((label, index) => {
        const left = tray.left + (arrangement === "column" ? 0 : cursor);
        const top = tray.top + (arrangement === "column" ? cursor : 0);
        cursor += (arrangement === "column" ? cardHeight : widths[index]) + L.cardGap;
        const textLeft = left + (L.cardPadX + L.badge + L.badgeGap) * line;
        const textTop = top + (cardHeight - texts[index].length * line) / 2;
        return {
            id: label.id,
            left,
            top,
            width: widths[index],
            height: cardHeight,
            badge: { left: left + L.cardPadX * line, top: top + (cardHeight - badge) / 2, width: badge, height: badge },
            lines: texts[index].map((text, row) => ({
                text,
                left: textLeft,
                top: textTop + row * line,
                width: textLineUnits(text) * line,
                height: line,
            })),
        };
    });
    const parts = config.parts.map((part) => ({
        left: sheet.left + (part.x / 100) * sheet.width,
        top: sheet.top + (part.y / 100) * sheet.height,
        width: (part.width / 100) * sheet.width,
        height: (part.height / 100) * sheet.height,
    }));
    const pins = config.order
        .map((partId) => {
        const index = config.parts.findIndex((part) => part.id === partId);
        const rect = parts[index];
        if (!rect) {
            return null;
        }
        const across = Math.min(rect.width, rect.height) * (config.parts[index].image === null ? 1 : L.pinShare);
        const size = Math.max(L.minPin, Math.min(L.maxPin, across));
        return {
            partId,
            number: config.parts[index].number,
            left: rect.left + rect.width / 2 - size / 2,
            top: rect.top + rect.height / 2 - size / 2,
            width: size,
            height: size,
        };
    })
        .filter((pin) => Boolean(pin));
    return { sheet, parts, pins, arrangement, tray, cards };
}
// --- Reading text -----------------------------------------------------------
//
// A short text the child reads, and questions about it asked one after
// another — the game of a child who reads a story and understands it. The
// text stays on the screen the whole game; each question has two or three
// answers in words and one of them is right. A right answer brings the next
// question; a wrong one is crossed out and costs a life. Everything written
// arrives in the language the game is played in: the server has chosen it.
export const READING_TEXT_QUESTIONS_MAX = 3;
export const READING_TEXT_ANSWERS_MIN = 2;
/** Beside a text, a fourth answer would not fit a phone at a size a child reads. */
export const READING_TEXT_ANSWERS_MAX = 3;
/**
 * The game as the players draw it. A question with no text, no right answer
 * or fewer than two answers is dropped; of several marked right only the first
 * is kept right, and the others go — a question here has one answer. No more
 * than `READING_TEXT_QUESTIONS_MAX` questions and `READING_TEXT_ANSWERS_MAX`
 * answers to each are kept, the right one always among them.
 */
export function normalizeReadingTextConfig(game, config) {
    const rawQuestions = Array.isArray(config.questions) ? config.questions : [];
    const questions = rawQuestions
        .map((raw, questionIndex) => {
        const record = asRecord(raw);
        if (!record) {
            return null;
        }
        const question = (extractText(record.question) ?? extractText(record.text) ?? "").trim();
        const id = extractText(record.id) ?? `${game.id}-question-${questionIndex}`;
        const rawAnswers = Array.isArray(record.answers) ? record.answers : [];
        const answers = rawAnswers
            .map((answer, index) => {
            const item = asRecord(answer);
            const text = (item ? extractText(item.text) ?? extractText(item.label) : extractText(answer))?.trim();
            if (!text) {
                return null;
            }
            return {
                id: item ? extractText(item.id) ?? `${id}-answer-${index}` : `${id}-answer-${index}`,
                text,
                isCorrect: item ? extractBoolean(item.is_correct) ?? extractBoolean(item.correct) ?? false : false,
            };
        })
            .filter((answer) => Boolean(answer));
        const right = answers.find((answer) => answer.isCorrect);
        if (question === "" || !right) {
            return null;
        }
        const kept = [right, ...answers.filter((answer) => !answer.isCorrect)].slice(0, READING_TEXT_ANSWERS_MAX);
        if (kept.length < READING_TEXT_ANSWERS_MIN) {
            return null;
        }
        return { id, question, answers: shuffle(kept), correctId: right.id };
    })
        .filter((question) => Boolean(question))
        .slice(0, READING_TEXT_QUESTIONS_MAX);
    const bg = normalizeBackground(config);
    return {
        text: (extractText(config.text) ?? extractText(config.passage) ?? "").replace(/\s+/g, " ").trim(),
        questions,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/**
 * What a tap on an answer does: the whole play rule, so both players follow
 * it tap for tap. `step` is the question asked now (its index), `crossed` the
 * wrong answers of it tapped so far.
 */
export function resolveReadingTextTap(config, step, crossed, answerId) {
    const question = config.questions[step];
    const answer = question?.answers.find((item) => item.id === answerId);
    if (!question || !answer || crossed.includes(answerId)) {
        return { type: "ignored" };
    }
    if (answer.id !== question.correctId) {
        return { type: "wrong" };
    }
    return { type: "right", complete: step >= config.questions.length - 1 };
}
/** Proportions of the text and of its questions. Paddings are shares of the line they surround. */
export const READING_TEXT_LAYOUT = {
    /** A line of the text never grows past this, in px. */
    maxPassageLine: 46,
    /** Around the text on its sheet. */
    passagePadX: 0.7,
    passagePadY: 0.5,
    /** The text's share of the width when the questions stand beside it, tried in turn. */
    sideShares: [0.46, 0.52, 0.58, 0.64],
    /** Its share of the height when they stand under it. */
    stackShares: [0.42, 0.5, 0.58],
    /** The question and its answers: a text game of its own, its lines kept near the text's. */
    question: { maxQuestionLine: 50, maxAnswerLine: 56, answerLines: 2, questionShare: 0.42 },
};
/**
 * A text's words set from the left into lines no wider than `units`, as a
 * book sets them. `advances` are the words' own widths in ems, measured once.
 */
function wrapTextLines(words, advances, units) {
    const space = textLineAdvance(" ");
    // The widest a line's letters may be, in ems: `textLineUnits` turned round.
    const room = units * TEXT_ART.lineHeight - TEXT_ART.pad * 2;
    const lines = [];
    let from = 0;
    let width = 0;
    words.forEach((word, index) => {
        if (index > from && width + space + advances[index] > room) {
            lines.push(words.slice(from, index).join(" "));
            from = index;
            width = advances[index];
        }
        else {
            width += (index > from ? space : 0) + advances[index];
        }
    });
    if (from < words.length) {
        lines.push(words.slice(from).join(" "));
    }
    return lines;
}
/**
 * A text set as big as it goes into `width` × `height`, with its paddings:
 * the biggest size at which its lines, filled from the left, are no more than
 * the height holds — found by halving.
 */
function fitPassage(text, width, height) {
    const L = READING_TEXT_LAYOUT;
    const words = text.split(" ").filter(Boolean);
    if (words.length === 0) {
        return { lines: [], size: 0 };
    }
    const advances = words.map((word) => textLineAdvance(word));
    const widest = Math.max(...words.map((word) => textLineUnits(word)));
    const set = (size) => wrapTextLines(words, advances, width / size - L.passagePadX * 2);
    const fits = (size) => widest <= width / size - L.passagePadX * 2 && (set(size).length + L.passagePadY * 2) * size <= height;
    if (fits(L.maxPassageLine)) {
        return { lines: set(L.maxPassageLine), size: L.maxPassageLine };
    }
    let low = 0;
    let high = L.maxPassageLine;
    for (let step = 0; step < 24; step += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) {
            low = middle;
        }
        else {
            high = middle;
        }
    }
    return low > 0 ? { lines: set(low), size: low } : { lines: [], size: 0 };
}
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
export function layoutReadingText(stageWidth, stageHeight, config, insets = {}) {
    const L = READING_TEXT_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.text === "" || config.questions.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const areaLeft = originX + edge;
    const areaTop = originY + edge;
    const areaWidth = Math.max(usableWidth - edge * 2, 1);
    const areaHeight = Math.max(usableHeight - edge * 2, 1);
    let best = null;
    const tryArrangement = (arrangement, share) => {
        const slot = arrangement === "side"
            ? { left: areaLeft, top: areaTop, width: areaWidth * share - gap / 2, height: areaHeight }
            : { left: areaLeft, top: areaTop, width: areaWidth, height: areaHeight * share - gap / 2 };
        const column = arrangement === "side"
            ? { left: slot.left + slot.width + gap, top: areaTop, width: areaWidth - slot.width - gap, height: areaHeight }
            : { left: areaLeft, top: slot.top + slot.height + gap, width: areaWidth, height: areaHeight - slot.height - gap };
        if (slot.width <= 0 || slot.height <= 0 || column.width <= 0 || column.height <= 0) {
            return;
        }
        const passage = fitPassage(config.text, slot.width, slot.height);
        if (passage.size <= 0) {
            return;
        }
        // The question's own layout, given exactly the column: its edge is ours.
        const columnInsets = {
            left: column.left - edge,
            top: column.top - edge,
            right: stageWidth - (column.left + column.width) - edge,
            bottom: stageHeight - (column.top + column.height) - edge,
        };
        const steps = [];
        let smallest = passage.size;
        for (const question of config.questions) {
            const step = layoutTextChoice(stageWidth, stageHeight, { question: question.question, questionImage: null, answers: question.answers }, columnInsets, L.question);
            if (!step) {
                return;
            }
            steps.push(step);
            smallest = Math.min(smallest, step.question[0]?.height ?? smallest, ...step.cards.map((card) => card.lines[0]?.height ?? smallest));
        }
        const textWidth = Math.max(...passage.lines.map((line) => textLineUnits(line))) * passage.size;
        const sheetWidth = Math.min(slot.width, textWidth + L.passagePadX * 2 * passage.size);
        const sheetHeight = Math.min(slot.height, (passage.lines.length + L.passagePadY * 2) * passage.size);
        // Beside the questions the sheet stands in the middle of its height; over them, at the top.
        const sheet = {
            left: slot.left + (slot.width - sheetWidth) / 2,
            top: slot.top + (arrangement === "side" ? (slot.height - sheetHeight) / 2 : slot.height - sheetHeight),
            width: sheetWidth,
            height: sheetHeight,
        };
        const lines = passage.lines.map((text, index) => {
            const width = Math.min(textLineUnits(text) * passage.size, sheet.width - L.passagePadX * 2 * passage.size);
            // A text is read from the left: its lines start at one edge.
            return {
                text,
                left: sheet.left + L.passagePadX * passage.size,
                top: sheet.top + L.passagePadY * passage.size + index * passage.size,
                width,
                height: passage.size,
            };
        });
        // Of two as good, the questions beside the text: a phone on its side has the width.
        // Where every writing is at its biggest already, the text in fewer lines.
        const score = smallest + (arrangement === "side" ? 0.25 : 0) - passage.lines.length * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { sheet, lines, arrangement, steps } };
        }
    };
    L.sideShares.forEach((share) => tryArrangement("side", share));
    L.stackShares.forEach((share) => tryArrangement("stack", share));
    return best?.layout ?? null;
}
/**
 * The game as the players draw it. The answer is a whole number from 0 to
 * `MATH_EQUATION_NUMBER_MAX`, the most a math example holds; a problem with
 * no words or no such answer has none and is not played.
 */
export function normalizeWordProblemConfig(config) {
    const raw = extractNumber(config.answer);
    const answer = raw !== null && Number.isFinite(raw) ? Math.round(raw) : NaN;
    const valid = Number.isFinite(answer) && answer >= 0 && answer <= MATH_EQUATION_NUMBER_MAX;
    const bg = normalizeBackground(config);
    return {
        text: (extractText(config.text) ?? extractText(config.problem) ?? "").replace(/\s+/g, " ").trim(),
        answer: valid ? answer : -1,
        unit: (extractText(config.unit) ?? "").replace(/\s+/g, " ").trim(),
        maxDigits: Math.max(MATH_INPUT_DIGITS_MIN, valid ? String(answer).length : MATH_INPUT_DIGITS_MIN),
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/**
 * What the tick does with what is typed: the whole play rule, so both players
 * follow it tap for tap. What a key types is `pressMathInputKey`, as in the
 * typed math example.
 */
export function resolveWordProblemEntry(config, entry) {
    if (!/^[0-9]+$/.test(entry) || config.answer < 0) {
        return { type: "ignored" };
    }
    const value = Number(entry);
    return value === config.answer ? { type: "right", value } : { type: "wrong", value };
}
/** Proportions of a word problem. The pad's keys are the typed example's (`MATH_INPUT_LAYOUT`). */
export const WORD_PROBLEM_LAYOUT = {
    /** The problem's share of the width when the answer and the pad stand beside it, tried in turn. */
    sideShares: [0.48, 0.54, 0.6, 0.66],
    /** Its share of the height when they stand under it. */
    stackShares: [0.34, 0.42, 0.5],
    /** The answer's place: as tall as a key, within these, in px. */
    minAnswer: 40,
    maxAnswer: 84,
    /** The unit after the answer, as a share of the answer's height. */
    unitShare: 0.6,
    /** In px: between the answer's place and the unit, and between the answer's row and the pad. */
    unitGap: 10,
    rowGap: 14,
};
/** The pad's keys, as big as `width` × `height` lets them be, in the grid that makes them biggest. */
function fitMathInputKeys(width, height) {
    const L = MATH_INPUT_LAYOUT;
    let best = null;
    for (const [columns, rows] of L.grids) {
        const tall = Math.min((height - L.keyGap * (rows - 1)) / rows, L.maxKey);
        const keyWidth = Math.min((width - L.keyGap * (columns - 1)) / columns, tall * L.keyAspect);
        const keyHeight = Math.min(tall, keyWidth) > 0 ? Math.min(tall, keyWidth) : 0;
        if (!best ||
            keyHeight > best.keyHeight + 0.5 ||
            (Math.abs(keyHeight - best.keyHeight) <= 0.5 && keyWidth > best.keyWidth)) {
            best = { columns, rows, keyWidth: Math.max(keyWidth, 0), keyHeight };
        }
    }
    return best ?? { columns: 6, rows: 2, keyWidth: 0, keyHeight: 0 };
}
/**
 * Where everything of a word problem goes on its stage. The background covers
 * the whole stage; the problem is written on a sheet at the left — or at the
 * top, where the stage is tall — and beside it, a gap apart, the answer's
 * place with its unit and the pad of keys under it: two safe areas inside the
 * stage less `insets` and an edge margin. How much room the problem takes is
 * chosen so that its writing and the keys are both as big as they can be,
 * keys too small to hit a small finger's last.
 */
export function layoutWordProblem(stageWidth, stageHeight, config, insets = {}) {
    const L = WORD_PROBLEM_LAYOUT;
    const K = MATH_INPUT_LAYOUT;
    const E = MATH_EQUATION_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.text === "") {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const areaLeft = originX + edge;
    const areaTop = originY + edge;
    const areaWidth = Math.max(usableWidth - edge * 2, 1);
    const areaHeight = Math.max(usableHeight - edge * 2, 1);
    const unitUnits = config.unit === "" ? 0 : textLineUnits(config.unit);
    // The place's width for its height: the digits with a little room either side.
    const answerUnits = config.maxDigits * E.digit + E.pad * 2;
    let best = null;
    const tryArrangement = (arrangement, share) => {
        const slot = arrangement === "side"
            ? { left: areaLeft, top: areaTop, width: areaWidth * share - gap / 2, height: areaHeight }
            : { left: areaLeft, top: areaTop, width: areaWidth, height: areaHeight * share - gap / 2 };
        const column = arrangement === "side"
            ? { left: slot.left + slot.width + gap, top: areaTop, width: areaWidth - slot.width - gap, height: areaHeight }
            : { left: areaLeft, top: slot.top + slot.height + gap, width: areaWidth, height: areaHeight - slot.height - gap };
        if (slot.width <= 0 || slot.height <= 0 || column.width <= 0 || column.height <= 0) {
            return;
        }
        const passage = fitPassage(config.text, slot.width, slot.height);
        if (passage.size <= 0) {
            return;
        }
        // The answer's row as tall as the keys will be, within its bounds and the column's width.
        const rowUnits = (height) => answerUnits * height + (unitUnits > 0 ? L.unitGap + unitUnits * height * L.unitShare : 0);
        let answerHeight = Math.min(L.maxAnswer, Math.max(L.minAnswer, column.height * 0.22));
        answerHeight = Math.min(answerHeight, (column.width - (unitUnits > 0 ? L.unitGap : 0)) / (answerUnits + unitUnits * L.unitShare));
        let grid = fitMathInputKeys(column.width, column.height - answerHeight - L.rowGap);
        answerHeight = Math.max(Math.min(answerHeight, Math.max(L.minAnswer, grid.keyHeight * 1.1)), 1);
        while (rowUnits(answerHeight) > column.width && answerHeight > 12) {
            answerHeight *= 0.92;
        }
        grid = fitMathInputKeys(column.width, column.height - answerHeight - L.rowGap);
        if (grid.keyHeight <= 0) {
            return;
        }
        const keyWidth = grid.keyWidth;
        const keyHeight = grid.keyHeight;
        const padWidth = grid.columns * keyWidth + K.keyGap * (grid.columns - 1);
        const padHeight = grid.rows * keyHeight + K.keyGap * (grid.rows - 1);
        const rowWidth = rowUnits(answerHeight);
        const block = answerHeight + L.rowGap + padHeight;
        // Beside the problem the block stands in the middle of its height; under it, at the top.
        const blockTop = column.top + (arrangement === "side" ? Math.max(0, (column.height - block) / 2) : Math.max(0, (column.height - block) * 0.3));
        const answer = {
            left: column.left + (column.width - rowWidth) / 2,
            top: blockTop,
            width: answerUnits * answerHeight,
            height: answerHeight,
        };
        const unitHeight = answerHeight * L.unitShare;
        const unit = unitUnits > 0
            ? {
                text: config.unit,
                left: answer.left + answer.width + L.unitGap,
                top: answer.top + (answerHeight - unitHeight) / 2,
                width: unitUnits * unitHeight,
                height: unitHeight,
            }
            : null;
        const pad = {
            left: column.left + (column.width - padWidth) / 2,
            top: blockTop + answerHeight + L.rowGap,
            width: padWidth,
            height: padHeight,
        };
        const keys = MATH_INPUT_KEYS.map((key, index) => ({
            key,
            left: pad.left + (index % grid.columns) * (keyWidth + K.keyGap),
            top: pad.top + Math.floor(index / grid.columns) * (keyHeight + K.keyGap),
            width: keyWidth,
            height: keyHeight,
        }));
        const textWidth = Math.max(...passage.lines.map((line) => textLineUnits(line))) * passage.size;
        const sheetWidth = Math.min(slot.width, textWidth + READING_TEXT_LAYOUT.passagePadX * 2 * passage.size);
        const sheetHeight = Math.min(slot.height, (passage.lines.length + READING_TEXT_LAYOUT.passagePadY * 2) * passage.size);
        const sheet = {
            left: slot.left + (slot.width - sheetWidth) / 2,
            top: slot.top + (arrangement === "side" ? (slot.height - sheetHeight) / 2 : slot.height - sheetHeight),
            width: sheetWidth,
            height: sheetHeight,
        };
        const lines = passage.lines.map((text, index) => ({
            text,
            left: sheet.left + READING_TEXT_LAYOUT.passagePadX * passage.size,
            top: sheet.top + READING_TEXT_LAYOUT.passagePadY * passage.size + index * passage.size,
            width: Math.min(textLineUnits(text) * passage.size, sheet.width - READING_TEXT_LAYOUT.passagePadX * 2 * passage.size),
            height: passage.size,
        }));
        // The writing and the keys both as big as they go; keys a small finger cannot hit lose first.
        const score = Math.min(passage.size, keyHeight * 0.6)
            + (keyHeight >= K.minKey ? 0 : -100 + keyHeight)
            + (arrangement === "side" ? 0.25 : 0)
            - passage.lines.length * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { sheet, lines, arrangement, answer, unit, pad, keys } };
        }
    };
    L.sideShares.forEach((share) => tryArrangement("side", share));
    L.stackShares.forEach((share) => tryArrangement("stack", share));
    return best?.layout ?? null;
}
// --- money_pay: pay a price, or give the change, with lari ------------------
//
// Real money of Georgia: coins of 1 to 50 tetri, 1 and 2 lari, and notes of
// 5 to 100 lari, from the library's photographs — or drawn in code where a
// picture is missing. Something to buy stands with its price tag; the child
// taps money out of the purse onto the counter until it holds the price
// exactly. In change mode the buyer has paid already — the piece lies by the
// tag — and what goes on the counter is the change. A piece that takes the
// counter past the sum is a mistake and goes back; one tapped on the counter
// comes back to the purse for nothing. The running total is never shown:
// adding the pieces up is the game.
/** Every piece of money, in tetri: 100 tetri are a lari. */
export const MONEY_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
/** At most this many pieces lie in the purse: more do not fit a phone at a size a finger hits. */
export const MONEY_PAY_PIECES_MAX = 12;
/** The two words of the price, in the three languages: none of them changes with the number. */
export const MONEY_WORDS = {
    ka: { lari: "ლარი", tetri: "თეთრი" },
    ru: { lari: "лари", tetri: "тетри" },
    en: { lari: "lari", tetri: "tetri" },
};
/** A coin up to 2 lari, a note from 5. */
export function moneyPieceKind(value) {
    return value <= 200 ? "coin" : "note";
}
/**
 * A sum as it is said: "3 ლარი 50 თეთრი", "50 тетри", "3 lari", one line a
 * part. The words are the game's language's, Georgian where it has none.
 */
export function formatMoneyLines(tetri, language) {
    const words = MONEY_WORDS[(language in MONEY_WORDS ? language : "ka")];
    const lari = Math.floor(Math.max(0, tetri) / 100);
    const rest = Math.max(0, tetri) % 100;
    const lines = [];
    if (lari > 0) {
        lines.push(`${lari} ${words.lari}`);
    }
    if (rest > 0 || lari === 0) {
        lines.push(`${rest} ${words.tetri}`);
    }
    return lines;
}
/** Whether some of `values` add up to `target` exactly. */
export function moneyPayReachable(values, target) {
    if (!Number.isInteger(target) || target <= 0) {
        return false;
    }
    const sums = new Uint8Array(target + 1);
    sums[0] = 1;
    for (const value of values) {
        for (let sum = target; sum >= value; sum--) {
            if (sums[sum - value]) {
                sums[sum] = 1;
            }
        }
    }
    return sums[target] === 1;
}
function moneyValue(value) {
    const number = extractNumber(value);
    return number !== null && MONEY_DENOMINATIONS.includes(Math.round(number)) ? Math.round(number) : null;
}
/**
 * The game as the players draw it. The purse comes as rows of a piece and
 * how many of it (`pieces: [{ value, count, image }]`, `value` in tetri),
 * and is laid out one entry a piece, at most `MONEY_PAY_PIECES_MAX`. A price
 * the purse cannot make exactly — or change that is none — is no game.
 */
export function normalizeMoneyPayConfig(config) {
    const bg = normalizeBackground(config);
    const price = Math.round(extractNumber(config.price) ?? 0);
    const paidValue = moneyValue(asRecord(config.paid)?.value ?? config.paid);
    const paidImage = extractMediaUrl(asRecord(config.paid)?.image ?? config.paid_image);
    const paid = paidValue !== null
        ? { id: "paid", value: paidValue, kind: moneyPieceKind(paidValue), image: paidImage }
        : null;
    const mode = paid ? "change" : "pay";
    const pieces = [];
    const rows = Array.isArray(config.pieces) ? config.pieces : [];
    rows
        .map((row) => asRecord(row))
        .filter((row) => row !== null)
        .map((row) => ({
        value: moneyValue(row.value),
        count: Math.max(1, Math.floor(extractNumber(row.count) ?? 1)),
        image: extractMediaUrl(row.image),
    }))
        .filter((row) => row.value !== null)
        .sort((a, b) => b.value - a.value)
        .forEach((row) => {
        for (let copy = 0; copy < row.count && pieces.length < MONEY_PAY_PIECES_MAX; copy++) {
            pieces.push({ id: `piece-${row.value}-${copy + 1}`, value: row.value, kind: moneyPieceKind(row.value), image: row.image });
        }
    });
    const wanted = mode === "change" && paid ? paid.value - price : price;
    const target = price > 0 && moneyPayReachable(pieces.map((piece) => piece.value), wanted) ? wanted : -1;
    const itemImage = extractMediaUrl(config.item_image);
    const language = extractText(config.language) ?? "ka";
    const uris = [bg, itemImage, paid?.image ?? null, ...pieces.map((piece) => piece.image)]
        .filter((uri) => typeof uri === "string" && uri !== "");
    return {
        mode,
        price,
        paid,
        target,
        item_image: itemImage,
        pieces,
        language,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set(uris)],
    };
}
/**
 * What a tap on a piece does, given what lies on the counter (`onCounter`,
 * in the order it was put there): the whole play rule, so both players follow
 * it tap for tap.
 */
export function resolveMoneyPayTap(config, onCounter, pieceId) {
    const piece = config.pieces.find((candidate) => candidate.id === pieceId);
    if (!piece || config.target <= 0) {
        return { type: "ignored" };
    }
    const values = new Map(config.pieces.map((candidate) => [candidate.id, candidate.value]));
    const total = onCounter.reduce((sum, id) => sum + (values.get(id) ?? 0), 0);
    if (onCounter.includes(pieceId)) {
        return { type: "returned", total: total - piece.value };
    }
    const next = total + piece.value;
    if (next > config.target) {
        return { type: "over", total };
    }
    return next === config.target ? { type: "right", total: next } : { type: "placed", total: next };
}
/** Proportions of the money game. */
export const MONEY_PAY_LAYOUT = {
    /** The shop's share of the width, at the left, when the counter and the purse stand beside it, tried in turn. */
    sideShares: [0.26, 0.3, 0.36, 0.42],
    /** Its share of the height, at the top, when they stand under it. */
    stackShares: [0.3, 0.38],
    /** The counter's share of the room beside the shop, tried in turn; the purse has the rest. */
    counterShares: [0.36, 0.44, 0.52],
    /** A note is this many times as wide as a coin, and as tall. */
    noteAspect: 2,
    /** Between pieces, as a share of a coin. */
    pieceGap: 0.16,
    /** A coin is never bigger than this, in px, nor smaller than a finger hits. */
    maxCoin: 96,
    minCoin: 40,
    /** The thing bought, as a share of the shop's height, and the tag's lines under it. */
    itemShare: 0.56,
    tagLine: 0.15,
    maxTagLine: 44,
    /** A price smaller than this, in px, is not read at a glance. */
    minTagLine: 20,
    /** Inside the counter, as a share of a coin, around its pieces. */
    counterPad: 0.2,
};
function moneyPieceSize(kind, coin) {
    return kind === "note" ? { width: coin * MONEY_PAY_LAYOUT.noteAspect, height: coin } : { width: coin, height: coin };
}
/**
 * Pieces in rows inside `box`, left to right, each row in the middle of the
 * box's width and the rows in the middle of its height; null when they do not
 * all fit.
 */
function flowMoneyPieces(pieces, box, coin) {
    const gap = coin * MONEY_PAY_LAYOUT.pieceGap;
    const rows = [];
    for (const piece of pieces) {
        const size = moneyPieceSize(piece.kind, coin);
        if (size.width > box.width) {
            return null;
        }
        const row = rows[rows.length - 1];
        if (row && row.width + gap + size.width <= box.width + 1e-6) {
            row.items.push({ id: piece.id, ...size });
            row.width += gap + size.width;
        }
        else {
            rows.push({ items: [{ id: piece.id, ...size }], width: size.width });
        }
    }
    const height = rows.length * coin + Math.max(0, rows.length - 1) * gap;
    if (height > box.height + 1e-6) {
        return null;
    }
    const places = {};
    rows.forEach((row, index) => {
        let left = box.left + (box.width - row.width) / 2;
        const top = box.top + (box.height - height) / 2 + index * (coin + gap);
        row.items.forEach((item) => {
            places[item.id] = { left, top, width: item.width, height: item.height };
            left += item.width + gap;
        });
    });
    return places;
}
/**
 * Where the pieces on the counter lie, in the order they were put there: in
 * rows, as in the purse, at the purse's size — the layout chose a size at
 * which every piece fits there, in any order.
 */
export function moneyPayCounterPlaces(layout, pieces) {
    const inner = insetRect(layout.counter, layout.coin * MONEY_PAY_LAYOUT.counterPad);
    return flowMoneyPieces(pieces, inner, layout.coin) ?? flowMoneyPieces(pieces, layout.counter, layout.coin * 0.8) ?? {};
}
/**
 * The fullest the counter can get: for every number of notes on it, those
 * notes and as many coins as still keep it within `target` (the cheapest
 * first, so the most pieces), each in the three orders that need the most
 * rows. With nothing to make, the whole purse.
 */
function moneyPayCounterWorstCases(pieces, target) {
    const notes = pieces.filter((piece) => piece.kind === "note").sort((a, b) => a.value - b.value);
    const coins = pieces.filter((piece) => piece.kind === "coin").sort((a, b) => a.value - b.value);
    const sets = [];
    for (let noteCount = 0; noteCount <= notes.length; noteCount++) {
        const chosen = notes.slice(0, noteCount);
        let sum = chosen.reduce((total, piece) => total + piece.value, 0);
        if (target > 0 && sum > target) {
            break;
        }
        for (const coin of coins) {
            if (target > 0 && sum + coin.value > target) {
                break;
            }
            chosen.push(coin);
            sum += coin.value;
        }
        sets.push(chosen);
    }
    return sets.flatMap((set) => {
        const setNotes = set.filter((piece) => piece.kind === "note");
        const setCoins = set.filter((piece) => piece.kind === "coin");
        const turns = [];
        for (let index = 0; index < Math.max(setNotes.length, setCoins.length); index++) {
            if (setNotes[index])
                turns.push(setNotes[index]);
            if (setCoins[index])
                turns.push(setCoins[index]);
        }
        return [[...setNotes, ...setCoins], [...setCoins, ...setNotes], turns];
    });
}
function insetRect(rect, by) {
    return { left: rect.left + by, top: rect.top + by, width: Math.max(rect.width - by * 2, 1), height: Math.max(rect.height - by * 2, 1) };
}
/**
 * Where everything of the money game goes. The background covers the stage;
 * the shop — what is bought, its tag, and in change mode what was paid —
 * stands at the left (at the top, where the stage is tall), and beside it the
 * counter over the purse. One size of coin for the whole game, the biggest at
 * which the purse holds every piece and the counter would too, whatever the
 * order they are put on it.
 */
export function layoutMoneyPay(stageWidth, stageHeight, config, insets = {}) {
    const L = MONEY_PAY_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.pieces.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const lines = formatMoneyLines(config.price, config.language);
    const lineUnits = Math.max(...lines.map((line) => textLineUnits(line)));
    // The counter only ever holds pieces worth no more than the sum: the most
    // of them there can be, with as many notes as fit in it, in the orders
    // that need the most rows — notes first, coins first, and taking turns.
    const orders = moneyPayCounterWorstCases(config.pieces, config.target);
    let best = null;
    const tryArrangement = (arrangement, share, counterShare) => {
        const shop = arrangement === "side"
            ? { left: area.left, top: area.top, width: area.width * share - gap / 2, height: area.height }
            : { left: area.left, top: area.top, width: area.width, height: area.height * share - gap / 2 };
        const rest = arrangement === "side"
            ? { left: shop.left + shop.width + gap, top: area.top, width: area.width - shop.width - gap, height: area.height }
            : { left: area.left, top: shop.top + shop.height + gap, width: area.width, height: area.height - shop.height - gap };
        if (shop.width <= 0 || shop.height <= 0 || rest.width <= 0 || rest.height <= 0) {
            return;
        }
        const counter = { left: rest.left, top: rest.top, width: rest.width, height: rest.height * counterShare - gap / 2 };
        const purse = { left: rest.left, top: counter.top + counter.height + gap, width: rest.width, height: rest.height - counter.height - gap };
        // The biggest coin at which everything fits, found by halving.
        const fits = (coin) => flowMoneyPieces(config.pieces, purse, coin) !== null
            && orders.every((order) => flowMoneyPieces(order, insetRect(counter, coin * L.counterPad), coin) !== null);
        let low = 0;
        let high = L.maxCoin;
        for (let step = 0; step < 18; step++) {
            const middle = (low + high) / 2;
            if (fits(middle))
                low = middle;
            else
                high = middle;
        }
        const coin = low;
        if (coin <= 1) {
            return;
        }
        // The shop: the thing bought over its tag, and the paid piece under the tag.
        const paidSize = config.paid ? moneyPieceSize(config.paid.kind, Math.min(coin, shop.height * 0.22)) : null;
        const tagLine = Math.min(L.maxTagLine, shop.height * L.tagLine, (shop.width * 0.9) / (lineUnits + 0.6));
        const tag = { left: 0, top: 0, width: lineUnits * tagLine + tagLine * 0.6, height: lines.length * tagLine + tagLine * 0.5 };
        const room = shop.height - tag.height - (paidSize ? paidSize.height + gap * 0.6 : 0) - gap * 0.6;
        const itemSize = config.item_image ? Math.max(0, Math.min(shop.width * 0.9, shop.height * L.itemShare, room)) : 0;
        const column = itemSize + (itemSize > 0 ? gap * 0.6 : 0) + tag.height + (paidSize ? gap * 0.6 + paidSize.height : 0);
        let top = shop.top + Math.max(0, (shop.height - column) / 2);
        const item = itemSize > 0
            ? { left: shop.left + (shop.width - itemSize) / 2, top, width: itemSize, height: itemSize }
            : null;
        top += itemSize > 0 ? itemSize + gap * 0.6 : 0;
        tag.left = shop.left + (shop.width - tag.width) / 2;
        tag.top = top;
        const tagLines = lines.map((text, index) => ({
            text,
            left: tag.left + tagLine * 0.3,
            top: tag.top + tagLine * 0.25 + index * tagLine,
            width: textLineUnits(text) * tagLine,
            height: tagLine,
        }));
        top += tag.height + gap * 0.6;
        const paid = paidSize
            ? { left: shop.left + (shop.width - paidSize.width) / 2, top, width: paidSize.width, height: paidSize.height }
            : null;
        const homes = flowMoneyPieces(config.pieces, purse, coin) ?? {};
        // Coins as big as they go, and a price that can be read: a tag under
        // `minTagLine` or a coin under `minCoin` loses to any layout without one.
        const score = Math.min(coin, tagLine * 2)
            + (tagLine >= L.minTagLine ? 0 : -200 + tagLine)
            + (coin >= L.minCoin ? 0 : -100 + coin)
            + coin * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { arrangement, item, tag, tagLines, paid, counter, purse, coin, homes } };
        }
    };
    L.counterShares.forEach((counterShare) => {
        L.sideShares.forEach((share) => tryArrangement("side", share, counterShare));
        L.stackShares.forEach((share) => tryArrangement("stack", share, counterShare));
    });
    return best?.layout ?? null;
}
// --- clock_set: set the hands of a clock, or read one ------------------------
//
// A clock face drawn in code, as the digits are. Set: a time is written
// ("7:30") and the child sets the hands — a tap on a number of the dial moves
// the hand that glows, the short one first and then the long one, by turns —
// and presses the tick. Read: the clock shows a time and the child taps the
// right one of three or four times written under it. Minutes go by five, as
// the dial's numbers do.
/** Minutes go by this much: one number of the dial. */
export const CLOCK_MINUTE_STEP = 5;
/** A time as it is written: "7:30", "12:05". */
export function clockTimeLabel(time) {
    return `${time.hour}:${String(time.minute).padStart(2, "0")}`;
}
/**
 * Where the hands point, in degrees clockwise from 12. The short hand moves
 * on with the minutes, as a real one does: at 7:30 it is half way to 8.
 */
export function clockHandAngles(time) {
    return {
        hour: ((time.hour % 12) + time.minute / 60) * 30,
        minute: (time.minute % 60) * 6,
    };
}
/** A time from "7:30", { hour, minute } or the hour and minute apart; null when it is no time of the dial. */
function readClockTime(value, minuteValue) {
    let hour = null;
    let minute = null;
    const record = asRecord(value);
    if (typeof value === "string" && /^\s*\d{1,2}\s*:\s*\d{1,2}\s*$/.test(value)) {
        const [h, m] = value.split(":").map((part) => Number(part.trim()));
        hour = h;
        minute = m;
    }
    else if (record) {
        hour = extractNumber(record.hour);
        minute = extractNumber(record.minute) ?? 0;
    }
    else {
        hour = extractNumber(value);
        minute = extractNumber(minuteValue) ?? 0;
    }
    if (hour === null || minute === null || !Number.isInteger(hour) || !Number.isInteger(minute)) {
        return null;
    }
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    if (hour < 0 || hour > 24 || minute < 0 || minute > 59 || minute % CLOCK_MINUTE_STEP !== 0) {
        return null;
    }
    return { hour: twelve, minute };
}
function sameClockTime(a, b) {
    return a.hour === b.hour && a.minute === b.minute;
}
/**
 * Wrong times a child mistakes for `time`, the likeliest first: the hands
 * read the other way round (7:30 → 6:35), the hour before and after, a
 * quarter either side, and the half hour.
 */
export function clockConfusions(time) {
    const wrap = (hour) => ((hour - 1 + 120) % 12) + 1;
    const swapped = readClockTime(time.minute === 0 ? 12 : time.minute / 5, ((time.hour % 12) * 5) % 60);
    const candidates = [
        swapped,
        { hour: wrap(time.hour + 1), minute: time.minute },
        { hour: wrap(time.hour - 1), minute: time.minute },
        { hour: time.hour, minute: (time.minute + 15) % 60 },
        { hour: time.hour, minute: (time.minute + 45) % 60 },
        { hour: time.hour, minute: (time.minute + 30) % 60 },
    ];
    const seen = [];
    for (const candidate of candidates) {
        if (candidate && !sameClockTime(candidate, time) && !seen.some((other) => sameClockTime(other, candidate))) {
            seen.push(candidate);
        }
    }
    return seen;
}
/** How many times a read game offers, the right one with them. */
export const CLOCK_READ_OPTIONS = { min: 3, max: 4 };
/**
 * The game as the players draw it. The time is `time` ("7:30") or `hour` and
 * `minute`, its minutes by five; read mode takes its wrong times from `wrong`
 * ("6:35" or { hour, minute }) and makes up the ones missing from
 * `clockConfusions`, three or four times in all, mixed.
 */
export function normalizeClockSetConfig(config) {
    const bg = normalizeBackground(config);
    const time = readClockTime(config.time ?? config.hour, config.minute);
    const mode = extractText(config.mode) === "read" ? "read" : "set";
    let options = [];
    if (mode === "read" && time) {
        const wrong = [];
        const add = (entry) => {
            if (entry && !sameClockTime(entry, time) && !wrong.some((other) => sameClockTime(other, entry))) {
                wrong.push(entry);
            }
        };
        (Array.isArray(config.wrong) ? config.wrong : []).forEach((item) => add(readClockTime(item)));
        // As many as were written, within three and four in all; the ones missing are made up.
        const count = Math.min(CLOCK_READ_OPTIONS.max, Math.max(CLOCK_READ_OPTIONS.min, wrong.length + 1));
        clockConfusions(time).forEach(add);
        options = shuffle([time, ...wrong.slice(0, count - 1)].map((entry) => ({
            id: `time-${entry.hour}-${String(entry.minute).padStart(2, "0")}`,
            time: entry,
            label: clockTimeLabel(entry),
        })));
    }
    return {
        mode,
        time,
        options,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/** Set mode: what the tick does with the hands as they stand. Nothing until both are set. */
export function resolveClockSetCheck(config, hands) {
    if (!config.time || hands.hour === null || hands.minute === null) {
        return { type: "ignored" };
    }
    return hands.hour === config.time.hour && hands.minute === config.time.minute ? { type: "right" } : { type: "wrong" };
}
/** Read mode: what a tap on a written time does. */
export function resolveClockReadTap(config, optionId) {
    const option = config.options.find((candidate) => candidate.id === optionId);
    if (!option || !config.time) {
        return { type: "ignored" };
    }
    return sameClockTime(option.time, config.time) ? { type: "right" } : { type: "wrong" };
}
/**
 * Set mode: the hand a tap on the dial's number `n` (1–12) moves, and what it
 * then shows. The short hand takes the hour, the long one the minutes the
 * number stands for (3 is :15, 12 is :00); the other hand glows next.
 */
export function pressClockNumber(hands, n) {
    if (!Number.isInteger(n) || n < 1 || n > 12) {
        return hands;
    }
    return hands.active === "hour"
        ? { ...hands, hour: n, active: "minute" }
        : { ...hands, minute: (n % 12) * CLOCK_MINUTE_STEP, active: "hour" };
}
/** Proportions of the clock game. */
export const CLOCK_SET_LAYOUT = {
    /** The clock's share of the width when the rest stands beside it, tried in turn. */
    sideShares: [0.5, 0.56, 0.62],
    /** Its share of the height when the rest stands under it. */
    stackShares: [0.55, 0.62],
    /** The dial's numbers: their middle at this share of the radius, this tall. */
    numberRadius: 0.66,
    numberHeight: 0.17,
    /** A number's place to tap: a circle this share of the radius across, round its middle. */
    zoneShare: 0.4,
    /** The written time and the cards of read mode: a line this tall, within these. */
    minLine: 26,
    maxLine: 64,
    /** Around the written time on its card, as shares of its line. */
    cardPadX: 0.35,
    cardPadY: 0.2,
    /** The tick under the written time, as tall as this share of the line, within the key sizes. */
    checkShare: 1.4,
    /** Between the cards of read mode, as a share of a card. */
    cardGap: 0.18,
};
/**
 * Where everything of the clock game goes. The background covers the stage;
 * the clock stands as big as it can at the left (at the top on a tall
 * stage), and beside it the written time with its tick, or the cards to pick
 * from — two safe areas, apart, inside the stage less `insets`.
 */
export function layoutClockSet(stageWidth, stageHeight, config, insets = {}) {
    const L = CLOCK_SET_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || !config.time) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const labels = config.mode === "read" ? config.options.map((option) => option.label) : [clockTimeLabel(config.time)];
    const units = Math.max(...labels.map((label) => textLineUnits(label)));
    let best = null;
    const tryArrangement = (arrangement, share, columns) => {
        const slot = arrangement === "side"
            ? { left: area.left, top: area.top, width: area.width * share - gap / 2, height: area.height }
            : { left: area.left, top: area.top, width: area.width, height: area.height * share - gap / 2 };
        const rest = arrangement === "side"
            ? { left: slot.left + slot.width + gap, top: area.top, width: area.width - slot.width - gap, height: area.height }
            : { left: area.left, top: slot.top + slot.height + gap, width: area.width, height: area.height - slot.height - gap };
        if (slot.width <= 0 || slot.height <= 0 || rest.width <= 0 || rest.height <= 0) {
            return;
        }
        const size = Math.min(slot.width, slot.height);
        const clock = {
            left: slot.left + (slot.width - size) / 2,
            top: slot.top + (slot.height - size) / 2,
            width: size,
            height: size,
        };
        const radius = size / 2;
        const middle = { x: clock.left + radius, y: clock.top + radius };
        const numbers = Array.from({ length: 12 }, (_unused, index) => {
            const n = index + 1;
            const angle = (n * 30 * Math.PI) / 180;
            const x = middle.x + Math.sin(angle) * radius * L.numberRadius;
            const y = middle.y - Math.cos(angle) * radius * L.numberRadius;
            const glyphHeight = radius * L.numberHeight;
            const glyphWidth = glyphHeight * (n >= 10 ? 1.25 : 0.7);
            const zone = radius * L.zoneShare;
            return {
                n,
                glyph: { left: x - glyphWidth / 2, top: y - glyphHeight / 2, width: glyphWidth, height: glyphHeight },
                zone: { left: x - zone / 2, top: y - zone / 2, width: zone, height: zone },
            };
        });
        let target = null;
        let targetCard = null;
        let check = null;
        let options = [];
        let line = 0;
        if (config.mode === "set") {
            // The written time on its card, over its tick, in the middle of the room left.
            const padX = L.cardPadX;
            const padY = L.cardPadY;
            line = Math.min(L.maxLine, rest.width / (units + padX * 2), rest.height / (1 + padY * 2 + L.checkShare + 0.6));
            const keyHeight = Math.min(MATH_INPUT_LAYOUT.maxKey, Math.max(MATH_INPUT_LAYOUT.minKey, line * L.checkShare));
            const cardHeight = line * (1 + padY * 2);
            const block = cardHeight + gap * 0.6 + keyHeight;
            const top = rest.top + Math.max(0, (rest.height - block) / 2);
            const width = units * line;
            targetCard = { left: rest.left + (rest.width - width) / 2 - line * padX, top, width: width + line * padX * 2, height: cardHeight };
            target = { text: labels[0], left: targetCard.left + line * padX, top: top + line * padY, width, height: line };
            check = {
                left: rest.left + (rest.width - keyHeight * MATH_INPUT_LAYOUT.keyAspect) / 2,
                top: top + cardHeight + gap * 0.6,
                width: keyHeight * MATH_INPUT_LAYOUT.keyAspect,
                height: keyHeight,
            };
            if (check.top + check.height > rest.top + rest.height + 1e-6 || check.width > rest.width) {
                return;
            }
        }
        else {
            // The cards in a grid of `columns`, in the middle of the room left.
            const count = Math.max(config.options.length, 1);
            const rows = Math.ceil(count / columns);
            const cardGap = gap * 0.6;
            const cardPad = 0.9;
            const across = (rest.width - (columns - 1) * cardGap) / columns;
            const down = (rest.height - (rows - 1) * cardGap) / rows;
            line = Math.min(L.maxLine, across / (units + cardPad), down / (1 + cardPad));
            const cardWidth = Math.min(across, (units + cardPad) * line * 1.3);
            const cardHeight = Math.min(down, line * (1 + cardPad));
            const gridWidth = columns * cardWidth + (columns - 1) * cardGap;
            const gridHeight = rows * cardHeight + (rows - 1) * cardGap;
            options = config.options.map((option, index) => {
                const left = rest.left + (rest.width - gridWidth) / 2 + (index % columns) * (cardWidth + cardGap);
                const top = rest.top + (rest.height - gridHeight) / 2 + Math.floor(index / columns) * (cardHeight + cardGap);
                const width = textLineUnits(option.label) * line;
                return {
                    id: option.id,
                    left,
                    top,
                    width: cardWidth,
                    height: cardHeight,
                    line: { text: option.label, left: left + (cardWidth - width) / 2, top: top + (cardHeight - line) / 2, width, height: line },
                };
            });
        }
        // The clock as big as it goes, and the writing readable: a line under `minLine` loses.
        const score = Math.min(size / 6, line) + (line >= L.minLine ? 0 : -100 + line) + size * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { arrangement, clock, numbers, target, targetCard, check, options } };
        }
    };
    // The cards one under the other or two by two beside the clock; in a row, or two rows, under it.
    const count = Math.max(config.options.length, 1);
    const sideColumns = config.mode === "read" ? [1, 2] : [1];
    const stackColumns = config.mode === "read" ? [count, Math.ceil(count / 2)] : [1];
    L.sideShares.forEach((share) => sideColumns.forEach((columns) => tryArrangement("side", share, columns)));
    L.stackShares.forEach((share) => stackColumns.forEach((columns) => tryArrangement("stack", share, columns)));
    return best?.layout ?? null;
}
// --- fraction_pick: shade a fraction of a shape, or pick the shape that shows it
//
// A circle or a bar cut into equal parts, drawn in code. Shade: the fraction
// is written ("3 over 4") and the child taps parts to shade them — any of
// them, as many as the top number says — and presses the tick. Pick: three or
// four shapes, each with some parts shaded, and the child taps the one that
// shows the fraction written. No other shape offered shows the same amount:
// 2/4 is never beside 1/2.
/** A shape is cut into this many parts at least, and at most. */
export const FRACTION_PARTS = { min: 2, max: 12 };
/** A fraction from "3/4", { shaded, parts } or the two numbers; null when it is no fraction a shape shows. */
export function readFraction(value, partsValue) {
    let shaded = null;
    let parts = null;
    const record = asRecord(value);
    if (typeof value === "string" && /^\s*\d+\s*\/\s*\d+\s*$/.test(value)) {
        [shaded, parts] = value.split("/").map((part) => Number(part.trim()));
    }
    else if (record) {
        shaded = extractNumber(record.shaded ?? record.numerator);
        parts = extractNumber(record.parts ?? record.denominator);
    }
    else {
        shaded = extractNumber(value);
        parts = extractNumber(partsValue);
    }
    if (shaded === null || parts === null || !Number.isInteger(shaded) || !Number.isInteger(parts)) {
        return null;
    }
    if (parts < FRACTION_PARTS.min || parts > FRACTION_PARTS.max || shaded < 1 || shaded > parts) {
        return null;
    }
    return { shaded, parts };
}
/** Whether two fractions are the same amount: 2/4 and 1/2 are. */
export function sameFractionValue(a, b) {
    return a.shaded * b.parts === b.shaded * a.parts;
}
/**
 * Wrong fractions a child mistakes for `fraction`, the likeliest first: the
 * part left unshaded (3/4 → 1/4), one part more or fewer, the same top number
 * of a whole cut otherwise (1/3 → 1/4) — none of them the same amount, and
 * never the whole shape.
 */
export function fractionConfusions(fraction) {
    const { shaded, parts } = fraction;
    const candidates = [
        readFraction(parts - shaded, parts),
        readFraction(shaded + 1, parts),
        readFraction(shaded - 1, parts),
        readFraction(shaded, parts + 1),
        readFraction(shaded, parts - 1),
        readFraction(shaded + 2, parts),
        readFraction(1, parts === 2 ? 4 : 2),
    ];
    const seen = [];
    for (const candidate of candidates) {
        // The whole shaded is no fraction to tell apart.
        if (candidate && candidate.shaded < candidate.parts && !sameFractionValue(candidate, fraction) && !seen.some((other) => sameFractionValue(other, candidate))) {
            seen.push(candidate);
        }
    }
    return seen;
}
/** How many shapes a pick game offers, the right one with them. */
export const FRACTION_PICK_OPTIONS = { min: 3, max: 4 };
/**
 * The game as the players draw it. The fraction is `fraction` ("3/4") or
 * `shaded` and `parts`; pick mode takes its wrong fractions from `wrong`
 * ("1/4" or { shaded, parts }) and makes up the ones missing from
 * `fractionConfusions`, three or four shapes in all, mixed. A wrong one of
 * the same amount as the right one is left out.
 */
export function normalizeFractionPickConfig(config) {
    const bg = normalizeBackground(config);
    const fraction = readFraction(config.fraction ?? config.shaded, config.parts);
    const mode = extractText(config.mode) === "pick" ? "pick" : "shade";
    const shape = extractText(config.shape) === "bar" ? "bar" : "circle";
    let options = [];
    if (mode === "pick" && fraction) {
        const wrong = [];
        const add = (entry) => {
            if (entry && !sameFractionValue(entry, fraction) && !wrong.some((other) => sameFractionValue(other, entry))) {
                wrong.push(entry);
            }
        };
        (Array.isArray(config.wrong) ? config.wrong : []).forEach((item) => add(readFraction(item)));
        // As many as were written, within three and four in all; the ones missing are made up.
        const count = Math.min(FRACTION_PICK_OPTIONS.max, Math.max(FRACTION_PICK_OPTIONS.min, wrong.length + 1));
        fractionConfusions(fraction).forEach(add);
        options = shuffle([fraction, ...wrong.slice(0, count - 1)].map((entry) => ({ id: `fraction-${entry.shaded}-${entry.parts}`, fraction: entry })));
    }
    return {
        mode,
        shape,
        fraction,
        options,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/** Shade mode: a part tapped is shaded, or unshaded when it was. */
export function toggleFractionPart(shaded, index, parts) {
    if (!Number.isInteger(index) || index < 0 || index >= parts) {
        return [...shaded];
    }
    return shaded.includes(index) ? shaded.filter((part) => part !== index) : [...shaded, index].sort((a, b) => a - b);
}
/** Shade mode: what the tick does — right when as many parts are shaded as the top number says. Nothing before one is. */
export function resolveFractionShadeCheck(config, shaded) {
    if (!config.fraction || shaded.length === 0) {
        return { type: "ignored" };
    }
    return shaded.length === config.fraction.shaded ? { type: "right" } : { type: "wrong" };
}
/** Pick mode: what a tap on a shape does. */
export function resolveFractionPickTap(config, optionId) {
    const option = config.options.find((candidate) => candidate.id === optionId);
    if (!option || !config.fraction) {
        return { type: "ignored" };
    }
    return sameFractionValue(option.fraction, config.fraction) ? { type: "right" } : { type: "wrong" };
}
/** A shape's own box: a circle in 100 × 100, a bar in 300 × 100. */
export function fractionShapeViewBox(shape) {
    return shape === "bar" ? { width: 300, height: 100 } : { width: 100, height: 100 };
}
/**
 * The parts of a shape as SVG paths in its own box (`fractionShapeViewBox`):
 * a circle's slices from the top clockwise, a bar's from the left. Both
 * players draw these and nothing else, so a part is the same on both.
 */
export function fractionPartPaths(shape, parts) {
    const count = Math.max(1, Math.min(FRACTION_PARTS.max, Math.floor(parts)));
    const round = (value) => Math.round(value * 100) / 100;
    if (shape === "bar") {
        const left = 4;
        const width = 292 / count;
        return Array.from({ length: count }, (_unused, index) => {
            const x = round(left + index * width);
            return `M${x} 4H${round(x + width)}V96H${x}Z`;
        });
    }
    if (count === 1) {
        return ["M50 4A46 46 0 1 1 49.99 4Z"];
    }
    const point = (step) => {
        const angle = (step / count) * Math.PI * 2;
        return `${round(50 + Math.sin(angle) * 46)} ${round(50 - Math.cos(angle) * 46)}`;
    };
    return Array.from({ length: count }, (_unused, index) => `M50 50L${point(index)}A46 46 0 0 1 ${point(index + 1)}Z`);
}
/**
 * Which part of a shape a point falls in, the point given as shares of the
 * shape's box (0 to 1 across and down); -1 outside the drawing. A player that
 * takes a tap on the whole shape asks this, so the parts are the same as
 * `fractionPartPaths` draws them.
 */
export function fractionPartAt(shape, parts, across, down) {
    const count = Math.max(1, Math.min(FRACTION_PARTS.max, Math.floor(parts)));
    const view = fractionShapeViewBox(shape);
    const x = across * view.width;
    const y = down * view.height;
    if (shape === "bar") {
        if (x < 4 || x > 296 || y < 4 || y > 96) {
            return -1;
        }
        return Math.min(count - 1, Math.floor(((x - 4) / 292) * count));
    }
    const dx = x - 50;
    const dy = y - 50;
    if (Math.hypot(dx, dy) > 46) {
        return -1;
    }
    // Clockwise from the top, as the slices are cut.
    const turn = (Math.atan2(dx, -dy) / (Math.PI * 2) + 1) % 1;
    return Math.min(count - 1, Math.floor(turn * count));
}
/** Proportions of the fraction game. */
export const FRACTION_PICK_LAYOUT = {
    /** The shape's share of the width (shade) or the fraction's column (pick), tried in turn. */
    sideShares: [0.56, 0.64, 0.72],
    stackShares: [0.55, 0.64],
    /** The written fraction: a number this tall within these, in px. */
    minNumber: 28,
    maxNumber: 70,
    /** The tick under the fraction, as tall as this share of a number, within the key sizes. */
    checkShare: 1.2,
    /** Between the shapes of pick mode, as a share of a shape's height. */
    optionGap: 0.16,
    /** A part tapped in shade mode is never thinner than this, in px, at its widest. */
    minPart: 40,
};
function placeFractionCard(area, number, fraction) {
    const digits = Math.max(String(fraction.shaded).length, String(fraction.parts).length);
    const numberWidth = number * MATH_EQUATION_LAYOUT.digit * digits;
    const barHeight = Math.max(4, number * 0.1);
    const padX = number * 0.4;
    const padY = number * 0.25;
    const cardWidth = numberWidth + padX * 2;
    const cardHeight = number * 2 + barHeight + number * 0.3 + padY * 2;
    const card = {
        left: area.left + (area.width - cardWidth) / 2,
        top: area.top + (area.height - cardHeight) / 2,
        width: cardWidth,
        height: cardHeight,
    };
    const left = card.left + padX;
    const top = { left, top: card.top + padY, width: numberWidth, height: number };
    const bar = { left: left - number * 0.1, top: top.top + number + number * 0.15, width: numberWidth + number * 0.2, height: barHeight };
    const bottom = { left, top: bar.top + barHeight + number * 0.15, width: numberWidth, height: number };
    return { card, top, bar, bottom };
}
/**
 * Where everything of the fraction game goes. The background covers the
 * stage. Shade: the shape as big as it can be, and beside it the written
 * fraction with its tick. Pick: the written fraction at the left (the top on
 * a tall stage) and the shapes to pick from beside it, in a row or two by
 * two. Two safe areas, apart, inside the stage less `insets`.
 */
export function layoutFractionPick(stageWidth, stageHeight, config, insets = {}) {
    const L = FRACTION_PICK_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    const fraction = config.fraction;
    if (usableWidth <= 0 || usableHeight <= 0 || !fraction) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const view = fractionShapeViewBox(config.shape);
    const aspect = view.width / view.height;
    const digits = Math.max(String(fraction.shaded).length, String(fraction.parts).length);
    // The card's width and height for a number 1 px tall (see placeFractionCard).
    const cardUnitsX = MATH_EQUATION_LAYOUT.digit * digits + 0.8;
    const cardUnitsY = 2 + 0.1 + 0.3 + 0.5;
    let best = null;
    const fit = (box, ratio) => {
        const width = Math.min(box.width, box.height * ratio);
        const height = width / ratio;
        return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
    };
    const tryArrangement = (arrangement, share, columns) => {
        const first = arrangement === "side"
            ? { left: area.left, top: area.top, width: area.width * share - gap / 2, height: area.height }
            : { left: area.left, top: area.top, width: area.width, height: area.height * share - gap / 2 };
        const second = arrangement === "side"
            ? { left: first.left + first.width + gap, top: area.top, width: area.width - first.width - gap, height: area.height }
            : { left: area.left, top: first.top + first.height + gap, width: area.width, height: area.height - first.height - gap };
        if (first.width <= 0 || first.height <= 0 || second.width <= 0 || second.height <= 0) {
            return;
        }
        if (config.mode === "shade") {
            // The shape in the first room; the fraction over its tick in the second.
            const shape = fit(first, aspect);
            const keyFor = (number) => Math.min(MATH_INPUT_LAYOUT.maxKey, Math.max(MATH_INPUT_LAYOUT.minKey, number * L.checkShare));
            let number = Math.min(L.maxNumber, second.width / cardUnitsX, second.height / (cardUnitsY + L.checkShare + 0.4));
            while (number > 8 && number * cardUnitsY + gap * 0.6 + keyFor(number) > second.height) {
                number *= 0.94;
            }
            const keyHeight = keyFor(number);
            const block = number * cardUnitsY + gap * 0.6 + keyHeight;
            const column = { left: second.left, top: second.top + Math.max(0, (second.height - block) / 2), width: second.width, height: number * cardUnitsY };
            const card = placeFractionCard(column, number, fraction);
            const check = {
                left: second.left + (second.width - keyHeight * MATH_INPUT_LAYOUT.keyAspect) / 2,
                top: card.card.top + card.card.height + gap * 0.6,
                width: keyHeight * MATH_INPUT_LAYOUT.keyAspect,
                height: keyHeight,
            };
            if (check.top + check.height > second.top + second.height + 1e-6 || check.width > second.width) {
                return;
            }
            // A part as wide as a finger: a circle's slice at its rim, a bar's strip.
            const partWidth = config.shape === "bar" ? (shape.width * 292) / 300 / fraction.parts : (Math.PI * shape.width * 0.92) / fraction.parts;
            const score = Math.min(shape.height / 3, number) + (number >= L.minNumber ? 0 : -100 + number)
                + (partWidth >= L.minPart ? 0 : -50 + partWidth / 10) + shape.height * 1e-3;
            if (!best || score > best.score + 1e-9) {
                best = { score, layout: { arrangement, fraction: card, shape, check, options: [] } };
            }
            return;
        }
        // Pick: the fraction in the first room — a narrow one — and the shapes in the second.
        const number = Math.min(L.maxNumber, first.width / cardUnitsX, first.height / cardUnitsY);
        const card = placeFractionCard(first, number, fraction);
        const count = Math.max(config.options.length, 1);
        const rows = Math.ceil(count / columns);
        const cellWidth = (second.width - (columns - 1) * gap * 0.6) / columns;
        const cellHeight = (second.height - (rows - 1) * gap * 0.6) / rows;
        const one = fit({ left: 0, top: 0, width: cellWidth, height: cellHeight }, aspect);
        const gridWidth = columns * one.width + (columns - 1) * gap * 0.6;
        const gridHeight = rows * one.height + (rows - 1) * gap * 0.6;
        const options = config.options.map((option, index) => ({
            id: option.id,
            left: second.left + (second.width - gridWidth) / 2 + (index % columns) * (one.width + gap * 0.6),
            top: second.top + (second.height - gridHeight) / 2 + Math.floor(index / columns) * (one.height + gap * 0.6),
            width: one.width,
            height: one.height,
        }));
        const score = Math.min(one.height, number * 2) + (number >= L.minNumber ? 0 : -100 + number) + one.height * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { arrangement, fraction: card, shape: null, check: null, options } };
        }
    };
    const count = Math.max(config.options.length, 1);
    if (config.mode === "shade") {
        L.sideShares.forEach((share) => tryArrangement("side", share, 1));
        L.stackShares.forEach((share) => tryArrangement("stack", share, 1));
    }
    else {
        // The fraction's column is narrow: what is left of the shares above.
        L.sideShares.forEach((share) => [1, 2, count].forEach((columns) => tryArrangement("side", 1 - share, columns)));
        L.stackShares.forEach((share) => [count, Math.ceil(count / 2)].forEach((columns) => tryArrangement("stack", 1 - share, columns)));
    }
    return best?.layout ?? null;
}
// --- sentence_build: a sentence put together from its words ------------------
//
// The twin of word_build one level up: a place for every word of a sentence,
// the words on tiles mixed below among a few that do not belong, and the word
// that comes next flying to its place. The sentence arrives already in the
// language the game is played in; its end mark (. ? !) stands after the last
// place from the start. Words are drawn by DrawnText.
/** A sentence has at most this many words, and at most this many that do not belong lie among them. */
export const SENTENCE_BUILD_WORDS_MAX = 10;
export const SENTENCE_BUILD_EXTRA_MAX = 3;
/** The words of a text, at its spaces. */
function readSentenceWords(source) {
    if (Array.isArray(source)) {
        return source.flatMap((item) => readSentenceWords(item));
    }
    return (extractText(source) ?? "").split(/[\s,;]+/).map((word) => word.trim()).filter(Boolean);
}
/** Two words are the same tile when they read the same, whatever their case. */
function sameSentenceWord(a, b) {
    return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}
/**
 * The game as the players draw it. `sentence` arrives already in the language
 * of the game; its end mark is cut off and stands after the last place.
 * `extra_words` (a text, or a list) are the words that do not belong — none of
 * them a word of the sentence. The tiles are mixed so that they do not
 * already read as the sentence.
 */
export function normalizeSentenceBuildConfig(config) {
    const text = (extractText(config.sentence) ?? "").replace(/\s+/g, " ").trim();
    const endMatch = text.match(/[.?!…]+$/);
    const ending = endMatch ? endMatch[0] : "";
    const words = readSentenceWords(ending ? text.slice(0, -ending.length) : text).slice(0, SENTENCE_BUILD_WORDS_MAX);
    const extra = readSentenceWords(config.extra_words)
        .filter((word) => !words.some((own) => sameSentenceWord(own, word)))
        .filter((word, index, all) => all.findIndex((other) => sameSentenceWord(other, word)) === index)
        .slice(0, SENTENCE_BUILD_EXTRA_MAX);
    const all = words.length > 1 ? [...words, ...extra] : [];
    let order = shuffle(all.map((word, index) => ({ id: `word_${index + 1}`, word })));
    // Mixed is mixed: a tray that reads as the sentence already gives it away.
    for (let attempt = 0; attempt < 6 && all.length > 1 && order.slice(0, words.length).every((tile, index) => sameSentenceWord(tile.word, words[index])); attempt += 1) {
        order = shuffle(order);
    }
    const questionImage = extractMediaUrl(config.question_image);
    const bg = normalizeBackground(config);
    return {
        words: all.length > 0 ? words : [],
        ending,
        tiles: order,
        questionImage,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [bg, questionImage].filter((uri) => Boolean(uri)),
    };
}
/**
 * What a tap on a tile does: the whole play rule, so both players follow it
 * tap for tap. The sentence is built left to right; `placed` are the tiles in
 * it so far, in order. Any tile of the right word is right.
 */
export function resolveSentenceBuildTap(config, placed, tileId) {
    const slot = placed.length;
    const tile = config.tiles.find((item) => item.id === tileId);
    if (!tile || slot >= config.words.length || placed.includes(tileId)) {
        return { type: "ignored" };
    }
    if (!sameSentenceWord(tile.word, config.words[slot])) {
        return { type: "wrong", slot };
    }
    return { type: "place", slot, complete: slot + 1 === config.words.length };
}
/** Proportions of the sentence and its tiles. Shares are of a line of writing. */
export const SENTENCE_BUILD_LAYOUT = {
    /** A tile and a place: this tall for a line, and this much wider than its word. */
    tileHeight: 1.7,
    tilePadX: 0.7,
    /** A line of writing is never taller than this, in px. */
    maxLine: 46,
    /** Under this a tile is hard for a small finger to hit, in px. */
    minTile: 44,
    /** Between tiles and between places, and round the sentence on its panel. */
    gap: 0.35,
    pad: 0.45,
    /** The picture: a square this many tiles high at the panel's left. */
    picture: 2.2,
    /** The most of the free height the sentence's panel takes. */
    maxPanelShare: 0.55,
};
/** Items of the given widths in rows no wider than `maxWidth`, in order; null when one is wider. */
function flowWidths(widths, maxWidth, gap) {
    const rows = [];
    let used = 0;
    for (let index = 0; index < widths.length; index++) {
        if (widths[index] > maxWidth + 1e-6) {
            return null;
        }
        const row = rows[rows.length - 1];
        if (row && used + gap + widths[index] <= maxWidth + 1e-6) {
            row.push(index);
            used += gap + widths[index];
        }
        else {
            rows.push([index]);
            used = widths[index];
        }
    }
    return rows;
}
/**
 * Where everything of a sentence to build goes. The background covers the
 * stage; the sentence's places sit on a panel above, in one row or more, its
 * picture at their left when it has one; the tiles below, in rows. One size
 * of writing for both — the biggest at which they fit — two safe areas a gap
 * apart, inside the stage less `insets`.
 */
export function layoutSentenceBuild(stageWidth, stageHeight, config, insets = {}) {
    const L = SENTENCE_BUILD_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.words.length === 0 || config.tiles.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const hasPicture = Boolean(config.questionImage);
    const endUnits = config.ending ? textLineUnits(config.ending) : 0;
    const widthOf = (word, line) => (textLineUnits(word) + L.tilePadX) * line;
    // Everything at a line of `line` px, or null when it does not fit.
    const place = (line) => {
        const tile = line * L.tileHeight;
        const between = line * L.gap;
        const pad = line * L.pad;
        const pictureSize = hasPicture ? tile * L.picture : 0;
        const wordsWidth = area.width - pad * 2 - (hasPicture ? pictureSize + between : 0);
        const slotWidths = config.words.map((word) => widthOf(word, line));
        // The end mark rides after the last place, in its row.
        const withEnding = endUnits > 0 ? [...slotWidths.slice(0, -1), slotWidths[slotWidths.length - 1] + endUnits * line] : slotWidths;
        const slotRows = flowWidths(withEnding, wordsWidth, between);
        const tileWidths = config.tiles.map((item) => widthOf(item.word, line));
        const tileRows = flowWidths(tileWidths, area.width, between);
        if (!slotRows || !tileRows) {
            return null;
        }
        const wordsHeight = slotRows.length * tile + (slotRows.length - 1) * between;
        const panelHeight = Math.max(pictureSize, wordsHeight) + pad * 2;
        const trayHeight = tileRows.length * tile + (tileRows.length - 1) * between;
        if (panelHeight > area.height * L.maxPanelShare + 1e-6 || panelHeight + gap + trayHeight > area.height + 1e-6) {
            return null;
        }
        const rowWidth = (row, widths) => row.reduce((sum, index) => sum + widths[index], 0) + (row.length - 1) * between;
        const widest = Math.max(...slotRows.map((row) => rowWidth(row, withEnding)));
        const panelWidth = pad * 2 + (hasPicture ? pictureSize + between : 0) + widest;
        const free = area.height - panelHeight - gap - trayHeight;
        const panel = { left: area.left + (area.width - panelWidth) / 2, top: area.top + free * 0.4, width: panelWidth, height: panelHeight };
        const picture = hasPicture
            ? { left: panel.left + pad, top: panel.top + (panelHeight - pictureSize) / 2, width: pictureSize, height: pictureSize }
            : null;
        const wordsLeft = panel.left + pad + (hasPicture ? pictureSize + between : 0);
        const wordsTop = panel.top + (panelHeight - wordsHeight) / 2;
        const slots = [];
        let ending = null;
        slotRows.forEach((row, rowIndex) => {
            let left = wordsLeft + (widest - rowWidth(row, withEnding)) / 2;
            const top = wordsTop + rowIndex * (tile + between);
            row.forEach((index) => {
                slots[index] = { left, top, width: slotWidths[index], height: tile };
                if (index === slotWidths.length - 1 && endUnits > 0) {
                    ending = { text: config.ending, left: left + slotWidths[index], top: top + (tile - line) / 2, width: endUnits * line, height: line };
                }
                left += withEnding[index] + between;
            });
        });
        const trayTop = panel.top + panelHeight + gap + free * 0.3;
        const tiles = [];
        tileRows.forEach((row, rowIndex) => {
            let left = area.left + (area.width - rowWidth(row, tileWidths)) / 2;
            row.forEach((index) => {
                tiles[index] = { left, top: trayTop + rowIndex * (tile + between), width: tileWidths[index], height: tile };
                left += tileWidths[index] + between;
            });
        });
        const tray = {
            left: Math.min(...tiles.map((rect) => rect.left)),
            top: trayTop,
            width: Math.max(...tiles.map((rect) => rect.left + rect.width)) - Math.min(...tiles.map((rect) => rect.left)),
            height: trayHeight,
        };
        return { panel, picture, slots, ending, tray, tiles, line };
    };
    // The biggest writing at which everything fits, found by halving.
    let low = 0;
    let high = L.maxLine;
    for (let step = 0; step < 18; step++) {
        const middle = (low + high) / 2;
        if (place(middle))
            low = middle;
        else
            high = middle;
    }
    return low > 1 ? place(low) : null;
}
// --- word_sort: words sorted into baskets ------------------------------------
//
// Words come one at a time on a card — a thing, an action, a quality; living
// or not — and the child taps the basket the word belongs in, each basket
// named in words. A right tap sends the word into it, where it stays, listed;
// a wrong one shakes the card and costs a life. Everything arrives already in
// the language the game is played in, and is drawn by DrawnText.
/** Baskets: two or three. Words: four to eight. */
export const WORD_SORT_BINS = { min: 2, max: 3 };
export const WORD_SORT_WORDS = { min: 4, max: 8 };
/**
 * The game as the players draw it. `bins` are the baskets' names (a text, or
 * { label }) and `words` the words ({ word, bin }, `bin` the basket's place
 * from 0 or 1, or its name). A word of no basket, a basket of no word, and
 * past the most of either, are left out; a game left with fewer than two
 * baskets or four words is none.
 */
export function normalizeWordSortConfig(config) {
    const bg = normalizeBackground(config);
    const rawBins = (Array.isArray(config.bins) ? config.bins : [])
        .map((bin) => extractText(asRecord(bin)?.label ?? bin))
        .slice(0, WORD_SORT_BINS.max);
    const binIndex = (value) => {
        const number = extractNumber(value);
        if (number !== null && Number.isInteger(number)) {
            // Counted from 1 in an author's field, from 0 in code: 0 can only be the first.
            return number >= 1 && number <= rawBins.length ? number - 1 : number === 0 ? 0 : -1;
        }
        const text = extractText(value);
        return text ? rawBins.findIndex((label) => label?.toLocaleLowerCase() === text.toLocaleLowerCase()) : -1;
    };
    const rows = (Array.isArray(config.words) ? config.words : [])
        .map((row) => asRecord(row))
        .filter((row) => row !== null)
        .map((row) => ({ word: (extractText(row.word) ?? "").replace(/\s+/g, " ").trim(), bin: binIndex(row.bin) }))
        .filter((row) => row.word !== "" && row.bin >= 0 && rawBins[row.bin])
        .slice(0, WORD_SORT_WORDS.max);
    const used = new Set(rows.map((row) => row.bin));
    const bins = rawBins
        .map((label, index) => ({ id: `bin_${index + 1}`, label: label ?? "", index }))
        .filter((bin) => bin.label !== "" && used.has(bin.index))
        .map(({ id, label }) => ({ id, label }));
    if (bins.length < WORD_SORT_BINS.min || rows.length < WORD_SORT_WORDS.min) {
        return { bins: [], words: [], bg_image: bg, time_limit: extractNumber(config.time_limit), lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)), imageUris: bg ? [bg] : [] };
    }
    const words = rows.map((row, index) => ({ id: `word_${index + 1}`, word: row.word, bin: `bin_${row.bin + 1}` }));
    // Mixed, and not three of one basket running: a child would stop reading.
    let order = shuffle(words);
    for (let attempt = 0; attempt < 8 && order.some((word, index) => index >= 2 && word.bin === order[index - 1].bin && word.bin === order[index - 2].bin); attempt++) {
        order = shuffle(words);
    }
    return {
        bins,
        words: order,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/** What a tap on a basket does, `sorted` words having been put away already: the whole play rule. */
export function resolveWordSortTap(config, sorted, binId) {
    const word = config.words[sorted];
    if (!word || !config.bins.some((bin) => bin.id === binId)) {
        return { type: "ignored" };
    }
    return word.bin === binId
        ? { type: "right", word: word.id, complete: sorted + 1 === config.words.length }
        : { type: "wrong", word: word.id };
}
/** Proportions of the word game. Shares are of a line of writing. */
export const WORD_SORT_LAYOUT = {
    /** The word asked: its card this many lines high, a line within these, in px. */
    cardLines: 1.9,
    minLine: 26,
    maxLine: 60,
    /** A basket's name: this share of the word's line, under its rim. */
    labelShare: 0.7,
    /** A word put away: this share of the word's line, listed in its basket. */
    sortedShare: 0.55,
    /** Between the card and the baskets, and between baskets, in lines. */
    gap: 0.5,
    /** The card's share of the height, at most; the baskets take the rest. */
    maxCardShare: 0.34,
};
/**
 * Where everything of the word game goes. The background covers the stage;
 * the word asked stands on its card at the top, the baskets side by side
 * under it, each with its name under its rim and room for every word it can
 * get. Inside the stage less `insets`.
 */
export function layoutWordSort(stageWidth, stageHeight, config, insets = {}) {
    const L = WORD_SORT_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.bins.length === 0 || config.words.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const count = config.bins.length;
    const longestWord = Math.max(...config.words.map((word) => textLineUnits(word.word)));
    const longestLabel = Math.max(...config.bins.map((bin) => textLineUnits(bin.label)));
    const most = Math.max(...config.bins.map((bin) => config.words.filter((word) => word.bin === bin.id).length));
    const place = (line) => {
        const gap = line * L.gap;
        const card = { left: 0, top: area.top, width: (longestWord + 1.2) * line, height: line * L.cardLines };
        card.left = area.left + (area.width - card.width) / 2;
        if (card.width > area.width || card.height > area.height * L.maxCardShare) {
            return null;
        }
        const binTop = card.top + card.height + gap;
        const binHeight = area.top + area.height - binTop;
        const binWidth = (area.width - (count - 1) * gap) / count;
        const label = line * L.labelShare;
        const sorted = line * L.sortedShare;
        // A basket holds its name and every word it can get, one under the other.
        const needed = label * 1.6 + most * sorted * 1.25 + line * 0.4;
        if (binHeight < needed || binWidth < Math.max(longestLabel * label, longestWord * sorted) + line * 0.6) {
            return null;
        }
        const bins = config.bins.map((bin, index) => {
            const left = area.left + index * (binWidth + gap);
            const labelWidth = textLineUnits(bin.label) * label;
            const slots = Array.from({ length: most }, (_unused, slot) => ({
                left: left + line * 0.3,
                top: binTop + label * 1.6 + slot * sorted * 1.25,
                width: binWidth - line * 0.6,
                height: sorted,
            }));
            return {
                id: bin.id,
                left,
                top: binTop,
                width: binWidth,
                height: binHeight,
                label: { text: bin.label, left: left + (binWidth - labelWidth) / 2, top: binTop + label * 0.3, width: labelWidth, height: label },
                slots,
            };
        });
        return { card, line, bins };
    };
    // The biggest writing at which everything fits, found by halving.
    let low = 0;
    let high = L.maxLine;
    for (let step = 0; step < 18; step++) {
        const middle = (low + high) / 2;
        if (place(middle))
            low = middle;
        else
            high = middle;
    }
    return low > 1 ? place(low) : null;
}
// --- number_line: a number placed on a line, or a jump landed --------------------
//
// A number line drawn in code: from its start to its end, a tick every step,
// some of them numbered. Place: a number is written on a card and the child
// taps the tick where it lies. Jump: the line shows where a hop starts and the
// card says how far it goes ("+30", "−4"), and the child taps where it lands.
// The number asked is never written under its own tick. A wrong tick costs a
// life; the right one takes the marker and wins.
/** A line has at most this many ticks: more are too close for a finger. */
export const NUMBER_LINE_TICKS_MAX = 21;
/**
 * The game as the players draw it. `start`, `end` and `step` make the line
 * (0, 10 and 1 by default); `label_every` numbers every so many ticks from
 * the start (the end too, where it falls in step). The number asked is `target`, or `from` and
 * `jump` together — then the line marks `from` and the card says the jump. A
 * line of more than `NUMBER_LINE_TICKS_MAX` ticks, or a number asked that is
 * not one of them, is no game.
 */
export function normalizeNumberLineConfig(config) {
    const bg = normalizeBackground(config);
    const whole = (value, fallback) => {
        const number = extractNumber(value);
        return number !== null && Number.isFinite(number) ? Math.round(number) : fallback;
    };
    const start = whole(config.start, 0);
    const end = whole(config.end, 10);
    const step = Math.max(1, whole(config.step, 1));
    const labelEvery = Math.max(1, whole(config.label_every, 5));
    const count = end > start && (end - start) % step === 0 ? (end - start) / step + 1 : 0;
    const values = count >= 3 && count <= NUMBER_LINE_TICKS_MAX ? Array.from({ length: count }, (_unused, index) => start + index * step) : [];
    const fromValue = extractNumber(config.from);
    const jumpValue = extractNumber(config.jump);
    const isJump = fromValue !== null && jumpValue !== null && jumpValue !== 0;
    // A number asked is a whole one: 2.5 is between two ticks, not on one.
    const targetValue = extractNumber(config.target);
    const asked = isJump ? Math.round(fromValue) + Math.round(jumpValue) : targetValue !== null && Number.isInteger(targetValue) ? targetValue : Number.NaN;
    const target = values.includes(asked) && !(isJump && !values.includes(Math.round(fromValue))) ? asked : -1;
    return {
        start,
        end,
        step,
        ticks: values.map((value, index) => ({
            value,
            // The end too where it falls in step: a number squeezed in beside the last one is not read.
            labelled: value !== target && (index === 0 || index % labelEvery === 0),
        })),
        target: values.length > 0 ? target : -1,
        from: isJump && target >= 0 ? Math.round(fromValue) : null,
        jump: isJump && target >= 0 ? Math.round(jumpValue) : null,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: bg ? [bg] : [],
    };
}
/** What a tap on a tick does: the whole play rule. */
export function resolveNumberLineTap(config, value) {
    if (config.target < 0 || !config.ticks.some((tick) => tick.value === value)) {
        return { type: "ignored" };
    }
    return value === config.target ? { type: "right" } : { type: "wrong" };
}
/** Proportions of the number line. */
export const NUMBER_LINE_LAYOUT = {
    /** A tick's number: this tall within these, in px; the card's number twice as tall. */
    minNumber: 18,
    maxNumber: 36,
    card: 2,
    /** A tick, as a share of the number's height, and the line's thickness. */
    tick: 0.9,
    majorTick: 1.3,
    thickness: 0.22,
    /** A tick's place to tap: as wide as the room between ticks, this many numbers high. */
    zoneHeight: 3.2,
    /** The jump's arc rises this many numbers over the line. */
    arc: 2.2,
    /** Over the line, under the card: room for the marker, this many numbers high. */
    markerRoom: 2.2,
};
/** How wide a number is written at a height of 1: its digits and its minus. */
function numberLineUnits(value) {
    return (String(Math.abs(value)).length + (value < 0 ? 0.8 : 0)) * MATH_EQUATION_LAYOUT.digit;
}
/**
 * Where everything of the number line goes. The background covers the
 * stage; the card stands at the top, the line across the stage under it with
 * its ticks, their numbers under them and a place to tap round each — as big
 * as the widest number between two ticks lets them be.
 */
export function layoutNumberLine(stageWidth, stageHeight, config, insets = {}) {
    const L = NUMBER_LINE_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || config.ticks.length < 3 || config.target < 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const count = config.ticks.length;
    const widest = Math.max(...config.ticks.map((tick) => numberLineUnits(tick.value)));
    const cardText = config.jump !== null ? numberLineUnits(Math.abs(config.jump)) + MATH_EQUATION_LAYOUT.sign : numberLineUnits(config.target);
    const hasArc = config.from !== null;
    // The number as tall as the height lets it be, and narrow enough that two numbers side by side
    // never touch: the line runs between the middles of its end numbers.
    // From the card to the line: the gap and the arc's room, and never less than the marker needs.
    const rise = (number) => Math.max(gap + (hasArc ? number * L.arc : 0) + (number * L.majorTick) / 2, number * L.markerRoom);
    const fitsHeight = (number) => number * L.card * 1.5 + rise(number) + number * L.majorTick / 2 + number * 1.6 <= area.height;
    // Only numbered ticks need the room: the closest two of them, so many ticks apart.
    const labelled = config.ticks.map((tick, index) => (tick.labelled ? index : -1)).filter((index) => index >= 0);
    const apart = Math.max(1, Math.min(...labelled.slice(1).map((index, at) => index - labelled[at])));
    let number = Math.min(L.maxNumber, (apart * area.width) / (widest * (1.15 * (count - 1) + apart)));
    while (number > 6 && !fitsHeight(number)) {
        number *= 0.94;
    }
    const halfLabel = (widest * number) / 2;
    const left = area.left + halfLabel;
    const right = area.left + area.width - halfLabel;
    const between = (right - left) / (count - 1);
    // The block is the card, the arc's room, the line and the numbers under it, in the middle of the height.
    const cardHeight = number * L.card * 1.5;
    const block = cardHeight + rise(number) + number * L.majorTick / 2 + number * 1.6;
    const top = area.top + Math.max(0, (area.height - block) / 2);
    const cardWidth = (cardText + 0.8) * number * L.card;
    const card = { left: area.left + (area.width - cardWidth) / 2, top, width: cardWidth, height: cardHeight };
    const y = card.top + cardHeight + rise(number);
    const zoneFloor = card.top + cardHeight + gap / 2;
    const ticks = config.ticks.map((tick, index) => {
        const x = left + index * between;
        const tickHeight = number * (tick.labelled ? L.majorTick : L.tick);
        const labelWidth = numberLineUnits(tick.value) * number;
        const zoneHeight = number * L.zoneHeight;
        return {
            value: tick.value,
            x,
            tickHeight,
            label: tick.labelled ? { left: x - labelWidth / 2, top: y + (number * L.majorTick) / 2 + number * 0.25, width: labelWidth, height: number } : null,
            // Round its tick, but never up into the card.
            zone: { left: x - between / 2, top: Math.max(y - zoneHeight / 2, zoneFloor), width: between, height: y + zoneHeight / 2 - Math.max(y - zoneHeight / 2, zoneFloor) },
        };
    });
    const fromIndex = config.from !== null ? config.ticks.findIndex((tick) => tick.value === config.from) : -1;
    return {
        card,
        line: { left: left - number * 0.4, right: right + number * 0.4, y, thickness: Math.max(2, number * L.thickness) },
        ticks,
        number,
        arc: fromIndex >= 0 ? { fromX: ticks[fromIndex].x, height: number * L.arc } : null,
    };
}
// --- true_false: a series of statements, each true or not ----------------------
//
// Statements come one after another — three to eight — each read on a card,
// with a picture where one helps ("The whale is a fish."). The child taps ✓
// when it is true and ✗ when it is not. A right answer brings the next; a
// wrong one shakes, costs a life and shows the right button for a moment
// before the next comes, so the child learns it. The statements arrive in the
// language the game is played in, drawn by DrawnText.
/** A series has this many statements at least, and at most. */
export const TRUE_FALSE_STATEMENTS = { min: 3, max: 8 };
function readTruth(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value === 1 ? true : value === 0 ? false : null;
    const text = (extractText(value) ?? "").toLowerCase();
    if (["1", "true", "yes", "y", "კი", "да", "верно", "right"].includes(text))
        return true;
    if (["0", "false", "no", "n", "არა", "нет", "неверно", "wrong"].includes(text))
        return false;
    return null;
}
/**
 * The game as the players draw it. `statements` are { text, answer, image }
 * — `answer` true or false (a boolean, 1/0, or the word). A statement with no
 * text or no answer is left out, past the most too; fewer than three is no
 * game. A series all true, or all false, is as the author wrote it: the
 * server tells that off, the players play it.
 */
export function normalizeTrueFalseConfig(config) {
    const bg = normalizeBackground(config);
    const statements = (Array.isArray(config.statements) ? config.statements : [])
        .map((row) => asRecord(row))
        .filter((row) => row !== null)
        .map((row) => ({
        text: (extractText(row.text) ?? "").replace(/\s+/g, " ").trim(),
        image: extractMediaUrl(row.image),
        answer: readTruth(row.answer),
    }))
        .filter((row) => row.text !== "" && row.answer !== null)
        .slice(0, TRUE_FALSE_STATEMENTS.max)
        .map((row, index) => ({ id: `statement_${index + 1}`, ...row }));
    const playable = statements.length >= TRUE_FALSE_STATEMENTS.min ? statements : [];
    return {
        statements: playable,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set([bg, ...playable.map((statement) => statement.image)].filter((uri) => Boolean(uri)))],
    };
}
/** What a tap on ✓ (`true`) or ✗ (`false`) does at the statement `index`: the whole play rule. */
export function resolveTrueFalseTap(config, index, answer) {
    const statement = config.statements[index];
    if (!statement) {
        return { type: "ignored" };
    }
    const complete = index + 1 === config.statements.length;
    return statement.answer === answer ? { type: "right", complete } : { type: "wrong", complete };
}
/** Proportions of the true-or-false game. */
export const TRUE_FALSE_LAYOUT = {
    /** The picture's share of the width, beside the statement, when there is one. */
    pictureShare: 0.36,
    /** The two buttons: as tall as this, within these, in px; twice as wide as tall. */
    buttonShare: 0.3,
    minButton: 56,
    maxButton: 110,
    buttonAspect: 1.5,
};
/**
 * Where everything of the statement `index` goes. The background covers the
 * stage; the picture (when the series has any) at the left — over the rest on
 * a tall stage — the statement on its card and the two buttons under it
 * beside it, or all of it in the middle when there is no picture. The card's room is the same for every
 * statement, so nothing moves as they change; the writing is as big as the
 * statement lets it be.
 */
export function layoutTrueFalse(stageWidth, stageHeight, config, index, insets = {}) {
    const L = TRUE_FALSE_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    const statement = config.statements[Math.min(index, config.statements.length - 1)];
    if (usableWidth <= 0 || usableHeight <= 0 || !statement) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const withPictures = config.statements.some((item) => item.image);
    // Beside the statement on a wide stage, over it on a tall one.
    const tall = area.height > area.width;
    const pictureSize = withPictures
        ? tall
            ? Math.min(area.height * L.pictureShare - gap / 2, area.width)
            : Math.min(area.width * L.pictureShare - gap / 2, area.height)
        : 0;
    const picture = withPictures
        ? tall
            ? { left: area.left + (area.width - pictureSize) / 2, top: area.top, width: pictureSize, height: pictureSize }
            : { left: area.left, top: area.top + (area.height - pictureSize) / 2, width: pictureSize, height: pictureSize }
        : null;
    const column = !withPictures
        ? area
        : tall
            ? { left: area.left, top: area.top + pictureSize + gap, width: area.width, height: area.height - pictureSize - gap }
            : { left: area.left + pictureSize + gap, top: area.top, width: area.width - pictureSize - gap, height: area.height };
    // Two buttons side by side, never wider than their half of the column.
    const button = Math.max(L.minButton, Math.min(L.maxButton, column.height * L.buttonShare, (column.width - gap) / 2 / L.buttonAspect));
    const buttonWidth = button * L.buttonAspect;
    const card = { left: column.left, top: column.top, width: column.width, height: column.height - button - gap };
    const passage = fitPassage(statement.text, card.width * 0.9, card.height * 0.86);
    const lines = passage.lines.map((text, line) => {
        const width = textLineUnits(text) * passage.size;
        return {
            text,
            left: card.left + (card.width - width) / 2,
            top: card.top + (card.height - passage.lines.length * passage.size) / 2 + line * passage.size,
            width,
            height: passage.size,
        };
    });
    const buttonsTop = card.top + card.height + gap;
    const middle = column.left + column.width / 2;
    return {
        picture,
        card,
        lines,
        yes: { left: middle - gap / 2 - buttonWidth, top: buttonsTop, width: buttonWidth, height: button },
        no: { left: middle + gap / 2, top: buttonsTop, width: buttonWidth, height: button },
    };
}
// --- grid_route: a hero steered across a grid, or a route followed ---------------
//
// A grid drawn in code, over a plan where there is one (a park, a room seen
// from above). Steer: the hero stands at the start and a treasure at the goal,
// rocks in the way; the child moves the hero a square at a time with four
// arrows, and reaches the treasure. A move into a rock or off the grid is a
// mistake. Follow: the route is written as steps — "2 ↑, 3 →" — and the child
// taps the square where it ends.
/** A grid has at most this many columns and rows. */
export const GRID_ROUTE_SIZE = { maxColumns: 8, maxRows: 5, minCells: 3 };
export const GRID_DIRECTIONS = ["up", "left", "right", "down"];
function readGridCell(value) {
    const record = asRecord(value);
    if (record) {
        const column = extractNumber(record.column ?? record.col ?? record.x);
        const row = extractNumber(record.row ?? record.y);
        return column !== null && row !== null && Number.isInteger(column) && Number.isInteger(row) ? { column, row } : null;
    }
    const text = extractText(value);
    const match = text?.match(/^\s*(\d+)\s*[,:x ]\s*(\d+)\s*$/);
    return match ? { column: Number(match[1]), row: Number(match[2]) } : null;
}
function readGridDirection(value) {
    const text = (extractText(value) ?? "").toLowerCase();
    if (["up", "u", "↑", "north", "ზევით", "вверх"].includes(text))
        return "up";
    if (["down", "d", "↓", "south", "ქვევით", "вниз"].includes(text))
        return "down";
    if (["left", "l", "←", "west", "მარცხნივ", "влево"].includes(text))
        return "left";
    if (["right", "r", "→", "east", "მარჯვნივ", "вправо"].includes(text))
        return "right";
    return null;
}
/** Where a step of `count` squares in `direction` from `cell` lands. */
export function moveGridCell(cell, direction, count = 1) {
    return {
        column: cell.column + (direction === "right" ? count : direction === "left" ? -count : 0),
        row: cell.row + (direction === "down" ? count : direction === "up" ? -count : 0),
    };
}
function sameGridCell(a, b) {
    return a.column === b.column && a.row === b.row;
}
/**
 * The game as the players draw it. Squares are counted from 0: column from
 * the left, row from the top. `start` and `goal` are { column, row } or
 * "2,3"; `route` is [{ direction, count }]; `blocked` the rocks. A follow
 * game ends where its route does; a start or goal off the grid, on a rock, a
 * route that leaves the grid, or a goal at the start, is no game.
 */
export function normalizeGridRouteConfig(config) {
    const bg = normalizeBackground(config);
    const plan = extractMediaUrl(config.plan_image);
    const columns = Math.round(extractNumber(config.columns) ?? 5);
    const rows = Math.round(extractNumber(config.rows) ?? 4);
    const sized = columns >= 2 && rows >= 2 && columns <= GRID_ROUTE_SIZE.maxColumns && rows <= GRID_ROUTE_SIZE.maxRows && columns * rows >= GRID_ROUTE_SIZE.minCells;
    const inside = (cell) => cell.column >= 0 && cell.row >= 0 && cell.column < columns && cell.row < rows;
    const mode = extractText(config.mode) === "follow" ? "follow" : "steer";
    const start = readGridCell(config.start) ?? { column: 0, row: 0 };
    const blocked = (Array.isArray(config.blocked) ? config.blocked : [])
        .map((cell) => readGridCell(cell))
        .filter((cell) => cell !== null && inside(cell) && !sameGridCell(cell, start));
    const route = mode === "follow"
        ? (Array.isArray(config.route) ? config.route : [])
            .map((row) => asRecord(row))
            .map((row) => ({ direction: readGridDirection(row?.direction), count: Math.round(extractNumber(row?.count) ?? 1) }))
            .filter((step) => step.direction !== null && step.count >= 1)
        : [];
    let goal = null;
    if (mode === "follow") {
        let at = start;
        let fine = route.length > 0;
        for (const step of route) {
            at = moveGridCell(at, step.direction, step.count);
            fine = fine && inside(at);
        }
        goal = fine ? at : null;
    }
    else {
        goal = readGridCell(config.goal);
    }
    const blockedAt = (cell) => blocked.some((rock) => sameGridCell(rock, cell));
    const playable = sized && inside(start) && goal !== null && inside(goal) && !sameGridCell(start, goal) && !blockedAt(goal);
    return {
        mode,
        columns: sized ? columns : 0,
        rows: sized ? rows : 0,
        start,
        goal: playable ? goal : null,
        route: playable ? route : [],
        blocked: playable ? blocked : [],
        plan_image: plan,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [bg, plan].filter((uri) => Boolean(uri)),
    };
}
/** Steer mode: what an arrow does with the hero at `at`. */
export function resolveGridRouteMove(config, at, direction) {
    if (!config.goal || sameGridCell(at, config.goal)) {
        return { type: "ignored" };
    }
    const next = moveGridCell(at, direction);
    const off = next.column < 0 || next.row < 0 || next.column >= config.columns || next.row >= config.rows;
    if (off || config.blocked.some((rock) => sameGridCell(rock, next))) {
        return { type: "blocked", at };
    }
    return { type: "moved", at: next, arrived: sameGridCell(next, config.goal) };
}
/** Follow mode: what a tap on a square does. */
export function resolveGridRouteTap(config, cell) {
    if (!config.goal || cell.column < 0 || cell.row < 0 || cell.column >= config.columns || cell.row >= config.rows) {
        return { type: "ignored" };
    }
    return sameGridCell(cell, config.goal) ? { type: "right" } : { type: "wrong" };
}
/** The fewest moves from the start to the goal round the rocks; -1 when there is no way. */
export function gridRouteShortest(config) {
    if (!config.goal)
        return -1;
    const key = (cell) => `${cell.column},${cell.row}`;
    const seen = new Set([key(config.start)]);
    let frontier = [config.start];
    for (let steps = 1; frontier.length > 0; steps++) {
        const next = [];
        for (const cell of frontier) {
            for (const direction of GRID_DIRECTIONS) {
                const to = moveGridCell(cell, direction);
                if (to.column < 0 || to.row < 0 || to.column >= config.columns || to.row >= config.rows)
                    continue;
                if (config.blocked.some((rock) => sameGridCell(rock, to)) || seen.has(key(to)))
                    continue;
                if (sameGridCell(to, config.goal))
                    return steps;
                seen.add(key(to));
                next.push(to);
            }
        }
        frontier = next;
    }
    return -1;
}
/** Proportions of the grid game. */
export const GRID_ROUTE_LAYOUT = {
    /** The grid's share of the width, the controls beside it, tried in turn. */
    sideShares: [0.6, 0.66, 0.72],
    /** An arrow button: as tall as this, within these, in px. */
    minButton: 52,
    maxButton: 96,
    /** A step of the route: a line this tall within these. */
    minStep: 28,
    maxStep: 56,
    /** A square to tap in follow mode is never smaller than this, in px. */
    minCell: 40,
};
/** Where a square stands on the stage. */
export function gridRouteCellRect(layout, cell) {
    return { left: layout.grid.left + cell.column * layout.cell, top: layout.grid.top + cell.row * layout.cell, width: layout.cell, height: layout.cell };
}
/**
 * Where everything of the grid game goes. The background covers the stage;
 * the grid stands as big as it can at the left, its squares square, and
 * beside it the four arrows in a cross (steer) or the route's steps one under
 * the other (follow). Inside the stage less `insets`.
 */
export function layoutGridRoute(stageWidth, stageHeight, config, insets = {}) {
    const L = GRID_ROUTE_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0 || !config.goal || config.columns === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    let best = null;
    L.sideShares.forEach((share) => {
        const slot = { left: area.left, top: area.top, width: area.width * share - gap / 2, height: area.height };
        const rest = { left: slot.left + slot.width + gap, top: area.top, width: area.width - slot.width - gap, height: area.height };
        const cell = Math.min(slot.width / config.columns, slot.height / config.rows);
        const grid = {
            left: slot.left + (slot.width - cell * config.columns) / 2,
            top: slot.top + (slot.height - cell * config.rows) / 2,
            width: cell * config.columns,
            height: cell * config.rows,
        };
        let arrows = [];
        let routeCard = null;
        let steps = [];
        let control = 0;
        if (config.mode === "steer") {
            // A cross three buttons wide and three high.
            const button = Math.min(L.maxButton, (rest.width - gap) / 3, (rest.height - gap) / 3);
            control = button;
            const middle = { x: rest.left + rest.width / 2, y: rest.top + rest.height / 2 };
            const at = (dx, dy, direction) => ({
                direction,
                left: middle.x - button / 2 + dx * (button + gap / 3),
                top: middle.y - button / 2 + dy * (button + gap / 3),
                width: button,
                height: button,
            });
            arrows = [at(0, -1, "up"), at(-1, 0, "left"), at(1, 0, "right"), at(0, 1, "down")];
        }
        else {
            // The steps one under the other on a card: an arrow and its count.
            const count = Math.max(config.route.length, 1);
            const line = Math.min(L.maxStep, (rest.height * 0.9) / (count * 1.3 + 0.4), (rest.width * 0.8) / 3);
            control = line;
            const cardHeight = line * (count * 1.3 + 0.4);
            const cardWidth = line * 3.4;
            routeCard = { left: rest.left + (rest.width - cardWidth) / 2, top: rest.top + (rest.height - cardHeight) / 2, width: cardWidth, height: cardHeight };
            steps = config.route.map((_step, index) => ({ left: routeCard.left + line * 0.4, top: routeCard.top + line * 0.3 + index * line * 1.3, width: line * 2.6, height: line }));
        }
        const enough = config.mode === "steer" ? control >= L.minButton : control >= L.minStep && cell >= L.minCell;
        const score = Math.min(cell, control * 1.5) + (enough ? 0 : -100) + cell * 1e-3;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { grid, cell, arrows, routeCard, steps } };
        }
    });
    return best?.layout ?? null;
}
// --- chart_read: a chart read, and questions about it ---------------------------
//
// A chart the game draws: two to five bars, each with a library picture under
// it (apples, pears, plums picked). Bars: a coloured column against a numbered
// scale. Pictures: the picture itself stacked as many times as it counts — a
// pictograph, two abreast where that makes them bigger. One to three questions
// are asked in turn on a card beside it, in words of the game's language with
// the bars' pictures among them: which
// is the most, which the fewest (a tap on its bar), how many of one, how many
// more of one than of another (a tap on a number). A wrong answer costs a life
// and the question stays.
export const CHART_READ_SIZE = { minBars: 2, maxBars: 5, maxValue: 20, maxPictures: 10, maxQuestions: 3 };
/** The bars' colours, in turn: a toy's own, the same in both players. */
export const CHART_BAR_COLORS = ["#ff9f43", "#28bbf9", "#34d399", "#f472b6", "#a78bfa"];
/** The questions as each language says them; {a} and {b} are the bars' pictures. */
export const CHART_WORDS = {
    ka: { most: "რომელი არის ყველაზე მეტი?", least: "რომელი არის ყველაზე ცოტა?", count: "რამდენია {a}?", difference: "რამდენით მეტია {a}, ვიდრე {b}?" },
    ru: { most: "Чего больше всего?", least: "Чего меньше всего?", count: "Сколько {a}?", difference: "На сколько {a} больше, чем {b}?" },
    en: { most: "Which is the most?", least: "Which is the fewest?", count: "How many {a}?", difference: "How many more {a} than {b}?" },
};
/** Whether the question is answered by a tap on a bar (rather than on a number). */
export function chartQuestionTakesBar(question) {
    return question.ask === "most" || question.ask === "least";
}
/**
 * The numbers a child who misreads would pick: one off either way first, then
 * the other numbers of the question; three of them, none below 0.
 */
function chartConfusions(answer, near) {
    const pool = [answer + 1, answer - 1, ...near, answer + 2, answer - 2, answer + 3];
    const picked = [];
    for (const value of pool) {
        if (value >= 0 && value !== answer && !picked.includes(value) && picked.length < 3) {
            picked.push(value);
        }
    }
    return [answer, ...picked].sort((a, b) => a - b);
}
/**
 * The game as the players draw it. `bars` are { image, value }: a whole
 * number from 0 (to 20 in bars, 10 in pictures). `questions` are { ask, bar,
 * other } — `bar` and `other` counted from 0. A "most" or "least" whose top
 * or bottom two bars tie, a bar that is none, or a "difference" whose bar is
 * not the bigger, is left out; fewer than two bars or no question is no game.
 */
export function normalizeChartReadConfig(config) {
    const bg = normalizeBackground(config);
    const style = extractText(config.style) === "pictures" ? "pictures" : "bars";
    const most = style === "pictures" ? CHART_READ_SIZE.maxPictures : CHART_READ_SIZE.maxValue;
    const bars = (Array.isArray(config.bars) ? config.bars : [])
        .map((row) => asRecord(row))
        .map((row) => ({ image: extractMediaUrl(row?.image), value: extractNumber(row?.value) }))
        .filter((row) => Boolean(row.image) && row.value !== null && Number.isInteger(row.value) && row.value >= 0 && row.value <= most)
        .slice(0, CHART_READ_SIZE.maxBars)
        .map((row, index) => ({ id: `bar_${index + 1}`, image: row.image, value: row.value, color: CHART_BAR_COLORS[index % CHART_BAR_COLORS.length] }));
    const values = bars.map((bar) => bar.value);
    const top = Math.max(0, ...values);
    const asked = extractNumber(config.scale_step);
    const scaleStep = asked !== null && Number.isInteger(asked) && asked >= 1 && asked <= 10 ? asked : top <= 10 ? 1 : 2;
    const scaleMax = Math.max(scaleStep, Math.ceil(top / scaleStep) * scaleStep);
    const barAt = (value) => {
        const index = extractNumber(value);
        return index !== null && Number.isInteger(index) && index >= 0 && index < bars.length ? index : null;
    };
    const only = (target) => (values.filter((value) => value === target).length === 1 ? values.indexOf(target) : null);
    const questions = [];
    for (const row of Array.isArray(config.questions) ? config.questions : []) {
        const record = asRecord(row);
        const ask = extractText(record?.ask);
        let question = null;
        if (ask === "most" || ask === "least") {
            const answer = only(ask === "most" ? Math.max(...values) : Math.min(...values));
            question = answer === null ? null : { ask, bar: null, other: null, answer, options: [] };
        }
        else if (ask === "count") {
            const bar = barAt(record?.bar);
            question = bar === null ? null : {
                ask, bar, other: null, answer: values[bar], options: chartConfusions(values[bar], values.filter((_value, index) => index !== bar)),
            };
        }
        else if (ask === "difference") {
            const bar = barAt(record?.bar);
            const other = barAt(record?.other);
            question = bar === null || other === null || values[bar] <= values[other] ? null : {
                ask, bar, other, answer: values[bar] - values[other], options: chartConfusions(values[bar] - values[other], [values[bar], values[other]]),
            };
        }
        if (question && questions.length < CHART_READ_SIZE.maxQuestions) {
            questions.push({ id: `question_${questions.length + 1}`, ...question });
        }
    }
    const playable = bars.length >= CHART_READ_SIZE.minBars && questions.length > 0;
    return {
        style,
        bars: playable ? bars : [],
        scaleMax,
        scaleStep,
        questions: playable ? questions : [],
        language: extractText(config.language) ?? "ka",
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set([bg, ...(playable ? bars : []).map((bar) => bar.image)].filter((uri) => Boolean(uri)))],
    };
}
/**
 * What a tap does at the question `index`: `pick` is the bar tapped (from 0)
 * where a bar is asked, the number tapped where a number is.
 */
export function resolveChartReadTap(config, index, pick) {
    const question = config.questions[index];
    if (!question) {
        return { type: "ignored" };
    }
    const fits = chartQuestionTakesBar(question) ? pick >= 0 && pick < config.bars.length : question.options.includes(pick);
    if (!fits) {
        return { type: "ignored" };
    }
    return pick === question.answer ? { type: "right", complete: index + 1 === config.questions.length } : { type: "wrong" };
}
/**
 * The question in the game's language, Georgian where it has none, cut into
 * its words and pictures; `glued` marks a piece that follows the one before
 * with no space ("?" after a picture).
 */
export function chartQuestionPieces(question, language) {
    const words = CHART_WORDS[(language in CHART_WORDS ? language : "ka")];
    const pieces = [];
    for (const part of words[question.ask].split(/(\{a\}|\{b\})/)) {
        if (part === "{a}" || part === "{b}") {
            pieces.push({ bar: (part === "{a}" ? question.bar : question.other) ?? 0, glued: false });
            continue;
        }
        part.split(/(\s+)/).forEach((word, at) => {
            if (word.trim() === "")
                return;
            pieces.push({ text: word, glued: at === 0 && pieces.length > 0 });
        });
    }
    return pieces;
}
/** Proportions of the chart game. */
export const CHART_READ_LAYOUT = {
    /** The chart's share of the width on a wide stage, of the height on a tall one. */
    chartShare: 0.58,
    /** The pictures under the bars: of the chart's height at most, and in px. */
    iconShare: 0.17,
    maxIcon: 72,
    /** A bar's column, of its slot's width. */
    barShare: 0.62,
    /** A number of the scale: this tall within these, and its box this many heights wide. */
    minScaleLine: 12,
    maxScaleLine: 26,
    scaleUnits: 1.9,
    /** The question's line, in px at most; a picture in it is this many lines wide. */
    maxCardLine: 44,
    pieceIcon: 1.3,
    /** A number to tap: no smaller than this, no bigger than that, this wide for its height. */
    minOption: 48,
    maxOption: 92,
    optionAspect: 1.4,
};
/**
 * Where everything of the question `index` goes. The background covers the
 * stage; the chart stands on a panel at the left (on top of a tall stage), the
 * question's card and the numbers to tap beside it. The chart and the card's
 * room are the same for every question, so nothing moves as they change.
 */
export function layoutChartRead(stageWidth, stageHeight, config, index, insets = {}) {
    const L = CHART_READ_LAYOUT;
    const originX = insets.left ?? 0;
    const originY = insets.top ?? 0;
    const usableWidth = stageWidth - originX - (insets.right ?? 0);
    const usableHeight = stageHeight - originY - (insets.bottom ?? 0);
    const question = config.questions[Math.min(index, config.questions.length - 1)];
    if (usableWidth <= 0 || usableHeight <= 0 || !question || config.bars.length === 0) {
        return null;
    }
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: originX + edge,
        top: originY + edge,
        width: Math.max(usableWidth - edge * 2, 1),
        height: Math.max(usableHeight - edge * 2, 1),
    };
    const tall = area.height > area.width;
    const chart = tall
        ? { left: area.left, top: area.top, width: area.width, height: area.height * L.chartShare - gap / 2 }
        : { left: area.left, top: area.top, width: area.width * L.chartShare - gap / 2, height: area.height };
    const column = tall
        ? { left: area.left, top: chart.top + chart.height + gap, width: area.width, height: area.height - chart.height - gap }
        : { left: chart.left + chart.width + gap, top: area.top, width: area.width - chart.width - gap, height: area.height };
    // The chart: the scale at the left (bars), the pictures along the floor.
    const pad = Math.max(gap / 2, Math.min(chart.width, chart.height) * 0.05);
    const inner = { left: chart.left + pad, top: chart.top + pad, width: chart.width - pad * 2, height: chart.height - pad * 2 };
    const count = config.bars.length;
    const lines = config.scaleMax / config.scaleStep + 1;
    const scaleLine = config.style === "bars"
        ? Math.max(L.minScaleLine, Math.min(L.maxScaleLine, (inner.height * (1 - L.iconShare)) / lines * 0.8))
        : 0;
    const scaleWidth = config.style === "bars" ? scaleLine * L.scaleUnits : 0;
    const slotRoom = inner.width - scaleWidth - (scaleWidth > 0 ? gap / 3 : 0);
    const slot = slotRoom / count;
    const icon = Math.min(L.maxIcon, inner.height * L.iconShare, slot * 0.8);
    const plot = {
        left: inner.left + inner.width - slotRoom,
        top: inner.top + scaleLine / 2,
        width: slotRoom,
        height: Math.max(inner.height - icon - gap / 2 - scaleLine / 2, 1),
    };
    const floor = plot.top + plot.height;
    const scale = config.style === "bars"
        ? Array.from({ length: lines }, (_unused, line) => {
            const value = line * config.scaleStep;
            const y = floor - (value / config.scaleMax) * plot.height;
            return { value, y, label: { left: inner.left, top: y - scaleLine / 2, width: scaleWidth, height: scaleLine } };
        })
        : [];
    // A pictograph stacks its pictures one above the other, or two abreast where that makes them bigger.
    const tallest = Math.max(1, ...config.bars.map((bar) => bar.value));
    const single = Math.min(slot * 0.8, plot.height / tallest);
    const paired = Math.min((slot * 0.8) / 2, plot.height / Math.ceil(tallest / 2));
    const abreast = config.style === "pictures" && paired > single * 1.15 ? 2 : 1;
    const unit = config.style === "pictures" ? (abreast === 2 ? paired : single) : 0;
    const bars = config.bars.map((bar, at) => {
        const middle = plot.left + slot * (at + 0.5);
        const height = config.style === "bars" ? (bar.value / config.scaleMax) * plot.height : 0;
        return {
            column: config.style === "bars" ? { left: middle - (slot * L.barShare) / 2, top: floor - height, width: slot * L.barShare, height } : null,
            units: config.style === "pictures"
                ? Array.from({ length: bar.value }, (_unused, step) => ({
                    left: middle - (unit * abreast) / 2 + (step % abreast) * unit + unit * 0.04,
                    top: floor - (Math.floor(step / abreast) + 1) * unit + unit * 0.04,
                    width: unit * 0.92,
                    height: unit * 0.92,
                }))
                : [],
            icon: { left: middle - icon / 2, top: floor + gap / 2, width: icon, height: icon },
            zone: { left: plot.left + slot * at, top: plot.top, width: slot, height: plot.height + gap / 2 + icon },
        };
    });
    // The numbers to tap, two in a row under the card, where any question asks one.
    const asksNumbers = config.questions.some((item) => !chartQuestionTakesBar(item));
    const optionHeight = asksNumbers
        ? Math.max(L.minOption, Math.min(L.maxOption, (column.width - gap) / 2 / L.optionAspect, (column.height * 0.55 - gap) / 2))
        : 0;
    const optionWidth = optionHeight * L.optionAspect;
    const optionsHeight = asksNumbers ? optionHeight * 2 + gap : 0;
    const card = { left: column.left, top: column.top, width: column.width, height: Math.max(column.height - optionsHeight - (asksNumbers ? gap : 0), 1) };
    const optionsTop = card.top + card.height + gap;
    const options = question.options.map((value, at) => {
        const row = Math.floor(at / 2);
        const inRow = Math.min(2, question.options.length - row * 2);
        const rowLeft = column.left + (column.width - (inRow * optionWidth + (inRow - 1) * gap)) / 2;
        return { value, left: rowLeft + (at % 2) * (optionWidth + gap), top: optionsTop + row * (optionHeight + gap), width: optionWidth, height: optionHeight };
    });
    // The question set as big as it goes on its card, in rows, every row in the middle.
    const pieces = chartQuestionPieces(question, config.language);
    const room = { width: card.width * 0.9, height: card.height * 0.86 };
    const widthOf = (piece, size) => (piece.bar !== undefined ? size * L.pieceIcon : textLineUnits(piece.text) * size);
    const set = (size) => {
        const space = size * 0.22;
        const rows = [[]];
        let used = 0;
        for (const piece of pieces) {
            const width = widthOf(piece, size);
            const before = rows[rows.length - 1].length === 0 ? 0 : piece.glued ? 0 : space;
            if (used + before + width > room.width && rows[rows.length - 1].length > 0 && !piece.glued) {
                rows.push([{ piece, width, before: 0 }]);
                used = width;
            }
            else {
                rows[rows.length - 1].push({ piece, width, before });
                used += before + width;
            }
        }
        return rows;
    };
    const fits = (size) => {
        const rows = set(size);
        const line = size * L.pieceIcon;
        return rows.length * line <= room.height && rows.every((row) => row.reduce((sum, item) => sum + item.before + item.width, 0) <= room.width + 1e-6);
    };
    let size = L.maxCardLine;
    if (!fits(size)) {
        let low = 0;
        let high = L.maxCardLine;
        for (let step = 0; step < 24; step += 1) {
            const middle = (low + high) / 2;
            if (fits(middle))
                low = middle;
            else
                high = middle;
        }
        size = low;
    }
    const rows = set(size);
    const line = size * L.pieceIcon;
    const placed = [];
    rows.forEach((row, at) => {
        const rowWidth = row.reduce((sum, item) => sum + item.before + item.width, 0);
        let x = card.left + (card.width - rowWidth) / 2;
        const y = card.top + (card.height - rows.length * line) / 2 + at * line;
        for (const item of row) {
            x += item.before;
            placed.push(item.piece.bar !== undefined
                ? { bar: item.piece.bar, left: x, top: y, width: item.width, height: line }
                : { text: item.piece.text, left: x, top: y + (line - size) / 2, width: item.width, height: size });
            x += item.width;
        }
    });
    return { chart, plot, scale, bars, card, pieces: placed, options };
}
// --- find_in_scene: every one of a kind found on a big picture -----------------
//
// A big picture or a photo, shown whole like label_diagram's sheet — never
// cropped, nothing on it moved — and a card beside it with what to find (its
// picture) and a dot for each one there is: three towers, five bunches of
// grapes. The child taps them on the picture; one found is ringed and its dot
// fills. A tap on nothing is a miss and costs a life, so tapping everywhere
// does not win. The things are points of the picture itself or pictures the
// author stood on it, ticked in the Scene Composer; the rest only stand there.
export const FIND_IN_SCENE_TARGETS = { min: 2, max: 8 };
/**
 * The game as the players draw it. `placements` are what the author put on
 * the picture, in percent of it, each with `target` when it is one to find;
 * one with no `image` is a point of the picture and is kept only as a target.
 * Two to eight targets; past eight the rest only stand there.
 */
export function normalizeFindInSceneConfig(config) {
    const clampPercent = (value) => Math.max(0, Math.min(100, value ?? 0));
    let targets = 0;
    const things = (Array.isArray(config.placements) ? config.placements : [])
        .map((raw) => asRecord(raw))
        .map((record) => {
        if (!record)
            return null;
        const image = extractMediaUrl(record.image);
        const x = clampPercent(extractNumber(record.x));
        const y = clampPercent(extractNumber(record.y));
        const width = Math.min(100 - x, clampPercent(extractNumber(record.width)));
        const height = Math.min(100 - y, clampPercent(extractNumber(record.height)));
        const wanted = Boolean(record.target) && targets < FIND_IN_SCENE_TARGETS.max;
        if (width <= 0 || height <= 0 || (!image && !wanted))
            return null;
        if (wanted)
            targets += 1;
        return { image, x, y, width, height, target: wanted };
    })
        .filter((thing) => Boolean(thing))
        .map((thing, index) => ({ id: `thing_${index + 1}`, ...thing }));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    const bg = extractMediaUrl(config.bg_image);
    const wanted = things.filter((thing) => thing.target);
    const playable = Boolean(bg) && wanted.length >= FIND_IN_SCENE_TARGETS.min && boardWidth !== null && boardHeight !== null && boardWidth > 0 && boardHeight > 0;
    const icon = extractMediaUrl(config.icon) ?? wanted.find((thing) => thing.image)?.image ?? null;
    return {
        things: playable ? things : [],
        targets: playable ? wanted.map((thing) => thing.id) : [],
        icon: playable ? icon : null,
        board: playable ? { width: boardWidth, height: boardHeight } : null,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set([bg, icon, ...things.map((thing) => thing.image)].filter((uri) => Boolean(uri)))],
    };
}
/**
 * What a tap at `point` — in percent of the picture — does, `found` the ids
 * found so far. A thing is hit inside its box grown by `slop` (percent of the
 * picture each way, so a small point takes a finger); of two, the nearer
 * middle wins.
 */
export function resolveFindInSceneTap(config, found, point, slop = { x: 0, y: 0 }) {
    if (config.targets.length === 0 || found.length >= config.targets.length) {
        return { type: "ignored" };
    }
    const hits = config.things
        .filter((thing) => thing.target)
        .filter((thing) => {
        const grow = (size, pad) => Math.max(0, pad - size / 2);
        const dx = grow(thing.width, slop.x);
        const dy = grow(thing.height, slop.y);
        return point.x >= thing.x - dx && point.x <= thing.x + thing.width + dx && point.y >= thing.y - dy && point.y <= thing.y + thing.height + dy;
    })
        .sort((a, b) => {
        const distance = (thing) => Math.hypot(thing.x + thing.width / 2 - point.x, thing.y + thing.height / 2 - point.y);
        return distance(a) - distance(b);
    });
    if (hits.length === 0) {
        return { type: "miss" };
    }
    const fresh = hits.find((thing) => !found.includes(thing.id));
    if (!fresh) {
        return { type: "ignored" };
    }
    return { type: "found", id: fresh.id, complete: found.length + 1 === config.targets.length };
}
/** Proportions of the find game. */
export const FIND_IN_SCENE_LAYOUT = {
    /** The card with what to find: of the free width (a column) or height (a row), within these in px. */
    cardShare: 0.17,
    minCard: 84,
    maxCard: 150,
    /** In px: the white rim the players draw round the sheet; the layout leaves it room. */
    sheetRim: 6,
    /** A thing is hit this far round its middle at least, in px. */
    minHit: 44,
};
/**
 * Where everything of the find game goes: the card at the right of the sheet
 * on a wide stage, over it on a tall one, and the sheet as big as the rest
 * lets it be, its picture whole. Inside the stage less `insets`.
 */
export function layoutFindInScene(stageWidth, stageHeight, config, insets = {}) {
    const L = FIND_IN_SCENE_LAYOUT;
    const board = config.board;
    const count = config.targets.length;
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: (insets.left ?? 0) + edge,
        top: (insets.top ?? 0) + edge,
        width: stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2,
        height: stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2,
    };
    if (!board || count === 0 || area.width <= 0 || area.height <= 0) {
        return null;
    }
    const tall = area.height > area.width;
    const cardSize = Math.max(L.minCard, Math.min(L.maxCard, (tall ? area.height : area.width) * L.cardShare));
    // Wide: a column at the right — the picture on top, the dots two abreast under it.
    // Tall: a row over the sheet — the picture at the left, the dots in a row beside it.
    const room = tall
        ? { left: area.left, top: area.top + cardSize + gap, width: area.width, height: area.height - cardSize - gap }
        : { left: area.left, top: area.top, width: area.width - cardSize - gap, height: area.height };
    const fit = Math.min((room.width - L.sheetRim * 2) / board.width, (room.height - L.sheetRim * 2) / board.height);
    const sheet = {
        left: room.left + (room.width - board.width * fit) / 2,
        top: room.top + (room.height - board.height * fit) / 2,
        width: board.width * fit,
        height: board.height * fit,
    };
    let card;
    let icon;
    const dots = [];
    const pad = cardSize * 0.1;
    if (tall) {
        card = { left: area.left, top: area.top, width: area.width, height: cardSize };
        icon = { left: card.left + pad, top: card.top + pad, width: cardSize - pad * 2, height: cardSize - pad * 2 };
        const left = icon.left + icon.width + pad;
        const dot = Math.min((card.left + card.width - pad - left) / count, cardSize * 0.42);
        for (let at = 0; at < count; at += 1) {
            dots.push({ left: left + at * dot + dot * 0.08, top: card.top + (cardSize - dot) / 2 + dot * 0.08, width: dot * 0.84, height: dot * 0.84 });
        }
    }
    else {
        // Two, three or four dots a row, whichever leaves the picture and the dots biggest.
        let pick = { score: -Infinity, across: 2, dot: 0, iconSize: 0 };
        for (const across of [2, 3, 4]) {
            const rows = Math.ceil(count / across);
            const dot = Math.min((cardSize - pad * 2) / across, cardSize * 0.42);
            const iconSize = Math.min(cardSize - pad * 2, area.height - pad * 3 - rows * dot);
            const score = Math.min(iconSize, dot * 2.5);
            if (score > pick.score + 1e-9)
                pick = { score, across, dot, iconSize };
        }
        const { across, dot, iconSize } = pick;
        const rows = Math.ceil(count / across);
        const height = pad * 3 + iconSize + rows * dot;
        card = { left: room.left + room.width + gap, top: area.top + (area.height - height) / 2, width: cardSize, height };
        icon = { left: card.left + (cardSize - iconSize) / 2, top: card.top + pad, width: iconSize, height: iconSize };
        const dotsLeft = card.left + (cardSize - dot * Math.min(across, count)) / 2;
        for (let at = 0; at < count; at += 1) {
            dots.push({ left: dotsLeft + (at % across) * dot + dot * 0.08, top: icon.top + icon.height + pad + Math.floor(at / across) * dot + dot * 0.08, width: dot * 0.84, height: dot * 0.84 });
        }
    }
    return {
        sheet,
        things: config.things.map((thing) => ({
            left: sheet.left + (thing.x / 100) * sheet.width,
            top: sheet.top + (thing.y / 100) * sheet.height,
            width: (thing.width / 100) * sheet.width,
            height: (thing.height / 100) * sheet.height,
        })),
        card,
        icon,
        dots,
        slop: { x: (L.minHit / 2 / sheet.width) * 100, y: (L.minHit / 2 / sheet.height) * 100 },
    };
}
/** Where a point of the stage lies on the picture, in percent of it. */
export function findInScenePoint(layout, stageX, stageY) {
    return {
        x: ((stageX - layout.sheet.left) / layout.sheet.width) * 100,
        y: ((stageY - layout.sheet.top) / layout.sheet.height) * 100,
    };
}
// --- map_place: pictures put on their places on a map ---------------------------
//
// A map or a plan shown whole, like label_diagram's sheet — never cropped,
// nothing on it moved — with a round pin on every place, and beside it the
// pictures on cards: the lights Tsitsina found, the sights of Georgia, the
// animals of the continents. The child carries each card onto its pin (or
// taps the card, then the pin). The right pin takes the picture where the
// author put it; a wrong pin sends it back and costs a life; let go over
// nothing, it only goes back. Authored as a picture placed on its spot; a
// point of the background with no picture is a place nobody's, so the last
// card is not put by elimination.
export const MAP_PLACE_ITEMS = { min: 2, max: 6, decoys: 3 };
/**
 * The game as the players draw it. `placements` are what the author put on
 * the map, in percent of it: a picture on its own place, or a point with no
 * picture — a place nobody's (three at most). Two to six pictures.
 */
export function normalizeMapPlaceConfig(config) {
    const clampPercent = (value) => Math.max(0, Math.min(100, value ?? 0));
    let pictures = 0;
    let decoys = 0;
    const placed = (Array.isArray(config.placements) ? config.placements : [])
        .map((raw) => asRecord(raw))
        .map((record) => {
        if (!record)
            return null;
        const image = extractMediaUrl(record.image);
        const x = clampPercent(extractNumber(record.x));
        const y = clampPercent(extractNumber(record.y));
        const width = Math.min(100 - x, clampPercent(extractNumber(record.width)));
        const height = Math.min(100 - y, clampPercent(extractNumber(record.height)));
        if (width <= 0 || height <= 0)
            return null;
        if (image ? pictures >= MAP_PLACE_ITEMS.max : decoys >= MAP_PLACE_ITEMS.decoys)
            return null;
        if (image)
            pictures += 1;
        else
            decoys += 1;
        return { image, x, y, width, height };
    })
        .filter((spot) => Boolean(spot));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    const bg = extractMediaUrl(config.bg_image);
    const playable = Boolean(bg) && pictures >= MAP_PLACE_ITEMS.min && boardWidth !== null && boardHeight !== null && boardWidth > 0 && boardHeight > 0;
    const spots = placed.map((spot, index) => ({
        id: `spot_${index + 1}`,
        x: spot.x,
        y: spot.y,
        width: spot.width,
        height: spot.height,
        item: spot.image ? `item_${index + 1}` : null,
    }));
    const items = placed
        .map((spot, index) => (spot.image ? { id: `item_${index + 1}`, image: spot.image, spot: `spot_${index + 1}` } : null))
        .filter((item) => Boolean(item));
    return {
        spots: playable ? spots : [],
        items: playable ? shuffle(items) : [],
        board: playable ? { width: boardWidth, height: boardHeight } : null,
        bg_image: bg,
        time_limit: extractNumber(config.time_limit),
        lives: Math.max(1, Math.floor(extractNumber(config.lives) ?? 3)),
        imageUris: [...new Set([bg, ...items.map((item) => item.image)].filter((uri) => Boolean(uri)))],
    };
}
/**
 * What putting the card `itemId` on the spot `spotId` does, `placed` the ids
 * of the cards put so far. A spot taken already takes nothing.
 */
export function resolveMapPlaceDrop(config, placed, itemId, spotId) {
    const item = config.items.find((entry) => entry.id === itemId);
    const spot = config.spots.find((entry) => entry.id === spotId);
    if (!item || !spot || placed.includes(itemId) || (spot.item !== null && placed.includes(spot.item))) {
        return { type: "ignored" };
    }
    return item.spot === spot.id ? { type: "right", complete: placed.length + 1 === config.items.length } : { type: "wrong" };
}
/** Proportions of the map game. */
export const MAP_PLACE_LAYOUT = {
    /** The tray of cards: of the free width (a column) or height (a row), within these in px. */
    trayShare: 0.24,
    minCard: 56,
    maxCard: 112,
    /** In px: the white rim the players draw round the sheet; the layout leaves it room. */
    sheetRim: 6,
    /** A pin: this share of its place's shorter side, within these in px. */
    pinShare: 0.5,
    minPin: 30,
    maxPin: 46,
    /** A drop counts this far round a pin's middle at least, in px. */
    minHit: 48,
};
/**
 * Where everything of the map game goes: the tray of cards at the right of the
 * map on a wide stage, over it on a tall one — one line of cards or two — and
 * the map as big as the rest lets it be. Inside the stage less `insets`.
 */
export function layoutMapPlace(stageWidth, stageHeight, config, insets = {}) {
    const L = MAP_PLACE_LAYOUT;
    const board = config.board;
    const count = config.items.length;
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: (insets.left ?? 0) + edge,
        top: (insets.top ?? 0) + edge,
        width: stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2,
        height: stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2,
    };
    if (!board || count === 0 || area.width <= 0 || area.height <= 0) {
        return null;
    }
    const tall = area.height > area.width;
    const cardGap = gap / 2;
    let best = null;
    for (const lines of [1, 2]) {
        const perLine = Math.ceil(count / lines);
        // The tray's depth across the stage, and the cards' size along it.
        const along = tall ? area.width : area.height;
        const cardAlong = (along - cardGap * (perLine - 1)) / perLine;
        const depthCap = (tall ? area.height : area.width) * L.trayShare;
        const card = Math.max(0, Math.min(L.maxCard, cardAlong, (depthCap - cardGap * (lines - 1)) / lines));
        const depth = card * lines + cardGap * (lines - 1);
        const room = tall
            ? { left: area.left, top: area.top + depth + gap, width: area.width, height: area.height - depth - gap }
            : { left: area.left, top: area.top, width: area.width - depth - gap, height: area.height };
        const fit = Math.min((room.width - L.sheetRim * 2) / board.width, (room.height - L.sheetRim * 2) / board.height);
        if (fit <= 0)
            continue;
        const sheet = {
            left: room.left + (room.width - board.width * fit) / 2,
            top: room.top + (room.height - board.height * fit) / 2,
            width: board.width * fit,
            height: board.height * fit,
        };
        const trayLength = card * perLine + cardGap * (perLine - 1);
        const tray = tall
            ? { left: area.left + (area.width - trayLength) / 2, top: area.top, width: trayLength, height: depth }
            : { left: room.left + room.width + gap, top: area.top + (area.height - trayLength) / 2, width: depth, height: trayLength };
        const cards = config.items.map((item, index) => {
            const line = Math.floor(index / perLine);
            const at = index % perLine;
            return tall
                ? { id: item.id, left: tray.left + at * (card + cardGap), top: tray.top + line * (card + cardGap), width: card, height: card }
                : { id: item.id, left: tray.left + line * (card + cardGap), top: tray.top + at * (card + cardGap), width: card, height: card };
        });
        const spots = config.spots.map((spot) => {
            const box = {
                left: sheet.left + (spot.x / 100) * sheet.width,
                top: sheet.top + (spot.y / 100) * sheet.height,
                width: (spot.width / 100) * sheet.width,
                height: (spot.height / 100) * sheet.height,
            };
            const pin = Math.max(L.minPin, Math.min(L.maxPin, Math.min(box.width, box.height) * L.pinShare));
            return { id: spot.id, ...box, pin: { left: box.left + box.width / 2 - pin / 2, top: box.top + box.height / 2 - pin / 2, width: pin, height: pin } };
        });
        // The cards big enough to carry first, then the map as big as it goes.
        const score = Math.min(card, L.minCard) * 1000 + Math.min(sheet.width, sheet.height) + card * 0.5;
        if (!best || score > best.score + 1e-9) {
            best = { score, layout: { sheet, spots, tray, cards } };
        }
    }
    return best ? best.layout : null;
}
/**
 * The spot a card let go at (`x`, `y`, on the stage) lands on: the one whose
 * pin's middle is nearest, within its place's box grown to `minHit`; null over
 * nothing.
 */
export function mapPlaceSpotAt(layout, x, y) {
    const reach = MAP_PLACE_LAYOUT.minHit / 2;
    let best = null;
    for (const spot of layout.spots) {
        const middleX = spot.left + spot.width / 2;
        const middleY = spot.top + spot.height / 2;
        const inside = Math.abs(x - middleX) <= Math.max(spot.width / 2, reach) && Math.abs(y - middleY) <= Math.max(spot.height / 2, reach);
        const distance = Math.hypot(x - middleX, y - middleY);
        if (inside && (!best || distance < best.distance)) {
            best = { id: spot.id, distance };
        }
    }
    return best ? best.id : null;
}
// --- story_scene: a story told on a scene, the child helping along ---------------
//
// A scene shown whole, like label_diagram's sheet, with the story's heroes and
// things standing on it. Tsitsina tells the story a piece at a time — its own
// clip, its words on a caption under the scene where they are short enough —
// and after each piece the child does one thing: taps a thing, carries a thing
// to a place, or only listens and goes on. Nothing is scored: there are no
// lives and no clock, a tap elsewhere only shows the way again. The journeys
// are made of these.
export const STORY_SCENE_PIECES = { min: 1, max: 6 };
/**
 * The game as the players draw it. `placements` are the things on the scene,
 * in percent of it — pictures, or points of the scene (only ever a place).
 * `pieces` are { text, voice, action, thing, place }, `thing` and `place`
 * counted from 0 among the placements. A tap needs a thing; a carry a thing
 * with a picture and another place; a piece whose action cannot be done is
 * only listened to.
 */
export function normalizeStorySceneConfig(config) {
    const clampPercent = (value) => Math.max(0, Math.min(100, value ?? 0));
    const things = (Array.isArray(config.placements) ? config.placements : [])
        .map((raw) => asRecord(raw))
        .map((record) => {
        if (!record)
            return null;
        const x = clampPercent(extractNumber(record.x));
        const y = clampPercent(extractNumber(record.y));
        return {
            image: extractMediaUrl(record.image),
            x,
            y,
            width: Math.min(100 - x, clampPercent(extractNumber(record.width))),
            height: Math.min(100 - y, clampPercent(extractNumber(record.height))),
        };
    })
        // Kept in place even when empty, so a piece's count still names the right one.
        .map((thing, index) => ({ id: `thing_${index + 1}`, ...(thing ?? { image: null, x: 0, y: 0, width: 0, height: 0 }) }));
    const real = (index) => {
        const at = extractNumber(index);
        const thing = at !== null && Number.isInteger(at) ? things[at] : undefined;
        return thing && thing.width > 0 && thing.height > 0 ? thing : null;
    };
    const pieces = (Array.isArray(config.pieces) ? config.pieces : [])
        .map((raw) => asRecord(raw))
        .filter((record) => record !== null)
        .map((record) => {
        const text = (extractText(record.text) ?? "").replace(/\s+/g, " ").trim();
        const asked = extractText(record.action);
        const thing = real(record.thing);
        const place = real(record.place);
        let action = "listen";
        if (asked === "tap" && thing)
            action = "tap";
        if (asked === "drag" && thing?.image && place && place.id !== thing.id)
            action = "drag";
        return {
            text,
            voice: extractMediaUrl(record.voice),
            action,
            thing: action === "listen" ? null : thing?.id ?? null,
            place: action === "drag" ? place?.id ?? null : null,
        };
    })
        .filter((piece) => piece.text !== "" || piece.voice !== null)
        .slice(0, STORY_SCENE_PIECES.max)
        .map((piece, index) => ({ id: `piece_${index + 1}`, ...piece }));
    const boardWidth = extractNumber(config.board_width);
    const boardHeight = extractNumber(config.board_height);
    const bg = extractMediaUrl(config.bg_image);
    const playable = Boolean(bg) && pieces.length >= STORY_SCENE_PIECES.min && boardWidth !== null && boardHeight !== null && boardWidth > 0 && boardHeight > 0;
    return {
        things: playable ? things : [],
        pieces: playable ? pieces : [],
        board: playable ? { width: boardWidth, height: boardHeight } : null,
        bg_image: bg,
        time_limit: null,
        lives: 1,
        imageUris: [...new Set([bg, ...things.map((thing) => thing.image)].filter((uri) => Boolean(uri)))],
        voiceUris: playable ? [...new Set(pieces.map((piece) => piece.voice).filter((uri) => Boolean(uri)))] : [],
    };
}
/**
 * What the child's step does at the piece `index`: a tap on `thingId`, a
 * carry of `thingId` let go on `placeId`, or the go-on button (`thingId`
 * null) of a piece only listened to.
 */
export function resolveStorySceneStep(config, index, step) {
    const piece = config.pieces[index];
    if (!piece) {
        return { type: "ignored" };
    }
    const done = { type: "done", complete: index + 1 === config.pieces.length };
    if (piece.action === "listen")
        return step.kind === "next" ? done : { type: "ignored" };
    if (piece.action === "tap")
        return step.kind === "tap" && step.thingId === piece.thing ? done : { type: "ignored" };
    return step.kind === "drop" && step.thingId === piece.thing && step.placeId === piece.place ? done : { type: "ignored" };
}
/** Proportions of the story scene. */
export const STORY_SCENE_LAYOUT = {
    /** The caption under the scene: of the free height, within these in px. */
    captionShare: 0.2,
    minCaption: 56,
    maxCaption: 110,
    /** Its writing: no bigger than this, and under `minLine` it is not shown — the voice tells it. */
    maxLine: 34,
    minLine: 17,
    /** The go-on button at the caption's right, as tall as the caption. */
    nextShare: 1,
    /** In px: the white rim the players draw round the sheet; the layout leaves it room. */
    sheetRim: 6,
    /** A carry lands on a place this far round its middle at least, in px; a tap too. */
    minHit: 52,
};
/**
 * Where everything of the piece `index` goes: the scene as big as it can be
 * over a caption band, the go-on button at the band's right. The band is the
 * same for every piece, so the scene never moves as the story goes on.
 */
export function layoutStoryScene(stageWidth, stageHeight, config, index, insets = {}) {
    const L = STORY_SCENE_LAYOUT;
    const board = config.board;
    const piece = config.pieces[Math.min(index, config.pieces.length - 1)];
    const edge = sceneEdge(stageWidth, stageHeight);
    const gap = sceneGap(stageWidth, stageHeight);
    const area = {
        left: (insets.left ?? 0) + edge,
        top: (insets.top ?? 0) + edge,
        width: stageWidth - (insets.left ?? 0) - (insets.right ?? 0) - edge * 2,
        height: stageHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - edge * 2,
    };
    if (!board || !piece || area.width <= 0 || area.height <= 0) {
        return null;
    }
    const band = Math.max(L.minCaption, Math.min(L.maxCaption, area.height * L.captionShare));
    const room = { left: area.left, top: area.top, width: area.width, height: Math.max(area.height - band - gap, 1) };
    const fit = Math.min((room.width - L.sheetRim * 2) / board.width, (room.height - L.sheetRim * 2) / board.height);
    const sheet = {
        left: room.left + (room.width - board.width * fit) / 2,
        top: room.top + (room.height - board.height * fit) / 2,
        width: board.width * fit,
        height: board.height * fit,
    };
    const bandTop = area.top + area.height - band;
    const next = { left: area.left + area.width - band * L.nextShare, top: bandTop, width: band * L.nextShare, height: band };
    const captionWidth = Math.min(area.width - next.width - gap, Math.max(sheet.width, area.width * 0.6));
    const caption = { left: area.left + (area.width - next.width - gap - captionWidth) / 2, top: bandTop, width: captionWidth, height: band };
    let lines = [];
    if (piece.text !== "") {
        const passage = fitPassage(piece.text, caption.width * 0.92, caption.height * 0.86);
        const size = Math.min(passage.size, L.maxLine);
        if (size >= L.minLine) {
            lines = passage.lines.map((text, line) => {
                const width = textLineUnits(text) * size;
                return {
                    text,
                    left: caption.left + (caption.width - width) / 2,
                    top: caption.top + (caption.height - passage.lines.length * size) / 2 + line * size,
                    width,
                    height: size,
                };
            });
        }
    }
    return {
        sheet,
        things: config.things.map((thing) => ({
            left: sheet.left + (thing.x / 100) * sheet.width,
            top: sheet.top + (thing.y / 100) * sheet.height,
            width: (thing.width / 100) * sheet.width,
            height: (thing.height / 100) * sheet.height,
        })),
        caption,
        lines,
        next,
    };
}
/** The thing whose box, grown to a fingertip, holds (`x`, `y`) on the stage — the nearest middle of several; null over none. */
export function storySceneThingAt(layout, things, x, y) {
    const reach = STORY_SCENE_LAYOUT.minHit / 2;
    let best = null;
    layout.things.forEach((box, index) => {
        const thing = things[index];
        if (!thing || box.width <= 0 || box.height <= 0)
            return;
        const middleX = box.left + box.width / 2;
        const middleY = box.top + box.height / 2;
        const inside = Math.abs(x - middleX) <= Math.max(box.width / 2, reach) && Math.abs(y - middleY) <= Math.max(box.height / 2, reach);
        const distance = Math.hypot(x - middleX, y - middleY);
        if (inside && (!best || distance < best.distance)) {
            best = { id: thing.id, distance };
        }
    });
    return best?.id ?? null;
}
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
    "text-choice": "textChoice",
    "math-input": "mathInput",
    "word-build": "wordBuild",
    "label-diagram": "labelDiagram",
    "reading-text": "readingText",
    "word-problem": "wordProblem",
    "money-pay": "moneyPay",
    "clock-set": "clockSet",
    "fraction-pick": "fractionPick",
    "sentence-build": "sentenceBuild",
    "word-sort": "wordSort",
    "number-line": "numberLine",
    "true-false": "trueFalse",
    "grid-route": "gridRoute",
    "chart-read": "chartRead",
    "find-in-scene": "findInScene",
    "map-place": "mapPlace",
    "story-scene": "storyScene",
    "memory-cards": "memoryCards",
    "pattern-next": "patternNext",
    "select-option": "selectOption",
    "shadow-match": "shadowMatch",
    "size-order": "sizeOrder",
    "sort-bins": "sortBins",
    "svg-assemble": "svgAssemble",
};
/** The same timings, addressable by kind. Exhaustive by construction. */
export const GAME_TIMINGS_BY_KIND = {
    "answer-choice": GAME_TIMINGS.answerChoice,
    "catch-correct": GAME_TIMINGS.catchCorrect,
    "connect-pairs": GAME_TIMINGS.connectPairs,
    "count-pick": GAME_TIMINGS.countPick,
    "drag-drop-match": GAME_TIMINGS.dragDropMatch,
    images_order: GAME_TIMINGS.imagesOrder,
    jigsaw: GAME_TIMINGS.jigsaw,
    "math-equation": GAME_TIMINGS.mathEquation,
    "text-choice": GAME_TIMINGS.textChoice,
    "math-input": GAME_TIMINGS.mathInput,
    "word-build": GAME_TIMINGS.wordBuild,
    "label-diagram": GAME_TIMINGS.labelDiagram,
    "reading-text": GAME_TIMINGS.readingText,
    "word-problem": GAME_TIMINGS.wordProblem,
    "money-pay": GAME_TIMINGS.moneyPay,
    "clock-set": GAME_TIMINGS.clockSet,
    "fraction-pick": GAME_TIMINGS.fractionPick,
    "sentence-build": GAME_TIMINGS.sentenceBuild,
    "word-sort": GAME_TIMINGS.wordSort,
    "number-line": GAME_TIMINGS.numberLine,
    "true-false": GAME_TIMINGS.trueFalse,
    "grid-route": GAME_TIMINGS.gridRoute,
    "chart-read": GAME_TIMINGS.chartRead,
    "find-in-scene": GAME_TIMINGS.findInScene,
    "map-place": GAME_TIMINGS.mapPlace,
    "story-scene": GAME_TIMINGS.storyScene,
    "memory-cards": GAME_TIMINGS.memoryCards,
    "pattern-next": GAME_TIMINGS.patternNext,
    "select-option": GAME_TIMINGS.selectOption,
    "shadow-match": GAME_TIMINGS.shadowMatch,
    "size-order": GAME_TIMINGS.sizeOrder,
    "sort-bins": GAME_TIMINGS.sortBins,
    "svg-assemble": GAME_TIMINGS.svgAssemble,
};
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
    "text-choice": "tap",
    "math-input": "tap",
    "word-build": "tap",
    "label-diagram": "tap",
    "reading-text": "tap",
    "word-problem": "tap",
    "money-pay": "tap",
    "clock-set": "tap",
    "fraction-pick": "tap",
    "sentence-build": "tap",
    "word-sort": "tap",
    "number-line": "tap",
    "true-false": "tap",
    "grid-route": "tap",
    "chart-read": "tap",
    "find-in-scene": "tap",
    "map-place": "drag",
    "story-scene": "tap",
    "memory-cards": "tap",
    "pattern-next": "tap",
    "select-option": "tap",
    "shadow-match": "drag",
    "size-order": "drag",
    "sort-bins": "drag",
    "svg-assemble": "tap",
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
export const GESTURE_HINT = {
    delayMs: 2500,
    idleMs: 8000,
    tapBeatMs: 1100,
    dragBeatMs: 2200,
    dragReach: 0.55,
    tapStops: 4,
};
/**
 * Which of `count` things the tapping hand visits on its `round`-th time
 * round. All of them where they are few; where they are many, `tapStops` of
 * them spread from the first to the last, a different set each round — so in
 * the end every one is visited and none is ever left out for good.
 */
export function gestureHintTapStops(count, round = 0) {
    if (count <= 0) {
        return [];
    }
    if (count <= GESTURE_HINT.tapStops) {
        return Array.from({ length: count }, (_unused, index) => index);
    }
    const shift = ((round % count) + count) % count;
    return Array.from({ length: GESTURE_HINT.tapStops }, (_unused, index) => (Math.floor((index * count) / GESTURE_HINT.tapStops) + shift) % count);
}
/**
 * Where the carrying hand lets go: `dragReach` of the way from the thing it
 * lifted towards the middle of where things go.
 */
export function gestureHintDragEnd(from, towards) {
    return {
        x: from.x + (towards.x - from.x) * GESTURE_HINT.dragReach,
        y: from.y + (towards.y - from.y) * GESTURE_HINT.dragReach,
    };
}
// The colour themes of both clients (see theme.ts for why they are here).
export * from "./theme.js";
// The letters drawn in code: their outlines and how a letter and a line are laid out.
export * from "./letters.js";
