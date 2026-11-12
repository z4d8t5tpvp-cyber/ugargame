import { useState } from 'react';
import { Check, ListOrdered, Pause, Pencil, Play, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { useGame } from '../../../game/store';
import { adFillRate, bestPrice, MAKER_FEE } from '../../../game/engine/market';
import type { MyAd } from '../../../game/types';
import { BANK_SHORT, fmtPrice, fmtRub, fmtUsdt, round2, shortDT } from '../../../game/util';
import { Bar, cn, parseNum, useResult } from '../../common/kit';
import { AdsCreateForm, priceBand, SpeedMeter } from './AdsCreateForm';
import { AccessGate, btnGhost, btnPrimary, Page } from './AssetsKit';

export default function MyAds() {
  const registered = useGame((s) => s.exchanges.bybit.registered);
  const kyc = useGame((s) => s.exchanges.bybit.kyc);
  const ads = useGame((s) => s.exchanges.bybit.ads);
  const [formOpen, setFormOpen] = useState(false);
  const res = useResult();

  if (!registered)
    return (
      <Page>
        <AccessGate title="Нужен аккаунт Bybit" text="Зарегистрируйтесь и пройдите верификацию личности, чтобы размещать свои объявления на P2P-рынке." />
      </Page>
    );
  if (kyc !== 'verified')
    return (
      <Page>
        <AccessGate
          title="Нужна верификация (KYC)"
          text={kyc === 'pending' ? 'Документы на проверке. Размещать объявления можно сразу после подтверждения личности.' : 'Размещать объявления можно только после верификации личности (уровень 1).'}
        />
      </Page>
    );

  const showForm = formOpen || ads.length === 0;
  const inAds = ads.filter((a) => a.side === 'sell').reduce((x, a) => x + a.remainingUsdt, 0);
  const active = ads.filter((a) => a.active).length;

  return (
    <Page>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Мои объявления</h2>
          <p className="text-xs text-white/45">Вы — мейкер: контрагенты сами открывают сделки по вашей цене. Комиссия мейкера 0,19%.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {ads.length > 0 && (
            <div className="flex gap-3 rounded-lg bg-bybit-2 px-3 py-1.5 text-xs text-white/50">
              <span>
                Активных: <b className="num text-white">{active}</b> из {ads.length}
              </span>
              {inAds > 0 && (
                <span>
                  В объявлениях: <b className="num text-white">{fmtUsdt(inAds)}</b>
                </span>
              )}
            </div>
          )}
          {!showForm && (
            <button type="button" className={btnPrimary} onClick={() => setFormOpen(true)}>
              <Plus size={15} /> Создать объявление
            </button>
          )}
        </div>
      </div>

      {res.node}

      {showForm && (
        <AdsCreateForm
          onCreated={(side) => {
            setFormOpen(false);
            res.show(
              { ok: true },
              side === 'sell'
                ? 'Объявление о продаже опубликовано. Когда покупатель откроет сделку, ордер появится в «Мои ордера».'
                : 'Объявление о покупке опубликовано. Когда продавец откроет сделку, ордер появится в «Мои ордера».',
            );
          }}
          onCancel={ads.length ? () => setFormOpen(false) : undefined}
        />
      )}

      {ads.length > 0 && (
        <div className="space-y-3">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
          <p className="px-1 text-[11px] text-white/35">Не больше 2 объявлений на каждую сторону. Нераспроданный остаток объявления на продажу заморожен и возвращается на баланс при удалении.</p>
        </div>
      )}
    </Page>
  );
}

function AdCard({ ad }: { ad: MyAd }) {
  const toggleAd = useGame((s) => s.toggleAd);
  const editAdPrice = useGame((s) => s.editAdPrice);
  const removeAd = useGame((s) => s.removeAd);
  const focusOrder = useGame((s) => s.focusOrder);
  const setView = useGame((s) => s.setBybitView);
  const base = useGame((s) => round2(s.market.base));
  const avg = useGame((s) => s.book.avg);
  const best = useGame((s) => bestPrice(s, 'bybit', ad.side, true));
  const rate = useGame((s) => Math.round(adFillRate(s, ad) * 1000) / 1000);
  // Rank among local competitors (Max excluded) plus Max's undercut slot.
  const rank = useGame((s) => {
    let n = 1;
    for (const a of s.market.ads) {
      if (a.exchange !== 'bybit' || a.side !== ad.side || a.tier !== 'local' || a.merchant.isMax) continue;
      if (ad.side === 'sell' ? a.price < ad.price - 1e-9 : a.price > ad.price + 1e-9) n++;
    }
    return n + (ad.undercutBy ? 1 : 0);
  });
  const openOrders = useGame((s) => s.orders.filter((o) => o.adId === ad.id && (o.status === 'pending_payment' || o.status === 'paid' || o.status === 'appeal')).length);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const res = useResult();

  const sell = ad.side === 'sell';
  const filled = ad.totalUsdt > 0 ? (ad.totalUsdt - ad.remainingUsdt) / ad.totalUsdt : 0;
  const capRub = Math.min(ad.maxRub, Math.floor((sell ? ad.remainingUsdt / (1 + MAKER_FEE) : ad.remainingUsdt) * ad.price));
  const exhausted = capRub < ad.minRub;
  const diff = sell ? ad.price - best : best - ad.price;
  const [lo, hi] = priceBand(base);

  const savePrice = () => {
    const v = round2(parseNum(draft));
    if (!(v > 0)) return res.show({ ok: false, error: 'Укажите цену' });
    if (v < lo || v > hi) return res.show({ ok: false, error: `Цена вне допустимого диапазона ${fmtPrice(lo)}–${fmtPrice(hi)} ₽` });
    editAdPrice(ad.id, v);
    setEditing(false);
    res.show({ ok: true }, `Цена обновлена: ${fmtPrice(v)} ₽`);
  };

  const counterPrice = ad.undercutBy ? round2(ad.undercutBy - 0.01) : 0;

  return (
    <div className={cn('rounded-xl border bg-bybit-2 transition', ad.active && !exhausted ? 'border-white/[0.07]' : 'border-white/[0.04] opacity-90')}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-4 py-2.5">
        <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', sell ? 'bg-rose/15 text-rose' : 'bg-emerald/15 text-emerald')}>{sell ? 'Продажа USDT' : 'Покупка USDT'}</span>
        <span className={cn('inline-flex items-center gap-1 text-xs', exhausted ? 'text-white/40' : ad.active ? 'text-emerald' : 'text-white/45')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', exhausted ? 'bg-white/30' : ad.active ? 'bg-emerald' : 'bg-white/30')} />
          {exhausted ? 'Исполнено' : ad.active ? 'Активно' : 'На паузе'}
        </span>
        <span className="num text-[11px] text-white/30">от {shortDT(ad.createdAt)}</span>
        {openOrders > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber hover:bg-amber/25"
            onClick={() => {
              const o = useGame.getState().orders.find((x) => x.adId === ad.id && (x.status === 'pending_payment' || x.status === 'paid' || x.status === 'appeal'));
              focusOrder(o?.id ?? null);
              setView('orders');
            }}
          >
            <ListOrdered size={12} /> Ордеров в работе: {openOrders}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!exhausted && (
            <button type="button" className={btnGhost} onClick={() => toggleAd(ad.id)} title={ad.active ? 'Снять с публикации' : 'Опубликовать снова'}>
              {ad.active ? <Pause size={13} /> : <Play size={13} />}
              {ad.active ? 'Пауза' : 'Включить'}
            </button>
          )}
          <button
            type="button"
            className={cn(btnGhost, 'hover:border-rose/40 hover:text-rose')}
            onClick={() => {
              setConfirmDel((v) => !v);
              setEditing(false);
            }}
            title="Удалить объявление"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 @3xl:grid-cols-[1.1fr_1.3fr_1fr_1fr]">
        <div>
          <div className="text-[11px] text-white/40">Цена</div>
          {editing ? (
            <div className="mt-0.5 flex items-center gap-1">
              <input
                autoFocus
                className="num w-24 rounded-md border border-amber/50 bg-bybit-3 px-2 py-1 text-sm font-semibold text-white outline-none"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePrice();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <button type="button" className="rounded p-1 text-emerald hover:bg-white/10" onClick={savePrice} title="Сохранить">
                <Check size={15} />
              </button>
              <button type="button" className="rounded p-1 text-white/50 hover:bg-white/10" onClick={() => setEditing(false)} title="Отмена">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="group mt-0.5 inline-flex items-center gap-1.5"
              onClick={() => {
                setDraft(fmtPrice(ad.price));
                setEditing(true);
                setConfirmDel(false);
              }}
              title="Изменить цену"
            >
              <span className={cn('num text-lg font-semibold', sell ? 'text-rose' : 'text-emerald')}>{fmtPrice(ad.price)}</span>
              <span className="text-xs text-white/40">₽</span>
              <Pencil size={12} className="text-white/30 group-hover:text-amber" />
            </button>
          )}
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-white/40">
            <span>Остаток / объём</span>
            <span className="num">{Math.round(filled * 100)}% исполнено</span>
          </div>
          <div className="num mt-0.5 text-sm text-white">
            {fmtUsdt(ad.remainingUsdt, false)} <span className="text-white/40">/ {fmtUsdt(ad.totalUsdt)}</span>
          </div>
          <Bar value={filled} color={sell ? '#F6465D' : '#0ECB81'} className="mt-1.5" />
        </div>

        <div>
          <div className="text-[11px] text-white/40">Лимиты</div>
          <div className="num mt-0.5 text-sm text-white">
            {fmtRub(ad.minRub)} – {fmtRub(ad.maxRub)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-white/40">Способы оплаты</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {ad.banks.map((b) => (
              <span key={b} className="rounded border border-amber/30 bg-amber/[0.06] px-1.5 py-0.5 text-[11px] text-amber">
                {BANK_SHORT[b]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* market position */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.05] px-4 py-2 text-xs">
        {exhausted ? (
          <span className="text-white/45">Остаток меньше минимального лимита сделки — объявление больше не исполняется. Удалите его, чтобы вернуть остаток на баланс.</span>
        ) : !ad.active ? (
          <span className="text-white/45">Скрыто из стакана — покупатели и продавцы его не видят.</span>
        ) : (
          <>
            <span className="text-white/45">
              Позиция в стакане:{' '}
              <b className={cn('num', rank === 1 ? 'text-emerald' : rank <= 3 ? 'text-amber' : 'text-rose')}>
                {rank === 1 ? 'первое место' : `№${rank}`}
              </b>
            </span>
            <span className="num text-white/45">
              Лучшая цена: <span className="text-white/80">{fmtPrice(best)} ₽</span>
              {Math.abs(diff) >= 0.005 && (
                <span className={cn('ml-1', diff > 0 ? 'text-rose/80' : 'text-emerald/80')}>
                  ({diff > 0 ? 'хуже на' : 'лучше на'} {Math.abs(diff).toFixed(2)} ₽)
                </span>
              )}
            </span>
            <span className="ml-auto">
              <SpeedMeter rate={rate} />
            </span>
          </>
        )}
      </div>

      {ad.undercutBy !== undefined && ad.active && !exhausted && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber/25 bg-amber/[0.07] px-3 py-2 text-xs text-amber">
          <TriangleAlert size={14} className="shrink-0" />
          <span className="min-w-0 flex-1">
            max_zero_arb перебил вашу цену: <b className="num">{fmtPrice(ad.undercutBy)} ₽</b> — ваше объявление ниже в стакане
            {sell && avg > 0 && counterPrice * (1 - MAKER_FEE) < avg && <span className="block text-rose">Ответная цена ниже вашей себестоимости ({fmtPrice(avg)} ₽) — сделки уйдут в минус.</span>}
          </span>
          <button type="button" className="rounded-md bg-amber px-2.5 py-1 font-semibold text-black hover:brightness-110" onClick={() => {
            editAdPrice(ad.id, counterPrice);
            res.show({ ok: true }, `Цена обновлена: ${fmtPrice(counterPrice)} ₽`);
          }}>
            Поставить {fmtPrice(counterPrice)}
          </button>
        </div>
      )}

      {confirmDel && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-rose/30 bg-rose/[0.07] px-3 py-2 text-xs text-white/80">
          <span className="min-w-0 flex-1">
            Удалить объявление?{' '}
            {sell && ad.remainingUsdt > 0 ? (
              <>
                Остаток <b className="num">{fmtUsdt(ad.remainingUsdt)}</b> вернётся на доступный баланс.
              </>
            ) : (
              'Новые сделки по нему открываться не будут.'
            )}
            {openOrders > 0 && <span className="block text-amber">Открытые ордера по объявлению не отменятся — их нужно завершить.</span>}
          </span>
          <button type="button" className="rounded-md bg-rose px-2.5 py-1 font-semibold text-white hover:brightness-110" onClick={() => removeAd(ad.id)}>
            Удалить
          </button>
          <button type="button" className={btnGhost} onClick={() => setConfirmDel(false)}>
            Отмена
          </button>
        </div>
      )}

      {res.node && <div className="mx-4 mb-3">{res.node}</div>}
    </div>
  );
}
