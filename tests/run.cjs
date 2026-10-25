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

  // A group on a phone on its side: 340 x 140 of room, three things in it by the end.
  check('a sorted thing fills its group, bigger than a tray tile', rules.sortBinsSortedSide(340, 140, 3, 100, 4) === 110, String(rules.sortBinsSortedSide(340, 140, 3, 100, 4)));
  check('and all of a group still fit', rules.sortBinsSortedSide(340, 140, 6, 100, 4) === 68, String(rules.sortBinsSortedSide(340, 140, 6, 100, 4)));
  check('a big group makes no giants', rules.sortBinsSortedSide(900, 600, 2, 100) === rules.SORT_BINS_TILE_MAX);
  check('an unmeasured group has things the size of a tile', rules.sortBinsSortedSide(0, 0, 3, 100) === 100);
  const squares = rules.fitSquares(300, 100, 6, 10);
  check('squares take the grid that makes them biggest', squares.columns === 3 && squares.rows === 2 && squares.side === 45, JSON.stringify(squares));
}

section('Image Order: slots and pictures are big squares, one line each where they fit');
{
  // A phone on its side, as in the owner's screenshot: four steps.
  const phone = rules.layoutImageOrder(734, 320, 4, 4);
  check('four steps stand in one line of slots and one of pictures', phone.columns === 4 && phone.slotRows === 1 && phone.bankRows === 1, JSON.stringify(phone));
  check('and are far bigger than the old cards', phone.tile >= 130, JSON.stringify(phone));
  check('the board fits the room', phone.left + phone.panelWidth <= 734 && phone.top + phone.slotPanelHeight + phone.sectionGap + phone.bankPanelHeight <= 320);
  check('in its middle', Math.abs(phone.left + phone.panelWidth / 2 - 734 / 2) <= 1);

  const small = rules.layoutImageOrder(560, 250, 4, 4);
  check('a small phone keeps them in one line too', small.columns === 4 && small.tile >= 95, JSON.stringify(small));

  const six = rules.layoutImageOrder(734, 320, 6, 6);
  check('six steps stand in one line where that is bigger', six.columns === 6 && six.tile > 0, JSON.stringify(six));

  const shown = rules.layoutImageOrder(734, 320, 4, 3);
  check('a step shown as an example leaves the pictures one fewer, in the same lines', shown.columns === 4 && shown.bankRows === 1);
  const allShown = rules.layoutImageOrder(734, 320, 4, 0);
  check('nothing to place, no pictures panel', allShown.bankRows === 0 && allShown.bankPanelHeight === 0 && allShown.sectionGap === 0);

  const tablet = rules.layoutImageOrder(1000, 700, 4, 4);
  check('a big screen makes no giants, and keeps one line', tablet.tile === rules.IMAGE_ORDER_TILE_MAX && tablet.columns === 4, JSON.stringify(tablet));

  const upright = rules.layoutImageOrder(360, 600, 4, 4);
  check('a tall room breaks the line where that is bigger', upright.columns === 2 && upright.slotRows === 2, JSON.stringify(upright));

  const beside = rules.layoutImageOrder(600, 300, 4, 4, 80);
  check('the speaker\'s corner moves the board no further than it must', beside.left >= 80 && beside.left + beside.panelWidth <= 600, JSON.stringify(beside));
  const clear = rules.layoutImageOrder(1000, 300, 4, 4, 40);
  check('a board clear of the corner stays in the middle', Math.abs(clear.left + clear.panelWidth / 2 - 500) <= 1, JSON.stringify(clear));

  check('no room, no sizes', rules.layoutImageOrder(0, 0, 4, 4).tile === 0);
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

check('timings are published for every game', Object.keys(rules.GAME_TIMINGS).length === Object.keys(rules.GAME_KIND_KEYS).length && Object.values(rules.GAME_KIND_KEYS).every((key) => rules.GAME_TIMINGS[key]));
check('failure reasons are named', rules.FAILURE_REASON.wrongCatch === 'wrong_catch' && rules.FAILURE_REASON.livesOut === 'lives_out');


section('every playable kind is registered');

const playableKinds = Object.keys(rules.GAME_KIND_KEYS);
check('every kind but generic, each once', playableKinds.length === new Set(playableKinds).size && playableKinds.length >= 21 && !playableKinds.includes('generic'));
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

section('word_problem: a problem in words, its answer typed');

{
  ['word_problem', 'story_problem', 'math_word_problem', 'Word Problem'].forEach((type) => {
    check(`${type} resolves to word-problem`, rules.resolveGameKind(type, {}) === 'word-problem');
  });
  check('a typed example is still its own game', rules.resolveGameKind('math_input', {}) === 'math-input');

  const text = 'ნინოს ჰქონდა 12 ვაშლი. 5 ვაშლი გიოს აჩუქა. რამდენი ვაშლი დარჩა ნინოს?';
  const game = rules.normalizeWordProblemConfig({ text, answer: 7, unit: 'ვაშლი', bg_image: 'https://x/bg-garden.webp', time_limit: 90 });
  check('the problem, its answer and its unit', game.text === text && game.answer === 7 && game.unit === 'ვაშლი');
  check('room for two digits at least', game.maxDigits === 2);
  check('as many as the answer has', rules.normalizeWordProblemConfig({ text, answer: 1250 }).maxDigits === 4);
  check('defaults: lives 3, the background to preload', game.lives === 3 && game.time_limit === 90 && game.imageUris.join() === 'https://x/bg-garden.webp');
  check('the problem may come as problem, its line breaks as spaces', rules.normalizeWordProblemConfig({ problem: ' a\nb  c ', answer: '3' }).text === 'a b c' && rules.normalizeWordProblemConfig({ problem: 'a', answer: '3' }).answer === 3);
  check('an answer past 9999, negative or missing is none', [10000, -2, undefined, 'x'].every((answer) => rules.normalizeWordProblemConfig({ text, answer }).answer === -1));

  const enter = rules.resolveWordProblemEntry;
  check('the answer is right', JSON.stringify(enter(game, '7')) === '{"type":"right","value":7}');
  check('another number is a mistake', enter(game, '8').type === 'wrong' && enter(game, '70').type === 'wrong');
  check('nothing typed, nothing happens', enter(game, '').type === 'ignored');
  check('a game with no answer takes nothing', enter({ answer: -1 }, '0').type === 'ignored');
  check('zero can be the answer', enter({ answer: 0 }, '0').type === 'right');
  check('a key types as in the typed example', rules.pressMathInputKey('1', '2', game.maxDigits) === '12' && rules.pressMathInputKey('12', '3', game.maxDigits) === '12');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const russian = rules.normalizeWordProblemConfig({ text: 'В корзине было 25 груш. Мама положила ещё 18 груш, а потом 9 груш съели дети. Сколько груш осталось в корзине?', answer: 34, unit: 'груш' });
  const english = rules.normalizeWordProblemConfig({ text: 'Tom has 3 boxes with 6 pencils in each. How many pencils does he have?', answer: 18 });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [game, russian, english].forEach((config, index) => {
    const layout = rules.layoutWordProblem(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const answers = [layout && layout.answer, layout && layout.unit, layout && layout.pad].filter(Boolean);
    const ok = layout && inside(layout.sheet, stage)
      && layout.lines.length > 0 && layout.lines.every((line) => inside(line, layout.sheet))
      && layout.lines.map((line) => line.text).join(' ') === config.text
      && answers.every((rect) => inside(rect, stage) && !overlap(rect, layout.sheet))
      && (config.unit === '' ? layout.unit === null : layout.unit.text === config.unit && !overlap(layout.unit, layout.answer))
      && !overlap(layout.answer, layout.pad)
      && layout.keys.length === 12 && layout.keys.every((key) => inside(key, layout.pad) && key.height >= 40);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the problem, the answer and the keys are whole, apart, inside the safe area and big enough to hit', whole, detail);

  const phone = rules.layoutWordProblem(852, 393, russian, { top: 56, left: 59, right: 59, bottom: 21 });
  check('on a phone on its side the pad stands beside the problem', phone.arrangement === 'side' && phone.pad.left > phone.sheet.left + phone.sheet.width, phone.arrangement);
  check('and the problem is written big enough to read', phone.lines[0].height >= 18, String(phone.lines[0].height));
  const upright = rules.layoutWordProblem(390, 700, russian, { top: 60 });
  check('an upright stage has them under it', upright.arrangement === 'stack' && upright.answer.top > upright.sheet.top + upright.sheet.height);
  check('no words, no game', rules.layoutWordProblem(852, 393, { text: '', unit: '', maxDigits: 2 }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.wordProblem.wrongFeedbackMs > 0 && rules.GAME_TIMINGS_BY_KIND['word-problem'] === rules.GAME_TIMINGS.wordProblem && rules.GAME_GESTURES['word-problem'] === 'tap');
}

section('money_pay: pay a price, or give the change, with lari');

{
  ['money_pay', 'give_change', 'shop_pay', 'Money Pay'].forEach((type) => {
    check(`${type} resolves to money-pay`, rules.resolveGameKind(type, {}) === 'money-pay');
  });

  check('a coin up to 2 lari, a note from 5', rules.moneyPieceKind(200) === 'coin' && rules.moneyPieceKind(500) === 'note');
  check('a price is said in lari and tetri, in the game\'s language',
    JSON.stringify(rules.formatMoneyLines(350, 'ka')) === '["3 ლარი","50 თეთრი"]'
      && JSON.stringify(rules.formatMoneyLines(300, 'ru')) === '["3 лари"]'
      && JSON.stringify(rules.formatMoneyLines(50, 'en')) === '["50 tetri"]'
      && JSON.stringify(rules.formatMoneyLines(120, 'xx')) === '["1 ლარი","20 თეთრი"]');
  check('whether some pieces make a sum exactly',
    rules.moneyPayReachable([200, 100, 50], 350) && !rules.moneyPayReachable([200, 100, 50], 40) && !rules.moneyPayReachable([100], 0));

  const purse = [{ value: 100, count: 3 }, { value: 500, count: 1, image: 'https://x/banknote-5-lari.webp' }, { value: 50, count: 2 }, { value: 20, count: 3 }, { value: 7, count: 2 }];
  const game = rules.normalizeMoneyPayConfig({ price: 350, pieces: purse, item_image: 'https://x/ball.webp', bg_image: 'https://x/bg-shop.webp', language: 'ru', time_limit: 90 });
  check('the purse one piece an entry, the biggest first, a value that is no money left out',
    game.pieces.map((piece) => piece.value).join() === '500,100,100,100,50,50,20,20,20'
      && game.pieces[0].kind === 'note' && game.pieces[0].image === 'https://x/banknote-5-lari.webp' && game.pieces[1].image === null
      && new Set(game.pieces.map((piece) => piece.id)).size === game.pieces.length);
  check('pay mode: the counter must hold the price', game.mode === 'pay' && game.price === 350 && game.target === 350 && game.paid === null && game.language === 'ru');
  check('the pictures to preload', game.imageUris.join() === 'https://x/bg-shop.webp,https://x/ball.webp,https://x/banknote-5-lari.webp' && game.lives === 3 && game.time_limit === 90);
  check('no more than twelve pieces', rules.normalizeMoneyPayConfig({ price: 10, pieces: [{ value: 10, count: 30 }] }).pieces.length === rules.MONEY_PAY_PIECES_MAX);

  const change = rules.normalizeMoneyPayConfig({ price: 350, paid: { value: 500, image: 'https://x/banknote-5-lari.webp' }, pieces: [{ value: 100, count: 2 }, { value: 50, count: 1 }] });
  check('change mode: the buyer paid, the counter takes the change', change.mode === 'change' && change.paid.value === 500 && change.paid.kind === 'note' && change.target === 150);
  check('a price the purse cannot make, or no change, is no game',
    rules.normalizeMoneyPayConfig({ price: 40, pieces: [{ value: 50, count: 2 }] }).target === -1
      && rules.normalizeMoneyPayConfig({ price: 500, paid: 500, pieces: [{ value: 50, count: 2 }] }).target === -1
      && rules.normalizeMoneyPayConfig({ price: 0, pieces: [{ value: 50, count: 2 }] }).target === -1);

  const tap = rules.resolveMoneyPayTap;
  check('a piece goes on the counter while there is still some to make', JSON.stringify(tap(game, [], 'piece-100-1')) === '{"type":"placed","total":100}');
  check('the piece that makes the sum wins', JSON.stringify(tap(game, ['piece-100-1', 'piece-100-2', 'piece-100-3'], 'piece-50-1')) === '{"type":"right","total":350}');
  check('one that would go past it is a mistake and stays', JSON.stringify(tap(game, ['piece-100-1'], 'piece-500-1')) === '{"type":"over","total":100}');
  check('a piece on the counter comes back for nothing', JSON.stringify(tap(game, ['piece-100-1', 'piece-50-1'], 'piece-100-1')) === '{"type":"returned","total":50}');
  check('nothing else is taken', tap(game, [], 'nope').type === 'ignored' && tap({ pieces: game.pieces, target: -1 }, [], 'piece-100-1').type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const full = rules.normalizeMoneyPayConfig({ price: 1290, pieces: [{ value: 1000, count: 1 }, { value: 500, count: 1 }, { value: 200, count: 2 }, { value: 100, count: 2 }, { value: 50, count: 2 }, { value: 20, count: 2 }, { value: 10, count: 2 }], item_image: 'https://x/bag.webp' });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [game, change, full].forEach((config, index) => {
    const layout = rules.layoutMoneyPay(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const homes = config.pieces.map((piece) => layout && layout.homes[piece.id]);
    // The fullest counter there can be: the cheapest pieces that still keep within the sum.
    const cheapest = [...config.pieces].sort((a, b) => a.value - b.value);
    const most = [];
    let sum = 0;
    for (const piece of cheapest) { if (sum + piece.value > config.target) break; most.push(piece); sum += piece.value; }
    const placed = layout ? Object.values(rules.moneyPayCounterPlaces(layout, most)) : [];
    const shop = [layout && layout.item, layout && layout.tag, layout && layout.paid].filter(Boolean);
    const ok = layout && homes.every((rect) => rect && inside(rect, layout.purse))
      && homes.every((a, i) => homes.every((b, j) => i === j || !overlap(a, b)))
      && placed.length === most.length && placed.every((rect) => inside(rect, layout.counter))
      && [layout.counter, layout.purse, ...shop].every((rect) => inside(rect, stage))
      && !overlap(layout.counter, layout.purse) && shop.every((rect) => !overlap(rect, layout.counter) && !overlap(rect, layout.purse))
      && layout.tagLines.every((line) => inside(line, layout.tag)) && layout.tagLines[0].height >= rules.MONEY_PAY_LAYOUT.minTagLine
      && layout.coin >= rules.MONEY_PAY_LAYOUT.minCoin
      && (config.paid ? layout.paid !== null : layout.paid === null);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the shop, the counter and the purse are whole, apart, inside the safe area, the price readable and the coins big enough to hit', whole, detail);
  check('a note is twice a coin wide', (() => { const layout = rules.layoutMoneyPay(852, 393, game, {}); return Math.abs(layout.homes['piece-500-1'].width - layout.coin * 2) < 1e-6 && Math.abs(layout.homes['piece-100-1'].width - layout.coin) < 1e-6; })());
  check('no money, no game', rules.layoutMoneyPay(852, 393, { pieces: [], paid: null, price: 100, target: 100, language: 'ka', item_image: null }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.moneyPay.flyMs > 0 && rules.GAME_TIMINGS_BY_KIND['money-pay'] === rules.GAME_TIMINGS.moneyPay && rules.GAME_GESTURES['money-pay'] === 'tap');
}

section('clock_set: set the hands of a clock, or read one');

{
  ['clock_set', 'read_clock', 'what_time', 'Clock Set'].forEach((type) => {
    check(`${type} resolves to clock-set`, rules.resolveGameKind(type, {}) === 'clock-set');
  });

  check('a time is written with two digits of minutes', rules.clockTimeLabel({ hour: 7, minute: 5 }) === '7:05' && rules.clockTimeLabel({ hour: 12, minute: 30 }) === '12:30');
  const angles = rules.clockHandAngles({ hour: 7, minute: 30 });
  check('the short hand moves on with the minutes', angles.hour === 225 && angles.minute === 180 && rules.clockHandAngles({ hour: 12, minute: 0 }).hour === 0);
  check('the likeliest mistake comes first: the hands read the other way round',
    rules.clockConfusions({ hour: 7, minute: 30 }).map(rules.clockTimeLabel).slice(0, 3).join() === '6:35,8:30,6:30'
      && rules.clockConfusions({ hour: 3, minute: 0 }).every((time) => !(time.hour === 3 && time.minute === 0)));

  const set = rules.normalizeClockSetConfig({ time: '19:30', bg_image: 'https://x/bg-room.webp', time_limit: 60 });
  check('set mode by default, a 24-hour time read on the dial', set.mode === 'set' && set.time.hour === 7 && set.time.minute === 30 && set.options.length === 0);
  check('the hour and the minute apart, and the defaults', rules.normalizeClockSetConfig({ hour: '3', minute: '15' }).time.minute === 15 && set.lives === 3 && set.imageUris.join() === 'https://x/bg-room.webp');
  check('no time, or minutes off the dial, is no game', [{}, { time: '7:31' }, { hour: 30 }, { time: 'seven' }].every((config) => rules.normalizeClockSetConfig(config).time === null));

  const read = rules.normalizeClockSetConfig({ mode: 'read', time: '7:30', wrong: ['8:30', { hour: 6, minute: 35 }, '7:30', 'nope'] });
  const labels = read.options.map((option) => option.label).sort();
  check('read mode: the right time among the wrong ones written, mixed', labels.join() === '6:35,7:30,8:30', labels.join());
  check('three times at least: the wrong ones missing are made up', rules.normalizeClockSetConfig({ mode: 'read', time: '3:00' }).options.length === 3
    && rules.normalizeClockSetConfig({ mode: 'read', time: '3:00', wrong: ['4:00', '2:00', '3:30', '9:15'] }).options.length === 4);

  const hands = { hour: null, minute: null, active: 'hour' };
  const first = rules.pressClockNumber(hands, 7);
  const second = rules.pressClockNumber(first, 6);
  check('a number moves the hand that glows: the short one first, then the long one', first.hour === 7 && first.active === 'minute' && second.minute === 30 && second.active === 'hour' && rules.pressClockNumber(second, 12).hour === 12 && rules.pressClockNumber({ ...second, active: 'minute' }, 12).minute === 0);
  check('no such number, no move', rules.pressClockNumber(hands, 13) === hands);
  check('the tick: nothing before both hands are set, then right or wrong',
    rules.resolveClockSetCheck(set, { hour: 7, minute: null }).type === 'ignored'
      && rules.resolveClockSetCheck(set, { hour: 7, minute: 30 }).type === 'right'
      && rules.resolveClockSetCheck(set, { hour: 6, minute: 30 }).type === 'wrong');
  const right = read.options.find((option) => option.label === '7:30');
  const wrong = read.options.find((option) => option.label === '8:30');
  check('a card: right, wrong, or none of them', rules.resolveClockReadTap(read, right.id).type === 'right' && rules.resolveClockReadTap(read, wrong.id).type === 'wrong' && rules.resolveClockReadTap(read, 'nope').type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const four = rules.normalizeClockSetConfig({ mode: 'read', time: '10:45', wrong: ['9:50', '11:45', '10:15'] });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [set, read, four].forEach((config, index) => {
    const layout = rules.layoutClockSet(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const rest = [layout && layout.target, layout && layout.check, ...(layout ? layout.options : [])].filter(Boolean);
    const ok = layout && inside(layout.clock, stage) && Math.abs(layout.clock.width - layout.clock.height) < 1e-6
      && layout.numbers.length === 12 && layout.numbers.every((number) => inside(number.glyph, layout.clock) && number.zone.width >= 40 && Math.hypot(number.glyph.left + number.glyph.width / 2 - layout.clock.left - layout.clock.width / 2, number.glyph.top - layout.clock.top - layout.clock.height / 2) < layout.clock.width / 2 * 0.78 && Math.hypot(number.glyph.left + number.glyph.width / 2 - layout.clock.left - layout.clock.width / 2, number.glyph.top + number.glyph.height - layout.clock.top - layout.clock.height / 2) < layout.clock.width / 2 * 0.78)
      && rest.every((rect) => inside(rect, stage) && !overlap(rect, layout.clock))
      && (config.mode === 'set'
        ? layout.target.text === '7:30' && layout.target.height >= rules.CLOCK_SET_LAYOUT.minLine && inside(layout.target, layout.targetCard) && inside(layout.targetCard, stage) && !overlap(layout.targetCard, layout.check) && !overlap(layout.targetCard, layout.clock) && layout.check.height >= 40
        : layout.options.length === config.options.length && layout.options.every((card, i) => card.id === config.options[i].id && inside(card.line, card) && card.line.height >= rules.CLOCK_SET_LAYOUT.minLine
          && layout.options.every((other, j) => i === j || !overlap(card, other))));
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the clock is whole and square, its numbers big enough to tap, the time and the cards beside it, apart, readable', whole, detail);
  check('no time, no game', rules.layoutClockSet(852, 393, { mode: 'set', time: null, options: [] }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.clockSet.turnMs > 0 && rules.GAME_TIMINGS_BY_KIND['clock-set'] === rules.GAME_TIMINGS.clockSet && rules.GAME_GESTURES['clock-set'] === 'tap');
}

section('fraction_pick: shade a fraction of a shape, or pick the shape that shows it');

{
  ['fraction_pick', 'fractions', 'shade_fraction', 'Fraction Pick'].forEach((type) => {
    check(`${type} resolves to fraction-pick`, rules.resolveGameKind(type, {}) === 'fraction-pick');
  });

  const label = (fraction) => `${fraction.shaded}/${fraction.parts}`;
  check('a fraction from 3/4, the two numbers, or an object', label(rules.readFraction('3/4')) === '3/4' && label(rules.readFraction(2, 5)) === '2/5' && label(rules.readFraction({ numerator: 1, denominator: 3 })) === '1/3');
  check('none a shape cannot show', [rules.readFraction('0/4'), rules.readFraction('5/4'), rules.readFraction('1/13'), rules.readFraction('1/1'), rules.readFraction('half')].every((value) => value === null));
  check('the same amount is the same', rules.sameFractionValue({ shaded: 2, parts: 4 }, { shaded: 1, parts: 2 }) && !rules.sameFractionValue({ shaded: 1, parts: 3 }, { shaded: 1, parts: 4 }));
  check('the likeliest mistakes: the part left unshaded first, none the same amount, never the whole',
    rules.fractionConfusions({ shaded: 3, parts: 4 }).map(label).join() === '1/4,2/4,3/5'
      && rules.fractionConfusions({ shaded: 1, parts: 2 }).every((fraction) => fraction.shaded < fraction.parts && !rules.sameFractionValue(fraction, { shaded: 1, parts: 2 })));

  const shade = rules.normalizeFractionPickConfig({ fraction: '3/4', bg_image: 'https://x/bg.webp', time_limit: 60 });
  check('shade mode on a circle by default', shade.mode === 'shade' && shade.shape === 'circle' && label(shade.fraction) === '3/4' && shade.options.length === 0 && shade.lives === 3 && shade.imageUris.join() === 'https://x/bg.webp');
  const pick = rules.normalizeFractionPickConfig({ mode: 'pick', shape: 'bar', fraction: '1/2', wrong: ['2/4', '1/3', '1/3', 'x'] });
  check('pick mode: the right shape among the wrong ones, one of the same amount left out, mixed',
    pick.shape === 'bar' && pick.options.map((option) => label(option.fraction)).sort().join() === '1/2,1/3,1/4', pick.options.map((option) => label(option.fraction)).join());
  check('three shapes at least, four at most', rules.normalizeFractionPickConfig({ mode: 'pick', fraction: '2/3', wrong: ['1/3', '1/4', '3/4', '2/5', '1/5'] }).options.length === 4);
  check('no fraction, no game', rules.normalizeFractionPickConfig({ fraction: '7/4' }).fraction === null);

  check('a part tapped is shaded, tapped again it is not', rules.toggleFractionPart([], 2, 4).join() === '2' && rules.toggleFractionPart([0, 2], 2, 4).join() === '0' && rules.toggleFractionPart([1], 3, 4).join() === '1,3' && rules.toggleFractionPart([1], 9, 4).join() === '1');
  check('the tick: right for as many parts as the top number, any of them',
    rules.resolveFractionShadeCheck(shade, []).type === 'ignored' && rules.resolveFractionShadeCheck(shade, [0, 2, 3]).type === 'right' && rules.resolveFractionShadeCheck(shade, [1, 2, 3]).type === 'right' && rules.resolveFractionShadeCheck(shade, [0, 1]).type === 'wrong');
  const right = pick.options.find((option) => label(option.fraction) === '1/2');
  const wrong = pick.options.find((option) => label(option.fraction) === '1/3');
  check('a shape: right, wrong, or none of them', rules.resolveFractionPickTap(pick, right.id).type === 'right' && rules.resolveFractionPickTap(pick, wrong.id).type === 'wrong' && rules.resolveFractionPickTap(pick, 'nope').type === 'ignored');
  check('a point falls in the part drawn there, and outside in none',
    rules.fractionPartAt('circle', 4, 0.7, 0.3) === 0 && rules.fractionPartAt('circle', 4, 0.7, 0.7) === 1 && rules.fractionPartAt('circle', 4, 0.3, 0.7) === 2 && rules.fractionPartAt('circle', 4, 0.3, 0.3) === 3
      && rules.fractionPartAt('circle', 4, 0.02, 0.02) === -1 && rules.fractionPartAt('bar', 5, 0.05, 0.5) === 0 && rules.fractionPartAt('bar', 5, 0.95, 0.5) === 4 && rules.fractionPartAt('bar', 5, 0.5, 0.99) === -1);
  check('a circle is cut from the top clockwise, a bar from the left, into as many parts as asked',
    rules.fractionPartPaths('circle', 4).length === 4 && rules.fractionPartPaths('circle', 4)[0] === 'M50 50L50 4A46 46 0 0 1 96 50Z'
      && rules.fractionPartPaths('bar', 3)[0] === 'M4 4H101.33V96H4Z' && rules.fractionShapeViewBox('bar').width === 300);

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const bar = rules.normalizeFractionPickConfig({ fraction: '5/8', shape: 'bar' });
  const pickCircle = rules.normalizeFractionPickConfig({ mode: 'pick', fraction: '2/3', wrong: ['1/3', '3/4', '2/5'] });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [shade, bar, pick, pickCircle].forEach((config, index) => {
    const layout = rules.layoutFractionPick(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const card = layout && layout.fraction;
    const things = layout ? [layout.shape, layout.check, ...layout.options].filter(Boolean) : [];
    const ok = layout && inside(card.card, stage) && [card.top, card.bar, card.bottom].every((rect) => inside(rect, card.card))
      && !overlap(card.top, card.bottom) && card.top.height >= rules.FRACTION_PICK_LAYOUT.minNumber
      && things.every((rect) => inside(rect, stage) && !overlap(rect, card.card))
      && things.every((a, i) => things.every((b, j) => i === j || !overlap(a, b)))
      && (config.mode === 'shade'
        ? layout.check.height >= 40 && Math.abs(layout.shape.width / layout.shape.height - (config.shape === 'bar' ? 3 : 1)) < 1e-6
        : layout.options.length === config.options.length && layout.options.every((option, i) => option.id === config.options[i].id && option.height >= 60));
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the fraction, the shape and its tick, or the shapes to pick, are whole, apart, inside the safe area and big enough', whole, detail);
  check('no fraction, no layout', rules.layoutFractionPick(852, 393, { mode: 'shade', shape: 'circle', fraction: null, options: [] }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.fractionPick.fillMs > 0 && rules.GAME_TIMINGS_BY_KIND['fraction-pick'] === rules.GAME_TIMINGS.fractionPick && rules.GAME_GESTURES['fraction-pick'] === 'tap');
}

section('sentence_build: a sentence put together from its words');

{
  ['sentence_build', 'build_sentence', 'word_order', 'Sentence Build'].forEach((type) => {
    check(`${type} resolves to sentence-build`, rules.resolveGameKind(type, {}) === 'sentence-build');
  });
  check('a word is still its own game', rules.resolveGameKind('word_build', {}) === 'word-build');

  const ka = rules.normalizeSentenceBuildConfig({ sentence: '  ნინომ ბაღში  პატარა კატა იპოვა. ', extra_words: 'სკოლაში, ძაღლი კატა', question_image: 'https://x/cat.webp', bg_image: 'https://x/bg.webp', time_limit: 90 });
  check('the sentence a word a place, its end mark apart', ka.words.join(' ') === 'ნინომ ბაღში პატარა კატა იპოვა' && ka.ending === '.');
  check('the tiles: its words and the ones that do not belong — none of them a word of it', ka.tiles.length === 7 && ka.tiles.map((tile) => tile.word).sort().join() === ['ნინომ', 'ბაღში', 'პატარა', 'კატა', 'იპოვა', 'სკოლაში', 'ძაღლი'].sort().join());
  check('mixed, never already in order', !ka.tiles.slice(0, 5).every((tile, index) => tile.word === ka.words[index]));
  check('defaults: lives 3, the background and the picture to preload', ka.lives === 3 && ka.time_limit === 90 && ka.imageUris.join() === 'https://x/bg.webp,https://x/cat.webp');
  const ru = rules.normalizeSentenceBuildConfig({ sentence: 'Кошка спит на окне?', extra_words: ['собака', 'Собака'] });
  check('a question mark, and a word that does not belong given twice is one tile', ru.ending === '?' && ru.tiles.length === 5);
  check('no end mark is none', rules.normalizeSentenceBuildConfig({ sentence: 'Tom runs fast' }).ending === '');
  check('one word is no sentence, and no game', rules.normalizeSentenceBuildConfig({ sentence: 'Cat.' }).words.length === 0 && rules.normalizeSentenceBuildConfig({ sentence: 'Cat.' }).tiles.length === 0);
  check('ten words at most, three that do not belong', rules.normalizeSentenceBuildConfig({ sentence: 'a b c d e f g h i j k l', extra_words: 'p q r s t' }).tiles.length === 13);

  const tap = rules.resolveSentenceBuildTap;
  const game = { words: ['The', 'cat', 'sleeps'], tiles: [{ id: 'a', word: 'cat' }, { id: 'b', word: 'sleeps' }, { id: 'c', word: 'the' }, { id: 'd', word: 'dog' }] };
  check('the word that comes next goes to its place, whatever its case', JSON.stringify(tap(game, [], 'c')) === '{"type":"place","slot":0,"complete":false}');
  check('another word is a mistake', JSON.stringify(tap(game, ['c'], 'b')) === '{"type":"wrong","slot":1}' && tap(game, ['c'], 'd').type === 'wrong');
  check('the last word completes it', JSON.stringify(tap(game, ['c', 'a'], 'b')) === '{"type":"place","slot":2,"complete":true}');
  check('a tile placed already, or the sentence built, takes nothing', tap(game, ['c'], 'c').type === 'ignored' && tap(game, ['c', 'a', 'b'], 'd').type === 'ignored' && tap(game, [], 'zz').type === 'ignored');
  const twice = { words: ['a', 'cat', 'and', 'a', 'dog'], tiles: [{ id: 'x', word: 'a' }, { id: 'y', word: 'a' }] };
  check('a word the sentence has twice: either tile goes first', tap(twice, [], 'y').type === 'place' && tap(twice, ['y', 'q', 'r'], 'x').type === 'place');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const en = rules.normalizeSentenceBuildConfig({ sentence: 'The big brown dog runs in the green park every morning!', extra_words: 'cat, slowly, red' });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [ka, ru, en].forEach((config, index) => {
    const layout = rules.layoutSentenceBuild(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.panel, stage) && inside(layout.tray, stage) && !overlap(layout.panel, layout.tray)
      && layout.slots.length === config.words.length && layout.slots.every((slot) => inside(slot, layout.panel))
      && layout.slots.every((a, i) => layout.slots.every((b, j) => i === j || !overlap(a, b)))
      && layout.tiles.length === config.tiles.length && layout.tiles.every((tile) => inside(tile, layout.tray) && tile.height >= 40)
      && layout.tiles.every((a, i) => layout.tiles.every((b, j) => i === j || !overlap(a, b)))
      // A tile flies into the place of its word: of the same spelling, they are the same size.
      && config.tiles.every((tile, i) => { const slot = config.words.findIndex((word) => word === tile.word); return slot < 0 || Math.abs(layout.slots[slot].width - layout.tiles[i].width) < 1e-6; })
      && (config.ending ? inside(layout.ending, layout.panel) && !layout.slots.some((slot) => overlap(slot, layout.ending)) : layout.ending === null)
      && (config.questionImage ? inside(layout.picture, layout.panel) && !layout.slots.some((slot) => overlap(slot, layout.picture)) : layout.picture === null);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the sentence, its end mark and its picture on the panel, the tiles below, apart, inside the safe area and big enough to hit', whole, detail);
  check('no sentence, no layout', rules.layoutSentenceBuild(852, 393, { words: [], tiles: [], ending: '', questionImage: null }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.sentenceBuild.flyMs > 0 && rules.GAME_TIMINGS_BY_KIND['sentence-build'] === rules.GAME_TIMINGS.sentenceBuild && rules.GAME_GESTURES['sentence-build'] === 'tap');
}

section('word_sort: words sorted into baskets');

{
  ['word_sort', 'sort_words', 'word_groups', 'Word Sort'].forEach((type) => {
    check(`${type} resolves to word-sort`, rules.resolveGameKind(type, {}) === 'word-sort');
  });
  check('pictures to sort are still their own game', rules.resolveGameKind('sort_bins', {}) === 'sort-bins');

  const words = [['дом', 1], ['бежит', 2], ['красный', 3], ['книга', 1], ['читает', 2], ['большой', 3], ['мяч', 1], ['поёт', 2]];
  const game = rules.normalizeWordSortConfig({ bins: [{ label: 'Предмет' }, 'Действие', 'Признак'], words: words.map(([word, bin]) => ({ word, bin })), bg_image: 'https://x/bg.webp', time_limit: 90 });
  check('the baskets by their names, the words by their baskets counted from 1', game.bins.map((bin) => bin.label).join() === 'Предмет,Действие,Признак' && game.words.length === 8
    && game.words.find((word) => word.word === 'красный').bin === 'bin_3' && game.words.find((word) => word.word === 'дом').bin === 'bin_1');
  check('mixed, never three of one basket running', game.words.every((word, index) => index < 2 || !(word.bin === game.words[index - 1].bin && word.bin === game.words[index - 2].bin)));
  check('defaults: lives 3, the background to preload', game.lives === 3 && game.time_limit === 90 && game.imageUris.join() === 'https://x/bg.webp');
  check('a word given its basket by name', rules.normalizeWordSortConfig({ bins: ['a', 'b'], words: [{ word: 'w1', bin: 'A' }, { word: 'w2', bin: 'b' }, { word: 'w3', bin: 'a' }, { word: 'w4', bin: 'b' }] }).words.length === 4);
  check('a word of no basket, and an empty word, are left out', rules.normalizeWordSortConfig({ bins: ['a', 'b'], words: [{ word: 'w1', bin: 1 }, { word: 'w2', bin: 2 }, { word: 'w3', bin: 1 }, { word: 'w4', bin: 2 }, { word: 'w5', bin: 5 }, { word: ' ', bin: 1 }] }).words.length === 4);
  check('a basket of no word is left out; fewer than two baskets or four words is no game',
    rules.normalizeWordSortConfig({ bins: ['a', 'b', 'c'], words: [{ word: 'w1', bin: 1 }, { word: 'w2', bin: 2 }, { word: 'w3', bin: 1 }, { word: 'w4', bin: 2 }] }).bins.length === 2
      && rules.normalizeWordSortConfig({ bins: ['a', 'b'], words: [{ word: 'w1', bin: 1 }, { word: 'w2', bin: 1 }, { word: 'w3', bin: 1 }, { word: 'w4', bin: 1 }] }).words.length === 0
      && rules.normalizeWordSortConfig({ bins: ['a', 'b'], words: [{ word: 'w1', bin: 1 }, { word: 'w2', bin: 2 }] }).words.length === 0);
  check('eight words at most, three baskets', rules.normalizeWordSortConfig({ bins: ['a', 'b', 'c', 'd'], words: Array.from({ length: 12 }, (_u, i) => ({ word: 'w' + i, bin: (i % 4) + 1 })) }).words.length === 8);

  const first = game.words[0];
  const elsewhere = game.bins.find((bin) => bin.id !== first.bin).id;
  check('the basket the word asked belongs in is right, another one is a mistake', JSON.stringify(rules.resolveWordSortTap(game, 0, first.bin)) === JSON.stringify({ type: 'right', word: first.id, complete: false })
    && rules.resolveWordSortTap(game, 0, elsewhere).type === 'wrong');
  check('the last word completes it, and nothing is asked after', rules.resolveWordSortTap(game, 7, game.words[7].bin).complete === true && rules.resolveWordSortTap(game, 8, 'bin_1').type === 'ignored' && rules.resolveWordSortTap(game, 0, 'nope').type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const two = rules.normalizeWordSortConfig({ bins: ['საგანი', 'მოქმედება'], words: [['სახლი', 1], ['ხტება', 2], ['წიგნი', 1], ['კითხულობს', 2], ['ბურთი', 1], ['მღერის', 2]].map(([word, bin]) => ({ word, bin })) });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [game, two].forEach((config, index) => {
    const layout = rules.layoutWordSort(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const most = Math.max(...config.bins.map((bin) => config.words.filter((word) => word.bin === bin.id).length));
    const ok = layout && inside(layout.card, stage) && layout.line >= rules.WORD_SORT_LAYOUT.minLine
      && layout.bins.length === config.bins.length && layout.bins.every((bin, i) => bin.id === config.bins[i].id && inside(bin, stage) && !overlap(bin, layout.card)
        && inside(bin.label, bin) && bin.slots.length === most && bin.slots.every((slot) => inside(slot, bin) && !overlap(slot, bin.label)))
      && layout.bins.every((a, i) => layout.bins.every((b, j) => i === j || !overlap(a, b)));
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the word asked and the baskets are whole, apart, inside the safe area, every word with room in its basket', whole, detail);
  check('no words, no layout', rules.layoutWordSort(852, 393, { bins: [], words: [] }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.wordSort.flyMs > 0 && rules.GAME_TIMINGS_BY_KIND['word-sort'] === rules.GAME_TIMINGS.wordSort && rules.GAME_GESTURES['word-sort'] === 'tap');
}

section('number_line: a number placed on a line, or a jump landed');

{
  ['number_line', 'number_ray', 'line_jump', 'Number Line'].forEach((type) => {
    check(`${type} resolves to number-line`, rules.resolveGameKind(type, {}) === 'number-line');
  });

  const place = rules.normalizeNumberLineConfig({ start: 0, end: 20, step: 1, label_every: 5, target: 13, bg_image: 'https://x/bg.webp', time_limit: 60 });
  check('the line: a tick every step from the start to the end', place.ticks.length === 21 && place.ticks[0].value === 0 && place.ticks[20].value === 20 && place.target === 13 && place.from === null);
  check('numbered: the start, the end and every fifth — never the number asked', place.ticks.filter((tick) => tick.labelled).map((tick) => tick.value).join() === '0,5,10,15,20'
    && rules.normalizeNumberLineConfig({ start: 0, end: 20, label_every: 5, target: 15 }).ticks.find((tick) => tick.value === 15).labelled === false);
  check('defaults: 0 to 10 by 1, lives 3, the background to preload', rules.normalizeNumberLineConfig({ target: 4 }).ticks.length === 11 && place.lives === 3 && place.time_limit === 60 && place.imageUris.join() === 'https://x/bg.webp');
  const jump = rules.normalizeNumberLineConfig({ start: 0, end: 100, step: 10, label_every: 2, from: 30, jump: 40 });
  check('a jump: from where, how far, and where it lands', jump.target === 70 && jump.from === 30 && jump.jump === 40 && rules.normalizeNumberLineConfig({ start: 0, end: 10, from: 8, jump: -3 }).target === 5);
  check('no game: a number off the line, a jump that leaves it, a line too long or not cut evenly',
    rules.normalizeNumberLineConfig({ target: 11 }).target === -1
      && rules.normalizeNumberLineConfig({ from: 8, jump: 5 }).target === -1
      && rules.normalizeNumberLineConfig({ start: 0, end: 30, target: 5 }).target === -1
      && rules.normalizeNumberLineConfig({ start: 0, end: 10, step: 3, target: 3 }).target === -1
      && rules.normalizeNumberLineConfig({ start: 0, end: 10, target: 2.5 }).target === -1);

  check('the tick of the number asked is right, another is a mistake, no tick nothing',
    rules.resolveNumberLineTap(place, 13).type === 'right' && rules.resolveNumberLineTap(place, 12).type === 'wrong' && rules.resolveNumberLineTap(place, 13.5).type === 'ignored' && rules.resolveNumberLineTap(place, 40).type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const hundreds = rules.normalizeNumberLineConfig({ start: 100, end: 1000, step: 100, label_every: 2, target: 700 });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [place, jump, hundreds].forEach((config, index) => {
    const layout = rules.layoutNumberLine(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const labels = layout ? layout.ticks.map((tick) => tick.label).filter(Boolean) : [];
    const ok = layout && inside(layout.card, stage) && layout.number >= rules.NUMBER_LINE_LAYOUT.minNumber
      && layout.line.left >= stage.left - 1e-6 && layout.line.right <= stage.left + stage.width + 1e-6 && layout.line.y - (layout.card.top + layout.card.height) >= layout.number * rules.NUMBER_LINE_LAYOUT.markerRoom - 1e-6
      && layout.ticks.length === config.ticks.length && layout.ticks.every((tick, i) => tick.value === config.ticks[i].value && (tick.label !== null) === config.ticks[i].labelled)
      && labels.every((label) => inside(label, stage) && !overlap(label, layout.card)) && labels.every((a, i) => labels.every((b, j) => i === j || !overlap(a, b)))
      && layout.ticks.every((tick) => tick.zone.width >= 28 && tick.zone.height >= 40 && !overlap(tick.zone, layout.card))
      && layout.ticks.every((a, i) => layout.ticks.every((b, j) => i === j || !overlap(a.zone, b.zone)))
      && (config.from !== null ? layout.arc !== null && layout.line.y - layout.arc.height >= layout.card.top + layout.card.height - 1e-6 : layout.arc === null);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the card, the line, its numbers and the places to tap are whole, apart, inside the safe area and big enough', whole, detail);
  check('no number asked, no layout', rules.layoutNumberLine(852, 393, { ticks: place.ticks, target: -1, from: null, jump: null }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.numberLine.moveMs > 0 && rules.GAME_TIMINGS_BY_KIND['number-line'] === rules.GAME_TIMINGS.numberLine && rules.GAME_GESTURES['number-line'] === 'tap');
}

section('true_false: a series of statements, each true or not');

{
  ['true_false', 'yes_no', 'fact_check', 'True False'].forEach((type) => {
    check(`${type} resolves to true-false`, rules.resolveGameKind(type, {}) === 'true-false');
  });

  const game = rules.normalizeTrueFalseConfig({
    statements: [
      { text: ' The whale is  a fish. ', answer: false, image: 'https://x/whale.webp' },
      { text: 'Bears sleep in winter.', answer: 'true' },
      { text: 'The Sun is a star.', answer: 1 },
      { text: 'Maybe.', answer: 'maybe' },
      { text: '', answer: true },
      { text: 'Fish breathe air.', answer: 'нет' },
    ],
    bg_image: 'https://x/bg.webp',
    time_limit: 60,
  });
  check('the statements as written, the ones with no answer or no text left out', game.statements.map((s) => s.text).join('|') === 'The whale is a fish.|Bears sleep in winter.|The Sun is a star.|Fish breathe air.'
    && game.statements.map((s) => s.answer).join() === 'false,true,true,false' && game.statements[0].image === 'https://x/whale.webp' && game.statements[1].image === null);
  check('defaults: lives 3; the background and the pictures to preload', game.lives === 3 && game.time_limit === 60 && game.imageUris.join() === 'https://x/bg.webp,https://x/whale.webp');
  check('three statements at least, eight at most', rules.normalizeTrueFalseConfig({ statements: [{ text: 'a', answer: true }, { text: 'b', answer: false }] }).statements.length === 0
    && rules.normalizeTrueFalseConfig({ statements: Array.from({ length: 12 }, (_u, i) => ({ text: 's' + i, answer: i % 2 === 0 })) }).statements.length === 8);

  const tap = rules.resolveTrueFalseTap;
  check('the right answer, and the next comes', JSON.stringify(tap(game, 0, false)) === '{"type":"right","complete":false}' && JSON.stringify(tap(game, 1, false)) === '{"type":"wrong","complete":false}');
  check('the last statement completes the series, right or not', JSON.stringify(tap(game, 3, false)) === '{"type":"right","complete":true}' && JSON.stringify(tap(game, 3, true)) === '{"type":"wrong","complete":true}' && tap(game, 4, true).type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const plain = rules.normalizeTrueFalseConfig({ statements: [{ text: 'Солнце — это звезда, которая светит днём и греет нашу Землю.', answer: true }, { text: 'Луна светит сама.', answer: false }, { text: 'კატა ცხოველია.', answer: true }] });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [390, 700, { top: 60 }], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [game, plain].forEach((config, index) => config.statements.forEach((_s, at) => {
    const layout = rules.layoutTrueFalse(w, h, config, at, insets);
    const first = rules.layoutTrueFalse(w, h, config, 0, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.card, stage) && inside(layout.yes, stage) && inside(layout.no, stage)
      && !overlap(layout.yes, layout.no) && !overlap(layout.card, layout.yes) && !overlap(layout.card, layout.no)
      && layout.yes.height >= rules.TRUE_FALSE_LAYOUT.minButton
      && layout.lines.length > 0 && layout.lines.every((line) => inside(line, layout.card)) && layout.lines.map((line) => line.text).join(' ') === config.statements[at].text
      && (config.statements.some((s) => s.image) ? inside(layout.picture, stage) && !overlap(layout.picture, layout.card) && !overlap(layout.picture, layout.yes) : layout.picture === null)
      // Nothing moves as the statements change but the writing.
      && JSON.stringify([layout.card, layout.yes, layout.no, layout.picture]) === JSON.stringify([first.card, first.yes, first.no, first.picture]);
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index} statement ${at}: ${JSON.stringify(layout)}`; }
  })));
  check('on every stage the statement, its picture and the two buttons are whole, apart, inside the safe area; nothing moves but the writing', whole, detail);
  check('no statements, no layout', rules.layoutTrueFalse(852, 393, { statements: [] }, 0, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.trueFalse.nextMs > 0 && rules.GAME_TIMINGS_BY_KIND['true-false'] === rules.GAME_TIMINGS.trueFalse && rules.GAME_GESTURES['true-false'] === 'tap');
}

section('grid_route: a hero steered across a grid, or a route followed');

{
  ['grid_route', 'follow_route', 'map_route', 'Grid Route'].forEach((type) => {
    check(`${type} resolves to grid-route`, rules.resolveGameKind(type, {}) === 'grid-route');
  });

  const steer = rules.normalizeGridRouteConfig({ columns: 6, rows: 4, start: { column: 0, row: 3 }, goal: '5,0', blocked: ['2,3', { column: 2, row: 2 }, '4,1', '9,9', '0,3'], plan_image: 'https://x/park.webp', bg_image: 'https://x/bg.webp' });
  check('steer: the grid, the start, the treasure and the rocks on the grid — not the start', steer.mode === 'steer' && steer.columns === 6 && steer.goal.column === 5 && steer.goal.row === 0
    && steer.blocked.length === 3 && steer.imageUris.join() === 'https://x/bg.webp,https://x/park.webp' && steer.lives === 3);
  check('the fewest moves round the rocks', rules.gridRouteShortest(steer) === 8 && rules.gridRouteShortest({ columns: 3, rows: 1, start: { column: 0, row: 0 }, goal: { column: 2, row: 0 }, blocked: [{ column: 1, row: 0 }] }) === -1);
  const follow = rules.normalizeGridRouteConfig({ mode: 'follow', columns: 5, rows: 4, start: '0,3', route: [{ direction: 'up', count: 2 }, { direction: '→', count: '3' }, { direction: 'sideways', count: 1 }] });
  check('follow: the route as steps, ending where it takes the hero', follow.mode === 'follow' && follow.route.length === 2 && follow.route[1].direction === 'right' && follow.goal.column === 3 && follow.goal.row === 1);
  check('no game: a route off the grid, a goal on a rock or at the start, a grid too big',
    rules.normalizeGridRouteConfig({ mode: 'follow', columns: 3, rows: 3, start: '0,0', route: [{ direction: 'left', count: 1 }] }).goal === null
      && rules.normalizeGridRouteConfig({ columns: 4, rows: 3, start: '0,0', goal: '2,2', blocked: ['2,2'] }).goal === null
      && rules.normalizeGridRouteConfig({ columns: 4, rows: 3, start: '1,1', goal: '1,1' }).goal === null
      && rules.normalizeGridRouteConfig({ columns: 12, rows: 3, start: '0,0', goal: '2,2' }).goal === null);
  check('a step lands where it says', JSON.stringify(rules.moveGridCell({ column: 2, row: 2 }, 'up', 2)) === '{"column":2,"row":0}' && JSON.stringify(rules.moveGridCell({ column: 2, row: 2 }, 'left')) === '{"column":1,"row":2}');

  const move = rules.resolveGridRouteMove;
  check('an arrow steps the hero; onto the treasure it arrives', JSON.stringify(move(steer, { column: 0, row: 3 }, 'up')) === '{"type":"moved","at":{"column":0,"row":2},"arrived":false}'
    && move(steer, { column: 5, row: 1 }, 'up').arrived === true);
  check('a rock or the edge stops it: a mistake', move(steer, { column: 1, row: 3 }, 'right').type === 'blocked' && move(steer, { column: 0, row: 3 }, 'left').type === 'blocked' && move(steer, { column: 0, row: 3 }, 'down').type === 'blocked');
  check('on the treasure nothing more', move(steer, { column: 5, row: 0 }, 'down').type === 'ignored');
  check('follow: the square the route ends on is right, another wrong', rules.resolveGridRouteTap(follow, { column: 3, row: 1 }).type === 'right' && rules.resolveGridRouteTap(follow, { column: 2, row: 1 }).type === 'wrong' && rules.resolveGridRouteTap(follow, { column: 7, row: 1 }).type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const big = rules.normalizeGridRouteConfig({ mode: 'follow', columns: 8, rows: 5, start: '0,4', route: [{ direction: 'up', count: 3 }, { direction: 'right', count: 4 }, { direction: 'down', count: 1 }, { direction: 'right', count: 2 }] });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [steer, follow, big].forEach((config, index) => {
    const layout = rules.layoutGridRoute(w, h, config, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const controls = layout ? [...layout.arrows, ...(layout.routeCard ? [layout.routeCard] : [])] : [];
    const ok = layout && inside(layout.grid, stage) && Math.abs(layout.grid.width - layout.cell * config.columns) < 1e-6 && Math.abs(layout.grid.height - layout.cell * config.rows) < 1e-6
      && controls.every((rect) => inside(rect, stage) && !overlap(rect, layout.grid))
      && (config.mode === 'steer'
        ? layout.arrows.length === 4 && layout.arrows.every((a) => a.width >= rules.GRID_ROUTE_LAYOUT.minButton) && layout.arrows.every((a, i) => layout.arrows.every((b, j) => i === j || !overlap(a, b)))
        : layout.cell >= rules.GRID_ROUTE_LAYOUT.minCell && layout.steps.length === config.route.length && layout.steps.every((step) => inside(step, layout.routeCard) && step.height >= rules.GRID_ROUTE_LAYOUT.minStep))
      && JSON.stringify(rules.gridRouteCellRect(layout, { column: 1, row: 1 })) === JSON.stringify({ left: layout.grid.left + layout.cell, top: layout.grid.top + layout.cell, width: layout.cell, height: layout.cell });
    if (!ok && whole) { whole = false; detail = `${w}x${h} config ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the grid and the arrows or the route are whole, apart, inside the safe area and big enough', whole, detail);
  check('no goal, no layout', rules.layoutGridRoute(852, 393, { mode: 'steer', columns: 4, rows: 3, goal: null, route: [] }, {}) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.gridRoute.stepMs > 0 && rules.GAME_TIMINGS_BY_KIND['grid-route'] === rules.GAME_TIMINGS.gridRoute && rules.GAME_GESTURES['grid-route'] === 'tap');
}

section('chart_read: a chart read, and questions about it');

{
  ['chart_read', 'bar_chart', 'pictograph', 'Chart Read'].forEach((type) => {
    check(`${type} resolves to chart-read`, rules.resolveGameKind(type, {}) === 'chart-read');
  });

  const fruit = [{ image: 'https://x/apple.webp', value: 7 }, { image: 'https://x/pear.webp', value: 4 }, { image: 'https://x/plum.webp', value: 9 }];
  const config = rules.normalizeChartReadConfig({
    bars: [...fruit, { image: '', value: 3 }, { image: 'https://x/x.webp', value: 2.5 }],
    questions: [{ ask: 'most' }, { ask: 'count', bar: 1 }, { ask: 'difference', bar: 2, other: 1 }, { ask: 'least' }],
    bg_image: 'https://x/bg.webp',
    language: 'ru',
  });
  check('bars with a picture and a whole number; three questions at most', config.bars.length === 3 && config.bars[2].value === 9 && config.questions.length === 3
    && config.bars[0].color !== config.bars[1].color && config.imageUris.length === 4);
  check('the scale: a number every 1 to the top', config.scaleStep === 1 && config.scaleMax === 9
    && rules.normalizeChartReadConfig({ bars: [{ image: 'a', value: 17 }, { image: 'b', value: 6 }], questions: [{ ask: 'most' }] }).scaleMax === 18
    && rules.normalizeChartReadConfig({ bars: [{ image: 'a', value: 17 }, { image: 'b', value: 6 }], questions: [{ ask: 'most' }], scale_step: 5 }).scaleMax === 20);
  const [most, count, difference] = config.questions;
  check('the answers: the biggest bar, the count, the difference', most.answer === 2 && most.options.length === 0 && count.answer === 4 && difference.answer === 5);
  check('the numbers to pick: four, smallest first, the right one among them', count.options.length === 4 && count.options.includes(4)
    && count.options.every((value, index) => index === 0 || value > count.options[index - 1]) && difference.options.includes(5) && difference.options.every((value) => value >= 0));
  check('no question: a tie on top, a bar that is none, a difference the wrong way round',
    rules.normalizeChartReadConfig({ bars: [{ image: 'a', value: 5 }, { image: 'b', value: 5 }], questions: [{ ask: 'most' }] }).bars.length === 0
      && rules.normalizeChartReadConfig({ bars: fruit, questions: [{ ask: 'count', bar: 3 }, { ask: 'difference', bar: 1, other: 0 }] }).questions.length === 0
      && rules.normalizeChartReadConfig({ bars: [{ image: 'a', value: 12 }, { image: 'b', value: 5 }], style: 'pictures', questions: [{ ask: 'most' }] }).bars.length === 0);

  const tap = rules.resolveChartReadTap;
  check('a bar asked: the right bar, a wrong one, nothing else', tap(config, 0, 2).type === 'right' && tap(config, 0, 0).type === 'wrong' && tap(config, 0, 7).type === 'ignored');
  check('a number asked: only its numbers count; the last right answer completes', tap(config, 1, 4).type === 'right' && tap(config, 1, count.options.find((v) => v !== 4)).type === 'wrong'
    && tap(config, 1, 40).type === 'ignored' && tap(config, 2, 5).complete === true && tap(config, 3, 0).type === 'ignored');

  const pieces = rules.chartQuestionPieces(difference, 'ru');
  check('the question in its language, the pictures among the words', pieces.map((p) => p.bar !== undefined ? '#' + p.bar : p.text).join(' ') === 'На сколько #2 больше, чем #1 ?'
    && pieces[pieces.length - 1].glued === true && rules.chartQuestionPieces(most, 'de')[0].text === 'რომელი');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const five = rules.normalizeChartReadConfig({ bars: [...fruit, { image: 'c', value: 20 }, { image: 'd', value: 13 }], questions: [{ ask: 'difference', bar: 3, other: 4 }, { ask: 'least' }], language: 'ka' });
  const pictures = rules.normalizeChartReadConfig({ style: 'pictures', bars: fruit, questions: [{ ask: 'count', bar: 0 }, { ask: 'most' }], language: 'en' });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }], [600, 800, {}]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [config, five, pictures].forEach((game, which) => game.questions.forEach((question, index) => {
    const layout = rules.layoutChartRead(w, h, game, index, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.chart, stage) && inside(layout.card, stage) && !overlap(layout.chart, layout.card)
      && layout.bars.every((bar) => inside(bar.icon, layout.chart) && (bar.column ? inside(bar.column, layout.plot) : true) && bar.units.every((u) => inside(u, layout.plot)))
      && layout.bars.every((a, i) => layout.bars.every((b, j) => i === j || !overlap(a.zone, b.zone)))
      && layout.scale.every((line) => inside(line.label, layout.chart))
      && layout.pieces.length > 0 && layout.pieces.every((piece) => inside(piece, layout.card)) && layout.pieces.every((a, i) => layout.pieces.every((b, j) => i === j || !overlap(a, b)))
      && layout.options.length === question.options.length
      && layout.options.every((o) => inside(o, stage) && !overlap(o, layout.card) && !overlap(o, layout.chart) && o.height >= rules.CHART_READ_LAYOUT.minOption - 1e-6)
      && layout.options.every((a, i) => layout.options.every((b, j) => i === j || !overlap(a, b)))
      && layout.pieces.filter((p) => p.text !== undefined).every((p) => p.height >= 14);
    if (!ok && whole) { whole = false; detail = `${w}x${h} game ${which} question ${index}: ${JSON.stringify(layout)}`; }
  })));
  check('on every stage the chart, the card and the numbers are whole, apart, inside the safe area and readable', whole, detail);
  const first = rules.layoutChartRead(852, 393, config, 0, {});
  const second = rules.layoutChartRead(852, 393, config, 1, {});
  check('the chart and the card stay put from question to question', JSON.stringify(first.chart) === JSON.stringify(second.chart) && JSON.stringify(first.card) === JSON.stringify(second.card));
  check('the bars stand on one floor, as tall as they count', (() => {
    const bars = first.bars.map((bar) => bar.column);
    const floor = first.plot.top + first.plot.height;
    return bars.every((bar) => Math.abs(bar.top + bar.height - floor) < 1e-6) && Math.abs(bars[2].height / bars[1].height - 9 / 4) < 1e-6;
  })());
  check('the timings and the gesture are there', rules.GAME_TIMINGS.chartRead.nextQuestionMs > 0 && rules.GAME_TIMINGS_BY_KIND['chart-read'] === rules.GAME_TIMINGS.chartRead && rules.GAME_GESTURES['chart-read'] === 'tap');
}

section('find_in_scene: every one of a kind found on a big picture');

{
  ['find_in_scene', 'hidden_objects', 'Find In Scene'].forEach((type) => {
    check(`${type} resolves to find-in-scene`, rules.resolveGameKind(type, {}) === 'find-in-scene');
  });

  const tower = (x, y, extra = {}) => ({ x, y, width: 4, height: 10, target: true, ...extra });
  const config = rules.normalizeFindInSceneConfig({
    bg_image: 'https://x/svaneti.webp',
    board_width: 1600,
    board_height: 900,
    placements: [tower(10, 30), tower(40, 25, { image: 'https://x/tower.webp' }), tower(70, 40), { image: 'https://x/cow.webp', x: 50, y: 70, width: 10, height: 12 }, { x: 5, y: 5, width: 3, height: 3 }],
  });
  check('the things to find, the pictures that only stand there; a point that is not to find is nothing', config.targets.length === 3 && config.things.length === 4
    && config.icon === 'https://x/tower.webp' && config.board.width === 1600 && config.imageUris.length === 3);
  check('an icon the author picked comes first', rules.normalizeFindInSceneConfig({ bg_image: 'b', board_width: 10, board_height: 10, icon: 'https://x/icon.webp', placements: [tower(1, 1), tower(50, 50)] }).icon === 'https://x/icon.webp');
  check('no game: one thing to find, no picture or no size', rules.normalizeFindInSceneConfig({ bg_image: 'b', board_width: 10, board_height: 10, placements: [tower(1, 1)] }).targets.length === 0
    && rules.normalizeFindInSceneConfig({ board_width: 10, board_height: 10, placements: [tower(1, 1), tower(50, 50)] }).targets.length === 0
    && rules.normalizeFindInSceneConfig({ bg_image: 'b', placements: [tower(1, 1), tower(50, 50)] }).targets.length === 0);
  check('eight to find at most', rules.normalizeFindInSceneConfig({ bg_image: 'b', board_width: 10, board_height: 10, placements: Array.from({ length: 10 }, (_v, i) => tower(i * 9, 10)) }).targets.length === 8);

  const tap = rules.resolveFindInSceneTap;
  const [first, second, third] = config.targets;
  check('a tap on one found it; on it again nothing; on nothing a miss', tap(config, [], { x: 12, y: 35 }).type === 'found' && tap(config, [], { x: 12, y: 35 }).id === first
    && tap(config, [first], { x: 12, y: 35 }).type === 'ignored' && tap(config, [], { x: 90, y: 90 }).type === 'miss' && tap(config, [], { x: 55, y: 75 }).type === 'miss');
  check('the last one found completes', tap(config, [first, second], { x: 72, y: 45 }).complete === true && tap(config, [first, second, third], { x: 12, y: 35 }).type === 'ignored');
  check('a small thing takes a finger: the box is grown by the slop', tap(config, [], { x: 8.5, y: 35 }).type === 'miss' && tap(config, [], { x: 8.5, y: 35 }, { x: 4, y: 4 }).type === 'found');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const eight = rules.normalizeFindInSceneConfig({ bg_image: 'b', board_width: 1000, board_height: 1000, placements: Array.from({ length: 8 }, (_v, i) => tower(i * 11, 20)) });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }], [600, 800, {}]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [config, eight].forEach((game, which) => {
    const layout = rules.layoutFindInScene(w, h, game, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.sheet, stage) && inside(layout.card, stage) && !overlap(layout.sheet, layout.card)
      && Math.abs(layout.sheet.width / layout.sheet.height - game.board.width / game.board.height) < 1e-6
      && inside(layout.icon, layout.card) && layout.dots.length === game.targets.length && layout.dots.every((dot) => inside(dot, layout.card) && dot.width >= 16)
      && layout.dots.every((a, i) => layout.dots.every((b, j) => i === j || !overlap(a, b)))
      && layout.things.every((thing) => inside(thing, layout.sheet)) && layout.icon.width >= 60;
    if (!ok && whole) { whole = false; detail = `${w}x${h} game ${which}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the picture is whole and the card beside it, both inside the safe area', whole, detail);
  const layout = rules.layoutFindInScene(852, 393, config, {});
  const point = rules.findInScenePoint(layout, layout.things[0].left + 2, layout.things[0].top + 2);
  check('a point of the stage is read in percent of the picture', Math.abs(point.x - (10 + (2 / layout.sheet.width) * 100)) < 1e-6 && tap(config, [], point, layout.slop).type === 'found');
  check('the timings and the gesture are there', rules.GAME_TIMINGS.findInScene.successSettleMs > 0 && rules.GAME_TIMINGS_BY_KIND['find-in-scene'] === rules.GAME_TIMINGS.findInScene && rules.GAME_GESTURES['find-in-scene'] === 'tap');
}

section('map_place: pictures put on their places on a map');

{
  ['map_place', 'place_on_map', 'Map Place'].forEach((type) => {
    check(`${type} resolves to map-place`, rules.resolveGameKind(type, {}) === 'map-place');
  });

  const sight = (name, x, y) => ({ image: `https://x/${name}.webp`, x, y, width: 8, height: 10 });
  const config = rules.normalizeMapPlaceConfig({
    bg_image: 'https://x/georgia.webp',
    board_width: 1600,
    board_height: 900,
    placements: [sight('narikala', 60, 55), sight('svetitskhoveli', 55, 45), sight('gergeti', 50, 20), { x: 20, y: 60, width: 4, height: 6 }, { x: 0, y: 0, width: 0, height: 5 }],
  });
  check('a card a picture, a place for each and one nobody\'s; a box of nothing is nothing', config.items.length === 3 && config.spots.length === 4
    && config.spots[3].item === null && config.items.every((item) => config.spots.find((spot) => spot.id === item.spot).item === item.id)
    && config.imageUris.length === 4);
  check('no game: one picture, no picture of the map or no size', rules.normalizeMapPlaceConfig({ bg_image: 'b', board_width: 10, board_height: 10, placements: [sight('a', 1, 1)] }).items.length === 0
    && rules.normalizeMapPlaceConfig({ board_width: 10, board_height: 10, placements: [sight('a', 1, 1), sight('b', 50, 50)] }).items.length === 0);
  check('six cards and three places nobody\'s at most', (() => {
    const many = rules.normalizeMapPlaceConfig({ bg_image: 'b', board_width: 10, board_height: 10, placements: [...Array.from({ length: 8 }, (_v, i) => sight(`s${i}`, i * 10, 10)), ...Array.from({ length: 5 }, (_v, i) => ({ x: i * 10, y: 80, width: 3, height: 3 }))] });
    return many.items.length === 6 && many.spots.length === 9;
  })());

  const drop = rules.resolveMapPlaceDrop;
  const item = (name) => config.items.find((entry) => entry.image.includes(name));
  const narikala = item('narikala');
  const gergeti = item('gergeti');
  check('its own place is right; another is wrong; nowhere only goes back', drop(config, [], narikala.id, narikala.spot).type === 'right'
    && drop(config, [], narikala.id, gergeti.spot).type === 'wrong' && drop(config, [], narikala.id, 'spot_4').type === 'wrong' && drop(config, [], narikala.id, null).type === 'ignored');
  check('a card put, or a place taken, takes nothing more; the last one completes', drop(config, [narikala.id], narikala.id, narikala.spot).type === 'ignored'
    && drop(config, [narikala.id], gergeti.id, narikala.spot).type === 'ignored'
    && drop(config, config.items.filter((entry) => entry !== gergeti).map((entry) => entry.id), gergeti.id, gergeti.spot).complete === true);

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const six = rules.normalizeMapPlaceConfig({ bg_image: 'b', board_width: 1000, board_height: 1000, placements: Array.from({ length: 6 }, (_v, i) => sight(`s${i}`, i * 15, 40)) });
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }], [600, 800, {}]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => [config, six].forEach((game, which) => {
    const layout = rules.layoutMapPlace(w, h, game, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.sheet, stage) && inside(layout.tray, stage) && !overlap(layout.sheet, layout.tray)
      && Math.abs(layout.sheet.width / layout.sheet.height - game.board.width / game.board.height) < 1e-6
      && layout.cards.length === game.items.length && layout.cards.every((card) => inside(card, layout.tray) && card.width >= rules.MAP_PLACE_LAYOUT.minCard)
      && layout.cards.every((a, i) => layout.cards.every((b, j) => i === j || !overlap(a, b)))
      && layout.spots.every((spot) => inside(spot, layout.sheet) && spot.pin.width >= rules.MAP_PLACE_LAYOUT.minPin);
    if (!ok && whole) { whole = false; detail = `${w}x${h} game ${which}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the map is whole and the cards beside it, big enough to carry, inside the safe area', whole, detail);
  const layout = rules.layoutMapPlace(852, 393, config, {});
  const spot = layout.spots[0];
  check('a card let go near a pin lands on it, over nothing on nothing', rules.mapPlaceSpotAt(layout, spot.left + spot.width / 2 + 3, spot.top + spot.height / 2 - 3) === spot.id
    && rules.mapPlaceSpotAt(layout, layout.sheet.left + 2, layout.sheet.top + 2) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.mapPlace.flyMs > 0 && rules.GAME_TIMINGS_BY_KIND['map-place'] === rules.GAME_TIMINGS.mapPlace && rules.GAME_GESTURES['map-place'] === 'drag');
}

section('story_scene: a story told on a scene, the child helping along');

{
  ['story_scene', 'tell_story', 'Story Scene'].forEach((type) => {
    check(`${type} resolves to story-scene`, rules.resolveGameKind(type, {}) === 'story-scene');
  });

  const config = rules.normalizeStorySceneConfig({
    bg_image: 'https://x/narikala.webp',
    board_width: 1600,
    board_height: 900,
    placements: [
      { image: 'https://x/lantern.webp', x: 20, y: 50, width: 10, height: 18 },
      { image: 'https://x/firefly.webp', x: 60, y: 20, width: 8, height: 12 },
      { x: 75, y: 70, width: 6, height: 8 },
    ],
    pieces: [
      { text: 'ღამით ნარიყალაზე ქარმა ჩემი ციცინათელები გაფანტა.', voice: 'https://x/v1.mp3', action: 'listen' },
      { text: 'შეეხე ფარანს!', voice: 'https://x/v2.mp3', action: 'tap', thing: 0 },
      { text: 'მიიყვანე ციცინათელა იქ.', voice: 'https://x/v3.mp3', action: 'drag', thing: 1, place: 2 },
      { text: 'გაუწყვეტელი', action: 'drag', thing: 2, place: 0 },
      { text: '', voice: '' },
    ],
  });
  check('the things in their order, the pieces with their actions; an empty piece is none', config.things.length === 3 && config.pieces.length === 4
    && config.pieces.map((piece) => piece.action).join() === 'listen,tap,drag,listen' && config.pieces[2].thing === 'thing_2' && config.pieces[2].place === 'thing_3'
    && config.voiceUris.length === 3 && config.time_limit === null);
  check('no game: no picture, no size, no piece', rules.normalizeStorySceneConfig({ board_width: 10, board_height: 10, pieces: [{ text: 'a' }] }).pieces.length === 0
    && rules.normalizeStorySceneConfig({ bg_image: 'b', pieces: [{ text: 'a' }] }).pieces.length === 0
    && rules.normalizeStorySceneConfig({ bg_image: 'b', board_width: 10, board_height: 10, pieces: [] }).pieces.length === 0);

  const step = rules.resolveStorySceneStep;
  check('a piece listened to goes on with the button alone', step(config, 0, { kind: 'next' }).type === 'done' && step(config, 0, { kind: 'tap', thingId: 'thing_1' }).type === 'ignored');
  check('a tap on its thing goes on, on another nothing', step(config, 1, { kind: 'tap', thingId: 'thing_1' }).type === 'done' && step(config, 1, { kind: 'tap', thingId: 'thing_2' }).type === 'ignored'
    && step(config, 1, { kind: 'next' }).type === 'ignored');
  check('its thing carried to its place goes on; anywhere else nothing; the last piece completes', step(config, 2, { kind: 'drop', thingId: 'thing_2', placeId: 'thing_3' }).type === 'done'
    && step(config, 2, { kind: 'drop', thingId: 'thing_2', placeId: null }).type === 'ignored' && step(config, 2, { kind: 'drop', thingId: 'thing_1', placeId: 'thing_3' }).type === 'ignored'
    && step(config, 3, { kind: 'next' }).complete === true && step(config, 4, { kind: 'next' }).type === 'ignored');

  const overlap = (a, b) => Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) + 1e-6
    && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top) + 1e-6;
  const inside = (inner, outer) => inner.left >= outer.left - 1e-6 && inner.top >= outer.top - 1e-6
    && inner.left + inner.width <= outer.left + outer.width + 1e-6 && inner.top + inner.height <= outer.top + outer.height + 1e-6;
  const stages = [[852, 393, { top: 56, left: 59, right: 59, bottom: 21 }], [844, 322, { top: 68 }], [1250, 750, {}], [1024, 768, {}], [667, 300, { top: 60 }], [600, 800, {}]];
  let whole = true;
  let detail = '';
  stages.forEach(([w, h, insets]) => config.pieces.forEach((piece, index) => {
    const layout = rules.layoutStoryScene(w, h, config, index, insets);
    const stage = { left: insets.left || 0, top: insets.top || 0, width: w - (insets.left || 0) - (insets.right || 0), height: h - (insets.top || 0) - (insets.bottom || 0) };
    const ok = layout && inside(layout.sheet, stage) && inside(layout.caption, stage) && inside(layout.next, stage)
      && !overlap(layout.sheet, layout.caption) && !overlap(layout.sheet, layout.next) && !overlap(layout.caption, layout.next)
      && Math.abs(layout.sheet.width / layout.sheet.height - 16 / 9) < 1e-6 && layout.things.every((thing) => inside(thing, layout.sheet))
      && layout.lines.every((line) => inside(line, layout.caption) && line.height >= rules.STORY_SCENE_LAYOUT.minLine) && layout.next.height >= 48;
    if (!ok && whole) { whole = false; detail = `${w}x${h} piece ${index}: ${JSON.stringify(layout)}`; }
  }));
  check('on every stage the scene is whole over its caption and the go-on button, inside the safe area', whole, detail);
  const first = rules.layoutStoryScene(852, 393, config, 0, {});
  const second = rules.layoutStoryScene(852, 393, config, 1, {});
  check('the scene stays put from piece to piece; a short piece is written on its caption', JSON.stringify(first.sheet) === JSON.stringify(second.sheet) && second.lines.length > 0);
  const lantern = first.things[0];
  check('a tap or a carry is read on the nearest thing grown to a fingertip', rules.storySceneThingAt(first, config.things, lantern.left + lantern.width / 2, lantern.top + lantern.height / 2) === 'thing_1'
    && rules.storySceneThingAt(first, config.things, first.sheet.left + first.sheet.width - 2, first.sheet.top + 2) === null);
  check('the timings and the gesture are there', rules.GAME_TIMINGS.storyScene.stepMs > 0 && rules.GAME_TIMINGS_BY_KIND['story-scene'] === rules.GAME_TIMINGS.storyScene && rules.GAME_GESTURES['story-scene'] === 'tap');
}

section('story_scene: a choice of the way, its reply its own');

{
  const config = rules.normalizeStorySceneConfig({
    bg_image: 'https://x/road.webp',
    board_width: 1600,
    board_height: 900,
    placements: [
      { image: 'https://x/umbrella.webp', x: 20, y: 50, width: 10, height: 18 },
      { image: 'https://x/hat.webp', x: 45, y: 50, width: 10, height: 18 },
      { image: 'https://x/kite.webp', x: 70, y: 50, width: 10, height: 18 },
    ],
    pieces: [
      { text: 'What shall we take?', action: 'choose', choices: [
        { thing: 0, text: 'An umbrella: Svaneti is rainy!', voice: 'https://x/c1.mp3' },
        { thing: 1, text: 'A hat: the sun is high.', voice: 'https://x/c2.mp3' },
        { thing: 1, text: 'twice' },
        { thing: 9, text: 'none' },
      ] },
      { text: 'Only one to choose', action: 'choose', choices: [{ thing: 2, text: 'kite' }] },
    ],
  });
  const [choose, single] = config.pieces;
  check('two or three things to choose among, each its reply; a thing twice or not there is none; one choice is no choice', choose.action === 'choose'
    && choose.choices.length === 2 && choose.choices[1].text === 'A hat: the sun is high.' && single.action === 'listen' && config.voiceUris.length === 2);

  const step = rules.resolveStorySceneStep;
  const picked = step(config, 0, { kind: 'tap', thingId: 'thing_2' });
  check('a tap on one of its things chooses it; on another thing nothing; the button waits for a choice', picked.type === 'chosen' && picked.choice.text === 'A hat: the sun is high.'
    && step(config, 0, { kind: 'tap', thingId: 'thing_3' }).type === 'ignored' && step(config, 0, { kind: 'next' }).type === 'ignored');
  check('once chosen, the button goes on and no other choice is taken', step(config, 0, { kind: 'next' }, 'thing_2').type === 'done' && step(config, 0, { kind: 'tap', thingId: 'thing_1' }, 'thing_2').type === 'ignored');
  const own = rules.layoutStoryScene(852, 393, config, 0, {});
  const reply = rules.layoutStoryScene(852, 393, config, 0, {}, 'A hat: the sun is high.');
  check('the caption tells the reply once chosen, the scene where it was', reply.lines.map((line) => line.text).join(' ') === 'A hat: the sun is high.' && JSON.stringify(own.sheet) === JSON.stringify(reply.sheet));
}

section('hidden_light: a light found under the right answer');

{
  ['hidden_light', 'find_the_light', 'Hidden Light'].forEach((type) => {
    check(`${type} resolves to hidden-light`, rules.resolveGameKind(type, {}) === 'hidden-light');
  });

  const config = rules.normalizeHiddenLightConfig({ id: 9 }, {
    bg_image: 'https://x/vineyard.webp',
    light: 'https://x/light.webp',
    lives: 3,
    questions: [
      { question: 'რა არის ქვევრი?', voice: 'https://x/q1.mp3', answers: [
        { text: 'თიხის დიდი ქოთანი', is_correct: true }, { text: 'ხის ყუთი' }, { text: 'რკინის ქვაბი' }, { text: 'მეოთხე' },
      ] },
      { question: 'როდის არის რთველი?', answers: [{ text: 'შემოდგომაზე', is_correct: true }, { text: 'ზამთარში' }] },
      { question: 'უპასუხოდ', answers: [{ text: 'ერთი' }, { text: 'ორი' }] },
      { question: '', answers: [{ text: 'ერთი', is_correct: true }, { text: 'ორი' }] },
    ],
  });

  check('a question with no right answer or no words is dropped; three cards at most, the right one kept', config.questions.length === 2
    && config.questions[0].answers.length === 3 && config.questions[0].answers.some((answer) => answer.id === config.questions[0].correctId)
    && config.questions[0].voice === 'https://x/q1.mp3' && config.questions[1].voice === null);
  check('the background and the light are fetched before the clock', JSON.stringify(config.imageUris) === JSON.stringify(['https://x/vineyard.webp', 'https://x/light.webp']));

  const tap = rules.resolveHiddenLightTap;
  const right = config.questions[0].correctId;
  const empty = config.questions[0].answers.find((answer) => answer.id !== right).id;
  check('the light is under the right card; an empty one costs a life once; the last light ends the game',
    tap(config, 0, [], right).type === 'found' && tap(config, 0, [], right).complete === false
    && tap(config, 0, [], empty).type === 'empty' && tap(config, 0, [empty], empty).type === 'ignored'
    && tap(config, 1, [], config.questions[1].correctId).complete === true && tap(config, 2, [], right).type === 'ignored');

  const fits = (w, h, insets) => {
    const layout = rules.layoutHiddenLight(w, h, config, 0, insets);
    const inside = (box) => box.left >= (insets.left || 0) - 0.5 && box.top >= (insets.top || 0) - 0.5
      && box.left + box.width <= w - (insets.right || 0) + 0.5 && box.top + box.height <= h - (insets.bottom || 0) + 0.5;
    return layout && layout.slots.length === 2 && inside(layout.row) && layout.step.cards.length === 3
      && layout.step.cards.every(inside) && layout.step.cards.every((card) => card.top > layout.row.top + layout.row.height);
  };
  check('the row of lights along the top, the question and its cards under it, inside the stage and its edges',
    fits(852, 393, { left: 59, right: 59, bottom: 21 }) && fits(1024, 768, {}) && fits(640, 480, { top: 10 }));
  check('no layout for a question that is not there', rules.layoutHiddenLight(852, 393, config, 5, {}) === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
