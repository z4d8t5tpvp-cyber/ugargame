import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeftRight, Clock, Info, TriangleAlert } from 'lucide-react';
import type { Ad, BankId, ExtBankId } from '../../../game/types';
import { useGame } from '../../../game/store';
import { canTrade, ORDER_MINUTES } from '../../../game/engine/orders';
import { BANK_NAMES, fmtNum, fmtPrice, fmtRub, fmtUsdt, plural } from '../../../game/util';
import { cn, parseNum, useResult } from '../../common/kit';
import { BankChip } from './OrderParts';

const PLAYER_BANKS: BankId[] = ['sber', 'tbank', 'alfa'];
const floor2 = (v: number) => Math.floor(v * 100 + 1e-6) / 100;

/** Inline "open a deal" form shown under an orderbook row. */
export default function MarketTakePanel({ ad, side, onClose }: { ad: Ad; side: 'buy' | 'sell'; onClose: () => void }) {
  const acc = useGame(
    useShallow((s) => ({
      usdt: s.exchanges.bybit.usdt,
      sber: s.banks.sber.opened,
      tbank: s.banks.tbank.opened,
      alfa: s.banks.alfa.opened,
      sberBal: s.banks.sber.balance,
      tbankBal: s.banks.tbank.balance,
      alfaBal: s.banks.alfa.balance,
      difficulty: s.difficulty,
    })),
  );
  const block = useGame((s) => canTrade(s, side));
  const takeAd = useGame((s) => s.takeAd);
  const focusOrder = useGame((s) => s.focusOrder);
  const setView = useGame((s) => s.setBybitView);
  const res = useResult();

  const opened: Record<BankId, boolean> = { sber: acc.sber, tbank: acc.tbank, alfa: acc.alfa };
  const balance: Record<BankId, number> = { sber: acc.sberBal, tbank: acc.tbankBal, alfa: acc.alfaBal };
  const myBanks = PLAYER_BANKS.filter((b) => opened[b]);
  const bankOptions: ExtBankId[] = side === 'buy' ? ad.banks : PLAYER_BANKS.filter((b) => opened[b] && ad.banks.includes(b));

  const [mode, setMode] = useState<'rub' | 'usdt'>('rub');
  const [input, setInput] = useState('');
  const [picked, setBank] = useState<ExtBankId | null>(() =>
    side === 'sell' ? null : ad.banks.find((b) => (b === 'sber' || b === 'tbank' || b === 'alfa') && opened[b]) ?? null,
  );
  // Falls back to the first valid option (e.g. a card got opened while the panel is open).
  const bank = picked && bankOptions.includes(picked) ? picked : bankOptions[0] ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const price = ad.price;
  const v = parseNum(input);
  const rub = mode === 'rub' ? Math.round(v) : Math.round(v * price);
  // Mirrors engine/orders.takeAd math so the preview matches the order.
  const usdtOut = rub > 0 ? floor2(rub / price) : 0;
  const rubFinal = side === 'buy' ? rub : Math.round(usdtOut * price * 100) / 100;

  const amountError = useMemo(() => {
    if (rub <= 0) return null;
    if (rub < ad.minRub || rub > ad.maxRub) return `Лимит ордера: ${fmtNum(ad.minRub)} – ${fmtNum(ad.maxRub)} ₽`;
    if (usdtOut > ad.availableUsdt) return `У мерчанта доступно только ${fmtUsdt(ad.availableUsdt)}`;
    if (side === 'sell' && usdtOut > acc.usdt + 1e-9) return `Недостаточно USDT: на балансе Funding ${fmtUsdt(acc.usdt)}`;
    return null;
  }, [rub, usdtOut, ad.minRub, ad.maxRub, ad.availableUsdt, side, acc.usdt]);

  const setMax = () => {
    const capUsdt = side === 'sell' ? Math.min(acc.usdt, ad.availableUsdt) : ad.availableUsdt;
    const maxRub = Math.min(ad.maxRub, Math.floor(capUsdt * price));
    if (mode === 'rub') setInput(String(Math.max(0, maxRub)));
    else setInput(String(floor2(maxRub / price)));
  };

  const switchMode = () => {
    if (v > 0) setInput(mode === 'rub' ? String(usdtOut) : String(rub));
    setMode(mode === 'rub' ? 'usdt' : 'rub');
  };

  const m = ad.merchant;
  const risky = m.completion < 90 || m.orders < 30 || m.regDays < 30;
  const minutes = Math.round(ORDER_MINUTES * (acc.difficulty === 'story' ? 1.5 : 1));
  const canSubmit = !block && !amountError && rub > 0 && !!bank;
  const isBuy = side === 'buy';

  const submit = () => {
    if (!canSubmit || !bank) return;
    const r = takeAd({ adId: ad.id, rub, bank });
    if (r.ok && r.orderId) {
      focusOrder(r.orderId);
      setView('orders');
      return;
    }
    res.show(r);
  };

  const missingBanks = ad.banks.filter((b): b is BankId => (b === 'sber' || b === 'tbank' || b === 'alfa') && !opened[b]);

  return (
    <div className="border-t border-white/[0.06] bg-[#161b26] px-4 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-5">
        {/* left: amount & method */}
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-white/50">
              <span>{isBuy ? 'Я заплачу' : 'Я продам'}</span>
              {side === 'sell' && (
                <span>
                  Доступно: <span className="num text-white/80">{fmtUsdt(acc.usdt)}</span>
                </span>
              )}
            </div>
            <div className={cn('flex items-center rounded-lg border bg-bybit px-3 transition', amountError ? 'border-rose/60' : 'border-white/10 focus-within:border-amber/70')}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/[^\d.,\s]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                inputMode="decimal"
                placeholder={mode === 'rub' ? `${fmtNum(ad.minRub)} – ${fmtNum(ad.maxRub)}` : 'Количество USDT'}
                className="num h-10 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
              />
              <button type="button" onClick={setMax} className="px-2 text-xs font-semibold text-amber hover:text-amber/80">
                Макс
              </button>
              <span className="border-l border-white/10 pl-2.5 text-xs font-semibold text-white/70">{mode === 'rub' ? 'RUB' : 'USDT'}</span>
              <button type="button" title={mode === 'rub' ? 'Ввести в USDT' : 'Ввести в рублях'} onClick={switchMode} className="ml-2 rounded p-1 text-white/45 hover:bg-white/10 hover:text-white">
                <ArrowLeftRight size={14} />
              </button>
            </div>
            {amountError ? (
              <div className="mt-1 text-[11px] text-rose">{amountError}</div>
            ) : (
              <div className="mt-1 text-[11px] text-white/35">
                Лимиты: <span className="num">{fmtNum(ad.minRub)} – {fmtNum(ad.maxRub)} ₽</span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-bybit px-3 py-2.5 text-xs">
            <div className="flex justify-between text-white/50">
              <span>{isBuy ? 'Я получу' : 'Я получу на карту'}</span>
              <span className="num text-[15px] font-semibold text-white">{isBuy ? fmtUsdt(usdtOut) : fmtRub(rubFinal, 2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/40">
              <span>{isBuy ? 'К оплате' : 'Спишется с баланса'}</span>
              <span className="num">{isBuy ? fmtRub(rubFinal, 2) : fmtUsdt(usdtOut)}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/40">
              <span>Цена</span>
              <span className="num">{fmtPrice(price)} ₽ за 1 USDT</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs text-white/50">{isBuy ? 'Способ оплаты (банк продавца)' : 'Куда получить оплату (ваш банк)'}</div>
            {bankOptions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {bankOptions.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => setBank(b)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition',
                      bank === b ? 'border-amber/70 bg-amber/10 text-white' : 'border-white/10 text-white/70 hover:border-white/25',
                    )}
                  >
                    <BankChip bank={b} className="bg-transparent px-0" />
                    {side === 'sell' && (b === 'sber' || b === 'tbank' || b === 'alfa') && <span className="num text-white/40">{fmtRub(balance[b])}</span>}
                    <span className="text-[10px] text-white/35">СБП</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-rose/10 px-3 py-2 text-xs text-rose">
                {missingBanks.length
                  ? `Нет подходящего банка: откройте карту ${missingBanks.map((b) => BANK_NAMES[b]).join(' или ')} на телефоне.`
                  : `Нет подходящего банка: мерчант принимает только ${ad.banks.map((b) => BANK_NAMES[b]).join(', ')}.`}
              </div>
            )}
            {isBuy && bank && (
              <div className="mt-1.5 text-[11px] leading-snug text-white/40">
                Переведёте по СБП на {BANK_NAMES[bank]} продавца. Реквизиты появятся в ордере.
                {myBanks.length > 0 && (
                  <>
                    {' '}На ваших картах:{' '}
                    {myBanks.map((b, i) => (
                      <span key={b} className="num text-white/60">
                        {i ? ', ' : ''}
                        {BANK_NAMES[b]} {fmtRub(balance[b])}
                      </span>
                    ))}
                    .
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* right: merchant terms & confirm */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="rounded-lg border border-white/[0.06] bg-bybit px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              <Info size={12} /> Условия мерчанта
            </div>
            <p className="text-xs leading-relaxed text-white/80">{ad.terms}</p>
          </div>
          {risky && (
            <div className="flex gap-2 rounded-lg bg-amber/10 px-3 py-2 text-xs text-amber">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Осторожно: новый/ненадёжный аккаунт</div>
                <div className="mt-0.5 text-amber/80">
                  {m.orders} {plural(m.orders, 'сделка', 'сделки', 'сделок')} · выполнено {m.completion}% · на платформе {m.regDays} дн.
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Clock size={12} />
            {isBuy ? `Время на оплату: ${minutes} мин. USDT продавца будут заблокированы в эскроу.` : `Покупатель оплачивает в течение ${minutes} мин. Ваши USDT уйдут в эскроу.`}
          </div>
          {block && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-rose/10 px-3 py-2 text-xs text-rose">
              <span>{block}</span>
              {block.startsWith('Не больше') ? (
                <button type="button" onClick={() => setView('orders')} className="shrink-0 font-semibold underline-offset-2 hover:underline">
                  Мои ордера
                </button>
              ) : (
                <button type="button" onClick={() => setView('profile')} className="shrink-0 font-semibold underline-offset-2 hover:underline">
                  В профиль
                </button>
              )}
            </div>
          )}
          {res.node}
          <div className="mt-auto flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 hover:bg-white/10">
              Отмена
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40',
                isBuy ? 'bg-emerald hover:brightness-110' : 'bg-rose hover:brightness-110',
              )}
            >
              Открыть сделку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
