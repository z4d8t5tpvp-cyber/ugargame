import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown, Clock, Fuel, History as HistoryIcon, Lock, ScanLine, ScanSearch, Settings } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../../game/store';
import { TRX_USD } from '../../game/engine/crypto';
import { plural, shortAddr } from '../../game/util';
import { cn, CopyBtn } from '../common/kit';
import { Aml } from './wallet/Aml';
import { History } from './wallet/History';
import { Receive, Send, Swap } from './wallet/Transfer';
import { fmtAmt, fmtUsd, TokenIcon } from './wallet/ui';

type Screen = 'main' | 'receive' | 'send' | 'swap' | 'aml' | 'history';

function TonkeeperLogo({ size = 88 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-[28%] bg-gradient-to-br from-[#45AEF5] to-[#1C7ED6] shadow-xl shadow-[#45AEF5]/20" style={{ width: size, height: size }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5h16L12 20 4 5.5Z" fill="#fff" fillOpacity=".95" />
        <path d="M12 5.5V20" stroke="#1C7ED6" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

function Install() {
  return (
    <div className="flex h-full w-full flex-col items-center bg-[#10161F] px-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <TonkeeperLogo />
        <div className="mt-5 text-[24px] font-bold text-white">Tonkeeper</div>
        <div className="mt-0.5 text-[12.5px] text-[#8994A3]">Криптокошелёк · USDT в сетях TRC-20 и TON</div>
        <div className="mt-6 max-w-[260px] text-[14px] leading-snug text-[#B6C0CC]">Кошелёк понадобится для переводов между биржами. Саня подскажет, когда пора</div>
      </div>
      <button type="button" disabled className="mb-8 w-full cursor-not-allowed rounded-xl bg-[#1D2633] py-3.5 text-[15px] font-semibold text-[#5B6675]">
        Установить
      </button>
    </div>
  );
}

function Action({ icon, label, onClick, locked }: { icon: ReactNode; label: string; onClick: () => void; locked?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5">
      <span className={cn('relative flex h-12 w-12 items-center justify-center rounded-full transition', locked ? 'bg-[#1D2633] text-[#5B6675]' : 'bg-[#1D2633] text-white group-hover:bg-[#263040]')}>
        {icon}
        {locked && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#10161F] text-[#8994A3]">
            <Lock size={11} />
          </span>
        )}
      </span>
      <span className={cn('text-center text-[11px] font-medium leading-tight', locked ? 'text-[#5B6675]' : 'text-[#B6C0CC]')}>{label}</span>
    </button>
  );
}

function AssetRow({ token, net, name, sub, amount, usd, dec = 2 }: { token: 'USDT' | 'TRX' | 'TON'; net?: 'TRC20' | 'TON'; name: string; sub: string; amount: number; usd: number; dec?: number }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <TokenIcon token={token} net={net} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-white">{name}</div>
        <div className="truncate text-[12.5px] text-[#8994A3]">{sub}</div>
      </div>
      <div className="text-right">
        <div className="num text-[15px] font-semibold text-white">{fmtAmt(amount, dec)}</div>
        <div className="num text-[12.5px] text-[#8994A3]">{fmtUsd(usd)}</div>
      </div>
    </div>
  );
}

function Main({ go }: { go: (s: Screen) => void }) {
  const w = useGame(useShallow((s) => ({ trc: s.wallet.usdtTrc20, ton: s.wallet.usdtTon, trx: s.wallet.trx, tonGas: s.wallet.ton, addr: s.wallet.addressTon, aml: s.wallet.amlUnlocked })));
  const tonUsd = useGame((s) => s.market.tonUsd);
  const inbound = useGame((s) => s.chain.filter((c) => c.to === s.wallet.addressTrc20 || c.to === s.wallet.addressTon).length);
  const [amlHint, setAmlHint] = useState(false);
  const total = w.trc + w.ton + w.trx * TRX_USD + w.tonGas * tonUsd;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between px-3">
        <ScanLine size={21} className="text-[#8994A3]" />
        <div className="flex items-center gap-1 rounded-full bg-[#1D2633] px-3 py-1.5 text-[14px] font-semibold text-white">
          😎 Кошелёк <ChevronDown size={15} className="text-[#8994A3]" />
        </div>
        <Settings size={21} className="text-[#8994A3]" />
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col items-center pb-5 pt-4">
          <div className="num text-[38px] font-bold leading-none tracking-tight text-white">{fmtUsd(total)}</div>
          <div className="mt-2 flex items-center gap-1 text-[13px] text-[#8994A3]">
            <span className="font-mono">{shortAddr(w.addr)}</span>
            <CopyBtn value={w.addr} label="Мой Tonkeeper (TON)" kind="address" meta={{ network: 'TON' }} className="px-1 py-0">
              <span className="sr-only">Скопировать</span>
            </CopyBtn>
          </div>
          {inbound > 0 && (
            <button type="button" onClick={() => go('history')} className="mt-2.5 flex items-center gap-1.5 rounded-full bg-[#F5A73B]/15 px-3 py-1 text-[12.5px] font-medium text-[#F5A73B]">
              <Clock size={13} /> {inbound} {plural(inbound, 'входящий перевод', 'входящих перевода', 'входящих переводов')} в пути
            </button>
          )}
        </div>

        <div className="flex gap-1">
          <Action icon={<ArrowUp size={21} />} label="Отправить" onClick={() => go('send')} />
          <Action icon={<ArrowDown size={21} />} label="Получить" onClick={() => go('receive')} />
          <Action icon={<Fuel size={20} />} label="Купить газ" onClick={() => go('swap')} />
          <Action icon={<ScanSearch size={20} />} label="AML-скринер" locked={!w.aml} onClick={() => (w.aml ? go('aml') : setAmlHint((v) => !v))} />
          <Action icon={<HistoryIcon size={20} />} label="История" onClick={() => go('history')} />
        </div>
        <AnimatePresence>
          {amlHint && !w.aml && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#1D2633] px-3.5 py-2.5 text-[12.5px] text-[#B6C0CC]">
                <Lock size={14} className="shrink-0 text-[#8994A3]" /> AML-скринер. Откроется после встречи с Маратом
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl bg-[#1D2633]">
          <AssetRow token="USDT" net="TRC20" name="USDT · TRC-20" sub="Tether USD · $1,00" amount={w.trc} usd={w.trc} />
          <AssetRow token="USDT" net="TON" name="USDT · TON" sub="Tether USD · $1,00" amount={w.ton} usd={w.ton} />
          <AssetRow token="TRX" name="TRX" sub={`газ сети Tron · $${TRX_USD.toFixed(2)}`} amount={w.trx} usd={w.trx * TRX_USD} />
          <AssetRow token="TON" name="TON" sub={`газ сети TON · $${tonUsd.toFixed(2)}`} amount={w.tonGas} usd={w.tonGas * tonUsd} dec={3} />
        </div>
        {w.trx < 13.6 && w.trc > 0 && (
          <button type="button" onClick={() => go('swap')} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-[#F5A73B]/10 px-3.5 py-2.5 text-left text-[12.5px] leading-snug text-[#F5C27A]">
            <Fuel size={15} className="shrink-0" /> Не хватает TRX на комиссию для перевода USDT · TRC-20. Купите газ.
          </button>
        )}
      </div>
    </div>
  );
}

export default function WalletApp() {
  const unlocked = useGame((s) => s.wallet.unlocked);
  const [screen, setScreen] = useState<Screen>('main');
  if (!unlocked) return <Install />;
  const back = () => setScreen('main');
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#10161F] text-white">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={screen}
          initial={{ x: screen === 'main' ? '-30%' : '100%', opacity: screen === 'main' ? 0 : 1 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: screen === 'main' ? '-30%' : '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-[#10161F]"
        >
          {screen === 'main' && <Main go={setScreen} />}
          {screen === 'receive' && <Receive onBack={back} />}
          {screen === 'send' && <Send onBack={back} onHistory={() => setScreen('history')} />}
          {screen === 'swap' && <Swap onBack={back} />}
          {screen === 'aml' && <Aml onBack={back} />}
          {screen === 'history' && <History onBack={back} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
