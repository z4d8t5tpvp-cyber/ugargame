import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, ChartCandlestick, Clock, KeyRound, LifeBuoy, ShieldCheck, UserRound, Wallet, Zap } from 'lucide-react';
import { useGame } from '../../game/store';
import { rapiraQuote } from '../../game/engine/crypto';
import { bestPrice } from '../../game/engine/market';
import { cn } from '../common/kit';
import { RapiraKyc, RapiraSecurity, RapiraSignUp } from './parts/RapiraAuth';
import { ArbitrageBox, Balances, CoinForm, OrderBook, PairHeader, SpotForm } from './parts/RapiraSpot';
import { DepositCrypto, DepositRub, StuckDeposits, WithdrawCrypto, WithdrawRub } from './parts/RapiraFunds';
import { Callout, RapiraLogo, TwoFABadge } from './parts/rapiraUi';

type View = 'trade' | 'wallet' | 'security';
type FundTab = 'dep_rub' | 'wd_rub' | 'dep_usdt' | 'wd_usdt';

export default function RapiraTab() {
  const unlocked = useGame((s) => !!s.flags.rapiraUnlocked);
  const acc = useGame(useShallow((s) => ({ registered: s.exchanges.rapira.registered, kyc: s.exchanges.rapira.kyc, twoFA: s.exchanges.rapira.twoFA })));
  const [view, setView] = useState<View>('trade');
  const [fund, setFund] = useState<FundTab>('dep_rub');

  if (!unlocked) return <Soon />;

  const ready = acc.registered && acc.kyc === 'verified';
  const goSecurity = () => setView('security');

  let body;
  if (!acc.registered) body = <RapiraSignUp />;
  else if (view === 'security') body = <RapiraSecurity />;
  else if (acc.kyc !== 'verified') body = <RapiraKyc />;
  else if (view === 'wallet') body = <WalletView tab={fund} setTab={setFund} onSecurity={goSecurity} />;
  else
    body = (
      <TradeView
        twoFA={acc.twoFA}
        onSecurity={goSecurity}
        onWallet={(t) => {
          setFund(t);
          setView('wallet');
        }}
      />
    );

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#0F172A] text-slate-200">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-800 bg-[#0B1222] px-4">
        <RapiraLogo />
        {acc.registered && (
          <nav className="flex h-full items-stretch">
            <NavBtn active={view === 'trade'} onClick={() => setView('trade')} icon={<ChartCandlestick size={14} />} label="Биржа" />
            <NavBtn active={view === 'wallet'} onClick={() => setView('wallet')} icon={<Wallet size={14} />} label="Кошелёк" />
            <NavBtn active={view === 'security'} onClick={() => setView('security')} icon={<ShieldCheck size={14} />} label="Безопасность" />
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {acc.registered ? (
            <>
              <span className="hidden @2xl:inline-flex">
                <TwoFABadge on={acc.twoFA} />
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  ready ? 'bg-[#3B82F6]/15 text-[#93C5FD]' : acc.kyc === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-700/60 text-slate-400',
                )}
              >
                {ready ? <ShieldCheck size={11} /> : <Clock size={11} />}
                {ready ? 'Верифицирован' : acc.kyc === 'pending' ? 'KYC на проверке' : 'Без верификации'}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                <UserRound size={14} />
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Вход · Регистрация</span>
          )}
        </div>
      </header>
      <Ticker />
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">{body}</div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative flex items-center gap-1.5 px-3 text-[13px] transition', active ? 'font-semibold text-white' : 'text-slate-400 hover:text-slate-200')}>
      <span className={active ? 'text-[#3B82F6]' : ''}>{icon}</span>
      {label}
      {active && <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-[#3B82F6]" />}
    </button>
  );
}

function Ticker() {
  const t = useGame(
    useShallow((s) => {
      const q = rapiraQuote(s);
      return { mid: s.market.rapiraSpot, ask: q.ask, bid: q.bid, ton: s.market.tonUsd, btc: s.market.btcUsd, pBid: bestPrice(s, 'bybit', 'buy', true), pAsk: bestPrice(s, 'bybit', 'sell', true) };
    }),
  );
  return (
    <div className="scroll-thin flex h-7 shrink-0 items-center gap-5 overflow-x-auto border-b border-slate-800 bg-[#0F172A] px-4 text-[11px] whitespace-nowrap">
      <span className="text-slate-400">
        USDT/RUB <b className="num text-white">{t.mid.toFixed(2)}</b>
      </span>
      <span className="text-slate-400">
        TON/USDT <b className="num text-white">{t.ton.toFixed(3)}</b>
      </span>
      <span className="text-slate-400">
        BTC/USDT <b className="num text-white">{Math.round(t.btc).toLocaleString('ru-RU')}</b>
      </span>
      <span className="ml-auto text-slate-500">
        Bybit P2P: покупка <b className="num text-slate-300">{t.pAsk.toFixed(2)}</b> · продажа <b className="num text-slate-300">{t.pBid.toFixed(2)}</b>
      </span>
    </div>
  );
}

function TradeView({ twoFA, onSecurity, onWallet }: { twoFA: boolean; onSecurity: () => void; onWallet: (t: FundTab) => void }) {
  const stuckCount = useGame((s) => s.exchanges.rapira.stuckDeposits.length);
  return (
    <div className="space-y-3 p-3">
      {!twoFA && (
        <Callout tone="warn" icon={<KeyRound size={14} />}>
          Двухфакторная защита не подключена — вывод RUB и USDT недоступен.{' '}
          <button type="button" className="font-semibold text-amber-300 hover:underline" onClick={onSecurity}>
            Настроить 2FA →
          </button>
        </Callout>
      )}
      {stuckCount > 0 && <StuckDeposits compact />}
      <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <PairHeader />
          <ArbitrageBox />
        </div>
        <div className="space-y-3">
          <SpotForm />
          <Balances />
          <div className="grid grid-cols-2 gap-2">
            <QuickBtn icon={<Zap size={14} />} label="Пополнить RUB" onClick={() => onWallet('dep_rub')} />
            <QuickBtn icon={<Banknote size={14} />} label="Вывести RUB" onClick={() => onWallet('wd_rub')} />
            <QuickBtn icon={<ArrowDownToLine size={14} />} label="Ввод USDT" onClick={() => onWallet('dep_usdt')} />
            <QuickBtn icon={<ArrowUpFromLine size={14} />} label="Вывод USDT" onClick={() => onWallet('wd_usdt')} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 @2xl:grid-cols-2 @3xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="@max-3xl:col-span-full">
          <OrderBook />
        </div>
        <CoinForm pair="TON/USDT" />
        <CoinForm pair="BTC/USDT" />
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/70 bg-[#131C2E] py-2 text-xs font-medium text-slate-300 transition hover:border-[#3B82F6]/60 hover:text-white">
      <span className="text-[#60A5FA]">{icon}</span>
      {label}
    </button>
  );
}

const FUND_TABS: { id: FundTab; label: string; icon: ReactNode }[] = [
  { id: 'dep_rub', label: 'Пополнить RUB (СБП)', icon: <Zap size={14} /> },
  { id: 'wd_rub', label: 'Вывести RUB', icon: <Banknote size={14} /> },
  { id: 'dep_usdt', label: 'Пополнить USDT', icon: <ArrowDownToLine size={14} /> },
  { id: 'wd_usdt', label: 'Вывести USDT', icon: <ArrowUpFromLine size={14} /> },
];

function WalletView({ tab, setTab, onSecurity }: { tab: FundTab; setTab: (t: FundTab) => void; onSecurity: () => void }) {
  return (
    <div className="mx-auto max-w-[1000px] space-y-3 p-3">
      <StuckDeposits />
      <div className="grid gap-3 @3xl:grid-cols-[210px_minmax(0,1fr)_260px]">
        <nav className="flex gap-1 overflow-x-auto @3xl:flex-col">
          {FUND_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition', tab === t.id ? 'bg-[#3B82F6]/15 text-white ring-1 ring-[#3B82F6]/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')}
            >
              <span className={tab === t.id ? 'text-[#60A5FA]' : ''}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div className="mt-2 hidden rounded-lg border border-slate-800 p-3 text-[11px] leading-relaxed text-slate-500 @3xl:block">
            <LifeBuoy size={14} className="mb-1 text-slate-400" />
            Сотрудники Rapira никогда не просят коды из SMS и Authenticator.
          </div>
        </nav>
        <div className="min-w-0">
          {tab === 'dep_rub' && <DepositRub />}
          {tab === 'wd_rub' && <WithdrawRub onSecurity={onSecurity} />}
          {tab === 'dep_usdt' && <DepositCrypto />}
          {tab === 'wd_usdt' && <WithdrawCrypto onSecurity={onSecurity} />}
        </div>
        <Balances />
      </div>
    </div>
  );
}

function Soon() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0F172A] p-6 text-center">
      <RapiraLogo />
      <div className="text-lg font-semibold text-white">Скоро</div>
      <p className="max-w-sm text-sm text-slate-400">Раздел пока недоступен. Загляните позже.</p>
    </div>
  );
}
