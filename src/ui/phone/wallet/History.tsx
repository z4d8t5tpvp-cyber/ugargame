import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownLeft, ArrowUpRight, Clock, Inbox } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { ChainTx, PendingChain } from '../../../game/types';
import { addressNetwork, durStr, shortAddr, shortDT } from '../../../game/util';
import { cn, CopyBtn } from '../../common/kit';
import { fmtAmt, Header, netLabel } from './ui';

const party = (s: string) => (addressNetwork(s) ? shortAddr(s) : s);

function Eta({ at }: { at: number }) {
  const now = useGame((s) => s.now);
  const left = at - now;
  return <>{left > 0.05 ? `≈ ${durStr(left)}` : 'зачисляется…'}</>;
}

function Inbound({ c }: { c: PendingChain }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A73B]/15 text-[#F5A73B]">
        <Clock size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-white">
          В пути <span className="rounded bg-white/10 px-1 text-[10.5px] font-semibold text-[#8994A3]">{netLabel(c.network)}</span>
        </div>
        <div className="truncate text-[12.5px] text-[#8994A3]">
          от {c.fromLabel} · <Eta at={c.arriveAt} />
        </div>
      </div>
      <div className="num text-right text-[14.5px] font-semibold text-[#F5A73B]">+{fmtAmt(c.amount)} USDT</div>
    </div>
  );
}

function TxRow({ tx }: { tx: ChainTx }) {
  const [open, setOpen] = useState(false);
  const inbound = tx.direction === 'in';
  const other = inbound ? tx.from : tx.to;
  const status = tx.status === 'pending' ? 'В обработке' : tx.status === 'stuck' ? 'Зависла' : 'Подтверждено';
  return (
    <div role="button" tabIndex={0} onClick={() => setOpen((o) => !o)} className="block w-full cursor-pointer px-3.5 py-3 text-left transition hover:bg-[#263040]/60">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', inbound ? 'bg-[#39CC83]/15 text-[#39CC83]' : 'bg-[#45AEF5]/15 text-[#45AEF5]')}>
          {inbound ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-white">
            {inbound ? 'Получено' : 'Отправлено'}
            <span className="rounded bg-white/10 px-1 text-[10.5px] font-semibold text-[#8994A3]">{netLabel(tx.network)}</span>
          </div>
          <div className="truncate text-[12.5px] text-[#8994A3]">
            {inbound ? 'от ' : 'на '}
            <span className={cn(addressNetwork(other) && 'font-mono')}>{party(other)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={cn('num text-[14.5px] font-semibold', inbound ? 'text-[#39CC83]' : 'text-white')}>
            {inbound ? '+' : '−'}
            {fmtAmt(tx.amount)} USDT
          </div>
          <div className={cn('text-[11.5px]', tx.status === 'pending' ? 'text-[#F5A73B]' : tx.status === 'stuck' ? 'text-[#FF4766]' : 'text-[#8994A3]')}>
            {tx.status === 'done' ? shortDT(tx.at) : status}
          </div>
        </div>
      </div>
      {open && (
        <div className="ml-[52px] mt-2 space-y-1 rounded-xl bg-[#10161F]/70 p-2.5 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="text-[#8994A3]">Статус</span>
            <span className="text-white">{status}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#8994A3]">Время</span>
            <span className="text-white">{shortDT(tx.at)}</span>
          </div>
          {!inbound && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8994A3]">Комиссия</span>
              <span className="text-white">≈ {tx.feeUsdt.toFixed(2)} USDT</span>
            </div>
          )}
          {tx.memo && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8994A3]">MEMO</span>
              <span className="break-all font-mono text-white">{tx.memo}</span>
            </div>
          )}
          {addressNetwork(other) && (
            <div className="pt-1">
              <div className="break-all font-mono text-[11.5px] leading-relaxed text-white/80">{other}</div>
              <CopyBtn value={other} label={`Адрес из истории Tonkeeper`} kind="address" meta={{ network: tx.network }} className="mt-1 px-0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function History({ onBack }: { onBack: () => void }) {
  const history = useGame((s) => s.wallet.history);
  const inbound = useGame(useShallow((s) => s.chain.filter((c) => c.to === s.wallet.addressTrc20 || c.to === s.wallet.addressTon)));
  return (
    <div className="flex h-full flex-col">
      <Header title="История" onBack={onBack} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {inbound.length === 0 && history.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1D2633] text-[#8994A3]">
              <Inbox size={28} />
            </div>
            <div className="mt-3 text-[15px] font-semibold text-white">Здесь появятся ваши транзакции</div>
            <div className="mt-1 text-[13px] text-[#8994A3]">Пополните кошелёк, чтобы начать</div>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-[#1D2633]">
            {inbound.map((c) => (
              <Inbound key={c.id} c={c} />
            ))}
            {history.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
