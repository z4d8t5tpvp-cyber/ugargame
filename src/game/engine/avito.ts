import type { AvitoChat, GameState } from '../types';
import { AVITO_ITEMS, JOBS } from '../data/static';
import { makeName } from '../data/names';
import { chance, clamp, dayIndex, fmtRub, pick, rand, randInt, round2, uid, weighted } from '../util';
import { emit, hero, notify, thought, toast } from './core';
import { incoming } from './banks';

type D = GameState;

export function listItem(d: D, itemId: string, price: number) {
  const item = AVITO_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: 'Нет такого товара' };
  if (!(price >= 100)) return { ok: false, error: 'Укажите цену' };
  const ex = d.avito.listings.find((l) => l.itemId === itemId);
  if (ex && ex.status === 'sold') return { ok: false, error: 'Уже продано' };
  if (ex && ex.status === 'reserved') return { ok: false, error: 'Вещь забронирована покупателем' };
  if (ex) {
    ex.price = Math.round(price);
    ex.status = 'active';
  } else d.avito.listings.push({ itemId, price: Math.round(price), listedAt: d.now, views: 0, status: 'active' });
  return { ok: true };
}

export function unlistItem(d: D, itemId: string) {
  const l = d.avito.listings.find((x) => x.itemId === itemId);
  if (l && l.status === 'active') d.avito.listings = d.avito.listings.filter((x) => x.itemId !== itemId);
}

const SCAM_LINKS = ['avito-dostavka.pay-safe24.ru/receive', 'avito.ru-delivery.online/payout', 'avlto-dostavka.ru/get-money'];

function newChat(d: D, itemId: string, price: number) {
  const fair = AVITO_ITEMS.find((i) => i.id === itemId)!.fair;
  const kind = weighted({ legit: 5, haggle: 3, courier_scam: price < fair * 0.85 ? 3.5 : 2 }) as AvitoChat['kind'];
  const nm = makeName();
  const offer = kind === 'haggle' ? Math.round((price * rand(0.75, 0.9)) / 100) * 100 : price;
  const c: AvitoChat = { id: uid('av'), itemId, buyer: `${nm.first} ${nm.last[0]}.`, kind, offer, messages: [], state: 'open', unread: 1 };
  const t = d.now;
  if (kind === 'legit') c.messages.push({ from: 'buyer', text: pick(['Здравствуйте! Ещё актуально? Могу забрать сегодня.', 'Добрый вечер, готов купить за вашу цену. Когда можно подъехать?', 'Привет! Беру, если в рабочем состоянии. Переведу по СБП при встрече.']), at: t });
  if (kind === 'haggle') c.messages.push({ from: 'buyer', text: `Здравствуйте. Отдадите за ${fmtRub(offer)}? Заберу сразу.`, at: t });
  if (kind === 'courier_scam') {
    c.messages.push({ from: 'buyer', text: 'Здравствуйте, беру без торга! Я в другом городе, оформлю Авито Доставку, курьер заберёт.', at: t });
    c.messages.push({ from: 'buyer', text: `Оплатил, вот ссылка для получения денег на карту: ${pick(SCAM_LINKS)}/${randInt(1000, 9999)}`, at: t + 0.2, link: 'phish' });
  }
  d.avito.chats.unshift(c);
  notify(d, 'avito', 'Барахолка', `${c.buyer}: ${c.messages[0].text}`);
}

export function avitoReply(d: D, chatId: string, action: 'agree' | 'decline' | 'report' | 'meet_only') {
  const c = d.avito.chats.find((x) => x.id === chatId);
  if (!c || c.state !== 'open') return;
  const listing = d.avito.listings.find((l) => l.itemId === c.itemId);
  c.unread = 0;
  if (action === 'report') {
    c.messages.push({ from: 'system', text: 'Пользователь заблокирован. Спасибо, что сообщили о мошенничестве.', at: d.now });
    c.state = 'closed';
    if (c.kind === 'courier_scam') {
      d.stats.scamsCaught++;
      hero(d, { attention: 3 });
      emit(d, { type: 'scam_caught', kind: 'avito_phishing' });
    }
    return;
  }
  if (action === 'decline') {
    c.messages.push({ from: 'me', text: 'Нет, спасибо.', at: d.now });
    if (c.kind === 'haggle' && chance(0.35)) {
      c.messages.push({ from: 'buyer', text: `Ладно, давайте за вашу цену — ${fmtRub(listing?.price ?? c.offer)}.`, at: d.now + 1 });
      c.offer = listing?.price ?? c.offer;
      c.kind = 'legit';
      return;
    }
    c.state = 'closed';
    return;
  }
  if (action === 'meet_only') {
    c.messages.push({ from: 'me', text: 'Только личная встреча в Новозаровске, оплата при встрече.', at: d.now });
    if (c.kind === 'courier_scam') {
      c.messages.push({ from: 'buyer', text: 'Тогда не актуально.', at: d.now + 1 });
      c.state = 'closed';
      d.stats.scamsCaught++;
      emit(d, { type: 'scam_caught', kind: 'avito_phishing' });
      return;
    }
    action = 'agree';
  }
  if (!listing || listing.status !== 'active') {
    c.messages.push({ from: 'me', text: 'Извините, уже продано.', at: d.now });
    c.state = 'closed';
    return;
  }
  if (c.kind === 'courier_scam') {
    c.messages.push({ from: 'me', text: 'Хорошо.', at: d.now });
    c.messages.push({ from: 'buyer', text: 'Перейдите по ссылке выше и введите данные карты, чтобы получить деньги 👍', at: d.now + 0.5 });
    return;
  }
  c.messages.push({ from: 'me', text: `Договорились, ${fmtRub(c.offer)}. Подходите к 1-му подъезду, ул. Ленина 14.`, at: d.now });
  c.messages.push({ from: 'buyer', text: 'Ок, буду через час.', at: d.now + 0.5 });
  c.state = 'agreed';
  c.meetAt = d.now + rand(40, 80);
  listing.status = 'reserved';
}

/** Player submits card data on the phishing page. */
export function phishSubmit(d: D, chatId: string) {
  const c = d.avito.chats.find((x) => x.id === chatId);
  const b = d.banks.sber;
  const stolen = round2(Math.min(b.balance, randInt(8, 15) * 1000));
  if (stolen > 0) {
    b.balance = round2(b.balance - stolen);
    b.txs.unshift({ id: uid('tx'), at: d.now, amount: -stolen, kind: 'fraud', title: 'AVITO*DOSTAVKA PAY', seen: true, comment: 'Оплата в интернете' });
  }
  if (c) {
    c.state = 'scammed';
    c.messages.push({ from: 'system', text: 'Собеседник удалил аккаунт.', at: d.now });
  }
  d.stats.scamsMissed++;
  hero(d, { stress: 25 });
  toast(d, 'error', `Фишинг: с карты Сбера списано ${fmtRub(stolen)}. Ссылка была поддельной.`);
  notify(d, 'sber', 'СберБанк Онлайн', `Покупка ${fmtRub(stolen)}: AVITO*DOSTAVKA PAY`);
  emit(d, { type: 'scam_missed', kind: 'avito_phishing' });
  return stolen;
}

export function avitoTick(d: D, dt: number) {
  for (const l of d.avito.listings) {
    if (l.status !== 'active') continue;
    const fair = AVITO_ITEMS.find((i) => i.id === l.itemId)!.fair;
    const ratio = l.price / fair;
    const rate = 0.045 * Math.exp(-(ratio - 1) * 4.5) * (d.hero.energy < 10 ? 0.5 : 1);
    l.views += chance(0.3 * dt) ? randInt(1, 4) : 0;
    const open = d.avito.chats.filter((c) => c.itemId === l.itemId && c.state === 'open').length;
    if (open < 3 && chance(1 - Math.exp(-clamp(rate, 0, 0.5) * dt))) newChat(d, l.itemId, l.price);
  }
  for (const c of d.avito.chats) {
    if (c.state === 'agreed' && c.meetAt && d.now >= c.meetAt) {
      const l = d.avito.listings.find((x) => x.itemId === c.itemId);
      const item = AVITO_ITEMS.find((i) => i.id === c.itemId)!;
      c.state = 'done';
      c.messages.push({ from: 'buyer', text: 'Забрал, всё работает. Перевёл по СБП, спасибо!', at: d.now });
      if (l) l.status = 'sold';
      incoming(d, 'sber', c.offer, { title: c.buyer.replace('.', '') + '.', comment: `За ${item.title.split(' ')[0].toLowerCase()}`, kind: 'sbp_in', counterpartyBank: pick(['Т-Банк', 'Сбербанк', 'ВТБ']) });
      notify(d, 'avito', 'Барахолка', `Продано: ${item.title} за ${fmtRub(c.offer)}`);
      emit(d, { type: 'avito_sold', itemId: c.itemId, price: c.offer });
    }
  }
}

export function doJob(d: D, jobId: string) {
  const job = JOBS.find((j) => j.id === jobId);
  if (!job) return { ok: false, error: 'Нет такой подработки' };
  if (d.job.activeJob) return { ok: false, error: 'Вы уже на смене' };
  if (job.requires && !d.flags[job.requires]) return { ok: false, error: 'Сначала договоритесь об этой подработке' };
  if (d.job.doneToday.includes(jobId)) return { ok: false, error: 'Сегодня уже работали здесь. Приходите завтра.' };
  if (d.hero.energy < Math.abs(job.energy) + 5) return { ok: false, error: 'Слишком мало энергии. Поешьте или выспитесь.' };
  if (d.orders.some((o) => ['pending_payment', 'paid', 'appeal'].includes(o.status))) return { ok: false, error: 'Сначала закройте активные ордера.' };
  const h = (d.now % 1440) / 60;
  if (h + job.hours > 23.5) return { ok: false, error: 'Слишком поздно для смены. Завтра с утра.' };
  d.job.activeJob = { id: job.id, until: d.now + job.hours * 60, pay: job.pay, title: job.title };
  return { ok: true };
}

export function jobFinish(d: D) {
  const a = d.job.activeJob;
  if (!a) return;
  const job = JOBS.find((j) => j.id === a.id)!;
  d.job.activeJob = null;
  d.job.doneToday.push(job.id);
  hero(d, { energy: job.energy, stress: job.stress });
  incoming(d, 'sber', job.pay, { title: job.payer, kind: 'salary', comment: job.title, seen: false });
  toast(d, 'success', `Смена окончена: +${fmtRub(job.pay)} на Сбер`);
  emit(d, { type: 'job_done', jobId: job.id });
  if (job.id === 'gym') thought(d, 'Поработал руками — голова прояснилась.', true);
}

export function newDayReset(d: D) {
  d.job.doneToday = [];
  d.flags.lastDay = dayIndex(d.now);
}
