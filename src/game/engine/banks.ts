import type { BankAccount, BankId, BankTx, ExtBankId, GameState, Payee, PayRef } from '../types';
import { BANKS, ME2ME_LIMIT, RETAIL, SBP_MAX_SINGLE, SBP_OVER_LIMIT_FEE } from '../data/static';
import { makeName } from '../data/names';
import { BANK_NAMES, BANK_SHORT, chance, clamp, clockStr, dayIndex, digits, fmtNum, fmtRub, isNight, monthKey, normPhone, pick, round2, uid, dateStr, durStr } from '../util';
import { addFile, emit, hero, ledger, notify, sms, thought, toast } from './core';
import { dispatchPayment, dispatchRefund } from './payments';

type D = GameState;

export const PLAYER_PHONE = '79532714418';

export function freeLimit(b: BankAccount) {
  const def = BANKS[b.id];
  return b.tier === 'premium' ? def.premiumLimit : def.basicLimit;
}

export function ensureMonth(d: D, b: BankAccount) {
  const mk = monthKey(d.now);
  if (b.monthKey !== mk) {
    b.monthKey = mk;
    b.sbpOutMonth = 0;
    b.inMonth = 0;
    b.outMonth = 0;
    b.retailMonth = 0;
  }
}

export function frozenOf(b: BankAccount) {
  return b.request && (b.request.status === 'open' || b.request.status === 'review') ? b.request.frozen : 0;
}

export function available(b: BankAccount) {
  return Math.max(0, round2(b.balance - frozenOf(b)));
}

/** Balance as the app currently shows it (unseen incoming transfers are not reflected yet). */
export function shownBalance(b: BankAccount) {
  return round2(b.balance - b.txs.filter((t) => !t.seen && t.amount > 0).reduce((s, t) => s + t.amount, 0));
}

export function addTx(d: D, bankId: BankId, tx: Omit<BankTx, 'id' | 'at'> & { at?: number }) {
  const b = d.banks[bankId];
  const full: BankTx = { id: uid('tx'), at: d.now, ...tx };
  b.txs.unshift(full);
  if (b.txs.length > 250) b.txs.length = 250;
  return full;
}

export function outgoingBlock(d: D, bankId: BankId): string | null {
  const b = d.banks[bankId];
  if (!b.opened) return 'Счёт не открыт';
  if (d.block161) return 'Операции приостановлены: ваши данные внесены в базу ЦБ РФ о случаях без согласия клиента (161-ФЗ).';
  if (b.status === 'cooling') return `Период охлаждения: переводы приостановлены до ${clockStr(b.statusUntil ?? d.now)} (${dateStr(b.statusUntil ?? d.now)}).`;
  if (b.status === 'request115') return 'Переводы ограничены до предоставления документов по запросу банка (115-ФЗ).';
  if (b.status === 'restricted115') return 'Дистанционное обслуживание ограничено (п. 11 ст. 7 115-ФЗ). Обратитесь в отделение.';
  return null;
}

// ───────── recipient lookup ─────────

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface Lookup {
  ok: boolean;
  error?: string;
  self?: BankId;
  payee?: Payee;
  masked?: string;
  bank?: ExtBankId;
}

const maskHolder = (holder: string) => {
  const parts = holder.split(' ');
  if (holder.startsWith('ООО') || holder.startsWith('АО') || holder.startsWith('ИП')) return holder;
  if (parts.length < 2) return holder;
  const [last, first, patr] = parts;
  return `${first}${patr ? ' ' + patr : ''} ${last[0]}.`;
};

export function lookupRecipient(d: D, raw: string, method: 'sbp' | 'card', toBank: ExtBankId | null): Lookup {
  const dg = digits(raw);
  if (method === 'sbp') {
    const key = normPhone(raw);
    if (key.length !== 11 || !key.startsWith('79')) return { ok: false, error: 'Введите номер телефона полностью' };
    if (!toBank) return { ok: false, error: 'Выберите банк получателя' };
    if (key === PLAYER_PHONE) {
      if (toBank === 'sber' || toBank === 'tbank' || toBank === 'alfa') {
        if (!d.banks[toBank].opened) return { ok: false, error: `У вас нет счёта в ${BANK_NAMES[toBank]}` };
        return { ok: true, self: toBank, masked: 'Артём Сергеевич В. (вы)', bank: toBank };
      }
      return { ok: false, error: `Получатель не найден в ${BANK_NAMES[toBank]}` };
    }
    let p = d.payees[key];
    if (!p) {
      // Any real number is attached to someone: a stranger in exactly one bank.
      const banks: ExtBankId[] = ['sber', 'tbank', 'alfa', 'vtb', 'ozon'];
      const sb = banks[hash(key) % banks.length];
      const nm = makeName(hash(key + 'f') % 3 === 0);
      p = { key, holder: nm.full, bank: sb, phone: key, ref: { kind: 'stranger', id: key } };
      d.payees[key] = p;
    }
    if (p.bank !== toBank) return { ok: false, error: `Получатель не найден в ${BANK_NAMES[toBank]}. Проверьте банк получателя.` };
    return { ok: true, payee: { ...p, ref: { ...p.ref } }, masked: maskHolder(p.holder), bank: p.bank };
  }
  if (dg.length !== 16) return { ok: false, error: 'Номер карты должен содержать 16 цифр' };
  for (const b of Object.values(d.banks)) if (digits(b.card) === dg) {
    if (!b.opened) return { ok: false, error: 'Карта не найдена' };
    return { ok: true, self: b.id, masked: 'Артём Сергеевич В. (вы)', bank: b.id };
  }
  let p = d.payees[dg];
  if (!p) {
    const nm = makeName(hash(dg) % 3 === 0);
    p = { key: dg, holder: nm.full, bank: pick(['sber', 'tbank', 'vtb', 'alfa'] as ExtBankId[]), card: dg, ref: { kind: 'stranger', id: dg } };
    d.payees[dg] = p;
  }
  return { ok: true, payee: { ...p, ref: { ...p.ref } }, masked: maskHolder(p.holder), bank: p.bank };
}

export function transferFee(d: D, from: BankId, amount: number, method: 'sbp' | 'card', toBank: ExtBankId | null, self: boolean) {
  const b = d.banks[from];
  ensureMonth(d, b);
  if (self) return 0;
  if (method === 'card') return toBank === from ? 0 : Math.max(30, round2(amount * 0.01));
  const lim = freeLimit(b);
  const over = Math.max(0, b.sbpOutMonth + amount - lim) - Math.max(0, b.sbpOutMonth - lim);
  return round2(over * SBP_OVER_LIMIT_FEE);
}

const CRYPTO_WORDS = /(usdt|крипт|bybit|байбит|бай бит|p2p|битк|btc|юсдт|тезер|tether|обмен|rapira|рапира)/i;

export interface TransferParams {
  from: BankId;
  method: 'sbp' | 'card';
  to: string;
  toBank: ExtBankId | null;
  amount: number;
  comment: string;
}

export interface TransferResult {
  ok: boolean;
  error?: string;
  txId?: string;
  fee?: number;
  masked?: string;
}

export function sendTransfer(d: D, p: TransferParams): TransferResult {
  const b = d.banks[p.from];
  const block = outgoingBlock(d, p.from);
  if (block) return { ok: false, error: block };
  const amount = round2(p.amount);
  if (!(amount >= 1)) return { ok: false, error: 'Введите сумму перевода' };
  if (amount > SBP_MAX_SINGLE) return { ok: false, error: `Максимальная сумма одного перевода — ${fmtRub(SBP_MAX_SINGLE)}` };
  const lk = lookupRecipient(d, p.to, p.method, p.toBank);
  if (!lk.ok) return { ok: false, error: lk.error };
  ensureMonth(d, b);
  const self = !!lk.self;
  if (self && lk.self === p.from) return { ok: false, error: 'Нельзя перевести на этот же счёт' };
  if (self && b.outMonth + amount > ME2ME_LIMIT) return { ok: false, error: 'Превышен лимит переводов себе' };
  const fee = transferFee(d, p.from, amount, p.method, lk.bank ?? null, self);
  if (amount + fee > available(b) + 1e-6)
    return { ok: false, error: `Недостаточно средств. Доступно ${fmtRub(available(b), 2)}${fee ? `, комиссия ${fmtRub(fee, 2)}` : ''}` };

  b.balance = round2(b.balance - amount - fee);
  b.outMonth += amount;
  if (!self && p.method === 'sbp') b.sbpOutMonth += amount;
  d.stats.transfers++;

  if (self && lk.self) {
    const tx = addTx(d, p.from, { amount: -amount, kind: 'me2me_out', title: `Себе в ${BANK_NAMES[lk.self]}`, seen: true, comment: p.comment || undefined });
    const target = d.banks[lk.self];
    ensureMonth(d, target);
    target.balance = round2(target.balance + amount);
    target.inMonth += amount;
    addTx(d, lk.self, { amount, kind: 'me2me_in', title: `Перевод себе из ${BANK_NAMES[p.from]}`, seen: true });
    // Moving money between own banks right after it arrived still looks like transit.
    if (b.lastInAt !== null && d.now - b.lastInAt < 20 && amount >= 20000) addRisk(d, p.from, 2.5, 'транзит');
    emit(d, { type: 'transfer', bank: p.from, amount });
    return { ok: true, txId: tx.id, fee: 0, masked: lk.masked };
  }

  const payee = lk.payee!;
  const tx = addTx(d, p.from, {
    amount: -amount,
    kind: p.method === 'sbp' ? 'sbp_out' : 'card_out',
    title: lk.masked!,
    counterpartyBank: BANK_NAMES[payee.bank],
    phone: payee.phone,
    comment: p.comment || undefined,
    fee: fee || undefined,
    seen: true,
    ref: payee.ref,
  });

  // ── 115-FZ scoring ──
  const business = payee.ref.kind === 'order' || payee.ref.kind === 'otc' || payee.ref.kind === 'rapira_deposit';
  if (b.lastInAt !== null && d.now - b.lastInAt < 20 && amount >= 2000) {
    addRisk(d, p.from, 6.5, 'мгновенный транзит');
    if (d.chapter >= 2) thought(d, 'Деньги ушли почти сразу после поступления. Банк такое видит как транзит…');
  }
  if (isNight(d.now)) addRisk(d, p.from, 3, 'ночные операции');
  if (b.tier === 'basic' && b.outMonth > 600000) addRisk(d, p.from, 4, 'оборот без пакета');
  if (b.outMonth > 50000 && b.retailMonth / b.outMonth < 0.1 && chance(0.35)) addRisk(d, p.from, 1.5, 'нет бытовых трат');
  if (p.comment && CRYPTO_WORDS.test(p.comment)) {
    addRisk(d, p.from, 14, 'подозрительный комментарий');
    thought(d, 'Зачем я написал это в комментарии? Банк такие слова отмечает автоматически…', true);
  }
  if (fee > 0 && business) ledger(d, { kind: 'fee_sbp', rub: -fee, turnover: 0, usdt: 0, note: `Комиссия ${BANK_SHORT[p.from]} за перевод сверх лимита` });

  emit(d, { type: 'transfer', bank: p.from, amount });
  dispatchPayment(d, payee, amount, tx.id, p.from, p.comment);
  return { ok: true, txId: tx.id, fee, masked: lk.masked };
}

export function saveReceipt(d: D, bankId: BankId, txId: string) {
  const b = d.banks[bankId];
  const tx = b.txs.find((t) => t.id === txId);
  if (!tx) return null;
  if (tx.receiptFileId) return d.files.find((f) => f.id === tx.receiptFileId) ?? null;
  const amt = Math.abs(tx.amount);
  const hhmm = clockStr(tx.at).replace(':', '');
  const f = addFile(d, {
    name: `Чек_${BANK_SHORT[bankId]}_${fmtNum(amt).replace(/\s/g, '')}р_${hhmm}.pdf`,
    kind: 'receipt',
    at: tx.at,
    receipt: {
      bank: bankId,
      amount: amt,
      fee: tx.fee ?? 0,
      recipient: tx.title,
      recipientPhone: tx.phone ?? '',
      recipientBank: tx.counterpartyBank ?? '',
      comment: tx.comment,
      at: tx.at,
      txId: tx.id,
      op: String(100000000 + Math.floor(Math.random() * 899999999)),
    },
  });
  tx.receiptFileId = f.id;
  d.stats.receiptsSaved++;
  emit(d, { type: 'receipt_saved', fileId: f.id });
  return f;
}

export interface IncomingOpts {
  title: string;
  kind?: BankTx['kind'];
  comment?: string;
  ref?: PayRef;
  refundable?: boolean;
  phone?: string;
  counterpartyBank?: string;
  notifySender?: boolean;
  seen?: boolean;
  p2p?: boolean;
}

export function incoming(d: D, bankId: BankId, amount: number, o: IncomingOpts) {
  const b = d.banks[bankId];
  ensureMonth(d, b);
  b.balance = round2(b.balance + amount);
  b.inMonth += amount;
  b.lastInAt = d.now;
  const tx = addTx(d, bankId, {
    amount,
    kind: o.kind ?? 'sbp_in',
    title: o.title,
    comment: o.comment,
    ref: o.ref,
    refundable: o.refundable,
    phone: o.phone,
    counterpartyBank: o.counterpartyBank,
    seen: o.seen ?? false,
  });
  if (o.p2p) {
    addRisk(d, bankId, 1.1, 'входящие от физлиц');
    if (isNight(d.now)) addRisk(d, bankId, 3, 'ночные операции');
  }
  if (o.notifySender !== false) {
    if (bankId === 'sber') {
      sms(d, '900', `СБЕРБАНК. ${clockStr(d.now)} Перевод ${o.counterpartyBank ? 'из ' + o.counterpartyBank + ' ' : ''}+${fmtNum(amount, 0)}р от ${o.title.toUpperCase()}. Баланс: ${fmtNum(b.balance, 2)}р`);
    } else {
      notify(d, bankId, BANKS[bankId].app, `Пополнение +${fmtRub(amount)} · ${o.title}`);
    }
  }
  return tx;
}

export function refreshStatement(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  let n = 0;
  for (const t of b.txs) if (!t.seen) {
    t.seen = true;
    n++;
  }
  b.lastRefresh = d.now;
  return n;
}

export function refundTx(d: D, bankId: BankId, txId: string): TransferResult {
  const b = d.banks[bankId];
  const tx = b.txs.find((t) => t.id === txId);
  if (!tx || tx.amount <= 0) return { ok: false, error: 'Операция не найдена' };
  if (tx.refunded) return { ok: false, error: 'Платёж уже возвращён' };
  if (d.block161 || b.status === 'restricted115') return { ok: false, error: outgoingBlock(d, bankId) ?? 'Недоступно' };
  if (available(b) < tx.amount) return { ok: false, error: 'Недостаточно средств для возврата' };
  b.balance = round2(b.balance - tx.amount);
  tx.refunded = true;
  addTx(d, bankId, { amount: -tx.amount, kind: 'refund_out', title: `Возврат: ${tx.title}`, seen: true, comment: 'Возврат ошибочного перевода' });
  if (tx.ref) dispatchRefund(d, tx.ref, tx.amount);
  return { ok: true };
}

export function retailPurchase(d: D, bankId: BankId, itemId: string): TransferResult {
  const item = RETAIL.find((r) => r.id === itemId);
  if (!item) return { ok: false, error: 'Нет такого товара' };
  const b = d.banks[bankId];
  if (!b.opened) return { ok: false, error: 'Счёт не открыт' };
  if (d.block161 || b.status === 'restricted115') return { ok: false, error: 'Карта заблокирована' };
  if (available(b) < item.price) return { ok: false, error: 'Недостаточно средств' };
  ensureMonth(d, b);
  b.balance = round2(b.balance - item.price);
  b.retailMonth += item.price;
  addTx(d, bankId, { amount: -item.price, kind: 'retail', title: item.title.split(' — ')[0], seen: true });
  hero(d, { energy: item.energy, stress: item.stress, attention: item.attention });
  b.risk = clamp(b.risk - 1.2);
  ledger(d, { kind: 'expense', rub: 0, turnover: 0, usdt: 0, note: item.title });
  return { ok: true };
}

export function spend(d: D, bankId: BankId, amount: number, title: string): TransferResult {
  const b = d.banks[bankId];
  if (!b.opened) return { ok: false, error: 'Счёт не открыт' };
  const block = outgoingBlock(d, bankId);
  if (block) return { ok: false, error: block };
  if (available(b) < amount) return { ok: false, error: `Недостаточно средств на карте ${BANK_SHORT[bankId]}` };
  ensureMonth(d, b);
  b.balance = round2(b.balance - amount);
  b.retailMonth += Math.min(amount, 20000);
  addTx(d, bankId, { amount: -amount, kind: 'retail', title, seen: true });
  return { ok: true };
}

// ───────── compliance ─────────

export function addRisk(d: D, bankId: BankId, delta: number, _reason: string) {
  const b = d.banks[bankId];
  if (!b.opened) return;
  const mult = (d.difficulty === 'story' ? 0.65 : 1) * (Number(d.flags.riskMult) || 1);
  b.risk = clamp(b.risk + (delta > 0 ? delta * mult : delta));
  if (delta > 0) complianceCheck(d, bankId);
}

export function complianceCheck(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  if (b.status === 'restricted115') return;
  if (b.risk >= 90) {
    restrict(d, bankId);
    return;
  }
  if (b.risk >= 72 && b.status !== 'request115') {
    openRequest(d, bankId);
    return;
  }
  const today = dayIndex(d.now);
  const key = `cool_${bankId}`;
  if (b.risk >= 50 && b.status === 'active' && d.flags[key] !== today) {
    d.flags[key] = today;
    const p = 0.25 * (b.trust < 40 ? 1.5 : b.trust > 75 ? 0.6 : 1);
    if (chance(p)) {
      b.status = 'cooling';
      b.statusUntil = d.now + 1440;
      b.statusReason = 'Подозрение на операцию без согласия клиента. Период охлаждения 24 часа.';
      b.trust = clamp(b.trust - 5);
      notify(d, bankId, BANKS[bankId].app, 'Переводы приостановлены на 24 часа (период охлаждения).');
      hero(d, { stress: 8 });
      emit(d, { type: 'bank_status', bank: bankId, status: 'cooling' });
    }
  }
}

export function openRequest(d: D, bankId: BankId, reasonOverride?: string, frozenShare = 0.6) {
  const b = d.banks[bankId];
  const ops = b.txs.filter((t) => t.kind === 'sbp_in' || t.kind === 'sbp_out').slice(0, 5).map((t) => ({ at: t.at, amount: t.amount, title: t.title }));
  const deadlineDays = d.difficulty === 'story' ? 7 : 5;
  b.status = 'request115';
  b.statusUntil = null;
  b.statusReason = reasonOverride ?? 'Запрос документов по 115-ФЗ: подтвердите экономический смысл операций.';
  b.request = {
    id: uid('req'),
    openedAt: d.now,
    deadline: d.now + deadlineDays * 1440,
    frozen: round2(Math.max(0, b.balance) * frozenShare),
    reason: b.statusReason,
    ops,
    docs: [],
    status: 'open',
  };
  b.trust = clamp(b.trust - 10);
  notify(d, bankId, BANKS[bankId].app, `Запрос документов по 115-ФЗ. Срок ответа — ${deadlineDays} дней. Часть средств заморожена.`);
  sms(d, bankId === 'sber' ? '900' : BANKS[bankId].name, `Уважаемый клиент! По операциям по вашему счёту требуется предоставить пояснения и документы. Срок — ${deadlineDays} рабочих дней.`);
  hero(d, { stress: 12 });
  emit(d, { type: 'bank_status', bank: bankId, status: 'request115' });
}

export function restrict(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  b.status = 'restricted115';
  b.statusUntil = null;
  b.statusReason = 'Ограничение ДБО по п. 11 ст. 7 115-ФЗ. Остаток можно получить при закрытии счёта в отделении.';
  if (b.request) b.request.status = 'failed';
  b.trust = clamp(b.trust - 30);
  notify(d, bankId, BANKS[bankId].app, 'Дистанционное обслуживание ограничено (115-ФЗ).');
  hero(d, { stress: 20 });
  toast(d, 'error', `${BANKS[bankId].name}: ДБО ограничено по 115-ФЗ`);
  emit(d, { type: 'bank_status', bank: bankId, status: 'restricted115' });
}

export interface DocScore {
  receipts: number;
  exports: number;
  tax: boolean;
  chance: number;
}

export function scoreDocs(d: D, fileIds: string[]): DocScore {
  const files = d.files.filter((f) => fileIds.includes(f.id));
  const receipts = files.filter((f) => f.kind === 'receipt').length;
  const exports = files.filter((f) => f.kind === 'order_export' || f.kind === 'statement').length;
  const tax = files.some((f) => f.kind === 'tax_doc' || f.kind === 'contract');
  let p = 0.15 + 0.11 * Math.min(receipts, 5) + (exports ? 0.22 : 0) + (tax ? 0.3 : 0);
  if (d.tax.regime === 'ip_usn') p += 0.1;
  if (d.tax.grishaHired) p += 0.1;
  return { receipts, exports, tax, chance: clamp(p, 0, 0.97) };
}

export function sendDocs(d: D, bankId: BankId, fileIds: string[]) {
  const b = d.banks[bankId];
  if (!b.request || b.request.status !== 'open') return { ok: false, error: 'Нет активного запроса' };
  b.request.docs = [...new Set([...b.request.docs, ...fileIds])];
  b.request.status = 'review';
  b.request.reviewAt = d.now + 240;
  for (const f of d.files) if (fileIds.includes(f.id) && !f.sentTo.includes(bankId)) f.sentTo.push(bankId);
  notify(d, bankId, BANKS[bankId].app, `Документы получены (${fileIds.length} шт.). Срок рассмотрения — до 4 часов.`);
  return { ok: true };
}

export function reviewRequest(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  const r = b.request;
  if (!r || r.status !== 'review') return;
  const sc = scoreDocs(d, r.docs);
  if (Math.random() < sc.chance) {
    r.status = 'closed';
    b.status = 'active';
    b.statusReason = undefined;
    b.risk = Math.min(b.risk, 35);
    b.trust = clamp(b.trust + 8);
    notify(d, bankId, BANKS[bankId].app, 'Запрос по 115-ФЗ закрыт. Ограничения сняты, средства разморожены.');
    toast(d, 'success', `${BANKS[bankId].name}: запрос 115-ФЗ закрыт`);
    hero(d, { stress: -15 });
    emit(d, { type: 'request_closed', bank: bankId, ok: true });
  } else if (d.now < r.deadline) {
    r.status = 'open';
    notify(d, bankId, BANKS[bankId].app, 'Документов недостаточно. Предоставьте чеки по операциям, выгрузку ордеров и пояснение источника дохода.');
    hero(d, { stress: 6 });
  } else {
    restrict(d, bankId);
    emit(d, { type: 'request_closed', bank: bankId, ok: false });
  }
}

export function openBank(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  if (b.opened) return;
  b.opened = true;
  b.openedAt = d.now;
  b.lastRefresh = d.now;
  notify(d, bankId, BANKS[bankId].app, 'Цифровая карта выпущена. Можно пользоваться!');
}

export function buyPremium(d: D, bankId: BankId): TransferResult {
  const def = BANKS[bankId];
  const r = spend(d, bankId, def.premiumPrice, `Подписка ${def.premiumName}`);
  if (!r.ok) return r;
  const b = d.banks[bankId];
  b.tier = 'premium';
  b.premiumUntil = d.now + 30 * 1440;
  b.trust = clamp(b.trust + 4);
  return { ok: true };
}

/** Runs once per in-game day change. */
export function bankDaily(d: D) {
  for (const b of Object.values(d.banks)) {
    if (!b.opened) continue;
    ensureMonth(d, b);
    const ratio = b.outMonth > 0 ? b.retailMonth / b.outMonth : 1;
    const decay = 5 + (ratio >= 0.12 ? 4 : 0) + (b.tier === 'premium' ? 2 : 0);
    if (b.status !== 'restricted115') b.risk = clamp(b.risk - decay);
    if (b.risk < 30 && b.status === 'active') b.trust = clamp(b.trust + 1.5);
    if (b.tier === 'premium' && b.premiumUntil !== null && d.now > b.premiumUntil) {
      b.tier = 'basic';
      b.premiumUntil = null;
      notify(d, b.id, BANKS[b.id].app, 'Подписка закончилась. Бесплатный лимит СБП — 100 000 ₽/мес.');
    }
  }
}

export function bankTick(d: D) {
  for (const b of Object.values(d.banks)) {
    if (b.status === 'cooling' && b.statusUntil !== null && d.now >= b.statusUntil) {
      b.status = 'active';
      b.statusUntil = null;
      b.statusReason = undefined;
      notify(d, b.id, BANKS[b.id].app, 'Период охлаждения завершён. Переводы снова доступны.');
    }
    const r = b.request;
    if (r && r.status === 'review' && r.reviewAt && d.now >= r.reviewAt) reviewRequest(d, b.id);
    if (r && r.status === 'open' && d.now > r.deadline) restrict(d, b.id);
  }
  if (d.block161?.resolveAt && d.now >= d.block161.resolveAt) {
    d.block161 = null;
    for (const b of Object.values(d.banks)) b.trust = clamp(b.trust - 10);
    notify(d, 'system', 'Госуслуги', 'ЦБ РФ исключил ваши данные из базы (161-ФЗ). Операции восстановлены.');
    toast(d, 'success', 'Блокировка 161-ФЗ снята');
    hero(d, { stress: -25 });
  }
}

export function closeRestricted(d: D, bankId: BankId) {
  const b = d.banks[bankId];
  if (b.status !== 'restricted115') return { ok: false, error: 'Счёт не ограничен' };
  const target = (['sber', 'tbank', 'alfa'] as BankId[]).find((x) => x !== bankId && d.banks[x].opened && d.banks[x].status !== 'restricted115');
  const amount = b.balance;
  b.balance = 0;
  b.opened = false;
  b.status = 'active';
  b.request = null;
  b.risk = 25;
  b.trust = 30;
  b.txs = [];
  d.flags[`closed_${bankId}`] = d.now;
  if (target && amount > 0) {
    d.scheduled.push({ id: uid('ev'), at: d.now + 2 * 1440, type: 'cash_deposit', payload: { bank: target, amount, from: BANK_NAMES[bankId] } });
  }
  return { ok: true, info: `Счёт закрыт. Остаток ${fmtRub(amount)} будет выдан в отделении и внесён на ${target ? BANK_NAMES[target] : 'руки'} через ${durStr(2 * 1440)}.` };
}

export function file161Appeal(d: D) {
  if (!d.block161 || d.block161.appealFiled) return;
  const days = d.difficulty === 'story' ? 7 : 15;
  d.block161.appealFiled = true;
  d.block161.resolveAt = d.now + days * 1440;
  if (!d.tax.grishaHired) d.flags.lawyerFeeDue = 15000;
  notify(d, 'system', 'Госуслуги', `Заявление в ЦБ РФ подано. Срок рассмотрения — ${days} дней.`);
}

export function trigger161(d: D, reason: string) {
  if (d.block161) return;
  d.block161 = { since: d.now, reason, appealFiled: false, resolveAt: null };
  for (const id of ['sber', 'tbank', 'alfa'] as BankId[]) if (d.banks[id].opened) {
    d.banks[id].trust = clamp(d.banks[id].trust - 25);
    notify(d, id, BANKS[id].app, 'Операции по карте приостановлены (161-ФЗ, база ЦБ РФ).');
  }
  sms(d, '900', 'Операции по вашим картам приостановлены. Сведения о вас внесены в базу данных Банка России о случаях и попытках осуществления переводов без согласия клиента.');
  hero(d, { stress: 30 });
  toast(d, 'error', 'БЛОКИРОВКА 161-ФЗ: все карты заморожены');
  emit(d, { type: 'block161' });
}

export function bankName(id: ExtBankId) {
  return BANK_NAMES[id];
}
