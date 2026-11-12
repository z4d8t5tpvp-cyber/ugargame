import type { CharacterId, ExtBankId, GameState, OtcDeal } from '../types';
import { makeName } from '../data/names';
import { chance, clamp, fmtRub, fmtUsdt, genPhone, genTrcAddress, pick, rand, round2, uid } from '../util';
import { bookAdd, emit, hero, ledger, netWorth, notify, toast, trust } from './core';
import { registerAddress } from './crypto';

type D = GameState;

export const REAL_GUARANTOR = '@Garant_KMI_Official';
export const FAKE_GUARANTOR = '@Garant_KMl_0fficial';
export const REAL_GUARANTOR_REQ = { holder: 'ИП Ковалёв Михаил Игоревич', phone: '79857101942', bank: 'tbank' as ExtBankId };

const CLIENTS = ['Ашот (опт электроники)', 'Виктор, логистика Казань', 'ООО «СеверТрейд»', 'Тимур, импорт из Китая', 'Олег, сеть автомоек', 'Диана, турагентство', 'Руслан, стройматериалы'];

export function ensureGuarantorPayee(d: D) {
  const k = REAL_GUARANTOR_REQ.phone;
  if (!d.payees[k]) d.payees[k] = { key: k, holder: REAL_GUARANTOR_REQ.holder, bank: REAL_GUARANTOR_REQ.bank, phone: k, ref: { kind: 'misc', id: 'guarantor_idle' } };
}

export function generateOtcDeal(d: D, from: CharacterId, opts: Partial<Pick<OtcDeal, 'dirty' | 'guarantorReal' | 'liar' | 'usdt'>> = {}): OtcDeal {
  const base = d.market.base;
  const capital = Math.max(150000, netWorth(d));
  const usdt = opts.usdt ?? clamp(Math.round((capital * rand(0.35, 0.7)) / base / 100) * 100, 800, 30000);
  const discount = rand(0.012, 0.032);
  const tooGood = discount > 0.025;
  const dirty = opts.dirty ?? chance(tooGood ? 0.5 : 0.18);
  const guarantorReal = opts.guarantorReal ?? !chance(from === 'kapul' ? 0.2 : 0.12);
  const liar = opts.liar ?? (!dirty && guarantorReal && chance(0.2));
  const wallet = genTrcAddress();
  registerAddress(d, {
    address: wallet,
    network: 'TRC20',
    owner: 'Кошелёк клиента OTC',
    kind: 'otc',
    aml: dirty
      ? { risk: Math.round(rand(72, 97)), tags: pick([['Garantex (санкции)', 'Смешивание'], ['Украденные средства', 'Даркнет-маркет'], ['Мошенничество', 'Высокорисковый обменник']]) }
      : { risk: Math.round(rand(2, 16)), tags: ['Биржа', 'P2P-мерчант'].slice(0, Math.random() < 0.5 ? 1 : 2) },
  });
  const deal: OtcDeal = {
    id: uid('otc'),
    from,
    title: `OTC: ${pick(CLIENTS)}`,
    side: 'buy',
    usdt,
    price: round2(base * (1 - discount)),
    marketPrice: round2(base),
    clientName: pick(CLIENTS),
    clientWallet: wallet,
    guarantor: guarantorReal ? REAL_GUARANTOR : FAKE_GUARANTOR,
    guarantorReal,
    dirty,
    liar,
    audited: false,
    amlChecked: false,
    pashaChecked: false,
    status: 'offered',
    expiresAt: d.now + 240,
    paidRub: 0,
    notes: [],
  };
  if (guarantorReal) {
    ensureGuarantorPayee(d);
    deal.payTo = { ...REAL_GUARANTOR_REQ };
  } else {
    const nm = makeName(false);
    let phone = genPhone();
    while (d.payees[phone]) phone = genPhone();
    d.payees[phone] = { key: phone, holder: nm.full, bank: 'ozon', phone, ref: { kind: 'otc', id: deal.id } };
    deal.payTo = { holder: nm.full, phone, bank: 'ozon' };
  }
  d.otc.unshift(deal);
  if (d.otc.length > 40) d.otc.length = 40;
  return deal;
}

export const otcTotal = (deal: OtcDeal) => round2(deal.usdt * deal.price);

export function otcAccept(d: D, id: string) {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal || deal.status !== 'offered') return { ok: false, error: 'Сделка недоступна' };
  deal.status = 'paying';
  if (deal.guarantorReal) d.payees[REAL_GUARANTOR_REQ.phone].ref = { kind: 'otc', id: deal.id };
  deal.notes.push(`Принято. Переведите ${fmtRub(otcTotal(deal))} гаранту по реквизитам.`);
  return { ok: true };
}

export function otcDecline(d: D, id: string) {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal || (deal.status !== 'offered' && deal.status !== 'paying')) return { ok: false, error: 'Сделка недоступна' };
  if (deal.status === 'paying' && deal.paidRub > 0) return { ok: false, error: 'Деньги уже отправлены гаранту' };
  deal.status = 'declined';
  const bad = deal.dirty || !deal.guarantorReal || deal.liar;
  if (bad) {
    trust(d, 'karim', 4);
    trust(d, 'marat', 2);
    d.stats.scamsCaught++;
    emit(d, { type: 'scam_caught', kind: 'otc' });
    toast(d, 'success', 'Отказ от мутной сделки — правильное решение.');
  } else {
    trust(d, deal.from, -2);
  }
  return { ok: true };
}

export function otcAudit(d: D, id: string, who: 'karim' | 'pasha') {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal) return;
  d.scheduled.push({ id: uid('ev'), at: d.now + (who === 'karim' ? 8 : 5), type: 'otc_audit', payload: { id, who } });
}

export function otcAuditReport(d: D, id: string, who: 'karim' | 'pasha'): string {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal) return '';
  if (who === 'pasha') {
    deal.pashaChecked = true;
    return deal.liar
      ? 'Созвонился с посредником. Врёт, Тём. Путается в объёмах, «остальное завтра» — классика. Я бы не заходил.'
      : 'Поговорил с ними. Люди нормальные, глаза не бегают. По людям — чисто.';
  }
  deal.audited = true;
  const flags: string[] = [];
  const disc = ((deal.marketPrice - deal.price) / deal.marketPrice) * 100;
  if (disc > 2.5) flags.push(`скидка ${disc.toFixed(1)}% к рынку — слишком щедро`);
  if (deal.dirty) flags.push('кошелёк клиента светится в AML (риск высокий) — Tether может заморозить');
  if (!deal.guarantorReal) flags.push(`гарант ${deal.guarantor} — это НЕ наш гарант, посмотри внимательно на буквы`);
  if (deal.liar) flags.push('объём не бьётся с историей кошелька — возможна недопоставка');
  const profit = round2(deal.usdt * (deal.marketPrice * 1.004 - deal.price) - deal.usdt * 0.0019 * deal.marketPrice);
  return flags.length
    ? `Аудит: ❌ Не рекомендую. ${flags.join('; ')}.`
    : `Аудит: ✅ Чисто. Ожидаемая прибыль ≈ ${fmtRub(profit)} после комиссий, если продать по рынку. Риски приемлемые.`;
}

export function otcPaid(d: D, id: string, amount: number) {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal) return;
  deal.paidRub = round2(deal.paidRub + amount);
  if (deal.status !== 'paying') {
    deal.notes.push('Получен платёж вне активной сделки.');
    return;
  }
  const total = otcTotal(deal);
  if (deal.paidRub + 1 < total) {
    deal.notes.push(`Оплачено ${fmtRub(deal.paidRub)} из ${fmtRub(total)}.`);
    return;
  }
  deal.status = 'awaiting_usdt';
  if (!deal.guarantorReal) {
    d.scheduled.push({ id: uid('ev'), at: d.now + 6, type: 'otc_fake_guarantor', payload: { id } });
    return;
  }
  const delivered = deal.liar ? round2(deal.usdt * 0.65) : deal.usdt;
  d.chain.push({ id: uid('ch'), network: 'TRC20', amount: delivered, to: d.wallet.addressTrc20, arriveAt: d.now + rand(3, 6), fromLabel: deal.clientName, source: 'otc', otcId: deal.id });
  notify(d, 'telegram', 'Гарант KMI', `Оплата ${fmtRub(total)} получена. Клиент отправляет ${fmtUsdt(deal.usdt)} на ваш TRC-20 кошелёк.`);
}

export function otcUsdtArrived(d: D, id: string, amount: number) {
  const deal = d.otc.find((x) => x.id === id);
  if (!deal) return;
  bookAdd(d, amount, deal.liar ? amount * deal.price : deal.paidRub);
  ledger(d, { kind: 'otc', rub: 0, turnover: deal.paidRub, usdt: amount, note: `OTC: куплено ${fmtUsdt(amount)} по ${deal.price.toFixed(2)}` });
  if (deal.liar) {
    const missing = round2(deal.usdt - amount);
    ledger(d, { kind: 'loss', rub: -round2(missing * deal.price), turnover: 0, usdt: 0, note: `OTC: недопоставка ${fmtUsdt(missing)} — «остальное завтра»` });
    deal.status = 'failed';
    deal.notes.push(`Пришло только ${fmtUsdt(amount)}. Посредник пропал.`);
    toast(d, 'error', `Недопоставка по OTC: пришло ${fmtUsdt(amount)} из ${fmtUsdt(deal.usdt)}.`);
    hero(d, { stress: 15 });
    trust(d, deal.from, -15);
    emit(d, { type: 'otc_done', dealId: id, ok: false });
    return;
  }
  deal.status = 'done';
  deal.notes.push('USDT получены. Продайте их на P2P, чтобы зафиксировать прибыль.');
  if (deal.dirty) d.scheduled.push({ id: uid('ev'), at: d.now + rand(60, 200), type: 'tether_freeze', payload: { id } });
  else trust(d, deal.from, 3);
  emit(d, { type: 'otc_done', dealId: id, ok: !deal.dirty });
}

export function otcEvent(d: D, type: string, payload: Record<string, unknown>) {
  const deal = d.otc.find((x) => x.id === payload.id);
  if (!deal) return;
  if (type === 'otc_fake_guarantor') {
    deal.status = 'failed';
    ledger(d, { kind: 'loss', rub: -deal.paidRub, turnover: 0, usdt: 0, note: `OTC: фейковый гарант ${deal.guarantor}` });
    deal.notes.push('«Гарант» удалил аккаунт. Деньги ушли мошеннику.');
    toast(d, 'error', `Фейковый гарант ${FAKE_GUARANTOR}: ${fmtRub(deal.paidRub)} потеряны.`);
    hero(d, { stress: 30 });
    trust(d, deal.from, -20);
    d.stats.scamsMissed++;
    emit(d, { type: 'scam_missed', kind: 'fake_guarantor' });
    emit(d, { type: 'otc_done', dealId: deal.id, ok: false });
  }
  if (type === 'tether_freeze') {
    // Tether blacklists tainted coins wherever they sit now.
    let left = deal.usdt;
    const w = d.wallet;
    const takeW = Math.min(left, w.usdtTrc20);
    w.usdtTrc20 = round2(w.usdtTrc20 - takeW);
    left -= takeW;
    const e = d.exchanges.bybit;
    const takeE = Math.min(left, e.usdt);
    e.usdt = round2(e.usdt - takeE);
    left -= takeE;
    const frozen = round2(deal.usdt - left);
    const cost = frozen * deal.price;
    d.book.qty = Math.max(0, round2(d.book.qty - frozen));
    ledger(d, { kind: 'loss', rub: -round2(cost), turnover: 0, usdt: frozen, note: 'Tether/биржа заморозили «грязные» USDT из OTC' });
    deal.notes.push(`Заморожено ${fmtUsdt(frozen)}: средства связаны с ${lookupTags(d, deal.clientWallet)}.`);
    toast(d, 'error', `Заморозка ${fmtUsdt(frozen)}: OTC-монеты оказались «грязными».`);
    notify(d, 'wallet', 'Tonkeeper', `USDT на сумму ${fmtUsdt(frozen)} заблокированы эмитентом.`);
    hero(d, { stress: 25 });
    trust(d, deal.from, -15);
    d.stats.scamsMissed++;
    emit(d, { type: 'scam_missed', kind: 'dirty_otc' });
  }
}

const lookupTags = (d: D, a: string) => d.addresses[a]?.aml.tags.join(', ') ?? 'высокорисковыми источниками';

export function otcTick(d: D) {
  for (const deal of d.otc) {
    if (deal.status === 'offered' && d.now > deal.expiresAt) {
      deal.status = 'expired';
      deal.notes.push('Клиент нашёл другого покупателя.');
    }
  }
}
