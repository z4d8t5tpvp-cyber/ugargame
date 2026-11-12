import type { BankId, ExtBankId, GameState, Merchant, MyAd, OrderChatMsg, P2POrder, Payee } from '../types';
import { makeMerchant, makeName } from '../data/names';
import { BANK_NAMES, BANK_SHORT, chance, fmtNum, fmtRub, fmtUsdt, genPhone, pick, rand, randInt, round2, uid, totp, fmtPhone } from '../util';
import { adFillRate, bestPrice, buyScenario, humanAmount, MAKER_FEE, maxAd, merchantQuality, sellScenario } from './market';
import { bookAdd, bookRemove, emit, hero, ledger, notify, sms, thought, toast } from './core';
import { addRisk, incoming, trigger161 } from './banks';

type D = GameState;

export const ORDER_MINUTES = 15;
const ACTIVE: P2POrder['status'][] = ['pending_payment', 'paid', 'appeal'];
export const isActive = (o: P2POrder) => ACTIVE.includes(o.status);
export const activeOrders = (d: D) => d.orders.filter(isActive);

function orderNum() {
  return `18${randInt(10000000, 99999999)}${randInt(100000000, 999999999)}`;
}

function chat(o: P2POrder, from: OrderChatMsg['from'], text: string, at: number, attachment?: OrderChatMsg['attachment']) {
  o.chat.push({ id: uid('m'), from, text, at, attachment });
}

function cpSay(d: D, o: P2POrder, text: string, attachment?: OrderChatMsg['attachment']) {
  chat(o, 'cp', text, d.now, attachment);
  if (d.ui.focusOrderId !== o.id) notify(d, 'system', `Bybit · ${o.cp.nick}`, text);
}

function support(d: D, o: P2POrder, text: string) {
  chat(o, 'support', text, d.now);
  notify(d, 'system', 'Bybit · Поддержка', text);
}

const THIRD_PARTY_SENDERS = [
  { name: 'Зинаида Павловна К.', comment: 'За детскую коляску с Авито' },
  { name: 'Людмила Петровна С.', comment: 'Внучку выручить, за телефон' },
  { name: 'Галина Ивановна Р.', comment: 'Предоплата за путёвку' },
  { name: 'Валентина Сергеевна О.', comment: 'Оплата заказа маркетплейс' },
  { name: 'Ирина Анатольевна Б.', comment: 'Возврат долга Олегу' },
];

const PRESSURE = [
  'Брат, улетаю в самолёте, отпусти скорее, вот чек!',
  'Всё отправил, у меня списалось. Отпускайте пожалуйста, срочно!',
  'Чек же в чате, что не так?? Я уже 3 раза скинул',
  'Если не отпустите через 5 минут — пишу в поддержку, у вас будет бан',
  'У меня посадка, ну пожалуйста, отпусти 🙏🙏',
];

function registerPayee(d: D, holder: string, bank: ExtBankId, orderId: string, kind: 'order' | 'scam' = 'order') {
  let phone = genPhone();
  while (d.payees[phone]) phone = genPhone();
  const p: Payee = { key: phone, holder, bank, phone, ref: { kind, id: orderId } };
  d.payees[phone] = p;
  return p;
}

// ───────── creating orders ─────────

export interface TakeParams {
  adId: string;
  rub: number;
  /** Buy: which of the ad's payment methods to pay with. Sell: which of the player's banks receives. */
  bank: ExtBankId;
}

export function canTrade(d: D, side: 'buy' | 'sell'): string | null {
  const ex = d.exchanges.bybit;
  if (!ex.registered) return 'Сначала зарегистрируйтесь на бирже.';
  if (ex.kyc !== 'verified') return 'Для P2P нужна верификация личности (KYC).';
  if (side === 'sell' && !ex.twoFA) return 'Для продажи привяжите Google Authenticator (Профиль → Безопасность).';
  if (activeOrders(d).length >= 3) return 'Не больше 3 активных ордеров одновременно.';
  return null;
}

export function takeAd(d: D, p: TakeParams): { ok: boolean; error?: string; orderId?: string } {
  const ad = d.market.ads.find((a) => a.id === p.adId);
  if (!ad) return { ok: false, error: 'Объявление больше недоступно — обновите стакан.' };
  const side = ad.side === 'sell' ? 'buy' : 'sell';
  const err = canTrade(d, side);
  if (err) return { ok: false, error: err };
  const rub = Math.round(p.rub);
  if (rub < ad.minRub || rub > ad.maxRub) return { ok: false, error: `Сумма должна быть от ${fmtRub(ad.minRub)} до ${fmtRub(ad.maxRub)}` };
  const usdt = Math.floor((rub / ad.price) * 100) / 100;
  if (usdt > ad.availableUsdt) return { ok: false, error: 'У мерчанта недостаточно USDT' };
  if (!ad.banks.includes(p.bank)) return { ok: false, error: 'Этот способ оплаты не поддерживается объявлением' };
  const ex = d.exchanges.bybit;
  const q = merchantQuality(ad.merchant);

  if (side === 'sell') {
    if (p.bank !== 'sber' && p.bank !== 'tbank' && p.bank !== 'alfa') return { ok: false, error: 'Выберите свой банк для получения' };
    if (!d.banks[p.bank].opened) return { ok: false, error: `У вас нет карты ${BANK_NAMES[p.bank]}` };
    if (ex.usdt + 1e-9 < usdt) return { ok: false, error: `Недостаточно USDT. Доступно ${fmtUsdt(ex.usdt)}` };
    ex.usdt = round2(ex.usdt - usdt);
    ex.frozen = round2(ex.frozen + usdt);
  }
  const o = createOrder(d, {
    side,
    viaMyAd: false,
    price: ad.price,
    usdt,
    rub: side === 'buy' ? rub : round2(usdt * ad.price),
    cp: ad.merchant,
    bank: p.bank,
    q,
  });
  ad.availableUsdt = round2(ad.availableUsdt - usdt);
  return { ok: true, orderId: o.id };
}

interface CreateParams {
  side: 'buy' | 'sell';
  viaMyAd: boolean;
  adId?: string;
  price: number;
  usdt: number;
  rub: number;
  cp: Merchant;
  bank: ExtBankId;
  q: number;
  feeUsdt?: number;
}

function createOrder(d: D, c: CreateParams): P2POrder {
  const firstBuy = !d.flags.firstBuyDone;
  const firstSell = !d.flags.firstSellDone;
  let scenario = c.side === 'buy' ? buyScenario(d, c.q) : sellScenario(d, c.q, c.rub);
  if ((c.side === 'buy' && firstBuy) || (c.side === 'sell' && firstSell)) scenario = 'legit';
  if (d.flags.forceScenario && c.side === 'sell' && d.chapter >= 2 && !firstSell) {
    scenario = d.flags.forceScenario as P2POrder['scenario'];
    delete d.flags.forceScenario;
  }
  const minutes = ORDER_MINUTES * (d.difficulty === 'story' ? 1.5 : 1);
  const o: P2POrder = {
    id: uid('o'),
    num: orderNum(),
    exchange: 'bybit',
    side: c.side,
    viaMyAd: c.viaMyAd,
    adId: c.adId,
    price: c.price,
    usdt: c.usdt,
    rub: c.rub,
    feeUsdt: c.feeUsdt ?? 0,
    cp: c.cp,
    playerBank: c.side === 'sell' ? (c.bank as BankId) : null,
    scenario,
    status: c.side === 'buy' ? 'pending_payment' : 'pending_payment',
    createdAt: d.now,
    deadline: d.now + minutes,
    paidRub: 0,
    receivedRub: 0,
    cpMarkedPaid: false,
    chat: [],
    stage: c.side === 'buy' ? 'await_player_pay' : 'await_cp_pay',
    nextAt: c.side === 'buy' ? d.now + 0.5 : d.now + rand(1.2, 3.2),
  };
  chat(o, 'system', `Ордер создан. ${c.side === 'buy' ? `Оплатите ${fmtRub(c.rub, 2)} в течение ${Math.round(minutes)} минут.` : `Покупатель оплачивает ${fmtRub(c.rub, 2)}. USDT заморожены в эскроу.`}`, d.now);

  if (c.side === 'buy') {
    const holder = scenario === 'requisites_third_party' ? makeName().full : c.cp.fullName;
    const p = registerPayee(d, holder, c.bank, o.id);
    o.req = { holder, phone: p.phone!, bank: c.bank };
    chat(o, 'cp', pick(['Здравствуйте! Реквизиты в ордере. После оплаты прикрепите чек, пожалуйста.', 'Добрый день. Оплата строго по реквизитам ордера, чек PDF обязателен.', 'Привет! Жду оплату, без комментариев к переводу 🙏']), d.now);
  } else {
    chat(o, 'cp', pick(['Здравствуйте, сейчас оплачу', 'Добрый, оплачиваю', 'Привет, минуту, перевожу']), d.now);
  }
  d.orders.unshift(o);
  if (d.orders.length > 400) d.orders.length = 400;
  d.ui.focusOrderId = o.id;
  return o;
}

// ───────── maker ads ─────────

export function createMyAd(d: D, a: Omit<MyAd, 'id' | 'createdAt' | 'remainingUsdt' | 'active' | 'exchange'>): { ok: boolean; error?: string } {
  const ex = d.exchanges.bybit;
  const err = canTrade(d, a.side === 'sell' ? 'sell' : 'buy');
  if (err && !err.startsWith('Не больше')) return { ok: false, error: err };
  if (!a.banks.length) return { ok: false, error: 'Выберите хотя бы один банк' };
  if (a.price <= 0 || a.totalUsdt <= 0) return { ok: false, error: 'Проверьте цену и объём' };
  if (a.minRub < 500 || a.maxRub < a.minRub) return { ok: false, error: 'Неверные лимиты' };
  if (ex.ads.filter((x) => x.side === a.side).length >= 2) return { ok: false, error: 'Максимум 2 объявления на каждую сторону' };
  if (a.side === 'sell') {
    if (ex.usdt + 1e-9 < a.totalUsdt) return { ok: false, error: `Недостаточно USDT. Доступно ${fmtUsdt(ex.usdt)}` };
    ex.usdt = round2(ex.usdt - a.totalUsdt);
    ex.frozen = round2(ex.frozen + a.totalUsdt);
  }
  ex.ads.push({ ...a, id: uid('myad'), exchange: 'bybit', remainingUsdt: a.totalUsdt, active: true, createdAt: d.now });
  return { ok: true };
}

export function removeMyAd(d: D, id: string) {
  const ex = d.exchanges.bybit;
  const ad = ex.ads.find((a) => a.id === id);
  if (!ad) return;
  if (ad.side === 'sell') {
    ex.frozen = round2(ex.frozen - ad.remainingUsdt);
    ex.usdt = round2(ex.usdt + ad.remainingUsdt);
  }
  ex.ads = ex.ads.filter((a) => a.id !== id);
  d.market.ads = d.market.ads.filter((a) => !(a.merchant.isMax && a.id === `max_${id}`));
}

function adTick(d: D, dt: number) {
  const ex = d.exchanges.bybit;
  if (activeOrders(d).length >= 3) return;
  for (const ad of ex.ads) {
    if (!ad.active) continue;
    const maxUsdt = ad.side === 'sell' ? ad.remainingUsdt / (1 + MAKER_FEE) : ad.remainingUsdt;
    const maxRub = Math.min(ad.maxRub, Math.floor(maxUsdt * ad.price));
    if (maxRub < ad.minRub) continue;
    // Max undercuts the player's top-of-book ad.
    if (d.chapter >= 3 && !d.flags.maxCollapsed && ad.side === 'sell' && !ad.undercutBy) {
      const best = bestPrice(d, 'bybit', 'sell', true);
      if (ad.price <= best + 0.005 && chance(0.12 * dt)) {
        ad.undercutBy = round2(ad.price - 0.01);
        d.market.ads.push({ ...maxAd(d, 'sell', ad.undercutBy), id: `max_${ad.id}` });
        if (!d.fired.max_undercut_msg) {
          d.fired.max_undercut_msg = true;
          emit(d, { type: 'bank_status', bank: 'none', status: 'max_undercut' });
        }
      }
    }
    let rate = adFillRate(d, ad);
    const first = ad.side === 'sell' ? !d.flags.firstSellDone : !d.flags.firstBuyDone;
    if (first) rate = Math.max(rate * 4, 0.35);
    if (!chance(1 - Math.exp(-rate * dt))) continue;
    const rub = first ? maxRub : humanAmount(ad.minRub, maxRub);
    const usdt = Math.floor((rub / ad.price) * 100) / 100;
    const fee = round2(usdt * MAKER_FEE);
    const quality = weightedQuality(d);
    const cp = makeMerchant(quality);
    const bank: ExtBankId = ad.side === 'sell' ? pick(ad.banks) : pick(['sber', 'tbank', 'alfa', 'vtb', 'ozon'] as ExtBankId[]);
    if (ad.side === 'sell') {
      ad.remainingUsdt = round2(ad.remainingUsdt - usdt - fee);
    } else {
      ad.remainingUsdt = round2(ad.remainingUsdt - usdt);
    }
    const o = createOrder(d, { side: ad.side, viaMyAd: true, adId: ad.id, price: ad.price, usdt, rub: round2(usdt * ad.price), cp, bank, q: merchantQuality(cp), feeUsdt: fee });
    if (ad.side === 'sell') o.rub = round2(usdt * ad.price);
    notify(d, 'system', 'Bybit P2P', `Новый ордер по вашему объявлению: ${ad.side === 'sell' ? 'покупатель' : 'продавец'} ${cp.nick}, ${fmtRub(o.rub)}`);
    toast(d, 'info', `Новый ордер по объявлению: ${fmtRub(o.rub)} (${ad.side === 'sell' ? 'продажа' : 'покупка'})`);
    d.ui.browserTab = 'bybit';
    d.ui.bybitView = 'orders';
    if (ad.remainingUsdt * ad.price < ad.minRub) ad.active = false;
    break; // one new order per tick is plenty
  }
}

function weightedQuality(d: D): 'good' | 'mid' | 'shady' {
  const r = Math.random();
  const shady = d.chapter <= 2 ? 0.12 : 0.2;
  if (r < shady) return 'shady';
  if (r < shady + 0.35) return 'mid';
  return 'good';
}

// ───────── player actions ─────────

export function attachReceipt(d: D, orderId: string, fileId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  const f = d.files.find((x) => x.id === fileId);
  if (!o || !f || !f.receipt) return { ok: false, error: 'Файл не найден' };
  o.receiptFileId = fileId;
  chat(o, 'me', 'Чек об оплате', d.now, { name: f.name, kind: 'pdf', fileId });
  return { ok: true };
}

export function markPaid(d: D, orderId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o || o.side !== 'buy' || o.status !== 'pending_payment') return { ok: false, error: 'Ордер недоступен' };
  o.status = 'paid';
  o.paidAt = d.now;
  o.stage = 'cp_check';
  o.nextAt = d.now + (o.scenario === 'slow_release' ? rand(4, 7) : rand(0.6, 1.6));
  chat(o, 'system', 'Вы отметили ордер как оплаченный. Продавец проверяет поступление.', d.now);
  if (o.paidRub === 0) thought(d, 'Стоп. А я точно перевёл деньги по этому ордеру?', true);
  return { ok: true };
}

export function cancelOrder(d: D, orderId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o || o.side !== 'buy' || o.status !== 'pending_payment') return { ok: false, error: 'Отменить можно только неоплаченную покупку' };
  const scam = o.scenario === 'requisites_third_party' || o.scenario === 'pay_elsewhere';
  closeOrder(d, o, 'cancelled', scam ? 'Отменено: нарушение правил продавцом' : 'Отменено покупателем');
  if (scam) {
    d.stats.scamsCaught++;
    toast(d, 'success', 'Правильно: оплата третьему лицу — повод отменить сделку.');
    emit(d, { type: 'scam_caught', orderId: o.id, kind: o.scenario });
    hero(d, { attention: 3 });
  } else {
    d.exchanges.bybit.cancelled++;
  }
  if (o.paidRub > 0 && o.scenario !== 'pay_elsewhere') {
    // A legit seller returns money that arrived for a cancelled order.
    d.scheduled.push({ id: uid('ev'), at: d.now + rand(8, 25), type: 'order_refund_in', payload: { orderId: o.id } });
  }
  return { ok: true };
}

export function releaseOrder(d: D, orderId: string, code: string) {
  const o = d.orders.find((x) => x.id === orderId);
  const ex = d.exchanges.bybit;
  if (!o || o.side !== 'sell' || !isActive(o)) return { ok: false, error: 'Ордер недоступен' };
  if (!ex.twoFA) return { ok: false, error: 'Привяжите Google Authenticator' };
  const now = Date.now();
  const valid = [totp(ex.twoFASecret, now), totp(ex.twoFASecret, now - 30000)];
  if (!valid.includes(code.replace(/\s/g, ''))) return { ok: false, error: 'Неверный код Google Authenticator' };
  ex.frozen = round2(ex.frozen - o.usdt - o.feeUsdt);
  const cost = bookRemove(d, o.usdt);
  const feeCost = o.feeUsdt ? bookRemove(d, o.feeUsdt) : 0;
  const s = o.scenario;
  chat(o, 'system', `Вы отпустили ${fmtUsdt(o.usdt)}. Ордер завершён.`, d.now);
  if (o.feeUsdt) ledger(d, { kind: 'fee_maker', rub: -round2(feeCost), turnover: 0, usdt: o.feeUsdt, note: `Комиссия мейкера по ордеру ${o.num.slice(-6)}` });

  if (o.receivedRub <= 0 && s !== 'late_pay') {
    // Fake receipt: coins gone, nothing received.
    ledger(d, { kind: 'loss', rub: -round2(cost), turnover: 0, usdt: o.usdt, note: `Мошенничество: фейковый чек (${o.cp.nick})` });
    closeOrder(d, o, 'completed', 'Мошенничество: USDT отпущены без оплаты');
    o.pnlRub = -round2(cost);
    d.stats.scamsMissed++;
    hero(d, { stress: 25 });
    d.scheduled.push({ id: uid('ev'), at: d.now + 3, type: 'scam_reveal', payload: { orderId: o.id } });
    emit(d, { type: 'scam_missed', orderId: o.id, kind: 'fake_receipt' });
    return { ok: true };
  }
  const got = s === 'late_pay' && o.receivedRub <= 0 ? o.rub : o.receivedRub;
  const pnl = round2(got - cost);
  ledger(d, { kind: 'p2p_sell', rub: pnl, turnover: o.rub, usdt: o.usdt, note: `Продажа ${fmtUsdt(o.usdt)} по ${o.price.toFixed(2)} (${o.cp.nick})` });
  o.pnlRub = round2(pnl - feeCost);
  closeOrder(d, o, 'completed', 'Сделка завершена');
  ex.completed++;
  d.flags.firstSellDone = true;
  if (s === 'late_pay' && o.receivedRub <= 0) {
    thought(d, 'Я отпустил монеты, а денег в выписке ещё не было… Повезло, если придут.', true);
    hero(d, { stress: 6 });
  }
  if (s === 'underpay') {
    d.stats.scamsMissed++;
    emit(d, { type: 'scam_missed', orderId: o.id, kind: 'underpay' });
    hero(d, { stress: 10 });
    d.scheduled.push({ id: uid('ev'), at: d.now + 2, type: 'scam_reveal', payload: { orderId: o.id } });
  }
  if (s === 'third_party' && !o.refunded) {
    d.stats.scamsMissed++;
    emit(d, { type: 'scam_missed', orderId: o.id, kind: 'third_party' });
    d.scheduled.push({ id: uid('ev'), at: d.now + 120, type: 'victim_complaint', payload: { orderId: o.id } });
  }
  emit(d, { type: 'trade_done', orderId: o.id });
  return { ok: true };
}

export function openAppeal(d: D, orderId: string, reason: NonNullable<P2POrder['appeal']>['reason']) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o || !isActive(o)) return { ok: false, error: 'Ордер недоступен' };
  if (o.side === 'sell' && !o.cpMarkedPaid && reason === 'not_received') return { ok: false, error: 'Апелляция доступна после того, как покупатель отметит оплату' };
  if (o.side === 'buy' && reason === 'paid_not_released' && o.status !== 'paid') return { ok: false, error: 'Сначала отметьте ордер оплаченным' };
  o.status = 'appeal';
  o.appeal = { reason, openedAt: d.now, resolveAt: d.now + rand(6, 14) };
  const txt: Record<string, string> = {
    not_received: 'Апелляция: деньги не поступили на счёт.',
    third_party: 'Апелляция: перевод поступил от третьего лица (риск 161-ФЗ).',
    paid_not_released: 'Апелляция: оплата произведена, продавец не отпускает USDT.',
    other: 'Апелляция: реквизиты принадлежат третьему лицу / нарушение правил.',
  };
  chat(o, 'system', txt[reason], d.now);
  support(d, o, 'Здравствуйте! Апелляция принята. Специалист подключится в течение 10–15 минут. Не отпускайте активы до решения.');
  return { ok: true };
}

export function sendOrderChat(d: D, orderId: string, text: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  chat(o, 'me', text, d.now);
  const low = text.toLowerCase();
  let reply: string | null = null;
  if (/(фио|не совпад|третье|чужая|чья карта)/.test(low)) {
    if (o.scenario === 'requisites_third_party') reply = pick(['Это карта жены, всё нормально, переводите', 'Да это мой брат, не переживайте', 'Какая разница, деньги же дойдут 🙂']);
    else if (o.scenario === 'third_party') reply = pick(['Это мама переводила, у меня лимит', 'Да какая разница кто перевёл, деньги же пришли!']);
    else reply = 'Всё совпадает, проверьте ещё раз 🙂';
  } else if (/(не пришл|не поступ|нет денег|не вижу)/.test(low)) {
    if (o.scenario === 'fake_receipt') reply = pick(PRESSURE);
    else if (o.scenario === 'late_pay') reply = 'Банк задерживает, у меня списалось, подождите пару минут';
    else if (o.scenario === 'underpay') reply = 'Всё отправил, проверьте ещё раз';
    else reply = 'Обновите выписку, у меня всё отправлено';
  } else if (/(чек|квитанц)/.test(low)) {
    reply = o.side === 'sell' ? 'Чек выше в чате' : 'Жду чек после оплаты';
  } else if (o.status !== 'completed') {
    reply = pick(['Ок', 'Понял', '👍', 'Хорошо']);
  }
  if (reply) o.chat.push({ id: uid('m'), from: 'cp', text: reply, at: d.now + 0.3 });
}

// ───────── incoming payment events ─────────

export function orderPaymentReceived(d: D, orderId: string, amount: number, toPayee: Payee) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  if (!isActive(o)) {
    // Payment for a closed order: a legit seller sends it back later.
    if (toPayee.ref.kind === 'order') d.scheduled.push({ id: uid('ev'), at: d.now + rand(15, 40), type: 'late_refund', payload: { amount, name: toPayee.holder } });
    thought(d, 'Я заплатил по закрытому ордеру… Надеюсь, продавец вернёт.', true);
    return;
  }
  o.paidRub = round2(o.paidRub + amount);
  if (o.paidRub > o.rub + 1) thought(d, 'Я перевёл больше, чем нужно по ордеру.', true);
}

export function orderRefunded(d: D, orderId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.refunded = true;
  if (o.side !== 'sell' || !isActive(o)) return;
  if (o.scenario === 'third_party') {
    const ex = d.exchanges.bybit;
    ex.frozen = round2(ex.frozen - o.usdt - o.feeUsdt);
    restoreUsdt(d, o);
    support(d, o, 'Средства возвращены отправителю. Ордер отменён, активы разморожены. Покупатель заблокирован за нарушение правил.');
    closeOrder(d, o, 'cancelled', 'Отменено: перевод от третьего лица возвращён');
    d.stats.scamsCaught++;
    hero(d, { stress: -4, attention: 4 });
    toast(d, 'success', 'Платёж третьего лица возвращён — блокировки по 161-ФЗ не будет.');
    emit(d, { type: 'scam_caught', orderId: o.id, kind: 'third_party' });
  } else {
    // Refunding a legit buyer: order is cancelled, reputation suffers.
    const ex = d.exchanges.bybit;
    ex.frozen = round2(ex.frozen - o.usdt - o.feeUsdt);
    restoreUsdt(d, o);
    cpSay(d, o, 'Зачем вы вернули деньги?? Отменяю. Ставлю негативный отзыв.');
    closeOrder(d, o, 'cancelled', 'Отменено: продавец вернул оплату');
    ex.cancelled++;
  }
}

function restoreUsdt(d: D, o: P2POrder) {
  const ex = d.exchanges.bybit;
  const ad = o.adId ? ex.ads.find((a) => a.id === o.adId) : undefined;
  if (ad && ad.side === 'sell') {
    ad.remainingUsdt = round2(ad.remainingUsdt + o.usdt + o.feeUsdt);
    ex.frozen = round2(ex.frozen + o.usdt + o.feeUsdt);
    ad.active = true;
  } else {
    ex.usdt = round2(ex.usdt + o.usdt + o.feeUsdt);
  }
}

function closeOrder(d: D, o: P2POrder, status: 'completed' | 'cancelled', outcome: string) {
  o.status = status;
  o.outcome = outcome;
  o.closedAt = d.now;
  o.stage = 'done';
}

// ───────── per-tick state machine ─────────

export function ordersTick(d: D, dt: number) {
  adTick(d, dt);
  for (const o of d.orders) {
    if (!isActive(o)) continue;
    if (o.side === 'buy') buyStep(d, o);
    else sellStep(d, o);
  }
}

function buyStep(d: D, o: P2POrder) {
  const ex = d.exchanges.bybit;
  if (o.status === 'pending_payment') {
    if (o.scenario === 'pay_elsewhere' && o.stage === 'await_player_pay' && d.now >= o.nextAt) {
      const name = makeName(false);
      const scam = registerPayee(d, name.full, 'tbank', o.id, 'scam');
      o.stage = 'scam_offered';
      cpSay(d, o, `Сбер на лимите, переведите лучше на Т-Банк ${fmtPhone(scam.phone!)}, ${name.first} — это мой помощник. Так быстрее отпущу 👍`);
    }
    if (d.now >= o.deadline) {
      if (o.paidRub > 0) {
        o.status = 'appeal';
        o.appeal = { reason: 'paid_not_released', openedAt: d.now, resolveAt: d.now + rand(10, 20) };
        support(d, o, 'Ордер истёк, но по нему есть оплата. Автоматически открыта апелляция.');
      } else {
        closeOrder(d, o, 'cancelled', 'Отменено по истечении времени');
        chat(o, 'system', 'Время на оплату истекло. Ордер отменён.', d.now);
        if (o.scenario === 'legit' || o.scenario === 'slow_release') ex.cancelled++;
      }
    }
    return;
  }
  if (o.status === 'paid' && d.now >= o.nextAt) {
    const paid = o.paidRub;
    const receipt = o.receiptFileId ? d.files.find((f) => f.id === o.receiptFileId) : undefined;
    const receiptOk = !!receipt?.receipt && (d.payees[receipt.receipt.recipientPhone.replace(/\D/g, '')]?.ref.id === o.id || receipt.receipt.amount >= o.rub - 1);
    if (paid >= o.rub - 1) {
      if (!receipt) {
        if (o.stage !== 'asked_receipt') {
          cpSay(d, o, 'Пришлите, пожалуйста, чек PDF — без чека не отпускаю.');
          o.stage = 'asked_receipt';
        }
        o.nextAt = d.now + 0.7;
        return;
      }
      if (!receiptOk) {
        if (o.stage !== 'bad_receipt') {
          cpSay(d, o, 'Это не тот чек. Прикрепите чек именно по этому переводу.');
          o.stage = 'bad_receipt';
        }
        o.nextAt = d.now + 0.7;
        return;
      }
      completeBuy(d, o);
      return;
    }
    if (paid > 0) {
      if (o.stage !== 'asked_more') {
        cpSay(d, o, `Пришло ${fmtRub(paid)}, по ордеру ${fmtRub(o.rub)}. Доплатите ${fmtRub(o.rub - paid)}, пожалуйста.`);
        o.stage = 'asked_more';
      }
      o.nextAt = d.now + 0.7;
      return;
    }
    if (o.stage !== 'nothing_came') {
      cpSay(d, o, o.scenario === 'pay_elsewhere' && o.stage === 'scam_offered' ? 'Жду оплату 😉' : 'Оплата не поступила. Если не оплачивали — отмените ордер.');
      o.stage = 'nothing_came';
      o.nextAt = d.now + 6;
      return;
    }
    // Seller escalates: player marked paid without paying.
    o.status = 'appeal';
    o.appeal = { reason: 'other', openedAt: d.now, resolveAt: d.now + 8 };
    support(d, o, 'Продавец открыл апелляцию: оплата не поступила.');
    return;
  }
  if (o.status === 'appeal' && o.appeal && d.now >= o.appeal.resolveAt) resolveBuyAppeal(d, o);
}

function completeBuy(d: D, o: P2POrder) {
  const ex = d.exchanges.bybit;
  const got = round2(o.usdt - o.feeUsdt);
  ex.usdt = round2(ex.usdt + got);
  bookAdd(d, got, o.rub);
  if (o.feeUsdt) ledger(d, { kind: 'fee_maker', rub: 0, turnover: 0, usdt: o.feeUsdt, note: `Комиссия мейкера (покупка) ${fmtUsdt(o.feeUsdt)}` });
  ledger(d, { kind: 'p2p_buy', rub: 0, turnover: o.rub, usdt: got, note: `Покупка ${fmtUsdt(got)} по ${o.price.toFixed(2)} (${o.cp.nick})` });
  chat(o, 'cp', pick(['Отпустил, спасибо! Приходите ещё 🙌', 'Готово, отпустил 👍', 'Всё пришло, монеты ваши. Хорошего дня!']), d.now);
  chat(o, 'system', `Продавец отпустил ${fmtUsdt(got)}. Средства на вашем Funding-счёте.`, d.now);
  closeOrder(d, o, 'completed', 'Сделка завершена');
  ex.completed++;
  d.flags.firstBuyDone = true;
  notify(d, 'system', 'Bybit', `Получено ${fmtUsdt(got)} по ордеру ${o.num.slice(-6)}`);
  if (o.scenario === 'requisites_third_party') {
    d.stats.scamsMissed++;
    d.scheduled.push({ id: uid('ev'), at: d.now + rand(60, 180), type: 'drop_consequence', payload: { orderId: o.id } });
    emit(d, { type: 'scam_missed', orderId: o.id, kind: 'requisites_third_party' });
  }
  emit(d, { type: 'trade_done', orderId: o.id });
}

function resolveBuyAppeal(d: D, o: P2POrder) {
  const ex = d.exchanges.bybit;
  const paidOk = o.paidRub >= o.rub - 1;
  if (o.scenario === 'requisites_third_party' || o.scenario === 'pay_elsewhere') {
    support(d, o, 'Проверка завершена: продавец нарушил правила платформы (реквизиты третьего лица). Ордер отменён без штрафа, продавец заблокирован.');
    closeOrder(d, o, 'cancelled', 'Отменено поддержкой: нарушение продавца');
    d.stats.scamsCaught++;
    emit(d, { type: 'scam_caught', orderId: o.id, kind: o.scenario });
    if (o.paidRub > 0) d.scheduled.push({ id: uid('ev'), at: d.now + rand(60, 240), type: 'order_refund_in', payload: { orderId: o.id } });
    return;
  }
  if (paidOk) {
    support(d, o, 'Оплата подтверждена. Активы разблокированы и переведены покупателю.');
    completeBuy(d, o);
    return;
  }
  support(d, o, 'Оплата по реквизитам ордера не подтверждена. Ордер отменён.');
  closeOrder(d, o, 'cancelled', 'Отменено поддержкой: оплата не подтверждена');
  ex.cancelled++;
  ex.appealsLost++;
  if (o.paidRub > 0) d.scheduled.push({ id: uid('ev'), at: d.now + rand(20, 60), type: 'order_refund_in', payload: { orderId: o.id } });
}

function sellStep(d: D, o: P2POrder) {
  const bank = o.playerBank!;
  const bname = pick(['Т-Банк', 'Сбербанк', 'Альфа-Банк', 'ВТБ', 'Озон Банк']);
  if (o.stage === 'await_cp_pay' && d.now >= o.nextAt) {
    o.cpMarkedPaid = true;
    o.status = 'paid';
    o.paidAt = d.now;
    const img = { name: `IMG_${randInt(1000, 9999)}.jpg`, kind: 'receipt_img' as const };
    switch (o.scenario) {
      case 'legit':
        incoming(d, bank, o.rub, { title: o.cp.masked, counterpartyBank: bname, ref: { kind: 'order', id: o.id }, refundable: true, p2p: true });
        o.receivedRub = o.rub;
        cpSay(d, o, pick(['Оплатил, проверяйте 🙏', 'Перевёл, чек ниже', 'Отправил, отпустите пожалуйста']), img);
        o.stage = 'await_release';
        break;
      case 'late_pay':
        cpSay(d, o, 'Оплатил, чек прикрепил. Банк иногда задерживает.', img);
        o.stage = 'late_money';
        o.nextAt = d.now + rand(3, 6);
        break;
      case 'fake_receipt':
        cpSay(d, o, PRESSURE[0], { ...img, fake: true });
        sms(d, `+7 (9${randInt(0, 9)}${randInt(0, 9)}) ${randInt(100, 999)}-${randInt(10, 99)}-${randInt(10, 99)}`, `SBERBANK: Zachislenie +${fmtNum(o.rub, 0)}r ot ${o.cp.masked.toUpperCase()}. Balans: ${fmtNum(o.rub + randInt(1000, 50000), 2)}r`, true);
        o.stage = 'pressure';
        o.nextAt = d.now + 1.5;
        break;
      case 'third_party': {
        const v = pick(THIRD_PARTY_SENDERS);
        incoming(d, bank, o.rub, { title: v.name, comment: v.comment, counterpartyBank: 'Сбербанк', ref: { kind: 'order', id: o.id }, refundable: true, p2p: true });
        o.receivedRub = o.rub;
        cpSay(d, o, 'Оплатил, проверяйте. Отпустите побыстрее, пожалуйста', img);
        o.stage = 'await_release';
        break;
      }
      case 'underpay': {
        const short = o.rub > 20000 ? Math.round(o.rub * 0.1 / 100) * 100 : 1000;
        const amt = round2(o.rub - short);
        incoming(d, bank, amt, { title: o.cp.masked, counterpartyBank: bname, ref: { kind: 'order', id: o.id }, refundable: true, p2p: true });
        o.receivedRub = amt;
        cpSay(d, o, 'Оплатил полностью, чек в чате 👍', img);
        o.stage = 'await_release';
        break;
      }
    }
    toast(d, 'info', `Покупатель ${o.cp.nick} отметил оплату ${fmtRub(o.rub)}. Проверьте выписку ${BANK_SHORT[bank]}!`);
    return;
  }
  if (o.stage === 'late_money' && d.now >= o.nextAt) {
    incoming(d, bank, o.rub, { title: o.cp.masked, counterpartyBank: bname, ref: { kind: 'order', id: o.id }, refundable: true, p2p: true });
    o.receivedRub = o.rub;
    o.stage = o.status === 'completed' ? 'done' : 'await_release';
    return;
  }
  if (o.stage === 'pressure' && o.status === 'paid' && d.now >= o.nextAt) {
    cpSay(d, o, pick(PRESSURE.slice(1)));
    o.nextAt = d.now + rand(1.5, 3);
    return;
  }
  // Legit buyer escalates if the seller sits on a paid order too long.
  if (o.status === 'paid' && o.receivedRub >= o.rub - 1 && o.scenario !== 'third_party' && d.now - (o.paidAt ?? d.now) > 25) {
    o.status = 'appeal';
    o.appeal = { reason: 'other', openedAt: d.now, resolveAt: d.now + 10 };
    support(d, o, 'Покупатель открыл апелляцию: оплата произведена, продавец не отпускает активы.');
    return;
  }
  if (o.status === 'appeal' && o.appeal && d.now >= o.appeal.resolveAt) resolveSellAppeal(d, o);
}

function resolveSellAppeal(d: D, o: P2POrder) {
  const ex = d.exchanges.bybit;
  const a = o.appeal!;
  const s = o.scenario;
  if (s === 'fake_receipt') {
    ex.frozen = round2(ex.frozen - o.usdt - o.feeUsdt);
    restoreUsdt(d, o);
    support(d, o, 'Покупатель не подтвердил оплату (чек поддельный). Ордер отменён, USDT возвращены. Покупатель заблокирован.');
    closeOrder(d, o, 'cancelled', 'Отменено: поддельный чек');
    d.stats.scamsCaught++;
    hero(d, { stress: -5, attention: 5 });
    toast(d, 'success', 'Апелляция выиграна: мошенник с фейковым чеком заблокирован.');
    emit(d, { type: 'scam_caught', orderId: o.id, kind: 'fake_receipt' });
    return;
  }
  if (s === 'third_party') {
    if (o.refunded) {
      orderRefunded(d, o.id);
      return;
    }
    if (o.stage !== 'support_refund') {
      support(d, o, 'Платёж поступил от третьего лица. Верните средства отправителю через банк («Вернуть платёж») — после этого ордер будет отменён.');
      o.stage = 'support_refund';
      if (a.reason === 'third_party' || a.reason === 'not_received') {
        d.stats.scamsCaught++;
        emit(d, { type: 'scam_caught', orderId: o.id, kind: 'third_party_appeal' });
      }
    }
    a.resolveAt = d.now + 30;
    return;
  }
  if (s === 'underpay' && o.receivedRub < o.rub - 1) {
    const diff = round2(o.rub - o.receivedRub);
    support(d, o, `Выявлена недоплата ${fmtRub(diff)}. Покупатель обязан доплатить.`);
    incoming(d, o.playerBank!, diff, { title: o.cp.masked, counterpartyBank: 'Т-Банк', ref: { kind: 'order', id: o.id }, refundable: true, p2p: true });
    o.receivedRub = o.rub;
    o.status = 'paid';
    o.stage = 'await_release';
    d.stats.scamsCaught++;
    emit(d, { type: 'scam_caught', orderId: o.id, kind: 'underpay' });
    return;
  }
  if (s === 'late_pay' && o.receivedRub <= 0) {
    a.resolveAt = d.now + 3;
    return;
  }
  // Payment did arrive: the seller has to release.
  if (a.reason === 'other') {
    // Buyer's appeal and the seller still did nothing — support releases.
    ex.frozen = round2(ex.frozen - o.usdt - o.feeUsdt);
    const cost = bookRemove(d, o.usdt + o.feeUsdt);
    ledger(d, { kind: 'p2p_sell', rub: round2(o.receivedRub - cost), turnover: o.rub, usdt: o.usdt, note: `Продажа (решение поддержки) ${o.cp.nick}` });
    support(d, o, 'Оплата подтверждена. Активы переданы покупателю решением поддержки. Рейтинг продавца снижен.');
    closeOrder(d, o, 'completed', 'Завершено поддержкой');
    ex.completed++;
    ex.appealsLost++;
    return;
  }
  support(d, o, 'Оплата поступила на ваш счёт и отправитель совпадает с покупателем. Пожалуйста, отпустите активы.');
  o.status = 'paid';
  o.stage = 'await_release';
  ex.appealsLost++;
  hero(d, { stress: 3 });
}

// ───────── scheduled consequences ─────────

export function handleOrderEvent(d: D, type: string, payload: Record<string, unknown>) {
  const o = d.orders.find((x) => x.id === payload.orderId);
  switch (type) {
    case 'scam_reveal':
      if (!o) return;
      if (o.scenario === 'fake_receipt') {
        chat(o, 'system', 'Покупатель удалил аккаунт.', d.now);
        notify(d, 'system', 'Bybit', `Ордер ${o.num.slice(-6)}: оплата так и не поступила. Чек был поддельным.`);
        toast(d, 'error', `Вас обманули: ${fmtUsdt(o.usdt)} ушли мошеннику с фейковым чеком.`);
      } else if (o.scenario === 'underpay') {
        toast(d, 'error', `Недоплата по ордеру ${o.num.slice(-6)}: пришло ${fmtRub(o.receivedRub)} вместо ${fmtRub(o.rub)}.`);
      }
      return;
    case 'victim_complaint': {
      if (!o) return;
      const bank = o.playerBank!;
      const b = d.banks[bank];
      const back = Math.min(b.balance, o.receivedRub);
      if (back > 0) {
        b.balance = round2(b.balance - back);
        b.txs.unshift({ id: uid('tx'), at: d.now, amount: -back, kind: 'fraud', title: 'Списание по заявлению о мошенничестве', seen: true, comment: '161-ФЗ' });
      }
      ledger(d, { kind: 'loss', rub: -round2(back), turnover: 0, usdt: 0, note: 'Возврат денег жертве мошенничества (161-ФЗ)' });
      trigger161(d, `Получен перевод от ${'третьего лица'}, оспоренный как мошеннический. Ордер ${o.num.slice(-6)}.`);
      return;
    }
    case 'drop_consequence': {
      if (!o) return;
      const r = Math.random();
      const paidFrom = d.banks.sber.txs.some((t) => t.ref?.kind === 'order' && t.ref.id === o.id) ? 'sber' : d.banks.tbank.txs.some((t) => t.ref?.kind === 'order' && t.ref.id === o.id) ? 'tbank' : 'alfa';
      if (r < 0.3) trigger161(d, 'Ваш перевод получил дроппер из базы ЦБ РФ.');
      else if (r < 0.75) {
        addRisk(d, paidFrom as BankId, 30, 'перевод дропу');
        notify(d, paidFrom as BankId, 'Банк', 'Ваш перевод получателю из списка подозрительных. Проверка операций.');
      }
      return;
    }
    case 'order_refund_in': {
      if (!o || o.paidRub <= 0) return;
      const paidTx = (['sber', 'tbank', 'alfa'] as BankId[]).map((b) => ({ b, t: d.banks[b].txs.find((t) => t.ref?.kind === 'order' && t.ref.id === o.id && t.amount < 0) })).find((x) => x.t);
      const bank = paidTx?.b ?? 'sber';
      incoming(d, bank, o.paidRub, { title: o.req ? maskOf(o.req.holder) : o.cp.masked, comment: 'Возврат', kind: 'refund_in' });
      o.paidRub = 0;
      return;
    }
    case 'late_refund': {
      const amount = Number(payload.amount) || 0;
      const opened = (['sber', 'tbank', 'alfa'] as BankId[]).find((b) => d.banks[b].opened) ?? 'sber';
      if (chance(0.8)) incoming(d, opened, amount, { title: maskOf(String(payload.name)), comment: 'Возврат', kind: 'refund_in' });
      return;
    }
  }
}

const maskOf = (full: string) => {
  const [l, f, p] = full.split(' ');
  return f ? `${f} ${p ?? ''} ${l[0]}.`.replace('  ', ' ') : full;
};
