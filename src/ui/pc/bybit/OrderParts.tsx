import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ExtBankId, OrderStatus, P2POrder } from '../../../game/types';
import { BANK_SHORT, timerStr } from '../../../game/util';
import { cn, useNow } from '../../common/kit';

export const BANK_COLORS: Record<ExtBankId, string> = {
  sber: '#21A038',
  tbank: '#FFDD2D',
  alfa: '#EF3124',
  vtb: '#2F6BFF',
  raif: '#FEE600',
  ozon: '#005BFF',
  pochta: '#2C6BE5',
};

export const isActiveStatus = (s: OrderStatus) => s === 'pending_payment' || s === 'paid' || s === 'appeal';

/** Amount as typed into a bank app: "10000" or "10074.50". */
export const amountValue = (rub: number) => {
  const r = Math.round(rub * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

export const signedRub2 = (n: number) =>
  `${n >= 0 ? '+' : '−'}${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))} ₽`;

export function BankChip({ bank, className }: { bank: ExtBankId; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm bg-white/[0.06] py-0.5 pr-1.5 pl-1 text-[11px] leading-none text-white/75', className)}>
      <span className="h-2.5 w-[3px] rounded-full" style={{ background: BANK_COLORS[bank] }} />
      {BANK_SHORT[bank]}
    </span>
  );
}

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending_payment: { label: 'Ожидает оплаты', cls: 'bg-amber/15 text-amber' },
  paid: { label: 'Оплачено', cls: 'bg-sky-400/15 text-sky-300' },
  appeal: { label: 'Апелляция', cls: 'bg-rose/15 text-rose' },
  completed: { label: 'Завершён', cls: 'bg-emerald/15 text-emerald' },
  cancelled: { label: 'Отменён', cls: 'bg-white/10 text-white/50' },
};

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const s = STATUS[status];
  return <span className={cn('inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none', s.cls, className)}>{s.label}</span>;
}

/** Live mm:ss countdown; isolated so only it re-renders every tick. */
export function Countdown({ deadline, className, okClass = 'text-white/70', warnAt = 3 }: { deadline: number; className?: string; okClass?: string; warnAt?: number }) {
  const now = useNow();
  const left = deadline - now;
  return <span className={cn('num', className, left < warnAt ? 'text-rose' : okClass)}>{timerStr(left)}</span>;
}

export function sideLabel(o: Pick<P2POrder, 'side'>) {
  return o.side === 'buy' ? 'Покупка USDT' : 'Продажа USDT';
}

/** Overlay dialog scoped to the nearest `relative` container (the order room). */
export function Modal({ title, onClose, children, width = 440 }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="scroll-thin flex max-h-full w-full flex-col overflow-auto rounded-xl border border-white/10 bg-bybit-2 shadow-2xl shadow-black/60"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white" title="Закрыть">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}
