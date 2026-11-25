(() => {
'use strict';
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try { tg.ready(); tg.expand(); } catch (e) {}
  try { tg.setHeaderColor('#000000'); tg.setBackgroundColor('#000000'); tg.setBottomBarColor && tg.setBottomBarColor('#000000'); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}   // төмен сырғытқанда жабылмайды
  try { tg.requestFullscreen && tg.requestFullscreen(); } catch (e) {}           // толық экран, тек «Закрыть» арқылы жабылады
  try { tg.enableClosingConfirmation && tg.enableClosingConfirmation(); } catch (e) {}
}
const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);

/* ---------- Тіл ---------- */
const I18N = {
  kk: { menu: 'Мәзір', surrender: 'Берілемін', closeX: 'Жабу', lastSeen: 'соңғы кіру', justNow: 'жаңа ғана', leftMark: 'Шықты', kicked: 'Жаның таусылды, ойыннан шығарылдың', role: 'Лудо ойыншысы', randomTitle: 'Кездейсоқ ойын', randomDesc: 'Қазір ойнағысы келетіндермен ойна (2–4 ойыншы)', play: 'ОЙНАУ',
    friendTitle: 'Доспен ойнау', friendDesc: 'Бөлме аш та, достарыңды шақыр', friendBtn: 'ДОСПЕН ОЙНАУ', connecting: 'Қосылуда…',
    waiting: 'Ойыншылар күтілуде', you: 'Сіз', invite: 'Шақыру', startGame: 'Ойынды бастау', cancel: 'Бас тарту',
    winner: 'Жеңімпаз', toMenu: 'Мәзірге', leaveAsk: 'Ойыннан шығасың ба?', leave: 'Шығу', stay: 'Қалу',
    hintRoll: 'Сенің кезегің — сүйекті бас', hintMove: 'Фишканы таңда', hintOther: 'жүріс жасауда…',
    inviteText: 'Менімен Лудо ойнайық! 🎲', room_gone: 'Бөлме табылмады', room_full: 'Бөлме толы', auth: 'Кіру қатесі',
    replaced: 'Басқа құрылғыда ашылды', noBot: 'Боттың username-і көрсетілмеген' },
  uz: { menu: 'Menyu', surrender: 'Taslim bo‘laman', closeX: 'Yopish', lastSeen: 'oxirgi kirish', justNow: 'hozirgina', leftMark: 'Chiqdi', kicked: 'Jonlaring tugadi, o‘yindan chiqarilding', role: 'Ludo o‘yinchisi', randomTitle: 'Tasodifiy o‘yin', randomDesc: 'Hozir o‘ynashni xohlovchilar bilan o‘yna (2–4 o‘yinchi)', play: 'O‘YNASH',
    friendTitle: 'Do‘st bilan o‘ynash', friendDesc: 'Xona och va do‘stlaringni taklif qil', friendBtn: 'DO‘ST BILAN O‘YNASH', connecting: 'Ulanmoqda…',
    waiting: 'O‘yinchilar kutilmoqda', you: 'Siz', invite: 'Taklif qilish', startGame: 'O‘yinni boshlash', cancel: 'Bekor qilish',
    winner: 'G‘olib', toMenu: 'Menyuga', leaveAsk: 'O‘yindan chiqasanmi?', leave: 'Chiqish', stay: 'Qolish',
    hintRoll: 'Navbating — kubikni bos', hintMove: 'Toshni tanla', hintOther: 'yurmoqda…',
    inviteText: 'Men bilan Ludo o‘ynaymiz! 🎲', room_gone: 'Xona topilmadi', room_full: 'Xona to‘la', auth: 'Kirish xatosi',
    replaced: 'Boshqa qurilmada ochildi', noBot: 'Bot username ko‘rsatilmagan' },
  ru: { menu: 'Меню', surrender: 'Сдаюсь', closeX: 'Закрыть', lastSeen: 'был(а)', justNow: 'только что', leftMark: 'Вышел', kicked: 'Жизни закончились, вы выбыли из игры', role: 'Игрок в Лудо', randomTitle: 'Случайная игра', randomDesc: 'Играй с теми, кто ищет партию (2–4 игрока)', play: 'ИГРАТЬ',
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
    plInvite: 'Шақыру', plSent: 'Күтілуде…', plWatch: 'Ойынды қарау',
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
    plInvite: 'Taklif', plSent: 'Kutilmoqda…', plWatch: 'O‘yinni ko‘rish',
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
    plInvite: 'Позвать', plSent: 'Ожидание…', plWatch: 'Смотреть игру',
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


/* ---------- Дыбыстар (Web Audio, файлсыз) ---------- */
const SFX = (() => {
  let ctx = null, master = null, nbuf = null;
  let silent = null;
  // iOS: «үнсіз» режимде де Web Audio шығуы үшін дыбыс сеансын playback қылып, үнсіз <audio> ойнатамыз
  const iosUnlock = () => {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!silent) {
        silent = new Audio('data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='); silent.loop = true; silent.setAttribute('playsinline', ''); silent.volume = 0.01;
      }
      if (silent.paused) { const p = silent.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) {}
  };
  const ensure = () => {
    iosUnlock();
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  const env = (g, t, a, dur, vol) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const tone = (f0, f1, t, dur, type, vol, a) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a || 0.005, dur, vol);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const burst = (t, dur, freq, q, vol) => {
    const s = ctx.createBufferSource(); s.buffer = nbuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.004, dur, vol);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, dur + 0.02);
  };
  return {
    unlock: ensure,
    // кубик: жылдам сатыр-сұтыр + соңғы соққы
    roll() {
      if (!ensure()) return; const t = ctx.currentTime;
      [0, 0.06, 0.13, 0.21, 0.30, 0.40, 0.52].forEach((dt, i) => {
        const v = 0.55 - i * 0.05;
        burst(t + dt, 0.05, 1500 + Math.random() * 1800, 5, v);
        tone(900 + Math.random() * 500, 500, t + dt, 0.04, 'square', 0.05);
      });
      tone(220, 120, t + 0.56, 0.09, 'sine', 0.3);
    },
    // тас бір ұяшыққа жүргенде
    step() {
      if (!ensure()) return; const t = ctx.currentTime;
      tone(560, 470, t, 0.09, 'triangle', 0.5);
      burst(t, 0.03, 1800, 3, 0.25);
    },
    // жұлдызға тұрғанда
    star() {
      if (!ensure()) return; const t = ctx.currentTime;
      [988, 1319, 1760, 2349].forEach((f, i) => {
        tone(f, f, t + i * 0.08, 0.55, 'sine', 0.28, 0.01);
        tone(f * 2.01, f * 2.01, t + i * 0.08, 0.3, 'sine', 0.07, 0.01);
      });
    },
    // тас жегенде
    capture() {
      if (!ensure()) return; const t = ctx.currentTime;
      tone(520, 90, t, 0.38, 'sawtooth', 0.32, 0.004);
      tone(260, 60, t, 0.42, 'square', 0.18, 0.004);
      burst(t, 0.18, 700, 1.2, 0.7);
      tone(160, 70, t + 0.05, 0.3, 'sine', 0.5);
    }
  };
})();
['pointerdown', 'touchstart', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, () => SFX.unlock(), { passive: true }));

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
const C  = ['#e8192c', '#0a9a3f', '#f5c800', '#27a2f4'];   // қызыл, жасыл, сары, көк (ұяшық/карточка)
const ZC = ['#e8192c', '#0a9a3f', '#ffd719', '#13659f'];   // үй аймағының түсі
const CL = ['#ff7a85', '#5fd68a', '#ffe666', '#8fd0ff'];   // ашық реңк
const CD = ['#8a0f1a', '#065c26', '#a38200', '#0b4a7a'];   // қою реңк
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

/* Ludo King стиліндегі жалпақ, ашық тақта */
function buildBoard() {
  const G = '#3a3a3a';
  let h = '<defs>';
  for (let c = 0; c < 4; c++) {
    h += `<radialGradient id="ph${c}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${CL[c]}"/><stop offset=".55" stop-color="${C[c]}"/><stop offset="1" stop-color="${CD[c]}"/></radialGradient>` +
      `<radialGradient id="gl${c}"><stop offset="0" stop-color="${CL[c]}" stop-opacity=".95"/><stop offset="1" stop-color="${C[c]}" stop-opacity="0"/></radialGradient>`;
  }
  h += '<linearGradient id="pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d929e"/><stop offset=".3" stop-color="#ffffff"/><stop offset=".65" stop-color="#d5d8df"/><stop offset="1" stop-color="#7a7f8b"/></linearGradient></defs>';
  h += '<rect width="15" height="15" fill="#fff"/>';

  // 4 үй: қалың түсті жиек + ақ ішкі шаршы + 4 түсті дөңгелек
  ZONES.forEach(([x, y], c) => {
    h += `<rect x="${x}" y="${y}" width="6" height="6" fill="${ZC[c]}"/>` +
      `<rect x="${x + 1}" y="${y + 1}" width="4" height="4" fill="#fff" stroke="${G}" stroke-width=".03"/>`;
    BASE0.forEach(p => {
      const q = rot(p, c);
      h += `<circle cx="${q[0]}" cy="${q[1]}" r=".55" fill="${c === 3 ? C[3] : ZC[c]}" stroke="rgba(0,0,0,.28)" stroke-width=".03"/>`;
    });
  });

  // ақ ұяшықтар (жұқа қара тор)
  RING.forEach(([x, y]) => { h += `<rect x="${x}" y="${y}" width="1" height="1" fill="#fff" stroke="${G}" stroke-width=".025"/>`; });
  for (let c = 0; c < 4; c++) {
    const [sx, sy] = RING[START[c]];
    h += `<rect x="${sx}" y="${sy}" width="1" height="1" fill="${C[c]}" stroke="${G}" stroke-width=".025"/>`;
    COL0.forEach(p => { const q = rot(p, c); h += `<rect x="${q[0] - .5}" y="${q[1] - .5}" width="1" height="1" fill="${C[c]}" stroke="${G}" stroke-width=".025"/>`; });
  }
  // орталық үшбұрыштар
  [['6,6 6,9 7.5,7.5', 0], ['6,6 9,6 7.5,7.5', 1], ['9,6 9,9 7.5,7.5', 2], ['6,9 9,9 7.5,7.5', 3]].forEach(([pts, c]) => {
    h += `<polygon points="${pts}" fill="${C[c]}"/>`;
  });
  // контурлы жұлдыздар
  SAFE_STARS.forEach(i => { const [x, y] = RING[i]; h += `<polygon points="${starPts(x + .5, y + .5, .4, .17)}" fill="#fff" stroke="#333" stroke-width=".04" stroke-linejoin="round"/>`; });
  // жұқа көрсеткілер
  for (let c = 0; c < 4; c++) {
    h += `<path d="M.2 7.5H.82M.56 7.24L.82 7.5L.56 7.76" fill="none" stroke="${C[c]}" stroke-width=".05" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${c * 90} 7.5 7.5)"/>`;
  }
  h += `<rect width="15" height="15" fill="none" stroke="#222" stroke-width=".08"/><g id="fx"></g><g id="toks"></g>`;
  $('board').innerHTML = h;
}

/* ---------- Фишкалар: күміс «пин» + түсті шар + қызыл-қоңыр сақина ---------- */
const tokEls = {};
const SVGNS = 'http://www.w3.org/2000/svg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PIN = 'M0 -.02C-.2 -.3 -.4 -.45 -.4 -.66A.4 .4 0 1 1 .4 -.66C.4 -.45 .2 -.3 0 -.02Z';
function tokEl(key, c) {
  if (tokEls[key]) return tokEls[key];
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'tok');
  g.innerHTML = '<circle r=".5" cy="-.45" fill="transparent"/>' +
    '<ellipse class="gring" rx=".3" ry=".27" fill="none" stroke="#8c2323" stroke-width=".075"/>' +
    '<g class="lift">' +
    `<path d="${PIN}" fill="#000" fill-opacity=".28" transform="translate(.07 .05)"/>` +
    `<path d="${PIN}" fill="url(#pin)" stroke="#2b2f3a" stroke-width=".035"/>` +
    `<circle cy="-.66" r=".25" fill="url(#ph${c})" stroke="${CD[c]}" stroke-width=".035"/>` +
    '<ellipse cx="-.08" cy="-.75" rx=".09" ry=".05" fill="#fff" fill-opacity=".65" transform="rotate(-30 -.08 -.75)"/>' +
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
// жүргенде пин жоғары көтеріліп, үлкейіп секіреді
function hop(el, dur) {
  const l = el.querySelector('.lift');
  if (l && l.animate) l.animate([
    { transform: 'translateY(-.22px) scale(1.3)' },
    { transform: 'translateY(-.55px) scale(1.42)', offset: .5 },
    { transform: 'translateY(-.22px) scale(1.3)' }], { duration: dur, easing: 'ease-out' });
}
// артында қалатын жарқыраған із (видеодағыдай)
function trail(c, a, b) {
  const fx = $('fx');
  if (!fx) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
  const g = document.createElementNS(SVGNS, 'g');
  g.innerHTML = `<circle cx="${a[0]}" cy="${a[1]}" r=".38" fill="url(#gl${c})"/>` +
    `<circle cx="${a[0] + dx / n * .45}" cy="${a[1] + dy / n * .45}" r=".08" fill="${CL[c]}" stroke="${C[c]}" stroke-width=".03"/>`;
  fx.appendChild(g);
  if (g.animate) { const an = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' }); an.onfinish = () => g.remove(); }
  else setTimeout(() => g.remove(), 700);
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

/* Жүріс анимациясы: пин үлкейіп көтеріліп, ұяшықтан ұяшыққа секіреді, артында жарқыраған із қалады; жеген кезде жеңілген фишка өз жолымен артқа жүріп үйіне қайтады */
async function playMove(g) {
  const lm = g.last;
  if (!lm) return;
  const STEP = 240;
  const el = tokEl(lm.color + '-' + lm.i, lm.color);
  $('toks').appendChild(el);
  el.classList.add('moving');
  const states = [];
  if (lm.from === -1) states.push(0); else for (let s = lm.from + 1; s <= lm.to; s++) states.push(s);
  let prev = tokenPos(lm.color, lm.from, lm.i);
  for (const s of states) {
    const nxt = tokenPos(lm.color, s, lm.i);
    trail(lm.color, prev, nxt);
    putTok(lm.color, lm.i, s, STEP, 1); hop(el, STEP); SFX.step();
    prev = nxt;
    await sleep(STEP + 15);
  }
  el.classList.remove('moving');
  if (!(lm.captured && lm.captured.length) && lm.to >= 0 && lm.to <= 50 && SAFE_STARS.includes((START[lm.color] + lm.to) % 52)) SFX.star();
  if (lm.captured && lm.captured.length) {
    SFX.capture();
    haptic('error');
    await sleep(180);
    await Promise.all(lm.captured.map(async cp => {
      const e = tokEl(cp.color + '-' + cp.i, cp.color);
      e.classList.add('moving');
      const path = [];
      for (let s = cp.s - 1; s >= 0; s--) path.push(s);
      path.push(-1);
      const step = Math.max(30, Math.min(110, 1700 / path.length));
      let pv = tokenPos(cp.color, cp.s, cp.i);
      for (const s of path) {
        const nx = tokenPos(cp.color, s, cp.i);
        trail(cp.color, pv, nx);
        putTok(cp.color, cp.i, s, step, 1); hop(e, step);
        pv = nx;
        await sleep(step);
      }
      e.classList.remove('moving');
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
  const pc = $('card' + c); if (pc) pc.classList.add('rollz');
  SFX.roll();
  let n = 0;
  const iv = setInterval(() => {
    if (++n >= 8) { clearInterval(iv); setDie(c, v); S.dieBusy[c] = false; d.classList.remove('rolling'); const pc2 = $('card' + c); if (pc2) pc2.classList.remove('rollz'); }
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
    const seat = g.seats.find(s => s.color === c);
    el.style.setProperty('--c', C[c]);
    if (!seat) { el.classList.add('off'); el.classList.remove('act'); if (el.dataset.uid) { el.innerHTML = ''; el.dataset.uid = ''; } continue; }
    el.classList.remove('off');
    if (el.dataset.uid !== seat.id) {
      el.dataset.uid = seat.id;
      el.innerHTML = '<div class="ava"></div><div class="nm"><b></b><div class="sub"><span class="hearts"><i></i><i></i><i></i></span><span class="gonemark"></span><span class="tm"></span></div></div>' +
        '<button class="die" type="button" aria-label="dice"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></button>';
      el.querySelector('.die').onclick = e => { if (e.currentTarget.classList.contains('ready')) send({ t: 'roll' }); };
      setAva(el.querySelector('.ava'), seat);
      S.dieBusy[c] = false;
    }
    el.classList.toggle('gone', Boolean(seat.left));
    el.querySelector('.gonemark').textContent = seat.left ? '🚪 ' + t('leftMark') : '';
    el.classList.toggle('act', g.turn === c && g.winner === null && !seat.left);
    const lives = seat.lives == null ? 3 : seat.lives;
    el.querySelectorAll('.hearts i').forEach((p, i) => p.classList.toggle('on', i < lives));
    el.querySelector('b').textContent = seat.id === S.me.id ? t('you') : seat.name;
    if (!S.dieBusy[c]) setDie(c, seat.dice);
    el.querySelector('.die').classList.toggle('ready', seat.id === S.me.id && g.turn === c && g.phase === 'roll' && g.winner === null && !S.dieBusy[c]);
  }

  syncTokens(g);
  $('btnChatG').classList.toggle('hidden', Boolean(g.spectator));
  if (g.spectator) $('chat').classList.add('hidden');

  const turnSeat = g.seats.find(s => s.color === g.turn);
  $('hint').textContent = g.winner === null && g.spectator ? '👁 ' + t('watching') + (g.viewers > 1 ? ' · ' + g.viewers : '') : '';
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
  $('wBar').classList.toggle('hidden', !room);                              // мәзір/чат тек доспен ойында (кездейсоқта «Бас тарту» бар)
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

const AVA_COLORS = [['#7ed56f','#55b86a'],['#5fd3c4','#3aa6a0'],['#f0b35a','#d9893a'],['#7aa7f0','#4f78d0'],['#c58af0','#9a5ad0'],['#f08a9a','#d05a70']];
function plAvatar(ava, p) {
  setAva(ava, p);
  if (!p.avatar) {
    const c = AVA_COLORS[Math.abs(parseInt(String(p.id).replace(/\D/g, '').slice(-6) || '0', 10)) % AVA_COLORS.length];
    ava.style.background = `linear-gradient(160deg,${c[0]},${c[1]})`;
    const w = (p.name || '?').trim().split(/\s+/);
    ava.textContent = ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase();
  }
}
function renderPlayers() {
  const m = S.players;
  $('btnDnd').setAttribute('aria-checked', String(S.dnd));
  $('dndNote').classList.toggle('hidden', !S.dnd);
  $('dndHint').classList.toggle('hidden', S.dnd);
  if (!m) return;
  $('plCount').classList.add('hidden');
  const box = $('plList');
  box.innerHTML = '';
  const on = m.list.filter(p => p.status !== 'offline');
  const off = m.list.filter(p => p.status === 'offline');
  const section = (title, count, items) => {
    if (!items.length) return;
    const h = document.createElement('div'); h.className = 'plsec'; h.textContent = title + ' · ' + count;
    box.appendChild(h);
    items.forEach(p => box.appendChild(plRow(p)));
  };
  section(t('stOnline'), m.onlineCount, on);
  section(t('stOffline'), Math.max(off.length, (m.total || 0) - m.onlineCount), off);
}
function plRow(p) {
  const row = document.createElement('div');
  row.className = 'pl';
  const ava = document.createElement('div'); ava.className = 'ava'; plAvatar(ava, p);
  const dot = document.createElement('i'); dot.className = 'dot ' + p.status; ava.appendChild(dot);
  const nm = document.createElement('div'); nm.className = 'nm';
  const b = document.createElement('b'); b.textContent = p.name + (p.dnd ? ' 🌙' : '');
  const sm = document.createElement('small'); sm.className = 'st ' + p.status;
  sm.textContent = p.status === 'online' ? t('stOnline') + ' · ID ' + p.id : p.status === 'game' ? t('stGame') :
    t('lastSeen') + ': ' + (ago(p.seen) || t('justNow'));
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
    btn = document.createElement('button'); btn.className = 'pb'; btn.textContent = t('plWatch');
    btn.onclick = () => send({ t: 'watch_start', id: p.id });
  } else if (p.status === 'offline') {
    btn = document.createElement('button'); btn.className = 'pb off'; btn.disabled = true; btn.textContent = t('stOffline').replace(/^./, c => c.toUpperCase());
  }
  if (btn) row.appendChild(btn);
  return row;
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
setInterval(() => { if (S.screen === 'menu') reqPlayers(); }, 3000);

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
    case 'kicked':
      toast(t('kicked')); haptic('error');
      break;
    case 'idle':
      S.room = null; S.queue = null; S.game = null; S.chat = []; S.unread = 0; updBadge(); $('chat').classList.add('hidden');
      $('over').classList.add('hidden');
      if (S.screen !== 'players') { show('menu'); reqPlayers(); }
      break;
    case 'players':
      S.players = m; S.playersAt = Date.now(); S.dnd = m.dnd;
      $('plOnlineBadge').textContent = (m.onlineCount || 0) + ' ' + t('stOnline');
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
function openAsk(kind) {
  $('askYes').textContent = t(kind === 'surrender' ? 'surrender' : 'leave');
  $('askYes').dataset.kind = kind;
  $('ask').classList.remove('hidden');
}
$('btnWaitBack').onclick = () => openAsk('exit');
$('ask').onclick = e => { if (e.target === $('ask')) $('ask').classList.add('hidden'); };
$('btnChatG').onclick = openChat;
$('btnChatW').onclick = openChat;
$('chatClose').onclick = () => $('chat').classList.add('hidden');
$('chatSend').onclick = () => { sendChat($('chatInput').value); $('chatInput').value = ''; };
$('chatInput').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('chatSend').click(); } };
document.querySelectorAll('.cquick button').forEach(b => { b.onclick = () => sendChat(b.textContent); });
$('btnGameBack').onclick = () => {
  if (S.game && S.game.winner !== null && !S.game.spectator) return $('btnOver').click();
  openAsk(S.game && S.game.spectator ? 'exit' : 'surrender');
};
$('askNo').onclick = () => $('ask').classList.add('hidden');
$('askYes').onclick = () => {
  $('ask').classList.add('hidden');
  if (S.screen === 'wait') { send({ t: S.room ? 'room_leave' : 'cancel' }); S.room = null; S.queue = null; show('menu'); return; }
  if (S.game && S.game.spectator) return leaveWatch();
  send({ t: 'leave' }); S.game = null; show('menu');
};
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
