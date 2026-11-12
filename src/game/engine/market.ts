import type { Ad, ExtBankId, GameState, Merchant, MyAd, OrderScenario } from '../types';
import { chance, clamp, gauss, pick, rand, randInt, round2, uid, weighted } from '../util';
import { makeMerchant } from '../data/names';

export const BASE_ANCHOR = 90.5;
export const MAKER_FEE = 0.0019; // Bybit P2P maker fee (taker pays 0)
export const SPOT_FEE = 0.001;
export const WITHDRAW_FEE = { TRC20: 1.5, TON: 0.15 } as const;

/** Scales prices & limits with the story: small local ads early, Moscow liquidity later. */
function limitsFor(chapter: number, tier: 'local' | 'moscow'): [number, number] {
  if (tier === 'moscow') {
    const min = pick([50000, 100000, 150000, 200000, 300000]);
    return [min, min * pick([5, 8, 10, 15])];
  }
  if (chapter <= 1) {
    const min = pick([10000, 10000, 12000, 15000, 20000]);
    return [min, pick([50000, 80000, 120000])];
  }
  if (chapter === 2) {
    const min = pick([1000, 3000, 5000, 5000, 10000]);
    return [min, pick([30000, 50000, 75000, 100000])];
  }
  const min = pick([2000, 5000, 5000, 10000, 15000, 20000, 30000]);
  return [min, min * pick([5, 10, 15, 20])];
}

const TERMS_SELL = [
  'Оплата только с карты на ваше ФИО. Третьи лица — апелляция.',
  'Без комментариев к переводу! Чек обязателен.',
  'Отпускаю после поступления на счёт. Работаю быстро.',
  'Только СБП. Чек в чат. Онлайн до 23:00.',
  'Переводы от третьих лиц не принимаю. Чек PDF обязателен.',
];
const TERMS_BUY = [
  'Оплачиваю сразу после открытия ордера. Отпускайте только после проверки.',
  'Плачу со своей карты, ФИО совпадает с биржей.',
  'Быстрая оплата, крупные суммы — пишите.',
  'Работаю 24/7, оплата за 1–2 минуты.',
];


function adBanks(): ExtBankId[] {
  const n = randInt(1, 3);
  const res = new Set<ExtBankId>();
  // Sber/T-Bank dominate the Russian P2P market.
  while (res.size < n) res.add(weighted({ sber: 5, tbank: 5, alfa: 3, vtb: 1.5, raif: 1, ozon: 0.7 }) as ExtBankId);
  return [...res];
}

export interface AdTemplate extends Ad {
  off: number; // relative offset from base
}

export function makeAd(s: GameState, exchange: 'bybit' | 'rapira', side: 'sell' | 'buy', tier: 'local' | 'moscow' = 'local'): AdTemplate {
  const quality = weighted({ good: 6, mid: 3, shady: 1 }) as 'good' | 'mid' | 'shady';
  const merchant = makeMerchant(quality);
  const [minRub, maxRub] = limitsFor(s.chapter, tier);
  // Sellers ask above base, buyers bid around/below it. Rapira is slightly cheaper but thinner.
  let off: number;
  if (side === 'sell') off = tier === 'moscow' ? rand(0.0015, 0.008) : rand(0.0045, 0.019);
  else off = tier === 'moscow' ? rand(-0.001, 0.003) : rand(-0.013, -0.0015);
  if (exchange === 'rapira') off += side === 'sell' ? -0.0035 : -0.002;
  const price = round2(s.market.base * (1 + off));
  return {
    id: uid('ad'),
    exchange,
    side,
    merchant,
    price,
    off,
    availableUsdt: round2((maxRub / price) * rand(0.8, 3)),
    minRub,
    maxRub,
    banks: exchange === 'rapira' ? ['sber', 'tbank'] : adBanks(),
    terms: side === 'sell' ? pick(TERMS_SELL) : pick(TERMS_BUY),
    tier,
  };
}

export function maxAd(s: GameState, side: 'sell' | 'buy', price: number): AdTemplate {
  const m: Merchant = {
    nick: 'max_zero_arb',
    fullName: 'Нулёв Максим Олегович',
    masked: 'Максим Олегович Н.',
    completion: 93,
    orders: randInt(800, 1400),
    regDays: 260,
    verified: false,
    online: true,
    color: '#F43F5E',
    isMax: true,
  };
  return {
    id: uid('ad'),
    exchange: 'bybit',
    side,
    merchant: m,
    price: round2(price),
    off: price / s.market.base - 1,
    availableUsdt: randInt(400, 2500),
    minRub: 3000,
    maxRub: 150000,
    banks: ['sber', 'tbank', 'alfa', 'ozon'],
    terms: 'Лучший курс. Быстро. Без вопросов 😉',
    tier: 'local',
  };
}

export function regenerateAds(s: GameState, full = false) {
  const m = s.market;
  const keep = full ? [] : (m.ads as AdTemplate[]).filter((a) => !a.merchant.isMax && chance(0.72));
  const want = (ex: 'bybit' | 'rapira', side: 'sell' | 'buy') => (ex === 'bybit' ? (side === 'sell' ? 11 : 9) : 6);
  const result: AdTemplate[] = [...(keep as AdTemplate[])];
  // Rapira is a spot exchange with a RUB gateway; P2P lives on Bybit only.
  for (const ex of ['bybit'] as const) {
    for (const side of ['sell', 'buy'] as const) {
      const have = result.filter((a) => a.exchange === ex && a.side === side && a.tier === 'local').length;
      for (let i = have; i < want(ex, side); i++) result.push(makeAd(s, ex, side));
      if (ex === 'bybit' && s.chapter >= 4) {
        const haveM = result.filter((a) => a.exchange === ex && a.side === side && a.tier === 'moscow').length;
        for (let i = haveM; i < 4; i++) result.push(makeAd(s, ex, side, 'moscow'));
      }
    }
  }
  // Max Nol undercuts the best ask by one kopeck from chapter 3 on, and sits right under the player's ads he has undercut.
  if (s.chapter >= 3 && !s.flags.maxCollapsed) {
    const asks = result.filter((a) => a.exchange === 'bybit' && a.side === 'sell' && a.tier === 'local').sort((a, b) => a.price - b.price);
    if (asks[0]) result.push(maxAd(s, 'sell', asks[0].price - 0.01));
    for (const my of s.exchanges.bybit.ads) if (my.undercutBy && my.active) result.push({ ...maxAd(s, 'sell', my.undercutBy), id: `max_${my.id}` });
  }
  m.ads = result;
  m.nextRefreshAt = s.now + rand(4, 9);
}

export function repriceAds(s: GameState) {
  for (const a of s.market.ads as AdTemplate[]) {
    if (typeof a.off === 'number' && !a.merchant.isMax) a.price = round2(s.market.base * (1 + a.off));
  }
}

/** Random-walk the fair price and crypto quotes. dt in game minutes. */
export function marketStep(s: GameState, dt: number) {
  const m = s.market;
  const sd = Math.sqrt(Math.max(dt, 0.0001));
  m.anchor += gauss() * 0.002 * sd;
  m.anchor = clamp(m.anchor, 84, 98);
  m.base += (m.anchor - m.base) * 0.004 * dt + gauss() * 0.011 * sd;
  m.base = clamp(m.base, 82, 100);
  // Rapira spot premium oscillates, opening arbitrage windows.
  const prem = m.rapiraSpot / m.base - 1;
  const target = Math.sin(s.now / 190) * 0.0055;
  const nextPrem = prem + (target - prem) * 0.02 * dt + gauss() * 0.0004 * sd;
  m.rapiraSpot = round2(m.base * (1 + clamp(nextPrem, -0.012, 0.012, )));
  m.tonUsd = Math.max(0.8, m.tonUsd * (1 + gauss() * 0.0009 * sd));
  m.btcUsd = Math.max(20000, m.btcUsd * (1 + gauss() * 0.0006 * sd));
  const last = m.history[m.history.length - 1];
  if (!last || s.now - last.at >= 10) {
    m.history.push({ at: s.now, v: round2(m.base) });
    if (m.history.length > 240) m.history.shift();
  }
}

export const bestPrice = (s: GameState, exchange: 'bybit' | 'rapira', side: 'sell' | 'buy', excludeMax = false) => {
  const list = s.market.ads.filter((a) => a.exchange === exchange && a.side === side && a.tier === 'local' && (!excludeMax || !a.merchant.isMax));
  if (!list.length) return s.market.base;
  return side === 'sell' ? Math.min(...list.map((a) => a.price)) : Math.max(...list.map((a) => a.price));
};

/**
 * Probability per game minute that a counterparty takes the player's ad.
 * Sell ad competes with asks (cheaper = faster); buy ad competes with bids (higher = faster).
 */
export function adFillRate(s: GameState, ad: MyAd): number {
  const ex = s.exchanges[ad.exchange];
  const best = bestPrice(s, ad.exchange, ad.side, true);
  const premiumPct = ad.side === 'sell' ? ((ad.price - best) / best) * 100 : ((best - ad.price) / best) * 100;
  let rate = 0.32 * Math.exp(-Math.max(-0.4, premiumPct) / 0.62);
  rate = Math.min(rate, 0.6);
  // Reputation: completion rate & order count.
  const total = ex.completed + ex.cancelled;
  const completion = total ? ex.completed / total : 1;
  rate *= 0.6 + 0.4 * completion;
  if (ex.completed < 3) rate *= 0.85;
  // Max's 1-kopeck undercut steals the top spot.
  if (ad.undercutBy) rate *= 0.55;
  // Wider limits attract more counterparties.
  if (ad.minRub > 50000) rate *= 0.6;
  if (s.hero.location === 'moscow' || s.chapter >= 4) rate *= 1.15;
  return rate;
}

export function sellScenario(s: GameState, cpQuality: number, rub: number): OrderScenario {
  const story = s.difficulty === 'story' ? 0.6 : 1;
  const ch = s.chapter;
  // Shady counterparties (low completion / new accounts) are much more likely to scam.
  const shady = cpQuality < 0.5 ? 2.4 : cpQuality < 0.8 ? 1.2 : 0.55;
  const size = rub > 200000 ? 1.4 : 1;
  const scamBase = (ch <= 2 ? 0.1 : 0.16) * story * shady * size;
  return weighted({
    legit: 1 - scamBase * 2.2,
    late_pay: 0.07,
    fake_receipt: scamBase * 0.8,
    third_party: scamBase * (ch >= 3 ? 0.85 : 0.5),
    underpay: scamBase * 0.45,
  }) as OrderScenario;
}

export function buyScenario(s: GameState, cpQuality: number): OrderScenario {
  const story = s.difficulty === 'story' ? 0.6 : 1;
  const shady = cpQuality < 0.5 ? 2.5 : cpQuality < 0.8 ? 1.1 : 0.5;
  const scam = (s.chapter <= 2 ? 0.07 : 0.13) * story * shady;
  return weighted({
    legit: 1 - scam * 1.6,
    slow_release: 0.08,
    requisites_third_party: scam * 0.9,
    pay_elsewhere: scam * 0.6,
  }) as OrderScenario;
}

export const merchantQuality = (m: Merchant) =>
  clamp((m.completion - 60) / 40, 0, 1) * 0.5 + clamp(m.orders / 300, 0, 1) * 0.3 + clamp(m.regDays / 180, 0, 1) * 0.2;

/** Rounds a counterparty amount to something a human would type. */
export function humanAmount(min: number, max: number) {
  const steps = [1000, 2000, 2500, 3000, 5000, 7000, 7500, 10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000, 120000, 150000, 200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000];
  const ok = steps.filter((v) => v >= min && v <= max);
  if (ok.length && chance(0.8)) return pick(ok.slice(0, Math.max(3, Math.ceil(ok.length * 0.7))));
  return Math.round(rand(min, max) / 100) * 100;
}

export const NEWS: { text: string; impact: number; rapira?: number; risk?: number }[] = [
  { text: 'ЦБ сохранил ключевую ставку. Рубль стабилен.', impact: 0 },
  { text: 'Рубль ослаб на фоне падения нефти — USDT дорожает на P2P.', impact: 0.011 },
  { text: 'Экспортёры продают валюту: рубль укрепился.', impact: -0.009 },
  { text: 'Банки ужесточают проверки P2P-переводов: рост запросов по 115-ФЗ.', impact: 0.002, risk: 1.25 },
  { text: 'Rapira: техработы завершены, стакан USDT/RUB перегрет.', impact: 0, rapira: 0.006 },
  { text: 'Крупный мерчант слил ликвидность на Rapira — USDT дешевле рынка.', impact: 0, rapira: -0.007 },
  { text: 'ЦБ расширил базу дропперов: блокировки по 161-ФЗ участились.', impact: 0.001, risk: 1.15 },
  { text: 'Спрос на USDT вырос перед праздниками.', impact: 0.006 },
  { text: 'TON обновил максимум за месяц на новостях о Telegram.', impact: 0 },
];
