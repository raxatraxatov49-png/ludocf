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

const VIP_REFS = 7;                                  // VIP алу үшін шақырылатын дос саны
const VIP_DAYS = 7;                                  // VIP неше күнге беріледі
const VIP_MS = VIP_DAYS * 24 * 60 * 60 * 1000;
const isVip = p => Boolean(p && p.vipUntil && p.vipUntil > Date.now());

const isOnline = u => Boolean(u && u.ws && u.ws.readyState === 1);
const pub = u => { const p = profiles.get(u.id); return { id: u.id, name: u.name, avatar: u.avatar || null, vip: isVip(p) }; };
const inGame = u => Boolean(u && u.game && games.has(u.game));

/* ================= Сақтау: Upstash Redis (қосылмаса — Durable Object) =================
   Variables: UPSTASH_REDIS_REST_URL және UPSTASH_REDIS_REST_TOKEN.
   Кілт 'p:123' -> Redis hash 'ludo:p', өріс '123'. Ескі Durable Object деректері бірінші іске қосуда автоматты көшіріледі. */

const CF = globalThis.__CF || {};
const UP_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const UP = Boolean(UP_URL && UP_TOKEN);
console.log('сақтау:', UP ? 'Upstash Redis' : 'Durable Object');

async function upCmd(cmds) {                      // cmds: [['HSET', ...], ...] — бір pipeline сұранысы
  const r = await fetch(UP_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + UP_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('upstash HTTP ' + r.status);
  const out = await r.json();
  const bad = Array.isArray(out) && out.find(x => x && x.error);
  if (bad) throw new Error('upstash: ' + bad.error);
  return out;
}
const upSplit = key => { const i = key.indexOf(':'); return ['ludo:' + key.slice(0, i), key.slice(i + 1)]; };
const upPend = new Map();                         // кілт -> соңғы мән (қатар жазуды біріктіреміз)
let upTimer = null;
function upSchedule(ms) { if (!upTimer) upTimer = setTimeout(upFlush, ms); }
async function upFlush() {
  upTimer = null;
  if (!upPend.size) return;
  const batch = Array.from(upPend); upPend.clear();
  try {
    for (let i = 0; i < batch.length; i += 200) {
      const cmds = batch.slice(i, i + 200).map(([k, v]) => { const [h, f] = upSplit(k); return ['HSET', h, f, JSON.stringify(v)]; });
      await upCmd(cmds);
    }
  } catch (e) {
    console.error('upstash сақтау қатесі:', e && e.message);
    batch.forEach(([k, v]) => { if (!upPend.has(k)) upPend.set(k, v); });   // қайта көреміз
    upSchedule(5000);
  }
}
async function upList(prefix) {
  const out = await upCmd([['HGETALL', 'ludo:' + prefix.replace(/:$/, '')]]);
  const r = out[0] && out[0].result, m = new Map();
  const put = (f, v) => { try { m.set(prefix + f, JSON.parse(v)); } catch (e) { /* бүлінген жазбаны өткізіп жібереміз */ } };
  if (Array.isArray(r)) for (let i = 0; i + 1 < r.length; i += 2) put(r[i], r[i + 1]);
  else if (r && typeof r === 'object') for (const f of Object.keys(r)) put(f, r[f]);
  return m;
}
function dbPut(key, val) {
  try {
    if (UP) { upPend.set(key, val); upSchedule(250); }
    else if (CF.putNow) Promise.resolve(CF.putNow(key, val)).catch(() => {});
  } catch (e) { /* сақтау қатесі ойынды тоқтатпайды */ }
}
async function dbList(prefix) {
  if (!UP) return CF.listNow ? CF.listNow(prefix) : new Map();
  const m = await upList(prefix);
  if (!m.size && CF.listNow) {                    // Upstash бос: ескі Durable Object деректерін бір рет көшіреміз
    const old = await CF.listNow(prefix);
    if (old && old.size) {
      for (const [k, v] of old) upPend.set(k, v);
      await upFlush();
      console.log('Durable Object -> Upstash көшірілді:', prefix, old.size);
      return old;
    }
  }
  return m;
}

function saveProfile(p) { dbPut('p:' + p.id, p); }
async function loadProfiles() {
  try {
    const m = await dbList('p:');
    for (const [, p] of m) if (p && p.id) profiles.set(String(p.id), p);
  } catch (e) { console.error('profiles load:', e && e.message); }
  await loadCfg();
}
function touchProfile(u, seenNow) {
  let p = profiles.get(u.id);
  const now = Date.now();
  let changed = !p || p.name !== u.name || (p.avatar || null) !== (u.avatar || null);
  if (!p) { p = { id: u.id, name: u.name, avatar: u.avatar || null, seen: now, dnd: false, created: now }; profiles.set(u.id, p); }
  p.name = u.name; p.avatar = u.avatar || null;
  const un = String(u.username || '').toLowerCase();
  if (un && p.username !== un) { p.username = un; changed = true; }
  if (seenNow) p.seen = now;
  if (changed || seenNow) { playersBaseAt = 0; saveProfile(p); }
  return p;
}

/* ================= Ұпай, VIP, скиндер ================= */

const ownsSkin = (p, id) => Boolean(p && SK.byId[id] && (id === 'classic' || isVip(p) || (p.skins || []).includes(id)));
const skinOf = p => (p && ownsSkin(p, p.skin || 'classic') ? (p.skin || 'classic') : 'classic');

function meInfo(p) {
  return { t: 'me', vip: isVip(p), left: isVip(p) ? p.vipUntil - Date.now() : 0, refs: isVip(p) ? 0 : (p.refs || []).length, need: VIP_REFS, days: VIP_DAYS, pts: p.pts || 0,
    wins: p.wins || 0, games: p.games || 0, skin: skinOf(p), skins: p.skins || [] };
}
function sendMe(id) { const u = users.get(id), p = profiles.get(id); if (u && p) send(u, meInfo(p)); }

function addPoints(uid, pts) {
  const p = profiles.get(uid);
  if (!p || !pts) return;
  p.pts = (p.pts || 0) + pts;
  saveProfile(p);
  sendMe(uid);
}

// Реферал: дос сілтемемен ботқа бірінші рет кіріп «Бастау» басса, шақырушыға +1.
// 7 дос = 7 күн VIP. VIP кезінде келген достар есептелмейді; мерзім біткен соң санақ 0-ден басталады.
function creditRef(friendId, refId, name, avatar) {
  friendId = String(friendId || ''); refId = String(refId || '');
  if (!/^\d+$/.test(friendId) || !/^\d+$/.test(refId) || refId === friendId) return false;
  const inv = profiles.get(refId);
  if (!inv) return false;
  const now = Date.now();
  let p = profiles.get(friendId);
  if (!p) {   // дос ботқа алғаш рет кірді: профиль жасаймыз
    p = { id: friendId, name: String(name || 'Player').slice(0, 40), avatar: avatar || null, seen: now, dnd: false, created: now };
    profiles.set(friendId, p);
    playersBaseAt = 0;
  }
  if (p.refBy || !p.created || now - p.created > 30 * 60 * 1000) return false;   // тек жаңа қолданушы, тек бір рет
  p.refBy = refId;
  saveProfile(p);
  if (isVip(inv)) return true;   // VIP белсенді кезде шақыру есептелмейді
  inv.refs = inv.refs || [];
  if (!inv.refs.includes(friendId)) inv.refs.push(friendId);
  let unlocked = false;
  if (inv.refs.length >= VIP_REFS) { inv.vipUntil = now + VIP_MS; inv.refs = []; unlocked = true; }
  saveProfile(inv);
  sendMe(refId);
  if (unlocked) send(users.get(refId), { t: 'vip_unlocked' });
  return true;
}
function onRef(u, refId) { creditRef(u.id, refId, u.name, u.avatar); }

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
    seats: list.map((u, i) => { const p = profiles.get(u.id); return { uid: u.id, name: u.name, avatar: u.avatar || null, color: colors[i], auto: false, miss: 0, lives: 3, left: false, shown: rand6(), place: null, pts: 0, vip: isVip(p), skin: skinOf(p) }; }),
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
  seat.pts = 0;   // ұпай берілмейді (кездейсоқ ойында да)
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

// Статистика: ойын саны мен жеңіс (Upstash / Durable Object сақтауында)
function recordStats(g, color) {
  stats.games++; saveCfg();
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
  const vip = isVip(prof);
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
    for (const id of g.watchers) { const w = users.get(id); const wp = profiles.get(id); if (w && wp && isVip(wp)) targets.push(w); }   // VIP көрермендер де көреді
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
    if (p.blocked) continue;
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
  if (isVip(wp)) send(u, { t: 'chat_hist', list: g.chat || [] });
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
  const bp = profiles.get(info.id);
  if (bp && bp.blocked && !isAdmin(info.id)) {   // блокталған: мини апп ашылмайды
    try { ws.send(JSON.stringify({ t: 'blocked' })); } catch (e) { /* жабылған */ }
    return ws.close();
  }
  let u = users.get(info.id);
  if (u && u.ws && u.ws !== ws) { send(u, { t: 'replaced' }); u.ws.close(); }
  if (!u) { u = { id: info.id, game: null, ws: null }; users.set(info.id, u); }
  u.name = info.name; u.avatar = info.avatar || null; u.username = info.username || ''; u.ws = ws;
  ws.user = u;
  const prof = touchProfile(u, true);
  send(u, { t: 'hello', me: pub(u), bot: BOT_USERNAME, app: MINI_APP_SHORT, dnd: Boolean(prof.dnd), catalog: SK.SKINS, info: meInfo(prof) });
  const g = games.get(u.game);
  if (g) {
    const seat = seatOf(g, u.id);
    if (seat && !seat.left) { seat.auto = false; seat.miss = 0; if (u.avatar) seat.avatar = u.avatar; }
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
  for (const [id, u] of users) {
    if (isOnline(u)) {   // VIP мерзімі біткенде клиентке жаңа күйді жібереміз
      const v = isVip(profiles.get(id));
      if (u.vipSeen !== undefined && u.vipSeen !== v) sendMe(id);
      u.vipSeen = v;
    }
  }
  for (const [id, u] of users) if (!isOnline(u) && !inGame(u)) users.delete(id);
  for (const [k, rec] of pdecl) if (rec.until < now && now - rec.last > PDECLINE_RESET) pdecl.delete(k);   // жад ағып кетпеуі үшін
}), 20000);

/* ================= Telegram бот ================= */

const TXT = {
  kk: { start: '🎲 <b>Ludo ойынына қош келдің!</b>\n\n🔥 Достарыңмен ойна, қарсыластарыңды жең және нағыз Ludo чемпионы атан!\n\n👇 Ойынды бастау үшін төмендегі батырманы бас!\n\n🌐 Тіл: /language', play: '🎮 ОЙНАУ', cmd: 'Ойынды ашу', helpCmd: 'Көмек', rulesCmd: 'Ойын ережелері', langCmd: 'Тілді өзгерту', langPrompt: '🌐 Тілді таңдаңыз:', langSet: '✅ Тіл қойылды: Қазақша',
    help: '🎲 <b>Лудо</b>\n/start — ойынды ашу\n/rules — ережелер\n/help — көмек\n/language — тіл',
    rules: '📖 <b>Ережелер</b>\n• 6 шықса фишка үйден шығады\n• 6 / жеп алу / финишке жету — қосымша лақтыру\n• Қатарынан 3 алты — кезек өтеді\n• ☆ және бастапқы ұяшықтарда фишканы жеуге болмайды\n• Финишке дәл сан керек\n• 4 фишкасын бірінші жеткізген жеңеді\n• Бір әрекетке 25 секунд, 3 рет өткізсе ойыннан шығарылады' },
  uz: { start: '🎲 <b>Ludo o‘yiniga xush kelibsiz!</b>\n\n🔥 Do‘stlaring bilan o‘yna, raqiblaringni yeng va haqiqiy Ludo chempioni bo‘l!\n\n👇 O‘yinni boshlash uchun quyidagi tugmani bos!\n\n🌐 Til: /language', play: '🎮 O‘ynash', cmd: 'O‘yinni ochish', helpCmd: 'Yordam', rulesCmd: 'O‘yin qoidalari', langCmd: 'Tilni o‘zgartirish', langPrompt: '🌐 Tilni tanlang:', langSet: '✅ Til o‘rnatildi: O‘zbekcha',
    help: '🎲 <b>Ludo</b>\n/start — o‘yinni ochish\n/rules — qoidalar\n/help — yordam\n/language — til',
    rules: '📖 <b>Qoidalar</b>\n• 6 tushsa, tosh uydan chiqadi\n• 6 / urib olish / marraga yetish — qo‘shimcha tashlash\n• Ketma-ket 3 ta oltilik — navbat o‘tadi\n• ☆ va boshlang‘ich kataklarda toshni urib bo‘lmaydi\n• Marraga aniq son kerak\n• 4 toshini birinchi yetkazgan g‘olib\n• Har yurishga 25 soniya, 3 marta o‘tkazsa o‘yindan chiqariladi' },
  ru: { start: '🎲 <b>Добро пожаловать в Ludo!</b>\n\n🔥 Играй с друзьями, побеждай соперников и стань настоящим чемпионом Ludo!\n\n👇 Нажми кнопку ниже, чтобы начать игру!\n\n🌐 Язык: /language', play: '🎮 Играть', cmd: 'Открыть игру', helpCmd: 'Помощь', rulesCmd: 'Правила игры', langCmd: 'Сменить язык', langPrompt: '🌐 Выберите язык:', langSet: '✅ Язык установлен: Русский',
    help: '🎲 <b>Лудо</b>\n/start — открыть игру\n/rules — правила\n/help — помощь\n/language — язык',
    rules: '📖 <b>Правила</b>\n• Фишка выходит из дома при выпадении 6\n• 6 / съедение / финиш — дополнительный бросок\n• Три шестёрки подряд — ход переходит\n• На звёздах и стартовых клетках фишку съесть нельзя\n• В финиш нужно точное число\n• Побеждает тот, кто первым приведёт 4 фишки\n• 25 секунд на ход, 3 пропуска — выбываешь из игры' }
};
const pickLang = c => { c = String(c || '').slice(0, 2).toLowerCase(); return TXT[c] ? c : 'kk'; };

// Боттың жеке чаттағы тілі (/language арқылы таңдалады). Мини аппқа әсер етпейді: ол өз тілін өзі таңдайды.
const botLangOf = from => {
  const p = from && profiles.get(String(from.id));
  return p && TXT[p.botLang] ? p.botLang : 'kk';   // тіл таңдалмаса — басты тіл қазақша
};
const LANGS = [['kk', '🇰🇿 Қазақша'], ['ru', '🇷🇺 Русский'], ['uz', '🇺🇿 O‘zbekcha']];
const langKb = () => ({ inline_keyboard: LANGS.map(([c, n]) => [{ text: n, callback_data: 'l:' + c }]) });
const botCmds = c => [{ command: 'start', description: TXT[c].cmd }, { command: 'language', description: TXT[c].langCmd }, { command: 'rules', description: TXT[c].rulesCmd }, { command: 'help', description: TXT[c].helpCmd }];

async function langCb(cb) {
  const code = String(cb.data || '').slice(2);
  tgApi('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
  const chat = cb.message && cb.message.chat && cb.message.chat.id;
  if (!TXT[code] || !chat || !cb.from) return;
  const p = touchBotUser(cb.from);
  if (!p || (p.blocked && !isAdmin(p.id))) return;
  if (p.botLang !== code) { p.botLang = code; saveProfile(p); }
  tgApi('deleteMessage', { chat_id: chat, message_id: cb.message.message_id }).catch(() => {});
  tgApi('sendMessage', { chat_id: chat, text: TXT[code].langSet }).catch(() => {});
  tgApi('setMyCommands', { commands: botCmds(code), scope: { type: 'chat', chat_id: chat } }).catch(() => {});   // команда мәзірі де таңдалған тілде болсын
}

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

const GROUP_BTN = { kk: '👥 Группада ойнау', ru: '👥 Играть в группе', uz: '👥 Guruhda o‘ynash' };

// Бот топқа қосылғанда сәлемдесу хабарламасы
async function onBotAdded(mc) {
  const chat = mc && mc.chat;
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;
  const was = mc.old_chat_member && mc.old_chat_member.status, now = mc.new_chat_member && mc.new_chat_member.status;
  if (!['member', 'administrator'].includes(now) || !['left', 'kicked', undefined].includes(was)) return;
  const me = BOT_USERNAME || 'ludomilliybot';
  await tgApi('sendMessage', {
    chat_id: chat.id, parse_mode: 'HTML',
    text: '🎲 <b>Сәлем, достар!</b>\n\n'
      + `Мен — @${esc(me)}, топта бірге Лудо ойнауға арналған ботпын!\n\n`
      + 'Ойынды бастау үшін:\n\n'
      + '🎮 /play — жаңа ойын ашу\n\n'
      + 'Достарыңды жинап, ойынға қосыл да, жеңіске жет! 🏆\n\n'
      + 'Көңілді ойын тілеймін! 🍀'
  });
}

async function handleUpdate(update) {
  if (update && update.my_chat_member) return onBotAdded(update.my_chat_member);
  const pq = update && update.pre_checkout_query;
  if (pq) {   // Stars төлемін растау: тек біздің тапсырыс, дұрыс сома, ойыншыда әлі жоқ скин
    const id = parsePay(pq.invoice_payload, pq.from && pq.from.id);
    const p = profiles.get(String(pq.from && pq.from.id));
    const ok = Boolean(id && pq.currency === 'XTR' && pq.total_amount === SK.byId[id].price && !(p && ownsSkin(p, id)));
    await tgApi('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: pq.id, ok: true } : { pre_checkout_query_id: pq.id, ok: false, error_message: 'Order is not available' });
    return;
  }
  if (update && update.callback_query) {
    const d = String(update.callback_query.data || '');
    if (d.startsWith('p:')) return lobbyCb(update.callback_query);
    return d.startsWith('l:') ? langCb(update.callback_query) : adminCb(update.callback_query);
  }
  const msg = update && update.message;
  const sp = msg && msg.successful_payment;
  if (sp) {
    const id = parsePay(sp.invoice_payload, msg.from && msg.from.id);
    if (id && sp.currency === 'XTR') grantSkin(String(msg.from.id), id, sp.telegram_payment_charge_id);
    return;
  }
  if (msg && msg.from && msg.chat && msg.chat.type === 'private') {
    const bu = touchBotUser(msg.from);
    const fid = String(msg.from.id);
    const acmd = typeof msg.text === 'string' ? (msg.text.match(/^\/(\w+)/) || [])[1] : '';
    if (isAdmin(fid)) {
      if (acmd === 'admin') { track(msg.chat.id, msg.message_id); await showMenu(msg.chat.id, fid); return; }
      if (acmd) { adminState.delete(fid); await cleanChat(msg.chat.id); }
      else { if (adminState.has(fid)) track(msg.chat.id, msg.message_id); if (await adminMsg(msg)) return; }
    }
    if (bu && bu.blocked && !isAdmin(fid)) return;   // блокталған: жауап берілмейді
  }
  if (!msg || typeof msg.text !== 'string') return;
  const cmd = (msg.text.match(/^\/(\w+)/) || [])[1];
  const tgLang = pickLang(msg.from && msg.from.language_code);   // мини аппқа берілетін тіл (Telegram тілі)
  const lang = botLangOf(msg.from);                              // боттың жеке чаттағы тілі
  if (cmd === 'help' || cmd === 'rules') {
    await tgApi('sendMessage', { chat_id: msg.chat.id, text: TXT[lang][cmd], parse_mode: 'HTML' });
    return;
  }
  if (cmd === 'language') {
    await tgApi('sendMessage', { chat_id: msg.chat.id, text: TXT[lang].langPrompt, reply_markup: langKb() });
    return;
  }
  if (cmd === 'play') {
    if (msg.chat.type === 'private') {
      await tgApi('sendMessage', { chat_id: msg.chat.id, text: 'Бұл команда топта жұмыс істейді. Ботты топқа қосып, /play жазыңыз.' });
      return;
    }
    return openLobby(msg.chat.id, msg.from);
  }
  if (cmd !== 'start') return;
  const param = (msg.text.split(/\s+/)[1] || '').trim();
  const room = /^room_[A-Za-z0-9]{4,8}$/.test(param) ? param.slice(5) : '';
  const ref = /^ref_\d{1,15}$/.test(param) ? param.slice(4) : '';
  if (ref && msg.from) creditRef(msg.from.id, ref, [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || msg.from.username, null);
  const url = MINI_APP_URL + '/?lang=' + tgLang + (room ? '&room=' + room : '') + (ref ? '&ref=' + ref : '');
  await tgApi('sendMessage', {
    chat_id: msg.chat.id, text: TXT[lang].start, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: TXT[lang].play, web_app: { url } }]].concat(BOT_USERNAME ? [[{ text: GROUP_BTN[lang] || GROUP_BTN.kk, url: `https://t.me/${BOT_USERNAME}?startgroup=true` }]] : []) }
  });
}

async function setupTelegram() {
  if (!BOT_TOKEN || DEV || process.env.SKIP_WEBHOOK === '1') return;
  try {
    const cmds = botCmds;
    await tgApi('setMyCommands', { commands: cmds('kk') });
    for (const code of ['uz', 'ru']) {
      await tgApi('setMyCommands', { commands: cmds(code), language_code: code });
    }
    await tgApi('setMyCommands', { commands: [{ command: 'play', description: '🎲 Ойын бастау' }], scope: { type: 'all_group_chats' } });
    const r = await tgApi('setWebhook', { url: WEBHOOK_URL, secret_token: WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query', 'callback_query', 'my_chat_member'] });
    console.log('Telegram webhook:', r.description);
  } catch (e) { console.error('Telegram баптау қатесі:', e && e.message); }
}

/* ================= Админ панель (/admin) ================= */

const MAIN_ADMIN = '8032280418';          // бас админ (өзгертуге және өшіруге болмайды)
let adminIds = [];                         // қосымша админдер
const stats = { games: 0 };                // барлық ойналған ойын саны
const adminState = new Map();              // adminId -> { step, ... }
let broadcasting = false;

const isMain = id => String(id) === MAIN_ADMIN;
const isAdmin = id => isMain(id) || adminIds.includes(String(id));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const realId = id => /^\d+$/.test(String(id));
const DAY_MS = 24 * 60 * 60 * 1000;

function saveCfg() {
  dbPut('cfg:admins', adminIds);
  dbPut('cfg:stats', stats);
}
async function loadCfg() {
  try {
    const m = await dbList('cfg:');
    const a = m.get('cfg:admins');
    if (Array.isArray(a)) adminIds = a.map(String);
    const s = m.get('cfg:stats');
    if (s && Number.isFinite(s.games)) stats.games = s.games;
  } catch (e) { console.error('cfg load:', e && e.message); }
}

const L10 = {
  blocked: { kk: '🚫 Сіз блокталдыңыз. Ботты пайдалану мүмкін емес.', uz: '🚫 Siz bloklandingiz. Botdan foydalana olmaysiz.', ru: '🚫 Вы заблокированы. Использование бота недоступно.' },
  unblocked: { kk: '✅ Блок алынды. Қайта ойнай аласыз.', uz: '✅ Blok olib tashlandi. Qayta o‘ynashingiz mumkin.', ru: '✅ Блокировка снята. Можно играть снова.' },
  vip: { kk: n => `👑 Сізге ${n} күнге VIP берілді!`, uz: n => `👑 Sizga ${n} kunlik VIP berildi!`, ru: n => `👑 Вам выдан VIP на ${n} дн.!` }
};
const langOf = p => (p && L10.blocked[p.lang] ? p.lang : 'kk');

function findUser(q) {
  q = String(q || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').trim();
  if (!q) return null;
  if (/^\d+$/.test(q)) return profiles.get(q) || null;
  q = q.toLowerCase();
  for (const p of profiles.values()) if (p.username && p.username === q) return p;
  return null;
}
const label = p => `<b>${esc(p.name || '—')}</b>${p.username ? ' @' + esc(p.username) : ''} (<code>${p.id}</code>)`;

// Ботқа жазған әр адамды профильге қосады (статистика үшін), username мен тілді сақтайды
function touchBotUser(from) {
  if (!from || !from.id) return null;
  const id = String(from.id), now = Date.now();
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Player';
  let p = profiles.get(id), changed = false;
  if (!p) { p = { id, name: name.slice(0, 40), avatar: null, seen: now, dnd: false, created: now }; profiles.set(id, p); changed = true; }
  const un = String(from.username || '').toLowerCase();
  if (un !== (p.username || '')) { p.username = un; changed = true; }
  const lg = String(from.language_code || '').slice(0, 2).toLowerCase();
  if (L10.blocked[lg] && p.lang !== lg) { p.lang = lg; changed = true; }
  if (changed) { playersBaseAt = 0; saveProfile(p); }
  return p;
}

function blockUser(p) {
  p.blocked = true;
  saveProfile(p);
  playersBaseAt = 0;
  const u = users.get(p.id);
  if (u) {
    try { unwatch(u); leaveQueue(u, true); leaveRoom(u, true); clearPInvitesOf(u.id); leaveGame(u); } catch (e) { /* ештеңе етпейді */ }
    send(u, { t: 'blocked' });
    try { if (u.ws) u.ws.close(); } catch (e) { /* жабылып қойған */ }
  }
  tgApi('sendMessage', { chat_id: p.id, text: L10.blocked[langOf(p)] }).catch(() => {});
}
function unblockUser(p) {
  delete p.blocked;
  saveProfile(p);
  playersBaseAt = 0;
  tgApi('sendMessage', { chat_id: p.id, text: L10.unblocked[langOf(p)] }).catch(() => {});
}
function giveVip(p, days) {
  p.vipUntil = Math.max(Date.now(), p.vipUntil || 0) + days * DAY_MS;
  p.refs = [];
  saveProfile(p);
  sendMe(p.id);
  tgApi('sendMessage', { chat_id: p.id, text: L10.vip[langOf(p)](days) }).catch(() => {});
}

async function storageLine() {
  if (!UP) return '💾 Сақтау: <b>Durable Object</b> (Upstash қосылмаған)';
  try {
    const out = await upCmd([['HLEN', 'ludo:p']]);
    return `💾 Сақтау: <b>Upstash Redis ✅</b>\n🗂 Redis-тегі профильдер: <b>${out[0].result}</b>` + (upPend.size ? ` (жазылуды күтуде: ${upPend.size})` : '');
  } catch (e) { return '💾 Сақтау: <b>Upstash ⚠️ қате</b>: ' + esc(e && e.message); }
}
async function statsText() {
  const now = Date.now();
  const startToday = Math.floor((now + 5 * 3600000) / DAY_MS) * DAY_MS - 5 * 3600000;   // UTC+5 бойынша «бүгін»
  let total = 0, today = 0, vip = 0, blocked = 0, online = 0;
  for (const p of profiles.values()) {
    if (!realId(p.id)) continue;
    total++;
    if (p.created && p.created >= startToday) today++;
    if (isVip(p)) vip++;
    if (p.blocked) blocked++;
  }
  for (const u of users.values()) if (isOnline(u) && realId(u.id)) online++;
  let live = 0;
  for (const g of games.values()) if (g.winner === null) live++;
  return '📊 <b>Статистика</b>\n\n'
    + `👥 Барлық пайдаланушылар: <b>${total}</b>\n`
    + `🆕 Бүгін қосылғандар: <b>${today}</b>\n`
    + `🟢 Қазір онлайн: <b>${online}</b>\n`
    + `👑 VIP: <b>${vip}</b>\n`
    + `🚫 Блокталғандар: <b>${blocked}</b>\n\n`
    + `🎮 Қазір жүріп жатқан ойындар: <b>${live}</b>\n`
    + `🏁 Барлығы ойналған ойындар: <b>${stats.games}</b>\n\n`
    + await storageLine();
}

const BACK = { inline_keyboard: [[{ text: '⬅️ Артқа', callback_data: 'a:menu' }]] };
const adminMenu = id => ({
  inline_keyboard: [
    [{ text: '📊 Статистика', callback_data: 'a:stats' }],
    [{ text: '🚫 Блоктау', callback_data: 'a:block' }, { text: '✅ Блоктан шығару', callback_data: 'a:unblock' }],
    [{ text: '👑 VIP беру', callback_data: 'a:vip' }],
    [{ text: '📢 Хабарлама жіберу', callback_data: 'a:bc' }]
  ].concat(isMain(id) ? [[{ text: '👮 Админдерді басқару', callback_data: 'a:admins' }]] : [])
});
// Админ чатындағы хабарламаларды есептеп тұрамыз (профильде сақталады), қажетсіз болғанда өшіреміз
function track(chat, mid) {
  const p = profiles.get(String(chat));
  if (!p || !mid) return;
  p.am = p.am || [];
  if (p.am.includes(mid)) return;
  p.am.push(mid);
  if (p.am.length > 40) p.am.shift();
  saveProfile(p);
}
// keep-тен басқа бәрін өшіреді (панель, сұрау, қателер, админ жазған хабарламалар)
async function cleanChat(chat, keep) {
  const p = profiles.get(String(chat));
  if (!p || !p.am || !p.am.length) return;
  const ids = p.am.filter(m => m !== keep);
  p.am = keep && p.am.includes(keep) ? [keep] : [];
  saveProfile(p);
  await Promise.all(ids.map(m => tgApi('deleteMessage', { chat_id: chat, message_id: m }).catch(() => {})));
}
// mid берілсе — сол хабарламаның өзін жаңартады (жаңа хабарлама жібермейді), болмаса жаңа хабарлама жібереді
const say = async (chat, text, kb, mid) => {
  if (mid) {
    const r = await tgApi('editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML', reply_markup: kb || undefined }).catch(() => null);
    if (r && (r.ok || /not modified/i.test(r.description || ''))) { track(chat, mid); return r; }
  }
  const r = await tgApi('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: kb || undefined });
  if (r && r.ok && r.result) track(chat, r.result.message_id);
  return r;
};
// Админ панель: ескі панель мен қалған хабарламалардың бәрі өшіріледі, тек бір ғана жаңа панель қалады
const showMenu = async (chat, id, mid, notice) => {
  adminState.delete(String(id));
  await cleanChat(chat, mid);
  return say(chat, (notice ? notice + '\n\n' : '') + '🛠 <b>Админ панель</b>\nБөлімді таңдаңыз:', adminMenu(id), mid);
};

async function adminsScreen(chat, mid, notice) {
  const list = adminIds.length ? adminIds.map(i => { const p = profiles.get(i); return '• ' + (p ? label(p) : `<code>${i}</code>`); }).join('\n') : 'Қосымша админ жоқ';
  await cleanChat(chat, mid);
  return say(chat, (notice ? notice + '\n\n' : '') + `👮 <b>Админдер</b>\n\n⭐ Бас админ: <code>${MAIN_ADMIN}</code>\n\n${list}`, {
    inline_keyboard: [[{ text: '➕ Админ қосу', callback_data: 'a:adm_add' }, { text: '➖ Админді өшіру', callback_data: 'a:adm_del' }], [{ text: '⬅️ Артқа', callback_data: 'a:menu' }]]
  }, mid);
}

async function adminCb(cb) {
  const from = String(cb.from && cb.from.id);
  const chat = cb.message && cb.message.chat && cb.message.chat.id;
  tgApi('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
  if (!chat || !isAdmin(from)) return;
  const d = String(cb.data || '');
  const mid = cb.message.message_id;
  track(chat, mid);
  const ask = (step, text) => { adminState.set(from, { step, panel: mid }); return say(chat, text, BACK, mid); };
  switch (d) {
    case 'a:menu': return showMenu(chat, from, mid);
    case 'a:stats': adminState.delete(from); return say(chat, await statsText(), BACK, mid);
    case 'a:block': return ask('block', '🚫 Блоктау\n\nПайдаланушының <b>ID</b> немесе <b>@username</b> жіберіңіз:');
    case 'a:unblock': return ask('unblock', '✅ Блоктан шығару\n\nПайдаланушының <b>ID</b> немесе <b>@username</b> жіберіңіз:');
    case 'a:vip': return ask('vip_user', '👑 VIP беру\n\nПайдаланушының <b>ID</b> немесе <b>@username</b> жіберіңіз:');
    case 'a:bc': return ask('bc_content', '📢 <b>Хабарлама жіберу</b>\n\nБарлық пайдаланушыларға жіберілетін хабарламаны жіберіңіз: мәтін, сілтеме немесе сурет (жазуымен).');
    case 'a:bc_go': {
      const st = adminState.get(from);
      if (!st || st.step !== 'bc_confirm') return;
      adminState.delete(from);
      if (broadcasting) return say(chat, '⏳ Басқа хабарлама жіберіліп жатыр, күте тұрыңыз.', BACK, mid);
      runBroadcast(chat, st.chat, st.mid);
      return;
    }
    case 'a:admins': if (!isMain(from)) return; adminState.delete(from); return adminsScreen(chat, mid);
    case 'a:adm_add': if (!isMain(from)) return; return ask('adm_add', '➕ Жаңа админнің Telegram <b>ID</b> нөмірін жіберіңіз:');
    case 'a:adm_del': if (!isMain(from)) return; return ask('adm_del', '➖ Өшірілетін админнің <b>ID</b> нөмірін жіберіңіз:');
  }
}

// Админнің қадамдық жауабын өңдейді. true қайтарса — хабарлама осында қолданылды.
async function adminMsg(msg) {
  const from = String(msg.from.id), chat = msg.chat.id;
  const st = adminState.get(from);
  if (!st) return false;
  const text = String(msg.text || '').trim();
  const panel = st.panel;
  // админ жазған хабарламаны бірден өшіреміз (тек таратылатын хабарлама қалады: copyMessage үшін керек)
  if (st.step !== 'bc_content') tgApi('deleteMessage', { chat_id: chat, message_id: msg.message_id }).catch(() => {});
  const err = async t => { await say(chat, t, BACK, panel); return true; };

  if (st.step === 'bc_content') {
    st.step = 'bc_confirm'; st.chat = chat; st.mid = msg.message_id;
    let n = 0;
    for (const p of profiles.values()) if (realId(p.id) && !p.blocked) n++;
    await say(chat, '👆 Хабарлама осылай көрінеді.');
    const pr = await tgApi('copyMessage', { chat_id: chat, from_chat_id: chat, message_id: msg.message_id });
    if (pr && pr.ok && pr.result) track(chat, pr.result.message_id);
    await say(chat, `Барлығы <b>${n}</b> пайдаланушыға жіберілсін бе?`, {
      inline_keyboard: [[{ text: '✅ Жіберу', callback_data: 'a:bc_go' }, { text: '❌ Бас тарту', callback_data: 'a:menu' }]]
    });
    return true;
  }
  if (st.step === 'adm_add' || st.step === 'adm_del') {
    if (!isMain(from)) { adminState.delete(from); return true; }
    if (!/^\d{4,15}$/.test(text)) return err('❗ ID тек сан болуы керек. Қайта жіберіңіз:');
    if (isMain(text)) return err('⭐ Бұл — бас админ, өзгертуге болмайды.');
    let note;
    if (st.step === 'adm_add') {
      if (!adminIds.includes(text)) adminIds.push(text);
      saveCfg();
      tgApi('sendMessage', { chat_id: text, text: '👮 Сізге админ құқығы берілді. Панельді ашу: /admin' }).catch(() => {});
      note = `✅ <code>${text}</code> админ болып қосылды.`;
    } else {
      if (!adminIds.includes(text)) return err('❗ Мұндай админ жоқ. Басқа ID жіберіңіз:');
      adminIds = adminIds.filter(i => i !== text);
      saveCfg();
      tgApi('sendMessage', { chat_id: text, text: 'ℹ️ Админ құқығыңыз алынды.' }).catch(() => {});
      note = `✅ <code>${text}</code> админдерден өшірілді.`;
    }
    adminState.delete(from);
    await adminsScreen(chat, panel, note);
    return true;
  }

  // қалған қадамдар: пайдаланушыны ID / @username арқылы іздейді
  if (st.step === 'block' || st.step === 'unblock' || st.step === 'vip_user') {
    const p = findUser(text);
    if (!p) return err('❗ Пайдаланушы табылмады (ол ботқа кемінде бір рет кірген болуы керек). ID немесе @username қайта жіберіңіз:');
    if (st.step === 'block') {
      if (isAdmin(p.id)) return err('❗ Админді блоктауға болмайды.');
      blockUser(p);
      await showMenu(chat, from, panel, `🚫 ${label(p)} блокталды.`);
    } else if (st.step === 'unblock') {
      unblockUser(p);
      await showMenu(chat, from, panel, `✅ ${label(p)} блоктан шығарылды.`);
    } else {
      adminState.set(from, { step: 'vip_days', uid: p.id, panel });
      await say(chat, `👑 ${label(p)}\n\nНеше күнге VIP берілсін? (санды жазыңыз, мысалы: 7)`, BACK, panel);
    }
    return true;
  }
  if (st.step === 'vip_days') {
    const n = Number(text);
    const p = profiles.get(st.uid);
    if (!Number.isInteger(n) || n < 1 || n > 3650) return err('❗ 1-ден 3650-ге дейінгі бүтін сан жазыңыз:');
    if (!p) { adminState.delete(from); return true; }
    giveVip(p, n);
    await showMenu(chat, from, panel, `✅ ${label(p)} пайдаланушысына <b>${n}</b> күнге VIP берілді.`);
    return true;
  }
  return false;
}

// Барлығына хабарлама: copyMessage — мәтін, сурет, сілтеме, форматтау бәрі сол күйінде барады
async function runBroadcast(adminChat, fromChat, mid) {
  broadcasting = true;
  const ids = [];
  for (const p of profiles.values()) if (realId(p.id) && !p.blocked) ids.push(p.id);
  let ok = 0, fail = 0;
  await say(adminChat, `📤 Жіберу басталды: ${ids.length} пайдаланушы…`);
  try {
    for (const id of ids) {
      try {
        let r = await tgApi('copyMessage', { chat_id: id, from_chat_id: fromChat, message_id: mid });
        if (r && !r.ok && r.error_code === 429) {
          await sleep(((r.parameters && r.parameters.retry_after) || 3) * 1000 + 200);
          r = await tgApi('copyMessage', { chat_id: id, from_chat_id: fromChat, message_id: mid });
        }
        if (r && r.ok) ok++; else fail++;
      } catch (e) { fail++; }
      await sleep(50);   // секундына ~20 хабарлама (Telegram шегінен төмен)
    }
  } finally { broadcasting = false; }
  await showMenu(adminChat, adminChat, null, `✅ Хабарлама жіберілді.\n\n📬 Жеткізілді: <b>${ok}</b>\n⚠️ Жеткізілмеді: <b>${fail}</b> (ботты бұғаттағандар т.б.)`);
}

/* ================= Топтағы /play: тіркеу және бастау =================
   Осы блокты server.js ішінде runBroadcast функциясынан кейін,
   `const server = http.createServer(...)` жолынан БҰРЫН қойыңыз. */

const LOBBY_TTL = 10 * 60 * 1000;                 // тіркеу 10 минут тұрады
const lobbies = new Map();                        // chatId -> { host, players:[{id,name}], mid, timer }
const COLOR_DOT = ['🔴', '🟢', '🟡', '🔵'];        // ludo.js ішіндегі түс реті (0,1,2,3). Керек болса ауыстырыңыз

const mention = p => `<a href="tg://user?id=${p.id}">${esc(p.name)}</a>`;
const nameOf = f => ([f.first_name, f.last_name].filter(Boolean).join(' ') || f.username || 'Player').slice(0, 40);
const gameLink = () => BOT_USERNAME
  ? `https://t.me/${BOT_USERNAME}${MINI_APP_SHORT ? '/' + MINI_APP_SHORT : ''}?startapp=play`
  : MINI_APP_URL;

function lobbyText(l) {
  const host = l.players.find(p => p.id === l.host) || l.players[0];
  return '🎲 <b>Тіркеу жүріп жатыр</b>\n\n'
    + l.players.map((p, i) => `${i + 1}. ${mention(p)}`).join('\n')
    + `\n\n👥 ${l.players.length}/${MAX_PLAYERS}`
    + `\n<i>${MAX_PLAYERS} ойыншы жиналса ойын өзі басталады. Бұрын бастау үшін ${mention(host)} «Бастау» батырмасын басады.</i>`;
}
const lobbyKb = () => ({ inline_keyboard: [[
  { text: '🎲 Қосылу', callback_data: 'p:j' },
  { text: '▶️ Бастау', callback_data: 'p:s' }
]] });

async function postLobby(chat, l) {
  const r = await tgApi('sendMessage', { chat_id: chat, text: lobbyText(l), parse_mode: 'HTML', reply_markup: lobbyKb() });
  if (r && r.ok && r.result) l.mid = r.result.message_id;
  else console.error('lobby send:', r && r.description);
  return r;
}

// /play — топта тіркеу ашады (тіркеу бар болса, оны чаттың төменіне қайта шығарады)
async function openLobby(chat, from) {
  const id = String(from.id);
  const bu = touchBotUser(from);
  if (bu && bu.blocked && !isAdmin(id)) return;
  if (activeGame(users.get(id))) {
    await tgApi('sendMessage', { chat_id: chat, text: `ℹ️ ${mention({ id, name: nameOf(from) })}, сіз қазір ойында тұрсыз.`, parse_mode: 'HTML' });
    return;
  }
  let l = lobbies.get(chat);
  if (l) {
    clearTimeout(l.timer);
    tgApi('deleteMessage', { chat_id: chat, message_id: l.mid }).catch(() => {});
  } else {
    l = { host: id, players: [{ id, name: nameOf(from) }], mid: 0, timer: null };
    lobbies.set(chat, l);
  }
  l.timer = setTimeout(() => expireLobby(chat, l), LOBBY_TTL);
  await postLobby(chat, l);
}

function expireLobby(chat, l) {
  if (lobbies.get(chat) !== l) return;
  lobbies.delete(chat);
  tgApi('editMessageText', { chat_id: chat, message_id: l.mid, text: '⌛ Тіркеу уақыты аяқталды. Қайта бастау: /play' }).catch(() => {});
}

async function launchLobby(chat) {
  const l = lobbies.get(chat);
  if (!l) return;
  lobbies.delete(chat);                                   // қайталап басылмауы үшін бірден өшіреміз
  clearTimeout(l.timer);
  tgApi('deleteMessage', { chat_id: chat, message_id: l.mid }).catch(() => {});   // алдыңғы хабарлама өшеді

  const list = [];
  for (const p of l.players) {
    let u = users.get(p.id);
    if (!u) { u = { id: p.id, game: null, ws: null, name: p.name, avatar: null, username: '' }; users.set(p.id, u); }
    else if (!u.name) u.name = p.name;
    if (activeGame(u)) continue;                          // басқа ойындағы адам қосылмайды
    list.push(u);
  }
  const g = startGame(list);
  if (!g) {
    await tgApi('sendMessage', { chat_id: chat, text: '⚠️ Ойын басталмады: ойыншы жеткіліксіз. Қайта бастау: /play' });
    return;
  }
  const lines = g.seats.map(s => `${COLOR_DOT[s.color] || '⚪'} ${mention({ id: s.uid, name: s.name })}`);
  await tgApi('sendMessage', {
    chat_id: chat, parse_mode: 'HTML',
    text: '🎮 <b>Ойын басталды!</b>\n\n' + lines.join('\n') + '\n\n👇 Ойынға кіріңіз!',
    reply_markup: { inline_keyboard: [[{ text: '🎲 Ойынға кіру', url: gameLink() }]] }
  });
}

async function lobbyCb(cb) {
  const chat = cb.message && cb.message.chat && cb.message.chat.id;
  const answer = (text, alert) => tgApi('answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: Boolean(alert) }).catch(() => {});
  const l = chat && lobbies.get(chat);
  if (!l || l.mid !== cb.message.message_id) return answer('Бұл тіркеу аяқталған', true);
  const from = cb.from, id = String(from.id);
  const bu = touchBotUser(from);
  if (bu && bu.blocked && !isAdmin(id)) return answer();

  if (cb.data === 'p:j') {
    if (l.players.some(p => p.id === id)) return answer('Сіз тіркелгенсіз ✅');
    if (activeGame(users.get(id))) return answer('Сіз қазір басқа ойында тұрсыз', true);
    if (l.players.length >= MAX_PLAYERS) return answer('Орын қалмады', true);
    l.players.push({ id, name: nameOf(from) });
    await answer('Қосылдыңыз ✅');
    if (l.players.length >= MAX_PLAYERS) return launchLobby(chat);   // 4 адам болса бірден басталады
    return tgApi('editMessageText', { chat_id: chat, message_id: l.mid, text: lobbyText(l), parse_mode: 'HTML', reply_markup: lobbyKb() }).catch(() => {});
  }
  if (cb.data === 'p:s') {
    if (id !== l.host) return answer('Ойынды тек тіркеуді ашқан адам бастай алады', true);
    if (l.players.length < 2) return answer('Кемінде 2 ойыншы керек', true);
    await answer();
    return launchLobby(chat);
  }
  return answer();
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
