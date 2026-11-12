import type { BankId, ExtBankId } from './types';

// ───────── ids & random ─────────
let idCounter = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number) => Math.random() < p;
export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;
export const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
export function weighted<T extends string>(w: Record<T, number>): T {
  const entries = Object.entries(w) as [T, number][];
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

// ───────── money formatting ─────────
const rubFmt2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rubFmt0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export const fmtRub = (n: number, dec: 0 | 2 = 0) => `${(dec ? rubFmt2 : rubFmt0).format(dec ? n : Math.round(n))} ₽`;
export const fmtNum = (n: number, dec = 0) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
export const fmtUsdt = (n: number, withUnit = true) => `${(Math.floor(n * 100 + 1e-6) / 100).toFixed(2)}${withUnit ? ' USDT' : ''}`;
export const fmtPrice = (n: number) => n.toFixed(2);
export const fmtSigned = (n: number) => `${n >= 0 ? '+' : '−'}${fmtRub(Math.abs(n))}`;

// ───────── game time ─────────
// now = game minutes since Monday 2026-09-14 00:00.
const START = Date.UTC(2026, 8, 14, 0, 0, 0);
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MON_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export const gameDate = (now: number) => new Date(START + Math.floor(now) * 60000);
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const clockStr = (now: number) => {
  const d = gameDate(now);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
};
export const dateStr = (now: number) => {
  const d = gameDate(now);
  return `${WD[d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};
export const dateLong = (now: number) => {
  const d = gameDate(now);
  return `${d.getUTCDate()} ${MON_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const dateTimeStr = (now: number) => `${dateStr(now)}, ${clockStr(now)}`;
export const shortDT = (now: number) => {
  const d = gameDate(now);
  return `${pad2(d.getUTCDate())}.${pad2(d.getUTCMonth() + 1)} ${clockStr(now)}`;
};
export const dayIndex = (now: number) => Math.floor(now / 1440);
export const minuteOfDay = (now: number) => ((now % 1440) + 1440) % 1440;
export const hourOf = (now: number) => Math.floor(minuteOfDay(now) / 60);
export const isNight = (now: number) => hourOf(now) < 6;
export const monthKey = (now: number) => {
  const d = gameDate(now);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
};
export const durStr = (min: number) => {
  if (min < 1) return `${Math.max(0, Math.round(min * 60))} сек`;
  if (min < 60) return `${Math.round(min)} мин`;
  if (min < 1440) return `${Math.floor(min / 60)} ч ${Math.round(min % 60)} мин`;
  return `${Math.floor(min / 1440)} дн ${Math.floor((min % 1440) / 60)} ч`;
};
/** mm:ss from game minutes */
export const timerStr = (min: number) => {
  const s = Math.max(0, Math.floor(min * 60));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

// ───────── requisites ─────────
export const digits = (s: string) => s.replace(/\D/g, '');
export const normPhone = (s: string) => {
  let d = digits(s);
  if (d.length === 11 && (d.startsWith('8') || d.startsWith('7'))) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  return d;
};
export const fmtPhone = (s: string) => {
  const d = normPhone(s);
  if (d.length !== 11) return s;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
};
export const fmtCard = (s: string) => digits(s).replace(/(\d{4})(?=\d)/g, '$1 ');
export const maskCard = (s: string) => `•• ${digits(s).slice(-4)}`;

const MOBILE_CODES = ['903', '905', '906', '909', '915', '916', '917', '919', '925', '926', '953', '960', '977', '985', '999', '910', '920', '951'];
export const genPhone = () => `7${pick(MOBILE_CODES)}${randInt(100, 999)}${pad2(randInt(0, 99))}${pad2(randInt(0, 99))}`;

const BIN: Record<ExtBankId, string> = {
  sber: '2202', tbank: '2200', alfa: '2200', vtb: '2200', raif: '2200', ozon: '2204', pochta: '2200',
};
export const genCard = (bank: ExtBankId) => `${BIN[bank]}${randInt(1000, 9999)}${randInt(1000, 9999)}${randInt(1000, 9999)}`;

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const genTrcAddress = () => 'T' + Array.from({ length: 33 }, () => pick(B58.split(''))).join('');
export const genTonAddress = () => 'UQ' + Array.from({ length: 46 }, () => pick(B64.split(''))).join('');
export const shortAddr = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-5)}` : a);
export const addressNetwork = (a: string): 'TRC20' | 'TON' | null => {
  const t = a.trim();
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(t)) return 'TRC20';
  if (/^(UQ|EQ)[A-Za-z0-9_-]{46}$/.test(t)) return 'TON';
  return null;
};

// Deterministic 6-digit TOTP-like code rotating every 30 real seconds.
export const totp = (secret: string, t = Date.now()) => {
  const step = Math.floor(t / 30000);
  let h = 2166136261;
  const s = `${secret}:${step}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(Math.abs(h) % 1000000).padStart(6, '0');
};
export const totpSecondsLeft = (t = Date.now()) => 30 - Math.floor((t / 1000) % 30);
export const genSecret = () => Array.from({ length: 16 }, () => pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.split(''))).join('');

export const BANK_NAMES: Record<ExtBankId, string> = {
  sber: 'Сбербанк',
  tbank: 'Т-Банк',
  alfa: 'Альфа-Банк',
  vtb: 'ВТБ',
  raif: 'Райффайзен',
  ozon: 'Озон Банк',
  pochta: 'Почта Банк',
};
export const BANK_SHORT: Record<ExtBankId, string> = {
  sber: 'Сбер', tbank: 'Т-Банк', alfa: 'Альфа', vtb: 'ВТБ', raif: 'Райф', ozon: 'Озон', pochta: 'Почта',
};
export const isPlayerBank = (b: string): b is BankId => b === 'sber' || b === 'tbank' || b === 'alfa';

export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
