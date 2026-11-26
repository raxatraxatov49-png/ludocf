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
    blocked: 'Сіз блокталдыңыз 🚫', replaced: 'Басқа құрылғыда ашылды', noBot: 'Боттың username-і көрсетілмеген' },
  uz: { menu: 'Menyu', surrender: 'Taslim bo‘laman', closeX: 'Yopish', lastSeen: 'oxirgi kirish', justNow: 'hozirgina', leftMark: 'Chiqdi', kicked: 'Jonlaring tugadi, o‘yindan chiqarilding', role: 'Ludo o‘yinchisi', randomTitle: 'Tasodifiy o‘yin', randomDesc: 'Hozir o‘ynashni xohlovchilar bilan o‘yna (2–4 o‘yinchi)', play: 'O‘YNASH',
    friendTitle: 'Do‘st bilan o‘ynash', friendDesc: 'Xona och va do‘stlaringni taklif qil', friendBtn: 'DO‘ST BILAN O‘YNASH', connecting: 'Ulanmoqda…',
    waiting: 'O‘yinchilar kutilmoqda', you: 'Siz', invite: 'Taklif qilish', startGame: 'O‘yinni boshlash', cancel: 'Bekor qilish',
    winner: 'G‘olib', toMenu: 'Menyuga', leaveAsk: 'O‘yindan chiqasanmi?', leave: 'Chiqish', stay: 'Qolish',
    hintRoll: 'Navbating — kubikni bos', hintMove: 'Toshni tanla', hintOther: 'yurmoqda…',
    inviteText: 'Men bilan Ludo o‘ynaymiz! 🎲', room_gone: 'Xona topilmadi', room_full: 'Xona to‘la', auth: 'Kirish xatosi',
    blocked: 'Siz bloklandingiz 🚫', replaced: 'Boshqa qurilmada ochildi', noBot: 'Bot username ko‘rsatilmagan' },
  ru: { menu: 'Меню', surrender: 'Сдаюсь', closeX: 'Закрыть', lastSeen: 'был(а)', justNow: 'только что', leftMark: 'Вышел', kicked: 'Жизни закончились, вы выбыли из игры', role: 'Игрок в Лудо', randomTitle: 'Случайная игра', randomDesc: 'Играй с теми, кто ищет партию (2–4 игрока)', play: 'ИГРАТЬ',
    friendTitle: 'Играть с другом', friendDesc: 'Создай комнату и пригласи друзей', friendBtn: 'ИГРАТЬ С ДРУГОМ', connecting: 'Подключение…',
    waiting: 'Ожидание игроков', you: 'Вы', invite: 'Пригласить', startGame: 'Начать игру', cancel: 'Отмена',
    winner: 'Победитель', toMenu: 'В меню', leaveAsk: 'Выйти из игры?', leave: 'Выйти', stay: 'Остаться',
    hintRoll: 'Твой ход — брось кубик', hintMove: 'Выбери фишку', hintOther: 'ходит…',
    inviteText: 'Сыграем в Лудо! 🎲', room_gone: 'Комната не найдена', room_full: 'Комната заполнена', auth: 'Ошибка входа',
    blocked: 'Вы заблокированы 🚫', replaced: 'Открыто на другом устройстве', noBot: 'Не указан username бота' }
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
const EXTRA3 = {
  kk: { navGame: 'Ойын', navShop: 'Дүкен',
   
   
    vipLocked: 'VIP ал', vipLockedP: '7 досыңды шақыр — VIP тегін ашылады', vipActive: 'VIP белсенді', vipActiveP: 'Барлық мүмкіндіктер ашық. Профиліңіз алтын түсте көрінеді.',
    vipProg: '{n} / {m} дос шақырылды', vipInvite: 'Достарды шақыру', vipHow: 'Дос сілтеме арқылы ботқа бірінші рет кіргенде ғана есептеледі', vipUnlocked: '👑 VIP ашылды!', refText: 'Менімен Лудо ойнайық! 🎲',
    vipPerksT: 'VIP мүмкіндіктері',
    vp1: 'Басқалардың ойынын көру', vp1d: 'Ойыншылар тізімінен кез келген ойынды қарап отыра аласыз', vp2: 'Көрермен чаты', vp2d: 'Ойынды көргенде чатты көресіз және жаза аласыз; атыңыздың жанында VIP және «көрермен» белгісі тұрады',
    vp3: 'Барлық тас түрлері ашық', vp3d: 'Дүкендегі барлық скиндер тегін киюге болады', vp4: 'Алтын VIP профиль', vp4d: 'Ойында және рейтингте атыңыз алтын түсті болып, сары түсті VIP белгісі көрінеді',
    shopTitle: 'Дүкен', shopNote: 'Төлем — Telegram Stars (⭐) арқылы. Киген тасыңызды ойында басқалар да көреді.', shopSkins: 'Тас скиндері', equipped: 'Қойылған', equip: 'Кию', stkInter: 'интерактив стикер',
    sk_classic: 'Классик', sk_classic_d: 'Әдеттегі тастар', sk_obsidian: 'Обсидиан', sk_obsidian_d: 'Қара тас · түтін және жарқыл', sk_gold: 'Алтын', sk_gold_d: 'Алтын тастар · шашылған тиындар',
    sk_crystal: 'Кристалл', sk_crystal_d: 'Кристалл тастар · реңді ұшқындар', sk_fire: 'Жалын', sk_fire_d: 'Отты тастар · лава мен ұшқын', sk_ice: 'Мұз', sk_ice_d: 'Мұзды тастар · қар мен аяз', sk_neon: 'Неон', sk_neon_d: 'Жарқыраған ғарыш тастары',
    pay_unavail: 'Төлем қазір қолжетімсіз', paid: '✅ Төлем өтті, тас ашылды!', owned: 'Бұл тас сізде бар', vip_only: 'Чатты тек VIP ойыншылар көреді',
    overTitle: 'Ойын аяқталды', placeN: '{n}-орын', finWin: 'Сіз ұттыңыз! 🏆', finPlace: 'Сіз {n}-орын алдыңыз', finPts: '+{n} ұпай',
    finHint: 'Ойыннан шыға аласыз немесе қалғандарды қарап отыра аласыз', finWatch: 'Қарап отыру', finMenu: 'Бас мәзір',
    chatLocked: 'Ойынды көріп отырғанда чатты тек VIP ойыншылар көреді және жаза алады. 7 дос шақырып, VIP ал!', viewer: 'көрермен' },
  uz: { navGame: 'O‘yin', navShop: 'Do‘kon',
   
   
    vipLocked: 'VIP ol', vipLockedP: '7 do‘stingni taklif qil — VIP bepul ochiladi', vipActive: 'VIP faol', vipActiveP: 'Barcha imkoniyatlar ochiq. Profilingiz oltin rangda ko‘rinadi.',
    vipProg: '{n} / {m} do‘st taklif qilindi', vipInvite: 'Do‘stlarni taklif qilish', vipHow: 'Do‘st havola orqali botga birinchi marta kirgandagina hisoblanadi', vipUnlocked: '👑 VIP ochildi!', refText: 'Men bilan Ludo o‘ynaymiz! 🎲',
    vipPerksT: 'VIP imkoniyatlari',
    vp1: 'Boshqalarning o‘yinini ko‘rish', vp1d: 'O‘yinchilar ro‘yxatidan istalgan o‘yinni tomosha qilasiz', vp2: 'Tomoshabin chati', vp2d: 'O‘yinni ko‘rganda chatni ko‘rasiz va yoza olasiz; ismingiz yonida VIP va «tomoshabin» belgisi turadi',
    vp3: 'Barcha tosh turlari ochiq', vp3d: 'Do‘kondagi barcha skinlarni bepul kiyasiz', vp4: 'Oltin VIP profil', vp4d: 'O‘yinda va reytingda ismingiz oltin rangda, sariq VIP belgisi bilan ko‘rinadi',
    shopTitle: 'Do‘kon', shopNote: 'To‘lov — Telegram Stars (⭐) orqali. Kiygan toshingizni o‘yinda boshqalar ham ko‘radi.', shopSkins: 'Tosh skinlari', equipped: 'Kiyilgan', equip: 'Kiyish', stkInter: 'interaktiv stiker',
    sk_classic: 'Klassik', sk_classic_d: 'Oddiy toshlar', sk_obsidian: 'Obsidian', sk_obsidian_d: 'Qora tosh · tutun va yarqiroq', sk_gold: 'Oltin', sk_gold_d: 'Oltin toshlar · sochilgan tangalar',
    sk_crystal: 'Kristal', sk_crystal_d: 'Kristal toshlar · rangli uchqunlar', sk_fire: 'Olov', sk_fire_d: 'Olovli toshlar · lava va uchqun', sk_ice: 'Muz', sk_ice_d: 'Muzli toshlar · qor va ayoz', sk_neon: 'Neon', sk_neon_d: 'Yarqiroq kosmik toshlar',
    pay_unavail: 'To‘lov hozir mavjud emas', paid: '✅ To‘lov o‘tdi, tosh ochildi!', owned: 'Bu tosh sizda bor', vip_only: 'Chatni faqat VIP o‘yinchilar ko‘radi',
    overTitle: 'O‘yin tugadi', placeN: '{n}-o‘rin', finWin: 'Siz yutdingiz! 🏆', finPlace: 'Siz {n}-o‘rinni oldingiz', finPts: '+{n} ochko',
    finHint: 'O‘yindan chiqishingiz yoki qolganlarni tomosha qilishingiz mumkin', finWatch: 'Tomosha qilish', finMenu: 'Bosh menyu',
    chatLocked: 'O‘yinni tomosha qilganda chatni faqat VIP o‘yinchilar ko‘radi va yoza oladi. 7 do‘st taklif qilib, VIP ol!', viewer: 'tomoshabin' },
  ru: { navGame: 'Игра', navShop: 'Магазин',
   
   
    vipLocked: 'Получи VIP', vipLockedP: 'Пригласи 7 друзей — VIP откроется бесплатно', vipActive: 'VIP активен', vipActiveP: 'Все возможности открыты. Ваш профиль выделен золотом.',
    vipProg: 'Приглашено {n} / {m}', vipInvite: 'Пригласить друзей', vipHow: 'Засчитывается, только если друг впервые зашёл в бота по вашей ссылке', vipUnlocked: '👑 VIP открыт!', refText: 'Сыграем в Лудо! 🎲',
    vipPerksT: 'Возможности VIP',
    vp1: 'Смотреть чужие игры', vp1d: 'Наблюдайте за любой игрой из списка игроков', vp2: 'Чат зрителей', vp2d: 'При просмотре игры вы видите чат и можете писать; рядом с именем — значок VIP и «зритель»',
    vp3: 'Все виды фишек открыты', vp3d: 'Все скины из магазина можно надеть бесплатно', vp4: 'Золотой VIP-профиль', vp4d: 'В игре и рейтинге имя золотое, рядом жёлтый значок VIP',
    shopTitle: 'Магазин', shopNote: 'Оплата — Telegram Stars (⭐). Выбранные фишки видят остальные игроки.', shopSkins: 'Скины фишек', equipped: 'Надето', equip: 'Надеть', stkInter: 'интерактивных стикера',
    sk_classic: 'Классика', sk_classic_d: 'Обычные фишки', sk_obsidian: 'Обсидиан', sk_obsidian_d: 'Чёрные фишки · дым и молнии', sk_gold: 'Золото', sk_gold_d: 'Золотые фишки · рассыпанные монеты',
    sk_crystal: 'Кристалл', sk_crystal_d: 'Кристальные фишки · цветные искры', sk_fire: 'Огонь', sk_fire_d: 'Огненные фишки · лава и искры', sk_ice: 'Лёд', sk_ice_d: 'Ледяные фишки · снег и мороз', sk_neon: 'Неон', sk_neon_d: 'Светящиеся космические фишки',
    pay_unavail: 'Оплата сейчас недоступна', paid: '✅ Оплата прошла, скин открыт!', owned: 'Этот скин у вас уже есть', vip_only: 'Чат видят только VIP-игроки',
    overTitle: 'Игра окончена', placeN: '{n}-е место', finWin: 'Вы победили! 🏆', finPlace: 'Вы заняли {n}-е место', finPts: '+{n} очков',
    finHint: 'Можно выйти из игры или остаться и посмотреть, как играют остальные', finWatch: 'Смотреть', finMenu: 'В меню',
    chatLocked: 'При просмотре игры чат видят и пишут в нём только VIP-игроки. Пригласи 7 друзей и получи VIP!', viewer: 'зритель' }
};
Object.keys(EXTRA3).forEach(l => Object.assign(I18N[l], EXTRA3[l]));
const EXTRA4 = {
  kk: { vipLocked: 'Ludo VIP', vipLockedP: '7 досыңды шақыр — 7 күнге VIP ал', vipActive: 'VIP белсенді', vipActiveP: 'Барлық мүмкіндіктер ашық. Профиліңізде сары түсті VIP белгісі көрінеді.',
    vipProg: 'Шақырылды: {n} / {m}', vipLeft: 'Қалды: {t}', vipFmtD: '{d} күн {h} сағ', vipFmtH: '{h} сағ {m} мин',
    vipInvite: 'Достарды шақыру',
    vipHow: '7 дос шақырсаң — 7 күнге VIP аласың. Бұрын қосылған достар есептелмейді, санақ 0-ден басталады. 7 күн біткен соң қайтадан 7 дос шақырып, тағы 7 күн ала аласың. Дос сілтемемен ботқа бірінші рет кіріп, «Бастау» басқанда ғана есептеледі.',
    vp1: 'Ойынды қарағанда чатқа жазу', vp1d: 'Басқалардың ойынын қарап отырып чатты көресіз және жаза аласыз. VIP-сіз көрермендер чатты аша алмайды.',
    vp2: 'Барлық тас түрлері', vp2d: 'Дүкендегі барлық тастар VIP мерзімі бойы ашық.',
    vp3: 'Профильде VIP белгісі', vp3d: 'Ойында және профильде атыңыздың жанында сары түсті VIP белгісі тұрады.',
    vp4: 'Таңдауыңыз қарсыласқа көрінеді', vp4d: 'Ойында сіз таңдаған тас қарсыластарыңызға көрінеді.' },
  uz: { vipLocked: 'Ludo VIP', vipLockedP: '7 do‘stingni taklif qil — 7 kunga VIP ol', vipActive: 'VIP faol', vipActiveP: 'Barcha imkoniyatlar ochiq. Profilingizda sariq VIP belgisi ko‘rinadi.',
    vipProg: 'Taklif qilindi: {n} / {m}', vipLeft: 'Qoldi: {t}', vipFmtD: '{d} kun {h} soat', vipFmtH: '{h} soat {m} daq',
    vipInvite: 'Do‘stlarni taklif qilish',
    vipHow: '7 do‘st taklif qilsang — 7 kunga VIP olasan. Avval qo‘shilgan do‘stlar hisobga olinmaydi, hisob 0 dan boshlanadi. 7 kun tugagach, yana 7 do‘st taklif qilib, yana 7 kun olishing mumkin. Do‘st havola orqali botga birinchi marta kirib, «Start» bossagina hisoblanadi.',
    vp1: 'O‘yin ko‘rganda chatga yozish', vp1d: 'Boshqalarning o‘yinini ko‘rib turib chatni ko‘rasiz va yoza olasiz. VIP bo‘lmagan tomoshabinlar chatni ocha olmaydi.',
    vp2: 'Barcha tosh turlari', vp2d: 'Do‘kondagi barcha toshlar VIP muddati davomida ochiq.',
    vp3: 'Profilda VIP belgisi', vp3d: 'O‘yinda va profilda ismingiz yonida sariq VIP belgisi turadi.',
    vp4: 'Tanlovingiz raqibga ko‘rinadi', vp4d: 'O‘yinda siz tanlagan tosh raqiblaringizga ko‘rinadi.' },
  ru: { vipLocked: 'Ludo VIP', vipLockedP: 'Пригласи 7 друзей — получи VIP на 7 дней', vipActive: 'VIP активен', vipActiveP: 'Все возможности открыты. В профиле виден жёлтый значок VIP.',
    vipProg: 'Приглашено: {n} / {m}', vipLeft: 'Осталось: {t}', vipFmtD: '{d} д {h} ч', vipFmtH: '{h} ч {m} мин',
    vipInvite: 'Пригласить друзей',
    vipHow: 'Пригласи 7 друзей и получи VIP на 7 дней. Ранее добавленные друзья не учитываются, отсчёт начинается с 0. Когда 7 дней закончатся, можно снова пригласить 7 друзей и получить ещё 7 дней. Засчитывается, только если друг впервые зашёл в бота по твоей ссылке и нажал «Старт».',
    vp1: 'Писать в чат при просмотре игры', vp1d: 'Вы видите чат и пишете в него при просмотре игры. Зрители без VIP не могут открыть чат.',
    vp2: 'Все виды фишек', vp2d: 'Все фишки из магазина доступны на срок VIP.',
    vp3: 'Значок VIP в профиле', vp3d: 'В игре и в профиле рядом с именем стоит жёлтый значок VIP.',
    vp4: 'Ваш выбор виден сопернику', vp4d: 'Выбранные вами фишки видны соперникам в игре.' }
};
Object.keys(EXTRA4).forEach(l => Object.assign(I18N[l], EXTRA4[l]));
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


/* ---------- Дыбыстар (Web Audio, файл керек емес) ---------- */
const SFX = (() => {
  let ctx = null, NB = null, master = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function ready() {
    try {
      if (ctx && ctx.state === 'closed') { ctx = null; master = null; }
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
        NB = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
        const d = NB.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      return ctx.state === 'running';
    } catch (e) { return false; }
  }
  /* үнсіз буфер: iOS/Android дыбыс жүйесін оятады */
  function wake() {
    if (!ready() && !ctx) return;
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  function click(t, f, q, dur, v) {
    const s = ctx.createBufferSource(); s.buffer = NB;
    const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(b); b.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function tone(t, type, f1, f2, dur, v) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  const play = fn => { if (ready()) { try { fn(ctx.currentTime + 0.02); } catch (e) {} } };
  return {
    /* басқанда: ctx iOS-та «interrupted/suspended» болып қалса, жаңадан жасаймыз */
    unlock() { if (ctx && ctx.state !== 'running') { try { ctx.close(); } catch (e) {} ctx = null; master = null; } wake(); },
    soft() { if (ctx) ready(); },
    /* кубик: жоғары өрлейтін тиктер + соңында «поп» */
    roll() { play(t => {
      for (let i = 0; i < 7; i++) { tone(t + i * 0.055, 'triangle', 600 + i * 120, 0, 0.05, 0.35); click(t + i * 0.055, 3500, 5, 0.02, 0.3); }
      tone(t + 0.42, 'sine', 900, 450, 0.15, 0.5);
    }); },
    /* тас жүргенде: жұмсақ поп */
    step() { play(t => { tone(t, 'sine', 700, 350, 0.1, 0.5); }); },
    /* жұлдызға тұрғанда: қоңырау */
    star() { play(t => { tone(t, 'sine', 988, 0, 0.6, 0.3); tone(t + 0.12, 'sine', 1319, 0, 0.8, 0.3); tone(t + 0.12, 'sine', 2638, 0, 0.3, 0.06); }); },
    /* тас жегенде: төмен түсетін қапа дыбыс */
    capture() { play(t => { tone(t, 'triangle', 440, 330, 0.2, 0.4); tone(t + 0.2, 'triangle', 330, 200, 0.4, 0.4); }); }
  };
})();
/* браузер дыбысты тек бірінші басқаннан кейін ашады */
['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => SFX.unlock(), { passive: true }));
/* мини-аппқа қайта кіргенде / Telegram-ға оралғанда дыбыс жүйесін қайта қосу */
document.addEventListener('visibilitychange', () => { if (!document.hidden) SFX.soft(); });
window.addEventListener('focus', () => SFX.soft());
window.addEventListener('pageshow', () => SFX.soft());
try { tg && tg.onEvent && (tg.onEvent('activated', () => SFX.soft()), tg.onEvent('viewportChanged', () => SFX.soft())); } catch (e) {}

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
  updNav(); onScreen(id);
}
function toast(text, bottom) {
  const el = $('toast'); el.textContent = text; el.classList.toggle('toast-bottom', !!bottom);
  el.style.top = bottom ? 'auto' : ''; el.style.bottom = bottom ? 'calc(env(safe-area-inset-bottom, 0px) + 28px)' : '';
  el.style.maxWidth = bottom ? 'calc(100% - 28px)' : ''; el.style.textAlign = bottom ? 'center' : '';
  el.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 2600);
}
const send = o => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); };
function haptic(kind) { try { if (tg && tg.platform === 'android') return; tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(kind); } catch (e) {} }   // Android-та діріл өшірулі

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
  h += '<linearGradient id="pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d929e"/><stop offset=".3" stop-color="#ffffff"/><stop offset=".65" stop-color="#d5d8df"/><stop offset="1" stop-color="#7a7f8b"/></linearGradient>' + extraDefs() + '</defs>';
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
  h += `<rect width="15" height="15" fill="none" stroke="#222" stroke-width=".08"/><g id="medals"></g><g id="fx"></g><g id="toks"></g>`;
  $('board').innerHTML = h;
}

/* ---------- Фишкалар: күміс «пин» + түсті шар + қызыл-қоңыр сақина ---------- */
const tokEls = {};
const SVGNS = 'http://www.w3.org/2000/svg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PIN = 'M0 -.02C-.2 -.3 -.4 -.45 -.4 -.66A.4 .4 0 1 1 .4 -.66C.4 -.45 .2 -.3 0 -.02Z';
function tokEl(key, c) {
  if (tokEls[key]) return tokEls[key];
  const sk = skinOfColor(c);
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'tok');
  g.innerHTML = '<circle class="halo" r=".52" cy="-.3"/>' + '<circle r=".5" cy="-.45" fill="transparent"/>' +
    '<ellipse class="gring" rx=".3" ry=".27" fill="none" stroke="#8c2323" stroke-width=".075"/>' +
    '<g class="lift">' +
    `<path d="${PIN}" fill="#000" fill-opacity=".28" transform="translate(.07 .05)"/>` +
    `<path d="${PIN}" fill="url(#bp_${sk})" stroke="${SKINS[sk].stroke}" stroke-width=".035"/>` +
    headShape(sk, `url(#ph${c})`, CD[c]) +
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
  const pick = [];
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
    el.onclick = null;
    if (can) pick.push({ i: it.i, x, y: y - 0.35 });
  });
  S.pick = pick;
  // төмендегі фишка алдында тұрсын (тереңдік), таңдалатындар ең үстінде
  const all = Object.values(tokEls);
  const order = all.filter(el => !el.classList.contains('can')).sort((a, b) => (a._y || 0) - (b._y || 0))
    .concat(all.filter(el => el.classList.contains('can')));
  const cur = Array.from($('toks').children);
  if (order.length !== cur.length || order.some((el, k) => el !== cur[k])) order.forEach(el => $('toks').appendChild(el));
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
    S.animating = true; S.animAt = Date.now(); S.pick = [];
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
// нақты 3D текше: 6 беті бар, тұрған орнында секіріп, айналып, лақтырылған санмен қонады
function cubeFaces(v) {
  const pairs = [[1, 6], [2, 5], [3, 4]];
  const rest = pairs.filter(p => p[0] !== v && p[1] !== v);
  const val = { front: v, back: 7 - v, right: rest[0][0], left: rest[0][1], top: rest[1][0], bottom: rest[1][1] };
  return Object.keys(val).map(k => {
    const on = PIPS[val[k]] || [];
    let h = '';
    for (let q = 0; q < 9; q++) h += '<i' + (on.includes(q) ? ' class="on"' : '') + '></i>';
    return '<div class="face ' + k + '">' + h + '</div>';
  }).join('');
}
function rollDie(c, v) {
  const d = dieEl(c);
  if (!d) return;
  S.dieBusy[c] = true; S.dieBusyAt = Date.now();
  clearTimeout(d._rt);
  const old = d.querySelector('.cube'); if (old) old.remove();
  d.classList.remove('land', 'ready');
  const cube = document.createElement('div');
  cube.className = 'cube';
  cube.innerHTML = cubeFaces(v);
  d.appendChild(cube);
  d.classList.add('rolling3d');
  const pc = $('card' + c); if (pc) pc.classList.add('rollz');
  SFX.roll();
  d._rt = setTimeout(() => {
    setDie(c, v);
    cube.remove();
    d.classList.remove('rolling3d');
    void d.offsetWidth; d.classList.add('land');
    setTimeout(() => d.classList.remove('land'), 520);
    S.dieBusy[c] = false;
    const pc2 = $('card' + c); if (pc2) pc2.classList.remove('rollz');
    if (S.latest) renderGame(S.latest);
  }, 600);
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
    el.dataset.skin = skinKey(seat.skin); applySkinVars(el, seat.skin);
    el.classList.toggle('vip', Boolean(seat.vip));
    el.classList.toggle('done', seat.place != null);
    if (el.dataset.uid !== seat.id) {
      el.dataset.uid = seat.id;
      el.innerHTML = '<div class="ava"></div><div class="nm"><b></b><div class="sub"><span class="hearts"><i></i><i></i><i></i></span><span class="gonemark"></span><span class="tm"></span></div></div><span class="vipbadge">VIP</span>' +
        '<button class="die" type="button" aria-label="dice"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></button>';
      el.onclick = () => { const d = el.querySelector('.die'); if (d && d.classList.contains('ready')) { d.classList.remove('ready'); send({ t: 'roll' }); } };
      setAva(el.querySelector('.ava'), seat);
      S.dieBusy[c] = false;
    }
    el.classList.toggle('gone', Boolean(seat.left));
    el.querySelector('.gonemark').textContent = seat.left && seat.place == null ? '🚪 ' + t('leftMark') : seat.place != null ? placeLabel(seat) : '';
    el.classList.toggle('act', g.turn === c && g.winner === null && !seat.left);
    const lives = seat.lives == null ? 3 : seat.lives;
    el.querySelectorAll('.hearts i').forEach((p, i) => p.classList.toggle('on', i < lives));
    el.querySelector('b').textContent = seat.id === S.me.id ? t('you') : seat.name;
    if (!S.dieBusy[c]) setDie(c, seat.dice);
    el.querySelector('.die').classList.toggle('ready', seat.id === S.me.id && g.turn === c && g.phase === 'roll' && g.winner === null && !S.dieBusy[c]);
  }

  syncTokens(g);
  $('btnChatG').classList.toggle('lock', Boolean(g.spectator && !(S.info && S.info.vip)));
  renderMedals(g);
  updStk(g, mine);

  const turnSeat = g.seats.find(s => s.color === g.turn);
  let hintTxt = '';
  if (g.winner === null) {
    if (g.spectator) hintTxt = '👁 ' + t('watching') + (g.viewers > 1 ? ' · ' + g.viewers : '');
    else if (myTurn && g.phase === 'roll') hintTxt = '🎲 ' + t('hintRoll');
    else if (myTurn && g.phase === 'move') hintTxt = '👆 ' + t('hintMove');
    else if (turnSeat && g.phase !== 'over') hintTxt = turnSeat.name + ' ' + t('hintOther');
  }
  const hintEl = $('hint');
  hintEl.textContent = hintTxt;
  hintEl.classList.toggle('empty', !hintTxt);
  hintEl.classList.toggle('mine', Boolean(hintTxt && myTurn && g.winner === null && !g.spectator));
  hintEl.style.setProperty('--hc', C[g.turn] || '#9aa0c4');
  if (myTurn && !S.lastTurnMine) haptic('success');
  S.lastTurnMine = myTurn;

  if (g.winner !== null) {
    const show = () => {
      if (!S.game || S.game.winner === null) return;
      renderOver(S.game);
      $('fin').classList.add('hidden');
      $('over').classList.remove('hidden');
    };
    if (S.animating) setTimeout(show, 1800); else show();
  } else { $('over').classList.add('hidden'); checkFin(g, mine); }
}

/* ---------- Чат ---------- */
function renderChat() {
  const box = $('chatList');
  box.innerHTML = '';
  const locked = Boolean(S.game && S.game.spectator && !(S.info && S.info.vip));
  $('chat').classList.toggle('locked', locked);
  if (locked) { box.innerHTML = '<div class="clock"><i>🔒</i>' + t('chatLocked') + '</div>'; return; }
  S.chat.forEach(m => {
    const mineMsg = S.me && m.id === S.me.id;
    const row = document.createElement('div'); row.className = 'cm' + (mineMsg ? ' me' : '');
    const n = document.createElement('b'); n.textContent = mineMsg ? t('you') : m.name; n.style.color = m.color !== null && m.color !== undefined ? CL[m.color] : '#c9cff0';
    if (m.vip) n.className = 'vipn';
    if (m.spec) { const sp = document.createElement('span'); sp.className = 'spec'; sp.textContent = '👁 ' + t('viewer'); n.appendChild(sp); }
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

function unfreeze() {
  S.animating = false;
  for (const k in S.dieBusy) S.dieBusy[k] = false;
  document.querySelectorAll('.die .cube').forEach(e => e.remove());
  document.querySelectorAll('.die.rolling3d').forEach(e => e.classList.remove('rolling3d'));
  document.querySelectorAll('.pcard.rollz').forEach(e => e.classList.remove('rollz'));
  if (S.game && S.latest && S.screen === 'game') { S.moveSeq = S.latest.moveSeq; renderGame(S.latest); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) unfreeze(); });
function tick() {
  tickExtra();
  // кубик «қатып» қалмауы үшін: 2.5 сек артық бос емес болса, босатамыз
  let freed = false;
  for (const k in S.dieBusy) if (S.dieBusy[k] && Date.now() - (S.dieBusyAt || 0) > 2500) { S.dieBusy[k] = false; freed = true; }
  if (freed && S.latest && S.screen === 'game') renderGame(S.latest);
  // серверге 3 сек сайын белгі жібереміз: мерзімі өткен гезекті сервер бірден жаңартады
  if (S.screen === 'game' && S.game && S.game.winner === null && Date.now() - (S.pingAt || 0) > 3000) { S.pingAt = Date.now(); send({ t: 'ping' }); }
  if (S.animating && S.animAt && Date.now() - S.animAt > 7000) unfreeze();
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
  if (p.vip) row.classList.add('isvip');   // VIP: алтын ат + VIP белгісі
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
  if (qs.get('mock')) return mockInit();
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  S.ws = ws;
  ws.onopen = () => {
    $('conn').classList.add('hidden');
    const dev = qs.get('dev');
    send({ t: 'auth', initData: (tg && tg.initData) || '', dev: dev ? { id: dev, name: dev } : undefined });
  };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
  ws.onclose = () => {
    if (S.ws !== ws || S.blocked) return;
    $('conn').classList.remove('hidden');
    if (!S.noReconnect) setTimeout(connect, 1500);
  };
}
setInterval(() => send({ t: 'ping' }), 25000);

function showStats(w, g) {
  const el = $('meStats');
  if (el) el.textContent = '';   // «2 / 6» жазуы алынды
}

function onMsg(m) {
  switch (m.t) {
    case 'hello':
      S.me = m.me; S.bot = m.bot || ''; S.app = m.app || ''; S.dnd = Boolean(m.dnd);
      S.catalog = m.catalog || []; applyMe(m.info);
      if (pendingRef) { send({ t: 'ref', id: pendingRef }); pendingRef = ''; }
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
    case 'stats':
      showStats(m.wins, m.games);
      break;
    case 'me': applyMe(m); break;
    case 'invoice': openInvoice(m); break;
    case 'vip_unlocked': toast(t('vipUnlocked')); haptic('success'); break;
    case 'sticker': popSticker(m.color, m.e); break;
    case 'kicked':
      toast(t('kicked')); haptic('error');
      break;
    case 'idle':
      S.room = null; S.queue = null; S.game = null; S.chat = []; S.unread = 0; updBadge(); $('chat').classList.add('hidden');
      $('over').classList.add('hidden'); $('fin').classList.add('hidden'); $('stk').classList.add('hidden');
      if (!['players', 'vip', 'shop'].includes(S.screen)) { show('menu'); reqPlayers(); }
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
      toast(m.code === 'pinvite_cool' ? t('pinvite_cool') + ' ' + fmtSec(m.left || 0) : t(m.code), m.code === 'pinvite_dnd');
      if (S.screen === 'players') reqPlayers();
      break;
    case 'replaced':
      S.noReconnect = true; toast(t('replaced'));
      break;
    case 'blocked': {
      S.noReconnect = true; S.blocked = true;
      $('conn').classList.add('hidden');
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#12141c;color:#fff;font:600 22px/1.3 system-ui,sans-serif;text-align:center;padding:24px';
      ov.innerHTML = '<div style="font-size:64px">🚫</div><div></div>';
      ov.lastChild.textContent = t('blocked');
      document.body.appendChild(ov);
      break;
    }
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
  openAsk(isDone() ? 'exit' : 'surrender');
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

$('board').addEventListener('pointerdown', e => {
  const pk = S.pick;
  if (!pk || !pk.length || S.animating) return;
  const svg = $('board'), m = svg.getScreenCTM();
  if (!m) return;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(m.inverse());
  let best = null, bd = 1.2;
  pk.forEach(k => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; best = k; } });
  if (!best) return;
  e.preventDefault();
  S.pick = [];
  haptic('success');
  send({ t: 'move', i: best.i });
  setTimeout(() => { if (S.latest && !S.animating && S.screen === 'game') renderTokens(S.latest); }, 1500);
});


/* ====================================================================
   ЖАҢА БӨЛІМДЕР: төменгі мәзір, рейтинг, VIP, дүкен, орындар/медальдар, стикерлер
   ==================================================================== */
const FPRICE = 15;                                   // барлық скин бағасы (Telegram Stars)
const MEDAL = n => ['🥇', '🥈', '🥉', '4️⃣'][n - 1] || String(n);
const SKIN_IDS = ['classic', 'obsidian', 'gold', 'crystal', 'fire', 'ice', 'neon'];
// Әр скиннің көрінісі: пин градиенті, жиек, гем-бас, кубик түсі
const SKINS = {
  classic:  { pin: ['#8d929e', '#ffffff', '#d5d8df', '#7a7f8b'], stroke: '#2b2f3a', gem: false, bg: 'linear-gradient(145deg,#ffffff,#eef0f7 45%,#c9cedf)', pip: '#111' },
  obsidian: { pin: ['#07070b', '#4b4b5c', '#17171f', '#030305'], stroke: '#000', gem: false, bg: 'linear-gradient(145deg,#33343f,#17181f 55%,#09090d)', pip: '#f2f2f7' },
  gold:     { pin: ['#946108', '#ffe58a', '#e2a92b', '#74500a'], stroke: '#6b4a06', gem: false, bg: 'linear-gradient(145deg,#ffe896,#ebb73e 55%,#bb841c)', pip: '#4a3000' },
  crystal:  { pin: ['#b7dcfb', '#ffffff', '#d0eafe', '#8fc3ef'], stroke: '#5aa0d8', gem: true, bg: 'linear-gradient(145deg,#e9f6ff,#b9dcfb 55%,#88bef1)', pip: '#0f3f73' },
  fire:     { pin: ['#4d0b00', '#ff9a2a', '#e8410c', '#340700'], stroke: '#340700', gem: false, bg: 'linear-gradient(145deg,#ffb347,#ff5a1f 55%,#b81d00)', pip: '#fff7e0' },
  ice:      { pin: ['#6fa7c9', '#f4fcff', '#c1e8f8', '#5e93b5'], stroke: '#2f6b8e', gem: true, bg: 'linear-gradient(145deg,#f3fcff,#c0eafb 55%,#8fd1ef)', pip: '#0b4a6e' },
  neon:     { pin: ['#2a0a4d', '#b774ff', '#6a2cd6', '#10031f'], stroke: '#0b0220', gem: false, glow: '#b36bff', bg: 'linear-gradient(145deg,#2c0f59,#12062b)', pip: '#4dffb8' }
};
const skinKey = k => (SKINS[k] ? k : 'classic');
function skinOfColor(c) {
  const g = S.game || S.latest;
  const s = g && g.seats.find(x => x.color === c);
  return skinKey(s && s.skin);
}
function pinStops(sk) { return [0, .3, .65, 1].map((o, i) => `<stop offset="${o}" stop-color="${SKINS[sk].pin[i]}"/>`).join(''); }
function extraDefs() {
  return SKIN_IDS.map(id => `<linearGradient id="bp_${id}" x1="0" y1="0" x2="1" y2="0">${pinStops(id)}</linearGradient>`).join('') +
    [['#fff2a8', '#f2b705', '#a87300'], ['#ffffff', '#c9d0dc', '#7c8596'], ['#ffd5a6', '#cd7f32', '#7a4414'], ['#d9dce3', '#9097a6', '#565d6c']]
      .map((s, i) => `<radialGradient id="mg${i + 1}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${s[0]}"/><stop offset=".55" stop-color="${s[1]}"/><stop offset="1" stop-color="${s[2]}"/></radialGradient>`).join('');
}
function headShape(sk, fill, stroke) {
  const d = SKINS[sk];
  const glow = d.glow ? `<circle cy="-.66" r=".36" fill="${d.glow}" opacity=".28"/>` : '';
  const head = d.gem
    ? `<polygon points="0,-.98 .28,-.66 0,-.34 -.28,-.66" fill="${fill}" stroke="${stroke}" stroke-width=".035" stroke-linejoin="round"/>`
    : `<circle cy="-.66" r=".25" fill="${fill}" stroke="${stroke}" stroke-width=".035"/>`;
  return glow + head;
}

/* ---------- Төменгі мәзір ---------- */
const NAVS = ['menu', 'vip', 'shop'];
function updNav() {
  $('nav').classList.toggle('hidden', !NAVS.includes(S.screen));
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === S.screen));
}
function onScreen(id) {
  if (id === 'vip') { send({ t: 'me_get' }); renderVip(); }
  if (id === 'shop') { send({ t: 'me_get' }); renderShop(); }
}
document.querySelectorAll('#nav button').forEach(b => { b.onclick = () => show(b.dataset.go); });

/* ---------- Профиль / ұпай ақпараты ---------- */
S.info = null; S.catalog = []; S.finFor = null;
function applyMe(info) {
  if (!info) return;
  S.info = info;
  info.endAt = info.vip && info.left ? Date.now() + info.left : 0;
  showStats(info.wins, info.games);
  const ring = $('meRing');
  if (ring) ring.classList.toggle('novip', !info.vip);
  $('meName').classList.toggle('vipname', Boolean(info.vip));
  if (S.screen === 'vip') renderVip();
  if (S.screen === 'shop') renderShop();
}

/* ---------- VIP ---------- */
function refLink() {
  const id = S.me ? S.me.id : '';
  return `https://t.me/${S.bot}?start=ref_${id}`;   // дос боттың жеке чатына түсіп «Бастау» басады
}
function fmtLeft(ms) {
  const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d > 0 ? t('vipFmtD').replace('{d}', d).replace('{h}', h) : t('vipFmtH').replace('{h}', h).replace('{m}', m % 60);
}
function renderVip() {
  const info = S.info || { vip: false, refs: 0, need: 7 };
  const need = info.need || 7;
  $('vipCard').classList.toggle('on', Boolean(info.vip));
  $('vipH').textContent = '👑 ' + t('vipActive');
  $('vipP').textContent = info.vip ? t('vipActiveP') : t('vipLockedP');
  $('vipBar').innerHTML = Array.from({ length: need }, (_, i) => `<i class="${i < info.refs ? 'on' : ''}"></i>`).join('');
  $('vipCnt').textContent = info.vip
    ? t('vipLeft').replace('{t}', fmtLeft((info.endAt || 0) - Date.now()))
    : t('vipProg').replace('{n}', Math.min(info.refs, need)).replace('{m}', need);
  const perks = [['💬', 'vp1'], ['🎲', 'vp2'], ['<span style="font-size:12px;font-weight:900;letter-spacing:.5px;padding:3px 8px;border-radius:999px;background:linear-gradient(180deg,#f9d878,#e8b04e);color:#2a1c00">VIP</span>', 'vp3'], ['👁', 'vp4']];
  $('vipPerks').innerHTML = perks.map(p => `<li><i>${p[0]}</i><div><b>${t(p[1])}</b><span>${t(p[1] + 'd')}</span></div></li>`).join('');
}
// VIP мерзімі біткенде экранды жаңартамыз
setInterval(() => {
  const i = S.info;
  if (!i || !i.vip) return;
  if (i.endAt && Date.now() >= i.endAt) { i.vip = false; i.refs = 0; applyMe(i); send({ t: 'me_get' }); }
  else if (S.screen === 'vip') renderVip();
}, 15000);
$('btnVipInv').onclick = () => {
  if (!S.bot || S.bot === 'YOUR_BOT_USERNAME') return toast(t('noBot'));
  const url = 'https://t.me/share/url?url=' + encodeURIComponent(refLink()) + '&text=' + encodeURIComponent(t('refText'));
  if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
};

/* ---------- Дүкен ---------- */
function previewSVG(id) {
  const d = SKINS[id];
  let defs = `<linearGradient id="${id}_p" x1="0" y1="0" x2="1" y2="0">${pinStops(id)}</linearGradient>`;
  let body = '';
  for (let c = 0; c < 4; c++) {
    defs += `<radialGradient id="${id}_h${c}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${CL[c]}"/><stop offset=".55" stop-color="${C[c]}"/><stop offset="1" stop-color="${CD[c]}"/></radialGradient>`;
    body += `<g transform="translate(${c * 1.15},0)"><ellipse cy="0" rx=".34" ry=".08" fill="#000" opacity=".18"/>` +
      `<path d="${PIN}" fill="url(#${id}_p)" stroke="${d.stroke}" stroke-width=".035"/>` +
      headShape(id, `url(#${id}_h${c})`, CD[c]) +
      '<ellipse cx="-.08" cy="-.75" rx=".09" ry=".05" fill="#fff" fill-opacity=".65" transform="rotate(-30 -.08 -.75)"/></g>';
  }
  return `<svg viewBox="-.55 -1.15 4.45 1.3" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
}
function renderShop() {
  const info = S.info || { skins: [], vip: false, skin: 'classic' };
  $('shopVip').classList.toggle('hidden', !info.vip);
  const box = $('shopGrid');
  box.innerHTML = '';
  const cat = S.catalog.length ? S.catalog : SKIN_IDS.map(id => ({ id, price: id === 'classic' ? 0 : FPRICE, stickers: [] }));
  cat.forEach(sk => {
    const d = SKINS[sk.id];
    if (!d) return;
    const owned = sk.id === 'classic' || info.vip || (info.skins || []).includes(sk.id);
    const cur = (info.skin || 'classic') === sk.id;
    const card = document.createElement('div');
    card.className = 'sk' + (cur ? ' eq' : '');
    card.style.setProperty('--diebg', d.bg); card.style.setProperty('--pip', d.pip);
    const pips = [0, 2, 3, 5, 6, 8].map(i => i); // 6 нүкте
    card.innerHTML = `<div class="pv">${previewSVG(sk.id)}<div class="dmini">${Array.from({ length: 9 }, (_, i) => `<i class="${pips.includes(i) ? 'on' : ''}"></i>`).join('')}</div></div>` +
      `<h4></h4><p></p>` + (sk.stickers && sk.stickers.length ? `<div class="stks">+ 4 ${t('stkInter')}</div><div class="stk4">${sk.stickers.map(e => `<span>${e}</span>`).join('')}</div>` : '<div class="stk4"></div>');
    card.querySelector('h4').textContent = t('sk_' + sk.id);
    card.querySelector('p').textContent = t('sk_' + sk.id + '_d');
    const btn = document.createElement('button');
    btn.type = 'button';
    if (cur) { btn.className = 'cur'; btn.textContent = '✓ ' + t('equipped'); btn.disabled = true; }
    else if (owned) {
      btn.className = info.vip && sk.id !== 'classic' && !(info.skins || []).includes(sk.id) ? 'vipopen' : 'own';
      btn.textContent = btn.className === 'vipopen' ? '👑 ' + t('equip') : t('equip');
      btn.onclick = () => { send({ t: 'skin_set', id: sk.id }); };
    } else {
      btn.textContent = '⭐ ' + (sk.price || FPRICE);
      btn.onclick = () => { btn.disabled = true; send({ t: 'shop_buy', id: sk.id }); setTimeout(() => { btn.disabled = false; }, 2500); };
    }
    card.appendChild(btn);
    box.appendChild(card);
  });
}
function openInvoice(m) {
  if (tg && tg.openInvoice) {
    tg.openInvoice(m.url, st => { if (st === 'paid') { toast(t('paid')); haptic('success'); send({ t: 'me_get' }); } });
  } else window.open(m.url, '_blank');
}

/* ---------- Ойын: орындар, медальдар, финиш экраны ---------- */
const mineSeat = g => g && S.me ? g.seats.find(s => s.id === S.me.id) : null;
const isDone = () => Boolean(S.game && (S.game.spectator || (mineSeat(S.game) && mineSeat(S.game).place != null)));
const placeLabel = s => MEDAL(s.place) + (s.pts ? ' +' + s.pts : '');
function applySkinVars(el, id) { const d = SKINS[skinKey(id)]; el.style.setProperty('--diebg', d.bg); el.style.setProperty('--pip', d.pip); }
function renderMedals(g) {
  let h = '';
  g.seats.forEach(s => {
    if (s.place == null) return;
    const cx = ZONES[s.color][0] + 3, cy = ZONES[s.color][1] + 3, n = Math.min(4, s.place);
    h += `<g transform="translate(${cx} ${cy})"><polygon points="-.55,-1.25 -.05,-.1 -.75,-.15" fill="#c0392b"/><polygon points=".55,-1.25 .05,-.1 .75,-.15" fill="#2c6fd1"/>` +
      `<circle r="1.02" cy=".35" fill="url(#mg${n})" stroke="rgba(0,0,0,.45)" stroke-width=".06"/><circle r=".78" cy=".35" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".05"/>` +
      `<text y=".83" text-anchor="middle" font-size="1.35" font-weight="900" font-family="system-ui,sans-serif" fill="rgba(0,0,0,.65)">${s.place}</text></g>`;
  });
  const el = $('medals');
  if (el && el.dataset.k !== h) { el.dataset.k = h; el.innerHTML = h; }
}
function renderOver(g) {
  const w = g.seats.find(s => s.color === g.winner);
  $('oName').textContent = w ? '🏆 ' + (w.id === S.me.id ? t('you') : w.name) : '';
  $('oName').style.color = C[g.winner];
  const mine = mineSeat(g), om = $('oMine');
  if (mine && mine.place != null && !g.spectator) {
    om.classList.remove('hidden');
    om.textContent = MEDAL(mine.place) + ' ' + t('placeN').replace('{n}', mine.place) + (mine.pts ? ' · ' + t('finPts').replace('{n}', mine.pts) : '');
  } else om.classList.add('hidden');
  const rows = g.seats.slice().sort((a, b) => (a.place == null ? 99 : a.place) - (b.place == null ? 99 : b.place));
  $('oList').innerHTML = '';
  rows.forEach(s => {
    const r = document.createElement('div'); r.className = 'orow' + (mine && s.id === mine.id ? ' me' : '');
    const md = document.createElement('span'); md.className = 'md'; md.textContent = s.place != null ? MEDAL(s.place) : '🚪';
    const nn = document.createElement('span'); nn.className = 'nn'; nn.textContent = s.id === S.me.id ? t('you') : s.name;
    const pp = document.createElement('span'); pp.className = 'pp'; pp.textContent = g.ranked && s.pts ? '+' + s.pts : '';
    r.appendChild(md); r.appendChild(nn); r.appendChild(pp); $('oList').appendChild(r);
  });
}
function checkFin(g, mine) {
  if (!mine || mine.place == null || S.finFor === g.id || g.spectator) return;
  S.finFor = g.id;
  const show = () => {
    if (!S.game || S.game.id !== g.id) return;
    $('finMedal').textContent = MEDAL(mine.place);
    $('finTitle').textContent = mine.place === 1 ? t('finWin') : t('finPlace').replace('{n}', mine.place);
    $('finPts').textContent = g.ranked && mine.pts ? t('finPts').replace('{n}', mine.pts) : '';
    if (S.game.winner === null) $('fin').classList.remove('hidden');
    haptic('success');
  };
  if (S.animating) setTimeout(show, 1800); else setTimeout(show, 400);
}
$('finWatch').onclick = () => $('fin').classList.add('hidden');
$('finMenu').onclick = () => { $('fin').classList.add('hidden'); send({ t: 'leave' }); S.game = null; show('menu'); };

/* ---------- Стикерлер ---------- */
function updStk(g, mine) {
  const btn = $('btnStk');
  const list = mine && !g.spectator && g.winner === null && !mine.left ? ((S.catalog.find(x => x.id === mine.skin) || {}).stickers || []) : [];
  btn.classList.toggle('hidden', !list.length);
  if (!list.length) { $('stk').classList.add('hidden'); return; }
  btn.firstChild.textContent = list[0];
  const key = list.join('');
  if ($('stk').dataset.k !== key) {
    $('stk').dataset.k = key;
    $('stk').innerHTML = list.map((e, i) => `<button type="button" data-k="${i}">${e}</button>`).join('');
    $('stk').querySelectorAll('button').forEach(b => { b.onclick = () => { send({ t: 'sticker', k: Number(b.dataset.k) }); $('stk').classList.add('hidden'); }; });
  }
}
$('btnStk').onclick = () => $('stk').classList.toggle('hidden');
function popSticker(color, e) {
  const card = $('card' + color);
  if (!card) return;
  const r = card.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'stkpop'; el.textContent = e;
  el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + r.height / 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

/* ---------- Сынақ көрінісі: ?mock=menu|vip|shop|game|fin|over (серверсіз макет) ---------- */
function mockInit() {
  const mode = qs.get('mock');
  const names = ['Айгазы', 'Miyirman Utepov', 'Hasil', 'Quruvçi', 'K.K.Dauranbai', 'Aibek', 'Dana', 'Timur'];
  const vip = qs.get('vip') === '1';
  const cat = [['classic', []], ['obsidian', ['💣', '✴️', '👻', '⛈️']], ['gold', ['💰', '🔨', '🧲', '🍾']], ['crystal', ['💎', '💘', '🌈', '💠']], ['fire', ['🔥', '☄️', '🌋', '🧨']], ['ice', ['❄️', '⛄', '🧊', '🌨️']], ['neon', ['👾', '🚀', '🛸', '🪐']]]
    .map(a => ({ id: a[0], price: a[0] === 'classic' ? 0 : FPRICE, stickers: a[1] }));
  onMsg({ t: 'hello', me: { id: '7', name: 'Sen (7)', avatar: null }, bot: 'ludomilliybot', app: '', dnd: false, catalog: cat,
    info: { t: 'me', vip, refs: vip ? 7 : 3, need: 7, pts: 85, wins: 6, games: 21, skin: vip ? 'gold' : 'classic', skins: vip ? [] : ['obsidian'] } });
  if (mode === 'vip') show('vip');
  else if (mode === 'shop') show('shop');
  else if (mode === 'game' || mode === 'fin' || mode === 'over') {
    const seats = [0, 1, 2, 3].map(c => ({ color: c, id: c === 3 ? '7' : 'm' + c, name: names[c], avatar: null, auto: false, left: false, lives: 3, dice: 1 + c * 2 % 6,
      place: mode === 'game' ? (c === 0 ? 1 : null) : [1, 3, 2, 4][c], pts: mode === 'game' ? (c === 0 ? 15 : 0) : [15, 5, 10, 0][c],
      skin: ['gold', 'obsidian', 'crystal', 'classic'][c], vip: c === 0 }));
    if (mode === 'fin') { seats[3].place = 1; seats[3].pts = 15; seats[0].place = null; seats[0].pts = 0; seats[3].skin = 'crystal'; }
    const tokens = [[56, 56, 56, 56], [12, 30, -1, 5], [20, 44, 51, -1], [3, 17, 33, 49]];
    S.me.id = '7';
    onMsg({ t: 'game', spectator: false, viewers: 0, id: 'mock', seats, tokens, turn: 3, phase: 'roll', dice: null, rollSeq: 0, rollColor: null, moveSeq: 0, legal: [],
      ms: 20000, winner: mode === 'over' ? 0 : null, reason: null, last: null, ranked: true });
  }
}

let pendingRef = (qs.get('ref') || '').replace(/\D/g, '');
{ const sp = readStartParam(); if (/^ref_\d+$/i.test(sp)) pendingRef = sp.slice(4); }

buildBoard();
applyI18n();
show('menu');
$('conn').classList.remove('hidden');
connect();
})();
