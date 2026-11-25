'use strict';
const http = require('./cf/http');
const crypto = require('crypto');
const { WebSocketServer } = require('./cf/ws');
const L = require('./lib/ludo');
const { verifyInitData } = require('./lib/telegram');
const SK = require('./lib/skins');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV = process.env.DEV === '1';
const BOT_USERNAME = (process.env.BOT_USERNAME || '').replace(/^@/, '');
const MINI_APP_SHORT = (process.env.MINI_APP_SHORT || '').replace(/^\/+|\/+$/g, '');
const MINI_APP_URL = (process.env.MINI_APP_URL || '').replace(/\/+$/, '');
const WEBHOOK_URL = process.env.WEBHOOK_URL || (MINI_APP_URL + '/telegram-webhook');
const WEBHOOK_SECRET = crypto.createHash('sha256').update('ludo:' + BOT_TOKEN).digest('hex').slice(0, 48);

const MAX_PLAYERS = 4;
const SEARCH_MS = 20000;   // кездейсоқ ойынға ойыншы жинау уақыты
const TURN_MS = 25000;     // бір әрекетке берілетін уақыт
const AUTO_MS = 1200;      // автоматты ойыншының кідірісі
const ROOM_TTL = 30 * 60 * 1000;
const PINVITE_TTL = 30 * 1000;        // шақыру қанша секунд тұрады
const PDECLINE_LIMIT = 2;             // осынша рет қабылдамаса...
const PDECLINE_COOL = 2 * 60 * 1000;  // ...2 минут қайта шақыра алмайды
const PDECLINE_RESET = 10 * 60 * 1000;
const PLAYERS_LIMIT = 100;
const WATCH_LIMIT = 100;

const users = new Map();      // id -> { id, name, avatar, ws, game, watch }
const profiles = new Map();   // id -> { id, name, avatar, seen, dnd }  (бот ойыншыларының бәрі, офлайн да)
const pinvites = new Map();   // 'from>to' -> { from, to, timer }
const pdecl = new Map();      // 'from>to' -> { count, until, last }
const games = new Map();
const rooms = new Map();      // code -> { code, host, members:[id], at }
const userRoom = new Map();   // userId -> code
let queue = [];
let qTimer = null;
let qEnd = 0;
let gameSeq = 0;

// Кубик: криптографиялық кездейсоқ сан (Math.random орнына, әділдік үшін)
function rand6() {
  const b = new Uint32Array(1);
  for (;;) { globalThis.crypto.getRandomValues(b); if (b[0] < 4294967292) return 1 + (b[0] % 6); }   // 2^32 дейін біркелкі бөлу
}

const isOnline = u => Boolean(u && u.ws && u.ws.readyState === 1);
const pub = u => { const p = profiles.get(u.id); return { id: u.id, name: u.name, avatar: u.avatar || null, vip: Boolean(p && p.vip) }; };
const inGame = u => Boolean(u && u.game && games.has(u.game));

/* ================= Профильдер (Durable Object сақтауында) ================= */

const CF = globalThis.__CF || {};
function saveProfile(p) {
  try { if (CF.putNow) Promise.resolve(CF.putNow('p:' + p.id, p)).catch(() => {}); } catch (e) { /* сақтау қатесі ойынды тоқтатпайды */ }
}
async function loadProfiles() {
  try {
    if (!CF.listNow) return;
    const m = await CF.listNow('p:');
    for (const [, p] of m) if (p && p.id) profiles.set(String(p.id), p);
  } catch (e) { console.error('profiles load:', e && e.message); }
}
function touchProfile(u, seenNow) {
  let p = profiles.get(u.id);
  const now = Date.now();
  const changed = !p || p.name !== u.name || (p.avatar || null) !== (u.avatar || null);
  if (!p) { p = { id: u.id, name: u.name, avatar: u.avatar || null, seen: now, dnd: false, created: now }; profiles.set(u.id, p); }
  p.name = u.name; p.avatar = u.avatar || null;
  if (seenNow) p.seen = now;
  if (changed || seenNow) { playersBaseAt = 0; saveProfile(p); }
  return p;
}

/* ================= Ұпай, апталық рейтинг, VIP, скиндер ================= */

const WEEK_MS = 7 * 24 * 3600 * 1000;
const WEEK0 = Date.UTC(2026, 0, 5);                 // дүйсенбі 00:00 UTC: апта осыдан есептеледі
const weekIdx = (n = Date.now()) => Math.floor((n - WEEK0) / WEEK_MS);
const weekEndAt = () => WEEK0 + (weekIdx() + 1) * WEEK_MS;
function normWeek(p) { const w = weekIdx(); if (p.wk !== w) { p.wk = w; p.wpts = 0; } }
const VIP_REFS = 7;                                  // VIP алу үшін шақырылатын дос саны
const ownsSkin = (p, id) => Boolean(p && SK.byId[id] && (id === 'classic' || p.vip || (p.skins || []).includes(id)));
const skinOf = p => (p && ownsSkin(p, p.skin || 'classic') ? (p.skin || 'classic') : 'classic');

function meInfo(p) {
  normWeek(p);
  return { t: 'me', vip: Boolean(p.vip), refs: (p.refs || []).length, need: VIP_REFS, pts: p.pts || 0, wpts: p.wpts || 0,
    wins: p.wins || 0, games: p.games || 0, skin: skinOf(p), skins: p.skins || [] };
}
function sendMe(id) { const u = users.get(id), p = profiles.get(id); if (u && p) send(u, meInfo(p)); }

function addPoints(uid, pts) {
  const p = profiles.get(uid);
  if (!p || !pts) return;
  normWeek(p);
  p.pts = (p.pts || 0) + pts;
  p.wpts = (p.wpts || 0) + pts;
  saveProfile(p);
  sendMe(uid);
}

function rankPayload(me, scope) {
  const wk = scope !== 'all';
  const rows = [];
  for (const p of profiles.values()) {
    normWeek(p);
    const v = wk ? (p.wpts || 0) : (p.pts || 0);
    if (v > 0 || p.id === me) rows.push({ id: p.id, name: p.name, avatar: p.avatar || null, vip: Boolean(p.vip), v });
  }
  rows.sort((a, b) => (b.v - a.v) || String(a.name).localeCompare(String(b.name)));
  const idx = rows.findIndex(r => r.id === me);
  return { t: 'rank', scope: wk ? 'week' : 'all', list: rows.filter(r => r.v > 0).slice(0, 50),
    me: { rank: idx < 0 ? null : idx + 1, v: idx < 0 ? 0 : rows[idx].v }, resetMs: wk ? weekEndAt() - Date.now() : 0 };
}

// Реферал: дос сілтемемен бірінші рет кірсе (профилі жаңа), шақырушыға +1. 7 дос = VIP
function onRef(u, refId) {
  refId = String(refId || '');
  const p = profiles.get(u.id);
  const inv = profiles.get(refId);
  if (!p || !inv || refId === u.id || p.refBy || !p.created || Date.now() - p.created > 30 * 60 * 1000) return;
  p.refBy = refId;
  saveProfile(p);
  inv.refs = inv.refs || [];
  if (!inv.refs.includes(u.id)) inv.refs.push(u.id);
  const justNow = !inv.vip && inv.refs.length >= VIP_REFS;
  if (justNow) inv.vip = true;
  saveProfile(inv);
  sendMe(refId);
  if (justNow) send(users.get(refId), { t: 'vip_unlocked' });
}

function grantSkin(uid, id, charge) {
  const p = profiles.get(uid);
  if (!p || !SK.byId[id]) return false;
  if (charge) {
    p.charges = p.charges || [];
    if (p.charges.includes(charge)) return true;      // қайталанған төлем хабарламасы
    p.charges.push(charge); if (p.charges.length > 30) p.charges.shift();
  }
  p.skins = p.skins || [];
  if (!p.skins.includes(id)) p.skins.push(id);
  p.skin = id;
  saveProfile(p);
  sendMe(uid);
  return true;
}

async function shopBuy(u, id) {
  const sk = SK.byId[String(id)];
  const p = profiles.get(u.id);
  if (!sk || !sk.price || !p) return;
  if (ownsSkin(p, sk.id)) return send(u, { t: 'error', code: 'owned' });
  if (DEV) { grantSkin(u.id, sk.id, null); return; }  // сынақ режимінде төлемсіз
  if (!BOT_TOKEN) return send(u, { t: 'error', code: 'pay_unavail' });
  const r = await tgApi('createInvoiceLink', {
    title: 'Ludo: ' + sk.id, description: 'Ludo dice & token skin: ' + sk.id,
    payload: 'skin:' + sk.id + ':' + u.id, provider_token: '', currency: 'XTR', prices: [{ label: sk.id, amount: sk.price }]
  });
  if (r && r.ok) send(u, { t: 'invoice', url: r.result, skin: sk.id });
  else send(u, { t: 'error', code: 'pay_unavail' });
}

function send(u, msg) {
  if (!isOnline(u)) return;
  try { u.ws.send(JSON.stringify(msg)); } catch (e) { /* байланыс үзілсе, ештеңе істемейміз */ }
}

const safe = fn => (...a) => { try { fn(...a); } catch (e) { console.error('error:', e && e.stack || e); } };

/* ================= Кездейсоқ ойын: кезек ================= */

function cleanQueue() {
  queue = queue.filter(id => { const u = users.get(id); return isOnline(u) && !inGame(u); });
}

function broadcastQueue() {
  cleanQueue();
  const players = queue.map(id => pub(users.get(id)));
  const ms = Math.max(0, qEnd - Date.now());
  queue.forEach(id => send(users.get(id), { t: 'searching', count: players.length, max: MAX_PLAYERS, ms, players }));
}

function armQueue() {
  clearTimeout(qTimer);
  qEnd = Date.now() + SEARCH_MS;
  qTimer = setTimeout(safe(flushQueue), SEARCH_MS);
}

function flushQueue() {
  clearTimeout(qTimer);
  qTimer = null;
  cleanQueue();
  if (queue.length >= 2) {
    const take = queue.splice(0, MAX_PLAYERS);
    startGame(take.map(id => users.get(id)), true);   // ұпай тек кездейсоқ ойында
    if (queue.length) { armQueue(); broadcastQueue(); }
  } else {
    // 20 секундта қарсылас табылмады: іздеуді тоқтатып, бас мәзірге қайтарамыз
    const lone = queue.splice(0).map(id => users.get(id));
    lone.forEach(u => { if (isOnline(u)) { send(u, { t: 'error', code: 'no_players' }); send(u, { t: 'idle' }); } });
  }
}

function joinQueue(u) {
  if (inGame(u)) return sendGame(u);
  leaveRoom(u, true);
  if (!queue.includes(u.id)) queue.push(u.id);
  cleanQueue();
  if (queue.length >= MAX_PLAYERS) return flushQueue();   // 4 адам жиналса, бірден бастаймыз
  if (queue.length === 1 || !qTimer) armQueue();
  broadcastQueue();
}

function leaveQueue(u, silent) {
  if (!queue.includes(u.id)) return;
  queue = queue.filter(id => id !== u.id);
  if (!queue.length) { clearTimeout(qTimer); qTimer = null; } else broadcastQueue();
  if (!silent) send(u, { t: 'idle' });
}

/* ================= Доспен ойын: бөлме ================= */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}

function roomMsg(r) {
  return { t: 'room', code: r.code, host: r.host, max: MAX_PLAYERS, members: r.members.map(id => pub(users.get(id))) };
}

function broadcastRoom(r) {
  const msg = roomMsg(r);
  r.members.forEach(id => send(users.get(id), msg));
}

function createRoom(u) {
  if (inGame(u)) return sendGame(u);
  leaveQueue(u, true);
  leaveRoom(u, true);
  const r = { code: newCode(), host: u.id, members: [u.id], at: Date.now() };
  rooms.set(r.code, r);
  userRoom.set(u.id, r.code);
  broadcastRoom(r);
}

function joinRoom(u, code) {
  if (inGame(u)) return sendGame(u);
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const r = rooms.get(code);
  if (!r) return send(u, { t: 'error', code: 'room_gone' });
  if (r.members.includes(u.id)) return broadcastRoom(r);
  if (r.members.length >= MAX_PLAYERS) return send(u, { t: 'error', code: 'room_full' });
  leaveQueue(u, true);
  leaveRoom(u, true);
  r.members.push(u.id);
  r.at = Date.now();
  userRoom.set(u.id, code);
  broadcastRoom(r);
}

function leaveRoom(u, silent) {
  const code = userRoom.get(u.id);
  if (!code) return;
  userRoom.delete(u.id);
  const r = rooms.get(code);
  if (!r) return;
  r.members = r.members.filter(id => id !== u.id);
  if (!r.members.length) rooms.delete(code);
  else {
    if (r.host === u.id) r.host = r.members[0];   // жаратушы шықса, хост келесі адамға ауысады
    broadcastRoom(r);
  }
  if (!silent) send(u, { t: 'idle' });
}

function startRoom(u) {
  const r = rooms.get(userRoom.get(u.id));
  if (!r || r.host !== u.id) return;
  const list = r.members.map(id => users.get(id)).filter(isOnline);
  if (list.length < 2) return;
  rooms.delete(r.code);
  r.members.forEach(id => userRoom.delete(id));
  startGame(list);
}

/* ================= Ойын ================= */

const cur = g => g.seats[g.turnIdx];
const seatOf = (g, id) => g.seats.find(s => s.uid === id);

function snapshot(g, spectator) {
  return {
    t: 'game',
    spectator: Boolean(spectator),
    viewers: g.watchers.size,
    id: g.id,
    seats: g.seats.map(s => ({ color: s.color, id: s.uid, name: s.name, avatar: s.avatar, auto: s.auto, left: s.left, lives: s.lives == null ? 3 : s.lives, dice: s.shown, place: s.place, pts: s.pts, skin: s.skin, vip: s.vip })),
    ranked: g.ranked,
    tokens: g.tokens,
    turn: cur(g).color,
    phase: g.phase,
    dice: g.dice,
    rollSeq: g.rollSeq,
    rollColor: g.rollColor,
    moveSeq: g.moveSeq,
    legal: g.phase === 'move' ? g.legal : [],
    ms: Math.max(0, g.deadline - Date.now()),
    winner: g.winner,
    reason: g.reason || null,
    last: g.last || null
  };
}

function sendGame(u) {
  const g = games.get(u.game);
  if (g) send(u, snapshot(g));
}

function broadcastGame(g) {
  const msg = snapshot(g);
  g.seats.forEach(s => { if (!s.left) { const u = users.get(s.uid); if (u && u.game === g.id) send(u, msg); } });
  if (g.watchers.size) {
    const wm = snapshot(g, true);
    for (const id of g.watchers) { const u = users.get(id); if (u && u.watch === g.id) send(u, wm); }
  }
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function startGame(list, ranked) {
  list = shuffle(list.filter(Boolean)).slice(0, MAX_PLAYERS);
  if (list.length < 2) return null;
  const colors = L.COLORS_FOR[list.length];
  const g = {
    id: 'g' + (++gameSeq),
    seats: list.map((u, i) => { const p = profiles.get(u.id); return { uid: u.id, name: u.name, avatar: u.avatar || null, color: colors[i], auto: false, miss: 0, lives: 3, left: false, shown: rand6(), place: null, pts: 0, vip: Boolean(p && p.vip), skin: skinOf(p) }; }),
    ranked: Boolean(ranked), places: [],
    tokens: L.newTokens(colors),
    turnIdx: 0, phase: 'roll', dice: null, legal: [], rollSeq: 0, rollColor: null, moveSeq: 0, chat: [], sixes: 0,
    deadline: 0, timer: null, watchers: new Set(), winner: null, reason: null, last: null, at: Date.now(), emptySince: 0
  };
  games.set(g.id, g);
  list.forEach(u => { u.game = g.id; leaveQueue(u, true); leaveRoom(u, true); });
  beginTurn(g);
  return g;
}

function setTimer(g, ms, fn) {
  clearTimeout(g.timer);
  g.deadline = Date.now() + ms;
  g.timer = setTimeout(safe(fn), ms);
}

function beginTurn(g) {
  g.phase = 'roll';
  g.dice = null;
  g.legal = [];
  const seat = cur(g);
  setTimer(g, seat.auto ? AUTO_MS : TURN_MS, () => onTimeout(g));
  broadcastGame(g);
}

function onTimeout(g) {
  if (g.winner !== null) return;
  const seat = cur(g);
  // 25 секундта жүрмесе: 1 жан кетеді, кезек келесі адамға өтеді
  if (seat.lives == null) seat.lives = 3;
  seat.lives--;
  if (seat.lives <= 0) return eliminate(g, seat);
  nextTurn(g);
}

// жаны таусылған ойыншы ойыннан шығарылады, қалғандар жалғастырады
function eliminate(g, seat) {
  seat.left = true;
  seat.auto = true;
  seat.lives = 0;
  const u = users.get(seat.uid);
  if (u && u.game === g.id) { u.game = null; send(u, { t: 'kicked' }); send(u, { t: 'idle' }); }
  if (checkEnd(g)) return;
  if (cur(g) === seat) nextTurn(g); else broadcastGame(g);
}

/* ---- Орындар: бірінші болып финишке жеткен 1-орын, ойын қалғандарға жалғаса береді ---- */
const activeSeats = g => g.seats.filter(s => !s.left && s.place == null);

function assignPlace(g, seat) {
  const place = g.places.length + 1;
  g.places.push(seat.color);
  seat.place = place;
  const table = SK.PTS[g.seats.length] || [];
  // ұпай: тек кездейсоқ ойын; ойын басында тастап кеткен жағдайда берілмейді (фарм қорғанысы)
  seat.pts = g.ranked && g.moveSeq >= 8 ? (table[place - 1] || 0) : 0;
  if (seat.pts) addPoints(seat.uid, seat.pts);
}

// Белсенді ойыншы 1-ге түссе, ол соңғы орынды алады да ойын аяқталады
function checkEnd(g) {
  if (g.winner !== null) return true;
  const a = activeSeats(g);
  if (a.length > 1) return false;
  if (a.length === 1) assignPlace(g, a[0]);
  if (!g.places.length) { destroyGame(g); return true; }
  finish(g, g.places[0], 'win');
  return true;
}

function roll(g) {
  const seat = cur(g);
  const d = rand6();
  g.dice = d;
  seat.shown = d;                        // кубикте соңғы түскен сан тұра береді
  g.rollColor = seat.color;
  g.rollSeq++;
  g.sixes = d === 6 ? g.sixes + 1 : 0;
  g.legal = g.sixes >= 3 ? [] : L.legal(g.tokens, seat.color, d);
  if (!g.legal.length) {                 // жүріс жоқ (немесе қатарынан үш алты): кезек ауысады
    g.phase = 'wait';
    setTimer(g, 1700, () => nextTurn(g));
  } else if (g.legal.length === 1) {     // жалғыз мүмкіндік: өзі жүреді
    g.phase = 'wait';
    const only = g.legal[0];
    setTimer(g, 1300, () => moveToken(g, only));
  } else {
    g.phase = 'move';
    setTimer(g, seat.auto ? AUTO_MS : TURN_MS, () => onTimeout(g));
  }
  broadcastGame(g);
}

function moveToken(g, i) {
  if (g.winner !== null) return;
  const seat = cur(g);
  const d = g.dice;
  if (!Number.isInteger(i) || !L.legal(g.tokens, seat.color, d).includes(i)) return;
  const r = L.move(g.tokens, seat.color, i, d);
  g.last = { color: seat.color, i, from: r.from, to: r.to, captured: r.captured };
  g.moveSeq++;
  if (L.won(g.tokens, seat.color)) {     // 4 фишка финишке жетті: орын беріледі, қалғандар ойнай береді
    assignPlace(g, seat);
    if (checkEnd(g)) return;
    return nextTurn(g);
  }
  if (r.extra) return beginTurn(g);      // 6 / жеу / финиш: тағы лақтырады
  nextTurn(g);
}

function nextTurn(g) {
  g.sixes = 0;
  for (let k = 0; k < g.seats.length; k++) {
    g.turnIdx = (g.turnIdx + 1) % g.seats.length;
    if (!cur(g).left && cur(g).place == null) break;
  }
  beginTurn(g);
}

// Статистика: ойын саны мен жеңіс (Durable Object сақтауында)
function recordStats(g, color) {
  g.seats.forEach(s => {
    const p = profiles.get(s.uid);
    if (!p) return;
    p.games = (p.games || 0) + 1;
    if (s.color === color) p.wins = (p.wins || 0) + 1;
    saveProfile(p);
    sendMe(s.uid);
  });
  playersBaseAt = 0;
}

function finish(g, color, reason) {
  if (g.winner !== null) return;
  recordStats(g, color);
  clearTimeout(g.timer);
  g.winner = color;
  g.reason = reason;
  g.phase = 'over';
  g.deadline = Date.now();
  broadcastGame(g);
}

function leaveGame(u) {
  const g = games.get(u.game);
  u.game = null;
  if (!g) return send(u, { t: 'idle' });
  const seat = seatOf(g, u.id);
  send(u, { t: 'idle' });
  if (!seat || seat.left || g.winner !== null) { if (g.winner !== null) maybeDrop(g); return; }
  seat.left = true;
  seat.auto = true;
  if (checkEnd(g)) return;
  if (cur(g) === seat) nextTurn(g); else broadcastGame(g);
}

function maybeDrop(g) {
  if (g.watchers.size) return;           // көрермендер бар болса, нәтиже экраны сақталады
  if (g.seats.every(s => s.left || !(users.get(s.uid) && users.get(s.uid).game === g.id))) destroyGame(g);
}

function destroyGame(g) {
  clearTimeout(g.timer);
  games.delete(g.id);
  for (const id of g.watchers) { const w = users.get(id); if (w && w.watch === g.id) { w.watch = null; send(w, { t: 'idle' }); } }
  g.watchers.clear();
  g.seats.forEach(s => { const u = users.get(s.uid); if (u && u.game === g.id) u.game = null; });
}


/* ================= Чат ================= */
const CHAT_MAX = 200, CHAT_GAP = 600;
function chatMsg(u, text) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
  if (!text) return;
  const now = Date.now();
  if (now - (u.lastChat || 0) < CHAT_GAP) return;
  u.lastChat = now;
  let targets, color = null, spec = false;
  const prof = profiles.get(u.id);
  const vip = Boolean(prof && prof.vip);
  const g = games.get(u.game) || games.get(u.watch);
  if (g && g.id === u.watch && g.id !== u.game) {
    // көрермен: чатты тек VIP көреді және жаза алады
    if (!vip) return send(u, { t: 'error', code: 'vip_only' });
    spec = true;
    targets = g.seats.filter(s => !s.left).map(s => users.get(s.uid));
  } else if (g) {
    const seat = seatOf(g, u.id);
    if (!seat || seat.left) return;
    color = seat.color;
    targets = g.seats.filter(s => !s.left).map(s => users.get(s.uid));
  } else {
    const r = rooms.get(userRoom.get(u.id));
    if (!r) return;
    targets = r.members.map(id => users.get(id));
  }
  const msg = { t: 'chat', id: u.id, name: u.name, color, text, at: now, vip, spec };
  if (g) {
    g.chat.push(msg); if (g.chat.length > 50) g.chat.shift();
    for (const id of g.watchers) { const w = users.get(id); const wp = profiles.get(id); if (w && wp && wp.vip) targets.push(w); }   // VIP көрермендер де көреді
  }
  targets.forEach(x => send(x, msg));
}

/* ================= Ойыншылар тізімі, шақыру, көру ================= */

let playersBase = null;
let playersBaseAt = 0;
const activeGame = u => Boolean(u && u.game && games.has(u.game) && games.get(u.game).winner === null);

function playersBaseList() {
  const now = Date.now();
  if (playersBase && now - playersBaseAt < 2000) return playersBase;
  const list = [];
  for (const [id, p] of profiles) {
    const u = users.get(id);
    const on = isOnline(u);
    const busy = on && activeGame(u);
    list.push({ id, name: p.name, avatar: p.avatar || null, status: on ? (busy ? 'game' : 'online') : 'offline',
      watch: busy, dnd: Boolean(p.dnd), seen: on ? now : (p.seen || 0) });
  }
  const order = { online: 0, game: 1, offline: 2 };
  list.sort((a, b) => (order[a.status] - order[b.status]) || (b.seen - a.seen));
  playersBase = list;
  playersBaseAt = now;
  return list;
}

function coolLeft(from, to) {
  const rec = pdecl.get(from + '>' + to);
  return rec && rec.until > Date.now() ? Math.ceil((rec.until - Date.now()) / 1000) : 0;
}

function playersPayload(me) {
  const base = playersBaseList();
  const sentTo = new Set();
  for (const k of pinvites.keys()) if (k.startsWith(me + '>')) sentTo.add(k.slice(me.length + 1));
  const list = [];
  let onlineCount = 0;
  for (const e of base) {
    if (e.id === me) continue;
    if (e.status !== 'offline') onlineCount++;
    if (list.length >= PLAYERS_LIMIT) continue;
    list.push(Object.assign({}, e, { sent: sentTo.has(e.id), cool: coolLeft(me, e.id) }));
  }
  const mine = profiles.get(me);
  return { t: 'players', list, total: base.length - (profiles.has(me) ? 1 : 0), onlineCount, dnd: Boolean(mine && mine.dnd), ttl: PINVITE_TTL / 1000 };
}

// notify: 'to' | 'from' | 'both' | 'none'
function endPInvite(key, reason, notify, extra) {
  const inv = pinvites.get(key);
  if (!inv) return;
  clearTimeout(inv.timer);
  pinvites.delete(key);
  if (notify === 'to' || notify === 'both') send(users.get(inv.to), { t: 'pinvite_end', from: inv.from, reason });
  if (notify === 'from' || notify === 'both') send(users.get(inv.from), Object.assign({ t: 'pinvite_end', to: inv.to, reason }, extra || {}));
}

function clearPInvitesOf(id) {
  for (const [key, inv] of pinvites) if (inv.from === id || inv.to === id) endPInvite(key, 'unavailable', 'both');
}

function sendPInvite(u, toId) {
  toId = String(toId || '');
  const target = users.get(toId);
  if (!toId || toId === u.id) return send(u, { t: 'error', code: 'pinvite_invalid' });
  if (activeGame(u)) return send(u, { t: 'error', code: 'busy' });
  if (!isOnline(target)) return send(u, { t: 'error', code: 'pinvite_offline' });
  if (activeGame(target)) return send(u, { t: 'error', code: 'pinvite_busy' });
  const tp = profiles.get(toId);
  if (tp && tp.dnd) return send(u, { t: 'error', code: 'pinvite_dnd' });
  const cl = coolLeft(u.id, toId);
  if (cl > 0) return send(u, { t: 'error', code: 'pinvite_cool', left: cl });
  const key = u.id + '>' + toId;
  if (pinvites.has(key)) return send(u, { t: 'pinvite_sent', to: toId });
  for (const [k, inv] of pinvites) if (inv.from === u.id) endPInvite(k, 'cancelled', 'to');   // бір уақытта бір ғана шығыс шақыру
  leaveQueue(u, true);
  leaveRoom(u, true);
  const inv = { from: u.id, to: toId, timer: null };
  inv.timer = setTimeout(safe(() => endPInvite(key, 'expired', 'both')), PINVITE_TTL);
  pinvites.set(key, inv);
  playersBaseAt = 0;
  send(u, { t: 'pinvite_sent', to: toId });
  send(target, { t: 'pinvite_in', from: pub(u), ttl: PINVITE_TTL / 1000 });
}

function cancelPInvite(u, toId) {
  toId = String(toId || '');
  endPInvite(u.id + '>' + toId, 'cancelled', 'to');
  send(u, { t: 'pinvite_end', to: toId, reason: 'cancelled' });
}

function answerPInvite(u, fromId, accept) {
  fromId = String(fromId || '');
  const key = fromId + '>' + u.id;
  const inv = pinvites.get(key);
  if (!inv) return send(u, { t: 'pinvite_end', from: fromId, reason: 'expired' });
  if (!accept) {
    const now = Date.now();
    const rec = pdecl.get(key) || { count: 0, until: 0, last: 0 };
    if (now - rec.last > PDECLINE_RESET) rec.count = 0;
    rec.count++;
    rec.last = now;
    let cool = 0;
    if (rec.count >= PDECLINE_LIMIT) { rec.count = 0; rec.until = now + PDECLINE_COOL; cool = PDECLINE_COOL / 1000; }
    pdecl.set(key, rec);
    return endPInvite(key, 'declined', 'from', cool ? { cool } : undefined);
  }
  const from = users.get(inv.from);
  if (!isOnline(from) || activeGame(from) || activeGame(u)) return endPInvite(key, 'unavailable', 'both');
  endPInvite(key, 'accepted', 'none');
  pdecl.delete(key);
  clearPInvitesOf(u.id);
  clearPInvitesOf(from.id);
  unwatch(u); unwatch(from);
  startGame([from, u]);                   // 1-ге 1 Лудо
}

function unwatch(u) {
  if (!u || !u.watch) return;
  const g = games.get(u.watch);
  u.watch = null;
  if (g) { g.watchers.delete(u.id); maybeDrop(g); }
}

function watchStart(u, playerId) {
  const target = users.get(String(playerId || ''));
  const g = target && games.get(target.game);
  if (!g || g.winner !== null || activeGame(u) || (g.watchers.size >= WATCH_LIMIT && !g.watchers.has(u.id))) {
    return send(u, { t: 'error', code: 'watch_unavailable' });
  }
  unwatch(u);
  leaveQueue(u, true);
  leaveRoom(u, true);
  g.watchers.add(u.id);
  u.watch = g.id;
  send(u, snapshot(g, true));
  const wp = profiles.get(u.id);
  if (wp && wp.vip) send(u, { t: 'chat_hist', list: g.chat || [] });
  broadcastGame(g);                        // көрермен санын жаңартамыз
}

/* ================= Хабарламалар ================= */

function handle(u, m) {
  if (m.t === 'find' || m.t === 'room_create' || m.t === 'room_join') unwatch(u);
  switch (m.t) {
    case 'players_get': return send(u, playersPayload(u.id));
    case 'pinvite_send': return sendPInvite(u, m.to);
    case 'pinvite_cancel': return cancelPInvite(u, m.to);
    case 'pinvite_answer': return answerPInvite(u, m.from, Boolean(m.accept));
    case 'watch_start': return watchStart(u, m.id);
    case 'watch_stop': unwatch(u); return send(u, { t: 'idle' });
    case 'dnd_set': {
      const p = touchProfile(u, false);
      p.dnd = Boolean(m.on);
      playersBaseAt = 0;
      saveProfile(p);
      return send(u, { t: 'dnd', on: p.dnd });
    }
    case 'ping': return send(u, { t: 'pong' });
    case 'rank_get': return send(u, rankPayload(u.id, m.scope === 'all' ? 'all' : 'week'));
    case 'me_get': case 'shop_get': { const p = profiles.get(u.id); return p && send(u, meInfo(p)); }
    case 'ref': return onRef(u, m.id);
    case 'shop_buy': return void shopBuy(u, m.id).catch(e => console.error('shop:', e && e.message));
    case 'skin_set': {
      const p = profiles.get(u.id);
      if (!p || !ownsSkin(p, String(m.id))) return;
      p.skin = String(m.id); saveProfile(p); return sendMe(u.id);
    }
    case 'sticker': {
      const g = games.get(u.game);
      const seat = g && seatOf(g, u.id);
      if (!seat || seat.left || g.winner !== null) return;
      const set = (SK.byId[seat.skin] || {}).stickers || [];
      const k = Number(m.k), now = Date.now();
      if (!Number.isInteger(k) || !set[k] || now - (u.lastSticker || 0) < 1500) return;
      u.lastSticker = now;
      const msg = { t: 'sticker', color: seat.color, e: set[k] };
      g.seats.forEach(x => { if (!x.left) send(users.get(x.uid), msg); });
      for (const id of g.watchers) send(users.get(id), msg);
      return;
    }
    case 'chat': return chatMsg(u, m.text);
    case 'find': return joinQueue(u);
    case 'cancel': return leaveQueue(u);
    case 'room_create': return createRoom(u);
    case 'room_join': return joinRoom(u, m.code);
    case 'room_start': return startRoom(u);
    case 'room_leave': return leaveRoom(u);
    case 'leave': return leaveGame(u);
    case 'roll': {
      const g = games.get(u.game);
      if (!g || g.phase !== 'roll') return;
      const seat = seatOf(g, u.id);
      if (!seat || cur(g) !== seat) return;
      seat.auto = false; seat.miss = 0;
      return roll(g);
    }
    case 'move': {
      const g = games.get(u.game);
      if (!g || g.phase !== 'move') return;
      const seat = seatOf(g, u.id);
      if (!seat || cur(g) !== seat || !g.legal.includes(m.i)) return;
      seat.auto = false; seat.miss = 0;
      return moveToken(g, m.i);
    }
  }
}

function onAuth(ws, m) {
  let info = null;
  if (DEV && m.dev && m.dev.id) {
    info = { id: 'dev' + String(m.dev.id).slice(0, 20), name: String(m.dev.name || 'Dev').slice(0, 40), avatar: null };
  } else {
    info = verifyInitData(m.initData, BOT_TOKEN);
  }
  if (!info) {
    ws.send(JSON.stringify({ t: 'error', code: 'auth' }));
    return ws.close();
  }
  info.id = String(info.id);
  let u = users.get(info.id);
  if (u && u.ws && u.ws !== ws) { send(u, { t: 'replaced' }); u.ws.close(); }
  if (!u) { u = { id: info.id, game: null, ws: null }; users.set(info.id, u); }
  u.name = info.name; u.avatar = info.avatar || null; u.ws = ws;
  ws.user = u;
  const prof = touchProfile(u, true);
  send(u, { t: 'hello', me: pub(u), bot: BOT_USERNAME, app: MINI_APP_SHORT, dnd: Boolean(prof.dnd), catalog: SK.SKINS, info: meInfo(prof) });
  const g = games.get(u.game);
  if (g) {
    const seat = seatOf(g, u.id);
    if (seat && !seat.left) { seat.auto = false; seat.miss = 0; }
    sendGame(u);
    send(u, { t: 'chat_hist', list: g.chat || [] });
  } else u.game = null;
}

function onClose(ws) {
  const u = ws.user;
  if (!u || u.ws !== ws) return;
  u.ws = null;
  leaveQueue(u, true);
  leaveRoom(u, true);
  clearPInvitesOf(u.id);
  unwatch(u);
  touchProfile(u, true);
  // байланыс үзілсе, автомат жүрмейді: 25 секундта жүрмесе жаны кете береді
}

const wss = new WebSocketServer({ path: '/ws' });
wss.on('connection', ws => {
  ws.on('message', safe(d => {
    let m;
    try { m = JSON.parse(typeof d === 'string' ? d : String(d)); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    // флуд қорғанысы: секундына 30-дан артық хабарлама өтпейді
    const now = Date.now();
    if (now - (ws.rateAt || 0) >= 1000) { ws.rateAt = now; ws.rateN = 0; }
    if (++ws.rateN > 30) return;
    if (m.t === 'auth') return onAuth(ws, m);
    if (ws.user) handle(ws.user, m);
  }));
  ws.on('close', safe(() => onClose(ws)));
});

// Қалдықтарды тазалау
setInterval(safe(() => {
  const now = Date.now();
  for (const r of rooms.values()) if (now - r.at > ROOM_TTL) {
    r.members.forEach(id => { userRoom.delete(id); send(users.get(id), { t: 'idle' }); });
    rooms.delete(r.code);
  }
  for (const g of games.values()) {
    const online = g.seats.filter(s => !s.left && isOnline(users.get(s.uid))).length;
    if (online) g.emptySince = 0;
    else if (!g.emptySince) g.emptySince = now;
    if ((g.emptySince && now - g.emptySince > 60000) || (g.winner !== null && now - g.deadline > 10 * 60000)) destroyGame(g);
  }
  for (const [id, u] of users) if (!isOnline(u) && !inGame(u)) users.delete(id);
  for (const [k, rec] of pdecl) if (rec.until < now && now - rec.last > PDECLINE_RESET) pdecl.delete(k);   // жад ағып кетпеуі үшін
}), 20000);

/* ================= Telegram бот ================= */

const TXT = {
  kk: { start: '🎲 <b>Лудо</b>\nДостарыңмен немесе кездейсоқ ойыншылармен ойна!', play: '🎮 Ойнау', cmd: 'Ойынды ашу', helpCmd: 'Көмек', rulesCmd: 'Ойын ережелері',
    help: '🎲 <b>Лудо</b>\n/start — ойынды ашу\n/rules — ережелер\n/help — көмек',
    rules: '📖 <b>Ережелер</b>\n• 6 шықса фишка үйден шығады\n• 6 / жеп алу / финишке жету — қосымша лақтыру\n• Қатарынан 3 алты — кезек өтеді\n• ☆ және бастапқы ұяшықтарда фишканы жеуге болмайды\n• Финишке дәл сан керек\n• 4 фишкасын бірінші жеткізген жеңеді\n• Бір әрекетке 25 секунд, 3 рет өткізсе ойыннан шығарылады' },
  uz: { start: '🎲 <b>Ludo</b>\nDo‘stlaring yoki tasodifiy o‘yinchilar bilan o‘yna!', play: '🎮 O‘ynash', cmd: 'O‘yinni ochish', helpCmd: 'Yordam', rulesCmd: 'O‘yin qoidalari',
    help: '🎲 <b>Ludo</b>\n/start — o‘yinni ochish\n/rules — qoidalar\n/help — yordam',
    rules: '📖 <b>Qoidalar</b>\n• 6 tushsa, tosh uydan chiqadi\n• 6 / urib olish / marraga yetish — qo‘shimcha tashlash\n• Ketma-ket 3 ta oltilik — navbat o‘tadi\n• ☆ va boshlang‘ich kataklarda toshni urib bo‘lmaydi\n• Marraga aniq son kerak\n• 4 toshini birinchi yetkazgan g‘olib\n• Har yurishga 25 soniya, 3 marta o‘tkazsa o‘yindan chiqariladi' },
  ru: { start: '🎲 <b>Лудо</b>\nИграй с друзьями или случайными игроками!', play: '🎮 Играть', cmd: 'Открыть игру', helpCmd: 'Помощь', rulesCmd: 'Правила игры',
    help: '🎲 <b>Лудо</b>\n/start — открыть игру\n/rules — правила\n/help — помощь',
    rules: '📖 <b>Правила</b>\n• Фишка выходит из дома при выпадении 6\n• 6 / съедение / финиш — дополнительный бросок\n• Три шестёрки подряд — ход переходит\n• На звёздах и стартовых клетках фишку съесть нельзя\n• В финиш нужно точное число\n• Побеждает тот, кто первым приведёт 4 фишки\n• 25 секунд на ход, 3 пропуска — выбываешь из игры' }
};
const pickLang = c => { c = String(c || '').slice(0, 2).toLowerCase(); return TXT[c] ? c : 'kk'; };

async function tgApi(method, data) {
  const r = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/' + method, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data)
  });
  return r.json();
}

const parsePay = (payload, fromId) => {
  const m = /^skin:([a-z]+):(\d+)$/.exec(String(payload || ''));
  return m && SK.byId[m[1]] && SK.byId[m[1]].price && m[2] === String(fromId) ? m[1] : null;
};

async function handleUpdate(update) {
  const pq = update && update.pre_checkout_query;
  if (pq) {   // Stars төлемін растау: тек біздің тапсырыс, дұрыс сома, ойыншыда әлі жоқ скин
    const id = parsePay(pq.invoice_payload, pq.from && pq.from.id);
    const p = profiles.get(String(pq.from && pq.from.id));
    const ok = Boolean(id && pq.currency === 'XTR' && pq.total_amount === SK.byId[id].price && !(p && ownsSkin(p, id)));
    await tgApi('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: pq.id, ok: true } : { pre_checkout_query_id: pq.id, ok: false, error_message: 'Order is not available' });
    return;
  }
  const msg = update && update.message;
  const sp = msg && msg.successful_payment;
  if (sp) {
    const id = parsePay(sp.invoice_payload, msg.from && msg.from.id);
    if (id && sp.currency === 'XTR') grantSkin(String(msg.from.id), id, sp.telegram_payment_charge_id);
    return;
  }
  if (!msg || typeof msg.text !== 'string') return;
  const cmd = (msg.text.match(/^\/(\w+)/) || [])[1];
  const lang = pickLang(msg.from && msg.from.language_code);
  if (cmd === 'help' || cmd === 'rules') {
    await tgApi('sendMessage', { chat_id: msg.chat.id, text: TXT[lang][cmd], parse_mode: 'HTML' });
    return;
  }
  if (cmd !== 'start') return;
  const param = (msg.text.split(/\s+/)[1] || '').trim();
  const room = /^room_[A-Za-z0-9]{4,8}$/.test(param) ? param.slice(5) : '';
  const ref = /^ref_\d{1,15}$/.test(param) ? param.slice(4) : '';
  const url = MINI_APP_URL + '/?lang=' + lang + (room ? '&room=' + room : '') + (ref ? '&ref=' + ref : '');
  await tgApi('sendMessage', {
    chat_id: msg.chat.id, text: TXT[lang].start, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: TXT[lang].play, web_app: { url } }]] }
  });
}

async function setupTelegram() {
  if (!BOT_TOKEN || DEV || process.env.SKIP_WEBHOOK === '1') return;
  try {
    const cmds = c => [{ command: 'start', description: TXT[c].cmd }, { command: 'rules', description: TXT[c].rulesCmd }, { command: 'help', description: TXT[c].helpCmd }];
    await tgApi('setMyCommands', { commands: cmds('kk') });
    for (const code of ['uz', 'ru']) {
      await tgApi('setMyCommands', { commands: cmds(code), language_code: code });
    }
    const r = await tgApi('setWebhook', { url: WEBHOOK_URL, secret_token: WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'] });
    console.log('Telegram webhook:', r.description);
  } catch (e) { console.error('Telegram баптау қатесі:', e && e.message); }
}

const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && path === '/telegram-webhook') {
    if (req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) { res.writeHead(403); return res.end('forbidden'); }
    let body = '';
    for await (const c of req) body += c;
    try { await handleUpdate(JSON.parse(body)); } catch (e) { console.error('webhook:', e && e.message); }
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  if (path === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  res.writeHead(404);
  res.end('not found');
});

loadProfiles().finally(() => server.listen(3000, () => { setupTelegram(); }));

module.exports = { handle, users, games, rooms, profiles };
