import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeftRight, ChartLine, Coins, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useGame } from '../../../game/store';
import { rapiraQuote } from '../../../game/engine/crypto';
import { SPOT_FEE, WITHDRAW_FEE, bestPrice } from '../../../game/engine/market';
import { fmtNum, fmtRub, fmtUsdt } from '../../../game/util';
import { cn, parseNum, useResult } from '../../common/kit';
import { Field, Panel, Segmented, floor2, rInput } from './rapiraUi';

const useQuote = () => useGame(useShallow((s) => rapiraQuote(s)));

// ───────── price header + chart ─────────

export function PairHeader() {
  const q = useQuote();
  const history = useGame((s) => s.market.history);
  const mid = useGame((s) => s.market.rapiraSpot);
  // Reconstructs Rapira's premium over the fair price (engine drives it with sin(now/190)).
  const pts = useMemo(() => {
    const arr = history.map((h) => h.v * (1 + Math.sin(h.at / 190) * 0.0055));
    arr.push(mid);
    return arr;
  }, [history, mid]);
  const first = pts[Math.max(0, pts.length - 145)];
  const ch = first ? (mid / first - 1) * 100 : 0;
  const hi = Math.max(...pts.slice(-145));
  const lo = Math.min(...pts.slice(-145));
  return (
    <Panel bodyClass="p-0">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-4 pt-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26A17B] text-[9px] font-black text-white">₮</span>
            <span className="font-semibold text-slate-100">USDT/RUB</span>
            <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px]">Спот</span>
          </div>
          <div className={cn('num mt-1 text-2xl font-bold', ch >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{mid.toFixed(2)}</div>
        </div>
        <Stat label="Изм. за 24 ч" value={`${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`} cls={ch >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        <Stat label="Макс. 24 ч" value={hi.toFixed(2)} />
        <Stat label="Мин. 24 ч" value={lo.toFixed(2)} />
        <Stat label="Цена покупки" value={q.ask.toFixed(2)} cls="text-rose-300" />
        <Stat label="Цена продажи" value={q.bid.toFixed(2)} cls="text-emerald-300" />
      </div>
      <Sparkline pts={pts} />
    </Panel>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={cn('num text-[13px] font-semibold text-slate-200', cls)}>{value}</div>
    </div>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  const W = 600;
  const H = 110;
  if (pts.length < 2) return <div className="h-[110px]" />;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, 8 + (1 - (v - lo) / span) * (H - 16)] as const);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? '#34D399' : '#FB7185';
  const [lx, ly] = xy[xy.length - 1];
  return (
    <div className="relative mt-2 h-[110px]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="rap-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#334155" strokeOpacity="0.45" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#rap-area)" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2={W} y1={ly} y2={ly} stroke={color} strokeOpacity="0.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <circle cx={lx} cy={ly} r="2.5" fill={color} />
      </svg>
      <span className="num absolute top-1 right-2 text-[10px] text-slate-500">{hi.toFixed(2)}</span>
      <span className="num absolute right-2 bottom-1 text-[10px] text-slate-500">{lo.toFixed(2)}</span>
      <span className="absolute bottom-1 left-2 text-[10px] text-slate-600">40 ч · шаг 10 мин</span>
    </div>
  );
}

// ───────── synthetic order book ─────────

export function OrderBook() {
  const q = useQuote();
  const minute = useGame((s) => Math.floor(s.now));
  const rows = useMemo(() => {
    const size = (i: number, side: number) => {
      const h = Math.abs(Math.sin((minute + 1) * 12.9898 + i * 78.233 + side * 37.719) * 43758.5453) % 1;
      return 120 + Math.round(h * h * 24000);
    };
    const asks = Array.from({ length: 7 }, (_, i) => ({ p: q.ask + i * 0.01 + (i > 3 ? 0.02 : 0), v: size(i, 1) })).reverse();
    const bids = Array.from({ length: 7 }, (_, i) => ({ p: q.bid - i * 0.01 - (i > 3 ? 0.02 : 0), v: size(i, 2) }));
    return { asks, bids, max: Math.max(...asks.map((a) => a.v), ...bids.map((b) => b.v)) };
  }, [q.ask, q.bid, minute]);
  return (
    <Panel title="Стакан USDT/RUB" icon={<ChartLine size={15} />} bodyClass="p-0 pb-1">
      <div className="grid grid-cols-3 px-3 pt-2 pb-1 text-[10px] text-slate-500">
        <span>Цена, ₽</span>
        <span className="text-right">Объём, USDT</span>
        <span className="text-right">Сумма, ₽</span>
      </div>
      {rows.asks.map((r, i) => (
        <BookRow key={`a${i}`} p={r.p} v={r.v} max={rows.max} side="a" />
      ))}
      <div className="flex items-center justify-between border-y border-slate-700/50 px-3 py-1.5">
        <span className="num text-sm font-bold text-white">{((q.ask + q.bid) / 2).toFixed(2)}</span>
        <span className="num text-[10px] text-slate-500">спред {(q.ask - q.bid).toFixed(2)} ₽</span>
      </div>
      {rows.bids.map((r, i) => (
        <BookRow key={`b${i}`} p={r.p} v={r.v} max={rows.max} side="b" />
      ))}
    </Panel>
  );
}

function BookRow({ p, v, max, side }: { p: number; v: number; max: number; side: 'a' | 'b' }) {
  return (
    <div className="relative grid grid-cols-3 px-3 py-[3px] text-[11px]">
      <div className={cn('absolute inset-y-0 right-0', side === 'a' ? 'bg-rose-500/10' : 'bg-emerald-500/10')} style={{ width: `${(v / max) * 100}%` }} />
      <span className={cn('num relative', side === 'a' ? 'text-rose-400' : 'text-emerald-400')}>{p.toFixed(2)}</span>
      <span className="num relative text-right text-slate-300">{fmtNum(v)}</span>
      <span className="num relative text-right text-slate-500">{fmtNum((p * v) / 1000, 1)}к</span>
    </div>
  );
}

// ───────── arbitrage vs Bybit P2P ─────────

export function ArbitrageBox() {
  const q = useQuote();
  const bybitBid = useGame((s) => bestPrice(s, 'bybit', 'buy', true));
  const bybitAsk = useGame((s) => bestPrice(s, 'bybit', 'sell', true));
  const LOT = 1000;
  // Route A: buy spot on Rapira → withdraw to Bybit → sell on P2P to the best bid.
  const aGross = (bybitBid / q.ask - 1) * 100;
  const aPnl = (gas: number) => (LOT * (1 - SPOT_FEE) - gas) * bybitBid - LOT * q.ask;
  // Route B: buy on P2P from the best ask → withdraw to Rapira → sell spot.
  const bGross = (q.bid / bybitAsk - 1) * 100;
  const bPnl = (gas: number) => (LOT - gas) * q.bid * (1 - SPOT_FEE) - LOT * bybitAsk;
  return (
    <Panel title="Арбитраж: Rapira ↔ Bybit P2P" icon={<ArrowLeftRight size={15} />} right={<span className="text-[10px] text-slate-500">лучшие цены без Макса</span>}>
      <div className="grid gap-3 @2xl:grid-cols-2">
        <Route
          title="Купить на Rapira → продать на P2P"
          a={{ label: 'Rapira, покупка', v: q.ask }}
          b={{ label: 'P2P, продажа', v: bybitBid }}
          gross={aGross}
          ton={aPnl(WITHDRAW_FEE.TON)}
          trc={aPnl(WITHDRAW_FEE.TRC20)}
        />
        <Route
          title="Купить на P2P → продать на Rapira"
          a={{ label: 'P2P, покупка', v: bybitAsk }}
          b={{ label: 'Rapira, продажа', v: q.bid }}
          gross={bGross}
          ton={bPnl(WITHDRAW_FEE.TON)}
          trc={bPnl(WITHDRAW_FEE.TRC20)}
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Комиссия спота 0,1%. Перевод между биржами — только через блокчейн: вывод TRC-20 стоит <b className="text-slate-300">1,5 USDT</b>, TON — <b className="text-slate-300">0,15 USDT</b> (для TON обязателен MEMO). Плюс время: пока монеты в пути, курс может уйти.
      </p>
    </Panel>
  );
}

function Route({ title, a, b, gross, ton, trc }: { title: string; a: { label: string; v: number }; b: { label: string; v: number }; gross: number; ton: number; trc: number }) {
  const good = ton > 0;
  return (
    <div className={cn('rounded-lg border p-3', good ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-slate-700/60 bg-[#0B1222]')}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        {good ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-slate-500" />}
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-slate-500">{a.label}</div>
          <div className="num font-semibold text-slate-200">{a.v.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-500">{b.label}</div>
          <div className="num font-semibold text-slate-200">{b.v.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-slate-700/50 pt-2">
        <span className="text-[11px] text-slate-400">Спред</span>
        <span className={cn('num text-base font-bold', gross > 0 ? 'text-emerald-400' : 'text-rose-400')}>
          {gross >= 0 ? '+' : ''}
          {gross.toFixed(2)}%
        </span>
      </div>
      <div className="mt-1 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">На 1 000 USDT через TON</span>
          <span className={cn('num font-medium', ton > 0 ? 'text-emerald-400' : 'text-rose-400')}>{signed(ton)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">…через TRC-20</span>
          <span className={cn('num font-medium', trc > 0 ? 'text-emerald-400' : 'text-rose-400')}>{signed(trc)}</span>
        </div>
      </div>
    </div>
  );
}

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${fmtRub(Math.abs(v))}`;

// ───────── USDT/RUB market order ─────────

export function SpotForm() {
  const q = useQuote();
  const bal = useGame(useShallow((s) => ({ rub: s.exchanges.rapira.rub, usdt: s.exchanges.rapira.usdt })));
  const spotTrade = useGame((s) => s.spotTrade);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qtyStr, setQtyStr] = useState('');
  const [rubStr, setRubStr] = useState('');
  const [by, setBy] = useState<'qty' | 'rub'>('qty');
  const res = useResult();

  const price = side === 'buy' ? q.ask : q.bid;
  const qty = by === 'qty' ? parseNum(qtyStr) : floor2(parseNum(rubStr) / price);
  const rub = by === 'rub' ? parseNum(rubStr) : qty * price;
  const fee = side === 'buy' ? qty * SPOT_FEE : rub * SPOT_FEE;
  const receive = side === 'buy' ? qty - fee : rub - fee;
  const insufficient = side === 'buy' ? qty * price > bal.rub + 0.005 : qty > bal.usdt + 1e-9;

  const setPct = (p: number) => {
    if (side === 'buy') {
      const v = floor2((bal.rub * p) / price);
      setBy('qty');
      setQtyStr(v > 0 ? String(v) : '');
    } else {
      const v = floor2(bal.usdt * p);
      setBy('qty');
      setQtyStr(v > 0 ? String(v) : '');
    }
  };
  const submit = () => {
    const amount = floor2(qty);
    if (!(amount > 0)) return res.show({ ok: false, error: 'Введите количество USDT' });
    if (res.show(spotTrade('USDT/RUB', side, amount))) {
      setQtyStr('');
      setRubStr('');
    }
  };

  return (
    <Panel title="Рыночный ордер" icon={<Coins size={15} />} right={<span className="text-[10px] text-slate-500">комиссия 0,1%</span>}>
      <Segmented
        value={side}
        onChange={(v) => {
          setSide(v);
          res.clear();
        }}
        options={[
          { id: 'buy', label: 'Купить USDT', cls: 'bg-emerald-500 text-white' },
          { id: 'sell', label: 'Продать USDT', cls: 'bg-rose-500 text-white' },
        ]}
      />
      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between rounded-lg bg-[#0B1222] px-3 py-2 text-xs">
          <span className="text-slate-500">Цена</span>
          <span className="text-slate-300">
            по рынку ≈ <span className="num font-semibold text-white">{price.toFixed(2)}</span> ₽
          </span>
        </div>
        <Field label="Количество, USDT" right={<span className="num text-slate-500">доступно {side === 'buy' ? fmtRub(bal.rub, 2) : fmtUsdt(bal.usdt)}</span>}>
          <input
            className={cn(rInput, 'num')}
            placeholder="0.00"
            value={by === 'qty' ? qtyStr : qty > 0 ? qty.toFixed(2) : ''}
            onChange={(e) => {
              setBy('qty');
              setQtyStr(e.target.value);
            }}
          />
        </Field>
        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button key={p} type="button" onClick={() => setPct(p)} className="rounded-md border border-slate-700 py-1 text-[11px] text-slate-400 transition hover:border-[#3B82F6] hover:text-white">
              {p * 100}%
            </button>
          ))}
        </div>
        <Field label="Сумма, RUB">
          <input
            className={cn(rInput, 'num')}
            placeholder="0.00"
            value={by === 'rub' ? rubStr : rub > 0 ? rub.toFixed(2) : ''}
            onChange={(e) => {
              setBy('rub');
              setRubStr(e.target.value);
            }}
          />
        </Field>
        <div className="space-y-1 rounded-lg border border-slate-700/50 px-3 py-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Комиссия 0,1%</span>
            <span className="num text-slate-300">{side === 'buy' ? fmtUsdt(fee) : fmtRub(fee, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Вы получите ≈</span>
            <span className="num font-semibold text-white">{qty > 0 ? (side === 'buy' ? fmtUsdt(receive) : fmtRub(receive, 2)) : '—'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!(qty > 0) || insufficient}
          className={cn('w-full rounded-lg py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40', side === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600')}
        >
          {insufficient ? 'Недостаточно средств' : side === 'buy' ? 'Купить USDT' : 'Продать USDT'}
        </button>
        {res.node}
      </div>
    </Panel>
  );
}

// ───────── TON/USDT and BTC/USDT ─────────

export function CoinForm({ pair }: { pair: 'TON/USDT' | 'BTC/USDT' }) {
  const coin = pair === 'TON/USDT' ? 'TON' : 'BTC';
  const price = useGame((s) => (pair === 'TON/USDT' ? s.market.tonUsd : s.market.btcUsd));
  const held = useGame((s) => (pair === 'TON/USDT' ? s.exchanges.rapira.ton : s.exchanges.rapira.btc));
  const usdt = useGame((s) => s.exchanges.rapira.usdt);
  const spotTrade = useGame((s) => s.spotTrade);
  const [amt, setAmt] = useState('');
  const res = useResult();
  const dec = coin === 'BTC' ? 6 : 2;
  const a = parseNum(amt);
  const total = a * price;
  const trade = (side: 'buy' | 'sell') => {
    const amount = Math.floor(a * 10 ** dec) / 10 ** dec;
    if (!(amount > 0)) return res.show({ ok: false, error: `Введите количество ${coin}` });
    if (res.show(spotTrade(pair, side, amount))) setAmt('');
  };
  return (
    <Panel
      title={pair}
      icon={<span className={cn('flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black text-white', coin === 'TON' ? 'bg-[#0098EA]' : 'bg-[#F7931A]')}>{coin === 'TON' ? '◆' : '₿'}</span>}
      right={<span className="num text-sm font-bold text-white">{price.toLocaleString('ru-RU', { maximumFractionDigits: coin === 'BTC' ? 0 : 3, minimumFractionDigits: coin === 'BTC' ? 0 : 3 })}</span>}
    >
      <div className="mb-2 flex justify-between text-[11px] text-slate-500">
        <span>
          Баланс: <span className="num text-slate-300">{held.toFixed(dec)} {coin}</span>
        </span>
        <button type="button" className="text-[#60A5FA] hover:underline" onClick={() => setAmt(held > 0 ? String(Math.floor(held * 10 ** dec) / 10 ** dec) : '')}>
          Всё
        </button>
      </div>
      <input className={cn(rInput, 'num')} placeholder={`Количество, ${coin}`} value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>≈ {fmtUsdt(total)}</span>
        <span>
          USDT: <span className="num text-slate-300">{fmtUsdt(usdt, false)}</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => trade('buy')} className="rounded-lg bg-emerald-500/90 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
          Купить
        </button>
        <button type="button" onClick={() => trade('sell')} className="rounded-lg bg-rose-500/90 py-1.5 text-xs font-bold text-white hover:bg-rose-500">
          Продать
        </button>
      </div>
      {res.node && <div className="mt-2">{res.node}</div>}
    </Panel>
  );
}

// ───────── balances ─────────

export function Balances() {
  const b = useGame(
    useShallow((s) => ({
      rub: s.exchanges.rapira.rub,
      usdt: s.exchanges.rapira.usdt,
      frozen: s.exchanges.rapira.frozen,
      ton: s.exchanges.rapira.ton,
      btc: s.exchanges.rapira.btc,
      tonUsd: s.market.tonUsd,
      btcUsd: s.market.btcUsd,
    })),
  );
  const q = useQuote();
  const rows = [
    { sym: 'RUB', name: 'Российский рубль', qty: fmtRub(b.rub, 2), rub: b.rub, color: '#3B82F6', glyph: '₽' },
    { sym: 'USDT', name: 'Tether', qty: fmtUsdt(b.usdt + b.frozen, false), rub: (b.usdt + b.frozen) * q.bid, color: '#26A17B', glyph: '₮' },
    { sym: 'TON', name: 'Toncoin', qty: b.ton.toFixed(4), rub: b.ton * b.tonUsd * q.bid, color: '#0098EA', glyph: '◆' },
    { sym: 'BTC', name: 'Bitcoin', qty: b.btc.toFixed(6), rub: b.btc * b.btcUsd * q.bid, color: '#F7931A', glyph: '₿' },
  ];
  const total = rows.reduce((s, r) => s + r.rub, 0);
  return (
    <Panel title="Баланс" icon={<Wallet size={15} />} right={<span className="num text-xs font-semibold text-white">≈ {fmtRub(total)}</span>} bodyClass="p-0">
      <ul className="divide-y divide-slate-700/40">
        {rows.map((r) => (
          <li key={r.sym} className="flex items-center gap-2.5 px-4 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: r.color }}>
              {r.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-100">{r.sym}</div>
              <div className="truncate text-[10px] text-slate-500">{r.name}</div>
            </div>
            <div className="text-right">
              <div className="num text-xs text-slate-100">{r.qty}</div>
              <div className="num text-[10px] text-slate-500">≈ {fmtRub(r.rub)}</div>
            </div>
          </li>
        ))}
      </ul>
      {b.frozen > 0 && <div className="border-t border-slate-700/40 px-4 py-1.5 text-[10px] text-slate-500">в т.ч. в ордерах: {fmtUsdt(b.frozen)}</div>}
    </Panel>
  );
}
