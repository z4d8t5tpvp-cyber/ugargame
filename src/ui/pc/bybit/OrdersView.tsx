import { useEffect, useMemo } from 'react';
import { ClipboardList, Store } from 'lucide-react';
import type { P2POrder } from '../../../game/types';
import { useGame } from '../../../game/store';
import { fmtRub, fmtUsdt, shortDT } from '../../../game/util';
import { cn } from '../../common/kit';
import { Countdown, isActiveStatus, StatusChip } from './OrderParts';
import OrderRoom from './OrderRoom';

export default function OrdersView() {
  const orders = useGame((s) => s.orders);
  const focusId = useGame((s) => s.ui.focusOrderId);
  const focusOrder = useGame((s) => s.focusOrder);
  const setView = useGame((s) => s.setBybitView);

  const { active, history } = useMemo(() => {
    const a: P2POrder[] = [];
    const h: P2POrder[] = [];
    for (const o of orders) (isActiveStatus(o.status) ? a : h).push(o);
    return { active: a, history: h.slice(0, 40) };
  }, [orders]);

  const currentId = focusId && orders.some((o) => o.id === focusId) ? focusId : (active[0]?.id ?? null);

  // Keep the engine's focus in sync with what is on screen (it mutes notifications for the focused order).
  useEffect(() => {
    if (currentId && currentId !== focusId) focusOrder(currentId);
  }, [currentId, focusId, focusOrder]);

  return (
    <div className="flex h-full min-h-0 bg-bybit">
      <div className="scroll-thin flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] bg-[#10141c]">
        <Section title="Активные" count={active.length} />
        {active.length === 0 && <div className="px-3 pb-3 text-xs text-white/35">Нет активных ордеров</div>}
        {active.map((o) => (
          <Item key={o.id} o={o} selected={o.id === currentId} onClick={() => focusOrder(o.id)} />
        ))}
        <Section title="История" count={history.length} />
        {history.length === 0 && <div className="px-3 pb-3 text-xs text-white/35">Завершённых сделок пока нет</div>}
        {history.map((o) => (
          <Item key={o.id} o={o} selected={o.id === currentId} onClick={() => focusOrder(o.id)} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {currentId ? (
          <OrderRoom key={currentId} orderId={currentId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/35">
              <ClipboardList size={26} />
            </div>
            <div className="text-sm font-semibold text-white/80">Нет активных ордеров</div>
            <div className="max-w-xs text-xs leading-relaxed text-white/40">Откройте сделку в разделе P2P-торговли или дождитесь отклика на ваше объявление.</div>
            <button
              type="button"
              onClick={() => setView('market')}
              className="mt-1 flex h-9 items-center gap-2 rounded-lg bg-amber px-4 text-[13px] font-semibold text-black hover:brightness-110"
            >
              <Store size={15} /> Перейти к объявлениям
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count }: { title: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-[#10141c] px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-white/40 uppercase">
      {title}
      <span className="num rounded bg-white/[0.06] px-1.5 py-px text-[10px] text-white/50">{count}</span>
    </div>
  );
}

function Item({ o, selected, onClick }: { o: P2POrder; selected: boolean; onClick: () => void }) {
  const buy = o.side === 'buy';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full border-l-2 px-3 py-2.5 text-left transition', selected ? 'border-amber bg-white/[0.06]' : 'border-transparent hover:bg-white/[0.03]')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[13px] font-semibold', buy ? 'text-emerald' : 'text-rose')}>
          {buy ? 'Покупка' : 'Продажа'} <span className="text-white/80">USDT</span>
        </span>
        <StatusChip status={o.status} />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="num font-medium text-white/90">{fmtRub(o.rub, 2)}</span>
        <span className="num text-white/45">{fmtUsdt(o.usdt)}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-white/40">
        <span className="truncate">
          {o.cp.nick}
          {o.viaMyAd && <span className="text-amber/70"> · объявл.</span>}
        </span>
        {o.status === 'pending_payment' ? <Countdown deadline={o.deadline} className="font-semibold" okClass="text-amber" /> : <span className="num shrink-0">{shortDT(o.createdAt)}</span>}
      </div>
    </button>
  );
}
