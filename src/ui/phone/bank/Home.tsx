import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Bell,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Gavel,
  History,
  Hourglass,
  Lock,
  RefreshCw,
  ScrollText,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Sparkles,
} from 'lucide-react';
import { useGame } from '../../../game/store';
import { freeLimit, frozenOf, shownBalance } from '../../../game/engine/banks';
import { BANKS } from '../../../game/data/static';
import { clockStr, dateLong, dateStr, durStr, fmtRub, shortDT } from '../../../game/util';
import { cn, useNow } from '../../common/kit';
import { TxRow } from './History';
import { BankLogo, Btn, CardFace, Meter, money, signed, useBank, useRefresh, type Route } from './ui';

function StatusBadge() {
  const { bank, t } = useBank();
  const status = useGame((s) => s.banks[bank].status);
  const blocked = useGame((s) => !!s.block161);
  const [label, tone] = blocked
    ? ['БЛОК 161-ФЗ', 'red']
    : status === 'restricted115'
      ? ['Ограничение 115-ФЗ', 'red']
      : status === 'request115'
        ? ['Запрос 115-ФЗ', 'orange']
        : status === 'cooling'
          ? ['Охлаждение 24ч', 'yellow']
          : ['Активен', 'green'];
  const cls = {
    red: t.dark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700',
    orange: t.dark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700',
    yellow: t.dark ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-800',
    green: t.dark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold', cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function Left({ until, prefix = 'Осталось' }: { until: number; prefix?: string }) {
  const now = useNow();
  return (
    <span className="num">
      {prefix} {durStr(Math.max(0, until - now))}
    </span>
  );
}

function Banners() {
  const { bank, t, notify } = useBank();
  const status = useGame((s) => s.banks[bank].status);
  const statusUntil = useGame((s) => s.banks[bank].statusUntil);
  const reason = useGame((s) => s.banks[bank].statusReason);
  const request = useGame((s) => s.banks[bank].request);

  if (status === 'cooling')
    return (
      <div className={cn('rounded-[18px] p-3.5', t.dark ? 'bg-amber-400/15 text-amber-100' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200')}>
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <Snowflake size={17} />
          Период охлаждения до {clockStr(statusUntil ?? 0)} {dateStr(statusUntil ?? 0)}
        </div>
        {reason && <div className="mt-1 text-[12.5px] leading-snug opacity-85">{reason}</div>}
        {statusUntil !== null && (
          <div className="mt-1.5 text-[12px] font-medium opacity-80">
            <Left until={statusUntil} /> · переводы и платежи приостановлены
          </div>
        )}
      </div>
    );

  if (status === 'request115' && request) {
    const review = request.status === 'review';
    return (
      <div className={cn('rounded-[18px] p-3.5', t.dark ? 'bg-orange-500/15 text-orange-50' : 'bg-orange-50 text-orange-950 ring-1 ring-orange-200')}>
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <ShieldAlert size={17} className={t.dark ? 'text-orange-300' : 'text-orange-600'} />
          Запрос документов по 115-ФЗ
        </div>
        <div className="mt-1 text-[12.5px] leading-snug opacity-85">{request.reason}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div className={cn('rounded-xl px-2.5 py-2', t.dark ? 'bg-black/30' : 'bg-white')}>
            <div className="opacity-60">Срок ответа</div>
            <div className="font-semibold">
              <Left until={request.deadline} prefix="" />
            </div>
          </div>
          <div className={cn('rounded-xl px-2.5 py-2', t.dark ? 'bg-black/30' : 'bg-white')}>
            <div className="opacity-60">Заморожено</div>
            <div className="font-semibold num">{fmtRub(request.frozen, 2)}</div>
          </div>
        </div>
        {request.ops.length > 0 && (
          <div className="mt-2.5">
            <div className="mb-1 text-[11.5px] font-semibold opacity-70">Банк просит пояснить операции:</div>
            <div className={cn('divide-y rounded-xl px-2.5', t.dark ? 'divide-white/10 bg-black/30' : 'divide-orange-100 bg-white')}>
              {request.ops.map((op, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-[12px]">
                  <span className="shrink-0 opacity-60 num">{shortDT(op.at)}</span>
                  <span className="min-w-0 flex-1 truncate">{op.title}</span>
                  <span className="shrink-0 font-semibold num">{signed(op.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {review ? (
          <div className={cn('mt-2.5 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] font-medium', t.dark ? 'bg-black/30' : 'bg-white')}>
            <Hourglass size={15} />
            <span>
              Документы на рассмотрении ({request.docs.length} шт.)
              {request.reviewAt ? ` · решение до ${clockStr(request.reviewAt)}` : ''}
            </span>
          </div>
        ) : (
          <div className="mt-2.5 text-[12px] leading-snug">
            {request.docs.length > 0 && <div className="mb-1 font-semibold">Банк запросил дополнительные документы.</div>}
            <span className="opacity-85">
              Отправьте документы с компьютера: папка «Чеки и Ордера» → выделите чеки, выгрузку ордеров и справку → «Отправить в банк»
            </span>
          </div>
        )}
      </div>
    );
  }

  if (status === 'restricted115')
    return (
      <div className={cn('rounded-[18px] p-3.5', t.dark ? 'bg-rose-500/15 text-rose-50' : 'bg-rose-50 text-rose-950 ring-1 ring-rose-200')}>
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <Lock size={17} className={t.dark ? 'text-rose-300' : 'text-rose-600'} />
          Ограничение ДБО по п. 11 ст. 7 115-ФЗ
        </div>
        <div className="mt-1 text-[12.5px] leading-snug opacity-85">
          {reason ?? 'Дистанционное обслуживание ограничено. Переводы и оплата картой недоступны.'}
        </div>
        <Btn
          variant="danger"
          className="mt-3 h-11 text-[13.5px]"
          onClick={() => notify(useGame.getState().closeRestricted(bank))}
        >
          Закрыть счёт и получить остаток в отделении
        </Btn>
      </div>
    );

  return null;
}

const ACTIONS: { route: Route; label: string; icon: typeof Send }[] = [
  { route: 'sbp', label: 'Перевести по СБП', icon: Send },
  { route: 'card', label: 'По номеру карты', icon: CreditCard },
  { route: 'self', label: 'Между своими счетами', icon: ArrowLeftRight },
  { route: 'retail', label: 'Платежи и покупки', icon: ShoppingBag },
  { route: 'history', label: 'История', icon: History },
  { route: 'requisites', label: 'Реквизиты', icon: FileText },
];

function TrustAndLimit() {
  const { bank, t } = useBank();
  const b = useGame((s) => s.banks[bank]);
  const lim = freeLimit(b);
  const used = b.sbpOutMonth;
  const left = Math.max(0, lim - used);
  const trustColor = b.trust >= 70 ? '#22C55E' : b.trust >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className={cn('rounded-[18px] p-4', t.surface)}>
      <div className="flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck size={15} className={t.accent} />
          Индекс доверия банка
        </span>
        <span className="font-semibold num" style={{ color: trustColor }}>
          {Math.round(b.trust)}%
        </span>
      </div>
      <Meter value={b.trust / 100} color={trustColor} dark={t.dark} />
      <div className={cn('mt-1 text-[11px]', t.faint)}>Растёт от спокойных операций и бытовых трат, падает от транзита</div>

      <div className="mt-3.5 flex items-center justify-between text-[13px]">
        <span className="font-semibold">Переводы по СБП</span>
        <span className={cn('text-[12px] num', t.muted)}>
          {fmtRub(used)} / {fmtRub(lim)}
        </span>
      </div>
      <Meter value={used / lim} color={used >= lim ? '#F59E0B' : t.hex} dark={t.dark} />
      <div className={cn('mt-1 text-[11.5px] leading-snug', used >= lim ? (t.dark ? 'text-amber-300' : 'text-amber-700') : t.muted)}>
        {used >= lim ? 'Сверх лимита — комиссия 1%' : `Бесплатно по СБП осталось ${fmtRub(left)} из ${fmtRub(lim)} в этом месяце`}
      </div>
    </div>
  );
}

function Premium() {
  const { bank, t, notify } = useBank();
  const tier = useGame((s) => s.banks[bank].tier);
  const until = useGame((s) => s.banks[bank].premiumUntil);
  const def = BANKS[bank];
  if (tier === 'premium')
    return (
      <div className={cn('flex items-center gap-3 rounded-[18px] p-3.5', t.surface)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg,#F7D774,#C99A2E)' }}>
          <Crown size={19} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">{def.premiumName} подключена</div>
          <div className={cn('text-[12px]', t.muted)}>
            Лимит СБП {fmtRub(def.premiumLimit)}/мес{until !== null ? ` · до ${dateStr(until)}` : ''}
          </div>
        </div>
        <Check size={18} className={t.accent} />
      </div>
    );
  return (
    <div
      className={cn('relative overflow-hidden rounded-[18px] p-4', t.dark ? 'text-white' : 'text-[#1F1F22]')}
      style={{ background: t.dark ? 'linear-gradient(135deg,#2C2C2E,#1C1C1E)' : 'linear-gradient(135deg,#FFF7E0,#FFE9B8)' }}
    >
      <Sparkles size={64} className="pointer-events-none absolute -top-2 -right-2 opacity-10" />
      <div className="flex items-center gap-2 text-[14px] font-semibold">
        <Crown size={17} className="text-amber-500" />
        {def.premiumName} за {def.premiumPrice} ₽/мес — лимит СБП {fmtRub(def.premiumLimit)}
      </div>
      <div className={cn('mt-1 text-[12px] leading-snug', t.dark ? 'text-white/60' : 'text-black/60')}>
        Бесплатные переводы по СБП до {fmtRub(def.premiumLimit)} в месяц вместо {fmtRub(def.basicLimit)}. Банк спокойнее относится к клиентам с подпиской.
      </div>
      <Btn className="mt-3 h-10 text-[13.5px]" onClick={() => notify(useGame.getState().buyPremium(bank), `${def.premiumName} подключена`)}>
        Подключить
      </Btn>
    </div>
  );
}

export function HomeScreen() {
  const { bank, t, go, openTx } = useBank();
  const b = useGame((s) => s.banks[bank]);
  const { busy, fresh, msg, run } = useRefresh(bank);
  const recent = useMemo(() => b.txs.filter((x) => x.seen).slice(0, 4), [b.txs]);
  const frozen = frozenOf(b);

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-8">
      <div style={{ background: t.hero }} className="px-4 pt-2.5 pb-1">
        <div className={cn('flex items-center gap-2.5 pb-3', t.heroText)}>
          <BankLogo bank={bank} size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] leading-tight font-bold">{BANKS[bank].app}</div>
            <div className={cn('text-[11.5px] leading-tight', t.heroMuted)}>Артём Воронов</div>
          </div>
          <button
            onClick={() => go('history')}
            className={cn('flex h-9 w-9 items-center justify-center rounded-full', t.id === 'sber' ? 'bg-white/15' : t.dark ? 'bg-white/10' : 'bg-black/5')}
            title="Операции"
          >
            <Bell size={18} />
          </button>
        </div>
        <CardFace t={t} card={b.card}>
          <div className="relative mt-5">
            <div className="text-[11.5px] font-medium opacity-75">Баланс карты</div>
            <div className="text-[28px] leading-tight font-bold tracking-tight num">{fmtRub(shownBalance(b), 2)}</div>
            {frozen > 0 && (
              <div className="mt-0.5 flex items-center gap-1 text-[11.5px] font-medium opacity-90">
                <Snowflake size={12} /> Заморожено {fmtRub(frozen, 2)}
              </div>
            )}
          </div>
        </CardFace>
      </div>

      <div className="space-y-3 px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <StatusBadge />
            <div className={cn('mt-1 flex items-center gap-1 text-[11.5px]', msg ? cn('font-semibold', t.accent) : t.muted)}>
              <Clock size={12} />
              {msg ?? `Обновлено в ${clockStr(b.lastRefresh)}`}
            </div>
          </div>
          <button onClick={run} disabled={busy} className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold', t.ghost)}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Обновляем…' : 'Обновить'}
          </button>
        </div>

        <Banners />

        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map((a) => (
            <button key={a.route} onClick={() => go(a.route)} className={cn('flex flex-col items-center gap-1.5 rounded-[18px] px-1 py-3 text-center transition', t.surface, t.press)}>
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', t.accentBg)}>
                <a.icon size={19} />
              </span>
              <span className="text-[11px] leading-tight font-medium">{a.label}</span>
            </button>
          ))}
        </div>

        <div className={cn('rounded-[18px] p-1.5', t.surface)}>
          <button onClick={() => go('history')} className="flex w-full items-center justify-between px-2 pt-1.5 pb-1 text-left">
            <span className="text-[15px] font-semibold">Последние операции</span>
            <span className={cn('flex items-center text-[12.5px] font-medium', t.accent)}>
              Все <ChevronRight size={15} />
            </span>
          </button>
          {recent.length === 0 ? (
            <div className={cn('px-2 pt-1 pb-3 text-[12.5px]', t.muted)}>Пока пусто. Новые поступления появятся после обновления выписки.</div>
          ) : (
            recent.map((tx) => <TxRow key={tx.id} tx={tx} fresh={fresh.has(tx.id)} onClick={() => openTx(tx.id)} />)
          )}
        </div>

        <TrustAndLimit />
        <Premium />
      </div>
    </div>
  );
}

// ───────── onboarding ─────────

const PERKS = [
  'Бесплатные переводы по СБП до 100 000 ₽/мес',
  'Кэшбэк до 5% в категориях и 1% на всё',
  'Обслуживание 0 ₽ навсегда',
  'Цифровая карта сразу в приложении — без визита в офис',
];

export function Onboarding() {
  const { bank, t } = useBank();
  const card = useGame((s) => s.banks[bank].card);
  const [issuing, setIssuing] = useState(false);
  const issue = () => {
    setIssuing(true);
    setTimeout(() => useGame.getState().openBank(bank), 1300);
  };
  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-5 pt-5 pb-6">
      <div className="flex items-center gap-2.5">
        <BankLogo bank={bank} size={34} />
        <span className="text-[17px] font-bold">{BANKS[bank].app}</span>
      </div>
      <motion.div initial={{ rotate: -6, y: 16, opacity: 0 }} animate={{ rotate: -3, y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 16 }} className="mx-2 mt-6">
        <CardFace t={t} card={card}>
          <div className="h-12" />
        </CardFace>
      </motion.div>
      <div className="mt-6 text-[24px] leading-tight font-bold">Оформите цифровую карту</div>
      <div className={cn('mt-1 text-[15px] font-semibold', t.accent)}>{t.product}</div>
      <div className="mt-4 space-y-2.5">
        {PERKS.map((p) => (
          <div key={p} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
            <span className={cn('mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full', t.accentBg)}>
              <Check size={13} strokeWidth={3} />
            </span>
            {p}
          </div>
        ))}
      </div>
      <div className="min-h-6 flex-1" />
      <Btn className="mt-6" onClick={issue} busy={issuing}>
        {issuing ? 'Выпускаем карту…' : 'Оформить за 1 минуту'}
      </Btn>
      <div className={cn('mt-2 text-center text-[11px] leading-snug', t.faint)}>Нажимая кнопку, вы соглашаетесь с условиями обслуживания. Паспорт подтверждён через Госуслуги.</div>
    </div>
  );
}

// ───────── 161-FZ block ─────────

export function Block161Screen() {
  const { bank, go, notify } = useBank();
  const block = useGame((s) => s.block161);
  const fee = useGame((s) => s.flags.lawyerFeeDue);
  const balance = useGame((s) => shownBalance(s.banks[bank]));
  if (!block) return null;
  return (
    <div className="no-scrollbar h-full overflow-y-auto text-white" style={{ background: 'linear-gradient(180deg,#C8231B 0%,#8E130E 60%,#5E0B08 100%)' }}>
      <div className="px-5 pt-8 pb-8">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/5">
          <Lock size={38} />
        </motion.div>
        <div className="mt-5 text-center text-[11.5px] font-bold tracking-[0.18em] text-white/70">БАЗА ЦБ РФ</div>
        <div className="mt-1 text-center text-[22px] leading-tight font-extrabold">БЛОКИРОВКА 161-ФЗ</div>
        <div className="mt-1 text-center text-[12.5px] text-white/70">с {dateLong(block.since)}, {clockStr(block.since)}</div>

        <div className="mt-5 rounded-2xl bg-black/20 p-3.5">
          <div className="text-[11.5px] font-semibold text-white/60">Причина</div>
          <div className="mt-0.5 text-[13.5px] leading-snug">{block.reason}</div>
        </div>
        <div className="mt-2.5 rounded-2xl bg-black/20 p-3.5 text-[12.5px] leading-snug text-white/85">
          Сведения о вас внесены в базу данных Банка России о случаях и попытках осуществления переводов без согласия клиента. <b className="text-white">Все карты во всех банках заморожены</b>: переводы, оплата и снятие наличных недоступны, пока ЦБ не исключит ваши данные из базы.
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-black/20 px-3.5 py-3 text-[13px]">
          <span className="text-white/70">Остаток на карте</span>
          <span className="flex items-center gap-1.5 font-semibold num">
            <Snowflake size={14} /> {money(balance)}
          </span>
        </div>

        <div className="mt-5 space-y-2.5">
          {!block.appealFiled ? (
            <>
              <Btn variant="light" onClick={() => useGame.getState().appeal161()}>
                <Gavel size={18} />
                Подать заявление в ЦБ (через Госуслуги)
              </Btn>
              <div className="text-center text-[11.5px] leading-snug text-white/60">Заявление рассматривается до 15 рабочих дней. Без юриста шансы и сроки хуже.</div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5 rounded-2xl bg-white/10 p-3.5 text-[13px] leading-snug">
                <Hourglass size={18} className="mt-px shrink-0" />
                <div>
                  <div className="font-semibold">Заявление на рассмотрении до {block.resolveAt !== null ? dateLong(block.resolveAt) : '—'}</div>
                  {block.resolveAt !== null && (
                    <div className="mt-0.5 text-white/70">
                      <Left until={block.resolveAt} />
                    </div>
                  )}
                  {fee ? <div className="mt-0.5 text-white/70">Услуги юриста: {fmtRub(Number(fee))} — спишутся после решения</div> : null}
                </div>
              </div>
              <Btn variant="light" onClick={() => notify(useGame.getState().wait161(), 'Решение получено: блокировка 161-ФЗ снята')}>
                <Clock size={18} />
                Ждать решения (пропустить время)
              </Btn>
            </>
          )}
          <button onClick={() => go('history')} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white/10 text-[14.5px] font-semibold active:bg-white/15">
            <ScrollText size={18} />
            Открыть выписку
          </button>
        </div>
      </div>
    </div>
  );
}

