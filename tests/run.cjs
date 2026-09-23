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

check('timings are published for every game', Object.keys(rules.GAME_TIMINGS).length === 13);
check('failure reasons are named', rules.FAILURE_REASON.wrongCatch === 'wrong_catch' && rules.FAILURE_REASON.livesOut === 'lives_out');


section('every playable kind is registered');

const playableKinds = Object.keys(rules.GAME_KIND_KEYS);
check('thirteen kinds, generic excluded', playableKinds.length === 13 && !playableKinds.includes('generic'));
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
