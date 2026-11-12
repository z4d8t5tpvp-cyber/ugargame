import type { AddressInfo, ExchangeId, GameState, Network } from '../types';
import { addressNetwork, chance, fmtUsdt, rand, round2, totp, uid, genTrcAddress, genTonAddress, fmtRub } from '../util';
import { bookAdd, bookRemove, emit, ledger, notify, toast } from './core';
import { SPOT_FEE, WITHDRAW_FEE } from './market';
import { otcUsdtArrived } from './otc';

type D = GameState;

export const GAS = {
  TRC20: { token: 'TRX', amount: 13.6, usdtEq: 1.5 },
  TON: { token: 'TON', amount: 0.05, usdtEq: 0.15 },
} as const;
export const TRX_USD = 0.11;

export function registerAddress(d: D, a: AddressInfo) {
  d.addresses[a.address] = a;
}

export function lookupAddress(d: D, address: string): AddressInfo {
  const a = d.addresses[address.trim()];
  if (a) return a;
  const net = addressNetwork(address) ?? 'TRC20';
  // Unknown addresses: mostly clean, deterministic per address.
  let h = 0;
  for (const c of address) h = (h * 33 + c.charCodeAt(0)) | 0;
  const risk = Math.abs(h) % 100 < 85 ? Math.abs(h) % 18 : 40 + (Math.abs(h) % 50);
  return { address, network: net, owner: 'Неизвестный кошелёк', kind: 'external', aml: { risk, tags: risk > 50 ? ['Высокорисковый обменник'] : [] } };
}

export function amlCheck(d: D, address: string) {
  const net = addressNetwork(address);
  if (!net) return { ok: false as const, error: 'Некорректный адрес TRC-20 / TON' };
  const found = lookupAddress(d, address);
  // Plain copy: callers read the result after the Immer draft is revoked.
  const info: AddressInfo = { ...found, aml: { risk: found.aml.risk, tags: [...found.aml.tags] } };
  d.flags[`aml_${address.trim()}`] = true;
  for (const deal of d.otc) if (deal.clientWallet === address.trim()) deal.amlChecked = true;
  return { ok: true as const, info };
}

function twoFAOk(d: D, ex: ExchangeId, code: string) {
  const e = d.exchanges[ex];
  if (!e.twoFA) return false;
  const now = Date.now();
  return [totp(e.twoFASecret, now), totp(e.twoFASecret, now - 30000)].includes(code.replace(/\s/g, ''));
}

export interface WithdrawParams {
  from: ExchangeId;
  network: Network;
  address: string;
  memo: string;
  amount: number;
  code: string;
}

export function exchangeWithdraw(d: D, p: WithdrawParams) {
  const e = d.exchanges[p.from];
  if (!e.registered) return { ok: false, error: 'Аккаунт не зарегистрирован' };
  if (e.kyc !== 'verified') return { ok: false, error: 'Вывод доступен после верификации' };
  if (!e.twoFA) return { ok: false, error: 'Привяжите Google Authenticator для вывода' };
  const net = addressNetwork(p.address);
  if (!net) return { ok: false, error: 'Неверный формат адреса' };
  if (net !== p.network) return { ok: false, error: `Адрес не соответствует сети ${p.network === 'TRC20' ? 'TRC-20' : 'TON'}` };
  const fee = WITHDRAW_FEE[p.network];
  const amount = round2(p.amount);
  if (amount <= fee) return { ok: false, error: `Сумма должна быть больше комиссии ${fee} USDT` };
  if (amount > e.usdt + 1e-9) return { ok: false, error: `Недостаточно USDT. Доступно ${fmtUsdt(e.usdt)}` };
  if (!twoFAOk(d, p.from, p.code)) return { ok: false, error: 'Неверный код 2FA' };
  const target = d.addresses[p.address.trim()];
  if (target?.kind === 'exchange_deposit' && target.exchange === p.from) return { ok: false, error: 'Нельзя вывести на собственный адрес пополнения' };
  e.usdt = round2(e.usdt - amount);
  const net2 = round2(amount - fee);
  const gasCost = bookRemove(d, fee);
  ledger(d, { kind: 'gas', rub: -round2(gasCost), turnover: 0, usdt: fee, note: `Комиссия вывода ${p.network === 'TRC20' ? 'TRC-20' : 'TON'} (${p.from === 'bybit' ? 'Bybit' : 'Rapira'})` });
  // Coins in flight stay in the book until they land somewhere.
  d.chain.push({
    id: uid('ch'),
    network: p.network,
    amount: net2,
    to: p.address.trim(),
    memo: p.memo.trim() || undefined,
    arriveAt: d.now + (p.network === 'TRC20' ? rand(2.5, 4.5) : rand(0.8, 1.8)),
    fromLabel: p.from === 'bybit' ? 'Bybit' : 'Rapira',
    source: p.from,
  });
  return { ok: true, info: `Вывод ${fmtUsdt(net2)} отправлен в сеть ${p.network === 'TRC20' ? 'TRC-20' : 'TON'}` };
}

export interface WalletSendParams {
  network: Network;
  address: string;
  memo: string;
  amount: number;
}

export function walletSend(d: D, p: WalletSendParams) {
  const w = d.wallet;
  const net = addressNetwork(p.address);
  if (!net) return { ok: false, error: 'Неверный адрес' };
  if (net !== p.network) return { ok: false, error: `Это адрес сети ${net === 'TRC20' ? 'TRC-20 (Tron)' : 'TON'}. Выберите правильную сеть.` };
  const bal = p.network === 'TRC20' ? w.usdtTrc20 : w.usdtTon;
  const amount = round2(p.amount);
  if (!(amount > 0)) return { ok: false, error: 'Введите сумму' };
  if (amount > bal + 1e-9) return { ok: false, error: 'Недостаточно USDT в этой сети' };
  const gas = GAS[p.network];
  const gasBal = p.network === 'TRC20' ? w.trx : w.ton;
  if (gasBal < gas.amount) return { ok: false, error: `Недостаточно ${gas.token} для оплаты комиссии сети (нужно ${gas.amount} ${gas.token}). Обменяйте немного USDT на ${gas.token}.` };
  if (p.network === 'TRC20') {
    w.usdtTrc20 = round2(w.usdtTrc20 - amount);
    w.trx = round2(w.trx - gas.amount);
  } else {
    w.usdtTon = round2(w.usdtTon - amount);
    w.ton = round2(w.ton - gas.amount);
  }
  const gasRub = gas.usdtEq * d.market.base;
  ledger(d, { kind: 'gas', rub: -round2(gasRub), turnover: 0, usdt: gas.usdtEq, note: `Газ сети ${p.network === 'TRC20' ? 'TRC-20' : 'TON'} (${gas.amount} ${gas.token})` });
  w.history.unshift({ id: uid('w'), at: d.now, network: p.network, amount, from: p.network === 'TRC20' ? w.addressTrc20 : w.addressTon, to: p.address.trim(), memo: p.memo || undefined, direction: 'out', status: 'pending', feeUsdt: gas.usdtEq, arriveAt: 0 });
  d.chain.push({
    id: uid('ch'),
    network: p.network,
    amount,
    to: p.address.trim(),
    memo: p.memo.trim() || undefined,
    arriveAt: d.now + (p.network === 'TRC20' ? rand(1.5, 3) : rand(0.5, 1.2)),
    fromLabel: 'Tonkeeper',
    source: 'wallet',
  });
  return { ok: true, info: 'Транзакция отправлена в сеть' };
}

export function walletSwap(d: D, network: Network, amountUsdt: number) {
  const w = d.wallet;
  const bal = network === 'TRC20' ? w.usdtTrc20 : w.usdtTon;
  if (!(amountUsdt > 0) || amountUsdt > bal + 1e-9) return { ok: false, error: 'Недостаточно USDT' };
  const net = amountUsdt * 0.99;
  if (network === 'TRC20') {
    w.usdtTrc20 = round2(w.usdtTrc20 - amountUsdt);
    w.trx = round2(w.trx + net / TRX_USD);
  } else {
    w.usdtTon = round2(w.usdtTon - amountUsdt);
    w.ton = round2(w.ton + net / d.market.tonUsd);
  }
  const cost = bookRemove(d, amountUsdt);
  ledger(d, { kind: 'gas', rub: -round2(cost), turnover: 0, usdt: amountUsdt, note: `Покупка ${network === 'TRC20' ? 'TRX' : 'TON'} на газ` });
  return { ok: true };
}

/** Lands in-flight on-chain transfers. */
export function chainTick(d: D) {
  const due = d.chain.filter((c) => d.now >= c.arriveAt);
  if (!due.length) return;
  d.chain = d.chain.filter((c) => d.now < c.arriveAt);
  for (const c of due) {
    const dest = d.addresses[c.to];
    for (const h of d.wallet.history) if (h.status === 'pending' && h.to === c.to && Math.abs(h.amount - c.amount) < 0.01) h.status = 'done';
    if (dest?.kind === 'my_wallet') {
      if (c.network === 'TRC20') d.wallet.usdtTrc20 = round2(d.wallet.usdtTrc20 + c.amount);
      else d.wallet.usdtTon = round2(d.wallet.usdtTon + c.amount);
      d.wallet.history.unshift({ id: uid('w'), at: d.now, network: c.network, amount: c.amount, from: c.fromLabel, to: c.to, direction: 'in', status: 'done', feeUsdt: 0, arriveAt: d.now });
      notify(d, 'wallet', 'Tonkeeper', `Получено ${fmtUsdt(c.amount)} (${c.network === 'TRC20' ? 'TRC-20' : 'TON'})`);
      if (c.source === 'otc') otcUsdtArrived(d, c.otcId!, c.amount);
      continue;
    }
    if (dest?.kind === 'exchange_deposit' && dest.exchange) {
      const e = d.exchanges[dest.exchange];
      if (c.network === 'TON' && (c.memo ?? '') !== e.tonMemo) {
        e.stuckDeposits.push({ id: uid('stuck'), amount: c.amount, network: 'TON', at: d.now, resolveAt: null });
        notify(d, 'system', dest.exchange === 'bybit' ? 'Bybit' : 'Rapira', `Депозит ${fmtUsdt(c.amount)} TON без верного MEMO не зачислен. Обратитесь в поддержку.`);
        toast(d, 'error', 'Депозит TON без MEMO завис на бирже! Нужен запрос в поддержку.');
        continue;
      }
      e.usdt = round2(e.usdt + c.amount);
      if (c.source === 'otc') otcUsdtArrived(d, c.otcId!, c.amount);
      notify(d, 'system', dest.exchange === 'bybit' ? 'Bybit' : 'Rapira', `Депозит зачислен: ${fmtUsdt(c.amount)} (${c.network === 'TRC20' ? 'TRC-20' : 'TON'})`);
      continue;
    }
    // Sent somewhere external (OTC counterparty, other people). Coins leave the book.
    if (c.source !== 'otc') {
      const cost = bookRemove(d, c.amount);
      const info = dest ?? lookupAddress(d, c.to);
      if (info.kind === 'scam') {
        ledger(d, { kind: 'loss', rub: -round2(cost), turnover: 0, usdt: c.amount, note: `Перевод мошеннику ${info.owner}` });
        d.stats.scamsMissed++;
        emit(d, { type: 'scam_missed', kind: 'crypto_scam' });
      } else if (info.kind === 'otc') {
        d.flags[`otc_sent_${c.to}`] = (Number(d.flags[`otc_sent_${c.to}`]) || 0) + c.amount;
        d.flags[`otc_cost_${c.to}`] = (Number(d.flags[`otc_cost_${c.to}`]) || 0) + cost;
      } else {
        ledger(d, { kind: 'loss', rub: -round2(cost), turnover: 0, usdt: c.amount, note: 'Перевод на внешний кошелёк' });
      }
    }
  }
}

export function resolveStuck(d: D, ex: ExchangeId, id: string) {
  const e = d.exchanges[ex];
  const s = e.stuckDeposits.find((x) => x.id === id);
  if (!s || s.resolveAt) return;
  s.resolveAt = d.now + 720;
  notify(d, 'system', ex === 'bybit' ? 'Bybit · Поддержка' : 'Rapira · Поддержка', 'Заявка на зачисление депозита без MEMO принята. Срок — до 12 часов, комиссия 5 USDT.');
}

export function stuckTick(d: D) {
  for (const ex of ['bybit', 'rapira'] as ExchangeId[]) {
    const e = d.exchanges[ex];
    for (const s of [...e.stuckDeposits]) {
      if (s.resolveAt && d.now >= s.resolveAt) {
        const credit = round2(Math.max(0, s.amount - 5));
        e.usdt = round2(e.usdt + credit);
        const cost = bookRemove(d, 5);
        ledger(d, { kind: 'gas', rub: -round2(cost), turnover: 0, usdt: 5, note: 'Комиссия поддержки за депозит без MEMO' });
        e.stuckDeposits = e.stuckDeposits.filter((x) => x.id !== s.id);
        notify(d, 'system', ex === 'bybit' ? 'Bybit' : 'Rapira', `Депозит зачислен вручную: ${fmtUsdt(credit)}`);
      }
    }
  }
}

// ───────── Rapira spot ─────────

export function rapiraQuote(d: D) {
  const mid = d.market.rapiraSpot;
  return { bid: round2(mid * 0.9996), ask: round2(mid * 1.0004) };
}

export function spotTrade(d: D, pair: 'USDT/RUB' | 'TON/USDT' | 'BTC/USDT', side: 'buy' | 'sell', amount: number) {
  const r = d.exchanges.rapira;
  if (!r.registered || r.kyc !== 'verified') return { ok: false, error: 'Нужна регистрация и верификация на Rapira' };
  if (!(amount > 0)) return { ok: false, error: 'Введите количество' };
  if (pair === 'USDT/RUB') {
    const q = rapiraQuote(d);
    if (side === 'buy') {
      const rub = round2(amount * q.ask);
      if (rub > r.rub + 1e-6) return { ok: false, error: `Недостаточно RUB. Доступно ${fmtRub(r.rub, 2)}` };
      const got = round2(amount * (1 - SPOT_FEE));
      r.rub = round2(r.rub - rub);
      r.usdt = round2(r.usdt + got);
      bookAdd(d, got, rub);
      ledger(d, { kind: 'p2p_buy', rub: 0, turnover: rub, usdt: got, note: `Спот: покупка ${fmtUsdt(got)} по ${q.ask.toFixed(2)}` });
      ledger(d, { kind: 'fee_spot', rub: 0, turnover: 0, usdt: amount * SPOT_FEE, note: 'Комиссия спота 0,1% (в цене)' });
      return { ok: true, info: `Куплено ${fmtUsdt(got)}` };
    }
    if (amount > r.usdt + 1e-9) return { ok: false, error: `Недостаточно USDT. Доступно ${fmtUsdt(r.usdt)}` };
    const rub = round2(amount * q.bid * (1 - SPOT_FEE));
    r.usdt = round2(r.usdt - amount);
    r.rub = round2(r.rub + rub);
    const cost = bookRemove(d, amount);
    ledger(d, { kind: 'spot', rub: round2(rub - cost), turnover: rub, usdt: amount, note: `Спот: продажа ${fmtUsdt(amount)} по ${q.bid.toFixed(2)}` });
    return { ok: true, info: `Продано за ${fmtRub(rub, 2)}` };
  }
  const price = pair === 'TON/USDT' ? d.market.tonUsd : d.market.btcUsd;
  const key = pair === 'TON/USDT' ? 'ton' : 'btc';
  if (side === 'buy') {
    const cost = amount * price;
    if (cost > r.usdt + 1e-9) return { ok: false, error: 'Недостаточно USDT' };
    r.usdt = round2(r.usdt - cost);
    r[key] = r[key] + amount * (1 - SPOT_FEE);
    const rubCost = bookRemove(d, cost);
    d.flags[`${key}_cost`] = (Number(d.flags[`${key}_cost`]) || 0) + rubCost;
    return { ok: true, info: `Куплено ${amount} ${key.toUpperCase()}` };
  }
  if (amount > r[key] + 1e-9) return { ok: false, error: `Недостаточно ${key.toUpperCase()}` };
  const proceeds = round2(amount * price * (1 - SPOT_FEE));
  const share = amount / r[key];
  const rubCost = (Number(d.flags[`${key}_cost`]) || 0) * share;
  d.flags[`${key}_cost`] = (Number(d.flags[`${key}_cost`]) || 0) - rubCost;
  r[key] = r[key] - amount;
  r.usdt = round2(r.usdt + proceeds);
  bookAdd(d, proceeds, proceeds * d.market.base);
  ledger(d, { kind: 'spot', rub: round2(proceeds * d.market.base - rubCost), turnover: proceeds * d.market.base, usdt: proceeds, note: `Спот: продажа ${key.toUpperCase()}` });
  return { ok: true, info: `Продано за ${fmtUsdt(proceeds)}` };
}

export function rapiraWithdrawRub(d: D, bank: 'sber' | 'tbank' | 'alfa', amount: number, code: string) {
  const r = d.exchanges.rapira;
  if (!d.banks[bank].opened) return { ok: false, error: 'Карта не открыта' };
  if (!(amount >= 1000)) return { ok: false, error: 'Минимальный вывод 1 000 ₽' };
  if (amount > r.rub + 1e-6) return { ok: false, error: 'Недостаточно RUB' };
  if (!twoFAOk(d, 'rapira', code)) return { ok: false, error: 'Неверный код 2FA' };
  const fee = round2(amount * 0.005);
  r.rub = round2(r.rub - amount);
  ledger(d, { kind: 'fee_spot', rub: -fee, turnover: 0, usdt: 0, note: 'Комиссия вывода RUB с Rapira 0,5%' });
  d.scheduled.push({ id: uid('ev'), at: d.now + rand(4, 9), type: 'rapira_payout', payload: { bank, amount: round2(amount - fee) } });
  return { ok: true, info: `Вывод ${fmtRub(amount - fee)} на ${bank === 'sber' ? 'Сбер' : bank === 'tbank' ? 'Т-Банк' : 'Альфу'} — до 10 минут` };
}

export function makeDepositAddresses(d: D) {
  for (const ex of ['bybit', 'rapira'] as ExchangeId[]) {
    const e = d.exchanges[ex];
    registerAddress(d, { address: e.depositTrc20, network: 'TRC20', owner: ex === 'bybit' ? 'Bybit (ваш депозит)' : 'Rapira (ваш депозит)', kind: 'exchange_deposit', exchange: ex, aml: { risk: 2, tags: ['Биржа'] } });
    registerAddress(d, { address: e.depositTon, network: 'TON', owner: ex === 'bybit' ? 'Bybit (общий горячий кошелёк)' : 'Rapira (общий кошелёк)', kind: 'exchange_deposit', exchange: ex, aml: { risk: 2, tags: ['Биржа'] } });
  }
  registerAddress(d, { address: d.wallet.addressTrc20, network: 'TRC20', owner: 'Ваш Tonkeeper', kind: 'my_wallet', aml: { risk: 0, tags: [] } });
  registerAddress(d, { address: d.wallet.addressTon, network: 'TON', owner: 'Ваш Tonkeeper', kind: 'my_wallet', aml: { risk: 0, tags: [] } });
}

export const freshAddr = (n: Network) => (n === 'TRC20' ? genTrcAddress() : genTonAddress());
export const chanceDirty = (base: number) => chance(base);
