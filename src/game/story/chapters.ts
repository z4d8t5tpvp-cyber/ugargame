import type { BankId, GameState } from '../types';
import { BANK_NAMES, fmtRub, fmtUsdt, plural } from '../util';
import { netWorth, profitSince, taxRate, totalRub } from '../engine/core';

export interface Goal {
  id: string;
  text: string | ((d: GameState) => string);
  done: (d: GameState) => boolean;
  progress?: (d: GameState) => [number, number];
  optional?: boolean;
}

export interface ChapterDef {
  n: number;
  title: string;
  subtitle: string;
  goals: Goal[];
}

export const T3 = (d: GameState) => (d.difficulty === 'story' ? 600000 : 1000000);
export const T4 = (d: GameState) => (d.difficulty === 'story' ? 8000 : 15000);
export const netProfitSince = (d: GameState, from: number) => {
  const p = profitSince(d, from);
  return p > 0 ? p * (1 - taxRate(d)) : p;
};
export const teamCount = (d: GameState) => (['karim', 'pasha', 'danya', 'ivan', 'kapul'] as const).filter((id) => d.characters[id].inTeam).length;

export const CHAPTERS: ChapterDef[] = [
  {
    n: 1,
    title: 'Новозаровск',
    subtitle: 'Собрать первые 10 000 ₽',
    goals: [
      { id: 'money', text: 'Собрать 10 000 ₽ на картах', done: (d) => totalRub(d) >= 10000, progress: (d) => [Math.min(totalRub(d), 10000), 10000] },
    ],
  },
  {
    n: 2,
    title: 'Первый USDT',
    subtitle: 'Пройти первый ручной цикл P2P',
    goals: [
      { id: 'kyc', text: 'Зарегистрироваться на Bybit и пройти KYC', done: (d) => d.exchanges.bybit.kyc === 'verified' },
      { id: '2fa', text: 'Привязать Google Authenticator', done: (d) => d.exchanges.bybit.twoFA },
      { id: 'buy', text: 'Купить USDT на P2P: ручной перевод с карты + PDF-чек', done: (d) => !!d.flags.firstBuyDone },
      { id: 'sell', text: 'Продать USDT дороже: проверить выписку и отпустить с 2FA', done: (d) => !!d.flags.firstSellDone },
    ],
  },
  {
    n: 3,
    title: 'Первый миллион оборота',
    subtitle: 'Объёмы, лимиты и первые мошенники',
    goals: [
      { id: 'bank2', text: 'Открыть второй банк (Т-Банк или Альфа)', done: (d) => d.banks.tbank.opened || d.banks.alfa.opened },
      { id: 'turnover', text: (d) => `Оборот ${fmtRub(T3(d))}`, done: (d) => d.stats.turnover >= T3(d), progress: (d) => [Math.min(d.stats.turnover, T3(d)), T3(d)] },
      { id: 'marat', text: 'Привлечь внимание Марата KMI', done: (d) => !!d.flags.ch3done },
    ],
  },
  {
    n: 4,
    title: 'Знакомство с Маратом KMI',
    subtitle: 'Научиться считать чистую прибыль',
    goals: [
      { id: 'sheet', text: 'Открыть финмодель Карима и Марата (браузер)', done: (d) => !!d.flags.sheetOpened },
      { id: 'profit', text: (d) => `Заработать ${fmtRub(T4(d))} чистой прибыли (после налогового резерва)`, done: (d) => netProfitSince(d, d.chapterStartedAt) >= T4(d), progress: (d) => [Math.max(0, Math.min(netProfitSince(d, d.chapterStartedAt), T4(d))), T4(d)] },
      { id: 'otc', text: 'Провести тестовую OTC-сделку Карима (AML + гарант)', done: (d) => d.otc.some((o) => o.from === 'karim' && (o.status === 'done' || o.status === 'declined')), optional: true },
    ],
  },
  {
    n: 5,
    title: 'Своя команда',
    subtitle: 'Карим, Паша, Даня, Иван и Капул',
    goals: [
      { id: 'team', text: 'Собрать команду: минимум 4 из 5', done: (d) => teamCount(d) >= 4, progress: (d) => [teamCount(d), 4] },
      { id: 'pool', text: 'Решить судьбу OTC-пула Капула', done: (d) => !!d.flags.poolDecided },
    ],
  },
  {
    n: 6,
    title: 'Большие обороты',
    subtitle: 'Запрос банка, заморозка и поиск виноватых',
    goals: [
      { id: 'grisha', text: 'Нанять Гришу Бухгалтера', done: (d) => d.tax.grishaHired },
      { id: 'request', text: 'Ответить банку по 115-ФЗ: чеки + выгрузка ордеров + справка', done: (d) => !!d.flags.ch6RequestOpened && !Object.values(d.banks).some((b) => b.status === 'request115') },
    ],
  },
  {
    n: 7,
    title: 'Своё имя',
    subtitle: 'Легализация и война с Максом Нолём',
    goals: [
      { id: 'ip', text: 'Зарегистрировать ИП на УСН «Доходы минус расходы» (Госуслуги)', done: (d) => d.tax.regime === 'ip_usn' && d.tax.ipRegisteredAt !== null },
      { id: 'tax', text: 'Подать декларацию и уплатить налог', done: (d) => d.tax.declared },
      { id: 'max', text: 'Пережить ценовую войну с Максом Нолём', done: (d) => !!d.flags.maxCollapsed },
    ],
  },
  {
    n: 8,
    title: 'Цена успеха',
    subtitle: 'Финальное решение',
    goals: [
      { id: 'meet', text: (d) => (d.flags.finalAt ? `Встреча у Марата: подготовить капитал (сейчас ${fmtRub(netWorth(d))})` : 'Дождаться приглашения Марата'), done: (d) => !!d.flags.finalDone },
    ],
  },
];

export const chapterDef = (n: number) => CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, n - 1))];

export function accountingQuality(d: GameState) {
  const paidBuys = d.orders.filter((o) => o.side === 'buy' && o.status === 'completed').length;
  const receiptRatio = paidBuys ? Math.min(1, d.stats.receiptsSaved / paidBuys) : 0.5;
  let q = receiptRatio * 30;
  if (d.tax.regime === 'ip_usn' && d.tax.ipRegisteredAt) q += 20;
  if (d.tax.declared) q += 20;
  if (d.tax.grishaHired) q += 15;
  if (!d.flags.requestFailed) q += 15;
  if (d.flags.npdTrap) q -= 10;
  if (d.flags.had161) q -= 10;
  return Math.max(0, Math.min(100, Math.round(q)));
}

export function computeEnding(d: GameState): 'end_architect' | 'end_wolf' | 'end_crisis' | 'end_newstart' {
  const nw = netWorth(d);
  const acc = accountingQuality(d);
  const c = d.characters;
  const core = (c.marat.trust + c.karim.trust + c.pasha.trust) / 3;
  const high = d.difficulty === 'story' ? 400000 : 700000;
  const mid = d.difficulty === 'story' ? 150000 : 250000;
  if (d.flags.ivanLeverage || nw < 0 || (d.hero.car === 'bmw_leasing' && nw < mid)) return 'end_crisis';
  if (d.flags.finalSolo) return nw >= mid ? 'end_wolf' : 'end_newstart';
  if (nw >= high && acc >= 55 && core >= 55) return 'end_architect';
  if (nw >= mid && core < 50) return 'end_wolf';
  if (nw < mid) return c.pasha.trust >= 45 || c.marat.trust >= 45 ? 'end_newstart' : 'end_crisis';
  return acc >= 45 ? 'end_architect' : 'end_wolf';
}

/** Step-by-step guidance for whatever the player is doing right now. */
export function hintFor(d: GameState): string | null {
  const active = d.orders.filter((o) => ['pending_payment', 'paid', 'appeal'].includes(o.status));
  for (const o of active) {
    if (o.side === 'buy' && o.status === 'pending_payment' && o.req) {
      if (o.paidRub < o.rub - 1)
        return `Ордер на покупку: нажмите «Скопировать» у номера продавца → телефон → банк → «Перевод по СБП» → «Вставить из буфера» → банк получателя: ${BANK_NAMES[o.req.bank]} → сверьте ФИО с «${o.cp.fullName}» → сумма ${fmtRub(o.rub, 2)}.`;
      if (!o.receiptFileId) return 'Перевод отправлен. В банке нажмите «Сохранить PDF-чек», затем в ордере на компьютере — «Прикрепить чек».';
      return 'Чек прикреплён — нажмите «Я оплатил — уведомить продавца».';
    }
    if (o.side === 'buy' && o.status === 'paid') return 'Продавец проверяет поступление. Если он просит чек — прикрепите его в ордере.';
    if (o.side === 'sell' && o.status === 'pending_payment') return `Покупатель ${o.cp.nick} оплачивает ${fmtRub(o.rub, 2)}. Ждите и не отпускайте USDT до проверки выписки.`;
    if (o.side === 'sell' && (o.status === 'paid' || o.status === 'appeal'))
      return `Покупатель отметил оплату. Телефон → ${BANK_NAMES[o.playerBank!]} → «Обновить выписку». Проверьте сумму ${fmtRub(o.rub, 2)} и ФИО «${o.cp.masked}». Всё сходится — код из Authenticator и «Отпустить USDT». Нет денег или чужое ФИО — апелляция.`;
  }
  const n = d.chapter;
  if (n === 1) {
    if (totalRub(d) < 10000) return 'Телефон → «Барахолка»: выставьте вещи или возьмите подработку. Покупатели пишут в чат. Не переходите по ссылкам «Авито Доставки»!';
  }
  if (n === 2) {
    const ex = d.exchanges.bybit;
    if (!ex.registered) return 'Откройте «Браузер» на компьютере → вкладка Bybit → «Регистрация».';
    if (ex.kyc !== 'verified') return ex.kyc === 'pending' ? 'Верификация на проверке — несколько минут. Можно ускорить время кнопкой 5x.' : 'Bybit → «Пройти верификацию (KYC)».';
    if (!ex.twoFA) return 'Bybit → Профиль → Безопасность: скопируйте ключ, вставьте его в «Authenticator» на телефоне и введите 6-значный код.';
    if (!d.flags.firstBuyDone) return 'Bybit → P2P → «Купить». Выберите объявление со Сбером и надёжным продавцом, введите 10 000 ₽ и откройте сделку.';
    if (!d.flags.firstSellDone) {
      if (!ex.ads.length) return `Bybit → «Мои объявления» → «Создать»: продажа ${fmtUsdt(ex.usdt)} по цене на ~0,9% выше покупки. Банк получения — Сбер.`;
      return 'Объявление опубликовано. Ждите покупателя (можно ускорить время). Когда он оплатит — проверьте выписку в банке!';
    }
  }
  if (n === 3 && !d.banks.tbank.opened && !d.banks.alfa.opened) return 'Телефон → Т-Банк или Альфа-Банк → «Оформить карту». Распределяйте переводы между банками.';
  if (n === 3) return 'Наращивайте оборот: покупайте у надёжных мерчантов, продавайте через своё объявление. Тратьте с карт на жизнь, не гоняйте деньги транзитом.';
  if (n === 4 && !d.flags.sheetOpened) return 'Браузер → вкладка «Финмодель». Посмотрите на последнюю строку — это ваша настоящая прибыль.';
  if (n === 5) return 'Отвечайте в Telegram: Карим, Даня, Паша, Иван и Капул. Команда даёт аудит сделок и новые объёмы.';
  if (n === 6) {
    const req = (Object.keys(d.banks) as BankId[]).find((b) => d.banks[b].status === 'request115');
    if (req) return `Запрос 115-ФЗ в ${BANK_NAMES[req]}: Bybit → Профиль → «Экспорт ордеров», затем папка «Чеки и Ордера» → выделить чеки, выгрузку и справку → «Отправить в банк».`;
  }
  if (n === 7) {
    if (d.tax.regime !== 'ip_usn') return 'Браузер → «Госуслуги / ФНС» → регистрация ИП на УСН «Доходы минус расходы» 15%. Самозанятость — ловушка.';
    if (!d.tax.declared && d.tax.ipRegisteredAt) return 'Госуслуги / ФНС → «Подать декларацию и уплатить налог».';
  }
  if (n === 8 && d.flags.finalAt) return 'До встречи с Маратом наращивайте чистый капитал и не берите лишних рисков. Сон и ускорение времени приблизят встречу.';
  return null;
}

export const teamWord = (n: number) => `${n} ${plural(n, 'человек', 'человека', 'человек')}`;
