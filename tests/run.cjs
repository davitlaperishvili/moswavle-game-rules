'use strict';

/**
 * These pin the decisions both players must agree on. A rule that only one
 * platform gets right is worse than a rule neither gets right: the same game
 * then behaves differently depending on the device a child happens to use.
 *
 * Run: npm test
 */

const rules = require('../dist/cjs/index.js');

let passed = 0;
let failed = 0;

function section(title) {
  console.log(`\n--- ${title} ---`);
}

function check(label, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ok   ${label}`);
    return;
  }

  failed++;
  console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
}

function game(type, data) {
  return { id: 'g1', game_type: type, data };
}

section('game kinds are resolved from the authored type');

// Kebab-case throughout, except images_order. Odd, but both renderers switch on
// these exact strings, so the inconsistency is load-bearing and pinned here.
const kinds = {
  answer_choice: 'answer-choice',
  catch_correct: 'catch-correct',
  memory_cards: 'memory-cards',
  shadow_match: 'shadow-match',
  images_order: 'images_order',
  drag_drop_match: 'drag-drop-match',
  select_option: 'select-option',
  svg_assemble: 'svg-assemble',
};

Object.entries(kinds).forEach(([authored, expected]) => {
  check(`${authored} resolves to ${expected}`, rules.resolveGameKind(authored, {}) === expected);
});

check(
  'an unknown type falls back to the generic renderer',
  rules.resolveGameKind('something_new', {}) === 'generic',
);

section('answer choice: correctness decides the selection mode');

const single = rules.normalizeAnswerChoiceConfig(
  game('answer_choice'),
  rules.getRuntimeConfig({
    answers: [
      { id: 'a', image: 'a.png', is_correct: true },
      { id: 'b', image: 'b.png', is_correct: false },
    ],
  }),
);

check('one correct answer means single select', single.selectionMode === 'single');
check('the correct answer is listed', single.correctOptionIds.join() === 'a');
check('answers without an image are dropped', single.answers.length === 2);

const multiple = rules.normalizeAnswerChoiceConfig(
  game('answer_choice'),
  rules.getRuntimeConfig({
    answers: [
      { id: 'a', image: 'a.png', is_correct: true },
      { id: 'b', image: 'b.png', is_correct: true },
      { id: 'c', image: 'c.png' },
    ],
  }),
);

check('two correct answers mean multi select', multiple.selectionMode === 'multiple');
check('both correct answers are listed', multiple.correctOptionIds.join() === 'a,b');

const imageless = rules.normalizeAnswerChoiceConfig(
  game('answer_choice'),
  rules.getRuntimeConfig({ answers: [{ id: 'a', is_correct: true }] }),
);

check('an answer with no image is not playable', imageless.answers.length === 0);

section('lives and timers fall back the same way everywhere');

check(
  'answer choice defaults to three lives',
  rules.normalizeAnswerChoiceConfig(game('answer_choice'), rules.getRuntimeConfig({})).lives === 3,
);
check(
  'an authored life count wins',
  rules.normalizeAnswerChoiceConfig(game('answer_choice'), rules.getRuntimeConfig({ lives: 2 })).lives === 2,
);
check(
  'zero lives is raised to one, so a game is always playable',
  rules.normalizeAnswerChoiceConfig(game('answer_choice'), rules.getRuntimeConfig({ lives: 0 })).lives === 1,
);

const ordered = rules.normalizeImageOrderConfig(
  rules.getRuntimeConfig({
    items: [
      { id: '1', image: '1.png' },
      { id: '2', image: '2.png' },
      { id: '3', image: '3.png' },
    ],
    show_example: 2,
    lives: 4,
  }),
);

check('images order keeps every authored item', ordered.items.length === 3);
check('the authored example count is kept', ordered.show_example === 2);
check('the authored life count is kept', ordered.lives === 4);

section('config is read through the same door');

check(
  'a JSON string payload is parsed',
  JSON.stringify(rules.getRuntimeConfig({ data: '{"lives":5}' })) !== '{}',
);
check('a missing payload yields an empty config', JSON.stringify(rules.getRuntimeConfig({})) === '{}');

section('svg viewBox parsing');

const viewBox = rules.parseSvgViewBox('<svg viewBox="0 0 500 140"></svg>');
check('width is read', viewBox.width === 500, JSON.stringify(viewBox));
check('height is read', viewBox.height === 140, JSON.stringify(viewBox));

const noViewBox = rules.parseSvgViewBox('<svg width="80" height="40"></svg>');
check('width and height attributes are the fallback', noViewBox.width === 80 && noViewBox.height === 40);

section('shuffling keeps the deck honest');

const deck = ['a', 'b', 'c', 'd', 'e'];
const shuffled = rules.shuffle(deck);

check('length is preserved', shuffled.length === deck.length);
check('every card survives', [...shuffled].sort().join() === [...deck].sort().join());
check('the input is not mutated', deck.join() === 'a,b,c,d,e');

section('a jigsaw is a grid, and the grid is the whole config');

// The pieces are not authored — any picture in the library becomes a game
// without anybody preparing anything. Both players must cut it the same way.
const jig = rules.normalizeJigsawConfig({ question_image: "cow.webp", columns: 3, rows: 2 });

check('a piece per cell', jig.pieces.length === 6);
check('pieces run left to right, top to bottom', jig.pieces[0].row === 0 && jig.pieces[0].column === 0 && jig.pieces[3].row === 1 && jig.pieces[3].column === 0, JSON.stringify(jig.pieces.map((p) => p.id)));
check('ids are stable so a shuffle can be keyed by them', jig.pieces[4].id === 'piece-2-2');

// An ambitious spec should still produce a playable game rather than be
// refused: 5x5 is 25 pieces, which no four-year-old finishes.
const huge = rules.normalizeJigsawConfig({ image: "x.webp", columns: 9, rows: 9 });
check('the board is clamped to something a child can finish', huge.columns === 4 && huge.rows === 4);

// 1x1 is a picture, not a puzzle.
const tiny = rules.normalizeJigsawConfig({ image: "x.webp", columns: 1, rows: 1 });
check('a single-piece board is grown, not shipped', tiny.pieces.length >= 2, JSON.stringify(tiny));

check('the guide is on unless it is turned off', rules.normalizeJigsawConfig({ image: 'x' }).showGuide === true);
check('and can be turned off', rules.normalizeJigsawConfig({ image: 'x', show_guide: false }).showGuide === false);

// bg_image is the last resort so a game authored on the wrong field still
// plays rather than showing an empty board.
check('the picture is found on any of the three fields', rules.normalizeJigsawConfig({ bg_image: 'scene.webp' }).image === 'scene.webp');

check('the type resolves to its own kind', rules.resolveGameKind('jigsaw', {}) === 'jigsaw' && rules.resolveGameKind('Picture Puzzle', {}) === 'jigsaw');

section('client event ids are unique');

const ids = new Set(Array.from({ length: 200 }, () => rules.createClientEventId()));
check('200 ids, no collisions', ids.size === 200);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
