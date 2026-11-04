// Draws one person as SVG markup: a faceless fashion-sketch figure dressed in
// catalog pieces. The groups the overlay animates are f-body, f-leg-l/-r,
// f-arm-l/-r, f-head and f-skirt; jewellery carries little f-twinkle stars.
// Every left-hand shape is written once and mirrored for the right
// (x -> 200 - x), so mirrored paths use M/L/Q/Z with coordinate pairs only.

import { SKINS } from './catalog.js';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const LINE = 'stroke="rgba(24,14,34,.42)" stroke-width="1.1" stroke-linejoin="round"';
const LINE_ON_DARK = 'stroke="rgba(255,255,255,.24)" stroke-width="1.1" stroke-linejoin="round"';

function hex(value, fallback) {
  return HEX.test(value ?? '') ? value : fallback;
}

function rgb(value) {
  let h = value.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Mixes a colour toward white (amount > 0) or black (amount < 0).
export function shade(value, amount) {
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  return `#${rgb(value)
    .map((c) => Math.round(c + (target - c) * k).toString(16).padStart(2, '0'))
    .join('')}`;
}

// Black clothes on the dark stage get a light outline instead of a dark one.
function edge(fill) {
  if (!HEX.test(fill)) return LINE;
  const [r, g, b] = rgb(fill);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.16 ? LINE_ON_DARK : LINE;
}

function mirror(d) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => (i++ % 2 === 0 ? String(200 - Number(n)) : n));
}

const shape = (fill, d, extra = '') => `<path d="${d}" fill="${fill}" ${edge(fill)}${extra && ` ${extra}`}/>`;
const plain = (fill, d, extra = '') => `<path d="${d}" fill="${fill}"${extra && ` ${extra}`}/>`;
const stroke = (color, d, width = 1.4, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra && ` ${extra}`}/>`;
const dot = (fill, cx, cy, r, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra && ` ${extra}`}/>`;
const group = (cls, items) => `<g class="${cls}">${items.join('')}</g>`;

// A flower of five round petals.
function flower(color, x, y, r, extra = '') {
  let petals = '';
  for (let k = 0; k < 5; k += 1) {
    const a = (Math.PI * 2 * k) / 5 - Math.PI / 2;
    petals += dot(color, (x + Math.cos(a) * r).toFixed(1), (y + Math.sin(a) * r).toFixed(1), (r * 0.78).toFixed(1), extra);
  }
  return petals + dot('#ffd166', x, y, (r * 0.5).toFixed(1));
}

// A tiny four-point star that flashes now and then: jewellery and sequins.
function twinkle(target, x, y, size = 5, delay = 0) {
  const s = size;
  const w = size * 0.22;
  target.push(`<path class="f-twinkle" style="animation-delay:${delay}s" fill="#ffffff" d="M${x} ${y - s} `
    + `Q${x + w} ${y - w} ${x + s} ${y} Q${x + w} ${y + w} ${x} ${y + s} Q${x - w} ${y + w} ${x - s} ${y} `
    + `Q${x - w} ${y - w} ${x} ${y - s} Z"/>`);
}

// A left-hand shape and its mirror: into the one layer of that name (torso),
// or into `<side>L` and `<side>R` (arm, leg).
function sides(layers, side) {
  return layers[side] ? [layers[side], layers[side]] : [layers[`${side}L`], layers[`${side}R`]];
}

function pair(layers, side, fill, d, extra = '') {
  const [left, right] = sides(layers, side);
  left.push(shape(fill, d, extra));
  right.push(shape(fill, mirror(d), extra));
}

function pairLine(layers, side, color, d, width, extra = '') {
  const [left, right] = sides(layers, side);
  left.push(stroke(color, d, width, extra));
  right.push(stroke(color, mirror(d), width, extra));
}

// Prints a piece may wear instead of a flat colour: [tile size, tile markup].
const PATTERNS = {
  dots: (c, c2) => [14, `<rect width="14" height="14" fill="${c}"/>${dot(c2, 4, 4, 2.2)}${dot(c2, 11, 11, 2.2)}`],
  floral: (c, c2) => [20, `<rect width="20" height="20" fill="${c}"/>${flower(c2, 6, 6, 1.9)}${flower(c2, 16, 15, 1.5)}`
    + '<ellipse cx="12" cy="8" rx="2.4" ry="1" fill="#5aa469" transform="rotate(-35 12 8)"/>'],
  plaid: (c, c2) => [16, `<rect width="16" height="16" fill="${c}"/><rect y="5" width="16" height="4" fill="${c2}" opacity=".45"/>`
    + `<rect x="5" width="4" height="16" fill="${c2}" opacity=".45"/><path d="M0 12.5 H16 M12.5 0 V16" stroke="#ffffff" stroke-width=".6" opacity=".4"/>`],
  sequin: (c, c2) => [6, `<rect width="6" height="6" fill="${c}"/>${dot(shade(c, 0.35), 3, 3, 2.2, 'opacity=".9"')}`
    + `${dot(c2, 0, 0, 1.1, 'opacity=".75"')}${dot(c2, 6, 6, 1.1, 'opacity=".75"')}`],
  stripes: (c, c2) => [10, `<rect width="10" height="10" fill="${c}"/><rect y="6" width="10" height="4" fill="${c2}"/>`],
};

function paint(L, p, pattern = p.pattern) {
  if (!PATTERNS[pattern]) return p.color;
  const id = `${L.uid}-${pattern}-${L.defs.length}`;
  const [size, tile] = PATTERNS[pattern](p.color, p.color2 ?? '#ffffff');
  L.defs.push(`<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${tile}</pattern>`);
  return `url(#${id})`;
}

const BODY = {
  neck: 'M92 64 L108 64 L110 98 L90 98 Z',
  torso: 'M90 96 Q74 98 64 108 Q60 120 70 140 Q76 180 80 212 Q70 232 69 256 L131 256 Q130 232 120 212 Q124 180 130 140 Q140 120 136 108 Q126 98 110 96 Z',
  arm: 'M66 104 Q54 108 55 124 L53 200 Q53 240 56 282 L66 282 Q67 240 66 200 L72 140 Q74 116 66 104 Z',
  leg: 'M69 250 L100 250 L100 262 Q99 300 97 340 L96 410 Q97 450 95 490 L94 556 L84 556 L81 490 Q78 450 79 410 L74 340 Q70 300 69 250 Z',
  foot: 'M83 553 L95 553 L97 573 Q89 582 81 573 Z',
};

const FITTED = 'Q139 118 131 140 Q125 178 121 214 L79 214 Q75 178 69 140 Q61 118 64 108';
const TEE = 'M90 96 Q100 106 110 96 Q126 98 136 108 Q139 118 131 140 Q126 180 124 212 Q128 226 129 236 L71 236 Q72 226 76 212 Q74 180 69 140 Q61 118 64 108 Q74 98 90 96 Z';
const TEE_TUCKED = `M90 96 Q100 106 110 96 Q126 98 136 108 ${FITTED} Q74 98 90 96 Z`;
const SLEEVE_SHORT = 'M66 104 Q52 108 52 126 L50 152 L69 155 L72 140 Q74 116 66 104 Z';
const SLEEVE_LONG = 'M66 104 Q52 108 53 126 L51 200 Q51 240 54 276 L68 276 Q69 240 68 200 L72 140 Q74 116 66 104 Z';
const SLEEVE_WIDE = 'M64 102 Q50 106 51 126 L49 200 Q49 240 52 280 L69 280 Q70 240 69 200 L73 140 Q75 112 64 102 Z';
const SLEEVE_KNIT = 'M64 102 Q50 106 51 126 L49 200 Q49 240 52 272 L69 272 Q70 240 69 200 L73 140 Q75 112 64 102 Z';
const PANTS_HIPS = 'M70 204 L130 204 Q133 232 132 262 L100 268 L68 262 Q67 232 70 204 Z';
const BODICE = 'M74 120 Q87 113 100 122 Q113 113 126 120 L124 150 Q121 186 121 214 L79 214 Q79 186 76 150 Z';
const SPARKLE = [[70, 300], [124, 340], [96, 410], [58, 470], [140, 500], [108, 540], [80, 556], [128, 420]];

const TOPS = {
  tee(L, p) {
    L.torso.push(shape(paint(L, p), p.tuck ? TEE_TUCKED : TEE));
    L.torso.push(stroke(shade(p.color, -0.22), 'M90 97 Q100 107 110 97', 1.2));
    pair(L, 'arm', paint(L, p), SLEEVE_SHORT);
  },
  shirt(L, p) {
    const dark = shade(p.color, -0.28);
    const hem = p.tuck ? 212 : 238;
    L.torso.push(shape(paint(L, p), p.tuck ? TEE_TUCKED :
      'M90 95 Q100 104 110 95 Q126 98 136 108 Q139 118 131 140 Q126 180 124 212 Q128 230 130 244 Q100 236 70 244 Q72 230 76 212 Q74 180 69 140 Q61 118 64 108 Q74 98 90 95 Z'));
    L.torso.push(stroke(dark, `M100 106 L100 ${hem}`, 1));
    for (let y = 126; y < hem - 10; y += 24) L.torso.push(dot(dark, 100, y, 1.5));
    pair(L, 'torso', shade(p.color, -0.05), 'M90 93 L99 111 L84 106 Z');
    pair(L, 'arm', p.color, SLEEVE_LONG);
    pair(L, 'arm', shade(p.color, -0.07), 'M54 270 L68 270 L68 284 L54 284 Z');
  },
  crop(L, p) {
    L.torso.push(shape(paint(L, p),
      'M88 98 Q100 104 112 98 Q126 100 136 108 Q139 118 131 140 Q127 165 126 186 L74 186 Q73 165 69 140 Q61 118 64 108 Q74 100 88 98 Z'));
    pair(L, 'arm', p.color, 'M66 104 Q54 108 55 120 L57 132 L71 135 L72 128 Q72 112 66 104 Z');
  },
  hoodie(L, p) {
    const dark = shade(p.color, -0.14);
    L.back.push(shape(shade(p.color, -0.18), 'M80 98 Q76 72 100 72 Q124 72 120 98 Q110 102 100 102 Q90 102 80 98 Z'));
    L.torso.push(shape(p.color,
      'M88 96 Q100 104 112 96 Q128 98 138 110 Q142 122 133 144 Q130 190 131 250 L69 250 Q70 190 67 144 Q58 122 62 110 Q72 98 88 96 Z'));
    L.torso.push(shape(dark, 'M69 240 L131 240 L131 252 L69 252 Z'));
    L.torso.push(shape(shade(p.color, -0.08), 'M80 196 L120 196 L116 228 L84 228 Z'));
    L.torso.push(stroke('#f4f4f4', 'M95 102 L94 142', 1.6), stroke('#f4f4f4', 'M105 102 L106 142', 1.6));
    pair(L, 'arm', p.color, SLEEVE_KNIT);
    pair(L, 'arm', dark, 'M52 266 L69 266 L68 283 L53 283 Z');
  },
  turtleneck(L, p) {
    const dark = shade(p.color, -0.2);
    L.torso.push(shape(p.color, p.tuck ? TEE_TUCKED : TEE));
    L.torso.push(shape(shade(p.color, -0.06), 'M89 72 L111 72 L112 100 Q100 104 88 100 Z'));
    for (const y of [79, 86, 93]) L.torso.push(stroke(dark, `M90 ${y} L110 ${y}`, 0.8, 'opacity=".55"'));
    pair(L, 'arm', p.color, SLEEVE_LONG);
  },
  polo(L, p) {
    const dark = shade(p.color, -0.3);
    L.torso.push(shape(p.color, p.tuck ? TEE_TUCKED : TEE));
    pair(L, 'torso', shade(p.color, -0.08), 'M90 94 L100 108 L85 108 Z');
    L.torso.push(stroke(dark, 'M100 106 L100 136', 1), dot(dark, 100, 118, 1.5), dot(dark, 100, 130, 1.5));
    pair(L, 'arm', p.color, SLEEVE_SHORT);
    pairLine(L, 'arm', shade(p.color, -0.2), 'M51 146 L69 149', 1.6);
  },
  // Áo bà ba: loose, collarless, two pockets low on the front.
  baba(L, p) {
    const dark = shade(p.color, -0.22);
    L.torso.push(shape(p.color,
      'M90 96 Q100 106 110 96 Q126 98 138 110 Q142 122 134 144 Q132 200 134 262 Q117 256 101 262 L99 262 Q83 256 66 262 Q68 200 66 144 Q58 122 62 110 Q74 98 90 96 Z'));
    L.torso.push(stroke(dark, 'M100 104 L100 262', 1));
    for (let y = 118; y < 250; y += 26) L.torso.push(dot(dark, 100, y, 1.6));
    pair(L, 'torso', shade(p.color, -0.07), 'M74 222 L92 222 L92 246 L74 246 Z');
    pair(L, 'arm', p.color, SLEEVE_WIDE);
  },
  sweater(L, p) {
    const dark = shade(p.color, -0.16);
    L.torso.push(shape(p.color,
      'M88 96 Q100 104 112 96 Q128 98 138 110 Q142 122 133 144 Q130 190 131 248 L69 248 Q70 190 67 144 Q58 122 62 110 Q72 98 88 96 Z'));
    L.torso.push(shape(dark, 'M69 238 L131 238 L131 250 L69 250 Z'));
    L.torso.push(stroke(dark, 'M88 97 Q100 108 112 97', 2.6));
    for (const x of [84, 100, 116]) L.torso.push(stroke(dark, `M${x} 112 Q${x - 4} 150 ${x} 175 Q${x + 4} 200 ${x} 234`, 1.1, 'opacity=".55"'));
    pair(L, 'arm', p.color, SLEEVE_KNIT);
    pair(L, 'arm', dark, 'M52 266 L69 266 L68 283 L53 283 Z');
  },
};

function hips(L, p) {
  L.torso.push(shape(paint(L, p), PANTS_HIPS));
  L.torso.push(stroke(shade(p.color, -0.3), 'M70 211 L130 211', 1.2));
}

function skirt(L, fill, d, extra = []) {
  L.torso.push(group('f-skirt', [shape(fill, d), ...extra]));
}

const BOTTOMS = {
  jeans(L, p) {
    const dark = shade(p.color, -0.3);
    hips(L, p);
    L.torso.push(stroke(dark, 'M100 212 L100 248', 1));
    pairLine(L, 'torso', dark, 'M75 218 Q83 222 87 232', 1);
    pair(L, 'leg', p.color, 'M68 250 L100 252 Q100 300 98 340 L97 410 Q98 450 96 490 L96 556 L82 556 L79 490 Q76 450 77 410 L72 340 Q68 300 68 250 Z');
    pairLine(L, 'leg', shade(p.color, 0.25), 'M74 272 Q78 400 84 552', 0.8, 'opacity=".7"');
  },
  trousers(L, p) {
    hips(L, p);
    pair(L, 'leg', p.color, 'M67 250 L100 252 Q101 320 100 380 L99 556 L76 556 Q74 460 74 400 Q70 320 67 250 Z');
    pairLine(L, 'leg', shade(p.color, -0.18), 'M85 264 L87 552', 0.9, 'opacity=".7"');
  },
  wide(L, p) {
    hips(L, p);
    pair(L, 'leg', p.color, 'M66 250 L100 252 Q102 340 104 420 L106 556 L70 556 Q66 460 66 400 Q64 320 66 250 Z');
    pairLine(L, 'leg', shade(p.color, -0.18), 'M86 262 L88 552', 0.9, 'opacity=".7"');
  },
  joggers(L, p) {
    hips(L, p);
    pair(L, 'leg', p.color, 'M67 250 L100 252 Q100 320 98 380 L96 538 L82 538 L78 380 Q70 320 67 250 Z');
    pair(L, 'leg', shade(p.color, -0.15), 'M82 534 L96 534 L95 552 L83 552 Z');
    pairLine(L, 'leg', '#f2f2f2', 'M70 264 Q74 400 81 532', 2, 'opacity=".85"');
  },
  shorts(L, p) {
    hips(L, p);
    pair(L, 'leg', p.color, 'M67 250 L100 252 Q100 290 99 330 L72 334 Q68 290 67 250 Z');
    pairLine(L, 'leg', shade(p.color, -0.25), 'M73 326 L99 323', 1);
  },
  skirt(L, p) {
    skirt(L, paint(L, p), 'M78 204 L122 204 Q132 270 142 352 Q100 362 58 352 Q68 270 78 204 Z',
      [stroke(shade(p.color, -0.3), 'M78 211 L122 211', 1.2)]);
  },
  pleated(L, p) {
    const lines = [];
    for (let k = -3; k <= 3; k += 1) {
      lines.push(stroke(shade(p.color, -0.2), `M${100 + k * 6} 214 L${100 + k * 15} 424`, 0.9, 'opacity=".55"'));
    }
    skirt(L, paint(L, p), 'M78 204 L122 204 Q138 300 150 420 Q100 432 50 420 Q62 300 78 204 Z',
      [...lines, stroke(shade(p.color, -0.3), 'M78 211 L122 211', 1.2)]);
  },
  pencil(L, p) {
    skirt(L, paint(L, p), 'M72 204 L128 204 Q133 240 131 300 L127 404 L73 404 L69 300 Q67 240 72 204 Z',
      [stroke(shade(p.color, -0.3), 'M72 211 L128 211', 1.2), stroke(shade(p.color, -0.3), 'M110 404 L110 374', 1)]);
  },
  midiskirt(L, p) {
    const fold = shade(p.color, -0.16);
    skirt(L, paint(L, p), 'M78 204 L122 204 Q140 320 148 452 Q100 464 52 452 Q60 320 78 204 Z', [
      stroke(shade(p.color, -0.3), 'M78 211 L122 211', 1.2),
      stroke(fold, 'M92 214 Q86 330 74 456', 0.9, 'opacity=".55"'),
      stroke(fold, 'M108 214 Q114 330 126 456', 0.9, 'opacity=".55"'),
    ]);
  },
};

const DRESSES = {
  aodai(L, p) {
    const gold = p.color2 ?? '#f2c14e';
    L.back.push(shape(shade(p.color, -0.2), 'M76 214 L124 214 Q134 340 138 478 L62 478 Q66 340 76 214 Z'));
    L.torso.push(shape(p.color, `M90 82 L110 82 L111 96 Q126 98 136 108 ${FITTED} Q74 98 89 96 Z`));
    L.torso.push(shape(gold, 'M89 79 L111 79 L112 96 L88 96 Z'));
    L.torso.push(stroke(gold, 'M105 97 Q118 104 128 124', 1.6));
    const flowers = [[92, 252], [108, 294], [95, 340], [107, 386], [98, 432], [110, 466], [84, 150], [116, 132]];
    const front = [shape(p.color, 'M82 210 L118 210 Q124 340 128 486 L72 486 Q76 340 82 210 Z')];
    for (const [x, y] of flowers) {
      const target = y > 200 ? front : L.torso;
      target.push(dot(gold, x, y, 4.2), dot(shade(gold, -0.35), x, y, 1.6));
    }
    L.torso.push(group('f-skirt', front));
    pair(L, 'arm', p.color, 'M66 104 Q53 108 54 126 L52 200 Q52 240 55 286 L67 286 Q68 240 67 200 L72 140 Q74 116 66 104 Z');
  },
  gown(L, p) {
    const fold = shade(p.color, -0.22);
    skirt(L, p.color, 'M79 210 L121 210 Q138 300 156 420 Q166 500 174 590 Q100 604 26 590 Q34 500 44 420 Q62 300 79 210 Z', [
      stroke(fold, 'M92 222 Q86 400 68 594', 1.2, 'opacity=".7"'),
      stroke(fold, 'M108 222 Q114 400 132 594', 1.2, 'opacity=".7"'),
      stroke(fold, 'M100 226 L100 600', 1, 'opacity=".45"'),
      ...SPARKLE.map(([x, y]) => dot(p.color2 ?? '#ffffff', x, y, 1.7, 'opacity=".85"')),
    ]);
    L.torso.push(shape(p.color, BODICE));
    L.torso.push(shape(p.color2 ?? shade(p.color, 0.3), 'M79 205 L121 205 L121 215 L79 215 Z'));
  },
  // Đầm đuôi cá: close to the knees, then flaring out.
  mermaid(L, p) {
    const fold = shade(p.color, -0.24);
    skirt(L, p.color, 'M79 210 L121 210 Q131 260 128 330 Q124 400 120 450 Q142 520 162 590 Q100 604 38 590 Q58 520 80 450 Q76 400 72 330 Q69 260 79 210 Z', [
      stroke(fold, 'M93 452 Q86 520 70 594', 1.2, 'opacity=".7"'),
      stroke(fold, 'M107 452 Q114 520 130 594', 1.2, 'opacity=".7"'),
      stroke(fold, 'M100 456 L100 600', 1, 'opacity=".45"'),
      stroke(shade(p.color, 0.22), 'M78 446 Q100 458 122 446', 1.2, 'opacity=".6"'),
      ...SPARKLE.map(([x, y]) => dot(p.color2 ?? '#ffffff', 100 + (x - 100) * 0.55, y, 1.6, 'opacity=".85"')),
    ]);
    L.torso.push(shape(p.color, BODICE));
  },
  // Đầm xòe: a wide skirt with a lighter tulle layer and puffs off the shoulders.
  ballgown(L, p) {
    const light = shade(p.color, 0.4);
    const fold = shade(p.color, -0.16);
    skirt(L, p.color, 'M80 206 L120 206 Q160 262 180 420 Q190 520 184 592 Q100 614 16 592 Q10 520 20 420 Q40 262 80 206 Z', [
      shape(light, 'M80 206 L120 206 Q150 270 164 420 Q172 500 168 560 Q100 580 32 560 Q28 500 36 420 Q50 270 80 206 Z', 'opacity=".55"'),
      stroke(fold, 'M90 230 Q70 400 46 584', 1, 'opacity=".5"'),
      stroke(fold, 'M110 230 Q130 400 154 584', 1, 'opacity=".5"'),
      stroke(fold, 'M100 232 L100 602', 1, 'opacity=".4"'),
      stroke(light, 'M22 588 Q37 601 52 589 Q67 603 82 591 Q97 605 112 591 Q127 603 142 589 Q157 601 172 588', 1.8),
      ...SPARKLE.map(([x, y]) => dot(p.color2 ?? '#ffffff', 100 + (x - 100) * 1.25, y, 1.7, 'opacity=".9"')),
    ]);
    L.torso.push(shape(p.color, 'M74 118 Q87 112 100 120 Q113 112 126 118 L124 150 Q121 186 121 212 L79 212 Q79 186 76 150 Z'));
    L.torso.push(shape(shade(p.color, -0.1), 'M79 204 L121 204 L121 214 L79 214 Z'));
    pair(L, 'arm', light, 'M66 112 Q50 112 52 128 Q56 140 70 136 Q74 124 66 112 Z');
  },
  midi(L, p) {
    const fill = paint(L, p);
    skirt(L, fill, 'M80 206 L120 206 Q142 300 154 432 Q100 446 46 432 Q58 300 80 206 Z');
    L.torso.push(shape(fill, 'M88 98 Q100 112 112 98 Q126 100 136 108 Q139 118 131 140 Q125 178 121 212 L79 212 Q75 178 69 140 Q61 118 64 108 Q74 100 88 98 Z'));
    L.torso.push(shape(shade(p.color, -0.35), 'M79 203 L121 203 L121 214 L79 214 Z'));
    pair(L, 'arm', fill, 'M66 104 Q49 106 50 124 Q51 140 58 147 L72 143 L72 128 Q72 112 66 104 Z');
  },
  // A short fitted dress on thin straps, covered in sequins.
  sequin(L, p) {
    L.torso.push(shape(paint(L, p, 'sequin'),
      'M74 118 Q100 128 126 118 L124 150 Q121 186 121 210 Q130 240 133 280 L135 318 Q100 328 65 318 L67 280 Q70 240 79 210 Q79 186 76 150 Z'));
    pairLine(L, 'torso', shade(p.color, -0.2), 'M80 119 L84 99', 1.5);
    [[90, 160, 0], [113, 196, -0.9], [95, 252, -1.7], [118, 292, -2.4], [82, 300, -1.2]]
      .forEach(([x, y, delay]) => twinkle(L.torso, x, y, 5, delay));
  },
  // Đầm hoa: straps, a square neck and a skirt to the knee.
  sundress(L, p) {
    const fill = paint(L, p);
    skirt(L, fill, 'M80 206 L120 206 Q140 300 150 404 Q100 416 50 404 Q60 300 80 206 Z');
    L.torso.push(shape(fill, 'M78 120 L122 120 L122 150 Q121 186 121 212 L79 212 Q79 186 78 150 Z'));
    L.torso.push(shape(shade(p.color, -0.18), 'M79 204 L121 204 L121 212 L79 212 Z'));
    pairLine(L, 'torso', shade(p.color, -0.25), 'M82 121 L86 99', 1.6);
  },
  // Đầm suông: sleeveless, straight to the knee.
  shift(L, p) {
    L.torso.push(shape(paint(L, p),
      'M78 100 Q100 108 122 100 Q134 106 131 140 Q127 180 126 214 Q130 300 131 402 L69 402 Q70 300 74 214 Q73 180 69 140 Q66 106 78 100 Z'));
    L.torso.push(stroke(shade(p.color, 0.25), 'M78 214 Q100 220 122 214', 1, 'opacity=".5"'));
  },
};

const OUTERS = {
  blazer(L, p) {
    pair(L, 'torso', p.color, 'M64 106 Q74 98 90 96 L99 168 L99 262 L69 262 Q70 236 72 214 Q74 180 69 140 Q61 118 64 106 Z');
    pair(L, 'torso', p.color2 ?? shade(p.color, -0.18), 'M90 96 L81 112 L88 124 L99 168 Z');
    pairLine(L, 'torso', shade(p.color, -0.32), 'M75 234 L92 234', 1.2);
    L.torso.push(dot(shade(p.color, -0.4), 96, 198, 2.2), dot(shade(p.color, -0.4), 96, 226, 2.2));
    pair(L, 'arm', p.color, SLEEVE_WIDE);
  },
  leather(L, p) {
    const light = shade(p.color, 0.14);
    pair(L, 'torso', p.color, 'M64 106 Q74 98 90 96 L96 150 L97 238 L70 238 Q71 214 72 200 Q74 176 69 140 Q61 118 64 106 Z');
    pair(L, 'torso', light, 'M90 96 L74 104 L84 126 L96 150 Z');
    L.torso.push(shape(shade(p.color, -0.1), 'M70 230 L130 230 L130 240 L70 240 Z'));
    L.torso.push(stroke('#c9ccd6', 'M97 150 L97 238', 1.4));
    pair(L, 'arm', p.color, SLEEVE_WIDE);
    pairLine(L, 'arm', light, 'M58 150 L56 230', 1, 'opacity=".5"');
  },
  trench(L, p) {
    const dark = shade(p.color, -0.16);
    pair(L, 'torso', p.color, 'M64 106 Q74 98 90 96 L99 160 L99 430 L62 430 Q64 330 70 262 Q72 236 72 214 Q74 180 69 140 Q61 118 64 106 Z');
    pair(L, 'torso', dark, 'M90 96 L76 108 L86 128 L99 160 Z');
    L.torso.push(shape(dark, 'M68 204 L132 204 L132 217 L68 217 Z'));
    L.torso.push(shape(shade(p.color, -0.35), 'M94 202 L106 202 L106 219 L94 219 Z'));
    for (const y of [178, 240]) L.torso.push(dot(shade(p.color, -0.4), 90, y, 2.2), dot(shade(p.color, -0.4), 110, y, 2.2));
    pair(L, 'arm', p.color, SLEEVE_WIDE);
    pair(L, 'arm', dark, 'M50 252 L69 252 L69 262 L50 262 Z');
  },
  // Áo phao: closed, quilted, a high collar.
  puffer(L, p) {
    const dark = shade(p.color, -0.16);
    L.torso.push(shape(p.color, 'M62 104 Q74 94 90 92 L110 92 Q126 94 138 104 Q147 120 139 150 Q137 200 137 254 L63 254 Q63 200 61 150 Q53 120 62 104 Z'));
    for (const y of [128, 158, 188, 218]) L.torso.push(stroke(dark, `M64 ${y} Q100 ${y + 8} 136 ${y}`, 1.4));
    L.torso.push(shape(shade(p.color, -0.06), 'M86 82 L114 82 L116 102 Q100 108 84 102 Z'));
    L.torso.push(stroke('#c9ccd6', 'M100 102 L100 254', 1.4));
    pair(L, 'arm', p.color, 'M62 100 Q46 104 47 126 L45 200 Q45 240 49 278 L70 278 Q71 240 70 200 L74 140 Q76 110 62 100 Z');
    pairLine(L, 'arm', dark, 'M47 150 L72 152 M46 190 L70 192 M47 230 L70 232', 1.2);
  },
  // Áo khoác jean: short, collar, chest pockets, stitching.
  denim(L, p) {
    const light = shade(p.color, 0.32);
    const dark = shade(p.color, -0.2);
    pair(L, 'torso', p.color, 'M64 106 Q74 98 90 96 L97 150 L98 240 L70 240 Q71 214 72 200 Q74 176 69 140 Q61 118 64 106 Z');
    pair(L, 'torso', dark, 'M90 96 L76 104 L84 124 L97 150 Z');
    pair(L, 'torso', dark, 'M74 150 L92 150 L92 160 L74 160 Z');
    pairLine(L, 'torso', light, 'M74 166 L92 166 M72 228 L97 228', 0.9, 'stroke-dasharray="2 2"');
    L.torso.push(dot(light, 96, 180, 1.8), dot(light, 96, 205, 1.8));
    pair(L, 'arm', p.color, SLEEVE_WIDE);
    pair(L, 'arm', dark, 'M50 266 L69 266 L69 280 L50 280 Z');
  },
  cardigan(L, p) {
    const dark = shade(p.color, -0.18);
    pair(L, 'torso', p.color, 'M64 106 Q74 98 90 96 L98 176 L98 258 L70 258 Q70 236 72 214 Q74 180 69 140 Q61 118 64 106 Z');
    pairLine(L, 'torso', dark, 'M90 97 L98 176 L98 258', 2.2);
    pair(L, 'torso', dark, 'M70 250 L98 250 L98 260 L70 260 Z');
    for (const y of [188, 210, 232]) L.torso.push(dot(shade(p.color, -0.38), 95, y, 1.8));
    pair(L, 'arm', p.color, SLEEVE_WIDE);
    pair(L, 'arm', dark, 'M50 266 L69 266 L69 282 L50 282 Z');
  },
};

const SHOES = {
  sneakers(L, p) {
    pair(L, 'leg', p.color, 'M79 546 L98 546 Q101 560 100 574 Q90 582 77 576 Q76 560 79 546 Z');
    pair(L, 'leg', shade(p.color, p.color.toLowerCase() === '#ffffff' ? -0.14 : 0.5), 'M76 572 Q89 582 101 572 L101 580 Q89 590 76 580 Z');
    pairLine(L, 'leg', shade(p.color, -0.4), 'M84 554 L94 554 M84 560 L94 560', 1);
  },
  heels(L, p) {
    pair(L, 'leg', p.color, 'M82 562 L96 562 L97 574 Q89 588 81 574 Z');
    pairLine(L, 'leg', p.color, 'M83 556 Q89 560 95 556', 1.6);
  },
  flats(L, p) {
    pair(L, 'leg', p.color, 'M82 566 L96 566 L97 575 Q89 585 81 575 Z');
    pair(L, 'leg', shade(p.color, -0.3), 'M86 565 L92 565 L91 569 L87 569 Z');
  },
  boots(L, p) {
    pair(L, 'leg', p.color, 'M77 450 L98 450 L97 552 Q100 562 99 576 Q89 586 78 578 Q78 562 80 552 Z');
    pair(L, 'leg', shade(p.color, -0.2), 'M77 450 L98 450 L98 460 L77 460 Z');
  },
  cowboy(L, p) {
    pair(L, 'leg', p.color, 'M77 448 L98 448 L97 540 Q102 556 100 576 Q88 588 76 578 L80 556 Z');
    pairLine(L, 'leg', shade(p.color, 0.35), 'M81 468 Q88 488 94 468 M82 498 Q88 514 94 498', 1);
  },
  oxford(L, p) {
    pair(L, 'leg', p.color, 'M81 552 L97 552 Q100 564 99 576 Q89 584 79 577 Q78 564 81 552 Z');
    pairLine(L, 'leg', 'rgba(255,255,255,.38)', 'M84 566 Q89 569 94 566', 1.2);
  },
  loafers(L, p) {
    pair(L, 'leg', p.color, 'M81 554 L97 554 Q100 564 99 576 Q89 584 79 577 Q78 564 81 554 Z');
    pairLine(L, 'leg', shade(p.color, -0.4), 'M83 561 L95 561', 1.6);
  },
  sandals(L, p) {
    pair(L, 'leg', shade(p.color, -0.2), 'M80 576 Q89 584 98 576 L98 580 Q89 588 80 580 Z');
    pairLine(L, 'leg', p.color, 'M82 560 L96 560 M83 568 L96 568', 2.6);
  },
};

const HATS = {
  fedora(L, p) {
    L.head.push(shape(p.color, 'M60 31 Q100 22 140 31 Q100 40 60 31 Z'));
    L.head.push(shape(p.color, 'M78 30 Q78 4 100 4 Q122 4 122 30 Z'));
    L.head.push(stroke(shade(p.color, -0.25), 'M92 10 Q100 16 108 10', 1.2));
    L.head.push(shape(shade(p.color, -0.4), 'M78 23 L122 23 L122 30 L78 30 Z'));
  },
  cap(L, p) {
    L.head.push(shape(p.color, 'M77 36 Q77 10 100 10 Q123 10 123 36 Z'));
    L.head.push(shape(shade(p.color, -0.14), 'M78 34 Q100 44 122 34 Q118 50 100 50 Q82 50 78 34 Z'));
    L.head.push(dot(shade(p.color, -0.25), 100, 10, 2.5));
  },
  beret(L, p) {
    L.head.push(shape(p.color, 'M72 28 Q70 6 102 6 Q134 8 128 28 Q100 38 72 28 Z'));
    L.head.push(dot(p.color, 104, 4, 2.6));
  },
  nonla(L, p) {
    const ring = shade(p.color, -0.16);
    L.head.push(shape(p.color, 'M100 -18 L156 40 Q100 56 44 40 Z'));
    for (const t of [0.35, 0.55, 0.75, 0.92]) {
      const y = Math.round(-18 + 58 * t);
      L.head.push(stroke(ring, `M${100 - 56 * t} ${y} Q100 ${y + 9 * t} ${100 + 56 * t} ${y}`, 1));
    }
    L.head.push(stroke(shade(p.color, -0.35), 'M78 46 Q100 90 122 46', 1.1, 'opacity=".75"'));
  },
  sunhat(L, p) {
    L.head.push(shape(p.color, 'M48 31 Q100 18 152 31 Q100 44 48 31 Z'));
    L.head.push(shape(p.color, 'M80 30 Q80 8 100 8 Q120 8 120 30 Z'));
    L.head.push(shape(p.color2 ?? shade(p.color, -0.3), 'M80 23 L120 23 L120 30 L80 30 Z'));
  },
  // Khăn đóng: the wrapped band worn with a men's áo dài.
  khandong(L, p) {
    L.head.push(shape(p.color, 'M77 38 Q76 14 100 13 Q124 14 123 38 Q100 46 77 38 Z'));
    for (const y of [20, 27, 34]) L.head.push(stroke(shade(p.color, 0.2), `M79 ${y} Q100 ${y + 7} 121 ${y}`, 1.2));
  },
  bucket(L, p) {
    L.head.push(shape(p.color, 'M78 34 Q78 10 100 10 Q122 10 122 34 Z'));
    L.head.push(shape(shade(p.color, -0.1), 'M66 42 Q100 30 134 42 L128 50 Q100 42 72 50 Z'));
    L.head.push(stroke(shade(p.color, -0.25), 'M79 30 Q100 36 121 30', 1));
  },
  beanie(L, p) {
    L.head.push(shape(p.color, 'M77 40 Q76 8 100 8 Q124 8 123 40 Z'));
    L.head.push(shape(shade(p.color, -0.15), 'M76 32 L124 32 L124 42 L76 42 Z'));
    L.head.push(dot(p.color2 ?? shade(p.color, 0.4), 100, 5, 6, LINE));
  },
  cowboy(L, p) {
    L.head.push(shape(shade(p.color, -0.08), 'M42 28 Q56 40 100 36 Q144 40 158 28 Q152 46 100 46 Q48 46 42 28 Z'));
    L.head.push(shape(p.color, 'M78 36 Q75 6 92 8 Q100 14 108 8 Q125 6 122 36 Z'));
    L.head.push(shape(shade(p.color, -0.35), 'M78 28 L122 28 L122 34 L78 34 Z'));
  },
  visor(L, p) {
    L.head.push(shape(p.color, 'M77 30 Q100 24 123 30 L123 37 Q100 31 77 37 Z'));
    L.head.push(shape(shade(p.color, -0.1), 'M80 36 Q100 48 120 36 Q116 52 100 52 Q84 52 80 36 Z'));
  },
};

const GLASSES = {
  sunglasses(L, p) {
    L.head.push(`<rect x="83" y="44" width="15" height="9" rx="3.5" fill="#1d1f2b" stroke="${p.color}" stroke-width="1.4"/>`);
    L.head.push(`<rect x="102" y="44" width="15" height="9" rx="3.5" fill="#1d1f2b" stroke="${p.color}" stroke-width="1.4"/>`);
    L.head.push(stroke(p.color, 'M98 47 L102 47', 1.6), stroke('rgba(255,255,255,.4)', 'M86 46 L90 46 M105 46 L109 46', 1));
  },
  round(L, p) {
    L.head.push(dot('rgba(170,205,255,.22)', 91, 49, 6.2, `stroke="${p.color}" stroke-width="1.5"`));
    L.head.push(dot('rgba(170,205,255,.22)', 109, 49, 6.2, `stroke="${p.color}" stroke-width="1.5"`));
    L.head.push(stroke(p.color, 'M97 48 L103 48', 1.4));
  },
};
// Worn in the hair; a hat takes their place.
const HAIRS = {
  tiara(L, p) {
    L.head.push(shape(p.color, 'M79 27 L84 14 L90 22 L95 7 L100 18 L105 7 L110 22 L116 14 L121 27 Q100 19 79 27 Z'));
    L.head.push(dot(p.color2 ?? '#ff8fc0', 100, 17, 2.8), dot('#8fd3ff', 90, 21, 2), dot('#8fd3ff', 110, 21, 2));
    twinkle(L.head, 95, 7, 6, 0);
    twinkle(L.head, 105, 8, 5, -1.3);
  },
  crown(L, p) {
    L.head.push(shape(p.color, 'M80 24 L81 4 L90 13 L100 -1 L110 13 L119 4 L120 24 Q100 19 80 24 Z'));
    L.head.push(shape(shade(p.color, -0.14), 'M80 18 L120 18 L120 25 Q100 20 80 25 Z'));
    L.head.push(dot('#e63946', 100, 12, 2.6), dot('#4cc9f0', 90, 17, 1.8), dot('#4cc9f0', 110, 17, 1.8));
    L.head.push(dot('#fff6d5', 81, 4, 2), dot('#fff6d5', 100, -1, 2.2), dot('#fff6d5', 119, 4, 2));
    twinkle(L.head, 100, -1, 5.5, 0);
    twinkle(L.head, 84, 8, 4, -0.9);
    twinkle(L.head, 116, 8, 4, -1.7);
  },
  bow(L, p) {
    L.head.push(shape(p.color, 'M115 25 L98 13 L99 38 Z'), shape(p.color, 'M115 25 L132 13 L131 38 Z'));
    L.head.push(dot(shade(p.color, -0.2), 115, 25, 4.2, LINE));
  },
  flower(L, p) {
    L.head.push(flower(p.color, 119, 32, 6.4, LINE));
  },
  headband(L, p) {
    L.head.push(stroke(p.color, 'M77 39 Q100 13 123 39', 6.5));
    L.head.push(stroke(shade(p.color, 0.35), 'M84 29 Q100 19 116 29', 1.4, 'opacity=".6"'));
  },
  // A bride's veil down the back, with a tiara on top.
  veil(L, p) {
    L.hairBack.push('<path d="M78 28 Q100 16 122 28 Q152 160 162 430 Q100 448 38 430 Q48 160 78 28 Z" fill="#ffffff" opacity=".42" stroke="rgba(255,255,255,.75)" stroke-width="1"/>');
    HAIRS.tiara(L, { color: p.color2 ?? '#e9ecf5' });
  },
};

// Jewellery is drawn larger than life, as fashion drawings do, so it reads
// from the back of the hall.
const EARS = {
  studs(L, p) {
    for (const x of [79, 121]) L.head.push(dot(p.color, x, 60, 3.3, 'stroke="#ffffff" stroke-width="1"'));
    twinkle(L.head, 79, 60, 6.5, -0.4);
    twinkle(L.head, 121, 60, 6.5, -1.7);
  },
  hoops(L, p) {
    for (const x of [78, 122]) L.head.push(`<circle cx="${x}" cy="67" r="6.8" fill="none" stroke="${p.color}" stroke-width="2.6"/>`);
    twinkle(L.head, 72, 70, 5, -1.1);
  },
  pearl(L, p) {
    for (const x of [79, 121]) L.head.push(dot('#f2c14e', x, 59, 1.9), dot(p.color, x, 68, 4.4, LINE), dot('#ffffff', x - 1.4, 66.6, 1.3));
    twinkle(L.head, 121, 68, 5, -0.7);
  },
};

const WRISTS = {
  bangle(L, p) {
    L.armL.push(`<ellipse cx="61" cy="286" rx="8.6" ry="3.4" fill="none" stroke="${p.color}" stroke-width="3.4"/>`);
    L.armL.push(`<ellipse cx="61" cy="292" rx="8" ry="3" fill="none" stroke="${shade(p.color, 0.3)}" stroke-width="2"/>`);
    twinkle(L.armL, 54, 285, 5, -1.4);
  },
  watch(L, p) {
    L.armL.push(shape('#3b2a20', 'M53 282 L69 282 L69 291 L53 291 Z'), dot(p.color, 61, 286.5, 5.2, LINE), dot('#ffffff', 61, 286.5, 3.2));
    L.armL.push(stroke('#333333', 'M61 286.5 L61 283.8 M61 286.5 L63.2 287.4', 0.8));
  },
};

const BAGS = {
  handbag(L, p) {
    L.armR.push(stroke(shade(p.color, -0.25), 'M131 300 Q140 284 149 300', 2.4));
    L.armR.push(shape(p.color, 'M127 300 L153 300 L156 334 L124 334 Z'));
    L.armR.push(stroke(shade(p.color, -0.25), 'M127 312 L153 312', 1));
  },
  clutch(L, p) {
    L.armR.push(shape(p.color, 'M131 293 L151 293 Q154 293 154 296 L154 305 Q154 308 151 308 L131 308 Q128 308 128 305 L128 296 Q128 293 131 293 Z'));
    L.armR.push(dot(shade(p.color, -0.35), 141, 297, 1.8));
  },
  // A bride's bouquet, held in the hand.
  bouquet(L, p) {
    const second = p.color2 ?? '#ffafcc';
    L.armR.push(stroke('#5aa469', 'M139 300 L137 322 M141 300 L143 321 M140 300 L140 324', 1.6));
    L.armR.push(shape('#5aa469', 'M127 297 Q130 289 135 297 Z'), shape('#5aa469', 'M153 297 Q150 289 145 297 Z'));
    for (const [x, y, r, c] of [[132, 292, 5, p.color], [146, 292, 5, second], [139, 284, 5.4, p.color], [133, 282, 4, second], [145, 281, 4, p.color], [139, 294, 4.4, second]]) {
      L.armR.push(dot(c, x, y, r, LINE));
    }
  },
};

const NECKS = {
  tie(L, p) {
    L.torso.push(shape(p.color, 'M97 107 L103 107 L108 176 L100 188 L92 176 Z'));
    L.torso.push(shape(shade(p.color, -0.15), 'M96 98 L104 98 L103 108 L97 108 Z'));
  },
  bowtie(L, p) {
    L.torso.push(shape(p.color, 'M100 101 L89 95 L89 107 Z'), shape(p.color, 'M100 101 L111 95 L111 107 Z'));
    L.torso.push(shape(shade(p.color, -0.2), 'M97.5 97.5 L102.5 97.5 L102.5 104.5 L97.5 104.5 Z'));
  },
  necklace(L, p) {
    L.torso.push(stroke(p.color, 'M87 99 Q100 128 113 99', 2.4), dot(p.color, 100, 116, 4.4, LINE));
    twinkle(L.torso, 100, 116, 6, -0.6);
  },
  pearls(L, p) {
    for (let i = 0; i <= 9; i += 1) {
      const t = i / 9;
      const x = (1 - t) ** 2 * 85 + 2 * (1 - t) * t * 100 + t * t * 115;
      const y = (1 - t) ** 2 * 99 + 2 * (1 - t) * t * 130 + t * t * 99;
      L.torso.push(dot(p.color, x.toFixed(1), y.toFixed(1), 3.1, 'stroke="rgba(120,110,100,.55)" stroke-width=".7"'));
    }
    twinkle(L.torso, 100, 115, 6, -0.9);
  },
  choker(L, p) {
    L.torso.push(shape(p.color, 'M90 82 L110 82 L110.4 90 L89.6 90 Z'), dot(p.color2 ?? '#f2c14e', 100, 94, 3.2, LINE));
    twinkle(L.torso, 100, 94, 5, -1.5);
  },
  chain(L, p) {
    L.torso.push(stroke(p.color, 'M87 99 Q100 156 113 99', 2), shape(p.color, 'M100 124 L106 131 L100 138 L94 131 Z'));
    twinkle(L.torso, 100, 131, 6.5, -0.3);
  },
  scarf(L, p) {
    L.torso.push(shape(p.color, 'M85 90 Q100 104 115 90 L117 103 Q100 116 83 103 Z'));
    L.torso.push(shape(shade(p.color, -0.1), 'M104 104 L114 103 L119 160 L109 163 Z'));
  },
};

const HAIR_BACK = {
  long: 'M76 38 Q76 16 100 16 Q124 16 124 38 L128 130 Q131 160 123 178 L77 178 Q69 160 72 130 Z',
  waves: 'M76 38 Q76 16 100 16 Q124 16 124 38 Q132 70 126 96 Q134 124 126 150 Q132 170 120 182 L80 182 Q68 170 74 150 Q66 124 74 96 Q68 70 76 38 Z',
  bob: 'M74 40 Q74 16 100 16 Q126 16 126 40 L128 86 Q114 94 100 92 Q86 94 72 86 Z',
  ponytail: 'M118 28 Q142 38 138 92 Q136 116 126 124 Q130 92 120 56 Z',
};

const HAIR_FRONT = {
  short: 'M78 46 Q76 20 100 20 Q124 20 122 46 Q118 34 108 31 Q95 38 84 35 Q80 40 78 46 Z',
  framing: 'M77 60 Q74 20 100 21 Q126 20 123 60 Q121 70 120 82 Q116 48 101 33 Q86 48 80 82 Q79 70 77 60 Z',
  pulled: 'M78 44 Q78 21 100 21 Q122 21 122 44 Q112 31 100 31 Q88 31 78 44 Z',
};

function hair(L, style, color, hatted) {
  if (HAIR_BACK[style]) L.hairBack.push(shape(color, HAIR_BACK[style]));
  if (style === 'bun' && !hatted) L.hairBack.push(dot(color, 100, 15, 12, LINE));
  if (style === 'curly') {
    for (const [x, y, r] of [[100, 18, 14], [80, 24, 13], [120, 24, 13], [70, 40, 12], [130, 40, 12], [68, 58, 11], [132, 58, 11], [72, 74, 10], [128, 74, 10]]) {
      L.hairBack.push(dot(color, x, y, r, LINE));
    }
  }
  return () => {
    if (style === 'curly') {
      for (const [x, y, r] of [[86, 27, 9], [100, 23, 10], [114, 27, 9]]) L.head.push(dot(color, x, y, r));
    } else {
      const front = style === 'short' ? 'short' : style === 'bun' || style === 'ponytail' ? 'pulled' : 'framing';
      L.head.push(shape(color, HAIR_FRONT[front]));
    }
    L.head.push(stroke('rgba(255,255,255,.2)', 'M88 28 Q100 24 112 28', 2));
  };
}

// Every style a slot knows, for the catalog's test.
export const STYLES = {
  top: Object.keys(TOPS), bottom: Object.keys(BOTTOMS), dress: Object.keys(DRESSES), outer: Object.keys(OUTERS),
  shoes: Object.keys(SHOES), hat: Object.keys(HATS), hair: Object.keys(HAIRS), ears: Object.keys(EARS),
  wrist: Object.keys(WRISTS), bag: Object.keys(BAGS), neck: Object.keys(NECKS), glasses: Object.keys(GLASSES),
  pattern: Object.keys(PATTERNS),
};

// A catalog piece, checked: known style, hex colours only.
function piece(value, styles) {
  if (!value || typeof value !== 'object' || !styles[value.style]) return null;
  return {
    style: value.style,
    color: hex(value.color, '#888888'),
    color2: hex(value.color2, null),
    pattern: PATTERNS[value.pattern] ? value.pattern : null,
    tuck: value.tuck === true,
  };
}

let serial = 0;

// body: { skin, hair, hairColor }; outfit: { top, bottom, dress, outer, shoes,
// hat, hair, ears, glasses, neck, wrist, bag }.
export function figureSVG(body = {}, outfit = {}) {
  serial = (serial + 1) % 1e9;
  const skin = hex(body.skin, SKINS[1]);
  const L = { uid: `fig${serial}`, defs: [], hairBack: [], back: [], legL: [], legR: [], torso: [], armL: [], armR: [], head: [] };
  const o = outfit ?? {};
  const top = piece(o.top, TOPS);
  const bottom = piece(o.bottom, BOTTOMS);
  const dress = piece(o.dress, DRESSES);

  L.legL.push(shape(skin, BODY.leg), shape(skin, BODY.foot));
  L.legR.push(shape(skin, mirror(BODY.leg)), shape(skin, mirror(BODY.foot)));
  L.torso.push(shape(skin, BODY.neck), shape(skin, BODY.torso));
  L.armL.push(shape(skin, BODY.arm));
  L.armR.push(shape(skin, mirror(BODY.arm)));

  // A tucked top goes under the waistband, an untucked one over it.
  const drawTop = () => top && !dress && TOPS[top.style](L, top);
  const drawBottom = () => bottom && (!dress || dress.style === 'aodai') && BOTTOMS[bottom.style](L, bottom);
  if (top?.tuck) {
    drawTop();
    drawBottom();
  } else {
    drawBottom();
    drawTop();
  }
  if (dress) DRESSES[dress.style](L, dress);
  const outer = piece(o.outer, OUTERS);
  if (outer) OUTERS[outer.style](L, outer);
  const neck = piece(o.neck, NECKS);
  if (neck) NECKS[neck.style](L, neck);

  L.torso.push(plain('rgba(0,0,0,.12)', 'M92 70 Q100 82 108 70 L108 80 Q100 86 92 80 Z'));
  L.armL.push(`<ellipse cx="61" cy="295" rx="6.5" ry="12.5" fill="${skin}" ${LINE}/>`);
  L.armR.push(`<ellipse cx="139" cy="295" rx="6.5" ry="12.5" fill="${skin}" ${LINE}/>`);
  const wrist = piece(o.wrist, WRISTS);
  if (wrist) WRISTS[wrist.style](L, wrist);
  const bag = piece(o.bag, BAGS);
  if (bag) BAGS[bag.style](L, bag);
  const shoes = piece(o.shoes, SHOES);
  if (shoes) SHOES[shoes.style](L, shoes);

  const hat = piece(o.hat, HATS);
  const hairFront = hair(L, body.hair, hex(body.hairColor, '#2f1e18'), Boolean(hat));
  L.head.push(`<ellipse cx="100" cy="50" rx="21" ry="26" fill="${skin}" ${LINE}/>`);
  hairFront();
  const inHair = piece(o.hair, HAIRS);
  if (inHair && !hat) HAIRS[inHair.style](L, inHair);
  const ears = piece(o.ears, EARS);
  if (ears) EARS[ears.style](L, ears);
  const glasses = piece(o.glasses, GLASSES);
  if (glasses) GLASSES[glasses.style](L, glasses);
  if (hat) HATS[hat.style](L, hat);

  return `<svg class="fig-svg" viewBox="0 -24 200 624" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    (L.defs.length ? `<defs>${L.defs.join('')}</defs>` : '') +
    '<ellipse class="f-shadow" cx="100" cy="586" rx="44" ry="7" fill="rgba(0,0,0,.32)"/>' +
    `<g class="f-body">${group('f-hairback', L.hairBack)}${group('f-back', L.back)}` +
    `${group('f-leg f-leg-l', L.legL)}${group('f-leg f-leg-r', L.legR)}${group('f-torso', L.torso)}` +
    `${group('f-arm f-arm-l', L.armL)}${group('f-arm f-arm-r', L.armR)}${group('f-head', L.head)}</g></svg>`;
}
