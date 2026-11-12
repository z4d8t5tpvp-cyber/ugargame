import { chance, pick, randInt } from '../util';
import type { Merchant } from '../types';

const MALE = ['Денис', 'Игорь', 'Алексей', 'Сергей', 'Дмитрий', 'Андрей', 'Максим', 'Артур', 'Руслан', 'Никита', 'Олег', 'Павел', 'Роман', 'Тимур', 'Владимир', 'Евгений', 'Кирилл', 'Илья', 'Антон', 'Вадим', 'Глеб', 'Егор', 'Станислав', 'Михаил', 'Виктор', 'Ринат', 'Арсений', 'Фёдор'];
const FEMALE = ['Анна', 'Мария', 'Екатерина', 'Ольга', 'Наталья', 'Алина', 'Юлия', 'Дарья', 'Ксения', 'Виктория', 'Светлана', 'Елена', 'Татьяна', 'Полина', 'Кристина', 'Ирина', 'Валерия', 'Зинаида', 'Людмила', 'Галина'];
const PATR_BASE = ['Викторов', 'Андреев', 'Сергеев', 'Александров', 'Дмитриев', 'Игорев', 'Олегов', 'Павлов', 'Романов', 'Владимиров', 'Евгеньев', 'Михайлов', 'Николаев', 'Юрьев', 'Петров', 'Рустамов', 'Анатольев', 'Геннадьев'];
const SURNAMES = ['Соколов', 'Морозов', 'Волков', 'Лебедев', 'Козлов', 'Новиков', 'Попов', 'Васильев', 'Петров', 'Смирнов', 'Фёдоров', 'Михайлов', 'Зайцев', 'Павлов', 'Семенов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Кузнецов', 'Орлов', 'Макаров', 'Никитин', 'Захаров', 'Белов', 'Тарасов', 'Ершов', 'Гусев', 'Киселёв', 'Ильин', 'Широков', 'Гаврилов', 'Рябов', 'Комаров', 'Сорокин', 'Абрамов', 'Тимофеев'];
const ODD_SURNAMES = ['Исмаилов', 'Алиев', 'Каримов', 'Юсупов', 'Ахмедов', 'Рахимов', 'Шарипов'];

export interface PersonName {
  first: string;
  patr: string;
  last: string;
  female: boolean;
  full: string; // "Соколов Денис Викторович"
  masked: string; // "Денис Викторович С."
}

export function makeName(female = chance(0.32)): PersonName {
  const first = pick(female ? FEMALE : MALE);
  const pb = pick(PATR_BASE);
  const patr = female ? (pb.endsWith('ев') && pb !== 'Андреев' && pb !== 'Сергеев' ? pb + 'на' : pb + 'на') : pb + 'ич';
  const baseLast = chance(0.12) ? pick(ODD_SURNAMES) : pick(SURNAMES);
  const last = female ? (baseLast.endsWith('ий') ? baseLast.slice(0, -2) + 'ая' : baseLast + 'а') : baseLast;
  return { first, patr, last, female, full: `${last} ${first} ${patr}`, masked: `${first} ${patr} ${last[0]}.` };
}

export const maskFull = (full: string) => {
  const [last, first, patr] = full.split(' ');
  if (!first) return full;
  return `${first}${patr ? ' ' + patr : ''} ${last[0]}.`;
};

const NICK_A = ['crypto', 'usdt', 'p2p', 'fast', 'exchange', 'trade', 'pay', 'rub', 'swap', 'obmen', 'cash', 'merch', 'tether', 'lucky', 'sber', 'volna'];
const NICK_B = ['king', 'pro', 'master', 'shop', 'team', 'msk', 'spb', 'store', 'deals', 'point', 'line', 'bro', 'go', 'zone'];
const COLORS = ['#F0B90B', '#0ECB81', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#14B8A6', '#EAB308', '#6366F1', '#EF4444', '#22C55E', '#06B6D4'];

export function makeNick(name: PersonName) {
  const r = Math.random();
  if (r < 0.3) return `${pick(NICK_A)}_${pick(NICK_B)}${randInt(1, 99)}`;
  if (r < 0.55) return `${translit(name.first).toLowerCase()}_${pick(NICK_A)}`;
  if (r < 0.75) return `${pick(NICK_A).toUpperCase()}${pick(NICK_B).toUpperCase()}`;
  return `${translit(name.last).toLowerCase()}${randInt(10, 999)}`;
}

const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export const translit = (s: string) => s.split('').map((c) => {
  const l = c.toLowerCase();
  const t = TR[l];
  if (t === undefined) return c;
  return c === l ? t : t.charAt(0).toUpperCase() + t.slice(1);
}).join('');

export function makeMerchant(quality: 'good' | 'mid' | 'shady' = 'good'): Merchant {
  const name = makeName();
  const q = quality;
  return {
    nick: makeNick(name),
    fullName: name.full,
    masked: name.masked,
    completion: q === 'good' ? randInt(96, 100) : q === 'mid' ? randInt(88, 97) : randInt(61, 86),
    orders: q === 'good' ? randInt(300, 9000) : q === 'mid' ? randInt(40, 400) : randInt(1, 25),
    regDays: q === 'good' ? randInt(200, 1600) : q === 'mid' ? randInt(40, 300) : randInt(1, 14),
    verified: q === 'good' ? chance(0.75) : q === 'mid' ? chance(0.2) : false,
    online: chance(0.85),
    color: pick(COLORS),
  };
}

export const AVATAR_COLORS = COLORS;
