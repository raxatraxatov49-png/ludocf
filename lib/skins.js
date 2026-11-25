'use strict';
// Дүкен каталогы: барлығы 7 тас түрі, әрқайсысы 15 Telegram Stars (XTR).
// Классикалық тас — тегін. Интерактив стикерлер (4-тен) тек сол скинді киген ойыншыға ашық.
const PRICE = 15;
const SKINS = [
  { id: 'classic',  price: 0,     stickers: [] },
  { id: 'obsidian', price: PRICE, stickers: ['💣', '✴️', '👻', '⛈️'] },
  { id: 'gold',     price: PRICE, stickers: ['💰', '🔨', '🧲', '🍾'] },
  { id: 'crystal',  price: PRICE, stickers: ['💎', '💘', '🌈', '💠'] },
  { id: 'fire',     price: PRICE, stickers: ['🔥', '☄️', '🌋', '🧨'] },
  { id: 'ice',      price: PRICE, stickers: ['❄️', '⛄', '🧊', '🌨️'] },
  { id: 'neon',     price: PRICE, stickers: ['👾', '🚀', '🛸', '🪐'] }
];
const byId = {};
SKINS.forEach(s => { byId[s.id] = s; });

// Орындар үшін ұпай (ойыншы санына қарай). Тек кездейсоқ ойында беріледі.
const PTS = { 2: [10, 5], 3: [15, 10, 0], 4: [15, 10, 5, 0] };

module.exports = { PRICE, SKINS, byId, PTS };
