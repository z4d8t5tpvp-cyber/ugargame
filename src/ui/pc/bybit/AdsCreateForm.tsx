import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Megaphone, RefreshCw, X } from 'lucide-react';
import { useGame } from '../../../game/store';
import { adFillRate, bestPrice, MAKER_FEE } from '../../../game/engine/market';
import type { BankId, MyAd } from '../../../game/types';
import { BANK_NAMES, fmtPrice, fmtRub, fmtUsdt, round2 } from '../../../game/util';
import { cn, parseNum, useResult } from '../../common/kit';
import { btnGhost, btnPrimary, Callout, Card, inputCls, Label, PLAYER_BANKS, Row } from './AssetsKit';

type Side = 'sell' | 'buy';

/** Bybit only accepts ad prices within a band around the market (UI-side guard). */
export const priceBand = (base: number) => [round2(base * 0.9), round2(base * 1.1)] as const;

/** Expected wait (game minutes) until the first counterparty for a given fill rate. */
export function SpeedMeter({ rate, compact }: { rate: number; compact?: boolean }) {
  const lvl = rate >= 0.18 ? 3 : rate >= 0.05 ? 2 : 1;
  const label = lvl === 3 ? 'Быстро' : lvl === 2 ? 'Средне' : 'Медленно';
  const color = lvl === 3 ? 'bg-emerald' : lvl === 2 ? 'bg-amber' : 'bg-rose';
  const text = lvl === 3 ? 'text-emerald' : lvl === 2 ? 'text-amber' : 'text-rose';
  const wait = rate > 0 ? Math.max(1, Math.round(1 / rate)) : null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="flex items-end gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('w-1 rounded-sm', i <= lvl ? color : 'bg-white/15')} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      <span className={cn('font-semibold', text)}>{label}</span>
      {!compact && <span className="num text-white/40">{wait === null ? '· покупателей не будет' : wait > 90 ? '· дольше часа' : `· ≈ ${wait} мин до ордера`}</span>}
    </span>
  );
}

const BANK_DOT: Record<BankId, string> = { sber: 'bg-[#21A038]', tbank: 'bg-[#FFDD2D]', alfa: 'bg-[#EF3124]' };
const STATUS_NOTE: Record<string, string> = { cooling: 'пауза по переводам', request115: 'запрос 115-ФЗ', restricted115: 'ограничен' };

export function AdsCreateForm({ onCreated, onCancel }: { onCreated: (side: Side) => void; onCancel?: () => void }) {
  const createAd = useGame((s) => s.createAd);
  const setView = useGame((s) => s.setBybitView);
  const usdt = useGame((s) => s.exchanges.bybit.usdt);
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  const avg = useGame((s) => s.book.avg);
  const bookQty = useGame((s) => s.book.qty);
  const base = useGame((s) => round2(s.market.base));
  const bestAsk = useGame((s) => bestPrice(s, 'bybit', 'sell', true));
  const bestBid = useGame((s) => bestPrice(s, 'bybit', 'buy', true));
  const opened = useGame(useShallow((s) => PLAYER_BANKS.filter((b) => s.banks[b].opened)));
  const statuses = useGame(useShallow((s) => PLAYER_BANKS.map((b) => s.banks[b].status)));
  const rubOnBanks = useGame((s) => Math.floor(PLAYER_BANKS.reduce((a, b) => a + (s.banks[b].opened ? s.banks[b].balance : 0), 0)));
  const sideCount = useGame(useShallow((s) => [s.exchanges.bybit.ads.filter((a) => a.side === 'sell').length, s.exchanges.bybit.ads.filter((a) => a.side === 'buy').length]));

  const [side, setSide] = useState<Side>('sell');
  const [price, setPrice] = useState(() => fmtPrice(bestPrice(useGame.getState(), 'bybit', 'sell', true)));
  const [total, setTotal] = useState('');
  const [minRub, setMinRub] = useState('5000');
  const [maxRub, setMaxRub] = useState(''); // empty = derived from volume
  const [banks, setBanks] = useState<BankId[]>(() => {
    const s = useGame.getState();
    const open = PLAYER_BANKS.filter((b) => s.banks[b].opened);
    const ok = open.filter((b) => s.banks[b].status === 'active');
    return ok.length ? ok : open;
  });
  const res = useResult();

  const best = side === 'sell' ? bestAsk : bestBid;
  const p = parseNum(price);
  const t = parseNum(total);
  const mn = parseNum(minRub);
  const sellable = side === 'sell' ? t / (1 + MAKER_FEE) : t;
  const autoMax = Math.floor(sellable * p);
  const mx = maxRub.trim() === '' ? autoMax : parseNum(maxRub);
  const [lo, hi] = priceBand(base);

  const draft: MyAd = { id: 'draft', exchange: 'bybit', side, price: p, totalUsdt: t, remainingUsdt: t, minRub: mn, maxRub: mx, banks, active: true, createdAt: 0 };
  const rate = useGame((s) => (p > 0 ? Math.round(adFillRate(s, draft) * 1000) / 1000 : 0));
  const premium = best > 0 && p > 0 ? (side === 'sell' ? (p - best) / best : (best - p) / best) * 100 : 0;

  // Sell: the ad reserves the maker fee on top of what buyers receive.
  const rubOut = sellable * p;
  const feeUsdt = side === 'sell' ? t - sellable : t * MAKER_FEE;
  const cost = t * avg;
  const profit = rubOut - cost;
  const markup = avg > 0 && p > 0 ? (p / avg - 1) * 100 : 0;

  const switchSide = (v: Side) => {
    if (v === side) return;
    setSide(v);
    setPrice(fmtPrice(v === 'sell' ? bestAsk : bestBid));
    setTotal('');
    setMaxRub('');
    res.clear();
  };

  const validate = (): string | null => {
    if (!opened.length) return 'Нет открытых банковских счетов для приёма оплаты';
    if (!(p > 0)) return 'Укажите цену за 1 USDT';
    if (p < lo || p > hi) return `Цена вне допустимого диапазона ${fmtPrice(lo)}–${fmtPrice(hi)} ₽`;
    if (!(t > 0)) return 'Укажите объём USDT';
    if (side === 'sell' && t > usdt + 1e-9) return `Недостаточно USDT. Доступно ${fmtUsdt(usdt)}`;
    if (mn < 500) return 'Минимальная сумма сделки — от 500 ₽';
    if (mx < mn) return 'Максимальный лимит меньше минимального';
    if (sellable * p < mn) return 'Объём меньше минимального лимита сделки — уменьшите минимум или увеличьте объём';
    if (!banks.length) return 'Выберите хотя бы один банк';
    if (sideCount[side === 'sell' ? 0 : 1] >= 2) return 'Максимум 2 объявления на каждую сторону';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) return res.show({ ok: false, error: err });
    const r = createAd({ side, price: round2(p), totalUsdt: round2(t), minRub: Math.round(mn), maxRub: Math.round(mx), banks });
    if (!r.ok) return res.show(r);
    setTotal('');
    setMaxRub('');
    onCreated(side);
  };

  const toggleBank = (b: BankId) => setBanks((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));

  return (
    <Card
      title="Создать объявление"
      icon={<Megaphone size={16} />}
      right={
        onCancel && (
          <button type="button" className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white" onClick={onCancel} title="Закрыть">
            <X size={15} />
          </button>
        )
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-bybit-3/70 p-1">
        {(['sell', 'buy'] as Side[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => switchSide(v)}
            className={cn(
              'rounded-md py-2 text-sm font-semibold transition',
              side === v ? (v === 'sell' ? 'bg-rose text-white' : 'bg-emerald text-black') : 'text-white/50 hover:text-white/80',
            )}
          >
            {v === 'sell' ? 'Продать USDT' : 'Купить USDT'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {/* price */}
          <div>
            <Label right={`допустимо ${fmtPrice(lo)}–${fmtPrice(hi)} ₽`}>Цена за 1 USDT</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input className={cn(inputCls, 'num pr-8 text-base font-semibold')} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">₽</span>
              </div>
              <button type="button" className={btnGhost} onClick={() => setPrice(fmtPrice(best))} title="Подставить лучшую цену стакана">
                <RefreshCw size={13} /> По рынку
              </button>
            </div>
            <div className="mt-2 space-y-0.5 rounded-lg bg-bybit-3/40 px-3 py-2">
              <Row label={side === 'sell' ? 'Лучшая цена продавцов в стакане' : 'Лучшая цена покупателей в стакане'}>{fmtPrice(best)} ₽</Row>
              {side === 'sell' && bookQty > 0 && (
                <Row label="Ваша средняя цена покупки">
                  {fmtPrice(avg)} ₽{' '}
                  {p > 0 && <span className={cn('ml-1', markup >= 0.3 ? 'text-emerald' : markup >= 0 ? 'text-amber' : 'text-rose')}>({markup >= 0 ? '+' : ''}{markup.toFixed(2)}%)</span>}
                </Row>
              )}
              <Row label="Скорость исполнения">
                <SpeedMeter rate={rate} />
              </Row>
              {p > 0 && Math.abs(premium) >= 0.005 && (
                <p className={cn('pt-0.5 text-[11px]', premium > 0 ? 'text-white/40' : 'text-emerald/80')}>
                  {premium > 0
                    ? `Ваша цена хуже лучшей на ${premium.toFixed(2)}% — ${side === 'sell' ? 'покупатели сначала выберут дешевле' : 'продавцы сначала пойдут к тем, кто платит больше'}.`
                    : `Ваша цена лучше рынка на ${(-premium).toFixed(2)}% — объявление окажется наверху.`}
                </p>
              )}
            </div>
          </div>

          {/* volume */}
          <div>
            <Label right={side === 'sell' ? <span className="num">Доступно: {fmtUsdt(usdt)}</span> : <span className="num">На счетах: {fmtRub(rubOnBanks)}</span>}>Объём объявления</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input className={cn(inputCls, 'num pr-14')} inputMode="decimal" placeholder="0.00" value={total} onChange={(e) => setTotal(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">USDT</span>
              </div>
              {side === 'sell' && (
                <button type="button" className={btnGhost} onClick={() => setTotal((Math.floor(usdt * 100) / 100).toFixed(2))}>
                  Макс
                </button>
              )}
            </div>
          </div>

          {/* limits */}
          <div>
            <Label>Лимиты одной сделки</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input className={cn(inputCls, 'num pr-8')} inputMode="numeric" value={minRub} onChange={(e) => setMinRub(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">₽</span>
              </div>
              <span className="text-white/30">—</span>
              <div className="relative flex-1">
                <input className={cn(inputCls, 'num pr-8')} inputMode="numeric" placeholder={autoMax > 0 ? String(autoMax) : 'макс.'} value={maxRub} onChange={(e) => setMaxRub(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">₽</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-white/35">Если максимум не указан — весь объём. Минимум больше 50 000 ₽ отпугивает часть покупателей.</p>
          </div>

          {/* banks */}
          <div>
            <Label>{side === 'sell' ? 'Банки для приёма оплаты' : 'Банки, с которых вы платите'}</Label>
            {opened.length === 0 ? (
              <p className="text-xs text-rose">Откройте счёт в банке на телефоне.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {opened.map((b) => {
                  const on = banks.includes(b);
                  const st = statuses[PLAYER_BANKS.indexOf(b)];
                  return (
                    <label
                      key={b}
                      className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition', on ? 'border-amber/50 bg-amber/[0.08] text-white' : 'border-white/10 text-white/55 hover:border-white/20')}
                    >
                      <input type="checkbox" className="accent-[#F0B90B]" checked={on} onChange={() => toggleBank(b)} />
                      <span className={cn('h-2 w-2 rounded-full', BANK_DOT[b])} />
                      {BANK_NAMES[b]}
                      {st !== 'active' && <span className="rounded bg-rose/15 px-1 text-[10px] text-rose">{STATUS_NOTE[st] ?? 'ограничения'}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* summary */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-bybit-3/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40">Итог по объявлению</div>
          {!(t > 0 && p > 0) ? (
            <p className="py-3 text-center text-xs text-white/35">Укажите цену и объём — здесь появится расчёт выручки, комиссии и прибыли.</p>
          ) : side === 'sell' ? (
            <div>
              <Row label="Получите ≈">
                <span className="text-sm font-semibold text-white">{fmtRub(rubOut)}</span>
              </Row>
              <Row label="Комиссия мейкера 0,19%">
                ≈ {fmtRub(feeUsdt * p)} <span className="text-white/40">({fmtUsdt(feeUsdt)})</span>
              </Row>
              {bookQty > 0 && avg > 0 && (
                <>
                  <Row label="Себестоимость USDT">≈ {fmtRub(cost)}</Row>
                  <Row label="Прибыль к себестоимости" className="border-t border-white/[0.06] pt-1.5">
                    <span className={cn('text-sm font-semibold', profit >= 0 ? 'text-emerald' : 'text-rose')}>
                      ≈ {profit >= 0 ? '+' : '−'}
                      {fmtRub(Math.abs(profit))}
                    </span>
                  </Row>
                </>
              )}
            </div>
          ) : (
            <div>
              <Row label="Заплатите ≈">
                <span className="text-sm font-semibold text-white">{fmtRub(t * p)}</span>
              </Row>
              <Row label="Получите ≈">
                <span className="text-sm font-semibold text-emerald">{fmtUsdt(t * (1 - MAKER_FEE))}</span>
              </Row>
              <Row label="Комиссия мейкера 0,19%">≈ {fmtUsdt(feeUsdt)}</Row>
              {t * p > rubOnBanks && t > 0 && <p className="pt-1 text-[11px] text-amber">На счетах меньше, чем нужно на весь объём — продавцы могут прийти одновременно.</p>}
            </div>
          )}

          {side === 'sell' && t > 0 && bookQty > 0 && profit < 0 && <Callout tone="danger">Цена ниже вашей себестоимости с учётом комиссии — продажа уйдёт в минус.</Callout>}
          {side === 'sell' && !twoFA && (
            <Callout
              tone="warn"
              action={
                <button type="button" className="text-xs font-semibold underline" onClick={() => setView('profile')}>
                  Профиль
                </button>
              }
            >
              Для продажи нужен Google Authenticator — без кода нельзя отпустить USDT.
            </Callout>
          )}

          <p className="text-[11px] leading-relaxed text-white/40">
            Когда кто-то откроет сделку по объявлению, ордер появится в «Мои ордера»; для продажи — проверьте выписку перед тем, как отпустить.
          </p>
          <div className="mt-auto space-y-2">
            {res.node}
            <button type="button" className={cn(btnPrimary, 'w-full py-2.5')} onClick={submit}>
              Опубликовать объявление
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
