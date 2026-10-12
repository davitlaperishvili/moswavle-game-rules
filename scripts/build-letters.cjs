'use strict';

/**
 * Writes src/letterOutlines.ts: the outline of every letter the players draw,
 * taken once from FiraGO ExtraBold, so no client carries or loads a font.
 *
 * The font is not in this repository. It is FiraGO 1.001 (SIL Open Font
 * License 1.1, licenses/FiraGO-OFL.txt):
 * https://github.com/bBoxType/FiraGO → Fonts/FiraGO_TTF_1001/Roman/FiraGO-ExtraBold.ttf
 *
 * Usage: node scripts/build-letters.cjs <path to FiraGO-ExtraBold.ttf>
 */

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const EM = 1000;

// The alphabets, in their own order. The Georgian one has no capitals.
const SETS = {
  ka: 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ',
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  ruLower: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  enLower: 'abcdefghijklmnopqrstuvwxyz',
};

// What a line of writing holds besides letters.
const MARKS = ' 0123456789.,!?:;\'’"«»„“”()-–—+−×÷=<>/%№';

const fontFile = process.argv[2];
if (!fontFile) {
  console.error('Usage: node scripts/build-letters.cjs <path to FiraGO-ExtraBold.ttf>');
  process.exit(1);
}

const data = fs.readFileSync(fontFile);
const font = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.length));

/** A number as short as it can be written after another one. */
function join(numbers) {
  return numbers.map((n, index) => (index > 0 && n >= 0 ? ' ' : '') + n).join('');
}

/**
 * The outline as a path of whole numbers, each point written from the one
 * before it — about a third shorter than absolute coordinates.
 */
function compactPath(commands) {
  const r = Math.round;
  let out = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;

  for (const cmd of commands) {
    if (cmd.type === 'M') {
      out += 'm' + join([r(cmd.x) - x, r(cmd.y) - y]);
      x = startX = r(cmd.x);
      y = startY = r(cmd.y);
    } else if (cmd.type === 'L') {
      const dx = r(cmd.x) - x;
      const dy = r(cmd.y) - y;
      if (dx === 0 && dy === 0) continue;
      out += dy === 0 ? 'h' + dx : dx === 0 ? 'v' + dy : 'l' + join([dx, dy]);
      x += dx;
      y += dy;
    } else if (cmd.type === 'Q') {
      out += 'q' + join([r(cmd.x1) - x, r(cmd.y1) - y, r(cmd.x) - x, r(cmd.y) - y]);
      x = r(cmd.x);
      y = r(cmd.y);
    } else if (cmd.type === 'C') {
      out += 'c' + join([r(cmd.x1) - x, r(cmd.y1) - y, r(cmd.x2) - x, r(cmd.y2) - y, r(cmd.x) - x, r(cmd.y) - y]);
      x = r(cmd.x);
      y = r(cmd.y);
    } else if (cmd.type === 'Z') {
      out += 'z';
      x = startX;
      y = startY;
    }
  }

  return out;
}

const missing = [];
const rows = [];

for (const char of new Set([...Object.values(SETS).join(''), ...MARKS])) {
  const index = font.charToGlyphIndex(char);
  if (!index) {
    missing.push(char);
    continue;
  }

  const glyph = font.glyphs.get(index);
  const scale = EM / font.unitsPerEm;
  const outline = glyph.getPath(0, 0, EM);
  const box = outline.commands.length > 0 ? outline.getBoundingBox() : { x1: 0, y1: 0, x2: 0, y2: 0 };

  rows.push(
    `  ${JSON.stringify(char)}: [${Math.round(glyph.advanceWidth * scale)}, ${Math.floor(box.x1)}, ${Math.floor(box.y1)}, ${Math.ceil(box.x2)}, ${Math.ceil(box.y2)}, ${JSON.stringify(compactPath(outline.commands))}],`,
  );
}

if (missing.length > 0) {
  console.error('The font has no outline for: ' + missing.join(' '));
  process.exit(1);
}

const names = font.names;
const fontName = `${names.fontFamily.en} ${names.fontSubfamily.en}`;

const source = `// Written by scripts/build-letters.cjs — do not edit by hand.
//
// The outlines below are taken from ${fontName} (${names.version.en}).
// Digitized data copyright 2012-2018 for FiraGO: Carrois Corporate GbR and HERE Europe B.V.
// Licensed under the SIL Open Font License, Version 1.1 — licenses/FiraGO-OFL.txt.

/** The size the outlines are drawn at: this many units to the em. */
export const OUTLINE_EM = ${EM};

/** The alphabets whose letters are drawn, in their own order; the Georgian one has no capitals. */
export const LETTER_SETS = ${JSON.stringify(SETS, null, 2)} as const;

/**
 * A character's outline: how far the pen moves on after it, the box its ink
 * fills (left, top, right, bottom) and the ink itself as an SVG path. The
 * baseline is y = 0 and y grows downwards, as on a screen.
 */
export type GlyphOutline = readonly [advance: number, left: number, top: number, right: number, bottom: number, path: string];

export const GLYPH_OUTLINES: Readonly<Record<string, GlyphOutline>> = {
${rows.join('\n')}
};
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'letterOutlines.ts'), source);
console.log(`${rows.length} outlines from ${fontName}, ${source.length} bytes`);
