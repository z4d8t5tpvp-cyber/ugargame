import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  CircleCheck,
  CreditCard,
  Crown,
  FileCheck,
  FileDown,
  HandCoins,
  Landmark,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShoppingBag,
  Undo2,
} from 'lucide-react';
import type { BankTx, BankTxKind } from '../../../game/types';
import { useGame } from '../../../game/store';
import { cn, useResult } from '../../common/kit';
import { clockStr, dateStr, dayIndex, fmtPhone, fmtRub } from '../../../game/util';
import { Body, Btn, Empty, Header, KV, ResultSlot, Sheet, money, signed, useBank, useRefresh } from './ui';

const KIND_ICON: Record<BankTxKind, typeof ArrowDownLeft> = {
  sbp_in: ArrowDownLeft,
  sbp_out: ArrowUpRight,
  card_out: CreditCard,
  me2me_in: ArrowLeftRight,
  me2me_out: ArrowLeftRight,
  retail: ShoppingBag,
  salary: Briefcase,
  refund_out: Undo2,
  refund_in: Undo2,
  subscription: Crown,
  fraud: ShieldAlert,
  exchange_in: Landmark,
  exchange_out: Landmark,
  loan_in: HandCoins,
  loan_out: HandCoins,
};

export const KIND_LABEL: Record<BankTxKind, string> = {
  sbp_in: 'Входящий перевод по СБП',
  sbp_out: 'Перевод по СБП',
  card_out: 'Перевод по номеру карты',
  me2me_in: 'Перевод между своими счетами',
  me2me_out: 'Перевод между своими счетами',
  retail: 'Покупка',
  salary: 'Зачисление',
  refund_out: 'Возврат платежа',
  refund_in: 'Возврат средств',
  subscription: 'Подписка',
  fraud: 'Списание',
  exchange_in: 'Зачисление от организации',
  exchange_out: 'Платёж организации',
  loan_in: 'Заём',
  loan_out: 'Погашение займа',
};

const iconTone = (tx: BankTx, dark: boolean) => {
  if (tx.kind === 'fraud') return dark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600';
  if (tx.kind === 'retail' || tx.kind === 'subscription') return dark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600';
  if (tx.amount > 0) return dark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
  return dark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600';
};

const opNumber = (id: string) => id.replace(/^tx_/, '').slice(-10).toUpperCase();

export function TxRow({ tx, fresh, onClick }: { tx: BankTx; fresh?: boolean; onClick: () => void }) {
  const { t } = useBank();
  const Icon = KIND_ICON[tx.kind] ?? ArrowUpRight;
  return (
    <button type="button" onClick={onClick} className={cn('relative flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left', t.press)}>
      {fresh && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ background: t.fresh }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 3.2, ease: 'easeIn' }}
        />
      )}
      <span className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconTone(tx, t.dark))}>
        <Icon size={18} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-medium">{tx.title}</span>
          {fresh && <span className="shrink-0 rounded-full bg-[#FF3B30] px-1.5 text-[9.5px] leading-4 font-bold text-white">НОВАЯ</span>}
        </span>
        <span className={cn('block truncate text-[11.5px]', t.muted)}>
          {tx.refunded ? 'Платёж возвращён' : tx.comment || (tx.counterpartyBank ? `${KIND_LABEL[tx.kind]} · ${tx.counterpartyBank}` : KIND_LABEL[tx.kind])}
        </span>
      </span>
      <span className="relative shrink-0 text-right">
        <span className={cn('block text-[14px] font-semibold num', tx.amount > 0 && t.pos, tx.refunded && 'line-through opacity-50')}>{signed(tx.amount)}</span>
        <span className={cn('block text-[11px] num', t.faint)}>{clockStr(tx.at)}</span>
      </span>
    </button>
  );
}

const dayLabel = (at: number, now: number) => {
  const diff = dayIndex(now) - dayIndex(at);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return dateStr(at);
};

type Filter = 'all' | 'in' | 'out';

export function HistoryScreen() {
  const { bank, t, openTx } = useBank();
  const txs = useGame((s) => s.banks[bank].txs);
  const lastRefresh = useGame((s) => s.banks[bank].lastRefresh);
  const inMonth = useGame((s) => s.banks[bank].inMonth);
  const outMonth = useGame((s) => s.banks[bank].outMonth);
  // Day labels only need to change when the day does.
  const today = useGame((s) => dayIndex(s.now));
  const { busy, fresh, msg, run } = useRefresh(bank);
  const [filter, setFilter] = useState<Filter>('all');

  const groups = useMemo(() => {
    const list = txs.filter((x) => x.seen && (filter === 'all' || (filter === 'in' ? x.amount > 0 : x.amount < 0)));
    const out: { label: string; items: BankTx[] }[] = [];
    for (const tx of list) {
      const label = dayLabel(tx.at, today * 1440);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(tx);
      else out.push({ label, items: [tx] });
    }
    return out;
  }, [txs, filter, today]);

  return (
    <div className="flex h-full flex-col">
      <Header title="История операций" subtitle={`Обновлено в ${clockStr(lastRefresh)}`} />
      <Body>
        <Btn onClick={run} busy={busy}>
          {!busy && <RefreshCw size={18} />}
          {busy ? 'Загружаем выписку…' : 'Обновить выписку'}
        </Btn>
        <div className={cn('mt-2 h-5 text-center text-[12.5px] font-medium', msg ? t.accent : t.faint)}>{msg ?? 'Новые поступления видны только после обновления'}</div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className={cn('rounded-2xl px-3 py-2.5', t.surface)}>
            <div className={cn('text-[11px]', t.muted)}>Поступления за месяц</div>
            <div className={cn('text-[15px] font-semibold num', t.pos)}>+{fmtRub(inMonth)}</div>
          </div>
          <div className={cn('rounded-2xl px-3 py-2.5', t.surface)}>
            <div className={cn('text-[11px]', t.muted)}>Списания за месяц</div>
            <div className="text-[15px] font-semibold num">−{fmtRub(outMonth)}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              ['all', 'Все'],
              ['in', 'Поступления'],
              ['out', 'Списания'],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={cn('rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ring-1', filter === id ? t.chipOn : t.chipOff)}>
              {label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <Empty icon={<ScrollText size={24} />} title="Операций пока нет" text="Нажмите «Обновить выписку», чтобы загрузить новые поступления" />
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mt-4">
              <div className={cn('mb-1 px-2 text-[12px] font-semibold tracking-wide uppercase', t.muted)}>{g.label}</div>
              <div className={cn('rounded-[18px] p-1', t.surface)}>
                {g.items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} fresh={fresh.has(tx.id)} onClick={() => openTx(tx.id)} />
                ))}
              </div>
            </div>
          ))
        )}
      </Body>
    </div>
  );
}

/** Detail sheet of a single operation (rendered at the app root). */
export function TxSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useBank();
  return (
    <Sheet open={!!id} onClose={onClose} panelClass={t.sheet}>
      {id && <TxDetails id={id} />}
    </Sheet>
  );
}

function TxDetails({ id }: { id: string }) {
  const { bank, t } = useBank();
  const tx = useGame((s) => s.banks[bank].txs.find((x) => x.id === id));
  const fileName = useGame((s) => (tx?.receiptFileId ? s.files.find((f) => f.id === tx.receiptFileId)?.name : undefined));
  const res = useResult();
  const [confirmRefund, setConfirmRefund] = useState(false);
  if (!tx) return <div className={cn('py-8 text-center text-[13px]', t.muted)}>Операция не найдена</div>;
  const Icon = KIND_ICON[tx.kind] ?? ArrowUpRight;
  const incoming = tx.amount > 0;

  const save = () => {
    const fid = useGame.getState().saveReceipt(bank, tx.id);
    if (!fid) res.show({ ok: false, error: 'Не удалось сформировать чек' });
  };
  const refund = () => {
    const r = useGame.getState().refund(bank, tx.id);
    setConfirmRefund(false);
    res.show(r, 'Платёж возвращён отправителю');
  };

  return (
    <div>
      <div className="flex flex-col items-center pt-1 pb-3 text-center">
        <span className={cn('mb-2 flex h-14 w-14 items-center justify-center rounded-full', iconTone(tx, t.dark))}>
          <Icon size={26} />
        </span>
        <div className={cn('text-[12px]', t.muted)}>{KIND_LABEL[tx.kind]}</div>
        <div className={cn('mt-0.5 text-[28px] leading-tight font-bold num', incoming && t.pos, tx.refunded && 'line-through opacity-50')}>{signed(tx.amount)}</div>
        <div className="mt-0.5 text-[14px] font-medium">{tx.title}</div>
        {tx.refunded && <div className={cn('mt-2 rounded-full px-3 py-1 text-[12px] font-semibold', t.dark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600')}>Платёж возвращён</div>}
      </div>

      <div className={cn('divide-y rounded-2xl px-3.5', t.divide, t.dark ? 'bg-white/[0.04]' : 'bg-black/[0.03]')}>
        <KV k={incoming ? 'Отправитель' : 'Получатель'} v={tx.title} strong />
        {tx.counterpartyBank && <KV k={incoming ? 'Банк отправителя' : 'Банк получателя'} v={tx.counterpartyBank} />}
        {tx.phone && <KV k="Телефон" v={fmtPhone(tx.phone)} mono />}
        <KV k="Сообщение" v={tx.comment || '—'} />
        <KV k="Дата и время" v={`${dateStr(tx.at)}, ${clockStr(tx.at)}`} />
        <KV k="Номер операции" v={opNumber(tx.id)} mono />
        <KV k="Комиссия" v={tx.fee ? money(tx.fee) : 'Без комиссии'} />
        <KV k="Статус" v={<span className={t.pos}>Исполнен</span>} />
      </div>

      <div className="mt-3 space-y-2">
        {!incoming &&
          (tx.receiptFileId ? (
            <div className={cn('flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] leading-snug', t.accentBg)}>
              <FileCheck size={16} className="mt-0.5 shrink-0" />
              <span>
                Чек сохранён: <b className="break-all">{fileName ?? 'PDF'}</b> — доступен на компьютере в папке «Чеки и Ордера»
              </span>
            </div>
          ) : (
            <Btn variant="ghost" onClick={save}>
              <FileDown size={18} />
              Сохранить PDF-чек
            </Btn>
          ))}

        {incoming && tx.refundable && !tx.refunded && !confirmRefund && (
          <Btn variant="ghost" onClick={() => setConfirmRefund(true)}>
            <Undo2 size={18} />
            Вернуть платёж отправителю
          </Btn>
        )}
        {confirmRefund && (
          <div className={cn('rounded-2xl p-3.5', t.dark ? 'bg-amber-400/10' : 'bg-amber-50')}>
            <div className="text-[14px] font-semibold">Вернуть {money(tx.amount)}?</div>
            <div className={cn('mt-1 text-[12.5px] leading-snug', t.muted)}>
              Используйте, если деньги пришли от третьего лица — например, «за коляску с Авито». Деньги вернутся отправителю.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn variant="ghost" onClick={() => setConfirmRefund(false)} className="h-11">
                Отмена
              </Btn>
              <Btn variant="danger" onClick={refund} className="h-11">
                Вернуть
              </Btn>
            </div>
          </div>
        )}
        {incoming && tx.refunded && (
          <div className={cn('flex items-center justify-center gap-2 py-1 text-[13px] font-medium', t.muted)}>
            <CircleCheck size={16} />
            Платёж возвращён
          </div>
        )}
        <ResultSlot node={res.node} dark={t.dark} />
      </div>
    </div>
  );
}
