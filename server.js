'use strict';
const http = require('./cf/http');
const crypto = require('crypto');
const { WebSocketServer } = require('./cf/ws');
const L = require('./lib/ludo');
const { verifyInitData } = require('./lib/telegram');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV = process.env.DEV === '1';
const BOT_USERNAME = (process.env.BOT_USERNAME || '').replace(/^@/, '');
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

const isOnline = u => Boolean(u && u.ws && u.ws.readyState === 1);
const pub = u => ({ id: u.id, name: u.name, avatar: u.avatar || null });
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
  if (!p) { p = { id: u.id, name: u.name, avatar: u.avatar || null, seen: now, dnd: false }; profiles.set(u.id, p); }
  p.name = u.name; p.avatar = u.avatar || null;
  if (seenNow) p.seen = now;
  if (changed || seenNow) { playersBaseAt = 0; saveProfile(p); }
  return p;
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
    startGame(take.map(id => users.get(id)));
    if (queue.length) { armQueue(); broadcastQueue(); }
  } else if (queue.length === 1) {
    armQueue();           // жалғыз қалса, іздеуді жалғастырамыз
    broadcastQueue();
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
    seats: g.seats.map(s => ({ color: s.color, id: s.uid, name: s.name, avatar: s.avatar, auto: s.auto, left: s.left })),
    tokens: g.tokens,
    turn: cur(g).color,
    phase: g.phase,
    dice: g.dice,
    rollSeq: g.rollSeq,
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

function startGame(list) {
  list = shuffle(list.filter(Boolean)).slice(0, MAX_PLAYERS);
  if (list.length < 2) return null;
  const colors = L.COLORS_FOR[list.length];
  const g = {
    id: 'g' + (++gameSeq),
    seats: list.map((u, i) => ({ uid: u.id, name: u.name, avatar: u.avatar || null, color: colors[i], auto: false, miss: 0, left: false })),
    tokens: L.newTokens(colors),
    turnIdx: 0, phase: 'roll', dice: null, legal: [], rollSeq: 0, sixes: 0,
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
  if (!seat.auto) { seat.miss++; if (seat.miss >= 3) seat.auto = true; }
  if (g.phase === 'roll') roll(g);
  else if (g.phase === 'move') moveToken(g, L.best(g.tokens, seat.color, g.dice, g.legal));
}

function roll(g) {
  const seat = cur(g);
  const d = 1 + Math.floor(Math.random() * 6);
  g.dice = d;
  g.rollSeq++;
  g.sixes = d === 6 ? g.sixes + 1 : 0;
  g.legal = g.sixes >= 3 ? [] : L.legal(g.tokens, seat.color, d);
  if (!g.legal.length) {                 // жүріс жоқ (немесе қатарынан үш алты): кезек ауысады
    g.phase = 'wait';
    setTimer(g, 1100, () => nextTurn(g));
  } else if (g.legal.length === 1) {     // жалғыз мүмкіндік: өзі жүреді
    g.phase = 'wait';
    const only = g.legal[0];
    setTimer(g, 800, () => moveToken(g, only));
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
  if (L.won(g.tokens, seat.color)) return finish(g, seat.color, 'win');
  if (r.extra) return beginTurn(g);      // 6 / жеу / финиш: тағы лақтырады
  nextTurn(g);
}

function nextTurn(g) {
  g.sixes = 0;
  for (let k = 0; k < g.seats.length; k++) {
    g.turnIdx = (g.turnIdx + 1) % g.seats.length;
    if (!cur(g).left) break;
  }
  beginTurn(g);
}

function finish(g, color, reason) {
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
  g.tokens[seat.color] = null;           // шыққан ойыншының фишкалары тақтадан алынады
  const alive = g.seats.filter(s => !s.left);
  if (alive.length <= 1) {
    if (alive.length === 1) return finish(g, alive[0].color, 'left');
    return destroyGame(g);
  }
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
  send(u, { t: 'hello', me: pub(u), bot: BOT_USERNAME, dnd: Boolean(prof.dnd) });
  const g = games.get(u.game);
  if (g) {
    const seat = seatOf(g, u.id);
    if (seat && !seat.left) { seat.auto = false; seat.miss = 0; }
    sendGame(u);
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
  const g = games.get(u.game);
  if (g) { const seat = seatOf(g, u.id); if (seat) seat.auto = true; }   // үзілсе, ойынды автомат жалғастырады
}

const wss = new WebSocketServer({ path: '/ws' });
wss.on('connection', ws => {
  ws.on('message', safe(d => {
    let m;
    try { m = JSON.parse(typeof d === 'string' ? d : String(d)); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
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
}), 20000);

/* ================= Telegram бот ================= */

const TXT = {
  kk: { start: '🎲 <b>Лудо</b>\nДостарыңмен немесе кездейсоқ ойыншылармен ойна!', play: '🎮 Ойнау', cmd: 'Ойынды ашу' },
  uz: { start: '🎲 <b>Ludo</b>\nDo‘stlaring yoki tasodifiy o‘yinchilar bilan o‘yna!', play: '🎮 O‘ynash', cmd: 'O‘yinni ochish' },
  ru: { start: '🎲 <b>Лудо</b>\nИграй с друзьями или случайными игроками!', play: '🎮 Играть', cmd: 'Открыть игру' }
};
const pickLang = c => { c = String(c || '').slice(0, 2).toLowerCase(); return TXT[c] ? c : 'kk'; };

async function tgApi(method, data) {
  const r = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/' + method, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data)
  });
  return r.json();
}

async function handleUpdate(update) {
  const msg = update && update.message;
  if (!msg || typeof msg.text !== 'string' || !msg.text.startsWith('/start')) return;
  const lang = pickLang(msg.from && msg.from.language_code);
  const param = (msg.text.split(/\s+/)[1] || '').trim();
  const room = /^room_[A-Za-z0-9]{4,8}$/.test(param) ? param.slice(5) : '';
  const url = MINI_APP_URL + '/?lang=' + lang + (room ? '&room=' + room : '');
  await tgApi('sendMessage', {
    chat_id: msg.chat.id, text: TXT[lang].start, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: TXT[lang].play, web_app: { url } }]] }
  });
}

async function setupTelegram() {
  if (!BOT_TOKEN || DEV || process.env.SKIP_WEBHOOK === '1') return;
  try {
    await tgApi('setMyCommands', { commands: [{ command: 'start', description: TXT.kk.cmd }] });
    for (const code of ['uz', 'ru']) {
      await tgApi('setMyCommands', { commands: [{ command: 'start', description: TXT[code].cmd }], language_code: code });
    }
    const r = await tgApi('setWebhook', { url: WEBHOOK_URL, secret_token: WEBHOOK_SECRET, allowed_updates: ['message'] });
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
