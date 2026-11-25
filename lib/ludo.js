'use strict';
// Лудо ережелері. Түстер: 0 қызыл, 1 жасыл, 2 сары, 3 көк (сағат тілімен).
// Фишка күйі: -1 = үйде, 0..50 = негізгі шеңбер (0 = өз старт ұяшығы),
// 51..55 = үй жолағы, 56 = жетті (финиш).
const START = [0, 13, 26, 39];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]); // старттар + жұлдыздар
const FIN = 56;
const COLORS_FOR = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

const ring = (c, s) => (START[c] + s) % 52;

function newTokens(colors) {
  const t = [null, null, null, null];
  colors.forEach(c => { t[c] = [-1, -1, -1, -1]; });
  return t;
}

function legal(tokens, c, d) {
  const out = [];
  tokens[c].forEach((s, i) => {
    if (s === -1) { if (d === 6) out.push(i); }
    else if (s + d <= FIN) out.push(i);
  });
  return out;
}

function move(tokens, c, i, d) {
  const from = tokens[c][i];
  const to = from === -1 ? 0 : from + d;
  tokens[c][i] = to;
  const captured = [];
  if (to <= 50) {
    const cell = ring(c, to);
    if (!SAFE.has(cell)) {
      for (let o = 0; o < 4; o++) {
        if (o === c || !tokens[o]) continue;
        tokens[o].forEach((s, j) => {
          if (s >= 0 && s <= 50 && ring(o, s) === cell) { captured.push({ color: o, i: j, s }); tokens[o][j] = -1; }
        });
      }
    }
  }
  return { from, to, captured, extra: d === 6 || captured.length > 0 || to === FIN };
}

const won = (tokens, c) => tokens[c].every(s => s === FIN);

// Автоойын үшін қарапайым таңдау: финиш > жеу > үйден шығару > алға жүру
function best(tokens, c, d, list) {
  let bi = list[0], bs = -1;
  for (const i of list) {
    const copy = tokens.map(a => (a ? a.slice() : null));
    const r = move(copy, c, i, d);
    const score = (r.to === FIN ? 100 : 0) + r.captured.length * 50 + (r.from === -1 ? 30 : 0) + r.to;
    if (score > bs) { bs = score; bi = i; }
  }
  return bi;
}

module.exports = { START, SAFE, FIN, COLORS_FOR, ring, newTokens, legal, move, won, best };
