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
  const first = rules.resolveCountPickTap({ counted: true, alreadyCounted: false, countedSoFar: 0, total: 3 });
  check('the first one tapped is "one"', first.kind === 'counted' && first.number === 1 && first.complete === false, JSON.stringify(first));
  const last = rules.resolveCountPickTap({ counted: true, alreadyCounted: false, countedSoFar: 2, total: 3 });
  check('the last one tapped completes the count', last.kind === 'counted' && last.number === 3 && last.complete === true, JSON.stringify(last));
  check('one counted already is not counted twice, and costs nothing',
    rules.resolveCountPickTap({ counted: true, alreadyCounted: true, countedSoFar: 2, total: 3 }).kind === 'repeat');
  check('a picture that is not to be counted is a mistake',
    rules.resolveCountPickTap({ counted: false, alreadyCounted: false, countedSoFar: 0, total: 3 }).kind === 'decoy');

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

check('timings are published for every game', Object.keys(rules.GAME_TIMINGS).length === 15);
check('failure reasons are named', rules.FAILURE_REASON.wrongCatch === 'wrong_catch' && rules.FAILURE_REASON.livesOut === 'lives_out');


section('every playable kind is registered');

const playableKinds = Object.keys(rules.GAME_KIND_KEYS);
check('fifteen kinds, generic excluded', playableKinds.length === 15 && !playableKinds.includes('generic'));
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
  const configs = [plus, greater, compare, two, mixed, cows, big, asPictures];
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
