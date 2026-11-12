import type { Ctx, Script } from './ctx';
import { registerScripts } from './ctx';
import { addFile, bookAdd, toast } from '../engine/core';
import { generateOtcDeal, otcTotal } from '../engine/otc';
import { fmtRub, fmtUsdt, round2, uid } from '../util';
import type { CharacterId, GameState } from '../types';

const v = (text: string, duration: number) => ({ from: '', kind: 'voice' as const, text, duration });

function takeLoan(c: Ctx, from: CharacterId, amount: number, share: number) {
  c.d.obligations.push({ id: uid('debt'), from, amount, sharePct: share, takenAt: c.d.now, returned: false });
}

export function postDeal(c: Ctx, from: 'kapul' | 'karim' | 'ivan', opts: Parameters<typeof generateOtcDeal>[2] = {}) {
  const deal = generateOtcDeal(c.d, from, opts);
  c.showChat('garant_real');
  c.showChat('garant_fake');
  c.say(from, {
    from,
    kind: 'deal',
    dealId: deal.id,
    text: `${deal.title}\nПродаёт ${fmtUsdt(deal.usdt)} по ${deal.price.toFixed(2)} ₽ (рынок ${deal.marketPrice.toFixed(2)})\nСумма: ${fmtRub(otcTotal(deal))}\nГарант: ${deal.guarantor}`,
  });
  return deal;
}

const S: Record<string, Script> = {
  // ───────────── Глава 1 ─────────────
  danya1: {
    chat: 'danya',
    nodes: {
      start: {
        msgs: [
          { ...v('Тёмыч, здорово! Слышал про Лерку… Забей, брат, она ещё пожалеет. Слушай, приходи в зал — мне нужен помощник: маты протереть, новичкам лапы подержать. Полторашка за смену, сразу на карту.', 14), from: 'danya' },
          { from: 'danya', text: 'Ну чё, придёшь? 🥊' },
        ],
        choices: [
          { id: 'yes', text: 'Приду, брат. Спасибо!', run: (c) => { c.flag('job_gym'); c.trust('danya', 5); c.toast('info', 'Подработка «Помочь Дане в зале» — телефон → Барахолка → Подработки'); }, next: 'after' },
          { id: 'later', text: 'Попозже, сначала вещи на Барахолку выставлю', run: (c) => { c.flag('job_gym'); }, next: 'after' },
        ],
      },
      after: { msgs: [{ from: 'danya', text: 'Красава 💪 Голову держи выше. Всё будет.' }] },
    },
  },
  mama1: {
    chat: 'mama',
    nodes: {
      start: {
        msgs: [{ from: 'mama', fromName: 'Мама', text: 'Тёма, ты поел? Лера звонила мне зачем-то, я не взяла. У тебя всё хорошо?' }],
        choices: [
          { id: 'ok', text: 'Всё хорошо, мам. Поел 🙂', run: (c) => c.hero({ stress: -4 }) },
          { id: 'honest', text: 'Мы расстались. Но я справлюсь, правда.', run: (c) => c.hero({ stress: -8 }), next: 'honest' },
        ],
      },
      honest: { msgs: [{ from: 'mama', fromName: 'Мама', text: 'Сынок, ты у меня самый умный. Всё у тебя получится. Только в долги не влезай, ладно? ❤️' }] },
    },
  },
  danya_sanya: {
    chat: 'danya',
    nodes: {
      start: {
        msgs: [
          { from: 'danya', text: 'Слушай, есть кент — Саня Лимит. Он в P2P крутится, говорит, на этом реально поднимать, если голова варит.' },
          { from: 'danya', text: 'Скинул ему твой контакт, он напишет 🤝' },
        ],
        run: (c) => { c.showChat('sanya'); c.script('sanya1', 'start', 4); },
      },
    },
  },
  sanya1: {
    chat: 'sanya',
    nodes: {
      start: {
        msgs: [
          { from: 'sanya', text: 'Здорово! Даня сказал, хочешь в P2P. Суть простая: покупаешь USDT у одних людей дешевле, продаёшь другим дороже. Разница — твоя.' },
          { from: 'sanya', text: 'Всё руками: перевод с карты по СБП, PDF-чек, проверка выписки. Никаких кнопок «заработать».' },
          { from: 'sanya', text: 'Но с трёхой даже не суйся — у нормальных мерчантов минималка от 10к. Собери десятку, и я проведу тебя по первой сделке.' },
          { from: 'sanya', text: 'И главное правило на всю жизнь: ФИО в банке должно совпадать с ФИО на бирже. Всегда.' },
        ],
        choices: [
          { id: 'ok', text: 'Понял. Собираю десятку', run: (c) => c.trust('sanya', 3) },
          { id: 'why', text: 'А если ФИО не совпадает?', next: 'fio' },
        ],
      },
      fio: {
        msgs: [
          { from: 'sanya', text: 'Тогда это третье лицо. Отмена сделки или апелляция. Примешь такой перевод — можешь словить 161-ФЗ, и банк заморозит ВСЕ карты.' },
          { from: 'sanya', text: 'Я так три карты похоронил 😅 Поэтому и Лимит.' },
        ],
        run: (c) => { c.trust('sanya', 5); c.hero({ attention: 5 }); },
      },
    },
  },
  avito_tip: {
    chat: 'danya',
    nodes: {
      start: {
        msgs: [{ from: 'danya', text: 'Кстати, на Авито сейчас разводят: пишут «оформлю доставку, вот ссылка на получение денег». Не ведись! Только личная встреча 👊' }],
      },
    },
  },

  // ───────────── Глава 2 ─────────────
  sanya2: {
    chat: 'sanya',
    nodes: {
      start: {
        msgs: [
          { from: 'sanya', text: 'Десятка есть? Красава! 🔥 Погнали.' },
          { from: 'sanya', text: '1) На компе в браузере открываешь Bybit, регаешься и проходишь KYC.\n2) Привязываешь Google Authenticator — без кода из него монеты не отпустишь.\n3) P2P → «Купить» → объява со Сбером → открываешь сделку.' },
          { from: 'sanya', text: 'Дальше главное: жмёшь «Скопировать» у номера продавца → телефон → Сбер → Перевод по СБП → «Вставить из буфера» → выбираешь банк продавца → СВЕРЯЕШЬ ФИО → платишь → «Сохранить PDF-чек».' },
          { from: 'sanya', text: 'Потом обратно на комп: в ордере «Прикрепить чек» → «Я оплатил». Продавец проверит и отпустит USDT.' },
        ],
        choices: [{ id: 'ok', text: 'Понял, иду регаться', run: (c) => c.trust('sanya', 2) }],
      },
      kyc: {
        msgs: [{ from: 'sanya', text: 'Вижу, верифицировался 👍 Теперь Профиль → Безопасность → Google Authenticator. Ключ копируешь на компе и вставляешь в приложение «Authenticator» на телефоне. Потом вводишь 6 цифр.' }],
      },
      twofa: {
        msgs: [
          { from: 'sanya', text: 'Есть 2FA. Теперь покупай.' },
          { from: 'sanya', text: 'Бери у мерчанта с нормальной статой: 97%+ выполненных, сотни сделок, аккаунт не вчерашний. Новореги с 5 сделками — мимо.' },
          { from: 'sanya', text: 'И смотри, какой банк указан в объяве. Если у продавца Сбер — выбираешь «Сбербанк» при переводе. Не тот банк — получатель не найдётся.' },
        ],
      },
      bought: {
        msgs: [
          { from: 'sanya', text: 'Есть первые USDT 💵 Теперь не сливай их в стакан по рынку — там потеряешь на спреде.' },
          { from: 'sanya', text: 'Создай своё объявление на продажу («Мои объявления» → «Создать») чуть дороже — на 0,8–1% выше цены покупки. Купил по 91,00 — ставь ~91,85. И жди покупателя.' },
          { from: 'sanya', text: 'Когда придёт покупатель — НЕ верь чеку в чате и СМС. Открывай банк → «Обновить выписку» → смотри сумму и ФИО отправителя. Только потом код из Authenticator и «Отпустить».' },
        ],
      },
    },
  },

  // ───────────── Глава 3 ─────────────
  sanya3: {
    chat: 'sanya',
    nodes: {
      start: {
        msgs: [
          { from: 'sanya', text: 'Ну что, погнали в объёмы 🚀 Цель на старте — лям оборота.' },
          { from: 'sanya', text: 'Смотри: в Сбере бесплатно по СБП только 100к в месяц, дальше 1%. Открой Т-Банк и Альфу — прямо в телефоне, цифровая карта за минуту. Размажешь обороты.' },
          { from: 'sanya', text: 'И трать с карт на жизнь: продукты, кофе, ЖКХ. Банк должен видеть обычного человека, а не транзитную трубу. Это снижает риск 115-ФЗ.' },
          { from: 'sanya', text: 'Ещё: не гоняй деньги сразу. Пришло — подожди минут 20, прежде чем отправлять с той же карты. Или плати с другой.' },
        ],
        choices: [
          { id: 'ok', text: 'Понял. Открываю карты', run: (c) => c.trust('sanya', 2) },
          { id: 'why', text: 'А что будет, если не размазывать?', next: 'why' },
        ],
      },
      why: {
        msgs: [
          { from: 'sanya', text: 'Сначала «период охлаждения» на сутки. Потом запрос документов по 115-ФЗ — часть денег заморозят. А если риск зашкалит — отрубят онлайн-банк, и за остатком пойдёшь в отделение.' },
          { from: 'sanya', text: 'Индекс риска банк тебе не покажет, но в приложении видно «доверие банка». Следи за ним.' },
        ],
      },
      money: {
        msgs: [
          { from: 'sanya', text: 'Тём, у меня опять все карты в блоке 🤡 Лежит 1 650 USDT мёртвым грузом.' },
          { from: 'sanya', text: 'Покрути их у себя? Прибыль пополам, тело вернёшь, когда скажу.' },
        ],
        choices: [
          {
            id: 'yes',
            text: 'Давай, переводи на Bybit',
            run: (c) => {
              const usdt = 1650;
              const rub = round2(usdt * c.d.market.base);
              c.d.exchanges.bybit.usdt = round2(c.d.exchanges.bybit.usdt + usdt);
              bookAdd(c.d, usdt, rub);
              takeLoan(c, 'sanya', rub, 50);
              c.trust('sanya', 6);
              c.notify('system', 'Bybit', `Внутренний перевод: +${fmtUsdt(usdt)} от sanya_sbp_king`);
              c.flag('loan_sanya');
            },
            next: 'money_yes',
          },
          { id: 'no', text: 'Не, Сань, со своими спокойнее', run: (c) => { c.trust('sanya', -2); c.trust('marat', 3); } },
        ],
      },
      money_yes: { msgs: [{ from: 'sanya', text: 'Кинул на твой Bybit 👌 Это не твои деньги, помни. В таблице держи отдельно.' }] },
      rapira: {
        msgs: [
          { from: 'sanya', text: 'Кстати, есть арбитраж между биржами. На Rapira USDT на споте иногда дешевле, чем на P2P. Закидываешь рубли по СБП, покупаешь на споте, выводишь на Bybit и продаёшь.' },
          { from: 'sanya', text: 'Сеть TRC-20 — комиссия 1,5 USDT, TON — 0,15. При выводе на TON ВСЕГДА указывай MEMO с биржи, иначе монеты зависнут.' },
          { from: 'sanya', text: 'Поставь себе Tonkeeper на телефон — я уже открыл тебе доступ к арбитражной вкладке 😉' },
        ],
        run: (c) => { c.flag('rapiraUnlocked'); c.d.wallet.unlocked = true; c.toast('info', 'Открыты: вкладка Rapira в браузере и кошелёк Tonkeeper на телефоне'); },
      },
    },
  },
  danya3: {
    chat: 'danya',
    nodes: {
      start: {
        msgs: [
          { ...v('Брат, слушай. У меня сотка лежит, на тачку копил. Чё ей лежать? Возьми в оборот, отдашь потом с процентом. Я тебе верю как себе.', 11), from: 'danya' },
        ],
        choices: [
          {
            id: 'yes',
            text: 'Спасибо, брат. Беру, верну с процентом',
            run: (c) => {
              c.give('sber', 100000, 'Даниил Сергеевич Р.', 'На дело');
              takeLoan(c, 'danya', 100000, 20);
              c.trust('danya', 6);
              c.flag('loan_danya');
            },
            next: 'yes',
          },
          { id: 'no', text: 'Нет, Дань. Это твои деньги на машину — не хочу ими рисковать', run: (c) => { c.trust('danya', 3); c.trust('marat', 4); c.trust('pasha', 4); }, next: 'no' },
        ],
      },
      yes: { msgs: [{ from: 'danya', text: 'Кинул на Сбер 💸 Только не просри, ахах 😅' }] },
      no: { msgs: [{ from: 'danya', text: 'Уважаю, брат. Если что — предложение в силе 🤝' }] },
    },
  },
  max3: {
    chat: 'max',
    nodes: {
      start: {
        msgs: [{ from: 'max', text: 'Привет, конкурент 😉 Видел твою объяву в стакане. Не обижайся — бизнес. Я всегда буду на копейку дешевле.' }],
        choices: [
          { id: 'a', text: 'Посмотрим, кто дольше продержится', run: (c) => c.hero({ stress: 2 }) },
          { id: 'b', text: 'Как ты держишь такую цену?', next: 'how' },
        ],
      },
      how: {
        msgs: [{ from: 'max', text: 'Секрет фирмы 😏 Карты есть, люди есть. Ты же не думаешь, что я всё через свои карты гоняю? Хочешь — дам пару «надёжных» карт в аренду.' }],
        choices: [
          { id: 'no', text: 'Дропы? Нет, спасибо. Я работаю чисто', run: (c) => { c.trust('marat', 3); c.flag('refusedDrops'); } },
          { id: 'think', text: 'Подумаю', run: (c) => c.flag('consideredDrops') },
        ],
      },
    },
  },
  p2p_marat: {
    chat: 'p2p_chat',
    nodes: {
      start: {
        msgs: [
          { from: 'g1', fromName: 'Рома_крипта', text: 'Глядите, у меня оборот за месяц 3 ляма 😎 [скрин]' },
          { from: 'g2', fromName: 'Ника P2P', text: 'А прибыль сколько?' },
          { from: 'g1', fromName: 'Рома_крипта', text: 'Ну… посчитаю потом 😅' },
          { from: 'marat', fromName: 'Марат KMI', text: 'Кто здесь реально работает и считает экономику, а не просто графики и скрины оборота смотрит?' },
        ],
        choices: [
          {
            id: 'honest',
            text: 'Я. Оборот перевалил за миллион, но после комиссий банков и холдов прибыли почти нет. Честно — не понимаю, где теряю.',
            run: (c) => { c.trust('marat', 15); c.flag('maratHonest'); },
            next: 'honest',
          },
          { id: 'brag', text: 'Я! Миллион оборота, всё летит 🚀🚀🚀', run: (c) => { c.trust('marat', -5); c.flag('maratBrag'); }, next: 'brag' },
        ],
      },
      honest: {
        msgs: [{ from: 'marat', fromName: 'Марат KMI', text: 'Честный ответ — редкость. Напишу в личку.' }],
        run: (c) => { c.showChat('marat'); c.script('marat3', 'start', 3); },
      },
      brag: {
        msgs: [
          { from: 'marat', fromName: 'Марат KMI', text: 'Оборот — не прибыль.' },
          { from: 'g2', fromName: 'Ника P2P', text: 'Жёстко 😂' },
        ],
        run: (c) => { c.showChat('marat'); c.script('marat3', 'start', 10); },
      },
    },
  },
  marat3: {
    chat: 'marat',
    nodes: {
      start: {
        msgs: (d: GameState) => [
          { from: 'marat', text: d.flags.maratHonest ? 'Артём, добрый вечер. Видел твой ответ. Таких мало.' : 'Артём, добрый вечер. Резко ответил в чате, извини. Но если захочешь посчитать по-настоящему — поговорим.' },
          { from: 'marat', text: 'Приезжай в Москву в четверг. Кафе на Покровке, 19:00. Поговорим про цифры.' },
        ],
        choices: [{ id: 'go', text: 'Приеду. Беру билет на «Ласточку»', run: (c) => { c.pay(2400, 'РЖД: Брянск — Москва'); c.flag('ch3done'); } }],
      },
    },
  },

  // ───────────── Глава 4 ─────────────
  karim4: {
    chat: 'karim',
    nodes: {
      start: {
        msgs: [
          { from: 'karim', text: 'Привет, Артём. Я Карим, Марат скинул контакт. Открыл тебе таблицу «Финмодель Карима и Марата» — вкладка в браузере.' },
          { from: 'karim', kind: 'file', text: 'Финмодель_KMI.xlsx', file: { name: 'Финмодель_KMI.xlsx', kind: 'xlsx' } },
          { from: 'karim', text: 'Правило одно: смотри не на оборот, а на последнюю строку. Валовый оборот → минус СБП → минус мейкер → минус газ → минус резерв под налог = чистая прибыль.' },
        ],
        choices: [
          { id: 'ok', text: 'Спасибо, разберусь', run: (c) => c.trust('karim', 3) },
          { id: 'tax', text: 'А что такое резерв под налог?', next: 'tax' },
        ],
      },
      tax: {
        msgs: [{ from: 'karim', text: '13% с прибыли по 3-НДФЛ, пока ты физлицо. Не отложишь сейчас — придётся платить из оборотки потом. Это одна из главных причин кассовых разрывов.' }],
        run: (c) => c.trust('karim', 5),
      },
      otc: {
        msgs: [
          { from: 'karim', text: 'Марат просил дать тебе тестовую OTC-сделку. Клиент продаёт USDT со скидкой к рынку — купишь дешевле, продашь на P2P.' },
          { from: 'karim', text: 'Порядок: 1) Скопируй кошелёк клиента и проверь в Tonkeeper → «AML-скринер». 2) Проверь гаранта: наш — только @Garant_KMI_Official (галочка, аккаунт с 2019). 3) Плати строго по реквизитам из его закрепа.' },
        ],
        run: (c) => { postDeal(c, 'karim', { dirty: false, guarantorReal: true, liar: false, usdt: Math.max(600, Math.min(2500, Math.round((c.d.stats.turnover / 40) / 100) * 100)) }); },
      },
    },
  },

  // ───────────── Глава 5 ─────────────
  karim5: {
    chat: 'karim',
    nodes: {
      start: {
        msgs: [{ from: 'karim', text: 'Марат сказал, ты собираешь команду. Я в деле при одном условии: все сделки Капула и Ивана идут через мой аудит. Без исключений.' }],
        choices: [
          { id: 'yes', text: 'Договорились. Аудит обязателен', run: (c) => { c.team('karim'); c.trust('karim', 10); c.toast('success', 'Карим в команде: доступен аудит OTC-сделок'); } },
          { id: 'maybe', text: 'Посмотрим по ситуации', run: (c) => { c.trust('karim', -10); c.later(180, 'retry_recruit', { who: 'karim' }); }, next: 'maybe' },
        ],
      },
      maybe: { msgs: [{ from: 'karim', text: 'Тогда без меня. Если передумаешь — напиши.' }] },
      retry: {
        msgs: [{ from: 'karim', text: 'Ну что, надумал насчёт аудита?' }],
        choices: [{ id: 'yes', text: 'Да. Без аудита — ни одной сделки', run: (c) => { c.team('karim'); c.trust('karim', 5); } }],
      },
    },
  },
  pasha5: {
    chat: 'pasha',
    nodes: {
      start: {
        msgs: [
          { from: 'pasha', text: 'Привет. Даня сказал, тебе нужен человек.' },
          { from: 'pasha', text: 'Скажу сразу: в графиках не понимаю. Зато вижу, когда врут. Зачем я тебе?' },
        ],
        choices: [
          { id: 'trust', text: 'Мне нужен человек, которому я доверяю. Остальному научу', run: (c) => { c.team('pasha'); c.trust('pasha', 12); c.toast('success', 'Паша в команде: может проверить посредника по OTC'); }, next: 'yes' },
          { id: 'decor', text: 'Будешь стоять на встречах для солидности', run: (c) => { c.trust('pasha', -12); c.later(240, 'retry_recruit', { who: 'pasha' }); }, next: 'no' },
        ],
      },
      yes: { msgs: [{ from: 'pasha', text: 'Договорились. Слово.' }] },
      no: { msgs: [{ from: 'pasha', text: 'Я не мебель, Тём.' }] },
      retry: {
        msgs: [{ from: 'pasha', text: 'Даня сказал, ты погорячился тогда. Давай ещё раз: зачем я тебе?' }],
        choices: [{ id: 'trust', text: 'Ты честный. Без таких, как ты, нас сожрут', run: (c) => { c.team('pasha'); c.trust('pasha', 8); } }],
      },
    },
  },
  danya5: {
    chat: 'danya',
    nodes: {
      start: {
        msgs: [{ ...v('Тём! Слышал, команду собираешь. Я с тобой, брат, без вопросов! Только… может, ставочку замутим? У меня инфа по субботнему бою, сто процентов зайдёт!', 9), from: 'danya' }],
        choices: [
          { id: 'nobet', text: 'Ты в команде. Но без ставок', run: (c) => { c.team('danya'); c.trust('danya', 5); }, next: 'ok' },
          {
            id: 'bet',
            text: 'Давай! Ставим 20 000 на бой',
            run: (c) => {
              c.team('danya');
              c.trust('danya', 10);
              if (c.pay(20000, 'Фонбет: ставка')) c.later(600, 'danya_bet');
            },
            next: 'bet',
          },
        ],
      },
      ok: { msgs: [{ from: 'danya', text: 'Ладно-ладно, без ставок 😤 Но я в деле! 🥊' }] },
      bet: { msgs: [{ from: 'danya', text: 'ЕЕЕ 🔥🔥 Поставил! Суббота наша!' }] },
    },
  },
  ivan5: {
    chat: 'ivan',
    nodes: {
      start: {
        msgs: [
          { from: 'ivan', kind: 'video', scene: 'watch', duration: 18, text: 'Бро, это Иван. Ролекс, если что 😎 Слышал про тебя. Мне нужны свежие руки на VIP-объёмы. Миллионы, бро. Работаем?' },
        ],
        choices: [
          { id: 'rules', text: 'Работаем, но по правилам Карима', run: (c) => { c.team('ivan'); c.trust('ivan', 5); }, next: 'rules' },
          { id: 'his', text: 'Работаем по-твоему', run: (c) => { c.team('ivan'); c.trust('ivan', 15); c.trust('karim', -10); c.flag('ivanStyle'); }, next: 'his' },
        ],
      },
      rules: {
        msgs: [{ from: 'ivan', text: 'Скучные правила, но ок 😏 Скину тебе Капула — у него всегда темы.' }],
        run: (c) => { c.showChat('kapul'); c.script('kapul5', 'start', 4); },
      },
      his: {
        msgs: [
          { from: 'ivan', kind: 'video', scene: 'car', duration: 12, text: 'Вот это разговор! 🚘 Сегодня ужин в «Сирене», завтра — новые объёмы. Скину Капула.' },
        ],
        run: (c) => { c.showChat('kapul'); c.script('kapul5', 'start', 4); },
      },
    },
  },
  kapul5: {
    chat: 'kapul',
    nodes: {
      start: {
        msgs: [{ from: 'kapul', text: 'Капул на связи 🤝 Иван сказал, вы теперь команда. У меня всегда есть темы: OTC, обменники, экспортёры. Я свожу — вы зарабатываете.' }],
        choices: [
          { id: 'audit', text: 'Добро пожаловать. Каждая сделка — через аудит Карима', run: (c) => { c.team('kapul'); c.trust('kapul', 4); c.trust('karim', 4); } },
          { id: 'free', text: 'Скидывай всё, разберёмся', run: (c) => { c.team('kapul'); c.trust('kapul', 10); c.flag('kapulNoAudit'); } },
        ],
      },
      deal: {
        msgs: [{ from: 'kapul', text: 'Есть свежая тема 👇 Решай быстро, клиент ждать не будет.' }],
        run: (c) => { postDeal(c, 'kapul'); },
      },
    },
  },

  // ───────────── Глава 6 ─────────────
  grisha6: {
    chat: 'grisha',
    nodes: {
      start: {
        msgs: [
          { from: 'grisha', text: 'Добрый вечер, Артём. Марат описал ситуацию. Запрос по 115-ФЗ — это не приговор, а вопрос. На вопрос отвечают документами.' },
          { from: 'grisha', text: 'Мои услуги — 30 000 ₽ в месяц: учёт, ответы банкам, налоги, при необходимости — заявление в ЦБ по 161-ФЗ.' },
        ],
        choices: [
          { id: 'hire', text: 'Нанимаю. Что нужно делать?', run: (c) => hireGrisha(c), next: 'docs' },
          { id: 'no', text: 'Дорого. Попробую сам', run: (c) => { c.flag('noGrisha'); c.later(720, 'retry_recruit', { who: 'grisha' }); }, next: 'no' },
        ],
      },
      no: { msgs: [{ from: 'grisha', text: 'Понимаю. Совет бесплатно: сохраните все PDF-чеки и выгрузите историю ордеров с биржи. Без этого банк не убедить.' }] },
      retry: {
        msgs: [{ from: 'grisha', text: 'Артём, как продвигается ответ банку? Предложение в силе.' }],
        choices: [{ id: 'hire', text: 'Давайте работать', run: (c) => hireGrisha(c), next: 'docs' }],
      },
      docs: {
        msgs: [
          { from: 'grisha', text: 'Порядок такой:\n1) Bybit → Профиль → «Экспорт истории ордеров» — сохранится в папку «Чеки и Ордера».\n2) Проверьте, что в папке есть PDF-чеки по переводам.\n3) Моя справка об источниках дохода — уже в папке.' },
          { from: 'grisha', kind: 'file', text: 'Справка_об_источниках_дохода.pdf', file: { name: 'Справка_об_источниках_дохода.pdf', kind: 'pdf' } },
          { from: 'grisha', text: 'Затем в папке на компьютере выделите файлы и нажмите «Отправить в банк». Чем полнее пакет — тем выше шанс, что запрос закроют.' },
        ],
      },
    },
  },
  blame6: {
    chat: 'ivan',
    nodes: {
      start: {
        msgs: [{ from: 'ivan', text: 'Бро, это Карим со своими табличками нас спалил, отвечаю. Надо было новые карты брать и крутить дальше.' }],
        choices: [
          { id: 'calm', text: 'Хватит искать виноватых. Делаем по-взрослому', run: (c) => { c.trust('ivan', -3); c.trust('karim', 4); c.trust('pasha', 3); } },
          { id: 'agree', text: 'Может, ты и прав…', run: (c) => { c.trust('ivan', 5); c.trust('karim', -8); } },
        ],
      },
    },
  },

  // ───────────── Глава 7 ─────────────
  grisha7: {
    chat: 'grisha',
    nodes: {
      start: {
        msgs: [
          { from: 'grisha', text: 'Пора выходить из тени. Варианты:' },
          { from: 'grisha', text: '1) Самозанятость (НПД). Многие так делают, но к операциям с цифровой валютой и перепродаже НПД не применяется. Это ловушка — доначислят налог и штраф.' },
          { from: 'grisha', text: '2) ИП на УСН «Доходы минус расходы» 15%. Покупка USDT и комиссии уменьшают базу. Нам подходит это.' },
          { from: 'grisha', text: 'Регистрация — на Госуслугах (вкладка в браузере), срок 3 рабочих дня. Потом подадим декларацию и уплатим налог с прибыли.' },
        ],
        choices: [{ id: 'ok', text: 'Понял. Регистрирую ИП', run: (c) => c.trust('grisha', 4) }],
      },
      contract: {
        msgs: [
          { from: 'grisha', text: 'ИП зарегистрировано. Подготовил договоры партнёрства с командой — у каждого своя доля и ответственность.' },
          { from: 'grisha', kind: 'file', text: 'Договор_партнёрства.pdf', file: { name: 'Договор_партнёрства.pdf', kind: 'pdf' } },
        ],
        run: (c) => {
          addFile(c.d, { name: 'Договор_партнёрства.pdf', kind: 'contract', lines: ['ДОГОВОР ПРОСТОГО ТОВАРИЩЕСТВА № 1', 'ИП Воронов А. С. и партнёры', 'Доли распределяются пропорционально вкладу и ответственности.', 'Все сделки фиксируются в учёте. Операции через третьих лиц запрещены.'] });
          for (const id of ['karim', 'pasha', 'danya', 'ivan', 'kapul'] as CharacterId[]) if (c.d.characters[id].inTeam) c.trust(id, 6);
        },
      },
    },
  },
  max7: {
    chat: 'max',
    nodes: {
      poach: {
        msgs: [{ from: 'max', text: 'Слышал, у тебя в команде не всё гладко 😏 Я уже переманил одного твоего. Люди идут туда, где платят и не грузят правилами.' }],
      },
      collapse: {
        msgs: [
          { from: 'max', text: 'Тём… привет. Можно без подколов сегодня.' },
          { from: 'max', text: 'У меня всё легло. Дропов накрыли, 161-ФЗ, все карты в базе ЦБ. Биржа заморозила аккаунт. Можешь занять 300к? Верну, честно.' },
        ],
        choices: [
          { id: 'money', text: 'Перевести Максу 300 000 ₽', run: (c) => { if (c.pay(300000, 'Перевод: Максим Олегович Н.')) { c.flag('helpedMaxMoney'); c.trust('max', 40); c.trust('karim', -6); } else c.toast('warn', 'Не хватает свободных денег на картах'); }, next: 'thanks' },
          { id: 'advice', text: 'Денег не дам. Но вот контакт Гриши — выходи в белую', run: (c) => { c.flag('helpedMaxAdvice'); c.trust('max', 25); c.trust('marat', 6); c.trust('pasha', 4); }, next: 'thanks' },
          { id: 'no', text: 'Ты сам выбрал дропов. Нет', run: (c) => { c.trust('max', -10); } },
        ],
      },
      thanks: { msgs: [{ from: 'max', text: 'Спасибо, Тём. Правда. Я запомню.' }] },
    },
  },

  // ───────────── Глава 8 ─────────────
  marat8: {
    chat: 'marat',
    nodes: {
      start: {
        msgs: [
          { from: 'marat', text: 'Артём, нужно встретиться. Всей командой.' },
          { from: 'marat', text: 'Через два дня, в 19:00, у меня в офисе. Есть предложение — совместный проект. Подготовь цифры: чистый капитал, учёт, долги.' },
        ],
        choices: [{ id: 'ok', text: 'Будем. Подготовлю цифры', run: (c) => c.trust('marat', 3) }],
      },
    },
  },
};

function hireGrisha(c: Ctx) {
  const paid = c.pay(30000, 'Гриша Бухгалтер: услуги за месяц');
  c.d.tax.grishaHired = true;
  c.team('grisha');
  c.trust('grisha', 10);
  if (!paid) {
    c.flag('grishaDebt');
    c.toast('warn', 'Гриша согласился подождать оплату до разморозки');
  }
  c.d.flags.grishaPaidMonth = c.d.now;
  addFile(c.d, {
    name: 'Справка_об_источниках_дохода.pdf',
    kind: 'tax_doc',
    lines: [
      'СПРАВКА об источниках происхождения денежных средств',
      'Клиент: Воронов Артём Сергеевич',
      'Источник: операции купли-продажи цифровой валюты на P2P-платформе с документальным подтверждением.',
      'Приложения: выгрузка ордеров, PDF-чеки переводов, расчёт налоговой базы (3-НДФЛ).',
      'Составил: Г. А. Белов, бухгалтер.',
    ],
  });
  toast(c.d, 'success', 'Гриша Бухгалтер нанят. Справка добавлена в папку «Чеки и Ордера»');
}

registerScripts(S);
export default S;
