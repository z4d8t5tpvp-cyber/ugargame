import type { GameState, TgChat } from '../types';
import { CHARACTERS } from '../data/static';
import { REAL_GUARANTOR, FAKE_GUARANTOR, REAL_GUARANTOR_REQ } from '../engine/otc';
import { fmtPhone, uid } from '../util';

const START = 19 * 60 + 40;

function charChat(id: keyof typeof CHARACTERS, folder: TgChat['folder'] = 'personal', visible = false): TgChat {
  const c = CHARACTERS[id];
  return {
    id,
    title: c.name,
    kind: 'private',
    folder,
    characterId: c.id,
    username: c.username,
    bio: c.bio,
    tgId: c.tgId,
    regYear: c.regYear,
    color: c.color,
    emoji: c.emoji,
    messages: [],
    unread: 0,
    typingUntil: null,
    visible,
  };
}

export function initialChats(): Record<string, TgChat> {
  const t = (min: number) => START - min;
  const lera = charChat('lera', 'personal', true);
  lera.messages = [
    { id: uid('tm'), from: 'me', at: t(4320), kind: 'text', text: 'Лер, в субботу в кино? Новый Нолан вышел' },
    { id: uid('tm'), from: 'lera', at: t(4300), kind: 'text', text: 'посмотрим' },
    { id: uid('tm'), from: 'me', at: t(1500), kind: 'text', text: 'Ты чего не отвечаешь весь день?' },
    { id: uid('tm'), from: 'lera', at: t(95), kind: 'text', text: 'Тём, выйди к подъезду. Надо поговорить.' },
  ];
  const danya = charChat('danya', 'personal', true);
  danya.messages = [
    { id: uid('tm'), from: 'danya', at: t(2880), kind: 'text', text: 'Брат, в субботу бой в Брянске, поедешь болеть? 🥊' },
    { id: uid('tm'), from: 'me', at: t(2870), kind: 'text', text: 'Если денег на автобус наскребу 😅' },
  ];
  const mama: TgChat = {
    id: 'mama', title: 'Мама', kind: 'private', folder: 'personal', username: '@galina_voronova', bio: '🌸', tgId: 900122877, regYear: 2018, color: '#F472B6', emoji: '🌸',
    messages: [{ id: uid('tm'), from: 'mama', fromName: 'Мама', at: t(600), kind: 'text', text: 'Тёма, не забудь куртку, обещали дождь.' }],
    unread: 0, typingUntil: null, visible: true,
  };
  const p2p: TgChat = {
    id: 'p2p_chat', title: 'Чат P2P Россия 🇷🇺', kind: 'group', folder: 'p2p', username: '@p2p_russia_chat', bio: 'Общение P2P-трейдеров. Реклама — бан. Скам — бан. Проверяйте ФИО!', tgId: -1001882203344, regYear: 2021, color: '#0EA5E9', emoji: '💬', members: 18432,
    messages: [], unread: 0, typingUntil: null, visible: false, pinned: '📌 Правила: 1) ФИО отправителя = ФИО на бирже. 2) Третьи лица — только апелляция. 3) Не пишите «USDT» в комментариях к переводам.',
  };
  const news: TgChat = {
    id: 'news', title: 'Крипта & P2P | Новости', kind: 'channel', folder: 'p2p', username: '@p2p_news_ru', bio: 'Курсы, банки, регулирование. Без воды.', tgId: -1001523009871, regYear: 2020, color: '#6366F1', emoji: '📰', members: 64210,
    messages: [], unread: 0, typingUntil: null, visible: false,
  };
  const gReal: TgChat = {
    id: 'garant_real', title: 'Гарант KMI ✅', kind: 'private', folder: 'otc', username: REAL_GUARANTOR, bio: 'Официальный гарант сообщества KMI. Работаем с 2019 года. Реквизиты — только в закрепе.', tgId: 1022233311, regYear: 2019, verified: true, color: '#0ECB81', emoji: '🛡️',
    messages: [], unread: 0, typingUntil: null, visible: false,
    pinned: `📌 Наши реквизиты: ${REAL_GUARANTOR_REQ.holder}, Т-Банк, ${fmtPhone(REAL_GUARANTOR_REQ.phone)}. Других нет!`,
  };
  const gFake: TgChat = {
    id: 'garant_fake', title: 'Гарант KMI ✅', kind: 'private', folder: 'otc', username: FAKE_GUARANTOR, bio: 'Официальный гарант KMI. Быстро, надёжно, 24/7.', tgId: 7712093321, regYear: 2026, verified: false, color: '#0ECB81', emoji: '🛡️',
    messages: [], unread: 0, typingUntil: null, visible: false,
  };
  const otcChat: TgChat = {
    id: 'otc_chat', title: 'OTC Москва | Проверенные', kind: 'group', folder: 'otc', username: '@otc_msk_verified', bio: 'Крупные сделки через гаранта. Только по рекомендации.', tgId: -1001992300112, regYear: 2022, color: '#A855F7', emoji: '🏦', members: 812,
    messages: [], unread: 0, typingUntil: null, visible: false,
  };
  const bot: TgChat = {
    id: 'bybit_bot', title: 'Bybit Russia', kind: 'bot', folder: 'bots', username: '@bybit_ru_official_bot', bio: 'Официальный бот Bybit. Мы никогда не просим ваш пароль и коды 2FA.', tgId: 5800123321, regYear: 2021, verified: true, color: '#F0B90B', emoji: '🟡',
    messages: [], unread: 0, typingUntil: null, visible: false,
  };
  const chats: Record<string, TgChat> = {
    danya, mama, lera, p2p_chat: p2p, news, garant_real: gReal, garant_fake: gFake, otc_chat: otcChat, bybit_bot: bot,
    sanya: charChat('sanya'),
    marat: charChat('marat'),
    karim: charChat('karim'),
    pasha: charChat('pasha'),
    ivan: charChat('ivan'),
    kapul: charChat('kapul', 'otc'),
    grisha: charChat('grisha'),
    max: charChat('max', 'p2p'),
  };
  return chats;
}

export const initialTgOrder = (s: Pick<GameState, 'tg'>) => ['lera', 'danya', 'mama', ...Object.keys(s.tg).filter((k) => !['lera', 'danya', 'mama'].includes(k))];

/** Random chatter for the P2P group chat. */
export const P2P_CHATTER: { name: string; text: string }[] = [
  { name: 'Денис | P2P Тула', text: 'Сбер опять режет переводы после 100к, кто знает как обойти?' },
  { name: 'Лиза Обмен', text: 'Никак не обойти. Открывай второй банк и бери пакет.' },
  { name: 'Рома_крипта', text: 'Мне сегодня закинули от бабушки «за коляску с авито» 🤡 вернул, апелляция' },
  { name: 'Артур MSK', text: 'Правильно сделал. Я в прошлом году отпустил — полгода в 161-ФЗ сидел' },
  { name: 'Вадим', text: 'Кто-нибудь работает с Rapira? Спред сегодня интересный' },
  { name: 'Ника P2P', text: 'Опять какой-то max_zero_arb на копейку ниже всех встал. Откуда у него столько карт?' },
  { name: 'Олег SBP', text: 'Ясно откуда. Дропы. Скоро ляжет.' },
  { name: 'Денис | P2P Тула', text: 'Ребята, а чек обязательно сохранять? Банк запросил 115-ФЗ, а у меня ничего нет 😬' },
  { name: 'Лиза Обмен', text: 'Сохраняй ВСЕ чеки. И выгрузку ордеров. Без них не отобьёшься.' },
  { name: 'Тимур', text: 'Фейковые смс от «900» с обычного номера — новая волна, будьте аккуратны' },
  { name: 'Рома_крипта', text: 'Смотрите выписку в приложении, а не смс. Смс подделать — 5 секунд.' },
  { name: 'Кирилл', text: 'Ночью не торгуйте, банки это очень не любят' },
  { name: 'Ника P2P', text: 'TON на бирже без MEMO отправила, 12 часов ждала поддержку. Урок усвоен' },
];
