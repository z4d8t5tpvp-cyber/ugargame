import type { CharacterId, GameState } from '../types';
import type { Ctx } from './ctx';
import { fmtRub, round2 } from '../util';
import { incoming } from '../engine/banks';
import { ledger, netWorth, profitSince } from '../engine/core';

export type SceneBg = 'rain_street' | 'room_night' | 'chat' | 'train' | 'moscow_cafe' | 'office_day' | 'office_night' | 'boardroom' | 'end_good' | 'end_wolf' | 'end_crisis' | 'end_new';

export type Speaker = CharacterId | 'narrator' | 'thought';

export interface CutChoice {
  text: string;
  hint?: string;
  if?: (d: GameState) => boolean;
  run?: (c: Ctx) => void;
}

export interface CutLine {
  who: Speaker;
  text: string | ((d: GameState) => string);
  emotion?: 'calm' | 'angry' | 'sad' | 'happy' | 'smirk' | 'serious' | 'worried';
  bg?: SceneBg;
  choices?: CutChoice[];
}

export interface Cutscene {
  id: string;
  title?: string;
  place?: string;
  bg: SceneBg;
  lines: CutLine[];
  onEnd?: (c: Ctx) => void;
}

const ch2Profit = (d: GameState) => round2(profitSince(d, d.chapterStartedAt));

function numberWords(n: number) {
  const a = Math.abs(Math.round(n));
  if (a === 74) return 'Семьдесят четыре рубля';
  return fmtRub(a);
}

export const CUTSCENES: Record<string, Cutscene> = {
  intro: {
    id: 'intro',
    title: 'Глава 1. Новозаровск',
    place: 'Новозаровск, Брянская область · 14 сентября, 19:40',
    bg: 'rain_street',
    lines: [
      { who: 'narrator', text: 'Новозаровск. Девятый час вечера, сентябрь, дождь. У пятиэтажки мигает фарами чёрный внедорожник.' },
      { who: 'narrator', text: 'Лера стоит под козырьком подъезда и не смотрит в глаза.' },
      { who: 'lera', emotion: 'sad', text: '«Тём, не надо усложнять. Нам по двадцать лет, а мы застряли в этом Новозаровске. Ты хороший парень, но я больше не вижу с тобой будущего».' },
      { who: 'artem', emotion: 'angry', text: '«Это из-за него? Из-за машины?»' },
      { who: 'lera', emotion: 'serious', text: '«Это из-за того, что у тебя нет плана. Никакого».' },
      { who: 'narrator', text: 'Хлопает дверь внедорожника. Красные огни уходят за поворот, в лужах дрожит отражение фонаря.' },
      { who: 'thought', bg: 'room_night', text: 'В кармане вибрирует старый телефон. Остаток на карте Сбера: 3 700,00 ₽. В комнате гудит старый системник. С этой суммы даже в нормальный ордер не зайти — нужно собрать хотя бы 10 000 рублей.' },
      { who: 'thought', text: 'Саня с района рассказывал про P2P: покупаешь USDT дешевле, продаёшь дороже. Всё руками — через банк, чеки, проверку выписки. Главное — внимательность. И план.' },
      {
        who: 'thought',
        text: 'С чего начать?',
        choices: [
          { text: 'Собрать волю в кулак, открыть Барахолку на телефоне и выставить старые вещи', hint: 'Внимательность +10', run: (c) => { c.hero({ attention: 10 }); c.flag('ch1_avito'); } },
          { text: 'Позвонить Дане ММА и пойти в спортзал — спросить про подработку', hint: 'Доверие Дани +10, стресс −15, подработка +1 500 ₽', run: (c) => { c.trust('danya', 10); c.hero({ stress: -15 }); c.flag('job_gym'); c.flag('ch1_gym'); } },
        ],
      },
    ],
    onEnd: (c) => {
      c.script('danya1', 'start', c.has('ch1_gym') ? 2 : 25);
      c.script('mama1', 'start', 50);
    },
  },

  first_trade: {
    id: 'first_trade',
    title: 'Боевое крещение',
    place: 'Telegram · личные сообщения',
    bg: 'chat',
    lines: [
      { who: 'sanya', emotion: 'happy', text: '«Ну чё, с боевым крещением! Видел твой ордер в стакане. Сколько чистыми вышло после комиссии?»' },
      {
        who: 'artem',
        emotion: 'happy',
        text: (d) => {
          const p = ch2Profit(d);
          if (p > 0) return `«${numberWords(p)}, Саня. Но эти ${fmtRub(p)} я только что заработал своей головой, сидя в комнате в Новозаровске».`;
          return `«Минус ${fmtRub(Math.abs(p))}, Саня. Зато теперь я понимаю, где теряются деньги».`;
        },
      },
      { who: 'sanya', emotion: 'smirk', text: '«Красава. Запомни это чувство. А теперь главное: не путай оборот и прибыль. Оборот — это сколько денег прошло через руки. Прибыль — сколько осталось у тебя».' },
      { who: 'sanya', text: '«И лимиты СБП не забывай: сто тысяч в месяц бесплатно, дальше банк берёт процент. Скоро тебе станет тесно в одном Сбере».' },
      { who: 'thought', text: 'Семьдесят четыре рубля — это смешно. Но это первые деньги, которые я заработал не руками, а головой. Следующая цель — миллион оборота.' },
    ],
  },

  marat_cafe: {
    id: 'marat_cafe',
    title: 'Глава 4. Знакомство с Маратом KMI',
    place: 'Москва, кафе на Покровке · вечер',
    bg: 'moscow_cafe',
    lines: [
      { who: 'narrator', bg: 'train', text: 'Четыре часа на «Ласточке». За окном — Брянская область, потом Калужская, потом бесконечные огни Подмосковья.' },
      { who: 'narrator', bg: 'moscow_cafe', text: 'Небольшое тихое кафе. Марат пьёт чёрный чай без сахара. Ни часов за полмиллиона, ни цепи — простой серый свитер и старый ноутбук.' },
      { who: 'marat', emotion: 'calm', text: '«Сколько ты заработал за последний месяц?»' },
      { who: 'artem', text: '«Около ста тысяч.»' },
      { who: 'marat', emotion: 'serious', text: '«Чистыми?»' },
      { who: 'artem', emotion: 'worried', text: '«Ну… примерно. Там ещё комиссии, пару переводов зависло.»' },
      { who: 'marat', text: '«Значит, цифру ты знаешь, а прибыль — нет.»' },
      { who: 'artem', text: '«Я только начинаю.»' },
      { who: 'marat', emotion: 'calm', text: '«Это нормально. Ненормально — считать чужие деньги своими.»' },
      { who: 'artem', text: '«И что тогда делать?»' },
      { who: 'marat', emotion: 'serious', text: '«Сначала научись считать. Потом научись не терять. И только потом думай, как вырасти.»' },
      { who: 'marat', text: (d) => `«Вот таблица. Её собрал Карим — мой аналитик. Оборот, комиссии СБП, комиссия мейкера, газ сети, резерв под налог. Внизу — чистая прибыль. Твоя сейчас: ${fmtRub(profitSince(d, 0) * 0.87)}. Только эта цифра — твоя.»` },
      {
        who: 'marat',
        text: (d) => (d.obligations.some((o) => !o.returned) ? '«И ещё. Деньги друзей в обороте — это не твой капитал. Это твой долг. Что будешь с ним делать?»' : '«Ты работаешь на своих деньгах. Это правильно. Медленнее, но честнее.»'),
        choices: [
          { text: 'Сначала верну долги друзьям. Потом буду расти', if: (d) => d.obligations.some((o) => !o.returned), run: (c) => { c.trust('marat', 10); c.flag('repayPlan'); } },
          { text: 'Пусть работают — верну позже с процентами', if: (d) => d.obligations.some((o) => !o.returned), run: (c) => { c.trust('marat', -5); c.flag('keepDebts'); } },
          { text: 'Я готов учиться считать', if: (d) => !d.obligations.some((o) => !o.returned), run: (c) => c.trust('marat', 10) },
        ],
      },
      { who: 'marat', emotion: 'calm', text: '«Карим откроет тебе таблицу. Московская ликвидность тоже теперь твоя — крупные мерчанты, большие лимиты. Но правила те же: ФИО, чеки, никаких третьих лиц.»' },
    ],
    onEnd: (c) => {
      c.flag('sheetUnlocked');
      c.d.wallet.amlUnlocked = true;
      c.d.wallet.unlocked = true;
      c.flag('rapiraUnlocked');
      c.showChat('karim');
      c.script('karim4', 'start', 3);
    },
  },

  team_clash: {
    id: 'team_clash',
    title: 'Пул Капула',
    place: 'Москва · рабочий созвон команды',
    bg: 'office_day',
    lines: [
      { who: 'kapul', emotion: 'happy', text: '«Пацаны, срочно! Пул на 40 000 USDT, спред 3,2%. Клиенты — «экспортёры», им надо сегодня. Окно — два часа.»' },
      { who: 'ivan', emotion: 'smirk', text: '«Тёма, это лям за вечер. Заходим всей суммой, плечо у моих людей возьмём. Кто не рискует — тот на Ладе ездит.»' },
      { who: 'karim', emotion: 'serious', text: '«Я прогнал кошельки через AML. Тридцать процентов контрагентов светятся: Garantex, миксеры, украденные средства. Это не спред, это плата за риск.»' },
      { who: 'pasha', emotion: 'serious', text: '«Посредник на созвоне врал. Сначала сказал, что клиенты из Казани, потом — из Екатеринбурга. Глаза бегают.»' },
      { who: 'danya', emotion: 'happy', text: '«Да ладно вам, прорвёмся! Брат, решай!»' },
      {
        who: 'thought',
        text: 'Все смотрят на меня.',
        choices: [
          {
            text: 'Карим, делаем строгий аудит. Берём только чистых контрагентов',
            hint: 'Безопасная прибыль, доверие Карима и Паши +20',
            run: (c) => {
              c.trust('karim', 20);
              c.trust('pasha', 20);
              c.trust('ivan', -10);
              c.trust('kapul', -5);
              c.flag('poolAudit');
              c.flag('poolDecided');
              const profit = 48000;
              const bank = c.d.banks.tbank.opened ? 'tbank' : 'sber';
              incoming(c.d, bank, profit, { title: 'ООО «ЭкспортЛайн»', comment: 'Расчёт по договору', kind: 'sbp_in' });
              ledger(c.d, { kind: 'otc', rub: profit, turnover: 1500000, usdt: 0, note: 'OTC-пул Капула: чистая часть после аудита' });
            },
          },
          {
            text: 'Иван прав. Заходим на всю сумму',
            hint: 'Большая прибыль сейчас. Последствия — позже',
            run: (c) => {
              c.trust('ivan', 15);
              c.trust('danya', 5);
              c.trust('karim', -20);
              c.trust('pasha', -10);
              c.flag('poolRush');
              c.flag('poolDecided');
              const profit = 165000;
              const bank = c.d.banks.alfa.opened ? 'alfa' : 'sber';
              incoming(c.d, bank, profit, { title: 'Рустам Ахмедович Г.', comment: 'за товар', kind: 'sbp_in', p2p: true });
              ledger(c.d, { kind: 'otc', rub: profit, turnover: 3600000, usdt: 0, note: 'OTC-пул Капула: вся сумма, без аудита' });
              c.d.banks[bank].risk = Math.min(100, c.d.banks[bank].risk + 25);
            },
          },
        ],
      },
    ],
  },

  night_crisis: {
    id: 'night_crisis',
    title: 'Глава 6. Большие обороты',
    place: 'Офис · 02:14 ночи',
    bg: 'office_night',
    lines: [
      { who: 'narrator', text: (d) => `Два часа ночи. На экране — уведомление банка: «Запрос документов по 115-ФЗ». ${d.flags.poolRush ? 'Заморожена почти вся оборотка.' : 'Часть оборотки заморожена.'}` },
      { who: 'ivan', emotion: 'angry', text: '«Это Карим со своими таблицами всех спалил! Надо было по-тихому, через левые карты…»' },
      { who: 'karim', emotion: 'angry', text: '«Через дропов? Ты серьёзно? Нас заморозили, потому что мы гоняли деньги транзитом, ночью и без единого чека.»' },
      { who: 'danya', emotion: 'worried', text: '«Хорош орать! Тёма, скажи им!»' },
      { who: 'pasha', emotion: 'serious', text: '«Ругаться будем потом. Сейчас надо отвечать банку.»' },
      { who: 'narrator', text: 'Телефон вибрирует. Одно сообщение от Марата: «Позвони Грише. Он бухгалтер. Он скучный. Это хорошо».' },
      {
        who: 'thought',
        text: 'Что дальше?',
        choices: [
          { text: 'Стабильность: отвечаем банку по правилам, нанимаем Гришу, убираем транзит', hint: 'Марат, Карим, Паша одобрят', run: (c) => { c.flag('ch6Stable'); c.trust('karim', 10); c.trust('pasha', 5); c.trust('marat', 10); } },
          {
            text: 'Агрессивный рост: открываем новые карты и крутим дальше — банк подождёт',
            hint: 'Иван одобрит. Риск по всем банкам вырастет',
            run: (c) => {
              c.flag('ch6Aggressive');
              c.trust('ivan', 10);
              c.trust('karim', -15);
              c.trust('marat', -10);
              for (const b of Object.values(c.d.banks)) if (b.opened) b.risk = Math.min(100, b.risk + 15);
            },
          },
        ],
      },
    ],
    onEnd: (c) => {
      c.showChat('grisha');
      c.script('grisha6', 'start', 3);
      c.script('blame6', 'start', 20);
    },
  },

  max_collapse: {
    id: 'max_collapse',
    title: 'Падение Макса Ноля',
    place: 'Telegram · поздний вечер',
    bg: 'chat',
    lines: [
      { who: 'narrator', text: 'В стакане Bybit пусто там, где всегда висело объявление max_zero_arb на копейку дешевле всех.' },
      { who: 'narrator', text: 'В чате P2P пишут: «Сеть дропов Макса накрыли. 161-ФЗ, база ЦБ, все карты. Биржа заморозила аккаунт».' },
      { who: 'thought', text: 'Он начинал так же, как я. Только выбрал короткую дорогу.' },
    ],
    onEnd: (c) => c.script('max7', 'collapse', 2),
  },

  final_board: {
    id: 'final_board',
    title: 'Глава 8. Цена успеха',
    place: 'Москва, офис Марата · 19:00',
    bg: 'boardroom',
    lines: [
      { who: 'narrator', text: (d) => `За столом — команда. На экране — финмодель. Чистый капитал: ${fmtRub(netWorth(d))}.` },
      { who: 'marat', emotion: 'calm', text: '«Я предлагаю совместный проект: OTC-деск для малого бизнеса. Белый — с договорами, отчётностью и проверкой каждого контрагента. Мне нужен партнёр, который умеет считать и не теряет голову.»' },
      { who: 'ivan', emotion: 'smirk', text: '«Марат, при всём уважении — это медленно. Берём плечо пять лямов под пять процентов в месяц и за квартал делаем икс три.»' },
      { who: 'karim', emotion: 'serious', text: '«Пять миллионов плеча при нашей марже — это кассовый разрыв при первом же запросе банка. Я против.»' },
      { who: 'danya', emotion: 'happy', text: '«А может, просто рванём? Жизнь одна, брат!»' },
      { who: 'pasha', emotion: 'serious', text: '«Мы начинали вместе. Решай так, чтобы через год мы ещё были командой.»' },
      {
        who: 'marat',
        emotion: 'calm',
        text: '«Решать тебе, Артём.»',
        choices: [
          { text: 'Строим белый OTC-деск с Маратом. Медленно, но надёжно', run: (c) => { c.flag('finalWhite'); c.trust('marat', 10); c.trust('karim', 8); c.trust('pasha', 8); } },
          { text: 'Берём плечо, как предлагает Иван. Сейчас или никогда', run: (c) => { c.flag('ivanLeverage'); c.trust('ivan', 15); c.trust('karim', -20); c.trust('marat', -15); } },
          { text: 'Ухожу в одиночку. Команда меня тормозит', run: (c) => { c.flag('finalSolo'); for (const id of ['karim', 'pasha', 'danya', 'ivan', 'kapul'] as CharacterId[]) c.trust(id, -25); } },
        ],
      },
    ],
  },

  end_architect: {
    id: 'end_architect',
    title: 'Концовка: «Устойчивый бизнес: Архитектор Системы»',
    bg: 'end_good',
    lines: [
      { who: 'narrator', text: 'Через год OTC-деск Марата и Артёма обслуживает сорок компаний. Все сделки — с договорами, все переводы — с чеками.' },
      { who: 'narrator', text: 'Карим ведёт модель рисков. Паша проверяет каждого нового клиента. Гриша закрывает квартал без единого запроса от банка.' },
      { who: 'marat', emotion: 'calm', text: '«Помнишь, я спросил, сколько ты заработал? Теперь ты знаешь ответ до копейки.»' },
      { who: 'thought', text: 'Лера как-то лайкнула фото из офиса. Я даже не сразу заметил. Мне больше не нужно никому ничего доказывать.' },
    ],
  },
  end_wolf: {
    id: 'end_wolf',
    title: 'Концовка: «Одинокий волк: Империя без друзей»',
    bg: 'end_wolf',
    lines: [
      { who: 'narrator', text: 'Цифры на счетах растут. Офис в Сити, своя команда операторов — наёмных, сменных, безымянных.' },
      { who: 'narrator', text: 'Даня перестал звонить. Паша написал один раз: «Удачи, Тём». Карим работает у конкурентов.' },
      { who: 'thought', text: 'Я научился считать деньги. Но где-то по дороге разучился считать людей.' },
    ],
  },
  end_crisis: {
    id: 'end_crisis',
    title: 'Концовка: «Финансовый кризис: Цена иллюзий»',
    bg: 'end_crisis',
    lines: [
      { who: 'narrator', text: 'Плечо сработало ровно два месяца. Потом банк заморозил счета по 115-ФЗ, а проценты по займу продолжали капать каждый день.' },
      { who: 'ivan', emotion: 'worried', text: '«Бро, это просто временная просадка… Часы можно продать…»' },
      { who: 'narrator', text: 'Кассовый разрыв съел капитал за три недели. Лизинговая компания забрала машину. Оборот был огромным. Прибыли не было никогда.' },
      { who: 'thought', text: 'Марат говорил: сначала научись не терять. Я пропустил этот шаг.' },
    ],
  },
  end_newstart: {
    id: 'end_newstart',
    title: 'Концовка: «Новый старт: Урок усвоен»',
    bg: 'end_new',
    lines: [
      { who: 'narrator', text: 'Капитал потерян — блокировки, мошенники, заморозки. На карте снова почти как в тот дождливый вечер.' },
      { who: 'pasha', emotion: 'calm', text: '«Деньги — дело наживное. Главное, что ты не стал таким, как Макс.»' },
      { who: 'marat', emotion: 'calm', text: '«У тебя теперь есть то, чего нет у тех, кто начинает с нуля: опыт. Начнём сначала — но уже правильно.»' },
      { who: 'thought', text: 'С нуля. Но уже не с пустыми руками.' },
    ],
  },
};
