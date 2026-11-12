import type { CharacterId, GameFile, GameState, LedgerEntry, PhoneAppId, Toast } from '../types';
import { clamp, round2, uid } from '../util';

type D = GameState;

// ───────── event bus (story listens to engine events) ─────────
export type GameEvent =
  | { type: 'trade_done'; orderId: string }
  | { type: 'scam_caught'; orderId?: string; kind: string }
  | { type: 'scam_missed'; orderId?: string; kind: string }
  | { type: 'receipt_saved'; fileId: string }
  | { type: 'transfer'; bank: string; amount: number }
  | { type: 'avito_sold'; itemId: string; price: number }
  | { type: 'job_done'; jobId: string }
  | { type: 'otc_done'; dealId: string; ok: boolean }
  | { type: 'bank_status'; bank: string; status: string }
  | { type: 'block161' }
  | { type: 'request_closed'; bank: string; ok: boolean }
  | { type: 'shop'; itemId: string }
  | { type: 'tax'; regime: string }
  | { type: 'exchange'; what: 'registered' | 'kyc' | '2fa' };

type Listener = (d: D, e: GameEvent) => void;
const listeners: Listener[] = [];
export const onGameEvent = (l: Listener) => listeners.push(l);
export const emit = (d: D, e: GameEvent) => {
  for (const l of listeners) l(d, e);
};

// ───────── notifications & feedback ─────────
export function notify(d: D, app: PhoneAppId | 'system' | 'sms', title: string, body: string, link?: string) {
  d.notifications.unshift({ id: uid('n'), app, title, body, at: d.now, read: false, link });
  if (d.notifications.length > 60) d.notifications.length = 60;
  d.ui.buzz++;
}

export function toast(d: D, kind: Toast['kind'], text: string) {
  d.toasts.push({ id: uid('t'), kind, text, createdAt: Date.now() });
  if (d.toasts.length > 5) d.toasts.shift();
}

/** Artem's inner voice. Only fires when he is attentive enough (or forced). */
export function thought(d: D, text: string, force = false) {
  const att = attention(d);
  if (force || Math.random() * 100 < att) toast(d, 'thought', text);
}

export function sms(d: D, from: string, text: string, fake = false) {
  d.sms.unshift({ id: uid('sms'), from, text, at: d.now, fake, read: false });
  if (d.sms.length > 80) d.sms.length = 80;
  notify(d, 'sms', from, text);
}

export function addFile(d: D, f: Omit<GameFile, 'id' | 'at' | 'sentTo'> & { at?: number }) {
  const file: GameFile = { id: uid('f'), at: f.at ?? d.now, sentTo: [], ...f };
  d.files.unshift(file);
  return file;
}

export function schedule(d: D, delayMin: number, type: string, payload?: Record<string, unknown>) {
  d.scheduled.push({ id: uid('ev'), at: d.now + delayMin, type, payload });
}

// ───────── hero ─────────
export function attention(d: D) {
  const h = d.hero;
  const office = d.hero.home === 'office' ? 10 : 0;
  return Math.round(clamp(0.5 * h.energy + 0.4 * (100 - h.stress) + 10 + h.attentionBonus + office));
}

export function hero(d: D, delta: { energy?: number; stress?: number; attention?: number }) {
  if (delta.energy) d.hero.energy = clamp(d.hero.energy + delta.energy);
  if (delta.stress) d.hero.stress = clamp(d.hero.stress + delta.stress);
  if (delta.attention) d.hero.attentionBonus = clamp(d.hero.attentionBonus + delta.attention, -30, 30);
}

export function trust(d: D, id: CharacterId, delta: number) {
  const c = d.characters[id];
  if (!c) return;
  c.trust = clamp(c.trust + delta);
}

// ───────── economics ─────────
export function ledger(d: D, e: Omit<LedgerEntry, 'id' | 'at' | 'chapter'>) {
  d.ledger.push({ id: uid('l'), at: d.now, chapter: d.chapter, ...e });
  if (d.ledger.length > 1500) d.ledger.splice(0, d.ledger.length - 1500);
  if (e.turnover) d.stats.turnover += e.turnover;
}

/** Weighted-average cost basis of all USDT the player holds. */
export function bookAdd(d: D, qty: number, rubCost: number) {
  const b = d.book;
  const total = b.qty * b.avg + rubCost;
  b.qty = round2(b.qty + qty);
  b.avg = b.qty > 0 ? total / b.qty : d.market.base;
}

export function bookRemove(d: D, qty: number) {
  const b = d.book;
  const avg = b.qty > 0 ? b.avg : d.market.base;
  b.qty = Math.max(0, round2(b.qty - qty));
  return qty * avg;
}

export function profitSince(d: D, from: number) {
  return d.ledger.filter((l) => l.at >= from && PROFIT_KINDS.includes(l.kind)).reduce((s, l) => s + l.rub, 0);
}

export const PROFIT_KINDS: LedgerEntry['kind'][] = ['p2p_sell', 'spot', 'otc', 'fee_sbp', 'fee_maker', 'fee_spot', 'gas', 'loss'];

export function taxRate(d: D) {
  if (d.tax.regime === 'ip_usn') return 0.15;
  if (d.tax.regime === 'npd') return 0.06;
  return 0.13;
}

export function totalRub(d: D) {
  return Object.values(d.banks).reduce((s, b) => s + (b.opened ? b.balance : 0), 0);
}

export function totalUsdt(d: D) {
  const ex = d.exchanges;
  const chainMine = d.chain.filter((c) => c.source !== 'otc').reduce((s, c) => s + c.amount, 0);
  return ex.bybit.usdt + ex.bybit.frozen + ex.rapira.usdt + ex.rapira.frozen + d.wallet.usdtTrc20 + d.wallet.usdtTon + chainMine;
}

export function netWorth(d: D) {
  const m = d.market;
  const crypto = totalUsdt(d) * m.base + d.exchanges.rapira.rub + (d.exchanges.rapira.ton * m.tonUsd + d.exchanges.rapira.btc * m.btcUsd) * m.base;
  const debts = d.obligations.filter((o) => !o.returned).reduce((s, o) => s + o.amount, 0);
  return totalRub(d) + crypto - debts;
}
