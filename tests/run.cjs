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

section('counting is authored as one picture and one number');

// A single drawing of an apple has to cover counting from one to ten, or the
// library needs "three apples" and "four apples" pictures it will never have.
const count = rules.normalizeCountPickConfig({ image: 'apple.webp', count: 4 });

check('the correct number is offered', count.choices.some((c) => c.value === 4 && c.isCorrect));
check('three choices by default', count.choices.length === 3, JSON.stringify(count.choices));
check('exactly one is correct', count.choices.filter((c) => c.isCorrect).length === 1);

// Neighbours, not random numbers: a child who counts gets it right, a child
// who eyeballs "a few" does not.
const values = count.choices.map((c) => c.value).sort((a, b) => a - b);
check('the wrong answers are the neighbouring numbers', values.join() === '3,4,5', values.join());

const one = rules.normalizeCountPickConfig({ image: 'x', count: 1 });
check('counting one never offers zero', one.choices.every((c) => c.value >= 1), JSON.stringify(one.choices.map((c) => c.value)));

section('counting comes before the digits');

{
  // A game that says nothing is the one it always was: count by eye, tap the digit.
  check('the digit is the answer unless the game says otherwise', count.mode === 'digits');
  check('a mode the players do not know is the digit game too', rules.normalizeCountPickConfig({ image: 'x', count: 2, mode: 'auto' }).mode === 'digits');
  check('tap and tap_dots are kept', rules.normalizeCountPickConfig({ image: 'x', count: 2, mode: 'tap' }).mode === 'tap'
    && rules.normalizeCountPickConfig({ image: 'x', count: 2, mode: 'tap_dots' }).mode === 'tap_dots');

  // One thing, one word: every thing to count is counted once, in any order.
  const first = rules.resolveCountPickTap({ counted: true, countedAs: 0, countedSoFar: 0, total: 3 });
  check('the first one tapped is "one"', first.kind === 'counted' && first.number === 1 && first.complete === false, JSON.stringify(first));
  const last = rules.resolveCountPickTap({ counted: true, countedAs: 0, countedSoFar: 2, total: 3 });
  check('the last one tapped completes the count', last.kind === 'counted' && last.number === 3 && last.complete === true, JSON.stringify(last));
  const again = rules.resolveCountPickTap({ counted: true, countedAs: 2, countedSoFar: 2, total: 3 });
  check('one counted already is not counted twice: it says its own number again',
    again.kind === 'repeat' && again.number === 2, JSON.stringify(again));
  check('a picture that is not to be counted is a mistake',
    rules.resolveCountPickTap({ counted: false, countedAs: 0, countedSoFar: 0, total: 3 }).kind === 'decoy');
  // The hand that shows what to do points at one thing to count, never at one to ignore.
  const scene = [{ id: 'frog', counted: false }, { id: 'duck-1', counted: true }, { id: 'duck-2', counted: true }];
  check('the hint points at the first thing to count', rules.countPickHintTarget(scene, []) === 'duck-1');
  check('then at the next one still to count', rules.countPickHintTarget(scene, ['duck-1']) === 'duck-2');
  check('and at nothing once everything is counted', rules.countPickHintTarget(scene, ['duck-2', 'duck-1']) === null);
  check('the hint waits a moment, and comes back when the child stalls',
    rules.GAME_TIMINGS.countPick.hintDelayMs > 0 && rules.GAME_TIMINGS.countPick.hintIdleMs > rules.GAME_TIMINGS.countPick.hintDelayMs);

  check('counted by tapping alone, the game has no lives; where a card is chosen it has',
    rules.countPickUsesLives('tap') === false && rules.countPickUsesLives('tap_dots') === true && rules.countPickUsesLives('digits') === true);

  // The number words: one recording per number, as far as the game counts.
  const voiced = rules.normalizeCountPickConfig({ image: 'x', count: 3, count_voice: ['/c/1.mp3', null, '/c/3.mp3', '/c/4.mp3'] });
  check('a number word per number, null where there is no recording',
    JSON.stringify(voiced.countVoice) === JSON.stringify(['/c/1.mp3', null, '/c/3.mp3']), JSON.stringify(voiced.countVoice));
  check('only the recordings there are get preloaded', JSON.stringify(voiced.audioUris) === JSON.stringify(['/c/1.mp3', '/c/3.mp3']));
  check('no recordings is no voice, not a crash', count.countVoice.length === 4 && count.countVoice.every((uri) => uri === null) && count.audioUris.length === 0);

  // The digits are the library's pictures, the ones a math example is written with.
  const glyphs = { 2: '/g/2.webp', 3: '/g/3.webp', 4: '/g/4.webp', 1: '/g/1.webp', '+': '/g/plus.webp' };
  const drawn = rules.normalizeCountPickConfig({ image: '/duck.webp', count: 3, glyphs });
  check('a counting game keeps the digit pictures, and only the digits',
    drawn.glyphs['3'] === '/g/3.webp' && drawn.glyphs['+'] === undefined, JSON.stringify(drawn.glyphs));
  check('the digits it offers are preloaded with its pictures',
    JSON.stringify(drawn.imageUris) === JSON.stringify(['/duck.webp', '/g/2.webp', '/g/3.webp', '/g/4.webp']), JSON.stringify(drawn.imageUris));
  const tapped = rules.normalizeCountPickConfig({ image: '/duck.webp', count: 2, mode: 'tap', glyphs });
  check('counted by tapping, the digits are the numbers the pictures get',
    JSON.stringify(tapped.imageUris) === JSON.stringify(['/duck.webp', '/g/1.webp', '/g/2.webp']), JSON.stringify(tapped.imageUris));
  check('no digit pictures is no glyphs, and nothing more to load', Object.keys(count.glyphs).length === 0 && count.imageUris.length === 1);

  // Dot cards: as many dots as the number, all inside the card, none on another.
  let dotsOk = true;
  for (let value = 1; value <= 12; value += 1) {
    const { dots, radius } = rules.countPickDots(value);
    const inside = dots.every((dot) => dot.x - radius >= 0 && dot.x + radius <= 1 && dot.y - radius >= 0 && dot.y + radius <= 1);
    const apart = dots.every((a, i) => dots.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= radius * 2));
    if (dots.length !== value || !inside || !apart) {
      dotsOk = false;
      console.log(`    dots for ${value}: ${dots.length} dots, inside ${inside}, apart ${apart}`);
    }
  }
  check('a dot card shows exactly its number, every dot whole and clear of the others', dotsOk);
  check('five is the face of a die', JSON.stringify(rules.countPickDots(5).dots[2]) === JSON.stringify({ x: 0.5, y: 0.5 }));
}

section('a pattern is authored as its repeating unit');

const pattern = rules.normalizePatternNextConfig({
  pattern: [{ image: 'a.webp' }, { image: 'b.webp' }],
  repeats: 3,
});

check('the run is expanded from the unit', pattern.sequence.length === 6);
check('it alternates', pattern.sequence[0].image === 'a.webp' && pattern.sequence[1].image === 'b.webp' && pattern.sequence[4].image === 'a.webp');

// The run always stops at the end of a repeat, so what comes next is
// answerable rather than a guess.
check('the answer continues the unit', pattern.answer.image === 'a.webp', JSON.stringify(pattern.answer));
check('the choices are the unit itself, so nothing extra is drawn', pattern.choices.length === 2);

const short = rules.normalizePatternNextConfig({ pattern: [{ image: 'a.webp' }] });
check('one picture is not a pattern', short.sequence.length === 0 && short.answer === null);

section('sorting puts many things into few bins');

const sort = rules.normalizeSortBinsConfig({
  bins: [{ id: 'fruit', label: 'Fruit' }, { id: 'veg', label: 'Vegetables' }],
  items: [
    { image: 'apple.webp', binId: 'fruit' },
    { image: 'pear.webp', binId: 'fruit' },
    { image: 'carrot.webp', binId: 'veg' },
    { image: 'ghost.webp', binId: 'nowhere' },
  ],
});

check('both bins survive', sort.bins.length === 2);

// An item pointing at a bin that does not exist can never be placed, so it is
// dropped rather than left to make the game unwinnable.
check('an item with no bin is dropped', sort.items.length === 3, JSON.stringify(sort.items.map((i) => i.id)));
check('a bin may hold several items', sort.items.filter((i) => i.binId === 'fruit').length === 2);

const unnamed = rules.normalizeSortBinsConfig({
  bins: [{ id: 'a' }, { id: 'b', label: 'B' }],
  items: [{ image: 'x.webp', binId: 'b' }],
});
check('a bin with neither name nor picture is dropped', unnamed.bins.length === 1);

check(
  'each type resolves to its own kind',
  rules.resolveGameKind('count_pick', {}) === 'count-pick'
    && rules.resolveGameKind('What Comes Next', {}) === 'pattern-next'
    && rules.resolveGameKind('sort_into_groups', {}) === 'sort-bins',
);

section('sizes are computed, not authored');

// One picture and a step count is the whole input. Nothing else in the
// catalog teaches bigger and smaller.
const size = rules.normalizeSizeOrderConfig({ image: 'bear.webp', steps: 4 });

check('a step per size', size.steps.length === 4);
check('ranks run 0 upward', size.steps.map((s) => s.rank).join() === '0,1,2,3');
check('the largest is full size', Math.abs(size.steps[3].scale - 1) < 0.001, String(size.steps[3].scale));

// A step small enough to be ambiguous next to its neighbour turns a
// comparison into a guess.
const gaps = size.steps.slice(1).map((step, index) => step.scale - size.steps[index].scale);
check('the gaps are even and never tiny', gaps.every((gap) => gap > 0.15 && Math.abs(gap - gaps[0]) < 0.001), gaps.map((g) => g.toFixed(2)).join());
check('the smallest is still clearly visible', size.steps[0].scale >= 0.4);

const descending = rules.normalizeSizeOrderConfig({ image: 'x', steps: 3, direction: 'descending' });

// Descending only changes which end the finished row starts at; the players
// place by rank either way and never have to know the difference.
check('descending starts large', descending.steps[0].scale > descending.steps[2].scale);
check('and its ranks still run 0 upward', descending.steps.map((s) => s.rank).join() === '0,1,2');

// Two sizes is a pair, not an ordering; six is beyond what fits a phone row.
check('below three steps is corrected', rules.normalizeSizeOrderConfig({ image: 'x', steps: 1 }).steps.length === 3);
check('above five steps is corrected', rules.normalizeSizeOrderConfig({ image: 'x', steps: 9 }).steps.length === 5);

check('the type resolves to its own kind', rules.resolveGameKind('size_order', {}) === 'size-order' && rules.resolveGameKind('Big To Small', {}) === 'size-order');

section('client event ids are unique');

const ids = new Set(Array.from({ length: 200 }, () => rules.createClientEventId()));
check('200 ids, no collisions', ids.size === 200);

section('play rules both renderers must agree on');

// A cheer at the midpoint of a two-step game is noise; the win sound follows a
// moment later anyway.
check('halfway fires at the midpoint of a longer game', rules.shouldPlayHalfway(2, 4) && rules.shouldPlayHalfway(3, 5));
check('never on the last step', !rules.shouldPlayHalfway(4, 4));
check('never in a two-step game', !rules.shouldPlayHalfway(1, 2));

check('urls, paths and image files are pictures', ['https://x/a.png', '/media/a.jpg', 'apple.svg', 'a.webp?v=2'].every((v) => rules.isImageReference(v)));
check('plain words are text', !rules.isImageReference('apple') && !rules.isImageReference('') && !rules.isImageReference(null));

const cc = rules.normalizeCatchCorrectConfig({ frequency: 100, speed: 999 });
check('spawn interval has a floor', cc.frequency === rules.CATCH_CORRECT_MIN_FREQUENCY_MS);
check('a sane frequency is kept', rules.normalizeCatchCorrectConfig({ frequency: 1500 }).frequency === 1500);
check('fall duration is clamped both ways', rules.catchCorrectFallDurationMs(999) === rules.CATCH_CORRECT_MIN_FALL_MS && rules.catchCorrectFallDurationMs(1) === rules.CATCH_CORRECT_MAX_FALL_MS);
check('the default speed is inside the clamp', rules.catchCorrectFallDurationMs(120) === Math.round((100000 / 120) * 5));
check('a game without items gets the demo set', cc.items.length === 4 && cc.items.filter((i) => i.correct).length === 2);
check('authored items are kept as they are', rules.normalizeCatchCorrectConfig({ items: [{ label: 'x', correct: true }] }).items.length === 1);

check('a drop inside the tolerance is a hit', rules.isShadowMatchHit(40, 100, 80) && !rules.isShadowMatchHit(43, 100, 80));
check('a near miss is wider than a hit', rules.isShadowMatchNearMiss(48, 100, 80) && !rules.isShadowMatchNearMiss(51, 100, 80));
check('a picture on its own shadow is placed, whatever else is near', rules.judgeShadowMatchDrop(true, false) === 'hit' && rules.judgeShadowMatchDrop(true, true) === 'hit');
check('a picture on another shadow is a mistake', rules.judgeShadowMatchDrop(false, true) === 'wrong');
check('a picture let slip on the way is not a mistake', rules.judgeShadowMatchDrop(false, false) === 'stray');

section('Sort Bins: the tray is filled, and its tiles stand in the middle');
{
  // A phone on its side: the tray under the two groups.
  const tray = rules.layoutSortBinsTray(694, 113, 6);
  check('six tiles are far bigger than the old fixed 82', tray.tile >= 98, JSON.stringify(tray));
  check('they stand in one line and fit', tray.columns === 6 && tray.width <= 694 && tray.tile <= 113);
  check('in the middle of the tray', Math.abs(tray.left + tray.width / 2 - 694 / 2) <= 1);

  const beside = rules.layoutSortBinsTray(694, 113, 6, 40);
  check('a speaker in the corner moves them no further than it must', beside.left === 40 && beside.left + beside.width <= 694, JSON.stringify(beside));
  const few = rules.layoutSortBinsTray(694, 113, 3, 40);
  check('a few tiles stay in the middle whatever the corner holds', Math.abs(few.left + few.width / 2 - 694 / 2) <= 1 && few.tile <= 113);

  const many = rules.layoutSortBinsTray(500, 150, 12);
  check('a full tray breaks into lines', many.columns < 12 && many.tile > 0 && many.width <= 500, JSON.stringify(many));
  check('a big screen makes no giants', rules.layoutSortBinsTray(1600, 400, 4).tile === rules.SORT_BINS_TILE_MAX);
  check('no tray, no sizes', rules.layoutSortBinsTray(0, 0, 6).tile === 0);

  check('a sorted thing stays close to a tile', rules.sortBinsSortedSide(340, 140, 3, 100) === 86);
  check('but all of a group must fit', rules.sortBinsSortedSide(340, 140, 6, 100) < 86 && rules.sortBinsSortedSide(340, 140, 6, 100) > 0);
  const squares = rules.fitSquares(300, 100, 6, 10);
  check('squares take the grid that makes them biggest', squares.columns === 3 && squares.rows === 2 && squares.side === 45, JSON.stringify(squares));
}

section('Memory Cards: the board fills the stage');
{
  // A phone on its side: the band on top, the camera's cut-out at both ends, the home bar below.
  const insets = { top: 68, left: 59, right: 59, bottom: 21 };
  const speaker = [{ left: 0, top: 393 - 100, width: 104, height: 100 }];
  const inside = (l) => l.left >= insets.left && l.left + l.width <= 852 - insets.right && l.top >= insets.top && l.top + l.height <= 393 - insets.bottom;
  const clearOf = (l) => !(l.left < 104 && l.top + l.height > 393 - 100);

  const six = rules.layoutMemoryCards(852, 393, 6, insets, speaker);
  check('six cards stand three by two', six.columns === 3 && six.rows === 2, JSON.stringify(six));
  check('a card fills its cell: wider than tall on a phone on its side', six.cardWidth > six.cardHeight && six.cardWidth <= six.cardHeight * 1.3 + 1);
  check('and is far bigger than the old 106 by 140', six.cardWidth >= 160 && six.cardHeight >= 130);
  check('the board stays inside the edges', inside(six));
  check('a board that fits beside the speaker stays in the middle of the stage', Math.abs(six.left + six.width / 2 - 852 / 2) <= 1);

  const twelve = rules.layoutMemoryCards(852, 393, 12, insets, speaker);
  check('twelve cards stand six by two', twelve.columns === 6 && twelve.rows === 2, JSON.stringify(twelve));
  check('a board as wide as the stage keeps out of the speaker corner', clearOf(twelve) && inside(twelve));

  const free = rules.layoutMemoryCards(852, 393, 12, insets);
  check('without a speaker the same board takes the whole width', free.cardWidth >= twelve.cardWidth && Math.abs(free.left + free.width / 2 - 852 / 2) <= 1);

  const desk = rules.layoutMemoryCards(1600, 900, 4);
  check('a big screen makes no giants', desk.cardWidth <= rules.MEMORY_CARD_MAX_SIDE && desk.cardHeight <= rules.MEMORY_CARD_MAX_SIDE, JSON.stringify(desk));
  check('no stage, no sizes', rules.layoutMemoryCards(0, 0, 6).cardWidth === 0);

  const colours = Array.from({ length: 12 }, (_, i) => rules.memoryCardColor(i, 6));
  const alike = colours.some((c, i) => (i % 6 > 0 && c === colours[i - 1]) || (i >= 6 && c === colours[i - 6]));
  check('no two neighbouring cards have the same back', !alike);
  check('a card has its colour by its place alone', rules.memoryCardColor(4, 6) === rules.memoryCardColor(4, 6));
}

section('Pattern Next: the row and the cards fill the room');
{
  // A phone on its side, less the chrome, its edges and the speaker's strip.
  const phone = rules.layoutPatternNext(614, 292, 5, 2);
  const tall = (l, lines) => lines * l.item + (lines - 1) * l.itemGap + l.rowGap + l.choice;
  check('on a phone the row is far bigger than the old fixed 76', phone.item >= 100, JSON.stringify(phone));
  check('and its cards bigger than the old fixed 96', phone.choice >= 110 && phone.choice >= phone.item);
  check('a short row stands in one line', phone.perLine === 5);
  check('the group fits the height', tall(phone, 1) <= 292);
  check('the row fits the width', 5 * phone.item + 4 * phone.itemGap <= 614);
  check('the group takes most of the height, not a strip of it', tall(phone, 1) >= 292 * 0.8);

  const long = rules.layoutPatternNext(614, 292, 13, 3);
  check('a long row is broken in two lines', long.perLine === 7, JSON.stringify(long));
  check('and still fits', tall(long, 2) <= 292 && 7 * long.item + 6 * long.itemGap <= 614);
  check('its cards stay in scale with it', long.choice <= long.item * 1.35 + 1);

  const counts = rules.layoutPatternNext(614, 292, 5, 2, true);
  check('a pattern of counts is drawn bigger', counts.item > phone.item && counts.choice > phone.choice, JSON.stringify(counts));
  check('and fits too', tall(counts, 1) <= 292);

  const desk = rules.layoutPatternNext(1500, 900, 5, 2);
  check('a big screen does not make giants', desk.item <= 190 && desk.choice <= 220, JSON.stringify(desk));
  check('no room, no sizes', rules.layoutPatternNext(0, 0, 5, 2).item === 0);
}

const ddmSource = {
  zones: Array.from({ length: 8 }, (_, i) => ({ match_key: 'k' + i, x: 10, y: 10, width: 10, height: 10 })),
  items: Array.from({ length: 8 }, (_, i) => ({ image: 'https://x/' + i + '.png', match_key: 'k' + i })),
};
const trays = Array.from({ length: 12 }, () => rules.normalizeDragDropMatchConfig(ddmSource).items.map((i) => i.matchKey).join());
check('drag & drop keeps every item', rules.normalizeDragDropMatchConfig(ddmSource).items.length === 8);
check('and shuffles the tray', new Set(trays).size > 1);

section('board geometry is the same on every stage');

const same = rules.getDragDropMatchSceneMetrics(1600, 900, 1600, 900);
check('a board that fits is drawn 1:1', same.coverScale === 1 && same.offsetX === 0 && same.offsetY === 0);
check('landscape keeps a left inset', Math.abs(same.leftSafeInset - 171) < 0.001);
const centredZone = rules.getDragDropMatchZoneRect({ x: 50, y: 50, width: 10, height: 10 }, same);
check('a zone lands where it was authored', centredZone.left === 800 && centredZone.top === 450 && centredZone.width === 160 && centredZone.height === 90);

// A square stage showing a 16:9 board: the picture covers the stage, so it
// overflows horizontally and a zone authored at 50% still starts mid-stage.
const square = rules.getDragDropMatchSceneMetrics(800, 800, 1600, 900);
const squareZone = rules.getDragDropMatchZoneRect({ x: 50, y: 50, width: 10, height: 10 }, square);
check('a covered board keeps the authored edge where it was authored', Math.abs(squareZone.left - 400) < 0.01);
check('unmeasured stages fall back to raw percentages', rules.layoutDragDropMatchZones({ width: 0, height: 0 }, { zones: [{ x: 50, y: 50, width: 10, height: 10 }], board_width: 1600, board_height: 900 })[0].width === 0);

const hotspot = rules.layoutSelectOptionItems({ width: 1600, height: 900 }, { items: [{ id: 'a', x: 50, y: 50, width: 10, height: 10 }], board_width: 1600, board_height: 900 })[0];
check('a hotspot lands where it was authored', hotspot.id === 'a' && hotspot.left === 800 && hotspot.top === 450 && hotspot.width === 160 && hotspot.height === 90);
const tinyHotspot = rules.layoutSelectOptionItems({ width: 1600, height: 900 }, { items: [{ id: 'b', x: 50, y: 50, width: 1, height: 1 }], board_width: 1600, board_height: 900 })[0];
check('a tiny hotspot is grown to a tappable size', tinyHotspot.width >= 900 * 0.08 - 0.001);
check('no hotspots before the stage is measured', rules.layoutSelectOptionItems({ width: 0, height: 0 }, { items: [{ id: 'a', x: 1, y: 1, width: 1, height: 1 }], board_width: 1, board_height: 1 }).length === 0);

check('timings are published for every game', Object.keys(rules.GAME_TIMINGS).length === 20);
check('failure reasons are named', rules.FAILURE_REASON.wrongCatch === 'wrong_catch' && rules.FAILURE_REASON.livesOut === 'lives_out');


section('every playable kind is registered');

const playableKinds = Object.keys(rules.GAME_KIND_KEYS);
check('twenty kinds, generic excluded', playableKinds.length === 20 && !playableKinds.includes('generic'));
check('each kind resolves to itself', playableKinds.every((kind) => rules.resolveGameKind(kind.replace(/-/g, '_'), {}) === kind), playableKinds.filter((kind) => rules.resolveGameKind(kind.replace(/-/g, '_'), {}) !== kind).join());
check('each kind has timings', playableKinds.every((kind) => rules.GAME_TIMINGS_BY_KIND[kind] === rules.GAME_TIMINGS[rules.GAME_KIND_KEYS[kind]]));
check('no timing key is orphaned', Object.keys(rules.GAME_TIMINGS).every((key) => Object.values(rules.GAME_KIND_KEYS).includes(key)));


section('svg_assemble lists the pictures a composed scene loads');

{
  const url = (name) => `https://example.test/uploads/${name}.png`;
  const piece = (name) => `<svg viewBox="0 0 10 10"><image href="${url(name)}" width="10" height="10"/></svg>`;
  const config = rules.normalizeSvgAssembleConfig(game('svg_assemble', {}), {
    question_svg: `<svg viewBox="0 0 400 300"><image href="${url('farm')}" width="400" height="300"/><image href="${url('cow')}"/><image id="slot_1" xlink:href="${url('dog-shadow')}?v=1&amp;x=2" x="1" y="1" width="80" height="120"/></svg>`,
    slots: [{ id: 'slot_1', x: 1, y: 1, width: 80, height: 120 }],
    answers: [
      { id: 'dog', svg: piece('dog'), is_correct: true, slot: 'slot_1' },
      { id: 'cat', svg: piece('cat'), is_correct: false },
      { id: 'cow', svg: piece('cow'), is_correct: false },
    ],
  });

  check('scene pictures first, then the pieces, each once', JSON.stringify(config.imageUris) === JSON.stringify([
    url('farm'), url('cow'), `${url('dog-shadow')}?v=1&x=2`, url('dog'), url('cat'),
  ]), JSON.stringify(config.imageUris));

  const inline = rules.normalizeSvgAssembleConfig(game('svg_assemble', {}), {
    question_svg: '<svg viewBox="0 0 10 10"><rect id="slot_1" width="5" height="5"/><image href="data:image/png;base64,AAAA"/><use href="#a"/></svg>',
    answers: [{ svg: '<svg viewBox="0 0 5 5"><rect width="5" height="5"/></svg>', is_correct: true, slot: 'slot_1' }],
  });
  check('a hand-made scene has nothing to load', Array.isArray(inline.imageUris) && inline.imageUris.length === 0, JSON.stringify(inline.imageUris));
}

section('count_pick: a scene composed by the author');

{
  const url = (name) => `https://example.test/uploads/${name}.webp`;
  const composed = rules.normalizeCountPickConfig({
    image: url('duck'),
    count: 2,
    bg_image: url('bg-pond'),
    board_width: 1600,
    board_height: 1200,
    placements: [
      { image: url('duck'), x: 10, y: 50, width: 20, height: 25 },
      { image: url('duck'), x: 40, y: 55, width: 20, height: 25 },
      { image: url('frog'), x: 90, y: 90, width: 20, height: 20 },
      { image: '', x: 1, y: 1, width: 5, height: 5 },
    ],
  });

  check('every valid placement is kept, counted and decoy', composed.placements.length === 3, JSON.stringify(composed.placements));
  check('a scene that does not say counts every copy of the counted picture',
    composed.placements.map((placement) => placement.counted).join() === 'true,true,false');

  const ruled = rules.normalizeCountPickConfig({
    image: url('duck'),
    count: 2,
    board_width: 1600,
    board_height: 1200,
    placements: [
      { image: url('duck'), x: 10, y: 50, width: 20, height: 25, counted: true },
      { image: url('fish'), x: 40, y: 55, width: 20, height: 25, counted: true },
      { image: url('hen'), x: 70, y: 55, width: 20, height: 25, counted: false },
    ],
  });
  check('a scene that says is believed: different pictures may count together',
    ruled.placements.map((placement) => placement.counted).join() === 'true,true,false');
  check('a placement over the edge is clipped to the board', composed.placements[2].width === 10 && composed.placements[2].height === 10);
  check('the count is the authored one', composed.count === 2 && composed.choices.some((choice) => choice.isCorrect && choice.value === 2));
  check('the board is the background size', composed.board && composed.board.width === 1600 && composed.board.height === 1200);
  check('the pictures are listed for preloading, each once', JSON.stringify(composed.imageUris) === JSON.stringify([url('bg-pond'), url('duck'), url('frog')]), JSON.stringify(composed.imageUris));

  const classic = rules.normalizeCountPickConfig({ image: url('duck'), count: 4 });
  check('the classic game has no placements and no board', classic.placements.length === 0 && classic.board === null);
  check('and still preloads its picture', JSON.stringify(classic.imageUris) === JSON.stringify([url('duck')]));

  const fitted = rules.fitCountPickBoard(1000, 500, { width: 1600, height: 1200 });
  check('the board keeps its aspect ratio inside the space', Math.round(fitted.width) === 667 && fitted.height === 500, JSON.stringify(fitted));
  const wide = rules.fitCountPickBoard(400, 900, { width: 1600, height: 1200 });
  check('and is limited by the narrower side', wide.width === 400 && wide.height === 300, JSON.stringify(wide));
}

section('drag_drop_match: the scene zone style');

{
  const base = {
    zones: [{ match_key: 'a', x: 10, y: 20, width: 30, height: 40, prompt_type: 'image', prompt_image: 'https://example.test/a-shadow.png' }],
    items: [{ match_key: 'a', image: 'https://example.test/a.png' }],
  };
  check('scene is kept', rules.normalizeDragDropMatchConfig({ ...base, zone_style: 'scene' }).zone_style === 'scene');
  check('outline and card still are what they were', rules.normalizeDragDropMatchConfig({ ...base, zone_style: 'outline' }).zone_style === 'outline'
    && rules.normalizeDragDropMatchConfig({ ...base, zone_style: 'whatever' }).zone_style === 'card');
  check('fitSceneBoard is what fitCountPickBoard was', rules.fitCountPickBoard === rules.fitSceneBoard
    && JSON.stringify(rules.fitSceneBoard(1000, 500, { width: 1600, height: 1200 })) === JSON.stringify(rules.fitCountPickBoard(1000, 500, { width: 1600, height: 1200 })));
}

section('select_option: the scene layout');

{
  const items = [{ image: 'https://example.test/a.png', x: 10, y: 20, width: 30, height: 40, is_correct: true }];
  check('scene is kept', rules.normalizeSelectOptionConfig({ items, layout: 'scene' }).layout === 'scene');
  check('anything else is the free layout', rules.normalizeSelectOptionConfig({ items }).layout === 'free'
    && rules.normalizeSelectOptionConfig({ items, layout: 'grid' }).layout === 'free');
  const scene = rules.normalizeSelectOptionConfig({ items, layout: 'scene' });
  check('the authored box is kept as it is', scene.items[0].x === 10 && scene.items[0].y === 20 && scene.items[0].width === 30 && scene.items[0].height === 40, JSON.stringify(scene.items[0]));
}

section('scenes cover the whole stage');

{
  const board = { width: 1600, height: 1200 }; // 4:3
  const plain = rules.coverSceneBoard(1000, 500, board);
  check('the background covers the stage', plain.width >= 1000 && plain.height >= 500 && plain.width === 1000, JSON.stringify(plain));
  check('with no content the crop is even', plain.left === 0 && Math.abs(plain.top - -(750 - 500) / 2) < 1e-9, JSON.stringify(plain));

  const low = rules.coverSceneBoard(1000, 500, board, [{ x: 10, y: 70, width: 20, height: 25 }]);
  const lowRect = rules.sceneBoxToStage({ x: 10, y: 70, width: 20, height: 25 }, low);
  check('content low in the picture pulls the crop down so it stays in view', lowRect.top >= 0 && lowRect.top + lowRect.height <= 500 + 1e-9, JSON.stringify(lowRect));
  check('but never past the picture\'s edge', low.top >= 500 - low.height - 1e-9 && low.top <= 0);

  const wide = rules.coverSceneBoard(400, 900, board, [{ x: 0, y: 0, width: 100, height: 100 }]);
  check('a tall stage covers by height and crops the sides', wide.height === 900 && wide.width === 1200 && wide.left < 0);

  const empty = rules.coverSceneBoard(0, 500, board);
  check('no stage yet, no board', empty.width === 0 && empty.scale === 0);
}

section('answer overlays keep off the content');

{
  const free = rules.placeSceneOverlay(1000, 600, 300, 100, []);
  check('the bottom centre when nothing is in the way', free.spot === 'bottom' && Math.round(free.left) === 350);

  const bottomBusy = rules.placeSceneOverlay(1000, 600, 300, 100, [{ left: 300, top: 420, width: 400, height: 170 }]);
  check('another spot when the bottom centre covers content', bottomBusy.spot !== 'bottom', bottomBusy.spot);

  const inset = rules.placeSceneOverlay(1000, 600, 300, 100, [], { bottom: 50 });
  check('insets keep it clear of the stage controls', inset.top + 100 <= 600 - 50);
}

section('svg_assemble scene layout');

{
  const viewBox = { minX: 0, minY: 0, width: 1600, height: 900 };
  const slots = [{ id: 'fox', x: 200, y: 100, width: 300, height: 300 }];
  const layout = rules.layoutSvgAssembleScene(1000, 700, viewBox, slots, 3, false);
  check('the scene covers the whole stage', layout.board.height === 700 && layout.board.width >= 1000 && layout.board.left <= 0 && layout.board.left + layout.board.width >= 1000, JSON.stringify(layout.board));
  const slot = layout.slots[0];
  check('the slot follows the scene', Math.abs(slot.left - (layout.board.left + 200 * layout.board.width / 1600)) < 1e-6 && Math.abs(slot.top - 100 * layout.board.height / 900) < 1e-6, JSON.stringify(slot));
  check('the slot stays in view', slot.left >= 0 && slot.left + slot.width <= 1000);
  const overlaps = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
  check('the tray keeps off the slot', !overlaps(layout.tray, slot), JSON.stringify({ tray: layout.tray, slot }));
  check('three cards inside the tray', layout.cards.length === 3 && layout.cards.every((card) => card.left >= layout.tray.left && card.left + card.width <= layout.tray.left + layout.tray.width + 1e-6 && card.top >= layout.tray.top && card.top + card.height <= layout.tray.top + layout.tray.height + 1e-6));
  check('a piece starts from its tile in the card', layout.options[1].left === layout.cards[1].left + 12 && layout.options[1].width === layout.imageSize);

  const lowSlots = [{ id: 'hen', x: 600, y: 600, width: 400, height: 280 }];
  const low = rules.layoutSvgAssembleScene(1000, 700, viewBox, lowSlots, 2, true, { top: 80 });
  check('a slot at the bottom sends the tray elsewhere', low.traySpot !== 'bottom' && !overlaps(low.tray, low.slots[0]), low.traySpot);
  check('the inset keeps the tray under the stage controls', low.tray.top >= 80);
  check('labels make the cards taller than wide', low.labelHeight === 22 && low.cards[0].height === low.cards[0].width + 22);

  check('no stage yet, no layout', rules.layoutSvgAssembleScene(0, 700, viewBox, slots, 3, false) === null);
  check('no answers, no layout', rules.layoutSvgAssembleScene(1000, 700, viewBox, slots, 0, false) === null);
}

section('answer_choice stacked: the question on top, nearly square answers under it');

{
  const fits = (layout, width, height) =>
    layout.questionHeight + layout.rows * (layout.cardHeight + layout.gap) <= height + 1e-6
    && layout.gridWidth <= width + 1e-6 && layout.questionWidth <= width + 1e-6;
  const wide = rules.layoutAnswerChoiceStack(1100, 690, 4);
  check('a landscape stage puts four answers in one row', wide.columns === 4 && wide.rows === 1, JSON.stringify(wide));
  check('the cards are nearly square', Math.abs(wide.cardWidth / wide.cardHeight - rules.ANSWER_CHOICE_STACK.cardAspect) < 0.02);
  check('the question is the biggest thing on the stage', wide.questionHeight >= wide.cardHeight * rules.ANSWER_CHOICE_STACK.minQuestionScale
    && wide.questionHeight <= wide.cardHeight * rules.ANSWER_CHOICE_STACK.maxQuestionScale + 1);
  const portrait = rules.layoutAnswerChoiceStack(360, 640, 4);
  check('a portrait stage takes two columns', portrait.columns === 2 && portrait.rows === 2, JSON.stringify(portrait));
  const five = rules.layoutAnswerChoiceStack(1100, 690, 5);
  check('five answers: three and two, the cards bigger than five in a row', five.columns === 3 && five.rows === 2, JSON.stringify(five));
  const cases = [[1100, 690, 2], [1100, 690, 3], [1100, 690, 6], [760, 280, 4], [760, 280, 6], [360, 640, 4], [1800, 950, 4], [500, 300, 3]];
  check('everything fits the area', cases.every(([w, h, n]) => fits(rules.layoutAnswerChoiceStack(w, h, n), w, h)),
    JSON.stringify(cases.filter(([w, h, n]) => !fits(rules.layoutAnswerChoiceStack(w, h, n), w, h))));
  check('a card stops growing on a big stage', rules.layoutAnswerChoiceStack(3000, 2000, 2).cardHeight === rules.ANSWER_CHOICE_STACK.maxCardHeight);
}

section('scene safe areas: the content and the answers never touch, nothing leaves the stage');

{
  const inside = (rect, frame) => rect.left >= frame.left - 1e-6 && rect.top >= frame.top - 1e-6
    && rect.left + rect.width <= frame.left + frame.width + 1e-6 && rect.top + rect.height <= frame.top + frame.height + 1e-6;
  const overlaps = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
  const distance = (a, b) => Math.max(
    b.left - (a.left + a.width), a.left - (b.left + b.width),
    b.top - (a.top + a.height), a.top - (b.top + b.height),
  );

  const frame = { left: 0, top: 0, width: 1000, height: 600 };
  const tall = rules.fitSceneRect({ left: 400, top: -100, width: 200, height: 400 }, frame);
  check('cut at the top: shrunk, feet where they were', inside(tall, frame) && tall.top === 0 && tall.top + tall.height === 300 && tall.width < 200, JSON.stringify(tall));
  check('and it keeps its proportions', Math.abs(tall.width / tall.height - 0.5) < 1e-9);
  const sunk = rules.fitSceneRect({ left: 400, top: 450, width: 200, height: 300 }, frame);
  check('cut at the bottom: moved up whole', sunk.width === 200 && sunk.height === 300 && sunk.top === 300, JSON.stringify(sunk));
  const side = rules.fitSceneRect({ left: -50, top: 100, width: 200, height: 200 }, frame);
  check('cut on the left: shrunk towards its right side, standing where it stood', inside(side, frame) && side.left === 0 && side.left + side.width === 150 && side.top + side.height === 300, JSON.stringify(side));
  const far = rules.fitSceneRect({ left: -190, top: 100, width: 200, height: 200 }, frame);
  check('mostly out: shrunk no further than the minimum, then moved in', inside(far, frame) && Math.abs(far.width - 200 * rules.SCENE_SAFE_AREA.minScale) < 1e-9, JSON.stringify(far));
  const kept = { left: 100, top: 100, width: 50, height: 50 };
  check('a picture that fits is left alone', rules.fitSceneRect(kept, frame) === kept);

  // The savanna scene: a tall giraffe at the top, a camel low on the right.
  const board = { width: 1600, height: 1200 };
  const content = [
    { x: 73.5, y: 58.2, width: 20, height: 28.6 }, // camel
    { x: 13.3, y: 21, width: 8.6, height: 14.7 }, // monkey
    { x: 43.8, y: 4.7, width: 18.8, height: 45.6 }, // giraffe
    { x: 11.5, y: 50.3, width: 19.6, height: 26 }, // cheetah
  ];
  for (const [width, height, insets] of [[1250, 747, {}], [844, 390, { top: 68 }], [1024, 768, {}], [700, 900, {}]]) {
    const scene = rules.layoutScene(width, height, board, content, { width: 460, height: 150 }, insets);
    const label = `${width}x${height}`;
    check(`${label}: the background still covers the stage`, scene.cover.left <= 0 && scene.cover.top <= 0
      && scene.cover.left + scene.cover.width >= width - 1e-6 && scene.cover.top + scene.cover.height >= height - 1e-6);
    check(`${label}: every picture is whole, inside the frame`, scene.content.every((rect) => inside(rect, scene.frame)), JSON.stringify(scene.content));
    check(`${label}: the frame keeps clear of the controls`, scene.frame.top >= (insets.top ?? 0));
    check(`${label}: the answers keep a gap from every picture`,
      scene.content.every((rect) => distance(rect, scene.overlay) >= Math.min(width, height) * rules.SCENE_SAFE_AREA.gap - 1e-6),
      JSON.stringify({ overlay: scene.overlay, content: scene.content }));
    check(`${label}: the answers stay on the stage`, inside(scene.overlay, { left: 0, top: insets.top ?? 0, width, height: height - (insets.top ?? 0) }));
  }

  const wide = rules.layoutScene(1250, 747, board, content, { width: 460, height: 150 });
  const giraffe = rules.sceneBoxToStage(content[2], wide.cover);
  check('the giraffe the crop cut is shrunk, its feet where they were', wide.content[2].height < giraffe.height
    && Math.abs(wide.content[2].top + wide.content[2].height - (giraffe.top + giraffe.height)) < 1e-6, JSON.stringify({ giraffe, fitted: wide.content[2] }));
  check('the answers stay at the bottom when a nudge clears them', wide.overlay.spot === 'bottom');

  // A voice button in the bottom-left corner, and the bottom centre taken.
  const corner = { left: 0, top: 480, width: 120, height: 120 };
  const busy = [{ x: 30, y: 60, width: 40, height: 40 }, { x: 5, y: 70, width: 20, height: 25 }];
  const guarded = rules.layoutScene(1000, 600, { width: 1000, height: 600 }, busy, { width: 300, height: 110 }, {}, [corner]);
  check('the answers never go over a player button', !overlaps(guarded.overlay, corner), JSON.stringify(guarded.overlay));
  check('the pictures keep clear of it too', guarded.content.every((rect) => !overlaps(rect, corner)), JSON.stringify(guarded.content));
  const blocked = rules.placeSceneOverlay(1000, 600, 300, 110, [{ left: 350, top: 400, width: 300, height: 200 }], {}, [corner]);
  check('a spot over a button is skipped even when it covers nothing', blocked.spot !== 'bottom-left' && blocked.spot !== 'bottom', blocked.spot);

  const bare = rules.layoutScene(1000, 600, board, content);
  check('no answers: no overlay, and the pictures still fit', bare.overlay === null && bare.content.every((rect) => inside(rect, bare.frame)));

  // A phone lying on its side: the band of the player on top, the camera and
  // the system's buttons at the sides, the speaker in its corner. The frame
  // is so low that pictures lifted into it and moved from under the answers
  // came to stand over one another.
  const phone = { width: 800, height: 360, insets: { top: 92, left: 37, right: 39 }, speaker: { left: 0, top: 281, width: 111, height: 79 } };
  const apart = (list) => list.every((rect, index) => list.every((other, at) => at <= index || !overlaps(rect, other)));
  // Things to count as the importer scatters them: one row on the ground, nearer and farther.
  const scattered = (count, seed) => {
    let state = seed;
    const next = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const rows = count <= 5 ? 1 : 2;
    const perRow = Math.ceil(count / rows);
    return Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / perRow);
      const inRow = Math.min(perRow, count - row * perRow);
      const slot = 88 / inRow;
      const depth = next();
      const height = (rows === 1 ? 34 : 23) * (1 - 0.24 * depth);
      const width = Math.min(height * 0.5, slot * 0.84);
      const centre = 6 + slot * (index - row * perRow + 0.5) + (next() - 0.5) * 0.86 * (slot - width);
      const bottom = 90 - row * 26 - depth * (rows === 1 ? 20 : 3);
      return { x: centre - width / 2, y: bottom - height, width, height };
    });
  };
  let scenes = 0;
  let clean = 0;
  let whole = 0;
  for (let count = 2; count <= 9; count += 1) {
    for (let seed = 1; seed <= 25; seed += 1) {
      const boxes = scattered(count, seed * 977 + count);
      const scene = rules.layoutScene(phone.width, phone.height, { width: 1600, height: 900 }, boxes, { width: 304, height: 96 }, phone.insets, [phone.speaker]);
      scenes += 1;
      if (apart(scene.content)) clean += 1;
      if (scene.content.every((rect) => inside(rect, scene.frame) && !overlaps(rect, phone.speaker)
        && distance(rect, scene.overlay) >= phone.height * rules.SCENE_SAFE_AREA.gap - 1e-6)) whole += 1;
    }
  }
  check('on a phone on its side no picture stands over another', clean === scenes, clean + ' of ' + scenes);
  check('and each is still whole, clear of the answers and of the speaker', whole === scenes, whole + ' of ' + scenes);

  const calm = scattered(4, 4885);
  const roomy = rules.layoutScene(1250, 747, { width: 1600, height: 900 }, calm, { width: 460, height: 150 });
  check('with room for all of them nothing is moved', roomy.content.every((rect, index) => {
    const was = rules.sceneBoxToStage(calm[index], roomy.cover);
    return Math.abs(rect.left - was.left) < 1e-6 && Math.abs(rect.top - was.top) < 1e-6 && Math.abs(rect.width - was.width) < 1e-6;
  }), JSON.stringify(roomy.content));

  // Answers as big as the stage leave no free place: nothing is made smaller for nothing.
  const smothered = rules.layoutScene(800, 400, { width: 1600, height: 1200 }, calm, { width: 800, height: 400 });
  check('with no free place at all the pictures keep their size', smothered.content.every((rect, index) =>
    Math.abs(rect.width - rules.sceneBoxToStage(calm[index], smothered.cover).width) < 1e-6), JSON.stringify(smothered.content));

  // A bird on a tree: put over one another on purpose, and left so.
  const perched = [{ x: 30, y: 20, width: 30, height: 60 }, { x: 40, y: 25, width: 8, height: 10 }];
  const tree = rules.layoutScene(1000, 600, { width: 1000, height: 600 }, perched);
  check('pictures put over one another on purpose stay so', overlaps(tree.content[0], tree.content[1])
    && Math.abs(tree.content[1].left - 400) < 1e-6 && Math.abs(tree.content[1].top - 150) < 1e-6, JSON.stringify(tree.content));

  const insetCover = rules.coverSceneBoard(1000, 500, { width: 1600, height: 1200 }, [{ x: 40, y: 0, width: 20, height: 20 }], { top: 100 });
  const plainCover = rules.coverSceneBoard(1000, 500, { width: 1600, height: 1200 }, [{ x: 40, y: 0, width: 20, height: 20 }]);
  check('the crop centres content in the part the controls leave free', insetCover.top === 0 && plainCover.top === 0
    && rules.coverSceneBoard(1000, 500, { width: 1600, height: 1200 }, [{ x: 40, y: 40, width: 20, height: 20 }], { top: 100 }).top
      > rules.coverSceneBoard(1000, 500, { width: 1600, height: 1200 }, [{ x: 40, y: 40, width: 20, height: 20 }]).top);
}

section('svg_assemble: a composed scene is rearranged to its safe layout');

{
  const viewBox = { minX: 0, minY: 0, width: 1600, height: 1200 };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">'
    + '<image href="https://example.test/bg.png" x="0" y="0" width="1600" height="1200" preserveAspectRatio="none"/>'
    + '<image id="layer_1" href="https://example.test/giraffe.png" x="700" y="56" width="300" height="547" preserveAspectRatio="none"/>'
    + '<image id="slot_1" href="https://example.test/camel-shadow.png" x="1176" y="698" width="320" height="343" preserveAspectRatio="none"/>'
    + '</svg>';
  const config = rules.normalizeSvgAssembleConfig(game('svg_assemble', {}), {
    question_svg: svg,
    slots: [{ id: 'slot_1', x: 1176, y: 698, width: 320, height: 343 }],
    layers: [{ id: 'layer_1', x: 700, y: 56, width: 300, height: 547 }],
    answers: [
      { id: 'a', svg: '<svg/>', is_correct: true, slot: 'slot_1' },
      { id: 'b', svg: '<svg/>', is_correct: false },
      { id: 'c', svg: '<svg/>', is_correct: false },
    ],
  });
  check('the layers of a composed scene are read', Array.isArray(config.layers) && config.layers[0].id === 'layer_1' && config.layers[0].height === 547);
  check('a hand-made scene has none', rules.normalizeSvgAssembleConfig(game('svg_assemble', {}), { question_svg: svg }).layers === null);

  const layout = rules.layoutSvgAssembleScene(1250, 747, viewBox, config.slots, 3, false, {}, config.layers);
  const frame = { left: 0, top: 0, width: 1250, height: 747 };
  const within = (rect) => rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= frame.width && rect.top + rect.height <= frame.height;
  check('the giraffe is whole on the stage', within(layout.layers[0]), JSON.stringify(layout.layers[0]));
  const gap = (a, b) => Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width), b.top - (a.top + a.height), a.top - (b.top + b.height));
  check('the slot keeps a gap from the tray', gap(layout.slots[0], layout.tray) >= 747 * rules.SCENE_SAFE_AREA.gap - 1e-6, JSON.stringify({ slot: layout.slots[0], tray: layout.tray }));

  const arranged = rules.arrangeSvgAssembleScene(svg, viewBox, layout);
  const read = (id) => {
    const tag = arranged.match(new RegExp(`<image[^>]*id="${id}"[^>]*>`))[0];
    const value = (name) => Number(tag.match(new RegExp(`\\s${name}="([^"]*)"`))[1]);
    return { x: value('x'), y: value('y'), width: value('width'), height: value('height') };
  };
  const unit = 1600 / layout.board.width;
  const giraffe = read('layer_1');
  check('the markup draws the giraffe where the layout put it', Math.abs(giraffe.y - (layout.layers[0].top - layout.board.top) * unit) < 0.01
    && Math.abs(giraffe.height - layout.layers[0].height * unit) < 0.01, JSON.stringify(giraffe));
  const shadow = read('slot_1');
  check('and the silhouette where its slot is', Math.abs(shadow.x - (layout.slots[0].left - layout.board.left) * unit) < 0.01, JSON.stringify(shadow));
  check('the background is untouched', arranged.includes('href="https://example.test/bg.png" x="0" y="0" width="1600" height="1200"'));
}

section('connect_pairs: two groups, joined pair by pair');

{
  ['connect_pairs', 'match_pairs', 'matching_pairs', 'make_pairs', 'pair_match', 'draw_lines'].forEach((type) => {
    check(`${type} resolves to connect-pairs`, rules.resolveGameKind(type, { pairs: [] }) === 'connect-pairs');
  });
  check('memory keeps its own type even with pairs', rules.resolveGameKind('memory_cards', { pairs: [] }) === 'memory-cards');

  const face = (value) => (value.startsWith('http') ? { type: 'image', value } : { type: 'text', value });
  const authored = {
    bg_image: 'https://example.test/room.png',
    time_limit: '60',
    pairs: [
      { id: 'sock', left: face('https://example.test/sock.png'), right: face('https://example.test/shoe.png') },
      { id: 'key', a: 'https://example.test/key.png', b: 'https://example.test/lock.png' },
      { id: 'cup', left: face('https://example.test/cup.png'), right: face('saucer') },
      { id: 'broken', left: face('https://example.test/bed.png') },
      { id: 'sock', left: face('A'), right: face('a') },
    ],
  };
  const config = rules.normalizeConnectPairsConfig(authored);
  check('a pair needs both faces', config.pairs.length === 4, JSON.stringify(config.pairs.map((pair) => pair.id)));
  check('pairs read from left/right or a/b', config.pairs[1].left.value === 'https://example.test/key.png' && config.pairs[1].right.value === 'https://example.test/lock.png');
  check('a face may be a word', config.pairs[2].right.type === 'text' && config.pairs[2].right.value === 'saucer');
  check('ids stay unique', new Set(config.pairs.map((pair) => pair.id)).size === 4, JSON.stringify(config.pairs.map((pair) => pair.id)));
  check('lives default to three, the timer is read', config.lives === 3 && config.time_limit === 60);
  check('every picture is preloaded, words are not', config.imageUris.length === 6 && config.imageUris.includes('https://example.test/room.png') && !config.imageUris.includes('saucer'), JSON.stringify(config.imageUris));

  const many = rules.normalizeConnectPairsConfig({
    pairs: Array.from({ length: 9 }, (_, index) => ({ id: `p${index}`, left: face(`L${index}`), right: face(`R${index}`) })),
  });
  check(`at most ${rules.CONNECT_PAIRS_MAX} pairs`, rules.CONNECT_PAIRS_MAX === 6 && many.pairs.length === 6);

  let orders = true;
  let across = true;
  for (let round = 0; round < 200; round += 1) {
    const shuffled = rules.normalizeConnectPairsConfig({
      pairs: Array.from({ length: 2 + (round % 5) }, (_, index) => ({ id: `p${index}`, left: face(`L${index}`), right: face(`R${index}`) })),
    });
    const ids = shuffled.pairs.map((pair) => pair.id).sort().join();
    orders = orders && [...shuffled.leftOrder].sort().join() === ids && [...shuffled.rightOrder].sort().join() === ids;
    across = across && shuffled.rightOrder.every((id, index) => id !== shuffled.leftOrder[index]);
  }
  check('both groups show every pair once', orders);
  check('no partner ever sits straight across', across);

  const tap = rules.resolveConnectPairsTap;
  const L = (pairId) => ({ side: 'left', pairId });
  const R = (pairId) => ({ side: 'right', pairId });
  check('a first tap picks the card', JSON.stringify(tap(null, [], L('a'))) === JSON.stringify({ type: 'select', pick: L('a') }));
  check('the picked card again drops the pick', tap(L('a'), [], L('a')).type === 'deselect');
  check('another card of the same group takes the pick', JSON.stringify(tap(L('a'), [], L('b'))) === JSON.stringify({ type: 'select', pick: L('b') }));
  check('either group may start', JSON.stringify(tap(R('b'), [], L('b'))) === JSON.stringify({ type: 'match', pairId: 'b' }));
  check('partners connect', JSON.stringify(tap(L('a'), [], R('a'))) === JSON.stringify({ type: 'match', pairId: 'a' }));
  check('strangers are a mistake, named left then right', JSON.stringify(tap(R('b'), [], L('a'))) === JSON.stringify({ type: 'mismatch', leftPairId: 'a', rightPairId: 'b' }));
  check('a connected card ignores taps', tap(null, ['a'], L('a')).type === 'ignored' && tap(L('b'), new Set(['a']), R('a')).type === 'ignored');

  const inside = (rect, width, height, insets = {}) =>
    rect.left >= (insets.left || 0) - 1e-6 && rect.top >= (insets.top || 0) - 1e-6
    && rect.left + rect.width <= width - (insets.right || 0) + 1e-6 && rect.top + rect.height <= height - (insets.bottom || 0) + 1e-6;
  const overlap = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

  const phone = rules.layoutConnectPairs(844, 330, 6, { top: 0 });
  check('six pairs on a phone in landscape go in two rows', phone.orientation === 'rows', phone.orientation);
  check('and stay big enough to tap', phone.card >= 100, String(phone.card));
  const cards = [...phone.left, ...phone.right];
  check('every card is on the stage', cards.every((rect) => inside(rect, 844, 330)), JSON.stringify(cards));
  check('no two cards overlap', cards.every((a, i) => cards.every((b, j) => i === j || !overlap(a, b))));
  check('the top row is the left group', phone.left.every((rect) => rect.top < phone.right[0].top));

  const tall = rules.layoutConnectPairs(600, 900, 6);
  check('a tall stage gets two columns', tall.orientation === 'columns' && tall.left.every((rect) => rect.left < tall.right[0].left));
  const big = rules.layoutConnectPairs(1500, 850, 3);
  check('cards stop growing on a large stage', big.card === rules.CONNECT_PAIRS_LAYOUT.maxCard, String(big.card));
  const insets = { top: 70, left: 10, right: 10, bottom: 10 };
  const chrome = rules.layoutConnectPairs(844, 390, 5, insets);
  check('the board keeps inside the insets', [...chrome.left, ...chrome.right].every((rect) => inside(rect, 844, 390, insets)));
  check('nothing to lay out, nothing laid out', rules.layoutConnectPairs(800, 600, 0).left.length === 0);

  const link = rules.connectPairsLink('columns', tall.left[0], tall.right[2]);
  check('a line runs from the left card\'s inner edge to the right card\'s', link.from.x === tall.left[0].left + tall.left[0].width && link.to.x === tall.right[2].left
    && link.to.y === tall.right[2].top + tall.right[2].height / 2);
  const rowLink = rules.connectPairsLink('rows', phone.left[1], phone.right[4]);
  check('in rows, from the bottom edge to the top edge', rowLink.from.y === phone.left[1].top + phone.left[1].height && rowLink.to.y === phone.right[4].top);

  const t = rules.GAME_TIMINGS.connectPairs;
  check('a connected pair is drawn within its glow', t.lineDrawMs <= t.matchFeedbackMs && t.wrongFeedbackMs > 0 && t.successSettleMs > 0);
}

section('several copies of one picture on a card');

{
  const within = (box) => box.left >= -1e-9 && box.top >= -1e-9 && box.left + box.width <= 1 + 1e-9 && box.top + box.height <= 1 + 1e-9;
  const apart = (boxes) => boxes.every((a, i) => boxes.every((b, j) => i === j
    || a.left + a.width <= b.left + 1e-9 || b.left + b.width <= a.left + 1e-9
    || a.top + a.height <= b.top + 1e-9 || b.top + b.height <= a.top + 1e-9));
  const shapes = [0.6, 1, 1.4, 2.2];
  let everyCase = true;

  for (let count = 1; count <= rules.PICTURE_COPIES_MAX; count++) {
    for (const aspect of shapes) {
      const boxes = rules.layoutPictureCopies(count, aspect);
      // In pixels a copy is square: its width on the card times the card's aspect equals its height.
      // One copy is the exception: it fills the card, as a picture without copies does.
      const square = count === 1 || boxes.every((box) => Math.abs(box.width * aspect - box.height) < 1e-9);
      const same = boxes.every((box) => Math.abs(box.height - boxes[0].height) < 1e-9);

      if (boxes.length !== count || !boxes.every(within) || !apart(boxes) || !square || !same) {
        everyCase = false;
        console.log(`    ${count} on ${aspect}: ${JSON.stringify(boxes)}`);
      }
    }
  }

  check('every count on every card shape: that many copies, all the same size, inside the card, none touching', everyCase);
  check('one copy fills the card like a plain picture', JSON.stringify(rules.layoutPictureCopies(1, 1.3)) === JSON.stringify([{ left: 0, top: 0, width: 1, height: 1 }]));

  const two = rules.layoutPictureCopies(2, 1);
  check('two on a square card sit side by side', Math.abs(two[0].top - two[1].top) < 1e-9);
  const tall = rules.layoutPictureCopies(2, 0.6);
  check('two on a tall card stand one over the other', Math.abs(tall[0].left - tall[1].left) < 1e-9);
  const three = rules.layoutPictureCopies(3, 1);
  check('three on a square card make a pyramid, one over two', three[0].top < three[1].top && Math.abs(three[1].top - three[2].top) < 1e-9);
  const wide = rules.layoutPictureCopies(3, 2.2);
  check('three on a wide card make a row', three.length === 3 && wide.every((box) => Math.abs(box.top - wide[0].top) < 1e-9));
  const six = rules.layoutPictureCopies(6, 1);
  // A third of the card, less the gap: still a picture, not a speck.
  check('six on a square card are each close to a third of it', six[0].width > 0.28, String(six[0].width));

  check('copies are whole and capped', rules.normalizePictureCopies('3') === 3 && rules.normalizePictureCopies(2.7) === 2
    && rules.normalizePictureCopies(40) === rules.PICTURE_COPIES_MAX && rules.normalizePictureCopies(0) === 1
    && rules.normalizePictureCopies(undefined) === 1 && rules.normalizePictureCopies('') === 1);

  const memory = rules.normalizeMemoryCardsConfig({ pairs: [
    { id: 'p1', a: { type: 'image', value: 'https://x/digit-3.png' }, b: { type: 'image', value: 'https://x/apple.png', copies: 3 } },
    { id: 'p2', a: { type: 'text', value: 'ორი', copies: 4 }, b: { type: 'image', value: 'https://x/cat.png', copies: '2' } },
  ] });
  check('a memory face carries its copies', memory.pairs[0].b.copies === 3 && memory.pairs[0].a.copies === 1 && memory.pairs[1].b.copies === 2);
  check('a written word is never repeated', memory.pairs[1].a.copies === 1);

  const answers = rules.normalizeAnswerChoiceConfig(game('answer_choice', {}), { answers: [
    { image: 'https://x/cat.png', copies: 3, is_correct: true },
    { image: 'https://x/cat.png', copies: 2 },
    { image: 'https://x/cat.png' },
  ] });
  check('an answer card carries its copies', answers.answers.map((answer) => answer.copies).join(',') === '3,2,1');

  const order = rules.normalizeImageOrderConfig({ items: [
    { image: 'https://x/apple.png', copies: 1 },
    { image: 'https://x/apple.png', copies: 2 },
    'https://x/apple.png',
  ] });
  check('an order step carries its copies', order.items.map((item) => item.copies).join(',') === '1,2,1');

  const bins = rules.normalizeSortBinsConfig({
    bins: [
      { id: 'two', label: '2' },
      { id: 'three', image: 'https://x/apple.png', sb_bin_copies: 3 },
    ],
    items: [
      { image: 'https://x/cat.png', sb_item_copies: 2, sb_bin_id: 'two' },
      { image: 'https://x/cat.png', copies: 3, binId: 'three' },
      { image: 'https://x/dog.png', binId: 'two' },
    ],
  });
  const copiesOfItem = (image, bin) => bins.items.find((item) => item.image === image && item.binId === bin).copies;
  check('a thing to sort carries its copies', copiesOfItem('https://x/cat.png', 'two') === 2 && copiesOfItem('https://x/cat.png', 'three') === 3
    && copiesOfItem('https://x/dog.png', 'two') === 1);
  check('and so does a bin\'s picture: the "three" bin as three apples', bins.bins[1].copies === 3 && bins.bins[0].copies === 1);

  const counts = rules.normalizePatternNextConfig({
    pattern: [
      { id: 'one', image: 'https://x/apple.png', copies: 1 },
      { id: 'two', image: 'https://x/apple.png', pn_copies: 2 },
    ],
    repeats: 2,
  });
  // As the server serves them: `label` is a picture URL or a word.
  const falling = rules.normalizeCatchCorrectConfig({ items: [
    { label: 'https://x/apple.png', copies: 2, correct: true },
    { label: 'https://x/apple.png', correct: false },
    { label: 'https://x/pear.png', copies: 6, correct: false },
    { label: 'ორი', copies: 2, correct: false },
  ] });
  check('a falling picture carries its copies, a word never repeats',
    falling.items[0].copies === 2 && falling.items[1].copies === 1 && falling.items[3].copies === 1);
  check('and a falling picture shows no more than a glance can count',
    falling.items[2].copies === rules.CATCH_CORRECT_COPIES_MAX && rules.CATCH_CORRECT_COPIES_MAX === 3);

  check('a pattern of counts keeps them through the row, the answer and the choices',
    counts.sequence.map((item) => item.copies).join(',') === '1,2,1,2'
      && counts.answer.copies === 1
      && counts.choices.map((item) => item.copies).sort().join(',') === '1,2');
}

section('math_equation: an example with a place or two to fill');

{
  ['math_equation', 'math_example', 'number_sentence', 'compare_numbers', 'Math Equation'].forEach((type) => {
    check(`${type} resolves to math-equation`, rules.resolveGameKind(type, {}) === 'math-equation');
  });

  const n = (value, extra = {}) => ({ type: 'number', value, ...extra });
  const s = (value, extra = {}) => ({ type: 'sign', value, ...extra });
  const url = (name) => `https://x/${name}.webp`;
  const glyphs = {};
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((d) => { glyphs[d] = url(`digit-${d}`); });
  Object.assign(glyphs, { '+': url('plus-sign'), '-': url('minus-sign'), '=': url('equals-sign'), '?': url('question-mark') });

  const values = (config) => config.cards.map((card) => card.value);
  const numbers = (config) => config.cards.filter((card) => card.kind === 'number').map((card) => card.value).sort((a, b) => a - b);

  // 1 + ? = 3
  const plus = rules.normalizeMathEquationConfig({ terms: [n(1), s('+'), n(2, { missing: true }), s('='), n(3)], glyphs, bg_image: url('bg-classroom') });
  check('the terms alternate as authored', plus.terms.map((term) => `${term.kind}:${term.value}`).join(' ') === 'number:1 sign:+ number:2 sign:= number:3');
  check('the missing place is the one to fill', plus.blankIds.join() === 'term_3');
  check('three number cards by default, the answer among them', numbers(plus).length === 3 && numbers(plus).includes(2));
  check('the wrong cards are near the answer', numbers(plus).join() === '1,2,3', numbers(plus).join());
  check('defaults: lives 3, no timer', plus.lives === 3 && plus.time_limit === null);
  check('the pictures the example draws are preloaded, and only those',
    plus.imageUris.includes(url('bg-classroom')) && plus.imageUris.includes(url('digit-1')) && plus.imageUris.includes(url('plus-sign'))
      && plus.imageUris.includes(url('question-mark')) && !plus.imageUris.includes(url('digit-7')) && !plus.imageUris.includes(url('minus-sign')));

  const tap = rules.resolveMathEquationTap;
  const card = (config, value) => config.cards.find((item) => item.value === value).id;
  check('the answer goes in and finishes the example', JSON.stringify(tap(plus, {}, card(plus, 2))) === JSON.stringify({ type: 'place', termId: 'term_3', complete: true }));
  check('a wrong number is a mistake', tap(plus, {}, card(plus, 3)).type === 'wrong');
  check('nothing happens once every place is filled', tap(plus, { term_3: card(plus, 2) }, card(plus, 1)).type === 'ignored');

  // No place marked: the answer is the one to find.
  const unmarked = rules.normalizeMathEquationConfig({ terms: [n(2), s('+'), n(2), s('='), n(4)] });
  check('with no place marked, the last number is missing', unmarked.blankIds.join() === 'term_5');

  // 5 > ? — every smaller number is right, so no smaller number is offered as wrong.
  const greater = rules.normalizeMathEquationConfig({ terms: [n(5), s('>'), n(3, { missing: true })] });
  check('5 > ?: no other card may also be right', numbers(greater).filter((value) => value < 5).join() === '3', numbers(greater).join());
  check('5 > ?: the wrong cards are 5 and up', numbers(greater).every((value) => value === 3 || value >= 5));
  check('5 > ?: exactly one way to finish it', rules.countMathEquationCompletions(greater) === 1);

  // Right is right: an author's "wrong" 4 in 5 > ? still makes it true, and is taken.
  const lenient = rules.normalizeMathEquationConfig({ terms: [n(5), s('>'), n(3, { missing: true })], wrong_answers: '4, 7' });
  check('authored wrong answers are offered', numbers(lenient).join() === '3,4,7' || numbers(lenient).join() === '3,4,6,7');
  check('a card that makes the example true is never a mistake', tap(lenient, {}, card(lenient, 4)).type === 'place');
  check('one that does not, is', tap(lenient, {}, card(lenient, 7)).type === 'wrong');

  // 1 ? 3 — the comparison is missing: the three comparison signs are the cards.
  const compare = rules.normalizeMathEquationConfig({ terms: [n(1), s('<', { missing: true }), n(3)], glyphs });
  check('a missing comparison offers <, = and >, in that order', values(compare).join(' ') === '< = >');
  check('1 ? 3 takes <', tap(compare, {}, 'sign_<').type === 'place' && tap(compare, {}, 'sign_>').type === 'wrong' && tap(compare, {}, 'sign_=').type === 'wrong');
  check('a sign the library has no picture of is simply not preloaded', !compare.imageUris.some((uri) => uri.includes('less')));

  // 1 + 4 ? 5
  const sums = rules.normalizeMathEquationConfig({ terms: [n(1), s('+'), n(4), s('=', { missing: true }), n(5)] });
  check('1 + 4 ? 5 takes =', tap(sums, {}, 'sign_=').type === 'place' && tap(sums, {}, 'sign_<').type === 'wrong');

  // A missing operation offers + and −.
  const operation = rules.normalizeMathEquationConfig({ terms: [n(3), s('-', { missing: true }), n(2), s('='), n(1)] });
  check('a missing operation offers + and −', values(operation).join(' ') === '+ -');
  check('3 ? 2 = 1 takes −', tap(operation, {}, 'sign_-').type === 'place' && tap(operation, {}, 'sign_+').type === 'wrong');
  check('the minus is read from any dash', rules.normalizeMathEquationConfig({ terms: [n(3), s('−'), n(1), s('='), n(2, { missing: true })] }).terms[1].value === '-');

  // Two places: ? + ? = 5 with 2 and 3 — either order is right.
  const two = rules.normalizeMathEquationConfig({ terms: [n(2, { missing: true }), s('+'), n(3, { missing: true }), s('='), n(5)], choice_count: 4 });
  check('two places, filled left to right', two.blankIds.join() === 'term_1,term_3');
  check('four number cards: both answers and two wrong ones', numbers(two).length === 4 && numbers(two).includes(2) && numbers(two).includes(3));
  check('? + ? = 5 has one pair of cards that completes it, either way round', rules.countMathEquationCompletions(two) === 2);
  const first = tap(two, {}, card(two, 3));
  check('3 first is right too', first.type === 'place' && first.termId === 'term_1' && !first.complete);
  check('then only 2 finishes it', tap(two, { term_1: card(two, 3) }, card(two, 2)).type === 'place'
    && tap(two, { term_1: card(two, 3) }, card(two, 2)).complete
    && numbers(two).filter((value) => value !== 2 && value !== 3).every((value) => tap(two, { term_1: card(two, 3) }, card(two, value)).type === 'wrong'));
  check('a card already in the example cannot be tapped again', tap(two, { term_1: card(two, 3) }, card(two, 3)).type === 'ignored');
  check('a first card that leaves no way to finish is wrong', numbers(two).filter((value) => value !== 2 && value !== 3)
    .every((value) => tap(two, {}, card(two, value)).type === 'wrong'));

  // A number and a sign missing: 3 ? 2 = ?
  const mixed = rules.normalizeMathEquationConfig({ terms: [n(3), s('+', { missing: true }), n(2), s('='), n(5, { missing: true })] });
  check('a sign and a number missing: + and − then the numbers', mixed.cards.filter((c) => c.kind === 'sign').map((c) => c.value).join(' ') === '+ -'
    && numbers(mixed).includes(5));
  check('a number is not a sign', tap(mixed, {}, card(mixed, 5)).type === 'wrong');
  check('− could still work if 1 were offered; it is not, so − is wrong', numbers(mixed).includes(1) || tap(mixed, {}, 'sign_-').type === 'wrong');
  check('and the numbers never give a second way out', rules.countMathEquationCompletions(mixed) === 1);

  check('at most two places', rules.normalizeMathEquationConfig({ terms: [n(1, { missing: true }), s('+'), n(1, { missing: true }), s('+'), n(1, { missing: true }), s('='), n(3)] }).blankIds.length === 2);

  // Three cows = ?
  const cows = rules.normalizeMathEquationConfig({ terms: [n(3, { image: url('cow') }), s('='), n(3, { missing: true })], glyphs });
  check('a number may be drawn as pictures', cows.terms[0].image === url('cow') && cows.imageUris.includes(url('cow')));
  check('a number drawn as pictures needs no digit pictures', !cows.imageUris.includes(url('digit-3')) || cows.cards.some((c) => c.value === 3));
  check('a number past ten, or zero, is drawn in digits', rules.normalizeMathEquationConfig({ terms: [n(12, { image: url('cow') }), s('='), n(12, { missing: true })] }).terms[0].image === null
    && rules.normalizeMathEquationConfig({ terms: [n(0, { image: url('cow') }), s('='), n(0, { missing: true })] }).terms[0].image === null);
  const asPictures = rules.normalizeMathEquationConfig({ terms: [n(2), s('+'), n(1), s('='), n(3, { missing: true })], answer_image: url('apple') });
  check('answer cards may be drawn as pictures, from one up', asPictures.cards.every((c) => c.image === url('apple') && c.value >= 1 && c.value <= 10));

  const big = rules.normalizeMathEquationConfig({ terms: [n(7), s('+'), n(8), s('<'), n(16, { missing: true })] });
  check('7 + 8 < ?: only numbers from 16 up are right, and only one is offered', numbers(big).filter((value) => value > 15).join() === '16', numbers(big).join());

  // Times and divided by.
  const example = (...terms) => rules.normalizeMathEquationConfig({ terms });
  const ways = (...terms) => rules.countMathEquationCompletions(example(...terms));
  const times = example(n(7), s('×'), n(8), s('='), n(56, { missing: true }));
  check('7 × 8 = ?: 56 is right', tap(times, {}, 'number_56').type === 'place' && rules.countMathEquationCompletions(times) === 1);
  check('and the wrong cards are the next lines of the times table, not 55 and 57', numbers(times).join() === '49,56,63', numbers(times).join());
  check('times is read from a star, an x or a dot', ['*', 'x', 'X', 'х', '·', 'times'].every((sign) => example(n(2), s(sign), n(3), s('='), n(6, { missing: true })).terms[1].value === '×'));
  check('divided by from a slash or a colon', ['/', ':', '÷', 'divided by'].every((sign) => example(n(6), s(sign), n(3), s('='), n(2, { missing: true })).terms[1].value === '÷'));
  const divide = example(n(12), s('÷'), n(3, { missing: true }), s('='), n(4));
  check('12 ÷ ? = 4: only 3 is right', rules.countMathEquationCompletions(divide) === 1 && tap(divide, {}, 'number_3').type === 'place'
    && numbers(divide).filter((value) => value !== 3).every((value) => tap(divide, {}, `number_${value}`).type === 'wrong'), numbers(divide).join());
  check('a division that leaves a remainder is no example', ways(n(7), s('÷'), n(2), s('='), n(3, { missing: true })) === 0);
  check('nor is one by zero', ways(n(7), s('÷'), n(0), s('='), n(0, { missing: true })) === 0);
  check('times and divided by come before plus and minus: 2 + 3 × 4 is 14', ways(n(2), s('+'), n(3), s('×'), n(4), s('='), n(14, { missing: true })) === 1
    && ways(n(2), s('+'), n(3), s('×'), n(4), s('='), n(20, { missing: true })) === 0);
  check('8 − 2 × 3 is 2, and 20 ÷ 4 + 1 is 6', ways(n(8), s('-'), n(2), s('×'), n(3), s('='), n(2, { missing: true })) === 1
    && ways(n(20), s('÷'), n(4), s('+'), n(1), s('='), n(6, { missing: true })) === 1);
  check('a row of them is worked left to right: 12 ÷ 3 × 2 is 8', ways(n(12), s('÷'), n(3), s('×'), n(2), s('='), n(8, { missing: true })) === 1);
  check('a total that dips below zero on the way is still no example', ways(n(2), s('-'), n(3), s('×'), n(1), s('+'), n(5), s('='), n(4, { missing: true })) === 0);
  check('both sides are worked out before they are compared: 3 × 4 > 2 × 5', ways(n(3), s('×'), n(4), s('>', { missing: true }), n(2), s('×'), n(5)) === 1);
  const whichSign = example(n(6), s('×', { missing: true }), n(3), s('='), n(18));
  check('a missing sign of an example that multiplies offers all four', values(whichSign).join('') === '+-×÷'
    && tap(whichSign, {}, 'sign_+').type === 'wrong' && tap(whichSign, {}, 'sign_×').type === 'place');
  check('a missing sign of a sum still offers + and − alone', values(operation).join('') === '+-');
  check('2 ? 2 = 4 with times in it takes + and × alike', rules.countMathEquationCompletions(example(n(2), s('×', { missing: true }), n(2), s('='), n(4))) === 2);

  // Numbers past ninety-nine.
  const hundreds = example(n(348), s('+'), n(125), s('='), n(473, { missing: true }));
  check('348 + 125 = ?: the wrong cards are a ten out, as a slip in carrying is', numbers(hundreds).join() === '463,473,483', numbers(hundreds).join());
  check('a number is written in up to four digits', rules.mathNumberGlyphs(1000).join() === '1,0,0,0'
    && example(n(123456), s('='), n(123456, { missing: true })).terms[0].value === rules.MATH_EQUATION_NUMBER_MAX && rules.MATH_EQUATION_NUMBER_MAX === 9999);
  const thousands = example(n(2500), s('+'), n(3750), s('='), n(6250, { missing: true }));
  check('2500 + 3750 = ?: a hundred out, then a ten', numbers(thousands).includes(6250) && numbers(thousands).length === 3 && numbers(thousands).every((value) => value <= 9999), numbers(thousands).join());
  check('the small sums keep the numbers next to the answer', numbers(example(n(8), s('+'), n(5), s('='), n(13, { missing: true }))).join() === '12,13,14');

  // Glyphs, pieces and the layout.
  check('a number is written digit by digit', rules.mathNumberGlyphs(15).join() === '1,5' && rules.mathNumberGlyphs(0).join() === '0');
  const within = (box) => box.left >= -1e-9 && box.top >= -1e-9 && box.left + box.width <= 1 + 1e-9 && box.top + box.height <= 1 + 1e-9;
  const pieces15 = rules.mathEquationPieces({ kind: 'number', value: 15 }, rules.mathEquationItemUnits({ kind: 'number', value: 15 }));
  check('15 is two digit pictures, side by side, filling its box', pieces15.length === 2 && pieces15.map((p) => p.glyph).join() === '1,5'
    && pieces15.every((p) => within(p.box)) && Math.abs(pieces15[0].box.left) < 1e-9 && Math.abs(pieces15[1].box.left + pieces15[1].box.width - 1) < 1e-9);
  const centred3 = rules.mathEquationPieces({ kind: 'number', value: 3 }, 1.6)[0].box;
  check('a one-digit card in a two-digit place sits in the middle', Math.abs(centred3.left - (1 - centred3.width) / 2) < 1e-9);
  const sevenItem = { kind: 'number', value: 7, image: url('cow') };
  const small = rules.MATH_EQUATION_LAYOUT.pictureSmall;
  const sevenCows = rules.mathEquationPieces(sevenItem, rules.mathEquationItemUnits(sevenItem, small), small);
  check('seven cows are seven pictures in the box, three over four', sevenCows.length === 7
    && sevenCows.every((p) => p.image === url('cow') && p.glyph === null && within(p.box))
    && sevenCows.filter((p) => p.box.top < 0.5).length === 3);
  check('up to three copies anywhere in a game: big, in one row', rules.mathEquationPictureCell(cows) === rules.MATH_EQUATION_LAYOUT.pictureLarge);
  check('more than three anywhere: every copy small', rules.mathEquationPictureCell(asPictures) === small);
  const sameSize = asPictures.cards.map((c) => rules.mathEquationPieces(c, 2, small).map((p) => p.box.height)).flat();
  check('every copy in a game is the same size, so a count never looks like a size', sameSize.every((h) => Math.abs(h - sameSize[0]) < 1e-9));
  const onePiece = rules.mathEquationPieces({ kind: 'number', value: 1, image: url('cow') }, 0.9)[0].box;
  check('one big copy is its cell less the gap', Math.abs(onePiece.height - rules.MATH_EQUATION_LAYOUT.pictureLarge * (1 - rules.PICTURE_COPIES_GAP)) < 1e-9);
  const sign = rules.mathEquationPieces({ kind: 'sign', value: '<' }, 1.6);
  check('a sign is centred in its box, a little lower than a digit', sign.length === 1 && sign[0].glyph === '<' && within(sign[0].box) && sign[0].box.height < 1);
  check('an empty place shows a "?"', rules.mathEquationPieces({ kind: 'blank' }, 0.8)[0].glyph === '?');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left)
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
  const inStage = (rect, w, h, insets = {}) => rect.left >= (insets.left || 0) - 1e-6 && rect.top >= (insets.top || 0) - 1e-6
    && rect.left + rect.width <= w - (insets.right || 0) + 1e-6 && rect.top + rect.height <= h - (insets.bottom || 0) + 1e-6;
  const stages = [[844, 322, { top: 68 }], [1250, 750, {}], [390, 700, {}], [1024, 768, {}], [667, 300, { top: 60 }]];
  const configs = [plus, greater, compare, two, mixed, cows, big, asPictures, times, divide, whichSign, hundreds, thousands];
  let whole = true;
  stages.forEach(([w, h, insets]) => configs.forEach((config, index) => {
    const layout = rules.layoutMathEquation(w, h, config, insets);
    const ok = layout
      && inStage(layout.panel, w, h, insets) && inStage(layout.tray, w, h, insets)
      && !overlap(layout.panel, layout.tray)
      && layout.terms.every((rect) => inStage(rect, w, h, insets) && rect.left >= layout.panel.left - 1e-6 && rect.left + rect.width <= layout.panel.left + layout.panel.width + 1e-6)
      && layout.cards.every((rect) => inStage(rect, w, h, insets))
      && layout.cards.length === config.cards.length
      && layout.contents.every((rect, i) => rect.width > 0 && rect.height > 0 && overlap(rect, layout.cards[i]));
    if (!ok) {
      whole = false;
      console.log(`    ${w}x${h} config ${index}: ${JSON.stringify(layout && { panel: layout.panel, tray: layout.tray })}`);
    }
  }));
  check('on every stage: the example and the cards are inside, apart, and every card has its place', whole);

  const phone = rules.layoutMathEquation(844, 322, plus, { top: 68 });
  check('the cards are a little smaller than the example', phone.contents[0].height < phone.row && phone.contents[0].height >= phone.row * 0.5);
  check('the example and the cards keep a gap', phone.tray.top - (phone.panel.top + phone.panel.height) >= 16 - 1e-6);
  const blank = phone.terms.find((rect) => rect.id === 'term_3');
  check('an empty place is as wide as the widest card', Math.abs(blank.units - phone.contentUnits) < 1e-9);
  const desk = rules.layoutMathEquation(2400, 1400, plus);
  check('the row stops growing on a big screen', desk.row === rules.MATH_EQUATION_LAYOUT.maxRow);
  check('nothing to draw, nothing laid out', rules.layoutMathEquation(0, 0, plus) === null);

  const t = rules.GAME_TIMINGS.mathEquation;
  check('math_equation has its timings', t.flyMs > 0 && t.wrongFeedbackMs > 0 && t.successSettleMs > 0 && t.livesOutDelayMs > 0
    && rules.GAME_TIMINGS_BY_KIND['math-equation'] === t);
}

section('colour themes');

{
  const names = rules.THEME_NAMES;
  const palettes = rules.THEME_PALETTES;
  const keys = Object.keys(palettes.dark).sort().join(',');

  check('four themes, dark first', names.join(',') === 'dark,light,calm,contrast' && rules.DEFAULT_THEME === 'dark');
  check('every theme names the same colours', names.every((name) => Object.keys(palettes[name]).sort().join(',') === keys));
  check('every colour but the shadow and the overlay is #rrggbb', names.every((name) => Object.entries(palettes[name])
    .every(([key, value]) => (key === 'shadow' || key === 'overlay' ? /^rgba\(/.test(value) : /^#[0-9a-f]{6}$/.test(value)))));

  check('a retired name becomes one of the themes there are', rules.normalizeThemeName('darkblue') === 'dark'
    && rules.normalizeThemeName('violet') === 'dark' && rules.normalizeThemeName('accessibility') === 'contrast');
  check('a kept name stays', names.every((name) => rules.normalizeThemeName(name) === name));
  check('anything else is the default', rules.normalizeThemeName('sepia') === 'dark' && rules.normalizeThemeName(null) === 'dark'
    && rules.normalizeThemeName('toString') === 'dark');

  check('contrast is measured as WCAG does', Math.abs(rules.contrastRatio('#000000', '#ffffff') - 21) < 1e-9
    && rules.contrastRatio('#777777', '#777777') === 1);

  // What is read against what. Text needs 4.5 (WCAG AA); the high-contrast theme
  // promises 7 (AAA). A placeholder is a hint, not content: 3 is enough for it.
  const accents = ['primary', 'success', 'warning', 'danger', 'violet'];
  const upper = (word) => word[0].toUpperCase() + word.slice(1);
  const pairs = [
    ['text', 'background'], ['text', 'surface'], ['text', 'surfaceSoft'],
    ['textSecondary', 'background'], ['textSecondary', 'surface'], ['textSecondary', 'surfaceSoft'],
    ['muted', 'background'], ['muted', 'surface'], ['muted', 'surfaceSoft'],
    ...accents.flatMap((accent) => [
      ['on' + upper(accent), accent],
      [accent + 'Text', 'background'], [accent + 'Text', 'surface'], [accent + 'Text', accent + 'Soft'],
      ['text', accent + 'Soft'],
    ]),
  ];
  names.forEach((name) => {
    const palette = palettes[name];
    const floor = name === 'contrast' ? 7 : 4.5;
    const weak = pairs
      .map(([front, back]) => [front, back, rules.contrastRatio(palette[front], palette[back])])
      .filter(([, , ratio]) => ratio < floor);
    check(name + ': every text colour is readable on what it lies on', weak.length === 0,
      weak.map(([front, back, ratio]) => front + ' on ' + back + ' ' + ratio.toFixed(2)).join(', '));
    check(name + ': a placeholder can be made out', rules.contrastRatio(palette.placeholder, palette.surfaceSoft) >= 3
      && rules.contrastRatio(palette.placeholder, palette.surface) >= 3);
  });

  // Calm is calm by measure: nothing pure, and no accent as saturated as the light theme's.
  const saturation = (hex) => {
    const value = parseInt(hex.slice(1), 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => channel / 255);
    const max = Math.max(...channels);
    const min = Math.min(...channels);
    return max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1));
  };
  check('calm has no pure black and no pure white', !Object.values(palettes.calm).includes('#000000')
    && !Object.values(palettes.calm).includes('#ffffff'));
  check('every accent of calm is far less saturated than in the light theme', accents.every((accent) => saturation(palettes.calm[accent]) < saturation(palettes.light[accent]) - 0.2));
  check('dark is not black on white: no pure black, no pure white', !Object.values(palettes.dark).includes('#000000')
    && !Object.values(palettes.dark).includes('#ffffff'));
  check('in every theme but high contrast a card differs from the page', ['dark', 'light', 'calm'].every((name) => palettes[name].surface !== palettes[name].background));
}

section('the hint of how a game is played shows the gesture, never the answer');

{
  const kindsWithGesture = Object.keys(rules.GAME_GESTURES).sort().join();
  check('every playable kind has its gesture', kindsWithGesture === Object.keys(rules.GAME_TIMINGS_BY_KIND).sort().join());
  check('a game played only by carrying is shown carried', rules.GAME_GESTURES['shadow-match'] === 'drag');
  check('a game played either way is shown carried too', rules.GAME_GESTURES['drag-drop-match'] === 'drag' && rules.GAME_GESTURES['sort-bins'] === 'drag');
  check('a game of cards to tap is shown tapped', rules.GAME_GESTURES['answer-choice'] === 'tap' && rules.GAME_GESTURES['memory-cards'] === 'tap');
  check('pictures put in order are tapped, not carried', rules.GAME_GESTURES.images_order === 'tap');

  check('a few things are all visited, in order', rules.gestureHintTapStops(3).join() === '0,1,2');
  check('nothing to tap, nothing to visit', rules.gestureHintTapStops(0).length === 0);
  const many = 12;
  const first = rules.gestureHintTapStops(many, 0);
  check('of many things only some are visited at a time', first.length === rules.GESTURE_HINT.tapStops && new Set(first).size === first.length);
  const seen = new Set();
  for (let round = 0; round < many; round += 1) rules.gestureHintTapStops(many, round).forEach((index) => seen.add(index));
  check('but every one of them in the end', seen.size === many);
  check('and none outside the list', [...seen].every((index) => index >= 0 && index < many));

  const end = rules.gestureHintDragEnd({ x: 0, y: 100 }, { x: 200, y: 0 });
  check('the carrying hand stops short of where things go', end.x > 0 && end.x < 200 && end.y < 100 && end.y > 0);
  check('by the same share both ways', Math.abs(end.x / 200 - rules.GESTURE_HINT.dragReach) < 1e-9 && Math.abs((100 - end.y) / 100 - rules.GESTURE_HINT.dragReach) < 1e-9);
}

section('written words: every letter has its colour');

{
  const tone = rules.letterToneIndex;
  const all = Object.values(rules.LETTER_ALPHABETS).join('');
  check('three alphabets: 33 Georgian letters, 33 Russian, 26 English', rules.LETTER_ALPHABETS.ka.length === 33 && rules.LETTER_ALPHABETS.ru.length === 33 && rules.LETTER_ALPHABETS.en.length === 26);
  check('every letter of every alphabet has a tone', [...all].every((char) => Number.isInteger(tone(char)) && tone(char) >= 0 && tone(char) < rules.LETTER_TONE_COUNT));
  check('neighbours in an alphabet never share one', Object.values(rules.LETTER_ALPHABETS).every((alphabet) => [...alphabet].every((char, index) => index === 0 || tone(char) !== tone(alphabet[index - 1]))));
  check('and every tone of the palette is used by each alphabet', Object.values(rules.LETTER_ALPHABETS).every((alphabet) => new Set([...alphabet].map(tone)).size === rules.LETTER_TONE_COUNT));
  check('a capital has its small letter\'s tone', tone('Ж') === tone('ж') && tone('Q') === tone('q'));
  check('a digit keeps its own, as in a math example', tone('3') === 3 && tone('0') === 0);
  check('a space, a comma and a sign have none', tone(' ') === null && tone(',') === null && tone('?') === null && tone('') === null);

  check('a wide letter takes more room than a narrow one', rules.textLineAdvance('ლ') > rules.textLineAdvance('ი') && rules.textLineAdvance('m') > rules.textLineAdvance('i'));
  check('a longer line is wider', rules.textLineUnits('დათვი და მგელი') > rules.textLineUnits('დათვი'));
  check('a line\'s box holds its letters and the outline', Math.abs(rules.textLineUnits('ა') * rules.TEXT_ART.lineHeight - (rules.textLineAdvance('ა') + 2 * rules.TEXT_ART.pad)) < 1e-9);

  const lines = rules.breakTextLines;
  {
    // Of every way to break it in two, the one whose longer line is shortest.
    const words = 'რომელი ცხოველი იძინებს მთელი ზამთარი?'.split(' ');
    const longest = (parts) => Math.max(...parts.map((part) => rules.textLineAdvance(part)));
    const ways = words.slice(1).map((_, at) => [words.slice(0, at + 1).join(' '), words.slice(at + 1).join(' ')]);
    const broken = lines(words.join(' '), 2);
    check('a text is broken at its spaces, as evenly as it goes', broken.length === 2 && ways.every((way) => longest(broken) <= longest(way) + 1e-9), broken.join('|'));
  }
  check('never into more lines than it has words', lines('დათვი', 3).join('|') === 'დათვი' && lines('Кто спит', 3).length === 2);
  check('and no word is lost or split', lines('one two three four five six seven', 3).join(' ') === 'one two three four five six seven' && lines('  two   spaces ', 1).join('|') === 'two spaces');
  check('nothing to write is no line', lines('   ', 2).length === 0);
}

section('text_choice: a question to read and answers in words');

{
  ['text_choice', 'text_question', 'quiz', 'Text Choice'].forEach((type) => {
    check(`${type} resolves to text-choice`, rules.resolveGameKind(type, {}) === 'text-choice');
  });

  const game = { id: 'g7' };
  const make = (extra = {}) => rules.normalizeTextChoiceConfig(game, {
    question: ' რომელი ცხოველი იძინებს მთელი ზამთარი? ',
    bg_image: 'https://x/bg-forest.webp',
    answers: [
      { id: 'bear', text: 'დათვი', is_correct: true },
      { id: 'wolf', text: 'მგელი', is_correct: false },
      { id: 'fox', text: 'მელა', is_correct: false },
    ],
    ...extra,
  });

  const quiz = make();
  check('the question is kept as written, trimmed', quiz.question === 'რომელი ცხოველი იძინებს მთელი ზამთარი?');
  check('the answers are all there, shuffled or not', quiz.answers.map((a) => a.id).sort().join() === 'bear,fox,wolf');
  check('the right one is known', quiz.correctOptionIds.join() === 'bear');
  check('defaults: lives 3, no timer, the background to preload', quiz.lives === 3 && quiz.time_limit === null && quiz.imageUris.join() === 'https://x/bg-forest.webp');
  check('a picture the question is about is preloaded too', make({ question_image: 'https://x/bear.webp' }).imageUris.includes('https://x/bear.webp'));

  const crowded = make({ answers: [
    { text: 'ერთი' }, { text: 'ორი' }, { text: '' }, { text: 'სამი' }, { text: 'ოთხი' }, { id: 'right', text: 'ხუთი', is_correct: true }, { text: 'ექვსი' },
  ] });
  check('an answer with no text is dropped, and four at most are kept', crowded.answers.length === rules.TEXT_CHOICE_ANSWERS_MAX && crowded.answers.every((a) => a.text !== ''));
  check('the right answer is never the one left out', crowded.correctOptionIds.join() === 'right');

  const tap = rules.resolveTextChoiceTap;
  check('the right answer ends the game', JSON.stringify(tap(quiz, [], [], 'bear')) === '{"type":"right","complete":true}');
  check('a wrong one is wrong', tap(quiz, [], [], 'wolf').type === 'wrong');
  check('once crossed out it takes no more taps', tap(quiz, [], ['wolf'], 'wolf').type === 'ignored');
  check('nor does an answer the game does not have', tap(quiz, [], [], 'nobody').type === 'ignored');

  const several = make({ answers: [
    { id: 'sparrow', text: 'ბეღურა', is_correct: true },
    { id: 'eagle', text: 'არწივი', is_correct: true },
    { id: 'bat', text: 'ღამურა', is_correct: false },
    { id: 'bee', text: 'ფუტკარი', is_correct: false },
  ] });
  check('several right answers: the first leaves the game open', JSON.stringify(tap(several, [], [], 'eagle')) === '{"type":"right","complete":false}');
  check('the last one found ends it', JSON.stringify(tap(several, ['eagle'], ['bat'], 'sparrow')) === '{"type":"right","complete":true}');
  check('one already found takes no more taps', tap(several, ['eagle'], [], 'eagle').type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  const configs = [
    quiz,
    several,
    make({ question_image: 'https://x/bear.webp' }),
    make({ question: '', question_image: 'https://x/bear.webp' }),
    make({ question: '' }),
    make({ question: 'The whale is a fish.', answers: [{ text: 'True' }, { text: 'False', is_correct: true }] }),
    make({ question: 'Какое животное кормит своих детёнышей молоком и живёт в море?', answers: [{ text: 'синий кит', is_correct: true }, { text: 'белая акула' }, { text: 'морской конёк' }, { text: 'осьминог' }] }),
    make({ question: 'Что нужно растению, чтобы расти?', answers: [{ text: 'вода, свет и тепло', is_correct: true }, { text: 'только вода' }, { text: 'только темнота' }] }),
  ];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => configs.forEach((config, index) => {
    const layout = rules.layoutTextChoice(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const sizes = layout ? layout.cards.flatMap((card) => card.lines.map((line) => line.height)) : [];
    const ok = layout
      && layout.cards.length === config.answers.length
      && layout.cards.every((card) => inside(card, stage) && card.lines.length > 0 && card.lines.every((line) => inside(line, card)))
      && layout.cards.every((card, i) => layout.cards.every((other, j) => i === j || !overlap(card, other)))
      && sizes.every((size) => Math.abs(size - sizes[0]) < 1e-6)
      && (!layout.panel || (inside(layout.panel, stage) && layout.cards.every((card) => !overlap(card, layout.panel))))
      && layout.question.every((line) => inside(line, layout.panel))
      && (!layout.picture || (inside(layout.picture, layout.panel) && layout.question.every((line) => !overlap(line, layout.picture))))
      && Boolean(layout.panel) === (config.question !== '' || Boolean(config.questionImage))
      && layout.question.map((line) => line.text).join(' ') === config.question
      && layout.cards.every((card, i) => card.id === config.answers[i].id && card.lines.map((line) => line.text).join(' ') === config.answers[i].text);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the question and the answers are whole, apart, inside the safe area, the answers at one size', whole, detail);

  const phone = rules.layoutTextChoice(852, 393, quiz, { top: 56 });
  check('a line is drawn in a box as wide as its letters ask', phone.cards.every((card) => card.lines.every((line) => line.width <= rules.textLineUnits(line.text) * line.height + 1e-6)));
  check('no answers, no game', rules.layoutTextChoice(852, 393, make({ answers: [] }), {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.textChoice.wrongFeedbackMs > 0 && rules.GAME_TIMINGS_BY_KIND['text-choice'] === rules.GAME_TIMINGS.textChoice && rules.GAME_GESTURES['text-choice'] === 'tap');
}

section('letters drawn in code: outlines, not pictures');

{
  const sets = rules.LETTER_SETS;
  const letters = [...Object.values(sets).join('')];
  const tone = { light: '#ffa3a3', deep: '#f43f5e', outline: '#8f1239' };

  check('the alphabets drawn are the ones written with: the same letters in the same order', sets.ka === rules.LETTER_ALPHABETS.ka && sets.ruLower === rules.LETTER_ALPHABETS.ru && sets.enLower === rules.LETTER_ALPHABETS.en);
  check('Russian and English have their capitals, letter for letter', sets.ru.toLowerCase() === sets.ruLower && sets.en.toLowerCase() === sets.enLower);
  check('every letter has an outline with ink in it', letters.every((char) => { const shape = rules.glyphShape(char); return shape && shape.path.length > 20 && shape.box.width > 0 && shape.box.height > 0 && shape.advance > 0; }));
  check('and so has every digit and the marks of a sentence', [...'0123456789.,!?:;-–«»()+−×÷=<>'].every((char) => rules.glyphShape(char) !== null));
  check('a character we have no outline of says so, as does a name of Object', rules.glyphShape('字') === null && rules.glyphShape('constructor') === null && rules.glyphShape('') === null);

  const arts = letters.map((char) => rules.letterArt(char));
  check('every letter can be drawn on a card', arts.every(Boolean));
  check('what is drawn is a square, as a picture of the library is', arts.every((art) => Math.abs(art.view.width - art.view.height) < 1e-6 && Math.abs(art.box.width - art.box.height) < 1e-6));
  check('the ink, its outline and its thickness are inside it', arts.every((art) => {
    const ring = art.outline / 2;
    return art.ink.x - ring >= art.view.x - 1e-6 && art.ink.y - ring >= art.view.y - 1e-6
      && art.ink.x + art.ink.width + ring <= art.view.x + art.view.width + 1e-6
      && art.ink.y + art.ink.height + ring + art.depth <= art.view.y + art.view.height + 1e-6;
  }));
  check('the letters of one alphabet are drawn at one scale: "ა" stays smaller than "ქ"', Object.keys(sets).every((name) => new Set([...sets[name]].map((char) => Math.round(rules.letterArt(char).view.width))).size === 1)
    && rules.letterArt('ა').ink.height < rules.letterArt('ქ').ink.height * 0.75);
  check('and on one line: a letter with a tail hangs under it', rules.letterArt('ა').box.y === rules.letterArt('ქ').box.y && rules.letterArt('р').box.y === rules.letterArt('а').box.y);
  check('each stands in the middle of its square from left to right', arts.every((art) => Math.abs((art.ink.x + art.ink.width / 2) - (art.box.x + art.box.width / 2)) < 1e-6));
  check('a digit, a sign and a letter of another alphabet are not letters to draw', rules.letterArt('3') === null && rules.letterArt('?') === null && rules.letterArt('ß') === null && rules.letterArt('') === null);
  check('a capital and its small letter are two drawings', rules.letterArt('Б').path !== rules.letterArt('б').path && rules.letterSetOf('Б') === 'ru' && rules.letterSetOf('б') === 'ruLower' && rules.letterSetOf('ბ') === 'ka');

  const svg = rules.letterSvg('ჭ', tone);
  check('a letter is an SVG document in its colours', svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && svg.endsWith('</svg>') && svg.includes(tone.light) && svg.includes(tone.deep) && svg.includes(tone.outline) && svg.includes(rules.letterArt('ჭ').path));
  const uri = rules.letterPictureUri('ჭ', tone);
  check('and the address of a picture that is fetched from nowhere', uri.startsWith(rules.LETTER_PICTURE_PREFIX) && decodeURIComponent(uri.slice(rules.LETTER_PICTURE_PREFIX.length)) === svg);
  check('safe inside a quoted attribute, a CSS url() and another SVG', letters.every((char) => !/["'()<>\s&]/.test(rules.letterPictureUri(char, tone))));
  check('the players take it for a picture, not for a word', rules.isImageReference(uri) && !rules.isImageReference('ჭ'));
  check('with a size of its own, for a canvas that asks the picture how big it is', svg.includes(`width="${rules.LETTER_PICTURE_PX}" height="${rules.LETTER_PICTURE_PX}"`) && rules.LETTER_PICTURE_PX >= 256);
  check('what is not a letter has no address', rules.letterPictureUri('7', tone) === null && rules.letterSvg(' ', tone) === null);
  check('a letter weighs little as an address', letters.every((char) => rules.letterPictureUri(char, tone).length < 3200), String(Math.max(...letters.map((char) => rules.letterPictureUri(char, tone).length))));

  const line = rules.layoutTextLine('და 5 კატა?');
  check('a line of writing is laid out a character at a time, left to right', line.glyphs.length === 10 && line.glyphs.every((glyph, index) => index === 0 || Math.abs(glyph.x - (line.glyphs[index - 1].x + line.glyphs[index - 1].advance)) < 1e-9));
  check('as wide as the players are told it is', Math.abs(line.width - rules.textLineAdvance('და 5 კატა?')) < 1e-9);
  check('a space has room and no ink; a letter, a digit and a mark have both', line.glyphs[2].path === null && line.glyphs[2].advance > 0.1 && Boolean(line.glyphs[0].path && line.glyphs[3].path && line.glyphs[9].path));
  check('a character we cannot draw still takes its room', rules.layoutTextLine('字').glyphs[0].path === null && rules.layoutTextLine('字').width > 0.5);
}

section('math_input: an example whose answer is typed');

{
  ['math_input', 'number_input', 'type_answer', 'Math Input'].forEach((type) => {
    check(`${type} resolves to math-input`, rules.resolveGameKind(type, {}) === 'math-input');
  });
  check('a math example with cards is still its own game', rules.resolveGameKind('math_equation', {}) === 'math-equation');

  const n = (value, extra = {}) => ({ type: 'number', value, ...extra });
  const s = (value, extra = {}) => ({ type: 'sign', value, ...extra });
  const make = (terms, extra = {}) => rules.normalizeMathInputConfig({ terms, ...extra });

  // 7 × 8 = ?
  const times = make([n(7), s('×'), n(8), s('='), n(56, { missing: true })], { bg_image: 'https://x/bg-classroom.webp' });
  check('the terms are read as a math example\'s', times.terms.map((term) => `${term.kind}:${term.value}`).join(' ') === 'number:7 sign:× number:8 sign:= number:56');
  check('the place to fill is the number marked', times.blankId === 'term_5' && times.terms.filter((term) => term.missing).length === 1);
  check('defaults: lives 3, no timer, the background to preload', times.lives === 3 && times.time_limit === null && times.imageUris.join() === 'https://x/bg-classroom.webp');
  check('with none marked the last number is typed', make([n(2), s('+'), n(2), s('='), n(4)]).blankId === 'term_5');
  check('a sign is never typed: one marked missing just stands there', make([n(6), s('×', { missing: true }), n(3), s('='), n(18)]).terms[1].missing === false
    && make([n(6), s('×', { missing: true }), n(3), s('='), n(18)]).blankId === 'term_5');
  check('of two numbers marked only the first is typed', make([n(2, { missing: true }), s('+'), n(3, { missing: true }), s('='), n(5)]).blankId === 'term_1');
  const cows = make([n(3, { image: 'https://x/cow.webp' }), s('+'), n(2, { image: 'https://x/cow.webp' }), s('='), n(5, { missing: true, image: 'https://x/cow.webp' })]);
  check('numbers may stand as pictures, the answer is typed in digits', cows.terms[0].image === 'https://x/cow.webp' && cows.terms[4].image === null && cows.imageUris.join() === 'https://x/cow.webp');

  check('the place has room for two digits at least, so 8 is not told by its width', make([n(5), s('+'), n(3), s('='), n(8, { missing: true })]).maxDigits === 2);
  check('and for as many as the longest number of the example', times.maxDigits === 2
    && make([n(348), s('+'), n(125), s('='), n(473, { missing: true })]).maxDigits === 3
    && make([n(50), s('+'), n(50), s('='), n(100, { missing: true })]).maxDigits === 3
    && make([n(2500), s('+'), n(3750), s('='), n(6250, { missing: true })]).maxDigits === 4);

  const press = rules.pressMathInputKey;
  check('digits are typed one after another', press(press('', '5', 2), '6', 2) === '56');
  check('no more than the place has room for', press('56', '7', 2) === '56' && press('56', '7', 3) === '567');
  check('wiping takes the last digit', press('56', 'erase', 2) === '5' && press('', 'erase', 2) === '');
  check('a lone zero is typed over, so no number starts with one', press('0', '7', 2) === '7' && press('', '0', 2) === '0' && press('0', '0', 2) === '0');
  check('the tick types nothing', press('56', 'enter', 2) === '56');
  check('twelve keys: the ten digits, wiping and the tick', rules.MATH_INPUT_KEYS.length === 12 && new Set(rules.MATH_INPUT_KEYS).size === 12
    && rules.MATH_INPUT_KEYS[5] === 'erase' && rules.MATH_INPUT_KEYS[11] === 'enter');

  const enter = rules.resolveMathInputEntry;
  check('56 makes 7 × 8 = ? true', JSON.stringify(enter(times, '56')) === '{"type":"right","value":56}');
  check('54 does not', JSON.stringify(enter(times, '54')) === '{"type":"wrong","value":54}');
  check('with nothing typed the tick does nothing', enter(times, '').type === 'ignored');
  const greater = make([n(5), s('>'), n(3, { missing: true })]);
  check('5 > ? takes any number under five, as the example with cards does', enter(greater, '0').type === 'right' && enter(greater, '4').type === 'right' && enter(greater, '5').type === 'wrong');
  const factor = make([n(7), s('×'), n(8, { missing: true }), s('='), n(56)]);
  check('a number in the middle is typed the same way', enter(factor, '8').type === 'right' && enter(factor, '7').type === 'wrong');
  check('a division that does not come out whole is wrong, not a crash', enter(make([n(12), s('÷'), n(3, { missing: true }), s('='), n(4)]), '5').type === 'wrong'
    && enter(make([n(12), s('÷'), n(3, { missing: true }), s('='), n(4)]), '0').type === 'wrong');
  check('the order of working is the example\'s: 2 + 3 × 4 = 14', enter(make([n(2), s('+'), n(3), s('×'), n(4), s('='), n(14, { missing: true })]), '14').type === 'right'
    && enter(make([n(2), s('+'), n(3), s('×'), n(4), s('='), n(14, { missing: true })]), '20').type === 'wrong');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  const configs = [times, greater, factor, cows, make([n(348), s('+'), n(125), s('='), n(473, { missing: true })]), make([n(2500), s('+'), n(3750), s('='), n(6250, { missing: true })])];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => configs.forEach((config, index) => {
    const layout = rules.layoutMathInput(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout
      && inside(layout.panel, stage) && inside(layout.pad, stage) && !overlap(layout.panel, layout.pad)
      && layout.terms.length === config.terms.length && layout.terms.every((rect) => inside(rect, layout.panel))
      && layout.keys.length === 12 && layout.keys.every((key, i) => key.key === rules.MATH_INPUT_KEYS[i] && inside(key, layout.pad))
      && layout.keys.every((key, i) => layout.keys.every((other, j) => i === j || !overlap(key, other)))
      && layout.keys.every((key) => Math.abs(key.width - layout.keys[0].width) < 1e-6 && Math.abs(key.height - layout.keys[0].height) < 1e-6);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the example and the keys are whole, apart and inside the safe area', whole, detail);

  const phone = rules.layoutMathInput(852, 393, times, { top: 56, left: 59, right: 59, bottom: 21 });
  check('a phone on its side has two rows of six keys, big enough to hit', new Set(phone.keys.map((key) => Math.round(key.top))).size === 2 && phone.keys[0].height >= rules.MATH_INPUT_LAYOUT.minKey);
  const upright = rules.layoutMathInput(390, 700, times, { top: 60 });
  check('an upright stage has three columns', new Set(upright.keys.map((key) => Math.round(key.left))).size === 3);
  const low = rules.layoutMathInput(667, 250, times, { top: 60 });
  check('where there is little height the example gives way and the keys stay hittable', low.keys[0].height >= rules.MATH_INPUT_LAYOUT.minKey - 1 && inside(low.pad, { left: 0, top: 60, width: 667, height: 190 }), JSON.stringify([low.row, low.keys[0].height]));
  const blankRect = phone.terms.find((rect) => rect.id === times.blankId);
  check('the place is as wide as the digits it takes', Math.abs(blankRect.units - times.maxDigits * rules.MATH_EQUATION_LAYOUT.digit) < 1e-9);
  check('no example, no game', rules.layoutMathInput(852, 393, make([]), {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.mathInput.wrongFeedbackMs > 0 && rules.GAME_TIMINGS_BY_KIND['math-input'] === rules.GAME_TIMINGS.mathInput && rules.GAME_GESTURES['math-input'] === 'tap');
}

section('word_build: a word put together from its letters');

{
  ['word_build', 'build_word', 'spell_word', 'Word Build'].forEach((type) => {
    check(`${type} resolves to word-build`, rules.resolveGameKind(type, {}) === 'word-build');
  });
  check('a question in words is still its own game', rules.resolveGameKind('text_choice', {}) === 'text-choice');

  const make = (word, extra = {}) => rules.normalizeWordBuildConfig({ word, ...extra });
  const sorted = (letters) => [...letters].sort().join('');

  const cow = make('ძროხა', { extra_letters: 2, question_image: 'https://x/cow.webp', bg_image: 'https://x/bg-farm.webp' });
  check('the word is read a letter a place', cow.letters.join('') === 'ძროხა');
  check('its tiles are its letters and two that do not belong', cow.tiles.length === 7
    && cow.tiles.filter((tile) => !cow.letters.includes(tile.letter)).length === 2
    && sorted(cow.tiles.filter((tile) => cow.letters.includes(tile.letter)).map((tile) => tile.letter)) === sorted(cow.letters));
  check('the letters that do not belong are of the word\'s own alphabet', cow.tiles.every((tile) => rules.LETTER_ALPHABETS.ka.includes(tile.letter)));
  check('every tile has its own id', new Set(cow.tiles.map((tile) => tile.id)).size === 7);
  check('defaults: lives 3, no timer, the background and the picture to preload', cow.lives === 3 && cow.time_limit === null
    && cow.questionImage === 'https://x/cow.webp' && cow.imageUris.join() === 'https://x/bg-farm.webp,https://x/cow.webp');

  let mixed = true;
  for (let i = 0; i < 60; i += 1) {
    const again = make('სახლი');
    if (again.tiles.map((tile) => tile.letter).join('') === 'სახლი') mixed = false;
  }
  check('the tiles never lie in the word\'s own order', mixed);

  const russian = make('Корова', { extra_letters: 'пс' });
  check('a capital is its small letter', russian.letters.join('') === 'корова');
  check('letters that do not belong can be named', russian.tiles.length === 8 && sorted(russian.tiles.map((tile) => tile.letter)) === sorted([...'корова', 'п', 'с']));
  check('a named letter the word has is not one that does not belong', make('корова', { extra_letters: 'ок' }).tiles.length === 6);
  check('an English word is built from English letters', make('cat', { extra_letters: 3 }).tiles.every((tile) => rules.LETTER_ALPHABETS.en.includes(tile.letter)));
  check('no more than four letters that do not belong', make('cat', { extra_letters: 9 }).tiles.length === 3 + rules.WORD_BUILD_EXTRA_MAX
    && make('cat', { extra_letters: 'bdfghjk' }).tiles.length === 3 + rules.WORD_BUILD_EXTRA_MAX);
  check('what is no letter is left out: a space, a hyphen, a digit', make('ice-cream 2').letters.join('') === 'icecream');
  check('a word past eight letters is cut to eight', make('hippopotamus').letters.length === rules.WORD_BUILD_LETTERS_MAX);
  check('no word, no tiles', make('').letters.length === 0 && make('', { extra_letters: 3 }).tiles.length === 0);

  // მამა: two of each letter, and either goes first.
  const dad = { letters: [...'მამა'], tiles: [{ id: 'a', letter: 'ა' }, { id: 'b', letter: 'მ' }, { id: 'c', letter: 'ა' }, { id: 'd', letter: 'მ' }, { id: 'e', letter: 'ს' }] };
  const tap = rules.resolveWordBuildTap;
  check('the letter that comes next goes to its place', JSON.stringify(tap(dad, [], 'b')) === '{"type":"place","slot":0,"complete":false}');
  check('either tile of that letter is right', tap(dad, [], 'd').type === 'place');
  check('a letter of the word out of its turn is a mistake', JSON.stringify(tap(dad, [], 'a')) === '{"type":"wrong","slot":0}');
  check('so is one that does not belong', tap(dad, ['b'], 'e').type === 'wrong');
  check('a tile in the word already is not tapped again', tap(dad, ['b', 'a'], 'b').type === 'ignored');
  check('the last letter completes the word', JSON.stringify(tap(dad, ['b', 'a', 'd'], 'c')) === '{"type":"place","slot":3,"complete":true}');
  check('a built word takes no more', tap(dad, ['b', 'a', 'd', 'c'], 'e').type === 'ignored');
  check('a tile the game does not have is ignored', tap(dad, [], 'zzz').type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  const configs = [cow, russian, make('ია'), make('elephant', { extra_letters: 4, question_image: 'https://x/e.webp' }), make('elephant', { extra_letters: 4 }), make('cat', { question_image: 'https://x/c.webp' })];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => configs.forEach((config, index) => {
    const layout = rules.layoutWordBuild(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout
      && inside(layout.panel, stage) && inside(layout.tray, stage) && !overlap(layout.panel, layout.tray)
      && layout.slots.length === config.letters.length && layout.slots.every((rect) => inside(rect, layout.panel))
      && layout.slots.every((rect, i) => layout.slots.every((other, j) => i === j || !overlap(rect, other)))
      && (config.questionImage ? layout.picture && inside(layout.picture, layout.panel) && layout.slots.every((rect) => !overlap(rect, layout.picture)) : layout.picture === null)
      && layout.tiles.length === config.tiles.length && layout.tiles.every((rect) => inside(rect, layout.tray))
      && layout.tiles.every((rect, i) => layout.tiles.every((other, j) => i === j || !overlap(rect, other)))
      && layout.tiles.every((rect) => Math.abs(rect.width - layout.tiles[0].width) < 1e-6 && Math.abs(rect.height - layout.tiles[0].height) < 1e-6);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the word and its tiles are whole, apart and inside the safe area', whole, detail);

  const phone = rules.layoutWordBuild(852, 393, cow, { top: 56, left: 59, right: 59, bottom: 21 });
  check('a phone on its side has the tiles in one row, big enough to hit', new Set(phone.tiles.map((rect) => Math.round(rect.top))).size === 1 && phone.tiles[0].height >= rules.WORD_BUILD_LAYOUT.minTile);
  check('the picture stands at the left of the word', phone.picture.left + phone.picture.width < phone.slots[0].left);
  const long = rules.layoutWordBuild(852, 393, configs[3], { top: 56, left: 59, right: 59, bottom: 21 });
  check('twelve tiles stand in two rows, still big enough to hit', new Set(long.tiles.map((rect) => Math.round(rect.top))).size === 2 && long.tiles[0].height >= rules.WORD_BUILD_LAYOUT.minTile, String(long.tiles[0].height));
  const low = rules.layoutWordBuild(667, 250, configs[3], { top: 60 });
  check('where there is little height the word gives way before the tiles', low.tiles[0].height >= low.slots[0].height * 0.5 && inside(low.tray, { left: 0, top: 60, width: 667, height: 190 }), JSON.stringify([low.slots[0].height, low.tiles[0].height]));
  check('a place and a tile have one shape', Math.abs(phone.slots[0].width / phone.slots[0].height - phone.tiles[0].width / phone.tiles[0].height) < 1e-6);
  check('the box of a letter holds the widest letter of every alphabet', Object.values(rules.LETTER_ALPHABETS).every((set) => [...set].every((char) => rules.textLineUnits(char) <= rules.WORD_BUILD_LETTER_UNITS))
    && rules.WORD_BUILD_LETTER_UNITS > 0.8 && rules.WORD_BUILD_LETTER_UNITS < 1);
  const letterBox = rules.wordBuildLetterBox(74, 88);
  const em = letterBox.height / rules.TEXT_ART.lineHeight;
  const inks = Object.values(rules.LETTER_ALPHABETS).flatMap((set) => [...set].map((char) => rules.glyphShape(char).box));
  check('every letter is written at one size, and its ink keeps inside the face of its tile',
    inks.every((box) => (box.width / rules.OUTLINE_EM) * em < 74 && (box.height / rules.OUTLINE_EM) * em < 88)
      && Math.abs(letterBox.width / letterBox.height - rules.WORD_BUILD_LETTER_UNITS) < 1e-9, JSON.stringify(letterBox));
  check('the letter is as big as the face allows: the widest fills most of it', Math.max(...inks.map((box) => box.width / rules.OUTLINE_EM)) * em > 74 * 0.82);
  check('a face with no room draws nothing', rules.wordBuildLetterBox(0, 50).height === 0);
  check('no word, no game', rules.layoutWordBuild(852, 393, make(''), {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.wordBuild.flyMs > 0 && rules.GAME_TIMINGS_BY_KIND['word-build'] === rules.GAME_TIMINGS.wordBuild && rules.GAME_GESTURES['word-build'] === 'tap');
}

section('label_diagram: a picture whose parts are named');

{
  ['label_diagram', 'label_map', 'name_parts', 'Label Diagram'].forEach((type) => {
    check(`${type} resolves to label-diagram`, rules.resolveGameKind(type, {}) === 'label-diagram');
  });
  check('a word to build is still its own game', rules.resolveGameKind('word_build', {}) === 'word-build');

  const make = (data) => rules.normalizeLabelDiagramConfig(data);
  const pic = (name) => `https://x/${name}.webp`;

  // A farm: four animals with names, a tree that is only there, and a name of nothing on it.
  const farm = make({
    board_width: 2048, board_height: 1152, bg_image: pic('bg-farm'), lives: 2,
    placements: [
      { image: pic('goat'), x: 62, y: 52, width: 14, height: 28, label: 'თხა' },
      { image: pic('cow'), x: 8, y: 48, width: 20, height: 34, label: '  ძროხა ' },
      { image: pic('tree'), x: 44, y: 8, width: 14, height: 28 },
      { image: pic('hen'), x: 82, y: 62, width: 9, height: 18, label: 'ქათამი' },
      { image: pic('horse'), x: 36, y: 40, width: 20, height: 40, label: 'ცხენი' },
    ],
    extra_labels: ['ღორი', 'თხა', '', 'ღორი'],
  });
  check('every picture stands on the sheet, in the order it was placed', farm.parts.map((part) => part.image).join() === ['goat', 'cow', 'tree', 'hen', 'horse'].map(pic).join());
  check('the named ones are asked left to right, and numbered so', farm.order.join() === 'part_2,part_5,part_1,part_4'
    && farm.parts.map((part) => part.number).join('') === '31042');
  check('a name is tidied; a picture with none is only there', farm.parts[1].label === 'ძროხა' && farm.parts[2].label === null);
  check('a card for every name, and one for a name of nothing — said once, and never a part\'s own', farm.labels.length === 5
    && [...farm.labels.map((label) => label.text)].sort().join() === ['თხა', 'ძროხა', 'ქათამი', 'ცხენი', 'ღორი'].sort().join()
    && new Set(farm.labels.map((label) => label.id)).size === 5);
  check('defaults and what to preload: the picture and everything on it', farm.lives === 2 && farm.time_limit === null
    && farm.board.width === 2048 && farm.imageUris.length === 6 && farm.imageUris[0] === pic('bg-farm'));

  // A plant runs down the page: asked top to bottom.
  const plant = make({
    board_width: 900, board_height: 1200, bg_image: pic('plant'),
    placements: [
      { x: 40, y: 86, width: 8, height: 6, label: 'root' },
      { x: 60, y: 35, width: 8, height: 6, label: 'leaf' },
      { x: 45, y: 8, width: 8, height: 6, label: 'flower' },
      { x: 44, y: 55, width: 8, height: 6, label: 'stem' },
      { x: 10, y: 10, width: 8, height: 6 },
    ],
  });
  check('a picture that runs down is asked top to bottom', plant.order.map((id) => plant.parts.find((part) => part.id === id).label).join() === 'flower,leaf,stem,root');
  check('a point is a part with no picture of its own; one with no name is nothing', plant.parts.length === 4 && plant.parts.every((part) => part.image === null)
    && plant.imageUris.join() === pic('plant'));

  const many = make({
    board_width: 1000, board_height: 500, bg_image: pic('map'),
    placements: Array.from({ length: 8 }, (_, index) => ({ x: 5 + index * 11, y: 40, width: 6, height: 10, label: `town ${index + 1}` })),
    extra_labels: ['nowhere'],
  });
  check('no more than six parts are asked: the leftmost, and the points past them are gone', many.order.length === rules.LABEL_DIAGRAM_PARTS_MAX
    && many.parts.length === 6 && many.labels.length === rules.LABEL_DIAGRAM_LABELS_MAX && !many.labels.some((label) => label.text === 'nowhere'));
  check('no picture size, or nothing on the picture, is no game', make({ bg_image: pic('map'), placements: [{ x: 1, y: 1, width: 5, height: 5, label: 'a' }] }).board === null
    && make({ board_width: 10, board_height: 10, placements: [] }).board === null);

  const tap = rules.resolveLabelDiagramTap;
  const cardOf = (config, text, used = []) => config.labels.find((label) => label.text === text && !used.includes(label.id)).id;
  check('the name of the part asked is right', JSON.stringify(tap(farm, [], cardOf(farm, 'ძროხა'))) === '{"type":"right","partId":"part_2","complete":false}');
  check('the name of another part is a mistake, and says which part was asked', JSON.stringify(tap(farm, [], cardOf(farm, 'თხა'))) === '{"type":"wrong","partId":"part_2"}');
  check('so is a name of nothing on the picture', tap(farm, [], cardOf(farm, 'ღორი')).type === 'wrong');
  const afterCow = [cardOf(farm, 'ძროხა')];
  check('a card given to its part is not taken again', tap(farm, afterCow, afterCow[0]).type === 'ignored');
  check('then the next part is asked', JSON.stringify(tap(farm, afterCow, cardOf(farm, 'ცხენი'))) === '{"type":"right","partId":"part_5","complete":false}');
  const three = [...afterCow, cardOf(farm, 'ცხენი'), cardOf(farm, 'თხა')];
  check('the last name completes the picture', JSON.stringify(tap(farm, three, cardOf(farm, 'ქათამი'))) === '{"type":"right","partId":"part_4","complete":true}');
  check('a picture all named takes no more', tap(farm, [...three, cardOf(farm, 'ქათამი')], cardOf(farm, 'ღორი')).type === 'ignored');
  check('a card the game does not have is ignored', tap(farm, [], 'zzz').type === 'ignored');

  // Two cows: two cards "cow", and either names either.
  const twins = make({ board_width: 100, board_height: 50, bg_image: pic('bg'), placements: [
    { image: pic('cow'), x: 10, y: 10, width: 20, height: 30, label: 'cow' },
    { image: pic('cow'), x: 60, y: 10, width: 20, height: 30, label: 'cow' },
  ] });
  check('two parts of one name have a card each, and either card is right for either', twins.labels.length === 2
    && tap(twins, [], twins.labels[1].id).type === 'right' && tap(twins, [twins.labels[1].id], twins.labels[0].id).complete === true);

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const world = make({ board_width: 2048, board_height: 1152, bg_image: pic('world'), placements: [
    { x: 18, y: 30, width: 4, height: 7, label: 'North America' }, { x: 28, y: 62, width: 4, height: 7, label: 'South America' },
    { x: 50, y: 28, width: 4, height: 7, label: 'Europe' }, { x: 53, y: 52, width: 4, height: 7, label: 'Africa' },
    { x: 70, y: 32, width: 4, height: 7, label: 'Asia' }, { x: 84, y: 68, width: 4, height: 7, label: 'Australia' },
  ] });
  const stages = [[852, 393, { top: 56, left: 115, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  const configs = [farm, plant, world, twins, many];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => configs.forEach((config, index) => {
    const layout = rules.layoutLabelDiagram(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const rim = rules.LABEL_DIAGRAM_LAYOUT.sheetRim;
    const framed = layout && { left: layout.sheet.left - rim, top: layout.sheet.top - rim, width: layout.sheet.width + rim * 2, height: layout.sheet.height + rim * 2 };
    const ok = layout
      && inside(framed, stage) && inside(layout.tray, stage) && !overlap(framed, layout.tray)
      && Math.abs(layout.sheet.width / layout.sheet.height - config.board.width / config.board.height) < 1e-6
      && layout.parts.length === config.parts.length
      && layout.parts.every((rect, i) => Math.abs(rect.left - (layout.sheet.left + config.parts[i].x / 100 * layout.sheet.width)) < 1e-6
        && Math.abs(rect.top - (layout.sheet.top + config.parts[i].y / 100 * layout.sheet.height)) < 1e-6)
      && layout.pins.length === config.order.length && layout.pins.every((pin, i) => pin.partId === config.order[i] && pin.number === i + 1)
      && layout.cards.length === config.labels.length && layout.cards.every((card, i) => card.id === config.labels[i].id && inside(card, layout.tray)
        && inside(card.badge, card) && card.lines.length >= 1 && card.lines.every((line) => inside(line, card) && line.left >= card.badge.left + card.badge.width))
      && layout.cards.every((card, i) => layout.cards.every((other, j) => i === j || !overlap(card, other)));
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the sheet is whole and uncropped, its parts where the author put them, the cards apart from it and inside the safe area', whole, detail);

  const phone = rules.layoutLabelDiagram(852, 393, farm, { top: 56, left: 115, right: 59, bottom: 21 });
  check('a phone on its side has the cards in a column at the right of the sheet, big enough to read', phone.arrangement === 'column'
    && phone.tray.left > phone.sheet.left + phone.sheet.width && phone.cards[0].lines[0].height >= rules.LABEL_DIAGRAM_LAYOUT.minLine
    && phone.cards.every((card) => Math.abs(card.width - phone.cards[0].width) < 1e-6));
  const tablet = rules.layoutLabelDiagram(1024, 768, farm, { top: 68 });
  check('where the stage is tall the cards stand in a row under the sheet', tablet.arrangement === 'row' && tablet.tray.top > tablet.sheet.top + tablet.sheet.height);
  const pinOf = (layout, config, partId) => ({ pin: layout.pins.find((pin) => pin.partId === partId), rect: layout.parts[config.parts.findIndex((part) => part.id === partId)] });
  const cowPin = pinOf(phone, farm, 'part_2');
  check('a pin stands on the middle of its part', Math.abs(cowPin.pin.left + cowPin.pin.width / 2 - (cowPin.rect.left + cowPin.rect.width / 2)) < 1e-6
    && Math.abs(cowPin.pin.top + cowPin.pin.height / 2 - (cowPin.rect.top + cowPin.rect.height / 2)) < 1e-6);
  check('a pin is big enough to see and never a blot', phone.pins.every((pin) => pin.width >= rules.LABEL_DIAGRAM_LAYOUT.minPin && pin.width <= rules.LABEL_DIAGRAM_LAYOUT.maxPin));
  const wide = rules.layoutLabelDiagram(1250, 750, world, {});
  check('a name of two words may be broken in two lines, never cut', wide.cards.every((card) => card.lines.map((line) => line.text).join(' ') === world.labels.find((label) => label.id === card.id).text));
  check('no picture, no game', rules.layoutLabelDiagram(852, 393, make({ placements: [] }), {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.labelDiagram.wrongFeedbackMs > 0 && rules.GAME_TIMINGS_BY_KIND['label-diagram'] === rules.GAME_TIMINGS.labelDiagram && rules.GAME_GESTURES['label-diagram'] === 'tap');
}

section('reading_text: a text to read and questions about it');

{
  ['reading_text', 'reading', 'reading_comprehension', 'Reading Text'].forEach((type) => {
    check(`${type} resolves to reading-text`, rules.resolveGameKind(type, {}) === 'reading-text');
  });
  check('a question in words is still its own game', rules.resolveGameKind('text_choice', {}) === 'text-choice');

  const story = 'ნინომ ბაღში პატარა კატა იპოვა. კატა ძალიან მშიერი იყო. ნინომ მას რძე მისცა და სახლში წაიყვანა. დედამ თქვა, რომ კატა მათთან დარჩება. ნინომ კატას ფისო დაარქვა.';
  const make = (questions, extra = {}) => rules.normalizeReadingTextConfig({ id: 7 }, { text: story, questions, ...extra });
  const q = (question, right, ...wrong) => ({
    question,
    answers: [{ text: right, is_correct: true }, ...wrong.map((text) => ({ text }))],
  });
  const game = make([
    q('სად იპოვა ნინომ კატა?', 'ბაღში', 'სკოლაში', 'მაღაზიაში'),
    q('რა მისცა ნინომ კატას?', 'რძე', 'წყალი'),
    q('რა დაარქვა კატას?', 'ფისო', 'მურა', 'ციცი'),
  ], { bg_image: 'https://x/bg-room.webp', time_limit: 120 });

  check('the text is kept in one line of words', game.text === story);
  check('three questions, in their order', game.questions.length === 3 && game.questions[1].question === 'რა მისცა ნინომ კატას?');
  check('every question has its right answer among its answers', game.questions.every((item) => item.answers.some((answer) => answer.id === item.correctId && answer.isCorrect)));
  check('the answers are kept whole: three, two, three', game.questions.map((item) => item.answers.length).join() === '3,2,3');
  check('every answer has its own id', new Set(game.questions.flatMap((item) => item.answers.map((answer) => answer.id))).size === 8);
  check('defaults: lives 3, the background to preload', game.lives === 3 && game.time_limit === 120 && game.imageUris.join() === 'https://x/bg-room.webp');

  let moved = false;
  for (let i = 0; i < 40; i += 1) {
    if (make([q('?', 'a', 'b', 'c')]).questions[0].answers[0].text !== 'a') moved = true;
  }
  check('the right answer is not always the first card', moved);

  check('a question without a right answer is dropped', make([{ question: 'რა?', answers: [{ text: 'a' }, { text: 'b' }] }]).questions.length === 0);
  check('a question with one answer is dropped', make([q('რა?', 'a')]).questions.length === 0);
  check('a question with no words is dropped', make([q('', 'a', 'b')]).questions.length === 0);
  const two = make([{ question: 'რა?', answers: [{ text: 'a', is_correct: true }, { text: 'b', is_correct: true }, { text: 'c' }] }]).questions[0];
  check('of two marked right the first is the answer, the second goes', two.answers.length === 2 && two.answers.find((answer) => answer.id === two.correctId).text === 'a' && !two.answers.some((answer) => answer.text === 'b'));
  check('no more than three answers, the right one kept', make([q('რა?', 'a', 'b', 'c', 'd', 'e')]).questions[0].answers.length === rules.READING_TEXT_ANSWERS_MAX
    && make([{ question: 'რა?', answers: [{ text: 'b' }, { text: 'c' }, { text: 'd' }, { text: 'a', is_correct: true }] }]).questions[0].answers.some((answer) => answer.text === 'a'));
  check('no more than three questions', make([q('1', 'a', 'b'), q('2', 'a', 'b'), q('3', 'a', 'b'), q('4', 'a', 'b')]).questions.length === rules.READING_TEXT_QUESTIONS_MAX);
  check('the text may come as a passage, its line breaks as spaces', rules.normalizeReadingTextConfig({ id: 1 }, { passage: ' one\ntwo  three ', questions: [] }).text === 'one two three');

  const tap = rules.resolveReadingTextTap;
  const first = game.questions[0];
  const wrong = first.answers.find((answer) => answer.id !== first.correctId).id;
  check('the right answer of the question asked is right', JSON.stringify(tap(game, 0, [], first.correctId)) === '{"type":"right","complete":false}');
  check('a wrong one is a mistake', tap(game, 0, [], wrong).type === 'wrong');
  check('a wrong one crossed out is not tapped again', tap(game, 0, [wrong], wrong).type === 'ignored');
  check('an answer of another question is ignored', tap(game, 0, [], game.questions[1].correctId).type === 'ignored');
  check('the last question completes the game', tap(game, 2, [], game.questions[2].correctId).complete === true);
  check('past the last question nothing is right', tap(game, 3, [], game.questions[2].correctId).type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const russian = make([q('Где Нино нашла котёнка?', 'В саду', 'В школе', 'В магазине')], { text: 'Нино нашла в саду маленького котёнка. Котёнок был очень голодный. Нино дала ему молока и отнесла домой. Мама сказала, что котёнок останется у них. Нино назвала его Мурзик.' });
  const short = make([q('What is red?', 'The ball', 'The cat')], { text: 'Tom has a red ball.' });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [game, russian, short].forEach((config, index) => {
    const layout = rules.layoutReadingText(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.sheet, stage)
      && layout.lines.length > 0 && layout.lines.every((line) => inside(line, layout.sheet))
      && layout.lines.join(' ') !== '' && layout.lines.map((line) => line.text).join(' ') === config.text
      && layout.steps.length === config.questions.length
      && layout.steps.every((step, s) => step.panel && inside(step.panel, stage) && !overlap(step.panel, layout.sheet)
        && step.cards.length === config.questions[s].answers.length
        && step.cards.every((card) => inside(card, stage) && !overlap(card, layout.sheet) && !overlap(card, step.panel)));
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the text, the question and its answers are whole, apart and inside the safe area', whole, detail);

  const phone = rules.layoutReadingText(852, 393, game, { top: 56, left: 59, right: 59, bottom: 21 });
  const long = make(game.questions.map((item) => ({ question: item.question, answers: item.answers.map((answer) => ({ text: answer.text, is_correct: answer.id === item.correctId })) })), { text: [story, story, story].join(' ') });
  const longPhone = rules.layoutReadingText(852, 393, long, { top: 56, left: 59, right: 59, bottom: 21 });
  check('a long text on a phone on its side has the questions beside it, still big enough to read', longPhone.arrangement === 'side' && longPhone.steps[0].panel.left > longPhone.sheet.left + longPhone.sheet.width && longPhone.lines[0].height >= 16, JSON.stringify([longPhone.arrangement, longPhone.lines[0].height]));
  check('on a phone on its side a short text is written big', phone.lines[0].height >= 26, String(phone.lines[0].height));
  const upright = rules.layoutReadingText(390, 700, game, { top: 60 });
  check('an upright stage has them under it', upright.arrangement === 'stack' && upright.steps[0].panel.top > upright.sheet.top + upright.sheet.height);
  check('the lines of the text start at one edge', new Set(phone.lines.map((line) => Math.round(line.left))).size === 1);
  check('no text or no question, no game', rules.layoutReadingText(852, 393, { text: '', questions: game.questions }, {}) === null
    && rules.layoutReadingText(852, 393, { text: story, questions: [] }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.readingText.nextQuestionMs > 0 && rules.GAME_TIMINGS_BY_KIND['reading-text'] === rules.GAME_TIMINGS.readingText && rules.GAME_GESTURES['reading-text'] === 'tap');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
