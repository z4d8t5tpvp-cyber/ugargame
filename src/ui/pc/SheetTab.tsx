import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Lock } from 'lucide-react';
import { useGame } from '../../game/store';
import type { BankId, LedgerEntry } from '../../game/types';
import { PROFIT_KINDS, netWorth, taxRate } from '../../game/engine/core';
import { accountingQuality } from '../../game/story/chapters';
import { BANKS, CHARACTERS } from '../../game/data/static';
import { fmtNum, fmtRub, shortDT } from '../../game/util';
import { cn, parseNum } from '../common/kit';
import { FormulaBar, Grid, SheetHeader, SheetTabs, SheetToolbar, cellText, colName, type Cell, type Col, type Sel } from './parts/sheetUi';

type SheetId = 'unit' | 'capital' | 'journal' | 'calc';
const TABS: { id: SheetId; label: string }[] = [
  { id: 'unit', label: 'Юнит-экономика' },
  { id: 'capital', label: 'Капитал' },
  { id: 'journal', label: 'Журнал' },
  { id: 'calc', label: 'Калькулятор цикла' },
];

export default function SheetTab() {
  const unlocked = useGame((s) => !!s.flags.sheetUnlocked);
  const markSheetOpened = useGame((s) => s.markSheetOpened);
  const [tab, setTab] = useState<SheetId>('unit');
  useEffect(() => {
    if (unlocked) markSheetOpened();
  }, [unlocked, markSheetOpened]);

  if (!unlocked) return <NoAccess />;

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#F9FBFD] text-[#1F1F1F]">
      <SheetHeader title="Финмодель Карима и Марата KMI" />
      <SheetToolbar />
      {tab === 'unit' && <UnitSheet key="unit" />}
      {tab === 'capital' && <CapitalSheet key="capital" />}
      {tab === 'journal' && <JournalSheet key="journal" />}
      {tab === 'calc' && <CalcSheet key="calc" />}
      <SheetTabs tabs={TABS} active={tab} onChange={setTab} />
    </div>
  );
}

// ───────── shared body: formula bar + grid with keyboard navigation ─────────

function SheetBody({ cols, rows, minRows, initial = { r: 1, c: 1 } }: { cols: Col[]; rows: Cell[][]; minRows?: number; initial?: Sel }) {
  const [sel, setSel] = useState<Sel>(initial);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return;
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Enter: [1, 0], Tab: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    setSel((s) => ({ r: Math.max(0, s.r + d[0]), c: Math.max(0, Math.min(cols.length + 1, s.c + d[1])) }));
  };
  return (
    <>
      <FormulaBar cellRef={`${colName(sel.c)}${sel.r + 1}`} text={cellText(rows[sel.r]?.[sel.c])} />
      <div tabIndex={0} onKeyDown={onKey} className="scroll-thin scroll-light min-h-0 flex-1 overflow-auto bg-white outline-none">
        <Grid cols={cols} rows={rows} sel={sel} onSel={setSel} minRows={minRows} />
      </div>
    </>
  );
}

const RED = 'text-[#D93025]';
const GREEN = 'text-[#188038]';
const HEAD: Partial<Cell> = { cls: 'font-bold', bg: '#F1F3F4' };

function money(n: number | null, f: string, extra?: string): Cell {
  if (n === null) return { v: '', f: '' };
  return { v: fmtRub(n, 2), f, align: 'right', cls: cn('num', n < 0 && RED, extra) };
}
const text = (v: string, extra?: Partial<Cell>): Cell => ({ v, ...extra });

// ───────── Юнит-экономика ─────────

interface Agg {
  turnover: number;
  margin: number;
  sbp: number;
  maker: number;
  gas: number;
  loss: number;
  pnl: number;
}

function aggregate(ledger: LedgerEntry[], from: number): Agg {
  const a: Agg = { turnover: 0, margin: 0, sbp: 0, maker: 0, gas: 0, loss: 0, pnl: 0 };
  for (const l of ledger) {
    if (l.at < from) continue;
    a.turnover += l.turnover;
    if (l.kind === 'p2p_sell' || l.kind === 'spot' || l.kind === 'otc') a.margin += l.rub;
    else if (l.kind === 'fee_sbp') a.sbp += l.rub;
    else if (l.kind === 'fee_maker' || l.kind === 'fee_spot') a.maker += l.rub;
    else if (l.kind === 'gas') a.gas += l.rub;
    else if (l.kind === 'loss') a.loss += l.rub;
    if (PROFIT_KINDS.includes(l.kind)) a.pnl += l.rub;
  }
  return a;
}

function UnitSheet() {
  const ledger = useGame((s) => s.ledger);
  const chapterStart = useGame((s) => s.chapterStartedAt);
  const chapter = useGame((s) => s.chapter);
  const dayStart = useGame((s) => Math.floor(s.now / 1440) * 1440);
  const rate = useGame((s) => taxRate(s));
  const paid = useGame((s) => s.tax.paidTotal);

  const rows = useMemo(() => {
    const periods = [aggregate(ledger, 0), aggregate(ledger, chapterStart), aggregate(ledger, dayStart)];
    const crit = ['', ';Журнал!A:A;">="&НАЧАЛО_ГЛАВЫ', ';Журнал!A:A;">="&СЕГОДНЯ()'];
    const pct = Math.round(rate * 100);
    const sumif = (types: string, i: number) => `=СУММЕСЛИМН(Журнал!E:E;Журнал!B:B;${types}${crit[i]})`;
    const line = (label: string, pick: (a: Agg) => number, formula: (i: number, col: string) => string, note: string, opts?: { bold?: boolean }): Cell[] => [
      text(label, { cls: opts?.bold ? 'font-semibold' : undefined }),
      ...periods.map((a, i) => money(pick(a), formula(i, colName(i + 1)), opts?.bold ? 'font-semibold' : undefined)),
      text(note, { cls: 'text-[#5F6368] italic' }),
    ];
    const r: Cell[][] = [
      [text('Показатель', HEAD), text('Всего', { ...HEAD, align: 'right' }), text(`Эта глава (${chapter})`, { ...HEAD, align: 'right' }), text('Сегодня', { ...HEAD, align: 'right' }), text('Комментарий Карима', HEAD)],
      line('Валовый оборот', (a) => a.turnover, (i) => (i ? `=СУММЕСЛИ(Журнал!A:A;">="&${i === 1 ? 'НАЧАЛО_ГЛАВЫ' : 'СЕГОДНЯ()'};Журнал!D:D)` : '=СУММ(Журнал!D:D)'), 'Оборот ≠ прибыль. Банк смотрит на оборот, мы — на маржу'),
      line('Валовая маржа сделок', (a) => a.margin, (i) => sumif('{"Продажа USDT";"Спот";"OTC"}', i), 'Цена продажи минус себестоимость USDT'),
      line('Комиссия СБП', (a) => a.sbp, (i) => sumif('"Комиссия СБП"', i), 'Платим сверх бесплатного лимита банка'),
      line('Комиссия мейкера/тейкера', (a) => a.maker, (i) => sumif('{"Комиссия мейкера";"Комиссия спота"}', i), 'Мейкер Bybit 0,19%, спот Rapira 0,1%'),
      line('Газ сети TRC20/TON', (a) => a.gas, (i) => sumif('"Газ / вывод"', i), 'TRC-20 = 1,5 USDT, TON = 0,15 USDT за вывод'),
      line('Потери: мошенники и заморозки', (a) => a.loss, (i) => sumif('"Потеря"', i), 'Один скам съедает недели маржи'),
      line('PnL до налога', (a) => a.pnl, (_, c) => `=СУММ(${c}3:${c}7)`, 'Маржа минус все издержки', { bold: true }),
      line(`Резерв под налог (${pct}%)`, (a) => -Math.max(0, a.pnl) * rate, (_, c) => `=-МАКС(0;${c}8)*${pct}%`, 'Правило №6: резерв — святое'),
    ];
    const net = periods.map((a) => a.pnl - Math.max(0, a.pnl) * rate);
    r.push([
      text('Чистая прибыль', { cls: 'font-bold', bg: net[0] >= 0 ? '#E6F4EA' : '#FCE8E6' }),
      ...net.map((n, i) => ({ ...money(n, `=${colName(i + 1)}8+${colName(i + 1)}9`, cn('font-bold', n >= 0 ? GREEN : RED)), bg: n >= 0 ? '#E6F4EA' : '#FCE8E6' })),
      text('← Вот это твои деньги. Не оборот.', { cls: 'font-semibold text-[#188038]', bg: net[0] >= 0 ? '#E6F4EA' : '#FCE8E6' }),
    ]);
    r.push([text('Уплачено налогов'), money(paid, '=СУММ(Налоги!B:B)'), money(null, ''), money(null, ''), text('Через ИП / 3-НДФЛ на Госуслугах', { cls: 'text-[#5F6368] italic' })]);
    r.push([
      text('Маржинальность, % от оборота'),
      ...periods.map((a, i) => {
        const m = a.turnover ? (a.pnl / a.turnover) * 100 : 0;
        return { v: `${fmtNum(m, 2)}%`, f: `=ЕСЛИОШИБКА(${colName(i + 1)}8/${colName(i + 1)}2;0)`, align: 'right' as const, cls: cn('num', m < 0 && RED) };
      }),
      text('Норма для P2P: 0,3–0,8%', { cls: 'text-[#5F6368] italic' }),
    ]);
    r.push([]);
    r.push([text('📌 Карим: «Если строка 10 красная — ты работаешь бесплатно на банк, биржу и мошенников»', { span: 5, cls: 'text-[#5F6368]', bg: '#FEF7E0' })]);
    return r;
  }, [ledger, chapterStart, dayStart, rate, paid, chapter]);

  return <SheetBody cols={[{ w: 250 }, { w: 125 }, { w: 125 }, { w: 125 }, { w: 330 }]} rows={rows} />;
}

// ───────── Капитал ─────────

const BANK_IDS: BankId[] = ['sber', 'tbank', 'alfa'];

function CapitalSheet() {
  const banks = useGame((s) => s.banks);
  const ex = useGame((s) => s.exchanges);
  const wallet = useGame((s) => s.wallet);
  const chain = useGame((s) => s.chain);
  const obligations = useGame((s) => s.obligations);
  const base = useGame((s) => s.market.base);
  const tonUsd = useGame((s) => s.market.tonUsd);
  const btcUsd = useGame((s) => s.market.btcUsd);
  const book = useGame((s) => s.book);
  const worth = useGame((s) => netWorth(s));
  const quality = useGame((s) => accountingQuality(s));

  const rows = useMemo(() => {
    const r: Cell[][] = [[text('Актив', HEAD), text('Количество', { ...HEAD, align: 'right' }), text('Курс, ₽', { ...HEAD, align: 'right' }), text('Сумма, ₽', { ...HEAD, align: 'right' }), text('Комментарий', HEAD)]];
    const section = (label: string) => r.push([text(label, { span: 5, cls: 'font-semibold text-[#0B57D0]', bg: '#E8F0FE' })]);
    const rowNo = () => r.length + 1;
    const qty = (n: number, unit: string, f?: string): Cell => ({ v: `${fmtNum(n, unit === 'BTC' ? 6 : 2)} ${unit}`, f: f ?? String(n), align: 'right', cls: 'num' });
    const price = (n: number, f?: string): Cell => ({ v: fmtNum(n, 2), f: f ?? String(n), align: 'right', cls: 'num' });

    section('Банки, RUB');
    const bankStart = rowNo();
    for (const id of BANK_IDS) {
      const b = banks[id];
      if (!b.opened) continue;
      const note = b.request?.status === 'open' ? `Запрос 115-ФЗ, заморожено ${fmtRub(b.request.frozen)}` : b.status === 'restricted115' ? 'ДБО ограничено (115-ФЗ)' : b.status === 'cooling' ? 'Пауза: банк присматривается' : 'Активна';
      r.push([text(`${BANKS[id].name} ·· ${b.card.slice(-4)}`), text(''), text(''), money(b.balance, String(b.balance)), text(note, { cls: b.status === 'active' ? 'text-[#5F6368]' : RED })]);
    }
    const bankEnd = rowNo() - 1;
    const bankSum = BANK_IDS.reduce((s, id) => s + (banks[id].opened ? banks[id].balance : 0), 0);
    r.push([text('Итого в банках', { cls: 'font-semibold' }), text(''), text(''), money(bankSum, `=СУММ(D${bankStart}:D${bankEnd})`, 'font-semibold'), text('')]);
    const bankTotalRow = rowNo() - 1;

    section(`Криптовалюта (USDT по курсу ${fmtNum(base, 2)} ₽)`);
    const cStart = rowNo();
    const by = ex.bybit;
    const ra = ex.rapira;
    const pushUsdt = (label: string, q: number, note: string) => {
      const n = rowNo();
      r.push([text(label), qty(q, 'USDT'), price(base, '=КУРС_USDT'), money(q * base, `=B${n}*C${n}`), text(note, { cls: 'text-[#5F6368]' })]);
    };
    pushUsdt('Bybit P2P: USDT', by.usdt + by.frozen, by.frozen > 0 ? `в т.ч. в эскроу и объявлениях: ${fmtNum(by.frozen, 2)} USDT` : 'Доступно для торговли');
    pushUsdt('Rapira: USDT', ra.usdt + ra.frozen, 'Спот');
    r.push([text('Rapira: RUB'), text(''), text(''), money(ra.rub, String(ra.rub)), text('Рублёвый баланс биржи', { cls: 'text-[#5F6368]' })]);
    if (ra.ton > 0) {
      const n = rowNo();
      r.push([text('Rapira: TON'), qty(ra.ton, 'TON'), price(tonUsd * base, '=КУРС_TON*КУРС_USDT'), money(ra.ton * tonUsd * base, `=B${n}*C${n}`), text('')]);
    }
    if (ra.btc > 0) {
      const n = rowNo();
      r.push([text('Rapira: BTC'), qty(ra.btc, 'BTC'), price(btcUsd * base, '=КУРС_BTC*КУРС_USDT'), money(ra.btc * btcUsd * base, `=B${n}*C${n}`), text('')]);
    }
    pushUsdt('Tonkeeper: USDT', wallet.usdtTrc20 + wallet.usdtTon, `TRC-20: ${fmtNum(wallet.usdtTrc20, 2)} · TON: ${fmtNum(wallet.usdtTon, 2)}`);
    const inFlight = chain.filter((c) => c.source !== 'otc').reduce((s, c) => s + c.amount, 0);
    if (inFlight > 0) pushUsdt('В пути (блокчейн)', inFlight, 'Переводы ещё не зачислены');
    const cEnd = rowNo() - 1;
    const cryptoSum = (by.usdt + by.frozen + ra.usdt + ra.frozen + wallet.usdtTrc20 + wallet.usdtTon + inFlight) * base + ra.rub + (ra.ton * tonUsd + ra.btc * btcUsd) * base;
    r.push([text('Итого крипта и биржи', { cls: 'font-semibold' }), text(''), text(''), money(cryptoSum, `=СУММ(D${cStart}:D${cEnd})`, 'font-semibold'), text('')]);
    const cryptoTotalRow = rowNo() - 1;

    section('Чужие деньги');
    const debts = obligations.filter((o) => !o.returned);
    const dStart = rowNo();
    for (const o of debts) {
      r.push([text(`Долг: ${CHARACTERS[o.from].name}`), text(''), text(''), money(-o.amount, String(-o.amount)), text(`${o.sharePct ? `доля ${o.sharePct}% прибыли · ` : ''}взято ${shortDT(o.takenAt)}`, { cls: 'text-[#5F6368]' })]);
    }
    const debtSum = debts.reduce((s, o) => s + o.amount, 0);
    r.push([
      text('Чужие деньги — итого', { cls: 'font-semibold' }),
      text(''),
      text(''),
      money(-debtSum, debts.length ? `=СУММ(D${dStart}:D${rowNo() - 1})` : '0', 'font-semibold'),
      text(debts.length ? 'Это не твой капитал, пока не вернёшь' : 'Заёмных денег нет', { cls: 'text-[#5F6368] italic' }),
    ]);
    const debtRow = rowNo() - 1;
    r.push([]);
    const bg = worth >= 0 ? '#E6F4EA' : '#FCE8E6';
    r.push([
      text('Чистый капитал', { cls: 'font-bold', bg }),
      text('', { bg }),
      text('', { bg }),
      { ...money(worth, `=D${bankTotalRow}+D${cryptoTotalRow}+D${debtRow}`, cn('font-bold', worth >= 0 ? GREEN : RED)), bg },
      text('Всё, что останется, если сейчас всё продать и раздать долги', { cls: 'text-[#5F6368]', bg }),
    ]);
    r.push([
      text('Средняя цена USDT (себестоимость)'),
      qty(book.qty, 'USDT'),
      price(book.avg, '=СУММ(Покупки!D:D)/СУММ(Покупки!B:B)'),
      money(book.qty * book.avg, `=B${rowNo()}*C${rowNo()}`),
      text(book.qty > 0 ? `Рынок сейчас ${fmtNum(base, 2)} — ${base >= book.avg ? 'в плюсе' : 'в минусе'} на ${fmtNum(Math.abs(base - book.avg), 2)} ₽/USDT` : 'USDT на руках нет', { cls: 'text-[#5F6368]' }),
    ]);
    r.push([
      text('Качество учёта'),
      text(''),
      text(''),
      { v: `${quality}%`, f: '=ЧЕКИ*30%+ИП*20%+ДЕКЛАРАЦИЯ*20%+БУХГАЛТЕР*15%+БЕЗ_ПРОВАЛОВ*15%', align: 'right', cls: cn('num font-semibold', quality >= 70 ? GREEN : quality >= 40 ? 'text-[#E37400]' : RED) },
      text('Чеки по каждой сделке, ИП, декларация, бухгалтер', { cls: 'text-[#5F6368]' }),
    ]);
    return r;
  }, [banks, ex, wallet, chain, obligations, base, tonUsd, btcUsd, book, worth, quality]);

  return <SheetBody cols={[{ w: 250 }, { w: 125 }, { w: 95 }, { w: 130 }, { w: 330 }]} rows={rows} initial={{ r: 1, c: 0 }} />;
}

// ───────── Журнал ─────────

const KIND_LABEL: Record<LedgerEntry['kind'], string> = {
  p2p_buy: 'Покупка USDT',
  p2p_sell: 'Продажа USDT',
  spot: 'Спот',
  otc: 'OTC',
  fee_sbp: 'Комиссия СБП',
  fee_maker: 'Комиссия мейкера',
  fee_spot: 'Комиссия спота',
  gas: 'Газ / вывод',
  loss: 'Потеря',
  income: 'Доход',
  expense: 'Расход',
  tax: 'Налог',
};

function JournalSheet() {
  const ledger = useGame((s) => s.ledger);
  const rows = useMemo(() => {
    const r: Cell[][] = [[text('Дата', HEAD), text('Тип', HEAD), text('Описание', HEAD), text('Оборот, ₽', { ...HEAD, align: 'right' }), text('P&L, ₽', { ...HEAD, align: 'right' })]];
    const last = ledger.slice(-120).reverse();
    for (const l of last) {
      r.push([
        { v: shortDT(l.at), cls: 'num text-[#5F6368]' },
        text(KIND_LABEL[l.kind], { cls: l.kind === 'loss' ? RED : undefined }),
        text(l.note),
        l.turnover ? money(l.turnover, String(l.turnover)) : { v: '', f: '' },
        l.rub ? money(l.rub, String(l.rub), l.rub > 0 ? GREEN : undefined) : { v: '—', f: '0', align: 'right', cls: 'text-[#9AA0A6]' },
      ]);
    }
    if (!last.length) r.push([text('Пока нет операций. Каждая сделка, комиссия и потеря попадут сюда автоматически.', { span: 5, cls: 'text-[#5F6368] italic' })]);
    return r;
  }, [ledger]);
  return <SheetBody cols={[{ w: 92 }, { w: 140 }, { w: 380 }, { w: 120 }, { w: 120 }]} rows={rows} minRows={30} initial={{ r: 1, c: 0 }} />;
}

// ───────── Калькулятор цикла ─────────

const NET_OPTS = [
  { v: 0, label: 'Внутри биржи — 0 USDT' },
  { v: 0.15, label: 'TON — 0,15 USDT' },
  { v: 1.5, label: 'TRC-20 — 1,5 USDT' },
];

function CalcSheet() {
  const [inp, setInp] = useState({ V: '10000', Pb: '91.00', Ps: '91.85', f1: '0', f2: '0.0019', Fin: '0', Fout: '0' });
  const [gas, setGas] = useState(0);
  const [tau, setTau] = useState(0.13);

  const V = parseNum(inp.V);
  const Pb = parseNum(inp.Pb);
  const Ps = parseNum(inp.Ps);
  const f1 = parseNum(inp.f1);
  const f2 = parseNum(inp.f2);
  const Fin = parseNum(inp.Fin);
  const Fout = parseNum(inp.Fout);
  const Q = Pb > 0 ? ((V - Fin) / Pb) * (1 - f1) : 0;
  const Qg = Math.max(0, Q - gas);
  const R = Qg * (1 - f2) * Ps - Fout;
  const PnL = R - V;
  const Tax = Math.max(0, PnL * tau);
  const Net = PnL - Tax;
  const be = Qg > 0 ? (V + Fout) / (Qg * (1 - f2)) : 0;

  const field = (k: keyof typeof inp) => (
    <input
      value={inp[k]}
      onChange={(e) => setInp((s) => ({ ...s, [k]: e.target.value }))}
      className="num h-full w-full bg-transparent text-right text-[13px] text-[#1F1F1F] outline-none"
    />
  );
  const sel = (value: number, onChange: (v: number) => void, opts: { v: number; label: string }[]) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-full w-full bg-transparent text-right text-[12px] outline-none">
      {opts.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
  const IN = '#FFF8E1';
  const param = (name: string, desc: string, k: keyof typeof inp): Cell[] => [text(name, { cls: 'font-mono' }), { input: field(k), f: inp[k], bg: IN }, text(desc, { cls: 'text-[#5F6368]' })];
  const calc = (name: string, v: string, f: string, desc: string, cls?: string, bg?: string): Cell[] => [text(name, { cls: cn('font-mono', cls), bg }), { v, f, align: 'right', cls: cn('num', cls), bg }, text(desc, { cls: 'text-[#5F6368]', bg })];
  const r2 = (n: number) => fmtRub(n, 2);

  const rows: Cell[][] = [
    [text('Параметр', HEAD), text('Значение', { ...HEAD, align: 'right' }), text('Описание / формула', HEAD)],
    param('V_RUB', 'Сумма цикла, ₽', 'V'),
    param('P_buy', 'Цена покупки USDT, ₽', 'Pb'),
    param('P_sell', 'Цена продажи USDT, ₽', 'Ps'),
    param('f_maker1', 'Комиссия при покупке (доля: 0,0019 = 0,19%)', 'f1'),
    param('f_maker2', 'Комиссия при продаже (доля)', 'f2'),
    param('F_SBP_in', 'Комиссия СБП на входе, ₽', 'Fin'),
    param('F_SBP_out', 'Комиссия СБП на выходе, ₽', 'Fout'),
    [text('gas', { cls: 'font-mono' }), { input: sel(gas, setGas, NET_OPTS), f: String(gas), bg: IN }, text('Перевод USDT между площадками', { cls: 'text-[#5F6368]' })],
    [text('τ', { cls: 'font-mono' }), { input: sel(tau, setTau, [{ v: 0.13, label: '13% (НДФЛ)' }, { v: 0.15, label: '15% (ИП УСН Д−Р)' }]), f: `${Math.round(tau * 100)}%`, bg: IN }, text('Ставка налога', { cls: 'text-[#5F6368]' })],
    [],
    calc('Q', `${fmtNum(Q, 4)} USDT`, '=(B2-B7)/B3*(1-B5)', 'Q = (V − F_in) / P_buy × (1 − f₁)'),
    calc('Q_gas', `${fmtNum(Qg, 4)} USDT`, '=МАКС(0;B12-B9)', 'Q_gas = max(0; Q − gas)'),
    calc('R', r2(R), '=B13*(1-B6)*B4-B8', 'R = Q_gas × (1 − f₂) × P_sell − F_out'),
    calc('PnL', r2(PnL), '=B14-B2', 'PnL = R − V', PnL < 0 ? RED : undefined),
    calc('Tax', r2(Tax), '=МАКС(0;B15*B10)', 'Tax = max(0; PnL × τ)'),
    calc('Net', r2(Net), '=B15-B16', 'Чистая прибыль цикла', cn('font-bold', Net >= 0 ? GREEN : RED), Net >= 0 ? '#E6F4EA' : '#FCE8E6'),
    calc('Net / V', `${fmtNum(V ? (Net / V) * 100 : 0, 3)}%`, '=ЕСЛИОШИБКА(B17/B2;0)', 'Доходность одного цикла'),
    calc('Спред', `${fmtNum(Pb ? ((Ps - Pb) / Pb) * 100 : 0, 3)}%`, '=(B4-B3)/B3', 'Грязный спред без комиссий'),
    calc('P_sell min', be ? fmtNum(be, 2) : '—', '=(B2+B8)/(B13*(1-B6))', 'Безубыточная цена продажи'),
    [],
    [text('💡 Марат: «Сначала посчитай цикл здесь, потом жми кнопку на бирже»', { span: 3, cls: 'text-[#5F6368]', bg: '#FEF7E0' })],
  ];
  return <SheetBody cols={[{ w: 120 }, { w: 170 }, { w: 380 }]} rows={rows} />;
}

// ───────── no access ─────────

function NoAccess() {
  const [sent, setSent] = useState(false);
  return (
    <div className="scroll-thin scroll-light flex h-full flex-col overflow-auto bg-white text-[#1F1F1F]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E0E0E0] px-5">
        <svg width="26" height="23" viewBox="0 0 87 78" aria-hidden>
          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA" />
          <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 0 0 0 53h27.5z" fill="#00AC47" />
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335" />
          <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D" />
          <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC" />
          <path d="M73.4 26.5L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00" />
        </svg>
        <span className="text-[19px] text-[#5F6368]">Диск</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[460px]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0FE]">
            <Lock size={28} className="text-[#0B57D0]" />
          </div>
          <h1 className="text-[26px] leading-tight">Нет доступа — запросите доступ у владельца</h1>
          <p className="mt-3 text-sm text-[#444746]">Таблица «Финмодель Карима и Марата KMI» закрыта. Попросите владельца открыть доступ или войдите в аккаунт, у которого он есть.</p>
          {sent ? (
            <div className="mt-5 rounded-lg bg-[#E6F4EA] px-4 py-3 text-sm text-[#137333]">Запрос отправлен. Вы получите письмо, когда владелец откроет доступ.</div>
          ) : (
            <>
              <textarea className="mt-5 h-24 w-full resize-none rounded-md border border-[#747775] p-3 text-sm outline-none focus:border-2 focus:border-[#0B57D0]" placeholder="Сообщение (необязательно)" />
              <button type="button" onClick={() => setSent(true)} className="mt-3 rounded-full bg-[#0B57D0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#0842A0]">
                Запросить доступ
              </button>
            </>
          )}
          <div className="mt-8 border-t border-[#E0E0E0] pt-4 text-xs text-[#5F6368]">
            Вы вошли как <span className="font-medium text-[#1F1F1F]">tema.voronov@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
