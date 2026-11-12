import { useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Delete, Wand2 } from 'lucide-react';
import { useGame } from '../../game/store';
import { MAKER_FEE, bestPrice } from '../../game/engine/market';
import { fmtNum, fmtRub } from '../../game/util';
import { CopyBtn, cn, parseNum } from '../common/kit';

export default function CalcApp() {
  const [tab, setTab] = useState<'spread' | 'basic'>('spread');
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1B1F27] text-white/90">
      <div className="flex shrink-0 gap-1 border-b border-white/5 p-1.5">
        {(
          [
            ['spread', 'Спред'],
            ['basic', 'Обычный'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn('flex-1 rounded-md py-1.5 text-xs font-semibold transition', tab === id ? 'bg-emerald-500/15 text-emerald-300' : 'text-white/50 hover:bg-white/5 hover:text-white/80')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'spread' ? <Spread /> : <Basic />}
    </div>
  );
}

// ───────── spread calculator ─────────

const book = () => {
  const s = useGame.getState();
  return { buy: bestPrice(s, 'bybit', 'sell', true), sell: bestPrice(s, 'bybit', 'buy', true) };
};

function Spread() {
  const [v, setV] = useState(() => {
    const b = book();
    return { sum: '10000', buy: b.buy.toFixed(2), sell: b.sell.toFixed(2), fee: String(MAKER_FEE * 100), sbp: '0' };
  });
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const sum = parseNum(v.sum);
  const buy = parseNum(v.buy);
  const sell = parseNum(v.sell);
  const fee = parseNum(v.fee) / 100;
  const sbp = parseNum(v.sbp);
  const qty = buy > 0 ? sum / buy : 0;
  const revenue = qty * (1 - fee) * sell - sbp;
  const profit = revenue - sum;
  const pct = sum > 0 ? (profit / sum) * 100 : 0;
  const spread = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const breakeven = qty > 0 ? (sum + sbp) / (qty * (1 - fee)) : 0;

  return (
    <div className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
      <Inp label="Сумма, ₽" value={v.sum} onChange={set('sum')} />
      <div className="grid grid-cols-2 gap-2">
        <Inp label="Цена покупки" value={v.buy} onChange={set('buy')} />
        <Inp label="Цена продажи" value={v.sell} onChange={set('sell')} />
        <Inp label="Комиссия мейкера, %" value={v.fee} onChange={set('fee')} />
        <Inp label="Комиссия СБП, ₽" value={v.sbp} onChange={set('sbp')} />
      </div>
      <button
        type="button"
        onClick={() => {
          const b = book();
          setV((s) => ({ ...s, buy: b.buy.toFixed(2), sell: b.sell.toFixed(2) }));
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-amber/30 bg-amber/10 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/20"
      >
        <Wand2 size={13} /> Подставить из стакана
      </button>
      <div className="space-y-1.5 rounded-lg bg-black/25 p-3 text-xs">
        <Res label="Куплю USDT">
          <span className="num">{fmtNum(qty, 2)}</span>
          <CopyBtn value={qty.toFixed(2)} kind="amount" label="Количество USDT" className="!px-1" title="Скопировать количество">
            <></>
          </CopyBtn>
        </Res>
        <Res label="Выручка">{fmtRub(revenue, 2)}</Res>
        <Res label="Спред / безубыток">
          <span className={cn('num', spread > 0 ? 'text-emerald' : 'text-rose')}>{fmtNum(spread, 2)}%</span>
          <span className="text-white/35">·</span>
          <span className="num">{breakeven ? breakeven.toFixed(2) : '—'}</span>
        </Res>
        <div className="mt-1 border-t border-white/10 pt-2">
          <div className="text-[10px] text-white/45">Прибыль за круг</div>
          <div className={cn('num text-xl font-bold', profit >= 0 ? 'text-emerald' : 'text-rose')}>
            {profit >= 0 ? '+' : '−'}
            {fmtRub(Math.abs(profit), 2)}
          </div>
          <div className={cn('num text-xs', profit >= 0 ? 'text-emerald/80' : 'text-rose/80')}>
            {pct >= 0 ? '+' : ''}
            {fmtNum(pct, 3)}% к сумме
          </div>
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-white/35">Без налога и газа сети. Полный цикл — в финмодели Карима.</p>
    </div>
  );
}

function Inp({ label, value, onChange }: { label: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-white/45">{label}</span>
      <input value={value} onChange={onChange} inputMode="decimal" className="num w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald/50" />
    </label>
  );
}

function Res({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/50">{label}</span>
      <span className="flex items-center gap-1 text-white/90">{children}</span>
    </div>
  );
}

// ───────── basic calculator ─────────

type Op = '+' | '−' | '×' | '÷';

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return 'Ошибка';
  const s = String(Number(n.toPrecision(12)));
  return s.length > 16 ? n.toExponential(8) : s;
};
const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b);

const opCls = 'bg-white/[0.04] text-emerald hover:bg-white/[0.1]';

function K({ label, onClick, cls, span }: { label: ReactNode; onClick: () => void; cls?: string; span?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-center justify-center rounded-md text-base font-medium transition active:scale-95', cls ?? 'bg-white/[0.07] hover:bg-white/[0.12]', span)}>
      {label}
    </button>
  );
}

function Basic() {
  const [st, setSt] = useState({ display: '0', acc: null as number | null, op: null as Op | null, fresh: false, hist: '' });
  const error = st.display === 'Ошибка';

  const digit = (d: string) =>
    setSt((s) => {
      if (s.fresh || s.display === 'Ошибка') return { ...s, display: d === '.' ? '0.' : d, fresh: false, hist: s.op ? s.hist : '' };
      if (d === '.' && s.display.includes('.')) return s;
      if (s.display.replace(/[-.]/g, '').length >= 15) return s;
      return { ...s, display: s.display === '0' && d !== '.' ? d : s.display + d };
    });
  const operator = (o: Op) =>
    setSt((s) => {
      if (s.display === 'Ошибка') return s;
      const cur = parseFloat(s.display);
      const acc = s.acc !== null && s.op && !s.fresh ? apply(s.acc, s.op, cur) : s.acc !== null && s.fresh ? s.acc : cur;
      return { display: fmt(acc), acc, op: o, fresh: true, hist: `${fmt(acc)} ${o}` };
    });
  const equals = () =>
    setSt((s) => {
      if (s.acc === null || !s.op) return s;
      const cur = parseFloat(s.display);
      const r = apply(s.acc, s.op, cur);
      return { display: fmt(r), acc: null, op: null, fresh: true, hist: `${fmt(s.acc)} ${s.op} ${fmt(cur)} =` };
    });
  const clear = () => setSt({ display: '0', acc: null, op: null, fresh: false, hist: '' });
  const back = () => setSt((s) => (s.fresh || s.display === 'Ошибка' ? s : { ...s, display: s.display.length > 1 && s.display !== '-0' ? s.display.slice(0, -1).replace(/^-$/, '0') : '0' }));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    if (/^\d$/.test(k)) digit(k);
    else if (k === '.' || k === ',') digit('.');
    else if (k === '+') operator('+');
    else if (k === '-') operator('−');
    else if (k === '*') operator('×');
    else if (k === '/') operator('÷');
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') back();
    else if (k === 'Escape' || k === 'Delete') clear();
    else return;
    e.preventDefault();
  };

  const shown = error ? 'Деление на ноль невозможно' : st.display.replace('.', ',');

  return (
    <div tabIndex={0} onKeyDown={onKey} className="flex min-h-0 flex-1 flex-col p-2 outline-none">
      <div className="mb-2 shrink-0 rounded-lg bg-black/30 px-3 py-2 text-right">
        <div className="num h-4 truncate text-[11px] text-white/40">{st.hist}</div>
        <div className={cn('num truncate font-semibold', error ? 'text-sm text-rose' : shown.length > 12 ? 'text-xl' : 'text-3xl')}>{shown}</div>
        <div className="mt-0.5 flex justify-end">
          <CopyBtn value={error ? '0' : st.display} kind="amount" label="Калькулятор" className="!text-[10px] !text-white/50 hover:!text-amber" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-5 gap-1">
        <K label="C" onClick={clear} cls="bg-rose/15 text-rose hover:bg-rose/25" />
        <K label={<Delete size={17} />} onClick={back} cls={opCls} />
        <K label="÷" onClick={() => operator('÷')} cls={opCls} />
        <K label="×" onClick={() => operator('×')} cls={opCls} />
        <K label="7" onClick={() => digit('7')} />
        <K label="8" onClick={() => digit('8')} />
        <K label="9" onClick={() => digit('9')} />
        <K label="−" onClick={() => operator('−')} cls={opCls} />
        <K label="4" onClick={() => digit('4')} />
        <K label="5" onClick={() => digit('5')} />
        <K label="6" onClick={() => digit('6')} />
        <K label="+" onClick={() => operator('+')} cls={opCls} />
        <K label="1" onClick={() => digit('1')} />
        <K label="2" onClick={() => digit('2')} />
        <K label="3" onClick={() => digit('3')} />
        <K label="=" onClick={equals} cls="row-span-2 bg-emerald text-black hover:brightness-110" />
        <K label="0" onClick={() => digit('0')} span="col-span-2" />
        <K label="," onClick={() => digit('.')} />
      </div>
    </div>
  );
}
