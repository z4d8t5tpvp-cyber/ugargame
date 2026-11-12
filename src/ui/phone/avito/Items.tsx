import { useState } from 'react';
import { CalendarClock, Eye, Info, TrendingUp } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { AvitoListing } from '../../../game/types';
import { AVITO_ITEMS } from '../../../game/data/static';
import { clockStr, fmtRub, plural } from '../../../game/util';
import { cn, parseNum } from '../../common/kit';
import { useLightResult } from './shared';

const TINTS = ['from-sky-100 to-indigo-100', 'from-amber-100 to-orange-100', 'from-emerald-100 to-teal-100', 'from-rose-100 to-pink-100'];

function StatusChip({ l }: { l?: AvitoListing }) {
  if (!l) return <span className="rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">Не выставлено</span>;
  if (l.status === 'active')
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#97CF26] px-2 py-0.5 text-[11px] font-semibold text-white">
        Активно · {l.views} {plural(l.views, 'просмотр', 'просмотра', 'просмотров')}
      </span>
    );
  if (l.status === 'reserved') return <span className="rounded-md bg-[#FFB021] px-2 py-0.5 text-[11px] font-semibold text-white">Забронировано</span>;
  return <span className="rounded-md bg-[#FF6163] px-2 py-0.5 text-[11px] font-semibold text-white">Продано</span>;
}

function ItemCard({ idx }: { idx: number }) {
  const item = AVITO_ITEMS[idx];
  const l = useGame((s) => s.avito.listings.find((x) => x.itemId === item.id));
  const meetAt = useGame((s) => s.avito.chats.find((c) => c.itemId === item.id && c.state === 'agreed')?.meetAt);
  const soldFor = useGame((s) => s.avito.chats.find((c) => c.itemId === item.id && c.state === 'done')?.offer);
  const listItem = useGame((s) => s.listItem);
  const unlistItem = useGame((s) => s.unlistItem);
  const [price, setPrice] = useState(() => (l ? String(l.price) : ''));
  const res = useLightResult();
  const editable = !l || l.status === 'active';

  const submit = () => {
    const p = Math.round(parseNum(price));
    res.show(listItem(item.id, p), l ? `Цена изменена: ${fmtRub(p)}` : 'Объявление опубликовано');
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.08)]">
      <div className={cn('relative flex h-[120px] items-center justify-center bg-gradient-to-br', TINTS[idx % TINTS.length])}>
        <span className={cn('text-[64px] drop-shadow-sm', l?.status === 'sold' && 'opacity-50 grayscale')}>{item.emoji}</span>
        <div className="absolute left-2.5 top-2.5">
          <StatusChip l={l} />
        </div>
        <div className="absolute bottom-2 right-2.5 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-white' : 'bg-white/50')} />
          ))}
        </div>
      </div>
      <div className="p-3">
        {l && <div className="text-[19px] font-bold text-[#1A1A1A]">{fmtRub(l.status === 'sold' && soldFor ? soldFor : l.price)}</div>}
        <div className="text-[14.5px] font-medium leading-snug text-[#1A1A1A]">{item.title}</div>
        <div className="mt-1 text-[12.5px] leading-snug text-[#8F8F8F]">{item.desc}</div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#F2F1F0] px-2 py-1 text-[12px] text-[#4D4D4D]">
          <TrendingUp size={13} className="text-[#00AAFF]" />
          Похожие продаются за ~{fmtRub(item.fair)}
        </div>
        {l?.status === 'active' && (
          <div className="mt-1.5 flex items-center gap-1 text-[12px] text-[#8F8F8F]">
            <Eye size={13} /> {l.views} {plural(l.views, 'просмотр', 'просмотра', 'просмотров')} с момента публикации
          </div>
        )}
        {l?.status === 'reserved' && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#FFF4DE] px-2.5 py-2 text-[12.5px] text-[#8A5A00]">
            <CalendarClock size={14} />
            {meetAt ? `Покупатель придёт в ${clockStr(meetAt)} к подъезду` : 'Покупатель скоро придёт'}
          </div>
        )}
        {l?.status === 'sold' && <div className="mt-2 rounded-lg bg-[#EAF6D8] px-2.5 py-2 text-[12.5px] text-[#4B7A00]">Продано ✅ Деньги пришли на Сбер по СБП.</div>}

        {editable && (
          <div className="mt-3 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d\s]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                inputMode="numeric"
                placeholder={String(item.fair)}
                className="num h-10 w-full rounded-xl border border-transparent bg-[#F2F1F0] pl-3 pr-7 text-[15px] font-medium text-[#1A1A1A] outline-none transition placeholder:text-[#B5B5B5] focus:border-[#00AAFF] focus:bg-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#8F8F8F]">₽</span>
            </div>
            <button type="button" onClick={submit} className="h-10 shrink-0 rounded-xl bg-[#00AAFF] px-3.5 text-[14px] font-semibold text-white transition hover:bg-[#0099E6] active:scale-[0.98]">
              {l ? 'Изменить цену' : 'Разместить'}
            </button>
          </div>
        )}
        {l?.status === 'active' && (
          <button type="button" onClick={() => unlistItem(item.id)} className="mt-2 text-[13px] font-medium text-[#FF6163] hover:underline">
            Снять с продажи
          </button>
        )}
        {res.node && <div className="mt-2">{res.node}</div>}
      </div>
    </div>
  );
}

export function Items() {
  return (
    <div className="space-y-3 p-3">
      <div className="flex gap-2.5 rounded-2xl bg-[#E5F6FF] p-3">
        <Info size={18} className="mt-0.5 shrink-0 text-[#00AAFF]" />
        <div className="text-[12.5px] leading-snug text-[#1A1A1A]">
          <div className="mb-0.5 font-semibold">Как назначить цену</div>
          Дорого — мало покупателей, объявление провисит неделями. Слишком дёшево — налетят мошенники со «своей доставкой».
        </div>
      </div>
      {AVITO_ITEMS.map((it, i) => (
        <ItemCard key={it.id} idx={i} />
      ))}
    </div>
  );
}
