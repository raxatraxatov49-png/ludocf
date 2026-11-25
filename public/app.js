(() => {
'use strict';
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#0b0f1f'); tg.setBackgroundColor('#0b0f1f'); } catch (e) {} }
const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);

/* ---------- Тіл ---------- */
const I18N = {
  kk: { randomTitle: 'Кездейсоқ ойын', randomDesc: 'Қазір ойнағысы келетіндермен ойна (2–4 ойыншы)', play: 'ОЙНАУ',
    friendTitle: 'Доспен ойнау', friendDesc: 'Бөлме аш та, достарыңды шақыр', friendBtn: 'ДОСПЕН ОЙНАУ', connecting: 'Қосылуда…',
    waiting: 'Ойыншылар күтілуде', you: 'Сіз', invite: 'Шақыру', startGame: 'Ойынды бастау', cancel: 'Бас тарту',
    winner: 'Жеңімпаз', toMenu: 'Мәзірге', leaveAsk: 'Ойыннан шығасың ба?', leave: 'Шығу', stay: 'Қалу',
    hintRoll: 'Сенің кезегің — сүйекті бас', hintMove: 'Фишканы таңда', hintOther: 'жүріс жасауда…',
    inviteText: 'Менімен Лудо ойнайық! 🎲', room_gone: 'Бөлме табылмады', room_full: 'Бөлме толы', auth: 'Кіру қатесі',
    replaced: 'Басқа құрылғыда ашылды', noBot: 'Боттың username-і көрсетілмеген' },
  uz: { randomTitle: 'Tasodifiy o‘yin', randomDesc: 'Hozir o‘ynashni xohlovchilar bilan o‘yna (2–4 o‘yinchi)', play: 'O‘YNASH',
    friendTitle: 'Do‘st bilan o‘ynash', friendDesc: 'Xona och va do‘stlaringni taklif qil', friendBtn: 'DO‘ST BILAN O‘YNASH', connecting: 'Ulanmoqda…',
    waiting: 'O‘yinchilar kutilmoqda', you: 'Siz', invite: 'Taklif qilish', startGame: 'O‘yinni boshlash', cancel: 'Bekor qilish',
    winner: 'G‘olib', toMenu: 'Menyuga', leaveAsk: 'O‘yindan chiqasanmi?', leave: 'Chiqish', stay: 'Qolish',
    hintRoll: 'Navbating — kubikni bos', hintMove: 'Toshni tanla', hintOther: 'yurmoqda…',
    inviteText: 'Men bilan Ludo o‘ynaymiz! 🎲', room_gone: 'Xona topilmadi', room_full: 'Xona to‘la', auth: 'Kirish xatosi',
    replaced: 'Boshqa qurilmada ochildi', noBot: 'Bot username ko‘rsatilmagan' },
  ru: { randomTitle: 'Случайная игра', randomDesc: 'Играй с теми, кто ищет партию (2–4 игрока)', play: 'ИГРАТЬ',
    friendTitle: 'Играть с другом', friendDesc: 'Создай комнату и пригласи друзей', friendBtn: 'ИГРАТЬ С ДРУГОМ', connecting: 'Подключение…',
    waiting: 'Ожидание игроков', you: 'Вы', invite: 'Пригласить', startGame: 'Начать игру', cancel: 'Отмена',
    winner: 'Победитель', toMenu: 'В меню', leaveAsk: 'Выйти из игры?', leave: 'Выйти', stay: 'Остаться',
    hintRoll: 'Твой ход — брось кубик', hintMove: 'Выбери фишку', hintOther: 'ходит…',
    inviteText: 'Сыграем в Лудо! 🎲', room_gone: 'Комната не найдена', room_full: 'Комната заполнена', auth: 'Ошибка входа',
    replaced: 'Открыто на другом устройстве', noBot: 'Не указан username бота' }
};

const EXTRA = {
  kk: { playersTitle: 'Ойыншылар', playersDesc: 'Барлық ойыншылар: онлайн және офлайн', playersBtn: 'ОЙЫНШЫЛАР',
    stOnline: 'онлайн', stGame: 'ойында', stOffline: 'офлайн', ago: 'бұрын', unitM: 'мин', unitH: 'сағ', unitD: 'күн',
    plInvite: 'Шақыру', plSent: 'Күтілуде…', plWatch: 'Көру',
    dndHint: 'Ай белгісі: «Мазаламаңыз» режимі. Қосылғанда сізді ешкім шақыра алмайды.',
    dndNote: 'Мазаламаңыз қосулы. Сіз онлайн көрінесіз, бірақ ешкім сізді шақыра алмайды.',
    invText: 'сені Лудо ойнауға шақырады', accept: 'Қабылдау', decline: 'Бас тарту',
    watching: 'Сіз ойынды қарап отырсыз',
    pinvite_dnd: 'Бұл ойыншыда «Мазаламаңыз» қосулы', pinvite_offline: 'Ойыншы офлайн', pinvite_busy: 'Ойыншы қазір ойында',
    pinvite_cool: 'Қайта шақыруға болады:', pinvite_invalid: 'Қате', busy: 'Сіз ойындасыз', watch_unavailable: 'Ойынды қарауға болмайды',
    invDeclined: 'Шақыру қабылданбады', invDeclinedCool: 'Шақыру қабылданбады. Қайта шақыру 2 минуттан кейін',
    invExpired: 'Шақыру уақыты бітті', invUnavailable: 'Ойыншы қолжетімсіз' },
  uz: { playersTitle: 'O‘yinchilar', playersDesc: 'Barcha o‘yinchilar: onlayn va oflayn', playersBtn: 'O‘YINCHILAR',
    stOnline: 'onlayn', stGame: 'o‘yinda', stOffline: 'oflayn', ago: 'oldin', unitM: 'daq', unitH: 'soat', unitD: 'kun',
    plInvite: 'Taklif', plSent: 'Kutilmoqda…', plWatch: 'Ko‘rish',
    dndHint: 'Oy belgisi: «Bezovta qilmang» rejimi. Yoqilganda sizni hech kim taklif qila olmaydi.',
    dndNote: '«Bezovta qilmang» yoqilgan. Siz onlayn ko‘rinasiz, lekin hech kim sizni taklif qila olmaydi.',
    invText: 'seni Ludo o‘ynashga taklif qilmoqda', accept: 'Qabul qilish', decline: 'Rad etish',
    watching: 'Siz o‘yinni tomosha qilyapsiz',
    pinvite_dnd: 'Bu o‘yinchida «Bezovta qilmang» yoqilgan', pinvite_offline: 'O‘yinchi oflayn', pinvite_busy: 'O‘yinchi hozir o‘yinda',
    pinvite_cool: 'Qayta taklif qilish mumkin:', pinvite_invalid: 'Xato', busy: 'Siz o‘yindasiz', watch_unavailable: 'O‘yinni ko‘rib bo‘lmaydi',
    invDeclined: 'Taklif rad etildi', invDeclinedCool: 'Taklif rad etildi. Qayta taklif 2 daqiqadan keyin',
    invExpired: 'Taklif muddati tugadi', invUnavailable: 'O‘yinchi mavjud emas' },
  ru: { playersTitle: 'Игроки', playersDesc: 'Все игроки: онлайн и офлайн', playersBtn: 'ИГРОКИ',
    stOnline: 'онлайн', stGame: 'в игре', stOffline: 'офлайн', ago: 'назад', unitM: 'мин', unitH: 'ч', unitD: 'дн',
    plInvite: 'Позвать', plSent: 'Ожидание…', plWatch: 'Смотреть',
    dndHint: 'Значок луны: режим «Не беспокоить». Когда он включён, вас никто не может пригласить.',
    dndNote: '«Не беспокоить» включён. Вы видны онлайн, но пригласить вас никто не может.',
    invText: 'приглашает тебя сыграть в Лудо', accept: 'Принять', decline: 'Отклонить',
    watching: 'Вы наблюдаете за игрой',
    pinvite_dnd: 'У игрока включён режим «Не беспокоить»', pinvite_offline: 'Игрок офлайн', pinvite_busy: 'Игрок сейчас в игре',
    pinvite_cool: 'Повторно пригласить можно через', pinvite_invalid: 'Ошибка', busy: 'Вы в игре', watch_unavailable: 'Игру нельзя смотреть',
    invDeclined: 'Приглашение отклонено', invDeclinedCool: 'Отклонено. Повторно — через 2 минуты',
    invExpired: 'Время приглашения истекло', invUnavailable: 'Игрок недоступен' }
};
Object.keys(EXTRA).forEach(l => Object.assign(I18N[l], EXTRA[l]));
const pickLang = c => { c = String(c || '').slice(0, 2).toLowerCase(); return I18N[c] ? c : null; };
let lang = pickLang(localStorage.getItem('ludo_lang')) || pickLang(qs.get('lang')) ||
  pickLang(tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) || 'kk';
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.kk[k] || k;
function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('#langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
}

/* ---------- Күй ---------- */
const S = { players: null, playersAt: 0, dnd: false, inv: null, ws: null, me: null, bot: '', room: null, queue: null, queueEnd: 0, game: null, gameEnd: 0, rollSeq: -1, lastTurnMine: false, noReconnect: false };
let pendingRoom = (qs.get('room') || '').toUpperCase();
try {
  const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
  if (sp && /^room_/i.test(sp)) pendingRoom = sp.slice(5).toUpperCase();
} catch (e) {}

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  S.screen = id;
}
function toast(text) {
  const el = $('toast'); el.textContent = text; el.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 2600);
}
const send = o => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); };
function haptic(kind) { try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(kind); } catch (e) {} }

/* ---------- Тақта геометриясы ---------- */
const C = ['#d94f3d', '#43a05c', '#eab544', '#4382de'];           // қызыл, жасыл, сары, көк
const START = [0, 13, 26, 39];
const SAFE_STARS = [8, 21, 34, 47];
const RING = [];
(function () {
  const seg = (x0, y0, x1, y1) => {
    const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    for (;;) { RING.push([x, y]); if (x === x1 && y === y1) break; x += dx; y += dy; }
  };
  seg(1, 6, 5, 6); seg(6, 5, 6, 0); seg(7, 0, 7, 0); seg(8, 0, 8, 5); seg(9, 6, 14, 6); seg(14, 7, 14, 7);
  seg(14, 8, 9, 8); seg(8, 9, 8, 14); seg(7, 14, 7, 14); seg(6, 14, 6, 9); seg(5, 8, 0, 8); seg(0, 7, 0, 7); seg(0, 6, 0, 6);
})();
const rot = (p, k) => { let x = p[0], y = p[1]; for (let i = 0; i < k; i++) { const nx = 15 - y; y = x; x = nx; } return [x, y]; };
const BASE0 = [[2, 2], [4, 2], [2, 4], [4, 4]];
const COL0 = [1, 2, 3, 4, 5].map(c => [c + 0.5, 7.5]);
const FIN_OFF = [[-0.2, -0.22], [0.2, -0.22], [-0.2, 0.22], [0.2, 0.22]];

function tokenPos(c, s, i) {
  if (s === -1) return rot(BASE0[i], c);
  if (s <= 50) { const r = RING[(START[c] + s) % 52]; return [r[0] + 0.5, r[1] + 0.5]; }
  if (s <= 55) return rot(COL0[s - 51], c);
  const p = rot([6.6, 7.5], c);
  return [p[0] + FIN_OFF[i][0], p[1] + FIN_OFF[i][1]];
}

function buildBoard() {
  let h = '<rect width="15" height="15" fill="#fff"/>';
  [[0, 0], [9, 0], [9, 9], [0, 9]].forEach(([x, y], c) => {
    h += `<rect x="${x}" y="${y}" width="6" height="6" fill="${C[c]}"/><rect x="${x + 1}" y="${y + 1}" width="4" height="4" rx=".3" fill="#fff"/>`;
    BASE0.forEach(p => { const q = rot(p, c); h += `<circle cx="${q[0]}" cy="${q[1]}" r=".42" fill="${C[c]}" fill-opacity=".18" stroke="${C[c]}" stroke-width=".07"/>`; });
  });
  RING.forEach(([x, y]) => { h += `<rect x="${x}" y="${y}" width="1" height="1" fill="#fff" stroke="#cdd2de" stroke-width=".04"/>`; });
  for (let c = 0; c < 4; c++) {
    const [sx, sy] = RING[START[c]];
    h += `<rect x="${sx}" y="${sy}" width="1" height="1" fill="${C[c]}" stroke="#cdd2de" stroke-width=".04"/>`;
    COL0.forEach(p => { const q = rot(p, c); h += `<rect x="${q[0] - 0.5}" y="${q[1] - 0.5}" width="1" height="1" fill="${C[c]}" stroke="#fff" stroke-width=".04"/>`; });
  }
  SAFE_STARS.forEach(i => { const [x, y] = RING[i]; h += `<text x="${x + 0.5}" y="${y + 0.78}" font-size=".8" text-anchor="middle" fill="#aab0c0">☆</text>`; });
  [[0, 7, '→', 0], [7, 0, '↓', 1], [14, 7, '←', 2], [7, 14, '↑', 3]].forEach(([x, y, a, c]) => {
    h += `<text x="${x + 0.5}" y="${y + 0.75}" font-size=".8" text-anchor="middle" font-weight="700" fill="${C[c]}">${a}</text>`;
  });
  h += `<polygon points="6,6 6,9 7.5,7.5" fill="${C[0]}"/><polygon points="6,6 9,6 7.5,7.5" fill="${C[1]}"/>` +
       `<polygon points="9,6 9,9 7.5,7.5" fill="${C[2]}"/><polygon points="6,9 9,9 7.5,7.5" fill="${C[3]}"/>`;
  h += '<g id="toks"></g>';
  $('board').innerHTML = h;
}

/* ---------- Фишкалар ---------- */
const tokEls = {};
const SVGNS = 'http://www.w3.org/2000/svg';
function tokEl(key, c) {
  if (tokEls[key]) return tokEls[key];
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'tok');
  g.innerHTML = `<circle cy="-.1" r=".6" fill="transparent"/>` +
    `<path d="M0 .4C-.2 .1 -.36 -.08 -.36 -.26A.36 .36 0 1 1 .36 -.26C.36 -.08 .2 .1 0 .4Z" fill="${C[c]}" stroke="#fff" stroke-width=".07"/>` +
    `<circle cy="-.26" r=".13" fill="#fff"/>`;
  $('toks').appendChild(g);
  tokEls[key] = g;
  return g;
}

function renderTokens(g) {
  const mine = g.seats.find(s => s.id === S.me.id);
  const canPick = mine && g.turn === mine.color && g.phase === 'move';
  const items = [];
  for (let c = 0; c < 4; c++) {
    const arr = g.tokens[c];
    for (let i = 0; i < 4; i++) {
      const key = c + '-' + i;
      if (!arr) { if (tokEls[key]) { tokEls[key].remove(); delete tokEls[key]; } continue; }
      items.push({ key, c, i, s: arr[i], p: tokenPos(c, arr[i], i) });
    }
  }
  const groups = {};
  items.forEach(it => { if (it.s >= 0 && it.s < 56) (groups[it.p[0] + ',' + it.p[1]] = groups[it.p[0] + ',' + it.p[1]] || []).push(it); });
  items.forEach(it => {
    let [x, y] = it.p, sc = it.s === 56 ? 0.55 : 1;
    const grp = it.s >= 0 && it.s < 56 ? groups[x + ',' + y] : null;
    if (grp && grp.length > 1) { x += (grp.indexOf(it) - (grp.length - 1) / 2) * 0.24; sc = 0.78; }
    const el = tokEl(it.key, it.c);
    el.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
    const can = canPick && it.c === mine.color && g.legal.includes(it.i);
    el.classList.toggle('can', Boolean(can));
    el.onclick = can ? () => send({ t: 'move', i: it.i }) : null;
  });
  // таңдалатын фишкалар үстіне шығады
  Object.values(tokEls).forEach(el => { if (el.classList.contains('can')) $('toks').appendChild(el); });
}

/* ---------- Ойын экраны ---------- */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function setAva(el, p) {
  if (p && p.avatar) { el.style.backgroundImage = `url("${p.avatar}")`; el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.textContent = ((p && p.name) || '?').trim().charAt(0).toUpperCase(); }
}

function renderGame(g) {
  S.game = g;
  S.gameEnd = Date.now() + g.ms;
  const mine = g.seats.find(s => s.id === S.me.id);
  const myTurn = Boolean(mine && g.turn === mine.color);

  for (let c = 0; c < 4; c++) {
    const el = $('card' + c);
    const seat = g.seats.find(s => s.color === c && !s.left);
    el.style.setProperty('--c', C[c]);
    el.classList.toggle('off', !seat);
    el.classList.toggle('act', Boolean(seat) && g.turn === c && g.winner === null);
    if (!seat) { el.innerHTML = ''; continue; }
    const done = (g.tokens[c] || []).filter(s => s === 56).length;
    el.innerHTML = '<div class="ava"></div><div class="nm"><b></b><div class="pips">' +
      [0, 1, 2, 3].map(i => `<i class="${i < done ? 'on' : ''}"></i>`).join('') + '</div></div><span class="tm"></span>';
    setAva(el.querySelector('.ava'), seat);
    el.querySelector('b').textContent = seat.id === S.me.id ? t('you') : seat.name;
  }

  const dice = $('dice');
  if (g.dice) {
    dice.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    (PIPS[g.dice] || []).forEach(k => dice.children[k].classList.add('on'));
  } else dice.innerHTML = '';
  dice.style.borderColor = g.phase === 'roll' && myTurn ? '#fff' : C[g.turn];
  dice.classList.toggle('ready', myTurn && g.phase === 'roll' && g.winner === null);
  if (g.rollSeq !== S.rollSeq) {
    if (S.rollSeq !== -1 || g.dice) { dice.classList.remove('rolling'); void dice.offsetWidth; dice.classList.add('rolling'); }
    S.rollSeq = g.rollSeq;
  }

  renderTokens(g);

  const turnSeat = g.seats.find(s => s.color === g.turn);
  $('hint').textContent = g.winner !== null ? '' :
    g.spectator ? '👁 ' + t('watching') + (g.viewers > 1 ? ' · ' + g.viewers : '') :
    myTurn && g.phase === 'roll' ? t('hintRoll') :
    myTurn && g.phase === 'move' ? t('hintMove') :
    myTurn ? '' : (turnSeat ? turnSeat.name + ' ' + t('hintOther') : '');
  if (myTurn && !S.lastTurnMine) haptic('success');
  S.lastTurnMine = myTurn;

  if (g.winner !== null) {
    const w = g.seats.find(s => s.color === g.winner);
    $('oName').textContent = w ? (w.id === S.me.id ? t('you') : w.name) : '';
    $('oName').style.color = C[g.winner];
    $('over').classList.remove('hidden');
  } else $('over').classList.add('hidden');
}

/* ---------- Күту экраны ---------- */
function renderWait() {
  const room = S.room, q = S.queue;
  const list = room ? room.members : (q ? q.players : []);
  const isHost = Boolean(room && room.host === S.me.id);
  $('wTitle').textContent = t('waiting');
  $('wCount').textContent = list.length + '/4';
  let h = '';
  for (let i = 0; i < 4; i++) {
    const p = list[i];
    if (p) h += `<div class="slot ${p.id === S.me.id ? 'me' : ''}"><div class="ava" data-i="${i}"></div><div class="nm"><b></b>${p.id === S.me.id ? '<small>' + t('you') + '</small>' : ''}</div></div>`;
    else h += '<div class="slot empty"><span class="dots"><i></i><i></i><i></i></span></div>';
  }
  $('slots').innerHTML = h;
  [...$('slots').querySelectorAll('.slot:not(.empty)')].forEach((el, i) => {
    setAva(el.querySelector('.ava'), list[i]);
    el.querySelector('b').textContent = list[i].name;
  });
  $('btnInvite').classList.toggle('hidden', !room);                         // шақыру: бөлмедегі барлығына
  $('btnStart').classList.toggle('hidden', !(isHost && list.length >= 2));   // бастау: тек жаратушыға, ≥2 адамда
  $('btnCancel').classList.toggle('hidden', !q || Boolean(room));            // кездейсоқ іздеуде ғана
  $('wTimer').style.display = room ? 'none' : '';
  tick();
}

function tick() {
  tickExtra();
  if (S.screen === 'wait' && S.queue && !S.room) {
    const left = Math.max(0, Math.ceil((S.queueEnd - Date.now()) / 1000));
    $('wTimer').textContent = '0:' + String(left).padStart(2, '0');
  }
  if (S.screen === 'game' && S.game && S.game.winner === null) {
    const left = Math.max(0, Math.ceil((S.gameEnd - Date.now()) / 1000));
    document.querySelectorAll('.pcard .tm').forEach(el => { el.textContent = ''; });
    const act = document.querySelector('.pcard.act .tm');
    if (act && (S.game.phase === 'roll' || S.game.phase === 'move')) act.textContent = left + 's';
  }
}
setInterval(tick, 250);


/* ---------- Ойыншылар ---------- */
const fmtSec = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const reqPlayers = () => send({ t: 'players_get' });
function ago(ms) {
  if (!ms) return '';
  const m = Math.floor(Math.max(0, Date.now() - ms) / 60000);
  if (m < 1) return '';
  if (m < 60) return m + ' ' + t('unitM') + ' ' + t('ago');
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ' + t('unitH') + ' ' + t('ago');
  return Math.floor(h / 24) + ' ' + t('unitD') + ' ' + t('ago');
}

function renderPlayers() {
  const m = S.players;
  $('btnDnd').setAttribute('aria-checked', String(S.dnd));
  $('dndNote').classList.toggle('hidden', !S.dnd);
  $('dndHint').classList.toggle('hidden', S.dnd);
  if (!m) return;
  $('plCount').textContent = t('stOnline') + ': ' + m.onlineCount + ' / ' + m.total;
  const box = $('plList');
  box.innerHTML = '';
  m.list.forEach(p => {
    const row = document.createElement('div');
    row.className = 'pl' + (p.status === 'offline' ? ' off' : '');
    const ava = document.createElement('div'); ava.className = 'ava'; setAva(ava, p);
    const dot = document.createElement('i'); dot.className = 'dot ' + p.status; ava.appendChild(dot);
    const nm = document.createElement('div'); nm.className = 'nm';
    const b = document.createElement('b'); b.textContent = p.name + (p.dnd ? ' 🌙' : '');
    const sm = document.createElement('small');
    sm.textContent = p.status === 'online' ? t('stOnline') : p.status === 'game' ? t('stGame') :
      t('stOffline') + (ago(p.seen) ? ' · ' + ago(p.seen) : '');
    nm.appendChild(b); nm.appendChild(sm);
    row.appendChild(ava); row.appendChild(nm);
    let btn = null;
    if (p.status === 'online') {
      btn = document.createElement('button'); btn.className = 'pb';
      const coolLeft = p.cool ? Math.ceil((S.playersAt + p.cool * 1000 - Date.now()) / 1000) : 0;
      if (coolLeft > 0) { btn.disabled = true; btn.dataset.until = String(S.playersAt + p.cool * 1000); btn.textContent = fmtSec(coolLeft); }
      else if (p.sent) {
        btn.className = 'pb wait'; btn.textContent = t('plSent');
        btn.onclick = () => { p.sent = false; send({ t: 'pinvite_cancel', to: p.id }); renderPlayers(); };
      } else {
        btn.textContent = t('plInvite');
        btn.onclick = () => { p.sent = true; send({ t: 'pinvite_send', to: p.id }); renderPlayers(); };
      }
    } else if (p.status === 'game' && p.watch) {
      btn = document.createElement('button'); btn.className = 'pb watch'; btn.textContent = '👁 ' + t('plWatch');
      btn.onclick = () => send({ t: 'watch_start', id: p.id });
    }
    if (btn) row.appendChild(btn);
    box.appendChild(row);
  });
}

function showInv(m) {
  S.inv = { from: m.from.id, end: Date.now() + m.ttl * 1000 };
  setAva($('invAva'), m.from);
  $('invName').textContent = m.from.name;
  $('inv').classList.remove('hidden');
  haptic('warning');
  tickExtra();
}
function hideInv() { S.inv = null; $('inv').classList.add('hidden'); }

function tickExtra() {
  if (S.inv) {
    const left = Math.ceil((S.inv.end - Date.now()) / 1000);
    if (left <= 0) hideInv(); else $('invTm').textContent = '0:' + String(left).padStart(2, '0');
  }
  if (S.screen === 'players') {
    document.querySelectorAll('#plList .pb[data-until]').forEach(el => {
      const left = Math.ceil((Number(el.dataset.until) - Date.now()) / 1000);
      if (left <= 0) { reqPlayers(); el.removeAttribute('data-until'); el.disabled = false; el.textContent = t('plInvite'); }
      else el.textContent = fmtSec(left);
    });
  }
}
setInterval(() => { if (S.screen === 'players') reqPlayers(); }, 4000);
setInterval(() => { if (S.screen === 'menu') reqPlayers(); }, 6000);

function leaveWatch() {
  $('over').classList.add('hidden');
  send({ t: 'watch_stop' });
  S.game = null;
  show('menu');
}

/* ---------- Мәзір ---------- */
function renderMenu() {
  if (!S.me) return;
  setAva($('meAva'), S.me);
  $('meName').textContent = S.me.name;
}

function inviteLink() { return `https://t.me/${S.bot}?startapp=room_${S.room.code}`; }
function invite() {
  if (!S.room) return;
  if (!S.bot || S.bot === 'YOUR_BOT_USERNAME') return toast(t('noBot'));
  const url = 'https://t.me/share/url?url=' + encodeURIComponent(inviteLink()) + '&text=' + encodeURIComponent(t('inviteText'));
  if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
}

/* ---------- Байланыс ---------- */
function connect() {
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  S.ws = ws;
  ws.onopen = () => {
    $('conn').classList.add('hidden');
    const dev = qs.get('dev');
    send({ t: 'auth', initData: (tg && tg.initData) || '', dev: dev ? { id: dev, name: dev } : undefined });
  };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
  ws.onclose = () => {
    if (S.ws !== ws) return;
    $('conn').classList.remove('hidden');
    if (!S.noReconnect) setTimeout(connect, 1500);
  };
}
setInterval(() => send({ t: 'ping' }), 25000);

function onMsg(m) {
  switch (m.t) {
    case 'hello':
      S.me = m.me; S.bot = m.bot || ''; S.dnd = Boolean(m.dnd);
      reqPlayers();
      renderMenu();
      if (S.screen !== 'game') { S.room = null; S.queue = null; show('menu'); }
      if (pendingRoom) { send({ t: 'room_join', code: pendingRoom }); pendingRoom = ''; }
      break;
    case 'searching':
      S.queue = m; S.room = null; S.queueEnd = Date.now() + m.ms;
      show('wait'); renderWait();
      break;
    case 'room':
      S.room = m; S.queue = null;
      show('wait'); renderWait();
      break;
    case 'game':
      S.room = null; S.queue = null;
      if (S.screen !== 'game') { S.rollSeq = -1; S.lastTurnMine = false; Object.keys(tokEls).forEach(k => { tokEls[k].remove(); delete tokEls[k]; }); }
      show('game'); renderGame(m);
      break;
    case 'idle':
      S.room = null; S.queue = null; S.game = null;
      $('over').classList.add('hidden');
      if (S.screen !== 'players') show('menu');
      break;
    case 'players':
      S.players = m; S.playersAt = Date.now(); S.dnd = m.dnd;
      $('plOnlineBadge').textContent = m.onlineCount ? '● ' + m.onlineCount : '';
      if (S.screen === 'players') renderPlayers();
      break;
    case 'dnd':
      S.dnd = m.on; if (S.screen === 'players') renderPlayers();
      break;
    case 'pinvite_sent': {
      const p = S.players && S.players.list.find(x => x.id === m.to);
      if (p) { p.sent = true; if (S.screen === 'players') renderPlayers(); }
      break;
    }
    case 'pinvite_in':
      showInv(m);
      break;
    case 'pinvite_end': {
      if (m.from) { if (S.inv && S.inv.from === m.from) hideInv(); }
      else if (m.to) {
        const key = { declined: m.cool ? 'invDeclinedCool' : 'invDeclined', expired: 'invExpired', unavailable: 'invUnavailable' }[m.reason];
        if (key) toast(t(key));
      }
      if (S.screen === 'players') reqPlayers();
      break;
    }
    case 'error':
      if (m.code === 'replaced') S.noReconnect = true;
      toast(m.code === 'pinvite_cool' ? t('pinvite_cool') + ' ' + fmtSec(m.left || 0) : t(m.code));
      if (S.screen === 'players') reqPlayers();
      break;
    case 'replaced':
      S.noReconnect = true; toast(t('replaced'));
      break;
  }
}

/* ---------- Түймелер ---------- */
$('btnPlayers').onclick = () => { show('players'); renderPlayers(); reqPlayers(); };
$('plBack').onclick = () => show('menu');
$('btnDnd').onclick = () => { S.dnd = !S.dnd; renderPlayers(); send({ t: 'dnd_set', on: S.dnd }); };
$('invYes').onclick = () => { if (S.inv) send({ t: 'pinvite_answer', from: S.inv.from, accept: true }); hideInv(); };
$('invNo').onclick = () => { if (S.inv) send({ t: 'pinvite_answer', from: S.inv.from, accept: false }); hideInv(); };
$('btnRandom').onclick = () => send({ t: 'find' });
$('btnFriend').onclick = () => send({ t: 'room_create' });
$('btnInvite').onclick = invite;
$('btnStart').onclick = () => send({ t: 'room_start' });
$('btnCancel').onclick = () => { send({ t: 'cancel' }); show('menu'); };
$('btnWaitBack').onclick = () => { send({ t: S.room ? 'room_leave' : 'cancel' }); S.room = null; S.queue = null; show('menu'); };
$('dice').onclick = () => { if ($('dice').classList.contains('ready')) send({ t: 'roll' }); };
$('btnGameBack').onclick = () => {
  if (S.game && S.game.spectator) return leaveWatch();
  if (S.game && S.game.winner !== null) return $('btnOver').click();
  $('ask').classList.remove('hidden');
};
$('askNo').onclick = () => $('ask').classList.add('hidden');
$('askYes').onclick = () => { $('ask').classList.add('hidden'); send({ t: 'leave' }); S.game = null; show('menu'); };
$('btnOver').onclick = () => { if (S.game && S.game.spectator) return leaveWatch(); $('over').classList.add('hidden'); send({ t: 'leave' }); S.game = null; show('menu'); };
document.querySelectorAll('#langs button').forEach(b => {
  b.onclick = () => {
    lang = b.dataset.lang; localStorage.setItem('ludo_lang', lang); applyI18n();
    if (S.screen === 'wait') renderWait();
    if (S.screen === 'players') renderPlayers();
    if (S.screen === 'game' && S.game) renderGame(S.game);
  };
});

buildBoard();
applyI18n();
show('menu');
$('conn').classList.remove('hidden');
connect();
})();
