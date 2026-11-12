import { useState, type ReactNode } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  CircleCheck,
  CircleX,
  FileText,
  Gavel,
  Landmark,
  LoaderCircle,
  Lock,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import type { P2POrder } from '../../../game/types';
import { useGame } from '../../../game/store';
import { BANK_NAMES, clockStr, fmtPhone, fmtPrice, fmtRub, fmtUsdt, maskCard, plural, shortDT } from '../../../game/util';
import { Avatar, CopyBtn, cn, useResult } from '../../common/kit';
import { amountValue, BANK_COLORS, Countdown, isActiveStatus, sideLabel, signedRub2, StatusChip } from './OrderParts';
import { ConfirmDialog, ReceiptPicker, ReleaseDialog } from './OrderDialogs';
import OrderChat from './OrderChat';

type Reason = NonNullable<P2POrder['appeal']>['reason'];
type Result = { ok: boolean; error?: string; info?: string };
type ModalState = { kind: 'picker' } | { kind: 'paid' } | { kind: 'cancel' } | { kind: 'appeal'; reason: Reason } | { kind: 'release' };

const APPEAL_LABEL: Record<Reason, string> = {
  not_received: 'Деньги не поступили',
  third_party: 'Перевод от 3-го лица (Риск 161-ФЗ)',
  paid_not_released: 'Я оплатил, продавец не отпускает',
  other: 'Реквизиты принадлежат третьему лицу / нарушение правил',
};

/** Escrow room for a single P2P order. */
export default function OrderRoom({ orderId }: { orderId: string }) {
  const o = useGame((s) => s.orders.find((x) => x.id === orderId));
  const [modal, setModal] = useState<ModalState | null>(null);
  const res = useResult();

  if (!o) {
    return <div className="flex h-full items-center justify-center text-sm text-white/40">Ордер не найден</div>;
  }

  const close = () => setModal(null);
  const done = (okText: string) => (r: Result) => {
    setModal(null);
    res.show(r, okText);
  };
  const active = isActiveStatus(o.status);
  const g = useGame.getState;

  return (
    <div className="@container relative flex h-full min-h-0 flex-col bg-bybit">
      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-auto @2xl:flex-row @2xl:overflow-hidden">
        <section className="scroll-thin min-w-0 shrink-0 space-y-3 p-4 @2xl:flex-1 @2xl:shrink @2xl:overflow-auto">
          <RoomHeader o={o} />
          {res.node}
          <AmountBlock o={o} />
          {!active && <ClosedBlock o={o} />}
          {o.status === 'appeal' && <AppealNote o={o} />}
          {o.side === 'buy' ? <BuySide o={o} open={setModal} /> : <SellSide o={o} open={setModal} />}
        </section>
        <aside className="flex h-[460px] shrink-0 flex-col border-t border-white/[0.06] @2xl:h-auto @2xl:w-[290px] @2xl:border-t-0 @2xl:border-l">
          <OrderChat o={o} onAttach={o.side === 'buy' && active ? () => setModal({ kind: 'picker' }) : undefined} />
        </aside>
      </div>

      {modal?.kind === 'picker' && <ReceiptPicker order={o} onClose={close} onDone={done('Чек прикреплён к ордеру')} />}
      {modal?.kind === 'release' && <ReleaseDialog order={o} onClose={close} onDone={done('USDT отпущены')} />}
      {modal?.kind === 'paid' && (
        <ConfirmDialog
          title="Подтвердите оплату"
          confirmLabel="Да, я оплатил"
          tone="emerald"
          onConfirm={() => g().markPaid(o.id)}
          onClose={close}
          onDone={done('Продавец уведомлён об оплате')}
        >
          <p>
            Нажимайте, только если вы уже перевели <b className="num text-white">{fmtRub(o.rub, 2)}</b> на реквизиты продавца
            {o.req ? ` (${BANK_NAMES[o.req.bank]}, ${fmtPhone(o.req.phone)})` : ''}.
          </p>
          <p className="text-xs text-white/50">Ложная отметка об оплате — нарушение правил P2P и может привести к блокировке аккаунта.</p>
          {!o.receiptFileId && (
            <div className="flex gap-2 rounded-lg bg-amber/10 px-3 py-2 text-xs text-amber">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              Чек не прикреплён — продавец, скорее всего, попросит его в чате.
            </div>
          )}
        </ConfirmDialog>
      )}
      {modal?.kind === 'cancel' && (
        <ConfirmDialog title="Отменить сделку?" confirmLabel="Отменить сделку" tone="rose" onConfirm={() => g().cancelOrder(o.id)} onClose={close} onDone={done('Сделка отменена')}>
          <div className="flex gap-2 rounded-lg bg-rose/10 px-3 py-2.5 text-sm font-semibold text-rose">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            Если вы уже перевели деньги — не отменяйте!
          </div>
          <p className="text-xs text-white/55">
            После отмены USDT вернутся продавцу, а вернуть перевод можно будет только через него или апелляцию. Частые отмены снижают рейтинг и могут ограничить доступ к P2P.
          </p>
        </ConfirmDialog>
      )}
      {modal?.kind === 'appeal' && (
        <ConfirmDialog
          title="Открыть апелляцию?"
          confirmLabel="Открыть апелляцию"
          tone="rose"
          onConfirm={() => g().openAppeal(o.id, modal.reason)}
          onClose={close}
          onDone={done('Апелляция открыта')}
        >
          <p>
            Причина: <b className="text-white">{APPEAL_LABEL[modal.reason]}</b>
          </p>
          <p className="text-xs text-white/55">
            Поддержка изучит чат, чеки и выписки обеих сторон. До решения не отпускайте активы и не отменяйте ордер. Необоснованные апелляции снижают рейтинг.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ───────── blocks ─────────

function Card({ title, icon, right, children }: { title: string; icon: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-bybit-2">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/90">
          <span className="text-white/45">{icon}</span>
          {title}
        </div>
        {right}
      </div>
      <div className="space-y-2.5 px-4 py-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span className="text-xs text-white/45">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-right text-[13px] text-white">{children}</span>
    </div>
  );
}

function RoomHeader({ o }: { o: P2POrder }) {
  const buy = o.side === 'buy';
  const active = isActiveStatus(o.status);
  return (
    <div className="rounded-xl bg-bybit-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn('text-[17px] font-semibold', buy ? 'text-emerald' : 'text-rose')}>{sideLabel(o)}</h2>
            <StatusChip status={o.status} />
            {o.viaMyAd && <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[11px] leading-none text-amber">через ваше объявление</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
            <span className="flex items-center">
              Ордер №&nbsp;<span className="num text-white/75">{o.num}</span>
              <CopyBtn value={o.num} label={`Ордер № ${o.num}`} title="Скопировать номер ордера" className="ml-0.5">
                <></>
              </CopyBtn>
            </span>
            <span>
              Создан <span className="num">{shortDT(o.createdAt)}</span>
            </span>
            <span>
              Контрагент: <span className="text-white/75">{o.cp.nick}</span>
            </span>
          </div>
        </div>
        {o.status === 'pending_payment' && (
          <div className="text-right">
            <div className="text-[11px] text-white/45">{buy ? 'Оплатите в течение' : 'Покупатель оплачивает'}</div>
            <Countdown deadline={o.deadline} className="text-[26px] leading-tight font-semibold" okClass="text-amber" />
          </div>
        )}
      </div>
      {active && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald/[0.08] px-3 py-2 text-xs leading-snug text-emerald/90">
          <Lock size={13} className="mt-0.5 shrink-0" />
          {buy
            ? `Средства в эскроу: ${fmtUsdt(o.usdt)} продавца заблокированы Bybit и поступят вам после подтверждения оплаты.`
            : `Средства в эскроу: ваши ${fmtUsdt(o.usdt + o.feeUsdt)} заблокированы Bybit, пока вы их не отпустите.`}
        </div>
      )}
    </div>
  );
}

function AmountBlock({ o }: { o: P2POrder }) {
  const fee = o.feeUsdt > 0;
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06]', fee ? '@lg:grid-cols-4' : '@lg:grid-cols-3')}>
      <div className="col-span-2 bg-bybit-2 px-4 py-3 @lg:col-span-1">
        <div className="text-[11px] text-white/45">Сумма</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <span className="num text-xl font-semibold text-white">{fmtRub(o.rub, 2)}</span>
          <CopyBtn kind="amount" value={amountValue(o.rub)} label="Сумма ордера" />
        </div>
      </div>
      <div className="bg-bybit-2 px-4 py-3">
        <div className="text-[11px] text-white/45">Цена</div>
        <div className="num mt-1 text-[15px] text-white">{fmtPrice(o.price)} ₽</div>
      </div>
      <div className="bg-bybit-2 px-4 py-3">
        <div className="text-[11px] text-white/45">Количество</div>
        <div className="num mt-1 text-[15px] text-white">{fmtUsdt(o.usdt)}</div>
      </div>
      {fee && (
        <div className="col-span-2 bg-bybit-2 px-4 py-3 @lg:col-span-1">
          <div className="text-[11px] text-white/45">Комиссия мейкера</div>
          <div className="num mt-1 text-[15px] text-white/80">{fmtUsdt(o.feeUsdt)}</div>
        </div>
      )}
    </div>
  );
}

function ClosedBlock({ o }: { o: P2POrder }) {
  const ok = o.status === 'completed';
  return (
    <div className={cn('rounded-xl border p-4', ok ? 'border-emerald/25 bg-emerald/[0.07]' : 'border-white/10 bg-white/[0.03]')}>
      <div className={cn('flex items-center gap-2 text-[15px] font-semibold', ok ? 'text-emerald' : 'text-white/70')}>
        {ok ? <CircleCheck size={18} /> : <CircleX size={18} />}
        {ok ? 'Сделка завершена' : 'Сделка отменена'}
      </div>
      {o.outcome && <p className="mt-1.5 text-sm leading-relaxed text-white/75">{o.outcome}</p>}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-white/45">
        {o.closedAt !== undefined && (
          <span>
            Закрыт <span className="num">{shortDT(o.closedAt)}</span>
          </span>
        )}
        {o.pnlRub !== undefined && (
          <span>
            Результат сделки: <span className={cn('num text-sm font-semibold', o.pnlRub >= 0 ? 'text-emerald' : 'text-rose')}>{signedRub2(o.pnlRub)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function AppealNote({ o }: { o: P2POrder }) {
  const r = o.appeal?.reason;
  const reason = !r ? '' : o.side === 'sell' && r === 'other' ? 'покупатель сообщает, что оплатил, а вы не отпускаете USDT' : APPEAL_LABEL[r].toLowerCase();
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose/[0.08] p-3.5">
      <Gavel size={17} className="mt-0.5 shrink-0 text-rose" />
      <div>
        <div className="text-sm font-semibold text-rose">Апелляция открыта — ожидайте решения поддержки</div>
        <div className="mt-0.5 text-xs leading-relaxed text-white/55">
          {reason && <>Причина: {reason}. </>}
          Специалист изучит чат, чеки и выписку; решение придёт в чат ордера.
          {o.appeal && <> Открыта в {clockStr(o.appeal.openedAt)}.</>}
        </div>
      </div>
    </div>
  );
}

function Step({ n, done, children }: { n: number; done: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          done ? 'bg-emerald text-white' : 'border border-white/20 text-white/60',
        )}
      >
        {done ? '✓' : n}
      </span>
      <span className={cn('text-[13px] leading-snug', done ? 'text-white/45' : 'text-white/85')}>{children}</span>
    </li>
  );
}

// ───────── buy side ─────────

function BuySide({ o, open }: { o: P2POrder; open: (m: ModalState) => void }) {
  const file = useGame((s) => (o.receiptFileId ? s.files.find((f) => f.id === o.receiptFileId) : undefined));
  const [appealMenu, setAppealMenu] = useState(false);
  const req = o.req;
  const active = isActiveStatus(o.status);
  const pending = o.status === 'pending_payment';
  const appealReason: Reason | null = pending ? 'other' : o.status === 'paid' ? 'paid_not_released' : null;

  return (
    <>
      {req && (
        <Card title="Реквизиты для оплаты" icon={<Landmark size={14} />} right={<span className="text-[11px] text-white/40">Перевод по СБП</span>}>
          <Field label="Банк получателя">
            <span className="h-3 w-[3px] rounded-full" style={{ background: BANK_COLORS[req.bank] }} />
            {BANK_NAMES[req.bank]}
            <span className="rounded bg-white/10 px-1 py-px text-[10px] font-semibold text-white/70">СБП</span>
          </Field>
          <Field label="Получатель">
            <span className="font-semibold">{req.holder}</span>
          </Field>
          <Field label="Телефон">
            <span className="num text-[15px] font-semibold tracking-wide">{fmtPhone(req.phone)}</span>
            {active && (
              <CopyBtn kind="phone" value={req.phone} label={fmtPhone(req.phone)} meta={{ name: req.holder, bank: req.bank, orderId: o.id }}>
                Скопировать номер
              </CopyBtn>
            )}
          </Field>
          <Field label="Сумма к переводу">
            <span className="num font-semibold">{fmtRub(o.rub, 2)}</span>
            {active && <CopyBtn kind="amount" value={amountValue(o.rub)} label="Сумма ордера" />}
          </Field>
          <div className="rounded-md bg-white/[0.03] px-2.5 py-2 text-[11px] leading-snug text-white/45">
            Переводите только со своей карты и ровно ту сумму, что в ордере. Не пишите в комментарии «USDT», «Bybit», «крипта» — банк может заблокировать перевод.
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/[0.06] px-4 py-2.5 text-xs text-white/55">
        <ShieldCheck size={14} className="text-white/40" />
        Продавец на бирже (KYC): <span className="font-semibold text-white/90">{o.cp.fullName}</span>
        <span className="text-white/30">·</span>
        <span className="num">
          {o.cp.orders} {plural(o.cp.orders, 'сделка', 'сделки', 'сделок')} · {o.cp.completion}% · {o.cp.regDays} дн.
        </span>
      </div>

      {active && (
        <ol className="space-y-2.5 rounded-xl bg-bybit-2 p-4">
          <Step n={1} done={!pending}>
            Переведите <b className="num">{fmtRub(o.rub, 2)}</b> через приложение банка на телефоне: «Перевод по СБП» → номер получателя → банк {req ? BANK_NAMES[req.bank] : ''} → сверьте получателя.
          </Step>
          <Step n={2} done={!!o.receiptFileId}>
            Сохраните PDF-чек в банке и прикрепите его к ордеру.
          </Step>
          <Step n={3} done={!pending}>
            Нажмите «Я оплатил — уведомить продавца».
          </Step>
        </ol>
      )}

      {file && (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-bybit-2 px-3 py-2.5">
          <FileText size={20} className="shrink-0 text-rose" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-white/90">{file.name}</div>
            <div className="num truncate text-[11px] text-white/40">
              Чек прикреплён{file.receipt ? ` · ${fmtRub(file.receipt.amount, 2)} · ${file.receipt.recipient}` : ''}
            </div>
          </div>
          <CircleCheck size={16} className="shrink-0 text-emerald" />
        </div>
      )}

      {o.status === 'paid' && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 px-4 py-2.5 text-[13px] text-sky-200">
          <LoaderCircle size={15} className="shrink-0 animate-spin" />
          Вы отметили оплату. Продавец проверяет поступление и отпустит USDT.
        </div>
      )}

      {active && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => open({ kind: 'picker' })}
              className="flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-[13px] font-medium text-white/85 hover:border-white/30 hover:bg-white/[0.04]"
            >
              <Paperclip size={15} />
              {o.receiptFileId ? 'Заменить чек' : 'Прикрепить PDF-чек из папки'}
            </button>
            {pending && (
              <button type="button" onClick={() => open({ kind: 'paid' })} className="h-10 flex-1 rounded-lg bg-emerald px-4 text-[13px] font-semibold text-white hover:brightness-110">
                Я оплатил — уведомить продавца
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pending && (
              <button type="button" onClick={() => open({ kind: 'cancel' })} className="h-8 rounded-lg px-3 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">
                Отменить сделку
              </button>
            )}
            {appealReason && (
              <button
                type="button"
                onClick={() => setAppealMenu(!appealMenu)}
                className={cn('flex h-8 items-center gap-1 rounded-lg px-3 text-xs hover:bg-white/[0.06]', appealMenu ? 'text-rose' : 'text-white/55 hover:text-white')}
              >
                <Gavel size={13} /> Апелляция <ChevronDown size={13} className={cn('transition', appealMenu && 'rotate-180')} />
              </button>
            )}
          </div>
          {appealMenu && appealReason && (
            <button
              type="button"
              onClick={() => {
                setAppealMenu(false);
                open({ kind: 'appeal', reason: appealReason });
              }}
              className="block w-full rounded-lg border border-rose/30 bg-rose/[0.06] px-3 py-2 text-left text-xs text-rose hover:bg-rose/[0.12]"
            >
              {APPEAL_LABEL[appealReason]}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ───────── sell side ─────────

function SellSide({ o, open }: { o: P2POrder; open: (m: ModalState) => void }) {
  const card = useGame((s) => (o.playerBank ? s.banks[o.playerBank].card : ''));
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  const setView = useGame((s) => s.setBybitView);
  const active = isActiveStatus(o.status);
  const bankName = o.playerBank ? BANK_NAMES[o.playerBank] : 'банк';
  const cp = o.cp;

  return (
    <>
      <Card title="Покупатель" icon={<UserRound size={14} />}>
        <div className="flex items-center gap-3">
          <Avatar name={cp.nick} color={cp.color} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[13px] font-semibold text-white">
              <span className="truncate">{cp.nick}</span>
              {cp.verified && <BadgeCheck size={14} className="shrink-0 text-amber" />}
            </div>
            <div className="num text-[11px] text-white/45">
              {cp.orders} {plural(cp.orders, 'сделка', 'сделки', 'сделок')} · выполнено {cp.completion}% · на платформе {cp.regDays} дн.
            </div>
          </div>
        </div>
        <Field label="ФИО (KYC)">
          <span className="font-semibold">{cp.fullName}</span>
        </Field>
      </Card>

      <Card title="Получение оплаты" icon={<Landmark size={14} />}>
        <Field label="Оплата поступит на">
          {o.playerBank && <span className="h-3 w-[3px] rounded-full" style={{ background: BANK_COLORS[o.playerBank] }} />}
          {bankName}
          {card && <span className="num text-white/45">{maskCard(card)}</span>}
        </Field>
        <Field label="Ожидаемая сумма">
          <span className="num font-semibold">{fmtRub(o.rub, 2)}</span>
        </Field>
        {active &&
          (o.cpMarkedPaid ? (
            <div className="flex items-center gap-2 rounded-md bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              <CircleCheck size={14} className="shrink-0" />
              Покупатель отметил ордер как оплаченный{o.paidAt !== undefined ? ` в ${clockStr(o.paidAt)}` : ''}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-xs text-white/60">
              <LoaderCircle size={14} className="shrink-0 animate-spin" />
              Покупатель переводит оплату…
            </div>
          ))}
      </Card>

      {active && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-3.5 text-[13px] leading-relaxed text-amber">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <TriangleAlert size={16} /> Не доверяйте чеку и SMS
          </div>
          Откройте {bankName} на телефоне → «Обновить выписку» → сверьте сумму <b className="num">{fmtRub(o.rub, 2)}</b> и ФИО отправителя с «<b>{cp.fullName}</b>».
          <div className="mt-1 text-xs text-amber/70">Отпущенные USDT вернуть нельзя. Нет денег на счёте или платил кто-то другой — апелляция, а не отпуск.</div>
        </div>
      )}

      {active && !twoFA && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-rose/10 px-4 py-2.5 text-xs text-rose">
          <span className="flex items-center gap-2">
            <ShieldAlert size={14} /> Привяжите Google Authenticator в Профиле — без него нельзя отпустить USDT.
          </span>
          <button type="button" onClick={() => setView('profile')} className="shrink-0 font-semibold hover:underline">
            Профиль
          </button>
        </div>
      )}

      {active && (
        <div className="space-y-2">
          <button type="button" onClick={() => open({ kind: 'release' })} className="h-11 w-full rounded-lg bg-amber text-sm font-semibold text-black hover:brightness-110">
            Отпустить USDT
          </button>
          {o.status !== 'appeal' && (
            <div className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
              <button
                type="button"
                onClick={() => open({ kind: 'appeal', reason: 'not_received' })}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose/30 px-3 text-xs text-rose hover:bg-rose/[0.08]"
              >
                <Gavel size={13} /> Апелляция: Деньги не поступили
              </button>
              <button
                type="button"
                onClick={() => open({ kind: 'appeal', reason: 'third_party' })}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose/30 px-3 text-xs text-rose hover:bg-rose/[0.08]"
              >
                <Gavel size={13} /> Апелляция: Перевод от 3-го лица (Риск 161-ФЗ)
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
