import type { BankId, CharacterId, GameState } from '../types';
import { CHAPTERS, computeEnding, T3, teamCount } from './chapters';
import { CUTSCENES } from './cutscenes';
import { hooks, makeCtx, playNode, pushMsg } from './ctx';

import { P2P_CHATTER } from './chats';
import { hero, notify, onGameEvent, toast, trust } from '../engine/core';
import { incoming, openRequest, spend } from '../engine/banks';
import { NEWS, regenerateAds } from '../engine/market';
import { chance, fmtRub, minuteOfDay, monthKey, pick, rand, uid } from '../util';
import { SHOP } from '../data/static';

type D = GameState;

// ───────── cutscenes ─────────

export function startCutscene(d: D, id: string) {
  if (!CUTSCENES[id]) return;
  if (d.cutscene) {
    d.flags.cutsceneQueue = [String(d.flags.cutsceneQueue || ''), id].filter(Boolean).join(',');
    return;
  }
  d.cutscene = { id, line: 0 };
}
hooks.cutscene = startCutscene;

export function cutsceneNext(d: D) {
  const cs = d.cutscene;
  if (!cs) return;
  const def = CUTSCENES[cs.id];
  const line = def.lines[cs.line];
  if (line?.choices?.some((ch) => !ch.if || ch.if(d))) return; // must choose
  advanceLine(d);
}

export function cutsceneChoose(d: D, idx: number) {
  const cs = d.cutscene;
  if (!cs) return;
  const line = CUTSCENES[cs.id].lines[cs.line];
  const avail = (line.choices ?? []).filter((ch) => !ch.if || ch.if(d));
  const ch = avail[idx];
  if (!ch) return;
  ch.run?.(makeCtx(d));
  advanceLine(d);
}

function advanceLine(d: D) {
  const cs = d.cutscene!;
  const def = CUTSCENES[cs.id];
  if (cs.line + 1 < def.lines.length) {
    cs.line++;
    return;
  }
  d.cutscene = null;
  def.onEnd?.(makeCtx(d));
  afterCutscene(d, def.id);
  const q = String(d.flags.cutsceneQueue || '').split(',').filter(Boolean);
  if (q.length) {
    d.flags.cutsceneQueue = q.slice(1).join(',');
    d.cutscene = { id: q[0], line: 0 };
  }
}

function afterCutscene(d: D, id: string) {
  if (id === 'first_trade') startChapter(d, 3);
  if (id === 'final_board') {
    d.flags.finalDone = true;
    const end = computeEnding(d);
    d.ending = end;
    startCutscene(d, end);
  }
}

// ───────── chapters ─────────

export function startChapter(d: D, n: number) {
  d.chapter = n;
  d.chapterStartedAt = d.now;
  d.ui.chapterCard = n;
  const c = makeCtx(d);
  switch (n) {
    case 1:
      startCutscene(d, 'intro');
      break;
    case 2:
      d.ui.windows.browser.open = true;
      d.ui.windows.browser.minimized = false;
      d.ui.windows.browser.z = ++d.ui.zTop;
      d.ui.browserTab = 'bybit';
      c.showChat('p2p_chat');
      c.showChat('news');
      c.showChat('bybit_bot');
      regenerateAds(d, true);
      // If chapter 1 ended before Danya introduced Sanya, play the intro first.
      if (!d.fired.danya_sanya) {
        d.fired.danya_sanya = true;
        c.script('danya_sanya', 'start', 1);
        c.script('sanya2', 'start', 28);
      } else c.script('sanya2', 'start', 3);
      pushMsg(d, 'bybit_bot', { from: 'bybit_bot', kind: 'text', text: 'Добро пожаловать в Bybit! ⚠️ Сотрудники Bybit никогда не просят пароль, коды 2FA и не пишут первыми в личку.' });
      break;
    case 3:
      regenerateAds(d, true);
      c.script('sanya3', 'start', 5);
      c.later(70, 'story', { what: 'danya3' });
      c.later(200, 'story', { what: 'sanya_money' });
      c.later(600, 'story', { what: 'rapira' });
      break;
    case 4:
      d.hero.location = 'moscow';
      regenerateAds(d, true);
      startCutscene(d, 'marat_cafe');
      c.later(240, 'story', { what: 'karim_otc' });
      break;
    case 5:
      c.showChat('karim');
      c.script('karim5', 'start', 4);
      c.later(30, 'story', { what: 'danya5' });
      c.later(60, 'story', { what: 'pasha_intro' });
      c.later(110, 'story', { what: 'ivan5' });
      break;
    case 6: {
      const banks = (['sber', 'tbank', 'alfa'] as BankId[]).filter((b) => d.banks[b].opened && d.banks[b].status !== 'restricted115');
      const main = banks.sort((a, b) => d.banks[b].balance - d.banks[a].balance)[0];
      if (main) openRequest(d, main, 'Запрос документов по 115-ФЗ: крупные транзитные операции, источник средств не подтверждён.', d.flags.poolRush ? 0.85 : 0.6);
      d.flags.ch6RequestOpened = true;
      startCutscene(d, 'night_crisis');
      break;
    }
    case 7:
      c.showChat('grisha');
      c.script('grisha7', 'start', 3);
      break;
    case 8:
      c.script('marat8', 'start', 3);
      {
        const day = Math.floor(d.now / 1440) + 2;
        d.flags.finalAt = day * 1440 + 19 * 60;
        d.scheduled.push({ id: uid('ev'), at: Number(d.flags.finalAt), type: 'story', payload: { what: 'final' } });
      }
      break;
  }
}

function checkGoals(d: D) {
  const def = CHAPTERS[d.chapter - 1];
  if (!def || d.cutscene) return;
  const required = def.goals.filter((g) => !g.optional);
  if (!required.every((g) => g.done(d))) return;
  const key = `chapter_done_${d.chapter}`;
  if (d.fired[key]) return;
  d.fired[key] = true;
  toast(d, 'success', `Глава ${d.chapter} «${def.title}» пройдена!`);
  switch (d.chapter) {
    case 1:
      startChapter(d, 2);
      break;
    case 2:
      startCutscene(d, 'first_trade');
      break;
    case 3:
      startChapter(d, 4);
      break;
    case 4:
      startChapter(d, 5);
      break;
    case 5:
      startChapter(d, 6);
      break;
    case 6:
      notify(d, 'telegram', 'Марат KMI', 'Молодец. Отбились. Теперь — легализация. Гриша расскажет.');
      startChapter(d, 7);
      break;
    case 7:
      startChapter(d, 8);
      break;
  }
}

// ───────── triggers polled every tick ─────────

function once(d: D, key: string, cond: boolean, run: () => void) {
  if (d.fired[key] || !cond) return;
  d.fired[key] = true;
  run();
}

function triggers(d: D) {
  const c = makeCtx(d);
  const n = d.chapter;
  const since = d.now - d.chapterStartedAt;
  const total = Object.values(d.banks).reduce((s, b) => s + (b.opened ? b.balance : 0), 0);
  once(d, 'danya_sanya', n === 1 && !d.cutscene && (total >= 6000 || since > 240), () => c.script('danya_sanya', 'start', 2));
  once(d, 'avito_tip', n === 1 && d.avito.chats.some((ch) => ch.kind === 'courier_scam'), () => c.script('avito_tip', 'start', 6));
  once(d, 'p2p_marat', n === 3 && d.stats.turnover >= T3(d), () => {
    c.showChat('p2p_chat');
    c.script('p2p_marat', 'start', 3);
    toast(d, 'info', 'В «Чате P2P Россия» новое сообщение от Марата KMI');
  });
  // Teach the two classic scams early in chapter 3.
  const sells = d.orders.filter((o) => o.side === 'sell').length;
  once(d, 'force_fake', n === 3 && sells >= 2, () => (d.flags.forceScenario = 'fake_receipt'));
  once(d, 'force_third', n === 3 && sells >= 5 && !d.flags.forceScenario, () => (d.flags.forceScenario = 'third_party'));
  once(d, 'team_clash', n === 5 && teamCount(d) >= 4 && !d.cutscene, () => startCutscene(d, 'team_clash'));
  once(d, 'kapul_deals', n >= 5 && d.characters.kapul.inTeam, () => c.later(rand(90, 200), 'story', { what: 'kapul_deal' }));
  once(d, 'ip_contract', n === 7 && d.tax.ipRegisteredAt !== null, () => {
    c.script('grisha7', 'contract', 4);
    c.later(rand(600, 900), 'story', { what: 'max_collapse' });
  });
  once(d, 'max_poach', n >= 6 && !d.flags.maxCollapsed && (['karim', 'pasha', 'danya', 'ivan', 'kapul'] as CharacterId[]).some((id) => d.characters[id].inTeam && d.characters[id].trust < 30), () => {
    const victim = (['ivan', 'kapul', 'danya', 'karim', 'pasha'] as CharacterId[]).find((id) => d.characters[id].inTeam && d.characters[id].trust < 30)!;
    d.characters[victim].inTeam = false;
    d.characters[victim].poached = true;
    c.showChat('max');
    c.script('max7', 'poach', 2);
    toast(d, 'warn', 'Макс Ноль переманил человека из вашей команды');
  });
  once(d, 'request_closed_marat', n === 6 && !!d.flags.ch6RequestOpened && Object.values(d.banks).every((b) => b.status !== 'request115'), () => {
    trust(d, 'marat', 5);
  });
}

// ───────── engine event reactions ─────────

onGameEvent((d, e) => {
  const c = makeCtx(d);
  switch (e.type) {
    case 'exchange':
      if (e.what === 'kyc' && d.chapter === 2) c.script('sanya2', 'kyc', 2);
      if (e.what === '2fa' && d.chapter === 2) c.script('sanya2', 'twofa', 2);
      break;
    case 'trade_done': {
      const o = d.orders.find((x) => x.id === e.orderId);
      if (o?.side === 'buy' && d.chapter === 2 && !d.fired.sanya_bought) {
        d.fired.sanya_bought = true;
        c.script('sanya2', 'bought', 2);
      }
      if (o && minuteOfDay(d.now) < 360) d.stats.nightTrades++;
      break;
    }
    case 'scam_caught':
      hero(d, { attention: 2 });
      if (!d.fired[`caught_${e.kind}`]) {
        d.fired[`caught_${e.kind}`] = true;
        const lines: Record<string, string> = {
          fake_receipt: 'Красава, что не повёлся на чек! Смс с обычного номера и картинка в чате — это ноль. Смотри только выписку.',
          third_party: 'Вот это правильно 👏 Деньги от «Зинаиды за коляску» — это мошенничество через тебя. Отпустил бы — словил бы 161-ФЗ.',
          requisites_third_party: 'Правильно отменил. ФИО в реквизитах не совпадает с продавцом — значит, карта дропа.',
          pay_elsewhere: 'Платить только по реквизитам ордера! Любые «переведи на другую карту» — скам.',
          avito_phishing: '',
          underpay: 'Недоплату поймал — уважение. Многие смотрят только на имя, а не на сумму.',
        };
        const t = lines[e.kind];
        if (t && d.tg.sanya.visible) c.say('sanya', { from: 'sanya', text: t }, 2);
      }
      break;
    case 'scam_missed':
      trust(d, 'karim', -1);
      if (!d.fired[`missed_${e.kind}`] && d.tg.sanya.visible) {
        d.fired[`missed_${e.kind}`] = true;
        const lines: Record<string, string> = {
          fake_receipt: 'Бро… Ты отпустил без денег? Чек в чате нарисовать — минута. Всегда «Обновить выписку» в банке. Всегда.',
          third_party: 'Ты отпустил монеты за перевод от левого человека?! Готовься, через пару часов может прилететь 161-ФЗ. Если прилетит — пиши заявление в ЦБ через банк.',
          underpay: 'Недоплата — классика. Сверяй сумму до рубля, а не только имя.',
          requisites_third_party: 'Ты заплатил на карту с чужим ФИО… Это мог быть дроп. Держи кулаки, чтобы банк не прицепился.',
          pay_elsewhere: 'Ты перевёл на «другую карту» из чата? Это скам, бро. Только реквизиты из ордера.',
        };
        const t = lines[e.kind];
        if (t) c.say('sanya', { from: 'sanya', text: t }, 2);
      }
      break;
    case 'block161':
      d.flags.had161 = true;
      break;
    case 'request_closed':
      if (!e.ok) d.flags.requestFailed = true;
      break;
    case 'bank_status':
      if (e.status === 'max_undercut' && !d.fired.max3) {
        d.fired.max3 = true;
        c.showChat('max');
        c.script('max3', 'start', 3);
      }
      if (e.status === 'cooling' && !d.fired.sanya_cooling && d.tg.sanya.visible) {
        d.fired.sanya_cooling = true;
        c.say('sanya', { from: 'sanya', text: 'О, первое охлаждение? 😅 Сутки переводы с этой карты не пройдут. Работай с другой и не гоняй деньги транзитом.' }, 3);
      }
      break;
  }
});

// ───────── scheduled story events ─────────

export function storyEvent(d: D, payload: Record<string, unknown>) {
  const c = makeCtx(d);
  const what = String(payload.what);
  switch (what) {
    case 'danya3':
      c.script('danya3', 'start');
      break;
    case 'sanya_money':
      c.script('sanya3', 'money');
      break;
    case 'rapira':
      if (!d.flags.rapiraUnlocked) c.script('sanya3', 'rapira');
      break;
    case 'karim_otc':
      c.script('karim4', 'otc');
      break;
    case 'danya5':
      c.script('danya5', 'start');
      break;
    case 'pasha_intro':
      c.say('danya', { from: 'danya', text: 'Брат, помнишь Пашу Борца? Он сейчас свободен. Лучше него людей никто не читает. Кинул ему твой контакт 🤼' });
      c.showChat('pasha');
      c.script('pasha5', 'start', 8);
      break;
    case 'ivan5':
      c.showChat('ivan');
      c.script('ivan5', 'start');
      break;
    case 'kapul_deal':
      if (d.characters.kapul.inTeam && !d.ending) {
        c.script('kapul5', 'deal');
        c.later(rand(240, 480), 'story', { what: 'kapul_deal' });
      }
      break;
    case 'max_collapse':
      d.flags.maxCollapsed = true;
      d.market.ads = d.market.ads.filter((a) => !a.merchant.isMax);
      for (const ad of d.exchanges.bybit.ads) ad.undercutBy = undefined;
      startCutscene(d, 'max_collapse');
      break;
    case 'final':
      if (!d.flags.finalDone) startCutscene(d, 'final_board');
      break;
  }
}

export function handleStoryScheduled(d: D, type: string, payload: Record<string, unknown>) {
  const c = makeCtx(d);
  switch (type) {
    case 'story':
      storyEvent(d, payload);
      return true;
    case 'retry_recruit': {
      const who = String(payload.who);
      if (who === 'grisha' && !d.tax.grishaHired) playNode(d, 'grisha6', 'retry');
      if (who === 'karim' && !d.characters.karim.inTeam) playNode(d, 'karim5', 'retry');
      if (who === 'pasha' && !d.characters.pasha.inTeam) playNode(d, 'pasha5', 'retry');
      return true;
    }
    case 'danya_bet':
      if (chance(0.35)) {
        incoming(d, 'sber', 52000, { title: 'ООО «Фонбет»', kind: 'sbp_in', comment: 'Выигрыш' });
        c.say('danya', { from: 'danya', text: 'ЗАШЛО!!! 🔥🔥🔥 Я же говорил, брат!' });
      } else {
        c.say('danya', { from: 'danya', text: 'Брат… не зашло 😞 Он в третьем раунде лёг. Прости.' });
        hero(d, { stress: 8 });
        trust(d, 'karim', -3);
      }
      return true;
  }
  return false;
}

// ───────── ambient & daily ─────────

function ambient(d: D) {
  if (d.chapter >= 2 && d.tg.p2p_chat.visible && chance(0.004)) {
    const m = pick(P2P_CHATTER);
    pushMsg(d, 'p2p_chat', { from: 'g', fromName: m.name, kind: 'text', text: m.text });
    d.tg.p2p_chat.unread = Math.min(d.tg.p2p_chat.unread, 99);
  }
  const m = d.market;
  if (d.chapter >= 2 && d.now - m.lastShockAt > 360 && chance(0.003)) {
    const n = pick(NEWS);
    m.lastShockAt = d.now;
    m.anchor *= 1 + n.impact;
    m.base *= 1 + n.impact * 0.6;
    if (n.rapira) m.rapiraSpot = m.base * (1 + n.rapira);
    if (n.risk) d.flags.riskMult = n.risk;
    else d.flags.riskMult = 1;
    m.news.unshift({ id: uid('news'), at: d.now, text: n.text, impact: n.impact });
    if (m.news.length > 30) m.news.length = 30;
    if (d.tg.news.visible) pushMsg(d, 'news', { from: 'news', kind: 'text', text: `📰 ${n.text}` });
  }
}

export function monthly(d: D) {
  const mk = monthKey(d.now);
  if (d.flags.billsMonth === mk) return;
  const first = !d.flags.billsMonth;
  d.flags.billsMonth = mk;
  if (first) return;
  const bills: [string, number][] = [];
  if (d.hero.home === 'flat' || d.hero.home === 'office') bills.push(['Аренда квартиры', SHOP.find((s) => s.id === 'flat')!.monthly!]);
  if (d.flags.officeRented) bills.push(['Аренда офиса', SHOP.find((s) => s.id === 'office')!.monthly!]);
  if (d.hero.car === 'bmw_leasing') bills.push(['Лизинг BMW', SHOP.find((s) => s.id === 'bmw')!.monthly!]);
  if (d.tax.grishaHired) bills.push(['Гриша Бухгалтер', 30000]);
  for (const [title, amount] of bills) {
    const ok = (['sber', 'tbank', 'alfa'] as BankId[]).some((b) => spend(d, b, amount, title).ok);
    if (!ok) {
      d.flags.missedPayments = (Number(d.flags.missedPayments) || 0) + 1;
      hero(d, { stress: 12 });
      toast(d, 'error', `Не хватило денег на платёж: ${title} (${fmtRub(amount)})`);
    } else notify(d, 'system', 'Ежемесячный платёж', `${title}: −${fmtRub(amount)}`);
  }
}

export function directorTick(d: D) {
  if (!d.started) return;
  triggers(d);
  checkGoals(d);
  ambient(d);
}

export function newGameStory(d: D) {
  startChapter(d, 1);
}

export const T3value = T3;
