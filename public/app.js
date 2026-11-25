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
const EXTRA2 = {
  kk: { no_players: 'Ойыншы табылмады', chatTitle: 'Чат', chatPh: 'Хабарлама жаз…' },
  uz: { no_players: 'O‘yinchi topilmadi', chatTitle: 'Chat', chatPh: 'Xabar yozing…' },
  ru: { no_players: 'Игрок не найден', chatTitle: 'Чат', chatPh: 'Напишите сообщение…' }
};
Object.keys(EXTRA2).forEach(l => Object.assign(I18N[l], EXTRA2[l]));
const pickLang = c => { c = String(c || '').slice(0, 2).toLowerCase(); return I18N[c] ? c : null; };
let lang = pickLang(localStorage.getItem('ludo_lang')) || pickLang(qs.get('lang')) ||
  pickLang(tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) || 'kk';
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.kk[k] || k;
function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('#langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
}

/* ---------- Күй ---------- */
const S = { players: null, playersAt: 0, dnd: false, inv: null, ws: null, me: null, bot: '', room: null, queue: null, queueEnd: 0, game: null, gameEnd: 0, rollSeq: -1, lastTurnMine: false, noReconnect: false, dieBusy: {}, moveSeq: null, animating: false, latest: null, chat: [], unread: 0, app: '' };
function readStartParam() {
  try { const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param; if (sp) return String(sp); } catch (e) {}
  try { const h = new URLSearchParams(location.hash.replace(/^#/, '')); return h.get('tgWebAppStartParam') || qs.get('tgWebAppStartParam') || ''; } catch (e) { return ''; }
}
let pendingRoom = (qs.get('room') || '').toUpperCase();
{ const sp = readStartParam(); if (/^room_/i.test(sp)) pendingRoom = sp.slice(5).toUpperCase(); }

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
const C  = ['#e23b2e', '#1fa653', '#f4b400', '#2477ea'];   // қызыл, жасыл, сары, көк
const CL = ['#ff9a8a', '#7ceaa5', '#ffe58a', '#9ccaff'];   // ашық реңк
const CD = ['#8a1208', '#0a5a2c', '#9a6a00', '#0c3a8c'];   // қою реңк
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
const ZONES = [[0, 0], [9, 0], [9, 9], [0, 9]];

function tokenPos(c, s, i) {
  if (s === -1) return rot(BASE0[i], c);
  if (s <= 50) { const r = RING[(START[c] + s) % 52]; return [r[0] + 0.5, r[1] + 0.5]; }
  if (s <= 55) return rot(COL0[s - 51], c);
  const p = rot([6.6, 7.5], c);
  return [p[0] + FIN_OFF[i][0], p[1] + FIN_OFF[i][1]];
}

const starPts = (cx, cy, R, r) => {
  const p = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, d = k % 2 ? r : R; p.push((cx + Math.cos(a) * d).toFixed(3) + ',' + (cy + Math.sin(a) * d).toFixed(3)); }
  return p.join(' ');
};

function buildBoard() {
  let h = '<defs>';
  for (let c = 0; c < 4; c++) {
    h += `<linearGradient id="zg${c}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${CL[c]}"/><stop offset=".4" stop-color="${C[c]}"/><stop offset="1" stop-color="${CD[c]}"/></linearGradient>` +
      `<linearGradient id="cg${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CL[c]}"/><stop offset="1" stop-color="${C[c]}"/></linearGradient>` +
      `<linearGradient id="pb${c}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${CD[c]}"/><stop offset=".36" stop-color="${CL[c]}"/><stop offset=".62" stop-color="${C[c]}"/><stop offset="1" stop-color="${CD[c]}"/></linearGradient>` +
      `<radialGradient id="ph${c}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${CL[c]}"/><stop offset=".65" stop-color="${C[c]}"/><stop offset="1" stop-color="${CD[c]}"/></radialGradient>`;
  }
  h += '<linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4178"/><stop offset=".5" stop-color="#171b3a"/><stop offset="1" stop-color="#0a0d22"/></linearGradient>' +
    '<linearGradient id="cell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8fd"/><stop offset="1" stop-color="#c9cee3"/></linearGradient>' +
    '<radialGradient id="slotg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#03050d" stop-opacity=".8"/><stop offset=".85" stop-color="#03050d" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></radialGradient>' +
    '<radialGradient id="shg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".65"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>' +
    '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#e09a00"/></linearGradient></defs>';

  // қою жақтау + негіз
  h += '<rect x="-.5" y="-.5" width="16" height="16" rx=".85" fill="url(#frame)"/>' +
    '<rect x="-.14" y="-.14" width="15.28" height="15.28" rx=".4" fill="none" stroke="#7d86c8" stroke-opacity=".45" stroke-width=".05"/>' +
    '<rect width="15" height="15" fill="#0b0f28"/>';

  // 4 үй (түсті аймақ + ұялар)
  ZONES.forEach(([x, y], c) => {
    h += `<rect x="${x}" y="${y}" width="6" height="6" fill="url(#zg${c})"/>` +
      `<rect x="${x + 1}" y="${y + 1}" width="4" height="4" rx=".55" fill="#050818" fill-opacity=".42" stroke="${CL[c]}" stroke-opacity=".75" stroke-width=".06"/>`;
    BASE0.forEach(p => {
      const q = rot(p, c);
      h += `<circle cx="${q[0]}" cy="${q[1]}" r=".5" fill="url(#slotg)" stroke="${CL[c]}" stroke-opacity=".85" stroke-width=".07"/>` +
        `<circle cx="${q[0]}" cy="${q[1]}" r=".3" fill="none" stroke="${C[c]}" stroke-opacity=".55" stroke-width=".05"/>`;
    });
  });

  // жол ұяшықтары
  RING.forEach(([x, y]) => { h += `<rect x="${x + .03}" y="${y + .03}" width=".94" height=".94" rx=".1" fill="url(#cell)" stroke="#8f96b8" stroke-width=".04"/>`; });
  for (let c = 0; c < 4; c++) {
    const [sx, sy] = RING[START[c]];
    h += `<rect x="${sx + .03}" y="${sy + .03}" width=".94" height=".94" rx=".1" fill="url(#cg${c})" stroke="${CD[c]}" stroke-width=".05"/>` +
      `<circle cx="${sx + .5}" cy="${sy + .5}" r=".24" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width=".06"/>`;
    COL0.forEach(p => { const q = rot(p, c); h += `<rect x="${q[0] - .47}" y="${q[1] - .47}" width=".94" height=".94" rx=".1" fill="url(#cg${c})" stroke="${CD[c]}" stroke-width=".05"/>`; });
  }
  SAFE_STARS.forEach(i => { const [x, y] = RING[i]; h += `<polygon points="${starPts(x + .5, y + .5, .33, .14)}" fill="url(#gold)" stroke="#a86b00" stroke-width=".03" stroke-linejoin="round"/>`; });
  [['.3,7.25 .72,7.5 .3,7.75', 0], ['7.25,.3 7.5,.72 7.75,.3', 1], ['14.7,7.25 14.28,7.5 14.7,7.75', 2], ['7.25,14.7 7.5,14.28 7.75,14.7', 3]].forEach(([pts, c]) => {
    h += `<polygon points="${pts}" fill="${CD[c]}" stroke="${CD[c]}" stroke-width=".05" stroke-linejoin="round"/>`;
  });

  // орталық
  [['6,6 6,9 7.5,7.5', 0], ['6,6 9,6 7.5,7.5', 1], ['9,6 9,9 7.5,7.5', 2], ['6,9 9,9 7.5,7.5', 3]].forEach(([pts, c]) => {
    h += `<polygon points="${pts}" fill="url(#zg${c})" stroke="#0b0f28" stroke-width=".06" stroke-linejoin="round"/>`;
  });
  h += '<circle cx="7.5" cy="7.5" r=".3" fill="#fff" fill-opacity=".92" stroke="#0b0f28" stroke-width=".05"/><circle cx="7.5" cy="7.5" r=".14" fill="#0b0f28"/>';
  h += '<rect width="15" height="15" fill="url(#gloss)" pointer-events="none"/><g id="toks"></g>';
  $('board').innerHTML = h;
}

/* ---------- Фишкалар (3D көрінетін) ---------- */
const tokEls = {};
const SVGNS = 'http://www.w3.org/2000/svg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function tokEl(key, c) {
  if (tokEls[key]) return tokEls[key];
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'tok');
  g.innerHTML = '<circle r=".56" cy="-.02" fill="transparent"/>' +
    '<ellipse cx=".05" cy=".37" rx=".44" ry=".17" fill="url(#shg)"/>' +
    '<circle class="ring" r=".52" cy=".02" fill="none" stroke="#fff" stroke-width=".06" stroke-dasharray=".2 .13"/>' +
    '<g class="lift">' +
    `<path d="M-.34 .34Q-.34 .45 0 .45Q.34 .45 .34 .34C.3 .14 .16 .04 .1 -.08L-.1 -.08C-.16 .04 -.3 .14 -.34 .34Z" fill="url(#pb${c})" stroke="${CD[c]}" stroke-width=".03"/>` +
    `<ellipse cy=".33" rx=".34" ry=".085" fill="${CD[c]}" fill-opacity=".5"/>` +
    `<ellipse cy="-.06" rx=".15" ry=".05" fill="${CD[c]}" fill-opacity=".55"/>` +
    `<circle cy="-.28" r=".21" fill="url(#ph${c})" stroke="${CD[c]}" stroke-width=".03"/>` +
    '<ellipse cx="-.07" cy="-.36" rx=".075" ry=".045" fill="#fff" fill-opacity=".7" transform="rotate(-28 -.07 -.36)"/>' +
    '</g>';
  $('toks').appendChild(g);
  tokEls[key] = g;
  return g;
}
function putTok(c, i, s, dur, sc) {
  const el = tokEl(c + '-' + i, c);
  el.style.transitionDuration = dur + 'ms';
  const p = tokenPos(c, s, i);
  el.style.transform = `translate(${p[0]}px,${p[1]}px) scale(${sc || 1})`;
  return el;
}
function hop(el, dur) {
  const l = el.querySelector('.lift');
  if (l && l.animate) l.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(-.34px)', offset: .5 }, { transform: 'translateY(0px)' }], { duration: dur, easing: 'ease-out' });
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
    if (grp && grp.length > 1) { x += (grp.indexOf(it) - (grp.length - 1) / 2) * 0.26; sc = 0.74; }
    const el = tokEl(it.key, it.c);
    el.style.transitionDuration = '';
    el.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
    el._y = y;
    const can = canPick && it.c === mine.color && g.legal.includes(it.i);
    el.classList.toggle('can', Boolean(can));
    el.onclick = can ? () => send({ t: 'move', i: it.i }) : null;
  });
  // төмендегі фишка алдында тұрсын (тереңдік), таңдалатындар ең үстінде
  Object.values(tokEls).sort((a, b) => (a._y || 0) - (b._y || 0)).forEach(el => $('toks').appendChild(el));
  Object.values(tokEls).forEach(el => { if (el.classList.contains('can')) $('toks').appendChild(el); });
}

/* Жүріс анимациясы: фишка ұяшықтан ұяшыққа секіріп жүреді, жеген кезде жеңілген фишка артқа қарай өз жолымен үйіне қайтады */
async function playMove(g) {
  const lm = g.last;
  if (!lm) return;
  const STEP = 230;
  const el = tokEl(lm.color + '-' + lm.i, lm.color);
  $('toks').appendChild(el);
  const states = [];
  if (lm.from === -1) states.push(0); else for (let s = lm.from + 1; s <= lm.to; s++) states.push(s);
  for (const s of states) { putTok(lm.color, lm.i, s, STEP, 1); hop(el, STEP); await sleep(STEP + 15); }
  if (lm.captured && lm.captured.length) {
    haptic('error');
    await sleep(180);
    await Promise.all(lm.captured.map(async cp => {
      const e = tokEl(cp.color + '-' + cp.i, cp.color);
      const path = [];
      for (let s = cp.s - 1; s >= 0; s--) path.push(s);
      path.push(-1);
      const step = Math.max(30, Math.min(110, 1700 / path.length));
      for (const s of path) { putTok(cp.color, cp.i, s, step, 1); hop(e, step); await sleep(step); }
    }));
  }
}
function syncTokens(g) {
  if (S.animating) return;
  if (S.moveSeq === null || g.moveSeq < S.moveSeq || g.moveSeq > S.moveSeq + 1 || !g.last) { S.moveSeq = g.moveSeq; return renderTokens(g); }
  if (g.moveSeq === S.moveSeq + 1) {
    S.moveSeq = g.moveSeq;
    S.animating = true;
    playMove(g).catch(() => {}).then(() => { S.animating = false; if (S.game && S.latest) syncTokens(S.latest); });
    return;
  }
  renderTokens(g);
}

/* ---------- Ойын экраны ---------- */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function setAva(el, p) {
  if (p && p.avatar) { el.style.backgroundImage = `url("${p.avatar}")`; el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.textContent = ((p && p.name) || '?').trim().charAt(0).toUpperCase(); }
}
const dieEl = c => document.querySelector('#card' + c + ' .die');
function setDie(c, v) {
  const d = dieEl(c);
  if (!d) return;
  const on = PIPS[v] || [];
  for (let k = 0; k < 9; k++) d.children[k].classList.toggle('on', on.includes(k));
}
function rollDie(c, v) {
  const d = dieEl(c);
  if (!d) return;
  S.dieBusy[c] = true;
  d.classList.remove('rolling'); void d.offsetWidth; d.classList.add('rolling');
  let n = 0;
  const iv = setInterval(() => {
    if (++n >= 8) { clearInterval(iv); setDie(c, v); S.dieBusy[c] = false; d.classList.remove('rolling'); }
    else setDie(c, 1 + Math.floor(Math.random() * 6));
  }, 80);
}

function renderGame(g) {
  S.game = g; S.latest = g;
  S.gameEnd = Date.now() + g.ms;
  const mine = g.seats.find(s => s.id === S.me.id);
  const myTurn = Boolean(mine && g.turn === mine.color);

  // лақтырылған кубик анимациясы (тек лақтырған адамның кубигінде)
  if (g.rollSeq !== S.rollSeq) {
    if (S.rollSeq !== -1 && g.rollColor !== null && g.rollColor !== undefined) {
      const rs = g.seats.find(s => s.color === g.rollColor);
      if (rs) rollDie(g.rollColor, rs.dice);
    }
    S.rollSeq = g.rollSeq;
  }

  for (let c = 0; c < 4; c++) {
    const el = $('card' + c);
    const seat = g.seats.find(s => s.color === c && !s.left);
    el.style.setProperty('--c', C[c]);
    if (!seat) { el.classList.add('off'); el.classList.remove('act'); if (el.dataset.uid) { el.innerHTML = ''; el.dataset.uid = ''; } continue; }
    el.classList.remove('off');
    if (el.dataset.uid !== seat.id) {
      el.dataset.uid = seat.id;
      el.innerHTML = '<div class="ava"></div><div class="nm"><b></b><div class="sub"><span class="pips"><i></i><i></i><i></i><i></i></span><span class="tm"></span></div></div>' +
        '<button class="die" type="button" aria-label="dice"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></button>';
      el.querySelector('.die').onclick = e => { if (e.currentTarget.classList.contains('ready')) send({ t: 'roll' }); };
      setAva(el.querySelector('.ava'), seat);
      S.dieBusy[c] = false;
    }
    el.classList.toggle('act', g.turn === c && g.winner === null);
    const done = (g.tokens[c] || []).filter(s => s === 56).length;
    el.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < done));
    el.querySelector('b').textContent = seat.id === S.me.id ? t('you') : seat.name;
    if (!S.dieBusy[c]) setDie(c, seat.dice);
    el.querySelector('.die').classList.toggle('ready', seat.id === S.me.id && g.turn === c && g.phase === 'roll' && g.winner === null && !S.dieBusy[c]);
  }

  syncTokens(g);

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
    const show = () => {
      if (!S.game || S.game.winner === null) return;
      $('oName').textContent = w ? (w.id === S.me.id ? t('you') : w.name) : '';
      $('oName').style.color = C[g.winner];
      $('over').classList.remove('hidden');
    };
    if (S.animating) setTimeout(show, 1800); else show();
  } else $('over').classList.add('hidden');
}

/* ---------- Чат ---------- */
function renderChat() {
  const box = $('chatList');
  box.innerHTML = '';
  S.chat.forEach(m => {
    const mineMsg = S.me && m.id === S.me.id;
    const row = document.createElement('div'); row.className = 'cm' + (mineMsg ? ' me' : '');
    const n = document.createElement('b'); n.textContent = mineMsg ? t('you') : m.name; n.style.color = m.color !== null && m.color !== undefined ? CL[m.color] : '#c9cff0';
    const p = document.createElement('p'); p.textContent = m.text;
    row.appendChild(n); row.appendChild(p); box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}
function updBadge() { document.querySelectorAll('.chatbtn .badge').forEach(b => { b.textContent = S.unread; b.classList.toggle('hidden', !S.unread); }); }
function openChat() { S.unread = 0; updBadge(); $('chat').classList.remove('hidden'); renderChat(); }
function sendChat(text) { text = String(text || '').trim(); if (text) send({ t: 'chat', text }); }

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
  $('btnChatW').classList.toggle('hidden', !room);
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

function inviteLink() { return S.app ? `https://t.me/${S.bot}/${S.app}?startapp=room_${S.room.code}` : `https://t.me/${S.bot}?startapp=room_${S.room.code}`; }
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
      S.me = m.me; S.bot = m.bot || ''; S.app = m.app || ''; S.dnd = Boolean(m.dnd);
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
      if (S.screen !== 'game') {
        S.rollSeq = -1; S.lastTurnMine = false; S.moveSeq = null; S.animating = false; S.dieBusy = {};
        Object.keys(tokEls).forEach(k => { tokEls[k].remove(); delete tokEls[k]; });
        for (let c = 0; c < 4; c++) { $('card' + c).dataset.uid = ''; }
      }
      show('game'); renderGame(m);
      break;
    case 'idle':
      S.room = null; S.queue = null; S.game = null; S.chat = []; S.unread = 0; updBadge(); $('chat').classList.add('hidden');
      $('over').classList.add('hidden');
      if (S.screen !== 'players') show('menu');
      break;
    case 'players':
      S.players = m; S.playersAt = Date.now(); S.dnd = m.dnd;
      $('plOnlineBadge').textContent = m.onlineCount ? '● ' + m.onlineCount : '';
      if (S.screen === 'players') renderPlayers();
      break;
    case 'chat':
      S.chat.push(m); if (S.chat.length > 60) S.chat.shift();
      if ($('chat').classList.contains('hidden')) { if (!S.me || m.id !== S.me.id) { S.unread++; updBadge(); haptic('warning'); } }
      else renderChat();
      break;
    case 'chat_hist':
      S.chat = Array.isArray(m.list) ? m.list : []; renderChat();
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
$('btnChatG').onclick = openChat;
$('btnChatW').onclick = openChat;
$('chatClose').onclick = () => $('chat').classList.add('hidden');
$('chatSend').onclick = () => { sendChat($('chatInput').value); $('chatInput').value = ''; };
$('chatInput').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('chatSend').click(); } };
document.querySelectorAll('.cquick button').forEach(b => { b.onclick = () => sendChat(b.textContent); });
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
