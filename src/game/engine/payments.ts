import type { BankId, GameState, Payee, PayRef } from '../types';
import { chance, fmtRub, round2, uid } from '../util';
import { emit, hero, ledger, notify, thought, toast } from './core';
import { orderPaymentReceived, orderRefunded } from './orders';
import { otcPaid } from './otc';

type D = GameState;

export function dispatchPayment(d: D, payee: Payee, amount: number, _txId: string, from: BankId, _comment: string) {
  const ref = payee.ref;
  switch (ref.kind) {
    case 'order':
      orderPaymentReceived(d, ref.id, amount, payee);
      break;
    case 'otc':
      otcPaid(d, ref.id, amount);
      break;
    case 'rapira_deposit':
      d.scheduled.push({ id: uid('ev'), at: d.now + 1.5, type: 'rapira_credit', payload: { amount } });
      break;
    case 'scam': {
      d.stats.scamsMissed++;
      ledger(d, { kind: 'loss', rub: -amount, turnover: 0, usdt: 0, note: `Перевод мошеннику (${payee.holder.split(' ')[1] ?? payee.holder})` });
      hero(d, { stress: 22 });
      d.scheduled.push({ id: uid('ev'), at: d.now + 4, type: 'scam_payment_reveal', payload: { amount, ref: ref.id } });
      emit(d, { type: 'scam_missed', kind: 'pay_elsewhere', orderId: ref.id });
      break;
    }
    case 'stranger':
      thought(d, 'Кому я сейчас перевёл?.. Этого человека нет ни в одном ордере.', true);
      ledger(d, { kind: 'expense', rub: 0, turnover: 0, usdt: 0, note: `Ошибочный перевод ${fmtRub(amount)}` });
      if (chance(0.35)) d.scheduled.push({ id: uid('ev'), at: d.now + 600 + Math.random() * 900, type: 'stranger_return', payload: { amount, bank: from, name: payee.holder } });
      break;
    case 'friend':
      d.flags[`paid_${ref.id}`] = (Number(d.flags[`paid_${ref.id}`]) || 0) + amount;
      repayObligation(d, ref.id, amount);
      break;
    case 'misc':
      d.flags[`paid_${ref.id}`] = (Number(d.flags[`paid_${ref.id}`]) || 0) + amount;
      break;
  }
}

export function dispatchRefund(d: D, ref: PayRef, _amount: number) {
  if (ref.kind === 'order') orderRefunded(d, ref.id);
}

function repayObligation(d: D, who: string, amount: number) {
  let left = amount;
  for (const o of d.obligations) {
    if (o.from !== who || o.returned || left <= 0) continue;
    const take = Math.min(left, o.amount);
    o.amount = round2(o.amount - take);
    left -= take;
    if (o.amount <= 1) {
      o.returned = true;
      o.amount = 0;
      notify(d, 'telegram', 'Долг возвращён', `Вы полностью рассчитались с ${who === 'danya' ? 'Даней' : who === 'sanya' ? 'Саней' : who}.`);
      toast(d, 'success', 'Долг закрыт. Чужие деньги — не твои деньги.');
    }
  }
}
