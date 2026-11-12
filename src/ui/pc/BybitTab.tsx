import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowRight, ClipboardList, Lock, Megaphone, ShieldAlert, ShieldCheck, Store, UserRound, Wallet } from 'lucide-react';
import type { GameState } from '../../game/types';
import { useGame } from '../../game/store';
import { fmtUsdt } from '../../game/util';
import { cn } from '../common/kit';
import Market from './bybit/Market';
import OrdersView from './bybit/OrdersView';
import MyAds from './bybit/MyAds';
import Assets from './bybit/Assets';
import Profile from './bybit/Profile';

type View = GameState['ui']['bybitView'];

const TABS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'market', label: 'P2P-торговля', icon: <Store size={14} /> },
  { id: 'orders', label: 'Мои ордера', icon: <ClipboardList size={14} /> },
  { id: 'ads', label: 'Мои объявления', icon: <Megaphone size={14} /> },
  { id: 'assets', label: 'Активы', icon: <Wallet size={14} /> },
  { id: 'profile', label: 'Профиль', icon: <UserRound size={14} /> },
];

export default function BybitTab() {
  const view = useGame((s) => s.ui.bybitView);
  const setView = useGame((s) => s.setBybitView);
  const activeCount = useGame((s) => s.orders.reduce((n, o) => n + (o.status === 'pending_payment' || o.status === 'paid' || o.status === 'appeal' ? 1 : 0), 0));
  const acc = useGame(
    useShallow((s) => ({
      registered: s.exchanges.bybit.registered,
      kyc: s.exchanges.bybit.kyc,
      twoFA: s.exchanges.bybit.twoFA,
      usdt: s.exchanges.bybit.usdt,
      frozen: s.exchanges.bybit.frozen,
    })),
  );

  const banner = !acc.registered
    ? { text: 'Зарегистрируйтесь, чтобы торговать', action: 'Регистрация' }
    : acc.kyc === 'none'
      ? { text: 'Пройдите верификацию личности (KYC), чтобы открывать сделки на P2P', action: 'Пройти KYC' }
      : acc.kyc === 'pending'
        ? { text: 'Документы на проверке — верификация обычно занимает несколько минут', action: 'Статус' }
        : !acc.twoFA
          ? { text: 'Привяжите Google Authenticator — без 2FA нельзя продавать и отпускать USDT', action: 'Настроить 2FA' }
          : null;

  const account = !acc.registered
    ? { label: 'Не зарегистрирован', cls: 'text-white/55 border-white/15', icon: <UserRound size={13} /> }
    : acc.kyc === 'verified'
      ? { label: 'Верифицирован', cls: 'text-emerald border-emerald/30', icon: <ShieldCheck size={13} /> }
      : acc.kyc === 'pending'
        ? { label: 'KYC на проверке', cls: 'text-amber border-amber/30', icon: <ShieldAlert size={13} /> }
        : { label: 'KYC не пройден', cls: 'text-rose border-rose/30', icon: <ShieldAlert size={13} /> };

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-bybit text-white/90">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0b0e14] px-3">
        <button type="button" onClick={() => setView('market')} className="mr-1 flex shrink-0 items-center gap-1.5" title="Bybit P2P">
          <span className="text-[17px] font-black tracking-[0.06em] text-amber">BYBIT</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/80">P2P</span>
        </button>
        <nav className="scroll-thin flex h-full min-w-0 items-stretch overflow-x-auto">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 px-2.5 text-[13px] whitespace-nowrap transition',
                view === t.id ? 'font-semibold text-white' : 'text-white/55 hover:text-white/85',
              )}
            >
              <span className={cn('hidden @4xl:inline', view === t.id ? 'text-amber' : 'text-white/40')}>{t.icon}</span>
              {t.label}
              {t.id === 'orders' && activeCount > 0 && (
                <span className="num flex h-4 min-w-4 animate-pulse-soft items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-black">{activeCount}</span>
              )}
              {view === t.id && <span className="absolute right-2.5 bottom-0 left-2.5 h-0.5 rounded-full bg-amber" />}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setView('assets')}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-right hover:bg-white/[0.05]"
            title="Баланс Funding-аккаунта"
          >
            <Wallet size={15} className="text-white/40" />
            <span className="leading-tight">
              <span className="num block text-[12.5px] font-semibold text-white">{fmtUsdt(acc.usdt)}</span>
              <span className="num hidden items-center justify-end gap-1 text-[10px] text-white/40 @3xl:flex">
                <Lock size={9} /> в эскроу {fmtUsdt(acc.frozen, false)}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setView('profile')}
            className={cn('flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium hover:bg-white/[0.04]', account.cls)}
            title={account.label}
          >
            {account.icon}
            <span className="hidden @5xl:inline">{account.label}</span>
          </button>
        </div>
      </header>

      {banner && view !== 'profile' && (
        <div className="flex shrink-0 items-center gap-3 border-b border-amber/20 bg-amber/[0.08] px-4 py-1.5 text-xs text-amber">
          <ShieldAlert size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{banner.text}</span>
          <button type="button" onClick={() => setView('profile')} className="flex shrink-0 items-center gap-1 rounded-md bg-amber px-2.5 py-1 text-[11px] font-semibold text-black hover:brightness-110">
            {banner.action} <ArrowRight size={12} />
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden">
        {view === 'market' && <Market />}
        {view === 'orders' && <OrdersView />}
        {view === 'ads' && (
          <div className="scroll-thin h-full overflow-auto">
            <MyAds />
          </div>
        )}
        {view === 'assets' && (
          <div className="scroll-thin h-full overflow-auto">
            <Assets />
          </div>
        )}
        {view === 'profile' && (
          <div className="scroll-thin h-full overflow-auto">
            <Profile />
          </div>
        )}
      </main>
    </div>
  );
}
