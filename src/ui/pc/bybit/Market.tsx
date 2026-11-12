import { Fragment, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BadgeCheck, Building2, RefreshCw, Search, X } from 'lucide-react';
import type { Ad, ExtBankId, MyAd } from '../../../game/types';
import { useGame } from '../../../game/store';
import { regenerateAds } from '../../../game/engine/market';
import { BANK_SHORT, fmtNum, fmtPrice, fmtUsdt, plural } from '../../../game/util';
import { Avatar, cn, parseNum } from '../../common/kit';
import { BankChip } from './OrderParts';
import MarketTakePanel from './MarketTakePanel';

type Tab = 'buy' | 'sell';
type BankFilter = ExtBankId | 'all';
type Row = { kind: 'ad'; ad: Ad; price: number } | { kind: 'mine'; ad: MyAd; price: number };

const BANK_FILTERS: BankFilter[] = ['all', 'sber', 'tbank', 'alfa', 'vtb', 'raif', 'ozon'];
const GRID = 'grid grid-cols-[minmax(180px,2.2fr)_minmax(96px,1fr)_minmax(178px,1.6fr)_minmax(110px,1.3fr)_112px] items-center gap-3';

// Filters survive switching between Bybit sections.
const memo = { tab: 'buy' as Tab, amount: '', bank: 'all' as BankFilter, moscow: false };

export default function Market() {
  const ads = useGame((s) => s.market.ads);
  const myAds = useGame((s) => s.exchanges.bybit.ads);
  const chapter = useGame((s) => s.chapter);
  const me = useGame(useShallow((s) => ({ completed: s.exchanges.bybit.completed, cancelled: s.exchanges.bybit.cancelled })));
  const setView = useGame((s) => s.setBybitView);

  const [tab, setTabState] = useState<Tab>(memo.tab);
  const [amount, setAmountState] = useState(memo.amount);
  const [bank, setBankState] = useState<BankFilter>(memo.bank);
  const [moscowState, setMoscowState] = useState(memo.moscow);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);

  const setTab = (t: Tab) => {
    memo.tab = t;
    setTabState(t);
    setExpanded(null);
  };
  const setAmount = (a: string) => {
    memo.amount = a;
    setAmountState(a);
  };
  const setBank = (b: BankFilter) => {
    memo.bank = b;
    setBankState(b);
  };
  const setMoscow = (m: boolean) => {
    memo.moscow = m;
    setMoscowState(m);
    setExpanded(null);
  };
  const moscow = chapter >= 4 && moscowState;
  const tier = moscow ? 'moscow' : 'local';

  const amountNum = parseNum(amount);
  const merchantSide = tab === 'buy' ? 'sell' : 'buy';

  const rows = useMemo<Row[]>(() => {
    const fits = (min: number, max: number, banks: readonly ExtBankId[]) =>
      (!amountNum || (min <= amountNum && amountNum <= max)) && (bank === 'all' || banks.includes(bank));
    const list: Row[] = ads
      .filter((a) => a.exchange === 'bybit' && a.side === merchantSide && a.tier === tier && a.availableUsdt * a.price >= a.minRub && fits(a.minRub, a.maxRub, a.banks))
      .map((a) => ({ kind: 'ad', ad: a, price: a.price }));
    if (tier === 'local') {
      for (const a of myAds) if (a.active && a.side === merchantSide && fits(a.minRub, a.maxRub, a.banks)) list.push({ kind: 'mine', ad: a, price: a.price });
    }
    return list.sort((x, y) => (tab === 'buy' ? x.price - y.price : y.price - x.price));
  }, [ads, myAds, merchantSide, tier, amountNum, bank, tab]);

  // An expanded ad may be withdrawn by the merchant on the next orderbook refresh.
  useEffect(() => {
    if (expanded && !ads.some((a) => a.id === expanded)) {
      setExpanded(null);
      setNotice('Объявление снято мерчантом или изменилось — выберите другое.');
    }
  }, [ads, expanded]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const refresh = () => {
    setSpin(true);
    useGame.getState().act((d) => regenerateAds(d));
    setTimeout(() => setSpin(false), 650);
  };

  const myCompletion = me.completed + me.cancelled ? Math.round((me.completed / (me.completed + me.cancelled)) * 1000) / 10 : 100;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bybit">
      {/* filters */}
      <div className="shrink-0 space-y-2.5 border-b border-white/[0.06] px-4 pt-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-bybit-3 p-0.5">
            {(['buy', 'sell'] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'h-8 rounded-md px-5 text-sm font-semibold transition',
                  tab === t ? (t === 'buy' ? 'bg-emerald text-white' : 'bg-rose text-white') : 'text-white/55 hover:text-white',
                )}
              >
                {t === 'buy' ? 'Купить' : 'Продать'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#26A17B] text-[9px] font-bold text-white">₮</span>
            <span className="font-semibold">USDT</span>
            <span className="mx-1 text-white/25">/</span>
            <span className="text-white/60">RUB</span>
          </div>
          {chapter >= 4 && (
            <button
              type="button"
              onClick={() => setMoscow(!moscowState)}
              className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition', moscow ? 'border-amber/60 bg-amber/10 text-amber' : 'border-white/10 text-white/60 hover:text-white')}
              title="Крупные мерчанты: лимиты от 50 000 ₽"
            >
              <Building2 size={14} />
              Московская ликвидность
              <span className={cn('relative h-4 w-7 rounded-full transition', moscow ? 'bg-amber' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all', moscow ? 'left-3.5' : 'left-0.5')} />
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:text-white"
            title="Обновить объявления"
          >
            <RefreshCw size={13} className={cn(spin && 'animate-spin')} />
            Обновить
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-52 items-center rounded-lg border border-white/10 bg-bybit-2 px-2.5 focus-within:border-amber/60">
            <Search size={13} className="text-white/35" />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="Сумма"
              inputMode="numeric"
              className="num ml-2 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
            {amount ? (
              <button type="button" onClick={() => setAmount('')} className="text-white/40 hover:text-white" title="Сбросить">
                <X size={13} />
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-white/40">RUB</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {BANK_FILTERS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBank(b)}
                className={cn(
                  'h-7 rounded-md px-2.5 text-xs transition',
                  bank === b ? 'bg-white/[0.12] font-semibold text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80',
                )}
              >
                {b === 'all' ? 'Все' : BANK_SHORT[b]}
              </button>
            ))}
          </div>
        </div>
        {notice && <div className="rounded-md bg-amber/10 px-3 py-1.5 text-xs text-amber">{notice}</div>}
      </div>

      {/* orderbook */}
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        <div className="min-w-[760px]">
          <div className={cn(GRID, 'sticky top-0 z-10 border-b border-white/[0.06] bg-bybit px-4 py-2 text-[11px] text-white/40')}>
            <span>Мерчант</span>
            <span>Цена</span>
            <span>Доступно / Лимиты</span>
            <span>Способы оплаты</span>
            <span className="text-right">
              Сделка · <span className="text-emerald">без комиссии</span>
            </span>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-16 text-center text-sm text-white/40">
              Нет объявлений по заданным фильтрам.
              {(amount || bank !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount('');
                    setBank('all');
                  }}
                  className="ml-2 text-amber hover:underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
          {rows.map((r) =>
            r.kind === 'mine' ? (
              <MyAdRow key={r.ad.id} ad={r.ad} tab={tab} completed={me.completed} completion={myCompletion} onManage={() => setView('ads')} />
            ) : (
              <Fragment key={r.ad.id}>
                <AdRow ad={r.ad} tab={tab} open={expanded === r.ad.id} onToggle={() => setExpanded(expanded === r.ad.id ? null : r.ad.id)} />
                {expanded === r.ad.id && <MarketTakePanel ad={r.ad} side={tab} onClose={() => setExpanded(null)} />}
              </Fragment>
            ),
          )}
          {rows.length > 0 && (
            <div className="px-4 py-4 text-center text-[11px] text-white/30">
              Цены обновляются в реальном времени. Bybit не взимает комиссию с тейкера P2P-сделки.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceCell({ price, tab }: { price: number; tab: Tab }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn('num text-[18px] font-semibold', tab === 'buy' ? 'text-emerald' : 'text-rose')}>{fmtPrice(price)}</span>
      <span className="text-xs text-white/45">₽</span>
    </div>
  );
}

function LimitsCell({ available, min, max }: { available: number; min: number; max: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs whitespace-nowrap">
      <span className="text-white/40">Доступно</span>
      <span className="num text-white/85">{fmtUsdt(available)}</span>
      <span className="text-white/40">Лимиты</span>
      <span className="num text-white/85">
        {fmtNum(min)} – {fmtNum(max)} ₽
      </span>
    </div>
  );
}

function AdRow({ ad, tab, open, onToggle }: { ad: Ad; tab: Tab; open: boolean; onToggle: () => void }) {
  const m = ad.merchant;
  return (
    <div className={cn(GRID, 'border-b border-white/[0.04] px-4 py-3 transition', open ? 'bg-[#161b26]' : 'hover:bg-white/[0.02]')}>
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="relative">
          <Avatar name={m.nick} color={m.color} size={32} />
          <span className={cn('absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-bybit', m.online ? 'bg-emerald' : 'bg-white/30')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-[13px] font-semibold text-white">{m.nick}</span>
            {m.verified && <BadgeCheck size={14} className="shrink-0 text-amber" />}
          </div>
          <div className="num text-[11px] text-white/50">
            {fmtNum(m.orders)} {plural(m.orders, 'сделка', 'сделки', 'сделок')} · {m.completion}%
          </div>
          <div className="text-[11px] text-white/35">на платформе {m.regDays} дн.</div>
        </div>
      </div>
      <PriceCell price={ad.price} tab={tab} />
      <LimitsCell available={ad.availableUsdt} min={ad.minRub} max={ad.maxRub} />
      <div className="flex flex-wrap gap-1">
        {ad.banks.map((b) => (
          <BankChip key={b} bank={b} />
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'h-8 w-full rounded-md text-xs font-semibold transition',
            open ? 'bg-white/10 text-white/80 hover:bg-white/15' : tab === 'buy' ? 'bg-emerald text-white hover:brightness-110' : 'bg-rose text-white hover:brightness-110',
          )}
        >
          {open ? 'Свернуть' : tab === 'buy' ? 'Купить USDT' : 'Продать USDT'}
        </button>
      </div>
    </div>
  );
}

function MyAdRow({ ad, tab, completed, completion, onManage }: { ad: MyAd; tab: Tab; completed: number; completion: number; onManage: () => void }) {
  return (
    <div className={cn(GRID, 'border-b border-l-2 border-b-white/[0.04] border-l-amber bg-amber/[0.05] px-4 py-3')}>
      <div className="flex min-w-0 items-start gap-2.5">
        <Avatar name="Артём Воронов" color="#3B82F6" size={32} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-white">tema_voronov</span>
            <span className="rounded bg-amber/20 px-1 py-px text-[10px] font-semibold text-amber">Вы</span>
          </div>
          <div className="num text-[11px] text-white/50">
            {completed} {plural(completed, 'сделка', 'сделки', 'сделок')} · {completion}%
          </div>
          {ad.undercutBy ? <div className="num text-[11px] text-rose/80">перебито: {fmtPrice(ad.undercutBy)} ₽</div> : <div className="text-[11px] text-white/35">онлайн</div>}
        </div>
      </div>
      <PriceCell price={ad.price} tab={tab} />
      <LimitsCell available={ad.remainingUsdt} min={ad.minRub} max={ad.maxRub} />
      <div className="flex flex-wrap gap-1">
        {ad.banks.map((b) => (
          <BankChip key={b} bank={b} />
        ))}
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="text-xs font-semibold text-amber">Ваше объявление</span>
        <button type="button" onClick={onManage} className="text-[11px] text-white/45 hover:text-white">
          Управлять →
        </button>
      </div>
    </div>
  );
}
